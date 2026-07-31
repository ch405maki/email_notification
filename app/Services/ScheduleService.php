<?php

namespace App\Services;

use App\Models\Schedule;

class ScheduleService
{
    public function createSchedule(array $data): Schedule
    {
        $schedule = Schedule::create(['name' => $data['name']]);

        foreach (array_values($data['schedule_times']) as $index => $time) {
            $schedule->scheduleTimes()->create([
                'scheduled_time' => $time,
                'sequence'       => $index + 1,
            ]);
        }

        return $schedule->load('scheduleTimes');
    }

    public function updateSchedule(Schedule $schedule, array $data): Schedule
    {
        $schedule->update(['name' => $data['name']]);

        $times = array_values($data['schedule_times']);
        $existing = $schedule->scheduleTimes()->orderBy('sequence')->get();

        foreach ($times as $index => $time) {
            $attributes = [
                'scheduled_time' => $time,
                'sequence'       => $index + 1,
            ];

            if (isset($existing[$index])) {
                $existing[$index]->update($attributes);
            } else {
                $schedule->scheduleTimes()->create($attributes);
            }
        }

        for ($i = count($times); $i < $existing->count(); $i++) {
            $existing[$i]->delete();
        }

        return $schedule->load('scheduleTimes');
    }
}
