<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttendanceScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                     => ['required', 'string', 'max:255', 'unique:attendance_schedules,name'],
            'days'                     => ['required', 'array'],
            'days.*.day_of_week'       => ['required', 'integer', 'between:0,6'],
            'days.*.is_rest_day'       => ['sometimes', 'boolean'],
            'days.*.times'             => ['sometimes', 'array'],
            'days.*.times.*.scheduled_time' => ['required', 'date_format:H:i'],
            'days.*.times.*.sequence'  => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $days = $this->input('days', []);

            $dayOfWeeks = collect($days)->pluck('day_of_week')->filter(fn ($v) => $v !== null)->all();

            if (count($dayOfWeeks) !== count(array_unique($dayOfWeeks))) {
                $validator->errors()->add('days', 'Each day of the week may only be configured once per schedule.');
            }

            foreach ($days as $index => $day) {
                $times = $day['times'] ?? [];
                $values = collect($times)->pluck('scheduled_time')->filter()->values()->all();

                if (count($values) !== count(array_unique($values))) {
                    $validator->errors()->add("days.$index.times", 'A day cannot have duplicate time slots.');
                }
            }
        });
    }
}
