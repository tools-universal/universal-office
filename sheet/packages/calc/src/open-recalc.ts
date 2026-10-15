/**
 * Recálculo ao ABRIR a pasta, como o Excel 365 faz (medido no Excel 16.0.20430,
 * CalculationVersion 191029, com pastas sintéticas e editadas a partir de
 * arquivos gravados pelo próprio Excel — `_lab/calc/io/gen-open*.mjs`; uma
 * instância do Excel por pasta, porque forceFullCalc/modo manual de uma pasta
 * contaminam as abertas depois na mesma instância):
 *
 * - modo MANUAL (`calcPr calcMode="manual"`): nada é recalculado — nem com
 *   fullCalcOnLoad, nem com calcId antigo; fórmula sem `<v>` fica vazia;
 * - recálculo COMPLETO (todas as fórmulas) quando:
 *   · não há `<calcPr>` ou ele não tem calcId; calcId < 191028 (191027
 *     recalcula; 191028, 191029 e maiores — 191030, 200000, 999999 — não);
 *   · `fullCalcOnLoad="1"` ou `forceFullCalc="1"`;
 *   · alguma fórmula com função VOLÁTIL no texto (RAND, RANDBETWEEN,
 *     RANDARRAY, NOW, TODAY, OFFSET, INDIRECT, CELL, INFO — em qualquer ramo,
 *     dentro de LET, em matriz) cujo `<f>` NÃO tem `ca="1"`; a filha de
 *     fórmula compartilhada conta por si (âncora com ca e filha sem → completo).
 *     Nome definido volátil (Agora = NOW()) usado na célula não conta;
 * - senão, PARCIAL: calcula só as fórmulas com `ca="1"` e as sem valor em
 *   cache (`<v>` ausente), SEM sujar os dependentes (dependente de volátil ou de
 *   célula sem `<v>` continua mostrando o cache — medido);
 * - nada disso depende da calcChain (ausente, incompleta ou com célula fora),
 *   de docProps/app.xml nem de `<v>` com tipo divergente.
 *
 * O resultado alimenta `applyOpenRecalc` (motor) e, no componente, o gancho
 * `shouldRecalcOnOpen`. Dono: agente CALC-IO.
 */
import { walk, type Node } from './ast.js';
import type { Engine } from './engine.js';
import { a1ToCell } from './a1.js';
import { tryParseFormula } from './parse.js';

/** calcId a partir do qual o Excel 365 confia nos valores em cache (medido: 191027 recalcula, 191028 não). */
export const TRUSTED_CALC_ID = 191028;
/** calcId que o Excel 365 grava (CalculationVersion do 16.0.20430). */
export const EXCEL_CALC_ID = 191029;

/** Funções que, sem `ca="1"` no `<f>`, fazem o Excel recalcular tudo ao abrir (medido uma a uma). */
export const OPEN_VOLATILE = new Set(['RAND', 'RANDBETWEEN', 'RANDARRAY', 'NOW', 'TODAY', 'OFFSET', 'INDIRECT', 'CELL', 'INFO']);
const VOLATILE_HINT = /\b(?:RAND|RANDBETWEEN|RANDARRAY|NOW|TODAY|OFFSET|INDIRECT|CELL|INFO)\s*\(/i;

export type OpenRecalcReason =
  | 'manual' | 'noCalcId' | 'oldCalcId' | 'fullCalcOnLoad' | 'forceFullCalc' | 'volatileWithoutCa' | 'partial' | 'none';

export interface OpenRecalcPlan {
  /** full = recalcula todas as fórmulas; partial = só `cells`; none = mostra o cache. */
  readonly mode: 'full' | 'partial' | 'none';
  readonly reason: OpenRecalcReason;
  /** partial: fórmulas a calcular — [aba, linha, coluna] 0-based (ca="1" ou sem `<v>`). */
  readonly cells: readonly (readonly [number, number, number])[];
}

/** O que a decisão lê do modelo do sheet-core (tipado por estrutura). */
export interface OpenRecalcBook {
  readonly workbook: {
    readonly calcPr?: {
      readonly calcId?: number; readonly calcMode?: string;
      readonly fullCalcOnLoad?: boolean; readonly forceFullCalc?: boolean;
    };
  };
  readonly worksheets: readonly ({
    readonly rows: readonly { readonly cells: readonly {
      readonly ref: string; readonly value?: string; readonly type?: string; readonly formula?: string;
      readonly formulaAttrs?: { readonly t?: string; readonly si?: number; readonly ca?: boolean };
      readonly inlineString?: unknown;
    }[] }[];
  } | undefined)[];
}

/** A fórmula (texto canônico) chama alguma função volátil? Ignora o que está dentro de texto ("NOW()"). */
export function hasVolatileFunction(text: string): boolean {
  if (!VOLATILE_HINT.test(text)) return false;
  const node = tryParseFormula(text);
  if (!node) return true; // não analisável: pelo nome (o Excel também não confiaria)
  return nodeHasVolatile(node);
}

function nodeHasVolatile(node: Node): boolean {
  let hit = false;
  walk(node, (n) => { if (n.t === 'fn' && OPEN_VOLATILE.has(n.name)) hit = true; });
  return hit;
}

/**
 * Decide o recálculo ao abrir (regra do Excel 365, ver cabeçalho). `book` é o
 * modelo lido pelo sheet-core (workbook + worksheets na ordem das abas).
 */
export function shouldRecalcOnOpen(book: OpenRecalcBook): OpenRecalcPlan {
  const cp = book.workbook.calcPr;
  if (cp?.calcMode === 'manual') return { mode: 'none', reason: 'manual', cells: [] };
  if (cp?.fullCalcOnLoad) return { mode: 'full', reason: 'fullCalcOnLoad', cells: [] };
  if (cp?.forceFullCalc) return { mode: 'full', reason: 'forceFullCalc', cells: [] };
  if (!cp || cp.calcId === undefined) return { mode: 'full', reason: 'noCalcId', cells: [] };
  if (!(cp.calcId >= TRUSTED_CALC_ID)) return { mode: 'full', reason: 'oldCalcId', cells: [] };
  const cells: [number, number, number][] = [];
  const volatileCache = new Map<string, boolean>();
  const isVolatile = (text: string): boolean => {
    let v = volatileCache.get(text);
    if (v === undefined) { v = hasVolatileFunction(text); volatileCache.set(text, v); }
    return v;
  };
  for (let si = 0; si < book.worksheets.length; si++) {
    const ws = book.worksheets[si];
    if (!ws) continue;
    // texto das âncoras de fórmula compartilhada (as filhas vêm sem texto)
    const sharedText = new Map<number, string>();
    for (const row of ws.rows) for (const c of row.cells) {
      const fa = c.formulaAttrs;
      if (fa?.t === 'shared' && fa.si !== undefined && c.formula) sharedText.set(fa.si, c.formula);
    }
    for (const row of ws.rows) for (const c of row.cells) {
      if (c.formula === undefined) continue;
      const fa = c.formulaAttrs;
      const text = c.formula || (fa?.t === 'shared' && fa.si !== undefined ? sharedText.get(fa.si) ?? '' : '');
      // <f ca="1"/> sem texto (célula derramada de matriz volátil) não é fórmula
      if (!text) continue;
      if (!fa?.ca && isVolatile(text)) return { mode: 'full', reason: 'volatileWithoutCa', cells: [] };
      if (fa?.ca || (c.value === undefined && c.inlineString === undefined)) {
        const p = a1ToCell(c.ref);
        if (p) cells.push([si, p.row, p.col]);
      }
    }
  }
  return cells.length ? { mode: 'partial', reason: 'partial', cells } : { mode: 'none', reason: 'none', cells };
}

/**
 * Aplica o plano no motor (montado com os valores em cache do arquivo, sem
 * `ignoreCache`): completo = `recalc()`; parcial = só as células do plano.
 * Devolve as células cujo valor mudou (para atualizar o modelo/tela).
 */
export function applyOpenRecalc(engine: Engine, plan: OpenRecalcPlan): { sheet: number; row: number; col: number }[] {
  engine.takeChanges();
  if (plan.mode === 'full') engine.recalc();
  else if (plan.mode === 'partial') engine.calculateCells(plan.cells);
  else return [];
  return engine.takeChanges();
}
