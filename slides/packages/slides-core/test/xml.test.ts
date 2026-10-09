import { describe, it, expect } from 'vitest';
import { parseXml, textContent } from '../src/xml.js';

describe('parseXml — XML malformado falha em vez de travar', () => {
  // antes: indexOf → -1 levava o cursor de volta ao início (laço infinito,
  // "Invalid array length" ou estouro de pilha) — alcançável por .pptx e por
  // .ppt (theme1.xml / metroBlob do round-trip)
  it.each([
    ['comentário sem -->', '<a:theme><!--'],
    ['comentário sem --> com conteúdo antes', '<a:theme><a:x/>texto<!-- nunca fecha'],
    ['CDATA sem ]]>', '<a:theme><![CDATA[abc'],
    ['tag de fechamento sem >', '<a:theme><a:b></a:b'],
    ['fechamento sem > no fim', '<a:theme></a:theme'],
    ['PI no conteúdo sem ?>', '<a:theme><?pi '],
  ])('%s → erro', (_label, xml) => {
    expect(() => parseXml(xml)).toThrow(/XML invalido/);
  });

  it('comentário, CDATA e PI bem formados no conteúdo', () => {
    const el = parseXml('<?xml version="1.0"?><r><!-- c --><a>x</a><![CDATA[<y>]]><?pi z?><b/></r>');
    expect(el.name).toBe('r');
    expect(el.children.filter((c) => typeof c !== 'string').map((c) => (c as { name: string }).name)).toEqual(['a', 'b']);
    expect(textContent(el)).toBe('x<y>');
  });

  it('referência numérica fora do Unicode vira U+FFFD (não lança)', () => {
    const el = parseXml('<t v="&#x110000;&#99999999999;&#65;">&#xFFFFFFFF;&#x41;</t>');
    expect(el.attrs['v']).toBe('��A');
    expect(textContent(el)).toBe('�A');
  });
});
