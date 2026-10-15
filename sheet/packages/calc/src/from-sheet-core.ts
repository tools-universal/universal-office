/**
 * Adaptador: modelo do sheet-core (Workbook/Worksheet/SharedString lidos do
 * .xlsx) → CalcWorkbook. Tipado por ESTRUTURA (sem importar o sheet-core): o
 * componente e o harness do corpus juntam os dois pacotes.
 *
 *   const wb = readWorkbook(pkg);
 *   const sheets = wb.sheets.map((s) => s.target ? readWorksheet(pkg, s.target) : undefined);
 *   const engine = new Engine(fromSheetCore({ workbook: wb, worksheets: sheets, sharedStrings: readSharedStrings(pkg) }), { locale: PT_BR });
 *   engine.recalc();
 * Dono: agente CORE.
 */
import { a1ToArea, a1ToCell } from './a1.js';
import { CalcError, ERROR_TYPE, ERR, type ErrorCode, type Scalar } from './values.js';
import { ymdToSerial } from './dates.js';
import type { CalcWorkbook, CellInput, ExternalInput, FormulaInput, NameInput, SheetInput, TableInput } from './workbook.js';

export interface SheetCoreText { readonly text?: string; readonly runs?: readonly { readonly text: string }[] }

export interface SheetCoreCell {
  readonly ref: string;
  readonly type?: string;
  readonly value?: string;
  readonly formula?: string;
  readonly formulaAttrs?: {
    readonly t?: string; readonly ref?: string; readonly si?: number; readonly ca?: boolean;
    readonly dt2D?: boolean; readonly dtr?: boolean; readonly r1?: string; readonly r2?: string;
  };
  readonly cm?: number;
  readonly inlineString?: SheetCoreText;
}

export interface SheetCoreWorksheet {
  readonly rows: readonly { readonly r: number; readonly hidden?: boolean; readonly cells: readonly SheetCoreCell[] }[];
  readonly merges?: readonly string[];
  readonly autoFilter?: { readonly ref: string; readonly active?: readonly number[] };
  readonly tables?: readonly {
    readonly ref: string; readonly name?: string; readonly displayName?: string;
    readonly headerRow?: boolean; readonly totalsRow?: boolean; readonly headerRowCount?: number; readonly totalsRowCount?: number;
    readonly columns?: readonly { readonly name: string }[];
    readonly filter?: { readonly ref: string; readonly active?: readonly number[] };
  }[];
}

export interface SheetCoreBook {
  readonly workbook: {
    readonly sheets: readonly { readonly name: string }[];
    readonly date1904?: boolean;
    readonly definedNames?: readonly { readonly name: string; readonly formula: string; readonly localSheetId?: number }[];
    readonly calcPr?: { readonly iterate?: boolean; readonly iterateCount?: number; readonly iterateDelta?: number; readonly fullCalcOnLoad?: boolean };
    readonly externalLinks?: readonly {
      readonly sheetNames: readonly string[];
      readonly definedNames: readonly { readonly name: string; readonly refersTo?: string; readonly sheetId?: number }[];
      readonly sheetData: readonly { readonly sheetId: number; readonly cells: readonly { readonly ref: string; readonly t?: string; readonly v?: string }[] }[];
    }[];
    readonly dynamicArrayCm?: readonly number[];
  };
  /** Na ordem de workbook.sheets (undefined = aba sem conteúdo/gráfico). */
  readonly worksheets: readonly (SheetCoreWorksheet | undefined)[];
  readonly sharedStrings: readonly SheetCoreText[];
}

const textOf = (t: SheetCoreText | undefined): string => t?.text ?? t?.runs?.map((r) => r.text).join('') ?? '';

/** Erro gravado no arquivo ("#N/A", "#DIV/0!"…) → CalcError. */
export function errorOf(code: string): CalcError {
  const c = code.trim().toUpperCase() as ErrorCode;
  return c in ERROR_TYPE ? CalcError.of(c) : ERR.VALUE;
}

/** Valor de célula do arquivo (atributo t + <v>) → escalar. */
export function cellValue(c: SheetCoreCell, sst: readonly SheetCoreText[], date1904 = false): Scalar {
  switch (c.type) {
    case 's': { const i = Number(c.value); return Number.isInteger(i) ? textOf(sst[i]) : null; }
    case 'str': return c.value ?? (c.formula !== undefined ? '' : null);
    case 'inlineStr': return textOf(c.inlineString);
    case 'b': return c.value === undefined ? null : c.value === '1' || c.value === 'true';
    case 'e': return c.value === undefined ? null : errorOf(c.value);
    case 'd': {
      if (!c.value) return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?)?/.exec(c.value);
      if (!m) return null;
      return ymdToSerial(+m[1]!, +m[2]!, +m[3]!, date1904) + ((+(m[4] ?? 0)) * 3600 + (+(m[5] ?? 0)) * 60 + (+(m[6] ?? 0))) / 86400;
    }
    default: {
      if (c.value === undefined || c.value === '') return null;
      const n = Number(c.value);
      return Number.isFinite(n) ? n : null;
    }
  }
}

function extValue(t: string | undefined, v: string | undefined): Scalar {
  if (v === undefined) return null;
  switch (t) {
    case 'str': case 's': case 'inlineStr': return v;
    case 'b': return v === '1' || v === 'true';
    case 'e': return errorOf(v);
    default: { const n = Number(v); return Number.isFinite(n) ? n : v; }
  }
}

/** Monta a entrada do motor a partir do que o sheet-core leu. */
export function fromSheetCore(src: SheetCoreBook): CalcWorkbook {
  const wb = src.workbook;
  const dyn = new Set(wb.dynamicArrayCm ?? []);
  const sheets: SheetInput[] = [];
  const tables: TableInput[] = [];
  wb.sheets.forEach((sh, si) => {
    const ws = src.worksheets[si];
    const cells: [number, number, CellInput][] = [];
    const hidden: number[] = [];
    const filtered: number[] = [];
    if (ws) {
      // linhas filtradas: ocultas dentro de autofiltro com critério ativo
      const filters = [ws.autoFilter, ...(ws.tables ?? []).map((t) => t.filter)]
        .filter((f): f is { ref: string; active?: readonly number[] } => !!f && !!f.active?.length)
        .map((f) => a1ToArea(f.ref, si)).filter((a) => !!a);
      for (const row of ws.rows) {
        const r = row.r - 1;
        if (row.hidden) {
          hidden.push(r);
          if (filters.some((a) => r > a!.r1 && r <= a!.r2)) filtered.push(r);
        }
        for (const c of row.cells) {
          const p = a1ToCell(c.ref);
          if (!p) continue;
          const v = cellValue(c, src.sharedStrings, wb.date1904);
          if (c.formula !== undefined) {
            const fa = c.formulaAttrs ?? {};
            const t = fa.t === 'shared' || fa.t === 'array' || fa.t === 'dataTable' ? fa.t : undefined;
            const f: FormulaInput = {
              text: c.formula,
              ...(t ? { t } : {}),
              ...(fa.ref !== undefined ? { ref: fa.ref } : {}),
              ...(fa.si !== undefined ? { si: fa.si } : {}),
              ...(t === 'array' && c.cm !== undefined && dyn.has(c.cm) ? { dynamic: true } : {}),
              ...(fa.ca ? { ca: true } : {}),
              ...(fa.dt2D ? { dt2D: true } : {}),
              ...(fa.dtr ? { dtr: true } : {}),
              ...(fa.r1 !== undefined ? { r1: fa.r1 } : {}),
              ...(fa.r2 !== undefined ? { r2: fa.r2 } : {}),
            };
            cells.push([p.row, p.col, { v, f }]);
          } else if (v !== null) cells.push([p.row, p.col, { v }]);
        }
      }
      for (const t of ws.tables ?? []) {
        const area = a1ToArea(t.ref, si);
        if (!area) continue;
        const header = t.headerRowCount ?? (t.headerRow === false ? 0 : 1);
        const totals = t.totalsRowCount ?? (t.totalsRow ? 1 : 0);
        let columns = (t.columns ?? []).map((c) => c.name);
        if (!columns.length) columns = Array.from({ length: area.c2 - area.c1 + 1 }, (_, i) => `Column${i + 1}`);
        tables.push({ name: t.displayName ?? t.name ?? `Table${tables.length + 1}`, sheet: si, ref: t.ref, headerRowCount: header, totalsRowCount: totals, columns });
      }
    }
    sheets.push({ name: sh.name, cells, hiddenRows: hidden, filteredRows: filtered, merges: ws?.merges ?? [] });
  });
  const names: NameInput[] = (wb.definedNames ?? []).map((d) => ({ name: d.name, formula: d.formula, ...(d.localSheetId !== undefined ? { sheet: d.localSheetId } : {}) }));
  const externals: ExternalInput[] = (wb.externalLinks ?? []).map((x) => ({
    sheets: x.sheetNames.map((name, i) => ({
      name,
      cells: (x.sheetData.find((d) => d.sheetId === i)?.cells ?? []).flatMap((c) => {
        const p = a1ToCell(c.ref);
        return p ? [[p.row, p.col, extValue(c.t, c.v)] as const] : [];
      }),
    })),
    names: x.definedNames.map((d) => ({ name: d.name, formula: (d.refersTo ?? '#REF!').replace(/^=/, ''), ...(d.sheetId !== undefined ? { sheet: d.sheetId } : {}) })),
  }));
  return {
    sheets, names, tables, externals,
    ...(wb.date1904 ? { date1904: true } : {}),
    ...(wb.calcPr ? { calc: { iterate: wb.calcPr.iterate, iterateCount: wb.calcPr.iterateCount, iterateDelta: wb.calcPr.iterateDelta, fullCalcOnLoad: wb.calcPr.fullCalcOnLoad } } : {}),
  };
}
