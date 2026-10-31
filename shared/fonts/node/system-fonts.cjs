// Fontes do SO para os shells Electron (Write, Sheet, Slides) — processo main.
//
// O renderer não enxerga tudo pelo `queryLocalFonts`: o cache CloudFonts do
// Office 365 (onde moram as Aptos, padrão do Office atual) fica de fora. Aqui
// varremos as pastas de fontes do SO UMA vez, lendo só o cabeçalho e as tabelas
// `name`/`OS/2` de cada arquivo, e respondemos por família da tabela `name` em
// INGLÊS (a 1ª entrada do Windows costuma ser catalã: "Negreta", "Cursiva") —
// o nome de família "RIBBI" (ID 1), o mesmo que o Word/PowerPoint mostram
// ("Segoe UI Semibold", "Arial Black"). Peso/itálico pela OS/2
// (usWeightClass / fsSelection). `.ttc`: TODAS as faces da coleção (Cambria +
// Cambria Math, MS Gothic + MS PGothic + MS UI Gothic), extraídas como sfnt avulso.
//
// Os arquivos são LIDOS da máquina do usuário em tempo de execução — nunca
// copiados para o app/instalador (ver CLAUDE.md, "Fontes proprietárias").
const { readdir, open, readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { homedir } = require('node:os');

function fontRoots() {
  const home = homedir();
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local');
    return [
      join(process.env.WINDIR ?? 'C:/Windows', 'Fonts'),
      join(local, 'Microsoft/Windows/Fonts'),
      join(local, 'Microsoft/FontCache/4/CloudFonts'),
    ];
  }
  if (process.platform === 'darwin') {
    return ['/System/Library/Fonts', '/Library/Fonts', join(home, 'Library/Fonts')];
  }
  // /run/host/*: as fontes do sistema e do usuário que o Flatpak expõe dentro do sandbox
  return ['/usr/share/fonts', '/usr/local/share/fonts', join(home, '.local/share/fonts'), join(home, '.fonts'),
    '/run/host/fonts', '/run/host/user-fonts'];
}

async function readRange(fh, pos, len) {
  const buf = Buffer.alloc(len);
  const { bytesRead } = await fh.read(buf, 0, len, pos);
  return buf.subarray(0, bytesRead);
}

/** Faces do arquivo: [{ family, weight, italic, bold, embeddable, index }] (coleção .ttc: todas). */
async function fontInfos(path) {
  let fh;
  try {
    fh = await open(path, 'r');
    const head = await readRange(fh, 0, 16);
    if (head.length < 12) return [];
    if (head.toString('latin1', 0, 4) !== 'ttcf') {
      const i = await faceInfo(fh, 0);
      return i ? [{ ...i, index: 0 }] : [];
    }
    const n = Math.min(head.readUInt32BE(8), 64);
    const offs = await readRange(fh, 12, n * 4);
    const out = [];
    for (let k = 0; k * 4 + 4 <= offs.length; k++) {
      const i = await faceInfo(fh, offs.readUInt32BE(k * 4));
      if (i) out.push({ ...i, index: k });
    }
    return out;
  } catch {
    return [];
  } finally {
    await fh?.close().catch(() => {});
  }
}

/** { family, weight, italic, bold, embeddable } da face no offset `base`, ou null. */
async function faceInfo(fh, base) {
  try {
    const off = await readRange(fh, base, 12);
    if (off.length < 12) return null;
    const num = off.readUInt16BE(4);
    if (num === 0 || num > 512) return null;
    const dir = await readRange(fh, base + 12, num * 16);
    const tables = {};
    for (let i = 0; i < num; i++) {
      const o = i * 16;
      if (o + 16 > dir.length) break;
      tables[dir.toString('latin1', o, o + 4)] = { off: dir.readUInt32BE(o + 8), len: dir.readUInt32BE(o + 12) };
    }
    if (!tables.name || tables.name.len > (1 << 20)) return null;
    const name = await readRange(fh, tables.name.off, tables.name.len);
    if (name.length < 6) return null;
    const count = name.readUInt16BE(2);
    const strOff = name.readUInt16BE(4);
    const get = (id) => {
      let any;
      for (let i = 0; i < count; i++) {
        const r = 6 + i * 12;
        if (r + 12 > name.length) break;
        if (name.readUInt16BE(r) !== 3 || name.readUInt16BE(r + 6) !== id) continue;
        const len = name.readUInt16BE(r + 8), o = strOff + name.readUInt16BE(r + 10);
        if (o + len > name.length) continue;
        const s = Buffer.from(name.subarray(o, o + len)).swap16().toString('utf16le');
        if (name.readUInt16BE(r + 4) === 0x409) return s;
        any ??= s;
      }
      return any;
    };
    const family = get(1)?.trim();
    if (!family || family.startsWith('@')) return null; // '@' = variante vertical (CJK)
    const sub = get(2) ?? 'Regular';
    let weight = /bold|black|heavy/i.test(sub) ? 700 : /semibold|demibold/i.test(sub) ? 600 : /medium/i.test(sub) ? 500 : 400;
    let italic = /italic|oblique/i.test(sub);
    // negrito "RIBBI" dentro da família (o "B" de Bold/Bold Italic), não o peso
    // absoluto: "Segoe UI Semibold" Regular pesa 600 mas é o regular da família.
    let bold = /\bbold\b/i.test(sub);
    let embeddable = true;
    if (tables['OS/2'] && tables['OS/2'].len >= 64) {
      const os2 = await readRange(fh, tables['OS/2'].off, 64);
      if (os2.length >= 64) {
        const fsSelection = os2.readUInt16BE(62);
        weight = os2.readUInt16BE(4) || weight;
        italic = (fsSelection & 1) === 1 || italic;
        bold = (fsSelection & 0x20) !== 0 || bold;
        // fsType: 0x2 sozinho = "Restricted License" (não pode embutir); 0x4/0x8
        // liberam; 0x200 = só bitmap. Quem exporta PDF embutindo deve respeitar.
        const fsType = os2.readUInt16BE(8);
        embeddable = !((fsType & 0x2) && !(fsType & 0xC)) && !(fsType & 0x200);
      }
    }
    return { family, weight: Math.max(1, Math.min(1000, weight)), italic, bold, embeddable };
  } catch {
    return null;
  }
}

/** Lê os arquivos de uma pasta com concorrência limitada, preservando a ordem. */
async function infosOf(paths, limit = 32) {
  const out = new Array(paths.length);
  let next = 0;
  const worker = async () => {
    while (next < paths.length) {
      const i = next++;
      out[i] = await fontInfos(paths[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, paths.length) }, worker));
  return out;
}

async function buildFontIndex() {
  const idx = new Map(); // family(lc) -> { name, faces: [{ path, weight, italic, bold, embeddable }] }
  const seen = new Set(); // family|peso|estilo: a 1ª face encontrada vence (ordem das raízes)
  for (const root of fontRoots()) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); } catch { continue; }
      entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      const files = [];
      for (const ent of entries) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) stack.push(p);
        else if (/\.(ttf|otf|ttc)$/i.test(ent.name)) files.push(p);
      }
      const infos = await infosOf(files);
      for (let i = 0; i < files.length; i++) {
        for (const info of infos[i] ?? []) {
          const key = info.family.toLowerCase();
          const dedupe = `${key}|${info.weight}|${info.italic}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          const entry = idx.get(key) ?? { name: info.family, faces: [] };
          const { weight, italic, bold, embeddable, index: face } = info;
          entry.faces.push({ path: files[i], face, weight, italic, bold, embeddable });
          idx.set(key, entry);
        }
      }
    }
  }
  return idx;
}

let fontIndex = null; // Promise<Map> — montado uma vez, sob demanda (assíncrono: não trava o processo)
const index = () => (fontIndex ??= buildFontIndex());

/** Começa a montar o índice já (ex.: logo após abrir a janela). */
function warmFontIndex() {
  void index();
}

/** Nomes de família instaladas (como o SO/Office as nomeia), em ordem alfabética. */
async function listFontFamilies() {
  const idx = await index();
  return [...idx.values()].map((e) => e.name).sort((a, b) => a.localeCompare(b));
}

/**
 * Face `index` de uma coleção `.ttc` como sfnt AVULSO (offset table + diretório +
 * tabelas copiadas, alinhadas a 4). O FontFace aceitaria o `.ttc` inteiro, mas
 * o parser de métricas e o embutidor de PDF do Write só leem TTF/OTF.
 * O checksum de cada tabela segue válido (bytes intactos); o
 * head.checkSumAdjustment do arquivo não é conferido pelos navegadores.
 */
function ttcFace(buf, index = 0) {
  const base = buf.readUInt32BE(12 + 4 * index);
  const num = buf.readUInt16BE(base + 4);
  const recs = [];
  for (let i = 0; i < num; i++) {
    const o = base + 12 + i * 16;
    const off = buf.readUInt32BE(o + 8), len = buf.readUInt32BE(o + 12);
    if (off + len > buf.length) throw new RangeError('tabela fora do arquivo');
    recs.push({ o, off, len });
  }
  const headerLen = 12 + num * 16;
  const out = Buffer.alloc(recs.reduce((n, r) => n + ((r.len + 3) & ~3), headerLen));
  buf.copy(out, 0, base, base + 12);
  let pos = headerLen;
  recs.forEach((r, i) => {
    const d = 12 + i * 16;
    buf.copy(out, d, r.o, r.o + 8); // tag + checksum
    out.writeUInt32BE(pos, d + 8);
    out.writeUInt32BE(r.len, d + 12);
    buf.copy(out, pos, r.off, r.off + r.len);
    pos += (r.len + 3) & ~3;
  });
  return out;
}

/**
 * Faces das famílias pedidas: [{ family, weight, style, bold, embeddable, bytes }].
 * `family` ecoa o nome PEDIDO (o renderer registra o FontFace com ele);
 * `weight` é o usWeightClass da OS/2; `bold` é o negrito RIBBI da família;
 * `embeddable` = a licença (fsType) permite embutir em documento/PDF.
 * `bytes` é sempre um sfnt avulso (a face da coleção, se o arquivo for `.ttc`).
 */
async function resolveFonts(families) {
  const idx = await index();
  const out = [];
  for (const fam of Array.isArray(families) ? families : []) {
    for (const f of idx.get(String(fam).toLowerCase())?.faces ?? []) {
      try {
        let bytes = await readFile(f.path);
        if (bytes.toString('latin1', 0, 4) === 'ttcf') bytes = ttcFace(bytes, f.face ?? 0);
        out.push({
          family: String(fam), weight: String(f.weight), style: f.italic ? 'italic' : 'normal',
          bold: f.bold, embeddable: f.embeddable,
          bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        });
      } catch { /* arquivo sumiu/inacessível/corrompido: segue */ }
    }
  }
  return out;
}

module.exports = { warmFontIndex, listFontFamilies, resolveFonts };
