/**
 * Escrita de XML como texto (adaptado de slides/.../ppt/xmlw.ts): escape
 * correto + montagem de atributos. Sem árvore intermediária.
 */

function stripInvalid(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || c === 0xfffe || c === 0xffff) continue;
    // substitutos isolados também são proibidos em XML
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = s.charCodeAt(i + 1);
      if (n >= 0xdc00 && n <= 0xdfff) { out += s[i]! + s[i + 1]!; i++; }
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue;
    out += s[i];
  }
  return out;
}

export function escText(s: string): string {
  return stripInvalid(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escAttr(s: string): string {
  return escText(s).replace(/"/g, '&quot;');
}

export type Attrs = Record<string, string | number | boolean | undefined | null>;

export function attrs(obj: Attrs): string {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === false) continue;
    out += ` ${k}="${escAttr(v === true ? '1' : String(v))}"`;
  }
  return out;
}

/** Elemento: vazio (`<x/>`) quando não há conteúdo. */
export function el(name: string, a: Attrs = {}, content = ''): string {
  return content ? `<${name}${attrs(a)}>${content}</${name}>` : `<${name}${attrs(a)}/>`;
}

export const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

export const NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  wps: 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
  wpg: 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup',
  mc: 'http://schemas.openxmlformats.org/markup-compatibility/2006',
  w14: 'http://schemas.microsoft.com/office/word/2010/wordml',
  wp14: 'http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing',
  v: 'urn:schemas-microsoft-com:vml',
  o: 'urn:schemas-microsoft-com:office:office',
  w10: 'urn:schemas-microsoft-com:office:word',
  m: 'http://schemas.openxmlformats.org/officeDocument/2006/math',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  relType: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
} as const;

/** Declarações de namespace para as partes de conteúdo (document/header/footer/notas). */
export const CONTENT_NS = attrs({
  'xmlns:wpc': 'http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas',
  'xmlns:mc': NS.mc,
  'xmlns:o': NS.o,
  'xmlns:r': NS.r,
  'xmlns:m': NS.m,
  'xmlns:v': NS.v,
  'xmlns:wp14': NS.wp14,
  'xmlns:wp': NS.wp,
  'xmlns:w10': NS.w10,
  'xmlns:w': NS.w,
  'xmlns:w14': NS.w14,
  'xmlns:wpg': NS.wpg,
  'xmlns:wps': NS.wps,
  'xmlns:a': NS.a,
  'xmlns:pic': NS.pic,
  'mc:Ignorable': 'w14 wp14',
});
