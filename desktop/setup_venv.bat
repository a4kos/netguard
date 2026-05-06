@echo off
title Net Guard — Environment Setup
cd /d "%~dp0"
setlocal EnableDelayedExpansion

echo.
echo ============================================================
echo   Net Guard — Virtual Environment Setup
echo   Installs all dependencies including scipy (sklearn needs it)
echo ============================================================
echo.

echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [FAIL] Python not found in PATH.
    echo        1. Download Python 3.11 from https://python.org/downloads
    echo        2. During install, check "Add Python to PATH"
    echo        3. Restart this command prompt and try again.
    echo.
    pause & exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo [OK] Python %PY_VER% found.
echo.

echo [2/5] Removing any existing .venv...
if exist ".venv" (
    rmdir /s /q ".venv" 2>nul
    if exist ".venv" (
        echo [FAIL] Could not delete old .venv — close any programs using it, then retry.
        pause & exit /b 1
    )
    echo [OK] Old .venv removed.
) else (
    echo [OK] No existing .venv found.
)
echo.

echo [3/5] Creating fresh virtual environment...
python -m venv .venv
if errorlevel 1 (
    echo [FAIL] Could not create venv. Make sure Python 3.11+ is installed correctly.
    pause & exit /b 1
)
echo [OK] Virtual environment created.
echo.

echo [4/5] Installing packages (this may take 2-3 minutes)...
echo       flask, flask-cors, scikit-learn, numpy, scipy, pystray, Pillow, pyinstaller
echo.

.venv\Scripts\python.exe -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo [WARN] pip upgrade failed, continuing with existing pip version...
)

.venv\Scripts\pip.exe install ^
    "flask>=3.0.0" ^
    "flask-cors>=4.0.0" ^
    "scikit-learn>=1.4.0" ^
    "numpy>=1.26.0" ^
    "scipy>=1.11.0" ^
    "pystray>=0.19.0" ^
    "Pillow>=10.0.0" ^
    "keyring>=24.0.0" ^
    "pyinstaller>=6.0.0"

if errorlevel 1 (
    echo.
    echo [FAIL] Package installation failed.
    echo        Check your internet connection and try again.
    echo        If behind a proxy, set: set HTTPS_PROXY=http://yourproxy:port
    pause & exit /b 1
)
echo.
echo [OK] Packages installed.
echo.

echo [5/5] Verifying all imports work (same test the .exe runs)...
echo.

.venv\Scripts\python.exe -c ^
"import sys; ^
print('  Testing flask...'); import flask; print('  [OK] flask', flask.__version__); ^
print('  Testing flask_cors...'); import flask_cors; print('  [OK] flask_cors'); ^
print('  Testing numpy...'); import numpy; print('  [OK] numpy', numpy.__version__); ^
print('  Testing scipy...'); import scipy; print('  [OK] scipy', scipy.__version__); ^
print('  Testing sklearn...'); import sklearn; print('  [OK] sklearn', sklearn.__version__); ^
print('  Testing sklearn IsolationForest...'); from sklearn.ensemble import IsolationForest; print('  [OK] IsolationForest'); ^
print('  Testing sklearn StandardScaler...'); from sklearn.preprocessing import StandardScaler; print('  [OK] StandardScaler'); ^
print('  Testing sklearn _param_validation (imports scipy internally)...'); import sklearn.utils._param_validation; print('  [OK] _param_validation'); ^
print('  Testing Pillow...'); from PIL import Image, ImageDraw; print('  [OK] Pillow'); ^
print('  Testing pystray...'); import pystray; print('  [OK] pystray'); ^
print('  Testing keyring...'); import keyring; print('  [OK] keyring'); ^
print('  Testing full model.py...'); import model; print('  [OK] model.py'); ^
print('  Testing groq_client.py...'); import groq_client; print('  [OK] groq_client.py'); ^
print('  Testing threat_intelligence.py...'); import threat_intelligence; print('  [OK] threat_intelligence.py'); ^
print(); print('ALL IMPORTS OK — safe to build.')"

if errorlevel 1 (
    echo.
    echo [FAIL] Import verification failed. See the error above.
    echo        The package that failed to import is missing from the venv.
    echo        Try running this script again. If it keeps failing, open an issue.
    pause & exit /b 1
)

echo.
echo ============================================================
echo   Setup complete. All imports verified.
echo.
echo   To run the app (no build needed):
echo     .venv\Scripts\python.exe app.py
echo     Then open: http://https://netguard-api.noit.eu
echo.
echo   To build NetGuard.exe:
echo     Double-click build.bat
echo ============================================================
echo.
pause
