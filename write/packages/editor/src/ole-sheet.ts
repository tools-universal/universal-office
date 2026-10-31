// Planilha do Excel incorporada (Inserir › Tabela › Planilha do Excel): o
// objeto OLE (w:object) leva o .xlsx e uma prévia; editar abre o
// <universal-sheet> num diálogo — o componente é do produto Sheet e vem sob
// demanda (registrado pela página ou pelo `sheetLoader` do <universal-write>),
// nunca embutido no Write.
import { DocxPackage } from '@universal-office/docx-core';
import { openDialog, pickLabels, type UiLang } from '@universal-office/ui';

/** O que o diálogo usa do <universal-sheet>. */
interface SheetElement extends HTMLElement {
  loadXlsx(bytes: Uint8Array): void;
  saveXlsx(): Uint8Array;
  renderRegionToCanvas(index: number, canvas: HTMLCanvasElement, nCols: number, nRows: number): { w: number; h: number };
  debugCellDisplays(maxCol?: number, maxRow?: number): { ref: string; display: string }[];
}

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

/** Pasta de trabalho em branco (uma planilha) — o que o Word incorpora ao inserir. */
export function blankXlsx(lang: UiLang): Uint8Array {
  const pkg = DocxPackage.empty();
  for (const p of pkg.partNames()) pkg.removePart(p);
  pkg.setPartText('[Content_Types].xml', XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  pkg.setPartText('_rels/.rels', XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  const name = pickLabels(lang, { en: 'Sheet1', pt: 'Planilha1', es: 'Hoja1' });
  pkg.setPartText('xl/workbook.xml', XML + `<workbook xmlns="${NS}" xmlns:r="${RNS}"><bookViews><workbookView/></bookViews>`
    + `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  pkg.setPartText('xl/_rels/workbook.xml.rels', XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  pkg.setPartText('xl/worksheets/sheet1.xml', XML + `<worksheet xmlns="${NS}" xmlns:r="${RNS}"><dimension ref="A1"/>`
    + '<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData/></worksheet>');
  pkg.setPartText('xl/styles.xml', XML + `<styleSheet xmlns="${NS}">`
    + '<fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Aptos Narrow"/><family val="2"/><scheme val="minor"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
    + `<cellStyles count="1"><cellStyle name="${pickLabels(lang, { en: 'Normal', pt: 'Normal', es: 'Normal' })}" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  return pkg.save();
}

/** O componente <universal-sheet> está disponível (registrado ou carregável). */
export async function sheetAvailable(loader?: () => Promise<unknown>): Promise<boolean> {
  if (customElements.get('universal-sheet')) return true;
  if (!loader) return false;
  try { await loader(); } catch { return false; }
  return !!customElements.get('universal-sheet');
}

/** Colunas/linhas usadas (pelo menos min) da 1ª aba. */
function usedSize(el: SheetElement, minCols: number, minRows: number): { cols: number; rows: number } {
  let cols = minCols, rows = minRows;
  for (const c of el.debugCellDisplays(60, 400)) {
    if (!c.display) continue;
    const m = /^([A-Z]+)(\d+)$/.exec(c.ref);
    if (!m) continue;
    let n = 0;
    for (const ch of m[1]!) n = n * 26 + ch.charCodeAt(0) - 64;
    cols = Math.max(cols, n);
    rows = Math.max(rows, +m[2]!);
  }
  return { cols, rows };
}

/** PNG do canvas da prévia e o tamanho em twips (px CSS a 96 dpi). */
async function previewPng(canvas: HTMLCanvasElement, w: number, h: number): Promise<{ png: Uint8Array; widthTwips: number; heightTwips: number }> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  const png = new Uint8Array(await (blob ?? new Blob()).arrayBuffer());
  return { png, widthTwips: Math.round((w || canvas.width) * 15), heightTwips: Math.round((h || canvas.height) * 15) };
}

/**
 * Diálogo de edição da planilha incorporada: o <universal-sheet> com o .xlsx;
 * OK devolve o .xlsx novo e a prévia; Cancelar, null.
 */
export async function editSpreadsheet(
  layer: HTMLElement, lang: UiLang, xlsx: Uint8Array,
): Promise<{ xlsx: Uint8Array; png: Uint8Array; widthTwips: number; heightTwips: number } | null> {
  const el = document.createElement('universal-sheet') as SheetElement;
  el.setAttribute('lang', lang);
  el.style.cssText = 'display:block;width:min(820px,86vw);height:min(460px,60vh)';
  const body = document.createElement('div');
  body.append(el);
  // gravação e prévia ANTES de o diálogo fechar (com o componente ainda montado)
  let saved: { xlsx: Uint8Array; canvas: HTMLCanvasElement; w: number; h: number } | null = null;
  const h = openDialog({
    title: pickLabels(lang, { en: 'Excel Spreadsheet', pt: 'Planilha do Excel', es: 'Hoja de cálculo de Excel' }), body, layer, lang, width: 880,
    actions: [{ id: 'cancel', label: pickLabels(lang, { en: 'Cancel', pt: 'Cancelar', es: 'Cancelar' }) }, { id: 'ok', label: 'OK', primary: true }],
    onAction: (id) => {
      if (id !== 'ok') return;
      try {
        const out = el.saveXlsx();
        const { cols, rows } = usedSize(el, 3, 4);
        const canvas = document.createElement('canvas');
        const d = el.renderRegionToCanvas(0, canvas, cols, rows);
        saved = { xlsx: out, canvas, w: d.w, h: d.h };
      } catch (err) {
        // a planilha não gravou: o diálogo fica aberto (Cancelar desiste)
        console.error(err);
        return false;
      }
    },
  });
  await new Promise((r) => requestAnimationFrame(r));
  el.loadXlsx(xlsx);
  if ((await h.result) !== 'ok' || !saved) return null;
  const s = saved as { xlsx: Uint8Array; canvas: HTMLCanvasElement; w: number; h: number };
  return { xlsx: s.xlsx, ...(await previewPng(s.canvas, s.w, s.h)) };
}
