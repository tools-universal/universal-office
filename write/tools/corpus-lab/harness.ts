// Harness do corpus-lab: abre um .docx no <universal-write> (headless), espera
// fontes/imagens assentarem e entrega (a) as páginas do CANVAS em PNG a 96 dpi
// e (b) o PDF do exportPdf(). As fontes do SO vêm pela "ponte do host" exposta
// pelo Playwright — a MESMA configuração do shell Electron (system-fonts.cjs).
import '../../packages/editor/src/universal-write.js';
import type { UniversalWriteElement } from '../../packages/editor/src/universal-write.js';
import { FontResolver, type HostFontFace } from '@universal-office/fonts';

interface HostFaceRef extends Omit<HostFontFace, 'bytes'> { url: string }
interface LabWindow {
  __labListFonts(): Promise<string[]>;
  __labResolveFonts(families: string[]): Promise<HostFaceRef[]>;
  lab: unknown;
}
const w = window as unknown as LabWindow;
const FONTS_BASE = '/write/packages/editor/demo/fonts';
const params = new URLSearchParams(location.search);

FontResolver.shared().configure({
  baseUrl: FONTS_BASE,
  host: params.get('host') === '0' ? null : {
    list: () => w.__labListFonts(),
    resolve: async (families) => {
      const refs = await w.__labResolveFonts(families);
      return Promise.all(refs.map(async ({ url, ...f }) => ({
        ...f, bytes: await (await fetch(url)).arrayBuffer(),
      })));
    },
  },
});

/** Acesso aos internos do componente (TS private ≠ privado em runtime). */
interface Internals {
  canvases: HTMLCanvasElement[];
  allocatedPages: Set<number>;
  pageCount: number;
  paint(filter?: Set<number>): void;
  pageImageForPrint(i: number): string;
  settleDocumentFonts(): Promise<void>;
  ensureImagesDecoded(): Promise<void>;
  bufferScaleFor(c: HTMLCanvasElement): number;
  fonts?: { families(): string[] };
  fontResolver?: { getWithFile(f: string): { source: string; cssFamily: string } | null };
  askedFonts?: Set<string>;
}

let el: (UniversalWriteElement & Internals) | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bytesToBase64(b: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < b.length; i += CH) s += String.fromCharCode(...b.subarray(i, i + CH));
  return btoa(s);
}

w.lab = {
  /** Abre o documento; devolve nº de páginas e as fontes (pedida → origem). */
  async open(url: string): Promise<{ pages: number; fonts: Record<string, string>; ms: number }> {
    const t0 = performance.now();
    document.body.replaceChildren();
    el = document.createElement('universal-write') as UniversalWriteElement & Internals;
    el.setAttribute('manual-init', '');
    el.setAttribute('fonts', FONTS_BASE);
    el.style.cssText = 'display:block;width:1400px;height:1000px';
    document.body.append(el);
    await el.initialize();
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    el.load(bytes, 'auto', { protected: false });
    // fontes embutidas (async), resolvedor do host e refresh enfileirado
    for (let i = 0; i < 3; i++) {
      await sleep(30);
      await el.settleDocumentFonts();
    }
    await el.ensureImagesDecoded();
    await sleep(20);
    const fonts: Record<string, string> = {};
    for (const f of el.askedFonts ?? []) {
      const r = el.fontResolver?.getWithFile(f);
      fonts[f] = r ? `${r.source}:${r.cssFamily}` : 'pending';
    }
    return { pages: el.pageCount, fonts, ms: Math.round(performance.now() - t0) };
  },

  /** PNG (dataURL) da página i "como impressa", a 96 dpi (zoom 1, dpr 1). */
  async page(i: number): Promise<string> {
    if (!el) throw new Error('nada aberto');
    // 1ª pintura dispara a decodificação async (SVG/bitmaps); a 2ª já os tem
    el.pageImageForPrint(i);
    await sleep(15);
    return el.pageImageForPrint(i);
  },

  async pdf(): Promise<string> {
    if (!el) throw new Error('nada aberto');
    return bytesToBase64(await el.exportPdf());
  },
};
