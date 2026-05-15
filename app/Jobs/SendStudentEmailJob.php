<?php

namespace App\Jobs;

use App\Mail\DynamicMail;
use App\Mail\StudentOnboardingMail;
use App\Models\EmailLog;
use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendStudentEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public function __construct(
        public Student $student,
        public EmailLog $emailLog,
        public ?string $subjectTemplate = null,
        public ?string $bodyTemplate = null
    ) {}

    public function backoff(): array
    {
        return [5, 15, 60];
    }

    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(15);
    }

    public function middleware(): array
    {
        return [new RateLimited('emails')];
    }

    public function handle(): void
    {
        $studentNumber = $this->student->student_number;

        try {
            if ($this->bodyTemplate) {
                $subject = $this->subjectTemplate
                    ? str_replace('{student_number}', $studentNumber, $this->subjectTemplate)
                    : "Student Number: {$studentNumber}";
                $body = str_replace('{student_number}', $studentNumber, $this->bodyTemplate);
                Mail::to($this->student->email)->send(new DynamicMail($subject, $body));
            } else {
                Mail::to($this->student->email)
                    ->send(new StudentOnboardingMail($studentNumber));
            }

            $this->emailLog->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error("Email send failed for {$studentNumber}: {$e->getMessage()}");
            $this->emailLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }
    }
}
