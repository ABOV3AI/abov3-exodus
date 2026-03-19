#!/bin/bash
# ===================================================
# ABOV3 Exodus - Production Kubernetes Rollback Script
# ===================================================
#
# This script rolls back a Kubernetes deployment to a previous revision.
# It provides safe rollback with comprehensive health checks and monitoring.
#
# Environment: PROD (DigitalOcean Kubernetes)
# Orchestrator: Kubernetes
#
# Usage:
#   ./scripts/rollback-production.sh [revision_number]
#
# Examples:
#   ./scripts/rollback-production.sh        # Rollback to previous revision
#   ./scripts/rollback-production.sh 3      # Rollback to revision #3
#
# Prerequisites:
#   - kubectl configured with production cluster access
#   - curl or kubectl run with curl image
#
# ===================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# ---------------------------------------------------
# Configuration
# ---------------------------------------------------
K8S_DEPLOYMENT="abov3-exodus"
K8S_NAMESPACE="default"
REVISION_TARGET="$1"  # Optional: specific revision number

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

# ---------------------------------------------------
# Pre-rollback Checks
# ---------------------------------------------------
log "======================================"
log "  Production Rollback"
log "======================================"

# Check required commands
log "Checking required tools..."
check_command kubectl

# Verify kubectl context
CURRENT_CONTEXT=$(kubectl config current-context)
log "Current kubectl context: $CURRENT_CONTEXT"

if ! prompt_yes_no "Is this the correct production cluster?"; then
    error "Rollback cancelled. Please switch to the correct cluster."
    exit 1
fi

# ---------------------------------------------------
# Step 1: Get Deployment History
# ---------------------------------------------------
log "Step 1/7: Retrieving deployment history..."

# Get rollout history
log "Deployment rollout history:"
kubectl rollout history deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE

echo ""

# Get current revision
CURRENT_REVISION=$(kubectl get deployment $K8S_DEPLOYMENT -n $K8S_NAMESPACE -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
log "Current revision: $CURRENT_REVISION"

# Determine target revision
if [ -z "$REVISION_TARGET" ]; then
    # Rollback to previous revision (one before current)
    TARGET_REVISION=$((CURRENT_REVISION - 1))
    log "Target revision:  $TARGET_REVISION (previous)"
else
    # Rollback to specific revision
    TARGET_REVISION=$REVISION_TARGET
    log "Target revision:  $TARGET_REVISION (specified)"
fi

# Validate target revision
if [ "$TARGET_REVISION" -lt 1 ]; then
    error "Invalid target revision: $TARGET_REVISION"
    error "Cannot rollback before revision 1."
    exit 1
fi

if [ "$CURRENT_REVISION" -eq "$TARGET_REVISION" ]; then
    warn "Already at target revision. Nothing to rollback."
    exit 0
fi

# Get revision details
log "Target revision details:"
kubectl rollout history deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE --revision=$TARGET_REVISION

echo ""

# ---------------------------------------------------
# Step 2: Current State Snapshot
# ---------------------------------------------------
log "Step 2/7: Capturing current state..."

# Get current pod count
CURRENT_PODS=$(kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT --field-selector=status.phase=Running --no-headers | wc -l)
log "Currently running pods: $CURRENT_PODS"

# Get current image
CURRENT_IMAGE=$(kubectl get deployment $K8S_DEPLOYMENT -n $K8S_NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
log "Current image: $CURRENT_IMAGE"

# ---------------------------------------------------
# Confirmation
# ---------------------------------------------------
warn "======================================"
warn "  PRODUCTION ROLLBACK WARNING"
warn "======================================"
warn "You are about to rollback PRODUCTION deployment."
warn ""
warn "Cluster:     $CURRENT_CONTEXT"
warn "Deployment:  $K8S_DEPLOYMENT"
warn "Namespace:   $K8S_NAMESPACE"
warn ""
warn "From: Revision $CURRENT_REVISION"
warn "To:   Revision $TARGET_REVISION"
warn ""
warn "This will:"
warn "  1. Rollback deployment to revision $TARGET_REVISION"
warn "  2. Trigger a rolling update"
warn "  3. Replace all pods with previous version"
warn ""
warn "======================================"

if ! prompt_yes_no "Are you absolutely sure you want to rollback PRODUCTION?"; then
    error "Rollback cancelled by user."
    exit 0
fi

# ---------------------------------------------------
# Step 3: Perform Rollback
# ---------------------------------------------------
log "Step 3/7: Performing Kubernetes rollback..."

if [ -z "$REVISION_TARGET" ]; then
    # Rollback to previous revision
    log "Rolling back to previous revision..."
    kubectl rollout undo deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE
else
    # Rollback to specific revision
    log "Rolling back to revision $TARGET_REVISION..."
    kubectl rollout undo deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE --to-revision=$TARGET_REVISION
fi

if [ $? -ne 0 ]; then
    error "Rollback command failed!"
    exit 1
fi

log "Rollback initiated successfully"

# ---------------------------------------------------
# Step 4: Monitor Rollout
# ---------------------------------------------------
log "Step 4/7: Monitoring rollout progress..."

# Watch rollout status
log "Watching rollout (timeout: 5 minutes)..."
kubectl rollout status deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE --timeout=5m

if [ $? -ne 0 ]; then
    error "======================================"
    error "  ROLLBACK FAILED"
    error "======================================"
    error "Rollout did not complete successfully within 5 minutes."
    error ""
    error "Check pod status:"
    error "  kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT"
    error ""
    error "Check deployment events:"
    error "  kubectl describe deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE"
    error ""
    error "Check pod logs:"
    error "  kubectl logs -f deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE"
    error ""
    error "======================================"
    exit 1
fi

log "Rollout completed successfully"

# ---------------------------------------------------
# Step 5: Verify Pod Status
# ---------------------------------------------------
log "Step 5/7: Verifying pod status..."

# Wait a moment for pods to stabilize
sleep 10

# Get new pod count
NEW_PODS=$(kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT --field-selector=status.phase=Running --no-headers | wc -l)
log "Running pods after rollback: $NEW_PODS"

if [ "$NEW_PODS" -lt "$CURRENT_PODS" ]; then
    warn "Pod count decreased from $CURRENT_PODS to $NEW_PODS"
    warn "Some pods may still be starting."
fi

# Show pod status
log "Pod status:"
kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT

# Get new image
NEW_IMAGE=$(kubectl get deployment $K8S_DEPLOYMENT -n $K8S_NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
log "New image: $NEW_IMAGE"

# ---------------------------------------------------
# Step 6: Health Check
# ---------------------------------------------------
log "Step 6/7: Running health checks..."

# Wait for health endpoint to be ready
log "Waiting for application to be healthy..."
sleep 15

# Create a timestamp for unique pod names
TIMESTAMP=$(date +%s)

# Check health endpoint via kubectl run
log "Checking health endpoint..."
HEALTH_CHECK_OUTPUT=$(kubectl run health-check-rollback-$TIMESTAMP \
    --rm -i --restart=Never --image=curlimages/curl \
    -n $K8S_NAMESPACE \
    -- curl -sf --max-time 10 http://$K8S_DEPLOYMENT/api/health 2>&1)

HEALTH_EXIT_CODE=$?

if [ $HEALTH_EXIT_CODE -eq 0 ]; then
    HEALTH_STATUS=$(echo "$HEALTH_CHECK_OUTPUT" | jq -r .status 2>/dev/null || echo "")

    if [ "$HEALTH_STATUS" == "ok" ]; then
        log "Health check PASSED - Status: $HEALTH_STATUS"
    else
        warn "Health check returned unexpected status: $HEALTH_STATUS"
        warn "Response: $HEALTH_CHECK_OUTPUT"
    fi
else
    error "======================================"
    error "  HEALTH CHECK FAILED"
    error "======================================"
    error "Application health check failed after rollback!"
    error ""
    error "Output: $HEALTH_CHECK_OUTPUT"
    error ""
    error "Troubleshooting:"
    error "  kubectl get pods -l app=$K8S_DEPLOYMENT -n $K8S_NAMESPACE"
    error "  kubectl logs -f deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE"
    error "  kubectl describe deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE"
    error ""
    error "Consider rolling back further or investigating the issue."
    error "======================================"
    exit 1
fi

# Check metrics endpoint
log "Checking metrics endpoint..."
kubectl run metrics-check-rollback-$TIMESTAMP \
    --rm -i --restart=Never --image=curlimages/curl \
    -n $K8S_NAMESPACE \
    -- curl -sf --max-time 10 http://$K8S_DEPLOYMENT/api/metrics > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log "Metrics endpoint is responding correctly"
else
    warn "Metrics endpoint may not be working correctly"
fi

# ---------------------------------------------------
# Step 7: Post-Rollback Monitoring
# ---------------------------------------------------
log "Step 7/7: Post-rollback monitoring (2 minutes)..."

# Monitor for 2 minutes
MONITOR_COUNT=0
MAX_MONITOR=4  # 4 checks * 30 seconds = 2 minutes

while [ $MONITOR_COUNT -lt $MAX_MONITOR ]; do
    MONITOR_COUNT=$((MONITOR_COUNT + 1))

    # Check pod status
    RUNNING_PODS=$(kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT --field-selector=status.phase=Running --no-headers | wc -l)

    if [ "$RUNNING_PODS" -lt 1 ]; then
        error "No running pods detected! Rollback may have failed."
        exit 1
    fi

    log "Monitor check $MONITOR_COUNT/$MAX_MONITOR - Running pods: $RUNNING_PODS"

    # Quick health check
    kubectl run quick-health-$TIMESTAMP-$MONITOR_COUNT \
        --rm -i --restart=Never --image=curlimages/curl \
        -n $K8S_NAMESPACE --timeout=30s \
        -- curl -sf --max-time 5 http://$K8S_DEPLOYMENT/api/health > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log "  Health: OK"
    else
        warn "  Health: Failed"
    fi

    if [ $MONITOR_COUNT -lt $MAX_MONITOR ]; then
        sleep 30
    fi
done

# ---------------------------------------------------
# Final Summary
# ---------------------------------------------------
log "======================================"
log "  Rollback Summary"
log "======================================"
log "Cluster:         $CURRENT_CONTEXT"
log "Deployment:      $K8S_DEPLOYMENT"
log "Namespace:       $K8S_NAMESPACE"
log "Previous rev:    $CURRENT_REVISION"
log "Current rev:     $TARGET_REVISION"
log "Previous image:  $CURRENT_IMAGE"
log "Current image:   $NEW_IMAGE"
log "Running pods:    $NEW_PODS"
log "Health status:   OK"
log "======================================"
log "✅ Production rollback completed successfully!"
log "======================================"

# Show deployment details
log ""
log "Deployment details:"
kubectl get deployment $K8S_DEPLOYMENT -n $K8S_NAMESPACE

log ""
log "Pod status:"
kubectl get pods -n $K8S_NAMESPACE -l app=$K8S_DEPLOYMENT

# Show recent logs
log ""
log "Recent logs (last 20 lines):"
kubectl logs -n $K8S_NAMESPACE --tail=20 deployment/$K8S_DEPLOYMENT

log ""
info "Continue monitoring the deployment for the next 15-30 minutes."
info "Watch for any errors or unusual behavior."
info ""
info "Monitoring commands:"
info "  kubectl get pods -l app=$K8S_DEPLOYMENT -n $K8S_NAMESPACE -w"
info "  kubectl logs -f deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE"
info "  ./scripts/monitor-deployment.sh prod 900"
info ""

log "Rollback script completed."
exit 0
