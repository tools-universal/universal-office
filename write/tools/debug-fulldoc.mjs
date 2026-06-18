import { readFileSync } from 'node:fs';
import { DocxPackage, readFullDocument, parseXml, childElements } from '../packages/docx-core/dist/index.js';

const pkg = DocxPackage.load(new Uint8Array(readFileSync('D:/Projects/OfficeNext/WordNext/Catalogo-Recursos-Word.docx')));
const fnXml = pkg.getPartText('word/footnotes.xml');
console.log('footnotes.xml presente:', !!fnXml, 'tamanho:', fnXml?.length);
const root = parseXml(fnXml);
console.log('root:', root.name, 'filhos:', childElements(root).map((c) => `${c.name}#${c.attrs['w:id']}@${c.attrs['w:type'] ?? ''}`));

const doc = readFullDocument(pkg);
console.log('footnotes size:', doc.footnotes.size, [...doc.footnotes.keys()]);
console.log('endnotes size:', doc.endnotes.size);
console.log('blocks:', doc.blocks.length, 'tables top:', doc.blocks.filter((b) => b.type === 'table').length);
console.log('comments:', doc.comments.length);

const allText = doc.blocks.flatMap((b) => b.type === 'paragraph' ? b.paragraph.runs : b.rows.flatMap(r => r.cells.flatMap(c => c.paragraphs.flatMap(p => p.runs)))).map(r => (r.field ? `[FLD:${r.field}]` : '') + (r.noteRef ? `[NOTE:${r.noteRef.kind}${r.noteRef.id}]` : '') + r.text).join('');
console.log('fldSimple no texto?', allText.includes('[FLD:'));
console.log('noteRef no texto?', allText.includes('[NOTE:'));
console.log('sym fonts:', doc.blocks.flatMap((b) => b.type === 'paragraph' ? b.paragraph.runs : []).filter(r => r.props.fontAscii && /gothic|wingding|symbol/i.test(r.props.fontAscii)).map(r => r.props.fontAscii + ':' + JSON.stringify(r.text)));
