#!/bin/bash

# ABOV3 Exodus - Simple Installation Script (Mac/Linux)
# This script installs ABOV3 Exodus without a database
# All data is stored in your browser

set -e

echo "========================================"
echo "ABOV3 Exodus - Simple Installation"
echo "========================================"
echo ""
echo "This will install ABOV3 Exodus without a database."
echo "All conversations are stored in your browser."
echo ""
echo "Perfect for:"
echo "- Personal use"
echo "- Testing"
echo "- Quick setup"
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
if docker ps -a --filter "name=abov3-exodus-simple" --format "{{.Names}}" | grep -q "^abov3-exodus-simple$"; then
    echo "[WARNING] ABOV3 Exodus (simple mode) is already installed."
    echo ""
    read -p "Do you want to reinstall? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi

    echo ""
    echo "Removing existing installation..."
    docker-compose -f docker-compose-simple.yaml down
    echo "[OK] Existing installation removed"
    echo ""
fi

# Build and start the application
echo "Building and starting ABOV3 Exodus..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose -f docker-compose-simple.yaml up -d --build

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "ABOV3 Exodus is now running at:"
echo "   http://localhost:3006"
echo ""
echo "Management Commands:"
echo "- Start:     docker-compose -f docker-compose-simple.yaml start"
echo "- Stop:      docker-compose -f docker-compose-simple.yaml stop"
echo "- Restart:   docker-compose -f docker-compose-simple.yaml restart"
echo "- Uninstall: docker-compose -f docker-compose-simple.yaml down"
echo "- Logs:      docker-compose -f docker-compose-simple.yaml logs -f"
echo ""
echo "NOTE: All data is stored in your browser."
echo "Clearing browser data will delete your conversations."
echo ""

# Try to open browser (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening in your browser..."
    sleep 2
    open http://localhost:3006
fi
