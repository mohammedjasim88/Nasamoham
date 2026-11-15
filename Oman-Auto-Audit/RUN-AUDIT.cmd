@echo off
setlocal
chcp 65001 >nul
set "PROJECT=%~dp0.."
cd /d "%PROJECT%"

echo ========================================
echo   OMAN EARTH INTELLIGENCE - AUTO AUDIT
echo ========================================
echo.
if not exist "package.json" (
  echo ERROR: package.json not found.
  echo Place the Oman-Auto-Audit folder INSIDE your project folder,
  echo beside package.json and wrangler.jsonc, then run this again.
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js/npm not found in PATH.
  pause
  exit /b 1
)

if not exist "node_modules\@playwright\test\package.json" (
  echo [1/3] Installing official Playwright Test into this project...
  call npm.cmd install --save-dev @playwright/test@latest
  if errorlevel 1 (
    echo ERROR: npm install failed. See the messages above.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Playwright Test already installed.
)

echo.
echo [2/3] Checking Chromium browser...
call npx.cmd playwright install chromium
if errorlevel 1 (
  echo ERROR: Chromium install failed.
  pause
  exit /b 1
)

echo.
echo [3/3] Running automated tests and generating HTML and JSON reports...
if not exist "audit-results" mkdir "audit-results"
echo Checking npm dependency vulnerabilities (separate report)...
call npm.cmd audit --json > "audit-results\npm-security-audit.json" 2>nul
set "PLAYWRIGHT_HTML_OPEN=never"
call npx.cmd playwright test --config="%~dp0playwright.audit.config.cjs"
set "TEST_RESULT=%ERRORLEVEL%"

echo.
echo ========================================
if "%TEST_RESULT%"=="0" (
 echo AUTOMATED CHECKS FINISHED: ALL TESTS PASSED
) else (
 echo AUTOMATED CHECKS FINISHED: AT LEAST ONE FAILURE
 echo Review the HTML report for exact errors and screenshots.
)
echo Report: %CD%\audit-results\html
 echo JSON:  %CD%\audit-results\results.json
echo Dependencies: %CD%\audit-results\npm-security-audit.json
echo ========================================
echo.
echo Opening the visual report in your browser...
call npx.cmd playwright show-report "audit-results\html"
endlocal
