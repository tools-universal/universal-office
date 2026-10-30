// Estado e ações de APLICATIVO das barras do <universal-write> (o que antes
// vivia no demo): abrir/salvar com File System Access ou o host, alterações
// não salvas, salvamento automático, recentes, Modo Protegido + documentos
// confiáveis, exportações e comparação. Um por elemento — sobrevive à troca
// de barra (compacta ↔ ribbon) e à mudança de idioma.
import { isOdt } from '@universal-office/docx-core';
import { describeFontEmbedding, openDialog, openFontEmbeddingDialog, showToast, uiLang, type UiLang } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import { hostOf, type UniversalWriteHostFile, type UniversalWriteHostSaved } from './chrome-host.js';
import type { ChromeLabels } from './chrome-labels.js';
import { listRecents, recentsSupported, rememberRecent, ensureReadable, forgetRecent, type RecentFile } from './chrome-recents.js';
import { isColorMode, type ColorMode } from './chrome-theme.js';
import { instanceStore, originStore as store } from './chrome-store.js';

export type DocFormat = 'docx' | 'odt';
const MIME: Record<DocFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
};

type Picker = {
  showOpenFilePicker?: (o: object) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (o: object) => Promise<FileSystemFileHandle>;
};
const picker = (): Picker => (typeof window !== 'undefined' ? window as unknown as Picker : {});

export function download(data: BlobPart, name: string, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Interface que a barra montada no momento entrega ao app. */
export interface AppUi {
  L: ChromeLabels;
  layer: HTMLElement;
  /** mensagem curta (status da barra inferior ou aviso flutuante) */
  flash(msg: string): void;
  /** estado mudou fora de uma ação da barra (título, sujo, recentes…) */
  sync(): void;
  /** Modo Protegido ligou/desligou */
  protectedChanged(active: boolean): void;
  /** pulso no "Habilitar Edição" (ação bloqueada) */
  pulseEnable(): void;
}

export class WriteApp {
  ui: AppUi | null = null;
  title = '';
  format: DocFormat = 'docx';
  dirty = false;
  comparing = false;
  recents: RecentFile[] = [];
  /** modo de cor ESCOLHIDO no menu (null = não escolhido; vale o atributo `theme`) */
  chosenMode: ColorMode | null;
  chosenAccent: string | null;
  commentsVisible: boolean;
  readonly prefs: ReturnType<typeof instanceStore>;
  activeCommentIds: number[] = [];
  lastColor = 'C00000';
  lastHighlight = 'yellow';
  lastShading = 'FFFF00';
  /** último sombreamento de célula (cor do tema ou hex) e a cor do chip */
  lastTableShading: string | { themeColor: string; tint?: string; shade?: string } = { themeColor: 'accent1', tint: '33' };
  lastTableShadingCss = '#C1E4F5';
  lastTableBorder: import('@universal-office/docx-core').BorderKind = 'all';
  /** último item do botão Bordas da Página Inicial (Borda Inferior de início, como o Word) */
  lastHomeBorder: import('@universal-office/docx-core').BorderKind = 'bottom';
  private fileHandle: FileSystemFileHandle | null = null;
  /** onde o host guarda o documento aberto/salvo por ele (Electron: caminho) */
  private hostPath: string | null = null;
  private changeSeq = 0;
  private lastAutosave = Date.now();
  private trustKey: string | null = null;
  private readonly trusted = new Set<string>(JSON.parse(store.get('uw-trusted') ?? '[]') as string[]);
  private wasProtected = false;
  private enabledByUser = false;
  private fontNote = '';
  private boundHost: unknown = undefined;

  private detachFn: (() => void) | null = null;
  /** o hospedeiro tratou um uw-save-request: ele é dono do salvar (sem autosave nem aviso ao sair) */
  hostOwnsSave = false;

  constructor(readonly ed: UniversalWriteElement) {
    this.prefs = instanceStore(ed);
    const m = this.prefs.get('mode');
    this.chosenMode = isColorMode(m) ? m : null;
    this.chosenAccent = this.prefs.get('accent');
    this.commentsVisible = this.prefs.get('comments') !== '0';
    // Exibir Linhas de Grade das tabelas: preferência da interface (não do documento)
    if (this.prefs.get('tableGridlines') === '1') ed.showTableGridlines?.(true);
  }

  /** Modo escolhido: o atributo `theme` manda; senão a escolha no menu; senão nenhum
   *  (null: "Seguir a página" — color-scheme e, se a página os define, os tokens dela). */
  get mode(): ColorMode | null {
    const a = this.ed.getAttribute('theme');
    return isColorMode(a) ? a : this.chosenMode;
  }
  get accent(): string { return this.ed.getAttribute('accent') || this.chosenAccent || 'blue'; }
  /** destaque pedido (atributo `accent` ou menu): usa a paleta do componente mesmo com a da página */
  get explicitAccent(): boolean { return this.ed.hasAttribute('accent') || !!this.chosenAccent; }

  /**
   * Liga os ouvintes de aplicativo (barra montada e elemento no documento).
   * detach() tira TODOS — intervalo, beforeunload e eventos — para o elemento
   * (e este objeto, no WeakMap) poder ser coletado ao sair da página.
   */
  attach(): void {
    if (this.detachFn) return;
    const ed = this.ed;
    const ac = new AbortController();
    const signal = ac.signal;
    let autosaveTimer = 0;
    ed.addEventListener('uw-change', () => {
      this.changeSeq++;
      this.setDirty(true);
      // além do intervalo: pouco depois de cada edição (timers de fundo sofrem throttling)
      window.clearTimeout(autosaveTimer);
      autosaveTimer = window.setTimeout(() => this.checkAutosave(), 800);
    }, { signal });
    const interval = window.setInterval(() => this.checkAutosave(), 15000);
    window.addEventListener('beforeunload', (e) => { if (this.wantsUnloadPrompt()) e.preventDefault(); }, { signal });
    ed.addEventListener('uw-font-embedding', ((e: CustomEvent) => {
      this.fontNote = describeFontEmbedding(e.detail, ed);
    }) as EventListener, { signal });
    ed.addEventListener('uw-protected', ((e: CustomEvent<{ active: boolean; hasFields?: boolean }>) => {
      this.ui?.protectedChanged(e.detail.active);
      if (this.enabledByUser && e.detail.hasFields) void this.askUpdateFields();
      if (!e.detail.active) {
        // Documentos Confiáveis (como no Word): habilitou uma vez → lembra o arquivo
        this.rememberTrust(this.trustKey);
        if (this.wasProtected && this.fileHandle) {
          void this.save(false).then((ok) => { if (ok) this.ui?.flash(this.ui.L.editingEnabledSaved); });
        }
      }
      this.wasProtected = e.detail.active;
    }) as EventListener, { signal });
    ed.addEventListener('uw-blocked', () => { this.ui?.pulseEnable(); this.ui?.flash(this.ui.L.blocked); }, { signal });
    void listRecents().then((r) => { if (!signal.aborted) { this.recents = r; this.ui?.sync(); } });
    this.detachFn = () => {
      ac.abort();
      window.clearInterval(interval);
      window.clearTimeout(autosaveTimer);
    };
  }

  detach(): void {
    this.detachFn?.();
    this.detachFn = null;
    this.ui = null;
  }

  get attached(): boolean { return this.detachFn !== null; }

  /** Aviso do navegador ao sair com alterações: só quando ninguém mais cuida disso. */
  private wantsUnloadPrompt(): boolean {
    return this.dirty && !!this.ui && !this.ed.hasAttribute('nounloadprompt')
      && !hostOf(this.ed)?.setDirty && !this.hostOwnsSave;
  }

  /**
   * Pergunta ao hospedeiro se ELE trata a ação (evento cancelável
   * `uw-save-request` / `uw-open-request`). Tratou → a barra não faz nada.
   */
  requestFromHost(kind: 'save' | 'open', detail: object = {}): boolean {
    const ev = new CustomEvent(`uw-${kind}-request`, { detail, cancelable: true, bubbles: true, composed: true });
    this.ed.dispatchEvent(ev);
    if (ev.defaultPrevented && kind === 'save') this.hostOwnsSave = true;
    return ev.defaultPrevented;
  }

  /** Liga o host (pode ser atribuído depois de a barra montar). */
  bindHost(): void {
    const host = hostOf(this.ed);
    if (host === this.boundHost) return;
    this.boundHost = host;
    // a ponte do host não tem "off": o callback guarda só uma referência fraca
    const ref = new WeakRef(this);
    host?.onSaveBeforeClose?.(() => {
      const app = ref.deref();
      void app?.save(false).then((ok) => { if (ok && !app.dirty) hostOf(app.ed)?.closeWindow?.(); });
    });
    this.syncDirty();
  }

  get docName(): string { return this.title || this.ui?.L.untitled || 'Document'; }

  setTitle(name: string): void {
    this.title = name.replace(/\.(docx|odt|doc)$/i, '');
    hostOf(this.ed)?.setTitle?.(this.title);
    this.syncDirty();
    this.ui?.sync();
  }

  private syncDirty(): void { hostOf(this.ed)?.setDirty?.(this.dirty, this.docName); }

  setDirty(v: boolean): void {
    // o estado do elemento (isDirty) acompanha: salvo pela barra = salvo para o
    // hospedeiro — também quando a barra já se via limpa (atualizar campos e
    // desfazer sujam o elemento sem uw-change)
    if (!v) this.ed.setDirty?.(false);
    if (v === this.dirty) return;
    this.dirty = v;
    this.syncDirty();
  }

  // ───── Documentos Confiáveis ─────
  private rememberTrust(key: string | null): void {
    if (!key) return;
    this.trusted.add(key);
    store.set('uw-trusted', JSON.stringify([...this.trusted]));
  }
  private static keyOf(f: File): string { return `${f.name}|${f.size}|${f.lastModified}`; }

  // ───── abrir ─────
  newDocument(): void {
    this.fileHandle = null;
    this.hostPath = null;
    this.ed.newDocument();
    this.format = 'docx';
    this.setDirty(false);
    this.setTitle(this.ui?.L.untitled ?? '');
    this.ed.focusEditor();
  }

  /**
   * Carrega bytes. Critério do Word para o Modo Protegido: o Mark-of-the-Web
   * manda (host); no navegador, só os Documentos Confiáveis abrem editáveis.
   */
  openBytes(bytes: Uint8Array, name: string, handle: FileSystemFileHandle | null, sec: { motw?: boolean; trustKey?: string; path?: string } = {}): boolean {
    const key = sec.trustKey ?? null;
    const isTrusted = key !== null && this.trusted.has(key);
    const prot = sec.motw !== undefined ? sec.motw && !isTrusted : !isTrusted;
    const odt = isOdt(bytes) || /\.odt$/i.test(name);
    try {
      if (odt) this.ed.loadOdt(bytes, { protected: prot });
      else this.ed.load(bytes, 'auto', { protected: prot });
    } catch {
      this.ui?.flash(`⚠ ${this.ui.L.invalidDoc(name)}`);
      return false;
    }
    this.format = odt ? 'odt' : 'docx';
    this.trustKey = key;
    this.fileHandle = handle;
    // todo documento carregado troca o destino do "Salvar": só o que veio do host tem path
    this.hostPath = sec.path ?? null;
    this.changeSeq++;
    this.setDirty(false);
    this.setTitle(name);
    if (handle) void rememberRecent(handle).then((r) => { this.recents = r; this.ui?.sync(); });
    this.ed.focusEditor();
    return true;
  }

  async openFile(file: File, handle: FileSystemFileHandle | null = null): Promise<boolean> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return this.openBytes(bytes, file.name, handle, { trustKey: WriteApp.keyOf(file) });
  }

  async open(): Promise<void> {
    if (this.requestFromHost('open')) return;
    const host = hostOf(this.ed);
    if (host?.openFile) {
      let r: UniversalWriteHostFile | null = null;
      try { r = await host.openFile(); } catch { this.ui?.flash(`⚠ ${this.ui.L.readFailed}`); return; }
      if (r) {
        const bytes = r.bytes instanceof Uint8Array ? r.bytes : new Uint8Array(r.bytes);
        this.openBytes(bytes, r.name, null, { motw: r.motw, trustKey: `${r.name}|${bytes.byteLength}`, ...(r.path ? { path: r.path } : {}) });
      }
      return;
    }
    const p = picker();
    if (p.showOpenFilePicker) {
      try {
        const [h] = await p.showOpenFilePicker({
          types: [{ description: 'Documents', accept: { [MIME.docx]: ['.docx'], [MIME.odt]: ['.odt'], 'application/msword': ['.doc'] } }],
        });
        await this.openFile(await h!.getFile(), h!);
      } catch { /* cancelado */ }
      return;
    }
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.docx,.odt,.doc' });
    input.addEventListener('change', () => { const f = input.files?.[0]; if (f) void this.openFile(f); });
    input.click();
  }

  async openRecent(r: RecentFile): Promise<void> {
    try {
      if (!(await ensureReadable(r.handle))) return;
      await this.openFile(await r.handle.getFile(), r.handle);
    } catch {
      await forgetRecent(r.name);
      this.recents = await listRecents();
      this.ui?.flash(`⚠ ${this.ui.L.readFailed}`);
      this.ui?.sync();
    }
  }

  get canRecents(): boolean { return recentsSupported(); }

  // ───── salvar ─────
  private async bytesFor(fmt: DocFormat): Promise<Uint8Array> {
    // .docx aplica a opção "fontes no arquivo"
    return fmt === 'odt' ? this.ed.exportOdt() : this.ed.saveDocxWithFonts();
  }

  private takeFontNote(): string {
    const n = this.fontNote ? ` · ${this.fontNote}` : '';
    this.fontNote = '';
    return n;
  }

  /** Salva; true = gravado (cancelado/falhou: false, segue pendente). */
  async save(saveAs: boolean): Promise<boolean> {
    if (this.requestFromHost('save', { saveAs, format: this.format })) return true;
    const L = this.ui?.L;
    let fmt = this.format;
    const host = hostOf(this.ed);
    const seq = this.changeSeq;
    if (host?.saveFile) {
      try {
        const saved: UniversalWriteHostSaved | null = await host.saveFile(await this.bytesFor(fmt), {
          name: `${this.docName}.${fmt}`, format: fmt, saveAs,
          ...(!saveAs && this.hostPath ? { path: this.hostPath } : {}),
        });
        if (!saved) return false;
        const name = typeof saved === 'string' ? saved : saved.name;
        if (typeof saved !== 'string' && saved.path) this.hostPath = saved.path;
        if (/\.odt$/i.test(name) !== (fmt === 'odt')) fmt = /\.odt$/i.test(name) ? 'odt' : 'docx';
        this.format = fmt;
        this.setTitle(name);
        this.setDirty(this.changeSeq !== seq);
        this.lastAutosave = Date.now();
        if (L) this.ui?.flash(L.saved(fmt) + this.takeFontNote());
        return true;
      } catch { return false; }
    }
    const p = picker();
    if (p.showSaveFilePicker) {
      try {
        if (!this.fileHandle || saveAs) {
          const types = [
            { description: 'DOCX document', accept: { [MIME.docx]: ['.docx'] } },
            { description: 'OpenDocument Text', accept: { [MIME.odt]: ['.odt'] } },
          ];
          if (fmt === 'odt') types.reverse();
          this.fileHandle = await p.showSaveFilePicker({ suggestedName: `${this.docName}.${fmt}`, types });
          fmt = /\.odt$/i.test(this.fileHandle.name) ? 'odt' : 'docx';
          this.format = fmt;
          this.setTitle(this.fileHandle.name);
        }
        const bytes = await this.bytesFor(fmt);
        const w = await this.fileHandle.createWritable();
        await w.write(new Blob([bytes as BlobPart]));
        await w.close();
        void rememberRecent(this.fileHandle).then((r) => { this.recents = r; this.ui?.sync(); });
        // arquivo salvo por você é confiável (como no Word)
        try { this.trustKey = WriteApp.keyOf(await this.fileHandle.getFile()); this.rememberTrust(this.trustKey); } catch { /* sem meta */ }
        this.setDirty(this.changeSeq !== seq);
        this.lastAutosave = Date.now();
        if (L) this.ui?.flash(L.saved(fmt) + this.takeFontNote());
        return true;
      } catch { return false; }
    }
    // sem File System Access: baixa a cópia
    download(await this.bytesFor(fmt) as BlobPart, `${this.docName}.${fmt}`, MIME[fmt]);
    this.setDirty(false);
    const note = this.takeFontNote();
    if (note) this.ui?.flash(note.slice(3));
    return true;
  }

  get autosaveMinutes(): number { return parseFloat(this.prefs.get('autosave') ?? this.autosaveSession ?? '10'); }
  set autosaveMinutes(n: number) {
    this.autosaveSession = String(n);
    this.prefs.set('autosave', String(n));
    const L = this.ui?.L;
    if (L) this.ui?.flash(n <= 0 ? L.autosaveOff : L.autosaveEvery(String(n)));
  }

  /** Salvamento automático (AutoRecuperação do Word: 10 min por padrão). */
  private autosaveSession: string | null = null;

  get autosaveEnabled(): boolean { return !this.ed.hasAttribute('noautosave') && !this.hostOwnsSave; }

  private checkAutosave(): void {
    if (!this.autosaveEnabled) return;
    const min = this.autosaveMinutes;
    if (min <= 0 || !this.dirty || !this.ui) return;
    if (Date.now() - this.lastAutosave < min * 60000) return;
    if (!this.fileHandle && !hostOf(this.ed)?.saveFile) {
      this.ui.flash(this.ui.L.autosavePending);
      this.lastAutosave = Date.now();
      return;
    }
    if (!this.fileHandle) return; // host sem arquivo definido: não abre diálogo sozinho
    // falhou (arquivo sumiu, sem permissão…): continua pendente
    void this.save(false).then((ok) => {
      this.lastAutosave = Date.now();
      if (ok) this.ui?.flash(this.ui.L.autosaved);
    });
  }

  // ───── exportar ─────
  async export(kind: 'pdf' | 'html' | 'md' | 'odt' | 'xps', slim = false): Promise<void> {
    const n = this.docName, suf = slim ? '-slim' : '';
    const host = hostOf(this.ed);
    if (host?.exportFile) {
      const data = async (): Promise<Uint8Array | string> => {
        switch (kind) {
          case 'pdf': return this.ed.exportPdf();
          case 'html': return this.ed.exportHtml(n, slim ? { images: 'omit' } : {});
          case 'md': return this.ed.exportMarkdown(n, slim ? { images: 'omit' } : {});
          case 'odt': return this.ed.exportOdt();
          case 'xps': return this.ed.exportXps();
        }
      };
      try {
        if (!(await host.exportFile(kind, `${n}${suf}.${kind}`, data))) return;
      } catch { this.ui?.flash(`⚠ ${this.ui.L.readFailed}`); return; }
      this.ui?.flash(this.ui.L.exported(kind.toUpperCase()));
      return;
    }
    switch (kind) {
      case 'pdf': download(await this.ed.exportPdf() as BlobPart, `${n}.pdf`, 'application/pdf'); break;
      case 'html': download(await this.ed.exportHtml(n, slim ? { images: 'omit' } : {}), `${n}${suf}.html`, 'text/html;charset=utf-8'); break;
      case 'md': download(await this.ed.exportMarkdown(n, slim ? { images: 'omit' } : {}), `${n}${suf}.md`, 'text/markdown;charset=utf-8'); break;
      case 'odt': download(this.ed.exportOdt() as BlobPart, `${n}.odt`, MIME.odt); break;
      case 'xps': download(this.ed.exportXps() as BlobPart, `${n}.xps`, 'application/vnd.ms-xpsdocument'); break;
    }
    this.ui?.flash(this.ui.L.exported(kind.toUpperCase()));
  }

  async fontEmbedding(): Promise<void> {
    const s = await openFontEmbeddingDialog({ app: 'write', settings: this.ed.getFontEmbedding(), lang: this.ed, parent: this.ui?.layer });
    if (s) this.ed.setFontEmbedding(s);
  }

  // ───── Modo Protegido ─────
  enableEditing(): void {
    // a saída do modo protegido foi pelo usuário (uw-protected é síncrono)
    this.enabledByUser = true;
    try { this.ed.enableEditing(); } finally { this.enabledByUser = false; }
    if (this.ui) this.ui.flash(this.ui.L.editingEnabled);
  }

  /** No Word o aviso de campos sai ao HABILITAR EDIÇÃO num documento com campos. */
  private async askUpdateFields(): Promise<void> {
    const ui = this.ui;
    if (!ui) return;
    const L = ui.L;
    const r = await openDialog({
      title: L.fieldsTitle, icon: 'gpp_maybe', body: L.fieldsText, layer: ui.layer, lang: this.lang,
      actions: [{ id: 'no', label: L.notNow }, { id: 'update', label: L.updateFields, primary: true }],
    }).result;
    if (r === 'update') ui.flash(this.ed.updateToc() ? L.fieldsUpdated : L.noFields);
    this.ed.focusEditor();
  }

  get lang(): UiLang { return uiLang(this.ed); }

  // ───── comparar ─────
  async pickForCompare(): Promise<{ name: string; bytes: Uint8Array } | null> {
    const L = this.ui?.L;
    const host = hostOf(this.ed);
    if (host?.openFileForCompare || host?.openFile) {
      try {
        const r = host.openFileForCompare ? await host.openFileForCompare(L?.compareWith ?? 'Compare with…') : await host.openFile!();
        return r ? { name: r.name, bytes: r.bytes instanceof Uint8Array ? r.bytes : new Uint8Array(r.bytes) } : null;
      } catch { if (L) this.ui?.flash(`⚠ ${L.readFailed}`); return null; }
    }
    const p = picker();
    if (p.showOpenFilePicker) {
      try {
        const [h] = await p.showOpenFilePicker({ types: [{ description: 'DOCX document', accept: { [MIME.docx]: ['.docx'] } }] });
        const f = await h!.getFile();
        return { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) };
      } catch { return null; }
    }
    return new Promise((resolve) => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.docx' });
      input.addEventListener('change', async () => {
        const f = input.files?.[0];
        resolve(f ? { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null);
      });
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }

  toast(msg: string): void { if (this.ui) showToast(this.ui.layer, msg); }
}

const apps = new WeakMap<UniversalWriteElement, WriteApp>();
export function appFor(ed: UniversalWriteElement): WriteApp {
  let a = apps.get(ed);
  if (!a) { a = new WriteApp(ed); apps.set(ed, a); }
  return a;
}
