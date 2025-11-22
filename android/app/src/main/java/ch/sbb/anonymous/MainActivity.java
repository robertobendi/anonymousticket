package ch.sbb.anonymous;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int NFC_PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Request NFC permission if not granted
        requestNFCPermission();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Forward NFC intents to the plugin
        this.bridge.onNewIntent(intent);
    }


    private void requestNFCPermission() {
        // NFC is a "normal" permission (auto-granted), but we still check and request it
        // for Android 6.0+ to ensure proper handling
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int permissionStatus = ContextCompat.checkSelfPermission(this, Manifest.permission.NFC);
            
            if (permissionStatus != PackageManager.PERMISSION_GRANTED) {
                // Request permission - this will show a dialog on some devices
                // Note: NFC is a normal permission, so it's usually auto-granted
                // but requesting it ensures proper setup
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.NFC},
                    NFC_PERMISSION_REQUEST_CODE
                );
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == NFC_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // NFC permission granted
                android.util.Log.d("MainActivity", "NFC permission granted");
            } else {
                // NFC permission denied
                android.util.Log.d("MainActivity", "NFC permission denied");
            }
        }
    }
}
