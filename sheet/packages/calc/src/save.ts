/**
 * Preparação do modelo do sheet-core para GRAVAR o .xlsx depois de calcular,
 * como o Excel 365 grava (ver file-form.ts e to-sheet-core.ts): ca/aca de cada
 * fórmula, `cm` das matrizes dinâmicas (e só delas), fórmula compartilhada sem
 * âncora vira fórmula própria (o Excel "repara" `<f t="shared" si>` órfão), e
 * a CONFIANÇA nos valores calculados — o que decide o `<calcPr>`:
 *   - motor calculou tudo o que sabe → o cache gravado é o do Excel;
 *   - há o que o motor não calcula (função de ambiente/servidor: WEBSERVICE,
 *     RTD, CUBE*, STOCKHISTORY, GETPIVOTDATA; função desconhecida/UDF; tabela de
 *     dados; fórmula que não analisou; erro interno) → `fullCalcOnLoad="1"`
 *     para o Excel recalcular ao abrir em vez de mostrar o nosso cache.
 * Tipado por estrutura (sem importar o sheet-core). Dono: agente CALC-IO.
 */
import { walk } from './ast.js';
import type { Engine, FormulaRec } from './engine.js';
import { lookupFn } from './fn.js';
import { saveFlags } from './file-form.js';
import { printFormula } from './print.js';
import { a1ToCell } from './a1.js';
import type { SyncCell, SyncWorksheet } from './to-sheet-core.js';

/** Funções cujo resultado vem de fora (servidor, cubo, pivô): o nosso valor não é o do Excel. */
export const ENVIRONMENT_FUNCTIONS = new Set(['WEBSERVICE', 'RTD', 'CUBEVALUE', 'CUBEMEMBER', 'CUBEMEMBERPROPERTY', 'CUBERANKEDMEMBER',
  'CUBEKPIMEMBER', 'CUBESET', 'CUBESETCOUNT', 'STOCKHISTORY', 'GETPIVOTDATA', 'IMAGE', 'FILTERXML', 'TRANSLATE', 'DETECTLANGUAGE', 'COPILOT', 'PY']);

export interface SaveOptions {
  /** `cm` (1-based) que já marcam matriz dinâmica no arquivo (Workbook.dynamicArrayCm). */
  readonly dynamicCms?: readonly number[];
  /** Índice `cm` de matriz dinâmica para fórmulas novas (cria o metadata.xml só se chamado). */
  readonly dynamicCm?: () => number;
  /** Abas a preparar (as que serão regravadas); ausente = todas. */
  readonly sheets?: ReadonlySet<number>;
}

export interface SavePrep {
  /** Abas cujo modelo mudou aqui (precisam do <sheetData> regravado). */
  readonly touched: Set<number>;
  /** Os valores calculados são os do Excel (senão: fullCalcOnLoad). */
  readonly sure: boolean;
  /** Motivos de não ter certeza (para diagnóstico). */
  readonly unsure: string[];
}

/** O que o motor não sabe calcular igual ao Excel nesta pasta. */
export function unsureReasons(engine: Engine): string[] {
  const out = new Set<string>();
  if (engine.internalErrors.length) out.add('erro interno');
  for (const f of engine.allFormulas()) {
    if (f.kind === 'dataTable') { out.add('tabela de dados'); continue; }
    if (!f.node) { out.add('fórmula não analisada'); continue; }
    walk(f.node, (n) => {
      if (n.t !== 'fn') return;
      if (ENVIRONMENT_FUNCTIONS.has(n.name)) out.add(n.name);
      else if (!lookupFn(n.name) && n.name !== 'ANCHORARRAY' && !n.name.startsWith('_TRO_') && !engine.definedName(n.name, f.sheet)) out.add(`desconhecida ${n.name}`);
    });
  }
  return [...out];
}

/** Índice (linha*16384+coluna → célula) de uma aba do modelo. */
function cellIndex(ws: SyncWorksheet): Map<number, SyncCell> {
  const m = new Map<number, SyncCell>();
  for (const row of ws.rows) for (const c of row.cells) {
    const p = a1ToCell(c.ref);
    if (p) m.set(p.row * 16384 + p.col, c);
  }
  return m;
}

/**
 * Ajusta no modelo os atributos de cálculo das fórmulas para gravar (ver
 * cabeçalho). Chame depois de `writeValues` (valores e `ref` das âncoras já
 * no modelo).
 */
export function prepareForSave(engine: Engine, worksheets: readonly (SyncWorksheet | undefined)[], o: SaveOptions = {}): SavePrep {
  const flags = saveFlags(engine);
  const dynCms = new Set(o.dynamicCms ?? []);
  let cm: number | undefined;
  const touched = new Set<number>();
  const bySheet = new Map<number, FormulaRec[]>();
  for (const f of engine.allFormulas()) {
    if (o.sheets && !o.sheets.has(f.sheet)) continue;
    let l = bySheet.get(f.sheet);
    if (!l) { l = []; bySheet.set(f.sheet, l); }
    l.push(f);
  }
  for (const [s, recs] of bySheet) {
    const ws = worksheets[s];
    if (!ws) continue;
    const idx = cellIndex(ws);
    // âncoras de compartilhada presentes (si → existe célula com texto)
    const anchors = new Set<number>();
    for (const c of idx.values()) if (c.formulaAttrs?.t === 'shared' && c.formulaAttrs.si !== undefined && c.formula) anchors.add(c.formulaAttrs.si);
    for (const f of recs) {
      const c = idx.get(f.row * 16384 + f.col);
      if (!c || c.formula === undefined) continue;
      let changed = false;
      const fa = { ...(c.formulaAttrs ?? {}) };
      // filha de compartilhada cuja âncora sumiu: fórmula própria
      if (fa.t === 'shared' && !c.formula && (fa.si === undefined || !anchors.has(fa.si)) && f.node) {
        c.formula = printFormula(f.node, { row: f.row, col: f.col });
        delete fa.t; delete fa.si; delete fa.ref;
        changed = true;
      }
      const fl = flags.get(f) ?? { ca: false, aca: false };
      if (!!fa.ca !== fl.ca) { if (fl.ca) fa.ca = true; else delete fa.ca; changed = true; }
      if (!!fa.aca !== fl.aca) { if (fl.aca) fa.aca = true; else delete fa.aca; changed = true; }
      if (f.dynamic) {
        if (c.cm === undefined || !dynCms.has(c.cm)) {
          if (o.dynamicCm) { cm ??= o.dynamicCm(); c.cm = cm; dynCms.add(cm); changed = true; }
        }
      } else if (c.cm !== undefined && dynCms.has(c.cm)) { delete c.cm; changed = true; }
      if (changed) {
        if (Object.keys(fa).length) c.formulaAttrs = fa; else delete c.formulaAttrs;
        touched.add(s);
      }
    }
  }
  const unsure = unsureReasons(engine);
  // tabela de dados (<f t="dataTable"/> sem texto): o motor não a calcula
  if (!unsure.includes('tabela de dados') && worksheets.some((ws) => ws?.rows.some((r) => r.cells.some((c) => c.formulaAttrs?.t === 'dataTable')))) unsure.push('tabela de dados');
  return { touched, sure: unsure.length === 0, unsure };
}
