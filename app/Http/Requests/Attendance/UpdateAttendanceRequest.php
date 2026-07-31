<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAttendanceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'attendance_date' => ['sometimes', 'date'],
            'time_in'         => ['required', 'date_format:H:i'],
            'remarks'         => ['nullable', 'string', 'max:1000'],
        ];
    }
}
