<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeScheduleAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'employee_id'    => $this->employee_id,
            'schedule_id'    => $this->schedule_id,
            'effective_date' => $this->effective_date,
            'employee'       => new EmployeeOptionResource($this->whenLoaded('employee')),
            'schedule'       => new ScheduleResource($this->whenLoaded('schedule')),
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
        ];
    }
}
