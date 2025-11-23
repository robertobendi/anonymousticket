package ch.sbb.anonymous;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.nfc.NfcAdapter;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.nfc.tech.NfcA;
import android.nfc.tech.NfcB;
import android.nfc.tech.NfcF;
import android.nfc.tech.NfcV;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class MainActivity extends BridgeActivity {
    private static final int NFC_PERMISSION_REQUEST_CODE = 1001;
    private NfcAdapter nfcAdapter;
    private WebView webView;
    private String pendingWriteData = null; // Data to share via Android Beam/P2P
    private boolean isSharingMode = false; // True when sharing wallet

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Get NFC adapter
        nfcAdapter = NfcAdapter.getDefaultAdapter(getApplicationContext());

        // Get WebView reference
        if (this.bridge != null && this.bridge.getWebView() != null) {
            webView = this.bridge.getWebView();
            
            // Expose simple NFC interface
            webView.addJavascriptInterface(new NfcInterface(), "NFC");
            android.util.Log.d("MainActivity", "✓ NFC interface exposed to JavaScript");
        }

        // Request NFC permission
        requestNFCPermission();
    }

    @Override
    public void onResume() {
        super.onResume();
        
        // Enable NFC foreground dispatch when app is in foreground
        enableNfcForegroundDispatch();
        
        // Check for NFC intent from app launch
        handleNfcIntent(getIntent());
        
        // If in share mode, log status
        if (isSharingMode && pendingWriteData != null) {
            android.util.Log.d("MainActivity", "Resumed: Share mode still active");
            android.util.Log.d("MainActivity", "Data ready: " + pendingWriteData.length() + " bytes");
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Don't disable foreground dispatch completely - keep it active for beacon mode
        // Only disable if not in beacon mode
        if (!isSharingMode) {
            disableNfcForegroundDispatch();
        } else {
            android.util.Log.d("MainActivity", "Paused but keeping beacon mode active");
        }
        
        // Don't cancel sharing mode when app is paused - keep beacon active
        // This allows continuous sharing even when app goes to background briefly
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNfcIntent(intent);
    }

    // Simple JavaScript interface - just enable/disable scanning
    public class NfcInterface {
        @JavascriptInterface
        public String enableScan() {
            enableNfcForegroundDispatch();
            return "{\"success\":true}";
        }

        @JavascriptInterface
        public String disableScan() {
            disableNfcForegroundDispatch();
            return "{\"success\":true}";
        }

        @JavascriptInterface
        public String isNfcEnabled() {
            try {
                JSONObject result = new JSONObject();
                if (nfcAdapter == null) {
                    result.put("available", false);
                    result.put("enabled", false);
                } else {
                    result.put("available", true);
                    result.put("enabled", nfcAdapter.isEnabled());
                }
                return result.toString();
            } catch (JSONException e) {
                return "{\"available\":false,\"enabled\":false}";
            }
        }

        @JavascriptInterface
        public String startWrite(String data) {
            if (data == null || data.isEmpty()) {
                return "{\"success\":false,\"error\":\"Data is required\"}";
            }
            
            if (nfcAdapter == null || !nfcAdapter.isEnabled()) {
                return "{\"success\":false,\"error\":\"NFC is not available or disabled\"}";
            }
            
            // Store data to share
            pendingWriteData = data;
            isSharingMode = true;
            android.util.Log.d("MainActivity", "═══════════════════════════════════════");
            android.util.Log.d("MainActivity", "NFC SHARING MODE ENABLED");
            android.util.Log.d("MainActivity", "Data length: " + data.length() + " bytes");
            android.util.Log.d("MainActivity", "Mode: Write to NFC tag or device");
            android.util.Log.d("MainActivity", "═══════════════════════════════════════");
            
            // Enable foreground dispatch to catch NFC intents
            enableNfcForegroundDispatch();
            
            return "{\"success\":true,\"message\":\"Ready! Hold near an NFC tag OR another phone (on Verify page).\"}";
        }
        
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
            
            // Verify HCE data was set
            if (!WalletHceService.hasWalletData()) {
                android.util.Log.e("MainActivity", "⚠️ WARNING: HCE data not set properly!");
            } else {
                android.util.Log.d("MainActivity", "✓ HCE data verified - service is ready");
            }
            
            // Also keep old method as fallback
            pendingWriteData = data;
            isSharingMode = true;
            
            android.util.Log.d("MainActivity", "═══════════════════════════════════════");
            android.util.Log.d("MainActivity", "SHARE MODE ENABLED (HCE + P2P)");
            android.util.Log.d("MainActivity", "Data length: " + data.length() + " chars");
            android.util.Log.d("MainActivity", "HCE service: ACTIVE");
            android.util.Log.d("MainActivity", "Phone is now emulating NFC card via HCE");
            android.util.Log.d("MainActivity", "Controller can scan this phone like a normal NFC tag");
            android.util.Log.d("MainActivity", "HCE AID: F0010203040506");
            android.util.Log.d("MainActivity", "═══════════════════════════════════════");
            
            // Enable foreground dispatch as fallback
            enableNfcForegroundDispatch();
            
            return "{\"success\":true,\"message\":\"Share mode active! Controller can scan this phone like an NFC tag. Hold phones back-to-back.\"}";
        }

        @JavascriptInterface
        public String cancelWrite() {
            pendingWriteData = null;
            isSharingMode = false;
            WalletHceService.clearWalletData(); // Stop HCE
            android.util.Log.d("MainActivity", "Share mode stopped (HCE disabled)");
            return "{\"success\":true}";
        }
    }

    private void enableNfcForegroundDispatch() {
        if (nfcAdapter == null || !nfcAdapter.isEnabled()) {
            return;
        }

        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

            android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                this, 0, intent,
                android.app.PendingIntent.FLAG_MUTABLE
            );

            // PRIORITY 1: Listen for our custom wallet MIME type (highest priority)
            android.content.IntentFilter walletFilter = new android.content.IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED);
            try {
                walletFilter.addDataType("application/vnd.ch.sbb.anonymous.wallet");
                android.util.Log.d("MainActivity", "✓ Intent filter for wallet MIME type added");
            } catch (android.content.IntentFilter.MalformedMimeTypeException e) {
                android.util.Log.e("MainActivity", "Error adding wallet MIME type filter: " + e.getMessage());
            }
            
            // PRIORITY 2: Generic NDEF (for tags and fallback)
            // PRIORITY 3: TECH and TAG discovered (for non-NDEF tags)
            android.content.IntentFilter[] filters = new android.content.IntentFilter[]{
                walletFilter, // Highest priority - our wallet MIME type
                new android.content.IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED)
            };

            // Support all NFC technologies - ISO-DEP first for HCE
            String[][] techLists = new String[][]{
                new String[]{android.nfc.tech.IsoDep.class.getName()}, // For HCE - HIGHEST PRIORITY
                new String[]{Ndef.class.getName()},
                new String[]{NdefFormatable.class.getName()},
                new String[]{NfcA.class.getName()},
                new String[]{NfcB.class.getName()},
                new String[]{NfcF.class.getName()},
                new String[]{NfcV.class.getName()}
            };

            nfcAdapter.enableForegroundDispatch(this, pendingIntent, filters, techLists);
            android.util.Log.d("MainActivity", "✓ NFC foreground dispatch enabled");
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error enabling NFC: " + e.getMessage());
        }
    }

    private void disableNfcForegroundDispatch() {
        if (nfcAdapter != null) {
            try {
                nfcAdapter.disableForegroundDispatch(this);
                android.util.Log.d("MainActivity", "NFC foreground dispatch disabled");
            } catch (Exception e) {
                android.util.Log.e("MainActivity", "Error disabling NFC: " + e.getMessage());
            }
        }
    }

    private void handleNfcIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (action == null) return;

        if (!action.equals(NfcAdapter.ACTION_NDEF_DISCOVERED) &&
            !action.equals(NfcAdapter.ACTION_TECH_DISCOVERED) &&
            !action.equals(NfcAdapter.ACTION_TAG_DISCOVERED)) {
            return;
        }

        android.util.Log.d("MainActivity", "═══════════════════════════════════════");
        android.util.Log.d("MainActivity", "NFC INTENT RECEIVED");
        android.util.Log.d("MainActivity", "Action: " + action);
        android.util.Log.d("MainActivity", "═══════════════════════════════════════");

        try {
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag == null) {
                android.util.Log.e("MainActivity", "Tag is null");
                sendNfcStepEvent("error", "Tag is null", "No tag data in intent");
                return;
            }

            String tagId = bytesToHex(tag.getId());
            String[] techList = tag.getTechList();
            String tagData = "";

            // Emit step: Tag detected - FIRST STEP
            android.util.Log.d("MainActivity", "Tag ID: " + tagId);
            android.util.Log.d("MainActivity", "Tag technologies: " + java.util.Arrays.toString(techList));
            sendNfcStepEvent("tag_detected", "NFC tag detected", "Tag ID: " + tagId.substring(0, 16) + "... Technologies: " + java.util.Arrays.toString(techList));

            // Try to read NDEF data - look for our custom MIME type first
            Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
            if (rawMessages != null) {
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
                android.util.Log.d("MainActivity", "NFC INTENT RECEIVED - Reading NDEF data");
                android.util.Log.d("MainActivity", "Found " + rawMessages.length + " NDEF message(s)");
                android.util.Log.d("MainActivity", "Intent action: " + action);
                String walletMimeType = "application/vnd.ch.sbb.anonymous.wallet";
                
                for (Parcelable rawMessage : rawMessages) {
                    android.nfc.NdefMessage message = (android.nfc.NdefMessage) rawMessage;
                    android.util.Log.d("MainActivity", "Processing NDEF message with " + message.getRecords().length + " record(s)");
                    
                    for (android.nfc.NdefRecord record : message.getRecords()) {
                        byte[] payload = record.getPayload();
                        android.util.Log.d("MainActivity", "Record TNF: " + record.getTnf() + ", payload length: " + payload.length);
                        
                        if (payload.length > 0) {
                            // PRIORITY 1: Check for our custom MIME type (wallet data)
                            if (record.getTnf() == NdefRecord.TNF_MIME_MEDIA) {
                                byte[] typeBytes = record.getType();
                                String recordType = new String(typeBytes, StandardCharsets.UTF_8);
                                android.util.Log.d("MainActivity", "MIME type: " + recordType);
                                
                                if (walletMimeType.equals(recordType)) {
                                    // This is our wallet data!
                                    tagData = new String(payload, StandardCharsets.UTF_8);
                                    android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                    android.util.Log.d("MainActivity", "✓✓✓ FOUND WALLET DATA VIA CUSTOM MIME TYPE! ✓✓✓");
                                    android.util.Log.d("MainActivity", "Data length: " + tagData.length() + " chars");
                                    android.util.Log.d("MainActivity", "Data preview: " + tagData.substring(0, Math.min(200, tagData.length())));
                                    android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                    break;
                                } else {
                                    android.util.Log.d("MainActivity", "⚠️ Ignoring non-wallet MIME type: " + recordType);
                                }
                            }
                            
                            // PRIORITY 2: Check for wallet JSON in text records (TNF_WELL_KNOWN with RTD_TEXT)
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
                                        
                                        android.util.Log.d("MainActivity", "Text record preview: " + tempData.substring(0, Math.min(200, tempData.length())));
                                        
                                        // Only accept if it's wallet JSON
                                        if (tempData.trim().startsWith("{") && tempData.contains("\"wallet\"")) {
                                            tagData = tempData;
                                            android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                            android.util.Log.d("MainActivity", "✓✓✓ FOUND WALLET DATA IN TEXT RECORD! ✓✓✓");
                                            android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                            break;
                                        } else {
                                            android.util.Log.d("MainActivity", "⚠️ Text record does not contain wallet data, ignoring");
                                        }
                                    }
                                } catch (Exception e) {
                                    android.util.Log.w("MainActivity", "Error parsing text record: " + e.getMessage());
                                }
                            }
                            
                            // PRIORITY 3: Try raw payload if it looks like wallet JSON (last resort)
                            if (tagData.isEmpty()) {
                                try {
                                    String rawData = new String(payload, StandardCharsets.UTF_8);
                                    android.util.Log.d("MainActivity", "Checking raw payload: " + rawData.substring(0, Math.min(200, rawData.length())));
                                    
                                    if (rawData.trim().startsWith("{") && rawData.contains("\"wallet\"")) {
                                        tagData = rawData;
                                        android.util.Log.d("MainActivity", "✓✓✓ FOUND WALLET DATA IN RAW PAYLOAD! ✓✓✓");
                                        break;
                                    } else {
                                        android.util.Log.d("MainActivity", "⚠️ Raw payload does not contain wallet data, ignoring");
                                    }
                                } catch (Exception e) {
                                    android.util.Log.w("MainActivity", "Error checking raw payload: " + e.getMessage());
                                }
                            }
                        } else {
                            android.util.Log.d("MainActivity", "⚠️ Record has empty payload, skipping");
                        }
                    }
                    if (!tagData.isEmpty() && tagData.contains("\"wallet\"")) {
                        android.util.Log.d("MainActivity", "Wallet data found, stopping search");
                        break; // Stop if we found wallet data
                    }
                }
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
            } else {
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
                android.util.Log.d("MainActivity", "No NDEF messages in intent - trying HCE and direct read");
                android.util.Log.d("MainActivity", "Intent action: " + action);
                android.util.Log.d("MainActivity", "Tag ID: " + tagId);
                android.util.Log.d("MainActivity", "Tag technologies: " + java.util.Arrays.toString(tag.getTechList()));
                
                // PRIORITY 1: ALWAYS try HCE (ISO-DEP) first - this is how phones share via HCE
                // Even if tag doesn't explicitly list ISO-DEP, try it anyway (HCE phones might not list it)
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
                android.util.Log.d("MainActivity", "ATTEMPTING HCE READ (ISO-DEP)");
                android.util.Log.d("MainActivity", "This is the PRIMARY method for phone-to-phone sharing");
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
                
                // Emit step: Starting HCE read
                sendNfcStepEvent("hce_start", "Attempting HCE read (ISO-DEP)", "Checking if tag supports ISO-DEP...");
                
                try {
                    android.nfc.tech.IsoDep isoDep = android.nfc.tech.IsoDep.get(tag);
                    if (isoDep != null) {
                        android.util.Log.d("MainActivity", "✓ Tag supports ISO-DEP (HCE card detected)");
                        sendNfcStepEvent("hce_iso_dep_found", "ISO-DEP supported", "HCE card detected, connecting...");
                        
                        isoDep.setTimeout(10000); // 10 second timeout (longer for HCE)
                        try {
                            sendNfcStepEvent("hce_connecting", "Connecting to ISO-DEP", "Establishing connection...");
                            isoDep.connect();
                            android.util.Log.d("MainActivity", "✓ ISO-DEP connected successfully");
                            sendNfcStepEvent("hce_connected", "ISO-DEP connected", "Connection established successfully");
                        } catch (Exception connectError) {
                            android.util.Log.w("MainActivity", "⚠️ ISO-DEP connect failed: " + connectError.getMessage());
                            sendNfcStepEvent("hce_connect_failed", "Connection failed", connectError.getMessage());
                            throw connectError;
                        }
                        
                        try {
                            // Send SELECT command for our AID
                            byte[] selectCmd = {
                                (byte) 0x00, (byte) 0xA4, (byte) 0x04, (byte) 0x00, (byte) 0x07,
                                (byte) 0xF0, (byte) 0x01, (byte) 0x02, (byte) 0x03, (byte) 0x04, (byte) 0x05, (byte) 0x06
                            };
                            android.util.Log.d("MainActivity", "═══════════════════════════════════════");
                            android.util.Log.d("MainActivity", "Sending SELECT command for AID: F0010203040506");
                            sendNfcStepEvent("hce_select_sending", "Sending SELECT command", "AID: F0010203040506");
                            
                            byte[] selectResponse = isoDep.transceive(selectCmd);
                            String selectResponseHex = bytesToHex(selectResponse);
                            android.util.Log.d("MainActivity", "SELECT response: " + selectResponseHex);
                            android.util.Log.d("MainActivity", "Response length: " + selectResponse.length);
                            sendNfcStepEvent("hce_select_response", "SELECT response received", "Response: " + selectResponseHex);
                            
                            // Check if SELECT was successful (0x9000 = success)
                            if (selectResponse.length >= 2 && 
                                selectResponse[selectResponse.length - 2] == (byte) 0x90 &&
                                selectResponse[selectResponse.length - 1] == (byte) 0x00) {
                                android.util.Log.d("MainActivity", "✓✓✓ SELECT SUCCESSFUL - HCE SERVICE FOUND! ✓✓✓");
                                sendNfcStepEvent("hce_select_success", "SELECT successful", "HCE service found!");
                                
                                // Send GET DATA command to retrieve wallet data
                                byte[] getDataCmd = {(byte) 0x00, (byte) 0xCA, (byte) 0x00, (byte) 0x00, (byte) 0x00};
                                android.util.Log.d("MainActivity", "Sending GET DATA command");
                                sendNfcStepEvent("hce_getdata_sending", "Sending GET DATA command", "Requesting data from HCE service...");
                                
                                byte[] dataResponse = isoDep.transceive(getDataCmd);
                                android.util.Log.d("MainActivity", "GET DATA response length: " + dataResponse.length);
                                sendNfcStepEvent("hce_getdata_response", "GET DATA response received", "Data length: " + dataResponse.length + " bytes");
                                
                                // Extract wallet data (remove status bytes at end: 0x9000)
                                if (dataResponse.length > 2) {
                                    byte[] dataBytes = Arrays.copyOf(dataResponse, dataResponse.length - 2);
                                    String hceData = new String(dataBytes, StandardCharsets.UTF_8);
                                    android.util.Log.d("MainActivity", "HCE data preview: " + hceData.substring(0, Math.min(200, hceData.length())));
                                    
                                    // Check if it's wallet JSON or signature message (192 hex chars)
                                    String trimmedData = hceData.trim();
                                    boolean isWalletJson = trimmedData.startsWith("{") && trimmedData.contains("\"wallet\"");
                                    // Check for signature message: exactly 192 hex characters (no whitespace)
                                    boolean isSignatureMessage = trimmedData.length() == 192 && trimmedData.matches("^[0-9a-fA-F]{192}$");
                                    
                                    android.util.Log.d("MainActivity", "Data format check:");
                                    android.util.Log.d("MainActivity", "  Original length: " + hceData.length());
                                    android.util.Log.d("MainActivity", "  Trimmed length: " + trimmedData.length());
                                    android.util.Log.d("MainActivity", "  Is wallet JSON: " + isWalletJson);
                                    android.util.Log.d("MainActivity", "  Is signature message: " + isSignatureMessage);
                                    android.util.Log.d("MainActivity", "  First 50 chars: " + trimmedData.substring(0, Math.min(50, trimmedData.length())));
                                    
                                    if (isWalletJson || isSignatureMessage) {
                                        // Use trimmed data to avoid whitespace issues
                                        tagData = trimmedData;
                                        android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                        if (isSignatureMessage) {
                                            android.util.Log.d("MainActivity", "✓✓✓ FOUND SIGNATURE MESSAGE VIA HCE! ✓✓✓");
                                            sendNfcStepEvent("hce_data_parsed", "Signature message found", "192 hex characters detected");
                                        } else {
                                            android.util.Log.d("MainActivity", "✓✓✓ FOUND WALLET DATA VIA HCE! ✓✓✓");
                                            sendNfcStepEvent("hce_data_parsed", "Wallet data found", "JSON wallet data detected");
                                        }
                                        android.util.Log.d("MainActivity", "Data length: " + trimmedData.length() + " chars");
                                        android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                    } else {
                                        android.util.Log.w("MainActivity", "⚠️ HCE data format not recognized");
                                        android.util.Log.w("MainActivity", "Expected: wallet JSON or 192-char hex signature");
                                        android.util.Log.w("MainActivity", "Got length: " + trimmedData.length() + " chars");
                                        android.util.Log.w("MainActivity", "Got preview: " + trimmedData.substring(0, Math.min(50, trimmedData.length())));
                                        sendNfcStepEvent("hce_data_invalid", "Data format not recognized", "Expected wallet JSON or 192-char hex signature, got " + trimmedData.length() + " chars");
                                    }
                                } else {
                                    android.util.Log.w("MainActivity", "⚠️ GET DATA response too short: " + dataResponse.length);
                                }
                            } else {
                                android.util.Log.d("MainActivity", "SELECT failed or not our HCE service");
                                android.util.Log.d("MainActivity", "Response: " + selectResponseHex);
                                android.util.Log.d("MainActivity", "This might be a different HCE service or regular NFC tag");
                                sendNfcStepEvent("hce_select_failed", "SELECT failed", "Not our HCE service or different tag type");
                            }
                        } catch (Exception e) {
                            android.util.Log.w("MainActivity", "⚠️ HCE communication error: " + e.getMessage());
                            android.util.Log.w("MainActivity", "Stack trace: " + android.util.Log.getStackTraceString(e));
                            sendNfcStepEvent("hce_error", "HCE communication error", e.getMessage());
                        } finally {
                            try {
                                isoDep.close();
                                android.util.Log.d("MainActivity", "ISO-DEP connection closed");
                            } catch (Exception e) {
                                android.util.Log.w("MainActivity", "Error closing ISO-DEP: " + e.getMessage());
                            }
                        }
                    } else {
                        android.util.Log.d("MainActivity", "⚠️ Tag does NOT support ISO-DEP (not an HCE card)");
                        android.util.Log.d("MainActivity", "This is likely a physical NFC tag, not a phone in HCE mode");
                        sendNfcStepEvent("hce_not_supported", "ISO-DEP not supported", "This tag doesn't support HCE (likely a physical NFC tag)");
                    }
                } catch (Exception e) {
                    android.util.Log.d("MainActivity", "⚠️ ISO-DEP not available or error: " + e.getMessage());
                    android.util.Log.d("MainActivity", "This is normal for physical NFC tags");
                    sendNfcStepEvent("hce_error", "ISO-DEP error", e.getMessage());
                }
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
                
                // PRIORITY 2: Try NDEF direct read (for regular P2P)
                if (tagData.isEmpty()) {
                    try {
                        Ndef ndef = Ndef.get(tag);
                        if (ndef != null) {
                            android.util.Log.d("MainActivity", "Tag/phone supports NDEF, connecting to read...");
                            ndef.connect();
                            try {
                                android.nfc.NdefMessage ndefMessage = ndef.getNdefMessage();
                                if (ndefMessage != null) {
                                    android.util.Log.d("MainActivity", "✓ Read NDEF message directly, " + ndefMessage.getRecords().length + " record(s)");
                                    for (android.nfc.NdefRecord record : ndefMessage.getRecords()) {
                                        byte[] payload = record.getPayload();
                                        if (payload.length > 0) {
                                            // Check MIME type first
                                            if (record.getTnf() == NdefRecord.TNF_MIME_MEDIA) {
                                                byte[] typeBytes = record.getType();
                                                String recordType = new String(typeBytes, StandardCharsets.UTF_8);
                                                if (recordType.equals("application/vnd.ch.sbb.anonymous.wallet")) {
                                                    tagData = new String(payload, StandardCharsets.UTF_8);
                                                    android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                    android.util.Log.d("MainActivity", "✓✓✓ FOUND WALLET DATA VIA DIRECT READ (MIME TYPE)! ✓✓✓");
                                                    android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                    break;
                                                }
                                            }
                                            
                                            // Fallback: check if it's wallet JSON
                                            String tempData = new String(payload, StandardCharsets.UTF_8);
                                            android.util.Log.d("MainActivity", "Direct read preview: " + tempData.substring(0, Math.min(200, tempData.length())));
                                            if (tempData.trim().startsWith("{") && tempData.contains("\"wallet\"")) {
                                                tagData = tempData;
                                                android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                android.util.Log.d("MainActivity", "✓✓✓ FOUND WALLET DATA BY READING DIRECTLY! ✓✓✓");
                                                android.util.Log.d("MainActivity", "✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓");
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    android.util.Log.d("MainActivity", "Tag/phone has no NDEF message");
                                }
                            } finally {
                                ndef.close();
                            }
                        }
                    } catch (Exception e) {
                        android.util.Log.w("MainActivity", "NDEF read error: " + e.getMessage());
                    }
                }
                
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
            }

            // If no NDEF wallet data found, log it but don't use tag ID as data
            if (tagData.isEmpty()) {
                android.util.Log.w("MainActivity", "═══════════════════════════════════════");
                android.util.Log.w("MainActivity", "⚠️ NO WALLET DATA FOUND IN NFC INTENT");
                android.util.Log.w("MainActivity", "This might be:");
                android.util.Log.w("MainActivity", "  - Android system data (contacts, files, etc.)");
                android.util.Log.w("MainActivity", "  - Another app's NFC data");
                android.util.Log.w("MainActivity", "  - Empty or non-wallet NFC tag");
                android.util.Log.w("MainActivity", "Tag ID: " + tagId);
                android.util.Log.w("MainActivity", "Intent action: " + action);
                android.util.Log.w("MainActivity", "═══════════════════════════════════════");
                // Don't send tag ID as data - it's not wallet data
                // Only send if we actually found wallet data
                return;
            }

            android.util.Log.d("MainActivity", "Tag ID: " + tagId);
            android.util.Log.d("MainActivity", "Tag Data: " + tagData);

            // If we're in sharing mode, we're the sender
            // For P2P: We can't write to phones, but Android should handle the exchange
            // The receiving phone will read our data via NDEF_DISCOVERED intent
            if (isSharingMode && pendingWriteData != null) {
                android.util.Log.d("MainActivity", "═══════════════════════════════════════");
                android.util.Log.d("MainActivity", "SHARE MODE: Device detected!");
                android.util.Log.d("MainActivity", "Tag ID: " + tagId);
                android.util.Log.d("MainActivity", "Tag technologies: " + java.util.Arrays.toString(techList));
                
                // Check if this is a physical NFC tag (writable) or a phone (not writable)
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
                        android.util.Log.d("MainActivity", "Physical NFC tag detected - writing wallet data...");
                        writeToTag(tag, pendingWriteData);
                        android.util.Log.d("MainActivity", "✓✓✓ Wallet data written to tag! ✓✓✓");
                        sendNfcWriteResult(true, "Wallet written to tag! Controller can scan it.");
                        return; // Don't read after writing
                    } catch (Exception e) {
                        android.util.Log.e("MainActivity", "Error writing to tag: " + e.getMessage());
                        sendNfcWriteResult(false, "Write failed: " + e.getMessage());
                        return;
                    }
                } else {
                    // It's a phone (controller scanning us)
                    // For P2P: Android should automatically exchange data
                    // The controller will receive our wallet data via NDEF_DISCOVERED
                    android.util.Log.d("MainActivity", "Phone detected (controller scanning us)");
                    android.util.Log.d("MainActivity", "For P2P: Android should exchange data automatically");
                    android.util.Log.d("MainActivity", "Controller will receive wallet data via NDEF_DISCOVERED intent");
                    android.util.Log.d("MainActivity", "Keep share mode active - ready for next scan");
                    // Don't return - continue to check if we received wallet data (bidirectional)
                }
            }
            
            // CRITICAL: Only process wallet data - ignore everything else
            if (tagData.isEmpty() || !tagData.contains("\"wallet\"")) {
                android.util.Log.w("MainActivity", "═══════════════════════════════════════");
                android.util.Log.w("MainActivity", "⚠️ IGNORING NON-WALLET DATA");
                android.util.Log.w("MainActivity", "This is likely Android system data (contacts, files, etc.)");
                android.util.Log.w("MainActivity", "Tag ID: " + tagId);
                android.util.Log.w("MainActivity", "Data preview: " + (tagData.length() > 0 ? tagData.substring(0, Math.min(100, tagData.length())) : "empty"));
                android.util.Log.w("MainActivity", "═══════════════════════════════════════");
                return; // Don't process non-wallet data
            }
            
            // We have wallet data - process it
            android.util.Log.d("MainActivity", "✓✓✓ WALLET DATA CONFIRMED - Processing...");
            
            // If we're in sharing mode and received wallet data, it's bidirectional P2P
            if (isSharingMode && pendingWriteData != null) {
                android.util.Log.d("MainActivity", "Share mode: Received wallet data (bidirectional P2P)");
            }

            // Send wallet data to JavaScript
            sendNfcDataToJavaScript(tagId, tagData);

        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error handling NFC: " + e.getMessage(), e);
        }
    }

    private void sendNfcStepEvent(String step, String message, String details) {
        if (webView == null) {
            android.util.Log.w("MainActivity", "⚠️ WebView is null, cannot send step event: " + step);
            return;
        }
        try {
            // Escape strings for JavaScript
            String escapedStep = (step != null ? step : "").replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r");
            String escapedMessage = (message != null ? message : "").replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r").replace("\"", "\\\"");
            String escapedDetails = (details != null ? details : "").replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r").replace("\"", "\\\"");
            
            android.util.Log.d("MainActivity", "📤 Sending step event: " + step + " - " + message);
            
            String js = String.format(
                "try { " +
                "  if (window.dispatchEvent) { " +
                "    var event = new CustomEvent('nfcstep', { " +
                "      detail: { " +
                "        step: '%s', " +
                "        message: '%s', " +
                "        details: '%s', " +
                "        timestamp: new Date().toISOString() " +
                "      } " +
                "    }); " +
                "    window.dispatchEvent(event); " +
                "    console.log('✅ Step event dispatched:', '%s'); " +
                "  } else { " +
                "    console.error('❌ window.dispatchEvent not available'); " +
                "  } " +
                "} catch(e) { " +
                "  console.error('❌ Error dispatching step event:', e); " +
                "}",
                escapedStep, escapedMessage, escapedDetails, step
            );
            
            webView.post(() -> {
                try {
                    webView.evaluateJavascript(js, null);
                    android.util.Log.d("MainActivity", "✓ Step event JavaScript executed");
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "❌ Error evaluating JavaScript: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "❌ Error sending step event: " + e.getMessage());
            android.util.Log.e("MainActivity", "Stack trace: " + android.util.Log.getStackTraceString(e));
        }
    }

    private void sendNfcDataToJavaScript(String tagId, String tagData) {
        if (webView == null) {
            android.util.Log.e("MainActivity", "WebView is null");
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

        webView.post(() -> {
            webView.evaluateJavascript(js, null);
            android.util.Log.d("MainActivity", "✓ NFC data sent to JavaScript");
        });
    }

    private void writeToTag(Tag tag, String data) throws IOException, android.nfc.FormatException {
        NdefMessage message = createNdefMessage(data);
        android.util.Log.d("MainActivity", "Created NDEF message, size: " + message.getByteArrayLength() + " bytes");
        
        Ndef ndef = Ndef.get(tag);
        
        if (ndef != null) {
            android.util.Log.d("MainActivity", "Tag has NDEF support");
            ndef.connect();
            
            try {
                boolean isWritable = ndef.isWritable();
                int maxSize = ndef.getMaxSize();
                android.util.Log.d("MainActivity", "NDEF writable: " + isWritable + ", max size: " + maxSize);
                
                if (!isWritable) {
                    ndef.close();
                    throw new IOException("Tag is not writable (may be a phone in read mode - try with an NFC tag or ensure receiving phone is ready)");
                }
                if (maxSize < message.getByteArrayLength()) {
                    ndef.close();
                    throw new IOException("Tag capacity too small: " + maxSize + " < " + message.getByteArrayLength());
                }
                
                android.util.Log.d("MainActivity", "Writing NDEF message...");
                ndef.writeNdefMessage(message);
                android.util.Log.d("MainActivity", "✓ NDEF message written successfully!");
            } finally {
                ndef.close();
            }
        } else {
            // Try to format and write
            android.util.Log.d("MainActivity", "Tag does not have NDEF, trying NdefFormatable...");
            NdefFormatable formatable = NdefFormatable.get(tag);
            if (formatable != null) {
                android.util.Log.d("MainActivity", "Tag supports NdefFormatable, formatting...");
                formatable.connect();
                try {
                    formatable.format(message);
                    android.util.Log.d("MainActivity", "✓ Tag formatted and written successfully!");
                } finally {
                    formatable.close();
                }
            } else {
                throw new IOException("Tag is not NDEF formatable (may be a phone - phones are not writable like tags)");
            }
        }
    }

    private NdefMessage createNdefMessage(String text) {
        byte[] textBytes = text.getBytes(StandardCharsets.UTF_8);
        
        // Use custom MIME type so Android won't auto-handle it
        // Only our app will recognize this
        String mimeType = "application/vnd.ch.sbb.anonymous.wallet";
        byte[] mimeBytes = mimeType.getBytes(StandardCharsets.UTF_8);
        
        NdefRecord record = new NdefRecord(
            NdefRecord.TNF_MIME_MEDIA,
            mimeBytes,
            new byte[0],
            textBytes
        );
        
        return new NdefMessage(new NdefRecord[]{record});
    }

    private void sendNfcWriteResult(boolean success, String message) {
        if (webView == null) return;
        
        String js = String.format(
            "if (window.dispatchEvent) { " +
            "  window.dispatchEvent(new CustomEvent('nfcwrite', { " +
            "    detail: { success: %s, message: '%s' } " +
            "  })); " +
            "}",
            success ? "true" : "false",
            message.replace("'", "\\'")
        );
        
        webView.post(() -> {
            webView.evaluateJavascript(js, null);
        });
    }


    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02X", b));
        }
        return result.toString();
    }

    private void requestNFCPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int permissionStatus = ContextCompat.checkSelfPermission(this, Manifest.permission.NFC);
            if (permissionStatus != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.NFC},
                    NFC_PERMISSION_REQUEST_CODE
                );
            }
        }
    }
}

