// Comandos, menus e grupos de IMAGEM das barras do Write: a guia contextual
// "Formato da Imagem" (ribbon), o grupo Imagem da barra compacta, Formatar ›
// Imagem e o menu de contexto da imagem. Só DECLARA sobre a API pública do
// <universal-write>; comando cuja API não existe fica oculto (supports).
import { symbol, colorGrid, themePaletteColors, parseThemePick, STANDARD_COLORS, tileGrid, type BarContext, type BarGroup, type BarItem, type Command, type CommandRegistry, type GalleryItem, type Lbl, type MenuEntry, type MenuItem } from '@universal-office/ui';
import type { PicWrapKind, DmlColor, InlineImage } from '@universal-office/docx-core';
import { paintPicture, type PictureLook } from '@universal-office/docx-layout';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import { adjustCells, correctionsMenu, colorMenu as pictureColorMenu, transparencyMenu } from './chrome-picture-adjust.js';
import { presetOutline } from '@universal-office/drawingml';
import { CROP_SHAPES, POSITION_PRESETS, ASPECT_RATIOS, SHADOW_PRESETS, REFLECTION_PRESETS, SOFT_EDGE_PRESETS, GLOW_SIZES, BEVEL_PRESETS, ROTATION_PRESETS, LINE_WEIGHTS_PT, LINE_DASHES } from './picture-ops.js';

const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });

/** Diálogos e painéis da imagem (chrome-picture-dialogs.ts). */
export type PictureDialogKind = 'layout:position' | 'layout:wrap' | 'layout:size' | 'alt' | 'compress' | 'selection' | 'format:line' | 'format:effects' | 'format:layout' | 'format:picture';

const WRAPS: [PicWrapKind, string, string, string, string][] = [
  ['inline', 'In Line with Text', 'Alinhado ao Texto', 'En línea con el texto', 'format_align_left'],
  ['square', 'Square', 'Quadrado', 'Cuadrado', 'wrap_text'],
  ['tight', 'Tight', 'Comprimido', 'Estrecho', 'wrap_text'],
  ['through', 'Through', 'Através', 'Transparente', 'wrap_text'],
  ['topAndBottom', 'Top and Bottom', 'Superior e Inferior', 'Arriba y abajo', 'vertical_align_center'],
  ['behind', 'Behind Text', 'Atrás do Texto', 'Detrás del texto', 'flip_to_back'],
  ['front', 'In Front of Text', 'Na Frente do Texto', 'Delante del texto', 'flip_to_front'],
];

/** Ícone de posição: página com o bloco no lugar do preset (viewBox 0 -960 960 960). */
function positionIcon(v: 'top' | 'center' | 'bottom', h: 'left' | 'center' | 'right'): string {
  const x = h === 'left' ? 240 : h === 'center' ? 400 : 560, y = v === 'top' ? -760 : v === 'center' ? -560 : -360;
  return `<path d="M160-80v-800h640v800H160Zm60-60h520v-680H220v680Z"/><path d="M${x} ${y}h160v120H${x}z"/>`;
}

export function registerPictureCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const pic = () => (typeof api['selectedImage'] === 'function' ? ed.selectedImage() : null);
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const on = (): boolean => canEdit() && !!pic();
  const floating = (): boolean => on() && !pic()!.inline;
  const p = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => on() && c.isEnabled!() : on });
  const cmds: Command[] = [
    // ── Organizar: Quebra de Texto Automática ──
    ...WRAPS.map(([k, en, pt, es, icon]): Command => p({
      id: `pic:wrap:${k}`, label: L(en, pt, es), icon, supports: has('setImageWrap'),
      run: () => ed.setImageWrap(k), isChecked: () => pic()?.wrap === k,
    })),
    p({
      id: 'pic:wrap:editPoints', label: L('Edit Wrap Points', 'Editar pontos da disposição do texto', 'Modificar puntos de ajuste'), icon: 'polyline', supports: has('startEditWrapPoints'), isEnabled: floating,
      isChecked: () => typeof api['editingWrapPoints'] === 'function' && ed.editingWrapPoints(), run: () => (ed.editingWrapPoints() ? ed.endEditWrapPoints() : ed.startEditWrapPoints()),
    }),
    p({ id: 'pic:wrap:moveWithText', label: L('Move with Text', 'Mover com o Texto', 'Mover con el texto'), supports: has('setImageMoveWithText'), isEnabled: floating,
      run: () => ed.setImageMoveWithText(true), isChecked: () => !!pic()?.moveWithText }),
    p({ id: 'pic:wrap:fixOnPage', label: L('Fix Position on Page', 'Corrigir Posição na Página', 'Fijar posición en la página'), supports: has('setImageMoveWithText'), isEnabled: floating,
      run: () => ed.setImageMoveWithText(false), isChecked: () => !!pic() && !pic()!.inline && !pic()!.moveWithText }),
    p({ id: 'pic:wrap:more', label: L('More Layout Options…', 'Mais Opções de Layout...', 'Más opciones de diseño…'), icon: 'tune', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:wrap') }),
    // ── Organizar: Posição ──
    p({ id: 'pic:pos:inline', label: L('In Line with Text', 'Alinhado ao Texto', 'En línea con el texto'), icon: 'format_align_left', supports: has('setImagePosition'),
      run: () => ed.setImagePosition('inline'), isChecked: () => !!pic()?.inline }),
    ...POSITION_PRESETS.map((q): Command => p({
      id: `pic:pos:${q.id}`, label: q.label, icon: positionIcon(q.v, q.h), supports: has('setImagePosition'), run: () => ed.setImagePosition(q.id),
      isChecked: () => {
        const f = pic()?.format;
        const map: Record<string, string> = { top: 'top', center: 'center', bottom: 'bottom' };
        return !!f && f.wrap === 'square' && f.posH?.relativeFrom === 'margin' && f.posH.align === q.h && f.posV?.relativeFrom === 'margin' && f.posV.align === map[q.v];
      },
    })),
    p({ id: 'pic:pos:more', label: L('More Layout Options…', 'Mais Opções de Layout...', 'Más opciones de diseño…'), icon: 'tune', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:position') }),
    // ── Organizar: Avançar / Recuar ──
    p({ id: 'pic:forward', label: L('Bring Forward', 'Avançar', 'Traer adelante'), icon: 'flip_to_front', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('forward') }),
    p({ id: 'pic:front', label: L('Bring to Front', 'Trazer para a Frente', 'Traer al frente'), icon: 'flip_to_front', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('front') }),
    p({ id: 'pic:frontOfText', label: L('Bring in Front of Text', 'Trazer para a Frente do Texto', 'Traer delante del texto'), icon: 'flip_to_front', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('frontOfText') }),
    p({ id: 'pic:backward', label: L('Send Backward', 'Recuar', 'Enviar atrás'), icon: 'flip_to_back', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('backward') }),
    p({ id: 'pic:back', label: L('Send to Back', 'Enviar para Trás', 'Enviar al fondo'), icon: 'flip_to_back', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('back') }),
    p({ id: 'pic:behindText', label: L('Send Behind Text', 'Enviar para Trás do Texto', 'Enviar detrás del texto'), icon: 'flip_to_back', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('behindText') }),
    // ── Organizar: Girar ──
    p({ id: 'pic:rotate:right', label: L('Rotate Right 90°', 'Girar 90° para a Direita', 'Girar 90° a la derecha'), icon: 'rotate_right', supports: has('rotateImage'), run: () => ed.rotateImage(90) }),
    p({ id: 'pic:rotate:left', label: L('Rotate Left 90°', 'Girar 90° para a Esquerda', 'Girar 90° a la izquierda'), icon: 'rotate_left', supports: has('rotateImage'), run: () => ed.rotateImage(-90) }),
    p({ id: 'pic:flip:v', label: L('Flip Vertical', 'Inverter Verticalmente', 'Voltear verticalmente'), icon: 'flip', supports: has('flipImage'), run: () => ed.flipImage('v') }),
    p({ id: 'pic:flip:h', label: L('Flip Horizontal', 'Inverter Horizontalmente', 'Voltear horizontalmente'), icon: 'flip', supports: has('flipImage'), run: () => ed.flipImage('h') }),
    p({ id: 'pic:rotate:more', label: L('More Rotation Options…', 'Mais Opções de Rotação...', 'Más opciones de rotación…'), icon: 'tune', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:size') }),
    // ── Tamanho: Cortar ──
    p({
      id: 'pic:crop:mode', label: L('Crop', 'Cortar', 'Recortar'), tip: L('Crop: drag the black handles to remove unwanted areas', 'Cortar: arraste as alças pretas para remover as áreas indesejadas', 'Recortar: arrastra los controladores negros para quitar las áreas no deseadas'), icon: 'crop', supports: has('startImageCrop'),
      isChecked: () => typeof api['croppingImage'] === 'function' && ed.croppingImage(), run: () => (ed.croppingImage() ? ed.endImageCrop() : ed.startImageCrop()),
    }),
    p({ id: 'pic:crop:fill', label: L('Fill', 'Preencher', 'Rellenar'), icon: 'fit_screen', supports: has('cropImageFillFit'), run: () => ed.cropImageFillFit('fill') }),
    p({ id: 'pic:crop:fit', label: L('Fit', 'Ajustar', 'Ajustar'), icon: 'crop_free', supports: has('cropImageFillFit'), run: () => ed.cropImageFillFit('fit') }),
    ...ASPECT_RATIOS.map((r): Command => p({ id: `pic:crop:ratio:${r.id}`, label: r.id, supports: has('cropImageToAspect'), run: () => ed.cropImageToAspect(r.w, r.h) })),
    p({ id: 'pic:layout', label: L('Layout Options…', 'Layout...', 'Opciones de diseño…'), icon: 'aspect_ratio', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:size') }),
    // ── Organizar: Painel de Seleção e Alinhar ──
    { id: 'pic:selectionPane', label: L('Selection Pane', 'Painel de Seleção', 'Panel de selección'), icon: 'select', supports: has('selectionPaneItems'), isEnabled: () => !app.comparing, isChecked: () => ctl.pictureDialogOpen('selection'), run: () => ctl.pictureDialog('selection') },
    ...ALIGNS.map(([k, en, pt, es, icon]): Command => p({ id: `pic:align:${k}`, label: L(en, pt, es), icon, supports: has('alignImage'), isEnabled: floating, run: () => ed.alignImage(k) })),
    ...(['page', 'margin'] as const).map((k): Command => ({
      id: `pic:align:to:${k}`, label: k === 'page' ? L('Align to Page', 'Alinhar à Página', 'Alinear a la página') : L('Align to Margin', 'Alinhar à Margem', 'Alinear al margen'), supports: has('alignImage'),
      isChecked: () => (ed as unknown as { imageAlignTo?: string }).imageAlignTo === k, run: () => { ed.imageAlignTo = k; },
    })),
    // ── Formatar Imagem (painel) ──
    { id: 'pic:format', label: L('Format Picture…', 'Formatar Imagem...', 'Formato de imagen…'), icon: 'tune', supports: has('setImageFormat'), isEnabled: on, run: () => ctl.pictureDialog('format:line') },
    ...(['line', 'effects', 'layout', 'picture'] as const).map((t): Command => ({ id: `pic:format:${t}`, label: L('Format Picture…', 'Formatar Imagem...', 'Formato de imagen…'), icon: 'tune', supports: has('setImageFormat'), isEnabled: on, run: () => ctl.pictureDialog(`format:${t}`) })),
    { id: 'pic:fx:options', label: L('Effect Options…', 'Opções de Efeitos...', 'Opciones de efectos…'), icon: 'tune', supports: has('setImageFormat'), isEnabled: on, run: () => ctl.pictureDialog('format:effects') },
    { id: 'pic:adjust:options', label: L('Picture Options…', 'Opções de Imagem...', 'Opciones de imagen…'), icon: 'tune', supports: has('setImageFormat'), isEnabled: on, run: () => ctl.pictureDialog('format:picture') },
    // ── Acessibilidade ──
    p({ id: 'pic:alt', label: L('Alt Text', 'Texto Alt', 'Texto alternativo'), tip: L('Alt Text: describe the picture for people who use screen readers', 'Texto Alt: descreva a imagem para quem usa leitor de tela', 'Texto alternativo: describe la imagen para las personas que usan lectores de pantalla'), icon: 'accessibility_new', supports: has('setImageAltText'), run: () => ctl.pictureDialog('alt') }),
  ];
  reg.add(...cmds);
}

const ALIGNS: ['left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', string, string, string, string][] = [
  ['left', 'Align Left', 'Alinhar à Esquerda', 'Alinear a la izquierda', 'align_horizontal_left'], ['center', 'Align Center', 'Centralizar', 'Alinear al centro', 'align_horizontal_center'],
  ['right', 'Align Right', 'Alinhar à Direita', 'Alinear a la derecha', 'align_horizontal_right'], ['top', 'Align Top', 'Alinhar Acima', 'Alinear arriba', 'align_vertical_top'],
  ['middle', 'Align Middle', 'Alinhar ao Meio', 'Alinear en el medio', 'align_vertical_center'], ['bottom', 'Align Bottom', 'Alinhar Parte Inferior', 'Alinear abajo', 'align_vertical_bottom'],
];

/** Alinhar (menu): os 6 alinhamentos e a referência (página ou margem). */
export const alignMenu = (): MenuEntry[] => [...ALIGNS.slice(0, 3).map(([k]) => `pic:align:${k}`), '-', ...ALIGNS.slice(3).map(([k]) => `pic:align:${k}`), '-', 'shp:distribute:h', 'shp:distribute:v', '-', 'pic:align:to:page', 'pic:align:to:margin'];

/** Quebra de Texto Automática (menu). */
export const wrapMenu = (): MenuEntry[] => [
  ...WRAPS.map(([k]) => `pic:wrap:${k}`), '-', 'pic:wrap:editPoints', 'pic:wrap:moveWithText', 'pic:wrap:fixOnPage', '-', 'pic:wrap:more',
];

/** Galeria Posição (menu): Alinhado ao Texto + as 9 posições com quebra Quadrado. */
export const positionMenu = (): MenuEntry[] => [
  'pic:pos:inline', '-', ...POSITION_PRESETS.map((q) => `pic:pos:${q.id}`), '-', 'pic:pos:more',
];

export const rotateMenu = (): MenuEntry[] => ['pic:rotate:right', 'pic:rotate:left', 'pic:flip:v', 'pic:flip:h', '-', 'pic:rotate:more'];

/** Miniatura de uma forma predefinida (contorno oficial do DrawingML). */
export function shapeThumb(tile: HTMLElement, prst: string): void {
  const W = 26, H = 22, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = W * dpr; c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext('2d')!;
  x.scale(dpr, dpr);
  x.translate(1.5, 1.5);
  const o = presetOutline(prst, W - 3, H - 3);
  o.subs.forEach((sub, i) => {
    const p = new Path2D();
    for (const g of sub) {
      if (g.c === 'M') p.moveTo(g.x, g.y);
      else if (g.c === 'L') p.lineTo(g.x, g.y);
      else if (g.c === 'C') p.bezierCurveTo(g.x1, g.y1, g.x2, g.y2, g.x, g.y);
      else if (g.c === 'Q') p.quadraticCurveTo(g.x1, g.y1, g.x, g.y);
      else if (g.c === 'E') p.ellipse(g.cx, g.cy, Math.abs(g.rx), Math.abs(g.ry), 0, g.a0, g.a1, g.ccw);
      else p.closePath();
    }
    if (o.fill[i]) { x.fillStyle = 'rgba(68,114,196,.25)'; x.fill(p); }
    if (o.stroke[i]) { x.lineWidth = 1; x.strokeStyle = getComputedStyle(tile).color || '#444'; x.stroke(p); }
  });
  tile.replaceChildren(c);
}

const cropMenu = (env: WidgetEnv, ctx: BarContext) => (): MenuEntry[] => [
  'pic:crop:mode',
  {
    id: 'pic:crop:shape', label: L('Crop to Shape', 'Cortar para Forma', 'Recortar a la forma'), icon: 'shapes',
    submenu: () => [{
      content: (close) => tileGrid({
        sections: CROP_SHAPES.map((g) => ({ label: g.label, items: g.shapes.map(([prst, en, pt, es]) => ({ id: prst, label: L(en, pt, es) })) })),
        tile: { w: 30, h: 26 }, cols: 10, close, text: (l) => ctx.registry.text(l),
        render: (tile, it) => shapeThumb(tile, it.id),
        onPick: (id) => { env.ed.cropImageToShape(id); ctx.after(); },
      }),
    }],
  },
  { id: 'pic:crop:ratio', label: L('Aspect Ratio', 'Taxa de Proporção', 'Relación de aspecto'), icon: 'aspect_ratio', submenu: () => ASPECT_RATIOS.map((r) => `pic:crop:ratio:${r.id}`) },
  '-', 'pic:crop:fill', 'pic:crop:fit',
];

/** Medida da imagem (Altura/Largura) com setas — cm, como o Word pt-BR. */
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
    input.title = ctx.registry.text(which === 'height' ? L('Shape Height', 'Altura da Forma', 'Alto de forma') : L('Shape Width', 'Largura da Forma', 'Ancho de forma'));
    input.setAttribute('aria-label', input.title);
    const dec = ctx.registry.text(L('.', ',', ','));
    const cm = (pt: number): string => `${(Math.round((pt / 72) * 254) / 100).toFixed(2).replace('.', dec)} cm`;
    const ptOf = (s: string): number | undefined => {
      const n = parseFloat(s.replace(',', '.').replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? (n / 2.54) * 72 : undefined;
    };
    const cur = (): number => { const s = env.ed.selectedImage(); return s ? (which === 'height' ? s.heightPt : s.widthPt) : 0; };
    const set = (v: number): void => {
      env.ed.setImageSize(which === 'height' ? { heightPt: Math.max(0.1, v) } : { widthPt: Math.max(0.1, v) });
      ctx.after();
    };
    const apply = (): void => { const v = ptOf(input.value); if (v !== undefined) set(v); };
    input.addEventListener('change', apply);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    const step = (d: number): void => set(cur() + d * (72 / 25.4)); // 0,1 cm
    const up = document.createElement('button'), dn = document.createElement('button');
    for (const [b, d, s] of [[up, 1, 'keyboard_arrow_up'], [dn, -1, 'keyboard_arrow_down']] as const) {
      b.type = 'button';
      b.className = 'uo-btn';
      b.style.cssText = 'width:18px;height:14px;min-width:0;padding:0';
      b.innerHTML = symbol(s);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => step(d));
    }
    const arrows = document.createElement('span');
    arrows.style.cssText = 'display:inline-flex;flex-direction:column';
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      visible: () => typeof (env.ed as unknown as { selectedImage?: unknown }).selectedImage === 'function',
      sync: () => {
        const s = env.ed.selectedImage();
        const off = !s || env.ed.isProtected();
        input.disabled = up.disabled = dn.disabled = off;
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s ? cm(which === 'height' ? s.heightPt : s.widthPt) : '';
      },
    };
  },
});

const large = (cmd: string): BarItem => ({ cmd, size: 'large' });

/** Guia contextual "Formato da Imagem" da ribbon. */
export function pictureFormatGroups(env: WidgetEnv, ctx: BarContext): BarGroup[] {
  const has = (m: string) => (): boolean => typeof (env.ed as unknown as Record<string, unknown>)[m] === 'function';
  return [
    { id: 'pic-adjust', label: L('Adjust', 'Ajustar', 'Ajustar'), icon: 'tune', prio: 4, cells: adjustCells(env, ctx) },
    { id: 'pic-styles', label: L('Picture Styles', 'Estilos de Imagem', 'Estilos de imagen'), icon: 'photo_frame', prio: 5, launcher: 'pic:format:effects', cells: [
      { rows: [
        [{ menu: () => borderMenu(env, ctx), id: 'pic:border', label: L('Picture Border', 'Borda da Imagem', 'Borde de imagen'), icon: 'border_color', showLabel: true, supports: has('setImageBorder') }],
        [{ menu: () => effectsMenu(env, ctx), id: 'pic:effects', label: L('Picture Effects', 'Efeitos de Imagem', 'Efectos de imagen'), icon: 'auto_awesome', showLabel: true, supports: has('setImageEffect') }],
      ] },
    ] },
    { id: 'pic-access', label: L('Accessibility', 'Acessibilidade', 'Accesibilidad'), icon: 'accessibility_new', prio: 4, cells: [large('pic:alt')] },
    { id: 'pic-arrange', label: L('Arrange', 'Organizar', 'Organizar'), icon: 'layers', prio: 6, cells: [
      { menu: positionMenu, id: 'pic:position', label: L('Position', 'Posição', 'Posición'), icon: 'picture_in_picture', size: 'large', supports: has('setImagePosition') },
      { menu: wrapMenu, id: 'pic:wrap', label: L('Wrap Text', 'Quebra de Texto Automática', 'Ajustar texto'), icon: 'wrap_text', size: 'large', supports: has('setImageWrap') },
      { rows: [
        [{ split: 'pic:forward', menu: ['pic:forward', 'pic:front', 'pic:frontOfText'], label: true }],
        [{ split: 'pic:backward', menu: ['pic:backward', 'pic:back', 'pic:behindText'], label: true }],
      ] },
      { rows: [
        [{ cmd: 'pic:selectionPane', label: true }],
        [{ menu: alignMenu, id: 'pic:align', label: L('Align', 'Alinhar', 'Alinear'), icon: 'align_horizontal_left', showLabel: true, supports: has('alignImage') }],
        [{ menu: rotateMenu, id: 'pic:rotate', label: L('Rotate', 'Girar', 'Girar'), icon: 'rotate_90_degrees_cw', showLabel: true, supports: has('rotateImage') }],
      ] },
    ] },
    { id: 'pic-size', label: L('Size', 'Tamanho', 'Tamaño'), icon: 'aspect_ratio', prio: 5, launcher: 'pic:layout', cells: [
      { split: 'pic:crop:mode', menu: cropMenu(env, ctx), size: 'large' },
      { rows: [[measureWidget(env, 'height')], [measureWidget(env, 'width')]] },
    ] },
  ];
}

/** Ajustar e Estilos de Imagem como submenus (barra compacta e Formatar › Imagem). */
function adjustSubmenus(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  return [
    { id: 'pic:sub:corrections', label: L('Corrections', 'Correções', 'Correcciones'), icon: 'tune', submenu: () => correctionsMenu(env, ctx) },
    { id: 'pic:sub:color', label: L('Color', 'Cor', 'Color'), icon: 'palette', submenu: () => pictureColorMenu(env, ctx) },
    { id: 'pic:sub:transparency', label: L('Transparency', 'Transparência', 'Transparencia'), icon: 'opacity', submenu: () => transparencyMenu(env, ctx) },
    '-', 'pic:compress', changeSubmenu, 'pic:reset', 'pic:resetSize',
  ];
}
const changeSubmenu: MenuItem = { id: 'pic:sub:change', label: L('Change Picture', 'Alterar Imagem', 'Cambiar imagen'), icon: 'swap_horiz', submenu: ['pic:change:file', 'pic:change:clip'] };
function styleSubmenus(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  return [
    { id: 'pic:sub:border', label: L('Picture Border', 'Borda da Imagem', 'Borde de imagen'), icon: 'border_color', submenu: () => borderMenu(env, ctx) },
    { id: 'pic:sub:effects', label: L('Picture Effects', 'Efeitos de Imagem', 'Efectos de imagen'), icon: 'auto_awesome', submenu: () => effectsMenu(env, ctx) },
  ];
}

/** Barra compacta: o grupo Imagem aparece com a imagem selecionada. */
export function pictureCompactGroup(env: WidgetEnv, ctx: BarContext): BarGroup {
  const sel = (): boolean => typeof (env.ed as unknown as { selectedImage?: unknown }).selectedImage === 'function' && !!env.ed.selectedImage();
  return {
    id: 'picture', label: L('Picture', 'Imagem', 'Imagen'), icon: 'image', prio: 7, items: [
      { menu: wrapMenu, id: 'pic:wrap', label: L('Wrap Text', 'Quebra de Texto Automática', 'Ajustar texto'), icon: 'wrap_text', supports: sel },
      { menu: positionMenu, id: 'pic:position', label: L('Position', 'Posição', 'Posición'), icon: 'picture_in_picture', supports: sel },
      { menu: rotateMenu, id: 'pic:rotate', label: L('Rotate', 'Girar', 'Girar'), icon: 'rotate_90_degrees_cw', supports: sel },
      { menu: cropMenu(env, ctx), id: 'pic:crop', label: L('Crop', 'Cortar', 'Recortar'), icon: 'crop', supports: sel },
      { menu: () => adjustSubmenus(env, ctx), id: 'pic:adjust', label: L('Adjust', 'Ajustar', 'Ajustar'), icon: 'tune', supports: sel },
      { menu: () => styleSubmenus(env, ctx), id: 'pic:styles', label: L('Picture Styles', 'Estilos de Imagem', 'Estilos de imagen'), icon: 'photo_frame', supports: sel },
      { menu: () => ['pic:forward', 'pic:front', 'pic:frontOfText', '-', 'pic:backward', 'pic:back', 'pic:behindText'], id: 'pic:order', label: L('Arrange', 'Organizar', 'Organizar'), icon: 'layers', supports: sel },
      { cmd: 'pic:alt' },
      { cmd: 'pic:layout' },
    ],
  };
}

/** Formatar › Imagem (barra compacta) e o menu de contexto da imagem. */
export function pictureMenu(env: WidgetEnv, ctx: BarContext): MenuItem {
  return {
    id: 'pic:menu', label: L('Picture', 'Imagem', 'Imagen'), icon: 'image',
    submenu: () => [
      { id: 'pic:wrapSub', label: L('Wrap Text', 'Quebra de Texto Automática', 'Ajustar texto'), icon: 'wrap_text', submenu: wrapMenu },
      { id: 'pic:posSub', label: L('Position', 'Posição', 'Posición'), icon: 'picture_in_picture', submenu: positionMenu },
      { id: 'pic:rotSub', label: L('Rotate', 'Girar', 'Girar'), icon: 'rotate_90_degrees_cw', submenu: rotateMenu },
      { id: 'pic:cropSub', label: L('Crop', 'Cortar', 'Recortar'), icon: 'crop', submenu: cropMenu(env, ctx) },
      '-', ...adjustSubmenus(env, ctx), '-', ...styleSubmenus(env, ctx),
      '-', 'pic:alt', 'pic:layout', '-', 'image:delete',
    ],
  };
}

/** Menu de contexto da imagem (clique direito numa imagem selecionada). */
export function pictureContextItems(): MenuEntry[] {
  return [
    'cut', 'copy', 'paste', '-',
    { id: 'pic:ctx:front', label: L('Bring to Front', 'Trazer para a Frente', 'Traer al frente'), icon: 'flip_to_front', submenu: ['pic:front', 'pic:forward', 'pic:frontOfText'] },
    { id: 'pic:ctx:back', label: L('Send to Back', 'Enviar para Trás', 'Enviar al fondo'), icon: 'flip_to_back', submenu: ['pic:back', 'pic:backward', 'pic:behindText'] },
    '-', changeSubmenu, 'link', 'caption',
    { id: 'pic:ctx:wrap', label: L('Wrap Text', 'Quebra de Texto Automática', 'Ajustar texto'), icon: 'wrap_text', submenu: wrapMenu },
    'pic:alt', 'pic:layout', 'pic:format', '-', 'image:delete',
  ];
}

// ───────────────────────── Estilos de Imagem: Borda e Efeitos ─────────────────────────

/** Paleta das cores do tema para DrawingML: a referência (schemeClr + lumMod/lumOff,
 *  como o Word grava nas formas) em vez do tint/shade do texto. */
export function dmlFromPick(value: string, colors: Record<string, string>): DmlColor {
  const p = parseThemePick(value, colors);
  if (!p) return { kind: 'srgbClr', val: value.toUpperCase() };
  const SCHEME: Record<string, string> = { background1: 'bg1', text1: 'tx1', background2: 'bg2', text2: 'tx2' };
  const val = SCHEME[p.themeColor] ?? p.themeColor;
  const snap = (x: number): number => Math.round(x * 20) / 20;
  const mods: [string, number][] = [];
  if (p.tint) { const k = snap(1 - parseInt(p.tint, 16) / 255); mods.push(['lumMod', Math.round((1 - k) * 100000)], ['lumOff', Math.round(k * 100000)]); }
  if (p.shade) { const k = snap(1 - parseInt(p.shade, 16) / 255); mods.push(['lumMod', Math.round((1 - k) * 100000)]); }
  return { kind: 'schemeClr', val, ...(mods.length ? { mods } : {}) };
}

/** Miniatura de efeito: a amostra (retângulo da cor de ênfase) desenhada pelo
 *  MESMO pintor do documento, com a aparência da predefinição. */
const SAMPLE = new Map<string, HTMLCanvasElement>();
function sampleBitmap(hex: string): HTMLCanvasElement {
  let c = SAMPLE.get(hex);
  if (!c) {
    c = document.createElement('canvas');
    c.width = 32; c.height = 24;
    const x = c.getContext('2d')!;
    x.fillStyle = `#${hex}`;
    x.fillRect(0, 0, 32, 24);
    SAMPLE.set(hex, c);
  }
  return c;
}
const THUMB_IMG = { data: new Uint8Array(0), ext: 'png', widthTwips: 0, heightTwips: 0 } as unknown as InlineImage;
export function effectThumb(tile: HTMLElement, look: PictureLook | null, base: string): void {
  const W = 56, H = 48;
  const c = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  c.width = W * dpr; c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, c.width, c.height);
  // twips → px; a amostra tem 30×22 pt no centro (o reflexo a sobe um pouco)
  x.scale((dpr * 96) / 1440, (dpr * 96) / 1440);
  const w = 30 * 20, h = 22 * 20;
  const it = { t: 'image' as const, x: (W * 15 - w) / 2, y: (H * 15 - h) / 2 - (look?.reflection ? 120 : 0), w, h, image: THUMB_IMG, ...(look ? { pic: look } : {}) };
  if (look) paintPicture(x as unknown as CanvasRenderingContext2D, it, sampleBitmap(base));
  else x.drawImage(sampleBitmap(base), it.x, it.y, it.w, it.h);
  tile.replaceChildren(c);
}

/** Cor de ênfase n do tema do documento (miniaturas). */
const accentOf = (env: WidgetEnv, n = 1): string => (env.ed.documentThemeColors()[`accent${n}`] ?? '4472C4').toUpperCase();

function borderMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const st = () => ed.selectedImage();
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))], columns: 10, close,
          onPick: (v) => { ed.setImageBorder({ color: dmlFromPick(v, colors) }); ctx.after(); },
        });
      },
    },
    { id: 'pic:border:none', label: L('No Outline', 'Sem Contorno', 'Sin contorno'), icon: 'border_clear', checked: !st()?.format.line?.fill, onClick: () => { ed.setImageBorder({ color: null }); ctx.after(); } },
    {
      id: 'pic:border:more', label: L('More Outline Colors…', 'Mais Cores de Contorno...', 'Más colores de contorno…'), icon: 'palette',
      onClick: () => {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.addEventListener('change', () => { ed.setImageBorder({ color: { kind: 'srgbClr', val: inp.value.slice(1).toUpperCase() } }); ctx.after(); });
        inp.click();
      },
    },
    '-',
    {
      id: 'pic:border:weight', label: L('Weight', 'Espessura', 'Grosor'), icon: 'line_weight',
      submenu: () => LINE_WEIGHTS_PT.map((w): MenuItem => ({
        id: `pic:border:w:${w}`, label: `${String(w).replace('.', ctx.registry.text(L('.', ',', ',')))} pt`,
        checked: !!st()?.format.line?.fill && Math.abs((st()!.format.line!.w ?? 9525) / 12700 - w) < 0.01,
        onClick: () => { ed.setImageBorder({ weightPt: w }); ctx.after(); },
      })),
    },
    {
      id: 'pic:border:dash', label: L('Dashes', 'Tracejados', 'Guiones'), icon: 'line_style',
      submenu: () => LINE_DASHES.map((d): MenuItem => ({
        id: `pic:border:d:${d.val}`, label: d.label, checked: (st()?.format.line?.dash ?? 'solid') === d.val,
        onClick: () => { ed.setImageBorder({ dash: d.val }); ctx.after(); },
      })),
    },
  ];
}

/** Efeitos de Imagem — ou de Forma (`shape`): as mesmas predefinições. */
export function effectsMenu(env: WidgetEnv, ctx: BarContext, shape = false): MenuEntry[] {
  const ed = env.ed;
  const setFx = (kind: Parameters<UniversalWriteElement['setImageEffect']>[0], preset: string | null): void => (shape ? ed.setShapeEffect(kind, preset) : ed.setImageEffect(kind, preset));
  const t = (l: Lbl): string => ctx.registry.text(l);
  const base = accentOf(env);
  const fx = () => (shape ? ed.selectedShape()?.format.effects : ed.selectedImage()?.format.effects);
  const grid = (sections: { label?: Lbl; items: GalleryItem[] }[], look: (id: string) => PictureLook | null, pick: (id: string) => void, selected: string | undefined, cols: number) => (close: () => void): HTMLElement =>
    tileGrid({
      sections, tile: { w: 64, h: 56 }, cols, text: t, close, ...(selected ? { selected } : {}),
      render: (tile, it) => effectThumb(tile, look(it.id), base), onPick: (id) => { pick(id); ctx.after(); },
    });
  const shadowLook = (id: string): PictureLook | null => {
    const p = SHADOW_PRESETS.find((x) => x.id === id);
    if (!p) return null;
    const s = p.shadow, al = (s.color.mods?.find((m) => m[0] === 'alpha')?.[1] ?? 100000) / 100000;
    return {
      shadow: {
        kind: s.kind === 'inner' ? 'inner' : 'outer', color: '000000', alpha: al, blurPt: (s.blurRad ?? 0) / 12700, distPt: (s.dist ?? 0) / 12700, dirDeg: (s.dir ?? 0) / 60000,
        ...(s.sx !== undefined ? { sx: s.sx / 100000 } : {}), ...(s.sy !== undefined ? { sy: s.sy / 100000 } : {}), ...(s.kx ? { kxDeg: s.kx / 60000 } : {}), ...(s.algn ? { algn: s.algn } : {}),
      },
    };
  };
  const none = (en: string, pt: string, es: string): GalleryItem => ({ id: 'none', label: L(en, pt, es) });
  const curShadow = (): string | undefined => {
    const s = fx()?.shadow;
    return s ? SHADOW_PRESETS.find((p) => JSON.stringify(p.shadow) === JSON.stringify(s))?.id : 'none';
  };
  const curRefl = (): string | undefined => {
    const r = fx()?.reflection;
    return r ? REFLECTION_PRESETS.find((p) => JSON.stringify(p.reflection) === JSON.stringify(r))?.id : 'none';
  };
  const items: MenuItem[] = [
    {
      id: 'pic:fx:shadow', label: L('Shadow', 'Sombra', 'Sombra'), icon: 'filter_none',
      submenu: () => [{
        content: grid([
          { label: L('No Shadow', 'Sem Sombra', 'Sin sombra'), items: [none('No Shadow', 'Sem Sombra', 'Sin sombra')] },
          { label: L('Outer', 'Externa', 'Exterior'), items: SHADOW_PRESETS.filter((p) => p.group === 'outer').map((p) => ({ id: p.id, label: p.label })) },
          { label: L('Inner', 'Interna', 'Interior'), items: SHADOW_PRESETS.filter((p) => p.group === 'inner').map((p) => ({ id: p.id, label: p.label })) },
          { label: L('Perspective', 'Perspectiva', 'Perspectiva'), items: SHADOW_PRESETS.filter((p) => p.group === 'persp').map((p) => ({ id: p.id, label: p.label })) },
        ], shadowLook, (id) => setFx('shadow', id === 'none' ? null : id), curShadow(), 3),
      }],
    },
    {
      id: 'pic:fx:reflection', label: L('Reflection', 'Reflexo', 'Reflejo'), icon: 'flip',
      submenu: () => [{
        content: grid([
          { label: L('No Reflection', 'Sem Reflexo', 'Sin reflejo'), items: [none('No Reflection', 'Sem Reflexo', 'Sin reflejo')] },
          { label: L('Reflection Variations', 'Variações de Reflexo', 'Variaciones de reflejo'), items: REFLECTION_PRESETS.map((p) => ({ id: p.id, label: p.label })) },
        ], (id) => {
          const p = REFLECTION_PRESETS.find((x) => x.id === id);
          if (!p) return null;
          const r = p.reflection;
          return { reflection: { blurPt: (r.blurRad ?? 0) / 12700, stA: (r.stA ?? 100000) / 100000, stPos: 0, endA: (r.endA ?? 0) / 100000, endPos: (r.endPos ?? 100000) / 100000, distPt: (r.dist ?? 0) / 12700, dirDeg: 90, sy: -1 } };
        }, (id) => setFx('reflection', id === 'none' ? null : id), curRefl(), 3),
      }],
    },
    {
      id: 'pic:fx:glow', label: L('Glow', 'Brilho', 'Iluminado'), icon: 'light',
      submenu: () => [{
        content: grid([
          { label: L('No Glow', 'Sem Brilho', 'Sin iluminado'), items: [none('No Glow', 'Sem Brilho', 'Sin iluminado')] },
          {
            label: L('Glow Variations', 'Variações de Brilho', 'Variaciones de iluminado'), items: GLOW_SIZES.flatMap((rad, si) => [1, 2, 3, 4, 5, 6].map((a) => ({
              id: `glow-${si}-${a}`, label: L(`Glow: ${rad / 12700} point; Accent color ${a}`, `Brilho: ${String(rad / 12700).replace('.', ',')} pt; Cor de ênfase ${a}`, `Iluminado: ${String(rad / 12700).replace('.', ',')} pt; color de énfasis ${a}`),
            }))),
          },
        ], (id) => {
          const m = /^glow-(\d+)-(\d)$/.exec(id);
          return m ? { glow: { color: accentOf(env, Number(m[2])), alpha: 0.4, radPt: GLOW_SIZES[Number(m[1])]! / 12700 / 1.6 } } : null;
        }, (id) => setFx('glow', id === 'none' ? null : id), undefined, 6),
      }],
    },
    {
      id: 'pic:fx:soft', label: L('Soft Edges', 'Bordas Suaves', 'Bordes suaves'), icon: 'crop_free',
      submenu: () => [{
        content: grid([
          { label: L('No Soft Edges', 'Sem Bordas Suaves', 'Sin bordes suaves'), items: [none('No Soft Edges', 'Sem Bordas Suaves', 'Sin bordes suaves')] },
          { label: L('Soft Edge Variations', 'Variações de Bordas Suaves', 'Variaciones de bordes suaves'), items: SOFT_EDGE_PRESETS.map((v) => ({ id: String(v), label: L(`${v / 12700} Point`, `${String(v / 12700).replace('.', ',')} Ponto`, `${String(v / 12700).replace('.', ',')} puntos`) })) },
        ], (id) => (id === 'none' ? null : { softEdgePt: Number(id) / 12700 / 2.5 }), (id) => setFx('softEdge', id === 'none' ? null : id), fx()?.softEdge ? String(fx()!.softEdge) : 'none', 3),
      }],
    },
    {
      id: 'pic:fx:bevel', label: L('Bevel', 'Bisel', 'Bisel'), icon: 'crop_square',
      submenu: () => [{
        content: grid([
          { label: L('No Bevel', 'Sem Bisel', 'Sin bisel'), items: [none('No Bevel', 'Sem Bisel', 'Sin bisel')] },
          { label: L('Bevel', 'Bisel', 'Bisel'), items: BEVEL_PRESETS.map((p) => ({ id: p.prst, label: p.label })) },
        ], () => null, (id) => setFx('bevel', id === 'none' ? null : id), undefined, 4),
      }],
    },
    {
      id: 'pic:fx:rot3d', label: L('3-D Rotation', 'Rotação 3D', 'Giro 3D'), icon: 'view_in_ar',
      submenu: () => [{
        content: grid([
          { label: L('No Rotation', 'Sem Rotação', 'Sin giro'), items: [none('No Rotation', 'Sem Rotação', 'Sin giro')] },
          { label: L('Parallel', 'Paralelo', 'Paralelo'), items: ROTATION_PRESETS.filter((p) => p.group === 'parallel').map((p) => ({ id: p.prst, label: p.label })) },
          { label: L('Perspective', 'Perspectiva', 'Perspectiva'), items: ROTATION_PRESETS.filter((p) => p.group === 'perspective').map((p) => ({ id: p.prst, label: p.label })) },
          { label: L('Oblique', 'Oblíqua', 'Oblicua'), items: ROTATION_PRESETS.filter((p) => p.group === 'oblique').map((p) => ({ id: p.prst, label: p.label })) },
        ], () => null, (id) => setFx('rotation', id === 'none' ? null : id), undefined, 4),
      }],
    },
  ];
  // "Opções de …" no fim de cada submenu: o painel Formatar Imagem › Efeitos
  const OPT: Record<string, [string, string, string]> = {
    'pic:fx:shadow': ['Shadow Options…', 'Opções de Sombra...', 'Opciones de sombra…'], 'pic:fx:reflection': ['Reflection Options…', 'Opções de Reflexo...', 'Opciones de reflejo…'],
    'pic:fx:glow': ['Glow Options…', 'Opções de Brilho...', 'Opciones de iluminado…'], 'pic:fx:soft': ['Soft Edges Options…', 'Opções de Bordas Suaves...', 'Opciones de bordes suaves…'],
    'pic:fx:bevel': ['3-D Options…', 'Opções 3D...', 'Opciones 3D…'], 'pic:fx:rot3d': ['3-D Rotation Options…', 'Opções de Rotação 3D...', 'Opciones de giro 3D…'],
  };
  return items.map((it) => {
    const o = it.id ? OPT[it.id] : undefined;
    const sub = it.submenu;
    if (!o || typeof sub !== 'function') return it;
    return { ...it, submenu: () => [...sub(), '-', { id: `${it.id}:options`, label: L(o[0], o[1], o[2]), icon: 'tune', onClick: () => env.ctl.pictureDialog('format:effects') }] };
  });
}
