import { DocxPackage } from './package.js';
import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import { readBorderEdge, type ParaProps, type RunProps, type ParagraphBorders } from './document.js';

/**
 * Leitura de styles.xml: resolve a cadeia basedOn + docDefaults e expõe,
 * por styleId, as propriedades de parágrafo e de run que o estilo define.
 * É isso que faz alinhamento/tamanho/cor carregarem como no app de referência — a tabela
 * hardcoded anterior só valia para o template de uma máquina.
 */

export interface ResolvedStyle {
  para: Partial<ParaProps>;
  run: Partial<RunProps>;
}

export type StylesMap = Map<string, ResolvedStyle>;

const onOff = (el: XmlElement | undefined): boolean | undefined => {
  if (!el) return undefined;
  const v = el.attrs['w:val'];
  return v !== '0' && v !== 'false' && v !== 'none';
};

function readStyleRunProps(rPr: XmlElement | undefined): Partial<RunProps> {
  const p: Partial<RunProps> = {};
  if (!rPr) return p;
  for (const el of childElements(rPr)) {
    const val = el.attrs['w:val'];
    switch (el.name) {
      case 'w:b': p.bold = onOff(el); break;
      case 'w:i': p.italic = onOff(el); break;
      case 'w:caps': p.allCaps = onOff(el); break;
      case 'w:smallCaps': p.smallCaps = onOff(el); break;
      case 'w:strike': p.strike = onOff(el); break;
      case 'w:sz': if (val) p.szHalfPt = parseInt(val, 10); break;
      case 'w:color': if (val && val !== 'auto') p.color = val; break;
      case 'w:rFonts': if (el.attrs['w:ascii']) p.fontAscii = el.attrs['w:ascii']; break;
      case 'w:u': p.underline = val !== 'none'; break;
    }
  }
  return p;
}

function readStyleParaProps(pPr: XmlElement | undefined): Partial<ParaProps> {
  const p: Partial<ParaProps> = {};
  if (!pPr) return p;
  const jc = firstChild(pPr, 'w:jc')?.attrs['w:val'];
  if (jc === 'center' || jc === 'right' || jc === 'both' || jc === 'left') p.alignment = jc;
  const spacing = firstChild(pPr, 'w:spacing');
  if (spacing) {
    if (spacing.attrs['w:line'] && spacing.attrs['w:lineRule'] === 'auto') {
      p.lineTwentieths = parseInt(spacing.attrs['w:line'], 10);
    }
    if (spacing.attrs['w:after']) p.spaceAfterTwips = parseInt(spacing.attrs['w:after'], 10);
    if (spacing.attrs['w:before']) p.spaceBeforeTwips = parseInt(spacing.attrs['w:before'], 10);
  }
  const ind = firstChild(pPr, 'w:ind');
  if (ind?.attrs['w:left']) p.indentLeftTwips = parseInt(ind.attrs['w:left'], 10);
  if (ind?.attrs['w:right']) p.indentRightTwips = parseInt(ind.attrs['w:right'], 10);
  if (firstChild(pPr, 'w:pageBreakBefore')) p.pageBreakBefore = true;
  // bordas e sombreamento de estilo (dividers de títulos, citação, código…)
  const pBdr = firstChild(pPr, 'w:pBdr');
  if (pBdr) {
    const borders: ParagraphBorders = {};
    for (const side of ['top', 'left', 'bottom', 'right'] as const) {
      const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
      if (edge) borders[side] = edge;
    }
    if (Object.keys(borders).length > 0) p.borders = borders;
  }
  const shd = firstChild(pPr, 'w:shd')?.attrs['w:fill'];
  if (shd && shd !== 'auto') p.shadingHex = shd;
  return p;
}

export function readStyles(pkg: DocxPackage): StylesMap {
  const out: StylesMap = new Map();
  const xml = pkg.getPartText('word/styles.xml');
  if (!xml) return out;
  const root = parseXml(xml);

  // docDefaults viram o estilo base implícito
  const docDefaults = firstChild(root, 'w:docDefaults');
  const defRun = readStyleRunProps(
    docDefaults && firstChild(firstChild(docDefaults, 'w:rPrDefault') ?? docDefaults, 'w:rPr'),
  );
  const defPara = readStyleParaProps(
    docDefaults && firstChild(firstChild(docDefaults, 'w:pPrDefault') ?? docDefaults, 'w:pPr'),
  );

  // primeiro: lê os estilos crus
  interface Raw { basedOn?: string; para: Partial<ParaProps>; run: Partial<RunProps> }
  const raw = new Map<string, Raw>();
  for (const st of childElements(root, 'w:style')) {
    if (st.attrs['w:type'] !== 'paragraph' && st.attrs['w:type'] !== 'character') continue;
    const id = st.attrs['w:styleId'];
    if (!id) continue;
    raw.set(id, {
      basedOn: firstChild(st, 'w:basedOn')?.attrs['w:val'],
      para: readStyleParaProps(firstChild(st, 'w:pPr')),
      run: readStyleRunProps(firstChild(st, 'w:rPr')),
    });
  }

  // resolve cadeias basedOn (com proteção contra ciclos)
  const resolve = (id: string, seen: Set<string>): ResolvedStyle => {
    const cached = out.get(id);
    if (cached) return cached;
    const r = raw.get(id);
    if (!r || seen.has(id)) return { para: { ...defPara }, run: { ...defRun } };
    seen.add(id);
    const base = r.basedOn
      ? resolve(r.basedOn, seen)
      : { para: { ...defPara }, run: { ...defRun } };
    const resolved: ResolvedStyle = {
      para: { ...base.para, ...r.para },
      run: { ...base.run, ...r.run },
    };
    out.set(id, resolved);
    return resolved;
  };
  for (const id of raw.keys()) resolve(id, new Set());
  // entrada reservada: os docDefaults puros (fallback p/ parágrafos sem estilo)
  out.set('docDefaults', { para: { ...defPara }, run: { ...defRun } });
  return out;
}
