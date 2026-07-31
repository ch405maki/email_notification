<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class EmployeeService
{
    public function createEmployee(array $data): Employee
    {
        return Employee::create($data);
    }

    public function updateEmployee(Employee $employee, array $data): Employee
    {
        $employee->update($data);
        return $employee->fresh();
    }

    public function activateEmployee(Employee $employee): Employee
    {
        $employee->update(['status' => 'ACTIVE']);
        return $employee->fresh();
    }

    public function deactivateEmployee(Employee $employee): Employee
    {
        $employee->update(['status' => 'INACTIVE']);
        return $employee->fresh();
    }

    public function searchEmployees(array $filters): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = Employee::query();

        if ($search = $filters['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->where('employee_number', 'like', "%{$search}%")
                  ->orWhere('id_number', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('middle_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere(DB::raw("CONCAT(last_name, ', ', first_name, ' ', COALESCE(middle_name, ''))"), 'like', "%{$search}%");
            });
        }

        return $query->latest()->paginate(10);
    }
}
