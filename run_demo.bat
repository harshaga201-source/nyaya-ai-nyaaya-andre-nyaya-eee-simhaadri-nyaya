@echo off
title NyayaSathi Demo Launcher
echo ===================================================
echo     NYAYASATHI - STARTING COMPLETE DEMO
echo ===================================================
cd /d "%~dp0"
start "NyayaSathi Backend" cmd /c "run_backend.bat"
timeout /t 3 /nobreak >nul
start "NyayaSathi Web" cmd /c "run_web.bat"
echo Services started!
echo Backend: http://localhost:8000
echo Web App: http://localhost:8081
pause
