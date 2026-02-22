@echo off
cd /d "%~dp0"

:: Найпростіший запуск - відкрити dist\index.html
if exist "dist\index.html" (
    start "" "%~dp0dist\index.html"
    exit /b 0
)

:: Якщо немає - показати підказку
echo.
echo  SmartKharkov - файл dist\index.html не знайдений!
echo.
echo  Для першого запуску виконайте:
echo  SmartKharkov_Build.bat
echo.
pause
