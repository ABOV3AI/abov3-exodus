# ABOV3 Exodus - Cloud Deployment Guide

This document covers the complete deployment process for ABOV3 Exodus in a production cloud environment with multi-user support.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Security Configuration](#security-configuration)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB | 50+ GB SSD |
| Node.js | 18.x | 20.x LTS |

### Required Services

- **PostgreSQL 14+** - User data, settings, and sync storage
- **Redis** (optional) - Session caching and rate limiting
- **Reverse Proxy** - nginx/Traefik for SSL termination

### Domain & SSL

- Valid domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

---

## Environment Variables

### Required Variables

These variables **MUST** be set for production. The application will fail to start without them.

```bash
# ============================================
# AUTHENTICATION (CRITICAL)
# ============================================

# JWT signing secret - REQUIRED in production
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-32-character-or-longer-secret-here

# Public URL of your deployment
NEXTAUTH_URL=https://your-domain.com

# ============================================
# DATABASE (CRITICAL)
# ============================================

# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@host:5432/abov3_exodus?schema=public
```

### Security Variables

Required for secure API endpoints:

```bash
# ============================================
# API SECURITY
# ============================================

# Eden Training API authentication
# Required if using Eden MCP server for training
EDEN_API_KEY=your-secure-eden-api-key

# FlowCore webhook authentication
# Required if external systems trigger workflows
FLOWCORE_WEBHOOK_SECRET=your-secure-webhook-secret
```

### Optional Variables

```bash
# ============================================
# EMAIL (Optional - for magic links)
# ============================================

EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-smtp-user
EMAIL_SERVER_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@your-domain.com

# ============================================
# ANALYTICS (Optional)
# ============================================

POSTHOG_API_KEY=your-posthog-api-key
POSTHOG_ENV_ID=your-posthog-env-id

# ============================================
# AI PROVIDERS (Optional - can be set per-user)
# ============================================

# Server-side API keys (shared across all users)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# ============================================
# BUILD OPTIONS
# ============================================

# Set to 'standalone' for Docker optimized builds
BIG_AGI_BUILD=standalone
```

### Environment Variable Security

| Variable | Sensitivity | Notes |
|----------|-------------|-------|
| `NEXTAUTH_SECRET` | **CRITICAL** | Never commit, use secrets manager |
| `DATABASE_URL` | **CRITICAL** | Contains credentials |
| `EDEN_API_KEY` | HIGH | API authentication |
| `FLOWCORE_WEBHOOK_SECRET` | HIGH | Webhook authentication |
| `*_API_KEY` | HIGH | LLM provider credentials |

---

## Database Setup

### 1. Create PostgreSQL Database

```sql
-- Connect as superuser
CREATE USER abov3_exodus WITH PASSWORD 'secure-password-here';
CREATE DATABASE abov3_exodus OWNER abov3_exodus;
GRANT ALL PRIVILEGES ON DATABASE abov3_exodus TO abov3_exodus;
```

### 2. Run Migrations

```bash
# From project directory
npx prisma migrate deploy

# Or using Docker
docker run --rm \
  -e DATABASE_URL="postgresql://..." \
  your-image:tag \
  npx prisma migrate deploy
```

### 3. Create Admin User

After first deployment, create an admin user:

```sql
-- After a user signs up, promote them to admin
UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@your-domain.com';
```

### 4. Configure Admin Settings

```sql
-- Insert default admin settings
INSERT INTO "AdminSettings" (id, "allowSignups", "createdAt", "updatedAt")
VALUES ('default', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET "allowSignups" = false;
```

---

## Security Configuration

### Security Headers (Automatically Applied)

The following headers are automatically set by Next.js config:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filtering |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer |
| `Content-Security-Policy` | `frame-ancestors 'none'` | Prevent embedding |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforce HTTPS |
| `Permissions-Policy` | Restrictive | Disable unused APIs |

### Reverse Proxy Configuration (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security Headers (additional to app headers)
    add_header X-Robots-Tag "noindex, nofollow" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for AI streaming
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location / {
        proxy_pass http://localhost:3000;
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

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Firewall Rules

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect)
ufw allow 443/tcp   # HTTPS
ufw enable
```

---

## Docker Deployment

### Build Image

```bash
# Production build
docker build -t abov3-exodus:latest \
  --build-arg BIG_AGI_BUILD=standalone \
  .
```

### Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: abov3-exodus:latest
    container_name: abov3-exodus
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - DATABASE_URL=${DATABASE_URL}
      - EDEN_API_KEY=${EDEN_API_KEY}
      - FLOWCORE_WEBHOOK_SECRET=${FLOWCORE_WEBHOOK_SECRET}
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    container_name: abov3-postgres
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=abov3_exodus
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=abov3_exodus
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U abov3_exodus"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Run with Docker Compose

```bash
# Create .env file with secrets
cp .env.example .env.production
# Edit .env.production with your values

# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

---

## Kubernetes Deployment

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: abov3-exodus-secrets
  namespace: abov3
type: Opaque
stringData:
  NEXTAUTH_SECRET: "your-secret-here"
  DATABASE_URL: "postgresql://user:pass@postgres:5432/abov3_exodus"
  EDEN_API_KEY: "your-eden-api-key"
  FLOWCORE_WEBHOOK_SECRET: "your-webhook-secret"
```

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: abov3-exodus
  namespace: abov3
spec:
  replicas: 2
  selector:
    matchLabels:
      app: abov3-exodus
  template:
    metadata:
      labels:
        app: abov3-exodus
    spec:
      containers:
        - name: app
          image: your-registry/abov3-exodus:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: abov3-exodus-secrets
          env:
            - name: NODE_ENV
              value: "production"
            - name: NEXTAUTH_URL
              value: "https://your-domain.com"
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Service & Ingress

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: abov3-exodus
  namespace: abov3
spec:
  selector:
    app: abov3-exodus
  ports:
    - port: 80
      targetPort: 3000
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: abov3-exodus
  namespace: abov3
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  tls:
    - hosts:
        - your-domain.com
      secretName: abov3-exodus-tls
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: abov3-exodus
                port:
                  number: 80
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace abov3

# Apply secrets (use sealed-secrets or external-secrets in production)
kubectl apply -f k8s/secrets.yaml

# Deploy application
kubectl apply -f k8s/

# Run migrations
kubectl exec -it deployment/abov3-exodus -n abov3 -- npx prisma migrate deploy

# Check status
kubectl get pods -n abov3
kubectl logs -f deployment/abov3-exodus -n abov3
```

---

## Post-Deployment Verification

### Health Check Endpoints

| Endpoint | Expected Response | Purpose |
|----------|-------------------|---------|
| `GET /` | 200 | App is running |
| `GET /api/health` | 200 + JSON | Health status |
| `GET /api/auth/session` | 200 + JSON | Auth is working |

### Security Verification

```bash
# Check security headers
curl -I https://your-domain.com

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# Content-Security-Policy: frame-ancestors 'none'

# Verify HTTPS redirect
curl -I http://your-domain.com
# Should return 301/302 redirect to https://
```

### Functional Verification

1. **User Registration** (if enabled)
   - Navigate to `/auth/signin`
   - Create a new account
   - Verify email receipt (if configured)

2. **User Login**
   - Sign in with credentials
   - Verify session is created
   - Check user menu shows correctly

3. **Data Sync**
   - Create a conversation
   - Check PostgreSQL for sync data
   - Log out and back in
   - Verify conversation persists

4. **AI Integration**
   - Configure an LLM provider
   - Send a test message
   - Verify streaming response works

### Database Verification

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check user settings sync
SELECT id, "userId", "autoBackup", "updatedAt"
FROM "UserSettings" LIMIT 5;

-- Check admin settings
SELECT * FROM "AdminSettings";
```

---

## Troubleshooting

### Application Won't Start

**Error: `CRITICAL SECURITY ERROR: NEXTAUTH_SECRET environment variable is not set`**

```bash
# Generate and set the secret
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

**Error: Database connection failed**

```bash
# Test database connection
npx prisma db pull

# Check connection string format
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

### Authentication Issues

**Users can't sign in**

1. Check `NEXTAUTH_URL` matches your domain exactly
2. Verify cookies are being set (check browser DevTools)
3. Check for mixed content (HTTP/HTTPS mismatch)

**Session not persisting**

1. Verify `NEXTAUTH_SECRET` is consistent across restarts
2. Check if running behind load balancer (sticky sessions may be needed)

### Sync Issues

**User data not syncing**

1. Check browser console for sync errors
2. Verify `UserSettings` table has entries for user
3. Check tRPC endpoints are accessible

```bash
# Test sync endpoint
curl -X GET https://your-domain.com/api/cloud/sync.getSettings \
  -H "Cookie: your-session-cookie"
```

### Performance Issues

**Slow AI responses**

1. Check reverse proxy timeout settings (should be 300s+)
2. Verify streaming is working (not buffered)
3. Check network latency to AI providers

**High memory usage**

1. Set Node.js memory limits: `NODE_OPTIONS="--max-old-space-size=2048"`
2. Check for memory leaks in logs
3. Consider horizontal scaling

### Logs Location

| Deployment | Log Command |
|------------|-------------|
| Docker | `docker logs abov3-exodus` |
| Docker Compose | `docker-compose logs -f app` |
| Kubernetes | `kubectl logs -f deployment/abov3-exodus` |
| Systemd | `journalctl -u abov3-exodus -f` |

---

## Maintenance

### Backup Strategy

```bash
# Database backup
pg_dump -h localhost -U abov3_exodus -d abov3_exodus > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U abov3_exodus -d abov3_exodus < backup_20240101.sql
```

### Update Procedure

```bash
# Pull latest image
docker pull your-registry/abov3-exodus:latest

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Restart with new image
docker-compose up -d --force-recreate app
```

### Monitoring Recommendations

- **Uptime**: Use UptimeRobot or similar for `/api/health`
- **Errors**: Configure PostHog or Sentry for error tracking
- **Metrics**: Prometheus + Grafana for performance metrics
- **Logs**: ELK stack or CloudWatch for centralized logging

---

## Security Checklist

Before going live, verify:

- [ ] `NEXTAUTH_SECRET` is set and secure (32+ characters)
- [ ] `DATABASE_URL` uses strong password
- [ ] `EDEN_API_KEY` is set (if using Eden)
- [ ] `FLOWCORE_WEBHOOK_SECRET` is set (if using webhooks)
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Security headers are present (check with curl -I)
- [ ] Rate limiting is configured in reverse proxy
- [ ] Firewall allows only necessary ports
- [ ] Admin user is created and signups are disabled
- [ ] Database backups are configured
- [ ] Monitoring and alerting is set up

---

## Support

For issues and questions:
- GitHub Issues: [Repository Issues Page]
- Documentation: See `/kb/` directory for architecture docs

---

*Last updated: March 2026*
