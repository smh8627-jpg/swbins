@echo off
REM yeoksa-village local server
set PORT=8793
cd /d "%~dp0"
start "" http://127.0.0.1:%PORT%/index.html
python -m http.server %PORT% --bind 0.0.0.0
