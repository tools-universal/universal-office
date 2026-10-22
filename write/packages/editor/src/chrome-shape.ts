// Comandos, menus e grupos de FORMA e CAIXA DE TEXTO das barras do Write: a guia
// contextual "Formato da Forma" (ribbon), o grupo Forma da barra compacta, Inserir ›
// Caixa de Texto (galeria de modelos próprios, Desenhar Caixa de Texto) e o menu de
// contexto da forma. Só DECLARA sobre a API pública do <universal-write>; comando cuja
// API não existe fica oculto (supports).
import { symbol, colorGrid, themePaletteColors, STANDARD_COLORS, tileGrid, type BarContext, type BarGroup, type BarItem, type Command, type CommandRegistry, type GalleryItem, type MenuEntry, type MenuItem } from '@universal-office/ui';
import type { DmlColor, PicWrapKind } from '@universal-office/docx-core';
import { SHAPE_STYLE_PRESETS } from '@universal-office/drawingml';
import type { UniversalWriteElement, ShapeState } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import { dmlFromPick, effectsMenu, shapeThumb } from './chrome-picture.js';
import { CROP_SHAPES, POSITION_PRESETS, LINE_WEIGHTS_PT, LINE_DASHES } from './picture-ops.js';
import { textboxTemplateSpec } from './shape-ops.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });

const WRAPS: [PicWrapKind, string, string, string][] = [
  ['inline', 'In Line with Text', 'Alinhado ao Texto', 'format_align_left'],
  ['square', 'Square', 'Quadrado', 'wrap_text'],
  ['tight', 'Tight', 'Comprimido', 'wrap_text'],
  ['through', 'Through', 'Através', 'wrap_text'],
  ['topAndBottom', 'Top and Bottom', 'Superior e Inferior', 'vertical_align_center'],
  ['behind', 'Behind Text', 'Atrás do Texto', 'flip_to_back'],
  ['front', 'In Front of Text', 'Na Frente do Texto', 'flip_to_front'],
];
const ALIGNS: ['left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', string, string, string][] = [
  ['left', 'Align Left', 'Alinhar à Esquerda', 'align_horizontal_left'], ['center', 'Align Center', 'Centralizar', 'align_horizontal_center'],
  ['right', 'Align Right', 'Alinhar à Direita', 'align_horizontal_right'], ['top', 'Align Top', 'Alinhar Acima', 'align_vertical_top'],
  ['middle', 'Align Middle', 'Alinhar ao Meio', 'align_vertical_center'], ['bottom', 'Align Bottom', 'Alinhar Parte Inferior', 'align_vertical_bottom'],
];
/** Direção do Texto (bodyPr vert) */
const DIRS: [string, string, string, string][] = [
  ['horz', 'Horizontal', 'Horizontal', 'format_textdirection_l_to_r'],
  ['vert', 'Rotate all text 90°', 'Girar todo o texto 90°', 'text_rotation_down'],
  ['vert270', 'Rotate all text 270°', 'Girar todo o texto 270°', 'text_rotate_up'],
];
const ANCHORS: ['t' | 'ctr' | 'b', string, string, string][] = [
  ['t', 'Top', 'Superior', 'vertical_align_top'], ['ctr', 'Middle', 'Meio', 'vertical_align_center'], ['b', 'Bottom', 'Inferior', 'vertical_align_bottom'],
];

/** Abre o seletor de arquivo de imagem e devolve os bytes (Preenchimento › Imagem/Textura). */
function pickImage(cb: (data: Uint8Array, ext: string) => void): void {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.addEventListener('change', () => {
    const f = inp.files?.[0];
    if (!f) return;
    void f.arrayBuffer().then((b) => cb(new Uint8Array(b), (f.name.split('.').pop() || 'png').toLowerCase()));
  });
  inp.click();
}

export function registerShapeCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const shp = (): ShapeState | null => (typeof api['selectedShape'] === 'function' ? ed.selectedShape() : null);
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const on = (): boolean => canEdit() && !!shp();
  const floating = (): boolean => on() && !shp()!.inline;
  const box = (): boolean => on() && !!shp()!.text;
  const s = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => on() && c.isEnabled!() : on });
  const cmds: Command[] = [
    // ── Inserir › Caixa de Texto: desenhar ──
    {
      id: 'textbox:draw', label: L('Draw Text Box', 'Desenhar Caixa de Texto'), icon: 'draw', supports: has('drawTextbox'), isEnabled: canEdit,
      isChecked: () => typeof api['drawingTextbox'] === 'function' && ed.drawingTextbox(), run: () => (ed.drawingTextbox() ? ed.cancelDrawTextbox() : ed.drawTextbox(false)),
    },
    { id: 'textbox:drawVertical', label: L('Draw Vertical Text Box', 'Desenhar Caixa de Texto Vertical'), icon: 'text_rotate_vertical', supports: has('drawTextbox'), isEnabled: canEdit, run: () => ed.drawTextbox(true) },
    // ── Organizar ──
    ...WRAPS.map(([k, en, pt, icon]): Command => s({ id: `shp:wrap:${k}`, label: L(en, pt), icon, supports: has('setShapeWrap'), run: () => ed.setShapeWrap(k), isChecked: () => shp()?.wrap === k })),
    s({ id: 'shp:wrap:moveWithText', label: L('Move with Text', 'Mover com o Texto'), supports: has('setShapeMoveWithText'), isEnabled: floating, run: () => ed.setShapeMoveWithText(true), isChecked: () => !!shp()?.moveWithText }),
    s({ id: 'shp:wrap:fixOnPage', label: L('Fix Position on Page', 'Corrigir Posição na Página'), supports: has('setShapeMoveWithText'), isEnabled: floating, run: () => ed.setShapeMoveWithText(false), isChecked: () => !!shp() && !shp()!.inline && !shp()!.moveWithText }),
    s({ id: 'shp:wrap:more', label: L('More Layout Options…', 'Mais Opções de Layout...'), icon: 'tune', supports: has('setShapeLayout'), run: () => ctl.pictureDialog('layout:wrap') }),
    s({ id: 'shp:pos:inline', label: L('In Line with Text', 'Alinhado ao Texto'), icon: 'format_align_left', supports: has('setShapePosition'), run: () => ed.setShapePosition('inline'), isChecked: () => !!shp()?.inline }),
    ...POSITION_PRESETS.map((q): Command => s({
      id: `shp:pos:${q.id}`, label: q.label, icon: positionIcon(q.v, q.h), supports: has('setShapePosition'), run: () => ed.setShapePosition(q.id),
      isChecked: () => { const f = shp()?.format; return !!f && f.wrap === 'square' && f.posH?.relativeFrom === 'margin' && f.posH.align === q.h && f.posV?.relativeFrom === 'margin' && f.posV.align === q.v; },
    })),
    s({ id: 'shp:pos:more', label: L('More Layout Options…', 'Mais Opções de Layout...'), icon: 'tune', supports: has('setShapeLayout'), run: () => ctl.pictureDialog('layout:position') }),
    s({ id: 'shp:forward', label: L('Bring Forward', 'Avançar'), icon: 'flip_to_front', supports: has('arrangeShape'), isEnabled: floating, run: () => ed.arrangeShape('forward') }),
    s({ id: 'shp:front', label: L('Bring to Front', 'Trazer para a Frente'), icon: 'flip_to_front', supports: has('arrangeShape'), isEnabled: floating, run: () => ed.arrangeShape('front') }),
    s({ id: 'shp:frontOfText', label: L('Bring in Front of Text', 'Trazer para a Frente do Texto'), icon: 'flip_to_front', supports: has('arrangeShape'), isEnabled: floating, run: () => ed.arrangeShape('frontOfText') }),
    s({ id: 'shp:backward', label: L('Send Backward', 'Recuar'), icon: 'flip_to_back', supports: has('arrangeShape'), isEnabled: floating, run: () => ed.arrangeShape('backward') }),
    s({ id: 'shp:back', label: L('Send to Back', 'Enviar para Trás'), icon: 'flip_to_back', supports: has('arrangeShape'), isEnabled: floating, run: () => ed.arrangeShape('back') }),
    s({ id: 'shp:behindText', label: L('Send Behind Text', 'Enviar para Trás do Texto'), icon: 'flip_to_back', supports: has('arrangeShape'), isEnabled: floating, run: () => ed.arrangeShape('behindText') }),
    s({ id: 'shp:rotate:right', label: L('Rotate Right 90°', 'Girar 90° para a Direita'), icon: 'rotate_right', supports: has('rotateShape'), run: () => ed.rotateShape(90) }),
    s({ id: 'shp:rotate:left', label: L('Rotate Left 90°', 'Girar 90° para a Esquerda'), icon: 'rotate_left', supports: has('rotateShape'), run: () => ed.rotateShape(-90) }),
    s({ id: 'shp:flip:v', label: L('Flip Vertical', 'Inverter Verticalmente'), icon: 'flip', supports: has('flipShape'), run: () => ed.flipShape('v') }),
    s({ id: 'shp:flip:h', label: L('Flip Horizontal', 'Inverter Horizontalmente'), icon: 'flip', supports: has('flipShape'), run: () => ed.flipShape('h') }),
    s({ id: 'shp:rotate:more', label: L('More Rotation Options…', 'Mais Opções de Rotação...'), icon: 'tune', supports: has('setShapeLayout'), run: () => ctl.pictureDialog('layout:size') }),
    ...ALIGNS.map(([k, en, pt, icon]): Command => s({ id: `shp:align:${k}`, label: L(en, pt), icon, supports: has('alignShape'), isEnabled: floating, run: () => ed.alignShape(k) })),
    s({ id: 'shp:layout', label: L('Layout Options…', 'Layout...'), icon: 'aspect_ratio', supports: has('setShapeLayout'), run: () => ctl.pictureDialog('layout:size') }),
    // ── Texto ──
    ...DIRS.map(([k, en, pt, icon]): Command => s({ id: `shp:dir:${k}`, label: L(en, pt), icon, supports: has('setTextboxOptions'), isEnabled: box, run: () => ed.setTextboxOptions({ direction: k }), isChecked: () => shp()?.text?.direction === k })),
    ...ANCHORS.map(([k, en, pt, icon]): Command => s({ id: `shp:anchor:${k}`, label: L(en, pt), icon, supports: has('setTextboxOptions'), isEnabled: box, run: () => ed.setTextboxOptions({ anchor: k }), isChecked: () => shp()?.text?.anchor === k })),
    s({ id: 'shp:textOptions', label: L('Text Box Options…', 'Opções da Caixa de Texto...'), icon: 'tune', supports: has('setTextboxOptions'), isEnabled: box, run: () => ctl.pictureDialog('format:layout') }),
    s({
      id: 'shp:link', label: L('Create Link', 'Criar Vínculo'), tip: L('Create Link: the text continues in the next text box you click (it must be empty)', 'Criar Vínculo: o texto continua na próxima caixa de texto que você clicar (ela precisa estar vazia)'),
      icon: 'link', supports: has('createTextboxLink'), isEnabled: () => box() && !shp()!.link?.next,
      isChecked: () => typeof api['linkingTextbox'] === 'function' && ed.linkingTextbox(), run: () => (ed.linkingTextbox() ? ed.cancelTextboxLink() : ed.createTextboxLink()),
    }),
    s({ id: 'shp:unlink', label: L('Break Link', 'Quebrar Vínculo'), icon: 'link_off', supports: has('breakTextboxLink'), isEnabled: () => box() && !!shp()!.link?.next, run: () => ed.breakTextboxLink() }),
    s({ id: 'shp:setDefault', label: L('Set as Default Text Box', 'Definir como Caixa de Texto Padrão'), icon: 'check', supports: has('setAsDefaultTextbox'), isEnabled: box, run: () => ed.setAsDefaultTextbox() }),
    // ── Estilos de Forma ──
    s({ id: 'shp:fill:none', label: L('No Fill', 'Sem Preenchimento'), icon: 'format_color_reset', supports: has('setShapeFill'), isEnabled: () => shp()?.kind !== 'group', run: () => ed.setShapeFill(null), isChecked: () => shp()?.format && 'fill' in shp()!.format ? (shp()!.format as { fill: { kind: string } }).fill.kind === 'none' : false }),
    s({ id: 'shp:outline:none', label: L('No Outline', 'Sem Contorno'), icon: 'border_clear', supports: has('setShapeOutline'), isEnabled: () => shp()?.kind !== 'group', run: () => ed.setShapeOutline({ color: null }), isChecked: () => shp()?.format.line?.fill === null }),
    { id: 'shp:format', label: L('Format Shape…', 'Formatar Forma...'), icon: 'tune', supports: has('setShapeFormat'), isEnabled: on, run: () => ctl.pictureDialog('format:line') },
    s({ id: 'shp:editText', label: L('Edit Text', 'Editar Texto'), icon: 'edit', supports: has('editSelectedTextbox'), isEnabled: () => box() && !shp()!.editingText, run: () => ed.editSelectedTextbox() }),
    s({ id: 'shp:delete', label: L('Delete', 'Excluir'), icon: 'delete', supports: has('deleteSelectedShape'), run: () => ed.deleteSelectedShape() }),
    // ── Acessibilidade ──
    s({ id: 'shp:alt', label: L('Alt Text', 'Texto Alt'), tip: L('Alt Text: describe the shape for people who use screen readers', 'Texto Alt: descreva a forma para quem usa leitor de tela'), icon: 'accessibility_new', supports: has('setShapeAltText'), run: () => ctl.pictureDialog('alt') }),
  ];
  reg.add(...cmds);
}

/** Ícone de posição: página com o bloco no lugar do preset (viewBox 0 -960 960 960). */
function positionIcon(v: 'top' | 'center' | 'bottom', h: 'left' | 'center' | 'right'): string {
  const x = h === 'left' ? 240 : h === 'center' ? 400 : 560, y = v === 'top' ? -760 : v === 'center' ? -560 : -360;
  return `<path d="M160-80v-800h640v800H160Zm60-60h520v-680H220v680Z"/><path d="M${x} ${y}h160v120H${x}z"/>`;
}

export const shapeWrapMenu = (): MenuEntry[] => [...WRAPS.map(([k]) => `shp:wrap:${k}`), '-', 'shp:wrap:moveWithText', 'shp:wrap:fixOnPage', '-', 'shp:wrap:more'];
export const shapePositionMenu = (): MenuEntry[] => ['shp:pos:inline', '-', ...POSITION_PRESETS.map((q) => `shp:pos:${q.id}`), '-', 'shp:pos:more'];
export const shapeRotateMenu = (): MenuEntry[] => ['shp:rotate:right', 'shp:rotate:left', 'shp:flip:v', 'shp:flip:h', '-', 'shp:rotate:more'];
export const shapeAlignMenu = (): MenuEntry[] => [...ALIGNS.slice(0, 3).map(([k]) => `shp:align:${k}`), '-', ...ALIGNS.slice(3).map(([k]) => `shp:align:${k}`), '-', 'pic:align:to:page', 'pic:align:to:margin'];
const dirMenu = (): MenuEntry[] => [...DIRS.map(([k]) => `shp:dir:${k}`), '-', 'shp:textOptions'];
const anchorMenu = (): MenuEntry[] => [...ANCHORS.map(([k]) => `shp:anchor:${k}`), '-', 'shp:textOptions'];

// ───────────────────────── miniaturas ─────────────────────────

/** Cor DrawingML do 1º elemento de cor do XML (schemeClr/srgbClr/prstClr com modificadores). */
function colorIn(xml: string | undefined): DmlColor | null {
  if (!xml) return null;
  const m = /<a:(schemeClr|srgbClr|prstClr|sysClr) val="([^"]+)"(?:\/>|>([\s\S]*?)<\/a:\1>)/.exec(xml);
  if (!m) return null;
  const mods = [...(m[3] ?? '').matchAll(/<a:(\w+) val="(-?\d+)"\/>/g)].map((x): [string, number] => [x[1]!, Number(x[2])]);
  return { kind: m[1] as DmlColor['kind'], val: m[2]!, ...(mods.length ? { mods } : {}) } as DmlColor;
}

/** Aparência resumida de um estilo da galeria: preenchimento (1 ou 2 cores para o
 *  degradê), contorno (cor, espessura px) e a cor do texto. */
function styleLook(n: number, hex: (c: DmlColor) => string | undefined): { fill: string[] | null; line: string | null; lw: number; text: string } {
  const [sp, st] = SHAPE_STYLE_PRESETS[n - 1]!;
  const ref = (tag: string) => /<a:(\w+Ref) idx="(\w+)">([\s\S]*?)<\/a:\1>/g;
  const refs = new Map<string, { idx: string; color: DmlColor | null }>();
  for (const m of st.matchAll(ref(''))) refs.set(m[1]!, { idx: m[2]!, color: colorIn(m[3]) });
  const text = hex(refs.get('fontRef')?.color ?? { kind: 'schemeClr', val: 'dk1' }) ?? '000000';
  let fill: string[] | null = null, line: string | null = null, lw = 1;
  if (n <= 42) {
    const fr = refs.get('fillRef'), lr = refs.get('lnRef');
    const fc = fr?.color ? hex(fr.color) : undefined;
    if (fc && fr!.idx !== '0') fill = fr!.idx === '1' ? [fc] : [lighten(fc, fr!.idx === '2' ? 0.35 : 0.2), fc];
    const lc = lr?.color ? hex(lr.color) : undefined;
    if (lc && lr!.idx !== '0') { line = lc; lw = lr!.idx === '3' ? 2 : 1; }
  } else {
    if (/^<a:solidFill>/.test(sp)) { const c = colorIn(sp); if (c) fill = [hex(c) ?? 'FFFFFF']; }
    else if (/^<a:gradFill/.test(sp)) {
      const stops = [...sp.matchAll(/<a:gs pos="\d+">([\s\S]*?)<\/a:gs>/g)].map((g) => colorIn(g[1]));
      fill = stops.filter((c): c is DmlColor => !!c).map((c) => hex(c) ?? 'FFFFFF');
    }
    const ln = /<a:ln\b[^>]*?(?:w="(\d+)")?[^>]*>([\s\S]*?)<\/a:ln>/.exec(sp);
    if (ln && !/<a:noFill\/>/.test(ln[2]!)) { const c = colorIn(ln[2]); if (c) { line = hex(c) ?? null; lw = Math.max(1, Number(ln[1] ?? 12700) / 12700); } }
  }
  return { fill, line, lw, text };
}

function lighten(hex: string, k: number): string {
  const n = parseInt(hex, 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * k);
  return [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function styleThumb(tile: HTMLElement, n: number, hex: (c: DmlColor) => string | undefined): void {
  const W = 56, H = 40, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = W * dpr; c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext('2d')!;
  x.scale(dpr, dpr);
  const lk = styleLook(n, hex);
  const r = { x: 4, y: 4, w: W - 8, h: H - 8 };
  if (lk.fill?.length) {
    if (lk.fill.length > 1) {
      const g = x.createLinearGradient(0, r.y, 0, r.y + r.h);
      lk.fill.forEach((f, i) => g.addColorStop(i / (lk.fill!.length - 1), `#${f}`));
      x.fillStyle = g;
    } else x.fillStyle = `#${lk.fill[0]}`;
    x.fillRect(r.x, r.y, r.w, r.h);
  }
  if (lk.line) { x.strokeStyle = `#${lk.line}`; x.lineWidth = lk.lw; x.strokeRect(r.x, r.y, r.w, r.h); }
  x.fillStyle = `#${lk.text}`;
  x.font = '12px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('Abc', W / 2, H / 2 + 1);
  tile.replaceChildren(c);
}

/** Miniatura de um modelo da galeria Caixa de Texto: a página com a caixa no lugar, as
 *  cores do modelo e linhas de texto. */
function templateThumb(tile: HTMLElement, id: string, ed: UniversalWriteElement, lang: 'en' | 'pt'): void {
  const W = 84, H = 108, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = W * dpr; c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext('2d')!;
  x.scale(dpr, dpr);
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, W, H);
  x.strokeStyle = '#c8c8c8';
  x.strokeRect(0.5, 0.5, W - 1, H - 1);
  const accent = ed.documentThemeColors()['accent1'] ?? '156082';
  const sp = textboxTemplateSpec(id, { accent, lang });
  if (sp) {
    const k = W / (8.5 * 914400);
    const mw = 6.5 * 914400 * k, ml = 914400 * k;
    let w = sp.sizeRelH ? (sp.sizeRelH.pct / 100000) * (sp.sizeRelH.relativeFrom === 'page' ? W : mw) : sp.cx * k;
    let h = sp.sizeRelV ? (sp.sizeRelV.pct / 100000) * H : Math.min(sp.cy * k, H * 0.4);
    w = Math.min(w, W); h = Math.min(h, H);
    const bx = sp.posH.relativeFrom === 'page' ? (sp.posH.align === 'right' ? W - w : 0) : ml + (sp.posH.align === 'right' ? mw - w : sp.posH.align === 'center' ? (mw - w) / 2 : 0);
    const by = sp.posV.relativeFrom === 'page' ? 0 : 24;
    // texto do corpo em volta
    x.fillStyle = '#d8d8d8';
    for (let ly = 14; ly < H - 10; ly += 7) {
      const inBox = ly >= by - 4 && ly <= by + h + 4;
      if (inBox && sp.wrap !== 'none') {
        if (bx > ml + 8) x.fillRect(ml, ly, bx - ml - 4, 2);
        if (bx + w < ml + mw - 8) x.fillRect(bx + w + 4, ly, ml + mw - bx - w - 4, 2);
      } else x.fillRect(ml, ly, mw, 2);
    }
    const hex = (cc: DmlColor) => ed.resolveDmlColor(cc);
    const f = sp.fill;
    x.fillStyle = f.kind === 'solid' ? `#${hex(f.color) ?? 'ffffff'}` : '#ffffff';
    x.fillRect(bx, by, w, h);
    if (sp.line) { x.strokeStyle = `#${hex(sp.line.fill) ?? '000000'}`; x.lineWidth = 1; x.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1); }
    const dark = f.kind === 'solid' && /accent1"?$/.test(JSON.stringify(f.color.val)) && !(f.color.mods ?? []).length;
    x.fillStyle = dark ? 'rgba(255,255,255,.8)' : `#${accent}`;
    for (let ly = by + 6; ly < by + h - 4 && ly < by + 40; ly += 6) x.fillRect(bx + 5, ly, Math.max(4, w - 10), 2);
  }
  tile.replaceChildren(c);
}

// ───────────────────────── menus ─────────────────────────

/** Inserir › Caixa de Texto: os modelos, Desenhar Caixa de Texto (e a vertical). */
export function textboxMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const lang = ctx.lang === 'pt' ? 'pt' : 'en';
  return [
    {
      content: (close) => tileGrid({
        sections: [{ label: L('Built-In', 'Internos'), items: ed.textboxTemplates().map((t) => ({ id: t.id, label: t.name })) }],
        tile: { w: 92, h: 116 }, cols: 3, close, text: (l) => ctx.registry.text(l),
        render: (tile, it) => templateThumb(tile, it.id, ed, lang),
        onPick: (id) => { ed.insertTextbox(id); ctx.after(); },
      }),
    },
    '-', 'textbox:draw', 'textbox:drawVertical',
  ];
}

function fillMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))], columns: 10, close,
          onPick: (v) => { ed.setShapeFill(dmlFromPick(v, colors)); ctx.after(); },
        });
      },
    },
    'shp:fill:none',
    {
      id: 'shp:fill:more', label: L('More Fill Colors…', 'Mais Cores de Preenchimento...'), icon: 'palette',
      onClick: () => {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.addEventListener('change', () => { ed.setShapeFill({ kind: 'srgbClr', val: inp.value.slice(1).toUpperCase() }); ctx.after(); });
        inp.click();
      },
    },
    { id: 'shp:fill:picture', label: L('Picture…', 'Imagem...'), icon: 'image', onClick: () => pickImage((d, ext) => { void ed.setShapePictureFill(d, ext, false).then(() => ctx.after()); }) },
    {
      id: 'shp:fill:gradient', label: L('Gradient', 'Gradiente'), icon: 'format_color_fill',
      submenu: () => [{
        content: (close) => {
          const vars = ed.shapeGradientVariations();
          return tileGrid({
            sections: [
              { label: L('Light Variations', 'Variações Claras'), items: vars.filter((v) => !v.dark).map((v) => ({ id: v.id, label: L(v.id, v.id) })) },
              { label: L('Dark Variations', 'Variações Escuras'), items: vars.filter((v) => v.dark).map((v) => ({ id: v.id, label: L(v.id, v.id) })) },
            ],
            tile: { w: 40, h: 40 }, cols: 4, close, text: (l) => ctx.registry.text(l),
            render: (tile, it) => {
              const v = vars.find((q) => q.id === it.id)!;
              const f = v.fill as { stops: { color: DmlColor }[]; lin?: { ang: number } };
              const cs = f.stops.map((st) => `#${ed.resolveDmlColor(st.color) ?? 'ffffff'}`);
              const deg = 90 + (f.lin?.ang ?? 0) / 60000;
              tile.innerHTML = `<span style="display:block;width:30px;height:30px;margin:auto;background:linear-gradient(${deg}deg,${cs.join(',')})"></span>`;
            },
            onPick: (id) => { const v = vars.find((q) => q.id === id); if (v) ed.setShapeFill(v.fill); ctx.after(); },
          });
        },
      }, '-', { id: 'shp:fill:gradOptions', label: L('More Gradients…', 'Mais Gradientes...'), icon: 'tune', onClick: () => env.ctl.pictureDialog('format:line') }],
    },
    { id: 'shp:fill:texture', label: L('Texture…', 'Textura...'), icon: 'grid_on', onClick: () => pickImage((d, ext) => { void ed.setShapePictureFill(d, ext, true).then(() => ctx.after()); }) },
  ];
}

function outlineMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const st = () => ed.selectedShape();
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))], columns: 10, close,
          onPick: (v) => { ed.setShapeOutline({ color: dmlFromPick(v, colors) }); ctx.after(); },
        });
      },
    },
    'shp:outline:none',
    {
      id: 'shp:outline:more', label: L('More Outline Colors…', 'Mais Cores de Contorno...'), icon: 'palette',
      onClick: () => {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.addEventListener('change', () => { ed.setShapeOutline({ color: { kind: 'srgbClr', val: inp.value.slice(1).toUpperCase() } }); ctx.after(); });
        inp.click();
      },
    },
    '-',
    {
      id: 'shp:outline:weight', label: L('Weight', 'Espessura'), icon: 'line_weight',
      submenu: () => LINE_WEIGHTS_PT.map((w): MenuItem => ({
        id: `shp:outline:w:${w}`, label: `${String(w).replace('.', ctx.registry.text(L('.', ',')))} pt`,
        checked: !!st()?.format.line?.fill && Math.abs((st()!.format.line!.w ?? 9525) / 12700 - w) < 0.01,
        onClick: () => { ed.setShapeOutline({ weightPt: w }); ctx.after(); },
      })),
    },
    {
      id: 'shp:outline:dash', label: L('Dashes', 'Tracejados'), icon: 'line_style',
      submenu: () => LINE_DASHES.map((d): MenuItem => ({
        id: `shp:outline:d:${d.val}`, label: d.label, checked: (st()?.format.line?.dash ?? 'solid') === d.val,
        onClick: () => { ed.setShapeOutline({ dash: d.val }); ctx.after(); },
      })),
    },
  ];
}

/** Editar Forma › Alterar Forma: as formas predefinidas (o texto vai no retângulo de texto). */
function changeShapeMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  return [{
    id: 'shp:change', label: L('Change Shape', 'Alterar Forma'), icon: 'shapes',
    submenu: () => [{
      content: (close) => tileGrid({
        sections: CROP_SHAPES.map((g) => ({ label: g.label, items: g.shapes.map(([prst, en, pt]) => ({ id: prst, label: L(en, pt) })) })),
        tile: { w: 30, h: 26 }, cols: 10, close, text: (l) => ctx.registry.text(l),
        render: (tile, it) => shapeThumb(tile, it.id),
        onPick: (id) => { env.ed.changeShape(id); ctx.after(); },
      }),
    }],
  }];
}

/** Galeria Estilos de Forma (faixa na ribbon; grade com os estilos do tema e as predefinições). */
function shapeStylesGallery(env: WidgetEnv): BarItem {
  const ed = env.ed;
  const items = (): GalleryItem[] => SHAPE_STYLE_PRESETS.map((_, i) => ({ id: String(i + 1), label: L(`Style ${i + 1}`, `Estilo ${i + 1}`), section: i < 42 ? 'theme' : 'presets' }));
  return {
    gallery: {
      id: 'shp:styles', label: L('Shape Styles', 'Estilos de Forma'), icon: 'style',
      tile: { w: 60, h: 44 }, rows: 1, maxCols: 6, minCols: 3, expandCols: 7,
      sections: [{ id: 'theme', label: L('Theme Styles', 'Estilos do Tema') }, { id: 'presets', label: L('Presets', 'Predefinições') }],
      supports: () => typeof ed.setShapeStyle === 'function',
      isEnabled: () => !ed.isProtected() && !!ed.selectedShape() && ed.selectedShape()!.kind !== 'group',
      items,
      version: () => JSON.stringify(ed.documentThemeColors()),
      selected: () => { const n = ed.selectedShape()?.styleIndex; return n ? String(n) : undefined; },
      render: (tile, it) => styleThumb(tile, Number(it.id), (c) => ed.resolveDmlColor(c)),
      onPick: (id) => ed.setShapeStyle(Number(id)),
      footer: () => ['shp:format'],
    },
  };
}

/** Medida da forma (Altura/Largura) com setas — cm, como o Word pt-BR. */
const measureWidget = (env: WidgetEnv, which: 'height' | 'width'): BarItem => ({
  widget: (ctx) => {
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px';
    const ic = document.createElement('span');
    ic.innerHTML = symbol(which);
    ic.style.cssText = 'display:inline-flex;opacity:.8';
    const input = document.createElement('input');
    input.className = 'uo-num';
    input.inputMode = 'decimal';
    input.style.width = '64px';
    input.title = ctx.registry.text(which === 'height' ? L('Shape Height', 'Altura da Forma') : L('Shape Width', 'Largura da Forma'));
    input.setAttribute('aria-label', input.title);
    const dec = ctx.registry.text(L('.', ','));
    const cm = (pt: number): string => `${(Math.round((pt / 72) * 254) / 100).toFixed(2).replace('.', dec)} cm`;
    const ptOf = (v: string): number | undefined => { const n = parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? (n / 2.54) * 72 : undefined; };
    const cur = (): number => { const s = env.ed.selectedShape(); return s ? (which === 'height' ? s.heightPt : s.widthPt) : 0; };
    const set = (v: number): void => { env.ed.setShapeSize(which === 'height' ? { heightPt: Math.max(0.1, v) } : { widthPt: Math.max(0.1, v) }); ctx.after(); };
    const apply = (): void => { const v = ptOf(input.value); if (v !== undefined) set(v); };
    input.addEventListener('change', apply);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    const up = document.createElement('button'), dn = document.createElement('button');
    for (const [b, d, sy] of [[up, 1, 'keyboard_arrow_up'], [dn, -1, 'keyboard_arrow_down']] as const) {
      b.type = 'button';
      b.className = 'uo-btn';
      b.style.cssText = 'width:18px;height:14px;min-width:0;padding:0';
      b.innerHTML = symbol(sy);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => set(cur() + d * (72 / 25.4)));
    }
    const arrows = document.createElement('span');
    arrows.style.cssText = 'display:inline-flex;flex-direction:column';
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      visible: () => typeof (env.ed as unknown as { selectedShape?: unknown }).selectedShape === 'function',
      sync: () => {
        const s = env.ed.selectedShape();
        input.disabled = up.disabled = dn.disabled = !s || env.ed.isProtected();
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s ? cm(which === 'height' ? s.heightPt : s.widthPt) : '';
      },
    };
  },
});

const large = (cmd: string): BarItem => ({ cmd, size: 'large' });

/** Guia contextual "Formato da Forma" da ribbon. */
export function shapeFormatGroups(env: WidgetEnv, ctx: BarContext): BarGroup[] {
  const has = (m: string) => (): boolean => typeof (env.ed as unknown as Record<string, unknown>)[m] === 'function';
  return [
    { id: 'shp-insert', label: L('Insert Shapes', 'Inserir Formas'), icon: 'shapes', prio: 4, cells: [
      { rows: [
        [{ menu: () => changeShapeMenu(env, ctx), id: 'shp:edit', label: L('Edit Shape', 'Editar Forma'), icon: 'format_shapes', showLabel: true, supports: has('changeShape') }],
        [{ split: 'textbox:draw', menu: ['textbox:draw', 'textbox:drawVertical'], label: true }],
      ] },
    ] },
    { id: 'shp-styles', label: L('Shape Styles', 'Estilos de Forma'), icon: 'style', prio: 6, launcher: 'shp:format', cells: [
      shapeStylesGallery(env),
      { rows: [
        [{ menu: () => fillMenu(env, ctx), id: 'shp:fill', label: L('Shape Fill', 'Preenchimento da Forma'), icon: 'format_color_fill', showLabel: true, supports: has('setShapeFill') }],
        [{ menu: () => outlineMenu(env, ctx), id: 'shp:outline', label: L('Shape Outline', 'Contorno da Forma'), icon: 'border_color', showLabel: true, supports: has('setShapeOutline') }],
        [{ menu: () => effectsMenu(env, ctx, true), id: 'shp:effects', label: L('Shape Effects', 'Efeitos de Forma'), icon: 'auto_awesome', showLabel: true, supports: has('setShapeEffect') }],
      ] },
    ] },
    { id: 'shp-text', label: L('Text', 'Texto'), icon: 'text_fields', prio: 5, cells: [
      { rows: [
        [{ menu: dirMenu, id: 'shp:dir', label: L('Text Direction', 'Direção do Texto'), icon: 'text_rotate_vertical', showLabel: true, supports: has('setTextboxOptions') }],
        [{ menu: anchorMenu, id: 'shp:anchor', label: L('Align Text', 'Alinhar Texto'), icon: 'vertical_align_center', showLabel: true, supports: has('setTextboxOptions') }],
        [{ cmd: 'shp:link', label: true }, { cmd: 'shp:unlink' }],
      ] },
    ] },
    { id: 'shp-access', label: L('Accessibility', 'Acessibilidade'), icon: 'accessibility_new', prio: 3, cells: [large('shp:alt')] },
    { id: 'shp-arrange', label: L('Arrange', 'Organizar'), icon: 'layers', prio: 6, cells: [
      { menu: shapePositionMenu, id: 'shp:position', label: L('Position', 'Posição'), icon: 'picture_in_picture', size: 'large', supports: has('setShapePosition') },
      { menu: shapeWrapMenu, id: 'shp:wrap', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', size: 'large', supports: has('setShapeWrap') },
      { rows: [
        [{ split: 'shp:forward', menu: ['shp:forward', 'shp:front', 'shp:frontOfText'], label: true }],
        [{ split: 'shp:backward', menu: ['shp:backward', 'shp:back', 'shp:behindText'], label: true }],
      ] },
      { rows: [
        [{ cmd: 'pic:selectionPane', label: true }],
        [{ menu: shapeAlignMenu, id: 'shp:align', label: L('Align', 'Alinhar'), icon: 'align_horizontal_left', showLabel: true, supports: has('alignShape') }],
        [{ menu: shapeRotateMenu, id: 'shp:rotate', label: L('Rotate', 'Girar'), icon: 'rotate_90_degrees_cw', showLabel: true, supports: has('rotateShape') }],
      ] },
    ] },
    { id: 'shp-size', label: L('Size', 'Tamanho'), icon: 'aspect_ratio', prio: 5, launcher: 'shp:layout', cells: [
      { rows: [[measureWidget(env, 'height')], [measureWidget(env, 'width')]] },
    ] },
  ];
}

/** Barra compacta: o grupo Forma aparece com uma forma/caixa selecionada. */
export function shapeCompactGroup(env: WidgetEnv, ctx: BarContext): BarGroup {
  const sel = (): boolean => typeof (env.ed as unknown as { selectedShape?: unknown }).selectedShape === 'function' && !!env.ed.selectedShape();
  return {
    id: 'shape', label: L('Shape', 'Forma'), icon: 'format_shapes', prio: 7, items: [
      { menu: () => fillMenu(env, ctx), id: 'shp:fill', label: L('Shape Fill', 'Preenchimento da Forma'), icon: 'format_color_fill', supports: sel },
      { menu: () => outlineMenu(env, ctx), id: 'shp:outline', label: L('Shape Outline', 'Contorno da Forma'), icon: 'border_color', supports: sel },
      { menu: () => effectsMenu(env, ctx, true), id: 'shp:effects', label: L('Shape Effects', 'Efeitos de Forma'), icon: 'auto_awesome', supports: sel },
      { menu: () => [...dirMenu(), '-', ...anchorMenu(), '-', 'shp:link', 'shp:unlink'], id: 'shp:text', label: L('Text', 'Texto'), icon: 'text_fields', supports: sel },
      { menu: shapeWrapMenu, id: 'shp:wrap', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', supports: sel },
      { menu: shapePositionMenu, id: 'shp:position', label: L('Position', 'Posição'), icon: 'picture_in_picture', supports: sel },
      { menu: () => ['shp:forward', 'shp:front', 'shp:frontOfText', '-', 'shp:backward', 'shp:back', 'shp:behindText'], id: 'shp:order', label: L('Arrange', 'Organizar'), icon: 'layers', supports: sel },
      { cmd: 'shp:format' },
    ],
  };
}

/** Formatar › Forma (barra compacta). */
export function shapeMenu(env: WidgetEnv, ctx: BarContext): MenuItem {
  return {
    id: 'shp:menu', label: L('Shape', 'Forma'), icon: 'format_shapes',
    submenu: () => [
      { id: 'shp:fillSub', label: L('Shape Fill', 'Preenchimento da Forma'), icon: 'format_color_fill', submenu: () => fillMenu(env, ctx) },
      { id: 'shp:outlineSub', label: L('Shape Outline', 'Contorno da Forma'), icon: 'border_color', submenu: () => outlineMenu(env, ctx) },
      { id: 'shp:effectsSub', label: L('Shape Effects', 'Efeitos de Forma'), icon: 'auto_awesome', submenu: () => effectsMenu(env, ctx, true) },
      ...changeShapeMenu(env, ctx),
      '-',
      { id: 'shp:dirSub', label: L('Text Direction', 'Direção do Texto'), icon: 'text_rotate_vertical', submenu: dirMenu },
      { id: 'shp:anchorSub', label: L('Align Text', 'Alinhar Texto'), icon: 'vertical_align_center', submenu: anchorMenu },
      'shp:link', 'shp:unlink',
      '-',
      { id: 'shp:wrapSub', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', submenu: shapeWrapMenu },
      { id: 'shp:posSub', label: L('Position', 'Posição'), icon: 'picture_in_picture', submenu: shapePositionMenu },
      { id: 'shp:rotSub', label: L('Rotate', 'Girar'), icon: 'rotate_90_degrees_cw', submenu: shapeRotateMenu },
      '-', 'shp:alt', 'shp:layout', 'shp:format', '-', 'shp:delete',
    ],
  };
}

/** Menu de contexto da forma/caixa selecionada. */
export function shapeContextItems(): MenuEntry[] {
  return [
    'cut', 'copy', 'paste', '-', 'shp:editText',
    { id: 'shp:ctx:front', label: L('Bring to Front', 'Trazer para a Frente'), icon: 'flip_to_front', submenu: ['shp:front', 'shp:forward', 'shp:frontOfText'] },
    { id: 'shp:ctx:back', label: L('Send to Back', 'Enviar para Trás'), icon: 'flip_to_back', submenu: ['shp:back', 'shp:backward', 'shp:behindText'] },
    '-', 'shp:link', 'shp:unlink',
    { id: 'shp:ctx:wrap', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', submenu: shapeWrapMenu },
    'shp:alt', 'shp:setDefault', 'shp:layout', 'shp:format', '-', 'shp:delete',
  ];
}
