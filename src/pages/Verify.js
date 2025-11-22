import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRadio, FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw, FiArrowLeft, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { checkNFC, startReading, requestNFCPermission } from '@lib/nfc-simple';
import { parseNFCTicketData } from '@lib/nfc';
import { verifyTicket, parseQRCodeData } from '@lib/ticketGenerator';
import { THEME } from '@lib/themeColors';

/**
 * Ticket Verification Page
 * For inspectors to verify tickets via NFC
 */
const Verify = memo(() => {
  const navigate = useNavigate();
  const [isReading, setIsReading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

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

  const handleReadNFC = async () => {
    setIsReading(true);
    setError(null);
    setVerificationResult(null);

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

      // Start reading NFC
      const nfcData = await startReading();
      
      // Extract ticket data - simple format returns {id, data}
      const tagId = nfcData.id || '';
      const ticketDataString = nfcData.data || tagId;

      // Parse ticket data
      const parsedData = parseNFCTicketData(ticketDataString) || parseQRCodeData(ticketDataString);
      
      // Check if this is a wallet (contains tickets array)
      if (parsedData && parsedData.wallet && Array.isArray(parsedData.tickets)) {
        // Navigate to ReceivedTickets page with wallet data
        navigate('/received', { state: { walletData: parsedData } });
        setIsReading(false);
        return;
      }
      
      if (!parsedData || (!parsedData.ticketId && !parsedData.id)) {
        setVerificationResult({
          valid: false,
          message: 'Invalid ticket format - raw NFC data available below',
          ticketId: null,
          rawTagId: tagId,
          rawData: ticketDataString,
        });
        setShowRawData(true); // Auto-expand for invalid tickets
        setIsReading(false);
        return;
      }

      // Verify ticket (in real app, this would check against database)
      const ticketId = parsedData.ticketId || parsedData.id;
      const verification = verifyTicket(parsedData);
      
      setVerificationResult({
        valid: verification.valid,
        message: verification.message,
        ticketId: ticketId,
        controlCode: parsedData.controlCode,
        origin: parsedData.origin,
        destination: parsedData.destination,
        date: parsedData.date,
        rawTagId: tagId,
        rawData: ticketDataString,
      });
      setIsReading(false);

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

  const handleManualVerify = () => {
    const input = prompt('Enter ticket ID or control code:');
    if (!input) return;

    // Try to parse as ticket data
    const parsed = parseQRCodeData(input) || { ticketId: input };
    const verification = verifyTicket(parsed);
    
    setVerificationResult({
      valid: verification.valid,
      message: verification.message,
      ticketId: parsed.ticketId || input,
      controlCode: parsed.controlCode,
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.background, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-4 sm:mb-6 text-sm font-bold transition-colors"
          style={{ color: THEME.text }}
          onMouseEnter={(e) => e.target.style.opacity = '0.7'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          <FiArrowLeft size={18} style={{ width: '18px', height: '18px' }} />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4" style={{ backgroundColor: THEME.accent, borderRadius: '8px' }}>
            <FiRadio size={32} className="text-white sm:w-10 sm:h-10" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: THEME.text, lineHeight: '1.2' }}>
            Ticket Verification
          </h1>
          <p className="text-xs sm:text-sm px-2" style={{ color: THEME.textMuted, lineHeight: '1.4' }}>
            Scan NFC tag or enter ticket code manually
          </p>
        </div>

        {/* NFC Status Display - SHOWS ON SCREEN */}
        <div className="p-3 sm:p-4 mb-4 sm:mb-6 border-2 rounded" style={{ backgroundColor: nfcAvailable ? `${THEME.accent}15` : '#ff000015', borderColor: nfcAvailable ? THEME.accent : '#ff0000' }}>
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
        <div className="p-4 sm:p-6 mb-4 sm:mb-6 rounded" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
          {/* NFC Read Button */}
          <button
            onClick={handleReadNFC}
            disabled={isReading}
            className="w-full py-4 sm:py-5 text-white transition-colors font-bold text-base sm:text-lg uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 rounded"
            style={{ backgroundColor: THEME.accent, minHeight: '56px' }}
            onMouseEnter={(e) => !isReading && !e.target.disabled && (e.target.style.backgroundColor = THEME.accentHover)}
            onMouseLeave={(e) => !isReading && !e.target.disabled && (e.target.style.backgroundColor = THEME.accent)}
          >
            {isReading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-t-2 border-b-2 border-white"></div>
                <span className="text-sm sm:text-base">Reading NFC...</span>
              </>
            ) : (
              <>
                <FiRadio size={20} className="sm:w-6 sm:h-6" style={{ width: '20px', height: '20px' }} />
                <span>Scan NFC Tag</span>
              </>
            )}
          </button>
          
          {nfcAvailable && (
            <p className="text-xs text-center mb-3" style={{ color: THEME.textMuted }}>
              Tap to request NFC permission and scan
            </p>
          )}

          {/* Manual Verification */}
          <button
            onClick={handleManualVerify}
            className="w-full py-3 sm:py-4 border-2 transition-colors font-bold text-xs sm:text-sm uppercase rounded"
            style={{ borderColor: THEME.border, color: THEME.text, backgroundColor: 'transparent', minHeight: '48px' }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = THEME.accent;
              e.target.style.backgroundColor = `${THEME.accent}10`;
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = THEME.border;
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Enter Code Manually
          </button>
        </div>

        {/* Error Display - SHOWS ON SCREEN */}
        {error && (
          <div className="p-3 sm:p-4 mb-4 sm:mb-6 border-2 rounded" style={{ backgroundColor: '#ff000015', borderColor: '#ff0000' }}>
            <div className="flex items-start gap-2">
              <FiXCircle style={{ color: '#ff0000', marginTop: '2px', flexShrink: 0 }} size={18} />
              <div className="flex-1">
                <p className="font-bold text-sm mb-1" style={{ color: '#ff0000' }}>Error</p>
                <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: '#ff0000' }}>{error}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <div 
            className="p-4 sm:p-6 border-2 rounded" 
            style={{ 
              backgroundColor: verificationResult.valid ? `${THEME.success}15` : `${THEME.accent}15`,
              borderColor: verificationResult.valid ? THEME.success : THEME.accent
            }}
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

            <button
              onClick={() => {
                setVerificationResult(null);
                setError(null);
                setShowRawData(false);
              }}
              className="mt-4 w-full py-3 sm:py-3.5 border-2 transition-colors font-bold text-xs sm:text-sm uppercase flex items-center justify-center gap-2 rounded"
              style={{ borderColor: THEME.border, color: THEME.text, minHeight: '44px' }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = THEME.accent;
                e.target.style.backgroundColor = `${THEME.accent}10`;
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = THEME.border;
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <FiRefreshCw size={16} style={{ width: '16px', height: '16px' }} />
              <span>Scan Another Ticket</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

Verify.displayName = 'Verify';

export default Verify;

