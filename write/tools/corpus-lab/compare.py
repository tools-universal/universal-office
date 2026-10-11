"""Compara a saída do Universal Write com o PDF do Word, documento a documento.

Fontes de comparação (por documento, em LAB_DIR):
  word/<id>/text.json, word/<id>/p<N>.png     — extraídos do PDF do Word (cache)
  <tag>/<id>/canvas-p<N>.png                   — canvas do <universal-write> (run-ours)
  <tag>/<id>/js.pdf                            — exportPdf() JS (run-ours)
  <tag>/<id>/net.pdf                           — DocxPdf .NET (run-net)

Métricas:
  pages_w / pages_o       nº de páginas
  line_match              fração das linhas do Word cujo texto (sem brancos)
                          aparece como UMA linha nossa (alinhamento difflib) —
                          mede quebras de linha iguais
  same_page               dos pares casados, fração na mesma página
  dy_med / dy_p90         |Δbaseline| (pt) dos pares na mesma página
  dx_med / dx_p90         |Δx inicial| (pt)
  coverage                fração dos caracteres do Word presentes no nosso
  pix_f1                  sobreposição de tinta (96 dpi, tolerância 1 px)
  first_div               primeira linha do Word sem par (página, texto curto)

Uso: python -I compare.py <tag> [--source canvas|js|net] [--only id,id] [--workers 8]
Saída: LAB_DIR/report/<tag>-<source>.json (+ .csv)
"""
import csv
import difflib
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pdftext  # noqa: E402

CORPUS_ROOT = os.environ.get('CORPUS_ROOT', 'E:/UniversalWriteTest')
LAB_DIR = os.environ.get('LAB_DIR', os.path.join(CORPUS_ROOT, '_lab'))
DPI = 96


def load_manifest():
    with open(os.path.join(LAB_DIR, 'manifest.json'), encoding='utf8') as f:
        return json.load(f)


# ───────────────────────── extração com cache ─────────────────────────

def word_data(doc):
    """text.json + PNGs do PDF do Word (cache em LAB_DIR/word/<id>/)."""
    d = os.path.join(LAB_DIR, 'word', doc['id'])
    tj = os.path.join(d, 'text.json')
    if not os.path.exists(tj):
        os.makedirs(d, exist_ok=True)
        data = pdftext.extract(doc['pdf'])
        for i, arr in enumerate(pdftext.render(doc['pdf'], DPI)):
            Image.fromarray(arr).save(os.path.join(d, f'p{i + 1}.png'), optimize=False, compress_level=3)
        with open(tj, 'w', encoding='utf8', newline='\n') as f:
            json.dump(data, f, ensure_ascii=False)
        return data
    with open(tj, encoding='utf8') as f:
        return json.load(f)


def pdf_data(pdf_path):
    cache = pdf_path + '.text.json'
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(pdf_path):
        with open(cache, encoding='utf8') as f:
            return json.load(f)
    data = pdftext.extract(pdf_path)
    with open(cache, 'w', encoding='utf8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False)
    return data


def pdf_pages_png(pdf_path):
    """Raster do nosso PDF a 96 dpi (cache <pdf>.p<N>.png)."""
    out = []
    first = pdf_path + '.p1.png'
    if os.path.exists(first) and os.path.getmtime(first) >= os.path.getmtime(pdf_path):
        i = 1
        while os.path.exists(f'{pdf_path}.p{i}.png'):
            out.append(f'{pdf_path}.p{i}.png')
            i += 1
        return out
    for i, arr in enumerate(pdftext.render(pdf_path, DPI)):
        p = f'{pdf_path}.p{i + 1}.png'
        Image.fromarray(arr).save(p, compress_level=3)
        out.append(p)
    return out


# ───────────────────────── métricas ─────────────────────────

def flat_lines(data):
    out = []
    for pi, p in enumerate(data['pages']):
        for ln in p['lines']:
            out.append((pi, ln))
    return out


def compare_text(w, o):
    wl, ol = flat_lines(w), flat_lines(o)
    wt = [ln['text'] for _, ln in wl]
    ot = [ln['text'] for _, ln in ol]
    res = {'pages_w': len(w['pages']), 'pages_o': len(o['pages']), 'lines_w': len(wl), 'lines_o': len(ol)}
    if not wl:
        res.update(line_match=1.0 if not ol else 0.0, same_page=1.0, coverage=1.0)
        return res
    sm = difflib.SequenceMatcher(None, wt, ot, autojunk=False)
    pairs = []
    matched_w = set()
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            pairs.append((a + k, b + k))
            matched_w.add(a + k)
    res['line_match'] = round(len(pairs) / len(wl), 4)
    same = [(wi, oi) for wi, oi in pairs if wl[wi][0] == ol[oi][0]]
    res['same_page'] = round(len(same) / len(pairs), 4) if pairs else 0.0
    if same:
        dy = np.array([abs(ol[oi][1]['y'] - wl[wi][1]['y']) for wi, oi in same])
        dx = np.array([abs(ol[oi][1]['x0'] - wl[wi][1]['x0']) for wi, oi in same])
        res['dy_med'] = round(float(np.median(dy)), 2)
        res['dy_p90'] = round(float(np.percentile(dy, 90)), 2)
        res['dx_med'] = round(float(np.median(dx)), 2)
        res['dx_p90'] = round(float(np.percentile(dx, 90)), 2)
    cw, co = Counter(''.join(wt)), Counter(''.join(ot))
    tot = sum(cw.values())
    res['coverage'] = round(sum(min(v, co[k]) for k, v in cw.items()) / tot, 4) if tot else 1.0
    res['extra'] = round(sum(max(0, v - cw[k]) for k, v in co.items()) / max(1, tot), 4)
    for wi in range(len(wl)):
        if wi not in matched_w:
            pi, ln = wl[wi]
            res['first_div'] = {'page': pi + 1, 'line': wi, 'y': ln['y'], 'w': ln['text'][:40]}
            break
    return res


def ink(arr, thr=160):
    return arr < thr


def dilate(m):
    out = m.copy()
    out[1:, :] |= m[:-1, :]
    out[:-1, :] |= m[1:, :]
    out[:, 1:] |= m[:, :-1]
    out[:, :-1] |= m[:, 1:]
    out[1:, 1:] |= m[:-1, :-1]
    out[:-1, :-1] |= m[1:, 1:]
    out[1:, :-1] |= m[:-1, 1:]
    out[:-1, 1:] |= m[1:, :-1]
    return out


def page_f1(wpath, opath):
    a = np.array(Image.open(wpath).convert('L'))
    b = np.array(Image.open(opath).convert('L'))
    h, w = min(a.shape[0], b.shape[0]), min(a.shape[1], b.shape[1])
    size_ok = abs(a.shape[0] - b.shape[0]) <= 2 and abs(a.shape[1] - b.shape[1]) <= 2
    ia, ib = ink(a[:h, :w]), ink(b[:h, :w])
    na, nb = int(ia.sum()), int(ib.sum())
    if na == 0 and nb == 0:
        return 1.0, size_ok
    if na == 0 or nb == 0:
        return 0.0, size_ok
    rec = float((ia & dilate(ib)).sum()) / na
    prec = float((ib & dilate(ia)).sum()) / nb
    f1 = 0.0 if rec + prec == 0 else 2 * rec * prec / (rec + prec)
    return f1, size_ok


def compare_pixels(wpngs, opngs):
    n = max(len(wpngs), len(opngs))
    if n == 0:
        return {'pix_f1': 1.0}
    scores, size_bad = [], 0
    for i in range(n):
        if i < len(wpngs) and i < len(opngs):
            f1, ok = page_f1(wpngs[i], opngs[i])
            scores.append(f1)
            size_bad += 0 if ok else 1
        else:
            scores.append(0.0)
    return {'pix_f1': round(float(np.mean(scores)), 4), 'pix_pages': [round(s, 3) for s in scores[:60]], 'size_mismatch': size_bad}


def word_pngs(doc):
    d = os.path.join(LAB_DIR, 'word', doc['id'])
    out, i = [], 1
    while os.path.exists(os.path.join(d, f'p{i}.png')):
        out.append(os.path.join(d, f'p{i}.png'))
        i += 1
    return out


def compare_doc(args):
    doc, tag, source = args
    res = {'id': doc['id'], 'rel': doc['rel'], 'container': doc['container']}
    try:
        w = word_data(doc)
        odir = os.path.join(LAB_DIR, tag, doc['id'])
        info_p = os.path.join(odir, 'info.json')
        info = {}
        if os.path.exists(info_p):
            with open(info_p, encoding='utf8') as f:
                info = json.load(f)
        res['status'] = info.get('status', 'missing')
        if source == 'net':
            res['status'] = 'ok' if os.path.exists(os.path.join(odir, 'net.pdf')) else (info.get('netStatus') or 'missing')
        if res['status'] != 'ok':
            res['error'] = info.get('error') or info.get('netError')
            res['pages_w'] = len(w['pages'])
            return res
        res['fonts'] = info.get('fonts')
        pdf = os.path.join(odir, 'net.pdf' if source == 'net' else 'js.pdf')
        if os.path.exists(pdf):
            res.update(compare_text(w, pdf_data(pdf)))
        else:
            res['pdf_missing'] = True
        if source == 'canvas':
            o = []
            i = 1
            while os.path.exists(os.path.join(odir, f'canvas-p{i}.png')):
                o.append(os.path.join(odir, f'canvas-p{i}.png'))
                i += 1
        else:
            o = pdf_pages_png(pdf) if os.path.exists(pdf) else []
        res.update(compare_pixels(word_pngs(doc), o))
    except Exception as e:  # noqa: BLE001
        res['status'] = 'compare-error'
        res['error'] = repr(e)[:300]
    return res


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    args = sys.argv[1:]
    tag = args[0]

    def opt(n, d=None):
        return args[args.index(f'--{n}') + 1] if f'--{n}' in args else d

    source = opt('source', 'canvas')
    workers = int(opt('workers', '8'))
    docs = load_manifest()
    only = opt('only')
    if only:
        s = set(only.split(','))
        docs = [d for d in docs if d['id'] in s]
    if opt('tenant'):
        docs = [d for d in docs if d['tenant'] == opt('tenant')]
    with Pool(workers) as pool:
        results = []
        for i, r in enumerate(pool.imap_unordered(compare_doc, [(d, tag, source) for d in docs], chunksize=2)):
            results.append(r)
            if (i + 1) % 50 == 0:
                print(f'{i + 1}/{len(docs)}', flush=True)
    os.makedirs(os.path.join(LAB_DIR, 'report'), exist_ok=True)
    base = os.path.join(LAB_DIR, 'report', f'{tag}-{source}')
    if (only or opt('tenant')) and os.path.exists(base + '.json'):
        # rodada parcial: atualiza as entradas no relatório completo
        with open(base + '.json', encoding='utf8') as f:
            prev = {r['id']: r for r in json.load(f)}
        for r in results:
            prev[r['id']] = r
        partial = results
        results = list(prev.values())
        summarize(partial)
    results.sort(key=lambda r: r['id'])
    with open(base + '.json', 'w', encoding='utf8') as f:
        json.dump(results, f, ensure_ascii=False, indent=0)
    cols = ['id', 'status', 'pages_w', 'pages_o', 'line_match', 'same_page', 'dy_med', 'dy_p90', 'dx_med', 'dx_p90', 'coverage', 'extra', 'pix_f1', 'rel']
    with open(base + '.csv', 'w', encoding='utf8', newline='') as f:
        wr = csv.writer(f)
        wr.writerow(cols)
        for r in results:
            wr.writerow([r.get(c, '') for c in cols])
    summarize(results)
    print('relatório:', base + '.json')


def summarize(results):
    ok = [r for r in results if r.get('status') == 'ok' and 'line_match' in r]
    st = Counter(r.get('status') for r in results)
    print('status:', dict(st))
    if not ok:
        return

    def m(k):
        v = [r[k] for r in ok if k in r]
        return f'média {np.mean(v):.3f} mediana {np.median(v):.3f}' if v else '-'
    pages_eq = sum(1 for r in ok if r['pages_w'] == r['pages_o'])
    print(f'páginas iguais: {pages_eq}/{len(ok)}')
    for k in ('line_match', 'same_page', 'coverage', 'pix_f1', 'dy_med', 'dx_med'):
        print(f'  {k:11s} {m(k)}')
    print(f"  line_match ≥0.99: {sum(1 for r in ok if r['line_match'] >= 0.99)}  ≥0.9: {sum(1 for r in ok if r['line_match'] >= 0.9)}")


if __name__ == '__main__':
    main()
