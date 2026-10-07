// Tira de filme p/ inspeção: N quadros entre k0..k1 — linha de cima PowerPoint
// (quadro casado pelo alinhamento, ou o mesmo índice com --strict), linha de
// baixo o nosso. Saída: results/playback/_probe/strip-<deck>-<k0>.png
//
// Uso: node tools/ppt-lab/playback/strip.mjs <deck> <k0> <k1> [n=6] [--ext ppt] [--strict] [--crop x,y,w,h]
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe, probeColor, scaleArgs } from './frames.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (f) => { const i = argv.indexOf(`--${f}`); if (i < 0) return undefined; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const strict = argv.includes('--strict'); if (strict) argv.splice(argv.indexOf('--strict'), 1);
const ext = flag('ext') ?? 'pptx';
const crop = flag('crop');
const [deck, k0s, k1s, ns = '6'] = argv;
const dir = join(here, '..', 'results', 'playback', deck, ext);
const cmp = JSON.parse(readFileSync(join(dir, 'compare.json'), 'utf8'));
const k0 = Number(k0s), k1 = Number(k1s), n = Number(ns);
const ks = Array.from({ length: n }, (_, i) => Math.round(k0 + ((k1 - k0) * i) / Math.max(1, n - 1)));
const ka = ks.map((k) => (strict ? k : cmp.series.map[k] ?? k));
const W = 384, H = 216;
const cropF = crop ? (() => { const [x, y, w, h] = crop.split(',').map(Number); return `crop=${w}:${h}:${x}:${y},`; })() : '';
const sel = (list) => list.map((k) => `eq(n\\,${k})`).join('+');
const out = join(here, '..', 'results', 'playback', '_probe', `strip-${deck}-${k0}.png`);
mkdirSync(dirname(out), { recursive: true });
const ppt = join(dir, 'ppt.mp4'), ours = join(dir, 'ours.mkv');
// select devolve os quadros em ordem; índices repetidos (alinhamento) viram 1 só → duplica com loop por quadro
const parts = [];
const inputs = [];
// o MP4 do app tem BURACOS de carimbo (ex.: 957 ms sem quadro); `select(n)` conta
// quadros decodificados — `fps` antes repete o anterior nos buracos, como a
// leitura rawvideo das métricas (índice = tempo/passo)
const pptFps = `fps=1000/${Math.round(probe(ppt).stepMs)}`;
ka.forEach((k, i) => { inputs.push('-i', ppt); parts.push(`[${i}:v]${pptFps},select='${sel([k])}',${cropF}${scaleArgs(probeColor(ppt), W, H)},format=rgb24,setpts=PTS-STARTPTS[a${i}]`); });
ks.forEach((k, i) => { const j = n + i; inputs.push('-i', ours); parts.push(`[${j}:v]select='${sel([k])}',${cropF}scale=${W}:${H},format=rgb24,setpts=PTS-STARTPTS[b${i}]`); });
const top = ka.map((_, i) => `[a${i}]`).join('') + `hstack=inputs=${n}[top]`;
const bot = ks.map((_, i) => `[b${i}]`).join('') + `hstack=inputs=${n}[bot]`;
const graph = [...parts, top, bot, '[top][bot]vstack[v]'].join(';');
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', graph, '-map', '[v]', '-frames:v', '1', out], { windowsHide: true });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
console.log(out, `quadros nossos ${ks.join(',')} | PowerPoint ${ka.join(',')}`);
