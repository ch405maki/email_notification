<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeScheduleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'employee_id'    => ['required', 'exists:employees,id'],
            'schedule_id'    => ['required', 'exists:schedules,id'],
            'effective_date' => ['required', 'date'],
        ];
    }
}
