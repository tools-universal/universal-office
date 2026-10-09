// Regressão RÁPIDA e não visual (segundos): para todo deck de samples/
// (.pptx, .ppt de playback/ e legacy/) grava
//   - o modelo de tempo de cada slide (passos, efeitos, alvos, durações) e a
//     linha do tempo da reprodução automática (relógio do export: 33 ms / 30 fps);
//   - nos .ppt, o hash de cada parte do .pptx convertido (o conversor é
//     determinístico) — qualquer mudança na conversão aparece aqui;
// e, com --base <tag>, lista o que mudou. Complementa regress.mjs (render) e o
// lab de playback (vídeo): mudou tempo/conversão sem querer → aparece aqui.
//
// Uso: node tools/ppt-lab/model-regress.mjs <tag> [--base <tag>] [--only sub1,sub2]
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..');
const work = join(here, '.regress');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const baseTag = opt('base');
const only = (opt('only') ?? '').split(',').filter(Boolean);
// --core <dir>: outro src do slides-core (ex.: `git archive <commit>` extraído) — gera a base de um commit antigo
const coreDir = opt('core') ?? join(slidesRoot, 'packages', 'slides-core', 'src');
const tag = args[0];
if (!tag) { console.error('uso: model-regress.mjs <tag> [--base <tag>] [--only sub1,sub2] [--core <src>]'); process.exit(1); }

mkdirSync(work, { recursive: true });
const bundle = join(work, `model-${process.pid}.bundle.mjs`);
await build({
  entryPoints: [join(coreDir, 'index.ts')],
  bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'warning',
  nodePaths: [join(slidesRoot, 'node_modules')],
});
const core = await import(pathToFileURL(bundle).href);
const { PptxPackage, readPresentation, readSlide, buildPlaybackTimeline, isCfb, convertPptToPptx } = core;

const samples = join(slidesRoot, 'samples');
const decks = [];
for (const [dir, re] of [['', /\.pptx$/i], ['playback', /\.pptx?$/i], ['legacy', /\.ppt$/i]]) {
  const abs = join(samples, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).sort()) {
    if (!re.test(f) || !statSync(join(abs, f)).isFile()) continue;
    const rel = dir ? `${dir}/${f}` : f;
    if (only.length && !only.some((s) => rel.includes(s))) continue;
    decks.push(rel);
  }
}

const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : String(x));
const fxSum = (e) => ({
  cls: e.presetClass, id: e.presetId, sub: e.presetSubtype, spid: e.target?.spid, tgt: e.target ? JSON.stringify(e.target) : undefined,
  start: r1(e.startMs), dur: r1(e.durMs), block: r1(e.blockMs), fill: e.fill, endOnNext: e.endOnNext || undefined,
});
const sha = (b) => createHash('sha1').update(b).digest('hex').slice(0, 12);

const out = {};
for (const rel of decks) {
  const entry = {};
  try {
    let bytes = new Uint8Array(readFileSync(join(samples, rel)));
    if (isCfb(bytes)) {
      bytes = convertPptToPptx(bytes);
      const { unzipSync } = await import('fflate');
      const parts = unzipSync(bytes);
      entry.parts = Object.fromEntries(Object.keys(parts).sort().map((k) => [k, sha(parts[k])]));
    }
    const pkg = PptxPackage.load(bytes);
    const pres = readPresentation(pkg);
    entry.show = pres.show;
    const models = [];
    entry.slides = pres.slides.map((ref, i) => {
      let s;
      try { s = readSlide(pkg, ref.target); } catch (e) { models.push(undefined); return { error: String(e).slice(0, 200) }; }
      const t = s.timing;
      models.push(t);
      if (!t) return { i };
      return {
        hidden: t.hidden || undefined,
        transition: t.transition ? { type: t.transition.type, dur: t.transition.durMs, adv: t.transition.advTmMs, click: t.transition.advClick } : undefined,
        steps: t.steps.map((st) => ({ auto: st.auto, dur: r1(st.durMs), fx: st.effects.map(fxSum) })),
        interactive: t.interactive.length ? t.interactive.map(fxSum) : undefined,
        bookmarks: t.bookmarkTriggers?.map((b) => ({ spid: b.spid, n: b.effects.length })),
        animBg: t.animBg,
      };
    });
    const tl = buildPlaybackTimeline(models, { tickMs: 33, transitionFps: 30, defaultSlideMs: 3000 });
    entry.timeline = {
      dur: tl.durationMs,
      slides: tl.slides.map((s) => ({
        i: s.index, start: r1(s.startMs), anim: r1(s.animStartMs), end: r1(s.endMs), steps: s.stepStartMs.map(r1),
        fx: s.effects.map((e) => `${e.target?.spid ?? '-'}@${r1(e.t0)}+${r1(e.durMs)}${e.endAt !== undefined ? `→${r1(e.endAt)}` : ''}/${e.step}`),
      })),
    };
  } catch (e) {
    entry.error = String(e).slice(0, 300);
  }
  out[rel] = entry;
}
const file = join(work, `model-${tag}.json`);
writeFileSync(file, JSON.stringify(out, null, 1));
try { (await import('node:fs')).unlinkSync(bundle); } catch { /* ok */ }

if (baseTag) {
  const base = JSON.parse(readFileSync(join(work, `model-${baseTag}.json`), 'utf8'));
  const lines = [];
  const diffJson = (a, b, path, acc) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffJson(a[k], b[k], `${path}.${k}`, acc);
      return;
    }
    acc.push(`${path}: ${JSON.stringify(a)?.slice(0, 160)} → ${JSON.stringify(b)?.slice(0, 160)}`);
  };
  let changed = 0;
  for (const rel of Object.keys(out)) {
    const acc = [];
    diffJson(base[rel], out[rel], '', acc);
    if (acc.length) {
      changed++;
      lines.push(`${rel}: ${acc.length} diferença(s)`);
      for (const l of acc.slice(0, 12)) lines.push(`   ${l}`);
      if (acc.length > 12) lines.push(`   … +${acc.length - 12}`);
    }
  }
  console.log(lines.join('\n') || '(sem diferença)');
  console.log(`== model ${tag} × ${baseTag}: ${changed}/${Object.keys(out).length} decks mudaram`);
}
console.log(`model-regress: ${decks.length} decks → ${file}`);
