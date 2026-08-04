# PROJECT_CONTEXT.md

Central context for the Laravel 12 + React (Inertia) application. Read this first, then consult the
module-specific documents under `docs/` when working in a given area.

## Project overview

An internal attendance + email-notification system. Employees clock in through a public kiosk,
schedules are managed as reusable weekly templates assigned to employees, and attendance is
automatically scored for compliance (late / missed / risk). The same codebase also powers student
email notifications, ID-application management, user & role administration, and module access
control.

## Documentation map

The project maintains the following documents under `docs/`. Keep them synchronized with the codebase.

| Document | Purpose |
| --- | --- |
| `docs/business-rules.md` | Domain rules: attendance resolution, rest days, late/missed logic, compliance thresholds. |
| `docs/api-specification.md` | HTTP API endpoints, request/response shapes, auth & module middleware. |
| `docs/technical-decisions.md` | Architectural decisions (weekly templates, effective-dating, repointed FKs, etc.) and rationale. |
| `docs/database.md` | Table-by-table schema, relationships, indexes, conventions. |
| `docs/permissions.md` | Roles, modules, and the `module:` middleware guard. |
| `docs/ai-handbook.md` | AI-agent conventions: style, testing, verification commands. |
| `docs/ai-backend.md` | Backend structure: services, controllers, requests, resources, resolution flow. |
| `docs/ai-frontend.md` | Frontend structure: pages, layouts, actions, component conventions. |

## Tech stack

| Layer | Technology |
| --- | --- |
| Language | PHP ^8.2 |
| Framework | Laravel ^12.0 |
| Frontend | React 19 + Inertia.js ^2.0 + TypeScript + Vite |
| Auth / API | Laravel Fortify (web), Laravel Sanctum (API tokens / stateful) |
| UI kit | shadcn-style components under `resources/js/components/ui` (Radix primitives) |
| Styling | Tailwind CSS |
| Tooling | Pint (PHP), ESLint + Prettier + tsc (frontend), PHPUnit, Wayfinder route types |

## Commands

```bash
# Install / setup
composer install
npm install
cp .env.example .env && php artisan key:generate
php artisan migrate --force
php artisan db:seed

# Run locally
composer run dev            # server + queue + vite (see composer.json "dev")
# or individually:
php artisan serve
npm run dev

# Build frontend (must run after changing routes/wayfinder actions)
npm run build

# Quality checks
php artisan test --filter=AttendanceComplianceTest
php artisan test
npm run build
npx eslint <file>          # or: npm run lint
npm run types              # tsc --noEmit
vendor/bin/pint
```

## Runtime tasks

| Command | Schedule | Purpose |
| --- | --- | --- |
| `attendance:generate-missed` | daily `23:59` (`routes/console.php`) | Generate MISSED statuses for yesterday's incomplete schedule slots. |
| `process-pending-emails` | — | Queue worker processes pending student emails (`app/Jobs/SendStudentEmailJob.php`). |

## Key directories

```
app/
  Console/Commands/       artisan commands (GenerateMissedAttendance, ProcessPendingEmails)
  Exceptions/             AttendanceException (renders 422 JSON)
  Http/
    Controllers/Api/v1/   JSON API controllers
    Controllers/Settings/ Fortify account/settings controllers
    Middleware/           CanAccessModule (module: guard), HandleInertiaRequests
    Requests/Attendance/  FormRequests for attendance, schedules, assignments
    Requests/Settings/    Profile / 2FA requests
    Resources/            API resources (AttendanceLogResource, schedule resources, ...)
  Jobs/                   SendStudentEmailJob
  Mail/                   DynamicMail, StudentOnboardingMail
  Models/                 Eloquent models
  Providers/              AppServiceProvider, FortifyServiceProvider
  Services/               Business logic (AttendanceService, AttendanceComplianceService, ...)

resources/js/
  pages/                  Inertia pages grouped by feature
  layouts/                app-layout, auth-layout, public-layout
  components/ui/          shadcn-style UI components
  actions/                Wayfinder-generated route helpers (do not edit)
  types/                  Shared TypeScript types

database/
  migrations/             Versioned schema
  seeders/                ModuleSeeder, RoleSeeder, UserSeeder, DatabaseSeeder

routes/
  web.php + webRoutes/    Inertia page routes
  api.php                 JSON API routes (v1)
  console.php             Scheduled commands
```

## Primary domain: attendance

Current schema (authoritative):

- `attendance_schedules` — weekly template (name).
- `attendance_schedule_days` — one row per day-of-week per schedule (`is_rest_day` flag).
- `attendance_schedule_day_times` — time slots per day, ordered by `sequence`.
- `employee_schedule_assignments` — effective-dated assignment of a template to an employee
  (`effective_from`, nullable `effective_to`; one active per employee).
- `attendance_logs` — actual clock-ins; `schedule_time_id` FK → `attendance_schedule_day_times`.
- `attendance_schedule_statuses` — per-slot status rows (COMPLETED / MISSED);
  `schedule_time_id` FK → `attendance_schedule_day_times`.

Business rules and resolution flow are detailed in `docs/business-rules.md` and
`docs/ai-backend.md`. Day-of-week uses PHP `Carbon::dayOfWeek` (0 = Sunday … 6 = Saturday).

## Legacy (unrouted, do not extend)

The old flat schedule model (`schedules`, `schedule_times`) and its dead code
(`ScheduleService.php`, `ScheduleController.php`, `ScheduleResource.php`, `ScheduleTimeResource.php`)
remain in the repository but are **not** routed and are not used by the attendance engine.

## Auth, roles & modules

- Users belong to a `Role` (admin / user) and may be granted `Module`s (many-to-many).
- `admin` role bypasses module checks (`User::hasAllModules()`).
- The `module:slug` middleware (`CanAccessModule`) guards attendance and other module routes.
- `HandleInertiaRequests` exposes `auth.user.role.slug` and `auth.user.modules` to the frontend.

See `docs/permissions.md` for the full matrix.

## Testing notes

- `tests/Feature/AttendanceComplianceTest.php` is the green suite covering the attendance engine
  (14 tests / 30 assertions as of the last full run).
- Stock Laravel auth/settings tests fail on this codebase because the `User` factory does not set
  the required `role_id`; these failures are pre-existing and unrelated to the attendance feature.
- `AttendanceComplianceTest` uses `Carbon::setTestNow()` and a Friday `2026-07-31` fixture schedule
  with two slots (08:00, 13:00) plus an effective assignment.
