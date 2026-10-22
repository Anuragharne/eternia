@echo off
echo ===================================================
echo Starting Eternia AI Companion (Backend + Frontend)
echo ===================================================

cd /d "%~dp0"

echo [1/2] Launching Backend on http://127.0.0.1:8000 ...
start "Eternia Backend (FastAPI)" cmd /k "set PYTHONPATH=%~dp0&& python -m uvicorn backend.app.main:app --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Frontend on http://localhost:3000 ...
start "Eternia Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo Both servers are running!
echo - Frontend: http://localhost:3000
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo.
pause
