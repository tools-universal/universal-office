// Importa tabelas de idioma do Excel de uma FONTE EXTERNA (arquivo local) e
// grava src/i18n/langs/<id>.ts + o índice src/i18n/langs/index.ts.
//   node tools/locale/import.mjs <fonte.json|fonte.tsv> [--source "descrição da fonte"] [--dry]
// Formatos aceitos:
//  - JSON: { "source": "…", "languages": { "de-DE": { "functions": { "SUM": "SUMME", … },
//      "errors"?, "bools"?, "r1c1"?, "table"?, "array"?, "format"?, "regional"?, "lcid"?, "name"? } } }
//    (mesmo formato de FormulaLanguage; campos ausentes = canônico/inglês);
//  - TSV: 1ª linha "canonical<TAB>de-DE<TAB>fr-FR…", depois uma função por linha.
// Validação (falha = nada é gravado): todo nome canônico existe no catálogo
// medido; nome local é um identificador do Excel (sem espaço, sem ". "); nomes
// locais únicos no idioma, sem colidir com o canônico de outra função não
// traduzida. pt-BR e en-US são do oráculo — a fonte não os sobrescreve, mas o
// pt-BR da fonte é COMPARADO com o medido (% que bate) para avaliar a fonte.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constName, writeLangIndex } from './lang-index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..', '..');
const langsDir = join(pkg, 'src', 'i18n', 'langs');
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry');
const srcIdx = args.indexOf('--source');
if (!file) { console.error('uso: node tools/locale/import.mjs <fonte.json|fonte.tsv> [--source "…"] [--dry]'); process.exit(2); }

// catálogo e pt-BR medidos (lidos do TS gerado, sem compilar)
const catalogTs = readFileSync(join(pkg, 'src', 'i18n', 'catalog-data.ts'), 'utf8');
const CATALOG = new Set([...catalogTs.matchAll(/^ {2}\["([^"]+)"/gm)].map((m) => m[1]));
const ptbrTs = readFileSync(join(langsDir, 'pt-BR.ts'), 'utf8');
const PT_BR_FUNCTIONS = JSON.parse(/"functions": (\{[\s\S]*?\n {2}\})/.exec(ptbrTs)[1]);

const raw = readFileSync(file, 'utf8').replace(/^﻿/, '');
let source = srcIdx >= 0 ? args[srcIdx + 1] : undefined;
const langs = {};
if (/\.json$/i.test(file)) {
  const j = JSON.parse(raw);
  source ??= j.source;
  Object.assign(langs, j.languages);
} else {
  const rows = raw.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split('\t'));
  const header = rows.shift();
  for (let c = 1; c < header.length; c++) langs[header[c].trim()] = { functions: {} };
  for (const r of rows) for (let c = 1; c < header.length; c++) if (r[c]?.trim()) langs[header[c].trim()].functions[r[0].trim().toUpperCase()] = r[c].trim();
}
if (!source) { console.error('informe a fonte (--source ou "source" no JSON)'); process.exit(2); }

const IDENT = /^[\p{L}_][\p{L}\p{M}\p{N}_.]*$/u;
const problems = [];
const out = [];
for (const [id, l] of Object.entries(langs)) {
  const fold = (s) => s.toLocaleUpperCase(id);
  if (id.toLowerCase() === 'pt-br') {
    // avaliação da fonte contra o oráculo
    let same = 0, total = 0;
    const diff = [];
    for (const [canon, local] of Object.entries(l.functions ?? {})) {
      if (!CATALOG.has(canon)) continue;
      total++;
      const xl = PT_BR_FUNCTIONS[canon] ?? canon;
      if (local === xl) same++; else diff.push(`${canon}: fonte ${local} × Excel ${xl}`);
    }
    console.log(`pt-BR da fonte × Excel: ${same}/${total} iguais (${total ? (100 * same / total).toFixed(1) : 0}%)`);
    if (diff.length) console.log('  ' + diff.slice(0, 30).join('\n  ') + (diff.length > 30 ? `\n  … +${diff.length - 30}` : ''));
    continue;
  }
  if (id.toLowerCase() === 'en-us') continue;
  const functions = {};
  const seen = new Map();
  for (const [canonRaw, local] of Object.entries(l.functions ?? {})) {
    const canon = canonRaw.toUpperCase().replace(/^(_XLFN\.)?(_XLWS\.)?/, '');
    if (!CATALOG.has(canon)) { problems.push(`${id}: ${canon} fora do catálogo medido (ignorado)`); continue; }
    if (!IDENT.test(local) || /\.\s|\.$|\.\./.test(local)) { problems.push(`${id}: nome inválido para ${canon}: "${local}"`); continue; }
    if (local !== canon) functions[canon] = local.toLocaleUpperCase(id);
  }
  for (const canon of CATALOG) {
    const loc = fold(functions[canon] ?? canon);
    if (seen.has(loc)) problems.push(`${id}: "${loc}" usado por ${seen.get(loc)} e ${canon}`);
    else seen.set(loc, canon);
  }
  out.push({
    id, ...(l.lcid ? { lcid: l.lcid } : {}), name: l.name ?? id,
    functions: Object.fromEntries(Object.entries(functions).sort(([a], [b]) => a.localeCompare(b))),
    ...['errors', 'bools', 'r1c1', 'table', 'array', 'format', 'regional'].reduce((o, k) => (l[k] ? { ...o, [k]: l[k] } : o), {}),
    source,
  });
}
const fatal = problems.filter((p) => !p.includes('(ignorado)'));
for (const p of problems) console.log((fatal.includes(p) ? 'ERRO ' : 'aviso ') + p);
if (fatal.length) { console.error(`${fatal.length} problema(s): nada gravado`); process.exit(1); }
if (dry) { console.log(`(--dry) ${out.length} idioma(s) válidos`); process.exit(0); }

for (const l of out) {
  writeFileSync(join(langsDir, `${l.id}.ts`), `// GERADO por tools/locale/import.mjs — não editar à mão.
// Fonte: ${source}
import type { FormulaLanguage } from '../types.js';

export const ${constName(l.id)}: FormulaLanguage = ${JSON.stringify(l, null, 2)};
`);
}
writeLangIndex(langsDir);
console.log(`${out.length} idioma(s) gravados em src/i18n/langs/`);

