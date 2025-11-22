/**
 * Server API for symmetric key management
 * Exposes a symmetric key that rotates every 5 minutes (for testing) or 24 hours
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const KEY_ROTATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes for testing (change to 24 * 60 * 60 * 1000 for 24 hours)
const KEY_LENGTH = 32; // 256 bits for AES-256

// Middleware
app.use(cors());
app.use(express.json());

// Key storage
let currentKey = {
  key: null,
  createdAt: null,
  expiresAt: null
};

let previousKey = {
  key: null,
  createdAt: null,
  expiresAt: null
};

/**
 * Generate a random symmetric key
 * @returns {string} Base64 encoded key
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Initialize and rotate keys
 */
function initializeKeys() {
  const now = Date.now();
  
  // Move current key to previous
  if (currentKey.key) {
    previousKey = { ...currentKey };
  }
  
  // Generate new current key
  currentKey = {
    key: generateKey(),
    createdAt: now,
    expiresAt: now + KEY_ROTATION_INTERVAL_MS
  };
  
  console.log(`[${new Date().toISOString()}] Key rotated. New key expires at ${new Date(currentKey.expiresAt).toISOString()}`);
}

// Initialize keys on startup
initializeKeys();

// Set up automatic rotation
setInterval(() => {
  initializeKeys();
}, KEY_ROTATION_INTERVAL_MS);

/**
 * GET /api/key
 * Query parameters:
 *   - version: 'current' (default) or 'previous'
 * 
 * Returns:
 *   {
 *     key: string (base64 encoded),
 *     createdAt: number (timestamp),
 *     expiresAt: number (timestamp),
 *     version: 'current' | 'previous'
 *   }
 */
app.get('/api/key', (req, res) => {
  try {
    const version = req.query.version || 'current';
    
    let keyData;
    if (version === 'previous') {
      if (!previousKey.key) {
        return res.status(404).json({
          error: 'Previous key not available',
          message: 'No previous key has been generated yet'
        });
      }
      keyData = {
        key: previousKey.key,
        createdAt: previousKey.createdAt,
        expiresAt: previousKey.expiresAt,
        version: 'previous'
      };
    } else {
      if (!currentKey.key) {
        return res.status(500).json({
          error: 'Current key not available',
          message: 'Key system not initialized'
        });
      }
      keyData = {
        key: currentKey.key,
        createdAt: currentKey.createdAt,
        expiresAt: currentKey.expiresAt,
        version: 'current'
      };
    }
    
    res.json(keyData);
  } catch (error) {
    console.error('Error retrieving key:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/key/status
 * Returns status information about key rotation
 */
app.get('/api/key/status', (req, res) => {
  try {
    const now = Date.now();
    
    res.json({
      currentKey: {
        exists: !!currentKey.key,
        createdAt: currentKey.createdAt,
        expiresAt: currentKey.expiresAt,
        timeUntilExpiry: currentKey.expiresAt ? currentKey.expiresAt - now : null,
        isExpired: currentKey.expiresAt ? now >= currentKey.expiresAt : null
      },
      previousKey: {
        exists: !!previousKey.key,
        createdAt: previousKey.createdAt,
        expiresAt: previousKey.expiresAt
      },
      rotationInterval: KEY_ROTATION_INTERVAL_MS,
      rotationIntervalMinutes: KEY_ROTATION_INTERVAL_MS / (60 * 1000)
    });
  } catch (error) {
    console.error('Error retrieving key status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Key rotation interval: ${KEY_ROTATION_INTERVAL_MS / (60 * 1000)} minutes`);
  console.log(`API endpoints:`);
  console.log(`  GET /api/key?version=current (default)`);
  console.log(`  GET /api/key?version=previous`);
  console.log(`  GET /api/key/status`);
  console.log(`  GET /health`);
});

module.exports = app;

