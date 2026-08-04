<?php

namespace App\Http\Requests\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'employee_number' => ['required', 'string', 'max:255', 'unique:employees,employee_number'],
            'id_number' => ['nullable', 'string', 'max:255', 'unique:employees,id_number'],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'section' => ['nullable', 'string', 'in:Systems,Technical'],
            'status' => ['sometimes', 'string', 'in:ACTIVE,INACTIVE'],
        ];
    }
}
