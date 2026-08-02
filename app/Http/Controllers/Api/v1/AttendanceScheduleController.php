<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\StoreAttendanceScheduleRequest;
use App\Http\Requests\Attendance\UpdateAttendanceScheduleRequest;
use App\Http\Resources\AttendanceScheduleResource;
use App\Models\AttendanceSchedule;
use App\Services\AttendanceScheduleService;

class AttendanceScheduleController extends Controller
{
    public function __construct(
        protected AttendanceScheduleService $attendanceScheduleService
    ) {}

    public function index()
    {
        return response()->json([
            'data' => AttendanceScheduleResource::collection(
                AttendanceSchedule::with('days.times')->latest()->get()
            ),
        ]);
    }

    public function store(StoreAttendanceScheduleRequest $request)
    {
        $schedule = $this->attendanceScheduleService->createSchedule($request->validated());

        return response()->json([
            'message' => 'Schedule created successfully',
            'data'    => new AttendanceScheduleResource($schedule),
        ], 201);
    }

    public function show(AttendanceSchedule $attendanceSchedule)
    {
        return response()->json([
            'data' => new AttendanceScheduleResource($attendanceSchedule->load('days.times')),
        ]);
    }

    public function update(UpdateAttendanceScheduleRequest $request, AttendanceSchedule $attendanceSchedule)
    {
        $schedule = $this->attendanceScheduleService->updateSchedule($attendanceSchedule, $request->validated());

        return response()->json([
            'message' => 'Schedule updated successfully',
            'data'    => new AttendanceScheduleResource($schedule),
        ]);
    }

    public function destroy(AttendanceSchedule $attendanceSchedule)
    {
        $attendanceSchedule->delete();

        return response()->json([
            'message' => 'Schedule deleted successfully',
        ]);
    }
}
