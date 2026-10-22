import { describe, expect, it } from 'vitest';
import {
  DocxPackage, readFullDocument, readHeaderFooterPart, writeEvenAndOddHeaders, copyHfPartXml, hfPartXml, pageNumberGroupIds,
  SourceStore, type SectPr,
} from '../src/index.js';
import { patchSectPr, pgNumTypeXml } from '../src/lossless.js';
import { readSectPr } from '../src/document.js';
import { parseXml } from '../src/xml.js';

// Regras medidas no Word 365 pt-BR (write/tools/hf-lab, results/*.txt).

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
  + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const GEO = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
const sectOf = (xml: string): SectPr => readSectPr(parseXml(xml));

describe('w:pgNumType — Formatar Números de Página (oráculo e10/e11)', () => {
  it('lê fmt, start, chapStyle e chapSep', () => {
    const sp = sectOf(`<w:sectPr ${NS}>${GEO}<w:pgNumType w:fmt="lowerRoman" w:start="3" w:chapStyle="2" w:chapSep="emDash"/></w:sectPr>`);
    expect(sp).toMatchObject({ pgNumFmt: 'lowerRoman', pgNumStart: 3, pgNumChapStyle: 2, pgNumChapSep: 'emDash' });
  });

  it('grava na ordem do Word; hífen e decimal omitidos; sem atributo some', () => {
    const base = sectOf(`<w:sectPr ${NS}>${GEO}</w:sectPr>`);
    expect(pgNumTypeXml({ ...base, pgNumFmt: 'lowerRoman', pgNumStart: 3 })).toBe('<w:pgNumType w:fmt="lowerRoman" w:start="3"/>');
    expect(pgNumTypeXml({ ...base, pgNumChapStyle: 2, pgNumChapSep: 'period' })).toBe('<w:pgNumType w:chapStyle="2" w:chapSep="period"/>');
    expect(pgNumTypeXml({ ...base, pgNumChapStyle: 1, pgNumChapSep: 'hyphen' })).toBe('<w:pgNumType w:chapStyle="1"/>');
    expect(pgNumTypeXml({ ...base, pgNumFmt: 'decimal' })).toBeNull();
  });

  it('patchSectPr: "continuar da seção anterior" tira o elemento', () => {
    const raw = `<w:sectPr>${GEO}<w:pgNumType w:start="3"/></w:sectPr>`;
    const cur = { ...sectOf(raw.replace('<w:sectPr>', `<w:sectPr ${NS}>`)) };
    delete cur.pgNumStart;
    expect(patchSectPr(raw, cur, undefined)).not.toContain('pgNumType');
    const fmt = patchSectPr(raw, { ...cur, pgNumStart: 3, pgNumFmt: 'upperLetter' }, undefined);
    expect(fmt).toContain('<w:pgNumType w:fmt="upperLetter" w:start="3"/>');
  });
});

describe('w:evenAndOddHeaders (oráculo e04)', () => {
  const pkgWith = (settings: string): DocxPackage => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${NS}>${settings}</w:settings>`);
    return pkg;
  };
  it('liga na posição do schema (depois de defaultTabStop/hyphenation) e desliga', () => {
    const pkg = pkgWith('<w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/><w:hyphenationZone w:val="425"/><w:characterSpacingControl w:val="doNotCompress"/>');
    writeEvenAndOddHeaders(pkg, true);
    expect(pkg.getPartText('word/settings.xml')).toContain('<w:hyphenationZone w:val="425"/><w:evenAndOddHeaders/><w:characterSpacingControl');
    writeEvenAndOddHeaders(pkg, true);
    expect(pkg.getPartText('word/settings.xml')!.match(/evenAndOddHeaders/g)).toHaveLength(1);
    writeEvenAndOddHeaders(pkg, false);
    expect(pkg.getPartText('word/settings.xml')).not.toContain('evenAndOddHeaders');
  });
});

describe('partes de cabeçalho/rodapé no nível do XML', () => {
  it('cópia ao desvincular renova docPr e tira paraId (oráculo e08)', () => {
    let n = 100;
    const xml = '<w:hdr><w:p w14:paraId="1A2B3C4D" w14:textId="77777777"><w:r><w:drawing><wp:inline wp14:anchorId="6AE2D0D1" wp14:editId="1A878592"><wp:docPr id="7" name="Imagem 1"/></wp:inline></w:drawing></w:r></w:p></w:hdr>';
    const out = copyHfPartXml(xml, () => n++);
    expect(out).toContain('<wp:docPr id="100" name="Imagem 1"/>');
    expect(out).not.toMatch(/paraId|textId|anchorId|editId/);
  });

  it('lê uma parte nova com fontes e acha os números de página da galeria (Remover Números de Página)', () => {
    const pkg = DocxPackage.empty();
    const store = new SourceStore();
    const inner = '<w:p><w:r><w:t>Titulo</w:t></w:r></w:p>'
      + '<w:sdt><w:sdtPr><w:id w:val="1"/><w:docPartObj><w:docPartGallery w:val="Page Numbers (Bottom of Page)"/><w:docPartUnique/></w:docPartObj></w:sdtPr><w:sdtContent>'
      + '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:sdtContent></w:sdt>';
    const part = readHeaderFooterPart(pkg, 'word/footer9.xml', store, hfPartXml('footer', inner))!;
    expect(part.paras).toHaveLength(2);
    const ids = pageNumberGroupIds(store.stories.get('word/footer9.xml'));
    expect([...ids]).toEqual([part.paras[1]!.props.src]);
  });

  it('documento lido: a parte do arquivo continua igual (sem xml)', () => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body><w:p/><w:sectPr><w:headerReference w:type="default" r:id="rH"/>${GEO}</w:sectPr></w:body></w:document>`);
    pkg.setPartText('word/header1.xml', `<w:hdr ${NS}><w:p><w:r><w:t>Cab</w:t></w:r></w:p></w:hdr>`);
    pkg.setPartText('word/_rels/document.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>');
    const full = readFullDocument(pkg, { sources: true });
    expect(full.sections[0]!.headers.default?.[0]?.runs[0]?.text).toBe('Cab');
  });
});
