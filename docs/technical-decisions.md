# Technical Decisions

Record of architectural decisions and their rationale. Add new decisions here whenever a non-trivial
design choice is made.

## Weekly Schedule Template System (replaces flat daily schedule)

**Status:** Decided (implemented 2026-08-02)

**Context:** The original model used a flat daily schedule (`schedules` → `schedule_times`) and a
single `effective_date` assignment. This could not express recurring weekly patterns, multiple
time-ins per day, or per-day rest days.

**Decision:** Introduce a three-level weekly template:

```
attendance_schedules
  └── attendance_schedule_days   (per day-of-week, is_rest_day)
        └── attendance_schedule_day_times (per slot, ordered by sequence)
```

**Rationale:** Reusable weekly templates can be assigned to many employees; rest days are first-class;
multiple time-in slots per day are supported; day-of-week stays stable across weeks.

**Consequences:** A fresh start — the legacy `schedules` / `schedule_times` tables and their unrouted
dead code (`ScheduleService`, `ScheduleController`, `ScheduleResource`, `ScheduleTimeResource`) remain
in the repo but are not used.

## Effective-dated employee assignments (one active per employee)

**Status:** Decided (implemented 2026-08-02)

**Decision:** `employee_schedule_assignments` were rebuilt with `effective_from` + nullable
`effective_to`. Assigning a new schedule closes any open/overlapping window
(`effective_to = effective_from - 1 day`) inside a transaction. Resolution picks the latest
`effective_from` covering the date.

**Rationale:** Supports retroactive/future assignments and guarantees exactly one active template per
employee at any time, which the attendance resolution relies on.

**Consequences:** Legacy assignment rows were dropped in a rebuild migration
(`2026_08_02_000002_rebuild_employee_schedule_assignments_table`).

## Repointed `schedule_time_id` foreign keys

**Status:** Decided (implemented 2026-08-02)

**Decision:** `attendance_logs.schedule_time_id` and `attendance_schedule_statuses.schedule_time_id`
now reference `attendance_schedule_day_times` (was `schedule_times`) with `nullOnDelete`. Existing rows
were nulled in the migration (`2026_08_02_000003_repoint_schedule_time_foreign_keys_table`).

**Rationale:** Keeps the linkage between actual logs/statuses and the new slot rows, preserving
resolution and reporting.

## Resolution logic lives in services, not controllers

**Status:** Decided

**Decision:** Controllers stay thin. All resolution — `resolveEmployeeSchedule`,
`resolveScheduleDay`, `resolveScheduleTimes`, `resolveUpcomingSchedule`, `isRestDay` — lives in
`AttendanceService`; assignment windowing lives in `ScheduleAssignmentService`; template CRUD lives in
`AttendanceScheduleService`; compliance/missed logic lives in `AttendanceComplianceService`.

**Rationale:** Business rules are testable without HTTP, and both the admin API and the public kiosk
share the same engine.

## Rest day is a rejection + skip

**Status:** Decided

**Decision:** On a rest day the kiosk rejects attendance and `generateMissedAttendance` produces no
MISSED rows (there are no slots). The kiosk shows the bot message "Today is a rest day. Enjoy your
day off!" instead of a schedule/preview.

**Rationale:** Rest days are days off — no attendance is expected, so they must neither be clockable
nor penalized.

## Reasons for late are required and stored

**Status:** Decided (implemented 2026-08-02)

**Decision:** When the computed status is `LATE`, `remarks` is required (backend throws
`AttendanceException`; both kiosk and admin UIs show a "Reason for Late" textarea only when the
preview status is LATE). Remarks are persisted to `attendance_logs.remarks` and exposed in history,
details, and the public time-in response.

**Rationale:** Late records need an accountable explanation; ON_TIME records need no textarea.

## Normalize MySQL TIME to `H:i` at the API boundary

**Status:** Decided (implemented 2026-08-02)

**Context:** MySQL `TIME` columns round-trip as `HH:MM:SS`; the `<input type="time">` UI and
`date_format:H:i` validation expect `HH:MM`, causing edit-form save failures.

**Decision:** `AttendanceScheduleDayTimeResource` returns `substr($this->scheduled_time, 0, 5)`.

**Rationale:** Fixes the mismatch without touching the DB or comparisons that already handle seconds
(e.g. `substr(..., 0, 5)` matching in compliance).

## Pre-existing test failures are out of scope

**Status:** Known

Stock Laravel auth/settings tests fail on base (`NOT NULL constraint failed: users.role_id`) because
the `User` factory doesn't set `role_id`. This predates the attendance work and is unrelated.

## Frontend conventions

- Kiosk and admin UIs use the same `/attendance/preview` contract so LATE handling is consistent.
- The admin attendance-entry dialog debounces a preview call to detect status before saving.
