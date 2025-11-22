package ch.sbb.anonymous;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.nfc.FormatException;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Build;
import android.os.Parcelable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "Nfc")
public class NfcPlugin extends Plugin {

    private NfcAdapter nfcAdapter;
    private PendingIntent pendingIntent;
    private IntentFilter[] intentFiltersArray;
    private String[][] techListsArray;
    private String pendingWriteData = null;

    @Override
    public void load() {
        android.util.Log.d("NfcPlugin", "═══════════════════════════════════════");
        android.util.Log.d("NfcPlugin", "NfcPlugin.load() called - Plugin is loading!");
        android.util.Log.d("NfcPlugin", "Plugin name: Nfc");
        android.util.Log.d("NfcPlugin", "Plugin class: ch.sbb.anonymous.NfcPlugin");
        android.util.Log.d("NfcPlugin", "═══════════════════════════════════════");
        Activity activity = getActivity();
        nfcAdapter = NfcAdapter.getDefaultAdapter(activity.getApplicationContext());
        
        if (nfcAdapter == null) {
            android.util.Log.e("NfcPlugin", "NFC adapter is null - NFC not available on this device");
        } else {
            android.util.Log.d("NfcPlugin", "NFC adapter found, enabled: " + nfcAdapter.isEnabled());
        }
        
        // Create PendingIntent for NFC
        Intent intent = new Intent(activity, activity.getClass());
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        pendingIntent = PendingIntent.getActivity(activity, 0, intent, 
            PendingIntent.FLAG_MUTABLE);

        // Set up intent filters
        IntentFilter ndef = new IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED);
        try {
            ndef.addDataType("*/*");
        } catch (IntentFilter.MalformedMimeTypeException e) {
            throw new RuntimeException("Failed to add MIME type", e);
        }
        intentFiltersArray = new IntentFilter[]{ndef};
        techListsArray = new String[][]{new String[]{Ndef.class.getName()}};
        
        android.util.Log.d("NfcPlugin", "NfcPlugin.load() completed successfully");
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        android.util.Log.d("NfcPlugin", "isEnabled() called from JavaScript");
        Activity activity = getActivity();
        JSObject ret = new JSObject();
        
        if (nfcAdapter != null) {
            boolean hasPermission = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                hasPermission = ContextCompat.checkSelfPermission(activity, android.Manifest.permission.NFC) 
                        == PackageManager.PERMISSION_GRANTED;
            }
            
            boolean nfcEnabled = nfcAdapter.isEnabled();
            android.util.Log.d("NfcPlugin", "NFC status - enabled: " + nfcEnabled + ", hasPermission: " + hasPermission);
            
            // Return true if NFC adapter exists and has permission
            // Don't require NFC to be enabled - user can enable it in settings
            ret.put("enabled", nfcEnabled);
            ret.put("available", true);
            ret.put("hasPermission", hasPermission);
        } else {
            android.util.Log.w("NfcPlugin", "NFC adapter is null - device doesn't have NFC");
            ret.put("enabled", false);
            ret.put("available", false);
            ret.put("hasPermission", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Activity activity = getActivity();
        JSObject ret = new JSObject();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int permissionStatus = ContextCompat.checkSelfPermission(activity, android.Manifest.permission.NFC);
            
            if (permissionStatus != PackageManager.PERMISSION_GRANTED) {
                // Request permission
                // Note: NFC is a "normal" permission, so it's usually auto-granted at install time
                // Requesting it ensures proper setup and may show a dialog on some devices
                ActivityCompat.requestPermissions(
                    activity,
                    new String[]{android.Manifest.permission.NFC},
                    1003
                );
                
                ret.put("granted", false);
                ret.put("requested", true);
                ret.put("message", "NFC permission requested. It should be automatically granted (NFC is a normal permission).");
            } else {
                ret.put("granted", true);
                ret.put("requested", false);
                ret.put("message", "NFC permission already granted");
            }
        } else {
            // Android < 6.0 doesn't need runtime permission
            ret.put("granted", true);
            ret.put("requested", false);
            ret.put("message", "NFC permission not required on this Android version");
        }
        
        call.resolve(ret);
    }

    @PluginMethod
    public void startScanSession(PluginCall call) {
        Activity activity = getActivity();
        if (nfcAdapter == null) {
            call.reject("NFC is not available on this device");
            return;
        }

        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC is disabled. Please enable NFC in your device settings.");
            return;
        }

        try {
            // Enable foreground dispatch to receive NFC intents
            // This allows the app to receive NFC tags even when in foreground
            nfcAdapter.enableForegroundDispatch(activity, pendingIntent, intentFiltersArray, techListsArray);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("NFC permission denied: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to start NFC scan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopScanSession(PluginCall call) {
        Activity activity = getActivity();
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(activity);
        }
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void writeNdef(PluginCall call) {
        Activity activity = getActivity();
        
        if (nfcAdapter == null) {
            call.reject("NFC is not available on this device");
            return;
        }

        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC is disabled. Please enable NFC in your device settings.");
            return;
        }

        // Check permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ requires NFC permission check
            if (ContextCompat.checkSelfPermission(activity, android.Manifest.permission.NFC) 
                    != PackageManager.PERMISSION_GRANTED) {
                // Request permission
                ActivityCompat.requestPermissions(
                    activity,
                    new String[]{android.Manifest.permission.NFC},
                    1002
                );
                call.reject("NFC permission required. Please grant NFC permission and try again.");
                return;
            }
        }

        String data = call.getString("data");
        if (data == null || data.isEmpty()) {
            call.reject("Data is required");
            return;
        }

        // Enable foreground dispatch for writing
        try {
            nfcAdapter.enableForegroundDispatch(activity, pendingIntent, intentFiltersArray, techListsArray);
            
            // Store the data to write when tag is discovered
            pendingWriteData = data;
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Hold your device near an NFC tag to write");
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("NFC permission denied: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to start NFC write: " + e.getMessage());
        }
    }

    private void writeToTag(Tag tag, String data) throws IOException, FormatException {
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
        byte[] textBytes = text.getBytes(java.nio.charset.StandardCharsets.UTF_8);
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

    @Override
    public void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        
        if (NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_TECH_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_TAG_DISCOVERED.equals(intent.getAction())) {
            
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            
            // Check if we need to write data
            if (pendingWriteData != null && tag != null) {
                try {
                    writeToTag(tag, pendingWriteData);
                    // Send success event
                    JSObject writeResult = new JSObject();
                    writeResult.put("success", true);
                    writeResult.put("message", "Data written successfully");
                    notifyListeners("nfcWriteComplete", writeResult);
                    // Clear write data
                    pendingWriteData = null;
                } catch (IOException e) {
                    JSObject writeResult = new JSObject();
                    writeResult.put("success", false);
                    writeResult.put("error", "IO Error: " + e.getMessage());
                    notifyListeners("nfcWriteError", writeResult);
                    pendingWriteData = null;
                } catch (FormatException e) {
                    JSObject writeResult = new JSObject();
                    writeResult.put("success", false);
                    writeResult.put("error", "Format Error: " + e.getMessage());
                    notifyListeners("nfcWriteError", writeResult);
                    pendingWriteData = null;
                } catch (Exception e) {
                    JSObject writeResult = new JSObject();
                    writeResult.put("success", false);
                    writeResult.put("error", e.getMessage());
                    notifyListeners("nfcWriteError", writeResult);
                    pendingWriteData = null;
                }
                return;
            }
            
            // Otherwise, read from tag
            Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
            
            if (rawMessages != null && rawMessages.length > 0) {
                NdefMessage[] messages = new NdefMessage[rawMessages.length];
                for (int i = 0; i < rawMessages.length; i++) {
                    messages[i] = (NdefMessage) rawMessages[i];
                }
                
                // Extract text from NDEF records
                String textData = "";
                for (NdefMessage message : messages) {
                    for (NdefRecord record : message.getRecords()) {
                        if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN &&
                            java.util.Arrays.equals(record.getType(), NdefRecord.RTD_TEXT)) {
                            byte[] payload = record.getPayload();
                            // Skip language code (first byte)
                            if (payload.length > 1) {
                                textData = new String(payload, 1, payload.length - 1, StandardCharsets.UTF_8);
                                break;
                            }
                        }
                    }
                }
                
                // Send event to JavaScript
                JSObject data = new JSObject();
                data.put("id", bytesToHex(tag.getId()));
                data.put("data", textData);
                
                android.util.Log.d("NfcPlugin", "Sending nfcTagScanned event: id=" + data.getString("id") + ", data=" + textData);
                notifyListeners("nfcTagScanned", data);
            }
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02X", b));
        }
        return result.toString();
    }
}

