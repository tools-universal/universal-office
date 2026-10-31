// Modelos dos EFEITOS DE TEXTO E TIPOGRAFIA (botão da guia Página Inicial): os submenus
// Sombra, Reflexo e Brilho e as variações de degradê da Cor da Fonte, no XML w14 que o Word
// grava (write/tools/home-lab exp-effects.ps1 / exp-effects2.ps1). No w14 o w14:alpha é a
// TRANSPARÊNCIA (Transparência 60% → alpha 60000).
//
// A galeria de modelos (TEXT_EFFECT_GALLERY) é uma APROXIMAÇÃO: o Word não expõe os modelos
// pelo COM (TextFrame2.WordArtFormat não existe no Word; o AddTextEffect cria o WordArt VML
// antigo) — o 1º modelo segue o mais comum no corpus (Preenchimento: Preto; Sombra), os
// outros seguem a composição dos modelos do Office (preenchimento, contorno, sombra, brilho,
// reflexo e degradê nas cores do tema). Pendência registrada para medir pela interface.
import type { FxColor, FxFill, FxShadow, FxReflection, FxGlow, FxOutline, TextEffects } from '@universal-office/docx-core';

type Lbl = { en: string; pt: string; es: string };
const L = (en: string, pt: string, es: string): Lbl => ({ en, pt, es });
const scheme = (s: string, ...mods: [string, number][]): FxColor => ({ scheme: s, ...(mods.length ? { mods } : {}) });
const rgb = (v: string, ...mods: [string, number][]): FxColor => ({ rgb: v, ...(mods.length ? { mods } : {}) });
const solid = (c: FxColor): FxFill => ({ type: 'solid', color: c });

const shadow = (blurRad: number, dist: number, dir: number, algn: string, transp: number, o: Partial<FxShadow> = {}): FxShadow =>
  ({ blurRad, dist, dir, sx: 100000, sy: 100000, kx: 0, ky: 0, algn, color: rgb('000000', ['alpha', transp]), ...o });

/** Sombra › Externa (9) e Perspectiva (5): as direções e alinhamentos dos tipos do Word
 *  (TextShadow.Type 21–29, 39–43), com o desfoque de 4 pt, a distância de 3 pt e 60% de
 *  transparência dos menus. */
export const TEXT_SHADOW_PRESETS: { id: string; group: 'outer' | 'persp'; label: Lbl; shadow: FxShadow }[] = [
  { id: 'outer-br', group: 'outer', label: L('Offset: Bottom Right', 'Deslocamento: Inferior Direito', 'Desplazamiento: abajo a la derecha'), shadow: shadow(50800, 38100, 2700000, 'tl', 60000) },
  { id: 'outer-b', group: 'outer', label: L('Offset: Bottom', 'Deslocamento: Inferior', 'Desplazamiento: abajo'), shadow: shadow(50800, 38100, 5400000, 't', 60000) },
  { id: 'outer-bl', group: 'outer', label: L('Offset: Bottom Left', 'Deslocamento: Inferior Esquerdo', 'Desplazamiento: abajo a la izquierda'), shadow: shadow(50800, 38100, 8100000, 'tr', 60000) },
  { id: 'outer-r', group: 'outer', label: L('Offset: Right', 'Deslocamento: Direita', 'Desplazamiento: derecha'), shadow: shadow(50800, 38100, 0, 'l', 60000) },
  { id: 'outer-c', group: 'outer', label: L('Offset: Center', 'Deslocamento: Centro', 'Desplazamiento: centro'), shadow: shadow(63500, 0, 0, 'ctr', 60000, { sx: 102000, sy: 102000 }) },
  { id: 'outer-l', group: 'outer', label: L('Offset: Left', 'Deslocamento: Esquerda', 'Desplazamiento: izquierda'), shadow: shadow(50800, 38100, 10800000, 'r', 60000) },
  { id: 'outer-tr', group: 'outer', label: L('Offset: Top Right', 'Deslocamento: Superior Direito', 'Desplazamiento: arriba a la derecha'), shadow: shadow(50800, 38100, 18900000, 'bl', 60000) },
  { id: 'outer-t', group: 'outer', label: L('Offset: Top', 'Deslocamento: Superior', 'Desplazamiento: arriba'), shadow: shadow(50800, 38100, 16200000, 'b', 60000) },
  { id: 'outer-tl', group: 'outer', label: L('Offset: Top Left', 'Deslocamento: Superior Esquerdo', 'Desplazamiento: arriba a la izquierda'), shadow: shadow(50800, 38100, 13500000, 'br', 60000) },
  { id: 'persp-ul', group: 'persp', label: L('Perspective: Upper Left', 'Perspectiva: Superior Esquerda', 'Perspectiva: arriba a la izquierda'), shadow: shadow(76200, 310007, 7680000, 'ctr', 80000, { sy: 30000, kx: 1300200 }) },
  { id: 'persp-ur', group: 'persp', label: L('Perspective: Upper Right', 'Perspectiva: Superior Direita', 'Perspectiva: arriba a la derecha'), shadow: shadow(76200, 200025, 15000000, 'bl', 80000, { sy: 30000, kx: -1800000 }) },
  { id: 'persp-below', group: 'persp', label: L('Perspective: Below', 'Perspectiva: Abaixo', 'Perspectiva: debajo'), shadow: shadow(76200, 38100, 5400000, 'b', 80000, { sy: -20000 }) },
  { id: 'persp-ll', group: 'persp', label: L('Perspective: Lower Left', 'Perspectiva: Inferior Esquerda', 'Perspectiva: abajo a la izquierda'), shadow: shadow(76200, 0, 1500000, 'bl', 80000, { sy: -30000, kx: 800400 }) },
  { id: 'persp-lr', group: 'persp', label: L('Perspective: Lower Right', 'Perspectiva: Inferior Direita', 'Perspectiva: abajo a la derecha'), shadow: shadow(76200, 0, 2000400, 'bl', 80000, { sy: -30000, kx: -800400 }) },
];

const refl = (stA: number, endA: number, endPos: number, dist: number): FxReflection =>
  ({ blurRad: 6350, stA, stPos: 0, endA, endPos, dist, dir: 5400000, fadeDir: 5400000, sx: 100000, sy: -100000, kx: 0, ky: 0, algn: 'bl' });

/** Reflexo › Variações (Reflection.Type 1–9, medido; o 8º com stA 600000 como o Word grava). */
export const TEXT_REFLECTION_PRESETS: { id: string; label: Lbl; reflection: FxReflection }[] = [
  { id: 'tight-touch', label: L('Tight Reflection: Touching', 'Reflexo Justo: Encostado', 'Reflejo ajustado: contacto'), reflection: refl(55000, 300, 45500, 0) },
  { id: 'half-touch', label: L('Half Reflection: Touching', 'Meio Reflexo: Encostado', 'Reflejo medio: contacto'), reflection: refl(60000, 900, 58000, 0) },
  { id: 'full-touch', label: L('Full Reflection: Touching', 'Reflexo Total: Encostado', 'Reflejo completo: contacto'), reflection: refl(55000, 50, 85000, 0) },
  { id: 'tight-4', label: L('Tight Reflection: 4 pt offset', 'Reflexo Justo: Deslocamento de 4 pt', 'Reflejo ajustado: desplazamiento de 4 pt'), reflection: refl(50000, 300, 50000, 29997) },
  { id: 'half-4', label: L('Half Reflection: 4 pt offset', 'Meio Reflexo: Deslocamento de 4 pt', 'Reflejo medio: desplazamiento de 4 pt'), reflection: refl(60000, 900, 60000, 29997) },
  { id: 'full-4', label: L('Full Reflection: 4 pt offset', 'Reflexo Total: Deslocamento de 4 pt', 'Reflejo completo: desplazamiento de 4 pt'), reflection: refl(55000, 50, 85000, 29997) },
  { id: 'tight-8', label: L('Tight Reflection: 8 pt offset', 'Reflexo Justo: Deslocamento de 8 pt', 'Reflejo ajustado: desplazamiento de 8 pt'), reflection: refl(50000, 300, 50000, 60007) },
  { id: 'half-8', label: L('Half Reflection: 8 pt offset', 'Meio Reflexo: Deslocamento de 8 pt', 'Reflejo medio: desplazamiento de 8 pt'), reflection: refl(600000, 900, 60000, 60007) },
  { id: 'full-8', label: L('Full Reflection: 8 pt offset', 'Reflexo Total: Deslocamento de 8 pt', 'Reflejo completo: desplazamiento de 8 pt'), reflection: refl(55000, 50, 85000, 60007) },
];

/** Brilho › Variações: 4 tamanhos (5, 8, 11 e 18 pt) × as 6 cores de ênfase, 60% transparente. */
export const TEXT_GLOW_SIZES = [63500, 101600, 139700, 228600];
export const textGlow = (rad: number, color: FxColor): FxGlow => ({ rad, color: { ...color, mods: [...(color.mods ?? []).filter(([k]) => k !== 'alpha'), ['alpha', 60000]] } });

/** Contorno › Espessura (pt) e Traços (w14:prstDash), na ordem dos menus. */
export const OUTLINE_WEIGHTS = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6];
export const OUTLINE_DASHES: [string, Lbl][] = [
  ['solid', L('Solid', 'Sólido', 'Sólido')], ['sysDot', L('Round Dot', 'Ponto Arredondado', 'Punto redondo')], ['sysDash', L('Square Dot', 'Ponto Quadrado', 'Punto cuadrado')],
  ['dash', L('Dash', 'Traço', 'Guion')], ['dashDot', L('Dash Dot', 'Traço Ponto', 'Guion punto')], ['lgDash', L('Long Dash', 'Traço Longo', 'Guion largo')],
  ['lgDashDot', L('Long Dash Dot', 'Traço Longo Ponto', 'Guion largo punto')], ['lgDashDotDot', L('Long Dash Dot Dot', 'Traço Longo Ponto Ponto', 'Guion largo punto punto')],
];
export const outline = (c: FxColor, wPt = 0.75, dash = 'solid'): FxOutline => ({ w: Math.round(wPt * 12700), cap: 'flat', cmpd: 'sng', algn: 'ctr', fill: solid(c), dash, join: 'round' });

/** Degradê da Cor da Fonte (Variações Claras e Escuras): da cor do texto para uma mais
 *  clara/escura, nas direções do Word (linear para baixo, direita, cima, esquerda). */
export const GRADIENT_DIRECTIONS: [number, Lbl][] = [
  [90, L('Linear Down', 'Linear para Baixo', 'Lineal hacia abajo')], [0, L('Linear Right', 'Linear à Direita', 'Lineal hacia la derecha')],
  [270, L('Linear Up', 'Linear para Cima', 'Lineal hacia arriba')], [180, L('Linear Left', 'Linear à Esquerda', 'Lineal hacia la izquierda')],
];
export function textGradient(color: FxColor, angleDeg: number, light: boolean): FxFill {
  const other: FxColor = { ...color, mods: [...(color.mods ?? []), ...(light ? [['lumMod', 20000], ['lumOff', 80000]] as [string, number][] : [['lumMod', 50000]] as [string, number][])] };
  return { type: 'grad', stops: [{ pos: 0, color }, { pos: 100000, color: other }], lin: { ang: Math.round(angleDeg * 60000), scaled: false } };
}

/** Galeria Efeitos de Texto (aproximação — ver o cabeçalho). */
export const TEXT_EFFECT_GALLERY: { label: Lbl; fx: TextEffects }[] = [
  { label: L('Fill: Black, Text color 1; Shadow', 'Preenchimento: Preto, Cor do texto 1; Sombra', 'Relleno: negro, color de texto 1; sombra'),
    fx: { fill: solid(scheme('tx1')), shadow: { blurRad: 38100, dist: 19050, dir: 2700000, sx: 100000, sy: 100000, kx: 0, ky: 0, algn: 'tl', color: scheme('dk1', ['alpha', 60000]) } } },
  { label: L('Fill: Blue, Accent color 1; Shadow', 'Preenchimento: Azul, Cor de destaque 1; Sombra', 'Relleno: azul, color de énfasis 1; sombra'),
    fx: { fill: solid(scheme('accent1')), shadow: { blurRad: 38100, dist: 19050, dir: 2700000, sx: 100000, sy: 100000, kx: 0, ky: 0, algn: 'tl', color: scheme('dk1', ['alpha', 60000]) } } },
  { label: L('Fill: Orange, Accent color 2; Outline: Orange, Accent color 2', 'Preenchimento: Laranja, Cor de destaque 2; Contorno: Laranja, Cor de destaque 2', 'Relleno: naranja, color de énfasis 2; contorno: naranja, color de énfasis 2'),
    fx: { fill: solid(scheme('bg1')), outline: outline(scheme('accent2'), 0.75) } },
  { label: L('Fill: White; Outline: Blue, Accent color 1; Glow: Blue, Accent color 1', 'Preenchimento: Branco; Contorno: Azul, Cor de destaque 1; Brilho: Azul, Cor de destaque 1', 'Relleno: blanco; contorno: azul, color de énfasis 1; iluminado: azul, color de énfasis 1'),
    fx: { fill: solid(scheme('bg1')), outline: outline(scheme('accent1'), 0.5), glow: textGlow(63500, scheme('accent1')) } },
  { label: L('Fill: Gold, Accent color 4; Soft Bevel', 'Preenchimento: Dourado, Cor de destaque 4; Bisel Suave', 'Relleno: dorado, color de énfasis 4; bisel suave'),
    fx: { fill: solid(scheme('accent4')), props3d: '<w14:props3d w14:extrusionH="0" w14:contourW="0" w14:prstMaterial="none"><w14:bevelT w14:w="38100" w14:h="38100" w14:prst="softRound"/></w14:props3d>' } },
  { label: L('Gradient Fill: Gray', 'Preenchimento Gradiente: Cinza', 'Relleno degradado: gris'),
    fx: { fill: { type: 'grad', stops: [{ pos: 0, color: scheme('tx1', ['lumMod', 65000], ['lumOff', 35000]) }, { pos: 100000, color: scheme('tx1') }], lin: { ang: 5400000, scaled: false } } } },
  { label: L('Gradient Fill: Blue, Accent color 1; Reflection', 'Preenchimento Gradiente: Azul, Cor de destaque 1; Reflexo', 'Relleno degradado: azul, color de énfasis 1; reflejo'),
    fx: { fill: textGradient(scheme('accent1'), 90, false), reflection: refl(55000, 300, 45500, 0) } },
  { label: L('Fill: White; Outline: Orange, Accent color 2; Glow: Orange, Accent color 2', 'Preenchimento: Branco; Contorno: Laranja, Cor de destaque 2; Brilho: Laranja, Cor de destaque 2', 'Relleno: blanco; contorno: naranja, color de énfasis 2; iluminado: naranja, color de énfasis 2'),
    fx: { fill: solid(scheme('bg1')), outline: outline(scheme('accent2'), 0.5), glow: textGlow(63500, scheme('accent2')) } },
  { label: L('Fill: Black, Text color 1; Outline: White; Glow: Black', 'Preenchimento: Preto, Cor do texto 1; Contorno: Branco; Brilho: Preto', 'Relleno: negro, color de texto 1; contorno: blanco; iluminado: negro'),
    fx: { fill: solid(scheme('tx1')), outline: outline(scheme('bg1'), 0.5), glow: textGlow(101600, scheme('tx1')) } },
  { label: L('Fill: Blue, Accent color 1; Shadow; Reflection', 'Preenchimento: Azul, Cor de destaque 1; Sombra; Reflexo', 'Relleno: azul, color de énfasis 1; sombra; reflejo'),
    fx: { fill: solid(scheme('accent1')), shadow: TEXT_SHADOW_PRESETS[0]!.shadow, reflection: refl(55000, 300, 45500, 0) } },
  { label: L('Fill: White; Outline: Gray', 'Preenchimento: Branco; Contorno: Cinza', 'Relleno: blanco; contorno: gris'),
    fx: { fill: solid(scheme('bg1')), outline: outline(scheme('tx1', ['lumMod', 50000], ['lumOff', 50000]), 1) } },
  { label: L('Fill: Green, Accent color 6; Glow', 'Preenchimento: Verde, Cor de destaque 6; Brilho', 'Relleno: verde, color de énfasis 6; iluminado'),
    fx: { fill: solid(scheme('accent6')), glow: textGlow(101600, scheme('accent6')) } },
  { label: L('Fill: Gray-50%, Accent color 3; Sharp Bevel', 'Preenchimento: Cinza-50%, Cor de destaque 3; Bisel Agudo', 'Relleno: gris-50%, color de énfasis 3; bisel marcado'),
    fx: { fill: solid(scheme('accent3')), props3d: '<w14:props3d w14:extrusionH="0" w14:contourW="0" w14:prstMaterial="none"><w14:bevelT w14:w="38100" w14:h="38100" w14:prst="angle"/></w14:props3d>' } },
  { label: L('Gradient Fill: Gold, Accent color 4; Outline: Gold', 'Preenchimento Gradiente: Dourado, Cor de destaque 4; Contorno: Dourado', 'Relleno degradado: dorado, color de énfasis 4; contorno: dorado'),
    fx: { fill: textGradient(scheme('accent4'), 90, true), outline: outline(scheme('accent4'), 0.5) } },
  { label: L('Fill: Light Blue, Background color 2; Inner Shadow', 'Preenchimento: Azul Claro, Cor do plano de fundo 2; Sombra', 'Relleno: azul claro, color de fondo 2; sombra interior'),
    fx: { fill: solid(scheme('bg2', ['lumMod', 75000])), shadow: TEXT_SHADOW_PRESETS[1]!.shadow } },
];

/** Estilos de Número (Formas e Espaçamento combinados, como no menu do Word). */
export const NUMBER_STYLES_OT: { id: string; label: Lbl; numForm: 'default' | 'lining' | 'oldStyle'; numSpacing: 'default' | 'proportional' | 'tabular' }[] = [
  { id: 'default', label: L('Default', 'Padrão', 'Predeterminado'), numForm: 'default', numSpacing: 'default' },
  { id: 'propLining', label: L('Proportional Lining', 'Alinhado Proporcional', 'Alineado proporcional'), numForm: 'lining', numSpacing: 'proportional' },
  { id: 'propOld', label: L('Proportional Old-style', 'Estilo Antigo Proporcional', 'Estilo antiguo proporcional'), numForm: 'oldStyle', numSpacing: 'proportional' },
  { id: 'tabLining', label: L('Tabular Lining', 'Alinhado Tabular', 'Alineado tabular'), numForm: 'lining', numSpacing: 'tabular' },
  { id: 'tabOld', label: L('Tabular Old-style', 'Estilo Antigo Tabular', 'Estilo antiguo tabular'), numForm: 'oldStyle', numSpacing: 'tabular' },
];

/** Ligaduras (o menu do Word). */
export const LIGATURE_OPTIONS: { val: string; label: Lbl }[] = [
  { val: 'none', label: L('None', 'Nenhuma', 'Ninguno') },
  { val: 'standard', label: L('Standard Only', 'Somente Padrão', 'Solo estándar') },
  { val: 'standardContextual', label: L('Standard and Contextual', 'Padrão e Contextual', 'Estándar y contextual') },
  { val: 'historicalDiscretional', label: L('Historical and Discretionary', 'Histórica e Discricionária', 'Histórica y discrecional') },
  { val: 'all', label: L('All', 'Todas', 'Todos') },
];
