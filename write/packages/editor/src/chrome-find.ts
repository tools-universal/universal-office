// Grupo Edição da Página Inicial: o diálogo Localizar e Substituir (abas Localizar, Substituir e
// Ir para, não modal, com Mais opções, Formatar, Especial, Localizar em e Realce de Leitura) e o
// menu Selecionar (Selecionar Tudo, Selecionar Objetos, Selecionar Texto com Formatação
// Semelhante, Painel de Seleção). O que casa e o que a substituição grava está no
// find-engine.ts (medido no Word: write/tools/home-lab exp-find.ps1).
import { openDialog, openMenu, pickLabels, type CommandRegistry, type MenuEntry, type MenuItem, type UiLang, type DialogHandle } from '@universal-office/ui';
import type { UniversalWriteElement, FindQuery, FindFormat, FindRunOptions, GoToWhat } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';

export type FindTab = 'find' | 'replace' | 'goto';

export interface FindEnv { ed: UniversalWriteElement; app: WriteApp; layer: HTMLElement; lang: UiLang; after(): void }

const tr = (lang: UiLang, en: string, pt: string, es: string): string => pickLabels(lang, { en, pt, es });

/** O que o diálogo lembra entre aberturas (como o Word, na sessão). */
const memo: {
  find: string; repl: string; more: boolean; dir: 'all' | 'down' | 'up';
  opts: Pick<FindQuery, 'matchCase' | 'wholeWord' | 'wildcards' | 'soundsLike' | 'allForms' | 'prefix' | 'suffix' | 'ignorePunct' | 'ignoreSpace'>;
  findFmt: FindFormat; replFmt: FindFormat; gotoWhat: GoToWhat;
} = { find: '', repl: '', more: false, dir: 'all', opts: {}, findFmt: {}, replFmt: {}, gotoWhat: 'page' };

const GOTO: [GoToWhat, string, string, string, string, string, string][] = [
  ['page', 'Page', 'Página', 'Página', 'Enter page number:', 'Insira o número da página:', 'Escribe el número de página:'],
  ['section', 'Section', 'Seção', 'Sección', 'Enter section number:', 'Insira o número da seção:', 'Escribe el número de sección:'],
  ['line', 'Line', 'Linha', 'Línea', 'Enter line number:', 'Insira o número da linha:', 'Escribe el número de línea:'],
  ['bookmark', 'Bookmark', 'Indicador', 'Marcador', 'Enter bookmark name:', 'Insira o nome do indicador:', 'Escribe el nombre del marcador:'],
  ['comment', 'Comment', 'Comentário', 'Comentario', 'Enter reviewer’s name:', 'Insira o nome do revisor:', 'Escribe el nombre del revisor:'],
  ['footnote', 'Footnote', 'Nota de Rodapé', 'Nota al pie', 'Enter footnote number:', 'Insira o número da nota de rodapé:', 'Escribe el número de la nota al pie:'],
  ['endnote', 'Endnote', 'Nota de Fim', 'Nota al final', 'Enter endnote number:', 'Insira o número da nota de fim:', 'Escribe el número de la nota al final:'],
  ['field', 'Field', 'Campo', 'Campo', 'Enter field name:', 'Insira o nome do campo:', 'Escribe el nombre del campo:'],
  ['table', 'Table', 'Tabela', 'Tabla', 'Enter table number:', 'Insira o número da tabela:', 'Escribe el número de la tabla:'],
  ['graphic', 'Graphic', 'Gráfico', 'Gráfico', 'Enter graphic number:', 'Insira o número do gráfico:', 'Escribe el número del gráfico:'],
  ['equation', 'Equation', 'Equação', 'Ecuación', 'Enter equation number:', 'Insira o número da equação:', 'Escribe el número de la ecuación:'],
  ['object', 'Object', 'Objeto', 'Objeto', 'Enter object number:', 'Insira o número do objeto:', 'Escribe el número del objeto:'],
  ['heading', 'Heading', 'Título', 'Título', 'Enter heading number:', 'Insira o número do título:', 'Escribe el número del título:'],
];

/** Especiais do Word: [código, en, pt, es]. */
const SPECIAL_FIND: [string, string, string, string][] = [
  ['^p', 'Paragraph Mark', 'Marca de Parágrafo', 'Marca de párrafo'], ['^t', 'Tab Character', 'Caractere de Tabulação', 'Carácter de tabulación'],
  ['^?', 'Any Character', 'Qualquer Caractere', 'Cualquier carácter'], ['^#', 'Any Digit', 'Qualquer Dígito', 'Cualquier dígito'], ['^$', 'Any Letter', 'Qualquer Letra', 'Cualquier letra'],
  ['^^', 'Caret Character', 'Caractere Circunflexo', 'Carácter de intercalación'], ['^e', 'Endnote Mark', 'Marca de Nota de Fim', 'Marca de nota al final'], ['^d', 'Field', 'Campo', 'Campo'],
  ['^f', 'Footnote Mark', 'Marca de Nota de Rodapé', 'Marca de nota al pie'], ['^g', 'Graphic', 'Gráfico', 'Gráfico'], ['^l', 'Manual Line Break', 'Quebra de Linha Manual', 'Salto de línea manual'],
  ['^m', 'Manual Page Break', 'Quebra de Página Manual', 'Salto de página manual'], ['^~', 'Nonbreaking Hyphen', 'Hífen Incondicional', 'Guion de no separación'],
  ['^s', 'Nonbreaking Space', 'Espaço Incondicional', 'Espacio de no separación'], ['^-', 'Optional Hyphen', 'Hífen Opcional', 'Guion opcional'], ['^b', 'Section Break', 'Quebra de Seção', 'Salto de sección'],
  ['^w', 'White Space', 'Espaço em Branco', 'Espacio en blanco'], ['^+', 'Em Dash', 'Travessão', 'Guion largo'], ['^=', 'En Dash', 'Traço', 'Guion corto'], ['^n', 'Column Break', 'Quebra de Coluna', 'Salto de columna'],
];
const SPECIAL_WILD: [string, string, string, string][] = [
  ['?', 'Any Character', 'Qualquer Caractere', 'Cualquier carácter'], ['[-]', 'Character in Range', 'Caractere no Intervalo', 'Carácter en el intervalo'], ['<', 'Beginning of Word', 'Início da Palavra', 'Principio de palabra'],
  ['>', 'End of Word', 'Fim da Palavra', 'Fin de palabra'], ['()', 'Expression', 'Expressão', 'Expresión'], ['[!]', 'Not', 'Diferente de', 'No'],
  ['{,}', 'Num Occurrences', 'Número de Ocorrências', 'Número de repeticiones'], ['@', 'Previous 1 or More', 'Item Anterior 1 ou Mais', 'Anterior 1 o más'], ['*', '0 or More Characters', '0 ou Mais Caracteres', '0 o más caracteres'],
  ['^t', 'Tab Character', 'Caractere de Tabulação', 'Carácter de tabulación'], ['^^', 'Caret Character', 'Caractere Circunflexo', 'Carácter de intercalación'], ['^13', 'Paragraph Mark', 'Marca de Parágrafo', 'Marca de párrafo'],
  ['^l', 'Manual Line Break', 'Quebra de Linha Manual', 'Salto de línea manual'], ['^m', 'Manual Page Break', 'Quebra de Página Manual', 'Salto de página manual'], ['^s', 'Nonbreaking Space', 'Espaço Incondicional', 'Espacio de no separación'],
];
const SPECIAL_REPL: [string, string, string, string][] = [
  ['^p', 'Paragraph Mark', 'Marca de Parágrafo', 'Marca de párrafo'], ['^t', 'Tab Character', 'Caractere de Tabulação', 'Carácter de tabulación'], ['^^', 'Caret Character', 'Caractere Circunflexo', 'Carácter de intercalación'],
  ['^c', 'Clipboard Contents', 'Conteúdo da Área de Transferência', 'Contenido del Portapapeles'], ['^&', 'Find What Text', 'Conteúdo de Localizar', 'Texto de Buscar'],
  ['^l', 'Manual Line Break', 'Quebra de Linha Manual', 'Salto de línea manual'], ['^m', 'Manual Page Break', 'Quebra de Página Manual', 'Salto de página manual'], ['^n', 'Column Break', 'Quebra de Coluna', 'Salto de columna'],
  ['^~', 'Nonbreaking Hyphen', 'Hífen Incondicional', 'Guion de no separación'], ['^s', 'Nonbreaking Space', 'Espaço Incondicional', 'Espacio de no separación'], ['^-', 'Optional Hyphen', 'Hífen Opcional', 'Guion opcional'],
  ['^+', 'Em Dash', 'Travessão', 'Guion largo'], ['^=', 'En Dash', 'Traço', 'Guion corto'],
];

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const btn = (label: string, primary = false): HTMLButtonElement => el('button', { type: 'button', className: primary ? 'uo-pill uo-pill-primary' : 'uo-pill', textContent: label });
const check = (label: string, on: boolean): { el: HTMLLabelElement; input: HTMLInputElement } => {
  const input = el('input', { type: 'checkbox', checked: on });
  return { el: el('label', { className: 'uo-check', style: 'display:flex;align-items:center;gap:6px' }, input, label), input };
};

/** Descrição curta de uma formatação (a linha "Formato:" do Word). */
export function formatSummary(f: FindFormat, lang: UiLang): string {
  const out: string[] = [];
  const yn = (v: boolean | undefined, on: string, off: string): void => { if (v !== undefined) out.push(v ? on : off); };
  if (f.font) out.push(f.font);
  if (f.sizePt) out.push(`${f.sizePt} pt`);
  yn(f.bold, tr(lang, 'Bold', 'Negrito', 'Negrita'), tr(lang, 'Not Bold', 'Sem Negrito', 'Sin negrita'));
  yn(f.italic, tr(lang, 'Italic', 'Itálico', 'Cursiva'), tr(lang, 'Not Italic', 'Sem Itálico', 'Sin cursiva'));
  yn(f.underline, tr(lang, 'Underline', 'Sublinhado', 'Subrayado'), tr(lang, 'No underline', 'Sem sublinhado', 'Sin subrayado'));
  yn(f.strike, tr(lang, 'Strikethrough', 'Tachado', 'Tachado'), tr(lang, 'Not Strikethrough', 'Sem Tachado', 'Sin tachado'));
  yn(f.allCaps, tr(lang, 'All caps', 'Todas em maiúsculas', 'Mayúsculas'), tr(lang, 'Not All caps', 'Sem Todas em maiúsculas', 'Sin mayúsculas'));
  yn(f.smallCaps, tr(lang, 'Small caps', 'Versalete', 'Versalitas'), tr(lang, 'Not Small caps', 'Sem Versalete', 'Sin versalitas'));
  yn(f.hidden, tr(lang, 'Hidden', 'Oculto', 'Oculto'), tr(lang, 'Not Hidden', 'Sem Oculto', 'No oculto'));
  if (f.vertAlign) out.push(f.vertAlign === 'superscript' ? tr(lang, 'Superscript', 'Sobrescrito', 'Superíndice') : tr(lang, 'Subscript', 'Subscrito', 'Subíndice'));
  if (f.color) out.push(`${tr(lang, 'Font color', 'Cor da fonte', 'Color de fuente')}: #${f.color}`);
  yn(f.highlight, tr(lang, 'Highlight', 'Realce', 'Resaltado'), tr(lang, 'Not Highlight', 'Sem Realce', 'Sin resaltado'));
  if (f.paraStyle) out.push(`${tr(lang, 'Style', 'Estilo', 'Estilo')}: ${f.paraStyle}`);
  if (f.charStyle) out.push(`${tr(lang, 'Style', 'Estilo', 'Estilo')}: ${f.charStyle}`);
  return out.join(', ');
}

/** O diálogo Localizar e Substituir (um por barra montada). */
export class FindReplaceDialog {
  private handle: DialogHandle | null = null;
  private tab: FindTab = 'find';
  private active: 'find' | 'repl' = 'find';
  constructor(private readonly env: FindEnv) {}

  get isOpen(): boolean { return !!this.handle; }
  close(): void { this.handle?.close(null); this.handle = null; }

  open(tab: FindTab): void {
    const { ed, lang } = this.env;
    // o texto selecionado (curto, uma linha) vira o texto procurado
    const sel = ed.selectedText();
    if (sel && !sel.includes('\n') && sel.length < 256 && tab !== 'goto') memo.find = sel;
    if (this.handle) { this.show(tab); return; }
    const body = this.build();
    this.handle = openDialog({ title: tr(lang, 'Find and Replace', 'Localizar e Substituir', 'Buscar y reemplazar'), body, actions: [], modal: false, layer: this.env.layer, lang, width: 680 });
    // não modal: no alto, centralizado na janela (o documento continua visível e clicável)
    const d = this.handle.el;
    d.style.position = 'fixed';
    d.style.margin = '0';
    d.style.top = '96px';
    d.style.left = 'max(8px, calc(50% - 340px))';
    d.style.zIndex = '20';
    void this.handle.result.then(() => { this.handle = null; ed.focusEditor(); });
    this.show(tab);
  }

  // ───── montagem ─────
  private els!: {
    tabs: Record<FindTab, HTMLButtonElement>; findRow: HTMLElement; replRow: HTMLElement; gotoPane: HTMLElement; findPane: HTMLElement;
    find: HTMLInputElement; repl: HTMLInputElement; findFmt: HTMLElement; replFmt: HTMLElement; more: HTMLElement; moreBtn: HTMLButtonElement;
    status: HTMLElement; replBtns: HTMLElement; findBtns: HTMLElement; checks: Record<string, HTMLInputElement>; dir: HTMLSelectElement;
    gotoList: HTMLSelectElement; gotoInput: HTMLInputElement; gotoLabel: HTMLElement; gotoNext: HTMLButtonElement; gotoData: HTMLDataListElement;
  };

  private build(): HTMLElement {
    const { ed, lang } = this.env;
    const T = (en: string, pt: string, es: string): string => tr(lang, en, pt, es);
    const root = el('div', { className: 'uw-findrep', style: 'display:flex;flex-direction:column;gap:10px;min-width:480px' });
    const tabBar = el('div', { role: 'tablist', style: 'display:flex;gap:4px;border-bottom:1px solid var(--uo-outline-variant,#ccc)' });
    const mkTab = (id: FindTab, label: string): HTMLButtonElement => {
      const b = el('button', { type: 'button', className: 'uo-btn', textContent: label, role: 'tab', style: 'padding:6px 12px;border-radius:6px 6px 0 0' });
      b.addEventListener('click', () => this.show(id));
      tabBar.append(b);
      return b;
    };
    const tabs = { find: mkTab('find', T('Find', 'Localizar', 'Buscar')), replace: mkTab('replace', T('Replace', 'Substituir', 'Reemplazar')), goto: mkTab('goto', T('Go To', 'Ir para', 'Ir a')) };

    // campos
    const find = el('input', { type: 'text', value: memo.find, style: 'flex:1;min-width:0', ariaLabel: T('Find what', 'Localizar', 'Buscar') });
    const repl = el('input', { type: 'text', value: memo.repl, style: 'flex:1;min-width:0', ariaLabel: T('Replace with', 'Substituir por', 'Reemplazar con') });
    find.addEventListener('focus', () => { this.active = 'find'; });
    repl.addEventListener('focus', () => { this.active = 'repl'; });
    find.addEventListener('input', () => { memo.find = find.value; this.setStatus(''); });
    repl.addEventListener('input', () => { memo.repl = repl.value; });
    const findFmt = el('div', { style: 'font-size:12px;opacity:.8;min-height:14px' });
    const replFmt = el('div', { style: 'font-size:12px;opacity:.8;min-height:14px' });
    const lab = (t: string): HTMLElement => el('span', { textContent: t, style: 'width:110px;flex:none' });
    const findRow = el('div', { style: 'display:flex;flex-direction:column;gap:2px' },
      el('div', { style: 'display:flex;align-items:center;gap:8px' }, lab(T('Find what:', 'Localizar:', 'Buscar:')), find), el('div', { style: 'padding-left:118px' }, findFmt));
    const replRow = el('div', { style: 'display:flex;flex-direction:column;gap:2px' },
      el('div', { style: 'display:flex;align-items:center;gap:8px' }, lab(T('Replace with:', 'Substituir por:', 'Reemplazar con:')), repl), el('div', { style: 'padding-left:118px' }, replFmt));

    // Mais opções
    const C = (k: keyof typeof memo.opts, en: string, pt: string, es: string): HTMLLabelElement => {
      const c = check(T(en, pt, es), !!memo.opts[k]);
      c.input.addEventListener('change', () => { memo.opts[k] = c.input.checked; this.syncOpts(); });
      checks[k] = c.input;
      return c.el;
    };
    const checks: Record<string, HTMLInputElement> = {};
    const dir = el('select', {}) as HTMLSelectElement;
    for (const [v, en, pt, es] of [['all', 'All', 'Tudo', 'Todo'], ['down', 'Down', 'Abaixo', 'Hacia abajo'], ['up', 'Up', 'Acima', 'Hacia arriba']] as const) dir.append(el('option', { value: v, textContent: T(en, pt, es) }));
    dir.value = memo.dir;
    dir.addEventListener('change', () => { memo.dir = dir.value as typeof memo.dir; });
    const formatBtn = btn(`${T('Format', 'Formatar', 'Formato')} ▾`);
    formatBtn.addEventListener('click', () => this.formatMenu(formatBtn));
    const specialBtn = btn(`${T('Special', 'Especial', 'Especial')} ▾`);
    specialBtn.addEventListener('click', () => this.specialMenu(specialBtn));
    const noFmtBtn = btn(T('No Formatting', 'Sem Formatação', 'Sin formato'));
    noFmtBtn.addEventListener('click', () => { if (this.active === 'repl' && this.tab === 'replace') memo.replFmt = {}; else memo.findFmt = {}; this.syncFormat(); });
    const more = el('div', { style: 'display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--uo-outline-variant,#ccc);padding-top:8px' },
      el('strong', { textContent: T('Search Options', 'Opções de pesquisa', 'Opciones de búsqueda') }),
      el('div', { style: 'display:flex;align-items:center;gap:8px' }, el('span', { textContent: T('Search:', 'Pesquisar:', 'Buscar:') }), dir),
      el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:4px 16px' },
        C('matchCase', 'Match case', 'Diferenciar maiúsculas e minúsculas', 'Coincidir mayúsculas y minúsculas'), C('prefix', 'Match prefix', 'Coincidir prefixo', 'Prefijo coincidente'),
        C('wholeWord', 'Find whole words only', 'Localizar apenas palavras inteiras', 'Solo palabras completas'), C('suffix', 'Match suffix', 'Coincidir sufixo', 'Sufijo coincidente'),
        C('wildcards', 'Use wildcards', 'Usar caracteres curinga', 'Usar caracteres comodín'), el('span'),
        C('soundsLike', 'Sounds like (English)', 'Semelhantes (Inglês)', 'Suena como (inglés)'), C('ignorePunct', 'Ignore punctuation characters', 'Ignorar caracteres de pontuação', 'Omitir signos de puntuación'),
        C('allForms', 'Find all word forms (English)', 'Todas as formas da palavra (Inglês)', 'Todas las formas de la palabra (inglés)'), C('ignoreSpace', 'Ignore white-space characters', 'Ignorar espaços em branco', 'Omitir espacios en blanco')),
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, formatBtn, specialBtn, noFmtBtn));
    more.hidden = !memo.more;
    const moreBtn = btn(memo.more ? T('<< Less', '<< Menos', '<< Menos') : T('More >>', 'Mais >>', 'Más >>'));
    moreBtn.addEventListener('click', () => {
      memo.more = !memo.more;
      more.hidden = !memo.more;
      moreBtn.textContent = memo.more ? T('<< Less', '<< Menos', '<< Menos') : T('More >>', 'Mais >>', 'Más >>');
    });

    // botões das abas Localizar/Substituir
    const status = el('div', { role: 'status', style: 'font-size:13px;min-height:18px' });
    const readBtn = btn(`${T('Reading Highlight', 'Realce de Leitura', 'Resaltado de lectura')} ▾`);
    readBtn.addEventListener('click', () => openMenu([
      { id: 'hl:all', label: { en: 'Highlight All', pt: 'Realçar Tudo', es: 'Resaltar todo' }, onClick: () => this.highlightAll() },
      { id: 'hl:clear', label: { en: 'Clear Highlighting', pt: 'Limpar Realce', es: 'Borrar resaltado' }, onClick: () => { ed.clearSearch(); this.setStatus(''); } },
    ], { anchor: readBtn, side: 'below' }, { lang, layer: this.env.layer }));
    const inBtn = btn(`${T('Find In', 'Localizar em', 'Buscar en')} ▾`);
    inBtn.addEventListener('click', () => openMenu([
      { id: 'in:sel', label: { en: 'Current Selection', pt: 'Seleção Atual', es: 'Selección actual' }, disabled: !ed.selectedText(), onClick: () => this.findIn('selection') },
      { id: 'in:main', label: { en: 'Main Document', pt: 'Documento Principal', es: 'Documento principal' }, onClick: () => this.findIn('document') },
    ], { anchor: inBtn, side: 'below' }, { lang, layer: this.env.layer }));
    const nextBtn = btn(T('Find Next', 'Localizar Próxima', 'Buscar siguiente'), true);
    nextBtn.addEventListener('click', () => this.findNext());
    const replOne = btn(T('Replace', 'Substituir', 'Reemplazar'));
    replOne.addEventListener('click', () => this.replaceOne());
    const replAll = btn(T('Replace All', 'Substituir Tudo', 'Reemplazar todos'));
    replAll.addEventListener('click', () => this.replaceAll());
    const cancel = btn(T('Cancel', 'Cancelar', 'Cancelar'));
    cancel.addEventListener('click', () => this.close());
    const findBtns = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, readBtn, inBtn);
    const replBtns = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, replOne, replAll);
    const footer = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;justify-content:space-between;align-items:center' },
      el('div', { style: 'display:flex;gap:6px' }, moreBtn), el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, findBtns, replBtns, nextBtn, cancel));
    const findPane = el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, findRow, replRow, status, footer, more);
    for (const i of [find, repl]) {
      i.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (i === repl && e.ctrlKey) this.replaceAll(); else this.findNext(); }
      });
    }

    // Ir para
    const gotoList = el('select', { size: 8, style: 'width:180px;height:180px' }) as HTMLSelectElement;
    for (const [v, en, pt, es] of GOTO) gotoList.append(el('option', { value: v, textContent: T(en, pt, es) }));
    gotoList.value = memo.gotoWhat;
    const gotoLabel = el('span', {});
    const gotoData = el('datalist', { id: `uw-goto-${Math.random().toString(36).slice(2)}` });
    const gotoInput = el('input', { type: 'text', style: 'width:100%' });
    gotoInput.setAttribute('list', gotoData.id);
    const prevBtn = btn(T('Previous', 'Anterior', 'Anterior'));
    const gotoNext = btn(T('Next', 'Avançar', 'Siguiente'), true);
    const gotoClose = btn(T('Close', 'Fechar', 'Cerrar'));
    gotoClose.addEventListener('click', () => this.close());
    const gotoStatus = el('div', { role: 'status', style: 'font-size:13px;min-height:18px' });
    const syncGoto = (): void => {
      const w = gotoList.value as GoToWhat;
      memo.gotoWhat = w;
      const g = GOTO.find((x) => x[0] === w)!;
      gotoLabel.textContent = T(g[4], g[5], g[6]);
      gotoData.replaceChildren();
      const opts: string[] = w === 'bookmark' ? ed.getBookmarks().map((b) => b.name)
        : w === 'comment' ? [...new Set(ed.getComments().map((c) => c.author ?? '').filter(Boolean))]
          : w === 'field' ? ['PAGE', 'NUMPAGES', 'DATE', 'TIME', 'TOC', 'REF', 'PAGEREF', 'HYPERLINK', 'SEQ', 'STYLEREF', 'FILENAME', 'AUTHOR'] : [];
      for (const o of opts) gotoData.append(el('option', { value: o }));
      gotoNext.textContent = gotoInput.value.trim() && !/^[+-]/.test(gotoInput.value.trim()) ? T('Go To', 'Ir para', 'Ir a') : T('Next', 'Avançar', 'Siguiente');
      prevBtn.disabled = w === 'bookmark';
      gotoStatus.textContent = '';
    };
    gotoList.addEventListener('change', syncGoto);
    gotoInput.addEventListener('input', syncGoto);
    const go = (target: string): void => {
      const ok = ed.goTo(gotoList.value as GoToWhat, target);
      gotoStatus.textContent = ok ? '' : T('The item could not be found.', 'O item não foi encontrado.', 'No se encontró el elemento.');
      this.env.after();
    };
    gotoNext.addEventListener('click', () => go(gotoInput.value));
    prevBtn.addEventListener('click', () => go('-1'));
    gotoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(gotoInput.value); } });
    const gotoPane = el('div', { style: 'display:flex;flex-direction:column;gap:8px' },
      el('div', { style: 'display:flex;gap:12px' },
        el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, T('Go to what:', 'Ir para:', 'Ir a:'), gotoList),
        el('div', { style: 'flex:1;display:flex;flex-direction:column;gap:4px' }, gotoLabel, gotoInput, gotoData,
          el('div', { style: 'font-size:12px;opacity:.8', textContent: T('Enter + and - to move relative to the current location. Example: +4 will move forward four items.', 'Digite + e - para mover-se em relação à posição atual. Exemplo: +4 avançará quatro itens.', 'Escribe + y - para moverte en relación con la ubicación actual. Ejemplo: +4 avanzará cuatro elementos.') }))),
      gotoStatus,
      el('div', { style: 'display:flex;gap:6px;justify-content:flex-end' }, prevBtn, gotoNext, gotoClose));

    root.append(tabBar, findPane, gotoPane);
    this.els = { tabs, findRow, replRow, gotoPane, findPane, find, repl, findFmt, replFmt, more, moreBtn, status, replBtns, findBtns, checks, dir, gotoList, gotoInput, gotoLabel, gotoNext, gotoData };
    syncGoto();
    this.syncOpts();
    this.syncFormat();
    return root;
  }

  private show(tab: FindTab): void {
    this.tab = tab;
    const e = this.els;
    for (const [k, b] of Object.entries(e.tabs)) {
      const on = k === tab;
      b.setAttribute('aria-selected', String(on));
      b.style.fontWeight = on ? '600' : '';
      b.style.borderBottom = on ? '2px solid var(--uo-primary,#3a72c4)' : '2px solid transparent';
    }
    e.findPane.hidden = tab === 'goto';
    e.gotoPane.hidden = tab !== 'goto';
    const replace = tab === 'replace' && !this.env.ed.isProtected();
    e.replRow.hidden = !replace;
    e.replBtns.hidden = !replace;
    e.findBtns.hidden = replace;
    e.find.value = memo.find;
    const focus = tab === 'goto' ? e.gotoInput : e.find;
    queueMicrotask(() => { focus.focus(); focus.select(); });
  }

  /** Semelhantes / todas as formas / curingas se excluem (o Word desmarca os outros). */
  private syncOpts(): void {
    const c = this.els.checks, o = memo.opts;
    if (o.wildcards) { o.soundsLike = false; o.allForms = false; o.matchCase = false; o.wholeWord = false; }
    if (o.soundsLike) o.allForms = false;
    for (const [k, i] of Object.entries(c)) i.checked = !!o[k as keyof typeof o];
    // curingas: diferenciar/palavras inteiras/prefixo… não valem (o Word os desativa)
    for (const k of ['matchCase', 'wholeWord', 'prefix', 'suffix', 'ignorePunct', 'ignoreSpace', 'soundsLike', 'allForms']) {
      const i = c[k];
      if (i) i.disabled = !!o.wildcards || ((k === 'matchCase' || k === 'wholeWord' || k === 'prefix' || k === 'suffix' || k === 'ignorePunct' || k === 'ignoreSpace' || k === 'allForms') && !!o.soundsLike) || (k !== 'allForms' && k !== 'soundsLike' && !!o.allForms && k !== 'matchCase');
    }
  }

  private syncFormat(): void {
    const lang = this.env.lang;
    const f = formatSummary(memo.findFmt, lang), r = formatSummary(memo.replFmt, lang);
    this.els.findFmt.textContent = f ? `${tr(lang, 'Format:', 'Formato:', 'Formato:')} ${f}` : '';
    this.els.replFmt.textContent = r ? `${tr(lang, 'Format:', 'Formato:', 'Formato:')} ${r}` : '';
    const optsTxt = Object.entries(memo.opts).filter(([, v]) => v).length;
    this.els.moreBtn.title = optsTxt ? tr(lang, `${optsTxt} options on`, `${optsTxt} opções ligadas`, `${optsTxt} opciones activadas`) : '';
  }

  private query(): FindQuery {
    const f = memo.findFmt;
    return { text: this.els.find.value, ...memo.opts, ...(Object.keys(f).length ? { format: f } : {}) };
  }
  private runOpts(): FindRunOptions { return { direction: memo.dir }; }

  private setStatus(msg: string): void { this.els.status.textContent = msg; }

  private ready(): boolean {
    const q = this.query();
    if (!q.text && !q.format) { this.els.find.focus(); return false; }
    memo.find = q.text;
    return true;
  }

  private findNext(): void {
    if (!this.ready()) return;
    const { lang } = this.env;
    const r = this.env.ed.findNextMatch(this.query(), this.runOpts());
    this.setStatus(r.error ?? (r.found
      ? (r.wrapped ? tr(lang, 'Search continued from the beginning of the document.', 'A pesquisa continuou do início do documento.', 'La búsqueda continuó desde el principio del documento.') : '')
      : tr(lang, 'Finished searching the document. The search item was not found.', 'A pesquisa no documento terminou. O item não foi encontrado.', 'Se terminó de buscar en el documento. No se encontró el elemento buscado.')));
    this.env.after();
  }

  private replaceOne(): void {
    if (!this.ready()) return;
    memo.repl = this.els.repl.value;
    const r = this.env.ed.replaceMatch(this.query(), memo.repl, { ...this.runOpts(), ...(Object.keys(memo.replFmt).length ? { replaceFormat: memo.replFmt } : {}) });
    const lang = this.env.lang;
    this.setStatus(r.error ?? (r.found ? '' : tr(lang, 'Finished searching the document. The search item was not found.', 'A pesquisa no documento terminou. O item não foi encontrado.', 'Se terminó de buscar en el documento. No se encontró el elemento buscado.')));
    this.env.after();
  }

  private replaceAll(): void {
    if (!this.ready()) return;
    memo.repl = this.els.repl.value;
    const r = this.env.ed.replaceAllMatches(this.query(), memo.repl, { ...(Object.keys(memo.replFmt).length ? { replaceFormat: memo.replFmt } : {}) });
    const lang = this.env.lang;
    this.setStatus(r.error ?? (r.count ? tr(lang, `All done. We made ${r.count} replacements.`, `Concluído. Fizemos ${r.count} substituições.`, `Listo. Hicimos ${r.count} reemplazos.`)
      : tr(lang, 'We couldn’t find what you were looking for.', 'Não encontramos o que você estava procurando.', 'No encontramos lo que buscabas.')));
    this.env.after();
  }

  private highlightAll(): void {
    if (!this.ready()) return;
    const n = this.env.ed.highlightMatches(this.query());
    this.setStatus(tr(this.env.lang, `${n} items were found matching this criteria.`, `Foram encontrados ${n} itens que correspondem a esse critério.`, `Se encontraron ${n} elementos que coinciden con este criterio.`));
  }

  private findIn(within: 'document' | 'selection'): void {
    if (!this.ready()) return;
    const n = this.env.ed.selectAllMatches(this.query(), { within });
    this.setStatus(tr(this.env.lang, `${n} items were found matching this criteria.`, `Foram encontrados ${n} itens que correspondem a esse critério.`, `Se encontraron ${n} elementos que coinciden con este criterio.`));
    this.env.after();
  }

  // ───── Formatar e Especial ─────
  private target(): { input: HTMLInputElement; fmt: 'findFmt' | 'replFmt' } {
    return this.active === 'repl' && this.tab === 'replace' ? { input: this.els.repl, fmt: 'replFmt' } : { input: this.els.find, fmt: 'findFmt' };
  }

  private formatMenu(anchor: HTMLElement): void {
    const { lang } = this.env;
    const t = this.target();
    const f = memo[t.fmt];
    const hl = f.highlight;
    openMenu([
      { id: 'fmt:font', label: { en: 'Font…', pt: 'Fonte…', es: 'Fuente…' }, onClick: () => void this.fontFormat(t.fmt) },
      { id: 'fmt:style', label: { en: 'Style…', pt: 'Estilo…', es: 'Estilo…' }, onClick: () => void this.styleFormat(t.fmt) },
      // Realce: realce → sem realce → indiferente (como o Word)
      { id: 'fmt:hl', label: { en: 'Highlight', pt: 'Realce', es: 'Resaltado' }, checked: hl !== undefined, onClick: () => {
        const next = { ...f };
        if (hl === undefined) next.highlight = true; else if (hl) next.highlight = false; else delete next.highlight;
        memo[t.fmt] = next;
        this.syncFormat();
      } },
    ], { anchor, side: 'below' }, { lang, layer: this.env.layer });
  }

  private specialMenu(anchor: HTMLElement): void {
    const t = this.target();
    const list = t.fmt === 'replFmt' ? (memo.opts.wildcards ? [['\\n', 'Find What Expression', 'Expressão Localizada', 'Expresión buscada'] as [string, string, string, string], ...SPECIAL_REPL] : SPECIAL_REPL)
      : memo.opts.wildcards ? SPECIAL_WILD : SPECIAL_FIND;
    const items: MenuEntry[] = list.map(([code, en, pt, es]): MenuItem => ({ id: `sp:${code}`, label: { en, pt, es }, onClick: () => {
      const i = t.input;
      const s = i.selectionStart ?? i.value.length, e = i.selectionEnd ?? i.value.length;
      const ins = code === '\\n' ? '\\1' : code;
      i.value = i.value.slice(0, s) + ins + i.value.slice(e);
      i.focus();
      i.setSelectionRange(s + ins.length, s + ins.length);
      if (t.fmt === 'findFmt') memo.find = i.value; else memo.repl = i.value;
    } }));
    openMenu(items, { anchor, side: 'below' }, { lang: this.env.lang, layer: this.env.layer });
  }

  /** Formatar › Fonte: cada atributo "indiferente", sim ou não. */
  private async fontFormat(which: 'findFmt' | 'replFmt'): Promise<void> {
    const { lang } = this.env;
    const T = (en: string, pt: string, es: string): string => tr(lang, en, pt, es);
    const f = { ...memo[which] };
    const tri = (v: boolean | undefined): string => (v === undefined ? '' : v ? '1' : '0');
    const triSel = (label: string, v: boolean | undefined): { row: HTMLElement; get: () => boolean | undefined } => {
      const s = el('select', {}) as HTMLSelectElement;
      for (const [k, en, pt, es] of [['', '(any)', '(qualquer)', '(cualquiera)'], ['1', 'Yes', 'Sim', 'Sí'], ['0', 'No', 'Não', 'No']] as const) s.append(el('option', { value: k, textContent: T(en, pt, es) }));
      s.value = tri(v);
      return { row: el('label', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, label, s), get: () => (s.value === '' ? undefined : s.value === '1') };
    };
    const font = el('input', { type: 'text', value: f.font ?? '' });
    const size = el('input', { type: 'number', value: f.sizePt ? String(f.sizePt) : '', min: '1', max: '1638', step: '0.5', style: 'width:80px' });
    const color = el('input', { type: 'text', value: f.color ?? '', placeholder: 'RRGGBB', style: 'width:90px' });
    const fields = {
      bold: triSel(T('Bold', 'Negrito', 'Negrita'), f.bold), italic: triSel(T('Italic', 'Itálico', 'Cursiva'), f.italic), underline: triSel(T('Underline', 'Sublinhado', 'Subrayado'), f.underline),
      strike: triSel(T('Strikethrough', 'Tachado', 'Tachado'), f.strike), allCaps: triSel(T('All caps', 'Todas em maiúsculas', 'Mayúsculas'), f.allCaps),
      smallCaps: triSel(T('Small caps', 'Versalete', 'Versalitas'), f.smallCaps), hidden: triSel(T('Hidden', 'Oculto', 'Oculto'), f.hidden),
    };
    const va = el('select', {}) as HTMLSelectElement;
    for (const [k, en, pt, es] of [['', '(any)', '(qualquer)', '(cualquiera)'], ['superscript', 'Superscript', 'Sobrescrito', 'Superíndice'], ['subscript', 'Subscript', 'Subscrito', 'Subíndice']] as const) va.append(el('option', { value: k, textContent: T(en, pt, es) }));
    va.value = f.vertAlign ?? '';
    const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px;min-width:320px' },
      el('label', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, T('Font:', 'Fonte:', 'Fuente:'), font),
      el('label', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, T('Size:', 'Tamanho:', 'Tamaño:'), size),
      el('label', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, T('Font color:', 'Cor da fonte:', 'Color de fuente:'), color),
      ...Object.values(fields).map((x) => x.row),
      el('label', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, T('Position:', 'Posição:', 'Posición:'), va));
    const h = openDialog({ title: which === 'findFmt' ? T('Find Font', 'Localizar Fonte', 'Buscar fuente') : T('Replace Font', 'Substituir Fonte', 'Reemplazar fuente'), body, layer: this.env.layer, lang,
      actions: [{ id: 'cancel', label: { en: 'Cancel', pt: 'Cancelar', es: 'Cancelar' } }, { id: 'ok', label: 'OK', primary: true }] });
    if (await h.result !== 'ok') return;
    const out: FindFormat = { ...(f.highlight !== undefined ? { highlight: f.highlight } : {}), ...(f.paraStyle ? { paraStyle: f.paraStyle } : {}), ...(f.charStyle ? { charStyle: f.charStyle } : {}) };
    if (font.value.trim()) out.font = font.value.trim();
    const sz = parseFloat(size.value.replace(',', '.'));
    if (Number.isFinite(sz) && sz > 0) out.sizePt = sz;
    const hex = color.value.trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(hex)) out.color = hex.toUpperCase();
    for (const [k, x] of Object.entries(fields)) { const v = x.get(); if (v !== undefined) (out as Record<string, unknown>)[k] = v; }
    if (va.value) out.vertAlign = va.value as 'superscript';
    memo[which] = out;
    this.syncFormat();
  }

  /** Formatar › Estilo: o estilo procurado (ou o da substituição). */
  private async styleFormat(which: 'findFmt' | 'replFmt'): Promise<void> {
    const { ed, lang } = this.env;
    const T = (en: string, pt: string, es: string): string => tr(lang, en, pt, es);
    const styles = ed.listStyles('all');
    const sel = el('select', { size: 12, style: 'width:100%' }) as HTMLSelectElement;
    for (const s of styles) sel.append(el('option', { value: `${s.kind}:${s.id}`, textContent: s.name }));
    const f = memo[which];
    const cur = f.paraStyle ? styles.find((s) => s.id === f.paraStyle) : f.charStyle ? styles.find((s) => s.id === f.charStyle) : undefined;
    if (cur) sel.value = `${cur.kind}:${cur.id}`;
    const h = openDialog({ title: which === 'findFmt' ? T('Find Style', 'Localizar Estilo', 'Buscar estilo') : T('Replace Style', 'Substituir Estilo', 'Reemplazar estilo'), body: el('div', { style: 'min-width:300px' }, sel), layer: this.env.layer, lang,
      actions: [{ id: 'cancel', label: { en: 'Cancel', pt: 'Cancelar', es: 'Cancelar' } }, { id: 'ok', label: 'OK', primary: true }] });
    if (await h.result !== 'ok' || !sel.value) return;
    const [kind, id] = [sel.value.slice(0, sel.value.indexOf(':')), sel.value.slice(sel.value.indexOf(':') + 1)];
    const next = { ...f };
    delete next.paraStyle; delete next.charStyle;
    if (kind === 'character') next.charStyle = id; else next.paraStyle = id;
    memo[which] = next;
    this.syncFormat();
  }
}

// ───────────────────────── comandos e menus ─────────────────────────

/** Localizar ▾ (Localizar, Localização Avançada…, Ir para…). */
export function findMenu(): MenuEntry[] { return ['find', 'find:advanced', 'goto']; }

/** Selecionar ▾ (Selecionar Tudo, Selecionar Objetos, Selecionar Texto com Formatação Semelhante, Painel de Seleção…). */
export function selectMenu(): MenuEntry[] { return ['selectAll', 'select:objects', 'select:similar', 'pic:selectionPane']; }

export function registerFindCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const has = (m: string) => (): boolean => typeof (ed as unknown as Record<string, unknown>)[m] === 'function';
  const notComparing = (): boolean => !app.comparing;
  reg.add(
    { id: 'find:advanced', label: { en: 'Advanced Find…', pt: 'Localização Avançada…', es: 'Búsqueda avanzada…' }, icon: 'search', supports: has('findNextMatch'), isEnabled: notComparing, run: () => ctl.findDialog('find') },
    { id: 'goto', label: { en: 'Go To…', pt: 'Ir para…', es: 'Ir a…' }, icon: 'arrow_forward', shortcut: 'Ctrl+G', supports: has('goTo'), isEnabled: notComparing, run: () => ctl.findDialog('goto') },
    { id: 'goto:f5', label: { en: 'Go To…', pt: 'Ir para…', es: 'Ir a…' }, icon: 'arrow_forward', shortcut: 'F5', supports: has('goTo'), isEnabled: notComparing, run: () => ctl.findDialog('goto') },
    { id: 'select:objects', label: { en: 'Select Objects', pt: 'Selecionar Objetos', es: 'Seleccionar objetos' }, icon: 'select', supports: has('setSelectObjectsMode'), isEnabled: () => !app.comparing,
      isChecked: () => ed.isSelectObjectsMode(), run: () => { ed.setSelectObjectsMode(!ed.isSelectObjectsMode()); } },
    { id: 'select:similar', label: { en: 'Select Text with Similar Formatting', pt: 'Selecionar Texto com Formatação Semelhante', es: 'Seleccionar texto con formato similar' }, icon: 'select_all', supports: has('selectSimilarFormatting'), isEnabled: notComparing,
      run: () => { ed.selectSimilarFormatting(); } },
  );
}
