<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class PublicLookupRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'keyword' => ['required', 'string', 'max:255'],
            'attendance_date' => ['nullable', 'date'],
            'time_in' => ['nullable', 'date_format:H:i'],
        ];
    }
}
