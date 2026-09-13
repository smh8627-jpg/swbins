@echo off
REM Build the standalone single-file build (dist folder)
cd /d "%~dp0"
node build/build-single.mjs
if errorlevel 1 (
  echo.
  echo Build failed. Node.js is required: https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo Done. See the dist folder.
pause
