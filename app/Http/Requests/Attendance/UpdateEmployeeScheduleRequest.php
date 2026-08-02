<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeScheduleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'employee_id'            => ['required', 'exists:employees,id'],
            'attendance_schedule_id' => ['required', 'exists:attendance_schedules,id'],
            'effective_from'         => ['required', 'date'],
            'effective_to'           => ['nullable', 'date', 'after_or_equal:effective_from'],
        ];
    }
}
