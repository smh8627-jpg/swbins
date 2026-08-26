@echo off
REM saga-realm local server
set PORT=8795
cd /d "%~dp0"
python -m http.server %PORT% --bind 0.0.0.0
