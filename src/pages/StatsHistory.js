import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiBarChart2, FiTrendingUp, FiCheckCircle, FiShield, FiDollarSign } from 'react-icons/fi';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';

// Removed mock data - only show real data from API

const StatsHistory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'issuedToday';
  const [chainData, setChainData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch logic
  useEffect(() => {
    const fetchChainData = async (retries = 3) => {
      const apiUrl = '/api/chain';
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          setIsLoading(true);
          let data;
          
          data = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', apiUrl, true);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onload = function() {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                  reject(new Error('Failed to parse JSON: ' + e.message));
                }
              } else {
                reject(new Error(`HTTP error! status: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Request timeout'));
            xhr.timeout = 30000;
            xhr.send();
          });

          if (data.success && data.data) {
            setChainData(data.data);
          } else if (data.blocks) {
            setChainData(data);
          }
          
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Error fetching chain data:', error);
          if (attempt === retries) {
            // Don't use mock data - show error state
            setChainData(null);
            setIsLoading(false);
            console.error('❌ Failed to connect to API. No data available.');
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    };

    fetchChainData();
  }, []);

  const getStatConfig = (type) => {
    switch(type) {
      case 'issuedToday': return { title: 'Tickets Issued History', icon: FiTrendingUp, color: THEME.accent };
      case 'activated': return { title: 'Tickets Activated History', icon: FiCheckCircle, color: THEME.success };
      case 'verified': return { title: 'Tickets Verified History', icon: FiShield, color: THEME.accent };
      case 'revenue': return { title: 'Revenue History', icon: FiDollarSign, color: THEME.success, format: (v) => `CHF ${v.toFixed(2)}` };
      default: return { title: 'Statistics', icon: FiBarChart2, color: THEME.accent };
    }
  };

  const config = getStatConfig(type);

  const chartData = useMemo(() => {
    if (!chainData || !chainData.blocks) return [];

    // Group by hour
    const hourlyData = {};
    const now = new Date();
    
    // Initialize last 24 hours with 0
    for (let i = 0; i < 24; i++) {
      const d = new Date(now);
      d.setHours(now.getHours() - i, 0, 0, 0);
      hourlyData[d.getTime()] = 0;
    }

    chainData.blocks.forEach(block => {
      if (block.transactions) {
        block.transactions.forEach(tx => {
          const txTimestamp = tx.payload?.timestamp || block.timestamp;
          const txDate = new Date(txTimestamp);
          txDate.setMinutes(0, 0, 0);
          const key = txDate.getTime();

          let match = false;
          let value = 1;

          if (type === 'issuedToday' && tx.type === 'MINT') match = true;
          else if (type === 'activated' && tx.type === 'ACTIVATE') match = true;
          else if (type === 'verified' && tx.type === 'INSPECT') match = true;
          else if (type === 'revenue' && tx.type === 'MINT' && tx.payload?.price) {
            match = true;
            value = parseFloat(tx.payload.price);
          }

          if (match) {
            hourlyData[key] = (hourlyData[key] || 0) + value;
          }
        });
      }
    });

    return Object.entries(hourlyData)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([ts, value]) => ({
        timestamp: Number(ts),
        value,
        label: new Date(Number(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      }));
  }, [chainData, type]);

  const maxValue = useMemo(() => Math.max(...chartData.map(d => d.value), 1), [chartData]);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: THEME.background }}>
      <div className="max-w-6xl mx-auto">
        <motion.button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 mb-6 text-white font-bold uppercase text-xs"
          whileHover={{ x: -5 }}
        >
          <FiArrowLeft /> Back to Dashboard
        </motion.button>

        <AnimatedCard 
          className="p-6 rounded-lg border-2"
          style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${config.color}20` }}>
              <config.icon size={24} style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: THEME.text }}>{config.title}</h1>
              <p style={{ color: THEME.textMuted }}>Last 24 Hours Activity</p>
            </div>
          </div>

          {/* Custom Bar Chart - Histogram with Y-axis and labels below */}
          <div className="flex h-64 mt-8">
            {/* Y Axis */}
            <div className="flex flex-col justify-between pr-4 text-xs h-full py-1 border-r" style={{ borderColor: THEME.border, color: THEME.textMuted }}>
              <span>{config.format ? config.format(maxValue) : maxValue}</span>
              <span>{config.format ? config.format(maxValue / 2) : (maxValue / 2).toFixed(1)}</span>
              <span>0</span>
            </div>

            {/* Chart Area */}
            <div className="flex flex-1 items-end gap-1 sm:gap-2 pl-2 h-full">
              {chartData.map((item, index) => {
                const heightPercentage = (item.value / maxValue) * 100;
                
                return (
                  <div key={item.timestamp} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap z-10">
                      {config.format ? config.format(item.value) : item.value}
                      <br/>
                      {new Date(item.timestamp).toLocaleString([], { 
                        year: 'numeric', 
                        month: 'numeric', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                      })}
                    </div>
                    
                    {/* Bar */}
                    <motion.div 
                      className="w-full rounded-t bg-opacity-70 hover:bg-opacity-100 transition-all"
                      style={{ 
                        height: `${heightPercentage}%`, // No min height
                        backgroundColor: config.color,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{ delay: index * 0.02, duration: 0.5 }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X Axis Labels (Below chart) */}
          <div className="flex pl-12 mt-4"> {/* Added mt-4 for spacing */}
            {chartData.map((item, index) => (
              <div key={item.timestamp} className="flex-1 text-center">
                <span className="text-[10px] block whitespace-nowrap" style={{ color: THEME.textMuted }}>
                  {index % 3 === 0 ? item.label : ''}
                </span>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
};

export default StatsHistory;
