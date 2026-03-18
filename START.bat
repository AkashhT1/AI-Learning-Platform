@echo off
title VidyaAI - Quick Start
color 0B
echo.
echo  ========================================
echo   VidyaAI - AI Learning Platform
echo   Quick Start Script (Windows)
echo  ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
IF ERRORLEVEL 1 (
  echo  ERROR: Node.js not found!
  echo  Please install Node.js from https://nodejs.org
  pause
  exit /b 1
)

echo  [1/4] Node.js found: 
node --version
echo.

:: Install backend
echo  [2/4] Installing backend dependencies...
cd backend
call npm install
IF ERRORLEVEL 1 (
  echo  ERROR: Backend install failed!
  pause
  exit /b 1
)
cd ..

:: Install frontend
echo  [3/4] Installing frontend dependencies...
cd frontend
call npm install
IF ERRORLEVEL 1 (
  echo  ERROR: Frontend install failed!
  pause
  exit /b 1
)
cd ..

:: Copy .env if not exists
echo  [4/4] Setting up environment...
IF NOT EXIST "backend\.env" (
  copy "backend\.env.example" "backend\.env"
  echo  Created backend\.env from template
  echo  NOTE: Edit backend\.env to add your Azure OpenAI keys for live AI
  echo  The app works without keys using built-in demo data.
) ELSE (
  echo  backend\.env already exists, skipping...
)

echo.
echo  ========================================
echo   Setup complete! Starting servers...
echo  ========================================
echo.
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:5000
echo.
echo  Demo Accounts:
echo    Teacher:  teacher@vidyaai.com / teacher123
echo    Student:  arjun@vidyaai.com   / student123
echo    Student:  rahul@vidyaai.com   / student123
echo.

:: Start both servers in separate windows
start "VidyaAI Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "VidyaAI Frontend" cmd /k "cd frontend && npm start"

echo  Both servers are starting in separate windows...
echo  Browser will open automatically at http://localhost:3000
echo.
pause
