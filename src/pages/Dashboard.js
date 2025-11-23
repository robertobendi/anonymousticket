import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { FiBarChart2, FiTrendingUp, FiCheckCircle, FiRefreshCw, FiArrowLeft, FiCalendar, FiMapPin, FiX, FiMenu, FiLink, FiHash, FiClock, FiShield, FiDollarSign, FiLogOut, FiAlertCircle } from 'react-icons/fi';
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

 "transactions": [{ "id": "0ecca83f-ec55-4b52-b859-e2d0bf83a156", "type":"INSPECT", "ticketId": "ede8e65e94a0957c7938fe11a1ce3f15574d7cfe4dc5f43af04f2356edf59b2a", "payload": { "location": "Train IC1", "timestamp": 1763853533081, "deviceId": "POLICE_SCANNER" }, "signature": "8c25524e6103751315c5186a6b79e5bb5b3bdc0df2d991bb261c5da396dd26caccc056527d2897ec6e43c8b86a238b848f6b7d2bccb40380aa2336d004008e07" }], "previousHash": "0087d36e3fa17760405576d2dfc53e11ed4838ce3cf44de3aa235d43bcab372a", "hash": "00d4e0a5c2bc47e1193620331a128195a55a81bbd3797e77e7c2627d3fd755be", "nonce": 312 },
      { "index": 4, "timestamp": 1763853530017, "transactions": [{ "id": "eaefd7d3-7017-4c7b-9298-d3b5b1db026e", "type": "INSPECT", "ticketId": "ede8e65e94a0957c7938fe11a1ce3f15574d7cfe4dc5f43af04f2356edf59b2a", "payload": { "location": "Train IC1", "timestamp": 1763853534192, "deviceId": "POLICE_SCANNER" }, "signature": "0daa7bdac002e240bb36962bff85df9eddaf9f3d6d2ac4b9be0b064cb44d7ffa5ab39b9f5e078ada893682cea54f1bc1b8f76480a7e3762d76eaaffa7890210f" }], "previousHash": "00d4e0a5c2bc47e1193620331a128195a55a81bbd3797e77e7c2627d3fd755be", "hash": "0058f1e52bec93df0e2edf1c703c2cb6d47b994e74b50ab7020abf461bd732c7", "nonce": 158 },
      { "index": 5, "timestamp": 1763853533797, "transactions": [{ "id": "cbc03182-d985-43a4-8ac3-73e8907b79af", "type": "MINT", "ticketId": "ad249c3ae3368ad7faf72ece059598743a56dc42604a8c423496895b4d280d0d", "payload": { "price": "5.00", "timestamp": 1763853537972, "duration": 7200000, "deviceId": "CLI_KIOSK" }, "signature": "9e9a2dd2c1d1f09bb1a7a37e5602a026aee167194f9084d585936ab7610aa01d46ccf0d954647690fe9125cd8fd9d166b383b4ea9647bdc89fce9af9c695840c" }], "previousHash": "0058f1e52bec93df0e2edf1c703c2cb6d47b994e74b50ab7020abf461bd732c7", "hash": "00f5bf458396113a5d28774db1694be4fbcdf9db1af88c21cc95efbddb52a371", "nonce": 405 },
      { "index": 6, "timestamp": 1763853535662, "transactions": [{ "id": "16f033a8-923b-4103-856b-ffd9f91dcd27", "type": "ACTIVATE", "ticketId": "ad249c3ae3368ad7faf72ece059598743a56dc42604a8c423496895b4d280d0d", "payload": { "location": "Demo Station", "timestamp": 1763853539777, "deviceId": "PHONE_APP" }, "signature": "dae7f69c2fa1fd73adb19a2587b22fab6c22fe33bc98ae3694e533528a4041aebee21ba0d1e14d8ca86e8de09c069399f14e52ada41ab0550478bce158237e0a" }], "previousHash": "00f5bf458396113a5d28774db1694be4fbcdf9db1af88c21cc95efbddb52a371", "hash": "0029847d56e1023da6ae5d3634c8e9a6c7cfd74be05443543c8a3309913a7f61", "nonce": 94 }
    ],
    "pending": [],
    "difficulty": 2,
    "height": 7
  }
};

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
    verified: 0,
    revenue: 0
  });
  const [cantonStats, setCantonStats] = useState({});
  const [chainData, setChainData] = useState(null);
  const [showChainExplorer, setShowChainExplorer] = useState(false);
  const [error, setError] = useState(null);

  const processChainData = useCallback((data) => {
    if (!data || !data.blocks) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Adjust for timezone if needed, but for now keep local start of day
    const todayTs = today.getTime();

    let issuedToday = 0;
    let activated = 0;
    let verified = 0;
    let revenue = 0;

    data.blocks.forEach(block => {
      if (block.transactions) {
        block.transactions.forEach(tx => {
            // Use payload timestamp if available, otherwise block timestamp
            const txTimestamp = tx.payload?.timestamp || block.timestamp;
            
            if (tx.type === 'MINT') {
              // Check if issued today (ignore year check for demo if needed, but strict check is safer)
              // If timestamps are future (2025), make sure system date is correct or disable check
              if (txTimestamp >= todayTs) {
                issuedToday++;
              }
              // Add to revenue
              if (tx.payload?.price) {
                revenue += parseFloat(tx.payload.price);
              }
            } else if (tx.type === 'ACTIVATE') {
              activated++;
            } else if (tx.type === 'INSPECT') {
              verified++;
            }
        });
      }
    });

    setStats({
      issuedToday,
      activated,
      verified,
      revenue
    });
  }, []);

  // Fetch chain data function - ZERO SECURITY
  const fetchChainData = useCallback(async (retries = 3) => {
    // Use direct HTTPS API endpoint
    const apiUrl = 'https://threeheads.it/chain';
    
    // Clear previous errors
    setError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        setIsLoading(true);
        console.log(`📡 Fetching chain data from ${apiUrl}... (attempt ${attempt}/${retries})`);
        
        let data;
        
        // Use fetch for better error handling
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        data = await response.json();
        console.log('✅ Chain data received:', data);
        
        if (data.success && data.data) {
          setChainData(data.data);
          processChainData(data.data);
        } else if (data.blocks) {
          // Handle case where data is directly the chain data
          setChainData(data);
          processChainData(data);
        } else {
          throw new Error('Invalid data format received from API');
        }
        
        setIsLoading(false);
        setError(null); // Clear any previous errors
        return; // Success, exit retry loop
      } catch (error) {
        console.error(`❌ Error fetching chain data (attempt ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          // Last attempt failed - show error, don't use mock data
          setIsLoading(false);
          console.error('❌ All retry attempts failed. Cannot connect to API.');
          setError(`Failed to connect to blockchain API: ${error.message}. Please check your internet connection and try again.`);
          // Don't set any data - show empty state or error
          setChainData(null);
        } else {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }, [processChainData]);

  // Fetch chain data on mount
  useEffect(() => {
    fetchChainData();
  }, [fetchChainData]);

  // Fetch chain data when explorer is shown
  useEffect(() => {
    if (showChainExplorer) {
      fetchChainData();
    }
  }, [showChainExplorer, fetchChainData]);

  useEffect(() => {
    // Fetch stats for selected cantons
    const fetchCantonStats = async () => {
      if (selectedCantons.length === 0) {
        setCantonStats({});
        return;
      }

      // TODO: Replace with actual blockchain API call
      // For now, show empty stats if no chain data available
      if (!chainData) {
        setCantonStats({});
        return;
      }
      
      // Calculate stats from chain data if available
      const stats = {};
      selectedCantons.forEach(cantonCode => {
        stats[cantonCode] = {
          issuedToday: 0,
          activated: 0,
          verified: 0
        };
      });
      
      setCantonStats(stats);
    };

    fetchCantonStats();
  }, [selectedCantons, chainData]);

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

  const StatCard = ({ icon: Icon, label, value, color = THEME.accent, delay = 0, type }) => (
    <AnimatedCard
      onClick={() => type && navigate(`/dashboard/history?type=${type}`)}
      delay={delay}
      className={`p-4 sm:p-6 border-2 rounded-lg ${type ? 'cursor-pointer' : ''}`}
      style={{ 
        backgroundColor: THEME.card, 
        borderColor: THEME.border,
        borderRadius: '8px'
      }}
      whileHover={type ? { 
        borderColor: color,
        backgroundColor: THEME.surfaceHover,
        scale: 1.02
      } : {}}
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

  const handleLogout = () => {
    sessionStorage.removeItem('dashboard_auth');
    navigate('/login');
  };

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
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-white font-bold text-xs uppercase min-h-[44px] rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.3)', scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Logout"
                title="Logout"
              >
                <FiLogOut size={16} />
                Logout
              </motion.button>
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
        <AnimatedCard className="mb-4 sm:mb-6 p-4 sm:p-6 flex items-center justify-between rounded-lg" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          <div className="flex items-center gap-3">
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
          </div>
          <motion.button
            onClick={() => fetchChainData()}
            disabled={isLoading}
            className="p-2 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: `${THEME.accent}15`,
              color: THEME.accent
            }}
            whileHover={{ 
              backgroundColor: `${THEME.accent}25`,
              rotate: 180 
            }}
            whileTap={{ scale: 0.9 }}
            title="Refresh Data"
          >
            <FiRefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </motion.button>
        </AnimatedCard>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <StatCard
            icon={FiTrendingUp}
            label="Tickets Issued Today"
            value={stats.issuedToday}
            color={THEME.accent}
            delay={0.1}
            type="issuedToday"
          />
          <StatCard
            icon={FiCheckCircle}
            label="Tickets Activated"
            value={stats.activated}
            color={THEME.success}
            delay={0.2}
            type="activated"
          />
          <StatCard
            icon={FiShield}
            label="Tickets Verified"
            value={stats.verified}
            color={THEME.accent}
            delay={0.3}
            type="verified"
          />
          <StatCard
            icon={FiDollarSign}
            label="Total Revenue"
            value={`CHF ${stats.revenue.toFixed(2)}`}
            color={THEME.success}
            delay={0.4}
            type="revenue"
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

        {/* Chain Explorer */}
        <AnimatedCard className="p-4 sm:p-6 rounded-lg mb-4 sm:mb-6" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}`, borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: `${THEME.accent}20` }}>
                <FiLink size={20} style={{ color: THEME.accent }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: THEME.text }}>
                  Chain Explorer
                </h2>
                <p className="text-xs" style={{ color: THEME.textMuted }}>
                  Explore the blockchain blocks and transactions
                </p>
                {showChainExplorer && (
                  <p className="text-xs mt-1" style={{ color: THEME.accent }}>
                    📡 Loading from: https://threeheads.it/chain
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {showChainExplorer && (
                <AnimatedButton
                  onClick={() => fetchChainData()}
                  disabled={isLoading}
                  loading={isLoading}
                  variant="secondary"
                  className="px-3 py-2 text-xs font-bold uppercase min-h-[44px]"
                  icon={FiRefreshCw}
                >
                  Refresh
                </AnimatedButton>
              )}
              <motion.button
                onClick={() => setShowChainExplorer(!showChainExplorer)}
                className="px-4 py-2 text-xs font-bold uppercase min-h-[44px]"
                style={{ 
                  color: THEME.textMuted,
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: showChainExplorer ? `${THEME.accent}20` : 'transparent'
                }}
                whileHover={{ 
                  borderColor: THEME.accent,
                  color: THEME.accent
                }}
                whileTap={{ scale: 0.95 }}
              >
                {showChainExplorer ? 'Hide' : 'Show'}
              </motion.button>
            </div>
          </div>


          <AnimatePresence>
            {showChainExplorer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${THEME.accent}20` }}
                    >
                      <FiRefreshCw size={24} style={{ color: THEME.accent }} />
                    </motion.div>
                    <p className="text-sm font-bold" style={{ color: THEME.text }}>
                      Loading chain data...
                    </p>
                    <p className="text-xs mt-1" style={{ color: THEME.textMuted }}>
                      Fetching from https://threeheads.it/chain
                    </p>
                  </div>
                ) : error || !chainData ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${THEME.accent}20` }}>
                      <FiAlertCircle size={24} style={{ color: THEME.accent }} />
                    </div>
                    <p className="text-sm font-bold mb-2" style={{ color: THEME.text }}>
                      {error ? 'Connection Error' : 'No Data Available'}
                    </p>
                    <p className="text-xs text-center px-4 mb-4" style={{ color: THEME.textMuted }}>
                      {error || 'Unable to fetch blockchain data. Please check your connection and try again.'}
                    </p>
                    <AnimatedButton
                      onClick={() => fetchChainData()}
                      variant="secondary"
                      className="px-4 py-2 text-xs"
                      icon={FiRefreshCw}
                    >
                      Retry
                    </AnimatedButton>
                  </div>
                ) : chainData ? (
                  <>
                    {/* Chain Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.accent}10` }}>
                    <div className="text-xs font-bold mb-1" style={{ color: THEME.textMuted }}>Height</div>
                    <div className="text-lg font-bold" style={{ color: THEME.text }}>
                      {chainData.height}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.accent}10` }}>
                    <div className="text-xs font-bold mb-1" style={{ color: THEME.textMuted }}>Difficulty</div>
                    <div className="text-lg font-bold" style={{ color: THEME.text }}>
                      {chainData.difficulty}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.accent}10` }}>
                    <div className="text-xs font-bold mb-1" style={{ color: THEME.textMuted }}>Blocks</div>
                    <div className="text-lg font-bold" style={{ color: THEME.text }}>
                      {chainData.blocks?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.accent}10` }}>
                    <div className="text-xs font-bold mb-1" style={{ color: THEME.textMuted }}>Pending</div>
                    <div className="text-lg font-bold" style={{ color: THEME.text }}>
                      {chainData.pending?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Simple Blockchain Visualization */}
                {chainData.blocks && chainData.blocks.length > 0 && (
                  <div className="space-y-4">
                    {/* Simple Block Chain */}
                    <div className="p-4 rounded-lg border-2" style={{ 
                      backgroundColor: THEME.background,
                      borderColor: THEME.border,
                      borderRadius: '12px'
                    }}>
                      <h3 className="text-base font-bold mb-4" style={{ color: THEME.text }}>
                        Blockchain
                      </h3>
                      <div className="overflow-x-auto pb-4">
                        <div className="flex items-center gap-3 min-w-max">
                          {chainData.blocks.map((block, blockIndex) => {
                            const txCount = block.transactions?.length || 0;
                            
                            return (
                              <motion.div
                                key={block.index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: blockIndex * 0.1 }}
                                className="flex items-center gap-3"
                              >
                                {/* Block */}
                                <motion.div
                                  className="p-4 rounded-lg border-2 text-center min-w-[120px]"
                                  style={{ 
                                    backgroundColor: txCount > 0 ? `${THEME.success}15` : THEME.card,
                                    borderColor: txCount > 0 ? THEME.success : THEME.border,
                                    borderRadius: '8px'
                                  }}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  <div className="text-lg font-bold mb-1" style={{ color: THEME.text }}>
                                    #{block.index}
                                  </div>
                                  <div className="text-xs mb-1" style={{ color: THEME.textMuted }}>
                                    {txCount} {txCount === 1 ? 'tx' : 'txs'}
                                  </div>
                                  {block.nonce !== undefined && (
                                    <div className="text-xs mb-1" style={{ color: THEME.textMuted }}>
                                      Nonce: {block.nonce}
                                    </div>
                                  )}
                                  {block.hash && (
                                    <div className="text-xs font-mono truncate" style={{ color: THEME.accent }} title={block.hash}>
                                      {block.hash.substring(0, 8)}...
                                    </div>
                                  )}
                                  <div className="text-xs mt-1" style={{ color: THEME.textMuted }}>
                                    {new Date(block.timestamp).toLocaleTimeString()}
                                  </div>
                                </motion.div>
                                
                                {/* Arrow */}
                                {blockIndex < chainData.blocks.length - 1 && (
                                  <FiLink size={20} style={{ color: THEME.accent }} />
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Transactions List with More Data */}
                    {chainData.blocks.some(b => b.transactions && b.transactions.length > 0) && (
                      <div className="p-4 rounded-lg border-2" style={{ 
                        backgroundColor: THEME.background,
                        borderColor: THEME.border,
                        borderRadius: '12px'
                      }}>
                        <h3 className="text-base font-bold mb-4" style={{ color: THEME.text }}>
                          All Transactions ({chainData.blocks.reduce((sum, b) => sum + (b.transactions?.length || 0), 0)})
                        </h3>
                        <div className="space-y-3">
                          {chainData.blocks.map((block) => 
                            block.transactions?.map((tx, txIndex) => (
                              <motion.div
                                key={tx.id || `${block.index}-${txIndex}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: (block.index * 0.05) + (txIndex * 0.02) }}
                                className="p-4 rounded-lg border"
                                style={{ 
                                  backgroundColor: THEME.card,
                                  borderColor: THEME.border,
                                  borderRadius: '8px'
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="px-2 py-1 rounded text-xs font-bold" style={{ 
                                      backgroundColor: tx.type === 'MINT' ? `${THEME.success}30` : `${THEME.accent}30`,
                                      color: tx.type === 'MINT' ? THEME.success : THEME.accent
                                    }}>
                                      {tx.type}
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold" style={{ color: THEME.text }}>
                                        Block #{block.index}
                                      </div>
                                      <div className="text-xs flex items-center gap-2 mt-1" style={{ color: THEME.textMuted }}>
                                        <FiClock size={12} />
                                        {tx.payload?.timestamp ? new Date(tx.payload.timestamp).toLocaleString() : new Date(block.timestamp).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  {tx.payload?.price && (
                                    <div className="text-sm font-bold" style={{ color: THEME.success }}>
                                      {tx.payload.price}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                                  {tx.ticketId && (
                                    <div>
                                      <span className="font-bold" style={{ color: THEME.textMuted }}>Ticket ID: </span>
                                      <span className="font-mono" style={{ color: THEME.text }}>
                                        {tx.ticketId.substring(0, 16)}...
                                      </span>
                                    </div>
                                  )}
                                  {tx.payload?.deviceId && (
                                    <div>
                                      <span className="font-bold" style={{ color: THEME.textMuted }}>Device: </span>
                                      <span style={{ color: THEME.text }}>{tx.payload.deviceId}</span>
                                    </div>
                                  )}
                                  {tx.payload?.duration && (
                                    <div>
                                      <span className="font-bold" style={{ color: THEME.textMuted }}>Duration: </span>
                                      <span style={{ color: THEME.text }}>
                                        {Math.floor(tx.payload.duration / 3600000)}h {Math.floor((tx.payload.duration % 3600000) / 60000)}min
                                      </span>
                                    </div>
                                  )}
                                  {tx.id && (
                                    <div>
                                      <span className="font-bold" style={{ color: THEME.textMuted }}>TX ID: </span>
                                      <span className="font-mono" style={{ color: THEME.text }}>
                                        {tx.id.substring(0, 8)}...
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {tx.signature && (
                                  <div className="mt-2 p-2 rounded" style={{ backgroundColor: `${THEME.accent}10` }}>
                                    <div className="text-xs font-mono break-all" style={{ color: THEME.text }}>
                                      {tx.signature.substring(0, 40)}...
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pending Transactions */}
                {chainData.pending && chainData.pending.length > 0 && (
                  <div className="mt-6 p-4 rounded-lg border-2" style={{ 
                    backgroundColor: `${THEME.accent}10`,
                    borderColor: THEME.accent,
                    borderRadius: '8px'
                  }}>
                    <div className="text-sm font-bold mb-3" style={{ color: THEME.text }}>
                      Pending Transactions ({chainData.pending.length})
                    </div>
                    <div className="space-y-2">
                      {chainData.pending.map((tx, index) => (
                        <div key={index} className="text-xs p-2 rounded" style={{ backgroundColor: THEME.background }}>
                          <span className="font-mono" style={{ color: THEME.text }}>
                            {tx.id || `Pending ${index + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                ) : (
                  <div className="p-4 text-center" style={{ color: THEME.textMuted }}>
                    <p className="text-sm">No chain data available</p>
                    <p className="text-xs mt-2">Data will load automatically from API</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedCard>

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

