@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "APP_HOST=127.0.0.1"
set "APP_PORT=3002"
set "APP_URL=http://%APP_HOST%:%APP_PORT%/"

echo Starting project...
echo Expected local URL: %APP_URL%
echo.
echo Checking Node.js environment...
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

if not exist "node_modules" (
  echo node_modules not found. Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Checking port %APP_PORT%...
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %APP_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`) do (
  echo Port %APP_PORT% is in use by PID %%P. Stopping it...
  taskkill /PID %%P /F
  if errorlevel 1 (
    echo Failed to stop PID %%P. Close the process using port %APP_PORT% and try again.
    pause
    exit /b 1
  )
)

echo Running: npm.cmd exec vite -- --host %APP_HOST% --port %APP_PORT% --strictPort
call npm.cmd exec vite -- --host %APP_HOST% --port %APP_PORT% --strictPort
if errorlevel 1 (
  echo The development server exited with an error.
  pause
  exit /b 1
)

endlocal
