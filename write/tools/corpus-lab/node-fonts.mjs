// Provedor de fontes SÍNCRONO para o motor docx-layout em Node: indexa as
// fontes instaladas (Windows\Fonts, fontes do usuário, cache CloudFonts do
// Office — mesmas raízes do shell Electron, shared/fonts/node/system-fonts.cjs)
// e carrega os bytes sob demanda. As fontes são LIDAS da máquina; nada é
// copiado para o repositório (CLAUDE.md).
import { readdirSync, readFileSync, statSync, openSync, readSync, closeSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

let SfntFont;

function roots() {
  const local = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
  const extra = (process.env.EXTRA_FONT_DIRS ?? '').split(';').filter(Boolean);
  return [
    join(process.env.WINDIR ?? 'C:/Windows', 'Fonts'),
    join(local, 'Microsoft/Windows/Fonts'),
    join(local, 'Microsoft/FontCache/4/CloudFonts'),
    ...extra,
  ].filter((p) => existsSync(p));
}

function readAt(fd, pos, len) {
  const b = Buffer.alloc(len);
  const n = readSync(fd, b, 0, len, pos);
  return b.subarray(0, n);
}

/** Faces de um arquivo: .ttf/.otf = 1; coleção .ttc = todas (Cambria + Cambria Math…). */
function infos(path) {
  let fd;
  try {
    fd = openSync(path, 'r');
    const head = readAt(fd, 0, 16);
    if (head.length < 12) return [];
    if (head.toString('latin1', 0, 4) !== 'ttcf') { const i = info(fd, 0); return i ? [{ ...i, index: 0 }] : []; }
    const n = Math.min(head.readUInt32BE(8), 64);
    const offs = readAt(fd, 12, n * 4);
    const out = [];
    for (let k = 0; k < n; k++) { const i = info(fd, offs.readUInt32BE(k * 4)); if (i) out.push({ ...i, index: k }); }
    return out;
  } catch { return []; } finally { if (fd !== undefined) closeSync(fd); }
}

function info(fd, base) {
  try {
    const off = readAt(fd, base, 12);
    const num = off.readUInt16BE(4);
    if (!num || num > 512) return null;
    const dir = readAt(fd, base + 12, num * 16);
    const t = {};
    for (let i = 0; i < num; i++) t[dir.toString('latin1', i * 16, i * 16 + 4)] = { off: dir.readUInt32BE(i * 16 + 8), len: dir.readUInt32BE(i * 16 + 12) };
    if (!t.name) return null;
    const name = readAt(fd, t.name.off, Math.min(t.name.len, 1 << 20));
    const count = name.readUInt16BE(2), so = name.readUInt16BE(4);
    const get = (id) => {
      let any;
      for (let i = 0; i < count; i++) {
        const r = 6 + i * 12;
        if (name.readUInt16BE(r) !== 3 || name.readUInt16BE(r + 6) !== id) continue;
        const len = name.readUInt16BE(r + 8), o = so + name.readUInt16BE(r + 10);
        const s = Buffer.from(name.subarray(o, o + len)).swap16().toString('utf16le');
        if (name.readUInt16BE(r + 4) === 0x409) return s;
        any ??= s;
      }
      return any;
    };
    const family = get(1)?.trim();
    if (!family || family.startsWith('@')) return null;
    const sub = get(2) ?? 'Regular';
    let bold = /\bbold\b/i.test(sub), italic = /italic|oblique/i.test(sub), weight = 400;
    if (t['OS/2']) {
      const os2 = readAt(fd, t['OS/2'].off, 64);
      if (os2.length >= 64) {
        const fs = os2.readUInt16BE(62);
        weight = os2.readUInt16BE(4) || 400;
        italic = (fs & 1) === 1 || italic;
        bold = (fs & 0x20) !== 0 || bold;
      }
    }
    // também indexa pelo nome "tipográfico" (ID 16) quando difere (ex.: famílias com pesos)
    return { family, typo: get(16)?.trim(), bold, italic, weight };
  } catch { return null; }
}

/** Extrai a face `index` de uma coleção .ttc como um sfnt autônomo. */
function ttcFace(buf, index) {
  const base = buf.readUInt32BE(12 + 4 * index);
  const num = buf.readUInt16BE(base + 4);
  const recs = [];
  for (let i = 0; i < num; i++) {
    const o = base + 12 + i * 16;
    recs.push({ o, off: buf.readUInt32BE(o + 8), len: buf.readUInt32BE(o + 12) });
  }
  const headerLen = 12 + num * 16;
  const out = Buffer.alloc(recs.reduce((n, r) => n + ((r.len + 3) & ~3), headerLen));
  buf.copy(out, 0, base, base + 12);
  let pos = headerLen;
  recs.forEach((r, i) => {
    const d = 12 + i * 16;
    buf.copy(out, d, r.o, r.o + 8);
    out.writeUInt32BE(pos, d + 8);
    out.writeUInt32BE(r.len, d + 12);
    buf.copy(out, pos, r.off, r.off + r.len);
    pos += (r.len + 3) & ~3;
  });
  return out;
}

/**
 * @param {{ missing?: string[] }} [opts] famílias a tratar como NÃO instaladas — o
 *   laboratório do corpus imita a máquina que gerou os PDFs de referência (lá o cache
 *   CloudFonts não tinha a Meiryo UI: o Word usou a substituta)
 */
export async function createNodeFontProvider(opts = {}) {
  const missing = new Set((opts.missing ?? []).map((f) => f.toLowerCase()));
  ({ SfntFont } = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href));
  const index = new Map(); // family(lc) → faces (nome RIBBI)
  const typoIndex = new Map(); // nome tipográfico (ID 16)
  for (const r of roots()) {
    const stack = [r];
    while (stack.length) {
      const d = stack.pop();
      let ents;
      try { ents = readdirSync(d, { withFileTypes: true }); } catch { continue; }
      for (const e of ents) {
        const p = join(d, e.name);
        if (e.isDirectory()) { stack.push(p); continue; }
        if (!/\.(ttf|otf|ttc)$/i.test(e.name)) continue;
        for (const i of infos(p)) {
        // nome RIBBI (ID 1) primeiro; o tipográfico (ID 16) só como alternativa
        // ("Aptos Display" tem ID 16 = "Aptos" e não pode sombrear a Aptos)
        for (const [fam, map] of [[i.family, index], [i.typo, typoIndex]]) {
          if (!fam) continue;
          const key = fam.toLowerCase();
          const list = map.get(key) ?? [];
          if (!list.some((f) => f.bold === i.bold && f.italic === i.italic && f.weight === i.weight)) list.push({ ...i, path: p, family: fam });
          map.set(key, list);
        }
        }
      }
    }
  }
  const loaded = new Map();
  const load = (f) => {
    const lk = `${f.path}#${f.index ?? 0}`;
    let r = loaded.get(lk);
    if (r === undefined) {
      try {
        let bytes = readFileSync(f.path);
        if (bytes.toString('latin1', 0, 4) === 'ttcf') bytes = ttcFace(bytes, f.index ?? 0);
        const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        r = { bytes: u8, font: new SfntFont(u8) };
      } catch { r = null; }
      loaded.set(lk, r);
    }
    return r;
  };
  const faces = new Map();
  return {
    families: () => [...index.values()].map((l) => l[0].family),
    face(family, bold, italic) {
      const key = `${family.toLowerCase()}|${bold}|${italic}`;
      if (faces.has(key)) return faces.get(key);
      const list = missing.has(family.toLowerCase()) ? undefined : index.get(family.toLowerCase()) ?? typoIndex.get(family.toLowerCase());
      let out = null;
      if (list?.length) {
        const score = (f) => (f.bold === bold ? 0 : 4) + (f.italic === italic ? 0 : 2) + Math.abs((f.weight ?? 400) - (bold ? 700 : 400)) / 1000;
        const best = [...list].sort((a, b) => score(a) - score(b))[0];
        const l = load(best);
        if (l) {
          out = {
            key: `${best.family}|${best.bold ? 'b' : ''}${best.italic ? 'i' : ''}|${best.path}#${best.index ?? 0}`,
            family: best.family, font: l.font, bytes: l.bytes, bold, italic,
            ...(bold && !best.bold ? { synthBold: true } : {}),
            ...(italic && !best.italic ? { synthItalic: true } : {}),
          };
        }
      }
      faces.set(key, out);
      return out;
    },
  };
}
