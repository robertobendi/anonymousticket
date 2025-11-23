package ch.sbb.anonymous;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * Host Card Emulation Service
 * Makes the phone act like an NFC card that can be read by another phone
 * This is the most reliable way for P2P NFC communication
 */
public class WalletHceService extends HostApduService {
    private static final String TAG = "WalletHceService";
    private static final String AID = "F0010203040506"; // Application ID for our wallet
    private static String walletData = null; // Wallet data to share
    
    // APDU commands
    private static final byte[] SELECT_APDU = {
        (byte) 0x00, // CLA
        (byte) 0xA4, // INS
        (byte) 0x04, // P1
        (byte) 0x00, // P2
        (byte) 0x07, // Length
        (byte) 0xF0, (byte) 0x01, (byte) 0x02, (byte) 0x03, (byte) 0x04, (byte) 0x05, (byte) 0x06 // AID
    };
    
    private static final byte[] GET_DATA_APDU = {
        (byte) 0x00, // CLA
        (byte) 0xCA, // INS (GET DATA)
        (byte) 0x00, // P1
        (byte) 0x00, // P2
        (byte) 0x00  // Length (will be set dynamically)
    };
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "═══════════════════════════════════════");
        Log.d(TAG, "✅ WalletHceService CREATED");
        Log.d(TAG, "Service is now registered with Android system");
        Log.d(TAG, "AID: F0010203040506");
        Log.d(TAG, "Category: other (non-payment)");
        Log.d(TAG, "Phone can now emulate an NFC card");
        Log.d(TAG, "Controller can read wallet data by scanning this phone");
        Log.d(TAG, "═══════════════════════════════════════");
    }
    
    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        Log.d(TAG, "═══════════════════════════════════════");
        Log.d(TAG, "🔔🔔🔔 HCE SERVICE: APDU COMMAND RECEIVED 🔔🔔🔔");
        Log.d(TAG, "Command length: " + commandApdu.length);
        Log.d(TAG, "Command: " + bytesToHex(commandApdu));
        Log.d(TAG, "═══════════════════════════════════════");
        
        if (commandApdu == null || commandApdu.length < 4) {
            Log.w(TAG, "Invalid APDU command (too short)");
            return new byte[]{(byte) 0x6D, (byte) 0x00}; // Instruction not supported
        }
        
        // Check if this is a SELECT command (CLA=0x00, INS=0xA4)
        if (commandApdu[0] == 0x00 && commandApdu[1] == (byte) 0xA4) {
            Log.d(TAG, "SELECT command detected");
            
            // Check if it's selecting our AID
            // SELECT format: CLA INS P1 P2 Lc [AID]
            if (commandApdu.length >= 7) {
                int aidLength = commandApdu[4] & 0xFF; // Lc (length of AID)
                if (aidLength == 7 && commandApdu.length >= 12) {
                    byte[] receivedAid = Arrays.copyOfRange(commandApdu, 5, 12);
                    byte[] ourAid = {(byte) 0xF0, (byte) 0x01, (byte) 0x02, (byte) 0x03, (byte) 0x04, (byte) 0x05, (byte) 0x06};
                    
                    if (Arrays.equals(receivedAid, ourAid)) {
                        Log.d(TAG, "✅✅✅ SELECT COMMAND FOR OUR AID - RESPONDING WITH SUCCESS ✅✅✅");
                        return new byte[]{(byte) 0x90, (byte) 0x00}; // Success
                    } else {
                        Log.d(TAG, "⚠️ SELECT for different AID, ignoring");
                        return new byte[]{(byte) 0x6A, (byte) 0x82}; // File not found
                    }
                }
            }
            
            // Generic SELECT response (for compatibility)
            Log.d(TAG, "Generic SELECT command - responding with success");
            return new byte[]{(byte) 0x90, (byte) 0x00};
        }
        
        // Check if this is a GET DATA command (CLA=0x00, INS=0xCA)
        if (commandApdu[0] == 0x00 && commandApdu[1] == (byte) 0xCA) {
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "✅✅✅ GET DATA COMMAND RECEIVED ✅✅✅");
            Log.d(TAG, "Command: " + bytesToHex(commandApdu));
            Log.d(TAG, "═══════════════════════════════════════");
            
            if (walletData == null || walletData.isEmpty()) {
                Log.w(TAG, "⚠️⚠️⚠️ NO WALLET DATA AVAILABLE ⚠️⚠️⚠️");
                // Return "pippo" as debug string instead of error
                String debugData = "pippo";
                byte[] debugBytes = debugData.getBytes(StandardCharsets.UTF_8);
                byte[] debugResponse = new byte[debugBytes.length + 2];
                System.arraycopy(debugBytes, 0, debugResponse, 0, debugBytes.length);
                debugResponse[debugBytes.length] = (byte) 0x90;
                debugResponse[debugBytes.length + 1] = (byte) 0x00;
                Log.d(TAG, "═══════════════════════════════════════");
                Log.d(TAG, "🔴🔴🔴 RETURNING DEBUG STRING: pippo 🔴🔴🔴");
                Log.d(TAG, "Response hex: " + bytesToHex(debugResponse));
                Log.d(TAG, "═══════════════════════════════════════");
                return debugResponse;
            }
            
            // Return wallet data
            byte[] dataBytes = walletData.getBytes(StandardCharsets.UTF_8);
            
            // APDU response format: [data] [status]
            // Status: 0x9000 = success
            byte[] response = new byte[dataBytes.length + 2];
            System.arraycopy(dataBytes, 0, response, 0, dataBytes.length);
            response[dataBytes.length] = (byte) 0x90; // Success status byte 1
            response[dataBytes.length + 1] = (byte) 0x00; // Success status byte 2
            
            Log.d(TAG, "═══════════════════════════════════════");
            Log.d(TAG, "✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅");
            Log.d(TAG, "✅✅✅ SENDING WALLET DATA VIA HCE! ✅✅✅");
            Log.d(TAG, "Data length: " + dataBytes.length + " bytes");
            Log.d(TAG, "Response length: " + response.length + " bytes");
            Log.d(TAG, "Response hex: " + bytesToHex(response).substring(0, Math.min(100, bytesToHex(response).length())));
            Log.d(TAG, "Data preview: " + walletData.substring(0, Math.min(200, walletData.length())));
            Log.d(TAG, "✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅");
            Log.d(TAG, "═══════════════════════════════════════");
            
            return response;
        }
        
        // Unknown command
        Log.w(TAG, "⚠️ Unknown APDU command: " + bytesToHex(commandApdu));
        return new byte[]{(byte) 0x6D, (byte) 0x00}; // Instruction not supported
    }
    
    @Override
    public void onDeactivated(int reason) {
        Log.d(TAG, "HCE service deactivated, reason: " + reason);
    }
    
    /**
     * Set wallet data to share via HCE
     * This activates the HCE service - when a reader selects our AID,
     * it will receive this data via GET DATA command
     */
    public static void setWalletData(String data) {
        walletData = data;
        Log.d(TAG, "═══════════════════════════════════════");
        Log.d(TAG, "✅ WALLET DATA SET FOR HCE");
        Log.d(TAG, "Data length: " + (data != null ? data.length() : 0) + " chars");
        Log.d(TAG, "HCE service is now ACTIVE and ready");
        Log.d(TAG, "When reader selects AID F0010203040506:");
        Log.d(TAG, "  - SELECT command will return 0x9000 (success)");
        Log.d(TAG, "  - GET DATA command will return wallet data");
        Log.d(TAG, "Controller can scan this phone now");
        Log.d(TAG, "═══════════════════════════════════════");
    }
    
    /**
     * Clear wallet data
     */
    public static void clearWalletData() {
        walletData = null;
        Log.d(TAG, "Wallet data cleared - HCE service inactive");
    }
    
    /**
     * Check if wallet data is available
     */
    public static boolean hasWalletData() {
        return walletData != null && !walletData.isEmpty();
    }
    
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02X", b));
        }
        return result.toString();
    }
}


