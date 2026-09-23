@echo off
REM saga-web 맵 편집기 - 로컬 전용(게임 서버 아님)
cd /d "%~dp0"
start "" http://127.0.0.1:8800/
node server.js
