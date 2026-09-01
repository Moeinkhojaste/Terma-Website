#!/usr/bin/env bash
# ==============================================================================
# Terma Server Baseline Setup & Hardening Script
# Target: Linux VPS (Ubuntu/Debian 3 vCPU / 6 GB RAM)
# ==============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
   echo "[-] This setup script must be run as root." >&2
   exit 1
fi

echo "[+] 1. Creating dedicated non-root deployer user..."
if ! id "deployer" &>/dev/null; then
    useradd -m -s /bin/bash deployer
    usermod -aG sudo deployer
    echo "[*] Created user 'deployer'. Ensure SSH keys are added to /home/deployer/.ssh/authorized_keys."
else
    echo "[*] User 'deployer' already exists."
fi

echo "[+] 2. Configuring Host Swap Space (4 GB Emergency Safety Buffer)..."
if ! swapon --show | grep -q "swap"; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    sysctl vm.swappiness=15
    echo "vm.swappiness=15" > /etc/sysctl.d/99-terma-swap.conf
    echo "[*] 4GB swap space configured."
else
    echo "[*] Swap is already active."
fi

echo "[+] 3. Configuring UFW Firewall Rules..."
apt-get update -y && apt-get install -y ufw apache2-utils
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH Remote Management"
ufw allow 80/tcp comment "HTTP (Certbot & Nginx)"
ufw allow 443/tcp comment "HTTPS Web Traffic"
# Explicitly block external access to internal service ports
ufw deny 1433/tcp comment "Block SQL Server Public Access"
ufw deny 8080/tcp comment "Block Backend Prod Direct Access"
ufw deny 8081/tcp comment "Block Backend Staging Direct Access"
ufw --force enable
echo "[*] UFW firewall active and hardened."

echo "[+] 4. Configuring Docker Daemon Log Rotation..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
if systemctl is-active --quiet docker; then
    systemctl reload docker || systemctl restart docker
    usermod -aG docker deployer
fi
echo "[*] Docker daemon log rotation configured."

echo "[+] 5. Creating Project Directory Hierarchy..."
mkdir -p /opt/terma/{production,staging,backups,scripts,logs}
mkdir -p /opt/terma/backups/{daily,weekly,pre-deploy,offsite}
mkdir -p /opt/terma/nginx/{conf.d,ssl,auth}
chown -R deployer:docker /opt/terma
chmod -R 750 /opt/terma

echo "[+] 6. Initializing Staging HTTP Basic Auth (.htpasswd)..."
if [[ ! -f /opt/terma/nginx/auth/.htpasswd ]]; then
    htpasswd -bc /opt/terma/nginx/auth/.htpasswd terma_tester "TermaStaging2026!#Strong"
    chmod 640 /opt/terma/nginx/auth/.htpasswd
    echo "[*] Default staging basic auth created (User: terma_tester)."
fi

echo "[+] Server baseline hardening completed successfully!"
