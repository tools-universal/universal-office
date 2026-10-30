// Ações de APLICATIVO das barras do <universal-slides> (o que antes vivia no
// demo): abrir/salvar pelo host (Electron) ou pela File System Access (com
// download como recuo), exportar (PDF, HTML, Markdown, PNG do slide),
// imprimir (um slide por folha, pintado pelo mesmo motor da tela), alterações
// não salvas e as preferências da interface POR INSTÂNCIA (storage-key/id).
// Um por elemento — sobrevive à troca de barra (compacta ↔ ribbon) e de idioma.
import { FontResolver } from '@universal-office/fonts';
import { describeFontEmbedding, pickLabels, showToast } from '@universal-office/ui';
import { pptxToHtml, pptxToMarkdown, pptxToPdf, type PdfFontSource } from '@universal-office/slides-core';
import type { UniversalSlidesElement } from './universal-slides.js';
import type { UniversalSlidesHostFile } from './plugins.js';
import { LABELS, type ChromeLabels } from './chrome-labels.js';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const EXPORT_MIME = { pdf: 'application/pdf', html: 'text/html', md: 'text/markdown', png: 'image/png' } as const;
export type ExportKind = keyof typeof EXPORT_MIME;

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

const ls = {
  get: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* privado */ } },
};

/** Preferências da interface por instância: só gravam com `storage-key` (ou `id`). */
export function instanceStore(el: Element): { get(name: string): string | null; set(name: string, v: string): void } {
  const key = (): string | null => el.getAttribute('storage-key') || el.id || null;
  return {
    get: (name) => { const k = key(); return k ? ls.get(`us:${k}:${name}`) : null; },
    set: (name, v) => { const k = key(); if (k) ls.set(`us:${k}:${name}`, v); },
  };
}

/** O que a barra montada entrega ao app. */
export interface AppUi {
  layer: HTMLElement;
  flash(msg: string): void;
  sync(): void;
  /** Grava o que ainda está pendente nos painéis (ex.: anotações digitadas há menos de 800 ms). */
  flush?(): void;
}

/** Bytes de .pptx/.ppt pela assinatura (ZIP "PK" ou contêiner OLE). */
export function looksLikePresentation(bytes: Uint8Array, name: string): boolean {
  return /\.(pptx|pptm|ppsx|ppsm|potx|ppt|pps)$/i.test(name) || (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf);
}

export class SlidesApp {
  ui: AppUi | null = null;
  readonly prefs: ReturnType<typeof instanceStore>;
  private fileHandle: FileSystemFileHandle | null = null;
  private fontNote = '';
  private detachFn: (() => void) | null = null;
  private boundHost: unknown = undefined;

  constructor(readonly el: UniversalSlidesElement) {
    this.prefs = instanceStore(el);
  }

  get L(): ChromeLabels { return pickLabels(this.el, LABELS); }

  /** Nome exibido (o do documento ou "Apresentação sem título"). */
  get title(): string { return this.el.documentName || this.L.untitled; }

  /** Nome de arquivo sugerido (sem caracteres proibidos). */
  fileName(ext: string): string {
    return `${this.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'presentation'}.${ext}`;
  }

  private flash(msg: string): void {
    if (this.ui) this.ui.flash(msg);
  }

  /** Ouvintes de aplicativo (dirty → host, aviso ao sair). detach() tira todos. */
  attach(): void {
    if (this.detachFn) return;
    const ac = new AbortController();
    const signal = ac.signal;
    this.el.addEventListener('us-dirty', () => this.pushDirty(), { signal });
    this.el.addEventListener('us-title-change', () => { this.el.appHost?.setTitle?.(this.title); this.pushDirty(); this.ui?.sync(); }, { signal });
    this.el.addEventListener('us-font-embedding', ((e: CustomEvent) => { this.fontNote = describeFontEmbedding(e.detail, this.el); }) as EventListener, { signal });
    window.addEventListener('beforeunload', (e) => { this.flushPending(); if (this.el.isDirty() && !this.el.appHost?.setDirty) e.preventDefault(); }, { signal });
    this.detachFn = () => ac.abort();
  }

  detach(): void { this.detachFn?.(); this.detachFn = null; this.boundHost = undefined; }

  /** Liga o host atual (uma vez por host): título, salvar ao fechar. */
  bindHost(): void {
    const host = this.el.appHost;
    if (host === this.boundHost) return;
    this.boundHost = host;
    host?.setTitle?.(this.title);
    host?.onSaveBeforeClose?.(() => { void this.save(false).then((ok) => { if (ok) host.closeWindow?.(); }); });
    this.pushDirty();
  }

  private pushDirty(): void { this.el.appHost?.setDirty?.(this.el.isDirty(), this.title); }

  /**
   * Há texto digitado num painel e ainda não gravado: o host já trata a janela
   * como alterada (fechar pergunta antes); sem pendência volta ao estado real.
   */
  setPending(pending: boolean): void { this.el.appHost?.setDirty?.(pending || this.el.isDirty(), this.title); }

  /** Antes de salvar, exportar ou imprimir: o texto digitado nos painéis entra no documento. */
  private flushPending(): void { this.ui?.flush?.(); }

  // ───── abrir ─────

  /** Abrir… (host, File System Access ou <input type=file>). */
  async open(): Promise<void> {
    const host = this.el.appHost;
    if (host?.openFile) {
      const f = await host.openFile();
      if (f) this.openBytes(toBytes(f), f.name, null, f.path);
      return;
    }
    const p = picker();
    if (p.showOpenFilePicker) {
      try {
        const [h] = await p.showOpenFilePicker({
          types: [{ description: 'PowerPoint', accept: { [PPTX_MIME]: ['.pptx', '.pptm', '.ppsx', '.potx'], 'application/vnd.ms-powerpoint': ['.ppt', '.pps'] } }],
        });
        if (!h) return;
        const file = await h.getFile();
        this.openBytes(new Uint8Array(await file.arrayBuffer()), file.name, h);
      } catch { /* cancelado */ }
      return;
    }
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.pptx,.pptm,.ppsx,.potx,.ppt,.pps' });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (file) await this.openFile(file);
    });
    input.click();
  }

  async openFile(file: File): Promise<boolean> {
    return this.openBytes(new Uint8Array(await file.arrayBuffer()), file.name, null);
  }

  /** Abre bytes (arquivo solto, recente, host). false = não abriu (aviso na barra). */
  openBytes(bytes: Uint8Array, name: string, handle: FileSystemFileHandle | null, path?: string): boolean {
    if (!looksLikePresentation(bytes, name)) { this.flash(`⚠ ${this.L.notPresentation(name)}`); return false; }
    try {
      this.el.openPresentation(bytes, { name, path: path ?? null });
    } catch (e) {
      this.flash(`⚠ ${this.L.openFailed(name, e instanceof Error ? e.message : String(e))}`);
      return false;
    }
    // .ppt convertido: "Salvar" grava um .pptx novo (não por cima do .ppt)
    this.fileHandle = /\.pptx$/i.test(name) ? handle : null;
    if (path && !/\.pptx$/i.test(name)) this.el.documentPath = null;
    this.el.appHost?.setTitle?.(this.title);
    this.ui?.sync();
    return true;
  }

  /** Nova apresentação em branco. */
  newPresentation(): void {
    this.el.newPresentation();
    this.fileHandle = null;
    this.el.appHost?.setTitle?.(this.title);
    this.ui?.sync();
  }

  // ───── salvar ─────

  /** Salvar (no mesmo lugar, se houver) ou Salvar como. true = gravou. */
  async save(saveAs: boolean): Promise<boolean> {
    this.flushPending();
    let bytes: Uint8Array;
    this.fontNote = '';
    try { bytes = await this.el.savePptx(); } catch (e) {
      this.flash(`⚠ ${this.L.saveFailed(e instanceof Error ? e.message : String(e))}`);
      return false;
    }
    const name = this.fileName('pptx');
    const note = this.fontNote ? ` · ${this.fontNote}` : '';
    const host = this.el.appHost;
    try {
      if (host?.saveFile) {
        const r = await host.saveFile(bytes, { name, saveAs, ...(!saveAs && this.el.documentPath ? { path: this.el.documentPath } : {}) });
        if (!r) return false;
        const saved = typeof r === 'string' ? { name: r } : r;
        this.el.documentPath = saved.path ?? this.el.documentPath;
        this.el.documentName = saved.name.replace(/\.(pptx|ppt)$/i, '');
        this.el.markClean();
        this.flash(this.L.saved(saved.name) + note);
        return true;
      }
      const p = picker();
      if (this.fileHandle && !saveAs) {
        await writeHandle(this.fileHandle, bytes);
      } else if (p.showSaveFilePicker) {
        let h: FileSystemFileHandle;
        try {
          h = await p.showSaveFilePicker({ suggestedName: name, types: [{ description: 'PowerPoint', accept: { [PPTX_MIME]: ['.pptx'] } }] });
        } catch { return false; }
        await writeHandle(h, bytes);
        this.fileHandle = h;
        this.el.documentName = h.name.replace(/\.pptx$/i, '');
      } else {
        download(bytes as BlobPart, name, PPTX_MIME);
        this.el.markClean();
        this.flash(this.L.downloaded(name) + note);
        return true;
      }
    } catch (e) {
      this.flash(`⚠ ${this.L.saveFailed(e instanceof Error ? e.message : String(e))}`);
      return false;
    }
    this.el.markClean();
    this.flash(this.L.saved(this.fileName('pptx')) + note);
    return true;
  }

  // ───── exportar ─────

  /** Bytes (ou texto) de um formato de exportação. */
  private async exportData(kind: ExportKind): Promise<Uint8Array | string> {
    if (kind === 'png') return this.slidePng(this.el.getSlideIndex());
    const pptx = await this.el.savePptx();
    if (kind === 'html') return pptxToHtml(pptx, { images: 'data', fullDocument: true } as Parameters<typeof pptxToHtml>[1]);
    if (kind === 'md') return pptxToMarkdown(pptx, { images: 'data' } as Parameters<typeof pptxToMarkdown>[1]);
    const fonts = await pdfFonts();
    if (!fonts.length) throw new Error(this.L.pdfFonts);
    return pptxToPdf(pptx, { fonts });
  }

  /** PNG do slide `i` (o mesmo motor da tela, 1920 px de largura). */
  async slidePng(i: number): Promise<Uint8Array> {
    await this.el.fontsReady();
    const c = document.createElement('canvas');
    this.el.renderSlideToCanvas(i, c, 1920);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
    if (!blob) throw new Error('canvas');
    return new Uint8Array(await blob.arrayBuffer());
  }

  /** Baixar como / Exportar (pelo host, se houver). */
  async export(kind: ExportKind): Promise<void> {
    this.flushPending();
    const ext = kind;
    const name = kind === 'png' ? `${this.fileName('png').replace(/\.png$/, '')} ${this.el.getSlideIndex() + 1}.png` : this.fileName(ext);
    const host = this.el.appHost;
    try {
      if (host?.exportFile) {
        const saved = await host.exportFile(kind, name, () => this.exportData(kind));
        if (saved) this.flash(this.L.exported(saved));
        return;
      }
      const data = await this.exportData(kind);
      download(data as BlobPart, name, EXPORT_MIME[kind]);
      this.flash(this.L.downloaded(name));
    } catch (e) {
      this.flash(`⚠ ${this.L.exportFailed(e instanceof Error ? e.message : String(e))}`);
    }
  }

  // ───── imprimir ─────

  /** Imprimir: um slide por folha (paisagem), pintados pelo motor da tela. */
  async print(): Promise<void> {
    this.flushPending();
    const n = this.el.getSlideCount();
    if (!n) { this.flash(this.L.nothingToPresent); return; }
    await this.el.fontsReady();
    const pages: string[] = [];
    const c = document.createElement('canvas');
    for (let i = 0; i < n; i++) {
      this.el.renderSlideToCanvas(i, c, 1600);
      pages.push(c.toDataURL('image/png'));
    }
    const title = this.title;
    const host = this.el.appHost;
    if (host?.print) { await host.print({ pages, title, landscape: true }); return; }
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)}</title>`
      + '<style>@page{size:landscape;margin:8mm}html,body{margin:0}img{display:block;width:100%;height:auto;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}</style>'
      + `<body>${pages.map((p) => `<img src="${p}">`).join('')}</body>`);
    doc.close();
    const w = frame.contentWindow!;
    await Promise.all([...doc.images].map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; }))));
    const cleanup = (): void => { setTimeout(() => frame.remove(), 500); };
    w.addEventListener('afterprint', cleanup, { once: true });
    w.focus();
    w.print();
    setTimeout(cleanup, 60000);
  }

  /** Aviso flutuante quando não há barra de status. */
  toast(msg: string): void { if (this.ui) showToast(this.ui.layer, msg); }
}

const apps = new WeakMap<UniversalSlidesElement, SlidesApp>();

/** O app do elemento (um só, criado no 1º uso). */
export function appFor(el: UniversalSlidesElement): SlidesApp {
  let a = apps.get(el);
  if (!a) apps.set(el, (a = new SlidesApp(el)));
  return a;
}

function toBytes(f: UniversalSlidesHostFile): Uint8Array {
  return f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes);
}

async function writeHandle(h: FileSystemFileHandle, bytes: Uint8Array): Promise<void> {
  const w = await (h as unknown as { createWritable(): Promise<{ write(d: BlobPart): Promise<void>; close(): Promise<void> }> }).createWritable();
  await w.write(bytes as BlobPart);
  await w.close();
}

const escapeHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

/** Fontes do PDF: a padrão aberta (Liberation Sans) nas 4 variantes, pelo resolvedor único. */
async function pdfFonts(): Promise<PdfFontSource[]> {
  const faces = await FontResolver.shared().bundledFaces('Liberation Sans', ['regular', 'bold', 'italic', 'boldItalic']);
  const out: PdfFontSource[] = [];
  const add = (v: 'regular' | 'bold' | 'italic' | 'boldItalic', bold: boolean, italic: boolean): void => {
    const b = faces[v];
    if (b) out.push({ bytes: b, bold, italic, name: `LiberationSans${v === 'regular' ? '' : v[0]!.toUpperCase() + v.slice(1)}` } as PdfFontSource);
  };
  add('regular', false, false); add('bold', true, false); add('italic', false, true); add('boldItalic', true, true);
  return out;
}
