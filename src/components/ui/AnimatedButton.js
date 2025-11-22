import { motion } from 'framer-motion';
import { memo } from 'react';

/**
 * Animated button with SBB-inspired interactions
 * Mobile-optimized with proper touch targets
 */
const AnimatedButton = memo(({ 
  children, 
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  icon: Icon,
  loading = false,
  ...props
}) => {
  const baseStyles = {
    minHeight: '48px', // SBB minimum touch target
    minWidth: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '700', // SBB bold
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontSize: '14px', // SBB button text
    transition: 'all 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    borderRadius: '8px', // SBB rounded corners
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#EB0000',
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#EB0000',
      border: '2px solid #EB0000',
    },
    success: {
      backgroundColor: '#00a651',
      color: '#ffffff',
    },
  };

  return (
    <motion.button
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        opacity: disabled ? 0.5 : 1,
      }}
      whileHover={!disabled && !loading ? { 
        scale: 1.02,
        backgroundColor: variant === 'primary' ? '#d10000' : 
                         variant === 'success' ? '#009944' : '#EB0000',
      } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: '20px', height: '20px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}
        />
      ) : (
        <>
          {Icon && <Icon size={20} />}
          {children}
        </>
      )}
    </motion.button>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;

