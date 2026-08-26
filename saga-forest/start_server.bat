@echo off
REM yeoksa-village local server
set PORT=8793
cd /d "%~dp0"
python -m http.server %PORT% --bind 0.0.0.0
