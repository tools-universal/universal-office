/**
 * Marca-d'água: o XML que o diálogo Marca-d'Água Personalizada do Word grava
 * (o corpus tem 110 documentos com ela; oráculo write/tools/page-lab), a galeria
 * (os 12 blocos do tipo 8 do Word, com os tamanhos medidos) e a leitura da marca
 * de um cabeçalho.
 *
 *  - VML num w:pict, no 1º run do 1º parágrafo de CADA cabeçalho (even/default/
 *    first) da seção, com `<w:rPr><w:noProof/></w:rPr>`, sem sdt;
 *  - texto: `PowerPlusWaterMarkObject{N}` (v:shapetype _x0000_t136), centrado na
 *    margem, `rotation:315` na diagonal, `font-size:1pt` = tamanho automático,
 *    `<v:fill opacity=".5"/>` se semitransparente, `fillcolor` = a cor;
 *  - imagem: `WordPictureWatermark{N}` (_x0000_t75), `gain="19661f"
 *    blacklevel="22938f"` quando desbotada.
 */

export type WatermarkLayout = 'diagonal' | 'horizontal';

export interface WatermarkTextSpec {
  kind: 'text';
  text: string;
  font: string;
  /** pt; ausente = Automático (font-size:1pt, a caixa dá o tamanho) */
  sizePt?: number;
  /** RRGGBB */
  color: string;
  semitransparent: boolean;
  layout: WatermarkLayout;
  /** idioma do texto (w:lang do diálogo), BCP 47 */
  lang?: string;
}

export interface WatermarkPictureSpec {
  kind: 'picture';
  data: Uint8Array;
  ext: string;
  /** nome do arquivo (o:title) */
  title: string;
  /** escala em %; ausente = Automático (largura da área útil) */
  scale?: number;
  washout: boolean;
}

export type WatermarkSpec = WatermarkTextSpec | WatermarkPictureSpec;

/** Marca lida de um cabeçalho (o que o diálogo mostra como estado atual). */
export type WatermarkInfo =
  | (Omit<WatermarkTextSpec, 'kind'> & { kind: 'text'; widthPt: number; heightPt: number })
  | { kind: 'picture'; rid: string; title: string; washout: boolean; widthPt: number; heightPt: number };

const SHAPETYPE_TEXT = '<v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e">'
  + '<v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/>'
  + '<v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/>'
  + '<v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas>'
  + '<v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/>'
  + '<v:textpath on="t" fitshape="t"/><v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles>'
  + '<o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype>';

const SHAPETYPE_PICTURE = '<v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f">'
  + '<v:stroke joinstyle="miter"/><v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/>'
  + '<v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/>'
  + '<v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/>'
  + '<v:f eqn="sum @10 21600 0"/></v:formulas><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/>'
  + '<o:lock v:ext="edit" aspectratio="t"/></v:shapetype>';

const POS = 'mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** pt como o VML do Word grava (até 2 casas, sem zeros à direita). */
const ptv = (v: number): string => `${Math.round(v * 100) / 100}pt`;

/** Ids da forma: `n` = sufixo do nome (PowerPlusWaterMarkObject{n}), `spid` = o:spid (_x0000_s{spid}). */
export interface WatermarkIds { n: number; spid: number; anchorId: string }

/**
 * Run (w:r) da marca-d'água para o 1º parágrafo de um cabeçalho. `box` = tamanho da
 * forma em pt; `rid` = relação da imagem (só a de imagem).
 */
export function watermarkRunXml(spec: WatermarkSpec, box: { widthPt: number; heightPt: number }, ids: WatermarkIds, rid?: string, vmlColor: (hex: string) => string = (h) => `#${h.toLowerCase()}`): string {
  const head = `<w:r><w:rPr><w:noProof/></w:rPr><w:pict w14:anchorId="${ids.anchorId}">`;
  if (spec.kind === 'picture') {
    const fx = spec.washout ? ' gain="19661f" blacklevel="22938f"' : '';
    return `${head}${SHAPETYPE_PICTURE}<v:shape id="WordPictureWatermark${ids.n}" o:spid="_x0000_s${ids.spid}" type="#_x0000_t75" `
      + `style="position:absolute;margin-left:0;margin-top:0;width:${ptv(box.widthPt)};height:${ptv(box.heightPt)};z-index:-251657216;${POS}" o:allowincell="f">`
      + `<v:imagedata r:id="${rid ?? ''}" o:title="${esc(spec.title)}"${fx}/><w10:wrap anchorx="margin" anchory="margin"/></v:shape></w:pict></w:r>`;
  }
  const rot = spec.layout === 'diagonal' ? 'rotation:315;' : '';
  const size = spec.sizePt ? `${Math.round(spec.sizePt * 100) / 100}pt` : '1pt';
  return `${head}${SHAPETYPE_TEXT}<v:shape id="PowerPlusWaterMarkObject${ids.n}" o:spid="_x0000_s${ids.spid}" type="#_x0000_t136" alt="" `
    + `style="position:absolute;margin-left:0;margin-top:0;width:${ptv(box.widthPt)};height:${ptv(box.heightPt)};${rot}z-index:-251657216;`
    + `mso-wrap-edited:f;mso-width-percent:0;mso-height-percent:0;${POS};mso-width-percent:0;mso-height-percent:0" `
    + `o:allowincell="f" fillcolor="${vmlColor(spec.color)}" stroked="f">${spec.semitransparent ? '<v:fill opacity=".5"/>' : ''}`
    + `<v:textpath style="font-family:&quot;${esc(spec.font)}&quot;;font-size:${size}" string="${esc(spec.text)}"/>`
    + '<w10:wrap anchorx="margin" anchory="margin"/></v:shape></w:pict></w:r>';
}

/** O XML (de um run ou objeto) é uma marca-d'água do Word? */
export function isWatermarkXml(xml: string | undefined): boolean {
  return !!xml && /\bid="(?:PowerPlusWaterMarkObject|WordPictureWatermark)\d*"/.test(xml);
}

const attr = (xml: string, name: string): string | undefined => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(xml);
  return m ? m[1]!.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : undefined;
};
const styleProp = (style: string, k: string): string | undefined => new RegExp(`(?:^|;)\\s*${k}\\s*:\\s*([^;]+)`).exec(style)?.[1]?.trim();
const ptOf = (v: string | undefined): number => (v ? parseFloat(v) * (v.endsWith('in') ? 72 : v.endsWith('cm') ? 72 / 2.54 : v.endsWith('mm') ? 72 / 25.4 : 1) : 0);

/** A marca-d'água descrita num XML de objeto (w:pict), ou null. `color` resolve a cor VML. */
export function readWatermarkXml(xml: string, color: (vml: string | undefined) => string | undefined): WatermarkInfo | null {
  const shape = /<v:shape\b[^>]*\bid="(PowerPlusWaterMarkObject|WordPictureWatermark)\d*"[^>]*>[\s\S]*?<\/v:shape>/.exec(xml);
  if (!shape) return null;
  const tag = /<v:shape\b[^>]*>/.exec(shape[0])![0];
  const style = attr(tag, 'style') ?? '';
  const widthPt = ptOf(styleProp(style, 'width')), heightPt = ptOf(styleProp(style, 'height'));
  if (shape[1] === 'WordPictureWatermark') {
    const img = /<v:imagedata\b[^>]*>/.exec(shape[0])?.[0] ?? '';
    return { kind: 'picture', rid: attr(img, 'r:id') ?? '', title: attr(img, 'o:title') ?? '', washout: /\bgain=/.test(img) || /\bblacklevel=/.test(img), widthPt, heightPt };
  }
  const tp = /<v:textpath\b[^>]*>/.exec(shape[0])?.[0] ?? '';
  const tps = attr(tp, 'style') ?? '';
  const font = (styleProp(tps, 'font-family') ?? 'Calibri').replace(/^["']|["']$/g, '');
  const fs = parseFloat(styleProp(tps, 'font-size') ?? '1');
  const fill = /<v:fill\b[^>]*>/.exec(shape[0])?.[0] ?? '';
  const op = attr(fill, 'opacity');
  const rot = parseFloat(styleProp(style, 'rotation') ?? '0');
  return {
    kind: 'text', text: attr(tp, 'string') ?? '', font,
    ...(fs > 1 ? { sizePt: fs } : {}),
    color: color(attr(tag, 'fillcolor')) ?? 'C0C0C0',
    semitransparent: !!op && (op.endsWith('f') ? parseInt(op, 10) / 65536 : parseFloat(op)) < 1,
    layout: rot && Math.round(((rot % 180) + 180) % 180) !== 0 ? 'diagonal' : 'horizontal',
    widthPt, heightPt,
  };
}

// ───────────────────────── tamanho ─────────────────────────

/** Diagonal: (largura + altura)·cos 45° = este fator × a largura da área útil (blocos do Word: 466,55/468). */
const DIAG_FIT = 466.55 / 468;

/**
 * Caixa da marca de texto AUTOMÁTICA numa área útil de `contentWidthPt`: proporção =
 * caracteres sem espaço / 3 (a regra que os 12 blocos do Word seguem); horizontal
 * ocupa a largura; diagonal tem a caixa girada na largura (inferido dos blocos:
 * o diálogo não sai por COM).
 */
export function autoTextBox(text: string, layout: WatermarkLayout, contentWidthPt: number): { widthPt: number; heightPt: number } {
  const n = Math.max(1, text.replace(/\s+/g, '').length);
  const aspect = n / 3;
  if (layout === 'horizontal') return { widthPt: round2(contentWidthPt), heightPt: round2(contentWidthPt / aspect) };
  const h = (DIAG_FIT * contentWidthPt * Math.SQRT2) / (aspect + 1);
  return { widthPt: round2(aspect * h), heightPt: round2(h) };
}

/**
 * Caixa da marca de texto com tamanho EXPLÍCITO (corpus: largura = avanço do texto e
 * altura = tamanho·(winAscent+winDescent)/upm, em pt inteiros). `advancePt` = largura
 * do texto no tamanho; `lineFactor` = (winAscent+winDescent)/upm da fonte.
 */
export function explicitTextBox(advancePt: number, sizePt: number, lineFactor: number): { widthPt: number; heightPt: number } {
  return { widthPt: Math.max(1, Math.round(advancePt)), heightPt: Math.max(1, Math.round(sizePt * lineFactor)) };
}

/** Caixa da marca de imagem: Automático = largura da área útil; senão tamanho natural × escala. */
export function pictureBox(naturalPt: { w: number; h: number }, scale: number | undefined, contentWidthPt: number): { widthPt: number; heightPt: number } {
  if (naturalPt.w <= 0 || naturalPt.h <= 0) return { widthPt: contentWidthPt, heightPt: contentWidthPt };
  if (!scale) return { widthPt: round2(contentWidthPt), heightPt: round2((contentWidthPt * naturalPt.h) / naturalPt.w) };
  return { widthPt: round2((naturalPt.w * scale) / 100), heightPt: round2((naturalPt.h * scale) / 100) };
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

// ───────────────────────── galeria ─────────────────────────

export interface WatermarkGalleryItem {
  id: string;
  category: 'confidential' | 'disclaimers' | 'urgent';
  text: { pt: string; en: string; es: string };
  layout: WatermarkLayout;
  /** caixa em pt (a dos blocos do Word pt-BR; inglês e espanhol pela mesma proporção) */
  box: { pt: [number, number]; en: [number, number]; es: [number, number] };
}

const D = (aspectBox: [number, number]): [number, number] => aspectBox;
/**
 * Os 12 itens da galeria Marca-d'Água (blocos do tipo 8 do Word pt-BR, page-oracle wm-bb-*):
 * fonte "calibri", tamanho automático, prateado, semitransparente. Os tamanhos fixos
 * (de papel Carta) não acompanham o papel. Inglês: o texto do Word en-US e a caixa
 * da mesma proporção (caracteres sem espaço / 3 — ASAP, CONFIDENTIAL, DO NOT COPY,
 * DRAFT, URGENT têm a mesma proporção dos blocos pt-BR; SAMPLE = a de URGENT).
 */
const GALLERY_PT_EN: readonly (Omit<WatermarkGalleryItem, 'text' | 'box'> & { text: { pt: string; en: string }; box: { pt: [number, number]; en: [number, number] } })[] = [
  { id: 'confidential1', category: 'confidential', text: { pt: 'CONFIDENCIAL', en: 'CONFIDENTIAL' }, layout: 'diagonal', box: { pt: [527.85, 131.95], en: D([527.85, 131.95]) } },
  { id: 'confidential2', category: 'confidential', text: { pt: 'CONFIDENCIAL', en: 'CONFIDENTIAL' }, layout: 'horizontal', box: { pt: [468, 117], en: [468, 117] } },
  { id: 'donotcopy1', category: 'confidential', text: { pt: 'NÃO COPIAR', en: 'DO NOT COPY' }, layout: 'diagonal', box: { pt: [494.9, 164.95], en: [494.9, 164.95] } },
  { id: 'donotcopy2', category: 'confidential', text: { pt: 'NÃO COPIAR', en: 'DO NOT COPY' }, layout: 'horizontal', box: { pt: [467.95, 155.95], en: [467.95, 155.95] } },
  { id: 'draft1', category: 'disclaimers', text: { pt: 'RASCUNHO', en: 'DRAFT' }, layout: 'diagonal', box: { pt: [412.4, 247.45], en: [412.4, 247.45] } },
  { id: 'draft2', category: 'disclaimers', text: { pt: 'RASCUNHO', en: 'DRAFT' }, layout: 'horizontal', box: { pt: [468, 280.8], en: [468, 280.8] } },
  { id: 'sample1', category: 'disclaimers', text: { pt: 'EXEMPLO', en: 'SAMPLE' }, layout: 'diagonal', box: { pt: [461.85, 197.95], en: [439.9, 219.95] } },
  { id: 'sample2', category: 'disclaimers', text: { pt: 'EXEMPLO', en: 'SAMPLE' }, layout: 'horizontal', box: { pt: [467.95, 200.55], en: [468, 234] } },
  { id: 'asap1', category: 'urgent', text: { pt: 'ASAP', en: 'ASAP' }, layout: 'diagonal', box: { pt: [377.05, 282.8], en: [377.05, 282.8] } },
  { id: 'asap2', category: 'urgent', text: { pt: 'ASAP', en: 'ASAP' }, layout: 'horizontal', box: { pt: [468, 351], en: [468, 351] } },
  { id: 'urgent1', category: 'urgent', text: { pt: 'URGENTE', en: 'URGENT' }, layout: 'diagonal', box: { pt: [439.9, 219.95], en: [439.9, 219.95] } },
  { id: 'urgent2', category: 'urgent', text: { pt: 'URGENTE', en: 'URGENT' }, layout: 'horizontal', box: { pt: [468, 234], en: [468, 234] } },
];

/** Textos do Word em espanhol (sem oráculo es: escritos à mão). */
const TEXT_ES: Record<string, string> = {
  confidential: 'CONFIDENCIAL', donotcopy: 'NO COPIAR', draft: 'BORRADOR', sample: 'MUESTRA', asap: 'ASAP', urgent: 'URGENTE',
};
const letters = (t: string): number => t.replace(/\s/g, '').length;

/**
 * Os 12 itens com o espanhol. Caixa do espanhol pela mesma regra do inglês: a
 * do próprio bloco pt-BR quando o texto tem tantas letras quanto o espanhol;
 * senão a do bloco de mesmo layout com esse número de letras (NO COPIAR =
 * RASCUNHO); sem nenhum, a do próprio item.
 */
export const WATERMARK_GALLERY: readonly WatermarkGalleryItem[] = GALLERY_PT_EN.map((g) => {
  const es = TEXT_ES[g.id.replace(/\d+$/, '')] ?? g.text.en;
  const same = letters(g.text.pt) === letters(es) ? g : GALLERY_PT_EN.find((o) => o.layout === g.layout && letters(o.text.pt) === letters(es));
  return { ...g, text: { ...g.text, es }, box: { ...g.box, es: same ? same.box.pt : g.box.pt } };
});

/** Textos da lista do diálogo, por idioma da interface. */
export const WATERMARK_TEXTS: Readonly<Record<'en' | 'pt' | 'es', readonly string[]>> = {
  en: ['ASAP', 'CONFIDENTIAL', 'COPY', 'DO NOT COPY', 'DRAFT', 'ORIGINAL', 'PERSONAL', 'SAMPLE', 'TOP SECRET', 'URGENT'],
  pt: ['ASAP', 'CONFIDENCIAL', 'CÓPIA', 'EXEMPLO', 'NÃO COPIAR', 'ORIGINAL', 'PESSOAL', 'RASCUNHO', 'ULTRASSECRETO', 'URGENTE'],
  es: ['ALTO SECRETO', 'ASAP', 'BORRADOR', 'CONFIDENCIAL', 'COPIA', 'MUESTRA', 'NO COPIAR', 'ORIGINAL', 'PERSONAL', 'URGENTE'],
};
