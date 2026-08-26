@echo off
REM yeoksa-side local server
set PORT=8794
cd /d "%~dp0"
python -m http.server %PORT% --bind 0.0.0.0
