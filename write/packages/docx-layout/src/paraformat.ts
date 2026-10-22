import type { DocFormatting, Paragraph, PPr } from '@universal-office/docx-core';
import { paraPropsFromPPr } from '@universal-office/docx-core';
import { DocContext, directPPr } from './context.js';
import { resolvePPr } from './para.js';

const NO_FONTS = { face: () => null };
const CTX = new WeakMap<DocFormatting, DocContext>();
const ctxOf = (fmt: DocFormatting): DocContext => {
  let c = CTX.get(fmt);
  if (!c) CTX.set(fmt, (c = new DocContext(fmt, NO_FONTS)));
  return c;
};

/**
 * pPr que o parágrafo HERDA (docDefaults → estilo → numeração), sem a
 * formatação direta além do estilo e da lista. Base contra a qual o Word decide
 * o que gravar ao arrastar recuo/tabulação na régua: atributo igual ao herdado
 * não é gravado (oráculo nav-lab ind-to-zero, ind-style-same, tab-same-as-style).
 */
export function inheritedPPr(fmt: DocFormatting, para: Paragraph): PPr {
  const d = directPPr(para);
  const base: PPr = {};
  if (d.pStyle !== undefined) base.pStyle = d.pStyle;
  if (d.numPr) base.numPr = d.numPr;
  return resolvePPr(ctxOf(fmt), { runs: [], ppr: base, props: paraPropsFromPPr(base) }, {}).ppr;
}

/** pPr efetivo do parágrafo (herdado + direto), como o motor o diagrama. */
export function effectivePPr(fmt: DocFormatting, para: Paragraph): PPr {
  return resolvePPr(ctxOf(fmt), para, {}).ppr;
}
