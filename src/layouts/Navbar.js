import { Link, useLocation } from "react-router-dom";
import { useState, memo } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiCreditCard, FiHome, FiRadio, FiBarChart2 } from 'react-icons/fi';
import config from '@lib/config';
import { THEME } from '@lib/themeColors';
import MobileSidebar from '@components/ui/MobileSidebar';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const menuItems = config.navigation.menu;
  
  // Navigation items with icons - matching MobileSidebar
  const navItems = [
    { path: '/', label: 'Home', icon: FiHome },
    { path: '/wallet', label: 'Wallet', icon: FiCreditCard },
    { path: '/verify', label: 'Verify', icon: FiRadio },
    { path: '/dashboard', label: 'Dashboard', icon: FiBarChart2 },
  ];

  return (
    <nav 
      className="sticky top-0 z-50 border-b" 
      style={{ 
        backgroundColor: THEME.background, 
        borderColor: THEME.border,
        paddingTop: 'env(safe-area-inset-top)'
      }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex justify-between items-center">
          {/* Logo - Compact Mobile Style */}
          <Link 
            to="/" 
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity min-h-[44px]"
          >
            <img 
              src="/logo.png" 
              alt="NodePass" 
              className="h-8 w-auto sm:h-10 flex-shrink-0"
            />
            <span 
              className="text-sm sm:text-base font-bold hidden xs:inline" 
              style={{ color: THEME.text }}
            >
              NodePass
            </span>
          </Link>

          {/* Desktop Menu - SBB Task-Oriented principle */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="font-bold text-xs sm:text-sm uppercase tracking-wide transition-colors px-3 py-2 min-h-[44px] flex items-center gap-2 rounded-lg"
                  style={{ 
                    color: isActive ? THEME.accent : THEME.text,
                    backgroundColor: isActive ? `${THEME.accent}15` : 'transparent',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = THEME.accent;
                      e.currentTarget.style.backgroundColor = `${THEME.accent}10`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = THEME.text;
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  aria-label={`Navigate to ${item.label}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu Button - Opens Sidebar */}
          <motion.button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: THEME.text }}
            whileHover={{ opacity: 0.7, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Open menu"
          >
            <FiMenu size={24} />
          </motion.button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </nav>
  );
}

export default memo(Navbar);