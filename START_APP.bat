@echo off
cd /d "%~dp0"
cls
echo ===============================================
echo     KHOI DONG APP DIEM DANH (PORT 8888)
echo ===============================================
echo.
echo Dang kiem tra va cai dat thu vien thieu (neu co)...
call npm install
echo.
echo Dang khoi dong Server...
echo 1. Vui long cho khoang 30-60 giay.
echo 2. Khi thay dong chu "Ready in ... ms", server da san sang.
echo 3. Dung tat cua so nay!
echo.
echo Truoc tien, he thong se thu tat cac server cu dang bi treo...
taskkill /F /IM node.exe >nul 2>&1
echo.
echo BAT DAU CHAY...
echo Truy cap: http://localhost:8888
echo ===============================================
call npm run dev -- -p 8888
pause
