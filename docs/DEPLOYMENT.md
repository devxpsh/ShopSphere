# ShopSphere — Production Deployment & Operations Guide

This guide explains how to deploy **ShopSphere** either as a self-contained Docker Compose stack or onto managed cloud platforms (e.g., Render/Railway + Neon/RDS PostgreSQL + Vercel/Cloudflare Pages).

---

## 1. Option A: Full-Stack Docker Compose Deployment

The repository includes multi-stage production Dockerfiles for both `/backend` (`node:20-alpine`) and `/frontend` (`nginx:1.27-alpine`), orchestrated alongside `postgres:16-alpine` in [`docker-compose.yml`](../docker-compose.yml).

### Step 1: Configure Environment Variables
Create a root `.env` file (or export variables in your deployment host) with strong cryptographic secrets:

```bash
POSTGRES_USER=shopsphere_prod
POSTGRES_PASSWORD=<generate-strong-db-password>
POSTGRES_DB=shopsphere
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://localhost:8080
PAYMENT_PROVIDER=MOCK
```

### Step 2: Build and Launch All Containers
```bash
docker compose up -d --build
```

- **PostgreSQL 16** starts first and runs its readiness health check (`pg_isready`).
- **Backend API (`shopsphere-backend`)** waits for PostgreSQL health, automatically applies pending migrations via `npx prisma migrate deploy`, and starts Express on port `4000`.
- **Frontend Nginx (`shopsphere-frontend`)** serves the compiled Vite static bundle on port `8080` (`http://localhost:8080`) and reverse-proxies `/api/*` requests directly to `http://backend:4000/api/*`.

### Step 3: Seed Initial Catalog (Optional — Development/Staging Only)
> **Security Rule #12:** Demo accounts (`admin@shopsphere.in` / `customer@shopsphere.in`) are strictly blocked when `NODE_ENV=production` unless explicitly run in a staging/demo environment.

To seed the 24 Indian catalog products in a staging container:
```bash
docker exec -it shopsphere-backend npx tsx prisma/seed.ts
```

---

## 2. Option B: Managed Cloud Deployment (Recommended for Production)

### Architecture Overview
1. **Database:** Managed PostgreSQL 16 (Neon, Supabase, AWS RDS, or Railway Postgres) with SSL (`?sslmode=require`).
2. **Backend API:** Node.js 20 Web Service (Render, Railway, Fly.io, or AWS App Runner) deployed from `/backend`.
3. **Frontend SPA:** Static CDN Edge Hosting (Vercel, Netlify, or Cloudflare Pages) deployed from `/frontend`, or served behind a custom subdomain (`shop.yourdomain.in` + `api.yourdomain.in`).

### Backend Service Configuration (`/backend`)
- **Root Directory:** `backend`
- **Build Command:** `npm ci && npx prisma generate && npm run build`
- **Pre-Deploy / Release Command:** `npx prisma migrate deploy`
- **Start Command:** `npm start` (`node dist/server.js`)
- **Health Check Path:** `/api/v1/health`

#### Required Production Environment Variables (`/backend`)
| Variable | Description | Example / Requirement |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` (enforces `Secure` cookies & hides stack traces) |
| `PORT` | HTTP listener port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/shopsphere?sslmode=require` |
| `CORS_ORIGIN` | Exact frontend origin | `https://shopsphere.yourdomain.in` |
| `JWT_ACCESS_SECRET` | 32+ char secret for 15m access tokens | Generate via `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | 32+ char secret for 7d refresh tokens | Generate via `openssl rand -hex 32` |
| `CSRF_SECRET` | 32+ char secret for CSRF tokens | Generate via `openssl rand -hex 32` |
| `PAYMENT_PROVIDER` | Payment gateway mode | `RAZORPAY` or `MOCK` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_test_...` or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret | Keep strictly server-side |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook HMAC Secret | Configured in Razorpay Dashboard → Webhooks |

### Frontend Service Configuration (`/frontend`)
- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Environment Variable:**
  - `VITE_API_BASE_URL=https://api.yourdomain.in/api/v1` (or `/api/v1` if reverse-proxied on the same domain).
- **SPA Rewrite Rule:** Route all non-asset paths (`/*`) to `/index.html` with status `200`.

---

## 3. Razorpay Webhook & Signature Setup

1. Log in to the **Razorpay Dashboard** (Test Mode or Live Mode).
2. Navigate to **Settings → API Keys** and generate `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. Navigate to **Settings → Webhooks** and create a webhook pointing to:
   ```text
   https://<your-backend-domain>/api/v1/payments/razorpay/webhook
   ```
4. Enable the `payment.captured` and `payment.failed` events and set a strong **Webhook Secret** matching `RAZORPAY_WEBHOOK_SECRET`.
5. ShopSphere verifies every checkout callback and webhook using constant-time `crypto.timingSafeEqual` HMAC-SHA256 verification before marking any order `CONFIRMED`.

---

## 4. Post-Deployment Verification Checklist

After deploying, verify the following endpoints:

1. **Database & API Liveness:**
   ```bash
   curl -i https://<your-backend-domain>/api/v1/health
   ```
   Verify HTTP `200 OK`, `"status": "ok"`, `"database": "connected"`, `X-Content-Type-Options: nosniff`, and absence of `X-Powered-By`.
2. **OpenAPI 3.0.3 & Swagger UI:**
   Visit `https://<your-backend-domain>/api/v1/docs` in a browser to inspect the interactive API documentation.
3. **CSRF & Cookie Security:**
   ```bash
   curl -i https://<your-backend-domain>/api/v1/auth/csrf
   ```
   Verify `Set-Cookie: shopsphere_csrf=...; Path=/; Secure; SameSite=Lax`.
