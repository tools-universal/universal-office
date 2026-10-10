// Incorporar fontes no documento — a decisão é ÚNICA para os apps (o que
// entra, com quais bytes, o que fica de fora e por quê); cada formato só grava
// (ooxml.ts). Regras medidas nos programas de referência desta máquina:
//  - Word: "não incorporar fontes comuns do sistema" (padrão ligado) deixa de
//    fora SÓ Arial, Times New Roman e Courier New — Calibri, Cambria, Segoe UI,
//    Aptos (nuvem do Office) entram; incorpora as VARIANTES usadas; padrão:
//    todos os caracteres (SaveSubsetFonts = false).
//  - PowerPoint: nunca incorpora Arial, Times New Roman, Courier New, Calibri e
//    Aptos; incorpora as 4 variantes da família; padrão: só os caracteres
//    usados (saveSubsetFonts="1").
//  - Excel: o formato não tem fontes incorporadas (o app nem oferece a opção).
import { glyphIdsFor, hasTrueTypeOutlines, isEmbeddable, faceInfo, type FaceInfo } from './sfnt.js';
import { subsetTrueType } from './subset.js';
import type { FontResolver } from './resolver.js';
import { VARIANTS, type FontVariant } from './types.js';

export type EmbeddingApp = 'write' | 'slides';

export interface FontEmbeddingSettings {
  /** Incorporar as fontes no arquivo. */
  embed: boolean;
  /** Só os caracteres usados (arquivo menor; editar com outros caracteres
   *  em outra máquina cai na substituta). */
  subset: boolean;
  /** Não incorporar as fontes comuns do sistema (Word: Arial, Times New
   *  Roman, Courier New). No Slides a lista do PowerPoint vale sempre. */
  skipCommonFonts: boolean;
}

/** Padrões de cada programa (a opção em si começa desligada, como no Office). */
export const DEFAULT_EMBEDDING: Readonly<Record<EmbeddingApp, FontEmbeddingSettings>> = {
  write: { embed: false, subset: false, skipCommonFonts: true },
  slides: { embed: false, subset: true, skipCommonFonts: true },
};

/** Fontes que cada programa não incorpora (medido). */
export const COMMON_FONTS: Readonly<Record<EmbeddingApp, readonly string[]>> = {
  write: ['Arial', 'Times New Roman', 'Courier New'],
  slides: ['Arial', 'Times New Roman', 'Courier New', 'Calibri', 'Aptos'],
};

/** O que o documento usa de uma família. */
export interface FontUsage {
  family: string;
  variants: Iterable<FontVariant>;
  /** Texto escrito na família (para o subconjunto de caracteres). */
  text: string;
}

export interface FaceToEmbed {
  family: string;
  variant: FontVariant;
  /** sfnt (TTF/OTF) pronto para o formato envelopar. */
  bytes: Uint8Array;
  subsetted: boolean;
  info: FaceInfo;
}

export type EmbeddingSkipReason =
  /** fonte comum do sistema (regra do programa) */
  | 'common'
  /** a licença da fonte não permite incorporar */
  | 'license'
  /** sem o ARQUIVO da fonte (não instalada, ou o navegador não dá os bytes) */
  | 'unavailable'
  /** já está incorporada no arquivo (mantida como veio) */
  | 'already-embedded';

export interface EmbeddingPlan {
  faces: FaceToEmbed[];
  skipped: { family: string; reason: EmbeddingSkipReason }[];
}

export interface PlanOptions {
  /** Bytes que o documento já trazia (fonte embutida no arquivo aberto). */
  documentFace?: (family: string, variant: FontVariant) => Uint8Array | undefined;
  /** Famílias que já estão incorporadas no pacote (ficam como vieram). */
  alreadyEmbedded?: ReadonlySet<string>;
}

/**
 * Decide o que incorporar. Bytes, nesta ordem: os que o documento já trazia,
 * e os do resolvedor quando são o ARQUIVO da própria família (host, Local Font
 * Access, aberta embarcada de mesmo nome). Substituta (Calibri → Carlito)
 * NUNCA entra no lugar da original.
 */
export async function planFontEmbedding(
  resolver: FontResolver,
  usage: readonly FontUsage[],
  settings: FontEmbeddingSettings,
  app: EmbeddingApp,
  opts: PlanOptions = {},
): Promise<EmbeddingPlan> {
  const plan: EmbeddingPlan = { faces: [], skipped: [] };
  if (!settings.embed) return plan;

  // junta o uso por família (o documento pode repetir a família)
  const byFamily = new Map<string, { family: string; variants: Set<FontVariant>; chars: Set<number> }>();
  for (const u of usage) {
    if (!u.family) continue;
    const key = u.family.toLowerCase();
    const e = byFamily.get(key) ?? { family: u.family, variants: new Set<FontVariant>(), chars: new Set<number>() };
    for (const v of u.variants) e.variants.add(v);
    for (const ch of u.text) e.chars.add(ch.codePointAt(0)!);
    byFamily.set(key, e);
  }

  const common = new Set(COMMON_FONTS[app].map((f) => f.toLowerCase()));
  const skipCommon = app === 'slides' || settings.skipCommonFonts;
  const resolved = new Map((await resolver.resolve([...byFamily.values()].map((e) => e.family))).map((r) => [r.family.toLowerCase(), r]));

  for (const [key, use] of byFamily) {
    if (opts.alreadyEmbedded?.has(key)) { plan.skipped.push({ family: use.family, reason: 'already-embedded' }); continue; }
    if (skipCommon && common.has(key)) { plan.skipped.push({ family: use.family, reason: 'common' }); continue; }
    const r = resolved.get(key);
    const ownFile = r && (r.source === 'host' || r.source === 'local-access' || r.source === 'bundled');
    // PowerPoint: as 4 variantes da família; Word: só as usadas
    const wanted = app === 'slides' ? VARIANTS : VARIANTS.filter((v) => use.variants.has(v));
    let found = 0, blocked = 0;
    for (const v of wanted) {
      // embarcada/substituta chega só com a regular: as outras variantes baixam aqui
      const bytes = opts.documentFace?.(use.family, v) ?? (ownFile ? r!.faces[v] ?? (await resolver.loadFace(r!, v)) : undefined);
      if (!bytes) continue;
      found++;
      if (!isEmbeddable(bytes)) { blocked++; continue; }
      const subset = settings.subset && hasTrueTypeOutlines(bytes);
      const data = subset ? subsetTrueType(bytes, glyphIdsFor(bytes, use.chars), { keepLayout: true }) : bytes;
      plan.faces.push({ family: use.family, variant: v, bytes: data, subsetted: subset, info: faceInfo(bytes) });
    }
    if (!found) plan.skipped.push({ family: use.family, reason: 'unavailable' });
    else if (found === blocked) plan.skipped.push({ family: use.family, reason: 'license' });
  }
  return plan;
}
