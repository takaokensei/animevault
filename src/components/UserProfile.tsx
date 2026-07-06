import { useAuthStore } from '../stores/authStore';
import { logout } from '../services/authService';
import { useThemeStore } from '../stores/themeStore';
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const LogoutIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" 
    />
  </svg>
);

interface UserProfile {
  name: string;
  picture: string;
  email?: string;
}

interface AuthState {
  userProfile: UserProfile | null;
}

export function UserProfile() {
  const userProfile = useAuthStore((state: AuthState) => state.userProfile);
  const { theme, toggleTheme } = useThemeStore();

  if (!userProfile) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="relative">
        <img 
          src={userProfile.picture} 
          alt={`Foto de ${userProfile.name}`} 
          className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover"
          title={userProfile.name}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/default-avatar.png'; // fallback image
          }}
        />
        {/* Botão de configurações para tema (corrigido para não ser <button> dentro de <button>) */}
        <span
          onClick={toggleTheme}
          role="button"
          tabIndex={0}
          className="absolute bottom-0 right-0 bg-gray-800 hover:bg-blue-600 text-white rounded-full p-1 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          title={`Trocar para o tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
          aria-label="Configurações de tema"
          onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') toggleTheme(); }}
        >
          <SettingsIcon />
        </span>
      </div>
      <span 
        className="text-sm text-white font-medium text-center max-w-[120px] truncate" 
        title={userProfile.name}
      >
        {userProfile.name}
      </span>
      <button 
        onClick={handleLogout}
        className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        title="Sair"
        aria-label="Fazer logout"
      >
        <LogoutIcon />
      </button>
    </div>
  );
}