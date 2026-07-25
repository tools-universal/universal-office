// Mede os padrões de dash do PowerPoint no PNG de referência (slide 3 do
// stress-shapes): runs on/off em px ao longo de cada linha tracejada.
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';

const png = PNG.sync.read(readFileSync('tools/ppt-lab/results/stress/stress-shapes/ppt/slide3.png'));
const S = 1280 / 720; // px por pt (slide 720pt de largura)
const lw = 2 * S;     // linhas de 2pt
// dashes: AddLine(320, 30+i*22, 580, ...) com DashStyle [2,3,4,5,6,7,8]
const styles = ['sysDash(2)', 'roundDot(3)', 'dash(4)', 'dashDot(5)', 'dashDotDot(6)', 'lgDash(7)', 'lgDashDot(8)'];
for (let i = 0; i < 7; i++) {
  const y = Math.round((30 + i * 22) * S);
  // procura a linha exata (verifica y-1..y+1 pela cor 180,40,40)
  let bestY = y, bestCount = 0;
  for (let yy = y - 2; yy <= y + 2; yy++) {
    let n = 0;
    for (let x = Math.round(320 * S); x < Math.round(580 * S); x++) {
      const k = (png.width * yy + x) * 4;
      if (png.data[k] > 120 && png.data[k + 1] < 120) n++;
    }
    if (n > bestCount) { bestCount = n; bestY = yy; }
  }
  const runs = [];
  let on = false, start = 0;
  for (let x = Math.round(320 * S); x < Math.round(580 * S); x++) {
    const k = (png.width * bestY + x) * 4;
    const isOn = png.data[k] > 120 && png.data[k + 1] < 120;
    if (isOn && !on) { on = true; start = x; }
    else if (!isOn && on) { on = false; runs.push([1, x - start]); runs.push([0, 0]); }
    if (!isOn && runs.length && runs[runs.length - 1][0] === 0) runs[runs.length - 1][1]++;
  }
  // padroniza: médias de runs on/off (descarta primeiro/último parciais)
  const ons = runs.filter((r, j) => r[0] === 1 && j > 0 && j < runs.length - 1).map((r) => r[1]);
  const offs = runs.filter((r, j) => r[0] === 0 && j > 0 && j < runs.length - 1).map((r) => r[1]);
  const uniq = (a) => [...new Set(a.map((v) => Math.round(v)))].sort((x2, y2) => x2 - y2);
  const avg = (a) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length) : 0;
  console.log(styles[i], 'y=' + bestY,
    'on runs px:', uniq(ons).join('/'), '(médias em lw:', (avg(ons) / lw).toFixed(2) + ')',
    'off:', uniq(offs).join('/'), '(' + (avg(offs) / lw).toFixed(2) + ')');
}
