// Audita o motor format.ts contra o oráculo real do Excel.
// Uso: npm run build --prefix packages/sheet-core && node tools/excel-lab/audit-format.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatValue } from '../../packages/sheet-core/dist/format.js';

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, 'results', 'oracle-format.json'), 'utf8').replace(/^﻿/, '');
const oracle = JSON.parse(raw);

let pass = 0, fail = 0;
const fails = [];
for (const c of oracle) {
  const value = typeof c.v === 'string' ? c.v : Number(c.v);
  const { text } = formatValue(value, c.fmt);
  const widthDependent = c.fmt.includes('* ');
  const norm = (s) => widthDependent ? s.replace(/\s+/g, ' ').trim() : s;
  if (norm(text) === norm(c.text)) pass++;
  else { fail++; fails.push({ v: c.v, fmt: c.fmt, excel: c.text, ours: text }); }
}
console.log(`PASS ${pass}  FAIL ${fail}`);
for (const f of fails) console.log(`  fmt=${JSON.stringify(f.fmt)} v=${f.v}\n    excel=${JSON.stringify(f.excel)}\n    ours =${JSON.stringify(f.ours)}`);
