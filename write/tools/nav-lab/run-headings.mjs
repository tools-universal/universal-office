// Árvore de Títulos do Painel de Navegação × Word, sobre o corpus real (fora do git).
//
//   node tools/nav-lab/run-headings.mjs [--limit N] [--oracle] [--compare]
//
// 1. escolhe os .docx do corpus que têm parágrafo com nível de tópico (estilo
//    com w:outlineLvl ou w:outlineLvl direto) → LAB_DIR/nav/headings-list.txt
// 2. --oracle: heading-oracle.ps1 no Word (COM invisível), em blocos de 25 pela
//    trava global → LAB_DIR/nav/word/<id>.json
// 3. --compare: documentOutline (docx-layout) de cada um × o Word (nível,
//    texto e numeração; títulos em tabela; a sequência do GoTo) →
//    LAB_DIR/nav/headings-report.json + resumo no console.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';
import { loadManifest, LAB_DIR } from '../corpus-lab/corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const limit = Number(opt('--limit') ?? 150);
const dir = join(LAB_DIR, 'nav');
const wordDir = join(dir, 'word');
mkdirSync(wordDir, { recursive: true });
const listPath = join(dir, 'headings-list.txt');

// ── 1. escolha ──
if (!existsSync(listPath) || args.includes('--repick')) {
  const picked = [];
  for (const d of loadManifest()) {
    if (picked.length >= limit) break;
    if (d.container !== 'zip' || d.encrypted) continue;
    let parts;
    try { parts = unzipSync(readFileSync(d.path), { filter: (f) => f.name === 'word/document.xml' || f.name === 'word/styles.xml' }); } catch { continue; }
    const doc = parts['word/document.xml'] ? strFromU8(parts['word/document.xml']) : '';
    const sty = parts['word/styles.xml'] ? strFromU8(parts['word/styles.xml']) : '';
    const paras = (doc.match(/<w:p[ >]/g) ?? []).length;
    if (paras < 3 || paras > 1500) continue;
    const outlined = new Set();
    for (const m of sty.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[\s\S]*?<\/w:style>/g)) if (/<w:outlineLvl w:val="[0-8]"/.test(m[0])) outlined.add(m[1]);
    const used = [...doc.matchAll(/<w:pStyle w:val="([^"]+)"/g)].some((m) => outlined.has(m[1]));
    if (!used && !/<w:outlineLvl w:val="[0-8]"/.test(doc)) continue;
    picked.push(`${d.id}|${d.path}`);
  }
  writeFileSync(listPath, picked.join('\n') + '\n');
  console.log(`${picked.length} documentos com títulos → ${listPath}`);
}
const list = readFileSync(listPath, 'utf8').split('\n').filter(Boolean).map((l) => { const i = l.indexOf('|'); return { id: l.slice(0, i), path: l.slice(i + 1) }; });

// ── 2. oráculo ──
if (args.includes('--oracle')) {
  const todo = list.filter((d) => !existsSync(join(wordDir, `${d.id}.json`)));
  for (let i = 0; i < todo.length; i += 25) {
    const chunk = join(dir, 'chunk.txt');
    writeFileSync(chunk, todo.slice(i, i + 25).map((d) => `${d.id}|${d.path}`).join('\n') + '\n');
    acquireWordLock('nav-lab headings');
    try {
      execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'heading-oracle.ps1'), '-List', chunk, '-OutDir', wordDir],
        { stdio: 'inherit', windowsHide: true, timeout: 30 * 60 * 1000 });
    } finally { releaseWordLock(); }
  }
}

// ── 3. comparação ──
if (args.includes('--compare')) {
  const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
  const layout = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href);
  // o Range.Text do Word põe "/" no lugar de objeto em linha; o painel e nós não
  const norm = (s) => s.replace(/[\u0007\u000b\u000c\r\t/]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  const report = [];
  let docs = 0, okDocs = 0, totalW = 0, totalOk = 0, numOk = 0, numTotal = 0, failed = 0;
  const kinds = {};
  for (const d of list) {
    const wp = join(wordDir, `${d.id}.json`);
    if (!existsSync(wp)) continue;
    const w = JSON.parse(readFileSync(wp, 'utf8'));
    if (w.error || w.skipped) continue;
    // o COM não devolveu o nível (OutlineLevel nulo em todos): falha do oráculo
    if (w.paras.some((p) => p.level === null || p.level === undefined)) { failed++; continue; }
    let full;
    try { full = core.readFullDocument(core.DocxPackage.load(readFileSync(d.path))); } catch (e) { report.push({ id: d.id, error: String(e) }); continue; }
    const ours = layout.documentOutline(full);
    // o Word: só o corpo fora de tabela (o painel não lista título em tabela — ver goto)
    const wordHeads = w.paras.filter((p) => !p.table && norm(p.text) !== '');
    // árvore: nível + texto (sem o número); o número à parte
    const a = wordHeads.map((p) => `${p.level}|${norm(p.text)}`);
    const b = ours.map((h) => `${h.level}|${norm(h.number ? h.text.slice(h.number.length) : h.text)}`);
    docs++;
    totalW += a.length;
    let same = 0;
    const diffs = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] === b[i]) {
        same++;
        numTotal++;
        if (norm(wordHeads[i].list) === norm(ours[i].number)) numOk++;
        else if (diffs.length < 6) diffs.push({ i, kind: 'number', word: wordHeads[i].list, ours: ours[i].number });
        continue;
      }
      if (diffs.length < 6) diffs.push({ i, word: a[i] ?? null, ours: b[i] ?? null });
      const k = a[i] === undefined ? 'extra' : b[i] === undefined ? 'missing' : a[i].split('|')[0] !== b[i].split('|')[0] ? 'level' : 'text';
      kinds[k] = (kinds[k] ?? 0) + 1;
    }
    totalOk += Math.min(same, a.length);
    const ok = a.length === b.length && same === a.length;
    if (ok) okDocs++;
    const inTable = w.paras.filter((p) => p.table).length;
    const gotoInTable = w.goto.filter((g) => w.paras.some((p) => p.table && p.start === g.start)).length;
    report.push({ id: d.id, ok, word: a.length, ours: b.length, inTable, gotoInTable, emptyWord: w.paras.filter((p) => !p.table && norm(p.text) === '').length, diffs });
  }
  writeFileSync(join(dir, 'headings-report.json'), JSON.stringify(report, null, 1));
  console.log(`documentos: ${okDocs}/${docs} com a árvore idêntica (${failed} sem nível no COM); títulos: ${totalOk}/${totalW}; divergências: ${JSON.stringify(kinds)}`);
  console.log(`número da lista igual ao ListString: ${numOk}/${numTotal}`);
  const tbl = report.filter((r) => r.inTable);
  console.log(`docs com título em tabela: ${tbl.length}; o GoTo passou por eles em ${tbl.filter((r) => r.gotoInTable).length}`);
}
