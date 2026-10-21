/**
 * Estilos de TABELA internos do Word: a definição que o Word grava no
 * styles.xml quando o estilo é usado (medido em tools/table-lab, Word 365
 * pt-BR). O id segue o nome LOCAL do Word pt-BR sem espaços nem caracteres
 * não ASCII ("Tabela com grade" → "Tabelacomgrade"); o w:name é o inglês.
 * Documento que já tem o estilo (pelo w:name) usa o id dele.
 */
import type { DocxPackage } from './package.js';
import { readStyleSheet, type StyleDef, type DocFormatting } from './ooxml/parts.js';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

/** Definições sempre embarcadas (a galeria completa vem sob demanda). */
export const CORE_TABLE_STYLES: Record<string, { id: string; local: string; xml: string }> = {
  'Normal Table': {
    id: 'Tabelanormal', local: 'Tabela normal',
    xml: '<w:style w:type="table" w:default="1" w:styleId="Tabelanormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>',
  },
  'Table Grid': {
    id: 'Tabelacomgrade', local: 'Tabela com grade',
    xml: '<w:style w:type="table" w:styleId="Tabelacomgrade"><w:name w:val="Table Grid"/><w:basedOn w:val="Tabelanormal"/><w:uiPriority w:val="39"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>',
  },
};

/** id do Word pt-BR a partir do nome local. */
export const localStyleId = (local: string): string => local.replace(/[^A-Za-z0-9-]/g, '');

/** Definição tipada de um w:style cru (para o motor de layout). */
export function styleDefOf(xml: string): StyleDef | undefined {
  const sheet = readStyleSheet(`<w:styles ${W}>${xml}</w:styles>`);
  return Object.values(sheet.styles)[0];
}

/** Estilo do documento com esse w:name (o Word compara sem caixa). */
export function styleIdByName(f: DocFormatting | undefined, name: string): string | undefined {
  const n = name.toLowerCase();
  for (const s of Object.values(f?.styles.styles ?? {})) if (s.type === 'table' && s.name?.toLowerCase() === n) return s.styleId;
  return undefined;
}

/**
 * Garante o estilo de tabela `name` no documento: devolve o id a usar e, se
 * ele faltava, registra a definição na folha do motor e em `pending` (o XML
 * que o salvar acrescenta ao styles.xml). O "Normal Table" de base vem junto.
 */
export function ensureTableStyle(
  f: DocFormatting, name: string, pending: Map<string, string>,
  defs: Record<string, { id: string; xml: string }> = CORE_TABLE_STYLES,
): string | undefined {
  const have = styleIdByName(f, name);
  if (have) return have;
  const d = defs[name] ?? CORE_TABLE_STYLES[name];
  if (!d) return undefined;
  const def = styleDefOf(d.xml);
  if (!def) return undefined;
  if (def.basedOn && !f.styles.styles[def.basedOn]) {
    const base = Object.values(CORE_TABLE_STYLES).find((x) => x.id === def.basedOn);
    if (base) {
      const bd = styleDefOf(base.xml);
      if (bd) {
        f.styles.styles[bd.styleId] = bd;
        if (bd.isDefault && !f.styles.defaults.table) f.styles.defaults.table = bd.styleId;
        pending.set(bd.styleId, base.xml);
      }
    }
  }
  f.styles.styles[def.styleId] = def;
  pending.set(def.styleId, d.xml);
  return def.styleId;
}

/** Acrescenta ao styles.xml os w:style que faltam (o resto fica byte a byte). */
export function addStylesXml(pkg: DocxPackage, styles: Iterable<[string, string]>): void {
  const list = [...styles];
  if (!list.length) return;
  const path = 'word/styles.xml';
  let xml = pkg.getPartText(path);
  if (!xml) {
    xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}></w:styles>`;
    const ct = pkg.getPartText('[Content_Types].xml');
    if (ct && !ct.includes('/word/styles.xml')) {
      pkg.setPartText('[Content_Types].xml', ct.replace('</Types>', () => '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'));
    }
    const relsPath = 'word/_rels/document.xml.rels';
    const rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    if (!rels.includes('relationships/styles"')) {
      let n = 1;
      while (rels.includes(`Id="rId${n}"`)) n++;
      pkg.setPartText(relsPath, rels.replace('</Relationships>', () => `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`));
    }
  }
  const add = list.filter(([id]) => !new RegExp(`w:styleId="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(xml!)).map(([, x]) => x).join('');
  if (!add) return;
  pkg.setPartText(path, xml.replace(/<\/w:styles>\s*$/, () => `${add}</w:styles>`));
}
