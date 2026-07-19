// Histogram diff sobre TOKENS OPACOS.
//
// PORTADO de OpenCompare (packages/diff-core/src/histogram.ts) — validado lá
// contra o oráculo Beyond Compare 5. Correções de algoritmo devem ser feitas
// no OpenCompare primeiro e sincronizadas aqui (e vice-versa).
//
// Referência: xdiff/xhistogram.c do git (default desde o git 2.0).
//
// Estratégia: para um range [a0..a1) x [b0..b1), monta um histograma de
// ocorrências dos tokens do lado A, varre o lado B procurando o token mais
// raro em A que também ocorre em B, usa esse par como ÂNCORA DE PARTIÇÃO —
// estende para o run contíguo máximo e recursa nas partições pré/pós-âncora.
// Sem âncora utilizável, cai para Myers, que garante correção sempre.
//
// As projeções de chave (`getKeyA`/`getKeyB`) vêm do orquestrador (diff.ts),
// então este módulo é agnóstico de política e espelha `myersDiff` no contrato
// de EqFn.

import { myersDiff, type DiffOp, type EqFn } from './myers.js';

/**
 * Roda o histogram diff e retorna o edit script canônico (ops equal/delete/
 * insert em ordem de varredura). Entradas vazias produzem script vazio.
 *
 * `getKeyA(i)` / `getKeyB(j)` DEVEM retornar a mesma chave string para dois
 * tokens que comparam iguais sob `eq` — o bucketing do histograma depende da
 * igualdade estrutural dessas chaves, e `eq` é usado na extensão do run
 * contíguo ao redor de cada âncora candidata.
 */
export function histogramDiff(
  n: number,
  m: number,
  eq: EqFn,
  getKeyA: (i: number) => string,
  getKeyB: (j: number) => string,
): DiffOp[] {
  // Fast paths espelham myersDiff para entradas triviais pularem o custo.
  if (n === 0 && m === 0) return [];
  if (n === 0) {
    const out: DiffOp[] = [];
    for (let j = 0; j < m; j++) {
      out.push({ op: 'insert', aIndex: -1, bIndex: j });
    }
    return out;
  }
  if (m === 0) {
    const out: DiffOp[] = [];
    for (let i = 0; i < n; i++) {
      out.push({ op: 'delete', aIndex: i, bIndex: -1 });
    }
    return out;
  }

  const ops: DiffOp[] = [];
  recurse(0, n, 0, m, eq, getKeyA, getKeyB, ops);
  return ops;
}

/**
 * Driver recursivo. Opera em ranges semi-abertos [a0..a1) em A e [b0..b1) em
 * B, anexando ops em ordem de documento em `out`.
 */
function recurse(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
  eq: EqFn,
  getKeyA: (i: number) => string,
  getKeyB: (j: number) => string,
  out: DiffOp[],
): void {
  // --- Fast paths ------------------------------------------------------
  if (a0 >= a1 && b0 >= b1) return;
  if (a0 >= a1) {
    for (let j = b0; j < b1; j++) {
      out.push({ op: 'insert', aIndex: -1, bIndex: j });
    }
    return;
  }
  if (b0 >= b1) {
    for (let i = a0; i < a1; i++) {
      out.push({ op: 'delete', aIndex: i, bIndex: -1 });
    }
    return;
  }

  // NOTA sobre trim de prefixo/sufixo: NÃO fazemos trim guloso aqui.
  // xhistogram.c também não — com tokens duplicados, o trim guloso pareia as
  // cópias erradas e produz alinhamentos piores do que a âncora de token
  // único produziria. A seleção de âncora abaixo absorve prefixo/sufixo
  // inalterados naturalmente via a extensão de run contíguo mais longo.

  // --- Histograma de ocorrências de A[a0..a1) --------------------------
  const histA = new Map<string, number[]>();
  for (let i = a0; i < a1; i++) {
    const k = getKeyA(i);
    const bucket = histA.get(k);
    if (bucket) {
      bucket.push(i);
    } else {
      histA.set(k, [i]);
    }
  }

  // --- Varre B em ordem procurando a melhor âncora de partição ----------
  let bestCount = Number.POSITIVE_INFINITY;
  let bestSpan = -1;
  let bestShift = Number.POSITIVE_INFINITY;
  let bestAL = -1; // borda esquerda do run casado em A (inclusiva)
  let bestAR = -1; // borda direita em A (exclusiva)
  let bestBL = -1; // borda esquerda em B (inclusiva)

  for (let j = b0; j < b1; j++) {
    const k = getKeyB(j);
    const bucket = histA.get(k);
    if (!bucket) continue;
    const count = bucket.length;
    for (const aIdx of bucket) {
      // DESVIO CONSCIENTE do port: no OpenCompare eq ≡ igualdade de chave,
      // então o par âncora dispensava verificação. Aqui eq (tokensEqual) é
      // MAIS FORTE que a chave (memcmp de imagens vs hash fnv1a) — sem este
      // guard, uma colisão de hash entraria como 'equal' sem conferir os
      // bytes, quebrando a garantia byte a byte no caminho padrão.
      if (!eq(aIdx, j)) continue;
      // Estende o run para trás.
      let aL = aIdx;
      let bL = j;
      while (aL > a0 && bL > b0 && eq(aL - 1, bL - 1)) {
        aL--;
        bL--;
      }
      // Estende o run para frente.
      let aR = aIdx + 1;
      let bR = j + 1;
      while (aR < a1 && bR < b1 && eq(aR, bR)) {
        aR++;
        bR++;
      }
      const span = aR - aL;
      const shift = aL > bL ? aL - bL : bL - aL; // |aL - bL|
      // Ordem de seleção (bate com o oráculo BC no corpus do OpenCompare):
      //   (1) token mais RARO vence (menor contagem em A);
      //   (2) run contíguo mais LONGO entre candidatos igualmente raros;
      //   (3) MENOR deslocamento posicional (|aL - bL|);
      //   (4) menor bL;
      //   (5) menor aL (desempate estável final).
      let better = false;
      if (count < bestCount) {
        better = true;
      } else if (count === bestCount) {
        if (span > bestSpan) {
          better = true;
        } else if (span === bestSpan) {
          if (shift < bestShift) {
            better = true;
          } else if (shift === bestShift) {
            if (bL < bestBL) {
              better = true;
            } else if (bL === bestBL && aL < bestAL) {
              better = true;
            }
          }
        }
      }
      if (better) {
        bestCount = count;
        bestSpan = span;
        bestShift = shift;
        bestAL = aL;
        bestAR = aR;
        bestBL = bL;
      }
    }
  }

  // --- Fallback para Myers quando nenhuma âncora foi encontrada ---------
  if (bestAL === -1) {
    const subOps = myersDiff(a1 - a0, b1 - b0, (i, j) => eq(a0 + i, b0 + j));
    for (const op of subOps) {
      out.push({
        op: op.op,
        aIndex: op.aIndex >= 0 ? op.aIndex + a0 : -1,
        bIndex: op.bIndex >= 0 ? op.bIndex + b0 : -1,
      });
    }
    return;
  }

  // --- Recursa na partição pré-âncora -----------------------------------
  const bRight = bestBL + (bestAR - bestAL);
  recurse(a0, bestAL, b0, bestBL, eq, getKeyA, getKeyB, out);

  // --- Emite o run equal da âncora ---------------------------------------
  for (let off = 0; off < bestAR - bestAL; off++) {
    out.push({ op: 'equal', aIndex: bestAL + off, bIndex: bestBL + off });
  }

  // --- Recursa na partição pós-âncora ------------------------------------
  recurse(bestAR, a1, bRight, b1, eq, getKeyA, getKeyB, out);
}
