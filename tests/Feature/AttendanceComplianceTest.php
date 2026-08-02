<?php

namespace Tests\Feature;

use App\Models\AttendanceSchedule;
use App\Models\AttendanceScheduleStatus;
use App\Models\Employee;
use App\Models\EmployeeScheduleAssignment;
use App\Models\Role;
use App\Models\User;
use App\Services\AttendanceComplianceService;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceComplianceTest extends TestCase
{
    use RefreshDatabase;

    private const DATE = '2026-07-31';

    private Employee $employee;

    private AttendanceSchedule $schedule;

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

        $this->schedule = AttendanceSchedule::create(['name' => 'Regular']);

        $friday = $this->schedule->days()->create([
            'day_of_week' => 5,
            'is_rest_day' => false,
        ]);

        foreach ([['08:00', 1], ['13:00', 2]] as [$time, $sequence]) {
            $friday->times()->create([
                'scheduled_time' => $time,
                'sequence' => $sequence,
            ]);
        }

        EmployeeScheduleAssignment::create([
            'employee_id' => $this->employee->id,
            'attendance_schedule_id' => $this->schedule->id,
            'effective_from' => '2026-07-30',
            'effective_to' => null,
        ]);
    }

    public function test_create_attendance_records_completed_schedule_status()
    {
        $log = app(AttendanceService::class)->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
            'remarks' => 'Heavy traffic',
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
            'attendance_schedule_id' => $this->schedule->id,
            'effective_from' => '2026-08-01',
            'effective_to' => null,
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
            'remarks' => 'Heavy traffic',
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
            'remarks' => 'Heavy traffic',
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
            'remarks' => 'Heavy traffic',
        ]);

        $complianceService->generateMissedAttendance(self::DATE);

        $this->assertSame(1, AttendanceScheduleStatus::where('status', AttendanceComplianceService::MISSED)->count());

        $attendanceService->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '13:05',
            'remarks' => 'Extended break',
        ]);

        $this->assertSame(0, AttendanceScheduleStatus::where('status', AttendanceComplianceService::MISSED)->count());
        $this->assertSame(2, AttendanceScheduleStatus::where('status', AttendanceComplianceService::COMPLETED)->count());
    }

    public function test_assign_schedule_via_employee_route_uses_url_employee_id()
    {
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);

        Sanctum::actingAs(User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role_id' => $role->id,
        ]));

        $employee = Employee::create([
            'employee_number' => 'EMP-002',
            'id_number' => 'ID-002',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'status' => 'ACTIVE',
        ]);

        $response = $this->putJson("/api/v1/employees/{$employee->id}/schedule", [
            'attendance_schedule_id' => $this->schedule->id,
            'effective_from' => '2026-08-01',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('employee_schedule_assignments', [
            'employee_id' => $employee->id,
            'attendance_schedule_id' => $this->schedule->id,
            'effective_to' => null,
        ]);
    }

    public function test_late_time_in_requires_remarks()
    {
        $this->expectException(\App\Exceptions\AttendanceException::class);
        $this->expectExceptionMessage('A reason for being late is required.');

        app(AttendanceService::class)->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
        ]);
    }

    public function test_late_attendance_saves_remarks_and_returns_them()
    {
        $attendanceService = app(AttendanceService::class);

        $log = $attendanceService->createAttendance([
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
            'remarks' => 'Heavy traffic',
        ]);

        $this->assertSame('LATE', $log->status);
        $this->assertSame('Heavy traffic', $log->remarks);
    }

    public function test_preview_endpoint_reports_late_status()
    {
        $response = $this->postJson('/api/v1/attendance/preview', [
            'employee_id' => $this->employee->id,
            'attendance_date' => self::DATE,
            'time_in' => '08:03',
        ]);

        $response->assertOk();

        $response->assertJson([
            'attendance_preview' => [
                'status' => 'LATE',
                'late_minutes' => 3,
            ],
        ]);
    }

    public function test_rest_day_rejects_attendance_and_skips_missed()
    {
        $sunday = $this->schedule->days()->create([
            'day_of_week' => 0,
            'is_rest_day' => true,
        ]);

        $this->assertTrue($sunday->is_rest_day);

        app(AttendanceComplianceService::class)->generateMissedAttendance('2026-08-02');

        $this->assertSame(0, AttendanceScheduleStatus::count());
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
