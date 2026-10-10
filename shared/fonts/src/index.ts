export { FontResolver, type FontResolverOptions } from './resolver.js';
export { browserEnvironment, type FontEnvironment } from './environment.js';
export { BUNDLED, DEFAULT_FAMILY, METRIC_SUBSTITUTES, PROBE_FAMILIES, bundledFileName } from './catalog.js';
export { isEmbeddable, standaloneFace } from './sfnt.js';
export {
  VARIANTS, faceDescriptors, isBoldVariant, isItalicVariant, variantOf, variantOfStyle,
  type FontSource, type FontVariant, type HostFontFace, type HostFontProvider, type LocalFontData, type ResolvedFont,
} from './types.js';
