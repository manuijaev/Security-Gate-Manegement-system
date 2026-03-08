# Security Gate Management

Role-based security gate dashboard with React + MUI frontend and Node/Express + PostgreSQL backend.

## User roles
- Admin
  - Login
  - View analytics
  - Manage guards (icon CRUD)
  - Manage departments (icon CRUD)
  - View and manage movement logs (mark exit/delete with icons)
- Guard
  - Login
  - Sidebar-based guard workspace
  - Dashboard with quick stats, quick actions, activity feed, notifications
  - Dedicated pages: visitor registration, visitor exit, vehicle entry/exit, deliveries, yard exit, repossessed, search, reports
  - Profile menu (my profile, change password, logout)
  - Session timeout on inactivity

## Setup
1. Copy environment file:
```bash
cp .env.example .env
```
2. Ensure PostgreSQL is running and database exists:
```bash
sudo -u postgres createdb security_gate_management
```
3. Install dependencies:
```bash
npm install
```

## Run
- Backend:
```bash
npm run server
```
- Frontend:
```bash
npm run dev
```
- Both:
```bash
npm run dev:all
```

## Login defaults
- Username: `admin`
- Password: `admin123`

Change `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` for production.
