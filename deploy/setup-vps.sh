#!/usr/bin/env bash
# ==============================================================================
# Codexa Production VPS Provisioning Script (Ubuntu 24.04 LTS)
# ==============================================================================
set -euo pipefail

# 0. Safety Guard: Prevent accidental reruns on an active or provisioned server
BOOTSTRAP_SENTINEL="/etc/codexa/.provisioned"
CODEXA_FORCE_BOOTSTRAP="${CODEXA_FORCE_BOOTSTRAP:-0}"

if [ -f "$BOOTSTRAP_SENTINEL" ] && [ "$CODEXA_FORCE_BOOTSTRAP" != "1" ]; then
    echo "ERROR: Server has already been provisioned (sentinel file exists at $BOOTSTRAP_SENTINEL)." >&2
    echo "To prevent disruption to running services, setup-vps.sh refuses to run again." >&2
    echo "If you intentionally wish to override this safety guard, rerun with:" >&2
    echo "  CODEXA_FORCE_BOOTSTRAP=1 ./deploy/setup-vps.sh" >&2
    exit 1
fi

# Assert repository precondition
if [ ! -d "/opt/codexa/backend" ] || [ ! -f "/opt/codexa/backend/sandbox/Dockerfile" ]; then
    echo "ERROR: Codexa repository is not present at /opt/codexa." >&2
    echo "Please clone the verified repository into /opt/codexa before running this provisioning script:" >&2
    echo "  git clone <verified-repo-url> /opt/codexa" >&2
    exit 1
fi

echo ">>> [1/8] Updating system packages and installing baseline dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update

# Upgrade packages only during fresh bootstrap or if explicitly requested
if [ ! -f "$BOOTSTRAP_SENTINEL" ] || [ "${UPGRADE_SYSTEM:-0}" = "1" ]; then
    echo "Initial bootstrap detected: upgrading baseline packages..."
    apt-get upgrade -y
else
    echo "Subsequent run detected: skipping package upgrade to prevent service interruption."
fi
apt-get install -y \
    curl \
    git \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3-pip \
    python3-venv \
    build-essential \
    libpq-dev \
    acl

echo ">>> [2/8] Creating dedicated unprivileged users and groups..."
# 1. Group 'codexa' shared between web, broker, and nginx for socket communication
getent group codexa >/dev/null || groupadd -r codexa

# 2. User 'codexa' (Django web user) - NOT IN DOCKER GROUP
if ! id -u codexa >/dev/null 2>&1; then
    useradd -r -g codexa -s /usr/sbin/nologin -d /opt/codexa codexa
fi

# 3. User 'codexa-broker' (Execution daemon user)
if ! id -u codexa-broker >/dev/null 2>&1; then
    useradd -r -g codexa -s /usr/sbin/nologin -d /var/lib/codexa codexa-broker
fi

# 4. Add Nginx (www-data) to 'codexa' group for least-privilege socket read/write (0660)
usermod -aG codexa www-data

echo ">>> [3/8] Installing Docker-CE and gVisor (runsc)..."
# Install official Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# Add ONLY codexa-broker to the docker group
usermod -aG docker codexa-broker

# Install gVisor runsc via official signed repository
curl -fsSL https://gvisor.dev/archive.key | gpg --dearmor -o /etc/apt/keyrings/gvisor-archive-keyring.gpg
chmod a+r /etc/apt/keyrings/gvisor-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/gvisor-archive-keyring.gpg] https://packages.cloud.google.com/apt gvisor-release main" | tee /etc/apt/sources.list.d/gvisor.list > /dev/null
apt-get update
apt-get install -y runsc

# Configure Docker daemon with gVisor runsc runtime (keeping runc as default)
mkdir -p /etc/docker
cat <<EOF > /tmp/docker-daemon.json.candidate
{
  "runtimes": {
    "runsc": {
      "path": "/usr/bin/runsc"
    }
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

if [ ! -f /etc/docker/daemon.json ] || ! cmp -s /tmp/docker-daemon.json.candidate /etc/docker/daemon.json; then
    echo "Docker daemon configuration changed or not found. Updating configuration and restarting Docker..."
    mv /tmp/docker-daemon.json.candidate /etc/docker/daemon.json
    systemctl restart docker
else
    echo "Docker daemon configuration is unchanged. Skipping restart to avoid terminating active containers."
    rm -f /tmp/docker-daemon.json.candidate
fi

echo ">>> [4/8] Building Docker Sandbox Runner Image from backend/sandbox/Dockerfile..."
docker build -t ksai-runner:latest -f /opt/codexa/backend/sandbox/Dockerfile /opt/codexa/backend/sandbox

echo ">>> [5/8] Creating directory structure and setting strict ownership..."
mkdir -p /opt/codexa /etc/codexa /var/log/codexa /var/lib/codexa /run/codexa /var/www/codexa/static /var/www/certbot

chown -R codexa:codexa /opt/codexa /var/www/codexa
chown -R codexa-broker:codexa /var/lib/codexa
chown -R codexa:codexa /var/log/codexa
chown -R codexa-broker:codexa /run/codexa

chmod 0750 /var/log/codexa
chmod 0770 /run/codexa
chmod 0700 /var/lib/codexa
chmod 0750 /etc/codexa

echo ">>> [6/8] Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ">>> [7/8] Deploying Systemd Services & IPC Configuration..."
cp /opt/codexa/deploy/codexa-broker.service /etc/systemd/system/
cp /opt/codexa/deploy/codexa-backend.service /etc/systemd/system/
cp /opt/codexa/deploy/codexa-tmpfiles.conf /etc/tmpfiles.d/codexa.conf
systemd-tmpfiles --create /etc/tmpfiles.d/codexa.conf

# Two-stage Nginx configuration: deploy HTTP-only bootstrap if certificates are not yet present
CERT_FULLCHAIN="/etc/letsencrypt/live/api.knowledgestreamai.com/fullchain.pem"
CERT_PRIVKEY="/etc/letsencrypt/live/api.knowledgestreamai.com/privkey.pem"

if [ -f "$CERT_FULLCHAIN" ] && [ -f "$CERT_PRIVKEY" ]; then
    echo "Valid TLS certificates detected. Deploying production HTTPS Nginx configuration..."
    cp /opt/codexa/deploy/nginx.conf /etc/nginx/sites-available/codexa.conf
else
    echo "TLS certificates not yet present. Deploying bootstrap HTTP-only Nginx configuration..."
    cp /opt/codexa/deploy/nginx-bootstrap-http.conf /etc/nginx/sites-available/codexa.conf
fi

ln -sf /etc/nginx/sites-available/codexa.conf /etc/nginx/sites-enabled/codexa.conf

# Preserve unrelated Nginx sites: remove default site link only if present
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl reload nginx 2>/dev/null || systemctl restart nginx

systemctl daemon-reload
systemctl enable codexa-broker codexa-backend nginx

# Write sentinel file to record successful bootstrap
touch "$BOOTSTRAP_SENTINEL"
chmod 0600 "$BOOTSTRAP_SENTINEL"

echo ">>> [8/8] Provisioning Complete! Next steps:"
echo "1. Populate /etc/codexa/backend.env and /etc/codexa/broker.env (chmod 0600)"
echo "2. Bootstrap TLS: certbot certonly --webroot -w /var/www/certbot -d api.knowledgestreamai.com --non-interactive --agree-tos -m admin@knowledgestreamai.com"
echo "3. After certbot succeeds, activate full HTTPS Nginx configuration:"
echo "     cp /opt/codexa/deploy/nginx.conf /etc/nginx/sites-available/codexa.conf"
echo "     nginx -t && systemctl reload nginx"
echo "4. Start services: systemctl start codexa-broker codexa-backend"
