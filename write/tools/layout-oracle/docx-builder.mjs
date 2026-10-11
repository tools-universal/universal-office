// Gerador mínimo de .docx sintético para o oráculo de layout (Word real).
// Os casos descrevem só o que importa (document.xml, estilos, numeração…);
// o resto do pacote é fixo e canônico. Nada de fontes embutidas — os
// documentos referenciam fontes por NOME (instaladas na máquina do oráculo).
import { zipSync, strToU8 } from 'fflate';

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
  + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
  + 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
  + 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
  + 'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
  + 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
  + 'xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" '
  + 'xmlns:w10="urn:schemas-microsoft-com:office:word" '
  + 'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Run de texto: r('texto', '<w:b/>') */
export function r(text, rPr = '') {
  const parts = String(text).split(/(\t|\n)/).map((s) =>
    s === '\t' ? '<w:tab/>' : s === '\n' ? '<w:br/>' : s ? `<w:t xml:space="preserve">${esc(s)}</w:t>` : '');
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}${parts.join('')}</w:r>`;
}
/** Parágrafo: p(runsXml, pPrXml) — runs pode ser string (vira um run) ou xml de runs. */
export function p(runs = '', pPr = '') {
  const body = runs.startsWith('<w:') ? runs : runs ? r(runs) : '';
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${body}</w:p>`;
}
export const font = (name) => `<w:rFonts w:ascii="${esc(name)}" w:hAnsi="${esc(name)}" w:cs="${esc(name)}"/>`;
export const sz = (pt) => `<w:sz w:val="${Math.round(pt * 2)}"/><w:szCs w:val="${Math.round(pt * 2)}"/>`;

/** Texto "lorem" determinístico em português (sem conteúdo real). */
export function lorem(words, seed = 1) {
  const pool = ['o', 'de', 'para', 'documento', 'conforme', 'processo', 'cliente', 'responsável', 'informação',
    'será', 'contrato', 'atendimento', 'segurança', 'dados', 'serviço', 'empresa', 'aprovação', 'análise',
    'registro', 'qualidade', 'que', 'com', 'em', 'uma', 'os', 'as', 'não', 'procedimento', 'execução',
    'operação', 'controle', 'área', 'técnica', 'gestão', 'prazo', 'último', 'período', 'relatório', 'é', 'à'];
  let x = seed * 9301 + 49297;
  const out = [];
  for (let i = 0; i < words; i++) {
    x = (x * 9301 + 49297) % 233280;
    out.push(pool[x % pool.length]);
  }
  const s = out.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

const DEFAULT_STYLES = (docDefaults) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W_NS}>${docDefaults}
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>__NORMAL__</w:style>
<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="39"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>
__EXTRA__
</w:styles>`;

/** docDefaults "neutro": fonte/tamanho dados, sem espaçamento (Word 2003-like). */
export function docDefaults({ font: f = 'Arial', size = 11, after = 0, line = 240, kern = false, lang = 'pt-BR' } = {}) {
  return `<w:docDefaults><w:rPrDefault><w:rPr>${font(f)}${kern ? '<w:kern w:val="2"/>' : ''}${sz(size)}<w:lang w:val="${lang}" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>`
    + `<w:pPrDefault><w:pPr><w:spacing w:after="${after}" w:line="${line}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
}

export function sectPr({ w = 11906, h = 16838, top = 1417, right = 1701, bottom = 1417, left = 1701, header = 708, footer = 708, extra = '' } = {}) {
  return `<w:sectPr>${extra}<w:pgSz w:w="${w}" w:h="${h}"/><w:pgMar w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="${header}" w:footer="${footer}" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
}

/**
 * Monta o .docx.
 *  body       — XML dos blocos (sem w:body)
 *  sect       — XML do sectPr final (default: A4, margens pt-BR)
 *  defaults   — XML de w:docDefaults (default: docDefaults())
 *  styles     — XML de estilos extras
 *  normal     — pPr/rPr do estilo Normal (dentro de <w:style>; padrão vazio)
 *  numbering  — XML interno de w:numbering (abstractNum/num)
 *  headers    — { default?: xml, first?: xml } conteúdo de w:hdr (blocos)
 *  footers    — idem w:ftr
 *  settings   — XML extra em w:settings
 *  media      — { 'image1.png': Uint8Array } (rIdImg1… na ordem)
 *  compat     — compatibilityMode (default 15)
 *  extraCompat — elementos extras de w:compat (ex.: <w:doNotExpandShiftReturn/>)
 *  charSpacing — w:characterSpacingControl (doNotCompress | compressPunctuation | …)
 */
export function buildDocx({ body, sect, defaults, styles = '', normal = '', numbering, headers = {}, footers = {}, settings = '', media = {}, compat = 15, defaultTab = 708, extraParts = {}, extraCompat = '', charSpacing = 'doNotCompress' }) {
  const files = {};
  const ct = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Default Extension="png" ContentType="image/png"/>',
    '<Default Extension="jpeg" ContentType="image/jpeg"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'];
  const rels = ['<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'];
  let hfRefs = '';
  for (const [kind, set] of [['header', headers], ['footer', footers]]) {
    for (const [type, xml] of Object.entries(set)) {
      const name = `${kind}${type}.xml`;
      const tag = kind === 'header' ? 'w:hdr' : 'w:ftr';
      files[`word/${name}`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${tag} ${W_NS}>${xml}</${tag}>`);
      // imagens também acessíveis do cabeçalho/rodapé (mesmos rIdImg<n>)
      files[`word/_rels/${name}.rels`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Object.keys(media).map((m, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m}"/>`).join('')}</Relationships>`);
      ct.push(`<Override PartName="/word/${name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${kind}+xml"/>`);
      rels.push(`<Relationship Id="rId_${kind}_${type}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${kind}" Target="${name}"/>`);
      hfRefs += `<w:${kind}Reference w:type="${type}" r:id="rId_${kind}_${type}"/>`;
    }
  }
  if (numbering) {
    files['word/numbering.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${W_NS}>${numbering}</w:numbering>`);
    ct.push('<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>');
    rels.push('<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>');
  }
  // partes extras conhecidas (notas de rodapé/fim)
  const KNOWN = {
    'word/footnotes.xml': ['footnotes', 'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml'],
    'word/endnotes.xml': ['endnotes', 'application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml'],
    'word/fontTable.xml': ['fontTable', 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml'],
    'word/theme/theme1.xml': ['theme', 'application/vnd.openxmlformats-officedocument.theme+xml'],
  };
  for (const [path, data] of Object.entries(extraParts)) {
    files[path] = data;
    const k = KNOWN[path];
    if (k) {
      ct.push(`<Override PartName="/${path}" ContentType="${k[1]}"/>`);
      rels.push(`<Relationship Id="rId_${k[0]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${k[0]}" Target="${path.slice(5)}"/>`);
    }
  }
  Object.entries(media).forEach(([name, data], i) => {
    files[`word/media/${name}`] = data;
    rels.push(`<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
  });
  let sp = sect ?? sectPr();
  if (hfRefs) sp = sp.replace('<w:sectPr>', `<w:sectPr>${hfRefs}`);
  files['[Content_Types].xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>`);
  files['_rels/.rels'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  files['word/_rels/document.xml.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
  files['word/styles.xml'] = strToU8(DEFAULT_STYLES(defaults ?? docDefaults()).replace('__NORMAL__', normal).replace('__EXTRA__', styles));
  files['word/settings.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${W_NS}><w:defaultTabStop w:val="${defaultTab}"/><w:characterSpacingControl w:val="${charSpacing}"/>${settings}<w:compat>${extraCompat}<w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="${compat}"/></w:compat></w:settings>`);
  files['word/document.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${body}${sp}</w:body></w:document>`);
  return zipSync(files, { level: 6 });
}
