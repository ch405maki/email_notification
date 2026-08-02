<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'employee_id'      => $this->employee_id,
            'attendance_date'  => $this->attendance_date,
            'schedule_time_id' => $this->schedule_time_id,
            'scheduled_time'   => $this->scheduled_time,
            'time_in'          => $this->time_in,
            'status'           => $this->status,
            'late_minutes'     => $this->late_minutes,
            'remarks'          => $this->remarks,
            'schedule_name'    => $this->schedule_name ?? ($this->whenLoaded('scheduleTime') ? $this->scheduleTime?->day?->schedule?->name : null),
            'employee'         => new EmployeeOptionResource($this->whenLoaded('employee')),
            'schedule_time'    => new AttendanceScheduleDayTimeResource($this->whenLoaded('scheduleTime')),
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
