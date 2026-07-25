/**
 * Fontes EMBUTIDAS no .pptx — mesma lógica do Universal Write (docx-core/fonts.ts),
 * adaptada ao PresentationML: `ppt/presentation.xml <p:embeddedFontLst>` lista
 * `<p:embeddedFont><p:font typeface/><p:regular|bold|italic|boldItalic r:id/>`
 * e os bytes vivem em `ppt/fonts/fontN.fntdata`.
 *
 * O PowerPoint grava o fntdata como sfnt CRU (TTF/OTF) na maioria dos casos;
 * alguns produtores usam a ofuscação odttf do ECMA-376 §17.8.1 (XOR dos 32
 * primeiros bytes com o GUID revertido). Detectamos pelo magic do sfnt e, sem
 * magic válido, tentamos desofuscar com o fontKey quando presente.
 */
import type { PptxPackage } from './package.js';
import { parseXml, childElements, firstChild } from './xml.js';
import { readRels } from './read.js';

export type FontVariant = 'regular' | 'bold' | 'italic' | 'boldItalic';

export interface EmbeddedFont {
  /** Família (p:font/@typeface), ex.: "Creepster". */
  family: string;
  variant: FontVariant;
  /** Bytes sfnt prontos para FontFace. */
  data: Uint8Array;
}

const VARIANT_TAGS: [string, FontVariant][] = [
  ['p:regular', 'regular'],
  ['p:bold', 'bold'],
  ['p:italic', 'italic'],
  ['p:boldItalic', 'boldItalic'],
];

/** Magic sfnt válido? (TrueType 00 01 00 00, OTTO, true, ttcf). */
function looksLikeSfnt(d: Uint8Array): boolean {
  if (d.length < 4) return false;
  const m = (d[0]! << 24) | (d[1]! << 16) | (d[2]! << 8) | d[3]!;
  return m === 0x00010000 || m === 0x4f54544f /* OTTO */ ||
    m === 0x74727565 /* true */ || m === 0x74746366 /* ttcf */;
}

/** Desofusca odttf: XOR dos 32 primeiros bytes com a chave do GUID (revertida). */
export function deobfuscateFont(data: Uint8Array, fontKey: string): Uint8Array {
  const hex = fontKey.replace(/[{}-]/g, '');
  if (hex.length < 32) return data;
  const key = new Uint8Array(16);
  for (let i = 0; i < 16; i++) key[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  key.reverse();
  const out = data.slice();
  const n = Math.min(32, out.length);
  for (let i = 0; i < n; i++) out[i] = out[i]! ^ key[i % 16]!;
  return out;
}

/** Lê todas as fontes embutidas do pacote. Vazio se o deck não embute fontes. */
export function readEmbeddedFonts(pkg: PptxPackage): EmbeddedFont[] {
  const xml = pkg.getPartText('ppt/presentation.xml');
  if (!xml) return [];
  const root = parseXml(xml);
  const lst = firstChild(root, 'p:embeddedFontLst');
  if (!lst) return [];
  const rels = readRels(pkg, 'ppt/_rels/presentation.xml.rels', 'ppt/presentation.xml');
  const out: EmbeddedFont[] = [];
  for (const ef of childElements(lst, 'p:embeddedFont')) {
    const fontEl = firstChild(ef, 'p:font');
    const family = fontEl?.attrs['typeface'];
    if (!family) continue;
    for (const [tag, variant] of VARIANT_TAGS) {
      const v = firstChild(ef, tag);
      const rid = v?.attrs['r:id'];
      if (!rid) continue;
      const target = rels.get(rid);
      if (!target) continue;
      const raw = pkg.getPart(target);
      if (!raw) continue;
      let data = raw;
      if (!looksLikeSfnt(data)) {
        const key = v?.attrs['fontKey'] ?? v?.attrs['p:fontKey'];
        if (key) data = deobfuscateFont(raw, key);
        if (!looksLikeSfnt(data)) continue; // formato desconhecido: pula
      }
      out.push({ family, variant, data });
    }
  }
  return out;
}

/**
 * Typefaces usados pelo deck (runs + tema): entrada do carregamento sob demanda
 * de fontes do SO. Aliases de tema (+mj-lt/+mn-lt) já devem estar resolvidos
 * nos runs pela cascata; aqui coletamos o que sobrou literal no XML.
 */
export function collectDeckTypefaces(pkg: PptxPackage): string[] {
  const out = new Set<string>();
  for (const part of pkg.partNames()) {
    if (!/^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(part)) continue;
    const xml = pkg.getPartText(part);
    if (!xml) continue;
    for (const m of xml.matchAll(/typeface="([^"+][^"]*)"/g)) out.add(m[1]!);
  }
  return [...out].sort();
}
