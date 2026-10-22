# Eternia AI Companion - PowerShell Launcher
$ProjectRoot = $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting Eternia AI Companion (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Start Backend
Write-Host "[1/2] Starting Backend (FastAPI on :8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='$ProjectRoot'; cd '$ProjectRoot'; python -m uvicorn backend.app.main:app --port 8000 --reload"

Start-Sleep -Seconds 2

# 2. Start Frontend
Write-Host "[2/2] Starting Frontend (Next.js on :3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\frontend'; npm run dev"

Start-Sleep -Seconds 3

# 3. Open browser
Write-Host "Opening sanctuary in browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "`nBoth services launched in separate windows!" -ForegroundColor Green
Write-Host " - Frontend UI:  http://localhost:3000" -ForegroundColor White
Write-Host " - Backend Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
