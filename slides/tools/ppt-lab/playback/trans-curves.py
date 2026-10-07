# Curvas de transição: para cada slide do deck, a fração dos pixels do quadro
# que já está mais perto do slide NOVO do que do ANTIGO, quadro a quadro, no
# vídeo do PowerPoint e no nosso (alinhados por índice). Mostra onde a
# transição adianta/atrasa/difere em forma.
#
# Uso: python tools/ppt-lab/playback/trans-curves.py <deck> [pos1,pos2,…]
import subprocess, json, sys
import numpy as np

deck = sys.argv[1]
only = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
base = f'D:/Projects/OfficeNext/slides/tools/ppt-lab/results/playback/{deck}/pptx/'
tl = json.load(open(base + 'ours-timeline.json', encoding='utf8'))
W, H = 160, 90
step = 33  # passo inteiro do export (1000/33 fps) — o mesmo da captura nossa

def frames(path, yuv):
    vf = f'scale={W}:{H}:flags=area' + (':in_color_matrix=bt709:in_range=tv' if yuv else '')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    d = p.stdout.read(); n = len(d) // (W * H * 3)
    return np.frombuffer(d, np.uint8)[:n * W * H * 3].reshape(n, H, W, 3).astype(np.int16)

A = frames(base + 'ppt.mp4', True)
B = frames(base + 'ours.mkv', False)

def curve(F, k0, k1):
    old = F[max(0, k0 - 1)]; new = F[min(len(F) - 1, k1 + 1)]
    diff = np.abs(old - new).sum(axis=2) > 30  # só pixels que MUDAM
    out = []
    for k in range(k0, k1 + 1):
        f = F[min(k, len(F) - 1)]
        dn = np.abs(f - new).sum(axis=2); do = np.abs(f - old).sum(axis=2)
        m = diff.sum()
        out.append(((dn < do) & diff).sum() / m if m else 1.0)
    return out

for i, s in enumerate(tl['slides']):
    pos = i + 1
    if only and pos not in only: continue
    if s['transitionMs'] <= 0: continue
    k0 = round(s['startMs'] / step); k1 = round((s['startMs'] + s['transitionMs']) / step)
    a = curve(A, k0, k1); b = curve(B, k0, k1)
    tr = s['transition']
    name = f"{tr['type']} {json.dumps(tr['attrs'])}"
    rms = float(np.sqrt(np.mean((np.array(a) - np.array(b)) ** 2)))
    print(f'#{pos:2d} {name:40s} rms {rms:.3f}')
    print('   ppt ', ' '.join(f'{v:.2f}' for v in a))
    print('   ours', ' '.join(f'{v:.2f}' for v in b))
