/**
 * Dados de ROUND-TRIP que o PowerPoint 2007+ grava dentro do .ppt quando
 * salva em "modo de compatibilidade" — pequenos pacotes OOXML zipados:
 *
 *  - RoundTripTheme12Atom (no mestre): o tema original (theme1.xml) completo;
 *  - metroBlob (FOPT 0x3A9 da forma): `drs/shapexml.xml` com o `<p:sp>`/`<p:pic>`
 *    DrawingML original + `drs/downrev.xml` (checksums). O PowerPoint moderno,
 *    ao abrir o .ppt, usa esse XML para a aparência da forma (ex.: contorno
 *    `noFill` que o binário deixa "não especificado" = visível por padrão).
 *    O TEXTO do shapexml vem mascarado ("____") — o texto vale o do binário.
 *    SmartArt: a forma do binário é uma IMAGEM e o blob traz o graphicFrame
 *    original (`drs/e2oDoc.xml`) com as partes do diagrama (`drs/diagrams/*`).
 *
 * Arquivos 97-2003 genuínos não têm nada disso; o conversor trata esta camada
 * como opcional (ConvertOptions.useRoundTrip).
 */
import { unzipSync, strFromU8 } from 'fflate';
import { parseXml, firstChild, childElements, type XmlElement } from '../xml.js';
import type { OAShape } from './officeart.js';
import { escText, escAttr } from './xmlw.js';

/**
 * Teto por parte dos zips de round-trip (XML de tema/forma/diagrama: KB, no
 * máximo poucos MB). O fflate pré-aloca o tamanho DECLARADO no zip (até 4 GiB)
 * — partes acima do teto ou com razão de compressão absurda são ignoradas.
 */
const MAX_RT_PART = 32 * 1024 * 1024;
const okPart = (f: { size: number; originalSize: number }): boolean =>
  f.originalSize <= MAX_RT_PART && f.originalSize <= Math.max(1 << 20, f.size * 1100);

/** Descompacta um zip de round-trip (partes que passam no teto e no `filter`). */
export function unzipRoundTrip(bytes: Uint8Array, filter?: (name: string) => boolean): Record<string, Uint8Array> {
  return unzipSync(bytes, { filter: (f) => okPart(f) && (!filter || filter(f.name)) });
}

const partTextCache = new WeakMap<Uint8Array, Map<string, string | undefined>>();

/** Primeira parte do zip cujo nome termina com `suffix` (texto) — ou undefined. Cacheado por blob. */
export function zipPartText(bytes: Uint8Array | undefined, suffix: string): string | undefined {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return undefined;
  let cache = partTextCache.get(bytes);
  if (!cache) partTextCache.set(bytes, cache = new Map());
  if (cache.has(suffix)) return cache.get(suffix);
  let text: string | undefined;
  try {
    const parts = unzipRoundTrip(bytes, (n) => n.endsWith(suffix));
    const name = Object.keys(parts)[0];
    text = name ? strFromU8(parts[name]!) : undefined;
  } catch { text = undefined; }
  cache.set(suffix, text);
  return text;
}

/** XML do tema original (RoundTripTheme12Atom) — undefined se ausente/inválido. */
export function roundTripThemeXml(bytes: Uint8Array | undefined): string | undefined {
  const xml = zipPartText(bytes, 'theme1.xml');
  if (!xml || !xml.includes('<a:theme')) return undefined;
  try { parseXml(xml); } catch { return undefined; }
  return xml;
}

/** Diagrama (SmartArt) do metroBlob: `<p:E2oFrame>` (graphicFrame original) + partes do zip. */
export interface MetroDiagram {
  frame: XmlElement;
  /** Partes do zip interno (caminho sem barra inicial → bytes). */
  parts: Record<string, Uint8Array>;
  /** Content-types das partes (`[Content_Types].xml` interno), por caminho. */
  types: Map<string, string>;
  /** Margens de efeito (`<a:preciseEffectOffsets>`, fração do tamanho): a imagem do binário = quadro + margens. */
  effect?: { l: number; t: number; r: number; b: number };
}

/** SmartArt guardado no metroBlob (undefined se a forma não é um diagrama de round-trip). */
export function metroDiagram(sh: OAShape): MetroDiagram | undefined {
  const blob = sh.props.get(0x3a9)?.complex;
  if (!blob || blob.length < 4 || blob[0] !== 0x50 || blob[1] !== 0x4b) return undefined;
  let parts: Record<string, Uint8Array>;
  try { parts = unzipRoundTrip(blob); } catch { return undefined; }
  const e2o = parts['drs/e2oDoc.xml'];
  if (!e2o) return undefined;
  let frame: XmlElement;
  try { frame = parseXml(strFromU8(e2o)); } catch { return undefined; }
  if (!strFromU8(e2o).includes('drawingml/2006/diagram')) return undefined;
  const types = new Map<string, string>();
  const ct = parts['[Content_Types].xml'];
  if (ct) {
    for (const m of strFromU8(ct).matchAll(/<Override [^>]*>/g)) {
      const name = /PartName="\/?([^"]+)"/.exec(m[0])?.[1], type = /ContentType="([^"]+)"/.exec(m[0])?.[1];
      if (name && type) types.set(name, type);
    }
  }
  const out: MetroDiagram = { frame, parts, types };
  const dr = parts['drs/downrev.xml'];
  const off = dr ? /<a:preciseEffectOffsets>(.*?)<\/a:preciseEffectOffsets>/.exec(strFromU8(dr))?.[1] : undefined;
  if (off) {
    const frac = (tag: string): number => {
      const m = new RegExp(`<a:${tag} n="(-?\\d+)" d="(\\d+)"`).exec(off);
      return m && Number(m[2]) ? Number(m[1]) / Number(m[2]) : 0;
    };
    out.effect = { l: frac('l'), t: frac('t'), r: frac('r'), b: frac('b') };
  }
  return out;
}

const metroCache = new WeakMap<OAShape, XmlElement | null>();

/** Raiz do `drs/shapexml.xml` do metroBlob da forma (cacheada). */
export function metroShape(sh: OAShape): XmlElement | undefined {
  const hit = metroCache.get(sh);
  if (hit !== undefined) return hit ?? undefined;
  let root: XmlElement | null = null;
  const blob = sh.props.get(0x3a9)?.complex;
  const xml = zipPartText(blob, 'shapexml.xml');
  if (xml) {
    try { root = parseXml(xml); } catch { root = null; }
  }
  metroCache.set(sh, root);
  return root ?? undefined;
}

/** `<p:spPr>` do shapexml. */
export function metroSpPr(sh: OAShape): XmlElement | undefined {
  const root = metroShape(sh);
  return root ? firstChild(root, 'p:spPr') : undefined;
}

/** Partes visuais do spPr original que sobrepõem as do binário. */
export interface MetroVisual {
  geometry?: string;
  fill?: string;
  line?: string;
  effects?: string;
  xfrm?: { x: number; y: number; cx: number; cy: number; rot: number; flipH: boolean; flipV: boolean };
}

const FILL_TAGS = ['a:noFill', 'a:solidFill', 'a:gradFill', 'a:pattFill'];
const LINE_FILLS = ['a:noFill', 'a:solidFill', 'a:gradFill', 'a:pattFill'];

/** Extrai as partes visuais do spPr do shapexml (só o que é autocontido). */
export function metroVisual(sh: OAShape): MetroVisual | undefined {
  const spPr = metroSpPr(sh);
  if (!spPr) return undefined;
  const v: MetroVisual = {};
  const geom = firstChild(spPr, 'a:prstGeom') ?? firstChild(spPr, 'a:custGeom');
  if (geom) v.geometry = serializeXml(geom);
  const fill = FILL_TAGS.map((t) => firstChild(spPr, t)).find((x) => x !== undefined);
  if (fill) v.fill = serializeXml(fill);
  const ln = firstChild(spPr, 'a:ln');
  // `<a:ln>` sem preenchimento próprio herda a cor do estilo: fica a do binário
  if (ln && childElements(ln).some((c) => LINE_FILLS.includes(c.name))) v.line = serializeXml(ln);
  const eff = firstChild(spPr, 'a:effectLst');
  if (eff) v.effects = serializeXml(eff);
  const xfrm = firstChild(spPr, 'a:xfrm');
  const off = xfrm ? firstChild(xfrm, 'a:off') : undefined;
  const ext = xfrm ? firstChild(xfrm, 'a:ext') : undefined;
  if (xfrm && off && ext) {
    const n = (e: XmlElement, a: string): number => parseInt(e.attrs[a] ?? '0', 10) || 0;
    v.xfrm = {
      x: n(off, 'x'), y: n(off, 'y'), cx: n(ext, 'cx'), cy: n(ext, 'cy'),
      rot: (parseInt(xfrm.attrs['rot'] ?? '0', 10) || 0) / 60000,
      flipH: xfrm.attrs['flipH'] === '1', flipV: xfrm.attrs['flipV'] === '1',
    };
  }
  return v;
}

/**
 * `<p:txBody>` do shapexml com os CARACTERES do binário: o PowerPoint grava o
 * texto mascarado ("____ ___") mas com a mesma estrutura de parágrafos/
 * corridas e o mesmo comprimento — a formatação (marL/indent por parágrafo,
 * espaçamentos, cores) vem do XML, o texto do binário. Só é aceito se a
 * estrutura casa exatamente (nº de parágrafos e comprimento de cada um);
 * corpos com relações (hiperlinks/imagens do pacote interno) são recusados.
 */
export function metroTextBody(sh: OAShape, text: string): string | undefined {
  const root = metroShape(sh);
  const tx = root ? firstChild(root, 'p:txBody') : undefined;
  if (!tx) return undefined;
  const paras = childElements(tx, 'a:p');
  const bin = text.split('\r');
  if (paras.length !== bin.length) return undefined;
  const out: XmlElement = { name: tx.name, attrs: tx.attrs, children: [] };
  let pi = 0;
  for (const c of tx.children) {
    if (typeof c === 'string') continue;
    if (c.name !== 'a:p') { out.children.push(c); continue; }
    const bt = bin[pi++] ?? '';
    let pos = 0;
    const np: XmlElement = { name: c.name, attrs: c.attrs, children: [] };
    for (const k of c.children) {
      if (typeof k === 'string') continue;
      if (k.name === 'a:r' || k.name === 'a:fld') {
        const t = firstChild(k, 'a:t');
        const len = t ? t.children.filter((x): x is string => typeof x === 'string').join('').length : 0;
        const seg = bt.slice(pos, pos + len);
        pos += len;
        np.children.push({ name: k.name, attrs: k.attrs, children: k.children.map((x) =>
          typeof x !== 'string' && x.name === 'a:t' ? { name: 'a:t', attrs: {}, children: seg ? [seg] : [] } : x) });
      } else if (k.name === 'a:br') {
        if (bt[pos] !== '\v') return undefined;
        pos++;
        np.children.push(k);
      } else np.children.push(k);
    }
    if (pos !== bt.length) return undefined;
    out.children.push(np);
  }
  const xml = serializeXml(out);
  if (/\br:(id|embed|link)=/.test(xml)) return undefined;
  return xml;
}

/** Nome XML aceitável (o parser tolera `"`/`<` em nomes; a saída não pode). */
const XML_NAME = /^[A-Za-z_][\w.:-]*$/;

/** Serializa um XmlElement de volta para texto (atributos e texto escapados; nomes inválidos ficam de fora). */
export function serializeXml(el: XmlElement): string {
  if (!XML_NAME.test(el.name)) return '';
  let out = `<${el.name}`;
  for (const [k, v] of Object.entries(el.attrs)) if (XML_NAME.test(k)) out += ` ${k}="${escAttr(v)}"`;
  if (!el.children.length) return out + '/>';
  out += '>';
  for (const c of el.children) out += typeof c === 'string' ? escText(c) : serializeXml(c);
  return out + `</${el.name}>`;
}
