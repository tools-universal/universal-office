# Fase real do início de cada slide no PowerPoint, medida pelo ESMAECER de
# entrada (curva cosseno conhecida, resíduo ~0): atraso (quadros) do app em
# relação à NOSSA linha do tempo e o incremento por slide (= quanto o slide
# anterior durou a mais no app). Só slides com `fade` simples.
#
# Uso: python tools/ppt-lab/playback/slide-phase.py <deck>[,<deck>…] [--ext ppt]
import subprocess, json, sys, math
import numpy as np

decks = sys.argv[1].split(',')
ext = sys.argv[sys.argv.index('--ext') + 1] if '--ext' in sys.argv else 'pptx'
W, H = 160, 90
step = 33
ease = lambda x: 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, x)))

def frames(path, yuv):
    vf = (f'fps=1000/{step},' if yuv else '') + f'scale={W}:{H}:flags=area' + (':in_color_matrix=bt709:in_range=tv' if yuv else '')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    d = p.stdout.read(); n = len(d) // (W * H * 3)
    return np.frombuffer(d, np.uint8)[:n * W * H * 3].reshape(n, H, W, 3).astype(np.float32)

def alpha(F, k, old, new, mask):
    d = (new - old)[mask]
    f = (F[min(k, len(F) - 1)] - old)[mask]
    den = (d * d).sum()
    return float((f * d).sum() / den) if den else 1.0

for deck in decks:
    base = f'D:/Projects/OfficeNext/slides/tools/ppt-lab/results/playback/{deck}/{ext}/'
    tl = json.load(open(base + 'ours-timeline.json', encoding='utf8'))
    A = frames(base + 'ppt.mp4', True)
    prev = None
    print(f'== {deck} ({ext})')
    for i, s in enumerate(tl['slides']):
        tr = s.get('transition') or {}
        if tr.get('type') != 'fade' or (tr.get('attrs') or {}).get('thruBlk') or s['transitionMs'] <= 0:
            prev = None
            continue
        k0 = round(s['startMs'] / step); n = round(s['transitionMs'] / step)
        if k0 < 1:
            continue
        old = A[k0 - 1]; new = A[min(len(A) - 1, k0 + n + 6)]
        mask = np.abs(old - new).sum(axis=2) > 30
        if mask.sum() < 50:
            prev = None
            continue
        ks = list(range(k0, k0 + n + 6))
        al = [alpha(A, k, old, new, mask) for k in ks]
        res, d = min((sum((a - ease((k - k0 - d) / n)) ** 2 for a, k in zip(al, ks)), d) for d in [x / 10 for x in range(-30, 61)])
        inc = '' if prev is None else f'  Δ {d - prev:+.1f}'
        print(f'  slide {i + 1:2d} início {k0:5d}  atraso {d:+.1f} q  (resíduo {res:.4f}){inc}')
        prev = d
