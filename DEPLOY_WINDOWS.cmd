@echo off
setlocal
cd /d "%~dp0"
call npm ci --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm run qa
if errorlevel 1 exit /b 1
call npx wrangler login
if errorlevel 1 exit /b 1
call npx wrangler deploy --name oman-earth-intelligence-preview
if errorlevel 1 exit /b 1
pause
