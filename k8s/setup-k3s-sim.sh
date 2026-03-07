#!/bin/bash
# ABOV3 K3s Simulation Setup Script
# Matches Hetzner CPX31 production environment
#
# Prerequisites:
#   - Ubuntu 22.04 LTS Server
#   - 4 vCPU, 8GB RAM, 60GB disk
#   - Internet access
#
# Usage:
#   chmod +x setup-k3s-sim.sh
#   ./setup-k3s-sim.sh

set -e

echo "========================================"
echo "  ABOV3 K3s Simulation Setup"
echo "  Matching Hetzner CPX31 environment"
echo "========================================"
echo ""

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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Do not run as root. Script will use sudo when needed."
    exit 1
fi

# Check system requirements
log_step "Checking system requirements..."
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
CPU_CORES=$(nproc)

if [ "$TOTAL_MEM" -lt 7 ]; then
    log_warn "System has ${TOTAL_MEM}GB RAM. Recommended: 8GB"
fi

if [ "$CPU_CORES" -lt 4 ]; then
    log_warn "System has ${CPU_CORES} CPU cores. Recommended: 4"
fi

echo "  RAM: ${TOTAL_MEM}GB"
echo "  CPUs: ${CPU_CORES}"
echo ""

# Step 1: System update
log_step "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install prerequisites
log_step "Installing prerequisites..."
sudo apt install -y \
    curl \
    wget \
    git \
    ufw \
    fail2ban \
    htop \
    net-tools

# Step 3: Configure firewall
log_step "Configuring firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 6443/tcp  # K3s API server
sudo ufw allow 10250/tcp # Kubelet metrics
sudo ufw --force enable

echo "  Firewall configured: SSH, HTTP, HTTPS, K3s API"

# Step 4: Install K3s
log_step "Installing K3s (lightweight Kubernetes)..."
curl -sfL https://get.k3s.io | sh -

# Step 5: Wait for K3s to be ready
log_step "Waiting for K3s to initialize..."
sleep 10

# Check if k3s is running
if ! sudo systemctl is-active --quiet k3s; then
    log_error "K3s failed to start. Check: sudo journalctl -u k3s"
    exit 1
fi

# Wait for node to be ready
echo "  Waiting for node to be ready..."
sudo kubectl wait --for=condition=ready node --all --timeout=120s

# Step 6: Configure kubectl for current user
log_step "Configuring kubectl for user: $USER"
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
chmod 600 ~/.kube/config

# Also add to bashrc for persistence
if ! grep -q "KUBECONFIG" ~/.bashrc; then
    echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
fi

# Step 7: Verify installation
log_step "Verifying K3s installation..."
echo ""
echo "Nodes:"
kubectl get nodes
echo ""
echo "System pods:"
kubectl get pods -A
echo ""

# Step 8: Install metrics server (for kubectl top)
log_step "Metrics server is included in K3s by default"

# Step 9: Show cluster info
log_step "Cluster information:"
kubectl cluster-info
echo ""

# Get node IP
NODE_IP=$(hostname -I | awk '{print $1}')

echo "========================================"
echo -e "${GREEN}  K3s Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Node IP: $NODE_IP"
echo ""
echo "Next steps:"
echo "  1. Add to your HOST machine's /etc/hosts:"
echo "     $NODE_IP  exodus.abov3.local pauline.abov3.local eden.abov3.local"
echo ""
echo "  2. Copy k8s/ directory to this VM"
echo ""
echo "  3. Create secrets:"
echo "     cp k8s/secrets-template.yaml k8s/secrets.yaml"
echo "     # Edit secrets.yaml with your values"
echo "     kubectl apply -f k8s/secrets.yaml"
echo ""
echo "  4. Deploy services:"
echo "     kubectl apply -f k8s/postgres-deployment.yaml"
echo "     kubectl apply -f k8s/exodus-deployment.yaml"
echo "     kubectl apply -f k8s/eden-deployment.yaml"
echo "     kubectl apply -f k8s/pauline-deployment.yaml"
echo "     kubectl apply -f k8s/ingress-local.yaml"
echo ""
echo "  5. Verify deployment:"
echo "     kubectl get pods -w"
echo ""
echo "  6. Access services:"
echo "     http://exodus.abov3.local"
echo "     http://eden.abov3.local"
echo "     http://pauline.abov3.local"
echo ""
