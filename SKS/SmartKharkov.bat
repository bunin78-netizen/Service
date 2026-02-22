@echo off
chcp 65001 > nul 2>&1
title SmartKharkov

cd /d "%~dp0"

rem === If dist\index.html exists - just open it ===
if exist "dist\index.html" (
    start "" "%~dp0dist\index.html"
    exit /b 0
)

rem === dist not found - need to build ===
echo.
echo  SmartKharkov - dist\index.html not found!
echo.
echo  Running build process...
echo.

where node > nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not installed!
    echo  Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo  Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed!
        pause
        exit /b 1
    )
)

echo  Building project...
call npm run build
if errorlevel 1 (
    echo  [ERROR] Build failed!
    pause
    exit /b 1
)

if exist "dist\index.html" (
    start "" "%~dp0dist\index.html"
) else (
    echo  [ERROR] Build completed but dist\index.html not found!
    pause
)
