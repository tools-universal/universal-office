// Frente Cabeçalho e rodapé: os modelos PRÓPRIOS das galerias (Cabeçalho,
// Rodapé, Número de Página — editor/src/hf-templates.ts) diagramados pelo Word:
// tabulação de alinhamento, sdt de número de página, caixa de texto na margem,
// faixa sombreada, bordas. Cada modelo entra como o cabeçalho (ou rodapé) de um
// documento de 3 páginas, com os estilos Cabeçalho/Rodapé do Word pt-BR.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';
import { hfTemplates, hfTemplateXml, galleryKind } from '../../../packages/editor/src/hf-templates.ts';

const pgbr = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const body = [1, 2, 3].map((i) => p(r(`Pagina ${i} Hxg. ${lorem(40, i)}`))).join(pgbr);
// estilos Cabeçalho/Rodapé como o Word cria (oráculo hf-lab h01)
const hfStyle = (id, name) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/>`
  + '<w:pPr><w:tabs><w:tab w:val="center" w:pos="4252"/><w:tab w:val="right" w:pos="8504"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>';
const styles = hfStyle('Cabealho', 'header') + hfStyle('Rodap', 'footer');
const defaults = docDefaults({ font: 'Arial', size: 11, after: 160, line: 259 });

export const cases = [];
for (const g of ['header', 'footer', 'pageTop', 'pageBottom', 'pageMargin', 'pageCurrent']) {
  for (const t of hfTemplates(g)) {
    const kind = galleryKind(g) ?? 'header';
    let n = 1000;
    const xml = hfTemplateXml(g, t.id, { styleId: kind === 'header' ? 'Cabealho' : 'Rodap', accent: '156082', lang: 'pt', drawingId: () => n++ });
    const part = { default: xml };
    cases.push({
      name: `${g}-${t.id}`,
      docx: buildDocx({ body, ...(kind === 'header' ? { headers: part } : { footers: part }), styles, defaults }),
    });
  }
}
