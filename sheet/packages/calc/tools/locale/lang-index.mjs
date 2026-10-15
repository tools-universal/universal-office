// src/i18n/langs/index.ts: lista de todas as tabelas de idioma presentes na pasta
// (pt-BR do oráculo + as importadas). Usado por generate.mjs e import.mjs.
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const constName = (id) => id.toUpperCase().replace(/[^A-Z0-9]+/g, '_') + '_LANG';

export function writeLangIndex(langsDir) {
  const ids = readdirSync(langsDir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.slice(0, -3)).sort();
  writeFileSync(join(langsDir, 'index.ts'), `// GERADO por tools/locale (generate.mjs / import.mjs) — não editar à mão.
import type { FormulaLanguage } from '../types.js';
${ids.map((id) => `import { ${constName(id)} } from './${id}.js';`).join('\n')}

/** Tabelas de idioma versionadas (en-US é o canônico, em languages.ts). */
export const LANGUAGE_TABLES: readonly FormulaLanguage[] = [${ids.map(constName).join(', ')}];
`);
}
