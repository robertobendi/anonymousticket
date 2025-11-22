#!/bin/bash

# Build APK script for SBB Anonymous Tickets
# Requires: Java JDK, Android SDK, and Gradle

set -e

echo "🚀 Building SBB Anonymous Tickets APK..."

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java JDK 11 or higher."
    echo "   Download from: https://adoptium.net/"
    exit 1
fi

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME is not set."
    echo "   Set it to your Android SDK location:"
    echo "   export ANDROID_HOME=/path/to/android/sdk"
    exit 1
fi

# Set JAVA_HOME if not set
if [ -z "$JAVA_HOME" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        JAVA_HOME=$(/usr/libexec/java_home 2>/dev/null || echo "")
    fi
    if [ -z "$JAVA_HOME" ]; then
        echo "⚠️  JAVA_HOME is not set. Please set it to your Java installation."
        exit 1
    fi
fi

echo "✓ Java found: $JAVA_HOME"
echo "✓ Android SDK: $ANDROID_HOME"

# Build web assets
echo ""
echo "📦 Building web assets..."
npm run build

# Sync with Capacitor
echo ""
echo "🔄 Syncing with Capacitor..."
npx cap sync android

# Build APK using Capacitor CLI (preferred) or Gradle
echo ""
echo "🔨 Building Android APK..."

# Try Capacitor build command first (requires signing for release, so use debug)
if npx cap build android --androidreleasetype APK 2>/dev/null; then
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    echo "✓ Built using Capacitor CLI"
else
    echo "⚠️  Capacitor build failed, trying Gradle directly..."
    cd android
    
    # Use Gradle wrapper if available
    if [ -f "./gradlew" ]; then
        chmod +x ./gradlew
        ./gradlew assembleDebug
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    else
        echo "❌ Gradle wrapper not found. Please run: npx cap sync android"
        exit 1
    fi
    
    cd ..
fi

if [ -f "android/$APK_PATH" ]; then
    echo ""
    echo "✅ APK built successfully!"
    echo "📱 Location: android/$APK_PATH"
    echo ""
    echo "To install on device:"
    echo "  adb install android/$APK_PATH"
else
    echo ""
    echo "❌ APK build failed. Check the error messages above."
    exit 1
fi

