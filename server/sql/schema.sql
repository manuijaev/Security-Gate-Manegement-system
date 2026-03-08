CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guard', 'supervisor')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT;
UPDATE users SET status = 'active' WHERE status IS NULL;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'guard', 'supervisor'));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled'));

CREATE TABLE IF NOT EXISTS departments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_members (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, full_name)
);

CREATE TABLE IF NOT EXISTS visitors (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  phone_number TEXT,
  id_number TEXT,
  person_to_see TEXT,
  department TEXT,
  vehicle_registration TEXT,
  time_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vehicle_entries (
  id BIGSERIAL PRIMARY KEY,
  vehicle_registration TEXT NOT NULL,
  driver_name TEXT,
  vehicle_type TEXT,
  purpose TEXT,
  destination TEXT,
  time_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS deliveries (
  id BIGSERIAL PRIMARY KEY,
  delivery_company TEXT NOT NULL,
  driver_name TEXT,
  vehicle_model TEXT,
  vehicle_registration TEXT,
  notes TEXT,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yard_exits (
  id BIGSERIAL PRIMARY KEY,
  vehicle_registration TEXT NOT NULL,
  person_taking_vehicle TEXT,
  reason_for_removal TEXT,
  supervisor_approval TEXT,
  exit_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repossessed_vehicles (
  id BIGSERIAL PRIMARY KEY,
  vehicle_registration TEXT NOT NULL,
  recovery_company TEXT,
  person_delivering_vehicle TEXT,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
