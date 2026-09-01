#!/usr/bin/env bash
# ==============================================================================
# Terma Lightweight Health & Resource Monitoring Script
# Intended for periodic execution via Cron (e.g., */10 * * * *)
# ==============================================================================
set -euo pipefail

LOG_FILE="/opt/terma/logs/health.log"
mkdir -p "$(dirname "$LOG_FILE")"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

log_msg() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

STATUS="OK"

# 1. Check Container States
CONTAINERS=("terma-db" "terma-prod-backend" "terma-prod-frontend" "terma-staging-backend" "terma-staging-frontend" "terma-nginx")
for c in "${CONTAINERS[@]}"; do
    if ! docker ps --filter "name=${c}" --filter "status=running" | grep -q "${c}"; then
        log_msg "[-] ALERT: Container '${c}' is NOT running!"
        STATUS="WARNING"
    fi
done

# 2. Check Application Readiness Endpoints
if docker ps | grep -q "terma-prod-backend"; then
    if ! docker exec terma-prod-backend curl -s -f http://localhost:8080/health/ready | grep -q '"Healthy"'; then
        log_msg "[-] ALERT: Production Backend /health/ready check failed!"
        STATUS="CRITICAL"
    fi
fi

if docker ps | grep -q "terma-staging-backend"; then
    if ! docker exec terma-staging-backend curl -s -f http://localhost:8080/health/ready | grep -q '"Healthy"'; then
        log_msg "[-] WARNING: Staging Backend /health/ready check failed!"
    fi
fi

# 3. Check Memory Utilization
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
MEM_USED=$(free -m | awk '/^Mem:/{print $3}')
MEM_PERCENT=$(( 100 * MEM_USED / MEM_TOTAL ))

if [[ $MEM_PERCENT -gt 85 ]]; then
    log_msg "[-] WARNING: High Memory Utilization: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB)"
fi

# 4. Check Disk Utilization
DISK_PERCENT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [[ $DISK_PERCENT -gt 85 ]]; then
    log_msg "[-] WARNING: High Disk Utilization: ${DISK_PERCENT}% on root filesystem"
fi

if [[ "$STATUS" == "OK" ]]; then
    log_msg "[+] Health check passed. System status OK. Memory: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB), Disk: ${DISK_PERCENT}%."
fi
