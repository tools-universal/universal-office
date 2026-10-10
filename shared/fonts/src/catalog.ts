import type { FontVariant } from './types.js';

/** Fonte padrão (fallback final): aberta (OFL) e métrico-compatível com Arial. */
export const DEFAULT_FAMILY = 'Liberation Sans';

/**
 * Famílias ABERTAS embarcadas (shared/fonts/files): servidas pelo host na base
 * `baseUrl` como `<arquivo>-<variante>.ttf` (variante em minúsculas:
 * regular/bold/italic/bolditalic). A Liberation Sans já mora em todas as bases
 * de fontes dos apps; as demais vêm de `npm run fonts:sync`.
 */
export const BUNDLED: Readonly<Record<string, { family: string; file: string }>> = {
  'liberation sans': { family: 'Liberation Sans', file: 'liberationsans' },
  'liberation serif': { family: 'Liberation Serif', file: 'liberationserif' },
  'liberation mono': { family: 'Liberation Mono', file: 'liberationmono' },
  carlito: { family: 'Carlito', file: 'carlito' },
  caladea: { family: 'Caladea', file: 'caladea' },
};

export function bundledFileName(file: string, v: FontVariant): string {
  return `${file}-${v.toLowerCase()}.ttf`;
}

/**
 * Substitutas MÉTRICO-COMPATÍVEIS (mesmos advances da original: a quebra de
 * linha não muda) para quando a original não está disponível. Chaves em
 * minúsculas.
 */
export const METRIC_SUBSTITUTES: Readonly<Record<string, string>> = {
  calibri: 'Carlito',
  cambria: 'Caladea',
  arial: 'Liberation Sans',
  'arial mt': 'Liberation Sans',
  helvetica: 'Liberation Sans',
  arimo: 'Liberation Sans',
  'times new roman': 'Liberation Serif',
  times: 'Liberation Serif',
  tinos: 'Liberation Serif',
  'courier new': 'Liberation Mono',
  courier: 'Liberation Mono',
  cousine: 'Liberation Mono',
};

/**
 * Famílias que valem a pena SONDAR quando o navegador não enumera as fontes
 * instaladas (Firefox, Safari, Chromium sem permissão): só se descobre que uma
 * fonte existe perguntando pelo nome. Fontes comuns do Windows, do Office, do
 * macOS e do Linux.
 */
export const PROBE_FAMILIES: readonly string[] = [
  // Windows
  'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Calibri Light', 'Cambria', 'Cambria Math', 'Candara',
  'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium',
  'Gabriola', 'Gadugi', 'Georgia', 'Impact', 'Ink Free', 'Javanese Text', 'Leelawadee UI', 'Lucida Console',
  'Lucida Sans Unicode', 'Malgun Gothic', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue',
  'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti',
  'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype',
  'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Black', 'Segoe UI Emoji', 'Segoe UI Historic',
  'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Semilight', 'Segoe UI Symbol', 'SimSun', 'Sitka Text',
  'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings',
  'Yu Gothic',
  // instaladas pelo Office (pasta de fontes do Windows)
  'Agency FB', 'Algerian', 'Arial Narrow', 'Arial Rounded MT Bold', 'Baskerville Old Face', 'Bauhaus 93',
  'Bell MT', 'Berlin Sans FB', 'Bernard MT Condensed', 'Book Antiqua', 'Bookman Old Style', 'Bradley Hand ITC',
  'Britannic Bold', 'Broadway', 'Brush Script MT', 'Californian FB', 'Calisto MT', 'Castellar', 'Centaur',
  'Century', 'Century Gothic', 'Century Schoolbook', 'Chiller', 'Colonna MT', 'Cooper Black',
  'Copperplate Gothic Bold', 'Curlz MT', 'Edwardian Script ITC', 'Elephant', 'Engravers MT', 'Eras Medium ITC',
  'Felix Titling', 'Footlight MT Light', 'Forte', 'Franklin Gothic Book', 'Freestyle Script', 'French Script MT',
  'Garamond', 'Gigi', 'Gill Sans MT', 'Gloucester MT Extra Condensed', 'Goudy Old Style', 'Haettenschweiler',
  'Harlow Solid Italic', 'Harrington', 'High Tower Text', 'Imprint MT Shadow', 'Informal Roman', 'Jokerman',
  'Juice ITC', 'Kristen ITC', 'Kunstler Script', 'Lucida Bright', 'Lucida Calligraphy', 'Lucida Fax',
  'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Magneto', 'Maiandra GD', 'Matura MT Script Capitals',
  'Mistral', 'Modern No. 20', 'Monotype Corsiva', 'Niagara Engraved', 'Old English Text MT', 'Onyx',
  'Palace Script MT', 'Papyrus', 'Parchment', 'Perpetua', 'Playbill', 'Poor Richard', 'Pristina', 'Rage Italic',
  'Ravie', 'Rockwell', 'Script MT Bold', 'Showcard Gothic', 'Snap ITC', 'Stencil', 'Tempus Sans ITC',
  'Tw Cen MT', 'Viner Hand ITC', 'Vivaldi', 'Vladimir Script', 'Wide Latin',
  // macOS
  'American Typewriter', 'Andale Mono', 'Apple Chancery', 'Avenir', 'Avenir Next', 'Baskerville', 'Big Caslon',
  'Chalkboard', 'Charter', 'Cochin', 'Copperplate', 'Didot', 'Futura', 'Geneva', 'Gill Sans', 'Helvetica',
  'Helvetica Neue', 'Hoefler Text', 'Lucida Grande', 'Marker Felt', 'Menlo', 'Monaco', 'Optima', 'Palatino',
  'Rockwell', 'SF Pro', 'Skia', 'Snell Roundhand', 'Times', 'Trattatello', 'Zapfino',
  // Linux / abertas comuns
  'Cantarell', 'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif', 'Droid Sans', 'Fira Sans', 'Fira Mono',
  'Inter', 'Lato', 'Montserrat', 'Noto Sans', 'Noto Serif', 'Noto Sans Mono', 'Open Sans', 'Oswald', 'Poppins',
  'PT Sans', 'PT Serif', 'Raleway', 'Roboto', 'Roboto Mono', 'Source Sans Pro', 'Source Serif Pro', 'Ubuntu',
  'Ubuntu Mono',
];
