// Cores das barras do <universal-sheet>: paleta Material 3 gerada pelo
// ThemeBuilder do @universal-material a partir da cor de destaque, ESCOPADA ao
// componente (:host — não vaza para a página), como no Write. Os tokens são
// `light-dark()`: claro/escuro vem só do `color-scheme` (do contexto, ou do
// atributo `theme`). Sem `accent` nem escolha no menu, o componente usa os
// `--u-color-*` da página quando ela os define; sem eles, a paleta do destaque.
import { ThemeBuilder } from '@universal-material/web/theme/index.js';

/** Cor-semente por destaque (o verde é o do Universal Sheet). */
export const ACCENTS: { id: string; seed: string; label: { en: string; pt: string } }[] = [
  { id: 'green', seed: '#2E8B4E', label: { en: 'Green', pt: 'Verde' } },
  { id: 'teal', seed: '#1F7A75', label: { en: 'Teal', pt: 'Verde-azulado' } },
  { id: 'blue', seed: '#1A73E8', label: { en: 'Blue', pt: 'Azul' } },
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

/** A página define os tokens do @universal-material (herdados pelo host)? */
export function pageDefinesTokens(host: HTMLElement): boolean {
  const parent = host.parentElement ?? ((host.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ?? null;
  if (!parent || typeof getComputedStyle !== 'function') return false;
  return getComputedStyle(parent).getPropertyValue('--u-color-surface').trim() !== '';
}

/**
 * Aplica a paleta do destaque (CSS no shadow root) quando pedida — destaque
 * explícito (atributo `accent` ou menu) ou página sem os tokens — ou a tira.
 */
export function applyTheme(host: HTMLElement, root: ShadowRoot, accent: string, explicit: boolean): void {
  let s = root.querySelector<HTMLStyleElement>('style[data-us-theme]');
  if (!explicit && pageDefinesTokens(host)) { s?.remove(); return; }
  const seed = (ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0]!).seed;
  if (!s) {
    s = document.createElement('style');
    s.dataset['usTheme'] = '';
    root.prepend(s);
  }
  const css = themeCss(seed);
  if (s.textContent !== css) s.textContent = css;
}
