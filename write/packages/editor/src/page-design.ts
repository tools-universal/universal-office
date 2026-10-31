/**
 * Plano de Fundo da Página (guia Design): os efeitos de preenchimento da Cor da
 * Página como o Word os grava (oráculo write/tools/page-lab, page-oracle2: cada
 * estilo/variante do diálogo Efeitos de Preenchimento → atributos do v:fill) e as
 * predefinições de gradiente PRÓPRIAS (as do Word são dele; como o LibreOffice,
 * um conjunto nosso, com nomes nossos).
 */
import type { UiLang } from '@universal-office/ui';
import { oneColorGradientColor2, WORD_PATTERNS, type PageBackground, type PageFill } from '@universal-office/docx-core';

export type GradientStyle = 'horizontal' | 'vertical' | 'diagonalUp' | 'diagonalDown' | 'fromCorner' | 'fromCenter';

/** Cor do tema para a Cor da Página (paleta: tom/sombra de −1..1, como o Word). */
export interface ThemeColorRef { themeColor: string; tint?: number; shade?: number }

/** Efeito de preenchimento pedido pelo diálogo (ou pela API). */
export type PageFillInput =
  | { type: 'gradient'; colors: 'one'; color: string; /** 0 = escuro … 1 = claro */ degree: number; style: GradientStyle; variant: number }
  | { type: 'gradient'; colors: 'two'; color: string; color2: string; style: GradientStyle; variant: number }
  | { type: 'gradient'; colors: 'preset'; preset: string; style: GradientStyle; variant: number }
  | { type: 'pattern'; pattern: string; color: string; background: string }
  | { type: 'picture' | 'texture'; data: Uint8Array; ext: string; name: string };

/** Cor da Página atual (para a interface). */
export interface PageBackgroundInfo {
  color?: string;
  themeColor?: string;
  tint?: number;
  shade?: number;
  fill?: Omit<PageFill, 'image'> & { hasImage?: boolean };
  /** a tela mostra o fundo (w:displayBackgroundShape) */
  shown: boolean;
}

/** Variantes por estilo (o diálogo do Word: 4, só "do centro" tem 2). */
export const GRADIENT_VARIANTS: Readonly<Record<GradientStyle, number>> = {
  horizontal: 4, vertical: 4, diagonalUp: 4, diagonalDown: 4, fromCorner: 4, fromCenter: 2,
};

/**
 * Geometria do v:fill de cada estilo/variante, como o Word grava (pc-grad2-*):
 * horizontal sem ângulo (foco 100, 0, 50, −50); vertical −90 (100, 0, −50, 50);
 * diagonal para cima −135 (100, 0, −50, 50); para baixo −45 (0, 100, −50, 50); do
 * canto radial + gradientCenter com focusposition (—, "1", ",1", "1,1"); do centro
 * radial com focusposition .5,.5 (100, 0).
 */
export function gradientGeometry(style: GradientStyle, variant: number): Pick<PageFill, 'type' | 'angle' | 'focus' | 'focusPosition' | 'gradientCenter'> {
  const v = Math.max(1, Math.min(GRADIENT_VARIANTS[style], Math.round(variant))) - 1;
  const pick = <T>(arr: readonly T[]): T => arr[v]!;
  switch (style) {
    case 'horizontal': return { type: 'gradient', focus: pick([100, 0, 50, -50]) };
    case 'vertical': return { type: 'gradient', angle: -90, focus: pick([100, 0, -50, 50]) };
    case 'diagonalUp': return { type: 'gradient', angle: -135, focus: pick([100, 0, -50, 50]) };
    case 'diagonalDown': return { type: 'gradient', angle: -45, focus: pick([0, 100, -50, 50]) };
    case 'fromCorner': {
      const fp = pick<[number, number] | undefined>([undefined, [1, 0], [0, 1], [1, 1]]);
      return { type: 'gradientRadial', focus: 100, gradientCenter: true, ...(fp ? { focusPosition: fp } : {}) };
    }
    case 'fromCenter': return { type: 'gradientRadial', focusPosition: [0.5, 0.5], focus: pick([100, 0]) };
  }
}

/** Predefinições PRÓPRIAS (paradas em sRGB, como as do Word com method="none"). */
export const GRADIENT_PRESETS: readonly { id: string; name: { en: string; pt: string; es: string }; stops: { pos: number; color: string }[] }[] = [
  { id: 'mist', name: { en: 'Mist', pt: 'Névoa', es: 'Niebla' }, stops: [{ pos: 0, color: 'EEF2F7' }, { pos: 1, color: 'B8C6D9' }] },
  { id: 'sand', name: { en: 'Sand', pt: 'Areia', es: 'Arena' }, stops: [{ pos: 0, color: 'FBF3E4' }, { pos: 0.6, color: 'EAD6B0' }, { pos: 1, color: 'C9A66B' }] },
  { id: 'lavender', name: { en: 'Lavender', pt: 'Lavanda', es: 'Lavanda' }, stops: [{ pos: 0, color: 'F4EEFB' }, { pos: 1, color: 'B9A2DD' }] },
  { id: 'mint', name: { en: 'Mint', pt: 'Menta', es: 'Menta' }, stops: [{ pos: 0, color: 'EAF8F1' }, { pos: 1, color: '8FD3B6' }] },
  { id: 'coral', name: { en: 'Coral', pt: 'Coral', es: 'Coral' }, stops: [{ pos: 0, color: 'FFF1EC' }, { pos: 0.5, color: 'FFB49A' }, { pos: 1, color: 'E8735A' }] },
  { id: 'slate', name: { en: 'Slate', pt: 'Ardósia', es: 'Pizarra' }, stops: [{ pos: 0, color: '5B6B7F' }, { pos: 1, color: '1F2A38' }] },
  { id: 'aurora', name: { en: 'Aurora', pt: 'Aurora', es: 'Aurora' }, stops: [{ pos: 0, color: '163A5F' }, { pos: 0.45, color: '1D8C82' }, { pos: 1, color: 'B9E77A' }] },
  { id: 'citrus', name: { en: 'Citrus', pt: 'Cítrico', es: 'Cítrico' }, stops: [{ pos: 0, color: 'FFF9C4' }, { pos: 0.5, color: 'FFD54F' }, { pos: 1, color: 'FF9F43' }] },
];

/** O v:fill (e a cor da página) de um efeito pedido. `patternGif`/`title` vêm do chamador. */
export function pageFillFrom(input: PageFillInput, lang: UiLang, patternGif: (prst: string) => Uint8Array | null): PageBackground | null {
  if (input.type === 'pattern') {
    const p = WORD_PATTERNS.find((x) => x.prst === input.pattern);
    const gif = patternGif(input.pattern);
    if (!p || !gif) return null;
    return { color: input.color, fill: { type: 'pattern', color: input.color, color2: `#${input.background.toLowerCase()}`, title: p.title[lang], image: { data: gif, ext: 'gif' } } };
  }
  if (input.type === 'picture' || input.type === 'texture') {
    const ext = input.ext.toLowerCase() === 'jpg' ? 'jpeg' : input.ext.toLowerCase();
    return { fill: { type: input.type === 'picture' ? 'frame' : 'tile', title: input.name.replace(/\.[^.]+$/, ''), image: { data: input.data, ext } } };
  }
  if (input.type !== 'gradient') return null;
  const geo = gradientGeometry(input.style, input.variant);
  if (input.colors === 'one') {
    return { color: input.color, fill: { ...geo, color: input.color, color2: oneColorGradientColor2(input.degree), method: 'linear sigma' } };
  }
  if (input.colors === 'two') {
    return { color: input.color, fill: { ...geo, color: input.color, color2: `#${input.color2.toLowerCase()}` } };
  }
  const pre = GRADIENT_PRESETS.find((p) => p.id === input.preset) ?? GRADIENT_PRESETS[0]!;
  const first = pre.stops[0]!.color, last = pre.stops[pre.stops.length - 1]!.color;
  return { color: first, fill: { ...geo, color: first, color2: `#${last.toLowerCase()}`, colors: pre.stops, method: 'none' } };
}

/** Tom/sombra da paleta (−1..1) → w:themeTint / w:themeShade (hex de 2 dígitos, como o Word: 0,8 → 33; −0,25 → BF). */
export function themeTintShade(ref: ThemeColorRef): { themeTint?: string; themeShade?: string } {
  const hex = (v: number): string => Math.round(Math.max(0, Math.min(255, v))).toString(16).toUpperCase().padStart(2, '0');
  if (ref.tint && ref.tint > 0) return { themeTint: hex(255 * (1 - ref.tint)) };
  if (ref.shade && ref.shade > 0) return { themeShade: hex(255 * (1 - ref.shade)) };
  return {};
}
