# Business Rules

Domain rules for the attendance module (and related email feature). These are the source of truth;
implementation lives in `app/Services/AttendanceService.php`, `app/Services/AttendanceComplianceService.php`,
`app/Services/ScheduleAssignmentService.php`, and `app/Services/AttendanceScheduleService.php`.

## Day-of-week convention

- Uses PHP `Carbon::dayOfWeek`: `0 = Sunday` … `6 = Saturday`.
- Frontend `DAY_NAMES` (in `resources/js/pages/attendance/schedules/index.tsx`) lists Monday..Sunday
  with values `1,2,3,4,5,6,0` and maps back to the same integer convention.

## Weekly schedule templates

- `attendance_schedules` = a named weekly template.
- `attendance_schedule_days` = one row per day-of-week per schedule; `is_rest_day` flags a rest day.
- `attendance_schedule_day_times` = time slots for a working day, ordered by `sequence`.
- A rest day must have **no** time slots; the service skips slot creation for rest days.
- A schedule name is required and unique.
- A schedule may configure each `day_of_week` only once (unique per schedule + day).
- A day may not have duplicate `scheduled_time` slots (unique per day + time).

## Employee schedule assignment (effective dating)

- `employee_schedule_assignments` link an employee to a weekly template with an effective window:
  `effective_from` (required) and `effective_to` (nullable, open-ended when null).
- An employee has **at most one active assignment** at any point in time.
- Assigning a new schedule **closes** the previous open/overlapping window by setting
  `effective_to = new effective_from - 1 day`, inside a DB transaction.
- The active assignment for a date is the latest `effective_from` where
  `effective_from <= date` and (`effective_to IS NULL` or `effective_to >= date`).

## Attendance resolution (10-step flow)

`AttendanceService::createAttendance()` resolves, in order:

1. Load the employee.
2. `resolveEmployeeSchedule()` — find the active assignment for the date. Missing → error
   "No active schedule is assigned to this employee."
3. `resolveScheduleDay()` — resolve the day-of-week row of the assigned template.
4. `isRestDay()` — if the day is a rest day → error "Today is a rest day. No attendance is required."
5. `resolveScheduleTimes()` — the day's slots. Empty → error
   "No required attendance schedules are configured for today."
6. `resolveUpcomingSchedule()` — earliest **unused** slot (see below). None left → error
   "All required attendance schedules for this date have already been completed."
7. Compute `lateMinutes` = minutes by which `time_in` exceeds the slot time (0 when on/early).
8. `status` = `LATE` if `lateMinutes > 0`, else `ON_TIME`.
9. **Remarks rule**: if status is `LATE`, `remarks` is required — otherwise the service throws
   "A reason for being late is required." Remarks are saved to `attendance_logs.remarks`.
10. Persist the log and `markCompleted()` in `attendance_schedule_statuses`.

### "Earliest unused slot" resolution

- `resolveUpcomingSchedule()` picks the first slot (by `sequence`) whose `schedule_time_id` is not in
  today's used IDs **and** whose `scheduled_time` is not among used free-typed times.
- Used IDs come from `attendance_logs.schedule_time_id` for that employee+date.
- Used free-typed times come from logs where `schedule_time_id IS NULL`.

## Preview (public kiosk + admin)

- `previewAttendance()` / `previewAttendanceForEmployee()` run the same resolution but never persist.
- They return `employee`, `upcoming_schedule` (slot id + time), `attendance_preview`
  (status + late_minutes), and a `message`.
- Messages (non-blocking): "No active schedule is assigned to this employee.",
  "Today is a rest day. Enjoy your day off!", "All required attendance schedules for this date
  have already been completed."
- The kiosk UI hides the schedule/preview when `message` is present and instead shows the bot message.

## Compliance statuses

`attendance_schedule_statuses.status` is one of:

- `COMPLETED` — the employee clocked in for the slot (set by `markCompleted`).
- `MISSED` — the day has passed and no log exists for the slot (set by `generateMissedAttendance`).

### Missed generation

- Command `attendance:generate-missed` runs daily at `23:59` (`routes/console.php`), defaulting to
  yesterday. It is idempotent and scoped to a single date.
- For each active employee, for each scheduled slot on that date: if a matching log exists, it is
  marked COMPLETED; otherwise, if the day has passed and no MISSED row exists yet, a MISSED row is created.
- Rest days have no slots and therefore produce nothing.
- Missed is based on the schedule effective on that date (`getActiveScheduleTimes`).

## Late / missed metrics

Config in `config/attendance.php`:

- `late_minutes_threshold` (60), `late_count_threshold` (4), `missed_count_threshold` (1).
- Risk weights: `risk_minutes_weight` (40), `risk_count_weight` (30), `risk_missed_weight` (30).

Per employee (range-scoped):

- `late_count`, `late_minutes`, `missed_count`.
- Percentages of thresholds; `risk_score` = capped 100 weighted sum.
- `status`: `THRESHOLD REACHED` (≥100%), `WARNING` (≥70%), else `SAFE`.

## Date range presets (`resolveDateRange`)

- `current`/default → semi-monthly (1st–15th or 16th–end based on today).
- `first` → 1st..15th of month; `second` → 16th..end of month.
- `custom`, `today`, `week` (last 7 days), `month` (last 30 days).

## Email feature (secondary module)

- Students are imported via CSV/JSON; emails are sent per student via queued jobs
  (`SendStudentEmailJob`), with a `{student_number}` placeholder.
- `email_logs.status` ∈ `pending | sent | failed`.
- `sendBulk` targets students with no `sent` log; optional `sync` flag runs the job synchronously.
