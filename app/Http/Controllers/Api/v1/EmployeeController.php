<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\StoreEmployeeRequest;
use App\Http\Requests\Attendance\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeOptionResource;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Services\EmployeeService;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(
        protected EmployeeService $employeeService
    ) {}

    public function index(Request $request)
    {
        $employees = $this->employeeService->searchEmployees($request->only(['search']));
        return response()->json([
            'data' => EmployeeResource::collection($employees),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page'    => $employees->lastPage(),
                'total'        => $employees->total(),
            ],
        ]);
    }

    public function store(StoreEmployeeRequest $request)
    {
        $employee = $this->employeeService->createEmployee($request->validated());
        return response()->json([
            'message' => 'Employee created successfully',
            'data'    => new EmployeeResource($employee),
        ], 201);
    }

    public function show(Employee $employee)
    {
        return response()->json([
            'data' => new EmployeeResource($employee),
        ]);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $employee = $this->employeeService->updateEmployee($employee, $request->validated());
        return response()->json([
            'message' => 'Employee updated successfully',
            'data'    => new EmployeeResource($employee),
        ]);
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json([
            'message' => 'Employee deleted successfully',
        ]);
    }

    public function options(Request $request)
    {
        $query = Employee::query();

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('employee_number', 'like', "%{$search}%")
                  ->orWhere('id_number', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'data' => EmployeeOptionResource::collection($query->get()),
        ]);
    }
}
