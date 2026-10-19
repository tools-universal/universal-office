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

interface WordNextBridge {
  openDocx(): Promise<{ name: string; bytes: ArrayBuffer; motw: boolean } | null>;
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

if (bridge) {
  const host: UniversalWriteHost = {
    openFile: () => bridge.openDocx(),
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
