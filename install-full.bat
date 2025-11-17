@echo off
REM ABOV3 Exodus - Full Installation Script (Windows)
REM This script installs ABOV3 Exodus with PostgreSQL database

echo ========================================
echo ABOV3 Exodus - Full Installation
echo ========================================
echo.
echo This will install ABOV3 Exodus with:
echo - PostgreSQL database
echo - User authentication
echo - Multi-user support
echo - Cloud backup for conversations
echo - Admin panel for configuration
echo.
echo Perfect for:
echo - Multi-user deployments
echo - Team usage
echo - Production environments
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
docker ps -a --filter "name=abov3-exodus-full" --format "{{.Names}}" | findstr /x "abov3-exodus-full" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] ABOV3 Exodus (full mode) is already installed.
    echo.
    choice /C YN /M "Do you want to reinstall"
    if errorlevel 2 (
        echo Installation cancelled.
        pause
        exit /b 0
    )

    echo.
    choice /C YN /M "Keep existing database data"
    if errorlevel 2 (
        echo Removing existing installation and data...
        docker-compose -f docker-compose-full.yaml down -v
    ) else (
        echo Removing existing installation (keeping data)...
        docker-compose -f docker-compose-full.yaml down
    )
    echo [OK] Existing installation removed
    echo.
)

REM Check for .env file
if not exist ".env" (
    echo.
    echo Creating default .env file...
    echo # ABOV3 Exodus - Environment Variables > .env
    echo # >> .env
    echo # Database Password >> .env
    echo # Change this for production! >> .env
    echo POSTGRES_PASSWORD=abov3_secure_password_change_me >> .env
    echo. >> .env
    echo # NextAuth Secret >> .env
    echo # Generate with: openssl rand -base64 32 >> .env
    echo # Change this for production! >> .env
    echo NEXTAUTH_SECRET=default_secret_key_CHANGE_THIS_IN_PRODUCTION_use_openssl_rand_base64_32 >> .env
    echo. >> .env
    echo # Application URL >> .env
    echo NEXTAUTH_URL=http://localhost:3006 >> .env
    echo. >> .env
    echo # Optional: AI API Keys (can also configure in UI) >> .env
    echo # OPENAI_API_KEY= >> .env
    echo # ANTHROPIC_API_KEY= >> .env
    echo # GOOGLE_AI_API_KEY= >> .env
    echo. >> .env
    echo # Optional: Email Configuration (can also configure in Admin Panel) >> .env
    echo # EMAIL_SERVER_HOST=smtp.gmail.com >> .env
    echo # EMAIL_SERVER_PORT=587 >> .env
    echo # EMAIL_SERVER_USER=your@email.com >> .env
    echo # EMAIL_SERVER_PASSWORD=your-app-password >> .env
    echo # EMAIL_FROM=noreply@abov3-exodus.com >> .env

    echo [OK] Created .env file with default values
    echo.
    echo [IMPORTANT] For production:
    echo 1. Edit .env file
    echo 2. Change POSTGRES_PASSWORD
    echo 3. Change NEXTAUTH_SECRET
    echo.
    pause
)

REM Build and start the application
echo Building and starting ABOV3 Exodus with database...
echo This may take a few minutes on first run...
echo.

docker-compose -f docker-compose-full.yaml up -d --build

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo Waiting for database initialization...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo ABOV3 Exodus is now running at:
echo    http://localhost:3006
echo.
echo Database Info:
echo - PostgreSQL is running on localhost:5432
echo - Database: abov3_exodus
echo - Username: abov3_user
echo - Password: Check .env file
echo.
echo Next Steps:
echo 1. Open http://localhost:3006
echo 2. Click "Sign Up" to create your account
echo 3. Configure SMTP in Admin Panel (for email features)
echo.
echo Opening in your browser...
timeout /t 5 /nobreak >nul
start http://localhost:3006

echo.
echo Management Commands:
echo - Start:     docker-compose -f docker-compose-full.yaml start
echo - Stop:      docker-compose -f docker-compose-full.yaml stop
echo - Restart:   docker-compose -f docker-compose-full.yaml restart
echo - Uninstall: docker-compose -f docker-compose-full.yaml down
echo - Logs:      docker-compose -f docker-compose-full.yaml logs -f
echo - DB Backup: docker exec abov3-exodus-db pg_dump -U abov3_user abov3_exodus ^> backup.sql
echo.
echo [SECURITY WARNING]
echo For production deployment:
echo 1. Change POSTGRES_PASSWORD in .env
echo 2. Change NEXTAUTH_SECRET in .env
echo 3. Consider using Docker secrets
echo 4. Set up HTTPS/SSL
echo.
pause
