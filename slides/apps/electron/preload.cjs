// Ponte segura renderer ↔ main: File>Open nativo de .pptx + sincronia de tema.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('universalSlides', {
  /** Abre diálogo nativo; retorna { name, bytes } ou null. */
  openPptx: () => ipcRenderer.invoke('us:open-pptx'),
  /** Salva bytes do .pptx via diálogo nativo. Retorna o caminho ou null. */
  savePptx: (bytes, suggestedName) => ipcRenderer.invoke('us:save-pptx', bytes, suggestedName),
  /** Sincroniza cor dos controles de janela com o tema. */
  setTitleTheme: (dark) => ipcRenderer.invoke('us:title-theme', !!dark),
  /** Resolve fontes do SO por família (Windows\Fonts + usuário + CloudFonts).
   *  Retorna [{ family, weight, style, bytes: ArrayBuffer }]. */
  resolveFonts: (families) => ipcRenderer.invoke('us:resolve-fonts', families),
});
