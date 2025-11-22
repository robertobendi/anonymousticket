import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiX, 
  FiHome, 
  FiCreditCard, 
  FiRadio, 
  FiBarChart2,
  FiShield,
  FiMenu
} from 'react-icons/fi';
import { THEME } from '@lib/themeColors';

/**
 * Mobile Sidebar Menu Component
 * Tasty slide-in menu with SBB-inspired design
 */
const MobileSidebar = memo(({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Home', icon: FiHome },
    { path: '/wallet', label: 'My Wallet', icon: FiCreditCard },
    { path: '/verify', label: 'Verify Tickets', icon: FiRadio },
    { path: '/dashboard', label: 'Dashboard', icon: FiBarChart2 },
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            style={{ backdropFilter: 'blur(4px)' }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200,
              duration: 0.3
            }}
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] z-50 md:hidden overflow-y-auto"
            style={{ 
              backgroundColor: THEME.background,
              borderRight: `2px solid ${THEME.border}`,
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: THEME.border, backgroundColor: THEME.accent }}
            >
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="NodePass" 
                  className="h-10 w-auto"
                />
                <div>
                  <h2 className="text-white font-bold text-sm">NodePass</h2>
                  <p className="text-white/80 text-xs">Menu</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={{ color: '#ffffff' }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX size={24} />
              </motion.button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className="flex items-center gap-4 p-4 rounded-lg min-h-[56px] transition-all"
                      style={{
                        backgroundColor: isActive ? `${THEME.accent}20` : 'transparent',
                        borderLeft: isActive ? `4px solid ${THEME.accent}` : '4px solid transparent',
                        color: isActive ? THEME.accent : THEME.text
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = THEME.surfaceHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div 
                        className="w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ 
                          backgroundColor: isActive ? `${THEME.accent}30` : `${THEME.accent}15`
                        }}
                      >
                        <Icon size={20} style={{ color: isActive ? THEME.accent : THEME.text }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-base">{item.label}</div>
                        {isActive && (
                          <div className="text-xs mt-0.5" style={{ color: THEME.textMuted }}>
                            Current page
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: THEME.accent }}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer Section */}
            <div 
              className="mt-auto p-4 border-t"
              style={{ borderColor: THEME.border }}
            >
              <div 
                className="p-4 rounded-lg flex items-center gap-3"
                style={{ backgroundColor: `${THEME.accent}15` }}
              >
                <div 
                  className="w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${THEME.accent}30` }}
                >
                  <FiShield size={20} style={{ color: THEME.accent }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: THEME.text }}>
                    100% Anonymous
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: THEME.textMuted }}>
                    No personal data required
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

MobileSidebar.displayName = 'MobileSidebar';

export default MobileSidebar;

