// Textos do próprio app desktop (janelas de boas-vindas, diálogos nativos,
// avisos, Jump List) em português, inglês e espanhol. A interface dos editores
// é dos componentes (atributo `lang`); aqui só o que o shell mostra.
//
// Idioma da interface: escolhido pelo usuário (boas-vindas ou menu Idioma do
// editor) e guardado no perfil; o padrão é o idioma da revisão ortográfica,
// que vem do idioma do sistema (pt* → pt-BR, es* → es, o resto → en-US).
const LANGS = ['pt-BR', 'en-US', 'es'];
const LANG_NAMES = { 'pt-BR': 'Português (Brasil)', 'en-US': 'English', es: 'Español' };

/** Tag BCP 47 do sistema → idioma da interface. */
function langFromLocale(tag) {
  const t = String(tag || '').toLowerCase();
  if (t.startsWith('pt')) return 'pt-BR';
  if (t.startsWith('es')) return 'es';
  return 'en-US';
}
const normalizeLang = (l) => (LANGS.includes(l) ? l : null);

const M = {
  'pt-BR': {
    untitled: { write: 'Documento', sheet: 'Pasta1', slides: 'Apresentação' },
    newItem: { write: 'Novo documento', sheet: 'Nova planilha', slides: 'Nova apresentação' },
    openTitle: { write: 'Abrir documento', sheet: 'Abrir planilha', slides: 'Abrir apresentação' },
    openFilter: { write: 'Documentos do Word', sheet: 'Planilhas do Excel', slides: 'Apresentações do PowerPoint' },
    officeFiles: 'Documentos do Office',
    open: 'Abrir',
    saveAs: 'Salvar como',
    export: 'Exportar',
    compareWith: 'Comparar com…',
    replace: 'Substituir',
    no: 'Não',
    exists: '"{name}" já existe. Deseja substituí-lo?',
    savePrompt: 'Deseja salvar as alterações em "{name}"?',
    savePromptDetail: 'Se você não salvar, as alterações serão perdidas.',
    save: 'Salvar',
    dontSave: 'Não salvar',
    cancel: 'Cancelar',
    openError: 'Não foi possível abrir "{path}".',
    jumpDesc: 'Abre uma nova janela do {name}',
    formats: {
      docx: 'Documento do Word', doc: 'Documento do Word 97-2003', odt: 'Texto OpenDocument', rtf: 'Rich Text Format',
      txt: 'Texto sem formatação', xps: 'Documento XPS', xlsx: 'Pasta de Trabalho do Excel', ods: 'Planilha OpenDocument',
      csv: 'CSV (separado por vírgulas)', tsv: 'Texto (separado por tabulações)', xml: 'Planilha XML 2003',
      pptx: 'Apresentação do PowerPoint', png: 'Imagem PNG', pdf: 'PDF', html: 'Página da Web', md: 'Markdown',
    },
    welcome: {
      openEllipsis: 'Abrir…',
      recent: 'Recentes',
      search: 'Pesquisar nos recentes',
      empty: 'Nenhum arquivo recente. Os documentos que você abrir aparecem aqui.',
      noMatch: 'Nenhum arquivo corresponde à pesquisa.',
      unavailable: 'Indisponível',
      remove: 'Remover da lista',
      clear: 'Limpar lista',
      language: 'Idioma',
      version: 'Versão {version}',
      otherEditors: 'Outros editores',
      lastOpened: 'Aberto {when}',
      shortcuts: 'Ctrl+N novo · Ctrl+O abrir · ↑↓ e Enter nos recentes · Delete remove',
      licenses: 'Licenças de terceiros',
    },
    menuLanguage: 'Idioma',
  },
  'en-US': {
    untitled: { write: 'Document', sheet: 'Book1', slides: 'Presentation' },
    newItem: { write: 'New document', sheet: 'New spreadsheet', slides: 'New presentation' },
    openTitle: { write: 'Open document', sheet: 'Open spreadsheet', slides: 'Open presentation' },
    openFilter: { write: 'Word documents', sheet: 'Excel spreadsheets', slides: 'PowerPoint presentations' },
    officeFiles: 'Office documents',
    open: 'Open',
    saveAs: 'Save as',
    export: 'Export',
    compareWith: 'Compare with…',
    replace: 'Replace',
    no: 'No',
    exists: '"{name}" already exists. Do you want to replace it?',
    savePrompt: 'Do you want to save the changes to "{name}"?',
    savePromptDetail: "Your changes will be lost if you don't save them.",
    save: 'Save',
    dontSave: "Don't save",
    cancel: 'Cancel',
    openError: 'Could not open "{path}".',
    jumpDesc: 'Opens a new {name} window',
    formats: {
      docx: 'Word Document', doc: 'Word 97-2003 Document', odt: 'OpenDocument Text', rtf: 'Rich Text Format',
      txt: 'Plain Text', xps: 'XPS Document', xlsx: 'Excel Workbook', ods: 'OpenDocument Spreadsheet',
      csv: 'CSV (Comma delimited)', tsv: 'Text (Tab delimited)', xml: 'XML Spreadsheet 2003',
      pptx: 'PowerPoint Presentation', png: 'PNG Image', pdf: 'PDF', html: 'Web Page', md: 'Markdown',
    },
    welcome: {
      openEllipsis: 'Open…',
      recent: 'Recent',
      search: 'Search recent files',
      empty: 'No recent files. Documents you open show up here.',
      noMatch: 'No file matches the search.',
      unavailable: 'Unavailable',
      remove: 'Remove from list',
      clear: 'Clear list',
      language: 'Language',
      version: 'Version {version}',
      otherEditors: 'Other editors',
      lastOpened: 'Opened {when}',
      shortcuts: 'Ctrl+N new · Ctrl+O open · ↑↓ and Enter in the list · Delete removes',
      licenses: 'Third-party licenses',
    },
    menuLanguage: 'Language',
  },
  es: {
    untitled: { write: 'Documento', sheet: 'Libro1', slides: 'Presentación' },
    newItem: { write: 'Nuevo documento', sheet: 'Nueva hoja de cálculo', slides: 'Nueva presentación' },
    openTitle: { write: 'Abrir documento', sheet: 'Abrir hoja de cálculo', slides: 'Abrir presentación' },
    openFilter: { write: 'Documentos de Word', sheet: 'Hojas de cálculo de Excel', slides: 'Presentaciones de PowerPoint' },
    officeFiles: 'Documentos de Office',
    open: 'Abrir',
    saveAs: 'Guardar como',
    export: 'Exportar',
    compareWith: 'Comparar con…',
    replace: 'Reemplazar',
    no: 'No',
    exists: '"{name}" ya existe. ¿Desea reemplazarlo?',
    savePrompt: '¿Desea guardar los cambios en "{name}"?',
    savePromptDetail: 'Si no los guarda, los cambios se perderán.',
    save: 'Guardar',
    dontSave: 'No guardar',
    cancel: 'Cancelar',
    openError: 'No se pudo abrir "{path}".',
    jumpDesc: 'Abre una nueva ventana de {name}',
    formats: {
      docx: 'Documento de Word', doc: 'Documento de Word 97-2003', odt: 'Texto de OpenDocument', rtf: 'Formato de texto enriquecido',
      txt: 'Texto sin formato', xps: 'Documento XPS', xlsx: 'Libro de Excel', ods: 'Hoja de cálculo de OpenDocument',
      csv: 'CSV (delimitado por comas)', tsv: 'Texto (delimitado por tabulaciones)', xml: 'Hoja de cálculo XML 2003',
      pptx: 'Presentación de PowerPoint', png: 'Imagen PNG', pdf: 'PDF', html: 'Página web', md: 'Markdown',
    },
    welcome: {
      openEllipsis: 'Abrir…',
      recent: 'Recientes',
      search: 'Buscar en recientes',
      empty: 'No hay archivos recientes. Los documentos que abra aparecerán aquí.',
      noMatch: 'Ningún archivo coincide con la búsqueda.',
      unavailable: 'No disponible',
      remove: 'Quitar de la lista',
      clear: 'Borrar lista',
      language: 'Idioma',
      version: 'Versión {version}',
      otherEditors: 'Otros editores',
      lastOpened: 'Abierto {when}',
      shortcuts: 'Ctrl+N nuevo · Ctrl+O abrir · ↑↓ y Enter en la lista · Supr quita',
      licenses: 'Licencias de terceros',
    },
    menuLanguage: 'Idioma',
  },
};

const fill = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
/** Mensagens do idioma (com recuo para o inglês). */
const messages = (lang) => M[lang] ?? M['en-US'];

module.exports = { LANGS, LANG_NAMES, langFromLocale, normalizeLang, messages, fill };
