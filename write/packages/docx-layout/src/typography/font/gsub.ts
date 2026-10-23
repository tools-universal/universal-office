/**
 * Parser mínimo de GSUB para ligaduras (lookup tipo 4 / LigatureSubst, inclusive via
 * extensão tipo 7) das features do script latino (latn; sem ele, DFLT), idioma padrão.
 * Com w14:ligatures o Word mede o glifo da ligadura, não a soma das letras (oráculo
 * ligwidth do docx-layout: Calibri "tt" −73/2048 em, "ti" −15, "fi" −11).
 */

/** Ligaduras de um lookup: 1º glifo → [componentes seguintes, glifo da ligadura], na ordem da fonte. */
export type LigLookup = Map<number, { rest: number[]; lig: number }[]>;

export interface GsubLigatures {
  /** índices de lookup por feature (liga, clig, dlig, hlig…), do script latino */
  features: Map<string, number[]>;
  /** lookups de ligadura já lidos, por índice */
  lookups: Map<number, LigLookup>;
  /** lookups de substituição simples (onum, tnum, ss01…): glifo → glifo */
  singles?: Map<number, Map<number, number>>;
}

export function parseGsubLigatures(view: DataView, off: number): GsubLigatures {
  const u16 = (o: number) => view.getUint16(o);
  const u32 = (o: number) => view.getUint32(o);
  const tagAt = (o: number) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
  const scriptList = off + u16(off + 4);
  const featureList = off + u16(off + 6);
  const lookupList = off + u16(off + 8);
  const features = new Map<string, number[]>();
  const lookups = new Map<number, LigLookup>();
  const singles = new Map<number, Map<number, number>>();
  let latn = -1, dflt = -1;
  for (let i = 0, n = u16(scriptList); i < n; i++) {
    const rec = scriptList + 2 + i * 6;
    const tag = tagAt(rec);
    if (tag === 'latn') latn = scriptList + u16(rec + 4);
    else if (tag === 'DFLT') dflt = scriptList + u16(rec + 4);
  }
  const script = latn >= 0 ? latn : dflt;
  if (script < 0 || !u16(script)) return { features, lookups };
  const ls = script + u16(script); // DefaultLangSys
  const fidx: number[] = [];
  const req = u16(ls + 2);
  if (req !== 0xffff) fidx.push(req);
  for (let k = 0, n = u16(ls + 4); k < n; k++) fidx.push(u16(ls + 6 + k * 2));
  for (const fi of fidx) {
    const tag = tagAt(featureList + 2 + fi * 6);
    const fo = featureList + u16(featureList + 2 + fi * 6 + 4);
    const list = features.get(tag) ?? [];
    for (let k = 0, n = u16(fo + 2); k < n; k++) list.push(u16(fo + 4 + k * 2));
    features.set(tag, list);
  }
  const coverage = (o: number): number[] => {
    const out: number[] = [];
    if (u16(o) === 1) for (let i = 0, n = u16(o + 2); i < n; i++) out.push(u16(o + 4 + i * 2));
    else for (let i = 0, n = u16(o + 2); i < n; i++) {
      const s = u16(o + 4 + i * 6), e = u16(o + 6 + i * 6);
      for (let g = s; g <= e; g++) out.push(g);
    }
    return out;
  };
  const wanted = new Set([...features.values()].flat());
  for (const li of wanted) {
    if (li >= u16(lookupList)) continue;
    const lo = lookupList + u16(lookupList + 2 + li * 2);
    const type = u16(lo);
    const map: LigLookup = new Map();
    const one = new Map<number, number>();
    for (let s = 0, ns = u16(lo + 4); s < ns; s++) {
      let so = lo + u16(lo + 6 + s * 2);
      let t = type;
      if (t === 7) { t = u16(so + 2); so += u32(so + 4); }
      if (t === 1) {
        // substituição simples: formato 1 = delta; formato 2 = lista de substitutos
        const fmt = u16(so);
        const cov = coverage(so + u16(so + 2));
        if (fmt === 1) { const d = view.getInt16(so + 4); for (const g of cov) one.set(g, (g + d) & 0xffff); }
        else if (fmt === 2) for (let k = 0, n = u16(so + 4); k < n && k < cov.length; k++) one.set(cov[k]!, u16(so + 6 + k * 2));
        continue;
      }
      if (t !== 4 || u16(so) !== 1) continue;
      const cov = coverage(so + u16(so + 2));
      for (let k = 0, n = u16(so + 4); k < n && k < cov.length; k++) {
        const set = so + u16(so + 6 + k * 2);
        const list = map.get(cov[k]!) ?? [];
        for (let j = 0, m = u16(set); j < m; j++) {
          const lg = set + u16(set + 2 + j * 2);
          const cc = u16(lg + 2);
          const rest: number[] = [];
          for (let q = 1; q < cc; q++) rest.push(u16(lg + 4 + (q - 1) * 2));
          list.push({ rest, lig: u16(lg) });
        }
        if (list.length) map.set(cov[k]!, list);
      }
    }
    if (map.size) lookups.set(li, map);
    if (one.size) singles.set(li, one);
  }
  return { features, lookups, singles };
}

/**
 * Aplica as ligaduras das features pedidas a uma sequência de glifos: cada lookup em
 * ordem (índice crescente), da esquerda para a direita, a 1ª ligadura da fonte que casar.
 * Devolve os grupos (glifo final + quantos glifos de entrada ele cobre).
 */
export function applyLigatures(g: GsubLigatures, gids: number[], feats: readonly string[]): { gid: number; len: number }[] {
  let out = gids.map((gid) => ({ gid, len: 1 }));
  const idx = [...new Set(feats.flatMap((f) => g.features.get(f) ?? []))].sort((a, b) => a - b);
  for (const li of idx) {
    const sg = g.singles?.get(li);
    if (sg) { out = out.map((o) => (o.len === 1 && sg.has(o.gid) ? { gid: sg.get(o.gid)!, len: 1 } : o)); continue; }
    const lk = g.lookups.get(li);
    if (!lk) continue;
    const next: { gid: number; len: number }[] = [];
    for (let i = 0; i < out.length; i++) {
      const cands = lk.get(out[i]!.gid);
      let hit: { rest: number[]; lig: number } | undefined;
      if (cands) hit = cands.find((c) => c.rest.every((r, k) => out[i + 1 + k]?.gid === r));
      if (!hit) { next.push(out[i]!); continue; }
      let len = out[i]!.len;
      for (let k = 0; k < hit.rest.length; k++) len += out[i + 1 + k]!.len;
      next.push({ gid: hit.lig, len });
      i += hit.rest.length;
    }
    out = next;
  }
  return out;
}
