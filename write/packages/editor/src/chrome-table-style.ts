// Novo Estilo de Tabela / Modificar Estilo de Tabela (Design da Tabela ›
// Estilos de Tabela): nome, base, "Aplicar formatação a" (tabela inteira,
// cabeçalho, total, colunas, faixas e cantos), fonte, bordas, preenchimento e
// alinhamento por condição, com a prévia pintada pelo motor. O w:style sai
// pelo docx-core (patchTableStyleXml) e entra na folha pelo DocStyles.
import { openDialog, pickLabels, type UiLang } from '@universal-office/ui';
import {
  TABLE_STYLE_CONDS, newTableStyleXml, patchTableStyleXml, readStyleSheet, retitleTableStyleXml,
  type BorderSpec, type TableCondFormat, type TableStyleCond, type TableStyleSide,
} from '@universal-office/docx-core';
import type { DialogEnv } from './chrome-dialogs.js';
import { BORDER_STYLES, BORDER_WIDTHS } from './chrome-borders.js';

const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const sel = (name: string, opts: readonly (readonly [string, string])[], value: string, style = ''): HTMLSelectElement => {
  const s = el('select', { name, style });
  for (const [v, t] of opts) s.append(el('option', { value: v, selected: v === value }, t));
  return s;
};

const COND_LABELS: Record<TableStyleCond, [string, string]> = {
  wholeTable: ['Whole table', 'Tabela inteira'], firstRow: ['Header row', 'Linha de cabeçalho'], lastRow: ['Total row', 'Linha de total'],
  firstCol: ['First column', 'Primeira coluna'], lastCol: ['Last column', 'Última coluna'],
  band1Horz: ['Odd banded rows', 'Linhas em tiras ímpares'], band2Horz: ['Even banded rows', 'Linhas em tiras pares'],
  band1Vert: ['Odd banded columns', 'Colunas em tiras ímpares'], band2Vert: ['Even banded columns', 'Colunas em tiras pares'],
  nwCell: ['Top left cell', 'Célula superior esquerda'], neCell: ['Top right cell', 'Célula superior direita'],
  swCell: ['Bottom left cell', 'Célula inferior esquerda'], seCell: ['Bottom right cell', 'Célula inferior direita'],
};

/** O que a condição tem hoje no rascunho (para os botões de alternar e os campos). */
function condState(xml: string, cond: TableStyleCond) {
  const sheet = readStyleSheet('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + xml + '</w:styles>');
  const st = Object.values(sheet.styles)[0];
  const part = cond === 'wholeTable' ? st : st?.tblStylePr?.[cond as keyof NonNullable<typeof st.tblStylePr>];
  const rPr = part?.rPr, pPr = part?.pPr, tcPr = part?.tcPr;
  return {
    bold: !!rPr?.b, italic: !!rPr?.i, underline: !!rPr?.u && rPr.u.val !== 'none',
    color: rPr?.color?.val && rPr.color.val !== 'auto' ? rPr.color.val : undefined,
    sz: rPr?.sz, font: rPr?.rFonts?.ascii,
    fill: tcPr?.shd?.fill && tcPr.shd.fill !== 'auto' ? tcPr.shd.fill : undefined,
    jc: pPr?.jc, vAlign: tcPr?.vAlign,
  };
}

/** Novo (mode 'new') ou Modificar ('modify', estilo pelo nome/id) Estilo de Tabela. */
export async function tableStyleDialog(env: DialogEnv, mode: 'new' | 'modify', nameOrId?: string): Promise<void> {
  const lang = env.lang, ed = env.ed;
  let draft: string;
  let basedOnName: string | undefined;
  const bases = ed.tableStyleBases();
  const normalId = bases.find((b) => b.name === 'Normal Table')?.id ?? 'TableNormal';
  if (mode === 'modify') {
    const cur = await ed.tableStyleXml(nameOrId ?? ed.getTableState()?.style ?? 'Table Grid');
    if (!cur) return;
    draft = cur.xml;
  } else {
    const name = tr(lang, 'Style1', 'Estilo1');
    draft = newTableStyleXml({ id: ed.newTableStyleId(name), name, basedOn: normalId });
  }
  const headName = /<w:name w:val="([^"]*)"/.exec(draft)?.[1] ?? '';
  const headBase = /<w:basedOn w:val="([^"]*)"/.exec(draft)?.[1] ?? '';

  const name = el('input', { type: 'text', name: 'ts-name', value: headName, style: 'width:100%' });
  const base = sel('ts-base', [['', tr(lang, '(no style)', '(sem estilo)')], ...bases.map((b): [string, string] => [b.id, b.name])], headBase, 'width:100%');
  const cond = sel('ts-cond', TABLE_STYLE_CONDS.map((c): [string, string] => [c, tr(lang, ...COND_LABELS[c])]), 'wholeTable', 'width:100%');
  // fonte
  const font = el('input', { type: 'text', name: 'ts-font', placeholder: tr(lang, '(theme font)', '(fonte do tema)'), style: 'width:150px' });
  const size = sel('ts-size', [['', '—'], ...[8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24].map((n): [string, string] => [String(n * 2), String(n).replace('.', tr(lang, '.', ','))])], '', 'width:70px');
  const tog = (label: string, title: string): HTMLButtonElement => el('button', { type: 'button', className: 'uo-pill', textContent: label, title, style: 'min-width:36px;padding:4px 10px' });
  const bBtn = tog('B', tr(lang, 'Bold', 'Negrito')), iBtn = tog('I', tr(lang, 'Italic', 'Itálico')), uBtn = tog('U', tr(lang, 'Underline', 'Sublinhado'));
  bBtn.style.fontWeight = '700'; iBtn.style.fontStyle = 'italic'; uBtn.style.textDecoration = 'underline';
  const color = el('input', { type: 'color', name: 'ts-color', value: '#000000', style: 'width:40px;height:28px;padding:0;border:0;background:none' });
  // bordas
  const bStyle = sel('ts-bstyle', BORDER_STYLES.map(([v, en, pt]): [string, string] => [v, tr(lang, en, pt)]), 'single');
  const bWidth = sel('ts-bwidth', BORDER_WIDTHS.map(([sz, t]): [string, string] => [String(sz), `${t} pt`]), '4');
  const bColor = el('input', { type: 'color', name: 'ts-bcolor', value: '#000000', style: 'width:40px;height:28px;padding:0;border:0;background:none' });
  const sideBtns = (([['top', 'Top', 'Superior'], ['bottom', 'Bottom', 'Inferior'], ['left', 'Left', 'Esquerda'], ['right', 'Right', 'Direita'],
    ['insideH', 'Inside H', 'Interna H'], ['insideV', 'Inside V', 'Interna V'], ['none', 'None', 'Nenhuma'], ['all', 'All', 'Todas']]) as [string, string, string][])
    .map(([s, en, pt]) => { const b = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, en, pt), style: 'padding:3px 9px' }); b.dataset['side'] = s; return b; });
  // preenchimento e alinhamento
  const fillOn = el('input', { type: 'checkbox', name: 'ts-fill-on' });
  const fill = el('input', { type: 'color', name: 'ts-fill', value: '#ffffff', style: 'width:40px;height:28px;padding:0;border:0;background:none' });
  const align = sel('ts-align', [['', '—'], ['left|top', tr(lang, 'Top left', 'Em cima, à esquerda')], ['center|top', tr(lang, 'Top center', 'Em cima, centralizado')], ['right|top', tr(lang, 'Top right', 'Em cima, à direita')],
    ['left|center', tr(lang, 'Center left', 'No centro, à esquerda')], ['center|center', tr(lang, 'Center', 'No centro')], ['right|center', tr(lang, 'Center right', 'No centro, à direita')],
    ['left|bottom', tr(lang, 'Bottom left', 'Embaixo, à esquerda')], ['center|bottom', tr(lang, 'Bottom center', 'Embaixo, centralizado')], ['right|bottom', tr(lang, 'Bottom right', 'Embaixo, à direita')]], '');
  const dpr = window.devicePixelRatio || 1;
  const cv = el('canvas', { width: Math.round(420 * dpr), height: Math.round(150 * dpr), style: 'width:420px;height:150px;border-radius:6px;border:1px solid color-mix(in srgb, currentColor 25%, transparent);background:#fff' });

  const c = (): TableStyleCond => cond.value as TableStyleCond;
  const sync = (): void => {
    const st = condState(draft, c());
    bBtn.classList.toggle('uo-on', st.bold); iBtn.classList.toggle('uo-on', st.italic); uBtn.classList.toggle('uo-on', st.underline);
    font.value = st.font ?? '';
    size.value = st.sz ? String(st.sz) : '';
    color.value = `#${(st.color ?? '000000').toLowerCase()}`;
    fillOn.checked = !!st.fill;
    fill.value = `#${(st.fill ?? 'ffffff').toLowerCase()}`;
    align.value = st.jc || st.vAlign ? `${st.jc ?? 'left'}|${st.vAlign ?? 'top'}` : '';
    ed.renderTableStyleXmlThumb(cv, draft);
  };
  const apply = (f: TableCondFormat): void => { draft = patchTableStyleXml(draft, c(), f); sync(); };
  const hex = (i: HTMLInputElement): string => i.value.replace('#', '').toUpperCase();
  bBtn.addEventListener('click', () => apply({ bold: !condState(draft, c()).bold }));
  iBtn.addEventListener('click', () => apply({ italic: !condState(draft, c()).italic }));
  uBtn.addEventListener('click', () => apply({ underline: !condState(draft, c()).underline }));
  font.addEventListener('change', () => apply({ fontAscii: font.value.trim() || null }));
  size.addEventListener('change', () => apply({ szHalfPt: size.value ? +size.value : null }));
  color.addEventListener('change', () => apply({ color: hex(color) }));
  fillOn.addEventListener('change', () => apply({ fill: fillOn.checked ? hex(fill) : null }));
  fill.addEventListener('change', () => { fillOn.checked = true; apply({ fill: hex(fill) }); });
  align.addEventListener('change', () => {
    if (!align.value) { apply({ alignment: null, vAlign: null }); return; }
    const [h, v] = align.value.split('|') as ['left' | 'center' | 'right', 'top' | 'center' | 'bottom'];
    apply({ alignment: h === 'left' ? null : h, vAlign: v === 'top' ? null : v });
  });
  for (const b of sideBtns) b.addEventListener('click', () => {
    const s = b.dataset['side']!;
    const pen: BorderSpec = { val: bStyle.value, sz: +bWidth.value, color: hex(bColor) };
    const sides: TableStyleSide[] = s === 'all' || s === 'none' ? ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] : [s as TableStyleSide];
    apply({ borders: Object.fromEntries(sides.map((x) => [x, s === 'none' ? null : pen])) });
  });
  cond.addEventListener('change', sync);
  base.addEventListener('change', () => { draft = retitleTableStyleXml(draft, { basedOn: base.value || null }); sync(); });

  const row = (...kids: (Node | string)[]): HTMLElement => el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, ...kids);
  const lbl = (t: string, ctl: HTMLElement): HTMLElement => el('label', { style: 'display:flex;flex-direction:column;gap:4px;flex:1;min-width:180px' }, t, ctl);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    el('strong', {}, tr(lang, 'Properties', 'Propriedades')),
    row(lbl(tr(lang, 'Name:', 'Nome:'), name), lbl(tr(lang, 'Style type:', 'Tipo de estilo:'), sel('ts-type', [['table', tr(lang, 'Table', 'Tabela')]], 'table', 'width:100%')), lbl(tr(lang, 'Style based on:', 'Estilo baseado em:'), base)),
    el('strong', {}, tr(lang, 'Formatting', 'Formatação')),
    lbl(tr(lang, 'Apply formatting to:', 'Aplicar formatação a:'), cond),
    row(font, size, bBtn, iBtn, uBtn, el('span', {}, tr(lang, 'Color', 'Cor')), color),
    row(bStyle, bWidth, bColor, ...sideBtns),
    row(el('label', { className: 'uo-check' }, fillOn, tr(lang, 'Fill', 'Preenchimento')), fill, el('span', {}, tr(lang, 'Alignment', 'Alinhamento')), align),
    cv,
    el('label', { className: 'uo-check' }, el('input', { type: 'radio', name: 'ts-where', checked: true }), tr(lang, 'Only in this document', 'Somente neste documento')));
  sync();
  const h = openDialog({
    title: mode === 'new' ? tr(lang, 'Create New Style from Formatting', 'Criar Novo Estilo a partir da Formatação') : tr(lang, 'Modify Style', 'Modificar Estilo'),
    body, layer: env.layer, lang, width: 640,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }],
  });
  if ((await h.result) !== 'ok') return;
  const nm = name.value.trim() || headName;
  draft = retitleTableStyleXml(draft, { name: nm });
  if (mode === 'new') {
    const id = ed.newTableStyleId(nm);
    draft = draft.replace(/w:styleId="[^"]*"/, () => `w:styleId="${id.replace(/"/g, '')}"`);
  }
  const baseName = bases.find((b) => b.id === base.value)?.name;
  ed.saveTableStyle(draft, { apply: false, basedOnName: baseName });
}
