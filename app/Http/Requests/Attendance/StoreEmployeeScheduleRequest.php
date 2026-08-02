<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeScheduleRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->route('employee')) {
            $this->merge(['employee_id' => $this->route('employee')->getKey()]);
        }
    }

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
