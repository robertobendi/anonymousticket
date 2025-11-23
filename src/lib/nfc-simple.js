/**
 * Simple NFC - Event-based approach
 * Native Android handles everything, JavaScript just listens for events
 */

import { Capacitor } from '@capacitor/core';

// Check if we're on Android
const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Check if NFC is available
 */
export async function checkNFC() {
  if (!isAndroid || !window.NFC) {
    return {
      available: false,
      enabled: false
    };
  }

  try {
    const result = JSON.parse(window.NFC.isNfcEnabled());
    return {
      available: result.available === true,
      enabled: result.enabled === true
    };
  } catch (error) {
    return {
      available: false,
      enabled: false
    };
  }
}

/**
 * Start listening for NFC tags
 * Returns a promise that resolves when a tag is detected
 * For device-to-device: Keep scanning active until wallet data is received
 */
export async function startReading() {
  if (!isAndroid || !window.NFC) {
    throw new Error('NFC not available on this platform');
  }

  // Enable scanning on native side - keep it active
  try {
    window.NFC.enableScan();
    console.log('✓ NFC scanning enabled - listening for wallet data...');
    console.log('Hold device near NFC tag or phone with beacon active');
  } catch (error) {
    console.error('Error enabling NFC scan:', error);
    throw error;
  }

  // Return promise that resolves when NFC event is received
  return new Promise((resolve, reject) => {
    let resolved = false;
    let attempts = 0;
    const maxAttempts = 10; // Allow more attempts for beacon mode

    const handler = (event) => {
      const tagId = event.detail?.id || '';
      const tagData = event.detail?.data || '';

      attempts++;
      console.log(`NFC read attempt ${attempts}:`, { 
        id: tagId, 
        dataLength: tagData?.length || 0,
        preview: tagData?.substring(0, 100) + '...' 
      });

      // Emit detection event for ANY NFC detection (even if not expected format)
      if (tagId || tagData) {
        const detectionEvent = new CustomEvent('nfcdetection', {
          detail: {
            attempt: attempts,
            tagId: tagId,
            dataLength: tagData?.length || 0,
            dataPreview: tagData?.substring(0, 100) || '',
            hasData: !!(tagData && tagData.length > 0)
          }
        });
        window.dispatchEvent(detectionEvent);
      }

      // Check if this is wallet data or signature message
      const trimmedData = tagData?.trim() || '';
      const isWalletJson = trimmedData.includes('"wallet"') || trimmedData.includes('"tickets"');
      const isSignatureMessage = /^[0-9a-fA-F]{192}$/.test(trimmedData); // 192 hex chars = signature message
      
      if (tagData && (isWalletJson || isSignatureMessage)) {
        if (resolved) return;
        resolved = true;

        window.removeEventListener('nfctag', handler);

        // Disable scanning
        try {
          if (window.NFC) {
            window.NFC.disableScan();
          }
        } catch (e) {
          // Ignore
        }

        if (isSignatureMessage) {
          console.log('✓✓✓ Signature message received via HCE! ✓✓✓');
        } else {
          console.log('✓✓✓ Wallet data received! ✓✓✓');
        }
        resolve({
          id: tagId,
          data: tagData
        });
      } else if (tagData && tagData.length > 0) {
        // Got some data but not wallet - log it and keep listening
        console.log(`Attempt ${attempts}: Got data but not wallet format, continuing...`);
        console.log(`Detected data (${tagData.length} chars):`, tagData.substring(0, 200));
        
        if (attempts >= maxAttempts) {
          // After max attempts, reject if no wallet data
          if (!resolved) {
            resolved = true;
            window.removeEventListener('nfctag', handler);
            try {
              if (window.NFC) {
                window.NFC.disableScan();
              }
            } catch (e) {
              // Ignore
            }
            reject(new Error(`No wallet data received after ${maxAttempts} attempts. Detected ${tagData.length} chars of data but not in expected format. Make sure: 1) Sending phone clicked "Validate", 2) Both phones unlocked, 3) Hold phones back-to-back.`));
          }
        }
      } else if (tagId) {
        // Tag detected but no data - still show feedback
        console.log(`Attempt ${attempts}: NFC tag detected (ID: ${tagId.substring(0, 16)}...) but no readable data`);
      } else {
        // No data yet, keep listening
        console.log(`Attempt ${attempts}: No data yet, continuing to listen...`);
      }
    };

    window.addEventListener('nfctag', handler);

    // Timeout after 90 seconds (longer for beacon mode)
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('nfctag', handler);

      // Disable scanning
      try {
        if (window.NFC) {
          window.NFC.disableScan();
        }
      } catch (e) {
        // Ignore
      }

      reject(new Error('NFC read timeout. Make sure: 1) Sending phone clicked "Start Beacon", 2) Both phones unlocked, 3) Hold phones back-to-back, 4) Try "Write to Tag" mode with a physical NFC tag.'));
    }, 90000);
  });
}

/**
 * Request NFC permission (handled natively, this is just for compatibility)
 */
export async function requestNFCPermission() {
  // Permission is handled automatically by Android
  return true;
}

/**
 * Write data to NFC tag or share via NFC
 * For device-to-device: One phone calls this, other phone scans
 * For tags: Write wallet data to a physical NFC tag
 */
export async function writeNFC(data) {
  if (!isAndroid || !window.NFC) {
    throw new Error('NFC not available on this platform');
  }

  if (!data || data.length === 0) {
    throw new Error('Data is required');
  }

  // Start write mode
  try {
    const result = JSON.parse(window.NFC.startWrite(data));
    if (!result.success) {
      throw new Error(result.error || 'Failed to start NFC write');
    }
    console.log('NFC write mode enabled:', result.message);
  } catch (error) {
    console.error('Error starting NFC write:', error);
    throw new Error('Failed to start NFC write: ' + error.message);
  }

  // Return promise that resolves when write completes
  return new Promise((resolve, reject) => {
    let resolved = false;

    const handler = (event) => {
      if (resolved) return;
      resolved = true;

      window.removeEventListener('nfcwrite', handler);

      const success = event.detail?.success === true;
      const message = event.detail?.message || '';

      console.log('NFC write result:', { success, message });

      // Cancel write mode
      try {
        if (window.NFC) {
          window.NFC.cancelWrite();
        }
      } catch (e) {
        // Ignore
      }

      if (success) {
        resolve({ success: true, message });
      } else {
        reject(new Error(message || 'NFC write failed'));
      }
    };

    window.addEventListener('nfcwrite', handler);

    // Timeout after 60 seconds
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('nfcwrite', handler);

      // Cancel write mode
      try {
        if (window.NFC) {
          window.NFC.cancelWrite();
        }
      } catch (e) {
        // Ignore
      }

      reject(new Error('NFC write timeout. Hold device near an NFC tag or another device and try again.'));
    }, 60000);
  });
}

/**
 * Start beacon mode - phone acts like an NFC tag
 * Controller can scan this phone to read wallet data
 * More reliable than device-to-device writing
 * 
 * NOTE: This doesn't wait for actual P2P exchange - it just enables the mode
 * The success message means "ready to share", not "shared successfully"
 */
export async function startBeacon(data) {
  if (!isAndroid || !window.NFC) {
    throw new Error('NFC not available on this platform');
  }

  if (!data || data.length === 0) {
    throw new Error('Data is required');
  }

  try {
    const result = JSON.parse(window.NFC.startBeacon(data));
    if (!result.success) {
      throw new Error(result.error || 'Failed to start NFC beacon');
    }
    console.log('NFC beacon mode enabled:', result.message);
    console.log('⚠️ Beacon is ACTIVE - waiting for controller to scan...');
    console.log('⚠️ This does NOT mean data was sent - it means phone is ready to share');
    return { success: true, message: result.message };
  } catch (error) {
    console.error('Error starting NFC beacon:', error);
    throw new Error('Failed to start NFC beacon: ' + error.message);
  }
}

/**
 * Stop beacon mode
 */
export async function stopBeacon() {
  if (!isAndroid || !window.NFC) {
    return;
  }
  try {
    window.NFC.cancelWrite();
  } catch (e) {
    // Ignore
  }
}
