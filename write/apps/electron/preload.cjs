// Ponte segura renderer ↔ main: abrir .docx com leitura do Mark-of-the-Web +
// fontes instaladas no SO.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wordnext', {
  /** Abre diálogo nativo; retorna { name, bytes, motw } ou null.
   *  motw = o arquivo tem Zone.Identifier (critério REAL do Word). */
  openDocx: () => ipcRenderer.invoke('wn:open-docx'),
  /** Diálogo p/ escolher o outro lado da comparação; { name, bytes } ou null. */
  openDocxForCompare: (title) => ipcRenderer.invoke('wn:open-docx-compare', String(title ?? 'Comparar com…')),
  /** Sincroniza a cor dos controles de janela (titleBarOverlay) com o tema. */
  setTitleTheme: (dark) => ipcRenderer.invoke('wn:title-theme', !!dark),
  /** Resolve fontes do SO por família (Windows\Fonts + usuário + CloudFonts).
   *  Retorna [{ family, weight, style, bold, bytes: ArrayBuffer }]. */
  resolveFonts: (families) => ipcRenderer.invoke('wn:resolve-fonts', families),
  /** Nomes das famílias de fonte instaladas no SO, em ordem alfabética. */
  listFonts: () => ipcRenderer.invoke('wn:list-fonts'),
  /** Estado de alterações não salvas → confirmação nativa ao fechar a janela. */
  setDirty: (dirty, name) => ipcRenderer.send('wn:set-dirty', !!dirty, String(name ?? '')),
  /** Registra quem salva quando o usuário escolhe "Salvar" ao fechar. */
  onSaveBeforeClose: (cb) => { ipcRenderer.on('wn:save-before-close', () => cb()); },
  /** Fecha a janela sem nova confirmação (após salvar). */
  closeWindow: () => ipcRenderer.send('wn:close-window'),
});
