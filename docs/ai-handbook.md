# AI Handbook

Operating conventions for AI agents (and humans) working in this repository. Keep docs synchronized
with code: update the relevant `docs/*.md` when you change behavior.

## Getting oriented

1. Read `docs/PROJECT_CONTEXT.md` first.
2. Read the module-specific doc for the area you touch (`ai-backend.md`, `ai-frontend.md`,
   `business-rules.md`, `api-specification.md`, `database.md`, `permissions.md`).
3. Prefer reading nearby files over assuming — verify libraries/conventions exist before using them.

## Command reference

```bash
# Backend tests (attendance engine)
php artisan test --filter=AttendanceComplianceTest

# Full suite (note: stock auth/settings tests fail on base — see PROJECT_CONTEXT.md)
php artisan test

# Frontend
npm run build        # required after editing routes (regenerates Wayfinder actions)
npm run types        # tsc --noEmit
npm run lint         # eslint --fix (whole repo)
npx eslint <file>    # lint one file

# Formatting
vendor/bin/pint      # PHP
npm run format       # prettier --write resources/
npm run format:check

# Migrations
php artisan migrate --force
php artisan db:seed
```

## When you finish a change

- Run the relevant tests (`--filter=` to stay fast) and `npm run build`.
- Run `npm run types` and eslint on the files you touched; do not introduce new type errors.
- Update docs if behavior changed: business rules → `business-rules.md`; endpoints →
  `api-specification.md`; schema → `database.md`; architecture → `technical-decisions.md`;
  guards → `permissions.md`.
- Do not fix the pre-existing failures in stock auth/settings tests unless explicitly asked.

## Code conventions

### Backend (PHP / Laravel)

- Controllers stay thin; business logic goes in `app/Services/*`.
- Use FormRequests for validation; `after` callbacks for cross-field rules.
- Use API Resources for JSON output.
- Day-of-week: `Carbon::dayOfWeek` (0=Sun … 6=Sat). Frontend uses matching integers.
- Time handling: accept `H:i`; remember MySQL `TIME` returns `HH:MM:SS` — normalize at the API
  boundary when the frontend needs `H:i`.
- Wrap multi-write operations (e.g. assignment window closing, template replace) in
  `DB::transaction(...)`.
- Throw `App\Exceptions\AttendanceException` for expected 422 business errors in attendance flows.
- Follow existing naming: `resolveX`, `getActiveX`, `createX`/`updateX`.
- No inline comments unless the logic is genuinely non-obvious.

### Frontend (React / TypeScript)

- Pages live under `resources/js/pages/<feature>/index.tsx`; grouped by feature.
- Use `axios` for JSON API calls to `/api/v1/...`; use Inertia `<Link>`/`router` for page navigation.
- Prefer existing `@/components/ui/*` components (Button, Dialog, Select, Switch, Textarea, ...)
  over building new ones.
- Use `toast` (sonner) for feedback.
- Types are declared inline in each page (local `type` aliases) unless shared via `@/types`.
- The repo accepts `catch (error: any)` — match existing style.
- Day-of-week display arrays are ordered Mon…Sun with values `1,2,3,4,5,6,0`.
- After changing `routes/api.php`, run `npm run build` so Wayfinder regenerates `@/actions/*` helpers.

## Testing conventions

- New backend behavior gets a PHPUnit feature test in `tests/Feature/AttendanceComplianceTest.php`
  (or a new `tests/Feature/*Test.php`).
- Tests use `RefreshDatabase` and `Carbon::setTestNow()`; fixtures are built in `setUp()`.
- When adding a required-field rule, assert both the success and failure paths.
- Use `Sanctum::actingAs()` with an admin role user for routes behind `auth:sanctum`/`module:`.

## Rules of thumb

- Minimize output; be direct; don't add emojis unless asked.
- Never commit unless explicitly requested.
- Never guess URLs; only use provided/confirmed URLs.
- When a request is ambiguous, ask a targeted question rather than guessing a large change.
