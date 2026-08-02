<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\StoreEmployeeScheduleRequest;
use App\Http\Requests\Attendance\StoreEmployeeRequest;
use App\Http\Requests\Attendance\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeOptionResource;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Services\EmployeeService;
use App\Services\ScheduleAssignmentService;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\AttendanceLog;

class EmployeeController extends Controller
{
    public function __construct(
        protected EmployeeService $employeeService,
        protected ScheduleAssignmentService $scheduleAssignmentService
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

        $employees = $query->get()->map(function ($employee) {
            $today = Carbon::today()->toDateString();

            $scheduleTimes = $this->scheduleAssignmentService->getActiveScheduleTimes($employee, $today);

            $usedIds = AttendanceLog::where('employee_id', $employee->id)
                ->whereDate('attendance_date', Carbon::today())
                ->pluck('schedule_time_id')
                ->filter()
                ->all();

            $nextSchedule = $scheduleTimes->first(function ($time) use ($usedIds) {
                return !in_array($time->id, $usedIds);
            });

            return [
                'id'              => $employee->id,
                'employee_number' => $employee->employee_number,
                'full_name'       => $employee->full_name,
                'schedule_time'   => $nextSchedule?->scheduled_time,
            ];
        });

        return response()->json([
            'data' => $employees,
        ]);
    }

    public function updateSchedule(StoreEmployeeScheduleRequest $request, Employee $employee)
    {
        $assignment = $this->scheduleAssignmentService->assignSchedule([
            'employee_id'            => $employee->id,
            'attendance_schedule_id' => $request->attendance_schedule_id,
            'effective_from'         => $request->effective_from,
            'effective_to'           => $request->effective_to,
        ]);

        return response()->json([
            'message' => 'Schedule assigned successfully',
            'data'    => new \App\Http\Resources\EmployeeScheduleAssignmentResource(
                $assignment->load('employee', 'attendanceSchedule.days.times')
            ),
        ], 201);
    }
}
