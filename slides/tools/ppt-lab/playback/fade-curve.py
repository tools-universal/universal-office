# Curva de MISTURA de transições de esmaecer: para cada quadro da transição,
# a fração α em que o quadro está do slide antigo (0) ao novo (1) — projeção
# do pixel no segmento antigo→novo, média dos pixels que mudam. Compara o
# PowerPoint com o nosso (mesmo índice de quadro) e com os modelos linear e
# cosseno ((1 − cos πt)/2).
#
# Uso: python tools/ppt-lab/playback/fade-curve.py <deck> <pos1,pos2,…> [--ext ppt]
import subprocess, json, sys, math
import numpy as np

deck = sys.argv[1]
only = [int(x) for x in sys.argv[2].split(',')]
ext = sys.argv[sys.argv.index('--ext') + 1] if '--ext' in sys.argv else 'pptx'
base = f'D:/Projects/OfficeNext/slides/tools/ppt-lab/results/playback/{deck}/{ext}/'
tl = json.load(open(base + 'ours-timeline.json', encoding='utf8'))
W, H = 160, 90
step = 33

def frames(path, yuv):
    # o MP4 do app tem buracos de carimbo: `fps` repete o anterior (índice = tempo/passo)
    vf = (f'fps=1000/{step},' if yuv else '') + f'scale={W}:{H}:flags=area' + (':in_color_matrix=bt709:in_range=tv' if yuv else '')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    d = p.stdout.read(); n = len(d) // (W * H * 3)
    return np.frombuffer(d, np.uint8)[:n * W * H * 3].reshape(n, H, W, 3).astype(np.float32)

A = frames(base + 'ppt.mp4', True)
B = frames(base + 'ours.mkv', False)

def alpha(F, k, old, new, mask):
    d = (new - old)[mask]
    f = (F[min(k, len(F) - 1)] - old)[mask]
    den = (d * d).sum()
    return float((f * d).sum() / den) if den else 1.0

for pos in only:
    s = tl['slides'][pos - 1]
    k0 = round(s['startMs'] / step)
    n = round(s['transitionMs'] / step)
    # antigo = quadro antes da transição; novo = alguns quadros depois do fim, nos DOIS vídeos
    ease = lambda x: 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, x)))
    for name, F in (('ppt', A), ('nosso', B)):
        old = F[max(0, k0 - 1)]; new = F[min(len(F) - 1, k0 + n + 3)]
        mask = np.abs(old - new).sum(axis=2) > 30
        ks = list(range(k0 - 1, k0 + n + 3))
        al = [alpha(F, k, old, new, mask) for k in ks]
        # atraso d (quadros) que melhor ajusta α(k0 + j) = cos((j − d)/n)
        fit = min((sum((a - ease((k - k0 - d) / n)) ** 2 for a, k in zip(al[1:], ks[1:])), d)
                  for d in [x / 10 for x in range(-40, 41)])
        print(f'slide {pos} {name:5s}', ' '.join(f'{x:5.2f}' for x in al), f'| atraso {fit[1]:+.1f} q (resíduo {fit[0]:.4f})')
    print(f'slide {pos} cos  ', ' '.join(f'{ease((k - k0) / n):5.2f}' for k in range(k0 - 1, k0 + n + 3)))
