package ch.sbb.anonymous;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Parcelable;

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

    @Override
    public void load() {
        Activity activity = getActivity();
        nfcAdapter = NfcAdapter.getDefaultAdapter(activity.getApplicationContext());
        
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
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        if (nfcAdapter != null) {
            ret.put("enabled", nfcAdapter.isEnabled());
            ret.put("available", true);
        } else {
            ret.put("enabled", false);
            ret.put("available", false);
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

    @Override
    public void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        
        if (NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_TECH_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_TAG_DISCOVERED.equals(intent.getAction())) {
            
            Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            
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

