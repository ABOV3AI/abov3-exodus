#!/bin/bash
# ===================================================
# ABOV3 Exodus - TEST Environment Rollback Script
# ===================================================
#
# This script rolls back the TEST environment to a previous commit or state.
# It provides safe rollback with verification and health checks.
#
# Environment: TEST (Local VM #2)
# Process Manager: PM2
#
# Usage:
#   ./scripts/rollback-test.sh [commit_hash]
#
# Examples:
#   ./scripts/rollback-test.sh                    # Rollback to previous commit (HEAD~1)
#   ./scripts/rollback-test.sh abc1234            # Rollback to specific commit
#   ./scripts/rollback-test.sh HEAD~3             # Rollback 3 commits back
#
# ===================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# ---------------------------------------------------
# Configuration
# ---------------------------------------------------
REPO_DIR="$HOME/abov3/abov3-exodus"
LOG_DIR="$REPO_DIR/logs"
ROLLBACK_LOG="$LOG_DIR/rollback-$(date +%Y%m%d-%H%M%S).log"
ENV_FILE="$REPO_DIR/.env.test"
PM2_APP_NAME="abov3-exodus-test"
COMMIT_TARGET="${1:-HEAD~1}"  # Default to previous commit

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
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$ROLLBACK_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$ROLLBACK_LOG"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$ROLLBACK_LOG"
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

# ---------------------------------------------------
# Pre-rollback Checks
# ---------------------------------------------------
log "======================================"
log "  TEST Environment Rollback"
log "======================================"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Check required commands
log "Checking required tools..."
check_command git
check_command npm
check_command node
check_command pm2
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
    exit 1
fi

# ---------------------------------------------------
# Git Status and Commit Info
# ---------------------------------------------------
log "Step 1/7: Analyzing git history..."

# Get current commit
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)
CURRENT_COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s" HEAD)

log "Current commit: $CURRENT_COMMIT_SHORT - $CURRENT_COMMIT_MESSAGE"

# Validate target commit exists
if ! git rev-parse "$COMMIT_TARGET" > /dev/null 2>&1; then
    error "Invalid commit target: $COMMIT_TARGET"
    error "Commit does not exist in git history."
    exit 1
fi

# Get target commit info
TARGET_COMMIT=$(git rev-parse "$COMMIT_TARGET")
TARGET_COMMIT_SHORT=$(git rev-parse --short "$COMMIT_TARGET")
TARGET_COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s" "$TARGET_COMMIT")

log "Target commit:  $TARGET_COMMIT_SHORT - $TARGET_COMMIT_MESSAGE"

# Check if already at target commit
if [ "$CURRENT_COMMIT" == "$TARGET_COMMIT" ]; then
    warn "Already at target commit. Nothing to rollback."
    exit 0
fi

# Show commits that will be rolled back
log ""
log "Commits that will be rolled back:"
git log --oneline --graph "$TARGET_COMMIT".."$CURRENT_COMMIT"
log ""

# ---------------------------------------------------
# Confirmation
# ---------------------------------------------------
warn "======================================"
warn "  ROLLBACK WARNING"
warn "======================================"
warn "You are about to rollback TEST environment."
warn ""
warn "From: $CURRENT_COMMIT_SHORT - $CURRENT_COMMIT_MESSAGE"
warn "To:   $TARGET_COMMIT_SHORT - $TARGET_COMMIT_MESSAGE"
warn ""
warn "This will:"
warn "  1. Reset git repository to $TARGET_COMMIT_SHORT"
warn "  2. Rebuild the application"
warn "  3. Restart PM2 process"
warn ""
warn "======================================"

if ! prompt_yes_no "Are you sure you want to rollback?"; then
    error "Rollback cancelled by user."
    exit 0
fi

# ---------------------------------------------------
# Step 2: Check for Database Migrations
# ---------------------------------------------------
log "Step 2/7: Checking for database migration conflicts..."

# Check if there are migration files in commits being rolled back
if git diff --name-only "$TARGET_COMMIT" "$CURRENT_COMMIT" | grep -q "src/server/prisma/migrations"; then
    warn "======================================"
    warn "  DATABASE MIGRATION WARNING"
    warn "======================================"
    warn "Database migrations were changed in the commits being rolled back."
    warn ""
    warn "Rolling back code will NOT rollback database migrations."
    warn "You may need to manually revert database schema changes."
    warn ""
    warn "Migration files changed:"
    git diff --name-only "$TARGET_COMMIT" "$CURRENT_COMMIT" | grep "src/server/prisma/migrations" | sed 's/^/  - /'
    warn ""
    warn "======================================"

    if ! prompt_yes_no "Do you understand and want to continue?"; then
        error "Rollback cancelled by user."
        exit 0
    fi
fi

# ---------------------------------------------------
# Step 3: Git Rollback
# ---------------------------------------------------
log "Step 3/7: Rolling back git repository..."

# Stash any uncommitted changes
if ! git diff-index --quiet HEAD --; then
    warn "Uncommitted changes detected. Stashing..."
    git stash save "Rollback stash - $(date +'%Y-%m-%d %H:%M:%S')"
fi

# Reset to target commit
log "Resetting to commit: $TARGET_COMMIT_SHORT"
git reset --hard "$TARGET_COMMIT"

if [ $? -ne 0 ]; then
    error "Git reset failed!"
    exit 1
fi

log "Git repository rolled back successfully"

# ---------------------------------------------------
# Step 4: Install Dependencies
# ---------------------------------------------------
log "Step 4/7: Installing dependencies..."

# Check if package.json changed
if git diff --name-only "$TARGET_COMMIT" "$CURRENT_COMMIT" | grep -q "package"; then
    warn "package.json changed. Running npm install..."
    npm install

    if [ $? -ne 0 ]; then
        error "npm install failed!"
        error "You may need to manually fix dependencies."
        exit 1
    fi
else
    log "No package changes detected. Skipping npm install."
fi

# ---------------------------------------------------
# Step 5: Rebuild Application
# ---------------------------------------------------
log "Step 5/7: Rebuilding application..."

# Clean previous build
rm -rf .next

# Build application
npm run build

if [ $? -ne 0 ]; then
    error "Build failed!"
    error "Rollback incomplete. Application may not start."
    exit 1
fi

log "Build completed successfully"

# ---------------------------------------------------
# Step 6: Restart PM2
# ---------------------------------------------------
log "Step 6/7: Restarting PM2 process..."

# Restart PM2 app
pm2 restart "$PM2_APP_NAME"

if [ $? -ne 0 ]; then
    error "PM2 restart failed!"
    exit 1
fi

# Wait for application to start
log "Waiting for application to start..."
sleep 10

# ---------------------------------------------------
# Step 7: Health Check
# ---------------------------------------------------
log "Step 7/7: Running health checks..."

# Wait up to 60 seconds for app to be ready
RETRY_COUNT=0
MAX_RETRIES=12  # 12 * 5 = 60 seconds

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Check health endpoint
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
    HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r .status 2>/dev/null || echo "")

    if [ "$HEALTH_STATUS" == "ok" ]; then
        log "Application is healthy and responding"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    info "Waiting for application to start... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "======================================"
    error "  ROLLBACK VERIFICATION FAILED"
    error "======================================"
    error "Application failed to start within 60 seconds after rollback."
    error ""
    error "Check PM2 logs for errors:"
    error "  pm2 logs $PM2_APP_NAME"
    error ""
    error "Rollback log: $ROLLBACK_LOG"
    error "======================================"
    exit 1
fi

# Final health check
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r .status 2>/dev/null || echo "")

if [ "$HEALTH_STATUS" != "ok" ]; then
    error "Health check failed! Response: $HEALTH_RESPONSE"
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
# Post-Rollback Summary
# ---------------------------------------------------
log "======================================"
log "  Rollback Summary"
log "======================================"
log "Previous commit: $CURRENT_COMMIT_SHORT - $CURRENT_COMMIT_MESSAGE"
log "Current commit:  $TARGET_COMMIT_SHORT - $TARGET_COMMIT_MESSAGE"
log "Application:     $PM2_APP_NAME"
log "Status:          Running"
log "Health:          OK"
log "Rollback log:    $ROLLBACK_LOG"
log "======================================"
log "✅ Rollback completed successfully!"
log "======================================"

# Show PM2 status
log ""
log "PM2 Status:"
pm2 list | grep "$PM2_APP_NAME"

# Show recent logs
log ""
log "Recent logs (last 10 lines):"
pm2 logs "$PM2_APP_NAME" --lines 10 --nostream

log ""
log "Rollback script completed."
exit 0
