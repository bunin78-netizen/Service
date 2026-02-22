@echo off
cd /d "%~dp0"
if exist "dist\index.html" (
    start "" "%~dp0dist\index.html"
    exit /b 0
)
echo SmartKharkov: dist\index.html not found!
echo Run SmartKharkov_Build.bat first!
echo.
pause
