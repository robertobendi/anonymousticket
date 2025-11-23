package ch.sbb.anonymous;

import android.app.Activity;
import android.content.Intent;
import android.nfc.NfcAdapter;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.nfc.tech.Ndef;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;

import com.getcapacitor.BridgeActivity;

import java.nio.charset.StandardCharsets;

/**
 * Main Activity - Handles NFC communication between two Android phones
 * 
 * ARCHITECTURE:
 * - SHARING PHONE (Wallet page): Uses HCE (Host Card Emulation) via WalletHceService
 *   - Phone acts as an NFC card that can be read
 *   - Data is set via WalletHceService.setWalletData()
 *   - When reader selects our AID (F0010203040506), HCE service responds with data
 * 
 * - RECEIVING PHONE (Verify page): Uses NFC Reader Mode
 *   - Actively polls for NFC cards/tags
 *   - Connects via ISO-DEP (for HCE phones) or NDEF (for tags)
 *   - Reads data and sends to JavaScript via CustomEvent
 * 
 * This is the SIMPLEST and MOST RELIABLE approach for phone-to-phone NFC.
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private NfcAdapter nfcAdapter;
    private WebView webView;
    
    // Sharing state
    private boolean isSharingMode = false;
    private String pendingShareData = null;
    
    // Scanning state
    private boolean isReaderModeActive = false;
    
    // Foreground dispatch for maximum priority
    private android.app.PendingIntent pendingIntent = null;
    private android.content.IntentFilter[] intentFilters = null;
    private String[][] techLists = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Get WebView reference
        webView = getBridge().getWebView();
        
        // Enable JavaScript console logging to logcat
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String message = consoleMessage.message();
                String sourceId = consoleMessage.sourceId();
                int lineNumber = consoleMessage.lineNumber();
                ConsoleMessage.MessageLevel level = consoleMessage.messageLevel();
                
                // Log to Android logcat with appropriate level
                String logTag = "JSConsole";
                String logMessage = String.format("[%s:%d] %s", sourceId, lineNumber, message);
                
                switch (level) {
                    case ERROR:
                        Log.e(logTag, logMessage);
                        break;
                    case WARNING:
                        Log.w(logTag, logMessage);
                        break;
                    case DEBUG:
                        Log.d(logTag, logMessage);
                        break;
                    default:
                        Log.i(logTag, logMessage);
                        break;
                }
                
                return true; // Message handled
            }
        });
        
        // Initialize NFC
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        if (nfcAdapter == null) {
            Log.e(TAG, "NFC not available on this device");
        } else {
            Log.d(TAG, "NFC adapter initialized");
        }
        
        // Expose JavaScript interface
        webView.addJavascriptInterface(new NfcInterface(), "NFC");
    }

    @Override
    public void onResume() {
        super.onResume();
        
        // Handle NFC intent if present
        Intent intent = getIntent();
        if (webView != null && intent != null) {
            String action = intent.getAction();
            
            // IMMEDIATE LOG
            runOnUiThread(() -> {
                webView.evaluateJavascript("console.log('🔔🔔🔔 onResume: " + (action != null ? action : "null") + " 🔔🔔🔔');", null);
            });
            
            if (action != null && (
                NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_TECH_DISCOVERED.equals(action))) {
                handleNfcTag(intent);
            }
        }
        
        // Re-enable foreground dispatch if scanning was active
        if (isReaderModeActive && nfcAdapter != null && nfcAdapter.isEnabled()) {
            enableForegroundDispatch();
        }
        
        // Re-verify HCE data if in sharing mode
        if (isSharingMode && pendingShareData != null) {
            if (!WalletHceService.hasWalletData()) {
                WalletHceService.setWalletData(pendingShareData);
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        
        // Don't stop reader mode - keep it active
        // Just disable foreground dispatch (it will be re-enabled on resume)
        disableForegroundDispatch();
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        if (webView != null && intent != null) {
            setIntent(intent);
            String action = intent.getAction();
            
            // IMMEDIATE LOG
            runOnUiThread(() -> {
                webView.evaluateJavascript("console.log('🔔🔔🔔 onNewIntent: " + (action != null ? action : "null") + " 🔔🔔🔔');", null);
            });
            
            if (action != null && (
                NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_TECH_DISCOVERED.equals(action))) {
                handleNfcTag(intent);
            }
        }
    }

    /**
     * Handle NFC tag discovered via intent - DIRECT JAVASCRIPT CALL
     */
    private void handleNfcTag(Intent intent) {
        if (webView == null) return;
        
        Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
        if (tag == null) {
            runOnUiThread(() -> {
                webView.evaluateJavascript("console.log('❌ TAG IS NULL');", null);
            });
            return;
        }
        
        String tagId = bytesToHex(tag.getId());
        
        // IMMEDIATE DIRECT CALL - NO EVENTS
        runOnUiThread(() -> {
            webView.evaluateJavascript("console.log('🔔🔔🔔 TAG DETECTED: " + tagId.substring(0, Math.min(16, tagId.length())) + " 🔔🔔🔔');", null);
        });
        
        // Try NDEF first
        String ndefData = readNdefTag(tag);
        if (ndefData != null && !ndefData.isEmpty()) {
            final String data = ndefData;
            runOnUiThread(() -> {
                String base64 = Base64.encodeToString(data.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                String js = "try { var d = atob('" + base64 + "'); console.log('✅✅✅ NDEF DATA: ' + d); if(window.NFC&&window.NFC.onDataReceived)window.NFC.onDataReceived('" + tagId + "', d); else { var e = new CustomEvent('nfctag', {detail:{id:'" + tagId + "', data:d}}); window.dispatchEvent(e); } } catch(e) { console.error('Error:', e); }";
                webView.evaluateJavascript(js, null);
            });
            return;
        }
        
        // Try ISO-DEP
        String isoDepData = readIsoDepTag(tag);
        if (isoDepData != null && !isoDepData.isEmpty()) {
            final String data = isoDepData;
            runOnUiThread(() -> {
                String base64 = Base64.encodeToString(data.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                String js = "try { var d = atob('" + base64 + "'); console.log('✅✅✅ ISO-DEP DATA: ' + d); if(window.NFC&&window.NFC.onDataReceived)window.NFC.onDataReceived('" + tagId + "', d); else { var e = new CustomEvent('nfctag', {detail:{id:'" + tagId + "', data:d}}); window.dispatchEvent(e); } } catch(e) { console.error('Error:', e); }";
                webView.evaluateJavascript(js, null);
            });
            return;
        }
        
        // No data
        runOnUiThread(() -> {
            webView.evaluateJavascript("console.log('⚠️ NO DATA FOUND');", null);
        });
    }
    
    /**
     * Read NDEF tag (standard NFC tags) - ULTRA SIMPLE
     */
    private String readNdefTag(Tag tag) {
        try {
            Ndef ndef = Ndef.get(tag);
            if (ndef == null) return null;
            
            ndef.connect();
            NdefMessage message = ndef.getNdefMessage();
            ndef.close();
            
            if (message == null) return null;
            
            // Extract ALL text from ALL records
            StringBuilder data = new StringBuilder();
            for (NdefRecord record : message.getRecords()) {
                byte[] payload = record.getPayload();
                if (payload.length > 0) {
                    try {
                        // Try to decode as UTF-8 string (skip first byte if it's language code)
                        int start = 0;
                        if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN && payload[0] < 0x80) {
                            start = Math.min(payload[0] + 1, payload.length);
                        }
                        if (start < payload.length) {
                            String text = new String(payload, start, payload.length - start, StandardCharsets.UTF_8);
                            if (data.length() > 0) data.append("\n");
                            data.append(text);
                        }
                    } catch (Exception e) {
                        // Try entire payload as string
                        try {
                            String raw = new String(payload, StandardCharsets.UTF_8);
                            if (data.length() > 0) data.append("\n");
                            data.append(raw);
                        } catch (Exception ignored) {}
                    }
                }
            }
            
            return data.length() > 0 ? data.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * Read ISO-DEP tag (HCE phones) - ULTRA SIMPLE
     */
    private String readIsoDepTag(Tag tag) {
        IsoDep isoDep = null;
        try {
            isoDep = IsoDep.get(tag);
            if (isoDep == null) return null;
            
            isoDep.connect();
            isoDep.setTimeout(5000);
            
            // SELECT command for our AID
            byte[] selectCmd = {
                (byte) 0x00, (byte) 0xA4, (byte) 0x04, (byte) 0x00, (byte) 0x07,
                (byte) 0xF0, (byte) 0x01, (byte) 0x02, (byte) 0x03, (byte) 0x04, (byte) 0x05, (byte) 0x06
            };
            
            byte[] selectResponse = isoDep.transceive(selectCmd);
            if (selectResponse.length < 2 || 
                selectResponse[selectResponse.length - 2] != (byte) 0x90 ||
                selectResponse[selectResponse.length - 1] != (byte) 0x00) {
                isoDep.close();
                return null;
            }
            
            // GET DATA command
            byte[] getDataCmd = {(byte) 0x00, (byte) 0xCA, (byte) 0x00, (byte) 0x00, (byte) 0x00};
            byte[] dataResponse = isoDep.transceive(getDataCmd);
            isoDep.close();
            
            if (dataResponse.length < 2 ||
                dataResponse[dataResponse.length - 2] != (byte) 0x90 ||
                dataResponse[dataResponse.length - 1] != (byte) 0x00) {
                return null;
            }
            
            // Extract data (remove status bytes)
            byte[] dataBytes = new byte[dataResponse.length - 2];
            System.arraycopy(dataResponse, 0, dataBytes, 0, dataBytes.length);
            return new String(dataBytes, StandardCharsets.UTF_8);
            
        } catch (Exception e) {
            try {
                if (isoDep != null) isoDep.close();
            } catch (Exception ignored) {}
            return null;
        }
    }

    /**
     * JavaScript Interface for NFC operations
     */
    public class NfcInterface {
        
        /**
         * Check if NFC is available and enabled
         */
        @JavascriptInterface
        public String isNfcEnabled() {
            try {
                boolean available = nfcAdapter != null;
                boolean enabled = available && nfcAdapter.isEnabled();
                
                return String.format("{\"available\":%s,\"enabled\":%s}", 
                    available, enabled);
            } catch (Exception e) {
                Log.e(TAG, "Error checking NFC status", e);
                return "{\"available\":false,\"enabled\":false}";
            }
        }

        /**
         * Start beacon mode (HCE) - Phone acts as an NFC card
         * Called from Wallet page when user clicks "Validate"
         */
        @JavascriptInterface
        public String startBeacon(String data) {
            try {
                if (data == null || data.isEmpty()) {
                    return "{\"success\":false,\"error\":\"Data is required\"}";
                }
                
                if (nfcAdapter == null) {
                    Log.e(TAG, "NFC adapter is null");
                    return "{\"success\":false,\"error\":\"NFC is not available on this device\"}";
                }
                
                if (!nfcAdapter.isEnabled()) {
                    Log.e(TAG, "NFC is disabled");
                    return "{\"success\":false,\"error\":\"NFC is disabled. Please enable NFC in settings.\"}";
                }
                
                Log.d(TAG, "═══════════════════════════════════════");
                Log.d(TAG, "🚀🚀🚀 STARTING HCE BEACON MODE 🚀🚀🚀");
                Log.d(TAG, "Data length: " + data.length() + " chars");
                Log.d(TAG, "Data preview: " + data.substring(0, Math.min(100, data.length())));
                
                // Set HCE data - this makes the phone act like a card
                WalletHceService.setWalletData(data);
                
                // Verify it was set
                if (!WalletHceService.hasWalletData()) {
                    Log.e(TAG, "❌❌❌ FAILED TO SET HCE DATA ❌❌❌");
                    sendEventToJavaScript("hce_failed", "HCE Failed", "Could not set wallet data");
                    return "{\"success\":false,\"error\":\"Failed to activate HCE service\"}";
                }
                
                // Store state
                pendingShareData = data;
                isSharingMode = true;
                
                Log.d(TAG, "✅✅✅ HCE BEACON MODE ACTIVE ✅✅✅");
                Log.d(TAG, "Phone is now emulating NFC card");
                Log.d(TAG, "AID: F0010203040506");
                Log.d(TAG, "Controller can scan this phone");
                Log.d(TAG, "Waiting for reader to connect...");
                Log.d(TAG, "═══════════════════════════════════════");
                
                sendEventToJavaScript("hce_activated", "HCE Active", "Phone ready to be scanned");
                
                return "{\"success\":true,\"message\":\"Beacon mode active. Controller can scan this phone.\"}";
            } catch (Exception e) {
                Log.e(TAG, "Error starting beacon", e);
                return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        /**
         * Stop beacon mode
         */
        @JavascriptInterface
        public String stopBeacon() {
            WalletHceService.clearWalletData();
            pendingShareData = null;
            isSharingMode = false;
            
            Log.d(TAG, "Beacon mode stopped");
            return "{\"success\":true}";
        }

        /**
         * Enable scanning - SIMPLE: Just enable Foreground Dispatch
         * Called from Verify page when user clicks "Start Scanning"
         */
        @JavascriptInterface
        public String enableScan() {
            try {
                if (nfcAdapter == null) {
                    Log.e(TAG, "NFC adapter is null");
                    return "{\"success\":false,\"error\":\"NFC is not available on this device\"}";
                }
                
                if (!nfcAdapter.isEnabled()) {
                    Log.e(TAG, "NFC is disabled");
                    return "{\"success\":false,\"error\":\"NFC is disabled. Please enable NFC in settings.\"}";
                }
                
                Log.d(TAG, "═══════════════════════════════════════");
                Log.d(TAG, "🔴🔴🔴 ENABLING NFC SCANNING 🔴🔴🔴");
                Log.d(TAG, "═══════════════════════════════════════");
                
                // SIMPLE: Just enable Foreground Dispatch - highest priority
                enableForegroundDispatch();
                
                // Mark as active
                isReaderModeActive = true;
                
                // Send event to JavaScript
                sendEventToJavaScript("scanning_enabled", "NFC Scanning Active", "Waiting for NFC tag...");
                
                return "{\"success\":true}";
            } catch (Exception e) {
                Log.e(TAG, "Error enabling scan", e);
                return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
            }
        }

            /**
             * Disable scanning
             */
            @JavascriptInterface
            public String disableScan() {
                disableForegroundDispatch();
                isReaderModeActive = false;
                return "{\"success\":true}";
            }
            
            /**
             * Direct callback for NFC data - called from Java when data is received
             * This is more reliable than CustomEvent in WebView
             */
            @JavascriptInterface
            public void onNfcDataReceived(String tagId, String data) {
                // This will be called from readTagViaIsoDep
                // We'll use evaluateJavascript to call a JavaScript function directly
            }
        }

    /**
     * Enable Foreground Dispatch - SIMPLE, DIRECT, MAXIMUM PRIORITY
     * This is the ONLY method we use - catches ALL NFC events
     */
    private void enableForegroundDispatch() {
        if (nfcAdapter == null) {
            Log.e(TAG, "Cannot enable - NFC adapter is null");
            return;
        }
        
        if (!nfcAdapter.isEnabled()) {
            Log.e(TAG, "Cannot enable - NFC is disabled");
            return;
        }
        
        try {
            // Create pending intent with proper flags for Android 12+
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
            } else {
                flags |= android.app.PendingIntent.FLAG_MUTABLE;
            }
            
            pendingIntent = android.app.PendingIntent.getActivity(
                this, 0, intent, flags
            );
            
            // SIMPLE: Catch ALL NFC events - no filtering
            intentFilters = new android.content.IntentFilter[]{
                new android.content.IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
            };
            
            // Support ALL technologies - ISO-DEP first for HCE
            techLists = new String[][]{
                new String[]{IsoDep.class.getName()}, // HCE phones
                new String[]{android.nfc.tech.Ndef.class.getName()},
                new String[]{android.nfc.tech.NfcA.class.getName()},
                new String[]{android.nfc.tech.NfcB.class.getName()},
                new String[]{android.nfc.tech.NfcF.class.getName()},
                new String[]{android.nfc.tech.NfcV.class.getName()}
            };
            
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, intentFilters, techLists);
            
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "✅✅✅ NFC SCANNING ACTIVE ✅✅✅");
            Log.d(TAG, "Foreground Dispatch: ENABLED");
            Log.d(TAG, "Priority: MAXIMUM");
            Log.d(TAG, "Waiting for NFC tag...");
            Log.d(TAG, "═══════════════════════════════════════");
            
            // Only send "scanning_active" once when enabling, not on every tag detection
            // This event is sent from enableScan() in JavaScript interface, not here
        } catch (SecurityException e) {
            Log.e(TAG, "❌ Security exception enabling foreground dispatch", e);
            sendEventToJavaScript("scanning_error", "Permission Error", "NFC permission denied");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to enable foreground dispatch", e);
            Log.e(TAG, "Exception type: " + e.getClass().getName());
            Log.e(TAG, "Exception message: " + e.getMessage());
            sendEventToJavaScript("scanning_error", "Scanning Failed", e.getMessage() != null ? e.getMessage() : "Unknown error");
        }
    }
    
    /**
     * Disable Foreground Dispatch
     */
    private void disableForegroundDispatch() {
        if (nfcAdapter == null || pendingIntent == null) {
            return;
        }
        
        try {
            nfcAdapter.disableForegroundDispatch(this);
            pendingIntent = null;
            intentFilters = null;
            techLists = null;
            Log.d(TAG, "Foreground Dispatch disabled");
        } catch (Exception e) {
            Log.e(TAG, "Error disabling foreground dispatch", e);
        }
    }

    /**
     * Read tag data via ISO-DEP (for HCE phones)
     * This is the PRIMARY method for phone-to-phone communication
     */
    private void readTagViaIsoDep(Tag tag) {
        if (tag == null) {
            Log.e(TAG, "Tag is null in readTagViaIsoDep");
            return;
        }
        
        IsoDep isoDep = null;
        try {
            isoDep = IsoDep.get(tag);
        } catch (Exception e) {
            Log.e(TAG, "Error getting ISO-DEP from tag", e);
            return;
        }
        
        if (isoDep == null) {
            Log.d(TAG, "Tag does not support ISO-DEP (not an HCE card)");
            return;
        }
        
        Log.d(TAG, "Tag supports ISO-DEP - attempting HCE read");
        sendEventToJavaScript("iso_dep_found", "ISO-DEP Supported", "HCE card detected, connecting...");
        
        try {
            // Connect with longer timeout for HCE
            isoDep.setTimeout(10000);
            sendEventToJavaScript("iso_dep_connecting", "Connecting", "Establishing ISO-DEP connection...");
            isoDep.connect();
            Log.d(TAG, "✓✓✓ ISO-DEP CONNECTED ✓✓✓");
            sendEventToJavaScript("iso_dep_connected", "Connected", "ISO-DEP connection established");
            
            // Step 1: Send SELECT command for our AID
            byte[] selectCmd = {
                (byte) 0x00, (byte) 0xA4, (byte) 0x04, (byte) 0x00, (byte) 0x07,
                (byte) 0xF0, (byte) 0x01, (byte) 0x02, (byte) 0x03, (byte) 0x04, (byte) 0x05, (byte) 0x06
            };
            
            Log.d(TAG, "Sending SELECT command for AID: F0010203040506");
            sendEventToJavaScript("select_sending", "Sending SELECT", "AID: F0010203040506");
            byte[] selectResponse = isoDep.transceive(selectCmd);
            Log.d(TAG, "SELECT response: " + bytesToHex(selectResponse));
            sendEventToJavaScript("select_response", "SELECT Response", 
                "Response: " + bytesToHex(selectResponse).substring(0, Math.min(20, bytesToHex(selectResponse).length())));
            
            // Check if SELECT was successful (ends with 0x9000)
            if (selectResponse.length < 2 || 
                selectResponse[selectResponse.length - 2] != (byte) 0x90 ||
                selectResponse[selectResponse.length - 1] != (byte) 0x00) {
                Log.d(TAG, "❌ SELECT FAILED - not our HCE service");
                Log.d(TAG, "Response was: " + bytesToHex(selectResponse));
                sendEventToJavaScript("select_failed", "SELECT Failed", "Not our HCE service");
                isoDep.close();
                return;
            }
            
            Log.d(TAG, "✓✓✓ SELECT SUCCESSFUL - HCE SERVICE FOUND! ✓✓✓");
            sendEventToJavaScript("select_success", "SELECT Success", "HCE service found!");
            
            // Step 2: Send GET DATA command
            byte[] getDataCmd = {(byte) 0x00, (byte) 0xCA, (byte) 0x00, (byte) 0x00, (byte) 0x00};
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "📤📤📤 SENDING GET DATA COMMAND 📤📤📤");
            Log.d(TAG, "Command: " + bytesToHex(getDataCmd));
            Log.d(TAG, "═══════════════════════════════════════");
            sendEventToJavaScript("getdata_sending", "Sending GET DATA", "Requesting data from HCE...");
            
            byte[] dataResponse = isoDep.transceive(getDataCmd);
            
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "📥📥📥 GET DATA RESPONSE RECEIVED 📥📥📥");
            Log.d(TAG, "Response length: " + dataResponse.length + " bytes");
            Log.d(TAG, "Response hex (full): " + bytesToHex(dataResponse));
            Log.d(TAG, "Response hex (first 200 chars): " + bytesToHex(dataResponse).substring(0, Math.min(200, bytesToHex(dataResponse).length())));
            if (dataResponse.length > 2) {
                // Try to decode as string for preview
                byte[] previewBytes = new byte[Math.min(dataResponse.length - 2, 200)];
                System.arraycopy(dataResponse, 0, previewBytes, 0, previewBytes.length);
                try {
                    String preview = new String(previewBytes, StandardCharsets.UTF_8);
                    Log.d(TAG, "Response preview (as string): " + preview);
                } catch (Exception e) {
                    Log.d(TAG, "Response preview (not valid UTF-8)");
                }
            }
            Log.d(TAG, "═══════════════════════════════════════");
            sendEventToJavaScript("getdata_response", "GET DATA Response", 
                "Data length: " + dataResponse.length + " bytes");
            
            // Check if response is valid (ends with 0x9000)
            if (dataResponse.length < 2) {
                Log.e(TAG, "❌ GET DATA response too short: " + dataResponse.length + " bytes");
                sendEventToJavaScript("data_invalid", "Invalid Response", "Response too short");
                isoDep.close();
                return;
            }
            
            // Check status bytes
            byte statusByte1 = dataResponse[dataResponse.length - 2];
            byte statusByte2 = dataResponse[dataResponse.length - 1];
            Log.d(TAG, "Status bytes: " + String.format("%02X %02X", statusByte1 & 0xFF, statusByte2 & 0xFF));
            
            if (statusByte1 != (byte) 0x90 || statusByte2 != (byte) 0x00) {
                Log.e(TAG, "❌ GET DATA failed - status: " + String.format("%02X %02X", statusByte1 & 0xFF, statusByte2 & 0xFF));
                sendEventToJavaScript("data_invalid", "GET DATA Failed", "Status: " + String.format("%02X %02X", statusByte1 & 0xFF, statusByte2 & 0xFF));
                isoDep.close();
                return;
            }
            
            // Remove status bytes (last 2 bytes should be 0x9000)
            byte[] dataBytes = new byte[dataResponse.length - 2];
            System.arraycopy(dataResponse, 0, dataBytes, 0, dataBytes.length);
            
            String data = new String(dataBytes, StandardCharsets.UTF_8);
            String tagId = bytesToHex(tag.getId());
            
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
            Log.d(TAG, "✓✓✓ DATA RECEIVED VIA HCE! ✓✓✓");
            Log.d(TAG, "Tag ID: " + tagId);
            Log.d(TAG, "Raw data bytes length: " + dataBytes.length);
            Log.d(TAG, "Data string length: " + data.length() + " chars");
            Log.d(TAG, "Data hex: " + bytesToHex(dataBytes).substring(0, Math.min(100, bytesToHex(dataBytes).length())));
            Log.d(TAG, "Data preview: " + data.substring(0, Math.min(200, data.length())));
            Log.d(TAG, "Full data: " + data);
            Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
            Log.d(TAG, "═══════════════════════════════════════");
            
            // DEBUG: Print "pippo" to console
            Log.d(TAG, "🔴🔴🔴 PIPPO - DATA RECEIVED: " + data + " 🔴🔴🔴");
            System.out.println("🔴🔴🔴 PIPPO - DATA RECEIVED: " + data + " 🔴🔴🔴");
            
            // DETAILED LOGGING FOR RECEIVER
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "📥📥📥 RECEIVER NFC CONTENT 📥📥📥");
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "Tag ID: " + tagId);
            Log.d(TAG, "Data Length: " + data.length() + " characters");
            Log.d(TAG, "Data Bytes Length: " + dataBytes.length + " bytes");
            Log.d(TAG, "Data Hex: " + bytesToHex(dataBytes));
            Log.d(TAG, "Data String: " + data);
            Log.d(TAG, "Data Preview (first 200 chars): " + data.substring(0, Math.min(200, data.length())));
            Log.d(TAG, "═══════════════════════════════════════");
            
            sendEventToJavaScript("data_received", "Data Received!", 
                "Length: " + data.length() + " chars");
            
            // Send to JavaScript with "pippo" debug
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "🚀🚀🚀 CALLING sendNfcDataToJavaScript 🚀🚀🚀");
            Log.d(TAG, "Tag ID: " + tagId);
            Log.d(TAG, "Data: " + data);
            Log.d(TAG, "═══════════════════════════════════════");
            sendNfcDataToJavaScript(tagId, data);
            
            // Also send debug event with full content preview
            sendEventToJavaScript("pippo_debug", "PIPPO DEBUG", "Received data: " + data.substring(0, Math.min(100, data.length())));
            
            isoDep.close();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error reading tag via ISO-DEP", e);
            Log.e(TAG, "Error message: " + (e.getMessage() != null ? e.getMessage() : "null"));
            Log.e(TAG, "Error type: " + e.getClass().getName());
            sendEventToJavaScript("read_error", "Read Error", e.getMessage() != null ? e.getMessage() : "Unknown error");
            try {
                if (isoDep != null) {
                    isoDep.close();
                }
            } catch (Exception closeError) {
                Log.w(TAG, "Error closing ISO-DEP", closeError);
            }
        }
    }

    /**
     * Send event to JavaScript for debugging/feedback
     */
    private void sendEventToJavaScript(String eventType, String message, String details) {
        try {
            if (webView == null) {
                Log.w(TAG, "WebView is null, cannot send event: " + eventType);
                return;
            }
            
            String safeMessage = (message != null ? message : "").replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"").replace("\n", "\\n");
            String safeDetails = (details != null ? details : "").replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"").replace("\n", "\\n");
            String safeEventType = (eventType != null ? eventType : "").replace("'", "\\'");
            
            String js = String.format(
                "try { " +
                "  var event = new CustomEvent('nfcstep', { " +
                "    detail: { " +
                "      step: '%s', " +
                "      message: '%s', " +
                "      details: '%s', " +
                "      timestamp: new Date().toISOString() " +
                "    } " +
                "  }); " +
                "  window.dispatchEvent(event); " +
                "  console.log('📡 NFC Step: %s - %s', '%s'); " +
                "} catch(e) { console.error('Error dispatching event:', e); }",
                safeEventType, safeMessage, safeDetails, safeEventType, safeMessage, safeDetails
            );
            
            runOnUiThread(() -> {
                try {
                    if (webView != null) {
                        webView.evaluateJavascript(js, null);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error evaluating JavaScript", e);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error sending event to JavaScript", e);
        }
    }

    /**
     * Send NFC data to JavaScript - ULTRA SIMPLE
     */
    private void sendNfcDataToJavaScript(String tagId, String data) {
        if (webView == null || data == null) return;
        
        try {
            // Use base64 to avoid escape issues
            String base64Data = Base64.encodeToString(data.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            String safeTagId = (tagId != null ? tagId : "").replace("'", "\\'");
            
            String js = String.format(
                "try { " +
                "  console.log('🔴🔴🔴 DATA RECEIVED 🔴🔴🔴'); " +
                "  var base64Data = '%s'; " +
                "  var tagId = '%s'; " +
                "  var tagData = atob(base64Data); " +
                "  console.log('Data length:', tagData.length); " +
                "  console.log('Data:', tagData); " +
                "  if (window.NFC && window.NFC.onDataReceived) { " +
                "    window.NFC.onDataReceived(tagId, tagData); " +
                "    console.log('✅ CALLBACK CALLED'); " +
                "  } else { " +
                "    var event = new CustomEvent('nfctag', { " +
                "      detail: { id: tagId, data: tagData } " +
                "    }); " +
                "    window.dispatchEvent(event); " +
                "    console.log('✅ EVENT DISPATCHED'); " +
                "  } " +
                "} catch(e) { console.error('Error:', e); }",
                base64Data, safeTagId.replace("'", "\\'")
            );
            
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.evaluateJavascript(js, null);
                }
            });
        } catch (Exception e) {
            // Ignore
        }
    }

    /**
     * Convert byte array to hex string
     */
    private String bytesToHex(byte[] bytes) {
        if (bytes == null) return "";
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02X", b));
        }
        return result.toString();
    }
}











