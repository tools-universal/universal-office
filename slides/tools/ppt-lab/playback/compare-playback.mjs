// COMPARA a reprodução automática do PowerPoint (ppt.mp4, oráculo) com a nossa
// (ours.mkv), quadro a quadro, e gera relatório HTML por deck + índice.
//
// Métricas (resolução de análise 640×360, tolerância de canal 40 como no
// compare-deck — AA/hinting/compressão não contam):
//  - ESTRITA: quadro k do PowerPoint × quadro k nosso (mesmo instante). Mede
//    tudo junto: tempo + visual.
//  - ALINHADA: cada quadro nosso × o quadro do PowerPoint mais parecido segundo
//    um alinhamento temporal monotônico (DTW em miniaturas 16×9). Isola a
//    fidelidade VISUAL do erro de tempo.
//  - TEMPO: deslocamento de cada slide (início nosso − início no PowerPoint,
//    via o mapa do DTW) e diferença de duração total.
// Para .ppt que o nosso player não abre: compara o PowerPoint(.ppt) com o
// PowerPoint(.pptx) — o quanto o próprio formato binário perde.
//
// Uso: node compare-playback.mjs [--root results/playback] [deck/ext …]
import { PNG } from 'pngjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FrameReader, probe, probeColor, scaleArgs } from './frames.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const ri = argv.indexOf('--root');
const root = ri >= 0 ? argv.splice(ri, 2)[1] : join(here, '..', 'results', 'playback');

const AW = 640, AH = 360;      // resolução de análise
const TW = 16, TH = 9;         // miniatura p/ DTW
const TOL = 40;                // delta de canal tolerado
const GOOD = 2;                // % de pixels divergentes abaixo do qual o quadro "bate"

// (o ConvertTo-Json do PowerShell 5.1 escreve Infinity/NaN: viram null)
const readJson = (p) => (existsSync(p)
  ? JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '').replace(/:\s*-?(Infinity|NaN)\b/g, ': null'))
  : null);
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** % de pixels com delta > TOL e erro absoluto médio. */
function divergence(a, b) {
  let bad = 0, sum = 0;
  for (let i = 0; i < a.length; i += 3) {
    const dr = Math.abs(a[i] - b[i]), dg = Math.abs(a[i + 1] - b[i + 1]), db = Math.abs(a[i + 2] - b[i + 2]);
    if (dr > TOL || dg > TOL || db > TOL) bad++;
    sum += dr + dg + db;
  }
  const px = a.length / 3;
  return { pct: (100 * bad) / px, mae: sum / a.length };
}

/** Miniatura TW×TH (média por bloco). */
function thumb(f) {
  const out = new Float32Array(TW * TH * 3);
  const bw = AW / TW, bh = AH / TH;
  for (let ty = 0; ty < TH; ty++) {
    for (let tx = 0; tx < TW; tx++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = ty * bh; y < (ty + 1) * bh; y += 2) {
        for (let x = tx * bw; x < (tx + 1) * bw; x += 2) {
          const i = (y * AW + x) * 3;
          r += f[i]; g += f[i + 1]; b += f[i + 2]; n++;
        }
      }
      const o = (ty * TW + tx) * 3;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
  }
  return out;
}

/** Miniatura TW×TH de um PNG (RGBA) em qualquer resolução — referência estática. */
function thumbPng(path) {
  const png = PNG.sync.read(readFileSync(path));
  const out = new Float32Array(TW * TH * 3);
  const bw = png.width / TW, bh = png.height / TH;
  for (let ty = 0; ty < TH; ty++) {
    for (let tx = 0; tx < TW; tx++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = Math.floor(ty * bh); y < Math.floor((ty + 1) * bh); y += 4) {
        for (let x = Math.floor(tx * bw); x < Math.floor((tx + 1) * bw); x += 4) {
          const i = (y * png.width + x) * 4;
          r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++;
        }
      }
      const o = (ty * TW + tx) * 3;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
  }
  return out;
}

const tdist = (a, b) => { let s = 0; for (let q = 0; q < a.length; q++) s += Math.abs(a[q] - b[q]); return s / a.length; };

/**
 * Refina o início de cada slide no vídeo do PowerPoint: o último quadro (perto
 * da estimativa do DTW) que ainda é IGUAL ao estado final do slide anterior
 * (Slide.Export) — independe de como o nosso player renderiza a transição.
 * Só vale quando o estado final do anterior É o layout estático (apenas
 * entradas que ficam); senão (saídas, trajetórias, ênfases, retroceder) fica
 * a estimativa do DTW. "Cortar pelo preto" mostra o anterior na 1ª metade.
 */
function refineStarts(ta, segments, est, refs, n, tlSlides, stepMs) {
  return segments.map((sg, si) => {
    if (si === 0) return { k: 0, how: 'início' };
    const prev = tlSlides[si - 1];
    const cur = tlSlides[si];
    const ref = refs[segments[si - 1].index];
    const kEst = est[si];
    const staticEnd = prev && prev.effects.every((e) => e.presetClass === 'entr' && e.fill !== 'remove');
    if (!ref || !staticEnd) return { k: kEst, how: 'dtw' };
    const tr = cur?.transition;
    const blkHalf = tr?.type === 'cut' && (tr.attrs?.thruBlk === '1' || tr.attrs?.thruBlk === 'true') ? Math.round(cur.transitionMs / 2 / stepMs) : 0;
    const lo = Math.max(0, kEst - 90), hi = Math.min(n - 1, kEst + 30);
    let m = Infinity;
    const d = [];
    for (let k = lo; k <= hi; k++) { d.push(tdist(ta[k], ref)); m = Math.min(m, d[d.length - 1]); }
    if (m > 6) return { k: kEst, how: 'dtw' };
    let last = lo;
    for (let k = lo; k <= hi; k++) if (d[k - lo] <= m + 1.5) last = k;
    return { k: Math.max(0, last - blkHalf), how: 'estático' };
  });
}

/** Atividade (mudança média vs quadro anterior), amostrando 1 a cada 4 pixels. */
function activity(a, b) {
  if (!b) return 0;
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i += 12) { s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3; }
  return s / n;
}

/** Passo 1: lê os dois vídeos em paralelo — métrica estrita, miniaturas, atividade. */
async function pass1(aPath, bPath, n) {
  const ra = new FrameReader(aPath, AW, AH), rb = new FrameReader(bPath, AW, AH);
  const strict = new Float32Array(n), mae = new Float32Array(n), actA = new Float32Array(n), actB = new Float32Array(n);
  const ta = [], tb = [];
  let la = null, lb = null;
  for (let k = 0; k < n; k++) {
    const fa = (await ra.next()) ?? la, fb = (await rb.next()) ?? lb;
    const d = divergence(fa, fb);
    strict[k] = d.pct; mae[k] = d.mae;
    actA[k] = activity(fa, la); actB[k] = activity(fb, lb);
    ta.push(thumb(fa)); tb.push(thumb(fb));
    la = fa; lb = fb;
  }
  ra.close(); rb.close();
  return { strict, mae, actA, actB, ta, tb };
}

/**
 * DTW com banda: alinha a sequência B (nossa) à A (PowerPoint). Devolve, para
 * cada quadro k de B, o 1º e o mediano quadro de A casados.
 */
function dtw(ta, tb, band) {
  const n = ta.length;
  const W = 2 * band + 1;
  const D = new Float64Array(n * W).fill(Infinity);
  const dir = new Uint8Array(n * W); // 0 diag, 1 de cima (i-1), 2 da esquerda (j-1)
  const L = ta[0].length;
  const cost = (i, j) => { let s = 0; const a = ta[i], b = tb[j]; for (let q = 0; q < L; q++) s += Math.abs(a[q] - b[q]); return s / L; };
  const at = (i, j) => (j - i + band); // coluna na banda
  for (let i = 0; i < n; i++) {
    const j0 = Math.max(0, i - band), j1 = Math.min(n - 1, i + band);
    for (let j = j0; j <= j1; j++) {
      const c = cost(i, j);
      let best = Infinity, d = 0;
      if (i === 0 && j === 0) best = 0;
      else {
        if (i > 0 && j > 0 && Math.abs(j - 1 - (i - 1)) <= band) { const v = D[(i - 1) * W + at(i - 1, j - 1)]; if (v < best) { best = v; d = 0; } }
        if (i > 0 && Math.abs(j - (i - 1)) <= band) { const v = D[(i - 1) * W + at(i - 1, j)] + 0.0001; if (v < best) { best = v; d = 1; } }
        if (j > 0 && Math.abs(j - 1 - i) <= band) { const v = D[i * W + at(i, j - 1)] + 0.0001; if (v < best) { best = v; d = 2; } }
      }
      D[i * W + at(i, j)] = best + c;
      dir[i * W + at(i, j)] = d;
    }
  }
  // backtrack
  const pairs = [];
  let i = n - 1, j = n - 1;
  for (;;) {
    pairs.push([i, j]);
    if (i === 0 && j === 0) break;
    const d = dir[i * W + at(i, j)];
    if (d === 0) { i--; j--; } else if (d === 1) i--; else j--;
  }
  pairs.reverse();
  const first = new Int32Array(n).fill(-1), med = new Int32Array(n);
  const lists = Array.from({ length: n }, () => []);
  for (const [a, b] of pairs) lists[b].push(a);
  for (let k = 0; k < n; k++) {
    const l = lists[k];
    first[k] = l[0];
    med[k] = l[Math.floor(l.length / 2)];
  }
  return { first, med };
}

/** Passo 2: métrica alinhada (B[k] × A[med[k]]) + quadros-chave (pior quadro por segmento). */
async function pass2(aPath, bPath, n, map, segments) {
  const ra = new FrameReader(aPath, AW, AH), rb = new FrameReader(bPath, AW, AH);
  const aligned = new Float32Array(n);
  let ja = -1, fa = null, lastA = null, lb = null;
  const worst = segments.map(() => ({ pct: -1, k: -1, a: null, b: null }));
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const fb = (await rb.next()) ?? lb;
    lb = fb;
    const want = map[k];
    while (ja < want) { const f = await ra.next(); ja++; if (f) { fa = f; lastA = f; } else fa = lastA; }
    const d = divergence(fa, fb);
    aligned[k] = d.pct;
    while (seg < segments.length - 1 && k >= segments[seg + 1].k0) seg++;
    if (segments.length && d.pct > worst[seg].pct) worst[seg] = { pct: d.pct, k, ka: want, a: Buffer.from(fa), b: Buffer.from(fb) };
  }
  ra.close(); rb.close();
  return { aligned, worst };
}

function savePng(path, rgb, w, h) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0, o = 0; i < rgb.length; i += 3, o += 4) {
    png.data[o] = rgb[i]; png.data[o + 1] = rgb[i + 1]; png.data[o + 2] = rgb[i + 2]; png.data[o + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
}

/** Diff visual: vermelho onde diverge, versão apagada do PowerPoint no resto. */
function diffImage(a, b) {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i += 3) {
    const bad = Math.abs(a[i] - b[i]) > TOL || Math.abs(a[i + 1] - b[i + 1]) > TOL || Math.abs(a[i + 2] - b[i + 2]) > TOL;
    if (bad) { out[i] = 255; out[i + 1] = 40; out[i + 2] = 40; }
    else { out[i] = 225 + (a[i] >> 3); out[i + 1] = 225 + (a[i + 1] >> 3); out[i + 2] = 225 + (a[i + 2] >> 3); }
  }
  return out;
}

/** Vídeo lado a lado A | B | diff (para o relatório), 3 × 640×360. */
function sideBySide(aPath, bPath, outPath, n, stepMs) {
  const dur = ((n * stepMs) / 1000).toFixed(3);
  const fr = (1000 / stepMs).toFixed(6);
  // quadros casados por ÍNDICE (setpts=N/fps): o vídeo do app tem carimbos de 33 ms
  const g = [
    `[0:v]setpts=N/(${fr}*TB),${scaleArgs(probeColor(aPath), AW, AH)},format=rgb24,tpad=stop_mode=clone:stop_duration=600,split[a1][a2]`,
    `[1:v]setpts=N/(${fr}*TB),${scaleArgs(probeColor(bPath), AW, AH)},format=rgb24,tpad=stop_mode=clone:stop_duration=600,split[b1][b2]`,
    `[a2][b2]blend=all_mode=difference,curves=all='0/0 0.06/0.6 1/1'[d]`,
    `[a1][b1][d]hstack=inputs=3,format=yuv420p[v]`,
  ].join(';');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', aPath, '-i', bPath, '-filter_complex', g, '-map', '[v]',
    '-t', dur, '-r', fr, '-c:v', 'libx264', '-crf', '23', '-preset', 'veryfast', '-g', '15', '-movflags', '+faststart', outPath], { windowsHide: true });
  if (r.status !== 0) console.log('  sbs falhou:', String(r.stderr).slice(0, 400));
}

/** Segmentos (slides) do nosso lado, em quadros, a partir da linha do tempo exata. */
function ourSegments(tl, stepMs, n) {
  return tl.slides.map((s, i) => ({
    pos: i, index: s.index,
    k0: Math.min(n - 1, Math.ceil(s.startMs / stepMs)),
    k1: Math.min(n, Math.ceil(s.endMs / stepMs)),
    startMs: s.startMs, endMs: s.endMs, transitionMs: s.transitionMs,
  }));
}

async function compareDir(dir, rel) {
  const manifest = readJson(join(dir, 'ppt-manifest.json'));
  const status = readJson(join(dir, 'ours-status.json'));
  const timeline = readJson(join(dir, 'ours-timeline.json'));
  const pptPath = join(dir, 'ppt.mp4');
  if (!existsSync(pptPath)) { console.log(`${rel}: sem ppt.mp4`); return null; }
  let pa = probe(pptPath);
  // passo do vídeo do app (inteiro: 30 fps → 33 ms) — a linha do tempo anda assim
  const stepMs = Math.round(pa.stepMs);
  const [deck, ext] = rel.split('/');
  const result = { deck, ext, stepMs: round(stepMs, 3), fps: round(1000 / stepMs, 2), analysis: `${AW}x${AH}`, tol: TOL, ppt: { frames: pa.frames, durationMs: pa.frames * stepMs, version: manifest?.powerpoint } };
  const kfDir = join(dir, 'keyframes');
  if (existsSync(kfDir)) rmSync(kfDir, { recursive: true });
  mkdirSync(kfDir, { recursive: true });

  // A = referência, B = sob teste: PowerPoint × nosso; ou, se o nosso player
  // não abre o arquivo (.ppt), PowerPoint(.pptx) × PowerPoint(.ppt)
  let aPath = pptPath;
  let bPath = join(dir, 'ours.mkv');
  let mode = 'ours';
  if (!status?.ok || !existsSync(bPath)) {
    result.ours = { supported: false, error: status?.error ?? 'sem captura' };
    const other = join(root, deck, 'pptx', 'ppt.mp4');
    if (ext !== 'pptx' && existsSync(other)) { aPath = other; bPath = pptPath; mode = 'format'; pa = probe(aPath); }
    else { writeFileSync(join(dir, 'compare.json'), JSON.stringify(result, null, 1)); return result; }
  }
  const pb = probe(bPath);
  const n = Math.max(pa.frames, pb.frames);
  const t0 = Date.now();
  const p1 = await pass1(aPath, bPath, n);
  const band = Math.min(n - 1, Math.max(300, Math.round(n * 0.3)));
  const { first, med } = dtw(p1.ta, p1.tb, band);

  // segmentos: do nosso timeline (modo ours) ou blocos fixos de 1 s (modo formato)
  let segments;
  if (mode === 'ours' && timeline) segments = ourSegments(timeline, stepMs, n);
  else segments = [{ pos: 0, index: 0, k0: 0, k1: n, startMs: 0, endMs: n * stepMs }];
  const p2 = await pass2(aPath, bPath, n, med, segments);

  const avg = (arr, a = 0, b = arr.length) => { let s = 0; for (let i = a; i < b; i++) s += arr[i]; return b > a ? s / (b - a) : 0; };
  const share = (arr) => { let c = 0; for (const v of arr) if (v < GOOD) c++; return (100 * c) / arr.length; };
  const summary = {
    frames: n,
    strictAvg: round(avg(p1.strict)), alignedAvg: round(avg(p2.aligned)),
    strictGoodShare: round(share(p1.strict)), alignedGoodShare: round(share(p2.aligned)),
    maeAvg: round(avg(p1.mae)),
    aDurationMs: pa.frames * stepMs,
    // nosso: a duração da NOSSA linha do tempo (o vídeo é completado até o fim do PowerPoint)
    bDurationMs: mode === 'ours' && timeline ? Math.round(timeline.durationMs) : pb.frames * stepMs,
    durationDiffMs: 0,
    elapsedSec: 0,
  };

  // por slide: deslocamento de tempo + médias + quadro-chave. Início no
  // PowerPoint: último quadro igual ao estado final do slide anterior
  // (referência estática), com o DTW como estimativa/fallback.
  summary.aDurationMs = Math.round(summary.aDurationMs);
  summary.durationDiffMs = Math.round(summary.bDurationMs - summary.aDurationMs);
  const refs = [];
  if (mode === 'ours') for (const sl of manifest?.slides ?? []) {
    const f = join(dir, 'ppt-slides', `slide${sl.index}.png`);
    refs[sl.index - 1] = existsSync(f) ? thumbPng(f) : null;
  }
  const starts = mode === 'ours'
    ? refineStarts(p1.ta, segments, segments.map((sg) => first[sg.k0]), refs, n, timeline.slides, stepMs)
    : segments.map((sg) => ({ k: first[sg.k0], how: 'dtw' }));
  const slidesOut = [];
  const visible = (manifest?.slides ?? []).filter((s) => !s.hidden);
  segments.forEach((sg, si) => {
    const k0 = sg.k0, k1 = Math.max(sg.k0 + 1, sg.k1);
    const pptStartK = starts[si].k;
    const pptEndK = si + 1 < segments.length ? starts[si + 1].k : pa.frames;
    const w = p2.worst[si];
    let kf = null;
    if (w && w.k >= 0) {
      const base = `s${String(si + 1).padStart(2, '0')}`;
      savePng(join(kfDir, `${base}-a.png`), w.a, AW, AH);
      savePng(join(kfDir, `${base}-b.png`), w.b, AW, AH);
      savePng(join(kfDir, `${base}-d.png`), diffImage(w.a, w.b), AW, AH);
      kf = { base, k: w.k, ka: w.ka, pct: round(w.pct) };
    }
    const man = mode === 'ours' ? (manifest?.slides ?? [])[sg.index] : null;
    slidesOut.push({
      pos: si, index: sg.index, title: man?.title ?? (mode === 'ours' ? visible[si]?.title : null) ?? null,
      transition: man?.transition ?? null, effects: man?.effects?.length ?? 0,
      oursStartMs: Math.round(sg.startMs), oursDurMs: Math.round(sg.endMs - sg.startMs),
      pptStartMs: pptStartK * stepMs, pptDurMs: (pptEndK - pptStartK) * stepMs,
      offsetMs: Math.round(sg.startMs - pptStartK * stepMs), startHow: starts[si].how,
      strictAvg: round(avg(p1.strict, k0, k1)), alignedAvg: round(avg(p2.aligned, k0, k1)),
      keyframe: kf,
    });
  });
  const offs = slidesOut.map((s) => Math.abs(s.offsetMs));
  summary.offsetMeanAbsMs = Math.round(offs.reduce((a, b) => a + b, 0) / Math.max(1, offs.length));
  summary.offsetMaxAbsMs = Math.max(0, ...offs);
  summary.elapsedSec = round((Date.now() - t0) / 1000, 1);

  sideBySide(aPath, bPath, join(dir, 'sbs.mp4'), n, stepMs);
  Object.assign(result, {
    mode,
    ours: mode === 'ours' ? { supported: true, frames: pb.frames, durationMs: timeline?.durationMs, screenshots: status?.screenshots } : result.ours,
    summary,
    slides: mode === 'ours' ? slidesOut : [],
    keyframes: mode === 'format' ? slidesOut[0]?.keyframe : undefined,
    series: {
      strict: Array.from(p1.strict, (v) => round(v, 1)),
      aligned: Array.from(p2.aligned, (v) => round(v, 1)),
      actA: Array.from(p1.actA, (v) => round(v, 2)),
      actB: Array.from(p1.actB, (v) => round(v, 2)),
      map: Array.from(med),
    },
  });
  writeFileSync(join(dir, 'compare.json'), JSON.stringify(result));
  return result;
}

// ───────────────────────── relatório ─────────────────────────

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sec = (ms) => (ms / 1000).toFixed(2) + ' s';
const cls = (v, ok, warn) => (v <= ok ? 'ok' : v <= warn ? 'warn' : 'bad');

function chartSvg(r) {
  const s = r.series; const n = s.strict.length;
  const W = 1200, H = 220, pad = 30;
  const x = (k) => pad + (k / Math.max(1, n - 1)) * (W - 2 * pad);
  const y = (v) => H - 20 - (Math.min(100, v) / 100) * (H - 40);
  const line = (arr, f = (v) => v) => arr.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(f(v)).toFixed(1)}`).join('');
  const actMax = Math.max(1, ...s.actA, ...s.actB);
  const act = (v) => (v / actMax) * 100;
  const marks = (r.slides ?? []).map((sl) => {
    const kx = x(sl.oursStartMs / r.stepMs);
    const kp = x(sl.pptStartMs / r.stepMs);
    return `<line x1="${kx}" x2="${kx}" y1="10" y2="${H - 20}" class="m-ours"/><line x1="${kp}" x2="${kp}" y1="10" y2="${H - 20}" class="m-ppt"/>` +
      `<text x="${kx + 2}" y="18" class="lbl">${sl.pos + 1}</text>`;
  }).join('');
  const ticks = [];
  for (let t = 0; t <= (n * r.stepMs) / 1000; t += 5) ticks.push(`<text x="${x((t * 1000) / r.stepMs)}" y="${H - 4}" class="tick">${t}s</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" data-n="${n}" data-pad="${pad}" data-w="${W}">
  <rect x="${pad}" y="10" width="${W - 2 * pad}" height="${H - 30}" class="bg"/>
  ${marks}
  <path d="${line(s.actA, act)}" class="act-a"/><path d="${line(s.actB, act)}" class="act-b"/>
  <path d="${line(s.strict)}" class="strict"/><path d="${line(s.aligned)}" class="aligned"/>
  ${ticks.join('')}<line class="cursor" x1="${pad}" x2="${pad}" y1="10" y2="${H - 20}"/>
</svg>`;
}

const CSS = `body{font:14px/1.45 'Segoe UI',system-ui,sans-serif;background:#16161a;color:#e8e8ea;margin:0;padding:18px 24px}
a{color:#8ab4ff}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px}
.sub{color:#9a9aa3;margin-bottom:14px}.cards{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
.card{background:#212128;border:1px solid #2e2e38;border-radius:8px;padding:10px 14px;min-width:150px}
.card b{display:block;font-size:20px}.card span{color:#9a9aa3;font-size:12px}
.ok{color:#7bd88f}.warn{color:#ffd166}.bad{color:#ff6b6b}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid #2a2a33;padding:5px 6px;text-align:left;vertical-align:top}
th{color:#9a9aa3;font-weight:600;position:sticky;top:0;background:#16161a}
.chart{width:100%;background:#1c1c22;border:1px solid #2e2e38;border-radius:6px;cursor:crosshair}
.chart .bg{fill:#1c1c22}.chart .strict{fill:none;stroke:#ff6b6b;stroke-width:1.2}.chart .aligned{fill:none;stroke:#ffb35c;stroke-width:1.2}
.chart .act-a{fill:none;stroke:#8f8f9a;stroke-width:1;opacity:.7}.chart .act-b{fill:none;stroke:#5aa0ff;stroke-width:1;opacity:.7}
.chart .m-ours{stroke:#5aa0ff;stroke-dasharray:3 3;opacity:.6}.chart .m-ppt{stroke:#bbb;opacity:.35}.chart .lbl{fill:#5aa0ff;font-size:10px}
.chart .tick{fill:#777;font-size:10px;text-anchor:middle}.chart .cursor{stroke:#fff;stroke-width:1.5}
.legend span{margin-right:14px;font-size:12px}.legend i{display:inline-block;width:14px;height:3px;margin-right:5px;vertical-align:middle}
video{width:100%;background:#000;border-radius:6px}.cols{display:flex;color:#9a9aa3;font-size:12px}.cols div{flex:1;text-align:center}
.kf img{width:200px;display:block;border:1px solid #333}.kf{display:flex;gap:4px}
.ctl button{background:#2b2b35;color:#eee;border:1px solid #3a3a46;border-radius:4px;padding:3px 9px;margin-right:4px;cursor:pointer}
code{background:#24242c;padding:1px 4px;border-radius:3px}`;

function deckReport(r) {
  const s = r.summary;
  const title = `${r.deck}.${r.ext}`;
  const head = `<!DOCTYPE html><meta charset="utf-8"><title>${esc(title)} — playback</title><style>${CSS}</style>
<a href="../../index.html">← índice</a><h1>${esc(title)}</h1>`;
  if (!s) {
    return `${head}<div class="sub">PowerPoint: ${r.ppt.frames} quadros (${sec(r.ppt.durationMs)})</div>
<p class="bad"><b>Nosso player não reproduz este arquivo:</b> ${esc(r.ours?.error)}</p>
<video src="ppt.mp4" controls></video>`;
  }
  const labels = r.mode === 'format' ? ['PowerPoint (.pptx)', `PowerPoint (.${r.ext})`, 'diferença'] : ['PowerPoint (oráculo)', 'nosso player', 'diferença'];
  const banner = r.mode === 'format'
    ? `<p class="bad"><b>Nosso player não abre .${esc(r.ext)}</b> (${esc(r.ours?.error)}). Abaixo: o PowerPoint tocando o <code>.${esc(r.ext)}</code> × o mesmo deck em <code>.pptx</code> — o que o formato binário perde no próprio PowerPoint.</p>`
    : '';
  const rows = (r.slides ?? []).map((sl) => {
    const kf = sl.keyframe ? `<div class="kf"><img src="keyframes/${sl.keyframe.base}-a.png" title="PowerPoint q${sl.keyframe.ka}"><img src="keyframes/${sl.keyframe.base}-b.png" title="nosso q${sl.keyframe.k}"><img src="keyframes/${sl.keyframe.base}-d.png"></div>` : '';
    const tr = sl.transition ? `${esc(sl.transition.effectName?.replace('ppEffect', ''))} ${sl.transition.duration ?? ''}s${sl.transition.advanceOnTime ? ` · após ${sl.transition.advanceTime}s` : ''}` : '';
    return `<tr data-k="${Math.round(sl.oursStartMs / r.stepMs)}"><td>${sl.pos + 1}<br><span class="sub">#${sl.index + 1}</span></td><td>${esc(sl.title)}<br><span class="sub">${tr}${sl.effects ? ` · ${sl.effects} efeito(s)` : ''}</span></td>
<td>${sec(sl.pptStartMs)}<br><span class="sub">${sec(sl.pptDurMs)}</span></td><td>${sec(sl.oursStartMs)}<br><span class="sub">${sec(sl.oursDurMs)}</span></td>
<td class="${cls(Math.abs(sl.offsetMs), 100, 500)}">${sl.offsetMs > 0 ? '+' : ''}${sl.offsetMs} ms</td>
<td class="${cls(sl.strictAvg, 2, 10)}">${sl.strictAvg}%</td><td class="${cls(sl.alignedAvg, 2, 10)}">${sl.alignedAvg}%</td><td>${kf}<span class="sub">pior quadro alinhado: ${sl.keyframe?.pct ?? '-'}%</span></td></tr>`;
  }).join('\n');
  return `${head}<div class="sub">PowerPoint ${esc(r.ppt.version ?? '')} · ${r.fps} fps (${r.stepMs} ms/quadro) · análise ${r.analysis} · tolerância de canal ${r.tol}</div>
${banner}
<div class="cards">
 <div class="card"><b class="${cls(s.strictAvg, 2, 10)}">${s.strictAvg}%</b><span>divergência ESTRITA média<br>(mesmo instante)</span></div>
 <div class="card"><b class="${cls(s.alignedAvg, 2, 10)}">${s.alignedAvg}%</b><span>divergência ALINHADA média<br>(só visual, tempo compensado)</span></div>
 <div class="card"><b>${s.strictGoodShare}% / ${s.alignedGoodShare}%</b><span>quadros que batem (&lt;${GOOD}%)<br>estrito / alinhado</span></div>
 <div class="card"><b class="${cls(Math.abs(s.durationDiffMs), 100, 1000)}">${s.durationDiffMs > 0 ? '+' : ''}${(s.durationDiffMs / 1000).toFixed(2)} s</b><span>duração: ${sec(s.aDurationMs)} ${r.mode === 'format' ? 'PowerPoint .pptx' : 'PowerPoint'}<br>vs ${sec(s.bDurationMs)} ${r.mode === 'format' ? `PowerPoint .${esc(r.ext)}` : 'nosso'}</span></div>
 ${r.mode === 'ours' ? `<div class="card"><b class="${cls(s.offsetMeanAbsMs, 100, 500)}">${s.offsetMeanAbsMs} ms</b><span>|deslocamento| médio por slide<br>máx ${s.offsetMaxAbsMs} ms</span></div>` : ''}
</div>
<h2>Linha do tempo</h2>
<div class="legend"><span><i style="background:#ff6b6b"></i>divergência estrita (%)</span><span><i style="background:#ffb35c"></i>divergência alinhada (%)</span><span><i style="background:#8f8f9a"></i>atividade ${esc(labels[0])}</span><span><i style="background:#5aa0ff"></i>atividade ${esc(labels[1])}</span>${r.mode === 'ours' ? '<span>tracejado azul: início do slide no nosso · cinza: no PowerPoint</span>' : ''}</div>
${chartSvg(r)}
<h2>Vídeo lado a lado</h2>
<div class="cols"><div>${labels[0]}</div><div>${labels[1]}</div><div>${labels[2]}</div></div>
<video id="v" src="sbs.mp4" controls preload="auto"></video>
<div class="ctl"><button data-d="-1">◀ quadro</button><button data-d="1">quadro ▶</button> <span id="info"></span></div>
${r.mode === 'ours' ? `<h2>Por slide</h2><table><tr><th>pos</th><th>slide</th><th>PowerPoint<br>início / duração</th><th>nosso<br>início / duração</th><th>deslocamento</th><th>estrita</th><th>alinhada</th><th>pior quadro (PowerPoint · nosso · diff)</th></tr>${rows}</table>` : ''}
<script>
const step=${r.stepMs}/1000, n=${s.frames}, v=document.getElementById('v'), info=document.getElementById('info');
const strict=${JSON.stringify(r.series.strict)}, aligned=${JSON.stringify(r.series.aligned)};
const svg=document.querySelector('.chart'), cur=svg.querySelector('.cursor'), pad=+svg.dataset.pad, W=+svg.dataset.w;
const kx=k=>pad+k/Math.max(1,n-1)*(W-2*pad);
function upd(){const k=Math.min(n-1,Math.round(v.currentTime/step));cur.setAttribute('x1',kx(k));cur.setAttribute('x2',kx(k));info.textContent='quadro '+k+' · '+(k*step).toFixed(3)+' s · estrita '+strict[k]+'% · alinhada '+aligned[k]+'%';}
v.addEventListener('timeupdate',upd);v.addEventListener('seeked',upd);
svg.addEventListener('click',e=>{const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;const k=Math.round((x-pad)/(W-2*pad)*(n-1));v.currentTime=Math.max(0,k)*step+step/2;});
document.querySelectorAll('.ctl button').forEach(b=>b.onclick=()=>{v.pause();v.currentTime=Math.max(0,v.currentTime+(+b.dataset.d)*step);});
document.querySelectorAll('tr[data-k]').forEach(tr=>tr.onclick=()=>{v.currentTime=(+tr.dataset.k)*step+step/2;window.scrollTo({top:v.offsetTop-40,behavior:'smooth'});});
</script>`;
}

function indexReport(results) {
  const byDeck = new Map();
  for (const r of results) { if (!byDeck.has(r.deck)) byDeck.set(r.deck, {}); byDeck.get(r.deck)[r.ext] = r; }
  const cell = (r) => {
    if (!r) return '<td>—</td><td></td><td></td><td></td>';
    const link = `<a href="${esc(r.deck)}/${esc(r.ext)}/report.html">.${esc(r.ext)}</a>`;
    if (r.mode !== 'ours') {
      const fmt = r.summary ? `<br><span class="sub">PowerPoint .${esc(r.ext)} × .pptx: ${r.summary.alignedAvg}% alinhada, ${(r.summary.durationDiffMs / 1000).toFixed(2)} s</span>` : '';
      return `<td>${link}</td><td colspan="3" class="bad">não suportado pelo nosso player${fmt}</td>`;
    }
    const s = r.summary;
    return `<td>${link}</td><td class="${cls(s.strictAvg, 2, 10)}">${s.strictAvg}%</td><td class="${cls(s.alignedAvg, 2, 10)}">${s.alignedAvg}%</td>` +
      `<td class="${cls(Math.abs(s.durationDiffMs), 100, 1000)}">${s.durationDiffMs > 0 ? '+' : ''}${(s.durationDiffMs / 1000).toFixed(2)} s<br><span class="sub">|desl.| ${s.offsetMeanAbsMs} ms</span></td>`;
  };
  const rows = [...byDeck.entries()].map(([deck, f]) => {
    const any = f.pptx ?? f.ppt;
    return `<tr><td><b>${esc(deck)}</b><br><span class="sub">${any?.slides?.length || '?'} slides · ${sec(any?.ppt?.durationMs ?? 0)} no PowerPoint</span></td>${cell(f.pptx)}${cell(f.ppt)}</tr>`;
  }).join('\n');
  const ours = results.filter((r) => r.mode === 'ours' && r.summary);
  const totalFrames = ours.reduce((a, r) => a + r.summary.frames, 0);
  const wavg = (key) => (totalFrames ? round(ours.reduce((a, r) => a + r.summary[key] * r.summary.frames, 0) / totalFrames) : 0);
  return `<!DOCTYPE html><meta charset="utf-8"><title>Reprodução automática — PowerPoint × nosso</title><style>${CSS}</style>
<h1>Reprodução automática — PowerPoint × nosso player</h1>
<div class="sub">Oráculo: PowerPoint (COM) <code>CreateVideo</code> com intervalos gravados · nosso: <code>&lt;universal-slides-viewer&gt;.play()</code> sob relógio virtual nos mesmos instantes · ${ours[0]?.fps ?? 30} fps · gerado em ${new Date().toLocaleString('pt-BR')}</div>
<div class="cards">
 <div class="card"><b>${ours.length}</b><span>decks .pptx comparados<br>${totalFrames} quadros</span></div>
 <div class="card"><b class="${cls(wavg('strictAvg'), 2, 10)}">${wavg('strictAvg')}%</b><span>divergência estrita média<br>(ponderada por quadros)</span></div>
 <div class="card"><b class="${cls(wavg('alignedAvg'), 2, 10)}">${wavg('alignedAvg')}%</b><span>divergência alinhada média<br>(só visual)</span></div>
 <div class="card"><b>${wavg('alignedGoodShare')}%</b><span>quadros visualmente iguais<br>(&lt;${GOOD}% alinhado)</span></div>
</div>
<table><tr><th>deck</th><th>.pptx</th><th>estrita</th><th>alinhada</th><th>tempo (duração / desl.)</th><th>.ppt</th><th colspan="3"></th></tr>${rows}</table>`;
}

// ───────────────────────── main ─────────────────────────
const targets = argv.length ? argv : readdirSync(root).filter((d) => !d.startsWith('_') && statSync(join(root, d)).isDirectory())
  .flatMap((d) => readdirSync(join(root, d)).filter((e) => existsSync(join(root, d, e, 'ppt.mp4'))).map((e) => `${d}/${e}`))
  // .pptx primeiro: o modo "formato" do .ppt compara com o vídeo do .pptx
  .sort((a, b) => (a.endsWith('/pptx') === b.endsWith('/pptx') ? a.localeCompare(b) : a.endsWith('/pptx') ? -1 : 1));
for (const t of targets) {
  const dir = join(root, t);
  const r = await compareDir(dir, t);
  if (!r) continue;
  writeFileSync(join(dir, 'report.html'), deckReport(r));
  const s = r.summary;
  console.log(s ? `${t}: estrita ${s.strictAvg}% · alinhada ${s.alignedAvg}% · duração ${s.durationDiffMs > 0 ? '+' : ''}${s.durationDiffMs} ms · ${s.elapsedSec}s${r.mode === 'format' ? ' (modo formato: .ppt×.pptx no PowerPoint)' : ''}` : `${t}: ${r.ours?.error}`);
}
// índice com tudo que já foi comparado
const all = [];
for (const d of readdirSync(root).filter((d) => !d.startsWith('_') && statSync(join(root, d)).isDirectory())) {
  for (const e of readdirSync(join(root, d))) {
    const c = readJson(join(root, d, e, 'compare.json'));
    if (c) all.push(c);
  }
}
writeFileSync(join(root, 'index.html'), indexReport(all));
console.log(`índice: ${join(root, 'index.html')}`);
