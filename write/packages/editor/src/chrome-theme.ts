// Cores das barras: paleta Material 3 gerada pelo ThemeBuilder do
// @universal-material a partir da cor de destaque, ESCOPADA ao componente
// (:host — não vaza para a página). Os tokens são `light-dark()`: o claro/escuro
// vem só do `color-scheme` (herdado do contexto, ou forçado pelo elemento com
// `theme="light|dark"` — ver applyColorScheme em universal-write.ts). Aqui
// fica só a PALETA e o "Escuro total" (folha escura, setDarkPage).
//
// Sem atributo `theme` nem escolha no menu, o componente usa os `--u-color-*`
// da página quando ela os define (o app hospedeiro com @universal-material);
// sem eles, a paleta do destaque — nunca os recuos fixos claros.
import { ThemeBuilder } from '@universal-material/web/theme/index.js';

export type ColorMode = 'auto' | 'light' | 'dark' | 'black';

/** Cor-semente por destaque: toda a paleta (inclusive superfícies) deriva dela. */
export const ACCENTS: { id: string; seed: string; label: { en: string; pt: string; es: string } }[] = [
  { id: 'blue', seed: '#1A73E8', label: { en: 'Blue', pt: 'Azul', es: 'Azul' } },
  { id: 'teal', seed: '#1F7A75', label: { en: 'Teal', pt: 'Verde-azulado', es: 'Verde azulado' } },
  { id: 'green', seed: '#3F8E3F', label: { en: 'Green', pt: 'Verde', es: 'Verde' } },
  { id: 'amber', seed: '#A6791F', label: { en: 'Amber', pt: 'Âmbar', es: 'Ámbar' } },
  { id: 'red', seed: '#C0392B', label: { en: 'Red', pt: 'Vermelho', es: 'Rojo' } },
  { id: 'purple', seed: '#6750A4', label: { en: 'Purple', pt: 'Roxo', es: 'Morado' } },
  { id: 'neutral', seed: '#5F6368', label: { en: 'Neutral', pt: 'Neutro', es: 'Neutro' } },
];

const cache = new Map<string, string>();
function themeCss(seed: string): string {
  let css = cache.get(seed);
  if (!css) {
    css = ThemeBuilder.create(seed).build().replace(/:root\b/g, ':host');
    cache.set(seed, css);
  }
  return css;
}

/** Modo de cor escolhido (atributo `theme` ou menu): só `black` muda a FOLHA (escura). */
export const isColorMode = (v: string | null): v is ColorMode => v === 'auto' || v === 'light' || v === 'dark' || v === 'black';

/** A página define os tokens do @universal-material (herdados pelo host)? */
export function pageDefinesTokens(host: HTMLElement): boolean {
  const parent = host.parentElement ?? ((host.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ?? null;
  if (!parent || typeof getComputedStyle !== 'function') return false;
  return getComputedStyle(parent).getPropertyValue('--u-color-surface').trim() !== '';
}

/**
 * Aplica a paleta do destaque (CSS no shadow root) quando pedida — `mode`
 * escolhido (atributo `theme` ou menu), destaque explícito, ou página sem os
 * tokens — e o "Escuro total" (`black`: folha escura). O `color-scheme` é do
 * elemento (setUiColorMode/atributo), não daqui.
 */
export function applyTheme(
  host: HTMLElement & { setDarkPage(d: boolean): void },
  root: ShadowRoot,
  accent: string,
  mode: ColorMode | null,
  explicitAccent = false,
): void {
  let s = root.querySelector<HTMLStyleElement>('style[data-uw-theme]');
  const palette = mode !== null || explicitAccent || !pageDefinesTokens(host);
  if (!palette) {
    if (!s) return;
    s.remove();
    if (s.dataset['black']) host.setDarkPage(false);
    return;
  }
  const seed = (ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0]!).seed;
  if (!s) {
    s = document.createElement('style');
    s.dataset['uwTheme'] = '';
    root.prepend(s);
  }
  const css = themeCss(seed);
  if (s.textContent !== css) s.textContent = css;
  const black = mode === 'black';
  if (black !== !!s.dataset['black']) host.setDarkPage(black);
  if (black) s.dataset['black'] = '1'; else delete s.dataset['black'];
}
