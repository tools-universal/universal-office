/** Variante "RIBBI" de uma família (Regular / Italic / Bold / Bold Italic). */
export type FontVariant = 'regular' | 'bold' | 'italic' | 'boldItalic';

export const VARIANTS: readonly FontVariant[] = ['regular', 'bold', 'italic', 'boldItalic'];

/**
 * De onde veio a fonte que vai desenhar a família pedida, na ordem em que o
 * resolvedor tenta:
 * - `host`         — o host entregou os bytes (ex.: Electron lê Windows\Fonts e o
 *                    cache CloudFonts do Office, que nenhum navegador enxerga);
 * - `local-access` — Local Font Access API (`queryLocalFonts`, só Chromium, com
 *                    permissão JÁ concedida — nunca pede sozinho);
 * - `bundled`      — fonte aberta embarcada com o mesmo nome (Liberation, Carlito…);
 * - `page`         — a página declarou `@font-face` para a família;
 * - `installed`    — instalada na máquina e visível ao navegador pelo NOME (todos os
 *                    navegadores), sem acesso aos bytes;
 * - `substitute`   — substituta aberta métrico-compatível (Calibri → Carlito…);
 * - `default`      — nada encontrado: a fonte padrão (Liberation Sans).
 */
export type FontSource = 'host' | 'local-access' | 'bundled' | 'page' | 'installed' | 'substitute' | 'default';

/** Face de fonte entregue pelo HOST. */
export interface HostFontFace {
  family: string;
  weight: string;
  style: string;
  /** Negrito "RIBBI" dentro da família (ausente: deduz do peso). */
  bold?: boolean;
  /** A licença (fsType) permite embutir em documento/PDF (ausente: permite). */
  embeddable?: boolean;
  /** sfnt avulso (TTF/OTF; `.ttc` já vem como a face pedida). */
  bytes: ArrayBuffer;
}

/** Fontes do SO fornecidas pelo HOST (ex.: a ponte do shell Electron). */
export interface HostFontProvider {
  /** Nomes das famílias instaladas, em ordem alfabética. */
  list(): Promise<string[]>;
  /** Faces das famílias pedidas (todas as variantes encontradas). */
  resolve(families: string[]): Promise<HostFontFace[]>;
}

/** Resultado da resolução de uma família. */
export interface ResolvedFont {
  /** Família pedida (como veio do documento). */
  family: string;
  /** Nome a usar em CSS / `ctx.font` para desenhar a família. */
  cssFamily: string;
  source: FontSource;
  /** Bytes sfnt por variante, quando conhecidos (métricas exatas e PDF). */
  faces: Partial<Record<FontVariant, Uint8Array>>;
  /** As faces com bytes podem ser embutidas (fsType da licença). */
  embeddable: boolean;
}

/** Uma face da Local Font Access API (`window.queryLocalFonts`). */
export interface LocalFontData {
  family: string;
  fullName?: string;
  postscriptName?: string;
  style?: string;
  blob(): Promise<Blob>;
}

export function variantOf(bold: boolean, italic: boolean): FontVariant {
  return bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
}

export function isBoldVariant(v: FontVariant): boolean {
  return v === 'bold' || v === 'boldItalic';
}

export function isItalicVariant(v: FontVariant): boolean {
  return v === 'italic' || v === 'boldItalic';
}

/** Descritores do FontFace de uma variante RIBBI (peso 400/700). */
export function faceDescriptors(v: FontVariant): FontFaceDescriptors {
  return { weight: isBoldVariant(v) ? '700' : '400', style: isItalicVariant(v) ? 'italic' : 'normal' };
}

/**
 * Variante RIBBI a partir do "style" (subfamília) de uma face — SÓ os quatro
 * estilos RIBBI ("Regular", "Bold", "Italic", "Bold Italic"). Light, Semibold,
 * Black… NÃO são variantes da família (no Windows viram famílias próprias:
 * "Segoe UI Light" — a regular dessa família legada): devolve null.
 */
export function variantOfStyle(style: string | undefined): FontVariant | null {
  const s = (style ?? 'Regular').toLowerCase().replace(/\s+/g, ' ').trim();
  switch (s) {
    case 'regular': case 'normal': case 'roman': case '': return 'regular';
    case 'bold': return 'bold';
    case 'italic': case 'oblique': return 'italic';
    case 'bold italic': case 'bold oblique': return 'boldItalic';
    default: return null;
  }
}
