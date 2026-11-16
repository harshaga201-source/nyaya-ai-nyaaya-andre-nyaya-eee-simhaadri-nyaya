@echo off
title NyayaSathi Backend (FastAPI)
echo ===================================================
echo     NYAYASATHI - BACKEND SERVICE (PORT 8000)
echo ===================================================
cd /d "%~dp0"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
