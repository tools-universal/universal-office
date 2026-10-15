import { describe, expect, it } from 'vitest';
import { parseXml, textContent } from '../src/index.js';
import { decodeXstring } from '../src/read.js';

describe('texto lido como o Excel (XML 1.0 + ST_Xstring)', () => {
  it('fim de linha literal CRLF/CR vira LF (§2.11); &#13; é preservado', () => {
    const root = parseXml('<si><t>a\r\nb\rc&#13;&#10;d</t></si>');
    expect(textContent(root)).toBe('a\nb\nc\r\nd');
  });

  it('CDATA também é normalizado', () => {
    const root = parseXml('<t><![CDATA[x\r\ny]]></t>');
    expect(textContent(root)).toBe('x\ny');
  });

  it('atributo: TAB/LF/CR literais viram espaço (§3.3.3), referências não', () => {
    const root = parseXml('<a v="x\r\ny\tz&#10;w"/>');
    expect(root.attrs['v']).toBe('x y z\nw');
  });

  it('_xHHHH_ decodifica (hex maiúsculo/minúsculo) e _x005F_ escapa o "_"', () => {
    expect(decodeXstring('Line 1_x000D_\nLine 2')).toBe('Line 1\r\nLine 2');
    expect(decodeXstring('Rich Text_x000d_\nTest')).toBe('Rich Text\r\nTest');
    expect(decodeXstring('_x005F_x000D_')).toBe('_x000D_');
    expect(decodeXstring('sem escape')).toBe('sem escape');
  });
});
