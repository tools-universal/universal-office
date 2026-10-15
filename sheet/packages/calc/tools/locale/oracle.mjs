// Roda o oráculo de IDIOMA no Excel desta máquina (COM, sem janela; uma
// instância por vez) e guarda as saídas brutas no lab:
//   node tools/locale/oracle.mjs catalog   EXCEL.EXE → candidatos → xl-fns.ps1 (catálogo + nomes locais)
//   node tools/locale/oracle.mjs syntax    syntax-cases.mjs → xl-syntax.ps1 (separadores, erros, R1C1, tabelas…)
// Depois: node tools/locale/generate.mjs (gera src/i18n/* e test/oracle/locale-*.json).
// Lab: $LOCALE_LAB ou E:\UniversalSheetTest\_lab\calc\locale (fora do git).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const LAB = process.env.LOCALE_LAB ?? 'E:\\UniversalSheetTest\\_lab\\calc\\locale';
const what = process.argv[2];
if (!['catalog', 'syntax'].includes(what)) { console.error('uso: node tools/locale/oracle.mjs catalog|syntax'); process.exit(2); }
mkdirSync(join(LAB, 'tmp'), { recursive: true });

const ps = (script, args) => execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, script), ...args],
  { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, timeout: 60 * 60 * 1000 });

if (what === 'catalog') {
  const cand = join(LAB, 'candidates.json');
  execFileSync(process.execPath, [join(here, 'exe-functions.mjs'), cand], { stdio: 'inherit' });
  ps('xl-fns.ps1', ['-In', cand, '-Out', join(LAB, 'fns.out.jsonl'), '-Save', join(LAB, 'tmp', 'fns.xlsx')]);
} else {
  const { setup, cases } = await import('./syntax-cases.mjs');
  const input = join(LAB, 'syntax.in.json');
  writeFileSync(input, JSON.stringify({ setup, cases: cases.map(({ id, set, text, at }) => ({ id, set, text, at })) }));
  ps('xl-syntax.ps1', ['-In', input, '-Out', join(LAB, 'syntax.out.jsonl'), '-Save', join(LAB, 'tmp', 'syntax.xlsx')]);
}
console.log(`ok → ${LAB}`, existsSync(LAB));
