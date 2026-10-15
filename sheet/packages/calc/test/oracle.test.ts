/**
 * Bancos de casos × Excel: cada test/oracle/<área>.cases.json com a resposta
 * do Excel em <área>.excel.json (node tools/oracle.mjs <área>). Comparação no
 * locale de valores do Excel do oráculo (pt-BR). Divergências conhecidas e
 * aceitas ficam em <área>.known.json ({ "id": "motivo" }) — e precisam de motivo.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/index.js';
import { PT_BR } from '../src/fn.js';
import { matchesOracle, plain, runCase, type OracleCase, type OracleResult } from '../src/testing.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'oracle');
const read = (f: string): any => JSON.parse(readFileSync(join(dir, f), 'utf8'));

for (const f of readdirSync(dir).filter((x) => x.endsWith('.cases.json'))) {
  const area = f.replace('.cases.json', '');
  if (!existsSync(join(dir, `${area}.excel.json`))) continue;
  const cases: OracleCase[] = read(f);
  const xl = new Map<string, OracleResult>((read(`${area}.excel.json`) as OracleResult[]).map((r) => [r.id, r]));
  const known: Record<string, string> = existsSync(join(dir, `${area}.known.json`)) ? read(`${area}.known.json`) : {};
  describe(`oráculo: ${area}`, () => {
    it('bate com o Excel', () => {
      const bad: string[] = [];
      for (const c of cases) {
        const r = xl.get(c.id);
        if (!r || r.err || known[c.id]) continue;
        const ours = runCase(c, PT_BR);
        if (!matchesOracle(ours, r)) bad.push(`${c.id}: nosso ${JSON.stringify(plain(ours))} × Excel ${JSON.stringify(r.spill ?? r.v)}`);
      }
      expect(bad).toEqual([]);
    });
  });
}
