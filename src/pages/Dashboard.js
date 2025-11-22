import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBarChart2, FiTrendingUp, FiCheckCircle, FiRefreshCw, FiArrowLeft, FiCalendar, FiMapPin, FiX, FiMenu } from 'react-icons/fi';
import { THEME } from '@lib/themeColors';
import SwitzerlandMap from '@components/SwitzerlandMap';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';
import MobileSidebar from '@components/ui/MobileSidebar';

// Swiss cantons list
const SWISS_CANTONS = [
  { code: 'AG', name: 'Aargau' },
  { code: 'AI', name: 'Appenzell Innerrhoden' },
  { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'BE', name: 'Bern' },
  { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' },
  { code: 'FR', name: 'Freiburg' },
  { code: 'GE', name: 'Genève' },
  { code: 'GL', name: 'Glarus' },
  { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' },
  { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuenburg' },
  { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' },
  { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' },
  { code: 'SO', name: 'Solothurn' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Ticino' },
  { code: 'UR', name: 'Uri' },
  { code: 'VD', name: 'Vaud' },
  { code: 'VS', name: 'Wallis' },
  { code: 'ZG', name: 'Zug' },
  { code: 'ZH', name: 'Zürich' },
];

/**
 * Dashboard Page
 * Displays blockchain statistics for tickets
 */
const Dashboard = memo(() => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCantons, setSelectedCantons] = useState([]);
  const [showCantonSelector, setShowCantonSelector] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [stats, setStats] = useState({
    issuedToday: 0,
    activated: 0,
    verified: 0
  });
  const [cantonStats, setCantonStats] = useState({});

  useEffect(() => {
    // Simulate API call to blockchain
    const fetchStats = async () => {
      setIsLoading(true);
      
      // TODO: Replace with actual blockchain API call
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStats({
        issuedToday: 100,
        activated: 100,
        verified: 100
      });
      
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  useEffect(() => {
    // Fetch stats for selected cantons
    const fetchCantonStats = async () => {
      if (selectedCantons.length === 0) {
        setCantonStats({});
        return;
      }

      setIsLoading(true);
      
      // TODO: Replace with actual blockchain API call
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const mockStats = {};
      selectedCantons.forEach(cantonCode => {
        mockStats[cantonCode] = {
          issuedToday: Math.floor(Math.random() * 50) + 10,
          activated: Math.floor(Math.random() * 50) + 10,
          verified: Math.floor(Math.random() * 50) + 10
        };
      });
      
      setCantonStats(mockStats);
      setIsLoading(false);
    };

    fetchCantonStats();
  }, [selectedCantons]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  };

  const toggleCanton = (cantonCode) => {
    setSelectedCantons(prev => {
      if (prev.includes(cantonCode)) {
        return prev.filter(code => code !== cantonCode);
      } else {
        return [...prev, cantonCode];
      }
    });
  };

  const removeCanton = (cantonCode) => {
    setSelectedCantons(prev => prev.filter(code => code !== cantonCode));
  };

  const selectAllCantons = () => {
    setSelectedCantons(SWISS_CANTONS.map(c => c.code));
  };

  const clearAllCantons = () => {
    setSelectedCantons([]);
  };

  const StatCard = ({ icon: Icon, label, value, color = THEME.accent, delay = 0 }) => (
    <AnimatedCard
      delay={delay}
      className="p-4 sm:p-6 border-2 rounded-lg"
      style={{ 
        backgroundColor: THEME.card, 
        borderColor: THEME.border,
        borderRadius: '8px'
      }}
      whileHover={{ 
        borderColor: color,
        backgroundColor: THEME.surfaceHover,
        scale: 1.01 // Reduced scale - SBB Reduced principle
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div 
          className="w-12 h-12 flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={24} style={{ color }} />
        </div>
        {isLoading && (
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2" style={{ borderColor: color }}></div>
        )}
      </div>
      <div className="mb-2">
        <div className="text-sm font-bold mb-1" style={{ color: THEME.textMuted }}>
          {label}
        </div>
        <div className="text-3xl font-bold" style={{ color: THEME.text }}>
          {isLoading ? '...' : value.toLocaleString()}
        </div>
      </div>
    </AnimatedCard>
  );

  return (
    <motion.div 
      className="min-h-screen" 
      style={{ backgroundColor: THEME.background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Section */}
      <motion.section 
        className="text-white py-4 sm:py-6" 
        style={{ backgroundColor: THEME.accent }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 text-white font-bold text-xs uppercase min-h-[44px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                <FiArrowLeft size={16} />
                Back
              </motion.button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 flex items-center justify-center">
                  <FiBarChart2 size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                  <p className="text-sm opacity-90">Blockchain Statistics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnimatedButton
                onClick={handleRefresh}
                disabled={isLoading}
                loading={isLoading}
                variant="secondary"
                className="px-3 py-2 text-xs uppercase min-h-[44px] hidden sm:flex"
                icon={FiRefreshCw}
              >
                Refresh
              </AnimatedButton>
              <motion.button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Open menu"
              >
                <FiMenu size={24} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Dashboard Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Date Info */}
        <AnimatedCard className="mb-4 sm:mb-6 p-4 sm:p-6 flex items-center gap-3 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          <FiCalendar size={20} style={{ color: THEME.accent }} />
          <div>
            <div className="text-sm font-bold" style={{ color: THEME.textMuted }}>Today</div>
            <div className="text-lg font-bold" style={{ color: THEME.text }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </AnimatedCard>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <StatCard
            icon={FiTrendingUp}
            label="Tickets Issued Today"
            value={stats.issuedToday}
            color={THEME.accent}
            delay={0.1}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Tickets Activated"
            value={stats.activated}
            color={THEME.success}
            delay={0.2}
          />
          <StatCard
            icon={FiBarChart2}
            label="Tickets Verified"
            value={stats.verified}
            color={THEME.accent}
            delay={0.3}
          />
        </div>

        {/* Canton Selector Section */}
        <AnimatedCard className="mb-4 sm:mb-6 p-4 sm:p-6 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FiMapPin size={20} style={{ color: THEME.accent }} />
              <h2 className="text-lg font-bold" style={{ color: THEME.text }}>
                Statistics by Canton
              </h2>
            </div>
          </div>

          {/* Interactive Map - Dropdown */}
          <div className="mb-4 sm:mb-6">
            <motion.button
              onClick={() => setShowMap(!showMap)}
              className="w-full px-4 py-3 sm:py-4 text-left border-2 flex items-center justify-between min-h-[48px] text-base rounded-lg"
              style={{ 
                borderColor: THEME.border,
                backgroundColor: THEME.surface,
                color: THEME.text,
                borderRadius: '8px'
              }}
              whileHover={{ 
                borderColor: THEME.accent,
                backgroundColor: THEME.surfaceHover
              }}
              whileTap={{ scale: 0.99 }}
              aria-label={showMap ? 'Hide interactive map' : 'Show interactive map'}
              aria-expanded={showMap}
            >
              <div className="flex items-center gap-2">
                <FiMapPin size={18} style={{ color: THEME.accent }} />
                <span className="text-sm font-bold">
                  {showMap ? 'Hide Interactive Map' : 'Show Interactive Map'}
                </span>
              </div>
              <span className="text-xs" style={{ color: THEME.textMuted }}>
                {showMap ? '▲' : '▼'}
              </span>
            </motion.button>

            <AnimatePresence>
              {showMap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 overflow-hidden"
                >
                  <SwitzerlandMap
                    selectedCantons={selectedCantons}
                    onCantonClick={toggleCanton}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold" style={{ color: THEME.text }}>
                Or use the dropdown selector:
              </h3>
            </div>
            <div className="flex gap-2">
              <AnimatePresence>
                {selectedCantons.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={clearAllCantons}
                    className="px-3 py-2 text-xs font-bold uppercase min-h-[44px]"
                    style={{ 
                      color: THEME.textMuted,
                      border: `1px solid ${THEME.border}`,
                      backgroundColor: 'transparent'
                    }}
                    whileHover={{ 
                      borderColor: THEME.accent,
                      color: THEME.accent
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Clear All
                  </motion.button>
                )}
              </AnimatePresence>
              <motion.button
                onClick={selectAllCantons}
                className="px-3 py-2 text-xs font-bold uppercase min-h-[44px]"
                style={{ 
                  color: THEME.textMuted,
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: 'transparent'
                }}
                whileHover={{ 
                  borderColor: THEME.accent,
                  color: THEME.accent
                }}
                whileTap={{ scale: 0.95 }}
              >
                Select All
              </motion.button>
            </div>
          </div>

          {/* Selected Cantons Tags */}
          <AnimatePresence>
            {selectedCantons.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex flex-wrap gap-2"
              >
                {selectedCantons.map((cantonCode, index) => {
                  const canton = SWISS_CANTONS.find(c => c.code === cantonCode);
                  return (
                    <motion.div
                      key={cantonCode}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 px-3 py-2 min-h-[44px]"
                      style={{ 
                        backgroundColor: `${THEME.accent}20`,
                        border: `1px solid ${THEME.accent}`
                      }}
                    >
                      <span className="text-xs font-bold" style={{ color: THEME.text }}>
                        {canton?.code || cantonCode}
                      </span>
                      <motion.button
                        onClick={() => removeCanton(cantonCode)}
                        className="flex items-center justify-center min-w-[24px] min-h-[24px]"
                        style={{ color: THEME.accent }}
                        whileHover={{ opacity: 0.7, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiX size={14} />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Canton Selector */}
          <div className="relative">
            <motion.button
              onClick={() => setShowCantonSelector(!showCantonSelector)}
              className="w-full px-4 py-3 sm:py-4 text-left border-2 flex items-center justify-between min-h-[48px] text-base rounded-lg"
              style={{ 
                borderColor: THEME.border,
                backgroundColor: THEME.surface,
                color: THEME.text,
                borderRadius: '8px'
              }}
              whileHover={{ 
                borderColor: THEME.accent,
                backgroundColor: THEME.surfaceHover
              }}
              whileTap={{ scale: 0.99 }}
              aria-label="Select cantons"
              aria-expanded={showCantonSelector}
            >
              <span className="text-sm font-bold">
                {selectedCantons.length === 0 
                  ? 'Select cantons to view statistics' 
                  : `${selectedCantons.length} canton${selectedCantons.length > 1 ? 's' : ''} selected`}
              </span>
              <span className="text-xs" style={{ color: THEME.textMuted }}>
                {showCantonSelector ? '▲' : '▼'}
              </span>
            </motion.button>

            <AnimatePresence>
              {showCantonSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 border-2 max-h-64 overflow-y-auto rounded-lg"
                  style={{ 
                    borderColor: THEME.border,
                    backgroundColor: THEME.card,
                    borderRadius: '8px'
                  }}
                  role="listbox"
                  aria-label="Canton selection"
                >
                  {SWISS_CANTONS.map((canton, index) => {
                    const isSelected = selectedCantons.includes(canton.code);
                    return (
                      <motion.button
                        key={canton.code}
                        type="button"
                        onClick={() => toggleCanton(canton.code)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="w-full text-left px-4 py-3 flex items-center justify-between min-h-[48px] text-base"
                        style={{ 
                          color: THEME.text,
                          backgroundColor: isSelected ? `${THEME.accent}20` : THEME.card
                        }}
                        whileHover={!isSelected ? { 
                          backgroundColor: THEME.surfaceHover
                        } : {}}
                        whileTap={{ scale: 0.98 }}
                      >
                      <div>
                        <span className="text-sm font-bold">{canton.name}</span>
                        <span className="text-xs ml-2" style={{ color: THEME.textMuted }}>
                          ({canton.code})
                        </span>
                      </div>
                        {isSelected && (
                        <FiCheckCircle size={16} style={{ color: THEME.accent }} />
                      )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimatedCard>

        {/* Canton Statistics */}
        <AnimatePresence>
          {selectedCantons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 sm:mb-6"
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: THEME.text }}>
                Statistics by Selected Canton{selectedCantons.length > 1 ? 's' : ''}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {selectedCantons.map((cantonCode, index) => {
                  const canton = SWISS_CANTONS.find(c => c.code === cantonCode);
                  const stats = cantonStats[cantonCode] || { issuedToday: 0, activated: 0, verified: 0 };
                  
                  return (
                    <AnimatedCard
                      key={cantonCode}
                      delay={index * 0.1}
                      className="p-4 sm:p-6 border-2 rounded-lg"
                      style={{ 
                        backgroundColor: THEME.card,
                        borderColor: THEME.border,
                        borderRadius: '8px'
                      }}
                      whileHover={{ scale: 1.01 }}
                    >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-bold" style={{ color: THEME.text }}>
                        {canton?.name || cantonCode}
                      </h4>
                      <span className="text-xs px-2 py-1" style={{ 
                        backgroundColor: `${THEME.accent}20`,
                        color: THEME.accent,
                        fontWeight: 'bold'
                      }}>
                        {cantonCode}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs" style={{ color: THEME.textMuted }}>Issued Today:</span>
                        <span className="text-sm font-bold" style={{ color: THEME.text }}>
                          {isLoading ? '...' : stats.issuedToday}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs" style={{ color: THEME.textMuted }}>Activated:</span>
                        <span className="text-sm font-bold" style={{ color: THEME.success }}>
                          {isLoading ? '...' : stats.activated}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs" style={{ color: THEME.textMuted }}>Verified:</span>
                        <span className="text-sm font-bold" style={{ color: THEME.accent }}>
                          {isLoading ? '...' : stats.verified}
                        </span>
                      </div>
                    </div>
                    </AnimatedCard>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Box */}
        <AnimatedCard className="p-4 sm:p-6 rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${THEME.accent}20` }}>
              <FiBarChart2 size={18} style={{ color: THEME.accent }} />
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: THEME.text }}>
                Blockchain Integration
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: THEME.textMuted }}>
                This dashboard displays real-time statistics from the blockchain network. 
                All ticket transactions are recorded on-chain for transparency and verification.
                Currently showing mock data - blockchain integration in progress.
              </p>
            </div>
          </div>
        </AnimatedCard>
      </section>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </motion.div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;

