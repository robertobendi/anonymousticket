import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRadio, FiTrash2, FiSend, FiCreditCard, FiGlobe, FiAlertCircle, FiMenu } from 'react-icons/fi';
import { useWallet, getWalletForNFC } from '@lib/wallet';
import { writeNFC, startBeacon, stopBeacon } from '@lib/nfc-simple';
import { checkNFC } from '@lib/nfc-simple';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';
import MobileSidebar from '@components/ui/MobileSidebar';

/**
 * Wallet page - View tickets and send wallet via NFC
 */
const Wallet = memo(() => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, addTicket, removeTicket, clearAll] = useWallet();
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [isBeaconActive, setIsBeaconActive] = useState(false);

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

  const handleStartBeacon = async () => {
    if (tickets.length === 0) {
      setSendError('No tickets in wallet to share');
      return;
    }

    if (isBeaconActive) {
      // Stop beacon
      try {
        await stopBeacon();
        setIsBeaconActive(false);
        setSendSuccess(false);
        setSendError(null);
        console.log('Beacon stopped');
      } catch (error) {
        console.error('Error stopping beacon:', error);
      }
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const status = await checkNFC();
      if (!status.available || !status.enabled) {
        setSendError('NFC is not available or disabled.');
        setIsSending(false);
        return;
      }
      
      const walletData = getWalletForNFC();
      const walletJson = JSON.stringify(walletData);
      
      console.log('Starting beacon mode with wallet data:', walletData.ticketCount, 'tickets');
      await startBeacon(walletJson);
      setIsBeaconActive(true);
      setSendSuccess(true);
      setIsSending(false);
      console.log('✓ Beacon mode active - controller can scan this phone');
      // Note: Success here means "ready to share", not "shared successfully"
      // The actual P2P exchange happens when phones touch
    } catch (error) {
      console.error('Beacon error:', error);
      setSendError(error.message || 'Failed to start beacon');
      setIsSending(false);
    }
  };

  const handleSendWallet = async () => {
    if (tickets.length === 0) {
      setSendError('No tickets in wallet to send');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      // Check NFC status
      const status = await checkNFC();
      if (!status.available) {
        setSendError('NFC is not available on this device.');
        setIsSending(false);
        return;
      }
      if (!status.enabled) {
        setSendError('NFC is disabled. Please enable NFC in your device settings.');
        setIsSending(false);
        return;
      }
      
      const walletData = getWalletForNFC();
      const walletJson = JSON.stringify(walletData);
      
      await writeNFC(walletJson);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (error) {
      console.error('NFC write error:', error);
      let errorMessage = error.message || 'Failed to send wallet via NFC';
      
      // Provide helpful error messages
      if (errorMessage.includes('permission')) {
        errorMessage = 'NFC permission issue. Note: NFC is a normal permission (auto-granted). Please ensure NFC is enabled in your device settings.';
      } else if (errorMessage.includes('not available')) {
        errorMessage = 'NFC is not available. Please ensure NFC is enabled on your device.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'NFC write timeout. Please hold your device near the receiver or an NFC tag.';
      }
      
      setSendError(errorMessage);
    } finally {
      setIsSending(false);
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

        {/* NFC Send Section */}
        <AnimatedCard className="p-4 mb-6 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold mb-1" style={{ color: THEME.text }}>
              Share Tickets via NFC
            </h2>
            <p className="text-xs mb-3" style={{ color: THEME.textMuted }}>
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} in wallet
            </p>
            
            {/* Two modes: Write to tag, or Beacon mode */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <AnimatedButton
                onClick={handleSendWallet}
                disabled={isSending || tickets.length === 0 || !nfcAvailable}
                loading={isSending}
                variant="primary"
                className="px-4 py-3 text-xs flex flex-col items-center gap-2"
                icon={FiSend}
              >
                {isSending ? 'Writing...' : 'Write to Tag'}
              </AnimatedButton>
              
              <AnimatedButton
                onClick={handleStartBeacon}
                disabled={isBeaconActive || tickets.length === 0 || !nfcAvailable}
                variant={isBeaconActive ? 'success' : 'primary'}
                className="px-4 py-3 text-xs flex flex-col items-center gap-2"
                icon={FiRadio}
              >
                {isBeaconActive ? 'Beacon Active' : 'Start Beacon'}
              </AnimatedButton>
            </div>
          </div>

          {!nfcAvailable && (
            <div className="flex items-start gap-2 p-3 mb-3" style={{ backgroundColor: `${THEME.accent}15` }}>
              <FiAlertCircle style={{ color: THEME.accent, marginTop: '2px' }} size={18} />
              <p className="text-xs" style={{ color: THEME.textMuted }}>
                NFC is not available. Please enable NFC on your device to send wallet.
              </p>
            </div>
          )}

          {sendError && (
            <div className="p-3 mb-3" style={{ backgroundColor: `${THEME.accent}15`, borderLeft: `4px solid ${THEME.accent}` }}>
              <p className="text-xs" style={{ color: THEME.accent }}>{sendError}</p>
            </div>
          )}

          {sendSuccess && !isBeaconActive && (
            <div className="p-3 mb-3" style={{ backgroundColor: `${THEME.success}15`, borderLeft: `4px solid ${THEME.success}` }}>
              <p className="text-xs" style={{ color: THEME.success }}>
                Write mode ready! Hold device near NFC tag or receiving phone.
              </p>
            </div>
          )}

          {isBeaconActive ? (
            <div className="p-3 mb-3" style={{ backgroundColor: `${THEME.success}15`, borderLeft: `4px solid ${THEME.success}` }}>
              <p className="text-xs font-bold mb-1" style={{ color: THEME.success }}>
                ✓✓✓ SHARE MODE ACTIVE ✓✓✓
              </p>
              <p className="text-xs mb-2" style={{ color: THEME.textMuted }}>
                <strong>Instructions for controller:</strong>
              </p>
              <ol className="text-xs ml-4 list-decimal mb-2 space-y-1" style={{ color: THEME.textMuted }}>
                <li>Controller: Go to Verify page</li>
                <li>Controller: Click "Scan NFC Tag / Beacon"</li>
                <li>Hold phones back-to-back (NFC areas touching)</li>
                <li>Controller will receive your wallet data</li>
              </ol>
              <p className="text-xs" style={{ color: THEME.textMuted }}>
                Click "Start Beacon" again to stop sharing.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs mb-2" style={{ color: THEME.textMuted }}>
                <strong>Two ways to share:</strong>
              </p>
              <div className="text-xs mb-2 space-y-1" style={{ color: THEME.textMuted }}>
                <p><strong>1. Write to Tag:</strong> Write wallet to a physical NFC tag, then controller scans the tag</p>
                <p><strong>2. Start Beacon:</strong> This phone acts as NFC tag - controller scans directly (most reliable)</p>
              </div>
            </>
          )}
        </AnimatedCard>

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
                  </div>
                  <motion.button
                    onClick={() => removeTicket(ticket.id)}
                    className="p-2"
                    style={{ color: THEME.accent }}
                    whileHover={{ opacity: 0.7, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Remove ticket"
                  >
                    <FiTrash2 size={20} />
                  </motion.button>
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

