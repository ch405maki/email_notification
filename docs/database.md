# Database

Schema is managed exclusively through migrations (`database/migrations`). Run `php artisan migrate`
after pulling; seed with `php artisan db:seed`.

## Conventions

- Time columns are MySQL `TIME`; note they round-trip as `HH:MM:SS` (see Technical Decisions for the
  `H:i` normalization).
- Date columns are `DATE`.
- All tables include `timestamps()` unless noted.
- Day-of-week: `0 = Sunday` … `6 = Saturday` (PHP `Carbon::dayOfWeek`).
- Foreign keys cascade on delete unless a `nullOnDelete` behavior is documented.

## Table reference

### users
Auth users (Fortify).
- `id`, `name`, `email` (unique), `password`, `role_id` (FK users), `status` (bool),
  two-factor columns, `email_verified_at`, `remember_token`, timestamps.
- Many-to-many with `modules` through `module_user`.
- `role_id` is NOT NULL — create users with a role (seeders provide admin/user).

### roles
- `id`, `name`, `slug` (unique). Seeded: `admin`, `user`.
- `User::hasAllModules()` returns true for slug `admin`.

### modules
- `id`, `name`, `slug` (unique). Seeded slugs include `email`, `id-application`,
  `announcements`, `gallery`, `activity-logs`, `redirect-links`, `onload-banner`,
  `subject-status`, `bar-passers`, `attendance`.

### module_user (pivot)
- `user_id` FK users (cascade), `module_id` FK modules (cascade), unique `(user_id, module_id)`.

### students
- `id`, `student_number` (unique), `email` (unique), timestamps.
- Has many `email_logs`.

### email_logs
- `id`, `student_id` FK students (nullOnDelete), `student_number`, `email`, `subject`,
  `status` (`pending|sent|failed`), `error_message` (nullable), `sent_at` (nullable), timestamps.
- Indexed for status/search queries.

### employees
- `id`, `employee_number` (unique), `id_number` (nullable, unique), `first_name`,
  `middle_name` (nullable), `last_name`, `section` (nullable, `Systems` | `Technical`),
  `status` (default `ACTIVE`), timestamps.
- `full_name` computed as `"Last, First M."`.
- Has many `schedule_assignments`, `attendance_logs`.

### attendance_schedules (weekly template)
- `id`, `name` (unique), timestamps.
- Has many `attendance_schedule_days`, `employee_schedule_assignments`.

### attendance_schedule_days
- `id`, `attendance_schedule_id` FK (cascade), `day_of_week` (tiny int 0–6),
  `is_rest_day` (bool, default false), timestamps.
- Unique `(attendance_schedule_id, day_of_week)`.
- Has many `attendance_schedule_day_times` (ordered by `sequence`).

### attendance_schedule_day_times
- `id`, `attendance_schedule_day_id` FK (cascade), `scheduled_time` (TIME), `sequence` (uint),
  timestamps.
- Unique `(attendance_schedule_day_id, scheduled_time)`.

### employee_schedule_assignments
- `id`, `employee_id` FK (cascade), `attendance_schedule_id` FK (cascade),
  `effective_from` (DATE), `effective_to` (DATE, nullable), timestamps.
- Indexed `(employee_id, effective_from)` and `(employee_id, effective_to)`.
- Invariant: at most one active (open-ended) assignment per employee.

### attendance_logs
- `id`, `employee_id` FK (cascade), `attendance_date` (DATE), `scheduled_time` (TIME),
  `time_in` (TIME), `status` (`ON_TIME|LATE`), `late_minutes` (int), `remarks` (text, nullable),
  `created_by` FK users, `updated_by` FK users (nullable), timestamps.
- `schedule_time_id` FK → `attendance_schedule_day_times` (nullOnDelete).
- Unique `(employee_id, attendance_date)`.
- **Note:** the unique pair is per date; multiple slots per day are distinguished by
  `schedule_time_id`, and the unique constraint predates multi-slot support — see
  `getUsedScheduleTimeIds`/`getUsedScheduleTimes` for the used-slot logic.

### attendance_schedule_statuses
- `id`, `employee_id` FK (cascade), `attendance_date` (DATE),
  `schedule_time_id` FK → `attendance_schedule_day_times` (nullable, nullOnDelete),
  `scheduled_time` (TIME), `status` (`COMPLETED|MISSED`),
  `attendance_log_id` FK → `attendance_logs` (nullable, nullOnDelete), timestamps.
- Indexed `attendance_date`, `status`; unique
  `(employee_id, attendance_date, schedule_time_id)`.

## Key migration order

1. `0001_01_01_*` — framework (users, cache, jobs).
2. `2025_08_26` / `2025_12_13` — two-factor + Sanctum tokens.
3. `2026_05_15_*` — students, email_logs (+ indexes).
4. `2026_06_16_*` — users status, modules, module_user, employees, schedules, assignments, logs,
   schedule_times.
5. `2026_07_31_*` — nullable created_by; attendance_schedule_statuses.
6. `2026_08_02_*` — attendance_schedules tables, rebuilt assignments, repointed FKs.
7. `2026_08_04_000001` — employees `section` column (nullable).

## Seeds

- `RoleSeeder` — Admin / User.
- `ModuleSeeder` — the module slugs listed above (idempotent `firstOrCreate`).
- `UserSeeder` — `admin@mail.com` and `user@mail.com` (password `password`).
- `DatabaseSeeder` orchestrates them.

No attendance fixture seeder exists yet; tests create their own fixtures.
