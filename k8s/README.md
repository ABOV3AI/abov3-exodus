# ABOV3 Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the ABOV3 platform.

## Prerequisites

- K3s or Kubernetes cluster
- kubectl configured
- cert-manager installed
- Traefik ingress controller (default with K3s)

## Quick Start

```bash
# 1. Create secrets (copy template and fill in values)
cp secrets-template.yaml secrets.yaml
# Edit secrets.yaml with your values
kubectl apply -f secrets.yaml

# 2. Deploy PostgreSQL
kubectl apply -f postgres-deployment.yaml

# 3. Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

# 4. Deploy services
kubectl apply -f exodus-deployment.yaml
kubectl apply -f eden-deployment.yaml
kubectl apply -f pauline-deployment.yaml

# 5. Deploy ingress
kubectl apply -f ingress.yaml

# 6. Verify all pods are running
kubectl get pods
```

## Services

| Service | Subdomain | Port | Description |
|---------|-----------|------|-------------|
| Exodus | exodus.abov3.ai | 3000 | Main Next.js application |
| Eden | eden.abov3.ai | 3100 | MCP Server for tools |
| Pauline | pauline.abov3.ai | 8004 | TTS Service (CPU mode) |
| PostgreSQL | internal | 5432 | Database |

## Configuration

### Secrets

Create `secrets.yaml` from `secrets-template.yaml` with:
- `nextauth-secret`: 32-character random string
- `db-credentials.url`: PostgreSQL connection URL
- `db-credentials.password`: Database password

### Pauline (TTS)

By default, Pauline runs in CPU mode. For GPU mode:
1. Edit `pauline-deployment.yaml`
2. Change `device: cpu` to `device: cuda` in ConfigMap
3. Add GPU resources request to container spec

## Master Developer Setup

After deployment, run this SQL to set up the master account:

```sql
-- Set Master Developer account
UPDATE "User"
SET
  "isMasterDev" = true,
  "role" = 'MASTER',
  "isAdmin" = true
WHERE email = 'fahad.fajardo@abov3.com';
```

## Disable Signups

```sql
INSERT INTO "AdminSettings" ("id", "allowSignups", "requireEmailVerification", "smtpSecure")
VALUES (gen_random_uuid(), false, false, true)
ON CONFLICT DO NOTHING;
```

---

## Local VM Simulation

For testing before deploying to Hetzner, use a local VM that matches production specs.

### VM Requirements (Match Hetzner CPX31)

| Resource | Value |
|----------|-------|
| vCPU | 4 cores |
| RAM | 8 GB |
| Disk | 60 GB |
| OS | Ubuntu 22.04 LTS Server |

### Quick Setup (VMware/VirtualBox)

1. Create VM with specs above
2. Install Ubuntu 22.04 LTS Server
3. Copy `k8s/` directory to VM
4. Run setup script:

```bash
chmod +x setup-k3s-sim.sh
./setup-k3s-sim.sh
```

5. Add to your **host machine's** hosts file:

```
<VM_IP>  exodus.abov3.local pauline.abov3.local eden.abov3.local
```

6. Deploy services:

```bash
kubectl apply -f secrets.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f exodus-deployment.yaml
kubectl apply -f eden-deployment.yaml
kubectl apply -f pauline-deployment.yaml
kubectl apply -f ingress-local.yaml  # Use local ingress (no SSL)
```

7. Access at:
   - http://exodus.abov3.local
   - http://eden.abov3.local
   - http://pauline.abov3.local

### Files

| File | Purpose |
|------|---------|
| `setup-k3s-sim.sh` | K3s installation script |
| `ingress-local.yaml` | Local ingress (*.abov3.local, no SSL) |
| `ingress.yaml` | Production ingress (*.abov3.ai, with SSL) |
