// Diálogos das barras do Write (iniciadores da ribbon e itens "…" dos menus):
// Fonte, Parágrafo, Configurar Página, link, comentário, contar palavras,
// atalhos e sobre. Todos sobre o openDialog de @universal-office/ui (<dialog>
// nativo — sem a trava de animação do u-dialog).
import { uiLocale, dialogTabs, formatMeasure, openDialog, parseMeasure, pickLabels, promptDialog, type UiLang } from '@universal-office/ui';
import type { SectionType } from '@universal-office/docx-core';
import type { LineNumberingOptions, SectionApplyTo, UniversalWriteElement } from './universal-write.js';
import { lineNumbersDialog } from './chrome-textlayout.js';
import { tableDialog } from './chrome-table-dialogs.js';
import type { WriteApp } from './chrome-app.js';
import { originStore } from './chrome-store.js';

type Env = { ed: UniversalWriteElement; app: WriteApp; layer: HTMLElement; lang: UiLang; state: () => ReturnType<UniversalWriteElement['getSelectionState']> };

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const select = (name: string, opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select', { name });
  for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
  s.value = value;
  return s;
};
const check = (name: string, label: string, on: boolean): HTMLLabelElement => {
  const i = el('input', { type: 'checkbox', name, checked: on });
  return el('label', { className: 'uo-check' }, i, label);
};
// textos curtos dos diálogos: tabela { en, pt, es } escolhida por pickLabels (regra única de i18n)
const tr = (lang: UiLang, en: string, pt: string, es: string): string => pickLabels(lang, { en, pt, es });

export async function linkDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L;
  const cur = (env.state().run.link as string | undefined) ?? '';
  const url = await promptDialog({ title: L.linkTitle, label: L.linkUrl, value: cur || 'https://', ok: L.linkApply, layer: env.layer, lang: env.lang });
  if (url === null) return;
  const v = url.trim();
  env.ed.setLink(v && v !== 'https://' ? v : undefined);
}

/** Nome do autor das revisões e dos comentários: sem atributo `author` nem host,
 *  pergunta uma vez (e a origem lembra — como o nome de usuário do Office, por
 *  máquina). false = cancelado. */
export async function authorDialog(env: Env): Promise<boolean> {
  if (env.ed.hasAuthor()) return true;
  const L = env.app.ui!.L;
  const name = await promptDialog({ title: L.authorTitle, label: L.authorText, ok: L.authorOk, layer: env.layer, lang: env.lang });
  if (!name?.trim()) return false;
  env.ed.author = name.trim();
  originStore.set('uw-author', env.ed.author);
  return true;
}

export async function commentDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L;
  if (!env.ed.selectedText()) { env.app.ui!.flash(L.selectToComment); return; }
  if (!(await authorDialog(env))) return;
  const text = await promptDialog({ title: L.commentTitle, label: L.commentText, multiline: true, ok: L.commentAdd, layer: env.layer, lang: env.lang });
  if (!text?.trim()) return;
  env.app.ui!.flash(env.ed.addComment(text.trim()) === null ? L.selectToComment : L.commentAdded);
}

/** Unidade das medidas dos diálogos: cm (pt) ou polegadas (en), como a régua. */
const unitOf = (lang: UiLang): { tw: number; name: string; step: string } =>
  lang !== 'en' ? { tw: 1440 / 2.54, name: 'cm', step: '0.01' } : { tw: 1440, name: '"', step: '0.01' };
const fmtUnit = (tw: number, u: { tw: number }, lang: UiLang): string =>
  (Math.round((tw / u.tw) * 100) / 100).toLocaleString(uiLocale(lang), { maximumFractionDigits: 2 });
/** "2,5", "2.5 cm", '1"' → twips (NaN se não for número) */
const parseUnit = (v: string, u: { tw: number }): number => {
  const n = parseFloat(v.replace(/\s|cm|"|pol|in/gi, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * u.tw) : NaN;
};
const unitInput = (name: string, tw: number, u: { tw: number; step: string }, lang: UiLang, min?: number): HTMLInputElement =>
  el('input', { type: 'text', name, value: fmtUnit(tw, u, lang), inputMode: 'decimal', style: 'width:96px', ...(min !== undefined ? { dataset: { min: String(min) } } as never : {}) });

export async function paragraphDialog(env: Env, tab: 'indents' | 'breaks' = 'indents'): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang;
  const p = env.state().para;
  const u = unitOf(lang);
  const ind = env.ed.getParagraphIndents();
  const lay = typeof env.ed.getParagraphLayout === 'function' ? env.ed.getParagraphLayout() : null;
  const align = select('align', [['left', tr(lang, 'Left', 'Esquerda', 'Izquierda')], ['center', tr(lang, 'Centered', 'Centralizada', 'Centrada')],
    ['right', tr(lang, 'Right', 'Direita', 'Derecha')], ['both', tr(lang, 'Justified', 'Justificada', 'Justificada')]], (p.alignment as string | undefined) ?? 'left');
  // Recuo: esquerdo, direito, especial (primeira linha / deslocamento) e "Por"
  const left = unitInput('left', ind.left, u, lang);
  const right = unitInput('right', ind.right, u, lang);
  const special = select('special', [['none', tr(lang, '(none)', '(nenhum)', '(ninguno)')], ['firstLine', tr(lang, 'First line', 'Primeira linha', 'Primera línea')],
    ['hanging', tr(lang, 'Hanging', 'Deslocamento', 'Francesa')]], !ind.firstLine ? 'none' : ind.firstLine > 0 ? 'firstLine' : 'hanging');
  const by = unitInput('by', Math.abs(ind.firstLine), u, lang);
  const syncBy = (): void => {
    by.disabled = special.value === 'none';
    if (special.value === 'none') by.value = '';
    else if (!by.value || parseUnit(by.value, u) === 0) by.value = fmtUnit(Math.round(u.tw * (lang !== 'en' ? 1.25 : 0.5)), u, lang);
  };
  special.addEventListener('change', syncBy);
  if (special.value === 'none') { by.value = ''; by.disabled = true; }
  // Espaçamento antes/depois em pt, com "Automático" (w:beforeAutospacing — oráculo textlayout-lab sp-*);
  // vazio = os parágrafos selecionados diferem (fica como está)
  const autoTxt = tr(lang, 'Auto', 'Automático', 'Automático');
  const spText = (v: number | 'auto' | null | undefined): string => (v === null || v === undefined ? '' : v === 'auto' ? autoTxt : formatMeasure(v, 'pt', lang));
  const before = el('input', { type: 'text', name: 'before', inputMode: 'decimal', style: 'width:96px', value: spText(lay ? lay.before : (p.spaceBeforeTwips as number | undefined) ?? 0) });
  const after = el('input', { type: 'text', name: 'after', inputMode: 'decimal', style: 'width:96px', value: spText(lay ? lay.after : (p.spaceAfterTwips as number | undefined) ?? 0) });
  const spStart = { before: before.value, after: after.value };
  const dec = tr(lang, '.', ',', ',');
  const line = select('line', [['240', `1${dec}0`], ['259', `1${dec}08`], ['276', `1${dec}15`], ['360', `1${dec}5`], ['480', `2${dec}0`]],
    String((p.lineTwentieths as number | undefined) ?? 259));
  const withUnit = (i: HTMLInputElement): HTMLElement => el('span', { style: 'display:flex;gap:4px;align-items:center' }, i, u.name);
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.alignment), align,
    el('span', {}, tr(lang, 'Left indent', 'Recuo à esquerda', 'Sangría izquierda')), withUnit(left),
    el('span', {}, tr(lang, 'Right indent', 'Recuo à direita', 'Sangría derecha')), withUnit(right),
    el('span', {}, L.specialIndent), el('span', { style: 'display:flex;gap:6px;align-items:center' }, special, withUnit(by)),
    el('span', {}, L.before), before, el('span', {}, L.after), after, el('span', {}, L.lineSpacing), line);
  // Quebras de linha e de página: paginação, exceções de formatação e ajuste rígido
  // (valores efetivos; misto = indeterminado e fica como está — getParagraphFlow)
  const flow = typeof env.ed.getParagraphFlow === 'function' ? env.ed.getParagraphFlow() : null;
  const flag = (name: keyof NonNullable<typeof flow>, label: string): HTMLLabelElement => {
    const v = flow?.[name] as boolean | null | undefined;
    const i = el('input', { type: 'checkbox', name, checked: !!v });
    if (v === null) i.indeterminate = true;
    i.addEventListener('change', () => { i.dataset['touched'] = '1'; });
    return el('label', { className: 'uo-check' }, i, label);
  };
  const tight = select('tight', [['none', tr(lang, 'None', 'Nenhum', 'Ninguno')], ['allLines', tr(lang, 'All', 'Todas', 'Todos')],
    ['firstAndLastLine', tr(lang, 'First and last lines', 'Primeira e última linhas', 'Primera y última líneas')], ['firstLineOnly', tr(lang, 'First line only', 'Somente primeira linha', 'Solo primera línea')],
    ['lastLineOnly', tr(lang, 'Last line only', 'Somente última linha', 'Solo última línea')]], flow?.textboxTightWrap ?? '');
  if (!flow?.textboxTightWrap) tight.selectedIndex = -1;
  const breaks = el('div', { style: 'display:flex;flex-direction:column;gap:8px' },
    el('strong', {}, tr(lang, 'Pagination', 'Paginação', 'Paginación')),
    flag('widowControl', tr(lang, 'Widow/Orphan control', 'Controle de linhas órfãs/viúvas', 'Control de líneas viudas y huérfanas')),
    flag('keepNext', tr(lang, 'Keep with next', 'Manter com o próximo', 'Conservar con el siguiente')),
    flag('keepLines', tr(lang, 'Keep lines together', 'Manter linhas juntas', 'Conservar líneas juntas')),
    flag('pageBreakBefore', tr(lang, 'Page break before', 'Quebrar página antes', 'Salto de página anterior')),
    el('strong', { style: 'margin-top:6px' }, tr(lang, 'Formatting exceptions', 'Exceções de formatação', 'Excepciones de formato')),
    flag('suppressLineNumbers', tr(lang, 'Suppress line numbers', 'Suprimir números de linha', 'Suprimir números de línea')),
    flag('suppressAutoHyphens', tr(lang, "Don't hyphenate", 'Não hifenizar', 'No dividir con guiones')),
    el('strong', { style: 'margin-top:6px' }, tr(lang, 'Textbox options', 'Opções de caixa de texto', 'Opciones de cuadro de texto')),
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Tight wrap:', 'Ajuste rígido:', 'Ajuste estrecho:')), tight));
  const tabs = dialogTabs([
    { id: 'indents', label: tr(lang, 'Indents and Spacing', 'Recuos e espaçamento', 'Sangría y espacio'), body: grid },
    { id: 'breaks', label: tr(lang, 'Line and Page Breaks', 'Quebras de linha e de página', 'Líneas y saltos de página'), body: breaks },
  ], tab);
  const h = openDialog({ title: L.paraDlg, body: tabs.el, layer: env.layer, lang, width: 480,
    actions: [{ id: 'tabs', label: tr(lang, 'Tabs…', 'Tabulação…', 'Tabulaciones…') }, { id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  const res = await h.result;
  if (res !== 'ok' && res !== 'tabs') return;
  const ed = env.ed;
  ed.setAlignment(align.value as 'left' | 'center' | 'right' | 'both');
  const nl = parseUnit(left.value, u), nr = parseUnit(right.value, u);
  const nb = special.value === 'none' ? 0 : parseUnit(by.value, u);
  const nf = special.value === 'hanging' ? -Math.abs(nb) : Math.abs(nb);
  const patch: { left?: number; right?: number; firstLine?: number } = {};
  if (Number.isFinite(nl) && nl !== ind.left) patch.left = nl;
  if (Number.isFinite(nr) && nr !== ind.right) patch.right = nr;
  if (Number.isFinite(nf) && nf !== ind.firstLine) patch.firstLine = nf;
  if (Object.keys(patch).length) ed.setParagraphIndents(patch);
  // espaçamento: só o que mudou (o valor vale para todos os parágrafos; igual ao herdado não é gravado)
  const spVal = (s: string): number | 'auto' | null => (s.trim().toLowerCase() === autoTxt.toLowerCase() ? 'auto' : parseMeasure(s, 'pt'));
  const sp: { before?: number | 'auto'; after?: number | 'auto' } = {};
  if (before.value !== spStart.before) { const v = spVal(before.value); if (v !== null) sp.before = v; }
  if (after.value !== spStart.after) { const v = spVal(after.value); if (v !== null) sp.after = v; }
  if (Object.keys(sp).length) {
    if (typeof ed.setParagraphLayout === 'function') ed.setParagraphLayout(sp);
    else {
      if (typeof sp.before === 'number') ed.setSpaceBefore(sp.before);
      if (typeof sp.after === 'number') ed.setSpaceAfter(sp.after);
    }
  }
  ed.setLineSpacing(Number(line.value));
  // quebras de linha e de página: só as caixas que o usuário mexeu
  if (flow && typeof ed.setParagraphFlow === 'function') {
    const f: Parameters<UniversalWriteElement['setParagraphFlow']>[0] = {};
    for (const i of breaks.querySelectorAll<HTMLInputElement>('input[type=checkbox][data-touched]')) (f as Record<string, boolean>)[i.name] = i.checked;
    if (tight.value && tight.value !== (flow.textboxTightWrap ?? '')) f.textboxTightWrap = tight.value as NonNullable<typeof flow.textboxTightWrap>;
    if (Object.keys(f).length) ed.setParagraphFlow(f);
  }
  // Tabulação…: o diálogo de tabulação abre depois de aplicar este, como no Word
  if (res === 'tabs') await tabsDialog(env);
}

/**
 * Tabulação (Parágrafo > Tabulação…, duplo clique numa tabulação da régua):
 * posições do parágrafo, tabulação padrão do documento, alinhamento e
 * preenchimento, Definir, Limpar e Limpar Tudo. Vale para os parágrafos
 * selecionados; o que se grava segue o Word (setTabStops — oráculo nav-lab).
 */
export async function tabsDialog(env: Env): Promise<void> {
  const lang = env.lang, ed = env.ed, L = env.app.ui!.L;
  const u = unitOf(lang);
  const cur = ed.getTabStops();
  type Tab = ReturnType<UniversalWriteElement['getTabStops']>['tabs'][number];
  let tabs: Tab[] = cur.tabs.map((t) => ({ ...t }));
  const cleared: number[] = [];
  const pos = el('input', { type: 'text', name: 'pos', inputMode: 'decimal', style: 'width:100%' });
  pos.setAttribute('aria-label', tr(lang, 'Tab stop position', 'Posição da parada de tabulação', 'Posición de tabulación'));
  const list = el('select', { name: 'list', size: 6, style: 'width:100%;height:132px' });
  const def = unitInput('default', cur.defaultTabTwips, u, lang);
  const clearedEl = el('div', { style: 'font-size:12px;min-height:16px;color:var(--u-color-on-surface-variant,#44474f)' });
  const radios = (name: string, opts: readonly (readonly [string, string])[], value: string): HTMLElement => {
    const box = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:4px 12px' });
    for (const [v, t] of opts) {
      const i = el('input', { type: 'radio', name, value: v, checked: v === value });
      box.append(el('label', { className: 'uo-check' }, i, t));
    }
    return box;
  };
  const alignBox = radios('align', [['left', tr(lang, 'Left', 'Esquerdo', 'Izquierda')], ['center', tr(lang, 'Center', 'Centralizado', 'Centrada')], ['right', tr(lang, 'Right', 'Direito', 'Derecha')],
    ['decimal', tr(lang, 'Decimal', 'Decimal', 'Decimal')], ['bar', tr(lang, 'Bar', 'Barra', 'Barra')]], 'left');
  const leaderBox = radios('leader', [['', tr(lang, '1 None', '1 Nenhum', '1 Ninguno')], ['dot', '2 .......'], ['hyphen', '3 -------'], ['underscore', '4 _______']], '');
  const val = (name: string): string => (alignBox.parentElement?.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value
    ?? body.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '');
  const setRadio = (name: string, v: string): void => {
    for (const i of body.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) i.checked = i.value === v;
  };
  const render = (keep?: number): void => {
    tabs.sort((a, b) => a.pos - b.pos);
    list.replaceChildren(...tabs.map((t) => el('option', { value: String(t.pos), textContent: `${fmtUnit(t.pos, u, lang)} ${u.name}` })));
    if (keep !== undefined) list.value = String(keep);
    clearedEl.textContent = cleared.length ? `${tr(lang, 'Tab stops to be cleared:', 'Tabulações a serem limpas:', 'Tabulaciones que se borrarán:')} ${cleared.map((x) => `${fmtUnit(x, u, lang)} ${u.name}`).join('; ')}` : '';
  };
  list.addEventListener('change', () => {
    const t = tabs.find((x) => String(x.pos) === list.value);
    if (!t) return;
    pos.value = `${fmtUnit(t.pos, u, lang)}`;
    setRadio('align', t.align);
    setRadio('leader', t.leader === 'dot' || t.leader === 'hyphen' || t.leader === 'underscore' ? t.leader : '');
  });
  const setBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Set', 'Definir', 'Fijar') });
  const clrBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Clear', 'Limpar', 'Borrar') });
  const allBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Clear All', 'Limpar Tudo', 'Borrar todo') });
  const define = (): boolean => {
    const p = parseUnit(pos.value, u);
    if (!Number.isFinite(p)) return false;
    tabs = tabs.filter((t) => t.pos !== p);
    const lead = val('leader');
    tabs.push({ pos: p, align: (val('align') || 'left') as Tab['align'], ...(lead ? { leader: lead as Tab['leader'] } : {}) });
    const ci = cleared.indexOf(p);
    if (ci >= 0) cleared.splice(ci, 1);
    render(p);
    return true;
  };
  setBtn.addEventListener('click', () => { define(); pos.focus(); pos.select(); });
  clrBtn.addEventListener('click', () => {
    const p = list.value ? Number(list.value) : parseUnit(pos.value, u);
    if (!Number.isFinite(p) || !tabs.some((t) => t.pos === p)) return;
    tabs = tabs.filter((t) => t.pos !== p);
    cleared.push(p);
    pos.value = '';
    render();
  });
  allBtn.addEventListener('click', () => { cleared.push(...tabs.map((t) => t.pos)); tabs = []; pos.value = ''; render(); });
  pos.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); define(); } });
  const left = el('div', { style: 'display:flex;flex-direction:column;gap:6px;min-width:150px;flex:1 1 0' },
    el('span', {}, tr(lang, 'Tab stop position:', 'Posição da parada de tabulação:', 'Posición de tabulación:')), pos, list);
  const right = el('div', { style: 'display:flex;flex-direction:column;gap:6px;flex:1 1 0' },
    el('span', {}, tr(lang, 'Default tab stops:', 'Paradas de tabulação padrão:', 'Tabulaciones predeterminadas:')), el('span', { style: 'display:flex;gap:4px;align-items:center' }, def, u.name),
    clearedEl);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    el('div', { style: 'display:flex;gap:16px' }, left, right),
    el('strong', {}, tr(lang, 'Alignment', 'Alinhamento', 'Alineación')), alignBox,
    el('strong', {}, tr(lang, 'Leader', 'Preenchimento', 'Relleno')), leaderBox,
    el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, setBtn, clrBtn, allBtn));
  render();
  if (tabs[0]) { list.value = String(tabs[0].pos); list.dispatchEvent(new Event('change')); }
  const h = openDialog({ title: tr(lang, 'Tabs', 'Tabulação', 'Tabulaciones'), body, layer: env.layer, lang, width: 460,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  setTimeout(() => pos.focus(), 0);
  if ((await h.result) !== 'ok') return;
  // posição digitada sem "Definir": o Word define ao dar OK
  if (pos.value && !tabs.some((t) => t.pos === parseUnit(pos.value, u))) define();
  const d = parseUnit(def.value, u);
  if (Number.isFinite(d) && d > 0 && d !== cur.defaultTabTwips) ed.setDefaultTabStop(d);
  const same = JSON.stringify(tabs) === JSON.stringify(cur.tabs.map((t) => ({ ...t })).sort((a, b) => a.pos - b.pos));
  if (!same) ed.setTabStops(tabs);
}

/** "Aplicar a" dos diálogos de página e colunas (texto selecionado só com seleção). */
const applyToSelect = (lang: UiLang, hasSel: boolean, value: SectionApplyTo): HTMLSelectElement => select('applyTo', [
  ['section', tr(lang, 'This section', 'Esta seção', 'Esta sección')],
  ['forward', tr(lang, 'This point forward', 'Deste ponto em diante', 'De aquí en adelante')],
  ['document', tr(lang, 'Whole document', 'No documento inteiro', 'Todo el documento')],
  ...(hasSel ? [['selection', tr(lang, 'Selected text', 'Texto selecionado', 'Texto seleccionado')] as const] : []),
], value);

/**
 * Configurar Página com as guias do Word: Margens (margens, orientação), Papel
 * (tamanho) e Layout (início da seção, cabeçalhos e rodapés, alinhamento vertical,
 * Números de Linha…, Bordas…); "Aplicar a" vale para as três. As opções de seção
 * vão num passo só (setPageSetup); as de cabeçalho/rodapé pelos métodos delas.
 */
export async function pageDialog(env: Env, tab: 'margins' | 'paper' | 'layout' = 'margins'): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang, ed = env.ed;
  const u = unitOf(lang);
  const orient = select('orientation', [['portrait', tr(lang, 'Portrait', 'Retrato', 'Vertical')], ['landscape', tr(lang, 'Landscape', 'Paisagem', 'Horizontal')]], 'portrait');
  const size = select('size', [['A4', 'A4'], ['Letter', tr(lang, 'Letter', 'Carta', 'Carta')]], 'A4');
  const margins = select('margins', [['normal', 'Normal'], ['narrow', tr(lang, 'Narrow', 'Estreita', 'Estrecho')], ['wide', tr(lang, 'Wide', 'Larga', 'Ancho')], ['custom', tr(lang, 'Custom', 'Personalizadas', 'Personalizados')]], 'normal');
  // estado atual pela seção do cursor; margens pelo preset mais próximo
  const s = ed.getSection();
  const cm = s ? { ...s.margins } : { top: 1417, right: 1701, bottom: 1417, left: 1701 };
  if (s) {
    orient.value = s.orientation;
    size.value = Math.abs(Math.min(s.pageWidthTwips, s.pageHeightTwips) - 12240) < 60 ? 'Letter' : 'A4';
    const m = s.orientation === 'landscape' ? s.margins.top : s.margins.left;
    margins.value = m < 1000 ? 'narrow' : m > 2200 ? 'wide' : 'normal';
  }
  // margens numéricas (a régua abre este diálogo com duplo clique na margem)
  const mt = unitInput('mtop', cm.top, u, lang), mb = unitInput('mbottom', cm.bottom, u, lang);
  const ml = unitInput('mleft', cm.left, u, lang), mr = unitInput('mright', cm.right, u, lang);
  const marginInputs = [mt, mb, ml, mr];
  for (const i of marginInputs) i.addEventListener('input', () => { margins.value = 'custom'; });
  const start = { orientation: orient.value, size: size.value, margins: margins.value };
  const applyTo = applyToSelect(lang, ed.selectedText().length > 0, 'section');
  const withUnit = (i: HTMLInputElement): HTMLElement => el('span', { style: 'display:flex;gap:4px;align-items:center' }, i, u.name);
  const marginsTab = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.margins), margins,
    el('span', {}, tr(lang, 'Top', 'Superior', 'Superior')), withUnit(mt), el('span', {}, tr(lang, 'Bottom', 'Inferior', 'Inferior')), withUnit(mb),
    el('span', {}, tr(lang, 'Left', 'Esquerda', 'Izquierda')), withUnit(ml), el('span', {}, tr(lang, 'Right', 'Direita', 'Derecha')), withUnit(mr),
    el('span', {}, L.orientation), orient);
  const paperTab = el('div', { className: 'uo-dialog-grid' }, el('span', {}, L.paper), size);
  // Layout: início da seção, cabeçalhos e rodapés, alinhamento vertical, números de linha, bordas
  const startType = s?.type ?? 'nextPage';
  const sectStart = select('sectionStart', [['continuous', tr(lang, 'Continuous', 'Contínuo', 'Continua')], ['nextColumn', tr(lang, 'New column', 'Nova coluna', 'Nueva columna')],
    ['nextPage', tr(lang, 'New page', 'Nova página', 'Nueva página')], ['evenPage', tr(lang, 'Even page', 'Página par', 'Página par')], ['oddPage', tr(lang, 'Odd page', 'Página ímpar', 'Página impar')]], startType);
  const hf = typeof ed.getHeaderFooterOptions === 'function' ? ed.getHeaderFooterOptions() : null;
  const oddEven = check('oddEven', tr(lang, 'Different odd and even', 'Diferentes em páginas pares e ímpares', 'Pares e impares diferentes'), !!hf?.differentOddEven);
  const firstPage = check('firstPage', tr(lang, 'Different first page', 'Diferente na primeira página', 'Primera página diferente'), !!hf?.differentFirstPage);
  const hdr = unitInput('header', hf?.headerDistance ?? 708, u, lang), ftr = unitInput('footer', hf?.footerDistance ?? 708, u, lang);
  const hfStart = { header: hdr.value, footer: ftr.value };
  const vStart = s?.verticalAlignment ?? 'top';
  const valign = select('valign', [['top', tr(lang, 'Top', 'Superior', 'Superior')], ['center', tr(lang, 'Center', 'Centralizado', 'Centrada')],
    ['both', tr(lang, 'Justified', 'Justificado', 'Justificada')], ['bottom', tr(lang, 'Bottom', 'Inferior', 'Inferior')]], vStart);
  const lnInfo = s?.lineNumbering;
  let lnOpts: LineNumberingOptions = {
    on: !!lnInfo && lnInfo.mode !== 'none', startAt: lnInfo?.startAt ?? 1, countBy: lnInfo?.countBy ?? 1, distanceTwips: lnInfo?.distanceTwips ?? 0,
    restart: lnInfo?.mode === 'continuous' ? 'continuous' : lnInfo?.mode === 'section' ? 'section' : 'page',
  };
  let lnChanged = false;
  const lnBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Line Numbers…', 'Números de Linha…', 'Números de línea…') });
  lnBtn.addEventListener('click', () => { void lineNumbersDialog(env, lnOpts).then((r) => { if (r) { lnOpts = r; lnChanged = true; } }); });
  const bordersBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Borders…', 'Bordas…', 'Bordes…') });
  bordersBtn.addEventListener('click', () => { void tableDialog(env, 'pageBorders'); });
  const layoutTab = el('div', { style: 'display:flex;flex-direction:column;gap:10px' },
    el('strong', {}, tr(lang, 'Section', 'Seção', 'Sección')),
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Section start:', 'Início da seção:', 'Empezar sección:')), sectStart),
    el('strong', {}, tr(lang, 'Headers and footers', 'Cabeçalhos e rodapés', 'Encabezados y pies de página')),
    oddEven, firstPage,
    el('div', { className: 'uo-dialog-grid' },
      el('span', {}, tr(lang, 'From edge: Header:', 'Da borda: Cabeçalho:', 'Desde el borde: Encabezado:')), withUnit(hdr),
      el('span', {}, tr(lang, 'Footer:', 'Rodapé:', 'Pie de página:')), withUnit(ftr)),
    el('strong', {}, tr(lang, 'Page', 'Página', 'Página')),
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Vertical alignment:', 'Alinhamento vertical:', 'Alineación vertical:')), valign),
    el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, lnBtn, bordersBtn));
  // sem as opções de cabeçalho/rodapé (API ausente) os campos ficam desabilitados
  for (const i of [hdr, ftr]) i.disabled = !hf;
  oddEven.querySelector('input')!.disabled = firstPage.querySelector('input')!.disabled = !hf;
  const tabs = dialogTabs([
    { id: 'margins', label: tr(lang, 'Margins', 'Margens', 'Márgenes'), body: marginsTab },
    { id: 'paper', label: tr(lang, 'Paper', 'Papel', 'Papel'), body: paperTab },
    { id: 'layout', label: tr(lang, 'Layout', 'Layout', 'Diseño'), body: layoutTab },
  ], tab);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' }, tabs.el,
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Apply to', 'Aplicar a', 'Aplicar a')), applyTo));
  const h = openDialog({ title: L.pageDlg, body, layer: env.layer, lang, width: 480,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  // na seção do cursor só o que mudou; fora dela (deste ponto, documento, seleção) tudo vale
  const all = applyTo.value !== 'section';
  const custom = margins.value === 'custom'
    ? { top: parseUnit(mt.value, u), bottom: parseUnit(mb.value, u), left: parseUnit(ml.value, u), right: parseUnit(mr.value, u) }
    : null;
  const customOk = !!custom && Object.values(custom).every((v) => Number.isFinite(v) && v >= 0);
  ed.setPageSetup({
    ...(all || orient.value !== start.orientation ? { orientation: orient.value as 'portrait' | 'landscape' } : {}),
    ...(all || size.value !== start.size ? { size: size.value as 'A4' | 'Letter' } : {}),
    ...(customOk ? { customMargins: custom! } : all || margins.value !== start.margins ? { margins: margins.value as 'normal' | 'narrow' | 'wide' } : {}),
    ...(all || sectStart.value !== startType ? { sectionStart: sectStart.value as SectionType } : {}),
    ...(all || valign.value !== vStart ? { verticalAlignment: valign.value as 'top' | 'center' | 'both' | 'bottom' } : {}),
    ...(all || lnChanged ? { lineNumbering: lnOpts } : {}),
    applyTo: applyTo.value as SectionApplyTo,
  });
  // cabeçalhos e rodapés (os métodos da frente Cabeçalho e rodapé)
  if (hf) {
    const oe = oddEven.querySelector('input')!.checked, fp = firstPage.querySelector('input')!.checked;
    if (oe !== hf.differentOddEven) ed.setDifferentOddEven(oe);
    if (fp !== hf.differentFirstPage) ed.setDifferentFirstPage(fp);
    const hd = hdr.value !== hfStart.header ? parseUnit(hdr.value, u) : NaN, fd = ftr.value !== hfStart.footer ? parseUnit(ftr.value, u) : NaN;
    if (Number.isFinite(hd) || Number.isFinite(fd)) ed.setHeaderFooterDistance({ ...(Number.isFinite(hd) ? { header: hd } : {}), ...(Number.isFinite(fd) ? { footer: fd } : {}) });
  }
}

/**
 * Mais Colunas: predefinições, número, largura e espaçamento de cada coluna,
 * mesma largura, linha entre colunas, "Aplicar a" e iniciar nova coluna (com
 * "deste ponto em diante" a seção nova começa na próxima coluna). Medidas em
 * cm (pt) ou polegadas (en), como a régua.
 */
export async function columnsDialog(env: Env): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const s = ed.getSection();
  if (!s) return;
  const W = s.columns.contentWidthTwips;
  const unit = lang !== 'en' ? { tw: 1440 / 2.54, name: 'cm', step: '0.01' } : { tw: 1440, name: '"', step: '0.01' };
  const fmt = (tw: number): string => String(Math.round((tw / unit.tw) * 100) / 100);
  const parse = (v: string): number => Math.round(parseFloat(v.replace(',', '.')) * unit.tw);
  const MIN = 720;
  const st = {
    count: s.columns.count, equal: s.columns.equalWidth, sep: s.columns.sep,
    widths: s.columns.widths.map((w) => ({ ...w })),
    space: s.columns.count > 1 ? s.columns.spaceTwips : 708,
  };
  /** colunas iguais com o espaço pedido (o espaço encolhe se a largura passaria do mínimo) */
  const equalize = (): void => {
    const n = st.count;
    if ((W - st.space * (n - 1)) / n < MIN) st.space = n > 1 ? Math.max(0, Math.floor((W - n * MIN) / (n - 1))) : st.space;
    const w = Math.round((W - st.space * (n - 1)) / n);
    st.widths = Array.from({ length: n }, (_, i) => ({ widthTwips: w, spaceTwips: i < n - 1 ? st.space : 0 }));
  };
  const presets = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
  const PRESETS = [['one', 'One', 'Uma', 'Una', 1], ['two', 'Two', 'Duas', 'Dos', 2], ['three', 'Three', 'Três', 'Tres', 3], ['left', 'Left', 'Esquerda', 'Izquierda', 2], ['right', 'Right', 'Direita', 'Derecha', 2]] as const;
  const presetBtns = PRESETS.map(([id, en, pt, es, n]) => {
    const b = el('button', { type: 'button', textContent: tr(lang, en, pt, es), style: 'min-width:72px;padding:6px 10px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit' });
    b.addEventListener('click', () => {
      st.count = n;
      if (id === 'left' || id === 'right') {
        const narrow = Math.round((W - 2 * st.space) / 3), wide = W - narrow - st.space;
        const ws = id === 'left' ? [narrow, wide] : [wide, narrow];
        st.equal = false;
        st.widths = ws.map((w, i) => ({ widthTwips: w, spaceTwips: i === 0 ? st.space : 0 }));
      } else { st.equal = true; equalize(); }
      render();
    });
    presets.append(b);
    return [id, b] as const;
  });
  const count = el('input', { type: 'number', name: 'count', min: '1', max: String(s.columns.max), step: '1', value: String(st.count), style: 'width:72px' });
  const sep = check('sep', tr(lang, 'Line between', 'Linha entre colunas', 'Línea entre columnas'), st.sep);
  const equal = check('equal', tr(lang, 'Equal column width', 'Colunas de mesma largura', 'Columnas de igual ancho'), st.equal);
  const rows = el('div', { style: 'display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 10px;align-items:center' });
  const applyTo = applyToSelect(lang, ed.selectedText().length > 0, 'section');
  const newCol = check('newCol', tr(lang, 'Start new column', 'Iniciar nova coluna', 'Empezar columna nueva'), false);
  const preview = el('div', { style: 'display:flex;height:84px;border:1px solid var(--uo-border, #c7c7c7);border-radius:6px;padding:8px;box-sizing:border-box;gap:0' });
  const box = (k: string): HTMLInputElement => (k === 'sep' ? sep : k === 'equal' ? equal : newCol).querySelector('input')!;

  function render(): void {
    count.value = String(st.count);
    box('equal').checked = st.equal;
    box('equal').disabled = st.count < 2;
    box('sep').disabled = st.count < 2;
    box('newCol').disabled = applyTo.value !== 'forward';
    if (box('newCol').disabled) box('newCol').checked = false;
    for (const [id, b] of presetBtns) {
      const on = id === 'one' ? st.count === 1
        : id === 'two' || id === 'three' ? st.equal && st.count === (id === 'two' ? 2 : 3)
        : !st.equal && st.count === 2 && Math.abs(st.widths[0]!.widthTwips - st.widths[1]!.widthTwips) > 40
          && (id === 'left') === (st.widths[0]!.widthTwips < st.widths[1]!.widthTwips);
      b.style.background = on ? 'var(--uo-accent-soft, rgba(26,115,232,.14))' : 'transparent';
      b.setAttribute('aria-pressed', String(on));
    }
    rows.replaceChildren(el('strong', {}, '#'), el('strong', {}, tr(lang, 'Width', 'Largura', 'Ancho')), el('strong', {}, tr(lang, 'Spacing', 'Espaçamento', 'Espaciado')));
    st.widths.slice(0, Math.max(1, st.count)).forEach((c, i) => {
      const last = i === st.count - 1;
      const wIn = el('input', { type: 'number', step: unit.step, min: '0', value: fmt(c.widthTwips), disabled: st.count < 2 || (st.equal && i > 0), style: 'width:96px' });
      const sIn = el('input', { type: 'number', step: unit.step, min: '0', value: last ? '' : fmt(c.spaceTwips), disabled: last || st.count < 2 || (st.equal && i > 0), style: 'width:96px' });
      wIn.setAttribute('aria-label', `${tr(lang, 'Width', 'Largura', 'Ancho')} ${i + 1}`);
      sIn.setAttribute('aria-label', `${tr(lang, 'Spacing', 'Espaçamento', 'Espaciado')} ${i + 1}`);
      wIn.addEventListener('change', () => setWidth(i, parse(wIn.value)));
      sIn.addEventListener('change', () => setSpace(i, parse(sIn.value)));
      rows.append(el('span', {}, `${i + 1}:`), el('span', { style: 'display:flex;gap:4px;align-items:center' }, wIn, unit.name), el('span', { style: 'display:flex;gap:4px;align-items:center' }, sIn, last ? '' : unit.name));
    });
    preview.replaceChildren(...st.widths.slice(0, Math.max(1, st.count)).flatMap((c, i) => {
      const col = el('div', { style: `flex:${c.widthTwips} 0 0;background:repeating-linear-gradient(to bottom, currentColor 0 2px, transparent 2px 7px);opacity:.45` });
      if (i === st.count - 1) return [col];
      const gap = el('div', { style: `flex:${Math.max(1, c.spaceTwips)} 0 0;display:flex;justify-content:center` });
      if (box('sep').checked) gap.append(el('div', { style: 'width:1px;background:currentColor' }));
      return [col, gap];
    }));
  }
  /** mesma largura: largura ⇄ espaço; desiguais: a coluna seguinte (ou a anterior) compensa */
  function setWidth(i: number, w: number): void {
    if (!(w > 0)) { render(); return; }
    if (st.equal) {
      const n = st.count;
      const ww = Math.max(MIN, Math.min(w, Math.floor(W / n)));
      st.space = n > 1 ? Math.max(0, Math.floor((W - n * ww) / (n - 1))) : 0;
      st.widths = st.widths.map((c, k) => ({ widthTwips: ww, spaceTwips: k < n - 1 ? st.space : 0 }));
    } else {
      const j = i < st.count - 1 ? i + 1 : i - 1;
      const total = st.widths[i]!.widthTwips + st.widths[j]!.widthTwips;
      const ww = Math.max(MIN, Math.min(w, total - MIN));
      st.widths[i]!.widthTwips = ww;
      st.widths[j]!.widthTwips = total - ww;
    }
    render();
  }
  function setSpace(i: number, sp: number): void {
    if (!(sp >= 0)) { render(); return; }
    if (st.equal) {
      const n = st.count;
      st.space = Math.min(sp, Math.floor((W - n * MIN) / Math.max(1, n - 1)));
      equalize();
    } else {
      const j = i + 1;
      const total = st.widths[i]!.spaceTwips + st.widths[j]!.widthTwips;
      const ss = Math.max(0, Math.min(sp, total - MIN));
      st.widths[i]!.spaceTwips = ss;
      st.widths[j]!.widthTwips = total - ss;
    }
    render();
  }
  count.addEventListener('change', () => {
    const n = Math.max(1, Math.min(s.columns.max, Math.round(Number(count.value) || 1)));
    st.count = n;
    if (n < 2) st.equal = true;
    if (st.equal || st.widths.length !== n) { st.equal = true; equalize(); }
    render();
  });
  box('equal').addEventListener('change', () => {
    st.equal = box('equal').checked;
    if (st.equal) { st.space = st.widths[0]?.spaceTwips || st.space; equalize(); }
    render();
  });
  box('sep').addEventListener('change', () => { st.sep = box('sep').checked; render(); });
  applyTo.addEventListener('change', render);
  if (st.count < 2) { st.count = 1; equalize(); }
  render();

  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    el('strong', {}, tr(lang, 'Presets', 'Predefinições', 'Preestablecidas')), presets,
    el('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap' },
      el('label', { style: 'display:flex;gap:8px;align-items:center' }, tr(lang, 'Number of columns', 'Número de colunas', 'Número de columnas'), count), sep),
    el('strong', {}, tr(lang, 'Width and spacing', 'Largura e espaçamento', 'Ancho y espaciado')), rows, equal,
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Apply to', 'Aplicar a', 'Aplicar a')), applyTo), newCol,
    el('strong', {}, tr(lang, 'Preview', 'Visualização', 'Vista previa')), preview);
  const h = openDialog({ title: tr(lang, 'Columns', 'Colunas', 'Columnas'), icon: 'view_column_2', body, layer: env.layer, lang, width: 460,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: env.app.ui!.L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  ed.setColumns({
    count: st.count,
    spaceTwips: st.space,
    ...(st.equal || st.count < 2 ? {} : { widths: st.widths.slice(0, st.count) }),
    sep: st.sep,
    applyTo: applyTo.value as SectionApplyTo,
    startNewColumn: box('newCol').checked,
  });
}

export function wordCountDialog(env: Env): void {
  const L = env.app.ui!.L;
  const s = env.ed.stats();
  const fmt = (n: number): string => n.toLocaleString(uiLocale(env.lang));
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.pages), el('strong', {}, fmt(s.pages)),
    el('span', {}, L.words), el('strong', {}, fmt(s.words)),
    el('span', {}, L.chars), el('strong', {}, fmt(s.chars)));
  openDialog({ title: L.wordCountTitle, body: grid, layer: env.layer, lang: env.lang, width: 320 });
}

const SHORTCUTS: [string, string, string, string][] = [
  ['Ctrl+O', 'Open', 'Abrir', 'Abrir'], ['Ctrl+S', 'Save', 'Salvar', 'Guardar'], ['Ctrl+Shift+S', 'Save as', 'Salvar como', 'Guardar como'],
  ['Ctrl+P', 'Print', 'Imprimir', 'Imprimir'], ['Ctrl+Z / Ctrl+Y', 'Undo / Redo', 'Desfazer / Refazer', 'Deshacer / Rehacer'],
  ['Ctrl+X / C / V', 'Cut / Copy / Paste', 'Recortar / Copiar / Colar', 'Cortar / Copiar / Pegar'], ['Ctrl+Shift+V', 'Paste without formatting', 'Colar sem formatação', 'Pegar sin formato'],
  ['Ctrl+F / Ctrl+H', 'Find / Replace', 'Localizar / Substituir', 'Buscar / Reemplazar'], ['Ctrl+B / I / U', 'Bold / Italic / Underline', 'Negrito / Itálico / Sublinhado', 'Negrita / Cursiva / Subrayado'],
  ['Ctrl+L / E / R / J', 'Align left / center / right / justify', 'Alinhar à esquerda / centralizar / à direita / justificar', 'Alinear a la izquierda / centrar / a la derecha / justificar'],
  ['Ctrl+] / Ctrl+[', 'Increase / decrease font size', 'Aumentar / diminuir fonte', 'Aumentar / disminuir tamaño de fuente'], ['Ctrl+K', 'Insert link', 'Inserir link', 'Insertar vínculo'],
  ['Ctrl+Alt+M', 'New comment', 'Novo comentário', 'Nuevo comentario'], ['Ctrl+Enter', 'Page break', 'Quebra de página', 'Salto de página'],
  ['Ctrl+Shift+Enter', 'Column break', 'Quebra de coluna', 'Salto de columna'],
  ['Ctrl+D', 'Font dialog', 'Diálogo Fonte', 'Cuadro de diálogo Fuente'], ['Ctrl+Shift+8', 'Formatting marks', 'Marcas de formatação', 'Marcas de formato'],
  ['Ctrl+scroll', 'Zoom', 'Zoom', 'Zoom'],
];

export function shortcutsDialog(env: Env): void {
  const grid = el('div', { className: 'uo-dialog-grid' });
  grid.style.gridTemplateColumns = 'auto 1fr';
  for (const [k, en, pt, es] of SHORTCUTS) {
    grid.append(el('kbd', { style: 'font:inherit;font-size:12.5px;font-weight:600;white-space:nowrap' }, k), el('span', {}, tr(env.lang, en, pt, es)));
  }
  openDialog({ title: env.app.ui!.L.shortcutsTitle, body: grid, layer: env.layer, lang: env.lang, width: 520 });
}

export function aboutDialog(env: Env): void {
  const L = env.app.ui!.L;
  openDialog({ title: L.aboutTitle, icon: 'info', body: L.aboutText, layer: env.layer, lang: env.lang, width: 400 });
}

export type DialogEnv = Env;

/**
 * Ortografia (F7), como o painel do Word: percorre as palavras erradas a partir
 * do cursor (dá a volta no documento), com as sugestões do Hunspell. Não modal:
 * o documento continua editável enquanto ele está aberto.
 */
export async function spellingDialog(env: Env): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const done = tr(lang, 'The spelling check is complete.', 'A verificação ortográfica foi concluída.', 'La revisión ortográfica ha finalizado.');
  const skip = new Set<string>();
  const always = new Map<string, string>();
  let cur = await ed.nextMisspelling(skip);
  if (!cur) { env.app.ui!.flash(done); return; }
  const word = el('div', { style: 'font-size:18px;font-weight:600;color:#e81123;margin-bottom:2px' });
  const info = el('div', { style: 'opacity:.7;font-size:12px;margin-bottom:10px' });
  const list = el('select', { size: 6, style: 'width:100%;box-sizing:border-box;height:auto;min-height:132px;padding:4px' });
  const show = async (m: NonNullable<typeof cur>): Promise<void> => {
    word.textContent = m.word;
    info.textContent = tr(lang, `Not in dictionary (${m.lang})`, `Não consta no dicionário (${m.lang})`, `No está en el diccionario (${m.lang})`);
    const sug = await ed.spellingSuggestions(m, 8);
    list.replaceChildren(...(sug.length ? sug.map((x) => el('option', { value: x, textContent: x }))
      : [el('option', { value: '', disabled: true, textContent: tr(lang, '(no suggestions)', '(sem sugestões)', '(sin sugerencias)') })]));
    list.selectedIndex = sug.length ? 0 : -1;
  };
  await show(cur);
  const body = el('div', {}, word, info, el('div', { style: 'font-size:12px;margin-bottom:4px' }, tr(lang, 'Suggestions', 'Sugestões', 'Sugerencias')), list);
  const next = async (): Promise<void> => {
    cur = await ed.nextMisspelling(skip);
    // "Alterar todas": as próximas ocorrências trocam sozinhas
    while (cur && always.has(cur.word)) {
      if (!ed.replaceSpelling(cur, always.get(cur.word)!)) skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      cur = await ed.nextMisspelling(skip);
    }
    if (!cur) { h.close(); env.app.ui!.flash(done); return; }
    await show(cur);
  };
  let busy = false;
  const step = async (id: string): Promise<void> => {
    if (!cur || busy) return;
    busy = true;
    try {
      const choice = list.value;
      if (id === 'ignore') skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      else if (id === 'ignoreAll') ed.ignoreSpelling(cur.word);
      else if (id === 'add') await ed.addToDictionary(cur.word);
      else if (id === 'change' || id === 'changeAll') {
        if (!choice) return;
        if (id === 'changeAll') always.set(cur.word, choice);
        if (!ed.replaceSpelling(cur, choice)) skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      }
      await next();
    } finally { busy = false; }
  };
  list.addEventListener('dblclick', () => { void step('change'); });
  const h = openDialog({
    title: tr(lang, 'Spelling', 'Ortografia', 'Ortografía'), icon: 'spellcheck', body, layer: env.layer, lang, width: 400, modal: false,
    actions: [
      { id: 'ignore', label: { en: 'Ignore Once', pt: 'Ignorar uma vez', es: 'Omitir una vez' } },
      { id: 'ignoreAll', label: { en: 'Ignore All', pt: 'Ignorar tudo', es: 'Omitir todo' } },
      { id: 'add', label: { en: 'Add to Dictionary', pt: 'Adicionar ao dicionário', es: 'Agregar al diccionario' } },
      { id: 'changeAll', label: { en: 'Change All', pt: 'Alterar todas', es: 'Cambiar todas' } },
      { id: 'change', label: { en: 'Change', pt: 'Alterar', es: 'Cambiar' }, primary: true },
    ],
    onAction: (id) => { void step(id); return false; },
  });
  await h.result;
}

// ───────────────────────── notas de rodapé e de fim ─────────────────────────

type NoteKind = 'footnote' | 'endnote';
const radio = (name: string, value: string, label: string, on: boolean): HTMLLabelElement =>
  el('label', { className: 'uo-check' }, el('input', { type: 'radio', name, value, checked: on }), label);

/**
 * Diálogo "Notas de Rodapé e de Fim": local (rodapé: fim da página/abaixo do
 * texto; fim: fim do documento/da seção), colunas da área de notas, formato do
 * número, marca personalizada, início, numeração e a quem se aplica; Converter…
 * Inserir aplica e insere a nota; Aplicar só muda as opções.
 */
export async function notesDialog(env: Env): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const T = (en: string, pt: string, es: string): string => tr(lang, en, pt, es);
  let kind: NoteKind = ed.editingNote()?.kind ?? 'footnote';
  const st = { footnote: ed.getNoteOptions('footnote'), endnote: ed.getNoteOptions('endnote') };
  const fnRadio = radio('kind', 'footnote', T('Footnotes:', 'Notas de rodapé:', 'Notas al pie:'), kind === 'footnote');
  const enRadio = radio('kind', 'endnote', T('Endnotes:', 'Notas de fim:', 'Notas al final:'), kind === 'endnote');
  const fnPos = select('fnPos', [['pageBottom', T('Bottom of page', 'Fim da página', 'Final de página')], ['beneathText', T('Below text', 'Abaixo do texto', 'Debajo del texto')]], st.footnote.position);
  const enPos = select('enPos', [['docEnd', T('End of document', 'Fim do documento', 'Final del documento')], ['sectEnd', T('End of section', 'Fim da seção', 'Final de la sección')]], st.endnote.position);
  const convert = el('button', { type: 'button', className: 'uo-pill', textContent: T('Convert…', 'Converter…', 'Convertir…') });
  const columns = select('columns', [['0', T('Match section layout', 'Coincidir layout de seção', 'Coincidir con diseño de sección')], ['1', T('1 column', '1 coluna', '1 columna')], ['2', T('2 columns', '2 colunas', '2 columnas')], ['3', T('3 columns', '3 colunas', '3 columnas')], ['4', T('4 columns', '4 colunas', '4 columnas')]], String(st.footnote.columns ?? 0));
  const format = select('format', [
    ['decimal', '1, 2, 3, …'], ['lowerLetter', 'a, b, c, …'], ['upperLetter', 'A, B, C, …'],
    ['lowerRoman', 'i, ii, iii, …'], ['upperRoman', 'I, II, III, …'], ['chicago', '*, †, ‡, §, …'],
  ], st[kind].numberFormat);
  const mark = el('input', { type: 'text', name: 'mark', maxLength: 10, style: 'width:72px' });
  mark.setAttribute('aria-label', T('Custom mark', 'Marca personalizada', 'Marca personal'));
  const symbols = el('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' });
  for (const ch of ['*', '†', '‡', '§', '¶', '‖', '#', '※', '¹', '²', '³']) {
    const b = el('button', { type: 'button', className: 'uo-btn', textContent: ch, title: ch, style: 'min-width:28px;font:inherit' });
    b.addEventListener('click', () => { mark.value += ch; mark.focus(); });
    symbols.append(b);
  }
  const startAt = el('input', { type: 'number', name: 'startAt', min: '1', step: '1', value: String(st[kind].startAt), style: 'width:72px' });
  const restart = select('restart', [['continuous', T('Continuous', 'Contínua', 'Continua')], ['eachSect', T('Restart each section', 'Reiniciar a cada seção', 'Reiniciar en cada sección')], ['eachPage', T('Restart each page', 'Reiniciar a cada página', 'Reiniciar en cada página')]], st[kind].restart);
  const scope = select('scope', [['document', T('Whole document', 'Todo o documento', 'Todo el documento')], ['section', T('This section', 'Esta seção', 'Esta sección')]], 'document');

  /** mostra as opções do tipo escolhido (cada tipo guarda as suas) */
  const show = (): void => {
    format.value = st[kind].numberFormat;
    startAt.value = String(st[kind].startAt);
    restart.value = st[kind].restart;
    (restart.querySelector('option[value="eachPage"]') as HTMLOptionElement).disabled = kind === 'endnote';
    columns.disabled = kind !== 'footnote';
    fnPos.disabled = kind !== 'footnote';
    enPos.disabled = kind !== 'endnote';
    // com numeração que reinicia o início é 1 (o Word recusa outro)
    startAt.disabled = restart.value !== 'continuous';
  };
  /** guarda os campos no tipo corrente */
  const keep = (): void => {
    const o = st[kind];
    o.numberFormat = format.value;
    o.restart = restart.value as typeof o.restart;
    o.startAt = o.restart === 'continuous' ? Math.max(1, Math.round(Number(startAt.value) || 1)) : 1;
    st.footnote.position = fnPos.value;
    st.footnote.columns = Number(columns.value);
    st.endnote.position = enPos.value;
  };
  for (const r of [fnRadio, enRadio]) r.querySelector('input')!.addEventListener('change', (e) => { keep(); kind = (e.target as HTMLInputElement).value as NoteKind; show(); });
  restart.addEventListener('change', () => { if (restart.value !== 'continuous') startAt.value = '1'; startAt.disabled = restart.value !== 'continuous'; });
  show();

  const grid = (...rows: [string, ...(Node | string)[]][]): HTMLElement => el('div', { className: 'uo-dialog-grid' }, ...rows.flatMap(([label, ...kids]) => [el('span', {}, label), el('span', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, ...kids)]));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    el('strong', {}, T('Location', 'Local', 'Ubicación')),
    el('div', { className: 'uo-dialog-grid' }, fnRadio, fnPos, enRadio, enPos),
    el('div', {}, convert),
    el('strong', {}, T('Footnote layout', 'Layout de nota de rodapé', 'Diseño de notas al pie')),
    grid([T('Columns:', 'Colunas:', 'Columnas:'), columns]),
    el('strong', {}, T('Format', 'Formato', 'Formato')),
    grid([T('Number format:', 'Formato do número:', 'Formato de número:'), format], [T('Custom mark:', 'Marca personalizada:', 'Marca personal:'), mark], [T('Symbol:', 'Símbolo:', 'Símbolo:'), symbols], [T('Start at:', 'Iniciar em:', 'Iniciar en:'), startAt], [T('Numbering:', 'Numeração:', 'Numeración:'), restart]),
    el('strong', {}, T('Apply changes', 'Aplicar alterações', 'Aplicar cambios')),
    grid([T('Apply changes to:', 'Aplicar alterações a:', 'Aplicar cambios a:'), scope]));
  convert.addEventListener('click', () => { void convertNotesDialog(env); });
  const canInsert = ed.canInsertNote();
  const h = openDialog({ title: T('Footnote and Endnote', 'Notas de Rodapé e de Fim', 'Notas al pie y notas al final'), icon: 'notes', body, layer: env.layer, lang, width: 480,
    actions: [
      ...(canInsert ? [{ id: 'insert', label: T('Insert', 'Inserir', 'Insertar'), primary: true }] : []),
      { id: 'cancel', label: env.app.ui!.L.cancel },
      { id: 'apply', label: env.app.ui!.L.apply, primary: !canInsert },
    ] });
  const res = await h.result;
  if (res !== 'insert' && res !== 'apply') return;
  keep();
  const sc = scope.value as 'section' | 'document';
  // (as opções dos dois tipos valem, como no Word)
  ed.setNoteOptions('footnote', st.footnote, sc);
  ed.setNoteOptions('endnote', st.endnote, sc);
  if (res === 'insert') {
    const m = mark.value.trim();
    if (kind === 'footnote') ed.insertFootnote(m ? { mark: m } : {});
    else ed.insertEndnote(m ? { mark: m } : {});
  }
}

/** Converter Notas: todas as de rodapé em de fim, as de fim em de rodapé ou trocar. */
export async function convertNotesDialog(env: Env): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const T = (en: string, pt: string, es: string): string => tr(lang, en, pt, es);
  const nf = ed.noteCount('footnote'), ne = ed.noteCount('endnote');
  const opts: [string, string, boolean][] = [
    ['toEndnotes', T('Convert all footnotes to endnotes', 'Converter todas as notas de rodapé em notas de fim', 'Convertir todas las notas al pie en notas al final'), nf > 0],
    ['toFootnotes', T('Convert all endnotes to footnotes', 'Converter todas as notas de fim em notas de rodapé', 'Convertir todas las notas al final en notas al pie'), ne > 0],
    ['swap', T('Swap footnotes and endnotes', 'Trocar notas de rodapé e notas de fim', 'Intercambiar notas al pie y notas al final'), nf > 0 && ne > 0],
  ];
  const first = opts.find((o) => o[2])?.[0];
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, ...opts.map(([v, label, on]) => {
    const r = radio('convert', v, label, v === first);
    r.querySelector('input')!.disabled = !on;
    return r;
  }));
  const h = openDialog({ title: T('Convert Notes', 'Converter Notas', 'Convertir notas'), icon: 'autorenew', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok' || !first) return;
  const v = (body.querySelector('input[name="convert"]:checked') as HTMLInputElement | null)?.value;
  if (v) ed.convertNotes(v as 'toEndnotes' | 'toFootnotes' | 'swap');
}

/** Mostrar Notas com os dois tipos no documento: qual área exibir (como o Word). */
export async function showNotesDialog(env: Env): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const T = (en: string, pt: string, es: string): string => tr(lang, en, pt, es);
  if (ed.editingNote() || !ed.noteCount('footnote') || !ed.noteCount('endnote')) { ed.showNotes(); return; }
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px' },
    el('span', {}, T('This document contains both footnotes and endnotes. Which do you want to view?', 'Este documento contém notas de rodapé e notas de fim. Qual área você deseja exibir?', 'Este documento contiene notas al pie y notas al final. ¿Qué área quieres ver?')),
    radio('area', 'footnote', T('View footnote area', 'Exibir área de notas de rodapé', 'Ver área de notas al pie'), true),
    radio('area', 'endnote', T('View endnote area', 'Exibir área de notas de fim', 'Ver área de notas al final'), false));
  const h = openDialog({ title: T('Show Notes', 'Mostrar Notas', 'Mostrar notas'), icon: 'notes', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const v = (body.querySelector('input[name="area"]:checked') as HTMLInputElement | null)?.value as NoteKind | undefined;
  ed.showNotes(v ?? 'footnote');
}
