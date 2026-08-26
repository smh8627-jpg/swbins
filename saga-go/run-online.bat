@echo off
REM deungyong-go ONLINE mode server (static files + Claude proxy)
REM API key comes from ANTHROPIC_API_KEY or an `ant auth login` profile.
cd /d "%~dp0"
if not exist "server\node_modules" (
  echo Installing server dependencies...
  pushd server
  call npm install --no-audit --no-fund
  popd
)
start "" http://127.0.0.1:8790/index.html
node server\dg-server.mjs
