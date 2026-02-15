#!/bin/bash

# Setup script for daily_organiser CLI tool
# This script installs dependencies, builds the project, and links it globally

set -e  # Exit on any error

echo "Setting up daily_organiser..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "Installing dependencies..."
npm install

echo ""
echo "Building TypeScript..."
npm run build

echo ""
echo "Linking globally..."
npm link

echo ""
echo "Setup complete!"
echo ""
echo "You can now run 'daily' from anywhere to start the CLI."
echo ""
echo "Your todos will sync via iCloud Drive across all your Macs."
echo ""
