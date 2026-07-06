/**
 * keyringService.ts
 *
 * Abstração sobre os comandos Tauri de Keyring para armazenamento seguro
 * de tokens OAuth e JWT no keychain nativo do sistema operacional.
 *
 * Windows: Windows Credential Manager
 * macOS:   Keychain Access
 * Linux:   Secret Service (libsecret / GNOME Keyring)
 */

import { invoke } from './tauriService';

const SERVICE_NAME = 'animevault-zenith';

/**
 * Salva um token de forma segura no keychain do SO.
 * Substitui o armazenamento inseguro em arquivo de texto plano.
 */
export async function keyringSaveToken(account: string, secret: string): Promise<void> {
  try {
    await invoke<void>('secure_save_token', {
      service: SERVICE_NAME,
      account,
      secret,
    });
  } catch (err) {
    // Fallback para localStorage se keyring não disponível (ex: ambiente de teste)
    console.warn(`[KeyringService] Keyring indisponível, usando localStorage como fallback. Conta: ${account}`, err);
    localStorage.setItem(`keyring_${account}`, secret);
  }
}

/**
 * Carrega um token do keychain do SO.
 * Retorna null se não houver token salvo.
 */
export async function keyringLoadToken(account: string): Promise<string | null> {
  try {
    const result = await invoke<string | null>('secure_load_token', {
      service: SERVICE_NAME,
      account,
    });
    return result;
  } catch (err) {
    // Fallback para localStorage
    console.warn(`[KeyringService] Keyring indisponível, lendo localStorage. Conta: ${account}`, err);
    return localStorage.getItem(`keyring_${account}`);
  }
}

/**
 * Remove um token do keychain do SO (logout / revogação de acesso).
 */
export async function keyringDeleteToken(account: string): Promise<void> {
  try {
    await invoke<void>('secure_delete_token', {
      service: SERVICE_NAME,
      account,
    });
  } catch (err) {
    console.warn(`[KeyringService] Falha ao deletar do keyring, limpando localStorage. Conta: ${account}`, err);
    localStorage.removeItem(`keyring_${account}`);
  }
}

// Contas padronizadas — evita strings soltas espalhadas pelo código
export const KEYRING_ACCOUNTS = {
  MAL_ACCESS_TOKEN: 'mal_access_token',
  MAL_REFRESH_TOKEN: 'mal_refresh_token',
  ZENITH_JWT: 'zenith_jwt_token',
} as const;
