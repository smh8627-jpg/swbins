@echo off
REM saga-web 콘텐츠 에디터 — HEROES/PETS/BIOS 를 다섯 판에 동시 반영하는 로컬 툴.
REM 게임 서버가 아니다. 끝났으면 이 창을 그냥 닫으면(Ctrl+C) 된다.
cd /d "%~dp0"
start "" http://127.0.0.1:8799/
node server.js
