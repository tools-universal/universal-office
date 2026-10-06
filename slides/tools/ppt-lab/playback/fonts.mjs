// Fontes do SO para o harness de playback: resolve as famílias que os decks
// usam — fontes do TEMA (major/minor, ex.: Aptos Display/Aptos) + typefaces
// explícitos — em C:\Windows\Fonts, fontes por usuário e no cache CloudFonts
// do Office, copia os arquivos e gera um fonts.css próprio do harness.
//
// Diferenças p/ tools/ppt-lab/sync-os-fonts.mjs: casa nomes pela tabela `name`
// em INGLÊS (langID 0x409 — a 1ª entrada costuma ser catalã: "Negreta"),
// peso/itálico pela tabela OS/2 (usWeightClass/fsSelection), aceita .ttc
// (face 0) e une as fontes de vários decks.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

/** Tabelas de um sfnt (ou da face 0 de um .ttc). */
function sfntTables(buf) {
  let base = 0;
  if (buf.toString('latin1', 0, 4) === 'ttcf') base = buf.readUInt32BE(12);
  const num = buf.readUInt16BE(base + 4);
  const tables = {};
  for (let i = 0; i < num; i++) {
    const o = base + 12 + i * 16;
    tables[buf.toString('latin1', o, o + 4)] = buf.readUInt32BE(o + 8);
  }
  return tables;
}

/** Família/subfamília (preferindo inglês) + peso/itálico do OS/2. */
export function fontInfo(buf) {
  try {
    const t = sfntTables(buf);
    if (t.name === undefined) return null;
    const nameOff = t.name;
    const count = buf.readUInt16BE(nameOff + 2);
    const strOff = nameOff + buf.readUInt16BE(nameOff + 4);
    const get = (id) => {
      let any;
      for (let i = 0; i < count; i++) {
        const r = nameOff + 6 + i * 12;
        if (buf.readUInt16BE(r) !== 3 || buf.readUInt16BE(r + 6) !== id) continue;
        const len = buf.readUInt16BE(r + 8), off = buf.readUInt16BE(r + 10);
        const s = Buffer.from(buf.subarray(strOff + off, strOff + off + len)).swap16().toString('utf16le');
        if (buf.readUInt16BE(r + 4) === 0x409) return s;
        any ??= s;
      }
      return any;
    };
    // família tipográfica (16) quando existe — "Aptos Display" vem como 1 em alguns builds
    const family = get(1);
    const sub = get(2) ?? 'Regular';
    let weight = /bold|black|heavy/i.test(sub) ? 700 : 400;
    let italic = /italic|oblique/i.test(sub);
    if (t['OS/2'] !== undefined) {
      weight = buf.readUInt16BE(t['OS/2'] + 4) || weight;
      italic = (buf.readUInt16BE(t['OS/2'] + 62) & 1) === 1 || italic;
    }
    return { family, sub, weight, italic };
  } catch { return null; }
}

/** Famílias usadas por um .pptx: tema (major/minor latin) + typefaces explícitos. */
export function deckFamilies(pptxBytes) {
  const out = new Set();
  let files;
  try { files = unzipSync(new Uint8Array(pptxBytes)); } catch { return out; }
  for (const [name, data] of Object.entries(files)) {
    if (/^ppt\/theme\/theme\d+\.xml$/.test(name)) {
      const xml = strFromU8(data);
      for (const m of xml.matchAll(/<a:(?:majorFont|minorFont)>\s*<a:latin typeface="([^"]+)"/g)) out.add(m[1]);
    } else if (/^ppt\/(slides|slideLayouts|slideMasters|charts)\/[^/]+\.xml$/.test(name)) {
      for (const m of strFromU8(data).matchAll(/typeface="([^"+][^"]*)"/g)) out.add(m[1]);
    }
  }
  return out;
}

const ROOTS = [
  'C:/Windows/Fonts',
  join(process.env.LOCALAPPDATA ?? '', 'Microsoft/Windows/Fonts'),
  join(process.env.LOCALAPPDATA ?? '', 'Microsoft/FontCache/4/CloudFonts'),
];

/**
 * Copia as fontes das famílias pedidas p/ `outDir/files` e grava
 * `outDir/fonts.css`. Retorna { found: [...], missing: [...] }.
 */
export function syncFonts(families, outDir) {
  const wanted = new Map([...families].map((f) => [f.toLowerCase(), f]));
  const filesDir = join(outDir, 'files');
  mkdirSync(filesDir, { recursive: true });
  const found = [];
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try { entries = readdirSync(dir); } catch { continue; }
      for (const f of entries) {
        const p = join(dir, f);
        let st;
        try { st = statSync(p); } catch { continue; }
        if (st.isDirectory()) { stack.push(p); continue; }
        if (!/\.(ttf|otf|ttc)$/i.test(f)) continue;
        let info;
        try { info = fontInfo(readFileSync(p)); } catch { continue; }
        if (!info?.family || !wanted.has(info.family.toLowerCase())) continue;
        found.push({ ...info, path: p });
      }
    }
  }
  const css = [];
  const seen = new Set();
  for (const f of found) {
    const key = `${f.family.toLowerCase()}|${f.weight}|${f.italic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const file = `${f.family.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${f.weight}${f.italic ? 'i' : ''}${f.path.slice(f.path.lastIndexOf('.')).toLowerCase()}`;
    copyFileSync(f.path, join(filesDir, file));
    css.push(`@font-face { font-family: '${f.family}'; src: url('./files/${file}'); font-weight: ${f.weight}; font-style: ${f.italic ? 'italic' : 'normal'}; }`);
  }
  writeFileSync(join(outDir, 'fonts.css'), css.join('\n') + '\n');
  const foundFamilies = new Set(found.map((f) => f.family.toLowerCase()));
  return {
    found: [...new Set(found.map((f) => `${f.family} ${f.weight}${f.italic ? 'i' : ''} <- ${basename(f.path)}`))],
    missing: [...wanted.values()].filter((w) => !foundFamilies.has(w.toLowerCase())),
  };
}
