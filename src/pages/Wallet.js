import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRadio, FiTrash2, FiCreditCard, FiGlobe, FiAlertCircle, FiMenu, FiShare2 } from 'react-icons/fi';
import { useWallet, getTicketForNFC } from '@lib/wallet';
import { startBeacon, stopBeacon } from '@lib/nfc-simple';
import { checkNFC } from '@lib/nfc-simple';
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

  /**
   * Handle sharing a single ticket via NFC beacon
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
      } catch (error) {
        console.error('Error stopping beacon:', error);
        setShareError('Failed to stop sharing');
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
        return;
      }
      
      // Get signature message (hex string: public key + signature)
      const messageHex = await getTicketForNFC(ticket);
      if (!messageHex) {
        setShareError('Failed to prepare ticket signature for sharing.');
        return;
      }
      
      console.log('Starting beacon mode for single ticket:', ticket.id);
      console.log('Signature message length:', messageHex.length, 'hex chars (expected 192)');
      
      // Send the hex string directly (not JSON)
      await startBeacon(messageHex);
      setSharingTicketId(ticket.id);
      console.log('✓ Beacon mode active - controller can scan this phone for ticket:', ticket.id);
      // Note: Success here means "ready to share", not "shared successfully"
      // The actual P2P exchange happens when phones touch
    } catch (error) {
      console.error('Beacon error:', error);
      setShareError(error.message || 'Failed to start sharing');
      setSharingTicketId(null);
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
              {tickets.map((ticket, index) => (
                <AnimatedCard
                  key={ticket.id}
                  delay={index * 0.1}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}
                  whileHover={{ scale: 1.01 }}
                >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {ticket.type === 'pass' ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <FiGlobe style={{ color: THEME.accent }} size={18} />
                          <h3 className="text-lg font-bold" style={{ color: THEME.text }}>
                            {ticket.passType === 'countrywide' ? 'Switzerland Pass' :
                             ticket.passType === 'daily' ? 'Daily Pass' :
                             ticket.passType === 'weekly' ? 'Weekly Pass' : 'Monthly Pass'}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-2">
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
                        <div className="flex items-center gap-2 mb-2">
                          <FiCreditCard style={{ color: THEME.accent }} size={18} />
                          <h3 className="text-lg font-bold" style={{ color: THEME.text }}>
                            {ticket.origin} → {ticket.destination}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-2">
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
                    <div className="mt-2 p-2" style={{ backgroundColor: THEME.background }}>
                      <div className="text-xs" style={{ color: THEME.textMuted }}>Control Code</div>
                      <div className="text-sm font-mono font-bold" style={{ color: THEME.accent }}>
                        {ticket.controlCode}
                      </div>
                    </div>
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
                  <div className="flex flex-col gap-2">
                    <motion.button
                      onClick={() => handleShareTicket(ticket)}
                      disabled={!nfcAvailable}
                      className="px-3 py-2 min-h-[44px] flex items-center justify-center gap-2 text-xs font-bold rounded"
                      style={{ 
                        backgroundColor: sharingTicketId === ticket.id ? THEME.success : THEME.accent,
                        color: '#ffffff',
                        opacity: !nfcAvailable ? 0.5 : 1
                      }}
                      whileHover={nfcAvailable ? { opacity: 0.8, scale: 1.05 } : {}}
                      whileTap={nfcAvailable ? { scale: 0.95 } : {}}
                      aria-label={sharingTicketId === ticket.id ? "Stop sharing ticket" : "Validate ticket via NFC"}
                    >
                      {sharingTicketId === ticket.id ? (
                        <>
                          <FiRadio size={16} />
                          <span>Stop</span>
                        </>
                      ) : (
                        <span>Validate</span>
                      )}
                    </motion.button>
                    <motion.button
                      onClick={() => removeTicket(ticket.id)}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      style={{ color: THEME.accent }}
                      whileHover={{ opacity: 0.7, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Remove ticket"
                    >
                      <FiTrash2 size={20} />
                    </motion.button>
                  </div>
                </div>
                </AnimatedCard>
              ))}
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

