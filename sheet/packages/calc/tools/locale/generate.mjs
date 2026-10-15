// Gera, a partir das saídas brutas do oráculo de idioma (tools/locale/oracle.mjs),
// os dados versionados — nunca escritos à mão:
//   src/i18n/catalog-data.ts          catálogo de funções (nº interno, prefixo, nº de argumentos)
//   src/i18n/langs/pt-BR.ts           tabela do idioma do Excel desta máquina
//   test/oracle/locale-pt-BR.functions.json   Formula2 ↔ Formula2Local de cada função
//   test/oracle/locale-pt-BR.syntax.json      casos de sintaxe (A1, R1C1, arquivo)
//   test/oracle/locale-pt-BR.env.json         International, erros e valores (ValueLocale)
//   node tools/locale/generate.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { writeLangIndex } from './lang-index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..', '..');
const LAB = process.env.LOCALE_LAB ?? 'E:\\UniversalSheetTest\\_lab\\calc\\locale';
const jsonl = (f) => readFileSync(join(LAB, f), 'utf8').replace(/^\uFEFF/, '').trim().split('\n').map((l) => JSON.parse(l));
const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Fórmulas gravadas numa pasta salva pelo oráculo: aba → célula → texto do <f>. */
function fileFormulas(xlsx) {
  const z = unzipSync(readFileSync(xlsx));
  const wb = strFromU8(z['xl/workbook.xml']);
  const rels = strFromU8(z['xl/_rels/workbook.xml.rels']);
  const out = new Map();
  for (const m of wb.matchAll(/<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)) {
    const target = new RegExp(`Id="${m[2]}"[^>]*Target="([^"]*)"|Target="([^"]*)"[^>]*Id="${m[2]}"`).exec(rels);
    const path = 'xl/' + (target[1] ?? target[2]).replace(/^\/?xl\//, '');
    const x = strFromU8(z[path]);
    const cells = new Map();
    for (const c of x.matchAll(/<c r="([A-Z]+\d+)"[^>]*>(?:<f[^>]*>([^<]*)<\/f>)?/g)) if (c[2] !== undefined) cells.set(c[1], unxml(c[2]));
    out.set(unxml(m[1]), cells);
  }
  return out;
}

// ---------------------------------------------------------------- catálogo
const fnLines = jsonl('fns.out.jsonl');
const head = fnLines.shift();
const build = `${head.version}.${head.build}`;
const byName = new Map(fnLines.map((f) => [f.name, f]));
if (existsSync(join(LAB, 'fns.fix.jsonl'))) for (const f of jsonl('fns.fix.jsonl').slice(1)) byName.set(f.name, f);
const cand = JSON.parse(readFileSync(join(LAB, 'candidates.json'), 'utf8'));
const saved = fileFormulas(join(LAB, 'tmp', 'fns.xlsx')).get('Save');
const syn = jsonl('syntax.out.jsonl');
const synHead = syn.shift();
const env = { intl: syn.shift(), errors: syn.shift().errors };
const synFile = fileFormulas(join(LAB, 'tmp', 'syntax.xlsx')).get('S');
// o que a tela mostra ao REABRIR a pasta salva (forma de arquivo → tela)
const reCells = new Map((jsonl('syntax.reopen.jsonl')[0]?.cells ?? []).filter((c) => c[0] === 'S').map(([, at, f2, loc]) => [at, { f2, loc }]));
const reopen = new Map(syn.filter((r) => r.at && reCells.has(r.at)).map((r) => [r.id, reCells.get(r.at)]));
const allFile = [...synFile.values()].join('\n');

const PREFIXES = ['', '_xlfn.', '_xlfn._xlws.'];
const isUnknown = (f) => f.v && typeof f.v === 'object' && f.v.e === '#NAME?' && f.counts[0] === 0 && f.max === 254;
const sheet = [], reserved = [], unavailable = [];
const localNames = {};
const fnCases = [];
for (const { id, name } of cand) {
  const f = byName.get(name);
  if (!f) continue;
  if (f.kind === 'reserved') { reserved.push(name); continue; }
  if (f.kind !== 'cell') continue;
  const k = cand.findIndex((c) => c.name === name) + 1;
  if (isUnknown(f)) { unavailable.push(name); fnCases.push({ name, unknown: true, canonical: f.f2, local: f.f2Local }); continue; }
  let prefix = '';
  if (name === 'SINGLE') {
    if (!/_xlfn\.SINGLE\(/.test(allFile)) throw new Error('SINGLE sem forma de arquivo medida');
    prefix = '_xlfn.';
  } else {
    const ff = saved.get(`A${k}`);
    if (ff === undefined) throw new Error(`sem fórmula salva para ${name}`);
    const m = new RegExp(`^((?:_xl[a-z]+\\.)*)${name.replace(/\./g, '\\.')}\\(`).exec(ff);
    if (!m) throw new Error(`forma de arquivo inesperada para ${name}: ${ff}`);
    prefix = m[1];
    if (!PREFIXES.includes(prefix)) throw new Error(`prefixo novo ${prefix} (${name})`);
    const loc = /^=([^(]+)\(/.exec(f.f2Local);
    if (!loc) throw new Error(`nome local ilegível: ${name} ${f.f2Local}`);
    if (loc[1] !== name) localNames[name] = loc[1];
  }
  const counts = f.counts;
  const step = f.step ?? 1;
  // quantidades até 12 previstas por (mín, passo)? senão grava a lista
  const min = counts[0], max = f.max;
  const predicted = [];
  for (let n = min; n <= Math.min(12, max); n += step) predicted.push(n);
  const irregular = predicted.join(',') !== counts.join(',');
  sheet.push([name, id, PREFIXES.indexOf(prefix), min, max, ...(step !== 1 || irregular ? [step] : []), ...(irregular ? [counts] : [])]);
  fnCases.push({ name, canonical: f.f2, local: f.f2Local });
}

// funções-operador: forma de arquivo medida no oráculo de sintaxe
const operators = {};
const opProbe = [['SINGLE', '@', /_xlfn\.SINGLE\(/], ['ANCHORARRAY', '#', /_xlfn\.ANCHORARRAY\(/],
  ['_TRO_TRAILING', ':.', /_xlfn\._TRO_TRAILING\(/], ['_TRO_LEADING', '.:', /_xlfn\._TRO_LEADING\(/], ['_TRO_ALL', '.:.', /_xlfn\._TRO_ALL\(/]];
for (const [n, op, re] of opProbe) if (re.test(allFile)) operators[n] = op;

const tuple = (t) => `[${t.map((x) => JSON.stringify(x)).join(', ')}]`;
writeFileSync(join(pkg, 'src', 'i18n', 'catalog-data.ts'), `// GERADO por tools/locale/generate.mjs a partir do oráculo — não editar à mão.
// Fonte: tabela de funções do EXCEL.EXE (tools/locale/exe-functions.mjs) medida
// no Excel ${build} (tools/locale/xl-fns.ps1): o parser aceita/recusa cada
// quantidade de argumentos; o prefixo vem do XML que o Excel grava.

/** Versão do Excel medida. */
export const EXCEL_BUILD = ${JSON.stringify(build)};

/** Prefixos de arquivo (índice usado em SHEET_FUNCTIONS). */
export const FILE_PREFIXES = ${JSON.stringify(PREFIXES)} as const;

/**
 * Funções de planilha: [nome canônico, nº interno do Excel (0–367 = Ftab do
 * BIFF8), prefixo (índice em FILE_PREFIXES), mín, máx, passo?, quantidades
 * aceitas até 12 quando não seguem (mín, passo)?]. Passo 2 = pares
 * critério/valor (SUMIFS, IFS, LET…).
 */
export const SHEET_FUNCTIONS: readonly (readonly [string, number, number, number, number, number?, (readonly number[])?])[] = [
${sheet.map((t) => '  ' + tuple(t) + ',').join('\n')}
];

/**
 * Nomes da tabela do Excel RECUSADOS em fórmula de célula com qualquer número
 * de argumentos: funções de macro (XLM, só em folha de macro/nomes) e internas.
 */
export const RESERVED_FUNCTIONS: readonly string[] = ${JSON.stringify(reserved)};

/** Na tabela do EXCEL.EXE, mas #NAME? neste build (recursos não liberados/internos): tratadas como desconhecidas. */
export const UNAVAILABLE_FUNCTIONS: readonly string[] = ${JSON.stringify(unavailable)};

/** Funções que o Excel mostra como operador (arquivo: _xlfn.ANCHORARRAY(A1) ↔ tela: A1#). */
export const OPERATOR_FUNCTIONS: Readonly<Record<string, string>> = ${JSON.stringify(operators)};
`);

// ---------------------------------------------------------------- pt-BR
const intl = env.intl.intl;
const errors = {};
for (const e of env.errors) if (e.local && e.local !== e.name) errors[e.name] = e.local;
const kw = (id) => {
  const r = syn.find((x) => x.id === id);
  const m = r && /\[(#[^\]]+)\]/.exec(r.f2Local);
  if (!m) throw new Error(`palavra-chave não medida: ${id}`);
  return m[1];
};
const accepted = (id) => { const r = syn.find((x) => x.id === id); return r && !r.err && /\[@/.test(r.f2) ? true : false; };
if (!accepted('locale-loc-tbl-this-row')) throw new Error('#Esta Linha não aceito');
const boolT = /^=(.+)$/.exec(syn.find((x) => x.id === 'locale-bool-true').f2Local)[1];
const boolF = /^=(.+)$/.exec(syn.find((x) => x.id === 'locale-bool-false').f2Local)[1];
const ptbr = {
  id: 'pt-BR', lcid: 1046, name: 'Português (Brasil)',
  functions: Object.fromEntries(Object.entries(localNames).sort(([a], [b]) => a.localeCompare(b))),
  errors,
  bools: [boolT, boolF],
  r1c1: { row: intl['6'], col: intl['7'], open: intl['10'], close: intl['11'] },
  table: { all: kw('locale-tbl-all'), data: kw('locale-tbl-data'), headers: kw('locale-tbl-headers'), totals: kw('locale-tbl-totals'), thisRow: '#Esta Linha' },
  array: { col: intl['14'], row: intl['15'], alt: intl['16'] },
  format: { year: intl['19'], month: intl['20'], day: intl['21'], hour: intl['22'], minute: intl['23'], second: intl['24'], general: intl['26'] },
  regional: { decimal: intl['3'], list: intl['5'] },
  source: `oráculo: Excel ${build} pt-BR (Formula2Local, Application.International)`,
};
writeFileSync(join(pkg, 'src', 'i18n', 'langs', 'pt-BR.ts'), `// GERADO por tools/locale/generate.mjs a partir do oráculo — não editar à mão.
// Excel ${build} com interface pt-BR e Windows pt-BR: nomes pelo Formula2Local
// de cada função do catálogo; erros pelo FormulaLocal de cada valor de erro;
// letras/separadores pelo Application.International; "#Esta Linha" medido pela
// aceitação no Formula2Local (o Excel sempre mostra "@").
import type { FormulaLanguage } from '../types.js';

export const PT_BR_LANG: FormulaLanguage = ${JSON.stringify(ptbr, null, 2).replace(/\n {2}"functions": \{[^}]*\}/, (m) => m.replace(/\n {4}/g, '\n    '))};
`);

writeLangIndex(join(pkg, 'src', 'i18n', 'langs'));

// ---------------------------------------------------------------- testes
writeFileSync(join(pkg, 'test', 'oracle', 'locale-pt-BR.functions.json'), JSON.stringify({ build, fns: fnCases }, null, 1) + '\n');
const { cases, setup, tableAt } = await import('./syntax-cases.mjs');
const kindOf = new Map(cases.map((c) => [c.id, c.kind ?? 'syntax']));
const synCases = [], valCases = [];
for (const r of syn) {
  const c = cases.find((x) => x.id === r.id);
  if (kindOf.get(r.id) === 'value') { valCases.push({ id: r.id, formula: r.f2, local: r.f2Local, v: r.v, text: r.text }); continue; }
  const file = synFile.get(r.at);
  // o canônico do motor marca com _xludf. o nome desconhecido que coincide com
  // uma função (como o Excel grava no arquivo); sem isso SUM digitado no
  // pt-BR viraria a função SOMA
  const udf = (text) => {
    if (!file || !/_xludf\./.test(file)) return text;
    for (const m of file.matchAll(/_xludf\.((?:_xl[a-z]+\.)*[A-Z0-9._]+)\(/g)) text = text.replace(new RegExp(`(?<![\\w.])${m[1].replace(/\./g, '\\.')}\\(`), `_xludf.${m[1]}(`);
    return text;
  };
  // fórmula dentro da tabela (a tela omite o nome da própria tabela em [@Col]);
  // na Vendas a coluna calculada K regrava as vizinhas: a forma de arquivo e o
  // que a tela mostra ao reabrir são os do último caso da coluna (coerentes)
  const inTable = tableAt(c.at);
  synCases.push({ id: r.id, set: c.set, input: c.text, ...(c.at ? { at: c.at } : {}), ...(inTable ? { inTable } : {}), ...(r.err ? { err: r.err } : {
    canonical: udf(r.f2), local: r.f2Local, r1c1: udf(r.r1c1), r1c1Local: r.r1c1Local, ...(file !== undefined && reopen.has(r.id) ? { file: '=' + file, fileShown: reopen.get(r.id).loc, fileShownCanonical: udf(reopen.get(r.id).f2) } : {}),
  }) });
}
writeFileSync(join(pkg, 'test', 'oracle', 'locale-pt-BR.syntax.json'), JSON.stringify({ build: `${synHead.version}.${synHead.build}`, names: setup.names.map((x) => x.name), cases: synCases }, null, 1) + '\n');
writeFileSync(join(pkg, 'test', 'oracle', 'locale-pt-BR.env.json'), JSON.stringify({ build, international: intl, errors: env.errors, values: valCases }, null, 1) + '\n');
console.log(`catálogo: ${sheet.length} de planilha, ${reserved.length} reservadas, ${unavailable.length} indisponíveis; pt-BR: ${Object.keys(localNames).length} nomes que mudam; ${synCases.length} casos de sintaxe, ${valCases.length} de valor`);
