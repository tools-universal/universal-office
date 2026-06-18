// Geração do tema via o "theme generator" do @universal-material/web
// (ThemeBuilder → paletas tonais Material 3 a partir de uma cor-semente).
// Produz `:root { --u-color-*: light-dark(claro, escuro) }` — TODAS as variáveis
// de cor da app derivam daqui (os --md-* em index.html são aliases destes).
// O claro/escuro é resolvido pelo `color-scheme` do <html> (ver applyMode).
import { ThemeBuilder } from '@universal-material/web/theme/index.js';

/** Cor-semente por "accent". Toda a paleta (inclusive superfícies) deriva dela. */
export const ACCENT_SEEDS: Record<string, string> = {
  neutral: '#5F6368',
  teal: '#1F7A75',
  blue: '#1A73E8',
  red: '#C0392B',
  green: '#3F8E3F',
  amber: '#A6791F',
  purple: '#6750A4',
};

let styleEl: HTMLStyleElement | null = null;

/** (Re)gera e injeta as variáveis CSS do tema para o accent dado. */
export function applyGeneratedTheme(accent: string): void {
  const seed = ACCENT_SEEDS[accent] ?? ACCENT_SEEDS.blue!;
  const css = ThemeBuilder.create(seed).build();
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'u-theme';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
