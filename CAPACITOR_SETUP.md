# Capacitor Setup for Android APK with NFC

This guide explains how to build this React app as an Android APK with NFC capabilities.

## Prerequisites

- Node.js installed
- Java JDK 11 or higher installed
- Android SDK installed (or Android Studio)
- Set `ANDROID_HOME` environment variable

### Installing Prerequisites

**Java JDK:**
```bash
# macOS (using Homebrew)
brew install openjdk@11

# Or download from: https://adoptium.net/
```

**Android SDK:**
- Option 1: Install Android Studio (includes SDK)
- Option 2: Install command-line tools only from https://developer.android.com/studio#command-tools

Set environment variables:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# or
export ANDROID_HOME=$HOME/Android/Sdk  # Linux

export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

## Quick Setup (macOS)

First, install Java and Android SDK:

```bash
npm run setup:android
```

Or manually:
```bash
./setup-android.sh
```

This will:
- Install Java JDK 17 via Homebrew
- Check for Android SDK
- Provide instructions for environment variables

## Quick Build (Automated Script)

```bash
npm run build:android
```

Or:
```bash
./build-apk.sh
```

This script will:
1. Build web assets
2. Sync with Capacitor
3. Build the APK using Capacitor CLI or Gradle
4. Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Manual Build Steps

### Step 1: Build Web App

```bash
npm run build
```

### Step 2: Sync with Capacitor

```bash
npx cap sync android
```

### Step 3: Build APK (Command Line)

```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 4: Install on Device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Alternative: Build in Android Studio

```bash
npx cap open android
```

Then in Android Studio:
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. APK will be in `android/app/build/outputs/apk/`

## NFC Configuration

The app uses Web NFC API which works in Chrome on Android. For native NFC support, you can add the NFC plugin:

```bash
npm install @capacitor-community/nfc-manager
```

Then add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

## NFC Features

- Read NFC tags containing ticket data
- Verify ticket validity
- Display ticket information
- Works with Web NFC API (Chrome on Android) - no additional setup needed

