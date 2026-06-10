@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "SCRIPT=%ROOT%scripts\local\start-local.ps1"

cd /d "%ROOT%"

echo ================================================
echo  SMU FNISC RAS local portal startup
echo ================================================
echo.

if not exist "%SCRIPT%" (
  echo ERROR: startup script was not found:
  echo "%SCRIPT%"
  echo.
  pause
  exit /b 1
)

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: powershell.exe was not found.
  echo Install Windows PowerShell or PowerShell 7, then try again.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Startup failed with exit code: %EXIT_CODE%
  echo The window is kept open so you can read the log above.
  pause
)

endlocal
exit /b %EXIT_CODE%
