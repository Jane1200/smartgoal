@echo off
echo ========================================
echo  SmartGoal KNN ML Service - Windows
echo ========================================
echo.

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Set port for ML service
set PORT=5002

REM Start the service
echo Starting KNN ML Service...
echo Service will run on: http://localhost:5002
echo.
python app.py

pause