export { FontResolver, type FontResolverOptions } from './resolver.js';
export { browserEnvironment, type FontEnvironment } from './environment.js';
export { BUNDLED, DEFAULT_FAMILY, METRIC_SUBSTITUTES, PROBE_FAMILIES, bundledFileName } from './catalog.js';
export { isEmbeddable, standaloneFace } from './sfnt.js';
export {
  VARIANTS, faceDescriptors, isBoldVariant, isItalicVariant, variantOf, variantOfStyle,
  type FontSource, type FontVariant, type HostFontFace, type HostFontProvider, type LocalFontData, type ResolvedFont,
} from './types.js';
export { subsetTrueType, type SubsetOptions } from './subset.js';
export { faceInfo, glyphIdsFor, hasTrueTypeOutlines, type FaceInfo } from './sfnt.js';
export { sfntToEot } from './eot.js';
export {
  COMMON_FONTS, DEFAULT_EMBEDDING, planFontEmbedding,
  type EmbeddingApp, type EmbeddingPlan, type EmbeddingSkipReason, type FaceToEmbed, type FontEmbeddingSettings,
  type FontUsage, type PlanOptions,
} from './embedding.js';
export {
  obfuscateOdttf, readDocxEmbedding, readPptxEmbedding, writeDocxEmbedding, writePptxEmbedding, type OpcPackage,
} from './ooxml.js';
