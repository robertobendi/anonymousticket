/**
 * NFC Reading functionality for ticket verification
 * Uses native Android NFC via Capacitor plugin or Web NFC API (Chrome browser)
 */

import { Capacitor } from '@capacitor/core';

// We use window.NFC (JavaScript interface), NOT Capacitor plugin
// window.NFC is exposed via addJavascriptInterface in MainActivity
// This file is only used for parseNFCTicketData - no plugin needed

/**
 * Request NFC permission explicitly
 * @returns {Promise<{granted: boolean, requested: boolean, message: string}>} Permission result
 */
export async function requestNFCPermission() {
  // We use window.NFC directly, not Capacitor plugin
  // Permission is handled automatically by Android
  if (Capacitor.isNativePlatform()) {
    // Permission is automatically granted for NFC on Android
    return { granted: true, message: 'NFC permission granted' };
  }
  
  // Try using the Permissions API if available (for Web NFC)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      // Query NFC permission status
      const result = await navigator.permissions.query({ name: 'nfc' });
      
      if (result.state === 'granted') {
        return { granted: true, message: 'NFC permission granted' };
      }
      
      if (result.state === 'prompt') {
        // Permission will be requested when scan() is called
        return { granted: true, message: 'NFC permission will be requested when needed' };
      }
      
      // Permission denied
      return { granted: false, message: 'NFC permission denied' };
    } catch (error) {
      // Permissions API might not support 'nfc' name
      console.warn('Permissions API query failed:', error);
    }
  }
  
  // For Web NFC API, permission is requested when scan() is called
  if ('NDEFReader' in window && window.isSecureContext) {
    return { granted: true, message: 'NFC will prompt when needed' };
  }
  
  return { granted: false, message: 'NFC not available' };
}

/**
 * Check if NFC is available (synchronous check)
 * @returns {boolean} True if NFC is supported
 */
export function isNFCAvailable() {
  // Check if window.NFC is available (our JavaScript interface)
  if (typeof window !== 'undefined' && window.NFC) {
    return true;
  }
  
  // Check for Web NFC API (browser only)
  if (typeof window !== 'undefined' && 'NDEFReader' in window && !window.Capacitor && window.isSecureContext) {
    return true;
  }
  
  return false;
}

/**
 * Check if NFC is available (async - actually tests the plugin)
 * @returns {Promise<boolean>} True if NFC is supported and working
 */
export async function isNFCAvailableAsync() {
  // Check if window.NFC is available (our JavaScript interface)
  if (typeof window !== 'undefined' && window.NFC) {
    try {
      const result = JSON.parse(window.NFC.isNfcEnabled());
      return result.available === true;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

/**
 * Read NFC tag using Web NFC API
 * @returns {Promise<Object>} NFC message data
 */
export async function readNFCWeb() {
  if (!('NDEFReader' in window)) {
    throw new Error('Web NFC API not supported. Use Chrome on Android.');
  }

  // Check if we're in a secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    throw new Error('NFC requires a secure context (HTTPS).');
  }

  // Check if we're in a WebView (Capacitor app)
  // Web NFC API doesn't work in WebView - only in Chrome browser
  if (window.Capacitor || /wv|WebView/i.test(navigator.userAgent)) {
    throw new Error('Web NFC does not work in the app. Please open this website in Chrome browser, or use manual code entry.');
  }

  try {
    const reader = new NDEFReader();
    
    // Request permission and start scanning
    // The scan() method should trigger the permission prompt in Chrome browser
    // Note: This only works in Chrome browser, not in WebView/App
    try {
      await reader.scan();
    } catch (scanError) {
      // If scan fails, it might be a permission issue
      if (scanError.name === 'NotAllowedError' || scanError.message.includes('permission') || scanError.message.includes('denied')) {
        throw new Error('NFC permission denied. Please allow NFC access when prompted.');
      }
      // Check for other errors
      if (scanError.name === 'NotSupportedError' || scanError.message.includes('not supported')) {
        throw new Error('NFC is not supported. Please use Chrome browser on Android.');
      }
      throw scanError;
    }
    
    return new Promise((resolve, reject) => {
      // Set a timeout for NFC reading (30 seconds)
      const timeout = setTimeout(() => {
        reject(new Error('NFC read timeout. Please try again and hold the tag closer to your device.'));
      }, 30000);

      reader.onreading = (event) => {
        clearTimeout(timeout);
        const message = event.message;
        const records = [];
        
        for (const record of message.records) {
          const decoder = new TextDecoder();
          const text = decoder.decode(record.data);
          records.push({
            recordType: record.recordType,
            mediaType: record.mediaType,
            data: text,
          });
        }
        
        resolve({
          records: records,
          serialNumber: event.serialNumber,
        });
      };
      
      reader.onreadingerror = (error) => {
        clearTimeout(timeout);
        let errorMessage = 'Failed to read NFC tag.';
        
        if (error.message) {
          if (error.message.includes('permission') || error.message.includes('denied')) {
            errorMessage = 'NFC permission denied. Please allow NFC access when prompted.';
          } else if (error.message.includes('NotSupportedError')) {
            errorMessage = 'NFC is not supported on this device.';
          } else {
            errorMessage = `NFC error: ${error.message}`;
          }
        }
        
        reject(new Error(errorMessage));
      };
    });
  } catch (error) {
    let errorMessage = 'Failed to start NFC scan.';
    
    if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
      errorMessage = 'NFC permission denied. Please allow NFC access when prompted.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'NFC is not supported on this device or browser.';
    } else if (error.message) {
      errorMessage = `NFC scan failed: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Read NFC tag using native Capacitor NFC plugin
 * @returns {Promise<Object>} NFC message data
 */
export async function readNFCCapacitor() {
  // Use window.NFC directly, not Capacitor plugin
  if (!window.NFC) {
    throw new Error('NFC interface not available. Ensure NFC is enabled on device.');
  }
  
  // Use nfc-simple.js which uses window.NFC
  const { startReading } = await import('./nfc-simple');
  return await startReading();
}

/**
 * Read NFC tag (auto-detects method)
 * ALWAYS uses native plugin in Capacitor apps, NEVER Web NFC
 * @returns {Promise<Object>} NFC message data
 */
export async function readNFC() {
  // Use window.NFC directly (JavaScript interface), not Capacitor plugin
  if (Capacitor.isNativePlatform()) {
    if (!window.NFC) {
      throw new Error('NFC interface not available. Please ensure the app is properly built with NFC support.');
    }
    
    // Use nfc-simple.js which uses window.NFC
    const { startReading } = await import('./nfc-simple');
    return await startReading();
  }
  
  // Only use Web NFC in browser (not Capacitor)
  if ('NDEFReader' in window && !window.Capacitor) {
    return await readNFCWeb();
  }
  
  throw new Error('NFC not available. Please ensure NFC is enabled on your device.');
}

/**
 * Write data to NFC tag using Web NFC API
 * @param {string} data - Data to write
 * @returns {Promise<void>}
 */
export async function writeNFCWeb(data) {
  if (!('NDEFWriter' in window)) {
    throw new Error('Web NFC API not supported. Use Chrome on Android.');
  }

  if (!window.isSecureContext) {
    throw new Error('NFC requires a secure context (HTTPS).');
  }

  if (window.Capacitor || /wv|WebView/i.test(navigator.userAgent)) {
    throw new Error('Web NFC does not work in the app. Please use the native plugin.');
  }

  try {
    const writer = new NDEFWriter();
    // Write data as string (Web NFC will create a text record)
    await writer.write(data);
  } catch (error) {
    let errorMessage = 'Failed to write NFC tag.';
    
    if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
      errorMessage = 'NFC permission denied. Please allow NFC access when prompted.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'NFC is not supported on this device.';
    } else if (error.message) {
      errorMessage = `NFC write failed: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Write data to NFC tag using native Capacitor NFC plugin
 * @param {string} data - Data to write
 * @returns {Promise<void>}
 */
export async function writeNFCCapacitor(data) {
  // Write is not supported via window.NFC - this function is not used
  // We only use window.NFC for reading (HCE) and beacon mode
  throw new Error('Write NFC not supported via window.NFC interface. We only use NFC for reading tickets via HCE.');
}

/**
 * Write data to NFC tag (auto-detects method)
 * ALWAYS uses native plugin in Capacitor apps, NEVER Web NFC
 * @param {string} data - Data to write
 * @returns {Promise<void>}
 */
export async function writeNFC(data) {
  // Write is not supported via window.NFC - this function is not used
  // We only use window.NFC for reading (HCE) and beacon mode
  throw new Error('Write NFC not supported. We only use NFC for reading tickets via HCE.');
}

/**
 * Parse ticket data from NFC record
 * @param {string} nfcData - Data from NFC tag
 * @returns {Object|null} Parsed ticket data or null
 */
export function parseNFCTicketData(nfcData) {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(nfcData);
    
    // Check if this is a ticket JSON (simple format)
    if (parsed && parsed.ticket === true) {
      return parsed; // Return ticket object directly
    }
    
    // Try to parse as wallet JSON format (contains tickets array)
    if (parsed.wallet && Array.isArray(parsed.tickets)) {
      return parsed; // Return wallet object
    }
    
    // Try to parse as single ticket JSON
    if (parsed.id || parsed.ticketId) {
      return parsed;
    }
    
    // Try to parse as QR code format: TICKET_ID|CONTROL_CODE|...
    const parts = nfcData.split('|');
    
    if (parts.length >= 2) {
      return {
        ticketId: parts[0],
        // Additional data if available
        origin: parts[2] || null,
        destination: parts[3] || null,
        date: parts[4] || null,
        departure: parts[5] || null,
      };
    }
    
    return null;
  } catch (error) {
    // If JSON parse fails, try QR code format
    try {
      const parts = nfcData.split('|');
      if (parts.length >= 2) {
        return {
          ticketId: parts[0],
          origin: parts[2] || null,
          destination: parts[3] || null,
          date: parts[4] || null,
          departure: parts[5] || null,
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  }
}


