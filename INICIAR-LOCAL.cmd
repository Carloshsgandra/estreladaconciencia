@echo off
cd /d "%~dp0"
if not defined ADMIN_EMAILS set /p "ADMIN_EMAILS=Informe o e-mail da conta administrativa local: "
call npm start
pause
