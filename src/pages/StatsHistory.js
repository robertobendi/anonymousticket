import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiBarChart2, FiTrendingUp, FiCheckCircle, FiShield, FiDollarSign } from 'react-icons/fi';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';

// Mock data for fallback (same as Dashboard)
const MOCK_CHAIN_DATA = {
  "success": true,
  "data": {
    "blocks": [
      { "index": 0, "timestamp": 1763852435033, "transactions": [], "previousHash": "0", "hash": "", "nonce": 0 },
      { "index": 1, "timestamp": 1763853524047, "transactions": [{ "id": "d39030b6-6834-4868-bc06-3a178d51688c", "type": "MINT", "ticketId": "ede8e65e94a0957c7938fe11a1ce3f15574d7cfe4dc5f43af04f2356edf59b2a", "payload": { "price": "5.00", "timestamp": 1763853528211, "duration": 7200000, "deviceId": "CLI_KIOSK" }, "signature": "9530c5b59d43dbc7a4e84139b8a9cd59fe6c25adbb6f64d6ac130ce352c818d9728e2cc2a95d6b138a1c435eaa13f7c18b996686d8a76f8bb140fdbf0f64f30d" }], "previousHash": "", "hash": "0093ab5bebb88bd30f0d106396795cb0b186b24b4577c5f2e14ed82577411279", "nonce": 33 },
      { "index": 2, "timestamp": 1763853526322, "transactions": [{ "id": "9482331e-646b-4d13-a7f1-ad06a15b8ffd", "type": "ACTIVATE", "ticketId": "ede8e65e94a0957c7938fe11a1ce3f15574d7cfe4dc5f43af04f2356edf59b2a", "payload": { "location": "Demo Station", "timestamp": 1763853530496, "deviceId": "PHONE_APP" }, "signature": "0cb18e4b70d87ec1d17b655c928908e3fbdfd0de87a169a91b20255c1b9024963b88e498596728903c8077f14ffd1644f5cc70ab16be2504ba58fea04582c109" }], "previousHash": "0093ab5bebb88bd30f0d106396795cb0b186b24b4577c5f2e14ed82577411279", "hash": "0087d36e3fa17760405576d2dfc53e11ed4838ce3cf44de3aa235d43bcab372a", "nonce": 32 },
      { "index": 3, "timestamp": 1763853528907, "transactions": [{ "id": "0ecca83f-ec55-4b52-b859-e2d0bf83a156", "type":"INSPECT", "ticketId": "ede8e65e94a0957c7938fe11a1ce3f15574d7cfe4dc5f43af04f2356edf59b2a", "payload": { "location": "Train IC1", "timestamp": 1763853533081, "deviceId": "POLICE_SCANNER" }, "signature": "8c25524e6103751315c5186a6b79e5bb5b3bdc0df2d991bb261c5da396dd26caccc056527d2897ec6e43c8b86a238b848f6b7d2bccb40380aa2336d004008e07" }], "previousHash": "0087d36e3fa17760405576d2dfc53e11ed4838ce3cf44de3aa235d43bcab372a", "hash": "00d4e0a5c2bc47e1193620331a128195a55a81bbd3797e77e7c2627d3fd755be", "nonce": 312 },
      { "index": 4, "timestamp": 1763853530017, "transactions": [{ "id": "eaefd7d3-7017-4c7b-9298-d3b5b1db026e", "type": "INSPECT", "ticketId": "ede8e65e94a0957c7938fe11a1ce3f15574d7cfe4dc5f43af04f2356edf59b2a", "payload": { "location": "Train IC1", "timestamp": 1763853534192, "deviceId": "POLICE_SCANNER" }, "signature": "0daa7bdac002e240bb36962bff85df9eddaf9f3d6d2ac4b9be0b064cb44d7ffa5ab39b9f5e078ada893682cea54f1bc1b8f76480a7e3762d76eaaffa7890210f" }], "previousHash": "00d4e0a5c2bc47e1193620331a128195a55a81bbd3797e77e7c2627d3fd755be", "hash": "0058f1e52bec93df0e2edf1c703c2cb6d47b994e74b50ab7020abf461bd732c7", "nonce": 158 },
      { "index": 5, "timestamp": 1763853533797, "transactions": [{ "id": "cbc03182-d985-43a4-8ac3-73e8907b79af", "type": "MINT", "ticketId": "ad249c3ae3368ad7faf72ece059598743a56dc42604a8c423496895b4d280d0d", "payload": { "price": "5.00", "timestamp": 1763853537972, "duration": 7200000, "deviceId": "CLI_KIOSK" }, "signature": "9e9a2dd2c1d1f09bb1a7a37e5602a026aee167194f9084d585936ab7610aa01d46ccf0d954647690fe9125cd8fd9d166b383b4ea9647bdc89fce9af9c695840c" }], "previousHash": "0058f1e52bec93df0e2edf1c703c2cb6d47b994e74b50ab7020abf461bd732c7", "hash": "00f5bf458396113a5d28774db1694be4fbcdf9db1af88c21cc95efbddb52a371", "nonce": 405 },
      { "index": 6, "timestamp": 1763853535662, "transactions": [{ "id": "16f033a8-923b-4103-856b-ffd9f91dcd27", "type": "ACTIVATE", "ticketId": "ad249c3ae3368ad7faf72ece059598743a56dc42604a8c423496895b4d280d0d", "payload": { "location": "Demo Station", "timestamp": 1763853539777, "deviceId": "PHONE_APP" }, "signature": "dae7f69c2fa1fd73adb19a2587b22fab6c22fe33bc98ae3694e533528a4041aebee21ba0d1e14d8ca86e8de09c069399f14e52ada41ab0550478bce158237e0a" }], "previousHash": "00f5bf458396113a5d28774db1694be4fbcdf9db1af88c21cc95efbddb52a371", "hash": "0029847d56e1023da6ae5d3634c8e9a6c7cfd74be05443543c8a3309913a7f61", "nonce": 94 }
    ],
    "pending": [],
    "difficulty": 2,
    "height": 7
  }
};

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
            setChainData(MOCK_CHAIN_DATA.data);
            setIsLoading(false);
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
