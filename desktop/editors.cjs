// Os três editores da suíte Universal Office (Beta): o que muda de um para o
// outro é DADO, não código — o main.cjs trata janelas, arquivos, salvar,
// exportar, imprimir, tema e fechar uma vez só, guiado por este perfil.
// Também lido pelos scripts de build (ícones, smoke).
//
// demo:    página do editor (o demo do componente), servida pelo main
// devRoot: pasta do produto no repositório (em dev o main serve dali)
// exts:    extensões que abrem neste editor (associação de arquivo, argv,
//          2ª instância, open-file) — a extensão decide o editor
// saveFormats: formatos de Salvar (o 1º é o padrão); exportFormats: Exportar
// (textos que o usuário vê — títulos, filtros, "Novo …" — ficam em i18n.cjs)
// aumid:   AppUserModelID da janela no Windows (ícone e agrupamento próprios
//          na barra de tarefas, atalhos do instalador)
// theme:   cor da janela antes de a página pintar (= barra do componente)
const SUITE = {
  id: 'io.github.erichideyuki.universal-office',
  name: 'Universal Office',
};

const EDITORS = {
  write: {
    kind: 'write',
    name: 'Universal Write',
    word: 'Write', // como o demo termina o título ("doc — Write")
    devRoot: 'write',
    demo: '/packages/editor/demo/index.html',
    bridge: 'wordnext',
    exts: ['docx', 'doc', 'odt'],
    // Salvar no formato do nome sugerido (.doc aberto e salvo como .docx: o
    // formato mudou → pergunta onde, como o Word)
    saveFormats: ['docx', 'doc', 'odt', 'pdf', 'html', 'xps', 'rtf', 'txt'],
    exportFormats: ['pdf', 'html', 'odt', 'xps', 'docx', 'doc', 'rtf', 'txt'],
    defaultExport: ['pdf', 'html', 'odt', 'xps'],
    size: { width: 1100, height: 900 },
    theme: { light: '#FCFCFC', dark: '#131314' },
    // revisão ortográfica só pelo Hunspell do componente (shared/spell)
    chromiumSpellcheck: false,
    // pop-ups: só about:blank e a própria origem (a janela de impressão do demo)
    popups: 'same-origin',
    // fontes do pacote: 404 = a página usa as substitutas métricas (Carlito…)
    osFontFallback: false,
    print: { margin: '0', pagesOnly: false, landscape: undefined },
    color: '#2E78F5',
  },
  sheet: {
    kind: 'sheet',
    name: 'Universal Sheet',
    word: 'Sheet',
    devRoot: 'sheet',
    demo: '/packages/sheet/demo/index.html',
    bridge: 'universalSheet',
    exts: ['xlsx', 'xlsm', 'xls'],
    saveFormats: ['xlsx'],
    exportFormats: ['pdf', 'ods', 'csv', 'tsv', 'html', 'md', 'xml'],
    defaultExport: ['pdf'],
    size: { width: 1280, height: 860 },
    theme: { light: '#FCFCFC', dark: '#131316' },
    chromiumSpellcheck: true,
    // o PDF de "Imprimir" (blob: da origem) numa janela do app; links no navegador
    popups: 'blob-pdf',
    // aptos-narrow-*.ttf etc.: a fonte instalada no SO ou Liberation Sans
    osFontFallback: true,
    print: null,
    color: '#1E8C4E',
  },
  slides: {
    kind: 'slides',
    name: 'Universal Slides',
    word: 'Slides',
    devRoot: 'slides',
    demo: '/packages/slides/demo/index.html',
    bridge: 'universalSlides',
    exts: ['pptx', 'ppt'],
    saveFormats: ['pptx'],
    exportFormats: ['pdf', 'html', 'md', 'png'],
    defaultExport: ['pdf'],
    size: { width: 1280, height: 860 },
    theme: { light: '#f6f5f5', dark: '#1c1b1b' },
    chromiumSpellcheck: true,
    popups: 'blob-pdf',
    osFontFallback: true,
    // um slide por folha, paisagem, com margem
    print: { margin: '8mm', pagesOnly: true, landscape: true },
    color: '#E5532D',
  },
};

// Extensões dos formatos de Salvar/Exportar dos três editores (os nomes dos
// filtros dos diálogos, em cada idioma, estão em i18n.cjs)
const FORMATS = {
  docx: { extensions: ['docx'] }, doc: { extensions: ['doc'] }, odt: { extensions: ['odt'] },
  rtf: { extensions: ['rtf'] }, txt: { extensions: ['txt'] }, xps: { extensions: ['xps'] },
  xlsx: { extensions: ['xlsx'] }, ods: { extensions: ['ods'] }, csv: { extensions: ['csv'] },
  tsv: { extensions: ['tsv'] }, xml: { extensions: ['xml'] }, pptx: { extensions: ['pptx'] },
  png: { extensions: ['png'] }, pdf: { extensions: ['pdf'] }, html: { extensions: ['html', 'htm'] },
  md: { extensions: ['md'] },
};

const KINDS = Object.keys(EDITORS);
const aumidOf = (kind) => `${SUITE.id}.${kind}`;
/** Editor de um arquivo pela extensão (null = não é documento da suíte). */
function kindOfPath(p) {
  const ext = String(p).toLowerCase().replace(/^.*\./, '');
  return KINDS.find((k) => EDITORS[k].exts.includes(ext)) ?? null;
}

module.exports = { SUITE, EDITORS, FORMATS, KINDS, aumidOf, kindOfPath };
