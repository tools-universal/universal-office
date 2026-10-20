// Tema das barras: paleta Material 3 gerada pelo ThemeBuilder do
// @universal-material a partir da cor de destaque, ESCOPADA ao componente
// (:host — não vaza para a página) e modos de cor. "Escuro total" também
// escurece a folha (setDarkPage). OPT-IN: só com o atributo `theme`
// (auto|light|dark|black) ou a escolha explícita no menu; sem isso o
// componente herda `color-scheme` e `--u-color-*` da página hospedeira.
import { ThemeBuilder } from '@universal-material/web/theme/index.js';

export type ColorMode = 'auto' | 'light' | 'dark' | 'black';

/** Cor-semente por destaque: toda a paleta (inclusive superfícies) deriva dela. */
export const ACCENTS: { id: string; seed: string; label: { en: string; pt: string } }[] = [
  { id: 'blue', seed: '#1A73E8', label: { en: 'Blue', pt: 'Azul' } },
  { id: 'teal', seed: '#1F7A75', label: { en: 'Teal', pt: 'Verde-azulado' } },
  { id: 'green', seed: '#3F8E3F', label: { en: 'Green', pt: 'Verde' } },
  { id: 'amber', seed: '#A6791F', label: { en: 'Amber', pt: 'Âmbar' } },
  { id: 'red', seed: '#C0392B', label: { en: 'Red', pt: 'Vermelho' } },
  { id: 'purple', seed: '#6750A4', label: { en: 'Purple', pt: 'Roxo' } },
  { id: 'neutral', seed: '#5F6368', label: { en: 'Neutral', pt: 'Neutro' } },
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

const prefersDark = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
export const isDark = (m: ColorMode | null): boolean =>
  m === 'dark' || m === 'black' || ((m === 'auto' || m === null) && prefersDark());

export const isColorMode = (v: string | null): v is ColorMode => v === 'auto' || v === 'light' || v === 'dark' || v === 'black';

/**
 * Aplica destaque + modo ao componente (CSS no shadow root, color-scheme no
 * host). `mode` null = não impõe nada: desfaz o que este módulo aplicou.
 */
export function applyTheme(host: HTMLElement & { setDarkPage(d: boolean): void }, root: ShadowRoot, accent: string, mode: ColorMode | null): void {
  let s = root.querySelector<HTMLStyleElement>('style[data-uw-theme]');
  if (mode === null) {
    if (!s) return;
    s.remove();
    host.style.removeProperty('color-scheme');
    if (s.dataset['black']) host.setDarkPage(false);
    return;
  }
  const seed = (ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0]!).seed;
  if (!s) {
    s = document.createElement('style');
    s.dataset['uwTheme'] = '';
    root.prepend(s);
  }
  s.textContent = themeCss(seed);
  host.style.colorScheme = mode === 'auto' ? 'light dark' : mode === 'light' ? 'light' : 'dark';
  const black = mode === 'black';
  if (black || s.dataset['black']) host.setDarkPage(black);
  if (black) s.dataset['black'] = '1'; else delete s.dataset['black'];
}
