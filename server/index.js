/**
 * Server API for symmetric key management
 * Exposes a symmetric key that rotates every 5 minutes (for testing) or 24 hours
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const KEY_ROTATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes for testing (change to 24 * 60 * 60 * 1000 for 24 hours)
const KEY_LENGTH = 32; // 256 bits for AES-256

// Middleware - ZERO SECURITY, RAW DOGGING
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*'],
  credentials: true,
  maxAge: 86400
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Proxy endpoint for chain data - ZERO SECURITY
app.get('/api/chain', async (req, res) => {
  try {
    // Set CORS headers manually - allow everything
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Expose-Headers', '*');
    
    const options = {
      hostname: '83.229.83.184',
      port: 8000,
      path: '/chain',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 seconds
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          res.json(jsonData);
        } catch (e) {
          // Even if parsing fails, send raw data
          res.status(200).send(data);
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error);
      res.status(200).json({ error: 'Failed to fetch chain data', message: error.message });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(200).json({ error: 'Request timeout' });
    });

    proxyReq.setTimeout(30000);
    proxyReq.end();
  } catch (error) {
    console.error('Chain proxy error:', error);
    res.status(200).json({ error: 'Internal server error', message: error.message });
  }
});

// Handle OPTIONS preflight for submit endpoint
app.options('/api/submit', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Proxy endpoint for submit - ZERO SECURITY, ALLOWS ALL CORS
app.post('/api/submit', async (req, res) => {
  try {
    console.log('📥 Received submit request:', {
      type: req.body?.type,
      ticketId: req.body?.ticketId?.substring(0, 16) + '...',
    });
    
    // Set CORS headers manually - allow everything
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Expose-Headers', '*');
    res.header('Content-Type', 'application/json');
    
    const requestBody = JSON.stringify(req.body);
    
    const options = {
      hostname: '83.229.83.184',
      port: 8000,
      path: '/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
      timeout: 30000,
    };

    console.log('📤 Proxying to:', `http://${options.hostname}:${options.port}${options.path}`);

    const proxyReq = http.request(options, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        console.log('✅ Proxy response received. Status:', proxyRes.statusCode);
        console.log('Response data:', data.substring(0, 200));
        
        try {
          const jsonData = JSON.parse(data);
          res.json(jsonData);
        } catch (e) {
          console.error('❌ Failed to parse JSON. Raw response:', data.substring(0, 500));
          res.status(200).json({ 
            error: 'Failed to parse response', 
            message: e.message,
            rawResponse: data.substring(0, 500)
          });
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('❌ Submit proxy error:', error);
      res.status(200).json({ 
        error: 'Failed to submit', 
        message: error.message,
        code: error.code
      });
    });

    proxyReq.on('timeout', () => {
      console.error('❌ Submit proxy timeout');
      proxyReq.destroy();
      res.status(200).json({ error: 'Request timeout' });
    });

    proxyReq.setTimeout(30000);
    proxyReq.write(requestBody);
    proxyReq.end();
  } catch (error) {
    console.error('❌ Submit proxy error:', error);
    res.status(200).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack
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
  console.log(`  GET /api/chain (proxy to blockchain API)`);
  console.log(`  POST /api/submit (proxy to blockchain API)`);
  console.log(`  GET /health`);
});

module.exports = app;

