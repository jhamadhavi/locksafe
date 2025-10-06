#!/bin/bash

echo "🔐 LockSafe Password Manager - Server Startup Script"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if pip is installed  
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Set environment variables if config file exists
if [ -f "config.env" ]; then
    echo "📋 Loading configuration..."
    export $(cat config.env | xargs)
fi

echo ""
echo "🚀 Starting LockSafe Password Manager Server..."
echo "Server will be available at: http://localhost:5000"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "1. Configure your email settings in config.env for OTP functionality"
echo "2. For development, OTPs will be printed to console"
echo "3. Use Ctrl+C to stop the server"
echo ""

# Start the server
python3 server.py
