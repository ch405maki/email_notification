# AI Backend Guide

Map of the Laravel backend for the attendance + email features. Read `business-rules.md` for the
domain rules and `api-specification.md` for endpoints.

## Directory map

```
app/
  Console/Commands/
    GenerateMissedAttendance.php   artisan attendance:generate-missed [--date=]
    ProcessPendingEmails.php       artisan process-pending-emails
  Exceptions/AttendanceException.php  renders {message} as 422 JSON
  Http/
    Controllers/Api/v1/           JSON API controllers
    Controllers/Settings/         Fortify account settings
    Middleware/CanAccessModule.php   module:<slug> guard
    Middleware/HandleInertiaRequests.php  shares auth.user.{role,modules}
    Requests/Attendance/          FormRequests (attendance, schedules, assignments)
    Requests/Settings/            Profile / 2FA
    Resources/                    API resources
  Jobs/SendStudentEmailJob.php
  Mail/DynamicMail.php, StudentOnboardingMail.php
  Models/
  Services/
```

## Services (the core)

| Service | Responsibility |
| --- | --- |
| `AttendanceService` | Attendance resolution engine, create/preview/update, summary, compliance, dashboard, risk scoring. |
| `AttendanceComplianceService` | COMPLETED/MISSED statuses, `markCompleted`, `reconcileCompleted`, `generateMissedAttendance`, missed stats. |
| `ScheduleAssignmentService` | Effective-dated assignment windows; `getActiveAssignment/Schedule/Times`, `getScheduleDay`. |
| `AttendanceScheduleService` | Weekly template CRUD (delete-and-recreate days). |
| `EmployeeService` | Employee CRUD + search. |
| `EmployeeScheduleExportService` | Builds/streams the employee-schedules `.xlsx` report (Name + Section + Mon–Sun grid) via PhpSpreadsheet; `stream()` and `build()`. |
| `ScheduleService` | **Legacy dead code** — do not extend (see PROJECT_CONTEXT.md). |

### AttendanceService — key public methods

- `createAttendance(array $data): AttendanceLog` — full 10-step resolution (see business-rules.md),
  requires `remarks` when LATE, then `markCompleted`.
- `previewAttendance(string $keyword, string $date, string $timeIn): array` — kiosk preview by
  employee number/ID.
- `previewAttendanceForEmployee(Employee $employee, string $date, string $timeIn): array` — shared
  preview used by the kiosk lookup and the admin `/attendance/preview` endpoint.
- `updateAttendance(AttendanceLog $a, array $data): AttendanceLog` — recomputes status, reconciles
  compliance status.
- `getAttendanceSummary(array $filters): array`
- `getAttendanceCompliance(array $filters): array`
- `getAttendanceDashboard(array $filters): array`
- `calculateRiskScore(...)`, `calculateComplianceStatus(...)`
- Resolution helpers: `resolveEmployeeSchedule`, `resolveScheduleDay`, `resolveScheduleTimes`,
  `resolveUpcomingSchedule`, `isRestDay`.
- Internal: `resolveDateRange`, `buildComplianceCollection`, `buildComplianceRow`, `getChartData`,
  `computeLateMinutes`, `getUsedScheduleTimeIds/Times`, `getEmployeeLogs`.

## Controllers (thin)

- `AttendanceController` — index/store/show/update/destroy + `publicLookup`, `publicTimeIn`,
  `preview`, `summary`, `compliance`, `dashboard`.
- `AttendanceScheduleController` — `apiResource('attendance-schedules')`.
- `EmployeeScheduleAssignmentController` — `apiResource('employee-schedules')` + `export`
  (`GET /employee-schedules/export`, streamed `.xlsx`).
- `EmployeeController` — employees resource + `options` + `updateSchedule`.
- `UsersController`, `RolesController`, `ModulesController` — auth/user admin.
- `StudentController`, `EmailController`, `EmailLogController` — student email module.

## Requests (validation)

Attendance:

- `StoreAttendanceRequest` / `UpdateAttendanceRequest` — employee_id, attendance_date, time_in (H:i),
  remarks (nullable ≤1000).
- `PublicLookupRequest` — keyword; date/time optional.
- `PublicTimeInRequest` — employee_id, attendance_date, time_in, remarks.
- `StoreAttendanceScheduleRequest` / `UpdateAttendanceScheduleRequest` — name unique; days array with
  day_of_week (0–6), is_rest_day, times[{scheduled_time H:i, sequence}]; `after` callbacks reject
  duplicate day-of-week and duplicate times per day.
- `StoreEmployeeScheduleRequest` / `UpdateEmployeeScheduleRequest` — attendance_schedule_id,
  effective_from, effective_to. `prepareForValidation()` merges the URL `employee` param into
  `employee_id` for the `PUT /employees/{employee}/schedule` route.

## Resources

- `AttendanceLogResource` — includes `remarks`, `schedule_name`, `employee`, `schedule_time`.
- `AttendanceScheduleResource` / `AttendanceScheduleDayResource` / `AttendanceScheduleDayTimeResource`
  — template tree; time normalized to `H:i`.
- `EmployeeScheduleAssignmentResource` — assignment + employee + attendanceSchedule.
- `EmployeeResource`, `EmployeeOptionResource`.
- Legacy `ScheduleResource`, `ScheduleTimeResource` — unrouted dead code.

## Models

| Model | Notes |
| --- | --- |
| `AttendanceSchedule` | hasMany days |
| `AttendanceScheduleDay` | belongsTo schedule, hasMany times (ordered by sequence); casts day_of_week int, is_rest_day bool |
| `AttendanceScheduleDayTime` | belongsTo day |
| `EmployeeScheduleAssignment` | belongsTo employee + attendanceSchedule; date casts |
| `AttendanceLog` | belongsTo employee, scheduleTime (→ day time), scheduleStatus |
| `AttendanceScheduleStatus` | per-slot status row |
| `Employee` | `full_name` accessor "Last, First M."; `section` (`Systems`/`Technical`); hasMany scheduleAssignments, attendanceLogs |
| `Student`, `EmailLog` | email module |

## Routes

- `routes/api.php` — `/api/v1` JSON API (see api-specification.md). Note public attendance endpoints.
- `routes/console.php` — `attendance:generate-missed` daily at 23:59.

## Common tasks

**Add a rule that rejects a bad attendance:**
1. Compute the condition inside `AttendanceService` (after status is known).
2. `throw new AttendanceException('...')`.
3. Add a test asserting the exception message.

**Expose a new field on logs:**
1. Add/verify column via migration.
2. Add to `AttendanceLogResource`.
3. Verify the admin list/details and public time-in response expose it.

**Change time resolution:** update `resolveUpcomingSchedule` in `AttendanceService` and
`getActiveScheduleTimes` in `ScheduleAssignmentService`, then update `business-rules.md`.
