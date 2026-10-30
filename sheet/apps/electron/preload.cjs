// Ponte segura renderer ↔ main do shell desktop do Sheet (window.universalSheet)
// — vira o `host` do <universal-sheet> no demo (ver demo/main.ts).
//
// Arquivos
//   openXlsx(): Promise<{ name, path, bytes: ArrayBuffer } | null>
//       Diálogo Abrir nativo (.xlsx/.xlsm/.xls). null = cancelado.
//   onOpenFile(cb: (doc: { name, path, bytes }) => void | boolean | Promise<…>): () => void
//       Planilhas abertas pelo SO (argumento da linha de comando, duplo clique,
//       2ª instância, open-file do macOS). As que chegam antes da assinatura
//       ficam na fila e são entregues ao assinar. Devolve o "off".
//   saveFile({ suggestedName, bytes, path? }): Promise<{ path, name } | null>
//       Salvar o .xlsx: com `path` (um caminho que o main entregou a esta
//       janela) grava direto; sem ele, o Salvar como. null = cancelado.
//   exportFile({ suggestedName, kind, bytes: () => Promise<Bytes | null> }): Promise<{ path, name } | null>
//       Exportar (pdf, ods, csv, tsv, html, md, xml): o destino primeiro; os
//       bytes só depois da escolha. null = cancelado.
//
// Janela
//   setDirty(dirty, name)            alterações não salvas → confirmação ao fechar
//   onSaveBeforeClose(cb)            "Salvar" na confirmação: o renderer salva e chama closeWindow()
//   closeWindow()                    fecha sem nova confirmação
//   setTitleTheme(dark, bar?)        cor dos controles da janela (bar: #RRGGBB do fundo da barra)
//
// Fontes do SO
//   resolveFonts(families), listFonts()
//
// O main só atende frames da origem do app (http://127.0.0.1:<porta>).
const { contextBridge, ipcRenderer } = require('electron');

const isBytes = (b) => b instanceof ArrayBuffer || ArrayBuffer.isView(b);

contextBridge.exposeInMainWorld('universalSheet', {
  openXlsx: () => ipcRenderer.invoke('us:open-xlsx'),
  onOpenFile: (cb) => {
    const listener = async (_e, doc) => {
      try { await cb(doc); } catch (err) { console.error('[universalSheet] onOpenFile:', err); }
    };
    ipcRenderer.on('us:open-file', listener);
    // a página (o demo) está pronta: o main entrega a fila
    ipcRenderer.send('us:open-file-ready');
    return () => { ipcRenderer.removeListener('us:open-file', listener); };
  },
  saveFile: (opts) => ipcRenderer.invoke('us:save-file', {
    suggestedName: String(opts?.suggestedName ?? 'Pasta1.xlsx'),
    bytes: opts?.bytes,
    path: opts?.path ? String(opts.path) : undefined,
  }),
  exportFile: async (opts) => {
    const pick = await ipcRenderer.invoke('us:export-pick', {
      suggestedName: String(opts?.suggestedName ?? 'Pasta1'),
      kind: String(opts?.kind ?? ''),
    });
    if (!pick) return null;
    let bytes = null;
    try {
      bytes = typeof opts.bytes === 'function' ? await opts.bytes() : opts.bytes;
    } finally {
      // libera o token mesmo se a geração falhar (bytes null = não grava)
      if (!isBytes(bytes)) await ipcRenderer.invoke('us:export-write', pick.token, null);
    }
    if (!isBytes(bytes)) return null;
    return ipcRenderer.invoke('us:export-write', pick.token, bytes);
  },
  setDirty: (dirty, name) => ipcRenderer.send('us:set-dirty', !!dirty, String(name ?? '')),
  onSaveBeforeClose: (cb) => { ipcRenderer.on('us:save-before-close', () => cb()); },
  closeWindow: () => ipcRenderer.send('us:close-window'),
  setTitleTheme: (dark, bar) => ipcRenderer.invoke('us:title-theme', !!dark, typeof bar === 'string' ? bar : undefined),
  resolveFonts: (families) => ipcRenderer.invoke('us:resolve-fonts', families),
  listFonts: () => ipcRenderer.invoke('us:list-fonts'),
});
