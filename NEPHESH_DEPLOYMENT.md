# Nephesh 24/7 AGI Deployment Guide

This guide covers deploying the Nephesh autonomous agent system to DigitalOcean Kubernetes.

## Architecture Overview

### Components

1. **Web Service** (`abov3-exodus`)
   - Next.js application serving the UI and API
   - Handles user authentication and tRPC endpoints
   - Deployment: `k8s/exodus-deployment.yaml`
   - Replicas: 1-3 (scale for HA)

2. **Worker Service** (`abov3-nephesh-worker`)
   - Background job processing for autonomous agents
   - Consumes jobs from pg-boss queue
   - Deployment: `k8s/nephesh-worker-deployment.yaml`
   - Replicas: 2-10 (auto-scales based on load)

3. **Scheduler Service** (integrated in worker)
   - Manages HEARTBEAT and SCHEDULED jobs
   - Runs cron tasks for autonomous execution
   - Integrated via `instrumentation.ts`

4. **Job Queue** (pg-boss)
   - PostgreSQL-backed job queue
   - Handles job distribution and retry logic
   - Initialized via `instrumentation.ts`

5. **Database** (PostgreSQL)
   - Stores profiles, jobs, memories, conversations
   - DigitalOcean Managed Database
   - Deployment: `k8s/postgres-ha-deployment.yaml`

### Data Flow

```
User → Web Service → tRPC API → Job Queue → Worker → LLM API
                                    ↓
                                Scheduler → Job Queue → Worker
                                    ↑
                              Channel Webhook
```

## Implementation Summary

### Phase 1: Local Model Security (Completed)

**Files Modified:**
- `src/server/trpc/trpc.router.fetchers.ts` - Server-side endpoint validation
- `src/modules/aix/client/aix.client.local.ts` - Client-side detection
- `src/modules/aix/client/aix.client.ts` - Integration point
- `src/server/env.ts` - Deployment mode configuration
- `k8s/exodus-deployment.yaml` - Cloud mode enforcement
- `docs/LOCAL_MODEL_SECURITY.md` - Comprehensive documentation

**Security Measures:**
- ✅ Blocks localhost (`127.0.0.1`, `localhost`, `0.0.0.0`, `::1`)
- ✅ Blocks private IPs (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`)
- ✅ Blocks link-local addresses (`169.254.x.x`, `fe80::/10`)
- ✅ Blocks `.local` mDNS domains
- ✅ Helpful error messages for users
- ✅ Environment-based mode switching (`NEXT_PUBLIC_DEPLOYMENT_MODE`)

### Phase 2: Nephesh 24/7 AGI (Completed)

#### Phase 2.1: Database Integration
**Files:**
- `src/modules/nephesh/server/nephesh.router.ts` - Replaced in-memory Map with Prisma

**Changes:**
- All 11 tRPC endpoints now use PostgreSQL
- User data isolation with userId filtering
- Profile CRUD operations fully functional
- Job creation/status updates integrated

#### Phase 2.2: Job Queue System
**Files:**
- `src/server/queue/job-queue.ts` - pg-boss service (220 lines)
- `package.json` - Added pg-boss dependency

**Features:**
- PostgreSQL-backed queue using SKIP LOCKED
- Retry logic (3 retries with exponential backoff)
- Job priority support
- Singleton keys to prevent duplicate jobs
- Health check endpoint
- Queue statistics API

#### Phase 2.3: Background Worker
**Files:**
- `src/server/workers/nephesh-worker.ts` - Worker service (307 lines)
- `src/server/workers/job-cancellation.ts` - Cancellation system (70 lines)
- `instrumentation.ts` - Auto-start on server boot

**Features:**
- Consumes jobs from pg-boss queue
- Parallel processing (WORKER_CONCURRENCY=2)
- Job timeout (5 minutes default)
- Cancellation support (AbortController + DB polling)
- Graceful shutdown (SIGTERM/SIGINT handlers)
- Progress tracking and error handling

#### Phase 2.4: Job Scheduler
**Files:**
- `src/server/workers/nephesh-scheduler.ts` - Scheduler service (418 lines)

**Features:**
- HEARTBEAT jobs: Recurring autonomous tasks (interval-based)
- SCHEDULED jobs: Cron-based tasks (e.g., daily summaries)
- Heartbeat checker runs every 60 seconds
- Cron validation and registration
- Next execution time calculation
- Automatic job enqueueing

#### Phase 2.5: Channel Webhooks
**Files:**
- `app/api/webhooks/telegram/[profileId]/route.ts` - Telegram webhook
- `app/api/webhooks/slack/[profileId]/route.ts` - Slack webhook
- `app/api/webhooks/discord/[profileId]/route.ts` - Discord webhook

**Features:**
- TRIGGERED job creation on message receive
- Channel binding verification (chatId/channelId)
- Platform-specific payload handling
- Bot message filtering (prevent loops)
- URL verification support (Slack challenge)
- Slash command support (Discord interactions)

#### Phase 2.6: Kubernetes Deployment
**Files:**
- `k8s/nephesh-worker-deployment.yaml` - Worker deployment + HPA + PDB
- `k8s/prometheus-servicemonitor.yaml` - Metrics + alerts + Grafana dashboard
- `app/api/metrics/route.ts` - Prometheus metrics endpoint

**Features:**
- Worker deployment (2-10 replicas)
- Horizontal Pod Autoscaler (CPU/memory-based)
- Pod Disruption Budget (min 1 worker available)
- Prometheus metrics (queue depth, job stats, scheduler status)
- Alert rules (backlog, failure rate, downtime)
- Grafana dashboard (pre-configured)

## Deployment Instructions

### Prerequisites

1. **DigitalOcean Account** with:
   - Kubernetes cluster (2-node minimum)
   - Managed PostgreSQL database (4 vCPU, 16GB RAM)
   - Container Registry (for Docker images)

2. **Local Tools**:
   - `kubectl` CLI
   - `doctl` CLI (DigitalOcean CLI)
   - Docker
   - Node.js 18+

### Step 1: Database Setup

1. **Create PostgreSQL database** on DigitalOcean:
   ```bash
   doctl databases create abov3-db \
     --engine pg \
     --version 16 \
     --size db-s-4vcpu-16gb \
     --region nyc3
   ```

2. **Enable pgboss schema**:
   ```bash
   # Connect to database
   psql $DATABASE_URL

   # Create pgboss schema
   CREATE SCHEMA IF NOT EXISTS pgboss;
   ```

3. **Run Prisma migrations**:
   ```bash
   cd abov3-exodus
   npx prisma migrate deploy
   ```

### Step 2: Build and Push Docker Image

1. **Build production image**:
   ```bash
   docker build -t abov3/exodus:v1.0.0 .
   docker tag abov3/exodus:v1.0.0 ghcr.io/abov3ai/exodus:beta
   ```

2. **Push to registry**:
   ```bash
   docker push ghcr.io/abov3ai/exodus:beta
   ```

### Step 3: Create Kubernetes Secrets

1. **Database credentials**:
   ```bash
   kubectl create secret generic db-credentials \
     --from-literal=url="postgresql://user:pass@host:25060/db?sslmode=require" \
     --from-literal=direct-url="postgresql://user:pass@host:25060/db?sslmode=require" \
     --from-literal=read-url="postgresql://user:pass@read-host:25060/db?sslmode=require"
   ```

2. **NextAuth secret**:
   ```bash
   kubectl create secret generic auth-secrets \
     --from-literal=nextauth-secret="$(openssl rand -base64 32)"
   ```

### Step 4: Deploy Services

1. **Deploy web service**:
   ```bash
   kubectl apply -f k8s/exodus-deployment.yaml
   ```

2. **Deploy worker service**:
   ```bash
   kubectl apply -f k8s/nephesh-worker-deployment.yaml
   ```

3. **Deploy monitoring** (if Prometheus Operator installed):
   ```bash
   kubectl apply -f k8s/prometheus-servicemonitor.yaml
   ```

### Step 5: Verify Deployment

1. **Check pod status**:
   ```bash
   kubectl get pods -l app=abov3-exodus
   kubectl get pods -l app=abov3-nephesh-worker
   ```

2. **Check logs**:
   ```bash
   kubectl logs -f deployment/abov3-exodus
   kubectl logs -f deployment/abov3-nephesh-worker
   ```

3. **Check health**:
   ```bash
   kubectl port-forward svc/abov3-exodus 3000:80
   curl http://localhost:3000/api/health
   ```

4. **Check metrics**:
   ```bash
   curl http://localhost:3000/api/metrics
   ```

### Step 6: Configure Ingress (Optional)

1. **Create Ingress resource**:
   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

2. **Configure DNS**:
   - Point `exodus.abov3.ai` to LoadBalancer IP
   - Wait for DNS propagation

## Usage

### Creating a Nephesh Profile

```bash
# Via API (example using curl)
curl -X POST https://exodus.abov3.ai/api/trpc/nephesh.createProfile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent",
    "systemMessage": "You are a helpful customer support agent...",
    "llmId": "anthropic-claude-sonnet-4-5",
    "temperature": 0.7,
    "enabledTools": {
      "web": true,
      "fileOps": false,
      "codeExec": false
    }
  }'
```

### Creating Jobs

#### Manual Job (One-time execution)
```bash
curl -X POST https://exodus.abov3.ai/api/trpc/nephesh.createJob \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "prof_123",
    "prompt": "Summarize the latest news",
    "name": "News Summary"
  }'
```

#### Heartbeat Job (Recurring)
```typescript
// Via scheduler API
await createHeartbeatJob(
  profileId,
  userId,
  'check_inbox',  // skill ID
  300  // Run every 5 minutes
);
```

#### Scheduled Job (Cron-based)
```typescript
// Via scheduler API
await createScheduledJob(
  profileId,
  userId,
  'Daily Summary',
  '0 9 * * *',  // Every day at 9 AM UTC
  'Summarize yesterday\'s activity'
);
```

### Channel Integration

#### Telegram Setup
1. Create Telegram bot with BotFather
2. Get bot token and chat ID
3. Configure webhook:
   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
     -d url=https://exodus.abov3.ai/api/webhooks/telegram/<profileId>
   ```
4. Update profile channelBindings:
   ```json
   {
     "telegram": {
       "chatId": "123456789",
       "botToken": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
     }
   }
   ```

#### Slack Setup
1. Create Slack app
2. Enable Event Subscriptions
3. Configure webhook URL: `https://exodus.abov3.ai/api/webhooks/slack/<profileId>`
4. Subscribe to `message.channels` event
5. Update profile channelBindings:
   ```json
   {
     "slack": {
       "channelId": "C1234567890",
       "botToken": "xoxb-..."
     }
   }
   ```

#### Discord Setup
1. Create Discord bot
2. Enable Privileged Gateway Intents (Message Content Intent)
3. Configure webhook URL: `https://exodus.abov3.ai/api/webhooks/discord/<profileId>`
4. Update profile channelBindings:
   ```json
   {
     "discord": {
       "channelId": "987654321098765432",
       "botToken": "MTIzNDU2Nzg5MDEyMzQ1Njc4OQ..."
     }
   }
   ```

## Monitoring

### Metrics

Access Prometheus metrics at `/api/metrics`:

- `nephesh_job_queue_depth` - Jobs waiting in queue
- `nephesh_active_jobs` - Jobs currently executing
- `nephesh_jobs_completed_total` - Total completed jobs (counter)
- `nephesh_jobs_failed_total` - Total failed jobs (counter)
- `nephesh_scheduler_heartbeat_running` - Scheduler status (1=running, 0=stopped)
- `nephesh_scheduler_scheduled_jobs` - Active cron jobs

### Grafana Dashboard

Import the pre-configured dashboard from `k8s/prometheus-servicemonitor.yaml`:

```bash
kubectl get configmap nephesh-grafana-dashboard -o jsonpath='{.data.nephesh-dashboard\.json}' | jq .dashboard > dashboard.json
# Import dashboard.json into Grafana
```

### Alerts

Configured alert rules:
- **NepheshJobQueueBacklog**: Queue depth > 500 for 5 minutes
- **NepheshHighJobFailureRate**: Failure rate > 10% for 15 minutes
- **NepheshWorkerDown**: No active workers for 2 minutes
- **NepheshSchedulerDown**: Scheduler stopped for 5 minutes
- **NepheshWorkerHighMemory**: Memory usage > 90% for 5 minutes
- **NepheshWorkerHighCPU**: CPU usage > 90% for 10 minutes

## Scaling

### Manual Scaling

```bash
# Scale workers to 5 replicas
kubectl scale deployment abov3-nephesh-worker --replicas=5
```

### Auto-Scaling (HPA)

HPA automatically scales workers based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Custom metrics: Job queue depth (requires Prometheus adapter)

Configure custom metric:
```yaml
# Add to k8s/nephesh-worker-deployment.yaml HPA spec
metrics:
  - type: External
    external:
      metric:
        name: nephesh_job_queue_depth
      target:
        type: AverageValue
        averageValue: "50"  # 50 jobs per worker
```

## Troubleshooting

### Workers Not Processing Jobs

1. Check worker logs:
   ```bash
   kubectl logs -f deployment/abov3-nephesh-worker
   ```

2. Verify job queue connection:
   ```bash
   kubectl exec -it deployment/abov3-nephesh-worker -- \
     psql $POSTGRES_PRISMA_URL -c "SELECT COUNT(*) FROM pgboss.job WHERE state = 'created';"
   ```

3. Check scheduler status:
   ```bash
   curl https://exodus.abov3.ai/api/metrics | grep scheduler
   ```

### High Job Failure Rate

1. Check job errors in database:
   ```sql
   SELECT id, name, error, "createdAt"
   FROM "NepheshJob"
   WHERE status = 'ERROR'
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```

2. Common errors:
   - **LLM API timeout**: Increase `JOB_TIMEOUT_MS` environment variable
   - **Missing API keys**: Verify user has configured LLM API keys
   - **Profile disabled**: Check `profile.enabled` flag

### Webhook Not Receiving Messages

1. Verify webhook URL is publicly accessible:
   ```bash
   curl https://exodus.abov3.ai/api/webhooks/telegram/<profileId>
   # Should return: {"ok":true,"message":"Telegram webhook endpoint is active"}
   ```

2. Check channel binding configuration:
   ```sql
   SELECT "channelBindings"
   FROM "NepheshProfile"
   WHERE id = '<profileId>';
   ```

3. Verify platform webhook configuration (Telegram/Slack/Discord)

## Cost Optimization

### Current Setup (~$277/month)

- Kubernetes Cluster: 2 nodes (4 vCPU, 8GB) - $80/month
- Managed PostgreSQL: 4 vCPU, 16GB - $180/month
- Load Balancer: $12/month
- Object Storage: 50GB - $5/month

### Scaling Path

**100-500 users**: Current setup sufficient

**500-1000 users**:
- Add 3rd K8s node: +$40/month
- Enable PostgreSQL HA: +$60/month
- **Total**: ~$377/month

**1000+ users**:
- Add read replica: +$180/month
- Add Redis cache: +$15/month
- Scale to 5 nodes: +$120/month
- **Total**: ~$692/month

## Security Checklist

Before going live, verify:

- [ ] `NEXT_PUBLIC_DEPLOYMENT_MODE=cloud` in web and worker deployments
- [ ] Database credentials stored in Kubernetes Secrets (not env vars)
- [ ] NEXTAUTH_SECRET is cryptographically random (32+ bytes)
- [ ] PostgreSQL firewall restricts access to cluster IPs only
- [ ] TLS enabled on Ingress (HTTPS only)
- [ ] CORS configured for trusted origins only
- [ ] Rate limiting enabled (10 req/sec per user recommended)
- [ ] Database backups enabled (daily, 30-day retention)
- [ ] Monitoring alerts configured (Slack/PagerDuty)
- [ ] Log aggregation enabled (Loki/Elasticsearch)

## Next Steps

1. **Full AIX Integration** (future enhancement)
   - Uncomment lines 227-266 in `nephesh-worker.ts`
   - Implement user context loading (LLM store, API keys)
   - Enable real LLM streaming (currently uses mock responses)

2. **Memory System** (Phase 3)
   - Implement vector embeddings (pgvector)
   - Add memory retrieval to job execution
   - Configure memory expiration policies

3. **Advanced Scheduling** (Phase 4)
   - Add cron-parser for complex cron expressions
   - Support time zones per profile
   - Add schedule conflict detection

4. **Channel Response Sending** (Phase 5)
   - Send job results back to Telegram/Slack/Discord
   - Add streaming response support
   - Implement typing indicators

## Support

For issues or questions:
- GitHub Issues: https://github.com/abov3ai/exodus/issues
- Documentation: https://docs.abov3.ai/nephesh
- Discord: https://discord.gg/abov3ai
