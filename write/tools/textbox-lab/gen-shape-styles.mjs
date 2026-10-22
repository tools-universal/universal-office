// Gera shared/drawingml/src/shape-styles.ts — a galeria Estilos de Forma (77 itens)
// como o Word grava cada um numa caixa de texto (oráculo: results/style-N.xml, medidos
// por experiments.ps1 com Shape.ShapeStyle = N): os filhos do wps:spPr depois da forma
// (preenchimento, contorno) e o wps:style. 1–42 = estilos do tema (lnRef/fillRef/
// effectRef + <a:ln/>); 43–77 = predefinições com preenchimento/contorno explícitos.
//
//   node write/tools/textbox-lab/gen-shape-styles.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', '..', 'shared', 'drawingml', 'src', 'shape-styles.ts');
const min = (s) => s.replace(/>\s+</g, '><').trim();
const rows = [];
for (let n = 1; n <= 77; n++) {
  const x = min(readFileSync(join(here, 'results', `style-${n}.xml`), 'utf8'));
  const sp = /<wps:spPr>([\s\S]*?)<\/wps:spPr>/.exec(x)?.[1] ?? '';
  const after = sp.replace(/^<a:xfrm>.*?<\/a:xfrm><a:prstGeom\b.*?<\/a:prstGeom>/, '');
  const style = /<wps:style>[\s\S]*?<\/wps:style>/.exec(x)?.[0] ?? '';
  if (!style) throw new Error(`style-${n}: sem wps:style`);
  rows.push([after, style]);
}
const body = rows.map(([a, s]) => `  [${JSON.stringify(a)}, ${JSON.stringify(s)}],`).join('\n');
writeFileSync(out, `// GERADO por write/tools/textbox-lab/gen-shape-styles.mjs — não editar à mão.
//
// Galeria Estilos de Forma (Formato da Forma), medida no Word: para o estilo N (1..77,
// índice N-1) os filhos do wps:spPr depois da geometria (preenchimento e contorno; o
// <a:ln/> vazio dos estilos do tema tira o contorno próprio e vale o lnRef) e o
// wps:style (referências ao tema: lnRef/fillRef/effectRef/fontRef). 1–42: estilos do
// tema (Contorno Colorido, Preenchimento Colorido, Efeito Leve/Moderado/Intenso, em
// escuro 1 + Ênfase 1–6); 43–77: predefinições (sem preenchimento, transparentes,
// sólidas e degradês, com o texto claro nas escuras).
export const SHAPE_STYLE_PRESETS: readonly (readonly [spPr: string, style: string])[] = [
${body}
];
`);
console.log('ok', out, rows.length);
