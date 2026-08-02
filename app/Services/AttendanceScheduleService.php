<?php

namespace App\Services;

use App\Models\AttendanceSchedule;
use Illuminate\Support\Facades\DB;

class AttendanceScheduleService
{
    public function createSchedule(array $data): AttendanceSchedule
    {
        return DB::transaction(function () use ($data) {
            $schedule = AttendanceSchedule::create(['name' => $data['name']]);

            foreach (array_values($data['days']) as $day) {
                $this->createDay($schedule, $day);
            }

            return $schedule->load('days.times');
        });
    }

    public function updateSchedule(AttendanceSchedule $schedule, array $data): AttendanceSchedule
    {
        return DB::transaction(function () use ($schedule, $data) {
            $schedule->update(['name' => $data['name']]);

            $schedule->days()->delete();

            foreach (array_values($data['days']) as $day) {
                $this->createDay($schedule, $day);
            }

            return $schedule->load('days.times');
        });
    }

    protected function createDay(AttendanceSchedule $schedule, array $day): void
    {
        $scheduleDay = $schedule->days()->create([
            'day_of_week' => $day['day_of_week'],
            'is_rest_day' => $day['is_rest_day'] ?? false,
        ]);

        if (($day['is_rest_day'] ?? false)) {
            return;
        }

        foreach (array_values($day['times'] ?? []) as $index => $time) {
            $scheduleDay->times()->create([
                'scheduled_time' => $time['scheduled_time'],
                'sequence'       => $time['sequence'] ?? $index + 1,
            ]);
        }
    }
}
