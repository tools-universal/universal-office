// Escada de prioridade das barras (motor do demo do Write, agora puro e
// testável): ao faltar largura, os grupos de menor prioridade recolhem —
// primeiro em gatilhos individuais (ícone + ▾) e, se ainda não couberem, num
// único "⋮". prio 0 = sempre no "⋮"; prio ≥ 9 nunca recolhe. Grupo ELÁSTICO
// (shrink > 0, ex. a galeria de estilos) cede largura antes de qualquer recolher.

export interface CollapseInput {
  prio: number;
  width: number;
  /** px que o grupo pode ceder sem recolher (galeria tira colunas) */
  shrink?: number;
}

export interface CollapsePlan {
  /** índices dos grupos que ficam na barra (ordem original) */
  inline: number[];
  /** índices que viram gatilho próprio (ordem original) */
  triggers: number[];
  /** índices no "⋮" (menor prio primeiro) */
  more: number[];
  /** px que cada grupo inline elástico cede (só quando há elástico) */
  give?: number[];
}

export function planCollapse(
  groups: readonly CollapseInput[],
  avail: number,
  opts: { trigW: number; moreW: number },
): CollapsePlan {
  const idx = groups.map((_, i) => i);
  // a decisão de recolher usa a largura MÍNIMA dos elásticos
  const w = (arr: number[]): number => arr.reduce((s, i) => s + groups[i]!.width - (groups[i]!.shrink ?? 0), 0);
  const byPrio = (a: number, b: number): number => groups[a]!.prio - groups[b]!.prio || b - a;

  const always = idx.filter((i) => groups[i]!.prio <= 0);
  let inline = idx.filter((i) => groups[i]!.prio > 0);
  const collapsed: number[] = [];
  const moreW = (): number => (always.length || collapsed.length ? opts.moreW : 0);
  while (w(inline) + collapsed.length * opts.trigW + moreW() > avail) {
    const cand = inline.filter((i) => groups[i]!.prio < 9).sort(byPrio)[0];
    if (cand === undefined) break;
    inline = inline.filter((i) => i !== cand);
    collapsed.push(cand);
  }
  // gatilhos que não cabem migram para o "⋮" (junto com os fixos)
  let triggers = [...collapsed];
  const more = [...always];
  while (triggers.length && w(inline) + triggers.length * opts.trigW + opts.moreW > avail) {
    const c = [...triggers].sort(byPrio)[0]!;
    triggers = triggers.filter((i) => i !== c);
    more.push(c);
  }
  const plan: CollapsePlan = {
    inline,
    triggers: triggers.sort((a, b) => a - b),
    more: more.sort(byPrio),
  };
  if (groups.some((g) => (g.shrink ?? 0) > 0)) {
    // quanto falta com os elásticos na largura cheia: os de menor prioridade cedem primeiro
    const full = inline.reduce((s, i) => s + groups[i]!.width, 0);
    let deficit = full + plan.triggers.length * opts.trigW + (plan.more.length ? opts.moreW : 0) - avail;
    plan.give = groups.map(() => 0);
    for (const i of [...inline].sort(byPrio)) {
      if (deficit <= 0) break;
      const g = Math.min(groups[i]!.shrink ?? 0, deficit);
      plan.give[i] = g;
      deficit -= g;
    }
  }
  return plan;
}
