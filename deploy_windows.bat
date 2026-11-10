@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo ERROR: Install Node.js LTS first.& pause & exit /b 1)
call npm install
if errorlevel 1 (echo npm install failed.& pause & exit /b 1)
call npm run audit:science
if errorlevel 1 (echo Scientific file integrity check failed. Deployment aborted.& pause & exit /b 1)
call npm test
if errorlevel 1 (echo Tests failed. Deployment aborted.& pause & exit /b 1)
call npm run build
if errorlevel 1 (echo Build failed. Deployment aborted.& pause & exit /b 1)
call npm run audit:bundle
if errorlevel 1 (echo Bundle budget check failed. Deployment aborted.& pause & exit /b 1)
call npx wrangler deploy
if errorlevel 1 (echo Deployment failed. Try npx wrangler login.& pause & exit /b 1)
echo Deployment finished. Test the live URL and /api/status endpoint.
pause
