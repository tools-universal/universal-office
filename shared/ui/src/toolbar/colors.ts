// Grade de cores dos menus (cor da fonte, realce, sombreamento) — paleta do
// Office (tema Office: 10 cores com claros/escuros + cores padrão).

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
export const HIGHLIGHT_COLORS: { value: string; css: string; label: Record<'en' | 'pt', string> }[] = [
  { value: 'yellow', css: '#FFFF00', label: { en: 'Yellow', pt: 'Amarelo' } },
  { value: 'green', css: '#00FF00', label: { en: 'Bright green', pt: 'Verde brilhante' } },
  { value: 'cyan', css: '#00FFFF', label: { en: 'Turquoise', pt: 'Turquesa' } },
  { value: 'magenta', css: '#FF00FF', label: { en: 'Pink', pt: 'Rosa' } },
  { value: 'blue', css: '#0000FF', label: { en: 'Blue', pt: 'Azul' } },
  { value: 'red', css: '#FF0000', label: { en: 'Red', pt: 'Vermelho' } },
  { value: 'darkBlue', css: '#000080', label: { en: 'Dark blue', pt: 'Azul escuro' } },
  { value: 'darkCyan', css: '#008080', label: { en: 'Teal', pt: 'Verde-azulado' } },
  { value: 'darkGreen', css: '#008000', label: { en: 'Green', pt: 'Verde' } },
  { value: 'darkMagenta', css: '#800080', label: { en: 'Violet', pt: 'Violeta' } },
  { value: 'darkRed', css: '#800000', label: { en: 'Dark red', pt: 'Vermelho escuro' } },
  { value: 'darkYellow', css: '#808000', label: { en: 'Dark yellow', pt: 'Amarelo escuro' } },
  { value: 'darkGray', css: '#808080', label: { en: 'Gray 50%', pt: 'Cinza 50%' } },
  { value: 'lightGray', css: '#C0C0C0', label: { en: 'Gray 25%', pt: 'Cinza 25%' } },
  { value: 'black', css: '#000000', label: { en: 'Black', pt: 'Preto' } },
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
