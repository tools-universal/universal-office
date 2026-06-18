/**
 * Conversão de comprimentos ODF para twips.
 *
 * ODF usa unidades CSS-like: "2cm", "0.5in", "12pt", "1.27cm", "10mm", "120px".
 * O modelo do WordNext mede tudo em twips (1/20 pt). Equivalências:
 *   1 in  = 1440 twips
 *   1 cm  = 567  twips  (1440 / 2.54)
 *   1 mm  = 56.7 twips
 *   1 pt  = 20   twips
 *   1 pc  (pica) = 12 pt = 240 twips
 *   1 px  ≈ 1/96 in = 15 twips (assumindo 96 dpi)
 */

const TWIPS_PER_UNIT: Record<string, number> = {
  in: 1440,
  cm: 567,
  mm: 56.7,
  pt: 20,
  pc: 240,
  px: 15,
};

/**
 * Converte um comprimento ODF (ex.: "1.27cm") em twips arredondados.
 * Retorna `undefined` para entradas vazias/inválidas para o chamador decidir
 * o fallback (não confundir 0 legítimo com "ausente").
 */
export function lengthToTwips(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const m = /^\s*(-?[0-9]*\.?[0-9]+)\s*(in|cm|mm|pt|pc|px)\s*$/.exec(value);
  if (!m) return undefined;
  const num = parseFloat(m[1]!);
  const unit = m[2]!;
  const factor = TWIPS_PER_UNIT[unit];
  if (factor === undefined || Number.isNaN(num)) return undefined;
  return Math.round(num * factor);
}

/** lengthToTwips com fallback explícito (útil onde 0 não é aceitável). */
export function lengthToTwipsOr(value: string | undefined, fallback: number): number {
  const t = lengthToTwips(value);
  return t === undefined ? fallback : t;
}

/** Converte "12pt"/"0.5cm" em half-points (unidade de fonte do modelo, w:sz). */
export function lengthToHalfPt(value: string | undefined): number | undefined {
  const twips = lengthToTwips(value);
  if (twips === undefined) return undefined;
  // 1 pt = 20 twips; half-point = twips / 10.
  return Math.round(twips / 10);
}
