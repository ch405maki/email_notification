<?php

namespace App\Services;

use App\Models\AttendanceLog;
use App\Models\AttendanceScheduleStatus;
use App\Models\Employee;
use Illuminate\Support\Collection;

class AttendanceComplianceService
{
    public const COMPLETED = 'COMPLETED';

    public const MISSED = 'MISSED';

    public function __construct(
        protected ScheduleAssignmentService $scheduleAssignmentService
    ) {}

    public function markCompleted(AttendanceLog $attendance): AttendanceScheduleStatus
    {
        $date = $attendance->attendance_date->toDateString();

        $query = AttendanceScheduleStatus::where('employee_id', $attendance->employee_id)
            ->whereDate('attendance_date', $date);

        if ($attendance->schedule_time_id) {
            $query->where('schedule_time_id', $attendance->schedule_time_id);
        } else {
            $query->whereNull('schedule_time_id')->where('scheduled_time', $attendance->scheduled_time);
        }

        $status = $query->first() ?? new AttendanceScheduleStatus;

        $status->fill([
            'employee_id' => $attendance->employee_id,
            'attendance_date' => $date,
            'schedule_time_id' => $attendance->schedule_time_id,
            'scheduled_time' => $attendance->scheduled_time,
            'status' => self::COMPLETED,
            'attendance_log_id' => $attendance->id,
        ])->save();

        return $status;
    }

    public function reconcileCompleted(AttendanceLog $attendance): AttendanceScheduleStatus
    {
        AttendanceScheduleStatus::where('attendance_log_id', $attendance->id)->delete();

        return $this->markCompleted($attendance);
    }

    public function generateMissedAttendance(?string $date = null): int
    {
        $date = $date ?? now()->toDateString();
        $created = 0;

        $employees = Employee::where('status', 'ACTIVE')
            ->with('scheduleAssignments')
            ->get();

        foreach ($employees as $employee) {
            $scheduleTimes = $this->scheduleAssignmentService->getActiveScheduleTimes($employee, $date);

            if ($scheduleTimes->isEmpty()) {
                continue;
            }

            $logs = AttendanceLog::where('employee_id', $employee->id)
                ->whereDate('attendance_date', $date)
                ->get();

            $existingKeys = AttendanceScheduleStatus::where('employee_id', $employee->id)
                ->whereDate('attendance_date', $date)
                ->get()
                ->pluck('schedule_time_id')
                ->filter()
                ->flip();

            foreach ($scheduleTimes as $scheduleTime) {
                $log = $logs->first(
                    fn (AttendanceLog $log) => ($log->schedule_time_id && $log->schedule_time_id === $scheduleTime->id)
                        || (! $log->schedule_time_id && substr($log->scheduled_time, 0, 5) === substr($scheduleTime->scheduled_time, 0, 5))
                );

                if ($log) {
                    $this->markCompleted($log);

                    continue;
                }

                if ($existingKeys->has((string) $scheduleTime->id)) {
                    continue;
                }

                if (! $this->dayHasPassed($date)) {
                    continue;
                }

                AttendanceScheduleStatus::create([
                    'employee_id' => $employee->id,
                    'attendance_date' => $date,
                    'schedule_time_id' => $scheduleTime->id,
                    'scheduled_time' => $scheduleTime->scheduled_time,
                    'status' => self::MISSED,
                    'attendance_log_id' => null,
                ]);

                $created++;
            }
        }

        return $created;
    }

    protected function dayHasPassed(string $date): bool
    {
        return $date < now()->toDateString();
    }

    public function getMissedStats(string $dateFrom, string $dateTo): Collection
    {
        return AttendanceScheduleStatus::whereDate('attendance_date', '>=', $dateFrom)
            ->whereDate('attendance_date', '<=', $dateTo)
            ->where('status', self::MISSED)
            ->groupBy('employee_id')
            ->selectRaw('employee_id, COUNT(*) as missed_count')
            ->get()
            ->keyBy('employee_id');
    }

    public function countMissed(string $dateFrom, string $dateTo, ?int $employeeId = null): int
    {
        return AttendanceScheduleStatus::whereDate('attendance_date', '>=', $dateFrom)
            ->whereDate('attendance_date', '<=', $dateTo)
            ->when($employeeId, fn ($query) => $query->where('employee_id', $employeeId))
            ->where('status', self::MISSED)
            ->count();
    }
}
