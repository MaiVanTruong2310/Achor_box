@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"

echo Khoi dong AnchorBox: Backend (8080), Web Admin (5173), Web Shop (5174)...

start "AnchorBox - Backend :8080" /D "%ROOT%web\backend" powershell -NoExit -ExecutionPolicy Bypass -File "%ROOT%web\backend\run-local.ps1"

start "AnchorBox - Web Admin :5173" /D "%ROOT%web\web-admin" cmd /k "if not exist node_modules call npm install && npm run dev -- --port 5173"

start "AnchorBox - Web Shop :5174" /D "%ROOT%web\web-shop" cmd /k "if not exist node_modules call npm install && npm run dev -- --port 5174"

echo.
echo Da mo 3 cua so. Dong tung cua so de dung server tuong ung.
echo   Backend  : http://localhost:8080
echo   Web Admin: http://localhost:5173
echo   Web Shop : http://localhost:5174
endlocal
