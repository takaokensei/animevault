import { databaseService } from './database';
import { invoke } from './tauriService';
import { useSaasAuthStore } from '../stores/saasAuthStore';

export interface SyncEvent {
  id: number;
  action: string;
  payload: string;
  attempts: number;
  last_attempt?: string;
  status: string;
  created_at: string;
}

export class SyncService {
  private static instance: SyncService;

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Enfileira uma ação de sincronização local na tabela outbox.
   */
  async enqueueSyncEvent(action: string, payload: any): Promise<void> {
    try {
      const db = await databaseService.getDb();
      const payloadStr = JSON.stringify(payload);
      
      console.log(`[SyncService] Enfileirando evento: ${action}`, payload);
      
      await db.execute(
        'INSERT INTO sync_outbox (action, payload, status) VALUES (?, ?, ?)',
        [action, payloadStr, 'PENDING']
      );
    } catch (error) {
      console.error('[SyncService] Erro ao enfileirar evento de sincronização:', error);
    }
  }

  /**
   * Busca todos os eventos pendentes de sincronização.
   */
  async getPendingEvents(): Promise<SyncEvent[]> {
    try {
      const db = await databaseService.getDb();
      const rows = await db.select(
        "SELECT id, action, payload, attempts, last_attempt, status, created_at FROM sync_outbox WHERE status = 'PENDING' ORDER BY id ASC"
      );
      return rows as SyncEvent[];
    } catch (error) {
      console.error('[SyncService] Erro ao buscar eventos pendentes:', error);
      return [];
    }
  }

  /**
   * Marca um evento como sincronizado com sucesso.
   */
  async markAsSynced(eventId: number): Promise<void> {
    try {
      const db = await databaseService.getDb();
      await db.execute(
        "UPDATE sync_outbox SET status = 'SYNCED', last_attempt = CURRENT_TIMESTAMP WHERE id = ?",
        [eventId]
      );
      console.log(`[SyncService] Evento ${eventId} marcado como SYNCED.`);
    } catch (error) {
      console.error(`[SyncService] Erro ao marcar evento ${eventId} como sincronizado:`, error);
    }
  }

  /**
   * Incrementa tentativas de envio e marca evento como falhado.
   */
  async markAsFailed(eventId: number, currentAttempts: number): Promise<void> {
    try {
      const db = await databaseService.getDb();
      const nextAttempts = currentAttempts + 1;
      const status = nextAttempts >= 5 ? 'FAILED' : 'PENDING'; // Falha definitiva após 5 tentativas
      
      await db.execute(
        "UPDATE sync_outbox SET attempts = ?, status = ?, last_attempt = CURRENT_TIMESTAMP WHERE id = ?",
        [nextAttempts, status, eventId]
      );
      console.warn(`[SyncService] Evento ${eventId} falhou. Tentativas: ${nextAttempts}. Status: ${status}.`);
    } catch (error) {
      console.error(`[SyncService] Erro ao atualizar status de falha do evento ${eventId}:`, error);
    }
  }

  /**
   * Processa a fila de outbox (Fila local-first para SaaS target).
   * Chama o backend em Rust para realizar a requisição HTTP real.
   */
  async processQueue(): Promise<void> {
    const pending = await this.getPendingEvents();
    if (pending.length === 0) return;

    const token = useSaasAuthStore.getState().zenithToken;
    const isSaasActive = !!token;

    console.log(`[SyncService] Iniciando processamento de ${pending.length} eventos pendentes. SaaS ativo: ${isSaasActive}`);

    let synced = 0;
    let failed = 0;

    for (const event of pending) {
      try {
        const startTime = Date.now();
        console.log(`[SyncService] Sincronizando evento ${event.id} (${event.action}).`);
        
        // Invoca a sincronização através do Rust nativo — passa token JWT obrigatório
        const success = await invoke<boolean>('sync_to_saas_db', {
          token: token || '',
          action: event.action,
          payload: event.payload
        });
        
        const duration = Date.now() - startTime;

        if (success) {
          await this.markAsSynced(event.id);
          synced++;
          console.log(`[SyncService] ✅ Evento ${event.id} sincronizado em ${duration}ms.`);
        } else {
          await this.markAsFailed(event.id, event.attempts);
          failed++;
          console.warn(`[SyncService] ⚠️ Evento ${event.id} falhou na resposta do SaaS.`);
        }
      } catch (err) {
        console.error(`[SyncService] ❌ Falha ao processar evento ${event.id}:`, err);
        await this.markAsFailed(event.id, event.attempts);
        failed++;
      }
    }

    // Audit log resumido ao final do ciclo
    console.log(`[SyncService] Ciclo concluído — ✅ ${synced} sincronizados | ❌ ${failed} falhos | Total: ${pending.length}`);
  }
}

export const syncService = SyncService.getInstance();
