import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiTrash2, FiCreditCard, FiGlobe, FiAlertCircle, FiMenu, FiRadio, FiPlay, FiCheckCircle } from 'react-icons/fi';
import { useWallet, getTicketForNFC } from '@lib/wallet';
import { startBeacon, stopBeacon } from '@lib/nfc-simple';
import { checkNFC } from '@lib/nfc-simple';
import { activateTicket, getStoredPrivateKey, checkTicketStatus } from '@lib/crypto';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';
import MobileSidebar from '@components/ui/MobileSidebar';

/**
 * Wallet page - View tickets and share individual tickets via NFC
 */
const Wallet = memo(() => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, addTicket, removeTicket, clearAll] = useWallet();
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [sharingTicketId, setSharingTicketId] = useState(null); // Track which ticket is being shared
  const [shareError, setShareError] = useState(null);
  const [activatingTicketId, setActivatingTicketId] = useState(null); // Track which ticket is being activated
  const [ticketStatuses, setTicketStatuses] = useState({}); // Track status for each ticket: { ticketId: 'ACTIVE' | 'ISSUED' | 'EXPIRED' | 'UNKNOWN' }

  useEffect(() => {
    // Check NFC availability
    const checkNFCStatus = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const status = await checkNFC();
        setNfcAvailable(status.available && status.enabled);
        console.log('NFC availability check:', status);
      } catch (error) {
        console.error('NFC check failed:', error);
        setNfcAvailable(false);
      }
    };
    checkNFCStatus();
  }, []);

  // Check ticket statuses when tickets change
  useEffect(() => {
    const checkStatuses = async () => {
      if (tickets.length === 0) return;
      
      const statusPromises = tickets.map(async (ticket) => {
        const ticketId = ticket.id || ticket.ticketId;
        if (!ticketId) return null;
        
        try {
          const statusResult = await checkTicketStatus(ticketId);
          if (statusResult.success && statusResult.data) {
            return { ticketId, status: statusResult.data.status || 'UNKNOWN' };
          }
          return { ticketId, status: 'UNKNOWN' };
        } catch (error) {
          console.warn('Error checking status for ticket:', ticketId, error);
          return { ticketId, status: 'UNKNOWN' };
        }
      });
      
      const results = await Promise.all(statusPromises);
      const statusMap = {};
      results.forEach((result) => {
        if (result) {
          statusMap[result.ticketId] = result.status;
        }
      });
      
      setTicketStatuses(statusMap);
    };
    
    checkStatuses();
  }, [tickets]);

  /**
   * Handle sharing a single ticket via NFC using Host Card Emulation (HCE)
   * Creates a ticket JSON and shares it via HCE
   * Controller can scan this phone to receive the ticket and verify it
   * @param {Object} ticket - Ticket to share
   */
  const handleShareTicket = async (ticket) => {
    // If already sharing this ticket, stop sharing
    if (sharingTicketId === ticket.id) {
      try {
        await stopBeacon();
        setSharingTicketId(null);
        setShareError(null);
        console.log('Stopped sharing ticket:', ticket.id);
        toast.success('Sharing stopped', {
          icon: '🛑',
          duration: 2000,
        });
      } catch (error) {
        console.error('Error stopping beacon:', error);
        setShareError('Failed to stop sharing');
        toast.error('Failed to stop sharing', {
          duration: 3000,
        });
      }
      return;
    }

    // Stop any other active sharing first
    if (sharingTicketId) {
      try {
        await stopBeacon();
      } catch (error) {
        console.warn('Error stopping previous beacon:', error);
      }
    }

    setShareError(null);

    try {
      const status = await checkNFC();
      if (!status.available || !status.enabled) {
        setShareError('NFC is not available or disabled.');
        toast.error('NFC is not available or disabled', {
          duration: 4000,
        });
        return;
      }
      
      // Get ticket JSON for sharing
      const ticketJson = getTicketForNFC(ticket);
      if (!ticketJson) {
        setShareError('Failed to prepare ticket for sharing.');
        toast.error('Failed to prepare ticket', {
          duration: 4000,
        });
        return;
      }
      
      console.log('Starting beacon mode for single ticket:', ticket.id);
      console.log('Ticket JSON length:', ticketJson.length, 'chars');
      
      // Send the ticket JSON directly
      await startBeacon(ticketJson);
      setSharingTicketId(ticket.id);
      console.log('✓ Beacon mode active - controller can scan this phone for ticket:', ticket.id);
      toast.success('HCE card emulation active! Ready to be scanned.', {
        icon: '📱',
        duration: 4000,
      });
      // Note: Success here means "ready to share", not "shared successfully"
      // The actual P2P exchange happens when phones touch
    } catch (error) {
      console.error('Beacon error:', error);
      const errorMsg = error.message || 'Failed to start sharing';
      setShareError(errorMsg);
      setSharingTicketId(null);
      toast.error(errorMsg, {
        duration: 5000,
      });
    }
  };

  /**
   * Handle activating a ticket
   * Activates ticket on blockchain (changes status from ISSUED to ACTIVE)
   * @param {Object} ticket - Ticket to activate
   */
  const handleActivateTicket = async (ticket) => {
    if (activatingTicketId === ticket.id) {
      return; // Already activating
    }

    setActivatingTicketId(ticket.id);
    
    try {
      const ticketId = ticket.id || ticket.ticketId;
      if (!ticketId) {
        throw new Error('Ticket ID not found');
      }

      // Get user's private key for this ticket
      const privateKey = getStoredPrivateKey(ticketId);
      if (!privateKey) {
        throw new Error('Private key not found for this ticket. Cannot activate.');
      }

      // Get location from ticket or use default
      const location = ticket.origin || 'Unknown Station';
      
      toast.loading('Activating ticket...', {
        id: 'activate-ticket',
        duration: 10000,
      });

      // Activate ticket on blockchain
      const result = await activateTicket(ticketId, privateKey, location);
      
      toast.dismiss('activate-ticket');
      
      if (result.success) {
        // Update status immediately
        setTicketStatuses(prev => ({
          ...prev,
          [ticketId]: 'ACTIVE'
        }));
        
        toast.success('Ticket activated! Have a nice trip! 🚂', {
          icon: '✅',
          duration: 4000,
        });
      } else {
        throw new Error(result.error || 'Activation failed');
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast.dismiss('activate-ticket');
      toast.error(error.message || 'Failed to activate ticket', {
        icon: '❌',
        duration: 5000,
      });
    } finally {
      setActivatingTicketId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-CH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    return timeString || '';
  };

  return (
    <motion.div 
      className="min-h-screen" 
      style={{ backgroundColor: THEME.background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-bold min-h-[44px]"
            style={{ color: THEME.text }}
            whileHover={{ opacity: 0.7 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiArrowLeft size={18} />
            <span className="hidden sm:inline">Back</span>
          </motion.button>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: THEME.text }}>
            My Wallet
          </h1>
          <motion.button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: THEME.text }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Open menu"
          >
            <FiMenu size={24} />
          </motion.button>
          <div className="hidden md:block" style={{ width: '60px' }}></div> {/* Spacer for centering on desktop */}
        </motion.div>

        {/* Info Section */}
        {!nfcAvailable && (
          <AnimatedCard className="p-4 mb-6 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
            <div className="flex items-start gap-2">
              <FiAlertCircle style={{ color: THEME.accent, marginTop: '2px' }} size={18} />
              <p className="text-xs" style={{ color: THEME.textMuted }}>
                NFC is not available. Please enable NFC on your device to share tickets.
              </p>
            </div>
          </AnimatedCard>
        )}

        {shareError && (
          <AnimatedCard className="p-4 mb-6 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.accent}`, borderRadius: '8px' }}>
            <div className="flex items-start gap-2">
              <FiAlertCircle style={{ color: THEME.accent, marginTop: '2px' }} size={18} />
              <p className="text-xs" style={{ color: THEME.accent }}>{shareError}</p>
            </div>
          </AnimatedCard>
        )}

        {/* Tickets List */}
        <AnimatePresence mode="wait">
          {tickets.length === 0 ? (
            <AnimatedCard className="p-8 text-center rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
            <FiCreditCard size={48} style={{ color: THEME.textMuted, margin: '0 auto 16px' }} />
            <p className="text-sm font-bold mb-2" style={{ color: THEME.text }}>
              No tickets in wallet
            </p>
            <p className="text-xs" style={{ color: THEME.textMuted }}>
              Purchase tickets to add them to your wallet
            </p>
            <AnimatedButton
              onClick={() => navigate('/')}
              variant="primary"
              className="mt-4 px-6 py-2 text-sm"
            >
              Buy Tickets
            </AnimatedButton>
            </AnimatedCard>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket, index) => {
                const ticketId = ticket.id || ticket.ticketId;
                const status = ticketStatuses[ticketId] || 'UNKNOWN';
                const isActive = status === 'ACTIVE';
                const isExpired = status === 'EXPIRED';
                const isIssued = status === 'ISSUED';
                
                // Determine border color based on status
                let borderColor = THEME.border;
                if (isActive) {
                  borderColor = THEME.success;
                } else if (isExpired) {
                  borderColor = '#ff9800';
                } else if (isIssued) {
                  borderColor = THEME.accent;
                }
                
                return (
                <AnimatedCard
                  key={ticket.id}
                  delay={index * 0.1}
                  className="p-4 sm:p-5 rounded-lg relative overflow-hidden"
                  style={{ 
                    backgroundColor: THEME.card, 
                    border: `1px solid ${THEME.border}`, 
                    borderRadius: '12px',
                    borderLeft: `4px solid ${borderColor}`
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  {/* Subtle Status Indicator - Top Right */}
                  {status !== 'UNKNOWN' && (
                    <div 
                      className="absolute top-3 right-3 flex items-center gap-1.5"
                    >
                      {isActive && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: THEME.success }}
                        />
                      )}
                      <span 
                        className="text-xs font-medium"
                        style={{
                          color: isActive ? THEME.success : 
                                 isExpired ? '#ff9800' :
                                 THEME.textMuted
                        }}
                      >
                        {isActive ? 'Active' : 
                         isExpired ? 'Expired' :
                         isIssued ? 'Issued' : ''}
                      </span>
                    </div>
                  )}
                <div className="flex items-start justify-between gap-3 sm:gap-4 pr-16 sm:pr-20">
                  <div className="flex-1">
                    {ticket.type === 'pass' ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <FiGlobe style={{ color: THEME.accent }} size={16} />
                          <h3 className="text-base sm:text-lg font-bold" style={{ color: THEME.text }}>
                            {ticket.passType === 'countrywide' ? 'Switzerland Pass' :
                             ticket.passType === 'daily' ? 'Daily Pass' :
                             ticket.passType === 'weekly' ? 'Weekly Pass' : 'Monthly Pass'}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mb-2">
                          <div>
                            <div style={{ color: THEME.textMuted }}>Valid From</div>
                            <div className="font-bold" style={{ color: THEME.text }}>
                              {formatDate(ticket.validFrom)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: THEME.textMuted }}>Valid Until</div>
                            <div className="font-bold" style={{ color: THEME.text }}>
                              {formatDate(ticket.validUntil)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <FiCreditCard style={{ color: THEME.accent }} size={16} />
                          <h3 className="text-base sm:text-lg font-bold" style={{ color: THEME.text }}>
                            {ticket.origin} → {ticket.destination}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mb-2">
                          <div>
                            <div style={{ color: THEME.textMuted }}>Date</div>
                            <div className="font-bold" style={{ color: THEME.text }}>
                              {formatDate(ticket.date)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: THEME.textMuted }}>Time</div>
                            <div className="font-bold" style={{ color: THEME.text }}>
                              {formatTime(ticket.departure)} - {formatTime(ticket.arrival)}
                            </div>
                          </div>
                          {ticket.train && (
                            <div>
                              <div style={{ color: THEME.textMuted }}>Train</div>
                              <div className="font-bold" style={{ color: THEME.accent }}>
                                {ticket.train}
                              </div>
                            </div>
                          )}
                          <div>
                            <div style={{ color: THEME.textMuted }}>Price</div>
                            <div className="font-bold" style={{ color: THEME.text }}>
                              CHF {ticket.price?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {sharingTicketId === ticket.id && (
                      <div className="mt-2 p-2" style={{ backgroundColor: `${THEME.success}15`, borderLeft: `3px solid ${THEME.success}` }}>
                        <div className="flex items-center gap-2">
                          <FiRadio style={{ color: THEME.success }} size={14} />
                          <p className="text-xs font-bold" style={{ color: THEME.success }}>
                            Sharing via NFC...
                          </p>
                        </div>
                        <p className="text-xs mt-1" style={{ color: THEME.textMuted }}>
                          Controller: Go to Verify page and scan NFC tag/beacon
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[100px] sm:min-w-[120px]">
                    <motion.button
                      onClick={() => handleActivateTicket(ticket)}
                      disabled={activatingTicketId === ticket.id || isActive}
                      className="px-3 sm:px-4 py-2.5 min-h-[44px] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold rounded-lg shadow-sm"
                      style={{ 
                        backgroundColor: isActive ? `${THEME.success}30` : THEME.success,
                        color: isActive ? THEME.success : '#ffffff',
                        opacity: (activatingTicketId === ticket.id || !isActive) ? (activatingTicketId === ticket.id ? 0.6 : 1) : 0.7
                      }}
                      whileHover={activatingTicketId !== ticket.id && !isActive ? { opacity: 0.9, scale: 1.02 } : {}}
                      whileTap={activatingTicketId !== ticket.id && !isActive ? { scale: 0.98 } : {}}
                      aria-label="Activate ticket"
                    >
                      {activatingTicketId === ticket.id ? (
                        <>
                          <FiPlay size={12} />
                          <span>Activating...</span>
                        </>
                      ) : isActive ? (
                        <>
                          <FiCheckCircle size={12} />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <FiPlay size={12} />
                          <span>Activate</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      onClick={() => handleShareTicket(ticket)}
                      disabled={!nfcAvailable}
                      className="px-3 sm:px-4 py-2.5 min-h-[44px] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold rounded-lg shadow-sm"
                      style={{ 
                        backgroundColor: sharingTicketId === ticket.id ? THEME.accent : `${THEME.accent}90`,
                        color: '#ffffff',
                        opacity: !nfcAvailable ? 0.5 : 1
                      }}
                      whileHover={nfcAvailable ? { opacity: 0.9, scale: 1.02 } : {}}
                      whileTap={nfcAvailable ? { scale: 0.98 } : {}}
                      aria-label={sharingTicketId === ticket.id ? "Stop sharing ticket" : "Validate ticket via NFC"}
                    >
                      {sharingTicketId === ticket.id ? (
                        <>
                          <FiRadio size={12} />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <FiRadio size={12} />
                          <span>Validate</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        removeTicket(ticket.id);
                        toast.success('Ticket removed from wallet', {
                          icon: '🗑️',
                          duration: 2000,
                        });
                      }}
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
                      style={{ 
                        color: THEME.accent,
                        backgroundColor: `${THEME.accent}10`
                      }}
                      whileHover={{ opacity: 0.7, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Remove ticket"
                    >
                      <FiTrash2 size={18} />
                    </motion.button>
                  </div>
                </div>
                </AnimatedCard>
              );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </motion.div>
  );
});

Wallet.displayName = 'Wallet';

export default Wallet;
