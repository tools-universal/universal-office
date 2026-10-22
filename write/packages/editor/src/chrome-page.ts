// Frente Página nas barras do Write: Cor da Página (paleta do tema, Mais Cores,
// Efeitos de Preenchimento), Marca-d'Água (galeria com miniaturas desenhadas pelo
// motor, Personalizada, Remover), Folha de Rosto (modelos próprios) e Página em
// Branco. Regras do Word medidas em write/tools/page-lab.
import {
  colorGrid, dialogTabs, openDialog, pickLabels, parseThemePick, STANDARD_COLORS, themePaletteColors,
  type BarContext, type Command, type CommandRegistry, type MenuEntry, type MenuItem, type UiLang,
} from '@universal-office/ui';
import { gradientTileRgba, patternRgba, type PageFillPaint } from '@universal-office/docx-layout';
import { oneColorGradientColor2, resolveColor2, WATERMARK_TEXTS, type WatermarkSpec } from '@universal-office/docx-core';
import { patternRows } from '@universal-office/drawingml';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import type { DialogEnv } from './chrome-dialogs.js';
import { gradientGeometry, GRADIENT_PRESETS, GRADIENT_VARIANTS, type GradientStyle, type PageFillInput } from './page-design.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

/** Comandos da frente Página (aparecem quando o método da API existe). */
export function registerPageCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const edit = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => canEdit() && c.isEnabled!() : canEdit });
  reg.add(
    edit({ id: 'page:noColor', label: L('No Color', 'Sem Cor'), icon: 'format_color_reset', supports: has('setPageColor'), run: () => ed.setPageColor(null) }),
    edit({ id: 'dlg:pageFill', label: L('Fill Effects…', 'Efeitos de Preenchimento…'), icon: 'gradient', supports: has('setPageFill'), run: () => ctl.pageBgDialog('fill') }),
    edit({ id: 'dlg:watermark', label: L('Custom Watermark…', 'Personalizar Marca-d\'Água…'), icon: 'branding_watermark', supports: has('setWatermark'), run: () => ctl.pageBgDialog('watermark') }),
    edit({ id: 'watermark:remove', label: L('Remove Watermark', 'Remover Marca-d\'Água'), icon: 'delete', supports: has('removeWatermark'), isEnabled: () => !!ed.watermark(), run: () => ed.removeWatermark() }),
    edit({ id: 'cover:remove', label: L('Remove Current Cover Page', 'Remover Folha de Rosto Atual'), icon: 'delete', supports: has('removeCoverPage'), isEnabled: () => ed.hasCoverPage(), run: () => { ed.removeCoverPage(); } }),
    edit({ id: 'blankPage', label: L('Blank Page', 'Página em Branco'), tip: L('Insert a new blank page at the cursor', 'Insere uma página em branco no cursor'), icon: 'note_add', supports: has('insertBlankPage'), run: () => ed.insertBlankPage() }),
  );
}

// ───────────────── menus ─────────────────

const cap = (ctx: BarContext, en: string, pt: string): HTMLElement => {
  const d = document.createElement('div');
  d.textContent = ctx.registry.text(L(en, pt));
  d.style.cssText = 'font-size:12px;opacity:.8;margin:6px 0 4px';
  return d;
};

/** Cor da Página: cores do tema (com a referência), padrão, Sem Cor, Mais Cores, Efeitos. */
export function pageColorMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const more: MenuItem = {
    id: 'page:moreColors', icon: 'palette', label: L('More Colors…', 'Mais Cores…'),
    onClick: () => {
      const input = document.createElement('input');
      input.type = 'color';
      const cur = env.ed.pageBackground()?.color;
      if (cur) input.value = `#${cur.toLowerCase()}`;
      input.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0';
      ctx.layer.appendChild(input);
      input.addEventListener('change', () => { env.ed.setPageColor(input.value.slice(1).toUpperCase()); input.remove(); ctx.after(); });
      input.addEventListener('blur', () => setTimeout(() => input.remove(), 1000));
      input.click();
    },
  };
  return [{
    content: (close) => {
      const colors = env.ed.documentThemeColors();
      const box = document.createElement('div');
      box.className = 'uw-page-color';
      const theme = colorGrid({
        colors: themePaletteColors(colors), columns: 10, close,
        onPick: (v) => {
          const p = parseThemePick(v, colors);
          if (!p) return;
          const frac = (h?: string): number | undefined => (h ? Math.round((1 - parseInt(h, 16) / 255) * 1000) / 1000 : undefined);
          const tint = frac(p.tint), shade = frac(p.shade);
          env.ed.setPageColor({ themeColor: p.themeColor, ...(tint !== undefined ? { tint } : {}), ...(shade !== undefined ? { shade } : {}) });
          ctx.after();
        },
      });
      const std = colorGrid({
        colors: STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` })), columns: 10, close,
        onPick: (h) => { env.ed.setPageColor(h); ctx.after(); },
      });
      box.append(cap(ctx, 'Theme Colors', 'Cores do Tema'), theme, cap(ctx, 'Standard Colors', 'Cores Padrão'), std);
      return box;
    },
  }, '-', 'page:noColor', more, 'dlg:pageFill'];
}

/** Galeria Marca-d'Água: os 12 itens (Confidencial, Avisos, Urgente) com miniaturas. */
export function watermarkMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  return [{
    content: (close) => {
      const box = document.createElement('div');
      box.className = 'uw-wm-gallery';
      box.style.cssText = 'padding:4px 6px;max-height:440px;overflow:auto';
      let cat = '';
      let grid: HTMLElement | null = null;
      for (const g of env.ed.watermarkGallery()) {
        if (g.categoryLabel !== cat) {
          cat = g.categoryLabel;
          const h = document.createElement('div');
          h.textContent = cat;
          h.style.cssText = 'font-size:12px;font-weight:600;opacity:.8;margin:8px 0 4px';
          grid = document.createElement('div');
          grid.style.cssText = 'display:grid;grid-template-columns:repeat(4, 88px);gap:6px';
          box.append(h, grid);
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset['watermark'] = g.id;
        b.title = g.label;
        b.setAttribute('aria-label', g.label);
        b.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:center;padding:4px;border-radius:6px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit';
        const cv = document.createElement('canvas');
        cv.style.cssText = 'display:block;border:1px solid rgba(127,127,127,.25);background:#fff';
        const t = document.createElement('span');
        t.textContent = g.label;
        t.style.cssText = 'font-size:10.5px;opacity:.8;max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
        b.append(cv, t);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { close(); env.ed.setWatermark(g.id); ctx.after(); });
        grid!.append(b);
        requestAnimationFrame(() => { env.ed.paintWatermarkTemplate(g.id, cv, 68); });
      }
      return box;
    },
  }, '-', 'dlg:watermark', 'watermark:remove'];
}

/** Galeria Folha de Rosto: os modelos próprios com miniaturas + Remover. */
export function coverPageMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  return [{
    content: (close) => {
      const grid = document.createElement('div');
      grid.className = 'uw-cover-gallery';
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(4, 88px);gap:8px;padding:6px;max-height:460px;overflow:auto';
      for (const c of env.ed.coverPages()) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset['cover'] = c.id;
        b.title = c.name;
        b.setAttribute('aria-label', c.name);
        b.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:center;padding:6px 4px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit';
        const cv = document.createElement('canvas');
        cv.style.cssText = 'display:block;border:1px solid rgba(127,127,127,.25);background:#fff';
        const t = document.createElement('span');
        t.textContent = c.name;
        t.style.cssText = 'font-size:12px;opacity:.85';
        b.append(cv, t);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { close(); env.ed.insertCoverPage(c.id); ctx.after(); });
        grid.append(b);
        requestAnimationFrame(() => { env.ed.paintCoverTemplate(c.id, cv, 74); });
      }
      return grid;
    },
  }, '-', 'cover:remove'];
}

// ───────────────── diálogos ─────────────────

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const radio = (name: string, value: string, label: string, on: boolean): HTMLLabelElement =>
  el('label', { className: 'uo-check' }, el('input', { type: 'radio', name, value, checked: on }), label);
const check = (name: string, label: string, on: boolean): HTMLLabelElement =>
  el('label', { className: 'uo-check' }, el('input', { type: 'checkbox', name, checked: on }), label);
const colorInput = (name: string, hex: string): HTMLInputElement => el('input', { type: 'color', name, value: `#${hex.toLowerCase()}`, style: 'width:56px;height:28px;padding:0 2px' });
const hexOf = (i: HTMLInputElement): string => i.value.slice(1).toUpperCase();

/** Pinta RGBA num canvas de w×h (CSS) — amostras do diálogo. */
function paintRgba(cv: HTMLCanvasElement, rgba: Uint8Array, w: number, h: number, cssW: number, cssH: number): void {
  cv.width = w; cv.height = h;
  cv.style.width = `${cssW}px`; cv.style.height = `${cssH}px`;
  const x = cv.getContext('2d')!;
  const id = x.createImageData(w, h);
  id.data.set(rgba);
  x.putImageData(id, 0, 0);
}

/** Extensão pelos bytes (a marca lida do cabeçalho não traz o nome do arquivo). */
const sniffExt = (d: Uint8Array): string =>
  d[0] === 0xff && d[1] === 0xd8 ? 'jpeg' : d[0] === 0x47 && d[1] === 0x49 ? 'gif' : d[0] === 0x42 && d[1] === 0x4d ? 'bmp' : 'png';

/** Arquivo de imagem escolhido (bytes, extensão, nome). */
function pickImage(onPick: (f: { data: Uint8Array; ext: string; name: string }) => void): void {
  const input = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/bmp', style: 'position:fixed;left:-100px;top:0;opacity:0' });
  document.body.append(input);
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    input.remove();
    if (!f) return;
    const data = new Uint8Array(await f.arrayBuffer());
    onPick({ data, ext: (f.name.split('.').pop() ?? 'png').toLowerCase(), name: f.name });
  });
  input.click();
}

const STYLES: readonly [GradientStyle, string, string][] = [
  ['horizontal', 'Horizontal', 'Horizontal'], ['vertical', 'Vertical', 'Vertical'],
  ['diagonalUp', 'Diagonal up', 'Diagonal para cima'], ['diagonalDown', 'Diagonal down', 'Diagonal para baixo'],
  ['fromCorner', 'From corner', 'Do canto'], ['fromCenter', 'From center', 'Do centro'],
];

/**
 * Efeitos de Preenchimento (Cor da Página): Gradiente (uma cor, duas cores,
 * predefinições próprias; estilos de sombreamento e variantes), Textura (imagem do
 * usuário em ladrilho), Padrão (os 48 com frente e fundo) e Imagem. As amostras são
 * desenhadas com o MESMO ladrilho do motor (page-fill.ts).
 */
export async function pageFillDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const opts = ed.pageFillOptions();
  const cur = ed.pageBackground();
  // ── Gradiente: estado inicial do fundo atual (estilo/variante pela geometria gravada) ──
  const f = cur?.fill;
  const isGrad = f?.type === 'gradient' || f?.type === 'gradientRadial';
  const oneM = /^\s*fill(?:\s+(darken|lighten)\((\d+)\))?\s*$/i.exec(f?.color2 ?? '');
  const cMode = isGrad && f?.colors ? 'preset' : isGrad && oneM ? 'one' : 'two';
  const color1 = f?.color ?? cur?.color ?? '4472C4';
  const c1 = colorInput('c1', color1);
  const c2 = colorInput('c2', isGrad && !oneM && f?.color2 ? resolveColor2(f.color2, color1) : 'FFFFFF');
  const deg0 = !oneM?.[1] ? 0.5 : oneM[1].toLowerCase() === 'darken' ? Number(oneM[2]) / 510 : 1 - Number(oneM[2]) / 510;
  const degree = el('input', { type: 'range', name: 'degree', min: '0', max: '1', step: '0.01', value: String(Math.round(deg0 * 100) / 100), style: 'width:140px' });
  const preset = el('select', { name: 'preset' });
  for (const p of opts.presets) preset.append(el('option', { value: p.id, textContent: p.name }));
  const curPreset = f?.colors ? opts.presets.find((p) => p.stops.length === f.colors!.length && p.stops.every((s, i) => s.color.toUpperCase() === f.colors![i]!.color.toUpperCase())) : undefined;
  if (curPreset) preset.value = curPreset.id;
  let style0: GradientStyle = 'horizontal', variant = 1;
  if (isGrad) {
    for (const [st] of STYLES) for (let v = 1; v <= GRADIENT_VARIANTS[st]; v++) {
      const g = gradientGeometry(st, v);
      const fp = (p?: [number, number]): string => (p ? p.join(',') : '');
      if (g.type === f!.type && (g.angle ?? 0) === (f!.angle ?? 0) && (g.focus ?? 0) === (f!.focus ?? 0) && !!g.gradientCenter === !!f!.gradientCenter && fp(g.focusPosition) === fp(f!.focusPosition)) { style0 = st; variant = v; }
    }
  }
  const modes = el('div', { style: 'display:flex;flex-direction:column;gap:6px' },
    radio('cmode', 'one', tr(lang, 'One color', 'Uma cor'), cMode === 'one'),
    radio('cmode', 'two', tr(lang, 'Two colors', 'Duas cores'), cMode === 'two'),
    radio('cmode', 'preset', tr(lang, 'Preset', 'Predefinição'), cMode === 'preset'));
  const colorsRow = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, tr(lang, 'Color 1', 'Cor 1')), c1,
    el('span', {}, tr(lang, 'Color 2', 'Cor 2')), c2,
    el('span', {}, tr(lang, 'Dark ↔ Light', 'Escuro ↔ Claro')), degree,
    el('span', {}, tr(lang, 'Preset colors', 'Cores predefinidas')), preset);
  const styles = el('div', { style: 'display:flex;flex-direction:column;gap:4px' },
    ...STYLES.map(([v, en, pt]) => radio('gstyle', v, tr(lang, en, pt), v === style0)));
  const variants = el('div', { style: 'display:grid;grid-template-columns:repeat(2, auto);gap:6px' });
  const sample = el('canvas', { style: 'border:1px solid rgba(127,127,127,.4)' });
  const gStyle = (): GradientStyle => (styles.querySelector<HTMLInputElement>('input:checked')?.value ?? 'horizontal') as GradientStyle;
  const cmode = (): 'one' | 'two' | 'preset' => (modes.querySelector<HTMLInputElement>('input:checked')?.value ?? 'two') as 'one' | 'two' | 'preset';
  const paintOf = (style: GradientStyle, v: number): PageFillPaint => {
    const geo = gradientGeometry(style, v);
    const m = cmode();
    const pre = GRADIENT_PRESETS.find((p) => p.id === preset.value) ?? GRADIENT_PRESETS[0]!;
    const a = m === 'preset' ? pre.stops[0]!.color : hexOf(c1);
    const b = m === 'one' ? resolveColor2(oneColorGradientColor2(Number(degree.value)), a) : m === 'two' ? hexOf(c2) : pre.stops[pre.stops.length - 1]!.color;
    return { type: geo.type as 'gradient', c1: a, c2: b, angle: geo.angle ?? 0, focus: geo.focus ?? 0, ...(geo.focusPosition ? { focusPosition: geo.focusPosition } : {}), ...(geo.gradientCenter ? { gradientCenter: true } : {}), ...(m === 'preset' ? { stops: pre.stops } : {}) };
  };
  const refreshGradient = (): void => {
    const m = cmode();
    c2.disabled = m !== 'two';
    degree.disabled = m !== 'one';
    preset.disabled = m !== 'preset';
    c1.disabled = m === 'preset';
    const style = gStyle();
    const n = GRADIENT_VARIANTS[style];
    if (variant > n) variant = 1;
    variants.replaceChildren();
    for (let v = 1; v <= n; v++) {
      const cv = el('canvas', { style: `cursor:pointer;border:2px solid ${v === variant ? 'var(--u-color-primary,#005bc0)' : 'transparent'}` });
      cv.title = `${tr(lang, 'Variant', 'Variante')} ${v}`;
      paintRgba(cv, gradientTileRgba(paintOf(style, v), 64, 48), 64, 48, 64, 48);
      cv.addEventListener('click', () => { variant = v; refreshGradient(); });
      variants.append(cv);
    }
    paintRgba(sample, gradientTileRgba(paintOf(style, variant), 96, 72), 96, 72, 96, 72);
  };
  const gradBody = el('div', { style: 'display:grid;grid-template-columns:auto auto;gap:14px 18px;align-items:start' },
    el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, el('strong', {}, tr(lang, 'Colors', 'Cores')), modes, colorsRow),
    el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, el('strong', {}, tr(lang, 'Sample', 'Amostra')), sample),
    el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, el('strong', {}, tr(lang, 'Shading styles', 'Estilos de sombreamento')), styles),
    el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, el('strong', {}, tr(lang, 'Variants', 'Variações')), variants));
  gradBody.addEventListener('change', refreshGradient);
  degree.addEventListener('input', refreshGradient);
  // ── Padrão ──
  const isPat = f?.type === 'pattern';
  let pattern = (isPat ? opts.patterns.find((p) => p.name === f!.title?.trim())?.id : undefined) ?? opts.patterns[0]!.id;
  const fg = colorInput('fg', isPat && f!.color ? f!.color : '000000'), bg = colorInput('bg', isPat ? resolveColor2(f!.color2, f!.color ?? '000000') : 'FFFFFF');
  const patGrid = el('div', { style: 'display:grid;grid-template-columns:repeat(8, auto);gap:4px' });
  const patSample = el('canvas', { style: 'border:1px solid rgba(127,127,127,.4);image-rendering:pixelated' });
  const patName = el('span', { style: 'font-size:12px;opacity:.85' });
  const patPaint = (prst: string): PageFillPaint => ({ type: 'pattern', c1: hexOf(fg), c2: hexOf(bg), angle: 0, focus: 0, pattern: patternRows(prst) ?? [] });
  const tileRgba = (rgba8: Uint8Array, reps: number): Uint8Array => {
    const n = 8 * reps, out = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.set(rgba8.subarray(((y % 8) * 8 + (x % 8)) * 4, ((y % 8) * 8 + (x % 8)) * 4 + 4), (y * n + x) * 4);
    return out;
  };
  const refreshPattern = (): void => {
    patGrid.replaceChildren();
    for (const p of opts.patterns) {
      const cv = el('canvas', { style: `cursor:pointer;image-rendering:pixelated;border:2px solid ${p.id === pattern ? 'var(--u-color-primary,#005bc0)' : 'rgba(127,127,127,.3)'}` });
      cv.title = p.name;
      paintRgba(cv, tileRgba(patternRgba(patPaint(p.id)), 3), 24, 24, 24, 24);
      cv.addEventListener('click', () => { pattern = p.id; refreshPattern(); });
      patGrid.append(cv);
    }
    patName.textContent = opts.patterns.find((p) => p.id === pattern)?.name ?? '';
    paintRgba(patSample, tileRgba(patternRgba(patPaint(pattern)), 12), 96, 96, 96, 96);
  };
  const patBody = el('div', { style: 'display:flex;flex-direction:column;gap:10px' },
    el('strong', {}, tr(lang, 'Pattern', 'Padrão')), patGrid, patName,
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Foreground', 'Primeiro plano')), fg, el('span', {}, tr(lang, 'Background', 'Plano de fundo')), bg),
    el('strong', {}, tr(lang, 'Sample', 'Amostra')), patSample);
  fg.addEventListener('input', refreshPattern);
  bg.addEventListener('input', refreshPattern);
  // ── Textura e Imagem (arquivo do usuário) ──
  const files: Record<'texture' | 'picture', { data: Uint8Array; ext: string; name: string } | null> = { texture: null, picture: null };
  const imgPane = (kind: 'texture' | 'picture'): HTMLElement => {
    const prev = el('img', { alt: '', style: 'max-width:280px;max-height:180px;border:1px solid rgba(127,127,127,.4);display:none' });
    const name = el('span', { style: 'font-size:12px;opacity:.85' });
    const btn = el('button', { type: 'button', className: 'uo-pill', textContent: kind === 'texture' ? tr(lang, 'Other Texture…', 'Outra Textura…') : tr(lang, 'Select Picture…', 'Selecionar Imagem…') });
    btn.addEventListener('click', () => pickImage((file) => {
      files[kind] = file;
      name.textContent = file.name;
      prev.src = URL.createObjectURL(new Blob([file.data.slice().buffer as ArrayBuffer]));
      prev.style.display = 'block';
    }));
    const note = kind === 'texture'
      ? tr(lang, 'The image repeats across the page at its natural size.', 'A imagem se repete pela página no tamanho natural.')
      : tr(lang, 'The picture repeats across the page, as in the desktop app.', 'A imagem se repete pela página, como no aplicativo de mesa.');
    return el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:flex-start' }, btn, name, prev, el('span', { style: 'font-size:12px;opacity:.7' }, note));
  };
  const tabs = dialogTabs([
    { id: 'gradient', label: tr(lang, 'Gradient', 'Gradiente'), body: gradBody },
    { id: 'texture', label: tr(lang, 'Texture', 'Textura'), body: imgPane('texture') },
    { id: 'pattern', label: tr(lang, 'Pattern', 'Padrão'), body: patBody },
    { id: 'picture', label: tr(lang, 'Picture', 'Imagem'), body: imgPane('picture') },
  ], cur?.fill?.type === 'pattern' ? 'pattern' : cur?.fill?.type === 'tile' ? 'texture' : cur?.fill?.type === 'frame' ? 'picture' : 'gradient');
  const h = openDialog({ title: tr(lang, 'Fill Effects', 'Efeitos de Preenchimento'), icon: 'gradient', body: tabs.el, layer: env.layer, lang, width: 560,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  refreshGradient();
  refreshPattern();
  if ((await h.result) !== 'ok') return;
  let input: PageFillInput | null = null;
  switch (tabs.current()) {
    case 'gradient': {
      const m = cmode(), style = gStyle();
      input = m === 'one' ? { type: 'gradient', colors: 'one', color: hexOf(c1), degree: Number(degree.value), style, variant }
        : m === 'two' ? { type: 'gradient', colors: 'two', color: hexOf(c1), color2: hexOf(c2), style, variant }
        : { type: 'gradient', colors: 'preset', preset: preset.value, style, variant };
      break;
    }
    case 'pattern': input = { type: 'pattern', pattern, color: hexOf(fg), background: hexOf(bg) }; break;
    case 'texture': if (files.texture) input = { type: 'texture', ...files.texture }; break;
    case 'picture': if (files.picture) input = { type: 'picture', ...files.picture }; break;
  }
  if (input) ed.setPageFill(input);
}

/**
 * Marca-d'Água Personalizada: Sem marca-d'água, Imagem (escala, desbotar) ou Texto
 * (idioma, texto, fonte, tamanho, cor, semitransparente, diagonal/horizontal) —
 * Aplicar mantém o diálogo aberto, como no Word.
 */
export async function watermarkDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const cur = ed.watermark();
  const none = radio('wmkind', 'none', tr(lang, 'No watermark', 'Sem marca-d\'água'), !cur);
  const pic = radio('wmkind', 'picture', tr(lang, 'Picture watermark', 'Marca-d\'água de imagem'), cur?.kind === 'picture');
  const txt = radio('wmkind', 'text', tr(lang, 'Text watermark', 'Marca-d\'água de texto'), cur?.kind === 'text');
  // imagem
  let image: { data: Uint8Array; ext: string; name: string } | null = cur?.kind === 'picture' && cur.image ? { data: cur.image, ext: sniffExt(cur.image), name: cur.title } : null;
  const picName = el('span', { style: 'font-size:12px;opacity:.85', textContent: image?.name ?? '' });
  const picBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Select Picture…', 'Selecionar Imagem…') });
  picBtn.addEventListener('click', () => pickImage((f) => { image = f; picName.textContent = f.name; (pic.querySelector('input')!).checked = true; sync(); }));
  const scale = el('select', { name: 'scale' });
  for (const [v, t] of [['auto', tr(lang, 'Auto', 'Automático')], ['500', '500%'], ['200', '200%'], ['150', '150%'], ['100', '100%'], ['50', '50%']] as const) scale.append(el('option', { value: v, textContent: t }));
  const washout = check('washout', tr(lang, 'Washout', 'Desbotar'), cur?.kind === 'picture' ? cur.washout : true);
  // texto
  const langSel = el('select', { name: 'wmlang' });
  for (const [v, t] of [['pt', 'Português (Brasil)'], ['en', tr(lang, 'English (United States)', 'Inglês (Estados Unidos)')]] as const) langSel.append(el('option', { value: v, textContent: t }));
  langSel.value = cur?.kind === 'text' && cur.lang ? (cur.lang.toLowerCase().startsWith('pt') ? 'pt' : 'en') : lang;
  const list = el('datalist', { id: 'uw-wm-texts' });
  // o diálogo do Word abre com o 1º texto da lista (ASAP)
  const text = el('input', { type: 'text', name: 'wmtext', value: cur?.kind === 'text' ? cur.text : (WATERMARK_TEXTS[langSel.value as UiLang][0] ?? ''), style: 'width:220px' });
  text.setAttribute('list', 'uw-wm-texts');
  const fillTexts = (): void => list.replaceChildren(...WATERMARK_TEXTS[langSel.value as 'en' | 'pt'].map((t) => el('option', { value: t })));
  fillTexts();
  langSel.addEventListener('change', fillTexts);
  const font = el('select', { name: 'wmfont', style: 'width:220px' });
  // o nome da fonte não diferencia maiúsculas (a galeria grava "calibri")
  const known = ed.knownFontFamilies();
  const want = cur?.kind === 'text' ? cur.font : 'Calibri';
  const font0 = known.find((k) => k.toLowerCase() === want.toLowerCase()) ?? want;
  for (const f of [...new Set([font0, ...known])]) font.append(el('option', { value: f, textContent: f }));
  font.value = font0;
  const size = el('select', { name: 'wmsize' });
  for (const s of ['auto', '36', '40', '44', '48', '54', '60', '66', '72', '80', '90', '96', '105', '120', '144']) size.append(el('option', { value: s, textContent: s === 'auto' ? tr(lang, 'Auto', 'Automático') : s }));
  size.value = cur?.kind === 'text' && cur.sizePt ? String(cur.sizePt) : 'auto';
  const color = colorInput('wmcolor', cur?.kind === 'text' ? cur.color : 'C0C0C0');
  const semi = check('semi', tr(lang, 'Semitransparent', 'Semitransparente'), cur?.kind === 'text' ? cur.semitransparent : true);
  const diag = radio('wmlayout', 'diagonal', tr(lang, 'Diagonal', 'Diagonal'), cur?.kind !== 'text' || cur.layout === 'diagonal');
  const horiz = radio('wmlayout', 'horizontal', tr(lang, 'Horizontal', 'Horizontal'), cur?.kind === 'text' && cur.layout === 'horizontal');
  const picPane = el('div', { className: 'uo-dialog-grid', style: 'padding-left:24px' },
    el('span', {}, ''), el('div', { style: 'display:flex;gap:8px;align-items:center' }, picBtn, picName),
    el('span', {}, tr(lang, 'Scale', 'Escala')), el('div', { style: 'display:flex;gap:12px;align-items:center' }, scale, washout));
  const txtPane = el('div', { className: 'uo-dialog-grid', style: 'padding-left:24px' },
    el('span', {}, tr(lang, 'Language', 'Idioma')), langSel,
    el('span', {}, tr(lang, 'Text', 'Texto')), el('div', {}, text, list),
    el('span', {}, tr(lang, 'Font', 'Fonte')), font,
    el('span', {}, tr(lang, 'Size', 'Tamanho')), size,
    el('span', {}, tr(lang, 'Color', 'Cor')), el('div', { style: 'display:flex;gap:12px;align-items:center' }, color, semi),
    el('span', {}, tr(lang, 'Layout', 'Layout')), el('div', { style: 'display:flex;gap:12px' }, diag, horiz));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, none, pic, picPane, txt, txtPane);
  const kind = (): string => body.querySelector<HTMLInputElement>('input[name="wmkind"]:checked')?.value ?? 'none';
  const sync = (): void => {
    for (const x of picPane.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button')) x.disabled = kind() !== 'picture';
    for (const x of txtPane.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')) x.disabled = kind() !== 'text';
  };
  body.addEventListener('change', sync);
  sync();
  const apply = (): void => {
    const k = kind();
    if (k === 'none') { ed.removeWatermark(); return; }
    if (k === 'picture') {
      if (!image) return;
      ed.setWatermark({ kind: 'picture', data: image.data, ext: image.ext, title: image.name.replace(/\.[^.]+$/, ''), washout: (washout.querySelector('input')!).checked, ...(scale.value !== 'auto' ? { scale: Number(scale.value) } : {}) });
      return;
    }
    if (!text.value.trim()) return;
    const spec: WatermarkSpec = {
      kind: 'text', text: text.value.trim(), font: font.value || 'Calibri', color: hexOf(color),
      semitransparent: (semi.querySelector('input')!).checked,
      layout: (body.querySelector<HTMLInputElement>('input[name="wmlayout"]:checked')?.value ?? 'diagonal') as 'diagonal',
      lang: langSel.value === 'pt' ? 'pt-BR' : 'en-US',
      ...(size.value !== 'auto' ? { sizePt: Number(size.value) } : {}),
    };
    ed.setWatermark(spec);
  };
  const h = openDialog({
    title: tr(lang, 'Printed Watermark', 'Marca-d\'água Impressa'), icon: 'branding_watermark', body, layer: env.layer, lang, width: 480,
    actions: [{ id: 'apply', label: tr(lang, 'Apply', 'Aplicar') }, { id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }],
    onAction: (id) => { if (id === 'apply') { apply(); return false; } return undefined; },
  });
  if ((await h.result) !== 'ok') return;
  apply();
}
