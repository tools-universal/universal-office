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
 *
 * Arquivos 97-2003 genuínos não têm nada disso; o conversor trata esta camada
 * como opcional (ConvertOptions.useRoundTrip).
 */
import { unzipSync, strFromU8 } from 'fflate';
import { parseXml, firstChild, childElements, type XmlElement } from '../xml.js';
import type { OAShape } from './officeart.js';
import { escText, escAttr } from './xmlw.js';

/** Primeira parte do zip cujo nome termina com `suffix` (texto) — ou undefined. */
export function zipPartText(bytes: Uint8Array | undefined, suffix: string): string | undefined {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return undefined;
  try {
    const parts = unzipSync(bytes, { filter: (f) => f.name.endsWith(suffix) });
    const name = Object.keys(parts)[0];
    return name ? strFromU8(parts[name]!) : undefined;
  } catch { return undefined; }
}

/** XML do tema original (RoundTripTheme12Atom) — undefined se ausente/inválido. */
export function roundTripThemeXml(bytes: Uint8Array | undefined): string | undefined {
  const xml = zipPartText(bytes, 'theme1.xml');
  if (!xml || !xml.includes('<a:theme')) return undefined;
  try { parseXml(xml); } catch { return undefined; }
  return xml;
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

/** Serializa um XmlElement de volta para texto (atributos e texto escapados). */
export function serializeXml(el: XmlElement): string {
  let out = `<${el.name}`;
  for (const [k, v] of Object.entries(el.attrs)) out += ` ${k}="${escAttr(v)}"`;
  if (!el.children.length) return out + '/>';
  out += '>';
  for (const c of el.children) out += typeof c === 'string' ? escText(c) : serializeXml(c);
  return out + `</${el.name}>`;
}
