// Cabeçalho e rodapé nas barras do Write: comandos (opções da seção, navegação,
// vincular, remover), galerias de modelos com miniaturas desenhadas pelo motor,
// a guia contextual "Cabeçalho e Rodapé" da ribbon e os diálogos Formatar
// Números de Página, Data e Hora, Tabulação de Alinhamento e Opções de
// cabeçalho e rodapé (este para a barra compacta). Regras do Word medidas em
// write/tools/hf-lab.
import {
  openDialog, pickLabels, symbol,
  type BarContext, type BarGroup, type BarItem, type Command, type CommandRegistry, type MenuEntry, type MenuItem, type UiLang,
} from '@universal-office/ui';
import type { HfGallery, UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import type { DialogEnv } from './chrome-dialogs.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

/** Comandos do cabeçalho/rodapé (aparecem quando o método da API existe). */
export function registerHfCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const opts = () => ed.getHeaderFooterOptions();
  const inHf = (): boolean => ed.editingHeaderFooter() !== null;
  const edit = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => canEdit() && c.isEnabled!() : canEdit });
  const cmds: Command[] = [
    edit({ id: 'hf:editHeader', label: L('Edit Header', 'Editar Cabeçalho'), icon: 'edit', run: () => ed.goToHeaderFooter('header') }),
    edit({ id: 'hf:editFooter', label: L('Edit Footer', 'Editar Rodapé'), icon: 'edit', run: () => ed.goToHeaderFooter('footer') }),
    edit({ id: 'hf:removeHeader', label: L('Remove Header', 'Remover Cabeçalho'), icon: 'delete', supports: has('removeHeaderFooter'), run: () => ed.removeHeaderFooter('header') }),
    edit({ id: 'hf:removeFooter', label: L('Remove Footer', 'Remover Rodapé'), icon: 'delete', supports: has('removeHeaderFooter'), run: () => ed.removeHeaderFooter('footer') }),
    edit({ id: 'hf:removePageNumbers', label: L('Remove Page Numbers', 'Remover Números de Página'), icon: 'delete', supports: has('removePageNumbers'), run: () => ed.removePageNumbers() }),
    edit({ id: 'dlg:pageNumberFormat', label: L('Format Page Numbers…', 'Formatar Números de Página…'), icon: 'format_list_numbered', supports: has('setPageNumberFormat'), run: () => ctl.hfDialog('pageNumbers') }),
    edit({ id: 'dlg:dateTime', label: L('Date & Time', 'Data e Hora'), tip: L('Insert the current date or time', 'Insere a data ou a hora atual'), icon: 'calendar_today', supports: has('insertDateTime'), run: () => ctl.hfDialog('dateTime') }),
    edit({ id: 'dlg:alignTab', label: L('Insert Alignment Tab', 'Inserir Tabulação de Alinhamento'), tip: L('Tab stop that aligns text to the margin or the indent', 'Tabulação que alinha o texto à margem ou ao recuo'), icon: 'keyboard_tab', supports: has('insertAlignmentTab'), run: () => ctl.hfDialog('alignTab') }),
    edit({ id: 'dlg:hfOptions', label: L('Header & footer options…', 'Opções de cabeçalho e rodapé…'), icon: 'tune', supports: has('setDifferentFirstPage'), run: () => ctl.hfDialog('options') }),
    ...([['author', 'Author', 'Autor', 'person'], ['title', 'Document Title', 'Título do Documento', 'title'], ['fileName', 'File Name', 'Nome do Arquivo', 'draft'], ['filePath', 'File Path', 'Caminho do Arquivo', 'folder']] as const)
      .map(([k, en, pt, icon]) => edit({ id: `docinfo:${k}`, label: { en, pt }, icon, supports: has('insertDocumentInfo'), run: () => ed.insertDocumentInfo(k, app.title ? app.title + '.' + app.format : '') })),
    // navegação (guia contextual)
    edit({ id: 'hf:gotoHeader', label: L('Go to Header', 'Ir para Cabeçalho'), icon: 'vertical_align_top', supports: has('goToHeaderFooter'), run: () => ed.goToHeaderFooter('header'), isEnabled: () => ed.editingHeaderFooter() === 'footer' }),
    edit({ id: 'hf:gotoFooter', label: L('Go to Footer', 'Ir para Rodapé'), icon: 'vertical_align_bottom', supports: has('goToHeaderFooter'), run: () => ed.goToHeaderFooter('footer'), isEnabled: () => ed.editingHeaderFooter() === 'header' }),
    edit({ id: 'hf:prev', label: L('Previous', 'Anterior'), tip: L('Previous header or footer', 'Cabeçalho ou rodapé anterior'), icon: 'navigate_before', supports: has('previousHeaderFooter'), run: () => ed.previousHeaderFooter(), isEnabled: inHf }),
    edit({ id: 'hf:next', label: L('Next', 'Próximo'), tip: L('Next header or footer', 'Próximo cabeçalho ou rodapé'), icon: 'navigate_next', supports: has('nextHeaderFooter'), run: () => ed.nextHeaderFooter(), isEnabled: inHf }),
    edit({
      id: 'hf:link', label: L('Link to Previous', 'Vincular ao Anterior'), tip: L('Use the same header or footer as the previous section', 'Usa o mesmo cabeçalho ou rodapé da seção anterior'),
      icon: 'link', supports: has('setLinkToPrevious'),
      isEnabled: () => inHf() && (opts()?.section ?? 0) > 0, isChecked: () => !!opts()?.linkToPrevious,
      run: () => ed.setLinkToPrevious(!opts()?.linkToPrevious),
    }),
    // opções (caixas de seleção)
    edit({ id: 'hf:firstPage', label: L('Different First Page', 'Primeira Página Diferente'), icon: 'filter_1', supports: has('setDifferentFirstPage'), isChecked: () => !!opts()?.differentFirstPage, run: () => ed.setDifferentFirstPage(!opts()?.differentFirstPage) }),
    edit({ id: 'hf:oddEven', label: L('Different Odd & Even Pages', 'Páginas Pares e Ímpares Diferentes'), icon: 'auto_stories', supports: has('setDifferentOddEven'), isChecked: () => !!opts()?.differentOddEven, run: () => ed.setDifferentOddEven(!opts()?.differentOddEven) }),
    { id: 'hf:showText', label: L('Show Document Text', 'Mostrar Texto do Documento'), icon: 'visibility', supports: has('showDocumentText'), isEnabled: inHf, isChecked: () => ed.documentTextShown(), run: () => ed.showDocumentText(!ed.documentTextShown()) },
  ];
  reg.add(...cmds);
}

// ───────────────── galerias ─────────────────

/** Grade de miniaturas de uma galeria (o motor desenha cada modelo). */
function templateTiles(env: WidgetEnv, ctx: BarContext, gallery: HfGallery, wide: boolean): MenuItem {
  return {
    content: (close) => {
      const list = document.createElement('div');
      list.className = 'uw-hf-gallery';
      list.style.cssText = `display:grid;grid-template-columns:${wide ? '1fr' : 'repeat(3, auto)'};gap:6px;padding:6px;max-height:${wide ? 420 : 300}px;overflow:auto`;
      for (const t of env.ed.headerFooterTemplates(gallery)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset['template'] = t.id;
        b.title = t.name;
        b.setAttribute('aria-label', t.name);
        b.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:stretch;padding:6px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left';
        const cap = document.createElement('span');
        cap.textContent = t.name;
        cap.style.cssText = 'font-size:12px;opacity:.8';
        const cv = document.createElement('canvas');
        cv.style.cssText = 'display:block;border:1px solid rgba(127,127,127,.25);background:#fff';
        b.append(cap, cv);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { close(); env.ed.insertHeaderFooterTemplate(gallery, t.id); ctx.after(); });
        list.append(b);
        // miniatura depois do menu montado (o motor pode levar uns ms por modelo)
        requestAnimationFrame(() => { env.ed.paintHeaderFooterTemplate(gallery, t.id, cv, wide ? 300 : gallery === 'pageMargin' ? 90 : 160); });
      }
      return list;
    },
  };
}

/** Menu do botão Cabeçalho / Rodapé: modelos + Editar + Remover. */
export function hfGalleryMenu(env: WidgetEnv, ctx: BarContext, kind: 'header' | 'footer'): MenuEntry[] {
  return [templateTiles(env, ctx, kind, true), '-',
    kind === 'header' ? 'hf:editHeader' : 'hf:editFooter', kind === 'header' ? 'hf:removeHeader' : 'hf:removeFooter'];
}

/** Menu Número de Página: Início/Fim da Página, Margens, Posição Atual, Formatar, Remover. */
export function pageNumberMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const sub = (id: HfGallery, label: { en: string; pt: string }, icon: string): MenuItem =>
    ({ id: `pgnum:${id}`, label, icon, submenu: () => [templateTiles(env, ctx, id, id !== 'pageMargin' && id !== 'pageCurrent')] });
  return [
    sub('pageTop', L('Top of Page', 'Início da Página'), 'vertical_align_top'),
    sub('pageBottom', L('Bottom of Page', 'Fim da Página'), 'vertical_align_bottom'),
    sub('pageMargin', L('Page Margins', 'Margens da Página'), 'border_right'),
    sub('pageCurrent', L('Current Position', 'Posição Atual'), 'text_select_end'),
    '-', 'dlg:pageNumberFormat', 'hf:removePageNumbers',
  ];
}

/** Informações do Documento (Autor, Título, Nome e Caminho do Arquivo). */
export const docInfoMenu = (): MenuEntry[] => ['docinfo:author', 'docinfo:title', 'docinfo:fileName', 'docinfo:filePath'];

/** Caixa numérica de distância (cm no pt, polegadas no en) da guia contextual. */
function distanceWidget(env: WidgetEnv, which: 'header' | 'footer'): BarItem {
  return {
    widget: (ctx) => {
      const lang = ctx.lang;
      const u = lang === 'pt' ? { tw: 1440 / 2.54, name: 'cm' } : { tw: 1440, name: '"' };
      const wrap = document.createElement('label');
      wrap.className = 'uo-g-inline';
      wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;white-space:nowrap';
      const title = which === 'header'
        ? tr(lang, 'Header from Top', 'Cabeçalho a Partir da Parte Superior')
        : tr(lang, 'Footer from Bottom', 'Rodapé a Partir da Parte Inferior');
      wrap.title = title;
      wrap.innerHTML = symbol(which === 'header' ? 'vertical_align_top' : 'vertical_align_bottom');
      const input = document.createElement('input');
      input.className = 'uo-num';
      input.dataset['a'] = `hf:dist:${which}`;
      input.inputMode = 'decimal';
      input.style.width = '64px';
      input.setAttribute('aria-label', title);
      const fmt = (tw: number): string => `${(Math.round((tw / u.tw) * 100) / 100).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 2 })} ${u.name}`;
      const apply = (): void => {
        const n = parseFloat(input.value.replace(/\s|cm|"|pol|in/gi, '').replace(',', '.'));
        if (Number.isFinite(n) && n >= 0) env.ed.setHeaderFooterDistance({ [which]: Math.round(n * u.tw) });
        ctx.after();
      };
      input.addEventListener('change', apply);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
      input.addEventListener('focus', () => input.select());
      wrap.append(input);
      return {
        el: wrap,
        sync: () => {
          const o = env.ed.getHeaderFooterOptions();
          if (o && env.root.activeElement !== input) input.value = fmt(which === 'header' ? o.headerDistance : o.footerDistance);
          input.disabled = env.app.comparing || env.ed.isProtected();
        },
      };
    },
  };
}

/** Grupos da guia contextual "Cabeçalho e Rodapé" (como no Word). */
export function hfToolsGroups(env: WidgetEnv, ctx: BarContext): BarGroup[] {
  const large = (cmd: string): BarItem => ({ cmd, size: 'large' });
  return [
    { id: 'hf-hf', label: L('Header & Footer', 'Cabeçalho e Rodapé'), icon: 'call_to_action', prio: 6, cells: [
      { menu: () => hfGalleryMenu(env, ctx, 'header'), id: 'hf:headerMenu', label: L('Header', 'Cabeçalho'), icon: 'vertical_align_top', size: 'large' },
      { menu: () => hfGalleryMenu(env, ctx, 'footer'), id: 'hf:footerMenu', label: L('Footer', 'Rodapé'), icon: 'vertical_align_bottom', size: 'large' },
      { menu: () => pageNumberMenu(env, ctx), id: 'hf:pgnumMenu', label: L('Page Number', 'Número de Página'), icon: 'numbers', size: 'large' },
    ] },
    { id: 'hf-insert', label: L('Insert', 'Inserir'), icon: 'calendar_today', prio: 5, cells: [
      large('dlg:dateTime'),
      { menu: docInfoMenu, id: 'hf:docinfo', label: L('Document Info', 'Informações do Documento'), icon: 'info', size: 'large' },
      large('image'),
    ] },
    { id: 'hf-nav', label: L('Navigation', 'Navegação'), icon: 'swap_vert', prio: 4, cells: [
      large('hf:gotoHeader'), large('hf:gotoFooter'),
      { rows: [[{ cmd: 'hf:prev', label: true }], [{ cmd: 'hf:next', label: true }], [{ cmd: 'hf:link', label: true }]] },
    ] },
    { id: 'hf-options', label: L('Options', 'Opções'), icon: 'tune', prio: 4, cells: [
      { rows: [[{ cmd: 'hf:firstPage', label: true }], [{ cmd: 'hf:oddEven', label: true }], [{ cmd: 'hf:showText', label: true }]] },
    ] },
    { id: 'hf-position', label: L('Position', 'Posição'), icon: 'height', prio: 3, cells: [
      { rows: [[distanceWidget(env, 'header')], [distanceWidget(env, 'footer')], [{ cmd: 'dlg:alignTab', label: true }]] },
    ] },
    { id: 'hf-close', label: L('Close', 'Fechar'), icon: 'close', prio: 9, cells: [large('hf:close')] },
  ];
}

// ───────────────── diálogos ─────────────────

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
const radio = (name: string, value: string, label: string, on: boolean): HTMLLabelElement =>
  el('label', { className: 'uo-check' }, el('input', { type: 'radio', name, value, checked: on }), label);
const check = (name: string, label: string, on: boolean): HTMLLabelElement =>
  el('label', { className: 'uo-check' }, el('input', { type: 'checkbox', name, checked: on }), label);

/** Formatar Números de Página: formato, incluir número do capítulo, numeração (continuar / iniciar em). */
export async function pageNumberFormatDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const f = ed.getPageNumberFormat();
  if (!f) return;
  const fmt = select('fmt', [
    ['decimal', '1, 2, 3, …'], ['numberInDash', '- 1 -, - 2 -, - 3 -, …'], ['lowerLetter', 'a, b, c, …'],
    ['upperLetter', 'A, B, C, …'], ['lowerRoman', 'i, ii, iii, …'], ['upperRoman', 'I, II, III, …'],
  ], f.format);
  const chap = check('chap', tr(lang, 'Include chapter number', 'Incluir número do capítulo'), !!f.chapter);
  const level = select('level', Array.from({ length: 9 }, (_, i) => [String(i + 1), tr(lang, `Heading ${i + 1}`, `Título ${i + 1}`)] as const), String(f.chapter?.level ?? 1));
  const sep = select('sep', [
    ['hyphen', tr(lang, '- (hyphen)', '- (hífen)')], ['period', tr(lang, '. (period)', '. (ponto)')], ['colon', tr(lang, ': (colon)', ': (dois-pontos)')],
    ['emDash', tr(lang, '— (em dash)', '— (travessão)')], ['enDash', tr(lang, '– (en dash)', '– (traço)')],
  ], f.chapter?.separator ?? 'hyphen');
  const cont = radio('num', 'continue', tr(lang, 'Continue from previous section', 'Continuar da seção anterior'), f.start === null);
  const startR = radio('num', 'start', tr(lang, 'Start at:', 'Iniciar em:'), f.start !== null);
  const start = el('input', { type: 'number', name: 'start', min: '0', step: '1', value: String(f.start ?? 1), style: 'width:72px' });
  const chapIn = chap.querySelector('input')!;
  const sync = (): void => {
    level.disabled = sep.disabled = !chapIn.checked;
    start.disabled = !(startR.querySelector('input')!).checked;
  };
  for (const x of [chapIn, cont.querySelector('input')!, startR.querySelector('input')!]) x.addEventListener('change', sync);
  start.addEventListener('focus', () => { (startR.querySelector('input')!).checked = true; sync(); });
  sync();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Number format', 'Formato do número')), fmt),
    chap,
    el('div', { className: 'uo-dialog-grid', style: 'padding-left:24px' },
      el('span', {}, tr(lang, 'Chapter starts with style', 'O capítulo começa com o estilo')), level,
      el('span', {}, tr(lang, 'Use separator', 'Usar separador')), sep),
    el('strong', {}, tr(lang, 'Page numbering', 'Numeração de página')),
    cont, el('div', { style: 'display:flex;gap:8px;align-items:center' }, startR, start));
  const h = openDialog({ title: tr(lang, 'Page Number Format', 'Formatar Números de Página'), icon: 'format_list_numbered', body, layer: env.layer, lang, width: 440,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const n = Math.max(0, Math.round(Number(start.value) || 0));
  ed.setPageNumberFormat({
    format: fmt.value,
    chapter: chapIn.checked ? { level: Number(level.value), separator: sep.value as 'hyphen' } : null,
    start: (startR.querySelector('input')!).checked ? n : null,
  });
}

/** Data e Hora: formatos do idioma, "Atualizar automaticamente" (campo TIME, como o Word). */
export async function dateTimeDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  let dl: 'en' | 'pt' = lang;
  const list = el('select', { name: 'formats', size: 12, style: 'width:100%;min-height:240px' });
  const fill = (): void => {
    list.replaceChildren(...ed.dateTimeFormats(dl).map((f) => el('option', { value: f.pattern, textContent: f.sample })));
    list.selectedIndex = 0;
  };
  fill();
  const language = select('lang', [['pt', 'Português (Brasil)'], ['en', tr(lang, 'English (United States)', 'Inglês (Estados Unidos)')]], dl);
  language.addEventListener('change', () => { dl = language.value as 'en' | 'pt'; fill(); });
  const update = check('update', tr(lang, 'Update automatically', 'Atualizar automaticamente'), false);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px' },
    el('span', {}, tr(lang, 'Available formats:', 'Formatos disponíveis:')), list,
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, tr(lang, 'Language', 'Idioma')), language), update);
  list.addEventListener('dblclick', () => h.close('ok'));
  const h = openDialog({ title: tr(lang, 'Date and Time', 'Data e Hora'), icon: 'calendar_today', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok' || !list.value) return;
  ed.insertDateTime(list.value, update.querySelector('input')!.checked, dl);
}

/** Tabulação de Alinhamento: esquerda/centro/direita, relativa à margem ou ao recuo, preenchimento. */
export async function alignTabDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang;
  const al = el('div', { style: 'display:flex;gap:12px' },
    radio('al', 'left', tr(lang, 'Left', 'Esquerda'), true), radio('al', 'center', tr(lang, 'Center', 'Centro'), false), radio('al', 'right', tr(lang, 'Right', 'Direita'), false));
  const rel = el('div', { style: 'display:flex;gap:12px' },
    radio('rel', 'margin', tr(lang, 'Margin', 'Margem'), true), radio('rel', 'indent', tr(lang, 'Indent', 'Recuo'), false));
  const leader = select('leader', [['none', tr(lang, '(none)', '(nenhum)')], ['dot', '.......'], ['hyphen', '-------'], ['underscore', '_______'], ['middleDot', '·······']], 'none');
  const body = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, tr(lang, 'Alignment', 'Alinhamento')), al,
    el('span', {}, tr(lang, 'Align relative to', 'Alinhar em relação a')), rel,
    el('span', {}, tr(lang, 'Leader', 'Preenchimento')), leader);
  const h = openDialog({ title: tr(lang, 'Alignment Tab', 'Tabulação de Alinhamento'), icon: 'keyboard_tab', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const v = (n: string): string => body.querySelector<HTMLInputElement>(`input[name="${n}"]:checked`)?.value ?? '';
  env.ed.insertAlignmentTab(v('al') as 'left', v('rel') as 'margin', leader.value as 'none');
}

/** Opções de cabeçalho e rodapé (barra compacta): as caixas da guia contextual, as distâncias e o vínculo. */
export async function hfOptionsDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const o = ed.getHeaderFooterOptions();
  if (!o) return;
  const u = lang === 'pt' ? { tw: 1440 / 2.54, name: 'cm' } : { tw: 1440, name: '"' };
  const fmt = (tw: number): string => (Math.round((tw / u.tw) * 100) / 100).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 2 });
  const parse = (v: string): number => { const n = parseFloat(v.replace(/\s|cm|"|pol|in/gi, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * u.tw) : NaN; };
  const first = check('first', tr(lang, 'Different first page', 'Primeira página diferente'), o.differentFirstPage);
  const oddEven = check('oddEven', tr(lang, 'Different odd & even pages', 'Páginas pares e ímpares diferentes'), o.differentOddEven);
  const hd = el('input', { type: 'text', name: 'hd', value: fmt(o.headerDistance), inputMode: 'decimal', style: 'width:80px' });
  const fd = el('input', { type: 'text', name: 'fd', value: fmt(o.footerDistance), inputMode: 'decimal', style: 'width:80px' });
  const unit = (i: HTMLInputElement): HTMLElement => el('span', { style: 'display:flex;gap:4px;align-items:center' }, i, u.name);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    el('strong', {}, o.sectionCount > 1 ? tr(lang, `Section ${o.section + 1}`, `Seção ${o.section + 1}`) : tr(lang, 'Document', 'Documento')),
    first, oddEven,
    el('div', { className: 'uo-dialog-grid' },
      el('span', {}, tr(lang, 'Header from top', 'Cabeçalho a partir do topo')), unit(hd),
      el('span', {}, tr(lang, 'Footer from bottom', 'Rodapé a partir da base')), unit(fd)));
  const h = openDialog({ title: tr(lang, 'Header & footer options', 'Opções de cabeçalho e rodapé'), icon: 'tune', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: env.app.ui!.L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  const fi = first.querySelector('input')!.checked, oe = oddEven.querySelector('input')!.checked;
  if (fi !== o.differentFirstPage) ed.setDifferentFirstPage(fi);
  if (oe !== o.differentOddEven) ed.setDifferentOddEven(oe);
  const h2 = parse(hd.value), f2 = parse(fd.value);
  const d: { header?: number; footer?: number } = {};
  if (Number.isFinite(h2) && h2 >= 0 && h2 !== o.headerDistance) d.header = h2;
  if (Number.isFinite(f2) && f2 >= 0 && f2 !== o.footerDistance) d.footer = f2;
  if (d.header !== undefined || d.footer !== undefined) ed.setHeaderFooterDistance(d);
}
