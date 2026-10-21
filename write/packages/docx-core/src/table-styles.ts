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

/** Estilo interno pronto para usar (modelo expandido). */
export interface BuiltinTableStyle {
  /** w:name (inglês) */
  name: string;
  /** nome local do Word pt-BR */
  local: string;
  id: string;
  /** galeria moderna (compatibilidade 15) */
  modern: boolean;
  /** w:style com "~" no lugar do hex das cores de tema */
  xml: string;
}

let builtinCache: Promise<BuiltinTableStyle[]> | null = null;

/** Os 247 estilos internos (carregados sob demanda — o módulo de dados é grande). */
export function loadBuiltinTableStyles(): Promise<BuiltinTableStyle[]> {
  return (builtinCache ??= import('./table-styles-builtin.js').then(({ BUILTIN_TABLE_STYLES }) => {
    const out: BuiltinTableStyle[] = [];
    for (const s of BUILTIN_TABLE_STYLES) {
      for (const a of s.accents ?? [null]) {
        const sub = (x: string): string => (a === null ? x : x.replace(/\{A\}/g, String(a)));
        const local = sub(s.local);
        const id = localStyleId(local);
        out.push({ name: sub(s.name), local, id, modern: !!s.modern, xml: sub(s.xml).replace('{ID}', id) });
      }
    }
    return out;
  }));
}

const THEME_KEY: Record<string, string> = {
  text1: 'dk1', background1: 'lt1', text2: 'dk2', background2: 'lt2', dark1: 'dk1', light1: 'lt1', dark2: 'dk2', light2: 'lt2',
  hyperlink: 'hlink', followedHyperlink: 'folHlink',
};
/** Tema do Office 2023 (o Word usa sem theme1.xml). */
const OFFICE_THEME: Record<string, string> = {
  dk1: '000000', lt1: 'FFFFFF', dk2: '0E2841', lt2: 'E8E8E8', accent1: '156082', accent2: 'E97132', accent3: '196B24',
  accent4: '0F9ED5', accent5: 'A02B93', accent6: '4EA72E', hlink: '467886', folHlink: '96607D',
};

/** Cor de tema com tint/shade como o Word (HSL, canais truncados — mesmo algoritmo do motor). */
export function themeHex(colors: Record<string, string>, themeColor: string, tint?: string, shade?: string): string {
  const key = THEME_KEY[themeColor] ?? themeColor;
  const base = colors[key] ?? OFFICE_THEME[key] ?? '000000';
  if (!tint && !shade) return base.toUpperCase();
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(base.slice(i, i + 2), 16) / 255) as [number, number, number];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  if (shade) l *= parseInt(shade, 16) / 255;
  if (tint) { const t = parseInt(tint, 16) / 255; l = l * t + 1 - t; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const ch = (x: number): string => {
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
    return Math.max(0, Math.min(255, Math.floor(v * 255))).toString(16).padStart(2, '0');
  };
  return (ch(h + 1 / 3) + ch(h) + ch(h - 1 / 3)).toUpperCase();
}

/** w:style interno com o hex das cores de tema calculado do tema do documento. */
export function materializeStyleXml(xml: string, colors: Record<string, string>): string {
  const attr = (tag: string, name: string): string | undefined => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
  return xml
    .replace(/w:color="~"([^/>]*)/g, (_m, rest: string) =>
      `w:color="${themeHex(colors, attr(rest, 'w:themeColor') ?? 'text1', attr(rest, 'w:themeTint'), attr(rest, 'w:themeShade'))}"${rest}`)
    .replace(/w:fill="~"([^/>]*)/g, (_m, rest: string) =>
      `w:fill="${themeHex(colors, attr(rest, 'w:themeFill') ?? 'background1', attr(rest, 'w:themeFillTint'), attr(rest, 'w:themeFillShade'))}"${rest}`);
}

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
  f: DocFormatting, name: string, pending: Map<string, string>, builtins: readonly BuiltinTableStyle[] = [],
): string | undefined {
  const have = styleIdByName(f, name);
  if (have) return have;
  const d = CORE_TABLE_STYLES[name] ?? builtins.find((b) => b.name === name);
  if (!d) return undefined;
  let xml = materializeStyleXml(d.xml, f.theme?.colors ?? {});
  // id já usado por outro estilo: sufixo
  let id = d.id;
  while (f.styles.styles[id]) id += '1';
  if (id !== d.id) xml = xml.replace(`w:styleId="${d.id}"`, () => `w:styleId="${id}"`);
  // a base ("Normal Table") é a do documento, com o id dele
  if (name !== 'Normal Table') {
    const baseId = styleIdByName(f, 'Normal Table') ?? ensureTableStyle(f, 'Normal Table', pending, builtins);
    if (baseId) xml = xml.replace(/<w:basedOn w:val="[^"]*"\/>/, () => `<w:basedOn w:val="${baseId}"/>`);
  }
  const def = styleDefOf(xml);
  if (!def) return undefined;
  f.styles.styles[def.styleId] = def;
  if (def.isDefault && !f.styles.defaults.table) f.styles.defaults.table = def.styleId;
  pending.set(def.styleId, xml);
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
