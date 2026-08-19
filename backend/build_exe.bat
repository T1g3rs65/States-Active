@echo off
echo ============================================
echo   SovereignHex - Server Build Script
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

echo Checking Python version...
python -c "import sys; exit(0 if sys.version_info >= (3,8) else 1)"
if errorlevel 1 (
    echo.
    echo ERROR: Python 3.8 or higher is required!
    echo Your current version is too old.
    echo.
    echo Please download Python 3.11 from:
    echo   https://python.org/downloads
    echo.
    pause
    exit /b 1
)

echo.
echo NOTE: This server requires MongoDB to be running.
echo You can download MongoDB from: https://www.mongodb.com/try/download/community
echo.

REM Install dependencies
echo Installing dependencies...
pip install -r requirements_server.txt
pip install pyinstaller

REM Build the executable using python -m
echo.
echo Building executable...
python -m PyInstaller --onefile --name SovereignHex-Server --hidden-import uvicorn.logging --hidden-import uvicorn.loops --hidden-import uvicorn.loops.auto --hidden-import uvicorn.protocols --hidden-import uvicorn.protocols.http --hidden-import uvicorn.protocols.http.auto --hidden-import uvicorn.lifespan --hidden-import uvicorn.lifespan.on launcher.py

echo.
echo ============================================
if exist "dist\SovereignHex-Server.exe" (
    echo SUCCESS! Executable created at:
    echo   dist\SovereignHex-Server.exe
    echo.
    echo IMPORTANT: Copy these files to the dist folder:
    echo   - server.py
    echo   - models.py
    echo   - ai_service.py
    echo   - economy_utils.py
    echo   - policy_service.py
    echo   - image_service.py
    echo.
    echo Then run SovereignHex-Server.exe
) else (
    echo BUILD FAILED - Check the error messages above
)
echo ============================================
pause
