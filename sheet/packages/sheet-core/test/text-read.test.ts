import { describe, expect, it } from 'vitest';
import { parseXml, textContent } from '../src/index.js';
import { decodeXstring, readSharedStrings } from '../src/read.js';
import { defaultColorContext } from '../src/theme.js';
import type { XlsxPackage } from '../src/package.js';

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

  it('<t> sem xml:space="preserve": pontas (espaço/TAB/LF/CR, até por referência) aparadas; miolo e NBSP ficam', () => {
    const xml = '<sst><si><t> a \n b&#32;</t></si><si><t xml:space="preserve"> a\n</t></si>'
      + '<si><r><t>x</t></r><r><t>&#9;y&#13;</t></r></si><si><t>  </t></si><si><t xml:space="preserve">  </t></si>'
      + '<si><t>a\u00a0</t></si></sst>';
    const pkg = { getPartText: (p: string) => (p === 'xl/sharedStrings.xml' ? xml : undefined) } as unknown as XlsxPackage;
    expect(readSharedStrings(pkg, defaultColorContext()).map((s) => s.text)).toEqual(['a \n b', ' a\n', 'xy', '', '  ', 'a\u00a0']);
  });
});
