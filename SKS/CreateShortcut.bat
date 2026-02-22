@echo off
chcp 65001 > nul 2>&1
title SmartKharkov - Create Shortcut

cd /d "%~dp0"

echo.
echo  SmartKharkov - Create Desktop Shortcut
echo.

if not exist "dist\index.html" (
    echo  [WARNING] dist\index.html not found!
    echo  Run SmartKharkov_Build.bat first to build the project.
    echo.
    pause
    exit /b 1
)

set "HTML_FILE=%~dp0dist\index.html"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\SmartKharkov.lnk"

powershell -ExecutionPolicy Bypass -NoProfile -Command "$s=New-Object -ComObject WScript.Shell;$sc=$s.CreateShortcut('%SHORTCUT%');$sc.TargetPath='%HTML_FILE%';$sc.WorkingDirectory='%~dp0dist';$sc.Description='SmartKharkov - Auto Repair Shop';$sc.Save()"

if errorlevel 1 (
    echo  [ERROR] Could not create shortcut!
    echo  Try running as Administrator.
) else (
    echo  [SUCCESS] Shortcut "SmartKharkov" created on Desktop!
    echo.
    echo  Now you can launch SmartKharkov from your Desktop.
)

echo.
pause
