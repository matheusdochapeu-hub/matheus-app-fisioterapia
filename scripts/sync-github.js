/**
 * Sincroniza os arquivos locais do matheus-app-fisioterapia diretamente com o GitHub via REST API.
 * Lê GITHUB_TOKEN da variável de ambiente ou do arquivo ~/.env.
 */
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'matheusdochapeu-hub';
const REPO_NAME = 'matheus-app-fisioterapia';
const BRANCH = 'main';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const envPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*GITHUB_TOKEN\s*=\s*(.*?)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, '').trim();
    }
  }
  return null;
}

const FILES_TO_SYNC = [
  'Code.gs',
  'README.md',
  'atendimentos.html',
  'sw.js',
  'package.json',
  'test/helpers.test.js',
  'test/postaction.test.js',
  'plans/001-verification-baseline.md',
  'plans/002-fix-silent-postaction-error-handling.md',
  'plans/003-codegs-concurrency-locking.md',
  'plans/004-bulk-import-and-eliminate-n-plus-one.md',
  'plans/005-protect-script-url-and-credentials.md',
  'plans/README.md',
  'scripts/sync-github.js'
];

async function main() {
  const token = getGitHubToken();
  if (!token) {
    console.error('ERRO: GITHUB_TOKEN não encontrado no ambiente ou em ~/.env.');
    console.error('Para criar um token: https://github.com/settings/tokens (escopo: repo)');
    process.exit(1);
  }

  const baseDir = path.resolve(__dirname, '..');
  console.log(`Buscando árvore atual de ${REPO_OWNER}/${REPO_NAME} (${BRANCH})...`);

  const treeRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Antigravity-Sync'
    }
  });

  if (!treeRes.ok) {
    console.error(`Erro ao acessar GitHub API: HTTP ${treeRes.status}`);
    const errText = await treeRes.text();
    console.error(errText);
    process.exit(1);
  }

  const treeData = await treeRes.json();
  const remoteFiles = {};
  for (const item of (treeData.tree || [])) {
    remoteFiles[item.path] = item.sha;
  }

  console.log('Iniciando sincronização dos arquivos alterados e novos...');

  for (const relPath of FILES_TO_SYNC) {
    const fullPath = path.join(baseDir, relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[PULADO] Arquivo local não encontrado: ${relPath}`);
      continue;
    }

    const contentBuffer = fs.readFileSync(fullPath);
    const contentBase64 = contentBuffer.toString('base64');
    const remoteSha = remoteFiles[relPath.replace(/\\/g, '/')];
    const crypto = require('crypto');
    const localSha = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${contentBuffer.length}\0`), contentBuffer])).digest('hex');
    if (remoteSha && localSha === remoteSha) {
      console.log(`[SEM ALTERAÇÃO] ${relPath}`);
      continue;
    }

    const body = {
      message: `feat: adicionar Nome Fantasia (interno) e Nome Completo (documentos externos) em ${relPath}`,
      content: contentBase64,
      branch: BRANCH
    };

    if (remoteSha) {
      body.sha = remoteSha;
    }

    const putRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${relPath.replace(/\\/g, '/')}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity-Sync'
      },
      body: JSON.stringify(body)
    });

    if (putRes.ok) {
      console.log(`[OK] ${relPath} -> ${remoteSha ? 'atualizado' : 'criado'}`);
    } else {
      const err = await putRes.text();
      console.error(`[FALHA] ${relPath}: HTTP ${putRes.status} - ${err}`);
    }
  }

  console.log('\nSincronização concluída com sucesso!');
}

main().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
