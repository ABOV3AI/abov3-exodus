# ABOV3 Exodus - Environment Configuration Reference

This document provides a comprehensive reference for configuration differences across all deployment environments.

## Quick Reference Matrix

| Variable | DEV | TEST | PROD |
|----------|-----|------|------|
| **NODE_ENV** | development | production | production |
| **NEXT_PUBLIC_DEPLOYMENT_MODE** | local | cloud | cloud |
| **NEXTAUTH_URL** | http://192.168.1.100:3000 | http://192.168.1.101:3000 | https://exodus.abov3.ai |
| **POSTGRES_PRISMA_URL** | localhost:6432 | localhost:6432 | db-uuid.ondigitalocean.com:25060 |
| **Database Type** | Single-node | HA (primary+replica) | Managed HA |
| **Deployment Method** | npm run dev | PM2 production | Kubernetes |
| **SSL/TLS** | No | No | Yes (Let's Encrypt) |
| **Monitoring** | Manual logs | PM2 monit | Prometheus + Grafana |
| **Backup Strategy** | Manual pg_dump | Cron-based pg_dump | Automated 30-day retention |
| **Process Manager** | npm/node | PM2 | Kubernetes |
| **Scaling** | Vertical (VM size) | Vertical (VM size) | Horizontal (2-10 pods) |

---

## Environment Details

### DEV Environment (Developer Workstation / Local VM #1)

**Purpose**: Active development, rapid iteration, feature testing

**Infrastructure**:
- VMware Workstation Ubuntu VM or local development machine
- IP: `192.168.1.100` (or localhost)
- Specs: 4 vCPU, 8GB RAM, 50GB disk

**Database**:
- PostgreSQL 16 single-node
- PgBouncer for connection pooling
- Database name: `abov3_exodus_dev`

**Deployment**:
- Manual: `npm run dev` (hot reload)
- Or: `pm2 start ecosystem.config.js`

**Configuration File**: `.env.dev`
```bash
NODE_ENV=development
NEXT_PUBLIC_DEPLOYMENT_MODE=local
NEXTAUTH_URL=http://192.168.1.100:3000
NEXTAUTH_SECRET=dev_secret_min_32_characters_long_random

# Database
POSTGRES_PRISMA_URL=postgresql://abov3_user:password@localhost:6432/abov3_exodus_dev?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://abov3_user:password@localhost:5432/abov3_exodus_dev
DATABASE_URL=postgresql://abov3_user:password@localhost:5432/abov3_exodus_dev

# Worker
WORKER_MODE=nephesh
WORKER_CONCURRENCY=2
JOB_TIMEOUT_MS=300000

# Development flags
NEXT_TELEMETRY_DISABLED=1
```

**Data**:
- Synthetic test data
- Safe to reset and recreate
- No production data

**Updates**: On every code change (hot reload in dev mode)

---

### TEST Environment (Staging / Local VM #2)

**Purpose**: Pre-production testing, QA validation, performance testing, production-like environment

**Infrastructure**:
- Separate Ubuntu VM (or same VM with isolated database)
- IP: `192.168.1.101`
- Specs: 6 vCPU, 12GB RAM, 80GB disk (closer to production)

**Database**:
- PostgreSQL 16 with HA configuration
- Primary database (port 5432)
- Read replica (port 5433)
- PgBouncer pooling (port 6432)
- Database name: `abov3_exodus_test`

**Deployment**:
- PM2 with production build
- Command: `npm run build && pm2 start ecosystem.config.test.js`

**Configuration File**: `.env.test`
```bash
NODE_ENV=production
NEXT_PUBLIC_DEPLOYMENT_MODE=cloud  # Same as prod for accurate testing
NEXTAUTH_URL=http://192.168.1.101:3000
NEXTAUTH_SECRET=test_secret_min_32_characters_long_random

# Database (HA configuration)
POSTGRES_PRISMA_URL=postgresql://abov3_user:password@localhost:6432/abov3_exodus_test?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://abov3_user:password@localhost:5432/abov3_exodus_test
POSTGRES_READ_URL=postgresql://abov3_user:password@localhost:5433/abov3_exodus_test
DATABASE_URL=postgresql://abov3_user:password@localhost:5432/abov3_exodus_test

# Worker
WORKER_MODE=nephesh
WORKER_CONCURRENCY=2
JOB_TIMEOUT_MS=300000
```

**Data**:
- Production-like data
- Periodic backups
- Sanitized copies of production data (when applicable)

**Updates**: On merge to `main` branch (automatic via webhook or cron)

**Important**: Uses `NEXT_PUBLIC_DEPLOYMENT_MODE=cloud` to catch SSRF issues before production

---

### PROD Environment (DigitalOcean Kubernetes)

**Purpose**: Live production serving real users

**Infrastructure**:
- DigitalOcean Kubernetes cluster
- 2-node cluster (4 vCPU, 8GB each)
- Auto-scaling: 2-5 nodes
- Domain: `https://exodus.abov3.ai`

**Database**:
- DigitalOcean Managed PostgreSQL
- 4 vCPU, 16GB RAM
- Automatic HA with failover
- Daily automated backups (30-day retention)
- Database name: `abov3_exodus_prod`

**Deployment**:
- Kubernetes Deployment with rolling updates
- Web service: 2 replicas (can scale to 3)
- Worker service: 2-10 replicas (HPA-based scaling)

**Configuration** (Kubernetes Secrets):
```bash
NODE_ENV=production
NEXT_PUBLIC_DEPLOYMENT_MODE=cloud
NEXTAUTH_URL=https://exodus.abov3.ai
NEXTAUTH_SECRET=<prod_secret_from_k8s_secret>

# Database
POSTGRES_PRISMA_URL=postgresql://exodus:pass@db-uuid.ondigitalocean.com:25060/abov3_exodus_prod?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://exodus:pass@db-uuid.ondigitalocean.com:25060/abov3_exodus_prod?sslmode=require
POSTGRES_READ_URL=postgresql://exodus:pass@db-uuid-replica.ondigitalocean.com:25060/abov3_exodus_prod?sslmode=require

# Worker
WORKER_MODE=nephesh
WORKER_CONCURRENCY=2
JOB_TIMEOUT_MS=300000
```

**Data**:
- Production data (real users)
- Daily automated backups
- 30-day retention policy

**Updates**: On version tag (`v2.0.0`) after manual approval

**Security**:
- TLS/SSL enabled (Let's Encrypt)
- Secrets stored in Kubernetes Secrets (not env vars)
- Database firewall (cluster IPs only)
- Rate limiting enabled

---

## Critical Configuration Differences

### 1. Deployment Mode (SECURITY CRITICAL)

```bash
# DEV
NEXT_PUBLIC_DEPLOYMENT_MODE=local
# Allows localhost endpoints for local development

# TEST
NEXT_PUBLIC_DEPLOYMENT_MODE=cloud
# Blocks localhost endpoints (SSRF prevention)
# Tests production security behavior

# PROD
NEXT_PUBLIC_DEPLOYMENT_MODE=cloud
# Blocks localhost endpoints (SSRF prevention)
# Production security enforcement
```

**Why this matters**: The `cloud` mode prevents Server-Side Request Forgery (SSRF) attacks by blocking requests to:
- Localhost (127.0.0.1, ::1, localhost, 0.0.0.0)
- Private IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- Link-local addresses (169.254.x.x, fe80::/10)
- mDNS domains (.local)

### 2. Database Connections

**DEV** (single-node):
```bash
POSTGRES_PRISMA_URL=postgresql://abov3_user:password@localhost:6432/abov3_exodus_dev?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://abov3_user:password@localhost:5432/abov3_exodus_dev
```

**TEST** (HA with replica):
```bash
POSTGRES_PRISMA_URL=postgresql://abov3_user:password@localhost:6432/abov3_exodus_test?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://abov3_user:password@localhost:5432/abov3_exodus_test
POSTGRES_READ_URL=postgresql://abov3_user:password@localhost:5433/abov3_exodus_test
```

**PROD** (Managed HA):
```bash
POSTGRES_PRISMA_URL=postgresql://exodus:pass@db-uuid.ondigitalocean.com:25060/abov3_exodus_prod?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://exodus:pass@db-uuid.ondigitalocean.com:25060/abov3_exodus_prod?sslmode=require
POSTGRES_READ_URL=postgresql://exodus:pass@db-uuid-replica.ondigitalocean.com:25060/abov3_exodus_prod?sslmode=require
```

**Port differences**:
- `6432` - PgBouncer (connection pooling) for Prisma
- `5432` - Direct PostgreSQL for migrations
- `5433` - Read replica (TEST and PROD only)
- `25060` - DigitalOcean Managed Database port (PROD only)

### 3. Secrets Management

| Environment | Storage Method | Access |
|-------------|---------------|--------|
| DEV | `.env.dev` file | File system |
| TEST | `.env.test` file | File system |
| PROD | Kubernetes Secrets | K8s API |

**Production secrets creation**:
```bash
# Generate secure secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Create Kubernetes secret
kubectl create secret generic auth-secrets \
  --from-literal=nextauth-secret="$NEXTAUTH_SECRET"

kubectl create secret generic db-credentials \
  --from-literal=url="postgresql://..." \
  --from-literal=direct-url="postgresql://..." \
  --from-literal=read-url="postgresql://..."
```

---

## Environment-Specific Features

### DEV Only
- Hot module replacement (HMR)
- Source maps enabled
- Verbose logging
- Telemetry disabled
- No rate limiting
- No SSL/TLS

### TEST Only
- Production build mode
- PM2 process management
- Automated deployment via webhook
- HA database simulation
- Production security mode (`cloud`)
- Periodic data refresh from sanitized PROD data

### PROD Only
- Kubernetes orchestration
- Horizontal Pod Autoscaler (HPA)
- Prometheus/Grafana monitoring
- Alert rules (Slack/PagerDuty)
- Managed database with automatic backups
- SSL/TLS with Let's Encrypt
- CDN integration (optional)
- Rate limiting (10 req/sec per user)
- DDoS protection

---

## Deployment Commands by Environment

### DEV
```bash
# Start development server
npm run dev

# Or with PM2
pm2 start ecosystem.config.js --env dev

# Run migrations
DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate dev

# Database push (quick schema sync)
npm run db:push
```

### TEST
```bash
# Build and deploy
npm run build
pm2 start ecosystem.config.test.js

# Or automatic via webhook
curl -X POST http://192.168.1.101:9000/hooks/deploy

# Run migrations
DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy

# Restart
pm2 restart abov3-exodus-test
```

### PROD
```bash
# Deploy new version
git tag v2.1.0
git push origin v2.1.0
# Manual approval in GitHub UI required
# Kubernetes rolling update happens automatically

# Run migrations
./scripts/migrate-production.sh

# Manual Kubernetes commands
kubectl set image deployment/abov3-exodus exodus=ghcr.io/abov3ai/exodus:v2.1.0
kubectl rollout status deployment/abov3-exodus

# Rollback if needed
./scripts/rollback-production.sh
# Or manual
kubectl rollout undo deployment/abov3-exodus
```

---

## Health Check Endpoints

All environments expose the same health check endpoints:

```bash
# DEV
curl http://192.168.1.100:3000/api/health
curl http://192.168.1.100:3000/api/metrics

# TEST
curl http://192.168.1.101:3000/api/health
curl http://192.168.1.101:3000/api/metrics

# PROD
curl https://exodus.abov3.ai/api/health
curl https://exodus.abov3.ai/api/metrics
```

**Expected health response**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-15T12:34:56.789Z"
}
```

---

## Monitoring and Logs

### DEV
```bash
# npm dev server logs (console)
npm run dev

# PM2 logs (if using PM2)
pm2 logs abov3-exodus
pm2 monit
```

### TEST
```bash
# PM2 logs
pm2 logs abov3-exodus-test --lines 100

# Follow logs
pm2 logs abov3-exodus-test -f

# Error logs only
pm2 logs abov3-exodus-test --err
```

### PROD
```bash
# Kubernetes logs
kubectl logs -f deployment/abov3-exodus
kubectl logs -f deployment/abov3-nephesh-worker

# Specific pod
kubectl logs -f <pod-name>

# Previous pod (after crash)
kubectl logs --previous <pod-name>

# Grafana dashboard
# Access via Prometheus/Grafana UI
```

---

## Database Access

### DEV
```bash
# Direct connection
psql -U abov3_user -d abov3_exodus_dev -h localhost

# Via PgBouncer
psql -U abov3_user -d abov3_exodus_dev -h localhost -p 6432

# Prisma Studio
npx prisma studio
```

### TEST
```bash
# Direct connection (primary)
psql -U abov3_user -d abov3_exodus_test -h localhost

# Read replica
psql -U abov3_user -d abov3_exodus_test -h localhost -p 5433

# Via PgBouncer
psql -U abov3_user -d abov3_exodus_test -h localhost -p 6432
```

### PROD
```bash
# Via kubectl port-forward
kubectl port-forward svc/postgres 5432:5432
psql -U exodus -d abov3_exodus_prod -h localhost

# Or use DigitalOcean connection string
psql "postgresql://exodus:pass@db-uuid.ondigitalocean.com:25060/abov3_exodus_prod?sslmode=require"
```

---

## Backup and Recovery

### DEV
- Manual backups only
- No automated backup
- Data is disposable (test data)

```bash
pg_dump -U abov3_user -d abov3_exodus_dev > backup.sql
```

### TEST
- Cron-based backups (daily at 3 AM)
- 7-day retention
- Stored locally on VM

```bash
# Cron job (in /etc/cron.d/exodus-backup)
0 3 * * * abov3admin /home/abov3admin/backup-database.sh

# Manual backup
./backup-database.sh

# Restore
psql -U abov3_user -d abov3_exodus_test < backup-YYYYMMDD.sql
```

### PROD
- Automated daily backups (DigitalOcean Managed Database)
- 30-day retention
- Point-in-time recovery available
- Automatic before migrations (via migrate-production.sh)

```bash
# Create manual backup (via migration script)
./scripts/migrate-production.sh
# Creates backup-YYYYMMDD-HHMMSS.sql automatically

# Restore from DigitalOcean UI
# Or manual:
psql $POSTGRES_URL_NON_POOLING < backup.sql
```

---

## Cost Breakdown

### DEV Environment
- **Cost**: $0 (local hardware)
- **Infrastructure**: Existing development machine or VM

### TEST Environment
- **Cost**: $0 (local hardware)
- **Infrastructure**: Additional VM on local hardware

### PROD Environment (DigitalOcean)
- Kubernetes Cluster (2 nodes): $80/month
- Managed PostgreSQL (4 vCPU, 16GB, HA): $180/month
- Load Balancer: $12/month
- Object Storage (50GB): $5/month
- **Total**: ~$277/month

**Scaling costs** (1000+ users):
- Add 3rd K8s node: +$40/month
- Add read replica: +$180/month
- Redis cache: +$15/month
- **Total at scale**: ~$512/month

---

## Security Checklist by Environment

### DEV
- [ ] Use unique NEXTAUTH_SECRET (not shared with other environments)
- [ ] Database password is not default
- [ ] No production data in DEV database
- [ ] `.env.dev` is git-ignored

### TEST
- [ ] `NEXT_PUBLIC_DEPLOYMENT_MODE=cloud` (same as prod)
- [ ] Use unique NEXTAUTH_SECRET (different from DEV and PROD)
- [ ] Database password is strong
- [ ] Firewall configured (ports 22, 3000 only)
- [ ] `.env.test` is git-ignored
- [ ] Production data is sanitized before import

### PROD
- [ ] `NEXT_PUBLIC_DEPLOYMENT_MODE=cloud`
- [ ] NEXTAUTH_SECRET is cryptographically random (32+ bytes)
- [ ] All secrets in Kubernetes Secrets (not environment variables)
- [ ] PostgreSQL firewall restricts to cluster IPs only
- [ ] TLS/SSL enabled on Ingress (HTTPS only)
- [ ] CORS configured for trusted origins
- [ ] Rate limiting enabled (10 req/sec per user)
- [ ] Database backups enabled (daily, 30-day retention)
- [ ] Monitoring alerts configured
- [ ] Log aggregation enabled

---

## Troubleshooting

### Issue: Wrong DEPLOYMENT_MODE
**Symptoms**: Local endpoints blocked in DEV, or localhost accessible in PROD

**Solution**:
```bash
# Check current value
grep NEXT_PUBLIC_DEPLOYMENT_MODE .env.*

# DEV should be 'local'
# TEST and PROD should be 'cloud'
```

### Issue: Database connection fails
**Symptoms**: "Connection refused" or "Authentication failed"

**Solution**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
echo $POSTGRES_PRISMA_URL

# Test direct connection
psql -U abov3_user -d abov3_exodus_dev -h localhost

# Test PgBouncer connection
psql -U abov3_user -d abov3_exodus_dev -h localhost -p 6432
```

### Issue: Migrations fail in TEST/PROD
**Symptoms**: Prisma migration errors

**Solution**:
```bash
# Ensure DATABASE_URL uses port 5432 (direct, not PgBouncer 6432)
grep DATABASE_URL .env.test

# Reset migrations (DEV only!)
npx prisma migrate reset

# Deploy migrations (TEST/PROD)
DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy
```

---

## Related Documentation

- **Deployment Guides**:
  - `LOCAL_VM_DEPLOYMENT.md` - Complete local VM setup
  - `NEPHESH_DEPLOYMENT.md` - DigitalOcean Kubernetes deployment
  - `DEPLOYMENT.md` - DigitalOcean deployment instructions

- **CI/CD**:
  - `DEPLOYMENT_RUNBOOK.md` - Operations guide (to be created)
  - `.github/workflows/docker-image.yml` - Existing CI/CD workflow
  - `.github/workflows/deploy-production.yml` - Production deployment (to be created)

- **Scripts**:
  - `scripts/deploy-webhook.sh` - TEST deployment automation (to be created)
  - `scripts/migrate-production.sh` - Safe production migrations (to be created)
  - `scripts/monitor-deployment.sh` - Health monitoring (to be created)
  - `scripts/rollback-test.sh` - TEST rollback (to be created)
  - `scripts/rollback-production.sh` - PROD rollback (to be created)

---

**Last Updated**: 2026-03-15
**Version**: 1.0.0
