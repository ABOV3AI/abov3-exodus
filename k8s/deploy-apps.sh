#!/bin/bash
# ABOV3 Application Deployment Script
# Run after K3s is installed (setup-k3s-sim.sh)
#
# Usage:
#   chmod +x deploy-apps.sh
#   ./deploy-apps.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  ABOV3 Application Deployment"
echo "========================================"
echo ""

# Check kubectl is working
log_step "Checking kubectl access..."
if ! kubectl get nodes &>/dev/null; then
    log_error "kubectl not working. Make sure K3s is installed and KUBECONFIG is set."
    echo "  Run: export KUBECONFIG=~/.kube/config"
    exit 1
fi

echo "  Cluster is accessible"
echo ""

# Check required files exist
log_step "Checking required files..."
REQUIRED_FILES=(
    "secrets.yaml"
    "postgres-deployment.yaml"
    "exodus-deployment.yaml"
    "eden-deployment.yaml"
    "pauline-deployment.yaml"
    "ingress-local.yaml"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Missing: $file"
        MISSING=1
    else
        echo "  Found: $file"
    fi
done

if [ $MISSING -eq 1 ]; then
    echo ""
    log_error "Missing required files. Create them before running this script."
    if [ ! -f "secrets.yaml" ] && [ -f "secrets-template.yaml" ]; then
        echo "  Hint: cp secrets-template.yaml secrets.yaml && nano secrets.yaml"
    fi
    exit 1
fi
echo ""

# Validate secrets.yaml doesn't have localhost
log_step "Validating secrets.yaml..."
if grep -q "localhost" secrets.yaml; then
    log_error "secrets.yaml contains 'localhost' in database URL."
    echo "  Change 'localhost' to 'postgres' for Kubernetes networking."
    echo "  Example: postgresql://pgsql:pgsql@postgres:5432/exodusdb"
    exit 1
fi
echo "  Secrets validated"
echo ""

# Apply secrets
log_step "Applying secrets..."
kubectl apply -f secrets.yaml
echo ""

# Deploy PostgreSQL
log_step "Deploying PostgreSQL..."
kubectl apply -f postgres-deployment.yaml
echo "  Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s
echo "  PostgreSQL is ready"
echo ""

# Deploy Exodus
log_step "Deploying Exodus (Next.js app)..."
kubectl apply -f exodus-deployment.yaml
echo ""

# Deploy Eden
log_step "Deploying Eden (MCP Server)..."
kubectl apply -f eden-deployment.yaml
echo ""

# Deploy Pauline
log_step "Deploying Pauline (TTS Service)..."
kubectl apply -f pauline-deployment.yaml
echo ""

# Deploy Ingress
log_step "Deploying local ingress..."
kubectl apply -f ingress-local.yaml
echo ""

# Wait for all pods
log_step "Waiting for all pods to be ready..."
echo "  This may take a few minutes for images to pull..."
echo ""

# Show pod status
kubectl get pods

echo ""
echo "========================================"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo "========================================"
echo ""

# Get node IP
NODE_IP=$(hostname -I | awk '{print $1}')

echo "Node IP: $NODE_IP"
echo ""
echo "Add to your HOST machine's hosts file:"
echo "  Windows: C:\\Windows\\System32\\drivers\\etc\\hosts"
echo "  Linux/Mac: /etc/hosts"
echo ""
echo "  $NODE_IP  exodus.abov3.local pauline.abov3.local eden.abov3.local"
echo ""
echo "Access services at:"
echo "  http://exodus.abov3.local"
echo "  http://eden.abov3.local"
echo "  http://pauline.abov3.local"
echo ""
echo "Monitor pods:"
echo "  kubectl get pods -w"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/exodus"
echo "  kubectl logs -f deployment/eden"
echo "  kubectl logs -f deployment/pauline"
echo ""
