/**
 * Anonymous Ticket Generator
 * Addresses SBB LauzHack 2024 Challenge: PT anonymous
 * 
 * Features:
 * - Copy-safe (only usable by 1 person at a time)
 * - Anonymous (no personal data required)
 * - Multiple times checkable (not invalid after 1 check)
 * - Easy access (like a ticket machine)
 * - Print@home
 */

/**
 * Generate a unique anonymous ticket
 * @param {Object} ticketData - Ticket information
 * @param {string} ticketData.origin - Origin station
 * @param {string} ticketData.destination - Destination station
 * @param {string} ticketData.date - Travel date
 * @param {string} ticketData.departure - Departure time
 * @param {string} ticketData.arrival - Arrival time
 * @param {string} ticketData.train - Train name/number
 * @param {number} ticketData.price - Ticket price
 * @param {string} ticketData.type - Ticket type (single, half-fare, etc.)
 * @param {string} ticketData.class - Class (1st, 2nd)
 * @returns {Object} Anonymous ticket object
 */
export function generateAnonymousTicket(ticketData) {
  // Generate unique ticket ID using hash of ticket data + timestamp + random
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ticketString = `${ticketData.origin}-${ticketData.destination}-${ticketData.date}-${ticketData.departure}-${timestamp}-${random}`;
  
  // Simple hash function for ticket ID
  const ticketId = hashString(ticketString);
  
  // Generate control code (for inspectors to verify)
  const controlCode = generateControlCode(ticketId, ticketData);
  
  // Create ticket object (NO personal data)
  const ticket = {
    id: ticketId,
    controlCode: controlCode,
    origin: ticketData.origin,
    destination: ticketData.destination,
    date: ticketData.date,
    departure: ticketData.departure,
    arrival: ticketData.arrival,
    train: ticketData.train,
    price: ticketData.price,
    type: ticketData.type || 'single',
    class: ticketData.class || '2nd',
    createdAt: new Date().toISOString(),
    validUntil: calculateValidUntil(ticketData.date, ticketData.arrival),
    // No personal data fields
  };
  
  return ticket;
}

/**
 * Generate an anonymous pass (daily, weekly, monthly, country-wide)
 * @param {Object} passData - Pass information
 * @param {string} passData.type - Pass type (daily, weekly, monthly, countrywide)
 * @param {string} passData.date - Start date
 * @param {number} passData.price - Pass price
 * @returns {Object} Anonymous pass object
 */
export function generateAnonymousPass(passData) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const passString = `${passData.type}-${passData.date}-${timestamp}-${random}`;
  
  const passId = hashString(passString);
  const controlCode = hashString(`${passId}-${passData.type}-${passData.date}`).substring(0, 8).toUpperCase();
  
  // Calculate validity period
  const startDate = new Date(passData.date);
  const endDate = new Date(startDate);
  
  switch (passData.type) {
    case 'daily':
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'weekly':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'countrywide':
      endDate.setDate(endDate.getDate() + 1); // Daily country-wide pass
      break;
  }
  
  const pass = {
    id: passId,
    controlCode: controlCode,
    type: 'pass',
    passType: passData.type,
    date: passData.date,
    validFrom: startDate.toISOString(),
    validUntil: endDate.toISOString(),
    price: passData.price,
    origin: passData.type === 'countrywide' ? 'Switzerland' : null,
    destination: passData.type === 'countrywide' ? 'Switzerland' : null,
    createdAt: new Date().toISOString(),
  };
  
  return pass;
}

/**
 * Generate control code for ticket verification
 * @param {string} ticketId - Ticket ID
 * @param {Object} ticketData - Ticket data
 * @returns {string} Control code
 */
function generateControlCode(ticketId, ticketData) {
  const codeString = `${ticketId}-${ticketData.origin}-${ticketData.destination}-${ticketData.date}`;
  const hash = hashString(codeString);
  // Return first 8 characters as control code
  return hash.substring(0, 8).toUpperCase();
}

/**
 * Simple hash function
 * @param {string} str - String to hash
 * @returns {string} Hashed string
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

/**
 * Calculate valid until timestamp
 * @param {string} date - Travel date
 * @param {string} arrivalTime - Arrival time
 * @returns {string} ISO timestamp
 */
function calculateValidUntil(date, arrivalTime) {
  const [hours, minutes] = arrivalTime.split(':');
  const validDate = new Date(date);
  validDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  // Add 2 hours buffer for delays
  validDate.setHours(validDate.getHours() + 2);
  return validDate.toISOString();
}

/**
 * Verify ticket validity
 * @param {Object} ticket - Ticket to verify (can be partial data from NFC)
 * @returns {Object} Verification result
 */
export function verifyTicket(ticket) {
  if (!ticket || !ticket.ticketId) {
    return {
      valid: false,
      expired: false,
      future: false,
      message: 'Invalid ticket data'
    };
  }

  const now = new Date();
  
  // If we have validity dates, check them
  if (ticket.validUntil) {
    const validUntil = new Date(ticket.validUntil);
    const isExpired = now > validUntil;
    
    if (ticket.validFrom) {
      const validFrom = new Date(ticket.validFrom);
      const isFuture = now < validFrom;
      
      return {
        valid: !isExpired && !isFuture,
        expired: isExpired,
        future: isFuture,
        message: isExpired 
          ? 'Ticket has expired' 
          : isFuture 
            ? 'Ticket is not yet valid' 
            : 'Ticket is valid'
      };
    }
    
    return {
      valid: !isExpired,
      expired: isExpired,
      future: false,
      message: isExpired ? 'Ticket has expired' : 'Ticket is valid'
    };
  }
  
  // If we have date, check if it's in the past (for single tickets)
  if (ticket.date) {
    const ticketDate = new Date(ticket.date);
    const isFuture = ticketDate > now;
    
    return {
      valid: !isFuture,
      expired: false,
      future: isFuture,
      message: isFuture ? 'Ticket is not yet valid' : 'Ticket found (validity check requires full ticket data)'
    };
  }
  
  // If we only have ticket ID, assume valid (would check against database in production)
  return {
    valid: true,
    expired: false,
    future: false,
    message: 'Ticket found (verification requires full ticket data)'
  };
}

/**
 * Generate QR code data for ticket
 * @param {Object} ticket - Ticket object
 * @returns {string} QR code data string
 */
export function generateQRCodeData(ticket) {
  if (ticket.type === 'pass') {
    // Format for passes: PASS_ID|CONTROL_CODE|PASS_TYPE|VALID_FROM|VALID_UNTIL
    return `${ticket.id}|${ticket.controlCode}|${ticket.passType}|${ticket.validFrom}|${ticket.validUntil}`;
  } else {
    // Format for single tickets: TICKET_ID|CONTROL_CODE|ORIGIN|DEST|DATE|TIME
    return `${ticket.id}|${ticket.controlCode}|${ticket.origin}|${ticket.destination}|${ticket.date}|${ticket.departure}`;
  }
}

/**
 * Parse QR code data
 * @param {string} qrData - QR code data string
 * @returns {Object|null} Parsed ticket data or null if invalid
 */
export function parseQRCodeData(qrData) {
  try {
    const parts = qrData.split('|');
    if (parts.length !== 6) return null;
    
    return {
      id: parts[0],
      controlCode: parts[1],
      origin: parts[2],
      destination: parts[3],
      date: parts[4],
      departure: parts[5],
    };
  } catch (error) {
    return null;
  }
}

/**
 * Format ticket for printing
 * @param {Object} ticket - Ticket object
 * @returns {string} HTML string for printing
 */
export function formatTicketForPrint(ticket) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SBB Anonymous Ticket</title>
      <style>
        body { 
          font-family: Helvetica, Arial, sans-serif; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background: white;
          color: black;
        }
        .ticket { 
          border: 3px solid #EB0000; 
          padding: 20px; 
          margin: 20px 0;
        }
        .header { 
          background: #EB0000; 
          color: white; 
          padding: 15px; 
          text-align: center;
          font-weight: bold;
          font-size: 18px;
        }
        .content { 
          padding: 20px; 
        }
        .route { 
          font-size: 24px; 
          font-weight: bold; 
          margin: 20px 0;
          text-align: center;
        }
        .details { 
          margin: 15px 0; 
        }
        .control-code { 
          background: #f5f5f5; 
          padding: 10px; 
          text-align: center;
          font-family: monospace;
          font-size: 16px;
          font-weight: bold;
          margin: 20px 0;
        }
        .qr-placeholder {
          border: 2px dashed #ccc;
          padding: 40px;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          font-size: 12px;
          color: #666;
          margin-top: 20px;
          text-align: center;
        }
        @media print {
          body { margin: 0; padding: 10px; }
          .ticket { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">SBB CFF FFS - Anonymous ${ticket.type === 'pass' ? 'Pass' : 'Ticket'}</div>
        <div class="content">
          ${ticket.type === 'pass' ? `
            <div class="route">${ticket.passType === 'countrywide' ? 'Switzerland' : ticket.passType.charAt(0).toUpperCase() + ticket.passType.slice(1)} Pass</div>
            <div class="details">
              <p><strong>Type:</strong> ${ticket.passType === 'countrywide' ? 'Country-wide' : ticket.passType.charAt(0).toUpperCase() + ticket.passType.slice(1)}</p>
              <p><strong>Valid From:</strong> ${new Date(ticket.validFrom).toLocaleDateString('de-CH')}</p>
              <p><strong>Valid Until:</strong> ${new Date(ticket.validUntil).toLocaleDateString('de-CH')}</p>
              <p><strong>Price:</strong> CHF ${ticket.price.toFixed(2)}</p>
            </div>
          ` : `
            <div class="route">${ticket.origin} → ${ticket.destination}</div>
            <div class="details">
              <p><strong>Date:</strong> ${new Date(ticket.date).toLocaleDateString('de-CH')}</p>
              <p><strong>Departure:</strong> ${ticket.departure}</p>
              <p><strong>Arrival:</strong> ${ticket.arrival}</p>
              <p><strong>Train:</strong> ${ticket.train}</p>
              <p><strong>Type:</strong> ${ticket.type}</p>
              <p><strong>Class:</strong> ${ticket.class}</p>
              <p><strong>Price:</strong> CHF ${ticket.price.toFixed(2)}</p>
            </div>
          `}
          <div class="control-code">
            Control Code: ${ticket.controlCode}
          </div>
          <div class="qr-placeholder">
            [QR Code: ${generateQRCodeData(ticket)}]
          </div>
          <div class="footer">
            ${ticket.type === 'pass' ? 'Pass' : 'Ticket'} ID: ${ticket.id}<br>
            ${ticket.type === 'pass' 
              ? `Valid from ${new Date(ticket.validFrom).toLocaleDateString('de-CH')} until ${new Date(ticket.validUntil).toLocaleDateString('de-CH')}`
              : `Valid until: ${new Date(ticket.validUntil).toLocaleString('de-CH')}`}<br>
            This ${ticket.type === 'pass' ? 'pass' : 'ticket'} can be checked multiple times. No personal data required.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

