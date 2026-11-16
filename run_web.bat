@echo off
title NyayaSathi Frontend (Web)
echo ===================================================
echo     NYAYASATHI - FRONTEND WEB (PORT 8081)
echo ===================================================
cd /d "%~dp0frontend"
set PATH=C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%~dp0tools\bin;%PATH%
set EXPO_HOME=%~dp0.expo
set EXPO_NO_TELEMETRY=1
call node node_modules\expo\bin\cli start --web --port 8081
pause
