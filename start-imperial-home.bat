@echo off
title Imperial Home — local server
cd /d "%~dp0"
echo.
echo  Imperial Home — starting...
echo.
if not exist node_modules (
  echo  Installing dependencies (first time only)...
  call npm install
)
node scripts/setup-project.mjs
echo.
echo  Opening http://localhost:5173 in your browser...
start http://localhost:5173
echo  Keep this window open while you edit the site.
echo  Press Ctrl+C to stop the server.
echo.
call npm run start
