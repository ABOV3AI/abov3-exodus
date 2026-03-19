#!/bin/bash
# ===================================================
# ABOV3 Exodus - Production Database Migration Script
# ===================================================
#
# This script safely applies database migrations to the production environment.
# It includes automatic backup, verification, and rollback capabilities.
#
# Environment: PROD (DigitalOcean Kubernetes)
# Database: DigitalOcean Managed PostgreSQL
#
# IMPORTANT:
# - Always run this script during maintenance windows
# - Notify team before running
# - Have rollback plan ready
# - Test migrations on TEST environment first
#
# Usage:
#   ./scripts/migrate-production.sh
#
# Prerequisites:
#   - kubectl configured with production cluster access
#   - PostgreSQL client tools installed
#   - Access to production database
#
# ===================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# ---------------------------------------------------
# Configuration
# ---------------------------------------------------
BACKUP_DIR="$HOME/abov3-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql"
K8S_DEPLOYMENT="abov3-exodus"
K8S_NAMESPACE="default"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ---------------------------------------------------
# Functions
# ---------------------------------------------------
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

prompt_yes_no() {
    local question="$1"
    local answer=""

    while [[ ! "$answer" =~ ^(yes|no)$ ]]; do
        read -p "$(echo -e ${YELLOW}$question${NC}) (yes/no): " answer
        answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')
    done

    if [ "$answer" == "yes" ]; then
        return 0
    else
        return 1
    fi
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed. Please install it first."
        exit 1
    fi
}

get_database_url() {
    # Get DATABASE_URL from Kubernetes secret
    local db_url=$(kubectl get secret db-credentials -n $K8S_NAMESPACE -o jsonpath='{.data.direct-url}' | base64 -d)

    if [ -z "$db_url" ]; then
        error "Failed to retrieve DATABASE_URL from Kubernetes secret 'db-credentials'"
        exit 1
    fi

    echo "$db_url"
}

# ---------------------------------------------------
# Pre-migration Checks
# ---------------------------------------------------
log "======================================"
log "  Production Database Migration"
log "======================================"

# Check required commands
log "Checking required tools..."
check_command kubectl
check_command pg_dump
check_command psql
check_command jq

# Verify kubectl context
CURRENT_CONTEXT=$(kubectl config current-context)
log "Current kubectl context: $CURRENT_CONTEXT"

if ! prompt_yes_no "Is this the correct production cluster?"; then
    error "Migration cancelled. Please switch to the correct cluster."
    exit 1
fi

# Get pod information
POD_NAME=$(kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT -o jsonpath='{.items[0].metadata.name}')
if [ -z "$POD_NAME" ]; then
    error "No pods found for deployment $K8S_DEPLOYMENT"
    exit 1
fi
log "Using pod: $POD_NAME"

# Get database URL
log "Retrieving database connection string..."
DATABASE_URL=$(get_database_url)
log "Database connection string retrieved (not displaying for security)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# ---------------------------------------------------
# Final Confirmation
# ---------------------------------------------------
warn "======================================"
warn "  PRODUCTION MIGRATION WARNING"
warn "======================================"
warn "You are about to run database migrations on PRODUCTION."
warn ""
warn "Cluster:    $CURRENT_CONTEXT"
warn "Deployment: $K8S_DEPLOYMENT"
warn "Namespace:  $K8S_NAMESPACE"
warn "Pod:        $POD_NAME"
warn ""
warn "This operation will:"
warn "  1. Create a full database backup"
warn "  2. Check pending migrations"
warn "  3. Apply migrations to production database"
warn "  4. Verify application health"
warn ""
warn "======================================"

if ! prompt_yes_no "Are you absolutely sure you want to proceed?"; then
    error "Migration cancelled by user."
    exit 0
fi

# ---------------------------------------------------
# Step 1: Create Database Backup
# ---------------------------------------------------
log "Step 1/5: Creating database backup..."

# Export database
log "Exporting database to: $BACKUP_FILE"
kubectl exec -n $K8S_NAMESPACE $POD_NAME -- \
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    error "Database backup failed!"
    exit 1
fi

# Check backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"

# Verify backup is not empty
if [ ! -s "$BACKUP_FILE" ]; then
    error "Backup file is empty!"
    exit 1
fi

# Compress backup
log "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup compressed: $BACKUP_FILE ($BACKUP_SIZE)"

# ---------------------------------------------------
# Step 2: Check Migration Status
# ---------------------------------------------------
log "Step 2/5: Checking migration status..."

# Get current migration status
log "Retrieving current migration status from database..."
kubectl exec -n $K8S_NAMESPACE $POD_NAME -- \
    sh -c "export DATABASE_URL='$DATABASE_URL' && npx prisma migrate status"

if [ $? -ne 0 ]; then
    error "Failed to check migration status!"
    error "This might indicate database connection issues."
    exit 1
fi

# Confirm migrations
warn ""
if ! prompt_yes_no "Do you want to apply these migrations?"; then
    error "Migration cancelled by user."
    exit 0
fi

# ---------------------------------------------------
# Step 3: Apply Migrations
# ---------------------------------------------------
log "Step 3/5: Applying database migrations..."

# Run migrations
log "Running: npx prisma migrate deploy"
kubectl exec -n $K8S_NAMESPACE $POD_NAME -- \
    sh -c "export DATABASE_URL='$DATABASE_URL' && npx prisma migrate deploy"

MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
    error "======================================"
    error "  MIGRATION FAILED!"
    error "======================================"
    error "Migrations failed to apply!"
    error ""
    error "Backup location: $BACKUP_FILE"
    error ""
    error "To rollback, run:"
    error "  gunzip $BACKUP_FILE"
    error "  kubectl exec -it $POD_NAME -- psql \$DATABASE_URL < ${BACKUP_FILE%.gz}"
    error ""
    error "======================================"
    exit 1
fi

log "Migrations applied successfully!"

# ---------------------------------------------------
# Step 4: Verify Application Health
# ---------------------------------------------------
log "Step 4/5: Verifying application health..."

# Wait a moment for changes to propagate
sleep 10

# Check health endpoint via kubectl
log "Checking health endpoint..."
HEALTH_STATUS=$(kubectl run health-check-$TIMESTAMP --rm -i --restart=Never \
    --image=curlimages/curl -- curl -sf http://$K8S_DEPLOYMENT/api/health | jq -r .status 2>/dev/null || echo "")

if [ "$HEALTH_STATUS" != "ok" ]; then
    error "======================================"
    error "  HEALTH CHECK FAILED!"
    error "======================================"
    error "Application health check failed after migration!"
    error ""
    error "Backup location: $BACKUP_FILE"
    error ""
    error "Manual intervention required:"
    error "  1. Check pod logs: kubectl logs -f deployment/$K8S_DEPLOYMENT"
    error "  2. Check database connection"
    error "  3. Consider rollback if issues persist"
    error ""
    error "======================================"
    exit 1
fi

log "Health check passed: $HEALTH_STATUS"

# Check metrics endpoint
log "Checking metrics endpoint..."
kubectl run metrics-check-$TIMESTAMP --rm -i --restart=Never \
    --image=curlimages/curl -- curl -sf http://$K8S_DEPLOYMENT/api/metrics > /dev/null

if [ $? -eq 0 ]; then
    log "Metrics endpoint is responding correctly"
else
    warn "Metrics endpoint may not be working correctly"
fi

# ---------------------------------------------------
# Step 5: Post-Migration Verification
# ---------------------------------------------------
log "Step 5/5: Post-migration verification..."

# Check pod status
log "Pod status:"
kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT

# Check recent pod logs
log "Recent logs (last 20 lines):"
kubectl logs -n $K8S_NAMESPACE --tail=20 deployment/$K8S_DEPLOYMENT

# Display summary
log "======================================"
log "  Migration Summary"
log "======================================"
log "Cluster:         $CURRENT_CONTEXT"
log "Deployment:      $K8S_DEPLOYMENT"
log "Backup:          $BACKUP_FILE"
log "Backup Size:     $BACKUP_SIZE"
log "Migration:       SUCCESS"
log "Health Check:    PASSED"
log "======================================"
log "✅ Production migration completed successfully!"
log "======================================"

# Retention notice
info ""
info "Backup retention:"
info "  - Keep this backup for at least 7 days"
info "  - Location: $BACKUP_FILE"
info "  - To restore: gunzip $BACKUP_FILE && kubectl exec -it $POD_NAME -- psql \$DATABASE_URL < ${BACKUP_FILE%.gz}"
info ""

# Optional: Send notification
# log "Sending notification..."
# curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
#   -H 'Content-Type: application/json' \
#   -d "{\"text\":\"✅ Production migration completed successfully\\nBackup: $BACKUP_FILE\"}"

log "Migration script completed."
exit 0
