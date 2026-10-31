// ÁREA DE TRANSFERÊNCIA da guia Página Inicial: o menu do botão Colar (Opções de Colagem,
// Colar Especial, Definir Colagem Padrão), o botão flutuante Opções de Colagem depois de
// colar (Ctrl abre; K, M, T, U escolhem), o diálogo Colar Especial (Ctrl+Alt+V), as
// opções padrão do colar e o painel Área de Transferência (os 24 últimos itens). Só
// DECLARA sobre a API pública do <universal-write>; regras medidas em write/tools/home-lab
// (exp-paste.ps1).
import {
  closeMenus, openDialog, openMenu, openPane, paneOpen, pickLabels, symbol,
  type BarContext, type Command, type CommandRegistry, type MenuEntry, type UiLang,
} from '@universal-office/ui';
import type { ListPasteMode, PasteMode, PasteSpecialFormat, UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import type { DialogEnv } from './chrome-dialogs.js';

const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });
const tr = (lang: UiLang, en: string, pt: string, es: string): string => pickLabels(lang, { en, pt, es });

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};

/** As opções de colagem do Word: rótulo, ícone e a tecla (depois do Ctrl). */
export const PASTE_MODES: Record<Exclude<PasteMode, 'default'>, { label: { en: string; pt: string; es: string }; icon: string; key: string }> = {
  keep: { label: L('Keep Source Formatting (K)', 'Manter Formatação Original (K)', 'Mantener formato de origen (K)'), icon: 'content_paste', key: 'k' },
  merge: { label: L('Merge Formatting (M)', 'Mesclar Formatação (M)', 'Combinar formato (M)'), icon: 'format_paint', key: 'm' },
  picture: { label: L('Picture (U)', 'Imagem (U)', 'Imagen (U)'), icon: 'image', key: 'u' },
  text: { label: L('Keep Text Only (T)', 'Manter Somente Texto (T)', 'Mantener solo texto (T)'), icon: 'text_fields', key: 't' },
};
export const LIST_PASTE: Record<ListPasteMode, { label: { en: string; pt: string; es: string }; icon: string; key: string }> = {
  continue: { label: L('Continue List (C)', 'Continuar Lista (C)', 'Continuar lista (C)'), icon: 'format_list_numbered', key: 'c' },
  new: { label: L('New List (N)', 'Nova Lista (N)', 'Nueva lista (N)'), icon: 'restart_alt', key: 'n' },
  merge: { label: L('Merge List (M)', 'Mesclar Lista (M)', 'Combinar lista (M)'), icon: 'format_list_numbered', key: 'm' },
  nomerge: { label: L("Don't Merge List (N)", 'Não Mesclar Lista (N)', 'No combinar lista (N)'), icon: 'restart_alt', key: 'n' },
};

/** Itens do menu de opções de colagem (o botão Colar e o botão flutuante). */
function optionItems(ed: UniversalWriteElement, after: () => void, afterPaste: boolean): MenuEntry[] {
  const o = ed.pasteOptions();
  const out: MenuEntry[] = [];
  const modes: Exclude<PasteMode, 'default'>[] = afterPaste ? (o.modes.filter((m) => m !== 'default') as Exclude<PasteMode, 'default'>[]) : ['keep', 'merge', 'picture', 'text'];
  for (const m of modes) {
    const d = PASTE_MODES[m];
    out.push({ id: `paste:opt:${m}`, label: d.label, icon: d.icon, checked: afterPaste && o.current === m, onClick: () => { if (afterPaste) ed.repaste(m); else void ed.paste(m).then(after); after(); } });
  }
  if (afterPaste && o.list.length) {
    out.push('-');
    for (const l of o.list) {
      const d = LIST_PASTE[l];
      out.push({ id: `paste:list:${l}`, label: d.label, icon: d.icon, checked: o.currentList === l, onClick: () => { ed.repaste(o.current ?? 'keep', l); after(); } });
    }
  }
  return out;
}

/** Menu do botão dividido Colar: as opções de colagem, Colar Especial, Definir Colagem Padrão. */
export function pasteMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  return [
    { content: () => optionStrip(env.ed, ctx), id: 'paste:strip' },
    '-', 'paste:special', 'paste:defaults',
  ];
}

/** As opções como uma faixa de ícones (como no Word), com o rótulo na dica. */
function optionStrip(ed: UniversalWriteElement, ctx: BarContext): HTMLElement {
  const box = el('div', { style: 'display:flex;flex-direction:column;gap:4px;padding:4px 10px' });
  box.append(el('div', { className: 'uo-tiles-h', textContent: ctx.registry.text(L('Paste Options:', 'Opções de Colagem:', 'Opciones de pegado:')) }));
  const row = el('div', { style: 'display:flex;gap:4px' });
  for (const m of ['keep', 'merge', 'picture', 'text'] as const) {
    const d = PASTE_MODES[m];
    const b = el('button', { type: 'button', className: 'uo-btn', title: ctx.registry.text(d.label), style: 'width:34px;height:34px' });
    b.setAttribute('aria-label', ctx.registry.text(d.label));
    b.dataset['a'] = `paste:opt:${m}`;
    b.innerHTML = symbol(d.icon);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => { void ed.paste(m).then(() => ctx.after()); });
    row.append(b);
  }
  box.append(row);
  return box;
}

export function registerClipboardCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const has = (m: string) => (): boolean => typeof (ed as unknown as Record<string, unknown>)[m] === 'function';
  const cmds: Command[] = [
    ...(['keep', 'merge', 'picture', 'text'] as const).map((m): Command => ({
      id: `paste:${m}`, label: PASTE_MODES[m].label, icon: PASTE_MODES[m].icon, supports: has('repaste'), isEnabled: canEdit, run: () => ed.paste(m),
    })),
    { id: 'paste:special', label: L('Paste Special…', 'Colar Especial...', 'Pegado especial…'), icon: 'content_paste_go', shortcut: 'Ctrl+Alt+V', supports: has('pasteSpecial'), isEnabled: canEdit, run: () => ctl.clipboard('special') },
    { id: 'paste:defaults', label: L('Set Default Paste…', 'Definir Colagem Padrão...', 'Establecer pegado predeterminado…'), icon: 'settings', supports: has('repaste'), run: () => ctl.clipboard('defaults') },
    { id: 'clipboard:pane', label: L('Clipboard', 'Área de Transferência', 'Portapapeles'), icon: 'content_paste', supports: has('clipboardItems'), isChecked: () => !!paneOpen('uw-clipboard'), run: () => ctl.clipboard('pane') },
  ];
  reg.add(...cmds);
}

export type ClipboardUiKind = 'special' | 'defaults' | 'pane';

/** Painel, botão flutuante e diálogos da Área de Transferência. */
export class ClipboardUI {
  private btn: HTMLButtonElement | null = null;
  private off: (() => void) | null = null;
  constructor(private env: { ed: UniversalWriteElement; app: WriteApp; lang: UiLang; layer: HTMLElement; frame: () => DOMRect; after: () => void; dialog: () => DialogEnv; signal: AbortSignal }) {
    const { ed, signal } = env;
    // a barra desmontada leva junto o botão e os ouvintes
    signal.addEventListener('abort', () => { this.hideButton(); this.off?.(); });
    // padrões do colar guardados (Definir Colagem Padrão)
    const saved = env.app.prefs.get('pasteDefaults');
    if (saved) { try { Object.assign(ed.pasteDefaults, JSON.parse(saved)); } catch { /* ignora */ } }
    ed.addEventListener('uw-pasted', () => this.showButton(), { signal });
    ed.addEventListener('uw-paste-options', () => this.openOptions(), { signal });
    ed.addEventListener('uw-paste-special', () => { void this.special(); }, { signal });
  }

  /** O botão some quando a colagem não dá mais para refazer (outra edição). */
  sync(): void {
    if (this.btn && !this.env.ed.pasteOptions().modes.length) this.hideButton();
    else if (this.btn) this.placeButton();
  }

  private showButton(): void {
    const o = this.env.ed.pasteOptions();
    if (!o.modes.length) { this.hideButton(); return; }
    if (!this.btn) {
      const b = el('button', { type: 'button', className: 'uo-btn uw-paste-btn', style: 'position:fixed;z-index:30;height:24px;min-width:34px;padding:0 4px;border-radius:4px;border:1px solid color-mix(in srgb, currentColor 30%, transparent);background:var(--uo-surface, #fff);display:inline-flex;align-items:center;gap:2px;box-shadow:0 1px 3px rgba(0,0,0,.2)' });
      b.innerHTML = `${symbol('content_paste')}<span style="font-size:11px">(Ctrl)</span>`;
      b.title = tr(this.env.lang, 'Paste Options', 'Opções de Colagem', 'Opciones de pegado');
      b.setAttribute('aria-label', b.title);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => this.openOptions());
      this.env.layer.append(b);
      this.btn = b;
    }
    this.placeButton();
  }
  private placeButton(): void {
    const r = this.env.ed.pasteButtonRect();
    if (!r || !this.btn) { this.btn && (this.btn.style.display = 'none'); return; }
    this.btn.style.display = '';
    this.btn.style.left = `${Math.round(r.x)}px`;
    this.btn.style.top = `${Math.round(r.y)}px`;
  }
  private hideButton(): void { this.btn?.remove(); this.btn = null; }

  /** Menu das opções (clique no botão ou Ctrl): as teclas K, M, T, U (e C/N das listas) escolhem. */
  private openOptions(): void {
    const { ed, lang, layer } = this.env;
    if (!this.btn) this.showButton();
    const r = this.btn?.getBoundingClientRect() ?? ed.getBoundingClientRect();
    const items = optionItems(ed, () => this.env.after(), true);
    openMenu(items, { x: r.left, y: r.bottom + 2 }, { lang, layer, onClose: () => { window.removeEventListener('keydown', keys, true); this.env.after(); } });
    const o = ed.pasteOptions();
    const keys = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      const m = (Object.keys(PASTE_MODES) as Exclude<PasteMode, 'default'>[]).find((x) => PASTE_MODES[x].key === k && o.modes.includes(x));
      const l = o.list.find((x) => LIST_PASTE[x].key === k && !(k === 'm' && m));
      if (!m && !l) return;
      e.preventDefault(); e.stopPropagation();
      closeMenus();
      if (l) ed.repaste(o.current ?? 'keep', l); else if (m) ed.repaste(m);
      this.env.after();
    };
    window.addEventListener('keydown', keys, true);
  }

  async run(kind: ClipboardUiKind): Promise<void> {
    if (kind === 'special') await this.special();
    else if (kind === 'defaults') await this.defaults();
    else this.togglePane();
  }

  /** Colar Especial: Colar / Colar vínculo e os formatos do que está copiado. */
  private async special(): Promise<void> {
    const { ed, lang } = this.env;
    const info = await ed.pasteSpecialFormats();
    if (!info.formats.length) return;
    const NAMES: Record<PasteSpecialFormat, [string, string, string]> = {
      rtf: ['Formatted Text (RTF)', 'Texto Formatado (RTF)', 'Texto con formato (RTF)'], text: ['Unformatted Text', 'Texto não formatado', 'Texto sin formato'],
      picture: ['Picture (PNG)', 'Imagem (PNG)', 'Imagen (PNG)'], html: ['HTML Format', 'Formato HTML', 'Formato HTML'],
      unicode: ['Unformatted Unicode Text', 'Texto Unicode não formatado', 'Texto Unicode sin formato'], image: ['Bitmap', 'Bitmap', 'Mapa de bits'],
    };
    const HINTS: Record<PasteSpecialFormat, [string, string, string]> = {
      rtf: ['Inserts the contents of the Clipboard as text with font and table formatting.', 'Insere o conteúdo da Área de Transferência como texto com formatação de fonte e tabela.', 'Inserta el contenido del Portapapeles como texto con formato de fuente y de tabla.'],
      text: ['Inserts the contents of the Clipboard as text without any formatting.', 'Insere o conteúdo da Área de Transferência como texto sem nenhuma formatação.', 'Inserta el contenido del Portapapeles como texto sin formato.'],
      picture: ['Inserts the contents of the Clipboard as a picture.', 'Insere o conteúdo da Área de Transferência como uma imagem.', 'Inserta el contenido del Portapapeles como imagen.'],
      html: ['Inserts the contents of the Clipboard as HTML Format.', 'Insere o conteúdo da Área de Transferência como Formato HTML.', 'Inserta el contenido del Portapapeles en formato HTML.'],
      unicode: ['Inserts the contents of the Clipboard as text without any formatting.', 'Insere o conteúdo da Área de Transferência como texto sem nenhuma formatação.', 'Inserta el contenido del Portapapeles como texto sin formato.'],
      image: ['Inserts the contents of the Clipboard as a picture.', 'Insere o conteúdo da Área de Transferência como uma imagem.', 'Inserta el contenido del Portapapeles como imagen.'],
    };
    const radio = (v: string, label: string, on: boolean, disabled = false): { el: HTMLLabelElement; input: HTMLInputElement } => {
      const input = el('input', { type: 'radio', name: 'uw-pspec', value: v, checked: on, disabled });
      return { el: el('label', { className: 'uo-check' }, input, label), input };
    };
    const paste = radio('paste', tr(lang, 'Paste:', 'Colar:', 'Pegar:'), true);
    const link = radio('link', tr(lang, 'Paste link:', 'Colar vínculo:', 'Pegar vínculo:'), false, !info.link);
    const list = el('select', { size: Math.max(4, info.formats.length), style: 'width:100%;height:auto' });
    for (const f of info.formats) list.append(el('option', { value: f, textContent: tr(lang, NAMES[f][0], NAMES[f][1], NAMES[f][2]) }));
    list.value = info.formats[0]!;
    const hint = el('div', { style: 'font-size:12px;opacity:.85;min-height:32px' });
    const src = el('div', { style: 'font-size:12px;opacity:.85;word-break:break-all', textContent: info.source ? `${tr(lang, 'Source:', 'Origem:', 'Origen:')} ${info.source}` : '' });
    const sync = (): void => {
      // vínculo só com os formatos de texto
      for (const op of list.options) op.disabled = link.input.checked && !['rtf', 'html', 'text', 'unicode'].includes(op.value);
      if (list.selectedOptions[0]?.disabled) list.value = 'rtf';
      const f = list.value as PasteSpecialFormat;
      hint.textContent = HINTS[f] ? tr(lang, HINTS[f][0], HINTS[f][1], HINTS[f][2]) : '';
    };
    list.addEventListener('change', sync);
    paste.input.addEventListener('change', sync);
    link.input.addEventListener('change', sync);
    list.addEventListener('dblclick', () => h.close('ok'));
    sync();
    const body = el('div', { style: 'display:flex;gap:16px' },
      el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:130px' }, src, paste.el, link.el),
      el('div', { style: 'display:flex;flex-direction:column;gap:8px;flex:1' }, tr(lang, 'As:', 'Como:', 'Como:'), list, hint));
    const h = openDialog({ title: tr(lang, 'Paste Special', 'Colar Especial', 'Pegado especial'), body, layer: this.env.layer, lang, width: 520,
      actions: [{ id: 'cancel', label: this.env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
    if ((await h.result) !== 'ok') return;
    await ed.pasteSpecial(list.value as PasteSpecialFormat, { link: link.input.checked });
    this.env.after();
  }

  /** Definir Colagem Padrão (Opções › Avançado › Recortar, copiar e colar do Word). */
  private async defaults(): Promise<void> {
    const { ed, lang } = this.env;
    const opts: [PasteMode, string][] = [['keep', tr(lang, 'Keep Source Formatting (Default)', 'Manter Formatação Original (Padrão)', 'Mantener formato de origen (predeterminado)')], ['merge', tr(lang, 'Merge Formatting', 'Mesclar Formatação', 'Combinar formato')], ['text', tr(lang, 'Keep Text Only', 'Manter Somente Texto', 'Mantener solo texto')]];
    const sel = (v: PasteMode, extra: [PasteMode, string][] = []): HTMLSelectElement => {
      const s = el('select', { style: 'min-width:260px' });
      for (const [k, t] of [...extra, ...opts]) s.append(el('option', { value: k, textContent: t }));
      s.value = v;
      return s;
    };
    const within = sel(ed.pasteDefaults.within), between = sel(ed.pasteDefaults.between);
    const other = sel(ed.pasteDefaults.other, [['default', tr(lang, 'Use Destination Styles (Default)', 'Usar Estilos de Destino (Padrão)', 'Usar estilos de destino (predeterminado)')]]);
    const body = el('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center' },
      tr(lang, 'Pasting within the same document:', 'Colar no mesmo documento:', 'Pegar en el mismo documento:'), within,
      tr(lang, 'Pasting between documents:', 'Colar entre documentos:', 'Pegar entre documentos:'), between,
      tr(lang, 'Pasting from other programs:', 'Colar de outros programas:', 'Pegar desde otros programas:'), other);
    const h = openDialog({ title: tr(lang, 'Cut, copy, and paste', 'Recortar, copiar e colar', 'Cortar, copiar y pegar'), body, layer: this.env.layer, lang, width: 560,
      actions: [{ id: 'cancel', label: this.env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
    if ((await h.result) !== 'ok') return;
    ed.pasteDefaults = { within: within.value as PasteMode, between: between.value as PasteMode, other: other.value as PasteMode };
    this.env.app.prefs.set('pasteDefaults', JSON.stringify(ed.pasteDefaults));
  }

  get paneIsOpen(): boolean { return !!paneOpen('uw-clipboard'); }

  /** Painel Área de Transferência: os itens copiados (o mais novo em cima), Colar Tudo, Limpar Tudo. */
  togglePane(): void {
    const { ed, lang } = this.env;
    const cur = paneOpen('uw-clipboard');
    if (cur) { cur.close(); return; }
    const count = el('div', { style: 'font-size:12px;opacity:.8' });
    const all = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Paste All', 'Colar Tudo', 'Pegar todo') });
    const clear = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Clear All', 'Limpar Tudo', 'Borrar todo') });
    const list = el('div', { style: 'display:flex;flex-direction:column;gap:6px;overflow:auto' });
    const hint = el('div', { style: 'font-size:12px;opacity:.75', textContent: tr(lang, 'Click an item to paste.', 'Clique em um item para colar.', 'Haz clic en un elemento para pegarlo.') });
    const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px;padding:4px;height:100%;box-sizing:border-box' }, count, el('div', { style: 'display:flex;gap:8px' }, all, clear), hint, list);
    all.addEventListener('click', () => { ed.pasteAllClipboardItems(); this.env.after(); });
    clear.addEventListener('click', () => { ed.clearClipboardItems(); });
    const render = (): void => {
      const items = ed.clipboardItems();
      count.textContent = tr(lang, `${items.length} of 24 - Clipboard`, `${items.length} de 24 - Área de Transferência`, `${items.length} de 24 - Portapapeles`);
      all.disabled = clear.disabled = !items.length;
      hint.textContent = items.length ? tr(lang, 'Click an item to paste.', 'Clique em um item para colar.', 'Haz clic en un elemento para pegarlo.') : tr(lang, 'The Clipboard is empty. Copy or cut to collect items.', 'A Área de Transferência está vazia. Copie ou recorte para coletar itens.', 'El Portapapeles está vacío. Copia o corta para recopilar elementos.');
      list.replaceChildren(...items.map((it) => {
        const ico = it.kind === 'table' ? 'table' : it.kind === 'drawing' || it.kind === 'image' ? 'image' : 'content_copy';
        const txt = it.text.replace(/\s+/g, ' ').trim() || tr(lang, it.kind === 'drawing' || it.kind === 'image' ? '(picture)' : '(item)', it.kind === 'drawing' || it.kind === 'image' ? '(imagem)' : '(item)', it.kind === 'drawing' || it.kind === 'image' ? '(imagen)' : '(elemento)');
        const b = el('button', { type: 'button', className: 'uo-btn uw-clip-item', title: txt.slice(0, 300), style: 'display:flex;align-items:flex-start;gap:8px;text-align:left;width:100%;height:auto;padding:6px;border:1px solid color-mix(in srgb, currentColor 18%, transparent);border-radius:6px' });
        b.innerHTML = symbol(ico);
        b.append(el('span', { textContent: txt.length > 120 ? `${txt.slice(0, 120)}…` : txt, style: 'flex:1;font-size:12px;line-height:1.35;overflow:hidden' }));
        b.dataset['id'] = String(it.id);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { ed.pasteClipboardItem(it.id); this.env.after(); });
        b.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          openMenu([
            { id: 'clip:paste', label: L('Paste', 'Colar', 'Pegar'), icon: 'content_paste', onClick: () => { ed.pasteClipboardItem(it.id); this.env.after(); } },
            { id: 'clip:delete', label: L('Delete', 'Excluir', 'Eliminar'), icon: 'delete', onClick: () => ed.removeClipboardItem(it.id) },
          ], { x: e.clientX, y: e.clientY }, { lang, layer: this.env.layer });
        });
        return b;
      }));
    };
    this.off?.();
    this.off = ed.onClipboardChange(render);
    render();
    openPane({
      id: 'uw-clipboard', title: L('Clipboard', 'Área de Transferência', 'Portapapeles'), lang, layer: this.env.layer, frame: this.env.frame, dock: 'left', width: 280, body,
      onClose: () => { this.off?.(); this.off = null; ed.classList.remove('uw-has-pane'); this.env.after(); },
    });
    ed.classList.add('uw-has-pane');
  }
}
