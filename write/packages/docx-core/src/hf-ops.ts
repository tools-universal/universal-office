/**
 * Cabeçalho/rodapé no nível do XML, com as regras medidas no Word (oráculo
 * write/tools/hf-lab, fatos na memória do projeto):
 *  - desvincular ("Vincular ao Anterior" desligado) cria uma parte NOVA com o
 *    conteúdo herdado copiado como está — o Word renova os ids dos desenhos
 *    (wp:docPr) e a parte nova repete as rels de imagem da origem (mesma mídia);
 *  - números de página das galerias (Início/Fim da Página, Margens da Página) são
 *    um w:sdt de bloco com `docPartGallery="Page Numbers (…)"` e
 *    `docPartUnique`; Remover Números de Página tira só esses (um campo PAGE
 *    solto ou em moldura fica).
 */
import type { StoryGroup, StorySource } from './source.js';

/** Namespaces da raiz de uma parte de cabeçalho/rodapé nova (os que o Word grava
 *  para texto, desenhos e caixas de texto). */
export const HF_NS =
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" ' +
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
  'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
  'xmlns:v="urn:schemas-microsoft-com:vml" ' +
  'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:w10="urn:schemas-microsoft-com:office:word" ' +
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ' +
  'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" ' +
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" ' +
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
  'mc:Ignorable="w14 w15 wp14"';

/** Parte de cabeçalho/rodapé completa com o conteúdo `inner` (w:p, w:sdt, w:tbl). */
export function hfPartXml(kind: 'header' | 'footer', inner: string): string {
  const tag = kind === 'header' ? 'w:hdr' : 'w:ftr';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<${tag} ${HF_NS}>${inner}</${tag}>`;
}

/**
 * Cópia de uma parte para desvincular: o mesmo XML com ids novos nos desenhos
 * (`wp:docPr`, como o Word) e sem os ids de parágrafo/desenho do Word 2010
 * (w14:paraId/textId, wp14:anchorId/editId — únicos no documento; o Word os
 * refaz ao abrir). `newId` dá um id de desenho livre.
 */
export function copyHfPartXml(xml: string, newId: () => number): string {
  return xml
    .replace(/(<wp:docPr\b[^>]*?\bid=")(\d+)(")/g, (_m, a: string, _id: string, b: string) => `${a}${newId()}${b}`)
    .replace(/\s(?:w14:paraId|w14:textId|wp14:anchorId|wp14:editId)="[0-9A-Fa-f]+"/g, '');
}

/** ids (props.src) dos blocos dentro de números de página das galerias
 *  (w:sdt com docPartGallery "Page Numbers (…)") de uma parte lida. */
export function pageNumberGroupIds(story: StorySource | undefined): Set<number> {
  const out = new Set<number>();
  const walk = (groups: readonly StoryGroup[], inside: boolean): void => {
    for (const g of groups) {
      const mine = inside || (g.wrapOpen !== undefined && /<w:docPartGallery\s+w:val="Page Numbers/.test(g.wrapOpen));
      if (mine) for (const id of g.blocks) if (id) out.add(id);
      if (g.inner) walk(g.inner, mine);
    }
  };
  if (story) walk(story.groups, false);
  return out;
}
