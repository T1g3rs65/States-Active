@echo off
title SovereignHex Server
echo Starting SovereignHex Server Setup...
echo.

REM Run the PowerShell script with execution policy bypass
powershell -ExecutionPolicy Bypass -File "%~dp0START_SERVER.ps1"

pause
