#!/usr/bin/env node
/**
 * Benchmark dos candidatos a motor Hunspell (nspell × ports WASM do Hunspell).
 *
 *   node bench/bench.mjs                → roda os 3 motores × pt-BR/en-US e imprime a tabela
 *   node bench/bench.mjs <motor> <lang> → um motor só (processo isolado: memória limpa)
 *
 * Corpus: palavras REAIS dos .md do repositório (pt: CLAUDE.md, REVIEW-*, FINDINGS…;
 * en: READMEs dos produtos) + erros sintéticos (1 edição: troca, apaga, insere,
 * transpõe) com PRNG fixa. A referência de aderência é o Hunspell 1.7.2 (hunspell-wasm).
 * Os candidatos que perderam saíram do package.json: para rodar de novo,
 * `npm i --no-save nspell@2.1.5 hunspell-wasm@0.3.0 hunspell-asm@4.0.2`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const ROOT = path.resolve(PKG, '../..');
const require = createRequire(import.meta.url);
const LIMIT_MS = 300_000; // por motor × idioma (carga + medições)

const DICTS = {
  'pt-BR': { aff: 'dicts-src/pt-BR/pt_BR.aff', dic: 'dicts-src/pt-BR/pt_BR.dic' },
  'en-US': { aff: 'dicts-src/en-US/en_US.aff', dic: 'dicts-src/en-US/en_US.dic' },
};
const CORPUS = {
  'pt-BR': ['CLAUDE.md', 'sheet/REVIEW-EXCEL.md', 'slides/REVIEW-PPT.md', 'sheet/tools/excel-lab/FINDINGS.md', 'slides/tools/ppt-lab/CORPUS-REPORT.md', 'write/COMPATIBILITY.md', 'shared/spell/dicts-src/pt-BR/README_pt_BR.txt'],
  'en-US': ['write/packages/editor/README.md', 'write/packages/viewer/README.md', 'sheet/packages/sheet/README.md', 'slides/packages/slides/README.md', 'slides/packages/viewer/README.md', 'write/packages/compare/README.md', 'shared/spell/dicts-src/en-US/README_en_US.txt'],
};

function words(lang) {
  const seen = new Set();
  for (const f of CORPUS[lang]) {
    let txt;
    try { txt = readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
    txt = txt.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ').replace(/\]\([^)]*\)/g, ' ').replace(/https?:\S+/g, ' ');
    for (const m of txt.matchAll(/\p{L}+(?:[-'’]\p{L}+)*/gu)) if (m[0].length > 1) seen.add(m[0]);
  }
  return [...seen].sort();
}

function typos(list, n) {
  let s = 42;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const alpha = 'abcdefghijklmnopqrstuvwxyzáéíóúãõç';
  const out = [];
  const pool = list.filter((w) => w.length >= 4);
  for (let i = 0; i < n; i++) {
    const w = pool[Math.floor(rnd() * pool.length)];
    const k = Math.floor(rnd() * w.length);
    const c = alpha[Math.floor(rnd() * alpha.length)];
    const op = Math.floor(rnd() * 4);
    out.push(op === 0 ? w.slice(0, k) + c + w.slice(k + 1)
      : op === 1 ? w.slice(0, k) + w.slice(k + 1)
      : op === 2 ? w.slice(0, k) + c + w.slice(k)
      : k < w.length - 1 ? w.slice(0, k) + w[k + 1] + w[k] + w.slice(k + 2) : w + c);
  }
  return out;
}

async function load(engine, lang) {
  const aff = readFileSync(path.join(PKG, DICTS[lang].aff));
  const dic = readFileSync(path.join(PKG, DICTS[lang].dic));
  if (engine === 'nspell') {
    const nspell = require('nspell');
    const sp = nspell(aff, dic);
    return { check: (w) => sp.correct(w), suggest: (w) => sp.suggest(w) };
  }
  if (engine === 'hunspell-wasm') {
    const { createHunspellFromStrings } = await import('hunspell-wasm');
    const h = await createHunspellFromStrings(aff.toString('utf8'), dic.toString('utf8'));
    return { check: (w) => h.testSpelling(w), suggest: (w) => h.getSpellingSuggestions(w) };
  }
  if (engine === 'hunspell-asm') {
    const { loadModule } = require('hunspell-asm');
    const f = await loadModule();
    const h = f.create(f.mountBuffer(aff, 'a.aff'), f.mountBuffer(dic, 'a.dic'));
    return { check: (w) => h.spell(w), suggest: (w) => h.suggest(w) };
  }
  throw new Error(engine);
}

async function runOne(engine, lang) {
  globalThis.gc?.();
  const m0 = process.memoryUsage();
  const t0 = performance.now();
  const sp = await load(engine, lang);
  const loadMs = performance.now() - t0;
  globalThis.gc?.();
  const m1 = process.memoryUsage();
  const good = words(lang);
  const bad = typos(good, 400);
  const all = [...good, ...bad];
  // warm-up + check
  for (const w of all.slice(0, 200)) sp.check(w);
  const t1 = performance.now();
  const verdict = {};
  for (let r = 0; r < 3; r++) for (const w of all) verdict[w] = sp.check(w);
  const checkUs = ((performance.now() - t1) * 1000) / (all.length * 3);
  // suggest em 60 erros (o mais caro)
  const sample = bad.filter((w) => !verdict[w]).slice(0, 60);
  const sugg = {};
  const lat = [];
  for (const w of sample) {
    const t = performance.now();
    sugg[w] = sp.suggest(w).slice(0, 5);
    lat.push(performance.now() - t);
  }
  lat.sort((a, b) => a - b);
  return {
    engine, lang, loadMs, heapMB: (m1.heapUsed - m0.heapUsed) / 2 ** 20, rssMB: (m1.rss - m0.rss) / 2 ** 20,
    extMB: (m1.external + m1.arrayBuffers - m0.external - m0.arrayBuffers) / 2 ** 20,
    checkUs, sugMedMs: lat[lat.length >> 1] ?? 0, sugP95Ms: lat[Math.floor(lat.length * 0.95)] ?? 0,
    verdict, sugg, nGood: good.length, nBad: bad.length,
  };
}

function bundleKB(engine) {
  const esbuild = require('esbuild');
  const entry = { nspell: "import n from 'nspell'; globalThis.x = n;", 'hunspell-wasm': "import * as h from 'hunspell-wasm'; globalThis.x = h;", 'hunspell-asm': "import * as h from 'hunspell-asm'; globalThis.x = h;" }[engine];
  const r = esbuild.buildSync({ stdin: { contents: entry, resolveDir: PKG }, bundle: true, minify: true, write: false, format: 'esm', platform: 'browser', external: ['fs', 'path', 'module', 'url', 'crypto'], logLevel: 'silent' });
  let kb = r.outputFiles[0].contents.length / 1024;
  if (engine === 'hunspell-wasm') kb += readFileSync(require.resolve('hunspell-wasm/wasm/hunspell.wasm')).length / 1024; // .wasm separado
  return kb;
}

if (process.argv[2]) {
  const res = await runOne(process.argv[2], process.argv[3]);
  process.stdout.write(JSON.stringify(res));
} else {
  const engines = ['hunspell-wasm', 'hunspell-asm', 'nspell'];
  const rows = [];
  for (const lang of ['pt-BR', 'en-US']) {
    const byEng = {};
    for (const e of engines) {
      let out = '';
      try {
        out = execFileSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), e, lang], { maxBuffer: 1 << 28, timeout: LIMIT_MS }).toString();
      } catch { /* não terminou dentro do limite */ }
      byEng[e] = out ? JSON.parse(out) : null;
    }
    const ref = byEng['hunspell-wasm'];
    for (const e of engines) {
      const r = byEng[e];
      if (!r) { rows.push({ engine: e, lang, dnf: true }); continue; }
      const ws = Object.keys(ref.verdict);
      const agree = ws.filter((w) => r.verdict[w] === ref.verdict[w]).length / ws.length;
      const diff = ws.filter((w) => r.verdict[w] !== ref.verdict[w]);
      const sw = Object.keys(ref.sugg).filter((w) => r.sugg[w]);
      const top1 = sw.filter((w) => r.sugg[w][0] === ref.sugg[w][0]).length / (sw.length || 1);
      const accepted = Object.keys(r.verdict).filter((w) => r.verdict[w]).length;
      rows.push({ ...r, agree, top1, diff, accepted });
    }
  }
  console.log('| motor | idioma | bundle (KB, min) | carga (ms) | heap JS (MB) | ArrayBuffer/WASM (MB) | RSS (MB) | check (µs/palavra) | suggest mediana / p95 (ms) | concordância check × Hunspell | top-1 sugestão = Hunspell |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  const kb = Object.fromEntries(engines.map((e) => [e, bundleKB(e)]));
  for (const r of rows) {
    if (r.dnf) { console.log(`| ${r.engine} | ${r.lang} | ${kb[r.engine].toFixed(0)} | > ${LIMIT_MS / 1000} s (não terminou) | | | | | | | |`); continue; }
    console.log(`| ${r.engine} | ${r.lang} | ${kb[r.engine].toFixed(0)} | ${r.loadMs.toFixed(0)} | ${r.heapMB.toFixed(1)} | ${r.extMB.toFixed(1)} | ${r.rssMB.toFixed(1)} | ${r.checkUs.toFixed(1)} | ${r.sugMedMs.toFixed(1)} / ${r.sugP95Ms.toFixed(1)} | ${(r.agree * 100).toFixed(2)}% | ${(r.top1 * 100).toFixed(0)}% |`);
  }
  for (const r of rows) if (r.diff?.length) console.log(`\n${r.engine} ${r.lang}: ${r.diff.length} divergências (de ${r.nGood + r.nBad}); ex.: ${r.diff.slice(0, 25).map((w) => `${w}=${r.verdict[w] ? 'ok' : 'erro'}`).join(', ')}`);
}
