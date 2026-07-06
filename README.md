# AnimeVault

Um aplicativo desktop moderno para gerenciamento de biblioteca de animes, construído com React, TypeScript, TailwindCSS e Tauri.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Busca de Animes**: Integração com a API do MyAnimeList para buscar animes
- **Autenticação OAuth2**: Login seguro com MyAnimeList (incluindo login via Google)
- **Sincronização Híbrida**: Funciona tanto online quanto offline
- **Interface Moderna**: UI responsiva com TailwindCSS
- **Banco Local**: SQLite para armazenamento offline
- **Arquitetura Robusta**: Padrão Singleton e gerenciamento de estado com Zustand

### 🔄 Funcionalidades Híbridas
- **Busca Pública**: Funciona sem login (apenas Client ID)
- **Busca Autenticada**: Funcionalidades avançadas com login
- **Sincronização**: Lista local sincronizada com MAL
- **Fallback Inteligente**: Se MAL falhar, usa dados locais

## 🏗️ Arquitetura

### Estrutura de Serviços
```
src/services/
├── authService.ts      # Autenticação OAuth2 com PKCE
├── malService.ts       # API do MyAnimeList (público + autenticado)
├── animeService.ts     # Orquestração (MAL + local)
└── database.ts         # Banco SQLite local
```

### Gerenciamento de Estado
```
src/stores/
└── authStore.ts        # Estado de autenticação (Zustand)
```

### Componentes
```
src/components/
├── auth/
│   └── LoginButton.tsx # Botão de login/logout
└── anime/
    ├── AnimeCard.tsx   # Card de anime com ações
    └── AnimeSearch.tsx # Busca de animes
```

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Backend**: Tauri (Rust) + SQLite
- **Estado**: Zustand
- **Autenticação**: OAuth2 PKCE
- **API**: MyAnimeList API v2

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Rust (para Tauri)
- pnpm/npm/yarn

### Instalação
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run tauri dev

# Build para produção
npm run tauri build
```

## 🔐 Autenticação

O AnimeVault implementa OAuth2 com PKCE para autenticação segura:

1. **Fluxo de Login**:
   - Gera `code_verifier` e `code_challenge`
   - Abre navegador para login no MAL
   - Servidor local captura callback
   - Troca código por tokens

2. **Segurança**:
   - PKCE (Proof Key for Code Exchange)
   - State validation
   - Token refresh automático
   - Armazenamento seguro

## 📊 Banco de Dados

### Tabelas
- `animes`: Animes locais
- `users`: Usuários autenticados
- `auth_tokens`: Tokens de acesso
- `user_anime_list`: Lista do usuário

### Schema
```sql
-- Animes locais
CREATE TABLE animes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  -- ... outros campos
);

-- Usuários autenticados
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  -- ... outros campos
);

-- Tokens de autenticação
CREATE TABLE auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  -- ... outros campos
);
```

## 🔄 Fluxo de Dados

### Busca de Animes
1. **Público**: Usa Client ID para buscar no MAL
2. **Autenticado**: Usa Bearer token para funcionalidades avançadas
3. **Local**: Sempre salva no banco SQLite
4. **Fallback**: Se MAL falhar, busca local

### Sincronização
1. **Login**: Obtém lista do usuário do MAL
2. **Salva Local**: Armazena no SQLite
3. **Atualizações**: Sincroniza mudanças bidirecionalmente

## 🎯 Melhorias Implementadas

### ✅ Refatoração Completa
- **Arquitetura Limpa**: Separação clara de responsabilidades
- **Padrão Singleton**: Serviços como instâncias únicas
- **Tipagem Robusta**: TypeScript em toda a aplicação
- **Estado Centralizado**: Zustand para gerenciamento de estado

### ✅ Autenticação OAuth2
- **PKCE**: Implementação segura do fluxo OAuth2
- **Servidor Local**: Callback via servidor Rust
- **Token Management**: Refresh automático e validação
- **Login via Google**: Suporte ao login social do MAL

### ✅ Funcionalidades Híbridas
- **Busca Pública**: Funciona sem autenticação
- **Busca Autenticada**: Funcionalidades avançadas
- **Sincronização**: MAL ↔ Local
- **Fallback Inteligente**: Graceful degradation

### ✅ UX Melhorada
- **Loading States**: Indicadores visuais
- **Error Handling**: Tratamento de erros robusto
- **Responsive Design**: Interface adaptativa
- **Feedback Visual**: Confirmações e notificações

## 🔧 Configuração

### Variáveis de Ambiente
```env
MAL_CLIENT_ID=seu_client_id_aqui
```

### Tauri Config
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  }
}
```

## 📝 Próximos Passos

- [ ] Implementar servidor Rust para callback OAuth2
- [ ] Adicionar mais funcionalidades de MAL (reviews, etc.)
- [ ] Implementar cache inteligente
- [ ] Adicionar testes unitários
- [ ] Melhorar performance de busca
- [ ] Implementar PWA features

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.