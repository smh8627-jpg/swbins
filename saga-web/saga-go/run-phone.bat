@echo off
REM deungyong-go - play on your phone (HTTPS on the local network)
REM iPhone Safari blocks the geolocation API on insecure origins, so HTTPS is required.
cd /d "%~dp0"
if not exist "server\node_modules" (
  echo Installing server dependencies...
  pushd server
  call npm install --no-audit --no-fund
  popd
)
if not exist "server\certs\dg-server.crt" (
  echo Creating a local certificate...
  node server\make-cert.mjs
)
echo.
echo === Install server\certs\dg-ca.crt on the phone once, then trust it ===
echo     Settings ^> General ^> About ^> Certificate Trust Settings
echo.
set HOST=0.0.0.0
node server\dg-server.mjs
