# Codexa Production Environment Variable Checklist

Before initiating production traffic, verify that all three tiers (Vercel Next.js, Django Backend, and Broker Daemon) have their environment variables configured and securely stored.

---

## 1. Vercel Next.js (`.env.production` / Vercel Project Settings)

| Variable | Purpose | Security / Requirement |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon Postgres pooled connection URL | `postgresql://...@...neon.tech/ksai?sslmode=require` |
| `DIRECT_URL` | Neon Postgres direct unpooled URL (for Prisma migrations) | `postgresql://...@...neon.tech/ksai?sslmode=require` |
| `BETTER_AUTH_SECRET` | Better-Auth cookie/token encryption key | High-entropy 64-char random hex string |
| `BETTER_AUTH_URL` | Canonical app URL | `https://knowledgestreamai.com` |
| `INTERNAL_API_SECRET` | Shared secret header between Next.js and Django | High-entropy 64-char random hex string |
| `STUDENT_SIGNING_SECRET` | Cryptographic HMAC secret for execution requests | High-entropy 64-char random hex string (shared with Broker) |
| `DJANGO_RUN_URL` | Endpoint of Django API on VPS | `https://api.knowledgestreamai.com/api/run/` |
| `ENABLE_CODE_EXECUTION` | Feature flag to control execution availability | `true` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_live_...` (or `rzp_test_...` for test launch) |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret | Confidential live/test secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret | Confidential webhook signing secret |
| `GEMINI_API_KEY` | Google Gemini key for AI Tutor & Guidance | High-entropy Google AI Studio key |
| `OPENAI_API_KEY` | Practice Question Generator key | Restricted OpenAI key |
| `GROQ_API_KEY` | Ultra-fast AI fallback provider | Restricted API key (optional) |

---

## 2. Django Gunicorn Backend (`/etc/codexa/backend.env` - permissions `0600`)

| Variable | Purpose | Security / Requirement |
| :--- | :--- | :--- |
| `DJANGO_ENV` | Environment identifier | `production` |
| `DJANGO_SECRET_KEY` | Django cryptographic signing key | Unique 64-char high-entropy string |
| `DJANGO_DEBUG` | Debug flag | `False` (CRITICAL: never `True` in production) |
| `DJANGO_ALLOWED_HOSTS` | Hostnames permitted to hit Django | `api.knowledgestreamai.com,localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Permitted browser origins | `https://knowledgestreamai.com` |
| `CSRF_TRUSTED_ORIGINS` | Trusted origins for CSRF | `https://knowledgestreamai.com` |
| `INTERNAL_API_SECRET` | Verifies incoming calls from Next.js | Must match Next.js `INTERNAL_API_SECRET` |
| `STUDENT_SIGNING_SECRET` | Verifies student execution requests | Must match Next.js & Broker secret |
| `BROKER_SOCKET_PATH` | Path to execution broker Unix socket | `/run/codexa/broker.sock` |
| `GEMINI_API_KEY` | Google Gemini key for AI gateway endpoints | Must match or be valid Google AI key |
| `DATABASE_URL` | Postgres database connection | Required if Django models connect to Postgres |

---

## 3. Standalone Execution Broker (`/etc/codexa/broker.env` - permissions `0600`)

| Variable | Purpose | Security / Requirement |
| :--- | :--- | :--- |
| `STUDENT_SIGNING_SECRET` | Verifies HMAC-SHA256 student signatures | Must match Next.js & Django secret |
| `BROKER_SOCKET_PATH` | Unix socket path to listen on | `/run/codexa/broker.sock` |
| `DOCKER_SANDBOX_IMAGE` | Immutable image tag for container runner | `ksai-runner:latest` |
| `WAL_PATH` | Path to persistent replay WAL | `/var/lib/codexa/nonces.wal` |
| `PYTHONUNBUFFERED` | Flushes stdout/stderr immediately | `1` |
