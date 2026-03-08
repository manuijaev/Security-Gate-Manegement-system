# Deploy to Vercel

Vercel works best with the frontend, so we'll use a separate backend.

## Architecture

- **Frontend**: Vercel (Static hosting)
- **Backend**: Railway, Render, or Fly.io (or use Vercel Serverless Functions)

---

## Option 1: Backend on Railway + Frontend on Vercel (Recommended)

### Step 1: Deploy Backend on Railway

1. Go to [Railway.app](https://railway.app) and sign up
2. Create new project → "Deploy a Postgres Database"
3. Create new service → "Deploy Web Service"
4. Connect your GitHub repo
5. Configure:
   - Root Directory: (leave empty)
   - Build Command: `npm install`
   - Start Command: `node server/index.js`
6. Add Environment Variables:
   ```
   PORT=4000
   NODE_ENV=production
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   AUTH_SECRET=<generate-secure-string>
   DATABASE_URL=<from-railway-postgres>
   ```
7. Deploy and note your Railway URL

### Step 2: Deploy Frontend on Vercel

1. Go to [Vercel.com](https://vercel.com) and sign up
2. Click "Add New Project" → Import your GitHub repo
3. Configure:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add Environment Variables:
   ```
   VITE_API_BASE_URL=https://your-railway-app.up.railway.app/api
   ```
5. Deploy

---

## Option 2: Backend on Render + Frontend on Vercel

### Backend (Render)

Follow the instructions in [DEPLOY_RENDER.md](DEPLOY_RENDER.md)

### Frontend (Vercel)

1. Go to [Vercel.com](https://vercel.com)
2. Add New Project → Import your repo
3. Configure:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add Environment Variable:
   ```
   VITE_API_BASE_URL=https://your-render-app.onrender.com/api
   ```
5. Deploy

---

## Option 3: Full Stack on Vercel (Using API Routes)

This requires restructuring to use Vercel Serverless Functions.

---

## Generate AUTH_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` in backend matches your Vercel URL exactly
- Vercel URLs format: `https://your-project.vercel.app`

### API Not Working
- Verify `VITE_API_BASE_URL` points to your backend
- Check backend is running and accessible

### Database Connection
- Ensure `DATABASE_URL` is set correctly
- For Railway, it should start with `postgres://`
