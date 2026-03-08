# Production Deployment Guide

This guide will help you deploy your Security Gate Management application to production.

## Project Overview

- **Frontend**: React 19 + Vite 6 + Material UI 7
- **Backend**: Express.js + PostgreSQL
- **Authentication**: JWT-based

---

## Step 1: Prepare Environment Variables

Create a production `.env` file with secure values:

```env
# Server Configuration
PORT=4000
CORS_ORIGIN=https://your-domain.com
AUTH_SECRET=generate-a-secure-random-string-here

# Database Configuration (PostgreSQL)
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-db-user
PGPASSWORD=your-secure-password
PGDATABASE=security_gate_management
```

**Generate a secure AUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 2: Build the Frontend

```bash
# Install dependencies (if not already done)
npm install

# Build for production
npm run build
```

This creates an optimized build in the `dist/` folder.

---

## Step 3: Set Up PostgreSQL Database

### Option A: Managed Database (Recommended)
Use services like:
- **Supabase** (free tier available)
- **Neon** (free tier available)
- **Railway**
- **Render**

### Option B: Self-Hosted PostgreSQL

```bash
# On your server
sudo apt update
sudo apt install postgresql

# Create database
sudo -u postgres psql
CREATE DATABASE security_gate_management;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE security_gate_management TO your_user;
\q
```

### Run Database Schema

```bash
# Connect to your production database and run:
psql -U your_user -d security_gate_management -f server/sql/schema.sql
```

---

## Step 4: Deploy Backend

### Option A: VPS (DigitalOcean, Linode, AWS EC2)

1. Upload files to server
2. Install Node.js and PostgreSQL
3. Set environment variables
4. Use PM2 to run the server:

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server/index.js --name security-gate-api

# Auto-start on reboot
pm2 startup
pm2 save
```

### Option B: Platform Deployment

| Platform | Frontend | Backend |
|----------|----------|---------|
| **Render** | Static Files | Backend Service |
| **Railway** | Static Files | Backend Service + Database |
| **Fly.io** | Built with backend | Docker container |
| **Coolify** | Static Files | Docker |

---

## Step 5: Deploy Frontend

### Option A: Serve with Backend

Update `server/index.js` to serve static files in production:

```javascript
// Add after existing imports
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production, serve frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}
```

### Option B: Static Hosting

Upload the `dist/` folder to:
- **Netlify** (drag & drop)
- **Vercel** (connect GitHub repo)
- **Cloudflare Pages**

---

## Step 6: Verify Production Setup

1. **Backend Health Check:**
   ```
   curl https://your-api-domain.com/api/health
   ```

2. **Database Connection:**
   - Test login functionality
   - Verify data is being saved

3. **Frontend:**
   - Load your domain
   - Test authentication
   - Test core features

---

## Quick Deployment Checklist

- [ ] Generate secure `AUTH_SECRET`
- [ ] Configure production database (PostgreSQL)
- [ ] Set `CORS_ORIGIN` to your frontend URL
- [ ] Run `npm run build` for frontend
- [ ] Deploy and start backend server
- [ ] Deploy frontend static files
- [ ] Test everything works

---

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check `CORS_ORIGIN` matches your frontend URL exactly
2. **Database Connection**: Verify credentials and network access
3. **Port Not Listening**: Ensure firewall allows the port
4. **Static Files Not Loading**: Check `dist/` folder exists and path is correct

### Logs

```bash
# View backend logs
pm2 logs security-gate-api

# View system logs
journalctl -u postgresql
```
