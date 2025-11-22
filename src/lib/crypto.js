/**
 * Cryptographic functions for ticket system
 * Generates key pairs, signs payloads, and manages private key storage
 */

const PRIVATE_KEY_STORAGE_KEY = 'ticket_private_keys';
// ZERO SECURITY - Use proxy endpoint (Apache rewrites to blockchain API)
const API_BASE_URL = '/api';

/**
 * Generate ECDSA P-256 key pair
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 */
export async function generateKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true, // extractable
      ['sign', 'verify']
    );
    
    return keyPair;
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate key pair: ' + error.message);
  }
}

/**
 * Export public key to hex string
 * @param {CryptoKey} publicKey - Public key to export
 * @returns {Promise<string>} Hex string representation
 */
export async function exportPublicKeyToHex(publicKey) {
  try {
    const exported = await window.crypto.subtle.exportKey('raw', publicKey);
    const hex = Array.from(new Uint8Array(exported))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hex;
  } catch (error) {
    console.error('Error exporting public key:', error);
    throw new Error('Failed to export public key: ' + error.message);
  }
}

/**
 * Export private key to JWK format for storage
 * @param {CryptoKey} privateKey - Private key to export
 * @returns {Promise<Object>} JWK object
 */
export async function exportPrivateKeyToJWK(privateKey) {
  try {
    const exported = await window.crypto.subtle.exportKey('jwk', privateKey);
    return exported;
  } catch (error) {
    console.error('Error exporting private key:', error);
    throw new Error('Failed to export private key: ' + error.message);
  }
}

/**
 * Import private key from JWK format
 * @param {Object} jwk - JWK object
 * @returns {Promise<CryptoKey>} Private key
 */
export async function importPrivateKeyFromJWK(jwk) {
  try {
    const key = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign']
    );
    return key;
  } catch (error) {
    console.error('Error importing private key:', error);
    throw new Error('Failed to import private key: ' + error.message);
  }
}

/**
 * Sign a payload with private key
 * @param {CryptoKey} privateKey - Private key to sign with
 * @param {Object} payload - Payload object to sign
 * @returns {Promise<string>} Hex string signature
 */
export async function signPayload(privateKey, payload) {
  try {
    // Convert payload to JSON string and then to ArrayBuffer
    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);
    
    // Sign the data
    const signature = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      privateKey,
      data
    );
    
    // Convert signature to hex string
    const hex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hex;
  } catch (error) {
    console.error('Error signing payload:', error);
    throw new Error('Failed to sign payload: ' + error.message);
  }
}

/**
 * Store private key in localStorage
 * @param {string} ticketId - Ticket ID (public key hex)
 * @param {CryptoKey} privateKey - Private key to store
 */
export async function storePrivateKey(ticketId, privateKey) {
  try {
    const jwk = await exportPrivateKeyToJWK(privateKey);
    const keys = getStoredPrivateKeys();
    keys[ticketId] = jwk;
    localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(keys));
    console.log('✅ Private key stored for ticket:', ticketId.substring(0, 16) + '...');
  } catch (error) {
    console.error('Error storing private key:', error);
    throw error;
  }
}

/**
 * Get stored private key by ticket ID
 * @param {string} ticketId - Ticket ID (public key hex)
 * @returns {Promise<CryptoKey|null>} Private key or null if not found
 */
export async function getStoredPrivateKey(ticketId) {
  try {
    const keys = getStoredPrivateKeys();
    const jwk = keys[ticketId];
    if (!jwk) {
      return null;
    }
    return await importPrivateKeyFromJWK(jwk);
  } catch (error) {
    console.error('Error getting stored private key:', error);
    return null;
  }
}

/**
 * Get all stored private keys from localStorage
 * @returns {Object} Object mapping ticketId to JWK
 */
function getStoredPrivateKeys() {
  try {
    const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading stored private keys:', error);
    return {};
  }
}

/**
 * Generate key pair and store private key
 * @returns {Promise<{publicKeyHex: string, privateKey: CryptoKey}>}
 */
export async function generateAndStoreKeyPair() {
  try {
    const keyPair = await generateKeyPair();
    const publicKeyHex = await exportPublicKeyToHex(keyPair.publicKey);
    
    // Store private key
    await storePrivateKey(publicKeyHex, keyPair.privateKey);
    
    return {
      publicKeyHex,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    };
  } catch (error) {
    console.error('Error generating and storing key pair:', error);
    throw error;
  }
}

/**
 * Submit MINT transaction to blockchain API
 * @param {Object} params - Transaction parameters
 * @param {string} params.ticketId - Public key hex (ticket ID)
 * @param {Object} params.payload - Payload object
 * @param {string} params.signature - Signature hex string
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
      payload,
      signature: signature.substring(0, 16) + '...',
    });
    
    const transactionJson = JSON.stringify(transaction);
    console.log('📤 Full transaction JSON:', transactionJson);
    console.log('📤 Payload being signed:', JSON.stringify(payload));
    
    // ZERO SECURITY - Direct API call
    const submitUrl = `${API_BASE_URL}/submit`;
    console.log('📤 Submitting to URL:', submitUrl);
    
    // Use XMLHttpRequest - bypasses more browser restrictions
    const response = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', submitUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json');
      
      xhr.onload = function() {
        const responseText = xhr.responseText;
        console.log(`📥 Response status: ${xhr.status}`);
        console.log(`📥 Response text:`, responseText.substring(0, 500));
        
        if (xhr.status >= 200 && xhr.status < 300) {
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
              status: xhr.status,
              json: async () => json,
              text: async () => responseText,
            });
          } catch (e) {
            console.error('❌ Failed to parse JSON. Response:', responseText.substring(0, 200));
            reject(new Error('Failed to parse JSON response: ' + e.message));
          }
        } else {
          // Even on error, try to parse JSON to get error message
          let errorMessage = `HTTP error! status: ${xhr.status}`;
          try {
            const errorJson = JSON.parse(responseText);
            errorMessage += `, message: ${JSON.stringify(errorJson)}`;
          } catch (e) {
            errorMessage += `, response: ${responseText.substring(0, 200)}`;
          }
          console.error('❌ Submit failed:', errorMessage);
          reject(new Error(errorMessage));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = function() {
        reject(new Error('Request timeout'));
      };
      
      xhr.timeout = 30000; // 30 seconds
      xhr.send(JSON.stringify(transaction));
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ MINT transaction submitted successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error submitting MINT transaction:', error);
    throw error;
  }
}

