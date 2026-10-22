// @universal-office/drawingml — DrawingML sem DOM, um lugar só para os três apps:
// - formas predefinidas: as 187 de presetShapeDefinitions.xml (preset-defs) e o
//   intérprete das fórmulas (preset-engine), com o descritor de caminho (geometry);
// - luz do 3D (light3d): tabelas de iluminação dos lightRig/material do Office.
export { presetPath, type PresetPath, type Pt, type PathSeg } from './geometry.js';
export { evalPreset, hasPresetDef, presetGuides, presetTextRect, customGuides, arcToSeg, type PresetGeometry } from './preset-engine.js';
export { PRESET_DEFS } from './preset-defs.js';
export { lightTable, lightAt, lightFace, bevelPhi } from './light3d.js';
// - rasterização sem DOM (máscaras, desfoque, distância) e os efeitos de imagem
//   (sombra, sombra interna, brilho, bordas suaves, reflexo) medidos no Word.
export { presetOutline, type Outline } from './outline.js';
export {
  newMask, flattenPath, fillPolygons, gaussianBlur, distanceTo, morph, shiftMask, warpMask, invertAffine, mulAffine, IDENTITY,
  type Mask, type Affine,
} from './raster.js';
export { alignPoint, shadowAffine, outerShadowMask, innerShadowMask, glowMask, softEdgeMask, reflectionAlpha, type ShadowSpec } from './effects.js';
export { adjustSaturation, adjustTemperature, adjustBrightnessContrast, adjustSharpen, blackbody } from './adjust.js';
export { applyColorMods, srgbToLin, linToSrgb, type Rgb } from './color.js';
