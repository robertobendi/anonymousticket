import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiUser, FiArrowRight } from 'react-icons/fi';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Clear auth on load
    sessionStorage.removeItem('dashboard_auth');
  }, []);

  const calculateHash = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Verify Username
      if (username !== 'admin') {
        throw new Error('Invalid credentials');
      }

      // 2. Fetch the hash from file
      const response = await fetch('/passwordhash.txt');
      if (!response.ok) throw new Error('Auth system error');
      
      const storedHash = (await response.text()).trim();
      
      // 3. Calculate hash of input password
      const inputHash = await calculateHash(password);

      // 4. Compare
      if (inputHash === storedHash) {
        sessionStorage.setItem('dashboard_auth', 'true');
        navigate('/dashboard');
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4" 
      style={{ backgroundColor: THEME.background }}
    >
      <AnimatedCard 
        className="w-full max-w-md p-8 rounded-xl border-2"
        style={{ 
          backgroundColor: THEME.card, 
          borderColor: THEME.border,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.accent}20` }}>
            <FiLock size={32} style={{ color: THEME.accent }} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: THEME.text }}>
          Dashboard Access
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase mb-2" style={{ color: THEME.textMuted }}>
              Username
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: THEME.textMuted }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded bg-transparent border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: THEME.border,
                  color: THEME.text
                }}
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-2" style={{ color: THEME.textMuted }}>
              Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: THEME.textMuted }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded bg-transparent border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: THEME.border,
                  color: THEME.text
                }}
                placeholder="Enter password"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold text-center p-2 rounded"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
            >
              {error}
            </motion.div>
          )}

          <AnimatedButton
            type="submit"
            className="w-full py-3 font-bold uppercase tracking-wider"
            disabled={isLoading}
            loading={isLoading}
            icon={FiArrowRight}
          >
            Login
          </AnimatedButton>
        </form>
      </AnimatedCard>
    </div>
  );
};

export default Login;

