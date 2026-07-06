# Zenith Backend — Servidor SaaS Centralizado

Backend do ecossistema **Zenith SaaS** construído com Fastify + TypeScript. Serve como hub centralizado de autenticação e reconciliação de dados para clientes Desktop (Tauri) e Web.

## Stack

- **Runtime**: Node.js + TypeScript (tsx watch)
- **Framework**: Fastify v4 com CORS
- **Auth**: JWT (jsonwebtoken) + Bcrypt
- **Persistência local**: JSON file store (substitua por PostgreSQL em produção)

## Endpoints

| Método | Rota        | Auth? | Descrição                              |
|--------|-------------|-------|----------------------------------------|
| POST   | `/register` | Não   | Cria conta Zenith SaaS                 |
| POST   | `/login`    | Não   | Autentica e retorna JWT                |
| POST   | `/sync`     | JWT   | Reconcilia eventos do Outbox (LWW)     |

## Configuração local

```bash
npm install
npm run dev   # Porta 1421
```

## Variáveis de ambiente

```env
JWT_SECRET=zenith_saas_ultra_secret_key_1337
PORT=1421
```

## Modelo de Sincronização

Utiliza o **Outbox Pattern + Last-Write-Wins (LWW)**:
- Cada evento carrega um `timestamp` ISO8601
- Em conflitos, vence o registro com timestamp mais recente
- Retorna o estado consolidado do usuário após reconciliação
