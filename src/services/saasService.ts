import { useSaasAuthStore, ZenithUser } from '../stores/saasAuthStore';
import { invoke } from './tauriService';

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
      console.log('[SaasService] Registrar usuario:', { name, email });
      
      // Simulação de cadastro local (SaaS mockup)
      const mockUser: ZenithUser = {
        id: Math.random().toString(36).substring(2, 11),
        email,
        name,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
        createdAt: new Date().toISOString()
      };
      
      const mockToken = 'mock_jwt_token_' + Math.random().toString(36).substring(2, 15);
      
      // Salva no store
      useSaasAuthStore.getState().loginSaas(mockUser, mockToken);
      return mockUser;
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
      console.log('[SaasService] Login usuario:', email);
      
      // Simulação de login local (SaaS mockup)
      const mockUser: ZenithUser = {
        id: 'user_12345',
        email,
        name: email.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        createdAt: new Date().toISOString()
      };
      
      const mockToken = 'mock_jwt_token_active';
      
      // Salva no store
      useSaasAuthStore.getState().loginSaas(mockUser, mockToken);
      return mockUser;
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
    console.log('[SaasService] Logout concluido.');
  }

  /**
   * Sincroniza uma modificação local com o backend do SaaS centralizado.
   */
  async syncLocalChanges(action: string, payload: any): Promise<boolean> {
    try {
      // Delegamos a chamada HTTPS segura para o Rust
      const success = await invoke<boolean>('sync_to_saas_db', {
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
