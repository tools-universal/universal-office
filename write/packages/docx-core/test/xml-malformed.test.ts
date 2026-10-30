import { describe, expect, it } from 'vitest';
import { MAX_XML_DEPTH, parseXml } from '../src/xml.js';

describe('parseXml com XML malformado (conteúdo não confiável)', () => {
  it.each([
    ['comentário sem -->', '<a><b/><!-- sem fim'],
    ['fechamento sem >', '<a><b>x</b'],
    ['CDATA sem ]]>', '<a><![CDATA[ sem fim'],
  ])('%s lança em vez de entrar em laço', (_caso, xml) => {
    expect(() => parseXml(xml)).toThrow(/não fechado/);
  });

  it('aninhamento além do limite é recusado', () => {
    const deep = '<a>'.repeat(MAX_XML_DEPTH + 1) + '</a>'.repeat(MAX_XML_DEPTH + 1);
    expect(() => parseXml(deep)).toThrow(/aninhamento excessivo/);
  });

  it('aninhamento no limite e XML bem formado continuam lidos', () => {
    const ok = '<a>'.repeat(MAX_XML_DEPTH) + 'x' + '</a>'.repeat(MAX_XML_DEPTH);
    expect(parseXml(ok).name).toBe('a');
    expect(parseXml('<r><!-- c --><s>t</s><![CDATA[d]]></r>').children).toHaveLength(2);
  });
});
