// Larguras na unidade interna do Word (1/4096 pt = 5/1024 twip), medidas com varreduras
// de palavras de n cópias de um glifo (laboratório: Noto Sans, Caladea, Arial, Calibri,
// Amatic SC — instaladas e embutidas dão o mesmo):
//  - cada glifo mede avanço × corpo / upm em 1/4096 pt ARREDONDADO PARA BAIXO (exato nas
//    fontes de 2048 unidades; até 1/4096 pt a menos nas de 1000/2000);
//  - escala horizontal (w:w): largura média inteira = piso(xAvgCharWidth × w/100) e cada
//    avanço = round(avanço × essa largura / xAvgCharWidth) unidades da fonte;
//  - w:spacing: round(twips × 204,8) por caractere, sem escala;
//  - limite da linha: largura da coluna/célula, recuo direito, esquerdo e da 1ª linha
//    convertidos CADA UM com arredondamento; cabe se a soma das larguras ≤ limite.
// Cada caso traz parágrafos de uma palavra no limite em que essa regra e a largura linear
// exata (com folga de 0,001 twip) discordam, e controles dos dois lados.
//
// Fonte embutida (ew-emb): Amatic SC (SIL OFL 1.1, The Amatic SC Project Authors — a do
// repositório, slides/packages/slides/demo/fonts/os) com a FAMÍLIA renomeada para "Wfit
// Test" (só os nomes de família/completo/PostScript; copyright e licença intactos): versão
// modificada sob a própria OFL, para o Word não trocar a embutida por uma instalada ou da
// nuvem do Office. fsType 0 (incorporação livre); registrada em tools/fonts/allowed-fonts.txt.
// Demais casos: Arial/Calibri pelo NOME (nada embutido). Conteúdo inventado.
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const AMATIC = join(here, '..', '..', '..', '..', 'slides', 'packages', 'slides', 'demo', 'fonts', 'os', 'amatic-sc-regular.ttf');

// ───────────── leitura mínima de sfnt (só leitura; nada é copiado) ─────────────
function sfnt(bytes) {
  const b = Buffer.from(bytes);
  const T = {};
  for (let i = 0; i < b.readUInt16BE(4); i++) { const o = 12 + i * 16; T[b.toString('latin1', o, o + 4)] = { rec: o, off: b.readUInt32BE(o + 8), len: b.readUInt32BE(o + 12) }; }
  const upm = b.readUInt16BE(T.head.off + 18), nH = b.readUInt16BE(T.hhea.off + 34);
  const avg = b.readInt16BE(T['OS/2'].off + 2);
  const cm = T.cmap.off; let sub = 0;
  for (let i = 0; i < b.readUInt16BE(cm + 2); i++) { const s = cm + b.readUInt32BE(cm + 8 + i * 8); if (b.readUInt16BE(cm + 4 + i * 8) === 3 && b.readUInt16BE(cm + 6 + i * 8) === 1 && b.readUInt16BE(s) === 4) sub = s; }
  const seg = b.readUInt16BE(sub + 6) / 2, ends = sub + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
  const gid = (c) => { for (let s = 0; s < seg; s++) { if (c <= b.readUInt16BE(ends + s * 2)) { const st = b.readUInt16BE(starts + s * 2); if (c < st) return 0; const ro = b.readUInt16BE(ranges + s * 2); if (!ro) return (c + b.readInt16BE(deltas + s * 2)) & 0xffff; const g = b.readUInt16BE(ranges + s * 2 + ro + (c - st) * 2); return g ? (g + b.readInt16BE(deltas + s * 2)) & 0xffff : 0; } } return 0; };
  const adv = (ch) => b.readUInt16BE(T.hmtx.off + Math.min(gid(ch.codePointAt(0)), nH - 1) * 4);
  return { b, T, upm, avg, adv };
}
const sum32 = (b, off, len) => { let s = 0; for (let i = off; i < off + ((len + 3) & ~3); i += 4) s = (s + (i + 4 <= b.length ? b.readUInt32BE(i) : 0)) >>> 0; return s; };
/** Troca a família (mesmo comprimento) só nos nomes de família/completo/PostScript/únicos. */
function renameFamily(bytes, pairs) {
  const f = sfnt(bytes); const b = f.b; const nm = f.T.name;
  const count = b.readUInt16BE(nm.off + 2), so = nm.off + b.readUInt16BE(nm.off + 4);
  for (let i = 0; i < count; i++) {
    const rec = nm.off + 6 + i * 12;
    if (![1, 3, 4, 6, 16, 17, 18, 21, 22].includes(b.readUInt16BE(rec + 6))) continue;
    const wide = b.readUInt16BE(rec) !== 1, len = b.readUInt16BE(rec + 8), o = so + b.readUInt16BE(rec + 10);
    let s = wide ? Buffer.from(b.subarray(o, o + len)).swap16().toString('utf16le') : b.toString('latin1', o, o + len);
    for (const [a, z] of pairs) s = s.split(a).join(z);
    (wide ? Buffer.from(s, 'utf16le').swap16() : Buffer.from(s, 'latin1')).copy(b, o);
  }
  b.writeUInt32BE(sum32(b, nm.off, nm.len), nm.rec + 4);
  b.writeUInt32BE(0, f.T.head.off + 8);
  b.writeUInt32BE(sum32(b, f.T.head.off, f.T.head.len), f.T.head.rec + 4);
  b.writeUInt32BE((0xb1b0afba - sum32(b, 0, b.length)) >>> 0, f.T.head.off + 8);
  return new Uint8Array(b);
}
/** .docx com UMA fonte embutida (regular, .odttf ofuscado como o Word grava). */
function withEmbedded(docx, family, data) {
  const files = unzipSync(docx);
  const key = '{5A0E1F3C-7B2D-4C9E-8F10-2D3B4C5D6E7F}';
  const k = new Uint8Array(16);
  for (let i = 0; i < 16; i++) k[i] = parseInt(key.replace(/[{}-]/g, '').slice(i * 2, i * 2 + 2), 16);
  k.reverse();
  const odttf = new Uint8Array(data);
  for (let i = 0; i < 32; i++) odttf[i] ^= k[i % 16];
  files['word/fonts/font1.odttf'] = odttf;
  files['word/fontTable.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:font w:name="${family}"><w:charset w:val="00"/><w:family w:val="auto"/><w:pitch w:val="variable"/><w:embedRegular r:id="rIdF1" w:fontKey="${key}"/></w:font></w:fonts>`);
  files['word/_rels/fontTable.xml.rels'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdF1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font1.odttf"/></Relationships>');
  files['[Content_Types].xml'] = strToU8(strFromU8(files['[Content_Types].xml'])
    .replace('<Default Extension="xml"', '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Default Extension="xml"')
    .replace('</Types>', '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/></Types>'));
  files['word/_rels/document.xml.rels'] = strToU8(strFromU8(files['word/_rels/document.xml.rels'])
    .replace('</Relationships>', '<Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>'));
  files['word/settings.xml'] = strToU8(strFromU8(files['word/settings.xml']).replace(/(<w:settings [^>]*>)/, '$1<w:embedTrueTypeFonts/>'));
  // data fixa: o .docx sai idêntico a cada geração (o sha256 dele está em allowed-fonts.txt)
  return zipSync(files, { level: 6, mtime: new Date(2026, 0, 1) });
}

// ───────────── regra medida × largura linear exata ─────────────
const K = 1024 / 5; // unidades internas por twip
const rq = (tw) => Math.sign(tw) * Math.round(Math.abs(tw) * K); // nunca empata (twips inteiros)
/** largura do glifo (unidades internas) e a linear exata (twips) */
function glyph(f, ch, size, w = 100, sp = 0) {
  let u = f.adv(ch);
  const exact = (u * size * 20) / f.upm * (w / 100) + sp;
  if (w !== 100) u = Math.floor((u * Math.floor((f.avg * w) / 100)) / f.avg + 0.5);
  return { g: Math.floor((u * size * 4096) / f.upm) + rq(sp), exact };
}
/** limite (unidades internas) e largura útil exata (twips) de uma linha */
const limit = (cw, L, R, FL) => ({ g: rq(cw) - rq(R) - rq(L) - rq(FL), exact: cw - R - L - FL });

/**
 * Palavras X^n1 Y^n2 em que a regra medida e a linear exata discordam (e controles): para
 * cada largura útil A candidata, o recuo direito é o que sobra da coluna.
 */
function pick(f, size, pairs, { w = 100, sp = 0, cw = 8504, L = 0, FL = 0, want = 24, controls = 6, rpr = '', step = [7, 3] } = {}) {
  const out = [];
  let ctl = 0;
  for (const [x, y] of pairs) {
    const gx = glyph(f, x, size, w, sp), gy = glyph(f, y, size, w, sp);
    let got = 0;
    for (let n1 = 6; n1 < 400 && got < want / pairs.length; n1 += step[0]) {
      for (let n2 = 1; n2 < 60 && got < want / pairs.length; n2 += step[1]) {
        const Wg = n1 * gx.g + n2 * gy.g, Wx = n1 * gx.exact + n2 * gy.exact;
        if (Wx > cw - L - FL - 50) continue;
        for (const A of [Math.floor(Wx) - 1, Math.floor(Wx), Math.ceil(Wx), Math.floor(Wg / K), Math.ceil(Wg / K)]) {
          const R = cw - L - FL - A;
          const lim = limit(cw, L, R, FL);
          const neu = Wg <= lim.g, old = Wx <= lim.exact + 0.001;
          if (neu === old && ctl >= controls) continue;
          if (out.some((o) => o.text === x.repeat(n1) + y.repeat(n2) && o.R === R)) continue;
          if (neu === old) ctl++; else got++;
          out.push({ text: x.repeat(n1) + y.repeat(n2), L, R, FL, rpr });
          break;
        }
      }
    }
  }
  return out;
}
const ind = (o) => `<w:ind w:left="${o.L}" w:right="${o.R}"${o.FL > 0 ? ` w:firstLine="${o.FL}"` : o.FL < 0 ? ` w:hanging="${-o.FL}"` : ''}/>`;
const para = (o, fam, size) => p(r(o.text, font(fam) + o.rpr + sz(size)), `<w:spacing w:after="0"/>${ind(o)}`);
const PAIRS = [['a', 'o'], ['e', 'n'], ['s', 't'], ['M', 'i'], ['0', '.']];

export const cases = [];
// 1) fonte embutida de 1000 unidades por em: piso em 1/4096 pt (corpos 12, 10,5 e 9) e escala
if (existsSync(AMATIC)) {
  const data = renameFamily(new Uint8Array(readFileSync(AMATIC)), [['Amatic SC', 'Wfit Test'], ['AmaticSC', 'WfitTest']]);
  const f = sfnt(data);
  let body = '';
  for (const size of [12, 10.5, 9]) for (const o of pick(f, size, PAIRS)) body += para(o, 'Wfit Test', size);
  for (const w of [90, 105]) for (const o of pick(f, 11, PAIRS, { w, want: 12, controls: 3, rpr: `<w:w w:val="${w}"/>` })) body += para(o, 'Wfit Test', 11);
  cases.push({ name: 'ew-emb', docx: withEmbedded(buildDocx({ body, defaults: docDefaults({ font: 'Wfit Test', size: 12 }) }), 'Wfit Test', data) });
}
// 2) escala horizontal (w:w) e 3) espaçamento (w:spacing), fontes instaladas pelo nome
for (const [key, fam, path] of [['arial', 'Arial', 'C:/Windows/Fonts/arial.ttf'], ['calibri', 'Calibri', 'C:/Windows/Fonts/calibri.ttf']]) {
  if (!existsSync(path)) continue;
  const f = sfnt(new Uint8Array(readFileSync(path)));
  let body = '';
  for (const w of [80, 90, 95, 105, 110, 150]) for (const o of pick(f, 11, PAIRS, { w, want: 10, controls: 2, rpr: `<w:w w:val="${w}"/>` })) body += para(o, fam, 11);
  cases.push({ name: `ew-scale-${key}`, docx: buildDocx({ body, defaults: docDefaults({ font: fam, size: 11 }) }) });
  if (key !== 'arial') continue;
  body = '';
  for (const [w, sp] of [[100, -4], [100, -3], [100, -1], [100, 1], [100, 2], [100, 4], [105, -3], [105, 2]]) {
    for (const o of pick(f, 11, PAIRS, { w, sp, want: 10, controls: 2, rpr: `<w:spacing w:val="${sp}"/>` + (w !== 100 ? `<w:w w:val="${w}"/>` : '') })) body += para(o, fam, 11);
  }
  cases.push({ name: 'ew-spacing', docx: buildDocx({ body, defaults: docDefaults({ font: fam, size: 11 }) }) });
  // 4) limite da linha: recuos (esquerdo, 1ª linha, deslocado) fora de múltiplos de 5 twips,
  //    no corpo (coluna de 8504) e numa célula (conteúdo de 4999 − 216 twips)
  body = '';
  for (const [L, FL] of [[1, 0], [3, 0], [0, 2], [0, 4], [7, -3], [9, -1]]) for (const o of pick(f, 11, PAIRS, { L, FL, want: 10, controls: 2, step: [1, 1] })) body += para(o, fam, 11);
  const CELL = 4999, cwc = CELL - 216;
  let cell = '';
  for (const [L, FL] of [[0, 0], [2, 0], [1, 3]]) for (const o of pick(f, 11, PAIRS, { cw: cwc, L, FL, want: 10, controls: 2, step: [1, 1] })) cell += para(o, fam, 11);
  body += `<w:tbl><w:tblPr><w:tblW w:w="${CELL}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${CELL}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${CELL}" w:type="dxa"/></w:tcPr>${cell}</w:tc></w:tr></w:tbl>${p('')}`;
  cases.push({ name: 'ew-limit', docx: buildDocx({ body, defaults: docDefaults({ font: fam, size: 11 }) }) });
}
