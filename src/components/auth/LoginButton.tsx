import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { loginWithMal, logout } from '../../services/authService';
import { motion } from 'framer-motion';

const MalLogo = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" fill="none">
    <rect width="48" height="48" rx="8" fill="#2E51A2" />
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontWeight="700" fontSize="22" fontFamily="Arial">M</text>
  </svg>
);

export const LoginButton: React.FC = () => {
  const isLoggedIn = useAuthStore((state: any) => state.isLoggedIn);

  const handleLogin = async () => {
    try {
      await loginWithMal();
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  if (isLoggedIn) {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={logout}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5',
        }}
        title="Encerrar sessão MyAnimeList"
      >
        Sair do MAL
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(46,81,162,0.4)' }}
      whileTap={{ scale: 0.97 }}
      onClick={handleLogin}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, #2E51A2 0%, #1a3a8c 100%)',
        color: 'white',
        border: '1px solid rgba(46,81,162,0.6)',
        boxShadow: '0 2px 12px rgba(46,81,162,0.3)',
      }}
      title="Entrar com MyAnimeList"
    >
      <MalLogo />
      <span>Entrar com MAL</span>
    </motion.button>
  );
};