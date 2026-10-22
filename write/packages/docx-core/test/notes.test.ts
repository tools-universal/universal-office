import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, insertText, noteRefIds, newNoteParagraphs,
  patchSettingsNotes, ensureNoteParts, emptyNotesPart, blankDocxPackage, NOTE_REF_TEXT,
  type FullDocument, type Paragraph, type Block, type NotesOut,
} from '../src/index.js';

// documento do oráculo de layout com notas de rodapé e de fim (sintético, sem fontes)
const FIXTURE = join(__dirname, '../../docx-layout/test/oracle/endnotes/en-with-fn.docx');

function open(): { pkg: DocxPackage; full: FullDocument } {
  const pkg = DocxPackage.load(new Uint8Array(readFileSync(FIXTURE)));
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  return { pkg, full };
}

const paragraphsOf = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);

/** Notas como o editor passa: o conteúdo das referenciadas no corpo. */
function notesOf(full: FullDocument): Partial<Record<'footnote' | 'endnote', NotesOut>> {
  const out: Partial<Record<'footnote' | 'endnote', NotesOut>> = {};
  for (const kind of ['footnote', 'endnote'] as const) {
    const used = noteRefIds(full.blocks, kind);
    const src = kind === 'footnote' ? full.footnoteBlocks! : full.endnoteBlocks!;
    out[kind] = { used, blocks: new Map(used.filter((id) => src.has(id)).map((id) => [id, src.get(id)!])) };
  }
  return out;
}

function save(pkg: DocxPackage, full: FullDocument): DocxPackage {
  const last = full.sections[full.sections.length - 1]!;
  writeDocument(pkg, { paragraphs: paragraphsOf(full.blocks), sectPr: last.sectPr }, [], {
    blocks: full.blocks, sources: full.sources, notes: notesOf(full),
  });
  return DocxPackage.load(pkg.save());
}

describe('notas: gravação sem perdas', () => {
  it('salvar sem editar devolve footnotes.xml, endnotes.xml e settings byte a byte', () => {
    const { pkg, full } = open();
    const before = ['word/footnotes.xml', 'word/endnotes.xml', 'word/settings.xml', 'word/document.xml'].map((p) => pkg.getPartText(p));
    const out = save(pkg, full);
    expect(['word/footnotes.xml', 'word/endnotes.xml', 'word/settings.xml', 'word/document.xml'].map((p) => out.getPartText(p))).toEqual(before);
  });

  it('editar o texto de uma nota regrava só ela (separadores e as outras crus)', () => {
    const { pkg, full } = open();
    const orig = pkg.getPartText('word/endnotes.xml')!;
    const en1 = paragraphsOf(full.endnoteBlocks!.get(1)!);
    insertText({ paragraphs: en1, sectPr: full.sections[0]!.sectPr }, { para: 0, offset: 1 }, 'EDITADA ');
    const out = save(pkg, full);
    const xml = out.getPartText('word/endnotes.xml')!;
    expect(xml).toContain('EDITADA');
    // o separador e a nota 2 continuam iguais
    const raw = (x: string, id: string) => new RegExp(`<w:endnote[^>]*w:id="${id}"[^>]*>[\\s\\S]*?</w:endnote>`).exec(x)?.[0];
    expect(raw(xml, '-1')).toBe(raw(orig, '-1'));
    expect(raw(xml, '2')).toBe(raw(orig, '2'));
    expect(raw(xml, '1')).not.toBe(raw(orig, '1'));
    // footnotes.xml intocado
    expect(out.getPartText('word/footnotes.xml')).toBe(pkg.getPartText('word/footnotes.xml'));
  });

  it('referência apagada: a nota sai do arquivo', () => {
    const { pkg, full } = open();
    for (const p of paragraphsOf(full.blocks)) p.runs = p.runs.filter((r) => !(r.noteRef?.kind === 'endnote' && r.noteRef.id === 2));
    const xml = save(pkg, full).getPartText('word/endnotes.xml')!;
    expect(xml).not.toMatch(/w:id="2"/);
    expect(xml).toMatch(/<w:endnote w:id="1">/);
    expect(xml).toMatch(/w:type="separator" w:id="-1"/);
  });

  it('nota nova entra no fim da parte, como o Word grava (marca + espaço, estilos de nota)', () => {
    const { pkg, full } = open();
    const body = paragraphsOf(full.blocks)[0]!;
    body.runs.push({ text: NOTE_REF_TEXT, props: { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false, charStyle: 'FootnoteReference' }, noteRef: { kind: 'footnote', id: 2 } });
    const paras = newNoteParagraphs('footnote', 'FootnoteText', 'FootnoteReference');
    paras[0]!.runs[1]!.text = ' Nova nota';
    full.footnoteBlocks!.set(2, paras.map((paragraph) => ({ type: 'paragraph' as const, paragraph })));
    const out = save(pkg, full);
    const xml = out.getPartText('word/footnotes.xml')!;
    expect(xml).toMatch(/<w:footnote w:id="2"><w:p><w:pPr><w:pStyle w:val="FootnoteText"\/><\/w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"\/><\/w:rPr><w:footnoteRef\/><\/w:r><w:r><w:t xml:space="preserve"> Nova nota<\/w:t><\/w:r><\/w:p><\/w:footnote>/);
    expect(out.getPartText('word/document.xml')).toMatch(/<w:footnoteReference w:id="2"\/>/);
    // reabre: a nota está lá
    const back = readFullDocument(out);
    expect(back.footnotes.get(2)?.[0]?.runs.map((r) => r.text).join('')).toBe(' Nova nota');
  });

  it('opções de nota no sectPr e colunas da área de notas (w15)', () => {
    const { pkg, full } = open();
    const sp = full.sections[full.sections.length - 1]!.sectPr;
    sp.footnotePr = { numFmt: 'lowerRoman', numRestart: 'eachPage' };
    sp.footnoteColumns = 2;
    const doc = save(pkg, full).getPartText('word/document.xml')!;
    expect(doc).toMatch(/<w:sectPr><w:footnotePr><w:numFmt w:val="lowerRoman"\/><w:numRestart w:val="eachPage"\/><\/w:footnotePr><w:pgSz/);
    expect(doc).toMatch(/<w15:footnoteColumns w:val="2"\/><\/w:sectPr><\/w:body>/);
    expect(doc).toMatch(/xmlns:w15="http:\/\/schemas.microsoft.com\/office\/word\/2012\/wordml"/);
    const back = readFullDocument(DocxPackage.load(pkg.save()));
    expect(back.sections[0]!.sectPr.footnotePr).toEqual({ numFmt: 'lowerRoman', numRestart: 'eachPage' });
    expect(back.sections[0]!.sectPr.footnoteColumns).toBe(2);
  });
});

describe('notas: partes e settings', () => {
  it('patchSettingsNotes troca as propriedades e mantém os separadores, na ordem do schema', () => {
    const s0 = '<w:settings xmlns:w="w"><w:zoom/><w:footnotePr><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr><w:compat/></w:settings>';
    const s1 = patchSettingsNotes(s0, { footnote: { numFmt: 'chicago', numStart: 3 }, endnote: { pos: 'sectEnd' } });
    expect(s1).toBe('<w:settings xmlns:w="w"><w:zoom/><w:footnotePr><w:numFmt w:val="chicago"/><w:numStart w:val="3"/><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr><w:endnotePr><w:pos w:val="sectEnd"/><w:endnote w:id="-1"/><w:endnote w:id="0"/></w:endnotePr><w:compat/></w:settings>');
    // null tira as propriedades (ficam os separadores); undefined deixa
    expect(patchSettingsNotes(s1, { footnote: null })).toContain('<w:footnotePr><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr><w:endnotePr><w:pos w:val="sectEnd"/>');
  });

  it('ensureNoteParts cria as duas partes, rels, content types e os separadores no settings (como o Word)', () => {
    const pkg = blankDocxPackage();
    expect(pkg.getPart('word/footnotes.xml')).toBeUndefined();
    expect(ensureNoteParts(pkg)).toBe(true);
    expect(pkg.getPartText('word/footnotes.xml')).toBe(emptyNotesPart('footnote'));
    expect(pkg.getPartText('word/endnotes.xml')).toMatch(/<w:endnote w:type="continuationSeparator" w:id="0">/);
    expect(pkg.getPartText('word/_rels/document.xml.rels')).toMatch(/relationships\/footnotes" Target="footnotes.xml"/);
    expect(pkg.getPartText('[Content_Types].xml')).toMatch(/PartName="\/word\/endnotes.xml" ContentType="application\/vnd.openxmlformats-officedocument.wordprocessingml.endnotes\+xml"/);
    expect(pkg.getPartText('word/settings.xml')).toMatch(/<w:footnotePr><w:footnote w:id="-1"\/><w:footnote w:id="0"\/><\/w:footnotePr><w:endnotePr><w:endnote w:id="-1"\/><w:endnote w:id="0"\/><\/w:endnotePr><w:compat>/);
    // de novo: nada muda
    expect(ensureNoteParts(pkg)).toBe(false);
    // o documento lê as partes novas sem notas
    const full = readFullDocument(pkg);
    expect(full.footnotes.size).toBe(0);
    expect(full.formatting!.settings.footnotePr).toBeUndefined();
  });

  it('referência com marca personalizada: lida e gravada com w:customMarkFollows', () => {
    const pkg = DocxPackage.load(new Uint8Array(readFileSync(join(__dirname, '../../docx-layout/test/oracle/notefmt/custom-mark.docx'))));
    const full = readFullDocument(pkg);
    const runs = paragraphsOf(full.blocks)[0]!.runs;
    const custom = runs.find((r) => r.noteRef?.custom);
    expect(custom?.noteRef).toEqual({ kind: 'footnote', id: 2, custom: true });
    expect(runs[runs.indexOf(custom!) + 1]?.text).toBe('*');
  });
});
