import { motion } from 'framer-motion';
import { memo } from 'react';

/**
 * Animated card component with SBB-inspired design
 * Follows SBB design principles: Reduced, Self-Explanatory, Holistic
 */
const AnimatedCard = memo(({ 
  children, 
  className = '', 
  delay = 0,
  onClick,
  whileHover = { scale: 1.01 }, // Subtle hover - SBB Reduced principle
  whileTap = { scale: 0.99 }
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} // Reduced animation - SBB Reduced principle
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, // Faster, less distracting - SBB Reduced principle
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] // SBB smooth easing
      }}
      whileHover={onClick ? whileHover : undefined}
      whileTap={onClick ? whileTap : undefined}
      onClick={onClick}
      className={className}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: '8px' // SBB rounded corners
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Clickable card' : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </motion.div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

export default AnimatedCard;

