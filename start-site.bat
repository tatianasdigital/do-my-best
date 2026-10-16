@echo off
rem DO MY BEST — double-click to start the local preview (no browser cache) and open the site.
cd /d "%~dp0"
start "" "http://localhost:8000/new/"
where python >nul 2>nul && (python serve.py 8000) || (py serve.py 8000)
pause
