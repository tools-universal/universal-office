// Demo do <universal-write>: só HOSPEDA o componente. Barras (compacta ou
// ribbon), menus, localizar, comentários, comparar, salvamento automático,
// recentes, Modo Protegido, tema e arrastar e soltar são do próprio componente;
// aqui ficam o que é do app hospedeiro — a ponte do Electron (window.wordnext)
// vira o `host` do elemento — e o documento de exemplo aberto ao iniciar.
import '../src/universal-write.js';
import type { UniversalWriteElement } from '../src/universal-write.js';
import { openDocument, type UniversalWriteHost } from '../src/index.js';
import { FontResolver, type HostFontProvider } from '@universal-office/fonts';
import { createMentionPlugin } from '../src/mention-plugin.js';

type Bytes = ArrayBuffer | Uint8Array;
interface OpenedDoc { name: string; path: string; bytes: ArrayBuffer; motw: boolean }
interface WordNextBridge {
  openDocx(): Promise<OpenedDoc | null>;
  /** documentos abertos pelo SO (argv, duplo clique, 2ª instância); devolve o "off" */
  onOpenFile?(cb: (doc: OpenedDoc) => Promise<boolean>): () => void;
  saveFile?(o: { suggestedName: string; bytes: Bytes; path?: string }): Promise<{ path: string; name: string } | null>;
  exportFile?(o: { suggestedName: string; formats: string[]; bytes: (format: string) => Promise<Bytes | null> }): Promise<{ path: string; name: string } | null>;
  print?(o: { pages: string[]; title: string }): Promise<{ success: boolean }>;
  openDocxForCompare?(title: string): Promise<{ name: string; bytes: ArrayBuffer } | null>;
  setTitleTheme?(dark: boolean): void;
  listFonts?: HostFontProvider['list'];
  resolveFonts?: HostFontProvider['resolve'];
  setDirty?(dirty: boolean, name: string): void;
  onSaveBeforeClose?(cb: () => void): void;
  closeWindow?(): void;
}
const bridge = (window as unknown as { wordnext?: WordNextBridge }).wordnext;

// Electron: fontes do SO pela ponte do main process (Windows\Fonts + fontes do
// usuário + cache CloudFonts do Office, que o queryLocalFonts não enxerga) —
// no resolvedor ÚNICO dos apps (shared/fonts), antes do 1º documento
FontResolver.shared().configure({
  baseUrl: './fonts',
  host: bridge?.listFonts && bridge.resolveFonts ? { list: bridge.listFonts, resolve: bridge.resolveFonts } : null,
});

const wn = document.getElementById('wn') as UniversalWriteElement;
wn.use(createMentionPlugin());
// Planilha do Excel incorporada: o <universal-sheet> (produto Sheet) só quando for usado
wn.sheetLoader = () => import(new URL('./sheet-bundle.js', import.meta.url).href);

if (bridge) {
  const host: UniversalWriteHost = {
    openFile: () => bridge.openDocx(),
    // salvar/exportar/imprimir nativos: o shell grava direto no caminho já
    // conhecido, pergunta só no Salvar como, e imprime pelo diálogo do sistema
    saveFile: bridge.saveFile
      ? (data, o) => bridge.saveFile!({ suggestedName: o.name, bytes: data, ...(o.path ? { path: o.path } : {}) })
      : undefined,
    exportFile: bridge.exportFile
      ? async (kind, name, data) => {
        const enc = new TextEncoder();
        const r = await bridge.exportFile!({
          suggestedName: name.replace(/\.[^.]+$/, ''),
          formats: [kind],
          bytes: async () => { const d = await data(); return typeof d === 'string' ? enc.encode(d) : d; },
        });
        return r?.name ?? null;
      }
      : undefined,
    print: bridge.print ? async (o) => { await bridge.print!(o); } : undefined,
    openFileForCompare: bridge.openDocxForCompare ? (t) => bridge.openDocxForCompare!(t) : undefined,
    setTitleTheme: bridge.setTitleTheme ? (d) => bridge.setTitleTheme!(d) : undefined,
    setDirty: bridge.setDirty ? (d, n) => bridge.setDirty!(d, n) : undefined,
    onSaveBeforeClose: bridge.onSaveBeforeClose ? (cb) => bridge.onSaveBeforeClose!(cb) : undefined,
    closeWindow: bridge.closeWindow ? () => bridge.closeWindow!() : undefined,
    setTitle: (t) => { document.title = `${t} — Write`; },
    // janela sem moldura (titleBarOverlay): a linha de título reserva os controles
    windowControlsOverlay: true,
  };
  wn.host = host;
} else {
  wn.host = { setTitle: (t) => { document.title = `${t} — Write`; } };
}

wn.addEventListener('uw-ready', async () => {
  // Electron: documentos que o SO mandou abrir (argv, duplo clique, 2ª
  // instância) chegam pela fila do shell — e substituem o documento de exemplo
  let fromOs = false;
  if (bridge?.onOpenFile) {
    bridge.onOpenFile(async (doc) => {
      fromOs = true;
      return openDocument(wn, new Uint8Array(doc.bytes), doc.name, { motw: doc.motw, path: doc.path });
    });
    // a fila do shell responde à assinatura num ida-e-volta de IPC
    await new Promise((r) => setTimeout(r, 150));
    if (fromOs) return;
  }
  // abre o catálogo de recursos por padrão; veio da REDE: equivale a ter
  // Mark-of-the-Web (abre no Modo Protegido, como no Word)
  try {
    const resp = await fetch('/samples/Catalogo-Recursos-Word.docx');
    if (resp.ok) {
      await openDocument(wn, new Uint8Array(await resp.arrayBuffer()), 'Catalogo-Recursos-Word.docx', {
        motw: true, trustKey: 'url:/samples/Catalogo-Recursos-Word.docx',
      });
      return;
    }
  } catch { /* segue vazio */ }
  wn.focusEditor();
}, { once: true });
