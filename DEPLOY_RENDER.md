# Deploy to Render

## Option 1: Combined Backend + Frontend

### Prerequisites
- GitHub/GitLab repository
- Render account

### Steps

1. **Create a new Web Service on Render**

2. **Configure the service:**
   - Name: `security-gate-api`
   - Root Directory: (leave empty)
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `node server/index.js`

3. **Add Environment Variables:**
   ```
   PORT=4000
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend.onrender.com
   AUTH_SECRET=<generate-secure-string>
   
   # Database - Create a Render PostgreSQL
   PGHOST=<from-render-postgres>
   PGPORT=5432
   PGUSER=<username>
   PGPASSWORD=<password>
   PGDATABASE=security_gate_management
   ```

4. **Create PostgreSQL Database:**
   - Go to "Databases" in Render dashboard
   - Create new PostgreSQL instance
   - Copy the connection details to your web service env vars

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for build and deployment

---

## Option 2: Separate Backend and Frontend

### Backend (Render)

1. Create Web Service with same config as above
2. Note your backend URL (e.g., `https://security-gate-api.onrender.com`)

### Frontend (Render Static Site)

1. Create new "Static Site" on Render
2. Connect to your GitHub repo
3. Configure:
   - Build Command: `npm run build`
   - Publish directory: `dist`
4. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com/api
   ```

---

## Database Setup

Run the schema on Render PostgreSQL:

```bash
# Connect to your Render PostgreSQL
psql -h <host> -U <username> -d security_gate_management -f server/sql/schema.sql

# Or use the Render dashboard's PostgreSQL shell
```

---

## Troubleshooting

- **502 Bad Gateway**: Check that PORT is set correctly
- **Database connection failed**: Verify PG* environment variables
- **CORS errors**: Ensure CORS_ORIGIN matches your frontend URL
