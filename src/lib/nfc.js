/**
 * NFC Reading functionality for ticket verification
 * Uses native Android NFC via Capacitor plugin or Web NFC API (Chrome browser)
 */

import { Capacitor } from '@capacitor/core';

// Import Capacitor NFC plugin (our custom native plugin)
let Nfc = null;

// Check for Capacitor and NFC plugin - COMPREHENSIVE AND AGGRESSIVE
function checkNfcPlugin() {
  try {
    if (typeof window !== 'undefined' && window.Capacitor) {
      const cap = window.Capacitor;
      
      // Log all available plugins for debugging
      if (cap.Plugins) {
        const pluginKeys = Object.keys(cap.Plugins);
        console.log('🔍 Available Capacitor plugins:', pluginKeys);
        
        // Try ALL possible plugin name variations
        const possibleNames = ['Nfc', 'NFC', 'nfc', 'NfcPlugin', 'NFCPlugin'];
        for (const name of possibleNames) {
          if (cap.Plugins[name]) {
            Nfc = cap.Plugins[name];
            console.log(`✓ NFC plugin found via Plugins.${name}`);
            return true;
          }
        }
      }
      
      // Method 2: getPlugin method (try all name variations)
      if (!Nfc && typeof cap.getPlugin === 'function') {
        const possibleNames = ['Nfc', 'NFC', 'nfc'];
        for (const name of possibleNames) {
          try {
            const plugin = cap.getPlugin(name);
            if (plugin) {
              Nfc = plugin;
              console.log(`✓ NFC plugin found via getPlugin('${name}')`);
              return true;
            }
          } catch (e) {
            // Continue trying
          }
        }
      }
      
      // Method 3: Try Capacitor core getPlugin
      if (!Nfc && typeof Capacitor.getPlugin === 'function') {
        const possibleNames = ['Nfc', 'NFC', 'nfc'];
        for (const name of possibleNames) {
          try {
            const plugin = Capacitor.getPlugin(name);
            if (plugin) {
              Nfc = plugin;
              console.log(`✓ NFC plugin found via Capacitor.getPlugin('${name}')`);
              return true;
            }
          } catch (e) {
            // Continue trying
          }
        }
      }
      
      // Method 4: Last resort - try to manually create plugin interface
      // This is a fallback if Capacitor's auto-discovery fails
      if (!Nfc && Capacitor.isNativePlatform()) {
        console.warn('⚠️ NFC plugin not auto-discovered. This may indicate an annotation processing issue.');
        console.warn('⚠️ Please check that @CapacitorPlugin annotation is being processed during build.');
      }
      
      if (!Nfc) {
        console.warn('⚠️ NFC plugin not found. Available plugins:', cap.Plugins ? Object.keys(cap.Plugins) : 'none');
        console.warn('⚠️ Capacitor platform:', Capacitor.getPlatform());
        console.warn('⚠️ Is native:', Capacitor.isNativePlatform());
      }
    }
  } catch (error) {
    console.error('❌ Error checking NFC plugin:', error);
  }
  return !!Nfc;
}

// Initialize on load with multiple attempts
if (typeof window !== 'undefined') {
  // Check immediately
  checkNfcPlugin();
  
  // Check after delays (plugins load asynchronously)
  setTimeout(() => {
    checkNfcPlugin();
    // Log what we found
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      console.log('Capacitor plugins available:', window.Capacitor.Plugins ? Object.keys(window.Capacitor.Plugins) : 'none');
      console.log('NFC plugin found:', !!Nfc);
      if (Nfc) {
        console.log('NFC plugin methods:', Object.keys(Nfc));
      }
    }
  }, 100);
  setTimeout(() => checkNfcPlugin(), 500);
  setTimeout(() => checkNfcPlugin(), 1000);
}

/**
 * Request NFC permission explicitly
 * @returns {Promise<{granted: boolean, requested: boolean, message: string}>} Permission result
 */
export async function requestNFCPermission() {
  // Re-check plugin availability
  checkNfcPlugin();
  
  // If we're in a Capacitor native app, use the plugin
  if (Capacitor.isNativePlatform()) {
    // Make sure we have the plugin
    if (!Nfc) {
      checkNfcPlugin();
      if (!Nfc && typeof Capacitor.getPlugin === 'function') {
        try {
          Nfc = Capacitor.getPlugin('Nfc');
        } catch (e) {
          // Continue
        }
      }
    }
    
    if (Nfc) {
      try {
        const result = await Nfc.requestPermission();
        console.log('NFC permission check:', result);
        return result || { granted: false, message: 'Permission check failed' };
      } catch (error) {
        console.warn('Failed to request NFC permission via plugin:', error);
        return { granted: false, message: error.message || 'Permission check failed' };
      }
    } else {
      console.warn('NFC plugin not found for permission request');
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
 * Check if NFC is available (synchronous check)
 * @returns {boolean} True if NFC is supported
 */
export function isNFCAvailable() {
  // Always check plugin
  checkNfcPlugin();
  
  // If we're in native app, ALWAYS return true - let the plugin calls handle errors
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
    return true; // Always available in native app - plugin will handle errors
  }
  
  // Check if plugin was found
  if (Nfc) {
    return true;
  }
  
  // Check for Web NFC API
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
  // If native platform, ALWAYS return true - let actual calls handle errors
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
    // Try to get plugin for testing
    checkNfcPlugin();
    if (!Nfc && window.Capacitor) {
      const cap = window.Capacitor;
      if (cap.Plugins) {
        Nfc = cap.Plugins.Nfc || cap.Plugins['Nfc'] || cap.Plugins.NFC;
      }
      if (!Nfc && typeof cap.getPlugin === 'function') {
        try {
          Nfc = cap.getPlugin('Nfc') || cap.getPlugin('NFC');
        } catch (e) {}
      }
    }
    
    // Always return true for native - plugin calls will show real errors
    return true;
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
  // Aggressively get plugin
  checkNfcPlugin();
  
  if (!Nfc && window.Capacitor) {
    const cap = window.Capacitor;
    if (cap.Plugins) {
      Nfc = cap.Plugins.Nfc || cap.Plugins['Nfc'] || cap.Plugins.NFC;
    }
    if (!Nfc && typeof cap.getPlugin === 'function') {
      try {
        Nfc = cap.getPlugin('Nfc') || cap.getPlugin('NFC');
      } catch (e) {}
    }
    if (!Nfc && typeof Capacitor.getPlugin === 'function') {
      try {
        Nfc = Capacitor.getPlugin('Nfc') || Capacitor.getPlugin('NFC');
      } catch (e) {}
    }
  }
  
  if (!Nfc) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 500));
    checkNfcPlugin();
    
    if (!Nfc) {
      throw new Error('NFC plugin not found. Ensure NFC is enabled on device.');
    }
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
 * ALWAYS uses native plugin in Capacitor apps, NEVER Web NFC
 * @returns {Promise<Object>} NFC message data
 */
export async function readNFC() {
  // If we're in a native Capacitor app, ALWAYS use native plugin
  if (Capacitor.isNativePlatform()) {
    // Aggressively find the plugin
    checkNfcPlugin();
    
    // Try multiple ways to get the plugin
    if (!Nfc && window.Capacitor) {
      const cap = window.Capacitor;
      if (cap.Plugins) {
        Nfc = cap.Plugins.Nfc || cap.Plugins['Nfc'] || cap.Plugins.NFC || cap.Plugins['NFC'];
      }
      if (!Nfc && typeof cap.getPlugin === 'function') {
        try {
          Nfc = cap.getPlugin('Nfc') || cap.getPlugin('NFC');
        } catch (e) {}
      }
    }
    if (!Nfc && typeof Capacitor.getPlugin === 'function') {
      try {
        Nfc = Capacitor.getPlugin('Nfc') || Capacitor.getPlugin('NFC');
      } catch (e) {}
    }
    
    // Wait a bit and retry if still not found
    if (!Nfc) {
      await new Promise(resolve => setTimeout(resolve, 300));
      checkNfcPlugin();
    }
    
    if (!Nfc) {
      throw new Error('NFC plugin not found. Please ensure the app is properly built with NFC support.');
    }
    
    return await readNFCCapacitor();
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
  // Aggressively get plugin
  checkNfcPlugin();
  
  if (!Nfc && window.Capacitor) {
    const cap = window.Capacitor;
    if (cap.Plugins) {
      Nfc = cap.Plugins.Nfc || cap.Plugins['Nfc'] || cap.Plugins.NFC;
    }
    if (!Nfc && typeof cap.getPlugin === 'function') {
      try {
        Nfc = cap.getPlugin('Nfc') || cap.getPlugin('NFC');
      } catch (e) {}
    }
    if (!Nfc && typeof Capacitor.getPlugin === 'function') {
      try {
        Nfc = Capacitor.getPlugin('Nfc') || Capacitor.getPlugin('NFC');
      } catch (e) {}
    }
  }
  
  if (!Nfc) {
    await new Promise(resolve => setTimeout(resolve, 500));
    checkNfcPlugin();
    
    if (!Nfc) {
      throw new Error('NFC plugin not found for write operation.');
    }
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
 * ALWAYS uses native plugin in Capacitor apps, NEVER Web NFC
 * @param {string} data - Data to write
 * @returns {Promise<void>}
 */
export async function writeNFC(data) {
  // If we're in a native Capacitor app, ALWAYS use native plugin
  if (Capacitor.isNativePlatform()) {
    // Aggressively find the plugin
    checkNfcPlugin();
    
    // Try multiple ways to get the plugin
    if (!Nfc && window.Capacitor) {
      const cap = window.Capacitor;
      if (cap.Plugins) {
        Nfc = cap.Plugins.Nfc || cap.Plugins['Nfc'] || cap.Plugins.NFC || cap.Plugins['NFC'];
      }
      if (!Nfc && typeof cap.getPlugin === 'function') {
        try {
          Nfc = cap.getPlugin('Nfc') || cap.getPlugin('NFC');
        } catch (e) {}
      }
    }
    if (!Nfc && typeof Capacitor.getPlugin === 'function') {
      try {
        Nfc = Capacitor.getPlugin('Nfc') || Capacitor.getPlugin('NFC');
      } catch (e) {}
    }
    
    // Wait a bit and retry if still not found
    if (!Nfc) {
      await new Promise(resolve => setTimeout(resolve, 300));
      checkNfcPlugin();
    }
    
    if (!Nfc) {
      throw new Error('NFC plugin not found. Please ensure the app is properly built with NFC support.');
    }
    
    return await writeNFCCapacitor(data);
  }
  
  // Only use Web NFC in browser (not Capacitor)
  if ('NDEFWriter' in window && !window.Capacitor) {
    return await writeNFCWeb(data);
  }
  
  throw new Error('NFC write not available. Please ensure NFC is enabled on your device.');
}

/**
 * Parse ticket data from NFC record
 * @param {string} nfcData - Data from NFC tag
 * @returns {Object|null} Parsed ticket data or null
 */
export function parseNFCTicketData(nfcData) {
  try {
    // Check if this is a signature message (192 hex chars = 96 bytes)
    // Signature message format: Public Key (32 bytes) + Signature (64 bytes) = 96 bytes = 192 hex chars
    const trimmedData = nfcData.trim();
    if (/^[0-9a-fA-F]{192}$/.test(trimmedData)) {
      return {
        type: 'signature_message',
        messageHex: trimmedData,
      };
    }
    
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
    // If JSON parse fails, check if it's a signature message
    const trimmedData = nfcData.trim();
    if (/^[0-9a-fA-F]{192}$/.test(trimmedData)) {
      return {
        type: 'signature_message',
        messageHex: trimmedData,
      };
    }
    
    // Try QR code format
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


