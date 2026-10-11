#!/usr/bin/env node
// Garante que NENHUMA fonte proprietária (Microsoft/Monotype — Aptos, Calibri,
// Arial, Segoe…, ou qualquer fonte com incorporação restrita) entra no
// repositório. A decisão é pelo CONTEÚDO (licença declarada na própria fonte),
// não só pelo nome do arquivo. Ver CLAUDE.md ("Fontes proprietárias").
//
//   node tools/fonts/check-fonts.mjs            # arquivos rastreados (CI)
//   node tools/fonts/check-fonts.mjs --staged   # o que vai no commit (hook pre-commit)
//   node tools/fonts/check-fonts.mjs --history  # todo blob de fonte de todas as refs (auditoria)
//
// Fontes sem licença legível (EOT/.fntdata, ou sem campo de licença) só passam
// se estiverem em tools/fonts/allowed-fonts.txt (sha256 + nota da licença).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyFont, embeddedFontParts, pdfFontPrograms, FONT_EXT, OOXML_EXT, PDF_EXT } from './font-license.mjs';

/** Arquivos que interessam: fontes, documentos do Office e PDFs (podem embutir fontes). */
const relevant = (p) => FONT_EXT.test(p) || OOXML_EXT.test(p) || PDF_EXT.test(p);

const here = dirname(fileURLToPath(import.meta.url));
const mode = process.argv.includes('--staged') ? 'staged' : process.argv.includes('--history') ? 'history' : 'tracked';
const git = (args, opts = {}) => execFileSync('git', args, { maxBuffer: 1 << 30, windowsHide: true, ...opts });

const allowed = new Map();
for (const line of readFileSync(join(here, 'allowed-fonts.txt'), 'utf8').split(/\r?\n/)) {
  const m = /^([0-9a-f]{64})\s+(.*)$/.exec(line.trim());
  if (m) allowed.set(m[1], m[2]);
}

/** [{ path, blob }] a verificar. */
function targets() {
  if (mode === 'staged') {
    // adicionados/modificados/copiados/renomeados no índice
    const out = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).toString().split('\0').filter(Boolean);
    return out.filter(relevant).map((p) => ({ path: p, blob: `:${p}` }));
  }
  if (mode === 'tracked') {
    return git(['ls-files', '-z']).toString().split('\0').filter(relevant).map((p) => ({ path: p, blob: `HEAD:${p}`, file: p }));
  }
  // histórico: todo objeto de todas as refs cujo caminho é de fonte
  const seen = new Map();
  // só blobs (rev-list --objects também lista diretórios — ex.: pasta "x.docx" extraída)
  for (const line of git(['rev-list', '--objects', '--filter=object:type=blob', '--all']).toString().split('\n')) {
    const i = line.indexOf(' ');
    if (i < 0) continue;
    const sha = line.slice(0, i), path = line.slice(i + 1);
    if (relevant(path) && !seen.has(sha)) seen.set(sha, path);
  }
  return [...seen].map(([sha, path]) => ({ path, blob: sha }));
}

const bad = [];
let ok = 0;
for (const t of targets()) {
  let bytes;
  try { bytes = t.file ? readFileSync(t.file) : git(['cat-file', 'blob', t.blob]); }
  catch { bytes = git(['cat-file', 'blob', t.blob]); }
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (allowed.has(sha)) { ok++; continue; }
  if (OOXML_EXT.test(t.path)) {
    // documento com fonte EMBUTIDA: só com aval explícito (a licença da fonte
    // tem de permitir a incorporação — e o documento não pode ser um "contêiner"
    // para extrair a fonte, como o antigo _embed.docx)
    let parts = [];
    try { parts = embeddedFontParts(bytes); } catch { /* zip ilegível: não é OOXML válido */ }
    if (!parts.length) continue;
    bad.push({ path: t.path, sha, verdict: 'unknown', family: 'documento', reason: `fonte(s) embutida(s): ${parts.slice(0, 6).join(', ')}` });
    continue;
  }
  if (PDF_EXT.test(t.path)) {
    // PDF: cada fonte embutida (subconjunto) é julgada pela licença que declara
    const progs = pdfFontPrograms(bytes);
    if (!progs.length) { ok++; continue; }
    const verdicts = progs.map((p) => classifyFont(p));
    const worst = verdicts.find((c) => c.verdict === 'proprietary') ?? verdicts.find((c) => c.verdict !== 'open');
    if (!worst) { ok++; continue; }
    bad.push({ path: t.path, sha, verdict: worst.verdict, family: `PDF com fonte embutida ${worst.family ?? ''}`.trim(), reason: worst.reason });
    continue;
  }
  const c = classifyFont(bytes);
  if (c.verdict === 'open') { ok++; continue; }
  bad.push({ path: t.path, sha, ...c });
}

if (!bad.length) {
  console.log(`fontes: ${ok} verificada(s), nenhuma proprietária (${mode === 'staged' ? 'commit' : mode === 'history' ? 'histórico' : 'repositório'})`);
  process.exit(0);
}
console.error(`\n✖ ${bad.length} fonte(s) que NÃO podem entrar no repositório:\n`);
for (const b of bad) console.error(`  ${b.path}\n    ${b.verdict === 'proprietary' ? 'PROPRIETÁRIA' : 'licença desconhecida'} — ${b.family ?? ''}: ${b.reason}\n    sha256 ${b.sha}`);
console.error(`
Fontes proprietárias (Microsoft/Monotype etc.) ficam só na máquina — use
"npm run fonts:sync" (copia das fontes instaladas no sistema para as pastas
ignoradas pelo git). Fonte ABERTA sem licença legível — ou documento do
Office cujas fontes embutidas têm licença que permite incorporar — inclua o
sha256 e a licença em tools/fonts/allowed-fonts.txt. Ver CLAUDE.md.`);
process.exit(1);
