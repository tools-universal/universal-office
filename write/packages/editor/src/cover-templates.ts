/**
 * Folha de Rosto: modelos PRÓPRIOS do <universal-write>, desenhados aqui (os blocos de
 * construção do Word são dele e não entram no repositório). Como os do Word (oráculo
 * write/tools/page-lab, corpus-cover.mjs): um w:sdt de bloco com
 * `docPartGallery="Cover Pages"` + `docPartUnique`, no INÍCIO do corpo, cujo último
 * parágrafo leva a quebra de página; as formas são do tema (accent1/accent2), atrás do
 * texto e relativas à página; os campos são TEXTO comum (decisão do usuário: sem
 * dataBinding), preenchidos com as propriedades do documento quando existem.
 */

export interface CoverFields {
  title: string;
  subtitle: string;
  author: string;
  date: string;
  company: string;
  summary: string;
}

export interface CoverEnv {
  lang: 'en' | 'pt';
  /** página e margens da 1ª seção, em pt */
  page: { w: number; h: number; top: number; bottom: number; left: number; right: number };
  /** cores do tema (RRGGBB) para o w:color ao lado do themeColor */
  accent1: string;
  accent2: string;
  /** campos (já com os textos de espaço reservado onde faltam) */
  fields: CoverFields;
  /** id de desenho único (wp:docPr) e do sdt */
  drawingId: () => number;
}

export interface CoverTemplate {
  id: string;
  name: { en: string; pt: string };
}

export const COVER_TEMPLATES: readonly CoverTemplate[] = [
  { id: 'band', name: { en: 'Band', pt: 'Faixa' } },
  { id: 'sidebar', name: { en: 'Sidebar', pt: 'Lateral' } },
  { id: 'frame', name: { en: 'Frame', pt: 'Moldura' } },
  { id: 'block', name: { en: 'Block', pt: 'Bloco' } },
  { id: 'minimal', name: { en: 'Minimal', pt: 'Minimalista' } },
  { id: 'base', name: { en: 'Base', pt: 'Base' } },
  { id: 'duotone', name: { en: 'Duotone', pt: 'Duas Cores' } },
  { id: 'diagonal', name: { en: 'Diagonal', pt: 'Diagonal' } },
];

/** Textos de espaço reservado (o usuário digita por cima). */
export function coverPlaceholders(lang: 'en' | 'pt'): CoverFields {
  return lang === 'pt'
    ? { title: '[Título do documento]', subtitle: '[Subtítulo do documento]', author: '[Nome do autor]', date: '[Data]', company: '[Nome da empresa]', summary: '[Resumo do documento: um parágrafo curto sobre o conteúdo.]' }
    : { title: '[Document title]', subtitle: '[Document subtitle]', author: '[Author name]', date: '[Date]', company: '[Company name]', summary: '[Document summary: a short paragraph about the contents.]' };
}

/** Namespaces que o fragmento usa (declarados no w:document do leitor). */
export const COVER_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
  + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
  + 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
  + 'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
  + 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
  + 'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"';

const EMU = 12700;
/** ordem z das formas na ordem em que o modelo as declara (relativeHeight crescente) */
let zOrder = 0;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tw = (pt: number): number => Math.max(0, Math.round(pt * 20));

/** Cor do texto: branco, tema (com o hex) ou cinza. */
type Ink = 'white' | 'accent1' | 'accent2' | 'dark' | 'grey';
function inkXml(ink: Ink, env: CoverEnv): string {
  switch (ink) {
    case 'white': return '<w:color w:val="FFFFFF" w:themeColor="background1"/>';
    case 'accent1': return `<w:color w:val="${env.accent1}" w:themeColor="accent1"/>`;
    case 'accent2': return `<w:color w:val="${env.accent2}" w:themeColor="accent2"/>`;
    case 'grey': return '<w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/>';
    default: return '<w:color w:val="262626" w:themeColor="text1" w:themeTint="D9"/>';
  }
}

/** Parágrafo de texto com espaço antes, alinhamento, recuo esquerdo e um run formatado. */
function para(text: string, o: { size: number; ink: Ink; before?: number; jc?: 'left' | 'center' | 'right'; indLeft?: number; bold?: boolean; major?: boolean; caps?: boolean }, env: CoverEnv): string {
  const ppr = `<w:pPr><w:spacing w:before="${tw(o.before ?? 0)}" w:after="0" w:line="240" w:lineRule="auto"/>`
    + (o.indLeft ? `<w:ind w:left="${tw(o.indLeft)}"/>` : '')
    + (o.jc && o.jc !== 'left' ? `<w:jc w:val="${o.jc}"/>` : '') + '</w:pPr>';
  const rpr = '<w:rPr>' + (o.major ? '<w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>' : '')
    + (o.bold ? '<w:b/><w:bCs/>' : '') + (o.caps ? '<w:caps/>' : '') + inkXml(o.ink, env)
    + `<w:sz w:val="${Math.round(o.size * 2)}"/><w:szCs w:val="${Math.round(o.size * 2)}"/></w:rPr>`;
  return `<w:p>${ppr}<w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

/** Forma (retângulo/triângulo/linha) atrás do texto, relativa à página (pt). */
function shape(env: CoverEnv, o: { x: number; y: number; w: number; h: number; geom?: string; fill?: 'accent1' | 'accent2' | 'none'; tint?: number; line?: { color: 'accent1' | 'accent2'; widthPt: number }; flipH?: boolean }): string {
  const id = env.drawingId();
  const fill = !o.fill || o.fill === 'none' ? '<a:noFill/>'
    : `<a:solidFill><a:schemeClr val="${o.fill}">${o.tint ? `<a:lumMod val="${Math.round((1 - o.tint) * 100000)}"/><a:lumOff val="${Math.round(o.tint * 100000)}"/>` : ''}</a:schemeClr></a:solidFill>`;
  const ln = o.line ? `<a:ln w="${Math.round(o.line.widthPt * EMU)}"><a:solidFill><a:schemeClr val="${o.line.color}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>';
  const cx = Math.round(o.w * EMU), cy = Math.round(o.h * EMU);
  return `<w:r><w:rPr><w:noProof/></w:rPr><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>`
    + `<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251650000 + 1024 * ++zOrder}" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">`
    + `<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${Math.round(o.x * EMU)}</wp:posOffset></wp:positionH>`
    + `<wp:positionV relativeFrom="page"><wp:posOffset>${Math.round(o.y * EMU)}</wp:posOffset></wp:positionV>`
    + `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>`
    + `<wp:docPr id="${id}" name="${env.lang === 'pt' ? 'Retângulo' : 'Rectangle'} ${id % 1000}"/><wp:cNvGraphicFramePr/>`
    + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
    + `<wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm${o.flipH ? ' flipH="1"' : ''}><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`
    + `<a:prstGeom prst="${o.geom ?? 'rect'}"><a:avLst/></a:prstGeom>${fill}${ln}</wps:spPr>`
    + '<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="ctr" anchorCtr="0" upright="1"><a:noAutofit/></wps:bodyPr>'
    + '</wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>';
}

/** Caixa de texto (sem preenchimento e sem linha) relativa à página, com parágrafos. */
function textBox(env: CoverEnv, o: { x: number; y: number; w: number; h: number; anchor?: 't' | 'ctr' | 'b' }, paras: string): string {
  const id = env.drawingId();
  const cx = Math.round(o.w * EMU), cy = Math.round(o.h * EMU);
  return `<w:r><w:rPr><w:noProof/></w:rPr><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>`
    + `<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251680000 + 1024 * ++zOrder}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">`
    + `<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${Math.round(o.x * EMU)}</wp:posOffset></wp:positionH>`
    + `<wp:positionV relativeFrom="page"><wp:posOffset>${Math.round(o.y * EMU)}</wp:posOffset></wp:positionV>`
    + `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>`
    + `<wp:docPr id="${id}" name="${env.lang === 'pt' ? 'Caixa de Texto' : 'Text Box'} ${id % 1000}"/><wp:cNvGraphicFramePr/>`
    + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
    + `<wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>'
    + `<wps:txbx><w:txbxContent>${paras}</w:txbxContent></wps:txbx>`
    + `<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${o.anchor ?? 't'}" anchorCtr="0" upright="1"><a:noAutofit/></wps:bodyPr>`
    + '</wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>';
}

/** Bloco de rodapé da capa: autor, data e empresa numa caixa ancorada na página. */
function infoBox(env: CoverEnv, x: number, y: number, w: number, ink: Ink, jc: 'left' | 'center' | 'right' = 'left'): string {
  const f = env.fields;
  const lines = para(f.author, { size: 12, ink, jc, bold: true }, env) + para(f.date, { size: 11, ink, jc, before: 4 }, env) + para(f.company, { size: 11, ink, jc, before: 4 }, env);
  return textBox(env, { x, y, w, h: 66, anchor: 'b' }, lines);
}

/**
 * XML da folha de rosto `id` (filhos de w:body): o w:sdt "Cover Pages" com as formas
 * (no 1º parágrafo), o título, o subtítulo, o resumo e o bloco do autor; o último
 * parágrafo leva a quebra de página (como os blocos do Word).
 */
export function coverXml(id: string, env: CoverEnv): string | null {
  const { page: P, fields: f } = env;
  const cw = P.w - P.left - P.right;
  const sdtId = env.drawingId();
  zOrder = 0;
  const open = `<w:sdt><w:sdtPr><w:id w:val="${sdtId}"/><w:docPartObj><w:docPartGallery w:val="Cover Pages"/><w:docPartUnique/></w:docPartObj></w:sdtPr><w:sdtContent>`;
  const close = '<w:p><w:r><w:br w:type="page"/></w:r></w:p></w:sdtContent></w:sdt>';
  const anchorPara = (runs: string): string => `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${runs}</w:p>`;
  // o 1º parágrafo (com as formas) tem altura de uma linha; o título começa em `y` (pt da página)
  const at = (y: number): number => Math.max(0, y - P.top - 14);
  const bottomY = P.h - P.bottom - 66;
  let body = '';
  switch (id) {
    case 'band': {
      const by = P.h * 0.3;
      body = anchorPara(shape(env, { x: 0, y: by, w: P.w, h: 160, fill: 'accent1' }) + infoBox(env, P.left, bottomY, cw, 'dark'))
        + para(f.title, { size: 40, ink: 'white', before: at(by + 30), major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'white', before: 10 }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 70 }, env);
      break;
    }
    case 'sidebar': {
      const side = 110;
      const ind = Math.max(0, side + 30 - P.left);
      body = anchorPara(shape(env, { x: 0, y: 0, w: side, h: P.h, fill: 'accent1' }) + infoBox(env, P.left + ind, bottomY, cw - ind, 'dark'))
        + para(f.title, { size: 44, ink: 'accent1', before: at(P.h * 0.32), indLeft: ind, major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'dark', before: 12, indLeft: ind }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 30, indLeft: ind }, env);
      break;
    }
    case 'frame': {
      body = anchorPara(shape(env, { x: 30, y: 30, w: P.w - 60, h: P.h - 60, fill: 'none', line: { color: 'accent1', widthPt: 3 } })
        + shape(env, { x: P.w / 2 - 40, y: P.h * 0.38 + 66, w: 80, h: 3, fill: 'accent2' }) + infoBox(env, P.left, bottomY, cw, 'dark', 'center'))
        + para(f.title, { size: 40, ink: 'accent1', before: at(P.h * 0.38 - 10), jc: 'center', major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'dark', before: 30, jc: 'center' }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 24, jc: 'center' }, env);
      break;
    }
    case 'block': {
      const by = P.h * 0.28;
      body = anchorPara(shape(env, { x: P.left, y: by, w: cw, h: 200, fill: 'accent1' }) + infoBox(env, P.left, bottomY, cw, 'grey', 'center'))
        + para(f.title, { size: 40, ink: 'white', before: at(by + 50), jc: 'center', major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'white', before: 12, jc: 'center' }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 100, jc: 'center' }, env);
      break;
    }
    case 'minimal': {
      const ty = P.h * 0.36;
      body = anchorPara(shape(env, { x: P.left, y: ty - 18, w: 60, h: 4, fill: 'accent1' }) + infoBox(env, P.left, bottomY, cw, 'grey'))
        + para(f.title, { size: 36, ink: 'dark', before: at(ty), major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'grey', before: 10 }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 30 }, env);
      break;
    }
    case 'base': {
      const by = P.h * 0.7;
      body = anchorPara(shape(env, { x: 0, y: by, w: P.w, h: P.h - by, fill: 'accent1' }) + infoBox(env, P.left, bottomY, cw, 'white'))
        + para(f.title, { size: 42, ink: 'accent1', before: at(P.h * 0.3), major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'dark', before: 12 }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 30 }, env);
      break;
    }
    case 'duotone': {
      const top = P.h * 0.45;
      body = anchorPara(shape(env, { x: 0, y: 0, w: P.w, h: top, fill: 'accent1' }) + shape(env, { x: 0, y: top, w: P.w, h: 8, fill: 'accent2' })
        + infoBox(env, P.left, bottomY, cw, 'dark'))
        + para(f.title, { size: 40, ink: 'white', before: at(top - 120), major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'white', before: 10 }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 70 }, env);
      break;
    }
    case 'diagonal': {
      body = anchorPara(shape(env, { x: 0, y: P.h * 0.55, w: P.w * 0.8, h: P.h * 0.45, geom: 'rtTriangle', fill: 'accent1' })
        + shape(env, { x: 0, y: P.h * 0.72, w: P.w * 0.5, h: P.h * 0.28, geom: 'rtTriangle', fill: 'accent2' })
        + infoBox(env, P.w * 0.45, bottomY, P.w * 0.55 - P.right, 'dark', 'right'))
        + para(f.title, { size: 42, ink: 'accent1', before: at(P.h * 0.22), major: true }, env)
        + para(f.subtitle, { size: 16, ink: 'dark', before: 12 }, env)
        + para(f.summary, { size: 11, ink: 'grey', before: 30 }, env);
      break;
    }
    default: return null;
  }
  return open + body + close;
}
