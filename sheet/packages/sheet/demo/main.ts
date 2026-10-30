// Demo do <universal-sheet>: só HOSPEDA o componente. Barras (compacta ou
// ribbon), menus, barra de fórmulas, guias, status, localizar, formatar,
// abrir/salvar/exportar/imprimir, tema e arrastar e soltar são do próprio
// componente (atributos topbar/bottombar); aqui ficam o que é do app
// hospedeiro — a ponte do Electron (window.universalSheet) vira o `host` do
// elemento — e a planilha de exemplo aberta ao iniciar. `?bare` mostra só a
// grade (os labs de fidelidade capturam o canvas sem as barras).
import '../src/universal-sheet';
import type { UniversalSheetElement } from '../src/universal-sheet';
import { openWorkbook, type UniversalSheetHost } from '../src/index';
import { FontResolver, type HostFontProvider } from '@universal-office/fonts';

type Bytes = ArrayBuffer | Uint8Array;
interface OpenedFile { name: string; path?: string; bytes: ArrayBuffer }
interface SheetBridge {
  openXlsx?(): Promise<OpenedFile | null>;
  /** planilhas abertas pelo SO (argv, duplo clique, 2ª instância); devolve o "off" */
  onOpenFile?(cb: (doc: OpenedFile) => Promise<boolean>): () => void;
  saveFile?(o: { suggestedName: string; bytes: Bytes; path?: string }): Promise<{ path: string; name: string } | null>;
  exportFile?(o: { suggestedName: string; kind: string; bytes: () => Promise<Bytes | null> }): Promise<{ path: string; name: string } | null>;
  setTitleTheme?(dark: boolean, bar?: string): void;
  listFonts?: HostFontProvider['list'];
  resolveFonts?: HostFontProvider['resolve'];
  setDirty?(dirty: boolean, name: string): void;
  onSaveBeforeClose?(cb: () => void): void;
  closeWindow?(): void;
}
const bridge = (window as unknown as { universalSheet?: SheetBridge }).universalSheet;

// Electron: fontes do SO pela ponte do main process (Windows\Fonts + fontes do
// usuário + cache CloudFonts do Office, que o queryLocalFonts não enxerga) —
// no resolvedor ÚNICO dos apps (shared/fonts), antes da 1ª planilha
FontResolver.shared().configure({
  baseUrl: './fonts',
  host: bridge?.listFonts && bridge.resolveFonts ? { list: bridge.listFonts, resolve: bridge.resolveFonts } : null,
});

const us = document.getElementById('us') as UniversalSheetElement;
if (new URLSearchParams(location.search).has('bare')) {
  us.removeAttribute('topbar');
  us.removeAttribute('bottombar');
}

const setTitle = (t: string): void => { document.title = `${t} — Universal Sheet`; };
if (bridge) {
  const enc = new TextEncoder();
  const host: UniversalSheetHost = {
    openFile: bridge.openXlsx ? () => bridge.openXlsx!() : undefined,
    // salvar/exportar nativos: grava direto no caminho já conhecido e pergunta só no Salvar como
    saveFile: bridge.saveFile
      ? (data, o) => bridge.saveFile!({ suggestedName: o.name, bytes: data, ...(o.path ? { path: o.path } : {}) })
      : undefined,
    exportFile: bridge.exportFile
      ? async (kind, name, data) => {
        const r = await bridge.exportFile!({
          suggestedName: name, kind,
          bytes: async () => { const d = await data(); return typeof d === 'string' ? enc.encode(d) : d; },
        });
        return r?.name ?? null;
      }
      : undefined,
    setTitleTheme: bridge.setTitleTheme ? (d, c) => bridge.setTitleTheme!(d, c) : undefined,
    setDirty: bridge.setDirty ? (d, n) => bridge.setDirty!(d, n) : undefined,
    onSaveBeforeClose: bridge.onSaveBeforeClose ? (cb) => bridge.onSaveBeforeClose!(cb) : undefined,
    closeWindow: bridge.closeWindow ? () => bridge.closeWindow!() : undefined,
    setTitle,
    // janela sem moldura (titleBarOverlay): a linha de título reserva os controles e arrasta a janela
    windowControlsOverlay: true,
  };
  us.host = host;
} else {
  us.host = { setTitle };
}

(async () => {
  // Electron: planilhas que o SO mandou abrir chegam pela fila do shell e
  // substituem a de exemplo
  let fromOs = false;
  if (bridge?.onOpenFile) {
    bridge.onOpenFile(async (doc) => {
      fromOs = true;
      return openWorkbook(us, new Uint8Array(doc.bytes), doc.name, doc.path ? { path: doc.path } : {});
    });
    // a fila do shell responde à assinatura num ida-e-volta de IPC
    await new Promise((r) => setTimeout(r, 150));
    if (fromOs) return;
  }
  try {
    const res = await fetch('/samples/showcase.xlsx');
    if (res.ok) {
      await openWorkbook(us, new Uint8Array(await res.arrayBuffer()), 'showcase.xlsx');
      return;
    }
  } catch { /* sem exemplo (app empacotado) */ }
  us.newWorkbook();
  us.focus();
})();
