<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StudentOnboardingMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $studentNumber;

    public function __construct(string $studentNumber)
    {
        $this->studentNumber = $studentNumber;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Student Number: {$this->studentNumber}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.student-onboarding',
            with: ['studentNumber' => $this->studentNumber],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
