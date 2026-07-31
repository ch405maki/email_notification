<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeScheduleAssignment;
use App\Models\Schedule;
use Illuminate\Support\Collection;

class ScheduleAssignmentService
{
    public function assignSchedule(array $data): EmployeeScheduleAssignment
    {
        return EmployeeScheduleAssignment::create($data);
    }

    public function getActiveSchedule(Employee $employee): ?Schedule
    {
        $assignment = $employee->scheduleAssignments()
            ->orderByDesc('effective_date')
            ->first();

        return $assignment?->schedule;
    }

    public function getActiveScheduleTimes(Employee $employee, string $date): Collection
    {
        $assignments = $employee->scheduleAssignments()
            ->where('effective_date', '<=', $date)
            ->get();

        if ($assignments->isEmpty()) {
            return collect();
        }

        $latestDate = $assignments->max('effective_date')->toDateString();

        $activeAssignments = $assignments->filter(
            fn (EmployeeScheduleAssignment $assignment) => $assignment->effective_date->toDateString() === $latestDate
        );

        return $activeAssignments
            ->load('schedule.scheduleTimes')
            ->pluck('schedule.scheduleTimes')
            ->filter()
            ->flatten()
            ->unique('id')
            ->sortBy('scheduled_time')
            ->values();
    }
}
