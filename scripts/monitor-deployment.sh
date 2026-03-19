#!/bin/bash
# ===================================================
# ABOV3 Exodus - Deployment Monitoring Script
# ===================================================
#
# This script monitors the health of a deployment for a specified duration.
# It continuously checks the health endpoint and reports status.
#
# Supports all environments: DEV, TEST, PROD
#
# Usage:
#   ./scripts/monitor-deployment.sh <environment> [duration_seconds]
#
# Examples:
#   ./scripts/monitor-deployment.sh dev          # Monitor DEV for 5 minutes (default)
#   ./scripts/monitor-deployment.sh test 600     # Monitor TEST for 10 minutes
#   ./scripts/monitor-deployment.sh prod 1800    # Monitor PROD for 30 minutes
#
# Exit codes:
#   0 - All health checks passed
#   1 - Health check failed
#   2 - Invalid arguments
#
# ===================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# ---------------------------------------------------
# Configuration
# ---------------------------------------------------
ENVIRONMENT=$1
DURATION=${2:-300}  # Default 5 minutes (300 seconds)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---------------------------------------------------
# Functions
# ---------------------------------------------------
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅${NC} $1"
}

failure() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌${NC} $1"
}

usage() {
    echo "Usage: $0 {dev|test|prod} [duration_seconds]"
    echo ""
    echo "Environments:"
    echo "  dev   - Development environment (http://localhost:3000 or 192.168.1.100:3000)"
    echo "  test  - Test/Staging environment (http://192.168.1.101:3000)"
    echo "  prod  - Production environment (https://exodus.abov3.ai)"
    echo ""
    echo "Options:"
    echo "  duration_seconds  - How long to monitor (default: 300 seconds / 5 minutes)"
    echo ""
    echo "Examples:"
    echo "  $0 dev          # Monitor DEV for 5 minutes"
    echo "  $0 test 600     # Monitor TEST for 10 minutes"
    echo "  $0 prod 1800    # Monitor PROD for 30 minutes"
    exit 2
}

# ---------------------------------------------------
# Argument Validation
# ---------------------------------------------------
if [ -z "$ENVIRONMENT" ]; then
    error "Environment not specified"
    usage
fi

# Set endpoint based on environment
case $ENVIRONMENT in
    dev)
        # Try localhost first, fall back to VM IP
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            ENDPOINT="http://localhost:3000"
        else
            ENDPOINT="http://192.168.1.100:3000"
        fi
        ENVIRONMENT_NAME="Development"
        ;;
    test)
        ENDPOINT="http://192.168.1.101:3000"
        ENVIRONMENT_NAME="Test/Staging"
        ;;
    prod)
        ENDPOINT="https://exodus.abov3.ai"
        ENVIRONMENT_NAME="Production"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT"
        usage
        ;;
esac

# Validate duration
if ! [[ "$DURATION" =~ ^[0-9]+$ ]]; then
    error "Invalid duration: $DURATION (must be a number)"
    usage
fi

if [ "$DURATION" -lt 10 ]; then
    error "Duration too short: $DURATION (minimum 10 seconds)"
    usage
fi

# ---------------------------------------------------
# Monitoring Setup
# ---------------------------------------------------
log "======================================"
log "  Deployment Monitoring"
log "======================================"
log "Environment:  $ENVIRONMENT_NAME ($ENVIRONMENT)"
log "Endpoint:     $ENDPOINT"
log "Duration:     $DURATION seconds ($(($DURATION / 60)) minutes)"
log "Check interval: 30 seconds"
log "======================================"

# Calculate statistics
START_TIME=$(date +%s)
END_TIME=$(($START_TIME + $DURATION))
CHECK_INTERVAL=30
TOTAL_CHECKS=$(($DURATION / $CHECK_INTERVAL))
PASSED_CHECKS=0
FAILED_CHECKS=0

log "Starting monitoring at $(date +'%Y-%m-%d %H:%M:%S')"
log "Will end at $(date -d @$END_TIME +'%Y-%m-%d %H:%M:%S')"
echo ""

# ---------------------------------------------------
# Monitoring Loop
# ---------------------------------------------------
CHECK_NUMBER=0

while [ $(date +%s) -lt $END_TIME ]; do
    CHECK_NUMBER=$((CHECK_NUMBER + 1))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    REMAINING=$((END_TIME - CURRENT_TIME))

    # Progress indicator
    PROGRESS=$((ELAPSED * 100 / DURATION))
    info "Check $CHECK_NUMBER/$TOTAL_CHECKS (${PROGRESS}% complete, ${REMAINING}s remaining)"

    # Check health endpoint
    HEALTH_RESPONSE=$(curl -sf --max-time 5 "$ENDPOINT/api/health" 2>&1)
    HEALTH_EXIT_CODE=$?

    if [ $HEALTH_EXIT_CODE -eq 0 ]; then
        # Parse response
        HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r .status 2>/dev/null || echo "unknown")

        if [ "$HEALTH_STATUS" == "ok" ]; then
            success "Health check PASSED - Status: $HEALTH_STATUS"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))

            # Optional: Check metrics endpoint
            if curl -sf --max-time 5 "$ENDPOINT/api/metrics" > /dev/null 2>&1; then
                info "  Metrics endpoint: OK"
            else
                warn "  Metrics endpoint: Not responding"
            fi

        else
            failure "Health check FAILED - Unexpected status: $HEALTH_STATUS"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            warn "  Response: $HEALTH_RESPONSE"
        fi

    else
        failure "Health check FAILED - Endpoint not reachable"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        warn "  Error: $HEALTH_RESPONSE"
    fi

    echo ""

    # If we're past the end time, break
    if [ $(date +%s) -ge $END_TIME ]; then
        break
    fi

    # Wait for next check
    sleep $CHECK_INTERVAL
done

# ---------------------------------------------------
# Final Summary
# ---------------------------------------------------
FINISH_TIME=$(date +%s)
ACTUAL_DURATION=$((FINISH_TIME - START_TIME))
SUCCESS_RATE=$((PASSED_CHECKS * 100 / (PASSED_CHECKS + FAILED_CHECKS)))

log "======================================"
log "  Monitoring Summary"
log "======================================"
log "Environment:      $ENVIRONMENT_NAME ($ENVIRONMENT)"
log "Endpoint:         $ENDPOINT"
log "Duration:         ${ACTUAL_DURATION}s ($(($ACTUAL_DURATION / 60)) minutes)"
log "Total Checks:     $((PASSED_CHECKS + FAILED_CHECKS))"
log "Passed:           $PASSED_CHECKS"
log "Failed:           $FAILED_CHECKS"
log "Success Rate:     ${SUCCESS_RATE}%"
log "======================================"

if [ $FAILED_CHECKS -eq 0 ]; then
    success "✅ All health checks passed!"
    success "Deployment is stable and healthy."
    log "======================================"
    exit 0
else
    failure "❌ Some health checks failed!"
    failure "Deployment may be unstable."

    if [ $SUCCESS_RATE -lt 90 ]; then
        error "Success rate below 90% - CRITICAL"
        error "Immediate investigation required!"
    elif [ $SUCCESS_RATE -lt 95 ]; then
        warn "Success rate below 95% - WARNING"
        warn "Consider investigating intermittent issues."
    fi

    log "======================================"

    # Suggestions
    echo ""
    warn "Troubleshooting suggestions:"

    case $ENVIRONMENT in
        dev)
            warn "  - Check if dev server is running: npm run dev"
            warn "  - Check PM2 status: pm2 status"
            warn "  - Check logs: pm2 logs or check terminal"
            ;;
        test)
            warn "  - Check PM2 status: pm2 status"
            warn "  - Check logs: pm2 logs abov3-exodus-test"
            warn "  - Check system resources: free -h && df -h"
            ;;
        prod)
            warn "  - Check pod status: kubectl get pods -l app=abov3-exodus"
            warn "  - Check logs: kubectl logs -f deployment/abov3-exodus"
            warn "  - Check events: kubectl get events --sort-by='.lastTimestamp'"
            ;;
    esac

    echo ""
    exit 1
fi
