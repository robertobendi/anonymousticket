#!/bin/bash

# Setup script for Android build environment
# This script helps install Java and Android SDK on macOS

set -e

echo "🔧 Setting up Android build environment..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed."
    echo "   Install from: https://brew.sh/"
    exit 1
fi

# Install Java JDK
echo ""
echo "☕ Installing Java JDK 17..."
if brew list openjdk@17 &>/dev/null; then
    echo "✓ Java JDK 17 already installed"
else
    brew install openjdk@17
    echo ""
    echo "⚠️  Add Java to your PATH by adding this to ~/.zshrc or ~/.bash_profile:"
    echo "   export PATH=\"/opt/homebrew/opt/openjdk@17/bin:\$PATH\""
    echo "   export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
fi

# Check for Android SDK
echo ""
echo "📱 Checking Android SDK..."

if [ -z "$ANDROID_HOME" ]; then
    # Try common locations
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        echo "✓ Found Android SDK at: $ANDROID_HOME"
    elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        echo "✓ Found Android SDK at: $ANDROID_HOME"
    else
        echo "⚠️  Android SDK not found."
        echo ""
        echo "   Option 1: Install Android Studio (includes SDK):"
        echo "   https://developer.android.com/studio"
        echo ""
        echo "   Option 2: Install command-line tools only:"
        echo "   https://developer.android.com/studio#command-tools"
        echo ""
        echo "   After installation, set ANDROID_HOME:"
        echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk"
        echo "   export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
        exit 1
    fi
else
    echo "✓ Android SDK found at: $ANDROID_HOME"
fi

# Set up environment variables
echo ""
echo "📝 Add these to your ~/.zshrc or ~/.bash_profile:"
echo ""
echo "export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
echo "export PATH=\$PATH:\$ANDROID_HOME/tools"
echo ""

echo "✅ Setup complete! Reload your shell or run:"
echo "   source ~/.zshrc  # or source ~/.bash_profile"

