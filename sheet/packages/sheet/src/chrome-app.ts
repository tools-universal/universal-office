// Estado e ações de APLICATIVO das barras do <universal-sheet> (o que antes
// vivia no demo): abrir/salvar com File System Access ou o host, título,
// alterações não salvas, exportações (PDF, ODS, CSV, TSV, HTML, Markdown,
// XML 2003) e imprimir. Um por elemento — sobrevive à troca de barra
// (compacta ↔ ribbon) e à mudança de idioma.
import { FontResolver, type FontVariant } from '@universal-office/fonts';
import { showToast } from '@universal-office/ui';
import {
  isXlsBytes, xlsxToCsv, xlsxToHtml, xlsxToMarkdown, xlsxToOds, xlsxToPdf, xlsxToTsv, xlsxToXml2003,
} from '@universal-office/sheet-core';
import type { UniversalSheetElement } from './universal-sheet.js';
import { hostOf, type UniversalSheetExportKind, type UniversalSheetHostFile, type UniversalSheetHostSaved } from './chrome-host.js';
import type { ChromeLabels } from './chrome-labels.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME: Record<UniversalSheetExportKind, string> = {
  pdf: 'application/pdf', ods: 'application/vnd.oasis.opendocument.spreadsheet', csv: 'text/csv;charset=utf-8',
  tsv: 'text/tab-separated-values;charset=utf-8', html: 'text/html;charset=utf-8', md: 'text/markdown;charset=utf-8', xml: 'application/xml',
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

/** O arquivo parece uma planilha? (.xlsx/.xlsm pelo ZIP "PK"; .xls pelo Compound File) */
export function looksLikeWorkbook(name: string, bytes: Uint8Array): boolean {
  return /\.(xlsx|xlsm|xls)$/i.test(name) || (bytes[0] === 0x50 && bytes[1] === 0x4b) || isXlsBytes(bytes);
}

/** Interface que a barra montada no momento entrega ao app. */
export interface AppUi {
  L: ChromeLabels;
  layer: HTMLElement;
  /** mensagem curta (status da barra inferior ou aviso flutuante) */
  flash(msg: string): void;
  /** estado mudou fora de uma ação da barra (título, sujo…) */
  sync(): void;
}

const VARIANTS: [FontVariant, boolean, boolean][] = [['regular', false, false], ['bold', true, false], ['italic', false, true], ['boldItalic', true, true]];

/** Fontes TTF para o PDF: a fonte Normal da pasta (com o arquivo) ou a Liberation Sans aberta. */
async function pdfFonts(family: string, fallback = false): Promise<{ bytes: Uint8Array; bold?: boolean; italic?: boolean }[]> {
  const r = FontResolver.shared();
  const out: { bytes: Uint8Array; bold?: boolean; italic?: boolean }[] = [];
  if (!fallback) {
    const [rf] = await r.resolveWithFile([family]);
    if (rf) for (const [v, bold, italic] of VARIANTS) {
      const bytes = await r.loadFace(rf, v).catch(() => undefined);
      if (bytes) out.push({ bytes, ...(bold ? { bold } : {}), ...(italic ? { italic } : {}) });
    }
  }
  if (!out.length) {
    const faces = await r.bundledFaces('Liberation Sans', VARIANTS.map((v) => v[0]));
    for (const [v, bold, italic] of VARIANTS) {
      const bytes = faces[v];
      if (bytes) out.push({ bytes, ...(bold ? { bold } : {}), ...(italic ? { italic } : {}) });
    }
  }
  return out;
}

/**
 * Preferências da INTERFACE (barra compacta × ribbon, barra de fórmulas, guias,
 * tema, destaque) POR INSTÂNCIA: só gravam quando o elemento tem `storage-key`
 * (ou `id`) — sem chave, valem só na sessão (como no Write).
 */
export interface InstanceStore {
  get(name: string): string | null;
  set(name: string, v: string): void;
}

function instanceStore(el: Element): InstanceStore {
  const session = new Map<string, string>();
  const key = (): string | null => el.getAttribute('storage-key') || el.id || null;
  return {
    get: (name) => {
      const k = key();
      if (!k) return session.get(name) ?? null;
      try { return localStorage.getItem(`us:${k}:${name}`); } catch { return session.get(name) ?? null; }
    },
    set: (name, v) => {
      session.set(name, v);
      const k = key();
      if (k) try { localStorage.setItem(`us:${k}:${name}`, v); } catch { /* privado */ }
    },
  };
}

export class SheetApp {
  ui: AppUi | null = null;
  title = '';
  readonly prefs: InstanceStore;
  /** destaque escolhido no menu (null = não escolhido; vale o atributo `accent`) */
  chosenAccent: string | null;
  /** últimas cores escolhidas: os botões divididos de cor aplicam a última, como o Excel */
  lastFontColor = '#C00000';
  lastFill = '#FFFF00';
  private fileHandle: FileSystemFileHandle | null = null;
  /** onde o host guarda a pasta aberta/salva por ele (Electron: caminho) */
  private hostPath: string | null = null;
  private boundHost: unknown = undefined;
  private detachFn: (() => void) | null = null;
  /** o hospedeiro tratou um us-save-request: ele é dono do salvar (sem aviso ao sair) */
  hostOwnsSave = false;
  /** abrindo pela barra (o us-load é desta abertura) */
  private opening = false;

  constructor(readonly el: UniversalSheetElement) {
    this.prefs = instanceStore(el);
    this.chosenAccent = this.prefs.get('accent');
  }

  get accent(): string { return this.el.getAttribute('accent') || this.chosenAccent || 'green'; }
  /** destaque pedido (atributo `accent` ou menu): usa a paleta do componente mesmo com a da página */
  get explicitAccent(): boolean { return this.el.hasAttribute('accent') || !!this.chosenAccent; }

  /** Liga os ouvintes de aplicativo (barra montada); detach() tira todos. */
  attach(): void {
    if (this.detachFn) return;
    const ac = new AbortController();
    this.el.addEventListener('us-change', () => this.syncDirty(), { signal: ac.signal });
    // o hospedeiro carregou outra pasta direto no elemento (loadXlsx/newWorkbook): título e destino do "Salvar" recomeçam
    this.el.addEventListener('us-load', ((e: CustomEvent<{ reload: boolean }>) => {
      if (this.opening || e.detail.reload) return;
      this.fileHandle = null;
      this.hostPath = null;
      this.setTitle(this.el.fileName ?? this.ui?.L.untitled ?? '');
    }) as EventListener, { signal: ac.signal });
    window.addEventListener('beforeunload', (e) => { if (this.wantsUnloadPrompt()) e.preventDefault(); }, { signal: ac.signal });
    this.detachFn = () => ac.abort();
  }

  detach(): void {
    this.detachFn?.();
    this.detachFn = null;
    this.ui = null;
  }

  private wantsUnloadPrompt(): boolean {
    return this.el.isDirty() && !!this.ui && !this.el.hasAttribute('nounloadprompt') && !hostOf(this.el)?.setDirty && !this.hostOwnsSave;
  }

  /**
   * Pergunta ao hospedeiro se ELE trata a ação (evento cancelável
   * `us-save-request` / `us-open-request`). Tratou → a barra não faz nada.
   */
  requestFromHost(kind: 'save' | 'open', detail: object = {}): boolean {
    const ev = new CustomEvent(`us-${kind}-request`, { detail, cancelable: true, bubbles: true, composed: true });
    this.el.dispatchEvent(ev);
    if (ev.defaultPrevented && kind === 'save') this.hostOwnsSave = true;
    return ev.defaultPrevented;
  }

  /** Liga o host (pode ser atribuído depois de a barra montar). */
  bindHost(): void {
    const host = hostOf(this.el);
    if (host === this.boundHost) return;
    this.boundHost = host;
    const ref = new WeakRef(this);
    host?.onSaveBeforeClose?.(() => {
      const app = ref.deref();
      void app?.save(false).then((ok) => { if (ok && !app.el.isDirty()) hostOf(app.el)?.closeWindow?.(); });
    });
    this.syncDirty();
  }

  get docName(): string { return this.title || this.ui?.L.untitled || 'Book1'; }

  setTitle(name: string): void {
    this.title = name.replace(/\.(xlsx|xlsm|xls)$/i, '');
    this.el.fileName = `${this.title}.xlsx`;
    hostOf(this.el)?.setTitle?.(this.title);
    this.syncDirty();
    this.ui?.sync();
  }

  syncDirty(): void { hostOf(this.el)?.setDirty?.(this.el.isDirty(), this.docName); }

  // ───── abrir ─────
  newWorkbook(): void {
    this.fileHandle = null;
    this.hostPath = null;
    this.opening = true;
    try { this.el.fileName = undefined; this.el.newWorkbook(); } finally { this.opening = false; }
    this.setTitle(this.ui?.L.untitled ?? '');
    this.el.focus();
  }

  /** Carrega bytes (.xlsx/.xlsm/.xls); false = não é uma planilha válida. */
  openBytes(bytes: Uint8Array, name: string, handle: FileSystemFileHandle | null = null, opts: { path?: string } = {}): boolean {
    this.opening = true;
    try {
      this.el.fileName = name.replace(/\.xls$/i, '.xlsx');
      this.el.loadXlsx(bytes);
    } catch {
      this.ui?.flash(this.ui.L.invalidFile(name));
      return false;
    } finally { this.opening = false; }
    this.fileHandle = handle;
    // .xls é convertido em memória: o "Salvar" grava .xlsx noutro lugar (pergunta)
    this.hostPath = /\.xls$/i.test(name) ? null : opts.path ?? null;
    this.setTitle(name);
    this.el.focus();
    return true;
  }

  async openFile(file: File, handle: FileSystemFileHandle | null = null): Promise<boolean> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikeWorkbook(file.name, bytes)) { this.ui?.flash(this.ui.L.notWorkbook(file.name)); return false; }
    return this.openBytes(bytes, file.name, /\.xls$/i.test(file.name) ? null : handle);
  }

  async open(): Promise<void> {
    if (this.requestFromHost('open')) return;
    const host = hostOf(this.el);
    if (host?.openFile) {
      let r: UniversalSheetHostFile | null = null;
      try { r = await host.openFile(); } catch { this.ui?.flash(`⚠ ${this.ui.L.readFailed}`); return; }
      if (r) this.openBytes(r.bytes instanceof Uint8Array ? r.bytes : new Uint8Array(r.bytes), r.name, null, r.path ? { path: r.path } : {});
      return;
    }
    const p = picker();
    if (p.showOpenFilePicker) {
      try {
        const [h] = await p.showOpenFilePicker({
          types: [{ description: 'Spreadsheets', accept: { [XLSX_MIME]: ['.xlsx'], 'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'], 'application/vnd.ms-excel': ['.xls'] } }],
        });
        await this.openFile(await h!.getFile(), h!);
      } catch { /* cancelado */ }
      return;
    }
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx,.xlsm,.xls' });
    input.addEventListener('change', () => { const f = input.files?.[0]; if (f) void this.openFile(f); });
    input.click();
  }

  // ───── salvar ─────
  /** Salva o .xlsx; true = gravado (cancelado/falhou: false, segue pendente). */
  async save(saveAs: boolean): Promise<boolean> {
    if (this.requestFromHost('save', { saveAs, format: 'xlsx' })) return true;
    const L = this.ui?.L;
    let bytes: Uint8Array;
    try { bytes = this.el.saveXlsx(); } catch (e) { this.ui?.flash(L?.failed(String(e)) ?? ''); return false; }
    const host = hostOf(this.el);
    if (host?.saveFile) {
      try {
        const saved: UniversalSheetHostSaved | null = await host.saveFile(bytes, {
          name: `${this.docName}.xlsx`, format: 'xlsx', saveAs, ...(!saveAs && this.hostPath ? { path: this.hostPath } : {}),
        });
        if (!saved) return false;
        const name = typeof saved === 'string' ? saved : saved.name;
        if (typeof saved !== 'string' && saved.path) this.hostPath = saved.path;
        this.setTitle(name.replace(/^.*[\\/]/, ''));
        this.el.setDirty(false);
        this.syncDirty();
        if (L) this.ui?.flash(L.saved);
        return true;
      } catch { return false; }
    }
    const p = picker();
    if (p.showSaveFilePicker) {
      try {
        if (!this.fileHandle || saveAs) {
          this.fileHandle = await p.showSaveFilePicker({
            suggestedName: `${this.docName}.xlsx`,
            types: [{ description: 'Excel Workbook', accept: { [XLSX_MIME]: ['.xlsx'] } }],
          });
          this.setTitle(this.fileHandle.name);
        }
        const w = await this.fileHandle.createWritable();
        await w.write(new Blob([bytes as BlobPart]));
        await w.close();
        this.el.setDirty(false);
        this.syncDirty();
        if (L) this.ui?.flash(L.saved);
        return true;
      } catch { return false; }
    }
    download(bytes as BlobPart, `${this.docName}.xlsx`, XLSX_MIME);
    this.el.setDirty(false);
    this.syncDirty();
    if (L) this.ui?.flash(L.downloaded('xlsx'));
    return true;
  }

  // ───── exportar e imprimir ─────
  /** Bytes/texto de um formato de exportação (da pasta como está agora). */
  async exportData(kind: UniversalSheetExportKind): Promise<Uint8Array | string> {
    const xlsx = this.el.saveXlsx();
    switch (kind) {
      case 'pdf': return this.pdf(xlsx);
      case 'ods': return xlsxToOds(xlsx);
      case 'csv': return xlsxToCsv(xlsx);
      case 'tsv': return xlsxToTsv(xlsx);
      case 'md': return xlsxToMarkdown(xlsx);
      case 'html': return xlsxToHtml(xlsx, { fullDocument: true });
      case 'xml': return xlsxToXml2003(xlsx);
    }
  }

  /** PDF da pasta (todas as abas visíveis) com a fonte Normal; sem TrueType dela, a Liberation Sans. */
  private async pdf(xlsx: Uint8Array): Promise<Uint8Array> {
    const family = this.el.defaultFontName;
    try { return xlsxToPdf(xlsx, { fonts: await pdfFonts(family) }); } catch {
      return xlsxToPdf(xlsx, { fonts: await pdfFonts(family, true) });
    }
  }

  async export(kind: UniversalSheetExportKind): Promise<void> {
    const L = this.ui?.L;
    const ext = kind;
    const name = `${this.docName}.${ext}`;
    const host = hostOf(this.el);
    if (L) this.ui?.flash(L.generating(kind.toUpperCase()));
    try {
      if (host?.exportFile) {
        if (!(await host.exportFile(kind, name, () => this.exportData(kind)))) return;
        if (L) this.ui?.flash(L.exported(kind.toUpperCase()));
        return;
      }
      const data = await this.exportData(kind);
      download(data as BlobPart, name, MIME[kind]);
      if (L) this.ui?.flash(L.downloaded(ext));
    } catch (e) {
      if (L) this.ui?.flash(L.failed(e instanceof Error ? e.message : String(e)));
    }
  }

  /** Imprimir: o PDF da pasta pelo host (diálogo do sistema) ou numa janela do navegador. */
  async print(): Promise<void> {
    const L = this.ui?.L;
    if (L) this.ui?.flash(L.generating('PDF'));
    try {
      const pdf = await this.pdf(this.el.saveXlsx());
      const host = hostOf(this.el);
      if (host?.print) { await host.print({ pdf, title: this.docName }); return; }
      const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (L) this.ui?.flash('');
    } catch (e) {
      if (L) this.ui?.flash(L.failed(e instanceof Error ? e.message : String(e)));
    }
  }

  toast(msg: string): void { if (this.ui) showToast(this.ui.layer, msg); }
}

const apps = new WeakMap<UniversalSheetElement, SheetApp>();
export function appFor(el: UniversalSheetElement): SheetApp {
  let a = apps.get(el);
  if (!a) { a = new SheetApp(el); apps.set(el, a); }
  return a;
}
