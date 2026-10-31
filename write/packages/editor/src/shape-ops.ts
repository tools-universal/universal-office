// Formato da Forma / caixa de texto — o que é dado (sem estado do editor): reconhecer o
// estilo aplicado da galeria Estilos de Forma, os modelos PRÓPRIOS da galeria Caixa de
// Texto (os blocos de construção do Word são dele e não entram no repositório) e as
// variações de degradê do Preenchimento da Forma.
import type { UiLang } from '@universal-office/ui';
import type { DmlColor, ShapeFill } from '@universal-office/docx-core';
import { SHAPE_STYLE_PRESETS } from '@universal-office/drawingml';

/** É um preenchimento completo (e não só uma cor)? */
export function isShapeFill(x: DmlColor | ShapeFill): x is ShapeFill {
  return ['none', 'style', 'solid', 'gradient', 'pattern', 'picture', 'raw'].includes((x as { kind: string }).kind);
}

const squash = (s: string): string => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

/** Estilo da galeria (1..77) que o XML da forma tem — o wps:style e o preenchimento/
 *  contorno do spPr iguais aos do estilo — ou 0. */
export function shapeStyleIndex(raw: string): number {
  const style = /<wps:style>[\s\S]*?<\/wps:style>/.exec(raw)?.[0];
  if (!style) return 0;
  const st = squash(style);
  const sp = /<wps:spPr\b[^>]*>([\s\S]*?)<\/wps:spPr>/.exec(raw)?.[1] ?? '';
  const fillLn = squash(sp.replace(/^[\s\S]*?(<\/a:prstGeom>|<\/a:custGeom>|<a:prstGeom\b[^>]*\/>)/, '')).replace(/<a:effectLst[\s\S]*$|<a:scene3d[\s\S]*$|<a:sp3d[\s\S]*$|<a:extLst[\s\S]*$/, '');
  for (let i = 0; i < SHAPE_STYLE_PRESETS.length; i++) {
    const [p, s] = SHAPE_STYLE_PRESETS[i]!;
    if (s === st && p === fillLn) return i + 1;
  }
  return 0;
}

// ───────────────────────── galeria Caixa de Texto (modelos próprios) ─────────────────────────

export interface TextboxTemplate {
  id: string;
  name: { en: string; pt: string; es: string };
}

const T = (en: string, pt: string, es: string) => ({ en, pt, es });

/** Modelos da galeria Inserir › Caixa de Texto (ordem da galeria). */
export const TEXTBOX_TEMPLATES: readonly TextboxTemplate[] = [
  { id: 'simple', name: T('Simple text box', 'Caixa de texto simples', 'Cuadro de texto simple') },
  { id: 'quote', name: T('Accent quote', 'Citação em destaque', 'Cita destacada') },
  { id: 'sidebarRight', name: T('Sidebar, right', 'Barra lateral à direita', 'Barra lateral a la derecha') },
  { id: 'sidebarLeft', name: T('Sidebar, left', 'Barra lateral à esquerda', 'Barra lateral a la izquierda') },
  { id: 'band', name: T('Title band', 'Faixa com título', 'Banda con título') },
  { id: 'note', name: T('Note', 'Nota', 'Nota') },
];

/** Uma caixa de modelo: o que vai no XML (EMU, referências da posição/tamanho) e os
 *  parágrafos do conteúdo (w:p). */
export interface TextboxTemplateSpec {
  cx: number;
  cy: number;
  posH: { relativeFrom: string; align?: string; offset?: number };
  posV: { relativeFrom: string; align?: string; offset?: number };
  sizeRelH?: { relativeFrom: string; pct: number };
  sizeRelV?: { relativeFrom: string; pct: number };
  wrap: 'none' | 'square' | 'topAndBottom';
  fill: ShapeFill;
  line: { w: number; fill: DmlColor } | null;
  /** margens internas (EMU) e autoajuste */
  body: { lIns: number; tIns: number; rIns: number; bIns: number; autofit: 'none' | 'shape'; anchor?: 't' | 'ctr' | 'b' };
  content: string;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (text: string, rPr = ''): string => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const para = (body: string, pPr = '', rPr = ''): string => `<w:p><w:pPr>${pPr}${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}</w:pPr>${body}</w:p>`;
const sz = (half: number): string => `<w:sz w:val="${half}"/><w:szCs w:val="${half}"/>`;
const accent = (k = 1): DmlColor => ({ kind: 'schemeClr', val: `accent${k}` });
const WHITE = '<w:color w:val="FFFFFF" w:themeColor="background1"/>';
const ACCENT = (hex: string) => `<w:color w:val="${hex}" w:themeColor="accent1"/>`;
const IN = 12700; // EMU por ponto

/** Textos de exemplo (espaços reservados entre colchetes, como nos modelos dos cabeçalhos). */
function texts(lang: UiLang) {
  if (lang === 'es') {
    return {
      body: '[Usa este espacio para destacar un punto clave del documento. Para mover el cuadro de texto, arrastra su borde.]',
      quote: '[“Capta la atención del lector con una cita destacada del documento.”]',
      source: '[Cita la fuente aquí.]',
      title: '[Título de la barra lateral]',
      side: '[La barra lateral es un buen lugar para información complementaria: una lista de puntos, un resumen o una sugerencia. Se queda junto al margen y acompaña a la página.]',
      note: '[Nota]',
    };
  }
  return lang === 'pt'
    ? {
      body: '[Use este espaço para destacar um ponto-chave do documento. Para mover a caixa de texto, arraste a borda dela.]',
      quote: '[“Chame a atenção do leitor com uma citação marcante do documento.”]',
      source: '[Cite a fonte aqui.]',
      title: '[Título da barra lateral]',
      side: '[A barra lateral é um bom lugar para informações complementares: uma lista de pontos, um resumo ou uma dica. Ela fica junto à margem e acompanha a página.]',
      note: '[Nota]',
    }
    : {
      body: '[Use this space to highlight a key point from your document. To move this text box, drag its border.]',
      quote: '[“Grab your reader’s attention with a great quote from the document.”]',
      source: '[Cite your source here.]',
      title: '[Sidebar title]',
      side: '[A sidebar is a good place for supporting information: a list of points, a summary or a tip. It sits by the margin and stays with the page.]',
      note: '[Note]',
    };
}

/** A caixa do modelo `id` (cor de destaque 1 do tema em hex, idioma dos textos). */
export function textboxTemplateSpec(id: string, env: { accent: string; lang: UiLang }): TextboxTemplateSpec | null {
  const t = texts(env.lang);
  const pad = 0.1 * 914400; // 0,1"
  switch (id) {
    case 'simple':
      return {
        cx: Math.round(2.5 * 914400), cy: Math.round(1 * 914400),
        posH: { relativeFrom: 'margin', align: 'center' }, posV: { relativeFrom: 'paragraph', offset: 0 },
        wrap: 'square', fill: { kind: 'solid', color: { kind: 'schemeClr', val: 'lt1' } },
        line: { w: 6350, fill: { kind: 'prstClr', val: 'black' } },
        body: { lIns: 91440, tIns: 45720, rIns: 91440, bIns: 45720, autofit: 'shape' },
        content: para(run(t.body)),
      };
    case 'quote':
      return {
        cx: Math.round(3 * 914400), cy: Math.round(1.2 * 914400),
        sizeRelH: { relativeFrom: 'margin', pct: 55000 },
        posH: { relativeFrom: 'margin', align: 'right' }, posV: { relativeFrom: 'paragraph', offset: 0 },
        wrap: 'square', fill: { kind: 'none' }, line: null,
        body: { lIns: 182880, tIns: 182880, rIns: 182880, bIns: 182880, autofit: 'shape' },
        content: para(run(t.quote, `<w:i/><w:iCs/>${ACCENT(env.accent)}${sz(28)}`), `<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="${env.accent}" w:themeColor="accent1"/></w:pBdr><w:spacing w:after="120"/>`, `<w:i/><w:iCs/>${ACCENT(env.accent)}${sz(28)}`)
          + para(run(t.source, sz(18)), `<w:jc w:val="right"/>`, sz(18)),
      };
    case 'sidebarRight':
    case 'sidebarLeft': {
      const right = id === 'sidebarRight';
      return {
        cx: Math.round(2.2 * 914400), cy: Math.round(9 * 914400),
        sizeRelH: { relativeFrom: 'page', pct: 28000 }, sizeRelV: { relativeFrom: 'page', pct: 100000 },
        posH: { relativeFrom: 'page', align: right ? 'right' : 'left' }, posV: { relativeFrom: 'page', align: 'top' },
        wrap: 'square', fill: { kind: 'solid', color: accent() }, line: null,
        body: { lIns: 228600, tIns: 914400, rIns: 228600, bIns: 457200, autofit: 'none' },
        content: para(run(t.title, `<w:b/><w:bCs/>${WHITE}${sz(32)}`), '<w:spacing w:after="240"/>', `<w:b/><w:bCs/>${WHITE}${sz(32)}`)
          + para(run(t.side, `${WHITE}${sz(22)}`), '', `${WHITE}${sz(22)}`),
      };
    }
    case 'band':
      return {
        cx: Math.round(6 * 914400), cy: Math.round(1.1 * 914400),
        sizeRelH: { relativeFrom: 'margin', pct: 100000 },
        posH: { relativeFrom: 'margin', align: 'center' }, posV: { relativeFrom: 'paragraph', offset: 0 },
        wrap: 'topAndBottom', fill: { kind: 'solid', color: { kind: 'schemeClr', val: 'accent1', mods: [['lumMod', 20000], ['lumOff', 80000]] } },
        line: null,
        body: { lIns: pad * 2, tIns: pad, rIns: pad * 2, bIns: pad, autofit: 'shape' },
        content: para(run(t.title, `<w:b/><w:bCs/>${ACCENT(env.accent)}${sz(26)}`), '<w:spacing w:after="60"/>', `<w:b/><w:bCs/>${ACCENT(env.accent)}${sz(26)}`) + para(run(t.body)),
      };
    case 'note':
      return {
        cx: Math.round(2 * 914400), cy: Math.round(1.4 * 914400),
        posH: { relativeFrom: 'margin', align: 'right' }, posV: { relativeFrom: 'paragraph', offset: 0 },
        wrap: 'square', fill: { kind: 'solid', color: { kind: 'schemeClr', val: 'accent4', mods: [['lumMod', 20000], ['lumOff', 80000]] } },
        line: { w: 12700, fill: { kind: 'schemeClr', val: 'accent4' } },
        body: { lIns: 91440, tIns: 91440, rIns: 91440, bIns: 91440, autofit: 'shape' },
        content: para(run(t.note, `<w:b/><w:bCs/>${sz(20)}`), '<w:spacing w:after="60"/>', `<w:b/><w:bCs/>${sz(20)}`) + para(run(t.body, sz(18)), '', sz(18)),
      };
  }
  return null;
}

/** Variações do degradê (Preenchimento da Forma › Degradê): Claras (da cor para o
 *  branco) e Escuras (da cor para a cor escurecida), em 4 direções cada — as paradas
 *  com a cor dada (a do preenchimento atual, ou Ênfase 1). */
export function gradientVariations(base: DmlColor): { id: string; dark: boolean; fill: ShapeFill }[] {
  const mod = (m: [string, number][]): DmlColor => ({ ...base, mods: [...(base.mods ?? []), ...m] });
  const light = [mod([['tint', 66000], ['satMod', 160000]]), mod([['tint', 44500], ['satMod', 160000]]), mod([['tint', 23500], ['satMod', 160000]])];
  const dark = [mod([['shade', 30000], ['satMod', 115000]]), mod([['shade', 67500], ['satMod', 115000]]), mod([['shade', 100000], ['satMod', 115000]])];
  const dirs: [string, number][] = [['down', 5400000], ['right', 0], ['up', 16200000], ['left', 10800000]];
  const out: { id: string; dark: boolean; fill: ShapeFill }[] = [];
  for (const [isDark, stops] of [[false, light], [true, dark]] as const) {
    for (const [d, ang] of dirs) {
      out.push({
        id: `${isDark ? 'dark' : 'light'}-${d}`, dark: isDark,
        fill: { kind: 'gradient', stops: [{ pos: 0, color: stops[0]! }, { pos: 50000, color: stops[1]! }, { pos: 100000, color: stops[2]! }], lin: { ang, scaled: true }, rotWithShape: true, flip: 'none', tileRect: true },
      });
    }
  }
  return out;
}

void IN;
