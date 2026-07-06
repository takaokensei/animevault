import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { dbStore, CloudAnime } from './db.js';
import { AuthService } from './auth.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// CORS — origens explícitas via ALLOWED_ORIGINS (nunca wildcard em produção)
// Dev default: apenas localhost:1421 (porta do servidor Tauri local)
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:1421,http://127.0.0.1:1421';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Tauri/Electron não enviam Origin header — permitir requisições sem origin
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`Origin não autorizada pelo CORS: ${origin}`), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Rate limiting global — proteção base contra varredura de endpoints
await fastify.register(rateLimit, {
  global: false, // Aplicado só nas rotas que configurarem explicitamente
  max: 60,
  timeWindow: '1 minute',
});

// Middleware simples para validar token JWT
const authenticate = async (request: any, reply: any) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Token de autorização não fornecido ou inválido' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      reply.status(401).send({ error: 'Token inválido ou expirado' });
      return;
    }
    request.user = decoded; // Injeta usuário na requisição
  } catch (err) {
    reply.status(401).send({ error: 'Falha na autenticação' });
  }
};

// --- ROTAS DO SISTEMA ---

// Rota de Registro de Conta SaaS
// Rate-limit: máximo 5 tentativas por minuto por IP (proteção anti-bot/brute-force)
fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request: any, reply) => {
  const { email, password, name } = request.body || {};

  if (!email || !password || !name) {
    return reply.status(400).send({ error: 'Campos email, password e name são obrigatórios' });
  }

  const existingUser = await dbStore.findUserByEmail(email);
  if (existingUser) {
    return reply.status(409).send({ error: 'E-mail já cadastrado no Zenith SaaS' });
  }

  const passwordHash = await AuthService.hashPassword(password);
  const userId = 'usr_' + Math.random().toString(36).substring(2, 11);

  await dbStore.createUser({
    id: userId,
    email,
    name,
    passwordHash,
    createdAt: new Date().toISOString()
  });

  const token = AuthService.generateToken(userId, email);

  return reply.status(201).send({
    message: 'Conta Zenith criada com sucesso!',
    token,
    user: { id: userId, email, name }
  });
});

// Rota de Login no SaaS
// Rate-limit: máximo 5 tentativas por minuto por IP (proteção anti-brute-force)
fastify.post('/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request: any, reply) => {
  const { email, password } = request.body || {};

  if (!email || !password) {
    return reply.status(400).send({ error: 'E-mail e senha são obrigatórios' });
  }

  const user = await dbStore.findUserByEmail(email);
  if (!user) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }

  const isPasswordValid = await AuthService.comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }

  const token = AuthService.generateToken(user.id, user.email);

  return reply.status(200).send({
    message: 'Autenticado com sucesso!',
    token,
    user: { id: user.id, email: user.email, name: user.name }
  });
});

// Rota de Sincronização (Fila Outbox + Reconciliação Baseada em Timestamp)
fastify.post('/sync', { preHandler: [authenticate] }, async (request: any, reply) => {
  const { userId } = request.user;
  const { events = [] } = request.body || {};

  console.log(`[SaaS Sync] Processando ${events.length} eventos de outbox para o usuário ${userId}`);

  // 1. Processar cada evento da fila outbox local
  for (const event of events) {
    const { action, payload, timestamp } = event;
    if (!payload || !payload.id) continue;

    const animeId = payload.id.toString();

    if (action === 'UPSERT_ANIME') {
      // Reconciliação Last-write-wins (LWW):
      // Verifica se o registro existente na nuvem possui timestamp mais recente
      const currentCloudAnimes = await dbStore.getUserAnimes(userId);
      const existing = currentCloudAnimes.find(a => a.animeId === animeId);

      if (!existing || new Date(timestamp) > new Date(existing.updatedAt)) {
        await dbStore.upsertAnime({
          userId,
          animeId,
          title: payload.title || 'Anime Sem Título',
          currentEpisode: payload.currentEpisode || 0,
          status: payload.status || 'planned',
          rating: payload.rating || 0,
          localPath: payload.localPath,
          lastWatched: payload.lastWatched,
          notes: payload.notes || '',
          updatedAt: timestamp || new Date().toISOString()
        });
      } else {
        console.log(`[SaaS Sync] Ignorando UPSERT_ANIME para ID ${animeId} devido a conflito de timestamp (nuvem mais recente)`);
      }
    } else if (action === 'DELETE_ANIME') {
      await dbStore.deleteAnime(userId, animeId);
    }
  }

  // 2. Retornar todos os animes da nuvem após reconciliação
  const cloudAnimes = await dbStore.getUserAnimes(userId);

  return reply.status(200).send({
    success: true,
    animes: cloudAnimes.map(a => ({
      id: a.animeId,
      title: a.title,
      currentEpisode: a.currentEpisode,
      status: a.status,
      rating: a.rating,
      localPath: a.localPath,
      lastWatched: a.lastWatched,
      notes: a.notes,
      updatedAt: a.updatedAt
    }))
  });
});

// Inicialização do Servidor SaaS na porta 1421 (conforme configurado nos Redirect URLs)
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '1421', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Zenith SaaS Backend rodando em http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
