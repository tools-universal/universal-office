"""Diferença entre dois relatórios do compare.py, documento a documento.

Uso: python -I report-diff.py <antes> <depois> [--pix 0.01] [--line 0.002] [--md saida.md]
     (<antes>/<depois>: nome em LAB_DIR/report sem .json, ex. ed-base-canvas, ou caminho)

Piorou: páginas que batiam e deixaram de bater; quebras idênticas que deixaram
de ser; line_match que caiu mais que --line; pix_f1 que caiu mais que --pix;
documento que abria e passou a falhar. Melhorou: o contrário. Saída no console
(e em Markdown com --md, fora do git: os nomes vêm do corpus).
"""
import json
import os
import sys

CORPUS_ROOT = os.environ.get('CORPUS_ROOT', 'E:/UniversalWriteTest')
LAB_DIR = os.environ.get('LAB_DIR', os.path.join(CORPUS_ROOT, '_lab'))


def load(name):
    p = name if os.path.exists(name) else os.path.join(LAB_DIR, 'report', f'{name}.json')
    with open(p, encoding='utf8') as f:
        return {r['id']: r for r in json.load(f)}


def ok(r):
    return r is not None and r.get('status') == 'ok' and 'line_match' in r


def verdict(a, b, pix_tol, line_tol):
    """(piorou, melhorou) — listas de motivos."""
    worse, better = [], []
    if ok(a) and not ok(b):
        return [f"falha: {(b or {}).get('status')} {str((b or {}).get('error') or '')[:80]}"], []
    if not ok(a) and ok(b):
        return [], ['passou a abrir']
    if not (ok(a) and ok(b)):
        return [], []
    pa, pb = a['pages_w'] == a['pages_o'], b['pages_w'] == b['pages_o']
    if pa and not pb:
        worse.append(f"páginas {b['pages_o']}≠{b['pages_w']}")
    elif pb and not pa:
        better.append('páginas')
    if a.get('breaks_ok') and not b.get('breaks_ok'):
        worse.append(f"quebras ({b.get('breaks_diff')} linhas)")
    elif b.get('breaks_ok') and not a.get('breaks_ok'):
        better.append('quebras')
    dl = b['line_match'] - a['line_match']
    if dl < -line_tol:
        worse.append(f"line_match {a['line_match']:.3f}→{b['line_match']:.3f}")
    elif dl > line_tol:
        better.append('line_match')
    dp = (b.get('pix_f1') or 0) - (a.get('pix_f1') or 0)
    if dp < -pix_tol:
        pages = [i + 1 for i, (x, y) in enumerate(zip(a.get('pix_pages', []), b.get('pix_pages', []))) if y < x - pix_tol]
        worse.append(f"pix_f1 {a.get('pix_f1'):.3f}→{b.get('pix_f1'):.3f}" + (f" (pág. {','.join(map(str, pages[:8]))})" if pages else ''))
    elif dp > pix_tol:
        better.append('pix_f1')
    return worse, better


def metas(rs):
    good = [r for r in rs.values() if ok(r)]
    n = len(good)
    pages = sum(1 for r in good if r['pages_w'] == r['pages_o'])
    brk = sum(1 for r in good if r.get('breaks_ok'))
    px = sum(1 for r in good if (r.get('pix_f1') or 0) >= 0.95)
    return f'ok {n}/{len(rs)} | páginas {pages} | quebras {brk} | pix≥0,95 {px}'


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    args = sys.argv[1:]

    def opt(n, d=None):
        return args[args.index(f'--{n}') + 1] if f'--{n}' in args else d

    a_name, b_name = args[0], args[1]
    A, B = load(a_name), load(b_name)
    pix_tol, line_tol = float(opt('pix', '0.01')), float(opt('line', '0.002'))
    worse, better = [], 0
    for i in sorted(set(A) | set(B)):
        w, bt = verdict(A.get(i), B.get(i), pix_tol, line_tol)
        if w:
            r = B.get(i) or A.get(i)
            worse.append((i, r.get('rel', ''), w))
        elif bt:
            better += 1
    lines = [f'{a_name}: {metas(A)}', f'{b_name}: {metas(B)}',
             f'piorou: {len(worse)} documento(s); melhorou (sem piorar nada): {better}', '']
    for i, rel, w in worse:
        lines.append(f'- {i} — {"; ".join(w)} — {rel}')
    print('\n'.join(lines))
    md = opt('md')
    if md:
        with open(md, 'w', encoding='utf8', newline='\n') as f:
            f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
