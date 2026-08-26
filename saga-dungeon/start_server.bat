@echo off
REM yeoksa-dungeon static server for swbinbot hub (no browser popup)
set PORT=8792
cd /d "%~dp0"
python -m http.server %PORT% --bind 0.0.0.0
