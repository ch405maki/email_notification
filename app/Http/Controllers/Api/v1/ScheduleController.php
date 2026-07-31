<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\StoreScheduleRequest;
use App\Http\Requests\Attendance\UpdateScheduleRequest;
use App\Http\Resources\ScheduleResource;
use App\Models\Schedule;
use App\Services\ScheduleService;

class ScheduleController extends Controller
{
    public function __construct(
        protected ScheduleService $scheduleService
    ) {}

    public function index()
    {
        return response()->json([
            'data' => ScheduleResource::collection(Schedule::with('scheduleTimes')->latest()->get()),
        ]);
    }

    public function store(StoreScheduleRequest $request)
    {
        $schedule = $this->scheduleService->createSchedule($request->validated());
        return response()->json([
            'message' => 'Schedule created successfully',
            'data'    => new ScheduleResource($schedule),
        ], 201);
    }

    public function show(Schedule $schedule)
    {
        return response()->json([
            'data' => new ScheduleResource($schedule->load('scheduleTimes')),
        ]);
    }

    public function update(UpdateScheduleRequest $request, Schedule $schedule)
    {
        $schedule = $this->scheduleService->updateSchedule($schedule, $request->validated());
        return response()->json([
            'message' => 'Schedule updated successfully',
            'data'    => new ScheduleResource($schedule),
        ]);
    }

    public function destroy(Schedule $schedule)
    {
        $schedule->delete();
        return response()->json([
            'message' => 'Schedule deleted successfully',
        ]);
    }
}
