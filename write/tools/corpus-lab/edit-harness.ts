// Harness de EDIÇÃO do <universal-write> sobre o motor de layout (headless):
// abre um .docx do repositório (amostras/fixtures sintéticas), expõe os
// internos do componente e ajudantes para o edit-check.mjs conferir cursor,
// seleção, formatação, desfazer, células de tabela e cabeçalho contra os
// glifos que o motor desenhou. Sem documentos de clientes.
import '../../packages/editor/src/universal-write.js';
import type { UniversalWriteElement } from '../../packages/editor/src/universal-write.js';
import { createMentionPlugin } from '../../packages/editor/src/mention-plugin.js';
import { FontResolver, type HostFontFace } from '@universal-office/fonts';

// o motor em desenvolvimento lê process.env (flags de experimento) — no
// navegador não existe; sem isto ele lança e o editor cai no layout legado
(globalThis as { process?: { env: Record<string, string> } }).process ??= { env: {} };

interface HostFaceRef extends Omit<HostFontFace, 'bytes'> { url: string }
interface LabWindow {
  __labListFonts(): Promise<string[]>;
  __labResolveFonts(families: string[]): Promise<HostFaceRef[]>;
  ed: unknown;
}
const w = window as unknown as LabWindow;
const FONTS_BASE = '/write/packages/editor/demo/fonts';

FontResolver.shared().configure({
  baseUrl: FONTS_BASE,
  host: {
    list: () => w.__labListFonts(),
    resolve: async (families) => {
      const refs = await w.__labResolveFonts(families);
      return Promise.all(refs.map(async ({ url, ...f }) => ({ ...f, bytes: await (await fetch(url)).arrayBuffer() })));
    },
  },
});

interface EngLineT { ref: string; start: number; end: number; x: number; y: number; height: number; baseline: number; width: number; chars?: { o: number; x: number; w: number }[] }
interface PageT { widthTw: number; heightTw: number; items: { t: string; y?: number; text?: string; glyphs?: { cp: number; x: number }[]; face?: { bold: boolean; italic: boolean; family: string }; sizePt?: number; color?: string }[]; lines: EngLineT[] }
interface LaidLineT { para: number; page: number; xTwips: number; yTwips: number; heightTwips: number; baselineTwips: number; rich: { start: number; end: number }; eng?: EngLineT }
/** Internos (TS private ≠ privado em runtime). */
interface Internals {
  model: { paragraphs: { runs: { text: string; props: Record<string, unknown>; rpr?: Record<string, unknown> }[]; props: Record<string, unknown> }[] } | null;
  eng: { result: { pages: PageT[] }; lines: { line: EngLineT; page: number; loc: { kind: string; para?: number; anchor?: number } }[]; hfItems: number[] } | null;
  canvases: HTMLCanvasElement[];
  pageCount: number;
  zoom: number;
  selection: { anchor: { para: number; offset: number }; focus: { para: number; offset: number } };
  layoutCache: { lines: LaidLineT[] }[];
  cellEdit: unknown;
  hfEdit: unknown;
  tbEdit: unknown;
  engineStats: Record<string, number | string>;
  undoStack: string[];
  settleDocumentFonts(): Promise<void>;
  ensureImagesDecoded(): Promise<void>;
  lineOf(pos: { para: number; offset: number }): LaidLineT | null;
  caretX(pos: { para: number; offset: number }, line: LaidLineT): number;
  pageImageForPrint(i: number): string;
  type(text: string): void;
  refresh(): void;
  paint(): void;
}
type El = UniversalWriteElement & Internals;
let el: El | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PX_PER_TWIP = 96 / 1440;

function need(): El {
  if (!el) throw new Error('nada aberto');
  return el;
}

const paraText = (p: { runs: { text: string }[] }) => p.runs.map((r) => r.text).join('');

w.ed = {
  async open(url: string, opts: { legacy?: boolean } = {}): Promise<{ pages: number; engine: boolean; ms: number }> {
    const t0 = performance.now();
    document.body.replaceChildren();
    el = document.createElement('universal-write') as El;
    el.setAttribute('manual-init', '');
    el.setAttribute('fonts', FONTS_BASE);
    if (opts.legacy) el.setAttribute('layout', 'legacy');
    el.style.cssText = 'display:block;width:1200px;height:900px';
    document.body.append(el);
    await el.initialize();
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    el.load(bytes, 'auto', { protected: false });
    for (let i = 0; i < 3; i++) { await sleep(30); await el.settleDocumentFonts(); }
    await el.ensureImagesDecoded();
    // fontes que chegam em 2º plano (variantes, substitutas) mudam o Registry:
    // espera estabilizar para as medições não pegarem um relayout de fonte
    const reg = (el as unknown as { fonts: { version: number } }).fonts;
    for (let i = 0, v = -1; i < 20 && reg.version !== v; i++) { v = reg.version; await sleep(150); await el.settleDocumentFonts(); }
    el.refresh();
    await sleep(20);
    return { pages: el.pageCount, engine: !!el.eng, ms: Math.round(performance.now() - t0) };
  },

  /** Documento novo com N parágrafos de texto corrido (medição de desempenho). */
  async synthetic(paras: number, words = 60): Promise<{ pages: number; engine: boolean }> {
    document.body.replaceChildren();
    el = document.createElement('universal-write') as El;
    el.setAttribute('manual-init', '');
    el.setAttribute('fonts', FONTS_BASE);
    el.style.cssText = 'display:block;width:1200px;height:900px';
    document.body.append(el);
    await el.initialize();
    const lorem = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
    const text = Array.from({ length: paras }, (_, i) => Array.from({ length: words }, (_, k) => lorem[(i * 7 + k) % lorem.length]).join(' ')).join('\n');
    el.pasteText(text);
    await el.settleDocumentFonts();
    el.refresh();
    return { pages: el.pageCount, engine: !!el.eng };
  },

  state(): Record<string, unknown> {
    const e = need();
    return {
      engine: !!e.eng, pages: e.pageCount, sel: e.selection,
      cell: !!e.cellEdit, hf: !!e.hfEdit, tb: !!e.tbEdit, view: e.getView(),
      paras: e.model?.paragraphs.length ?? 0, undo: e.undoStack.length, stats: e.engineStats,
    };
  },

  text(pi: number): string {
    const p = need().model?.paragraphs[pi];
    return p ? paraText(p) : '';
  },

  /** Primeira linha do motor do parágrafo pi do modelo em edição. */
  line(pi: number, nth = 0): LaidLineT | null {
    return need().layoutCache[pi]?.lines[nth] ?? null;
  },

  /** Ponto da tela (client px) de um ponto da página (twips). */
  client(page: number, xTw: number, yTw: number): { x: number; y: number } {
    const e = need();
    // rolagem animada em curso (scrollCaretIntoView) mudaria o ponto depois do cálculo
    cancelAnimationFrame((e as unknown as { scrollAnim: number }).scrollAnim);
    const c = e.canvases[page]!;
    const s = PX_PER_TWIP * e.zoom;
    let r = c.getBoundingClientRect();
    const host = e.getBoundingClientRect();
    const y = r.top + yTw * s;
    // rola o editor até o ponto ficar visível (o clique real precisa dele na tela)
    if (y < host.top + 30 || y > host.bottom - 30) {
      e.scrollTop += y - (host.top + host.height / 2);
      r = c.getBoundingClientRect();
    }
    return { x: r.left + xTw * s, y: r.top + yTw * s };
  },

  /** Ponto da tela do caractere `offset` do parágrafo pi (meio da linha). */
  clientAt(pi: number, offset: number): { x: number; y: number } | null {
    const e = need();
    const line = e.lineOf({ para: pi, offset });
    if (!line) return null;
    const x = e.caretX({ para: pi, offset }, line);
    return w.ed && (w.ed as { client: (p: number, x: number, y: number) => { x: number; y: number } }).client(line.page, x + 5, line.yTwips + line.heightTwips / 2);
  },

  /** Ponto da tela de uma linha do motor que satisfaz o filtro de ref. */
  clientOfRef(prefix: RegExp, nth = 0): { x: number; y: number; ref: string } | null {
    const e = need();
    const hits = e.eng?.lines.filter((l) => prefix.test(l.line.ref)) ?? [];
    const el2 = hits[nth];
    if (!el2) return null;
    const l = el2.line;
    const c = (w.ed as { client: (p: number, x: number, y: number) => { x: number; y: number } }).client(el2.page, l.x + Math.min(l.width, 400) / 2, l.y + l.height / 2);
    return { ...c, ref: l.ref };
  },

  /**
   * Cursor × glifos: cada caractere visível das linhas do modelo em edição
   * deve ter o x de um glifo desenhado na mesma baseline. Devolve o nº de
   * caracteres conferidos e as divergências.
   */
  caretVsGlyphs(pi?: number): { checked: number; bad: { para: number; o: number; x: number }[] } {
    const e = need();
    const bad: { para: number; o: number; x: number }[] = [];
    let checked = 0;
    const paras = pi === undefined ? e.layoutCache.map((_, i) => i) : [pi];
    for (const p of paras) {
      const text = paraText(e.model!.paragraphs[p]!);
      for (const line of e.layoutCache[p]?.lines ?? []) {
        const page = e.eng!.result.pages[line.page]!;
        const xs: number[] = [];
        for (const it of page.items) {
          if (it.t !== 'glyphs' || it.y === undefined || Math.abs(it.y - line.baselineTwips) > 200) continue;
          for (const g of it.glyphs!) xs.push(g.x);
        }
        for (const c of line.eng?.chars ?? []) {
          const ch = text[c.o];
          // U+FFFC = objeto inline (imagem), não é glifo
          if (!ch || /\s/.test(ch) || ch === '￼' || c.w <= 0) continue;
          const cx = e.caretX({ para: p, offset: c.o }, line);
          checked++;
          if (!xs.some((x) => Math.abs(x - cx) < 0.01)) bad.push({ para: p, o: c.o, x: cx });
        }
      }
    }
    return { checked, bad: bad.slice(0, 10) };
  },

  /** Caret atual: página/x/baseline e se há um glifo exatamente ali (ou o fim do anterior). */
  caret(): { page: number; x: number; y: number; h: number; glyphAt: boolean } | null {
    const e = need();
    const pos = e.selection.focus;
    const line = e.lineOf(pos);
    if (!line) return null;
    const x = e.caretX(pos, line);
    const page = e.eng?.result.pages[line.page];
    let glyphAt = false;
    for (const it of page?.items ?? []) {
      if (it.t !== 'glyphs' || it.y === undefined || Math.abs(it.y - line.baselineTwips) > 200) continue;
      if (it.glyphs!.some((g) => Math.abs(g.x - x) < 0.01)) glyphAt = true;
    }
    // caret depois do último caractere da linha: confere com o fim do char anterior
    const c = line.eng?.chars ?? [];
    if (!glyphAt && c.some((k) => Math.abs(k.x + k.w - x) < 0.01)) glyphAt = true;
    if (!glyphAt && !c.length) glyphAt = Math.abs(x - (line.eng?.x ?? x)) < 0.01;
    return { page: line.page, x, y: line.yTwips, h: line.heightTwips, glyphAt };
  },

  /** Texto dos glifos desenhados na baseline de uma linha (o que se vê). */
  drawnText(pi: number, nth = 0): string {
    const e = need();
    const line = e.layoutCache[pi]?.lines[nth];
    if (!line) return '';
    const page = e.eng!.result.pages[line.page]!;
    const gl: { x: number; ch: string }[] = [];
    for (const it of page.items) {
      if (it.t !== 'glyphs' || Math.abs((it.y ?? 0) - line.baselineTwips) > 120) continue;
      for (const g of it.glyphs!) if (g.x >= line.xTwips - 1 && g.x <= line.xTwips + (line.eng?.width ?? 1e9) + 1) gl.push({ x: g.x, ch: String.fromCodePoint(g.cp) });
    }
    return gl.sort((a, b) => a.x - b.x).map((g) => g.ch).join('');
  },

  /** Faces dos glifos do intervalo [from,to) do parágrafo (negrito/itálico desenhado). */
  facesAt(pi: number, from: number, to: number): { bold: boolean; italic: boolean; family: string; sizePt: number }[] {
    const e = need();
    const out: { bold: boolean; italic: boolean; family: string; sizePt: number }[] = [];
    for (const line of e.layoutCache[pi]?.lines ?? []) {
      const page = e.eng!.result.pages[line.page]!;
      for (const c of line.eng?.chars ?? []) {
        if (c.o < from || c.o >= to) continue;
        for (const it of page.items) {
          if (it.t !== 'glyphs' || Math.abs((it.y ?? 0) - line.baselineTwips) > 200) continue;
          if (it.glyphs!.some((g) => Math.abs(g.x - c.x) < 0.01)) {
            out.push({ bold: !!it.face && (it.face.bold && !(it.face as { synthBold?: boolean }).synthBold || !!(it.face as { synthBold?: boolean }).synthBold), italic: !!it.face?.italic, family: it.face!.family, sizePt: it.sizePt! });
            break;
          }
        }
      }
    }
    return out;
  },

  /** Luminância mínima (0 = preto) num retângulo da página (twips) — tinta. */
  inkMin(page: number, xTw: number, yTw: number, wTw: number, hTw: number): number {
    const e = need();
    const c = e.canvases[page]!;
    const s = c.width / parseFloat(c.style.width) * PX_PER_TWIP * e.zoom;
    const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(Math.round(xTw * s), Math.round(yTw * s), Math.max(1, Math.round(wTw * s)), Math.max(1, Math.round(hTw * s))).data;
    let m = 255;
    for (let i = 0; i < d.length; i += 4) m = Math.min(m, 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!);
    return Math.round(m);
  },

  /** Texto dos glifos de cabeçalho/rodapé (linhas hdr:/ftr:) de cada página. */
  hfText(which: 'hdr' | 'ftr'): string[] {
    const e = need();
    return (e.eng?.result.pages ?? []).map((p) => {
      const ls = p.lines.filter((l) => l.ref.startsWith(which + ':'));
      return p.items.filter((it) => it.t === 'glyphs' && ls.some((l) => Math.abs((it.y ?? 0) - l.baseline) < 200)).map((it) => it.text ?? '').join('');
    });
  },

  /** Cor média de um retângulo da página (px do canvas) — confere adornos pintados. */
  pixel(page: number, xTw: number, yTw: number): number[] {
    const e = need();
    const c = e.canvases[page]!;
    const s = c.width / parseFloat(c.style.width) * PX_PER_TWIP * e.zoom;
    const d = c.getContext('2d')!.getImageData(Math.round(xTw * s), Math.round(yTw * s), 1, 1).data;
    return [d[0]!, d[1]!, d[2]!, d[3]!];
  },

  /** Mede digitação: n inserções de 1 caractere no parágrafo pi (layout + pintura). */
  timeTyping(pi: number, n = 10): { ms: number[]; stats: Record<string, number | string>[] } {
    const e = need();
    const ms: number[] = [];
    const stats: Record<string, number | string>[] = [];
    const len = paraText(e.model!.paragraphs[pi]!).length;
    e.selection = { anchor: { para: pi, offset: Math.floor(len / 2) }, focus: { para: pi, offset: Math.floor(len / 2) } };
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      e.type('x');
      ms.push(Math.round((performance.now() - t0) * 10) / 10);
      stats.push({ ...e.engineStats });
    }
    return { ms, stats };
  },

  /** Insere um inline de plugin (mention) no caret. */
  mention(label: string): void {
    const e = need();
    if (!e.pluginIds().includes('universalwrite.mention')) e.use(createMentionPlugin());
    e.insertCustomInline('mention', { id: label, label }, { fallbackText: '@' + label });
  },

  /** Mede digitação dentro da 1ª célula de tabela do corpo (null sem tabela). */
  timeCellTyping(n = 10): { ms: number[]; modes: string } | null {
    const e = need() as El & { enterCell(a: number, h: unknown[]): boolean };
    const el = e.eng?.lines.find((l) => l.loc.kind === 'cell') as { loc: { anchor: number; hops: unknown[] } } | undefined;
    if (!el || !e.enterCell(el.loc.anchor, el.loc.hops)) return null;
    const ms: number[] = [];
    let modes = '';
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      e.type('x');
      ms.push(Math.round((performance.now() - t0) * 10) / 10);
      modes += String(e.engineStats.mode)[0];
    }
    return { ms, modes };
  },

  /** O layout incremental (estado atual) é idêntico ao layout completo? */
  fastEqualsFull(): { mode: string; equal: boolean; pages: number; diff?: string } {
    const e = need();
    const ser = () => JSON.stringify(e.eng!.result.pages.map((p) => ({
      items: p.items.map((it) => ({ ...it, face: it.face ? `${it.face.family}|${it.face.bold}|${it.face.italic}` : undefined, image: undefined, style: undefined })),
      lines: p.lines,
    })), (_k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v));
    const mode = String(e.engineStats.mode);
    const a = ser();
    const pa = JSON.parse(a) as { items: unknown[]; lines: unknown[] }[];
    e.refresh(); // sem dica: layout completo
    const b = ser();
    const pb = JSON.parse(b) as { items: unknown[]; lines: unknown[] }[];
    let diff: string | undefined;
    if (a !== b) {
      outer: for (let p = 0; p < Math.max(pa.length, pb.length); p++) {
        for (const k of ['items', 'lines'] as const) {
          const x = pa[p]?.[k] ?? [], y = pb[p]?.[k] ?? [];
          for (let i = 0; i < Math.max(x.length, y.length); i++) {
            const sx = JSON.stringify(x[i]), sy = JSON.stringify(y[i]);
            if (sx !== sy) {
              let c = 0;
              while (c < sx.length && sx[c] === sy[c]) c++;
              diff = `pág ${p} ${k}[${i}] (${x.length}/${y.length}) @${c}: …${sx.slice(Math.max(0, c - 120), c + 120)}  ≠  …${sy.slice(Math.max(0, c - 120), c + 120)}`;
              break outer;
            }
          }
        }
      }
    }
    return { mode, equal: a === b, pages: e.pageCount, ...(diff ? { diff } : {}) };
  },

  call(name: string, ...args: unknown[]): unknown {
    const e = need() as unknown as Record<string, (...a: unknown[]) => unknown>;
    return e[name]!(...args);
  },

  set(name: string, value: unknown): void {
    (need() as unknown as Record<string, unknown>)[name] = value;
  },

  async exportPdfSize(): Promise<number> {
    return (await need().exportPdf()).length;
  },
};
