// Tokenização de blocos do docx-core para o motor de diff.
//
// Cada Block (parágrafo ou tabela) vira um BlockToken com duas chaves:
//
//  - contentKey: identidade de CONTEÚDO — texto dos runs, com cada imagem
//    substituída por um marcador derivado dos BYTES da mídia (hash + tamanho).
//    É a chave usada para alinhar os documentos: imagem é igual sse os bytes
//    são iguais (critério byte a byte; o hash só acelera — a igualdade final
//    confere os bytes de verdade em tokensEqual).
//
//  - formatKey: assinatura de FORMATAÇÃO — ParaProps + RunProps por segmento
//    + dimensões de exibição de imagens. Dois blocos com contentKey igual e
//    formatKey diferente são "mudança só de formatação" (importance minor),
//    sem quebrar o alinhamento — mesma ideia da "unimportant difference" do
//    Beyond Compare no OpenCompare.
//
// As chaves compostas são À PROVA DE SPOOF: marcadores começam e terminam em
// U+001F (unit separator — proibido em conteúdo XML 1.0, então nunca vem de
// texto legítimo; por segurança é removido de texto literal), e a composição
// de células/tabelas usa length-prefix, então "span1" como texto de parágrafo
// não colide com o sufixo de gridSpan, nem parágrafos com tabelas aninhadas.
//
// commentIds fica FORA da formatKey: comentário é anotação, não formatação —
// re-numeração de comentários não pode marcar o documento inteiro como
// alterado.

import type {
  Block,
  Paragraph,
  ParaProps,
  RunProps,
  TableBlock,
  TableCell,
} from '@universal-office/docx-core';

export interface BlockToken {
  kind: 'paragraph' | 'table';
  block: Block;
  contentKey: string;
  formatKey: string;
  /** Bytes das imagens do bloco, em ordem de documento (p/ igualdade exata). */
  images: Uint8Array[];
}

/** FNV-1a 32-bit sobre bytes, em hex. Acelera a chave; não substitui memcmp. */
export function fnv1a(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a === b) return true;
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// U+001F: delimitador de marcadores/frames. Ilegal em XML 1.0, logo ausente
// de qualquer .docx bem-formado.
const SEP = '';

/** Remove SEP de texto literal (só possível em documento malformado) para
 *  que texto nunca fabrique um marcador. */
const sanitize = (s: string): string => (s.includes(SEP) ? s.split(SEP).join('') : s);

/** Marcador de conteúdo de uma imagem: derivado só dos BYTES. */
const imageContentMarker = (data: Uint8Array): string =>
  `${SEP}img:${data.byteLength}:${fnv1a(data)}${SEP}`;

/** Frame com length-prefix: composição inambígua independente do conteúdo. */
const frame = (tag: string, s: string): string => `${SEP}${tag}${s.length}${SEP}${s}`;

// Assinatura estável de RunProps (ordem fixa de campos; sem commentIds).
function runPropsSig(p: RunProps): string {
  return [
    p.bold ? 'b' : '',
    p.italic ? 'i' : '',
    p.underline ? `u${p.underlineStyle ?? 'single'}${p.underlineColor ?? ''}` : '',
    p.strike ? 's' : '',
    p.doubleStrike ? 'ds' : '',
    p.vertAlign ?? '',
    p.szHalfPt ?? '',
    p.color ?? '',
    p.highlight ?? '',
    p.fontAscii ?? '',
    p.allCaps ? 'ac' : '',
    p.smallCaps ? 'sc' : '',
    p.charSpacingTwips ?? '',
    p.link ?? '',
    p.isMath ? 'm' : '',
  ].join('|');
}

// Assinatura estável de ParaProps. JSON dos campos estruturados (tabStops,
// borders, sectionBreak) é determinístico porque os objetos são construídos
// pelo reader com forma fixa.
function paraPropsSig(p: ParaProps): string {
  return [
    p.alignment ?? '',
    p.styleId ?? '',
    p.numbering ? `${p.numbering.kind}:${p.numbering.ilvl}` : '',
    p.indentLeftTwips ?? '',
    p.indentRightTwips ?? '',
    p.indentFirstLineTwips ?? '',
    p.lineTwentieths ?? '',
    p.spaceAfterTwips ?? '',
    p.spaceBeforeTwips ?? '',
    p.tocInstr ?? '',
    p.tocEntry ? 't' : '',
    p.tabStops ? JSON.stringify(p.tabStops) : '',
    p.shadingHex ?? '',
    p.boxBorder ? 'bb' : '',
    p.borders ? JSON.stringify(p.borders) : '',
    p.pageBreakBefore ? 'pb' : '',
    p.dropCap ? 'dc' : '',
    p.sectionBreak ? JSON.stringify(p.sectionBreak.sectPr) : '',
  ].join('|');
}

function paragraphContentKey(p: Paragraph): string {
  const segs: string[] = [];
  // Campo: o reader propaga `field` para TODOS os runs do resultado em cache
  // (que o Word divide por rsid/formatação), e fldSimple traz a instrução
  // crua enquanto begin/separate/end traz ' INSTR ' normalizada. Trim unifica
  // as duas representações; runs consecutivos do MESMO campo emitem o
  // marcador uma única vez — split de runs não é mudança de conteúdo.
  let prevField: string | null = null;
  for (const r of p.runs) {
    if (r.field !== undefined) {
      const instr = sanitize(r.field.trim());
      if (prevField !== instr) segs.push(`${SEP}fld:${instr}${SEP}`);
      prevField = instr;
      continue;
    }
    prevField = null;
    if (r.image) {
      segs.push(imageContentMarker(r.image.data));
    } else if (r.noteRef) {
      segs.push(`${SEP}note:${r.noteRef.kind}${SEP}`);
    } else if (r.custom) {
      const t = sanitize(r.custom.type);
      segs.push(`${SEP}custom:${t.length}:${t}:${sanitize(r.custom.fallbackText)}${SEP}`);
    } else {
      segs.push(sanitize(r.text));
    }
  }
  return segs.join('');
}

function paragraphFormatKey(p: Paragraph): string {
  // Coalesce runs adjacentes com a mesma assinatura de props: a MESMA
  // formatação visual dividida em mais/menos runs não é mudança. O
  // comprimento contado é o do TEXTO exibido (r.text), pelo mesmo motivo.
  const segs: string[] = [];
  let curSig = '';
  let curLen = 0;
  let curImg = '';
  const flush = () => {
    if (curLen > 0 || curImg) segs.push(`${curLen}:${curSig}${curImg}`);
    curLen = 0;
    curImg = '';
  };
  for (const r of p.runs) {
    const sig = runPropsSig(r.props);
    const img = r.image
      ? `img[${r.image.widthTwips}x${r.image.heightTwips}${r.image.floating ? `@${r.image.offsetXTwips ?? 0},${r.image.offsetYTwips ?? 0}` : ''}]`
      : '';
    if (sig !== curSig || img) {
      flush();
      curSig = sig;
      curImg = img;
    }
    curLen += r.text.length;
    if (img) flush(); // imagem é segmento atômico
  }
  flush();
  return `${paraPropsSig(p.props)}${SEP}${segs.join(SEP)}`;
}

function collectParagraphImages(p: Paragraph, out: Uint8Array[]): void {
  for (const r of p.runs) {
    if (r.image) out.push(r.image.data);
  }
}

function cellContentKey(c: TableCell): string {
  const parts = [
    ...c.paragraphs.map((p) => frame('P', paragraphContentKey(p))),
    ...c.tables.map((t) => frame('T', tableContentKey(t))),
  ];
  return `${parts.join('')}${SEP}span${c.gridSpan}`;
}

function tableContentKey(t: TableBlock): string {
  return t.rows
    .map((row) => frame('R', row.cells.map((c) => frame('C', cellContentKey(c))).join('')))
    .join('');
}

function cellFormatKey(c: TableCell): string {
  const parts = [
    ...c.paragraphs.map((p) => frame('P', paragraphFormatKey(p))),
    ...c.tables.map((t) => frame('T', tableFormatKey(t))),
  ];
  return [
    parts.join(''),
    c.widthTwips ?? '',
    c.shadingHex ?? '',
    c.borders ? JSON.stringify(c.borders) : '',
  ].join(SEP);
}

function tableFormatKey(t: TableBlock): string {
  const rows = t.rows
    .map((row) => frame('R', row.cells.map((c) => frame('C', cellFormatKey(c))).join('')))
    .join('');
  return [
    t.gridColsTwips.join(','),
    t.borders ? JSON.stringify(t.borders) : '',
    rows,
  ].join(SEP);
}

function collectTableImages(t: TableBlock, out: Uint8Array[]): void {
  for (const row of t.rows) {
    for (const cell of row.cells) {
      for (const p of cell.paragraphs) collectParagraphImages(p, out);
      for (const nested of cell.tables) collectTableImages(nested, out);
    }
  }
}

export function tokenizeBlock(block: Block): BlockToken {
  if (block.type === 'paragraph') {
    const images: Uint8Array[] = [];
    collectParagraphImages(block.paragraph, images);
    return {
      kind: 'paragraph',
      block,
      contentKey: frame('p', paragraphContentKey(block.paragraph)),
      formatKey: paragraphFormatKey(block.paragraph),
      images,
    };
  }
  const images: Uint8Array[] = [];
  collectTableImages(block, images);
  return {
    kind: 'table',
    block,
    contentKey: frame('t', tableContentKey(block)),
    formatKey: tableFormatKey(block),
    images,
  };
}

export function tokenizeBlocks(blocks: Block[]): BlockToken[] {
  return blocks.map(tokenizeBlock);
}

/**
 * Igualdade de CONTEÚDO entre dois tokens: chaves iguais E imagens iguais
 * byte a byte. O hash na contentKey praticamente elimina colisões; o memcmp
 * garante o critério exato prometido ("imagens diferenciadas por byte").
 */
export function tokensEqual(a: BlockToken, b: BlockToken): boolean {
  if (a.contentKey !== b.contentKey) return false;
  if (a.images.length !== b.images.length) return false;
  for (let i = 0; i < a.images.length; i++) {
    if (!bytesEqual(a.images[i]!, b.images[i]!)) return false;
  }
  return true;
}

/** Chaves de linha de tabela, para o diff aninhado de linhas. */
export const rowContentKey = (row: { cells: TableCell[] }): string =>
  row.cells.map((c) => frame('C', cellContentKey(c))).join('');

export const rowFormatKey = (row: { cells: TableCell[] }): string =>
  row.cells.map((c) => frame('C', cellFormatKey(c))).join('');
