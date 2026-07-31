<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScheduleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'           => ['required', 'string', 'max:255'],
            'schedule_times' => ['required', 'array', 'min:1'],
            'schedule_times.*' => ['required', 'date_format:H:i'],
        ];
    }
}
