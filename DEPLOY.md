# FlashDEX Deployment Guide

## Architecture
- **Frontend (Vercel)**: React app with Vite
- **WebSocket Server (Render)**: Bun WebSocket server for real-time sync

---

## Step 1: Deploy WebSocket Server to Render

### Option A: Using Render Dashboard

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `flashdex-ws`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: 
     ```
     curl -fsSL https://bun.sh/install | bash && ~/.bun/bin/bun install
     ```
   - **Start Command**: 
     ```
     ~/.bun/bin/bun run server/websocket.ts
     ```
   - **Instance Type**: Free (or Starter for better performance)

5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render assigns this automatically)

6. Click **"Create Web Service"**

7. Wait for deployment, then copy your URL (e.g., `https://flashdex-ws.onrender.com`)

### Option B: Using render.yaml (Blueprint)

1. Push code to GitHub
2. Go to Render Dashboard → **"Blueprints"**
3. Connect repository and select `render.yaml`
4. Deploy

---

## Step 2: Deploy Frontend to Vercel

### Option A: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `monad-stream-order` (if in subdirectory)
   - **Build Command**: `bun run build`
   - **Output Directory**: `dist`
   - **Install Command**: `bun install`

5. Add Environment Variables:
   - `VITE_WS_URL` = `wss://flashdex-ws.onrender.com/ws` (your Render URL)

6. Click **"Deploy"**

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from monad-stream-order directory)
cd monad-stream-order
vercel

# For production
vercel --prod
```

---

## Step 3: Update WebSocket URL

After deploying to Render, update the WebSocket URL:

### Option 1: Environment Variable (Recommended)
Add to Vercel Environment Variables:
```
VITE_WS_URL=wss://your-render-app.onrender.com/ws
```

### Option 2: Hardcode (Quick)
Edit `src/hooks/useWebSocket.ts`:
```typescript
const WS_URL = import.meta.env.VITE_WS_URL || (
  import.meta.env.PROD 
    ? 'wss://YOUR-RENDER-URL.onrender.com/ws'  // ← Update this
    : 'ws://localhost:3001/ws'
)
```

---

## Environment Variables Summary

### Vercel (Frontend)
| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_WS_URL` | `wss://flashdex-ws.onrender.com/ws` | WebSocket server URL |

### Render (WebSocket Server)
| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | Auto-assigned | Server port |

---

## Verify Deployment

### Check WebSocket Server
```bash
curl https://flashdex-ws.onrender.com/health
# Should return: {"status":"ok","clients":0,"trades":0}
```

### Check Frontend
Visit your Vercel URL and:
1. Open browser DevTools → Network tab
2. Look for WebSocket connection to your Render URL
3. Should show "WebSocket connected" in console

---

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your domain (e.g., `flashdex.yourdomain.com`)
3. Update DNS records as instructed

### Render
1. Go to Service Settings → Custom Domains
2. Add domain (e.g., `ws.flashdex.yourdomain.com`)
3. Update DNS records

---

## Troubleshooting

### WebSocket Connection Failed
- Check Render logs for errors
- Verify CORS is not blocking (server allows all origins)
- Ensure using `wss://` (not `ws://`) for production

### Build Failed on Vercel
- Check Node version (use 18+)
- Verify `bun` is available or use `npm` fallback
- Check build logs for specific errors

### Render Free Tier Sleeping
- Free tier services sleep after 15 min inactivity
- First request takes ~30s to wake up
- Upgrade to Starter ($7/mo) for always-on

---

## Quick Deploy Commands

```bash
# Local development
bun run dev        # Frontend on :5173
bun run server     # WebSocket on :3001

# Build for production
bun run build

# Preview production build
bun run preview
```

---

## Cost Estimate

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Render | Free | Free |
| **Total** | | **$0/month** |

For production:
| Service | Tier | Cost |
|---------|------|------|
| Vercel | Pro | $20/month |
| Render | Starter | $7/month |
| **Total** | | **$27/month** |