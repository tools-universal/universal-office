// Myers O(ND) com backtracking sobre TOKENS OPACOS.
//
// PORTADO de OpenCompare (packages/diff-core/src/myers.ts) — o motor validado
// range-a-range contra o oráculo Beyond Compare 5 daquele repo. Correções de
// algoritmo devem ser feitas lá primeiro e sincronizadas aqui (e vice-versa).
//
// Referência: "An O(ND) Difference Algorithm and Its Variations", Eugene W.
// Myers, 1986. Snapshot do vetor V a cada passo D para o backtrack reconstruir
// o edit script exato. Memória O(D^2) no pior caso — ok para as contagens de
// blocos que um documento produz.
//
// O algoritmo opera sobre chaves opacas fornecidas pelo caller (`eq(i, j)`),
// então este arquivo não sabe nada de parágrafos/imagens — o orquestrador
// (diff.ts) pré-computa as chaves e fornece o comparador.

export interface DiffOp {
  // op === 'equal'  -> consome a[i] e b[j].
  // op === 'delete' -> consome a[i] apenas.
  // op === 'insert' -> consome b[j] apenas.
  op: 'equal' | 'delete' | 'insert';
  aIndex: number; // 0-based; válido para 'equal' e 'delete', -1 para 'insert'
  bIndex: number; // 0-based; válido para 'equal' e 'insert', -1 para 'delete'
}

export type EqFn = (i: number, j: number) => boolean;

/**
 * Roda Myers O(ND) e retorna o edit script canônico (ops equal/delete/insert
 * em ordem de varredura). Entradas vazias produzem script vazio.
 */
export function myersDiff(n: number, m: number, eq: EqFn): DiffOp[] {
  // Fast paths.
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

  const max = n + m;
  // V é indexado por k em [-max, max]; armazenado com offset `max`.
  const size = 2 * max + 1;
  // Snapshots de V a cada passo D. Int32Array por velocidade/memória.
  const trace: Int32Array[] = [];

  // Vetor V de trabalho. V[k] = x mais distante alcançado na diagonal k.
  const V = new Int32Array(size);

  outer: for (let d = 0; d <= max; d++) {
    // Snapshot do V no início do passo D para o backtracking recuperar.
    trace.push(new Int32Array(V));

    for (let k = -d; k <= d; k += 2) {
      // Decide entre estender para baixo (insert) ou direita (delete).
      const kIdx = k + max;
      let x: number;
      if (k === -d) {
        // Precisa estender para baixo.
        x = V[kIdx + 1] ?? 0;
      } else if (k === d) {
        // Precisa estender para a direita.
        x = (V[kIdx - 1] ?? 0) + 1;
      } else {
        const down = V[kIdx + 1] ?? 0;
        const right = (V[kIdx - 1] ?? 0) + 1;
        x = down > right ? down : right;
      }
      let y = x - k;
      // Segue a snake.
      while (x < n && y < m && eq(x, y)) {
        x++;
        y++;
      }
      V[kIdx] = x;
      if (x >= n && y >= m) {
        break outer;
      }
    }
  }

  // Backtrack para montar o edit script.
  const ops: DiffOp[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const Vd = trace[d];
    if (!Vd) break;
    const k = x - y;
    const kIdx = k + max;
    let prevK: number;
    if (k === -d) {
      prevK = k + 1;
    } else if (k === d) {
      prevK = k - 1;
    } else {
      const down = Vd[kIdx + 1] ?? 0;
      const right = Vd[kIdx - 1] ?? 0;
      prevK = down > right ? k + 1 : k - 1;
    }
    const prevX = Vd[prevK + max] ?? 0;
    const prevY = prevX - prevK;
    // Emite a snake (ops equal) de (prevX,prevY) até logo antes de (x,y).
    while (x > prevX && y > prevY) {
      ops.push({ op: 'equal', aIndex: x - 1, bIndex: y - 1 });
      x--;
      y--;
    }
    if (d > 0) {
      // Um passo não-equal: insert ou delete.
      if (x === prevX) {
        // Desceu: insert.
        ops.push({ op: 'insert', aIndex: -1, bIndex: y - 1 });
      } else {
        // Foi para a direita: delete.
        ops.push({ op: 'delete', aIndex: x - 1, bIndex: -1 });
      }
      x = prevX;
      y = prevY;
    }
  }

  ops.reverse();
  return ops;
}
