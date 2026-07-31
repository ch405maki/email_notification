<?php

namespace App\Services;

use App\Exceptions\AttendanceException;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\ScheduleTime;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AttendanceService
{
    public function __construct(
        protected ScheduleAssignmentService $scheduleAssignmentService,
        protected AttendanceComplianceService $attendanceComplianceService
    ) {}

    public function createAttendance(array $data): AttendanceLog
    {
        return DB::transaction(function () use ($data) {
            $employee = Employee::findOrFail($data['employee_id']);

            $scheduleTime = $this->getNextScheduleTime($employee, $data['attendance_date']);

            if (! $scheduleTime) {
                throw new AttendanceException('All required attendance schedules for this date have already been completed.');
            }

            $lateMinutes = $this->computeLateMinutes($data['time_in'], $scheduleTime->scheduled_time);
            $status = $lateMinutes > 0 ? 'LATE' : 'ON_TIME';

            $attendance = AttendanceLog::create([
                'employee_id' => $data['employee_id'],
                'attendance_date' => $data['attendance_date'],
                'schedule_time_id' => $scheduleTime->id,
                'scheduled_time' => $scheduleTime->scheduled_time,
                'time_in' => $data['time_in'],
                'status' => $status,
                'late_minutes' => $lateMinutes,
                'remarks' => $data['remarks'] ?? null,
                'created_by' => auth()->id(),
            ]);

            $this->attendanceComplianceService->markCompleted($attendance);

            return $attendance;
        });
    }

    public function previewAttendance(string $keyword, string $date, string $timeIn): array
    {
        $employee = Employee::where('status', 'ACTIVE')
            ->where(function ($query) use ($keyword) {
                $query->where('employee_number', $keyword)
                    ->orWhere('id_number', $keyword);
            })
            ->first();

        if (! $employee) {
            throw new AttendanceException('No active employee found with that Employee Number or ID Number.');
        }

        $scheduleTimes = $this->scheduleAssignmentService->getActiveScheduleTimes($employee, $date);

        if ($scheduleTimes->isEmpty()) {
            return [
                'employee' => $employee,
                'upcoming_schedule' => null,
                'attendance_preview' => null,
                'message' => 'No active schedule is assigned to this employee.',
            ];
        }

        $scheduleTime = $this->getNextScheduleTime($employee, $date);

        if (! $scheduleTime) {
            return [
                'employee' => $employee,
                'upcoming_schedule' => null,
                'attendance_preview' => null,
                'message' => 'All required attendance schedules for this date have already been completed.',
            ];
        }

        $lateMinutes = $this->computeLateMinutes($timeIn, $scheduleTime->scheduled_time);
        $status = $lateMinutes > 0 ? 'LATE' : 'ON_TIME';

        return [
            'employee' => $employee,
            'upcoming_schedule' => [
                'schedule_time_id' => $scheduleTime->id,
                'scheduled_time' => $scheduleTime->scheduled_time,
            ],
            'attendance_preview' => [
                'status' => $status,
                'late_minutes' => $lateMinutes,
            ],
            'message' => null,
        ];
    }

    public function updateAttendance(AttendanceLog $attendance, array $data): AttendanceLog
    {
        $timeIn = Carbon::parse($data['time_in'] ?? $attendance->time_in);
        $scheduled = Carbon::parse($data['scheduled_time'] ?? $attendance->scheduled_time);

        $lateMinutes = $timeIn->greaterThan($scheduled)
            ? abs((int) $timeIn->diffInMinutes($scheduled))
            : 0;

        $status = $lateMinutes > 0 ? 'LATE' : 'ON_TIME';

        $attendance->update([
            'attendance_date' => $data['attendance_date'] ?? $attendance->attendance_date,
            'time_in' => $data['time_in'] ?? $attendance->time_in,
            'status' => $status,
            'late_minutes' => $lateMinutes,
            'remarks' => $data['remarks'] ?? $attendance->remarks,
            'updated_by' => auth()->id(),
        ]);

        $attendance = $attendance->fresh();

        $this->attendanceComplianceService->reconcileCompleted($attendance);

        return $attendance;
    }

    public function getAttendanceSummary(array $filters): array
    {
        $range = $this->resolveDateRange($filters);
        $employeeId = $filters['employee_id'] ?? null;

        $query = AttendanceLog::query()
            ->whereBetween('attendance_date', [$range['date_from'], $range['date_to']]);

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        $totals = (clone $query)
            ->selectRaw('COUNT(DISTINCT attendance_date) as present_days')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as late_count', ['LATE'])
            ->selectRaw('COALESCE(SUM(late_minutes), 0) as total_late_minutes')
            ->first();

        $totalLateMinutes = (int) $totals->total_late_minutes;

        $missedCount = $this->attendanceComplianceService->countMissed(
            $range['date_from'],
            $range['date_to'],
            $employeeId
        );

        $compliance = $this->buildComplianceCollection($filters);

        return [
            'present_days' => (int) $totals->present_days,
            'late_count' => (int) $totals->late_count,
            'total_late_minutes' => $totalLateMinutes,
            'total_late_hours' => round($totalLateMinutes / 60, 2),
            'missed_count' => $missedCount,
            'employees_near_threshold' => $compliance->where('status', 'WARNING')->count(),
            'employees_over_threshold' => $compliance->where('status', 'THRESHOLD REACHED')->count(),
        ];
    }

    public function getAttendanceCompliance(array $filters): array
    {
        $rows = $this->buildComplianceCollection($filters);

        $sortBy = $filters['sort_by'] ?? 'late_minutes';
        $sortDir = strtolower($filters['sort_dir'] ?? 'desc');

        $sortable = [
            'employee_number',
            'full_name',
            'late_count',
            'late_minutes',
            'missed_count',
            'late_count_percentage',
            'late_minutes_percentage',
            'risk_score',
            'status',
        ];

        if (! in_array($sortBy, $sortable, true)) {
            $sortBy = 'late_minutes';
        }

        $rows = $sortDir === 'asc'
            ? $rows->sortBy($sortBy)->values()
            : $rows->sortByDesc($sortBy)->values();

        $perPage = max(1, (int) ($filters['per_page'] ?? 10));
        $page = max(1, (int) ($filters['page'] ?? 1));

        return [
            'data' => $rows->forPage($page, $perPage)->values()->all(),
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($rows->count() / $perPage),
                'per_page' => $perPage,
                'total' => $rows->count(),
            ],
        ];
    }

    public function getAttendanceDashboard(array $filters): array
    {
        return [
            'summary' => $this->getAttendanceSummary($filters),
            'compliance' => $this->getAttendanceCompliance($filters),
            'chart' => $this->getChartData($filters),
            'range' => $this->resolveDateRange($filters),
            'thresholds' => [
                'late_minutes_threshold' => (int) config('attendance.late_minutes_threshold'),
                'late_count_threshold' => (int) config('attendance.late_count_threshold'),
                'missed_count_threshold' => (int) config('attendance.missed_count_threshold'),
            ],
        ];
    }

    public function calculateRiskScore(float $lateMinutes, float $lateCount, float $missedCount = 0): float
    {
        $minutesThreshold = (float) config('attendance.late_minutes_threshold', 60);
        $countThreshold = (float) config('attendance.late_count_threshold', 4);
        $missedThreshold = (float) config('attendance.missed_count_threshold', 1);

        $minutesWeight = (float) config('attendance.risk_minutes_weight', 40);
        $countWeight = (float) config('attendance.risk_count_weight', 30);
        $missedWeight = (float) config('attendance.risk_missed_weight', 30);

        $minutesComponent = $minutesThreshold > 0 ? ($lateMinutes / $minutesThreshold) * $minutesWeight : 0;
        $countComponent = $countThreshold > 0 ? ($lateCount / $countThreshold) * $countWeight : 0;
        $missedComponent = $missedThreshold > 0 ? ($missedCount / $missedThreshold) * $missedWeight : 0;

        return min(100, round($minutesComponent + $countComponent + $missedComponent, 2));
    }

    public function calculateComplianceStatus(float $percentage): string
    {
        if ($percentage >= 100) {
            return 'THRESHOLD REACHED';
        }

        if ($percentage >= 70) {
            return 'WARNING';
        }

        return 'SAFE';
    }

    protected function resolveDateRange(array $filters): array
    {
        $cutoff = $filters['cutoff'] ?? 'current';
        $now = Carbon::now();

        return match ($cutoff) {
            'first' => [
                'date_from' => $now->copy()->startOfMonth()->toDateString(),
                'date_to' => $now->copy()->startOfMonth()->addDays(14)->toDateString(),
            ],
            'second' => [
                'date_from' => $now->copy()->startOfMonth()->addDays(15)->toDateString(),
                'date_to' => $now->copy()->endOfMonth()->toDateString(),
            ],
            'custom' => [
                'date_from' => $filters['date_from'] ?? $now->copy()->startOfMonth()->toDateString(),
                'date_to' => $filters['date_to'] ?? $now->copy()->endOfMonth()->toDateString(),
            ],
            'today' => [
                'date_from' => $now->copy()->toDateString(),
                'date_to' => $now->copy()->toDateString(),
            ],
            'week' => [
                'date_from' => $now->copy()->subDays(6)->toDateString(),
                'date_to' => $now->copy()->toDateString(),
            ],
            'month' => [
                'date_from' => $now->copy()->subDays(29)->toDateString(),
                'date_to' => $now->copy()->toDateString(),
            ],
            default => (int) $now->format('j') <= 15
                ? [
                    'date_from' => $now->copy()->startOfMonth()->toDateString(),
                    'date_to' => $now->copy()->startOfMonth()->addDays(14)->toDateString(),
                ]
                : [
                    'date_from' => $now->copy()->startOfMonth()->addDays(15)->toDateString(),
                    'date_to' => $now->copy()->endOfMonth()->toDateString(),
                ],
        };
    }

    protected function buildComplianceCollection(array $filters): Collection
    {
        $range = $this->resolveDateRange($filters);
        $employeeId = $filters['employee_id'] ?? null;

        $query = AttendanceLog::query()
            ->whereBetween('attendance_date', [$range['date_from'], $range['date_to']])
            ->selectRaw('employee_id')
            ->selectRaw('COUNT(*) as present_count')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as late_count', ['LATE'])
            ->selectRaw('SUM(late_minutes) as late_minutes')
            ->groupBy('employee_id');

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        $stats = $query->get()->keyBy('employee_id');
        $missedStats = $this->attendanceComplianceService->getMissedStats($range['date_from'], $range['date_to']);

        $employeeIds = $stats->keys()->merge($missedStats->keys())->unique();

        if ($employeeId) {
            $employeeIds = $employeeIds->intersect([$employeeId]);
        }

        $employees = Employee::whereIn('id', $employeeIds)
            ->get(['id', 'employee_number', 'id_number', 'first_name', 'middle_name', 'last_name'])
            ->keyBy('id');

        $rows = collect();

        foreach ($employees as $employee) {
            $stat = $stats->get($employee->id) ?? (object) [
                'present_count' => 0,
                'late_count' => 0,
                'late_minutes' => 0,
            ];

            $stat->missed_count = (int) ($missedStats->get($employee->id)?->missed_count ?? 0);

            $rows->push($this->buildComplianceRow($employee, $stat));
        }

        if ($search = trim((string) ($filters['search'] ?? ''))) {
            $needle = strtolower($search);
            $rows = $rows->filter(function (array $row) use ($needle) {
                return str_contains(strtolower($row['employee_number']), $needle)
                    || str_contains(strtolower($row['full_name']), $needle);
            })->values();
        }

        return $rows;
    }

    protected function buildComplianceRow(Employee $employee, object $stat): array
    {
        $lateCount = (int) $stat->late_count;
        $lateMinutes = (int) $stat->late_minutes;
        $missedCount = (int) ($stat->missed_count ?? 0);
        $minutesThreshold = (int) config('attendance.late_minutes_threshold', 60);
        $countThreshold = (int) config('attendance.late_count_threshold', 4);
        $missedThreshold = (int) config('attendance.missed_count_threshold', 1);

        $lateMinutesPercentage = $minutesThreshold > 0 ? round(($lateMinutes / $minutesThreshold) * 100, 2) : 0;
        $lateCountPercentage = $countThreshold > 0 ? round(($lateCount / $countThreshold) * 100, 2) : 0;
        $missedPercentage = $missedThreshold > 0 ? round(($missedCount / $missedThreshold) * 100, 2) : 0;
        $riskScore = $this->calculateRiskScore($lateMinutes, $lateCount, $missedCount);
        $status = $this->calculateComplianceStatus(max($lateMinutesPercentage, $lateCountPercentage, $missedPercentage));

        return [
            'employee_id' => $employee->id,
            'employee_number' => $employee->employee_number,
            'full_name' => $employee->full_name,
            'late_count' => $lateCount,
            'late_minutes' => $lateMinutes,
            'missed_count' => $missedCount,
            'late_count_percentage' => $lateCountPercentage,
            'late_minutes_percentage' => $lateMinutesPercentage,
            'missed_percentage' => $missedPercentage,
            'risk_score' => $riskScore,
            'status' => $status,
        ];
    }

    protected function getChartData(array $filters): array
    {
        return $this->buildComplianceCollection($filters)
            ->sortByDesc('late_minutes')
            ->values()
            ->map(fn (array $row) => [
                'employee_number' => $row['employee_number'],
                'full_name' => $row['full_name'],
                'label' => $row['employee_number'],
                'late_minutes' => $row['late_minutes'],
                'late_count' => $row['late_count'],
                'missed_count' => $row['missed_count'],
                'status' => $row['status'],
            ])
            ->all();
    }

    protected function getNextScheduleTime(Employee $employee, string $date): ?ScheduleTime
    {
        $scheduleTimes = $this->scheduleAssignmentService->getActiveScheduleTimes($employee, $date);

        if ($scheduleTimes->isEmpty()) {
            throw new AttendanceException('No active schedule is assigned to this employee.');
        }

        $usedIds = $this->getUsedScheduleTimeIds($employee->id, $date);
        $usedTimes = $this->getUsedScheduleTimes($employee->id, $date);

        return $scheduleTimes->first(function (ScheduleTime $time) use ($usedIds, $usedTimes) {
            return ! in_array($time->id, $usedIds) && ! in_array($time->scheduled_time, $usedTimes);
        });
    }

    protected function computeLateMinutes(string $timeIn, string $scheduledTime): int
    {
        $timeIn = Carbon::parse($timeIn);
        $scheduled = Carbon::parse($scheduledTime);

        if (! $timeIn->greaterThan($scheduled)) {
            return 0;
        }

        return abs((int) $timeIn->diffInMinutes($scheduled));
    }

    protected function getUsedScheduleTimeIds(int $employeeId, string $date): array
    {
        return $this->getEmployeeLogs($employeeId, $date)
            ->pluck('schedule_time_id')
            ->filter()
            ->values()
            ->all();
    }

    protected function getUsedScheduleTimes(int $employeeId, string $date): array
    {
        return $this->getEmployeeLogs($employeeId, $date)
            ->whereNull('schedule_time_id')
            ->pluck('scheduled_time')
            ->all();
    }

    protected function getEmployeeLogs(int $employeeId, string $date): Collection
    {
        return AttendanceLog::where('employee_id', $employeeId)
            ->whereDate('attendance_date', $date)
            ->get();
    }
}
