# FlashDEX Deployment Guide

Complete guide to deploy FlashDEX frontend and backend to production.

---

## 📋 Deployment Overview

| Component | Recommended Platform | Cost | Difficulty |
|-----------|---------------------|------|------------|
| **Frontend** | Vercel | Free | Easy |
| **Backend** | Railway | Free tier | Easy |
| **Alternative Backend** | Render | Free tier | Easy |

---

## 🎯 Quick Deploy (Recommended)

### Step 1: Deploy Backend to Railway (5 minutes)

Railway is the easiest option with WebSocket support.

1. **Go to Railway**: https://railway.app
2. **Sign up** with GitHub
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your repo**
5. **Configure**:
   - Root Directory: `/` (leave empty)
   - Start Command: `node server/index.js`
6. **Add Environment Variables**:
   ```
   PORT=3001
   PRIVATE_KEY=your_private_key (optional)
   ENABLE_MARKET_MAKER=false
   ```
7. **Deploy** → Get your URL (e.g., `flashdex-backend.up.railway.app`)

### Step 2: Deploy Frontend to Vercel (5 minutes)

1. **Go to Vercel**: https://vercel.com
2. **Sign up** with GitHub
3. **Import Project** → Select your repo
4. **Configure**:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Add Environment Variable**:
   ```
   VITE_WS_URL=wss://your-railway-url.up.railway.app/ws
   ```
6. **Deploy** → Get your URL (e.g., `flashdex.vercel.app`)

### Step 3: Update Frontend Config

After getting your Railway URL, update the environment variable in Vercel:
```
VITE_WS_URL=wss://flashdex-backend.up.railway.app/ws
```

**Done!** Your app is live.

---

## 🚂 Option A: Railway (Recommended)

### Why Railway?
- ✅ WebSocket support out of the box
- ✅ Free tier ($5 credit/month)
- ✅ Auto-deploy from GitHub
- ✅ Easy environment variables
- ✅ Built-in monitoring

### Step-by-Step

1. **Create Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   ```
   Dashboard → New Project → Deploy from GitHub repo
   ```

3. **Select Repository**
   - Choose your FlashDEX repo
   - Railway auto-detects Node.js

4. **Configure Service**
   - Click on the service
   - Go to Settings tab
   - Set Start Command:
   ```bash
   node server/index.js
   ```

5. **Set Environment Variables**
   - Go to Variables tab
   - Add:
   ```
   PORT=3001
   NODE_ENV=production
   ```

6. **Generate Domain**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - You'll get: `your-app.up.railway.app`

7. **Verify Deployment**
   - Visit: `https://your-app.up.railway.app/health`
   - Should return: `{"status":"ok",...}`

### Railway Pricing
- Free: $5/month credit (enough for small apps)
- Hobby: $5/month
- Pro: $20/month

---

## 🎨 Option B: Render

### Why Render?
- ✅ Generous free tier
- ✅ WebSocket support
- ✅ Auto-deploy from GitHub
- ⚠️ Free tier sleeps after 15 min inactivity

### Step-by-Step

1. **Create Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create Web Service**
   ```
   Dashboard → New → Web Service
   ```

3. **Connect Repository**
   - Select your GitHub repo
   - Branch: main

4. **Configure**
   ```
   Name: flashdex-backend
   Region: Oregon (or closest)
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: npm install
   Start Command: node server/index.js
   ```

5. **Set Environment Variables**
   ```
   PORT=10000
   NODE_ENV=production
   ```
   (Render uses PORT=10000 by default)

6. **Create Service**
   - Click "Create Web Service"
   - Wait for deployment

7. **Get URL**
   - Your URL: `https://flashdex-backend.onrender.com`
   - WebSocket: `wss://flashdex-backend.onrender.com/ws`

### render.yaml (Auto-deploy config)

Already created in your repo:
```yaml
services:
  - type: web
    name: flashdex-backend
    env: node
    buildCommand: npm install
    startCommand: node server/index.js
    envVars:
      - key: NODE_ENV
        value: production
```

---

## ▲ Option C: Vercel (Frontend Only)

Vercel is best for the frontend. For backend, use Railway or Render.

### Deploy Frontend

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy via CLI**
   ```bash
   vercel
   ```

3. **Or via Dashboard**
   - Go to https://vercel.com
   - Import Git Repository
   - Select your repo
   - Configure:
     - Framework: Vite
     - Build: `npm run build`
     - Output: `dist`

4. **Set Environment Variable**
   ```
   VITE_WS_URL=wss://your-backend-url/ws
   ```

### vercel.json (Already in repo)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

## 🔧 Environment Variables Summary

### Backend (Railway/Render)
```env
PORT=3001
NODE_ENV=production
PRIVATE_KEY=0x...        # Optional: for market maker bot
ENABLE_MARKET_MAKER=false # Set true to enable bot
```

### Frontend (Vercel)
```env
VITE_WS_URL=wss://your-backend-url.up.railway.app/ws
```

---

## 📝 Step-by-Step Deployment Checklist

### Before Deploying

- [ ] Test locally: `npm run dev:all`
- [ ] Verify server works: `http://localhost:3001/health`
- [ ] Build frontend: `npm run build`
- [ ] Test build: `npm run preview`

### Deploy Backend

- [ ] Create Railway/Render account
- [ ] Connect GitHub repo
- [ ] Set start command: `node server/index.js`
- [ ] Add environment variables
- [ ] Deploy and get URL
- [ ] Test: `https://your-url/health`
- [ ] Test WebSocket: `wss://your-url/ws`

### Deploy Frontend

- [ ] Create Vercel account
- [ ] Connect GitHub repo
- [ ] Set `VITE_WS_URL` environment variable
- [ ] Deploy
- [ ] Test the live site

### After Deploying

- [ ] Test wallet connection
- [ ] Test faucet claim
- [ ] Test order placement
- [ ] Verify WebSocket connection (check console)
- [ ] Test mode toggle (Fast/On-Chain)

---

## 🔍 Troubleshooting

### WebSocket Not Connecting

1. Check backend is running:
   ```
   curl https://your-backend-url/health
   ```

2. Check CORS (backend allows all origins by default)

3. Check WebSocket URL format:
   - ✅ `wss://your-url.railway.app/ws`
   - ❌ `https://your-url.railway.app/ws`

### Backend Crashes

1. Check logs in Railway/Render dashboard
2. Common issues:
   - Missing `ws` package: Run `npm install`
   - Wrong start command: Use `node server/index.js`
   - Port issue: Use `process.env.PORT`

### Frontend Build Fails

1. Check build locally: `npm run build`
2. Common issues:
   - TypeScript errors: Fix before deploying
   - Missing dependencies: Check package.json

### Free Tier Limits

**Railway:**
- $5/month credit
- Enough for ~500 hours
- No sleep on free tier

**Render:**
- Free tier sleeps after 15 min
- First request takes ~30 sec to wake
- Upgrade to paid for always-on

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid |
|----------|-----------|------|
| **Railway** | $5/month credit | $5/month hobby |
| **Render** | Free (sleeps) | $7/month |
| **Vercel** | Free (frontend) | $20/month pro |
| **Fly.io** | Free tier | $1.94/month |

### Recommended Setup (Free)
- Frontend: Vercel (free)
- Backend: Railway ($5 credit) or Render (free with sleep)

### Recommended Setup (Paid, ~$12/month)
- Frontend: Vercel (free)
- Backend: Railway Hobby ($5/month)
- Domain: Namecheap (~$7/year)

---

## 🚀 Quick Commands

```bash
# Test locally
npm run dev:all

# Build frontend
npm run build

# Preview build
npm run preview

# Deploy to Vercel (if CLI installed)
vercel --prod

# Check backend health
curl https://your-backend-url/health
```

---

## 📱 Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records

### Railway
1. Go to Service Settings → Networking
2. Add custom domain
3. Update DNS records

---

## 🎉 You're Done!

After deployment, your FlashDEX will be live at:
- **Frontend**: `https://flashdex.vercel.app`
- **Backend**: `https://flashdex-backend.up.railway.app`
- **WebSocket**: `wss://flashdex-backend.up.railway.app/ws`

Share the frontend URL with others to demo your DEX!

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
