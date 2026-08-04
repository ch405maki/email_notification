# API Specification

All JSON endpoints live under the `/api/v1` prefix (`routes/api.php`). Unless noted, requests are
JSON (`Content-Type: application/json`) and responses are JSON.

## Authentication

- Session-based via Laravel Sanctum stateful guard (frontend is Inertia); `auth:sanctum` routes also
  accept personal access tokens.
- `GET /api/v1/user` returns the authenticated user.
- Public attendance endpoints (`lookup`, `time-in`) are intentionally **unauthenticated** for kiosk use.

## Module guard

`module:attendance` = `CanAccessModule` middleware. The `admin` role bypasses all module checks
(`User::hasAllModules()`). 403 when a non-admin lacks the module.

## Conventions

- Errors: `{ "message": "..." }` with HTTP 422 (validation / `AttendanceException`) or 403/500.
- Pagination meta shape: `meta: { current_page, last_page, per_page?, total }`.
- Time format: `H:i` (e.g. `08:00`). `attendance_logs`/schedule resources return `scheduled_time`
  as `H:i` (seconds are stripped from the MySQL `TIME` value).
- Date format: `Y-m-d`.

---

## Attendance

### `GET /api/v1/attendance` — list logs (history)

Query params: `employee_id`, `date_from`, `date_to`, `status` (`ON_TIME`|`LATE`), `page`.

Response `data[]` items (via `AttendanceLogResource`):
`id, employee_id, attendance_date, schedule_time_id, scheduled_time, time_in, status, late_minutes,
remarks, schedule_name, employee{...}, schedule_time{...}, created_at, updated_at`.

`remarks` is populated with the reason for late (nullable for ON_TIME records).

### `POST /api/v1/attendance` — create log (admin entry)

Body: `employee_id`, `attendance_date` (Y-m-d), `time_in` (H:i), `remarks` (nullable string ≤1000).

Rules enforced in `AttendanceService::createAttendance`:
- No active assignment → 422.
- Rest day → 422.
- No slots for the day → 422.
- All slots already completed → 422.
- Status `LATE` without `remarks` → 422 "A reason for being late is required."

### `GET /api/v1/attendance/{attendance}` — log details

`AttendanceLogResource` (same shape as list item).

### `PUT /api/v1/attendance/{attendance}` — update log

Body (partial): `attendance_date`, `time_in`, `remarks`, `scheduled_time`. Status/late_minutes are
recomputed; `reconcileCompleted()` refreshes the compliance status.

### `DELETE /api/v1/attendance/{attendance}` — delete log

### `POST /api/v1/attendance/public/lookup` — kiosk preview (no auth)

Body: `keyword` (employee_number or id_number), `attendance_date` (optional), `time_in` (optional,
defaults to now).

Response:
```json
{
  "employee": { "id": 1, "employee_number": "EMP-001", "id_number": "ID-001", "full_name": "..." },
  "upcoming_schedule": { "schedule_time_id": 12, "scheduled_time": "13:00" } | null,
  "attendance_preview": { "status": "LATE", "late_minutes": 3 } | null,
  "message": null | "Today is a rest day. Enjoy your day off!"
}
```
422 with `message` when the employee is not found.

### `POST /api/v1/attendance/public/time-in` — record time-in (no auth)

Body: `employee_id`, `attendance_date`, `time_in`, `remarks` (nullable).

Same business rules as admin create (422 on rest day / no schedule / all completed / LATE without remarks).

Response 201:
```json
{
  "message": "Attendance successfully recorded.",
  "data": { "attendance_date": "2026-07-31", "scheduled_time": "13:00",
            "time_in": "13:05", "status": "LATE", "late_minutes": 5, "remarks": "Traffic" }
}
```

### `POST /api/v1/attendance/preview` — admin status preview (no auth)

Body: `employee_id`, `attendance_date`, `time_in`.
Response: `{ upcoming_schedule, attendance_preview, message }` (same as lookup, minus `employee`).

### `GET /api/v1/attendance-summary` — summary metrics

`module:attendance`. Query: `employee_id`, `cutoff`, `date_from`, `date_to`.

Response `summary`: `present_days, late_count, total_late_minutes, total_late_hours, missed_count,
employees_near_threshold, employees_over_threshold`.

### `GET /api/v1/attendance-compliance` — compliance table

`module:attendance`. Query: `employee_id`, `cutoff`, `date_from`, `date_to`, `search`,
`sort_by`, `sort_dir`, `page`, `per_page`.

Response `data[]`: `employee_id, employee_number, full_name, late_count, late_minutes, missed_count,
late_count_percentage, late_minutes_percentage, missed_percentage, risk_score, status`.

### `GET /api/v1/attendance-dashboard` — dashboard bundle

Response: `{ summary, compliance, chart[], range, thresholds }`.
`chart[]` items: `employee_number, full_name, label, late_minutes, late_count, missed_count, status`.

---

## Employees

### `GET /api/v1/employees` — list (paginated)
`module:attendance`. Query: `search`. Response via `EmployeeResource`:
`id, employee_number, id_number, first_name, middle_name, last_name, full_name, section, status, created_at, updated_at`.

### `GET /api/v1/employees/options` — dropdown options (no auth)
Query: `search`. Response `data[]`: `{ id, employee_number, id_number, full_name, schedule_time }`
where `schedule_time` is the next unused slot for **today** (null when none/rest day).

### `POST /api/v1/employees` — create (`module:attendance`)
Body via `StoreEmployeeRequest` (`section` optional: `Systems` | `Technical`).

### `GET /api/v1/employees/{employee}` — show (`module:attendance`)

### `PUT /api/v1/employees/{employee}` — update (`module:attendance`)

### `DELETE /api/v1/employees/{employee}` — delete (`module:attendance`)

### `PUT /api/v1/employees/{employee}/schedule` — assign schedule (`module:attendance`)
Body: `attendance_schedule_id`, `effective_from`, `effective_to` (nullable).
`employee_id` is taken from the URL route parameter (`prepareForValidation` merges it).
Response 201 via `EmployeeScheduleAssignmentResource`.

---

## Weekly schedule templates

Resource route `attendance-schedules` (`module:attendance`):
`GET/POST /attendance-schedules`, `GET/PUT/DELETE /attendance-schedules/{attendance_schedule}`.

### `POST /attendance-schedules` — create template

Body:
```json
{
  "name": "Regular Office",
  "days": [
    { "day_of_week": 1, "is_rest_day": false,
      "times": [{ "scheduled_time": "08:00", "sequence": 1 }] },
    { "day_of_week": 0, "is_rest_day": true, "times": [] }
  ]
}
```
Validation: name required+unique+≤255; `day_of_week` 0–6; `scheduled_time` format `H:i`;
no duplicate day-of-week per schedule; no duplicate time per day.

### `PUT /attendance-schedules/{attendance_schedule}` — update
Same shape; replaces all days (delete-and-recreate in a transaction).

Response via `AttendanceScheduleResource`:
`{ id, name, days: [{ id, attendance_schedule_id, day_of_week, is_rest_day,
times: [{ id, attendance_schedule_day_id, scheduled_time, sequence, schedule_name }] }], created_at, updated_at }`.

---

## Employee schedule assignments

Resource route `employee-schedules` (`module:attendance`):
`GET /employee-schedules` (paginated, with employee + attendanceSchedule.days.times),
`POST /employee-schedules` (assign; closes prior window), `GET/PUT/DELETE /employee-schedules/{employee_schedule}`.

### `GET /api/v1/employee-schedules/export` — Excel report (`module:attendance`)
Streams an `.xlsx` (PhpSpreadsheet) with:
- Row 1 — merged title `Employee Schedules - <Month Year>` (e.g. `August 2026`), gray fill.
- Row 2 — column headers `Name, Mon, Tue, Wed, Thu, Fri, Sat, Sun`, gray fill.
- One block per employee section, ordered `Technical`, `Systems`, `Unassigned`:
  each block opens with a bold light-gray group header (`Technical`, `Systems`, or `Unassigned`)
  followed by that section's ACTIVE employees.
- Day cells show `Restday` on rest days, the 12-hour time range (`8:00AM - 1:00PM`, multiple slots
  joined with ` - `) on working days, blank when no active schedule.
- All text is rendered in uppercase; rest-day cells are highlighted (light-red fill + bold red text).
Query params (optional): `section` (`Systems`|`Technical`) to filter, `date` to resolve as of that date.
Filename: `employee-schedules-<date>.xlsx`.

Response via `EmployeeScheduleAssignmentResource`:
`{ id, employee_id, attendance_schedule_id, effective_from, effective_to,
employee{...}, attendance_schedule{...} }`.

---

## Users / Roles / Modules

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/roles` | sanctum | list roles `[{id,name,slug}]` |
| GET/POST | `/users` | sanctum | list / create users |
| PUT/DELETE | `/users/{user}` | sanctum | update / delete user |
| GET/POST | `/modules` | sanctum | list / create modules |
| PUT/DELETE | `/modules/{module}` | sanctum | update / delete module |

User body: `name, email, password (min 6, nullable on update), role_id, status (boolean), modules[] (ids)`.

---

## Students & email

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/students/download-template` | CSV import template |
| POST | `/students/upload` | import CSV (multipart `file`) |
| POST | `/students/import-json` | import `rows[] {student_number,email}` |
| POST | `/students/check-batch` | body `student_numbers[]`; returns `{existing[], sent[]}` |
| POST | `/students/send-bulk` | body `subject, body, sync`; queue/send to unsent |
| GET | `/students/unsent` | paginated unsent students (`search`) |
| GET | `/students/stats` | `{total_students, sent, failed, pending, unsent}` |
| PUT/DELETE | `/students/{student}` | update / delete |
| GET | `/email-logs` | list (`status`, `search`) |
| GET/PUT/DELETE | `/email-logs/{emailLog}` | show / update status / delete |
| GET | `/emails/template` | default subject + rendered body |
| POST | `/emails/preview` | body `student_number,email`; rendered subject/body |
| POST | `/emails/send-single` | body `student_number,email,sync`; update-or-create + send |
