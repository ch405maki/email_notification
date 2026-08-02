<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceScheduleDayResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'attendance_schedule_id' => $this->attendance_schedule_id,
            'day_of_week'           => $this->day_of_week,
            'is_rest_day'           => $this->is_rest_day,
            'times'                 => AttendanceScheduleDayTimeResource::collection($this->whenLoaded('times')),
        ];
    }
}
