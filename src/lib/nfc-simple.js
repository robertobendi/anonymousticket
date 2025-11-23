/**
 * Simple NFC - Clean event-based approach
 * 
 * ARCHITECTURE:
 * - Sharing: Uses HCE (Host Card Emulation) - phone acts as NFC card
 * - Receiving: Uses NFC Reader Mode - actively polls for cards
 * 
 * This is the simplest and most reliable approach for phone-to-phone NFC.
 */

import { Capacitor } from '@capacitor/core';

const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Check if NFC is available
 */
export async function checkNFC() {
  if (!isAndroid || !window.NFC) {
    return { available: false, enabled: false };
  }

  try {
    const result = JSON.parse(window.NFC.isNfcEnabled());
    return {
      available: result.available === true,
      enabled: result.enabled === true
    };
  } catch (error) {
    return { available: false, enabled: false };
  }
}

// Global listener that stays active
let globalNfcListener = null;
let activeResolvers = [];
let isListenerInitialized = false;

// Direct callback function - called from Java
// This is more reliable than CustomEvent
if (typeof window !== 'undefined' && window.NFC) {
  // Expose callback function for Java to call directly
  window.NFC.onDataReceived = function(tagId, data) {
    console.log('🔔🔔🔔 DIRECT CALLBACK TRIGGERED! 🔔🔔🔔');
    console.log('🔔🔔🔔 DIRECT CALLBACK TRIGGERED! 🔔🔔🔔');
    console.log('🔔🔔🔔 DIRECT CALLBACK TRIGGERED! 🔔🔔🔔');
    console.log('Tag ID:', tagId);
    console.log('Data:', data);
    console.log('Data length:', data?.length || 0);
    console.log('Active resolvers:', activeResolvers.length);
    
    // Resolve all active promises
    if (data !== undefined && data !== null) {
      const nfcData = { id: tagId, data: data };
      
      const resolvers = [...activeResolvers];
      activeResolvers = [];
      
      console.log('✅✅✅ RESOLVING ' + resolvers.length + ' PROMISE(S) ✅✅✅');
      console.log('Data preview:', data.substring(0, 200));
      
      resolvers.forEach(({ id, resolve }) => {
        try {
          console.log('Resolving promise #' + id);
          resolve(nfcData);
          console.log('✅ Promise #' + id + ' resolved');
        } catch (e) {
          console.error('❌ Error resolving promise #' + id + ':', e);
        }
      });
    }
  };
  
  console.log('✅✅✅ DIRECT CALLBACK REGISTERED ✅✅✅');
  console.log('window.NFC.onDataReceived is now available');
}

/**
 * Initialize global NFC listener once
 * EXPORTED so it can be called explicitly
 * MUST be called before startReading()
 */
export function initializeGlobalNfcListener() {
  if (isListenerInitialized) {
    console.log('⚠️ Global listener already initialized, skipping...');
    return;
  }
  
  console.log('🔧🔧🔧 INITIALIZING GLOBAL NFC LISTENER 🔧🔧🔧');
  console.log('Window:', typeof window);
  console.log('Window.addEventListener:', typeof window.addEventListener);
  console.log('Current active resolvers:', activeResolvers.length);
  
  globalNfcListener = (event) => {
    // FORCE multiple console.log to ensure visibility in debug panel
    console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
    console.log('🔔🔔🔔 GLOBAL LISTENER TRIGGERED! 🔔🔔🔔');
    console.log('🔔🔔🔔 GLOBAL LISTENER TRIGGERED! 🔔🔔🔔');
    console.log('🔔🔔🔔 GLOBAL LISTENER TRIGGERED! 🔔🔔🔔');
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('Event type:', event.type);
    console.log('Event detail:', JSON.stringify(event.detail, null, 2));
    console.log('Event detail type:', typeof event.detail);
    console.log('Active resolvers waiting:', activeResolvers.length);
    
    const tagId = event.detail?.id || '';
    const tagData = event.detail?.data || '';

    console.log('📱📱📱 NFC DATA IN LISTENER 📱📱📱');
    console.log('Tag ID:', tagId.substring(0, 20));
    console.log('Data Length:', tagData?.length || 0);
    console.log('Data Preview:', tagData?.substring(0, 100));
    console.log('Has Data:', tagData !== undefined && tagData !== null);
    console.log('Data Type:', typeof tagData);
    console.log('Is Empty:', tagData === '');

    // ACCEPT ANY DATA - even empty string
    if (tagData !== undefined && tagData !== null) {
      const data = { id: tagId, data: tagData };
      
      // Resolve all active promises
      const resolvers = [...activeResolvers];
      activeResolvers = [];
      
      console.log('✅✅✅ RESOLVING PROMISES ✅✅✅');
      console.log('Number of promises:', resolvers.length);
      console.log('Data preview:', tagData.substring(0, 200));
      console.log('Full data:', tagData);
      
      resolvers.forEach(({ id, resolve }) => {
        try {
          console.log('Resolving promise #' + id);
          resolve(data);
          console.log('✅ Promise #' + id + ' resolved');
        } catch (e) {
          console.error('❌ Error resolving promise #' + id + ':', e);
        }
      });
      
      console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
    } else {
      console.log('⚠️ Event received but tagData is null/undefined');
      console.log('Tag ID only:', tagId);
    }
  };
  
  try {
    window.addEventListener('nfctag', globalNfcListener);
    isListenerInitialized = true;
    console.log('✅✅✅ GLOBAL LISTENER REGISTERED AND ACTIVE ✅✅✅');
    console.log('Listener will stay active until page unload');
    
    // Also listen for any window events to verify the listener is working
    window.addEventListener('test-nfc', (e) => {
      console.log('🧪 Test event received:', e);
    });
    
    // Test: dispatch a test event to verify listener works
    setTimeout(() => {
      console.log('🧪 Dispatching test event...');
      window.dispatchEvent(new CustomEvent('test-nfc', { detail: { test: true } }));
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error registering global listener:', error);
    console.error('Error stack:', error.stack);
  }
}

/**
 * Start reading NFC tags/cards
 * Matches the working pattern from documentation, adapted for single tickets
 */
export async function startReading() {
  if (!isAndroid || !window.NFC) {
    throw new Error('NFC not available on this platform');
  }
  // Enable scanning on native side - keep it active
  try {
    window.NFC.enableScan();
    console.log('✓ NFC scanning enabled - listening for ticket data...');
    console.log('Hold device near NFC tag or phone with ticket beacon active');
  } catch (error) {
    console.error('Error enabling NFC scan:', error);
    throw error;
  }
  // Return promise that resolves when NFC event is received
  // Matches working pattern: check for ticket data (was "wallet" before)
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
      // Check if this is ticket data (adapted from wallet pattern)
      // Look for ticket identifiers: "ticket", "ticketId", or "id"
      if (tagData && (tagData.includes('"ticket"') || tagData.includes('"ticketId"') || tagData.includes('"id"'))) {
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
        console.log('✓✓✓ Ticket data received! ✓✓✓');
        resolve({
          id: tagId,
          data: tagData
        });
      } else if (tagData && tagData.length > 0) {
        // Got some data but not ticket - log it and keep listening
        console.log(`Attempt ${attempts}: Got data but not ticket format, continuing...`);
        
        if (attempts >= maxAttempts) {
          // After max attempts, reject if no ticket data
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
            reject(new Error(`No ticket data received after ${maxAttempts} attempts. Make sure: 1) Sending phone clicked "Validate" on a ticket, 2) Both phones unlocked, 3) Hold phones back-to-back.`));
          }
        }
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
      reject(new Error('NFC read timeout. Make sure: 1) Sending phone clicked "Validate" on a ticket, 2) Both phones unlocked, 3) Hold phones back-to-back.'));
    }, 90000);
  });
}

/**
 * Start beacon mode (HCE) - Phone acts as NFC card
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
    window.NFC.stopBeacon();
    console.log('✅ Beacon stopped');
  } catch (e) {
    console.warn('Error stopping beacon:', e);
  }
}

/**
 * Request NFC permission (handled automatically by Android)
 */
export async function requestNFCPermission() {
  return true;
}
