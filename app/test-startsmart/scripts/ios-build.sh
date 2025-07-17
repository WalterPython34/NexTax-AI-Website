#!/bin/bash

# StartSmart iOS Build Script for Xcode Cloud
# This script prepares and builds the iOS app using Capacitor

echo "🚀 Starting StartSmart iOS Build Process..."

# Step 1: Install dependencies
echo "📦 Installing Node.js dependencies..."
npm ci

# Step 2: Build the web application
echo "🔨 Building web application..."
npm run build

# Step 3: Initialize Capacitor iOS if not exists
if [ ! -d "ios" ]; then
    echo "📱 Setting up Capacitor iOS..."
    npx cap add ios
fi

# Step 4: Sync web assets to iOS
echo "🔄 Syncing web assets to iOS..."
npx cap sync ios

# Step 5: Update iOS configuration
echo "⚙️ Updating iOS configuration..."

# Update bundle identifier in project files
find ios -name "*.pbxproj" -exec sed -i '' 's/com.nextax.startsmartgpt/ai.nextax.startsmart/g' {} \;

# Step 6: Validate iOS setup
echo "✅ Validating iOS setup..."
if [ -d "ios/App" ]; then
    echo "✅ iOS project structure ready"
else
    echo "❌ iOS project structure missing"
    exit 1
fi

echo "🎉 iOS build preparation complete!"
echo "📝 Next steps:"
echo "   1. Open project in Xcode Cloud"
echo "   2. Configure signing and provisioning profiles"
echo "   3. Run automated build and deploy to TestFlight"