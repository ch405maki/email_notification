<?php

namespace App\Services;

use App\Models\AttendanceScheduleDay;
use App\Models\Employee;
use App\Models\EmployeeScheduleAssignment;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ScheduleAssignmentService
{
    public function assignSchedule(array $data): EmployeeScheduleAssignment
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($data) {
            $effectiveFrom = Carbon::parse($data['effective_from'])->toDateString();

            EmployeeScheduleAssignment::where('employee_id', $data['employee_id'])
                ->where(function ($query) use ($effectiveFrom) {
                    $query->whereNull('effective_to')
                        ->orWhere('effective_to', '>=', $effectiveFrom);
                })
                ->update([
                    'effective_to' => Carbon::parse($effectiveFrom)->subDay()->toDateString(),
                ]);

            return EmployeeScheduleAssignment::create([
                'employee_id'            => $data['employee_id'],
                'attendance_schedule_id' => $data['attendance_schedule_id'],
                'effective_from'         => $effectiveFrom,
                'effective_to'           => null,
            ]);
        });
    }

    public function getActiveAssignment(Employee $employee, string $date): ?EmployeeScheduleAssignment
    {
        return $employee->scheduleAssignments()
            ->where('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            })
            ->latest('effective_from')
            ->first();
    }

    public function getActiveSchedule(Employee $employee, string $date): ?\App\Models\AttendanceSchedule
    {
        return $this->getActiveAssignment($employee, $date)?->attendanceSchedule;
    }

    public function getActiveScheduleTimes(Employee $employee, string $date): Collection
    {
        $assignment = $this->getActiveAssignment($employee, $date);

        if (! $assignment) {
            return collect();
        }

        $day = $this->getScheduleDay($assignment->attendance_schedule_id, $date);

        if (! $day || $day->is_rest_day) {
            return collect();
        }

        return $day->times;
    }

    public function getScheduleDay(int $attendanceScheduleId, string $date): ?AttendanceScheduleDay
    {
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;

        return AttendanceScheduleDay::where('attendance_schedule_id', $attendanceScheduleId)
            ->where('day_of_week', $dayOfWeek)
            ->with('times')
            ->first();
    }
}
