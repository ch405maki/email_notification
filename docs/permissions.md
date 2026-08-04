# Permissions

## Roles

`roles` table (`RoleSeeder`): slug is the machine key used in code.

| Slug | Name | Module checks |
| --- | --- | --- |
| `admin` | Admin | Bypasses module checks (`User::hasAllModules()` → true) |
| `user` | User | Must be granted each module explicitly |

## Modules

`modules` table (`ModuleSeeder`). Users are granted modules via the many-to-many `module_user` pivot.

Seeded slugs:

- `email`
- `id-application`
- `announcements`
- `gallery`
- `activity-logs`
- `redirect-links`
- `onload-banner`
- `subject-status`
- `bar-passers`
- `attendance`

## The `module:` middleware

`CanAccessModule` (`app/Http/Middleware/CanAccessModule.php`) is aliased as `module` in
`bootstrap/app.php` and used as `module:attendance` on routes.

Behavior:

```php
if (!$user || !$user->hasModule($slug)) {
    abort(403, 'You do not have access to this module.');
}
```

`User::hasModule($slug)`:
- returns `true` immediately when the user's role slug is `admin`;
- otherwise checks whether a `module_user` row links the user to the module with that slug.

## Where it applies

### Web (Inertia) routes — `routes/webRoutes/attendance.php`

`attendance/employees`, `attendance/schedules`, `attendance/employee-schedules`,
`attendance/logs`, `attendance/summary` are all behind
`['auth', 'verified', 'module:attendance']`.

Users / students / id-application / settings web routes use only `['auth', 'verified']` (no module guard).

### API routes — `routes/api.php`

`module:attendance` guards:
- `employees` resource (CRUD), `PUT /employees/{employee}/schedule`
- `attendance-schedules` resource
- `employee-schedules` resource, `GET /employee-schedules/export`
- `attendance-summary`, `attendance-compliance`
- `attendance` `{show, update, destroy}`

Unauthenticated (intentionally public for kiosk):
- `attendance` `{index, store}` (list + admin create)
- `attendance/public/lookup`, `attendance/public/time-in`, `attendance/preview`
- `employees/options`
- `attendance-dashboard`
- All student/email endpoints
- `users`, `roles`, `modules` (behind `auth:sanctum` only)

> Note: several attendance data endpoints are intentionally unauthenticated (public kiosk, dropdown
> options, dashboard). If stricter access is required, move them under a module guard — update this
> doc accordingly.

## Shared data on the frontend

`HandleInertiaRequests` exposes `auth.user.role.slug` and `auth.user.modules` (array of slugs).
Use these to conditionally render nav items / actions without re-hitting the API.

## Change checklist

When adding a guarded feature:
1. Add the module slug in `ModuleSeeder` (if new).
2. Apply `module:<slug>` to the web and/or API routes.
3. Grant the module to users in the users admin UI (or seed).
4. Document the guard here and in `api-specification.md`.
