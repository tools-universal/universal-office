// Comandos, menus e grupos de IMAGEM das barras do Write: a guia contextual
// "Formato da Imagem" (ribbon), o grupo Imagem da barra compacta, Formatar ›
// Imagem e o menu de contexto da imagem. Só DECLARA sobre a API pública do
// <universal-write>; comando cuja API não existe fica oculto (supports).
import { symbol, type BarContext, type BarGroup, type BarItem, type Command, type CommandRegistry, type MenuEntry, type MenuItem } from '@universal-office/ui';
import type { PicWrapKind } from '@universal-office/docx-core';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import { POSITION_PRESETS, ASPECT_RATIOS } from './picture-ops.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });

/** Diálogos e painéis da imagem (chrome-picture-dialogs.ts). */
export type PictureDialogKind = 'layout:position' | 'layout:wrap' | 'layout:size' | 'alt';

const WRAPS: [PicWrapKind, string, string, string][] = [
  ['inline', 'In Line with Text', 'Alinhado ao Texto', 'format_align_left'],
  ['square', 'Square', 'Quadrado', 'wrap_text'],
  ['tight', 'Tight', 'Comprimido', 'wrap_text'],
  ['through', 'Through', 'Através', 'wrap_text'],
  ['topAndBottom', 'Top and Bottom', 'Superior e Inferior', 'vertical_align_center'],
  ['behind', 'Behind Text', 'Atrás do Texto', 'flip_to_back'],
  ['front', 'In Front of Text', 'Na Frente do Texto', 'flip_to_front'],
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
    ...WRAPS.map(([k, en, pt, icon]): Command => p({
      id: `pic:wrap:${k}`, label: L(en, pt), icon, supports: has('setImageWrap'),
      run: () => ed.setImageWrap(k), isChecked: () => pic()?.wrap === k,
    })),
    p({ id: 'pic:wrap:moveWithText', label: L('Move with Text', 'Mover com o Texto'), supports: has('setImageMoveWithText'), isEnabled: floating,
      run: () => ed.setImageMoveWithText(true), isChecked: () => !!pic()?.moveWithText }),
    p({ id: 'pic:wrap:fixOnPage', label: L('Fix Position on Page', 'Corrigir Posição na Página'), supports: has('setImageMoveWithText'), isEnabled: floating,
      run: () => ed.setImageMoveWithText(false), isChecked: () => !!pic() && !pic()!.inline && !pic()!.moveWithText }),
    p({ id: 'pic:wrap:more', label: L('More Layout Options…', 'Mais Opções de Layout...'), icon: 'tune', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:wrap') }),
    // ── Organizar: Posição ──
    p({ id: 'pic:pos:inline', label: L('In Line with Text', 'Alinhado ao Texto'), icon: 'format_align_left', supports: has('setImagePosition'),
      run: () => ed.setImagePosition('inline'), isChecked: () => !!pic()?.inline }),
    ...POSITION_PRESETS.map((q): Command => p({
      id: `pic:pos:${q.id}`, label: q.label, icon: positionIcon(q.v, q.h), supports: has('setImagePosition'), run: () => ed.setImagePosition(q.id),
      isChecked: () => {
        const f = pic()?.format;
        const map: Record<string, string> = { top: 'top', center: 'center', bottom: 'bottom' };
        return !!f && f.wrap === 'square' && f.posH?.relativeFrom === 'margin' && f.posH.align === q.h && f.posV?.relativeFrom === 'margin' && f.posV.align === map[q.v];
      },
    })),
    p({ id: 'pic:pos:more', label: L('More Layout Options…', 'Mais Opções de Layout...'), icon: 'tune', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:position') }),
    // ── Organizar: Avançar / Recuar ──
    p({ id: 'pic:forward', label: L('Bring Forward', 'Avançar'), icon: 'flip_to_front', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('forward') }),
    p({ id: 'pic:front', label: L('Bring to Front', 'Trazer para a Frente'), icon: 'flip_to_front', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('front') }),
    p({ id: 'pic:frontOfText', label: L('Bring in Front of Text', 'Trazer para a Frente do Texto'), icon: 'flip_to_front', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('frontOfText') }),
    p({ id: 'pic:backward', label: L('Send Backward', 'Recuar'), icon: 'flip_to_back', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('backward') }),
    p({ id: 'pic:back', label: L('Send to Back', 'Enviar para Trás'), icon: 'flip_to_back', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('back') }),
    p({ id: 'pic:behindText', label: L('Send Behind Text', 'Enviar para Trás do Texto'), icon: 'flip_to_back', supports: has('arrangeImage'), isEnabled: floating, run: () => ed.arrangeImage('behindText') }),
    // ── Organizar: Girar ──
    p({ id: 'pic:rotate:right', label: L('Rotate Right 90°', 'Girar 90° para a Direita'), icon: 'rotate_right', supports: has('rotateImage'), run: () => ed.rotateImage(90) }),
    p({ id: 'pic:rotate:left', label: L('Rotate Left 90°', 'Girar 90° para a Esquerda'), icon: 'rotate_left', supports: has('rotateImage'), run: () => ed.rotateImage(-90) }),
    p({ id: 'pic:flip:v', label: L('Flip Vertical', 'Inverter Verticalmente'), icon: 'flip', supports: has('flipImage'), run: () => ed.flipImage('v') }),
    p({ id: 'pic:flip:h', label: L('Flip Horizontal', 'Inverter Horizontalmente'), icon: 'flip', supports: has('flipImage'), run: () => ed.flipImage('h') }),
    p({ id: 'pic:rotate:more', label: L('More Rotation Options…', 'Mais Opções de Rotação...'), icon: 'tune', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:size') }),
    // ── Tamanho: Cortar ──
    p({ id: 'pic:crop:fill', label: L('Fill', 'Preencher'), icon: 'fit_screen', supports: has('cropImageFillFit'), run: () => ed.cropImageFillFit('fill') }),
    p({ id: 'pic:crop:fit', label: L('Fit', 'Ajustar'), icon: 'crop_free', supports: has('cropImageFillFit'), run: () => ed.cropImageFillFit('fit') }),
    ...ASPECT_RATIOS.map((r): Command => p({ id: `pic:crop:ratio:${r.id}`, label: r.id, supports: has('cropImageToAspect'), run: () => ed.cropImageToAspect(r.w, r.h) })),
    p({ id: 'pic:layout', label: L('Layout Options…', 'Layout...'), icon: 'aspect_ratio', supports: has('setImageLayout'), run: () => ctl.pictureDialog('layout:size') }),
    // ── Acessibilidade ──
    p({ id: 'pic:alt', label: L('Alt Text', 'Texto Alt'), tip: L('Alt Text: describe the picture for people who use screen readers', 'Texto Alt: descreva a imagem para quem usa leitor de tela'), icon: 'accessibility_new', supports: has('setImageAltText'), run: () => ctl.pictureDialog('alt') }),
  ];
  reg.add(...cmds);
}

/** Quebra de Texto Automática (menu). */
export const wrapMenu = (): MenuEntry[] => [
  ...WRAPS.map(([k]) => `pic:wrap:${k}`), '-', 'pic:wrap:moveWithText', 'pic:wrap:fixOnPage', '-', 'pic:wrap:more',
];

/** Galeria Posição (menu): Alinhado ao Texto + as 9 posições com quebra Quadrado. */
export const positionMenu = (): MenuEntry[] => [
  'pic:pos:inline', '-', ...POSITION_PRESETS.map((q) => `pic:pos:${q.id}`), '-', 'pic:pos:more',
];

export const rotateMenu = (): MenuEntry[] => ['pic:rotate:right', 'pic:rotate:left', 'pic:flip:v', 'pic:flip:h', '-', 'pic:rotate:more'];

const cropMenu = (): MenuEntry[] => [
  { id: 'pic:crop:ratio', label: L('Aspect Ratio', 'Taxa de Proporção'), icon: 'aspect_ratio', submenu: () => ASPECT_RATIOS.map((r) => `pic:crop:ratio:${r.id}`) },
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
    input.title = ctx.registry.text(which === 'height' ? L('Shape Height', 'Altura da Forma') : L('Shape Width', 'Largura da Forma'));
    input.setAttribute('aria-label', input.title);
    const dec = ctx.registry.text(L('.', ','));
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
  void ctx;
  const has = (m: string) => (): boolean => typeof (env.ed as unknown as Record<string, unknown>)[m] === 'function';
  return [
    { id: 'pic-access', label: L('Accessibility', 'Acessibilidade'), icon: 'accessibility_new', prio: 4, cells: [large('pic:alt')] },
    { id: 'pic-arrange', label: L('Arrange', 'Organizar'), icon: 'layers', prio: 6, cells: [
      { menu: positionMenu, id: 'pic:position', label: L('Position', 'Posição'), icon: 'picture_in_picture', size: 'large', supports: has('setImagePosition') },
      { menu: wrapMenu, id: 'pic:wrap', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', size: 'large', supports: has('setImageWrap') },
      { rows: [
        [{ split: 'pic:forward', menu: ['pic:forward', 'pic:front', 'pic:frontOfText'] }],
        [{ split: 'pic:backward', menu: ['pic:backward', 'pic:back', 'pic:behindText'] }],
      ] },
      { rows: [
        [{ menu: rotateMenu, id: 'pic:rotate', label: L('Rotate', 'Girar'), icon: 'rotate_90_degrees_cw', showLabel: true, supports: has('rotateImage') }],
      ] },
    ] },
    { id: 'pic-size', label: L('Size', 'Tamanho'), icon: 'aspect_ratio', prio: 5, launcher: 'pic:layout', cells: [
      { menu: cropMenu, id: 'pic:crop', label: L('Crop', 'Cortar'), icon: 'crop', size: 'large', supports: has('cropImageFillFit') },
      { rows: [[measureWidget(env, 'height')], [measureWidget(env, 'width')]] },
    ] },
  ];
}

/** Barra compacta: o grupo Imagem aparece com a imagem selecionada. */
export function pictureCompactGroup(env: WidgetEnv): BarGroup {
  const sel = (): boolean => typeof (env.ed as unknown as { selectedImage?: unknown }).selectedImage === 'function' && !!env.ed.selectedImage();
  return {
    id: 'picture', label: L('Picture', 'Imagem'), icon: 'image', prio: 7, items: [
      { menu: wrapMenu, id: 'pic:wrap', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', supports: sel },
      { menu: positionMenu, id: 'pic:position', label: L('Position', 'Posição'), icon: 'picture_in_picture', supports: sel },
      { menu: rotateMenu, id: 'pic:rotate', label: L('Rotate', 'Girar'), icon: 'rotate_90_degrees_cw', supports: sel },
      { menu: cropMenu, id: 'pic:crop', label: L('Crop', 'Cortar'), icon: 'crop', supports: sel },
      { menu: () => ['pic:forward', 'pic:front', 'pic:frontOfText', '-', 'pic:backward', 'pic:back', 'pic:behindText'], id: 'pic:order', label: L('Arrange', 'Organizar'), icon: 'layers', supports: sel },
      { cmd: 'pic:alt' },
      { cmd: 'pic:layout' },
    ],
  };
}

/** Formatar › Imagem (barra compacta) e o menu de contexto da imagem. */
export function pictureMenu(): MenuItem {
  return {
    id: 'pic:menu', label: L('Picture', 'Imagem'), icon: 'image',
    submenu: () => [
      { id: 'pic:wrapSub', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', submenu: wrapMenu },
      { id: 'pic:posSub', label: L('Position', 'Posição'), icon: 'picture_in_picture', submenu: positionMenu },
      { id: 'pic:rotSub', label: L('Rotate', 'Girar'), icon: 'rotate_90_degrees_cw', submenu: rotateMenu },
      { id: 'pic:cropSub', label: L('Crop', 'Cortar'), icon: 'crop', submenu: cropMenu },
      '-', 'pic:alt', 'pic:layout', '-', 'image:delete',
    ],
  };
}

/** Menu de contexto da imagem (clique direito numa imagem selecionada). */
export function pictureContextItems(): MenuEntry[] {
  return [
    'cut', 'copy', 'paste', '-',
    { id: 'pic:ctx:front', label: L('Bring to Front', 'Trazer para a Frente'), icon: 'flip_to_front', submenu: ['pic:front', 'pic:forward', 'pic:frontOfText'] },
    { id: 'pic:ctx:back', label: L('Send to Back', 'Enviar para Trás'), icon: 'flip_to_back', submenu: ['pic:back', 'pic:backward', 'pic:behindText'] },
    '-', 'link',
    { id: 'pic:ctx:wrap', label: L('Wrap Text', 'Quebra de Texto Automática'), icon: 'wrap_text', submenu: wrapMenu },
    'pic:alt', 'pic:layout', '-', 'image:delete',
  ];
}
