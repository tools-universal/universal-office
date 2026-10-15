/**
 * Partes da pasta que o CÁLCULO toca ao gravar o .xlsx — cirurgia mínima no
 * XML original (o resto flui byte a byte), como o Excel 365 grava (medido em
 * `_lab/calc/io`):
 * - `xl/calcChain.xml`: a cadeia lista as células com fórmula; cadeia velha
 *   (célula que deixou de ter fórmula) faz o Excel "reparar" a pasta. Sem ela
 *   o Excel abre normalmente, não recalcula por isso e a refaz — então, quando
 *   o `<sheetData>` é regenerado, a cadeia sai (parte, relação e tipo);
 * - `<calcPr>`: atributos trocados sem perder os outros; criado na posição do
 *   esquema se faltar;
 * - `xl/metadata.xml`: o `cm` das matrizes dinâmicas aponta para um
 *   `<cellMetadata>` cujo tipo é XLDAPR com `fDynamic="1"` — criado (ou
 *   acrescentado ao que já existe: XLRICHVALUE etc.) quando preciso;
 * - `<definedNames>`: só os nomes criados/alterados/removidos mudam; os outros
 *   (e atributos que o modelo não guarda) ficam como estão.
 */
import type { XlsxPackage } from './package.js';
import type { DefinedName } from './model.js';

const WB = 'xl/workbook.xml';
const WB_RELS = 'xl/_rels/workbook.xml.rels';
const CT = '[Content_Types].xml';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CALC_CHAIN_REL = `${REL_NS}/calcChain`;
const METADATA_REL = `${REL_NS}/sheetMetadata`;
const METADATA_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml';

const escAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Relações do workbook com o tipo dado: [Id, Target, elemento inteiro]. */
function wbRels(pkg: XlsxPackage, type: string): { id: string; target: string; el: string }[] {
  const xml = pkg.getPartText(WB_RELS) ?? '';
  const out: { id: string; target: string; el: string }[] = [];
  for (const m of xml.matchAll(/<Relationship\b[^>]*\/>|<Relationship\b[^>]*>[\s\S]*?<\/Relationship>/g)) {
    const el = m[0];
    if (attr(el, 'Type') !== type) continue;
    out.push({ id: attr(el, 'Id') ?? '', target: attr(el, 'Target') ?? '', el });
  }
  return out;
}

function attr(el: string, name: string): string | undefined {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(el);
  return m ? (m[2] ?? m[3]) : undefined;
}

/** Remove a calcChain (parte, relação, Override). Devolve se havia. */
export function removeCalcChain(pkg: XlsxPackage): boolean {
  const rels = wbRels(pkg, CALC_CHAIN_REL);
  let removed = false;
  for (const r of rels) {
    const part = pkg.resolveRelTarget(WB, r.target);
    if (pkg.deletePart(part)) removed = true;
    pkg.setPartText(WB_RELS, pkg.getPartText(WB_RELS)!.replace(r.el, ''));
    const ct = pkg.getPartText(CT);
    if (ct !== undefined) pkg.setPartText(CT, ct.replace(new RegExp(`<Override\\b[^>]*PartName="/${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`, 'i'), ''));
  }
  if (!rels.length && pkg.deletePart('xl/calcChain.xml')) removed = true;
  return removed;
}

/** Elementos de CT_Workbook que vêm DEPOIS de calcPr (para inserir na ordem do esquema). */
const AFTER_CALCPR = ['oleSize', 'customWorkbookViews', 'pivotCaches', 'smartTagPr', 'smartTagTypes', 'webPublishing', 'fileRecoveryPr', 'webPublishObjects', 'extLst'];

/**
 * Troca atributos do `<calcPr>` (valor undefined remove o atributo); cria o
 * elemento se faltar. Os demais atributos ficam como estão.
 */
export function updateCalcPr(pkg: XlsxPackage, patch: Record<string, string | undefined>): void {
  let xml = pkg.workbookXml();
  const m = /<calcPr\b([^>]*?)(\/>|>([\s\S]*?)<\/calcPr>)/.exec(xml);
  if (m) {
    let attrs = m[1]!;
    for (const [k, v] of Object.entries(patch)) {
      const re = new RegExp(`\\s${k}\\s*=\\s*("[^"]*"|'[^']*')`);
      if (v === undefined) attrs = attrs.replace(re, '');
      else if (re.test(attrs)) attrs = attrs.replace(re, ` ${k}="${escAttr(v)}"`);
      else attrs += ` ${k}="${escAttr(v)}"`;
    }
    const el = m[3] !== undefined ? `<calcPr${attrs}>${m[3]}</calcPr>` : `<calcPr${attrs}/>`;
    xml = xml.slice(0, m.index) + el + xml.slice(m.index + m[0].length);
  } else {
    const attrs = Object.entries(patch).filter(([, v]) => v !== undefined).map(([k, v]) => ` ${k}="${escAttr(v!)}"`).join('');
    const prefix = /<(\w+:)?workbook\b/.exec(xml)?.[1] ?? '';
    const el = `<${prefix}calcPr${attrs}/>`;
    let at = -1;
    for (const name of AFTER_CALCPR) {
      const i = xml.search(new RegExp(`<${prefix}${name}[\\s/>]`));
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    if (at < 0) at = xml.lastIndexOf(`</${prefix}workbook>`);
    xml = xml.slice(0, at) + el + xml.slice(at);
  }
  pkg.setPartText(WB, xml);
}

const XLDAPR_TYPE = '<metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/>';
const XLDAPR_BK = '<bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk>';
const XDA_NS = 'http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray';

/**
 * Índice `cm` (1-based) de matriz dinâmica: o que já existe no metadata.xml ou
 * um novo (cria a parte, a relação e o tipo de conteúdo se faltarem).
 */
export function ensureDynamicArrayCm(pkg: XlsxPackage): number {
  const rel = wbRels(pkg, METADATA_REL)[0];
  const part = rel ? pkg.resolveRelTarget(WB, rel.target) : 'xl/metadata.xml';
  let xml = pkg.getPartText(part);
  if (xml === undefined) {
    pkg.setPartText(part, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + `<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xda="${XDA_NS}">`
      + `<metadataTypes count="1">${XLDAPR_TYPE}</metadataTypes><futureMetadata name="XLDAPR" count="1">${XLDAPR_BK}</futureMetadata>`
      + '<cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>');
    if (!rel) addWbRel(pkg, METADATA_REL, part.replace(/^xl\//, ''));
    const ct = pkg.getPartText(CT);
    if (ct !== undefined && !ct.includes(`PartName="/${part}"`)) pkg.setPartText(CT, ct.replace('</Types>', `<Override PartName="/${part}" ContentType="${METADATA_CT}"/></Types>`));
    return 1;
  }
  // tipos (1-based) e blocos de futureMetadata XLDAPR
  const types = [...xml.matchAll(/<metadataType\b[^>]*?name="([^"]*)"/g)].map((m) => m[1]);
  let t = types.indexOf('XLDAPR') + 1;
  const fm = /<futureMetadata\b[^>]*name="XLDAPR"[^>]*>([\s\S]*?)<\/futureMetadata>/.exec(xml);
  const bks = fm ? [...fm[1]!.matchAll(/<bk>[\s\S]*?<\/bk>/g)].map((m) => m[0]) : [];
  let v = bks.findIndex((b) => /fDynamic="(1|true)"/.test(b));
  // cellMetadata existente que já aponta para (t, v)
  const cmBlock = /<cellMetadata\b[^>]*>([\s\S]*?)<\/cellMetadata>/.exec(xml);
  if (t > 0 && v >= 0 && cmBlock) {
    const cbks = [...cmBlock[1]!.matchAll(/<bk>([\s\S]*?)<\/bk>/g)];
    const i = cbks.findIndex((b) => new RegExp(`<rc\\s+t="${t}"\\s+v="${v}"\\s*/>`).test(b[1]!));
    if (i >= 0) return i + 1;
  }
  // acrescenta o que falta
  if (!xml.includes(`xmlns:xda="${XDA_NS}"`)) xml = xml.replace(/<metadata\b/, `<metadata xmlns:xda="${XDA_NS}"`);
  if (t <= 0) {
    if (/<metadataTypes\b/.test(xml)) xml = xml.replace(/<metadataTypes\b([^>]*)>([\s\S]*?)<\/metadataTypes>/, (_m, a: string, body: string) => `<metadataTypes${bump(a)}>${body}${XLDAPR_TYPE}</metadataTypes>`);
    else xml = xml.replace(/(<metadata\b[^>]*>)/, `$1<metadataTypes count="1">${XLDAPR_TYPE}</metadataTypes>`);
    t = types.length + 1;
  }
  if (v < 0) {
    if (fm) {
      xml = xml.replace(/<futureMetadata\b([^>]*name="XLDAPR"[^>]*)>([\s\S]*?)<\/futureMetadata>/, (_m, a: string, body: string) => `<futureMetadata${bump(a)}>${body}${XLDAPR_BK}</futureMetadata>`);
      v = bks.length;
    } else {
      // futureMetadata vem depois de metadataTypes/metadataStrings/mdxMetadata
      const fut = `<futureMetadata name="XLDAPR" count="1">${XLDAPR_BK}</futureMetadata>`;
      const anchor = /<\/mdxMetadata>|<\/metadataStrings>|<\/metadataTypes>/g;
      let last = -1, len = 0;
      for (const m of xml.matchAll(anchor)) { last = m.index!; len = m[0].length; }
      xml = last >= 0 ? xml.slice(0, last + len) + fut + xml.slice(last + len) : xml.replace(/(<metadata\b[^>]*>)/, `$1${fut}`);
      v = 0;
    }
  }
  let cm: number;
  if (/<cellMetadata\b/.test(xml)) {
    const n = [...(/<cellMetadata\b[^>]*>([\s\S]*?)<\/cellMetadata>/.exec(xml)?.[1] ?? '').matchAll(/<bk>/g)].length;
    xml = xml.replace(/<cellMetadata\b([^>]*)>([\s\S]*?)<\/cellMetadata>/, (_m, a: string, body: string) => `<cellMetadata${bump(a)}>${body}<bk><rc t="${t}" v="${v}"/></bk></cellMetadata>`);
    cm = n + 1;
  } else {
    // cellMetadata vem antes de valueMetadata
    const el = `<cellMetadata count="1"><bk><rc t="${t}" v="${v}"/></bk></cellMetadata>`;
    xml = /<valueMetadata\b/.test(xml) ? xml.replace(/<valueMetadata\b/, `${el}<valueMetadata`) : xml.replace(/<\/metadata>/, `${el}</metadata>`);
    cm = 1;
  }
  pkg.setPartText(part, xml);
  return cm;
}

/** count="n" → n+1. */
function bump(attrs: string): string {
  return /\scount="\d+"/.test(attrs) ? attrs.replace(/\scount="(\d+)"/, (_m, n: string) => ` count="${+n + 1}"`) : attrs;
}

function addWbRel(pkg: XlsxPackage, type: string, target: string): string {
  const xml = pkg.getPartText(WB_RELS) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const ids = new Set([...xml.matchAll(/\sId="([^"]*)"/g)].map((m) => m[1]));
  let n = ids.size + 1;
  while (ids.has(`rId${n}`)) n++;
  const id = `rId${n}`;
  pkg.setPartText(WB_RELS, xml.replace('</Relationships>', `<Relationship Id="${id}" Type="${type}" Target="${escAttr(target)}"/></Relationships>`));
  return id;
}

/** Chave de um nome definido: nome (sem diferenciar maiúsculas) + escopo. */
const nameKey = (name: string, local: number | undefined): string => `${name.toUpperCase()}|${local ?? -1}`;

/**
 * Cria/altera/remove nomes definidos SEM tocar nos demais (atributos que o
 * modelo não guarda — comment, function, xlm… — ficam). `formula` = texto
 * canônico de arquivo sem "=". O bloco `<definedNames>` é criado antes de
 * `<calcPr>` (ordem do esquema) e some quando fica vazio.
 */
export function updateDefinedNames(pkg: XlsxPackage, upserts: readonly DefinedName[], removals: readonly { name: string; localSheetId?: number }[] = []): void {
  let xml = pkg.workbookXml();
  const prefix = /<(\w+:)?workbook\b/.exec(xml)?.[1] ?? '';
  const el = (d: DefinedName, keep = ''): string => `<${prefix}definedName name="${escAttr(d.name)}"${d.localSheetId !== undefined ? ` localSheetId="${d.localSheetId}"` : ''}${d.hidden ? ' hidden="1"' : ''}${keep}>${escText(d.formula)}</${prefix}definedName>`;
  const re = new RegExp(`<${prefix}definedNames\\b[^>]*?(/>|>([\\s\\S]*?)</${prefix}definedNames>)`);
  const m = re.exec(xml);
  const items: string[] = m?.[2] !== undefined ? [...m[2].matchAll(new RegExp(`<${prefix}definedName\\b[^>]*?(/>|>[\\s\\S]*?</${prefix}definedName>)`, 'g'))].map((x) => x[0]) : [];
  const keyOf = (item: string): string => {
    const ls = attr(item, 'localSheetId');
    return nameKey(attr(item, 'name') ?? '', ls !== undefined && /^\d+$/.test(ls) ? +ls : undefined);
  };
  const drop = new Set(removals.map((r) => nameKey(r.name, r.localSheetId)));
  const set = new Map(upserts.map((d) => [nameKey(d.name, d.localSheetId), d]));
  const out: string[] = [];
  for (const item of items) {
    const k = keyOf(item);
    if (drop.has(k)) continue;
    const d = set.get(k);
    if (!d) { out.push(item); continue; }
    set.delete(k);
    // mantém os atributos que o modelo não conhece
    const open = /^<[^>]*/.exec(item)![0];
    const keep = [...open.matchAll(/\s([\w:]+)\s*=\s*("[^"]*"|'[^']*')/g)]
      .filter((a) => !['name', 'localSheetId', 'hidden'].includes(a[1]!)).map((a) => ` ${a[1]}=${a[2]}`).join('');
    out.push(el(d, keep));
  }
  for (const d of set.values()) out.push(el(d));
  const block = out.length ? `<${prefix}definedNames>${out.join('')}</${prefix}definedNames>` : '';
  if (m) xml = xml.slice(0, m.index) + block + xml.slice(m.index + m[0].length);
  else if (block) {
    let at = -1;
    for (const name of ['calcPr', ...AFTER_CALCPR]) {
      const i = xml.search(new RegExp(`<${prefix}${name}[\\s/>]`));
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    if (at < 0) at = xml.lastIndexOf(`</${prefix}workbook>`);
    xml = xml.slice(0, at) + block + xml.slice(at);
  }
  pkg.setPartText(WB, xml);
}
