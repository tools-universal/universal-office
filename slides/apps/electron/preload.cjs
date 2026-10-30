// Ponte segura renderer ↔ main do shell desktop do Slides (window.universalSlides).
// O demo a transforma no `appHost` do <universal-slides> (ver demo/main.ts).
//
// ── Superfície completa ──────────────────────────────────────────────────
// Tipos: Bytes = ArrayBuffer | Uint8Array; OpenedDoc = { name, path, bytes: ArrayBuffer }.
//
// Arquivos
//   openPptx(): Promise<OpenedDoc | null>
//       Diálogo Abrir nativo (.pptx/.ppt). null = cancelado.
//   onOpenFile(cb: (doc: OpenedDoc & { id }) => void | boolean | Promise<void | boolean>): () => void
//       Apresentações abertas pelo SO (argumento da linha de comando, duplo
//       clique, 2ª instância, open-file do macOS). As que chegam antes da
//       assinatura ficam na fila. Quando o cb termina sem lançar e sem devolver
//       false, a janela vira dona do arquivo (saveFile aceita o path, entra nos
//       recentes). Retorna a função que cancela a assinatura.
//   saveFile({ suggestedName, bytes, path?, title? }): Promise<{ path, name } | null>
//       Salvar: com `path` (um caminho que o main entregou a esta janela) grava
//       direto nele; sem `path` (Salvar como) abre o diálogo. Temporário + rename.
//   exportFile({ suggestedName, format, bytes, title? }): Promise<{ path, name, format } | null>
//       Exportar ('pdf' | 'html' | 'md' | 'png'): `bytes` pode ser uma função
//       chamada só depois de o usuário escolher o destino. null = cancelado.
//
// Impressão
//   print({ pages: string[], title?, landscape? }): Promise<{ success, failureReason? }>
//       Diálogo de impressão do SISTEMA; pages = dataURLs PNG, uma por folha.
//
// Fontes do SO
//   resolveFonts(families: string[]): Promise<{ family, weight, style, bold, bytes: ArrayBuffer }[]>
//   listFonts(): Promise<string[]>
//
// Janela
//   setDirty(dirty: boolean, name: string): void   — confirmação nativa ao fechar.
//   onSaveBeforeClose(cb: () => void): void         — "Salvar" na confirmação.
//   closeWindow(): void                              — fecha sem nova confirmação.
//   setTitleTheme(dark: boolean): Promise<void>      — cor dos controles da janela.
//
// O main só atende frames da origem do app (http://127.0.0.1:<porta>).
const { contextBridge, ipcRenderer } = require('electron');

const isBytes = (b) => b instanceof ArrayBuffer || ArrayBuffer.isView(b);

contextBridge.exposeInMainWorld('universalSlides', {
  openPptx: () => ipcRenderer.invoke('us:open-pptx'),
  onOpenFile: (cb) => {
    // ack: a janela só vira dona do arquivo se o cb não lançar nem devolver false
    const listener = async (_e, doc) => {
      let ok = false;
      try { ok = (await cb(doc)) !== false; } catch (err) { console.error('[universalSlides] onOpenFile:', err); }
      ipcRenderer.send('us:file-opened', doc.id, ok);
    };
    ipcRenderer.on('us:open-file', listener);
    ipcRenderer.send('us:open-file-ready');
    return () => { ipcRenderer.removeListener('us:open-file', listener); };
  },
  saveFile: (opts) => ipcRenderer.invoke('us:save-file', {
    suggestedName: String(opts?.suggestedName ?? 'Apresentação.pptx'),
    bytes: opts?.bytes,
    path: opts?.path ? String(opts.path) : undefined,
    title: opts?.title ? String(opts.title) : undefined,
  }),
  exportFile: async (opts) => {
    const pick = await ipcRenderer.invoke('us:export-pick', {
      suggestedName: String(opts?.suggestedName ?? 'Apresentação'),
      format: String(opts?.format ?? 'pdf'),
      title: opts?.title ? String(opts.title) : undefined,
    });
    if (!pick) return null;
    let bytes = null;
    try {
      bytes = typeof opts.bytes === 'function' ? await opts.bytes(pick.format) : opts.bytes;
    } finally {
      // libera o token mesmo se a geração falhar (bytes null = não grava)
      if (!isBytes(bytes)) await ipcRenderer.invoke('us:export-write', pick.token, null);
    }
    if (!isBytes(bytes)) return null;
    return ipcRenderer.invoke('us:export-write', pick.token, bytes);
  },
  print: (opts) => ipcRenderer.invoke('us:print', opts ?? {}),
  resolveFonts: (families) => ipcRenderer.invoke('us:resolve-fonts', families),
  listFonts: () => ipcRenderer.invoke('us:list-fonts'),
  setDirty: (dirty, name) => ipcRenderer.send('us:set-dirty', !!dirty, String(name ?? '')),
  onSaveBeforeClose: (cb) => { ipcRenderer.on('us:save-before-close', () => cb()); },
  closeWindow: () => ipcRenderer.send('us:close-window'),
  setTitleTheme: (dark) => ipcRenderer.invoke('us:title-theme', !!dark),
});
