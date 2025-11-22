import { motion } from 'framer-motion';
import { memo } from 'react';

/**
 * Animated card component with SBB-inspired animations
 */
const AnimatedCard = memo(({ 
  children, 
  className = '', 
  delay = 0,
  onClick,
  whileHover = { scale: 1.02 },
  whileTap = { scale: 0.98 }
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] // SBB smooth easing
      }}
      whileHover={onClick ? whileHover : undefined}
      whileTap={onClick ? whileTap : undefined}
      onClick={onClick}
      className={className}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </motion.div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

export default AnimatedCard;

