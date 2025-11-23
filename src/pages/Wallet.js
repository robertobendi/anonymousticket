import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiTrash2, FiCreditCard, FiGlobe, FiAlertCircle, FiMenu, FiX } from 'react-icons/fi';
import { useWallet } from '@lib/wallet';
import { generateQRCodeData } from '@lib/ticketGenerator';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';
import MobileSidebar from '@components/ui/MobileSidebar';
import QRCode from 'react-qr-code';

/**
 * Wallet page - View tickets and share individual tickets via QR Code
 */
const Wallet = memo(() => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, addTicket, removeTicket, clearAll] = useWallet();
  const [selectedTicket, setSelectedTicket] = useState(null); // Track which ticket is being displayed

  const handleShowQR = (ticket) => {
    setSelectedTicket(ticket);
  };

  const closeQR = () => {
    setSelectedTicket(null);
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

        {/* QR Code Modal */}
        <AnimatePresence>
          {selectedTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
              onClick={closeQR}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeQR}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                  <FiX size={24} />
                </button>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-black mb-1">Ticket QR Code</h3>
                  <p className="text-sm text-gray-500">Show this to the inspector</p>
                </div>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCode 
                    value={generateQRCodeData(selectedTicket)} 
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs font-mono text-gray-500 break-all">
                    {selectedTicket.id}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                        {ticket.controlCode || '--------'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <motion.button
                      onClick={() => handleShowQR(ticket)}
                      className="px-3 py-2 min-h-[44px] flex items-center justify-center gap-2 text-xs font-bold rounded"
                      style={{ 
                        backgroundColor: THEME.accent,
                        color: '#ffffff'
                      }}
                      whileHover={{ opacity: 0.8, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Show QR Code"
                    >
                      <FiCreditCard size={16} />
                      <span>Show QR</span>
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        removeTicket(ticket.id);
                        toast.success('Ticket removed from wallet', {
                          icon: '🗑️',
                          duration: 2000,
                        });
                      }}
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


