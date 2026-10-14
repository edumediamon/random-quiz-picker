@echo off
chcp 65001 > nul
echo ===================================================
echo [랜덤 문제 추출기] 로컬 서버를 시작합니다...
echo - 접속 주소: http://localhost:3000
echo - (Google Drive 연동 시 http://localhost:3000 으로 접속 권장)
echo - 서버를 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
echo ===================================================
cd /d "%~dp0"
node server.js
pause
