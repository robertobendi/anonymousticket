import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw, FiArrowLeft, FiChevronDown, FiChevronUp, FiMenu, FiCamera } from 'react-icons/fi';
import { verifyTicket, parseQRCodeData } from '@lib/ticketGenerator';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';
import MobileSidebar from '@components/ui/MobileSidebar';
import QrScanner from 'react-qr-scanner';

/**
 * Ticket Verification Page
 * For inspectors to verify tickets via QR Code
 */
const Verify = memo(() => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Helper function to set verification result with cooldown
  const setVerificationResultWithCooldown = async (result) => {
    setIsVerifying(true);
    setIsScanning(false);
    
    // Wait for cooldown (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsVerifying(false);
    setVerificationResult(result);
  };

  const handleScan = async (data) => {
    if (data) {
      // data is object { text: string } or string
      const qrText = data?.text || data;
      console.log('QR Data:', qrText);
      
      setIsScanning(false);
      
      // Parse QR data
      const parsedData = parseQRCodeData(qrText);
      
      if (!parsedData) {
        setError('Invalid QR Code format');
        toast.error('Invalid QR Code format');
        return;
      }

      console.log('Verifying ticket:', parsedData.id);
      const verification = verifyTicket(parsedData);
      console.log('Verification result:', verification);
      
      if (verification.valid) {
        toast.success('Ticket is valid!', {
          icon: '✅',
          duration: 3000,
        });
      } else {
        toast.error(verification.message || 'Ticket is invalid', {
          icon: '❌',
          duration: 4000,
        });
      }
      
      await setVerificationResultWithCooldown({
        valid: verification.valid,
        message: verification.message,
        ticketId: parsedData.id,
        origin: parsedData.origin,
        destination: parsedData.destination,
        date: parsedData.date,
        validUntil: parsedData.validUntil,
        validFrom: parsedData.validFrom,
        type: parsedData.type,
        passType: parsedData.passType,
        expired: verification.expired,
        future: verification.future,
        rawData: qrText,
      });
    }
  };

  const handleError = (err) => {
    console.error('QR Scan Error:', err);
    // Don't show error to user immediately as it might be temporary frame error
  };

  const handleManualVerify = async () => {
    const input = prompt('Enter ticket ID or control code:');
    if (!input) return;

    // Try to parse as ticket data (simulated) or just use ID
    const parsed = { id: input }; 
    // In a real app, manual entry would likely just be the ID or control code
    // and we'd look it up in a backend. Here we just check if it looks valid-ish.
    
    // Since we can't fully verify without the full data string that comes in QR,
    // we'll do a basic check.
    const verification = verifyTicket(parsed);
    
    await setVerificationResultWithCooldown({
      valid: verification.valid,
      message: verification.message,
      ticketId: parsed.id,
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
          >
            <FiCamera size={32} className="text-white sm:w-10 sm:h-10" style={{ width: '32px', height: '32px' }} />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: THEME.text, lineHeight: '1.2' }}>
            Ticket Verification
          </h1>
          <p className="text-xs sm:text-sm px-2" style={{ color: THEME.textMuted, lineHeight: '1.4' }}>
            Scan QR Code or enter ticket code manually
          </p>
        </motion.div>

        {/* Verification Card */}
        <AnimatedCard className="p-4 sm:p-6 mb-4 sm:mb-6 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          {/* QR Scan Button / View */}
          {isScanning ? (
            <div className="mb-4 overflow-hidden rounded-lg border-2 border-accent relative" style={{ borderColor: THEME.accent }}>
               <QrScanner
                  delay={300}
                  onError={handleError}
                  onScan={handleScan}
                  style={{ width: '100%' }}
                  constraints={{
                    video: { facingMode: 'environment' }
                  }}
                />
                <button 
                  onClick={() => setIsScanning(false)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"
                >
                  <FiXCircle size={24} />
                </button>
                <p className="text-center text-white bg-black/50 absolute bottom-0 w-full py-2 text-sm">
                  Point camera at QR Code
                </p>
            </div>
          ) : (
            <AnimatedButton
              onClick={() => {
                setIsScanning(true);
                setVerificationResult(null);
                setError(null);
              }}
              variant="primary"
              className="w-full py-4 sm:py-5 text-base sm:text-lg mb-3 sm:mb-4 rounded-lg"
              icon={FiCamera}
              aria-label="Scan QR Code"
            >
              Scan QR Code
            </AnimatedButton>
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

        {/* Error Display */}
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
                  <FiRefreshCw size={32} className="text-white" style={{ width: '32px', height: '32px' }} />
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
                  {verificationResult.valid ? 'Ticket Valid' : 'Ticket Invalid'}
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: THEME.textMuted }}>
                  {verificationResult.message}
                </p>
              </div>
            </div>

            {/* Raw QR Data - Always show if available, expandable */}
            {verificationResult.rawData && (
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
                    📡 Raw QR Data {showRawData ? '(Click to hide)' : '(Click to read more)'}
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
                      <div>
                        <span className="text-xs font-bold block mb-1" style={{ color: THEME.textMuted }}>Data Read:</span>
                        <span className="font-mono text-xs break-all block p-2 rounded whitespace-pre-wrap" style={{ backgroundColor: `${THEME.accent}10`, color: THEME.text }}>
                          {verificationResult.rawData}
                        </span>
                      </div>
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
                setIsScanning(true);
              }}
              variant="secondary"
              className="mt-4 w-full py-3 sm:py-3.5 text-xs sm:text-sm rounded-lg"
              icon={FiCamera}
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