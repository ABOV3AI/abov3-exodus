@echo off
REM ABOV3 Exodus - Management Script (Windows)

if "%1"=="" goto help
if "%2"=="" set MODE=simple
if not "%2"=="" set MODE=%2

if "%MODE%" neq "simple" if "%MODE%" neq "full" (
    echo [ERROR] Invalid mode: %MODE%
    echo Mode must be "simple" or "full"
    exit /b 1
)

set COMPOSE_FILE=docker-compose-%MODE%.yaml

if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="status" goto status
if "%1"=="logs" goto logs
if "%1"=="update" goto update
if "%1"=="uninstall" goto uninstall
if "%1"=="backup" goto backup
if "%1"=="shell" goto shell

goto help

:start
echo Starting ABOV3 Exodus (%MODE% mode)...
docker-compose -f %COMPOSE_FILE% start
goto end

:stop
echo Stopping ABOV3 Exodus (%MODE% mode)...
docker-compose -f %COMPOSE_FILE% stop
goto end

:restart
echo Restarting ABOV3 Exodus (%MODE% mode)...
docker-compose -f %COMPOSE_FILE% restart
goto end

:status
echo ABOV3 Exodus Status (%MODE% mode):
docker-compose -f %COMPOSE_FILE% ps
echo.
echo Health check:
if "%MODE%"=="simple" (
    docker exec abov3-exodus-simple wget --quiet --tries=1 --spider http://localhost:3000/api/health && echo [OK] Application is healthy || echo [ERROR] Application is unhealthy
) else (
    docker exec abov3-exodus-full wget --quiet --tries=1 --spider http://localhost:3000/api/health && echo [OK] Application is healthy || echo [ERROR] Application is unhealthy
)
goto end

:logs
echo ABOV3 Exodus Logs (%MODE% mode):
echo Press Ctrl+C to exit
docker-compose -f %COMPOSE_FILE% logs -f
goto end

:update
echo Updating ABOV3 Exodus (%MODE% mode)...
echo Pulling latest changes...
docker-compose -f %COMPOSE_FILE% pull
echo Rebuilding...
docker-compose -f %COMPOSE_FILE% up -d --build
echo [OK] Update complete
goto end

:uninstall
echo.
echo [WARNING] This will remove ABOV3 Exodus (%MODE% mode)
if "%MODE%"=="full" (
    echo.
    choice /C YN /M "Do you want to keep the database data"
    if errorlevel 2 (
        echo Removing installation and data...
        docker-compose -f %COMPOSE_FILE% down -v
    ) else (
        echo Removing installation (keeping data)...
        docker-compose -f %COMPOSE_FILE% down
    )
) else (
    choice /C YN /M "Are you sure"
    if errorlevel 2 (
        echo Uninstall cancelled.
        goto end
    )
    docker-compose -f %COMPOSE_FILE% down
)
echo [OK] Uninstall complete
goto end

:backup
if "%MODE%"=="simple" (
    echo [ERROR] Backup is only available in full mode
    echo Simple mode stores data in browser only
    exit /b 1
)
echo Creating database backup...
docker exec abov3-exodus-db pg_dump -U abov3_user abov3_exodus > backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
echo [OK] Backup created
goto end

:shell
if "%MODE%"=="simple" (
    docker exec -it abov3-exodus-simple sh
) else (
    echo Which container?
    echo 1. Application (abov3-exodus-full)
    echo 2. Database (abov3-exodus-db)
    choice /C 12 /M "Select container"
    if errorlevel 2 (
        docker exec -it abov3-exodus-db psql -U abov3_user -d abov3_exodus
    ) else (
        docker exec -it abov3-exodus-full sh
    )
)
goto end

:help
echo ========================================
echo ABOV3 Exodus - Management Script
echo ========================================
echo.
echo Usage: manage.bat [command] [mode]
echo.
echo Commands:
echo   start      - Start the application
echo   stop       - Stop the application
echo   restart    - Restart the application
echo   status     - Show application status
echo   logs       - Show application logs (follow mode)
echo   update     - Pull and rebuild latest version
echo   uninstall  - Remove the application
echo   backup     - Backup database (full mode only)
echo   shell      - Open shell in container
echo.
echo Modes:
echo   simple     - Simple mode (no database) [default]
echo   full       - Full mode (with database)
echo.
echo Examples:
echo   manage.bat start         # Start simple mode
echo   manage.bat start full    # Start full mode
echo   manage.bat logs simple   # View simple mode logs
echo   manage.bat backup full   # Backup database
echo.

:end
