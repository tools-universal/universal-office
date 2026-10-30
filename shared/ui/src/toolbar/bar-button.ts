// Botões e ícones com o visual das barras para os WIDGETS do hospedeiro
// (contribuições `compact.title`/`trailing`, grupos…). Os widgets moram no
// shadow root do componente: fontes de ícone da página (Font Awesome, Material
// Icons por ligadura) não chegam lá. Estes helpers usam os Material Symbols em
// SVG de symbols.ts e as classes do BAR_CSS (cores pelos tokens, claro/escuro
// pelo color-scheme), com o ripple do @universal-material quando registrado.
import { pickLabels, DEFAULT_UI_LANG, type UiLang } from '../i18n.js';
import { hasSymbol, symbol } from './icons.js';
import { ripple } from './items.js';
import { BAR_CSS } from './css.js';
import type { CompactTitlePlacement, Lbl } from './types.js';

/**
 * Aparência: pílulas `filled` (destaque), `tonal`, `outlined`, `text`; botões
 * só de ícone, redondos: `icon` (sem fundo), `icon-filled` (fundo de destaque)
 * e `icon-tonal` (fundo tonal).
 */
export type BarButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'icon' | 'icon-filled' | 'icon-tonal';

/** Tamanho: `medium` (padrão: pílula de 38px, ícone de 40px) ou `small` (pílula de 24px — chips de status —, ícone de 28px). */
export type BarButtonSize = 'medium' | 'small';

export interface BarButtonOptions {
  /** nome do Material Symbol (`save`, `send`, `visibility`…) ou SVG cru (`<path…>`, viewBox 0 -960 960 960) */
  icon?: string;
  /** texto do botão (no `icon`, vira o nome acessível e a dica) */
  label?: Lbl;
  /** dica (title); sem ela, o rótulo */
  title?: Lbl;
  /** padrão: `outlined` com rótulo, `icon` sem rótulo */
  variant?: BarButtonVariant;
  /** padrão: `medium` */
  size?: BarButtonSize;
  disabled?: boolean;
  /** idioma dos rótulos `{ en, pt }` (o `lang` do contexto da barra) */
  lang?: UiLang;
  onClick?: (e: MouseEvent) => void;
}

const CLASSES: Record<BarButtonVariant, string> = {
  filled: 'uo-pill uo-pill-primary',
  tonal: 'uo-pill uo-pill-tonal',
  outlined: 'uo-pill',
  text: 'uo-pill uo-pill-text',
  icon: 'uo-btn uo-btn-icon',
  'icon-filled': 'uo-btn uo-btn-icon uo-btn-icon-filled',
  'icon-tonal': 'uo-btn uo-btn-icon uo-btn-icon-tonal',
};

const iconOnly = (v: BarButtonVariant): boolean => v === 'icon' || v === 'icon-filled' || v === 'icon-tonal';

const text = (l: Lbl | undefined, lang: UiLang): string =>
  l === undefined ? '' : typeof l === 'string' ? l : pickLabels(lang, l);

const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Ícone (Material Symbol em SVG, `fill: currentColor`) num `<span class="uo-ic-box">`. */
export function createBarIcon(name: string, opts: { size?: number; title?: string } = {}): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'uo-ic-box';
  span.innerHTML = symbol(name);
  if (opts.size) span.style.setProperty('--uo-ic-size', `${opts.size}px`);
  if (opts.title) { span.title = opts.title; span.setAttribute('role', 'img'); span.setAttribute('aria-label', opts.title); }
  else span.setAttribute('aria-hidden', 'true');
  return span;
}

/** O nome existe entre os Material Symbols embutidos? */
export const hasBarIcon = (name: string): boolean => name.startsWith('<') || hasSymbol(name);

/**
 * Botão com o visual da barra (pílula `filled`/`tonal`/`outlined`/`text` ou
 * botão de ícone `icon`/`icon-filled`/`icon-tonal`), em dois tamanhos, com
 * ripple e tema. Não tira o foco do documento (mousedown).
 */
export function createBarButton(opts: BarButtonOptions): HTMLButtonElement {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const label = text(opts.label, lang);
  const variant = opts.variant ?? (label ? 'outlined' : 'icon');
  const only = iconOnly(variant);
  const b = document.createElement('button');
  b.type = 'button';
  // pílula com ícone e rótulo: o espaço entre eles é só o gap (padding assimétrico do M3)
  b.className = CLASSES[variant] + (opts.size === 'small' ? ' uo-btn-sm' : '') + (!only && opts.icon && label ? ' uo-pill-ic' : '');
  b.dataset['variant'] = variant;
  if (opts.size === 'small') b.dataset['size'] = 'small';
  const tip = text(opts.title, lang) || label;
  if (tip) b.title = tip;
  if (only || !label) { if (tip) b.setAttribute('aria-label', tip); }
  b.innerHTML = (opts.icon ? symbol(opts.icon) : '') + (label && !only ? `<span class="uo-lbl">${escapeHtml(label)}</span>` : '');
  b.disabled = !!opts.disabled;
  b.addEventListener('mousedown', (e) => e.preventDefault());
  if (opts.onClick) b.addEventListener('click', (e) => opts.onClick!(e as MouseEvent));
  ripple(b);
  return b;
}

/** Opções da linha mínima do hospedeiro (fora do editor), com o visual da barra. */
export interface BarRowOptions {
  /** à esquerda: um nó (nome do documento + estado, montado com o kit) ou um texto */
  title?: Node | string;
  /** à direita: botões (createBarButton) ou outros nós, na ordem */
  actions?: readonly Node[];
  /** antes do título: ícone/logo (o lugar do `compact.leading`) */
  leading?: Node;
  /**
   * `above-menus`: a mesma geometria da barra compacta com o título acima dos
   * menus — título na 1ª linha, a 2ª linha (a dos menus) vazia guardando a
   * altura, `leading` e ações ocupando as duas — para a troca editor ↔ linha
   * mínima não mexer na página. É o padrão quando há `title`, como na barra
   * compacta; `inline` deixa tudo numa linha.
   */
  titlePlacement?: CompactTitlePlacement;
}

/**
 * Linha mínima com o visual da linha de título da barra compacta — título à
 * esquerda (`.uo-title-slot`, o mesmo lugar do `compact.title`) e ações à
 * direita — para o hospedeiro montar FORA do editor (carregando, só leitura…).
 * O CSS vem de `adoptBarStyles(root)` (ou `barCss`) no documento ou shadow root
 * onde ela entra; as cores seguem os tokens `--u-color-*` e o `color-scheme`.
 */
export function createBarRow(opts: BarRowOptions = {}): HTMLDivElement {
  const stacked = opts.titlePlacement === 'above-menus' || (opts.titlePlacement === undefined && opts.title !== undefined);
  const row = document.createElement('div');
  row.className = stacked ? 'uo-bar uo-host-row uo-title-above' : 'uo-bar uo-host-row';
  const line = document.createElement('div');
  line.className = stacked ? 'uo-titlebar uo-stacked' : 'uo-titlebar';
  const slot = document.createElement('div');
  slot.className = 'uo-title-slot';
  if (typeof opts.title === 'string') slot.textContent = opts.title;
  else if (opts.title) slot.appendChild(opts.title);
  let leading: HTMLDivElement | null = null;
  if (opts.leading) {
    leading = document.createElement('div');
    leading.className = 'uo-leading';
    leading.appendChild(opts.leading);
  }
  if (stacked) {
    const titleRow = document.createElement('div');
    titleRow.className = 'uo-title-row';
    titleRow.appendChild(slot);
    const menuRow = document.createElement('div');
    menuRow.className = 'uo-menu-row';
    const main = document.createElement('div');
    main.className = 'uo-titlebar-main';
    main.append(titleRow, menuRow);
    const trailing = document.createElement('div');
    trailing.className = 'uo-trailing';
    trailing.append(...(opts.actions ?? []));
    if (leading) line.appendChild(leading);
    line.append(main, trailing);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'uo-spacer';
    if (leading) line.appendChild(leading);
    line.append(slot, spacer, ...(opts.actions ?? []));
  }
  row.appendChild(line);
  return row;
}

/** O CSS das barras (o mesmo do editor), para `<style>` ou `CSSStyleSheet` do hospedeiro. */
export const barCss: string = BAR_CSS;

let sheet: CSSStyleSheet | null | undefined;

/** O CSS das barras numa `CSSStyleSheet` construída (compartilhada, adotável); null sem suporte. */
export function barStyleSheet(): CSSStyleSheet | null {
  if (sheet !== undefined) return sheet;
  try {
    const s = new CSSStyleSheet();
    s.replaceSync(BAR_CSS);
    sheet = s;
  } catch { sheet = null; }
  return sheet;
}

/** Põe o CSS das barras num documento ou shadow root (adoptedStyleSheets; sem suporte, um `<style>`), uma vez. */
export function adoptBarStyles(root: Document | ShadowRoot): void {
  const s = barStyleSheet();
  const r = root as Document & { adoptedStyleSheets?: CSSStyleSheet[] };
  if (s && Array.isArray(r.adoptedStyleSheets)) {
    if (!r.adoptedStyleSheets.includes(s)) r.adoptedStyleSheets = [...r.adoptedStyleSheets, s];
    return;
  }
  const host = 'head' in root && root.head ? root.head : root as ShadowRoot;
  if (host.querySelector('style[data-uo-bar]')) return;
  const st = document.createElement('style');
  st.dataset['uoBar'] = '';
  st.textContent = BAR_CSS;
  host.appendChild(st);
}
