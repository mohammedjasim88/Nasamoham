@echo off
setlocal
cd /d "%~dp0"
title Oman Earth Intelligence - Stable Local Preview
where node >nul 2>nul || (echo ERROR: Install Node.js LTS first.& pause & exit /b 1)
echo ==============================================================
echo  OMAN EARTH INTELLIGENCE - WINDOWS LOCAL PREVIEW
 echo ==============================================================
echo  This uses Node.js rather than workerd; avoids Wrangler crashes.
echo  It does NOT update your Cloudflare production site.
echo ==============================================================
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (echo ERROR: npm install failed.& pause & exit /b 1)
)
echo Running project tests...
call npm test
if errorlevel 1 (echo ERROR: Tests failed.& pause & exit /b 1)
echo Building React application...
call npm run build
if errorlevel 1 (echo ERROR: Build failed.& pause & exit /b 1)
echo.
echo Opening local preview at http://127.0.0.1:8787
start "" "http://127.0.0.1:8787"
node scripts\local_node_preview.mjs
if errorlevel 1 (echo ERROR: Local preview failed.& pause & exit /b 1)
pause
