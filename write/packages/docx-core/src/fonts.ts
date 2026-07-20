/**
 * Fontes EMBEDADAS no .docx (word/fontTable.xml + word/fonts/*.odttf).
 * O Word ofusca cada arquivo TTF/OTF (ECMA-376 §17.8.1): os PRIMEIROS 32 bytes
 * são XOR'ados com uma chave de 16 bytes derivada do w:fontKey (GUID) — os bytes
 * do GUID em ordem REVERSA. Aqui lemos, desofuscamos e devolvemos os TTF/OTF
 * prontos para uso (FontFace / métricas).
 */
import type { DocxPackage } from './package.js';
import { parseXml, childElements, firstChild } from './xml.js';

export type FontVariant = 'regular' | 'bold' | 'italic' | 'boldItalic';

export interface EmbeddedFont {
  /** nome da família (w:font/@w:name), ex.: "Lato", "Lato Black". */
  family: string;
  variant: FontVariant;
  /** bytes do sfnt já DESOFUSCADO (TTF/OTF válido). */
  data: Uint8Array;
}

const EMBED_TAGS: Record<string, FontVariant> = {
  'w:embedRegular': 'regular',
  'w:embedBold': 'bold',
  'w:embedItalic': 'italic',
  'w:embedBoldItalic': 'boldItalic',
};

/** Desofusca um .odttf: XOR dos 32 primeiros bytes com a chave do GUID (revertida). */
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

/** Lê e desofusca todas as fontes embedadas do pacote. Vazio se não houver. */
export function readEmbeddedFonts(pkg: DocxPackage): EmbeddedFont[] {
  const tableXml = pkg.getPartText('word/fontTable.xml');
  if (!tableXml) return [];
  const relsXml = pkg.getPartText('word/_rels/fontTable.xml.rels');
  const rels = new Map<string, string>();
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), 'Relationship')) {
      const id = rel.attrs['Id'];
      const target = rel.attrs['Target'];
      if (id && target) rels.set(id, target);
    }
  }
  const out: EmbeddedFont[] = [];
  const root = parseXml(tableXml);
  for (const font of childElements(root, 'w:font')) {
    const family = font.attrs['w:name'];
    if (!family) continue;
    for (const [tag, variant] of Object.entries(EMBED_TAGS)) {
      const embed = firstChild(font, tag);
      if (!embed) continue;
      const rid = embed.attrs['r:id'];
      const fontKey = embed.attrs['w:fontKey'];
      if (!rid || !fontKey) continue;
      const target = rels.get(rid);
      if (!target) continue;
      const path = target.startsWith('word/') ? target : `word/${target.replace(/^\.?\//, '')}`;
      const raw = pkg.getPart(path);
      if (!raw) continue;
      out.push({ family, variant, data: deobfuscateFont(raw, fontKey) });
    }
  }
  return out;
}
