// @universal-office/drawingml — DrawingML sem DOM, um lugar só para os três apps:
// - formas predefinidas: as 187 de presetShapeDefinitions.xml (preset-defs) e o
//   intérprete das fórmulas (preset-engine), com o descritor de caminho (geometry);
// - luz do 3D (light3d): tabelas de iluminação dos lightRig/material do Office.
export { presetPath, type PresetPath, type Pt, type PathSeg } from './geometry.js';
export { evalPreset, hasPresetDef, presetGuides, presetTextRect, customGuides, arcToSeg, type PresetGeometry } from './preset-engine.js';
export { PRESET_DEFS } from './preset-defs.js';
export { lightTable, lightAt, lightFace, bevelPhi } from './light3d.js';
