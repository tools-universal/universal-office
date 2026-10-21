// Junta all.docx (P<i>/C<i>/L<i> com o estilo aplicado) + catalog.json (NameLocal)
// + all.styles.xml (w:name, definicao) -> builtins.json
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { unzipSync, strFromU8 } = require('fflate');
const dir = process.argv[2];
const z = unzipSync(readFileSync(`${dir}/all.docx`));
const doc = strFromU8(z['word/document.xml']);
const sty = strFromU8(z['word/styles.xml']);
const blank = strFromU8(unzipSync(readFileSync(`${dir}/blank.docx`))['word/styles.xml']);
const cat = JSON.parse(readFileSync(`${dir}/catalog.json`, 'utf8').replace(/^\uFEFF/, ''));

const styles = new Map();
for (const m of sty.matchAll(/<w:style ([^>]*)>([\s\S]*?)<\/w:style>/g)) {
  const id = m[1].match(/w:styleId="([^"]*)"/)[1];
  styles.set(id, { open: m[1], body: m[2] });
}
const inBlank = new Set([...blank.matchAll(/w:styleId="([^"]*)"/g)].map((m) => m[1]));
const latent = new Map();
for (const m of blank.matchAll(/<w:lsdException ([^>]*)\/>/g)) {
  const a = Object.fromEntries([...m[1].matchAll(/w:(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
  latent.set(a.name, a);
}
const byIdx = new Map();
for (const p of doc.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
  const x = p[0];
  const text = [...x.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((t) => t[1]).join('');
  let m = text.match(/^P(\d+)$/);
  if (m) { const ps = x.match(/<w:pStyle w:val="([^"]*)"/); byIdx.set(+m[1], { ...(byIdx.get(+m[1]) ?? {}), para: ps ? ps[1] : 'Normal' }); continue; }
  m = text.match(/^a [CL](\d+) b$/);
  if (m) {
    const rs = [...x.matchAll(/<w:rStyle w:val="([^"]*)"/g)].map((r) => r[1]);
    const k = text.includes(' C') ? 'char' : 'linkChar';
    byIdx.set(+m[1], { ...(byIdx.get(+m[1]) ?? {}), [k]: rs[0] ?? null });
  }
}
const out = [];
for (const e of cat) {
  if (e.type !== 1 && e.type !== 2) continue;
  const got = byIdx.get(e.i) ?? {};
  const id = e.type === 1 ? got.para : got.char;
  const s = id ? styles.get(id) : undefined;
  const name = s?.body.match(/<w:name w:val="([^"]*)"/)?.[1];
  const rec = { pt: e.name, en: name, styleId: id, type: e.type === 1 ? 'paragraph' : 'character', inBlank: inBlank.has(id),
    latent: name ? latent.get(name) ?? null : null, xml: s ? `<w:style ${s.open}>${s.body}</w:style>` : null };
  if (e.linked && got.linkChar) {
    const c = styles.get(got.linkChar);
    rec.linkChar = { styleId: got.linkChar, inBlank: inBlank.has(got.linkChar), xml: c ? `<w:style ${c.open}>${c.body}</w:style>` : null };
  }
  out.push(rec);
}
writeFileSync(`${dir}/builtins.json`, JSON.stringify(out, null, 1));
console.log(out.length, 'estilos;', out.filter((r) => !r.xml).length, 'sem xml;', out.filter((r) => r.linkChar).length, 'vinculados');
for (const r of out.filter((r) => !r.xml)) console.log('sem xml:', r.pt, r.styleId);
