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
 */
export async function startReading() {
  if (!isAndroid || !window.NFC) {
    throw new Error('NFC not available on this platform');
  }

  // Enable scanning on native side
  try {
    window.NFC.enableScan();
  } catch (error) {
    console.error('Error enabling NFC scan:', error);
  }

  // Return promise that resolves when NFC event is received
  return new Promise((resolve, reject) => {
    let resolved = false;

    const handler = (event) => {
      if (resolved) return;
      resolved = true;

      window.removeEventListener('nfctag', handler);

      const tagId = event.detail?.id || '';
      const tagData = event.detail?.data || '';

      console.log('NFC tag detected:', { id: tagId, data: tagData });

      // Disable scanning
      try {
        if (window.NFC) {
          window.NFC.disableScan();
        }
      } catch (e) {
        // Ignore
      }

      resolve({
        id: tagId,
        data: tagData
      });
    };

    window.addEventListener('nfctag', handler);

    // Timeout after 30 seconds
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

      reject(new Error('NFC read timeout. Hold device near tag and try again.'));
    }, 30000);
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

      reject(new Error('NFC write timeout. Hold device near another device or NFC tag and try again.'));
    }, 60000);
  });
}
