# Server API - Symmetric Key Management

Questo server gestisce la rotazione e l'esposizione di chiavi simmetriche.

## Installazione

Installa le dipendenze:
```bash
npm install
```

## Avvio

### Solo server backend
```bash
npm run server
```

Il server sarà disponibile su `http://localhost:3001`

### Server + Frontend (sviluppo)
```bash
npm run dev:all
```

Questo avvia sia il server backend (porta 3001) che il frontend Vite (porta 3000).

## Endpoint API

### GET /api/key
Recupera la chiave simmetrica corrente o precedente.

**Query Parameters:**
- `version` (opzionale): `'current'` (default) o `'previous'`

**Esempi:**
```bash
# Chiave corrente
curl http://localhost:3001/api/key
curl http://localhost:3001/api/key?version=current

# Chiave precedente
curl http://localhost:3001/api/key?version=previous
```

**Risposta:**
```json
{
  "key": "base64-encoded-key",
  "createdAt": 1234567890,
  "expiresAt": 1234567890,
  "version": "current"
}
```

### GET /api/key/status
Recupera informazioni sullo stato della rotazione delle chiavi.

**Risposta:**
```json
{
  "currentKey": {
    "exists": true,
    "createdAt": 1234567890,
    "expiresAt": 1234567890,
    "timeUntilExpiry": 300000,
    "isExpired": false
  },
  "previousKey": {
    "exists": true,
    "createdAt": 1234567890,
    "expiresAt": 1234567890
  },
  "rotationInterval": 300000,
  "rotationIntervalMinutes": 5
}
```

### GET /health
Health check endpoint.

## Configurazione

La rotazione delle chiavi è configurata in `server/index.js`:

```javascript
const KEY_ROTATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minuti per test
```

Per cambiare a 24 ore:
```javascript
const KEY_ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 ore
```

## Utilizzo nel Frontend

Nel frontend React, puoi usare le funzioni helper da `src/lib/api.js`:

```javascript
import { getCurrentKey, getPreviousKey, getKeyStatus } from '@lib/api';

// Ottieni la chiave corrente
const currentKey = await getCurrentKey();
console.log(currentKey.key);

// Ottieni la chiave precedente
const previousKey = await getPreviousKey();
console.log(previousKey.key);

// Ottieni lo stato
const status = await getKeyStatus();
console.log(status);
```

## Proxy Vite

Il proxy Vite è configurato in `vite.config.js` per inoltrare automaticamente le richieste `/api/*` al server backend sulla porta 3001. Questo significa che nel frontend puoi chiamare `/api/key` direttamente senza specificare l'URL completo.

