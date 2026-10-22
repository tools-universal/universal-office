/**
 * Notas de rodapé e de fim — o que o Word grava (medido: write/tools/notes-lab):
 * propriedades de numeração/local (w:footnotePr / w:endnotePr no sectPr e no
 * settings), as partes footnotes.xml/endnotes.xml com os separadores, os estilos
 * de nota com os ids do Word pt-BR e o conteúdo de uma nota nova.
 */
import type { DocxPackage } from './package.js';
import { DEFAULT_RUN_PROPS, type Paragraph, type Run } from './document.js';
import type { NoteProps } from './ooxml/parts.js';

export type NoteKind = 'footnote' | 'endnote';

/** Ordem do CT_FtnProps / CT_EdnProps (o settings acrescenta os separadores depois). */
export function notePropsInner(p: NoteProps | undefined): string {
  if (!p) return '';
  return (p.pos ? `<w:pos w:val="${p.pos}"/>` : '')
    + (p.numFmt ? `<w:numFmt w:val="${p.numFmt}"/>` : '')
    + (p.numStart !== undefined ? `<w:numStart w:val="${p.numStart}"/>` : '')
    + (p.numRestart ? `<w:numRestart w:val="${p.numRestart}"/>` : '');
}

/** w:footnotePr / w:endnotePr do sectPr (vazio = nada). */
export function notePropsXml(kind: NoteKind, p: NoteProps | undefined): string {
  const inner = notePropsInner(p);
  return inner ? `<w:${kind}Pr>${inner}</w:${kind}Pr>` : '';
}

export function sameNoteProps(a: NoteProps | undefined, b: NoteProps | undefined): boolean {
  return notePropsInner(a) === notePropsInner(b);
}

/** Separadores das partes de notas (ids -1 e 0), como o Word grava. */
const SEP_PPR = '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>';
const separators = (kind: NoteKind): string =>
  `<w:${kind} w:type="separator" w:id="-1"><w:p>${SEP_PPR}<w:r><w:separator/></w:r></w:p></w:${kind}>`
  + `<w:${kind} w:type="continuationSeparator" w:id="0"><w:p>${SEP_PPR}<w:r><w:continuationSeparator/></w:r></w:p></w:${kind}>`;

const NOTES_NS = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
  + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
  + 'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
  + 'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 w15"';

/** Parte de notas vazia (só os separadores). */
export function emptyNotesPart(kind: NoteKind): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
    + `<w:${kind}s ${NOTES_NS}>${separators(kind)}</w:${kind}s>`;
}

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml.';

/**
 * Garante footnotes.xml E endnotes.xml (o Word cria as duas ao inserir a 1ª nota
 * de qualquer tipo), os rels, os content types e as referências aos separadores
 * no settings. Devolve true se mudou algo.
 */
export function ensureNoteParts(pkg: DocxPackage): boolean {
  let changed = false;
  const relsPath = 'word/_rels/document.xml.rels';
  let rels = pkg.getPartText(relsPath)
    ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  let ct = pkg.getPartText('[Content_Types].xml') ?? '';
  for (const kind of ['footnote', 'endnote'] as const) {
    const path = `word/${kind}s.xml`;
    if (!pkg.getPart(path)) { pkg.setPartText(path, emptyNotesPart(kind)); changed = true; }
    if (!new RegExp(`Type="${REL}/${kind}s"`).test(rels)) {
      let n = 1;
      while (rels.includes(`Id="rId${n}"`)) n++;
      rels = rels.replace('</Relationships>', () => `<Relationship Id="rId${n}" Type="${REL}/${kind}s" Target="${kind}s.xml"/></Relationships>`);
      changed = true;
    }
    if (ct && !ct.includes(`PartName="/${path}"`)) {
      ct = ct.replace('</Types>', () => `<Override PartName="/${path}" ContentType="${CT}${kind}s+xml"/></Types>`);
      changed = true;
    }
  }
  if (changed) {
    pkg.setPartText(relsPath, rels);
    if (ct) pkg.setPartText('[Content_Types].xml', ct);
  }
  const settings = pkg.getPartText('word/settings.xml');
  if (settings) {
    const next = patchSettingsNotes(settings, {});
    if (next !== settings) { pkg.setPartText('word/settings.xml', next); changed = true; }
  }
  return changed;
}

/** Ordem do CT_Settings até w:compat: footnotePr e endnotePr vêm logo antes dele. */
const SETTINGS_AFTER_NOTES = ['w:compat', 'w:docVars', 'w:rsids', 'm:mathPr', 'w:attachedSchema', 'w:themeFontLang',
  'w:clrSchemeMapping', 'w:doNotIncludeSubdocsInStats', 'w:doNotAutoCompressPictures', 'w:forceUpgrade', 'w:captions',
  'w:readModeInkLockDown', 'w:smartTagType', 'sl:schemaLibrary', 'w:shapeDefaults', 'w:doNotEmbedSmartTags',
  'w:decimalSymbol', 'w:listSeparator'];

/**
 * settings.xml com o w:footnotePr / w:endnotePr do documento: `props` troca as
 * propriedades (undefined = deixa como está; null = tira), as referências aos
 * separadores (-1, 0) ficam sempre. O resto do arquivo sai byte a byte.
 */
export function patchSettingsNotes(xml: string, props: { footnote?: NoteProps | null; endnote?: NoteProps | null }): string {
  let out = xml;
  for (const kind of ['footnote', 'endnote'] as const) {
    const tag = `w:${kind}Pr`;
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?(?:/>|>[\\s\\S]*?</${tag}>)`);
    const m = re.exec(out);
    const want = props[kind];
    // separadores e o que mais houver depois das propriedades (preservados)
    const seps = `<w:${kind} w:id="-1"/><w:${kind} w:id="0"/>`;
    if (m) {
      const whole = m[0];
      const close = `</${tag}>`;
      const body = whole.endsWith(close) ? whole.slice(whole.indexOf('>') + 1, whole.length - close.length) : '';
      const refRe = new RegExp(`<w:${kind}\\b[^>]*/>`, 'g');
      const refs = body.match(refRe)?.join('') ?? '';
      const p = want === undefined ? body.replace(refRe, '') : notePropsInner(want ?? undefined);
      const next = `<${tag}>${p}${refs || seps}</${tag}>`;
      if (next !== whole) out = out.slice(0, m.index) + next + out.slice(m.index + whole.length);
    } else {
      const el = `<${tag}>${notePropsInner(want ?? undefined)}${seps}</${tag}>`;
      // footnotePr antes de endnotePr; os dois antes de w:compat (e do que vem depois)
      const enAt = kind === 'footnote' ? out.indexOf('<w:endnotePr') : -1;
      let at = enAt;
      if (at < 0) {
        for (const n of SETTINGS_AFTER_NOTES) {
          const k = out.search(new RegExp(`<${n}[\\s/>]`));
          if (k >= 0 && (at < 0 || k < at)) at = k;
        }
      }
      if (at < 0) at = out.lastIndexOf('</w:settings>');
      out = out.slice(0, at) + el + out.slice(at);
    }
  }
  return out;
}

/** Estilos de nota que o Word acrescenta ao inserir a 1ª nota (ids do Word pt-BR). */
export const NOTE_STYLES: Record<NoteKind, { text: { id: string; name: string; xml: string }; char: { id: string; name: string; xml: string }; ref: { id: string; name: string; xml: string } }> = {
  footnote: {
    text: { id: 'Textodenotaderodap', name: 'footnote text', xml: '<w:style w:type="paragraph" w:styleId="Textodenotaderodap"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodenotaderodapChar"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    char: { id: 'TextodenotaderodapChar', name: 'Texto de nota de rodapé Char', xml: '<w:style w:type="character" w:customStyle="1" w:styleId="TextodenotaderodapChar"><w:name w:val="Texto de nota de rodapé Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodenotaderodap"/><w:uiPriority w:val="99"/><w:semiHidden/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    ref: { id: 'Refdenotaderodap', name: 'footnote reference', xml: '<w:style w:type="character" w:styleId="Refdenotaderodap"><w:name w:val="footnote reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>' },
  },
  endnote: {
    text: { id: 'Textodenotadefim', name: 'endnote text', xml: '<w:style w:type="paragraph" w:styleId="Textodenotadefim"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodenotadefimChar"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    char: { id: 'TextodenotadefimChar', name: 'Texto de nota de fim Char', xml: '<w:style w:type="character" w:customStyle="1" w:styleId="TextodenotadefimChar"><w:name w:val="Texto de nota de fim Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodenotadefim"/><w:uiPriority w:val="99"/><w:semiHidden/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    ref: { id: 'Refdenotadefim', name: 'endnote reference', xml: '<w:style w:type="character" w:styleId="Refdenotadefim"><w:name w:val="endnote reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>' },
  },
};

/** Texto do editor no run da referência: um caractere (o número é do motor). */
export const NOTE_REF_TEXT = '\uFFFC';

/** Campo da marca da própria nota (w:footnoteRef / w:endnoteRef) no modelo. */
export const noteMarkField = (kind: NoteKind): string => (kind === 'footnote' ? ' FOOTNOTEREF_MARK ' : ' ENDNOTEREF_MARK ');

/** Run da referência no texto (estilo de referência; o número é do motor). */
export function noteRefRun(kind: NoteKind, id: number, refStyle: string | undefined): Run {
  return { text: NOTE_REF_TEXT, props: { ...DEFAULT_RUN_PROPS, ...(refStyle ? { charStyle: refStyle } : { vertAlign: 'superscript' as const }) }, noteRef: { kind, id } };
}

/** Conteúdo de uma nota nova: a marca e um espaço (o cursor vai depois dele). */
export function newNoteParagraphs(kind: NoteKind, textStyle: string | undefined, refStyle: string | undefined): Paragraph[] {
  return [{
    props: { ...(textStyle ? { styleId: textStyle } : {}) },
    runs: [
      { text: NOTE_REF_TEXT, props: { ...DEFAULT_RUN_PROPS, ...(refStyle ? { charStyle: refStyle } : { vertAlign: 'superscript' as const }) }, field: noteMarkField(kind) },
      { text: ' ', props: { ...DEFAULT_RUN_PROPS } },
    ],
  }];
}
