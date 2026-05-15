<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Jobs\SendStudentEmailJob;
use App\Models\EmailLog;
use App\Models\Student;
use Illuminate\Http\Request;

class EmailController extends Controller
{
    public function template()
    {
        $subject = 'Student Number: {student_number}';
        $body = view('emails.student-onboarding', ['studentNumber' => '{student_number}'])->render();

        return response()->json([
            'data' => [
                'subject' => $subject,
                'body'    => $body,
            ],
        ]);
    }

    public function preview(Request $request)
    {
        $validated = $request->validate([
            'student_number' => 'required|string',
            'email'          => 'required|email',
        ]);

        $studentNumber = $validated['student_number'];
        $subject = "Student Number: {$studentNumber}";
        $body = view('emails.student-onboarding', ['studentNumber' => $studentNumber])->render();

        return response()->json([
            'data' => [
                'subject' => $subject,
                'body'    => $body,
            ],
        ]);
    }

    public function sendSingle(Request $request)
    {
        $validated = $request->validate([
            'student_number' => 'required|string',
            'email'          => 'required|email',
        ]);

        $studentNumber = $validated['student_number'];
        $email = $validated['email'];

        $student = Student::updateOrCreate(
            ['student_number' => $studentNumber],
            ['email' => $email, 'student_number' => $studentNumber]
        );

        $log = EmailLog::create([
            'student_id'     => $student->id,
            'student_number' => $studentNumber,
            'email'          => $email,
            'subject'        => "Student Number: {$studentNumber}",
            'status'         => 'pending',
        ]);

        SendStudentEmailJob::dispatch($student, $log);

        return response()->json([
            'message' => "Email queued for {$studentNumber}",
        ]);
    }
}
