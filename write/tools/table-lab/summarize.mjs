// Resumo compacto dos resultados (tblPr, grade, trPr/tcPr/texto por célula).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'results');
for (const n of process.argv.slice(2)) {
  const x = fs.readFileSync(path.join(dir, n + '.xml'), 'utf8').replace(/\n\s*/g, '');
  const body = x.slice(x.indexOf('<w:body>'), x.indexOf('</w:body>'));
  console.log('=== ' + n);
  const tbls = [];
  const walk = (s) => s.replace(/<w:tbl>((?:(?!<w:tbl>)[\s\S])*?)<\/w:tbl>/g, (m, tb) => { tbls.push(tb); return `<TBL${tbls.length}/>`; });
  let b = body; for (let i = 0; i < 4; i++) b = walk(b);
  tbls.forEach((tb, i) => {
    console.log(` T${i + 1} tblPr`, (/<w:tblPr>([\s\S]*?)<\/w:tblPr>/.exec(tb) || [])[1]);
    console.log('  grid', [...tb.matchAll(/gridCol w:w="(\d+)"/g)].map((m) => m[1]).join(','));
    for (const r of tb.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)) {
      const trPr = (/<w:trPr>([\s\S]*?)<\/w:trPr>/.exec(r[1]) || [])[1];
      const ex = (/<w:tblPrEx>([\s\S]*?)<\/w:tblPrEx>/.exec(r[1]) || [])[1];
      const cells = [...r[1].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map((c) => {
        const tc = ((/<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(c[1]) || [])[1] || '').replace(/<w:tcW w:w="(\d+)" w:type="dxa"\/>/, 'W$1');
        const paras = [...c[1].matchAll(/<w:p(?: [^>]*)?(?:\/>|>([\s\S]*?)<\/w:p>)/g)].map((p) => {
          const inner = p[1] || '';
          const ppr = (/<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(inner) || [])[1];
          const txt = [...inner.matchAll(/<w:(?:t|instrText)(?: [^>]*)?>([^<]*)<\/w:(?:t|instrText)>/g)].map((m) => m[1]).join('');
          const fld = /fldChar/.test(inner) ? '{fld}' : '';
          return `"${txt}"${fld}${ppr ? '{' + ppr + '}' : ''}`;
        });
        return `[${tc}] ${paras.join(' / ')}`;
      });
      console.log('  tr' + (ex ? ' EX{' + ex + '}' : '') + (trPr ? ' {' + trPr + '}' : ''), cells.join(' | '));
    }
  });
  console.log(' body', b.replace(/<w:body>/, '').replace(/<w:sectPr>[\s\S]*<\/w:sectPr>/, '').slice(0, 600));
}
