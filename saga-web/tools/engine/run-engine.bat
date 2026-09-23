@echo off
REM 사가 엔진 — 코드 없이 3D 게임을 만드는 편집기(로컬 전용, 포트 8801). 게임 서버가 아니다.
REM 끝났으면 이 창을 닫으면(Ctrl+C) 된다.
cd /d "%~dp0"
start "" http://127.0.0.1:8801/
node server.js
