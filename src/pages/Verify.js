import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiRadio, FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw, FiArrowLeft, FiChevronDown, FiChevronUp, FiMenu } from 'react-icons/fi';
import { checkNFC, startReading, requestNFCPermission } from '@lib/nfc-simple';
import { parseNFCTicketData } from '@lib/nfc';
import { verifyTicket, parseQRCodeData } from '@lib/ticketGenerator';
// Removed signature verification - just scan tickets directly
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
  const [nfcDetection, setNfcDetection] = useState(null); // Show feedback when NFC detects something
  const [nfcSteps, setNfcSteps] = useState([]); // Step-by-step NFC process feedback
  const [debugLogs, setDebugLogs] = useState([]); // Debug logs from console
  const [showDebugPanel, setShowDebugPanel] = useState(true); // Show debug panel by default

  // Intercept console.log to show in UI
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      originalLog.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugLogs(prev => [...prev.slice(-99), { // Keep last 100 logs
        type: 'log',
        message,
        timestamp: new Date().toLocaleTimeString()
      }]);
    };
    
    console.error = (...args) => {
      originalError.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugLogs(prev => [...prev.slice(-99), {
        type: 'error',
        message,
        timestamp: new Date().toLocaleTimeString()
      }]);
    };
    
    console.warn = (...args) => {
      originalWarn.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugLogs(prev => [...prev.slice(-99), {
        type: 'warn',
        message,
        timestamp: new Date().toLocaleTimeString()
      }]);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    // Initialize global NFC listener IMMEDIATELY on component mount
    const initListener = async () => {
      try {
        const { initializeGlobalNfcListener } = await import('@lib/nfc-simple');
        console.log('🔧 Initializing global NFC listener on component mount...');
        initializeGlobalNfcListener();
        console.log('✅ Global NFC listener initialized');
      } catch (error) {
        console.error('❌ Error initializing global NFC listener:', error);
      }
    };
    initListener();
    
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
      setNfcDetection(null); // Clear previous detection
      setNfcSteps([]); // Clear previous steps

    // Listen for NFC detection events (any detection, even if not expected format)
    const detectionHandler = (event) => {
      const detection = event.detail;
      setNfcDetection({
        attempt: detection.attempt,
        tagId: detection.tagId,
        dataLength: detection.dataLength,
        dataPreview: detection.dataPreview,
        hasData: detection.hasData,
        timestamp: new Date().toLocaleTimeString()
      });
      console.log('📡 NFC Detection:', detection);
    };
    
    // Listen for step-by-step NFC process events
    const stepHandler = (event) => {
      const step = event.detail;
      console.log('📋 NFC Step Event Received:', step);
      
      // Don't add duplicate "scanning_active" events - only show it once
      if (step.step === 'scanning_active') {
        setNfcSteps(prev => {
          // Check if we already have a scanning_active step
          const hasScanningActive = prev.some(s => s.step === 'scanning_active');
          if (hasScanningActive) {
            console.log('⚠️ Duplicate scanning_active event, ignoring');
            return prev; // Don't add duplicate
          }
          // Add it if it's the first one
          return [...prev, {
            step: step.step,
            message: step.message,
            details: step.details,
            timestamp: step.timestamp || new Date().toISOString()
          }];
        });
      } else {
        // For all other events, add them normally
        setNfcSteps(prev => {
          const newSteps = [...prev, {
            step: step.step,
            message: step.message,
            details: step.details,
            timestamp: step.timestamp || new Date().toISOString()
          }];
          console.log('📋 Total steps:', newSteps.length);
          return newSteps;
        });
      }
    };
    
    window.addEventListener('nfcdetection', detectionHandler);
    window.addEventListener('nfcstep', stepHandler);

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
        const errorMsg = 'NFC is not available on this device.';
        setError(errorMsg);
        setIsReading(false);
        toast.error(errorMsg, {
          duration: 4000,
        });
        return;
      }

      if (!status.enabled) {
        const errorMsg = 'NFC is disabled. Please enable NFC in your device settings.';
        setError(errorMsg);
        setIsReading(false);
        toast.error(errorMsg, {
          duration: 4000,
        });
        return;
      }
      
      toast.loading('Scanning for NFC tag...', {
        id: 'nfc-scan',
        duration: 90000, // Long duration for scanning
      });

      // Start reading NFC - keep trying until we get wallet data
      console.log('Starting NFC read - waiting for wallet data...');
      console.log('Hold phone near NFC tag or another phone with beacon active');
      
      // Initialize global listener BEFORE starting loop
      console.log('🔧 Initializing global NFC listener...');
      const { initializeGlobalNfcListener } = await import('@lib/nfc-simple');
      // Force initialization by calling it
      if (typeof initializeGlobalNfcListener === 'function') {
        initializeGlobalNfcListener();
      }
      
      // Also manually add a test listener to verify events are received
      const testHandler = (event) => {
        console.log('🧪🧪🧪 TEST LISTENER TRIGGERED! 🧪🧪🧪');
        console.log('Event:', event);
        console.log('Event type:', event.type);
        console.log('Event detail:', event.detail);
      };
      window.addEventListener('nfctag', testHandler);
      console.log('✅ Test listener added');
      
      // SIMPLE LOOP: Keep trying until we get data
      let nfcData = null;
      let attempts = 0;
      
      console.log('🔄 Starting NFC read loop - will keep trying until data received...');
      console.log('Global listener should be active. Waiting for nfctag events...');
      
      while (!nfcData) {
        try {
          attempts++;
          if (attempts % 10 === 0) {
            console.log(`🔄 Attempt ${attempts}... (still waiting for nfctag event)`);
          }
          
          nfcData = await startReading();
          
          if (nfcData && nfcData.data) {
            console.log('✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
            console.log('✅✅✅ DATA RECEIVED:', nfcData.data.substring(0, 100));
            console.log('✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
            break;
          }
        } catch (error) {
          // Timeout is normal - just retry
          if (attempts % 10 === 0) {
            console.log(`⏱️ Attempt ${attempts} timeout, retrying...`);
          }
          nfcData = null;
        }
        
        // Small delay before next attempt
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Cleanup test listener
      window.removeEventListener('nfctag', testHandler);
      
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
        toast.dismiss('nfc-scan');
        toast.success(`Received wallet with ${parsedData.tickets.length} ticket(s)!`, {
          icon: '📱',
          duration: 3000,
        });
        // Navigate to ReceivedTickets page with wallet data
        navigate('/received', { state: { walletData: parsedData } });
        setIsReading(false);
        return;
      }
      
               // Check if this is a test message
               if (parsedData && parsedData.test) {
                 console.log('✅✅✅ TEST MESSAGE RECEIVED:', parsedData.test);
                 toast.dismiss('nfc-scan');
                 toast.success(`🎉 ${parsedData.test}! NFC Communication Works!`, {
                   icon: '🎉',
                   duration: 5000,
                 });
                 
                 await setVerificationResultWithCooldown({
                   valid: true,
                   message: `✅ TEST SUCCESSFUL: ${parsedData.test}`,
                   ticketId: 'TEST',
                   origin: null,
                   destination: null,
                   date: null,
                   rawTagId: tagId,
                   rawData: ticketDataString,
                   isTicket: false,
                 });
                 return;
               }
               
               // Check if this is a ticket JSON (simple format)
               if (parsedData && parsedData.ticket === true) {
                 console.log('Ticket JSON detected:', parsedData);
                 toast.dismiss('nfc-scan');
                 
                 // Just verify it's a valid ticket structure
                 const isValid = parsedData.id && (parsedData.price || parsedData.ticketId);
                 
                 if (isValid) {
                   toast.success('Ticket received!', {
                     icon: '✅',
                     duration: 3000,
                   });
                 } else {
                   toast.error('Invalid ticket format', {
                     icon: '❌',
                     duration: 4000,
                   });
                 }
                 
                 await setVerificationResultWithCooldown({
                   valid: isValid,
                   message: isValid 
                     ? 'Ticket received successfully. Ticket ID: ' + (parsedData.id || parsedData.ticketId)
                     : 'Invalid ticket format. Missing required fields.',
                   ticketId: parsedData.id || parsedData.ticketId,
                   origin: parsedData.origin || null,
                   destination: parsedData.destination || null,
                   date: parsedData.date || parsedData.timestamp || null,
                   rawTagId: tagId,
                   rawData: ticketDataString,
                   isTicket: true,
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
      
      toast.dismiss('nfc-scan');
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
        ticketId: ticketId,
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
      toast.dismiss('nfc-scan');
      // Show detailed error message on screen
      const errorMsg = error.message || 'Failed to read NFC tag';
      setError(errorMsg);
      
      // If it's a plugin not found error, show more details
      if (errorMsg.includes('plugin not found')) {
        const fullError = `NFC Plugin Error:\n\n${errorMsg}\n\nThis means the Android plugin is not registered. The app needs to be rebuilt with NFC support.`;
        setError(fullError);
        toast.error('NFC plugin not found. App needs to be rebuilt.', {
          duration: 6000,
        });
      } else {
        toast.error(errorMsg, {
          duration: 5000,
        });
      }
    } finally {
      setIsReading(false);
      // Clean up event listeners
      window.removeEventListener('nfcdetection', detectionHandler);
      window.removeEventListener('nfcstep', stepHandler);
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

        {/* NFC Detection Feedback */}
        <AnimatePresence>
          {nfcDetection && isReading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 sm:p-4 mb-4 sm:mb-6 border-2 rounded-lg"
              style={{ 
                backgroundColor: `${THEME.accent}15`,
                borderColor: THEME.accent,
                borderRadius: '8px'
              }}
            >
              <div className="flex items-start gap-2">
                <FiRadio style={{ color: THEME.accent, marginTop: '2px', flexShrink: 0 }} size={18} />
                <div className="flex-1">
                  <p className="text-xs font-bold mb-1" style={{ color: THEME.accent }}>
                    📡 NFC Detected (Attempt {nfcDetection.attempt})
                  </p>
                  {nfcDetection.tagId && (
                    <p className="text-xs mb-1" style={{ color: THEME.textMuted }}>
                      Tag ID: {nfcDetection.tagId.substring(0, 16)}...
                    </p>
                  )}
                  {nfcDetection.hasData ? (
                    <p className="text-xs" style={{ color: THEME.textMuted }}>
                      Data: {nfcDetection.dataLength} chars - {nfcDetection.dataPreview.substring(0, 50)}...
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: THEME.textMuted }}>
                      Tag detected but no readable data yet...
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: THEME.textMuted }}>
                    {nfcDetection.timestamp}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step-by-Step NFC Process Feedback - ALWAYS VISIBLE WHEN READING */}
        {(isReading || nfcSteps.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 sm:p-4 mb-4 sm:mb-6 border-2 rounded-lg"
              style={{ 
                backgroundColor: THEME.card,
                borderColor: THEME.border,
                borderRadius: '8px'
              }}
            >
              <div className="flex items-start gap-2 mb-2">
                <FiRefreshCw style={{ color: THEME.accent, marginTop: '2px', flexShrink: 0 }} size={18} />
                <p className="text-xs font-bold" style={{ color: THEME.text }}>
                  📋 NFC Process Steps {isReading ? '(Scanning...)' : `(${nfcSteps.length})`}
                </p>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {nfcSteps.length === 0 && isReading ? (
                  <div className="text-xs p-2" style={{ color: THEME.textMuted }}>
                    Waiting for NFC tag... Hold phones back-to-back
                  </div>
                ) : (
                  nfcSteps.map((step, index) => {
                  const stepIcons = {
                    'tag_detected': '🏷️',
                    'scanning_enabled': '🔄',
                    'scanning_active': '🔄', // Changed from 🔥 to 🔄 to be less prominent
                    'scanning_error': '❌',
                    'reader_mode_started': '🔄',
                    'reader_mode_error': '❌',
                    'foreground_dispatch_enabled': '🔥',
                    'foreground_dispatch_error': '❌',
                    'iso_dep_found': '✅',
                    'iso_dep_connecting': '🔌',
                    'iso_dep_connected': '✅',
                    'select_sending': '📤',
                    'select_response': '📥',
                    'select_success': '✅',
                    'select_failed': '❌',
                    'getdata_sending': '📤',
                    'getdata_response': '📥',
                    'data_received': '✅',
                    'read_error': '❌',
                    'hce_activated': '✅',
                    'hce_failed': '❌',
                    'p2p_activated': '📱',
                    'p2p_sending': '📤',
                    'p2p_received': '📥',
                    'p2p_data_received': '✅',
                    'p2p_error': '❌',
                    'hce_start': '🔄',
                    'hce_iso_dep_found': '✅',
                    'hce_connecting': '🔌',
                    'hce_connected': '✅',
                    'hce_select_sending': '📤',
                    'hce_select_response': '📥',
                    'hce_select_success': '✅',
                    'hce_getdata_sending': '📤',
                    'hce_getdata_response': '📥',
                    'hce_data_parsed': '✅',
                    'hce_data_invalid': '⚠️',
                    'hce_select_failed': '❌',
                    'hce_not_supported': 'ℹ️',
                    'hce_error': '❌',
                    'hce_connect_failed': '❌',
                    'error': '❌'
                  };
                  const icon = stepIcons[step.step] || '📋';
                  const isError = step.step.includes('error') || step.step.includes('failed') || step.step.includes('invalid');
                  const isSuccess = step.step.includes('success') || step.step.includes('parsed') || step.step === 'hce_connected';
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 text-xs"
                      style={{ 
                        color: isError ? '#ff0000' : isSuccess ? THEME.accent : THEME.textMuted,
                        paddingLeft: '8px',
                        borderLeft: `2px solid ${isError ? '#ff0000' : isSuccess ? THEME.accent : THEME.border}`
                      }}
                    >
                      <span className="flex-shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium break-words">{step.message}</p>
                        {step.details && (
                          <p className="text-xs mt-0.5 opacity-75 break-words" style={{ color: THEME.textMuted }}>
                            {step.details}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                  })
                )}
              </div>
            </motion.div>
        )}

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
                  {verificationResult.valid ? 'Ticket Valid' : 'Ticket Invalid'}
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

        {/* Debug Logs Panel */}
        <AnimatePresence>
          {showDebugPanel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-4 sm:mb-6 rounded-lg border-2"
              style={{ 
                backgroundColor: THEME.card, 
                borderColor: THEME.border,
                maxHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div 
                className="p-2 sm:p-3 flex items-center justify-between border-b-2"
                style={{ borderColor: THEME.border }}
              >
                <h3 className="text-sm sm:text-base font-bold" style={{ color: THEME.text }}>
                  📋 Debug Logs ({debugLogs.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDebugLogs([])}
                    className="px-2 py-1 text-xs rounded"
                    style={{ 
                      backgroundColor: THEME.accent + '20',
                      color: THEME.accent,
                      border: `1px solid ${THEME.accent}`
                    }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowDebugPanel(false)}
                    className="px-2 py-1 text-xs rounded"
                    style={{ 
                      backgroundColor: THEME.border + '20',
                      color: THEME.text,
                      border: `1px solid ${THEME.border}`
                    }}
                  >
                    Hide
                  </button>
                </div>
              </div>
              <div 
                className="overflow-y-auto p-2 sm:p-3 space-y-1"
                style={{ maxHeight: '350px' }}
              >
                {debugLogs.length === 0 ? (
                  <p className="text-xs text-center p-4" style={{ color: THEME.textMuted }}>
                    No logs yet. Start scanning to see debug output.
                  </p>
                ) : (
                  debugLogs.map((log, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 rounded border-l-2"
                      style={{
                        backgroundColor: log.type === 'error' 
                          ? '#ff000010' 
                          : log.type === 'warn'
                          ? '#ffaa0010'
                          : THEME.card,
                        borderLeftColor: log.type === 'error'
                          ? '#ff0000'
                          : log.type === 'warn'
                          ? '#ffaa00'
                          : THEME.accent,
                        color: log.type === 'error'
                          ? '#ff0000'
                          : log.type === 'warn'
                          ? '#ffaa00'
                          : THEME.text
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs opacity-60 flex-shrink-0" style={{ color: THEME.textMuted }}>
                          {log.timestamp}
                        </span>
                        <span className="flex-1 break-words font-mono">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showDebugPanel && (
          <button
            onClick={() => setShowDebugPanel(true)}
            className="w-full py-2 text-xs rounded-lg mb-4"
            style={{ 
              backgroundColor: THEME.border + '20',
              color: THEME.text,
              border: `1px solid ${THEME.border}`
            }}
          >
            Show Debug Logs
          </button>
        )}
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </motion.div>
  );
});

Verify.displayName = 'Verify';

export default Verify;

