// Ponte segura renderer ↔ main do shell desktop do Write (window.wordnext).
//
// ── Superfície completa ──────────────────────────────────────────────────
// Tipos: Bytes = ArrayBuffer | Uint8Array; OpenedDoc = { name, path, bytes:
// ArrayBuffer, motw }, onde motw = o arquivo tem Zone.Identifier com ZoneId>=3
// (critério REAL do Word p/ Modo Protegido) e path é o caminho absoluto.
//
// Arquivos
//   openDocx(): Promise<OpenedDoc | null>
//       Diálogo Abrir nativo (.docx/.doc/.odt). null = cancelado.
//   onOpenFile(cb: (doc: OpenedDoc & { id }) => void | boolean | Promise<void | boolean>): () => void
//       Documentos abertos pelo SO: argumento da linha de comando, duplo
//       clique (associação de arquivo), 2ª instância, open-file do macOS.
//       Os que chegam antes da assinatura ficam na fila e são entregues ao
//       assinar; depois de um reload a fila espera um novo onOpenFile. Quando
//       o cb termina sem lançar e sem devolver false, a janela vira dona do
//       arquivo (saveFile aceita o path, entra nos recentes); senão o arquivo
//       é descartado. Retorna a função que cancela a assinatura.
//   openDocxForCompare(title?): Promise<{ name, bytes } | null>
//       Outro lado da comparação (somente leitura, sem MOTW).
//   saveFile({ suggestedName, bytes, path?, title? }): Promise<{ path, name } | null>
//       Salvar: com `path` (um caminho que o main entregou a esta janela —
//       openDocx/onOpenFile/saveFile) grava direto nele; sem `path`, ou se a
//       extensão de suggestedName não bate com a de `path`, abre o Salvar como
//       no formato de suggestedName. Grava em temporário + rename. Entra nos
//       recentes do SO. null = cancelado. Salvar como = omitir `path`.
//   exportFile({ suggestedName, bytes, formats?, title? }): Promise<{ path, name, format } | null>
//       Diálogo Exportar com os formatos pedidos (padrão 'pdf','html','odt',
//       'xps'; aceita também 'docx','doc','rtf','txt'). `bytes` pode ser uma
//       função (format) => Bytes | Promise<Bytes | null>, chamada só depois de
//       o usuário escolher destino/formato. null = cancelado.
//   clearRecents(): void
//       Limpa os recentes do SO (Jump List/Recentes do Windows, macOS).
//
// Impressão
//   print(opts?): Promise<{ success: boolean, failureReason?: string }>
//       Diálogo de impressão do SISTEMA (impressora, cópias, intervalo) —
//       sempre; não há impressão silenciosa. opts.pages: string[] (dataURLs
//       das páginas "como impressas", uma por folha) ou opts.html: string —
//       impressos numa janela oculta sem JS, sem rede e sem file:// (só
//       data:/blob:); sem nenhum dos dois imprime a própria página.
//       opts.title nomeia o trabalho. Pré-preenchem o diálogo (repassadas a
//       webContents.print): copies, pageRanges [{ from, to }] (base 0),
//       landscape, color, collate, duplexMode, pageSize, margins,
//       scaleFactor, pagesPerSheet, dpi, header, footer.
//   listPrinters(): Promise<Electron.PrinterInfo[]>
//
// Fontes do SO
//   resolveFonts(families: string[]): Promise<{ family, weight, style, bold, bytes: ArrayBuffer }[]>
//       Windows\Fonts + fontes do usuário + cache CloudFonts do Office.
//   listFonts(): Promise<string[]>  — famílias instaladas, em ordem alfabética.
//
// Janela
//   setDirty(dirty: boolean, name: string): void
//       Alterações não salvas → confirmação nativa ao fechar (Salvar / Não
//       salvar / Cancelar); no macOS também o ponto no botão de fechar.
//   onSaveBeforeClose(cb: () => void): void
//       "Salvar" na confirmação: o renderer salva e, dando certo, closeWindow().
//   closeWindow(): void  — fecha sem nova confirmação.
//   setTitleTheme(dark: boolean): Promise<void>
//       Cor dos controles de janela (titleBarOverlay) em sintonia com o tema.
//
// O main só atende frames da origem do app (http://127.0.0.1:<porta>);
// navegação e pop-ups para fora dela são bloqueados.
//
// Os nomes acima são contrato com o demo e com a interface de host do
// <universal-write>: renomear quebra os dois.
const { contextBridge, ipcRenderer } = require('electron');

const isBytes = (b) => b instanceof ArrayBuffer || ArrayBuffer.isView(b);

contextBridge.exposeInMainWorld('wordnext', {
  openDocx: () => ipcRenderer.invoke('wn:open-docx'),
  onOpenFile: (cb) => {
    // ack: a janela só vira dona do arquivo (Salvar, recentes) se o cb não
    // lançar nem devolver false
    const listener = async (_e, doc) => {
      let ok = false;
      try { ok = (await cb(doc)) !== false; } catch (err) { console.error('[wordnext] onOpenFile:', err); }
      ipcRenderer.send('wn:file-opened', doc.id, ok);
    };
    ipcRenderer.on('wn:open-file', listener);
    ipcRenderer.send('wn:open-file-ready');
    return () => { ipcRenderer.removeListener('wn:open-file', listener); };
  },
  openDocxForCompare: (title) => ipcRenderer.invoke('wn:open-docx-compare', String(title ?? 'Comparar com…')),
  saveFile: (opts) => ipcRenderer.invoke('wn:save-file', {
    suggestedName: String(opts?.suggestedName ?? 'Documento.docx'),
    bytes: opts?.bytes,
    path: opts?.path ? String(opts.path) : undefined,
    title: opts?.title ? String(opts.title) : undefined,
  }),
  exportFile: async (opts) => {
    const pick = await ipcRenderer.invoke('wn:export-pick', {
      suggestedName: String(opts?.suggestedName ?? 'Documento'),
      formats: Array.isArray(opts?.formats) ? opts.formats.map(String) : undefined,
      title: opts?.title ? String(opts.title) : undefined,
    });
    if (!pick) return null;
    let bytes = null;
    try {
      bytes = typeof opts.bytes === 'function' ? await opts.bytes(pick.format) : opts.bytes;
    } finally {
      // libera o token mesmo se a geração falhar (bytes null = não grava)
      if (!isBytes(bytes)) await ipcRenderer.invoke('wn:export-write', pick.token, null);
    }
    if (!isBytes(bytes)) return null;
    return ipcRenderer.invoke('wn:export-write', pick.token, bytes);
  },
  clearRecents: () => ipcRenderer.send('wn:clear-recents'),
  print: (opts) => ipcRenderer.invoke('wn:print', opts ?? {}),
  listPrinters: () => ipcRenderer.invoke('wn:list-printers'),
  resolveFonts: (families) => ipcRenderer.invoke('wn:resolve-fonts', families),
  listFonts: () => ipcRenderer.invoke('wn:list-fonts'),
  setDirty: (dirty, name) => ipcRenderer.send('wn:set-dirty', !!dirty, String(name ?? '')),
  onSaveBeforeClose: (cb) => { ipcRenderer.on('wn:save-before-close', () => cb()); },
  closeWindow: () => ipcRenderer.send('wn:close-window'),
  setTitleTheme: (dark) => ipcRenderer.invoke('wn:title-theme', !!dark),
});
