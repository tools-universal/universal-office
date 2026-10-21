import { describe, expect, it } from 'vitest';
import {
  BLANK_STYLES_XML, blankDocxPackage, builtinDisplayName, builtinStyle, builtinXml, dropStyle, newStyleXml,
  patchStylePPr, patchStyleRPr, patchStyleXml, putStyle, readFullDocument, readStyleIndex, setLatentQFormat,
  styleIdFromName, styleKid, styleRaw,
} from '../src/index.js';

// Valores esperados = XML que o Word 365 pt-BR gravou (write/tools/styles-oracle, probes A/B/C).

describe('styleIdFromName (Word pt-BR)', () => {
  it('tira o que não é [A-Za-z0-9-] e resolve colisão com sufixo 0, 1…', () => {
    const taken = new Set<string>();
    const id = (n: string): string => { const x = styleIdFromName(n, taken); taken.add(x); return x; };
    expect(id('Meu Estilo')).toBe('MeuEstilo');
    expect(id('Meu-Estilo')).toBe('Meu-Estilo');
    expect(id('MeuEstilo')).toBe('MeuEstilo0');
    expect(id('Título Especial')).toBe('TtuloEspecial');
    expect(id('Ação & Reação')).toBe('AoReao');
    expect(id('123 Inicio')).toBe('123Inicio');
    expect(id('Estilo  duplo')).toBe('Estiloduplo');
    expect(id('meu estilo x')).toBe('meuestilox');
    expect(id('Refêrencia')).toBe('Refrencia');
    expect(id('MeuEstilo')).toBe('MeuEstilo1');
  });
});

describe('folha do documento em branco', () => {
  it('índice: Normal padrão, Título 1 na galeria, Título 2 oculto até ser usado', () => {
    const { styles, latent } = readStyleIndex(BLANK_STYLES_XML);
    const by = new Map(styles.map((s) => [s.id, s]));
    expect(by.get('Normal')).toMatchObject({ type: 'paragraph', isDefault: true, qFormat: true, uiPriority: 0 });
    expect(by.get('Ttulo1')).toMatchObject({ name: 'heading 1', link: 'Ttulo1Char', qFormat: true, semiHidden: false, uiPriority: 9 });
    expect(by.get('Ttulo2')).toMatchObject({ semiHidden: true, unhideWhenUsed: true });
    expect(by.get('Ttulo1Char')).toMatchObject({ type: 'character', custom: true, link: 'Ttulo1' });
    expect(latent.items.length).toBe(376);
    expect(latent.items.find((l) => l.name === 'No Spacing')).toMatchObject({ uiPriority: 1, qFormat: true, semiHidden: false });
  });

  it('pacote novo: o leitor enxerga estilos, tema (Aptos) e a geometria A4', () => {
    const full = readFullDocument(blankDocxPackage());
    expect(full.formatting!.styles.styles['Ttulo1']!.rPr!.sz).toBe(40);
    expect(full.formatting!.theme.minor.latin).toBe('Aptos');
    expect(full.formatting!.settings.defaultTabStop).toBe(708);
    expect(full.sections[0]!.sectPr).toMatchObject({ pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginTopTwips: 1417 });
    expect(full.styles.get('Ttulo1')?.name).toBe('heading 1');
  });
});

describe('modificar estilo (regras medidas)', () => {
  const h1 = styleRaw(BLANK_STYLES_XML, 'Ttulo1')!;

  it('fonte/tamanho/negrito/cor no rPr: fonte no lugar do tema, só w:sz, cor sem tema', () => {
    const rPr = patchStyleRPr(styleKid(h1, 'w:rPr'), { fontAscii: 'Georgia', szHalfPt: 36, bold: true, color: 'FF0000' });
    expect(rPr).toBe('<w:rPr><w:rFonts w:ascii="Georgia" w:eastAsiaTheme="majorEastAsia" w:hAnsi="Georgia" w:cstheme="majorBidi"/>'
      + '<w:b/><w:color w:val="FF0000"/><w:sz w:val="36"/><w:szCs w:val="40"/></w:rPr>');
  });

  it('espaçamento/recuo/alinhamento no pPr, na ordem do CT_PPr', () => {
    const pPr = patchStylePPr(styleKid(h1, 'w:pPr'), { spaceBeforeTwips: 120, spaceAfterTwips: 240, lineTwentieths: 360, indentLeftTwips: 720, alignment: 'center' });
    expect(pPr).toBe('<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="120" w:after="240" w:line="360" w:lineRule="auto"/>'
      + '<w:ind w:left="720"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr>');
  });

  it('próximo estilo e Normal ganhando pPr/rPr no PRÓPRIO estilo', () => {
    expect(patchStyleXml(h1, { next: 'Citao' })).toContain('<w:basedOn w:val="Normal"/><w:next w:val="Citao"/><w:link w:val="Ttulo1Char"/>');
    const normal = styleRaw(BLANK_STYLES_XML, 'Normal')!;
    const out = patchStyleXml(normal, { pPr: patchStylePPr(undefined, { spaceAfterTwips: 120 }), rPr: patchStyleRPr(undefined, { szHalfPt: 24 }) });
    expect(out).toBe('<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>'
      + '<w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:sz w:val="24"/></w:rPr></w:style>');
  });

  it('herdar (null) tira a propriedade; elemento vazio some', () => {
    expect(patchStyleRPr('<w:rPr><w:b/></w:rPr>', { bold: null })).toBe('');
    expect(patchStyleRPr('<w:rPr><w:b/></w:rPr>', { bold: false })).toBe('<w:rPr><w:b w:val="0"/></w:rPr>');
    expect(patchStylePPr('<w:pPr><w:spacing w:after="80"/></w:pPr>', { spaceAfterTwips: null })).toBe('');
    expect(patchStylePPr(undefined, { indentFirstLineTwips: -360 })).toBe('<w:pPr><w:ind w:hanging="360"/></w:pPr>');
  });

  it('tirar da galeria: qFormat sai do estilo e do lsdException', () => {
    const q = styleRaw(BLANK_STYLES_XML, 'Citao')!;
    expect(patchStyleXml(q, { qFormat: false })).not.toContain('<w:qFormat/>');
    const xml = setLatentQFormat(BLANK_STYLES_XML, 'Quote', false);
    expect(xml).toContain('<w:lsdException w:name="Quote" w:uiPriority="29"/>');
    expect(setLatentQFormat(xml, 'Quote', true)).toBe(BLANK_STYLES_XML);
  });

  it('renomear built-in: w:aliases logo depois de w:name', () => {
    const h2 = styleRaw(BLANK_STYLES_XML, 'Ttulo2')!;
    expect(patchStyleXml(h2, { aliases: 'Meu Titulo 2' })).toMatch(/^<w:style [^>]*><w:name w:val="heading 2"\/><w:aliases w:val="Meu Titulo 2"\/><w:basedOn/);
  });
});

describe('estilo de caractere no run (w:rStyle ↔ props.charStyle)', () => {
  it('leitor → props; editar → patchRPr troca só o rStyle; run novo grava rStyle primeiro', async () => {
    const { runPropsFromRPr } = await import('../src/index.js');
    const { patchRPr, rPrFromProps } = await import('../src/lossless.js');
    const rpr = { rStyle: 'nfase', b: true };
    expect(runPropsFromRPr(rpr).charStyle).toBe('nfase');
    const raw = '<w:rPr><w:rStyle w:val="nfase"/><w:b/></w:rPr>';
    const run = { text: 'x', rpr, props: { ...runPropsFromRPr(rpr) } };
    expect(patchRPr(raw, run)).toBe(raw);
    run.props.charStyle = 'Forte';
    expect(patchRPr(raw, run)).toBe('<w:rPr><w:rStyle w:val="Forte"/><w:b/></w:rPr>');
    delete run.props.charStyle;
    expect(patchRPr(raw, run)).toBe('<w:rPr><w:b/></w:rPr>');
    expect(rPrFromProps({ ...runPropsFromRPr(undefined), charStyle: 'Forte', bold: true })).toBe('<w:rPr><w:rStyle w:val="Forte"/><w:b/></w:rPr>');
  });
});

describe('criar/excluir estilo', () => {
  it('vinculado novo como o Word (par Char com o mesmo rPr)', () => {
    const rPr = '<w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="FF0000"/><w:sz w:val="28"/></w:rPr>';
    const p = newStyleXml({ type: 'paragraph', custom: true, id: 'MeuEstilo', name: 'Meu Estilo', basedOn: 'Normal', link: 'MeuEstiloChar',
      pPr: '<w:pPr><w:spacing w:after="240"/><w:ind w:left="720"/><w:jc w:val="center"/></w:pPr>', rPr });
    expect(p).toBe('<w:style w:type="paragraph" w:customStyle="1" w:styleId="MeuEstilo"><w:name w:val="Meu Estilo"/><w:basedOn w:val="Normal"/>'
      + '<w:link w:val="MeuEstiloChar"/><w:pPr><w:spacing w:after="240"/><w:ind w:left="720"/><w:jc w:val="center"/></w:pPr>' + rPr + '</w:style>');
    const c = newStyleXml({ type: 'character', custom: true, id: 'MeuEstiloChar', name: 'Meu Estilo Char', basedOn: 'Fontepargpadro', link: 'MeuEstilo', rPr });
    let xml = putStyle(putStyle(BLANK_STYLES_XML, 'MeuEstilo', p), 'MeuEstiloChar', c);
    expect(xml.endsWith(p + c + '</w:styles>')).toBe(true);
    // o resto da parte fica byte a byte
    expect(xml.slice(0, BLANK_STYLES_XML.length - '</w:styles>'.length)).toBe(BLANK_STYLES_XML.slice(0, -'</w:styles>'.length));
    xml = dropStyle(dropStyle(xml, 'MeuEstilo'), 'MeuEstiloChar');
    expect(xml).toBe(BLANK_STYLES_XML);
  });

  it('latente usado: definição completa sem semiHidden (unhideWhenUsed)', () => {
    const b = builtinStyle('No Spacing')!;
    expect(b.pt).toBe('Sem Espaçamento');
    expect(b.xml).toContain('w:styleId="SemEspaamento"');
    const h2 = builtinStyle('heading 2')!;
    expect(h2.twin).toContain('w:styleId="Ttulo2Char"');
    const raw = styleRaw(BLANK_STYLES_XML, 'Ttulo2')!;
    expect(builtinXml(raw, { used: true })).not.toContain('<w:semiHidden/>');
    expect(builtinXml(h2.xml, { id: 'Heading2', refs: { Ttulo2Char: 'Heading2Char' } })).toContain('w:styleId="Heading2"');
  });

  it('nomes de exibição dos built-ins (en × pt)', () => {
    expect(builtinDisplayName('heading 1', 'en')).toBe('Heading 1');
    expect(builtinDisplayName('heading 1', 'pt')).toBe('Título 1');
    expect(builtinDisplayName('toc 1', 'en')).toBe('TOC 1');
    expect(builtinDisplayName('annotation text', 'en')).toBe('Comment Text');
    expect(builtinDisplayName('List Paragraph', 'pt')).toBe('Parágrafo da Lista');
    expect(builtinDisplayName('Meu Estilo', 'en')).toBeUndefined();
  });
});
