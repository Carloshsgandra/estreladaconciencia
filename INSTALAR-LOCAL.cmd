@echo off
cd /d "%~dp0"
call npm run setup
if errorlevel 1 echo Falha na instalacao. Confira Node.js 22 e sua conexao.
pause
