// Tema das barras: paleta Material 3 gerada pelo ThemeBuilder do
// @universal-material a partir da cor de destaque, ESCOPADA ao componente
// (:host — não vaza para a página) e modos de cor. "Escuro total" também
// escurece a folha (setDarkPage). Preferências no localStorage (as mesmas
// chaves do demo antigo).
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

const store = {
  get: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* privado */ } },
};

export const savedMode = (): ColorMode => (store.get('uw-mode') as ColorMode | null) ?? 'auto';
export const savedAccent = (): string => store.get('uw-accent-v2') ?? 'blue';

const prefersDark = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
export const isDark = (m: ColorMode): boolean => m === 'dark' || m === 'black' || (m === 'auto' && prefersDark());

/** Aplica destaque + modo ao componente (CSS no shadow root, color-scheme no host). */
export function applyTheme(host: HTMLElement & { setDarkPage(d: boolean): void }, root: ShadowRoot, accent: string, mode: ColorMode, persist = false): void {
  const seed = (ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0]!).seed;
  let s = root.querySelector<HTMLStyleElement>(':scope > style[data-uw-theme]');
  if (!s) {
    s = document.createElement('style');
    s.dataset['uwTheme'] = '';
    root.prepend(s);
  }
  s.textContent = themeCss(seed);
  host.style.colorScheme = mode === 'auto' ? 'light dark' : mode === 'light' ? 'light' : 'dark';
  host.setDarkPage(mode === 'black');
  if (persist) { store.set('uw-mode', mode); store.set('uw-accent-v2', accent); }
}
