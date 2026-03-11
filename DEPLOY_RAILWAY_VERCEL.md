# Deploy: Railway (Backend) + Vercel (Frontend)

---

## Step 1: Deploy Backend on Railway

### 1.1 Create Railway Project

1. Go to [Railway.app](https://railway.app) and sign up
2. Click "New Project"
3. Select "Deploy a Postgres Database" (will be created automatically)
4. Click "Add New Service" → "Deploy a Web Service"
5. Connect your GitHub repository

### 1.2 Configure Web Service

| Setting | Value |
|---------|-------|
| Name | `security-gate-api` |
| Build Command | `npm install` |
| Start Command | `node server/index.js` |

### 1.3 Add Environment Variables

Click "Variables" tab and add:

```
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://security-gate-manegement-system.vercel.app
AUTH_SECRET=43de9fccebe98b901f0b561b0f7301f7d8fbce0dd17df6
```

**Generate AUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 1.4 Get Database URL

1. Go to your Postgres service in Railway
2. Click "Variables" tab
3. Copy `DATABASE_URL` value
4. Add it to your Web Service variables

### 1.5 Deploy

Click "Deploy" and wait for deployment to complete.
Note your Railway URL (e.g., `https://security-gate-api.up.railway.app`)

---

## Step 2: Deploy Frontend on Vercel

### 2.1 Prepare Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository

### 2.2 Configure

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | npm run build |
| Output Directory | dist |

### 2.3 Environment Variables

Add this variable:

```
VITE_API_BASE_URL=https://security-gate-api.up.railway.app/api
```

**Important:** Replace the URL with your actual Railway backend URL from Step 1.5

### 2.4 Deploy

Click "Deploy" and wait for completion.
Note your Vercel URL (e.g., `https://security-gate-management.vercel.app`)

---

## Step 3: Final Configuration

After both deploy:

1. Go back to Railway dashboard
2. Update `CORS_ORIGIN` to your actual Vercel URL:
   ```
   CORS_ORIGIN=https://security-gate-management.vercel.app
   ```
3. Redeploy the backend

---

## Step 4: Test

Visit your Vercel URL and test:
- [ ] Login works
- [ ] Can create visitor/vehicle entry
- [ ] Data saves to database

---

## Quick Reference

| Service | URL Variable |
|---------|--------------|
| Backend | Railway URL + `/api` |
| Frontend | Vercel URL |

Example:
- Backend: `https://my-app.up.railway.app`
- Frontend: `https://my-app.vercel.app`
- API Base: `https://my-app.up.railway.app/api`
