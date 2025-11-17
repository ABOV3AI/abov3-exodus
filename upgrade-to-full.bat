@echo off
REM ABOV3 Exodus - Upgrade from Simple to Full Mode (Windows)

echo ========================================
echo ABOV3 Exodus - Upgrade to Full Mode
echo ========================================
echo.
echo This will upgrade your ABOV3 Exodus installation from Simple to Full mode.
echo.
echo Full mode includes:
echo - PostgreSQL database
echo - User authentication
echo - Multi-user support
echo - Cloud backup for conversations
echo - Admin panel for configuration
echo.
echo [IMPORTANT] Note about existing data:
echo - Your browser-stored conversations will remain in your browser
echo - They will NOT be automatically migrated to the database
echo - You can continue using them or manually export/import
echo - New conversations can be backed up to the cloud
echo.
pause

REM Check if Docker is running
echo.
echo Checking Docker...
docker version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Check if simple mode is installed
docker ps -a --filter "name=abov3-exodus-simple" --format "{{.Names}}" | findstr /x "abov3-exodus-simple" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] ABOV3 Exodus (simple mode) is not installed.
    echo.
    echo This script is for upgrading from simple to full mode.
    echo If you want to install full mode directly, use: install-full.bat
    echo.
    pause
    exit /b 1
)

echo [OK] Found ABOV3 Exodus (simple mode)
echo.

REM Stop simple mode
echo Stopping simple mode...
docker-compose -f docker-compose-simple.yaml stop
echo [OK] Simple mode stopped
echo.

REM Check for .env file
if not exist ".env" (
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

REM Start full mode
echo.
echo Starting full mode with database...
echo This may take a few minutes...
echo.

docker-compose -f docker-compose-full.yaml up -d --build

if errorlevel 1 (
    echo.
    echo [ERROR] Upgrade failed!
    echo Restarting simple mode...
    docker-compose -f docker-compose-simple.yaml start
    pause
    exit /b 1
)

echo.
echo Waiting for database initialization...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo Upgrade Complete!
echo ========================================
echo.
echo ABOV3 Exodus (full mode) is now running at:
echo    http://localhost:3006
echo.
echo Simple mode has been stopped (but not removed).
echo To remove simple mode completely:
echo    docker-compose -f docker-compose-simple.yaml down
echo.
echo Next Steps:
echo 1. Open http://localhost:3006
echo 2. Create your account (Sign Up)
echo 3. Configure SMTP in Admin Panel (for email features)
echo 4. Start creating cloud-backed conversations!
echo.
echo Note: Your old browser-stored conversations are still available.
echo They will continue working alongside the new cloud-backed conversations.
echo.
pause
