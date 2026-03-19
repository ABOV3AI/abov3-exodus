# ABOV3 Exodus - Deployment Runbook

**Operations guide for deploying and managing ABOV3 Exodus across all environments**

---

## Quick Reference

| Environment | Domain | Deployment Method | Health Check |
|-------------|--------|-------------------|--------------|
| **DEV** | http://localhost:3000 | `npm run dev` | `curl http://localhost:3000/api/health` |
| **TEST** | http://192.168.1.101:3000 | Webhook/PM2 | `curl http://192.168.1.101:3000/api/health` |
| **PROD** | https://exodus.abov3.ai | Kubernetes | `curl https://exodus.abov3.ai/api/health` |

---

## Table of Contents

1. [Deployment Workflows](#deployment-workflows)
2. [Environment Operations](#environment-operations)
3. [Database Migrations](#database-migrations)
4. [Monitoring and Health Checks](#monitoring-and-health-checks)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Procedures](#emergency-procedures)

---

## Deployment Workflows

### DEV Environment

**Purpose**: Local development and rapid iteration

**Start Development Server**:
```bash
# Navigate to project
cd ~/abov3/abov3-exodus

# Copy environment file (first time only)
cp .env.example .env.dev
# Edit .env.dev with local configuration

# Start development server (hot reload)
npm run dev

# Or with PM2 (persistent)
pm2 start ecosystem.config.js --env dev
pm2 save
```

**Run Database Migrations**:
```bash
# Quick schema sync (development only)
npm run db:push

# Create migration file (when ready to commit)
npx prisma migrate dev --name add_feature_xyz

# View database
npx prisma studio
```

**Health Check**:
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

---

### TEST Environment

**Purpose**: Pre-production testing, QA validation, performance testing

#### Automated Deployment (Recommended)

Deployments are triggered automatically when code is merged to `main` branch via GitHub Actions webhook.

**Setup Webhook** (one-time):
```bash
# On TEST VM (192.168.1.101)
# 1. Install webhook
sudo apt install webhook

# 2. Make script executable
chmod +x ~/abov3/abov3-exodus/scripts/deploy-webhook.sh

# 3. Create webhook configuration
cat > ~/webhook.json << 'EOF'
[
  {
    "id": "deploy",
    "execute-command": "/home/abov3admin/abov3/abov3-exodus/scripts/deploy-webhook.sh",
    "command-working-directory": "/home/abov3admin/abov3/abov3-exodus",
    "response-message": "Deployment triggered",
    "pass-arguments-to-command": []
  }
]
EOF

# 4. Start webhook server with PM2
pm2 start webhook -- -hooks ~/webhook.json -port 9000 -verbose
pm2 save
pm2 startup  # Enable auto-start on boot
```

**Trigger Deployment**:
```bash
# Via webhook (automatic from GitHub Actions)
curl -X POST http://192.168.1.101:9000/hooks/deploy

# Or manual deployment
cd ~/abov3/abov3-exodus
git pull origin main
npm run build
pm2 restart abov3-exodus-test
```

**Monitor Deployment**:
```bash
# Watch PM2 logs
pm2 logs abov3-exodus-test -f

# Run health checks for 10 minutes
./scripts/monitor-deployment.sh test 600

# Check PM2 status
pm2 status
pm2 monit
```

---

### PROD Environment

**Purpose**: Live production serving real users

#### Deployment Process (Semi-Automated)

**Step 1: Verify TEST Environment**
```bash
# Ensure TEST has been running successfully for 24+ hours
./scripts/monitor-deployment.sh test 300

# Check for errors in TEST logs
pm2 logs abov3-exodus-test --lines 100 | grep -i error
```

**Step 2: Create Version Tag**
```bash
# Create version tag (semantic versioning)
git tag v2.1.0
git push origin v2.1.0

# This triggers GitHub Actions to build and push Docker image
# Wait for CI to complete: https://github.com/abov3ai/exodus/actions
```

**Step 3: Manual Approval in GitHub**
- Navigate to GitHub Actions
- Find the "Deploy to Production" workflow
- Click "Review deployments"
- Approve deployment

**Step 4: Monitor Deployment**
```bash
# Watch rollout progress
kubectl rollout status deployment/abov3-exodus --timeout=5m

# Monitor application for 15 minutes
./scripts/monitor-deployment.sh prod 900

# Check pod logs
kubectl logs -f deployment/abov3-exodus
```

**Step 5: Verify Deployment**
```bash
# Check health
curl https://exodus.abov3.ai/api/health

# Check metrics
curl https://exodus.abov3.ai/api/metrics | grep nephesh

# Check pod status
kubectl get pods -l app=abov3-exodus

# Verify image version
kubectl get deployment abov3-exodus -o jsonpath='{.spec.template.spec.containers[0].image}'
```

---

## Environment Operations

### DEV Operations

**Start/Stop**:
```bash
# Start
npm run dev  # or pm2 start ecosystem.config.js --env dev

# Stop
Ctrl+C  # or pm2 stop abov3-exodus

# Restart
pm2 restart abov3-exodus
```

**Update Code**:
```bash
git pull
npm install  # if package.json changed
npm run dev  # hot reload handles the rest
```

**Reset Database**:
```bash
npx prisma migrate reset  # Drops database and re-applies all migrations
npm run db:seed  # Optional: Seed with test data
```

---

### TEST Operations

**Deploy Latest Code**:
```bash
# Automatic (recommended)
curl -X POST http://192.168.1.101:9000/hooks/deploy

# Manual
cd ~/abov3/abov3-exodus
git pull origin main
npm run build
pm2 restart abov3-exodus-test
```

**Check Deployment Status**:
```bash
pm2 status abov3-exodus-test
pm2 logs abov3-exodus-test --lines 50
pm2 monit  # Real-time monitoring
```

**Restart Application**:
```bash
pm2 restart abov3-exodus-test
pm2 save  # Save PM2 process list
```

**View Logs**:
```bash
# Real-time logs
pm2 logs abov3-exodus-test -f

# Last 100 lines
pm2 logs abov3-exodus-test --lines 100

# Error logs only
pm2 logs abov3-exodus-test --err --lines 50
```

---

### PROD Operations

**Deploy New Version**:
```bash
# See "PROD Environment" deployment process above
git tag v2.1.0
git push origin v2.1.0
# Wait for GitHub Actions approval
```

**Scale Deployment**:
```bash
# Manual scaling
kubectl scale deployment abov3-exodus --replicas=3

# Check HPA status (if enabled)
kubectl get hpa abov3-exodus

# Enable HPA (if not already enabled)
kubectl autoscale deployment abov3-exodus --min=2 --max=5 --cpu-percent=70
```

**Check Status**:
```bash
# Deployment status
kubectl get deployment abov3-exodus

# Pod status
kubectl get pods -l app=abov3-exodus

# Detailed info
kubectl describe deployment abov3-exodus
kubectl describe pod <pod-name>
```

**View Logs**:
```bash
# Real-time logs from deployment
kubectl logs -f deployment/abov3-exodus

# Logs from specific pod
kubectl logs -f <pod-name>

# Previous pod logs (after crash)
kubectl logs --previous <pod-name>

# Logs from all pods
kubectl logs -l app=abov3-exodus --tail=50
```

**Exec into Pod**:
```bash
# Get shell in pod
kubectl exec -it <pod-name> -- /bin/sh

# Run command in pod
kubectl exec <pod-name> -- node --version
```

---

## Database Migrations

### DEV Environment

**Create Migration**:
```bash
# 1. Modify schema in src/server/prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_user_preferences

# 3. Verify migration was created
ls src/server/prisma/migrations/

# 4. Commit migration files
git add src/server/prisma/
git commit -m "Add user preferences migration"
```

**Apply Existing Migrations**:
```bash
DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy
```

**Reset Database** (Development Only):
```bash
npx prisma migrate reset
# WARNING: This drops all data!
```

---

### TEST Environment

**Migrations are Automatic**:
- When code is deployed via webhook, migrations are detected and applied automatically
- See `scripts/deploy-webhook.sh` for implementation

**Manual Migration** (if needed):
```bash
cd ~/abov3/abov3-exodus

# Load environment
export $(grep -v '^#' .env.test | xargs)

# Apply migrations
DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy

# Verify
npx prisma migrate status
```

**Check Migration Status**:
```bash
export $(grep -v '^#' .env.test | xargs)
npx prisma migrate status
```

---

### PROD Environment

**⚠️ CRITICAL: Always Use Migration Script**

```bash
# Run safe migration script
./scripts/migrate-production.sh

# This script will:
# 1. Create database backup
# 2. Show pending migrations
# 3. Ask for confirmation
# 4. Apply migrations
# 5. Verify application health
```

**Manual Migration** (Emergency Only):
```bash
# Get pod name
POD_NAME=$(kubectl get pods -l app=abov3-exodus -o jsonpath='{.items[0].metadata.name}')

# Get database URL from secret
DATABASE_URL=$(kubectl get secret db-credentials -o jsonpath='{.data.direct-url}' | base64 -d)

# Check migration status
kubectl exec $POD_NAME -- sh -c "export DATABASE_URL='$DATABASE_URL' && npx prisma migrate status"

# Apply migrations
kubectl exec $POD_NAME -- sh -c "export DATABASE_URL='$DATABASE_URL' && npx prisma migrate deploy"
```

**Rollback Migration** (if needed):
```bash
# Restore from backup created by migrate-production.sh
gunzip ~/abov3-backups/backup-YYYYMMDD-HHMMSS.sql.gz
kubectl exec -it $POD_NAME -- psql $DATABASE_URL < ~/abov3-backups/backup-YYYYMMDD-HHMMSS.sql
```

---

## Monitoring and Health Checks

### Quick Health Checks

```bash
# DEV
curl http://localhost:3000/api/health

# TEST
curl http://192.168.1.101:3000/api/health

# PROD
curl https://exodus.abov3.ai/api/health
```

### Continuous Monitoring

**Monitor Deployment Script**:
```bash
# Monitor DEV for 5 minutes
./scripts/monitor-deployment.sh dev 300

# Monitor TEST for 10 minutes
./scripts/monitor-deployment.sh test 600

# Monitor PROD for 30 minutes
./scripts/monitor-deployment.sh prod 1800
```

**Metrics Endpoints**:
```bash
# View Prometheus metrics
curl http://localhost:3000/api/metrics

# Key metrics to watch:
# - nephesh_job_queue_depth - Jobs in queue
# - nephesh_active_jobs - Jobs executing
# - nephesh_jobs_failed_total - Failed jobs
# - nephesh_scheduler_heartbeat_running - Scheduler status
```

### PM2 Monitoring (DEV/TEST)

```bash
# Real-time monitoring dashboard
pm2 monit

# Process list
pm2 status

# Memory usage
pm2 list | grep -i memory

# CPU usage
pm2 list | grep -i cpu
```

### Kubernetes Monitoring (PROD)

```bash
# Pod status
kubectl get pods -l app=abov3-exodus

# Resource usage
kubectl top pods -l app=abov3-exodus

# Events
kubectl get events --sort-by='.lastTimestamp' | head -20

# Metrics (if Prometheus installed)
kubectl port-forward svc/prometheus-k8s 9090:9090
# Visit http://localhost:9090
```

---

## Rollback Procedures

### TEST Environment Rollback

**Using Rollback Script** (Recommended):
```bash
# Rollback to previous commit
./scripts/rollback-test.sh

# Rollback to specific commit
./scripts/rollback-test.sh abc1234

# Rollback 3 commits back
./scripts/rollback-test.sh HEAD~3
```

**Manual Rollback**:
```bash
cd ~/abov3/abov3-exodus

# Save current commit
CURRENT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT"

# Reset to previous commit
git reset --hard HEAD~1

# Rebuild
npm run build

# Restart
pm2 restart abov3-exodus-test

# Verify
curl http://192.168.1.101:3000/api/health
```

---

### PROD Environment Rollback

**Using Rollback Script** (Recommended):
```bash
# Rollback to previous revision
./scripts/rollback-production.sh

# Rollback to specific revision
./scripts/rollback-production.sh 3
```

**Manual Rollback**:
```bash
# View rollout history
kubectl rollout history deployment/abov3-exodus

# Rollback to previous revision
kubectl rollout undo deployment/abov3-exodus

# Rollback to specific revision
kubectl rollout undo deployment/abov3-exodus --to-revision=3

# Monitor rollout
kubectl rollout status deployment/abov3-exodus

# Verify health
curl https://exodus.abov3.ai/api/health
```

**Rollback Decision Matrix**:

| Severity | Response Time | Action |
|----------|---------------|--------|
| **Critical** (Site down) | Immediate | Execute rollback script |
| **High** (Major feature broken) | Within 15 minutes | Evaluate → Rollback if unfixable |
| **Medium** (Minor issue) | Within 1 hour | Attempt hotfix → Rollback if fails |
| **Low** (Cosmetic) | Next deployment cycle | Fix forward |

---

## Troubleshooting

### Application Won't Start

**DEV**:
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill process: kill -9 <PID>

# Check Node.js version
node --version  # Should be v22.x.x

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

**TEST**:
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs abov3-exodus-test --err --lines 50

# Restart PM2
pm2 restart abov3-exodus-test

# If still failing, check recent deployment log
tail -100 ~/abov3/abov3-exodus/logs/deploy-*.log
```

**PROD**:
```bash
# Check pod status
kubectl get pods -l app=abov3-exodus

# Describe failing pod
kubectl describe pod <pod-name>

# View pod logs
kubectl logs <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp' | grep abov3-exodus
```

---

### Database Connection Issues

**Check Connection String**:
```bash
# DEV/TEST
grep POSTGRES .env.dev  # or .env.test

# PROD
kubectl get secret db-credentials -o jsonpath='{.data.url}' | base64 -d
```

**Test Database Connection**:
```bash
# DEV/TEST
psql -U abov3_user -d abov3_exodus_dev -h localhost

# PROD
kubectl run psql-test --rm -i --restart=Never --image=postgres:16 -- \
  psql "$DATABASE_URL" -c "SELECT 1;"
```

**Common Issues**:
- Port wrong (6432 for PgBouncer, 5432 for direct)
- Password incorrect
- PostgreSQL not running: `sudo systemctl status postgresql`
- PgBouncer not running: `sudo systemctl status pgbouncer`
- Firewall blocking connection
- Database doesn't exist

---

### High Memory Usage

**DEV/TEST** (PM2):
```bash
# Check memory usage
pm2 list

# Restart app if over limit
pm2 restart abov3-exodus-test

# Increase memory limit (if needed)
NODE_OPTIONS="--max-old-space-size=2048" pm2 restart abov3-exodus-test
```

**PROD** (Kubernetes):
```bash
# Check pod memory
kubectl top pods -l app=abov3-exodus

# Check if pods are being OOMKilled
kubectl describe pod <pod-name> | grep -A 5 "Last State"

# Increase memory limits in deployment
kubectl edit deployment abov3-exodus
# Edit: resources.limits.memory: "3Gi"
```

---

### Jobs Not Processing (Nephesh)

**Check Job Queue**:
```bash
# DEV/TEST
psql -U abov3_user -d abov3_exodus_dev -h localhost -c \
  "SELECT name, state, COUNT(*) FROM pgboss.job GROUP BY name, state;"

# PROD
kubectl exec <pod-name> -- psql $POSTGRES_PRISMA_URL -c \
  "SELECT name, state, COUNT(*) FROM pgboss.job GROUP BY name, state;"
```

**Check Worker Status**:
```bash
# Check metrics
curl http://localhost:3000/api/metrics | grep nephesh_active_jobs
curl http://localhost:3000/api/metrics | grep nephesh_scheduler

# Check logs for worker activity
pm2 logs | grep -i "nephesh worker"  # DEV/TEST
kubectl logs -f deployment/abov3-nephesh-worker  # PROD
```

**Common Issues**:
- Worker not started (check instrumentation.ts loaded)
- Database pg-boss tables don't exist
- Job timeout too short (increase JOB_TIMEOUT_MS)
- Worker crashed (check logs)

---

## Emergency Procedures

### Total Service Outage (PROD)

**Immediate Actions** (within 5 minutes):
1. **Assess severity**: Check if all pods are down
   ```bash
   kubectl get pods -l app=abov3-exodus
   ```

2. **Check recent changes**: Was there a deployment?
   ```bash
   kubectl rollout history deployment/abov3-exodus
   ```

3. **Rollback if deployment-related**:
   ```bash
   ./scripts/rollback-production.sh
   ```

4. **Notify team**: Post in #incidents Slack channel

5. **Monitor recovery**:
   ```bash
   ./scripts/monitor-deployment.sh prod 600
   ```

**If rollback doesn't work**:
1. Check database connectivity
2. Check DigitalOcean status page
3. Check Kubernetes cluster health: `kubectl get nodes`
4. Scale deployment to 0 and back: `kubectl scale deployment abov3-exodus --replicas=0 && sleep 10 && kubectl scale deployment abov3-exodus --replicas=2`

---

### Database Corruption

**Immediate Actions**:
1. **Stop writes** (if possible):
   ```bash
   kubectl scale deployment abov3-exodus --replicas=0
   ```

2. **Assess damage**:
   ```bash
   # Connect to database
   kubectl exec -it <pod-name> -- psql $POSTGRES_URL_NON_POOLING

   # Check tables
   \dt

   # Check for errors
   SELECT * FROM pg_stat_database WHERE datname = 'abov3_exodus_prod';
   ```

3. **Restore from backup**:
   ```bash
   # Get latest backup from DigitalOcean managed database UI
   # Or from migration backups
   ls -lh ~/abov3-backups/

   # Restore
   gunzip backup-YYYYMMDD-HHMMSS.sql.gz
   psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
   ```

4. **Restart application**:
   ```bash
   kubectl scale deployment abov3-exodus --replicas=2
   ```

---

### Security Incident

**If unauthorized access suspected**:

1. **Immediate containment**:
   ```bash
   # Rotate all secrets
   kubectl delete secret auth-secrets db-credentials

   # Recreate with new values
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   kubectl create secret generic auth-secrets --from-literal=nextauth-secret="$NEXTAUTH_SECRET"

   # Restart deployment to pick up new secrets
   kubectl rollout restart deployment/abov3-exodus
   ```

2. **Audit logs**:
   ```bash
   # Check kubectl audit logs
   kubectl logs -l app=abov3-exodus --since=24h | grep -i "auth\|login\|admin"

   # Check database for suspicious activity
   psql $DATABASE_URL -c "SELECT * FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 50;"
   ```

3. **Notify team and stakeholders**

4. **Change all passwords**:
   - Database passwords
   - API keys
   - Service account credentials

---

## Related Documentation

- **Environment Configuration**: `ENVIRONMENTS.md`
- **Deployment Guides**:
  - Local VM: `LOCAL_VM_DEPLOYMENT.md`
  - DigitalOcean: `NEPHESH_DEPLOYMENT.md`
- **CI/CD Plan**: `C:\Users\fajar\.claude\plans\composed-splashing-harp.md`

---

**Last Updated**: 2026-03-15
**Version**: 1.0.0
**Maintainer**: DevOps Team
