// Geometria do grid como o Excel a calcula (96 dpi, zoom 100%), com as tabelas
// MEDIDAS no Excel 365 (excel-metrics-data.ts) — larguras de coluna pela largura
// do dígito máximo (MDW) da fonte Normal e alturas de linha auto-ajustadas pela
// maior fonte da linha. Regras medidas no lab do corpus (pastas sintéticas):
//  - <col width> → px = ⌊(256·w + ⌊128/MDW⌋)/256 · MDW⌋;
//  - largura padrão: defaultColWidth pela mesma fórmula; sem ele,
//    ⌈(baseColWidth·MDW + 2·⌈MDW/4⌉ + 1)/8⌉·8 (baseColWidth padrão 8);
//  - linha com customHeight → ⌊ht·4/3⌋ px; sem customHeight o Excel REFAZ o
//    auto-ajuste ao abrir (o `ht` gravado é ignorado): máx(linha da fonte Normal,
//    linha da fonte de cada célula — inclusive vazia com estilo, quebras de texto);
//  - linha ausente: sem <sheetFormatPr> → 20 px; com customHeight →
//    defaultRowHeight; senão a linha da fonte Normal (defaultRowHeight ignorado).
import {
  MDW, MDW_PPEM_MAX, MDW_PPEM_MIN, ROW_PPEM_MAX, ROW_PPEM_MIN, ROW_PX, ROW_PX_BOLD,
} from './excel-metrics-data.js';

/**
 * Nomes localizados e substituições do Windows (FontSubstitutes) → família
 * medida. Fonte desconhecida/ausente: o Excel mapeia para a Arial (medido com
 * Helvetica, Geneva, Frutiger…).
 */
const ALIASES: Record<string, string> = {
  '宋体': 'simsun', '新宋体': 'simsun', 'ms pゴシック': 'ms pgothic', 'ms ゴシック': 'ms gothic',
  '游ゴシック': 'yu gothic', '新細明體': 'pmingliu', '細明體': 'mingliu', '돋움': 'dotum',
  '굴림': 'gulim', '바탕': 'batang', '맑은 고딕': 'malgun gothic', '微软雅黑': 'microsoft yahei',
  '黑体': 'simhei', 'メイリオ': 'meiryo', '微軟正黑體': 'microsoft jhenghei',
  'helvetica': 'arial', 'helv': 'ms sans serif', 'tms rmn': 'times new roman', 'times': 'times new roman',
  'arial cyr': 'arial', 'arial ce': 'arial', 'arial greek': 'arial', 'arial tur': 'arial', 'arial baltic': 'arial',
  'times new roman cyr': 'times new roman', 'times new roman ce': 'times new roman', 'courier new cyr': 'courier new',
  'courier new ce': 'courier new',
};

const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const decoded = new Map<string, number[]>();

/** Família medida para o nome do documento (null = não medida). */
export function measuredFamily(name: string | undefined): string | null {
  if (!name) return null;
  const k = name.normalize('NFKC').trim().toLowerCase();
  const a = ALIASES[k] ?? k;
  return ROW_PX[a] !== undefined ? a : null;
}

/** ppem do GDI para o tamanho em pt a 96 dpi (MulDiv arredonda). */
export function ppemOf(sizePt: number): number {
  return Math.max(1, Math.round((sizePt * 96) / 72));
}

function decodeRows(table: Record<string, string>, fam: string): number[] | undefined {
  const key = `${table === ROW_PX_BOLD ? 'b:' : ''}${fam}`;
  let arr = decoded.get(key);
  if (arr) return arr;
  const s = table[fam];
  if (s === undefined) return undefined;
  arr = [];
  let v = 0;
  for (let i = 0; i < s.length; i++) {
    const d = B62.indexOf(s[i]!);
    v = i === 0 ? d : v + d - 16;
    arr.push(v);
  }
  decoded.set(key, arr);
  return arr;
}

/**
 * Altura (px) que o Excel dá a uma linha de texto na fonte — a altura de uma
 * linha auto-ajustada cuja maior fonte é esta, e a altura de cada linha de um
 * texto com quebra. Fonte não medida → a da Arial (o mapeamento do Excel).
 */
export function excelRowPx(name: string | undefined, sizePt: number, bold = false): number {
  const fam = measuredFamily(name) ?? 'arial';
  const p = ppemOf(sizePt);
  const reg = decodeRows(ROW_PX, fam)!;
  // negrito medido até ppem 40 (só onde difere do regular)
  const bt = bold ? decodeRows(ROW_PX_BOLD, fam) : undefined;
  if (p <= ROW_PPEM_MIN) return Math.max(1, Math.round(((bt ?? reg)[0]! * p) / ROW_PPEM_MIN));
  if (p > ROW_PPEM_MAX) return Math.round((reg[reg.length - 1]! * p) / ROW_PPEM_MAX);
  const i = p - ROW_PPEM_MIN;
  return bt && i < bt.length ? bt[i]! : reg[i]!;
}

/**
 * Largura do dígito máximo (px) da fonte Normal no Excel; undefined quando a
 * família não foi medida (o chamador estima pelo canvas). Ausente no sistema →
 * Arial, como o Excel.
 */
export function excelMdw(name: string | undefined, sizePt: number): number | undefined {
  const fam = measuredFamily(name) ?? 'arial';
  const s = MDW[fam];
  if (s === undefined) return undefined;
  const p = ppemOf(sizePt);
  const at = (q: number) => B62.indexOf(s[q - MDW_PPEM_MIN]!);
  if (p < MDW_PPEM_MIN) return Math.max(1, Math.round((at(MDW_PPEM_MIN) * p) / MDW_PPEM_MIN));
  if (p > MDW_PPEM_MAX) return Math.round((at(MDW_PPEM_MAX) * p) / MDW_PPEM_MAX);
  return at(p);
}

/** Largura de coluna (unidades de caractere do arquivo) → px. */
export function colWidthToPx(width: number, mdw: number): number {
  return Math.floor(((256 * width + Math.floor(128 / mdw)) / 256) * mdw);
}

/** Largura padrão de coluna (px) de uma aba. */
export function defaultColPx(mdw: number, defaultColWidth?: number, baseColWidth?: number): number {
  if (defaultColWidth !== undefined && defaultColWidth > 0) return colWidthToPx(defaultColWidth, mdw);
  const base = baseColWidth ?? 8;
  return Math.ceil((base * mdw + 2 * Math.ceil(mdw / 4) + 1) / 8) * 8;
}

/** Altura gravada (pt) → px como o Excel exibe (trunca ao pixel). */
export function rowPtToPx(pt: number): number {
  return Math.floor((pt * 96) / 72 + 1e-6);
}
