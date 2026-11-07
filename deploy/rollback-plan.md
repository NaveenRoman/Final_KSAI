# Codexa Production Rollback and Disaster Recovery Plan

This plan replaces hazardous `git reset --hard` procedures with an atomic, release-symlink rollback strategy.

---

## 1. Release Directory Architecture

Deployments are stored as immutable timestamped directories:
```text
/opt/codexa/
├── releases/
│   ├── 20261101_120000/    # Previous stable release
│   └── 20261102_080000/    # Current active release
├── current -> releases/20261102_080000  (Atomic symlink)
└── shared/
    ├── media/
    └── nonces/
```

---

## 2. Immediate 60-Second Rollback Procedure

If a critical error, regression, or crash occurs after deploying release `20261102_080000`:

### Step 1: Repoint the Atomic Symlink to Previous Release
```bash
# As root on the VPS:
PREVIOUS_RELEASE="20261101_120000"
ln -sfn "/opt/codexa/releases/${PREVIOUS_RELEASE}" /opt/codexa/current
```

### Step 2: Restart Services Gracefully
```bash
systemctl restart codexa-broker
systemctl reload codexa-backend
systemctl reload nginx
```

### Step 3: Verify Health
```bash
curl -f https://api.knowledgestreamai.com/healthz
# Expected output: healthy (200 OK)
```

Rollback is complete in under 5 seconds with zero dropped connections on Nginx.

---

## 3. Database Migration Rollback Procedure

If database migrations were executed during the failed release:

1. Identify the previous migration name:
   ```bash
   /opt/codexa/current/venv/bin/python /opt/codexa/current/backend/manage.py showmigrations
   ```
2. Roll back Django migrations to the previous target:
   ```bash
   /opt/codexa/current/venv/bin/python /opt/codexa/current/backend/manage.py migrate <app_name> <previous_migration_name>
   ```

---

## 4. Frontend (Vercel) Rollback Procedure

If the Next.js frontend introduced breaking changes:
1. Open the [Vercel Dashboard](https://vercel.com).
2. Navigate to **Deployments**.
3. Locate the previous successful deployment.
4. Click **Instant Rollback**.
5. Vercel automatically switches CDN edge routing to the previous immutable build in < 10 seconds.
