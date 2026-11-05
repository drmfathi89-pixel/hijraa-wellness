@echo off
title HIJRAA PC Gateway
cd /d "%~dp0"
if not exist "%~dp0package.json" (
  echo.
  echo  This file was opened from inside the zip, so the other files are missing.
  echo.
  echo  Please:  1. Close this window.
  echo           2. Right-click hijraa-pc-gateway.zip and choose "Extract All...".
  echo           3. Open the extracted folder and double-click start.bat there.
  echo.
  pause
  exit /b
)
where node >nul 2>nul || (echo Node.js is not installed. Download the LTS version from https://nodejs.org then run this again. & pause & exit /b)
if not exist node_modules (echo Installing for the first time, please wait... & call npm install --omit=dev --no-audit --no-fund)
if not exist node_modules (echo. & echo Installation failed. Check the internet connection and run start.bat again. & pause & exit /b)
node index.mjs
pause
