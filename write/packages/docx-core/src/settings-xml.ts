/**
 * Ajustes pontuais do word/settings.xml que o editor grava sem regravar a parte
 * inteira: a tabulação padrão (w:defaultTabStop — diálogo Tabulação; oráculo
 * write/tools/nav-lab tab-default: twips arredondados, 1 cm → 567).
 */
import { partByRelType } from './ooxml/parts.js';
import { parseXml, childElements } from './xml.js';
import type { DocxPackage } from './package.js';

/** Elementos de CT_Settings que vêm ANTES de w:defaultTabStop. */
const BEFORE_DEFAULT_TAB = new Set([
  'w:writeProtection', 'w:view', 'w:zoom', 'w:removePersonalInformation', 'w:removeDateAndTime',
  'w:doNotDisplayPageBoundaries', 'w:displayBackgroundShape', 'w:printPostScriptOverText',
  'w:printFractionalCharacterWidth', 'w:printFormsData', 'w:embedTrueTypeFonts', 'w:embedSystemFonts',
  'w:saveSubsetFonts', 'w:saveFormsData', 'w:mirrorMargins', 'w:alignBordersAndEdges',
  'w:bordersDoNotSurroundHeader', 'w:bordersDoNotSurroundFooter', 'w:gutterAtTop', 'w:hideSpellingErrors',
  'w:hideGrammaticalErrors', 'w:activeWritingStyle', 'w:proofState', 'w:formsDesign', 'w:attachedTemplate',
  'w:linkStyles', 'w:stylePaneFormatFilter', 'w:stylePaneSortMethod', 'w:documentType', 'w:mailMerge',
  'w:revisionView', 'w:trackRevisions', 'w:doNotTrackMoves', 'w:doNotTrackFormatting', 'w:documentProtection',
  'w:autoFormatOverride', 'w:styleLockTheme', 'w:styleLockQFSet',
]);

/** Grava w:defaultTabStop (twips) no settings.xml, trocando o valor ou pondo o
 *  elemento na posição do schema. Sem settings.xml: nada (o documento novo tem). */
export function writeDefaultTabStop(pkg: DocxPackage, twips: number): void {
  const path = partByRelType(pkg, 'settings', 'word/settings.xml');
  let xml = pkg.getPartText(path);
  if (!xml) return;
  const val = String(Math.round(twips));
  const cur = /<w:defaultTabStop\b[^>]*?\/>/.exec(xml);
  if (cur) {
    if (new RegExp(`w:val="${val}"`).test(cur[0])) return;
    xml = xml.slice(0, cur.index) + `<w:defaultTabStop w:val="${val}"/>` + xml.slice(cur.index + cur[0].length);
  } else {
    const root = parseXml(xml, { positions: true });
    if (root.cs === root.e) return;
    let at = root.cs!;
    for (const k of childElements(root)) if (BEFORE_DEFAULT_TAB.has(k.name)) at = Math.max(at, k.e!);
    xml = xml.slice(0, at) + `<w:defaultTabStop w:val="${val}"/>` + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}

/** Elementos de CT_Settings que vêm ANTES de w:evenAndOddHeaders. */
const BEFORE_EVEN_ODD = new Set([...BEFORE_DEFAULT_TAB,
  'w:defaultTabStop', 'w:autoHyphenation', 'w:consecutiveHyphenLimit', 'w:hyphenationZone', 'w:doNotHyphenateCaps',
  'w:showEnvelope', 'w:summaryLength', 'w:clickAndTypeStyle', 'w:defaultTableStyle',
]);

/** Liga/desliga w:evenAndOddHeaders (Páginas Pares e Ímpares Diferentes — vale
 *  para o documento todo; o Word grava `<w:evenAndOddHeaders/>`, oráculo hf-lab
 *  e04). Sem settings.xml: cria um mínimo quando for ligar. */
export function writeEvenAndOddHeaders(pkg: DocxPackage, on: boolean): void {
  const path = partByRelType(pkg, 'settings', 'word/settings.xml');
  let xml = pkg.getPartText(path);
  if (!xml) {
    if (!on) return;
    ensureSettingsPart(pkg);
    xml = pkg.getPartText('word/settings.xml');
    if (!xml) return;
  }
  const cur = /<w:evenAndOddHeaders\b[^>]*?(?:\/>|>[\s\S]*?<\/w:evenAndOddHeaders>)/.exec(xml);
  const isOn = !!cur && !/w:val="(?:0|false|off)"/.test(cur[0]);
  if (isOn === on) return;
  if (cur) xml = xml.slice(0, cur.index) + (on ? '<w:evenAndOddHeaders/>' : '') + xml.slice(cur.index + cur[0].length);
  else {
    const root = parseXml(xml, { positions: true });
    if (root.cs === root.e) return;
    let at = root.cs!;
    for (const k of childElements(root)) if (BEFORE_EVEN_ODD.has(k.name)) at = Math.max(at, k.e!);
    xml = xml.slice(0, at) + '<w:evenAndOddHeaders/>' + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}

/** Elementos de CT_Settings que vêm ANTES de w:displayBackgroundShape. */
const BEFORE_DISPLAY_BG = new Set(['w:writeProtection', 'w:view', 'w:zoom', 'w:removePersonalInformation', 'w:removeDateAndTime', 'w:doNotDisplayPageBoundaries']);

/** Liga/desliga w:displayBackgroundShape (mostrar a cor/efeito da página na tela —
 *  é o que o Word grava com a exibição de planos de fundo ligada; oráculo page-lab
 *  sc-solid-disp). Sem settings.xml: cria um mínimo quando for ligar. */
export function writeDisplayBackgroundShape(pkg: DocxPackage, on: boolean): void {
  const path = partByRelType(pkg, 'settings', 'word/settings.xml');
  let xml = pkg.getPartText(path);
  if (!xml) {
    if (!on) return;
    ensureSettingsPart(pkg);
    xml = pkg.getPartText('word/settings.xml');
    if (!xml) return;
  }
  const cur = /<w:displayBackgroundShape\b[^>]*?(?:\/>|>[\s\S]*?<\/w:displayBackgroundShape>)/.exec(xml);
  const isOn = !!cur && !/w:val="(?:0|false|off)"/.test(cur[0]);
  if (isOn === on) return;
  if (cur) xml = xml.slice(0, cur.index) + (on ? '<w:displayBackgroundShape/>' : '') + xml.slice(cur.index + cur[0].length);
  else {
    const root = parseXml(xml, { positions: true });
    if (root.cs === root.e) return;
    let at = root.cs!;
    for (const k of childElements(root)) if (BEFORE_DISPLAY_BG.has(k.name)) at = Math.max(at, k.e!);
    xml = xml.slice(0, at) + '<w:displayBackgroundShape/>' + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}

/** settings.xml mínimo (documento sem a parte), com rel e content type. */
function ensureSettingsPart(pkg: DocxPackage): void {
  if (pkg.getPart('word/settings.xml')) return;
  pkg.setPartText('word/settings.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>');
  const relsPath = 'word/_rels/document.xml.rels';
  const rels = pkg.getPartText(relsPath);
  if (rels && !/relationships\/settings"/.test(rels)) {
    pkg.setPartText(relsPath, rels.replace('</Relationships>',
      '<Relationship Id="rIdWnSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>'));
  }
  const ct = pkg.getPartText('[Content_Types].xml');
  if (ct && !ct.includes('PartName="/word/settings.xml"')) {
    pkg.setPartText('[Content_Types].xml', ct.replace('</Types>',
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'));
  }
}
