// Gera write/packages/docx-core/src/table-styles-builtin.ts — as definições dos
// 247 estilos de tabela internos como o Word 365 pt-BR as grava no styles.xml
// (experimento styles-all do table-oracle.ps1: .out/styles-all.styles.xml e
// results/styles-all.json com os nomes locais).
//
//   node tools/table-lab/gen-builtin-styles.mjs
//
// Compactação: as variantes "Accent 1..6" de uma família viram UM modelo com
// {A} no lugar do número; o hex das cores de TEMA vira "~" (recalculado do tema
// do documento ao materializar, como o Word faz); o styleId vira {ID} (vem do
// nome local). w:rsid sai.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const xml = readFileSync(join(here, '.out', 'styles-all.styles.xml'), 'utf8');
const locals = JSON.parse(readFileSync(join(here, 'results', 'styles-all.json'), 'utf8').replace(/^﻿/, '')).extra.styles.map((s) => s.local);
const idOf = (local) => local.replace(/[^A-Za-z0-9-]/g, '');
const localById = new Map(locals.map((l) => [idOf(l), l]));

// galeria moderna (Word 2013+): Tabela com grade, Grade Clara, Simples 1–5, Grade/Lista 1–7
const MODERN = /^(Normal Table|Table Grid|Grid Table Light|Plain Table \d|(Grid|List) Table \d.*)$/;
const styles = [...xml.matchAll(/<w:style w:type="table"[\s\S]*?<\/w:style>/g)].map((m) => {
  let s = m[0].replace(/<w:rsid w:val="[^"]*"\/>/g, '');
  const id = /w:styleId="([^"]*)"/.exec(s)[1];
  const name = /<w:name w:val="([^"]*)"/.exec(s)[1];
  const local = localById.get(id) ?? name;
  s = s.replace(/w:styleId="[^"]*"/, 'w:styleId="{ID}"');
  // hex de cor de tema → "~" (recalculado do tema do documento)
  s = s.replace(/w:color="[0-9A-Fa-f]{6}"(?= w:themeColor=)/g, 'w:color="~"');
  s = s.replace(/w:fill="[0-9A-Fa-f]{6}"(?= w:themeFill=)/g, 'w:fill="~"');
  return { id, name, local, xml: s };
});

// famílias com ênfases: um modelo com {A}
const out = [];
const fam = new Map();
for (const s of styles) {
  const m = /^(.*) Accent (\d)$/.exec(s.name);
  if (!m) { out.push({ name: s.name, local: s.local, xml: s.xml }); continue; }
  const a = m[2];
  const tpl = s.xml.replace(new RegExp(`accent${a}`, 'g'), 'accent{A}')
    .replace(`<w:name w:val="${s.name}"/>`, () => `<w:name w:val="${m[1]} Accent {A}"/>`);
  const localTpl = s.local.replace(new RegExp(`${a}$`), '{A}');
  const key = m[1];
  let f = fam.get(key);
  if (!f) { f = { name: `${key} Accent {A}`, local: localTpl, xml: tpl, accents: [] }; fam.set(key, f); out.push(f); }
  if (f.xml !== tpl || f.local !== localTpl) {
    // variante diferente das outras: guarda inteira
    out.push({ name: s.name, local: s.local, xml: s.xml });
    continue;
  }
  f.accents.push(+a);
}
for (const o of out) if (MODERN.test(o.name)) o.modern = 1;

const body = out.map((o) => `  ${JSON.stringify(o)},`).join('\n');
const ts = `// GERADO por write/tools/table-lab/gen-builtin-styles.mjs — não editar à mão.
// Estilos de tabela internos do Word 365 pt-BR (definição gravada no styles.xml):
// {ID} = id do nome local, {A} = número da ênfase, "~" = hex da cor de tema.
export interface BuiltinTableStyleSrc {
  /** w:name (inglês); "… Accent {A}" nas famílias */
  name: string;
  /** nome local do Word pt-BR (o id vem dele) */
  local: string;
  xml: string;
  /** ênfases da família (1..6) */
  accents?: number[];
  /** galeria moderna (modo de compatibilidade 15) */
  modern?: 1;
}

export const BUILTIN_TABLE_STYLES: BuiltinTableStyleSrc[] = [
${body}
];
`;
const dst = join(here, '..', '..', 'packages', 'docx-core', 'src', 'table-styles-builtin.ts');
writeFileSync(dst, ts);
console.log(`${styles.length} estilos → ${out.length} modelos, ${(ts.length / 1024).toFixed(0)} KB em ${dst}`);
