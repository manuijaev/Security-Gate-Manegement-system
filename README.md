# Security Gate Management System

A comprehensive role-based security gate dashboard built with React + Material UI frontend and Node/Express + PostgreSQL backend.

## Features

### User Roles

#### Admin
- Login authentication
- View analytics dashboard with statistics
- Manage guards (CRUD operations)
- Manage departments (CRUD operations)
- View and manage movement logs
- Mark exit / delete entries with icon actions

#### Supervisor
- Login authentication
- View analytics dashboard
- View all movement logs
- Approve yard exits
- Generate reports

#### Guard
- Login authentication
- Dashboard with quick stats, quick actions, activity feed, notifications
- **Visitor Management**
  - Register new visitors
  - Record visitor exit
  - Search visitors
- **Vehicle Management**
  - Vehicle Entry with manufacturer & color (searchable dropdowns)
  - Vehicle Exit
  - Yard Exit (requires supervisor approval)
  - Repossessed Vehicles tracking
- **Deliveries**
  - Log delivery companies
  - Track delivery vehicles
- **Search & Reports**
  - Search all records
  - Export to CSV/Excel
  - Filter by date range
- Profile menu (my profile, change password, logout)
- Session timeout on inactivity

### Vehicle Entry Features

The Vehicle Entry form includes:
- **Vehicle Registration** (required)
- **Vehicle Manufacturer** - Searchable dropdown with 70+ car manufacturers:
  - Japanese: Toyota, Honda, Nissan, Mazda, Subaru, Mitsubishi, Suzuki, Lexus, etc.
  - American: Ford, Chevrolet, GMC, Dodge, Chrysler, Tesla, etc.
  - European: BMW, Mercedes-Benz, Audi, Volkswagen, Porsche, Volvo, etc.
  - Korean: Hyundai, Kia, Genesis
  - And more...
- **Vehicle Color** - Searchable dropdown with common colors:
  - White, Black, Silver, Grey, Red, Blue, Green, Yellow, Orange, Brown, Beige, Gold, etc.
- **Driver Name**
- **Vehicle Type** - Company, Service, Customer
- **Purpose**
- **Notes**

Both manufacturer and color fields support:
- Typing to search
- Selecting from predefined list
- Free text entry for custom values

## Tech Stack

- **Frontend**: React 19, Vite 6, Material UI 7
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL
- **Authentication**: JWT-based
- **Reports**: CSV and Excel export

## Project Structure

```
Security_gate_management/
├── server/
│   ├── index.js          # Express server with all API routes
│   ├── db.js             # Database connection
│   └── sql/
│       └── schema.sql    # Database schema
├── src/
│   ├── App.jsx           # Main React application
│   ├── main.jsx          # React entry point
│   ├── lib/
│   │   └── api.js        # API client functions
│   ├── components/       # React components
│   └── data/
│       └── mockData.js   # Mock data
├── public/               # Static assets
├── package.json
├── vite.config.js        # Vite configuration
└── .env                  # Environment variables
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

1. Clone the repository:
```bash
cd Security_gate_management
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure `.env` file:
```env
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Database
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=security_gate_management

# Auth (optional)
AUTH_SECRET=your-secret-key
```

4. Create database:
```bash
sudo -u postgres createdb security_gate_management
```

5. Install dependencies:
```bash
npm install
```

6. Run database schema:
```bash
psql -h 127.0.0.1 -U postgres -d security_gate_management -W -f server/sql/schema.sql
```

### Running the Application

- **Backend only** (port 4000):
```bash
npm run server
```

- **Frontend only** (port 5173):
```bash
npm run dev
```

- **Both simultaneously**:
```bash
npm run dev:all
```

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Guard | guard | guard123 |
| Supervisor | supervisor | super123 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Visitors
- `GET /api/visitors` - List visitors
- `POST /api/visitors` - Register visitor
- `PUT /api/visitors/:id` - Update visitor
- `DELETE /api/visitors/:id` - Delete visitor

### Vehicle Entries
- `GET /api/vehicle-entries` - List vehicle entries
- `POST /api/vehicle-entries` - Register vehicle entry
- `PUT /api/vehicle-entries/:id` - Update vehicle entry
- `DELETE /api/vehicle-entries/:id` - Delete vehicle entry

### Deliveries
- `GET /api/deliveries` - List deliveries
- `POST /api/deliveries` - Register delivery

### Yard Exits
- `GET /api/yard-exits` - List yard exits
- `POST /api/yard-exits` - Register yard exit

### Repossessed Vehicles
- `GET /api/repossessed-vehicles` - List repossessed vehicles
- `POST /api/repossessed-vehicles` - Register repossessed vehicle

### Departments
- `GET /api/departments` - List departments
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Staff
- `GET /api/staff` - List staff members
- `POST /api/staff` - Create staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Reports
- `GET /api/movements` - Get all movements with filters
- `GET /api/summary` - Get daily summary statistics
- `GET /api/alerts` - Get active alerts

## Production Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions to:
- Railway + Vercel
- Render
- Other platforms

## License

MIT
