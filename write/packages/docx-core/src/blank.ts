/**
 * Documento NOVO como o Word 365 pt-BR grava um documento em branco: estilos
 * (docDefaults, latentStyles e os do Normal.dotm), tema, configurações e tabela
 * de fontes medidos no oráculo (word-styles.ts) — títulos, citações e demais
 * estilos aparecem e são gravados como no Word. Módulo à parte de package.ts
 * para quem não cria documento novo (viewer) não levar as tabelas.
 */
import { DocxPackage } from './package.js';
import { WORD_BLANK_FONT_TABLE, WORD_BLANK_SECTPR, WORD_BLANK_SETTINGS, WORD_BLANK_STYLES, WORD_BLANK_THEME } from './word-styles.js';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** styles.xml do documento em branco (para documentos que não têm a parte). */
export const BLANK_STYLES_XML = WORD_BLANK_STYLES;

/** Opções do documento em branco. */
export interface BlankDocxOptions {
  /** Idioma do texto (tag BCP 47, ex.: `es-ES`): o `w:lang` dos padrões do
   *  documento e o `w:themeFontLang`, como o Word grava o Normal no idioma de
   *  edição. Sem ele, ou com tag inválida, `pt-BR`. */
  readonly lang?: string;
}

const LANG_TAG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function blankDocxPackage(options: BlankDocxOptions = {}): DocxPackage {
  const lang = options.lang && LANG_TAG.test(options.lang) ? options.lang : 'pt-BR';
  const pkg = DocxPackage.empty();
  const ct = 'application/vnd.openxmlformats-officedocument.';
  pkg.setPartText('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + `<Override PartName="/word/document.xml" ContentType="${ct}wordprocessingml.document.main+xml"/>`
    + `<Override PartName="/word/styles.xml" ContentType="${ct}wordprocessingml.styles+xml"/>`
    + `<Override PartName="/word/settings.xml" ContentType="${ct}wordprocessingml.settings+xml"/>`
    + `<Override PartName="/word/fontTable.xml" ContentType="${ct}wordprocessingml.fontTable+xml"/>`
    + `<Override PartName="/word/theme/theme1.xml" ContentType="${ct}theme+xml"/>`
    + '</Types>');
  pkg.setPartText('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/>`
    + `<Relationship Id="rId2" Type="${REL}/settings" Target="settings.xml"/>`
    + `<Relationship Id="rId4" Type="${REL}/fontTable" Target="fontTable.xml"/>`
    + `<Relationship Id="rId5" Type="${REL}/theme" Target="theme/theme1.xml"/>`
    + '</Relationships>');
  pkg.setPartText('word/document.xml', `${XML}<w:document xmlns:w="${W}" xmlns:r="${REL}"><w:body><w:p/>${WORD_BLANK_SECTPR}</w:body></w:document>`);
  pkg.setPartText('word/styles.xml', WORD_BLANK_STYLES.replace('<w:lang w:val="pt-BR"', `<w:lang w:val="${lang}"`));
  pkg.setPartText('word/settings.xml', WORD_BLANK_SETTINGS.replace('<w:themeFontLang w:val="pt-BR"', `<w:themeFontLang w:val="${lang}"`));
  pkg.setPartText('word/fontTable.xml', WORD_BLANK_FONT_TABLE);
  pkg.setPartText('word/theme/theme1.xml', WORD_BLANK_THEME);
  return pkg;
}
