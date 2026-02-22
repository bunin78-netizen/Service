@echo off
chcp 65001 > nul 2>&1
cd /d "%~dp0"

:: Перевірка Node.js
where node > nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ПОМИЛКА] Node.js не знайдено!
    echo.
    echo  Завантажте з: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo  SmartKharkov - Пересборка та перезапуск...
echo.

:: Видалення старої збірки
if exist "dist\" (
    echo  Видалення старої збірки...
    rmdir /s /q "dist"
)

:: Встановлення залежностей (якщо потрібно)
if not exist "node_modules\" (
    echo  Встановлення залежностей...
    call npm install
    if errorlevel 1 (
        echo  [ПОМИЛКА] npm install завершився з помилкою!
        pause
        exit /b 1
    )
)

:: Збірка
echo  Збірка проєкту (30-90 секунд)...
call npm run build
if errorlevel 1 (
    echo  [ПОМИЛКА] Збірка завершилась з помилкою!
    pause
    exit /b 1
)

if not exist "dist\index.html" (
    echo  [ПОМИЛКА] dist\index.html не створено після збірки!
    pause
    exit /b 1
)

echo.
echo  [OK] Збірка успішна! Відкриваємо SmartKharkov...
echo.
start "" "%~dp0dist\index.html"
