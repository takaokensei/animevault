# Zenith — Arquitetura do Sistema e Decisões de Projeto

Este documento descreve a arquitetura do ecossistema Zenith (antigo AnimeVault), detalhando a transição do protótipo desktop para um SaaS híbrido (Desktop Tauri + Web React) de alta qualidade e as Decisões de Arquitetura (ADRs) estabelecidas.

---

## 1. Princípio Organizador: Um Core, Múltiplos Clientes

Toda a lógica de domínio, contratos e regras de negócio puras são apartadas de detalhes de infraestrutura. Isso viabiliza a reutilização de código entre o cliente desktop existente e o futuro cliente web na nuvem.

```
CLIENTES (UI)
 +-------------------+      +------------------------+
 |  Desktop (Tauri)  |      |       Web (SaaS)       |
 |   React + Rust    |      |         React          |
 |   SQLite local    |      | (mesmo design system)  |
 +---------+---------+      +-----------+------------+
           |                            |
           +-------------+--------------+
                         |
                         v
            +--------------------------+
            |      src/core/           |
            |   (pacote de domínio     |
            |     compartilhado)       |
            +-------------+------------+
                          |
                          v
            +--------------------------+
            |    API SaaS (backend)    |
            |    Node/TS + Postgres    |
            +-------------+------------+
                          |
                          v
            +--------------------------+
            |   Integrações Externas   |
            |  MyAnimeList / Gemini    |
            +--------------------------+
```

* **`src/core/types.ts`**: Modelos de dados e contratos TypeScript puros (AnimeEntry, AnimeLocalFiles).
* **`src/core/domain.ts`**: Funções puras de negócio (regex de extração de episódio de strings, ordenação numérica de episódios locais, cálculo de progresso percentual).

---

## 2. Decisões de Arquitetura (ADR)

### ADR 01: Escolha da Camada SQLite Local-First
* **Contexto**: O protótipo importava simultaneamente o `@tauri-apps/plugin-sql` (SQLite rodando nativo no backend Rust) e o `better-sqlite3` (SQLite nativo do Node.js).
* **Decisão**: Manter exclusivamente o `@tauri-apps/plugin-sql` e remover o `better-sqlite3`.
* **Justificativa**:
  1. **Nativo e Leve**: O `@tauri-apps/plugin-sql` roda diretamente no processo Rust nativo, que possui controle de memória mais previsível e não tem overhead de Garbage Collection do V8.
  2. **Simplicidade de Build**: Elimina a necessidade de empacotadores nativos de Node.js (`node-gyp`), que costumam falhar ao compilar em máquinas de usuários finais sem ambiente de desenvolvimento C++ completo.
  3. **Segurança**: O banco SQLite é lido/gravado por IPC através de comandos Rust, impedindo que scripts JS maliciosos no WebView acessem arquivos locais do SO diretamente.

### ADR 02: Segurança de Chaves e Conformidade OWASP Top 10
* **Contexto**: Credenciais sensíveis (Gemini API Key e MyAnimeList Client Secret) estavam expostas no bundle JavaScript compilado.
* **Decisão**: Mover todos os segredos para variáveis de ambiente seguras no backend Rust, intermediando requisições externas por comandos Tauri nativos.
* **Justificativa**:
  1. **Zero Segredos no Cliente**: Arquivos empacotados com variáveis prefixadas com `VITE_` são embutidos em texto puro no bundle final e são facilmente inspecionados.
  2. **Intermediação Segura**: Chamadas ao Gemini e requisições de tokens do MyAnimeList são feitas pelo backend Rust (utilizando `reqwest` com suporte TLS nativo).

### ADR 03: Outbox Pattern para Sincronização Offline-First
* **Contexto**: Modificações locais (adição, edição e exclusão de animes) precisam sincronizar de forma confiável com a nuvem SaaS.
* **Decisão**: Implementar a tabela `sync_outbox` no SQLite local e uma fila de processamento que delega o envio HTTP de payloads para o comando Rust `sync_to_saas_db`.
* **Justificativa**:
  1. **Resiliência a Falhas de Rede**: Se o usuário fizer alterações offline, as ações são salvas na tabela local com status `PENDING`. O sincronismo drena a fila de forma assíncrona assim que a conexão é restaurada.
  2. **Controle de Conflitos**: Resolução de conflitos na nuvem baseada em "Última escrita vence" (Last-write-wins) com timestamps determinísticos.

---

## 3. Garantias de Qualidade e Segurança

* **Pre-commit Hook (`scripts/pre-commit-check.cjs`)**: Script executado automaticamente a cada commit local para impedir vazamentos acidentais de credenciais no repositório público do GitHub.
* **Suíte de Testes Playwright E2E**: Testes funcionais simulados em navegador headless cobrindo os fluxos críticos de listagem e ativação do status de sincronização da nuvem.
* **Suíte de Testes Vitest**: Testes unitários puros cobrindo a lógica de domínio (cálculo de episódios e ordenação).
