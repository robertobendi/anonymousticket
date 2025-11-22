import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiRadio, FiTrash2, FiSend, FiCreditCard, FiGlobe, FiAlertCircle } from 'react-icons/fi';
import { useWallet, getWalletForNFC } from '@lib/wallet';
import { writeNFC, startBeacon, stopBeacon } from '@lib/nfc-simple';
import { checkNFC } from '@lib/nfc-simple';
import { THEME } from '@lib/themeColors';

/**
 * Wallet page - View tickets and send wallet via NFC
 */
const Wallet = memo(() => {
  const navigate = useNavigate();
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
      
      await startBeacon(walletJson);
      setIsBeaconActive(true);
      setSendSuccess(true);
      setIsSending(false);
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
    <div className="min-h-screen" style={{ backgroundColor: THEME.background }}>
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-bold transition-colors"
            style={{ color: THEME.text }}
            onMouseEnter={(e) => e.target.style.opacity = '0.7'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            <FiArrowLeft size={18} />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold" style={{ color: THEME.text }}>
            My Wallet
          </h1>
          <div style={{ width: '60px' }}></div> {/* Spacer for centering */}
        </div>

        {/* NFC Send Section */}
        <div className="p-4 mb-6" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold mb-1" style={{ color: THEME.text }}>
              Share Tickets via NFC
            </h2>
            <p className="text-xs mb-3" style={{ color: THEME.textMuted }}>
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} in wallet
            </p>
            
            {/* Two modes: Write to tag, or Beacon mode */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={handleSendWallet}
                disabled={isSending || tickets.length === 0 || !nfcAvailable}
                className="px-4 py-3 text-white transition-colors font-bold text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2"
                style={{ backgroundColor: THEME.accent }}
                onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = THEME.accentHover)}
                onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = THEME.accent)}
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <FiSend size={18} />
                    <span>Write to Tag</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleStartBeacon}
                disabled={isBeaconActive || tickets.length === 0 || !nfcAvailable}
                className="px-4 py-3 text-white transition-colors font-bold text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2"
                style={{ backgroundColor: isBeaconActive ? THEME.success : THEME.accent }}
                onMouseEnter={(e) => !e.target.disabled && !isBeaconActive && (e.target.style.backgroundColor = THEME.accentHover)}
                onMouseLeave={(e) => !e.target.disabled && !isBeaconActive && (e.target.style.backgroundColor = isBeaconActive ? THEME.success : THEME.accent)}
              >
                <FiRadio size={18} />
                <span>{isBeaconActive ? 'Beacon Active' : 'Start Beacon'}</span>
              </button>
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

          {sendSuccess && (
            <div className="p-3 mb-3" style={{ backgroundColor: `${THEME.success}15`, borderLeft: `4px solid ${THEME.success}` }}>
              <p className="text-xs" style={{ color: THEME.success }}>
                Wallet sent successfully! Hold your device near the receiver.
              </p>
            </div>
          )}

          {isBeaconActive ? (
            <div className="p-3 mb-3" style={{ backgroundColor: `${THEME.success}15`, borderLeft: `4px solid ${THEME.success}` }}>
              <p className="text-xs font-bold mb-1" style={{ color: THEME.success }}>
                ✓ Beacon Active - Controller can scan this phone
              </p>
              <p className="text-xs" style={{ color: THEME.textMuted }}>
                Hold this phone near the controller's device. Click "Start Beacon" again to stop.
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
        </div>

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <div className="p-8 text-center" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
            <FiCreditCard size={48} style={{ color: THEME.textMuted, margin: '0 auto 16px' }} />
            <p className="text-sm font-bold mb-2" style={{ color: THEME.text }}>
              No tickets in wallet
            </p>
            <p className="text-xs" style={{ color: THEME.textMuted }}>
              Purchase tickets to add them to your wallet
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 text-white transition-colors font-bold text-sm"
              style={{ backgroundColor: THEME.accent }}
              onMouseEnter={(e) => e.target.style.backgroundColor = THEME.accentHover}
              onMouseLeave={(e) => e.target.style.backgroundColor = THEME.accent}
            >
              Buy Tickets
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4"
                style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}
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
                  <button
                    onClick={() => removeTicket(ticket.id)}
                    className="p-2 transition-colors"
                    style={{ color: THEME.accent }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                    aria-label="Remove ticket"
                  >
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

Wallet.displayName = 'Wallet';

export default Wallet;

