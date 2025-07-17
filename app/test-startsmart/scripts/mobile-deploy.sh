#!/bin/bash

# StartSmart Mobile App Deployment Script
# This script prepares the app for iOS and Android deployment

echo "🚀 Starting StartSmart Mobile App Deployment"

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed"
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        echo "❌ npx is required but not installed"
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
}

# Build the web application
build_web_app() {
    echo "🔨 Building web application..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Web build failed"
        exit 1
    fi
    
    echo "✅ Web application built successfully"
}

# Initialize Capacitor if not already done
init_capacitor() {
    echo "⚡ Initializing Capacitor..."
    
    if [ ! -d "ios" ] && [ ! -d "android" ]; then
        npx cap init
    fi
    
    echo "✅ Capacitor initialized"
}

# Add platforms
add_platforms() {
    echo "📱 Adding mobile platforms..."
    
    # Add iOS platform
    if [ ! -d "ios" ]; then
        npx cap add ios
        echo "✅ iOS platform added"
    else
        echo "ℹ️ iOS platform already exists"
    fi
    
    # Add Android platform
    if [ ! -d "android" ]; then
        npx cap add android
        echo "✅ Android platform added"
    else
        echo "ℹ️ Android platform already exists"
    fi
}

# Sync web assets with mobile platforms
sync_platforms() {
    echo "🔄 Syncing web assets with mobile platforms..."
    npx cap sync
    
    if [ $? -ne 0 ]; then
        echo "❌ Platform sync failed"
        exit 1
    fi
    
    echo "✅ Platforms synced successfully"
}

# Copy platform-specific assets
copy_assets() {
    echo "🎨 Copying platform-specific assets..."
    
    # Create directories if they don't exist
    mkdir -p ios/App/App/Assets.xcassets/AppIcon.appiconset/
    mkdir -p android/app/src/main/res/mipmap-hdpi/
    mkdir -p android/app/src/main/res/mipmap-mdpi/
    mkdir -p android/app/src/main/res/mipmap-xhdpi/
    mkdir -p android/app/src/main/res/mipmap-xxhdpi/
    mkdir -p android/app/src/main/res/mipmap-xxxhdpi/
    
    echo "✅ Asset directories created"
}

# Generate privacy policy and terms
generate_legal_files() {
    echo "📄 Generating legal compliance files..."
    
    cat > "privacy-policy.md" << EOF
# StartSmart Privacy Policy

## Information We Collect
- User account information (email, profile data)
- Business profile information you provide
- AI chat conversations for service improvement
- Usage analytics and app performance data

## How We Use Information
- Provide AI-powered business guidance
- Generate personalized documents and recommendations
- Improve our services and user experience
- Ensure platform security and compliance

## Data Sharing
- We do not sell personal information to third parties
- We may share data with service providers (OpenAI for AI features)
- We comply with legal requests when required

## Data Security
- All data is encrypted in transit and at rest
- We implement industry-standard security measures
- Regular security audits and updates

## Your Rights
- Access, update, or delete your personal information
- Opt-out of non-essential communications
- Export your data in machine-readable format

## Contact
For privacy concerns, contact: privacy@nextax.ai

Last updated: $(date)
EOF
    
    echo "✅ Privacy policy generated"
}

# Create app store metadata
create_app_store_metadata() {
    echo "🏪 Creating app store metadata..."
    
    mkdir -p metadata/ios
    mkdir -p metadata/android
    
    # iOS metadata
    cat > "metadata/ios/description.txt" << EOF
StartSmart GPT by NexTax.AI - Your AI-powered business launch companion.

🚀 LAUNCH YOUR BUSINESS WITH CONFIDENCE
Get expert AI guidance for every step of starting your business, from entity formation to tax compliance.

✨ KEY FEATURES
• AI Business Assistant with unlimited conversations
• Step-by-step business formation guidance
• Legal document generation and templates
• State-specific compliance tracking
• Market research and business planning tools
• Tax setup and compliance automation

🎯 PERFECT FOR
• First-time entrepreneurs
• Small business owners
• Freelancers going legitimate
• Anyone starting a side business

📱 POWERFUL TOOLS
• Interactive business roadmap
• AI-generated legal documents
• Compliance deadline tracking
• Knowledge hub with expert resources
• Document center with templates

Download StartSmart GPT and turn your business idea into reality with AI-powered guidance from NexTax.AI.
EOF
    
    # Android metadata
    cat > "metadata/android/description.txt" << EOF
Transform your business idea into reality with StartSmart GPT - the AI-powered business launch platform by NexTax.AI.

Whether you're starting your first business or expanding into new ventures, StartSmart GPT provides expert AI guidance for entity formation, legal compliance, tax setup, and strategic planning.

🚀 FEATURES:
• AI Business Assistant
• Legal Document Generation
• State-Specific Compliance Tracking
• Business Planning Tools
• Tax Setup Automation
• Expert Knowledge Hub

Start your entrepreneurial journey with confidence. Download StartSmart GPT today!
EOF
    
    echo "✅ App store metadata created"
}

# Main deployment function
main() {
    echo "🎯 StartSmart Mobile Deployment Starting..."
    echo "========================================"
    
    check_dependencies
    build_web_app
    init_capacitor
    add_platforms
    sync_platforms
    copy_assets
    generate_legal_files
    create_app_store_metadata
    
    echo ""
    echo "🎉 Mobile app deployment preparation complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open iOS project: npx cap open ios"
    echo "2. Open Android project: npx cap open android"
    echo "3. Configure app signing in Xcode/Android Studio"
    echo "4. Add app icons and splash screens"
    echo "5. Test on physical devices"
    echo "6. Submit to App Store/Google Play"
    echo ""
    echo "📖 For detailed instructions, see: test-mobile.md"
}

# Run the deployment
main