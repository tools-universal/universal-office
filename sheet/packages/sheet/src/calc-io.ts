/**
 * Cálculo na GRAVAÇÃO do .xlsx, como o Excel 365 (o recálculo ao abrir está em
 * sheet-calc.ts → `shouldRecalcOnOpen` do motor):
 * - fórmula digitada (semântica dinâmica) vai como fórmula comum quando a
 *   semântica legada dá o mesmo, senão como matriz dinâmica `t="array"` + `cm`
 *   (metadata XLDAPR criado se a pasta não tem — sem ele o Excel lê `{=…}` CSE);
 * - ca/aca como o Excel grava (voláteis + dependentes; #SPILL!);
 * - calcChain fora quando algum `<sheetData>` é regenerado (cadeia velha faz o
 *   Excel reparar a pasta); `fullCalcOnLoad="1"` se há o que o motor não
 *   calcula igual (função de servidor/cubo, UDF, tabela de dados).
 * Dono: agente CALC-IO.
 */
import { prepareForSave, type Engine, type SyncWorksheet } from '@universal-office/sheet-calc';
import {
  ensureDynamicArrayCm, removeCalcChain, updateCalcPr,
  type Workbook, type Worksheet, type XlsxPackage,
} from '@universal-office/sheet-core';

/**
 * Prepara a gravação: atributos de cálculo nas abas que vão ser regravadas
 * (`willWrite`) e as partes da pasta (calcChain, calcPr, metadata). `views` na
 * ordem do componente (abas com conteúdo, na ordem do workbook). Devolve as abas
 * que o cálculo mudou e também precisam ser regravadas.
 */
export function saveCalc(pkg: XlsxPackage, workbook: Workbook, engine: Engine | null,
  views: readonly { readonly worksheet: Worksheet }[], willWrite: ReadonlySet<Worksheet>): Set<Worksheet> {
  const out = new Set<Worksheet>();
  if (engine) {
    // aba do motor (= workbook.sheets) → worksheet do componente (mesma regra do SheetCalc)
    const worksheets: (Worksheet | undefined)[] = [];
    let k = 0;
    for (const s of workbook.sheets) worksheets.push(s.target && views[k] ? views[k++]!.worksheet : undefined);
    const sheets = new Set<number>();
    worksheets.forEach((ws, i) => { if (ws && willWrite.has(ws)) sheets.add(i); });
    const prep = prepareForSave(engine, worksheets as readonly (SyncWorksheet | undefined)[], {
      dynamicCms: workbook.dynamicArrayCm ?? [],
      dynamicCm: () => {
        const cm = ensureDynamicArrayCm(pkg);
        // a pasta passa a ter os metadados: as próximas fórmulas dinâmicas usam o mesmo cm
        workbook.dynamicArrayCm = [...new Set([...(workbook.dynamicArrayCm ?? []), cm])];
        return cm;
      },
      sheets,
    });
    for (const s of prep.touched) { const ws = worksheets[s]; if (ws) out.add(ws); }
    if (!prep.sure && sheets.size) updateCalcPr(pkg, { fullCalcOnLoad: '1' });
  }
  // <sheetData> regenerado: a cadeia de cálculo pode ficar velha (o Excel repara) — sai
  if (out.size || willWrite.size) removeCalcChain(pkg);
  return out;
}
