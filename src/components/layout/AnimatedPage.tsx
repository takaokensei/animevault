// src/components/layout/AnimatedPage.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedPageProps {
  children: React.ReactNode;
}

/**
 * Wrapper de animação premium para transição de páginas inspirada em SaaS (fade + slide vertical suave).
 * Usa uma curva de aceleração de luxo (cubic-bezier) que simula interações nativas do sistema.
 */
export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ 
        duration: 0.35, 
        ease: [0.22, 1, 0.36, 1] // Ease-out quint suave para feeling orgânico
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};
export default AnimatedPage;
