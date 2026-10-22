// Diálogos das barras do Write (iniciadores da ribbon e itens "…" dos menus):
// Fonte, Parágrafo, Configurar Página, link, comentário, contar palavras,
// atalhos e sobre. Todos sobre o openDialog de @universal-office/ui (<dialog>
// nativo — sem a trava de animação do u-dialog).
import { openDialog, pickLabels, promptDialog, type UiLang } from '@universal-office/ui';
import type { SectionApplyTo, UniversalWriteElement } from './universal-write.js';
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
// textos curtos dos diálogos: tabela { en, pt } escolhida por pickLabels (regra única de i18n)
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

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

export async function fontDialog(env: Env, families: string[]): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang;
  const r = env.state().run;
  const cur = (r.fontAscii as string | undefined) ?? '';
  const fams = cur && !families.includes(cur) ? [cur, ...families] : families;
  const font = select('font', fams.map((f) => [f, f] as const), cur);
  const size = el('input', { type: 'number', name: 'size', min: '1', max: '1638', step: '0.5', value: String(((r.szHalfPt as number | undefined) ?? 22) / 2) });
  const color = el('input', { type: 'color', name: 'color', value: `#${(r.color as string | undefined) && /^[0-9a-f]{6}$/i.test(r.color as string) ? r.color : '000000'}` });
  color.style.cssText = 'width:48px;height:32px;padding:2px;border-radius:8px';
  const spacing = select('spacing', [['0', 'Normal'], ['20', tr(lang, 'Expanded 1 pt', 'Expandido 1 pt')], ['40', tr(lang, 'Expanded 2 pt', 'Expandido 2 pt')],
    ['-10', tr(lang, 'Condensed 0.5 pt', 'Condensado 0,5 pt')], ['-20', tr(lang, 'Condensed 1 pt', 'Condensado 1 pt')]], String((r.charSpacingTwips as number | undefined) ?? 0));
  const flags = {
    bold: [tr(lang, 'Bold', 'Negrito'), !!r.bold], italic: [tr(lang, 'Italic', 'Itálico'), !!r.italic],
    underline: [tr(lang, 'Underline', 'Sublinhado'), !!r.underline], strike: [tr(lang, 'Strikethrough', 'Tachado'), !!r.strike],
    sup: [tr(lang, 'Superscript', 'Sobrescrito'), r.vertAlign === 'superscript'], sub: [tr(lang, 'Subscript', 'Subscrito'), r.vertAlign === 'subscript'],
    allCaps: [tr(lang, 'All caps', 'Todas em maiúsculas'), !!r.allCaps], smallCaps: [tr(lang, 'Small caps', 'Versalete'), !!r.smallCaps],
  } as const;
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.fontDlg), font, el('span', {}, L.size), size, el('span', {}, L.color), color, el('span', {}, L.charSpacing), spacing);
  const fx = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px 16px' });
  for (const [k, [label, on]] of Object.entries(flags)) fx.append(check(k, label, on));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' }, grid, el('strong', {}, L.effects), fx);
  const h = openDialog({ title: L.fontDlg, body, layer: env.layer, lang, width: 440,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  const ed = env.ed;
  const box = (k: string): boolean => (fx.querySelector(`input[name="${k}"]`) as HTMLInputElement).checked;
  if (font.value && font.value !== cur) ed.setFontFamily(font.value);
  const sz = parseFloat(size.value);
  if (sz > 0 && sz * 2 !== r.szHalfPt) ed.setFontSize(sz);
  const hex = color.value.slice(1).toUpperCase();
  if (hex !== ((r.color as string | undefined) ?? '000000').toUpperCase()) ed.setColor(hex);
  for (const k of ['bold', 'italic', 'underline', 'strike', 'allCaps', 'smallCaps'] as const) {
    if (box(k) !== flags[k][1]) ed.toggleRunProp(k);
  }
  if (box('sup') !== flags.sup[1]) ed.toggleVertAlign('superscript');
  else if (box('sub') !== flags.sub[1]) ed.toggleVertAlign('subscript');
  const cs = Number(spacing.value);
  if (cs !== ((r.charSpacingTwips as number | undefined) ?? 0)) ed.setCharSpacing(cs || undefined);
}

/** Unidade das medidas dos diálogos: cm (pt) ou polegadas (en), como a régua. */
const unitOf = (lang: UiLang): { tw: number; name: string; step: string } =>
  lang === 'pt' ? { tw: 1440 / 2.54, name: 'cm', step: '0.01' } : { tw: 1440, name: '"', step: '0.01' };
const fmtUnit = (tw: number, u: { tw: number }, lang: UiLang): string =>
  (Math.round((tw / u.tw) * 100) / 100).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 2 });
/** "2,5", "2.5 cm", '1"' → twips (NaN se não for número) */
const parseUnit = (v: string, u: { tw: number }): number => {
  const n = parseFloat(v.replace(/\s|cm|"|pol|in/gi, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * u.tw) : NaN;
};
const unitInput = (name: string, tw: number, u: { tw: number; step: string }, lang: UiLang, min?: number): HTMLInputElement =>
  el('input', { type: 'text', name, value: fmtUnit(tw, u, lang), inputMode: 'decimal', style: 'width:96px', ...(min !== undefined ? { dataset: { min: String(min) } } as never : {}) });

export async function paragraphDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang;
  const p = env.state().para;
  const u = unitOf(lang);
  const ind = env.ed.getParagraphIndents();
  const align = select('align', [['left', tr(lang, 'Left', 'Esquerda')], ['center', tr(lang, 'Centered', 'Centralizada')],
    ['right', tr(lang, 'Right', 'Direita')], ['both', tr(lang, 'Justified', 'Justificada')]], (p.alignment as string | undefined) ?? 'left');
  // Recuo: esquerdo, direito, especial (primeira linha / deslocamento) e "Por"
  const left = unitInput('left', ind.left, u, lang);
  const right = unitInput('right', ind.right, u, lang);
  const special = select('special', [['none', tr(lang, '(none)', '(nenhum)')], ['firstLine', tr(lang, 'First line', 'Primeira linha')],
    ['hanging', tr(lang, 'Hanging', 'Deslocamento')]], !ind.firstLine ? 'none' : ind.firstLine > 0 ? 'firstLine' : 'hanging');
  const by = unitInput('by', Math.abs(ind.firstLine), u, lang);
  const syncBy = (): void => {
    by.disabled = special.value === 'none';
    if (special.value === 'none') by.value = '';
    else if (!by.value || parseUnit(by.value, u) === 0) by.value = fmtUnit(Math.round(u.tw * (lang === 'pt' ? 1.25 : 0.5)), u, lang);
  };
  special.addEventListener('change', syncBy);
  if (special.value === 'none') { by.value = ''; by.disabled = true; }
  const pt = (tw: number | undefined): string => String(Math.round((tw ?? 0) / 2) / 10);
  const before = el('input', { type: 'number', name: 'before', min: '0', step: '6', value: pt(p.spaceBeforeTwips as number | undefined) });
  const after = el('input', { type: 'number', name: 'after', min: '0', step: '6', value: pt(p.spaceAfterTwips as number | undefined) });
  const dec = tr(lang, '.', ',');
  const line = select('line', [['240', `1${dec}0`], ['259', `1${dec}08`], ['276', `1${dec}15`], ['360', `1${dec}5`], ['480', `2${dec}0`]],
    String((p.lineTwentieths as number | undefined) ?? 259));
  const withUnit = (i: HTMLInputElement): HTMLElement => el('span', { style: 'display:flex;gap:4px;align-items:center' }, i, u.name);
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.alignment), align,
    el('span', {}, tr(lang, 'Left indent', 'Recuo à esquerda')), withUnit(left),
    el('span', {}, tr(lang, 'Right indent', 'Recuo à direita')), withUnit(right),
    el('span', {}, L.specialIndent), el('span', { style: 'display:flex;gap:6px;align-items:center' }, special, withUnit(by)),
    el('span', {}, L.before), before, el('span', {}, L.after), after, el('span', {}, L.lineSpacing), line);
  const h = openDialog({ title: L.paraDlg, body: grid, layer: env.layer, lang, width: 460,
    actions: [{ id: 'tabs', label: tr(lang, 'Tabs…', 'Tabulação…') }, { id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
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
  ed.setSpaceBefore(Math.round(Number(before.value) * 20));
  ed.setSpaceAfter(Math.round(Number(after.value) * 20));
  ed.setLineSpacing(Number(line.value));
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
  pos.setAttribute('aria-label', tr(lang, 'Tab stop position', 'Posição da parada de tabulação'));
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
  const alignBox = radios('align', [['left', tr(lang, 'Left', 'Esquerdo')], ['center', tr(lang, 'Center', 'Centralizado')], ['right', tr(lang, 'Right', 'Direito')],
    ['decimal', tr(lang, 'Decimal', 'Decimal')], ['bar', tr(lang, 'Bar', 'Barra')]], 'left');
  const leaderBox = radios('leader', [['', tr(lang, '1 None', '1 Nenhum')], ['dot', '2 .......'], ['hyphen', '3 -------'], ['underscore', '4 _______']], '');
  const val = (name: string): string => (alignBox.parentElement?.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value
    ?? body.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '');
  const setRadio = (name: string, v: string): void => {
    for (const i of body.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) i.checked = i.value === v;
  };
  const render = (keep?: number): void => {
    tabs.sort((a, b) => a.pos - b.pos);
    list.replaceChildren(...tabs.map((t) => el('option', { value: String(t.pos), textContent: `${fmtUnit(t.pos, u, lang)} ${u.name}` })));
    if (keep !== undefined) list.value = String(keep);
    clearedEl.textContent = cleared.length ? `${tr(lang, 'Tab stops to be cleared:', 'Tabulações a serem limpas:')} ${cleared.map((x) => `${fmtUnit(x, u, lang)} ${u.name}`).join('; ')}` : '';
  };
  list.addEventListener('change', () => {
    const t = tabs.find((x) => String(x.pos) === list.value);
    if (!t) return;
    pos.value = `${fmtUnit(t.pos, u, lang)}`;
    setRadio('align', t.align);
    setRadio('leader', t.leader === 'dot' || t.leader === 'hyphen' || t.leader === 'underscore' ? t.leader : '');
  });
  const setBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Set', 'Definir') });
  const clrBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Clear', 'Limpar') });
  const allBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Clear All', 'Limpar Tudo') });
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
    el('span', {}, tr(lang, 'Tab stop position:', 'Posição da parada de tabulação:')), pos, list);
  const right = el('div', { style: 'display:flex;flex-direction:column;gap:6px;flex:1 1 0' },
    el('span', {}, tr(lang, 'Default tab stops:', 'Paradas de tabulação padrão:')), el('span', { style: 'display:flex;gap:4px;align-items:center' }, def, u.name),
    clearedEl);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    el('div', { style: 'display:flex;gap:16px' }, left, right),
    el('strong', {}, tr(lang, 'Alignment', 'Alinhamento')), alignBox,
    el('strong', {}, tr(lang, 'Leader', 'Preenchimento')), leaderBox,
    el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, setBtn, clrBtn, allBtn));
  render();
  if (tabs[0]) { list.value = String(tabs[0].pos); list.dispatchEvent(new Event('change')); }
  const h = openDialog({ title: tr(lang, 'Tabs', 'Tabulação'), body, layer: env.layer, lang, width: 460,
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
  ['section', tr(lang, 'This section', 'Esta seção')],
  ['forward', tr(lang, 'This point forward', 'Deste ponto em diante')],
  ['document', tr(lang, 'Whole document', 'No documento inteiro')],
  ...(hasSel ? [['selection', tr(lang, 'Selected text', 'Texto selecionado')] as const] : []),
], value);

export async function pageDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang;
  const u = unitOf(lang);
  const orient = select('orientation', [['portrait', tr(lang, 'Portrait', 'Retrato')], ['landscape', tr(lang, 'Landscape', 'Paisagem')]], 'portrait');
  const size = select('size', [['A4', 'A4'], ['Letter', tr(lang, 'Letter', 'Carta')]], 'A4');
  const margins = select('margins', [['normal', 'Normal'], ['narrow', tr(lang, 'Narrow', 'Estreita')], ['wide', tr(lang, 'Wide', 'Larga')], ['custom', tr(lang, 'Custom', 'Personalizadas')]], 'normal');
  // estado atual pela seção do cursor; margens pelo preset mais próximo
  const s = env.ed.getSection();
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
  const applyTo = applyToSelect(lang, env.ed.selectedText().length > 0, 'section');
  const withUnit = (i: HTMLInputElement): HTMLElement => el('span', { style: 'display:flex;gap:4px;align-items:center' }, i, u.name);
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.orientation), orient, el('span', {}, L.paper), size, el('span', {}, L.margins), margins,
    el('span', {}, tr(lang, 'Top', 'Superior')), withUnit(mt), el('span', {}, tr(lang, 'Bottom', 'Inferior')), withUnit(mb),
    el('span', {}, tr(lang, 'Left', 'Esquerda')), withUnit(ml), el('span', {}, tr(lang, 'Right', 'Direita')), withUnit(mr),
    el('span', {}, tr(lang, 'Apply to', 'Aplicar a')), applyTo);
  const h = openDialog({ title: L.pageDlg, body: grid, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  // na seção do cursor só o que mudou; fora dela (deste ponto, documento, seleção) tudo vale
  const all = applyTo.value !== 'section';
  const custom = margins.value === 'custom'
    ? { top: parseUnit(mt.value, u), bottom: parseUnit(mb.value, u), left: parseUnit(ml.value, u), right: parseUnit(mr.value, u) }
    : null;
  const customOk = !!custom && Object.values(custom).every((v) => Number.isFinite(v) && v >= 0);
  env.ed.setPageSetup({
    ...(all || orient.value !== start.orientation ? { orientation: orient.value as 'portrait' | 'landscape' } : {}),
    ...(all || size.value !== start.size ? { size: size.value as 'A4' | 'Letter' } : {}),
    ...(customOk ? { customMargins: custom! } : all || margins.value !== start.margins ? { margins: margins.value as 'normal' | 'narrow' | 'wide' } : {}),
    applyTo: applyTo.value as SectionApplyTo,
  });
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
  const unit = lang === 'pt' ? { tw: 1440 / 2.54, name: 'cm', step: '0.01' } : { tw: 1440, name: '"', step: '0.01' };
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
  const PRESETS = [['one', 'One', 'Uma', 1], ['two', 'Two', 'Duas', 2], ['three', 'Three', 'Três', 3], ['left', 'Left', 'Esquerda', 2], ['right', 'Right', 'Direita', 2]] as const;
  const presetBtns = PRESETS.map(([id, en, pt, n]) => {
    const b = el('button', { type: 'button', textContent: tr(lang, en, pt), style: 'min-width:72px;padding:6px 10px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit' });
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
  const sep = check('sep', tr(lang, 'Line between', 'Linha entre colunas'), st.sep);
  const equal = check('equal', tr(lang, 'Equal column width', 'Colunas de mesma largura'), st.equal);
  const rows = el('div', { style: 'display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 10px;align-items:center' });
  const applyTo = applyToSelect(lang, ed.selectedText().length > 0, 'section');
  const newCol = check('newCol', tr(lang, 'Start new column', 'Iniciar nova coluna'), false);
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
    rows.replaceChildren(el('strong', {}, '#'), el('strong', {}, tr(lang, 'Width', 'Largura')), el('strong', {}, tr(lang, 'Spacing', 'Espaçamento')));
    st.widths.slice(0, Math.max(1, st.count)).forEach((c, i) => {
      const last = i === st.count - 1;
      const wIn = el('input', { type: 'number', step: unit.step, min: '0', value: fmt(c.widthTwips), disabled: st.count < 2 || (st.equal && i > 0), style: 'width:96px' });
      const sIn = el('input', { type: 'number', step: unit.step, min: '0', value: last ? '' : fmt(c.spaceTwips), disabled: last || st.count < 2 || (st.equal && i > 0), style: 'width:96px' });
      wIn.setAttribute('aria-label', `${tr(lang, 'Width', 'Largura')} ${i + 1}`);
      sIn.setAttribute('aria-label', `${tr(lang, 'Spacing', 'Espaçamento')} ${i + 1}`);
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
    el('strong', {}, tr(lang, 'Presets', 'Predefinições')), presets,
    el('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap' },
      el('label', { style: 'display:flex;gap:8px;align-items:center' }, tr(lang, 'Number of columns', 'Número de colunas'), count), sep),
    el('strong', {}, tr(lang, 'Width and spacing', 'Largura e espaçamento')), rows, equal,
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Apply to', 'Aplicar a')), applyTo), newCol,
    el('strong', {}, tr(lang, 'Preview', 'Visualização')), preview);
  const h = openDialog({ title: tr(lang, 'Columns', 'Colunas'), icon: 'view_column_2', body, layer: env.layer, lang, width: 460,
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
  const fmt = (n: number): string => n.toLocaleString(tr(env.lang, 'en-US', 'pt-BR'));
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.pages), el('strong', {}, fmt(s.pages)),
    el('span', {}, L.words), el('strong', {}, fmt(s.words)),
    el('span', {}, L.chars), el('strong', {}, fmt(s.chars)));
  openDialog({ title: L.wordCountTitle, body: grid, layer: env.layer, lang: env.lang, width: 320 });
}

const SHORTCUTS: [string, string, string][] = [
  ['Ctrl+O', 'Open', 'Abrir'], ['Ctrl+S', 'Save', 'Salvar'], ['Ctrl+Shift+S', 'Save as', 'Salvar como'],
  ['Ctrl+P', 'Print', 'Imprimir'], ['Ctrl+Z / Ctrl+Y', 'Undo / Redo', 'Desfazer / Refazer'],
  ['Ctrl+X / C / V', 'Cut / Copy / Paste', 'Recortar / Copiar / Colar'], ['Ctrl+Shift+V', 'Paste without formatting', 'Colar sem formatação'],
  ['Ctrl+F / Ctrl+H', 'Find / Replace', 'Localizar / Substituir'], ['Ctrl+B / I / U', 'Bold / Italic / Underline', 'Negrito / Itálico / Sublinhado'],
  ['Ctrl+L / E / R / J', 'Align left / center / right / justify', 'Alinhar à esquerda / centralizar / à direita / justificar'],
  ['Ctrl+] / Ctrl+[', 'Increase / decrease font size', 'Aumentar / diminuir fonte'], ['Ctrl+K', 'Insert link', 'Inserir link'],
  ['Ctrl+Alt+M', 'New comment', 'Novo comentário'], ['Ctrl+Enter', 'Page break', 'Quebra de página'],
  ['Ctrl+Shift+Enter', 'Column break', 'Quebra de coluna'],
  ['Ctrl+D', 'Font dialog', 'Diálogo Fonte'], ['Ctrl+Shift+8', 'Formatting marks', 'Marcas de formatação'],
  ['Ctrl+scroll', 'Zoom', 'Zoom'],
];

export function shortcutsDialog(env: Env): void {
  const grid = el('div', { className: 'uo-dialog-grid' });
  grid.style.gridTemplateColumns = 'auto 1fr';
  for (const [k, en, pt] of SHORTCUTS) {
    grid.append(el('kbd', { style: 'font:inherit;font-size:12.5px;font-weight:600;white-space:nowrap' }, k), el('span', {}, tr(env.lang, en, pt)));
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
  const done = tr(lang, 'The spelling check is complete.', 'A verificação ortográfica foi concluída.');
  const skip = new Set<string>();
  const always = new Map<string, string>();
  let cur = await ed.nextMisspelling(skip);
  if (!cur) { env.app.ui!.flash(done); return; }
  const word = el('div', { style: 'font-size:18px;font-weight:600;color:#e81123;margin-bottom:2px' });
  const info = el('div', { style: 'opacity:.7;font-size:12px;margin-bottom:10px' });
  const list = el('select', { size: 6, style: 'width:100%;box-sizing:border-box;height:auto;min-height:132px;padding:4px' });
  const show = async (m: NonNullable<typeof cur>): Promise<void> => {
    word.textContent = m.word;
    info.textContent = tr(lang, `Not in dictionary (${m.lang})`, `Não consta no dicionário (${m.lang})`);
    const sug = await ed.spellingSuggestions(m, 8);
    list.replaceChildren(...(sug.length ? sug.map((x) => el('option', { value: x, textContent: x }))
      : [el('option', { value: '', disabled: true, textContent: tr(lang, '(no suggestions)', '(sem sugestões)') })]));
    list.selectedIndex = sug.length ? 0 : -1;
  };
  await show(cur);
  const body = el('div', {}, word, info, el('div', { style: 'font-size:12px;margin-bottom:4px' }, tr(lang, 'Suggestions', 'Sugestões')), list);
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
    title: tr(lang, 'Spelling', 'Ortografia'), icon: 'spellcheck', body, layer: env.layer, lang, width: 400, modal: false,
    actions: [
      { id: 'ignore', label: { en: 'Ignore Once', pt: 'Ignorar uma vez' } },
      { id: 'ignoreAll', label: { en: 'Ignore All', pt: 'Ignorar tudo' } },
      { id: 'add', label: { en: 'Add to Dictionary', pt: 'Adicionar ao dicionário' } },
      { id: 'changeAll', label: { en: 'Change All', pt: 'Alterar todas' } },
      { id: 'change', label: { en: 'Change', pt: 'Alterar' }, primary: true },
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
  const T = (en: string, pt: string): string => tr(lang, en, pt);
  let kind: NoteKind = ed.editingNote()?.kind ?? 'footnote';
  const st = { footnote: ed.getNoteOptions('footnote'), endnote: ed.getNoteOptions('endnote') };
  const fnRadio = radio('kind', 'footnote', T('Footnotes:', 'Notas de rodapé:'), kind === 'footnote');
  const enRadio = radio('kind', 'endnote', T('Endnotes:', 'Notas de fim:'), kind === 'endnote');
  const fnPos = select('fnPos', [['pageBottom', T('Bottom of page', 'Fim da página')], ['beneathText', T('Below text', 'Abaixo do texto')]], st.footnote.position);
  const enPos = select('enPos', [['docEnd', T('End of document', 'Fim do documento')], ['sectEnd', T('End of section', 'Fim da seção')]], st.endnote.position);
  const convert = el('button', { type: 'button', className: 'uo-pill', textContent: T('Convert…', 'Converter…') });
  const columns = select('columns', [['0', T('Match section layout', 'Coincidir layout de seção')], ['1', T('1 column', '1 coluna')], ['2', T('2 columns', '2 colunas')], ['3', T('3 columns', '3 colunas')], ['4', T('4 columns', '4 colunas')]], String(st.footnote.columns ?? 0));
  const format = select('format', [
    ['decimal', '1, 2, 3, …'], ['lowerLetter', 'a, b, c, …'], ['upperLetter', 'A, B, C, …'],
    ['lowerRoman', 'i, ii, iii, …'], ['upperRoman', 'I, II, III, …'], ['chicago', '*, †, ‡, §, …'],
  ], st[kind].numberFormat);
  const mark = el('input', { type: 'text', name: 'mark', maxLength: 10, style: 'width:72px' });
  mark.setAttribute('aria-label', T('Custom mark', 'Marca personalizada'));
  const symbols = el('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' });
  for (const ch of ['*', '†', '‡', '§', '¶', '‖', '#', '※', '¹', '²', '³']) {
    const b = el('button', { type: 'button', className: 'uo-btn', textContent: ch, title: ch, style: 'min-width:28px;font:inherit' });
    b.addEventListener('click', () => { mark.value += ch; mark.focus(); });
    symbols.append(b);
  }
  const startAt = el('input', { type: 'number', name: 'startAt', min: '1', step: '1', value: String(st[kind].startAt), style: 'width:72px' });
  const restart = select('restart', [['continuous', T('Continuous', 'Contínua')], ['eachSect', T('Restart each section', 'Reiniciar a cada seção')], ['eachPage', T('Restart each page', 'Reiniciar a cada página')]], st[kind].restart);
  const scope = select('scope', [['document', T('Whole document', 'Todo o documento')], ['section', T('This section', 'Esta seção')]], 'document');

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
    el('strong', {}, T('Location', 'Local')),
    el('div', { className: 'uo-dialog-grid' }, fnRadio, fnPos, enRadio, enPos),
    el('div', {}, convert),
    el('strong', {}, T('Footnote layout', 'Layout de nota de rodapé')),
    grid([T('Columns:', 'Colunas:'), columns]),
    el('strong', {}, T('Format', 'Formato')),
    grid([T('Number format:', 'Formato do número:'), format], [T('Custom mark:', 'Marca personalizada:'), mark], [T('Symbol:', 'Símbolo:'), symbols], [T('Start at:', 'Iniciar em:'), startAt], [T('Numbering:', 'Numeração:'), restart]),
    el('strong', {}, T('Apply changes', 'Aplicar alterações')),
    grid([T('Apply changes to:', 'Aplicar alterações a:'), scope]));
  convert.addEventListener('click', () => { void convertNotesDialog(env); });
  const canInsert = ed.canInsertNote();
  const h = openDialog({ title: T('Footnote and Endnote', 'Notas de Rodapé e de Fim'), icon: 'notes', body, layer: env.layer, lang, width: 480,
    actions: [
      ...(canInsert ? [{ id: 'insert', label: T('Insert', 'Inserir'), primary: true }] : []),
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
  const T = (en: string, pt: string): string => tr(lang, en, pt);
  const nf = ed.noteCount('footnote'), ne = ed.noteCount('endnote');
  const opts: [string, string, boolean][] = [
    ['toEndnotes', T('Convert all footnotes to endnotes', 'Converter todas as notas de rodapé em notas de fim'), nf > 0],
    ['toFootnotes', T('Convert all endnotes to footnotes', 'Converter todas as notas de fim em notas de rodapé'), ne > 0],
    ['swap', T('Swap footnotes and endnotes', 'Trocar notas de rodapé e notas de fim'), nf > 0 && ne > 0],
  ];
  const first = opts.find((o) => o[2])?.[0];
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, ...opts.map(([v, label, on]) => {
    const r = radio('convert', v, label, v === first);
    r.querySelector('input')!.disabled = !on;
    return r;
  }));
  const h = openDialog({ title: T('Convert Notes', 'Converter Notas'), icon: 'autorenew', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok' || !first) return;
  const v = (body.querySelector('input[name="convert"]:checked') as HTMLInputElement | null)?.value;
  if (v) ed.convertNotes(v as 'toEndnotes' | 'toFootnotes' | 'swap');
}

/** Mostrar Notas com os dois tipos no documento: qual área exibir (como o Word). */
export async function showNotesDialog(env: Env): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const T = (en: string, pt: string): string => tr(lang, en, pt);
  if (ed.editingNote() || !ed.noteCount('footnote') || !ed.noteCount('endnote')) { ed.showNotes(); return; }
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px' },
    el('span', {}, T('This document contains both footnotes and endnotes. Which do you want to view?', 'Este documento contém notas de rodapé e notas de fim. Qual área você deseja exibir?')),
    radio('area', 'footnote', T('View footnote area', 'Exibir área de notas de rodapé'), true),
    radio('area', 'endnote', T('View endnote area', 'Exibir área de notas de fim'), false));
  const h = openDialog({ title: T('Show Notes', 'Mostrar Notas'), icon: 'notes', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const v = (body.querySelector('input[name="area"]:checked') as HTMLInputElement | null)?.value as NoteKind | undefined;
  ed.showNotes(v ?? 'footnote');
}
