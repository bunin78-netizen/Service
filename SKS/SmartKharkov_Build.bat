@echo off
chcp 65001 > nul 2>&1
title SmartKharkov Build

cd /d "%~dp0"

echo.
echo  =====================================================
echo   SmartKharkov - Auto Repair Shop Management System
echo   PROJECT BUILD
echo  =====================================================
echo.
echo  Folder: %~dp0
echo.

rem === Step 1: Check Node.js ===
echo  [1/4] Checking Node.js...
where node > nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Node.js not found!
    echo.
    echo  Download Node.js from: https://nodejs.org/
    echo  Choose LTS version. After install - RESTART your PC!
    echo.
    set /p OPEN_NODE=Open nodejs.org in browser? (Y/N): 
    if /i "%OPEN_NODE%"=="Y" (
        start https://nodejs.org/
    )
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% found
echo.

rem === Step 2: Check npm ===
echo  [2/4] Checking npm...
where npm > nul 2>&1
if errorlevel 1 (
    echo  [ERROR] npm not found! Reinstall Node.js.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm --version 2^>nul') do set NPM_VER=%%v
echo  [OK] npm v%NPM_VER% found
echo.

rem === Step 3: Check package.json ===
if not exist "package.json" (
    echo  [ERROR] package.json not found!
    echo  Run this file from the SmartKharkov project folder.
    pause
    exit /b 1
)

rem === Step 4: Install dependencies ===
echo  [3/4] Checking dependencies...
if not exist "node_modules\" (
    echo  [INFO] node_modules not found. Installing (2-3 minutes)...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [ERROR] npm install failed!
        echo  Try running as Administrator (right-click -> Run as Administrator)
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed
) else (
    echo  [OK] node_modules found
)
echo.

rem === Step 5: Build ===
echo  [4/4] Building SmartKharkov...
echo  Please wait 30-90 seconds...
echo.

call npm run build
if errorlevel 1 (
    echo.
    echo  [ERROR] Build failed! Check the errors above.
    echo.
    pause
    exit /b 1
)

rem === Check result ===
if not exist "dist\index.html" (
    echo  [ERROR] dist\index.html not created after build!
    pause
    exit /b 1
)

echo.
echo  =====================================================
echo   [SUCCESS] SmartKharkov built successfully!
echo  =====================================================
echo.
echo  File: %~dp0dist\index.html
echo.

rem === Open in browser ===
echo  Opening SmartKharkov in browser...
start "" "%~dp0dist\index.html"

if errorlevel 1 (
    echo  [INFO] Open manually: dist\index.html
)

echo.
echo  Next time just open: dist\index.html
echo  or double-click: ZAPUSTITI.bat
echo.
echo  Press any key to exit...
pause > nul
