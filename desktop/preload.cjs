// Ponte segura renderer ↔ main da suíte Universal Office (Beta). Cada página
// recebe a ponte do SEU editor, com os nomes que o demo e a interface de host
// do componente já usam (renomear quebra os dois):
//   Write  (/packages/editor/demo) → window.wordnext
//   Sheet  (/packages/sheet/demo)  → window.universalSheet
//   Slides (/packages/slides/demo) → window.universalSlides
//   boas-vindas (/welcome/)        → window.universalOffice
// Todas falam com o mesmo main pelos canais uo:*; o main sabe o editor de cada
// janela e aplica o perfil dele (editors.cjs). (Preload em sandbox: não pode
// importar arquivos locais, então o mapeamento por caminho fica aqui.)
//
// ── Superfície ───────────────────────────────────────────────────────────
// Tipos: Bytes = ArrayBuffer | Uint8Array; OpenedDoc = { name, path, bytes:
// ArrayBuffer, motw }, onde motw = o arquivo tem Zone.Identifier com ZoneId>=3
// (critério REAL do Word p/ Modo Protegido) e path é o caminho absoluto.
//
// Comum aos três editores
//   open<Docx|Xlsx|Pptx>(): Promise<OpenedDoc | null>
//       Diálogo Abrir nativo com os tipos do editor. null = cancelado.
//   onOpenFile(cb: (doc: OpenedDoc & { id }) => void | boolean | Promise<void | boolean>): () => void
//       Documentos abertos pelo SO: argumento da linha de comando, duplo
//       clique (associação de arquivo), 2ª instância, open-file do macOS — já
//       roteados pela extensão para a janela do editor certo. Os que chegam
//       antes da assinatura ficam na fila e são entregues ao assinar; depois de
//       um reload a fila espera um novo onOpenFile. Quando o cb termina sem
//       lançar e sem devolver false, a janela vira dona do arquivo (saveFile
//       aceita o path, entra nos recentes); senão o arquivo é descartado.
//       Retorna a função que cancela a assinatura.
//   saveFile({ suggestedName, bytes, path?, title? }): Promise<{ path, name } | null>
//       Salvar: com `path` (um caminho que o main entregou a esta janela) grava
//       direto nele; sem `path`, ou se o formato de suggestedName não é o de
//       `path`, abre o Salvar como. Grava em temporário + rename (o MOTW do
//       original passa para o novo). Entra nos recentes do SO. null = cancelado.
//   exportFile(…): Promise<{ path, name, format } | null>
//       Write: { suggestedName, bytes, formats?, title? } (padrão 'pdf','html',
//       'odt','xps'; aceita também 'docx','doc','rtf','txt'); Sheet:
//       { suggestedName, kind, bytes } (pdf, ods, csv, tsv, html, md, xml);
//       Slides: { suggestedName, format, bytes, title? } (pdf, html, md, png).
//       `bytes` pode ser uma função chamada só depois de o usuário escolher
//       destino/formato. null = cancelado.
//   resolveFonts(families: string[]): Promise<{ family, weight, style, bold, bytes: ArrayBuffer }[]>
//       Windows\Fonts + fontes do usuário + cache CloudFonts do Office.
//   listFonts(): Promise<string[]>  — famílias instaladas, em ordem alfabética.
//   setDirty(dirty: boolean, name: string): void
//       Alterações não salvas → confirmação nativa ao fechar (Salvar / Não
//       salvar / Cancelar); no macOS também o ponto no botão de fechar.
//   onSaveBeforeClose(cb: () => void): void
//       "Salvar" na confirmação: o renderer salva e, dando certo, closeWindow().
//   closeWindow(): void  — fecha sem nova confirmação.
//   setTitleTheme(dark: boolean, bar?: string): Promise<void>
//       Cor dos controles de janela (titleBarOverlay) em sintonia com o tema;
//       bar (Sheet) = #RRGGBB do fundo da barra da página.
//
// Write: também openDocxForCompare(title?) (outro lado da comparação,
// somente leitura, sem MOTW), print(opts?) e listPrinters(), clearRecents(),
// userName(). Slides: também print({ pages, title?, landscape? }).
// print(): diálogo de impressão do SISTEMA — sempre. opts.pages: string[]
// (dataURLs das páginas "como impressas", uma por folha) ou opts.html: string
// (Write) — impressos numa janela oculta sem JS, sem rede e sem file://; sem
// nenhum dos dois (Write) imprime a própria página. Pré-preenchem o diálogo:
// copies, pageRanges [{ from, to }] (base 0), landscape, color, collate,
// duplexMode, pageSize, margins, scaleFactor, pagesPerSheet, dpi, header, footer.
//
// Idioma da interface (pt-BR, en-US, es): as três pontes têm
// setUiLanguage(lang) (o menu Idioma que o app põe em cada editor); o preload
// aplica o idioma no atributo `lang` do componente assim que ele aparece no
// documento (antes de montar a barra) e a cada troca, em todas as janelas.
//
// Boas-vindas (window.universalOffice): info(), recents(), newDocument(),
// open(), openRecent(path), removeRecent(path), clearRecents(),
// showEditor(kind), licenses(), setLanguage(lang), onLanguage(cb), onRecentsChanged(cb).
//
// O main só atende frames da origem do app (http://127.0.0.1:<porta>);
// navegação e pop-ups para fora dela são bloqueados.
const { contextBridge, ipcRenderer } = require('electron');

const isBytes = (b) => b instanceof ArrayBuffer || ArrayBuffer.isView(b);
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

function onOpenFile(cb) {
  // ack: a janela só vira dona do arquivo (Salvar, recentes) se o cb não
  // lançar nem devolver false
  const listener = async (_e, doc) => {
    let ok = false;
    try { ok = (await cb(doc)) !== false; } catch (err) { console.error('[universal-office] onOpenFile:', err); }
    ipcRenderer.send('uo:file-opened', doc.id, ok);
  };
  ipcRenderer.on('uo:open-file', listener);
  ipcRenderer.send('uo:open-file-ready');
  return () => { ipcRenderer.removeListener('uo:open-file', listener); };
}

const saveFile = (untitled) => (opts) => invoke('uo:save-file', {
  suggestedName: String(opts?.suggestedName ?? untitled),
  bytes: opts?.bytes,
  path: opts?.path ? String(opts.path) : undefined,
  title: opts?.title ? String(opts.title) : undefined,
});

/** Exportar em duas etapas: destino e formato primeiro, os bytes depois. */
async function exportFile({ suggestedName, formats, title, bytes }) {
  const pick = await invoke('uo:export-pick', { suggestedName, formats, title });
  if (!pick) return null;
  let data = null;
  try {
    data = typeof bytes === 'function' ? await bytes(pick.format) : bytes;
  } finally {
    // libera o token mesmo se a geração falhar (bytes null = não grava)
    if (!isBytes(data)) await invoke('uo:export-write', pick.token, null);
  }
  if (!isBytes(data)) return null;
  return invoke('uo:export-write', pick.token, data);
}

const setUiLanguage = (lang) => invoke('uo:set-lang', String(lang));
const common = {
  onOpenFile,
  setUiLanguage,
  resolveFonts: (families) => invoke('uo:resolve-fonts', families),
  listFonts: () => invoke('uo:list-fonts'),
  setDirty: (dirty, name) => ipcRenderer.send('uo:set-dirty', !!dirty, String(name ?? '')),
  onSaveBeforeClose: (cb) => { ipcRenderer.on('uo:save-before-close', () => cb()); },
  closeWindow: () => ipcRenderer.send('uo:close-window'),
};
const strOrUndef = (v) => (v ? String(v) : undefined);

const LegacyUserWordsKey = 'universal-office.spell.user-words';
const legacyUserWords = () => {
  try {
    const words = JSON.parse(localStorage.getItem(LegacyUserWordsKey) ?? '[]');
    return Array.isArray(words) ? words.filter((w) => typeof w === 'string') : [];
  } catch {
    return [];
  }
};

// idioma da interface no `lang` do componente (e, no Write, no
// `spellcheck-default-lang`): assim que o elemento aparece
// (o parser o insere antes dos scripts de módulo rodarem) e a cada troca
const TAGS = { '/packages/editor/': 'universal-write', '/packages/sheet/': 'universal-sheet', '/packages/slides/': 'universal-slides' };
const path = location.pathname;
const tag = Object.entries(TAGS).find(([prefix]) => path.startsWith(prefix))?.[1];
if (tag) {
  let lang = ipcRenderer.sendSync('uo:get-lang');
  // no Write, o mesmo idioma é o da revisão do texto sem idioma e do documento novo
  const spellLang = () => (lang === 'es' ? 'es-ES' : lang);
  const apply = () => {
    for (const el of document.getElementsByTagName(tag)) {
      if (lang && el.getAttribute('lang') !== lang) el.setAttribute('lang', lang);
      if (lang && tag === 'universal-write' && el.getAttribute('spellcheck-default-lang') !== spellLang()) el.setAttribute('spellcheck-default-lang', spellLang());
    }
  };
  const watch = new MutationObserver(() => { if (document.getElementsByTagName(tag).length) { apply(); watch.disconnect(); } });
  watch.observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => { apply(); watch.disconnect(); });
  ipcRenderer.on('uo:lang', (_e, l) => { lang = l; apply(); });
}

if (path.startsWith('/packages/editor/')) {
  contextBridge.exposeInMainWorld('wordnext', {
    ...common,
    openDocx: () => invoke('uo:open'),
    openDocxForCompare: (title) => invoke('uo:open-compare', String(title ?? 'Comparar com…')),
    saveFile: saveFile('Documento.docx'),
    exportFile: (opts) => exportFile({
      suggestedName: String(opts?.suggestedName ?? 'Documento'),
      formats: Array.isArray(opts?.formats) ? opts.formats.map(String) : undefined,
      title: strOrUndef(opts?.title),
      bytes: opts?.bytes,
    }),
    clearRecents: () => ipcRenderer.send('uo:clear-recents'),
    print: (opts) => invoke('uo:print', opts ?? {}),
    listPrinters: () => invoke('uo:list-printers'),
    setTitleTheme: (dark) => invoke('uo:title-theme', !!dark),
    userName: () => invoke('uo:user-name'),
    // dicionário do usuário num arquivo do perfil (o localStorage depende da porta
    // do servidor local); na 1ª vez, traz as palavras que estavam no localStorage
    loadUserWords: async () => {
      const words = await invoke('uo:user-words-load');
      const legacy = legacyUserWords();
      if (!legacy.length) return words;
      const merged = [...new Set([...words, ...legacy])].sort();
      await invoke('uo:user-words-save', merged);
      try { localStorage.removeItem(LegacyUserWordsKey); } catch { /* sem armazenamento */ }
      return merged;
    },
    saveUserWords: (words) => invoke('uo:user-words-save', Array.isArray(words) ? words.map(String) : []),
  });
} else if (path.startsWith('/packages/sheet/')) {
  contextBridge.exposeInMainWorld('universalSheet', {
    ...common,
    openXlsx: () => invoke('uo:open'),
    saveFile: saveFile('Pasta1.xlsx'),
    exportFile: (opts) => exportFile({
      suggestedName: String(opts?.suggestedName ?? 'Pasta1'),
      formats: [String(opts?.kind ?? '')],
      // o Sheet gera os bytes sem argumento
      bytes: typeof opts?.bytes === 'function' ? () => opts.bytes() : opts?.bytes,
    }),
    setTitleTheme: (dark, bar) => invoke('uo:title-theme', !!dark, typeof bar === 'string' ? bar : undefined),
  });
} else if (path.startsWith('/packages/slides/')) {
  contextBridge.exposeInMainWorld('universalSlides', {
    ...common,
    openPptx: () => invoke('uo:open'),
    saveFile: saveFile('Apresentação.pptx'),
    exportFile: (opts) => exportFile({
      suggestedName: String(opts?.suggestedName ?? 'Apresentação'),
      formats: [String(opts?.format ?? 'pdf')],
      title: strOrUndef(opts?.title),
      bytes: opts?.bytes,
    }),
    print: (opts) => invoke('uo:print', opts ?? {}),
    setTitleTheme: (dark) => invoke('uo:title-theme', !!dark),
  });
} else if (path.startsWith('/welcome/')) {
  contextBridge.exposeInMainWorld('universalOffice', {
    info: () => invoke('uo:welcome-info'),
    recents: () => invoke('uo:welcome-recents'),
    newDocument: () => invoke('uo:welcome-new'),
    open: () => invoke('uo:welcome-open'),
    openRecent: (p) => invoke('uo:welcome-open-recent', String(p)),
    removeRecent: (p) => invoke('uo:welcome-remove-recent', String(p)),
    clearRecents: () => invoke('uo:welcome-clear-recents'),
    showEditor: (kind) => invoke('uo:welcome-show', String(kind)),
    licenses: () => invoke('uo:welcome-licenses'),
    setLanguage: setUiLanguage,
    onLanguage: (cb) => { ipcRenderer.on('uo:lang', (_e, l) => cb(l)); },
    onRecentsChanged: (cb) => { ipcRenderer.on('uo:recents-changed', () => cb()); },
  });
}
