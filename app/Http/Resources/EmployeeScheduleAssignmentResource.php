<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeScheduleAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'employee_id'            => $this->employee_id,
            'attendance_schedule_id' => $this->attendance_schedule_id,
            'effective_from'         => $this->effective_from,
            'effective_to'           => $this->effective_to,
            'employee'               => new EmployeeOptionResource($this->whenLoaded('employee')),
            'attendance_schedule'    => new AttendanceScheduleResource($this->whenLoaded('attendanceSchedule')),
            'created_at'             => $this->created_at,
            'updated_at'             => $this->updated_at,
        ];
    }
}
