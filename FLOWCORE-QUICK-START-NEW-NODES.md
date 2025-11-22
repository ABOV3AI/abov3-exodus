# FlowCore Quick Start - New Nodes (Sprint 1)

## 🚀 Quick Reference for Email, Slack, Discord, and Database Nodes

---

## 📧 Email Node (Send Email)

### Configuration

```yaml
SMTP Settings:
  Host: smtp.gmail.com
  Port: 587 (TLS) or 465 (SSL)
  Username: your-email@gmail.com
  Password: your-app-password (for Gmail, use App Password, not regular password)
  Secure: true (for port 465) / false (for port 587)

Email Details:
  From: sender@example.com
  To: recipient@example.com
  CC: optional-cc@example.com (optional)
  Subject: Daily Report for {{variables.date}}
  Body (Text): Plain text content with {{variables.name}}
  Body (HTML): <h1>HTML content</h1> (optional)
```

### Example Workflow: Daily Email Report

```
Trigger: Schedule (0 9 * * * = 9am daily)
  ↓
Web Search: "latest tech news"
  ↓
AI Summarize: "Summarize top 5 stories"
  ↓
Send Email:
  To: team@company.com
  Subject: "Tech News - {{variables.today}}"
  Body: {{nodes.ai-summarize.output.summary}}
```

### Gmail App Password Setup

1. Go to Google Account → Security → 2-Step Verification
2. Scroll to "App passwords"
3. Generate password for "Mail"
4. Use this 16-character password in FlowCore

---

## 💬 Slack Node (Slack Message)

### Configuration

```yaml
Webhook URL: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
Message Text: Workflow completed: {{nodes.previous.output.status}}
Channel: #general (optional override)
Username: FlowCore Bot (optional)
Icon Emoji: :robot_face: (optional)
```

### Get Slack Webhook URL

1. Go to https://api.slack.com/apps
2. Create New App → From Scratch
3. Incoming Webhooks → Activate
4. Add New Webhook to Workspace → Select channel
5. Copy Webhook URL

### Example Workflow: Database Alert

```
Trigger: Schedule (*/5 * * * * = every 5 minutes)
  ↓
PostgreSQL: SELECT COUNT(*) FROM orders WHERE status='pending'
  ↓
If/Then/Else: {{nodes.postgres.output.rows[0].count}} > 10
  ↓ (true branch)
  Slack Message:
    Text: "⚠️ Alert: {{nodes.postgres.output.rows[0].count}} pending orders!"
    Channel: #ops-alerts
```

---

## 🎮 Discord Node (Discord Webhook)

### Configuration

```yaml
Webhook URL: https://discord.com/api/webhooks/123456789/XXXXXXXXXXXXXXXXXXXX
Message Content: Deployment successful for {{variables.version}}
Username: Deployment Bot (optional)
Avatar URL: https://example.com/bot-avatar.png (optional)
```

### Get Discord Webhook URL

1. Open Discord → Server Settings → Integrations
2. Webhooks → New Webhook
3. Choose channel → Copy Webhook URL

### Example Workflow: Build Notification

```
Trigger: Webhook (from CI/CD pipeline)
  ↓
Discord Webhook:
  Content: "✅ Build #{{trigger.data.buildNumber}} deployed to production"
  Username: "CI/CD Bot"
```

### Rich Embeds (Advanced)

```json
{
  "content": "Build notification",
  "embeds": [{
    "title": "Build #123 Deployed",
    "description": "Successfully deployed to production",
    "color": 3066993,
    "fields": [
      {"name": "Version", "value": "v1.2.3", "inline": true},
      {"name": "Environment", "value": "Production", "inline": true}
    ],
    "timestamp": "{{variables.timestamp}}"
  }]
}
```

---

## 🐘 PostgreSQL Node

### Configuration

```yaml
Connection:
  Host: localhost (or database server IP)
  Port: 5432
  Database: my_database
  Username: postgres
  Password: ••••••••
  SSL: false (true for cloud databases)

Query:
  Operation: SELECT / INSERT / UPDATE / DELETE / RAW SQL
  SQL: SELECT * FROM users WHERE email = $1
  Parameters: ["john@example.com"] (JSON array)
```

### Example Queries

**SELECT:**
```sql
SELECT id, name, email FROM users WHERE status = $1 LIMIT 10
Parameters: ["active"]
```

**INSERT:**
```sql
INSERT INTO logs (event, data, timestamp) VALUES ($1, $2, NOW())
Parameters: ["workflow_complete", "{\"success\": true}"]
```

**UPDATE:**
```sql
UPDATE orders SET status = $1 WHERE id = $2
Parameters: ["shipped", 42]
```

---

## 🐬 MySQL Node

### Configuration

```yaml
Connection:
  Host: localhost
  Port: 3306
  Database: my_database
  Username: root
  Password: ••••••••
  SSL: false

Query:
  Operation: SELECT / INSERT / UPDATE / DELETE / RAW SQL
  SQL: SELECT * FROM products WHERE category = ? LIMIT ?
  Parameters: ["electronics", 20]
```

### Example Workflow: Data Sync

```
Trigger: Schedule (0 */6 * * * = every 6 hours)
  ↓
MySQL: SELECT * FROM customers WHERE updated_at > ?
  Parameters: ["{{variables.last_sync}}"]
  ↓
Loop: For each customer
  ↓
  PostgreSQL: INSERT INTO analytics.customers (id, name, data)
```

---

## 🍃 MongoDB Node

### Configuration

```yaml
Connection:
  URI: mongodb://localhost:27017 (or mongodb+srv://... for Atlas)
  Database: my_app
  Collection: users

Operation: find / findOne / insertOne / updateOne / deleteOne / aggregate
Filter (JSON): {"email": "john@example.com"}
Update (JSON): {"$set": {"status": "active"}}
```

### Example Operations

**Find Many:**
```json
Operation: find
Filter: {"status": "active", "age": {"$gte": 18}}
Limit: 10
```

**Insert One:**
```json
Operation: insertOne
Document: {
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "{{variables.timestamp}}"
}
```

**Update One:**
```json
Operation: updateOne
Filter: {"_id": "507f1f77bcf86cd799439011"}
Update: {"$set": {"lastLogin": "{{variables.now}}"}}
```

**Aggregation Pipeline:**
```json
Operation: aggregate
Pipeline: [
  {"$match": {"status": "active"}},
  {"$group": {"_id": "$category", "count": {"$sum": 1}}},
  {"$sort": {"count": -1}}
]
```

---

## 📁 SQLite Node (Local Database)

### Configuration

```yaml
Connection:
  Filename: ./data/workflows.db (relative to project root)
  Create if Missing: true

Query:
  Operation: SELECT / INSERT / UPDATE / DELETE / RAW SQL
  SQL: SELECT * FROM workflow_state WHERE id = ?
  Parameters: [1]
```

### Use Case: Workflow State Persistence

**Initialize Database:**
```sql
Operation: RAW SQL
Query:
  CREATE TABLE IF NOT EXISTS workflow_state (
    id INTEGER PRIMARY KEY,
    workflow_id TEXT,
    last_run DATETIME,
    result TEXT
  )
```

**Save State:**
```sql
Operation: INSERT
Query:
  INSERT INTO workflow_state (workflow_id, last_run, result)
  VALUES (?, datetime('now'), ?)
Parameters: ["{{variables.workflowId}}", "{{nodes.previous.output}}"]
```

**Load State:**
```sql
Operation: SELECT
Query: SELECT * FROM workflow_state WHERE workflow_id = ? ORDER BY last_run DESC LIMIT 1
Parameters: ["{{variables.workflowId}}"]
```

---

## 🔐 Security Best Practices

### ⚠️ DO NOT commit credentials to git!

**Recommended approach:**

1. **Use environment variables** (when server-side execution is available)
2. **Store in workflow config** (encrypted at rest in IndexedDB)
3. **Use secret management** (HashiCorp Vault, AWS Secrets Manager)

### Current Limitations (Client-Side Execution)

- Database credentials are stored in browser IndexedDB
- SMTP passwords visible in workflow config
- Not recommended for production use with sensitive data

### Future: Server-Side Execution (Recommended for Production)

All these nodes should execute server-side via tRPC for:
- Secure credential storage
- Connection pooling
- Rate limiting
- Audit logging

---

## 💡 Tips & Tricks

### Variable Interpolation

**All text fields support dynamic variables:**

```
Email Subject: "Report for {{variables.date}}"
SQL Query: SELECT * FROM users WHERE email = '{{trigger.data.email}}'
Slack Message: "Workflow {{variables.workflowName}} completed"
```

**Access previous node results:**

```
{{nodes.postgres-1.output.rows[0].name}}
{{nodes.web-search.output.results}}
{{trigger.data.userId}}
```

### Error Handling

FlowCore automatically retries failed nodes 3 times with exponential backoff:
- Retry 1: After 1 second
- Retry 2: After 2 seconds
- Retry 3: After 4 seconds

### Test Connections

Always use "Test Connection" buttons before saving workflows to validate:
- SMTP credentials
- Database connection strings
- Webhook URLs

---

## 📝 Example: Complete E-commerce Order Pipeline

```
Trigger: Webhook (from Shopify)
  ↓
MongoDB: insertOne into orders collection
  Document: {{trigger.data.order}}
  ↓
PostgreSQL: INSERT INTO analytics.orders
  ↓
If/Then/Else: {{trigger.data.order.total}} > 1000
  ↓ (true branch)
  Email:
    To: vip@company.com
    Subject: "High-value order #{{trigger.data.order.id}}"
  ↓
Slack Message:
  Channel: #orders
  Text: "New order: ${{trigger.data.order.total}}"
  ↓
SQLite: Save to local cache
  INSERT INTO order_cache
  ↓
Output: Return success
```

---

## 🐛 Troubleshooting

### Email Not Sending

- Check SMTP host and port (587 for TLS, 465 for SSL)
- For Gmail, use App Password, not regular password
- Verify "Less secure app access" is enabled (legacy accounts)
- Check spam folder

### Slack/Discord Webhook Failing

- Verify webhook URL is correct
- Check channel permissions
- Test webhook with curl:
  ```bash
  curl -X POST https://hooks.slack.com/services/... \
    -H 'Content-Type: application/json' \
    -d '{"text": "Test message"}'
  ```

### Database Connection Errors

- Verify host, port, database name
- Check username and password
- Ensure database server allows remote connections
- For cloud databases (AWS RDS, Azure), check security groups/firewall

### SQLite File Not Found

- Use relative path: `./data/workflows.db`
- Or absolute path: `/home/user/data/workflows.db`
- Enable "Create if Missing" for first run

---

## 🎓 Next Steps

1. **Test each node type** with your real credentials
2. **Create workflow templates** for common use cases
3. **Explore variable interpolation** for dynamic workflows
4. **Combine nodes** for complex automations
5. **Share workflows** with your team (import/export JSON)

**Ready to automate!** 🚀

