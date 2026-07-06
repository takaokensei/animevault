import React, { useState } from 'react';
import { useSaasAuthStore } from '../../stores/saasAuthStore';
import { saasService } from '../../services/saasService';
import { syncService } from '../../services/syncService';
import { Cloud, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

export const SaasAccountCard: React.FC = () => {
  const { zenithUser, isSaasLoggedIn } = useSaasAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.warn('Por favor, preencha o seu nome e e-mail!');
      return;
    }

    setIsLoading(true);
    try {
      await saasService.register(name, email);
      toast.success('Conta Zenith SaaS ativada com sucesso!');
    } catch (err) {
      toast.error('Falha ao conectar com o Zenith SaaS.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await syncService.processQueue();
      toast.success('Sincronização local finalizada com sucesso!');
    } catch (err) {
      toast.error('Falha ao processar sincronização local.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await saasService.logout();
    toast.info('Sessão Zenith Cloud Sync encerrada.');
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-violet-500/20 transition-all duration-300">
      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {!isSaasLoggedIn ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
              <Cloud className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Ativar Zenith Cloud Sync</h3>
              <p className="text-white/40 text-xs mt-0.5">Sincronize sua biblioteca local de animes de forma segura na nuvem Zenith.</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="flex flex-wrap gap-4 mt-6 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-white/50 mb-1.5">Seu Nome</label>
              <input
                type="text"
                placeholder="Ex: Cauã Vitor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                required
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-white/50 mb-1.5">Seu E-mail</label>
              <input
                type="email"
                placeholder="nome@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/10 active:scale-95 disabled:opacity-50 flex items-center gap-2 h-10 justify-center min-w-[150px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Conectar Nuvem</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-50" />
              <img
                src={zenithUser?.avatarUrl || 'https://github.com/github.png'}
                alt="Avatar"
                className="relative w-16 h-16 rounded-2xl object-cover border border-white/10 bg-[#161B22]"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#080B14] rounded-full animate-pulse" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{zenithUser?.name}</h3>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded-full">
                  Cloud Active
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5">{zenithUser?.email}</p>
              <p className="text-[10px] text-white/30 mt-1">Conta Zenith ID: {zenithUser?.id}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="px-5 py-2.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/20 rounded-xl font-medium transition-all text-xs active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Forçar Sincronização</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-all text-xs active:scale-95 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar Zenith</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
