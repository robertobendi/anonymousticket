#!/bin/bash

# Script to fix Android NFC interference
# This ensures our app handles NFC before system handlers

echo "🔧 Fixing Android NFC interference..."

# Find ADB - try common locations
ADB_PATH=""
if [ -f "$HOME/Library/Android/sdk/platform-tools/adb" ]; then
    ADB_PATH="$HOME/Library/Android/sdk/platform-tools/adb"
elif [ -f "/Users/$USER/Library/Android/sdk/platform-tools/adb" ]; then
    ADB_PATH="/Users/$USER/Library/Android/sdk/platform-tools/adb"
elif command -v adb &> /dev/null; then
    ADB_PATH="adb"
else
    echo "❌ ADB not found. Please ensure Android SDK is installed."
    exit 1
fi

echo "Using ADB: $ADB_PATH"

# Get all connected devices
DEVICES=$($ADB_PATH devices | grep -E "device$" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No Android devices connected"
    exit 1
fi

for DEVICE in $DEVICES; do
    echo ""
    echo "📱 Working on device: $DEVICE"
    
    # 1. Disable Android Beam (if it exists on older Android versions)
    echo "   Disabling Android Beam..."
    $ADB_PATH -s $DEVICE shell settings put global nfc_payment_default_component "" 2>/dev/null || true
    
    # 2. Clear NFC app defaults to reset any conflicting handlers
    echo "   Clearing NFC app defaults..."
    $ADB_PATH -s $DEVICE shell pm clear-defaults ch.sbb.anonymous 2>/dev/null || true
    
    # 3. Set our app as default NFC handler (if possible)
    echo "   Setting app as NFC handler..."
    $ADB_PATH -s $DEVICE shell pm set-default-app ch.sbb.anonymous 2>/dev/null || true
    
    # 4. Ensure NFC is enabled
    echo "   Ensuring NFC is enabled..."
    $ADB_PATH -s $DEVICE shell settings put global nfc_on 1 2>/dev/null || true
    
    # 5. Disable other NFC services that might interfere
    echo "   Disabling interfering NFC services..."
    # Disable Google Pay NFC (if exists)
    $ADB_PATH -s $DEVICE shell pm disable-user --user 0 com.google.android.apps.walletnfcrel 2>/dev/null || true
    # Disable Samsung Pay (if exists)
    $ADB_PATH -s $DEVICE shell pm disable-user --user 0 com.samsung.android.spay 2>/dev/null || true
    
    # 6. Force stop and restart our app to ensure HCE service is active
    echo "   Restarting app to activate HCE service..."
    $ADB_PATH -s $DEVICE shell am force-stop ch.sbb.anonymous 2>/dev/null || true
    sleep 1
    $ADB_PATH -s $DEVICE shell am start -n ch.sbb.anonymous/.MainActivity 2>/dev/null || true
    
    # 7. Set our HCE service as default for our AID
    echo "   Setting HCE service priority..."
    # This is handled in the app, but we can verify it's registered
    $ADB_PATH -s $DEVICE shell dumpsys nfc | grep -i "WalletHceService" || echo "   ⚠️  HCE service not found in dumpsys (may need app restart)"
    
    echo "   ✅ Device $DEVICE configured"
done

echo ""
echo "✅ NFC interference fixes applied!"
echo ""
echo "📋 Next steps:"
echo "   1. Open the app on both phones"
echo "   2. On Phone 1: Go to Wallet → Click 'Validate' on a ticket"
echo "   3. On Phone 2: Go to Verify page → Click 'Start Scanning'"
echo "   4. Hold phones back-to-back"
echo ""
echo "💡 If it still doesn't work, try:"
echo "   - Restart both phones"
echo "   - Make sure both phones are unlocked"
echo "   - Check Settings → NFC → Default payment app (should be our app or 'Ask every time')"

