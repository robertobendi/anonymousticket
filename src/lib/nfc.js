/**
 * NFC Reading functionality for ticket verification
 * Uses native Android NFC via Capacitor plugin or Web NFC API (Chrome browser)
 */

// Import Capacitor NFC plugin (our custom native plugin)
let Nfc = null;

// Check for Capacitor and NFC plugin
function checkNfcPlugin() {
  if (window.Capacitor) {
    // Wait a bit for plugins to load
    if (window.Capacitor.Plugins) {
      Nfc = window.Capacitor.Plugins.Nfc || window.Capacitor.Plugins['Nfc'];
    }
    // Also check if we're in a native app (not browser)
    return window.Capacitor.isNativePlatform();
  }
  return false;
}

// Initialize on load
if (typeof window !== 'undefined') {
  // Check immediately
  checkNfcPlugin();
  
  // Also check after a short delay (plugins might load async)
  setTimeout(() => {
    checkNfcPlugin();
  }, 100);
}

/**
 * Request NFC permission explicitly
 * @returns {Promise<{granted: boolean, requested: boolean, message: string}>} Permission result
 */
export async function requestNFCPermission() {
  // Re-check plugin availability
  checkNfcPlugin();
  
  // If we're in a Capacitor native app, use the plugin
  if (Nfc && window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const result = await Nfc.requestPermission();
      console.log('NFC permission check:', result);
      // NFC is a normal permission, so it's usually auto-granted
      // Return the full result object
      return result || { granted: false, message: 'Permission check failed' };
    } catch (error) {
      console.warn('Failed to request NFC permission via plugin:', error);
      return { granted: false, message: error.message || 'Permission check failed' };
    }
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
 * Check if NFC is available
 * @returns {boolean} True if NFC is supported
 */
export function isNFCAvailable() {
  // Re-check plugin availability
  checkNfcPlugin();
  
  // If we're in a Capacitor native app, NFC should be available via native plugin
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    // In native app, always return true - the plugin will handle it
    // Even if plugin isn't loaded yet, it will be when we try to use it
    return true;
  }
  
  // Check for native Capacitor NFC plugin
  if (Nfc) {
    return true;
  }
  
  // Check for Web NFC API (only works in Chrome browser, not WebView)
  if ('NDEFReader' in window && !window.Capacitor) {
    // Also check if we're in a secure context (required for Web NFC)
    if (window.isSecureContext) {
      return true;
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
  // Re-check plugin availability
  checkNfcPlugin();
  
  // Try to get plugin if not already loaded
  if (!Nfc && window.Capacitor && window.Capacitor.Plugins) {
    Nfc = window.Capacitor.Plugins.Nfc || window.Capacitor.Plugins['Nfc'];
  }
  
  if (!Nfc) {
    throw new Error('Native NFC plugin not available. Please ensure NFC is enabled on your device.');
  }

  try {
    // Check if NFC is enabled
    let enabled = true;
    try {
      const enabledResult = await Nfc.isEnabled();
      enabled = enabledResult?.enabled !== false;
    } catch (e) {
      // isEnabled might not be available, continue anyway
      console.warn('Could not check NFC enabled status:', e);
    }
    
    if (!enabled) {
      throw new Error('NFC is disabled. Please enable NFC in your device settings.');
    }

    // Start scan session - this will show system permission prompt if needed
    return new Promise((resolve, reject) => {
      let listener = null;
      
      // Set up listener for NFC tag scans
      try {
        listener = Nfc.addListener('nfcTagScanned', async (event) => {
          try {
            // Extract data from NFC tag event
            const tagData = event.data || event.text || event.nfcTag?.data || '';
            const tagId = event.id || event.nfcTag?.id || '';
            
            // Stop scanning
            try {
              await Nfc.stopScanSession();
            } catch (e) {
              // Ignore stop errors
            }
            
            if (listener && listener.remove) {
              listener.remove();
            }
            
            resolve({
              records: [{ data: tagData }],
              id: tagId,
              serialNumber: tagId,
            });
          } catch (error) {
            if (listener && listener.remove) {
              listener.remove();
            }
            reject(error);
          }
        });
      } catch (listenerError) {
        reject(new Error(`Failed to set up NFC listener: ${listenerError.message || listenerError}`));
        return;
      }

      // Start scanning - this will request permission if needed
      Nfc.startScanSession({
        message: 'Hold your device near the NFC tag',
      }).catch((error) => {
        if (listener && listener.remove) {
          listener.remove();
        }
        if (error && (error.message && error.message.includes('permission'))) {
          reject(new Error('NFC permission denied. Please allow NFC access when prompted.'));
        } else {
          reject(new Error(`Failed to start NFC scan: ${error?.message || error || 'Unknown error'}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(async () => {
        try {
          await Nfc.stopScanSession();
        } catch (e) {
          // Ignore stop errors
        }
        if (listener && listener.remove) {
          listener.remove();
        }
        reject(new Error('NFC read timeout. Please try again and hold the tag closer.'));
      }, 30000);
    });
  } catch (error) {
    throw new Error(`Native NFC failed: ${error.message || error}`);
  }
}

/**
 * Read NFC tag (auto-detects method)
 * Prefers native Capacitor NFC over Web NFC API
 * @returns {Promise<Object>} NFC message data
 */
export async function readNFC() {
  // Prefer native Capacitor NFC plugin (works in app)
  if (Nfc) {
    return await readNFCCapacitor();
  }
  // Fallback to Web NFC API (only works in Chrome browser, not WebView)
  else if ('NDEFReader' in window) {
    return await readNFCWeb();
  } else {
    throw new Error('NFC not available. Please ensure NFC is enabled on your device.');
  }
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
  checkNfcPlugin();
  
  if (!Nfc && window.Capacitor && window.Capacitor.Plugins) {
    Nfc = window.Capacitor.Plugins.Nfc || window.Capacitor.Plugins['Nfc'];
  }
  
  if (!Nfc) {
    throw new Error('Native NFC plugin not available. Please ensure NFC is enabled on your device.');
  }

  try {
    // Check if NFC is enabled
    let enabled = true;
    try {
      const enabledResult = await Nfc.isEnabled();
      enabled = enabledResult?.enabled !== false;
    } catch (e) {
      console.warn('Could not check NFC enabled status:', e);
    }
    
    if (!enabled) {
      throw new Error('NFC is disabled. Please enable NFC in your device settings.');
    }

    // Use the writeNdef method from the plugin
    return new Promise((resolve, reject) => {
      let writeListener = null;
      let errorListener = null;
      
      // Set up listeners for write completion
      try {
        writeListener = Nfc.addListener('nfcWriteComplete', (event) => {
          if (writeListener && writeListener.remove) {
            writeListener.remove();
          }
          if (errorListener && errorListener.remove) {
            errorListener.remove();
          }
          resolve();
        });
        
        errorListener = Nfc.addListener('nfcWriteError', (event) => {
          if (writeListener && writeListener.remove) {
            writeListener.remove();
          }
          if (errorListener && errorListener.remove) {
            errorListener.remove();
          }
          reject(new Error(event.error || 'Failed to write NFC tag'));
        });
      } catch (e) {
        // If listeners fail, continue anyway (plugin might not support events)
      }

      // Start write operation
      Nfc.writeNdef({ data: data })
        .then(() => {
          // If writeNdef resolves immediately, wait for tag or timeout
          // The actual write happens when tag is discovered
        })
        .catch((error) => {
          if (writeListener && writeListener.remove) {
            writeListener.remove();
          }
          if (errorListener && errorListener.remove) {
            errorListener.remove();
          }
          reject(new Error(error.message || 'Failed to start NFC write'));
        });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (writeListener && writeListener.remove) {
          writeListener.remove();
        }
        if (errorListener && errorListener.remove) {
          errorListener.remove();
        }
        reject(new Error('NFC write timeout. Please hold your device near an NFC tag.'));
      }, 30000);
    });
  } catch (error) {
    throw new Error(`Native NFC write failed: ${error.message || error}`);
  }
}

/**
 * Write data to NFC tag (auto-detects method)
 * @param {string} data - Data to write
 * @returns {Promise<void>}
 */
export async function writeNFC(data) {
  // Prefer native Capacitor NFC plugin (works in app)
  if (Nfc) {
    return await writeNFCCapacitor(data);
  }
  // Fallback to Web NFC API (only works in Chrome browser, not WebView)
  else if ('NDEFWriter' in window) {
    return await writeNFCWeb(data);
  } else {
    throw new Error('NFC write not available. Please ensure NFC is enabled on your device.');
  }
}

/**
 * Parse ticket data from NFC record
 * @param {string} nfcData - Data from NFC tag
 * @returns {Object|null} Parsed ticket data or null
 */
export function parseNFCTicketData(nfcData) {
  try {
    // Try to parse as wallet JSON format first (contains tickets array)
    const parsed = JSON.parse(nfcData);
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
        controlCode: parts[1],
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
          controlCode: parts[1],
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


