@echo off
setlocal

cd /d "%~dp0"

set "VITE_PORT=43127"
set "APP_URL=http://127.0.0.1:%VITE_PORT%/ai-options-story/"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd was not found in PATH.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo package.json was not found in this folder.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules not found. Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting app and database in one window...
echo Browser URL: %APP_URL%
echo.

call node server/dev.js

echo.
echo App stopped.
pause
endlocal
