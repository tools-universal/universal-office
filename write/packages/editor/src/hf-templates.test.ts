import { describe, expect, it } from 'vitest';
import { DocxPackage, SourceStore, hfPartXml, pageNumberGroupIds, readHeaderFooterPart } from '@universal-office/docx-core';
import { formatWordDate } from '@universal-office/docx-layout';
import { DATE_TIME_FORMATS, galleryKind, hfBandLabel, hfTemplateXml, hfTemplates, sameAsPreviousLabel, type HfGallery } from './hf-templates.js';

const env = (lang: 'en' | 'pt' = 'pt') => {
  let n = 100;
  return { styleId: 'Cabealho', accent: '156082', lang, drawingId: () => n++ };
};
const GALLERIES: HfGallery[] = ['header', 'footer', 'pageTop', 'pageBottom', 'pageMargin', 'pageCurrent'];

describe('modelos das galerias de cabeçalho/rodapé', () => {
  it('todo modelo vira uma parte que o docx-core lê (com fontes)', () => {
    for (const g of GALLERIES) {
      for (const t of hfTemplates(g)) {
        const xml = hfTemplateXml(g, t.id, env());
        expect(xml, `${g}/${t.id}`).toBeTruthy();
        const store = new SourceStore();
        const kind = galleryKind(g) ?? 'header';
        const read = readHeaderFooterPart(DocxPackage.empty(), `word/${kind}9.xml`, store, hfPartXml(kind, xml!));
        expect(read?.paras.length, `${g}/${t.id}`).toBeGreaterThan(0);
        // números de página das galerias: no sdt "Page Numbers" (Remover Números de Página os acha)
        const ids = pageNumberGroupIds(store.stories.get(`word/${kind}9.xml`));
        if (g === 'pageTop' || g === 'pageBottom' || g === 'pageMargin') expect(ids.size, `${g}/${t.id}`).toBeGreaterThan(0);
        else expect(ids.size, `${g}/${t.id}`).toBe(0);
      }
    }
  });

  it('número de página com o campo PAGE do Word (\\* MERGEFORMAT) e o sdt da galeria', () => {
    const x = hfTemplateXml('pageBottom', 'pageXofY', env())!;
    expect(x).toContain('<w:docPartGallery w:val="Page Numbers (Bottom of Page)"/><w:docPartUnique/>');
    expect(x).toContain(' PAGE   \\* MERGEFORMAT ');
    expect(x).toContain(' NUMPAGES   \\* MERGEFORMAT ');
    expect(x).toContain('Página ');
    expect(hfTemplateXml('pageBottom', 'pageXofY', env('en'))).toContain('Page ');
    expect(hfTemplateXml('pageMargin', 'circle', env())).toContain('relativeFrom="rightMargin"');
  });

  it('três colunas por tabulação de alinhamento (segue a margem em qualquer papel)', () => {
    const x = hfTemplateXml('header', 'blank3', env())!;
    expect(x.match(/<w:ptab w:relativeTo="margin" w:alignment="(center|right)" w:leader="none"\/>/g)).toHaveLength(2);
    expect(x).toContain('[Digite aqui]');
    expect(hfTemplateXml('header', 'blank3', env('en'))).toContain('[Type here]');
  });

  it('galerias: Margens da Página no cabeçalho, Posição Atual no cursor', () => {
    expect(galleryKind('pageMargin')).toBe('header');
    expect(galleryKind('pageBottom')).toBe('footer');
    expect(galleryKind('pageCurrent')).toBeNull();
  });
});

describe('etiquetas das faixas (como o Word escreve)', () => {
  it('variante, seção e "Mesmo que o Anterior"', () => {
    expect(hfBandLabel('header', 'first', false, 1, 3, 'pt')).toBe('Cabeçalho da Primeira Página -Seção 2-');
    expect(hfBandLabel('footer', 'even', true, 0, 1, 'pt')).toBe('Rodapé de Página Par');
    expect(hfBandLabel('header', 'default', true, 0, 1, 'pt')).toBe('Cabeçalho de Página Ímpar');
    expect(hfBandLabel('header', 'default', false, 0, 1, 'pt')).toBe('Cabeçalho');
    expect(hfBandLabel('footer', 'first', false, 2, 3, 'en')).toBe('First Page Footer -Section 3-');
    expect(sameAsPreviousLabel('pt')).toBe('Mesmo que o Anterior');
    expect(sameAsPreviousLabel('en')).toBe('Same as Previous');
  });
});

describe('Data e Hora', () => {
  // quinta-feira, 5 de fevereiro de 2026, 14:07:09 — dia e mês de um dígito separam d de dd
  const d = new Date(2026, 1, 5, 14, 7, 9);
  it('formatos pt-BR (resultado medido no Word — campo QUOTE com \@)', () => {
    expect(DATE_TIME_FORMATS.pt.map((p) => formatWordDate(d, p, 'pt-BR'))).toEqual([
      '05/02/2026', 'quinta-feira, 5 de fevereiro de 2026', '5 de fevereiro de 2026', '05/02/26', '2026-02-05', '5-fev-26',
      '05.02.2026', '5 fev. 26', '5 de fevereiro de 26', 'fevereiro de 26', 'fev-26', '05/02/2026 14:07', '05/02/2026 14:07:09',
      '14:07', '14:07:09',
    ]);
  });
  it('formatos en-US', () => {
    expect(DATE_TIME_FORMATS.en.map((p) => formatWordDate(d, p, 'en-US'))).toEqual([
      '2/5/2026', 'Thursday, February 5, 2026', 'February 5, 2026', '2/5/26', '2026-02-05', '5-Feb-26', '2.5.2026', 'Feb. 5, 26',
      '5 February 2026', 'February 26', 'Feb-26', '2/5/2026 2:07 PM', '2/5/2026 2:07:09 PM', '2:07 PM', '2:07:09 PM', '14:07', '14:07:09',
    ]);
  });
});
