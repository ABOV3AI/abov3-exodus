# ABOV3 Exodus - Docker Technical Documentation

**For Developers and DevOps Engineers**

This document provides technical details about the Docker implementation, architecture, and deployment options for ABOV3 Exodus.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Docker Images](#docker-images)
- [Deployment Modes](#deployment-modes)
- [Configuration](#configuration)
- [Networking](#networking)
- [Volumes and Data Persistence](#volumes-and-data-persistence)
- [Health Checks](#health-checks)
- [Scaling and Performance](#scaling-and-performance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Advanced Deployment](#advanced-deployment)

---

## Architecture Overview

ABOV3 Exodus is a Next.js 15 application with an optional PostgreSQL backend for authentication and cloud features.

### Technology Stack

**Frontend:**
- Next.js 15 (App Router + Pages Router hybrid)
- React 18
- Material-UI Joy
- Zustand for state management
- IndexedDB for browser storage

**Backend:**
- Node.js 22
- tRPC for API layer
- Prisma ORM
- PostgreSQL 16 (optional)
- NextAuth.js v5 for authentication

**Runtime:**
- Edge Runtime for AI operations
- Node.js runtime for data processing
- Multi-stage Docker builds

---

## Docker Images

### Application Image

**Base Image:** `node:22-alpine`

**Multi-stage Build:**

1. **Base Stage:** Sets up Node.js environment
2. **Deps Stage:** Installs dependencies
3. **Builder Stage:** Builds production bundle
4. **Runner Stage:** Final minimal runtime image

**Key Features:**
- Alpine Linux (minimal footprint)
- Non-root user (`nextjs:nodejs`, UID 1001)
- Health check endpoint
- SSL3 compatibility layer
- Prisma client included

**Build Arguments:**
```dockerfile
NEXT_PUBLIC_BUILD_HASH         # Git commit hash
NEXT_PUBLIC_BUILD_REF_NAME     # Git branch/tag
NEXT_PUBLIC_GA4_MEASUREMENT_ID # Google Analytics
NEXT_PUBLIC_POSTHOG_KEY        # PostHog analytics
```

### Database Image

**Image:** `postgres:16-alpine`

**Configuration:**
- UTF-8 encoding
- C collation (for performance)
- Health checks via `pg_isready`
- Persistent volume for data

---

## Deployment Modes

### Simple Mode

**File:** `docker-compose-simple.yaml`

**Components:**
- Single container (ABOV3 Exodus)
- No database
- Browser storage only (IndexedDB)

**Use Cases:**
- Personal use
- Testing
- Quick demos
- Offline usage

**Ports:**
- 3006:3000 (Application)

**Start:**
```bash
docker-compose -f docker-compose-simple.yaml up -d
```

### Full Mode

**File:** `docker-compose-full.yaml`

**Components:**
- Application container (ABOV3 Exodus)
- PostgreSQL container
- Shared network
- Persistent volume

**Features:**
- User authentication
- Multi-user support
- Cloud conversation backup
- Admin panel
- SMTP configuration

**Ports:**
- 3006:3000 (Application)
- 5432:5432 (PostgreSQL, optional)

**Start:**
```bash
docker-compose -f docker-compose-full.yaml up -d
```

---

## Configuration

### Environment Variables

#### Required (Full Mode Only)

```env
# Database
POSTGRES_PRISMA_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://user:pass@host:5432/db"
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Authentication
NEXTAUTH_SECRET="min-32-chars-secret-generate-with-openssl"
NEXTAUTH_URL="http://localhost:3006"
```

#### Optional

```env
# Email (SMTP)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="user@gmail.com"
EMAIL_SERVER_PASSWORD="app-password"
EMAIL_FROM="noreply@domain.com"

# AI API Keys (server-side)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="AIza..."

# Analytics
NEXT_PUBLIC_GA4_MEASUREMENT_ID="G-XXX"
NEXT_PUBLIC_POSTHOG_KEY="phc_..."

# Deployment
NEXT_PUBLIC_DEPLOYMENT_TYPE="docker"
NODE_ENV="production"
```

### Configuration Files

#### `.env`
Runtime environment variables loaded by Docker Compose

#### `.env.example`
Template with all available variables and documentation

#### `docker-compose-*.yaml`
Service definitions, network config, volumes

---

## Networking

### Default Network

**Name:** `abov3-exodus-network` (simple) or `abov3-network` (full)

**Driver:** Bridge

**Isolation:**
- Containers communicate via service names
- External access via published ports only

### Service Discovery

**Simple Mode:**
- `abov3-exodus-simple` → Application

**Full Mode:**
- `abov3-exodus-full` → Application
- `postgres` → Database

**Internal DNS:**
```bash
# Application connects to database
postgresql://user:pass@postgres:5432/db
```

### Port Mapping

**Application:**
```yaml
ports:
  - "3006:3000"  # HOST:CONTAINER
```

**Database (optional):**
```yaml
ports:
  - "5432:5432"  # Enable for external access
```

**To change host port:**
```yaml
ports:
  - "8080:3000"  # Access at http://localhost:8080
```

---

## Volumes and Data Persistence

### Full Mode Volumes

#### postgres_data

**Type:** Named volume

**Mount Point:** `/var/lib/postgresql/data`

**Purpose:** Persistent database storage

**Lifecycle:**
- Created automatically on first run
- Survives container removal
- Removed only with `docker-compose down -v`

**Backup:**
```bash
# Export database
docker exec abov3-exodus-db pg_dump -U abov3_user abov3_exodus > backup.sql

# Import database
docker exec -i abov3-exodus-db psql -U abov3_user abov3_exodus < backup.sql
```

#### Prisma Schema Volume (optional)

```yaml
volumes:
  - ./src/server/prisma:/app/src/server/prisma
```

Allows schema changes without rebuilding image.

### Simple Mode Volumes

No volumes required. Data stored in browser IndexedDB.

---

## Health Checks

### Application Health Check

**Endpoint:** `GET /api/health`

**Implementation:** `app/api/health/route.ts`

**Checks:**
1. Application is responsive
2. Database connection (if configured)

**Response:**
```json
{
  "status": "ok" | "degraded" | "error",
  "timestamp": "2025-11-10T12:00:00Z",
  "database": "connected" | "disconnected" | "not_configured",
  "error": "optional error message"
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Degraded (app works, DB down)
- `500` - Error

**Docker Health Check:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Database Health Check

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U abov3_user -d abov3_exodus"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### Monitoring Health

```bash
# Check container health status
docker ps

# View health check logs
docker inspect --format='{{.State.Health.Status}}' abov3-exodus-full
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' abov3-exodus-full
```

---

## Scaling and Performance

### Horizontal Scaling

**Application Containers:**

Can run multiple app containers with load balancer:

```yaml
services:
  abov3-exodus:
    deploy:
      replicas: 3
    # ... other config
```

**Requirements:**
- External load balancer (nginx, HAProxy, Traefik)
- Shared database (not container DB)
- Session storage strategy (JWT is stateless, works out of box)

### Vertical Scaling

**CPU/Memory Limits:**

```yaml
services:
  abov3-exodus:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

**Database Tuning:**

```yaml
postgres:
  environment:
    - POSTGRES_INITDB_ARGS="--max-connections=100 --shared-buffers=256MB"
  command:
    - "postgres"
    - "-c"
    - "max_connections=100"
    - "-c"
    - "shared_buffers=256MB"
```

### Performance Optimization

**Build-time:**
- Multi-stage builds reduce image size
- Production dependency pruning
- Next.js static optimization

**Runtime:**
- Edge runtime for AI operations (low latency)
- Prisma connection pooling (`pgbouncer=true`)
- React suspense boundaries
- IndexedDB for client-side caching

**Database:**
- Indexes on frequently queried columns
- Connection pooling
- Regular vacuuming (auto-vacuum enabled)

---

## Security

### Container Security

**Non-root User:**
```dockerfile
USER nextjs  # UID 1001
```

**Read-only Root Filesystem (optional):**
```yaml
services:
  abov3-exodus:
    read_only: true
    tmpfs:
      - /tmp
      - /app/.next/cache
```

**Drop Capabilities:**
```yaml
services:
  abov3-exodus:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Network Security

**Isolate Database:**

Remove port exposure for production:
```yaml
postgres:
  # ports:
  #   - "5432:5432"  # REMOVE THIS LINE
```

Database only accessible from app container.

**Use Internal Network:**
```yaml
networks:
  abov3-network:
    driver: bridge
    internal: false  # Set to true for no internet access
```

### Secrets Management

**Docker Secrets (Swarm):**

```yaml
services:
  abov3-exodus:
    secrets:
      - postgres_password
      - nextauth_secret
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
      - NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  nextauth_secret:
    file: ./secrets/nextauth_secret.txt
```

**Environment Variables:**

For Compose (not Swarm), use `.env` file with restricted permissions:

```bash
# Create .env with secrets
cat > .env << 'EOF'
POSTGRES_PASSWORD=secure_random_password
NEXTAUTH_SECRET=secure_random_secret_min_32_chars
EOF

# Restrict access
chmod 600 .env
```

**External Secret Managers:**
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Doppler

### Security Checklist

- [ ] Change default passwords
- [ ] Generate strong `NEXTAUTH_SECRET` (32+ chars)
- [ ] Use `.env` file with restricted permissions
- [ ] Don't expose PostgreSQL port in production
- [ ] Enable HTTPS (reverse proxy)
- [ ] Regular security updates (`docker-compose pull`)
- [ ] Monitor health checks
- [ ] Backup database regularly
- [ ] Implement rate limiting (reverse proxy)
- [ ] Use firewall rules

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose -f docker-compose-full.yaml logs abov3-exodus
docker-compose -f docker-compose-full.yaml logs postgres
```

**Common issues:**
- Port already in use (change port mapping)
- Database not ready (increase `start_period`)
- Missing environment variables (check `.env`)
- Insufficient memory (check Docker Desktop settings)

### Database Connection Failed

**Verify connection string:**
```bash
# Inside container
docker exec -it abov3-exodus-full sh
# Try connecting
npx prisma db push
```

**Check PostgreSQL:**
```bash
# Database logs
docker logs abov3-exodus-db

# Connect directly
docker exec -it abov3-exodus-db psql -U abov3_user -d abov3_exodus
```

### Application Unhealthy

**Check health endpoint:**
```bash
curl http://localhost:3006/api/health
```

**Inspect health status:**
```bash
docker inspect abov3-exodus-full | jq '.[0].State.Health'
```

**Restart unhealthy container:**
```bash
docker-compose -f docker-compose-full.yaml restart abov3-exodus
```

### Prisma Migration Issues

**Reset database (CAUTION: deletes data):**
```bash
docker exec -it abov3-exodus-full npx prisma migrate reset --force
```

**Push schema without migration:**
```bash
docker exec -it abov3-exodus-full npx prisma db push --accept-data-loss
```

**Regenerate client:**
```bash
docker exec -it abov3-exodus-full npx prisma generate
```

### Performance Issues

**Check resource usage:**
```bash
docker stats
```

**Increase limits:**
```yaml
services:
  abov3-exodus:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
```

**Database tuning:**
```bash
# Analyze slow queries
docker exec -it abov3-exodus-db psql -U abov3_user -d abov3_exodus
\x
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## Advanced Deployment

### Production Deployment with Reverse Proxy

**nginx Configuration:**

```nginx
upstream abov3_backend {
    server localhost:3006;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://abov3_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Docker Compose with nginx:**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - abov3-exodus
    networks:
      - abov3-network

  abov3-exodus:
    # ... existing config
    # Remove ports section (nginx handles it)
    networks:
      - abov3-network
```

### Kubernetes Deployment

**Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: abov3-exodus
spec:
  replicas: 3
  selector:
    matchLabels:
      app: abov3-exodus
  template:
    metadata:
      labels:
        app: abov3-exodus
    spec:
      containers:
      - name: abov3-exodus
        image: your-registry/abov3-exodus:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: abov3-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: abov3-secrets
              key: nextauth-secret
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 40
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

**Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: abov3-exodus
spec:
  selector:
    app: abov3-exodus
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Cloud Deployment Examples

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add POSTGRES_PRISMA_URL
vercel env add NEXTAUTH_SECRET
```

#### AWS ECS (Fargate)

1. Push image to ECR
2. Create task definition
3. Create ECS service
4. Use RDS for PostgreSQL
5. Configure ALB for HTTPS

#### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/abov3-exodus

# Deploy
gcloud run deploy abov3-exodus \
  --image gcr.io/PROJECT_ID/abov3-exodus \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="..." \
  --set-env-vars NEXTAUTH_SECRET="..."
```

### CI/CD Pipeline

**GitHub Actions:**

```yaml
name: Deploy ABOV3 Exodus

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t abov3-exodus:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag abov3-exodus:${{ github.sha }} your-registry/abov3-exodus:latest
          docker push your-registry/abov3-exodus:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/abov3-exodus
            docker-compose pull
            docker-compose up -d
```

---

## Monitoring and Observability

### Logging

**View logs:**
```bash
# All services
docker-compose -f docker-compose-full.yaml logs -f

# Specific service
docker-compose -f docker-compose-full.yaml logs -f abov3-exodus

# Last 100 lines
docker-compose -f docker-compose-full.yaml logs --tail=100 abov3-exodus
```

**Centralized Logging:**

```yaml
services:
  abov3-exodus:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Or use external logging (Loki, ELK, CloudWatch):

```yaml
services:
  abov3-exodus:
    logging:
      driver: "syslog"
      options:
        syslog-address: "tcp://logserver:514"
```

### Metrics

**Prometheus Metrics:**

Add metrics endpoint to Next.js app:

```typescript
// app/api/metrics/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const metrics = `
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1000
  `;

  return new NextResponse(metrics, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
```

**Prometheus Configuration:**

```yaml
scrape_configs:
  - job_name: 'abov3-exodus'
    static_configs:
      - targets: ['abov3-exodus:3000']
    metrics_path: '/api/metrics'
```

### Tracing

**OpenTelemetry:**

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node');
  }
}
```

---

## Backup and Disaster Recovery

### Database Backup

**Manual Backup:**
```bash
docker exec abov3-exodus-db pg_dump -U abov3_user abov3_exodus > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Automated Backup (cron):**

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec abov3-exodus-db pg_dump -U abov3_user abov3_exodus > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete  # Keep 7 days
```

**Crontab:**
```
0 2 * * * /opt/abov3-exodus/backup.sh
```

### Database Restore

```bash
# Stop application
docker-compose -f docker-compose-full.yaml stop abov3-exodus

# Restore database
docker exec -i abov3-exodus-db psql -U abov3_user abov3_exodus < backup.sql

# Start application
docker-compose -f docker-compose-full.yaml start abov3-exodus
```

### Volume Backup

```bash
# Backup volume
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .

# Restore volume
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data
```

---

## Cost Optimization

### Development

- Use simple mode (no database)
- Share Docker layer cache
- Prune unused images regularly

```bash
docker system prune -a
```

### Production

- Use multi-stage builds (already implemented)
- Minimize image layers
- Use Alpine base images
- Implement caching strategies
- Use CDN for static assets
- Enable compression

---

## License and Attribution

ABOV3 Exodus is based on Big-AGI by Enrico Ros.

**MIT License Requirements:**
- Keep original LICENSE file
- Maintain copyright notice
- Include attribution in UI/README

---

## Support and Resources

**Documentation:**
- `EASY-INSTALL.md` - User installation guide
- `README_IMPLEMENTATION.md` - Features overview
- `IMPLEMENTATION_COMPLETE_GUIDE.md` - Development guide
- `AUTH_IMPLEMENTATION_STATUS.md` - Auth system details

**Docker:**
- Docker Hub: https://hub.docker.com
- Docker Docs: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose/

**Technologies:**
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- NextAuth.js: https://next-auth.js.org
- PostgreSQL: https://www.postgresql.org/docs

---

## Conclusion

This Docker implementation provides:
- **Easy installation** for non-technical users
- **Flexible deployment** (simple/full modes)
- **Production-ready** with security and monitoring
- **Scalable architecture** for growth
- **Well-documented** for developers

For questions or issues, refer to the troubleshooting section or check application logs.

**Happy deploying!** 🚀
