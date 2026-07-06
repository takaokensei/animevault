import { invoke, listen } from './tauriService';
import { UnlistenFn } from '@tauri-apps/api/event';
import { useAuthStore } from '../stores/authStore';
import type { MalUserProfile } from '../database/schema';

const MAL_CLIENT_ID = import.meta.env.VITE_MAL_CLIENT_ID;
const REDIRECT_URI = 'http://127.0.0.1:1421/auth/callback';


// Constantes de configuração
const AUTH_TIMEOUT = 300000; // 5 minutos
const STORAGE_KEYS = {
  PKCE_VERIFIER: 'pkce_code_verifier',
  PKCE_STATE: 'pkce_state',
  AUTH_IN_PROGRESS: 'auth_in_progress'
} as const;

// Constantes de Rate Limiting
const RATE_LIMIT_CONFIG = {
  MIN_REQUEST_INTERVAL: 1000, // 1 segundo entre requisições
  MAX_RETRIES: 3,
  BASE_DELAY: 2000, // 2 segundos para retry
  MAX_DELAY: 30000, // 30 segundos máximo
  BATCH_DELAY: 2000, // 2 segundos entre lotes
} as const;

// Tipos
interface MalTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

interface AuthCallbackPayload {
  code: string;
  state: string;
}

interface RetryableError {
  isRetryable: boolean;
  delay?: number;
}

// Classe para gerenciar erros de autenticação
class AuthError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AuthError';
  }
}

// Classe para gerenciar Rate Limiting
class RateLimiter {
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly minInterval: number;
  
  constructor(minInterval: number = RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL) {
    this.minInterval = minInterval;
  }
  
  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting: aguardando ${waitTime}ms`, {
        requestCount: this.requestCount,
        timeSinceLastRequest
      });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
  
  reset(): void {
    this.lastRequestTime = 0;
    this.requestCount = 0;
  }
  
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      timeSinceLastRequest: Date.now() - this.lastRequestTime
    };
  }
}

// Utilitários de logging
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[AUTH] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[AUTH ERROR] ${message}`, error || '');
  },
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[AUTH DEBUG] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[AUTH WARN] ${message}`, data || '');
  }
};

// Instância global do rate limiter
const rateLimiter = new RateLimiter();

// --- Utilitários de Storage ---
const storage = {
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
      logger.debug(`Storage set: ${key}`);
    } catch (error) {
      logger.error(`Failed to set storage key ${key}`, error);
    }
  },
  
  get: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      logger.debug(`Storage get: ${key}`, value ? 'found' : 'not found');
      return value;
    } catch (error) {
      logger.error(`Failed to get storage key ${key}`, error);
      return null;
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
      logger.debug(`Storage removed: ${key}`);
    } catch (error) {
      logger.error(`Failed to remove storage key ${key}`, error);
    }
  },
  
  clear: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => storage.remove(key));
  }
};

// --- Utilitários de Detecção de Erro ---
function isHtmlResponse(response: string): boolean {
  const trimmed = response.trim();
  return trimmed.startsWith('<!DOCTYPE') || 
         trimmed.startsWith('<html') || 
         trimmed.includes('<title>') ||
         trimmed.includes('</html>');
}

function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorString = error?.toString?.()?.toLowerCase() || '';
  
  return errorMessage.includes('rate') ||
         errorMessage.includes('429') ||
         errorMessage.includes('too many') ||
         errorString.includes('rate') ||
         errorString.includes('429') ||
         errorString.includes('too many');
}

function analyzeError(error: any, response?: string): RetryableError {
  const errorMessage = error?.message || '';

  // Verificar se é resposta HTML (rate limit ou erro de proxy do MAL)
  if (errorMessage === 'HTML_RESPONSE' || (response && isHtmlResponse(response))) {
    logger.warn('Resposta HTML detectada, provavelmente rate limited. Solicitando nova tentativa...');
    return { isRetryable: true, delay: RATE_LIMIT_CONFIG.BASE_DELAY * 2 }; // Aumenta o delay inicial para respostas HTML
  }
  
  // Verificar se é erro de rate limit
  if (isRateLimitError(error)) {
    logger.warn('Erro de rate limit detectado');
    return { isRetryable: true, delay: RATE_LIMIT_CONFIG.BASE_DELAY };
  }
  
  // Verificar se é erro de rede temporário
  const networkErrors = ['network', 'timeout', 'connection', 'fetch'];
  const errorString = error?.toString?.()?.toLowerCase() || '';
  
  if (networkErrors.some(keyword => errorString.includes(keyword))) {
    logger.warn('Erro de rede detectado');
    return { isRetryable: true, delay: RATE_LIMIT_CONFIG.BASE_DELAY };
  }
  
  // Verificar se é erro JSON (pode ser temporário)
  if (error?.message?.includes('JSON.parse') || error?.message?.includes('Unexpected token')) {
    logger.warn('Erro de parsing JSON detectado');
    return { isRetryable: true, delay: RATE_LIMIT_CONFIG.BASE_DELAY };
  }
  
  // Não é retryable
  return { isRetryable: false };
}


// --- Função de Retry com Backoff Exponencial ---
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = RATE_LIMIT_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Aplicar rate limiting antes de cada tentativa
      await rateLimiter.waitForRateLimit();
      
      logger.debug(`${operationName} - Tentativa ${attempt + 1}/${maxRetries + 1}`);
      
      const result = await operation();
      
      if (attempt > 0) {
        logger.info(`${operationName} - Sucesso na tentativa ${attempt + 1}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logger.error(`${operationName} - Todas as tentativas falharam`, error);
        break;
      }
      
      const errorAnalysis = analyzeError(error);
      
      if (!errorAnalysis.isRetryable) {
        logger.error(`${operationName} - Erro não retryable`, error);
        break;
      }
      
      // Calcular delay com backoff exponencial
      const baseDelay = errorAnalysis.delay || RATE_LIMIT_CONFIG.BASE_DELAY;
      const delay = Math.min(baseDelay * Math.pow(2, attempt), RATE_LIMIT_CONFIG.MAX_DELAY);
      
      logger.warn(`${operationName} - Tentativa ${attempt + 1} falhou, aguardando ${delay}ms`, {
        error: (typeof error === 'object' && error !== null && 'message' in error) ? (error as any).message : String(error),
        nextAttempt: attempt + 2,
        maxRetries: maxRetries + 1
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// --- Validação de Environment ---
function validateEnvironment(): void {
  if (!MAL_CLIENT_ID) {
    throw new AuthError('MAL_CLIENT_ID não configurado', 'ENV_MISSING');
  }
  
  if (!window.crypto?.getRandomValues) {
    throw new AuthError('Crypto API não disponível', 'CRYPTO_UNAVAILABLE');
  }
}

// --- Validação de Estado ---
function validateAuthState(receivedState: string, storedState: string | null): boolean {
  if (!receivedState || !storedState) {
    logger.error('Estado ausente', { receivedState: !!receivedState, storedState: !!storedState });
    return false;
  }
  
  if (receivedState !== storedState) {
    logger.error('Estado inválido', { 
      received: receivedState.substring(0, 10) + '...', 
      stored: storedState.substring(0, 10) + '...' 
    });
    return false;
  }
  
  return true;
}

// --- Função de Exchange de Tokens ---
async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<MalTokenResponse> {
  if (!code || !codeVerifier) {
    throw new AuthError('Código ou verifier ausente', 'INVALID_PARAMS');
  }
  
  const params = {
    code,
    codeVerifier,
    redirectUri: REDIRECT_URI,
  };
  
  logger.debug('Enviando parâmetros para exchange', {
    code: code.substring(0, 20) + '...',
    codeVerifier: codeVerifier.substring(0, 20) + '...',
    redirectUri: REDIRECT_URI
  });
  
  return executeWithRetry(async () => {
    const response = await invoke<string>('exchange_code_for_token', params);
    logger.debug('Resposta do backend recebida');
    
    if (!response) {
      throw new AuthError('Resposta vazia do backend', 'EMPTY_RESPONSE');
    }
    
    // Verificar se é resposta HTML
    if (isHtmlResponse(response)) {
      throw new AuthError('Resposta HTML recebida (rate limited)', 'HTML_RESPONSE');
    }
    
    const tokens = JSON.parse(response);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new AuthError('Tokens inválidos recebidos', 'INVALID_TOKENS', tokens);
    }
    
    logger.info('Tokens obtidos com sucesso');
    return tokens;
  }, 'Token Exchange');
}

// --- Função para buscar perfil ---
async function fetchMalUserProfile(accessToken: string): Promise<MalUserProfile> {
  if (!accessToken) {
    throw new AuthError('Token de acesso ausente', 'NO_ACCESS_TOKEN');
  }
  
  return executeWithRetry(async () => {
    logger.debug('Buscando perfil do usuário');
    const responseJson = await invoke<string>('get_authenticated_user_profile', {
      token: accessToken
    });
    
    if (!responseJson) {
      throw new AuthError('Resposta vazia do perfil', 'EMPTY_PROFILE_RESPONSE');
    }
    
    // Verificar se é resposta HTML
    if (isHtmlResponse(responseJson)) {
      throw new AuthError('Resposta HTML recebida (rate limited)', 'HTML_RESPONSE');
    }
    
    const profile: MalUserProfile = JSON.parse(responseJson);
    
    if (!profile.id || !profile.name) {
      throw new AuthError('Perfil inválido recebido', 'INVALID_PROFILE', profile);
    }
    
    logger.info('Perfil obtido com sucesso', { id: profile.id, name: profile.name });
    return profile;
  }, 'User Profile Fetch');
}

// --- Função de Cleanup ---
function cleanupAuthProcess(): void {
  storage.clear();
  rateLimiter.reset();
  logger.debug('Cleanup da autenticação executado');
}

// --- Handler do Callback ---
async function handleAuthCallback(event: { payload: AuthCallbackPayload }): Promise<void> {
  logger.info('Callback de autenticação recebido');
  
  try {
    const { code, state: receivedState } = event.payload;
    const storedState = storage.get(STORAGE_KEYS.PKCE_STATE);
    const storedVerifier = storage.get(STORAGE_KEYS.PKCE_VERIFIER);
    
    logger.debug('Dados do callback', {
      hasCode: !!code,
      hasReceivedState: !!receivedState,
      hasStoredState: !!storedState,
      hasStoredVerifier: !!storedVerifier
    });
    
    // Validações
    if (!validateAuthState(receivedState, storedState)) {
      throw new AuthError('Validação de estado falhou', 'STATE_VALIDATION_FAILED');
    }
    
    if (!code) {
      throw new AuthError('Código de autorização ausente', 'NO_AUTH_CODE');
    }
    
    if (!storedVerifier) {
      throw new AuthError('Code verifier ausente', 'NO_CODE_VERIFIER');
    }
    
    // Processar tokens
    logger.info('Iniciando troca de tokens');
    const tokens = await exchangeCodeForTokens(code, storedVerifier);
    
    // Buscar perfil
    logger.info('Buscando perfil do usuário');
    const profile = await fetchMalUserProfile(tokens.access_token);
    
    // Salvar no store
    logger.info('Salvando dados no store');
    const authStore = useAuthStore.getState();
    authStore.login(
      { 
        accessToken: tokens.access_token, 
        refreshToken: tokens.refresh_token 
      }, 
      profile
    );
    
    // Verificar se o login foi bem-sucedido
    const updatedState = useAuthStore.getState();
    if (!updatedState.accessToken || !updatedState.userProfile) {
      throw new AuthError('Login não foi persistido no store', 'STORE_UPDATE_FAILED');
    }
    
    logger.info('Login concluído com sucesso', { 
      userId: profile.id, 
      userName: profile.name 
    });
    
    // Cleanup
    cleanupAuthProcess();
    
  } catch (error) {
    logger.error('Erro no callback de autenticação', error);
    cleanupAuthProcess();
    
    // Mostrar erro específico baseado no tipo
    if (error instanceof AuthError) {
      switch (error.code) {
        case 'HTML_RESPONSE':
          logger.error('MAL está retornando HTML - possível rate limit ou bloqueio temporário');
          break;
        case 'RATE_LIMITED':
          logger.error('Rate limit atingido - tente novamente em alguns minutos');
          break;
        default:
          logger.error(`Erro de autenticação: ${error.message} (${error.code})`);
      }
    }
    
    throw error; // Re-throw para que o UI possa lidar com o erro
  }
}

// --- Função Principal de Login ---
export async function loginWithMal(): Promise<void> {
  try {
    // Validar ambiente
    validateEnvironment();
    
    // Verificar se já há processo em andamento
    const authInProgress = storage.get(STORAGE_KEYS.AUTH_IN_PROGRESS);
    if (authInProgress) {
      logger.info('Processo de autenticação já em andamento');
      return;
    }
    
    logger.info('Iniciando processo de autenticação');
    storage.set(STORAGE_KEYS.AUTH_IN_PROGRESS, 'true');
    
    // Gerar PKCE e state no Rust (criptografia S256 nativa segura)
    const pkceData = await invoke<{ code_verifier: string; code_challenge: string; state: string }>('generate_pkce_challenge');
    const { code_verifier: codeVerifier, code_challenge: codeChallenge, state } = pkceData;
    
    // Armazenar dados
    storage.set(STORAGE_KEYS.PKCE_VERIFIER, codeVerifier);
    storage.set(STORAGE_KEYS.PKCE_STATE, state);
    
    logger.debug('PKCE gerado via Rust (S256)', {
      verifier: codeVerifier.substring(0, 20) + '...',
      challenge: codeChallenge.substring(0, 20) + '...',
      state: state.substring(0, 20) + '...'
    });
    
    // Iniciar servidor de callback
    logger.info('Iniciando servidor de callback');
    await invoke('start_auth_server');
    
    // Configurar listener
    logger.info('Configurando listener de callback');
    let unlisten: UnlistenFn | null = null;
    
    // Timeout para cleanup
    const timeoutId = setTimeout(() => {
      logger.error('Timeout na autenticação');
      if (unlisten) unlisten();
      cleanupAuthProcess();
    }, AUTH_TIMEOUT);
    
    unlisten = await listen<AuthCallbackPayload>('mal-auth-callback', async (event) => {
      clearTimeout(timeoutId);
      if (unlisten) unlisten();
      await handleAuthCallback(event);
    });
    
    // Construir URL de autorização
    const authUrl = new URL('https://myanimelist.net/v1/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', MAL_CLIENT_ID);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    
    logger.info('Abrindo navegador para autorização');
    await invoke('open_in_browser', { url: authUrl.toString() });
    
  } catch (error) {
    logger.error('Erro no processo de login', error);
    cleanupAuthProcess();
    
    if (error instanceof AuthError) {
      throw error;
    }
    
    throw new AuthError('Falha no processo de login', 'LOGIN_FAILED', error);
  }
}

// --- Função de Logout ---
export function logout(): void {
  try {
    logger.info('Executando logout');
    useAuthStore.getState().logout();
    cleanupAuthProcess();
    logger.info('Logout concluído');
  } catch (error) {
    logger.error('Erro durante logout', error);
    // Forçar limpeza mesmo com erro
    cleanupAuthProcess();
  }
}

// --- Função para fazer requisições MAL com retry ---
export async function malApiRequest<T>(
  operation: () => Promise<string>,
  operationName: string
): Promise<T> {
  return executeWithRetry(async () => {
    const response = await operation();
    
    if (!response) {
      throw new Error('Resposta vazia da API');
    }
    
    if (isHtmlResponse(response)) {
      throw new Error('HTML_RESPONSE');
    }
    
    return JSON.parse(response) as T;
  }, operationName);
}

// --- Função para processamento em lotes ---
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5,
  batchDelay: number = RATE_LIMIT_CONFIG.BATCH_DELAY
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    logger.debug(`Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`, {
      batchSize: batch.length,
      totalItems: items.length,
      progress: `${i + batch.length}/${items.length}`
    });
    
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    
    results.push(...batchResults);
    
    // Pausa entre lotes (exceto no último)
    if (i + batchSize < items.length) {
      logger.debug(`Pausando ${batchDelay}ms entre lotes`);
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  return results;
}

// --- Service Principal ---
export const authService = {
  getValidToken: (): string | null => {
    const state = useAuthStore.getState();
    const token = state.accessToken;
    
    logger.debug('Token válido solicitado', {
      hasToken: !!token,
      isAuthenticated: !!state.userProfile
    });
    
    return token;
  },
  
  isAuthenticated: (): boolean => {
    const state = useAuthStore.getState();
    const isAuth = !!(state.accessToken && state.userProfile);
    
    logger.debug('Status de autenticação', {
      isAuthenticated: isAuth,
      hasToken: !!state.accessToken,
      hasUserProfile: !!state.userProfile
    });
    
    return isAuth;
  },
  
  loginWithMal,
  logout,
  malApiRequest,
  processBatch,
  
  // Função para debug
  getAuthState: () => {
    const state = useAuthStore.getState();
    return {
      isAuthenticated: authService.isAuthenticated(),
      hasToken: !!state.accessToken,
      hasUserProfile: !!state.userProfile,
      userId: state.userProfile?.id,
      userName: state.userProfile?.name,
      rateLimiterStats: rateLimiter.getStats()
    };
  },
  
  // Função para resetar rate limiter (útil para debug)
  resetRateLimit: () => {
    rateLimiter.reset();
    logger.info('Rate limiter resetado');
  }
};