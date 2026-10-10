// Ponte segura renderer ↔ main: File>Open nativo de .xlsx + sincronia de tema.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('universalSheet', {
  /** Abre diálogo nativo; retorna { name, bytes } ou null. */
  openXlsx: () => ipcRenderer.invoke('us:open-xlsx'),
  /** Salva bytes do .xlsx via diálogo nativo. Retorna o caminho ou null. */
  saveXlsx: (bytes, suggestedName) => ipcRenderer.invoke('us:save-xlsx', bytes, suggestedName),
  /** Salva bytes em qualquer formato (Salvar como). Retorna o caminho ou null. */
  saveFile: (bytes, defaultName, filterName, ext) =>
    ipcRenderer.invoke('us:save-file', bytes, defaultName, filterName, ext),
  /** Sincroniza cor dos controles de janela com o tema. */
  setTitleTheme: (dark) => ipcRenderer.invoke('us:title-theme', !!dark),
  /** Resolve fontes do SO por família (Windows\Fonts + usuário + CloudFonts).
   *  Retorna [{ family, weight, style, bold, bytes: ArrayBuffer }]. */
  resolveFonts: (families) => ipcRenderer.invoke('us:resolve-fonts', families),
  /** Nomes das famílias de fonte instaladas no SO, em ordem alfabética. */
  listFonts: () => ipcRenderer.invoke('us:list-fonts'),
});
