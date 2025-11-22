import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBarChart2, FiTrendingUp, FiCheckCircle, FiRefreshCw, FiArrowLeft, FiCalendar, FiMapPin, FiX } from 'react-icons/fi';
import { THEME } from '@lib/themeColors';

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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCantons, setSelectedCantons] = useState([]);
  const [showCantonSelector, setShowCantonSelector] = useState(false);
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

  const StatCard = ({ icon: Icon, label, value, color = THEME.accent }) => (
    <div 
      className="p-6 border-2 transition-all"
      style={{ 
        backgroundColor: THEME.card, 
        borderColor: THEME.border,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.backgroundColor = THEME.surfaceHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = THEME.border;
        e.currentTarget.style.backgroundColor = THEME.card;
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
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.background }}>
      {/* Header Section */}
      <section className="text-white py-6" style={{ backgroundColor: THEME.accent }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 text-white transition-colors font-bold text-xs uppercase"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <FiArrowLeft size={16} />
                Back
              </button>
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
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-white transition-colors font-bold text-xs uppercase disabled:opacity-50"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = 'rgba(255,255,255,0.3)')}
              onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = 'rgba(255,255,255,0.2)')}
            >
              <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        {/* Date Info */}
        <div className="mb-6 p-4 flex items-center gap-3" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            icon={FiTrendingUp}
            label="Tickets Issued Today"
            value={stats.issuedToday}
            color={THEME.accent}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Tickets Activated"
            value={stats.activated}
            color={THEME.success}
          />
          <StatCard
            icon={FiBarChart2}
            label="Tickets Verified"
            value={stats.verified}
            color={THEME.accent}
          />
        </div>

        {/* Canton Selector Section */}
        <div className="mb-6 p-4" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FiMapPin size={20} style={{ color: THEME.accent }} />
              <h2 className="text-lg font-bold" style={{ color: THEME.text }}>
                Statistics by Canton
              </h2>
            </div>
            <div className="flex gap-2">
              {selectedCantons.length > 0 && (
                <button
                  onClick={clearAllCantons}
                  className="px-3 py-1.5 text-xs font-bold uppercase transition-colors"
                  style={{ 
                    color: THEME.textMuted,
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = THEME.accent;
                    e.target.style.color = THEME.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = THEME.border;
                    e.target.style.color = THEME.textMuted;
                  }}
                >
                  Clear All
                </button>
              )}
              <button
                onClick={selectAllCantons}
                className="px-3 py-1.5 text-xs font-bold uppercase transition-colors"
                style={{ 
                    color: THEME.textMuted,
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = THEME.accent;
                    e.target.style.color = THEME.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = THEME.border;
                    e.target.style.color = THEME.textMuted;
                  }}
              >
                Select All
              </button>
            </div>
          </div>

          {/* Selected Cantons Tags */}
          {selectedCantons.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedCantons.map(cantonCode => {
                const canton = SWISS_CANTONS.find(c => c.code === cantonCode);
                return (
                  <div
                    key={cantonCode}
                    className="flex items-center gap-2 px-3 py-1.5"
                    style={{ 
                      backgroundColor: `${THEME.accent}20`,
                      border: `1px solid ${THEME.accent}`
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color: THEME.text }}>
                      {canton?.code || cantonCode}
                    </span>
                    <button
                      onClick={() => removeCanton(cantonCode)}
                      className="flex items-center justify-center"
                      style={{ color: THEME.accent }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Canton Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCantonSelector(!showCantonSelector)}
              className="w-full px-4 py-3 text-left border-2 transition-colors flex items-center justify-between"
              style={{ 
                borderColor: THEME.border,
                backgroundColor: THEME.surface,
                color: THEME.text
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = THEME.accent;
                e.target.style.backgroundColor = THEME.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = THEME.border;
                e.target.style.backgroundColor = THEME.surface;
              }}
            >
              <span className="text-sm font-bold">
                {selectedCantons.length === 0 
                  ? 'Select cantons to view statistics' 
                  : `${selectedCantons.length} canton${selectedCantons.length > 1 ? 's' : ''} selected`}
              </span>
              <span className="text-xs" style={{ color: THEME.textMuted }}>
                {showCantonSelector ? '▲' : '▼'}
              </span>
            </button>

            {showCantonSelector && (
              <div 
                className="absolute z-10 w-full mt-1 border-2 max-h-64 overflow-y-auto"
                style={{ 
                  borderColor: THEME.border,
                  backgroundColor: THEME.card
                }}
              >
                {SWISS_CANTONS.map(canton => {
                  const isSelected = selectedCantons.includes(canton.code);
                  return (
                    <button
                      key={canton.code}
                      type="button"
                      onClick={() => toggleCanton(canton.code)}
                      className="w-full text-left px-4 py-2 flex items-center justify-between transition-colors"
                      style={{ 
                        color: THEME.text,
                        backgroundColor: isSelected ? `${THEME.accent}20` : THEME.card
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.target.style.backgroundColor = THEME.surfaceHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.target.style.backgroundColor = THEME.card;
                        }
                      }}
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Canton Statistics */}
        {selectedCantons.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: THEME.text }}>
              Statistics by Selected Canton{selectedCantons.length > 1 ? 's' : ''}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedCantons.map(cantonCode => {
                const canton = SWISS_CANTONS.find(c => c.code === cantonCode);
                const stats = cantonStats[cantonCode] || { issuedToday: 0, activated: 0, verified: 0 };
                
                return (
                  <div
                    key={cantonCode}
                    className="p-4 border-2"
                    style={{ 
                      backgroundColor: THEME.card,
                      borderColor: THEME.border
                    }}
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.border}` }}>
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
        </div>
      </section>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;

