<?php

namespace App\Console\Commands;

use App\Jobs\SendStudentEmailJob;
use App\Models\EmailLog;
use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Bus;

class ProcessPendingEmails extends Command
{
    protected $signature = 'emails:process
                            {--chunk=50 : Number of emails to process per chunk}
                            {--timeout=300 : Max execution time in seconds}';

    protected $description = 'Process pending email logs directly without a queue worker';

    public function handle(): int
    {
        $maxChunk = (int) $this->option('chunk');
        $timeout = (int) $this->option('timeout');
        set_time_limit($timeout);

        $pendingLogs = EmailLog::where('status', 'pending')
            ->whereHas('student')
            ->limit($maxChunk)
            ->get();

        if ($pendingLogs->isEmpty()) {
            $this->info('No pending emails found.');
            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($pendingLogs->count());
        $bar->start();

        $processed = 0;
        $failed = 0;

        foreach ($pendingLogs as $log) {
            $student = $log->student;
            if (!$student) {
                $log->update(['status' => 'failed', 'error_message' => 'Student record not found']);
                $failed++;
                $bar->advance();
                continue;
            }

            try {
                (new SendStudentEmailJob($student, $log))->handle();
                $processed++;
            } catch (\Exception $e) {
                $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
                $failed++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Done. {$processed} sent, {$failed} failed.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
