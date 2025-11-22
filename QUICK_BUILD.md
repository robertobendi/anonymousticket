# Quick Build Guide

## Install Java JDK

```bash
brew install openjdk@17
```

Add to your `~/.zshrc` or `~/.bash_profile`:
```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Then reload:
```bash
source ~/.zshrc
```

## Install Android SDK

**Option 1: Install Android Studio** (easiest)
- Download from: https://developer.android.com/studio
- Android SDK will be installed automatically

**Option 2: Command-line tools only**
- Download from: https://developer.android.com/studio#command-tools
- Extract and set ANDROID_HOME

After installation, add to your `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

## Build APK

Once Java and Android SDK are set up:

```bash
npm run build:android
```

Or:
```bash
./build-apk.sh
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

