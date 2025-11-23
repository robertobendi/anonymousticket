package ch.sbb.anonymous;

import android.app.Activity;
import android.content.Intent;
import android.nfc.NfcAdapter;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.nfc.tech.Ndef;
import android.nfc.tech.NfcA;
import android.nfc.tech.NfcB;
import android.nfc.tech.NfcF;
import android.nfc.tech.NfcV;
import android.os.Bundle;
import android.os.Parcelable;
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
    private String pendingWriteData = null;
    
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
            
            if (action != null && (
                NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_TECH_DISCOVERED.equals(action))) {
                handleNfcIntent(intent);
            }
        }
        
        // Re-enable foreground dispatch if scanning was active
        if (isReaderModeActive && nfcAdapter != null && nfcAdapter.isEnabled()) {
            enableNfcForegroundDispatch();
        }
        
        // Re-verify HCE data if in sharing mode
        if (isSharingMode && pendingWriteData != null) {
            if (!WalletHceService.hasWalletData()) {
                WalletHceService.setWalletData(pendingWriteData);
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
            
            if (action != null && (
                NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_TECH_DISCOVERED.equals(action))) {
                handleNfcIntent(intent);
            }
        }
    }

    /**
     * Handle NFC intent - Comprehensive multi-method approach
     * Tries NDEF messages, HCE, and direct reads in priority order
     */
    private void handleNfcIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (action == null) return;
        if (!action.equals(NfcAdapter.ACTION_NDEF_DISCOVERED) &&
            !action.equals(NfcAdapter.ACTION_TECH_DISCOVERED) &&
            !action.equals(NfcAdapter.ACTION_TAG_DISCOVERED)) {
            return;
        }
        Log.d(TAG, "NFC tag detected: " + action);
        try {
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag == null) {
                Log.e(TAG, "Tag is null");
                return;
            }
            String tagId = bytesToHex(tag.getId());
            String tagData = "";
            
            // Try to read NDEF data - look for our custom MIME type first
            Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
            if (rawMessages != null) {
                Log.d(TAG, "═══════════════════════════════════════");
                Log.d(TAG, "NFC INTENT RECEIVED - Reading NDEF data");
                Log.d(TAG, "Found " + rawMessages.length + " NDEF message(s)");
                Log.d(TAG, "Intent action: " + action);
                String walletMimeType = "application/vnd.ch.sbb.anonymous.wallet";
                
                for (Parcelable rawMessage : rawMessages) {
                    NdefMessage message = (NdefMessage) rawMessage;
                    Log.d(TAG, "Processing NDEF message with " + message.getRecords().length + " record(s)");
                    
                    for (NdefRecord record : message.getRecords()) {
                        byte[] payload = record.getPayload();
                        Log.d(TAG, "Record TNF: " + record.getTnf() + ", payload length: " + payload.length);
                        
                        if (payload.length > 0) {
                            // PRIORITY 1: Check for our custom MIME type (ticket data)
                            if (record.getTnf() == NdefRecord.TNF_MIME_MEDIA) {
                                byte[] typeBytes = record.getType();
                                String recordType = new String(typeBytes, StandardCharsets.UTF_8);
                                Log.d(TAG, "MIME type: " + recordType);
                                
                                if (walletMimeType.equals(recordType)) {
                                    // This is our ticket data!
                                    tagData = new String(payload, StandardCharsets.UTF_8);
                                    Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                    Log.d(TAG, "✓✓✓ FOUND TICKET DATA VIA CUSTOM MIME TYPE! ✓✓✓");
                                    Log.d(TAG, "Data length: " + tagData.length() + " chars");
                                    Log.d(TAG, "Data preview: " + tagData.substring(0, Math.min(200, tagData.length())));
                                    Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                    break;
                                } else {
                                    Log.d(TAG, "⚠️ Ignoring non-ticket MIME type: " + recordType);
                                }
                            }
                            
                            // PRIORITY 2: Check for ticket JSON in text records (TNF_WELL_KNOWN with RTD_TEXT)
                            if (tagData.isEmpty() && record.getTnf() == NdefRecord.TNF_WELL_KNOWN) {
                                try {
                                    byte[] typeBytes = record.getType();
                                    String recordType = new String(typeBytes, StandardCharsets.UTF_8);
                                    
                                    // Check if it's a text record
                                    if (java.util.Arrays.equals(typeBytes, NdefRecord.RTD_TEXT)) {
                                        String tempData = new String(payload, StandardCharsets.UTF_8);
                                        // Remove language code (first byte)
                                        if (tempData.length() > 0 && tempData.charAt(0) < 0x20) {
                                            tempData = tempData.substring(1);
                                        }
                                        
                                        Log.d(TAG, "Text record preview: " + tempData.substring(0, Math.min(200, tempData.length())));
                                        
                                        // Only accept if it's ticket JSON
                                        if (tempData.trim().startsWith("{") && (tempData.contains("\"ticket\"") || tempData.contains("\"ticketId\"") || tempData.contains("\"id\""))) {
                                            tagData = tempData;
                                            Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                            Log.d(TAG, "✓✓✓ FOUND TICKET DATA IN TEXT RECORD! ✓✓✓");
                                            Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                            break;
                                        } else {
                                            Log.d(TAG, "⚠️ Text record does not contain ticket data, ignoring");
                                        }
                                    }
                                } catch (Exception e) {
                                    Log.w(TAG, "Error parsing text record: " + e.getMessage());
                                }
                            }
                            
                            // PRIORITY 3: Try raw payload if it looks like ticket JSON (last resort)
                            if (tagData.isEmpty()) {
                                try {
                                    String rawData = new String(payload, StandardCharsets.UTF_8);
                                    Log.d(TAG, "Checking raw payload: " + rawData.substring(0, Math.min(200, rawData.length())));
                                    
                                    if (rawData.trim().startsWith("{") && (rawData.contains("\"ticket\"") || rawData.contains("\"ticketId\"") || rawData.contains("\"id\""))) {
                                        tagData = rawData;
                                        Log.d(TAG, "✓✓✓ FOUND TICKET DATA IN RAW PAYLOAD! ✓✓✓");
                                        break;
                                    } else {
                                        Log.d(TAG, "⚠️ Raw payload does not contain ticket data, ignoring");
                                    }
                                } catch (Exception e) {
                                    Log.w(TAG, "Error checking raw payload: " + e.getMessage());
                                }
                            }
                        } else {
                            Log.d(TAG, "⚠️ Record has empty payload, skipping");
                        }
                    }
                    if (!tagData.isEmpty() && (tagData.contains("\"ticket\"") || tagData.contains("\"ticketId\"") || tagData.contains("\"id\""))) {
                        Log.d(TAG, "Ticket data found, stopping search");
                        break; // Stop if we found ticket data
                    }
                }
                Log.d(TAG, "═══════════════════════════════════════");
            } else {
                Log.d(TAG, "═══════════════════════════════════════");
                Log.d(TAG, "No NDEF messages in intent - trying HCE and direct read");
                Log.d(TAG, "Intent action: " + action);
                Log.d(TAG, "Tag ID: " + tagId);
                Log.d(TAG, "Tag technologies: " + java.util.Arrays.toString(tag.getTechList()));
                
                // PRIORITY 1: Try HCE (ISO-DEP) first - this is how phones share via HCE
                try {
                    IsoDep isoDep = IsoDep.get(tag);
                    if (isoDep != null) {
                        Log.d(TAG, "✓ Tag supports ISO-DEP (HCE card detected)");
                        isoDep.setTimeout(5000); // 5 second timeout
                        isoDep.connect();
                        try {
                            // Send SELECT command for our AID
                            byte[] selectCmd = {
                                (byte) 0x00, (byte) 0xA4, (byte) 0x04, (byte) 0x00, (byte) 0x07,
                                (byte) 0xF0, (byte) 0x01, (byte) 0x02, (byte) 0x03, (byte) 0x04, (byte) 0x05, (byte) 0x06
                            };
                            Log.d(TAG, "Sending SELECT command for AID: F0010203040506");
                            byte[] selectResponse = isoDep.transceive(selectCmd);
                            String selectResponseHex = bytesToHex(selectResponse);
                            Log.d(TAG, "SELECT response: " + selectResponseHex);
                            
                            // Check if SELECT was successful (0x9000 = success)
                            if (selectResponse.length >= 2 &&
                                selectResponse[selectResponse.length - 2] == (byte) 0x90 &&
                                selectResponse[selectResponse.length - 1] == (byte) 0x00) {
                                Log.d(TAG, "✓ SELECT successful - HCE service found!");
                                
                                // Send GET DATA command to retrieve ticket data
                                byte[] getDataCmd = {(byte) 0x00, (byte) 0xCA, (byte) 0x00, (byte) 0x00, (byte) 0x00};
                                Log.d(TAG, "Sending GET DATA command");
                                byte[] dataResponse = isoDep.transceive(getDataCmd);
                                Log.d(TAG, "GET DATA response length: " + dataResponse.length);
                                
                                // Extract ticket data (remove status bytes at end: 0x9000)
                                if (dataResponse.length > 2) {
                                    byte[] dataBytes = java.util.Arrays.copyOf(dataResponse, dataResponse.length - 2);
                                    String hceData = new String(dataBytes, StandardCharsets.UTF_8);
                                    Log.d(TAG, "HCE data preview: " + hceData.substring(0, Math.min(200, hceData.length())));
                                    
                                    if (hceData.trim().startsWith("{") && (hceData.contains("\"ticket\"") || hceData.contains("\"ticketId\"") || hceData.contains("\"id\""))) {
                                        tagData = hceData;
                                        Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                        Log.d(TAG, "✓✓✓ FOUND TICKET DATA VIA HCE! ✓✓✓");
                                        Log.d(TAG, "Data length: " + hceData.length() + " chars");
                                        Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                    } else {
                                        Log.w(TAG, "HCE data does not contain ticket JSON");
                                    }
                                } else {
                                    Log.w(TAG, "GET DATA response too short");
                                }
                            } else {
                                Log.d(TAG, "SELECT failed or not our HCE service (response: " + selectResponseHex + ")");
                            }
                        } catch (Exception e) {
                            Log.w(TAG, "HCE communication error: " + e.getMessage());
                        } finally {
                            try {
                                isoDep.close();
                            } catch (Exception e) {
                                Log.w(TAG, "Error closing ISO-DEP: " + e.getMessage());
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.d(TAG, "ISO-DEP not available or error: " + e.getMessage());
                }
                
                // PRIORITY 2: Try NDEF direct read (for regular P2P)
                if (tagData.isEmpty()) {
                    try {
                        Ndef ndef = Ndef.get(tag);
                        if (ndef != null) {
                            Log.d(TAG, "Tag/phone supports NDEF, connecting to read...");
                            ndef.connect();
                            try {
                                NdefMessage ndefMessage = ndef.getNdefMessage();
                                if (ndefMessage != null) {
                                    Log.d(TAG, "✓ Read NDEF message directly, " + ndefMessage.getRecords().length + " record(s)");
                                    for (NdefRecord record : ndefMessage.getRecords()) {
                                        byte[] payload = record.getPayload();
                                        if (payload.length > 0) {
                                            // Check MIME type first
                                            if (record.getTnf() == NdefRecord.TNF_MIME_MEDIA) {
                                                byte[] typeBytes = record.getType();
                                                String recordType = new String(typeBytes, StandardCharsets.UTF_8);
                                                if (recordType.equals("application/vnd.ch.sbb.anonymous.wallet")) {
                                                    tagData = new String(payload, StandardCharsets.UTF_8);
                                                    Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                    Log.d(TAG, "✓✓✓ FOUND TICKET DATA VIA DIRECT READ (MIME TYPE)! ✓✓✓");
                                                    Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                    break;
                                                }
                                            }
                                            
                                            // Fallback: check if it's ticket JSON
                                            String tempData = new String(payload, StandardCharsets.UTF_8);
                                            Log.d(TAG, "Direct read preview: " + tempData.substring(0, Math.min(200, tempData.length())));
                                            if (tempData.trim().startsWith("{") && (tempData.contains("\"ticket\"") || tempData.contains("\"ticketId\"") || tempData.contains("\"id\""))) {
                                                tagData = tempData;
                                                Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                Log.d(TAG, "✓✓✓ FOUND TICKET DATA BY READING DIRECTLY! ✓✓✓");
                                                Log.d(TAG, "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    Log.d(TAG, "Tag/phone has no NDEF message");
                                }
                            } finally {
                                ndef.close();
                            }
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "NDEF read error: " + e.getMessage());
                    }
                }
                
                Log.d(TAG, "═══════════════════════════════════════");
            }
            
            // If no NDEF ticket data found, log it but don't use tag ID as data
            if (tagData.isEmpty()) {
                Log.w(TAG, "═══════════════════════════════════════");
                Log.w(TAG, "⚠️ NO TICKET DATA FOUND IN NFC INTENT");
                Log.w(TAG, "This might be:");
                Log.w(TAG, "  - Android system data (contacts, files, etc.)");
                Log.w(TAG, "  - Another app's NFC data");
                Log.w(TAG, "  - Empty or non-ticket NFC tag");
                Log.w(TAG, "Tag ID: " + tagId);
                Log.w(TAG, "Intent action: " + action);
                Log.w(TAG, "═══════════════════════════════════════");
                // Don't send tag ID as data - it's not ticket data
                // Only send if we actually found ticket data
                return;
            }
            
            Log.d(TAG, "Tag ID: " + tagId);
            Log.d(TAG, "Tag Data: " + tagData);
            
            // If we're in sharing mode, we're the sender
            // For P2P: We can't write to phones, but Android should handle the exchange
            // The receiving phone will read our data via NDEF_DISCOVERED intent
            if (isSharingMode && pendingWriteData != null) {
                Log.d(TAG, "═══════════════════════════════════════");
                Log.d(TAG, "SHARE MODE: Device detected!");
                Log.d(TAG, "Tag ID: " + tagId);
                Log.d(TAG, "Tag technologies: " + java.util.Arrays.toString(tag.getTechList()));
                
                // Check if this is a physical NFC tag (writable) or a phone (not writable)
                String[] techList = tag.getTechList();
                boolean isPhysicalTag = false;
                for (String tech : techList) {
                    if (tech.contains("Ndef") || tech.contains("NdefFormatable")) {
                        isPhysicalTag = true;
                        break;
                    }
                }
                
                if (isPhysicalTag) {
                    // It's a physical tag - try to write
                    try {
                        Log.d(TAG, "Physical NFC tag detected - writing ticket data...");
                        writeToTag(tag, pendingWriteData);
                        Log.d(TAG, "✓✓✓ Ticket data written to tag! ✓✓✓");
                        sendNfcWriteResult(true, "Ticket written to tag! Controller can scan it.");
                        return; // Don't read after writing
                    } catch (Exception e) {
                        Log.e(TAG, "Error writing to tag: " + e.getMessage());
                        sendNfcWriteResult(false, "Write failed: " + e.getMessage());
                        return;
                    }
                } else {
                    // It's a phone (controller scanning us)
                    // For P2P: Android should automatically exchange data
                    // The controller will receive our ticket data via NDEF_DISCOVERED
                    Log.d(TAG, "Phone detected (controller scanning us)");
                    Log.d(TAG, "For P2P: Android should exchange data automatically");
                    Log.d(TAG, "Controller will receive ticket data via NDEF_DISCOVERED intent");
                    Log.d(TAG, "Keep share mode active - ready for next scan");
                    // Don't return - continue to check if we received ticket data (bidirectional)
                }
            }
            
            // CRITICAL: Only process ticket data - ignore everything else
            // Check if data contains ticket identifiers (same pattern as wallet but for tickets)
            boolean isTicketData = !tagData.isEmpty() && 
                (tagData.contains("\"ticket\"") || tagData.contains("\"ticketId\"") || tagData.contains("\"id\""));
            
            if (!isTicketData) {
                Log.w(TAG, "═══════════════════════════════════════");
                Log.w(TAG, "⚠️ IGNORING NON-TICKET DATA");
                Log.w(TAG, "This is likely Android system data (contacts, files, etc.)");
                Log.w(TAG, "Tag ID: " + tagId);
                Log.w(TAG, "Data preview: " + (tagData.length() > 0 ? tagData.substring(0, Math.min(100, tagData.length())) : "empty"));
                Log.w(TAG, "═══════════════════════════════════════");
                return; // Don't process non-ticket data
            }
            
            // We have ticket data - process it
            Log.d(TAG, "✓✓✓ TICKET DATA CONFIRMED - Processing...");
            
            // If we're in sharing mode and received ticket data, it's bidirectional P2P
            if (isSharingMode && pendingWriteData != null) {
                Log.d(TAG, "Share mode: Received ticket data (bidirectional P2P)");
            }
            
            // Send ticket data to JavaScript
            sendNfcDataToJavaScript(tagId, tagData);
        } catch (Exception e) {
            Log.e(TAG, "Error handling NFC: " + e.getMessage(), e);
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
            if (data == null || data.isEmpty()) {
                return "{\"success\":false,\"error\":\"Data is required\"}";
            }
            
            if (nfcAdapter == null || !nfcAdapter.isEnabled()) {
                return "{\"success\":false,\"error\":\"NFC is not available or disabled\"}";
            }
            
            // Use Host Card Emulation (HCE) - most reliable method
            // This makes the phone act like an NFC card that can be read
            WalletHceService.setWalletData(data);
            
            // Also keep old method as fallback
            pendingWriteData = data;
            isSharingMode = true;
            
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "SHARE MODE ENABLED (HCE + P2P)");
            Log.d(TAG, "Data length: " + data.length() + " bytes");
            Log.d(TAG, "Phone is now emulating NFC card via HCE");
            Log.d(TAG, "Controller can scan this phone like a normal NFC tag");
            Log.d(TAG, "═══════════════════════════════════════");
            
            // Enable foreground dispatch as fallback
            enableNfcForegroundDispatch();
            
            return "{\"success\":true,\"message\":\"Share mode active! Controller can scan this phone like an NFC tag. Hold phones back-to-back.\"}";
        }

        /**
         * Stop beacon mode
         */
        @JavascriptInterface
        public String stopBeacon() {
            WalletHceService.clearWalletData();
            pendingWriteData = null;
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
                enableNfcForegroundDispatch();
                
                // Mark as active
                isReaderModeActive = true;
                
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
    }

    /**
     * Enable NFC Foreground Dispatch
     */
    private void enableNfcForegroundDispatch() {
        if (nfcAdapter == null || !nfcAdapter.isEnabled()) {
            return;
        }
        try {
            // Create PendingIntent for NFC intents
            Intent intent = new Intent(this, getClass());
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                this, 0, intent, android.app.PendingIntent.FLAG_MUTABLE
            );
            // Create intent filters for all NFC actions
            android.content.IntentFilter[] filters = new android.content.IntentFilter[]{
                new android.content.IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED)
            };
            // Support all NFC technologies - ISO-DEP first for HCE
            String[][] techLists = new String[][]{
                new String[]{IsoDep.class.getName()}, // For HCE - HIGHEST PRIORITY
                new String[]{Ndef.class.getName()},
                new String[]{NfcA.class.getName()},
                new String[]{NfcB.class.getName()},
                new String[]{NfcF.class.getName()},
                new String[]{NfcV.class.getName()}
            };
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, filters, techLists);
            Log.d(TAG, "✓ NFC foreground dispatch enabled");
        } catch (Exception e) {
            Log.e(TAG, "Error enabling foreground dispatch", e);
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
     * Send NFC data to JavaScript
     */
    private void sendNfcDataToJavaScript(String tagId, String tagData) {
        if (webView == null) {
            Log.e(TAG, "WebView is null");
            return;
        }
        // Escape data for JavaScript
        String escapedData = tagData.replace("\\", "\\\\")
                                    .replace("'", "\\'")
                                    .replace("\n", "\\n")
                                    .replace("\r", "\\r");
        String escapedId = tagId.replace("\\", "\\\\").replace("'", "\\'");
        // Send event to JavaScript
        String js = String.format(
            "if (window.dispatchEvent) { " +
            "  window.dispatchEvent(new CustomEvent('nfctag', { " +
            "    detail: { id: '%s', data: '%s' } " +
            "  })); " +
            "}",
            escapedId, escapedData
        );
        runOnUiThread(() -> {
            webView.evaluateJavascript(js, null);
            Log.d(TAG, "✓ NFC data sent to JavaScript");
        });
    }
    
    /**
     * Write data to NFC tag
     */
    private void writeToTag(Tag tag, String data) throws Exception {
        Ndef ndef = Ndef.get(tag);
        if (ndef == null) {
            // Try to format the tag
            android.nfc.tech.NdefFormatable formatable = android.nfc.tech.NdefFormatable.get(tag);
            if (formatable == null) {
                throw new Exception("Tag is not NDEF compatible");
            }
            formatable.connect();
            try {
                NdefRecord record = NdefRecord.createMime("application/vnd.ch.sbb.anonymous.wallet", data.getBytes(StandardCharsets.UTF_8));
                formatable.format(new NdefMessage(record));
            } finally {
                formatable.close();
            }
            return;
        }
        
        ndef.connect();
        try {
            // Create NDEF message with custom MIME type
            NdefRecord record = NdefRecord.createMime("application/vnd.ch.sbb.anonymous.wallet", data.getBytes(StandardCharsets.UTF_8));
            NdefMessage message = new NdefMessage(record);
            ndef.writeNdefMessage(message);
        } finally {
            ndef.close();
        }
    }
    
    /**
     * Send NFC write result to JavaScript
     */
    private void sendNfcWriteResult(boolean success, String message) {
        if (webView == null) return;
        
        String js = String.format(
            "if (window.dispatchEvent) { " +
            "  window.dispatchEvent(new CustomEvent('nfcwrite', { " +
            "    detail: { success: %s, message: '%s' } " +
            "  })); " +
            "}",
            success, message.replace("'", "\\'")
        );
        runOnUiThread(() -> {
            webView.evaluateJavascript(js, null);
        });
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
