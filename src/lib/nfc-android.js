/**
 * Direct Android NFC via WebView JavaScript Interface
 * Bypasses Capacitor plugin system - uses Android's native WebView interface
 */

import { Capacitor } from '@capacitor/core';

let androidNfc = null;

// Get Android NFC interface - always returns a Promise for consistency
async function getAndroidNfc() {
  if (androidNfc) {
    return androidNfc;
  }
  
  // Wait a bit for WebView interface to be ready
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    // Check immediately
    if (window.AndroidNfc) {
      androidNfc = window.AndroidNfc;
      console.log('✓ Android NFC interface found');
      return androidNfc;
    }
    
    // Wait and retry (WebView interface might not be ready yet)
    return new Promise((resolve) => {
      setTimeout(() => {
        if (window.AndroidNfc) {
          androidNfc = window.AndroidNfc;
          console.log('✓ Android NFC interface found (after delay)');
          resolve(androidNfc);
        } else {
          console.error('❌ AndroidNfc interface not found');
          resolve(null);
        }
      }, 500);
    });
  }
  
  return null;
}

/**
 * Check if NFC is available and enabled
 */
export async function checkNFC() {
  try {
    const nfc = await getAndroidNfc();
    
    if (!nfc) {
      return {
        available: false,
        enabled: false,
        hasPermission: false,
        error: 'Android NFC interface not found. Make sure you are on Android.'
      };
    }
    
    try {
      const resultStr = nfc.isEnabled();
      const result = JSON.parse(resultStr);
      return {
        available: result.available === true,
        enabled: result.enabled === true,
        hasPermission: result.hasPermission !== false
      };
    } catch (error) {
      console.error('Error calling isEnabled:', error);
      return {
        available: false,
        enabled: false,
        hasPermission: false,
        error: error.message
      };
    }
  } catch (error) {
    console.error('Error getting AndroidNfc interface:', error);
    return {
      available: false,
      enabled: false,
      hasPermission: false,
      error: error.message
    };
  }
}

/**
 * Request NFC permission - shows Android system dialog
 */
export async function requestNFCPermission() {
  try {
    const nfc = await getAndroidNfc();
    
    if (!nfc) {
      console.warn('Android NFC interface not found - permission might be auto-granted');
      return true; // NFC is a normal permission, might be auto-granted
    }
    
    try {
      const resultStr = nfc.requestPermission();
      const result = JSON.parse(resultStr);
      console.log('NFC permission request result:', result);
      return result.requested === true || result.granted === true;
    } catch (error) {
      console.error('Permission request failed:', error);
      // Still return true - permission might be auto-granted
      return true;
    }
  } catch (error) {
    console.error('Error getting AndroidNfc interface for permission:', error);
    return true; // Assume granted to not block the flow
  }
}

/**
 * Start reading NFC tags
 * Uses Android's NFC intent system - direct WebView events
 */
export async function startReading() {
  try {
    const nfc = await getAndroidNfc();
    
    if (!nfc) {
      throw new Error('Android NFC interface not found. Make sure you are on Android.');
    }
    
    // Check NFC status first
    const status = await checkNFC();
    if (!status.available) {
      throw new Error('NFC is not available on this device');
    }
    if (!status.enabled) {
      throw new Error('NFC is disabled. Please enable NFC in your device settings.');
    }
    
    // Request permission
    await requestNFCPermission();
    
    // Start scan - enable foreground dispatch
    console.log('Starting NFC scan...');
    let result;
    try {
      result = nfc.startScan();
    } catch (error) {
      console.error('Error calling startScan:', error);
      throw new Error('Failed to start NFC scan: ' + error.message);
    }
    
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (error) {
      console.error('Error parsing startScan result:', error, 'Raw result:', result);
      throw new Error('Invalid response from NFC scan start');
    }
    
    if (!parsed.success) {
      throw new Error(parsed.error || parsed.message || 'Failed to start NFC scan');
    }
    
    console.log('NFC scan started:', parsed.message);
    console.log('Hold device near any NFC tag or device...');
    
    // Return a promise that will be resolved when NFC tag is detected
    // Listen for custom event from Android WebView
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const handler = (event) => {
        if (resolved) return;
        resolved = true;
        
        window.removeEventListener('nfcTagScanned', handler);
        
        const tagId = event.detail?.id || '';
        const tagData = event.detail?.data || '';
        
        console.log('✓ NFC tag detected!');
        console.log('  Tag ID:', tagId);
        console.log('  Data:', tagData);
        
        resolve({
          id: tagId,
          data: tagData
        });
      };
      
      window.addEventListener('nfcTagScanned', handler);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        window.removeEventListener('nfcTagScanned', handler);
        
        // Stop scanning
        try {
          if (nfc && typeof nfc.stopScan === 'function') {
            nfc.stopScan();
          }
        } catch (e) {
          console.warn('Error stopping scan:', e);
        }
        
        reject(new Error('NFC read timeout. Hold device near any NFC tag or device and try again.'));
      }, 30000);
    });
  } catch (error) {
    console.error('Error in startReading:', error);
    throw error;
  }
}

