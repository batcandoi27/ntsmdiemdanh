@echo off
echo Dang mo Chrome voi quyen truy cap port 6666...
echo Vui long dong tat ca cua so Chrome truoc khi chay file nay de co hieu luc tot nhat.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --explicitly-allowed-ports=6666 "http://localhost:6666"
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --explicitly-allowed-ports=6666 "http://localhost:6666"
echo Da gui lenh mo Chrome. Kiem tra trinh duyet nhe!
pause
