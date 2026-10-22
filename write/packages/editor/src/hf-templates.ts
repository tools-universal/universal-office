// Modelos das galerias de Cabeçalho, Rodapé e Número de Página — PRÓPRIOS,
// desenhados aqui (os blocos de construção do Word são dele e não entram no
// repositório). Cada modelo é o XML de uma parte de cabeçalho/rodapé, lido pelo
// docx-core como se viesse do arquivo (fontes, campos e envoltórios preservados
// ao salvar). Estrutura que o Word usa e que vale reproduzir (oráculo hf-lab):
//  - números de página de Início/Fim da Página e Margens da Página dentro de um
//    w:sdt com `docPartGallery="Page Numbers (…)"` + `docPartUnique` — é por
//    ele que Remover Números de Página os acha (no Word também);
//  - Posição Atual: só os runs, sem envoltório;
//  - campos complexos (fldChar), PAGE com `\* MERGEFORMAT`;
//  - tabulação de alinhamento (w:ptab) para as três colunas, que segue a margem
//    em qualquer tamanho de papel.

export type HfGallery = 'header' | 'footer' | 'pageTop' | 'pageBottom' | 'pageMargin' | 'pageCurrent';

export interface HfTemplate {
  id: string;
  name: { en: string; pt: string };
}

/** Contexto de um modelo: estilo do parágrafo, cor de destaque do tema e idioma dos textos. */
export interface HfTemplateEnv {
  /** id do estilo Cabeçalho/Rodapé do documento (ausente: sem pStyle) */
  styleId?: string;
  /** cor de destaque 1 do tema (hex sem #) */
  accent: string;
  lang: 'en' | 'pt';
  /** gera um id de desenho livre (wp:docPr) */
  drawingId: () => number;
}

const T = (en: string, pt: string) => ({ en, pt });

const TEMPLATES: Record<HfGallery, HfTemplate[]> = {
  header: [
    { id: 'blank', name: T('Blank', 'Em branco') },
    { id: 'blank3', name: T('Blank (three columns)', 'Em branco (três colunas)') },
    { id: 'title', name: T('Centered title', 'Título centralizado') },
    { id: 'rule', name: T('Title and author', 'Título e autor') },
    { id: 'band', name: T('Color band', 'Faixa colorida') },
    { id: 'accent', name: T('Accent bar', 'Barra de destaque') },
  ],
  footer: [
    { id: 'blank', name: T('Blank', 'Em branco') },
    { id: 'blank3', name: T('Blank (three columns)', 'Em branco (três colunas)') },
    { id: 'pageXofY', name: T('Page X of Y', 'Página X de Y') },
    { id: 'rule', name: T('Title and page', 'Título e página') },
    { id: 'band', name: T('Color band', 'Faixa colorida') },
    { id: 'accent', name: T('Accent number', 'Número em destaque') },
  ],
  pageTop: [
    { id: 'plainLeft', name: T('Plain number left', 'Número simples à esquerda') },
    { id: 'plainCenter', name: T('Plain number centered', 'Número simples centralizado') },
    { id: 'plainRight', name: T('Plain number right', 'Número simples à direita') },
    { id: 'pageXofY', name: T('Page X of Y', 'Página X de Y') },
    { id: 'accentRule', name: T('Accent rule', 'Linha de destaque') },
    { id: 'brackets', name: T('Brackets', 'Colchetes') },
  ],
  pageBottom: [
    { id: 'plainLeft', name: T('Plain number left', 'Número simples à esquerda') },
    { id: 'plainCenter', name: T('Plain number centered', 'Número simples centralizado') },
    { id: 'plainRight', name: T('Plain number right', 'Número simples à direita') },
    { id: 'pageXofY', name: T('Page X of Y', 'Página X de Y') },
    { id: 'accentRule', name: T('Accent rule', 'Linha de destaque') },
    { id: 'brackets', name: T('Brackets', 'Colchetes') },
  ],
  pageMargin: [
    { id: 'right', name: T('Right margin', 'Margem direita') },
    { id: 'left', name: T('Left margin', 'Margem esquerda') },
    { id: 'circle', name: T('Circle, right', 'Círculo à direita') },
  ],
  pageCurrent: [
    { id: 'plain', name: T('Plain number', 'Número simples') },
    { id: 'pageXofY', name: T('Page X of Y', 'Página X de Y') },
    { id: 'brackets', name: T('Brackets', 'Colchetes') },
    { id: 'dashes', name: T('Dashes', 'Traços') },
  ],
};

/** Modelos de uma galeria (ordem da galeria). */
export function hfTemplates(gallery: HfGallery): HfTemplate[] {
  return TEMPLATES[gallery];
}

/** Galeria → parte que o modelo ocupa (Margens da Página vai no cabeçalho, como no Word). */
export function galleryKind(gallery: HfGallery): 'header' | 'footer' | null {
  return gallery === 'footer' || gallery === 'pageBottom' ? 'footer' : gallery === 'pageCurrent' ? null : 'header';
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const run = (text: string, rPr = ''): string => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const field = (instr: string, shown: string, rPr = ''): string => {
  const r = rPr ? `<w:rPr>${rPr}</w:rPr>` : '';
  return `<w:r>${r}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${r}<w:instrText xml:space="preserve"> ${esc(instr)} </w:instrText></w:r>`
    + `<w:r>${r}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${rPr ? `<w:rPr>${rPr}<w:noProof/></w:rPr>` : '<w:rPr><w:noProof/></w:rPr>'}<w:t>${esc(shown)}</w:t></w:r><w:r>${r}<w:fldChar w:fldCharType="end"/></w:r>`;
};
const page = (rPr = ''): string => field('PAGE   \\* MERGEFORMAT', '1', rPr);
const pages = (rPr = ''): string => field('NUMPAGES   \\* MERGEFORMAT', '1', rPr);
const ptab = (al: 'left' | 'center' | 'right'): string => `<w:r><w:ptab w:relativeTo="margin" w:alignment="${al}" w:leader="none"/></w:r>`;
const color = (hex: string): string => `<w:color w:val="${hex}" w:themeColor="accent1"/>`;
const WHITE = '<w:color w:val="FFFFFF" w:themeColor="background1"/>';

/** Texto de exemplo dos campos a preencher (como os espaços reservados dos blocos do Word). */
export function placeholderText(lang: 'en' | 'pt'): string {
  return lang === 'pt' ? '[Digite aqui]' : '[Type here]';
}

function para(env: HfTemplateEnv, body: string, pPr = ''): string {
  const style = env.styleId ? `<w:pStyle w:val="${esc(env.styleId)}"/>` : '';
  return `<w:p><w:pPr>${style}${pPr}</w:pPr>${body}</w:p>`;
}

/** sdt de número de página (as galerias do Word gravam assim — Remover Números de Página o acha). */
function pageNumberSdt(env: HfTemplateEnv, gallery: 'Top of Page' | 'Bottom of Page' | 'Margins', inner: string): string {
  return `<w:sdt><w:sdtPr><w:id w:val="${env.drawingId()}"/><w:docPartObj><w:docPartGallery w:val="Page Numbers (${gallery})"/><w:docPartUnique/></w:docPartObj></w:sdtPr>`
    + `<w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
}

/** "Página X de Y" (rPr opcional nos números). */
function pageXofY(env: HfTemplateEnv, numRPr = ''): string {
  return env.lang === 'pt'
    ? run('Página ') + page(numRPr) + run(' de ') + pages(numRPr)
    : run('Page ') + page(numRPr) + run(' of ') + pages(numRPr);
}

/** Caixa de texto ancorada na margem lateral, centralizada na vertical, com o número de página. */
function marginBox(env: HfTemplateEnv, side: 'left' | 'right', circle: boolean): string {
  const id = env.drawingId();
  const size = circle ? 457200 : 520700; // 1,27 cm / 1,45 cm
  const h = circle ? 457200 : 368300;
  const fill = circle ? `<a:solidFill><a:schemeClr val="accent1"/></a:solidFill>` : '<a:noFill/>';
  const rPr = circle ? `<w:b/>${WHITE}<w:sz w:val="24"/><w:szCs w:val="24"/>` : `<w:b/>${color(env.accent)}<w:sz w:val="32"/><w:szCs w:val="32"/>`;
  const inner = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${page(rPr)}</w:p>`;
  return `<w:r><w:rPr><w:noProof/></w:rPr><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>`
    + `<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">`
    + `<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${side}Margin"><wp:align>center</wp:align></wp:positionH>`
    + `<wp:positionV relativeFrom="margin"><wp:align>center</wp:align></wp:positionV>`
    + `<wp:extent cx="${size}" cy="${h}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>`
    + `<wp:docPr id="${id}" name="${env.lang === 'pt' ? 'Caixa de Texto' : 'Text Box'} ${id % 1000}"/><wp:cNvGraphicFramePr/>`
    + `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">`
    + `<wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${size}" cy="${h}"/></a:xfrm>`
    + `<a:prstGeom prst="${circle ? 'ellipse' : 'rect'}"><a:avLst/></a:prstGeom>${fill}<a:ln><a:noFill/></a:ln></wps:spPr>`
    + `<wps:txbx><w:txbxContent>${inner}</w:txbxContent></wps:txbx>`
    + `<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" anchorCtr="0" upright="1"><a:noAutofit/></wps:bodyPr>`
    + `</wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>`;
}

/**
 * Conteúdo (filhos de w:hdr/w:ftr) do modelo `id` da galeria. Posição Atual
 * devolve UM parágrafo cujos runs entram no cursor.
 */
export function hfTemplateXml(gallery: HfGallery, id: string, env: HfTemplateEnv): string | null {
  const ph = placeholderText(env.lang);
  const title = env.lang === 'pt' ? '[Título do documento]' : '[Document title]';
  const author = env.lang === 'pt' ? '[Nome do autor]' : '[Author name]';
  const bdr = (side: 'top' | 'bottom' | 'left', sz: number, hex: string, theme = true) =>
    `<w:pBdr><w:${side} w:val="single" w:sz="${sz}" w:space="${side === 'left' ? 4 : 1}" w:color="${hex}"${theme ? ' w:themeColor="accent1"' : ''}/></w:pBdr>`;
  const shd = `<w:shd w:val="clear" w:color="auto" w:fill="${env.accent}" w:themeFill="accent1"/>`;
  const three = run(ph) + ptab('center') + run(ph) + ptab('right') + run(ph);
  if (gallery === 'header' || gallery === 'footer') {
    const isH = gallery === 'header';
    switch (id) {
      case 'blank': return para(env, run(ph));
      case 'blank3': return para(env, three);
      case 'title': return para(env, run(title, `<w:smallCaps/>${color(env.accent)}<w:sz w:val="28"/><w:szCs w:val="28"/>`), `${bdr('bottom', 12, env.accent)}<w:jc w:val="center"/>`);
      case 'rule': return isH
        ? para(env, run(title, '<w:b/>') + ptab('right') + run(author, color(env.accent)), bdr('bottom', 6, 'A6A6A6', false))
        : para(env, run(title, color(env.accent)) + ptab('right') + page('<w:b/>'), bdr('top', 6, 'A6A6A6', false));
      case 'band': return isH
        ? para(env, run(title, `<w:b/>${WHITE}`) + ptab('right') + run(author, WHITE), `${shd}<w:spacing w:before="60" w:after="60"/>`)
        : para(env, run(title, WHITE) + ptab('right') + page(`<w:b/>${WHITE}`), `${shd}<w:spacing w:before="60" w:after="60"/>`);
      case 'accent': return isH
        ? para(env, run(title, `<w:b/>${color(env.accent)}`), bdr('left', 24, env.accent))
        : para(env, run('— ', color(env.accent)) + page(`<w:b/>${color(env.accent)}<w:sz w:val="24"/><w:szCs w:val="24"/>`) + run(' —', color(env.accent)), '<w:jc w:val="center"/>');
      case 'pageXofY': return isH ? null : para(env, pageXofY(env, '<w:b/>'), '<w:jc w:val="center"/>');
      default: return null;
    }
  }
  if (gallery === 'pageTop' || gallery === 'pageBottom') {
    const top = gallery === 'pageTop';
    const g = top ? 'Top of Page' : 'Bottom of Page';
    const jc = (v: string) => `<w:jc w:val="${v}"/>`;
    let inner: string | null;
    switch (id) {
      case 'plainLeft': inner = para(env, page()); break;
      case 'plainCenter': inner = para(env, page(), jc('center')); break;
      case 'plainRight': inner = para(env, page(), jc('right')); break;
      case 'pageXofY': inner = para(env, pageXofY(env, '<w:b/>'), jc('right')); break;
      case 'accentRule': inner = para(env, page(`<w:b/>${color(env.accent)}`), `${bdr(top ? 'bottom' : 'top', 12, env.accent)}${jc('right')}`); break;
      case 'brackets': inner = para(env, run('[ ') + page() + run(' ]'), jc('center')); break;
      default: inner = null;
    }
    // como os blocos do Word: o número + um parágrafo vazio do estilo dentro do sdt
    return inner ? pageNumberSdt(env, g, inner + para(env, '')) : null;
  }
  if (gallery === 'pageMargin') {
    const box = id === 'right' ? marginBox(env, 'right', false) : id === 'left' ? marginBox(env, 'left', false) : id === 'circle' ? marginBox(env, 'right', true) : null;
    return box ? pageNumberSdt(env, 'Margins', para(env, box)) : null;
  }
  // Posição Atual: runs no cursor
  switch (id) {
    case 'plain': return para(env, page());
    case 'pageXofY': return para(env, pageXofY(env));
    case 'brackets': return para(env, run('[') + page() + run(']'));
    case 'dashes': return para(env, run('– ') + page() + run(' –'));
    default: return null;
  }
}

// ───────────────── etiquetas das faixas no modo cabeçalho/rodapé ─────────────────

const BAND = {
  en: { header: 'Header', footer: 'Footer', first: 'First Page', even: 'Even Page', odd: 'Odd Page', section: 'Section', same: 'Same as Previous' },
  pt: { header: 'Cabeçalho', footer: 'Rodapé', first: 'da Primeira Página', even: 'de Página Par', odd: 'de Página Ímpar', section: 'Seção', same: 'Mesmo que o Anterior' },
};

/** Nome da faixa como o Word escreve na tela ("Cabeçalho da Primeira Página -Seção 2-",
 *  "Even Page Footer"); a seção só aparece com mais de uma. */
export function hfBandLabel(kind: 'header' | 'footer', type: 'default' | 'first' | 'even', evenOdd: boolean, sec: number, count: number, lang: 'en' | 'pt'): string {
  const L = BAND[lang];
  const variant = type === 'first' ? L.first : type === 'even' ? L.even : evenOdd ? L.odd : '';
  const base = lang === 'pt' ? `${L[kind]}${variant ? ` ${variant}` : ''}` : `${variant ? `${variant} ` : ''}${L[kind]}`;
  return count > 1 ? `${base} -${L.section} ${sec + 1}-` : base;
}

/** Etiqueta da direita quando a parte vem da seção anterior (Vincular ao Anterior). */
export function sameAsPreviousLabel(lang: 'en' | 'pt'): string {
  return BAND[lang].same;
}

// ───────────────── Data e Hora ─────────────────

/**
 * Formatos do diálogo Data e Hora por idioma (imagem do campo \@ do Word). A
 * lista do diálogo do Word não sai pelo COM (só abrindo o diálogo — memória
 * no-desktop-screen-capture); estes seguem as convenções de cada idioma e o
 * resultado de cada um foi conferido no Word pelo InsertDateTime.
 */
export const DATE_TIME_FORMATS: Record<'en' | 'pt', string[]> = {
  pt: [
    'dd/MM/yyyy', "dddd, d' de 'MMMM' de 'yyyy", "d' de 'MMMM' de 'yyyy", 'dd/MM/yy', 'yyyy-MM-dd', 'd-MMM-yy',
    'dd.MM.yyyy', 'd MMM. yy', "d' de 'MMMM' de 'yy", "MMMM' de 'yy", 'MMM-yy', 'dd/MM/yyyy HH:mm', 'dd/MM/yyyy HH:mm:ss',
    'h:mm am/pm', 'h:mm:ss am/pm', 'HH:mm', 'HH:mm:ss',
  ],
  en: [
    'M/d/yyyy', 'dddd, MMMM d, yyyy', 'MMMM d, yyyy', 'M/d/yy', 'yyyy-MM-dd', 'd-MMM-yy', 'M.d.yyyy', 'MMM. d, yy',
    'd MMMM yyyy', 'MMMM yy', 'MMM-yy', 'M/d/yyyy h:mm am/pm', 'M/d/yyyy h:mm:ss am/pm', 'h:mm am/pm', 'h:mm:ss am/pm',
    'HH:mm', 'HH:mm:ss',
  ],
};
