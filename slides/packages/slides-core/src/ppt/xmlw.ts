/**
 * Utilitários mínimos para ESCREVER XML (o conversor gera PresentationML como
 * texto). Só escape correto + montagem de atributos; sem árvore intermediária.
 */

/** Remove caracteres proibidos em XML 1.0 (controles exceto TAB/LF/CR, U+FFFE/U+FFFF). */
function stripInvalid(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || c === 0xfffe || c === 0xffff) continue;
    out += s[i];
  }
  return out;
}

/** Escapa texto de nó (&, <, >). */
export function escText(s: string): string {
  return stripInvalid(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escapa valor de atributo (inclui aspas). */
export function escAttr(s: string): string {
  return escText(s).replace(/"/g, '&quot;');
}

/** Monta ` a="1" b="2"` ignorando valores undefined/null/false. */
export function attrs(obj: Record<string, string | number | boolean | undefined | null>): string {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === false) continue;
    out += ` ${k}="${escAttr(v === true ? '1' : String(v))}"`;
  }
  return out;
}

/** Elemento: vazio (`<x/>`) quando não há conteúdo. */
export function el(name: string, a: Record<string, string | number | boolean | undefined | null> = {}, content = ''): string {
  return content ? `<${name}${attrs(a)}>${content}</${name}>` : `<${name}${attrs(a)}/>`;
}

export const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

export const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  relType: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
} as const;
