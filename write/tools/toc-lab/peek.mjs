// Resumo legível de um resultado do oráculo (results/<nome>.txt): linhas de log
// (sem os parágrafos, com -p) e o corpo como um parágrafo por linha — estilo,
// tabulações e os runs compactados ({b}/{s}/{e} = fldChar, [instr], <a#…>, ⟦bm⟧).
// Uso: node write/tools/toc-lab/peek.mjs <nome> [-p] [-s] [-x]
//   -p parágrafos do log, -s estilos toc/TOC Heading, -x XML cru do corpo
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const [name, ...flags] = process.argv.slice(2);
const txt = fs.readFileSync(path.join(here, 'results', `${name}.txt`), 'utf8');
const lines = txt.split('\n');
const showP = flags.includes('-p'), showS = flags.includes('-s'), raw = flags.includes('-x');
console.log(lines[0], lines[1]);
for (const l of lines) if (l.startsWith('log:') && (showP || !/^log: end p\d+ /.test(l))) console.log(l);
const bi = txt.indexOf('== body');
const body = txt.slice(bi, txt.indexOf('\n== ', bi + 5) < 0 ? undefined : txt.indexOf('\n== ', bi + 5));
if (raw) console.log(body);
else {
  const compact = (p) => {
    const st = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? '';
    const tabs = [...p.matchAll(/<w:tab w:val="(\w+)"(?: w:leader="(\w+)")? w:pos="(\d+)"\/>/g)].map((m) => `${m[1]}${m[2] ? '/' + m[2] : ''}@${m[3]}`).join(',');
    let out = '';
    const re = /<w:fldChar w:fldCharType="(\w+)"\/>|<w:instrText[^>]*>([^<]*)<\/w:instrText>|<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:hyperlink w:anchor="([^"]+)"|<\/w:hyperlink>|<w:bookmarkStart w:id="\d+" w:name="([^"]+)"\/>|<w:bookmarkEnd[^>]*\/>|<w:br w:type="(\w+)"\/>|<w:vanish\/>|<w:fldSimple w:instr="([^"]*)"/g;
    for (const m of p.matchAll(re)) {
      if (m[1]) out += `{${m[1][0]}}`;
      else if (m[2] !== undefined) out += `[${m[2]}]`;
      else if (m[3] !== undefined) out += m[3];
      else if (m[0] === '<w:tab/>') out += '→';
      else if (m[4]) out += `<a#${m[4]}>`;
      else if (m[0] === '</w:hyperlink>') out += '</a>';
      else if (m[5]) out += `⟦${m[5]}`;
      else if (m[0].startsWith('<w:bookmarkEnd')) out += '⟧';
      else if (m[6]) out += `<${m[6]}>`;
      else if (m[0] === '<w:vanish/>') out += '(oculto)';
      else if (m[7] !== undefined) out += `{simple[${m[7]}]}`;
    }
    return `¶ ${st}${tabs ? ' tabs=' + tabs : ''} | ${out}`;
  };
  for (const l of body.split('\n')) {
    if (l.startsWith('<w:p')) console.log(compact(l));
    else if (l.startsWith('<w:sdt>')) console.log('SDT ' + l.replace(/<w:sdtContent>.*$/, '').replace(/^<w:sdt>/, ''));
    else if (l.startsWith('</w:sdtContent>')) console.log('/SDT' + l.slice(15).replace(/<w:p.*$/, ''));
    else if (l.trim()) console.log(l.slice(0, 160));
  }
}
if (showS) for (const l of lines) if (/^== style .*w:name w:val="(toc \d|TOC Heading)"/.test(l)) console.log(l.replace(/ w:rsid w:val="\w+"/, '').replace(/<w:rsid w:val="\w+"\/>/, ''));
