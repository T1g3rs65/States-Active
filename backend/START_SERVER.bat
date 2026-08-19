@echo off
title Rise of Nations Server
echo ============================================
echo   Rise of Nations - Game Server
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed
    echo.
    echo Please install Python 3.11+ from:
    echo   https://python.org/downloads
    echo.
    echo Make sure to check "Add Python to PATH" during install!
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist ".deps_installed" (
    echo Installing dependencies (first time only)...
    pip install -r requirements_server.txt
    echo. > .deps_installed
    echo Dependencies installed!
    echo.
)

REM Run the server
echo Starting server...
python launcher.py

pause
