@echo off
REM saga-web 게임 제작 도구 한 곳에서 열기 — 콘텐츠 편집기(8799)·맵 편집기(8800)·사가 엔진(8801) 서버를
REM 각각 새 창으로 띄우고 허브 페이지(index.html)를 연다. 로컬 전용, 게임 서버 아니다.
REM 끝났으면 각 서버 창을 닫으면(Ctrl+C) 된다. 이 창은 그냥 닫아도 된다.
cd /d "%~dp0"
start "content-editor :8799" cmd /k "cd /d "%~dp0content-editor" && node server.js"
start "map-editor :8800" cmd /k "cd /d "%~dp0map-editor" && node server.js"
start "engine :8801" cmd /k "cd /d "%~dp0engine" && node server.js"
timeout /t 1 /nobreak >nul
start "" "%~dp0index.html"
