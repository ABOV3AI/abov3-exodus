@echo off
REM ABOV3 Exodus - Simple Installation Script (Windows)
REM This script installs ABOV3 Exodus without a database
REM All data is stored in your browser

echo ========================================
echo ABOV3 Exodus - Simple Installation
echo ========================================
echo.
echo This will install ABOV3 Exodus without a database.
echo All conversations are stored in your browser.
echo.
echo Perfect for:
echo - Personal use
echo - Testing
echo - Quick setup
echo.
echo Requirements:
echo - Docker Desktop installed and running
echo.
pause

REM Check if Docker is running
echo.
echo Checking Docker...
docker version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please:
    echo 1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo 2. Start Docker Desktop
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Check if container already exists
docker ps -a --filter "name=abov3-exodus-simple" --format "{{.Names}}" | findstr /x "abov3-exodus-simple" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] ABOV3 Exodus (simple mode) is already installed.
    echo.
    choice /C YN /M "Do you want to reinstall"
    if errorlevel 2 (
        echo Installation cancelled.
        pause
        exit /b 0
    )

    echo.
    echo Removing existing installation...
    docker-compose -f docker-compose-simple.yaml down
    echo [OK] Existing installation removed
    echo.
)

REM Build and start the application
echo Building and starting ABOV3 Exodus...
echo This may take a few minutes on first run...
echo.

docker-compose -f docker-compose-simple.yaml up -d --build

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo ABOV3 Exodus is now running at:
echo    http://localhost:3006
echo.
echo Opening in your browser...
timeout /t 5 /nobreak >nul
start http://localhost:3006

echo.
echo Management Commands:
echo - Start:     docker-compose -f docker-compose-simple.yaml start
echo - Stop:      docker-compose -f docker-compose-simple.yaml stop
echo - Restart:   docker-compose -f docker-compose-simple.yaml restart
echo - Uninstall: docker-compose -f docker-compose-simple.yaml down
echo - Logs:      docker-compose -f docker-compose-simple.yaml logs -f
echo.
echo NOTE: All data is stored in your browser.
echo Clearing browser data will delete your conversations.
echo.
pause
