// Demo do <universal-slides>: só HOSPEDA o componente. Barras (compacta ou
// ribbon), miniaturas, anotações, menus, apresentação, tema, arrastar e soltar
// e salvar/exportar/imprimir são do próprio componente; aqui fica o que é do
// app hospedeiro — a ponte do Electron (window.universalSlides) vira o
// `appHost` do elemento — e a apresentação de exemplo aberta ao iniciar.
import '../src/universal-slides';
import type { UniversalSlidesElement } from '../src/universal-slides';
import type { UniversalSlidesHost } from '../src/plugins';
import { FontResolver, type HostFontProvider } from '@universal-office/fonts';

type Bytes = ArrayBuffer | Uint8Array;
interface OpenedDoc { name: string; path?: string; bytes: ArrayBuffer }
interface SlidesBridge {
  openPptx?(): Promise<OpenedDoc | null>;
  saveFile?(o: { suggestedName: string; bytes: Bytes; path?: string }): Promise<{ path: string; name: string } | null>;
  exportFile?(o: { suggestedName: string; format: string; bytes: () => Promise<Bytes | null> }): Promise<{ path: string; name: string } | null>;
  print?(o: { pages: string[]; title: string; landscape?: boolean }): Promise<unknown>;
  setDirty?(dirty: boolean, name: string): void;
  onSaveBeforeClose?(cb: () => void): void;
  closeWindow?(): void;
  setTitleTheme?(dark: boolean): void;
  listFonts?: HostFontProvider['list'];
  resolveFonts?: HostFontProvider['resolve'];
  /** apresentações abertas pelo SO (argv, duplo clique, 2ª instância); devolve o "off" */
  onOpenFile?(cb: (doc: OpenedDoc) => boolean | Promise<boolean>): () => void;
}
const bridge = (window as unknown as { universalSlides?: SlidesBridge }).universalSlides;

// Electron: fontes do SO por família vêm do processo principal (Windows\Fonts +
// usuário + cache CloudFonts do Office, que o queryLocalFonts não enxerga) —
// configurado no resolvedor ÚNICO dos apps (shared/fonts)
FontResolver.shared().configure({
  baseUrl: './fonts',
  host: bridge?.listFonts && bridge.resolveFonts ? { list: bridge.listFonts, resolve: bridge.resolveFonts } : null,
});

const us = document.getElementById('us') as UniversalSlidesElement;
const setTitle = (t: string): void => { document.title = `${t} — Universal Slides`; };

if (bridge) {
  const enc = new TextEncoder();
  const host: UniversalSlidesHost = {
    openFile: bridge.openPptx ? () => bridge.openPptx!() : undefined,
    // o shell grava direto no caminho já conhecido e só pergunta no Salvar como
    saveFile: bridge.saveFile
      ? async (data, o) => bridge.saveFile!({ suggestedName: o.name, bytes: data, ...(o.path ? { path: o.path } : {}) })
      : undefined,
    exportFile: bridge.exportFile
      ? async (kind, name, data) => {
        const r = await bridge.exportFile!({
          suggestedName: name, format: kind,
          bytes: async () => { const d = await data(); return typeof d === 'string' ? enc.encode(d) : d; },
        });
        return r?.name ?? null;
      }
      : undefined,
    print: bridge.print ? async (o) => { await bridge.print!(o); } : undefined,
    setDirty: bridge.setDirty ? (d, n) => bridge.setDirty!(d, n) : undefined,
    onSaveBeforeClose: bridge.onSaveBeforeClose ? (cb) => bridge.onSaveBeforeClose!(cb) : undefined,
    closeWindow: bridge.closeWindow ? () => bridge.closeWindow!() : undefined,
    setTitleTheme: bridge.setTitleTheme ? (d) => bridge.setTitleTheme!(d) : undefined,
    setTitle,
    // janela sem moldura (titleBarOverlay): a linha de título reserva os controles e arrasta a janela
    windowControlsOverlay: true,
  };
  us.appHost = host;
} else {
  us.appHost = { setTitle };
}

// ───────────── boot: arquivo do SO (Electron) ou a apresentação de exemplo ─────────────
(async () => {
  let fromOs = false;
  if (bridge?.onOpenFile) {
    bridge.onOpenFile((doc) => {
      fromOs = true;
      try {
        us.openPresentation(new Uint8Array(doc.bytes), { name: doc.name, path: doc.path ?? null });
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    });
    // a fila do shell responde à assinatura num ida-e-volta de IPC
    await new Promise((r) => setTimeout(r, 150));
    if (fromOs) return;
  }
  for (const [url, name] of [['/samples/showcase_animado.pptx', 'showcase_animado.pptx'], ['/samples/reference.pptx', 'reference.pptx']] as const) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      if (fromOs) return;
      us.openPresentation(new Uint8Array(await res.arrayBuffer()), { name });
      return;
    } catch { /* próxima */ }
  }
  if (!fromOs) us.newPresentation();
})();
