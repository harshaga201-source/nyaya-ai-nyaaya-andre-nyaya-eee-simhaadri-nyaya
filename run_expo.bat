@echo off
title NyayaSathi Mobile (Expo Go Android/iOS)
echo ===================================================
echo     NYAYASATHI - EXPO GO (ANDROID & IOS)
echo ===================================================
cd /d "%~dp0frontend"
set PATH=C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%~dp0tools\bin;%PATH%
set EXPO_HOME=%~dp0.expo
set EXPO_NO_TELEMETRY=1
call node node_modules\expo\bin\cli start
pause
