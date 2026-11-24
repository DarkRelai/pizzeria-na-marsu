@echo off
title Pizzeria on Mars
cd /d "%~dp0"

rem Vestaveny Windows server - nevyzaduje Python ani jinou instalaci.
start "Pizzeria on Mars - server" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\local-server.ps1"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8123/"
exit /b
