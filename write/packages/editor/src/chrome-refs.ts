// Diálogos da frente Links e referências: Indicador, Referência Cruzada (não
// modal, como no Word), Legenda (+ Novo Rótulo, Numeração, AutoLegenda), Índice
// de Ilustrações e Link (Página da Web, Neste documento, E-mail). Todos sobre o
// openDialog de @universal-office/ui; o editor faz o trabalho (API pública).
import { dialogTabs, openDialog, pickLabels, promptDialog, type UiLang } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type {
  CaptionFormat, CaptionNumbering, ChapterSeparator, CrossRefKind, CrossRefType, TabLeaderChoice, TofFormat,
} from './references.js';

export type RefsDialogKind = 'bookmark' | 'crossref' | 'caption' | 'tof' | 'link';

export interface RefsEnv {
  ed: UniversalWriteElement;
  app: WriteApp;
  layer: HTMLElement;
  lang: UiLang;
  /** Modificar estilo (diálogo da frente Estilos) */
  modifyStyle?: (id: string) => void;
  /** a barra guarda as configurações das legendas (como o Word no Normal) */
  saveCaptionSettings?: () => void;
  flash: (msg: string) => void;
}

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const select = (opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select');
  for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
  s.value = value;
  return s;
};
const check = (label: string, on: boolean): { box: HTMLLabelElement; input: HTMLInputElement } => {
  const input = el('input', { type: 'checkbox', checked: on });
  return { box: el('label', { className: 'uo-check' }, input, label), input };
};
const field = (label: string, ...kids: (Node | string)[]): HTMLLabelElement => el('label', { className: 'uo-field' }, el('span', {}, label), ...kids);
const button = (label: string): HTMLButtonElement => el('button', { type: 'button', className: 'uo-pill', textContent: label });

/** Lista de seleção simples (listbox): itens id/texto, clique escolhe, duplo clique confirma. */
function listBox(height = 180): {
  el: HTMLElement; set(items: { id: string; text: string }[], keep?: string | null): void; value(): string | undefined;
  onChange(f: () => void): void; onActivate(f: () => void): void;
} {
  const box = el('div', { tabIndex: 0, style: `height:${height}px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px;font-size:13px` });
  box.setAttribute('role', 'listbox');
  let items: { id: string; text: string }[] = [];
  let cur: string | undefined;
  let changed = (): void => {}, activated = (): void => {};
  const rows: HTMLElement[] = [];
  const sync = (): void => {
    rows.forEach((r, i) => {
      const on = items[i]!.id === cur;
      r.style.background = on ? 'color-mix(in srgb, var(--u-color-primary, #005bc0) 22%, transparent)' : '';
      r.setAttribute('aria-selected', String(on));
      if (on) r.scrollIntoView({ block: 'nearest' });
    });
  };
  box.addEventListener('keydown', (e) => {
    const i = items.findIndex((x) => x.id === cur);
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (e.key === 'Enter' && cur !== undefined) { e.preventDefault(); activated(); return; }
    if (!d || !items.length) return;
    e.preventDefault();
    cur = items[Math.max(0, Math.min(items.length - 1, i + d))]!.id;
    sync(); changed();
  });
  return {
    el: box,
    set(list, keep) {
      items = list;
      // null = nada escolhido (o Indicador abre com o nome vazio)
      cur = keep === null ? undefined : keep !== undefined && list.some((x) => x.id === keep) ? keep : list[0]?.id;
      rows.length = 0;
      box.replaceChildren(...list.map((it) => {
        // (id "#…" = cabeçalho de seção da lista: em negrito, não se escolhe)
        const head = it.id.startsWith('#');
        const r = el('div', { textContent: it.text, title: it.text.trim(), style: `padding:3px 6px;border-radius:4px;white-space:pre;overflow:hidden;text-overflow:ellipsis;${head ? 'font-weight:600;opacity:.8' : 'cursor:pointer'}` });
        r.setAttribute('role', head ? 'presentation' : 'option');
        if (!head) {
          r.addEventListener('click', () => { cur = it.id; sync(); changed(); });
          r.addEventListener('dblclick', () => { cur = it.id; sync(); activated(); });
        }
        rows.push(r);
        return r;
      }));
      sync();
    },
    value: () => cur,
    onChange: (f) => { changed = f; },
    onActivate: (f) => { activated = f; },
  };
}

const T = (env: RefsEnv) => (en: string, pt: string, es: string): string => pickLabels(env.lang, { en, pt, es });

// ───────────────────────── Indicador ─────────────────────────

/**
 * Diálogo Indicador (como no Word): nome, lista, classificar por Nome/Local,
 * indicadores ocultos; Adicionar (fecha), Excluir e Ir para (fica aberto). Mais a
 * opção "Mostrar indicadores" (colchetes cinza — opção própria, como no Word).
 */
export async function bookmarkDialog(env: RefsEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const name = el('input', { type: 'text', maxLength: 40, spellcheck: false });
  const list = listBox(170);
  const byName = el('input', { type: 'radio', name: 'bmsort', checked: true });
  const byLoc = el('input', { type: 'radio', name: 'bmsort' });
  const hidden = check(t('Hidden bookmarks', 'Indicadores ocultos', 'Marcadores ocultos'), false);
  const show = check(t('Show bookmarks', 'Mostrar indicadores', 'Mostrar marcadores'), ed.bookmarksShown());
  const fill = (keep?: string): void => {
    const bms = ed.getBookmarks({ hidden: hidden.input.checked, sort: byLoc.checked ? 'location' : 'name' });
    list.set(bms.map((b) => ({ id: b.name, text: b.name })), keep ?? null);
    sync();
  };
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:340px' },
    field(t('Bookmark name:', 'Nome do indicador:', 'Nombre del marcador:'), name),
    list.el,
    el('div', { style: 'display:flex;gap:14px;align-items:center;font-size:13px' }, t('Sort by:', 'Classificar por:', 'Ordenar por:'),
      el('label', { className: 'uo-check' }, byName, t('Name', 'Nome', 'Nombre')), el('label', { className: 'uo-check' }, byLoc, t('Location', 'Local', 'Ubicación'))),
    hidden.box, show.box);
  const h = openDialog({
    title: t('Bookmark', 'Indicador', 'Marcador'), icon: 'bookmark', body, layer: env.layer, lang: env.lang, width: 500,
    actions: [
      { id: 'goto', label: t('Go To', 'Ir para', 'Ir a') },
      { id: 'delete', label: t('Delete', 'Excluir', 'Eliminar') },
      { id: 'cancel', label: t('Cancel', 'Cancelar', 'Cancelar') },
      { id: 'add', label: t('Add', 'Adicionar', 'Agregar'), primary: true },
    ],
    onAction: (id) => {
      const n = name.value.trim();
      if (id === 'goto') { if (n) ed.goToBookmark(n); return false; }
      if (id === 'delete') { if (n && ed.deleteBookmark(n)) { name.value = ''; fill(); } return false; }
      if (id === 'add' && !ed.insertBookmark(n)) return false;
      return true;
    },
  });
  const btn = (id: string): HTMLButtonElement => h.el.querySelector(`[data-action="${id}"]`) as HTMLButtonElement;
  function sync(): void {
    const n = name.value.trim();
    const exists = !!n && ed.hasBookmark(n);
    btn('add').disabled = !ed.validBookmarkName(n);
    btn('goto').disabled = !exists;
    btn('delete').disabled = !exists;
  }
  list.onChange(() => { name.value = list.value() ?? ''; sync(); });
  list.onActivate(() => { const n = list.value(); if (n) ed.goToBookmark(n); });
  name.addEventListener('input', sync);
  for (const r of [byName, byLoc]) r.addEventListener('change', () => fill(list.value()));
  hidden.input.addEventListener('change', () => fill(list.value()));
  show.input.addEventListener('change', () => ed.showBookmarks(show.input.checked));
  fill();
  name.value = '';
  sync();
  await h.result;
}

// ───────────────────────── Referência Cruzada ─────────────────────────

const KIND_LABEL = (t: (en: string, pt: string, es: string) => string, type: CrossRefType, k: CrossRefKind): string => {
  const what = type === 'heading' ? t('Heading', 'título', 'título') : type === 'bookmark' ? t('Bookmark', 'indicador', 'marcador') : t('Paragraph', 'parágrafo', 'párrafo');
  switch (k) {
    case 'text': return type === 'heading' ? t('Heading text', 'Texto do título', 'Texto del título') : type === 'bookmark' ? t('Bookmark text', 'Texto do indicador', 'Texto del marcador') : t('Paragraph text', 'Texto do parágrafo', 'Texto del párrafo');
    case 'page': return t('Page number', 'Número da página', 'Número de página');
    case 'number': return type === 'heading' ? t('Heading number', 'Número do título', 'Número del título') : t('Paragraph number', 'Número do parágrafo', 'Número del párrafo');
    case 'numberNoContext': return `${type === 'heading' ? t('Heading number', 'Número do título', 'Número del título') : t('Paragraph number', 'Número do parágrafo', 'Número del párrafo')} ${t('(no context)', '(sem contexto)', '(sin contexto)')}`;
    case 'numberFullContext': return `${type === 'heading' ? t('Heading number', 'Número do título', 'Número del título') : t('Paragraph number', 'Número do parágrafo', 'Número del párrafo')} ${t('(full context)', '(contexto completo)', '(contexto completo)')}`;
    case 'position': return t('Above/below', 'Acima/abaixo', 'Más arriba o más abajo');
    case 'noteNumber': return type === 'endnote' ? t('Endnote number', 'Número da nota de fim', 'Número de nota al final') : t('Footnote number', 'Número da nota de rodapé', 'Número de nota al pie');
    case 'noteNumberFormatted': return `${type === 'endnote' ? t('Endnote number', 'Número da nota de fim', 'Número de nota al final') : t('Footnote number', 'Número da nota de rodapé', 'Número de nota al pie')} ${t('(formatted)', '(formatado)', '(con formato)')}`;
    case 'captionEntire': return t('Entire caption', 'Legenda inteira', 'Todo el título');
    case 'captionLabel': return t('Only label and number', 'Apenas rótulo e número', 'Solo rótulo y número');
    case 'captionText': return t('Only caption text', 'Apenas texto da legenda', 'Solo texto del título');
  }
  return what;
};

/**
 * Referência Cruzada (não modal, como no Word: fica aberto depois de Inserir):
 * tipo (item numerado, título, indicador, notas e os rótulos de legenda), o que
 * inserir, "Inserir como hiperlink", "Incluir acima/abaixo", "Separar números com"
 * e a lista de destinos.
 */
export async function crossRefDialog(env: RefsEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const labels = ed.getCaptionLabels().map((l) => l.name);
  const types: [string, string][] = [
    ['numbered', t('Numbered item', 'Item numerado', 'Elemento numerado')], ['heading', t('Heading', 'Título', 'Título')], ['bookmark', t('Bookmark', 'Indicador', 'Marcador')],
    ['footnote', t('Footnote', 'Nota de rodapé', 'Nota al pie')], ['endnote', t('Endnote', 'Nota de fim', 'Nota al final')],
    ...labels.map((l): [string, string] => [`caption:${l}`, l]),
  ];
  const type = select(types, 'heading');
  const kind = el('select');
  const link = check(t('Insert as hyperlink', 'Inserir como hiperlink', 'Insertar como hipervínculo'), true);
  const pos = check(t('Include above/below', 'Incluir acima/abaixo', 'Incluir más arriba o más abajo'), false);
  const sep = el('input', { type: 'text', maxLength: 5, style: 'width:60px' });
  const sepBox = check(t('Separate numbers with', 'Separar números com', 'Separar números con'), false);
  const list = listBox(200);
  const forWhich = el('span');
  const cur = (): { type: CrossRefType; label?: string } => {
    const v = type.value;
    return v.startsWith('caption:') ? { type: 'caption', label: v.slice(8) } : { type: v as CrossRefType };
  };
  const forLabel = (c: { type: CrossRefType; label?: string }): string => {
    switch (c.type) {
      case 'numbered': return t('For which numbered item:', 'Para qual item numerado:', 'Para qué elemento numerado:');
      case 'heading': return t('For which heading:', 'Para qual título:', 'Para qué título:');
      case 'bookmark': return t('For which bookmark:', 'Para qual indicador:', 'Para qué marcador:');
      case 'footnote': return t('For which footnote:', 'Para qual nota de rodapé:', 'Para qué nota al pie:');
      case 'endnote': return t('For which endnote:', 'Para qual nota de fim:', 'Para qué nota al final:');
      default: return t('For which caption:', 'Para qual legenda:', 'Para qué título:');
    }
  };
  const refill = (): void => {
    const c = cur();
    const kinds = ed.crossReferenceKinds(c.type);
    const keep = kinds.includes(kind.value as CrossRefKind) ? kind.value : kinds[0]!;
    kind.replaceChildren(...kinds.map((k) => el('option', { value: k, textContent: KIND_LABEL(t, c.type, k) })));
    kind.value = keep;
    forWhich.textContent = forLabel(c);
    list.set(ed.getCrossReferenceItems(c.type, c.label));
    syncOpts();
  };
  const syncOpts = (): void => {
    const k = kind.value as CrossRefKind;
    pos.input.disabled = k === 'position';
    const full = k === 'numberFullContext';
    sepBox.input.disabled = !full;
    sep.disabled = !full || !sepBox.input.checked;
  };
  type.addEventListener('change', refill);
  kind.addEventListener('change', syncOpts);
  sepBox.input.addEventListener('change', syncOpts);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:420px' },
    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' },
      field(t('Reference type:', 'Tipo de referência:', 'Tipo de referencia:'), type), field(t('Insert reference to:', 'Inserir referência para:', 'Insertar referencia a:'), kind)),
    el('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;align-items:center' }, link.box, pos.box),
    el('div', { style: 'display:flex;gap:8px;align-items:center' }, sepBox.box, sep),
    el('div', { style: 'font-size:13px' }, forWhich), list.el);
  const insert = (): boolean => {
    const c = cur(), item = list.value();
    if (!item) return false;
    const ok = ed.insertCrossReference({
      type: c.type, ...(c.label ? { label: c.label } : {}), item, kind: kind.value as CrossRefKind,
      hyperlink: link.input.checked, position: pos.input.checked && !pos.input.disabled,
      ...(sepBox.input.checked && !sep.disabled ? { separator: sep.value } : {}),
    });
    if (!ok) env.flash(t('The reference could not be inserted here', 'Não foi possível inserir a referência aqui', 'No se pudo insertar la referencia aquí'));
    return ok;
  };
  const h = openDialog({
    title: t('Cross-reference', 'Referência Cruzada', 'Referencia cruzada'), icon: 'arrow_outward', body, layer: env.layer, lang: env.lang, width: 520, modal: false,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar', 'Cancelar') }, { id: 'insert', label: t('Insert', 'Inserir', 'Insertar'), primary: true }],
    onAction: (id) => {
      if (id !== 'insert') return true;
      if (insert()) (h.el.querySelector('[data-action="cancel"]') as HTMLButtonElement).textContent = t('Close', 'Fechar', 'Cerrar');
      return false;
    },
  });
  // não modal (o documento segue clicável): centrado na janela, como o do Word
  h.el.style.cssText += ';position:fixed;inset:0;margin:auto;height:fit-content';
  list.onActivate(() => { if (insert()) (h.el.querySelector('[data-action="cancel"]') as HTMLButtonElement).textContent = t('Close', 'Fechar', 'Cerrar'); });
  refill();
  await h.result;
}

// ───────────────────────── Legenda ─────────────────────────

const FORMATS: [CaptionFormat, string][] = [['ARABIC', '1, 2, 3, …'], ['alphabetic', 'a, b, c, …'], ['ALPHABETIC', 'A, B, C, …'], ['roman', 'i, ii, iii, …'], ['ROMAN', 'I, II, III, …']];

/** Numeração da legenda: formato, número do capítulo (estilo do título e separador). */
async function numberingDialog(env: RefsEnv, label: string): Promise<void> {
  const t = T(env), ed = env.ed;
  const cur = ed.getCaptionNumbering(label);
  const fmt = select(FORMATS, cur.format);
  const chap = check(t('Include chapter number', 'Incluir número do capítulo', 'Incluir número de capítulo'), !!cur.chapter);
  const levels = select(Array.from({ length: 9 }, (_, i): [string, string] => [String(i + 1), t(`Heading ${i + 1}`, `Título ${i + 1}`, `Título ${i + 1}`)]), String(cur.chapter?.level ?? 1));
  const seps = select([
    ['hyphen', t('- (hyphen)', '- (hífen)', '- (guion)')], ['period', t('. (period)', '. (ponto)', '. (punto)')], ['colon', t(': (colon)', ': (dois-pontos)', ': (dos puntos)')],
    ['emDash', t('— (em dash)', '— (travessão)', '— (guion largo)')], ['enDash', t('– (en dash)', '– (meia-risca)', '– (semirraya)')],
  ], cur.chapter?.separator ?? 'hyphen');
  const sync = (): void => { levels.disabled = !chap.input.checked; seps.disabled = !chap.input.checked; };
  chap.input.addEventListener('change', sync);
  sync();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:320px' },
    field(t('Format:', 'Formato:', 'Formato:'), fmt), chap.box,
    field(t('Chapter starts with style:', 'Capítulo começa com estilo:', 'El capítulo empieza con el estilo:'), levels), field(t('Use separator:', 'Usar separador:', 'Usar separador:'), seps),
    el('div', { style: 'font-size:12px;opacity:.75' }, t('Examples: 1-1, 1.A', 'Exemplos: 1-1, 1.A', 'Ejemplos: 1-1, 1.A')));
  const h = openDialog({ title: t('Caption Numbering', 'Numeração de Legenda', 'Numeración de títulos'), body, layer: env.layer, lang: env.lang, width: 380,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const n: CaptionNumbering = { format: fmt.value as CaptionFormat, ...(chap.input.checked ? { chapter: { level: +levels.value, separator: seps.value as ChapterSeparator } } : {}) };
  ed.setCaptionNumbering(label, n);
  env.saveCaptionSettings?.();
}

/** AutoLegenda: legenda ao inserir uma tabela (o rótulo e a posição). */
async function autoCaptionDialog(env: RefsEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const cur = ed.getAutoCaption()?.table;
  const labels = ed.getCaptionLabels();
  const on = check(t('Table', 'Tabela', 'Tabla'), !!cur);
  const label = select(labels.map((l): [string, string] => [l.name, l.name]), cur?.label ?? labels.find((l) => l.position === 'above')?.name ?? labels[0]!.name);
  const pos = select([['above', t('Above item', 'Acima do item', 'Encima del elemento')], ['below', t('Below item', 'Abaixo do item', 'Debajo del elemento')]], cur?.position ?? 'above');
  const sync = (): void => { label.disabled = !on.input.checked; pos.disabled = !on.input.checked; };
  on.input.addEventListener('change', sync);
  sync();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:320px' },
    el('div', { style: 'font-size:13px' }, t('Add caption when inserting:', 'Adicionar legenda ao inserir:', 'Agregar título al insertar:')), on.box,
    field(t('Use label:', 'Usar rótulo:', 'Usar rótulo:'), label), field(t('Position:', 'Posição:', 'Posición:'), pos));
  const h = openDialog({ title: t('AutoCaption', 'AutoLegenda', 'Autotítulo'), body, layer: env.layer, lang: env.lang, width: 380,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  ed.setAutoCaption(on.input.checked ? { table: { label: label.value, position: pos.value as 'above' | 'below' } } : undefined);
  env.saveCaptionSettings?.();
}

/**
 * Legenda (como no Word): o texto começa com "Rótulo N" e o usuário completa;
 * rótulo, posição (com imagem ou tabela selecionada), excluir rótulo; Novo
 * Rótulo, Excluir Rótulo, Numeração e AutoLegenda.
 */
export async function captionDialog(env: RefsEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const target = ed.captionTarget();
  const labels = (): { name: string; builtIn: boolean; position: 'above' | 'below' }[] => ed.getCaptionLabels();
  const labelSel = el('select');
  const fillLabels = (keep?: string): void => {
    labelSel.replaceChildren(...labels().map((l) => el('option', { value: l.name, textContent: l.name })));
    labelSel.value = keep && labels().some((l) => l.name === keep) ? keep : (target === 'table' ? labels().find((l) => l.position === 'above')?.name : undefined) ?? labels()[0]!.name;
  };
  fillLabels();
  const pos = select([['above', t('Above selected item', 'Acima do item selecionado', 'Encima del elemento seleccionado')], ['below', t('Below selected item', 'Abaixo do item selecionado', 'Debajo del elemento seleccionado')]], 'below');
  pos.disabled = !target;
  const excl = check(t('Exclude label from caption', 'Excluir rótulo da legenda', 'Excluir el rótulo del título'), false);
  const caption = el('input', { type: 'text' });
  let prefix = '';
  const syncPrefix = (): void => {
    const l = labelSel.value;
    const text = caption.value.slice(prefix.length);
    prefix = `${excl.input.checked ? '' : `${l} `}${ed.nextCaptionNumber(l)}`;
    caption.value = prefix + text;
    const def = labels().find((x) => x.name === l)?.position ?? 'below';
    if (target) pos.value = def;
    delBtn.disabled = labels().find((x) => x.name === l)?.builtIn !== false;
  };
  caption.addEventListener('input', () => { if (!caption.value.startsWith(prefix)) caption.value = prefix + caption.value.slice(Math.min(prefix.length, caption.value.length)); });
  const newBtn = button(t('New Label…', 'Novo Rótulo…', 'Nuevo rótulo…'));
  const delBtn = button(t('Delete Label', 'Excluir Rótulo', 'Eliminar rótulo'));
  const numBtn = button(t('Numbering…', 'Numeração…', 'Numeración…'));
  const autoBtn = button(t('AutoCaption…', 'AutoLegenda…', 'Autotítulo…'));
  labelSel.addEventListener('change', syncPrefix);
  excl.input.addEventListener('change', syncPrefix);
  newBtn.addEventListener('click', () => {
    void promptDialog({ title: t('New Label', 'Novo Rótulo', 'Nuevo rótulo'), label: t('Label:', 'Rótulo:', 'Rótulo:'), layer: env.layer, lang: env.lang }).then((v) => {
      const n = v?.trim();
      if (!n) return;
      ed.addCaptionLabel(n);
      env.saveCaptionSettings?.();
      fillLabels(n);
      syncPrefix();
    });
  });
  delBtn.addEventListener('click', () => { if (ed.deleteCaptionLabel(labelSel.value)) { env.saveCaptionSettings?.(); fillLabels(); syncPrefix(); } });
  numBtn.addEventListener('click', () => { void numberingDialog(env, labelSel.value).then(syncPrefix); });
  autoBtn.addEventListener('click', () => { void autoCaptionDialog(env); });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:400px' },
    field(t('Caption:', 'Legenda:', 'Título:'), caption),
    el('strong', { style: 'font-size:13px' }, t('Options', 'Opções', 'Opciones')),
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, t('Label:', 'Rótulo:', 'Rótulo:')), labelSel, el('span', {}, t('Position:', 'Posição:', 'Posición:')), pos),
    excl.box,
    el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, newBtn, delBtn, numBtn, autoBtn));
  syncPrefix();
  const h = openDialog({ title: t('Caption', 'Legenda', 'Título'), icon: 'subtitles', body, layer: env.layer, lang: env.lang, width: 480,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true }] });
  queueMicrotask(() => { caption.focus(); caption.setSelectionRange(caption.value.length, caption.value.length); });
  if ((await h.result) !== 'ok') return;
  ed.insertCaption({ label: labelSel.value, title: caption.value.slice(prefix.length), excludeLabel: excl.input.checked, ...(target ? { position: pos.value as 'above' | 'below' } : {}) });
}

// ───────────────────────── Índice de Ilustrações ─────────────────────────

/**
 * Índice de Ilustrações (como no Word): mostrar/alinhar números de página,
 * preenchimento, hiperlinks, formatos (o estilo), nome da legenda e incluir rótulo
 * e número; Modificar abre o estilo "Índice de ilustrações". Com o cursor num
 * índice, abre com as opções dele e o substitui.
 */
export async function tofDialog(env: RefsEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const cur = ed.getTableOfFiguresOptions();
  const labels = ed.getCaptionLabels();
  const pages = check(t('Show page numbers', 'Mostrar números de página', 'Mostrar números de página'), cur?.pageNumbers ?? true);
  const right = check(t('Right align page numbers', 'Alinhar números de página à direita', 'Alinear números de página a la derecha'), cur?.rightAlign ?? true);
  const leader = select([['none', t('(none)', '(nenhum)', '(ninguno)')], ['dot', '.......'], ['hyphen', '-------'], ['underscore', '_______']], cur?.leader ?? 'dot');
  const links = check(t('Use hyperlinks instead of page numbers', 'Usar hiperlinks em vez de números de página', 'Usar hipervínculos en lugar de números de página'), cur?.hyperlinks ?? true);
  const format = select([
    ['template', t('From template', 'Do modelo', 'De plantilla')], ['classic', t('Classic', 'Clássico', 'Clásico')], ['distinctive', t('Distinctive', 'Elegante', 'Distintivo')],
    ['centered', t('Centered', 'Centralizado', 'Centrado')], ['formal', t('Formal', 'Formal', 'Formal')], ['simple', t('Simple', 'Simples', 'Sencillo')],
  ], 'template');
  const label = select([...labels.map((l): [string, string] => [l.name, l.name])], cur?.label ?? labels[0]!.name);
  const incl = check(t('Include label and number', 'Incluir rótulo e número', 'Incluir rótulo y número'), cur?.includeLabel ?? true);
  const preview = el('div', { style: 'border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:70px;display:flex;flex-direction:column;gap:2px' });
  const paint = (): void => {
    const lab = label.value;
    const lead = { none: ' ', dot: '.', hyphen: '-', underscore: '_' }[leader.value] ?? '.';
    preview.replaceChildren(...[1, 2, 3, 4].map((n) => {
      const txt = `${incl.input.checked ? `${lab} ${n}: ` : ''}${t('Text', 'Texto', 'Texto')}`;
      const row = el('div', { style: 'display:flex;gap:4px;white-space:nowrap' }, el('span', {}, txt));
      if (pages.input.checked && right.input.checked) row.append(el('span', { style: 'flex:1;overflow:hidden;opacity:.7', textContent: lead.repeat(200) }), el('span', {}, String(n * 2 - 1)));
      else if (pages.input.checked) row.append(el('span', {}, String(n * 2 - 1)));
      return row;
    }));
    right.input.disabled = !pages.input.checked;
    leader.disabled = !pages.input.checked || !right.input.checked;
  };
  for (const c of [pages.input, right.input, incl.input, links.input]) c.addEventListener('change', paint);
  for (const s of [leader, label, format]) s.addEventListener('change', paint);
  paint();
  const modify = button(t('Modify…', 'Modificar…', 'Modificar…'));
  modify.addEventListener('click', () => env.modifyStyle?.(ed.ensureBuiltinStyle('table of figures')));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:440px' },
    el('strong', { style: 'font-size:13px' }, t('Print Preview', 'Visualizar Impressão', 'Vista previa de impresión')), preview,
    pages.box, right.box, field(t('Tab leader:', 'Preenchimento de tabulação:', 'Carácter de relleno:'), leader), links.box,
    el('strong', { style: 'font-size:13px' }, t('General', 'Geral', 'General')),
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, t('Formats:', 'Formatos:', 'Formatos:')), format, el('span', {}, t('Caption label:', 'Nome da legenda:', 'Rótulo de título:')), label),
    incl.box, el('div', {}, modify));
  const h = openDialog({ title: t('Table of Figures', 'Índice de Ilustrações', 'Tabla de ilustraciones'), icon: 'list_alt', body, layer: env.layer, lang: env.lang, width: 520,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const ok = ed.insertTableOfFigures({
    label: label.value, includeLabel: incl.input.checked, pageNumbers: pages.input.checked, rightAlign: right.input.checked,
    leader: leader.value as TabLeaderChoice, hyperlinks: links.input.checked, format: format.value as TofFormat,
  });
  if (!ok) env.flash(t('The table of figures could not be inserted here', 'Não foi possível inserir o índice aqui', 'No se pudo insertar la tabla de ilustraciones aquí'));
}

// ───────────────────────── Link ─────────────────────────

/**
 * Inserir/Editar Hiperlink: Página da Web ou arquivo, Neste documento (Início do
 * documento, Títulos, Indicadores) e Endereço de e-mail; Texto para exibição e
 * Dica de Tela; Remover Link quando o cursor está num link.
 */
export async function hyperlinkDialog(env: RefsEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const cur = ed.getLink();
  const sel = ed.selectedText();
  const display = el('input', { type: 'text', value: cur?.text ?? sel ?? '' });
  const tip = el('input', { type: 'text', value: cur?.tip ?? '' });
  const isMail = !!cur?.address?.startsWith('mailto:');
  const address = el('input', { type: 'text', value: cur?.address && !isMail ? cur.address : 'https://', spellcheck: false });
  const mail = el('input', { type: 'text', value: isMail ? decodeURIComponent(cur!.address!.slice(7).split('?')[0]!) : '', spellcheck: false });
  const subject = el('input', { type: 'text', value: isMail ? decodeURIComponent(/[?&]subject=([^&]*)/i.exec(cur!.address!)?.[1] ?? '') : '' });
  const targets = ed.getLinkTargets();
  const place = listBox(220);
  const items = [
    { id: '_top', text: t('Top of the Document', 'Início do documento', 'Principio del documento') },
    ...(targets.headings.length ? [{ id: '', text: t('Headings', 'Títulos', 'Títulos') }] : []),
    ...targets.headings.map((hd) => ({ id: hd.id, text: `${'  '.repeat(hd.level)}${hd.text}` })),
    ...(targets.bookmarks.length ? [{ id: '', text: t('Bookmarks', 'Indicadores', 'Marcadores') }] : []),
    ...targets.bookmarks.map((b) => ({ id: b, text: `  ${b}` })),
  ];
  place.set(items.map((x, i) => ({ id: x.id || `#sec${i}`, text: x.text })), cur?.anchor && items.some((x) => x.id === cur.anchor) ? cur.anchor : '_top');
  const panes = {
    web: el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, field(t('Address:', 'Endereço:', 'Dirección:'), address)),
    place: el('div', { style: 'display:flex;flex-direction:column;gap:6px' }, el('span', { style: 'font-size:13px' }, t('Select a place in this document:', 'Selecione um local neste documento:', 'Selecciona un lugar de este documento:')), place.el),
    mail: el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, field(t('E-mail address:', 'Endereço de email:', 'Dirección de correo electrónico:'), mail), field(t('Subject:', 'Assunto:', 'Asunto:'), subject)),
  };
  const tabs = dialogTabs([
    { id: 'web', label: t('Existing File or Web Page', 'Página da Web ou arquivo', 'Archivo o página web existente'), body: panes.web },
    { id: 'place', label: t('Place in This Document', 'Colocar neste documento', 'Lugar de este documento'), body: panes.place },
    { id: 'mail', label: t('E-mail Address', 'Endereço de email', 'Dirección de correo electrónico'), body: panes.mail },
  ], cur?.anchor ? 'place' : isMail ? 'mail' : 'web');
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:460px' },
    field(t('Text to display:', 'Texto para exibição:', 'Texto que se mostrará:'), display),
    tabs.el,
    field(t('ScreenTip:', 'Dica de Tela:', 'Información en pantalla:'), tip));
  const h = openDialog({
    title: cur ? t('Edit Hyperlink', 'Editar Hiperlink', 'Modificar hipervínculo') : t('Insert Hyperlink', 'Inserir Hiperlink', 'Insertar hipervínculo'), icon: 'link', body, layer: env.layer, lang: env.lang, width: 560,
    actions: [
      ...(cur ? [{ id: 'remove', label: t('Remove Link', 'Remover Link', 'Quitar vínculo') }] : []),
      { id: 'cancel', label: t('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true },
    ],
  });
  const r = await h.result;
  if (r === 'remove') { ed.removeLink(); return; }
  if (r !== 'ok') return;
  const text = display.value;
  const opts = { tip: tip.value.trim() || undefined, ...(text && text !== (cur?.text ?? sel ?? '') ? { text } : text && !sel && !cur ? { text } : {}) };
  const tab = tabs.current();
  if (tab === 'place') {
    const id = place.value();
    if (!id || id.startsWith('#sec')) return;
    ed.insertHyperlink({ anchor: id, ...opts });
  } else if (tab === 'mail') {
    const a = mail.value.trim();
    if (!a) return;
    ed.insertHyperlink({ address: `mailto:${a.replace(/^mailto:/i, '')}${subject.value.trim() ? `?subject=${encodeURIComponent(subject.value.trim())}` : ''}`, ...opts });
  } else {
    const a = address.value.trim();
    if (!a || a === 'https://') return;
    ed.insertHyperlink({ address: a, ...opts });
  }
}

/** Abre o diálogo pedido (a barra chama). */
export function refsDialog(env: RefsEnv, kind: RefsDialogKind): Promise<void> {
  switch (kind) {
    case 'bookmark': return bookmarkDialog(env);
    case 'crossref': return crossRefDialog(env);
    case 'caption': return captionDialog(env);
    case 'tof': return tofDialog(env);
    case 'link': return hyperlinkDialog(env);
  }
}
