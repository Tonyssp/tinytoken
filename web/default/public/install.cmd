@echo off
setlocal

REM TinyToken Windows CMD launcher.
REM Usage:
REM   curl -fsSL https://tinyapi.org/install.cmd -o install.cmd && install.cmd
REM
REM Local test:
REM   set TINYTOKEN_INSTALLER_URL=http://127.0.0.1:3001/tinytoken-setup.mjs
REM   curl -fsSL http://127.0.0.1:3001/install.cmd -o install.cmd && install.cmd

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20+ is required. Install it from https://nodejs.org/ first.
  exit /b 1
)

for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
  echo Node.js ^>= 20 required.
  node -v
  exit /b 1
)

if "%TINYTOKEN_INSTALLER_URL%"=="" (
  set "TINYTOKEN_INSTALLER_URL=https://tinyapi.org/tinytoken-setup.mjs"
)

set "TMP_FILE=%TEMP%\tinytoken-setup-%RANDOM%%RANDOM%.mjs"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%TINYTOKEN_INSTALLER_URL%' -UseBasicParsing -OutFile '%TMP_FILE%'"
if errorlevel 1 (
  echo Failed to download TinyToken setup.
  exit /b 1
)

node "%TMP_FILE%" %*
set EXIT_CODE=%ERRORLEVEL%
del "%TMP_FILE%" >nul 2>nul
exit /b %EXIT_CODE%
