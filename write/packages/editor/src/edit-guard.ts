import type { DocumentModel, Paragraph, Run } from '@universal-office/docx-core';

/**
 * Proteção das operações de edição do docx-core para o motor de layout.
 *
 * As operações (insertText, deleteRange, splitParagraph…) dividem, refazem e
 * fundem runs olhando só as props de EDIÇÃO: o run refeito perde o w:rPr
 * original (estilo de caractere, fontes/cores de tema…) e os extras (caixa de
 * texto, forma, grupo, ptab, resultado de campo), e runs vizinhos com as
 * mesmas props mas rPr diferentes são fundidos — digitar uma letra num
 * parágrafo com "Strong" apagava o estilo do parágrafo inteiro no motor.
 *
 * Antes da operação cada run dos parágrafos afetados ganha uma marca única em
 * props.fontAscii (campo que a fusão compara, então runs distintos não se
 * fundem; o texto digitado herda a marca do vizinho e se junta a ele). Depois,
 * a marca volta ao valor original e o run recupera o rPr do original (e os
 * extras, se ficou inteiro).
 */

const MARK = '\u0000uw-run:';

/** Extras que o docx-core descarta ao refazer um run. */
const EXTRAS = ['image', 'textbox', 'shape', 'group', 'ptab', 'fieldResult', 'field', 'noteRef', 'custom', 'symFont', 'formField', 'inToc'] as const;

export function guardRuns<T>(model: DocumentModel, lo: number, hi: number, op: () => T): T {
  const paras = model.paragraphs;
  const a = Math.max(0, Math.min(lo, hi)), b = Math.min(paras.length - 1, Math.max(lo, hi));
  const orig = new Map<string, { run: Run; font: string | undefined }>();
  let n = 0;
  for (let i = a; i <= b; i++) {
    for (const r of paras[i]!.runs) {
      const key = MARK + n++;
      orig.set(key, { run: r, font: r.props.fontAscii });
      r.props = { ...r.props, fontAscii: key };
    }
  }
  try {
    return op();
  } finally {
    // marcas podem ter ido para o parágrafo seguinte (Enter) ou ficado no
    // original (exceção no meio da operação): varre um a mais
    const end = Math.min(model.paragraphs.length - 1, b + 1);
    for (let i = a; i <= end; i++) restore(model.paragraphs[i]!, orig);
    for (const { run, font } of orig.values()) {
      if (run.props.fontAscii?.startsWith(MARK)) setFont(run, font);
    }
  }
}

function setFont(r: Run, font: string | undefined): void {
  const props = { ...r.props };
  if (font === undefined) delete props.fontAscii;
  else props.fontAscii = font;
  r.props = props;
}

function restore(p: Paragraph, orig: Map<string, { run: Run; font: string | undefined }>): void {
  for (const r of p.runs) {
    const key = r.props.fontAscii;
    if (!key?.startsWith(MARK)) continue;
    const o = orig.get(key);
    setFont(r, o?.font);
    if (!o) continue;
    if (!r.rpr && o.run.rpr) r.rpr = o.run.rpr;
    if (r !== o.run && r.text === o.run.text) {
      // run inteiro (só recriado): volta tudo que o docx-core descartou
      const src = o.run as unknown as Record<string, unknown>;
      const dst = r as unknown as Record<string, unknown>;
      for (const k of EXTRAS) if (dst[k] === undefined && src[k] !== undefined) dst[k] = src[k];
    } else if (r !== o.run) {
      if (!r.symFont && o.run.symFont) r.symFont = o.run.symFont;
      if (!r.inToc && o.run.inToc) r.inToc = o.run.inToc;
    }
  }
}
