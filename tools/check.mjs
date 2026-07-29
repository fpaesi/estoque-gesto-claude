#!/usr/bin/env node
// Verificação pré-publicação do Gesto Operação.
//
// O app é um arquivo único de ~500 KB: um erro de sintaxe em qualquer ponto do
// <script> derruba o app INTEIRO para toda a equipe, inclusive a tela de login,
// e não existe fallback. Este script roda em segundos e torna isso impossível
// de publicar sem querer.
//
// Uso:  node tools/check.mjs
// No push:  git config core.hooksPath tools/githooks   (uma vez por clone)

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = join(raiz, 'index.html');
const html = readFileSync(arquivo, 'utf8');

const erros = [];
const avisos = [];

// ── 1. Sintaxe do script principal ────────────────────────────────────────────
const abre = html.indexOf('<script>');
const fecha = html.indexOf('</script>', abre);
if (abre === -1 || fecha === -1) {
  erros.push('Não encontrei o bloco <script> principal do app.');
} else {
  const js = html.slice(abre + '<script>'.length, fecha);
  const tmp = join(tmpdir(), `gesto-check-${process.pid}.js`);
  writeFileSync(tmp, js, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log(`  ok    sintaxe do script (${js.split('\n').length} linhas)`);
  } catch (e) {
    // node --check aponta a linha DENTRO do script; converte para a linha do arquivo
    const offset = html.slice(0, abre).split('\n').length - 1;
    const saida = (e.stderr || e.stdout || '').toString()
      .replace(/gesto-check-\d+\.js:(\d+)/g, (_, n) => `index.html:${Number(n) + offset}`);
    erros.push('Erro de sintaxe no script:\n' + saida.trim());
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

// ── 2. Versão consistente nos três lugares ────────────────────────────────────
// O rótulo é mantido à mão em title, pill do rodapé e APP_VERSION. O histórico do
// repo tem commits que existiram só para corrigir isso.
// Desde a v113 o rótulo do rodapé é gerado a partir de APP_VERSION, então sobraram
// dois pontos manuais: a constante e o <title>.
const vApp = (html.match(/const APP_VERSION\s*=\s*'(v\d+)'/) || [])[1];
const vTitle = (html.match(/<title>Gesto Operação (v\d+)<\/title>/) || [])[1];
const vSoltas = [...html.matchAll(/margin-left:5px">(v\d+)</g)].map(m => m[1]);
if (!vApp || !vTitle) {
  avisos.push(`Não consegui ler alguma marca de versão (APP_VERSION=${vApp}, title=${vTitle}).`);
} else if (vApp !== vTitle) {
  erros.push(`Versão inconsistente: APP_VERSION=${vApp}, <title>=${vTitle}.`);
} else if (vSoltas.some(v => v !== vApp)) {
  erros.push(`Rótulo de versão fixo no HTML (${vSoltas.join(', ')}) diferente de APP_VERSION=${vApp}.`);
} else {
  console.log(`  ok    versão ${vApp} consistente`);
}

// ── 3. O CSS dos ícones precisa do /dist/ ─────────────────────────────────────
// Sem isso o CDN devolve 404 e os ~230 ícones do app somem (aconteceu na v110).
if (/@tabler\/icons-webfont@[\d.]+\/tabler-icons/.test(html)) {
  erros.push('URL do Tabler sem /dist/ — o CDN devolve 404 e todos os ícones somem.');
} else if (html.includes('/dist/tabler-icons.min.css')) {
  console.log('  ok    URL do Tabler com /dist/');
}

// ── 4. Um só parser decimal ───────────────────────────────────────────────────
// Contagem e Diário já interpretaram "1.250,5" de formas diferentes (1,25 vs 1250,5).
const parsersSoltos = (html.match(/parseFloat\(String\([^)]*\)\.replace\(','/g) || []).length;
if (parsersSoltos > 0) {
  erros.push(`${parsersSoltos} parser decimal artesanal fora do parseNumBR — use parseNumBR().`);
} else {
  console.log('  ok    parser decimal centralizado em parseNumBR');
}

// ── 5. Ninguém grava histórico sem passar pela auditoria ──────────────────────
const chamadasHistorico = html.split('\n')
  .filter(l => !l.trim().startsWith('//') && /salvarHistorico\(\)/.test(l) && !/function salvarHistorico/.test(l))
  .length;
if (chamadasHistorico > 2) {
  avisos.push(`salvarHistorico() aparece ${chamadasHistorico}x — confira se todo caminho passa por fecharLocalComAuditoria().`);
} else {
  console.log('  ok    fechamento concentrado em fecharLocalComAuditoria');
}

// ── resultado ─────────────────────────────────────────────────────────────────
console.log('');
avisos.forEach(a => console.log(`  aviso  ${a}`));
if (erros.length) {
  erros.forEach(e => console.error(`  ERRO   ${e}`));
  console.error(`\n${erros.length} problema(s) — publicação abortada.\n`);
  process.exit(1);
}
console.log('Tudo certo. Pode publicar.\n');
