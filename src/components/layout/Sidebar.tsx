// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSaasAuthStore } from '../../stores/saasAuthStore';
import { loginWithMal, logout } from '../../services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// ── Icons ──────────────────────────────────────────────────────────────────
const LibraryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
  </svg>
);

const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MalIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
);

// ── NavItem ────────────────────────────────────────────────────────────────
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

function NavItem({ to, icon, label, end }: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 group
        ${isActive
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
          : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon}
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg whitespace-nowrap pointer-events-none shadow-xl border border-white/10 z-50"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
export function Sidebar() {
  const isLoggedIn = useAuthStore((state: any) => state.isLoggedIn);
  const userProfile = useAuthStore((state: any) => state.userProfile);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isSyncing = useSaasAuthStore(s => s.isSyncing);
  const isSaasLoggedIn = useSaasAuthStore(s => s.isSaasLoggedIn);
  const lastSyncedAt = useSaasAuthStore(s => s.lastSyncedAt);

  const handleLogin = async () => {
    try {
      await loginWithMal();
    } catch (e) {
      console.error('Login failed:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 flex flex-col items-center justify-between py-6 z-40"
      style={{
        background: 'linear-gradient(180deg, rgba(15,10,30,0.95) 0%, rgba(20,14,40,0.98) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-8">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer select-none"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
          }}
          onClick={() => navigate('/')}
          title="AnimeVault"
        >
          <span className="text-white font-black text-lg tracking-tight">AV</span>
        </motion.div>

        {/* Nav links */}
        <nav className="flex flex-col items-center gap-3">
          <NavItem to="/" icon={<LibraryIcon />} label="Biblioteca" end />
          {isLoggedIn && (
            <NavItem to="/profile" icon={<ProfileIcon />} label="Perfil" />
          )}
        </nav>

        {/* Indicador de Sync SaaS */}
        {isSaasLoggedIn && (
          <motion.div
            className="relative flex items-center justify-center w-10 h-10 rounded-xl cursor-default"
            title={isSyncing
              ? 'Sincronizando com Zenith…'
              : lastSyncedAt
                ? `Última sync: ${new Date(lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Zenith conectado'}
          >
            {/* Glow de fundo quando sincronizando */}
            {isSyncing && (
              <div className="absolute inset-0 rounded-xl bg-violet-500/20 animate-pulse" />
            )}
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              style={{ color: isSyncing ? '#a78bfa' : '#4ade80' }}
              animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
              transition={isSyncing ? { repeat: Infinity, duration: 1.2, ease: 'linear' } : { duration: 0.3 }}
            >
              <path d="M12 2a10 10 0 0 1 7.39 3.22" />
              <path d="M2.05 13A10 10 0 0 0 12 22a10 10 0 0 0 9.96-9" />
              <polyline points="22 4 22 10 16 10" />
              <polyline points="2 20 2 14 8 14" />
            </motion.svg>
          </motion.div>
        )}
      </div>

      {/* Bottom: user avatar or login */}
      <div className="relative flex flex-col items-center gap-3">
        {isLoggedIn && userProfile ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserMenu(v => !v)}
              className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-violet-500/40 hover:border-violet-400 transition-all duration-200 shadow-lg shadow-violet-500/20"
              title={userProfile.name}
            >
              <img
                src={userProfile.picture}
                alt={userProfile.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.png';
                }}
              />
              <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
            </motion.button>

            {/* Popup menu */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-full ml-3 bottom-0 w-52 rounded-2xl overflow-hidden shadow-2xl z-50"
                  style={{
                    background: 'rgba(20,14,40,0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-white truncate">{userProfile.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">MyAnimeList</p>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      <ProfileIcon />
                      Ver Perfil
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors mt-1"
                    >
                      <LogoutIcon />
                      Sair
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogin}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
            title="Entrar com MyAnimeList"
          >
            <MalIcon />
          </motion.button>
        )}
      </div>
    </aside>
  );
}