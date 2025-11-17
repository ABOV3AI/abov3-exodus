#!/bin/bash

# ABOV3 Exodus - Management Script (Mac/Linux)

set -e

MODE="${2:-simple}"

if [[ "$MODE" != "simple" && "$MODE" != "full" ]]; then
    echo "[ERROR] Invalid mode: $MODE"
    echo "Mode must be 'simple' or 'full'"
    exit 1
fi

COMPOSE_FILE="docker-compose-${MODE}.yaml"

case "$1" in
    start)
        echo "Starting ABOV3 Exodus ($MODE mode)..."
        docker-compose -f "$COMPOSE_FILE" start
        echo "[OK] Started"
        ;;

    stop)
        echo "Stopping ABOV3 Exodus ($MODE mode)..."
        docker-compose -f "$COMPOSE_FILE" stop
        echo "[OK] Stopped"
        ;;

    restart)
        echo "Restarting ABOV3 Exodus ($MODE mode)..."
        docker-compose -f "$COMPOSE_FILE" restart
        echo "[OK] Restarted"
        ;;

    status)
        echo "ABOV3 Exodus Status ($MODE mode):"
        docker-compose -f "$COMPOSE_FILE" ps
        echo ""
        echo "Health check:"
        if [ "$MODE" = "simple" ]; then
            if docker exec abov3-exodus-simple wget --quiet --tries=1 --spider http://localhost:3000/api/health; then
                echo "[OK] Application is healthy"
            else
                echo "[ERROR] Application is unhealthy"
            fi
        else
            if docker exec abov3-exodus-full wget --quiet --tries=1 --spider http://localhost:3000/api/health; then
                echo "[OK] Application is healthy"
            else
                echo "[ERROR] Application is unhealthy"
            fi
        fi
        ;;

    logs)
        echo "ABOV3 Exodus Logs ($MODE mode):"
        echo "Press Ctrl+C to exit"
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;

    update)
        echo "Updating ABOV3 Exodus ($MODE mode)..."
        echo "Pulling latest changes..."
        docker-compose -f "$COMPOSE_FILE" pull
        echo "Rebuilding..."
        docker-compose -f "$COMPOSE_FILE" up -d --build
        echo "[OK] Update complete"
        ;;

    uninstall)
        echo ""
        echo "[WARNING] This will remove ABOV3 Exodus ($MODE mode)"
        if [ "$MODE" = "full" ]; then
            echo ""
            read -p "Do you want to keep the database data? (Y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                echo "Removing installation and data..."
                docker-compose -f "$COMPOSE_FILE" down -v
            else
                echo "Removing installation (keeping data)..."
                docker-compose -f "$COMPOSE_FILE" down
            fi
        else
            read -p "Are you sure? (y/N): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Uninstall cancelled."
                exit 0
            fi
            docker-compose -f "$COMPOSE_FILE" down
        fi
        echo "[OK] Uninstall complete"
        ;;

    backup)
        if [ "$MODE" = "simple" ]; then
            echo "[ERROR] Backup is only available in full mode"
            echo "Simple mode stores data in browser only"
            exit 1
        fi
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        echo "Creating database backup to $BACKUP_FILE..."
        docker exec abov3-exodus-db pg_dump -U abov3_user abov3_exodus > "$BACKUP_FILE"
        echo "[OK] Backup created: $BACKUP_FILE"
        ;;

    shell)
        if [ "$MODE" = "simple" ]; then
            docker exec -it abov3-exodus-simple sh
        else
            echo "Which container?"
            echo "1. Application (abov3-exodus-full)"
            echo "2. Database (abov3-exodus-db)"
            read -p "Select container (1/2): " -n 1 -r
            echo ""
            if [[ $REPLY = "2" ]]; then
                docker exec -it abov3-exodus-db psql -U abov3_user -d abov3_exodus
            else
                docker exec -it abov3-exodus-full sh
            fi
        fi
        ;;

    *)
        echo "========================================"
        echo "ABOV3 Exodus - Management Script"
        echo "========================================"
        echo ""
        echo "Usage: ./manage.sh [command] [mode]"
        echo ""
        echo "Commands:"
        echo "  start      - Start the application"
        echo "  stop       - Stop the application"
        echo "  restart    - Restart the application"
        echo "  status     - Show application status"
        echo "  logs       - Show application logs (follow mode)"
        echo "  update     - Pull and rebuild latest version"
        echo "  uninstall  - Remove the application"
        echo "  backup     - Backup database (full mode only)"
        echo "  shell      - Open shell in container"
        echo ""
        echo "Modes:"
        echo "  simple     - Simple mode (no database) [default]"
        echo "  full       - Full mode (with database)"
        echo ""
        echo "Examples:"
        echo "  ./manage.sh start         # Start simple mode"
        echo "  ./manage.sh start full    # Start full mode"
        echo "  ./manage.sh logs simple   # View simple mode logs"
        echo "  ./manage.sh backup full   # Backup database"
        echo ""
        exit 1
        ;;
esac
