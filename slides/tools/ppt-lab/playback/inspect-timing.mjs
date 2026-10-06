// Mostra o MODELO DE TEMPO (nosso parse de <p:transition>/<p:timing>) e a
// linha do tempo da reprodução automática de um .pptx — o que o nosso player
// vai tocar. Útil p/ conferir contra o ppt-manifest.json do oráculo.
//
// Uso: node tools/ppt-lab/playback/inspect-timing.mjs <deck.pptx> [defaultSlideMs=3000] [--json]
// (requer slides-core compilado: npm run build -w @universal/slides-core)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const core = await import(pathToFileURL(join(here, '..', '..', '..', 'packages', 'slides-core', 'dist', 'index.js')).href);
const { PptxPackage, readPresentation, readSlide, buildPlaybackTimeline } = core;

const args = process.argv.slice(2);
const json = args.includes('--json');
const [file, defMs = '3000'] = args.filter((a) => !a.startsWith('--'));
if (!file) { console.error('uso: inspect-timing.mjs <deck.pptx> [defaultSlideMs]'); process.exit(1); }

const pkg = PptxPackage.load(new Uint8Array(readFileSync(file)));
const pres = readPresentation(pkg);
const slides = pres.slides.map((r) => readSlide(pkg, r.target));
const tl = buildPlaybackTimeline(slides.map((s) => s.timing), { defaultSlideMs: Number(defMs) });

if (json) {
  const strip = (e) => { const { node, ...rest } = e; return rest; };
  console.log(JSON.stringify({
    durationMs: tl.durationMs,
    slides: tl.slides.map((s) => ({ ...s, effects: s.effects.map(strip) })),
  }, null, 1));
  process.exit(0);
}

const f = (ms) => (Number.isFinite(ms) ? (ms / 1000).toFixed(3) : '∞');
slides.forEach((s, i) => {
  const t = s.timing;
  const tr = t?.transition;
  console.log(`slide ${i + 1}${t?.hidden ? ' (OCULTO)' : ''}: transição ${tr ? `${tr.ns}:${tr.type} ${tr.durMs}ms ${JSON.stringify(tr.attrs)} advTm=${tr.advTmMs ?? '-'}` : '—'}`);
  (t?.steps ?? []).forEach((st, k) => {
    console.log(`   passo ${k} ${st.auto ? 'auto ' : 'clique'} dur=${f(st.durMs)}s${st.hasIndefinite ? ' +indefinido' : ''}`);
    for (const e of st.effects) {
      const tg = e.target ? `#${e.target.spid}${e.target.pRange ? ` p${e.target.pRange.join('-')}` : ''}` : '';
      console.log(`      ${e.presetClass}:${e.presetId}/${e.presetSubtype} ${e.filter ?? ''}${e.motion ? ' motion' : ''} ${tg} início ${f(e.startMs)}s dur ${f(e.durMs)}s${e.fill === 'remove' ? ' (retrocede)' : ''}`);
    }
  });
  if (t?.interactive.length) console.log(`   + ${t.interactive.length} efeito(s) interativo(s) (gatilho)`);
});
console.log(`\nlinha do tempo (${f(tl.durationMs)}s, default ${defMs}ms):`);
for (const s of tl.slides) {
  console.log(`  slide ${s.index + 1}: ${f(s.startMs)} → trans ${f(s.transitionMs)} → anim ${f(s.animStartMs)} passos [${s.stepStartMs.map(f).join(', ')}] → fim ${f(s.endMs)}`);
}
