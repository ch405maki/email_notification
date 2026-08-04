# AI Frontend Guide

Map of the React + Inertia + TypeScript frontend. Read `api-specification.md` for the JSON API the
pages call, and `permissions.md` for what a logged-in user can see.

## Stack

- React 19 + TypeScript + Inertia.js (Laravel).
- Vite (build), Tailwind CSS, shadcn-style components on Radix primitives.
- `axios` for JSON API calls; Inertia `<Link>`/`router` for page navigation.
- Wayfinder generates route/action helpers under `resources/js/actions` and `@/routes` — do not edit.

## Directory map

```
resources/js/
  app.tsx, ssr.tsx          entry points
  layouts/
    app-layout.tsx          authenticated shell (sidebar/header)
    auth-layout.tsx         auth pages shell
    public-layout.tsx       public kiosk shell
    app/                    app header/sidebar layout variants
    auth/                   auth card/simple/split variants
    settings/layout.tsx     settings nav
  pages/                    one directory per feature, index.tsx per page
    attendance/
      public/index.tsx          kiosk (search → preview → success)
      public/logs/index.tsx     public attendance logs
      public/summary/index.tsx  public summary
      employees/index.tsx       employee CRUD
      schedules/index.tsx       weekly template CRUD (7-day grid)
      employee-schedules/index.tsx  assignments
      logs/index.tsx            admin attendance logs + entry dialog
      summary/index.tsx         admin summary/compliance
    auth/, settings/, users/, students/, id-application/
  components/
    ui/                     shadcn-style primitives (Button, Dialog, Select, Switch, Textarea, ...)
    students/               email status + unsent tables
    users/                  userForm, userTable
    app-shell, app-sidebar, nav-*, breadcrumbs, ...
  hooks/                    use-debounced-value, use-appearance, use-initials, use-mobile
  types/                    shared types (index.d.ts: SharedData, User, NavItem, ...)
  actions/, routes/         Wayfinder-generated (do not edit)
```

## Pages & data flows

### Public kiosk — `attendance/public/index.tsx`
- Search by employee number / ID → `POST /attendance/public/lookup` (debounced, 800ms).
- Preview card shows bot bubble, next schedule, selected time-in, status badge.
- **LATE**: shows a "Reason for Late" textarea (only when status is LATE); `handleConfirm` blocks
  submit until remarks are filled and posts `remarks` to `/attendance/public/time-in`.
- Success view after time-in; reset clears remarks.
- `minutesEarly`/`to12Hour` tolerate `HH:MM:SS`.

### Admin attendance entry — `attendance/logs/index.tsx`
- "Record Attendance" dialog: employee, date, time-in.
- A debounced `POST /attendance/preview` call detects the status; when LATE, a "Reason for Late"
  textarea appears and `handleSave` requires remarks before posting to `/attendance`.
- Edit mode uses the log's existing status; remarks are prefilled and editable.

### Weekly templates — `attendance/schedules/index.tsx`
- 7-day grid; each day has a rest-day Switch and dynamic time slots.
- `normalizeDays()` fills missing days and defaults times to `08:00`.
- Create/Edit posts days as `{day_of_week, is_rest_day, times:[{scheduled_time, sequence}]}`;
  rest days send `times: []`.
- Weekly-plan summary in the table is capped at 50 chars.

### Assignments — `attendance/employee-schedules/index.tsx`
- Lists assignments with Active badge (open-ended `effective_to`).
- "Assign Schedule" dialog posts via `PUT /employees/{id}/schedule` (employee id from URL).
- "Export Excel" button downloads `GET /employee-schedules/export` as a blob (`.xlsx`) and triggers
  a browser save via a temporary object URL.

### Employees — `attendance/employees/index.tsx`
- Employee form includes a **Section** select (`Systems` / `Technical`); table shows a Section column.

## Conventions

- Pages use `AppLayout` (authenticated) or `PublicLayout` (kiosk), passing `breadcrumbs`.
- Always include `<Head title="...">`.
- Local `type` aliases per page; shared types go in `@/types`.
- UI feedback via `toast` (sonner); API errors read `error.response?.data?.message`.
- `catch (error: any)` is the accepted repo pattern.
- Loading/empty states use Table rows with `colSpan`; pagination uses `meta.current_page/last_page`.
- Day-of-week arrays: Mon…Sun, values `1,2,3,4,5,6,0`.

## Common tasks

**Add a conditional form field based on server state** (like the LATE remarks):
1. Fetch/preview the state (e.g. `POST /attendance/preview`) or read it from the page's data.
2. Render the field only when the state matches (e.g. `previewStatus === 'LATE'`).
3. Validate on submit before calling the API.
4. Send the value in the request payload.

**Add a page:**
1. Create `resources/js/pages/<feature>/index.tsx`.
2. Register an Inertia route in `routes/web.php` or `routes/webRoutes/*.php`.
3. If it needs `module:` guard, see `permissions.md` and the attendance web route group.

**Call a new API:** verify the route exists, run `npm run build` to regenerate Wayfinder helpers, and
use `axios` with `/api/v1/...`.

## Build & verification

```bash
npm run dev        # dev server
npm run build      # production build (required after route changes)
npm run types      # tsc --noEmit
npx eslint <file>  # lint a file
```
