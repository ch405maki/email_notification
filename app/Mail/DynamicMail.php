<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DynamicMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subject,
        public string $body
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subject);
    }

    public function content(): Content
    {
        $body = str_replace(['<br>', '<br/>', '<br />'], "\r\n", $this->body);
        $body = preg_replace("/\r\n|\r|\n/", "\r\n", $body);

        return new Content(
            text: 'emails.dynamic',
            with: ['body' => $body],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
