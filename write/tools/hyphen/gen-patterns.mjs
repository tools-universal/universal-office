// Gera os módulos de padrões de hifenização (algoritmo de Liang) a partir dos
// arquivos hyph-*.tex do hyph-utf8 (https://github.com/hyphenation/tex-hyphen,
// hyph-utf8/tex/generic/hyph-utf8/patterns/tex/).
//
//   node tools/hyphen/gen-patterns.mjs <pasta com hyph-*.tex> [--json <pasta>]
//
// Saída: packages/docx-layout/src/typography/hyphen/patterns/<id>.ts (um módulo por idioma,
// carregado sob demanda) e THIRD-PARTY-NOTICES.md com origem e licença de cada
// arquivo. Com --json, grava também <id>.json com os MESMOS dados (para o port
// .NET embutir como recurso). Os .tex baixados não entram no repositório: só os
// padrões gerados, com o aviso de copyright/licença de cada um.
//
// Só entram licenças permissivas verificadas no cabeçalho de cada arquivo (MIT,
// BSD, aviso "all-permissive"); ver ALLOWED abaixo.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'packages', 'docx-layout', 'src', 'typography', 'hyphen', 'patterns');
const argv = process.argv.slice(2);
const src = argv[0];
if (!src) { console.error('uso: gen-patterns.mjs <pasta hyph-*.tex> [--json <pasta>]'); process.exit(1); }
const jsonDir = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;

/** id hyph-utf8 → licença aceita (verificada no cabeçalho do arquivo). O en-gb (MIT) fica
 *  de fora: o Word usa os mesmos pontos para todo inglês e os en-us chegam mais perto. */
const ALLOWED = {
  pt: /BSD 3-clause/i,
  'en-us': /Copying and distribution of this file, with or without modification,\s+are permitted in any medium without royalty/i,
  es: /\bMIT\b/,
  fr: /\bMIT\b/,
  'de-1996': /\bMIT\b/,
  it: /\bMIT\b/,
  nl: /\bMIT\b/,
};

/** Cabeçalho YAML em comentários (% chave: valor) — só o necessário. */
function header(tex) {
  const lines = [];
  for (const l of tex.split(/\r?\n/)) {
    if (!l.startsWith('%')) break;
    lines.push(l.replace(/^% ?/, ''));
  }
  const top = (key) => {
    const i = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (i < 0) return '';
    const out = [lines[i].slice(key.length + 1).trim()];
    for (let k = i + 1; k < lines.length && (/^\s/.test(lines[k]) || lines[k] === ''); k++) out.push(lines[k]);
    return out.join('\n').replace(/\s+$/, '');
  };
  const mins = /hyphenmins:[\s\S]*?typesetting:\s*\n\s*left:\s*(\d+)\s*\n\s*right:\s*(\d+)/.exec(lines.join('\n'));
  return {
    title: top('title').split('\n')[0],
    copyright: top('copyright').split('\n').map((s) => s.trim()).filter(Boolean).join(' '),
    version: top('version').split('\n')[0],
    licence: top('licence'),
    left: mins ? +mins[1] : 2,
    right: mins ? +mins[2] : 3,
  };
}

/** Conteúdo de \patterns{…} e \hyphenation{…} (comentários % fora). */
function blocks(tex, cmd) {
  const clean = tex.split(/\r?\n/).map((l) => l.replace(/(^|[^\\])%.*$/, '$1')).join('\n');
  const out = [];
  const re = new RegExp(`\\\\${cmd}\\s*\\{([^}]*)\\}`, 'g');
  for (let m; (m = re.exec(clean));) out.push(...m[1].split(/\s+/).filter(Boolean));
  return out;
}

/** texto da licença MIT, para os arquivos que só a citam pelo nome (nl) */
const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
/** observações por arquivo */
const NOTES = {
  'en-us': 'Inclui os padrões e as exceções de hyphen.tex (D. E. Knuth, Plain TeX) com os acréscimos de G. D. C. Kuiken (ushyphmax), sob o aviso acima.',
  it: 'Disponível sob LPPL 1.3 ou MIT, à escolha — usado aqui sob a MIT.',
};

const notices = [];
mkdirSync(outDir, { recursive: true });
if (jsonDir) mkdirSync(jsonDir, { recursive: true });
for (const [id, licRe] of Object.entries(ALLOWED)) {
  const file = join(src, `hyph-${id}.tex`);
  if (!existsSync(file)) { console.error(`falta ${file}`); process.exit(1); }
  const tex = readFileSync(file, 'utf8').normalize('NFC');
  const h = header(tex);
  if (!licRe.test(h.licence)) { console.error(`${id}: licença não reconhecida — não gerado`); process.exit(1); }
  const patterns = blocks(tex, 'patterns');
  const exceptions = blocks(tex, 'hyphenation');
  // (o pt tem "1-": quebra antes do hífen da palavra — inócuo, a palavra chega sem hífen)
  for (const p of patterns) if (!/^[.\p{L}\p{M}'’\d-]+$/u.test(p)) throw new Error(`${id}: padrão inesperado ${p}`);
  const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
  const data = { id, left: h.left, right: h.right, patterns: patterns.join(' '), exceptions: exceptions.join(' ') };
  let lic = h.licence.split('\n').map((l) => l.replace(/^\s{0,4}/, '')).join('\n').replace(/^\n+/, '');
  if (!/text:/.test(lic) && /name:\s*MIT/.test(lic)) lic += `\ntext: >\n${MIT_TEXT.split('\n').map((l) => (l ? `    ${l}` : '')).join('\n')}`;
  const banner = [
    `Padrões de hifenização "${h.title}" (hyph-utf8, hyph-${id}.tex${h.version ? `, versão ${h.version}` : ''})`,
    'https://github.com/hyphenation/tex-hyphen — sha256 do arquivo de origem:',
    sha,
    '',
    h.copyright,
    ...(NOTES[id] ? ['', NOTES[id]] : []),
    '',
    `Licença: ${lic}`,
  ].join('\n');
  const ts = `/*! @license\n${banner.split('\n').map((l) => ` * ${l}`.trimEnd()).join('\n')}\n */\n`
    + '// Gerado por write/tools/hyphen/gen-patterns.mjs — não editar.\n'
    + "import type { HyphenationPatterns } from '../liang.js';\n\n"
    + `const data: HyphenationPatterns = ${JSON.stringify(data)};\nexport default data;\n`;
  writeFileSync(join(outDir, `${id}.ts`), ts);
  if (jsonDir) writeFileSync(join(jsonDir, `${id}.json`), JSON.stringify({ ...data, source: `hyph-utf8 hyph-${id}.tex`, sha256: sha, copyright: h.copyright, licence: lic }, null, 1) + '\n');
  notices.push(`## ${id} — ${h.title}\n\nArquivo de origem: \`hyph-utf8/tex/generic/hyph-utf8/patterns/tex/hyph-${id}.tex\`${h.version ? ` (versão ${h.version})` : ''}, sha256 \`${sha}\`.\n\n${h.copyright}${NOTES[id] ? `\n\n${NOTES[id]}` : ''}\n\n\`\`\`text\n${lic}\n\`\`\`\n`);
  console.log(`${id}: ${patterns.length} padrões, ${exceptions.length} exceções, mínimos ${h.left}/${h.right}, ${(ts.length / 1024).toFixed(1)} KiB`);
}
writeFileSync(join(outDir, 'THIRD-PARTY-NOTICES.md'), '# Padrões de hifenização — avisos de terceiros\n\n'
  + 'Os módulos desta pasta são gerados por `write/tools/hyphen/gen-patterns.mjs` a partir dos\n'
  + 'arquivos de padrões do projeto hyph-utf8 (https://github.com/hyphenation/tex-hyphen),\n'
  + 'para o algoritmo de Frank Liang implementado em `../liang.ts`. Cada módulo mantém o\n'
  + 'aviso de copyright e a licença do seu arquivo de origem, reproduzidos abaixo.\n\n'
  + notices.join('\n'));
