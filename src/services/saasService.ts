import { useSaasAuthStore, ZenithUser } from '../stores/saasAuthStore';
import { invoke } from './tauriService';
import { keyringSaveToken, keyringDeleteToken, KEYRING_ACCOUNTS } from './keyringService';

export class SaasService {
  private static instance: SaasService;

  static getInstance(): SaasService {
    if (!SaasService.instance) {
      SaasService.instance = new SaasService();
    }
    return SaasService.instance;
  }

  /**
   * Realiza o registro de um novo usuário no Zenith SaaS.
   */
  async register(name: string, email: string): Promise<ZenithUser> {
    try {
      console.log('[SaasService] Registrar usuario via API real:', { name, email });
      
      const response = await fetch('http://localhost:1421/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password: 'zenith_password_' + email // Senha determinística gerada por conveniência
        })
      });

      if (!response.ok) {
        // Se der conflito (já cadastrado), tenta fazer login direto!
        if (response.status === 409) {
          return this.login(email);
        }
        const errData = await response.json();
        throw new Error(errData.error || 'Erro no servidor SaaS');
      }

      const data = await response.json();
      const user: ZenithUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.name)}`,
        createdAt: new Date().toISOString()
      };

      useSaasAuthStore.getState().loginSaas(user, data.token);
      await keyringSaveToken(KEYRING_ACCOUNTS.ZENITH_JWT, data.token);
      return user;
    } catch (error) {
      console.error('[SaasService] Erro ao cadastrar no SaaS:', error);
      throw error;
    }
  }

  /**
   * Realiza o login do usuário no Zenith SaaS.
   */
  async login(email: string): Promise<ZenithUser> {
    try {
      console.log('[SaasService] Login usuario via API real:', email);
      
      const response = await fetch('http://localhost:1421/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'zenith_password_' + email
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao autenticar no SaaS');
      }

      const data = await response.json();
      const user: ZenithUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.name)}`,
        createdAt: new Date().toISOString()
      };

      useSaasAuthStore.getState().loginSaas(user, data.token);
      await keyringSaveToken(KEYRING_ACCOUNTS.ZENITH_JWT, data.token);
      return user;
    } catch (error) {
      console.error('[SaasService] Erro ao autenticar no SaaS:', error);
      throw error;
    }
  }

  /**
   * Realiza o logout do usuário.
   */
  async logout(): Promise<void> {
    useSaasAuthStore.getState().logoutSaas();
    await keyringDeleteToken(KEYRING_ACCOUNTS.ZENITH_JWT);
    console.log('[SaasService] Logout concluido.');
  }

  /**
   * Sincroniza uma modificação local com o backend do SaaS centralizado.
   */
  async syncLocalChanges(action: string, payload: any): Promise<boolean> {
    try {
      const token = useSaasAuthStore.getState().zenithToken;
      if (!token) {
        console.warn('[SaasService] Sincronização ignorada: usuário não autenticado no SaaS');
        return false;
      }
      
      // Delegamos a chamada HTTPS segura para o Rust
      const success = await invoke<boolean>('sync_to_saas_db', {
        token,
        action,
        payload: JSON.stringify(payload)
      });
      return success;
    } catch (error) {
      console.error('[SaasService] Erro na comunicacao do Rust com o SaaS:', error);
      return false;
    }
  }
}

export const saasService = SaasService.getInstance();
