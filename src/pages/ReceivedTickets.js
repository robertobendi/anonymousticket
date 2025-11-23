import { useState, useEffect, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiCreditCard, FiGlobe, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { verifyTicket } from '@lib/ticketGenerator';
import { THEME } from '@lib/themeColors';

/**
 * Received Tickets page - Display tickets received via NFC
 */
const ReceivedTickets = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [receivedData, setReceivedData] = useState(null);
  const [verificationResults, setVerificationResults] = useState({});

  useEffect(() => {
    // Get data from location state (passed from Verify page)
    if (location.state && location.state.walletData) {
      setReceivedData(location.state.walletData);
      
      // Verify all tickets
      const results = {};
      if (location.state.walletData.tickets && Array.isArray(location.state.walletData.tickets)) {
        location.state.walletData.tickets.forEach((ticket) => {
          results[ticket.id] = verifyTicket(ticket);
        });
      }
      setVerificationResults(results);
    }
  }, [location.state]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-CH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    return timeString || '';
  };

  if (!receivedData || !receivedData.tickets || receivedData.tickets.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: THEME.background }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/verify')}
            className="flex items-center gap-2 mb-6 text-sm font-bold transition-colors"
            style={{ color: THEME.text }}
            onMouseEnter={(e) => e.target.style.opacity = '0.7'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            <FiArrowLeft size={18} />
            <span>Back</span>
          </button>
          <div className="p-8 text-center" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
            <p className="text-sm font-bold mb-2" style={{ color: THEME.text }}>
              No tickets received
            </p>
            <p className="text-xs" style={{ color: THEME.textMuted }}>
              Scan an NFC tag with wallet data to view tickets here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.background }}>
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/verify')}
            className="flex items-center gap-2 text-sm font-bold transition-colors"
            style={{ color: THEME.text }}
            onMouseEnter={(e) => e.target.style.opacity = '0.7'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            <FiArrowLeft size={18} />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold" style={{ color: THEME.text }}>
            Received Tickets
          </h1>
          <div style={{ width: '60px' }}></div>
        </div>

        {/* Wallet Info */}
        <div className="p-4 mb-6" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold mb-1" style={{ color: THEME.text }}>
                Wallet Received
              </h2>
              <p className="text-xs" style={{ color: THEME.textMuted }}>
                {receivedData.ticketCount || receivedData.tickets.length} {receivedData.tickets.length === 1 ? 'ticket' : 'tickets'} received
              </p>
            </div>
            {receivedData.timestamp && (
              <div className="text-right">
                <div className="text-xs" style={{ color: THEME.textMuted }}>Received</div>
                <div className="text-sm font-bold" style={{ color: THEME.text }}>
                  {formatDate(receivedData.timestamp)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {receivedData.tickets.map((ticket) => {
            const verification = verificationResults[ticket.id] || { valid: true, message: 'Ticket found' };
            
            return (
              <div
                key={ticket.id}
                className="p-4"
                style={{
                  backgroundColor: THEME.card,
                  border: `2px solid ${verification.valid ? THEME.success : THEME.accent}`,
                }}
              >
                {/* Verification Status */}
                <div className="flex items-center gap-2 mb-4">
                  {verification.valid ? (
                    <>
                      <FiCheckCircle style={{ color: THEME.success }} size={20} />
                      <span className="text-sm font-bold" style={{ color: THEME.success }}>
                        Valid Ticket
                      </span>
                    </>
                  ) : (
                    <>
                      <FiXCircle style={{ color: THEME.accent }} size={20} />
                      <span className="text-sm font-bold" style={{ color: THEME.accent }}>
                        {verification.message || 'Invalid Ticket'}
                      </span>
                    </>
                  )}
                </div>

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
                          {ticket.price && (
                            <div>
                              <div style={{ color: THEME.textMuted }}>Price</div>
                              <div className="font-bold" style={{ color: THEME.text }}>
                                CHF {ticket.price.toFixed(2)}
                              </div>
                            </div>
                          )}
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
                          {ticket.price && (
                            <div>
                              <div style={{ color: THEME.textMuted }}>Price</div>
                              <div className="font-bold" style={{ color: THEME.text }}>
                                CHF {ticket.price.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    <div className="mt-2 p-2" style={{ backgroundColor: THEME.background }}>
                      <div className="text-xs" style={{ color: THEME.textMuted }}>Ticket ID</div>
                      <div className="text-xs font-mono break-all mb-2" style={{ color: THEME.text }}>
                        {ticket.id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ReceivedTickets.displayName = 'ReceivedTickets';

export default ReceivedTickets;

