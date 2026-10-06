// Leitura de vídeo quadro a quadro via ffmpeg (rawvideo rgb24) — sem guardar
// o vídeo inteiro na memória: cada `next()` devolve o próximo quadro.
//
// COR: o MP4 do PowerPoint (CreateVideo) é YUV BT.709 SEM tag de matriz; o
// ffmpeg assumiria BT.601 e deslocaria as cores em até ~17 níveis (roxo
// 142,68,173 → 134,51,168). Vídeos YUV sem tag são lidos como BT.709.
import { spawn, execFileSync } from 'node:child_process';

/** Metadados de um vídeo (nº de quadros contados, passo em ms, tamanho). */
export function probe(path) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-count_packets',
    '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets,pix_fmt,color_space', '-of', 'json', path], { windowsHide: true }).toString();
  const st = JSON.parse(out).streams[0];
  const [n, d] = st.r_frame_rate.split('/').map(Number);
  return {
    width: st.width, height: st.height, frames: Number(st.nb_read_packets), stepMs: (1000 * d) / n,
    pixFmt: st.pix_fmt, colorSpace: st.color_space,
  };
}

/** pix_fmt/color_space (sem contar pacotes — barato), com cache por arquivo. */
const colorCache = new Map();
export function probeColor(path) {
  if (!colorCache.has(path)) {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v',
      '-show_entries', 'stream=pix_fmt,color_space', '-of', 'json', path], { windowsHide: true }).toString();
    const st = JSON.parse(out).streams[0];
    colorCache.set(path, { pixFmt: st.pix_fmt, colorSpace: st.color_space });
  }
  return colorCache.get(path);
}

/** Opções de `scale` p/ ler um vídeo em RGB com a matriz de cor certa. */
export function scaleArgs(info, w, h) {
  const yuvUntagged = /^yuv/.test(info.pixFmt ?? '') && (!info.colorSpace || info.colorSpace === 'unknown');
  return `scale=${w}:${h}:flags=area${yuvUntagged ? ':in_color_matrix=bt709:in_range=tv' : ''}`;
}

export class FrameReader {
  /** @param {string} path @param {number} w @param {number} h */
  constructor(path, w, h) {
    this.size = w * h * 3;
    this.w = w; this.h = h;
    this.proc = spawn('ffmpeg', ['-v', 'error', '-i', path, '-vf', scaleArgs(probeColor(path), w, h),
      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    this.chunks = [];
    this.buffered = 0;
    this.ended = false;
    this.waiter = null;
    this.proc.stdout.on('data', (c) => {
      this.chunks.push(c); this.buffered += c.length;
      if (this.buffered > this.size * 8) this.proc.stdout.pause();
      this.wake();
    });
    this.proc.stdout.on('end', () => { this.ended = true; this.wake(); });
  }
  wake() { const w = this.waiter; this.waiter = null; if (w) w(); }
  /** Próximo quadro (Buffer rgb24) ou null no fim. */
  async next() {
    while (this.buffered < this.size && !this.ended) {
      this.proc.stdout.resume();
      await new Promise((r) => { this.waiter = r; });
    }
    if (this.buffered < this.size) return null;
    const out = Buffer.allocUnsafe(this.size);
    let off = 0;
    while (off < this.size) {
      const c = this.chunks[0];
      const take = Math.min(c.length, this.size - off);
      c.copy(out, off, 0, take);
      off += take;
      if (take === c.length) this.chunks.shift();
      else this.chunks[0] = c.subarray(take);
    }
    this.buffered -= this.size;
    if (this.buffered < this.size * 4) this.proc.stdout.resume();
    return out;
  }
  close() { try { this.proc.kill(); } catch { /* já saiu */ } }
}
