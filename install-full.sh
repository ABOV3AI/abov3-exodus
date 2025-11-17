#!/bin/bash

# ABOV3 Exodus - Full Installation Script (Mac/Linux)
# This script installs ABOV3 Exodus with PostgreSQL database

set -e

echo "========================================"
echo "ABOV3 Exodus - Full Installation"
echo "========================================"
echo ""
echo "This will install ABOV3 Exodus with:"
echo "- PostgreSQL database"
echo "- User authentication"
echo "- Multi-user support"
echo "- Cloud backup for conversations"
echo "- Admin panel for configuration"
echo ""
echo "Perfect for:"
echo "- Multi-user deployments"
echo "- Team usage"
echo "- Production environments"
echo ""
echo "Requirements:"
echo "- Docker installed and running"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Check if Docker is running
echo ""
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed!"
    echo ""
    echo "Please install Docker:"
    echo "- Mac: https://docs.docker.com/desktop/install/mac-install/"
    echo "- Linux: https://docs.docker.com/engine/install/"
    echo ""
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "[ERROR] Docker is not running!"
    echo ""
    echo "Please start Docker and run this script again."
    echo ""
    exit 1
fi

echo "[OK] Docker is running"
echo ""

# Check if container already exists
if docker ps -a --filter "name=abov3-exodus-full" --format "{{.Names}}" | grep -q "^abov3-exodus-full$"; then
    echo "[WARNING] ABOV3 Exodus (full mode) is already installed."
    echo ""
    read -p "Do you want to reinstall? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi

    echo ""
    read -p "Keep existing database data? (Y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Removing existing installation and data..."
        docker-compose -f docker-compose-full.yaml down -v
    else
        echo "Removing existing installation (keeping data)..."
        docker-compose -f docker-compose-full.yaml down
    fi
    echo "[OK] Existing installation removed"
    echo ""
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
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

# Build and start the application
echo ""
echo "Building and starting ABOV3 Exodus with database..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose -f docker-compose-full.yaml up -d --build

echo ""
echo "Waiting for database initialization..."
sleep 10

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "ABOV3 Exodus is now running at:"
echo "   http://localhost:3006"
echo ""
echo "Database Info:"
echo "- PostgreSQL is running on localhost:5432"
echo "- Database: abov3_exodus"
echo "- Username: abov3_user"
echo "- Password: Check .env file"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3006"
echo "2. Click 'Sign Up' to create your account"
echo "3. Configure SMTP in Admin Panel (for email features)"
echo ""
echo "Management Commands:"
echo "- Start:     docker-compose -f docker-compose-full.yaml start"
echo "- Stop:      docker-compose -f docker-compose-full.yaml stop"
echo "- Restart:   docker-compose -f docker-compose-full.yaml restart"
echo "- Uninstall: docker-compose -f docker-compose-full.yaml down"
echo "- Logs:      docker-compose -f docker-compose-full.yaml logs -f"
echo "- DB Backup: docker exec abov3-exodus-db pg_dump -U abov3_user abov3_exodus > backup.sql"
echo ""
echo "[SECURITY WARNING]"
echo "For production deployment:"
echo "1. Change POSTGRES_PASSWORD in .env"
echo "2. Change NEXTAUTH_SECRET in .env"
echo "3. Consider using Docker secrets"
echo "4. Set up HTTPS/SSL"
echo ""

# Try to open browser (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening in your browser..."
    sleep 2
    open http://localhost:3006
fi
