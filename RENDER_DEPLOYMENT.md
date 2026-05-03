# Render Deployment Guide

## Quick Fix for "Exited with status 1" Error

### Step 1: Check Environment Variables
Go to your Render dashboard → Your service → Environment tab

**Required Variables:**
```
DATABASE_URL=<automatically set by Render if you linked a database>
GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=llama-3.3-70b-versatile
SESSION_SECRET=<any-random-string>
NODE_ENV=production
```

### Step 2: Verify Database Connection
1. Make sure you have a PostgreSQL database created in Render
2. Link it to your web service
3. The `DATABASE_URL` should be automatically set

### Step 3: Check Build Logs
Look for these specific errors in your Render logs:
- ❌ Missing required environment variables
- ❌ Database initialization failed
- ❌ Connection refused

### Step 4: Manual Deploy
After setting environment variables:
1. Go to your service dashboard
2. Click "Manual Deploy" → "Clear build cache & deploy"

## Common Issues & Solutions

### Issue 1: Missing GROQ_API_KEY
**Error:** `Missing required environment variables: GROQ_API_KEY`

**Solution:**
1. Get a free API key from https://console.groq.com/keys
2. Add it to Render environment variables
3. Redeploy

### Issue 2: Database Connection Failed
**Error:** `Database initialization failed: connection refused`

**Solution:**
1. Create a PostgreSQL database in Render (free tier available)
2. Link it to your web service
3. Verify `DATABASE_URL` is set in environment variables

### Issue 3: Port Binding
**Error:** `EADDRINUSE` or port already in use

**Solution:**
- The app now binds to `0.0.0.0` which is required for Render
- Make sure `PORT` environment variable is set (Render sets this automatically)

### Issue 4: SSL Certificate Error
**Error:** `self signed certificate`

**Solution:**
- Already handled in `server/db.js` with `ssl: { rejectUnauthorized: false }`

## Deployment Checklist

- [ ] PostgreSQL database created in Render
- [ ] Database linked to web service
- [ ] `GROQ_API_KEY` environment variable set
- [ ] `SESSION_SECRET` environment variable set
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Health check path: `/health`

## Testing Your Deployment

Once deployed, test these endpoints:
1. Health check: `https://your-app.onrender.com/health`
2. Login page: `https://your-app.onrender.com/login`

## Getting API Keys

### Groq API (Required - Free)
1. Visit https://console.groq.com/
2. Sign up for free account
3. Go to API Keys section
4. Create new key
5. Copy and add to Render environment variables

### Together AI (Optional - For Image Generation)
1. Visit https://api.together.xyz/
2. Sign up for free account
3. Get API key from dashboard
4. Add as `TOGETHER_API_KEY` in Render

## Need Help?

Check Render logs for specific error messages:
```bash
# In Render dashboard
Logs → Select your service → View real-time logs
```

Look for lines starting with:
- ❌ (errors)
- ✓ (success)
