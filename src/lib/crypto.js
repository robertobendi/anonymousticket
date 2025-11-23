/**
 * Cryptographic functions for ticket system
 * Uses Ed25519 cryptography (not ECDSA) for authentication
 * Generates key pairs, signs payloads, and manages private key storage
 */

import * as nacl from 'tweetnacl';
import { Capacitor } from '@capacitor/core';

const PRIVATE_KEY_STORAGE_KEY = 'ticket_private_keys';

// Both Android and Web use the same proxy endpoint
// The proxy server (running on dev machine) forwards to blockchain server
const API_BASE_URL = '/api';

/**
 * Generate Ed25519 key pair
 * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array, keyPair: nacl.SignKeyPair}>}
 */
export async function generateKeyPair() {
  try {
    // Generate Ed25519 key pair using tweetnacl
    const keyPair = nacl.sign.keyPair();
    
    console.log('✅ Ed25519 key pair generated');
    console.log('📝 Public key length:', keyPair.publicKey.length, 'bytes (32 bytes = 64 hex chars)');
    console.log('📝 Private key length:', keyPair.secretKey.length, 'bytes (64 bytes)');
    
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.secretKey,
      keyPair: keyPair,
    };
  } catch (error) {
    console.error('❌ Error generating key pair:', error);
    throw new Error('Failed to generate key pair: ' + error.message);
  }
}

/**
 * Export public key to hex string (Ed25519 format)
 * Format: 32 bytes = 64 hex chars
 * @param {Uint8Array} publicKey - Public key to export
 * @returns {string} Hex string representation
 */
export function exportPublicKeyToHex(publicKey) {
  try {
    if (!(publicKey instanceof Uint8Array)) {
      throw new Error('Public key must be Uint8Array');
    }
    
    if (publicKey.length !== 32) {
      console.warn('⚠️ Public key length unexpected:', publicKey.length, 'bytes (expected 32)');
    }
    
    const hex = Array.from(publicKey)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('✅ Public key exported (64 hex chars):', hex.substring(0, 16) + '...');
    return hex;
  } catch (error) {
    console.error('❌ Error exporting public key:', error);
    throw new Error('Failed to export public key: ' + error.message);
  }
}

/**
 * Export private key to base64 for storage
 * @param {Uint8Array} privateKey - Private key to export
 * @returns {string} Base64 string
 */
export function exportPrivateKeyToBase64(privateKey) {
  try {
    if (!(privateKey instanceof Uint8Array)) {
      throw new Error('Private key must be Uint8Array');
    }
    
    // Convert Uint8Array to base64
    const binary = String.fromCharCode.apply(null, Array.from(privateKey));
    return btoa(binary);
  } catch (error) {
    console.error('❌ Error exporting private key:', error);
    throw new Error('Failed to export private key: ' + error.message);
  }
}

/**
 * Import private key from base64
 * @param {string} base64 - Base64 string
 * @returns {Uint8Array} Private key
 */
export function importPrivateKeyFromBase64(base64) {
  try {
    // Convert base64 to Uint8Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('❌ Error importing private key:', error);
    throw new Error('Failed to import private key: ' + error.message);
  }
}

/**
 * Sign a payload with private key (Ed25519)
 * Process: JSON.stringify(payload) -> Sign with Private Key -> Convert to Hex
 * @param {Uint8Array} privateKey - Private key to sign with (64 bytes secretKey from nacl)
 * @param {Object} payload - Payload object to sign
 * @returns {string} Hex string signature (128 hex chars = 64 bytes)
 */
export function signPayload(privateKey, payload) {
  try {
    if (!(privateKey instanceof Uint8Array)) {
      throw new Error('Private key must be Uint8Array');
    }
    
    // Step 1: Convert payload object to JSON string (exactly as guide says)
    const payloadString = JSON.stringify(payload);
    console.log('📝 Payload JSON string to sign:', payloadString);
    
    // Step 2: Convert JSON string to Uint8Array for signing
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);
    
    // Step 3: Sign the data using Ed25519
    // nacl.sign expects the message and returns signature + message
    // We only want the signature, so we use nacl.sign.detached
    const signature = nacl.sign.detached(data, privateKey);
    
    console.log('📝 Signature bytes length:', signature.length, 'bytes (64 bytes = 128 hex chars)');
    
    // Step 4: Convert signature Uint8Array to Hex string
    const hex = Array.from(signature)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Verify signature length
    if (hex.length !== 128) {
      console.error('❌ ERROR: Signature length is', hex.length, 'but should be 128 hex characters!');
      throw new Error(`Invalid signature length: ${hex.length} (expected 128)`);
    }
    
    console.log('✅ Signature (hex, 128 chars):', hex);
    console.log('✅ Signature length:', hex.length, 'hex characters (should be 128)');
    console.log('✅ Signature first 32 chars:', hex.substring(0, 32));
    console.log('✅ Signature last 32 chars:', hex.substring(96));
    return hex;
  } catch (error) {
    console.error('❌ Error signing payload:', error);
    throw new Error('Failed to sign payload: ' + error.message);
  }
}

/**
 * Verify a signature with public key (Ed25519)
 * @param {Uint8Array} publicKey - Public key to verify with
 * @param {Object} payload - Payload object that was signed
 * @param {string} signatureHex - Signature hex string
 * @returns {boolean} True if signature is valid
 */
export function verifySignature(publicKey, payload, signatureHex) {
  try {
    // Convert payload to JSON string
    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);
    
    // Convert signature hex to Uint8Array
    const signature = new Uint8Array(signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    // Verify signature
    const isValid = nacl.sign.detached.verify(data, signature, publicKey);
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
}

/**
 * Store private key in localStorage
 * @param {string} ticketId - Ticket ID (public key hex)
 * @param {Uint8Array} privateKey - Private key to store
 */
export function storePrivateKey(ticketId, privateKey) {
  try {
    const base64 = exportPrivateKeyToBase64(privateKey);
    const keys = getStoredPrivateKeys();
    keys[ticketId] = base64;
    localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(keys));
    console.log('✅ Private key stored for ticket:', ticketId.substring(0, 16) + '...');
  } catch (error) {
    console.error('❌ Error storing private key:', error);
    throw error;
  }
}

/**
 * Get stored private key by ticket ID
 * @param {string} ticketId - Ticket ID (public key hex)
 * @returns {Uint8Array|null} Private key or null if not found
 */
export function getStoredPrivateKey(ticketId) {
  try {
    const keys = getStoredPrivateKeys();
    const base64 = keys[ticketId];
    if (!base64) {
      return null;
    }
    return importPrivateKeyFromBase64(base64);
  } catch (error) {
    console.error('❌ Error getting stored private key:', error);
    return null;
  }
}

/**
 * Get all stored private keys from localStorage
 * @returns {Object} Object mapping ticketId to base64 string
 */
function getStoredPrivateKeys() {
  try {
    const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Error reading stored private keys:', error);
    return {};
  }
}

/**
 * Generate key pair and store private key
 * @returns {Promise<{publicKeyHex: string, privateKey: Uint8Array, publicKey: Uint8Array}>}
 */
export async function generateAndStoreKeyPair() {
  try {
    const keyPair = await generateKeyPair();
    const publicKeyHex = exportPublicKeyToHex(keyPair.publicKey);
    
    // Store private key
    storePrivateKey(publicKeyHex, keyPair.privateKey);
    
    return {
      publicKeyHex,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    };
  } catch (error) {
    console.error('❌ Error generating and storing key pair:', error);
    throw error;
  }
}

/**
 * Import public key from hex string
 * @param {string} hex - Hex string (64 hex chars = 32 bytes)
 * @returns {Uint8Array} Public key
 */
export function importPublicKeyFromHex(hex) {
  try {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    if (bytes.length !== 32) {
      throw new Error(`Invalid public key length: ${bytes.length} bytes (expected 32)`);
    }
    return bytes;
  } catch (error) {
    console.error('❌ Error importing public key:', error);
    throw new Error('Failed to import public key: ' + error.message);
  }
}

/**
 * Submit MINT transaction to blockchain API
 * @param {Object} params - Transaction parameters
 * @param {string} params.ticketId - Public key hex (ticket ID, 64 hex chars)
 * @param {Object} params.payload - Payload object
 * @param {string} params.signature - Signature hex string (128 hex chars)
 * @returns {Promise<Object>} API response
 */
export async function submitMintTransaction({ ticketId, payload, signature }) {
  try {
    const transaction = {
      type: 'MINT',
      ticketId: ticketId,
      payload: payload,
      signature: signature,
    };
    
    console.log('📤 Submitting MINT transaction:', {
      type: transaction.type,
      ticketId: ticketId.substring(0, 16) + '...',
      ticketIdLength: ticketId.length,
      payload,
      signatureLength: signature.length,
      signature: signature, // Full signature
    });
    
    const transactionJson = JSON.stringify(transaction);
    console.log('📤 Full transaction JSON:', transactionJson);
    console.log('📤 Payload being signed:', JSON.stringify(payload));
    
    // Use the same XMLHttpRequest approach for both Android and Web
    const submitUrl = `${API_BASE_URL}/submit`;
    console.log('📤 Submitting to URL:', submitUrl);
    
    // Use XMLHttpRequest - works the same on both Android and Web
    const response = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      try {
        xhr.open('POST', submitUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
      } catch (openError) {
        const errorMsg = `Failed to open request: ${openError?.message || String(openError)}`;
        console.error('❌ XHR open error:', errorMsg);
        reject(new Error(errorMsg));
        return;
      }
      
      xhr.onload = function() {
        const responseText = xhr.responseText || '';
        const status = xhr.status || 0;
        console.log(`📥 Response status: ${status}`);
        console.log(`📥 Response text length: ${responseText.length}`);
        console.log(`📥 Response text (first 500 chars):`, responseText.substring(0, 500));
        
        if (status >= 200 && status < 300) {
          // Check if we got HTML instead of JSON (proxy not working)
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            console.error('❌ Received HTML instead of JSON. Response:', responseText.substring(0, 200));
            reject(new Error('Server returned HTML instead of JSON. Proxy may not be working.'));
            return;
          }
          
          try {
            const json = JSON.parse(responseText);
            resolve({
              ok: true,
              status: status,
              json: async () => json,
              text: async () => responseText,
            });
          } catch (e) {
            console.error('❌ Failed to parse JSON. Response:', responseText.substring(0, 200));
            reject(new Error('Failed to parse JSON response: ' + (e?.message || String(e))));
          }
        } else {
          // Even on error, try to parse JSON to get error message
          let errorMessage = `HTTP error! status: ${status}`;
          try {
            if (responseText) {
              const errorJson = JSON.parse(responseText);
              errorMessage += `, message: ${JSON.stringify(errorJson)}`;
            } else {
              errorMessage += `, empty response body`;
            }
          } catch (e) {
            errorMessage += `, response: ${responseText.substring(0, 200)}`;
          }
          console.error('❌ Submit failed:', errorMessage);
          reject(new Error(errorMessage));
        }
      };
      
      xhr.onerror = function(event) {
        const errorMsg = `Network error: Failed to connect to ${submitUrl}. This could be a CORS issue, network problem, or the server is unreachable. Status: ${xhr.status || 'unknown'}, ReadyState: ${xhr.readyState}`;
        console.error('❌ XHR onerror:', errorMsg, {
          status: xhr.status,
          readyState: xhr.readyState,
          responseText: xhr.responseText?.substring(0, 200),
          event: event
        });
        reject(new Error(errorMsg));
      };
      
      xhr.ontimeout = function() {
        const errorMsg = `Request timeout: Server did not respond within 30 seconds.`;
        console.error('❌ XHR timeout:', errorMsg);
        reject(new Error(errorMsg));
      };
      
      xhr.onabort = function() {
        const errorMsg = `Request aborted: The request was cancelled.`;
        console.error('❌ XHR aborted:', errorMsg);
        reject(new Error(errorMsg));
      };
      
      xhr.timeout = 30000; // 30 seconds
      
      try {
        xhr.send(JSON.stringify(transaction));
      } catch (sendError) {
        const errorMsg = `Failed to send request: ${sendError?.message || String(sendError)}`;
        console.error('❌ XHR send error:', errorMsg);
        reject(new Error(errorMsg));
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ MINT transaction submitted successfully:', data);
    return data;
  } catch (error) {
    // Ensure error has a message
    const errorMessage = error?.message || error?.toString() || String(error) || 'Unknown error occurred';
    console.error('❌ Error submitting MINT transaction:', {
      message: errorMessage,
      error: error,
      stack: error?.stack
    });
    // Throw a new error with a guaranteed message
    throw new Error(errorMessage);
  }
}
