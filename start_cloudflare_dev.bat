@echo off
setlocal
cd /d "%~dp0"
echo Attempting full Cloudflare workerd emulator (may crash on some Windows systems).
if not exist "node_modules\wrangler" call npm install
call npm run build
if errorlevel 1 (echo Build failed.& pause & exit /b 1)
call npx wrangler dev --port 8787
if errorlevel 1 echo Wrangler dev failed. Run start_windows.bat for Node.js local preview.
pause
