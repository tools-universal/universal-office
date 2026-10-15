/**
 * Idiomas do Excel: tabelas registradas (en-US canônico, pt-BR medido no
 * oráculo, outros importados por tools/locale/import.mjs) e a lista dos
 * idiomas de interface do Office.
 */
import type { FormulaLanguage, TableKeywords } from './types.js';
import { PT_BR_LANG } from './langs/pt-BR.js';

/** Inglês (EUA): a sintaxe canônica — nomes, erros e palavras-chave do arquivo. */
export const EN_US_LANG: FormulaLanguage = {
  id: 'en-US', lcid: 1033, name: 'English (United States)',
  functions: {},
  bools: ['TRUE', 'FALSE'],
  r1c1: { row: 'R', col: 'C' },
  table: { all: '#All', data: '#Data', headers: '#Headers', totals: '#Totals', thisRow: '#This Row' },
  array: { col: ',', row: ';' },
  format: { year: 'y', month: 'm', day: 'd', hour: 'h', minute: 'm', second: 's', general: 'General' },
  regional: { decimal: '.', list: ',' },
  source: 'canônico (OOXML / Formula2 do Excel)',
};

/** Palavras-chave canônicas das referências estruturadas. */
export const CANONICAL_TABLE: TableKeywords = EN_US_LANG.table as TableKeywords;

const LANGS = new Map<string, FormulaLanguage>();

/** Registra (ou substitui) a tabela de um idioma. */
export function registerLanguage(lang: FormulaLanguage): void {
  LANGS.set(lang.id.toLowerCase(), lang);
}
registerLanguage(EN_US_LANG);
registerLanguage(PT_BR_LANG);

/**
 * Tabela do idioma: exata ("de-AT") → variante principal da mesma língua
 * (de-DE) → undefined. pt-BR e pt-PT são idiomas diferentes no Excel.
 */
export function getLanguage(id: string): FormulaLanguage | undefined {
  const k = id.toLowerCase();
  const exact = LANGS.get(k);
  if (exact) return exact;
  const base = k.split('-')[0]!;
  const main = EXCEL_LANGUAGES.find((l) => l.id.toLowerCase().split('-')[0] === base && l.main);
  return main ? LANGS.get(main.id.toLowerCase()) : undefined;
}

/** Tabelas registradas. */
export function languages(): FormulaLanguage[] {
  return [...LANGS.values()];
}

/** Idioma de interface do Office/Excel. */
export interface ExcelLanguageInfo {
  readonly id: string;
  readonly lcid: number;
  readonly name: string;
  /**
   * Nomes de função do Excel nesse idioma: 'localized' (traduzidos), 'english'
   * (o Excel usa os nomes em inglês) ou 'unknown'. Só pt-BR e en-US foram
   * medidos nesta máquina; os demais são o que se sabe do produto e precisam
   * ser confirmados pela fonte de dados do idioma.
   */
  readonly functionNames: 'localized' | 'english' | 'unknown';
  /** Variante usada quando se pede só a língua ("de" → de-DE). */
  readonly main?: boolean;
  /** Medido no oráculo desta máquina. */
  readonly measured?: boolean;
}

/** Idiomas de interface do Office 365 (pacotes de idioma completos). */
export const EXCEL_LANGUAGES: readonly ExcelLanguageInfo[] = [
  { id: 'ar-SA', lcid: 1025, name: 'العربية', functionNames: 'english', main: true },
  { id: 'bg-BG', lcid: 1026, name: 'Български', functionNames: 'unknown', main: true },
  { id: 'ca-ES', lcid: 1027, name: 'Català', functionNames: 'unknown', main: true },
  { id: 'cs-CZ', lcid: 1029, name: 'Čeština', functionNames: 'localized', main: true },
  { id: 'da-DK', lcid: 1030, name: 'Dansk', functionNames: 'localized', main: true },
  { id: 'de-DE', lcid: 1031, name: 'Deutsch', functionNames: 'localized', main: true },
  { id: 'el-GR', lcid: 1032, name: 'Ελληνικά', functionNames: 'unknown', main: true },
  { id: 'en-US', lcid: 1033, name: 'English (United States)', functionNames: 'english', main: true, measured: true },
  { id: 'en-GB', lcid: 2057, name: 'English (United Kingdom)', functionNames: 'english' },
  { id: 'es-ES', lcid: 3082, name: 'Español (España)', functionNames: 'localized', main: true },
  { id: 'es-MX', lcid: 2058, name: 'Español (México)', functionNames: 'localized' },
  { id: 'et-EE', lcid: 1061, name: 'Eesti', functionNames: 'unknown', main: true },
  { id: 'eu-ES', lcid: 1069, name: 'Euskara', functionNames: 'unknown', main: true },
  { id: 'fi-FI', lcid: 1035, name: 'Suomi', functionNames: 'localized', main: true },
  { id: 'fr-FR', lcid: 1036, name: 'Français (France)', functionNames: 'localized', main: true },
  { id: 'fr-CA', lcid: 3084, name: 'Français (Canada)', functionNames: 'localized' },
  { id: 'gl-ES', lcid: 1110, name: 'Galego', functionNames: 'unknown', main: true },
  { id: 'he-IL', lcid: 1037, name: 'עברית', functionNames: 'english', main: true },
  { id: 'hi-IN', lcid: 1081, name: 'हिन्दी', functionNames: 'english', main: true },
  { id: 'hr-HR', lcid: 1050, name: 'Hrvatski', functionNames: 'unknown', main: true },
  { id: 'hu-HU', lcid: 1038, name: 'Magyar', functionNames: 'localized', main: true },
  { id: 'id-ID', lcid: 1057, name: 'Bahasa Indonesia', functionNames: 'unknown', main: true },
  { id: 'it-IT', lcid: 1040, name: 'Italiano', functionNames: 'localized', main: true },
  { id: 'ja-JP', lcid: 1041, name: '日本語', functionNames: 'english', main: true },
  { id: 'kk-KZ', lcid: 1087, name: 'Қазақ', functionNames: 'unknown', main: true },
  { id: 'ko-KR', lcid: 1042, name: '한국어', functionNames: 'english', main: true },
  { id: 'lt-LT', lcid: 1063, name: 'Lietuvių', functionNames: 'unknown', main: true },
  { id: 'lv-LV', lcid: 1062, name: 'Latviešu', functionNames: 'unknown', main: true },
  { id: 'ms-MY', lcid: 1086, name: 'Bahasa Melayu', functionNames: 'unknown', main: true },
  { id: 'nb-NO', lcid: 1044, name: 'Norsk bokmål', functionNames: 'localized', main: true },
  { id: 'nl-NL', lcid: 1043, name: 'Nederlands', functionNames: 'localized', main: true },
  { id: 'pl-PL', lcid: 1045, name: 'Polski', functionNames: 'localized', main: true },
  { id: 'pt-BR', lcid: 1046, name: 'Português (Brasil)', functionNames: 'localized', measured: true },
  { id: 'pt-PT', lcid: 2070, name: 'Português (Portugal)', functionNames: 'localized', main: true },
  { id: 'ro-RO', lcid: 1048, name: 'Română', functionNames: 'unknown', main: true },
  { id: 'ru-RU', lcid: 1049, name: 'Русский', functionNames: 'localized', main: true },
  { id: 'sk-SK', lcid: 1051, name: 'Slovenčina', functionNames: 'unknown', main: true },
  { id: 'sl-SI', lcid: 1060, name: 'Slovenščina', functionNames: 'unknown', main: true },
  { id: 'sr-Latn-RS', lcid: 9242, name: 'Srpski (latinica)', functionNames: 'unknown', main: true },
  { id: 'sv-SE', lcid: 1053, name: 'Svenska', functionNames: 'localized', main: true },
  { id: 'th-TH', lcid: 1054, name: 'ไทย', functionNames: 'english', main: true },
  { id: 'tr-TR', lcid: 1055, name: 'Türkçe', functionNames: 'localized', main: true },
  { id: 'uk-UA', lcid: 1058, name: 'Українська', functionNames: 'unknown', main: true },
  { id: 'vi-VN', lcid: 1066, name: 'Tiếng Việt', functionNames: 'english', main: true },
  { id: 'zh-CN', lcid: 2052, name: '中文(简体)', functionNames: 'english', main: true },
  { id: 'zh-TW', lcid: 1028, name: '中文(繁體)', functionNames: 'english', main: true },
];
