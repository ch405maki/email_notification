<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\StoreEmployeeScheduleRequest;
use App\Http\Requests\Attendance\UpdateEmployeeScheduleRequest;
use App\Http\Resources\EmployeeScheduleAssignmentResource;
use App\Models\EmployeeScheduleAssignment;
use App\Services\ScheduleAssignmentService;

class EmployeeScheduleAssignmentController extends Controller
{
    public function __construct(
        protected ScheduleAssignmentService $scheduleAssignmentService
    ) {}

    public function index()
    {
        $assignments = EmployeeScheduleAssignment::with('employee', 'schedule')->latest()->paginate(10);
        return response()->json([
            'data' => EmployeeScheduleAssignmentResource::collection($assignments),
            'meta' => [
                'current_page' => $assignments->currentPage(),
                'last_page'    => $assignments->lastPage(),
                'total'        => $assignments->total(),
            ],
        ]);
    }

    public function store(StoreEmployeeScheduleRequest $request)
    {
        $assignment = $this->scheduleAssignmentService->assignSchedule($request->validated());
        return response()->json([
            'message' => 'Schedule assigned successfully',
            'data'    => new EmployeeScheduleAssignmentResource($assignment->load('employee', 'schedule')),
        ], 201);
    }

    public function show(EmployeeScheduleAssignment $employeeSchedule)
    {
        return response()->json([
            'data' => new EmployeeScheduleAssignmentResource($employeeSchedule->load('employee', 'schedule')),
        ]);
    }

    public function update(UpdateEmployeeScheduleRequest $request, EmployeeScheduleAssignment $employeeSchedule)
    {
        $employeeSchedule->update($request->validated());
        return response()->json([
            'message' => 'Schedule assignment updated successfully',
            'data'    => new EmployeeScheduleAssignmentResource($employeeSchedule->fresh()->load('employee', 'schedule')),
        ]);
    }

    public function destroy(EmployeeScheduleAssignment $employeeSchedule)
    {
        $employeeSchedule->delete();
        return response()->json([
            'message' => 'Schedule assignment deleted successfully',
        ]);
    }
}
