package ch.sbb.anonymous;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;

import com.getcapacitor.BridgeActivity;

/**
 * Main Activity - Simple WebView wrapper for QR Code ticket app
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private WebView webView;

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
        
        Log.d(TAG, "MainActivity initialized - QR Code ticket app ready");
    }
}
