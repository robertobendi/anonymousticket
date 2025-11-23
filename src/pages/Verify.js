import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRadio, FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw, FiArrowLeft, FiChevronDown, FiChevronUp, FiMenu } from 'react-icons/fi';
import { checkNFC, startReading, requestNFCPermission } from '@lib/nfc-simple';
import { parseNFCTicketData } from '@lib/nfc';
import { verifyTicket, parseQRCodeData } from '@lib/ticketGenerator';
import { verifyTicketSignatureMessage } from '@lib/crypto';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';
import MobileSidebar from '@components/ui/MobileSidebar';

/**
 * Ticket Verification Page
 * For inspectors to verify tickets via NFC
 */
const Verify = memo(() => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check NFC availability - don't request permission on load to avoid blocking
    const checkNFCStatus = async () => {
      try {
        // Wait a bit for WebView interface to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check status
        const status = await checkNFC();
        setNfcAvailable(status.available && status.enabled);
        console.log('NFC status:', status);
      } catch (error) {
        console.error('NFC check failed:', error);
        setNfcAvailable(false);
      }
    };
    checkNFCStatus();
  }, []);

  // Helper function to set verification result with cooldown
  const setVerificationResultWithCooldown = async (result) => {
    setIsVerifying(true);
    setIsReading(false);
    
    // Wait for cooldown (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsVerifying(false);
    setVerificationResult(result);
  };

  const handleReadNFC = async () => {
    setIsReading(true);
    setError(null);
    setVerificationResult(null);
    setIsVerifying(false);

    try {
      // Request NFC permission first (shows Android system dialog)
      try {
        await requestNFCPermission();
      } catch (e) {
        console.warn('Permission request error (continuing anyway):', e);
        // Continue anyway - permission might already be granted
      }

      // Check if NFC is available
      const status = await checkNFC();
      if (!status.available) {
        setError('NFC is not available on this device.');
        setIsReading(false);
        return;
      }

      if (!status.enabled) {
        setError('NFC is disabled. Please enable NFC in your device settings.');
        setIsReading(false);
        return;
      }

      // Start reading NFC - keep trying until we get wallet data
      console.log('Starting NFC read - waiting for wallet data...');
      console.log('Hold phone near NFC tag or another phone with beacon active');
      
      // For continuous mode, keep reading until we get data
      let nfcData;
      if (isContinuousMode) {
        // Keep reading in a loop
        while (true) {
          try {
            nfcData = await startReading();
            console.log('NFC read completed:', nfcData);
            break; // Got data, exit loop
          } catch (error) {
            console.log('Read attempt failed, continuing...', error.message);
            // Continue trying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        nfcData = await startReading();
        console.log('NFC read completed:', nfcData);
      }
      
      // Extract ticket data - simple format returns {id, data}
      const tagId = nfcData.id || '';
      const ticketDataString = nfcData.data || tagId;

      // Parse ticket data
      console.log('Parsing NFC data:', ticketDataString?.substring(0, 200));
      const parsedData = parseNFCTicketData(ticketDataString) || parseQRCodeData(ticketDataString);
      console.log('Parsed data:', parsedData);
      
      // Check if this is a wallet (contains tickets array) - from beacon mode
      if (parsedData && parsedData.wallet && Array.isArray(parsedData.tickets)) {
        console.log('Wallet detected with', parsedData.tickets.length, 'tickets');
        // Navigate to ReceivedTickets page with wallet data
        navigate('/received', { state: { walletData: parsedData } });
        setIsReading(false);
        return;
      }
      
      // Check if this is a signature message (for ticket validation)
      if (parsedData && parsedData.type === 'signature_message' && parsedData.messageHex) {
        console.log('Signature message detected, verifying...');
        const isValid = verifyTicketSignatureMessage(parsedData.messageHex);
        
        // Extract public key from message for display
        const publicKeyHex = parsedData.messageHex.substring(0, 64); // First 64 hex chars = 32 bytes
        
        await setVerificationResultWithCooldown({
          valid: isValid,
          message: isValid 
            ? 'Ticket signature verified successfully. Challenge "autism" validated.' 
            : 'Ticket signature verification failed. Invalid signature or corrupted data.',
          ticketId: publicKeyHex,
          controlCode: null,
          origin: null,
          destination: null,
          date: null,
          rawTagId: tagId,
          rawData: ticketDataString,
          isSignatureVerification: true,
        });
        return;
      }
      
      // Check if parsed data is valid
      if (!parsedData || (!parsedData.ticketId && !parsedData.id)) {
        console.warn('Invalid ticket format - no ticket ID found');
        await setVerificationResultWithCooldown({
          valid: false,
          message: 'Invalid ticket format - no ticket ID found. Raw NFC data available below.',
          ticketId: null,
          controlCode: null,
          origin: null,
          destination: null,
          date: null,
          rawTagId: tagId,
          rawData: ticketDataString,
        });
        setShowRawData(true); // Auto-expand for invalid tickets
        return;
      }

      // Verify ticket - Controller validation
      const ticketId = parsedData.ticketId || parsedData.id;
      console.log('Verifying ticket:', ticketId);
      const verification = verifyTicket({
        ...parsedData,
        ticketId: ticketId, // Ensure ticketId is set
        id: ticketId, // Also set id for compatibility
      });
      console.log('Verification result:', verification);
      
      await setVerificationResultWithCooldown({
        valid: verification.valid,
        message: verification.message,
        ticketId: ticketId,
        controlCode: parsedData.controlCode,
        origin: parsedData.origin,
        destination: parsedData.destination,
        date: parsedData.date,
        validUntil: parsedData.validUntil,
        validFrom: parsedData.validFrom,
        type: parsedData.type,
        passType: parsedData.passType,
        expired: verification.expired,
        future: verification.future,
        rawTagId: tagId,
        rawData: ticketDataString,
      });

    } catch (error) {
      console.error('NFC read error:', error);
      // Show detailed error message on screen
      const errorMsg = error.message || 'Failed to read NFC tag';
      setError(errorMsg);
      
      // If it's a plugin not found error, show more details
      if (errorMsg.includes('plugin not found')) {
        setError(`NFC Plugin Error:\n\n${errorMsg}\n\nThis means the Android plugin is not registered. The app needs to be rebuilt with NFC support.`);
      }
    } finally {
      setIsReading(false);
    }
  };

  const handleManualVerify = async () => {
    const input = prompt('Enter ticket ID or control code:');
    if (!input) return;

    // Try to parse as ticket data
    const parsed = parseQRCodeData(input) || { ticketId: input };
    const verification = verifyTicket(parsed);
    
    await setVerificationResultWithCooldown({
      valid: verification.valid,
      message: verification.message,
      ticketId: parsed.ticketId || input,
      controlCode: parsed.controlCode,
    });
  };

  return (
    <motion.div 
      className="min-h-screen" 
      style={{ backgroundColor: THEME.background, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        {/* Header with Menu Button */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-bold min-h-[44px]"
            style={{ color: THEME.text }}
            whileHover={{ opacity: 0.7 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiArrowLeft size={18} style={{ width: '18px', height: '18px' }} />
            <span className="hidden sm:inline">Back</span>
          </motion.button>
          
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
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-6 sm:mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4" 
            style={{ backgroundColor: THEME.accent, borderRadius: '8px' }}
            animate={isReading ? { 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            } : {}}
            transition={{ 
              duration: 2, 
              repeat: isReading ? Infinity : 0,
              ease: 'easeInOut'
            }}
          >
            <FiRadio size={32} className="text-white sm:w-10 sm:h-10" style={{ width: '32px', height: '32px' }} />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: THEME.text, lineHeight: '1.2' }}>
            Ticket Verification
          </h1>
          <p className="text-xs sm:text-sm px-2" style={{ color: THEME.textMuted, lineHeight: '1.4' }}>
            Scan NFC tag, beacon (phone-to-phone), or enter ticket code manually
          </p>
        </motion.div>

        {/* NFC Status Display - SHOWS ON SCREEN */}
        <div className="p-3 sm:p-4 mb-4 sm:mb-6 border-2 rounded-lg" style={{ backgroundColor: nfcAvailable ? `${THEME.accent}15` : '#ff000015', borderColor: nfcAvailable ? THEME.accent : '#ff0000', borderRadius: '8px' }} role="status" aria-live="polite">
          <div className="flex items-start gap-2 mb-2">
            <FiAlertCircle size={20} style={{ color: nfcAvailable ? THEME.accent : '#ff0000', marginTop: '2px' }} />
            <div className="flex-1">
              <p className="font-bold text-sm mb-1" style={{ color: nfcAvailable ? THEME.accent : '#ff0000' }}>
                {nfcAvailable ? 'NFC Ready' : 'NFC Not Available'}
              </p>
              <p className="text-xs" style={{ color: THEME.textMuted }}>
                {nfcAvailable 
                  ? 'NFC is enabled and ready to read tags'
                  : 'NFC plugin not found. Check if app was built correctly with NFC support.'}
              </p>
            </div>
          </div>
        </div>

        {/* NFC Availability Warning - OLD */}
        {false && !nfcAvailable && (
          <div className="p-3 sm:p-4 mb-4 sm:mb-6 border-2 rounded" style={{ backgroundColor: `${THEME.accent}15`, borderColor: THEME.accent }}>
            <div className="flex items-start gap-2 mb-2">
              <FiAlertCircle style={{ color: THEME.accent, marginTop: '2px', flexShrink: 0 }} size={18} />
              <div>
                <span className="font-bold text-sm sm:text-base block mb-1" style={{ color: THEME.text }}>NFC Not Available</span>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: THEME.textMuted }}>
                  Please ensure NFC is enabled on your device. You can also use manual code entry.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Card */}
        <AnimatedCard className="p-4 sm:p-6 mb-4 sm:mb-6 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          {/* NFC Read Button */}
          <AnimatedButton
            onClick={handleReadNFC}
            disabled={isReading}
            loading={isReading}
            variant="primary"
            className="w-full py-4 sm:py-5 text-base sm:text-lg mb-3 sm:mb-4 rounded-lg"
            icon={FiRadio}
            aria-label={isReading ? 'Reading NFC tag' : 'Scan NFC tag or beacon'}
          >
            {isReading ? 'Reading NFC...' : 'Scan NFC Tag / Beacon'}
          </AnimatedButton>
          
          {nfcAvailable && (
            <p className="text-xs text-center mb-3" style={{ color: THEME.textMuted }}>
              Tap to request NFC permission and scan
            </p>
          )}

          {/* Manual Verification */}
          <AnimatedButton
            onClick={handleManualVerify}
            variant="secondary"
            className="w-full py-3 sm:py-4 text-xs sm:text-sm rounded-lg"
            aria-label="Enter ticket code manually"
          >
            Enter Code Manually
          </AnimatedButton>
        </AnimatedCard>

        {/* Error Display - SHOWS ON SCREEN */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 sm:p-4 mb-4 sm:mb-6 border-2 rounded-lg" 
              style={{ backgroundColor: '#ff000015', borderColor: '#ff0000', borderRadius: '8px' }}
              role="alert"
              aria-live="assertive"
            >
            <div className="flex items-start gap-2">
              <FiXCircle style={{ color: '#ff0000', marginTop: '2px', flexShrink: 0 }} size={18} />
              <div className="flex-1">
                <p className="font-bold text-sm mb-1" style={{ color: '#ff0000' }}>Error</p>
                <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: '#ff0000' }}>{error}</pre>
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Cooldown Loading */}
        <AnimatePresence>
          {isVerifying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 sm:p-8 border-2 rounded-lg mb-4 sm:mb-6"
              style={{ 
                backgroundColor: `${THEME.accent}15`,
                borderColor: THEME.accent,
                borderRadius: '12px'
              }}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: THEME.accent }}
                >
                  <FiRadio size={32} className="text-white" style={{ width: '32px', height: '32px' }} />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-lg font-bold mb-2" style={{ color: THEME.text }}>
                    Verifying Ticket...
                  </h3>
                  <p className="text-sm" style={{ color: THEME.textMuted }}>
                    Please wait while we verify the ticket
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Result */}
        <AnimatePresence>
          {verificationResult && !isVerifying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 sm:p-6 border-2 rounded-lg" 
              style={{ 
                backgroundColor: verificationResult.valid ? `${THEME.success}15` : `${THEME.accent}15`,
                borderColor: verificationResult.valid ? THEME.success : THEME.accent,
                borderRadius: '8px'
              }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
            <div className="flex items-start gap-3 mb-4">
              {verificationResult.valid ? (
                <FiCheckCircle size={28} className="sm:w-8 sm:h-8 flex-shrink-0" style={{ color: THEME.success, width: '28px', height: '28px', marginTop: '2px' }} />
              ) : (
                <FiXCircle size={28} className="sm:w-8 sm:h-8 flex-shrink-0" style={{ color: THEME.accent, width: '28px', height: '28px', marginTop: '2px' }} />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold mb-1" style={{ color: THEME.text, lineHeight: '1.2' }}>
                  {verificationResult.isSignatureVerification 
                    ? (verificationResult.valid ? 'Signature Verified ✓' : 'Signature Invalid ✗')
                    : (verificationResult.valid ? 'Ticket Valid' : 'Ticket Invalid')}
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: THEME.textMuted }}>
                  {verificationResult.message}
                </p>
              </div>
            </div>

            {/* Raw NFC Data - Always show if available, expandable */}
            {(verificationResult.rawTagId || verificationResult.rawData) && (
              <div className="mb-4">
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="w-full flex items-center justify-between p-3 rounded border transition-colors"
                  style={{ 
                    backgroundColor: showRawData ? `${THEME.accent}10` : 'transparent',
                    borderColor: THEME.border 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = THEME.accent;
                    e.currentTarget.style.backgroundColor = `${THEME.accent}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = THEME.border;
                    e.currentTarget.style.backgroundColor = showRawData ? `${THEME.accent}10` : 'transparent';
                  }}
                >
                  <span className="text-xs sm:text-sm font-bold" style={{ color: THEME.text }}>
                    📡 Raw NFC Data {showRawData ? '(Click to hide)' : '(Click to read more)'}
                  </span>
                  {showRawData ? (
                    <FiChevronUp size={18} style={{ color: THEME.text }} />
                  ) : (
                    <FiChevronDown size={18} style={{ color: THEME.text }} />
                  )}
                </button>
                
                {showRawData && (
                  <div className="mt-2 p-3 rounded border" style={{ backgroundColor: `${THEME.background}`, borderColor: THEME.border }}>
                    <div className="space-y-2.5">
                      {verificationResult.rawTagId && (
                        <div>
                          <span className="text-xs font-bold block mb-1" style={{ color: THEME.textMuted }}>Tag ID:</span>
                          <span className="font-mono text-xs break-all block p-2 rounded" style={{ backgroundColor: `${THEME.accent}10`, color: THEME.text }}>
                            {verificationResult.rawTagId}
                          </span>
                        </div>
                      )}
                      {verificationResult.rawData && (
                        <div>
                          <span className="text-xs font-bold block mb-1" style={{ color: THEME.textMuted }}>Data Read:</span>
                          <span className="font-mono text-xs break-all block p-2 rounded whitespace-pre-wrap" style={{ backgroundColor: `${THEME.accent}10`, color: THEME.text }}>
                            {verificationResult.rawData}
                          </span>
                        </div>
                      )}
                      {!verificationResult.rawData && verificationResult.rawTagId && (
                        <p className="text-xs italic" style={{ color: THEME.textMuted }}>
                          No data found on tag, only Tag ID available
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parsed Ticket Information */}
            {verificationResult.ticketId && (
              <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm mb-4">
                <div className="flex justify-between items-start gap-2">
                  <span className="flex-shrink-0" style={{ color: THEME.textMuted }}>Ticket ID:</span>
                  <span className="font-mono font-bold text-right break-all" style={{ color: THEME.text }}>
                    {verificationResult.ticketId}
                  </span>
                </div>
                {verificationResult.controlCode && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="flex-shrink-0" style={{ color: THEME.textMuted }}>Control Code:</span>
                    <span className="font-mono font-bold text-right break-all" style={{ color: THEME.accent }}>
                      {verificationResult.controlCode}
                    </span>
                  </div>
                )}
                {verificationResult.origin && verificationResult.destination && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="flex-shrink-0" style={{ color: THEME.textMuted }}>Route:</span>
                    <span className="font-bold text-right break-words" style={{ color: THEME.text }}>
                      {verificationResult.origin} → {verificationResult.destination}
                    </span>
                  </div>
                )}
                {verificationResult.date && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="flex-shrink-0" style={{ color: THEME.textMuted }}>Date:</span>
                    <span className="text-right" style={{ color: THEME.text }}>
                      {new Date(verificationResult.date).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <AnimatedButton
              onClick={() => {
                setVerificationResult(null);
                setError(null);
                setShowRawData(false);
              }}
              variant="secondary"
              className="mt-4 w-full py-3 sm:py-3.5 text-xs sm:text-sm rounded-lg"
              icon={FiRefreshCw}
              aria-label="Scan another ticket"
            >
              Scan Another Ticket
            </AnimatedButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </motion.div>
  );
});

Verify.displayName = 'Verify';

export default Verify;

