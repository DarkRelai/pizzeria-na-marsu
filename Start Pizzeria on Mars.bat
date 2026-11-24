@echo off
title Pizzeria on Mars
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 goto noserver

rem Start a small local web server in a minimized window, then open the game.
start "Pizzeria on Mars - server (close to stop)" /min python -m http.server 8123 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "http://localhost:8123"
exit /b

:noserver
rem No Python: open the game file directly in the default browser.
start "" "%~dp0index.html"
