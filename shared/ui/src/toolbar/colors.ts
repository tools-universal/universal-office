// Grade de cores dos menus (cor da fonte, realce, sombreamento) — paleta do
// Office (tema Office: 10 cores com claros/escuros + cores padrão).

import type { UiLang } from '../i18n.js';

const BASE = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47'];
const STANDARD = ['C00000', 'FF0000', 'FFC000', 'FFFF00', '92D050', '00B050', '00B0F0', '0070C0', '002060', '7030A0'];

function mix(hex: string, f: number): string {
  // f > 0 clareia em direção ao branco; f < 0 escurece
  const n = parseInt(hex, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)));
  return ch.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** 6 linhas × 10 (como a galeria "Cores do tema" do Word) + a linha padrão. */
// branco e preto variam como cinzas: o Word escurece o branco (5…50%) e
// clareia o preto (50…5%)
const WHITE = ['F2F2F2', 'D9D9D9', 'BFBFBF', 'A6A6A6', '808080'];
const BLACK = ['7F7F7F', '595959', '404040', '262626', '0D0D0D'];
export const OFFICE_COLORS: string[] = [
  ...BASE,
  ...[0.8, 0.6, 0.4, -0.25, -0.5].flatMap((f, row) => BASE.map((h, i) =>
    i === 0 ? WHITE[row]! : i === 1 ? BLACK[row]! : mix(h, f))),
  ...STANDARD,
];

/** Cores de realce do Word (valor de w:highlight → cor de tela). */
export const HIGHLIGHT_COLORS: { value: string; css: string; label: Record<UiLang, string> }[] = [
  { value: 'yellow', css: '#FFFF00', label: { en: 'Yellow', pt: 'Amarelo', es: 'Amarillo' } },
  { value: 'green', css: '#00FF00', label: { en: 'Bright green', pt: 'Verde brilhante', es: 'Verde brillante' } },
  { value: 'cyan', css: '#00FFFF', label: { en: 'Turquoise', pt: 'Turquesa', es: 'Turquesa' } },
  { value: 'magenta', css: '#FF00FF', label: { en: 'Pink', pt: 'Rosa', es: 'Rosa' } },
  { value: 'blue', css: '#0000FF', label: { en: 'Blue', pt: 'Azul', es: 'Azul' } },
  { value: 'red', css: '#FF0000', label: { en: 'Red', pt: 'Vermelho', es: 'Rojo' } },
  { value: 'darkBlue', css: '#000080', label: { en: 'Dark blue', pt: 'Azul escuro', es: 'Azul oscuro' } },
  { value: 'darkCyan', css: '#008080', label: { en: 'Teal', pt: 'Verde-azulado', es: 'Verde azulado' } },
  { value: 'darkGreen', css: '#008000', label: { en: 'Green', pt: 'Verde', es: 'Verde' } },
  { value: 'darkMagenta', css: '#800080', label: { en: 'Violet', pt: 'Violeta', es: 'Violeta' } },
  { value: 'darkRed', css: '#800000', label: { en: 'Dark red', pt: 'Vermelho escuro', es: 'Rojo oscuro' } },
  { value: 'darkYellow', css: '#808000', label: { en: 'Dark yellow', pt: 'Amarelo escuro', es: 'Amarillo oscuro' } },
  { value: 'darkGray', css: '#808080', label: { en: 'Gray 50%', pt: 'Cinza 50%', es: 'Gris 50%' } },
  { value: 'lightGray', css: '#C0C0C0', label: { en: 'Gray 25%', pt: 'Cinza 25%', es: 'Gris 25%' } },
  { value: 'black', css: '#000000', label: { en: 'Black', pt: 'Preto', es: 'Negro' } },
];

export interface ColorGridOptions {
  colors: { value: string; css: string; title?: string }[];
  columns?: number;
  selected?: string;
  onPick: (value: string) => void;
  close: () => void;
}

/** Bloco de menu com a grade de cores (MenuItem.content). */
export function colorGrid(o: ColorGridOptions): HTMLElement {
  const g = document.createElement('div');
  g.className = 'uo-colors';
  if (o.columns) g.style.gridTemplateColumns = `repeat(${o.columns}, 20px)`;
  for (const c of o.colors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.background = c.css;
    b.title = c.title ?? c.css;
    b.dataset['color'] = c.value;
    if (o.selected && o.selected.toLowerCase() === c.value.toLowerCase()) b.classList.add('sel');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => { o.close(); o.onPick(c.value); });
    g.appendChild(b);
  }
  return g;
}

// ───────────── paleta de cores do TEMA (com a referência) ─────────────

/** Ordem das colunas da galeria "Cores do Tema" (nome w:themeColor/themeFill). */
export const THEME_SLOTS = ['background1', 'text1', 'background2', 'text2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'] as const;
const SLOT_KEY: Record<string, string> = { background1: 'lt1', text1: 'dk1', background2: 'lt2', text2: 'dk2' };

/** Cor do tema escolhida na paleta: a referência (como o Word grava) e o hex. */
export interface ThemeColorPick { themeColor: string; tint?: string; shade?: string; hex: string }

/** tint/shade de luminosidade em HSL (o algoritmo do Word para themeTint/themeShade). */
export function themeTintHex(hex: string, tint?: string, shade?: string): string {
  if (!tint && !shade) return hex.toUpperCase();
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let l = (mx + mn) / 2, h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  if (shade) l *= parseInt(shade, 16) / 255;
  if (tint) { const t = parseInt(tint, 16) / 255; l = l * t + 1 - t; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const ch = (x: number): string => {
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
    return Math.max(0, Math.min(255, Math.floor(v * 255))).toString(16).padStart(2, '0');
  };
  return (ch(h + 1 / 3) + ch(h) + ch(h - 1 / 3)).toUpperCase();
}

/**
 * As 5 variações de uma cor do tema como no Office, pela luminosidade da base:
 * branco → mais escuro 5/15/25/35/50%; preto → mais claro 50/35/25/15/5%;
 * muito clara → mais escuro 10/25/50/75/90%; muito escura → mais clara
 * 90/75/50/25/10%; as outras → mais clara 80/60/40%, mais escura 25/50%.
 * `pct` > 0 = mais clara (tint), < 0 = mais escura (shade).
 */
export function themeVariants(hex: string): { tint?: string; shade?: string; pct: number }[] {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
  const h2 = (x: number): string => Math.round(x * 255).toString(16).toUpperCase().padStart(2, '0');
  const lighter = (p: number) => ({ tint: h2(1 - p), pct: p });
  const darker = (p: number) => ({ shade: h2(1 - p), pct: -p });
  if (l >= 0.999) return [0.05, 0.15, 0.25, 0.35, 0.5].map(darker);
  if (l <= 0.001) return [0.5, 0.35, 0.25, 0.15, 0.05].map(lighter);
  if (l > 0.8) return [0.1, 0.25, 0.5, 0.75, 0.9].map(darker);
  if (l < 0.2) return [0.9, 0.75, 0.5, 0.25, 0.1].map(lighter);
  return [lighter(0.8), lighter(0.6), lighter(0.4), darker(0.25), darker(0.5)];
}

/**
 * Cores da galeria "Cores do Tema" (10 colunas × 6 linhas, por linha) do tema
 * `colors` (chaves do theme1.xml: dk1, lt1, dk2, lt2, accent1..6). O `value`
 * de cada uma é "tema|themeColor|tint|shade" (ver parseThemePick).
 */
export function themePaletteColors(colors: Record<string, string>, names?: (slot: string, pct: number) => string): { value: string; css: string; title?: string }[] {
  const base = THEME_SLOTS.map((s) => (colors[SLOT_KEY[s] ?? s] ?? '000000').toUpperCase());
  const out: { value: string; css: string; title?: string }[] = THEME_SLOTS.map((s, i) => ({
    value: `theme|${s}||`, css: `#${base[i]}`, ...(names ? { title: names(s, 0) } : {}),
  }));
  const vars = base.map((h) => themeVariants(h));
  for (let row = 0; row < 5; row++) {
    THEME_SLOTS.forEach((s, i) => {
      const v = vars[i]![row]!;
      out.push({ value: `theme|${s}|${v.tint ?? ''}|${v.shade ?? ''}`, css: `#${themeTintHex(base[i]!, v.tint, v.shade)}`, ...(names ? { title: names(s, v.pct) } : {}) });
    });
  }
  return out;
}

/** "tema|accent1|33|" → referência; "RRGGBB" → null. */
export function parseThemePick(value: string, colors: Record<string, string>): ThemeColorPick | null {
  const m = /^theme\|([^|]*)\|([^|]*)\|([^|]*)$/.exec(value);
  if (!m) return null;
  const slot = m[1]!;
  const base = (colors[SLOT_KEY[slot] ?? slot] ?? '000000').toUpperCase();
  return { themeColor: slot, ...(m[2] ? { tint: m[2] } : {}), ...(m[3] ? { shade: m[3] } : {}), hex: themeTintHex(base, m[2] || undefined, m[3] || undefined) };
}

/** As cores padrão (linha de baixo da galeria). */
export const STANDARD_COLORS: readonly string[] = STANDARD;
