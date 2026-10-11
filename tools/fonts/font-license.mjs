// Classifica um arquivo de fonte pela LICENÇA que ele mesmo declara (tabela
// `name`: copyright, marca, fabricante, descrição e URL da licença) e pelas
// permissões de incorporação (OS/2 fsType). Usado pelo hook de pre-commit,
// pelo CI e pela auditoria do histórico (tools/fonts/check-fonts.mjs).
//
//   proprietary — fonte da Microsoft/Monotype ("Microsoft supplied font"…) ou
//                 com incorporação restrita (fsType ≠ 0): NUNCA no repositório
//   open        — licença aberta declarada (OFL, Apache, MIT, Ubuntu, GPL+FE…)
//   unknown     — sem licença legível (ou formato que não dá para ler, como
//                 EOT/.fntdata): só entra se estiver na lista de permitidas
import { brotliDecompressSync, inflateSync } from 'node:zlib';

export const FONT_EXT = /\.(ttf|otf|ttc|otc|woff2?|eot|fntdata|odttf|pfb|pfa|dfont)$/i;

/** Documentos do Office (ZIP) que podem carregar fontes EMBUTIDAS. */
export const OOXML_EXT = /\.(docx|docm|dotx|dotm|pptx|pptm|potx|potm|ppsx|xlsx|xlsm|xltx|xltm)$/i;

/** PDFs: carregam os programas das fontes usadas (subconjuntos) — também é
 *  redistribuir a fonte (ex.: PDF de referência gerado com Aptos). */
export const PDF_EXT = /\.pdf$/i;

/**
 * Programas de fonte EMBUTIDOS num PDF (/FontFile, /FontFile2, /FontFile3),
 * descomprimidos. Segue as referências "/FontFileN obj 0 R" até o stream do
 * objeto (streams não ficam em object streams, então a busca direta basta).
 */
export function pdfFontPrograms(buf) {
  const b = Buffer.from(buf.buffer, buf.byteOffset ?? 0, buf.byteLength ?? buf.length);
  const s = b.toString('latin1');
  const out = [];
  const seen = new Set();
  for (const m of s.matchAll(/\/FontFile[23]?\s+(\d+)\s+(\d+)\s+R/g)) {
    const key = `${m[1]} ${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const head = new RegExp(`(?:^|[\\r\\n\\s])${m[1]}\\s+${m[2]}\\s+obj\\b`, 'g');
    let objAt = -1;
    for (const h of s.matchAll(head)) objAt = h.index; // a última definição vale (atualização incremental)
    if (objAt < 0) continue;
    const st = s.indexOf('stream', objAt);
    if (st < 0) continue;
    const dict = s.slice(objAt, st);
    let start = st + 6;
    if (s[start] === '\r') start++;
    if (s[start] === '\n') start++;
    const lenM = /\/Length\s+(\d+)(\s+\d+\s+R)?/.exec(dict);
    let end = lenM && !lenM[2] ? start + Number(lenM[1]) : s.indexOf('endstream', start);
    if (end < start) continue;
    let data = b.subarray(start, end);
    if (/FlateDecode/.test(dict)) { try { data = inflateSync(data); } catch { /* stream corrompido: classifica como está */ } }
    out.push(new Uint8Array(data));
  }
  return out;
}

/** Partes de fonte embutida dentro de um ZIP OOXML (só os nomes, pelo diretório central). */
export function embeddedFontParts(buf) {
  const b = new Uint8Array(buf);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return [];
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  for (let k = 0; k < count && p + 46 <= b.length; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nlen));
    if (/^(word|ppt|xl)\/fonts\//i.test(name) || /\.(odttf|fntdata)$/i.test(name)) out.push(name);
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

// detentores de fontes de sistema/comerciais (só vale se NÃO houver licença aberta declarada)
const PROPRIETARY = /microsoft|monotype|linotype/i;
const OPEN = /open font licen[cs]e|\bOFL\b|scripts\.sil\.org\/OFL|openfontlicense|apache licen[cs]e|apache\.org\/licenses|\bMIT licen[cs]e|ubuntu font licen[cs]e|GNU General Public License.*font exception|font exception|bitstream vera|creative commons zero|\bCC0\b|public domain|IPA font licen[cs]e/i;

function sfnt(b, base = 0) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (String.fromCharCode(...b.subarray(0, 4)) === 'ttcf') base = dv.getUint32(12); // coleção: face 0
  const n = dv.getUint16(base + 4), t = {};
  for (let i = 0; i < n; i++) {
    const o = base + 12 + i * 16;
    t[String.fromCharCode(...b.subarray(o, o + 4))] = { off: dv.getUint32(o + 8), len: dv.getUint32(o + 12) };
  }
  return { dv, t };
}

/** WOFF 1.0: tabelas zlib por tabela. */
function woff1(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = dv.getUint16(12), t = {}, parts = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const tag = String.fromCharCode(...b.subarray(o, o + 4));
    const off = dv.getUint32(o + 4), comp = dv.getUint32(o + 8), orig = dv.getUint32(o + 12);
    if (tag !== 'name' && tag !== 'OS/2') continue;
    const raw = b.subarray(off, off + comp);
    const data = comp < orig ? new Uint8Array(inflateSync(raw)) : raw;
    t[tag] = { off: total, len: data.length };
    parts.push(data); total += data.length;
  }
  const all = new Uint8Array(total);
  let p = 0; for (const d of parts) { all.set(d, p); p += d.length; }
  return { dv: new DataView(all.buffer), t };
}

const WOFF2_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

/** WOFF 2.0: um bloco brotli com as tabelas em sequência (name/OS2 não são transformadas). */
function woff2(b) {
  const dv0 = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const num = dv0.getUint16(12), compLen = dv0.getUint32(20);
  let p = 48;
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const x = b[p++]; v = v * 128 + (x & 0x7f); if (!(x & 0x80)) break; } return v; };
  const dir = [];
  for (let i = 0; i < num; i++) {
    const f = b[p++];
    let tag = WOFF2_TAGS[f & 0x3f];
    if ((f & 0x3f) === 63) { tag = String.fromCharCode(...b.subarray(p, p + 4)); p += 4; }
    const orig = base128(), ver = (f >> 6) & 3;
    const transformed = tag === 'glyf' || tag === 'loca' ? ver !== 3 : ver !== 0;
    dir.push({ tag, len: transformed ? base128() : orig });
  }
  const data = brotliDecompressSync(b.subarray(p, p + compLen));
  const t = {};
  let off = 0;
  for (const d of dir) { t[d.tag] = { off, len: d.len }; off += d.len; }
  return { dv: new DataView(data.buffer, data.byteOffset, data.byteLength), t };
}

/** Metadados de licença: name IDs 0 (copyright), 1 (família), 7 (marca), 8 (fabricante), 13 (licença), 14 (URL) + fsType. */
export function fontMeta(buf) {
  const b = new Uint8Array(buf);
  const sig = String.fromCharCode(...b.subarray(0, 4));
  let parsed;
  if (sig === 'wOF2') parsed = woff2(b);
  else if (sig === 'wOFF') parsed = woff1(b);
  else if (sig === '\0\x01\0\0' || sig === 'OTTO' || sig === 'true' || sig === 'ttcf') parsed = sfnt(b);
  else return null; // EOT/.fntdata/Type1… — formato não lido aqui
  const { dv, t } = parsed;
  const meta = {};
  const rank = {}; // prefere Windows/inglês (a 1ª entrada do Windows costuma ser catalã: "Negreta")
  if (t.name) {
    const o = t.name.off, count = dv.getUint16(o + 2), str = o + dv.getUint16(o + 4);
    for (let i = 0; i < count; i++) {
      const r = o + 6 + i * 12;
      const pid = dv.getUint16(r), enc = dv.getUint16(r + 2), lang = dv.getUint16(r + 4), id = dv.getUint16(r + 6), len = dv.getUint16(r + 8), so = dv.getUint16(r + 10);
      if (![0, 1, 2, 7, 8, 13, 14].includes(id)) continue;
      const score = pid === 3 && lang === 0x409 ? 3 : pid === 3 ? 2 : pid === 0 ? 1 : 0;
      if ((rank[id] ?? -1) >= score) continue;
      let s = '';
      if (pid === 3 || pid === 0) { for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(dv.getUint16(str + so + k)); }
      else if (pid === 1 && enc === 0) { for (let k = 0; k < len; k++) s += String.fromCharCode(dv.getUint8(str + so + k)); }
      else continue;
      meta[id] = s;
      rank[id] = score;
    }
  }
  if (t['OS/2'] && t['OS/2'].len >= 64) {
    meta.weight = dv.getUint16(t['OS/2'].off + 4);
    meta.fsType = dv.getUint16(t['OS/2'].off + 8);
    meta.italic = (dv.getUint16(t['OS/2'].off + 62) & 1) === 1;
  }
  return meta;
}

/** { verdict, family, reason } — ver o cabeçalho. */
export function classifyFont(buf) {
  let meta;
  try { meta = fontMeta(buf); } catch (e) { return { verdict: 'unknown', reason: `não foi possível ler a fonte (${e.message})` }; }
  if (!meta) return { verdict: 'unknown', reason: 'formato sem leitura de licença (EOT/.fntdata/Type 1…)' };
  const family = meta[1] ?? '?';
  const who = [meta[0], meta[7], meta[8], meta[13]].filter(Boolean).join(' | ');
  const license = [meta[13], meta[14]].filter(Boolean).join(' | ');
  if (/microsoft supplied font/i.test(meta[13] ?? '')) return { verdict: 'proprietary', family, reason: 'licença "Microsoft supplied font" (uso só no produto em que veio)' };
  if (meta.fsType !== undefined && (meta.fsType & 0x000e) !== 0) return { verdict: 'proprietary', family, reason: `incorporação restrita (fsType ${meta.fsType}) — fonte comercial` };
  if (OPEN.test(license)) return { verdict: 'open', family, reason: license.slice(0, 120) };
  if (PROPRIETARY.test(who)) return { verdict: 'proprietary', family, reason: `detentor proprietário: ${who.slice(0, 120)}` };
  return { verdict: 'unknown', family, reason: 'sem licença aberta declarada na fonte' };
}
