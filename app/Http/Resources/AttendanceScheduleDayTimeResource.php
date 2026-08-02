<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceScheduleDayTimeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'attendance_schedule_day_id' => $this->attendance_schedule_day_id,
            'scheduled_time'          => substr($this->scheduled_time, 0, 5),
            'sequence'                => $this->sequence,
            'schedule_name'           => $this->whenLoaded('day', fn () => $this->day?->schedule?->name),
        ];
    }
}
