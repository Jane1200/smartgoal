#!/bin/bash

echo "========================================"
echo " SmartGoal KNN ML Service - Mac/Linux"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo ""

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt
echo ""

# Start the service
echo "Starting KNN ML Service..."
echo "Service will run on: http://localhost:5001"
echo ""
python app.py



