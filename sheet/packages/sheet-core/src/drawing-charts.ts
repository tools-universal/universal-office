/**
 * Partes ligadas a um gráfico pelos rels (desenho do gráfico — `chartUserShapes`
 * —, imagens). A leitura do desenho da aba (âncoras, grupos, AlternateContent,
 * chartex) é a de `drawing.ts`.
 */
import { parseXml, childElements, type XmlElement } from './xml.js';
import type { XlsxPackage } from './package.js';

function relsPathFor(part: string): string {
  const slash = part.lastIndexOf('/');
  return `${part.slice(0, slash)}/_rels/${part.slice(slash + 1)}.rels`;
}

/** Mapa rId → parte (caminho absoluto no pacote) dos rels de `part` (só do tipo que termina em `typeSuffix`, se dado). */
export function partRels(pkg: XlsxPackage, part: string, typeSuffix?: string): Map<string, string> {
  const out = new Map<string, string>();
  const xml = pkg.getPartText(relsPathFor(part));
  if (xml === undefined) return out;
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return out; }
  for (const rel of childElements(root, 'Relationship')) {
    const id = rel.attrs['Id'], target = rel.attrs['Target'];
    if (typeSuffix && !(rel.attrs['Type'] ?? '').endsWith(typeSuffix)) continue;
    if (id && target && rel.attrs['TargetMode'] !== 'External') out.set(id, pkg.resolveRelTarget(part, target));
  }
  return out;
}
