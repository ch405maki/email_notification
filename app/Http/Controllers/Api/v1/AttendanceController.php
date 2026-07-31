<?php

namespace App\Http\Controllers\Api\v1;

use App\Exceptions\AttendanceException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\PublicLookupRequest;
use App\Http\Requests\Attendance\PublicTimeInRequest;
use App\Http\Requests\Attendance\StoreAttendanceRequest;
use App\Http\Requests\Attendance\UpdateAttendanceRequest;
use App\Http\Resources\AttendanceLogResource;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\ScheduleTime;
use App\Services\AttendanceService;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService
    ) {}

    public function index(Request $request)
    {
        $query = AttendanceLog::with(['employee', 'scheduleTime.schedule']);

        if ($employeeId = $request->employee_id) {
            $query->where('employee_id', $employeeId);
        }

        if ($dateFrom = $request->date_from) {
            $query->whereDate('attendance_date', '>=', $dateFrom);
        }

        if ($dateTo = $request->date_to) {
            $query->whereDate('attendance_date', '<=', $dateTo);
        }

        if ($status = $request->status) {
            $query->where('status', $status);
        }

        $logs = $query->latest('attendance_date')->paginate(10);

        $nameByTime = ScheduleTime::with('schedule')->get()
            ->mapWithKeys(fn (ScheduleTime $time) => [substr($time->scheduled_time, 0, 5) => $time->schedule?->name])
            ->filter()
            ->unique();

        $logs->getCollection()->each(function (AttendanceLog $log) use ($nameByTime) {
            $name = $log->scheduleTime?->schedule?->name;

            if (! $name) {
                $name = $nameByTime->get(substr($log->scheduled_time, 0, 5));
            }

            $log->setAttribute('schedule_name', $name);
        });

        return response()->json([
            'data' => AttendanceLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    public function store(StoreAttendanceRequest $request)
    {
        $attendance = $this->attendanceService->createAttendance($request->validated());

        return response()->json([
            'message' => 'Attendance recorded successfully',
            'data' => new AttendanceLogResource($attendance->load(['employee', 'scheduleTime.schedule'])),
        ], 201);
    }

    public function show(AttendanceLog $attendance)
    {
        return response()->json([
            'data' => new AttendanceLogResource($attendance->load(['employee', 'scheduleTime.schedule'])),
        ]);
    }

    public function update(UpdateAttendanceRequest $request, AttendanceLog $attendance)
    {
        $attendance = $this->attendanceService->updateAttendance($attendance, $request->validated());

        return response()->json([
            'message' => 'Attendance updated successfully',
            'data' => new AttendanceLogResource($attendance->load(['employee', 'scheduleTime.schedule'])),
        ]);
    }

    public function destroy(AttendanceLog $attendance)
    {
        $attendance->delete();

        return response()->json([
            'message' => 'Attendance deleted successfully',
        ]);
    }

    public function summary(Request $request)
    {
        return response()->json([
            'summary' => $this->attendanceService->getAttendanceSummary($request->all()),
        ]);
    }

    public function compliance(Request $request)
    {
        return response()->json([
            'data' => $this->attendanceService->getAttendanceCompliance($request->all()),
        ]);
    }

    public function dashboard(Request $request)
    {
        return response()->json([
            'data' => $this->attendanceService->getAttendanceDashboard($request->all()),
        ]);
    }

    public function publicLookup(PublicLookupRequest $request)
    {
        try {
            $preview = $this->attendanceService->previewAttendance(
                $request->keyword,
                $request->attendance_date ?? now()->toDateString(),
                $request->time_in ?? now()->format('H:i')
            );

            return response()->json([
                'employee' => [
                    'id' => $preview['employee']->id,
                    'employee_number' => $preview['employee']->employee_number,
                    'id_number' => $preview['employee']->id_number,
                    'full_name' => $preview['employee']->full_name,
                ],
                'upcoming_schedule' => $preview['upcoming_schedule'],
                'attendance_preview' => $preview['attendance_preview'],
                'message' => $preview['message'],
            ]);
        } catch (AttendanceException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function publicTimeIn(PublicTimeInRequest $request)
    {
        try {
            $employee = Employee::find($request->employee_id);

            if (! $employee || $employee->status !== 'ACTIVE') {
                throw new AttendanceException('No active employee found with that Employee Number or ID Number.');
            }

            $attendance = $this->attendanceService->createAttendance([
                'employee_id' => $request->employee_id,
                'attendance_date' => $request->attendance_date,
                'time_in' => $request->time_in,
            ]);

            return response()->json([
                'message' => 'Attendance successfully recorded.',
                'data' => [
                    'attendance_date' => $attendance->attendance_date->toDateString(),
                    'scheduled_time' => $attendance->scheduled_time,
                    'time_in' => $attendance->time_in,
                    'status' => $attendance->status,
                    'late_minutes' => $attendance->late_minutes,
                ],
            ], 201);
        } catch (AttendanceException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
