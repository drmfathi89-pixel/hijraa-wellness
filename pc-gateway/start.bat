@echo off
title HIJRAA PC Gateway
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download the LTS version from https://nodejs.org then run this again. & pause & exit /b)
if not exist node_modules (echo Installing for the first time, please wait... & call npm install --omit=dev)
node index.mjs
pause
