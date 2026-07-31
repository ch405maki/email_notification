<?php

namespace Tests\Feature;

use App\Models\AttendanceScheduleStatus;
use App\Models\Employee;
use App\Models\EmployeeScheduleAssignment;
use App\Models\Schedule;
use App\Services\AttendanceComplianceService;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceComplianceTest extends TestCase
{
    use RefreshDatabase;

    private const DATE = '2026-07-31';

    private Employee $employee;

    private Schedule $schedule;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-01 08:00:00');

        $this->employee = Employee::create([
            'employee_number' => 'EMP-001',
            'id_number' => 'ID-001',
            'first_name' => 'Mark',
            'last_name' => 'Manuel',
            'status' => 'ACTIVE',
        ]);

        $this->schedule = Schedule::create(['name' => 'Regular', 'start_time' => '08:00:00']);

        foreach ([['08:00', 1], ['13:00', 2]] as [$time, $sequence]) {
            $this->schedule->scheduleTimes()->create([
                'scheduled_time' => $time,
                'sequence' => $sequence,
            ]);
        }

        EmployeeScheduleAssignment::create([
            'employee_id' => $this->employee->id,
            'schedule_id' => $this->schedule->id,
            'effective_date' => '2026-07-30',
        ]);
    }

    public function test_create_attendance_records_completed_schedule_status()
    {
        $log = app(AttendanceService::class)->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
        ]);

        $status = AttendanceScheduleStatus::where('attendance_log_id', $log->id)->first();

        $this->assertNotNull($status);
        $this->assertSame(AttendanceComplianceService::COMPLETED, $status->status);
        $this->assertSame($this->employee->id, $status->employee_id);
        $this->assertSame($log->schedule_time_id, $status->schedule_time_id);
    }

    public function test_generate_missed_attendance_is_idempotent_and_scoped_to_date()
    {
        $service = app(AttendanceComplianceService::class);

        $firstRun = $service->generateMissedAttendance(self::DATE);
        $secondRun = $service->generateMissedAttendance(self::DATE);

        $this->assertSame(2, $firstRun);
        $this->assertSame(0, $secondRun);
        $this->assertSame(2, AttendanceScheduleStatus::where('status', AttendanceComplianceService::MISSED)->count());
    }

    public function test_no_missed_records_are_generated_until_the_day_has_passed()
    {
        Carbon::setTestNow('2026-07-31 23:59:00');

        app(AttendanceComplianceService::class)->generateMissedAttendance(self::DATE);

        $this->assertSame(0, AttendanceScheduleStatus::count());
    }

    public function test_missed_is_based_on_the_schedule_effective_date()
    {
        EmployeeScheduleAssignment::where('employee_id', $this->employee->id)->delete();

        EmployeeScheduleAssignment::create([
            'employee_id' => $this->employee->id,
            'schedule_id' => $this->schedule->id,
            'effective_date' => '2026-08-01',
        ]);

        app(AttendanceComplianceService::class)->generateMissedAttendance(self::DATE);

        $this->assertSame(0, AttendanceScheduleStatus::count());
    }

    public function test_missed_records_are_generated_for_uncompleted_slots_only()
    {
        $attendanceService = app(AttendanceService::class);

        $attendanceService->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
        ]);

        app(AttendanceComplianceService::class)->generateMissedAttendance(self::DATE);

        $statuses = AttendanceScheduleStatus::whereDate('attendance_date', self::DATE)
            ->orderBy('scheduled_time')
            ->get();

        $this->assertSame(['COMPLETED', 'MISSED'], $statuses->pluck('status')->all());
    }

    public function test_generate_missed_respects_existing_logs_without_status_records()
    {
        app(AttendanceService::class)->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
        ]);

        AttendanceScheduleStatus::query()->delete();

        app(AttendanceComplianceService::class)->generateMissedAttendance(self::DATE);

        $statuses = AttendanceScheduleStatus::whereDate('attendance_date', self::DATE)
            ->orderBy('scheduled_time')
            ->get();

        $this->assertSame(['COMPLETED', 'MISSED'], $statuses->pluck('status')->all());
    }

    public function test_dashboard_includes_missed_count_metrics()
    {
        app(AttendanceComplianceService::class)->generateMissedAttendance(self::DATE);

        $dashboard = app(AttendanceService::class)->getAttendanceDashboard([
            'cutoff' => 'custom',
            'date_from' => self::DATE,
            'date_to' => self::DATE,
        ]);

        $this->assertSame(2, $dashboard['summary']['missed_count']);

        $row = $dashboard['compliance']['data'][0];

        $this->assertSame(2, $row['missed_count']);
        $this->assertSame(60.0, $row['risk_score']);
        $this->assertSame('THRESHOLD REACHED', $row['status']);
        $this->assertSame(1, $dashboard['thresholds']['missed_count_threshold']);
    }

    public function test_risk_score_is_capped_at_100()
    {
        $attendanceService = app(AttendanceService::class);

        $this->assertSame(100.0, $attendanceService->calculateRiskScore(300, 5, 3));
    }

    public function test_late_time_in_heals_missed_status_to_completed()
    {
        $attendanceService = app(AttendanceService::class);
        $complianceService = app(AttendanceComplianceService::class);

        $attendanceService->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
        ]);

        $complianceService->generateMissedAttendance(self::DATE);

        $this->assertSame(1, AttendanceScheduleStatus::where('status', AttendanceComplianceService::MISSED)->count());

        $attendanceService->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '13:05',
        ]);

        $this->assertSame(0, AttendanceScheduleStatus::where('status', AttendanceComplianceService::MISSED)->count());
        $this->assertSame(2, AttendanceScheduleStatus::where('status', AttendanceComplianceService::COMPLETED)->count());
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
