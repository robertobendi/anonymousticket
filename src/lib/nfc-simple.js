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
 * SIMPLE: Uses global listener that stays active
 */
export async function startReading() {
  if (!isAndroid || !window.NFC) {
    throw new Error('NFC not available on this platform');
  }

  // Ensure global listener is initialized
  if (!isListenerInitialized) {
    initializeGlobalNfcListener();
  }

  // Enable scanning
  try {
    window.NFC.enableScan();
    console.log('✅ NFC enableScan() called');
  } catch (error) {
    console.error('Error enabling scan:', error);
    // Continue anyway
  }

  // Return promise that resolves when data arrives via global listener
  return new Promise((resolve, reject) => {
    const resolverId = Date.now() + Math.random(); // Unique ID for this resolver
    activeResolvers.push({ id: resolverId, resolve });
    console.log(`📋 Added resolver #${resolverId}, total: ${activeResolvers.length}`);

    // Timeout after 2 seconds - short for fast retries
    setTimeout(() => {
      const index = activeResolvers.findIndex(r => r.id === resolverId);
      if (index > -1) {
        activeResolvers.splice(index, 1);
        console.log(`⏱️ Timeout for resolver #${resolverId}, remaining: ${activeResolvers.length}`);
        reject(new Error('Timeout - no data received'));
      }
    }, 2000);
  });
}

/**
 * Start beacon mode (HCE) - Phone acts as NFC card
 * SIMPLE: Just set the data and activate HCE
 */
export async function startBeacon(data) {
  if (!isAndroid || !window.NFC) {
    throw new Error('NFC not available on this platform');
  }

  if (!data || data.length === 0) {
    throw new Error('Data is required');
  }

  console.log('🚀 Starting beacon with data:', data.substring(0, 100));

  try {
    const result = window.NFC.startBeacon(data);
    console.log('📤 startBeacon() result:', result);
    
    const parsed = JSON.parse(result);
    
    if (!parsed.success) {
      throw new Error(parsed.error || 'Failed to start beacon');
    }
    
    console.log('✅✅✅ HCE BEACON ACTIVE - Data set:', data.substring(0, 100));
    return { success: true, message: parsed.message };
  } catch (error) {
    console.error('❌ Error starting beacon:', error);
    throw new Error('Failed to start beacon: ' + error.message);
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
