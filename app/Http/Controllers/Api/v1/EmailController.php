<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Jobs\SendStudentEmailJob;
use App\Models\EmailLog;
use App\Models\Student;
use Illuminate\Database\QueryException;
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
                'body' => $body,
            ],
        ]);
    }

    public function preview(Request $request)
    {
        $validated = $request->validate([
            'student_number' => 'required|string',
            'email' => 'required|email',
        ]);

        $studentNumber = $validated['student_number'];
        $subject = "Student Number: {$studentNumber}";
        $body = view('emails.student-onboarding', ['studentNumber' => $studentNumber])->render();

        return response()->json([
            'data' => [
                'subject' => $subject,
                'body' => $body,
            ],
        ]);
    }

    public function sendSingle(Request $request)
    {
        $validated = $request->validate([
            'student_number' => 'required|string',
            'email' => 'required|email',
        ]);

        $studentNumber = $validated['student_number'];
        $email = $validated['email'];
        $sync = $request->boolean('sync');

        try {
            $existingEmail = Student::where('email', $email)
                ->where('student_number', '!=', $studentNumber)
                ->exists();

            if ($existingEmail) {
                return response()->json([
                    'message' => "Email {$email} is already used by another student.",
                ], 422);
            }

            $student = Student::updateOrCreate(
                ['student_number' => $studentNumber],
                ['email' => $email, 'student_number' => $studentNumber]
            );

            $log = EmailLog::create([
                'student_id' => $student->id,
                'student_number' => $studentNumber,
                'email' => $email,
                'subject' => "Student Number: {$studentNumber}",
                'status' => 'pending',
            ]);

            if ($sync) {
                (new SendStudentEmailJob($student, $log))->handle();
            } else {
                SendStudentEmailJob::dispatch($student, $log);
            }

            $status = $log->fresh()->status;
            if ($status === 'sent') {
                return response()->json(['message' => "Email sent to {$studentNumber}"]);
            }

            return response()->json([
                'message' => $sync ? 'Email sending failed' : "Email queued for {$studentNumber}",
            ], $sync ? 500 : 200);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'A database error occurred. The student number or email may already exist.',
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An unexpected error occurred. Please try again.',
            ], 500);
        }
    }
}
