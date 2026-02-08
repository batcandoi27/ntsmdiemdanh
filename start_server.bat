@echo off
cd /d "c:\AI APP\app-diemdanh"
echo [1/2] Dang cai dat/cap nhat thu vien (firebase, recharts, xlsx)...
echo Vui long cho, buoc nay co the mat 1-2 phut...
call npm install firebase recharts xlsx
echo.
echo [2/2] Dang khoi dong server Port 8888...
echo Khi thay "Ready in ... ms", hay mo trinh duyet.
call npm run dev -- -p 8888
pause
