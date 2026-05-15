<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Jobs\SendStudentEmailJob;
use App\Models\EmailLog;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="student_import_template.csv"',
        ];

        $columns = ['student_number', 'email'];
        $rows = [
            ['2026-0026', 'test@email.com'],
            ['2026-0027', 'test2@email.com'],
        ];

        $callback = function () use ($columns, $rows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $rows = array_map('str_getcsv', file($request->file('file')->getRealPath()));
        $header = array_shift($rows);

        $imported = 0;
        foreach ($rows as $row) {
            if (count($row) < 2) continue;

            $studentNumber = trim($row[0]);
            $email = trim($row[1]);

            if (empty($studentNumber) || empty($email)) continue;

            Student::updateOrCreate(
                ['student_number' => $studentNumber],
                ['email' => $email, 'student_number' => $studentNumber]
            );
            $imported++;
        }

        return response()->json([
            'message' => "{$imported} students imported successfully",
            'count' => $imported,
        ]);
    }

    public function sendBulk()
    {
        $students = Student::all();

        if ($students->isEmpty()) {
            return response()->json(['message' => 'No students found'], 400);
        }

        $dispatched = 0;
        foreach ($students as $student) {
            $log = EmailLog::create([
                'student_id'     => $student->id,
                'student_number' => $student->student_number,
                'email'          => $student->email,
                'subject'        => "Student Number: {$student->student_number}",
                'status'         => 'pending',
            ]);

            SendStudentEmailJob::dispatch($student, $log);
            $dispatched++;
        }

        return response()->json([
            'message' => "{$dispatched} emails queued for sending",
            'count'   => $dispatched,
        ]);
    }

    public function stats()
    {
        $total = Student::count();
        $sent = EmailLog::where('status', 'sent')->count();
        $failed = EmailLog::where('status', 'failed')->count();
        $pending = EmailLog::where('status', 'pending')->count();

        return response()->json([
            'data' => [
                'total_students' => $total,
                'sent'           => $sent,
                'failed'         => $failed,
                'pending'        => $pending,
            ],
        ]);
    }
}
