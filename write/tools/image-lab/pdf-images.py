"""Extrai as imagens (e mascaras suaves) de um PDF do Word como PNG: <saida>-<n>.png
  python tools/image-lab/pdf-images.py <pdf> <prefixo_saida>
"""
import re
import sys
import zlib

import numpy as np
from PIL import Image

b = open(sys.argv[1], 'rb').read()
out = sys.argv[2]
objs = {}
for m in re.finditer(rb'(\d+) 0 obj\s*(<<.*?>>)\s*stream\r?\n', b, re.S):
    num = int(m.group(1))
    d = m.group(2)
    ln = re.search(rb'/Length\s+(\d+)(\s+0\s+R)?', d)
    start = m.end()
    if ln and not ln.group(2):
        data = b[start:start + int(ln.group(1))]
    else:
        end = b.find(b'endstream', start)
        data = b[start:end].rstrip(b'\r\n')
    objs[num] = (d, data)
n = 0
for num, (d, data) in sorted(objs.items()):
    if b'/Subtype/Image' not in d.replace(b' ', b''):
        continue
    w = int(re.search(rb'/Width\s+(\d+)', d).group(1))
    h = int(re.search(rb'/Height\s+(\d+)', d).group(1))
    gray = b'DeviceGray' in d
    if b'FlateDecode' in d:
        raw = zlib.decompress(data)
        ch = 1 if gray else 3
        a = np.frombuffer(raw, np.uint8)[: w * h * ch].reshape(h, w, ch) if ch == 3 else np.frombuffer(raw, np.uint8)[: w * h].reshape(h, w)
        img = Image.fromarray(a)
    elif b'DCTDecode' in d:
        import io
        img = Image.open(io.BytesIO(data))
    else:
        continue
    sm = re.search(rb'/SMask\s+(\d+)', d)
    name = f'{out}-{num}{"-mask" if gray else ""}.png'
    img.save(name)
    print(num, w, h, 'gray' if gray else 'rgb', f'smask={sm.group(1).decode()}' if sm else '', name)
    n += 1
