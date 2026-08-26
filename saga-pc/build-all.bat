@echo off
REM Build the PC bundle for all five games
cd /d "%~dp0"
node build-all.mjs
if errorlevel 1 (
  echo.
  echo Build failed. Node.js is required: https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo Done. Copy the dist folder to your home PC.
pause
