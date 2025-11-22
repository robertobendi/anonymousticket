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
    }

    @Override
    public void onPause() {
        super.onPause();
        disableNfcForegroundDispatch();
        
        // Cancel sharing mode when app is paused
        if (isSharingMode) {
            isSharingMode = false;
            pendingWriteData = null;
        }
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
            
            // Store data to write when tag/device is detected
            pendingWriteData = data;
            isSharingMode = true;
            android.util.Log.d("MainActivity", "NFC sharing mode enabled - waiting for device/tag...");
            
            // Enable foreground dispatch to catch NFC intents
            enableNfcForegroundDispatch();
            
            return "{\"success\":true,\"message\":\"Ready to share. Hold device back-to-back with another phone (on Verify page).\"}";
        }

        @JavascriptInterface
        public String cancelWrite() {
            pendingWriteData = null;
            isSharingMode = false;
            android.util.Log.d("MainActivity", "NFC sharing cancelled");
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

            // Listen for all NFC intents
            android.content.IntentFilter[] filters = new android.content.IntentFilter[]{
                new android.content.IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED),
                new android.content.IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED)
            };

            // Support all NFC technologies
            String[][] techLists = new String[][]{
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

        android.util.Log.d("MainActivity", "NFC tag detected: " + action);

        try {
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag == null) {
                android.util.Log.e("MainActivity", "Tag is null");
                return;
            }

            String tagId = bytesToHex(tag.getId());
            String tagData = "";

            // Try to read NDEF data - prioritize wallet data
            Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
            if (rawMessages != null) {
                for (Parcelable rawMessage : rawMessages) {
                    android.nfc.NdefMessage message = (android.nfc.NdefMessage) rawMessage;
                    for (android.nfc.NdefRecord record : message.getRecords()) {
                        byte[] payload = record.getPayload();
                        if (payload.length > 0) {
                            // Try UTF-8 text
                            try {
                                String tempData = new String(payload, StandardCharsets.UTF_8);
                                if (tempData.length() > 0 && tempData.charAt(0) < 0x20) {
                                    // Skip status byte for text records
                                    tempData = tempData.substring(1);
                                }
                                
                                // Check if this looks like wallet data (JSON with "wallet" key)
                                if (tempData.trim().startsWith("{") && tempData.contains("\"wallet\"")) {
                                    tagData = tempData;
                                    android.util.Log.d("MainActivity", "✓ Found wallet data!");
                                    break;
                                } else if (tagData.isEmpty()) {
                                    // Only use non-wallet data if we haven't found wallet data yet
                                    tagData = tempData;
                                }
                            } catch (Exception e) {
                                if (tagData.isEmpty()) {
                                    tagData = bytesToHex(payload);
                                }
                            }
                        }
                    }
                    if (tagData.contains("\"wallet\"")) break; // Stop if we found wallet data
                }
            }

            // If no NDEF data, use tag ID
            if (tagData.isEmpty()) {
                tagData = tagId;
            }

            android.util.Log.d("MainActivity", "Tag ID: " + tagId);
            android.util.Log.d("MainActivity", "Tag Data: " + tagData);

            // Check if we need to write data (we're the sender)
            if (isSharingMode && pendingWriteData != null) {
                android.util.Log.d("MainActivity", "Writing wallet data to detected device/tag...");
                try {
                    writeToTag(tag, pendingWriteData);
                    android.util.Log.d("MainActivity", "✓ Wallet data written successfully");
                    
                    // Send write success event
                    sendNfcWriteResult(true, "Wallet shared successfully!");
                    // Keep sharing mode active for multiple shares
                    return; // Don't read after writing
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Error writing to tag: " + e.getMessage(), e);
                    sendNfcWriteResult(false, "Share failed: " + e.getMessage());
                    // Continue to read if write fails
                }
            }
            
            // If we're in sharing mode, don't read - we're the sender
            if (isSharingMode) {
                android.util.Log.d("MainActivity", "In sharing mode - ignoring read (we're the sender)");
                return;
            }

            // Send to JavaScript immediately via event
            sendNfcDataToJavaScript(tagId, tagData);

        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error handling NFC: " + e.getMessage(), e);
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
        Ndef ndef = Ndef.get(tag);
        
        if (ndef != null) {
            ndef.connect();
            if (!ndef.isWritable()) {
                ndef.close();
                throw new IOException("Tag is not writable");
            }
            if (ndef.getMaxSize() < message.getByteArrayLength()) {
                ndef.close();
                throw new IOException("Tag capacity is too small");
            }
            ndef.writeNdefMessage(message);
            ndef.close();
        } else {
            // Try to format and write
            NdefFormatable formatable = NdefFormatable.get(tag);
            if (formatable != null) {
                formatable.connect();
                formatable.format(message);
                formatable.close();
            } else {
                throw new IOException("Tag is not NDEF formatable");
            }
        }
    }

    private NdefMessage createNdefMessage(String text) {
        byte[] textBytes = text.getBytes(StandardCharsets.UTF_8);
        byte[] payload = new byte[1 + textBytes.length];
        payload[0] = (byte) 0; // UTF-8 encoding
        System.arraycopy(textBytes, 0, payload, 1, textBytes.length);
        
        NdefRecord record = new NdefRecord(
            NdefRecord.TNF_WELL_KNOWN,
            NdefRecord.RTD_TEXT,
            new byte[0],
            payload
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
