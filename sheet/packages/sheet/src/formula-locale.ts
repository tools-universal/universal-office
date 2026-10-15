/**
 * Idioma das fórmulas do componente (atributo `formula-locale`): o idioma do
 * Excel (nomes de função, erros, booleanos) e a REGIÃO (separador decimal e de
 * lista), como no Excel — que tira os dois de lugares diferentes (idioma do
 * Office × configurações regionais do Windows). Por decisão do produto só há
 * dois idiomas de fórmula: pt-BR (tabela medida no oráculo) e en-US (canônico).
 *
 *   formula-locale="pt-BR" → =SOMA(A1;1,5), VERDADEIRO, #N/D
 *   formula-locale="en-US" → =SUM(A1,1.5), TRUE, #N/A
 *   formula-locale="de-DE" → nomes em inglês com a região alemã: =SUM(A1;1,5)
 * Sem o atributo vale o idioma do navegador (pt* → pt-BR; senão en-US).
 */
import { EN_US, PT_BR, valueLocaleFor, type SyntaxOptions, type ValueLocale } from '@universal/sheet-calc';

export type FormulaLang = 'pt-BR' | 'en-US';

export interface FormulaLocale {
  /** Idioma das fórmulas (nomes de função, erros, booleanos, R1C1). */
  readonly lang: FormulaLang;
  /** Região BCP-47 que decide o separador decimal (e com ele o de lista). */
  readonly region: string;
  readonly decimal: string;
  readonly list: string;
  /** Opções do tradutor canônico ↔ local (toLocal/fromLocal). */
  readonly syntax: SyntaxOptions;
  /** Convenções de valor (texto ↔ número/data, VERDADEIRO…) do motor e da entrada. */
  readonly values: ValueLocale;
}

function regionalDecimal(tag: string): string | undefined {
  try {
    return new Intl.NumberFormat(tag).formatToParts(1.5).find((p) => p.type === 'decimal')?.value;
  } catch {
    return undefined;
  }
}

/** Idioma do navegador (ou pt-BR fora dele). */
function browserTag(): string {
  const nav = (globalThis as { navigator?: { language?: string } }).navigator;
  return nav?.language || 'pt-BR';
}

/**
 * Configuração de fórmulas para uma etiqueta BCP-47 (a do atributo, ou a do
 * navegador): idioma pt-BR para qualquer "pt*", en-US para o resto; decimal da
 * região pelo Intl, lista ";" quando o decimal é "," (senão ",").
 */
export function formulaLocale(tag?: string | null): FormulaLocale {
  const region = (tag && tag.trim()) || browserTag();
  const lang: FormulaLang = /^pt\b/i.test(region) ? 'pt-BR' : 'en-US';
  const base = lang === 'pt-BR' ? PT_BR : EN_US;
  const decimal = regionalDecimal(region) ?? base.decimal;
  const list = decimal === ',' ? ';' : ',';
  // valores: as convenções medidas quando a região é a do próprio idioma; senão
  // as da região (Intl) com os booleanos do idioma das fórmulas
  let values: ValueLocale = base;
  if (region.toLowerCase() !== lang.toLowerCase()) {
    const r = valueLocaleFor(region);
    values = { ...r, trueText: base.trueText, falseText: base.falseText, generalName: base.generalName, formatLetters: base.formatLetters };
  }
  if (values.decimal !== decimal) values = { ...values, decimal, group: decimal === ',' ? '.' : ',' };
  return { lang, region, decimal, list, syntax: { lang, decimal, list }, values };
}
