// Grupo AJUSTAR da guia Formato da Imagem: Correções (Nitidez/Suavizar e
// Brilho/Contraste), Cor (Saturação, Tom, Recolorir, Mais Variações, Definir Cor
// Transparente), Transparência, Compactar Imagens, Alterar Imagem e Redefinir
// Imagem. As miniaturas são a PRÓPRIA imagem selecionada com o ajuste aplicado
// pelos mesmos caminhos do desenho (@universal-office/drawingml e applyBlipFx).
import { colorGrid, themePaletteColors, STANDARD_COLORS, tileGrid, type BarContext, type Command, type CommandRegistry, type GalleryItem, type Lbl, type MenuEntry, type RibbonCell } from '@universal-office/ui';
import { adjustBrightnessContrast, adjustSaturation, adjustSharpen, adjustTemperature } from '@universal-office/drawingml';
import { applyBlipFx } from '@universal-office/docx-layout';
import type { PicBlipFx, Theme } from '@universal-office/docx-core';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import { dmlFromPick } from './chrome-picture.js';
import { SATURATION_PRESETS, TEMPERATURE_PRESETS, SHARPEN_PRESETS, BRIGHT_CONTRAST_STEPS, TRANSPARENCY_PRESETS, RECOLOR_PRESETS } from './picture-ops.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });
const pctText = (v: number): string => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
type Fx = (d: Uint8ClampedArray, w: number, h: number) => void;

/** Comandos do grupo Ajustar (os itens simples; as galerias são menus). */
export function registerPictureAdjustCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const on = (): boolean => !app.comparing && !ed.isProtected() && typeof api['selectedImage'] === 'function' && !!ed.selectedImage();
  const p = (c: Command): Command => ({ ...c, isEnabled: on });
  reg.add(
    p({ id: 'pic:compress', label: L('Compress Pictures', 'Compactar Imagens'), icon: 'compress', supports: has('compressImages'), run: () => ctl.pictureDialog('compress') }),
    p({ id: 'pic:change:file', label: L('From a File…', 'De um Arquivo...'), icon: 'upload_file', supports: has('changeImageFromFile'), run: () => ed.changeImageFromFile() }),
    p({ id: 'pic:change:clip', label: L('From Clipboard', 'Da Área de Transferência'), icon: 'content_paste', supports: has('changeImageFromClipboard'), run: () => ed.changeImageFromClipboard() }),
    p({ id: 'pic:reset', label: L('Reset Picture', 'Redefinir Imagem'), icon: 'restart_alt', supports: has('resetImage'), run: () => ed.resetImage(false) }),
    p({ id: 'pic:resetSize', label: L('Reset Picture & Size', 'Redefinir Imagem e Tamanho'), icon: 'restart_alt', supports: has('resetImage'), run: () => ed.resetImage(true) }),
    p({ id: 'pic:transparentColor', label: L('Set Transparent Color', 'Definir Cor Transparente'), icon: 'colorize', supports: has('startTransparentColorPick'), run: () => ed.startTransparentColorPick() }),
  );
}

function docTheme(env: WidgetEnv): Theme {
  return { major: { scripts: {} }, minor: { scripts: {} }, colors: env.ed.documentThemeColors() };
}

/** Miniatura: a prévia da imagem com um ajuste nos pixels (xadrez atrás quando
 *  fica transparente, como o Word). */
function previewTile(env: WidgetEnv, tile: HTMLElement, fn: Fx | null): void {
  const p = env.ed.selectedImagePreview(64, 52);
  const c = document.createElement('canvas');
  c.style.cssText = 'max-width:64px;max-height:52px;display:block;margin:auto';
  if (p) {
    c.width = p.width; c.height = p.height;
    const d = new Uint8ClampedArray(p.data);
    if (fn) fn(d, p.width, p.height);
    c.getContext('2d')!.putImageData(new ImageData(d, p.width, p.height), 0, 0);
    let clear = false;
    for (let i = 3; i < d.length && !clear; i += 4) clear = d[i]! < 250;
    if (clear) c.style.background = 'repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px';
  }
  tile.replaceChildren(c);
}

function grid(env: WidgetEnv, ctx: BarContext, sections: { label?: Lbl; items: GalleryItem[] }[], fx: (id: string) => Fx | null, pick: (id: string) => void, selected: string | undefined, cols: number) {
  return (close: () => void): HTMLElement => tileGrid({
    sections, tile: { w: 72, h: 60 }, cols, text: (l) => ctx.registry.text(l), close, ...(selected ? { selected } : {}),
    render: (tile, it) => previewTile(env, tile, fx(it.id)),
    onPick: (id) => { pick(id); ctx.after(); },
  });
}

/** Correções: 5 de Nitidez/Suavizar e a grade 5×5 de Brilho/Contraste. */
export function correctionsMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const a = ed.selectedImage()?.format.blip.a14;
  const sel = a?.sharpen ? `sh:${a.sharpen / 100000}` : `bc:${(a?.bright ?? 0) / 100000}:${(a?.contrast ?? 0) / 100000}`;
  const sharpLabel = (v: number): Lbl => (v === 0 ? L('Sharpen: 0%', 'Nitidez: 0%') : v < 0 ? L(`Soften: ${-v / 1000}%`, `Suavizar: ${-v / 1000}%`) : L(`Sharpen: ${v / 1000}%`, `Nitidez: ${v / 1000}%`));
  return [{
    content: grid(env, ctx, [
      { label: L('Sharpen/Soften', 'Nitidez/Suavizar'), items: SHARPEN_PRESETS.map((v) => ({ id: `sh:${v / 100000}`, label: sharpLabel(v) })) },
      {
        label: L('Brightness/Contrast', 'Brilho/Contraste'),
        items: BRIGHT_CONTRAST_STEPS.flatMap((c) => BRIGHT_CONTRAST_STEPS.map((b) => ({
          id: `bc:${b / 100000}:${c / 100000}`,
          label: L(`Brightness: ${pctText(b / 100000)} Contrast: ${pctText(c / 100000)}`, `Brilho: ${pctText(b / 100000)} Contraste: ${pctText(c / 100000)}`),
        }))),
      },
    ], (id) => {
      const [k, x, y] = id.split(':');
      if (k === 'sh') return (d, w, h) => adjustSharpen(d, w, h, Number(x));
      return (d) => adjustBrightnessContrast(d, Number(x), Number(y));
    }, (id) => {
      const [k, x, y] = id.split(':');
      void (k === 'sh' ? ed.setImageAdjust({ sharpen: Number(x) }) : ed.setImageAdjust({ bright: Number(x), contrast: Number(y) })).then(() => ctx.after());
    }, sel, 5),
  }];
}

/** Cor: Saturação (7), Tom (7), Recolorir (21), Mais Variações e Definir Cor Transparente. */
export function colorMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const theme = docTheme(env);
  const a = ed.selectedImage()?.format.blip.a14;
  const blip = ed.selectedImage()?.format.blip;
  const recolorNow = RECOLOR_PRESETS.find((p) => p.id !== 'none' && JSON.stringify(p.fx) === JSON.stringify({ ...(blip?.grayscl ? { grayscl: true } : {}), ...(blip?.duotone ? { duotone: blip.duotone } : {}), ...(blip?.lum ? { lum: blip.lum } : {}), ...(blip?.biLevel !== undefined ? { biLevel: blip.biLevel } : {}) }));
  const sel = a?.saturation !== undefined ? `sat:${a.saturation}` : a?.colorTemp !== undefined ? `temp:${a.colorTemp}` : recolorNow ? `re:${recolorNow.id}` : 'sat:100000';
  return [
    {
      content: grid(env, ctx, [
        { label: L('Color Saturation', 'Saturação da Cor'), items: SATURATION_PRESETS.map((v) => ({ id: `sat:${v}`, label: L(`Saturation: ${v / 1000}%`, `Saturação: ${v / 1000}%`) })) },
        { label: L('Color Tone', 'Tom da Cor'), items: TEMPERATURE_PRESETS.map((v) => ({ id: `temp:${v}`, label: L(`Temperature: ${v} K`, `Temperatura: ${v} K`) })) },
        { label: L('Recolor', 'Recolorir'), items: RECOLOR_PRESETS.map((p) => ({ id: `re:${p.id}`, label: p.label })) },
      ], (id) => {
        const [k, v] = id.split(':') as [string, string];
        if (k === 'sat') return (d) => adjustSaturation(d, Number(v) / 100000);
        if (k === 'temp') return (d) => adjustTemperature(d, Number(v));
        const fx: PicBlipFx | undefined = RECOLOR_PRESETS.find((x) => x.id === v)?.fx;
        return fx ? (d) => applyBlipFx(d, fx, theme) : null;
      }, (id) => {
        const [k, v] = id.split(':') as [string, string];
        if (k === 'sat') void ed.setImageAdjust({ saturation: Number(v) / 100000 }).then(() => ctx.after());
        else if (k === 'temp') void ed.setImageAdjust({ temperature: Number(v) }).then(() => ctx.after());
        else ed.setImageRecolor(v);
      }, sel, 7),
    },
    '-',
    {
      id: 'pic:color:more', label: L('More Variations', 'Mais Variações'), icon: 'palette',
      submenu: () => [{
        content: (close) => colorGrid({
          colors: [...themePaletteColors(theme.colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))], columns: 10, close,
          onPick: (v) => { ed.setImageRecolor(dmlFromPick(v, theme.colors)); ctx.after(); },
        }),
      }],
    },
    'pic:transparentColor',
  ];
}

/** Transparência: 0, 15, 30, 50, 65, 80, 95 %. */
export function transparencyMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const theme = docTheme(env);
  const sel = `t:${Math.round(100 - (ed.selectedImage()?.format.blip.alphaModFix ?? 100000) / 1000)}`;
  return [{
    content: grid(env, ctx, [
      { items: TRANSPARENCY_PRESETS.map((v) => ({ id: `t:${v}`, label: L(`Transparency: ${v}%`, `Transparência: ${v}%`) })) },
    ], (id) => (d) => applyBlipFx(d, { alphaModFix: (100 - Number(id.slice(2))) * 1000 }, theme), (id) => ed.setImageTransparency(Number(id.slice(2))), sel, 7),
  }];
}

/** Células do grupo Ajustar (ribbon). */
export function adjustCells(env: WidgetEnv, ctx: BarContext): RibbonCell[] {
  const api = env.ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const editable = (): boolean => !env.ed.isProtected();
  return [
    { menu: () => correctionsMenu(env, ctx), id: 'pic:corrections', label: L('Corrections', 'Correções'), icon: 'tune', size: 'large', supports: has('setImageAdjust'), isEnabled: editable },
    { menu: () => colorMenu(env, ctx), id: 'pic:color', label: L('Color', 'Cor'), icon: 'palette', size: 'large', supports: has('setImageRecolor'), isEnabled: editable },
    { menu: () => transparencyMenu(env, ctx), id: 'pic:transparency', label: L('Transparency', 'Transparência'), icon: 'opacity', size: 'large', supports: has('setImageTransparency'), isEnabled: editable },
    { rows: [
      [{ cmd: 'pic:compress', label: true }],
      [{ menu: ['pic:change:file', 'pic:change:clip'], id: 'pic:change', label: L('Change Picture', 'Alterar Imagem'), icon: 'swap_horiz', showLabel: true, supports: has('changeImage'), isEnabled: editable }],
      [{ split: 'pic:reset', menu: ['pic:reset', 'pic:resetSize'], label: true }],
    ] },
  ];
}
