# Security Gate Management System

A single-repository solution for monitoring and managing perimeter traffic at a warehouse or secure campus. The React + Vite frontend drives role-aware dashboards and workflows, while the Express + PostgreSQL backend exposes authenticated APIs for visitors, vehicles, deliveries, yard exits, repossessed cars, guards, departments, and analytics. The system ships with JWT auth, session timeout protection, exportable reports, and export-ready data for secondary systems.

## What this system does

- **Multi-role access control** – Admins, supervisors, and guards log in through the same portal and only see the data and actions their role is entitled to. Guard access is confined to operational workflows, supervisors gain approval/reporting controls, and admins manage staff, departments, and audit logs.
- **Live operations dashboard** – Every role sees a summary tile layout with visitor counts, vehicle entries, deliveries, and yard exits for the selected date. Guards additionally see alerts about visitors who have overstayed eight hours and vehicles currently inside the yard.
- **Visitor, vehicle, and delivery intake** – Guard-facing forms capture visitor info, ID numbers, vehicle details (including manufacturer, color, driver, type, purpose), delivery company data, and reasons for yard exits or repossessions.
- **Movement history & exports** – The movements table stitches together visitors, vehicle entries, deliveries, yard exits, and repossessed vehicles. It supports server-side search, filtering by type or destination, and export to CSV, Excel, or PDF. Movement rows can be marked as exited or deleted (admin only).
- **Staff and department management** – Admins can create/soft-manage guards and supervisors, manage department records, and assign staff members to departments via dedicated dialogs. Guard and supervisor lifecycles are tracked through the `users` table with `status`, `role`, and creation timestamps.
- **Analytics & reporting** – Supervisors and admins can hit `/api/admin/analytics` for daily tallies, generate PDF/Excel reports from the UI, and download filtered CSVs for offline review.
- **Notifications & safety checks** – Guard dashboards poll `/api/guard/notifications` to highlight overdue visitors and vehicles currently inside, keeping the control room aware of operational risks.
- **Export-ready data** – `ExcelJS`, `jspdf`, and `jsPDF-AutoTable` back the built-in export tooling, producing spreadsheets and documents with the same column structure as the movement table.

## Architecture

| Layer | Description |
| --- | --- |
| **Frontend** | `src/App.jsx` builds the single-page Material UI experience, managing navigation drawers, dialogs, autocomplete fields, and data exports. It uses `dayjs`, `@mui/x-date-pickers`, `ExcelJS`, `jsPDF`, and `jspdf-autotable` to keep forms responsive, filterable, and export-friendly. API helpers live in `src/lib/api.js`. |
| **Static assets** | `public/` holds favicons, logos, and other static files that Vite copies to the production `dist/` bundle. `index.html` bootstraps the root application. |
| **Backend** | `server/index.js` wires Express routes, CORS, JSON parsing, and role-based middleware (`authRequired`, `adminRequired`, `supervisorOrAdminRequired`). It depends on `server/db.js` for PostgreSQL connection pooling and auto-runs `server/sql/schema.sql`. |
| **Database** | PostgreSQL tables mirror the business domains: `users`, `departments`, `staff_members`, `visitors`, `vehicle_entries`, `deliveries`, `yard_exits`, and `repossessed_vehicles`. Constraints enforce valid roles/statuses and unique keys. |

## Key APIs

### Authentication & session

- `POST /api/auth/login` – accepts `username` and `password`, returns JWT token + user metadata.
- `GET /api/auth/me` – returns current user based on `Bearer` token.
- `POST /api/auth/logout` – invalidates the current session (204).
- `POST /api/auth/change-password` – updates the password after validating the current password.

### Dashboard & insights

- `GET /api/health` – sanity check for Express + Postgres connectivity.
- `GET /api/dashboard/summary` – feeds the top tiles with counts per date.
- `GET /api/admin/analytics` – returns visitors, vehicle entries, deliveries, yard exits, repossessed vehicles, and guard headcount for a given date.

### Movements, visitors, and vehicles

- `GET /api/movements` – paginated movements timeline with search and filters.
- `POST /api/visitors` – log new visitors and optional vehicle/ID details.
- `POST /api/vehicle-entries` – capture vehicle metadata, purpose, and destination.
- `POST /api/deliveries` – record delivery companies, driver, and vehicle info.
- `POST /api/yard-exits` – register yard exits with supervisor approvals and reasons.
- `POST /api/repossessed-vehicles` – log recovered vehicles and delivery teams.
- `POST /api/movements/:entity/:id/exit` – mark a visitor or vehicle entry as exited.
- `DELETE /api/admin/movements/:entity/:id` – admin-only purge for audit cleanup.
- `GET /api/guard/notifications` – guard-specific alerts about overdue visitors or vehicles inside.

### Administration

- Guards & supervisors: `GET/POST/PATCH/DELETE /api/admin/guards`.
- Departments: `GET/POST/PATCH/DELETE /api/admin/departments`.
- Staff members: `GET/POST/PATCH/DELETE /api/admin/staff`.

## Getting started

### Prerequisites

1. **Node.js 18+** – ships with npm.
2. **PostgreSQL 14+** – accessible at `PGHOST:PGPORT` with a user that can create databases.

### Environment variables

Copy an example before running.

```bash
cp .env.example .env
```

Then configure:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend server port (default `4000`). |
| `CORS_ORIGIN` | Frontend origin (default `http://localhost:5173`). |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | PostgreSQL connection. |
| `AUTH_SECRET` | Override JWT signing secret (defaults to `dev-secret-change-me`). |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` | Default admin seed account inserted if missing. |

There are also `.env.production.example` values tailored for cloud deployment.

### Bootstrap the database

```bash
createdb security_gate_management
psql -h 127.0.0.1 -U postgres -d security_gate_management -f server/sql/schema.sql
```

`server/index.js` reruns the schema on every start and uses `ON CONFLICT`/`ALTER TABLE` commands to stay idempotent in production.

### Install dependencies & run

```bash
npm install
npm run dev         # frontend (Vite) on port 5173
npm run server      # backend API watcher on port 4000
npm run dev:all     # run both frontend + server side-by-side via concurrently
npm run build       # produce a production-ready dist/ directory
npm run preview     # serve the built frontend bundle locally
```

The frontend talks to `/api` relative to the current origin. When deploying (Vercel/Render), point `VITE_API_BASE_URL` to the production API or rely on the backend serving `dist/` when `NODE_ENV === 'production'`.

## Frontend workflow highlights

- **Guard drawer** – Quick actions for visitor entry, vehicle entry, deliveries, yard exits, and repossessed vehicles.
- **Activity feed** – Latest movements sorted by clock-in, showing user-friendly statuses (Inside, Exited, Approved, Completed).
- **Reports** – Export CSV files via `exportRowsAsCsv` helper and Excel documents via `ExcelJS`. PDF exports use `jsPDF` + `autoTable` so supervisors can print or archive a snapshot.
- **Notifications** – Overdue visitors (longer than eight hours) and active vehicles trigger badges and snackbars.
- **Session management** – Tokens stored in `localStorage` under `sgm_token`, refreshed on login, invalidated on logout, and automatically logged out after 30 minutes of idle time.
- **Appearance** – Theme toggle swaps between light/dark Material UI palettes in `App.jsx`.

## Deployment & hosting

- Build artifacts live under `dist/`, so the backend can serve the SPA on any platform that supports Node.
- Refer to `DEPLOYMENT_GUIDE.md`, `DEPLOY_RENDER.md`, `DEPLOY_RAILWAY_VERCEL.md`, and `DEPLOY_VERCEL.md` for platform-specific instructions.

## Database model summary

- `users` – Roles restricted to `admin`, `guard`, `supervisor`. Hard-delete guarded for audit, status toggles between `active`/`disabled`. JWT payload contains `sub`, `role`, `username`, `fullName`, and `exp`.
- `departments` + `staff_members` – Departments are seeded (`Finance`, `Warehouse`, `Loading Bay`, `Security`, `Operations`) on startup. Staff members link to departments with a unique `(department_id, full_name)` constraint.
- `visitors`, `vehicle_entries`, `deliveries`, `yard_exits`, `repossessed_vehicles` – Track every arrival, exit, delivery, yard removal, and repossession with timestamps normalized to `Africa/Nairobi` for reporting.

## Security notes

- JWT tokens signed with `AUTH_SECRET`; sessions expire after 12 hours and a hard timeout of 30 minutes is enforced client-side for inactivity.
- Sensitive write/delete APIs are gated by `authRequired`, `adminRequired`, or `supervisorOrAdminRequired` middleware.
- Passwords are stored in plaintext for this prototype; replace with a hashing layer (bcrypt/PBKDF2/Argon2) before production use.

## Troubleshooting

- If the frontend cannot load data, confirm the backend is running on `PORT` and the frontend respects `VITE_API_BASE_URL` (defaults to `/api`).
- Database schema changes run automatically on launch, but run the SQL file manually if migrations fail.
- Use the `/api/health` endpoint to verify Postgres connectivity.

## Next steps

1. Hash passwords and add refresh tokens for better security.
2. Add pagination or cursor-based loading to `/api/movements` once rows exceed 200.
3. Add audit logging on deletes (e.g., write to an `activity_logs` table).

---

Still have questions? Drop them here and I can guide you through the app, deployment, or API usage.
