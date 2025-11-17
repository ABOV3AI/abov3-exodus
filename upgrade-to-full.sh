#!/bin/bash

# ABOV3 Exodus - Upgrade from Simple to Full Mode (Mac/Linux)

set -e

echo "========================================"
echo "ABOV3 Exodus - Upgrade to Full Mode"
echo "========================================"
echo ""
echo "This will upgrade your ABOV3 Exodus installation from Simple to Full mode."
echo ""
echo "Full mode includes:"
echo "- PostgreSQL database"
echo "- User authentication"
echo "- Multi-user support"
echo "- Cloud backup for conversations"
echo "- Admin panel for configuration"
echo ""
echo "[IMPORTANT] Note about existing data:"
echo "- Your browser-stored conversations will remain in your browser"
echo "- They will NOT be automatically migrated to the database"
echo "- You can continue using them or manually export/import"
echo "- New conversations can be backed up to the cloud"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Check if Docker is running
echo ""
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed!"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "[ERROR] Docker is not running!"
    echo "Please start Docker and run this script again."
    exit 1
fi

echo "[OK] Docker is running"
echo ""

# Check if simple mode is installed
if ! docker ps -a --filter "name=abov3-exodus-simple" --format "{{.Names}}" | grep -q "^abov3-exodus-simple$"; then
    echo "[WARNING] ABOV3 Exodus (simple mode) is not installed."
    echo ""
    echo "This script is for upgrading from simple to full mode."
    echo "If you want to install full mode directly, use: ./install-full.sh"
    echo ""
    exit 1
fi

echo "[OK] Found ABOV3 Exodus (simple mode)"
echo ""

# Stop simple mode
echo "Stopping simple mode..."
docker-compose -f docker-compose-simple.yaml stop
echo "[OK] Simple mode stopped"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Creating default .env file..."
    cat > .env << 'EOF'
# ABOV3 Exodus - Environment Variables
#
# Database Password
# Change this for production!
POSTGRES_PASSWORD=abov3_secure_password_change_me

# NextAuth Secret
# Generate with: openssl rand -base64 32
# Change this for production!
NEXTAUTH_SECRET=default_secret_key_CHANGE_THIS_IN_PRODUCTION_use_openssl_rand_base64_32

# Application URL
NEXTAUTH_URL=http://localhost:3006

# Optional: AI API Keys (can also configure in UI)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# GOOGLE_AI_API_KEY=

# Optional: Email Configuration (can also configure in Admin Panel)
# EMAIL_SERVER_HOST=smtp.gmail.com
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=your@email.com
# EMAIL_SERVER_PASSWORD=your-app-password
# EMAIL_FROM=noreply@abov3-exodus.com
EOF

    echo "[OK] Created .env file with default values"
    echo ""
    echo "[IMPORTANT] For production:"
    echo "1. Edit .env file"
    echo "2. Change POSTGRES_PASSWORD"
    echo "3. Change NEXTAUTH_SECRET"
    echo ""
    read -p "Press Enter to continue..."
fi

# Start full mode
echo ""
echo "Starting full mode with database..."
echo "This may take a few minutes..."
echo ""

if ! docker-compose -f docker-compose-full.yaml up -d --build; then
    echo ""
    echo "[ERROR] Upgrade failed!"
    echo "Restarting simple mode..."
    docker-compose -f docker-compose-simple.yaml start
    exit 1
fi

echo ""
echo "Waiting for database initialization..."
sleep 10

echo ""
echo "========================================"
echo "Upgrade Complete!"
echo "========================================"
echo ""
echo "ABOV3 Exodus (full mode) is now running at:"
echo "   http://localhost:3006"
echo ""
echo "Simple mode has been stopped (but not removed)."
echo "To remove simple mode completely:"
echo "   docker-compose -f docker-compose-simple.yaml down"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3006"
echo "2. Create your account (Sign Up)"
echo "3. Configure SMTP in Admin Panel (for email features)"
echo "4. Start creating cloud-backed conversations!"
echo ""
echo "Note: Your old browser-stored conversations are still available."
echo "They will continue working alongside the new cloud-backed conversations."
echo ""

# Try to open browser (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening in your browser..."
    sleep 2
    open http://localhost:3006
fi
