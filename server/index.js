import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, runSchema } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;
const tokenSecret = process.env.AUTH_SECRET || 'dev-secret-change-me';

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

function asDateOnly(value) {
  if (value) return value;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function toMovement(row) {
  return {
    id: row.log_id,
    recordId: row.record_id,
    entity: row.entity,
    type: row.type,
    subject: row.subject,
    destination: row.destination,
    status: row.status,
    timeIn: row.time_in,
    timeOut: row.time_out,
    idNumber: row.id_number,
    vehicleRegistration: row.vehicle_registration,
    notes: row.notes,
    phoneNumber: row.phone_number,
    personToSee: row.person_to_see
  };
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', tokenSecret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', tokenSecret)
    .update(`${header}.${body}`)
    .digest('base64url');

  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = payload;
  return next();
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

function supervisorOrAdminRequired(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Supervisor or admin access required' });
  }
  return next();
}

async function ensureDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator';

  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rowCount) return;

  await pool.query(
    'INSERT INTO users (full_name, username, password, role, status) VALUES ($1,$2,$3,$4,$5)',
    [fullName, username, password, 'admin', 'active']
  );
}

async function ensureDefaultDepartments() {
  const defaults = ['Finance', 'Warehouse', 'Loading Bay', 'Security', 'Operations'];
  for (const name of defaults) {
    // Keep startup idempotent for existing deployments.
    await pool.query('INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  }
}

app.get('/api/health', async (_, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, full_name, username, role, password, status FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (!result.rowCount || result.rows[0].password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (result.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const user = result.rows[0];
    const payload = {
      sub: user.id,
      role: user.role,
      username: user.username,
      fullName: user.full_name,
      exp: Date.now() + 1000 * 60 * 60 * 12
    };

    return res.json({ token: signToken(payload), user: payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', authRequired, (_, res) => {
  res.status(204).send();
});

app.post('/api/auth/change-password', authRequired, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }

  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.sub]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (result.rows[0].password !== current_password) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [new_password, req.user.sub]);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/summary', authRequired, async (req, res) => {
  const date = asDateOnly(req.query.date);
  try {
    const visitors = await pool.query(
      "SELECT COUNT(*)::int AS count FROM visitors WHERE DATE(time_in AT TIME ZONE 'Africa/Nairobi') = $1",
      [date]
    );
    const vehicles = await pool.query(
      "SELECT COUNT(*)::int AS count FROM vehicle_entries WHERE DATE(time_in AT TIME ZONE 'Africa/Nairobi') = $1",
      [date]
    );
    const deliveries = await pool.query(
      "SELECT COUNT(*)::int AS count FROM deliveries WHERE DATE(entry_time AT TIME ZONE 'Africa/Nairobi') = $1",
      [date]
    );
    const yardExits = await pool.query(
      "SELECT COUNT(*)::int AS count FROM yard_exits WHERE DATE(exit_time AT TIME ZONE 'Africa/Nairobi') = $1",
      [date]
    );

    res.json({
      visitorsToday: visitors.rows[0].count,
      vehiclesLogged: vehicles.rows[0].count,
      deliveries: deliveries.rows[0].count,
      yardExits: yardExits.rows[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/movements', authRequired, async (req, res) => {
  const { search = '', type = 'All Types', department = 'All Departments', date } = req.query;
  const safeDate = asDateOnly(date);

  const values = [safeDate, `%${search.toLowerCase()}%`];
  let typeClause = '';
  if (type !== 'All Types') {
    values.push(type);
    typeClause = ` AND type = $${values.length}`;
  }

  let departmentClause = '';
  if (department !== 'All Departments') {
    values.push(department);
    departmentClause = ` AND destination = $${values.length}`;
  }

  const query = `
    WITH combined AS (
      SELECT
        'VST-' || id::text AS log_id,
        id AS record_id,
        'visitors' AS entity,
        'Visitor' AS type,
        first_name || ' ' || surname AS subject,
        COALESCE(department, '-') AS destination,
        CASE WHEN time_out IS NULL THEN 'Inside' ELSE 'Exited' END AS status,
        time_in,
        time_out,
        id_number,
        vehicle_registration,
        NULL::text AS notes,
        phone_number,
        person_to_see
      FROM visitors
      WHERE DATE(time_in AT TIME ZONE 'Africa/Nairobi') = $1

      UNION ALL

      SELECT
        'VEH-' || id::text,
        id,
        'vehicle_entries',
        'Vehicle Entry',
        vehicle_registration,
        COALESCE(destination, purpose, '-'),
        CASE WHEN time_out IS NULL THEN 'Inside' ELSE 'Exited' END,
        time_in,
        time_out,
        NULL::text AS id_number,
        vehicle_registration,
        purpose AS notes,
        NULL::text AS phone_number,
        NULL::text AS person_to_see
      FROM vehicle_entries
      WHERE DATE(time_in AT TIME ZONE 'Africa/Nairobi') = $1

      UNION ALL

      SELECT
        'DLV-' || id::text,
        id,
        'deliveries',
        'Delivery',
        delivery_company,
        'Warehouse',
        'Completed',
        entry_time,
        entry_time,
        NULL::text AS id_number,
        vehicle_registration,
        notes,
        NULL::text AS phone_number,
        NULL::text AS person_to_see
      FROM deliveries
      WHERE DATE(entry_time AT TIME ZONE 'Africa/Nairobi') = $1

      UNION ALL

      SELECT
        'YEX-' || id::text,
        id,
        'yard_exits',
        'Yard Exit',
        vehicle_registration,
        'External Service',
        'Approved',
        exit_time,
        exit_time,
        NULL::text AS id_number,
        vehicle_registration,
        reason_for_removal AS notes,
        NULL::text AS phone_number,
        NULL::text AS person_to_see
      FROM yard_exits
      WHERE DATE(exit_time AT TIME ZONE 'Africa/Nairobi') = $1

      UNION ALL

      SELECT
        'REP-' || id::text,
        id,
        'repossessed_vehicles',
        'Repossessed Vehicle',
        vehicle_registration,
        'Yard',
        'Recorded',
        recorded_at,
        recorded_at,
        NULL::text AS id_number,
        vehicle_registration,
        notes,
        NULL::text AS phone_number,
        NULL::text AS person_to_see
      FROM repossessed_vehicles
      WHERE DATE(recorded_at AT TIME ZONE 'Africa/Nairobi') = $1
    )
    SELECT *
    FROM combined
    WHERE (
      LOWER(log_id) LIKE $2 OR
      LOWER(subject) LIKE $2 OR
      LOWER(destination) LIKE $2
    )
    ${typeClause}
    ${departmentClause}
    ORDER BY time_in DESC
    LIMIT 200
  `;

  try {
    const result = await pool.query(query, values);
    res.json(result.rows.map(toMovement));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/departments', authRequired, async (_, res) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM departments ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/staff', authRequired, async (req, res) => {
  const { department = '', search = '' } = req.query;
  const values = [`%${String(search).toLowerCase()}%`];
  let departmentClause = '';

  if (department) {
    values.push(department);
    departmentClause = ` AND (d.name = $${values.length} OR s.department_id::text = $${values.length})`;
  }

  try {
    const result = await pool.query(
      `SELECT
         s.id,
         s.full_name,
         s.department_id,
         d.name AS department_name,
         s.title,
         s.created_at
       FROM staff_members s
       JOIN departments d ON d.id = s.department_id
       WHERE LOWER(s.full_name) LIKE $1
       ${departmentClause}
       ORDER BY s.full_name ASC
       LIMIT 200`,
      values
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/guard/notifications', authRequired, async (_, res) => {
  try {
    const overdueVisitors = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM visitors
       WHERE time_out IS NULL AND NOW() - time_in > INTERVAL '8 hours'`
    );
    const vehiclesInside = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM vehicle_entries
       WHERE time_out IS NULL`
    );

    const alerts = [];
    if (overdueVisitors.rows[0].count > 0) {
      alerts.push({
        id: 'overdue_visitors',
        level: 'warning',
        message: `${overdueVisitors.rows[0].count} visitor(s) have been inside longer than 8 hours`
      });
    }
    if (vehiclesInside.rows[0].count > 0) {
      alerts.push({
        id: 'vehicles_inside',
        level: 'info',
        message: `${vehiclesInside.rows[0].count} vehicle(s) are currently inside`
      });
    }

    return res.json(alerts);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/visitors', authRequired, async (req, res) => {
  const {
    first_name,
    surname,
    phone_number,
    id_number,
    person_to_see,
    department,
    vehicle_registration,
    time_in
  } = req.body;

  if (!first_name || !surname) {
    return res.status(400).json({ error: 'first_name and surname are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO visitors
       (first_name, surname, phone_number, id_number, person_to_see, department, vehicle_registration, time_in)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, NOW()))
       RETURNING *`,
      [
        first_name,
        surname,
        phone_number || null,
        id_number || null,
        person_to_see || null,
        department || null,
        vehicle_registration || null,
        time_in || null
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/vehicle-entries', authRequired, async (req, res) => {
  const { vehicle_registration, driver_name, vehicle_type, purpose, destination, time_in } = req.body;
  if (!vehicle_registration) {
    return res.status(400).json({ error: 'vehicle_registration is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vehicle_entries
       (vehicle_registration, driver_name, vehicle_type, purpose, destination, time_in)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, NOW()))
       RETURNING *`,
      [
        vehicle_registration,
        driver_name || null,
        vehicle_type || null,
        purpose || null,
        destination || null,
        time_in || null
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/deliveries', authRequired, async (req, res) => {
  const { delivery_company, driver_name, vehicle_model, vehicle_registration, notes, entry_time } = req.body;
  if (!delivery_company) {
    return res.status(400).json({ error: 'delivery_company is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO deliveries
       (delivery_company, driver_name, vehicle_model, vehicle_registration, notes, entry_time)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, NOW()))
       RETURNING *`,
      [
        delivery_company,
        driver_name || null,
        vehicle_model || null,
        vehicle_registration || null,
        notes || null,
        entry_time || null
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/yard-exits', authRequired, async (req, res) => {
  const { vehicle_registration, person_taking_vehicle, reason_for_removal, supervisor_approval, exit_time } = req.body;
  if (!vehicle_registration) {
    return res.status(400).json({ error: 'vehicle_registration is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO yard_exits
       (vehicle_registration, person_taking_vehicle, reason_for_removal, supervisor_approval, exit_time)
       VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz, NOW()))
       RETURNING *`,
      [
        vehicle_registration,
        person_taking_vehicle || null,
        reason_for_removal || null,
        supervisor_approval || null,
        exit_time || null
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/repossessed-vehicles', authRequired, async (req, res) => {
  const { vehicle_registration, recovery_company, person_delivering_vehicle, notes, recorded_at } = req.body;
  if (!vehicle_registration) {
    return res.status(400).json({ error: 'vehicle_registration is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO repossessed_vehicles
       (vehicle_registration, recovery_company, person_delivering_vehicle, notes, recorded_at)
       VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz, NOW()))
       RETURNING *`,
      [
        vehicle_registration,
        recovery_company || null,
        person_delivering_vehicle || null,
        notes || null,
        recorded_at || null
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/movements/:entity/:id/exit', authRequired, async (req, res) => {
  const { entity, id } = req.params;
  const allowedTables = {
    visitors: 'visitors',
    vehicle_entries: 'vehicle_entries'
  };

  const table = allowedTables[entity];
  if (!table) {
    return res.status(400).json({ error: 'Unsupported entity for exit action' });
  }

  try {
    const result = await pool.query(
      `UPDATE ${table}
       SET time_out = COALESCE(time_out, NOW())
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Record not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/movements/:entity/:id', authRequired, adminRequired, async (req, res) => {
  const { entity, id } = req.params;
  const allowedTables = {
    visitors: 'visitors',
    vehicle_entries: 'vehicle_entries',
    deliveries: 'deliveries',
    yard_exits: 'yard_exits',
    repossessed_vehicles: 'repossessed_vehicles'
  };

  const table = allowedTables[entity];
  if (!table) {
    return res.status(400).json({ error: 'Unsupported entity for delete action' });
  }

  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Record not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/guards', authRequired, adminRequired, async (_, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name, username, role, status, created_at FROM users WHERE role IN ('guard', 'supervisor') ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/guards', authRequired, adminRequired, async (req, res) => {
  const { full_name, username, password, role, status } = req.body;
  if (!full_name || !username || !password) {
    return res.status(400).json({ error: 'full_name, username, and password are required' });
  }
  const safeRole = role === 'supervisor' ? 'supervisor' : 'guard';
  const safeStatus = status === 'disabled' ? 'disabled' : 'active';

  try {
    const result = await pool.query(
      'INSERT INTO users (full_name, username, password, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, username, role, status, created_at',
      [full_name, username, password, safeRole, safeStatus]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/guards/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  const { full_name, username, password, role, status } = req.body;

  if (!full_name && !username && !password && !role && !status) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  try {
    const current = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND role IN ('guard', 'supervisor')",
      [id]
    );
    if (!current.rowCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = current.rows[0];
    const nextRole = role === 'supervisor' || role === 'guard' ? role : existing.role;
    const nextStatus = status === 'active' || status === 'disabled' ? status : existing.status;
    const result = await pool.query(
      `UPDATE users
       SET full_name = $1,
           username = $2,
           password = $3,
           role = $4,
           status = $5
       WHERE id = $6
       RETURNING id, full_name, username, role, status, created_at`,
      [
        full_name || existing.full_name,
        username || existing.username,
        password || existing.password,
        nextRole,
        nextStatus,
        id
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/guards/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND role IN ('guard', 'supervisor') RETURNING id",
      [id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/departments', authRequired, adminRequired, async (_, res) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM departments ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/departments', authRequired, adminRequired, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING id, name, created_at',
      [name.trim()]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Department already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/departments/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE departments SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
      [name.trim(), id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Department not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Department already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/departments/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Department not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/staff', authRequired, adminRequired, async (_, res) => {
  try {
    const result = await pool.query(
      `SELECT
         s.id,
         s.full_name,
         s.department_id,
         d.name AS department_name,
         s.title,
         s.created_at
       FROM staff_members s
       JOIN departments d ON d.id = s.department_id
       ORDER BY s.id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/staff', authRequired, adminRequired, async (req, res) => {
  const { full_name, department_id, title } = req.body;
  if (!full_name || !department_id) {
    return res.status(400).json({ error: 'full_name and department_id are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO staff_members (full_name, department_id, title)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, department_id, title, created_at`,
      [full_name.trim(), department_id, title || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Staff member already exists in this department' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid department' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/staff/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  const { full_name, department_id, title } = req.body;

  if (!full_name && !department_id && title === undefined) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  try {
    const current = await pool.query('SELECT * FROM staff_members WHERE id = $1', [id]);
    if (!current.rowCount) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const existing = current.rows[0];
    const result = await pool.query(
      `UPDATE staff_members
       SET full_name = $1,
           department_id = $2,
           title = $3
       WHERE id = $4
       RETURNING id, full_name, department_id, title, created_at`,
      [
        full_name?.trim() || existing.full_name,
        department_id || existing.department_id,
        title !== undefined ? title : existing.title,
        id
      ]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Staff member already exists in this department' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid department' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/staff/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM staff_members WHERE id = $1 RETURNING id', [id]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/analytics', authRequired, supervisorOrAdminRequired, async (req, res) => {
  const date = asDateOnly(req.query.date);

  try {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM visitors WHERE DATE(time_in AT TIME ZONE 'Africa/Nairobi') = $1) AS visitors,
        (SELECT COUNT(*)::int FROM vehicle_entries WHERE DATE(time_in AT TIME ZONE 'Africa/Nairobi') = $1) AS vehicle_entries,
        (SELECT COUNT(*)::int FROM deliveries WHERE DATE(entry_time AT TIME ZONE 'Africa/Nairobi') = $1) AS deliveries,
        (SELECT COUNT(*)::int FROM yard_exits WHERE DATE(exit_time AT TIME ZONE 'Africa/Nairobi') = $1) AS yard_exits,
        (SELECT COUNT(*)::int FROM repossessed_vehicles WHERE DATE(recorded_at AT TIME ZONE 'Africa/Nairobi') = $1) AS repossessed,
        (SELECT COUNT(*)::int FROM users WHERE role = 'guard') AS guards
      `,
      [date]
    );

    return res.json({ date, ...result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

runSchema()
  .then(ensureDefaultAdmin)
  .then(ensureDefaultDepartments)
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Security Gate API running on port ${port}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  });
