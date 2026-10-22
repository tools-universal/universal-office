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
