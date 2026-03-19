#!/bin/bash
# ===================================================
# ABOV3 Exodus - TEST Environment Deployment Script
# ===================================================
#
# This script is triggered by a webhook when code is pushed to the main branch.
# It automates the deployment process for the TEST environment.
#
# Environment: TEST (Local VM #2)
# Triggered by: GitHub Actions webhook or manual curl
#
# Webhook Setup:
#   1. Install webhook: sudo apt install webhook
#   2. Configure webhook.json (see below)
#   3. Start webhook server: webhook -hooks ~/webhook.json -port 9000 -verbose
#   4. Make persistent: pm2 start webhook -- -hooks ~/webhook.json -port 9000 -verbose
#
# Trigger manually:
#   curl -X POST http://192.168.1.101:9000/hooks/deploy
#
# GitHub Actions integration:
#   - Add to .github/workflows/docker-image.yml
#   - Triggers on push to 'main' branch
#
# ===================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# ---------------------------------------------------
# Configuration
# ---------------------------------------------------
REPO_DIR="$HOME/abov3/abov3-exodus"
LOG_DIR="$REPO_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
ENV_FILE="$REPO_DIR/.env.test"
PM2_APP_NAME="abov3-exodus-test"

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
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOY_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$DEPLOY_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$DEPLOY_LOG"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$DEPLOY_LOG"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ---------------------------------------------------
# Pre-deployment Checks
# ---------------------------------------------------
log "======================================"
log "  ABOV3 Exodus - TEST Deployment"
log "======================================"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Check required commands
log "Checking required tools..."
check_command git
check_command npm
check_command node
check_command pm2
check_command psql
check_command curl

# Check we're in the right directory
if [ ! -f "$REPO_DIR/package.json" ]; then
    error "Not in repository directory. Expected: $REPO_DIR"
    exit 1
fi

cd "$REPO_DIR"
log "Working directory: $(pwd)"

# Check .env.test exists
if [ ! -f "$ENV_FILE" ]; then
    error "Environment file not found: $ENV_FILE"
    error "Please create .env.test before deploying."
    exit 1
fi

# ---------------------------------------------------
# Step 1: Git Pull Latest Code
# ---------------------------------------------------
log "Step 1/8: Pulling latest code from repository..."

# Save current commit hash for rollback
PREVIOUS_COMMIT=$(git rev-parse HEAD)
log "Current commit: $PREVIOUS_COMMIT"

# Fetch and reset to origin/main
git fetch origin main
if [ $? -ne 0 ]; then
    error "Failed to fetch from origin"
    exit 1
fi

git reset --hard origin/main
if [ $? -ne 0 ]; then
    error "Failed to reset to origin/main"
    exit 1
fi

NEW_COMMIT=$(git rev-parse HEAD)
log "New commit: $NEW_COMMIT"

if [ "$PREVIOUS_COMMIT" == "$NEW_COMMIT" ]; then
    info "No new commits. Deployment may not be necessary, but continuing anyway..."
fi

# ---------------------------------------------------
# Step 2: Check for Database Migrations
# ---------------------------------------------------
log "Step 2/8: Checking for database migrations..."

# Check if migrations directory changed
if git diff --name-only $PREVIOUS_COMMIT $NEW_COMMIT | grep -q "src/server/prisma/migrations"; then
    warn "Database migrations detected!"

    # Load DATABASE_URL from .env.test
    export $(grep -v '^#' $ENV_FILE | grep 'DATABASE_URL=' | xargs)

    if [ -z "$DATABASE_URL" ]; then
        # Try POSTGRES_URL_NON_POOLING instead
        export $(grep -v '^#' $ENV_FILE | grep 'POSTGRES_URL_NON_POOLING=' | xargs)
        DATABASE_URL=$POSTGRES_URL_NON_POOLING
    fi

    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL not found in $ENV_FILE"
        exit 1
    fi

    log "Running database migrations..."
    npx prisma migrate deploy

    if [ $? -ne 0 ]; then
        error "Database migration failed!"
        error "Manual intervention required. Check migration logs."
        exit 1
    fi

    log "Database migrations applied successfully"
else
    log "No database migrations detected. Skipping migration step."
fi

# ---------------------------------------------------
# Step 3: Install Dependencies
# ---------------------------------------------------
log "Step 3/8: Installing dependencies..."

# Check if package.json or package-lock.json changed
if git diff --name-only $PREVIOUS_COMMIT $NEW_COMMIT | grep -q "package"; then
    warn "package.json or package-lock.json changed. Running npm install..."
    npm install

    if [ $? -ne 0 ]; then
        error "npm install failed!"
        exit 1
    fi
else
    log "No package changes detected. Skipping npm install."
fi

# ---------------------------------------------------
# Step 4: Build Application
# ---------------------------------------------------
log "Step 4/8: Building application..."

# Build Next.js production bundle
npm run build

if [ $? -ne 0 ]; then
    error "Build failed!"
    error "Deployment aborted. Previous version is still running."
    exit 1
fi

log "Build completed successfully"

# ---------------------------------------------------
# Step 5: Restart PM2
# ---------------------------------------------------
log "Step 5/8: Restarting application with PM2..."

# Check if PM2 app is running
if pm2 list | grep -q "$PM2_APP_NAME"; then
    log "Restarting existing PM2 process: $PM2_APP_NAME"
    pm2 restart $PM2_APP_NAME
else
    log "Starting new PM2 process: $PM2_APP_NAME"
    pm2 start ecosystem.config.test.js
fi

if [ $? -ne 0 ]; then
    error "PM2 restart failed!"
    exit 1
fi

# Save PM2 configuration
pm2 save

# ---------------------------------------------------
# Step 6: Wait for Application to Start
# ---------------------------------------------------
log "Step 6/8: Waiting for application to start..."

# Wait up to 60 seconds for app to be ready
RETRY_COUNT=0
MAX_RETRIES=12  # 12 * 5 = 60 seconds

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 5

    # Check health endpoint
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log "Application is healthy and responding"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    info "Waiting for application to start... ($RETRY_COUNT/$MAX_RETRIES)"
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "Application failed to start within 60 seconds"
    error "Check PM2 logs: pm2 logs $PM2_APP_NAME"
    exit 1
fi

# ---------------------------------------------------
# Step 7: Health Check
# ---------------------------------------------------
log "Step 7/8: Running health checks..."

# Call health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r .status 2>/dev/null || echo "")

if [ "$HEALTH_STATUS" != "ok" ]; then
    error "Health check failed! Response: $HEALTH_RESPONSE"
    warn "Application may be unhealthy. Check logs: pm2 logs $PM2_APP_NAME"
    exit 1
fi

log "Health check passed: $HEALTH_STATUS"

# Check metrics endpoint
if curl -sf http://localhost:3000/api/metrics | grep -q "nephesh"; then
    log "Metrics endpoint is responding correctly"
else
    warn "Metrics endpoint may not be working correctly"
fi

# ---------------------------------------------------
# Step 8: Post-Deployment Verification
# ---------------------------------------------------
log "Step 8/8: Post-deployment verification..."

# Check PM2 status
pm2 list | grep "$PM2_APP_NAME"

# Display recent logs
log "Recent logs (last 20 lines):"
pm2 logs $PM2_APP_NAME --lines 20 --nostream

# Show deployment summary
log "======================================"
log "  Deployment Summary"
log "======================================"
log "Previous commit: $PREVIOUS_COMMIT"
log "New commit:      $NEW_COMMIT"
log "Application:     $PM2_APP_NAME"
log "Status:          Running"
log "Health:          OK"
log "Deployment log:  $DEPLOY_LOG"
log "======================================"
log "✅ Deployment completed successfully!"
log "======================================"

# Optional: Send notification (Slack, Discord, etc.)
# curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
#   -H 'Content-Type: application/json' \
#   -d "{\"text\":\"✅ TEST deployment successful: $NEW_COMMIT\"}"

exit 0
