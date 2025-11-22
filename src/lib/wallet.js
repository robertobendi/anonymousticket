/**
 * Wallet management for storing and managing tickets
 * Uses localStorage to persist tickets locally
 */

import useLocalStorage from '@hooks/useLocalStorage';

const WALLET_STORAGE_KEY = 'sbb_wallet_tickets';

/**
 * Get all tickets from wallet
 * @returns {Array<Object>} Array of ticket objects
 */
export function getWalletTickets() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to read wallet:', error);
    return [];
  }
}

/**
 * Add ticket to wallet
 * @param {Object} ticket - Ticket object to add
 * @returns {boolean} True if successful
 */
export function addTicketToWallet(ticket) {
  try {
    const tickets = getWalletTickets();
    
    // Check if ticket already exists (by ID)
    if (tickets.some(t => t.id === ticket.id)) {
      return false; // Ticket already in wallet
    }
    
    tickets.push({
      ...ticket,
      addedAt: new Date().toISOString(),
    });
    
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(tickets));
    return true;
  } catch (error) {
    console.warn('Failed to add ticket to wallet:', error);
    return false;
  }
}

/**
 * Remove ticket from wallet
 * @param {string} ticketId - ID of ticket to remove
 * @returns {boolean} True if successful
 */
export function removeTicketFromWallet(ticketId) {
  try {
    const tickets = getWalletTickets();
    const filtered = tickets.filter(t => t.id !== ticketId);
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.warn('Failed to remove ticket from wallet:', error);
    return false;
  }
}

/**
 * Clear all tickets from wallet
 * @returns {boolean} True if successful
 */
export function clearWallet() {
  try {
    localStorage.removeItem(WALLET_STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn('Failed to clear wallet:', error);
    return false;
  }
}

/**
 * Get wallet data formatted for NFC transmission
 * @returns {Object} Wallet object with tickets array
 */
export function getWalletForNFC() {
  const tickets = getWalletTickets();
  return {
    wallet: true,
    version: '1.0',
    timestamp: new Date().toISOString(),
    tickets: tickets,
    ticketCount: tickets.length,
  };
}

/**
 * React hook for wallet management
 * @returns {[Array<Object>, function, function, function]} [tickets, addTicket, removeTicket, clearWallet]
 */
export function useWallet() {
  const [tickets, setTickets] = useLocalStorage(WALLET_STORAGE_KEY, []);

  const addTicket = (ticket) => {
    const currentTickets = tickets || [];
    if (currentTickets.some(t => t.id === ticket.id)) {
      return false; // Already exists
    }
    setTickets([...currentTickets, {
      ...ticket,
      addedAt: new Date().toISOString(),
    }]);
    return true;
  };

  const removeTicket = (ticketId) => {
    const currentTickets = tickets || [];
    setTickets(currentTickets.filter(t => t.id !== ticketId));
  };

  const clearAll = () => {
    setTickets([]);
  };

  return [tickets, addTicket, removeTicket, clearAll];
}

