export const TWIPS_PER_PT = 20;
export const ptToTwips = (pt: number): number => pt * TWIPS_PER_PT;
export const twipsToPt = (tw: number): number => tw / TWIPS_PER_PT;
