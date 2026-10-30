// HTML da área de transferência (navegadores, Google Docs, o próprio Word) → parágrafos com
// a formatação de cada trecho, para Colar. As regras de COMO cada opção usa isso (Manter
// Formatação Original, Mesclar, padrão com estilos) ficam no editor; o que o Word grava
// para o mesmo HTML foi medido em write/tools/home-lab (exp-paste.ps1, html-*).
import type { RunProps } from '@universal-office/docx-core';

export interface HtmlRun {
  text: string;
  /** formatação explícita do trecho (CSS em linha e as marcas b/i/u/s/sub/sup/code/font) */
  props: Partial<RunProps>;
  /** negrito/itálico que vêm do bloco (h1–h6, th): ênfase herdada, não do trecho */
  blockBold?: boolean;
  image?: { data: Uint8Array; ext: string; wPx?: number; hPx?: number };
}

export interface HtmlPara {
  runs: HtmlRun[];
  /** h1–h6 (e Título 7–9 do Word: class MsoHeading7…9) */
  heading?: number;
  /** estilo do Word pela classe (MsoTitle, MsoSubtitle) */
  style?: 'title' | 'subtitle';
  /** item de lista: ordenada?, nível (0–8) e a lista de topo a que pertence */
  list?: { ordered: boolean; level: number; key: number };
  align?: 'left' | 'center' | 'right' | 'both';
  /** pre/code em bloco */
  pre?: boolean;
  /** corpo de texto de HTML (p/div/blockquote): estilo Normal (Web) no colar padrão */
  web?: boolean;
}

const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'BLOCKQUOTE', 'TR', 'UL', 'OL', 'TABLE', 'THEAD', 'TBODY',
  'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'DD', 'DT', 'DL', 'FIGURE', 'FIGCAPTION', 'ADDRESS', 'HR', 'CENTER']);
// o que o Word também descarta ao colar: scripts, estilos, mídia e controles de formulário
// (o texto alternativo deles não é conteúdo); tags desconhecidas ficam com o texto
const SKIP = new Set(['SCRIPT', 'STYLE', 'HEAD', 'TITLE', 'META', 'LINK', 'TEMPLATE', 'NOSCRIPT', 'svg', 'SVG',
  'IFRAME', 'OBJECT', 'EMBED', 'VIDEO', 'AUDIO', 'CANVAS', 'SELECT', 'TEXTAREA', 'INPUT', 'BUTTON', 'DATALIST']);

const NAMED: Record<string, string> = {
  black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080',
  silver: 'C0C0C0', maroon: '800000', navy: '000080', purple: '800080', teal: '008080', olive: '808000', orange: 'FFA500', lime: '00FF00',
  aqua: '00FFFF', fuchsia: 'FF00FF',
};

/** Cor CSS → "RRGGBB" (undefined: transparente/inherit/desconhecida). */
export function cssColor(v: string): string | undefined {
  const s = v.trim().toLowerCase();
  if (!s || s === 'inherit' || s === 'initial' || s === 'transparent' || s === 'currentcolor') return undefined;
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return m[1]!.split('').map((c) => c + c).join('').toUpperCase();
  m = /^#([0-9a-f]{6})/.exec(s);
  if (m) return m[1]!.toUpperCase();
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return undefined;
    return [m[1], m[2], m[3]].map((x) => Math.min(255, Number(x)).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return NAMED[s];
}

/** Tamanho CSS → meio-pontos (px = 0,75 pt; palavras-chave do HTML). */
export function cssSizeHalfPt(v: string): number | undefined {
  const s = v.trim().toLowerCase();
  const kw: Record<string, number> = { 'xx-small': 7.5, 'x-small': 7.5, small: 10, medium: 12, large: 13.5, 'x-large': 18, 'xx-large': 24 };
  if (kw[s] !== undefined) return Math.round(kw[s]! * 2);
  const m = /^([\d.]+)(pt|px)$/.exec(s);
  if (!m) return undefined;
  const pt = m[2] === 'pt' ? parseFloat(m[1]!) : parseFloat(m[1]!) * 0.75;
  return pt > 0 && pt < 1640 ? Math.round(pt * 2) : undefined;
}

/** 1ª família de font-family (sem aspas; as genéricas não contam). */
export function cssFamily(v: string): string | undefined {
  for (const f of v.split(',')) {
    const n = f.trim().replace(/^["']|["']$/g, '');
    if (n && !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-\w+|-apple-system|blinkmacsystemfont|inherit|initial)$/i.test(n)) return n;
  }
  return undefined;
}

/** Tamanho do <font size=1..7> → meio-pontos (os do HTML). */
const FONT_SIZES = [0, 15, 20, 24, 27, 36, 48, 72];

/** Formatação de um elemento sobre a herdada: as marcas e o CSS em linha. */
function elementProps(el: Element, base: Partial<RunProps>): Partial<RunProps> {
  const p: Partial<RunProps> = { ...base };
  switch (el.tagName) {
    case 'B': case 'STRONG': p.bold = true; break;
    case 'I': case 'EM': case 'CITE': case 'DFN': case 'VAR': p.italic = true; break;
    case 'U': case 'INS': p.underline = true; break;
    case 'S': case 'STRIKE': case 'DEL': p.strike = true; break;
    case 'SUB': p.vertAlign = 'subscript'; break;
    case 'SUP': p.vertAlign = 'superscript'; break;
    case 'CODE': case 'KBD': case 'SAMP': case 'TT': p.fontAscii = 'Courier New'; break;
    case 'FONT': {
      const face = el.getAttribute('face'); if (face) { const f = cssFamily(face); if (f) p.fontAscii = f; }
      const color = el.getAttribute('color'); if (color) { const c = cssColor(color); if (c) p.color = c; }
      const size = Number(el.getAttribute('size')); if (size >= 1 && size <= 7) p.szHalfPt = FONT_SIZES[size];
      break;
    }
    case 'A': { const href = el.getAttribute('href'); if (href && !href.startsWith('#') && !/^javascript:/i.test(href)) p.link = href; break; }
  }
  const st = (el as HTMLElement).style;
  if (st) {
    const fw = st.fontWeight;
    if (fw) p.bold = fw === 'bold' || fw === 'bolder' || Number(fw) >= 600;
    if (st.fontStyle) p.italic = st.fontStyle === 'italic' || st.fontStyle === 'oblique';
    const td = st.textDecorationLine || st.textDecoration;
    if (td) {
      if (/underline/.test(td)) p.underline = true; else if (/none/.test(td)) p.underline = false;
      if (/line-through/.test(td)) p.strike = true;
    }
    if (st.color) { const c = cssColor(st.color); if (c) p.color = c; }
    if (st.fontFamily) { const f = cssFamily(st.fontFamily); if (f) p.fontAscii = f; }
    if (st.fontSize) { const s = cssSizeHalfPt(st.fontSize); if (s) p.szHalfPt = s; }
    const va = st.verticalAlign;
    if (va === 'super') p.vertAlign = 'superscript'; else if (va === 'sub') p.vertAlign = 'subscript';
    if (st.textTransform === 'uppercase') p.allCaps = true;
    if (st.fontVariant === 'small-caps' || st.fontVariantCaps === 'small-caps') p.smallCaps = true;
  }
  return p;
}

function decodeDataUrl(src: string): { data: Uint8Array; ext: string } | null {
  const m = /^data:image\/(png|jpe?g|gif|bmp|webp);base64,([\s\S]+)$/i.exec(src);
  if (!m) return null;
  try {
    const bin = atob(m[2]!.replace(/\s+/g, ''));
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const ext = m[1]!.toLowerCase().replace('jpeg', 'jpg');
    return { data, ext };
  } catch { return null; }
}

/** O trecho entre <!--StartFragment--> e <!--EndFragment--> (formato CF_HTML), se houver. */
export function fragmentOf(html: string): string {
  const a = html.indexOf('<!--StartFragment-->'), b = html.indexOf('<!--EndFragment-->');
  return a >= 0 && b > a ? html.slice(a + 20, b) : html;
}

/** Listas do HTML do Word (`@list l0:level1 { mso-level-number-format: … }` no <style>):
 *  "0:1" → é marcador? Sem formato declarado o Word usa decimal. */
export function wordListFormats(html: string): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const re = /@list\s+l(\d+):level(\d+)\s*\{([^}]*)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const fmt = /mso-level-number-format:\s*([\w-]+)/i.exec(m[3]!)?.[1]?.toLowerCase();
    out.set(`${m[1]}:${m[2]}`, fmt === 'bullet' || fmt === 'image');
  }
  return out;
}

/** Item de lista do Word (`style="mso-list:l0 level2 lfo1"`): lista, nível (1–9) e instância. */
export function wordListOf(style: string | null): { list: number; level: number; lfo: number } | null {
  const m = /mso-list:\s*l(\d+)\s+level(\d+)\s+lfo(\d+)/i.exec(style ?? '');
  return m ? { list: Number(m[1]), level: Number(m[2]), lfo: Number(m[3]) } : null;
}

/** O marcador do item (o texto do `mso-list:Ignore`) parece um número? "1.", "a)", "(iv)", "IV." */
export function looksOrdered(marker: string): boolean {
  const t = marker.replace(/\s+/g, '');
  return /^\(?\d+[.)]?$/.test(t) || /^\(?[a-z]{1,4}[.)]$/i.test(t);
}

/** Texto do marcador de um item de lista do Word (o trecho entre os comentários
 *  [if !supportLists] e [endif], ou o span mso-list:Ignore). */
function wordMarker(el: Element): string {
  let on = false, text = '';
  const visit = (n: Node): boolean => {
    if (n.nodeType === 8) {
      const v = (n.nodeValue ?? '').trim();
      if (/^\[if !supportLists\]/i.test(v)) on = true;
      else if (/^\[endif\]/i.test(v) && on) return true;
      return false;
    }
    if (n.nodeType === 3) { if (on) text += n.nodeValue ?? ''; return false; }
    if (n.nodeType !== 1) return false;
    const e = n as Element;
    if (/mso-list:\s*ignore/i.test(e.getAttribute('style') ?? '')) { text += e.textContent ?? ''; return true; }
    for (const c of Array.from(e.childNodes)) if (visit(c)) return true;
    return false;
  };
  for (const c of Array.from(el.childNodes)) if (visit(c)) break;
  return text;
}

/** HTML → parágrafos. Imagens só em data: (as de rede não são buscadas). Listas do
 *  Word (mso-list) viram listas de verdade, sem o marcador que ele põe como texto. */
export function htmlToParas(html: string): HtmlPara[] {
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${fragmentOf(html)}</body></html>`, 'text/html');
  const wordLists = wordListFormats(html);
  const out: HtmlPara[] = [];
  let cur: HtmlPara | null = null;
  let listKey = 0;
  const lists: { ordered: boolean; key: number }[] = [];
  const open = (o: Omit<HtmlPara, 'runs'> = {}): HtmlPara => { cur = { runs: [], ...o }; out.push(cur); return cur; };
  const close = (): void => { cur = null; };
  const ensure = (ctx: Ctx): HtmlPara => cur ?? open(ctx.block);
  interface Ctx { props: Partial<RunProps>; pre: boolean; block: Omit<HtmlPara, 'runs'>; blockBold?: boolean }

  const text = (raw: string, ctx: Ctx): void => {
    let t = ctx.pre ? raw.replace(/\r\n?/g, '\n') : raw.replace(/[ \t\r\n\f]+/g, ' ');
    if (!ctx.pre) {
      const p = cur as HtmlPara | null;
      const prev = p?.runs[p.runs.length - 1]?.text ?? '';
      // espaço no começo do parágrafo ou depois de outro espaço não conta
      if (!p || !p.runs.length || /[ \n]$/.test(prev)) t = t.replace(/^ +/, '');
    }
    if (!t) return;
    if (ctx.pre && t.includes('\n')) {
      const parts = t.split('\n');
      parts.forEach((part, i) => {
        if (i > 0) { close(); open(ctx.block); }
        if (part) ensure(ctx).runs.push({ text: part, props: ctx.props, ...(ctx.blockBold ? { blockBold: true } : {}) });
      });
      return;
    }
    ensure(ctx).runs.push({ text: t, props: ctx.props, ...(ctx.blockBold ? { blockBold: true } : {}) });
  };

  /** Filhos em ordem, sem o marcador de lista que o Word grava como texto
   *  (entre <![if !supportLists]> e <![endif]>, que o navegador lê como comentários). */
  const walkChildren = (el: Element, ctx: Ctx): void => {
    let skipping = false;
    for (const c of Array.from(el.childNodes)) {
      if (c.nodeType === 8) {
        const v = (c.nodeValue ?? '').trim();
        if (/^\[if !supportLists\]/i.test(v)) skipping = true;
        else if (/^\[endif\]/i.test(v)) skipping = false;
        continue;
      }
      if (!skipping) walk(c, ctx);
    }
  };

  const walk = (node: Node, ctx: Ctx): void => {
    if (node.nodeType === 3) { text(node.nodeValue ?? '', ctx); return; }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    const tag = el.tagName.toUpperCase();
    if (SKIP.has(tag) || SKIP.has(el.tagName)) return;
    if ((el as HTMLElement).style?.display === 'none') return;
    // marcador de lista do Word (mso-list:Ignore): o número/marcador vem da lista
    if (/mso-list:\s*ignore/i.test(el.getAttribute('style') ?? '')) return;
    if (tag === 'BR') { ensure(ctx).runs.push({ text: '\n', props: ctx.props }); return; }
    if (tag === 'IMG') {
      const img = decodeDataUrl(el.getAttribute('src') ?? '');
      if (img) {
        const w = Number(el.getAttribute('width')) || undefined, h = Number(el.getAttribute('height')) || undefined;
        ensure(ctx).runs.push({ text: '', props: ctx.props, image: { ...img, ...(w ? { wPx: w } : {}), ...(h ? { hPx: h } : {}) } });
      }
      return;
    }
    if (tag === 'HR') { close(); return; }
    let props = elementProps(el, ctx.props);
    if (!BLOCK.has(tag)) {
      walkChildren(el, { ...ctx, props });
      return;
    }
    // ── bloco ──
    if (tag === 'UL' || tag === 'OL') {
      if (!lists.length) listKey++;
      lists.push({ ordered: tag === 'OL', key: listKey });
      close();
      walkChildren(el, { ...ctx, props });
      lists.pop();
      close();
      return;
    }
    const st = (el as HTMLElement).style;
    const ta = st?.textAlign || el.getAttribute('align') || (tag === 'CENTER' ? 'center' : '');
    const align = ta === 'center' ? 'center' : ta === 'right' || ta === 'end' ? 'right' : ta === 'justify' ? 'both' : ta === 'left' || ta === 'start' ? 'left' : ctx.block.align;
    const block: Omit<HtmlPara, 'runs'> = { ...(align ? { align } : {}) };
    const h = /^H([1-6])$/.exec(tag);
    let blockBold = ctx.blockBold;
    if (h) { block.heading = Number(h[1]); blockBold = true; }
    // estilos do Word pela classe: Título 7–9, Título (Title), Subtítulo
    const cls = el.getAttribute('class') ?? '';
    const mh = /(?:^|\s)MsoHeading([1-9])(?:\s|$)/.exec(cls);
    if (!h && mh) { block.heading = Number(mh[1]); blockBold = true; }
    if (/(?:^|\s)MsoTitle(?:\s|$)/.test(cls)) block.style = 'title';
    else if (/(?:^|\s)MsoSubtitle(?:\s|$)/.test(cls)) block.style = 'subtitle';
    // item de lista do Word (parágrafo com mso-list): marcador ou numerada pela
    // definição @list do <style>, senão pelo próprio marcador; título numerado fica título
    const wl = !block.heading ? wordListOf(el.getAttribute('style')) : null;
    if (wl) {
      const bullet = wordLists.get(`${wl.list}:${wl.level}`) ?? !looksOrdered(wordMarker(el));
      block.list = { ordered: !bullet, level: Math.max(0, Math.min(8, wl.level - 1)), key: 100000 + wl.lfo };
    }
    if (tag === 'PRE') { block.pre = true; props = { ...props, fontAscii: props.fontAscii ?? 'Courier New' }; }
    if (tag === 'LI') {
      const l = lists[lists.length - 1];
      if (l) block.list = { ordered: l.ordered, level: Math.min(8, lists.length - 1), key: l.key };
    }
    if (tag === 'P' || tag === 'DIV' || tag === 'BLOCKQUOTE' || tag === 'ADDRESS' || tag === 'DD' || tag === 'DT' || tag === 'FIGCAPTION') block.web = true;
    if (tag === 'TR') {
      // linha de tabela no meio do texto: as células numa linha, separadas por tabulação
      close();
      const p = open({ ...block });
      let first = true;
      for (const cell of Array.from(el.children)) {
        if (!first) p.runs.push({ text: '\t', props });
        first = false;
        const inner: Ctx = { props: elementProps(cell, props), pre: false, block: {}, ...(cell.tagName.toUpperCase() === 'TH' ? { blockBold: true } : {}) };
        cur = p;
        walkChildren(cell, inner);
        cur = p;
      }
      close();
      return;
    }
    close();
    const inner: Ctx = { props, pre: ctx.pre || !!block.pre, block: { ...block }, ...(blockBold ? { blockBold } : {}) };
    // item de lista: o parágrafo nasce já (mesmo vazio)
    if (block.list) open(inner.block);
    walkChildren(el, inner);
    close();
  };
  walk(doc.body, { props: {}, pre: false, block: {} });
  // sem texto nem imagem: fora
  return out.filter((p) => p.list || p.runs.some((r) => r.image || r.text.replace(/\s+/g, '')));
}
