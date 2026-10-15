/**
 * Métricas de fonte que o Excel usa para a GRADE (96 dpi), por nome + tamanho:
 *
 * - MaxDigitWidth (MDW): largura em px do dígito mais largo da fonte Normal —
 *   a unidade das larguras de coluna (`<col width>` / COLINFO = caracteres).
 *   px = floor(((256·w + floor(128/MDW)) / 256) · MDW).
 *
 * Medido no oráculo (Excel 365, larguras de ~700 pastas reais .xls): o Excel
 * mede com GDI (dica/hinting incluída), então uma fórmula pura erra alguns
 * tamanhos — tabela para os casos medidos, fórmula por família no resto.
 */

/** MDW medido no Excel, por "família|tamanho" (nome em minúsculas). */
const MDW_MEASURED: Record<string, number> = {
  'arial|7': 5, 'arial|8': 6, 'arial|9': 7, 'arial|10': 7, 'arial|11': 8, 'arial|12': 9, 'arial|13': 9,
  'calibri|11': 7, 'calibri|12': 8, 'aptos narrow|11': 7, 'aptos|11': 7, 'aptos|12': 8,
  'ms sans serif|10': 7, 'microsoft sans serif|8.25': 6,
  'times new roman|10': 6, 'times new roman|11': 7, 'times new roman|12': 8,
  'courier new|9': 7, 'courier new|10': 8, 'courier new|12': 10, 'courier|10': 8,
  'verdana|10': 8, 'tahoma|10': 7,
  '微软雅黑|10': 8, '微软雅黑|11': 9, 'microsoft yahei|10': 8, 'microsoft yahei|11': 9,
  '宋体|11': 8, '宋体|12': 8, 'simsun|11': 8, 'simsun|12': 8,
  'ｍｓ ｐゴシック|11': 8, 'ms pgothic|11': 8, '新細明體|12': 8, 'pmingliu|12': 8,
};

/** Avanço dos dígitos (em em) e arredondamento por família, para tamanhos não medidos. */
const FAMILY: [RegExp, number, 'round' | 'floor' | 'ceil'][] = [
  [/^(calibri|carlito)$/, 0.507, 'floor'],
  [/^(times new roman|times|liberation serif|tinos)$/, 0.5, 'floor'],
  [/^(courier new|courier|liberation mono|cousine)$/, 0.6, 'round'],
  [/^(verdana)$/, 0.636, 'round'],
  [/^(aptos narrow)$/, 0.47, 'round'],
  // CJK (dígitos de meia largura = 0,5 em; o GDI arredonda para cima)
  [/(ゴシック|明朝|gothic|mincho|宋体|simsun|新細明體|細明體|mingliu|gulim|굴림|batang|바탕|dotum|돋움|メイリオ|meiryo)/, 0.5, 'ceil'],
  [/(微软雅黑|yahei|黑体|simhei)/, 0.55, 'ceil'],
];

/** MaxDigitWidth (px a 96 dpi) da fonte. Padrão (sem nome) = 7 (Calibri/Aptos Narrow 11). */
export function maxDigitWidth(name: string | undefined, sizePt: number | undefined): number {
  if (!name || !sizePt || !(sizePt > 0)) return 7;
  const n = name.trim().toLowerCase();
  const hit = MDW_MEASURED[`${n}|${sizePt}`];
  if (hit !== undefined) return hit;
  const ppem = Math.round((sizePt * 96) / 72);
  for (const [re, adv, mode] of FAMILY) {
    if (re.test(n)) return Math.max(1, Math[mode](ppem * adv));
  }
  // demais (Arial e substitutas sem-serifa): dígito ≈ 0,556 em, com o hinting
  // do GDI nos tamanhos pequenos (8 ppem → 5 px: fonte desconhecida a 6 pt medida)
  return ARIAL_BY_PPEM[ppem] ?? Math.max(1, Math.round(ppem * 0.556));
}

/** MDW da Arial (e substitutas) por ppem nos tamanhos em que o hinting difere de 0,556 em. */
const ARIAL_BY_PPEM: Record<number, number> = { 7: 4, 8: 5, 9: 5, 10: 6 };

/**
 * Altura de linha "automática" (pt) que o Excel dá a uma linha de UMA linha de
 * texto na fonte — medida no oráculo (moda por fonte em ~700 pastas .xls; só
 * as bem sustentadas). Fora da tabela = desconhecida (o chamador mantém a
 * altura gravada no arquivo).
 */
const ROW_HEIGHT_MEASURED: Record<string, number> = {
  'arial|8': 11.25, 'arial|9': 12, 'arial|10': 12.75, 'arial|11': 14.25, 'arial|12': 15.75, 'arial|13': 16.5,
  'arial|14': 18, 'arial|15': 18.75, 'arial|16': 20.25, 'arial|20': 26.25,
  'calibri|11': 15, 'calibri|12': 15.75, 'calibri|14': 18.75, 'aptos narrow|11': 15,
  'times new roman|8': 11.25, 'times new roman|10': 12.75, 'times new roman|11': 15, 'times new roman|12': 15.75,
  'times new roman|14': 18.75,
  'ms sans serif|10': 12.75, 'ms sans serif|12': 15.75, 'verdana|10': 12.75, 'tahoma|10': 12.75,
  'courier new|10': 13.5, 'courier new|12': 15.75,
  'ｍｓ ｐゴシック|11': 13.5, 'ms pgothic|11': 13.5, '微软雅黑|10': 16.5, '微软雅黑|11': 16.5,
};

/** Altura automática (pt) de uma linha na fonte, ou undefined se não medida. */
export function standardRowHeight(name: string | undefined, sizePt: number | undefined): number | undefined {
  if (!name || !sizePt) return undefined;
  return ROW_HEIGHT_MEASURED[`${name.trim().toLowerCase()}|${sizePt}`];
}

/** Largura de coluna (caracteres, `<col width>`) → px, com a MDW da fonte Normal. */
export function colWidthToPx(width: number, mdw = 7): number {
  return Math.floor(((256 * width + Math.floor(128 / mdw)) / 256) * mdw);
}
