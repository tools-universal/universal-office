/**
 * Cálculo na ABERTURA e na GRAVAÇÃO do .xlsx/.xls, como o Excel 365:
 * - abrir: monta o motor com os valores em cache do arquivo e recalcula o que o
 *   Excel recalcularia ao abrir (`shouldRecalcOnOpen`: completo com calcId
 *   antigo/ausente, fullCalcOnLoad, volátil sem ca; parcial nas fórmulas ca="1"
 *   e sem `<v>`; nada no modo manual) — os valores entram no modelo antes de a
 *   tela montar as linhas (o Excel nunca mostra o cache velho quando recalcula);
 * - gravar: ca/aca e `cm` (metadata XLDAPR) como o Excel grava, calcChain fora
 *   quando o `<sheetData>` é regenerado, `fullCalcOnLoad="1"` se há o que o
 *   motor não calcula igual (função de servidor/cubo, UDF, tabela de dados).
 * O componente só chama `openCalc`/`saveCalc` (ganchos em universal-sheet.ts).
 * Dono: agente CALC-IO.
 */
import {
  Engine, fromSheetCore, shouldRecalcOnOpen, applyOpenRecalc, writeValues, prepareForSave, PT_BR,
  type OpenRecalcPlan, type ValueLocale, type SyncWorksheet,
} from '@universal/sheet-calc';
import {
  ensureDynamicArrayCm, removeCalcChain, updateCalcPr,
  type Workbook, type Worksheet, type SharedString, type XlsxPackage,
} from '@universal/sheet-core';

export interface CalcState {
  readonly engine: Engine;
  readonly plan: OpenRecalcPlan;
  /** Abas (na ordem do workbook) cujo modelo o cálculo mudou desde a última gravação. */
  readonly worksheets: readonly (Worksheet | undefined)[];
  readonly dirty: Set<Worksheet>;
  /** O motor calculou algo nesta sessão (os valores gravados são nossos). */
  computed: boolean;
}

/**
 * Abre o cálculo da pasta: motor + recálculo ao abrir (regra do Excel), com os
 * valores novos já gravados no modelo (`worksheets` na ordem de workbook.sheets).
 */
export function openCalc(workbook: Workbook, worksheets: readonly (Worksheet | undefined)[], shared: readonly SharedString[],
  locale: ValueLocale = PT_BR): CalcState | undefined {
  if (!worksheets.some((ws) => ws?.rows.some((r) => r.cells.some((c) => c.formula !== undefined)))) return undefined;
  const engine = new Engine(fromSheetCore({ workbook, worksheets, sharedStrings: shared }), { locale });
  const plan = shouldRecalcOnOpen({ workbook, worksheets });
  const changes = applyOpenRecalc(engine, plan);
  const dirty = new Set<Worksheet>();
  for (const s of writeValues(engine, worksheets as readonly (SyncWorksheet | undefined)[], changes)) {
    const ws = worksheets[s];
    if (ws) dirty.add(ws);
  }
  return { engine, plan, worksheets, dirty, computed: plan.mode !== 'none' && changes.length > 0 };
}

/**
 * Prepara a gravação: atributos de cálculo nas abas que vão ser regravadas
 * (`willWrite` + as que o cálculo sujou) e as partes da pasta (calcChain,
 * calcPr, metadata). Devolve as abas a regravar por causa do cálculo.
 */
export function saveCalc(pkg: XlsxPackage, workbook: Workbook, state: CalcState | undefined, willWrite: ReadonlySet<Worksheet>): Set<Worksheet> {
  const out = new Set<Worksheet>(state?.dirty ?? []);
  if (state) {
    const sheets = new Set<number>();
    state.worksheets.forEach((ws, i) => { if (ws && (willWrite.has(ws) || out.has(ws))) sheets.add(i); });
    const prep = prepareForSave(state.engine, state.worksheets as readonly (SyncWorksheet | undefined)[], {
      dynamicCms: workbook.dynamicArrayCm ?? [],
      dynamicCm: () => ensureDynamicArrayCm(pkg),
      sheets,
    });
    for (const s of prep.touched) { const ws = state.worksheets[s]; if (ws) out.add(ws); }
    if (!prep.sure && (state.computed || willWrite.size)) updateCalcPr(pkg, { fullCalcOnLoad: '1' });
    state.dirty.clear();
  }
  // <sheetData> regenerado: a cadeia de cálculo pode ficar velha (o Excel repara) — sai
  if (out.size || willWrite.size) removeCalcChain(pkg);
  return out;
}
