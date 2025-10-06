@echo off
echo 🔐 LockSafe Password Manager - Server Startup Script
echo ==================================================

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

echo.
echo 🚀 Starting LockSafe Password Manager Server...
echo Server will be available at: http://localhost:5000
echo.
echo ⚠️  IMPORTANT NOTES:
echo 1. Configure your email settings in config.env for OTP functionality
echo 2. For development, OTPs will be printed to console
echo 3. Use Ctrl+C to stop the server
echo.

REM Start the server
python server.py
pause
