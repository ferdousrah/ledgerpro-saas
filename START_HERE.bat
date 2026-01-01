@echo off
echo ============================================================
echo LedgerPro SaaS - Startup Script
echo ============================================================
echo.

echo Step 1: Checking PostgreSQL status...
echo.

REM Try to ping PostgreSQL port
netstat -an | findstr :5432 > nul
if %errorlevel%==0 (
    echo [OK] PostgreSQL appears to be running on port 5432
) else (
    echo [WARNING] PostgreSQL does not appear to be running!
    echo.
    echo Please start PostgreSQL before continuing:
    echo   - Open Windows Services ^(services.msc^)
    echo   - Find PostgreSQL service
    echo   - Click Start
    echo.
    echo Or use pgAdmin to start the server.
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Running database migration for financial year enum fix...
echo.
cd backend
py run_enum_migration.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Migration failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Migration completed successfully!
echo ============================================================
echo.
echo Next steps:
echo   1. Open a new terminal and start the backend:
echo      cd backend
echo      py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo   2. Open another terminal and start the frontend:
echo      cd frontend
echo      npm run dev
echo.
echo   3. Open http://localhost:5173 in your browser
echo.
echo   4. Test creating a financial year - the error should be fixed!
echo ============================================================
pause
