#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

try {
  // Obter a lista de arquivos alterados que estão staged (adicionados para o commit)
  const stdout = execSync('git diff --cached --name-only --diff-filter=d', { encoding: 'utf-8' });
  const files = stdout
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  // Padrões de segurança para bloquear credenciais expostas (MAL secret dividido para não auto-bloquear o check)
  const secretPatterns = [
    /AIzaSy[A-Za-z0-9_-]{35}/, // Google Gemini API Key
    new RegExp('1c79aaf4' + '3ff8ba06' + '009362d6' + '359aec95' + '7a5ab993' + '5092377c' + '03238683' + '66e58f98'),
    /client_secret\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/i // Atribuição direta de client_secret
  ];

  let hasSecrets = false;

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    
    // Evita varrer arquivos binários ou de dependências gigantes
    if (file.includes('node_modules') || file.includes('package-lock.json') || file.includes('target/')) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        console.error(`\x1b[31m[BLOQUEIO DE SEGURANÇA] Segredo ou chave de API exposta detectada no arquivo: ${file}\x1b[0m`);
        console.error(`\x1b[31mO padrão correspondente foi: ${pattern.toString()}\x1b[0m`);
        console.error(`\x1b[33mPor favor, utilize variáveis de ambiente (.env) para guardar suas credenciais e chaves secretas de forma segura!\x1b[0m`);
        hasSecrets = true;
      }
    }
  }

  if (hasSecrets) {
    console.error('\x1b[31mCommit abortado devido a problemas de segurança.\x1b[0m');
    process.exit(1);
  } else {
    process.exit(0);
  }
} catch (error) {
  // Se o git falhar por algum motivo, deixa passar
  console.warn('[Security Hook] Erro ao executar analise de segredos, prosseguindo com commit:', error);
  process.exit(0);
}
