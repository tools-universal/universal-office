"""Exporta, de cada PDF do Word, a camada do efeito (máscara suave) e as caixas
para fx-compare.mjs comparar com o nosso desenho: .out/fx/<nome>.json + .png.

  python tools/image-lab/fx-compare.py <nome> [<nome>...]
"""
import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('fx', os.path.join(HERE, 'fx-fit.py'))
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)
os.makedirs(os.path.join(HERE, '.out', 'fx'), exist_ok=True)
for name in sys.argv[1:]:
    p = os.path.join(HERE, '.out', f'{name}.pdf')
    ims = fx.images(p)
    bx = fx.boxes(p)
    pic = next((b for b in bx if b['w'] == 480 and b['h'] == 360), None)
    layers = []
    for num, v in ims.items():
        if v['gray'] or not v['smask']:
            continue
        lb = next(b for b in bx if b['w'] == v['w'] and b['h'] == v['h'])
        m = ims[v['smask']]['px']
        f = os.path.join(HERE, '.out', 'fx', f'{name}-{num}.png')
        Image.fromarray(m.astype(np.uint8)).save(f)
        layers.append(dict(png=f, box=[lb['l'], lb['H'] - lb['t'], lb['r'], lb['H'] - lb['b']], px=[v['w'], v['h']]))
    out = dict(pic=[pic['l'], pic['H'] - pic['t'], pic['r'], pic['H'] - pic['b']] if pic else None, layers=layers)
    json.dump(out, open(os.path.join(HERE, '.out', 'fx', f'{name}.json'), 'w'))
    print(name, len(layers), 'camada(s)')
