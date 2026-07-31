<?php

namespace App\Console\Commands;

use App\Services\AttendanceComplianceService;
use Illuminate\Console\Command;

class GenerateMissedAttendance extends Command
{
    protected $signature = 'attendance:generate-missed
                            {--date= : The attendance date to process (Y-m-d). Defaults to yesterday.}';

    protected $description = 'Generate MISSED attendance schedule statuses for the selected date';

    public function handle(AttendanceComplianceService $service): int
    {
        $date = $this->option('date') ?? now()->subDay()->toDateString();

        $created = $service->generateMissedAttendance($date);

        $this->info("Generated {$created} missed attendance record(s) for {$date}.");

        return self::SUCCESS;
    }
}
