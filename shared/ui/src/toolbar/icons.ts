import { SYMBOLS } from './symbols.js';

/**
 * SVG de um Material Symbol (nome, ex. 'format_bold') ou de um SVG cru
 * (`<path…>` no viewBox 0 -960 960 960). Nome desconhecido → vazio.
 */
export function symbol(name: string | undefined, cls = 'uo-ic'): string {
  if (!name) return '';
  const raw = name.startsWith('<') ? name : SYMBOLS[name] ? `<path d="${SYMBOLS[name]}"/>` : '';
  if (!raw) return '';
  return `<svg class="${cls}" viewBox="0 -960 960 960" aria-hidden="true">${raw}</svg>`;
}

/** Nomes disponíveis (para testes e diagnóstico). */
export function hasSymbol(name: string): boolean { return name in SYMBOLS; }
