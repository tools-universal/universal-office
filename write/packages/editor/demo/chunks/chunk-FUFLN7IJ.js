import {
  __export
} from "./chunk-WSFCRVEQ.js";

// ../../node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i2 = 0; i2 < d.length; ++i2) {
    if (d[i2])
      t.push({ s: i2, f: d[i2] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i22].f ? i0++ : i22++];
    r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i2 = 1; i2 < s; ++i2) {
    if (t2[i2].s > maxSym)
      maxSym = t2[i2].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i2 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i2 < s; ++i2) {
      var i2_1 = t2[i2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i2].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i2;
    }
    for (; i2 >= 0 && dt; --i2) {
      var i2_3 = t2[i2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i2 = 1; i2 <= s; ++i2) {
    if (c[i2] == cln && i2 != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i2];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0; i2 < cl.length; ++i2)
    l += cf[i2] * cl[i2];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0; i2 < s; ++i2)
    out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0; i2 < lclt.length; ++i2)
    ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0; i2 < lcdt.length; ++i2)
    ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0; i2 < nlcc; ++i2)
      wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0; i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i2 = 0; i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin2 = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin2] + fdeb[din];
          ++lf[257 + lin2];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i2 = 0; i2 < 256; ++i2) {
    var c = i2, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i2] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i2 = 0; i2 < d.length; ++i2)
        cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var adler = function() {
  var a = 1, b = 0;
  return {
    p: function(d) {
      var n = a, m = b;
      var l = d.length | 0;
      for (var i2 = 0; i2 != l; ) {
        var e = Math.min(i2 + 2655, l);
        for (; i2 < e; ++i2)
          m += n += d[i2];
        n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
      }
      a = n, b = m;
    },
    d: function() {
      a %= 65521, b %= 65521;
      return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
var zlh = function(c, o) {
  var lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
  c[0] = 120, c[1] = fl2 << 6 | (o.dictionary && 32);
  c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
  if (o.dictionary) {
    var h = adler();
    h.p(o.dictionary);
    wbytes(c, 2, h.d());
  }
};
var zls = function(d, dict) {
  if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
    err(6, "invalid zlib data");
  if ((d[1] >> 5 & 1) == +!dict)
    err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
  return (d[1] >> 3 & 4) + 2;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
var Inflate = /* @__PURE__ */ (function() {
  function Inflate2(opts, cb) {
    if (typeof opts == "function")
      cb = opts, opts = {};
    this.ondata = cb;
    var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
    this.s = { i: 0, b: dict ? dict.length : 0 };
    this.o = new u8(32768);
    this.p = new u8(0);
    if (dict)
      this.o.set(dict);
  }
  Inflate2.prototype.e = function(c) {
    if (!this.ondata)
      err(5);
    if (this.d)
      err(4);
    if (!this.p.length)
      this.p = c;
    else if (c.length) {
      var n = new u8(this.p.length + c.length);
      n.set(this.p), n.set(c, this.p.length), this.p = n;
    }
  };
  Inflate2.prototype.c = function(final) {
    this.s.i = +(this.d = final || false);
    var bts = this.s.b;
    var dt = inflt(this.p, this.s, this.o);
    this.ondata(slc(dt, bts, this.s.b), this.d);
    this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
    this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
  };
  Inflate2.prototype.push = function(chunk, final) {
    this.e(chunk), this.c(final);
  };
  return Inflate2;
})();
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a = adler();
  a.p(data);
  var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
var Unzlib = /* @__PURE__ */ (function() {
  function Unzlib2(opts, cb) {
    Inflate.call(this, opts, cb);
    this.v = opts && opts.dictionary ? 2 : 1;
  }
  Unzlib2.prototype.push = function(chunk, final) {
    Inflate.prototype.e.call(this, chunk);
    if (this.v) {
      if (this.p.length < 6 && !final)
        return;
      this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
    }
    if (final) {
      if (this.p.length < 4)
        err(6, "invalid zlib data");
      this.p = this.p.subarray(0, -4);
    }
    Inflate.prototype.c.call(this, final);
  };
  return Unzlib2;
})();
function unzlibSync(data, opts) {
  return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val3 = d[k], n = p + k, op = o;
    if (Array.isArray(val3))
      op = mrg(o, val3[1]), val3 = val3[0];
    if (ArrayBuffer.isView(val3))
      t[n] = [val3, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val3, n, t, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i2 = 0; i2 < str.length; ++i2)
      ar_1[i2] = str.charCodeAt(i2);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i2 = 0; i2 < l; ++i2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i2 << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i2);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i2 = 0; i2 < files.length; ++i2) {
    var f = files[i2];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// ../docx-core/src/package.ts
var DocxPackage = class _DocxPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  /** Pacote OPC mínimo para documentos novos (writeDocument completa o resto). */
  static empty() {
    const enc = new TextEncoder();
    const parts = /* @__PURE__ */ new Map();
    parts.set("[Content_Types].xml", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    ));
    parts.set("_rels/.rels", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    ));
    parts.set("word/document.xml", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'
    ));
    return new _DocxPackage(parts);
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo n\xE3o \xE9 um pacote OOXML v\xE1lido (ZIP corrompido ou formato legado .doc)");
    }
    const pkg = new _DocxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart("word/document.xml")) {
      throw new Error("Pacote sem word/document.xml \u2014 n\xE3o \xE9 um documento .docx v\xE1lido");
    }
    return pkg;
  }
  save() {
    const zippable = {};
    for (const [path, data] of this.parts) zippable[path] = data;
    return zipSync(zippable, { level: 6 });
  }
  partNames() {
    return [...this.parts.keys()];
  }
  getPart(path) {
    return this.parts.get(path);
  }
  getPartText(path) {
    const data = this.parts.get(path);
    return data === void 0 ? void 0 : new TextDecoder().decode(data);
  }
  setPart(path, data) {
    this.parts.set(path, data);
  }
  setPartText(path, text) {
    this.parts.set(path, new TextEncoder().encode(text));
  }
  removePart(path) {
    this.parts.delete(path);
  }
  /** Conteúdo principal (word/document.xml). */
  documentXml() {
    const xml = this.getPartText("word/document.xml");
    if (xml === void 0) throw new Error("Pacote sem word/document.xml");
    return xml;
  }
};

// ../docx-core/src/xml.ts
var RAW_CAPTURE = /* @__PURE__ */ new Set(["w:drawing"]);
var ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};
var CANONICAL_PREFIX = {
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main": "w",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships": "r",
  "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing": "wp",
  "http://schemas.openxmlformats.org/drawingml/2006/main": "a",
  "http://schemas.openxmlformats.org/drawingml/2006/picture": "pic",
  "http://schemas.openxmlformats.org/officeDocument/2006/math": "m",
  "http://schemas.openxmlformats.org/markup-compatibility/2006": "mc",
  "http://schemas.microsoft.com/office/word/2010/wordprocessingShape": "wps",
  "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup": "wpg",
  "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas": "wpc",
  "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing": "wp14",
  "http://schemas.microsoft.com/office/word/2010/wordml": "w14",
  "http://schemas.microsoft.com/office/word/2012/wordml": "w15",
  "urn:schemas-microsoft-com:vml": "v",
  "urn:schemas-microsoft-com:office:office": "o",
  "urn:schemas-microsoft-com:office:word": "w10"
};
var NO_RENAMES = /* @__PURE__ */ new Map();
function renamed(name, ren) {
  if (ren.size === 0) return name;
  const c = name.indexOf(":");
  if (c <= 0) return name;
  const to = ren.get(name.slice(0, c));
  return to === void 0 ? name : `${to}${name.slice(c)}`;
}
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e) => {
    if (e.startsWith("#x") || e.startsWith("#X")) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#")) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return (Object.hasOwn(ENTITIES, e) ? ENTITIES[e] : void 0) ?? `&${e};`;
  });
}
function parseXml(xml, opts = {}) {
  const pos = opts.positions === true;
  let i2 = 0;
  const n = xml.length;
  function error(msg) {
    throw new Error(`XML inv\xE1lido @${i2}: ${msg}`);
  }
  function skipMisc() {
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      if (xml.startsWith("<?", i2)) {
        i2 = xml.indexOf("?>", i2);
        if (i2 < 0) error("?> n\xE3o fechado");
        i2 += 2;
      } else if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2);
        if (i2 < 0) error("--> n\xE3o fechado");
        i2 += 3;
      } else if (xml.startsWith("<!", i2)) {
        i2 = xml.indexOf(">", i2);
        if (i2 < 0) error("<! n\xE3o fechado");
        i2 += 1;
      } else break;
    }
  }
  function parseElement(parentRen) {
    if (xml[i2] !== "<") error("esperava <");
    const elStart = i2;
    i2++;
    const nameStart = i2;
    while (i2 < n && !/[\s/>]/.test(xml[i2])) i2++;
    let name = xml.slice(nameStart, i2);
    let attrs3 = {};
    let ren = parentRen;
    let declares = false;
    const scope = () => {
      let own2 = null;
      for (const k in declares ? attrs3 : {}) {
        if (!k.startsWith("xmlns:")) continue;
        const pfx = k.slice(6);
        const uri = attrs3[k];
        const canon = Object.hasOwn(CANONICAL_PREFIX, uri) ? CANONICAL_PREFIX[uri] : void 0;
        if ((canon === void 0 || canon === pfx) && !ren.has(pfx)) continue;
        own2 ??= new Map(ren);
        if (canon === void 0 || canon === pfx) own2.delete(pfx);
        else own2.set(pfx, canon);
      }
      if (own2) ren = own2;
      if (ren.size === 0) return;
      name = renamed(name, ren);
      const out = {};
      for (const k in attrs3) out[k.startsWith("xmlns:") ? k : renamed(k, ren)] = attrs3[k];
      attrs3 = out;
    };
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      if (xml[i2] === "/") {
        if (xml[i2 + 1] !== ">") error("esperava />");
        i2 += 2;
        scope();
        const el3 = { name, attrs: attrs3, children: [] };
        if (RAW_CAPTURE.has(name)) el3.raw = xml.slice(elStart, i2);
        if (pos) {
          el3.s = elStart;
          el3.cs = i2;
          el3.ce = i2;
          el3.e = i2;
        }
        return el3;
      }
      if (xml[i2] === ">") {
        i2++;
        scope();
        break;
      }
      const aStart = i2;
      while (i2 < n && xml[i2] !== "=" && !/\s/.test(xml[i2])) i2++;
      const aName = xml.slice(aStart, i2);
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      if (xml[i2] !== "=") error(`atributo ${aName} sem =`);
      i2++;
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      const q = xml[i2];
      if (q !== '"' && q !== "'") error("valor de atributo sem aspas");
      i2++;
      const vStart = i2;
      i2 = xml.indexOf(q, i2);
      if (i2 < 0) error("aspas n\xE3o fechadas");
      attrs3[aName] = decodeEntities(xml.slice(vStart, i2));
      if (aName.startsWith("xmlns:")) declares = true;
      i2++;
    }
    const contentStart = i2;
    const children2 = [];
    for (; ; ) {
      if (i2 >= n) error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        const contentEnd = i2;
        const close = xml.indexOf(">", i2);
        i2 = close + 1;
        const el3 = { name, attrs: attrs3, children: children2 };
        if (RAW_CAPTURE.has(name)) el3.raw = xml.slice(elStart, i2);
        if (pos) {
          el3.s = elStart;
          el3.cs = contentStart;
          el3.ce = contentEnd;
          el3.e = i2;
        }
        return el3;
      }
      if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2) + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", i2)) {
        const end = xml.indexOf("]]>", i2);
        children2.push(xml.slice(i2 + 9, end));
        i2 = end + 3;
        continue;
      }
      if (xml[i2] === "<") {
        children2.push(parseElement(ren));
        continue;
      }
      const tStart = i2;
      while (i2 < n && xml[i2] !== "<") i2++;
      const text = decodeEntities(xml.slice(tStart, i2));
      if (text.length > 0) children2.push(text);
    }
  }
  skipMisc();
  const root = parseElement(NO_RENAMES);
  return root;
}
function childElements(el3, name) {
  return el3.children.filter(
    (c) => typeof c !== "string" && (name === void 0 || c.name === name)
  );
}
function firstChild(el3, name) {
  return childElements(el3, name)[0];
}
function textContent(el3) {
  let out = "";
  for (const c of el3.children) {
    out += typeof c === "string" ? c : textContent(c);
  }
  return out;
}

// ../docx-core/src/drawing.ts
function readShapeFx(eff) {
  const num2 = (v, d = 0) => {
    const n = parseInt(v ?? "", 10);
    return Number.isFinite(n) ? n : d;
  };
  const pt = (v) => num2(v) / 12700;
  const deg = (v) => num2(v) / 6e4;
  const fx = {};
  const glow = firstChild(eff, "a:glow");
  const gc = glow && srgbOf(glow);
  if (glow && gc) fx.glow = { radPt: pt(glow.attrs["rad"]), color: gc.hex, alpha: gc.alpha ?? 1 };
  const se = firstChild(eff, "a:softEdge");
  if (se && num2(se.attrs["rad"]) > 0) fx.softEdgePt = pt(se.attrs["rad"]);
  const inner = firstChild(eff, "a:innerShdw");
  const ic = inner && srgbOf(inner);
  if (inner && ic) fx.inner = { blurPt: pt(inner.attrs["blurRad"]), distPt: pt(inner.attrs["dist"]), dirDeg: deg(inner.attrs["dir"]), color: ic.hex, alpha: ic.alpha ?? 1 };
  const refl = firstChild(eff, "a:reflection");
  if (refl) {
    const a = refl.attrs;
    fx.reflection = {
      blurPt: pt(a["blurRad"]),
      stA: num2(a["stA"], 1e5) / 1e5,
      stPos: num2(a["stPos"], 0) / 1e5,
      endA: num2(a["endA"], 0) / 1e5,
      endPos: num2(a["endPos"], 1e5) / 1e5,
      distPt: pt(a["dist"]),
      dirDeg: deg(a["dir"]),
      sy: num2(a["sy"], 1e5) / 1e5,
      ...a["algn"] ? { algn: a["algn"] } : {},
      ...a["rotWithShape"] !== void 0 ? { rotWithShape: a["rotWithShape"] === "1" || a["rotWithShape"] === "true" } : {}
    };
  }
  const out = firstChild(eff, "a:outerShdw");
  const oc = out && srgbOf(out);
  if (out && oc) {
    const a = out.attrs;
    const sx = num2(a["sx"], 1e5), sy = num2(a["sy"], 1e5), kx = num2(a["kx"]), ky = num2(a["ky"]);
    if (sx !== 1e5 || sy !== 1e5 || kx || ky || Object.keys(fx).length) {
      fx.outer = {
        blurPt: pt(a["blurRad"]),
        distPt: pt(a["dist"]),
        dirDeg: deg(a["dir"]),
        color: oc.hex,
        alpha: oc.alpha ?? 1,
        ...sx !== 1e5 ? { sx: sx / 1e5 } : {},
        ...sy !== 1e5 ? { sy: sy / 1e5 } : {},
        ...kx ? { kxDeg: kx / 6e4 } : {},
        ...ky ? { kyDeg: ky / 6e4 } : {},
        algn: a["algn"] ?? "b",
        rotWithShape: a["rotWithShape"] !== "0" && a["rotWithShape"] !== "false"
      };
    }
  }
  return Object.keys(fx).length ? fx : void 0;
}
var EMU_PER_TWIP_D = 635;
var emuTw = (v) => {
  if (v === void 0 || v === "") return void 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n / EMU_PER_TWIP_D : void 0;
};
function findDeep(el3, name) {
  for (const c of childElements(el3)) {
    if (c.name === name) return c;
    const f = findDeep(c, name);
    if (f) return f;
  }
  return void 0;
}
function textOf(el3) {
  let s = "";
  for (const c of el3.children) s += typeof c === "string" ? c : textOf(c);
  return s;
}
function readPos(el3, defFrom) {
  const pos = { relativeFrom: el3?.attrs["relativeFrom"] ?? defFrom };
  if (!el3) return pos;
  const align = firstChild(el3, "wp:align");
  if (align) pos.align = textOf(align).trim();
  const off = firstChild(el3, "wp:posOffset");
  if (off) pos.offset = (parseInt(textOf(off).trim(), 10) || 0) / EMU_PER_TWIP_D;
  const pct2 = firstChild(el3, "wp14:pctPosHOffset") ?? firstChild(el3, "wp14:pctPosVOffset");
  if (pct2) pos.pct = parseInt(textOf(pct2).trim(), 10) || 0;
  return pos;
}
function anchorChild(anchor, name) {
  const direct = firstChild(anchor, name);
  if (direct) return direct;
  for (const ac of childElements(anchor, "mc:AlternateContent")) {
    const choice = firstChild(ac, "mc:Choice");
    const el3 = (choice && firstChild(choice, name)) ?? (() => {
      const fb = firstChild(ac, "mc:Fallback");
      return fb && firstChild(fb, name);
    })();
    if (el3) return el3;
  }
  return void 0;
}
function readWpAnchor(anchor) {
  if (!anchor) return void 0;
  const a = anchor.attrs;
  let wrap = "none";
  let wrapText;
  let wrapBox;
  let wrapPoly;
  const polyBox = (w) => {
    const poly = firstChild(w, "wp:wrapPolygon");
    if (!poly) return void 0;
    const pts = childElements(poly).filter((e) => e.name === "wp:start" || e.name === "wp:lineTo").map((e) => [parseInt(e.attrs["x"] ?? "0", 10) || 0, parseInt(e.attrs["y"] ?? "0", 10) || 0]);
    if (pts.length < 3) return void 0;
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    let area = 0;
    for (let i2 = 0; i2 < pts.length; i2++) {
      const [ax, ay] = pts[i2], [bx, by] = pts[(i2 + 1) % pts.length];
      area += ax * by - bx * ay;
    }
    if (Math.abs(Math.abs(area) / 2 - (x1 - x0) * (y1 - y0)) > 1e-6 * 21600 * 21600) wrapPoly = pts.map(([x2, y]) => [x2 / 21600, y / 21600]);
    return { x0: x0 / 21600, y0: y0 / 21600, x1: x1 / 21600, y1: y1 / 21600 };
  };
  for (const c of childElements(anchor)) {
    switch (c.name) {
      case "wp:wrapNone":
        wrap = "none";
        break;
      case "wp:wrapSquare":
        wrap = "square";
        wrapText = c.attrs["wrapText"];
        break;
      case "wp:wrapTight":
        wrap = "tight";
        wrapText = c.attrs["wrapText"];
        wrapBox = polyBox(c);
        break;
      case "wp:wrapThrough":
        wrap = "through";
        wrapText = c.attrs["wrapText"];
        wrapBox = polyBox(c);
        break;
      case "wp:wrapTopAndBottom":
        wrap = "topAndBottom";
        break;
    }
  }
  const out = {
    wrap,
    posH: readPos(anchorChild(anchor, "wp:positionH"), "column"),
    posV: readPos(anchorChild(anchor, "wp:positionV"), "paragraph")
  };
  if (wrapText) out.wrapText = wrapText;
  if (wrapBox) out.wrapBox = wrapBox;
  if (wrapPoly && (wrap === "tight" || wrap === "through")) out.wrapPoly = wrapPoly;
  if (a["behindDoc"] === "1" || a["behindDoc"] === "true") out.behindDoc = true;
  for (const k of ["distT", "distB", "distL", "distR"]) {
    const v = emuTw(a[k]);
    if (v !== void 0) out[k] = v;
  }
  if (a["simplePos"] === "1" || a["simplePos"] === "true") {
    const sp = firstChild(anchor, "wp:simplePos");
    out.simplePos = { x: emuTw(sp?.attrs["x"]) ?? 0, y: emuTw(sp?.attrs["y"]) ?? 0 };
  }
  if (a["relativeHeight"]) out.relativeHeight = parseInt(a["relativeHeight"], 10) || 0;
  if (a["layoutInCell"] !== void 0) out.layoutInCell = a["layoutInCell"] === "1" || a["layoutInCell"] === "true";
  if (a["allowOverlap"] !== void 0) out.allowOverlap = a["allowOverlap"] === "1" || a["allowOverlap"] === "true";
  const ee = firstChild(anchor, "wp:effectExtent");
  if (ee) {
    out.effectExtent = {
      l: emuTw(ee.attrs["l"]) ?? 0,
      t: emuTw(ee.attrs["t"]) ?? 0,
      r: emuTw(ee.attrs["r"]) ?? 0,
      b: emuTw(ee.attrs["b"]) ?? 0
    };
  }
  return out;
}
var own = (rec, k) => rec && k !== void 0 && Object.hasOwn(rec, k) ? rec[k] : void 0;
function srgbOf(el3, theme) {
  if (!el3) return void 0;
  const c = firstChild(el3, "a:srgbClr") ?? firstChild(el3, "a:schemeClr") ?? firstChild(el3, "a:sysClr") ?? firstChild(el3, "a:prstClr");
  if (!c) return void 0;
  let hex2;
  if (c.name === "a:srgbClr") hex2 = c.attrs["val"];
  else if (c.name === "a:sysClr") hex2 = c.attrs["lastClr"] ?? (c.attrs["val"] === "window" ? "FFFFFF" : "000000");
  else if (c.name === "a:schemeClr") {
    const key = c.attrs["val"] ?? "";
    const map = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
    hex2 = own(theme, own(map, key) ?? key) ?? `@${key}`;
  } else if (c.name === "a:prstClr") {
    const named = { black: "000000", white: "FFFFFF", red: "FF0000", green: "00FF00", blue: "0000FF", yellow: "FFFF00", gray: "808080" };
    hex2 = own(named, c.attrs["val"] ?? "") ?? "000000";
  }
  if (!hex2) return void 0;
  const alphaEl = firstChild(c, "a:alpha");
  const out = { hex: hex2.startsWith("@") ? hex2 : hex2.toUpperCase() };
  if (alphaEl) out.alpha = (parseInt(alphaEl.attrs["val"] ?? "100000", 10) || 0) / 1e5;
  const mods = childElements(c).filter((m) => m.name !== "a:alpha").map((m) => `${m.name.slice(2)}=${m.attrs["val"]}`);
  if (mods.length) out.hex = `${out.hex}|${mods.join(",")}`;
  return out;
}
function readSpPr(spPr, styleEl) {
  const st = { geom: "rect" };
  if (!spPr) return st;
  const prstEl = firstChild(spPr, "a:prstGeom");
  const prst = prstEl?.attrs["prst"];
  if (prst) st.geom = prst;
  const av = prstEl && firstChild(prstEl, "a:avLst");
  for (const gd of av ? childElements(av, "a:gd") : []) {
    const m = /^val\s+(-?\d+)/.exec(gd.attrs["fmla"] ?? "");
    if (m && gd.attrs["name"]) (st.adj ??= {})[gd.attrs["name"]] = parseInt(m[1], 10);
  }
  const cg = !prst ? firstChild(spPr, "a:custGeom") : void 0;
  if (cg) {
    st.geom = "custom";
    const ext = firstChild(firstChild(spPr, "a:xfrm") ?? spPr, "a:ext");
    const paths = readCustGeom(cg, parseInt(ext?.attrs["cx"] ?? "0", 10) || 0, parseInt(ext?.attrs["cy"] ?? "0", 10) || 0);
    if (paths.length) st.cust = paths;
  }
  const xfrm = firstChild(spPr, "a:xfrm");
  if (xfrm) {
    const rot = parseInt(xfrm.attrs["rot"] ?? "0", 10);
    if (rot) st.rot = rot / 6e4;
    if (xfrm.attrs["flipH"] === "1") st.flipH = true;
    if (xfrm.attrs["flipV"] === "1") st.flipV = true;
  }
  if (firstChild(spPr, "a:noFill")) {
  } else if (firstChild(spPr, "a:solidFill")) {
    const c = srgbOf(firstChild(spPr, "a:solidFill"));
    if (c) {
      st.fill = c.hex;
      if (c.alpha !== void 0) st.fillAlpha = c.alpha;
    }
  } else if (firstChild(spPr, "a:gradFill")) {
    const gs = findDeep(firstChild(spPr, "a:gradFill"), "a:gsLst");
    const stops = gs ? childElements(gs, "a:gs") : [];
    const from = srgbOf(stops[0]);
    const to = srgbOf(stops[stops.length - 1]);
    const gf = firstChild(spPr, "a:gradFill");
    const lin2 = findDeep(gf, "a:lin");
    if (from && to) {
      st.gradient = { from: from.hex, to: to.hex, angleDeg: (parseInt(lin2?.attrs["ang"] ?? "0", 10) || 0) / 6e4 };
      const g = st.gradient;
      g.stops = stops.map((s) => ({ pos: (parseInt(s.attrs["pos"] ?? "0", 10) || 0) / 1e5, color: srgbOf(s)?.hex ?? "000000" })).sort((a, b) => a.pos - b.pos);
      if (lin2 && lin2.attrs["scaled"] !== void 0) g.scaled = lin2.attrs["scaled"] === "1" || lin2.attrs["scaled"] === "true";
      if (gf.attrs["rotWithShape"] !== void 0) g.rotWithShape = gf.attrs["rotWithShape"] === "1" || gf.attrs["rotWithShape"] === "true";
      const path = firstChild(gf, "a:path");
      if (path) {
        g.path = path.attrs["path"] ?? "circle";
        const ft = firstChild(path, "a:fillToRect");
        const f = (k) => (parseInt(ft?.attrs[k] ?? "0", 10) || 0) / 1e5;
        if (ft) g.fillTo = { l: f("l"), t: f("t"), r: f("r"), b: f("b") };
      }
      st.fill = from.hex;
    }
  } else if (firstChild(spPr, "a:pattFill")) {
    const pf = firstChild(spPr, "a:pattFill");
    const fg = srgbOf(firstChild(pf, "a:fgClr")), bg = srgbOf(firstChild(pf, "a:bgClr"));
    st.pattern = { prst: pf.attrs["prst"] ?? "pct5", fg: fg?.hex ?? "000000", bg: bg?.hex ?? "FFFFFF" };
    st.fill = st.pattern.bg;
  } else if (styleEl && !firstChild(spPr, "a:blipFill") && !firstChild(spPr, "a:grpFill")) {
    const fillRef = firstChild(styleEl, "a:fillRef");
    const idx = parseInt(fillRef?.attrs["idx"] ?? "0", 10) || 0;
    if (fillRef && idx !== 0) {
      const c = srgbOf(fillRef);
      if (c) {
        st.fill = c.hex;
        if (idx !== 1 && idx !== 1001) st.fillRef = { idx, color: c.hex };
      }
    }
  }
  const effRef = styleEl && !firstChild(spPr, "a:effectLst") ? firstChild(styleEl, "a:effectRef") : void 0;
  const effIdx = parseInt(effRef?.attrs["idx"] ?? "0", 10) || 0;
  if (effRef && effIdx > 0) {
    const c = srgbOf(effRef);
    if (c) st.effectRef = { idx: effIdx, color: c.hex };
  }
  const eff = firstChild(spPr, "a:effectLst");
  const shapeFx = eff ? readShapeFx(eff) : void 0;
  if (shapeFx) st.fx = shapeFx;
  const shd = eff && !shapeFx?.outer ? firstChild(eff, "a:outerShdw") : void 0;
  if (shd) {
    const c = srgbOf(shd);
    const dist = (parseInt(shd.attrs["dist"] ?? "0", 10) || 0) / EMU_PER_TWIP_D;
    const dir = (parseInt(shd.attrs["dir"] ?? "0", 10) || 0) / 6e4 * (Math.PI / 180);
    if (c) {
      st.shadow = { dx: dist * Math.cos(dir), dy: dist * Math.sin(dir), color: c.hex };
      if (c.alpha !== void 0) st.shadow.alpha = c.alpha;
      const blur = (parseInt(shd.attrs["blurRad"] ?? "0", 10) || 0) / EMU_PER_TWIP_D;
      if (blur) st.shadow.blur = blur;
    }
  }
  const ln2 = firstChild(spPr, "a:ln");
  const lnRef = styleEl && firstChild(styleEl, "a:lnRef");
  const refIdx = lnRef ? parseInt(lnRef.attrs["idx"] ?? "0", 10) || 0 : 0;
  if (ln2?.attrs["w"]) st.lineInset = { w: parseInt(ln2.attrs["w"], 10) / 12700 };
  else if (refIdx > 0) st.lineInset = { ref: refIdx };
  if (ln2 && firstChild(ln2, "a:noFill")) {
  } else if (ln2 && firstChild(ln2, "a:solidFill")) {
    const c = srgbOf(firstChild(ln2, "a:solidFill"));
    if (c) {
      st.line = { color: c.hex, widthPt: ln2.attrs["w"] ? parseInt(ln2.attrs["w"], 10) / 12700 : 0.75 };
      if (c.alpha !== void 0) st.line.alpha = c.alpha;
      const dash = firstChild(ln2, "a:prstDash")?.attrs["val"];
      if (dash && dash !== "solid") st.line.dash = dash;
    }
  } else if (lnRef && lnRef.attrs["idx"] !== "0") {
    const c = srgbOf(lnRef);
    if (c) st.line = { color: c.hex, widthPt: ln2?.attrs["w"] ? parseInt(ln2.attrs["w"], 10) / 12700 : 0.75, ...ln2?.attrs["w"] ? {} : { ref: refIdx } };
  }
  return st;
}
function vmlLenTwips(v) {
  if (!v) return void 0;
  const m = /^(-?[0-9.]+)\s*(pt|in|px|cm|mm|pc|em)?$/.exec(v.trim());
  if (!m) return void 0;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "pt":
      return n * 20;
    case "in":
      return n * 1440;
    case "cm":
      return n / 2.54 * 1440;
    case "mm":
      return n / 25.4 * 1440;
    case "pc":
      return n * 240;
    case "em":
      return n * 240;
    default:
      return n * 15;
  }
}
function parseVmlStyle(style) {
  const out = {};
  for (const decl of (style ?? "").split(";")) {
    const i2 = decl.indexOf(":");
    if (i2 < 0) continue;
    out[decl.slice(0, i2).trim().toLowerCase()] = decl.slice(i2 + 1).trim();
  }
  return out;
}
function vmlAnchor(style, wrapEl) {
  if (style["position"] !== "absolute") return void 0;
  const hRel = style["mso-position-horizontal-relative"] ?? "text";
  const vRel = style["mso-position-vertical-relative"] ?? "text";
  const relMap = {
    text: "column",
    page: "page",
    margin: "margin",
    char: "character",
    line: "line",
    "left-margin-area": "leftMargin",
    "right-margin-area": "rightMargin",
    "top-margin-area": "topMargin",
    "bottom-margin-area": "bottomMargin",
    "inner-margin-area": "insideMargin",
    "outer-margin-area": "outsideMargin"
  };
  const vRelMap = { ...relMap, text: "paragraph" };
  const posH = { relativeFrom: own(relMap, hRel) ?? "column" };
  const posV = { relativeFrom: own(vRelMap, vRel) ?? "paragraph" };
  const hAlign = style["mso-position-horizontal"];
  if (hAlign && hAlign !== "absolute") posH.align = hAlign;
  else posH.offset = (vmlLenTwips(style["margin-left"]) ?? 0) + (vmlLenTwips(style["left"]) ?? 0);
  const vAlign = style["mso-position-vertical"];
  if (vAlign && vAlign !== "absolute") posV.align = vAlign;
  else posV.offset = (vmlLenTwips(style["margin-top"]) ?? 0) + (vmlLenTwips(style["top"]) ?? 0);
  const z = parseInt(style["z-index"] ?? "0", 10) || 0;
  const wrapType = wrapEl?.attrs["type"];
  const anchor = {
    wrap: wrapType === "square" ? "square" : wrapType === "tight" ? "tight" : wrapType === "through" ? "through" : wrapType === "topAndBottom" ? "topAndBottom" : "none",
    posH,
    posV,
    relativeHeight: z
  };
  if (z < 0) anchor.behindDoc = true;
  for (const [k, css] of [["distL", "mso-wrap-distance-left"], ["distR", "mso-wrap-distance-right"], ["distT", "mso-wrap-distance-top"], ["distB", "mso-wrap-distance-bottom"]]) {
    const v = vmlLenTwips(style[css]);
    if (v !== void 0) anchor[k] = v;
  }
  return anchor;
}
var VML_COLORS = {
  black: "000000",
  white: "FFFFFF",
  red: "FF0000",
  green: "008000",
  blue: "0000FF",
  yellow: "FFFF00",
  gray: "808080",
  grey: "808080",
  silver: "C0C0C0",
  navy: "000080",
  maroon: "800000",
  teal: "008080",
  olive: "808000",
  purple: "800080",
  fuchsia: "FF00FF",
  aqua: "00FFFF",
  lime: "00FF00",
  window: "FFFFFF"
};
function vmlColor(v) {
  if (!v) return void 0;
  const s = v.trim().split(/\s+/)[0].toLowerCase();
  if (s.startsWith("#")) {
    const h = s.slice(1);
    if (h.length === 3) return h.split("").map((c) => c + c).join("").toUpperCase();
    if (h.length >= 6) return h.slice(0, 6).toUpperCase();
  }
  return own(VML_COLORS, s);
}
function vmlShapeStyle(el3, geom) {
  const st = { geom };
  const a = el3.attrs;
  const fillEl = firstChild(el3, "v:fill");
  const strokeEl = firstChild(el3, "v:stroke");
  const filled = a["filled"] ?? fillEl?.attrs["on"];
  if (filled !== "f" && filled !== "false") {
    const fc = vmlColor(fillEl?.attrs["color"] ?? a["fillcolor"]) ?? (a["fillcolor"] === void 0 && !fillEl ? "FFFFFF" : void 0);
    if (fc) st.fill = fc;
    const op = fillEl?.attrs["opacity"];
    if (op) st.fillAlpha = op.endsWith("f") ? parseInt(op, 10) / 65536 : parseFloat(op);
  }
  const stroked = a["stroked"] ?? strokeEl?.attrs["on"];
  if (stroked !== "f" && stroked !== "false") {
    const sc = vmlColor(strokeEl?.attrs["color"] ?? a["strokecolor"]) ?? "000000";
    const sw = a["strokeweight"] ?? strokeEl?.attrs["weight"];
    st.line = { color: sc, widthPt: sw ? (vmlLenTwips(sw.endsWith("t") || /[a-z]$/.test(sw) ? sw : `${sw}pt`) ?? 15) / 20 : 0.75 };
    const dash = strokeEl?.attrs["dashstyle"];
    if (dash && dash !== "solid") st.line.dash = dash;
  }
  const rot = parseFloat(parseVmlStyle(a["style"])["rotation"] ?? "0");
  if (rot) st.rot = rot;
  const flip = parseVmlStyle(a["style"])["flip"] ?? "";
  if (flip.includes("x")) st.flipH = true;
  if (flip.includes("y")) st.flipV = true;
  return st;
}
function readCustGeom(cg, cx, cy) {
  const w = cx || 1, h = cy || 1, ss = Math.min(w, h), ls = Math.max(w, h);
  const v = {
    w,
    h,
    l: 0,
    t: 0,
    r: w,
    b: h,
    hc: w / 2,
    vc: h / 2,
    ss,
    ls,
    cd2: 108e5,
    cd4: 54e5,
    cd8: 27e5,
    "3cd4": 162e5,
    "3cd8": 81e5,
    "5cd8": 135e5,
    "7cd8": 189e5
  };
  for (const k of [2, 3, 4, 5, 6, 8, 10, 12, 16, 32]) {
    v[`wd${k}`] = w / k;
    v[`hd${k}`] = h / k;
    v[`ssd${k}`] = ss / k;
  }
  const num2 = (s) => {
    if (s === void 0) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : own(v, s) ?? 0;
  };
  const rad = (a) => a / 6e4 * (Math.PI / 180);
  const evalGd = (f) => {
    const [op, ...a] = f.trim().split(/\s+/);
    const [x2 = 0, y = 0, z = 0] = a.map(num2);
    switch (op) {
      case "*/":
        return z ? x2 * y / z : 0;
      case "+-":
        return x2 + y - z;
      case "+/":
        return z ? (x2 + y) / z : 0;
      case "?:":
        return x2 > 0 ? y : z;
      case "abs":
        return Math.abs(x2);
      case "at2":
        return Math.atan2(y, x2) * 180 / Math.PI * 6e4;
      case "cat2":
        return x2 * Math.cos(Math.atan2(z, y));
      case "sat2":
        return x2 * Math.sin(Math.atan2(z, y));
      case "cos":
        return x2 * Math.cos(rad(y));
      case "sin":
        return x2 * Math.sin(rad(y));
      case "tan":
        return x2 * Math.tan(rad(y));
      case "max":
        return Math.max(x2, y);
      case "min":
        return Math.min(x2, y);
      case "mod":
        return Math.sqrt(x2 * x2 + y * y + z * z);
      case "pin":
        return y < x2 ? x2 : y > z ? z : y;
      case "sqrt":
        return Math.sqrt(Math.max(0, x2));
      case "val":
        return x2;
      default:
        return 0;
    }
  };
  for (const lst of ["a:avLst", "a:gdLst"]) {
    const el3 = firstChild(cg, lst);
    for (const gd of el3 ? childElements(el3, "a:gd") : []) {
      const name = gd.attrs["name"];
      if (name) v[name] = evalGd(gd.attrs["fmla"] ?? "val 0");
    }
  }
  const out = [];
  const pl = firstChild(cg, "a:pathLst");
  for (const p of pl ? childElements(pl, "a:path") : []) {
    const path = {
      w: num2(p.attrs["w"]) || w,
      h: num2(p.attrs["h"]) || h,
      fill: p.attrs["fill"] !== "none",
      stroke: p.attrs["stroke"] !== "0" && p.attrs["stroke"] !== "false",
      cmds: []
    };
    const pts = (el3) => childElements(el3, "a:pt").map((q) => [num2(q.attrs["x"]), num2(q.attrs["y"])]);
    for (const c of childElements(p)) {
      switch (c.name) {
        case "a:moveTo":
        case "a:lnTo": {
          const q = pts(c)[0];
          if (q) path.cmds.push({ op: c.name === "a:moveTo" ? "M" : "L", x: q[0], y: q[1] });
          break;
        }
        case "a:cubicBezTo":
          path.cmds.push({ op: "C", pts: pts(c) });
          break;
        case "a:quadBezTo":
          path.cmds.push({ op: "Q", pts: pts(c) });
          break;
        case "a:arcTo":
          path.cmds.push({ op: "A", wR: num2(c.attrs["wR"]), hR: num2(c.attrs["hR"]), st: num2(c.attrs["stAng"]) / 6e4, sw: num2(c.attrs["swAng"]) / 6e4 });
          break;
        case "a:close":
          path.cmds.push({ op: "Z" });
          break;
      }
    }
    if (path.cmds.length) out.push(path);
  }
  return out;
}

// ../docx-core/src/picture-xml.ts
var XmlPatch = class _XmlPatch {
  constructor(src) {
    this.src = src;
  }
  src;
  edits = [];
  /** fim da tag de abertura (posição logo depois do '>'). */
  static openEnd(el3) {
    return el3.cs ?? el3.e;
  }
  replace(el3, text) {
    this.edits.push({ s: el3.s, e: el3.e, text });
  }
  remove(el3) {
    this.replace(el3, "");
  }
  insertAt(at, text) {
    this.edits.push({ s: at, e: at, text });
  }
  /** troca a tag de abertura (atributos novos, valores escapados). */
  setAttrs(el3, set) {
    const end = _XmlPatch.openEnd(el3);
    const selfClose = el3.cs === el3.e;
    let tag = this.src.slice(el3.s, end);
    for (const [k, v] of Object.entries(set)) {
      const re = new RegExp(`\\s${k.replace(/[:.]/g, "\\$&")}="[^"]*"`);
      if (v === void 0) {
        tag = tag.replace(re, "");
        continue;
      }
      const a = ` ${k}="${escAttr(String(v))}"`;
      if (re.test(tag)) tag = tag.replace(re, () => a);
      else tag = tag.replace(selfClose ? /\s*\/>$/ : />$/, (m) => `${a}${m.trim() === "/>" ? "/>" : ">"}`);
    }
    this.edits.push({ s: el3.s, e: end, text: tag });
  }
  /** conteúdo inteiro de um elemento (vira <x ...>conteúdo</x>). */
  setContent(el3, inner) {
    if (el3.cs === el3.e) {
      const tag = this.src.slice(el3.s, el3.e).replace(/\s*\/>$/, ">");
      const name = /^<([^\s/>]+)/.exec(tag)[1];
      this.edits.push({ s: el3.s, e: el3.e, text: `${tag}${inner}</${name}>` });
    } else this.edits.push({ s: el3.cs, e: el3.ce, text: inner });
  }
  /** insere `xml` como filho de `parent` na posição da ordem do esquema. */
  insertChild(parent, name, xml, order2) {
    const rank = order2.indexOf(name);
    const kids = childElements(parent);
    const after = kids.filter((k) => order2.indexOf(k.name) >= 0 && order2.indexOf(k.name) <= rank).pop();
    if (after) {
      this.insertAt(after.e, xml);
      return;
    }
    if (parent.cs === parent.e) {
      this.setContent(parent, xml);
      return;
    }
    this.insertAt(parent.cs, xml);
  }
  /** troca (ou insere, ou remove com xml vazio) o filho `name` de `parent`. */
  putChild(parent, name, xml, order2) {
    const cur = firstChild(parent, name);
    if (cur) {
      this.replace(cur, xml);
      return;
    }
    if (xml) this.insertChild(parent, name, xml, order2);
  }
  apply() {
    const ed = [...this.edits].sort((a, b) => b.s - a.s || b.e - a.e);
    let out = this.src;
    for (const x2 of ed) out = out.slice(0, x2.s) + x2.text + out.slice(x2.e);
    return out;
  }
};
function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var ANCHOR_ORDER = ["wp:simplePos", "wp:positionH", "wp:positionV", "wp:extent", "wp:effectExtent", "wp:wrapNone", "wp:wrapSquare", "wp:wrapTight", "wp:wrapThrough", "wp:wrapTopAndBottom", "wp:docPr", "wp:cNvGraphicFramePr", "a:graphic", "wp14:sizeRelH", "wp14:sizeRelV"];
var INLINE_ORDER = ["wp:extent", "wp:effectExtent", "wp:docPr", "wp:cNvGraphicFramePr", "a:graphic"];
var SPPR_ORDER = ["a:xfrm", "a:custGeom", "a:prstGeom", "a:noFill", "a:solidFill", "a:gradFill", "a:blipFill", "a:pattFill", "a:grpFill", "a:ln", "a:effectLst", "a:effectDag", "a:scene3d", "a:sp3d", "a:extLst"];
var EFFECT_ORDER = ["a:blur", "a:fillOverlay", "a:glow", "a:innerShdw", "a:outerShdw", "a:prstShdw", "a:reflection", "a:softEdge"];
var BLIPFILL_ORDER = ["a:blip", "a:srcRect", "a:tile", "a:stretch"];
var WRAP_NAMES = ["wp:wrapNone", "wp:wrapSquare", "wp:wrapTight", "wp:wrapThrough", "wp:wrapTopAndBottom"];
var COLOR_NAMES = ["a:srgbClr", "a:schemeClr", "a:prstClr", "a:sysClr", "a:scrgbClr", "a:hslClr"];
function readDmlColor(parent) {
  if (!parent) return void 0;
  const c = childElements(parent).find((k) => COLOR_NAMES.includes(k.name));
  if (!c) return void 0;
  const kind = c.name.slice(2);
  if (kind !== "srgbClr" && kind !== "schemeClr" && kind !== "prstClr" && kind !== "sysClr") return { kind: "srgbClr", val: "000000" };
  const out = { kind, val: c.attrs["val"] ?? "000000" };
  if (c.attrs["lastClr"]) out.lastClr = c.attrs["lastClr"];
  const mods = childElements(c).map((m) => [m.name.slice(2), parseInt(m.attrs["val"] ?? "0", 10) || 0]);
  if (mods.length) out.mods = mods;
  return out;
}
function dmlColorXml(c) {
  const attrs3 = ` val="${escAttr(c.val)}"${c.lastClr ? ` lastClr="${c.lastClr}"` : ""}`;
  const mods = (c.mods ?? []).map(([n, v]) => n === "gray" || n === "comp" || n === "inv" || n === "gamma" || n === "invGamma" ? `<a:${n}/>` : `<a:${n} val="${v}"/>`).join("");
  return mods ? `<a:${c.kind}${attrs3}>${mods}</a:${c.kind}>` : `<a:${c.kind}${attrs3}/>`;
}
var PRST_RGB = { black: "000000", white: "FFFFFF", red: "FF0000", green: "008000", blue: "0000FF", yellow: "FFFF00", gray: "808080" };
var SCHEME_ALIAS = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
function dmlColorSpec(c) {
  let head = c.kind === "srgbClr" ? c.val.toUpperCase() : c.kind === "schemeClr" ? `@${SCHEME_ALIAS[c.val] ?? c.val}` : c.kind === "prstClr" ? PRST_RGB[c.val] ?? "000000" : c.lastClr ?? (c.val === "window" ? "FFFFFF" : "000000");
  let alpha = 1;
  const mods = [];
  for (const [n, v] of c.mods ?? []) {
    if (n === "alpha") alpha = v / 1e5;
    else mods.push(`${n}=${v}`);
  }
  if (mods.length) head += `|${mods.join(",")}`;
  return { spec: head, alpha };
}
var int = (v, d = 0) => {
  if (v === void 0) return d;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
var bool = (v, d = false) => v === void 0 ? d : v === "1" || v === "true" || v === "on";
function findDeep2(el3, name) {
  for (const c of childElements(el3)) {
    if (c.name === name) return c;
    const f = findDeep2(c, name);
    if (f) return f;
  }
  return void 0;
}
function partsOf(raw) {
  const root = parseXml(raw, { positions: true });
  const container = firstChild(root, "wp:anchor") ?? firstChild(root, "wp:inline");
  if (!container) throw new Error("w:drawing sem wp:inline/wp:anchor");
  const gd = findDeep2(container, "a:graphicData");
  const pic = gd && firstChild(gd, "pic:pic");
  const wsp = !pic && gd ? firstChild(gd, "wps:wsp") : void 0;
  const wgp = !pic && !wsp && gd ? firstChild(gd, "wpg:wgp") : void 0;
  const spPr = pic ? firstChild(pic, "pic:spPr") : wsp ? firstChild(wsp, "wps:spPr") : wgp && firstChild(wgp, "wpg:grpSpPr");
  const blipFill = pic && firstChild(pic, "pic:blipFill");
  const blip = blipFill && firstChild(blipFill, "a:blip");
  return { root, container, pic, wsp, wgp, spPr, blipFill, blip };
}
function readPos2(el3) {
  if (!el3) return void 0;
  const p = { relativeFrom: el3.attrs["relativeFrom"] ?? "column" };
  const al = firstChild(el3, "wp:align");
  if (al) p.align = textContent(al).trim();
  const off = firstChild(el3, "wp:posOffset");
  if (off) p.offset = int(textContent(off).trim());
  const pct2 = firstChild(el3, "wp14:pctPosHOffset") ?? firstChild(el3, "wp14:pctPosVOffset");
  if (pct2) p.pct = int(textContent(pct2).trim());
  return p;
}
function readPicLine(ln2) {
  if (!ln2) return void 0;
  const out = {};
  if (ln2.attrs["w"] !== void 0) out.w = int(ln2.attrs["w"]);
  if (ln2.attrs["cap"]) out.cap = ln2.attrs["cap"];
  if (ln2.attrs["cmpd"]) out.cmpd = ln2.attrs["cmpd"];
  if (ln2.attrs["algn"]) out.algn = ln2.attrs["algn"];
  for (const k of childElements(ln2)) {
    if (k.name === "a:noFill") out.fill = null;
    else if (k.name === "a:solidFill") out.fill = readDmlColor(k) ?? null;
    else if (k.name === "a:gradFill" || k.name === "a:pattFill") out.fillRaw = rawOf(ln2, k);
    else if (k.name === "a:prstDash") out.dash = k.attrs["val"] ?? "solid";
    else if (k.name === "a:round" || k.name === "a:bevel") out.join = k.name.slice(2);
    else if (k.name === "a:miter") {
      out.join = "miter";
      if (k.attrs["lim"]) out.miterLim = int(k.attrs["lim"]);
    } else if (k.name === "a:headEnd" || k.name === "a:tailEnd" || k.name === "a:extLst") out.tailRaw = (out.tailRaw ?? "") + rawOf(ln2, k);
  }
  return out;
}
var rawSrc = "";
function rawOf(_parent, el3) {
  return rawSrc.slice(el3.s, el3.e);
}
function readShadow(k) {
  const kind = k.name === "a:outerShdw" ? "outer" : k.name === "a:innerShdw" ? "inner" : "prst";
  const s = { kind, color: readDmlColor(k) ?? { kind: "srgbClr", val: "000000" } };
  const a = k.attrs;
  if (a["blurRad"] !== void 0) s.blurRad = int(a["blurRad"]);
  if (a["dist"] !== void 0) s.dist = int(a["dist"]);
  if (a["dir"] !== void 0) s.dir = int(a["dir"]);
  for (const n of ["sx", "sy", "kx", "ky"]) if (a[n] !== void 0) s[n] = int(a[n]);
  if (a["algn"]) s.algn = a["algn"];
  if (a["rotWithShape"] !== void 0) s.rotWithShape = bool(a["rotWithShape"]);
  if (a["prst"]) s.prst = a["prst"];
  return s;
}
function readEffects(el3) {
  const fx = {};
  if (!el3) return fx;
  for (const k of childElements(el3)) {
    if (k.name === "a:outerShdw" || k.name === "a:innerShdw" || k.name === "a:prstShdw") fx.shadow = readShadow(k);
    else if (k.name === "a:glow") fx.glow = { rad: int(k.attrs["rad"]), color: readDmlColor(k) ?? { kind: "srgbClr", val: "000000" } };
    else if (k.name === "a:softEdge") fx.softEdge = int(k.attrs["rad"]);
    else if (k.name === "a:reflection") {
      const r = {};
      const a = k.attrs;
      for (const n of ["blurRad", "stA", "stPos", "endA", "endPos", "dist", "dir", "fadeDir", "sx", "sy", "kx", "ky"]) if (a[n] !== void 0) r[n] = int(a[n]);
      if (a["algn"]) r.algn = a["algn"];
      if (a["rotWithShape"] !== void 0) r.rotWithShape = bool(a["rotWithShape"]);
      fx.reflection = r;
    } else (fx.otherRaw ??= []).push(rawOf(el3, k));
  }
  return fx;
}
function readRot(el3) {
  return el3 ? { lat: int(el3.attrs["lat"]), lon: int(el3.attrs["lon"]), rev: int(el3.attrs["rev"]) } : void 0;
}
function read3D(scene, sp3d) {
  if (!scene && !sp3d) return void 0;
  const t = {};
  const cam = scene && firstChild(scene, "a:camera");
  if (cam) {
    t.camera = { prst: cam.attrs["prst"] ?? "orthographicFront" };
    if (cam.attrs["fov"] !== void 0) t.camera.fov = int(cam.attrs["fov"]);
    if (cam.attrs["zoom"] !== void 0) t.camera.zoom = int(cam.attrs["zoom"]);
    const r = readRot(firstChild(cam, "a:rot"));
    if (r) t.camera.rot = r;
  }
  const lr = scene && firstChild(scene, "a:lightRig");
  if (lr) {
    t.lightRig = { rig: lr.attrs["rig"] ?? "threePt", dir: lr.attrs["dir"] ?? "t" };
    const r = readRot(firstChild(lr, "a:rot"));
    if (r) t.lightRig.rot = r;
  }
  if (sp3d) {
    const bv = (b) => b && {
      ...b.attrs["w"] !== void 0 ? { w: int(b.attrs["w"]) } : {},
      ...b.attrs["h"] !== void 0 ? { h: int(b.attrs["h"]) } : {},
      ...b.attrs["prst"] ? { prst: b.attrs["prst"] } : {}
    };
    const bt = bv(firstChild(sp3d, "a:bevelT")), bb = bv(firstChild(sp3d, "a:bevelB"));
    if (bt) t.bevelT = bt;
    if (bb) t.bevelB = bb;
    if (sp3d.attrs["extrusionH"] !== void 0) t.extrusionH = int(sp3d.attrs["extrusionH"]);
    if (sp3d.attrs["contourW"] !== void 0) t.contourW = int(sp3d.attrs["contourW"]);
    if (sp3d.attrs["z"] !== void 0) t.z = int(sp3d.attrs["z"]);
    if (sp3d.attrs["prstMaterial"]) t.prstMaterial = sp3d.attrs["prstMaterial"];
    const ec2 = readDmlColor(firstChild(sp3d, "a:extrusionClr"));
    if (ec2) t.extrusionClr = ec2;
    const cc = readDmlColor(firstChild(sp3d, "a:contourClr"));
    if (cc) t.contourClr = cc;
  }
  return t;
}
function readBlip(blip) {
  const fx = {};
  if (!blip) return fx;
  for (const k of childElements(blip)) {
    if (k.name === "a:alphaModFix") fx.alphaModFix = int(k.attrs["amt"], 1e5);
    else if (k.name === "a:lum") fx.lum = { ...k.attrs["bright"] !== void 0 ? { bright: int(k.attrs["bright"]) } : {}, ...k.attrs["contrast"] !== void 0 ? { contrast: int(k.attrs["contrast"]) } : {} };
    else if (k.name === "a:grayscl") fx.grayscl = true;
    else if (k.name === "a:biLevel") fx.biLevel = int(k.attrs["thresh"], 5e4);
    else if (k.name === "a:duotone") {
      const cs = childElements(k).filter((c) => COLOR_NAMES.includes(c.name));
      const wrap = (c) => readDmlColor({ name: "x", attrs: {}, children: c ? [c] : [] }) ?? { kind: "srgbClr", val: "000000" };
      fx.duotone = [wrap(cs[0]), wrap(cs[1])];
    } else if (k.name === "a:clrChange") {
      fx.clrChange = { from: readDmlColor(firstChild(k, "a:clrFrom")) ?? { kind: "srgbClr", val: "FFFFFF" }, to: readDmlColor(firstChild(k, "a:clrTo")) ?? { kind: "srgbClr", val: "FFFFFF" } };
      if (k.attrs["useA"] !== void 0) fx.clrChange.useA = bool(k.attrs["useA"]);
    } else if (k.name === "a:extLst") {
      const props = findDeep2(k, "a14:imgProps");
      const layer = props && firstChild(props, "a14:imgLayer");
      if (layer) {
        const a14 = {};
        if (layer.attrs["r:embed"]) a14.layerRid = layer.attrs["r:embed"];
        for (const ie of childElements(layer, "a14:imgEffect")) {
          for (const e of childElements(ie)) {
            if (e.name === "a14:saturation") a14.saturation = int(e.attrs["sat"], 1e5);
            else if (e.name === "a14:colorTemperature") a14.colorTemp = int(e.attrs["colorTemp"], 6500);
            else if (e.name === "a14:sharpenSoften") a14.sharpen = int(e.attrs["amount"]);
            else if (e.name === "a14:brightnessContrast") {
              a14.bright = int(e.attrs["bright"]);
              a14.contrast = int(e.attrs["contrast"]);
            } else (a14.otherRaw ??= []).push(rawOf(blip, e));
          }
        }
        fx.a14 = a14;
      }
    }
  }
  return fx;
}
function readPictureFormat(raw, opts = {}) {
  let p;
  try {
    p = partsOf(raw);
  } catch {
    return void 0;
  }
  if (!p.pic && !(opts.anyShape && (p.wsp || p.wgp))) return void 0;
  rawSrc = raw;
  const c = p.container;
  const inline = c.name === "wp:inline";
  const ext = firstChild(c, "wp:extent");
  const ee = firstChild(c, "wp:effectExtent");
  const docPr = firstChild(c, "wp:docPr");
  const a = c.attrs;
  const wrapEl = inline ? void 0 : childElements(c).find((k) => WRAP_NAMES.includes(k.name));
  const behindDoc = bool(a["behindDoc"]);
  let wrap = "inline";
  if (!inline) {
    const n = wrapEl?.name ?? "wp:wrapNone";
    wrap = n === "wp:wrapSquare" ? "square" : n === "wp:wrapTight" ? "tight" : n === "wp:wrapThrough" ? "through" : n === "wp:wrapTopAndBottom" ? "topAndBottom" : behindDoc ? "behind" : "front";
  }
  const poly = wrapEl && firstChild(wrapEl, "wp:wrapPolygon");
  const sizeRel = (n, k) => {
    const el3 = firstChild(c, n);
    if (!el3) return void 0;
    const v = firstChild(el3, k);
    return { relativeFrom: el3.attrs["relativeFrom"] ?? "page", pct: v ? int(textContent(v).trim()) : 0 };
  };
  const spPr = p.spPr;
  const xfrm = spPr && firstChild(spPr, "a:xfrm");
  const prst = spPr && firstChild(spPr, "a:prstGeom");
  const adj = {};
  const av = prst && firstChild(prst, "a:avLst");
  for (const gd of av ? childElements(av, "a:gd") : []) {
    const m = /^val\s+(-?\d+)/.exec(gd.attrs["fmla"] ?? "");
    if (m && gd.attrs["name"]) adj[gd.attrs["name"]] = parseInt(m[1], 10);
  }
  const src = p.blipFill && firstChild(p.blipFill, "a:srcRect");
  const decor = docPr && findDeep2(docPr, "adec:decorative");
  const locks = findDeep2(c, "a:graphicFrameLocks");
  const out = {
    inline,
    wrap,
    wrapText: wrapEl?.attrs["wrapText"] ?? "bothSides",
    dist: { t: int(a["distT"]), b: int(a["distB"]), l: int(a["distL"]), r: int(a["distR"]) },
    cx: int(ext?.attrs["cx"]),
    cy: int(ext?.attrs["cy"]),
    effectExtent: { l: int(ee?.attrs["l"]), t: int(ee?.attrs["t"]), r: int(ee?.attrs["r"]), b: int(ee?.attrs["b"]) },
    locked: bool(a["locked"]),
    layoutInCell: bool(a["layoutInCell"], true),
    allowOverlap: bool(a["allowOverlap"], true),
    behindDoc,
    docPr: {
      ...docPr?.attrs["id"] ? { id: docPr.attrs["id"] } : {},
      ...docPr?.attrs["name"] !== void 0 ? { name: docPr.attrs["name"] } : {},
      ...docPr?.attrs["descr"] !== void 0 ? { descr: docPr.attrs["descr"] } : {},
      ...docPr?.attrs["title"] !== void 0 ? { title: docPr.attrs["title"] } : {},
      ...bool(docPr?.attrs["hidden"]) ? { hidden: true } : {},
      ...decor && bool(decor.attrs["val"], true) ? { decorative: true } : {}
    },
    noChangeAspect: bool(locks?.attrs["noChangeAspect"]),
    rot: int(xfrm?.attrs["rot"]),
    flipH: bool(xfrm?.attrs["flipH"]),
    flipV: bool(xfrm?.attrs["flipV"]),
    srcRect: { l: int(src?.attrs["l"]), t: int(src?.attrs["t"]), r: int(src?.attrs["r"]), b: int(src?.attrs["b"]) },
    geom: prst?.attrs["prst"] ?? (spPr && firstChild(spPr, "a:custGeom") ? "custom" : "rect"),
    effects: readEffects(spPr && firstChild(spPr, "a:effectLst")),
    blip: readBlip(p.blip)
  };
  if (!inline) {
    const ph = readPos2(anchorChild(c, "wp:positionH")), pv = readPos2(anchorChild(c, "wp:positionV"));
    if (ph) out.posH = ph;
    if (pv) out.posV = pv;
    if (a["relativeHeight"] !== void 0) out.relativeHeight = int(a["relativeHeight"]);
    const sh = sizeRel("wp14:sizeRelH", "wp14:pctWidth"), sv = sizeRel("wp14:sizeRelV", "wp14:pctHeight");
    if (sh) out.sizeRelH = sh;
    if (sv) out.sizeRelV = sv;
  }
  if (poly) {
    const pts = childElements(poly).map((pt) => [int(pt.attrs["x"]), int(pt.attrs["y"])]);
    out.polygon = { edited: bool(poly.attrs["edited"]), pts };
  }
  if (Object.keys(adj).length) out.adj = adj;
  if (spPr && firstChild(spPr, "a:custGeom")) out.custGeom = true;
  const ln2 = readPicLine(spPr && firstChild(spPr, "a:ln"));
  if (ln2 !== void 0) out.line = ln2;
  const t3 = read3D(spPr && firstChild(spPr, "a:scene3d"), spPr && firstChild(spPr, "a:sp3d"));
  if (t3) out.threeD = t3;
  if (p.blip?.attrs["r:embed"]) out.embed = p.blip.attrs["r:embed"];
  rawSrc = "";
  return out;
}
function picLineXml(l) {
  const attrs3 = `${l.w !== void 0 ? ` w="${Math.round(l.w)}"` : ""}${l.cap ? ` cap="${l.cap}"` : ""}${l.cmpd ? ` cmpd="${l.cmpd}"` : ""}${l.algn ? ` algn="${l.algn}"` : ""}`;
  let inner = "";
  if (l.fill === null) inner += "<a:noFill/>";
  else if (l.fill) inner += `<a:solidFill>${dmlColorXml(l.fill)}</a:solidFill>`;
  else if (l.fillRaw) inner += l.fillRaw;
  if (l.dash) inner += `<a:prstDash val="${l.dash}"/>`;
  if (l.join === "round") inner += "<a:round/>";
  else if (l.join === "bevel") inner += "<a:bevel/>";
  else if (l.join === "miter") inner += l.miterLim !== void 0 ? `<a:miter lim="${l.miterLim}"/>` : "<a:miter/>";
  if (l.tailRaw) inner += l.tailRaw;
  return inner ? `<a:ln${attrs3}>${inner}</a:ln>` : `<a:ln${attrs3}/>`;
}
var num = (k, v) => v === void 0 ? "" : ` ${k}="${Math.round(v)}"`;
function shadowXml(s) {
  const tag = s.kind === "outer" ? "a:outerShdw" : s.kind === "inner" ? "a:innerShdw" : "a:prstShdw";
  const attrs3 = (s.kind === "prst" ? ` prst="${s.prst ?? "shdw1"}"` : num("blurRad", s.blurRad)) + num("dist", s.dist) + num("dir", s.dir) + (s.kind === "outer" ? num("sx", s.sx) + num("sy", s.sy) + num("kx", s.kx) + num("ky", s.ky) + (s.algn ? ` algn="${s.algn}"` : "") + (s.rotWithShape !== void 0 ? ` rotWithShape="${s.rotWithShape ? 1 : 0}"` : "") : "");
  return `<${tag}${attrs3}>${dmlColorXml(s.color)}</${tag}>`;
}
function reflectionXml(r) {
  return `<a:reflection${num("blurRad", r.blurRad)}${num("stA", r.stA)}${num("stPos", r.stPos)}${num("endA", r.endA)}${num("endPos", r.endPos)}${num("dist", r.dist)}${num("dir", r.dir)}${num("fadeDir", r.fadeDir)}${num("sx", r.sx)}${num("sy", r.sy)}${num("kx", r.kx)}${num("ky", r.ky)}${r.algn ? ` algn="${r.algn}"` : ""}${r.rotWithShape !== void 0 ? ` rotWithShape="${r.rotWithShape ? 1 : 0}"` : ""}/>`;
}
function effectLstXml(fx) {
  const kids = [];
  for (const raw of fx.otherRaw ?? []) kids.push([/^<([^\s/>]+)/.exec(raw)?.[1] ?? "a:blur", raw]);
  if (fx.glow) kids.push(["a:glow", `<a:glow rad="${Math.round(fx.glow.rad)}">${dmlColorXml(fx.glow.color)}</a:glow>`]);
  if (fx.shadow) kids.push([fx.shadow.kind === "outer" ? "a:outerShdw" : fx.shadow.kind === "inner" ? "a:innerShdw" : "a:prstShdw", shadowXml(fx.shadow)]);
  if (fx.reflection) kids.push(["a:reflection", reflectionXml(fx.reflection)]);
  if (fx.softEdge !== void 0) kids.push(["a:softEdge", `<a:softEdge rad="${Math.round(fx.softEdge)}"/>`]);
  kids.sort((a, b) => EFFECT_ORDER.indexOf(a[0]) - EFFECT_ORDER.indexOf(b[0]));
  return kids.length ? `<a:effectLst>${kids.map((k) => k[1]).join("")}</a:effectLst>` : "";
}
var rotXml = (r) => r ? `<a:rot lat="${r.lat}" lon="${r.lon}" rev="${r.rev}"/>` : "";
function scene3dXml(t) {
  if (!t.camera && !t.lightRig) return "";
  const cam = t.camera ?? { prst: "orthographicFront" };
  const lr = t.lightRig ?? { rig: "threePt", dir: "t" };
  const camAttrs = `prst="${cam.prst}"${num("fov", cam.fov)}${num("zoom", cam.zoom)}`;
  return `<a:scene3d>${cam.rot ? `<a:camera ${camAttrs}>${rotXml(cam.rot)}</a:camera>` : `<a:camera ${camAttrs}/>`}${lr.rot ? `<a:lightRig rig="${lr.rig}" dir="${lr.dir}">${rotXml(lr.rot)}</a:lightRig>` : `<a:lightRig rig="${lr.rig}" dir="${lr.dir}"/>`}</a:scene3d>`;
}
function sp3dXml(t) {
  const attrs3 = `${num("z", t.z)}${num("extrusionH", t.extrusionH)}${num("contourW", t.contourW)}${t.prstMaterial ? ` prstMaterial="${t.prstMaterial}"` : ""}`;
  const bv = (n, b) => b ? `<a:${n}${num("w", b.w)}${num("h", b.h)}${b.prst ? ` prst="${b.prst}"` : ""}/>` : "";
  const inner = bv("bevelT", t.bevelT) + bv("bevelB", t.bevelB) + (t.extrusionClr ? `<a:extrusionClr>${dmlColorXml(t.extrusionClr)}</a:extrusionClr>` : "") + (t.contourClr ? `<a:contourClr>${dmlColorXml(t.contourClr)}</a:contourClr>` : "");
  if (!attrs3 && !inner) return "";
  return inner ? `<a:sp3d${attrs3}>${inner}</a:sp3d>` : `<a:sp3d${attrs3}/>`;
}
var A14 = 'xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"';
var ADEC_EXT = '<a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}"><adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/></a:ext>';
var IMGPROPS_URI = "{BEBA8EAE-BF5A-486C-A8C5-ECC9F3942E4B}";
function a14Xml(a) {
  const fx = [];
  for (const raw of a.otherRaw ?? []) fx.push(raw);
  if (a.saturation !== void 0) fx.push(`<a14:saturation sat="${a.saturation}"/>`);
  if (a.colorTemp !== void 0) fx.push(`<a14:colorTemperature colorTemp="${a.colorTemp}"/>`);
  if (a.sharpen !== void 0) fx.push(`<a14:sharpenSoften amount="${a.sharpen}"/>`);
  if (a.bright !== void 0 || a.contrast !== void 0) fx.push(`<a14:brightnessContrast${a.bright ? ` bright="${a.bright}"` : ""}${a.contrast ? ` contrast="${a.contrast}"` : ""}/>`);
  if (!fx.length) return "";
  return `<a:ext uri="${IMGPROPS_URI}"><a14:imgProps ${A14}><a14:imgLayer${a.layerRid ? ` r:embed="${a.layerRid}"` : ""}>${fx.map((f) => `<a14:imgEffect>${f}</a14:imgEffect>`).join("")}</a14:imgLayer></a14:imgProps></a:ext>`;
}
function blipFxKids(fx) {
  const out = [];
  if (fx.clrChange) out.push(["a:clrChange", `<a:clrChange${fx.clrChange.useA !== void 0 ? ` useA="${fx.clrChange.useA ? 1 : 0}"` : ""}><a:clrFrom>${dmlColorXml(fx.clrChange.from)}</a:clrFrom><a:clrTo>${dmlColorXml(fx.clrChange.to)}</a:clrTo></a:clrChange>`]);
  if (fx.duotone) out.push(["a:duotone", `<a:duotone>${dmlColorXml(fx.duotone[0])}${dmlColorXml(fx.duotone[1])}</a:duotone>`]);
  if (fx.grayscl) out.push(["a:grayscl", "<a:grayscl/>"]);
  if (fx.biLevel !== void 0) out.push(["a:biLevel", `<a:biLevel thresh="${fx.biLevel}"/>`]);
  if (fx.lum && (fx.lum.bright || fx.lum.contrast)) out.push(["a:lum", `<a:lum${fx.lum.bright ? ` bright="${fx.lum.bright}"` : ""}${fx.lum.contrast ? ` contrast="${fx.lum.contrast}"` : ""}/>`]);
  if (fx.alphaModFix !== void 0 && fx.alphaModFix < 1e5) out.push(["a:alphaModFix", `<a:alphaModFix amt="${fx.alphaModFix}"/>`]);
  return out;
}
var DEFAULT_WRAP_POLYGON = [[0, 0], [0, 21300], [21375, 21300], [21375, 0], [0, 0]];
function polygonXml(poly) {
  const [first, ...rest] = poly.pts;
  return `<wp:wrapPolygon edited="${poly.edited ? 1 : 0}"><wp:start x="${first?.[0] ?? 0}" y="${first?.[1] ?? 0}"/>${rest.map(([x2, y]) => `<wp:lineTo x="${x2}" y="${y}"/>`).join("")}</wp:wrapPolygon>`;
}
function wrapXml(kind, wrapText, polygon) {
  switch (kind) {
    case "square":
      return `<wp:wrapSquare wrapText="${wrapText}"/>`;
    case "tight":
    case "through": {
      const tag = kind === "tight" ? "wp:wrapTight" : "wp:wrapThrough";
      return `<${tag} wrapText="${wrapText}">${polygonXml(polygon ?? { edited: false, pts: DEFAULT_WRAP_POLYGON })}</${tag}>`;
    }
    case "topAndBottom":
      return "<wp:wrapTopAndBottom/>";
    default:
      return "<wp:wrapNone/>";
  }
}
var posXml = (tag, p) => {
  if (p.align === void 0 && p.pct !== void 0) {
    const pct2 = tag === "wp:positionH" ? "wp14:pctPosHOffset" : "wp14:pctPosVOffset";
    return `<mc:AlternateContent><mc:Choice Requires="wp14"><${tag} relativeFrom="${p.relativeFrom}"><${pct2}>${Math.round(p.pct)}</${pct2}></${tag}></mc:Choice><mc:Fallback><${tag} relativeFrom="page"><wp:posOffset>${Math.round(p.fallback ?? 0)}</wp:posOffset></${tag}></mc:Fallback></mc:AlternateContent>`;
  }
  const inner = p.align !== void 0 ? `<wp:align>${p.align}</wp:align>` : `<wp:posOffset>${Math.round(p.offset ?? 0)}</wp:posOffset>`;
  return `<${tag} relativeFrom="${p.relativeFrom}">${inner}</${tag}>`;
};
function posHolder(c, tag) {
  return firstChild(c, tag) ?? childElements(c, "mc:AlternateContent").find((ac) => findDeep2(ac, tag));
}
var sizeRelXml = (tag, r) => {
  const k = tag === "wp14:sizeRelH" ? "wp14:pctWidth" : "wp14:pctHeight";
  return `<${tag} relativeFrom="${r.relativeFrom}"><${k}>${Math.round(r.pct)}</${k}></${tag}>`;
};
function convertContainer(raw, ch) {
  const p = partsOf(raw);
  const c = p.container;
  const slice = (n) => {
    const el3 = firstChild(c, n);
    return el3 ? raw.slice(el3.s, el3.e) : "";
  };
  const keep = slice("wp:extent") + slice("wp:effectExtent");
  const tail = slice("wp:docPr") + slice("wp:cNvGraphicFramePr") + slice("a:graphic");
  const head = raw.slice(0, c.s), foot = raw.slice(c.e);
  const pfx = /^<([^:\s>]+):/.exec(raw.slice(c.s))?.[1] ?? "wp";
  const fix = (s) => pfx === "wp" ? s : s.replace(/<(\/?)wp:/g, `<$1${pfx}:`);
  if (ch.wrap === "inline") {
    return head + fix(`<wp:inline distT="0" distB="0" distL="0" distR="0">${keep}${tail}</wp:inline>`) + foot;
  }
  const kind = ch.wrap;
  const at = ch.at ?? { x: 0, y: 0 };
  const wrapText = ch.wrapText ?? "bothSides";
  const behind = kind === "behind" || kind === "tight" || kind === "through";
  const z = ch.newRelativeHeight ?? 251658240;
  return head + fix(`<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${z}" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>` + posXml("wp:positionH", { relativeFrom: "column", offset: at.x }) + posXml("wp:positionV", { relativeFrom: "paragraph", offset: at.y }) + keep + wrapXml(kind, wrapText, void 0) + tail + '<wp14:sizeRelH relativeFrom="page"><wp14:pctWidth>0</wp14:pctWidth></wp14:sizeRelH><wp14:sizeRelV relativeFrom="page"><wp14:pctHeight>0</wp14:pctHeight></wp14:sizeRelV></wp:anchor>') + foot;
}
function patchPicture(raw, ch) {
  let xml = raw;
  if (ch.wrap !== void 0) {
    const cur = readPictureFormat(xml);
    if (cur) {
      if (ch.wrap === "inline" !== cur.inline) xml = convertContainer(xml, ch);
      else if (!cur.inline && ch.wrap !== cur.wrap) xml = switchWrap(xml, cur, ch.wrap);
    }
  }
  xml = patchContainer(xml, ch);
  xml = patchNvPr(xml, ch);
  if (ch.decorative !== void 0) xml = patchDecorative(xml, ch.decorative);
  if (ch.noChangeAspect !== void 0) xml = patchLocks(xml, ch.noChangeAspect);
  xml = patchPic(xml, ch);
  if (ch.embed) xml = patchBlipAttrs(xml, ch.embed);
  if (ch.blipFx) xml = patchBlipFx(xml, ch.blipFx);
  if (ch.a14 !== void 0) xml = patchA14(xml, ch.a14);
  return xml;
}
function switchWrap(raw, cur, kind) {
  const p = partsOf(raw);
  const c = p.container;
  const patch2 = new XmlPatch(raw);
  const old = childElements(c).find((k) => WRAP_NAMES.includes(k.name));
  const xml = wrapXml(kind, cur.wrapText, cur.polygon);
  if (old) patch2.replace(old, xml);
  else patch2.insertChild(c, "wp:wrapNone", xml, ANCHOR_ORDER);
  const behind = kind === "behind" || kind === "tight" || kind === "through";
  if (cur.behindDoc !== behind) patch2.setAttrs(c, { behindDoc: behind ? 1 : 0 });
  return patch2.apply();
}
function patchContainer(raw, ch) {
  const p = partsOf(raw);
  const c = p.container;
  const anchor = c.name !== "wp:inline";
  const patch2 = new XmlPatch(raw);
  const attrs3 = {};
  if (ch.dist) {
    for (const [k, v] of Object.entries(ch.dist)) if (v !== void 0) attrs3[`dist${k.toUpperCase()}`] = Math.round(v);
  }
  if (anchor) {
    if (ch.locked !== void 0) attrs3["locked"] = ch.locked ? 1 : 0;
    if (ch.layoutInCell !== void 0) attrs3["layoutInCell"] = ch.layoutInCell ? 1 : 0;
    if (ch.allowOverlap !== void 0) attrs3["allowOverlap"] = ch.allowOverlap ? 1 : 0;
    if (ch.behindDoc !== void 0) attrs3["behindDoc"] = ch.behindDoc ? 1 : 0;
    if (ch.relativeHeight !== void 0) attrs3["relativeHeight"] = Math.round(ch.relativeHeight);
  }
  if (Object.keys(attrs3).length) patch2.setAttrs(c, attrs3);
  const order2 = anchor ? ANCHOR_ORDER : INLINE_ORDER;
  if (anchor) {
    for (const [tag, pos] of [["wp:positionH", ch.posH], ["wp:positionV", ch.posV]]) {
      if (!pos) continue;
      const cur = posHolder(c, tag);
      if (cur) patch2.replace(cur, posXml(tag, pos));
      else patch2.insertChild(c, tag, posXml(tag, pos), ANCHOR_ORDER);
    }
    const wrapEl = childElements(c).find((k) => WRAP_NAMES.includes(k.name));
    if (wrapEl && wrapEl.name !== "wp:wrapNone" && wrapEl.name !== "wp:wrapTopAndBottom") {
      const poly = wrapEl.name === "wp:wrapTight" || wrapEl.name === "wp:wrapThrough";
      if (ch.polygon !== void 0 && poly) {
        const wt = ch.wrapText ?? wrapEl.attrs["wrapText"] ?? "bothSides";
        const tag = wrapEl.name;
        patch2.replace(wrapEl, `<${tag} wrapText="${wt}">${polygonXml(ch.polygon ?? { edited: false, pts: DEFAULT_WRAP_POLYGON })}</${tag}>`);
      } else if (ch.wrapText !== void 0) patch2.setAttrs(wrapEl, { wrapText: ch.wrapText });
    }
    if (ch.sizeRelH !== void 0) patch2.putChild(c, "wp14:sizeRelH", ch.sizeRelH ? sizeRelXml("wp14:sizeRelH", ch.sizeRelH) : "", ANCHOR_ORDER);
    if (ch.sizeRelV !== void 0) patch2.putChild(c, "wp14:sizeRelV", ch.sizeRelV ? sizeRelXml("wp14:sizeRelV", ch.sizeRelV) : "", ANCHOR_ORDER);
  }
  if (ch.size) {
    const ext = firstChild(c, "wp:extent");
    if (ext) patch2.setAttrs(ext, { cx: Math.round(ch.size.cx), cy: Math.round(ch.size.cy) });
    else patch2.insertChild(c, "wp:extent", `<wp:extent cx="${Math.round(ch.size.cx)}" cy="${Math.round(ch.size.cy)}"/>`, order2);
  }
  if (ch.effectExtent) {
    const e = ch.effectExtent;
    const ee = firstChild(c, "wp:effectExtent");
    const vals = { l: Math.round(e.l), t: Math.round(e.t), r: Math.round(e.r), b: Math.round(e.b) };
    if (ee) patch2.setAttrs(ee, vals);
    else patch2.insertChild(c, "wp:effectExtent", `<wp:effectExtent l="${vals.l}" t="${vals.t}" r="${vals.r}" b="${vals.b}"/>`, order2);
  }
  return patch2.apply();
}
function patchLocks(raw, on) {
  const p = partsOf(raw);
  const c = p.container;
  const patch2 = new XmlPatch(raw);
  const locks = findDeep2(c, "a:graphicFrameLocks");
  if (locks) patch2.setAttrs(locks, { noChangeAspect: on ? 1 : void 0 });
  else if (on) {
    const fp = firstChild(c, "wp:cNvGraphicFramePr");
    const lx = '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>';
    if (fp) patch2.setContent(fp, lx);
    else patch2.insertChild(c, "wp:cNvGraphicFramePr", `<wp:cNvGraphicFramePr>${lx}</wp:cNvGraphicFramePr>`, c.name === "wp:inline" ? INLINE_ORDER : ANCHOR_ORDER);
  }
  const nv = p.wsp && firstChild(p.wsp, "wps:cNvSpPr");
  if (nv) {
    const sl = firstChild(nv, "a:spLocks");
    if (sl) {
      const others = Object.keys(sl.attrs).filter((k) => k !== "noChangeAspect");
      if (!on && !others.length && sl.cs === sl.e) patch2.remove(sl);
      else patch2.setAttrs(sl, { noChangeAspect: on ? 1 : void 0 });
    } else if (on) {
      if (nv.cs === nv.e) patch2.setContent(nv, '<a:spLocks noChangeAspect="1"/>');
      else patch2.insertAt(nv.cs, '<a:spLocks noChangeAspect="1"/>');
    }
  }
  return patch2.apply();
}
function patchNvPr(raw, ch) {
  const set = {};
  if (ch.name !== void 0) set["name"] = ch.name;
  if (ch.descr !== void 0) set["descr"] = ch.descr || void 0;
  if (ch.title !== void 0) set["title"] = ch.title || void 0;
  if (ch.hidden !== void 0) set["hidden"] = ch.hidden ? 1 : void 0;
  if (!Object.keys(set).length) return raw;
  const p = partsOf(raw);
  const docPr = firstChild(p.container, "wp:docPr");
  if (!docPr) return raw;
  const nv = p.pic && firstChild(p.pic, "pic:nvPicPr");
  const cNvPr = nv && firstChild(nv, "pic:cNvPr");
  const patch2 = new XmlPatch(raw);
  patch2.setAttrs(docPr, set);
  if (cNvPr) {
    const nset = { ...set };
    delete nset["hidden"];
    if ((ch.descr || ch.title) && !cNvPr.attrs["name"]) nset["name"] = ch.name ?? docPr.attrs["name"] ?? "";
    if (Object.keys(nset).length) patch2.setAttrs(cNvPr, nset);
  }
  return patch2.apply();
}
function patchDecorative(raw, on) {
  let xml = raw;
  if (on) {
    const p = partsOf(xml);
    const docPr = firstChild(p.container, "wp:docPr");
    const nv = p.pic && firstChild(p.pic, "pic:nvPicPr");
    const cNvPr = nv && firstChild(nv, "pic:cNvPr");
    if (docPr && cNvPr && !cNvPr.attrs["name"] && docPr.attrs["name"]) {
      const patch2 = new XmlPatch(xml);
      patch2.setAttrs(cNvPr, { name: docPr.attrs["name"] });
      xml = patch2.apply();
    }
  }
  for (const which of ["docPr", "cNvPr"]) {
    const p = partsOf(xml);
    const nv = p.pic && firstChild(p.pic, "pic:nvPicPr");
    const el3 = which === "docPr" ? firstChild(p.container, "wp:docPr") : nv && firstChild(nv, "pic:cNvPr");
    if (!el3) continue;
    const patch2 = new XmlPatch(xml);
    const ext = firstChild(el3, "a:extLst");
    const decExt = ext && childElements(ext, "a:ext").find((e) => e.attrs["uri"] === "{C183D7F6-B498-43B3-948B-1728B52AA6E4}");
    if (on) {
      if (decExt) continue;
      const nsA = which === "docPr" ? ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"' : "";
      if (ext) patch2.insertAt(ext.ce, ADEC_EXT);
      else {
        const hl = childElements(el3).filter((k) => k.name === "a:hlinkClick" || k.name === "a:hlinkHover").pop();
        const lst = `<a:extLst${nsA}>${ADEC_EXT}</a:extLst>`;
        if (hl) patch2.insertAt(hl.e, lst);
        else if (el3.cs === el3.e) patch2.setContent(el3, lst);
        else patch2.insertAt(el3.ce, lst);
      }
    } else if (decExt) {
      if (childElements(ext).length === 1) patch2.remove(ext);
      else patch2.remove(decExt);
    }
    xml = patch2.apply();
  }
  return xml;
}
function patchPic(raw, ch) {
  const p = partsOf(raw);
  if (!p.pic && !p.wsp && !p.wgp) return raw;
  const patch2 = new XmlPatch(raw);
  const sp = p.spPr;
  if (sp) {
    rawSrc = raw;
    const xfrm = firstChild(sp, "a:xfrm");
    const xa = {};
    if (ch.rot !== void 0) xa["rot"] = ch.rot ? Math.round(ch.rot) : void 0;
    if (ch.flipH !== void 0) xa["flipH"] = ch.flipH ? 1 : void 0;
    if (ch.flipV !== void 0) xa["flipV"] = ch.flipV ? 1 : void 0;
    if (xfrm) {
      if (Object.keys(xa).length) patch2.setAttrs(xfrm, xa);
      const ext = firstChild(xfrm, "a:ext");
      if (ext && ch.size) patch2.setAttrs(ext, { cx: Math.round(ch.size.cx), cy: Math.round(ch.size.cy) });
    }
    if (ch.geom) {
      const adj = Object.entries(ch.geom.adj ?? {}).map(([n, v]) => `<a:gd name="${n}" fmla="val ${Math.round(v)}"/>`).join("");
      const g = `<a:prstGeom prst="${ch.geom.prst}"><a:avLst${adj ? `>${adj}</a:avLst>` : "/>"}</a:prstGeom>`;
      const cust = firstChild(sp, "a:custGeom");
      if (cust) patch2.replace(cust, g);
      else patch2.putChild(sp, "a:prstGeom", g, SPPR_ORDER);
    }
    if (ch.line !== void 0) patch2.putChild(sp, "a:ln", ch.line ? picLineXml(ch.line) : "", SPPR_ORDER);
    if (ch.shadow !== void 0 || ch.reflection !== void 0 || ch.glow !== void 0 || ch.softEdge !== void 0) {
      const el3 = firstChild(sp, "a:effectLst");
      const fx = readEffects(el3);
      if (ch.shadow !== void 0) {
        if (ch.shadow) fx.shadow = ch.shadow;
        else delete fx.shadow;
      }
      if (ch.reflection !== void 0) {
        if (ch.reflection) fx.reflection = ch.reflection;
        else delete fx.reflection;
      }
      if (ch.glow !== void 0) {
        if (ch.glow) fx.glow = ch.glow;
        else delete fx.glow;
      }
      if (ch.softEdge !== void 0) {
        if (ch.softEdge) fx.softEdge = ch.softEdge;
        else delete fx.softEdge;
      }
      patch2.putChild(sp, "a:effectLst", effectLstXml(fx), SPPR_ORDER);
    }
    if (ch.threeD !== void 0) {
      patch2.putChild(sp, "a:scene3d", ch.threeD ? scene3dXml(ch.threeD) : "", SPPR_ORDER);
      patch2.putChild(sp, "a:sp3d", ch.threeD ? sp3dXml(ch.threeD) : "", SPPR_ORDER);
    }
    rawSrc = "";
  }
  const bf = p.blipFill;
  if (bf && ch.srcRect) {
    const s = ch.srcRect;
    const attrs3 = `${s.l ? ` l="${Math.round(s.l)}"` : ""}${s.t ? ` t="${Math.round(s.t)}"` : ""}${s.r ? ` r="${Math.round(s.r)}"` : ""}${s.b ? ` b="${Math.round(s.b)}"` : ""}`;
    patch2.putChild(bf, "a:srcRect", `<a:srcRect${attrs3}/>`, BLIPFILL_ORDER);
  }
  return patch2.apply();
}
function patchBlipAttrs(raw, embed) {
  const p = partsOf(raw);
  if (!p.blip) return raw;
  const patch2 = new XmlPatch(raw);
  patch2.setAttrs(p.blip, { "r:embed": embed });
  return patch2.apply();
}
function patchBlipFx(raw, fx) {
  const p = partsOf(raw);
  const blip = p.blip;
  if (!blip) return raw;
  const patch2 = new XmlPatch(raw);
  const managed = /* @__PURE__ */ new Set(["a:alphaModFix", "a:lum", "a:grayscl", "a:biLevel", "a:duotone", "a:clrChange"]);
  for (const k of childElements(blip)) if (managed.has(k.name)) patch2.remove(k);
  const xml = blipFxKids(fx).map((k) => k[1]).join("");
  if (xml) {
    const ext = firstChild(blip, "a:extLst");
    if (ext) patch2.insertAt(ext.s, xml);
    else if (blip.cs === blip.e) patch2.setContent(blip, xml);
    else patch2.insertAt(blip.ce, xml);
  }
  return patch2.apply();
}
function patchA14(raw, a14) {
  const p = partsOf(raw);
  const blip = p.blip;
  if (!blip) return raw;
  const patch2 = new XmlPatch(raw);
  const ext = firstChild(blip, "a:extLst");
  const props = ext && childElements(ext, "a:ext").find((e) => e.attrs["uri"] === IMGPROPS_URI);
  const xml = a14 ? a14Xml(a14) : "";
  if (props) patch2.replace(props, xml);
  else if (xml) {
    if (ext) patch2.insertAt(ext.cs, xml);
    else if (blip.cs === blip.e) patch2.setContent(blip, `<a:extLst>${xml}</a:extLst>`);
    else patch2.insertAt(blip.ce, `<a:extLst>${xml}</a:extLst>`);
  }
  return patch2.apply();
}
function newPictureXml(o) {
  const cx = Math.round(o.cx), cy = Math.round(o.cy);
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${o.id}" name="${escAttr(o.name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${o.id}" name=""/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${o.rid}" cstate="print"><a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi ${A14} val="0"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

// ../docx-core/src/shape-xml.ts
var int2 = (v, d = 0) => {
  if (v === void 0) return d;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
var bool2 = (v, d = false) => v === void 0 ? d : v === "1" || v === "true" || v === "on";
var DEFAULT_TEXTBOX_BODY = {
  lIns: 91440,
  tIns: 45720,
  rIns: 91440,
  bIns: 45720,
  anchor: "t",
  anchorCtr: false,
  vert: "horz",
  wrap: "square",
  autofit: "none",
  upright: false,
  rot: 0
};
function readFill(spPr, raw) {
  if (!spPr) return { kind: "style" };
  for (const k of childElements(spPr)) {
    switch (k.name) {
      case "a:noFill":
        return { kind: "none" };
      case "a:solidFill":
        return { kind: "solid", color: readDmlColor(k) ?? { kind: "srgbClr", val: "000000" } };
      case "a:gradFill": {
        const gs = firstChild(k, "a:gsLst");
        const lin2 = firstChild(k, "a:lin"), path = firstChild(k, "a:path");
        const ftr = path && firstChild(path, "a:fillToRect");
        return {
          kind: "gradient",
          stops: (gs ? childElements(gs, "a:gs") : []).map((g) => ({ pos: int2(g.attrs["pos"]), color: readDmlColor(g) ?? { kind: "srgbClr", val: "000000" } })),
          ...lin2 ? { lin: { ang: int2(lin2.attrs["ang"]), scaled: bool2(lin2.attrs["scaled"]) } } : {},
          ...path ? { path: { path: path.attrs["path"] ?? "circle", ...ftr ? { fillToRect: { l: int2(ftr.attrs["l"]), t: int2(ftr.attrs["t"]), r: int2(ftr.attrs["r"]), b: int2(ftr.attrs["b"]) } } : {} } } : {},
          ...k.attrs["rotWithShape"] !== void 0 ? { rotWithShape: bool2(k.attrs["rotWithShape"]) } : {},
          ...k.attrs["flip"] ? { flip: k.attrs["flip"] } : {},
          ...firstChild(k, "a:tileRect") ? { tileRect: true } : {}
        };
      }
      case "a:pattFill":
        return { kind: "pattern", prst: k.attrs["prst"] ?? "pct5", fg: readDmlColor(firstChild(k, "a:fgClr")) ?? { kind: "srgbClr", val: "000000" }, bg: readDmlColor(firstChild(k, "a:bgClr")) ?? { kind: "srgbClr", val: "FFFFFF" } };
      case "a:blipFill": {
        const blip = firstChild(k, "a:blip");
        const tile = firstChild(k, "a:tile");
        const amf = blip && firstChild(blip, "a:alphaModFix");
        if (!blip?.attrs["r:embed"]) return { kind: "raw", xml: raw.slice(k.s, k.e) };
        return {
          kind: "picture",
          embed: blip.attrs["r:embed"],
          ...tile ? { tile: { tx: int2(tile.attrs["tx"]), ty: int2(tile.attrs["ty"]), sx: int2(tile.attrs["sx"], 1e5), sy: int2(tile.attrs["sy"], 1e5), flip: tile.attrs["flip"] ?? "none", algn: tile.attrs["algn"] ?? "tl" } } : {},
          ...amf ? { alpha: int2(amf.attrs["amt"], 1e5) } : {}
        };
      }
      case "a:grpFill":
        return { kind: "raw", xml: raw.slice(k.s, k.e) };
    }
  }
  return { kind: "style" };
}
function readStyleRefs(st) {
  if (!st) return void 0;
  const ref = (n) => {
    const e = firstChild(st, n);
    return { idx: int2(e?.attrs["idx"]), color: readDmlColor(e) ?? null };
  };
  const fr = firstChild(st, "a:fontRef");
  return {
    ln: ref("a:lnRef"),
    fill: ref("a:fillRef"),
    effect: ref("a:effectRef"),
    font: { idx: fr?.attrs["idx"] ?? "minor", color: readDmlColor(fr) ?? null }
  };
}
function readBody(b) {
  if (!b) return void 0;
  const a = b.attrs;
  const anc = a["anchor"];
  return {
    lIns: int2(a["lIns"], 91440),
    tIns: int2(a["tIns"], 45720),
    rIns: int2(a["rIns"], 91440),
    bIns: int2(a["bIns"], 45720),
    anchor: anc === "ctr" || anc === "b" ? anc : "t",
    anchorCtr: bool2(a["anchorCtr"]),
    vert: a["vert"] ?? "horz",
    wrap: a["wrap"] === "none" ? "none" : "square",
    autofit: firstChild(b, "a:spAutoFit") ? "shape" : firstChild(b, "a:normAutofit") ? "norm" : "none",
    upright: bool2(a["upright"]),
    rot: int2(a["rot"])
  };
}
function readShapeFormat(raw) {
  const base = readPictureFormat(raw, { anyShape: true });
  if (!base) return void 0;
  let p;
  try {
    p = partsOf(raw);
  } catch {
    return void 0;
  }
  const wsp = p.wsp;
  if (!wsp) return void 0;
  const { blip: _b2, srcRect: _s, embed: _e, ...rest } = base;
  const nv = firstChild(wsp, "wps:cNvSpPr");
  const txbx = firstChild(wsp, "wps:txbx"), linked = firstChild(wsp, "wps:linkedTxbx");
  const out = {
    ...rest,
    fill: readFill(p.spPr, raw),
    textbox: bool2(nv?.attrs["txBox"])
  };
  const st = readStyleRefs(firstChild(wsp, "wps:style"));
  if (st) out.style = st;
  if (txbx || linked) {
    const body = readBody(firstChild(wsp, "wps:bodyPr"));
    out.body = body ?? { ...DEFAULT_TEXTBOX_BODY };
    out.story = linked ? { kind: "linked", id: int2(linked.attrs["id"]), seq: int2(linked.attrs["seq"], 1) } : { kind: "txbx", ...txbx.attrs["id"] !== void 0 ? { id: int2(txbx.attrs["id"]) } : {} };
  }
  if (bool2(wsp.attrs["normalEastAsianFlow"])) out.normalEastAsianFlow = true;
  return out;
}
function shapeFillXml(f) {
  switch (f.kind) {
    case "none":
      return "<a:noFill/>";
    case "style":
      return "";
    case "solid":
      return `<a:solidFill>${dmlColorXml(f.color)}</a:solidFill>`;
    case "gradient": {
      const gs = f.stops.map((s) => `<a:gs pos="${Math.round(s.pos)}">${dmlColorXml(s.color)}</a:gs>`).join("");
      const shade = f.path ? `<a:path path="${f.path.path}">${f.path.fillToRect ? `<a:fillToRect l="${f.path.fillToRect.l}" t="${f.path.fillToRect.t}" r="${f.path.fillToRect.r}" b="${f.path.fillToRect.b}"/>` : ""}</a:path>` : f.lin ? `<a:lin ang="${Math.round(f.lin.ang)}" scaled="${f.lin.scaled ? 1 : 0}"/>` : "";
      return `<a:gradFill${f.flip ? ` flip="${f.flip}"` : ""}${f.rotWithShape !== void 0 ? ` rotWithShape="${f.rotWithShape ? 1 : 0}"` : ""}><a:gsLst>${gs}</a:gsLst>${shade}${f.tileRect ? "<a:tileRect/>" : ""}</a:gradFill>`;
    }
    case "pattern":
      return `<a:pattFill prst="${f.prst}"><a:fgClr>${dmlColorXml(f.fg)}</a:fgClr><a:bgClr>${dmlColorXml(f.bg)}</a:bgClr></a:pattFill>`;
    case "picture": {
      const blip = f.alpha !== void 0 && f.alpha < 1e5 ? `<a:blip r:embed="${f.embed}"><a:alphaModFix amt="${Math.round(f.alpha)}"/></a:blip>` : `<a:blip r:embed="${f.embed}"/>`;
      const t = f.tile;
      return `<a:blipFill>${blip}${t ? `<a:tile tx="${t.tx}" ty="${t.ty}" sx="${t.sx}" sy="${t.sy}" flip="${t.flip}" algn="${t.algn}"/>` : "<a:stretch><a:fillRect/></a:stretch>"}</a:blipFill>`;
    }
    case "raw":
      return f.xml;
  }
}
function styleRefsXml(s) {
  const c = (x2) => x2 ? dmlColorXml(x2) : '<a:scrgbClr r="0" g="0" b="0"/>';
  return `<wps:style><a:lnRef idx="${s.ln.idx}">${c(s.ln.color)}</a:lnRef><a:fillRef idx="${s.fill.idx}">${c(s.fill.color)}</a:fillRef><a:effectRef idx="${s.effect.idx}">${c(s.effect.color)}</a:effectRef><a:fontRef idx="${s.font.idx}">${s.font.color ? dmlColorXml(s.font.color) : ""}</a:fontRef></wps:style>`;
}
function bodyPrXml(b) {
  return `<wps:bodyPr rot="${b.rot}" spcFirstLastPara="0" vertOverflow="overflow" horzOverflow="overflow" vert="${b.vert}" wrap="${b.wrap}" lIns="${Math.round(b.lIns)}" tIns="${Math.round(b.tIns)}" rIns="${Math.round(b.rIns)}" bIns="${Math.round(b.bIns)}" numCol="1" spcCol="0" rtlCol="0" fromWordArt="0" anchor="${b.anchor}" anchorCtr="${b.anchorCtr ? 1 : 0}" forceAA="0"${b.upright ? ' upright="1"' : ""} compatLnSpc="1"><a:prstTxWarp prst="textNoShape"><a:avLst/></a:prstTxWarp>${b.autofit === "shape" ? "<a:spAutoFit/>" : b.autofit === "norm" ? "<a:normAutofit/>" : "<a:noAutofit/>"}</wps:bodyPr>`;
}
var FILL_NAMES = ["a:noFill", "a:solidFill", "a:gradFill", "a:blipFill", "a:pattFill", "a:grpFill"];
var WSP_ORDER = ["wps:cNvPr", "wps:cNvSpPr", "wps:cNvCnPr", "wps:nvPr", "wps:spPr", "wps:style", "wps:extLst", "wps:txbx", "wps:linkedTxbx", "wps:bodyPr"];
function patchShape(raw, ch) {
  let xml = patchPicture(raw, ch);
  if (ch.stylePreset) xml = patchStylePreset(xml, ch.stylePreset);
  if (ch.outline !== void 0) xml = patchOutline(xml, ch.outline, readPictureFormat(raw, { anyShape: true })?.line);
  if (ch.fill !== void 0) xml = patchFill(xml, ch.fill);
  if (ch.style !== void 0) xml = patchStyle(xml, ch.style);
  if (ch.body) xml = patchBody(xml, ch.body);
  if (ch.story) xml = patchStory(xml, ch.story);
  return xml;
}
function patchFill(raw, f) {
  const p = partsOf(raw);
  const sp = p.spPr;
  if (!sp) return raw;
  const patch2 = new XmlPatch(raw);
  const cur = childElements(sp).filter((k) => FILL_NAMES.includes(k.name));
  const xml = shapeFillXml(f);
  if (cur.length) {
    patch2.replace(cur[0], xml);
    for (const k of cur.slice(1)) patch2.remove(k);
  } else if (xml) patch2.insertChild(sp, "a:solidFill", xml, SPPR_ORDER);
  return patch2.apply();
}
function patchStylePreset(raw, sp) {
  const p = partsOf(raw);
  if (!p.wsp || !p.spPr) return raw;
  const patch2 = new XmlPatch(raw);
  const kids = childElements(p.spPr);
  const old = kids.filter((k) => FILL_NAMES.includes(k.name) || k.name === "a:ln");
  for (const k of old) patch2.remove(k);
  const geom = kids.filter((k) => k.name === "a:xfrm" || k.name === "a:prstGeom" || k.name === "a:custGeom").pop();
  if (geom) patch2.insertAt(geom.e, sp.spPr);
  else if (p.spPr.cs === p.spPr.e) patch2.setContent(p.spPr, sp.spPr);
  else patch2.insertAt(p.spPr.cs, sp.spPr);
  patch2.putChild(p.wsp, "wps:style", sp.style, WSP_ORDER);
  return patch2.apply();
}
function patchStyle(raw, s) {
  const p = partsOf(raw);
  if (!p.wsp) return raw;
  const patch2 = new XmlPatch(raw);
  patch2.putChild(p.wsp, "wps:style", s ? styleRefsXml(s) : "", WSP_ORDER);
  return patch2.apply();
}
function patchBody(raw, b) {
  const p = partsOf(raw);
  if (!p.wsp) return raw;
  const el3 = firstChild(p.wsp, "wps:bodyPr");
  const cur = readBody(el3) ?? { ...DEFAULT_TEXTBOX_BODY };
  const next = { ...cur, ...b };
  const patch2 = new XmlPatch(raw);
  if (!el3) {
    patch2.insertChild(p.wsp, "wps:bodyPr", bodyPrXml(next), WSP_ORDER);
    return patch2.apply();
  }
  const set = {};
  const map = [
    ["lIns", "lIns", (v) => Math.round(v)],
    ["tIns", "tIns", (v) => Math.round(v)],
    ["rIns", "rIns", (v) => Math.round(v)],
    ["bIns", "bIns", (v) => Math.round(v)],
    ["anchor", "anchor", (v) => v],
    ["anchorCtr", "anchorCtr", (v) => v ? 1 : 0],
    ["vert", "vert", (v) => v],
    ["wrap", "wrap", (v) => v],
    ["upright", "upright", (v) => v ? 1 : void 0],
    ["rot", "rot", (v) => v]
  ];
  for (const [k, attr2, f] of map) if (b[k] !== void 0 && b[k] !== cur[k]) set[attr2] = f(b[k]);
  if (Object.keys(set).length) patch2.setAttrs(el3, set);
  if (b.autofit !== void 0 && b.autofit !== cur.autofit) {
    const fitXml = b.autofit === "shape" ? "<a:spAutoFit/>" : b.autofit === "norm" ? "<a:normAutofit/>" : "<a:noAutofit/>";
    const old = childElements(el3).find((k) => k.name === "a:spAutoFit" || k.name === "a:noAutofit" || k.name === "a:normAutofit");
    if (old) patch2.replace(old, fitXml);
    else if (el3.cs === el3.e) patch2.setContent(el3, fitXml);
    else patch2.insertAt(el3.ce, fitXml);
  }
  return patch2.apply();
}
function patchStory(raw, s) {
  const p = partsOf(raw);
  if (!p.wsp) return raw;
  const txbx = firstChild(p.wsp, "wps:txbx"), linked = firstChild(p.wsp, "wps:linkedTxbx");
  const cur = txbx ?? linked;
  if (!cur) return raw;
  const patch2 = new XmlPatch(raw);
  if (s.kind === "linked") patch2.replace(cur, `<wps:linkedTxbx id="${s.id}" seq="${s.seq}"/>`);
  else if (txbx && s.content === void 0) patch2.setAttrs(txbx, { id: s.id });
  else patch2.replace(cur, `<wps:txbx${s.id !== void 0 ? ` id="${s.id}"` : ""}><w:txbxContent>${s.content ?? "<w:p/>"}</w:txbxContent></wps:txbx>`);
  return patch2.apply();
}
var NEW_TEXTBOX_LINE = { w: 6350, fill: { kind: "prstClr", val: "black" } };
var NEW_TEXTBOX_FILL = { kind: "solid", color: { kind: "schemeClr", val: "lt1" } };
var posXml2 = (tag, p) => {
  if (p.align === void 0 && p.pct !== void 0) {
    const pct2 = tag === "wp:positionH" ? "wp14:pctPosHOffset" : "wp14:pctPosVOffset";
    return `<mc:AlternateContent><mc:Choice Requires="wp14"><${tag} relativeFrom="${p.relativeFrom}"><${pct2}>${Math.round(p.pct)}</${pct2}></${tag}></mc:Choice><mc:Fallback><${tag} relativeFrom="page"><wp:posOffset>${Math.round(p.fallback ?? 0)}</wp:posOffset></${tag}></mc:Fallback></mc:AlternateContent>`;
  }
  return `<${tag} relativeFrom="${p.relativeFrom}">${p.align !== void 0 ? `<wp:align>${p.align}</wp:align>` : `<wp:posOffset>${Math.round(p.offset ?? 0)}</wp:posOffset>`}</${tag}>`;
};
function newTextboxDrawingXml(o) {
  const cx = Math.round(o.cx), cy = Math.round(o.cy);
  const d = o.dist ?? { t: 0, b: 0, l: 114300, r: 114300 };
  const wrap = o.wrap === "square" ? '<wp:wrapSquare wrapText="bothSides"/>' : o.wrap === "topAndBottom" ? "<wp:wrapTopAndBottom/>" : "<wp:wrapNone/>";
  const ln2 = o.line === null ? "<a:ln><a:noFill/></a:ln>" : picLineXmlLocal(o.line ?? NEW_TEXTBOX_LINE);
  const fill = shapeFillXml(o.fill ?? NEW_TEXTBOX_FILL);
  const geom = o.geom ?? { prst: "rect" };
  const adj = Object.entries(geom.adj ?? {}).map(([n, v]) => `<a:gd name="${n}" fmla="val ${Math.round(v)}"/>`).join("");
  const story = o.linked ? `<wps:linkedTxbx id="${o.linked.id}" seq="${o.linked.seq}"/>` : `<wps:txbx><w:txbxContent>${o.content || "<w:p/>"}</w:txbxContent></wps:txbx>`;
  return `<w:drawing><wp:anchor distT="${d.t}" distB="${d.b}" distL="${d.l}" distR="${d.r}" simplePos="0" relativeHeight="${o.relativeHeight}" behindDoc="${o.behindDoc ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>` + posXml2("wp:positionH", o.posH ?? { relativeFrom: "column", offset: 0 }) + posXml2("wp:positionV", o.posV ?? { relativeFrom: "paragraph", offset: 0 }) + `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${o.id}" name="${escAttr(o.name)}"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${geom.prst}"><a:avLst${adj ? `>${adj}</a:avLst>` : "/>"}</a:prstGeom>${o.spPrRaw ?? `${fill}${ln2}${o.spPrExtra ?? ""}`}</wps:spPr>` + (o.style ? styleRefsXml(o.style) : "") + story + bodyPrXml({ ...DEFAULT_TEXTBOX_BODY, ...o.body ?? {} }) + "</wps:wsp></a:graphicData></a:graphic>" + (o.sizeRelH ? `<wp14:sizeRelH relativeFrom="${o.sizeRelH.relativeFrom}"><wp14:pctWidth>${Math.round(o.sizeRelH.pct)}</wp14:pctWidth></wp14:sizeRelH>` : "") + (o.sizeRelV ? `<wp14:sizeRelV relativeFrom="${o.sizeRelV.relativeFrom}"><wp14:pctHeight>${Math.round(o.sizeRelV.pct)}</wp14:pctHeight></wp14:sizeRelV>` : "") + "</wp:anchor></w:drawing>";
}
function picLineXmlLocal(l) {
  const attrs3 = `${l.w !== void 0 ? ` w="${Math.round(l.w)}"` : ""}${l.cap ? ` cap="${l.cap}"` : ""}${l.cmpd ? ` cmpd="${l.cmpd}"` : ""}${l.algn ? ` algn="${l.algn}"` : ""}`;
  let inner = "";
  if (l.fill === null) inner += "<a:noFill/>";
  else if (l.fill) inner += `<a:solidFill>${dmlColorXml(l.fill)}</a:solidFill>`;
  else if (l.fillRaw) inner += l.fillRaw;
  if (l.dash) inner += `<a:prstDash val="${l.dash}"/>`;
  if (l.join === "round") inner += "<a:round/>";
  else if (l.join === "bevel") inner += "<a:bevel/>";
  else if (l.join === "miter") inner += l.miterLim !== void 0 ? `<a:miter lim="${l.miterLim}"/>` : "<a:miter/>";
  if (l.tailRaw) inner += l.tailRaw;
  return inner ? `<a:ln${attrs3}>${inner}</a:ln>` : `<a:ln${attrs3}/>`;
}
var HIDDEN_LINE_URI = "{91240B29-F687-4F45-9708-019B960494DF}";
function hiddenLineXml(prev) {
  const w = prev?.w !== void 0 ? ` w="${Math.round(prev.w)}"` : "";
  const fill = prev?.fill ? `<a:solidFill>${dmlColorXml(prev.fill)}</a:solidFill>` : '<a:solidFill><a:prstClr val="black"/></a:solidFill>';
  return {
    ln: `<a:ln${w}><a:noFill/></a:ln>`,
    ext: `<a:ext uri="${HIDDEN_LINE_URI}"><a14:hiddenLine xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"${w}>${fill}</a14:hiddenLine></a:ext>`
  };
}
function patchOutline(raw, line, prev) {
  const p = partsOf(raw);
  const sp = p.spPr;
  if (!sp) return raw;
  const patch2 = new XmlPatch(raw);
  const ext = firstChild(sp, "a:extLst");
  const hid = ext && childElements(ext, "a:ext").find((e) => e.attrs["uri"] === HIDDEN_LINE_URI);
  if (line === null) {
    const h = hiddenLineXml(prev && prev.fill !== null ? prev : { w: prev?.w ?? 6350 });
    patch2.putChild(sp, "a:ln", h.ln, SPPR_ORDER);
    if (hid) patch2.replace(hid, h.ext);
    else if (ext) patch2.insertAt(ext.ce, h.ext);
    else patch2.insertChild(sp, "a:extLst", `<a:extLst>${h.ext}</a:extLst>`, SPPR_ORDER);
  } else {
    patch2.putChild(sp, "a:ln", picLineXmlLocal(line), SPPR_ORDER);
    if (hid) {
      if (childElements(ext).length === 1) patch2.remove(ext);
      else patch2.remove(hid);
    }
  }
  return patch2.apply();
}
function vmlPt(emu2) {
  const v = Math.round(emu2 / 12700 * 100) / 100;
  if (v === 0) return "0";
  let s = String(v);
  if (s.startsWith("0.")) s = s.slice(1);
  else if (s.startsWith("-0.")) s = `-${s.slice(2)}`;
  return `${s}pt`;
}
var VML_NAMED = { "000000": "black", "FFFFFF": "white", "FF0000": "red", "00FF00": "lime", "0000FF": "blue", "FFFF00": "yellow" };
function vmlColorOf(hex2) {
  const h = hex2.toUpperCase();
  if (VML_NAMED[h]) return VML_NAMED[h];
  const l = h.toLowerCase();
  if (l[0] === l[1] && l[2] === l[3] && l[4] === l[5]) return `#${l[0]}${l[2]}${l[4]}`;
  return `#${l}`;
}
var H_REL = { column: "text", page: "page", margin: "margin", character: "char", leftMargin: "left-margin-area", rightMargin: "right-margin-area", insideMargin: "inner-margin-area", outsideMargin: "outer-margin-area" };
var V_REL = { paragraph: "text", page: "page", margin: "margin", line: "line", topMargin: "top-margin-area", bottomMargin: "bottom-margin-area", insideMargin: "inner-margin-area", outsideMargin: "outer-margin-area" };
var FLOW = { vert: "layout-flow:vertical", vert270: "layout-flow:vertical;mso-layout-flow-alt:bottom-to-top", eaVert: "layout-flow:vertical-ideographic", mongolianVert: "layout-flow:vertical;mso-layout-flow-alt:top-to-bottom", wordArtVert: "layout-flow:vertical;mso-layout-flow-alt:top-to-bottom", wordArtVertRtl: "layout-flow:vertical;mso-layout-flow-alt:top-to-bottom" };
function vmlFallback(drawingXml2, content, o) {
  const f = readShapeFormat(drawingXml2);
  if (!f) return "";
  const body = f.body ?? DEFAULT_TEXTBOX_BODY;
  const style = [];
  const posPart = (p, axis) => {
    style.push(`margin-${axis === "h" ? "left" : "top"}:${p?.align !== void 0 ? "0" : vmlPt(p?.offset ?? 0)}`);
  };
  if (!f.inline) {
    style.push("position:absolute");
    posPart(f.posH, "h");
    posPart(f.posV, "v");
  }
  style.push(`width:${vmlPt(f.cx)}`, `height:${vmlPt(f.cy)}`);
  if (f.rot) style.push(`rotation:${Math.round(f.rot / 6e4 * 100) / 100}`);
  if (f.flipH || f.flipV) style.push(`flip:${[f.flipH ? "x" : "", f.flipV ? "y" : ""].join("")}`);
  if (!f.inline) {
    const rh = f.relativeHeight ?? 251659264;
    style.push(`z-index:${f.behindDoc ? -(rh - 2048) : rh}`);
  }
  style.push(`visibility:${f.docPr.hidden ? "hidden" : "visible"}`);
  style.push(`mso-wrap-style:${body.wrap}`);
  if (!f.inline) {
    style.push(`mso-wrap-distance-left:${vmlPt(f.dist.l)}`, `mso-wrap-distance-top:${vmlPt(f.dist.t)}`, `mso-wrap-distance-right:${vmlPt(f.dist.r)}`, `mso-wrap-distance-bottom:${vmlPt(f.dist.b)}`);
    const hRel = H_REL[f.posH?.relativeFrom ?? "column"] ?? "text", vRel = V_REL[f.posV?.relativeFrom ?? "paragraph"] ?? "text";
    style.push(`mso-position-horizontal:${f.posH?.align ?? "absolute"}`, `mso-position-horizontal-relative:${hRel}`);
    style.push(`mso-position-vertical:${f.posV?.align ?? "absolute"}`, `mso-position-vertical-relative:${vRel}`);
    if (f.sizeRelH?.pct) style.push(`mso-width-percent:${Math.round(f.sizeRelH.pct / 100)}`, `mso-width-relative:${f.sizeRelH.relativeFrom}`);
    if (f.sizeRelV?.pct) style.push(`mso-height-percent:${Math.round(f.sizeRelV.pct / 100)}`, `mso-height-relative:${f.sizeRelV.relativeFrom}`);
  }
  style.push(`v-text-anchor:${body.anchor === "ctr" ? "middle" : body.anchor === "b" ? "bottom" : "top"}`);
  const attrs3 = [];
  let fillEl = "";
  const fl2 = f.fill;
  const color1 = fl2.kind === "solid" ? fl2.color : fl2.kind === "gradient" ? fl2.stops[0]?.color : fl2.kind === "pattern" ? fl2.bg : void 0;
  if (fl2.kind === "none") {
    attrs3.push('filled="f"');
    fillEl = '<v:fill o:detectmouseclick="t"/>';
  } else if (color1) {
    attrs3.push(`fillcolor="${vmlColorOf(o.color(color1))}"`);
    const al = color1.mods?.find((m) => m[0] === "alpha")?.[1];
    if (al !== void 0 && al < 1e5) fillEl = `<v:fill opacity="${Math.floor(Math.round(al / 1e5 * 255) / 255 * 65536)}f"/>`;
  }
  const ln2 = f.line;
  let strokeEl = "";
  if (ln2 === null || ln2 && ln2.fill === null) {
    attrs3.push('stroked="f"');
    if (ln2?.w !== void 0) attrs3.push(`strokeweight="${vmlPt(ln2.w)}"`);
  } else if (ln2) {
    if (ln2.fill) {
      const c = o.color(ln2.fill);
      if (c.toUpperCase() !== "000000") attrs3.push(`strokecolor="${vmlColorOf(c)}"`);
    }
    attrs3.push(`strokeweight="${vmlPt(ln2.w ?? 9525)}"`);
    const sub = [];
    if (ln2.dash && ln2.dash !== "solid") sub.push(`dashstyle="${ln2.dash}"`);
    if (ln2.cmpd && ln2.cmpd !== "sng") sub.push(`linestyle="${ln2.cmpd}"`);
    if (sub.length) strokeEl = `<v:stroke ${sub.join(" ")}/>`;
  }
  const rect = f.geom === "rect" || f.geom === "custom";
  let typeAttr = ' type="#_x0000_t202"';
  let shapetype = rect ? '<v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>' : "";
  let tag = "v:shape";
  if (f.geom === "roundRect") {
    tag = "v:roundrect";
    typeAttr = ` arcsize="${Math.round((f.adj?.["adj"] ?? 16667) / 1e5 * 65536)}f"`;
  } else if (f.geom === "ellipse") {
    tag = "v:oval";
    typeAttr = "";
  } else if (!rect && o.outline) {
    const cx = Math.max(1, Math.round(f.cx)), cy = Math.max(1, Math.round(f.cy));
    const path = o.outline(f.geom, f.adj, cx, cy);
    if (path) {
      typeAttr = ` coordsize="${cx},${cy}" o:spt="100" path="${path}"`;
      shapetype = "";
    }
  }
  const tbStyle = [];
  if (body.vert !== "horz" && FLOW[body.vert]) tbStyle.push(FLOW[body.vert]);
  if (body.autofit === "shape") tbStyle.push("mso-fit-shape-to-text:t");
  if (o.next) tbStyle.push(`mso-next-textbox:#${o.next}`);
  const ins = [body.lIns, body.tIns, body.rIns, body.bIns];
  const defIns = ins[0] === 91440 && ins[1] === 45720 && ins[2] === 91440 && ins[3] === 45720;
  const insetAttr = defIns ? "" : ` inset="${ins.map((v) => vmlPt(v)).join(",")}"`;
  const tbAttrs = `${insetAttr}${tbStyle.length ? ` style="${tbStyle.join(";")}"` : ""}`;
  const name = f.docPr.name ?? `_x0000_s${o.spid}`;
  const alt = f.docPr.descr || f.docPr.title ? ` alt="${escAttr([f.docPr.title ? `T\xEDtulo: ${f.docPr.title}` : "", f.docPr.descr ? `Descri\xE7\xE3o: ${f.docPr.descr}` : ""].filter(Boolean).join(" - "))}"` : "";
  const wrapType = f.wrap === "square" ? "square" : f.wrap === "tight" ? "tight" : f.wrap === "through" ? "through" : f.wrap === "topAndBottom" ? "topAndBottom" : void 0;
  const ax = f.posH?.relativeFrom && f.posH.relativeFrom !== "column" ? H_REL[f.posH.relativeFrom] === "char" ? "char" : f.posH.relativeFrom === "page" ? "page" : "margin" : void 0;
  const ay = f.posV?.relativeFrom && f.posV.relativeFrom !== "paragraph" ? f.posV.relativeFrom === "line" ? "line" : f.posV.relativeFrom === "page" ? "page" : "margin" : void 0;
  const w10 = !f.inline && (wrapType || ax || ay) ? `<w10:wrap${wrapType ? ` type="${wrapType}"` : ""}${ax ? ` anchorx="${ax}"` : ""}${ay ? ` anchory="${ay}"` : ""}/>` : "";
  return `<mc:Fallback><w:pict>${shapetype}<${tag} id="${escAttr(name)}" o:spid="_x0000_s${o.spid}"${typeAttr} style="${style.join(";")}"${alt}${attrs3.length ? ` ${attrs3.join(" ")}` : ""}>${fillEl}${strokeEl}<v:textbox${tbAttrs}><w:txbxContent>${content}</w:txbxContent></v:textbox>${w10}</${tag}></w:pict></mc:Fallback>`;
}
function textboxAlternateContent(drawingXml2, content, o) {
  return `<mc:AlternateContent><mc:Choice Requires="wps">${drawingXml2}</mc:Choice>${vmlFallback(drawingXml2, content, o)}</mc:AlternateContent>`;
}

// ../docx-core/src/vml-shape.ts
var EMU_PER_TWIP = 635;
var emu = (v) => {
  const t = vmlLenTwips(v);
  return t === void 0 ? void 0 : Math.round(t * EMU_PER_TWIP);
};
var REL_H = { text: "column", page: "page", margin: "margin", char: "character", "left-margin-area": "leftMargin", "right-margin-area": "rightMargin", "inner-margin-area": "insideMargin", "outer-margin-area": "outsideMargin" };
var REL_V = { text: "paragraph", page: "page", margin: "margin", line: "line", "top-margin-area": "topMargin", "bottom-margin-area": "bottomMargin", "inner-margin-area": "insideMargin", "outer-margin-area": "outsideMargin" };
var FLOW2 = { "vertical|bottom-to-top": "vert270", "vertical|top-to-bottom": "mongolianVert", "vertical|": "vert", "vertical-ideographic|": "eaVert" };
var frac = (v) => {
  if (!v) return void 0;
  const n = v.endsWith("f") ? parseInt(v, 10) / 65536 : parseFloat(v);
  return Number.isFinite(n) ? n : void 0;
};
var rgb = (hex2, alpha) => ({ kind: "srgbClr", val: hex2, ...alpha !== void 0 && alpha < 0.999 ? { mods: [["alpha", Math.round(alpha * 1e5)]] } : {} });
function vmlTextboxToDrawing(el3, id, lang = "pt") {
  const a = el3.attrs;
  const st = parseVmlStyle(a["style"]);
  if (st["position"] !== "absolute") return void 0;
  const txb = firstChild(el3, "v:textbox");
  if (!txb) return void 0;
  const cx = emu(st["width"]) ?? 0, cy = emu(st["height"]) ?? 0;
  if (!(cx > 0) || !(cy > 0)) return void 0;
  const pos = (axis) => {
    const rel = st[`mso-position-${axis === "h" ? "horizontal" : "vertical"}-relative`] ?? "text";
    const relativeFrom = (axis === "h" ? REL_H : REL_V)[rel] ?? (axis === "h" ? "column" : "paragraph");
    const al = st[`mso-position-${axis === "h" ? "horizontal" : "vertical"}`];
    if (al && al !== "absolute") return { relativeFrom, align: al };
    const off = (emu(st[axis === "h" ? "margin-left" : "margin-top"]) ?? 0) + (emu(st[axis === "h" ? "left" : "top"]) ?? 0);
    return { relativeFrom, offset: off };
  };
  const z = parseInt(st["z-index"] ?? "0", 10) || 0;
  const wrapEl = firstChild(el3, "w10:wrap");
  const wt = wrapEl?.attrs["type"];
  const dist = (k) => emu(st[`mso-wrap-distance-${k}`]) ?? (k === "left" || k === "right" ? 114300 : 0);
  const fillEl = firstChild(el3, "v:fill");
  const filled = a["filled"] ?? fillEl?.attrs["on"];
  let fill;
  if (filled === "f" || filled === "false") fill = { kind: "none" };
  else {
    const c1 = vmlColor(fillEl?.attrs["color"] ?? a["fillcolor"]) ?? "FFFFFF";
    const op = frac(fillEl?.attrs["opacity"]);
    if (fillEl?.attrs["type"] === "gradient" || fillEl?.attrs["type"] === "gradientRadial") {
      const c2 = vmlColor(fillEl.attrs["color2"]) ?? "FFFFFF";
      const ang = parseFloat(fillEl.attrs["angle"] ?? "0") || 0;
      fill = { kind: "gradient", stops: [{ pos: 0, color: rgb(c1, op) }, { pos: 1e5, color: rgb(c2, op) }], lin: { ang: Math.round(((90 - ang) % 360 + 360) % 360 * 6e4), scaled: true }, rotWithShape: true };
    } else fill = { kind: "solid", color: rgb(c1, op) };
  }
  const strokeEl = firstChild(el3, "v:stroke");
  const stroked = a["stroked"] ?? strokeEl?.attrs["on"];
  const sw = a["strokeweight"] ?? strokeEl?.attrs["weight"];
  const w = sw ? emu(/[a-z]$/.test(sw) ? sw : `${sw}pt`) ?? 9525 : 9525;
  let line;
  if (stroked === "f" || stroked === "false") line = null;
  else {
    line = { w, fill: rgb(vmlColor(strokeEl?.attrs["color"] ?? a["strokecolor"]) ?? "000000") };
    const d = strokeEl?.attrs["dashstyle"];
    if (d && d !== "solid") line.dash = d;
    const ls = strokeEl?.attrs["linestyle"];
    if (ls && ls !== "single") line.cmpd = { thinThin: "dbl", thinThick: "thinThick", thickThin: "thickThin", thickBetweenThin: "tri" }[ls];
  }
  const ts = parseVmlStyle(txb.attrs["style"]);
  const ins = (txb.attrs["inset"] ?? "").split(",");
  const inset = (i2, d) => {
    const v = ins[i2]?.trim();
    return v ? emu(v) ?? d : d;
  };
  const va = st["v-text-anchor"] ?? "";
  const vert = ts["layout-flow"] ? FLOW2[`${ts["layout-flow"]}|${ts["mso-layout-flow-alt"] ?? ""}`] ?? FLOW2[`${ts["layout-flow"]}|`] : void 0;
  const geom = el3.name === "v:roundrect" ? { prst: "roundRect", adj: { adj: Math.round((frac(a["arcsize"]) ?? 0.1667) * 1e5) } } : el3.name === "v:oval" ? { prst: "ellipse" } : { prst: "rect" };
  const vmlName = a["id"] && !/^_x0000_/.test(a["id"]) ? a["id"] : void 0;
  let xml = newTextboxDrawingXml({
    id,
    name: vmlName ?? `${lang === "pt" ? "Caixa de Texto" : "Text Box"} ${id}`,
    cx,
    cy,
    posH: pos("h"),
    posV: pos("v"),
    relativeHeight: Math.abs(z),
    behindDoc: z < 0,
    wrap: wt === "square" ? "square" : wt === "topAndBottom" ? "topAndBottom" : "none",
    dist: { t: dist("top"), b: dist("bottom"), l: dist("left"), r: dist("right") },
    fill,
    line,
    geom,
    body: {
      lIns: inset(0, 91440),
      tIns: inset(1, 45720),
      rIns: inset(2, 91440),
      bIns: inset(3, 45720),
      anchor: va.startsWith("middle") ? "ctr" : va.startsWith("bottom") ? "b" : "t",
      ...vert ? { vert } : {},
      ...st["mso-wrap-style"] === "none" ? { wrap: "none" } : {},
      ...ts["mso-fit-shape-to-text"] === "t" ? { autofit: "shape" } : {}
    },
    content: "<w:p/>"
  });
  const rot = parseFloat(st["rotation"] ?? "0") || 0;
  const flip = st["flip"] ?? "";
  const alt = a["alt"];
  xml = patchShape(xml, {
    ...wt === "tight" || wt === "through" ? { wrap: wt } : {},
    ...rot ? { rot: Math.round((rot % 360 + 360) % 360 * 6e4) } : {},
    ...flip.includes("x") ? { flipH: true } : {},
    ...flip.includes("y") ? { flipV: true } : {},
    ...alt ? { descr: alt } : {},
    ...a["o:title"] ? { title: a["o:title"] } : {},
    ...st["visibility"] === "hidden" ? { hidden: true } : {}
  });
  return xml;
}
function vmlSingleTextbox(pict) {
  const shapes = childElements(pict).filter((k) => k.name !== "v:shapetype" && k.name.startsWith("v:"));
  return shapes.length === 1 && firstChild(shapes[0], "v:textbox") ? shapes[0] : void 0;
}

// ../docx-core/src/ooxml/props.ts
function readRevisionInfo(el3) {
  const info = { author: el3.attrs["w:author"] ?? "" };
  if (el3.attrs["w:date"]) info.date = el3.attrs["w:date"];
  if (el3.attrs["w16du:dateUtc"]) info.dateUtc = el3.attrs["w16du:dateUtc"];
  if (el3.name === "w:moveFrom" || el3.name === "w:moveTo") info.move = true;
  return info;
}
var int3 = (v) => {
  if (v === void 0 || v === "") return void 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : void 0;
};
function measureTwips(v) {
  if (v === void 0 || v === "") return void 0;
  const m = /^(-?[0-9.]+)(mm|cm|in|pt|pc|pi)?$/.exec(v.trim());
  if (!m) return void 0;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "mm":
      return Math.round(n / 25.4 * 1440);
    case "cm":
      return Math.round(n / 2.54 * 1440);
    case "in":
      return Math.round(n * 1440);
    case "pt":
      return Math.round(n * 20);
    case "pc":
    case "pi":
      return Math.round(n * 240);
    default:
      return Math.round(n);
  }
}
function onOffVal(el3) {
  const v = el3.attrs["w:val"];
  return !(v === "0" || v === "false" || v === "off" || v === "none");
}
function colorOf(el3) {
  const c = {};
  if (el3.attrs["w:val"] !== void 0) c.val = el3.attrs["w:val"];
  if (el3.attrs["w:themeColor"]) c.themeColor = el3.attrs["w:themeColor"];
  if (el3.attrs["w:themeTint"]) c.themeTint = el3.attrs["w:themeTint"];
  if (el3.attrs["w:themeShade"]) c.themeShade = el3.attrs["w:themeShade"];
  return c;
}
function readBorder(el3) {
  if (!el3) return void 0;
  const b = { val: el3.attrs["w:val"] ?? "single" };
  const sz = int3(el3.attrs["w:sz"]);
  if (sz !== void 0) b.sz = sz;
  const space = int3(el3.attrs["w:space"]);
  if (space !== void 0) b.space = space;
  if (el3.attrs["w:color"]) b.color = el3.attrs["w:color"];
  if (el3.attrs["w:themeColor"]) b.themeColor = el3.attrs["w:themeColor"];
  if (el3.attrs["w:themeTint"]) b.themeTint = el3.attrs["w:themeTint"];
  if (el3.attrs["w:themeShade"]) b.themeShade = el3.attrs["w:themeShade"];
  if (el3.attrs["w:shadow"] !== void 0) b.shadow = onOffAttr(el3.attrs["w:shadow"]);
  if (el3.attrs["w:frame"] !== void 0) b.frame = onOffAttr(el3.attrs["w:frame"]);
  return b;
}
var onOffAttr = (v) => !(v === "0" || v === "false" || v === "off");
function readShading(el3) {
  if (!el3) return void 0;
  const s = {};
  for (const k of ["val", "color", "fill", "themeFill", "themeFillTint", "themeFillShade", "themeColor"]) {
    const v = el3.attrs[`w:${k}`];
    if (v !== void 0) s[k] = v;
  }
  return s;
}
function readWidth(el3) {
  if (!el3) return void 0;
  const type = el3.attrs["w:type"] ?? "dxa";
  const raw = el3.attrs["w:w"] ?? "0";
  let w;
  if (raw.endsWith("%")) w = Math.round(parseFloat(raw) * 50);
  else w = type === "dxa" ? measureTwips(raw) ?? 0 : int3(raw) ?? 0;
  return { w, type: type === "pct" || type === "auto" || type === "nil" ? type : "dxa" };
}
function readRPr(rPr) {
  if (!rPr) return void 0;
  const p = {};
  for (const el3 of childElements(rPr)) {
    const val3 = el3.attrs["w:val"];
    switch (el3.name) {
      case "w:rStyle":
        if (val3) p.rStyle = val3;
        break;
      case "w:rFonts": {
        const f = {};
        for (const k of ["ascii", "hAnsi", "eastAsia", "cs", "asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme", "hint"]) {
          const v = el3.attrs[`w:${k}`];
          if (v !== void 0) f[k] = v;
        }
        p.rFonts = f;
        break;
      }
      case "w:b":
        p.b = onOffVal(el3);
        break;
      case "w:bCs":
        p.bCs = onOffVal(el3);
        break;
      case "w:i":
        p.i = onOffVal(el3);
        break;
      case "w:iCs":
        p.iCs = onOffVal(el3);
        break;
      case "w:caps":
        p.caps = onOffVal(el3);
        break;
      case "w:smallCaps":
        p.smallCaps = onOffVal(el3);
        break;
      case "w:strike":
        p.strike = onOffVal(el3);
        break;
      case "w:dstrike":
        p.dstrike = onOffVal(el3);
        break;
      case "w:outline":
        p.outline = onOffVal(el3);
        break;
      case "w:shadow":
        p.shadow = onOffVal(el3);
        break;
      case "w:emboss":
        p.emboss = onOffVal(el3);
        break;
      case "w:imprint":
        p.imprint = onOffVal(el3);
        break;
      case "w:vanish":
        p.vanish = onOffVal(el3);
        break;
      case "w:specVanish":
        p.specVanish = onOffVal(el3);
        break;
      case "w:webHidden":
        p.webHidden = onOffVal(el3);
        break;
      case "w:noProof":
        p.noProof = onOffVal(el3);
        break;
      case "w:snapToGrid":
        p.snapToGrid = onOffVal(el3);
        break;
      case "w:rtl":
        p.rtl = onOffVal(el3);
        break;
      case "w:cs":
        p.cs = onOffVal(el3);
        break;
      case "w:color":
        p.color = colorOf(el3);
        break;
      case "w14:textFill": {
        const solid = firstChild(el3, "w14:solidFill");
        const clr = solid && (firstChild(solid, "w14:srgbClr") ?? firstChild(solid, "w14:schemeClr"));
        if (clr) {
          const tf = {};
          const v = clr.attrs["w14:val"];
          if (clr.name === "w14:srgbClr" && v) tf.color = v.toUpperCase();
          else if (v) tf.themeColor = v;
          const a = firstChild(clr, "w14:alpha")?.attrs["w14:val"];
          if (a !== void 0) tf.alpha = Math.max(0, 1 - (parseInt(a, 10) || 0) / 1e5);
          p.textFill = tf;
        } else if (firstChild(el3, "w14:noFill")) p.textFill = { alpha: 0 };
        break;
      }
      case "w14:ligatures":
        p.ligatures = el3.attrs["w14:val"] ?? "standard";
        break;
      case "w:rPrChange":
        p.change = { ...readRevisionInfo(el3), rPr: readRPr(firstChild(el3, "w:rPr")) ?? {} };
        break;
      case "w14:shadow": {
        const emu2 = (k) => (parseInt(el3.attrs[k] ?? "0", 10) || 0) / 12700;
        p.textShadow = { blur: emu2("w14:blurRad"), dist: emu2("w14:dist"), dir: (parseInt(el3.attrs["w14:dir"] ?? "0", 10) || 0) / 6e4 };
        break;
      }
      case "w14:textOutline":
        p.textOutline = !firstChild(el3, "w14:noFill") && !!(firstChild(el3, "w14:solidFill") ?? firstChild(el3, "w14:gradFill"));
        break;
      case "w:spacing": {
        const n = measureTwips(val3);
        if (n !== void 0) p.spacing = n;
        break;
      }
      case "w:w": {
        const n = int3(val3?.replace("%", ""));
        if (n !== void 0) p.w = n;
        break;
      }
      case "w:kern": {
        const n = int3(val3);
        if (n !== void 0) p.kern = n;
        break;
      }
      case "w:position": {
        const n = int3(val3);
        if (n !== void 0) p.position = n;
        break;
      }
      case "w:sz": {
        const n = int3(val3);
        if (n !== void 0) p.sz = n;
        break;
      }
      case "w:szCs": {
        const n = int3(val3);
        if (n !== void 0) p.szCs = n;
        break;
      }
      case "w:highlight":
        if (val3) p.highlight = val3;
        break;
      case "w:u": {
        const u = { val: val3 ?? "single" };
        if (el3.attrs["w:color"]) u.color = el3.attrs["w:color"];
        if (el3.attrs["w:themeColor"]) u.themeColor = el3.attrs["w:themeColor"];
        p.u = u;
        break;
      }
      case "w:effect":
        if (val3) p.effect = val3;
        break;
      case "w:bdr":
        p.bdr = readBorder(el3);
        break;
      case "w:shd":
        p.shd = readShading(el3);
        break;
      case "w:vertAlign":
        if (val3 === "superscript" || val3 === "subscript" || val3 === "baseline") p.vertAlign = val3;
        break;
      case "w:em":
        if (val3) p.em = val3;
        break;
      case "w:lang": {
        const l = {};
        if (el3.attrs["w:val"]) l.val = el3.attrs["w:val"];
        if (el3.attrs["w:eastAsia"]) l.eastAsia = el3.attrs["w:eastAsia"];
        if (el3.attrs["w:bidi"]) l.bidi = el3.attrs["w:bidi"];
        p.lang = l;
        break;
      }
    }
  }
  return p;
}
function readPBdr(el3) {
  if (!el3) return void 0;
  const b = {};
  for (const side of ["top", "left", "bottom", "right", "between", "bar"]) {
    const e = readBorder(firstChild(el3, `w:${side}`) ?? (side === "left" ? firstChild(el3, "w:start") : side === "right" ? firstChild(el3, "w:end") : void 0));
    if (e) b[side] = e;
  }
  return b;
}
var TAB_VALS = /* @__PURE__ */ new Set(["left", "center", "right", "decimal", "bar", "clear", "num", "start", "end"]);
var LEADERS = /* @__PURE__ */ new Set(["none", "dot", "hyphen", "underscore", "heavy", "middleDot"]);
function readPPr(pPr) {
  if (!pPr) return void 0;
  const p = {};
  for (const el3 of childElements(pPr)) {
    const val3 = el3.attrs["w:val"];
    switch (el3.name) {
      case "w:pStyle":
        if (val3) p.pStyle = val3;
        break;
      case "w:keepNext":
        p.keepNext = onOffVal(el3);
        break;
      case "w:keepLines":
        p.keepLines = onOffVal(el3);
        break;
      case "w:pageBreakBefore":
        p.pageBreakBefore = onOffVal(el3);
        break;
      case "w:widowControl":
        p.widowControl = onOffVal(el3);
        break;
      case "w:suppressLineNumbers":
        p.suppressLineNumbers = onOffVal(el3);
        break;
      case "w:suppressAutoHyphens":
        p.suppressAutoHyphens = onOffVal(el3);
        break;
      case "w:kinsoku":
        p.kinsoku = onOffVal(el3);
        break;
      case "w:wordWrap":
        p.wordWrap = onOffVal(el3);
        break;
      case "w:overflowPunct":
        p.overflowPunct = onOffVal(el3);
        break;
      case "w:autoSpaceDE":
        p.autoSpaceDE = onOffVal(el3);
        break;
      case "w:autoSpaceDN":
        p.autoSpaceDN = onOffVal(el3);
        break;
      case "w:bidi":
        p.bidi = onOffVal(el3);
        break;
      case "w:adjustRightInd":
        p.adjustRightInd = onOffVal(el3);
        break;
      case "w:snapToGrid":
        p.snapToGrid = onOffVal(el3);
        break;
      case "w:contextualSpacing":
        p.contextualSpacing = onOffVal(el3);
        break;
      case "w:mirrorIndents":
        p.mirrorIndents = onOffVal(el3);
        break;
      case "w:suppressOverlap":
        p.suppressOverlap = onOffVal(el3);
        break;
      case "w:jc":
        if (val3) p.jc = val3;
        break;
      case "w:textboxTightWrap":
        if (val3) p.textboxTightWrap = val3;
        break;
      case "w:textAlignment":
        if (val3) p.textAlignment = val3;
        break;
      case "w:outlineLvl": {
        const n = int3(val3);
        if (n !== void 0) p.outlineLvl = n;
        break;
      }
      case "w:numPr": {
        const numPr = {};
        const numId = int3(firstChild(el3, "w:numId")?.attrs["w:val"]);
        const ilvl = int3(firstChild(el3, "w:ilvl")?.attrs["w:val"]);
        if (numId !== void 0) numPr.numId = numId;
        if (ilvl !== void 0) numPr.ilvl = ilvl;
        p.numPr = numPr;
        break;
      }
      case "w:pBdr":
        p.pBdr = readPBdr(el3);
        break;
      case "w:shd":
        p.shd = readShading(el3);
        break;
      case "w:tabs": {
        const tabs = [];
        for (const t of childElements(el3, "w:tab")) {
          let v = t.attrs["w:val"] ?? "left";
          if (v === "start") v = "left";
          if (v === "end") v = "right";
          if (!TAB_VALS.has(v)) continue;
          const pos = measureTwips(t.attrs["w:pos"]);
          if (pos === void 0) continue;
          const tab = { val: v, pos };
          const leader = t.attrs["w:leader"];
          if (leader && LEADERS.has(leader)) tab.leader = leader;
          tabs.push(tab);
        }
        p.tabs = tabs;
        break;
      }
      case "w:spacing": {
        const s = {};
        const a = el3.attrs;
        const before = measureTwips(a["w:before"]);
        if (before !== void 0) s.before = before;
        const after = measureTwips(a["w:after"]);
        if (after !== void 0) s.after = after;
        const bl = int3(a["w:beforeLines"]);
        if (bl !== void 0) s.beforeLines = bl;
        const al = int3(a["w:afterLines"]);
        if (al !== void 0) s.afterLines = al;
        if (a["w:beforeAutospacing"] !== void 0) s.beforeAutospacing = onOffAttr(a["w:beforeAutospacing"]);
        if (a["w:afterAutospacing"] !== void 0) s.afterAutospacing = onOffAttr(a["w:afterAutospacing"]);
        const line = measureTwips(a["w:line"]);
        if (line !== void 0) s.line = line;
        const rule = a["w:lineRule"];
        if (rule === "auto" || rule === "exact" || rule === "atLeast") s.lineRule = rule;
        p.spacing = s;
        break;
      }
      case "w:ind": {
        const s = {};
        const a = el3.attrs;
        const left = measureTwips(a["w:left"] ?? a["w:start"]);
        if (left !== void 0) s.left = left;
        const right = measureTwips(a["w:right"] ?? a["w:end"]);
        if (right !== void 0) s.right = right;
        const hanging = measureTwips(a["w:hanging"]);
        if (hanging !== void 0) s.hanging = hanging;
        const firstLine = measureTwips(a["w:firstLine"]);
        if (firstLine !== void 0) s.firstLine = firstLine;
        for (const k of ["leftChars", "rightChars", "hangingChars", "firstLineChars"]) {
          const n = int3(a[`w:${k}`] ?? (k === "leftChars" ? a["w:startChars"] : k === "rightChars" ? a["w:endChars"] : void 0));
          if (n !== void 0) s[k] = n;
        }
        p.ind = s;
        break;
      }
      case "w:framePr": {
        const a = el3.attrs;
        const f = {};
        const dc = a["w:dropCap"];
        if (dc === "none" || dc === "drop" || dc === "margin") f.dropCap = dc;
        for (const k of ["lines", "w", "h", "hSpace", "vSpace", "x", "y"]) {
          const n = k === "lines" ? int3(a[`w:${k}`]) : measureTwips(a[`w:${k}`]);
          if (n !== void 0) f[k] = n;
        }
        const hr = a["w:hRule"];
        if (hr === "auto" || hr === "exact" || hr === "atLeast") f.hRule = hr;
        for (const k of ["wrap", "hAnchor", "vAnchor", "xAlign", "yAlign"]) {
          if (a[`w:${k}`]) f[k] = a[`w:${k}`];
        }
        if (a["w:anchorLock"] !== void 0) f.anchorLock = onOffAttr(a["w:anchorLock"]);
        p.framePr = f;
        break;
      }
      case "w:rPr":
        p.rPr = readRPr(el3);
        for (const c of childElements(el3)) {
          if (c.name === "w:del" || c.name === "w:moveFrom") {
            p.markDeleted = true;
            p.markDel = readRevisionInfo(c);
          } else if (c.name === "w:ins" || c.name === "w:moveTo") p.markIns = readRevisionInfo(c);
        }
        break;
      case "w:pPrChange":
        p.change = { ...readRevisionInfo(el3), pPr: readPPr(firstChild(el3, "w:pPr")) ?? {} };
        break;
    }
  }
  return p;
}
function readBorders(el3) {
  if (!el3) return void 0;
  const b = {};
  const map = [
    ["top", ["w:top"]],
    ["left", ["w:left", "w:start"]],
    ["bottom", ["w:bottom"]],
    ["right", ["w:right", "w:end"]],
    ["insideH", ["w:insideH"]],
    ["insideV", ["w:insideV"]],
    ["tl2br", ["w:tl2br"]],
    ["tr2bl", ["w:tr2bl"]]
  ];
  for (const [k, names] of map) {
    for (const n of names) {
      const e = readBorder(firstChild(el3, n));
      if (e) {
        b[k] = e;
        break;
      }
    }
  }
  return b;
}
function readCellMar(el3) {
  if (!el3) return void 0;
  const m = {};
  const t = readWidth(firstChild(el3, "w:top"));
  if (t) m.top = t;
  const l = readWidth(firstChild(el3, "w:left") ?? firstChild(el3, "w:start"));
  if (l) m.left = l;
  const b = readWidth(firstChild(el3, "w:bottom"));
  if (b) m.bottom = b;
  const r = readWidth(firstChild(el3, "w:right") ?? firstChild(el3, "w:end"));
  if (r) m.right = r;
  return m;
}
function readTblPr(tblPr) {
  if (!tblPr) return void 0;
  const p = {};
  for (const el3 of childElements(tblPr)) {
    const val3 = el3.attrs["w:val"];
    switch (el3.name) {
      case "w:tblStyle":
        if (val3) p.tblStyle = val3;
        break;
      case "w:tblpPr": {
        const a = el3.attrs;
        const t = {};
        for (const k of ["leftFromText", "rightFromText", "topFromText", "bottomFromText", "tblpX", "tblpY"]) {
          const n = measureTwips(a[`w:${k}`]);
          if (n !== void 0) t[k] = n;
        }
        const va = a["w:vertAnchor"];
        if (va === "text" || va === "margin" || va === "page") t.vertAnchor = va;
        const ha = a["w:horzAnchor"];
        if (ha === "text" || ha === "margin" || ha === "page") t.horzAnchor = ha;
        if (a["w:tblpXSpec"]) t.tblpXSpec = a["w:tblpXSpec"];
        if (a["w:tblpYSpec"]) t.tblpYSpec = a["w:tblpYSpec"];
        p.tblpPr = t;
        break;
      }
      case "w:tblOverlap":
        if (val3) p.tblOverlap = val3;
        break;
      case "w:bidiVisual":
        p.bidiVisual = onOffVal(el3);
        break;
      case "w:tblStyleRowBandSize": {
        const n = int3(val3);
        if (n !== void 0) p.tblStyleRowBandSize = n;
        break;
      }
      case "w:tblStyleColBandSize": {
        const n = int3(val3);
        if (n !== void 0) p.tblStyleColBandSize = n;
        break;
      }
      case "w:tblW":
        p.tblW = readWidth(el3);
        break;
      case "w:jc":
        if (val3) p.jc = val3;
        break;
      case "w:tblCellSpacing":
        p.tblCellSpacing = readWidth(el3);
        break;
      case "w:tblInd":
        p.tblInd = readWidth(el3);
        break;
      case "w:tblBorders":
        p.tblBorders = readBorders(el3);
        break;
      case "w:shd":
        p.shd = readShading(el3);
        break;
      case "w:tblLayout":
        p.tblLayout = el3.attrs["w:type"] === "fixed" ? "fixed" : "autofit";
        break;
      case "w:tblCaption":
        if (val3 !== void 0) p.tblCaption = val3;
        break;
      case "w:tblDescription":
        if (val3 !== void 0) p.tblDescription = val3;
        break;
      case "w:tblCellMar":
        p.tblCellMar = readCellMar(el3);
        break;
      case "w:tblLook": {
        const a = el3.attrs;
        const look = {};
        const hex2 = parseInt(a["w:val"] ?? "", 16);
        if (Number.isFinite(hex2)) {
          look.firstRow = (hex2 & 32) !== 0;
          look.lastRow = (hex2 & 64) !== 0;
          look.firstColumn = (hex2 & 128) !== 0;
          look.lastColumn = (hex2 & 256) !== 0;
          look.noHBand = (hex2 & 512) !== 0;
          look.noVBand = (hex2 & 1024) !== 0;
        }
        for (const k of ["firstRow", "lastRow", "firstColumn", "lastColumn", "noHBand", "noVBand"]) {
          if (a[`w:${k}`] !== void 0) look[k] = onOffAttr(a[`w:${k}`]);
        }
        p.tblLook = look;
        break;
      }
    }
  }
  return p;
}
function readTrPr(trPr) {
  if (!trPr) return void 0;
  const p = {};
  for (const el3 of childElements(trPr)) {
    const val3 = el3.attrs["w:val"];
    switch (el3.name) {
      case "w:cnfStyle":
        if (val3) p.cnfStyle = val3;
        break;
      case "w:gridBefore": {
        const n = int3(val3);
        if (n !== void 0) p.gridBefore = n;
        break;
      }
      case "w:gridAfter": {
        const n = int3(val3);
        if (n !== void 0) p.gridAfter = n;
        break;
      }
      case "w:wBefore":
        p.wBefore = readWidth(el3);
        break;
      case "w:wAfter":
        p.wAfter = readWidth(el3);
        break;
      case "w:cantSplit":
        p.cantSplit = onOffVal(el3);
        break;
      case "w:trHeight": {
        const v = measureTwips(val3) ?? 0;
        const r = el3.attrs["w:hRule"];
        p.trHeight = { val: v, hRule: r === "exact" || r === "auto" ? r : "atLeast" };
        break;
      }
      case "w:tblHeader":
        p.tblHeader = onOffVal(el3);
        break;
      case "w:tblCellSpacing":
        p.tblCellSpacing = readWidth(el3);
        break;
      case "w:jc":
        if (val3) p.jc = val3;
        break;
      case "w:hidden":
        p.hidden = onOffVal(el3);
        break;
    }
  }
  return p;
}
function readTcPr(tcPr) {
  if (!tcPr) return void 0;
  const p = {};
  for (const el3 of childElements(tcPr)) {
    const val3 = el3.attrs["w:val"];
    switch (el3.name) {
      case "w:cnfStyle":
        if (val3) p.cnfStyle = val3;
        break;
      case "w:tcW":
        p.tcW = readWidth(el3);
        break;
      case "w:gridSpan": {
        const n = int3(val3);
        if (n !== void 0) p.gridSpan = n;
        break;
      }
      case "w:hMerge":
        p.hMerge = val3 === "restart" ? "restart" : "continue";
        break;
      case "w:vMerge":
        p.vMerge = val3 === "restart" ? "restart" : "continue";
        break;
      case "w:tcBorders":
        p.tcBorders = readBorders(el3);
        break;
      case "w:shd":
        p.shd = readShading(el3);
        break;
      case "w:noWrap":
        p.noWrap = onOffVal(el3);
        break;
      case "w:tcMar":
        p.tcMar = readCellMar(el3);
        break;
      case "w:textDirection":
        if (val3) p.textDirection = val3;
        break;
      case "w:tcFitText":
        p.tcFitText = onOffVal(el3);
        break;
      case "w:vAlign":
        if (val3 === "top" || val3 === "center" || val3 === "bottom" || val3 === "both") p.vAlign = val3;
        break;
      case "w:hideMark":
        p.hideMark = onOffVal(el3);
        break;
    }
  }
  return p;
}

// ../docx-core/src/ooxml/parts.ts
function readStyleSheet(xml) {
  const sheet = { docDefaults: {}, styles: {}, defaults: {} };
  if (!xml) return sheet;
  const root = parseXml(xml);
  const dd = firstChild(root, "w:docDefaults");
  if (dd) {
    const rPr = readRPr(firstChild(firstChild(dd, "w:rPrDefault") ?? dd, "w:rPr"));
    const pPr = readPPr(firstChild(firstChild(dd, "w:pPrDefault") ?? dd, "w:pPr"));
    if (rPr) sheet.docDefaults.rPr = rPr;
    if (pPr) sheet.docDefaults.pPr = pPr;
  }
  for (const st of childElements(root, "w:style")) {
    const id = st.attrs["w:styleId"];
    const type = st.attrs["w:type"] ?? "paragraph";
    if (!id || type !== "paragraph" && type !== "character" && type !== "table" && type !== "numbering") continue;
    const def = { styleId: id, type };
    const val3 = (n) => firstChild(st, n)?.attrs["w:val"];
    const name = val3("w:name");
    if (name !== void 0) def.name = name;
    const basedOn = val3("w:basedOn");
    if (basedOn) def.basedOn = basedOn;
    const next = val3("w:next");
    if (next) def.next = next;
    const link = val3("w:link");
    if (link) def.link = link;
    const d = st.attrs["w:default"];
    if (d === "1" || d === "true" || d === "on") {
      def.isDefault = true;
      sheet.defaults[type] ??= id;
    }
    const pPr = readPPr(firstChild(st, "w:pPr"));
    if (pPr) def.pPr = pPr;
    const rPr = readRPr(firstChild(st, "w:rPr"));
    if (rPr) def.rPr = rPr;
    const tblPr = readTblPr(firstChild(st, "w:tblPr"));
    if (tblPr) def.tblPr = tblPr;
    const trPr = readTrPr(firstChild(st, "w:trPr"));
    if (trPr) def.trPr = trPr;
    const tcPr = readTcPr(firstChild(st, "w:tcPr"));
    if (tcPr) def.tcPr = tcPr;
    for (const tsp of childElements(st, "w:tblStylePr")) {
      const t = tsp.attrs["w:type"];
      if (!t) continue;
      const part = {};
      const a = readPPr(firstChild(tsp, "w:pPr"));
      if (a) part.pPr = a;
      const b = readRPr(firstChild(tsp, "w:rPr"));
      if (b) part.rPr = b;
      const c = readTblPr(firstChild(tsp, "w:tblPr"));
      if (c) part.tblPr = c;
      const e = readTrPr(firstChild(tsp, "w:trPr"));
      if (e) part.trPr = e;
      const f = readTcPr(firstChild(tsp, "w:tcPr"));
      if (f) part.tcPr = f;
      (def.tblStylePr ??= {})[t] = part;
    }
    sheet.styles[id] = def;
  }
  return sheet;
}
function readLevel(el3) {
  const ilvl = parseInt(el3.attrs["w:ilvl"] ?? "0", 10) || 0;
  const lvl = { ilvl };
  const v = (n) => firstChild(el3, n)?.attrs["w:val"];
  const start = v("w:start");
  if (start !== void 0) lvl.start = parseInt(start, 10);
  const fmtEl = firstChild(el3, "w:numFmt");
  if (fmtEl?.attrs["w:val"]) lvl.numFmt = fmtEl.attrs["w:val"];
  if (fmtEl?.attrs["w:format"]) lvl.numFmtCustom = fmtEl.attrs["w:format"];
  const restart = v("w:lvlRestart");
  if (restart !== void 0) lvl.lvlRestart = parseInt(restart, 10);
  const ps = v("w:pStyle");
  if (ps) lvl.pStyle = ps;
  const isLgl = firstChild(el3, "w:isLgl");
  if (isLgl) lvl.isLgl = onOffVal(isLgl);
  const suff = v("w:suff");
  if (suff === "tab" || suff === "space" || suff === "nothing") lvl.suff = suff;
  const lt = firstChild(el3, "w:lvlText");
  if (lt) {
    if (lt.attrs["w:val"] !== void 0) lvl.lvlText = lt.attrs["w:val"];
    if (lt.attrs["w:null"] === "1" || lt.attrs["w:null"] === "true") lvl.lvlTextNull = true;
  }
  const pic = v("w:lvlPicBulletId");
  if (pic !== void 0) lvl.lvlPicBulletId = parseInt(pic, 10);
  const jc = v("w:lvlJc");
  if (jc) lvl.lvlJc = jc;
  const pPr = readPPr(firstChild(el3, "w:pPr"));
  if (pPr) lvl.pPr = pPr;
  const rPr = readRPr(firstChild(el3, "w:rPr"));
  if (rPr) lvl.rPr = rPr;
  return lvl;
}
function readNumbering(xml) {
  const out = { abstractNums: {}, nums: {}, picBullets: {} };
  if (!xml) return out;
  const root = parseXml(xml);
  for (const pb of childElements(root, "w:numPicBullet")) {
    const id = parseInt(pb.attrs["w:numPicBulletId"] ?? "-1", 10);
    const bullet = { id };
    const find = (e, name) => {
      for (const c of childElements(e)) {
        if (c.name === name) return c;
        const f = find(c, name);
        if (f) return f;
      }
      return void 0;
    };
    const img = find(pb, "v:imagedata");
    const blip = find(pb, "a:blip");
    const rid = img?.attrs["r:id"] ?? blip?.attrs["r:embed"];
    if (rid) bullet.rid = rid;
    const shape = find(pb, "v:shape");
    const style = shape?.attrs["style"] ?? "";
    const w = /width:\s*([0-9.]+)pt/.exec(style);
    const h = /height:\s*([0-9.]+)pt/.exec(style);
    if (w) bullet.widthPt = parseFloat(w[1]);
    if (h) bullet.heightPt = parseFloat(h[1]);
    out.picBullets[id] = bullet;
  }
  for (const an of childElements(root, "w:abstractNum")) {
    const id = parseInt(an.attrs["w:abstractNumId"] ?? "-1", 10);
    const a = { abstractNumId: id, levels: {} };
    const mlt = firstChild(an, "w:multiLevelType")?.attrs["w:val"];
    if (mlt) a.multiLevelType = mlt;
    const sl = firstChild(an, "w:styleLink")?.attrs["w:val"];
    if (sl) a.styleLink = sl;
    const nsl = firstChild(an, "w:numStyleLink")?.attrs["w:val"];
    if (nsl) a.numStyleLink = nsl;
    for (const lvl of childElements(an, "w:lvl")) {
      const l = readLevel(lvl);
      a.levels[l.ilvl] = l;
    }
    out.abstractNums[id] = a;
  }
  for (const num2 of childElements(root, "w:num")) {
    const numId = parseInt(num2.attrs["w:numId"] ?? "-1", 10);
    const abs = parseInt(firstChild(num2, "w:abstractNumId")?.attrs["w:val"] ?? "-1", 10);
    const inst = { numId, abstractNumId: abs, overrides: {} };
    for (const ov of childElements(num2, "w:lvlOverride")) {
      const ilvl = parseInt(ov.attrs["w:ilvl"] ?? "0", 10) || 0;
      const o = {};
      const so = firstChild(ov, "w:startOverride")?.attrs["w:val"];
      if (so !== void 0) o.startOverride = parseInt(so, 10);
      const lvl = firstChild(ov, "w:lvl");
      if (lvl) o.lvl = readLevel(lvl);
      inst.overrides[ilvl] = o;
    }
    out.nums[numId] = inst;
  }
  return out;
}
function readTheme(xml) {
  const theme = { major: { scripts: {} }, minor: { scripts: {} }, colors: {} };
  if (!xml) return theme;
  const root = parseXml(xml);
  const find = (e, name) => {
    for (const c of childElements(e)) {
      if (c.name === name) return c;
      const f = find(c, name);
      if (f) return f;
    }
    return void 0;
  };
  const fontScheme = find(root, "a:fontScheme");
  for (const [key, tag] of [["major", "a:majorFont"], ["minor", "a:minorFont"]]) {
    const el3 = fontScheme && firstChild(fontScheme, tag);
    if (!el3) continue;
    const set = theme[key];
    const latin = firstChild(el3, "a:latin")?.attrs["typeface"];
    if (latin) set.latin = latin;
    const ea = firstChild(el3, "a:ea")?.attrs["typeface"];
    if (ea) set.ea = ea;
    const cs = firstChild(el3, "a:cs")?.attrs["typeface"];
    if (cs) set.cs = cs;
    for (const f of childElements(el3, "a:font")) {
      if (f.attrs["script"] && f.attrs["typeface"]) set.scripts[f.attrs["script"]] = f.attrs["typeface"];
    }
  }
  const lnList = find(root, "a:lnStyleLst");
  if (lnList) theme.lineWidthsPt = childElements(lnList, "a:ln").map((l) => (parseInt(l.attrs["w"] ?? "0", 10) || 0) / 12700);
  const asSpPr = (kids) => readSpPr({ name: "a:spPr", attrs: {}, children: kids });
  const fills = find(root, "a:fillStyleLst");
  if (fills) theme.fillStyles = childElements(fills).map((f) => asSpPr([f]));
  const bgFills = find(root, "a:bgFillStyleLst");
  if (bgFills) theme.bgFillStyles = childElements(bgFills).map((f) => asSpPr([f]));
  const effects = find(root, "a:effectStyleLst");
  if (effects) theme.effectStyles = childElements(effects, "a:effectStyle").map((e) => asSpPr(childElements(e, "a:effectLst")).shadow);
  const clr = find(root, "a:clrScheme");
  if (clr) {
    for (const c of childElements(clr)) {
      const key = c.name.replace(/^a:/, "");
      const srgb = firstChild(c, "a:srgbClr")?.attrs["val"];
      const sys = firstChild(c, "a:sysClr");
      const v = srgb ?? sys?.attrs["lastClr"] ?? (sys?.attrs["val"] === "window" ? "FFFFFF" : sys?.attrs["val"] === "windowText" ? "000000" : void 0);
      if (v) theme.colors[key] = v.toUpperCase();
    }
  }
  return theme;
}
function readNoteProps(el3) {
  if (!el3) return void 0;
  const out = {};
  const v = (n) => firstChild(el3, n)?.attrs["w:val"];
  const pos = v("w:pos");
  if (pos) out.pos = pos;
  const fmt = v("w:numFmt");
  if (fmt) out.numFmt = fmt;
  const start = parseInt(v("w:numStart") ?? "", 10);
  if (Number.isFinite(start)) out.numStart = start;
  const rs = v("w:numRestart");
  if (rs === "continuous" || rs === "eachSect" || rs === "eachPage") out.numRestart = rs;
  return Object.keys(out).length ? out : void 0;
}
var ROOT_COMPAT_FLAGS = /* @__PURE__ */ new Set([
  "w:doNotUseHTMLParagraphAutoSpacing",
  "w:doNotExpandShiftReturn",
  "w:ulTrailSpace",
  "w:spaceForUL",
  "w:balanceSingleByteDoubleByteWidth",
  "w:adjustLineHeightInTable",
  "w:doNotSuppressParagraphBorders",
  "w:noSpaceRaiseLower",
  "w:suppressSpBfAfterPgBrk",
  "w:suppressTopSpacing",
  "w:doNotUseIndentAsNumberingTabStop"
]);
function readSettings(xml) {
  const s = {
    defaultTabStop: 720,
    compatibilityMode: xml ? 12 : 15,
    compat: {},
    evenAndOddHeaders: false,
    mirrorMargins: false,
    autoHyphenation: false,
    doNotHyphenateCaps: false,
    displayBackgroundShape: false,
    updateFields: false
  };
  if (!xml) return s;
  const root = parseXml(xml);
  const on = (n) => {
    const e = firstChild(root, n);
    return e ? onOffVal(e) : false;
  };
  const dts = measureTwips(firstChild(root, "w:defaultTabStop")?.attrs["w:val"]);
  if (dts !== void 0 && dts > 0) s.defaultTabStop = dts;
  s.evenAndOddHeaders = on("w:evenAndOddHeaders");
  s.mirrorMargins = on("w:mirrorMargins");
  s.autoHyphenation = on("w:autoHyphenation");
  s.doNotHyphenateCaps = on("w:doNotHyphenateCaps");
  s.displayBackgroundShape = on("w:displayBackgroundShape");
  s.updateFields = on("w:updateFields");
  if (on("w:bordersDoNotSurroundHeader")) s.bordersDoNotSurroundHeader = true;
  if (on("w:bordersDoNotSurroundFooter")) s.bordersDoNotSurroundFooter = true;
  const fnPr = readNoteProps(firstChild(root, "w:footnotePr"));
  if (fnPr) s.footnotePr = fnPr;
  const enPr = readNoteProps(firstChild(root, "w:endnotePr"));
  if (enPr) s.endnotePr = enPr;
  const hz = measureTwips(firstChild(root, "w:hyphenationZone")?.attrs["w:val"]);
  if (hz !== void 0) s.hyphenationZone = hz;
  const chl = firstChild(root, "w:consecutiveHyphenLimit")?.attrs["w:val"];
  if (chl !== void 0) s.consecutiveHyphenLimit = parseInt(chl, 10);
  const csc = firstChild(root, "w:characterSpacingControl")?.attrs["w:val"];
  if (csc) s.characterSpacingControl = csc;
  const tfl = firstChild(root, "w:themeFontLang");
  if (tfl) {
    s.themeFontLang = {};
    if (tfl.attrs["w:val"]) s.themeFontLang.val = tfl.attrs["w:val"];
    if (tfl.attrs["w:eastAsia"]) s.themeFontLang.eastAsia = tfl.attrs["w:eastAsia"];
    if (tfl.attrs["w:bidi"]) s.themeFontLang.bidi = tfl.attrs["w:bidi"];
  }
  for (const c of childElements(root)) {
    if (ROOT_COMPAT_FLAGS.has(c.name)) s.compat[c.name.replace(/^w:/, "")] = onOffVal(c);
  }
  const compat = firstChild(root, "w:compat");
  if (compat) {
    for (const c of childElements(compat)) {
      if (c.name === "w:compatSetting") {
        if (c.attrs["w:name"] === "compatibilityMode" && c.attrs["w:uri"] === "http://schemas.microsoft.com/office/word") {
          const n = parseInt(c.attrs["w:val"] ?? "", 10);
          if (Number.isFinite(n)) s.compatibilityMode = n;
        }
        continue;
      }
      s.compat[c.name.replace(/^w:/, "")] = onOffVal(c);
    }
  }
  return s;
}
function readFontTable(xml) {
  const out = {};
  if (!xml) return out;
  const root = parseXml(xml);
  for (const f of childElements(root, "w:font")) {
    const name = f.attrs["w:name"];
    if (!name) continue;
    const info = { name };
    const v = (n) => firstChild(f, n)?.attrs["w:val"];
    const alt = v("w:altName");
    if (alt) info.altName = alt;
    const pan = v("w:panose1");
    if (pan) info.panose1 = pan;
    const cs = v("w:charset");
    if (cs) info.charset = cs;
    const fam = v("w:family");
    if (fam) info.family = fam;
    const pitch = v("w:pitch");
    if (pitch) info.pitch = pitch;
    const sig = firstChild(f, "w:sig");
    if (sig) {
      info.sig = {};
      for (const [k, val3] of Object.entries(sig.attrs)) info.sig[k.replace(/^w:/, "")] = val3;
    }
    out[name] = info;
  }
  return out;
}
function partByRelType(pkg, type, fallback) {
  const rels = pkg.getPartText("word/_rels/document.xml.rels");
  if (rels) {
    for (const rel of childElements(parseXml(rels), "Relationship")) {
      if ((rel.attrs["Type"] ?? "").endsWith(`/${type}`) && rel.attrs["Target"] && rel.attrs["TargetMode"] !== "External") {
        const t = rel.attrs["Target"].replace(/^\.\//, "");
        return t.startsWith("/") ? t.slice(1) : `word/${t}`;
      }
    }
  }
  return fallback;
}
function readDocFormatting(pkg) {
  return {
    styles: readStyleSheet(pkg.getPartText(partByRelType(pkg, "styles", "word/styles.xml"))),
    numbering: readNumbering(pkg.getPartText(partByRelType(pkg, "numbering", "word/numbering.xml"))),
    theme: readTheme(pkg.getPartText(partByRelType(pkg, "theme", "word/theme/theme1.xml"))),
    settings: readSettings(pkg.getPartText(partByRelType(pkg, "settings", "word/settings.xml"))),
    fontTable: readFontTable(pkg.getPartText(partByRelType(pkg, "fontTable", "word/fontTable.xml")))
  };
}

// ../docx-core/src/document.ts
var DEFAULT_RUN_PROPS = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  allCaps: false,
  smallCaps: false
};
function vmlFixed(v) {
  if (!v) return void 0;
  const n = v.endsWith("f") ? parseInt(v, 10) / 65536 : parseFloat(v);
  return Number.isFinite(n) ? n : void 0;
}
function vmlImageEffects(el3) {
  const a = el3.attrs;
  const fx = {};
  const gain = vmlFixed(a["gain"]), bl = vmlFixed(a["blacklevel"]);
  if (gain !== void 0 && gain !== 1) fx.gain = gain;
  if (bl) fx.bright = 2 * bl;
  if (a["grayscale"] === "t" || a["grayscale"] === "true") fx.gray = true;
  if (a["bilevel"] === "t" || a["bilevel"] === "true") fx.biLevel = 0.5;
  return Object.keys(fx).length ? fx : void 0;
}
function blipFxImageEffects(b) {
  const fx = {};
  if (b.lum) {
    const br = (b.lum.bright ?? 0) / 1e5;
    const c = Math.max(-1, Math.min(0.999, (b.lum.contrast ?? 0) / 1e5));
    if (c) fx.gain = c > 0 ? 1 / (1 - c) : 1 + c;
    if (br) fx.bright = br;
    if (br || c) fx.floor = true;
  }
  if (b.grayscl) fx.gray = true;
  if (b.biLevel !== void 0) fx.biLevel = b.biLevel / 1e5;
  return Object.keys(fx).length ? fx : void 0;
}
function blipImageEffects(blip) {
  const lum = firstChild(blip, "a:lum"), bi = firstChild(blip, "a:biLevel");
  const int4 = (v, d) => parseInt(v ?? d, 10) || 0;
  return blipFxImageEffects({
    ...lum ? { lum: { bright: int4(lum.attrs["bright"], "0"), contrast: int4(lum.attrs["contrast"], "0") } } : {},
    ...firstChild(blip, "a:grayscl") ? { grayscl: true } : {},
    ...bi ? { biLevel: int4(bi.attrs["thresh"], "50000") } : {}
  });
}
var isMarkRun = (r) => !!(r.bookmark || r.fieldBegin !== void 0 || r.fieldEnd);
var EMU_PER_TWIP2 = 635;
function readBorderEdge(el3) {
  if (!el3) return void 0;
  const style = el3.attrs["w:val"];
  if (!style || style === "none" || style === "nil") return void 0;
  const color = el3.attrs["w:color"];
  return {
    style,
    sizeEighthPt: parseInt(el3.attrs["w:sz"] ?? "4", 10),
    color: color && color !== "auto" ? color : void 0,
    spacePt: parseInt(el3.attrs["w:space"] ?? "0", 10)
  };
}
function runPropsFromRPr(rpr) {
  const p = { ...DEFAULT_RUN_PROPS };
  if (!rpr) return p;
  if (rpr.b !== void 0) p.bold = rpr.b;
  if (rpr.i !== void 0) p.italic = rpr.i;
  if (rpr.u) {
    const val3 = rpr.u.val;
    p.underline = val3 !== "none" && val3 !== "";
    if (val3 === "double" || val3 === "dotted" || val3 === "dash" || val3 === "wave" || val3 === "thick") p.underlineStyle = val3;
    if (rpr.u.color && rpr.u.color !== "auto") p.underlineColor = rpr.u.color;
  }
  if (rpr.strike !== void 0) p.strike = rpr.strike;
  if (rpr.dstrike !== void 0) p.doubleStrike = rpr.dstrike;
  if (rpr.caps !== void 0) p.allCaps = rpr.caps;
  if (rpr.smallCaps !== void 0) p.smallCaps = rpr.smallCaps;
  if (rpr.vertAlign === "superscript" || rpr.vertAlign === "subscript") p.vertAlign = rpr.vertAlign;
  if (rpr.sz !== void 0) p.szHalfPt = rpr.sz;
  if (rpr.color?.val && rpr.color.val !== "auto") p.color = rpr.color.val;
  if (rpr.highlight && rpr.highlight !== "none") p.highlight = rpr.highlight;
  if (rpr.rFonts) p.fontAscii = rpr.rFonts.ascii;
  if (rpr.spacing !== void 0 && rpr.spacing !== 0) p.charSpacingTwips = rpr.spacing;
  if (rpr.rStyle) p.charStyle = rpr.rStyle;
  if (rpr.change) p.fmt = { ...revInfo(rpr.change), old: runPropsFromRPr(rpr.change.rPr) };
  return p;
}
function revInfo(r) {
  return {
    author: r.author,
    ...r.date !== void 0 ? { date: r.date } : {},
    ...r.dateUtc !== void 0 ? { dateUtc: r.dateUtc } : {},
    ...r.move ? { move: true } : {}
  };
}
function editBaseProps(run, rpr) {
  const base = runPropsFromRPr(rpr);
  const p = run.props;
  if (p.link && base.underline === false) {
    base.underline = true;
    base.color ??= "0563C1";
  }
  if (run.noteRef && base.vertAlign === void 0) base.vertAlign = "superscript";
  if (run.symFont) base.fontAscii = run.symFont;
  return base;
}
var TIGHT_WRAP = /* @__PURE__ */ new Set(["none", "allLines", "firstAndLastLine", "firstLineOnly", "lastLineOnly"]);
function paraPropsFromPPr(ppr) {
  const props = {};
  if (!ppr) return props;
  const jc = ppr.jc;
  if (jc === "center" || jc === "right" || jc === "both" || jc === "left") props.alignment = jc;
  else if (jc === "start") props.alignment = "left";
  else if (jc === "end") props.alignment = "right";
  else if (jc === "distribute") props.alignment = "both";
  if (ppr.pStyle !== void 0) props.styleId = ppr.pStyle;
  if (ppr.numPr) {
    const numId = ppr.numPr.numId ?? 0;
    props.numbering = { kind: numId === 1002 ? "decimal" : "bullet", ilvl: ppr.numPr.ilvl ?? 0 };
  }
  if (ppr.ind) {
    if (ppr.ind.left !== void 0) props.indentLeftTwips = ppr.ind.left;
    if (ppr.ind.right !== void 0) props.indentRightTwips = ppr.ind.right;
    if (ppr.ind.firstLine !== void 0) props.indentFirstLineTwips = ppr.ind.firstLine;
    if (ppr.ind.hanging !== void 0) props.indentFirstLineTwips = -ppr.ind.hanging;
  }
  if (ppr.spacing) {
    if (ppr.spacing.line !== void 0 && ppr.spacing.lineRule === "auto") props.lineTwentieths = ppr.spacing.line;
    if (ppr.spacing.after !== void 0) props.spaceAfterTwips = ppr.spacing.after;
    if (ppr.spacing.before !== void 0) props.spaceBeforeTwips = ppr.spacing.before;
    if (ppr.spacing.beforeAutospacing !== void 0) props.spaceBeforeAuto = ppr.spacing.beforeAutospacing;
    if (ppr.spacing.afterAutospacing !== void 0) props.spaceAfterAuto = ppr.spacing.afterAutospacing;
  }
  if (ppr.shd?.fill && ppr.shd.fill !== "auto") props.shadingHex = ppr.shd.fill;
  if (ppr.tabs?.length) {
    props.tabStops = ppr.tabs.map((t) => ({
      posTwips: t.pos,
      align: t.val,
      ...t.leader && t.leader !== "none" ? { leader: t.leader } : {}
    }));
  }
  if (ppr.pBdr) {
    props.boxBorder = true;
    const borders = {};
    for (const side of ["top", "left", "bottom", "right"]) {
      const b = ppr.pBdr[side];
      if (!b || b.val === "none" || b.val === "nil") continue;
      borders[side] = {
        style: b.val,
        sizeEighthPt: b.sz ?? 4,
        color: b.color && b.color !== "auto" ? b.color : void 0,
        spacePt: b.space ?? 0
      };
    }
    if (Object.keys(borders).length > 0) props.borders = borders;
  }
  if (ppr.pageBreakBefore !== void 0) props.pageBreakBefore = ppr.pageBreakBefore;
  if (ppr.keepNext !== void 0) props.keepNext = ppr.keepNext;
  if (ppr.keepLines !== void 0) props.keepLines = ppr.keepLines;
  if (ppr.widowControl !== void 0) props.widowControl = ppr.widowControl;
  if (ppr.suppressLineNumbers !== void 0) props.suppressLineNumbers = ppr.suppressLineNumbers;
  if (ppr.suppressAutoHyphens !== void 0) props.suppressAutoHyphens = ppr.suppressAutoHyphens;
  if (ppr.textboxTightWrap && TIGHT_WRAP.has(ppr.textboxTightWrap)) props.textboxTightWrap = ppr.textboxTightWrap;
  if (ppr.outlineLvl !== void 0) props.outlineLvl = ppr.outlineLvl;
  if (ppr.framePr?.dropCap && ppr.framePr.dropCap !== "none") props.dropCap = true;
  if (ppr.markIns) props.markIns = revInfo(ppr.markIns);
  if (ppr.markDel) props.markDel = revInfo(ppr.markDel);
  if (ppr.change) props.pfmt = { ...revInfo(ppr.change), old: paraPropsFromPPr(ppr.change.pPr) };
  return props;
}
function findDeep3(el3, name) {
  for (const c of childElements(el3)) {
    if (c.name === name) return c;
    const found = findDeep3(c, name);
    if (found) return found;
  }
  return void 0;
}
var RPR_EL = /* @__PURE__ */ Symbol("docx-rpr-el");
var rPrElOf = (r) => r?.[RPR_EL];
var setRPrEl = (r, el3) => {
  if (el3) r[RPR_EL] = el3;
};
var OBJ_EL = /* @__PURE__ */ Symbol("docx-obj-el");
var objElOf = (r) => r[OBJ_EL];
function tagObjectRuns(list, from, el3) {
  if (!list) return;
  for (let i2 = from; i2 < list.length; i2++) list[i2][OBJ_EL] = i2 === from ? el3 : true;
}
var INLINE_WRAPPERS = /* @__PURE__ */ new Set(["w:sdt", "w:hyperlink", "w:smartTag", "w:customXml", "w:dir", "w:bdo"]);
var OBJ = "\uFFFC";
function readPic(pic, ctx, wTw, hTw) {
  const blip = findDeep3(pic, "a:blip");
  const rid = blip?.attrs["r:embed"] ?? blip?.attrs["r:link"];
  if (!rid) return void 0;
  const media = ctx.resolveImage(rid) ?? { data: new Uint8Array(0), ext: "png" };
  const svgRid = blip && findDeep3(blip, "asvg:svgBlip")?.attrs["r:embed"];
  const svgMedia = svgRid ? ctx.resolveImage(svgRid) : void 0;
  const img = {
    data: media.data,
    ext: media.ext,
    ...svgMedia ? { svg: svgMedia.data } : {},
    widthTwips: wTw,
    heightTwips: hTw
  };
  const fx = blip && blipImageEffects(blip);
  if (fx) img.effects = fx;
  const src = findDeep3(pic, "a:srcRect");
  if (src && (src.attrs["l"] || src.attrs["t"] || src.attrs["r"] || src.attrs["b"])) {
    const f = (k) => (parseInt(src.attrs[k] ?? "0", 10) || 0) / 1e5;
    img.crop = { l: f("l"), t: f("t"), r: f("r"), b: f("b") };
  }
  const spPr = firstChild(pic, "pic:spPr");
  if (spPr) {
    const st = readSpPr(spPr);
    if (st.rot || st.flipH || st.flipV || st.line) img.style = st;
  }
  return img;
}
function bodyPrOf(tb, bodyPr) {
  if (!bodyPr) return;
  if (findDeep3(bodyPr, "a:spAutoFit")) tb.autoFit = true;
  if (bodyPr.attrs["wrap"] === "none") tb.noWrap = true;
  const insTw = (name, def) => {
    const v = bodyPr.attrs[name];
    return v !== void 0 ? Math.round(parseInt(v, 10) / EMU_PER_TWIP2) : def;
  };
  tb.insets = { l: insTw("lIns", 144), t: insTw("tIns", 72), r: insTw("rIns", 144), b: insTw("bIns", 72) };
  const anc = bodyPr.attrs["anchor"];
  if (anc === "t" || anc === "ctr" || anc === "b") tb.vAnchor = anc;
  const vert = bodyPr.attrs["vert"];
  if (vert && vert !== "horz") tb.vert = vert;
  if (bodyPr.attrs["upright"] === "1" || bodyPr.attrs["upright"] === "true") tb.upright = true;
  if (bodyPr.attrs["fromWordArt"] === "1" || bodyPr.attrs["fromWordArt"] === "true") {
    tb.wordArt = firstChild(bodyPr, "a:prstTxWarp")?.attrs["prst"] ?? "textPlain";
  }
}
function textboxBlocks(txbx, ctx, tb) {
  if (ctx.readBlocks) {
    const read = ctx.readBlocksGrouped ? ctx.readBlocksGrouped(txbx, ctx) : { blocks: ctx.readBlocks(txbx, ctx) };
    const blocks = read.blocks;
    tb.blocks = blocks;
    if (read.groups && ctx.sources) ctx.sources.addTextboxGroups(tb, read.groups);
    const paras = [];
    const walk = (bs) => {
      for (const b of bs) {
        if (b.type === "paragraph") paras.push(b.paragraph);
        else for (const r of b.rows) for (const c of r.cells) walk(c.blocks ?? c.paragraphs.map((p) => ({ type: "paragraph", paragraph: p })));
      }
    };
    walk(blocks);
    tb.paras = paras.length ? paras : [{ runs: [], props: {} }];
  } else {
    tb.paras = childElements(txbx, "w:p").map((p) => readParagraph(p, ctx));
  }
}
function readGraphicObject(obj, ctx, wTw, hTw) {
  if (obj.name === "pic:pic") {
    const image = readPic(obj, ctx, wTw, hTw);
    return image ? { text: OBJ, image } : void 0;
  }
  if (obj.name === "wps:wsp") {
    const spPr = firstChild(obj, "wps:spPr");
    const style = readSpPr(spPr, firstChild(obj, "wps:style"));
    const txbx = firstChild(obj, "wps:txbx");
    const content = txbx && firstChild(txbx, "w:txbxContent");
    const linked = !content ? firstChild(obj, "wps:linkedTxbx") : void 0;
    if (content || linked) {
      const tb = { paras: [], widthTwips: wTw, heightTwips: hTw };
      if (content) {
        textboxBlocks(content, ctx, tb);
        const sid = parseInt(txbx.attrs["id"] ?? "", 10);
        if (Number.isFinite(sid)) tb.story = sid;
      } else {
        tb.paras = [];
        tb.blocks = [];
        tb.link = { id: parseInt(linked.attrs["id"] ?? "0", 10) || 0, seq: parseInt(linked.attrs["seq"] ?? "1", 10) || 1 };
      }
      bodyPrOf(tb, firstChild(obj, "wps:bodyPr"));
      const fontRef = firstChild(firstChild(obj, "wps:style") ?? obj, "a:fontRef");
      const fc = fontRef ? readSpPr({ name: "wps:spPr", attrs: {}, children: [{ name: "a:solidFill", attrs: {}, children: childElements(fontRef) }] }).fill : void 0;
      if (fc) tb.fontColor = fc;
      const bf = spPr && firstChild(spPr, "a:blipFill");
      const blip = bf && firstChild(bf, "a:blip");
      const media = blip?.attrs["r:embed"] ? ctx.resolveImage(blip.attrs["r:embed"]) : void 0;
      if (bf && media) {
        const tile = firstChild(bf, "a:tile");
        const n = (k, d) => parseInt(tile?.attrs[k] ?? String(d), 10) || 0;
        const amf = blip && firstChild(blip, "a:alphaModFix");
        style.blip = {
          image: { data: media.data, ext: media.ext },
          ...tile ? { tile: { tx: n("tx", 0), ty: n("ty", 0), sx: n("sx", 1e5), sy: n("sy", 1e5), algn: tile.attrs["algn"] ?? "tl", flip: tile.attrs["flip"] ?? "none" } } : {},
          ...amf ? { alpha: (parseInt(amf.attrs["amt"] ?? "100000", 10) || 0) / 1e5 } : {}
        };
      }
      if (style.fill || style.line || style.gradient || style.blip || style.pattern || style.effectRef) tb.shape = style;
      tb.lineInset = style.lineInset ?? {};
      if (style.geom && style.geom !== "rect" && style.geom !== "custom") tb.geom = { prst: style.geom, ...style.adj ? { adj: style.adj } : {} };
      if (style.rot || style.flipV) tb.rot = ((style.rot ?? 0) + (style.flipV ? 180 : 0)) % 360;
      return { text: OBJ, textbox: tb };
    }
    const blipFill = spPr && firstChild(spPr, "a:blipFill");
    if (blipFill) {
      const image = readPic({ name: "pic:pic", attrs: {}, children: [blipFill] }, ctx, wTw, hTw);
      if (image) return { text: OBJ, image };
    }
    return { text: OBJ, shape: { style, widthTwips: wTw, heightTwips: hTw } };
  }
  if (obj.name === "wpg:wgp" || obj.name === "wpg:grpSp" || obj.name === "wpc:wpc") {
    const grpSpPr = firstChild(obj, "wpg:grpSpPr");
    const xfrm = grpSpPr && firstChild(grpSpPr, "a:xfrm");
    const n = (el3, k) => parseInt(el3?.attrs[k] ?? "0", 10) || 0;
    const chOff = xfrm && firstChild(xfrm, "a:chOff");
    const chExt = xfrm && firstChild(xfrm, "a:chExt");
    const ext = xfrm && firstChild(xfrm, "a:ext");
    const cw = n(chExt, "cx") || n(ext, "cx");
    const ch = n(chExt, "cy") || n(ext, "cy");
    const sx = cw ? wTw * EMU_PER_TWIP2 / cw : 1;
    const sy = ch ? hTw * EMU_PER_TWIP2 / ch : 1;
    const items = [];
    for (const child of childElements(obj)) {
      if (!["wps:wsp", "pic:pic", "wpg:grpSp"].includes(child.name)) continue;
      const cpr = firstChild(child, "wps:spPr") ?? firstChild(child, "pic:spPr") ?? firstChild(child, "wpg:grpSpPr");
      const cx = cpr && firstChild(cpr, "a:xfrm");
      const off = cx && firstChild(cx, "a:off");
      const cext = cx && firstChild(cx, "a:ext");
      const x2 = (n(off, "x") - n(chOff, "x")) * sx / EMU_PER_TWIP2;
      const y = (n(off, "y") - n(chOff, "y")) * sy / EMU_PER_TWIP2;
      const w = n(cext, "cx") * sx / EMU_PER_TWIP2;
      const h = n(cext, "cy") * sy / EMU_PER_TWIP2;
      const run = readGraphicObject(child, ctx, w, h);
      if (run) items.push({ x: x2, y, w, h, run: { ...run, props: { ...DEFAULT_RUN_PROPS } } });
    }
    if (!items.length) return void 0;
    const group2 = { widthTwips: wTw, heightTwips: hTw, items };
    const rot = parseInt(xfrm?.attrs["rot"] ?? "0", 10);
    if (rot) group2.rot = rot / 6e4;
    if (xfrm?.attrs["flipH"] === "1") group2.flipH = true;
    if (xfrm?.attrs["flipV"] === "1") group2.flipV = true;
    return { text: OBJ, group: group2 };
  }
  return void 0;
}
function dmlRunColor(el3) {
  const c = el3 && (firstChild(el3, "a:srgbClr") ?? firstChild(el3, "a:sysClr") ?? firstChild(el3, "a:schemeClr") ?? firstChild(el3, "a:prstClr"));
  if (!c) return void 0;
  if (c.name === "a:srgbClr") return { val: (c.attrs["val"] ?? "000000").toUpperCase() };
  if (c.name === "a:sysClr") return { val: (c.attrs["lastClr"] ?? (c.attrs["val"] === "window" ? "FFFFFF" : "000000")).toUpperCase() };
  if (c.name === "a:prstClr") return { val: c.attrs["val"] === "white" ? "FFFFFF" : "000000" };
  const spec = { themeColor: c.attrs["val"] ?? "tx1" };
  const frac3 = (k) => {
    const m = firstChild(c, k);
    return m ? Math.round((parseInt(m.attrs["val"] ?? "100000", 10) || 0) / 1e5 * 255).toString(16).padStart(2, "0").toUpperCase() : void 0;
  };
  const t = frac3("a:tint"), sh = frac3("a:shade");
  if (t) spec.themeTint = t;
  if (sh) spec.themeShade = sh;
  return spec;
}
function dmlParagraphs(body, styleEl, txFill) {
  const fontRef = styleEl && firstChild(styleEl, "a:fontRef");
  const refColor = txFill ?? dmlRunColor(fontRef);
  const refKind = fontRef?.attrs["idx"] === "major" ? "major" : "minor";
  const rprOf = (rPr) => {
    const sz = Math.round((parseInt(rPr?.attrs["sz"] ?? "1800", 10) || 1800) / 50);
    const face = (tag) => rPr && firstChild(rPr, tag)?.attrs["typeface"] || void 0;
    const kind = (f) => f ? f.startsWith("+mj") ? "major" : "minor" : refKind;
    const lt = face("a:latin"), ea = face("a:ea"), cs = face("a:cs");
    const rFonts = {};
    if (lt && !lt.startsWith("+")) {
      rFonts.ascii = lt;
      rFonts.hAnsi = lt;
    } else {
      rFonts.asciiTheme = `${kind(lt)}HAnsi`;
      rFonts.hAnsiTheme = `${kind(lt)}HAnsi`;
    }
    if (ea && !ea.startsWith("+")) rFonts.eastAsia = ea;
    else rFonts.eastAsiaTheme = `${kind(ea)}EastAsia`;
    if (cs && !cs.startsWith("+")) rFonts.cs = cs;
    else rFonts.cstheme = `${kind(cs)}Bidi`;
    const on = (k) => rPr?.attrs[k] === "1" || rPr?.attrs[k] === "true";
    const u = rPr?.attrs["u"];
    return {
      rFonts,
      sz,
      szCs: sz,
      b: on("b"),
      bCs: on("b"),
      i: on("i"),
      iCs: on("i"),
      color: dmlRunColor(rPr && firstChild(rPr, "a:solidFill")) ?? refColor ?? { themeColor: "tx1" },
      ...u && u !== "none" ? { u: { val: u === "dbl" ? "double" : "single" } } : {}
    };
  };
  const num2 = (el3) => parseInt(el3?.attrs["val"] ?? "0", 10) || 0;
  const edges = /^(1|true)$/.test(firstChild(body, "a:bodyPr")?.attrs["spcFirstLastPara"] ?? "");
  const aps = childElements(body, "a:p");
  const out = [];
  for (const [k, ap] of aps.entries()) {
    const pPr = firstChild(ap, "a:pPr");
    const runs = [];
    for (const c of childElements(ap)) {
      if (c.name !== "a:r" && c.name !== "a:br" && c.name !== "a:fld") continue;
      const t = firstChild(c, "a:t");
      const text = c.name === "a:br" ? "\n" : t ? textContentOf(t) : "";
      if (!text) continue;
      const rpr = rprOf(firstChild(c, "a:rPr"));
      runs.push({ text, props: runPropsFromRPr(rpr), rpr });
    }
    const firstR = firstChild(ap, "a:r");
    const mark = rprOf(firstChild(ap, "a:endParaRPr") ?? (firstR && firstChild(firstR, "a:rPr")));
    const szPt = Math.max(mark.sz ?? 36, ...runs.map((r) => r.rpr?.sz ?? 0)) / 2;
    const gap = (tag) => {
      const e = pPr && firstChild(pPr, tag);
      const pts = e && firstChild(e, "a:spcPts"), pct2 = e && firstChild(e, "a:spcPct");
      return pts ? Math.round(num2(pts) / 5) : pct2 ? Math.round(num2(pct2) / 1e5 * 1.2 * szPt * 20) : 0;
    };
    const ln2 = pPr && firstChild(pPr, "a:lnSpc");
    const lnPct = ln2 && firstChild(ln2, "a:spcPct"), lnPts = ln2 && firstChild(ln2, "a:spcPts");
    const algn = pPr?.attrs["algn"];
    const emu2 = (k2) => Math.round((parseInt(pPr?.attrs[k2] ?? "0", 10) || 0) / EMU_PER_TWIP2);
    const indent = emu2("indent");
    const ppr = {
      jc: algn === "ctr" ? "center" : algn === "r" ? "right" : algn === "just" ? "both" : algn === "dist" ? "distribute" : "left",
      spacing: {
        before: k === 0 && !edges ? 0 : gap("a:spcBef"),
        after: k === aps.length - 1 && !edges ? 0 : gap("a:spcAft"),
        ...lnPts ? { line: Math.round(num2(lnPts) / 5), lineRule: "exact" } : { line: lnPct ? Math.round(240 * num2(lnPct) / 1e5) : 240, lineRule: "auto" }
      },
      ind: { left: emu2("marL"), right: 0, ...indent < 0 ? { hanging: -indent } : { firstLine: indent } },
      contextualSpacing: false,
      rPr: mark
    };
    out.push({ runs, props: paraPropsFromPPr(ppr), ppr });
  }
  return out;
}
function readDiagram(gd, ctx, wTw, hTw) {
  const relIds = firstChild(gd, "dgm:relIds");
  const data = relIds && ctx.resolvePart?.(relIds.attrs["r:dm"] ?? "");
  const ext = data && findDeep3(data, "dsp:dataModelExt");
  const drawing = ext && ctx.resolvePart?.(ext.attrs["relId"] ?? "");
  const tree = drawing && findDeep3(drawing, "dsp:spTree");
  if (!tree) return void 0;
  const colors = relIds && ctx.resolvePart?.(relIds.attrs["r:cs"] ?? "");
  const lbls = /* @__PURE__ */ new Map();
  for (const l of colors ? childElements(colors, "dgm:styleLbl") : []) lbls.set(l.attrs["name"] ?? "", l);
  const txFill = /* @__PURE__ */ new Map();
  const ptLst = data && findDeep3(data, "dgm:ptLst");
  for (const pt of ptLst ? childElements(ptLst, "dgm:pt") : []) {
    const pr = firstChild(pt, "dgm:prSet");
    const lst = pr && lbls.get(pr.attrs["presStyleLbl"] ?? "");
    const fills = lst && firstChild(lst, "dgm:txFillClrLst");
    const cs = fills ? childElements(fills) : [];
    if (!cs.length || !pt.attrs["modelId"]) continue;
    const i2 = parseInt(pr.attrs["presStyleIdx"] ?? "0", 10) || 0;
    const c = fills.attrs["meth"] === "cycle" ? cs[i2 % cs.length] : cs[Math.min(i2, cs.length - 1)];
    txFill.set(pt.attrs["modelId"], dmlRunColor({ name: "x", attrs: {}, children: [c] }));
  }
  const n = (el3, k) => (parseInt(el3?.attrs[k] ?? "0", 10) || 0) / EMU_PER_TWIP2;
  const rect = (xf) => {
    const off = firstChild(xf, "a:off"), e = firstChild(xf, "a:ext");
    return { x: n(off, "x"), y: n(off, "y"), w: n(e, "cx"), h: n(e, "cy") };
  };
  const items = [];
  const walk = (parent) => {
    for (const sp of childElements(parent)) {
      if (sp.name === "dsp:grpSp") {
        walk(sp);
        continue;
      }
      const spPr = sp.name === "dsp:sp" ? firstChild(sp, "dsp:spPr") : void 0;
      const xf = spPr && firstChild(spPr, "a:xfrm");
      if (!xf) continue;
      const box = rect(xf);
      const styleEl = firstChild(sp, "dsp:style");
      const style = readSpPr(spPr, styleEl);
      if (style.fill || style.line || style.gradient) {
        items.push({ ...box, run: { text: OBJ, shape: { style, widthTwips: box.w, heightTwips: box.h }, props: { ...DEFAULT_RUN_PROPS } } });
      }
      const body = firstChild(sp, "dsp:txBody");
      const paras = body ? dmlParagraphs(body, styleEl, txFill.get(sp.attrs["modelId"] ?? "")) : [];
      if (!body || !paras.some((p) => p.runs.length)) continue;
      const txf = firstChild(sp, "dsp:txXfrm");
      const tbox = txf ? rect(txf) : box;
      const tb = { paras, blocks: paras.map((paragraph) => ({ type: "paragraph", paragraph })), widthTwips: tbox.w, heightTwips: tbox.h };
      bodyPrOf(tb, firstChild(body, "a:bodyPr"));
      const rot = parseInt((txf ?? xf).attrs["rot"] ?? "0", 10);
      if (rot) tb.rot = rot / 6e4;
      items.push({ ...tbox, run: { text: OBJ, textbox: tb, props: { ...DEFAULT_RUN_PROPS } } });
    }
  };
  walk(tree);
  return items.length ? { text: OBJ, group: { widthTwips: wTw, heightTwips: hTw, items } } : void 0;
}
function readDrawingRun(drawing, ctx) {
  const anchorEl = firstChild(drawing, "wp:anchor");
  const container = anchorEl ?? firstChild(drawing, "wp:inline");
  if (!container) return void 0;
  const extent = firstChild(container, "wp:extent");
  const wTw = parseInt(extent?.attrs["cx"] ?? "0", 10) / EMU_PER_TWIP2;
  const hTw = parseInt(extent?.attrs["cy"] ?? "0", 10) / EMU_PER_TWIP2;
  const gd = findDeep3(container, "a:graphicData");
  const obj = gd && childElements(gd).find((c) => ["pic:pic", "wps:wsp", "wpg:wgp", "wpc:wpc"].includes(c.name));
  const dgm = !obj && /\/drawingml\/2006\/diagram$/.test(gd?.attrs["uri"] ?? "");
  if (!obj && !dgm) return void 0;
  const run = obj ? readGraphicObject(obj, ctx, wTw, hTw) : (gd && readDiagram(gd, ctx, wTw, hTw)) ?? { text: OBJ, shape: { style: { geom: "rect" }, widthTwips: wTw, heightTwips: hTw } };
  if (!run) return void 0;
  const anchor = readWpAnchor(anchorEl);
  const target = run.image ?? run.textbox ?? run.shape ?? run.group;
  const ee = !anchorEl ? firstChild(container, "wp:effectExtent") : void 0;
  if (ee && (run.image || run.shape)) {
    const e = (k) => (parseInt(ee.attrs[k] ?? "0", 10) || 0) / EMU_PER_TWIP2;
    const v = { l: e("l"), t: e("t"), r: e("r"), b: e("b") };
    if (v.l || v.t || v.r || v.b) (run.image ?? run.shape).inlineEffect = v;
  }
  if (ee && run.group) {
    const e = (k) => (parseInt(ee.attrs[k] ?? "0", 10) || 0) / EMU_PER_TWIP2;
    for (const it of run.group.items) {
      it.x += e("l");
      it.y += e("t");
    }
    run.group.widthTwips += e("l") + e("r");
    run.group.heightTwips += e("t") + e("b");
  }
  if (target && anchor) {
    target.floating = true;
    target.anchor = anchor;
    if (anchor.behindDoc && (run.image || run.textbox)) (run.image ?? run.textbox).behindDoc = true;
  }
  const docPr = firstChild(container, "wp:docPr");
  if (docPr && /^(1|true)$/.test(docPr.attrs["hidden"] ?? "") && (run.textbox || run.shape || run.group)) (run.textbox ?? run.shape ?? run.group).hidden = true;
  if (drawing.raw && run.shape) run.shape.rawDrawingXml = drawing.raw;
  if (drawing.raw && run.group) run.group.rawDrawingXml = drawing.raw;
  for (const t of [run.image, run.textbox]) {
    if (!t) continue;
    if (anchor) {
      t.relH = anchor.posH.relativeFrom;
      t.relV = anchor.posV.relativeFrom;
      if (anchor.posH.offset !== void 0) t.offsetXTwips = anchor.posH.offset;
      if (anchor.posV.offset !== void 0) t.offsetYTwips = anchor.posV.offset;
    }
    if (drawing.raw) t.rawDrawingXml = drawing.raw;
  }
  if (run.image && drawing.raw) {
    const fmt = readPictureFormat(drawing.raw);
    if (fmt) run.image.format = fmt;
  }
  return run;
}
function syncImageFromXml(img) {
  if (!img.rawDrawingXml) return;
  let root;
  try {
    root = parseXml(img.rawDrawingXml);
  } catch {
    return;
  }
  root.raw = img.rawDrawingXml;
  const ctx = { resolveImage: () => ({ data: img.data, ext: img.ext }), resolveLink: () => void 0 };
  const fresh = readDrawingRun(root, ctx)?.image;
  if (!fresh) return;
  const KEYS = ["widthTwips", "heightTwips", "floating", "offsetXTwips", "offsetYTwips", "relH", "relV", "behindDoc", "anchor", "inlineEffect", "crop", "style", "effects", "format"];
  const dst = img, src = fresh;
  for (const k of KEYS) {
    if (src[k] === void 0) delete dst[k];
    else dst[k] = src[k];
  }
}
function syncShapeFromXml(run) {
  if (run.group && !run.textbox && !run.shape) {
    syncGroupFromXml(run.group);
    return;
  }
  const obj = run.textbox ?? run.shape;
  const raw = obj?.rawDrawingXml;
  if (!obj || !raw) return;
  let root;
  try {
    root = parseXml(raw);
  } catch {
    return;
  }
  root.raw = raw;
  const ctx = { resolveImage: () => void 0, resolveLink: () => void 0 };
  const fresh = readDrawingRun(root, ctx);
  const src = fresh?.textbox ?? fresh?.shape;
  if (!src) return;
  const dst = obj;
  const keep = /* @__PURE__ */ new Set(["paras", "blocks", "rawDrawingXml", "edited", "vml", "vmlId", "vmlNext", ...obj.vml ? ["story", "link"] : []]);
  const blip = obj.shape?.blip ?? obj.style?.blip;
  for (const k of /* @__PURE__ */ new Set([...Object.keys(dst), ...Object.keys(src)])) {
    if (keep.has(k)) continue;
    if (src[k] === void 0) delete dst[k];
    else dst[k] = src[k];
  }
  if (blip) {
    const st = run.textbox ? run.textbox.shape : run.shape?.style;
    if (st && !st.blip && /<a:blipFill\b/.test(raw)) st.blip = blip;
  }
}
function syncGroupFromXml(g) {
  const raw = g.rawDrawingXml;
  if (!raw) return;
  let root;
  try {
    root = parseXml(raw);
  } catch {
    return;
  }
  root.raw = raw;
  const ctx = { resolveImage: () => void 0, resolveLink: () => void 0 };
  const fresh = readDrawingRun(root, ctx)?.group;
  if (!fresh) return;
  const sx = g.widthTwips ? fresh.widthTwips / g.widthTwips : 1, sy = g.heightTwips ? fresh.heightTwips / g.heightTwips : 1;
  if (sx !== 1 || sy !== 1) {
    for (const it of g.items) {
      it.x *= sx;
      it.y *= sy;
      it.w *= sx;
      it.h *= sy;
      const o = it.run.textbox ?? it.run.shape ?? it.run.image;
      if (o) {
        o.widthTwips *= sx;
        o.heightTwips *= sy;
      }
    }
  }
  const dst = g, src = fresh;
  const keep = /* @__PURE__ */ new Set(["items", "rawDrawingXml", "edited"]);
  for (const k of /* @__PURE__ */ new Set([...Object.keys(dst), ...Object.keys(src)])) {
    if (keep.has(k)) continue;
    if (src[k] === void 0) delete dst[k];
    else dst[k] = src[k];
  }
}
function readVmlRuns(container, ctx, inline) {
  const out = [];
  const shapeOf = (el3, inGroup) => {
    const st = parseVmlStyle(el3.attrs["style"]);
    if (st["visibility"] === "hidden" || st["display"] === "none") return void 0;
    let w = vmlLenTwips(st["width"]) ?? 0;
    let h = vmlLenTwips(st["height"]) ?? 0;
    let anchor = inGroup ? void 0 : vmlAnchor(st, findDeep3(el3, "w10:wrap"));
    if (inGroup) {
      w = (parseFloat(st["width"] ?? "0") || 0) * inGroup.sx;
      h = (parseFloat(st["height"] ?? "0") || 0) * inGroup.sy;
    }
    const textpath = findDeep3(el3, "v:textpath");
    if (textpath) {
      const text = textpath.attrs["string"] ?? "";
      if (!text.trim()) return void 0;
      const tps = parseVmlStyle(textpath.attrs["style"]);
      const famRaw = (tps["font-family"] ?? "").replace(/^["']|["']$/g, "").trim();
      const sh = vmlShapeStyle(el3, "rect");
      const color = sh.fill ?? "000000";
      const a = sh.fillAlpha;
      const rpr = {
        ...famRaw ? { rFonts: { ascii: famRaw, hAnsi: famRaw, cs: famRaw } } : {},
        color: { val: color },
        sz: 72,
        ...a !== void 0 && a < 1 ? { textFill: { color, alpha: Math.max(0, a) } } : {},
        .../bold|[6-9]00/.test(tps["font-weight"] ?? "") ? { b: true } : {},
        .../italic/.test(tps["font-style"] ?? "") ? { i: true } : {}
      };
      const wppr = { jc: "center", spacing: { before: 0, after: 0, line: 240, lineRule: "auto" } };
      const para = { runs: [{ text, props: runPropsFromRPr(rpr), rpr }], props: paraPropsFromPPr(wppr), ppr: wppr };
      const tb = { paras: [para], blocks: [{ type: "paragraph", paragraph: para }], widthTwips: w, heightTwips: h, vml: true, insets: { l: 0, t: 0, r: 0, b: 0 }, vAnchor: "ctr", wordArt: "textPlain" };
      const rot = parseFloat(st["rotation"] ?? "0");
      if (rot) tb.rot = rot;
      const run2 = { text: OBJ, textbox: tb };
      if (anchor) {
        tb.floating = true;
        tb.anchor = anchor;
        if (anchor.behindDoc) tb.behindDoc = true;
        tb.relH = anchor.posH.relativeFrom;
        tb.relV = anchor.posV.relativeFrom;
        if (anchor.posH.offset !== void 0) tb.offsetXTwips = anchor.posH.offset;
        if (anchor.posV.offset !== void 0) tb.offsetYTwips = anchor.posV.offset;
      }
      return run2;
    }
    const imagedata = firstChild(el3, "v:imagedata");
    const rid = imagedata?.attrs["r:id"] ?? imagedata?.attrs["r:pict"];
    let run;
    if (rid) {
      const media = ctx.resolveImage(rid);
      if (!media) return void 0;
      const image = { data: media.data, ext: media.ext, widthTwips: w, heightTwips: h, vml: true };
      const crop = (k) => {
        const v = imagedata.attrs[k];
        if (!v) return 0;
        return v.endsWith("f") ? parseInt(v, 10) / 65536 : parseFloat(v);
      };
      const c = { l: crop("cropleft"), t: crop("croptop"), r: crop("cropright"), b: crop("cropbottom") };
      if (c.l || c.t || c.r || c.b) image.crop = c;
      const fx = vmlImageEffects(imagedata);
      if (fx) image.effects = fx;
      run = { text: OBJ, image };
    } else {
      const txb = firstChild(el3, "v:textbox");
      const content = txb && firstChild(txb, "w:txbxContent");
      if (content) {
        const tb = { paras: [], widthTwips: w, heightTwips: h, vml: true };
        textboxBlocks(content, ctx, tb);
        const inset = (txb.attrs["inset"] ?? "").split(",");
        const ins = (i2, def) => inset[i2] && inset[i2].trim() ? vmlLenTwips(inset[i2].trim()) ?? def : def;
        tb.insets = { l: ins(0, 144), t: ins(1, 72), r: ins(2, 144), b: ins(3, 72) };
        const tbStyle = parseVmlStyle(txb.attrs["style"]);
        if (tbStyle["mso-fit-shape-to-text"] === "t") tb.autoFit = true;
        if (parseVmlStyle(el3.attrs["style"])["mso-wrap-style"] === "none") tb.noWrap = true;
        const flow = tbStyle["layout-flow"], alt = tbStyle["mso-layout-flow-alt"];
        if (flow === "vertical") tb.vert = alt === "bottom-to-top" ? "vert270" : alt === "top-to-bottom" ? "mongolianVert" : "vert";
        else if (flow === "vertical-ideographic") tb.vert = "eaVert";
        const va = st["v-text-anchor"];
        if (va === "middle" || va === "middle-center" || va === "middle-baseline") tb.vAnchor = "ctr";
        else if (va === "bottom" || va === "bottom-center" || va === "bottom-baseline") tb.vAnchor = "b";
        if (el3.attrs["id"]) tb.vmlId = el3.attrs["id"];
        const next = tbStyle["mso-next-textbox"];
        if (next) tb.vmlNext = next.replace(/^#/, "");
        const sh = vmlShapeStyle(el3, "rect");
        if (sh.fill || sh.line) tb.shape = sh;
        if (!inGroup && vmlSingleTextbox(container) === el3) {
          const raw = vmlTextboxToDrawing(el3, 1 + (parseInt((el3.attrs["o:spid"] ?? "").replace(/\D/g, ""), 10) || 0));
          if (raw) tb.rawDrawingXml = raw;
        }
        run = { text: OBJ, textbox: tb };
      } else {
        const tag = el3.name.replace(/^v:/, "");
        const type = el3.attrs["type"] ?? "";
        const declared = el3.attrs["fillcolor"] || el3.attrs["strokecolor"] || el3.attrs["filled"] || el3.attrs["stroked"] || firstChild(el3, "v:fill") || firstChild(el3, "v:stroke");
        if (tag === "shape" && (type.includes("_x0000_t75") || !declared)) {
          return void 0;
        }
        const geom = tag === "oval" ? "ellipse" : tag === "roundrect" ? "roundRect" : tag === "line" || type.includes("_x0000_t32") ? "line" : "rect";
        const style = vmlShapeStyle(el3, geom);
        if (geom === "line") delete style.fill;
        const shape = { style, widthTwips: w, heightTwips: h };
        if (el3.attrs["o:hr"] === "t") shape.hr = true;
        if (tag === "line") {
          const pt = (s) => (s ?? "0,0").split(",").map((v) => vmlLenTwips(v.trim()) ?? 0);
          const [x1 = 0, y1 = 0] = pt(el3.attrs["from"]);
          const [x2 = 0, y2 = 0] = pt(el3.attrs["to"]);
          shape.line = { x1, y1, x2, y2 };
          shape.widthTwips = Math.abs(x2 - x1);
          shape.heightTwips = Math.abs(y2 - y1);
          if (!anchor && !inGroup) anchor = vmlAnchor({ ...st, position: "absolute" });
        }
        run = { text: OBJ, shape };
      }
    }
    const target = run.image ?? run.textbox ?? run.shape;
    if (target && anchor) {
      target.floating = true;
      target.anchor = anchor;
      if (run.image || run.textbox) {
        const t = run.image ?? run.textbox;
        if (anchor.behindDoc) t.behindDoc = true;
        t.relH = anchor.posH.relativeFrom;
        t.relV = anchor.posV.relativeFrom;
        if (anchor.posH.offset !== void 0) t.offsetXTwips = anchor.posH.offset;
        if (anchor.posV.offset !== void 0) t.offsetYTwips = anchor.posV.offset;
      }
    }
    return run;
  };
  for (const el3 of childElements(container)) {
    if (el3.name === "v:shapetype" || el3.name.startsWith("o:") || el3.name.startsWith("w10:")) continue;
    if (el3.name === "v:group") {
      const st = parseVmlStyle(el3.attrs["style"]);
      const w = vmlLenTwips(st["width"]) ?? 0;
      const h = vmlLenTwips(st["height"]) ?? 0;
      const cs = (el3.attrs["coordsize"] ?? "1000,1000").split(",").map((v) => parseFloat(v) || 1e3);
      const co = (el3.attrs["coordorigin"] ?? "0,0").split(",").map((v) => parseFloat(v) || 0);
      const sx = w / (cs[0] || 1), sy = h / (cs[1] || 1);
      const items = [];
      for (const c of childElements(el3)) {
        if (!c.name.startsWith("v:") || c.name === "v:shapetype") continue;
        const cst = parseVmlStyle(c.attrs["style"]);
        const r = shapeOf(c, { sx, sy });
        if (!r) continue;
        const x2 = ((parseFloat(cst["left"] ?? "0") || 0) - (co[0] ?? 0)) * sx;
        const y = ((parseFloat(cst["top"] ?? "0") || 0) - (co[1] ?? 0)) * sy;
        const tgt = r.image ?? r.textbox ?? r.shape;
        items.push({ x: x2, y, w: tgt?.widthTwips ?? 0, h: tgt?.heightTwips ?? 0, run: { ...r, props: { ...DEFAULT_RUN_PROPS } } });
      }
      if (!items.length) continue;
      const group2 = { widthTwips: w, heightTwips: h, items };
      const anchor = vmlAnchor(st, findDeep3(el3, "w10:wrap"));
      if (anchor) {
        group2.floating = true;
        group2.anchor = anchor;
      }
      out.push({ text: OBJ, group: group2 });
      continue;
    }
    if (el3.name.startsWith("v:")) {
      const r = shapeOf(el3);
      if (r) {
        if (inline && r.image) {
          delete r.image.floating;
          delete r.image.anchor;
          const oo = findDeep3(container, "o:OLEObject");
          const rid = oo?.attrs["r:id"];
          if (oo && rid && oo.attrs["Type"] !== "Link") {
            const part = ctx.resolveImage(rid);
            if (part) r.image.ole = { progId: oo.attrs["ProgID"] ?? "", data: part.data, ext: part.ext };
          }
        }
        out.push(r);
      }
    }
  }
  return out;
}
function textContentOf(el3) {
  let out = "";
  for (const c of el3.children) out += typeof c === "string" ? c : textContentOf(c);
  return out;
}
function runTarget(ctx, runs) {
  const top = ctx.fieldStack?.[ctx.fieldStack.length - 1];
  if (!top) return runs;
  if (top.phase === "instr") return null;
  return top.crossed ? runs : top.runs;
}
var isObjectRun = (r) => !!(r.image || r.textbox || r.shape || r.group);
function closeField(ctx, runs) {
  const f = ctx.fieldStack.pop();
  if (f.crossed) {
    if (ctx.sources) runTarget(ctx, runs)?.push({ text: "", props: { ...DEFAULT_RUN_PROPS }, fieldEnd: true });
    return;
  }
  const textRuns = f.runs.filter((r) => !isObjectRun(r));
  const text = textRuns.map((r) => r.text).join("");
  const first = textRuns[0] ?? f.runs[0];
  const parent = ctx.fieldStack[ctx.fieldStack.length - 1];
  if (parent && parent.phase === "instr") {
    parent.instr += text;
    return;
  }
  const run = {
    text,
    props: { ...first?.props ?? f.props },
    field: ` ${f.instr.trim()} `
  };
  const rpr = f.ff ? f.rpr : first?.rpr ?? f.rpr;
  if (rpr) run.rpr = rpr;
  setRPrEl(run, f.ff ? f.rPrEl : rPrElOf(first) ?? f.rPrEl);
  if (f.ff) run.formField = f.ff;
  if (f.runs.length) run.fieldResult = f.runs;
  runTarget(ctx, runs)?.push(run);
}
function readRunsInto(runs, container, ctx, inherit) {
  for (const child of childElements(container)) {
    switch (child.name) {
      case "w:commentRangeStart":
        ctx.activeComments?.add(parseInt(child.attrs["w:id"] ?? "-1", 10));
        break;
      case "w:commentRangeEnd":
        ctx.activeComments?.delete(parseInt(child.attrs["w:id"] ?? "-1", 10));
        break;
      case "w:bookmarkStart":
      case "w:bookmarkEnd": {
        const end = child.name === "w:bookmarkEnd";
        const id = parseInt(child.attrs["w:id"] ?? "", 10);
        ctx.bookmarkIds ??= /* @__PURE__ */ new Map();
        const name = end ? ctx.bookmarkIds.get(id) : child.attrs["w:name"];
        if (!name) break;
        const at = runs.reduce((n, r) => n + r.text.length, 0);
        if (end) {
          ctx.bookmarkIds.delete(id);
          ctx.onBookmarkEnd?.(name, at);
        } else {
          if (Number.isFinite(id)) ctx.bookmarkIds.set(id, name);
          ctx.onBookmark?.(name, at);
        }
        const top = ctx.fieldStack?.[ctx.fieldStack.length - 1];
        if (ctx.sources && Number.isFinite(id) && (!top || top.crossed) && child.attrs["w:colFirst"] === void 0) {
          const link = inherit?.link ? { link: inherit.link, ...inherit.tip ? { linkTip: inherit.tip } : {} } : {};
          runs.push({ text: "", props: { ...DEFAULT_RUN_PROPS, ...link }, bookmark: { id, name, ...end ? { end: true } : {} } });
        }
        break;
      }
      case "w:r":
        readSingleRun(runs, child, ctx, inherit);
        break;
      case "w:hyperlink": {
        const rid = child.attrs["r:id"];
        const anchor = child.attrs["w:anchor"];
        const link = rid && ctx.resolveLink(rid) || (anchor ? `#${anchor}` : void 0);
        const tip = child.attrs["w:tooltip"];
        readRunsInto(runs, child, ctx, { ...inherit, link, ...tip ? { tip } : {} });
        break;
      }
      case "w:fldSimple": {
        const instr = child.attrs["w:instr"] ?? "";
        const inner = [];
        readRunsInto(inner, child, ctx, inherit);
        const textRuns = inner.filter((r) => !isObjectRun(r));
        const first = textRuns[0];
        const run = {
          text: textRuns.map((r) => r.text).join(""),
          props: { ...first?.props ?? DEFAULT_RUN_PROPS },
          field: instr
        };
        if (first?.rpr) run.rpr = first.rpr;
        setRPrEl(run, rPrElOf(first));
        if (inner.length) run.fieldResult = inner;
        runTarget(ctx, runs)?.push(run);
        break;
      }
      case "m:oMath":
      case "m:oMathPara": {
        const text = collectMathText(child);
        if (!text) break;
        const run = { text, props: { ...DEFAULT_RUN_PROPS, italic: true, isMath: true } };
        if (child.name === "m:oMathPara") {
          const paraPr = firstChild(child, "m:oMathParaPr");
          const jc = paraPr ? firstChild(paraPr, "m:jc")?.attrs["m:val"] : void 0;
          const nodes = [];
          for (const om of childElements(child)) {
            if (om.name !== "m:oMath") continue;
            if (nodes.length) nodes.push({ t: "br" });
            readMathNodes(om, nodes);
          }
          run.math = { nodes, ...jc ? { jc } : {} };
        }
        runTarget(ctx, runs)?.push(run);
        break;
      }
      case "w:sdt": {
        const content = findDeep3(child, "w:sdtContent");
        const sdtPr = firstChild(child, "w:sdtPr");
        const tag = sdtPr ? firstChild(sdtPr, "w:tag")?.attrs["w:val"] : void 0;
        const custom = parseCustomInlineTag(tag);
        if (content && custom) {
          const nested = [];
          readRunsInto(nested, content, ctx, inherit);
          const fallbackText = nested.map((run) => run.text).join("");
          runTarget(ctx, runs)?.push({
            text: "\uFFFC",
            props: { ...nested[0]?.props ?? DEFAULT_RUN_PROPS },
            custom: { ...custom, fallbackText }
          });
        } else if (content) {
          readRunsInto(runs, content, ctx, inherit);
        }
        break;
      }
      case "w:smartTag":
      case "w:customXml":
      case "w:dir":
      case "w:bdo":
        readRunsInto(runs, child, ctx, inherit);
        break;
      // revisões: o texto inserido E o excluído ficam no modelo, marcados nas props
      // (a visão final esconde o excluído — motor de layout)
      case "w:ins":
      case "w:moveTo":
        readRunsInto(runs, child, ctx, { ...inherit, ins: readRevisionInfo(child) });
        break;
      case "w:del":
      case "w:moveFrom":
        readRunsInto(runs, child, ctx, { ...inherit, del: readRevisionInfo(child) });
        break;
    }
  }
}
var CUSTOM_INLINE_TAG_PREFIX = "wordnext:inline:";
function parseCustomInlineTag(tag) {
  if (!tag?.startsWith(CUSTOM_INLINE_TAG_PREFIX)) return void 0;
  const payload = tag.slice(CUSTOM_INLINE_TAG_PREFIX.length);
  const split2 = payload.indexOf(":");
  if (split2 <= 0) return void 0;
  const type = payload.slice(0, split2);
  if (!/^[a-zA-Z0-9._-]+$/.test(type)) return void 0;
  try {
    return { type, data: JSON.parse(decodeURIComponent(payload.slice(split2 + 1))) };
  } catch {
    return void 0;
  }
}
function readMathNodes(el3, out = []) {
  for (const c of childElements(el3)) {
    switch (c.name) {
      case "m:r":
      case "w:r": {
        const mrPr = firstChild(c, "m:rPr");
        const sty = mrPr ? firstChild(mrPr, "m:nor") ? "p" : firstChild(mrPr, "m:sty")?.attrs["m:val"] : void 0;
        const wrPr = firstChild(c, "w:rPr");
        const rpr = wrPr ? readRPr(wrPr) : void 0;
        let text = "";
        const flush = () => {
          if (text) out.push({ t: "r", text, ...sty ? { sty } : {}, ...rpr ? { rpr } : {} });
          text = "";
        };
        for (const k of childElements(c)) {
          if (k.name === "m:t" || k.name === "w:t") text += textContentOf(k);
          else if (k.name === "w:br") {
            flush();
            out.push({ t: "br", ...rpr ? { rpr } : {} });
          }
        }
        flush();
        break;
      }
      case "m:f": {
        const fPr = firstChild(c, "m:fPr");
        const type = fPr ? firstChild(fPr, "m:type")?.attrs["m:val"] : void 0;
        const num2 = firstChild(c, "m:num"), den = firstChild(c, "m:den");
        out.push({ t: "f", num: num2 ? readMathNodes(num2) : [], den: den ? readMathNodes(den) : [], ...type ? { type } : {} });
        break;
      }
      case "m:d": {
        const dPr = firstChild(c, "m:dPr");
        const chr = (name, def) => {
          const e = dPr ? firstChild(dPr, name) : void 0;
          return e ? e.attrs["m:val"] ?? "" : def;
        };
        const beg = chr("m:begChr", "("), sep = chr("m:sepChr", "|"), end = chr("m:endChr", ")");
        if (beg) out.push({ t: "r", text: beg, sty: "p" });
        childElements(c).filter((e) => e.name === "m:e").forEach((e, i2) => {
          if (i2 && sep) out.push({ t: "r", text: sep, sty: "p" });
          readMathNodes(e, out);
        });
        if (end) out.push({ t: "r", text: end, sty: "p" });
        break;
      }
      default:
        if (!c.name.endsWith("Pr")) readMathNodes(c, out);
    }
  }
  return out;
}
function collectMathText(el3) {
  let out = "";
  for (const c of el3.children) {
    if (typeof c === "string") continue;
    if (c.name === "m:t") out += textContentOf(c);
    else out += collectMathText(c);
  }
  return out;
}
function readSingleRun(runs, rEl, ctx, inherit) {
  const rPrEl = firstChild(rEl, "w:rPr");
  const rpr = readRPr(rPrEl);
  const rProps = runPropsFromRPr(rpr);
  if (inherit?.link) {
    rProps.link = inherit.link;
    if (inherit.tip) rProps.linkTip = inherit.tip;
    rProps.underline = true;
    rProps.color ??= "0563C1";
  }
  ctx.fieldStack ??= [];
  const stack = ctx.fieldStack;
  const make = (text2, extra) => {
    const props = { ...rProps };
    if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
    if (inherit?.ins) props.ins = inherit.ins;
    if (inherit?.del) props.del = inherit.del;
    const run = { text: text2, props, ...inherit?.field ? { field: inherit.field } : {}, ...extra };
    if (rpr) run.rpr = rpr;
    setRPrEl(run, rPrEl);
    if (stack.some((f) => f.phase === "result" && /^\s*TOC\b/i.test(f.instr))) run.inToc = true;
    return run;
  };
  let text = "";
  const flush = () => {
    if (text.length === 0) return;
    runTarget(ctx, runs)?.push(make(text));
    text = "";
  };
  const pushRun = (extra) => {
    flush();
    runTarget(ctx, runs)?.push(make(extra.text, extra));
  };
  for (const child of childElements(rEl)) {
    if (child.name === "w:rPr") continue;
    if (child.name === "w:fldChar") {
      flush();
      const type = child.attrs["w:fldCharType"];
      if (type === "begin") {
        const frame = {
          instr: "",
          phase: "instr",
          runs: [],
          crossed: false,
          props: { ...rProps, ...inherit?.ins ? { ins: inherit.ins } : {}, ...inherit?.del ? { del: inherit.del } : {} }
        };
        if (rpr) frame.rpr = rpr;
        if (rPrEl) frame.rPrEl = rPrEl;
        const ff = firstChild(child, "w:ffData");
        if (ff) {
          const cb = firstChild(ff, "w:checkBox");
          if (cb) {
            const def = firstChild(cb, "w:default")?.attrs["w:val"];
            const chk = firstChild(cb, "w:checked");
            const size = firstChild(cb, "w:size")?.attrs["w:val"];
            frame.ff = {
              type: "checkBox",
              checked: chk ? chk.attrs["w:val"] !== "0" && chk.attrs["w:val"] !== "false" : def === "1" || def === "true",
              ...size ? { sizeHalfPt: parseInt(size, 10) } : {},
              ...firstChild(cb, "w:sizeAuto") || !size ? { sizeAuto: true } : {}
            };
          } else if (firstChild(ff, "w:ddList")) {
            const dl = firstChild(ff, "w:ddList");
            const entries = childElements(dl, "w:listEntry").map((e) => e.attrs["w:val"] ?? "");
            const idx = (name) => {
              const k = parseInt(firstChild(dl, name)?.attrs["w:val"] ?? "", 10);
              return Number.isInteger(k) && k >= 0 && k < entries.length ? k : void 0;
            };
            frame.ff = { type: "dropDown", entries, selected: idx("w:result") ?? idx("w:default") ?? 0 };
          } else if (firstChild(ff, "w:textInput")) frame.ff = { type: "textInput" };
        }
        stack.push(frame);
      } else if (type === "separate") {
        const top = stack[stack.length - 1];
        if (top) top.phase = "result";
      } else if (type === "end") {
        if (stack.length) closeField(ctx, runs);
      }
      continue;
    }
    if (child.name === "w:instrText" || child.name === "w:delInstrText") {
      const top = stack[stack.length - 1];
      if (top && top.phase === "instr") top.instr += textContentOf(child);
      continue;
    }
    switch (child.name) {
      case "w:t":
      case "w:delText":
        text += child.children.filter((c) => typeof c === "string").join("").replace(/\u00AD/g, "\u2011").replace(/\r\n|[\r\n]/g, " ");
        break;
      case "w:tab":
        text += "	";
        break;
      case "w:ptab":
        pushRun({
          text: "	",
          ptab: {
            alignment: child.attrs["w:alignment"] ?? "left",
            relativeTo: child.attrs["w:relativeTo"] ?? "margin",
            ...child.attrs["w:leader"] ? { leader: child.attrs["w:leader"] } : {}
          }
        });
        break;
      case "w:br":
      case "w:cr": {
        const t = child.attrs["w:type"];
        const clr = child.attrs["w:clear"];
        text += t === "page" ? "\f" : t === "column" ? "\v" : clr && clr !== "none" ? "\u2028" : "\n";
        break;
      }
      case "w:noBreakHyphen":
        text += "\u2011";
        break;
      case "w:softHyphen":
        text += "\xAD";
        break;
      case "w:sym": {
        const hex2 = child.attrs["w:char"] ?? "F0B7";
        let code = parseInt(hex2, 16);
        if (code <= 255) code |= 61440;
        const font = child.attrs["w:font"];
        flush();
        const run = make(String.fromCharCode(code));
        run.props.fontAscii = font ?? rProps.fontAscii;
        if (font) run.symFont = font;
        runTarget(ctx, runs)?.push(run);
        break;
      }
      case "w:footnoteReference":
      case "w:endnoteReference": {
        const id = parseInt(child.attrs["w:id"] ?? "0", 10);
        flush();
        const custom = child.attrs["w:customMarkFollows"] === "1" || child.attrs["w:customMarkFollows"] === "true";
        const run = make("", { noteRef: { kind: child.name === "w:footnoteReference" ? "footnote" : "endnote", id, ...custom ? { custom } : {} } });
        run.props.vertAlign = "superscript";
        runTarget(ctx, runs)?.push(run);
        break;
      }
      case "w:footnoteRef":
      case "w:endnoteRef":
        pushRun({ text: "", field: child.name === "w:footnoteRef" ? " FOOTNOTEREF_MARK " : " ENDNOTEREF_MARK " });
        break;
      case "w:pgNum":
        pushRun({ text: "", field: " PAGE " });
        break;
      case "w:drawing": {
        flush();
        const tgt = runTarget(ctx, runs), k = tgt?.length ?? 0;
        const r = readDrawingRun(child, ctx);
        if (r) pushRun(r);
        tagObjectRuns(tgt, k, child);
        break;
      }
      case "w:pict":
      case "w:object": {
        flush();
        const tgt = runTarget(ctx, runs), k = tgt?.length ?? 0;
        for (const r of readVmlRuns(child, ctx, child.name === "w:object")) pushRun(r);
        tagObjectRuns(tgt, k, child);
        break;
      }
      case "mc:AlternateContent": {
        flush();
        const tgt = runTarget(ctx, runs), k = tgt?.length ?? 0;
        const choice = firstChild(child, "mc:Choice");
        const drawing = choice && findDeep3(choice, "w:drawing");
        const r = drawing && readDrawingRun(drawing, ctx);
        if (r) pushRun(r);
        else {
          const fb = firstChild(child, "mc:Fallback");
          const pict = fb && (findDeep3(fb, "w:pict") ?? findDeep3(fb, "w:object"));
          if (pict) for (const v of readVmlRuns(pict, ctx, pict.name === "w:object")) pushRun(v);
        }
        tagObjectRuns(tgt, k, child);
        break;
      }
      case "w:ruby": {
        const base = firstChild(child, "w:rubyBase");
        if (base) {
          flush();
          readRunsInto(runs, base, ctx, inherit);
        }
        break;
      }
    }
  }
  flush();
}
function readParagraph(pEl, ctx) {
  const pPrEl = firstChild(pEl, "w:pPr");
  const ppr = readPPr(pPrEl);
  const props = paraPropsFromPPr(ppr);
  const runs = [];
  const capture = ctx.sources !== void 0 && ctx.sourceXml !== void 0 && pEl.s !== void 0;
  const segs = [];
  if (!capture) readRunsInto(runs, pEl, ctx);
  else {
    const xml = ctx.sourceXml;
    const openHere = () => (ctx.fieldStack ?? []).some((f) => !f.crossed);
    let cur = null;
    for (const child of childElements(pEl)) {
      if (child.name === "w:pPr") continue;
      const raw = xml.slice(child.s, child.e);
      const before = runs.length;
      const joining = cur !== null && openHere();
      readRunsInto(runs, { name: pEl.name, attrs: {}, children: [child] }, ctx);
      if (joining) {
        cur.seg.raw += raw;
        cur.to = runs.length;
        delete cur.seg.wrapOpen;
        delete cur.seg.wrapClose;
      } else {
        cur = { seg: { raw, sids: [] }, from: before, to: runs.length };
        if (INLINE_WRAPPERS.has(child.name) && child.cs !== child.e && !openHere()) {
          const content = child.name === "w:sdt" ? firstChild(child, "w:sdtContent") : child;
          if (content && content.cs !== content.e) {
            let start = content.cs;
            if (content === child) {
              for (const k of childElements(child)) {
                if (k.name.endsWith("Pr")) start = k.e;
                else break;
              }
            }
            cur.seg.wrapOpen = xml.slice(child.s, start);
            cur.seg.wrapClose = xml.slice(content.ce, child.e);
          }
        }
        segs.push(cur);
      }
    }
  }
  const stack = ctx.fieldStack ?? [];
  for (let i2 = stack.length - 1; i2 >= 0; i2--) {
    const f = stack[i2];
    if (f.phase !== "result" || f.crossed) continue;
    if (i2 === stack.length - 1 && (f.runs.length || ctx.sources)) {
      const textRuns = f.runs.filter((r) => !isObjectRun(r));
      const first = textRuns[0] ?? f.runs[0];
      const run = {
        text: textRuns.map((r) => r.text).join(""),
        props: { ...first?.props ?? f.props },
        field: ` ${f.instr.trim()} `,
        fieldOpen: true
      };
      if (f.runs.length) run.fieldResult = f.runs;
      const rpr = first?.rpr ?? f.rpr;
      if (rpr) run.rpr = rpr;
      runs.push(run);
    }
    f.crossed = true;
    f.runs = [];
  }
  const instr = collectInstrText(pEl);
  if (/\bTOC\b/.test(instr)) props.tocInstr = instr.trim();
  const para = { runs, props };
  if (ppr) para.ppr = ppr;
  if (capture) captureParagraph(para, pEl, pPrEl, segs, ctx.sources, ctx.sourceXml);
  return para;
}
function captureParagraph(para, pEl, pPrEl, segs, store, xml) {
  const last = segs[segs.length - 1];
  if (last && last.to < para.runs.length) {
    last.to = para.runs.length;
    last.seg.open = true;
  }
  let objHead = 0;
  for (const { seg, from, to } of segs) {
    if (seg.wrapOpen !== void 0 && seg.raw.startsWith("<w:hyperlink")) {
      seg.link = para.runs[from]?.props.link ?? "";
      seg.tip = para.runs[from]?.props.linkTip ?? "";
    }
    for (let i2 = from; i2 < to; i2++) {
      const run = para.runs[i2];
      const sid = store.id();
      const el3 = rPrElOf(run);
      const obj = objElOf(run);
      store.runs.set(sid, {
        ...el3 ? { rPr: xml.slice(el3.s, el3.e) } : {},
        ...obj === true ? { objHead } : obj ? { obj: xml.slice(obj.s, obj.e) } : {}
      });
      if (obj && obj !== true) objHead = sid;
      run.props.src = sid;
      seg.sids.push(sid);
    }
  }
  const selfClosing = pEl.cs === pEl.e;
  store.addPara(para, {
    raw: xml.slice(pEl.s, pEl.e),
    at: pEl.s,
    open: selfClosing ? xml.slice(pEl.s, pEl.e).replace(/\s*\/>$/, ">") : xml.slice(pEl.s, pEl.cs),
    ...pPrEl ? { pPr: xml.slice(pPrEl.s, pPrEl.e) } : {},
    segs: segs.map((x2) => x2.seg)
  });
}
function collectInstrText(el3) {
  let out = "";
  for (const c of el3.children) {
    if (typeof c === "string") continue;
    if (c.name === "w:instrText") out += textContentOf(c);
    else out += collectInstrText(c);
  }
  return out;
}
function buildReadContext(pkg, relsPath) {
  const relsXml = pkg.getPartText(relsPath);
  const relMap = /* @__PURE__ */ new Map();
  if (relsXml) {
    const rels = parseXml(relsXml);
    for (const rel of childElements(rels, "Relationship")) {
      const id = rel.attrs["Id"];
      const target = rel.attrs["Target"];
      if (id && target) {
        relMap.set(id, {
          target: target.replace(/^\.\//, ""),
          external: rel.attrs["TargetMode"] === "External"
        });
      }
    }
  }
  return {
    activeComments: /* @__PURE__ */ new Set(),
    fieldStack: [],
    resolveImage: (rid) => {
      const rel = relMap.get(rid);
      if (!rel || rel.external) return void 0;
      const path = rel.target.startsWith("/") ? rel.target.slice(1) : `word/${rel.target}`;
      const data = pkg.getPart(path);
      if (!data) return void 0;
      const ext = path.split(".").pop()?.toLowerCase() ?? "png";
      return { data, ext, path };
    },
    resolveLink: (rid) => {
      const rel = relMap.get(rid);
      return rel?.external ? rel.target : void 0;
    },
    resolvePart: (rid) => {
      const rel = relMap.get(rid);
      if (!rel || rel.external) return void 0;
      const xml = pkg.getPartText(rel.target.startsWith("/") ? rel.target.slice(1) : `word/${rel.target}`);
      return xml ? parseXml(xml) : void 0;
    }
  };
}
var tw = (el3, attr2, fallback) => {
  const v = el3?.attrs[attr2];
  return v === void 0 ? fallback : parseInt(v, 10);
};
function readSectPr(sectEl) {
  const pgSz = sectEl && firstChild(sectEl, "w:pgSz");
  const pgMar = sectEl && firstChild(sectEl, "w:pgMar");
  const colsEl = sectEl && firstChild(sectEl, "w:cols");
  const sect = {
    pageWidthTwips: tw(pgSz, "w:w", 11906),
    pageHeightTwips: tw(pgSz, "w:h", 16838),
    marginLeftTwips: tw(pgMar, "w:left", 1701),
    marginRightTwips: tw(pgMar, "w:right", 1701),
    marginTopTwips: tw(pgMar, "w:top", 1417),
    marginBottomTwips: tw(pgMar, "w:bottom", 1417),
    headerDistanceTwips: tw(pgMar, "w:header", 720),
    footerDistanceTwips: tw(pgMar, "w:footer", 720)
  };
  const type = sectEl && firstChild(sectEl, "w:type")?.attrs["w:val"];
  if (type === "continuous" || type === "evenPage" || type === "oddPage" || type === "nextColumn") sect.type = type;
  const num2 = colsEl ? parseInt(colsEl.attrs["w:num"] ?? "1", 10) : 1;
  if (num2 > 1) {
    sect.cols = {
      count: num2,
      spaceTwips: parseInt(colsEl.attrs["w:space"] ?? "720", 10),
      sep: colsEl.attrs["w:sep"] === "true" || colsEl.attrs["w:sep"] === "1"
    };
    const eq2 = colsEl.attrs["w:equalWidth"];
    const defs = childElements(colsEl, "w:col");
    if ((eq2 === "0" || eq2 === "false") && defs.length >= num2) {
      sect.cols.widths = defs.slice(0, num2).map((c) => ({
        widthTwips: parseInt(c.attrs["w:w"] ?? "0", 10) || 0,
        spaceTwips: parseInt(c.attrs["w:space"] ?? "0", 10) || 0
      }));
    }
  }
  const titlePg = sectEl && firstChild(sectEl, "w:titlePg");
  if (titlePg && titlePg.attrs["w:val"] !== "0" && titlePg.attrs["w:val"] !== "false") {
    sect.titlePg = true;
  }
  const pb = sectEl && firstChild(sectEl, "w:pgBorders");
  if (pb) {
    const out = {};
    const of = pb.attrs["w:offsetFrom"], dp = pb.attrs["w:display"], z = pb.attrs["w:zOrder"];
    if (of === "page" || of === "text") out.offsetFrom = of;
    if (dp === "allPages" || dp === "firstPage" || dp === "notFirstPage") out.display = dp;
    if (z === "front" || z === "back") out.zOrder = z;
    for (const side of ["top", "left", "bottom", "right"]) {
      const b = readBorder(firstChild(pb, `w:${side}`));
      if (b) out[side] = b;
    }
    sect.pgBorders = out;
  }
  const pgNumType = sectEl && firstChild(sectEl, "w:pgNumType");
  const startAttr = pgNumType?.attrs["w:start"];
  if (startAttr !== void 0) {
    const n = parseInt(startAttr, 10);
    if (!Number.isNaN(n)) sect.pgNumStart = n;
  }
  const pgFmt = pgNumType?.attrs["w:fmt"];
  if (pgFmt) sect.pgNumFmt = pgFmt;
  const chapStyle = parseInt(pgNumType?.attrs["w:chapStyle"] ?? "", 10);
  if (chapStyle > 0) {
    sect.pgNumChapStyle = chapStyle;
    const sep = pgNumType?.attrs["w:chapSep"];
    if (sep === "period" || sep === "colon" || sep === "emDash" || sep === "enDash") sect.pgNumChapSep = sep;
  }
  const fnPr = readNoteProps(sectEl && firstChild(sectEl, "w:footnotePr"));
  if (fnPr) sect.footnotePr = fnPr;
  const enPr = readNoteProps(sectEl && firstChild(sectEl, "w:endnotePr"));
  if (enPr) sect.endnotePr = enPr;
  const fnCols = sectEl && firstChild(sectEl, "w15:footnoteColumns")?.attrs["w:val"];
  if (fnCols !== void 0 && parseInt(fnCols, 10) > 0) sect.footnoteColumns = parseInt(fnCols, 10);
  const ln2 = sectEl && firstChild(sectEl, "w:lnNumType");
  if (ln2) {
    const num3 = (k) => {
      const n = parseInt(ln2.attrs[k] ?? "", 10);
      return Number.isNaN(n) ? void 0 : n;
    };
    const out = {};
    const cb = num3("w:countBy"), st = num3("w:start"), di = num3("w:distance");
    if (cb !== void 0) out.countBy = cb;
    if (st !== void 0) out.start = st;
    if (di !== void 0) out.distance = di;
    const rs = ln2.attrs["w:restart"];
    if (rs === "newSection" || rs === "continuous") out.restart = rs;
    sect.lnNumType = out;
  }
  const va = sectEl && firstChild(sectEl, "w:vAlign")?.attrs["w:val"];
  if (va === "center" || va === "both" || va === "bottom") sect.vAlign = va;
  return sect;
}

// ../docx-core/src/styles.ts
var onOff = (el3) => {
  if (!el3) return void 0;
  const v = el3.attrs["w:val"];
  return v !== "0" && v !== "false" && v !== "none";
};
function readStyleRunProps(rPr) {
  const p = {};
  if (!rPr) return p;
  for (const el3 of childElements(rPr)) {
    const val3 = el3.attrs["w:val"];
    switch (el3.name) {
      case "w:b":
        p.bold = onOff(el3);
        break;
      case "w:i":
        p.italic = onOff(el3);
        break;
      case "w:caps":
        p.allCaps = onOff(el3);
        break;
      case "w:smallCaps":
        p.smallCaps = onOff(el3);
        break;
      case "w:strike":
        p.strike = onOff(el3);
        break;
      case "w:sz":
        if (val3) p.szHalfPt = parseInt(val3, 10);
        break;
      case "w:color":
        if (val3 && val3 !== "auto") p.color = val3;
        break;
      case "w:rFonts":
        if (el3.attrs["w:ascii"]) p.fontAscii = el3.attrs["w:ascii"];
        break;
      case "w:u":
        p.underline = val3 !== "none";
        break;
    }
  }
  return p;
}
function readStyleParaProps(pPr) {
  const p = {};
  if (!pPr) return p;
  const jc = firstChild(pPr, "w:jc")?.attrs["w:val"];
  if (jc === "center" || jc === "right" || jc === "both" || jc === "left") p.alignment = jc;
  const spacing = firstChild(pPr, "w:spacing");
  if (spacing) {
    if (spacing.attrs["w:line"] && spacing.attrs["w:lineRule"] === "auto") {
      p.lineTwentieths = parseInt(spacing.attrs["w:line"], 10);
    }
    if (spacing.attrs["w:after"]) p.spaceAfterTwips = parseInt(spacing.attrs["w:after"], 10);
    if (spacing.attrs["w:before"]) p.spaceBeforeTwips = parseInt(spacing.attrs["w:before"], 10);
  }
  const ind = firstChild(pPr, "w:ind");
  if (ind?.attrs["w:left"]) p.indentLeftTwips = parseInt(ind.attrs["w:left"], 10);
  if (ind?.attrs["w:right"]) p.indentRightTwips = parseInt(ind.attrs["w:right"], 10);
  if (firstChild(pPr, "w:pageBreakBefore")) p.pageBreakBefore = true;
  const pBdr = firstChild(pPr, "w:pBdr");
  if (pBdr) {
    const borders = {};
    for (const side of ["top", "left", "bottom", "right"]) {
      const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
      if (edge) borders[side] = edge;
    }
    if (Object.keys(borders).length > 0) p.borders = borders;
  }
  const shd = firstChild(pPr, "w:shd")?.attrs["w:fill"];
  if (shd && shd !== "auto") p.shadingHex = shd;
  return p;
}
function readStyles(pkg) {
  return readStylesXml(pkg.getPartText("word/styles.xml"));
}
function readStylesXml(xml) {
  const out = /* @__PURE__ */ new Map();
  if (!xml) return out;
  const root = parseXml(xml);
  const docDefaults = firstChild(root, "w:docDefaults");
  const defRun = readStyleRunProps(
    docDefaults && firstChild(firstChild(docDefaults, "w:rPrDefault") ?? docDefaults, "w:rPr")
  );
  const defPara = readStyleParaProps(
    docDefaults && firstChild(firstChild(docDefaults, "w:pPrDefault") ?? docDefaults, "w:pPr")
  );
  const raw = /* @__PURE__ */ new Map();
  for (const st of childElements(root, "w:style")) {
    if (st.attrs["w:type"] !== "paragraph" && st.attrs["w:type"] !== "character") continue;
    const id = st.attrs["w:styleId"];
    if (!id) continue;
    raw.set(id, {
      basedOn: firstChild(st, "w:basedOn")?.attrs["w:val"],
      name: firstChild(st, "w:name")?.attrs["w:val"],
      type: st.attrs["w:type"] === "character" ? "character" : "paragraph",
      para: readStyleParaProps(firstChild(st, "w:pPr")),
      run: readStyleRunProps(firstChild(st, "w:rPr"))
    });
  }
  const resolve = (id, seen) => {
    const cached = out.get(id);
    if (cached) return cached;
    const r = raw.get(id);
    if (!r || seen.has(id)) return { para: { ...defPara }, run: { ...defRun } };
    seen.add(id);
    const base = r.basedOn ? resolve(r.basedOn, seen) : { para: { ...defPara }, run: { ...defRun } };
    const resolved = {
      para: { ...base.para, ...r.para },
      run: { ...base.run, ...r.run },
      name: r.name,
      type: r.type
    };
    out.set(id, resolved);
    return resolved;
  };
  for (const id of raw.keys()) resolve(id, /* @__PURE__ */ new Set());
  out.set("docDefaults", { para: { ...defPara }, run: { ...defRun } });
  return out;
}

// ../docx-core/src/table-xml.ts
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var attrs = (pairs) => pairs.filter(([, v]) => v !== void 0).map(([k, v]) => ` w:${k}="${esc(String(v))}"`).join("");
var TBLPR_ORDER = [
  "w:tblStyle",
  "w:tblpPr",
  "w:tblOverlap",
  "w:bidiVisual",
  "w:tblStyleRowBandSize",
  "w:tblStyleColBandSize",
  "w:tblW",
  "w:jc",
  "w:tblCellSpacing",
  "w:tblInd",
  "w:tblBorders",
  "w:shd",
  "w:tblLayout",
  "w:tblCellMar",
  "w:tblLook",
  "w:tblCaption",
  "w:tblDescription",
  "w:tblPrChange"
];
var TBLPREX_ORDER = [
  "w:tblW",
  "w:jc",
  "w:tblCellSpacing",
  "w:tblInd",
  "w:tblBorders",
  "w:shd",
  "w:tblLayout",
  "w:tblCellMar",
  "w:tblLook",
  "w:tblPrExChange"
];
var TRPR_ORDER = [
  "w:cnfStyle",
  "w:divId",
  "w:gridBefore",
  "w:gridAfter",
  "w:wBefore",
  "w:wAfter",
  "w:cantSplit",
  "w:trHeight",
  "w:tblHeader",
  "w:tblCellSpacing",
  "w:jc",
  "w:hidden",
  "w:ins",
  "w:del",
  "w:trPrChange"
];
var TCPR_ORDER = [
  "w:cnfStyle",
  "w:tcW",
  "w:gridSpan",
  "w:hMerge",
  "w:vMerge",
  "w:tcBorders",
  "w:shd",
  "w:noWrap",
  "w:tcMar",
  "w:textDirection",
  "w:tcFitText",
  "w:vAlign",
  "w:hideMark",
  "w:headers",
  "w:cellIns",
  "w:cellDel",
  "w:cellMerge",
  "w:tcPrChange"
];
function borderXml(tag, b) {
  return `<w:${tag}${attrs([
    ["val", b.val],
    ["sz", b.sz],
    ["space", b.space ?? (b.val === "nil" ? void 0 : 0)],
    ["color", b.color ?? (b.val === "nil" ? void 0 : "auto")],
    ["themeColor", b.themeColor],
    ["themeTint", b.themeTint],
    ["themeShade", b.themeShade],
    ["shadow", b.shadow === void 0 ? void 0 : b.shadow ? 1 : 0],
    ["frame", b.frame === void 0 ? void 0 : b.frame ? 1 : 0]
  ])}/>`;
}
function pgBordersXml(pb) {
  if (!pb) return null;
  const inner = ["top", "left", "bottom", "right"].map((s) => pb[s] ? borderXml(s, pb[s]) : "").join("");
  if (!inner) return null;
  return `<w:pgBorders${attrs([["zOrder", pb.zOrder], ["display", pb.display], ["offsetFrom", pb.offsetFrom]])}>${inner}</w:pgBorders>`;
}
var SIDES = ["top", "left", "bottom", "right", "insideH", "insideV", "tl2br", "tr2bl"];
function bordersXml(tag, b) {
  const inner = SIDES.map((s) => b[s] ? borderXml(s, b[s]) : "").join("");
  return inner ? `<w:${tag}>${inner}</w:${tag}>` : "";
}
function shdXml(s) {
  return `<w:shd${attrs([
    ["val", s.val ?? "clear"],
    ["color", s.color ?? "auto"],
    ["themeColor", s.themeColor],
    ["fill", s.fill],
    ["themeFill", s.themeFill],
    ["themeFillTint", s.themeFillTint],
    ["themeFillShade", s.themeFillShade]
  ])}/>`;
}
var widthXml = (tag, w) => `<w:${tag}${attrs([["w", w.w], ["type", w.type]])}/>`;
function marXml(tag, m) {
  const inner = ["top", "left", "bottom", "right"].map((k) => m[k] ? widthXml(k, m[k]) : "").join("");
  return inner ? `<w:${tag}>${inner}</w:${tag}>` : "";
}
function lookXml(l) {
  const bits2 = (l.firstRow ? 32 : 0) | (l.lastRow ? 64 : 0) | (l.firstColumn ? 128 : 0) | (l.lastColumn ? 256 : 0) | (l.noHBand ? 512 : 0) | (l.noVBand ? 1024 : 0);
  const b = (v) => v ? 1 : 0;
  return `<w:tblLook w:val="${bits2.toString(16).toUpperCase().padStart(4, "0")}" w:firstRow="${b(l.firstRow)}" w:lastRow="${b(l.lastRow)}" w:firstColumn="${b(l.firstColumn)}" w:lastColumn="${b(l.lastColumn)}" w:noHBand="${b(l.noHBand)}" w:noVBand="${b(l.noVBand)}"/>`;
}
function tblpPrXml(p) {
  return `<w:tblpPr${attrs([
    ["leftFromText", p.leftFromText],
    ["rightFromText", p.rightFromText],
    ["topFromText", p.topFromText],
    ["bottomFromText", p.bottomFromText],
    ["vertAnchor", p.vertAnchor],
    ["horzAnchor", p.horzAnchor],
    ["tblpXSpec", p.tblpXSpec],
    ["tblpX", p.tblpX],
    ["tblpYSpec", p.tblpYSpec],
    ["tblpY", p.tblpY]
  ])}/>`;
}
var onOff2 = (tag, v) => v ? `<w:${tag}/>` : `<w:${tag} w:val="0"/>`;
var val = (tag, v) => `<w:${tag} w:val="${esc(String(v))}"/>`;
var TBLPR_GEN = {
  tblStyle: ["w:tblStyle", (v) => val("tblStyle", v)],
  tblpPr: ["w:tblpPr", tblpPrXml],
  tblOverlap: ["w:tblOverlap", (v) => val("tblOverlap", v)],
  bidiVisual: ["w:bidiVisual", (v) => onOff2("bidiVisual", v)],
  tblStyleRowBandSize: ["w:tblStyleRowBandSize", (v) => val("tblStyleRowBandSize", v)],
  tblStyleColBandSize: ["w:tblStyleColBandSize", (v) => val("tblStyleColBandSize", v)],
  tblW: ["w:tblW", (v) => widthXml("tblW", v)],
  jc: ["w:jc", (v) => val("jc", v)],
  tblCellSpacing: ["w:tblCellSpacing", (v) => widthXml("tblCellSpacing", v)],
  tblInd: ["w:tblInd", (v) => widthXml("tblInd", v)],
  tblBorders: ["w:tblBorders", (v) => bordersXml("tblBorders", v)],
  shd: ["w:shd", shdXml],
  tblLayout: ["w:tblLayout", (v) => `<w:tblLayout w:type="${v}"/>`],
  tblCellMar: ["w:tblCellMar", (v) => marXml("tblCellMar", v)],
  tblLook: ["w:tblLook", lookXml],
  tblCaption: ["w:tblCaption", (v) => val("tblCaption", v)],
  tblDescription: ["w:tblDescription", (v) => val("tblDescription", v)]
};
var TRPR_GEN = {
  cnfStyle: ["w:cnfStyle", (v) => val("cnfStyle", v)],
  gridBefore: ["w:gridBefore", (v) => val("gridBefore", v)],
  gridAfter: ["w:gridAfter", (v) => val("gridAfter", v)],
  wBefore: ["w:wBefore", (v) => widthXml("wBefore", v)],
  wAfter: ["w:wAfter", (v) => widthXml("wAfter", v)],
  cantSplit: ["w:cantSplit", (v) => onOff2("cantSplit", v)],
  // o Word grava hRule ANTES de val; "atLeast" é o padrão (sem hRule)
  trHeight: ["w:trHeight", (v) => `<w:trHeight${v.hRule === "atLeast" ? "" : ` w:hRule="${v.hRule}"`} w:val="${v.val}"/>`],
  tblHeader: ["w:tblHeader", (v) => onOff2("tblHeader", v)],
  tblCellSpacing: ["w:tblCellSpacing", (v) => widthXml("tblCellSpacing", v)],
  jc: ["w:jc", (v) => val("jc", v)],
  hidden: ["w:hidden", (v) => onOff2("hidden", v)]
};
var TCPR_GEN = {
  cnfStyle: ["w:cnfStyle", (v) => val("cnfStyle", v)],
  tcW: ["w:tcW", (v) => widthXml("tcW", v)],
  gridSpan: ["w:gridSpan", (v) => val("gridSpan", v)],
  hMerge: ["w:hMerge", (v) => v === "restart" ? val("hMerge", "restart") : "<w:hMerge/>"],
  vMerge: ["w:vMerge", (v) => v === "restart" ? val("vMerge", "restart") : "<w:vMerge/>"],
  tcBorders: ["w:tcBorders", (v) => bordersXml("tcBorders", v)],
  shd: ["w:shd", shdXml],
  noWrap: ["w:noWrap", (v) => onOff2("noWrap", v)],
  tcMar: ["w:tcMar", (v) => marXml("tcMar", v)],
  textDirection: ["w:textDirection", (v) => val("textDirection", v)],
  tcFitText: ["w:tcFitText", (v) => onOff2("tcFitText", v)],
  vAlign: ["w:vAlign", (v) => val("vAlign", v)],
  hideMark: ["w:hideMark", (v) => onOff2("hideMark", v)]
};
var EX_KEYS = /* @__PURE__ */ new Set(["tblW", "jc", "tblCellSpacing", "tblInd", "tblBorders", "shd", "tblLayout", "tblCellMar", "tblLook"]);
function genAll(p, gen, order2, only) {
  const parts = [];
  for (const k of Object.keys(gen)) {
    if (only && !only.has(k)) continue;
    const v = p[k];
    if (v === void 0 || v === null) continue;
    const [name, f] = gen[k];
    parts.push([order2.indexOf(name), f(v)]);
  }
  return parts.sort((a, b) => a[0] - b[0]).map((x2) => x2[1]).join("");
}
var tblPrXml = (p) => `<w:tblPr>${genAll(p, TBLPR_GEN, TBLPR_ORDER)}</w:tblPr>`;
var tblPrExXml = (p) => {
  const inner = genAll(p, TBLPR_GEN, TBLPREX_ORDER, EX_KEYS);
  return inner ? `<w:tblPrEx>${inner}</w:tblPrEx>` : "";
};
var trPrXml = (p) => {
  const inner = genAll(p, TRPR_GEN, TRPR_ORDER);
  return inner ? `<w:trPr>${inner}</w:trPr>` : "";
};
var tcPrXml = (p) => `<w:tcPr>${genAll(p, TCPR_GEN, TCPR_ORDER)}</w:tcPr>`;
function deepEq(a, b) {
  if (a === b) return true;
  if (a === void 0 || b === void 0 || a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => a[k] !== void 0);
  const kb = Object.keys(b).filter((k) => b[k] !== void 0);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEq(a[k], b[k]));
}
function setKid(kids, order2, name, xml) {
  const at = kids.findIndex((k) => k.name === name);
  for (let i2 = kids.length - 1; i2 >= 0; i2--) if (kids[i2].name === name && i2 !== at) kids.splice(i2, 1);
  if (at >= 0) {
    if (xml === null || xml === "") kids.splice(at, 1);
    else kids[at] = { name, raw: xml };
    return;
  }
  if (xml === null || xml === "") return;
  const rank = order2.indexOf(name);
  let pos = kids.length;
  for (let i2 = 0; i2 < kids.length; i2++) {
    const r = order2.indexOf(kids[i2].name);
    if (r > rank) {
      pos = i2;
      break;
    }
  }
  kids.splice(pos, 0, { name, raw: xml });
}
function patch(raw, cur, read, gen, order2, keys, emptyOk = false) {
  const { open, close, kids: k0, el: el3 } = splitElement(raw);
  const base = read(el3) ?? {};
  const now = cur ?? {};
  const kids = k0.map((k) => ({ name: k.name, raw: k.raw }));
  let changed = false;
  for (const k of Object.keys(gen)) {
    if (keys && !keys.has(k)) continue;
    if (deepEq(base[k], now[k])) continue;
    changed = true;
    const [name, f] = gen[k];
    const v = now[k];
    setKid(kids, order2, name, v === void 0 || v === null ? null : f(v));
  }
  if (!changed) return raw;
  if (!kids.length && !emptyOk) return "";
  return open + kids.map((x2) => x2.raw).join("") + close;
}
var patchTblPr = (raw, cur) => patch(raw, cur, readTblPr, TBLPR_GEN, TBLPR_ORDER, void 0, true);
var patchTblPrEx = (raw, cur) => patch(raw, cur, readTblPr, TBLPR_GEN, TBLPREX_ORDER, EX_KEYS);
var patchTrPr = (raw, cur) => patch(raw, cur, readTrPr, TRPR_GEN, TRPR_ORDER);
var patchTcPr = (raw, cur) => patch(raw, cur, readTcPr, TCPR_GEN, TCPR_ORDER, void 0, true);

// ../docx-core/src/model-ops.ts
var paraText = (p) => p.runs.map((r) => r.text).join("");
var paraLength = (p) => p.runs.reduce((s, r) => s + r.text.length, 0);
function comparePos(a, b) {
  return a.para !== b.para ? a.para - b.para : a.offset - b.offset;
}
function normalizeRange(r) {
  return comparePos(r.start, r.end) <= 0 ? r : { start: r.end, end: r.start };
}
var sameRPr = (a, b) => a.rpr === b.rpr || JSON.stringify(a.rpr ?? null) === JSON.stringify(b.rpr ?? null);
var textExtras = (run) => ({
  ...run.field ? { field: run.field } : {},
  ...run.fieldOpen ? { fieldOpen: true } : {},
  ...run.rpr ? { rpr: run.rpr } : {},
  ...run.symFont ? { symFont: run.symFont } : {},
  ...run.inToc ? { inToc: run.inToc } : {}
});
var sameProps = (a, b) => a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.underlineStyle === b.underlineStyle && a.underlineColor === b.underlineColor && a.strike === b.strike && a.doubleStrike === b.doubleStrike && a.vertAlign === b.vertAlign && a.szHalfPt === b.szHalfPt && a.color === b.color && a.highlight === b.highlight && a.fontAscii === b.fontAscii && a.allCaps === b.allCaps && a.smallCaps === b.smallCaps && a.link === b.link && a.linkTip === b.linkTip && a.charStyle === b.charStyle && !!a.noProof === !!b.noProof && !!a.webHidden === !!b.webHidden && // runs de elementos de origem diferentes (dentro × fora de um sdt/hyperlink…) não se fundem
a.src === b.src && sameComments(a.commentIds, b.commentIds) && // revisões: só a mesma (autor, data, movimentação) se funde — o Word grava um w:ins por autoria
sameJson(a.ins, b.ins) && sameJson(a.del, b.del) && sameJson(a.fmt, b.fmt);
var sameJson = (a, b) => a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
var sameComments = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i2) => v === b[i2]);
};
var isSpecial = (r) => !!(r.image || r.field || r.noteRef || r.custom || r.textbox || r.shape || r.group || r.ptab) || isMarkRun(r);
function normalizeParagraph(p) {
  const out = [];
  for (const run of p.runs) {
    if (run.text.length === 0 && !isSpecial(run)) continue;
    const last = out[out.length - 1];
    if (last && !isSpecial(last) && !isSpecial(run) && sameProps(last.props, run.props) && sameRPr(last, run) && !last.fieldResult && !run.fieldResult && last.field === run.field) {
      last.text += run.text;
    } else {
      out.push({ ...run, props: { ...run.props } });
    }
  }
  p.runs = out;
}
function splitAt(p, offset) {
  let acc = 0;
  for (let i2 = 0; i2 < p.runs.length; i2++) {
    const run = p.runs[i2];
    if (offset === acc) return i2;
    if (offset < acc + run.text.length) {
      const extras = textExtras(run);
      const head = { ...extras, text: run.text.slice(0, offset - acc), props: { ...run.props } };
      const tail = { ...extras, text: run.text.slice(offset - acc), props: { ...run.props } };
      p.runs.splice(i2, 1, head, tail);
      return i2 + 1;
    }
    acc += run.text.length;
  }
  return p.runs.length;
}
function propsAt(model, pos) {
  const p = model.paragraphs[pos.para];
  const runs = p?.runs.filter((r) => !isMarkRun(r)) ?? [];
  if (!runs.length) return { ...DEFAULT_RUN_PROPS };
  let acc = 0;
  for (const run of runs) {
    if (pos.offset <= acc + run.text.length) return withoutRevisions(run.props);
    acc += run.text.length;
  }
  return withoutRevisions(runs[runs.length - 1].props);
}
function insertIndex(p, offset) {
  let idx = splitAt(p, offset);
  while (idx < p.runs.length && (p.runs[idx].bookmark || p.runs[idx].fieldEnd)) idx++;
  return idx;
}
function withoutRevisions(props) {
  const out = { ...props };
  delete out.ins;
  delete out.del;
  delete out.fmt;
  return out;
}
function rprAt(model, pos) {
  const p = model.paragraphs[pos.para];
  if (!p || p.runs.length === 0) return void 0;
  let acc = 0;
  for (const run of p.runs) {
    if (pos.offset <= acc + run.text.length && !isSpecial(run)) return run.rpr;
    acc += run.text.length;
  }
  for (let i2 = p.runs.length - 1; i2 >= 0; i2--) if (!isSpecial(p.runs[i2])) return p.runs[i2].rpr;
  return void 0;
}
function insertText(model, pos, text, props) {
  const p = model.paragraphs[pos.para];
  const effective = props ?? propsAt(model, pos);
  const rpr = rprAt(model, pos);
  const idx = insertIndex(p, pos.offset);
  p.runs.splice(idx, 0, { text, props: { ...effective }, ...rpr ? { rpr } : {} });
  normalizeParagraph(p);
  return { para: pos.para, offset: pos.offset + text.length };
}
function insertRun(model, pos, run) {
  const p = model.paragraphs[pos.para];
  const idx = insertIndex(p, pos.offset);
  p.runs.splice(idx, 0, { ...run, props: { ...run.props } });
  normalizeParagraph(p);
  return { para: pos.para, offset: pos.offset + run.text.length };
}
function splitParagraph(model, pos) {
  const p = model.paragraphs[pos.para];
  const idx = insertIndex(p, pos.offset);
  const tailRuns = p.runs.slice(idx);
  p.runs = p.runs.slice(0, idx);
  const tail = { runs: tailRuns, props: { ...p.props } };
  if (p.ppr) tail.ppr = p.ppr;
  if (p.pprEdited) tail.pprEdited = true;
  if (p.props.sectionBreak) {
    p.props = { ...p.props };
    delete p.props.sectionBreak;
  }
  if (p.props.markIns || p.props.markDel) {
    p.props = { ...p.props };
    delete p.props.markIns;
    delete p.props.markDel;
  }
  model.paragraphs.splice(pos.para + 1, 0, tail);
  normalizeParagraph(p);
  normalizeParagraph(tail);
  return { para: pos.para + 1, offset: 0 };
}
function deleteRange(model, range) {
  const { start, end } = normalizeRange(range);
  const doomed = doomedMarks(model, start, end);
  if (start.para === end.para) {
    const p = model.paragraphs[start.para];
    rebuildDelete(p, start.offset, end.offset, doomed);
    dropDoomed(model, doomed);
    normalizeParagraph(p);
    return start;
  }
  const first = model.paragraphs[start.para];
  const last = model.paragraphs[end.para];
  rebuildDelete(first, start.offset, paraLength(first), doomed);
  const kept = [];
  for (let pi = start.para + 1; pi < end.para; pi++) {
    for (const r of model.paragraphs[pi].runs) if ((isMarkRun(r) || r.text.length === 0 && isSpecial(r)) && !doomed.has(r)) kept.push(r);
  }
  rebuildDelete(last, 0, end.offset, doomed);
  first.runs = [...first.runs, ...kept, ...last.runs];
  first.props = { ...last.props };
  if (last.ppr) first.ppr = last.ppr;
  else delete first.ppr;
  model.paragraphs.splice(start.para + 1, end.para - start.para);
  dropDoomed(model, doomed);
  normalizeParagraph(first);
  return start;
}
var cmpPos = (a, b) => comparePos(a, b);
function doomedMarks(model, start, end) {
  const out = /* @__PURE__ */ new Set();
  if (cmpPos(start, end) >= 0) return out;
  const starts = /* @__PURE__ */ new Map();
  const fields = [];
  model.paragraphs.forEach((p, para) => {
    let offset = 0;
    for (const r of p.runs) {
      const at = { para, offset };
      if (r.bookmark) {
        if (!r.bookmark.end) starts.set(r.bookmark.id, { run: r, at });
        else {
          const s = starts.get(r.bookmark.id);
          if (s) {
            const inside = (x2) => cmpPos(x2, start) >= 0 && cmpPos(x2, end) <= 0;
            const point = cmpPos(s.at, at) === 0;
            if (point ? cmpPos(at, start) > 0 && cmpPos(at, end) < 0 : inside(s.at) && inside(at)) {
              out.add(s.run);
              out.add(r);
            }
          }
        }
      } else if (r.fieldBegin !== void 0 || r.fieldOpen) fields.push({ run: r, at, begin: true });
      else if (r.fieldEnd) fields.push({ run: r, at, begin: false });
      offset += r.text.length;
    }
  });
  const stack = [];
  for (const f of fields) {
    if (f.begin) {
      stack.push(f);
      continue;
    }
    const b = stack.pop();
    if (!b || cmpPos(b.at, start) < 0) continue;
    const gone = b.run.text.length > 0 ? cmpPos({ para: b.at.para, offset: b.at.offset + b.run.text.length }, end) <= 0 : cmpPos(f.at, end) <= 0;
    if (gone) {
      out.add(b.run);
      out.add(f.run);
    }
  }
  return out;
}
function dropDoomed(model, doomed) {
  if (!doomed.size) return;
  for (const p of model.paragraphs) {
    if (p.runs.some((r) => doomed.has(r))) p.runs = p.runs.filter((r) => !doomed.has(r));
  }
}
function rebuildDelete(p, from, to, doomed) {
  const out = [];
  let acc = 0;
  for (const run of p.runs) {
    const rs = acc;
    const re = acc + run.text.length;
    acc = re;
    if (isMarkRun(run) || run.text.length === 0 && isSpecial(run)) {
      if (!doomed?.has(run)) out.push(run);
      continue;
    }
    const keepHead = run.text.slice(0, Math.max(0, Math.min(from, re) - rs));
    const keepTail = re > to ? run.text.slice(Math.max(0, to - rs)) : "";
    const text = keepHead + keepTail;
    if (text.length > 0) {
      const intact = text.length === run.text.length;
      out.push(intact ? { ...run, text } : { ...textExtras(run), text, props: run.props });
    }
  }
  p.runs = out;
}
function mergeWithPrevious(model, para) {
  const prev = model.paragraphs[para - 1];
  const cur = model.paragraphs[para];
  const offset = paraLength(prev);
  prev.runs = [...prev.runs, ...cur.runs];
  prev.props = { ...cur.props };
  if (cur.ppr) prev.ppr = cur.ppr;
  else delete prev.ppr;
  if (cur.pprEdited) prev.pprEdited = true;
  else delete prev.pprEdited;
  model.paragraphs.splice(para, 1);
  normalizeParagraph(prev);
  return { para: para - 1, offset };
}
function applyRunProps(model, range, patch2) {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi];
    const from = pi === start.para ? start.offset : 0;
    const to = pi === end.para ? end.offset : paraLength(p);
    if (to <= from) continue;
    splitAt(p, to);
    const i1 = splitAt(p, from);
    let acc = 0;
    for (let ri = 0; ri < p.runs.length; ri++) {
      const rs = acc;
      acc += p.runs[ri].text.length;
      if (ri < i1) continue;
      if (rs >= to) break;
      Object.assign(p.runs[ri].props, patch2);
    }
    normalizeParagraph(p);
  }
}
function applyParaProps(model, range, patch2) {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    Object.assign(model.paragraphs[pi].props, patch2);
  }
}
function clearRunFormatting(model, range, opts = {}) {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi];
    const from = pi === start.para ? start.offset : 0;
    const to = pi === end.para ? end.offset : paraLength(p);
    if (to <= from) continue;
    splitAt(p, to);
    const i1 = splitAt(p, from);
    let acc = 0;
    for (let ri = 0; ri < p.runs.length; ri++) {
      const rs = acc;
      acc += p.runs[ri].text.length;
      if (ri < i1) continue;
      if (rs >= to) break;
      clearRun(p.runs[ri], opts);
    }
    normalizeParagraph(p);
  }
}
function clearRun(run, opts = {}) {
  const rpr = clearedRPr(run.rpr, opts.fields);
  const old = run.props;
  const base = editBaseProps({ ...run, rpr }, rpr);
  const next = opts.fields ? { ...old } : { ...base };
  if (opts.fields) for (const k of opts.fields) next[k] = base[k];
  for (const k of ["src", "link", "isMath", "commentIds"]) {
    if (old[k] !== void 0) next[k] = old[k];
  }
  if (opts.charStyle !== null && opts.charStyle !== void 0) next.charStyle = opts.charStyle;
  else if (opts.charStyle === void 0 && !opts.fields) delete next.charStyle;
  else if (opts.charStyle === null) {
    if (old.charStyle !== void 0) next.charStyle = old.charStyle;
    else delete next.charStyle;
  }
  run.rpr = rpr;
  run.rprEdited = true;
  run.props = next;
}
function clearParaFormatting(model, range) {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) clearPara(model.paragraphs[pi]);
}
function clearPara(p) {
  const ppr = clearedPPr(p.ppr);
  const old = p.props;
  const next = { ...paraPropsFromPPr(ppr) };
  if (old.styleId !== void 0) next.styleId = old.styleId;
  else delete next.styleId;
  for (const k of ["src", "sectionBreak", "tocInstr", "tocEntry", "blockSdt"]) {
    if (old[k] !== void 0) next[k] = old[k];
  }
  p.ppr = ppr;
  p.pprEdited = true;
  p.props = next;
}

// ../docx-core/src/revisions.ts
function newRevision(author, now = /* @__PURE__ */ new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00Z`;
  const utc = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:00Z`;
  return { author, date: local, dateUtc: utc };
}
var json = (v) => JSON.stringify(v ?? null);
var same = (a, b) => a === b || json(a) === json(b);
var RUN_META = ["src", "link", "commentIds", "isMath", "ins", "del", "fmt"];
var PARA_META = ["src", "fmtSrc", "sectionBreak", "markIns", "markDel", "pfmt", "tocInstr", "tocEntry", "blockSdt"];
function runFormatting(p) {
  const out = { ...p };
  for (const k of RUN_META) delete out[k];
  return out;
}
function paraFormatting(p) {
  const out = { ...p };
  for (const k of PARA_META) delete out[k];
  return out;
}
var runMeta = (p) => {
  const out = {};
  for (const k of RUN_META) if (p[k] !== void 0) out[k] = p[k];
  return out;
};
var paraMeta = (p) => {
  const out = {};
  for (const k of PARA_META) if (p[k] !== void 0) out[k] = p[k];
  return out;
};
var isDeletedRun = (r) => !!r.props.del;
function finalRuns(p) {
  return p.runs.some(isDeletedRun) ? p.runs.filter((r) => !r.props.del) : p.runs;
}
function finalParagraphs(paras) {
  const out = [];
  const index = [];
  let carry = [];
  paras.forEach((p, i2) => {
    const own2 = finalRuns(p);
    const runs = carry.length ? [...carry, ...own2] : own2;
    index[i2] = out.length;
    if (p.props.markDel && i2 < paras.length - 1) {
      carry = runs;
      return;
    }
    carry = [];
    out.push(runs === p.runs ? p : { ...p, runs });
  });
  return { paras: out, index };
}
function finalBlocks(blocks) {
  const out = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    for (const paragraph of finalParagraphs(run).paras) out.push({ type: "paragraph", paragraph });
    run = [];
  };
  for (const b of blocks) {
    if (b.type === "paragraph") {
      run.push(b.paragraph);
      continue;
    }
    flush();
    out.push({
      ...b,
      rows: b.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          paragraphs: finalParagraphs(cell.paragraphs).paras,
          ...cell.blocks ? { blocks: finalBlocks(cell.blocks) } : {}
        }))
      }))
    });
  }
  flush();
  return out;
}
function paragraphHasRevisions(p) {
  return !!(p.props.markIns || p.props.markDel || p.props.pfmt) || p.runs.some((r) => !!(r.props.ins || r.props.del || r.props.fmt));
}
var hasLiveText = (p) => p.runs.some((r) => !r.props.del && r.text.length > 0);
var KIND_ORDER = { paraFormat: 0, delete: 1, insert: 2, format: 3 };
function collectRevisions(paras) {
  const out = [];
  paras.forEach((p, pi) => {
    const len = paraLength(p);
    if (p.props.pfmt) {
      const f = p.props.pfmt;
      out.push({ kind: "paraFormat", ...revInfo(f), para: pi, start: 0, end: len, text: p.runs.map((r) => r.text).join(""), old: f.old, now: paraFormatting(p.props) });
    }
    const open = {};
    const close = (k) => {
      const o = open[k];
      if (o) {
        out.push(o.span);
        delete open[k];
      }
    };
    let acc = 0;
    for (const r of p.runs) {
      const rs = acc;
      acc += r.text.length;
      const aspects = [
        ["insert", r.props.ins, json(r.props.ins)],
        ["delete", r.props.del, json(r.props.del)],
        ["format", r.props.fmt, r.props.fmt ? json([revInfo(r.props.fmt), r.props.fmt.old, runFormatting(r.props)]) : ""]
      ];
      for (const [k, rev2, key] of aspects) {
        if (!rev2) {
          close(k);
          continue;
        }
        const o = open[k];
        if (o && o.key === key && o.span.end === rs) {
          o.span.end = acc;
          o.span.text += r.text;
          continue;
        }
        close(k);
        const span = { kind: k, ...revInfo(rev2), para: pi, start: rs, end: acc, text: r.text };
        if (k === "format") {
          span.old = rev2.old;
          span.now = runFormatting(r.props);
        }
        open[k] = { span, key };
      }
    }
    close("delete");
    close("insert");
    close("format");
    if (p.props.markIns) out.push({ kind: "insert", mark: true, ...revInfo(p.props.markIns), para: pi, start: len, end: len, text: "" });
    if (p.props.markDel) out.push({ kind: "delete", mark: true, ...revInfo(p.props.markDel), para: pi, start: len, end: len, text: "" });
  });
  out.sort((a, b) => a.para - b.para || a.start - b.start || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  const merged = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (last && (s.kind === "insert" || s.kind === "delete") && last.kind === s.kind && same(revInfo(last), revInfo(s))) {
      const lp = last.endPara ?? last.para;
      const joins = last.mark ? s.para === lp + 1 && s.start === 0 : s.mark && s.para === lp && last.end === s.start;
      if (joins) {
        if (last.mark) last.text += "\n";
        last.text += s.text;
        last.endPara = s.para;
        last.end = s.end;
        if (s.mark) last.mark = true;
        else delete last.mark;
        continue;
      }
    }
    merged.push(s);
  }
  return merged;
}
var spanEnd = (s) => ({ para: s.endPara ?? s.para, offset: s.mark ? s.end + 1 : s.end });
function revisionAt(spans, pos) {
  const cmp = (a, b) => a.para - b.para || a.offset - b.offset;
  const text = spans.filter((s) => s.kind !== "paraFormat");
  return text.find((s) => cmp({ para: s.para, offset: s.start }, pos) <= 0 && cmp(pos, spanEnd(s)) < 0) ?? text.find((s) => cmp(pos, { para: s.endPara ?? s.para, offset: s.end }) === 0) ?? spans.find((s) => s.para === pos.para && s.kind === "paraFormat");
}
function spanScope(s) {
  return {
    range: { start: { para: s.para, offset: s.start }, end: spanEnd(s) },
    kinds: /* @__PURE__ */ new Set([s.kind]),
    authors: /* @__PURE__ */ new Set([s.author]),
    ...s.kind === "paraFormat" ? {} : { runsOnly: true }
  };
}
function acceptRevisions(paras, scope = {}, onMerge) {
  return applyRevisions(paras, scope, true, onMerge);
}
function rejectRevisions(paras, scope = {}, onMerge) {
  return applyRevisions(paras, scope, false, onMerge);
}
function applyRevisions(paras, scope, accept, onMerge) {
  const kindOk = (k) => !scope.kinds || scope.kinds.has(k);
  const ok = (k, rev2) => !!rev2 && kindOk(k) && (!scope.authors || scope.authors.has(rev2.author));
  const range = scope.range ? normalizeRange(scope.range) : null;
  let changed = false;
  for (let i2 = paras.length - 1; i2 >= 0; i2--) {
    const p = paras[i2];
    const len = paraLength(p);
    let from = 0, to = len, markIn = true;
    if (range) {
      if (i2 < range.start.para || i2 > range.end.para) continue;
      from = i2 === range.start.para ? range.start.offset : 0;
      to = i2 === range.end.para ? Math.min(range.end.offset, len) : len;
      markIn = range.end.para > i2 || range.end.offset > len;
    }
    if (to > from && applyRuns(p, from, to, accept, ok)) changed = true;
    const pf = p.props.pfmt;
    if (pf && !scope.runsOnly && ok("paraFormat", pf)) {
      changed = true;
      if (accept) {
        p.props = { ...p.props };
        delete p.props.pfmt;
      } else rejectParaFormat(p);
    }
    if (!markIn) continue;
    const last = i2 === paras.length - 1;
    const mi = p.props.markIns, md = p.props.markDel;
    if (md && ok("delete", md)) {
      changed = true;
      if (accept && !last) {
        mergeNext(paras, i2);
        onMerge?.(i2 + 1);
        continue;
      }
      p.props = { ...p.props };
      delete p.props.markDel;
      if (p.ppr?.markDeleted) {
        p.ppr = { ...p.ppr };
        delete p.ppr.markDeleted;
        delete p.ppr.markDel;
      }
    }
    if (mi && ok("insert", mi)) {
      changed = true;
      if (!accept && !last) {
        mergeNext(paras, i2);
        onMerge?.(i2 + 1);
        continue;
      }
      p.props = { ...p.props };
      delete p.props.markIns;
    }
  }
  return changed;
}
function mergeNext(paras, i2) {
  const p = paras[i2], next = paras[i2 + 1];
  p.runs = [...p.runs, ...next.runs];
  p.props = { ...next.props };
  if (next.ppr) p.ppr = next.ppr;
  else delete p.ppr;
  paras.splice(i2 + 1, 1);
  normalizeParagraph(p);
}
function applyRuns(p, from, to, accept, ok) {
  splitAt(p, to);
  splitAt(p, from);
  let changed = false;
  const out = [];
  let acc = 0;
  for (const run of p.runs) {
    const rs = acc;
    acc += run.text.length;
    const inside = run.text.length ? rs >= from && acc <= to : rs >= from && rs < to;
    if (!inside) {
      out.push(run);
      continue;
    }
    let r = run;
    if (ok("format", r.props.fmt)) {
      changed = true;
      if (accept) {
        r = { ...r, props: { ...r.props } };
        delete r.props.fmt;
      } else r = rejectRunFormat(r);
    }
    if (ok("delete", r.props.del)) {
      changed = true;
      if (accept) continue;
      r = { ...r, props: { ...r.props } };
      delete r.props.del;
    }
    if (ok("insert", r.props.ins)) {
      changed = true;
      if (!accept) continue;
      r = { ...r, props: { ...r.props } };
      delete r.props.ins;
    }
    out.push(r);
  }
  p.runs = out;
  normalizeParagraph(p);
  return changed;
}
function fileFormatChange(run) {
  const c = run.rpr?.change;
  return !!c && !!run.props.fmt && same(revInfo(c), revInfo(run.props.fmt)) && same(runPropsFromRPr(c.rPr), run.props.fmt.old);
}
function rejectRunFormat(run) {
  const fmt = run.props.fmt;
  const meta = runMeta(run.props);
  delete meta.fmt;
  if (fileFormatChange(run)) {
    const rpr = { ...run.rpr.change.rPr };
    const out = { ...run, rpr };
    out.props = { ...withoutRevisions(editBaseProps(out, rpr)), ...meta };
    return out;
  }
  return { ...run, props: { ...fmt.old, ...meta } };
}
function rejectParaFormat(p) {
  const pf = p.props.pfmt;
  const meta = paraMeta(p.props);
  delete meta.pfmt;
  const c = p.ppr?.change;
  if (c && same(revInfo(c), revInfo(pf)) && same(paraFormatting(paraPropsFromPPr(c.pPr)), pf.old)) {
    const cur = p.ppr;
    p.ppr = {
      ...c.pPr,
      ...cur.rPr ? { rPr: cur.rPr } : {},
      ...cur.markDeleted ? { markDeleted: true } : {},
      ...cur.markDel ? { markDel: cur.markDel } : {},
      ...cur.markIns ? { markIns: cur.markIns } : {}
    };
  }
  p.props = { ...pf.old, ...meta };
}
function trackInsertText(model, pos, text, rev2, props) {
  const base = withoutRevisions(props ?? propsAt(model, pos));
  return insertText(model, pos, text, { ...base, ins: rev2 });
}
function trackInsertRun(model, pos, run, rev2) {
  return insertRun(model, pos, { ...run, props: { ...withoutRevisions(run.props), ins: rev2 } });
}
function trackSplitParagraph(model, pos, rev2) {
  const out = splitParagraph(model, pos);
  const first = model.paragraphs[pos.para];
  first.props = { ...first.props, markIns: rev2 };
  return out;
}
function trackDelete(model, range, rev2) {
  const { start, end } = normalizeRange(range);
  const paras = model.paragraphs;
  const merged = [];
  let endPara = end.para, endOffset = end.offset;
  for (let i2 = end.para; i2 >= start.para; i2--) {
    const p = paras[i2];
    const from = i2 === start.para ? start.offset : 0;
    const to = i2 === end.para ? end.offset : paraLength(p);
    if (to > from) {
      const removed = deleteRuns(p, from, to, rev2);
      if (i2 === end.para) endOffset -= removed;
    }
    if (i2 === end.para || i2 >= paras.length - 1) continue;
    if (p.props.markDel) continue;
    if (p.props.markIns && p.props.markIns.author === rev2.author) {
      const len = paraLength(p);
      const next2 = paras[i2 + 1];
      p.runs = [...p.runs, ...next2.runs];
      p.props = { ...next2.props };
      if (next2.ppr) p.ppr = next2.ppr;
      else delete p.ppr;
      paras.splice(i2 + 1, 1);
      normalizeParagraph(p);
      merged.push(i2 + 1);
      if (endPara === i2 + 1) {
        endPara = i2;
        endOffset += len;
      } else if (endPara > i2 + 1) endPara--;
      continue;
    }
    p.props = { ...p.props, markDel: rev2 };
    const next = paras[i2 + 1];
    if (hasLiveText(p) && !same(paraFormatting(next.props), paraFormatting(p.props))) {
      const old = next.props.pfmt?.old ?? paraFormatting(next.props);
      next.props = { ...paraMeta(next.props), ...paraFormatting(p.props), pfmt: next.props.pfmt ?? { ...rev2, old } };
      if (same(paraFormatting(next.props), next.props.pfmt.old)) delete next.props.pfmt;
    }
  }
  return { start, end: { para: endPara, offset: Math.max(0, endOffset) }, merged };
}
function deleteRuns(p, from, to, rev2) {
  splitAt(p, to);
  splitAt(p, from);
  const out = [];
  let acc = 0, removed = 0;
  for (const run of p.runs) {
    const rs = acc;
    acc += run.text.length;
    const inside = run.text.length ? rs >= from && acc <= to : rs >= from && rs < to;
    if (!inside || run.props.del) {
      out.push(run);
      continue;
    }
    if (run.props.ins && run.props.ins.author === rev2.author && !run.props.ins.move) {
      removed += run.text.length;
      continue;
    }
    out.push({ ...run, props: { ...run.props, del: rev2 } });
  }
  p.runs = out;
  normalizeParagraph(p);
  return removed;
}
function trackApplyRunProps(model, range, patch2, rev2) {
  const { start, end } = normalizeRange(range);
  const formatting = Object.keys(patch2).some((k) => !RUN_META.includes(k));
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi];
    const from = pi === start.para ? start.offset : 0;
    const to = pi === end.para ? end.offset : paraLength(p);
    if (to <= from) continue;
    splitAt(p, to);
    splitAt(p, from);
    let acc = 0;
    for (let ri = 0; ri < p.runs.length; ri++) {
      const run = p.runs[ri];
      const rs = acc;
      acc += run.text.length;
      if (rs < from || acc > to || !run.text.length) continue;
      const before = runFormatting(run.props);
      const props = { ...run.props, ...patch2 };
      if (formatting) {
        const after = runFormatting(props);
        if (props.fmt) {
          if (same(after, props.fmt.old)) delete props.fmt;
        } else if (!same(before, after)) props.fmt = { ...rev2, old: before };
      }
      p.runs[ri] = { ...run, props };
    }
    normalizeParagraph(p);
  }
}
function trackApplyParaProps(model, range, patch2, rev2) {
  const { start, end } = normalizeRange(range);
  const formatting = Object.keys(patch2).some((k) => !PARA_META.includes(k));
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi];
    const before = paraFormatting(p.props);
    const props = { ...p.props, ...patch2 };
    if (formatting) {
      const after = paraFormatting(props);
      if (props.pfmt) {
        if (same(after, props.pfmt.old)) delete props.pfmt;
      } else if (!same(before, after)) props.pfmt = { ...rev2, old: before };
    }
    p.props = props;
  }
}
function revisionAuthors(full) {
  const seen = /* @__PURE__ */ new Set();
  const add = (r) => {
    if (r && !seen.has(r.author)) seen.add(r.author);
  };
  const para = (p) => {
    add(p.props.pfmt);
    for (const r of p.runs) {
      add(r.props.del);
      add(r.props.ins);
      add(r.props.fmt);
      if (r.textbox?.blocks) blocks(r.textbox.blocks);
      else if (r.textbox?.paras) r.textbox.paras.forEach(para);
    }
    add(p.props.markIns);
    add(p.props.markDel);
  };
  const blocks = (bs) => {
    for (const b of bs) {
      if (b.type === "paragraph") para(b.paragraph);
      else for (const row of b.rows) for (const cell of row.cells) blocks(cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph })));
    }
  };
  blocks(full.blocks);
  for (const s of full.sections) {
    for (const set of [s.headerBlocks, s.footerBlocks]) for (const k of ["default", "first", "even"]) {
      const b = set?.[k];
      if (b) blocks(b);
    }
  }
  for (const m of [full.footnoteBlocks, full.endnoteBlocks]) for (const b of m?.values() ?? []) blocks(b);
  return [...seen];
}

// ../docx-core/src/rev-xml.ts
var BEFORE_TRACK = /* @__PURE__ */ new Set([
  "w:writeProtection",
  "w:view",
  "w:zoom",
  "w:removePersonalInformation",
  "w:removeDateAndTime",
  "w:doNotDisplayPageBoundaries",
  "w:displayBackgroundShape",
  "w:printPostScriptOverText",
  "w:printFractionalCharacterWidth",
  "w:printFormsData",
  "w:embedTrueTypeFonts",
  "w:embedSystemFonts",
  "w:saveSubsetFonts",
  "w:saveFormsData",
  "w:mirrorMargins",
  "w:alignBordersAndEdges",
  "w:bordersDoNotSurroundHeader",
  "w:bordersDoNotSurroundFooter",
  "w:gutterAtTop",
  "w:hideSpellingErrors",
  "w:hideGrammaticalErrors",
  "w:activeWritingStyle",
  "w:proofState",
  "w:formsDesign",
  "w:attachedTemplate",
  "w:linkStyles",
  "w:stylePaneFormatFilter",
  "w:stylePaneSortMethod",
  "w:documentType",
  "w:mailMerge",
  "w:revisionView"
]);
function readTrackRevisions(pkg) {
  const xml = pkg.getPartText(partByRelType(pkg, "settings", "word/settings.xml")) ?? "";
  const m = /<w:trackRevisions\b([^>]*?)\/?>/.exec(xml);
  return !!m && !/w:val="(?:false|0|off)"/.test(m[1]);
}
function writeTrackRevisions(pkg, on) {
  if (readTrackRevisions(pkg) === on) return;
  let path = partByRelType(pkg, "settings", "");
  let xml = path ? pkg.getPartText(path) : void 0;
  if (!xml) {
    if (!on) return;
    path = "word/settings.xml";
    xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>';
    const relsPath = "word/_rels/document.xml.rels";
    const rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    pkg.setPartText(relsPath, rels.replace("</Relationships>", () => '<Relationship Id="rIdWnSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>'));
    const ct = pkg.getPartText("[Content_Types].xml");
    if (ct && !ct.includes("/word/settings.xml")) {
      pkg.setPartText("[Content_Types].xml", ct.replace("</Types>", () => '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'));
    }
  }
  xml = xml.replace(/<w:trackRevisions\b[^>]*?(?:\/>|>[\s\S]*?<\/w:trackRevisions>)/g, "");
  if (on) {
    const root = parseXml(xml, { positions: true });
    let at = -1;
    if (root.cs === root.e) {
      const open = xml.slice(root.s, root.e).replace(/\s*\/>$/, ">");
      xml = xml.slice(0, root.s) + open + "<w:trackRevisions/></w:settings>" + xml.slice(root.e);
    } else {
      at = root.cs;
      for (const k of childElements(root)) if (BEFORE_TRACK.has(k.name)) at = Math.max(at, k.e);
      xml = xml.slice(0, at) + "<w:trackRevisions/>" + xml.slice(at);
    }
  }
  pkg.setPartText(path, xml);
}
var W16DU_NS = "http://schemas.microsoft.com/office/word/2023/wordml/word16du";
var MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";
var esc2 = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var nextId = 1;
var usedUtc = false;
function beginRevisionIds(...xmls) {
  let max2 = 0;
  for (const x2 of xmls) {
    if (!x2) continue;
    for (const m of x2.matchAll(/\bw:id="(-?\d+)"/g)) max2 = Math.max(max2, Number(m[1]));
  }
  nextId = max2 + 1;
  usedUtc = false;
}
function takeUsedDateUtc() {
  const u = usedUtc;
  usedUtc = false;
  return u;
}
function revisionAttrs(r) {
  let a = ` w:id="${nextId++}" w:author="${esc2(r.author)}"`;
  if (r.date) a += ` w:date="${esc2(r.date)}"`;
  if (r.dateUtc) {
    a += ` w16du:dateUtc="${esc2(r.dateUtc)}"`;
    usedUtc = true;
  }
  return a;
}
function markRevisionXml(kind, r) {
  const tag = r.move ? kind === "ins" ? "w:moveTo" : "w:moveFrom" : `w:${kind}`;
  return `<${tag}${revisionAttrs(r)}/>`;
}
function wrapRevision(kind, r, inner) {
  const tag = r.move ? kind === "ins" ? "w:moveTo" : "w:moveFrom" : `w:${kind}`;
  return `<${tag}${revisionAttrs(r)}>${inner}</${tag}>`;
}
function ensureRevisionNamespaces(open, rootName) {
  const at = open.indexOf(`<${rootName}`);
  if (at < 0) return open;
  const end = open.indexOf(">", at);
  let tag = open.slice(at, end);
  if (!/\sxmlns:w16du=/.test(tag)) tag += ` xmlns:w16du="${W16DU_NS}"`;
  if (!/\sxmlns:mc=/.test(tag)) tag += ` xmlns:mc="${MC_NS}"`;
  const ign = /\smc:Ignorable="([^"]*)"/.exec(tag);
  if (!ign) tag += ' mc:Ignorable="w16du"';
  else if (!ign[1].split(/\s+/).includes("w16du")) tag = tag.replace(ign[0], () => ` mc:Ignorable="${ign[1] ? `${ign[1]} ` : ""}w16du"`);
  return open.slice(0, at) + tag + open.slice(end);
}

// ../docx-core/src/notes.ts
function notePropsInner(p) {
  if (!p) return "";
  return (p.pos ? `<w:pos w:val="${p.pos}"/>` : "") + (p.numFmt ? `<w:numFmt w:val="${p.numFmt}"/>` : "") + (p.numStart !== void 0 ? `<w:numStart w:val="${p.numStart}"/>` : "") + (p.numRestart ? `<w:numRestart w:val="${p.numRestart}"/>` : "");
}
function notePropsXml(kind, p) {
  const inner = notePropsInner(p);
  return inner ? `<w:${kind}Pr>${inner}</w:${kind}Pr>` : "";
}
function sameNoteProps(a, b) {
  return notePropsInner(a) === notePropsInner(b);
}
var SEP_PPR = '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>';
var separators = (kind) => `<w:${kind} w:type="separator" w:id="-1"><w:p>${SEP_PPR}<w:r><w:separator/></w:r></w:p></w:${kind}><w:${kind} w:type="continuationSeparator" w:id="0"><w:p>${SEP_PPR}<w:r><w:continuationSeparator/></w:r></w:p></w:${kind}>`;
var NOTES_NS = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 w15"';
function emptyNotesPart(kind) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r
<w:${kind}s ${NOTES_NS}>${separators(kind)}</w:${kind}s>`;
}
var REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
var CT = "application/vnd.openxmlformats-officedocument.wordprocessingml.";
function ensureNoteParts(pkg) {
  let changed = false;
  const relsPath = "word/_rels/document.xml.rels";
  let rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  let ct = pkg.getPartText("[Content_Types].xml") ?? "";
  for (const kind of ["footnote", "endnote"]) {
    const path = `word/${kind}s.xml`;
    if (!pkg.getPart(path)) {
      pkg.setPartText(path, emptyNotesPart(kind));
      changed = true;
    }
    if (!new RegExp(`Type="${REL}/${kind}s"`).test(rels)) {
      let n = 1;
      while (rels.includes(`Id="rId${n}"`)) n++;
      rels = rels.replace("</Relationships>", () => `<Relationship Id="rId${n}" Type="${REL}/${kind}s" Target="${kind}s.xml"/></Relationships>`);
      changed = true;
    }
    if (ct && !ct.includes(`PartName="/${path}"`)) {
      ct = ct.replace("</Types>", () => `<Override PartName="/${path}" ContentType="${CT}${kind}s+xml"/></Types>`);
      changed = true;
    }
  }
  if (changed) {
    pkg.setPartText(relsPath, rels);
    if (ct) pkg.setPartText("[Content_Types].xml", ct);
  }
  const settings = pkg.getPartText("word/settings.xml");
  if (settings) {
    const next = patchSettingsNotes(settings, {});
    if (next !== settings) {
      pkg.setPartText("word/settings.xml", next);
      changed = true;
    }
  }
  return changed;
}
var SETTINGS_AFTER_NOTES = [
  "w:compat",
  "w:docVars",
  "w:rsids",
  "m:mathPr",
  "w:attachedSchema",
  "w:themeFontLang",
  "w:clrSchemeMapping",
  "w:doNotIncludeSubdocsInStats",
  "w:doNotAutoCompressPictures",
  "w:forceUpgrade",
  "w:captions",
  "w:readModeInkLockDown",
  "w:smartTagType",
  "sl:schemaLibrary",
  "w:shapeDefaults",
  "w:doNotEmbedSmartTags",
  "w:decimalSymbol",
  "w:listSeparator"
];
function patchSettingsNotes(xml, props) {
  let out = xml;
  for (const kind of ["footnote", "endnote"]) {
    const tag = `w:${kind}Pr`;
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?(?:/>|>[\\s\\S]*?</${tag}>)`);
    const m = re.exec(out);
    const want = props[kind];
    const seps = `<w:${kind} w:id="-1"/><w:${kind} w:id="0"/>`;
    if (m) {
      const whole = m[0];
      const close = `</${tag}>`;
      const body = whole.endsWith(close) ? whole.slice(whole.indexOf(">") + 1, whole.length - close.length) : "";
      const refRe = new RegExp(`<w:${kind}\\b[^>]*/>`, "g");
      const refs = body.match(refRe)?.join("") ?? "";
      const p = want === void 0 ? body.replace(refRe, "") : notePropsInner(want ?? void 0);
      const next = `<${tag}>${p}${refs || seps}</${tag}>`;
      if (next !== whole) out = out.slice(0, m.index) + next + out.slice(m.index + whole.length);
    } else {
      const el3 = `<${tag}>${notePropsInner(want ?? void 0)}${seps}</${tag}>`;
      const enAt = kind === "footnote" ? out.indexOf("<w:endnotePr") : -1;
      let at = enAt;
      if (at < 0) {
        for (const n of SETTINGS_AFTER_NOTES) {
          const k = out.search(new RegExp(`<${n}[\\s/>]`));
          if (k >= 0 && (at < 0 || k < at)) at = k;
        }
      }
      if (at < 0) at = out.lastIndexOf("</w:settings>");
      out = out.slice(0, at) + el3 + out.slice(at);
    }
  }
  return out;
}
var NOTE_STYLES = {
  footnote: {
    text: { id: "Textodenotaderodap", name: "footnote text", xml: '<w:style w:type="paragraph" w:styleId="Textodenotaderodap"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodenotaderodapChar"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    char: { id: "TextodenotaderodapChar", name: "Texto de nota de rodap\xE9 Char", xml: '<w:style w:type="character" w:customStyle="1" w:styleId="TextodenotaderodapChar"><w:name w:val="Texto de nota de rodap\xE9 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodenotaderodap"/><w:uiPriority w:val="99"/><w:semiHidden/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    ref: { id: "Refdenotaderodap", name: "footnote reference", xml: '<w:style w:type="character" w:styleId="Refdenotaderodap"><w:name w:val="footnote reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>' }
  },
  endnote: {
    text: { id: "Textodenotadefim", name: "endnote text", xml: '<w:style w:type="paragraph" w:styleId="Textodenotadefim"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodenotadefimChar"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    char: { id: "TextodenotadefimChar", name: "Texto de nota de fim Char", xml: '<w:style w:type="character" w:customStyle="1" w:styleId="TextodenotadefimChar"><w:name w:val="Texto de nota de fim Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodenotadefim"/><w:uiPriority w:val="99"/><w:semiHidden/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>' },
    ref: { id: "Refdenotadefim", name: "endnote reference", xml: '<w:style w:type="character" w:styleId="Refdenotadefim"><w:name w:val="endnote reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>' }
  }
};
var NOTE_REF_TEXT = "\uFFFC";
var noteMarkField = (kind) => kind === "footnote" ? " FOOTNOTEREF_MARK " : " ENDNOTEREF_MARK ";
function noteRefRun(kind, id, refStyle) {
  return { text: NOTE_REF_TEXT, props: { ...DEFAULT_RUN_PROPS, ...refStyle ? { charStyle: refStyle } : { vertAlign: "superscript" } }, noteRef: { kind, id } };
}
function newNoteParagraphs(kind, textStyle, refStyle) {
  return [{
    props: { ...textStyle ? { styleId: textStyle } : {} },
    runs: [
      { text: NOTE_REF_TEXT, props: { ...DEFAULT_RUN_PROPS, ...refStyle ? { charStyle: refStyle } : { vertAlign: "superscript" } }, field: noteMarkField(kind) },
      { text: " ", props: { ...DEFAULT_RUN_PROPS } }
    ]
  }];
}

// ../docx-core/src/lossless.ts
var esc3 = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var RPR_ORDER = [
  "w:rStyle",
  "w:rFonts",
  "w:b",
  "w:bCs",
  "w:i",
  "w:iCs",
  "w:caps",
  "w:smallCaps",
  "w:strike",
  "w:dstrike",
  "w:outline",
  "w:shadow",
  "w:emboss",
  "w:imprint",
  "w:noProof",
  "w:snapToGrid",
  "w:vanish",
  "w:webHidden",
  "w:color",
  "w:spacing",
  "w:w",
  "w:kern",
  "w:position",
  "w:sz",
  "w:szCs",
  "w:highlight",
  "w:u",
  "w:effect",
  "w:bdr",
  "w:shd",
  "w:fitText",
  "w:vertAlign",
  "w:rtl",
  "w:cs",
  "w:em",
  "w:lang",
  "w:eastAsianLayout",
  "w:specVanish",
  "w:oMath",
  "w:rPrChange"
];
var PPR_ORDER = [
  "w:pStyle",
  "w:keepNext",
  "w:keepLines",
  "w:pageBreakBefore",
  "w:framePr",
  "w:widowControl",
  "w:numPr",
  "w:suppressLineNumbers",
  "w:pBdr",
  "w:shd",
  "w:tabs",
  "w:suppressAutoHyphens",
  "w:kinsoku",
  "w:wordWrap",
  "w:overflowPunct",
  "w:topLinePunct",
  "w:autoSpaceDE",
  "w:autoSpaceDN",
  "w:bidi",
  "w:adjustRightInd",
  "w:snapToGrid",
  "w:spacing",
  "w:ind",
  "w:contextualSpacing",
  "w:mirrorIndents",
  "w:suppressOverlap",
  "w:jc",
  "w:textDirection",
  "w:textAlignment",
  "w:textboxTightWrap",
  "w:outlineLvl",
  "w:divId",
  "w:cnfStyle",
  "w:rPr",
  "w:sectPr",
  "w:pPrChange"
];
var SECT_ORDER = [
  "w:headerReference",
  "w:footerReference",
  "w:footnotePr",
  "w:endnotePr",
  "w:type",
  "w:pgSz",
  "w:pgMar",
  "w:paperSrc",
  "w:pgBorders",
  "w:lnNumType",
  "w:pgNumType",
  "w:cols",
  "w:formProt",
  "w:vAlign",
  "w:noEndnote",
  "w:titlePg",
  "w:textDirection",
  "w:bidi",
  "w:rtlGutter",
  "w:docGrid",
  "w:printerSettings",
  // extensão do Word 2013 (colunas da área de notas): no fim, como o Word grava
  "w15:footnoteColumns",
  "w:sectPrChange"
];
function splitElement(raw) {
  const el3 = parseXml(raw, { positions: true });
  if (el3.cs === el3.e) {
    const open = raw.replace(/\s*\/>\s*$/, ">");
    return { open, close: `</${el3.name}>`, kids: [], el: el3 };
  }
  const kids = childElements(el3).map((k) => ({ name: k.name, raw: raw.slice(k.s, k.e), el: k }));
  return { open: raw.slice(0, el3.cs), close: raw.slice(el3.ce), kids, el: el3 };
}
function setKid2(kids, order2, name, xml) {
  const at = kids.findIndex((k) => k.name === name);
  for (let i2 = kids.length - 1; i2 >= 0; i2--) if (kids[i2].name === name && i2 !== at) kids.splice(i2, 1);
  if (at >= 0) {
    if (xml === null) kids.splice(at, 1);
    else kids[at] = { name, raw: xml, el: kids[at].el };
    return;
  }
  if (xml === null) return;
  const rank = order2.indexOf(name);
  let pos = kids.length;
  for (let i2 = 0; i2 < kids.length; i2++) {
    const r = order2.indexOf(kids[i2].name);
    if (r > rank) {
      pos = i2;
      break;
    }
  }
  kids.splice(pos, 0, { name, raw: xml, el: { name, attrs: {}, children: [] } });
}
function withAttrs(raw, name, changes) {
  if (!raw) {
    const attrs4 = Object.entries(changes).filter(([, v]) => v !== void 0).map(([k, v]) => ` ${k}="${esc3(String(v))}"`).join("");
    return `<${name}${attrs4}/>`;
  }
  const m = /^<([^\s/>]+)([^>]*?)(\/?)>/.exec(raw);
  let attrs3 = m[2];
  for (const [k, v] of Object.entries(changes)) {
    const re = new RegExp(`\\s${k.replace(":", "\\:")}\\s*=\\s*("[^"]*"|'[^']*')`);
    if (v === void 0) attrs3 = attrs3.replace(re, "");
    else if (re.test(attrs3)) attrs3 = attrs3.replace(re, () => ` ${k}="${esc3(String(v))}"`);
    else attrs3 += ` ${k}="${esc3(String(v))}"`;
  }
  return `<${m[1]}${attrs3}${m[3]}>${raw.slice(m[0].length)}`;
}
var kidRaw = (kids, name) => kids.find((k) => k.name === name)?.raw ?? "";
var onOff3 = (name, v) => v ? `<${name}/>` : `<${name} w:val="0"/>`;
var join = (open, kids, close) => kids.length ? open + kids.map((k) => k.raw).join("") + close : "";
function rPrFromProps(p, linkAware = true) {
  const rpr = [];
  if (p.charStyle) rpr.push(`<w:rStyle w:val="${esc3(p.charStyle)}"/>`);
  if (p.fontAscii) rpr.push(`<w:rFonts w:ascii="${esc3(p.fontAscii)}" w:hAnsi="${esc3(p.fontAscii)}" w:cs="${esc3(p.fontAscii)}"/>`);
  if (p.bold) rpr.push("<w:b/>");
  if (p.italic) rpr.push("<w:i/>");
  if (p.allCaps) rpr.push("<w:caps/>");
  if (p.smallCaps) rpr.push("<w:smallCaps/>");
  if (p.strike) rpr.push("<w:strike/>");
  if (p.doubleStrike) rpr.push("<w:dstrike/>");
  if (p.noProof) rpr.push("<w:noProof/>");
  if (p.webHidden) rpr.push("<w:webHidden/>");
  const linkLook = linkAware && !!p.link && !p.underlineStyle && !p.underlineColor;
  if (p.color && !(linkAware && p.link && p.color === "0563C1")) rpr.push(`<w:color w:val="${esc3(p.color)}"/>`);
  if (p.charSpacingTwips) rpr.push(`<w:spacing w:val="${p.charSpacingTwips}"/>`);
  if (p.szHalfPt !== void 0) rpr.push(`<w:sz w:val="${p.szHalfPt}"/><w:szCs w:val="${p.szHalfPt}"/>`);
  if (p.highlight) rpr.push(`<w:highlight w:val="${esc3(p.highlight)}"/>`);
  if (p.underline && !linkLook) {
    rpr.push(`<w:u w:val="${p.underlineStyle ?? "single"}"${p.underlineColor ? ` w:color="${esc3(p.underlineColor)}"` : ""}/>`);
  }
  if (p.vertAlign) rpr.push(`<w:vertAlign w:val="${p.vertAlign}"/>`);
  if (p.fmt) rpr.push(`<w:rPrChange${revisionAttrs(p.fmt)}>${wrapIn("w:rPr", innerOf(rPrFromProps(p.fmt.old, linkAware)))}</w:rPrChange>`);
  return rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
}
var RPR_FIELD = {
  "w:rStyle": "rStyle",
  "w:rFonts": "rFonts",
  "w:b": "b",
  "w:bCs": "bCs",
  "w:i": "i",
  "w:iCs": "iCs",
  "w:caps": "caps",
  "w:smallCaps": "smallCaps",
  "w:strike": "strike",
  "w:dstrike": "dstrike",
  "w:outline": "outline",
  "w:shadow": "shadow",
  "w:emboss": "emboss",
  "w:imprint": "imprint",
  "w:vanish": "vanish",
  "w:color": "color",
  "w:spacing": "spacing",
  "w:w": "w",
  "w:kern": "kern",
  "w:position": "position",
  "w:sz": "sz",
  "w:szCs": "szCs",
  "w:highlight": "highlight",
  "w:u": "u",
  "w:effect": "effect",
  "w:bdr": "bdr",
  "w:shd": "shd",
  "w:vertAlign": "vertAlign",
  "w:em": "em"
};
var PPR_FIELD = {
  "w:keepNext": "keepNext",
  "w:keepLines": "keepLines",
  "w:pageBreakBefore": "pageBreakBefore",
  "w:framePr": "framePr",
  "w:widowControl": "widowControl",
  "w:numPr": "numPr",
  "w:suppressLineNumbers": "suppressLineNumbers",
  "w:pBdr": "pBdr",
  "w:shd": "shd",
  "w:tabs": "tabs",
  "w:suppressAutoHyphens": "suppressAutoHyphens",
  "w:kinsoku": "kinsoku",
  "w:wordWrap": "wordWrap",
  "w:overflowPunct": "overflowPunct",
  "w:autoSpaceDE": "autoSpaceDE",
  "w:autoSpaceDN": "autoSpaceDN",
  "w:bidi": "bidi",
  "w:adjustRightInd": "adjustRightInd",
  "w:snapToGrid": "snapToGrid",
  "w:spacing": "spacing",
  "w:ind": "ind",
  "w:contextualSpacing": "contextualSpacing",
  "w:mirrorIndents": "mirrorIndents",
  "w:suppressOverlap": "suppressOverlap",
  "w:jc": "jc",
  "w:textAlignment": "textAlignment",
  "w:textboxTightWrap": "textboxTightWrap",
  "w:outlineLvl": "outlineLvl",
  "w:rPr": "rPr"
};
function clearedRPr(rpr, fields) {
  const out = { ...rpr ?? {} };
  const drop = fields ? fields.flatMap((k) => PROP_RPR[k] ?? []) : Object.values(RPR_FIELD).filter((f) => f !== "rStyle");
  for (const f of drop) delete out[f];
  return out;
}
var PROP_RPR = {
  bold: ["b", "bCs"],
  italic: ["i", "iCs"],
  underline: ["u"],
  underlineStyle: ["u"],
  underlineColor: ["u"],
  strike: ["strike"],
  doubleStrike: ["dstrike"],
  allCaps: ["caps"],
  smallCaps: ["smallCaps"],
  vertAlign: ["vertAlign"],
  szHalfPt: ["sz", "szCs"],
  color: ["color"],
  highlight: ["highlight"],
  fontAscii: ["rFonts"],
  charSpacingTwips: ["spacing"]
};
function clearedPPr(ppr) {
  const out = { ...ppr ?? {} };
  for (const f of Object.values(PPR_FIELD)) if (f !== "rPr") delete out[f];
  return out;
}
function dropCleared(kids, map, cur) {
  let n = 0;
  for (let i2 = kids.length - 1; i2 >= 0; i2--) {
    const f = map[kids[i2].name];
    if (f && cur[f] === void 0) {
      kids.splice(i2, 1);
      n++;
    }
  }
  return n > 0;
}
var wrapIn = (tag, inner) => inner ? `<${tag}>${inner}</${tag}>` : `<${tag}/>`;
function innerOf(xml) {
  if (!xml) return "";
  const a = xml.indexOf(">");
  if (xml[a - 1] === "/") return "";
  return xml.slice(a + 1, xml.lastIndexOf("</"));
}
function changeRPrRaw(kids) {
  const k = kids.find((x2) => x2.name === "w:rPrChange");
  if (!k) return void 0;
  const inner = splitElement(k.raw).kids.find((x2) => x2.name === "w:rPr");
  return inner ? { raw: inner.raw, el: inner.el } : { raw: "<w:rPr/>", el: { name: "w:rPr", attrs: {}, children: [] } };
}
function patchRPr(raw, run) {
  const p = run.props;
  if (raw === void 0) return rPrFromProps(p);
  const { open, close, kids, el: el3 } = splitElement(raw);
  const edited = run.rprEdited && run.rpr ? run.rpr : void 0;
  const base = editBaseProps(run, edited ?? readRPr(el3));
  if (base.fmt && !p.fmt) {
    const old = changeRPrRaw(kids);
    if (old && sameJson2(runFormatting(p), runFormatting(editBaseProps(run, readRPr(old.el))))) return patchRPr(old.raw, run);
  }
  let changed = edited ? dropCleared(kids, RPR_FIELD, edited) : false;
  const set = (name, xml) => {
    changed = true;
    setKid2(kids, RPR_ORDER, name, xml);
  };
  if (p.bold !== base.bold) {
    set("w:b", onOff3("w:b", p.bold));
    set("w:bCs", onOff3("w:bCs", p.bold));
  }
  if (p.italic !== base.italic) {
    set("w:i", onOff3("w:i", p.italic));
    set("w:iCs", onOff3("w:iCs", p.italic));
  }
  if (p.underline !== base.underline || p.underlineStyle !== base.underlineStyle || p.underlineColor !== base.underlineColor) {
    set("w:u", p.underline ? `<w:u w:val="${p.underlineStyle ?? "single"}"${p.underlineColor ? ` w:color="${esc3(p.underlineColor)}"` : ""}/>` : '<w:u w:val="none"/>');
  }
  if (p.strike !== base.strike) set("w:strike", onOff3("w:strike", p.strike));
  if (!!p.doubleStrike !== !!base.doubleStrike) set("w:dstrike", onOff3("w:dstrike", !!p.doubleStrike));
  if (p.allCaps !== base.allCaps) set("w:caps", onOff3("w:caps", p.allCaps));
  if (p.smallCaps !== base.smallCaps) set("w:smallCaps", onOff3("w:smallCaps", p.smallCaps));
  if (p.vertAlign !== base.vertAlign) set("w:vertAlign", `<w:vertAlign w:val="${p.vertAlign ?? "baseline"}"/>`);
  if (p.szHalfPt !== base.szHalfPt) {
    set("w:sz", p.szHalfPt === void 0 ? null : `<w:sz w:val="${p.szHalfPt}"/>`);
    set("w:szCs", p.szHalfPt === void 0 ? null : `<w:szCs w:val="${p.szHalfPt}"/>`);
  }
  if (p.color !== base.color) set("w:color", p.color === void 0 ? null : `<w:color w:val="${esc3(p.color)}"/>`);
  if (p.highlight !== base.highlight) set("w:highlight", p.highlight === void 0 ? null : `<w:highlight w:val="${esc3(p.highlight)}"/>`);
  if (p.fontAscii !== base.fontAscii) {
    set("w:rFonts", p.fontAscii === void 0 ? null : withAttrs(kidRaw(kids, "w:rFonts"), "w:rFonts", {
      "w:ascii": p.fontAscii,
      "w:hAnsi": p.fontAscii,
      "w:cs": p.fontAscii,
      "w:asciiTheme": void 0,
      "w:hAnsiTheme": void 0,
      "w:cstheme": void 0
    }));
  }
  if (p.charStyle !== base.charStyle) set("w:rStyle", p.charStyle ? `<w:rStyle w:val="${esc3(p.charStyle)}"/>` : null);
  if ((p.charSpacingTwips ?? 0) !== (base.charSpacingTwips ?? 0)) {
    set("w:spacing", p.charSpacingTwips ? `<w:spacing w:val="${p.charSpacingTwips}"/>` : null);
  }
  if (!sameJson2(p.fmt, base.fmt)) {
    if (!p.fmt) set("w:rPrChange", null);
    else {
      const rest = kids.filter((k) => k.name !== "w:rPrChange");
      const before = rest.length ? patchRPr(join(open, rest, close), { ...run, props: { ...p.fmt.old, ...p.link ? { link: p.link } : {} } }) : rPrFromProps(p.fmt.old);
      set("w:rPrChange", `<w:rPrChange${revisionAttrs(p.fmt)}>${wrapIn("w:rPr", innerOf(before))}</w:rPrChange>`);
    }
  }
  return changed ? join(open, kids, close) : raw;
}
var sameJson2 = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
var eq = sameJson2;
var DEFAULT_NUM_IDS = { bullet: 1001, decimal: 1002 };
var FLOW_FLAGS = (pp) => [
  ["w:keepNext", pp.keepNext],
  ["w:keepLines", pp.keepLines],
  ["w:pageBreakBefore", pp.pageBreakBefore],
  ["w:widowControl", pp.widowControl],
  ["w:suppressLineNumbers", pp.suppressLineNumbers],
  ["w:suppressAutoHyphens", pp.suppressAutoHyphens]
];
function pprBits(pp, ids) {
  const out = {};
  out["w:pStyle"] = pp.styleId ? `<w:pStyle w:val="${esc3(pp.styleId)}"/>` : null;
  for (const [name, v] of FLOW_FLAGS(pp)) out[name] = v === void 0 ? null : v ? `<${name}/>` : `<${name} w:val="0"/>`;
  out["w:textboxTightWrap"] = pp.textboxTightWrap ? `<w:textboxTightWrap w:val="${pp.textboxTightWrap}"/>` : null;
  out["w:tabs"] = pp.tabStops?.length ? "<w:tabs>" + pp.tabStops.map((t) => `<w:tab w:val="${t.align}"${t.leader ? ` w:leader="${t.leader}"` : ""} w:pos="${t.posTwips}"/>`).join("") + "</w:tabs>" : null;
  out["w:numPr"] = pp.numbering ? `<w:numPr><w:ilvl w:val="${pp.numbering.ilvl}"/><w:numId w:val="${pp.numbering.kind === "decimal" ? ids.decimal : ids.bullet}"/></w:numPr>` : null;
  if (pp.borders) {
    let inner = "";
    for (const side of ["top", "left", "bottom", "right"]) {
      const e = pp.borders[side];
      if (e) inner += `<w:${side} w:val="${esc3(e.style)}" w:sz="${e.sizeEighthPt}" w:space="${e.spacePt}" w:color="${e.color ? esc3(e.color) : "auto"}"/>`;
    }
    out["w:pBdr"] = inner ? `<w:pBdr>${inner}</w:pBdr>` : null;
  } else if (pp.boxBorder) {
    const b = (side) => `<w:${side} w:val="single" w:sz="4" w:space="1" w:color="auto"/>`;
    out["w:pBdr"] = `<w:pBdr>${b("top")}${b("left")}${b("bottom")}${b("right")}</w:pBdr>`;
  } else out["w:pBdr"] = null;
  out["w:shd"] = pp.shadingHex ? `<w:shd w:val="clear" w:color="auto" w:fill="${esc3(pp.shadingHex)}"/>` : null;
  return out;
}
function pPrFromProps(pp, sectPrXml, ids = DEFAULT_NUM_IDS) {
  const bits2 = pprBits(pp, ids);
  const ppr = [];
  const add = (name) => {
    const x2 = bits2[name];
    if (x2) ppr.push(x2);
  };
  add("w:pStyle");
  add("w:keepNext");
  add("w:keepLines");
  add("w:pageBreakBefore");
  add("w:widowControl");
  add("w:numPr");
  add("w:suppressLineNumbers");
  add("w:pBdr");
  add("w:shd");
  add("w:tabs");
  add("w:suppressAutoHyphens");
  if (pp.lineTwentieths !== void 0 || pp.spaceAfterTwips !== void 0 || pp.spaceBeforeTwips !== void 0 || pp.spaceBeforeAuto !== void 0 || pp.spaceAfterAuto !== void 0) {
    const line = pp.lineTwentieths !== void 0 ? ` w:line="${pp.lineTwentieths}" w:lineRule="auto"` : "";
    const before = (pp.spaceBeforeTwips !== void 0 ? ` w:before="${pp.spaceBeforeTwips}"` : "") + (pp.spaceBeforeAuto !== void 0 ? ` w:beforeAutospacing="${pp.spaceBeforeAuto ? 1 : 0}"` : "");
    const after = (pp.spaceAfterTwips !== void 0 ? ` w:after="${pp.spaceAfterTwips}"` : "") + (pp.spaceAfterAuto !== void 0 ? ` w:afterAutospacing="${pp.spaceAfterAuto ? 1 : 0}"` : "");
    ppr.push(`<w:spacing${before}${after}${line}/>`);
  }
  if (pp.indentLeftTwips !== void 0 || pp.indentRightTwips !== void 0 || pp.indentFirstLineTwips !== void 0) {
    let attrs3 = "";
    if (pp.indentLeftTwips !== void 0) attrs3 += ` w:left="${pp.indentLeftTwips}"`;
    if (pp.indentRightTwips !== void 0) attrs3 += ` w:right="${pp.indentRightTwips}"`;
    if (pp.indentFirstLineTwips !== void 0) {
      attrs3 += pp.indentFirstLineTwips >= 0 ? ` w:firstLine="${pp.indentFirstLineTwips}"` : ` w:hanging="${-pp.indentFirstLineTwips}"`;
    }
    ppr.push(`<w:ind${attrs3}/>`);
  }
  if (pp.alignment && pp.alignment !== "left") ppr.push(`<w:jc w:val="${pp.alignment}"/>`);
  add("w:textboxTightWrap");
  if (pp.outlineLvl !== void 0) ppr.push(`<w:outlineLvl w:val="${pp.outlineLvl}"/>`);
  const mark = markXml(pp);
  if (mark) ppr.push(`<w:rPr>${mark}</w:rPr>`);
  if (sectPrXml) ppr.push(sectPrXml);
  if (pp.pfmt) ppr.push(pPrChangeXml(pp, pPrFromProps(pp.pfmt.old, "", ids).xml));
  return { xml: ppr.length ? `<w:pPr>${ppr.join("")}</w:pPr>` : "", genNumbering: !!pp.numbering || !!pp.pfmt?.old.numbering };
}
function markXml(pp) {
  return (pp.markIns ? markRevisionXml("ins", pp.markIns) : "") + (pp.markDel ? markRevisionXml("del", pp.markDel) : "");
}
function pPrChangeXml(pp, oldPPr) {
  return `<w:pPrChange${revisionAttrs(pp.pfmt)}>${wrapIn("w:pPr", innerOf(oldPPr))}</w:pPrChange>`;
}
var MARK_REVS = /* @__PURE__ */ new Set(["w:ins", "w:del", "w:moveFrom", "w:moveTo"]);
function markRPr(raw, pp) {
  const mark = markXml(pp);
  if (!raw) return mark ? `<w:rPr>${mark}</w:rPr>` : null;
  const { open, close, kids } = splitElement(raw);
  const rest = kids.filter((k) => !MARK_REVS.has(k.name)).map((k) => k.raw).join("");
  return mark || rest ? `${open}${mark}${rest}${close}` : null;
}
function patchPPr(raw, para, sect, ids = DEFAULT_NUM_IDS) {
  const p = para.props;
  if (raw === void 0) return pPrFromProps(p, sect ?? "", ids);
  const { open, close, kids, el: el3 } = splitElement(raw);
  const edited = para.pprEdited && para.ppr ? para.ppr : void 0;
  const base = paraPropsFromPPr(edited ?? readPPr(el3));
  if (base.pfmt && !p.pfmt) {
    const ch = kids.find((k) => k.name === "w:pPrChange");
    const old = ch && splitElement(ch.raw).kids.find((k) => k.name === "w:pPr");
    const oldEl = old?.el ?? { name: "w:pPr", attrs: {}, children: [] };
    if (ch && sameJson2(paraFormatting(p), paraFormatting(paraPropsFromPPr(readPPr(oldEl))))) {
      const oldKids = old ? splitElement(old.raw).kids : [];
      const keep = kids.filter((k) => k.name === "w:rPr" || k.name === "w:sectPr");
      const all = [...oldKids, ...keep];
      if (!all.length) return pPrFromProps(p, sect ?? "", ids);
      return patchPPr(`<w:pPr>${all.map((k) => k.raw).join("")}</w:pPr>`, para, sect, ids);
    }
  }
  let changed = edited ? dropCleared(kids, PPR_FIELD, edited) : false;
  let genNumbering = false;
  const set = (name, xml) => {
    changed = true;
    setKid2(kids, PPR_ORDER, name, xml);
  };
  const bits2 = pprBits(p, ids);
  if (p.styleId !== base.styleId) set("w:pStyle", bits2["w:pStyle"]);
  const baseFlags = new Map(FLOW_FLAGS(base));
  for (const [name, v] of FLOW_FLAGS(p)) if (v !== baseFlags.get(name)) set(name, bits2[name]);
  if (p.textboxTightWrap !== base.textboxTightWrap) set("w:textboxTightWrap", bits2["w:textboxTightWrap"]);
  if (!eq(p.tabStops, base.tabStops)) set("w:tabs", bits2["w:tabs"]);
  if (!eq(p.borders, base.borders) || !!p.boxBorder !== !!base.boxBorder) set("w:pBdr", bits2["w:pBdr"]);
  if (p.shadingHex !== base.shadingHex) set("w:shd", bits2["w:shd"]);
  if (!eq(p.numbering, base.numbering)) {
    const numPr = el3.children.find((c) => typeof c !== "string" && c.name === "w:numPr");
    const numId = numPr && childElements(numPr, "w:numId")[0]?.attrs["w:val"];
    if (!p.numbering) set("w:numPr", '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>');
    else if (numId && numId !== "0" && base.numbering && base.numbering.kind === p.numbering.kind) {
      set("w:numPr", `<w:numPr><w:ilvl w:val="${p.numbering.ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
    } else {
      set("w:numPr", bits2["w:numPr"]);
      genNumbering = true;
    }
  }
  if (p.indentLeftTwips !== base.indentLeftTwips || p.indentRightTwips !== base.indentRightTwips || p.indentFirstLineTwips !== base.indentFirstLineTwips) {
    const f = p.indentFirstLineTwips;
    const ind = withAttrs(kidRaw(kids, "w:ind"), "w:ind", {
      "w:left": p.indentLeftTwips,
      "w:start": void 0,
      "w:right": p.indentRightTwips,
      "w:end": void 0,
      "w:firstLine": f !== void 0 && f >= 0 ? f : void 0,
      "w:hanging": f !== void 0 && f < 0 ? -f : void 0,
      "w:firstLineChars": void 0,
      "w:hangingChars": void 0,
      "w:leftChars": void 0,
      "w:rightChars": void 0
    });
    set("w:ind", /^<w:ind\s*\/>$/.test(ind) ? null : ind);
  }
  if (p.lineTwentieths !== base.lineTwentieths || p.spaceAfterTwips !== base.spaceAfterTwips || p.spaceBeforeTwips !== base.spaceBeforeTwips || p.spaceBeforeAuto !== base.spaceBeforeAuto || p.spaceAfterAuto !== base.spaceAfterAuto) {
    const ch = {};
    if (p.lineTwentieths !== base.lineTwentieths) {
      ch["w:line"] = p.lineTwentieths;
      ch["w:lineRule"] = p.lineTwentieths !== void 0 ? "auto" : void 0;
    }
    const auto = (v) => v === void 0 ? void 0 : v ? "1" : "0";
    if (p.spaceAfterTwips !== base.spaceAfterTwips) {
      ch["w:after"] = p.spaceAfterTwips;
      ch["w:afterLines"] = void 0;
      ch["w:afterAutospacing"] = auto(p.spaceAfterAuto);
    }
    if (p.spaceBeforeTwips !== base.spaceBeforeTwips) {
      ch["w:before"] = p.spaceBeforeTwips;
      ch["w:beforeLines"] = void 0;
      ch["w:beforeAutospacing"] = auto(p.spaceBeforeAuto);
    }
    if (p.spaceBeforeAuto !== base.spaceBeforeAuto) ch["w:beforeAutospacing"] = auto(p.spaceBeforeAuto);
    if (p.spaceAfterAuto !== base.spaceAfterAuto) ch["w:afterAutospacing"] = auto(p.spaceAfterAuto);
    const sp = withAttrs(kidRaw(kids, "w:spacing"), "w:spacing", ch);
    set("w:spacing", /^<w:spacing\s*\/>$/.test(sp) ? null : sp);
  }
  if (p.alignment !== base.alignment) set("w:jc", p.alignment ? `<w:jc w:val="${p.alignment}"/>` : null);
  if (p.outlineLvl !== base.outlineLvl) set("w:outlineLvl", p.outlineLvl !== void 0 ? `<w:outlineLvl w:val="${p.outlineLvl}"/>` : null);
  if (sect !== void 0) {
    const cur = kidRaw(kids, "w:sectPr");
    if ((sect ?? "") !== cur) set("w:sectPr", sect);
  }
  if (!sameJson2(p.markIns, base.markIns) || !sameJson2(p.markDel, base.markDel)) set("w:rPr", markRPr(kidRaw(kids, "w:rPr"), p));
  if (!sameJson2(p.pfmt, base.pfmt)) {
    if (!p.pfmt) set("w:pPrChange", null);
    else {
      const rest = kids.filter((k) => k.name !== "w:rPr" && k.name !== "w:sectPr" && k.name !== "w:pPrChange");
      const before = rest.length ? patchPPr(join(open, rest, close), { runs: [], props: p.pfmt.old }, void 0, ids) : pPrFromProps(p.pfmt.old, "", ids);
      if (before.genNumbering) genNumbering = true;
      set("w:pPrChange", pPrChangeXml(p, before.xml));
    }
  }
  return { xml: changed ? join(open, kids, close) : raw, genNumbering };
}
function colsXml(cols, raw) {
  if (cols && cols.count > 1) {
    const head = `<w:cols w:num="${cols.count}"${cols.sep ? ' w:sep="1"' : ""} w:space="${cols.spaceTwips}"`;
    if (!cols.widths?.length) return `${head}/>`;
    return `${head} w:equalWidth="0">${cols.widths.map((c) => `<w:col w:w="${c.widthTwips}" w:space="${c.spaceTwips}"/>`).join("")}</w:cols>`;
  }
  const el3 = raw ? splitElement(raw).el : void 0;
  const sep = el3?.attrs["w:sep"];
  const space = el3?.attrs["w:space"] ?? "708";
  return `<w:cols${sep && sep !== "0" && sep !== "false" ? ' w:sep="1"' : ""} w:space="${esc3(space)}"/>`;
}
function pgNumTypeXml(s, raw = "") {
  const chap = s.pgNumChapStyle && s.pgNumChapStyle > 0 ? s.pgNumChapStyle : void 0;
  const xml = withAttrs(raw ? raw.replace(/\s+w:(?:fmt|start|chapStyle|chapSep)="[^"]*"/g, "") : "", "w:pgNumType", {
    "w:fmt": s.pgNumFmt && s.pgNumFmt !== "decimal" ? s.pgNumFmt : void 0,
    "w:start": s.pgNumStart,
    "w:chapStyle": chap,
    "w:chapSep": chap && s.pgNumChapSep && s.pgNumChapSep !== "hyphen" ? s.pgNumChapSep : void 0
  });
  return /^<w:pgNumType\s*\/>$/.test(xml) ? null : xml;
}
function lnNumTypeXml(ln2) {
  return `<w:lnNumType w:countBy="${ln2.countBy ?? 1}"${ln2.start ? ` w:start="${ln2.start}"` : ""}${ln2.distance ? ` w:distance="${ln2.distance}"` : ""}${ln2.restart ? ` w:restart="${ln2.restart}"` : ""}/>`;
}
function patchSectPr(raw, cur, refs) {
  const { open, close, kids, el: el3 } = splitElement(raw);
  const base = readSectPr(el3);
  let changed = false;
  const set = (name, xml) => {
    changed = true;
    setKid2(kids, SECT_ORDER, name, xml);
  };
  if (refs) {
    const now = kids.filter((k) => k.name === "w:headerReference" || k.name === "w:footerReference").map((k) => `${k.name}|${k.el.attrs["w:type"] ?? "default"}|${k.el.attrs["r:id"]}`).sort().join(",");
    const want = refs.map((r) => `w:${r.kind}Reference|${r.type}|${r.rid}`).sort().join(",");
    if (now !== want) {
      changed = true;
      for (let i2 = kids.length - 1; i2 >= 0; i2--) if (kids[i2].name === "w:headerReference" || kids[i2].name === "w:footerReference") kids.splice(i2, 1);
      kids.unshift(...refs.map((r) => {
        const x2 = `<w:${r.kind}Reference w:type="${r.type}" r:id="${r.rid}"/>`;
        return { name: `w:${r.kind}Reference`, raw: x2, el: { name: "", attrs: {}, children: [] } };
      }));
    }
  }
  if (cur.pageWidthTwips !== base.pageWidthTwips || cur.pageHeightTwips !== base.pageHeightTwips) {
    set("w:pgSz", withAttrs(kidRaw(kids, "w:pgSz"), "w:pgSz", {
      "w:w": cur.pageWidthTwips,
      "w:h": cur.pageHeightTwips,
      "w:orient": cur.pageWidthTwips > cur.pageHeightTwips ? "landscape" : void 0
    }));
  }
  if (cur.marginTopTwips !== base.marginTopTwips || cur.marginBottomTwips !== base.marginBottomTwips || cur.marginLeftTwips !== base.marginLeftTwips || cur.marginRightTwips !== base.marginRightTwips || (cur.headerDistanceTwips ?? 720) !== base.headerDistanceTwips || (cur.footerDistanceTwips ?? 720) !== base.footerDistanceTwips) {
    const pgMar = kidRaw(kids, "w:pgMar");
    set("w:pgMar", withAttrs(pgMar, "w:pgMar", {
      "w:top": cur.marginTopTwips,
      "w:right": cur.marginRightTwips,
      "w:bottom": cur.marginBottomTwips,
      "w:left": cur.marginLeftTwips,
      "w:header": cur.headerDistanceTwips ?? 720,
      "w:footer": cur.footerDistanceTwips ?? 720,
      ...pgMar ? {} : { "w:gutter": 0 }
    }));
  }
  if ((cur.type ?? "nextPage") !== (base.type ?? "nextPage")) {
    set("w:type", cur.type && cur.type !== "nextPage" ? `<w:type w:val="${cur.type}"/>` : null);
  }
  if (!eq(cur.cols, base.cols)) set("w:cols", colsXml(cur.cols, kidRaw(kids, "w:cols") || void 0));
  if (!!cur.titlePg !== !!base.titlePg) set("w:titlePg", cur.titlePg ? "<w:titlePg/>" : null);
  if (cur.pgBorders !== void 0 && !eq(cur.pgBorders ?? void 0, base.pgBorders ?? void 0)) set("w:pgBorders", pgBordersXml(cur.pgBorders));
  if (cur.pgNumStart !== base.pgNumStart || cur.pgNumFmt !== base.pgNumFmt || cur.pgNumChapStyle !== base.pgNumChapStyle || cur.pgNumChapSep !== base.pgNumChapSep) {
    set("w:pgNumType", pgNumTypeXml(cur, kidRaw(kids, "w:pgNumType")));
  }
  if (!sameNoteProps(cur.footnotePr, base.footnotePr)) set("w:footnotePr", notePropsXml("footnote", cur.footnotePr) || null);
  if (!sameNoteProps(cur.endnotePr, base.endnotePr)) set("w:endnotePr", notePropsXml("endnote", cur.endnotePr) || null);
  if ((cur.footnoteColumns ?? 0) !== (base.footnoteColumns ?? 0)) {
    set("w15:footnoteColumns", cur.footnoteColumns ? `<w15:footnoteColumns w:val="${cur.footnoteColumns}"/>` : null);
  }
  if (!eq(cur.lnNumType, base.lnNumType)) set("w:lnNumType", cur.lnNumType ? lnNumTypeXml(cur.lnNumType) : null);
  if (cur.vAlign !== base.vAlign) set("w:vAlign", cur.vAlign ? `<w:vAlign w:val="${cur.vAlign}"/>` : null);
  return changed ? join(open, kids, close) || `${open}${close}` : raw;
}

// ../docx-core/src/source.ts
function runSig(run) {
  return sigHash(JSON.stringify(run, sigReplacer));
}
function propsSig(p) {
  return sigHash(JSON.stringify(p.props, sigReplacer));
}
function sigHash(s) {
  let h1 = 3735928559, h2 = 1103547991;
  for (let i2 = 0; i2 < s.length; i2++) {
    const c = s.charCodeAt(i2);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function sigReplacer(_k, v) {
  return v instanceof Uint8Array ? `#bytes:${v.length}` : v;
}
var SourceStore = class {
  next = 1;
  paras = /* @__PURE__ */ new Map();
  runs = /* @__PURE__ */ new Map();
  tables = /* @__PURE__ */ new Map();
  trs = /* @__PURE__ */ new Map();
  tcs = /* @__PURE__ */ new Map();
  /** Por caminho da parte (word/document.xml, word/header1.xml…). */
  stories = /* @__PURE__ */ new Map();
  /** Conteúdo de caixa de texto (w:txbxContent) com algo além de w:p/w:tbl (sdt/
   *  customXml de bloco): os filhos como grupos — a caixa editada reembrulha como o
   *  corpo. */
  txbx = /* @__PURE__ */ new WeakMap();
  txbxGroups = [];
  addTextboxGroups(tb, groups) {
    this.txbx.set(tb, groups);
    this.txbxGroups.push(groups);
  }
  /** Por caminho da parte de notas (word/footnotes.xml, word/endnotes.xml). */
  noteParts = /* @__PURE__ */ new Map();
  /** ids dos comentários existentes ao abrir (os marcadores deles ficam crus). */
  commentIds = /* @__PURE__ */ new Set();
  /** comments.xml original, para regravar só se a lista mudar. */
  commentsSig;
  /** numIds livres escolhidos (no 1º salvar) para as listas que o editor cria. */
  genNumIds;
  /** Parágrafos e tabelas lidos — a linha de base é tirada deles. */
  paraRefs = [];
  tableRefs = [];
  /** Resultado de pristine/tablePristine por objeto durante UM salvamento. */
  memo = /* @__PURE__ */ new WeakMap();
  id() {
    return this.next++;
  }
  /** Começo de um salvamento: o modelo pode ter mudado desde o anterior. */
  beginSave() {
    this.memo = /* @__PURE__ */ new WeakMap();
  }
  /** Posição de origem de um bloco (parágrafo ou tabela) pelo id. */
  atOf(id) {
    return this.paras.get(id)?.at ?? this.tables.get(id)?.at;
  }
  addPara(p, src) {
    const id = this.id();
    this.paras.set(id, src);
    p.props.src = id;
    this.paraRefs.push(p);
    return id;
  }
  addTable(t, src) {
    const id = this.id();
    this.tables.set(id, src);
    t.src = id;
    this.tableRefs.push(t);
    return id;
  }
  addRow(row, src) {
    const id = this.id();
    this.trs.set(id, src);
    row.src = id;
    return id;
  }
  addCell(cell, src) {
    const id = this.id();
    this.tcs.set(id, src);
    cell.src = id;
    return id;
  }
  /** Linha de base: chamada pelo hospedeiro DEPOIS de instalar o documento
   *  (o editor ajusta runs ao instalar — texto de campos, quebras de seção). */
  baseline() {
    for (const p of this.paraRefs) {
      const id = p.props.src;
      const src = id !== void 0 ? this.paras.get(id) : void 0;
      if (!src) continue;
      src.sig = { props: propsSig(p), sids: p.runs.map((r) => r.props.src ?? 0), runs: p.runs.map(runSig) };
    }
    for (const t of this.tableRefs) {
      const src = t.src !== void 0 ? this.tables.get(t.src) : void 0;
      if (src) src.sig = tableSig(t);
    }
    this.paraRefs = [];
    this.tableRefs = [];
  }
  /**
   * w:sectPr cru de uma seção: o do parágrafo que a encerra (a quebra nova
   * copiada leva o dela em sectionBreak.raw; senão o do pPr de origem) ou, sem
   * parágrafo, o do corpo (última seção). Base da cópia que uma quebra de seção
   * nova grava — o Word copia o sectPr inteiro (oráculo tools/sections-lab).
   */
  sectPrRaw(closing) {
    if (!closing) return this.stories.get("word/document.xml")?.sectPr;
    if (closing.props.sectionBreak?.raw) return closing.props.sectionBreak.raw;
    const pPr = closing.props.src !== void 0 ? this.paras.get(closing.props.src)?.pPr : void 0;
    return pPr ? splitElement(pPr).kids.find((k) => k.name === "w:sectPr")?.raw : void 0;
  }
  /**
   * O parágrafo — ou os runs em volta do cursor — está num controle de conteúdo
   * de TEXTO SEM FORMATAÇÃO (w:sdt com w:text, w:date, w:comboBox ou
   * w:dropDownList), de bloco ou inline? O Word recusa notas ali e um
   * w:footnoteReference dentro dele deixa o arquivo "corrompido" (oráculo
   * notes-lab, cc-*; rich text aceita).
   */
  inPlainTextControl(p, around) {
    const id = p.props.src;
    if (id === void 0) return false;
    const inGroups = (groups) => {
      for (const g of groups ?? []) {
        if (!g.blocks.includes(id)) continue;
        if (plainTextSdt(g.wrapOpen) || inGroups(g.inner)) return true;
      }
      return false;
    };
    for (const s of this.stories.values()) if (inGroups(s.groups)) return true;
    for (const c of this.tcs.values()) if (inGroups(c.groups)) return true;
    for (const g of this.txbxGroups) if (inGroups(g)) return true;
    const sids = new Set(around.map((r) => r?.props.src).filter((x2) => x2 !== void 0));
    return !!sids.size && !!this.paras.get(id)?.segs.some((s) => plainTextSdt(s.wrapOpen) && s.sids.some((x2) => sids.has(x2)));
  }
  /** Parágrafo igual à linha de base (mesmos runs, mesmas props). */
  pristine(p) {
    let v = this.memo.get(p);
    if (v === void 0) this.memo.set(p, v = this.computePristine(p));
    return v;
  }
  computePristine(p) {
    const id = p.props.src;
    const s = id !== void 0 ? this.paras.get(id)?.sig : void 0;
    if (!s || p.runs.length !== s.sids.length) return false;
    for (let i2 = 0; i2 < p.runs.length; i2++) {
      const r = p.runs[i2];
      if (r.props.src !== s.sids[i2] || runSig(r) !== s.runs[i2]) return false;
    }
    return propsSig(p) === s.props;
  }
  tablePristine(t) {
    let v = this.memo.get(t);
    if (v === void 0) {
      const s = t.src !== void 0 ? this.tables.get(t.src)?.sig : void 0;
      this.memo.set(t, v = s !== void 0 && tableSig(t) === s);
    }
    return v;
  }
};
function plainTextSdt(open) {
  if (!open || !/^<w:sdt[\s>]/.test(open)) return false;
  const end = open.indexOf("</w:sdtPr>");
  return /<w:(?:text|date|comboBox|dropDownList)\b/.test(end < 0 ? open : open.slice(0, end));
}
function tableSig(t) {
  return sigHash(JSON.stringify(t, sigReplacer));
}

// ../docx-core/src/page-background.ts
var pct = (v) => {
  if (v === void 0 || v === "") return void 0;
  const s = v.trim();
  if (s.endsWith("%")) return parseFloat(s);
  if (s.endsWith("f")) return parseInt(s, 10) / 65536 * 100;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n * 100 : void 0;
};
var frac2 = (v) => v.endsWith("f") ? parseInt(v, 10) / 65536 : parseFloat(v);
function readPageBackground(bg, resolveImage) {
  const out = {};
  for (const k of ["color", "themeColor", "themeTint", "themeShade"]) {
    const v = bg.attrs[`w:${k}`];
    if (v) out[k] = v;
  }
  const vbg = firstChild(bg, "v:background");
  const vf = vbg && firstChild(vbg, "v:fill");
  const type = vf?.attrs["type"];
  if (vbg && vf && (type === "gradient" || type === "gradientRadial" || type === "pattern" || type === "frame" || type === "tile")) {
    const f = { type };
    const c1 = vmlColor(vbg.attrs["fillcolor"]);
    if (c1) f.color = c1;
    if (vf.attrs["color2"]) f.color2 = vf.attrs["color2"];
    if (vf.attrs["angle"]) f.angle = parseFloat(vf.attrs["angle"]);
    const fo = pct(vf.attrs["focus"]);
    if (fo !== void 0) f.focus = fo;
    const fp = vf.attrs["focusposition"];
    if (fp !== void 0 && fp !== "") {
      const [x2 = "", y = ""] = fp.split(",");
      f.focusPosition = [x2.trim() ? frac2(x2.trim()) : 0, y.trim() ? frac2(y.trim()) : 0];
    }
    if (firstChild(vf, "o:fill")?.attrs["type"] === "gradientCenter") f.gradientCenter = true;
    const colors = vf.attrs["colors"];
    if (colors) {
      const stops = colors.split(";").map((s) => s.trim().split(/\s+/)).filter((p) => p.length >= 2).map(([pos, col]) => ({ pos: frac2(pos), color: vmlColor(col) ?? "000000" }));
      if (stops.length) f.colors = stops;
    }
    if (vf.attrs["method"]) f.method = vf.attrs["method"];
    if (vf.attrs["o:title"] !== void 0) f.title = vf.attrs["o:title"];
    const rid = vf.attrs["r:id"];
    const img = rid ? resolveImage(rid) : void 0;
    if (img) f.image = img;
    if (vbg.attrs["o:targetscreensize"]) f.targetScreen = true;
    out.fill = f;
  }
  return Object.keys(out).length ? out : void 0;
}
var NAMED = {
  "000000": "black",
  "FFFFFF": "white",
  "FF0000": "red",
  "008000": "green",
  "0000FF": "blue",
  "FFFF00": "yellow",
  "808080": "gray",
  "C0C0C0": "silver",
  "000080": "navy",
  "800000": "maroon",
  "008080": "teal",
  "808000": "olive",
  "800080": "purple",
  "FF00FF": "fuchsia",
  "00FFFF": "aqua",
  "00FF00": "lime"
};
function vmlColorAttr(hex2) {
  const h = hex2.replace(/^#/, "").toUpperCase();
  const name = NAMED[h];
  if (name) return name;
  const l = h.toLowerCase();
  return l[0] === l[1] && l[2] === l[3] && l[4] === l[5] ? `#${l[0]}${l[2]}${l[4]}` : `#${l}`;
}
var escAttr2 = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
var pctAttr = (v) => `${Math.round(v * 100) / 100}%`;
var fracAttr = (v) => v === 0 ? "0" : v === 1 ? "1" : String(Math.round(v * 1e3) / 1e3).replace(/^0\./, ".");
function pageBackgroundXml(bg, rid) {
  const f = bg.fill;
  const image = f && (f.type === "frame" || f.type === "tile");
  const color = image ? "FFFFFF" : bg.color ?? f?.color ?? "FFFFFF";
  const attrs3 = `w:color="${color.toUpperCase()}"` + (bg.themeColor && !f ? ` w:themeColor="${bg.themeColor}"` : "") + (bg.themeTint && !f ? ` w:themeTint="${bg.themeTint}"` : "") + (bg.themeShade && !f ? ` w:themeShade="${bg.themeShade}"` : "");
  if (!f) return `<w:background ${attrs3}/>`;
  const vbg = '<v:background id="_x0000_s1025" o:bwmode="white"' + (!image && f.color ? ` fillcolor="${vmlColorAttr(f.color)}"` : "") + (f.type === "gradient" || f.type === "gradientRadial" || f.type === "frame" ? ' o:targetscreensize="1024,768"' : "") + ">";
  let fill = "<v:fill";
  if (rid) fill += ` r:id="${rid}"`;
  if (f.title !== void 0 && (f.type === "pattern" || image)) fill += ` o:title="${escAttr2(f.title)}"`;
  if (f.color2 !== void 0) fill += ` color2="${escAttr2(f.color2)}"`;
  if (f.colors?.length) fill += ` colors="${f.colors.map((s) => `${s.pos === 0 ? "0" : s.pos === 1 ? "1" : `${Math.round(s.pos * 65536)}f`} ${vmlColorAttr(s.color)}`).join(";")}"`;
  if (f.angle) fill += ` angle="${Math.round(f.angle)}"`;
  if (f.method) fill += ` method="${escAttr2(f.method)}"`;
  if (f.focusPosition) {
    const [x2, y] = f.focusPosition;
    fill += ` focusposition="${x2 ? fracAttr(x2) : ""}${y ? `,${fracAttr(y)}` : ""}" focussize=""`;
  }
  if (f.focus) fill += ` focus="${pctAttr(f.focus)}"`;
  fill += ` type="${f.type}"`;
  fill += f.gradientCenter ? '><o:fill v:ext="view" type="gradientCenter"/></v:fill>' : "/>";
  return `<w:background ${attrs3}>${vbg}${fill}</v:background></w:background>`;
}
var NS = [
  ["v", "urn:schemas-microsoft-com:vml"],
  ["o", "urn:schemas-microsoft-com:office:office"],
  ["r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships"]
];
var MIME = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  emf: "image/x-emf",
  wmf: "image/x-wmf"
};
function writePageBackground(pkg, bg, prev) {
  const path = partByRelType(pkg, "officeDocument", "word/document.xml");
  let xml = pkg.getPartText(path);
  if (!xml) return void 0;
  const relsPath = path.replace(/([^/]+)$/, "_rels/$1.rels");
  let rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  if (prev) {
    const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${prev.rid}"[^>]*/>`).exec(rels);
    if (rel) rels = rels.slice(0, rel.index) + rels.slice(rel.index + rel[0].length);
    pkg.removePart(prev.media);
  }
  let added;
  const old = /<w:background\b[^>]*?(?:\/>|>[\s\S]*?<\/w:background>)/.exec(xml);
  const oldRid = old ? /\br:id="([^"]+)"/.exec(old[0])?.[1] : void 0;
  if (old) xml = xml.slice(0, old.index) + xml.slice(old.index + old[0].length);
  let rid;
  const img = bg?.fill?.image;
  if (img) {
    const ext = img.ext.toLowerCase() === "jpg" ? "jpeg" : img.ext.toLowerCase();
    let n = 1;
    while (pkg.getPart(`word/media/image${n}.${ext}`)) n++;
    const target = `media/image${n}.${ext}`;
    pkg.setPart(`word/${target}`, img.data);
    let k = 1;
    while (new RegExp(`Id="rId${k}"`).test(rels)) k++;
    rid = `rId${k}`;
    added = { rid, media: `word/${target}` };
    rels = rels.replace("</Relationships>", () => `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/></Relationships>`);
    let ct = pkg.getPartText("[Content_Types].xml") ?? "";
    if (ct && !new RegExp(`<Default Extension="${ext}"`, "i").test(ct)) {
      ct = ct.replace(/(<Types\b[^>]*>)/, `$1<Default Extension="${ext}" ContentType="${MIME[ext] ?? `image/${ext}`}"/>`);
      pkg.setPartText("[Content_Types].xml", ct);
    }
  }
  if (bg) {
    const el3 = pageBackgroundXml(bg, rid);
    const m = /<w:document\b[^>]*>/.exec(xml);
    if (m) {
      let tag = m[0];
      if (bg.fill) {
        for (const [p, uri] of NS) if (!new RegExp(`\\sxmlns:${p}=`).test(tag)) tag = tag.replace(/>$/, ` xmlns:${p}="${uri}">`);
      }
      xml = xml.slice(0, m.index) + tag + el3 + xml.slice(m.index + m[0].length);
    }
  }
  if (oldRid && !new RegExp(`"${oldRid}"`).test(xml)) {
    const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${oldRid}"[^>]*/>`).exec(rels);
    if (rel) rels = rels.slice(0, rel.index) + rels.slice(rel.index + rel[0].length);
  }
  pkg.setPartText(path, xml);
  if (img || oldRid || prev) pkg.setPartText(relsPath, rels);
  return added;
}
var WORD_PATTERNS = [
  { prst: "pct5", title: { pt: " 5%", en: "5%" } },
  { prst: "pct10", title: { pt: " 10%", en: "10%" } },
  { prst: "pct20", title: { pt: " 20%", en: "20%" } },
  { prst: "pct25", title: { pt: " 25%", en: "25%" } },
  { prst: "pct30", title: { pt: " 30%", en: "30%" } },
  { prst: "pct40", title: { pt: " 40%", en: "40%" } },
  { prst: "pct50", title: { pt: " 50%", en: "50%" } },
  { prst: "pct60", title: { pt: " 60%", en: "60%" } },
  { prst: "pct70", title: { pt: " 70%", en: "70%" } },
  { prst: "pct75", title: { pt: " 75%", en: "75%" } },
  { prst: "pct80", title: { pt: " 80%", en: "80%" } },
  { prst: "pct90", title: { pt: " 90%", en: "90%" } },
  { prst: "dkHorz", title: { pt: " Escuras", en: "Dark horizontal" } },
  { prst: "dkVert", title: { pt: " escura", en: "Dark vertical" } },
  { prst: "dkDnDiag", title: { pt: " Escuras para baixo", en: "Dark downward diagonal" } },
  { prst: "dkUpDiag", title: { pt: " Escuras para cima", en: "Dark upward diagonal" } },
  { prst: "smCheck", title: { pt: "Quadriculado pequeno", en: "Small checker board" } },
  { prst: "trellis", title: { pt: "Treli\xE7a", en: "Trellis" } },
  { prst: "ltHorz", title: { pt: " Claras", en: "Light horizontal" } },
  { prst: "ltVert", title: { pt: " clara", en: "Light vertical" } },
  { prst: "ltDnDiag", title: { pt: " Claras para baixo", en: "Light downward diagonal" } },
  { prst: "ltUpDiag", title: { pt: " Claras para cima", en: "Light upward diagonal" } },
  { prst: "smGrid", title: { pt: "Grade fechada", en: "Small grid" } },
  { prst: "dotDmnd", title: { pt: "Losango pontilhado", en: "Dotted diamond" } },
  { prst: "wdDnDiag", title: { pt: " Largas para baixo", en: "Wide downward diagonal" } },
  { prst: "wdUpDiag", title: { pt: " Largas para cima", en: "Wide upward diagonal" } },
  { prst: "dashUpDiag", title: { pt: " Barras", en: "Dashed upward diagonal" } },
  { prst: "dashDnDiag", title: { pt: " Barras invertidas", en: "Dashed downward diagonal" } },
  { prst: "narVert", title: { pt: " estreita", en: "Narrow vertical" } },
  { prst: "narHorz", title: { pt: " Estreitas", en: "Narrow horizontal" } },
  { prst: "dashVert", title: { pt: " alternando linhas verticais", en: "Dashed vertical" } },
  { prst: "dashHorz", title: { pt: " alternando linhas horizontais", en: "Dashed horizontal" } },
  { prst: "lgConfetti", title: { pt: "Confetes grandes", en: "Large confetti" } },
  { prst: "lgGrid", title: { pt: "Grade aberta", en: "Large grid" } },
  { prst: "horzBrick", title: { pt: "Tijolo na horizontal", en: "Horizontal brick" } },
  { prst: "lgCheck", title: { pt: "Quadriculado grande", en: "Large checker board" } },
  { prst: "smConfetti", title: { pt: "Confetes pequenos", en: "Small confetti" } },
  { prst: "zigZag", title: { pt: "Ziguezague", en: "Zig zag" } },
  { prst: "solidDmnd", title: { pt: "Losango s\xF3lido", en: "Solid diamond" } },
  { prst: "diagBrick", title: { pt: "Tijolo na diagonal", en: "Diagonal brick" } },
  { prst: "openDmnd", title: { pt: "Contorno de losango", en: "Outlined diamond" } },
  { prst: "plaid", title: { pt: "Xadrez", en: "Plaid" } },
  { prst: "sphere", title: { pt: "Esfera", en: "Sphere" } },
  { prst: "weave", title: { pt: "Tran\xE7a", en: "Weave" } },
  { prst: "dotGrid", title: { pt: "Grade pontilhada", en: "Dotted grid" } },
  { prst: "divot", title: { pt: "Malha", en: "Divot" } },
  { prst: "shingle", title: { pt: "Telhas", en: "Shingle" } },
  { prst: "wave", title: { pt: "Ondulado", en: "Wave" } }
];
function patternGif(rows) {
  const idx = [];
  for (let y = 0; y < 8; y++) for (let x2 = 0; x2 < 8; x2++) idx.push((rows[y] ?? 0) >> 7 - x2 & 1 ? 0 : 1);
  const comment = "Software: Microsoft Office";
  const head = [
    ..."GIF87a".split("").map((c) => c.charCodeAt(0)),
    8,
    0,
    8,
    0,
    119,
    1,
    0,
    33,
    254,
    comment.length,
    ...comment.split("").map((c) => c.charCodeAt(0)),
    0,
    44,
    0,
    0,
    0,
    0,
    8,
    0,
    8,
    0,
    128,
    255,
    255,
    255,
    0,
    0,
    0
  ];
  const lzw = lzwEncode(idx, 2);
  const body = [2];
  for (let i2 = 0; i2 < lzw.length; i2 += 255) {
    const blk = lzw.slice(i2, i2 + 255);
    body.push(blk.length, ...blk);
  }
  body.push(0, 59);
  return Uint8Array.from([...head, ...body]);
}
function lzwEncode(data, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  const out = [];
  let cur = 0, bits2 = 0;
  let size = minCode + 1;
  const emit = (code) => {
    cur |= code << bits2;
    bits2 += size;
    while (bits2 >= 8) {
      out.push(cur & 255);
      cur >>= 8;
      bits2 -= 8;
    }
  };
  let dict = /* @__PURE__ */ new Map();
  let next = eoi + 1;
  const reset = () => {
    dict = /* @__PURE__ */ new Map();
    next = eoi + 1;
    size = minCode + 1;
  };
  emit(clear);
  reset();
  let w = String(data[0]);
  for (let i2 = 1; i2 < data.length; i2++) {
    const k = String(data[i2]);
    const wk = `${w},${k}`;
    if (dict.has(wk)) {
      w = wk;
      continue;
    }
    emit(w.includes(",") ? dict.get(w) : Number(w));
    dict.set(wk, next++);
    if (next > 1 << size && size < 12) size++;
    if (next >= 4095) {
      emit(clear);
      reset();
    }
    w = k;
  }
  emit(w.includes(",") ? dict.get(w) : Number(w));
  emit(eoi);
  if (bits2 > 0) out.push(cur & 255);
  return out;
}
function oneColorGradientColor2(degree) {
  const d = Math.max(0, Math.min(1, degree));
  if (Math.abs(d - 0.5) < 1e-6) return "fill";
  return d < 0.5 ? `fill darken(${Math.round(510 * d)})` : `fill lighten(${Math.round(510 * (1 - d))})`;
}
function resolveColor2(color2, color1) {
  if (!color2) return "FFFFFF";
  const m = /^\s*fill(?:\s+(darken|lighten)\((\d+)\))?\s*$/i.exec(color2);
  if (!m) return vmlColor(color2) ?? "FFFFFF";
  if (!m[1]) return color1;
  const n = Math.max(0, Math.min(255, parseInt(m[2], 10)));
  const c = [0, 2, 4].map((i2) => parseInt(color1.slice(i2, i2 + 2), 16));
  const r = m[1].toLowerCase() === "darken" ? c.map((v) => Math.floor(v * n / 255)) : c.map((v) => 255 - Math.floor((255 - v) * n / 255));
  return r.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// ../docx-core/src/fulldoc.ts
function readBorderSet(el3, inside) {
  if (!el3) return void 0;
  const out = {};
  const sides = inside ? ["top", "left", "bottom", "right", "insideH", "insideV"] : ["top", "left", "bottom", "right"];
  let any = false;
  for (const side of sides) {
    const edge = readBorderEdge(firstChild(el3, `w:${side}`));
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  return any ? out : void 0;
}
function unwrap(el3, name) {
  const out = [];
  for (const c of childElements(el3)) {
    if (c.name === name) out.push(c);
    else if (c.name === "w:sdt") {
      const content = firstChild(c, "w:sdtContent");
      if (content) out.push(...unwrap(content, name));
    } else if (c.name === "w:customXml") out.push(...unwrap(c, name));
  }
  return out;
}
var wrapIds = 0;
function unwrapRaw(el3, name, skip, xml) {
  const out = [];
  let pending = [];
  const walk = (container, top) => {
    for (const c of childElements(container)) {
      if (c.name === name) {
        out.push({ el: c, pre: pending, post: [] });
        pending = [];
        continue;
      }
      if (top ? skip.includes(c.name) : container.name === "w:customXml" && c.name.endsWith("Pr")) continue;
      const content = c.name === "w:sdt" ? firstChild(c, "w:sdtContent") : c.name === "w:customXml" ? c : void 0;
      if (content && content.cs !== void 0 && content.cs !== content.e) {
        let start = content.cs;
        if (content === c) for (const k of childElements(c)) {
          if (k.name.endsWith("Pr")) start = k.e;
          else break;
        }
        const id = ++wrapIds;
        const before = pending, n0 = out.length;
        pending = [...before, { raw: xml.slice(c.s, start), open: id }];
        walk(content, false);
        if (out.length > n0) {
          out[out.length - 1].post.push(...pending, { raw: xml.slice(content.ce, c.e), close: id });
          pending = [];
        } else pending = [...before, { raw: xml.slice(c.s, c.e) }];
        continue;
      }
      pending.push({ raw: xml.slice(c.s, c.e) });
    }
  };
  walk(el3, true);
  if (pending.length && out.length) out[out.length - 1].post.push(...pending);
  return out;
}
var wrapOf = (w) => ({ ...w.pre.length ? { pre: w.pre } : {}, ...w.post.length ? { post: w.post } : {} });
function readBlocksGrouped(container, ctx) {
  const xml = ctx.sources && container.s !== void 0 ? ctx.sourceXml : void 0;
  const kids = xml !== void 0 ? childElements(container) : [];
  if (xml === void 0 || !kids.some((k) => k.name !== "w:p" && k.name !== "w:tbl")) return { blocks: readBlocksOf(container, ctx) };
  const blocks = [], groups = [];
  for (const k of kids) {
    const produced = readBlocksOf({ name: container.name, attrs: {}, children: [k] }, ctx);
    groups.push(groupOf(xml, k, produced, ctx.sources));
    blocks.push(...produced);
  }
  return { blocks, groups };
}
function readBlocksOf(container, ctx) {
  const out = [];
  for (const c of childElements(container)) {
    if (c.name === "w:p") out.push({ type: "paragraph", paragraph: readParagraph(c, ctx) });
    else if (c.name === "w:tbl") out.push(readTable(c, ctx));
    else if (c.name === "w:sdt") {
      const content = firstChild(c, "w:sdtContent");
      if (content) out.push(...readBlocksOf(content, ctx));
    } else if (c.name === "w:customXml") out.push(...readBlocksOf(c, ctx));
  }
  return out;
}
function readTable(tblEl, ctx) {
  const xml = ctx.sources && tblEl.s !== void 0 ? ctx.sourceXml : void 0;
  const slice = (el3) => el3 && xml !== void 0 ? xml.slice(el3.s, el3.e) : void 0;
  const openOf = (el3) => xml.slice(el3.s, el3.cs === el3.e ? el3.e : el3.cs).replace(/\s*\/>$/, ">");
  const grid = firstChild(tblEl, "w:tblGrid");
  const gridColsTwips = grid ? childElements(grid, "w:gridCol").map((c) => parseInt(c.attrs["w:w"] ?? "0", 10) || 0) : [];
  const tblPrEl = firstChild(tblEl, "w:tblPr");
  const tblBorders = readBorderSet(tblPrEl && firstChild(tblPrEl, "w:tblBorders"), true);
  const rows = [];
  const wrapped = (parent, name, skip) => xml !== void 0 ? unwrapRaw(parent, name, skip, xml) : unwrap(parent, name).map((el3) => ({ el: el3, pre: [], post: [] }));
  for (const trW of wrapped(tblEl, "w:tr", ["w:tblPr", "w:tblGrid"])) {
    const trEl = trW.el;
    const cells = [];
    for (const tcWr of wrapped(trEl, "w:tc", ["w:trPr", "w:tblPrEx"])) {
      const tcEl = tcWr.el;
      const tcPrEl = firstChild(tcEl, "w:tcPr");
      const tcPr = readTcPr(tcPrEl);
      const shd = tcPrEl && firstChild(tcPrEl, "w:shd")?.attrs["w:fill"];
      const tcW = tcPrEl && firstChild(tcPrEl, "w:tcW");
      const cellBorders = readBorderSet(tcPrEl && firstChild(tcPrEl, "w:tcBorders"), true);
      const kids = xml !== void 0 ? childElements(tcEl).filter((k) => k.name !== "w:tcPr") : [];
      const groups = kids.some((k) => k.name !== "w:p" && k.name !== "w:tbl") ? [] : void 0;
      let blocks;
      if (groups) {
        blocks = [];
        for (const k of kids) {
          const produced = readBlocksOf({ name: tcEl.name, attrs: {}, children: [k] }, ctx);
          groups.push(groupOf(xml, k, produced, ctx.sources));
          blocks.push(...produced);
        }
      } else blocks = readBlocksOf(tcEl, ctx);
      if (!blocks.some((bl) => bl.type === "paragraph")) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
      const paragraphs = blocks.filter((bl) => bl.type === "paragraph").map((bl) => bl.paragraph);
      const tables = blocks.filter((bl) => bl.type === "table");
      const cell = {
        paragraphs,
        tables,
        gridSpan: tcPr?.gridSpan ?? 1,
        widthTwips: tcW && tcW.attrs["w:type"] === "dxa" ? parseInt(tcW.attrs["w:w"] ?? "0", 10) : void 0,
        shadingHex: shd && shd !== "auto" ? shd : void 0,
        borders: cellBorders,
        blocks
      };
      if (tcPr) cell.tcPr = tcPr;
      if (xml !== void 0) {
        const tcPrRaw = slice(tcPrEl);
        ctx.sources.addCell(cell, { open: openOf(tcEl), ...tcPrRaw ? { tcPr: tcPrRaw } : {}, ...groups ? { groups } : {}, ...wrapOf(tcWr) });
      }
      cells.push(cell);
    }
    if (cells.length > 0) {
      const row = { cells };
      const trPr = readTrPr(firstChild(trEl, "w:trPr"));
      if (trPr) row.trPr = trPr;
      const ex = readTblPr(firstChild(trEl, "w:tblPrEx"));
      if (ex) row.tblPrEx = ex;
      if (xml !== void 0) {
        const trPrRaw = slice(firstChild(trEl, "w:trPr"));
        const exRaw = slice(firstChild(trEl, "w:tblPrEx"));
        ctx.sources.addRow(row, { open: openOf(trEl), ...trPrRaw ? { trPr: trPrRaw } : {}, ...exRaw ? { tblPrEx: exRaw } : {}, ...wrapOf(trW) });
      }
      rows.push(row);
    }
  }
  const table = { type: "table", rows, gridColsTwips, borders: tblBorders };
  const tblPr = readTblPr(tblPrEl);
  if (tblPr) table.tblPr = tblPr;
  if (xml !== void 0) {
    const tblPrRaw = slice(tblPrEl);
    const gridRaw = slice(grid);
    ctx.sources.addTable(table, {
      raw: xml.slice(tblEl.s, tblEl.e),
      at: tblEl.s,
      open: openOf(tblEl),
      ...tblPrRaw ? { tblPr: tblPrRaw } : {},
      ...gridRaw ? { tblGrid: gridRaw } : {}
    });
  }
  return table;
}
function markSectionBreaks(full) {
  for (let si = 0; si < full.sections.length - 1; si++) {
    const s = full.sections[si];
    let b = Math.min(s.blockEnd, full.blocks.length - 1);
    while (b >= 0 && full.blocks[b].type !== "paragraph") b--;
    const block = full.blocks[b];
    if (block?.type !== "paragraph") continue;
    block.paragraph.props.sectionBreak = {
      sectPr: s.sectPr,
      headerRefs: s.headerRefs.map((r) => ({ kind: "header", type: r.type, rid: r.rid })),
      footerRefs: s.footerRefs.map((r) => ({ kind: "footer", type: r.type, rid: r.rid }))
    };
  }
}
function blockSrc(b) {
  return b.type === "paragraph" ? b.paragraph.props.src : b.src;
}
var blockSdtKeys = 0;
function markBlockSdt(child, g, produced) {
  const gallery = child.name === "w:sdt" ? docPartGallery(child) : void 0;
  if (gallery === void 0) return;
  const sdt = { key: `s${++blockSdtKeys}`, ...gallery ? { gallery } : {} };
  g.sdtKey = sdt.key;
  for (const b of produced) if (b.type === "paragraph") b.paragraph.props.blockSdt = sdt;
}
function docPartGallery(sdt) {
  const pr = firstChild(sdt, "w:sdtPr");
  const obj = pr && firstChild(pr, "w:docPartObj");
  if (!obj) return void 0;
  return firstChild(obj, "w:docPartGallery")?.attrs["w:val"] ?? "";
}
function storyOf(xml, container) {
  return { open: xml.slice(0, container.cs), close: xml.slice(container.ce), groups: [] };
}
function groupOf(xml, child, produced, store) {
  const ids = produced.map((b) => blockSrc(b) ?? 0);
  const g = { raw: xml.slice(child.s, child.e), blocks: ids };
  const content = child.name === "w:sdt" ? firstChild(child, "w:sdtContent") : child.name === "w:customXml" ? child : void 0;
  if (content && content.cs !== void 0 && content.cs !== content.e) {
    let start = content.cs;
    if (content === child) for (const k of childElements(child)) {
      if (k.name.endsWith("Pr")) start = k.e;
      else break;
    }
    g.wrapOpen = xml.slice(child.s, start);
    g.wrapClose = xml.slice(content.ce, child.e);
    g.inner = childElements(content).filter((k) => !k.name.endsWith("Pr")).map((k) => {
      const inside = produced.filter((b, i2) => {
        const at = store.atOf(ids[i2]);
        return at !== void 0 && at >= k.s && at < k.e;
      });
      return groupOf(xml, k, inside, store);
    });
  }
  return g;
}
function forEachTextbox(blocks, fn) {
  const runs = (rs) => {
    for (const r of rs) {
      if (r.textbox) {
        fn(r.textbox, r);
        walk(r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: "paragraph", paragraph })));
      }
      for (const it of r.group?.items ?? []) runs([it.run]);
    }
  };
  const walk = (bs) => {
    for (const b of bs) {
      if (b.type === "paragraph") runs(b.paragraph.runs);
      else for (const row of b.rows) for (const c of row.cells) walk(c.blocks ?? c.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph })));
    }
  };
  walk(blocks);
}
function linkVmlTextboxes(blocks) {
  const byId = /* @__PURE__ */ new Map();
  const targets = /* @__PURE__ */ new Set();
  let maxStory = 0;
  forEachTextbox(blocks, (tb) => {
    if (tb.vmlId) byId.set(tb.vmlId, tb);
    if (tb.vmlNext) targets.add(tb.vmlNext);
    if (tb.story !== void 0) maxStory = Math.max(maxStory, tb.story);
  });
  if (!targets.size) return;
  forEachTextbox(blocks, (tb) => {
    if (!tb.vmlNext || tb.vmlId && targets.has(tb.vmlId) || tb.story !== void 0) return;
    const id = ++maxStory;
    tb.story = id;
    let seq = 0;
    const seen = /* @__PURE__ */ new Set([tb]);
    for (let cur = byId.get(tb.vmlNext); cur && !seen.has(cur); cur = cur.vmlNext ? byId.get(cur.vmlNext) : void 0) {
      seen.add(cur);
      cur.link = { id, seq: ++seq };
      cur.paras = [];
      cur.blocks = [];
    }
  });
}
function readHeaderFooterPart(pkg, path, store, xml0) {
  const xml = xml0 ?? pkg.getPartText(path);
  if (!xml) return void 0;
  const root = parseXml(xml, { positions: !!store });
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  ctx.readBlocks = readBlocksOf;
  ctx.readBlocksGrouped = readBlocksGrouped;
  let blocks;
  if (!store) blocks = readBlocksOf(root, ctx);
  else {
    ctx.sources = store;
    ctx.sourceXml = xml;
    const story = storyOf(xml, root);
    blocks = [];
    for (const c of childElements(root)) {
      const produced = readBlocksOf({ name: root.name, attrs: {}, children: [c] }, ctx);
      story.groups.push(groupOf(xml, c, produced, store));
      blocks.push(...produced);
    }
    store.stories.set(path, story);
  }
  linkVmlTextboxes(blocks);
  const paras = [];
  const walk = (bs) => {
    for (const bl of bs) {
      if (bl.type === "paragraph") paras.push(bl.paragraph);
      else for (const r of bl.rows) for (const c of r.cells) walk(c.blocks ?? []);
    }
  };
  walk(blocks);
  return { paras, blocks };
}
function readBodyFragment(pkg, store, inner, ns) {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r
<w:document ${ns}><w:body>${inner}</w:body></w:document>`;
  const root = parseXml(xml, { positions: !!store });
  const body = firstChild(root, "w:body");
  if (!body) return void 0;
  const ctx = buildReadContext(pkg, "word/_rels/document.xml.rels");
  ctx.readBlocks = readBlocksOf;
  if (!store) return { blocks: readBlocksOf(body, ctx), groups: [] };
  ctx.sources = store;
  ctx.sourceXml = xml;
  const groups = [];
  const blocks = [];
  for (const c of childElements(body)) {
    const produced = readBlocksOf({ name: body.name, attrs: {}, children: [c] }, ctx);
    const g = groupOf(xml, c, produced, store);
    markBlockSdt(c, g, produced);
    groups.push(g);
    blocks.push(...produced);
  }
  return { blocks, groups };
}
function readNotesPart(pkg, path, elementName, blocksOut, store, special) {
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(path);
  if (!xml) return out;
  const root = parseXml(xml, { positions: !!store });
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  ctx.readBlocks = readBlocksOf;
  ctx.readBlocksGrouped = readBlocksGrouped;
  const part = store ? { open: xml.slice(0, root.cs), close: xml.slice(root.ce), items: [], refsAtLoad: /* @__PURE__ */ new Set() } : void 0;
  if (store) {
    ctx.sources = store;
    ctx.sourceXml = xml;
  }
  for (const note of childElements(root, elementName)) {
    const id = parseInt(note.attrs["w:id"] ?? "0", 10);
    const type = note.attrs["w:type"];
    if (type === "separator" || type === "continuationSeparator" || type === "continuationNotice") {
      special?.push(id);
      part?.items.push({ id, raw: xml.slice(note.s, note.e), separator: true });
      continue;
    }
    let blocks;
    if (!store) blocks = readBlocksOf(note, ctx);
    else {
      const story = { open: xml.slice(note.s, note.cs), close: xml.slice(note.ce, note.e), groups: [] };
      blocks = [];
      for (const c of childElements(note)) {
        const produced = readBlocksOf({ name: note.name, attrs: {}, children: [c] }, ctx);
        story.groups.push(groupOf(xml, c, produced, store));
        blocks.push(...produced);
      }
      part.items.push({ id, raw: xml.slice(note.s, note.e), story });
    }
    out.set(id, blocks.filter((bl) => bl.type === "paragraph").map((bl) => bl.paragraph));
    blocksOut?.set(id, blocks);
  }
  if (store && part) store.noteParts.set(path, part);
  return out;
}
function noteRefIds(blocks, kind, out = []) {
  for (const b of blocks) {
    if (b.type === "paragraph") {
      for (const r of b.paragraph.runs) if (r.noteRef?.kind === kind && !out.includes(r.noteRef.id)) out.push(r.noteRef.id);
    } else {
      for (const row of b.rows) for (const cell of row.cells) {
        noteRefIds(cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph })), kind, out);
      }
    }
  }
  return out;
}
function readComments(pkg) {
  const xml = pkg.getPartText("word/comments.xml");
  if (!xml) return [];
  const root = parseXml(xml);
  const ctx = buildReadContext(pkg, "word/_rels/comments.xml.rels");
  return childElements(root, "w:comment").map((c) => ({
    id: parseInt(c.attrs["w:id"] ?? "0", 10),
    author: c.attrs["w:author"],
    text: childElements(c, "w:p").map((p) => readParagraph(p, ctx).runs.map((r) => r.text).join("")).join("\n")
  }));
}
function readFullDocument(pkg, opts = {}) {
  const docXml = pkg.documentXml();
  const store = opts.sources ? new SourceStore() : void 0;
  const root = parseXml(docXml, { positions: !!store });
  const body = firstChild(root, "w:body");
  if (!body) throw new Error("w:document sem w:body");
  const ctx = buildReadContext(pkg, "word/_rels/document.xml.rels");
  ctx.readBlocks = readBlocksOf;
  ctx.readBlocksGrouped = readBlocksGrouped;
  const story = store ? storyOf(docXml, body) : void 0;
  if (store) {
    ctx.sources = store;
    ctx.sourceXml = docXml;
    store.stories.set("word/document.xml", story);
  }
  const relsXml = pkg.getPartText("word/_rels/document.xml.rels");
  const relTargets = /* @__PURE__ */ new Map();
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), "Relationship")) {
      if (rel.attrs["Id"] && rel.attrs["Target"]) {
        relTargets.set(rel.attrs["Id"], `word/${rel.attrs["Target"].replace(/^\.\//, "")}`);
      }
    }
  }
  const hfCache = /* @__PURE__ */ new Map();
  const readHfSet = (sectEl, kind) => {
    const set = {};
    const refs = [];
    const blocks2 = {};
    for (const ref of childElements(sectEl, `w:${kind}`)) {
      const rid = ref.attrs["r:id"];
      const type = ref.attrs["w:type"] ?? "default";
      const target = rid && relTargets.get(rid);
      if (target && rid) {
        if (!hfCache.has(target)) hfCache.set(target, readHeaderFooterPart(pkg, target, store));
        const part = hfCache.get(target);
        if (part) {
          set[type] = part.paras;
          blocks2[type] = part.blocks;
          refs.push({ type, rid, path: target });
        }
      }
    }
    return { set, refs, blocks: blocks2 };
  };
  const blocks = [];
  const sections = [];
  const bookmarks = /* @__PURE__ */ new Map();
  const bookmarkOffsets = /* @__PURE__ */ new Map();
  const bookmarkEnds = /* @__PURE__ */ new Map();
  ctx.onBookmark = (name, offset) => {
    if (!bookmarks.has(name)) {
      bookmarks.set(name, blocks.length);
      bookmarkOffsets.set(name, offset);
    }
  };
  ctx.onBookmarkEnd = (name, offset) => {
    if (!bookmarkEnds.has(name)) bookmarkEnds.set(name, { block: blocks.length, offset });
  };
  let sectionStart = 0;
  const closeSection = (sectEl, endBlock) => {
    const h = readHfSet(sectEl, "headerReference");
    const f = readHfSet(sectEl, "footerReference");
    sections.push({
      sectPr: readSectPr(sectEl),
      sect: readSectionProps(sectEl),
      blockStart: sectionStart,
      blockEnd: endBlock,
      headers: h.set,
      footers: f.set,
      headerRefs: h.refs,
      footerRefs: f.refs,
      headerBlocks: h.blocks,
      footerBlocks: f.blocks
    });
    sectionStart = endBlock + 1;
  };
  const readBlocksWithSections = (container) => {
    const out = [];
    for (const c of childElements(container)) {
      if (c.name === "w:p") {
        const pPr = firstChild(c, "w:pPr");
        const sectEl = pPr && firstChild(pPr, "w:sectPr");
        out.push({ block: { type: "paragraph", paragraph: readParagraph(c, ctx) }, ...sectEl ? { sectEl } : {} });
      } else if (c.name === "w:tbl") out.push({ block: readTable(c, ctx) });
      else if (c.name === "w:sdt") {
        const content = firstChild(c, "w:sdtContent");
        if (content) out.push(...readBlocksWithSections(content));
      } else if (c.name === "w:customXml") out.push(...readBlocksWithSections(c));
    }
    return out;
  };
  const bodyKids = childElements(body);
  for (const child of bodyKids) {
    const before = blocks.length;
    if (child.name === "w:p") {
      const para = readParagraph(child, ctx);
      blocks.push({ type: "paragraph", paragraph: para });
      const pPr = firstChild(child, "w:pPr");
      const sectEl = pPr && firstChild(pPr, "w:sectPr");
      if (sectEl) closeSection(sectEl, blocks.length - 1);
    } else if (child.name === "w:tbl") {
      blocks.push(readTable(child, ctx));
    } else if (child.name === "w:sectPr") {
      closeSection(child, blocks.length - 1);
    } else if (child.name === "w:sdt" || child.name === "w:customXml") {
      const content = child.name === "w:sdt" ? firstChild(child, "w:sdtContent") : child;
      if (content) {
        for (const inner of readBlocksWithSections(content)) {
          blocks.push(inner.block);
          if (inner.sectEl) closeSection(inner.sectEl, blocks.length - 1);
        }
      }
    }
    if (story) {
      if (child.name === "w:sectPr" && child === bodyKids[bodyKids.length - 1]) story.sectPr = docXml.slice(child.s, child.e);
      else {
        const g = groupOf(docXml, child, blocks.slice(before), store);
        markBlockSdt(child, g, blocks.slice(before));
        story.groups.push(g);
      }
    }
  }
  if (sections.length === 0) {
    closeSection(firstChild(body, "w:sectPr") ?? { name: "w:sectPr", attrs: {}, children: [] }, blocks.length - 1);
  }
  if (blocks.length === 0) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  linkVmlTextboxes(blocks);
  const comments = readComments(pkg);
  if (store) {
    for (const c of comments) store.commentIds.add(c.id);
    store.commentsSig = JSON.stringify(comments);
  }
  const footnoteBlocks = /* @__PURE__ */ new Map();
  const endnoteBlocks = /* @__PURE__ */ new Map();
  const noteSpecialIds = { footnote: [], endnote: [] };
  const footnotes = readNotesPart(pkg, "word/footnotes.xml", "w:footnote", footnoteBlocks, store, noteSpecialIds.footnote);
  const endnotes = readNotesPart(pkg, "word/endnotes.xml", "w:endnote", endnoteBlocks, store, noteSpecialIds.endnote);
  for (const kind of ["footnote", "endnote"]) {
    const part = store?.noteParts.get(`word/${kind}s.xml`);
    if (part) for (const id of noteRefIds(blocks, kind)) part.refsAtLoad.add(id);
  }
  return {
    blocks,
    sections,
    footnotes,
    endnotes,
    comments,
    styles: readStyles(pkg),
    bookmarks,
    bookmarkOffsets,
    bookmarkEnds,
    formatting: readDocFormatting(pkg),
    footnoteBlocks,
    endnoteBlocks,
    noteSpecialIds,
    ...readCoreProps(pkg),
    ...readBackground(root, ctx),
    ...store ? { sources: store } : {}
  };
}
function readBackground(root, ctx) {
  const bg = firstChild(root, "w:background");
  const out = bg ? readPageBackground(bg, (rid) => ctx.resolveImage(rid)) : void 0;
  return out ? { background: out } : {};
}
function readCoreProps(pkg) {
  const xml = pkg.getPartText("docProps/core.xml");
  if (!xml) return {};
  const get = (tag) => {
    const m = new RegExp("<" + tag + "[^>]*>([^<]*)<").exec(xml);
    return m ? m[1].trim() : void 0;
  };
  const created = get("dcterms:created"), modified = get("dcterms:modified"), lastPrinted = get("cp:lastPrinted");
  return { coreProps: { ...created ? { created } : {}, ...modified ? { modified } : {}, ...lastPrinted ? { lastPrinted } : {} } };
}
function readSectionProps(sectEl) {
  const v = (n, a = "w:val") => firstChild(sectEl, n)?.attrs[a];
  const out = { type: v("w:type") ?? "nextPage" };
  const pgSz = firstChild(sectEl, "w:pgSz");
  const orient = pgSz?.attrs["w:orient"];
  if (orient === "landscape" || orient === "portrait") out.orient = orient;
  const gutter = firstChild(sectEl, "w:pgMar")?.attrs["w:gutter"];
  if (gutter) out.gutter = parseInt(gutter, 10) || 0;
  const cols = firstChild(sectEl, "w:cols");
  if (cols) {
    const eq2 = cols.attrs["w:equalWidth"];
    if (eq2 !== void 0) out.equalWidth = !(eq2 === "0" || eq2 === "false");
    const defs = childElements(cols, "w:col").map((c) => ({ w: parseInt(c.attrs["w:w"] ?? "0", 10) || 0, space: parseInt(c.attrs["w:space"] ?? "0", 10) || 0 }));
    if (defs.length) out.colDefs = defs;
  }
  const va = v("w:vAlign");
  if (va) out.vAlign = va;
  const dg = firstChild(sectEl, "w:docGrid");
  if (dg) {
    out.docGrid = {};
    if (dg.attrs["w:type"]) out.docGrid.type = dg.attrs["w:type"];
    if (dg.attrs["w:linePitch"]) out.docGrid.linePitch = parseInt(dg.attrs["w:linePitch"], 10);
    if (dg.attrs["w:charSpace"]) out.docGrid.charSpace = parseInt(dg.attrs["w:charSpace"], 10);
  }
  const pb = firstChild(sectEl, "w:pgBorders");
  if (pb) {
    out.pgBorders = {};
    if (pb.attrs["w:offsetFrom"]) out.pgBorders.offsetFrom = pb.attrs["w:offsetFrom"];
    if (pb.attrs["w:display"]) out.pgBorders.display = pb.attrs["w:display"];
    if (pb.attrs["w:zOrder"]) out.pgBorders.zOrder = pb.attrs["w:zOrder"];
    for (const side of ["top", "left", "bottom", "right"]) {
      const bd = readBorder(firstChild(pb, `w:${side}`));
      if (bd) out.pgBorders[side] = bd;
    }
  }
  const fmt = firstChild(sectEl, "w:pgNumType")?.attrs["w:fmt"];
  if (fmt) out.pgNumFmt = fmt;
  const ln2 = firstChild(sectEl, "w:lnNumType");
  if (ln2) {
    out.lnNumType = {};
    if (ln2.attrs["w:countBy"]) out.lnNumType.countBy = parseInt(ln2.attrs["w:countBy"], 10);
    if (ln2.attrs["w:start"]) out.lnNumType.start = parseInt(ln2.attrs["w:start"], 10);
    if (ln2.attrs["w:restart"]) out.lnNumType.restart = ln2.attrs["w:restart"];
    if (ln2.attrs["w:distance"]) out.lnNumType.distance = parseInt(ln2.attrs["w:distance"], 10);
  }
  if (firstChild(sectEl, "w:bidi")) out.bidi = true;
  if (firstChild(sectEl, "w:rtlGutter")) out.rtlGutter = true;
  if (firstChild(sectEl, "w:formProt")) out.formProt = true;
  if (firstChild(sectEl, "w:noEndnote")) out.noEndnote = true;
  return out;
}

// ../docx-core/src/fonts.ts
var EMBED_TAGS = {
  "w:embedRegular": "regular",
  "w:embedBold": "bold",
  "w:embedItalic": "italic",
  "w:embedBoldItalic": "boldItalic"
};
function deobfuscateFont(data, fontKey) {
  const hex2 = fontKey.replace(/[{}-]/g, "");
  if (hex2.length < 32) return data;
  const key = new Uint8Array(16);
  for (let i2 = 0; i2 < 16; i2++) key[i2] = parseInt(hex2.slice(i2 * 2, i2 * 2 + 2), 16);
  key.reverse();
  const out = data.slice();
  const n = Math.min(32, out.length);
  for (let i2 = 0; i2 < n; i2++) out[i2] = out[i2] ^ key[i2 % 16];
  return out;
}
function readEmbeddedFonts(pkg) {
  const tableXml2 = pkg.getPartText("word/fontTable.xml");
  if (!tableXml2) return [];
  const relsXml = pkg.getPartText("word/_rels/fontTable.xml.rels");
  const rels = /* @__PURE__ */ new Map();
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), "Relationship")) {
      const id = rel.attrs["Id"];
      const target = rel.attrs["Target"];
      if (id && target) rels.set(id, target);
    }
  }
  const out = [];
  const root = parseXml(tableXml2);
  for (const font of childElements(root, "w:font")) {
    const family = font.attrs["w:name"];
    if (!family) continue;
    for (const [tag, variant] of Object.entries(EMBED_TAGS)) {
      const embed = firstChild(font, tag);
      if (!embed) continue;
      const rid = embed.attrs["r:id"];
      const fontKey = embed.attrs["w:fontKey"];
      if (!rid || !fontKey) continue;
      const target = rels.get(rid);
      if (!target) continue;
      const path = target.startsWith("word/") ? target : `word/${target.replace(/^\.?\//, "")}`;
      const raw = pkg.getPart(path);
      if (!raw) continue;
      out.push({ family, variant, data: deobfuscateFont(raw, fontKey) });
    }
  }
  return out;
}

// ../docx-core/src/section-ops.ts
var COLUMN_SPACE_DEFAULT = 708;
var COLUMN_MIN_WIDTH = 720;
function sectionRanges(model) {
  const out = [];
  let start = 0;
  model.paragraphs.forEach((p, i2) => {
    const sb = p.props.sectionBreak;
    if (!sb) return;
    out.push({ start, end: i2, sb });
    start = i2 + 1;
  });
  out.push({ start, end: Math.max(start, model.paragraphs.length - 1) });
  return out;
}
function sectionIndexAt(model, para) {
  const rs = sectionRanges(model);
  const k = rs.findIndex((r) => para <= r.end);
  return k < 0 ? rs.length - 1 : k;
}
function sectionSectPr(model, k) {
  return sectionRanges(model)[k]?.sb?.sectPr ?? model.sectPr;
}
function sectionRefs(model, k) {
  const r = sectionRanges(model)[k];
  if (r?.sb) return r.sb;
  return model.bodyRefs ??= { headerRefs: [], footerRefs: [] };
}
var cloneSectPr = (s) => JSON.parse(JSON.stringify(s));
function insertSectionBreak(model, pos, type = "nextPage", opts = {}) {
  const k = sectionIndexAt(model, pos.para);
  const range = sectionRanges(model)[k];
  const sp = range.sb ? range.sb.sectPr : model.sectPr;
  const refs = range.sb ?? model.bodyRefs ?? { headerRefs: [], footerRefs: [] };
  const sb = {
    sectPr: cloneSectPr(sp),
    headerRefs: refs.headerRefs.map((r) => ({ ...r })),
    footerRefs: refs.footerRefs.map((r) => ({ ...r })),
    ...opts.raw ? { raw: opts.raw } : {},
    ...opts.id !== void 0 ? { id: opts.id } : {}
  };
  const next = (opts.split ?? splitParagraph)(model, pos);
  const first = model.paragraphs[pos.para];
  first.props = { ...first.props, sectionBreak: sb };
  if (type === "nextPage") delete sp.type;
  else sp.type = type;
  if (range.sb) {
    range.sb.headerRefs = [];
    range.sb.footerRefs = [];
  } else model.bodyRefs = { headerRefs: [], footerRefs: [] };
  return next;
}
function insertPageBreakParagraph(model, pos, split2 = splitParagraph) {
  const at = pos.offset > 0 ? split2(model, pos) : pos;
  model.paragraphs.splice(at.para, 0, { runs: [{ text: "\f", props: { ...DEFAULT_RUN_PROPS } }], props: {} });
  return { index: at.para, at: { para: at.para + 1, offset: 0 } };
}
var contentWidth = (sp) => sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
var maxColumns = (sp) => Math.max(1, Math.floor(contentWidth(sp) / COLUMN_MIN_WIDTH));
function columnsFor(sp, spec) {
  const W3 = contentWidth(sp);
  const n = Math.max(1, Math.min(Math.round(spec.count), maxColumns(sp)));
  if (n < 2) return void 0;
  let space = Math.max(0, Math.round(spec.spaceTwips ?? sp.cols?.spaceTwips ?? COLUMN_SPACE_DEFAULT));
  if ((W3 - space * (n - 1)) / n < COLUMN_MIN_WIDTH) space = Math.max(0, Math.floor((W3 - n * COLUMN_MIN_WIDTH) / (n - 1)));
  const cols = { count: n, spaceTwips: space, sep: !!spec.sep };
  if (spec.widths && spec.widths.length >= n) {
    cols.widths = spec.widths.slice(0, n).map((c, i2) => ({
      widthTwips: Math.max(COLUMN_MIN_WIDTH, Math.round(c.widthTwips)),
      // o Word grava o w:space da última coluna com o espaço geral
      spaceTwips: i2 === n - 1 ? space : Math.max(0, Math.round(c.spaceTwips))
    }));
  }
  return cols;
}
function presetColumns(sp, preset) {
  const sep = !!sp.cols?.sep;
  const space = sp.cols?.spaceTwips ?? COLUMN_SPACE_DEFAULT;
  if (preset === "one") return { count: 1, sep };
  if (preset === "two" || preset === "three") return { count: preset === "two" ? 2 : 3, spaceTwips: space, sep };
  const W3 = contentWidth(sp);
  const narrow = Math.round((W3 - 2 * space) / 3);
  const wide = W3 - narrow - space;
  const ws = preset === "left" ? [narrow, wide] : [wide, narrow];
  return { count: 2, spaceTwips: space, sep, widths: ws.map((w) => ({ widthTwips: w, spaceTwips: space })) };
}
function columnsPresetOf(sp) {
  const c = sp.cols;
  if (!c || c.count < 2) return "one";
  if (!c.widths) return c.count === 2 ? "two" : c.count === 3 ? "three" : null;
  if (c.count !== 2) return null;
  for (const p of ["left", "right"]) {
    const ref = presetColumns(sp, p).widths;
    if (ref.every((w, i2) => Math.abs(w.widthTwips - c.widths[i2].widthTwips) <= 20)) return p;
  }
  return null;
}
function columnWidths(sp) {
  const c = sp.cols;
  const W3 = contentWidth(sp);
  if (!c || c.count < 2) return [{ widthTwips: W3, spaceTwips: 0 }];
  if (c.widths) return c.widths.map((w2) => ({ ...w2 }));
  const w = Math.round((W3 - c.spaceTwips * (c.count - 1)) / c.count);
  return Array.from({ length: c.count }, (_, i2) => ({ widthTwips: w, spaceTwips: i2 < c.count - 1 ? c.spaceTwips : 0 }));
}
function setOrientation(sp, orientation) {
  const land = sp.pageWidthTwips > sp.pageHeightTwips;
  if (orientation === "landscape" === land) return;
  [sp.pageWidthTwips, sp.pageHeightTwips] = [sp.pageHeightTwips, sp.pageWidthTwips];
  const { marginTopTwips: t, marginRightTwips: r, marginBottomTwips: b, marginLeftTwips: l } = sp;
  if (orientation === "landscape") {
    sp.marginTopTwips = l;
    sp.marginRightTwips = t;
    sp.marginBottomTwips = r;
    sp.marginLeftTwips = b;
  } else {
    sp.marginTopTwips = r;
    sp.marginRightTwips = b;
    sp.marginBottomTwips = l;
    sp.marginLeftTwips = t;
  }
}

// ../docx-core/src/settings-xml.ts
var BEFORE_DEFAULT_TAB = /* @__PURE__ */ new Set([
  "w:writeProtection",
  "w:view",
  "w:zoom",
  "w:removePersonalInformation",
  "w:removeDateAndTime",
  "w:doNotDisplayPageBoundaries",
  "w:displayBackgroundShape",
  "w:printPostScriptOverText",
  "w:printFractionalCharacterWidth",
  "w:printFormsData",
  "w:embedTrueTypeFonts",
  "w:embedSystemFonts",
  "w:saveSubsetFonts",
  "w:saveFormsData",
  "w:mirrorMargins",
  "w:alignBordersAndEdges",
  "w:bordersDoNotSurroundHeader",
  "w:bordersDoNotSurroundFooter",
  "w:gutterAtTop",
  "w:hideSpellingErrors",
  "w:hideGrammaticalErrors",
  "w:activeWritingStyle",
  "w:proofState",
  "w:formsDesign",
  "w:attachedTemplate",
  "w:linkStyles",
  "w:stylePaneFormatFilter",
  "w:stylePaneSortMethod",
  "w:documentType",
  "w:mailMerge",
  "w:revisionView",
  "w:trackRevisions",
  "w:doNotTrackMoves",
  "w:doNotTrackFormatting",
  "w:documentProtection",
  "w:autoFormatOverride",
  "w:styleLockTheme",
  "w:styleLockQFSet"
]);
function writeDefaultTabStop(pkg, twips) {
  const path = partByRelType(pkg, "settings", "word/settings.xml");
  let xml = pkg.getPartText(path);
  if (!xml) return;
  const val3 = String(Math.round(twips));
  const cur = /<w:defaultTabStop\b[^>]*?\/>/.exec(xml);
  if (cur) {
    if (new RegExp(`w:val="${val3}"`).test(cur[0])) return;
    xml = xml.slice(0, cur.index) + `<w:defaultTabStop w:val="${val3}"/>` + xml.slice(cur.index + cur[0].length);
  } else {
    const root = parseXml(xml, { positions: true });
    if (root.cs === root.e) return;
    let at = root.cs;
    for (const k of childElements(root)) if (BEFORE_DEFAULT_TAB.has(k.name)) at = Math.max(at, k.e);
    xml = xml.slice(0, at) + `<w:defaultTabStop w:val="${val3}"/>` + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}
var HYPH_ORDER = ["w:autoHyphenation", "w:consecutiveHyphenLimit", "w:hyphenationZone", "w:doNotHyphenateCaps"];
function writeHyphenationSettings(pkg, s) {
  const path = partByRelType(pkg, "settings", "word/settings.xml");
  let xml = pkg.getPartText(path);
  if (!xml) {
    if (!s.auto && s.caps && !s.limit && s.zone === void 0) return;
    ensureSettingsPart(pkg);
    xml = pkg.getPartText("word/settings.xml");
    if (!xml) return;
  }
  const want = {
    "w:autoHyphenation": s.auto ? "<w:autoHyphenation/>" : null,
    "w:consecutiveHyphenLimit": s.limit > 0 ? `<w:consecutiveHyphenLimit w:val="${Math.round(s.limit)}"/>` : null,
    "w:hyphenationZone": s.zone !== void 0 ? `<w:hyphenationZone w:val="${Math.round(s.zone)}"/>` : null,
    "w:doNotHyphenateCaps": s.caps ? null : "<w:doNotHyphenateCaps/>"
  };
  for (const name of HYPH_ORDER) {
    const el3 = want[name];
    const cur = new RegExp(`<${name}\\b[^>]*?(?:/>|>[\\s\\S]*?</${name}>)`).exec(xml);
    if (cur) {
      if (cur[0] === el3) continue;
      xml = xml.slice(0, cur.index) + (el3 ?? "") + xml.slice(cur.index + cur[0].length);
      continue;
    }
    if (el3 === null) continue;
    const root = parseXml(xml, { positions: true });
    if (root.cs === root.e) continue;
    const before = /* @__PURE__ */ new Set([...BEFORE_DEFAULT_TAB, "w:defaultTabStop", ...HYPH_ORDER.slice(0, HYPH_ORDER.indexOf(name))]);
    let at = root.cs;
    for (const k of childElements(root)) if (before.has(k.name)) at = Math.max(at, k.e);
    xml = xml.slice(0, at) + el3 + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}
var BEFORE_EVEN_ODD = /* @__PURE__ */ new Set([
  ...BEFORE_DEFAULT_TAB,
  "w:defaultTabStop",
  "w:autoHyphenation",
  "w:consecutiveHyphenLimit",
  "w:hyphenationZone",
  "w:doNotHyphenateCaps",
  "w:showEnvelope",
  "w:summaryLength",
  "w:clickAndTypeStyle",
  "w:defaultTableStyle"
]);
function writeEvenAndOddHeaders(pkg, on) {
  const path = partByRelType(pkg, "settings", "word/settings.xml");
  let xml = pkg.getPartText(path);
  if (!xml) {
    if (!on) return;
    ensureSettingsPart(pkg);
    xml = pkg.getPartText("word/settings.xml");
    if (!xml) return;
  }
  const cur = /<w:evenAndOddHeaders\b[^>]*?(?:\/>|>[\s\S]*?<\/w:evenAndOddHeaders>)/.exec(xml);
  const isOn = !!cur && !/w:val="(?:0|false|off)"/.test(cur[0]);
  if (isOn === on) return;
  if (cur) xml = xml.slice(0, cur.index) + (on ? "<w:evenAndOddHeaders/>" : "") + xml.slice(cur.index + cur[0].length);
  else {
    const root = parseXml(xml, { positions: true });
    if (root.cs === root.e) return;
    let at = root.cs;
    for (const k of childElements(root)) if (BEFORE_EVEN_ODD.has(k.name)) at = Math.max(at, k.e);
    xml = xml.slice(0, at) + "<w:evenAndOddHeaders/>" + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}
var BEFORE_DISPLAY_BG = /* @__PURE__ */ new Set(["w:writeProtection", "w:view", "w:zoom", "w:removePersonalInformation", "w:removeDateAndTime", "w:doNotDisplayPageBoundaries"]);
function writeDisplayBackgroundShape(pkg, on) {
  const path = partByRelType(pkg, "settings", "word/settings.xml");
  let xml = pkg.getPartText(path);
  if (!xml) {
    if (!on) return;
    ensureSettingsPart(pkg);
    xml = pkg.getPartText("word/settings.xml");
    if (!xml) return;
  }
  const cur = /<w:displayBackgroundShape\b[^>]*?(?:\/>|>[\s\S]*?<\/w:displayBackgroundShape>)/.exec(xml);
  const isOn = !!cur && !/w:val="(?:0|false|off)"/.test(cur[0]);
  if (isOn === on) return;
  if (cur) xml = xml.slice(0, cur.index) + (on ? "<w:displayBackgroundShape/>" : "") + xml.slice(cur.index + cur[0].length);
  else {
    const root = parseXml(xml, { positions: true });
    if (root.cs === root.e) return;
    let at = root.cs;
    for (const k of childElements(root)) if (BEFORE_DISPLAY_BG.has(k.name)) at = Math.max(at, k.e);
    xml = xml.slice(0, at) + "<w:displayBackgroundShape/>" + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}
function ensureSettingsPart(pkg) {
  if (pkg.getPart("word/settings.xml")) return;
  pkg.setPartText("word/settings.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>');
  const relsPath = "word/_rels/document.xml.rels";
  const rels = pkg.getPartText(relsPath);
  if (rels && !/relationships\/settings"/.test(rels)) {
    pkg.setPartText(relsPath, rels.replace(
      "</Relationships>",
      '<Relationship Id="rIdWnSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>'
    ));
  }
  const ct = pkg.getPartText("[Content_Types].xml");
  if (ct && !ct.includes('PartName="/word/settings.xml"')) {
    pkg.setPartText("[Content_Types].xml", ct.replace(
      "</Types>",
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'
    ));
  }
}

// ../docx-core/src/watermark.ts
var SHAPETYPE_TEXT = '<v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype>';
var SHAPETYPE_PICTURE = '<v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/><v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/><v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/><v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/><v:f eqn="sum @10 21600 0"/></v:formulas><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype>';
var POS = "mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin";
var esc4 = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var ptv = (v) => `${Math.round(v * 100) / 100}pt`;
function watermarkRunXml(spec, box, ids, rid, vmlColor2 = (h) => `#${h.toLowerCase()}`) {
  const head = `<w:r><w:rPr><w:noProof/></w:rPr><w:pict w14:anchorId="${ids.anchorId}">`;
  if (spec.kind === "picture") {
    const fx = spec.washout ? ' gain="19661f" blacklevel="22938f"' : "";
    return `${head}${SHAPETYPE_PICTURE}<v:shape id="WordPictureWatermark${ids.n}" o:spid="_x0000_s${ids.spid}" type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:${ptv(box.widthPt)};height:${ptv(box.heightPt)};z-index:-251657216;${POS}" o:allowincell="f"><v:imagedata r:id="${rid ?? ""}" o:title="${esc4(spec.title)}"${fx}/><w10:wrap anchorx="margin" anchory="margin"/></v:shape></w:pict></w:r>`;
  }
  const rot = spec.layout === "diagonal" ? "rotation:315;" : "";
  const size = spec.sizePt ? `${Math.round(spec.sizePt * 100) / 100}pt` : "1pt";
  return `${head}${SHAPETYPE_TEXT}<v:shape id="PowerPlusWaterMarkObject${ids.n}" o:spid="_x0000_s${ids.spid}" type="#_x0000_t136" alt="" style="position:absolute;margin-left:0;margin-top:0;width:${ptv(box.widthPt)};height:${ptv(box.heightPt)};${rot}z-index:-251657216;mso-wrap-edited:f;mso-width-percent:0;mso-height-percent:0;${POS};mso-width-percent:0;mso-height-percent:0" o:allowincell="f" fillcolor="${vmlColor2(spec.color)}" stroked="f">${spec.semitransparent ? '<v:fill opacity=".5"/>' : ""}<v:textpath style="font-family:&quot;${esc4(spec.font)}&quot;;font-size:${size}" string="${esc4(spec.text)}"/><w10:wrap anchorx="margin" anchory="margin"/></v:shape></w:pict></w:r>`;
}
function isWatermarkXml(xml) {
  return !!xml && /\bid="(?:PowerPlusWaterMarkObject|WordPictureWatermark)\d*"/.test(xml);
}
var attr = (xml, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(xml);
  return m ? m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : void 0;
};
var styleProp = (style, k) => new RegExp(`(?:^|;)\\s*${k}\\s*:\\s*([^;]+)`).exec(style)?.[1]?.trim();
var ptOf = (v) => v ? parseFloat(v) * (v.endsWith("in") ? 72 : v.endsWith("cm") ? 72 / 2.54 : v.endsWith("mm") ? 72 / 25.4 : 1) : 0;
function readWatermarkXml(xml, color) {
  const shape = /<v:shape\b[^>]*\bid="(PowerPlusWaterMarkObject|WordPictureWatermark)\d*"[^>]*>[\s\S]*?<\/v:shape>/.exec(xml);
  if (!shape) return null;
  const tag = /<v:shape\b[^>]*>/.exec(shape[0])[0];
  const style = attr(tag, "style") ?? "";
  const widthPt = ptOf(styleProp(style, "width")), heightPt = ptOf(styleProp(style, "height"));
  if (shape[1] === "WordPictureWatermark") {
    const img = /<v:imagedata\b[^>]*>/.exec(shape[0])?.[0] ?? "";
    return { kind: "picture", rid: attr(img, "r:id") ?? "", title: attr(img, "o:title") ?? "", washout: /\bgain=/.test(img) || /\bblacklevel=/.test(img), widthPt, heightPt };
  }
  const tp = /<v:textpath\b[^>]*>/.exec(shape[0])?.[0] ?? "";
  const tps = attr(tp, "style") ?? "";
  const font = (styleProp(tps, "font-family") ?? "Calibri").replace(/^["']|["']$/g, "");
  const fs = parseFloat(styleProp(tps, "font-size") ?? "1");
  const fill = /<v:fill\b[^>]*>/.exec(shape[0])?.[0] ?? "";
  const op = attr(fill, "opacity");
  const rot = parseFloat(styleProp(style, "rotation") ?? "0");
  return {
    kind: "text",
    text: attr(tp, "string") ?? "",
    font,
    ...fs > 1 ? { sizePt: fs } : {},
    color: color(attr(tag, "fillcolor")) ?? "C0C0C0",
    semitransparent: !!op && (op.endsWith("f") ? parseInt(op, 10) / 65536 : parseFloat(op)) < 1,
    layout: rot && Math.round((rot % 180 + 180) % 180) !== 0 ? "diagonal" : "horizontal",
    widthPt,
    heightPt
  };
}
var DIAG_FIT = 466.55 / 468;
function autoTextBox(text, layout, contentWidthPt) {
  const n = Math.max(1, text.replace(/\s+/g, "").length);
  const aspect = n / 3;
  if (layout === "horizontal") return { widthPt: round2(contentWidthPt), heightPt: round2(contentWidthPt / aspect) };
  const h = DIAG_FIT * contentWidthPt * Math.SQRT2 / (aspect + 1);
  return { widthPt: round2(aspect * h), heightPt: round2(h) };
}
function explicitTextBox(advancePt, sizePt, lineFactor) {
  return { widthPt: Math.max(1, Math.round(advancePt)), heightPt: Math.max(1, Math.round(sizePt * lineFactor)) };
}
function pictureBox(naturalPt, scale, contentWidthPt) {
  if (naturalPt.w <= 0 || naturalPt.h <= 0) return { widthPt: contentWidthPt, heightPt: contentWidthPt };
  if (!scale) return { widthPt: round2(contentWidthPt), heightPt: round2(contentWidthPt * naturalPt.h / naturalPt.w) };
  return { widthPt: round2(naturalPt.w * scale / 100), heightPt: round2(naturalPt.h * scale / 100) };
}
var round2 = (v) => Math.round(v * 100) / 100;
var D = (aspectBox) => aspectBox;
var WATERMARK_GALLERY = [
  { id: "confidential1", category: "confidential", text: { pt: "CONFIDENCIAL", en: "CONFIDENTIAL" }, layout: "diagonal", box: { pt: [527.85, 131.95], en: D([527.85, 131.95]) } },
  { id: "confidential2", category: "confidential", text: { pt: "CONFIDENCIAL", en: "CONFIDENTIAL" }, layout: "horizontal", box: { pt: [468, 117], en: [468, 117] } },
  { id: "donotcopy1", category: "confidential", text: { pt: "N\xC3O COPIAR", en: "DO NOT COPY" }, layout: "diagonal", box: { pt: [494.9, 164.95], en: [494.9, 164.95] } },
  { id: "donotcopy2", category: "confidential", text: { pt: "N\xC3O COPIAR", en: "DO NOT COPY" }, layout: "horizontal", box: { pt: [467.95, 155.95], en: [467.95, 155.95] } },
  { id: "draft1", category: "disclaimers", text: { pt: "RASCUNHO", en: "DRAFT" }, layout: "diagonal", box: { pt: [412.4, 247.45], en: [412.4, 247.45] } },
  { id: "draft2", category: "disclaimers", text: { pt: "RASCUNHO", en: "DRAFT" }, layout: "horizontal", box: { pt: [468, 280.8], en: [468, 280.8] } },
  { id: "sample1", category: "disclaimers", text: { pt: "EXEMPLO", en: "SAMPLE" }, layout: "diagonal", box: { pt: [461.85, 197.95], en: [439.9, 219.95] } },
  { id: "sample2", category: "disclaimers", text: { pt: "EXEMPLO", en: "SAMPLE" }, layout: "horizontal", box: { pt: [467.95, 200.55], en: [468, 234] } },
  { id: "asap1", category: "urgent", text: { pt: "ASAP", en: "ASAP" }, layout: "diagonal", box: { pt: [377.05, 282.8], en: [377.05, 282.8] } },
  { id: "asap2", category: "urgent", text: { pt: "ASAP", en: "ASAP" }, layout: "horizontal", box: { pt: [468, 351], en: [468, 351] } },
  { id: "urgent1", category: "urgent", text: { pt: "URGENTE", en: "URGENT" }, layout: "diagonal", box: { pt: [439.9, 219.95], en: [439.9, 219.95] } },
  { id: "urgent2", category: "urgent", text: { pt: "URGENTE", en: "URGENT" }, layout: "horizontal", box: { pt: [468, 234], en: [468, 234] } }
];
var WATERMARK_TEXTS = {
  en: ["ASAP", "CONFIDENTIAL", "COPY", "DO NOT COPY", "DRAFT", "ORIGINAL", "PERSONAL", "SAMPLE", "TOP SECRET", "URGENT"],
  pt: ["ASAP", "CONFIDENCIAL", "C\xD3PIA", "EXEMPLO", "N\xC3O COPIAR", "ORIGINAL", "PESSOAL", "RASCUNHO", "ULTRASSECRETO", "URGENTE"]
};

// ../docx-core/src/hf-ops.ts
var HF_NS = 'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 wp14"';
function hfPartXml(kind, inner) {
  const tag = kind === "header" ? "w:hdr" : "w:ftr";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r
<${tag} ${HF_NS}>${inner}</${tag}>`;
}
function copyHfPartXml(xml, newId) {
  return xml.replace(/(<wp:docPr\b[^>]*?\bid=")(\d+)(")/g, (_m, a, _id, b) => `${a}${newId()}${b}`).replace(/\s(?:w14:paraId|w14:textId|wp14:anchorId|wp14:editId)="[0-9A-Fa-f]+"/g, "");
}
function dropUnusedHfParts(pkg, drop) {
  const relsPath = "word/_rels/document.xml.rels";
  let rels = pkg.getPartText(relsPath) ?? "";
  let ct = pkg.getPartText("[Content_Types].xml") ?? "";
  let changed = false;
  for (const m of [...rels.matchAll(/<Relationship\b[^>]*?\/>/g)]) {
    const tag = m[0];
    if (!/relationships\/(?:header|footer)"/.test(tag)) continue;
    const id = /\bId="([^"]+)"/.exec(tag)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];
    if (!id || !target || !drop.has(id)) continue;
    const path = `word/${target.replace(/^\.\//, "").replace(/^\/?word\//, "")}`;
    rels = rels.replace(tag, "");
    ct = ct.replace(new RegExp(`<Override PartName="/${path.replace(/[.]/g, "\\.")}"[^>]*/>`), "");
    pkg.removePart(path);
    pkg.removePart(`word/_rels/${path.split("/").pop()}.rels`);
    changed = true;
  }
  if (changed) {
    pkg.setPartText(relsPath, rels);
    if (ct) pkg.setPartText("[Content_Types].xml", ct);
  }
}
function pageNumberGroupIds(story) {
  const out = /* @__PURE__ */ new Set();
  const walk = (groups, inside) => {
    for (const g of groups) {
      const mine = inside || g.wrapOpen !== void 0 && /<w:docPartGallery\s+w:val="Page Numbers/.test(g.wrapOpen);
      if (mine) {
        for (const id of g.blocks) if (id) out.add(id);
      }
      if (g.inner) walk(g.inner, mine);
    }
  };
  if (story) walk(story.groups, false);
  return out;
}

// ../docx-core/src/serialize.ts
var esc5 = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var escAttr3 = (s) => esc5(s).replace(/"/g, "&quot;");
var mediaOut = [];
var drawingId = 0;
var active = null;
function drawingXml(run) {
  const img = run.image;
  const n = ++drawingId;
  const rid = `rIdWnImg${n}`;
  mediaOut.push({ rid, path: `word/media/wnimage${n}.${img.ext}`, data: img.data, ext: img.ext });
  const cx = Math.round(img.widthTwips * EMU_PER_TWIP2);
  const cy = Math.round(img.heightTwips * EMU_PER_TWIP2);
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Imagem ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="Imagem ${n}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}
var REL_PACKAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package";
var OLE_MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};
function oleObjectXml(run) {
  const img = run.image, ole = img.ole;
  const n = ++drawingId;
  const ridImg = `rIdWnImg${n}`, ridOle = `rIdWnOle${n}`;
  mediaOut.push({ rid: ridImg, path: `word/media/wnimage${n}.${img.ext}`, data: img.data, ext: img.ext });
  mediaOut.push({ rid: ridOle, path: `word/embeddings/wnobject${n}.${ole.ext}`, data: ole.data, ext: ole.ext, relType: REL_PACKAGE, mime: OLE_MIME[ole.ext] ?? "application/octet-stream" });
  const w = Math.round(img.widthTwips / 2) / 10, h = Math.round(img.heightTwips / 2) / 10;
  const shape = `_x0000_i${1025 + n}`;
  const objId = `_${String(18e8 + n * 7919).slice(0, 10)}`;
  return `<w:object xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" w:dxaOrig="${Math.round(img.widthTwips)}" w:dyaOrig="${Math.round(img.heightTwips)}"><v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/><v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/><v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/><v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/><v:f eqn="sum @10 21600 0"/></v:formulas><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype><v:shape id="${shape}" type="#_x0000_t75" style="width:${w}pt;height:${h}pt" o:ole=""><v:imagedata r:id="${ridImg}" o:title=""/></v:shape><o:OLEObject Type="Embed" ProgID="${escAttr3(ole.progId)}" ShapeID="${shape}" DrawAspect="Content" ObjectID="${objId}" r:id="${ridOle}"/></w:object>`;
}
function patchDrawingGeometry(raw, obj) {
  const cx = Math.round(obj.widthTwips * EMU_PER_TWIP2);
  const cy = Math.round(obj.heightTwips * EMU_PER_TWIP2);
  let out = raw.replace(/<wp:extent\b[^>]*\/>/, (m) => m.replace(/cx="\d+"/, `cx="${cx}"`).replace(/cy="\d+"/, `cy="${cy}"`)).replace(/<a:ext\b[^>]*\/>/g, (m) => m.replace(/cx="\d+"/, `cx="${cx}"`).replace(/cy="\d+"/, `cy="${cy}"`));
  if (obj.offsetXTwips !== void 0) {
    const ex = Math.round(obj.offsetXTwips * EMU_PER_TWIP2);
    out = out.replace(/<wp:positionH\b[^>]*>[\s\S]*?<\/wp:positionH>/, (b) => b.replace(/(<wp:posOffset>)-?\d+(<\/wp:posOffset>)/, `$1${ex}$2`));
  }
  if (obj.offsetYTwips !== void 0) {
    const ey = Math.round(obj.offsetYTwips * EMU_PER_TWIP2);
    out = out.replace(/<wp:positionV\b[^>]*>[\s\S]*?<\/wp:positionV>/, (b) => b.replace(/(<wp:posOffset>)-?\d+(<\/wp:posOffset>)/, `$1${ey}$2`));
  }
  return out;
}
var REL_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
var REL_HDPHOTO = "http://schemas.microsoft.com/office/2007/relationships/hdphoto";
var MEDIA_MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff", emf: "image/x-emf", wmf: "image/x-wmf", svg: "image/svg+xml", wdp: "image/vnd.ms-photo" };
function mediaRelId(data, ext, relType = REL_IMAGE) {
  if (!active) {
    const n2 = ++drawingId;
    const rid = `rIdWnImg${n2}`;
    mediaOut.push({ rid, path: `word/media/wnimage${n2}.${ext}`, data, ext, ...relType !== REL_IMAGE ? { relType } : {} });
    return rid;
  }
  const { pkg, relsPath } = active;
  let rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const same2 = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i2 = 0; i2 < a.length; i2 += 509) if (a[i2] !== b[i2]) return false;
    return a[a.length - 1] === b[b.length - 1];
  };
  let part = pkg.partNames().find((p) => p.startsWith("word/media/") && same2(pkg.getPart(p), data));
  if (!part) {
    let n2 = 1;
    while (pkg.getPart(`word/media/uwimage${n2}.${ext}`)) n2++;
    part = `word/media/uwimage${n2}.${ext}`;
    pkg.setPart(part, data);
    let ct = pkg.getPartText("[Content_Types].xml") ?? "";
    const e = part.slice(part.lastIndexOf(".") + 1);
    if (ct && !new RegExp(`Extension="${e}"`, "i").test(ct)) {
      ct = ct.replace("</Types>", () => `<Default Extension="${e}" ContentType="${MEDIA_MIME[e.toLowerCase()] ?? `image/${e}`}"/></Types>`);
      pkg.setPartText("[Content_Types].xml", ct);
    }
  }
  const target = /^word\/_rels\/[^/]+$/.test(relsPath) ? part.replace(/^word\//, "") : `/${part}`;
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (tag.includes(`Target="${target}"`) && tag.includes(`Type="${relType}"`)) return /\bId="([^"]+)"/.exec(tag)[1];
  }
  let n = 1;
  while (rels.includes(`Id="rIdUwImg${n}"`)) n++;
  const id = `rIdUwImg${n}`;
  rels = rels.replace("</Relationships>", () => `<Relationship Id="${id}" Type="${relType}" Target="${target}"/></Relationships>`);
  pkg.setPartText(relsPath, rels);
  return id;
}
function pictureXml(img, source) {
  let xml = patchDrawingGeometry(!img.edited && source ? source : img.rawDrawingXml, img);
  if (xml.includes('r:embed="uw:media"')) xml = xml.replace(/r:embed="uw:media"/g, () => `r:embed="${mediaRelId(img.data, img.ext)}"`);
  if (xml.includes('r:embed="uw:layer"') && img.layer) {
    const L = img.layer;
    xml = xml.replace(/r:embed="uw:layer"/g, () => `r:embed="${mediaRelId(L.data, L.ext, L.ext === "wdp" ? REL_HDPHOTO : REL_IMAGE)}"`);
  }
  return xml;
}
function txbxInner(tb) {
  const groups = active?.store.txbx.get(tb);
  if (groups && tb.blocks?.length) return groupsXml(groups, tb.blocks, active.store);
  return (tb.blocks?.length ? tb.blocks.map(blockXml) : tb.paras.map(paraXml)).join("");
}
function drawingWithParas(rawDrawingXml, paras, blocks, tb) {
  const inner = tb ? txbxInner(tb) : blocks?.length ? blocks.map(blockXml).join("") : paras.map(paraXml).join("");
  return rawDrawingXml.replace(
    /<w:txbxContent\b[^>]*>[\s\S]*?<\/w:txbxContent>/g,
    (m) => `${/^<w:txbxContent\b[^>]*>/.exec(m)[0]}${inner}</w:txbxContent>`
  );
}
var isObjectRun2 = (r) => !!(r.image || r.textbox || r.shape || r.group);
var shapeTheme = { dk1: "000000", lt1: "FFFFFF", dk2: "0E2841", lt2: "E8E8E8", accent1: "156082", accent2: "E97132", accent3: "196B24", accent4: "0F9ED5", accent5: "A02B93", accent6: "4EA72E", hlink: "467886", folHlink: "96607D" };
var chainNext = /* @__PURE__ */ new Map();
var vmlSpid = 4096;
var vmlOnly = false;
function shapeOut(drawing, inner, o, vml = false) {
  if (!vmlOnly && !vml) return textboxAlternateContent(drawing, inner, o);
  return vmlFallback(drawing, inner, o).replace(/^<mc:Fallback>/, "").replace(/<\/mc:Fallback>$/, "");
}
var docPrName = (raw) => raw ? /<wp:docPr\b[^>]*\bname="([^"]*)"/.exec(raw)?.[1] : void 0;
function beginShapeContext(blocks) {
  chainNext = /* @__PURE__ */ new Map();
  const heads = /* @__PURE__ */ new Map();
  const links = [];
  forEachTextbox(blocks, (tb) => {
    if (tb.link) links.push(tb);
    else if (tb.story !== void 0 && !heads.has(tb.story)) heads.set(tb.story, tb);
  });
  for (const [id, head] of heads) {
    const ms = [head, ...links.filter((l) => l.link.id === id).sort((a, b) => a.link.seq - b.link.seq)];
    for (let i2 = 0; i2 + 1 < ms.length; i2++) {
      const n = docPrName(ms[i2 + 1].rawDrawingXml);
      if (n) chainNext.set(ms[i2], n);
    }
  }
}
function shapeColor(c) {
  const base = c.kind === "srgbClr" ? c.val : c.kind === "prstClr" ? { black: "000000", white: "FFFFFF", red: "FF0000" }[c.val] ?? "000000" : c.kind === "sysClr" ? c.lastClr ?? (c.val === "window" ? "FFFFFF" : "000000") : shapeTheme[{ tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" }[c.val] ?? c.val] ?? "000000";
  let [r, g, b] = [0, 2, 4].map((i2) => parseInt(base.slice(i2, i2 + 2), 16) / 255);
  for (const [n, v0] of c.mods ?? []) {
    const v = v0 / 1e5;
    if (n === "shade") {
      r *= v;
      g *= v;
      b *= v;
    } else if (n === "tint") {
      r = 1 - (1 - r) * v;
      g = 1 - (1 - g) * v;
      b = 1 - (1 - b) * v;
    } else if (n === "lumMod" || n === "lumOff") {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      let l = (mx + mn) / 2;
      const d = mx - mn;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let hh = d === 0 ? 0 : mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh = (hh * 60 + 360) % 360;
      l = n === "lumMod" ? l * v : Math.min(1, l + v);
      const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(hh / 60 % 2 - 1)), m = l - C / 2;
      const [a1, b1, c1] = hh < 60 ? [C, X, 0] : hh < 120 ? [X, C, 0] : hh < 180 ? [0, C, X] : hh < 240 ? [0, X, C] : hh < 300 ? [X, 0, C] : [C, 0, X];
      [r, g, b] = [a1 + m, b1 + m, c1 + m];
    }
  }
  return [r, g, b].map((x2) => Math.round(Math.max(0, Math.min(1, x2)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function editedShapeXml(run) {
  const tb = run.textbox;
  if (tb?.rawDrawingXml) {
    const inner = tb.link ? "" : txbxInner(tb);
    const raw = fillMedia(tb.rawDrawingXml, tb.shape);
    const drawing = tb.link ? patchDrawingGeometry(raw, tb) : drawingWithParas(patchDrawingGeometry(raw, tb), tb.paras, tb.blocks, tb);
    const next = chainNext.get(tb);
    return shapeOut(drawing, inner || (tb.link ? "" : "<w:p/>"), { color: shapeColor, spid: ++vmlSpid, ...next ? { next } : {} }, !!tb.vml);
  }
  const sh = run.shape;
  if (sh?.rawDrawingXml) return shapeOut(fillMedia(sh.rawDrawingXml, sh.style), "", { color: shapeColor, spid: ++vmlSpid });
  return "";
}
function fillMedia(raw, st) {
  const img = st?.blip?.image;
  if (!img || !raw.includes('r:embed="uw:fill"')) return raw;
  const rid = mediaRelId(img.data, img.ext);
  return raw.replace(/r:embed="uw:fill"/g, () => `r:embed="${rid}"`);
}
var emittedShapes = /* @__PURE__ */ new WeakSet();
function onceShape(obj, xml) {
  if (emittedShapes.has(obj)) return freshDrawingIds(xml);
  emittedShapes.add(obj);
  return xml;
}
function editedGroupXml(srcObj, raw) {
  let xml = srcObj.replace(/<w:drawing\b[\s\S]*?<\/w:drawing>/, () => raw);
  if (!/<mc:AlternateContent\b/.test(xml)) return raw;
  const name = docPrName(raw);
  const hidden = /<wp:docPr\b[^>]*\bhidden="1"/.test(raw);
  const rh = /\brelativeHeight="(\d+)"/.exec(raw)?.[1];
  const behind = /\bbehindDoc="1"/.test(raw);
  xml = xml.replace(/<v:group\b[^>]*>/, (tag) => {
    let t = tag;
    if (name) t = /\sid="[^"]*"/.test(t) ? t.replace(/\sid="[^"]*"/, () => ` id="${escAttr3(name)}"`) : t.replace(/^<v:group/, () => `<v:group id="${escAttr3(name)}"`);
    t = t.replace(/style="([^"]*)"/, (_m, st) => {
      let s = st.replace(/;?visibility:[^;]*/g, "");
      s += `;visibility:${hidden ? "hidden" : "visible"}`;
      if (rh) s = s.replace(/z-index:-?\d+/, `z-index:${behind ? -(Number(rh) - 2048) : rh}`);
      return `style="${s.replace(/^;/, "")}"`;
    });
    return t;
  });
  return xml;
}
function objectXml(run) {
  const lossless = active;
  const sid = run.props.src;
  const src = sid !== void 0 ? lossless.store.runs.get(sid) : void 0;
  const headSid = src?.obj !== void 0 ? sid : src?.objHead;
  const head = headSid !== void 0 ? lossless.store.runs.get(headSid) : void 0;
  const rpr = rPrXml(run);
  const wps = run.textbox?.edited && run.textbox.rawDrawingXml ? run.textbox : run.shape?.edited && run.shape.rawDrawingXml ? run.shape : null;
  if (wps) {
    if (head?.obj && headSid !== void 0) lossless.emittedObj.add(headSid);
    return `<w:r>${rpr}${onceShape(wps, editedShapeXml(run))}</w:r>`;
  }
  if (run.group?.edited && run.group.rawDrawingXml && head?.obj && headSid !== void 0) {
    const xml2 = editedGroupXml(head.obj, run.group.rawDrawingXml);
    const out = lossless.emittedObj.has(headSid) ? freshDrawingIds(xml2) : xml2;
    lossless.emittedObj.add(headSid);
    return `<w:r>${rpr}${out}</w:r>`;
  }
  if (!head?.obj) {
    if (run.image?.ole && !run.image.rawDrawingXml) return `<w:r>${rpr}${oleObjectXml(run)}</w:r>`;
    if (run.image?.rawDrawingXml) return `<w:r>${rpr}${pictureXml(run.image)}</w:r>`;
    if (run.image) return `<w:r>${drawingXml(run)}</w:r>`;
    if (run.textbox?.rawDrawingXml) {
      if (run.textbox.vml) return `<w:r>${rpr}${onceShape(run.textbox, editedShapeXml(run))}</w:r>`;
      return `<w:r>${rpr}${drawingWithParas(patchDrawingGeometry(run.textbox.rawDrawingXml, run.textbox), run.textbox.paras, run.textbox.blocks, run.textbox)}</w:r>`;
    }
    return run.textbox ? "" : void 0;
  }
  const runs = lossless.paraRuns;
  const idx = runs.indexOf(run);
  const isMember = (r) => isObjectRun2(r) && r.props.src !== void 0 && lossless.store.runs.get(r.props.src)?.objHead === headSid;
  if (idx >= 0 && src?.objHead !== void 0) {
    let k = idx - 1;
    while (k >= 0 && isMember(runs[k])) k--;
    if (k >= 0 && runs[k].props.src === headSid && isObjectRun2(runs[k])) return "";
    if (k !== idx - 1) return "";
  }
  const members = [run];
  for (let k = idx + 1; idx >= 0 && k < runs.length && isMember(runs[k]); k++) members.push(runs[k]);
  let xml = head.obj;
  const boxes = members.flatMap((r) => r.textbox ? [r.textbox] : (r.group?.items ?? []).flatMap((it) => it.run.textbox ? [it.run.textbox] : []));
  if (boxes.length) {
    const inners = boxes.map((b) => txbxInner(b));
    const total = (xml.match(/<w:txbxContent\b/g) ?? []).length;
    const pick = boxes.length === 1 ? () => 0 : total === boxes.length || total === 2 * boxes.length ? (k) => k % boxes.length : null;
    if (pick) {
      let k = 0;
      xml = xml.replace(/<w:txbxContent\b[^>]*>[\s\S]*?<\/w:txbxContent>/g, (m) => `${/^<w:txbxContent\b[^>]*>/.exec(m)[0]}${inners[pick(k++)]}</w:txbxContent>`);
    }
  }
  const geo = members.length <= 1 ? run.image ?? run.textbox : void 0;
  if (geo && run.image?.rawDrawingXml) xml = pictureXml(run.image, xml);
  else if (geo) xml = patchDrawingGeometry(xml, geo);
  if (lossless.emittedObj.has(headSid)) xml = freshDrawingIds(xml);
  lossless.emittedObj.add(headSid);
  return `<w:r>${rpr}${xml}</w:r>`;
}
var freshId = 0;
function freshDrawingIds(xml) {
  return xml.replace(/(<wp:docPr\b[^>]*?\bid=")\d+"/g, (_m, a) => `${a}${9e5 + ++freshId}"`).replace(/\s(?:wp14:anchorId|wp14:editId|o:spid)="[^"]*"/g, "");
}
function rPrXml(run) {
  const sid = run.props.src;
  const src = active && sid !== void 0 ? active.store.runs.get(sid) : void 0;
  return src ? patchRPr(src.rPr, run) : rPrFromProps(run.props, active !== null);
}
function textXml(text, deleted = false) {
  const t = deleted ? "w:delText" : "w:t";
  const parts = [];
  for (const seg of text.split(/(\t|\n|\f|\u000B|\u2011|\u00AD|\u2028)/)) {
    if (seg === "	") parts.push("<w:tab/>");
    else if (seg === "\n") parts.push("<w:br/>");
    else if (seg === "\f") parts.push('<w:br w:type="page"/>');
    else if (seg === "\v") parts.push('<w:br w:type="column"/>');
    else if (seg === "\u2011") parts.push("<w:noBreakHyphen/>");
    else if (seg === "\xAD") parts.push("<w:softHyphen/>");
    else if (seg === "\u2028") parts.push('<w:br w:clear="all"/>');
    else if (seg.length > 0) {
      const space = seg !== seg.trim() ? ' xml:space="preserve"' : "";
      parts.push(`<${t}${space}>${esc5(seg)}</${t}>`);
    }
  }
  return parts.join("");
}
var fldCharXml = (rpr, type) => `<w:r>${rpr}<w:fldChar w:fldCharType="${type}"/></w:r>`;
function markXml2(run) {
  if (run.bookmark) {
    const b = run.bookmark;
    return b.end ? `<w:bookmarkEnd w:id="${b.id}"/>` : `<w:bookmarkStart w:id="${b.id}" w:name="${escAttr3(b.name)}"/>`;
  }
  if (run.fieldBegin !== void 0) {
    const rpr = rPrXml(run);
    return fldCharXml(rpr, "begin") + `<w:r>${rpr}<w:instrText xml:space="preserve">${esc5(run.fieldBegin)}</w:instrText></w:r>` + fldCharXml(rpr, "separate");
  }
  if (run.fieldEnd) return fldCharXml(rPrXml(run), "end");
  return void 0;
}
function runXml(run) {
  const mark = markXml2(run);
  if (mark !== void 0) return mark;
  if (run.custom) {
    const type = run.custom.type;
    if (!/^[a-zA-Z0-9._-]+$/.test(type)) {
      throw new Error(`tipo de inline customizado inv\xE1lido: ${type}`);
    }
    const json2 = JSON.stringify(run.custom.data);
    if (json2 === void 0) throw new Error(`dados do inline "${type}" n\xE3o s\xE3o serializ\xE1veis em JSON`);
    const tag = `wordnext:inline:${type}:${encodeURIComponent(json2)}`;
    const fallbackRun = {
      text: run.custom.fallbackText,
      props: run.props
    };
    return `<w:sdt><w:sdtPr><w:alias w:val="${escAttr3(run.custom.fallbackText)}"/><w:tag w:val="${escAttr3(tag)}"/><w:lock w:val="sdtLocked"/></w:sdtPr><w:sdtContent>${runXml(fallbackRun)}</w:sdtContent></w:sdt>`;
  }
  if (active && (run.image || run.textbox || run.shape || run.group)) {
    const x2 = objectXml(run);
    if (x2 !== void 0) return x2;
  }
  if (run.image) {
    if (run.image.rawDrawingXml) {
      return `<w:r>${pictureXml(run.image)}</w:r>`;
    }
    if (run.image.ole) return `<w:r>${oleObjectXml(run)}</w:r>`;
    return `<w:r>${drawingXml(run)}</w:r>`;
  }
  if (run.textbox?.edited && run.textbox.rawDrawingXml || run.shape?.edited && run.shape.rawDrawingXml) {
    return `<w:r>${rPrXml(run)}${onceShape(run.textbox ?? run.shape, editedShapeXml(run))}</w:r>`;
  }
  if (run.textbox) {
    if (run.textbox.rawDrawingXml && run.textbox.vml) return `<w:r>${rPrXml(run)}${onceShape(run.textbox, editedShapeXml(run))}</w:r>`;
    if (run.textbox.rawDrawingXml) {
      const geo = patchDrawingGeometry(run.textbox.rawDrawingXml, run.textbox);
      return `<w:r>${drawingWithParas(geo, run.textbox.paras)}</w:r>`;
    }
    return "";
  }
  const rpr = rPrXml(run);
  if (run.noteRef) {
    const tag = run.noteRef.kind === "footnote" ? "w:footnoteReference" : "w:endnoteReference";
    const r = rpr || '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr>';
    return `<w:r>${r}<${tag}${run.noteRef.custom ? ' w:customMarkFollows="1"' : ""} w:id="${run.noteRef.id}"/></w:r>`;
  }
  if (run.field && (run.text === "" || run.text === NOTE_REF_TEXT) && /^\s*(FOOTNOTE|ENDNOTE)REF_MARK\s*$/.test(run.field)) {
    return `<w:r>${rpr}<w:${run.field.includes("FOOTNOTE") ? "footnoteRef" : "endnoteRef"}/></w:r>`;
  }
  if (active && run.ptab) {
    const t = run.ptab;
    return `<w:r>${rpr}<w:ptab w:relativeTo="${escAttr3(t.relativeTo)}" w:alignment="${escAttr3(t.alignment)}"${t.leader ? ` w:leader="${escAttr3(t.leader)}"` : ""}/></w:r>`;
  }
  if (active && run.symFont && run.text.length === 1) {
    const code = run.text.charCodeAt(0);
    const hex2 = (code >= 61440 && code <= 61695 ? code & 255 : code).toString(16).toUpperCase().padStart(4, "0");
    return `<w:r>${rpr}<w:sym w:font="${escAttr3(run.symFont)}" w:char="${hex2}"/></w:r>`;
  }
  if (active && (run.math || run.props.isMath)) {
    return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>${esc5(run.text)}</m:t></m:r></m:oMath>`;
  }
  return `<w:r>${rpr}${textXml(run.text, !!run.props.del)}</w:r>`;
}
function fieldOrRunXml(r) {
  if (!r.field || active && /^\s*(FOOTNOTE|ENDNOTE)REF_MARK\s*$/.test(r.field)) return runXml(r);
  if (!r.props.ins && !r.props.del) {
    if (/^\s*=/.test(r.field)) return formulaFieldXml(r);
    if (/^\s*(TC|XE|RD)\b/i.test(r.field) && !r.text && !r.fieldResult?.length) {
      const rpr2 = rPrXml(r);
      return fldCharXml(rpr2, "begin") + `<w:r>${rpr2}<w:instrText xml:space="preserve">${esc5(r.field)}</w:instrText></w:r>` + fldCharXml(rpr2, "end");
    }
    const result = fieldResultXml(r);
    if (/\\h\b/i.test(r.field) || r.props.src === void 0 && (r.fieldResult?.length ?? 0) > 1) {
      const rpr2 = rPrXml(r);
      return fldCharXml(rpr2, "begin") + `<w:r>${rpr2}<w:instrText xml:space="preserve">${esc5(r.field)}</w:instrText></w:r>` + fldCharXml(rpr2, "separate") + result + fldCharXml(rpr2, "end");
    }
    return `<w:fldSimple w:instr="${escAttr3(r.field)}">${result}</w:fldSimple>`;
  }
  const rpr = rPrXml(r);
  const ch = (type) => `<w:r>${rpr}<w:fldChar w:fldCharType="${type}"/></w:r>`;
  const it = r.props.del ? "w:delInstrText" : "w:instrText";
  return ch("begin") + `<w:r>${rpr}<${it} xml:space="preserve">${esc5(r.field)}</${it}></w:r>` + ch("separate") + runXml(r) + ch("end");
}
function fieldResultXml(r) {
  if (r.props.src !== void 0 || !r.fieldResult?.length) return runXml(r);
  return r.fieldResult.map((x2) => runXml(x2)).join("");
}
var revKey = (r) => JSON.stringify(r ?? null);
function revisionRuns(items) {
  const plain2 = (xs) => xs.map((it) => it.before + fieldOrRunXml(it.run) + it.after).join("");
  const dels = (xs) => {
    let out2 = "";
    for (let i2 = 0; i2 < xs.length; ) {
      const d = xs[i2].run.props.del;
      let j = i2 + 1;
      while (j < xs.length && revKey(xs[j].run.props.del) === revKey(d)) j++;
      out2 += d ? wrapRevision("del", d, plain2(xs.slice(i2, j))) : plain2(xs.slice(i2, j));
      i2 = j;
    }
    return out2;
  };
  let out = "";
  for (let i2 = 0; i2 < items.length; ) {
    const ins = items[i2].run.props.ins;
    let j = i2 + 1;
    while (j < items.length && revKey(items[j].run.props.ins) === revKey(ins)) j++;
    out += ins ? wrapRevision("ins", ins, dels(items.slice(i2, j))) : dels(items.slice(i2, j));
    i2 = j;
  }
  return out;
}
function formulaFieldXml(r) {
  const rpr = rPrXml(r);
  const wrap = (inner, pr = rpr) => `<w:r>${pr}${inner}</w:r>`;
  return wrap('<w:fldChar w:fldCharType="begin"/>') + wrap(`<w:instrText xml:space="preserve">${esc5(r.field)}</w:instrText>`) + wrap('<w:fldChar w:fldCharType="separate"/>') + wrap(textXml(r.text), withNoProof(rpr)) + wrap('<w:fldChar w:fldCharType="end"/>');
}
function withNoProof(rpr) {
  if (!rpr || rpr === "<w:rPr/>") return "<w:rPr><w:noProof/></w:rPr>";
  if (/<w:noProof\b/.test(rpr)) return rpr;
  const m = /<w:(snapToGrid|vanish|webHidden|color|spacing|w|kern|position|sz|szCs|highlight|u|effect|bdr|shd|fitText|vertAlign|rtl|cs|em|lang|eastAsianLayout|specVanish|oMath|rPrChange)\b/.exec(rpr);
  const at = m ? m.index : rpr.lastIndexOf("</w:rPr>");
  return rpr.slice(0, at) + "<w:noProof/>" + rpr.slice(at);
}
function linkRelId(url) {
  if (!active) return void 0;
  const { pkg, relsPath } = active;
  let rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (/TargetMode="External"/.test(tag) && /\/hyperlink"/.test(tag) && tag.includes(`Target="${escAttr3(url)}"`)) {
      return /\bId="([^"]+)"/.exec(tag)?.[1];
    }
  }
  let n = 1;
  while (rels.includes(`Id="rIdWnLink${n}"`)) n++;
  const id = `rIdWnLink${n}`;
  rels = rels.replace(
    "</Relationships>",
    `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escAttr3(url)}" TargetMode="External"/></Relationships>`
  );
  pkg.setPartText(relsPath, rels);
  return id;
}
function genRuns(items, inWrapper = false) {
  const out = [];
  let i2 = 0;
  while (i2 < items.length) {
    const link = active && !inWrapper ? items[i2].run.props.link : void 0;
    if (!link) {
      let j2 = i2 + 1;
      while (j2 < items.length && !(active && !inWrapper && items[j2].run.props.link)) j2++;
      out.push(revisionRuns(items.slice(i2, j2)));
      i2 = j2;
      continue;
    }
    let j = i2;
    const sameLink = (k) => {
      for (let m = k; m < items.length; m++) {
        if (items[m].run.props.link === link) return true;
        if (!isMarkRun(items[m].run)) return false;
      }
      return false;
    };
    while (j < items.length && sameLink(j)) j++;
    const inner = revisionRuns(items.slice(i2, j));
    const tip = items[i2].run.props.linkTip;
    const attr2 = link.startsWith("#") ? ` w:anchor="${escAttr3(link.slice(1))}"` : (() => {
      const id = linkRelId(link);
      return id ? ` r:id="${id}"` : "";
    })();
    out.push(attr2 ? `<w:hyperlink${attr2}${tip ? ` w:tooltip="${escAttr3(tip)}"` : ""} w:history="1">${inner}</w:hyperlink>` : inner);
    i2 = j;
  }
  return out.join("");
}
function commentMarks(runs, skip) {
  const firstOf = /* @__PURE__ */ new Map();
  const lastOf = /* @__PURE__ */ new Map();
  runs.forEach((r, i2) => {
    for (const id of r.props.commentIds ?? []) {
      if (skip?.has(id)) continue;
      if (!firstOf.has(id)) firstOf.set(id, i2);
      lastOf.set(id, i2);
    }
  });
  const before = runs.map(() => "");
  const after = runs.map(() => "");
  for (const [id, i2] of firstOf) before[i2] += `<w:commentRangeStart w:id="${id}"/>`;
  for (const [id, i2] of lastOf) {
    after[i2] += `<w:commentRangeEnd w:id="${id}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`;
  }
  return { before, after };
}
var isAtomic = (r) => !!(r.shape || r.group || r.math || r.props.isMath || r.formField || r.image && !r.image.rawDrawingXml);
function runsLossless(para, src, pid, last) {
  const lossless = active;
  const store = lossless.store;
  const segs = src.segs;
  const cur = para.runs;
  const where = /* @__PURE__ */ new Map();
  segs.forEach((g, gi) => g.sids.forEach((sid, k) => where.set(sid, [gi, k])));
  const base = /* @__PURE__ */ new Map();
  src.sig?.sids.forEach((sid, i2) => base.set(sid, src.sig.runs[i2]));
  const orig = /* @__PURE__ */ new Map();
  for (const r of cur) {
    const sid = r.props.src;
    if (sid !== void 0 && !orig.has(sid) && base.get(sid) === runSig(r)) orig.set(sid, r);
  }
  const intact = (r) => r.props.src !== void 0 && orig.get(r.props.src) === r;
  const segKey = (gi) => `${pid}:${gi}`;
  const taken = (gi) => lossless.claimedSegs.has(segKey(gi));
  const take = (gi) => {
    lossless.claimedSegs.add(segKey(gi));
  };
  const marks = commentMarks(cur, store.commentIds);
  let out = "";
  let pending = [];
  const flushGen = () => {
    if (pending.length) {
      out += genRuns(pending);
      pending = [];
    }
  };
  let zp = 0;
  const flushZero = (upTo) => {
    for (; zp < upTo; zp++) {
      const g = segs[zp];
      if (g.sids.length === 0 && !taken(zp)) {
        take(zp);
        flushGen();
        out += g.raw;
      }
    }
  };
  const firstAtomic = /* @__PURE__ */ new Map();
  for (const r of cur) if (r.props.src !== void 0 && isAtomic(r) && !firstAtomic.has(r.props.src)) firstAtomic.set(r.props.src, r);
  const markObjects = (g) => {
    for (const sid of g.sids) if (store.runs.get(sid)?.obj !== void 0) lossless.emittedObj.add(sid);
  };
  for (let i2 = 0; i2 < cur.length; ) {
    const r = cur[i2];
    const loc = r.props.src !== void 0 ? where.get(r.props.src) : void 0;
    if (loc && segs[loc[0]].open) {
      if (!taken(loc[0])) {
        flushZero(loc[0]);
        flushGen();
        out += marks.before[i2] + segs[loc[0]].raw;
        take(loc[0]);
        zp = Math.max(zp, loc[0] + 1);
      }
      i2++;
      continue;
    }
    if (loc && loc[0] >= zp && !taken(loc[0])) {
      const g = segs[loc[0]];
      let ok = loc[1] === 0 && i2 + g.sids.length <= cur.length;
      for (let k = 0; ok && k < g.sids.length; k++) ok = cur[i2 + k].props.src === g.sids[k] && intact(cur[i2 + k]);
      const fallback = !ok && g.sids.length === 1 && isAtomic(r) && firstAtomic.get(r.props.src) === r && !(isObjectRun2(r) && store.runs.get(r.props.src)?.obj !== void 0);
      if (ok || fallback) {
        flushZero(loc[0]);
        flushGen();
        const n = g.sids.length;
        out += marks.before[i2] + g.raw + marks.after[i2 + n - 1];
        markObjects(g);
        take(loc[0]);
        zp = loc[0] + 1;
        i2 += n;
        continue;
      }
      flushZero(loc[0]);
      const sameWrap = (x2) => g.link === void 0 || x2.props.link === g.link && (x2.props.linkTip ?? "") === (g.tip ?? "");
      if (g.wrapOpen !== void 0 && sameWrap(r)) {
        const own2 = new Set(g.sids);
        let j = i2;
        while (j < cur.length && cur[j].props.src !== void 0 && own2.has(cur[j].props.src) && sameWrap(cur[j])) j++;
        flushGen();
        out += g.wrapOpen + genRuns(cur.slice(i2, j).map((run, k) => ({ run, before: marks.before[i2 + k], after: marks.after[i2 + k] })), g.link !== void 0) + g.wrapClose;
        take(loc[0]);
        zp = loc[0] + 1;
        i2 = j;
        continue;
      }
    }
    pending.push({ run: r, before: marks.before[i2], after: marks.after[i2] });
    i2++;
  }
  flushGen();
  if (last) flushZero(segs.length);
  return out;
}
function paraSectPr(para, rawPPr) {
  const rawSect = rawPPr ? splitElement(rawPPr).kids.find((k) => k.name === "w:sectPr")?.raw : void 0;
  const sb = para.props.sectionBreak;
  if (!sb) return rawSect ? null : void 0;
  return sectionBreakXml(sb, rawSect);
}
function sectionBreakXml(sb, rawSect) {
  const refs = [...sb.headerRefs, ...sb.footerRefs];
  const base = rawSect ?? sb.raw;
  return base ? patchSectPr(base, sb.sectPr, refs) : `<w:sectPr>${sectPrInner(sb.sectPr, refs)}</w:sectPr>`;
}
function paraXml(para) {
  if (!active) return paraXmlRuns(para);
  const prev = active.paraRuns;
  active.paraRuns = para.runs;
  try {
    return paraXmlRuns(para);
  } finally {
    active.paraRuns = prev;
  }
}
function paraXmlRuns(para) {
  const src = active && para.props.src !== void 0 ? active.store.paras.get(para.props.src) : void 0;
  if (!active || !src) {
    const marks = commentMarks(para.runs, active?.store.commentIds);
    const items = para.runs.map((run, i2) => ({ run, before: marks.before[i2], after: marks.after[i2] }));
    if (!active) return paraXmlInner(para, revisionRuns(items));
    const fmt = para.props.fmtSrc !== void 0 ? active.store.paras.get(para.props.fmtSrc) : void 0;
    if (fmt) {
      const ppr3 = patchPPr(fmt.pPr, para, paraSectPr(para, fmt.pPr), active.numIds);
      if (ppr3.genNumbering) active.genNumbering = true;
      return `<w:p>${ppr3.xml}${genRuns(items)}</w:p>`;
    }
    const ppr2 = pPrFromProps(para.props, para.props.sectionBreak ? sectionBreakXml(para.props.sectionBreak) : "", active.numIds);
    if (ppr2.genNumbering) active.genNumbering = true;
    return `<w:p>${ppr2.xml}${genRuns(items)}</w:p>`;
  }
  const id = para.props.src;
  const first = !active.claimed.has(id);
  active.claimed.add(id);
  const left = (active.remaining.get(id) ?? 1) - 1;
  active.remaining.set(id, left);
  const last = left <= 0;
  if (first && last && active.store.pristine(para)) return src.raw;
  const ppr = patchPPr(src.pPr, para, paraSectPr(para, src.pPr), active.numIds);
  if (ppr.genNumbering) active.genNumbering = true;
  return `${first ? src.open : "<w:p>"}${ppr.xml}${runsLossless(para, src, id, last)}</w:p>`;
}
function paraXmlInner(para, runsXml) {
  const pp = para.props;
  const ppr = [];
  if (pp.styleId) ppr.push(`<w:pStyle w:val="${escAttr3(pp.styleId)}"/>`);
  const flag = (name, v) => {
    if (v !== void 0) ppr.push(v ? `<${name}/>` : `<${name} w:val="0"/>`);
  };
  flag("w:keepNext", pp.keepNext);
  flag("w:keepLines", pp.keepLines);
  if (pp.sectionBreak) {
    const refs = [...pp.sectionBreak.headerRefs, ...pp.sectionBreak.footerRefs];
    ppr.push(`<w:sectPr>${sectPrInner(pp.sectionBreak.sectPr, refs)}</w:sectPr>`);
  }
  flag("w:pageBreakBefore", pp.pageBreakBefore);
  flag("w:widowControl", pp.widowControl);
  if (pp.tabStops?.length) {
    ppr.push("<w:tabs>" + pp.tabStops.map(
      (t) => `<w:tab w:val="${t.align}"${t.leader ? ` w:leader="${t.leader}"` : ""} w:pos="${t.posTwips}"/>`
    ).join("") + "</w:tabs>");
  }
  if (pp.numbering) {
    const numId = pp.numbering.kind === "decimal" ? 1002 : 1001;
    ppr.push(`<w:numPr><w:ilvl w:val="${pp.numbering.ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
  }
  flag("w:suppressLineNumbers", pp.suppressLineNumbers);
  if (pp.borders) {
    let inner2 = "";
    for (const side of ["top", "left", "bottom", "right"]) {
      const e = pp.borders[side];
      if (!e) continue;
      inner2 += `<w:${side} w:val="${escAttr3(e.style)}" w:sz="${e.sizeEighthPt}" w:space="${e.spacePt}" w:color="${e.color ? escAttr3(e.color) : "auto"}"/>`;
    }
    if (inner2) ppr.push(`<w:pBdr>${inner2}</w:pBdr>`);
  } else if (pp.boxBorder) {
    const b = '<w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>';
    ppr.push(
      "<w:pBdr>" + b.replace("w:bottom", "w:top") + b.replace("w:bottom", "w:left") + b + b.replace("w:bottom", "w:right") + "</w:pBdr>"
    );
  }
  if (pp.shadingHex) {
    ppr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escAttr3(pp.shadingHex)}"/>`);
  }
  flag("w:suppressAutoHyphens", pp.suppressAutoHyphens);
  if (pp.lineTwentieths !== void 0 || pp.spaceAfterTwips !== void 0 || pp.spaceBeforeTwips !== void 0 || pp.spaceBeforeAuto !== void 0 || pp.spaceAfterAuto !== void 0) {
    const line = pp.lineTwentieths !== void 0 ? ` w:line="${pp.lineTwentieths}" w:lineRule="auto"` : "";
    const before = (pp.spaceBeforeTwips !== void 0 ? ` w:before="${pp.spaceBeforeTwips}"` : "") + (pp.spaceBeforeAuto !== void 0 ? ` w:beforeAutospacing="${pp.spaceBeforeAuto ? 1 : 0}"` : "");
    const after = (pp.spaceAfterTwips !== void 0 ? ` w:after="${pp.spaceAfterTwips}"` : "") + (pp.spaceAfterAuto !== void 0 ? ` w:afterAutospacing="${pp.spaceAfterAuto ? 1 : 0}"` : "");
    ppr.push(`<w:spacing${before}${after}${line}/>`);
  }
  if (pp.indentLeftTwips !== void 0 || pp.indentRightTwips !== void 0 || pp.indentFirstLineTwips !== void 0) {
    let attrs3 = "";
    if (pp.indentLeftTwips !== void 0) attrs3 += ` w:left="${pp.indentLeftTwips}"`;
    if (pp.indentRightTwips !== void 0) attrs3 += ` w:right="${pp.indentRightTwips}"`;
    if (pp.indentFirstLineTwips !== void 0) {
      attrs3 += pp.indentFirstLineTwips >= 0 ? ` w:firstLine="${pp.indentFirstLineTwips}"` : ` w:hanging="${-pp.indentFirstLineTwips}"`;
    }
    ppr.push(`<w:ind${attrs3}/>`);
  }
  if (pp.alignment && pp.alignment !== "left") ppr.push(`<w:jc w:val="${pp.alignment}"/>`);
  if (pp.textboxTightWrap) ppr.push(`<w:textboxTightWrap w:val="${pp.textboxTightWrap}"/>`);
  const mark = (pp.markIns ? markRevisionXml("ins", pp.markIns) : "") + (pp.markDel ? markRevisionXml("del", pp.markDel) : "");
  if (mark) ppr.push(`<w:rPr>${mark}</w:rPr>`);
  if (pp.pfmt) {
    const old = paraXmlInner({ runs: [], props: pp.pfmt.old }, "");
    const inner2 = /^<w:p><w:pPr>([\s\S]*)<\/w:pPr><\/w:p>$/.exec(old)?.[1] ?? "";
    ppr.push(`<w:pPrChange${revisionAttrs(pp.pfmt)}>${inner2 ? `<w:pPr>${inner2}</w:pPr>` : "<w:pPr/>"}</w:pPrChange>`);
  }
  const inner = (ppr.length ? `<w:pPr>${ppr.join("")}</w:pPr>` : "") + runsXml;
  return `<w:p>${inner}</w:p>`;
}
var W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
var W15_NS = ' xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"';
function sectPrInner(s, refs = []) {
  const refsXml = refs.map((h) => `<w:${h.kind}Reference w:type="${h.type}" r:id="${h.rid}"/>`).join("");
  const orient = s.pageWidthTwips > s.pageHeightTwips ? ' w:orient="landscape"' : "";
  const type = s.type && s.type !== "nextPage" ? `<w:type w:val="${s.type}"/>` : "";
  const cols = s.cols ? colsXml(s.cols) : "";
  const titlePg = s.titlePg ? "<w:titlePg/>" : "";
  const pgNumType = pgNumTypeXml(s) ?? "";
  const pgBorders = pgBordersXml(s.pgBorders) ?? "";
  const notes = notePropsXml("footnote", s.footnotePr) + notePropsXml("endnote", s.endnotePr);
  const fnCols = s.footnoteColumns ? `<w15:footnoteColumns w:val="${s.footnoteColumns}"/>` : "";
  const lnNum = s.lnNumType ? lnNumTypeXml(s.lnNumType) : "";
  const vAlign = s.vAlign ? `<w:vAlign w:val="${s.vAlign}"/>` : "";
  return `${refsXml}${notes}${type}<w:pgSz w:w="${s.pageWidthTwips}" w:h="${s.pageHeightTwips}"${orient}/><w:pgMar w:top="${s.marginTopTwips}" w:right="${s.marginRightTwips}" w:bottom="${s.marginBottomTwips}" w:left="${s.marginLeftTwips}" w:header="${s.headerDistanceTwips ?? 720}" w:footer="${s.footerDistanceTwips ?? 720}" w:gutter="0"/>${pgBorders}${lnNum}${pgNumType}${cols}${vAlign}${titlePg}${fnCols}`;
}
function borderXml2(tag, e) {
  return `<w:${tag} w:val="${escAttr3(e.style)}" w:sz="${e.sizeEighthPt}" w:space="0" w:color="${e.color ? escAttr3(e.color) : "auto"}"/>`;
}
function borderSetXml(wrap, b, sides) {
  let inner = "";
  for (const side of sides) {
    const e = b[side];
    if (e) inner += borderXml2(side, e);
  }
  return inner ? `<w:${wrap}>${inner}</w:${wrap}>` : "";
}
var TBL_SIDES = ["top", "left", "bottom", "right", "insideH", "insideV"];
var CELL_SIDES = ["top", "left", "bottom", "right"];
function cellBodyXml(cell) {
  if (cell.blocks?.length) return cell.blocks.map(blockXml).join("");
  return cell.paragraphs.length ? cell.paragraphs.map(paraXml).join("") + cell.tables.map(tableXml).join("") : "<w:p/>";
}
function tableXml(t) {
  const src = active && t.src !== void 0 ? active.store.tables.get(t.src) : void 0;
  if (active && src) {
    const owner = !active.claimed.has(t.src);
    active.claimed.add(t.src);
    if (owner && active.store.tablePristine(t)) return src.raw;
    const sameGrid = src.tblGrid !== void 0 && gridOf(src.tblGrid) === t.gridColsTwips.join(",");
    const tblPr = src.tblPr !== void 0 ? patchTblPr(src.tblPr, t.tblPr) : legacyOrTypedTblPr(t);
    return `${owner ? src.open : "<w:tbl>"}${tblPr}${sameGrid ? src.tblGrid : gridXml(t)}${rowsXml(t)}</w:tbl>`;
  }
  return `<w:tbl>${legacyOrTypedTblPr(t)}${gridXml(t)}${rowsXml(t)}</w:tbl>`;
}
function wrappedXml(items) {
  const stack = [];
  let ok = true;
  for (const it of items) {
    for (const s of [...it.pre ?? [], ...it.post ?? []]) {
      if (s.open !== void 0) stack.push(s.open);
      else if (s.close !== void 0 && stack.pop() !== s.close) ok = false;
    }
  }
  if (stack.length) ok = false;
  const segs = (ss) => (ss ?? []).filter((s) => ok || s.open === void 0 && s.close === void 0).map((s) => s.raw).join("");
  return items.map((it) => segs(it.pre) + it.xml + segs(it.post)).join("");
}
function rowsXml(t) {
  const store = active?.store;
  return wrappedXml(t.rows.map((row) => {
    const rs = store && row.src !== void 0 ? store.trs.get(row.src) : void 0;
    const rowOwner = rs !== void 0 && !active.claimed.has(row.src);
    if (rs) active.claimed.add(row.src);
    const ex = rs?.tblPrEx !== void 0 ? patchTblPrEx(rs.tblPrEx, row.tblPrEx) : row.tblPrEx ? tblPrExXml(row.tblPrEx) : "";
    const trPr = rs?.trPr !== void 0 ? patchTrPr(rs.trPr, row.trPr) : row.trPr ? trPrXml(row.trPr) : "";
    const cells = wrappedXml(row.cells.map((cell) => {
      const cs = store && cell.src !== void 0 ? store.tcs.get(cell.src) : void 0;
      const cellOwner = cs !== void 0 && !active.claimed.has(cell.src);
      if (cs) active.claimed.add(cell.src);
      const tcPr = cs?.tcPr !== void 0 ? patchTcPr(cs.tcPr, cell.tcPr) : cell.tcPr ? tcPrXml(cell.tcPr) : cs ? "" : tcPrXml2(cell);
      const body = cellOwner && cs.groups && cell.blocks?.length ? groupsXml(cs.groups, cell.blocks, store) : cellBodyXml(cell);
      const xml2 = `${cellOwner ? cs.open : "<w:tc>"}${tcPr}${body}</w:tc>`;
      return cellOwner ? { pre: cs.pre, post: cs.post, xml: xml2 } : { xml: xml2 };
    }));
    const xml = `${rowOwner ? rs.open : "<w:tr>"}${ex}${trPr}${cells}</w:tr>`;
    return rowOwner ? { pre: rs.pre, post: rs.post, xml } : { xml };
  }));
}
var legacyOrTypedTblPr = (t) => t.tblPr ? tblPrXml(t.tblPr) : tblPrXml2(t);
var gridOf = (raw) => [...raw.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"/g)].map((m) => m[1]).join(",");
function tblPrXml2(t) {
  const total = t.gridColsTwips.reduce((a, b) => a + b, 0) || void 0;
  return "<w:tblPr>" + (total ? `<w:tblW w:w="${total}" w:type="dxa"/>` : "") + (t.borders ? borderSetXml("tblBorders", t.borders, TBL_SIDES) : "") + "</w:tblPr>";
}
var gridXml = (t) => `<w:tblGrid>${t.gridColsTwips.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
function tcPrXml2(cell) {
  return "<w:tcPr>" + (cell.widthTwips ? `<w:tcW w:w="${cell.widthTwips}" w:type="dxa"/>` : "") + (cell.gridSpan > 1 ? `<w:gridSpan w:val="${cell.gridSpan}"/>` : "") + (cell.borders ? borderSetXml("tcBorders", cell.borders, CELL_SIDES) : "") + (cell.shadingHex ? `<w:shd w:val="clear" w:color="auto" w:fill="${escAttr3(cell.shadingHex)}"/>` : "") + "</w:tcPr>";
}
var blockXml = (b) => b.type === "table" ? tableXml(b) : paraXml(b.paragraph);
var blockId = (b) => b.type === "table" ? b.src : b.paragraph.props.src;
var sdtOf = (b) => b?.type === "paragraph" ? b.paragraph.props.blockSdt : void 0;
function sdtRunEnd(blocks, from, key) {
  let j = from;
  while (j < blocks.length && sdtOf(blocks[j])?.key === key) j++;
  return j;
}
var newSdtXml = (pr, inner) => `<w:sdt>${pr}<w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
function blocksXml(blocks) {
  let out = "";
  for (let i2 = 0; i2 < blocks.length; ) {
    const s = sdtOf(blocks[i2]);
    if (s?.pr) {
      const j = sdtRunEnd(blocks, i2, s.key);
      out += newSdtXml(s.pr, blocks.slice(i2, j).map(blockXml).join(""));
      i2 = j;
    } else out += blockXml(blocks[i2++]);
  }
  return out;
}
function storyBlocksXml(story, blocks, store) {
  countCopies(blocks, active.remaining);
  return groupsXml(story.groups, blocks, store);
}
function storyPristine(story, blocks, store) {
  const ids = story.groups.flatMap((g) => g.blocks);
  if (ids.length !== blocks.length) return false;
  return blocks.every((b, i2) => blockId(b) === ids[i2] && (b.type === "table" ? store.tablePristine(b) : store.pristine(b.paragraph)));
}
var noteXml = (kind, id, blocks) => `<w:${kind} w:id="${id}">${blocks.length ? blocks.map(blockXml).join("") : "<w:p/>"}</w:${kind}>`;
function writeNotesPart(pkg, kind, notes, store, gone) {
  const path = `word/${kind}s.xml`;
  const xml0 = pkg.getPartText(path);
  const used = new Set(notes.used);
  if (!xml0 && !used.size) return;
  let part = store?.noteParts.get(path);
  if (!part) {
    const xml = xml0 ?? emptyNotesPart(kind);
    const root = parseXml(xml, { positions: true });
    part = {
      open: xml.slice(0, root.cs),
      close: xml.slice(root.ce),
      refsAtLoad: /* @__PURE__ */ new Set(),
      items: childElements(root, `w:${kind}`).map((e) => ({
        id: parseInt(e.attrs["w:id"] ?? "0", 10),
        raw: xml.slice(e.s, e.e),
        separator: !!e.attrs["w:type"] && e.attrs["w:type"] !== "normal"
      }))
    };
  }
  const relsPath = active?.relsPath;
  if (active) active.relsPath = `word/_rels/${kind}s.xml.rels`;
  try {
    takeUsedDateUtc();
    const seen = /* @__PURE__ */ new Set();
    let body = "";
    for (const it of part.items) {
      if (it.separator) {
        body += it.raw;
        continue;
      }
      seen.add(it.id);
      if (!used.has(it.id)) {
        if (!part.refsAtLoad.has(it.id)) body += it.raw;
        continue;
      }
      const blocks = notes.blocks.get(it.id);
      if (!blocks) body += it.raw;
      else if (it.story && active && store) {
        body += storyPristine(it.story, blocks, store) ? it.raw : it.story.open + storyBlocksXml(it.story, blocks, store) + it.story.close;
      } else body += noteXml(kind, it.id, blocks);
    }
    for (const id of notes.used) {
      const blocks = notes.blocks.get(id);
      if (!seen.has(id) && blocks) body += noteXml(kind, id, blocks);
    }
    const out = dropCommentMarks(revRoot(part.open, `w:${kind}s`) + body + part.close, gone);
    if (out !== xml0) pkg.setPartText(path, out);
  } finally {
    if (active && relsPath !== void 0) active.relsPath = relsPath;
  }
}
function groupsXml(groups, blocks, store) {
  const groupOf2 = /* @__PURE__ */ new Map();
  groups.forEach((g, gi) => g.blocks.forEach((id) => {
    if (id) groupOf2.set(id, gi);
  }));
  const seen = /* @__PURE__ */ new Set();
  const dup = /* @__PURE__ */ new Set();
  for (const b of blocks) {
    const id = blockId(b);
    if (id === void 0) continue;
    if (seen.has(id)) dup.add(id);
    else seen.add(id);
  }
  const pristine = (b) => {
    const id = blockId(b);
    if (id === void 0 || dup.has(id)) return false;
    return b.type === "table" ? store.tablePristine(b) : store.pristine(b.paragraph);
  };
  let out = "";
  let zp = 0;
  const flushZero = (upTo) => {
    for (; zp < upTo; zp++) if (groups[zp].blocks.length === 0) out += groups[zp].raw;
  };
  for (let i2 = 0; i2 < blocks.length; ) {
    const b = blocks[i2];
    const id = blockId(b);
    const gi = id !== void 0 ? groupOf2.get(id) : void 0;
    if (gi !== void 0 && gi >= zp) {
      const g = groups[gi];
      let ok = g.blocks[0] === id && i2 + g.blocks.length <= blocks.length;
      for (let k = 0; ok && k < g.blocks.length; k++) ok = blockId(blocks[i2 + k]) === g.blocks[k] && pristine(blocks[i2 + k]);
      const trailing = (k) => !!g.sdtKey && k < blocks.length && blockId(blocks[k]) === void 0 && sdtOf(blocks[k])?.key === g.sdtKey;
      if (ok && trailing(i2 + g.blocks.length)) ok = false;
      flushZero(gi);
      if (ok) {
        for (const bid of g.blocks) active.claimed.add(bid);
        out += g.raw;
        zp = gi + 1;
        i2 += g.blocks.length;
        continue;
      }
      if (g.wrapOpen !== void 0 && g.blocks[0] === id) {
        let j = i2;
        const inGroup = (k) => {
          const x2 = blockId(blocks[k]);
          return x2 !== void 0 && groupOf2.get(x2) === gi;
        };
        while (j < blocks.length) {
          if (inGroup(j)) {
            j++;
            continue;
          }
          let k = j;
          while (k < blocks.length && blockId(blocks[k]) === void 0) k++;
          if (k > j && k < blocks.length && inGroup(k)) {
            j = k;
            continue;
          }
          if (trailing(j)) {
            j++;
            continue;
          }
          break;
        }
        const inner = blocks.slice(i2, j);
        out += g.wrapOpen + (g.inner ? groupsXml(g.inner, inner, store) : inner.map(blockXml).join("")) + g.wrapClose;
        zp = gi + 1;
        i2 = j;
        continue;
      }
    }
    const s = sdtOf(b);
    if (s?.pr) {
      const j = sdtRunEnd(blocks, i2 + 1, s.key);
      out += newSdtXml(s.pr, blocks.slice(i2, j).map(blockXml).join(""));
      i2 = j;
      continue;
    }
    out += blockXml(b);
    i2++;
  }
  flushZero(groups.length);
  return out;
}
function countCopies(blocks, out) {
  const para = (p) => {
    if (p.props.src !== void 0) out.set(p.props.src, (out.get(p.props.src) ?? 0) + 1);
    for (const r of p.runs) {
      for (const tb of r.textbox ? [r.textbox] : (r.group?.items ?? []).map((it) => it.run.textbox)) {
        if (!tb) continue;
        if (tb.blocks?.length) countCopies(tb.blocks, out);
        else tb.paras.forEach(para);
      }
    }
  };
  for (const b of blocks) {
    if (b.type === "paragraph") para(b.paragraph);
    else for (const row of b.rows) for (const c of row.cells) {
      if (c.blocks?.length) countCopies(c.blocks, out);
      else c.paragraphs.forEach(para);
    }
  }
}
function serializeBlocks(blocks, sectPr, hfRefs = []) {
  const bodyRefs = hfRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
  const sect = `<w:sectPr>${sectPrInner(sectPr, bodyRefs)}</w:sectPr>`;
  beginShapeContext(blocks);
  const body = blocksXml(blocks) + sect;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + revRoot(`<w:document ${W_NS}${body.includes("<w15:") ? W15_NS : ""}${drawingNsAttrs(body)}>`, "w:document") + `<w:body>${body}</w:body></w:document>`;
}
function serializeDocument(model, hfRefs = []) {
  const bodyRefs = hfRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
  const sect = `<w:sectPr>${sectPrInner(model.sectPr, bodyRefs)}</w:sectPr>`;
  beginShapeContext(model.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph })));
  const body = blocksXml(model.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }))) + sect;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + revRoot(`<w:document ${W_NS}${body.includes("<w15:") ? W15_NS : ""}${drawingNsAttrs(body)}>`, "w:document") + `<w:body>${body}</w:body></w:document>`;
}
function revRoot(open, rootName) {
  return takeUsedDateUtc() ? ensureRevisionNamespaces(open, rootName) : open;
}
var DRAWING_NS = [
  ["mc", "http://schemas.openxmlformats.org/markup-compatibility/2006"],
  ["wps", "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"],
  ["wp14", "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"],
  ["w14", "http://schemas.microsoft.com/office/word/2010/wordml"],
  ["v", "urn:schemas-microsoft-com:vml"],
  ["o", "urn:schemas-microsoft-com:office:office"],
  ["w10", "urn:schemas-microsoft-com:office:word"]
];
function drawingNs(content) {
  return DRAWING_NS.filter(([pfx]) => content.includes(`<${pfx}:`) || content.includes(` ${pfx}:`));
}
var drawingNsAttrs = (content) => drawingNs(content).map(([p, u]) => ` xmlns:${p}="${u}"`).join("");
function withNamespaces(open, rootName, content = "") {
  const at = open.indexOf(`<${rootName}`);
  if (at < 0) return open;
  const end = open.indexOf(">", at);
  let tag = open.slice(at, end);
  const need = [
    ["w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main"],
    ["r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships"],
    ["wp", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"],
    // w15:footnoteColumns no sectPr (colunas da área de notas)
    ...content.includes("<w15:") ? [["w15", "http://schemas.microsoft.com/office/word/2012/wordml"]] : [],
    // VML/DrawingML novos (marca-d'água, folha de rosto) numa parte de outro programa
    ...[
      ["v", "urn:schemas-microsoft-com:vml", /<v:/],
      ["o", "urn:schemas-microsoft-com:office:office", /\so:\w+=|<o:/],
      ["w10", "urn:schemas-microsoft-com:office:word", /<w10:/],
      ["w14", "http://schemas.microsoft.com/office/word/2010/wordml", /\sw14:\w+=|<w14:/],
      ["mc", "http://schemas.openxmlformats.org/markup-compatibility/2006", /<mc:/],
      ["wps", "http://schemas.microsoft.com/office/word/2010/wordprocessingShape", /<wps:|Requires="wps"/],
      ["a", "http://schemas.openxmlformats.org/drawingml/2006/main", /<a:/],
      ["wp14", "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing", /<wp14:|\swp14:\w+=/]
      // (só o prefixo usado e não declarado em lugar nenhum: o Word declara `a` no a:graphic)
    ].filter(([pfx, , re]) => re.test(content) && !content.includes(`xmlns:${pfx}=`)).map(([pfx, uri]) => [pfx, uri])
  ];
  for (const [pfx, uri] of need) if (!new RegExp(`\\sxmlns:${pfx}=`).test(tag)) tag += ` xmlns:${pfx}="${uri}"`;
  return open.slice(0, at) + tag + open.slice(end);
}
function dropCommentMarks(xml, gone) {
  if (gone.size === 0) return xml;
  const ids = [...gone].join("|");
  return xml.replace(new RegExp(`<w:commentRange(?:Start|End)\\b[^>]*\\bw:id="(?:${ids})"[^>]*/>`, "g"), "").replace(new RegExp(`<w:r\\b[^>]*>(?:(?!</w:r>)[\\s\\S])*?<w:commentReference\\b[^>]*\\bw:id="(?:${ids})"[^>]*/>(?:(?!</w:r>)[\\s\\S])*?</w:r>`, "g"), "");
}
function numberingXml(ids) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${W_NS}>${numberingAbstracts(ids)}${numberingNums(ids)}</w:numbering>`;
}
function freeNumIds(xml) {
  const used = new Set([...(xml ?? "").matchAll(/w:(?:abstractNumId|numId)(?: w:val)?="(\d+)"/g)].map((m) => Number(m[1])));
  let n = 1001;
  while (used.has(n) || used.has(n + 1)) n += 2;
  return { bullet: n, decimal: n + 1 };
}
function numberingAbstracts(ids) {
  const bulletLvls = Array.from(
    { length: 3 },
    (_, i2) => `<w:lvl w:ilvl="${i2}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${["", "o", ""][i2]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i2 + 1)}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="${["Symbol", "Courier New", "Wingdings"][i2]}" w:hAnsi="${["Symbol", "Courier New", "Wingdings"][i2]}" w:hint="default"/></w:rPr></w:lvl>`
  ).join("");
  const decimalLvls = Array.from(
    { length: 3 },
    (_, i2) => `<w:lvl w:ilvl="${i2}"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%${i2 + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i2 + 1)}" w:hanging="360"/></w:pPr></w:lvl>`
  ).join("");
  return `<w:abstractNum w:abstractNumId="${ids.bullet}">${bulletLvls}</w:abstractNum><w:abstractNum w:abstractNumId="${ids.decimal}">${decimalLvls}</w:abstractNum>`;
}
var numberingNums = (ids) => `<w:num w:numId="${ids.bullet}"><w:abstractNumId w:val="${ids.bullet}"/></w:num><w:num w:numId="${ids.decimal}"><w:abstractNumId w:val="${ids.decimal}"/></w:num>`;
function mergeNumbering(xml, ids) {
  if (new RegExp(`<w:num w:numId="${ids.bullet}">`).test(xml)) return xml;
  const firstNum = xml.search(/<w:num\b/);
  const withAbs = firstNum >= 0 ? xml.slice(0, firstNum) + numberingAbstracts(ids) + xml.slice(firstNum) : xml.replace(/<\/w:numbering>\s*$/, `${numberingAbstracts(ids)}</w:numbering>`);
  const tail = withAbs.search(/<w:numIdMacAtCleanup\b|<\/w:numbering>\s*$/);
  return withAbs.slice(0, tail) + numberingNums(ids) + withAbs.slice(tail);
}
var W_NS_HF = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
function serializeHfPart(kind, paragraphs) {
  const tag = kind === "header" ? "w:hdr" : "w:ftr";
  takeUsedDateUtc();
  beginShapeContext(paragraphs.map((paragraph) => ({ type: "paragraph", paragraph })));
  const body = paragraphs.map(paraXml).join("");
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + revRoot(`<${tag} ${HF_NS}>`, tag) + body + `</${tag}>`;
}
var commentXml = (c) => `<w:comment w:id="${c.id}" w:author="${escAttr3(c.author ?? "Write")}" w:initials="WN"><w:p><w:r><w:t xml:space="preserve">${esc5(c.text)}</w:t></w:r></w:p></w:comment>`;
function patchComments(pkg, comments) {
  const xml = pkg.getPartText("word/comments.xml");
  const want = new Map(comments.map((c) => [c.id, c]));
  const have = /* @__PURE__ */ new Set();
  const goneParaIds = [];
  let out = xml.replace(/<w:comment\b[^>]*?\bw:id="(-?\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/w:comment>)/g, (m, id) => {
    const n = parseInt(id, 10);
    if (want.has(n)) {
      have.add(n);
      return m;
    }
    for (const p of m.matchAll(/w14:paraId="([0-9A-Fa-f]+)"/g)) goneParaIds.push(p[1]);
    return "";
  });
  const added = comments.filter((c) => !have.has(c.id)).map(commentXml).join("");
  if (added) out = out.replace(/<\/w:comments>\s*$/, `${added}</w:comments>`);
  if (out !== xml) pkg.setPartText("word/comments.xml", out);
  if (!goneParaIds.length) return;
  const ids = goneParaIds.join("|");
  const durable = [];
  const cids = pkg.getPartText("word/commentsIds.xml");
  if (cids) {
    pkg.setPartText("word/commentsIds.xml", cids.replace(new RegExp(`<w16cid:commentId\\b[^>]*w16cid:paraId="(?:${ids})"[^>]*/>`, "g"), (m) => {
      const d = /w16cid:durableId="([^"]+)"/.exec(m)?.[1];
      if (d) durable.push(d);
      return "";
    }));
  }
  const ext = pkg.getPartText("word/commentsExtended.xml");
  if (ext) pkg.setPartText("word/commentsExtended.xml", ext.replace(new RegExp(`<w15:commentEx\\b[^>]*w15:paraId="(?:${ids})"[^>]*/>`, "g"), ""));
  const exb = pkg.getPartText("word/commentsExtensible.xml");
  if (exb && durable.length) {
    pkg.setPartText("word/commentsExtensible.xml", exb.replace(
      new RegExp(`<w16cex:commentExtensible\\b[^>]*w16cex:durableId="(?:${durable.join("|")})"[^>]*?(?:/>|>[\\s\\S]*?</w16cex:commentExtensible>)`, "g"),
      ""
    ));
  }
}
function writeDocument(pkg, model, hfParts = [], opts = {}) {
  mediaOut = [];
  drawingId = 0;
  vmlSpid = 4096;
  emittedShapes = /* @__PURE__ */ new WeakSet();
  vmlOnly = readSettings(pkg.getPartText("word/settings.xml")).compatibilityMode <= 12;
  const th = readTheme(pkg.getPartText("word/theme/theme1.xml"));
  if (Object.keys(th.colors).length) shapeTheme = { ...shapeTheme, ...th.colors };
  const store = opts.sources;
  if (store) {
    store.beginSave();
    store.genNumIds ??= freeNumIds(pkg.getPartText("word/numbering.xml"));
  }
  beginRevisionIds(...pkg.partNames().filter((p) => /^word\/(?:document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(p)).map((p) => pkg.getPartText(p)));
  active = store ? { store, pkg, relsPath: "word/_rels/document.xml.rels", claimed: /* @__PURE__ */ new Set(), genNumbering: false, claimedSegs: /* @__PURE__ */ new Set(), remaining: /* @__PURE__ */ new Map(), paraRuns: [], emittedObj: /* @__PURE__ */ new Set(), numIds: store.genNumIds } : null;
  try {
    writeParts(pkg, model, hfParts, opts, store);
    if (opts.trackRevisions !== void 0) writeTrackRevisions(pkg, opts.trackRevisions);
  } finally {
    active = null;
  }
}
function writeParts(pkg, model, hfParts, opts, store) {
  const gone = /* @__PURE__ */ new Set();
  if (store) {
    const now = new Set((opts.comments ?? []).map((c) => c.id));
    for (const id of store.commentIds) if (!now.has(id)) gone.add(id);
  }
  const commentsUnchanged = store !== void 0 && store.commentsSig === JSON.stringify(opts.comments ?? []);
  if (store && !commentsUnchanged && pkg.getPart("word/comments.xml")) {
    patchComments(pkg, opts.comments ?? []);
  } else if (!commentsUnchanged && opts.comments && opts.comments.length > 0) {
    const body = opts.comments.map(commentXml).join("");
    pkg.setPartText(
      "word/comments.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${W_NS_HF}>${body}</w:comments>`
    );
    const relsPath2 = "word/_rels/document.xml.rels";
    let rels2 = pkg.getPartText(relsPath2) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    if (!rels2.includes("comments.xml")) {
      rels2 = rels2.replace(
        "</Relationships>",
        '<Relationship Id="rIdWnComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>'
      );
      pkg.setPartText(relsPath2, rels2);
    }
    let ct2 = pkg.getPartText("[Content_Types].xml") ?? "";
    if (ct2 && !ct2.includes("comments+xml")) {
      ct2 = ct2.replace(
        "</Types>",
        '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>'
      );
      pkg.setPartText("[Content_Types].xml", ct2);
    }
  }
  if (hfParts.length > 0) {
    const relsPath2 = "word/_rels/document.xml.rels";
    let rels2 = pkg.getPartText(relsPath2) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct2 = pkg.getPartText("[Content_Types].xml") ?? "";
    for (const hf of hfParts) {
      if (hf.dirty || !pkg.getPart(hf.path)) {
        const story2 = store?.stories.get(hf.path);
        if (active && story2) {
          active.relsPath = `word/_rels/${hf.path.split("/").pop()}.rels`;
          const blocks = hf.blocks ?? hf.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
          const root = hf.kind === "header" ? "w:hdr" : "w:ftr";
          takeUsedDateUtc();
          beginShapeContext(blocks);
          const body = storyBlocksXml(story2, blocks, store);
          const xml = revRoot(withNamespaces(story2.open, root, body), root) + body + story2.close;
          pkg.setPartText(hf.path, dropCommentMarks(xml, gone));
          active.relsPath = relsPath2;
        } else {
          pkg.setPartText(hf.path, serializeHfPart(hf.kind, hf.paragraphs));
        }
      }
      const relTarget = hf.path.replace(/^word\//, "");
      if (!rels2.includes(`Id="${hf.rid}"`)) {
        rels2 = rels2.replace(
          "</Relationships>",
          `<Relationship Id="${hf.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${hf.kind}" Target="${relTarget}"/></Relationships>`
        );
      }
      const ctType = `application/vnd.openxmlformats-officedocument.wordprocessingml.${hf.kind}+xml`;
      if (ct2 && !ct2.includes(`PartName="/${hf.path}"`)) {
        ct2 = ct2.replace("</Types>", `<Override PartName="/${hf.path}" ContentType="${ctType}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath2, rels2);
    if (ct2) pkg.setPartText("[Content_Types].xml", ct2);
  }
  if (opts.notes) {
    if ((opts.notes.footnote?.used.length || opts.notes.endnote?.used.length) && !pkg.getPart("word/footnotes.xml")) ensureNoteParts(pkg);
    for (const kind of ["footnote", "endnote"]) {
      const n = opts.notes[kind];
      if (n) writeNotesPart(pkg, kind, n, store, gone);
    }
  }
  const bodyRefs = opts.bodySectRefs ? opts.bodySectRefs.map((r) => ({
    kind: r.kind,
    type: r.type,
    rid: r.rid,
    path: "",
    paragraphs: [],
    dirty: false
  })) : hfParts;
  const story = store?.stories.get("word/document.xml");
  if (active && story) {
    active.relsPath = "word/_rels/document.xml.rels";
    const blocks = opts.blocks ?? model.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
    const refs = bodyRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
    const sect = story.sectPr ? patchSectPr(story.sectPr, model.sectPr, refs) : `<w:sectPr>${sectPrInner(model.sectPr, refs)}</w:sectPr>`;
    takeUsedDateUtc();
    beginShapeContext(blocks);
    const body = storyBlocksXml(story, blocks, store) + sect;
    const xml = revRoot(withNamespaces(story.open, "w:document", body), "w:document") + body + story.close;
    pkg.setPartText("word/document.xml", dropCommentMarks(xml, gone));
  } else {
    pkg.setPartText(
      "word/document.xml",
      opts.blocks ? serializeBlocks(opts.blocks, model.sectPr, bodyRefs) : serializeDocument(model, bodyRefs)
    );
  }
  if (gone.size) {
    for (const part of pkg.partNames()) {
      if (!/^word\/(?:header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(part)) continue;
      const x2 = pkg.getPartText(part);
      const y = dropCommentMarks(x2, gone);
      if (y !== x2) pkg.setPartText(part, y);
    }
  }
  if (mediaOut.length > 0) {
    const relsPath2 = "word/_rels/document.xml.rels";
    let rels2 = pkg.getPartText(relsPath2) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct2 = pkg.getPartText("[Content_Types].xml") ?? "";
    const sameBytes = (a, b) => {
      if (a.length !== b.length) return false;
      for (let i2 = 0; i2 < a.length; i2 += 1009) if (a[i2] !== b[i2]) return false;
      return a[a.length - 1] === b[b.length - 1];
    };
    const existingMedia = pkg.partNames().filter((p) => p.startsWith("word/media/"));
    const exts = /* @__PURE__ */ new Set();
    const mimes = /* @__PURE__ */ new Map();
    for (const m of mediaOut) {
      let target = m.path.replace(/^word\//, "");
      const dup = m.relType ? void 0 : existingMedia.find((p) => sameBytes(pkg.getPart(p), m.data));
      if (dup) {
        target = dup.replace(/^word\//, "");
      } else {
        pkg.setPart(m.path, m.data);
      }
      if (!rels2.includes(`"${m.rid}"`)) {
        rels2 = rels2.replace(
          "</Relationships>",
          `<Relationship Id="${m.rid}" Type="${m.relType ?? "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"}" Target="${target}"/></Relationships>`
        );
      }
      exts.add(m.ext);
      if (m.mime) mimes.set(m.ext, m.mime);
    }
    for (const ext of exts) {
      const mime = mimes.get(ext) ?? (ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "emf" ? "image/x-emf" : `image/${ext}`);
      if (ct2 && !ct2.includes(`Extension="${ext}"`)) {
        ct2 = ct2.replace("</Types>", `<Default Extension="${ext}" ContentType="${mime}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath2, rels2);
    if (ct2) pkg.setPartText("[Content_Types].xml", ct2);
  }
  const hasLists = active ? active.genNumbering : model.paragraphs.some((p) => p.props.numbering);
  if (!hasLists) return;
  const existing = pkg.getPartText("word/numbering.xml");
  const ids = active?.numIds ?? DEFAULT_NUM_IDS;
  pkg.setPartText("word/numbering.xml", existing ? mergeNumbering(existing, ids) : numberingXml(ids));
  const relsPath = "word/_rels/document.xml.rels";
  let rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  if (!rels.includes("numbering.xml")) {
    rels = rels.replace(
      "</Relationships>",
      '<Relationship Id="rIdWnNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>'
    );
    pkg.setPartText(relsPath, rels);
  }
  const ctPath = "[Content_Types].xml";
  let ct = pkg.getPartText(ctPath);
  if (ct && !ct.includes("numbering+xml")) {
    ct = ct.replace(
      "</Types>",
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'
    );
    pkg.setPartText(ctPath, ct);
  }
}

// ../docx-core/src/word-styles.ts
var WORD_BLANK_STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:styles xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorBidi"/><w:kern w:val="2"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="pt-BR" w:eastAsia="en-US" w:bidi="ar-SA"/><w14:ligatures w14:val="standardContextual"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:latentStyles w:defLockedState="0" w:defUIPriority="99" w:defSemiHidden="0" w:defUnhideWhenUsed="0" w:defQFormat="0" w:count="376"><w:lsdException w:name="Normal" w:uiPriority="0" w:qFormat="1"/><w:lsdException w:name="heading 1" w:uiPriority="9" w:qFormat="1"/><w:lsdException w:name="heading 2" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="heading 3" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="heading 4" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="heading 5" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="heading 6" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="heading 7" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="heading 8" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="heading 9" w:semiHidden="1" w:uiPriority="9" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="index 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 6" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 7" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 8" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index 9" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 1" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 2" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 3" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 4" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 5" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 6" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 7" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 8" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="toc 9" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1"/><w:lsdException w:name="Normal Indent" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="footnote text" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="annotation text" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="header" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="footer" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="index heading" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="caption" w:semiHidden="1" w:uiPriority="35" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="table of figures" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="envelope address" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="envelope return" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="footnote reference" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="annotation reference" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="line number" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="page number" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="endnote reference" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="endnote text" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="table of authorities" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="macro" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="toa heading" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Bullet" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Number" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Bullet 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Bullet 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Bullet 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Bullet 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Number 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Number 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Number 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Number 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Title" w:uiPriority="10" w:qFormat="1"/><w:lsdException w:name="Closing" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Signature" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Default Paragraph Font" w:semiHidden="1" w:uiPriority="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text Indent" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Continue" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Continue 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Continue 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Continue 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="List Continue 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Message Header" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Subtitle" w:uiPriority="11" w:qFormat="1"/><w:lsdException w:name="Salutation" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Date" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text First Indent" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text First Indent 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Note Heading" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text Indent 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Body Text Indent 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Block Text" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Hyperlink" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="FollowedHyperlink" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Strong" w:uiPriority="22" w:qFormat="1"/><w:lsdException w:name="Emphasis" w:uiPriority="20" w:qFormat="1"/><w:lsdException w:name="Document Map" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Plain Text" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="E-mail Signature" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Top of Form" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Bottom of Form" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Normal (Web)" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Acronym" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Address" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Cite" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Code" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Definition" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Keyboard" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Preformatted" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Sample" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Typewriter" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="HTML Variable" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Normal Table" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="annotation subject" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="No List" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Outline List 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Outline List 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Outline List 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Simple 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Simple 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Simple 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Classic 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Classic 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Classic 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Classic 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Colorful 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Colorful 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Colorful 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Columns 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Columns 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Columns 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Columns 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Columns 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 6" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 7" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid 8" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 4" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 5" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 6" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 7" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table List 8" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table 3D effects 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table 3D effects 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table 3D effects 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Contemporary" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Elegant" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Professional" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Subtle 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Subtle 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Web 1" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Web 2" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Web 3" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Balloon Text" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Table Grid" w:uiPriority="39"/><w:lsdException w:name="Table Theme" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Placeholder Text" w:semiHidden="1"/><w:lsdException w:name="No Spacing" w:uiPriority="1" w:qFormat="1"/><w:lsdException w:name="Light Shading" w:uiPriority="60"/><w:lsdException w:name="Light List" w:uiPriority="61"/><w:lsdException w:name="Light Grid" w:uiPriority="62"/><w:lsdException w:name="Medium Shading 1" w:uiPriority="63"/><w:lsdException w:name="Medium Shading 2" w:uiPriority="64"/><w:lsdException w:name="Medium List 1" w:uiPriority="65"/><w:lsdException w:name="Medium List 2" w:uiPriority="66"/><w:lsdException w:name="Medium Grid 1" w:uiPriority="67"/><w:lsdException w:name="Medium Grid 2" w:uiPriority="68"/><w:lsdException w:name="Medium Grid 3" w:uiPriority="69"/><w:lsdException w:name="Dark List" w:uiPriority="70"/><w:lsdException w:name="Colorful Shading" w:uiPriority="71"/><w:lsdException w:name="Colorful List" w:uiPriority="72"/><w:lsdException w:name="Colorful Grid" w:uiPriority="73"/><w:lsdException w:name="Light Shading Accent 1" w:uiPriority="60"/><w:lsdException w:name="Light List Accent 1" w:uiPriority="61"/><w:lsdException w:name="Light Grid Accent 1" w:uiPriority="62"/><w:lsdException w:name="Medium Shading 1 Accent 1" w:uiPriority="63"/><w:lsdException w:name="Medium Shading 2 Accent 1" w:uiPriority="64"/><w:lsdException w:name="Medium List 1 Accent 1" w:uiPriority="65"/><w:lsdException w:name="Revision" w:semiHidden="1"/><w:lsdException w:name="List Paragraph" w:uiPriority="34" w:qFormat="1"/><w:lsdException w:name="Quote" w:uiPriority="29" w:qFormat="1"/><w:lsdException w:name="Intense Quote" w:uiPriority="30" w:qFormat="1"/><w:lsdException w:name="Medium List 2 Accent 1" w:uiPriority="66"/><w:lsdException w:name="Medium Grid 1 Accent 1" w:uiPriority="67"/><w:lsdException w:name="Medium Grid 2 Accent 1" w:uiPriority="68"/><w:lsdException w:name="Medium Grid 3 Accent 1" w:uiPriority="69"/><w:lsdException w:name="Dark List Accent 1" w:uiPriority="70"/><w:lsdException w:name="Colorful Shading Accent 1" w:uiPriority="71"/><w:lsdException w:name="Colorful List Accent 1" w:uiPriority="72"/><w:lsdException w:name="Colorful Grid Accent 1" w:uiPriority="73"/><w:lsdException w:name="Light Shading Accent 2" w:uiPriority="60"/><w:lsdException w:name="Light List Accent 2" w:uiPriority="61"/><w:lsdException w:name="Light Grid Accent 2" w:uiPriority="62"/><w:lsdException w:name="Medium Shading 1 Accent 2" w:uiPriority="63"/><w:lsdException w:name="Medium Shading 2 Accent 2" w:uiPriority="64"/><w:lsdException w:name="Medium List 1 Accent 2" w:uiPriority="65"/><w:lsdException w:name="Medium List 2 Accent 2" w:uiPriority="66"/><w:lsdException w:name="Medium Grid 1 Accent 2" w:uiPriority="67"/><w:lsdException w:name="Medium Grid 2 Accent 2" w:uiPriority="68"/><w:lsdException w:name="Medium Grid 3 Accent 2" w:uiPriority="69"/><w:lsdException w:name="Dark List Accent 2" w:uiPriority="70"/><w:lsdException w:name="Colorful Shading Accent 2" w:uiPriority="71"/><w:lsdException w:name="Colorful List Accent 2" w:uiPriority="72"/><w:lsdException w:name="Colorful Grid Accent 2" w:uiPriority="73"/><w:lsdException w:name="Light Shading Accent 3" w:uiPriority="60"/><w:lsdException w:name="Light List Accent 3" w:uiPriority="61"/><w:lsdException w:name="Light Grid Accent 3" w:uiPriority="62"/><w:lsdException w:name="Medium Shading 1 Accent 3" w:uiPriority="63"/><w:lsdException w:name="Medium Shading 2 Accent 3" w:uiPriority="64"/><w:lsdException w:name="Medium List 1 Accent 3" w:uiPriority="65"/><w:lsdException w:name="Medium List 2 Accent 3" w:uiPriority="66"/><w:lsdException w:name="Medium Grid 1 Accent 3" w:uiPriority="67"/><w:lsdException w:name="Medium Grid 2 Accent 3" w:uiPriority="68"/><w:lsdException w:name="Medium Grid 3 Accent 3" w:uiPriority="69"/><w:lsdException w:name="Dark List Accent 3" w:uiPriority="70"/><w:lsdException w:name="Colorful Shading Accent 3" w:uiPriority="71"/><w:lsdException w:name="Colorful List Accent 3" w:uiPriority="72"/><w:lsdException w:name="Colorful Grid Accent 3" w:uiPriority="73"/><w:lsdException w:name="Light Shading Accent 4" w:uiPriority="60"/><w:lsdException w:name="Light List Accent 4" w:uiPriority="61"/><w:lsdException w:name="Light Grid Accent 4" w:uiPriority="62"/><w:lsdException w:name="Medium Shading 1 Accent 4" w:uiPriority="63"/><w:lsdException w:name="Medium Shading 2 Accent 4" w:uiPriority="64"/><w:lsdException w:name="Medium List 1 Accent 4" w:uiPriority="65"/><w:lsdException w:name="Medium List 2 Accent 4" w:uiPriority="66"/><w:lsdException w:name="Medium Grid 1 Accent 4" w:uiPriority="67"/><w:lsdException w:name="Medium Grid 2 Accent 4" w:uiPriority="68"/><w:lsdException w:name="Medium Grid 3 Accent 4" w:uiPriority="69"/><w:lsdException w:name="Dark List Accent 4" w:uiPriority="70"/><w:lsdException w:name="Colorful Shading Accent 4" w:uiPriority="71"/><w:lsdException w:name="Colorful List Accent 4" w:uiPriority="72"/><w:lsdException w:name="Colorful Grid Accent 4" w:uiPriority="73"/><w:lsdException w:name="Light Shading Accent 5" w:uiPriority="60"/><w:lsdException w:name="Light List Accent 5" w:uiPriority="61"/><w:lsdException w:name="Light Grid Accent 5" w:uiPriority="62"/><w:lsdException w:name="Medium Shading 1 Accent 5" w:uiPriority="63"/><w:lsdException w:name="Medium Shading 2 Accent 5" w:uiPriority="64"/><w:lsdException w:name="Medium List 1 Accent 5" w:uiPriority="65"/><w:lsdException w:name="Medium List 2 Accent 5" w:uiPriority="66"/><w:lsdException w:name="Medium Grid 1 Accent 5" w:uiPriority="67"/><w:lsdException w:name="Medium Grid 2 Accent 5" w:uiPriority="68"/><w:lsdException w:name="Medium Grid 3 Accent 5" w:uiPriority="69"/><w:lsdException w:name="Dark List Accent 5" w:uiPriority="70"/><w:lsdException w:name="Colorful Shading Accent 5" w:uiPriority="71"/><w:lsdException w:name="Colorful List Accent 5" w:uiPriority="72"/><w:lsdException w:name="Colorful Grid Accent 5" w:uiPriority="73"/><w:lsdException w:name="Light Shading Accent 6" w:uiPriority="60"/><w:lsdException w:name="Light List Accent 6" w:uiPriority="61"/><w:lsdException w:name="Light Grid Accent 6" w:uiPriority="62"/><w:lsdException w:name="Medium Shading 1 Accent 6" w:uiPriority="63"/><w:lsdException w:name="Medium Shading 2 Accent 6" w:uiPriority="64"/><w:lsdException w:name="Medium List 1 Accent 6" w:uiPriority="65"/><w:lsdException w:name="Medium List 2 Accent 6" w:uiPriority="66"/><w:lsdException w:name="Medium Grid 1 Accent 6" w:uiPriority="67"/><w:lsdException w:name="Medium Grid 2 Accent 6" w:uiPriority="68"/><w:lsdException w:name="Medium Grid 3 Accent 6" w:uiPriority="69"/><w:lsdException w:name="Dark List Accent 6" w:uiPriority="70"/><w:lsdException w:name="Colorful Shading Accent 6" w:uiPriority="71"/><w:lsdException w:name="Colorful List Accent 6" w:uiPriority="72"/><w:lsdException w:name="Colorful Grid Accent 6" w:uiPriority="73"/><w:lsdException w:name="Subtle Emphasis" w:uiPriority="19" w:qFormat="1"/><w:lsdException w:name="Intense Emphasis" w:uiPriority="21" w:qFormat="1"/><w:lsdException w:name="Subtle Reference" w:uiPriority="31" w:qFormat="1"/><w:lsdException w:name="Intense Reference" w:uiPriority="32" w:qFormat="1"/><w:lsdException w:name="Book Title" w:uiPriority="33" w:qFormat="1"/><w:lsdException w:name="Bibliography" w:semiHidden="1" w:uiPriority="37" w:unhideWhenUsed="1"/><w:lsdException w:name="TOC Heading" w:semiHidden="1" w:uiPriority="39" w:unhideWhenUsed="1" w:qFormat="1"/><w:lsdException w:name="Plain Table 1" w:uiPriority="41"/><w:lsdException w:name="Plain Table 2" w:uiPriority="42"/><w:lsdException w:name="Plain Table 3" w:uiPriority="43"/><w:lsdException w:name="Plain Table 4" w:uiPriority="44"/><w:lsdException w:name="Plain Table 5" w:uiPriority="45"/><w:lsdException w:name="Grid Table Light" w:uiPriority="40"/><w:lsdException w:name="Grid Table 1 Light" w:uiPriority="46"/><w:lsdException w:name="Grid Table 2" w:uiPriority="47"/><w:lsdException w:name="Grid Table 3" w:uiPriority="48"/><w:lsdException w:name="Grid Table 4" w:uiPriority="49"/><w:lsdException w:name="Grid Table 5 Dark" w:uiPriority="50"/><w:lsdException w:name="Grid Table 6 Colorful" w:uiPriority="51"/><w:lsdException w:name="Grid Table 7 Colorful" w:uiPriority="52"/><w:lsdException w:name="Grid Table 1 Light Accent 1" w:uiPriority="46"/><w:lsdException w:name="Grid Table 2 Accent 1" w:uiPriority="47"/><w:lsdException w:name="Grid Table 3 Accent 1" w:uiPriority="48"/><w:lsdException w:name="Grid Table 4 Accent 1" w:uiPriority="49"/><w:lsdException w:name="Grid Table 5 Dark Accent 1" w:uiPriority="50"/><w:lsdException w:name="Grid Table 6 Colorful Accent 1" w:uiPriority="51"/><w:lsdException w:name="Grid Table 7 Colorful Accent 1" w:uiPriority="52"/><w:lsdException w:name="Grid Table 1 Light Accent 2" w:uiPriority="46"/><w:lsdException w:name="Grid Table 2 Accent 2" w:uiPriority="47"/><w:lsdException w:name="Grid Table 3 Accent 2" w:uiPriority="48"/><w:lsdException w:name="Grid Table 4 Accent 2" w:uiPriority="49"/><w:lsdException w:name="Grid Table 5 Dark Accent 2" w:uiPriority="50"/><w:lsdException w:name="Grid Table 6 Colorful Accent 2" w:uiPriority="51"/><w:lsdException w:name="Grid Table 7 Colorful Accent 2" w:uiPriority="52"/><w:lsdException w:name="Grid Table 1 Light Accent 3" w:uiPriority="46"/><w:lsdException w:name="Grid Table 2 Accent 3" w:uiPriority="47"/><w:lsdException w:name="Grid Table 3 Accent 3" w:uiPriority="48"/><w:lsdException w:name="Grid Table 4 Accent 3" w:uiPriority="49"/><w:lsdException w:name="Grid Table 5 Dark Accent 3" w:uiPriority="50"/><w:lsdException w:name="Grid Table 6 Colorful Accent 3" w:uiPriority="51"/><w:lsdException w:name="Grid Table 7 Colorful Accent 3" w:uiPriority="52"/><w:lsdException w:name="Grid Table 1 Light Accent 4" w:uiPriority="46"/><w:lsdException w:name="Grid Table 2 Accent 4" w:uiPriority="47"/><w:lsdException w:name="Grid Table 3 Accent 4" w:uiPriority="48"/><w:lsdException w:name="Grid Table 4 Accent 4" w:uiPriority="49"/><w:lsdException w:name="Grid Table 5 Dark Accent 4" w:uiPriority="50"/><w:lsdException w:name="Grid Table 6 Colorful Accent 4" w:uiPriority="51"/><w:lsdException w:name="Grid Table 7 Colorful Accent 4" w:uiPriority="52"/><w:lsdException w:name="Grid Table 1 Light Accent 5" w:uiPriority="46"/><w:lsdException w:name="Grid Table 2 Accent 5" w:uiPriority="47"/><w:lsdException w:name="Grid Table 3 Accent 5" w:uiPriority="48"/><w:lsdException w:name="Grid Table 4 Accent 5" w:uiPriority="49"/><w:lsdException w:name="Grid Table 5 Dark Accent 5" w:uiPriority="50"/><w:lsdException w:name="Grid Table 6 Colorful Accent 5" w:uiPriority="51"/><w:lsdException w:name="Grid Table 7 Colorful Accent 5" w:uiPriority="52"/><w:lsdException w:name="Grid Table 1 Light Accent 6" w:uiPriority="46"/><w:lsdException w:name="Grid Table 2 Accent 6" w:uiPriority="47"/><w:lsdException w:name="Grid Table 3 Accent 6" w:uiPriority="48"/><w:lsdException w:name="Grid Table 4 Accent 6" w:uiPriority="49"/><w:lsdException w:name="Grid Table 5 Dark Accent 6" w:uiPriority="50"/><w:lsdException w:name="Grid Table 6 Colorful Accent 6" w:uiPriority="51"/><w:lsdException w:name="Grid Table 7 Colorful Accent 6" w:uiPriority="52"/><w:lsdException w:name="List Table 1 Light" w:uiPriority="46"/><w:lsdException w:name="List Table 2" w:uiPriority="47"/><w:lsdException w:name="List Table 3" w:uiPriority="48"/><w:lsdException w:name="List Table 4" w:uiPriority="49"/><w:lsdException w:name="List Table 5 Dark" w:uiPriority="50"/><w:lsdException w:name="List Table 6 Colorful" w:uiPriority="51"/><w:lsdException w:name="List Table 7 Colorful" w:uiPriority="52"/><w:lsdException w:name="List Table 1 Light Accent 1" w:uiPriority="46"/><w:lsdException w:name="List Table 2 Accent 1" w:uiPriority="47"/><w:lsdException w:name="List Table 3 Accent 1" w:uiPriority="48"/><w:lsdException w:name="List Table 4 Accent 1" w:uiPriority="49"/><w:lsdException w:name="List Table 5 Dark Accent 1" w:uiPriority="50"/><w:lsdException w:name="List Table 6 Colorful Accent 1" w:uiPriority="51"/><w:lsdException w:name="List Table 7 Colorful Accent 1" w:uiPriority="52"/><w:lsdException w:name="List Table 1 Light Accent 2" w:uiPriority="46"/><w:lsdException w:name="List Table 2 Accent 2" w:uiPriority="47"/><w:lsdException w:name="List Table 3 Accent 2" w:uiPriority="48"/><w:lsdException w:name="List Table 4 Accent 2" w:uiPriority="49"/><w:lsdException w:name="List Table 5 Dark Accent 2" w:uiPriority="50"/><w:lsdException w:name="List Table 6 Colorful Accent 2" w:uiPriority="51"/><w:lsdException w:name="List Table 7 Colorful Accent 2" w:uiPriority="52"/><w:lsdException w:name="List Table 1 Light Accent 3" w:uiPriority="46"/><w:lsdException w:name="List Table 2 Accent 3" w:uiPriority="47"/><w:lsdException w:name="List Table 3 Accent 3" w:uiPriority="48"/><w:lsdException w:name="List Table 4 Accent 3" w:uiPriority="49"/><w:lsdException w:name="List Table 5 Dark Accent 3" w:uiPriority="50"/><w:lsdException w:name="List Table 6 Colorful Accent 3" w:uiPriority="51"/><w:lsdException w:name="List Table 7 Colorful Accent 3" w:uiPriority="52"/><w:lsdException w:name="List Table 1 Light Accent 4" w:uiPriority="46"/><w:lsdException w:name="List Table 2 Accent 4" w:uiPriority="47"/><w:lsdException w:name="List Table 3 Accent 4" w:uiPriority="48"/><w:lsdException w:name="List Table 4 Accent 4" w:uiPriority="49"/><w:lsdException w:name="List Table 5 Dark Accent 4" w:uiPriority="50"/><w:lsdException w:name="List Table 6 Colorful Accent 4" w:uiPriority="51"/><w:lsdException w:name="List Table 7 Colorful Accent 4" w:uiPriority="52"/><w:lsdException w:name="List Table 1 Light Accent 5" w:uiPriority="46"/><w:lsdException w:name="List Table 2 Accent 5" w:uiPriority="47"/><w:lsdException w:name="List Table 3 Accent 5" w:uiPriority="48"/><w:lsdException w:name="List Table 4 Accent 5" w:uiPriority="49"/><w:lsdException w:name="List Table 5 Dark Accent 5" w:uiPriority="50"/><w:lsdException w:name="List Table 6 Colorful Accent 5" w:uiPriority="51"/><w:lsdException w:name="List Table 7 Colorful Accent 5" w:uiPriority="52"/><w:lsdException w:name="List Table 1 Light Accent 6" w:uiPriority="46"/><w:lsdException w:name="List Table 2 Accent 6" w:uiPriority="47"/><w:lsdException w:name="List Table 3 Accent 6" w:uiPriority="48"/><w:lsdException w:name="List Table 4 Accent 6" w:uiPriority="49"/><w:lsdException w:name="List Table 5 Dark Accent 6" w:uiPriority="50"/><w:lsdException w:name="List Table 6 Colorful Accent 6" w:uiPriority="51"/><w:lsdException w:name="List Table 7 Colorful Accent 6" w:uiPriority="52"/><w:lsdException w:name="Mention" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Smart Hyperlink" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Hashtag" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Unresolved Mention" w:semiHidden="1" w:unhideWhenUsed="1"/><w:lsdException w:name="Smart Link" w:semiHidden="1" w:unhideWhenUsed="1"/></w:latentStyles><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo1Char"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="360" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo2Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo3Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo4Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="80" w:after="40"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo5"><w:name w:val="heading 5"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo5Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="80" w:after="40"/><w:outlineLvl w:val="4"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo6"><w:name w:val="heading 6"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo6Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="5"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo7"><w:name w:val="heading 7"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo7Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="6"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo8"><w:name w:val="heading 8"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo8Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:after="0"/><w:outlineLvl w:val="7"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo9"><w:name w:val="heading 9"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo9Char"/><w:uiPriority w:val="9"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:after="0"/><w:outlineLvl w:val="8"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style><w:style w:type="character" w:default="1" w:styleId="Fontepargpadro"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style><w:style w:type="table" w:default="1" w:styleId="Tabelanormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style><w:style w:type="numbering" w:default="1" w:styleId="Semlista"><w:name w:val="No List"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo1Char"><w:name w:val="T\xEDtulo 1 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo1"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo2Char"><w:name w:val="T\xEDtulo 2 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo2"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo3Char"><w:name w:val="T\xEDtulo 3 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo3"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo4Char"><w:name w:val="T\xEDtulo 4 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo4"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo5Char"><w:name w:val="T\xEDtulo 5 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo5"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo6Char"><w:name w:val="T\xEDtulo 6 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo6"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo7Char"><w:name w:val="T\xEDtulo 7 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo7"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo8Char"><w:name w:val="T\xEDtulo 8 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo8"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="Ttulo9Char"><w:name w:val="T\xEDtulo 9 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo9"/><w:uiPriority w:val="9"/><w:semiHidden/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Ttulo"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="TtuloChar"/><w:uiPriority w:val="10"/><w:qFormat/><w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/><w:contextualSpacing/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:spacing w:val="-10"/><w:kern w:val="28"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="TtuloChar"><w:name w:val="T\xEDtulo Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo"/><w:uiPriority w:val="10"/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:spacing w:val="-10"/><w:kern w:val="28"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subttulo"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="SubttuloChar"/><w:uiPriority w:val="11"/><w:qFormat/><w:pPr><w:numPr><w:ilvl w:val="1"/></w:numPr></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/><w:spacing w:val="15"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="SubttuloChar"><w:name w:val="Subt\xEDtulo Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Subttulo"/><w:uiPriority w:val="11"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/><w:spacing w:val="15"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Citao"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="CitaoChar"/><w:uiPriority w:val="29"/><w:qFormat/><w:pPr><w:spacing w:before="160"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="404040" w:themeColor="text1" w:themeTint="BF"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="CitaoChar"><w:name w:val="Cita\xE7\xE3o Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Citao"/><w:uiPriority w:val="29"/><w:rPr><w:i/><w:iCs/><w:color w:val="404040" w:themeColor="text1" w:themeTint="BF"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="PargrafodaLista"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/><w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style><w:style w:type="character" w:styleId="nfaseIntensa"><w:name w:val="Intense Emphasis"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="21"/><w:qFormat/><w:rPr><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="CitaoIntensa"><w:name w:val="Intense Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="CitaoIntensaChar"/><w:uiPriority w:val="30"/><w:qFormat/><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="10" w:color="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:bottom w:val="single" w:sz="4" w:space="10" w:color="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:pBdr><w:spacing w:before="360" w:after="360"/><w:ind w:left="864" w:right="864"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style><w:style w:type="character" w:customStyle="1" w:styleId="CitaoIntensaChar"><w:name w:val="Cita\xE7\xE3o Intensa Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="CitaoIntensa"/><w:uiPriority w:val="30"/><w:rPr><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style><w:style w:type="character" w:styleId="RefernciaIntensa"><w:name w:val="Intense Reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="32"/><w:qFormat/><w:rPr><w:b/><w:bCs/><w:smallCaps/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:spacing w:val="5"/></w:rPr></w:style></w:styles>';
var WORD_BLANK_THEME = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Tema do Office"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0E2841"/></a:dk2><a:lt2><a:srgbClr val="E8E8E8"/></a:lt2><a:accent1><a:srgbClr val="156082"/></a:accent1><a:accent2><a:srgbClr val="E97132"/></a:accent2><a:accent3><a:srgbClr val="196B24"/></a:accent3><a:accent4><a:srgbClr val="0F9ED5"/></a:accent4><a:accent5><a:srgbClr val="A02B93"/></a:accent5><a:accent6><a:srgbClr val="4EA72E"/></a:accent6><a:hlink><a:srgbClr val="467886"/></a:hlink><a:folHlink><a:srgbClr val="96607D"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Aptos Display" panose="02110004020202020204"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Jpan" typeface="\u6E38\u30B4\u30B7\u30C3\u30AF Light"/><a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/><a:font script="Hans" typeface="\u7B49\u7EBF Light"/><a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/><a:font script="Arab" typeface="Times New Roman"/><a:font script="Hebr" typeface="Times New Roman"/><a:font script="Thai" typeface="Angsana New"/><a:font script="Ethi" typeface="Nyala"/><a:font script="Beng" typeface="Vrinda"/><a:font script="Gujr" typeface="Shruti"/><a:font script="Khmr" typeface="MoolBoran"/><a:font script="Knda" typeface="Tunga"/><a:font script="Guru" typeface="Raavi"/><a:font script="Cans" typeface="Euphemia"/><a:font script="Cher" typeface="Plantagenet Cherokee"/><a:font script="Yiii" typeface="Microsoft Yi Baiti"/><a:font script="Tibt" typeface="Microsoft Himalaya"/><a:font script="Thaa" typeface="MV Boli"/><a:font script="Deva" typeface="Mangal"/><a:font script="Telu" typeface="Gautami"/><a:font script="Taml" typeface="Latha"/><a:font script="Syrc" typeface="Estrangelo Edessa"/><a:font script="Orya" typeface="Kalinga"/><a:font script="Mlym" typeface="Kartika"/><a:font script="Laoo" typeface="DokChampa"/><a:font script="Sinh" typeface="Iskoola Pota"/><a:font script="Mong" typeface="Mongolian Baiti"/><a:font script="Viet" typeface="Times New Roman"/><a:font script="Uigh" typeface="Microsoft Uighur"/><a:font script="Geor" typeface="Sylfaen"/><a:font script="Armn" typeface="Arial"/><a:font script="Bugi" typeface="Leelawadee UI"/><a:font script="Bopo" typeface="Microsoft JhengHei"/><a:font script="Java" typeface="Javanese Text"/><a:font script="Lisu" typeface="Segoe UI"/><a:font script="Mymr" typeface="Myanmar Text"/><a:font script="Nkoo" typeface="Ebrima"/><a:font script="Olck" typeface="Nirmala UI"/><a:font script="Osma" typeface="Ebrima"/><a:font script="Phag" typeface="Phagspa"/><a:font script="Syrn" typeface="Estrangelo Edessa"/><a:font script="Syrj" typeface="Estrangelo Edessa"/><a:font script="Syre" typeface="Estrangelo Edessa"/><a:font script="Sora" typeface="Nirmala UI"/><a:font script="Tale" typeface="Microsoft Tai Le"/><a:font script="Talu" typeface="Microsoft New Tai Lue"/><a:font script="Tfng" typeface="Ebrima"/></a:majorFont><a:minorFont><a:latin typeface="Aptos" panose="02110004020202020204"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Jpan" typeface="\u6E38\u30B4\u30B7\u30C3\u30AF"/><a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/><a:font script="Hans" typeface="\u7B49\u7EBF"/><a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/><a:font script="Arab" typeface="Arial"/><a:font script="Hebr" typeface="Arial"/><a:font script="Thai" typeface="Cordia New"/><a:font script="Ethi" typeface="Nyala"/><a:font script="Beng" typeface="Vrinda"/><a:font script="Gujr" typeface="Shruti"/><a:font script="Khmr" typeface="DaunPenh"/><a:font script="Knda" typeface="Tunga"/><a:font script="Guru" typeface="Raavi"/><a:font script="Cans" typeface="Euphemia"/><a:font script="Cher" typeface="Plantagenet Cherokee"/><a:font script="Yiii" typeface="Microsoft Yi Baiti"/><a:font script="Tibt" typeface="Microsoft Himalaya"/><a:font script="Thaa" typeface="MV Boli"/><a:font script="Deva" typeface="Mangal"/><a:font script="Telu" typeface="Gautami"/><a:font script="Taml" typeface="Latha"/><a:font script="Syrc" typeface="Estrangelo Edessa"/><a:font script="Orya" typeface="Kalinga"/><a:font script="Mlym" typeface="Kartika"/><a:font script="Laoo" typeface="DokChampa"/><a:font script="Sinh" typeface="Iskoola Pota"/><a:font script="Mong" typeface="Mongolian Baiti"/><a:font script="Viet" typeface="Arial"/><a:font script="Uigh" typeface="Microsoft Uighur"/><a:font script="Geor" typeface="Sylfaen"/><a:font script="Armn" typeface="Arial"/><a:font script="Bugi" typeface="Leelawadee UI"/><a:font script="Bopo" typeface="Microsoft JhengHei"/><a:font script="Java" typeface="Javanese Text"/><a:font script="Lisu" typeface="Segoe UI"/><a:font script="Mymr" typeface="Myanmar Text"/><a:font script="Nkoo" typeface="Ebrima"/><a:font script="Olck" typeface="Nirmala UI"/><a:font script="Osma" typeface="Ebrima"/><a:font script="Phag" typeface="Phagspa"/><a:font script="Syrn" typeface="Estrangelo Edessa"/><a:font script="Syrj" typeface="Estrangelo Edessa"/><a:font script="Syre" typeface="Estrangelo Edessa"/><a:font script="Sora" typeface="Nirmala UI"/><a:font script="Tale" typeface="Microsoft Tai Le"/><a:font script="Talu" typeface="Microsoft New Tai Lue"/><a:font script="Tfng" typeface="Ebrima"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:satMod val="110000"/><a:lumMod val="100000"/><a:shade val="100000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:satMod val="130000"/><a:shade val="90000"/><a:lumMod val="103000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="63000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/><a:extLst><a:ext uri="{05A4C25C-085E-4340-85A3-A5531E510DB2}"><thm15:themeFamily xmlns:thm15="http://schemas.microsoft.com/office/thememl/2012/main" name="Office Theme" id="{62F939B6-93AF-4DB8-9C6B-D6C7DFDC589F}" vid="{4A3C46E8-61CC-4603-A589-7422A47A8E4A}"/></a:ext></a:extLst></a:theme>';
var WORD_BLANK_SETTINGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:settings xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:sl="http://schemas.openxmlformats.org/schemaLibrary/2006/main" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du"><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/><w:hyphenationZone w:val="425"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/><w:compatSetting w:name="overrideTableStyleFontSizeAndJustification" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/><w:compatSetting w:name="enableOpenTypeFeatures" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/><w:compatSetting w:name="doNotFlipMirrorIndents" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/><w:compatSetting w:name="differentiateMultirowTableHeaders" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/><w:compatSetting w:name="useWord2013TrackBottomHyphenation" w:uri="http://schemas.microsoft.com/office/word" w:val="0"/></w:compat><m:mathPr><m:mathFont m:val="Cambria Math"/><m:brkBin m:val="before"/><m:brkBinSub m:val="--"/><m:smallFrac m:val="0"/><m:dispDef/><m:lMargin m:val="0"/><m:rMargin m:val="0"/><m:defJc m:val="centerGroup"/><m:wrapIndent m:val="1440"/><m:intLim m:val="subSup"/><m:naryLim m:val="undOvr"/></m:mathPr><w:themeFontLang w:val="pt-BR"/><w:clrSchemeMapping w:bg1="light1" w:t1="dark1" w:bg2="light2" w:t2="dark2" w:accent1="accent1" w:accent2="accent2" w:accent3="accent3" w:accent4="accent4" w:accent5="accent5" w:accent6="accent6" w:hyperlink="hyperlink" w:followedHyperlink="followedHyperlink"/><w:shapeDefaults><o:shapedefaults v:ext="edit" spidmax="1026"/><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout></w:shapeDefaults><w:decimalSymbol w:val=","/><w:listSeparator w:val=";"/><w15:chartTrackingRefBased/></w:settings>';
var WORD_BLANK_FONT_TABLE = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:fonts xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du"><w:font w:name="Aptos"><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/><w:sig w:usb0="20000287" w:usb1="00000003" w:usb2="00000000" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/></w:font><w:font w:name="Times New Roman"><w:panose1 w:val="02020603050405020304"/><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/><w:sig w:usb0="E0002EFF" w:usb1="C000785B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/></w:font><w:font w:name="Aptos Display"><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/><w:sig w:usb0="20000287" w:usb1="00000003" w:usb2="00000000" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/></w:font></w:fonts>';
var WORD_BLANK_SECTPR = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';
var WORD_BUILTIN_STYLES = [
  ["annotation reference", "Ref. de coment\xE1rio", '<w:style w:type="character" w:styleId="Refdecomentrio"><w:name w:val="annotation reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>'],
  ["annotation subject", "Assunto do coment\xE1rio", '<w:style w:type="paragraph" w:styleId="Assuntodocomentrio"><w:name w:val="annotation subject"/><w:basedOn w:val="Textodecomentrio"/><w:next w:val="Textodecomentrio"/><w:link w:val="AssuntodocomentrioChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:b/><w:bCs/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="AssuntodocomentrioChar"><w:name w:val="Assunto do coment\xE1rio Char"/><w:basedOn w:val="TextodecomentrioChar"/><w:link w:val="Assuntodocomentrio"/><w:uiPriority w:val="99"/><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["annotation text", "Texto de coment\xE1rio", '<w:style w:type="paragraph" w:styleId="Textodecomentrio"><w:name w:val="annotation text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodecomentrioChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TextodecomentrioChar"><w:name w:val="Texto de coment\xE1rio Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodecomentrio"/><w:uiPriority w:val="99"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["Balloon Text", "Texto de bal\xE3o", '<w:style w:type="paragraph" w:styleId="Textodebalo"><w:name w:val="Balloon Text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodebaloChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TextodebaloChar"><w:name w:val="Texto de bal\xE3o Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodebalo"/><w:uiPriority w:val="99"/><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>'],
  ["Bibliography", "Bibliografia", '<w:style w:type="paragraph" w:styleId="Bibliografia"><w:name w:val="Bibliography"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="37"/><w:unhideWhenUsed/></w:style>'],
  ["Block Text", "Texto em bloco", '<w:style w:type="paragraph" w:styleId="Textoembloco"><w:name w:val="Block Text"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:pBdr><w:top w:val="single" w:sz="2" w:space="10" w:color="156082" w:themeColor="accent1"/><w:left w:val="single" w:sz="2" w:space="10" w:color="156082" w:themeColor="accent1"/><w:bottom w:val="single" w:sz="2" w:space="10" w:color="156082" w:themeColor="accent1"/><w:right w:val="single" w:sz="2" w:space="10" w:color="156082" w:themeColor="accent1"/></w:pBdr><w:ind w:left="1152" w:right="1152"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="minorEastAsia"/><w:i/><w:iCs/><w:color w:val="156082" w:themeColor="accent1"/></w:rPr></w:style>'],
  ["Body Text", "Corpo de texto", '<w:style w:type="paragraph" w:styleId="Corpodetexto"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/><w:link w:val="CorpodetextoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="CorpodetextoChar"><w:name w:val="Corpo de texto Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Corpodetexto"/><w:uiPriority w:val="99"/></w:style>'],
  ["Body Text 2", "Corpo de texto 2", '<w:style w:type="paragraph" w:styleId="Corpodetexto2"><w:name w:val="Body Text 2"/><w:basedOn w:val="Normal"/><w:link w:val="Corpodetexto2Char"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120" w:line="480" w:lineRule="auto"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Corpodetexto2Char"><w:name w:val="Corpo de texto 2 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Corpodetexto2"/><w:uiPriority w:val="99"/></w:style>'],
  ["Body Text 3", "Corpo de texto 3", '<w:style w:type="paragraph" w:styleId="Corpodetexto3"><w:name w:val="Body Text 3"/><w:basedOn w:val="Normal"/><w:link w:val="Corpodetexto3Char"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Corpodetexto3Char"><w:name w:val="Corpo de texto 3 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Corpodetexto3"/><w:uiPriority w:val="99"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>'],
  ["Body Text First Indent", "Primeiro recuo de corpo de texto", '<w:style w:type="paragraph" w:styleId="Primeirorecuodecorpodetexto"><w:name w:val="Body Text First Indent"/><w:basedOn w:val="Corpodetexto"/><w:link w:val="PrimeirorecuodecorpodetextoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="160"/><w:ind w:firstLine="360"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="PrimeirorecuodecorpodetextoChar"><w:name w:val="Primeiro recuo de corpo de texto Char"/><w:basedOn w:val="CorpodetextoChar"/><w:link w:val="Primeirorecuodecorpodetexto"/><w:uiPriority w:val="99"/></w:style>'],
  ["Body Text First Indent 2", "Primeiro recuo de corpo de texto 2", '<w:style w:type="paragraph" w:styleId="Primeirorecuodecorpodetexto2"><w:name w:val="Body Text First Indent 2"/><w:basedOn w:val="Recuodecorpodetexto"/><w:link w:val="Primeirorecuodecorpodetexto2Char"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="160"/><w:ind w:left="360" w:firstLine="360"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Primeirorecuodecorpodetexto2Char"><w:name w:val="Primeiro recuo de corpo de texto 2 Char"/><w:basedOn w:val="RecuodecorpodetextoChar"/><w:link w:val="Primeirorecuodecorpodetexto2"/><w:uiPriority w:val="99"/></w:style>'],
  ["Body Text Indent", "Recuo de corpo de texto", '<w:style w:type="paragraph" w:styleId="Recuodecorpodetexto"><w:name w:val="Body Text Indent"/><w:basedOn w:val="Normal"/><w:link w:val="RecuodecorpodetextoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/><w:ind w:left="283"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="RecuodecorpodetextoChar"><w:name w:val="Recuo de corpo de texto Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Recuodecorpodetexto"/><w:uiPriority w:val="99"/></w:style>'],
  ["Body Text Indent 2", "Recuo de corpo de texto 2", '<w:style w:type="paragraph" w:styleId="Recuodecorpodetexto2"><w:name w:val="Body Text Indent 2"/><w:basedOn w:val="Normal"/><w:link w:val="Recuodecorpodetexto2Char"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120" w:line="480" w:lineRule="auto"/><w:ind w:left="283"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Recuodecorpodetexto2Char"><w:name w:val="Recuo de corpo de texto 2 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Recuodecorpodetexto2"/><w:uiPriority w:val="99"/></w:style>'],
  ["Body Text Indent 3", "Recuo de corpo de texto 3", '<w:style w:type="paragraph" w:styleId="Recuodecorpodetexto3"><w:name w:val="Body Text Indent 3"/><w:basedOn w:val="Normal"/><w:link w:val="Recuodecorpodetexto3Char"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/><w:ind w:left="283"/></w:pPr><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Recuodecorpodetexto3Char"><w:name w:val="Recuo de corpo de texto 3 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Recuodecorpodetexto3"/><w:uiPriority w:val="99"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>'],
  ["Book Title", "T\xEDtulo do Livro", '<w:style w:type="character" w:styleId="TtulodoLivro"><w:name w:val="Book Title"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="33"/><w:qFormat/><w:rPr><w:b/><w:bCs/><w:i/><w:iCs/><w:spacing w:val="5"/></w:rPr></w:style>'],
  ["caption", "Legenda", '<w:style w:type="paragraph" w:styleId="Legenda"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="35"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:spacing w:after="200" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="0E2841" w:themeColor="text2"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>'],
  ["Closing", "Encerramento", '<w:style w:type="paragraph" w:styleId="Encerramento"><w:name w:val="Closing"/><w:basedOn w:val="Normal"/><w:link w:val="EncerramentoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="4252"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="EncerramentoChar"><w:name w:val="Encerramento Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Encerramento"/><w:uiPriority w:val="99"/></w:style>'],
  ["Date", "Data", '<w:style w:type="paragraph" w:styleId="Data"><w:name w:val="Date"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="DataChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="DataChar"><w:name w:val="Data Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Data"/><w:uiPriority w:val="99"/></w:style>'],
  ["Document Map", "Mapa do Documento", '<w:style w:type="paragraph" w:styleId="MapadoDocumento"><w:name w:val="Document Map"/><w:basedOn w:val="Normal"/><w:link w:val="MapadoDocumentoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="MapadoDocumentoChar"><w:name w:val="Mapa do Documento Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="MapadoDocumento"/><w:uiPriority w:val="99"/><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>'],
  ["E-mail Signature", "Assinatura de Email", '<w:style w:type="paragraph" w:styleId="AssinaturadeEmail"><w:name w:val="E-mail Signature"/><w:basedOn w:val="Normal"/><w:link w:val="AssinaturadeEmailChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="AssinaturadeEmailChar"><w:name w:val="Assinatura de Email Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="AssinaturadeEmail"/><w:uiPriority w:val="99"/></w:style>'],
  ["Emphasis", "\xCAnfase", '<w:style w:type="character" w:styleId="nfase"><w:name w:val="Emphasis"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="20"/><w:qFormat/><w:rPr><w:i/><w:iCs/></w:rPr></w:style>'],
  ["endnote reference", "Ref. de nota de fim", '<w:style w:type="character" w:styleId="Refdenotadefim"><w:name w:val="endnote reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>'],
  ["endnote text", "Texto de nota de fim", '<w:style w:type="paragraph" w:styleId="Textodenotadefim"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodenotadefimChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TextodenotadefimChar"><w:name w:val="Texto de nota de fim Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodenotadefim"/><w:uiPriority w:val="99"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["envelope address", "Destinat\xE1rio", '<w:style w:type="paragraph" w:styleId="Destinatrio"><w:name w:val="envelope address"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:framePr w:w="7938" w:h="1984" w:hRule="exact" w:hSpace="141" w:wrap="auto" w:hAnchor="page" w:xAlign="center" w:yAlign="bottom"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="2835"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>'],
  ["envelope return", "Remetente", '<w:style w:type="paragraph" w:styleId="Remetente"><w:name w:val="envelope return"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["FollowedHyperlink", "HiperlinkVisitado", '<w:style w:type="character" w:styleId="HiperlinkVisitado"><w:name w:val="FollowedHyperlink"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="96607D" w:themeColor="followedHyperlink"/><w:u w:val="single"/></w:rPr></w:style>'],
  ["footer", "Rodap\xE9", '<w:style w:type="paragraph" w:styleId="Rodap"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:link w:val="RodapChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4252"/><w:tab w:val="right" w:pos="8504"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="RodapChar"><w:name w:val="Rodap\xE9 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Rodap"/><w:uiPriority w:val="99"/></w:style>'],
  ["footnote reference", "Ref. de nota de rodap\xE9", '<w:style w:type="character" w:styleId="Refdenotaderodap"><w:name w:val="footnote reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>'],
  ["footnote text", "Texto de nota de rodap\xE9", '<w:style w:type="paragraph" w:styleId="Textodenotaderodap"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:link w:val="TextodenotaderodapChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TextodenotaderodapChar"><w:name w:val="Texto de nota de rodap\xE9 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodenotaderodap"/><w:uiPriority w:val="99"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["Hashtag", "Hashtag", '<w:style w:type="character" w:styleId="Hashtag"><w:name w:val="Hashtag"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="2B579A"/><w:shd w:val="clear" w:color="auto" w:fill="E1DFDD"/></w:rPr></w:style>'],
  ["header", "Cabe\xE7alho", '<w:style w:type="paragraph" w:styleId="Cabealho"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:link w:val="CabealhoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4252"/><w:tab w:val="right" w:pos="8504"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="CabealhoChar"><w:name w:val="Cabe\xE7alho Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Cabealho"/><w:uiPriority w:val="99"/></w:style>'],
  ["heading 1", "T\xEDtulo 1", '<w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo1Char"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="360" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo1Char"><w:name w:val="T\xEDtulo 1 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo1"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>'],
  ["heading 2", "T\xEDtulo 2", '<w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo2Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo2Char"><w:name w:val="T\xEDtulo 2 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo2"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>'],
  ["heading 3", "T\xEDtulo 3", '<w:style w:type="paragraph" w:styleId="Ttulo3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo3Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo3Char"><w:name w:val="T\xEDtulo 3 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo3"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'],
  ["heading 4", "T\xEDtulo 4", '<w:style w:type="paragraph" w:styleId="Ttulo4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo4Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="80" w:after="40"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo4Char"><w:name w:val="T\xEDtulo 4 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo4"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>'],
  ["heading 5", "T\xEDtulo 5", '<w:style w:type="paragraph" w:styleId="Ttulo5"><w:name w:val="heading 5"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo5Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="80" w:after="40"/><w:outlineLvl w:val="4"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo5Char"><w:name w:val="T\xEDtulo 5 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo5"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>'],
  ["heading 6", "T\xEDtulo 6", '<w:style w:type="paragraph" w:styleId="Ttulo6"><w:name w:val="heading 6"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo6Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="5"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo6Char"><w:name w:val="T\xEDtulo 6 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo6"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style>'],
  ["heading 7", "T\xEDtulo 7", '<w:style w:type="paragraph" w:styleId="Ttulo7"><w:name w:val="heading 7"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo7Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="6"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo7Char"><w:name w:val="T\xEDtulo 7 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo7"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/></w:rPr></w:style>'],
  ["heading 8", "T\xEDtulo 8", '<w:style w:type="paragraph" w:styleId="Ttulo8"><w:name w:val="heading 8"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo8Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:after="0"/><w:outlineLvl w:val="7"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo8Char"><w:name w:val="T\xEDtulo 8 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo8"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:i/><w:iCs/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style>'],
  ["heading 9", "T\xEDtulo 9", '<w:style w:type="paragraph" w:styleId="Ttulo9"><w:name w:val="heading 9"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="Ttulo9Char"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:after="0"/><w:outlineLvl w:val="8"/></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Ttulo9Char"><w:name w:val="T\xEDtulo 9 Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo9"/><w:uiPriority w:val="9"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="272727" w:themeColor="text1" w:themeTint="D8"/></w:rPr></w:style>'],
  ["HTML Acronym", "Acr\xF4nimo HTML", '<w:style w:type="character" w:styleId="AcrnimoHTML"><w:name w:val="HTML Acronym"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/></w:style>'],
  ["HTML Address", "Endere\xE7o HTML", '<w:style w:type="paragraph" w:styleId="EndereoHTML"><w:name w:val="HTML Address"/><w:basedOn w:val="Normal"/><w:link w:val="EndereoHTMLChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:iCs/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="EndereoHTMLChar"><w:name w:val="Endere\xE7o HTML Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="EndereoHTML"/><w:uiPriority w:val="99"/><w:rPr><w:i/><w:iCs/></w:rPr></w:style>'],
  ["HTML Cite", "Cita\xE7\xE3o HTML", '<w:style w:type="character" w:styleId="CitaoHTML"><w:name w:val="HTML Cite"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:i/><w:iCs/></w:rPr></w:style>'],
  ["HTML Code", "C\xF3digo HTML", '<w:style w:type="character" w:styleId="CdigoHTML"><w:name w:val="HTML Code"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["HTML Definition", "Defini\xE7\xE3o HTML", '<w:style w:type="character" w:styleId="DefinioHTML"><w:name w:val="HTML Definition"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:i/><w:iCs/></w:rPr></w:style>'],
  ["HTML Keyboard", "Teclado HTML", '<w:style w:type="character" w:styleId="TecladoHTML"><w:name w:val="HTML Keyboard"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["HTML Preformatted", "Pr\xE9-formata\xE7\xE3o HTML", '<w:style w:type="paragraph" w:styleId="Pr-formataoHTML"><w:name w:val="HTML Preformatted"/><w:basedOn w:val="Normal"/><w:link w:val="Pr-formataoHTMLChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="Pr-formataoHTMLChar"><w:name w:val="Pr\xE9-formata\xE7\xE3o HTML Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Pr-formataoHTML"/><w:uiPriority w:val="99"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["HTML Sample", "Exemplo HTML", '<w:style w:type="character" w:styleId="ExemploHTML"><w:name w:val="HTML Sample"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>'],
  ["HTML Typewriter", "M\xE1quina de escrever HTML", '<w:style w:type="character" w:styleId="MquinadeescreverHTML"><w:name w:val="HTML Typewriter"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["HTML Variable", "Vari\xE1vel HTML", '<w:style w:type="character" w:styleId="VarivelHTML"><w:name w:val="HTML Variable"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:i/><w:iCs/></w:rPr></w:style>'],
  ["Hyperlink", "Hyperlink", '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="467886" w:themeColor="hyperlink"/><w:u w:val="single"/></w:rPr></w:style>'],
  ["index 1", "Remissivo 1", '<w:style w:type="paragraph" w:styleId="Remissivo1"><w:name w:val="index 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="220" w:hanging="220"/></w:pPr></w:style>'],
  ["index 2", "Remissivo 2", '<w:style w:type="paragraph" w:styleId="Remissivo2"><w:name w:val="index 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="440" w:hanging="220"/></w:pPr></w:style>'],
  ["index 3", "Remissivo 3", '<w:style w:type="paragraph" w:styleId="Remissivo3"><w:name w:val="index 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="660" w:hanging="220"/></w:pPr></w:style>'],
  ["index 4", "Remissivo 4", '<w:style w:type="paragraph" w:styleId="Remissivo4"><w:name w:val="index 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="880" w:hanging="220"/></w:pPr></w:style>'],
  ["index 5", "Remissivo 5", '<w:style w:type="paragraph" w:styleId="Remissivo5"><w:name w:val="index 5"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="1100" w:hanging="220"/></w:pPr></w:style>'],
  ["index 6", "Remissivo 6", '<w:style w:type="paragraph" w:styleId="Remissivo6"><w:name w:val="index 6"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="1320" w:hanging="220"/></w:pPr></w:style>'],
  ["index 7", "Remissivo 7", '<w:style w:type="paragraph" w:styleId="Remissivo7"><w:name w:val="index 7"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="1540" w:hanging="220"/></w:pPr></w:style>'],
  ["index 8", "Remissivo 8", '<w:style w:type="paragraph" w:styleId="Remissivo8"><w:name w:val="index 8"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="1760" w:hanging="220"/></w:pPr></w:style>'],
  ["index 9", "Remissivo 9", '<w:style w:type="paragraph" w:styleId="Remissivo9"><w:name w:val="index 9"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="1980" w:hanging="220"/></w:pPr></w:style>'],
  ["index heading", "T\xEDtulo de \xEDndice remissivo", '<w:style w:type="paragraph" w:styleId="Ttulodendiceremissivo"><w:name w:val="index heading"/><w:basedOn w:val="Normal"/><w:next w:val="Remissivo1"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:b/><w:bCs/></w:rPr></w:style>'],
  ["Intense Emphasis", "\xCAnfase Intensa", '<w:style w:type="character" w:styleId="nfaseIntensa"><w:name w:val="Intense Emphasis"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="21"/><w:qFormat/><w:rPr><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>'],
  ["Intense Quote", "Cita\xE7\xE3o Intensa", '<w:style w:type="paragraph" w:styleId="CitaoIntensa"><w:name w:val="Intense Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="CitaoIntensaChar"/><w:uiPriority w:val="30"/><w:qFormat/><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="10" w:color="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:bottom w:val="single" w:sz="4" w:space="10" w:color="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:pBdr><w:spacing w:before="360" w:after="360"/><w:ind w:left="864" w:right="864"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="CitaoIntensaChar"><w:name w:val="Cita\xE7\xE3o Intensa Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="CitaoIntensa"/><w:uiPriority w:val="30"/><w:rPr><w:i/><w:iCs/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>'],
  ["Intense Reference", "Refer\xEAncia Intensa", '<w:style w:type="character" w:styleId="RefernciaIntensa"><w:name w:val="Intense Reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="32"/><w:qFormat/><w:rPr><w:b/><w:bCs/><w:smallCaps/><w:color w:val="0F4761" w:themeColor="accent1" w:themeShade="BF"/><w:spacing w:val="5"/></w:rPr></w:style>'],
  ["line number", "N\xFAmero de linha", '<w:style w:type="character" w:styleId="Nmerodelinha"><w:name w:val="line number"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/></w:style>'],
  ["List", "Lista", '<w:style w:type="paragraph" w:styleId="Lista"><w:name w:val="List"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:ind w:left="283" w:hanging="283"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List 2", "Lista 2", '<w:style w:type="paragraph" w:styleId="Lista2"><w:name w:val="List 2"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:ind w:left="566" w:hanging="283"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List 3", "Lista 3", '<w:style w:type="paragraph" w:styleId="Lista3"><w:name w:val="List 3"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:ind w:left="849" w:hanging="283"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List 4", "Lista 4", '<w:style w:type="paragraph" w:styleId="Lista4"><w:name w:val="List 4"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:ind w:left="1132" w:hanging="283"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List 5", "Lista 5", '<w:style w:type="paragraph" w:styleId="Lista5"><w:name w:val="List 5"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:ind w:left="1415" w:hanging="283"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Bullet", "Com marcadores", '<w:style w:type="paragraph" w:styleId="Commarcadores"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="4"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Bullet 2", "Com marcadores 2", '<w:style w:type="paragraph" w:styleId="Commarcadores2"><w:name w:val="List Bullet 2"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="5"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Bullet 3", "Com marcadores 3", '<w:style w:type="paragraph" w:styleId="Commarcadores3"><w:name w:val="List Bullet 3"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="6"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Bullet 4", "Com marcadores 4", '<w:style w:type="paragraph" w:styleId="Commarcadores4"><w:name w:val="List Bullet 4"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="7"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Bullet 5", "Com marcadores 5", '<w:style w:type="paragraph" w:styleId="Commarcadores5"><w:name w:val="List Bullet 5"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="8"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Continue", "Lista de continua\xE7\xE3o", '<w:style w:type="paragraph" w:styleId="Listadecontinuao"><w:name w:val="List Continue"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/><w:ind w:left="283"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Continue 2", "Lista de continua\xE7\xE3o 2", '<w:style w:type="paragraph" w:styleId="Listadecontinuao2"><w:name w:val="List Continue 2"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/><w:ind w:left="566"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Continue 3", "Lista de continua\xE7\xE3o 3", '<w:style w:type="paragraph" w:styleId="Listadecontinuao3"><w:name w:val="List Continue 3"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/><w:ind w:left="849"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Continue 4", "Lista de continua\xE7\xE3o 4", '<w:style w:type="paragraph" w:styleId="Listadecontinuao4"><w:name w:val="List Continue 4"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/><w:ind w:left="1132"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Continue 5", "Lista de continua\xE7\xE3o 5", '<w:style w:type="paragraph" w:styleId="Listadecontinuao5"><w:name w:val="List Continue 5"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="120"/><w:ind w:left="1415"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Number", "Numerada", '<w:style w:type="paragraph" w:styleId="Numerada"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="9"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Number 2", "Numerada 2", '<w:style w:type="paragraph" w:styleId="Numerada2"><w:name w:val="List Number 2"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="10"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Number 3", "Numerada 3", '<w:style w:type="paragraph" w:styleId="Numerada3"><w:name w:val="List Number 3"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="11"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Number 4", "Numerada 4", '<w:style w:type="paragraph" w:styleId="Numerada4"><w:name w:val="List Number 4"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="12"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Number 5", "Numerada 5", '<w:style w:type="paragraph" w:styleId="Numerada5"><w:name w:val="List Number 5"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:numPr><w:numId w:val="13"/></w:numPr><w:contextualSpacing/></w:pPr></w:style>'],
  ["List Paragraph", "Par\xE1grafo da Lista", '<w:style w:type="paragraph" w:styleId="PargrafodaLista"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/><w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>'],
  ["macro", "Texto de macro", '<w:style w:type="paragraph" w:styleId="Textodemacro"><w:name w:val="macro"/><w:link w:val="TextodemacroChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:tabs><w:tab w:val="left" w:pos="480"/><w:tab w:val="left" w:pos="960"/><w:tab w:val="left" w:pos="1440"/><w:tab w:val="left" w:pos="1920"/><w:tab w:val="left" w:pos="2400"/><w:tab w:val="left" w:pos="2880"/><w:tab w:val="left" w:pos="3360"/><w:tab w:val="left" w:pos="3840"/><w:tab w:val="left" w:pos="4320"/></w:tabs><w:spacing w:after="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TextodemacroChar"><w:name w:val="Texto de macro Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Textodemacro"/><w:uiPriority w:val="99"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'],
  ["Mention", "Men\xE7\xE3o", '<w:style w:type="character" w:styleId="Meno"><w:name w:val="Mention"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="2B579A"/><w:shd w:val="clear" w:color="auto" w:fill="E1DFDD"/></w:rPr></w:style>'],
  ["Message Header", "Cabe\xE7alho da mensagem", '<w:style w:type="paragraph" w:styleId="Cabealhodamensagem"><w:name w:val="Message Header"/><w:basedOn w:val="Normal"/><w:link w:val="CabealhodamensagemChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:space="1" w:color="auto"/><w:left w:val="single" w:sz="6" w:space="1" w:color="auto"/><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/><w:right w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr><w:shd w:val="pct20" w:color="auto" w:fill="auto"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="1134" w:hanging="1134"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="CabealhodamensagemChar"><w:name w:val="Cabe\xE7alho da mensagem Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Cabealhodamensagem"/><w:uiPriority w:val="99"/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:shd w:val="pct20" w:color="auto" w:fill="auto"/></w:rPr></w:style>'],
  ["No Spacing", "Sem Espa\xE7amento", '<w:style w:type="paragraph" w:styleId="SemEspaamento"><w:name w:val="No Spacing"/><w:uiPriority w:val="1"/><w:qFormat/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>'],
  ["Normal", "Normal", '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'],
  ["Normal (Web)", "Normal (Web)", '<w:style w:type="paragraph" w:styleId="NormalWeb"><w:name w:val="Normal (Web)"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>'],
  ["Normal Indent", "Recuo normal", '<w:style w:type="paragraph" w:styleId="Recuonormal"><w:name w:val="Normal Indent"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:ind w:left="708"/></w:pPr></w:style>'],
  ["Note Heading", "T\xEDtulo da nota", '<w:style w:type="paragraph" w:styleId="Ttulodanota"><w:name w:val="Note Heading"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="TtulodanotaChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TtulodanotaChar"><w:name w:val="T\xEDtulo da nota Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulodanota"/><w:uiPriority w:val="99"/></w:style>'],
  ["page number", "N\xFAmero de p\xE1gina", '<w:style w:type="character" w:styleId="Nmerodepgina"><w:name w:val="page number"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/></w:style>'],
  ["Placeholder Text", "Texto do Espa\xE7o Reservado", '<w:style w:type="character" w:styleId="TextodoEspaoReservado"><w:name w:val="Placeholder Text"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:semiHidden/><w:rPr><w:color w:val="666666"/></w:rPr></w:style>'],
  ["Plain Text", "Texto sem Formata\xE7\xE3o", '<w:style w:type="paragraph" w:styleId="TextosemFormatao"><w:name w:val="Plain Text"/><w:basedOn w:val="Normal"/><w:link w:val="TextosemFormataoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TextosemFormataoChar"><w:name w:val="Texto sem Formata\xE7\xE3o Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="TextosemFormatao"/><w:uiPriority w:val="99"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style>'],
  ["Quote", "Cita\xE7\xE3o", '<w:style w:type="paragraph" w:styleId="Citao"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="CitaoChar"/><w:uiPriority w:val="29"/><w:qFormat/><w:pPr><w:spacing w:before="160"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="404040" w:themeColor="text1" w:themeTint="BF"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="CitaoChar"><w:name w:val="Cita\xE7\xE3o Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Citao"/><w:uiPriority w:val="29"/><w:rPr><w:i/><w:iCs/><w:color w:val="404040" w:themeColor="text1" w:themeTint="BF"/></w:rPr></w:style>'],
  ["Salutation", "Sauda\xE7\xE3o", '<w:style w:type="paragraph" w:styleId="Saudao"><w:name w:val="Salutation"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="SaudaoChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="SaudaoChar"><w:name w:val="Sauda\xE7\xE3o Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Saudao"/><w:uiPriority w:val="99"/></w:style>'],
  ["Signature", "Assinatura", '<w:style w:type="paragraph" w:styleId="Assinatura"><w:name w:val="Signature"/><w:basedOn w:val="Normal"/><w:link w:val="AssinaturaChar"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="4252"/></w:pPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="AssinaturaChar"><w:name w:val="Assinatura Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Assinatura"/><w:uiPriority w:val="99"/></w:style>'],
  ["Smart Hyperlink", "Hiperlink inteligente", '<w:style w:type="character" w:styleId="Hiperlinkinteligente"><w:name w:val="Smart Hyperlink"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:u w:val="dotted"/></w:rPr></w:style>'],
  ["Smart Link", "Link inteligente", '<w:style w:type="character" w:styleId="Linkinteligente"><w:name w:val="Smart Link"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="0000FF"/><w:u w:val="single"/><w:shd w:val="clear" w:color="auto" w:fill="F3F2F1"/></w:rPr></w:style>'],
  ["Strong", "Forte", '<w:style w:type="character" w:styleId="Forte"><w:name w:val="Strong"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="22"/><w:qFormat/><w:rPr><w:b/><w:bCs/></w:rPr></w:style>'],
  ["Subtitle", "Subt\xEDtulo", '<w:style w:type="paragraph" w:styleId="Subttulo"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="SubttuloChar"/><w:uiPriority w:val="11"/><w:qFormat/><w:pPr><w:numPr><w:ilvl w:val="1"/></w:numPr></w:pPr><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/><w:spacing w:val="15"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="SubttuloChar"><w:name w:val="Subt\xEDtulo Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Subttulo"/><w:uiPriority w:val="11"/><w:rPr><w:rFonts w:eastAsiaTheme="majorEastAsia" w:cstheme="majorBidi"/><w:color w:val="595959" w:themeColor="text1" w:themeTint="A6"/><w:spacing w:val="15"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'],
  ["Subtle Emphasis", "\xCAnfase Sutil", '<w:style w:type="character" w:styleId="nfaseSutil"><w:name w:val="Subtle Emphasis"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="19"/><w:qFormat/><w:rPr><w:i/><w:iCs/><w:color w:val="404040" w:themeColor="text1" w:themeTint="BF"/></w:rPr></w:style>'],
  ["Subtle Reference", "Refer\xEAncia Sutil", '<w:style w:type="character" w:styleId="RefernciaSutil"><w:name w:val="Subtle Reference"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="31"/><w:qFormat/><w:rPr><w:smallCaps/><w:color w:val="5A5A5A" w:themeColor="text1" w:themeTint="A5"/></w:rPr></w:style>'],
  ["table of authorities", "\xCDndice de autoridades", '<w:style w:type="paragraph" w:styleId="ndicedeautoridades"><w:name w:val="table of authorities"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0"/><w:ind w:left="220" w:hanging="220"/></w:pPr></w:style>'],
  ["table of figures", "\xCDndice de ilustra\xE7\xF5es", '<w:style w:type="paragraph" w:styleId="ndicedeilustraes"><w:name w:val="table of figures"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>'],
  ["Title", "T\xEDtulo", '<w:style w:type="paragraph" w:styleId="Ttulo"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:link w:val="TtuloChar"/><w:uiPriority w:val="10"/><w:qFormat/><w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/><w:contextualSpacing/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:spacing w:val="-10"/><w:kern w:val="28"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>', '<w:style w:type="character" w:customStyle="1" w:styleId="TtuloChar"><w:name w:val="T\xEDtulo Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Ttulo"/><w:uiPriority w:val="10"/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:spacing w:val="-10"/><w:kern w:val="28"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>'],
  ["toa heading", "T\xEDtulo de \xEDndice de autoridades", '<w:style w:type="paragraph" w:styleId="Ttulodendicedeautoridades"><w:name w:val="toa heading"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:spacing w:before="120"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>'],
  ["toc 1", "Sum\xE1rio 1", '<w:style w:type="paragraph" w:styleId="Sumrio1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/></w:pPr></w:style>'],
  ["toc 2", "Sum\xE1rio 2", '<w:style w:type="paragraph" w:styleId="Sumrio2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="220"/></w:pPr></w:style>'],
  ["toc 3", "Sum\xE1rio 3", '<w:style w:type="paragraph" w:styleId="Sumrio3"><w:name w:val="toc 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="440"/></w:pPr></w:style>'],
  ["toc 4", "Sum\xE1rio 4", '<w:style w:type="paragraph" w:styleId="Sumrio4"><w:name w:val="toc 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="660"/></w:pPr></w:style>'],
  ["toc 5", "Sum\xE1rio 5", '<w:style w:type="paragraph" w:styleId="Sumrio5"><w:name w:val="toc 5"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="880"/></w:pPr></w:style>'],
  ["toc 6", "Sum\xE1rio 6", '<w:style w:type="paragraph" w:styleId="Sumrio6"><w:name w:val="toc 6"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="1100"/></w:pPr></w:style>'],
  ["toc 7", "Sum\xE1rio 7", '<w:style w:type="paragraph" w:styleId="Sumrio7"><w:name w:val="toc 7"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="1320"/></w:pPr></w:style>'],
  ["toc 8", "Sum\xE1rio 8", '<w:style w:type="paragraph" w:styleId="Sumrio8"><w:name w:val="toc 8"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="1540"/></w:pPr></w:style>'],
  ["toc 9", "Sum\xE1rio 9", '<w:style w:type="paragraph" w:styleId="Sumrio9"><w:name w:val="toc 9"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:autoRedefine/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:spacing w:after="100"/><w:ind w:left="1760"/></w:pPr></w:style>'],
  ["TOC Heading", "Cabe\xE7alho do Sum\xE1rio", '<w:style w:type="paragraph" w:styleId="CabealhodoSumrio"><w:name w:val="TOC Heading"/><w:basedOn w:val="Ttulo1"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:spacing w:before="240" w:after="0"/><w:outlineLvl w:val="9"/></w:pPr><w:rPr><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>'],
  ["Unresolved Mention", "Men\xE7\xE3o Pendente", '<w:style w:type="character" w:styleId="MenoPendente"><w:name w:val="Unresolved Mention"/><w:basedOn w:val="Fontepargpadro"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="605E5C"/><w:shd w:val="clear" w:color="auto" w:fill="E1DFDD"/></w:rPr></w:style>']
];

// ../docx-core/src/blank.ts
var XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
var REL2 = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
var BLANK_STYLES_XML = WORD_BLANK_STYLES;
function blankDocxPackage() {
  const pkg = DocxPackage.empty();
  const ct = "application/vnd.openxmlformats-officedocument.";
  pkg.setPartText("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${ct}wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="${ct}wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="${ct}wordprocessingml.settings+xml"/><Override PartName="/word/fontTable.xml" ContentType="${ct}wordprocessingml.fontTable+xml"/><Override PartName="/word/theme/theme1.xml" ContentType="${ct}theme+xml"/></Types>`);
  pkg.setPartText("word/_rels/document.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL2}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${REL2}/settings" Target="settings.xml"/><Relationship Id="rId4" Type="${REL2}/fontTable" Target="fontTable.xml"/><Relationship Id="rId5" Type="${REL2}/theme" Target="theme/theme1.xml"/></Relationships>`);
  pkg.setPartText("word/document.xml", `${XML}<w:document xmlns:w="${W}" xmlns:r="${REL2}"><w:body><w:p/>${WORD_BLANK_SECTPR}</w:body></w:document>`);
  pkg.setPartText("word/styles.xml", WORD_BLANK_STYLES);
  pkg.setPartText("word/settings.xml", WORD_BLANK_SETTINGS);
  pkg.setPartText("word/fontTable.xml", WORD_BLANK_FONT_TABLE);
  pkg.setPartText("word/theme/theme1.xml", WORD_BLANK_THEME);
  return pkg;
}

// ../docx-core/src/style-sheet.ts
var esc6 = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var STYLE_ORDER = [
  "w:name",
  "w:aliases",
  "w:basedOn",
  "w:next",
  "w:link",
  "w:autoRedefine",
  "w:hidden",
  "w:uiPriority",
  "w:semiHidden",
  "w:unhideWhenUsed",
  "w:qFormat",
  "w:locked",
  "w:personal",
  "w:personalCompose",
  "w:personalReply",
  "w:rsid",
  "w:pPr",
  "w:rPr",
  "w:tblPr",
  "w:trPr",
  "w:tcPr",
  "w:tblStylePr"
];
var RPR_ORDER2 = [
  "w:rStyle",
  "w:rFonts",
  "w:b",
  "w:bCs",
  "w:i",
  "w:iCs",
  "w:caps",
  "w:smallCaps",
  "w:strike",
  "w:dstrike",
  "w:outline",
  "w:shadow",
  "w:emboss",
  "w:imprint",
  "w:noProof",
  "w:snapToGrid",
  "w:vanish",
  "w:webHidden",
  "w:color",
  "w:spacing",
  "w:w",
  "w:kern",
  "w:position",
  "w:sz",
  "w:szCs",
  "w:highlight",
  "w:u",
  "w:effect",
  "w:bdr",
  "w:shd",
  "w:fitText",
  "w:vertAlign",
  "w:rtl",
  "w:cs",
  "w:em",
  "w:lang",
  "w:eastAsianLayout",
  "w:specVanish",
  "w:oMath",
  "w:rPrChange"
];
var PPR_ORDER2 = [
  "w:pStyle",
  "w:keepNext",
  "w:keepLines",
  "w:pageBreakBefore",
  "w:framePr",
  "w:widowControl",
  "w:numPr",
  "w:suppressLineNumbers",
  "w:pBdr",
  "w:shd",
  "w:tabs",
  "w:suppressAutoHyphens",
  "w:kinsoku",
  "w:wordWrap",
  "w:overflowPunct",
  "w:topLinePunct",
  "w:autoSpaceDE",
  "w:autoSpaceDN",
  "w:bidi",
  "w:adjustRightInd",
  "w:snapToGrid",
  "w:spacing",
  "w:ind",
  "w:contextualSpacing",
  "w:mirrorIndents",
  "w:suppressOverlap",
  "w:jc",
  "w:textDirection",
  "w:textAlignment",
  "w:textboxTightWrap",
  "w:outlineLvl",
  "w:divId",
  "w:cnfStyle",
  "w:rPr",
  "w:sectPr",
  "w:pPrChange"
];
var val2 = (el3, n) => firstChild(el3, n)?.attrs["w:val"];
var onOff4 = (el3, n) => {
  const k = firstChild(el3, n);
  if (!k) return false;
  const v = k.attrs["w:val"];
  return v === void 0 || v !== "0" && v !== "false" && v !== "off";
};
var truthy = (v) => v === "1" || v === "true" || v === "on";
function readStyleIndex(xml) {
  const root = parseXml(xml, { positions: true });
  const styles = [];
  const all = childElements(root, "w:style");
  const last = /* @__PURE__ */ new Map();
  all.forEach((st, i2) => {
    const id = st.attrs["w:styleId"];
    if (id) last.set(id, i2);
  });
  for (const [i2, st] of all.entries()) {
    const id = st.attrs["w:styleId"];
    if (!id || last.get(id) !== i2) continue;
    const type = st.attrs["w:type"] ?? "paragraph";
    const prio = val2(st, "w:uiPriority");
    styles.push({
      id,
      type,
      name: val2(st, "w:name") ?? id,
      aliases: val2(st, "w:aliases"),
      custom: truthy(st.attrs["w:customStyle"]),
      isDefault: truthy(st.attrs["w:default"]),
      basedOn: val2(st, "w:basedOn"),
      next: val2(st, "w:next"),
      link: val2(st, "w:link"),
      autoRedefine: onOff4(st, "w:autoRedefine"),
      hidden: onOff4(st, "w:hidden"),
      uiPriority: prio !== void 0 ? parseInt(prio, 10) || 0 : 0,
      semiHidden: onOff4(st, "w:semiHidden"),
      unhideWhenUsed: onOff4(st, "w:unhideWhenUsed"),
      qFormat: onOff4(st, "w:qFormat"),
      start: st.s,
      end: st.e
    });
  }
  const ls = firstChild(root, "w:latentStyles");
  const a = ls?.attrs ?? {};
  const defaults = {
    uiPriority: a["w:defUIPriority"] !== void 0 ? parseInt(a["w:defUIPriority"], 10) || 0 : 99,
    semiHidden: truthy(a["w:defSemiHidden"]),
    unhideWhenUsed: truthy(a["w:defUnhideWhenUsed"]),
    qFormat: truthy(a["w:defQFormat"])
  };
  const items = [];
  for (const e of ls ? childElements(ls, "w:lsdException") : []) {
    const n = e.attrs["w:name"];
    if (!n) continue;
    const g = (k, d) => e.attrs[k] === void 0 ? d : truthy(e.attrs[k]);
    items.push({
      name: n,
      uiPriority: e.attrs["w:uiPriority"] !== void 0 ? parseInt(e.attrs["w:uiPriority"], 10) || 0 : defaults.uiPriority,
      semiHidden: g("w:semiHidden", defaults.semiHidden),
      unhideWhenUsed: g("w:unhideWhenUsed", defaults.unhideWhenUsed),
      qFormat: g("w:qFormat", defaults.qFormat)
    });
  }
  return { styles, latent: { defaults, items } };
}
function styleRaw(xml, id) {
  const s = readStyleIndex(xml).styles.find((x2) => x2.id === id);
  return s ? xml.slice(s.start, s.end) : void 0;
}
function putStyle(xml, id, styleXml2) {
  const s = readStyleIndex(xml).styles.find((x2) => x2.id === id);
  if (s) return xml.slice(0, s.start) + styleXml2 + xml.slice(s.end);
  const at = xml.lastIndexOf("</w:styles>");
  if (at < 0) throw new Error("styles.xml sem </w:styles>");
  return xml.slice(0, at) + styleXml2 + xml.slice(at);
}
function dropStyle(xml, id) {
  const spans = childElements(parseXml(xml, { positions: true }), "w:style").filter((st) => st.attrs["w:styleId"] === id).map((st) => [st.s, st.e]);
  for (const [s, e] of spans.reverse()) xml = xml.slice(0, s) + xml.slice(e);
  return xml;
}
function setLatentQFormat(xml, name, on) {
  const re = new RegExp(`<w:lsdException\\b[^>]*\\bw:name="${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"/g, "&quot;")}"[^>]*/>`);
  const m = re.exec(xml);
  if (!m) return xml;
  const tag = m[0];
  let out = tag.replace(/\s+w:qFormat="[^"]*"/, "");
  if (on) out = out.replace(/\s*\/>$/, ' w:qFormat="1"/>');
  return out === tag ? xml : xml.slice(0, m.index) + out + xml.slice(m.index + tag.length);
}
function styleIdFromName(name, taken) {
  const base = name.replace(/[^A-Za-z0-9-]/g, "") || "Estilo";
  if (!taken.has(base)) return base;
  for (let i2 = 0; ; i2++) if (!taken.has(`${base}${i2}`)) return `${base}${i2}`;
}
function newStyleXml(o) {
  return `<w:style w:type="${o.type}"${o.custom ? ' w:customStyle="1"' : ""} w:styleId="${esc6(o.id)}"><w:name w:val="${esc6(o.name)}"/>` + (o.basedOn ? `<w:basedOn w:val="${esc6(o.basedOn)}"/>` : "") + (o.next ? `<w:next w:val="${esc6(o.next)}"/>` : "") + (o.link ? `<w:link w:val="${esc6(o.link)}"/>` : "") + (o.autoRedefine ? "<w:autoRedefine/>" : "") + (o.uiPriority !== void 0 ? `<w:uiPriority w:val="${o.uiPriority}"/>` : "") + (o.semiHidden ? "<w:semiHidden/>" : "") + (o.unhideWhenUsed ? "<w:unhideWhenUsed/>" : "") + (o.qFormat ? "<w:qFormat/>" : "") + (o.pPr ?? "") + (o.rPr ?? "") + "</w:style>";
}
function patchStyleXml(raw, h) {
  const { open, close, kids } = splitElement(raw);
  let head = open;
  if (h.styleId !== void 0) head = withAttrs(head, "w:style", { "w:styleId": h.styleId });
  const set = (n, xml) => setKid2(kids, STYLE_ORDER, n, xml);
  const v = (n, x2) => {
    if (x2 === void 0) return;
    set(n, x2 === null ? null : `<${n} w:val="${esc6(x2)}"/>`);
  };
  if (h.name !== void 0) v("w:name", h.name);
  v("w:aliases", h.aliases);
  v("w:basedOn", h.basedOn);
  v("w:next", h.next);
  v("w:link", h.link);
  const flag = (n, on) => {
    if (on !== void 0) set(n, on ? `<${n}/>` : null);
  };
  flag("w:autoRedefine", h.autoRedefine);
  flag("w:semiHidden", h.semiHidden);
  flag("w:qFormat", h.qFormat);
  if (h.pPr !== void 0) set("w:pPr", h.pPr || null);
  if (h.rPr !== void 0) set("w:rPr", h.rPr || null);
  return head + kids.map((k) => k.raw).join("") + close;
}
function styleKid(raw, name) {
  return splitElement(raw).kids.find((k) => k.name === name)?.raw;
}
var RUN_KEYS = ["fontAscii", "szHalfPt", "bold", "italic", "underline", "strike", "allCaps", "smallCaps", "color", "charSpacingTwips"];
var PARA_KEYS = ["alignment", "spaceBeforeTwips", "spaceAfterTwips", "lineTwentieths", "indentLeftTwips", "indentRightTwips", "indentFirstLineTwips"];
var hasRunChanges = (f) => RUN_KEYS.some((k) => f[k] !== void 0);
var hasParaChanges = (f) => PARA_KEYS.some((k) => f[k] !== void 0);
function split(raw, tag) {
  return raw ? splitElement(raw) : { open: `<${tag}>`, close: `</${tag}>`, kids: [] };
}
var joinKids = (o) => o.kids.length ? o.open + o.kids.map((k) => k.raw).join("") + o.close : "";
var kidRaw2 = (kids, n) => kids.find((k) => k.name === n)?.raw ?? "";
function patchStyleRPr(raw, f) {
  const o = split(raw, "w:rPr");
  const set = (n, xml) => setKid2(o.kids, RPR_ORDER2, n, xml);
  const tog = (n, v) => {
    if (v === void 0) return;
    set(n, v === null ? null : v ? `<${n}/>` : `<${n} w:val="0"/>`);
  };
  if (f.fontAscii !== void 0) {
    const cur = kidRaw2(o.kids, "w:rFonts");
    if (f.fontAscii === null) {
      const x2 = cur ? withAttrs(cur, "w:rFonts", { "w:ascii": void 0, "w:hAnsi": void 0 }) : "";
      set("w:rFonts", /\sw:/.test(x2) ? x2 : null);
    } else {
      let x2 = cur;
      for (const [theme, plain2] of [["w:asciiTheme", "w:ascii"], ["w:hAnsiTheme", "w:hAnsi"]]) {
        const re = new RegExp(`\\s${theme}="[^"]*"`);
        if (re.test(x2) && !new RegExp(`\\s${plain2}="`).test(x2)) x2 = x2.replace(re, () => ` ${plain2}="${esc6(f.fontAscii)}"`);
      }
      set("w:rFonts", withAttrs(x2, "w:rFonts", {
        "w:ascii": f.fontAscii,
        "w:hAnsi": f.fontAscii,
        "w:asciiTheme": void 0,
        "w:hAnsiTheme": void 0
      }));
    }
  }
  tog("w:b", f.bold);
  tog("w:i", f.italic);
  tog("w:caps", f.allCaps);
  tog("w:smallCaps", f.smallCaps);
  tog("w:strike", f.strike);
  if (f.color !== void 0) set("w:color", f.color === null ? null : `<w:color w:val="${esc6(f.color)}"/>`);
  if (f.charSpacingTwips !== void 0) set("w:spacing", f.charSpacingTwips === null ? null : `<w:spacing w:val="${f.charSpacingTwips}"/>`);
  if (f.szHalfPt !== void 0) set("w:sz", f.szHalfPt === null ? null : `<w:sz w:val="${f.szHalfPt}"/>`);
  if (f.underline !== void 0) set("w:u", f.underline === null ? null : `<w:u w:val="${f.underline ? "single" : "none"}"/>`);
  return joinKids(o);
}
function patchStylePPr(raw, f) {
  const o = split(raw, "w:pPr");
  const set = (n, xml) => setKid2(o.kids, PPR_ORDER2, n, xml);
  if (f.alignment !== void 0) set("w:jc", f.alignment === null ? null : `<w:jc w:val="${f.alignment}"/>`);
  if (f.spaceBeforeTwips !== void 0 || f.spaceAfterTwips !== void 0 || f.lineTwentieths !== void 0) {
    const n = (v) => v === null ? void 0 : v;
    const ch = {};
    if (f.spaceBeforeTwips !== void 0) ch["w:before"] = n(f.spaceBeforeTwips);
    if (f.spaceAfterTwips !== void 0) ch["w:after"] = n(f.spaceAfterTwips);
    if (f.lineTwentieths !== void 0) {
      ch["w:line"] = n(f.lineTwentieths);
      ch["w:lineRule"] = f.lineTwentieths === null ? void 0 : "auto";
    }
    const x2 = withAttrs(kidRaw2(o.kids, "w:spacing"), "w:spacing", ch);
    set("w:spacing", /\sw:/.test(x2) ? x2 : null);
  }
  if (f.indentLeftTwips !== void 0 || f.indentRightTwips !== void 0 || f.indentFirstLineTwips !== void 0) {
    const ch = {};
    if (f.indentLeftTwips !== void 0) ch["w:left"] = f.indentLeftTwips ?? void 0;
    if (f.indentRightTwips !== void 0) ch["w:right"] = f.indentRightTwips ?? void 0;
    if (f.indentFirstLineTwips !== void 0) {
      const v = f.indentFirstLineTwips;
      ch["w:firstLine"] = v !== null && v > 0 ? v : void 0;
      ch["w:hanging"] = v !== null && v < 0 ? -v : void 0;
    }
    const x2 = withAttrs(kidRaw2(o.kids, "w:ind"), "w:ind", ch);
    set("w:ind", /\sw:/.test(x2) ? x2 : null);
  }
  return joinKids(o);
}
var byName = null;
function builtins() {
  if (!byName) {
    byName = /* @__PURE__ */ new Map();
    for (const [name, pt, xml, twin] of WORD_BUILTIN_STYLES) byName.set(name.toLowerCase(), { name, pt, xml, twin });
  }
  return byName;
}
function builtinStyle(name) {
  return builtins().get(name.toLowerCase());
}
function builtinStyles() {
  return [...builtins().values()];
}
var EXTRA_PT = {
  "default paragraph font": "Fonte par\xE1g. padr\xE3o",
  "normal table": "Tabela normal",
  "no list": "Sem lista",
  "table grid": "Tabela com grade"
};
var EN_WORDS = { toc: "TOC", toa: "TOA", html: "HTML", of: "of", annotation: "Comment" };
var EN_WHOLE = { macro: "Macro Text", "annotation text": "Comment Text", "annotation reference": "Comment Reference", "annotation subject": "Comment Subject" };
function builtinDisplayName(name, lang) {
  const k = name.toLowerCase();
  const b = builtins().get(k);
  if (lang === "pt") return b?.pt ?? EXTRA_PT[k];
  if (!b && !EXTRA_PT[k]) return void 0;
  if (EN_WHOLE[k]) return EN_WHOLE[k];
  return name.split(" ").map((w, i2) => EN_WORDS[w.toLowerCase()] && (i2 > 0 || w.toLowerCase() !== "of") ? EN_WORDS[w.toLowerCase()] : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function builtinXml(xml, opts = {}) {
  let out = xml;
  if (opts.id) out = out.replace(/w:styleId="[^"]*"/, () => `w:styleId="${esc6(opts.id)}"`);
  for (const [from, to] of Object.entries(opts.refs ?? {})) {
    out = out.replace(new RegExp(`(<w:(?:basedOn|next|link) w:val=")${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(")`, "g"), (_m, a, b) => a + esc6(to) + b);
  }
  if (opts.used && /<w:unhideWhenUsed\/>/.test(out)) out = out.replace("<w:semiHidden/>", "");
  return out;
}

// ../docx-core/src/doc/cfb.ts
var CFB_SIGNATURE = [208, 207, 17, 224, 161, 177, 26, 225];
var MAXREGSECT = 4294967290;
var ENDOFCHAIN = 4294967294;
var FREESECT = 4294967295;
var NOSTREAM = 4294967295;
function isCfbBytes(bytes) {
  if (bytes.length < 8) return false;
  for (let i2 = 0; i2 < 8; i2++) if (bytes[i2] !== CFB_SIGNATURE[i2]) return false;
  return true;
}
var CfbFile = class {
  entries;
  bytes;
  view;
  sectorShift;
  miniSectorShift;
  miniCutoff;
  fat;
  miniFat;
  miniStream;
  rootStart;
  rootSize;
  byPath = /* @__PURE__ */ new Map();
  constructor(bytes) {
    if (!isCfbBytes(bytes)) throw new Error("Arquivo n\xE3o \xE9 um Compound File (assinatura D0CF11E0 ausente)");
    if (bytes.length < 512) throw new Error("Compound File truncado (cabe\xE7alho incompleto)");
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const major = v.getUint16(26, true);
    if (v.getUint16(28, true) !== 65534) throw new Error("Compound File com byte order inv\xE1lido");
    this.sectorShift = v.getUint16(30, true);
    this.miniSectorShift = v.getUint16(32, true);
    if (this.sectorShift < 7 || this.sectorShift > 16) throw new Error(`Compound File com setor inv\xE1lido (2^${this.sectorShift})`);
    if (this.miniSectorShift < 2 || this.miniSectorShift > this.sectorShift) throw new Error("Compound File com mini setor inv\xE1lido");
    const numFatSectors = v.getUint32(44, true);
    const firstDirSector = v.getUint32(48, true);
    this.miniCutoff = v.getUint32(56, true) || 4096;
    const firstMiniFatSector = v.getUint32(60, true);
    const numMiniFatSectors = v.getUint32(64, true);
    const firstDifatSector = v.getUint32(68, true);
    const numDifatSectors = v.getUint32(72, true);
    const sectorSize = 1 << this.sectorShift;
    const fileSectors = Math.max(0, Math.ceil(bytes.length / sectorSize) - 1);
    const inFile = (s) => s < fileSectors;
    const fatSectors = [];
    const addFat = (s) => {
      if (s <= MAXREGSECT) fatSectors.push(s);
    };
    for (let i2 = 0; i2 < 109; i2++) addFat(v.getUint32(76 + i2 * 4, true));
    let difat = firstDifatSector;
    const perDifat = sectorSize / 4 - 1;
    const seenDifat = /* @__PURE__ */ new Set();
    const perSector = sectorSize / 4;
    const maxFatSectors = Math.ceil((fileSectors + 1) / perSector);
    for (let n = 0; n < numDifatSectors && difat <= MAXREGSECT && inFile(difat) && fatSectors.length < maxFatSectors; n++) {
      if (seenDifat.has(difat)) throw new Error("Compound File com ciclo na DIFAT");
      seenDifat.add(difat);
      const off = this.sectorOffset(difat);
      for (let i2 = 0; i2 < perDifat; i2++) addFat(this.u32At(off + i2 * 4));
      difat = this.u32At(off + perDifat * 4);
    }
    const fatCount = Math.min(fatSectors.length, numFatSectors || fatSectors.length, maxFatSectors);
    this.fat = new Uint32Array(fatCount * perSector);
    for (let i2 = 0; i2 < fatCount; i2++) {
      const off = this.sectorOffset(fatSectors[i2]);
      for (let j = 0; j < perSector; j++) this.fat[i2 * perSector + j] = this.u32At(off + j * 4);
    }
    const miniFatBytes = numMiniFatSectors > 0 && firstMiniFatSector <= MAXREGSECT ? this.readChain(firstMiniFatSector, numMiniFatSectors * sectorSize) : new Uint8Array(0);
    this.miniFat = new Uint32Array(miniFatBytes.length >> 2);
    const mfv = new DataView(miniFatBytes.buffer, miniFatBytes.byteOffset, miniFatBytes.byteLength);
    for (let i2 = 0; i2 < this.miniFat.length; i2++) this.miniFat[i2] = mfv.getUint32(i2 * 4, true);
    const dir = this.readChain(firstDirSector, -1);
    const dv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
    const raw = [];
    for (let off = 0; off + 128 <= dir.length; off += 128) {
      const nameLen = dv.getUint16(off + 64, true);
      let name = "";
      const chars = Math.max(0, Math.min(32, nameLen / 2) - 1);
      for (let i2 = 0; i2 < chars; i2++) name += String.fromCharCode(dv.getUint16(off + i2 * 2, true));
      const sizeLo = dv.getUint32(off + 120, true);
      const sizeHi = dv.getUint32(off + 124, true);
      const size = major === 3 ? sizeLo : sizeLo + sizeHi * 4294967296;
      raw.push({
        name,
        type: dv.getUint8(off + 66),
        left: dv.getUint32(off + 68, true),
        right: dv.getUint32(off + 72, true),
        child: dv.getUint32(off + 76, true),
        start: dv.getUint32(off + 116, true),
        size
      });
    }
    const root = raw[0];
    if (!root || root.type !== 5) throw new Error("Compound File sem entrada raiz");
    this.rootStart = root.start;
    this.rootSize = root.size;
    this.entries = [{ name: root.name, path: "", type: "root", size: root.size, start: root.start }];
    const visited = /* @__PURE__ */ new Set([0]);
    const MAX_DEPTH = 32;
    const walk = (id, prefix, depth = 0) => {
      const stack = [];
      let cur = id;
      while (stack.length || cur !== NOSTREAM && cur < raw.length) {
        while (cur !== NOSTREAM && cur < raw.length) {
          if (visited.has(cur)) {
            cur = NOSTREAM;
            break;
          }
          visited.add(cur);
          stack.push(cur);
          cur = raw[cur].left;
        }
        const top = stack.pop();
        if (top === void 0) break;
        const e = raw[top];
        const path = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.type === 1 || e.type === 2) {
          const entry = { name: e.name, path, type: e.type === 1 ? "storage" : "stream", size: e.size, start: e.start };
          this.entries.push(entry);
          this.byPath.set(path.toLowerCase(), entry);
          if (e.type === 1 && e.child !== NOSTREAM && depth < MAX_DEPTH) walk(e.child, path, depth + 1);
        }
        cur = e.right;
      }
    };
    if (root.child !== NOSTREAM) walk(root.child, "");
  }
  /** Lê um stream pelo caminho (case-insensitive, como no Windows). */
  getStream(path) {
    const e = this.byPath.get(path.toLowerCase());
    if (!e || e.type !== "stream") return void 0;
    if (e.size === 0) return new Uint8Array(0);
    if (e.size < this.miniCutoff) return this.readMiniChain(e.start, e.size);
    return this.readChain(e.start, e.size);
  }
  /** Há um stream/storage com esse caminho? */
  has(path) {
    return this.byPath.has(path.toLowerCase());
  }
  /** Offset do setor (multiplicação: `<<` estoura 32 bits em setores ≥ 2^22 e fica negativo). */
  sectorOffset(sector) {
    return (sector + 1) * (1 << this.sectorShift);
  }
  u32At(off) {
    return off + 4 <= this.bytes.length ? this.view.getUint32(off, true) : FREESECT;
  }
  /** Lê uma cadeia da FAT. `size < 0` = cadeia inteira. */
  readChain(start, size) {
    const sectorSize = 1 << this.sectorShift;
    const sectors = [];
    const limit = this.fat.length + 1;
    let s = start;
    while (s <= MAXREGSECT) {
      if (sectors.length > limit) throw new Error("Compound File com ciclo na FAT");
      sectors.push(s);
      if (size >= 0 && sectors.length * sectorSize >= size) break;
      s = s < this.fat.length ? this.fat[s] : ENDOFCHAIN;
    }
    const chainBytes = sectors.length * sectorSize;
    const total = Math.min(size >= 0 ? size : chainBytes, chainBytes, this.bytes.length);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const sec of sectors) {
      if (pos >= total) break;
      const off = this.sectorOffset(sec);
      const n = Math.min(sectorSize, total - pos);
      const avail = Math.max(0, Math.min(n, this.bytes.length - off));
      if (avail > 0) out.set(this.bytes.subarray(off, off + avail), pos);
      pos += n;
    }
    return out;
  }
  /** Lê uma cadeia da miniFAT (dentro do mini stream da raiz). */
  readMiniChain(start, size) {
    if (!this.miniStream) this.miniStream = this.readChain(this.rootStart, this.rootSize);
    const mini = this.miniStream;
    const ms = 1 << this.miniSectorShift;
    const out = new Uint8Array(Math.min(size, mini.length));
    size = out.length;
    let pos = 0;
    let s = start;
    let guard = 0;
    while (s <= MAXREGSECT && pos < size) {
      if (guard++ > this.miniFat.length + 1) throw new Error("Compound File com ciclo na miniFAT");
      const off = s * ms;
      const n = Math.min(ms, size - pos);
      const avail = Math.max(0, Math.min(n, mini.length - off));
      if (avail > 0) out.set(mini.subarray(off, off + avail), pos);
      pos += n;
      s = s < this.miniFat.length ? this.miniFat[s] : ENDOFCHAIN;
    }
    return out;
  }
};
function readCfb(bytes) {
  return new CfbFile(bytes);
}

// ../docx-core/src/doc/bytes.ts
var ByteReader = class {
  bytes;
  view;
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  get length() {
    return this.bytes.length;
  }
  u8(off) {
    return off < this.bytes.length && off >= 0 ? this.bytes[off] : 0;
  }
  i8(off) {
    const v = this.u8(off);
    return v > 127 ? v - 256 : v;
  }
  u16(off) {
    return off + 2 <= this.bytes.length && off >= 0 ? this.view.getUint16(off, true) : 0;
  }
  i16(off) {
    return off + 2 <= this.bytes.length && off >= 0 ? this.view.getInt16(off, true) : 0;
  }
  u32(off) {
    return off + 4 <= this.bytes.length && off >= 0 ? this.view.getUint32(off, true) : 0;
  }
  i32(off) {
    return off + 4 <= this.bytes.length && off >= 0 ? this.view.getInt32(off, true) : 0;
  }
  sub(start, end) {
    return this.bytes.subarray(Math.max(0, Math.min(start, this.bytes.length)), Math.max(0, Math.min(this.bytes.length, end)));
  }
  /** UTF-16LE de `count` unidades a partir de `off`. */
  utf16(off, count) {
    let s = "";
    for (let i2 = 0; i2 < count && off + i2 * 2 + 1 < this.bytes.length; i2++) s += String.fromCharCode(this.u16(off + i2 * 2));
    return s;
  }
};
function readRec(r, off, limit = r.length) {
  if (off + 8 > limit) return void 0;
  const vi = r.u16(off);
  const len = r.u32(off + 4);
  const start = off + 8;
  return { ver: vi & 15, inst: vi >>> 4, type: r.u16(off + 2), len, hdr: off, start, end: Math.min(limit, start + len), r };
}
function recsIn(r, start, end) {
  const out = [];
  let off = start;
  while (off + 8 <= end) {
    const rec = readRec(r, off, end);
    if (!rec) break;
    out.push(rec);
    if (rec.start + rec.len > end) break;
    off = rec.start + rec.len;
  }
  return out;
}
function children(rec) {
  return recsIn(rec.r, rec.start, rec.end);
}
var OA = {
  DggContainer: 61440,
  BStoreContainer: 61441,
  DgContainer: 61442,
  SpgrContainer: 61443,
  SpContainer: 61444,
  FDGG: 61446,
  FBSE: 61447,
  FDG: 61448,
  FSPGR: 61449,
  FSP: 61450,
  FOPT: 61451,
  ChildAnchor: 61455,
  ClientAnchor: 61456,
  ClientData: 61457,
  ClientTextbox: 61453,
  SecondaryFOPT: 61729,
  TertiaryFOPT: 61730,
  BlipEMF: 61466,
  BlipWMF: 61467,
  BlipPICT: 61468,
  BlipJPEG: 61469,
  BlipPNG: 61470,
  BlipDIB: 61471,
  BlipTIFF: 61481,
  BlipJPEGCMYK: 61482
};

// ../docx-core/src/doc/fib.ts
var DocFormatError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DocFormatError";
  }
};
var FC = {
  StshfOrig: 0,
  Stshf: 1,
  PlcffndRef: 2,
  PlcffndTxt: 3,
  PlcfandRef: 4,
  PlcfandTxt: 5,
  PlcfSed: 6,
  PlcPad: 7,
  PlcfPhe: 8,
  SttbfGlsy: 9,
  PlcfGlsy: 10,
  PlcfHdd: 11,
  PlcfBteChpx: 12,
  PlcfBtePapx: 13,
  PlcfSea: 14,
  SttbfFfn: 15,
  PlcfFldMom: 16,
  PlcfFldHdr: 17,
  PlcfFldFtn: 18,
  PlcfFldAtn: 19,
  PlcfFldMcr: 20,
  SttbfBkmk: 21,
  PlcfBkf: 22,
  PlcfBkl: 23,
  Cmds: 24,
  Unused1: 25,
  SttbfMcr: 26,
  PrDrvr: 27,
  PrEnvPort: 28,
  PrEnvLand: 29,
  Wss: 30,
  Dop: 31,
  SttbfAssoc: 32,
  Clx: 33,
  PlcfPgdFtn: 34,
  AutosaveSource: 35,
  GrpXstAtnOwners: 36,
  SttbfAtnBkmk: 37,
  Unused2: 38,
  Unused3: 39,
  PlcSpaMom: 40,
  PlcSpaHdr: 41,
  PlcfAtnBkf: 42,
  PlcfAtnBkl: 43,
  Pms: 44,
  FormFldSttbs: 45,
  PlcfendRef: 46,
  PlcfendTxt: 47,
  PlcfFldEdn: 48,
  Unused4: 49,
  DggInfo: 50,
  SttbfRMark: 51,
  SttbfCaption: 52,
  SttbfAutoCaption: 53,
  PlcfWkb: 54,
  PlcfSpl: 55,
  PlcftxbxTxt: 56,
  PlcfFldTxbx: 57,
  PlcfHdrtxbxTxt: 58,
  PlcffldHdrTxbx: 59,
  StwUser: 60,
  SttbTtmbd: 61,
  CookieData: 62,
  PgdMotherOldOld: 63,
  BkdMotherOldOld: 64,
  PgdFtnOldOld: 65,
  BkdFtnOldOld: 66,
  PgdEdnOldOld: 67,
  BkdEdnOldOld: 68,
  SttbfIntlFld: 69,
  RouteSlip: 70,
  SttbSavedBy: 71,
  SttbFnm: 72,
  PlfLst: 73,
  PlfLfo: 74,
  PlcfTxbxBkd: 75,
  PlcfTxbxHdrBkd: 76,
  DocUndoWord9: 77,
  RgbUse: 78,
  Usp: 79,
  Uskf: 80,
  PlcupcRgbUse: 81,
  PlcupcUsp: 82,
  SttbGlsyStyle: 83,
  Plgosl: 84,
  Plcocx: 85,
  PlcfBteLvc: 86,
  FtModified: 87,
  PlcfLvcPre10: 88,
  PlcfAsumy: 89,
  PlcfGram: 90,
  SttbListNames: 91,
  SttbfUssr: 92
};
function readFib(word) {
  if (word.length < 154) throw new DocFormatError("Arquivo .doc corrompido: FIB truncado.");
  const r = new ByteReader(word);
  const wIdent = r.u16(0);
  if (wIdent !== 42476 && wIdent !== 42460) throw new DocFormatError(`Arquivo .doc corrompido: assinatura do FIB inv\xE1lida (0x${wIdent.toString(16)}).`);
  let nFib = r.u16(2);
  const lid = r.u16(6);
  const flags = r.u16(10);
  let off = 32;
  const csw = r.u16(off);
  off += 2;
  const rgW = off;
  off += csw * 2;
  const cslw = r.u16(off);
  off += 2;
  const rgLw = off;
  off += cslw * 4;
  const cbRgFcLcb = r.u16(off);
  off += 2;
  const rgFcLcb = off;
  off += cbRgFcLcb * 8;
  const cswNew = off + 2 <= word.length ? r.u16(off) : 0;
  off += 2;
  if (cswNew > 0 && off + 2 <= word.length) {
    const nFibNew = r.u16(off);
    if (nFibNew) nFib = nFibNew;
  }
  const lw = (i2) => i2 < cslw ? r.i32(rgLw + i2 * 4) : 0;
  return {
    wIdent,
    nFib,
    lid,
    fDot: (flags & 1) !== 0,
    fComplex: (flags & 4) !== 0,
    fEncrypted: (flags & 256) !== 0,
    fWhichTblStm: (flags & 512) !== 0,
    fExtChar: (flags & 4096) !== 0,
    fFarEast: (flags & 16384) !== 0,
    fObfuscated: (flags & 32768) !== 0,
    lidFE: csw > 13 ? r.u16(rgW + 26) : 0,
    ccpText: lw(3),
    ccpFtn: lw(4),
    ccpHdd: lw(5),
    ccpMcr: lw(6),
    ccpAtn: lw(7),
    ccpEdn: lw(8),
    ccpTxbx: lw(9),
    ccpHdrTxbx: lw(10),
    fcLcb(index) {
      if (index >= cbRgFcLcb) return { fc: 0, lcb: 0 };
      return { fc: r.u32(rgFcLcb + index * 8), lcb: r.u32(rgFcLcb + index * 8 + 4) };
    }
  };
}

// ../docx-core/src/doc/sprm.ts
var sgcOf = (sprm) => sprm >> 10 & 7;
function* prls(grpprl) {
  const r = new ByteReader(grpprl);
  let off = 0;
  const end = grpprl.length;
  while (off + 2 <= end) {
    const sprm = r.u16(off);
    off += 2;
    const spra = sprm >>> 13;
    let op = off;
    let len;
    switch (spra) {
      case 0:
      case 1:
        len = 1;
        break;
      case 2:
      case 4:
      case 5:
        len = 2;
        break;
      case 3:
        len = 4;
        break;
      case 7:
        len = 3;
        break;
      default: {
        if (sprm === 54792 || sprm === 54790) {
          const cb = r.u16(off);
          op = off + 2;
          len = Math.max(0, cb - 1);
        } else if (sprm === 50709) {
          const cb = r.u8(off);
          op = off + 1;
          if (cb === 255) {
            const cDel = r.u8(op);
            const cAdd = r.u8(op + 1 + cDel * 4);
            len = 1 + cDel * 4 + 1 + cAdd * 3;
          } else len = cb;
        } else {
          len = r.u8(off);
          op = off + 1;
        }
      }
    }
    if (op + len > end) break;
    yield { sprm, op, len, r };
    off = op + len;
  }
}
var opU8 = (p) => p.r.u8(p.op);
var opU16 = (p) => p.r.u16(p.op);
var opI16 = (p) => p.r.i16(p.op);
var opU32 = (p) => p.r.u32(p.op);
var opI32 = (p) => p.r.i32(p.op);

// ../docx-core/src/doc/fkp.ts
var EMPTY = new Uint8Array(0);
function readPlc(buf, fc, lcb, cbData) {
  if (!lcb || fc + lcb > buf.length) return void 0;
  const n = cbData > 0 ? Math.floor((lcb - 4) / (4 + cbData)) : Math.floor(lcb / 4) - 1;
  if (n < 0) return void 0;
  const r = new ByteReader(buf);
  const cps = [];
  for (let i2 = 0; i2 <= n; i2++) cps.push(r.u32(fc + i2 * 4));
  const base = fc + (n + 1) * 4;
  return { cps, n, r, dataAt: (i2) => base + i2 * cbData };
}
function sortRuns(runs) {
  runs.sort((a, b) => a.fcStart - b.fcStart);
  return runs;
}
function readChpxRuns(fib, table, word) {
  const { fc, lcb } = fib.fcLcb(FC.PlcfBteChpx);
  const plc = readPlc(table, fc, lcb, 4);
  if (!plc) return [];
  const w = new ByteReader(word);
  const runs = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i2 = 0; i2 < plc.n; i2++) {
    const pn = plc.r.u32(plc.dataAt(i2)) & 4194303;
    if (seen.has(pn)) continue;
    seen.add(pn);
    const page = pn * 512;
    if (page + 512 > word.length) continue;
    const crun = w.u8(page + 511);
    for (let k = 0; k < crun; k++) {
      const fcStart = w.u32(page + k * 4);
      const fcEnd = w.u32(page + (k + 1) * 4);
      const b = w.u8(page + (crun + 1) * 4 + k);
      let grpprl = EMPTY;
      if (b) {
        const at = page + b * 2;
        const cb = w.u8(at);
        grpprl = w.sub(at + 1, Math.min(at + 1 + cb, page + 511));
      }
      if (fcEnd > fcStart) runs.push({ fcStart, fcEnd, grpprl, istd: 0 });
    }
  }
  return sortRuns(runs);
}
function prcData(data, off) {
  if (!data || off + 2 > data.length) return EMPTY;
  const r = new ByteReader(data);
  const cb = r.i16(off);
  return r.sub(off + 2, off + 2 + Math.max(0, cb));
}
function expandHugePapx(grpprl, data) {
  for (const p of prls(grpprl)) {
    if (p.sprm === 26182 && data) {
      const huge = prcData(data, p.r.u32(p.op));
      return huge.length ? huge : grpprl;
    }
    break;
  }
  return grpprl;
}
function readPapxRuns(fib, table, word, data) {
  const { fc, lcb } = fib.fcLcb(FC.PlcfBtePapx);
  const plc = readPlc(table, fc, lcb, 4);
  if (!plc) return [];
  const w = new ByteReader(word);
  const runs = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i2 = 0; i2 < plc.n; i2++) {
    const pn = plc.r.u32(plc.dataAt(i2)) & 4194303;
    if (seen.has(pn)) continue;
    seen.add(pn);
    const page = pn * 512;
    if (page + 512 > word.length) continue;
    const cpara = w.u8(page + 511);
    for (let k = 0; k < cpara; k++) {
      const fcStart = w.u32(page + k * 4);
      const fcEnd = w.u32(page + (k + 1) * 4);
      const bOffset = w.u8(page + (cpara + 1) * 4 + k * 13);
      let istd = 0;
      let grpprl = EMPTY;
      if (bOffset) {
        const at = page + bOffset * 2;
        let cb = w.u8(at);
        let start = at + 1;
        let size;
        if (cb === 0) {
          cb = w.u8(at + 1);
          start = at + 2;
          size = cb * 2;
        } else size = cb * 2 - 1;
        const end = Math.min(start + size, page + 511);
        istd = w.u16(start);
        grpprl = expandHugePapx(w.sub(start + 2, end), data);
      }
      if (fcEnd > fcStart) runs.push({ fcStart, fcEnd, grpprl, istd });
    }
  }
  return sortRuns(runs);
}
function runAt(runs, fc) {
  let lo = 0, hi = runs.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const r = runs[mid];
    if (fc < r.fcStart) hi = mid - 1;
    else if (fc >= r.fcEnd) lo = mid + 1;
    else return r;
  }
  return void 0;
}
function runIndexFrom(runs, fc) {
  let lo = 0, hi = runs.length;
  while (lo < hi) {
    const mid = lo + hi >> 1;
    if (runs[mid].fcEnd <= fc) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ../docx-core/src/doc/fonts.ts
function cstr(r, off, end) {
  let s = "";
  let o = off;
  while (o + 1 < end) {
    const c = r.u16(o);
    o += 2;
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return { s, next: o };
}
function readFonts(fib, table) {
  const { fc, lcb } = fib.fcLcb(FC.SttbfFfn);
  if (!lcb || fc + lcb > table.length) return [];
  const r = new ByteReader(table);
  let off = fc;
  const end = fc + lcb;
  let cData = r.u16(off);
  off += 2;
  let extended = false;
  if (cData === 65535) {
    extended = true;
    cData = r.u16(off);
    off += 2;
  }
  const cbExtra = r.u16(off);
  off += 2;
  const fonts = [];
  for (let i2 = 0; i2 < cData && off < end; i2++) {
    const cb = extended ? r.u16(off) * 2 : r.u8(off);
    off += extended ? 2 : 1;
    const o = off;
    const ffid = r.u8(o);
    const nameStart = o + 39;
    const lim = Math.min(o + cb, end);
    const { s: name, next } = cstr(r, nameStart, lim);
    const ixAlt = r.u8(o + 4);
    let altName;
    if (ixAlt) {
      const alt = cstr(r, next, lim).s;
      if (alt && !/[\u0000-\u001f\ufdfd\ucdcd\udddd\ufffd\uffff]/.test(alt)) altName = alt;
    }
    const sig = [];
    for (let k = 0; k < 6; k++) sig.push(r.u32(o + 15 + k * 4));
    fonts.push({
      name: name || `Font${i2}`,
      altName,
      prq: ffid & 3,
      trueType: (ffid & 4) !== 0,
      ff: ffid >> 4 & 7,
      weight: r.i16(o + 1),
      charset: r.u8(o + 3),
      panose: r.sub(o + 5, o + 15).slice(),
      sig
    });
    off = o + cb + cbExtra;
  }
  return fonts;
}

// ../docx-core/src/doc/lists.ts
function readLvl(r, off, end) {
  const flags = r.u8(off + 5);
  const nums = [];
  for (let i2 = 0; i2 < 9; i2++) {
    const v = r.u8(off + 6 + i2);
    if (!v) break;
    nums.push(v);
  }
  const cbChpx = r.u8(off + 24);
  const cbPapx = r.u8(off + 25);
  let o = off + 28;
  const grpprlPapx = r.sub(o, Math.min(o + cbPapx, end));
  o += cbPapx;
  const grpprlChpx = r.sub(o, Math.min(o + cbChpx, end));
  o += cbChpx;
  const cch = r.u16(o);
  const xst = r.utf16(o + 2, Math.min(cch, 256));
  o += 2 + cch * 2;
  return {
    lvl: {
      start: r.i32(off),
      nfc: r.u8(off + 4),
      jc: flags & 3,
      legal: (flags & 4) !== 0,
      noRestart: (flags & 8) !== 0,
      tentative: (flags & 128) !== 0,
      rgbxchNums: nums,
      follow: r.u8(off + 15),
      ilvlRestartLim: r.u8(off + 26),
      grpprlPapx,
      grpprlChpx,
      xst
    },
    next: o
  };
}
function readLists(fib, table) {
  const r = new ByteReader(table);
  const lsts = [];
  const lfos = [];
  const lst = fib.fcLcb(FC.PlfLst);
  if (lst.lcb && lst.fc + lst.lcb <= table.length) {
    const cLst = r.i16(lst.fc);
    let o = lst.fc + 2;
    for (let i2 = 0; i2 < cLst; i2++) {
      const rgistd = [];
      for (let k = 0; k < 9; k++) rgistd.push(r.u16(o + 8 + k * 2));
      const flags = r.u8(o + 26);
      lsts.push({
        lsid: r.i32(o),
        tplc: r.i32(o + 4),
        rgistdPara: rgistd,
        simple: (flags & 1) !== 0,
        hybrid: (flags & 16) !== 0,
        levels: []
      });
      o += 28;
    }
    let lo = lst.fc + lst.lcb;
    for (const l of lsts) {
      const n = l.simple ? 1 : 9;
      for (let k = 0; k < n && lo + 28 <= table.length; k++) {
        const { lvl, next } = readLvl(r, lo, table.length);
        l.levels.push(lvl);
        lo = next;
      }
    }
  }
  const lfo = fib.fcLcb(FC.PlfLfo);
  if (lfo.lcb && lfo.fc + lfo.lcb <= table.length) {
    const end = lfo.fc + lfo.lcb;
    const mac = r.u32(lfo.fc);
    let o = lfo.fc + 4;
    const counts = [];
    for (let i2 = 0; i2 < mac && o + 16 <= end; i2++) {
      lfos.push({ lsid: r.i32(o), overrides: [] });
      counts.push(r.u8(o + 12));
      o += 16;
    }
    for (let i2 = 0; i2 < lfos.length && o + 4 <= end; i2++) {
      o += 4;
      for (let k = 0; k < counts[i2]; k++) {
        const iStartAt = r.i32(o);
        const bits2 = r.u32(o + 4);
        o += 8;
        const ov = { ilvl: bits2 & 15 };
        const fStartAt = (bits2 & 16) !== 0;
        const fFormatting = (bits2 & 32) !== 0;
        if (fStartAt && !fFormatting) ov.startAt = iStartAt;
        if (fFormatting) {
          const { lvl, next } = readLvl(r, o, end);
          ov.lvl = lvl;
          if (fStartAt) ov.startAt = lvl.start;
          o = next;
        }
        lfos[i2].overrides.push(ov);
      }
    }
  }
  return { lsts, lfos };
}

// ../docx-core/src/doc/officeart.ts
var FSP = {
  group: 1,
  child: 2,
  patriarch: 4,
  deleted: 8,
  oleShape: 16,
  haveMaster: 32,
  flipH: 64,
  flipV: 128,
  connector: 256,
  haveAnchor: 512,
  background: 1024,
  haveSpt: 2048
};
var MSO_ARRAY_PROPS = /* @__PURE__ */ new Set([325, 326, 337, 338, 339, 340, 341, 342, 343, 407, 463, 899, 928]);
function readFopt(rec, into) {
  const r = rec.r;
  const n = rec.inst;
  let complexOff = rec.start + n * 6;
  for (let i2 = 0; i2 < n; i2++) {
    const o = rec.start + i2 * 6;
    if (o + 6 > rec.end) break;
    const opid = r.u16(o);
    const value = r.u32(o + 2);
    const prop = { id: opid & 16383, value, bid: (opid & 16384) !== 0 };
    if (opid & 32768) {
      let size = value;
      if (MSO_ARRAY_PROPS.has(prop.id) && complexOff + 6 <= rec.end) {
        let cb = r.u16(complexOff + 4);
        if (cb === 65520) cb = 4;
        const arrSize = 6 + r.u16(complexOff) * cb;
        if (value === arrSize - 6 && complexOff + arrSize <= rec.end) size = arrSize;
      }
      const len = Math.max(0, Math.min(size, rec.end - complexOff));
      prop.complex = r.sub(complexOff, complexOff + len);
      complexOff += len;
    }
    const prev = into.get(prop.id);
    if (prev && !prop.complex && isBooleanProp(prop.id)) prop.value = mergeBooleans(prev.value, value);
    into.set(prop.id, prop);
  }
}
function isBooleanProp(id) {
  return (id & 63) === 63;
}
function mergeBooleans(base, over) {
  const use = over >>> 16 & 65535;
  const mask = (use | use << 16) >>> 0;
  return (base & ~mask | over & mask) >>> 0;
}
function readRect(r, o) {
  return { l: r.i32(o), t: r.i32(o + 4), r: r.i32(o + 8), b: r.i32(o + 12) };
}
function readSpContainer(rec) {
  const shape = { spid: 0, type: 0, flags: 0, props: /* @__PURE__ */ new Map() };
  for (const c of children(rec)) {
    switch (c.type) {
      case OA.FSP:
        shape.type = c.inst;
        shape.spid = c.r.u32(c.start);
        shape.flags = c.r.u32(c.start + 4);
        break;
      case OA.FSPGR:
        shape.groupRect = readRect(c.r, c.start);
        break;
      case OA.FOPT:
      case OA.SecondaryFOPT:
      case OA.TertiaryFOPT:
        readFopt(c, shape.props);
        break;
      case OA.ChildAnchor:
        shape.childAnchor = readRect(c.r, c.start);
        break;
    }
  }
  return shape;
}
var MAX_GROUP_DEPTH = 64;
function readSpgrContainer(rec, depth = 0) {
  const kids = children(rec);
  const first = kids[0];
  const group2 = first && first.type === OA.SpContainer ? readSpContainer(first) : { spid: 0, type: 0, flags: FSP.group, props: /* @__PURE__ */ new Map() };
  group2.children = [];
  for (const c of kids.slice(first && first.type === OA.SpContainer ? 1 : 0)) {
    if (c.type === OA.SpContainer) {
      const s = readSpContainer(c);
      if (!(s.flags & FSP.deleted)) group2.children.push(s);
    } else if (c.type === OA.SpgrContainer && depth < MAX_GROUP_DEPTH) {
      const g = readSpgrContainer(c, depth + 1);
      if (!(g.flags & FSP.deleted)) group2.children.push(g);
    }
  }
  return group2;
}
function indexDrawing(dg, into) {
  for (const c of children(dg)) {
    if (c.type === OA.SpgrContainer) {
      const root = readSpgrContainer(c);
      for (const s of root.children ?? []) {
        s.z = into.size;
        into.set(s.spid, s);
      }
    } else if (c.type === OA.SpContainer) {
      const s = readSpContainer(c);
      s.z = into.size;
      into.set(s.spid, s);
    }
  }
}
function applyMasters(shapes, masters) {
  for (const s of shapes.values()) {
    const ref = s.props.get(769)?.value;
    const m = ref !== void 0 ? shapes.get(ref) : void 0;
    if (!m || m === s) continue;
    masters.add(m.spid);
    if (!s.type) s.type = m.type;
    for (const [id, p] of m.props) {
      if (id === 769) continue;
      const own2 = s.props.get(id);
      if (!own2) s.props.set(id, p);
      else if (isBooleanProp(id) && !own2.complex) s.props.set(id, { ...own2, value: mergeBooleans(p.value, own2.value) });
    }
  }
}
function readFbse(c) {
  const r = c.r;
  const o = c.start;
  const cbName = r.u8(o + 33);
  const e = { btWin32: r.u8(o), size: r.u32(o + 20), foDelay: r.u32(o + 28) };
  const embOff = o + 36 + cbName;
  if (embOff + 8 <= c.end) {
    const emb = readRec(r, embOff, c.end);
    if (emb && emb.type >= 61464 && emb.type <= 61719) e.embedded = emb;
  }
  return e;
}
function readBStore(rec) {
  return children(rec).map((c) => c.type === OA.FBSE ? readFbse(c) : void 0);
}
function blipUidCount(type, inst) {
  switch (type) {
    case OA.BlipEMF:
      return inst === 981 ? 2 : 1;
    case OA.BlipWMF:
      return inst === 535 ? 2 : 1;
    case OA.BlipPICT:
      return inst === 1347 ? 2 : 1;
    case OA.BlipJPEG:
    case OA.BlipJPEGCMYK:
      return inst === 1131 || inst === 1763 ? 2 : 1;
    case OA.BlipPNG:
      return inst === 1761 ? 2 : 1;
    case OA.BlipDIB:
      return inst === 1961 ? 2 : 1;
    case OA.BlipTIFF:
      return inst === 1765 ? 2 : 1;
    default:
      return 1;
  }
}
var MAX_BLIP = 64 * 1024 * 1024;
function inflateCapped(raw, zlib, max2, budget) {
  const chunks = [];
  let total = 0;
  const limit = Math.min(max2, budget ? budget.left : max2);
  const s = zlib ? new Unzlib() : new Inflate();
  s.ondata = (chunk) => {
    total += chunk.length;
    if (total > limit) throw new Error("imagem descomprimida grande demais");
    chunks.push(chunk);
  };
  s.push(raw, true);
  if (budget) budget.left -= total;
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
function decodeBlip(rec, budget) {
  const r = rec.r;
  const uids = blipUidCount(rec.type, rec.inst) * 16;
  const data = (off) => r.sub(rec.start + off, rec.end).slice();
  switch (rec.type) {
    case OA.BlipPNG:
      return { ext: "png", mime: "image/png", bytes: data(uids + 1) };
    case OA.BlipJPEG:
    case OA.BlipJPEGCMYK:
      return { ext: "jpeg", mime: "image/jpeg", bytes: data(uids + 1) };
    case OA.BlipTIFF:
      return { ext: "tiff", mime: "image/tiff", bytes: data(uids + 1) };
    case OA.BlipDIB:
      return { ext: "bmp", mime: "image/bmp", bytes: dibToBmp(data(uids + 1)) };
    case OA.BlipEMF:
    case OA.BlipWMF:
    case OA.BlipPICT: {
      const h = rec.start + uids;
      const cbSize = r.u32(h);
      const compression = r.u8(h + 32);
      const raw = r.sub(h + 34, rec.end);
      let bytes = raw;
      if (compression === 0) {
        try {
          bytes = inflateCapped(raw, true, MAX_BLIP, budget);
        } catch {
          try {
            bytes = inflateCapped(raw, false, MAX_BLIP, budget);
          } catch {
            return void 0;
          }
        }
      }
      bytes = cbSize > 0 && cbSize < bytes.length ? bytes.slice(0, cbSize) : bytes.slice();
      if (rec.type === OA.BlipEMF) return { ext: "emf", mime: "image/x-emf", bytes };
      if (rec.type === OA.BlipWMF) {
        const b = { l: r.i32(h + 4), t: r.i32(h + 8), r: r.i32(h + 12), b: r.i32(h + 16) };
        const ptX = r.i32(h + 20);
        const inch = ptX > 0 && b.r > b.l ? Math.round((b.r - b.l) * 914400 / ptX) : 1440;
        return { ext: "wmf", mime: "image/x-wmf", bytes: withPlaceableHeader(bytes, b, inch) };
      }
      return { ext: "pict", mime: "image/pict", bytes };
    }
  }
  return void 0;
}
function dibToBmp(dib) {
  const v = new DataView(dib.buffer, dib.byteOffset, dib.byteLength);
  const hdrSize = dib.length >= 4 ? v.getUint32(0, true) : 40;
  const bitCount = dib.length >= 16 ? v.getUint16(14, true) : 24;
  const compression = dib.length >= 20 ? v.getUint32(16, true) : 0;
  let clrUsed = dib.length >= 36 ? v.getUint32(32, true) : 0;
  if (clrUsed === 0 && bitCount <= 8) clrUsed = 1 << bitCount;
  const masks = compression === 3 && hdrSize === 40 ? 12 : 0;
  const offBits = 14 + hdrSize + masks + clrUsed * 4;
  const out = new Uint8Array(14 + dib.length);
  const ov = new DataView(out.buffer);
  out[0] = 66;
  out[1] = 77;
  ov.setUint32(2, out.length, true);
  ov.setUint32(10, offBits, true);
  out.set(dib, 14);
  return out;
}
function withPlaceableHeader(wmf, b, inch) {
  if (wmf.length >= 4 && wmf[0] === 215 && wmf[1] === 205 && wmf[2] === 198 && wmf[3] === 154) return wmf;
  const out = new Uint8Array(22 + wmf.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 2596720087, true);
  v.setInt16(6, b.l, true);
  v.setInt16(8, b.t, true);
  v.setInt16(10, b.r, true);
  v.setInt16(12, b.b, true);
  v.setUint16(14, Math.max(1, Math.min(65535, inch)), true);
  let sum2 = 0;
  for (let i2 = 0; i2 < 10; i2++) sum2 ^= v.getUint16(i2 * 2, true);
  v.setUint16(20, sum2, true);
  out.set(wmf, 22);
  return out;
}

// ../docx-core/src/doc/props.ts
var AUTO = -1;
var ICO_RGB = [
  AUTO,
  0,
  255,
  65535,
  65280,
  16711935,
  16711680,
  16776960,
  16777215,
  128,
  32896,
  32768,
  8388736,
  8388608,
  8421376,
  8421504,
  12632256
];
function icoColor(ico) {
  return ICO_RGB[ico] ?? AUTO;
}
function colorRef(v) {
  if (v >>> 24 === 255) return AUTO;
  const r = v & 255, g = v >>> 8 & 255, b = v >>> 16 & 255;
  return r << 16 | g << 8 | b;
}
function brc80(r, off) {
  const v = r.u32(off);
  if (v === 4294967295) return void 0;
  const flags = r.u8(off + 3);
  return {
    width: r.u8(off),
    type: r.u8(off + 1),
    color: icoColor(r.u8(off + 2)),
    space: flags & 31,
    shadow: (flags & 32) !== 0,
    frame: (flags & 64) !== 0
  };
}
function brcNew(r, off) {
  if (r.u32(off) === 4294967295 && r.u32(off + 4) === 4294967295) return void 0;
  const flags = r.u16(off + 6);
  return {
    color: colorRef(r.u32(off)),
    width: r.u8(off + 4),
    type: r.u8(off + 5),
    space: flags & 31,
    shadow: (flags & 32) !== 0,
    frame: (flags & 64) !== 0
  };
}
function shd80(v) {
  const pat = v >>> 10 & 63;
  return { fore: icoColor(v & 31), back: icoColor(v >>> 5 & 31), pat: pat === 63 ? 65535 : pat };
}
function shdNew(r, off) {
  return { fore: colorRef(r.u32(off)), back: colorRef(r.u32(off + 4)), pat: r.u16(off + 8) };
}
function defaultChp(ftcAscii, ftcFE, ftcOther) {
  return { hps: 20, hpsBi: 20, ftcAscii, ftcFE, ftcOther, ftcBi: 0, lid: 1024, lidFE: 1024, lidBi: 1024, istd: 10 };
}
var TOGGLES = {
  2101: "bold",
  2102: "italic",
  2103: "strike",
  2104: "outline",
  2105: "shadow",
  2106: "smallCaps",
  2107: "caps",
  2108: "vanish",
  2136: "emboss",
  2132: "imprint",
  2140: "boldBi",
  2141: "italicBi"
};
var PRESERVED = ["rmarkDel", "rmarkIns", "rtl", "cs", "fldVanish", "fSpec", "fData", "fOle2", "fObj", "picLocation", "webHidden", "specVanish", "ibstRMark", "dttmRMark", "ibstRMarkDel", "dttmRMarkDel"];
function setAll(target, src, keep) {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, src);
  for (const k of PRESERVED) if (keep[k] !== void 0) target[k] = keep[k];
}
function applyChp(chp, p, ctx, touched) {
  const t = (k) => {
    touched.add(k);
  };
  const tog = TOGGLES[p.sprm];
  if (tog) {
    const v = opU8(p);
    const baseV = !!ctx.base[tog];
    chp[tog] = v === 128 ? baseV : v === 129 ? !baseV : v !== 0;
    t(tog);
    return;
  }
  switch (p.sprm) {
    case 2048:
      chp.rmarkDel = opU8(p) !== 0;
      t("rmarkDel");
      break;
    case 2049:
      chp.rmarkIns = opU8(p) !== 0;
      t("rmarkIns");
      break;
    case 2050:
      chp.fldVanish = opU8(p) !== 0;
      t("fldVanish");
      break;
    case 27139:
      chp.picLocation = opI32(p);
      t("picLocation");
      break;
    case 18436:
      chp.ibstRMark = opU16(p);
      break;
    case 26629:
      chp.dttmRMark = opU32(p);
      break;
    case 2054:
      chp.fData = opU8(p) !== 0;
      t("fData");
      break;
    case 27145:
      chp.symbol = { ftc: p.r.u16(p.op), xchar: p.r.u16(p.op + 2) };
      t("symbol");
      break;
    case 2058:
      chp.fOle2 = opU8(p) !== 0;
      t("fOle2");
      break;
    case 10764:
      chp.highlight = opU8(p);
      t("highlight");
      break;
    case 2065:
      chp.webHidden = opU8(p) !== 0;
      t("webHidden");
      break;
    case 2072:
      chp.specVanish = opU8(p) !== 0;
      t("specVanish");
      break;
    case 18992: {
      const istd = opU16(p);
      if (ctx.applyCharStyle) {
        const st = ctx.applyCharStyle(istd);
        setAll(chp, st, chp);
        ctx.base = { ...st };
        touched.clear();
      }
      chp.istd = istd;
      t("istd");
      break;
    }
    case 10803: {
      if (ctx.paraStyle) {
        setAll(chp, ctx.paraStyle, chp);
        ctx.base = { ...ctx.paraStyle };
        touched.clear();
      }
      break;
    }
    case 10804:
      chp.kcd = opU8(p);
      t("kcd");
      break;
    case 10814:
      chp.kul = opU8(p);
      t("kul");
      break;
    case 34880:
      chp.dxaSpace = opI16(p);
      t("dxaSpace");
      break;
    case 10818:
      chp.ico = opU8(p);
      delete chp.cv;
      t("ico");
      touched.delete("cv");
      break;
    case 19011:
      chp.hps = opU16(p);
      t("hps");
      break;
    case 10820:
      chp.hps = Math.max(2, (chp.hps ?? 20) + p.r.i8(p.op) * 2);
      t("hps");
      break;
    case 18501:
      chp.hpsPos = opI16(p);
      t("hpsPos");
      break;
    case 10824:
      chp.iss = opU8(p);
      t("iss");
      break;
    case 18507:
      chp.hpsKern = opU16(p);
      t("hpsKern");
      break;
    case 19023:
      chp.ftcAscii = opU16(p);
      t("ftcAscii");
      break;
    case 19024:
      chp.ftcFE = opU16(p);
      t("ftcFE");
      break;
    case 19025:
      chp.ftcOther = opU16(p);
      t("ftcOther");
      break;
    case 18514:
      chp.charScale = opU16(p);
      t("charScale");
      break;
    case 10835:
      chp.dstrike = opU8(p) !== 0;
      t("dstrike");
      break;
    case 2133:
      chp.fSpec = opU8(p) !== 0;
      t("fSpec");
      break;
    case 2134:
      chp.fObj = opU8(p) !== 0;
      t("fObj");
      break;
    case 10329:
      chp.sfxText = opU8(p);
      t("sfxText");
      break;
    case 2138:
      chp.rtl = opU8(p) !== 0;
      t("rtl");
      break;
    case 19038:
      chp.ftcBi = opU16(p);
      t("ftcBi");
      break;
    case 18527:
      chp.lidBi = opU16(p);
      t("lidBi");
      break;
    case 19040:
      break;
    // sprmCIcoBi
    case 19041:
      chp.hpsBi = opU16(p);
      t("hpsBi");
      break;
    case 18531:
      chp.ibstRMarkDel = opU16(p);
      break;
    case 26724:
      chp.dttmRMarkDel = opU32(p);
      break;
    case 26725: {
      const b = brc80(p.r, p.op);
      if (b) chp.brc = b;
      else delete chp.brc;
      t("brc");
      break;
    }
    case 18534:
      chp.shd = shd80(opU16(p));
      t("shd");
      break;
    case 10351:
      chp.idctHint = opU8(p);
      t("idctHint");
      break;
    case 26736: {
      const cv = colorRef(opU32(p));
      if (cv === AUTO) {
        delete chp.cv;
        touched.delete("cv");
        if (!touched.has("ico")) {
          chp.ico = 0;
          t("ico");
        }
      } else {
        chp.cv = cv;
        t("cv");
      }
      break;
    }
    case 51825:
      chp.shd = shdNew(p.r, p.op);
      t("shd");
      break;
    case 51826: {
      const b = brcNew(p.r, p.op);
      if (b) chp.brc = b;
      else delete chp.brc;
      t("brc");
      break;
    }
    case 18541:
    case 18547:
      chp.lid = opU16(p);
      t("lid");
      break;
    case 18542:
    case 18548:
      chp.lidFE = opU16(p);
      t("lidFE");
      break;
    case 2165:
      chp.noProof = opU8(p) !== 0;
      t("noProof");
      break;
    case 26743:
      chp.cvUl = colorRef(opU32(p));
      t("cvUl");
      break;
    case 2178:
      chp.cs = opU8(p) !== 0;
      t("cs");
      break;
    case 51783: {
      if (!ctx.paraStyle) break;
      const probe = {};
      const sub = p.r.sub(p.op, p.op + p.len);
      const dummy = /* @__PURE__ */ new Set();
      for (const q of prls(sub)) applyChp(probe, q, { base: {} }, dummy);
      for (const k of dummy) {
        if (JSON.stringify(chp[k]) === JSON.stringify(probe[k])) {
          chp[k] = ctx.paraStyle[k];
          touched.delete(k);
        }
      }
      break;
    }
  }
}
function chgTabs(pap, p, withClose) {
  const r = p.r;
  let o = p.op;
  const cDel = r.u8(o);
  o += 1;
  const dels = [];
  for (let i2 = 0; i2 < cDel; i2++) dels.push(r.i16(o + i2 * 2));
  const closes = [];
  if (withClose) for (let i2 = 0; i2 < cDel; i2++) closes.push(r.i16(o + cDel * 2 + i2 * 2));
  o += cDel * 2 * (withClose ? 2 : 1);
  const cAdd = r.u8(o);
  o += 1;
  const adds = [];
  for (let i2 = 0; i2 < cAdd; i2++) {
    const tbd = r.u8(o + cAdd * 2 + i2);
    adds.push({ pos: r.i16(o + i2 * 2), jc: tbd & 7, tlc: tbd >> 3 & 7 });
  }
  let tabs = pap.tabs ? [...pap.tabs] : [];
  const cleared = new Set(pap.tabsCleared ?? []);
  for (let i2 = 0; i2 < dels.length; i2++) {
    const d = dels[i2];
    const tol = withClose ? Math.abs(closes[i2] ?? 0) : 0;
    const before = tabs.length;
    tabs = tabs.filter((tb) => Math.abs(tb.pos - d) > tol);
    if (tabs.length !== before || !withClose) cleared.add(d);
  }
  for (const a of adds) {
    tabs = tabs.filter((tb) => tb.pos !== a.pos);
    tabs.push(a);
    cleared.delete(a.pos);
  }
  pap.tabs = tabs;
  pap.tabsCleared = [...cleared];
}
function lspd(p) {
  return { line: p.r.i16(p.op), mult: p.r.i16(p.op + 2) !== 0 };
}
function applyPap(pap, p, touched, ctx = {}) {
  const t = (k) => {
    touched.add(k);
  };
  const b82 = () => opU8(p) !== 0;
  switch (p.sprm) {
    case 17920:
      pap.istd = opU16(p);
      ctx.onIstd?.(pap.istd);
      break;
    case 9730: {
      const d = p.r.i8(p.op);
      if (pap.istd >= 1 && pap.istd <= 9) {
        pap.istd = Math.min(9, Math.max(1, pap.istd + d));
        ctx.onIstd?.(pap.istd);
      } else if ((pap.outLvl ?? 9) !== 9) {
        pap.outLvl = Math.min(9, Math.max(0, (pap.outLvl ?? 9) + d));
        t("outLvl");
      }
      break;
    }
    case 9219:
      if (!touched.has("jc") || pap.jc === void 0) {
        pap.jc = opU8(p);
        t("jc");
      }
      break;
    case 9313:
      pap.jc = opU8(p);
      t("jc");
      break;
    case 9221:
      pap.keep = b82();
      t("keep");
      break;
    case 9222:
      pap.keepFollow = b82();
      t("keepFollow");
      break;
    case 9223:
      pap.pageBreakBefore = b82();
      t("pageBreakBefore");
      break;
    case 9738:
      pap.ilvl = opU8(p);
      t("ilvl");
      break;
    case 17931:
      pap.ilfo = opI16(p);
      t("ilfo");
      break;
    case 9228:
      pap.noLineNumb = b82();
      t("noLineNumb");
      break;
    case 50701:
      chgTabs(pap, p, false);
      t("tabs");
      break;
    case 50709:
      chgTabs(pap, p, true);
      t("tabs");
      break;
    case 33806:
    case 33885:
      pap.dxaRight = opI16(p);
      t("dxaRight");
      delete pap.dxcRight;
      break;
    case 33807:
    case 33886:
      pap.dxaLeft = opI16(p);
      t("dxaLeft");
      delete pap.dxcLeft;
      break;
    case 17936:
    case 18015:
      pap.dxaLeft = (pap.dxaLeft ?? 0) + opI16(p);
      t("dxaLeft");
      break;
    case 33809:
    case 33888:
      pap.dxaLeft1 = opI16(p);
      t("dxaLeft1");
      delete pap.dxcLeft1;
      break;
    case 17494:
      pap.dxcLeft = opI16(p);
      t("dxcLeft");
      break;
    case 17493:
      pap.dxcRight = opI16(p);
      t("dxcRight");
      break;
    case 17495:
      pap.dxcLeft1 = opI16(p);
      t("dxcLeft1");
      break;
    case 25618:
      pap.lineSpacing = lspd(p);
      t("lineSpacing");
      break;
    case 42003:
      pap.dyaBefore = opU16(p);
      t("dyaBefore");
      break;
    case 42004:
      pap.dyaAfter = opU16(p);
      t("dyaAfter");
      break;
    case 17496:
      pap.dylBefore = opI16(p);
      t("dylBefore");
      break;
    case 17497:
      pap.dylAfter = opI16(p);
      t("dylAfter");
      break;
    case 9307:
      pap.beforeAuto = b82();
      t("beforeAuto");
      break;
    case 9308:
      pap.afterAuto = b82();
      t("afterAuto");
      break;
    case 9238:
      pap.inTable = b82();
      break;
    case 9239:
      pap.ttp = b82();
      break;
    case 26185:
      pap.itap = opI32(p);
      break;
    case 26186:
      pap.itap = Math.max(0, (pap.itap ?? 0) + opI32(p));
      break;
    case 9291:
      pap.innerTableCell = b82();
      break;
    case 9292:
      pap.innerTtp = b82();
      break;
    case 33816:
      pap.dxaAbs = opI16(p);
      t("dxaAbs");
      break;
    case 33817:
      pap.dyaAbs = opI16(p);
      t("dyaAbs");
      break;
    case 33818:
      pap.dxaWidth = opI16(p);
      t("dxaWidth");
      break;
    case 9755:
      pap.pc = opU8(p);
      t("pc");
      break;
    case 9251:
      pap.wr = opU8(p);
      t("wr");
      break;
    case 17451:
      pap.wHeightAbs = opU16(p);
      t("wHeightAbs");
      break;
    case 17452:
      pap.dcs = opU16(p);
      t("dcs");
      break;
    case 33838:
      pap.dyaFromText = opI16(p);
      t("dyaFromText");
      break;
    case 33839:
      pap.dxaFromText = opI16(p);
      t("dxaFromText");
      break;
    case 9264:
      pap.frameLocked = b82();
      t("frameLocked");
      break;
    case 25636:
      setBrc(pap, "brcTop", brc80(p.r, p.op));
      t("brcTop");
      break;
    case 25637:
      setBrc(pap, "brcLeft", brc80(p.r, p.op));
      t("brcLeft");
      break;
    case 25638:
      setBrc(pap, "brcBottom", brc80(p.r, p.op));
      t("brcBottom");
      break;
    case 25639:
      setBrc(pap, "brcRight", brc80(p.r, p.op));
      t("brcRight");
      break;
    case 25640:
      setBrc(pap, "brcBetween", brc80(p.r, p.op));
      t("brcBetween");
      break;
    case 26153:
      setBrc(pap, "brcBar", brc80(p.r, p.op));
      t("brcBar");
      break;
    case 50766:
      setBrc(pap, "brcTop", brcNew(p.r, p.op));
      t("brcTop");
      break;
    case 50767:
      setBrc(pap, "brcLeft", brcNew(p.r, p.op));
      t("brcLeft");
      break;
    case 50768:
      setBrc(pap, "brcBottom", brcNew(p.r, p.op));
      t("brcBottom");
      break;
    case 50769:
      setBrc(pap, "brcRight", brcNew(p.r, p.op));
      t("brcRight");
      break;
    case 50770:
      setBrc(pap, "brcBetween", brcNew(p.r, p.op));
      t("brcBetween");
      break;
    case 50771:
      setBrc(pap, "brcBar", brcNew(p.r, p.op));
      t("brcBar");
      break;
    case 9258:
      pap.noAutoHyph = b82();
      t("noAutoHyph");
      break;
    case 17453:
      pap.shd = shd80(opU16(p));
      t("shd");
      break;
    case 50765:
      pap.shd = shdNew(p.r, p.op);
      t("shd");
      break;
    case 9265:
      pap.widowControl = b82();
      t("widowControl");
      break;
    case 9267:
      pap.kinsoku = b82();
      t("kinsoku");
      break;
    case 9268:
      pap.wordWrap = b82();
      t("wordWrap");
      break;
    case 9269:
      pap.overflowPunct = b82();
      t("overflowPunct");
      break;
    case 9270:
      pap.topLinePunct = b82();
      t("topLinePunct");
      break;
    case 9271:
      pap.autoSpaceDE = b82();
      t("autoSpaceDE");
      break;
    case 9272:
      pap.autoSpaceDN = b82();
      t("autoSpaceDN");
      break;
    case 17465:
      pap.wAlignFont = opU16(p);
      t("wAlignFont");
      break;
    case 9792:
      pap.outLvl = opU8(p);
      t("outLvl");
      break;
    case 9281:
      pap.bidi = b82();
      t("bidi");
      break;
    case 9287:
      pap.usePgsuSettings = b82();
      t("usePgsuSettings");
      break;
    case 9288:
      pap.adjustRight = b82();
      t("adjustRight");
      break;
    case 9325:
      pap.contextualSpacing = b82();
      t("contextualSpacing");
      break;
    case 9328:
      pap.mirrorIndents = b82();
      t("mirrorIndents");
      break;
  }
}
function brcNone(b) {
  return !b || b.type === 0 || b.type === 255;
}
function pruneNoneBorders(pap, base, touched) {
  for (const k of ["brcTop", "brcLeft", "brcBottom", "brcRight", "brcBetween", "brcBar"]) {
    if (touched.has(k) && brcNone(pap[k]) && brcNone(base[k])) touched.delete(k);
  }
}
function setBrc(pap, k, b) {
  if (b) pap[k] = b;
  else delete pap[k];
}
function newTc() {
  return {
    horzMerge: 0,
    vertMerge: 0,
    vertAlign: 0,
    textFlow: 0,
    ftsWidth: 0,
    wWidth: 0,
    fitText: false,
    noWrap: false,
    hideMark: false,
    brcSet: { top: false, left: false, bottom: false, right: false },
    mar: {}
  };
}
function newTap() {
  return { borders: {}, bordersSet: false, centers: [], tcs: [], padding: {} };
}
function readTc80(r, o) {
  const tc = newTc();
  const grf = r.u16(o);
  tc.horzMerge = grf & 3;
  tc.textFlow = grf >> 2 & 7;
  tc.vertMerge = grf >> 5 & 3;
  tc.vertAlign = grf >> 7 & 3;
  tc.ftsWidth = grf >> 9 & 7;
  tc.fitText = (grf & 4096) !== 0;
  tc.noWrap = (grf & 8192) !== 0;
  tc.hideMark = (grf & 16384) !== 0;
  tc.wWidth = r.i16(o + 2);
  const sides = ["brcTop", "brcLeft", "brcBottom", "brcRight"];
  const keys = ["top", "left", "bottom", "right"];
  sides.forEach((s, i2) => {
    const b = brc80(r, o + 4 + i2 * 4);
    if (b && b.type !== 0) {
      tc[s] = b;
      tc.brcSet[keys[i2]] = true;
    }
  });
  return tc;
}
function forCells(tap, first, lim, fn) {
  for (let i2 = first; i2 < Math.min(lim, tap.tcs.length); i2++) fn(tap.tcs[i2], i2);
}
function shdArray(p, size, read) {
  const out = [];
  for (let o = p.op; o + size <= p.op + p.len; o += size) out.push(read(o));
  return out;
}
function finishTap(tap) {
  if (tap.insertBuilt && tap.centers.length) {
    const shift = (tap.dxaLeft ?? 0) - (tap.dxaGapHalf ?? 0) - tap.centers[0];
    if (shift) tap.centers = tap.centers.map((c) => c + shift);
  }
}
function applyTap(tap, p) {
  const r = p.r;
  switch (p.sprm) {
    case 21504:
    case 21642:
      tap.jc = opU16(p);
      break;
    case 38401:
      tap.dxaLeft = opI16(p);
      break;
    case 38402:
      tap.dxaGapHalf = opI16(p);
      break;
    // sprmTFCantSplit90 (0x3403) deve ser ignorado em favor de sprmTFCantSplit (medido no Word)
    case 13414:
      tap.cantSplit = opU8(p) !== 0;
      break;
    case 13316:
      tap.header = opU8(p) !== 0;
      break;
    case 54789: {
      const sides = ["top", "left", "bottom", "right", "insideH", "insideV"];
      sides.forEach((s, i2) => {
        tap.borders[s] = brc80(r, p.op + i2 * 4) ?? void 0;
      });
      tap.bordersSet = true;
      break;
    }
    case 54803: {
      const sides = ["top", "left", "bottom", "right", "insideH", "insideV"];
      sides.forEach((s, i2) => {
        tap.borders[s] = brcNew(r, p.op + i2 * 8) ?? void 0;
      });
      tap.bordersSet = true;
      break;
    }
    case 37895:
      tap.rowHeight = opI16(p);
      break;
    case 54792:
    case 54790: {
      const n = r.u8(p.op);
      const centers = [];
      for (let i2 = 0; i2 <= n; i2++) centers.push(r.i16(p.op + 1 + i2 * 2));
      const tcStart = p.op + 1 + (n + 1) * 2;
      const tcs = [];
      for (let i2 = 0; i2 < n; i2++) {
        const o = tcStart + i2 * 20;
        tcs.push(o + 20 <= p.op + p.len ? readTc80(r, o) : newTc());
      }
      tap.centers = centers;
      tap.tcs = tcs;
      tap.insertBuilt = false;
      break;
    }
    case 54793:
      tap.shd80 = shdArray(p, 2, (o) => shd80(r.u16(o)));
      break;
    case 54802:
      tap.shdDef = [...shdArray(p, 10, (o) => shdNew(r, o))];
      break;
    case 54806:
      tap.shdDef = [...(tap.shdDef ?? []).slice(0, 22), ...shdArray(p, 10, (o) => shdNew(r, o))];
      break;
    case 54796:
      tap.shdDef = [...(tap.shdDef ?? []).slice(0, 44), ...shdArray(p, 10, (o) => shdNew(r, o))];
      break;
    case 54896:
      tap.shdRaw = [...shdArray(p, 10, (o) => shdNew(r, o))];
      break;
    case 54897:
      tap.shdRaw = [...(tap.shdRaw ?? []).slice(0, 22), ...shdArray(p, 10, (o) => shdNew(r, o))];
      break;
    case 54898:
      tap.shdRaw = [...(tap.shdRaw ?? []).slice(0, 44), ...shdArray(p, 10, (o) => shdNew(r, o))];
      break;
    case 29706:
      tap.tlp = { itl: r.i16(p.op), grfatl: r.u16(p.op + 2) };
      break;
    case 22027:
    case 22116:
      tap.bidi = opU16(p) !== 0;
      break;
    case 13837:
      tap.pc = opU8(p);
      break;
    case 37902:
      tap.dxaAbs = opI16(p);
      break;
    case 37903:
      tap.dyaAbs = opI16(p);
      break;
    case 37904:
      tap.dxaFromText = opI16(p);
      break;
    case 37905:
      tap.dyaFromText = opI16(p);
      break;
    case 37918:
      tap.dxaFromTextRight = opI16(p);
      break;
    case 37919:
      tap.dyaFromTextBottom = opI16(p);
      break;
    case 13413:
      tap.noAllowOverlap = opU8(p) !== 0;
      break;
    case 62996:
      tap.tableWidth = { fts: r.u8(p.op), w: r.i16(p.op + 1) };
      break;
    case 62999:
      tap.widthBefore = { fts: r.u8(p.op), w: r.i16(p.op + 1) };
      break;
    case 63e3:
      tap.widthAfter = { fts: r.u8(p.op), w: r.i16(p.op + 1) };
      break;
    case 63073:
      tap.widthIndent = { fts: r.u8(p.op), w: r.i16(p.op + 1) };
      break;
    case 13845:
      tap.autofit = opU8(p) !== 0;
      break;
    case 22074:
      tap.istd = opU16(p);
      break;
    case 54880:
      tap.shdTable = shdNew(r, p.op);
      break;
    case 30241: {
      const itc = r.u8(p.op), ctc = r.u8(p.op + 1), dxa = r.i16(p.op + 2);
      if (!tap.centers.length) {
        tap.centers = [0];
        tap.insertBuilt = true;
      }
      for (let k = 0; k < ctc; k++) {
        const at = Math.min(itc + k, tap.tcs.length);
        tap.tcs.splice(at, 0, newTc());
        const left = tap.centers[at] ?? tap.centers[tap.centers.length - 1];
        tap.centers.splice(at + 1, 0, left + dxa);
        for (let j = at + 2; j < tap.centers.length; j++) tap.centers[j] += dxa;
      }
      break;
    }
    case 22050: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1);
      const cnt = Math.max(0, Math.min(lim, tap.tcs.length) - first);
      if (cnt > 0 && tap.tcs.length - cnt >= 1) {
        const w = (tap.centers[first + cnt] ?? 0) - (tap.centers[first] ?? 0);
        tap.tcs.splice(first, cnt);
        tap.centers.splice(first + 1, cnt);
        for (let j = first + 1; j < tap.centers.length; j++) tap.centers[j] -= w;
      }
      break;
    }
    case 30243: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), dxa = r.i16(p.op + 2);
      for (let i2 = first; i2 < Math.min(lim, tap.tcs.length); i2++) {
        const delta = dxa - ((tap.centers[i2 + 1] ?? 0) - (tap.centers[i2] ?? 0));
        for (let j = i2 + 1; j < tap.centers.length; j++) tap.centers[j] += delta;
      }
      break;
    }
    case 22052: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1);
      forCells(tap, first, lim, (tc, i2) => {
        tc.horzMerge = i2 === first ? 3 : 1;
      });
      break;
    }
    case 22053: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1);
      forCells(tap, first, lim, (tc) => {
        tc.horzMerge = 0;
      });
      break;
    }
    case 54816:
    case 54831: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), which = r.u8(p.op + 2);
      const b = p.sprm === 54816 ? brc80(r, p.op + 3) : brcNew(r, p.op + 3);
      forCells(tap, first, lim, (tc) => {
        if (which & 1) {
          tc.brcTop = b;
          tc.brcSet.top = true;
        }
        if (which & 2) {
          tc.brcLeft = b;
          tc.brcSet.left = true;
        }
        if (which & 4) {
          tc.brcBottom = b;
          tc.brcSet.bottom = true;
        }
        if (which & 8) {
          tc.brcRight = b;
          tc.brcSet.right = true;
        }
      });
      break;
    }
    case 30249: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), flow = r.u16(p.op + 2);
      forCells(tap, first, lim, (tc) => {
        tc.textFlow = flow & 7;
      });
      break;
    }
    case 54827: {
      const itc = r.u8(p.op), v = r.u8(p.op + 1);
      if (tap.tcs[itc]) tap.tcs[itc].vertMerge = v;
      break;
    }
    case 54828: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), va = r.u8(p.op + 2);
      forCells(tap, first, lim, (tc) => {
        tc.vertAlign = va;
      });
      break;
    }
    case 54829:
    case 54830: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1);
      const s = shdNew(r, p.op + 2);
      forCells(tap, first, lim, (tc, i2) => {
        if (p.sprm === 54829 || (i2 - first) % 2 === 0) tc.shd = s;
      });
      break;
    }
    case 54834:
    case 54836:
    case 54835: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), grf = r.u8(p.op + 2), fts = r.u8(p.op + 3), w = r.i16(p.op + 4);
      if (p.sprm === 54835) {
        if (fts === 3 || fts === 19) tap.spacing = w;
        break;
      }
      const set = (m) => {
        const v = w;
        if (grf & 1) m.top = v;
        if (grf & 2) m.left = v;
        if (grf & 4) m.bottom = v;
        if (grf & 8) m.right = v;
      };
      if (p.sprm === 54836) set(tap.padding);
      else forCells(tap, first, lim, (tc) => set(tc.mar));
      break;
    }
    case 54837: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), fts = r.u8(p.op + 2), w = r.i16(p.op + 3);
      forCells(tap, first, lim, (tc) => {
        tc.ftsWidth = fts;
        tc.wWidth = w;
      });
      break;
    }
    case 54850: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), v = r.u8(p.op + 2);
      forCells(tap, first, lim, (tc) => {
        tc.hideMark = v !== 0;
      });
      break;
    }
    case 54841: {
      const first = r.u8(p.op), lim = r.u8(p.op + 1), v = r.u8(p.op + 2);
      forCells(tap, first, lim, (tc) => {
        tc.noWrap = v !== 0;
      });
      break;
    }
  }
}
function defaultSep() {
  return {
    bkc: 2,
    titlePage: false,
    ccolM1: 0,
    dxaColumns: 720,
    evenlySpaced: true,
    colWidths: [],
    colSpacings: [],
    lBetween: false,
    xaPage: 12240,
    yaPage: 15840,
    orientation: 1,
    dxaLeft: 1800,
    dxaRight: 1800,
    dyaTop: 1440,
    dyaBottom: 1440,
    dzaGutter: 0,
    dyaHdrTop: 720,
    dyaHdrBottom: 720,
    nfcPgn: 0,
    pgnRestart: false,
    pgnStart: 1,
    vjc: 0,
    lnnMod: 0,
    dxaLnn: 0,
    lnc: 0,
    lnnMin: 0,
    pgbProp: 0,
    clm: 0,
    dxtCharSpace: 0,
    textFlow: 0,
    bidi: false,
    rtlGutter: false,
    fEndnote: true,
    dmBinFirst: 0,
    dmBinOther: 0
  };
}
function applySep(sep, p) {
  const r = p.r;
  switch (p.sprm) {
    case 12288:
      sep.cnsPgn = opU8(p);
      break;
    case 12289:
      sep.headingPgn = opU8(p);
      break;
    case 61955: {
      const i2 = r.u8(p.op);
      sep.colWidths[i2] = r.i16(p.op + 1);
      break;
    }
    case 61956: {
      const i2 = r.u8(p.op);
      sep.colSpacings[i2] = r.i16(p.op + 1);
      break;
    }
    case 12293:
      sep.evenlySpaced = opU8(p) !== 0;
      break;
    case 12294:
      sep.protectedSec = opU8(p) !== 0;
      break;
    case 20487:
      sep.dmBinFirst = opU16(p);
      break;
    case 20488:
      sep.dmBinOther = opU16(p);
      break;
    case 20518:
      sep.dmPaperReq = opU16(p);
      break;
    case 12297:
      sep.bkc = opU8(p);
      break;
    case 12298:
      sep.titlePage = opU8(p) !== 0;
      break;
    case 20491:
      sep.ccolM1 = opU16(p);
      break;
    case 36876:
      sep.dxaColumns = opI16(p);
      break;
    case 12302:
      sep.nfcPgn = opU8(p);
      break;
    case 12305:
      sep.pgnRestart = opU8(p) !== 0;
      break;
    case 12306:
      sep.fEndnote = opU8(p) !== 0;
      break;
    case 12307:
      sep.lnc = opU8(p);
      break;
    case 20501:
      sep.lnnMod = opU16(p);
      break;
    case 36886:
      sep.dxaLnn = opI16(p);
      break;
    case 45079:
      sep.dyaHdrTop = opU16(p);
      break;
    case 45080:
      sep.dyaHdrBottom = opU16(p);
      break;
    case 12313:
      sep.lBetween = opU8(p) !== 0;
      break;
    case 12314:
      sep.vjc = opU8(p);
      break;
    case 20507:
      sep.lnnMin = opU16(p);
      break;
    case 20508:
      sep.pgnStart = opU16(p);
      break;
    case 28740:
      sep.pgnStart = opU32(p);
      break;
    case 12317:
      sep.orientation = opU8(p);
      break;
    case 45087:
      sep.xaPage = opU16(p);
      break;
    case 45088:
      sep.yaPage = opU16(p);
      break;
    case 45089:
      sep.dxaLeft = opU16(p);
      break;
    case 45090:
      sep.dxaRight = opU16(p);
      break;
    case 36899:
      sep.dyaTop = opI16(p);
      break;
    case 36900:
      sep.dyaBottom = opI16(p);
      break;
    case 45093:
      sep.dzaGutter = opU16(p);
      break;
    case 12840:
      sep.bidi = opU8(p) !== 0;
      break;
    case 12842:
      sep.rtlGutter = opU8(p) !== 0;
      break;
    case 28715:
      sep.brcTop = brc80(r, p.op);
      break;
    case 28716:
      sep.brcLeft = brc80(r, p.op);
      break;
    case 28717:
      sep.brcBottom = brc80(r, p.op);
      break;
    case 28718:
      sep.brcRight = brc80(r, p.op);
      break;
    case 53812:
      sep.brcTop = brcNew(r, p.op);
      break;
    case 53813:
      sep.brcLeft = brcNew(r, p.op);
      break;
    case 53814:
      sep.brcBottom = brcNew(r, p.op);
      break;
    case 53815:
      sep.brcRight = brcNew(r, p.op);
      break;
    case 21039:
      sep.pgbProp = opU16(p);
      break;
    case 28720:
      sep.dxtCharSpace = opI32(p);
      break;
    case 36913:
      sep.dyaLinePitch = opI16(p);
      break;
    case 20530:
      sep.clm = opU16(p);
      break;
    case 20531:
      sep.textFlow = opU16(p);
      break;
    case 12347:
      sep.fpc = opU8(p);
      break;
    case 12348:
      sep.rncFtn = opU8(p);
      break;
    case 12350:
      sep.rncEdn = opU8(p);
      break;
    case 20543:
      sep.nFtn = opU16(p);
      break;
    case 20544:
      sep.nfcFtnRef = opU16(p);
      break;
    case 20545:
      sep.nEdn = opU16(p);
      break;
    case 20546:
      sep.nfcEdnRef = opU16(p);
      break;
  }
}

// ../docx-core/src/doc/stsh.ts
var ISTD_NIL = 4095;
function readStsh(fib, table) {
  const { fc, lcb } = fib.fcLcb(FC.Stshf);
  const empty = {
    stshif: { cstd: 0, cbSTDBaseInFile: 10, stdStylenamesWritten: true, stiMaxWhenSaved: 0, ftcAsci: 0, ftcFE: 0, ftcOther: 0, ftcBi: 0 },
    styles: []
  };
  if (!lcb || fc + lcb > table.length) return empty;
  const r = new ByteReader(table);
  const end = fc + lcb;
  const cbStshi = r.u16(fc);
  const s = fc + 2;
  const stshif = {
    cstd: r.u16(s),
    cbSTDBaseInFile: r.u16(s + 2) || 10,
    stdStylenamesWritten: (r.u16(s + 4) & 1) !== 0,
    stiMaxWhenSaved: r.u16(s + 6),
    ftcAsci: r.u16(s + 12),
    ftcFE: r.u16(s + 14),
    ftcOther: r.u16(s + 16),
    ftcBi: cbStshi >= 20 ? r.u16(s + 18) : 0
  };
  let off = s + cbStshi;
  const styles = [];
  for (let istd = 0; istd < stshif.cstd && off + 2 <= end; istd++) {
    const cbStd = r.u16(off);
    const std = off + 2;
    off = std + cbStd;
    if (off - fc & 1) off++;
    if (!cbStd) {
      styles.push(void 0);
      continue;
    }
    const stdEnd = Math.min(std + cbStd, end);
    const w0 = r.u16(std), w1 = r.u16(std + 2), w2 = r.u16(std + 4);
    const grf = r.u16(std + 8);
    const st = {
      istd,
      sti: w0 & 4095,
      stk: w1 & 15,
      istdBase: w1 >> 4 & 4095,
      istdNext: w2 >> 4 & 4095,
      name: "",
      autoRedef: (grf & 1) !== 0,
      hidden: (grf & 2) !== 0,
      semiHidden: (grf & 256) !== 0,
      locked: (grf & 512) !== 0,
      unhideWhenUsed: (grf & 2048) !== 0,
      qFormat: (grf & 4096) !== 0
    };
    const cupx = w2 & 15;
    if (stshif.cbSTDBaseInFile >= 18) {
      const link = r.u16(std + 10) & 4095;
      if (link && link !== ISTD_NIL) st.istdLink = link;
      const pri = r.u16(std + 16) >> 4 & 4095;
      st.priority = pri;
    }
    let o = std + stshif.cbSTDBaseInFile;
    const cch = r.u16(o);
    const full = r.utf16(o + 2, cch);
    o += 2 + cch * 2 + 2;
    const comma = full.indexOf(",");
    st.name = comma >= 0 ? full.slice(0, comma) : full;
    if (comma >= 0) st.aliases = full.slice(comma + 1);
    const upxs = [];
    for (let k = 0; k < cupx && o + 2 <= stdEnd; k++) {
      const cbUpx = r.u16(o);
      upxs.push(r.sub(o + 2, Math.min(o + 2 + cbUpx, stdEnd)));
      o += 2 + cbUpx;
      if (o - std & 1) o++;
    }
    const papxOf = (u) => u && u.length >= 2 ? u.subarray(2) : void 0;
    if (st.stk === 1) {
      st.papx = papxOf(upxs[0]);
      st.chpx = upxs[1];
    } else if (st.stk === 2) {
      st.chpx = upxs[0];
    } else if (st.stk === 3) {
      st.tapx = upxs[0];
      st.papx = papxOf(upxs[1]);
      st.chpx = upxs[2];
    } else if (st.stk === 4) {
      st.papx = papxOf(upxs[0]);
    }
    styles.push(st);
  }
  return { stshif, styles };
}
var StyleResolver = class {
  sheet;
  memo = /* @__PURE__ */ new Map();
  charMemo = /* @__PURE__ */ new Map();
  rootChp;
  constructor(sheet) {
    this.sheet = sheet;
    const f = sheet.stshif;
    this.rootChp = { ...defaultChp(f.ftcAsci, f.ftcFE, f.ftcOther), ftcBi: f.ftcBi };
  }
  style(istd) {
    return this.sheet.styles[istd];
  }
  /** Estilo de parágrafo (ou tabela/numeração) resolvido com a herança. */
  resolve(istd, depth = 0) {
    const hit = this.memo.get(istd);
    if (hit) return hit;
    const st = this.style(istd);
    let parent;
    if (st && st.istdBase !== ISTD_NIL && st.istdBase !== istd && depth < 32 && this.style(st.istdBase)) {
      parent = this.resolve(st.istdBase, depth + 1);
    } else {
      parent = { pap: { istd, widowControl: true }, chp: { ...this.rootChp }, ownPap: /* @__PURE__ */ new Set(), ownChp: /* @__PURE__ */ new Set() };
    }
    const pap = { ...parent.pap, istd, tabsCleared: [] };
    const chp = { ...parent.chp };
    const ownPap = /* @__PURE__ */ new Set();
    const ownChp = /* @__PURE__ */ new Set();
    if (st?.papx) for (const p of prls(st.papx)) applyPap(pap, p, ownPap);
    pruneNoneBorders(pap, parent.pap, ownPap);
    if (st?.chpx) {
      const ctx = { base: { ...parent.chp } };
      for (const p of prls(st.chpx)) if (p.sprm !== 18992) applyChp(chp, p, ctx, ownChp);
    }
    const res = { pap, chp, ownPap, ownChp };
    this.memo.set(istd, res);
    return res;
  }
  /** grpprls da cadeia de um estilo de caractere (raiz → folha). */
  charChain(istd) {
    const hit = this.charMemo.get(istd);
    if (hit) return hit;
    const chain = [];
    const seen = /* @__PURE__ */ new Set();
    let cur = istd;
    while (cur !== ISTD_NIL && !seen.has(cur) && chain.length < 32) {
      seen.add(cur);
      const st = this.style(cur);
      if (!st || st.stk !== 2) break;
      if (st.chpx) chain.unshift(st.chpx);
      cur = st.istdBase;
    }
    this.charMemo.set(istd, chain);
    return chain;
  }
  /** CHP de um estilo de caractere aplicado sobre o CHP do parágrafo. */
  applyCharStyle(istd, onTop) {
    const chp = { ...onTop };
    for (const g of this.charChain(istd)) {
      const ctx = { base: { ...chp } };
      const dummy = /* @__PURE__ */ new Set();
      for (const p of prls(g)) if (p.sprm !== 18992) applyChp(chp, p, ctx, dummy);
    }
    chp.istd = istd;
    return chp;
  }
  /** Delta próprio de um estilo de caractere (contra o pai na cadeia). */
  resolveChar(istd) {
    const st = this.style(istd);
    const parentChp = st && st.istdBase !== ISTD_NIL && st.istdBase !== istd ? this.applyCharStyle(st.istdBase, this.rootChp) : { ...this.rootChp };
    const chp = { ...parentChp };
    const own2 = /* @__PURE__ */ new Set();
    if (st?.chpx) {
      const ctx = { base: { ...parentChp } };
      for (const p of prls(st.chpx)) if (p.sprm !== 18992) applyChp(chp, p, ctx, own2);
    }
    return { chp, own: own2 };
  }
};

// ../docx-core/src/doc/text.ts
var CP1252_HIGH = {
  130: 8218,
  131: 402,
  132: 8222,
  133: 8230,
  134: 8224,
  135: 8225,
  136: 710,
  137: 8240,
  138: 352,
  139: 8249,
  140: 338,
  145: 8216,
  146: 8217,
  147: 8220,
  148: 8221,
  149: 8226,
  150: 8211,
  151: 8212,
  152: 732,
  153: 8482,
  154: 353,
  155: 8250,
  156: 339,
  159: 376
};
function compressedChar(b) {
  return CP1252_HIGH[b] ?? b;
}
function readPieceTable(fib, table) {
  const { fc, lcb } = fib.fcLcb(FC.Clx);
  if (!lcb || fc + lcb > table.length) {
    throw new DocFormatError("Arquivo .doc corrompido: tabela de pe\xE7as (Clx) ausente.");
  }
  const r = new ByteReader(table);
  const end = fc + lcb;
  let off = fc;
  const prcs = [];
  while (off < end && r.u8(off) === 1) {
    const cb = r.i16(off + 1);
    prcs.push(r.sub(off + 3, off + 3 + Math.max(0, cb)));
    off += 3 + Math.max(0, cb);
  }
  if (r.u8(off) !== 2) throw new DocFormatError("Arquivo .doc corrompido: Pcdt ausente no Clx.");
  const lcbPlc = r.u32(off + 1);
  const plc = off + 5;
  const n = Math.floor((lcbPlc - 4) / 12);
  if (n <= 0) throw new DocFormatError("Arquivo .doc corrompido: tabela de pe\xE7as vazia.");
  const pieces = [];
  for (let i2 = 0; i2 < n; i2++) {
    const cpStart = r.u32(plc + i2 * 4);
    const cpEnd = r.u32(plc + (i2 + 1) * 4);
    const pcd = plc + (n + 1) * 4 + i2 * 8;
    const fcRaw = r.u32(pcd + 2);
    const compressed = (fcRaw & 1073741824) !== 0;
    const fcVal = fcRaw & 1073741823;
    if (cpEnd <= cpStart) continue;
    pieces.push({
      cpStart,
      cpEnd,
      fc: compressed ? fcVal / 2 : fcVal,
      compressed,
      prm: r.u16(pcd + 6)
    });
  }
  return { pieces, prcs };
}
function decodeText(pt, word, totalCp) {
  const r = new ByteReader(word);
  const parts = [];
  let cp = 0;
  const chunk = [];
  const flush = () => {
    if (chunk.length) {
      parts.push(String.fromCharCode(...chunk));
      chunk.length = 0;
    }
  };
  for (const p of pt.pieces) {
    if (p.cpStart >= totalCp) break;
    while (cp < p.cpStart) {
      chunk.push(32);
      cp++;
      if (chunk.length > 8192) flush();
    }
    const end = Math.min(p.cpEnd, totalCp);
    for (let c = p.cpStart; c < end; c++) {
      const i2 = c - p.cpStart;
      chunk.push(p.compressed ? compressedChar(r.u8(p.fc + i2)) : r.u16(p.fc + i2 * 2));
      if (chunk.length > 8192) flush();
    }
    cp = Math.max(cp, end);
  }
  while (cp < totalCp) {
    chunk.push(13);
    cp++;
    if (chunk.length > 8192) flush();
  }
  flush();
  return parts.join("");
}
function pieceAt(pieces, cp) {
  let lo = 0, hi = pieces.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const p = pieces[mid];
    if (cp < p.cpStart) hi = mid - 1;
    else if (cp >= p.cpEnd) lo = mid + 1;
    else return mid;
  }
  return -1;
}

// ../docx-core/src/doc/reader.ts
var DocReader = class {
  cfb;
  fib;
  word;
  table;
  data;
  pt;
  text;
  chpx;
  papx;
  stsh;
  styles;
  fonts;
  lists;
  sub;
  sections;
  dop;
  /** Orçamento de descompressão de imagens deste documento (bombas zlib). */
  blipBudget = { left: 512 * 1024 * 1024 };
  shapesMain;
  shapesHdr;
  bstore;
  constructor(bytes) {
    let cfb;
    try {
      cfb = readCfb(bytes);
    } catch (e) {
      throw new DocFormatError(`Arquivo .doc corrompido: ${e.message}`);
    }
    this.cfb = cfb;
    if (cfb.has("EncryptionInfo") || cfb.has("EncryptedPackage")) {
      throw new DocFormatError("O documento est\xE1 protegido por senha (criptografado) e n\xE3o pode ser aberto.");
    }
    const word = cfb.getStream("WordDocument");
    if (!word) throw new DocFormatError("O arquivo n\xE3o \xE9 um documento do Word (.doc): stream WordDocument ausente.");
    this.word = word;
    if (word.length >= 4) {
      const w = new ByteReader(word);
      const ident = w.u16(0);
      const nFib = w.u16(2);
      if (ident === 42476 || ident === 42460) {
        if (nFib < 193 && nFib !== 0) {
          throw new DocFormatError("Documento de uma vers\xE3o anterior ao Word 97 (Word 6/95) \u2014 formato n\xE3o suportado. Abra e salve no Word como .docx.");
        }
      }
    }
    const fib = readFib(word);
    this.fib = fib;
    if (fib.nFib < 193) {
      throw new DocFormatError("Documento de uma vers\xE3o anterior ao Word 97 (Word 6/95) \u2014 formato n\xE3o suportado. Abra e salve no Word como .docx.");
    }
    if (fib.fEncrypted) {
      throw new DocFormatError(fib.fObfuscated ? "O documento est\xE1 protegido por senha (ofusca\xE7\xE3o XOR) e n\xE3o pode ser aberto." : "O documento est\xE1 protegido por senha (criptografado) e n\xE3o pode ser aberto.");
    }
    const table = cfb.getStream(fib.fWhichTblStm ? "1Table" : "0Table");
    if (!table) throw new DocFormatError(`Arquivo .doc corrompido: stream ${fib.fWhichTblStm ? "1Table" : "0Table"} ausente.`);
    this.table = table;
    this.data = cfb.getStream("Data");
    this.pt = readPieceTable(fib, table);
    const c = [fib.ccpText, fib.ccpFtn, fib.ccpHdd, fib.ccpMcr, fib.ccpAtn, fib.ccpEdn, fib.ccpTxbx, fib.ccpHdrTxbx].map((v) => Math.max(0, v));
    let at = 0;
    const span = (n) => {
      const s = [at, at + n];
      at += n;
      return s;
    };
    const main = span(c[0]), ftn = span(c[1]), hdd = span(c[2]);
    span(c[3]);
    const atn = span(c[4]), edn = span(c[5]), txbx = span(c[6]), hdrTxbx = span(c[7]);
    this.sub = { main, ftn, hdd, atn, edn, txbx, hdrTxbx };
    const lastPieceCp = this.pt.pieces.length ? this.pt.pieces[this.pt.pieces.length - 1].cpEnd : 0;
    const totalCp = Math.max(at, Math.min(lastPieceCp, at + 1));
    this.text = decodeText(this.pt, word, totalCp);
    this.chpx = readChpxRuns(fib, table, word);
    this.papx = readPapxRuns(fib, table, word, this.data);
    this.stsh = readStsh(fib, table);
    this.styles = new StyleResolver(this.stsh);
    this.fonts = readFonts(fib, table);
    this.lists = readLists(fib, table);
    this.sections = this.readSections();
    const dop = fib.fcLcb(FC.Dop);
    this.dop = dop.lcb && dop.fc + dop.lcb <= table.length ? table.subarray(dop.fc, dop.fc + dop.lcb) : new Uint8Array(0);
  }
  get pieces() {
    return this.pt.pieces;
  }
  /** grpprl do Prm de uma peça (salvamento rápido). */
  prmGrpprl(piece) {
    const prm = piece.prm;
    if (prm & 1) return this.pt.prcs[prm >> 1];
    return void 0;
  }
  /** FC do CP e a peça. */
  fcAt(cp) {
    const i2 = pieceAt(this.pt.pieces, cp);
    if (i2 < 0) return void 0;
    const p = this.pt.pieces[i2];
    return { fc: p.fc + (cp - p.cpStart) * (p.compressed ? 1 : 2), piece: p };
  }
  /**
   * Fim do parágrafo que contém `cp` ([MS-DOC] 2.4.2): acha a faixa PAPX do FC;
   * se termina dentro da peça, o parágrafo acaba ali; senão segue na peça seguinte.
   */
  paragraphAt(cp, limit) {
    let cur = cp;
    let guard = 0;
    while (cur < limit && guard++ < 1e5) {
      const i2 = pieceAt(this.pt.pieces, cur);
      if (i2 < 0) return { end: limit };
      const p = this.pt.pieces[i2];
      const cs = p.compressed ? 1 : 2;
      const fc = p.fc + (cur - p.cpStart) * cs;
      const run = runAt(this.papx, fc);
      const pieceFcEnd = p.fc + (p.cpEnd - p.cpStart) * cs;
      if (run && run.fcEnd <= pieceFcEnd && run.fcEnd > fc) {
        const end = p.cpStart + Math.ceil((run.fcEnd - p.fc) / cs);
        if (end > limit) return { end: limit, run, piece: p };
        return { end, run, piece: p };
      }
      cur = p.cpEnd;
    }
    return { end: limit };
  }
  // ───────────────────────────── seções ─────────────────────────────
  readSections() {
    const { fc, lcb } = this.fib.fcLcb(FC.PlcfSed);
    const plc = readPlc(this.table, fc, lcb, 12);
    const out = [];
    const w = new ByteReader(this.word);
    const mainEnd = this.sub.main[1];
    if (plc) {
      for (let i2 = 0; i2 < plc.n; i2++) {
        const sep = defaultSep();
        const fcSepx = plc.r.u32(plc.dataAt(i2) + 2);
        if (fcSepx !== 4294967295 && fcSepx + 2 <= this.word.length) {
          const cb = w.i16(fcSepx);
          const grpprl = w.sub(fcSepx + 2, fcSepx + 2 + Math.max(0, cb));
          for (const p of prls(grpprl)) applySep(sep, p);
        }
        const cpStart = Math.min(plc.cps[i2], mainEnd);
        const cpEnd = Math.min(plc.cps[i2 + 1], mainEnd);
        if (cpEnd > cpStart || out.length === 0) out.push({ cpStart, cpEnd, sep });
      }
    }
    if (!out.length) out.push({ cpStart: 0, cpEnd: mainEnd, sep: defaultSep() });
    out[out.length - 1].cpEnd = mainEnd;
    return out;
  }
  // ───────────────────────────── cabeçalhos ─────────────────────────────
  /** Histórias de cabeçalho/rodapé: [início, fim) absolutos, por índice do Plcfhdd. */
  headerStories() {
    const { fc, lcb } = this.fib.fcLcb(FC.PlcfHdd);
    const plc = readPlc(this.table, fc, lcb, 0);
    if (!plc || !this.fib.ccpHdd) return [];
    const base = this.sub.hdd[0];
    const out = [];
    for (let i2 = 0; i2 < plc.cps.length - 2; i2++) {
      const a = plc.cps[i2], b = plc.cps[i2 + 1];
      out.push(b > a && b <= this.fib.ccpHdd ? [base + a, base + b] : void 0);
    }
    return out;
  }
  // ───────────────────────────── notas ─────────────────────────────
  notes(kind) {
    const refIdx = kind === "ftn" ? FC.PlcffndRef : FC.PlcfendRef;
    const txtIdx = kind === "ftn" ? FC.PlcffndTxt : FC.PlcfendTxt;
    const ref = this.fib.fcLcb(refIdx);
    const txt = this.fib.fcLcb(txtIdx);
    const refPlc = readPlc(this.table, ref.fc, ref.lcb, 2);
    const txtPlc = readPlc(this.table, txt.fc, txt.lcb, 0);
    if (!refPlc || !txtPlc) return [];
    const base = (kind === "ftn" ? this.sub.ftn : this.sub.edn)[0];
    const out = [];
    for (let i2 = 0; i2 < refPlc.n; i2++) {
      const a = txtPlc.cps[i2], b = txtPlc.cps[i2 + 1];
      if (a === void 0 || b === void 0) break;
      out.push({ refCp: refPlc.cps[i2], auto: refPlc.r.i16(refPlc.dataAt(i2)) > 0, cpStart: base + a, cpEnd: base + b });
    }
    return out;
  }
  // ───────────────────────────── comentários ─────────────────────────────
  comments() {
    const ref = this.fib.fcLcb(FC.PlcfandRef);
    const txt = this.fib.fcLcb(FC.PlcfandTxt);
    const refPlc = readPlc(this.table, ref.fc, ref.lcb, 30);
    const txtPlc = readPlc(this.table, txt.fc, txt.lcb, 0);
    if (!refPlc || !txtPlc) return [];
    const owners = this.xstArray(FC.GrpXstAtnOwners);
    const base = this.sub.atn[0];
    const bkf = this.fib.fcLcb(FC.PlcfAtnBkf);
    const bkl = this.fib.fcLcb(FC.PlcfAtnBkl);
    const bkfPlc = readPlc(this.table, bkf.fc, bkf.lcb, 4);
    const bklPlc = readPlc(this.table, bkl.fc, bkl.lcb, 0);
    const sttb = this.sttb(FC.SttbfAtnBkmk);
    const ranges = /* @__PURE__ */ new Map();
    if (bkfPlc && bklPlc) {
      for (let i2 = 0; i2 < bkfPlc.n; i2++) {
        const ibkl = bkfPlc.r.u16(bkfPlc.dataAt(i2));
        const end = bklPlc.cps[ibkl];
        const lTag = sttb[i2]?.extra ? new ByteReader(sttb[i2].extra).i32(2) : i2;
        if (end !== void 0) ranges.set(lTag, [bkfPlc.cps[i2], end]);
      }
    }
    const out = [];
    for (let i2 = 0; i2 < refPlc.n; i2++) {
      const a = txtPlc.cps[i2], b = txtPlc.cps[i2 + 1];
      if (a === void 0 || b === void 0) break;
      const o = refPlc.dataAt(i2);
      const cchInit = Math.min(9, refPlc.r.u16(o));
      const initials = refPlc.r.utf16(o + 2, cchInit);
      const ibst = refPlc.r.i16(o + 20);
      const lTag = refPlc.r.i32(o + 26);
      const range = ranges.get(lTag);
      out.push({
        refCp: refPlc.cps[i2],
        cpStart: base + a,
        cpEnd: base + b,
        author: owners[ibst] ?? "",
        initials,
        rangeStart: range?.[0],
        rangeEnd: range?.[1]
      });
    }
    return out;
  }
  /** Lista de Xst (cch u16 + UTF-16) consecutivos. */
  xstArray(idx) {
    const { fc, lcb } = this.fib.fcLcb(idx);
    if (!lcb || fc + lcb > this.table.length) return [];
    const r = new ByteReader(this.table);
    const out = [];
    let o = fc;
    while (o + 2 <= fc + lcb) {
      const cch = r.u16(o);
      out.push(r.utf16(o + 2, cch));
      o += 2 + cch * 2;
    }
    return out;
  }
  /** STTB (estendida ou não) → strings + dados extras. */
  sttb(idx) {
    const { fc, lcb } = this.fib.fcLcb(idx);
    if (!lcb || fc + lcb > this.table.length) return [];
    const r = new ByteReader(this.table);
    let o = fc;
    let cData = r.u16(o);
    o += 2;
    let ext = false;
    if (cData === 65535) {
      ext = true;
      cData = r.u16(o);
      o += 2;
    }
    const cbExtra = r.u16(o);
    o += 2;
    const out = [];
    for (let i2 = 0; i2 < cData && o < fc + lcb; i2++) {
      let s;
      if (ext) {
        const cch = r.u16(o);
        s = r.utf16(o + 2, cch);
        o += 2 + cch * 2;
      } else {
        const cch = r.u8(o);
        s = "";
        for (let k = 0; k < cch; k++) s += String.fromCharCode(r.u8(o + 1 + k));
        o += 1 + cch;
      }
      const extra = cbExtra ? r.sub(o, o + cbExtra) : void 0;
      o += cbExtra;
      out.push({ s, extra });
    }
    return out;
  }
  // ───────────────────────────── bookmarks ─────────────────────────────
  bookmarks() {
    const names = this.sttb(FC.SttbfBkmk);
    const bkf = this.fib.fcLcb(FC.PlcfBkf);
    const bkl = this.fib.fcLcb(FC.PlcfBkl);
    const bkfPlc = readPlc(this.table, bkf.fc, bkf.lcb, 4);
    const bklPlc = readPlc(this.table, bkl.fc, bkl.lcb, 0);
    if (!bkfPlc || !bklPlc) return [];
    const out = [];
    for (let i2 = 0; i2 < bkfPlc.n && i2 < names.length; i2++) {
      const ibkl = bkfPlc.r.u16(bkfPlc.dataAt(i2));
      const end = bklPlc.cps[ibkl];
      if (end === void 0) continue;
      out.push({ name: names[i2].s, cpStart: bkfPlc.cps[i2], cpEnd: end });
    }
    return out;
  }
  /** Autores de revisão (SttbfRMark). */
  revisionAuthors() {
    return this.sttb(FC.SttbfRMark).map((e) => e.s);
  }
  // ───────────────────────────── desenhos ─────────────────────────────
  fspas(hdr) {
    const { fc, lcb } = this.fib.fcLcb(hdr ? FC.PlcSpaHdr : FC.PlcSpaMom);
    const plc = readPlc(this.table, fc, lcb, 26);
    if (!plc) return [];
    const base = hdr ? this.sub.hdd[0] : 0;
    const out = [];
    for (let i2 = 0; i2 < plc.n; i2++) {
      const o = plc.dataAt(i2);
      const r = plc.r;
      const flags = r.u16(o + 20);
      out.push({
        cp: base + plc.cps[i2],
        spid: r.i32(o),
        xaLeft: r.i32(o + 4),
        yaTop: r.i32(o + 8),
        xaRight: r.i32(o + 12),
        yaBottom: r.i32(o + 16),
        bx: flags >> 1 & 3,
        by: flags >> 3 & 3,
        wr: flags >> 5 & 15,
        wrk: flags >> 9 & 15,
        belowText: (flags & 16384) !== 0,
        anchorLock: (flags & 32768) !== 0
      });
    }
    return out;
  }
  loadDrawings() {
    if (this.shapesMain) return;
    this.shapesMain = /* @__PURE__ */ new Map();
    this.shapesHdr = /* @__PURE__ */ new Map();
    this.bstore = [];
    const { fc, lcb } = this.fib.fcLcb(FC.DggInfo);
    if (!lcb || fc + lcb > this.table.length) return;
    const r = new ByteReader(this.table);
    const end = fc + lcb;
    const dgg = readRec(r, fc, end);
    if (!dgg || dgg.type !== OA.DggContainer) return;
    for (const c of children(dgg)) if (c.type === OA.BStoreContainer) this.bstore = readBStore(c);
    let o = dgg.start + dgg.len;
    let guard = 0;
    while (o + 9 <= end && guard++ < 16) {
      const lbl = r.u8(o);
      const dg = readRec(r, o + 1, end);
      if (!dg || dg.type !== OA.DgContainer) break;
      indexDrawing(dg, lbl === 1 ? this.shapesHdr : this.shapesMain);
      o = dg.start + dg.len;
    }
    for (const m of [this.shapesMain, this.shapesHdr]) applyMasters(m, this.masters);
  }
  /** spids das formas-mestre (hspMaster de outra forma): o Word não as desenha. */
  masters = /* @__PURE__ */ new Set();
  shape(spid, hdr) {
    this.loadDrawings();
    return (hdr ? this.shapesHdr : this.shapesMain).get(spid) ?? (hdr ? this.shapesMain : this.shapesHdr).get(spid);
  }
  /** Forma de fundo do documento principal (FSP.fBackground): o fundo da página. */
  backgroundShape() {
    this.loadDrawings();
    for (const s of this.shapesMain.values()) if (s.flags & FSP.background) return s;
    return void 0;
  }
  /** Entrada do BStore (pib 1-based). */
  bse(pib) {
    this.loadDrawings();
    return this.bstore[pib - 1];
  }
  /** Histórias de caixas de texto: lid (spid) → faixa. */
  textboxes(hdr) {
    const { fc, lcb } = this.fib.fcLcb(hdr ? FC.PlcfHdrtxbxTxt : FC.PlcftxbxTxt);
    const plc = readPlc(this.table, fc, lcb, 22);
    if (!plc) return [];
    const base = (hdr ? this.sub.hdrTxbx : this.sub.txbx)[0];
    const out = [];
    for (let i2 = 0; i2 < plc.n; i2++) {
      const o = plc.dataAt(i2);
      const lid = plc.r.i32(o + 14);
      const a = plc.cps[i2], b = plc.cps[i2 + 1];
      if (b > a) out.push({ spid: lid, cpStart: base + a, cpEnd: base + b });
    }
    return out;
  }
  /** Registros OfficeArt do Data stream em [start, end). */
  dataRecords(start, end) {
    if (!this.data) return [];
    return recsIn(new ByteReader(this.data), start, Math.min(end, this.data.length));
  }
};

// ../docx-core/src/doc/xmlw.ts
function stripInvalid(s) {
  let out = "";
  for (let i2 = 0; i2 < s.length; i2++) {
    const c = s.charCodeAt(i2);
    if (c < 32 && c !== 9 && c !== 10 && c !== 13 || c === 65534 || c === 65535) continue;
    if (c >= 55296 && c <= 56319) {
      const n = s.charCodeAt(i2 + 1);
      if (n >= 56320 && n <= 57343) {
        out += s[i2] + s[i2 + 1];
        i2++;
      }
      continue;
    }
    if (c >= 56320 && c <= 57343) continue;
    out += s[i2];
  }
  return out;
}
function escText(s) {
  return stripInvalid(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr4(s) {
  return escText(s).replace(/"/g, "&quot;");
}
function attrs2(obj) {
  let out = "";
  for (const [k, v] of Object.entries(obj)) {
    if (v === void 0 || v === null || v === false) continue;
    out += ` ${k}="${escAttr4(v === true ? "1" : String(v))}"`;
  }
  return out;
}
function el(name, a = {}, content = "") {
  return content ? `<${name}${attrs2(a)}>${content}</${name}>` : `<${name}${attrs2(a)}/>`;
}
var XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
var NS2 = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  pic: "http://schemas.openxmlformats.org/drawingml/2006/picture",
  wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
  wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
  mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
  w14: "http://schemas.microsoft.com/office/word/2010/wordml",
  wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
  v: "urn:schemas-microsoft-com:vml",
  o: "urn:schemas-microsoft-com:office:office",
  w10: "urn:schemas-microsoft-com:office:word",
  m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
  rel: "http://schemas.openxmlformats.org/package/2006/relationships",
  ct: "http://schemas.openxmlformats.org/package/2006/content-types",
  relType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
};
var CONTENT_NS = attrs2({
  "xmlns:wpc": "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
  "xmlns:mc": NS2.mc,
  "xmlns:o": NS2.o,
  "xmlns:r": NS2.r,
  "xmlns:m": NS2.m,
  "xmlns:v": NS2.v,
  "xmlns:wp14": NS2.wp14,
  "xmlns:wp": NS2.wp,
  "xmlns:w10": NS2.w10,
  "xmlns:w": NS2.w,
  "xmlns:w14": NS2.w14,
  "xmlns:wpg": NS2.wpg,
  "xmlns:wps": NS2.wps,
  "xmlns:a": NS2.a,
  "xmlns:pic": NS2.pic,
  "mc:Ignorable": "w14 wp14"
});

// ../docx-core/src/doc/ooxml-props.ts
function hex(c) {
  return c === AUTO ? "auto" : c.toString(16).toUpperCase().padStart(6, "0");
}
var BRC_TYPE = {
  0: "none",
  1: "single",
  2: "thick",
  3: "double",
  5: "single",
  6: "dotted",
  7: "dashed",
  8: "dotDash",
  9: "dotDotDash",
  10: "triple",
  11: "thinThickSmallGap",
  12: "thickThinSmallGap",
  13: "thinThickThinSmallGap",
  14: "thinThickMediumGap",
  15: "thickThinMediumGap",
  16: "thinThickThinMediumGap",
  17: "thinThickLargeGap",
  18: "thickThinLargeGap",
  19: "thinThickThinLargeGap",
  20: "wave",
  21: "doubleWave",
  22: "dashSmallGap",
  23: "dashDotStroked",
  24: "threeDEmboss",
  25: "threeDEngrave",
  26: "outset",
  27: "inset",
  255: "nil"
};
function brcXml(name, b) {
  if (!b) return el(name, { "w:val": "nil" });
  const val3 = BRC_TYPE[b.type] ?? "single";
  if (val3 === "none" || val3 === "nil") return el(name, { "w:val": val3 === "none" && b.width === 0 ? "nil" : val3 });
  return el(name, {
    "w:val": val3,
    "w:sz": b.width,
    "w:space": b.space,
    "w:color": hex(b.color),
    "w:shadow": b.shadow || void 0,
    "w:frame": b.frame || void 0
  });
}
var SHD_PAT = {
  0: "clear",
  1: "solid",
  2: "pct5",
  3: "pct10",
  4: "pct20",
  5: "pct25",
  6: "pct30",
  7: "pct40",
  8: "pct50",
  9: "pct60",
  10: "pct70",
  11: "pct75",
  12: "pct80",
  13: "pct90",
  14: "horzStripe",
  15: "vertStripe",
  16: "reverseDiagStripe",
  17: "diagStripe",
  18: "horzCross",
  19: "diagCross",
  20: "thinHorzStripe",
  21: "thinVertStripe",
  22: "thinReverseDiagStripe",
  23: "thinDiagStripe",
  24: "thinHorzCross",
  25: "thinDiagCross",
  37: "pct12",
  38: "pct15",
  43: "pct35",
  44: "pct37",
  46: "pct45",
  49: "pct55",
  51: "pct62",
  52: "pct65",
  57: "pct85",
  58: "pct87",
  60: "pct95",
  65535: "nil"
};
function shdXml2(s) {
  if (!s) return "";
  const val3 = SHD_PAT[s.pat] ?? "clear";
  if (val3 === "nil") return el("w:shd", { "w:val": "nil" });
  return el("w:shd", { "w:val": val3, "w:color": hex(s.fore), "w:fill": hex(s.back) });
}
var KUL = {
  0: "none",
  1: "single",
  2: "words",
  3: "double",
  4: "dotted",
  6: "thick",
  7: "dash",
  9: "dotDash",
  10: "dotDotDash",
  11: "wave",
  20: "dottedHeavy",
  23: "dashedHeavy",
  25: "dashDotHeavy",
  26: "dashDotDotHeavy",
  27: "wavyHeavy",
  39: "dashLong",
  43: "wavyDouble",
  55: "dashLongHeavy"
};
var HIGHLIGHT = [
  "none",
  "black",
  "blue",
  "cyan",
  "green",
  "magenta",
  "red",
  "yellow",
  "white",
  "darkBlue",
  "darkCyan",
  "darkGreen",
  "darkMagenta",
  "darkRed",
  "darkYellow",
  "darkGray",
  "lightGray"
];
var LCID = {
  0: "x-none",
  1025: "ar-SA",
  1026: "bg-BG",
  1027: "ca-ES",
  1028: "zh-TW",
  1029: "cs-CZ",
  1030: "da-DK",
  1031: "de-DE",
  1032: "el-GR",
  1033: "en-US",
  1034: "es-ES_tradnl",
  1035: "fi-FI",
  1036: "fr-FR",
  1037: "he-IL",
  1038: "hu-HU",
  1039: "is-IS",
  1040: "it-IT",
  1041: "ja-JP",
  1042: "ko-KR",
  1043: "nl-NL",
  1044: "nb-NO",
  1045: "pl-PL",
  1046: "pt-BR",
  1047: "rm-CH",
  1048: "ro-RO",
  1049: "ru-RU",
  1050: "hr-HR",
  1051: "sk-SK",
  1052: "sq-AL",
  1053: "sv-SE",
  1054: "th-TH",
  1055: "tr-TR",
  1056: "ur-PK",
  1057: "id-ID",
  1058: "uk-UA",
  1059: "be-BY",
  1060: "sl-SI",
  1061: "et-EE",
  1062: "lv-LV",
  1063: "lt-LT",
  1065: "fa-IR",
  1066: "vi-VN",
  1069: "eu-ES",
  1078: "af-ZA",
  1081: "hi-IN",
  1086: "ms-MY",
  1110: "gl-ES",
  2052: "zh-CN",
  2055: "de-CH",
  2057: "en-GB",
  2058: "es-MX",
  2060: "fr-BE",
  2064: "it-CH",
  2067: "nl-BE",
  2070: "pt-PT",
  3076: "zh-HK",
  3079: "de-AT",
  3081: "en-AU",
  3082: "es-ES",
  3084: "fr-CA",
  4105: "en-CA",
  4108: "fr-CH",
  5129: "en-NZ",
  6153: "en-IE",
  7177: "en-ZA",
  8201: "en-JM",
  8202: "es-VE",
  9226: "es-CO",
  10250: "es-PE",
  11274: "es-AR",
  12298: "es-EC",
  13322: "es-CL",
  14346: "es-UY",
  15370: "es-PY",
  16394: "es-BO",
  16393: "en-IN",
  21514: "es-US",
  3073: "ar-EG"
};
function lcidTag(lid) {
  if (lid === void 0) return void 0;
  return LCID[lid];
}
function fontName(ctx, ftc) {
  if (ftc === void 0) return void 0;
  return ctx.fonts[ftc]?.name;
}
var onOff5 = (name, v) => v === void 0 ? "" : v ? `<${name}/>` : `<${name} w:val="0"/>`;
function rPrInner(chp, touched, ctx, withStyle = true) {
  const t = (k) => touched.has(k);
  let x2 = "";
  if (withStyle && chp.istd !== void 0 && chp.istd !== 10 && t("istd")) {
    const id = ctx.styleId(chp.istd);
    if (id) x2 += el("w:rStyle", { "w:val": id });
  }
  if (t("ftcAscii") || t("ftcOther") || t("ftcFE") || t("ftcBi") || t("idctHint")) {
    x2 += el("w:rFonts", {
      "w:ascii": t("ftcAscii") ? fontName(ctx, chp.ftcAscii) : void 0,
      "w:eastAsia": t("ftcFE") ? fontName(ctx, chp.ftcFE) : void 0,
      "w:hAnsi": t("ftcOther") ? fontName(ctx, chp.ftcOther) : void 0,
      "w:cs": t("ftcBi") ? fontName(ctx, chp.ftcBi) : void 0,
      "w:hint": t("idctHint") ? chp.idctHint === 1 ? "eastAsia" : chp.idctHint === 2 ? "cs" : void 0 : void 0
    });
  }
  if (t("bold")) x2 += onOff5("w:b", chp.bold);
  if (t("boldBi")) x2 += onOff5("w:bCs", chp.boldBi);
  if (t("italic")) x2 += onOff5("w:i", chp.italic);
  if (t("italicBi")) x2 += onOff5("w:iCs", chp.italicBi);
  if (t("caps")) x2 += onOff5("w:caps", chp.caps);
  if (t("smallCaps")) x2 += onOff5("w:smallCaps", chp.smallCaps);
  if (t("strike")) x2 += onOff5("w:strike", chp.strike);
  if (t("dstrike")) x2 += onOff5("w:dstrike", chp.dstrike);
  if (t("outline")) x2 += onOff5("w:outline", chp.outline);
  if (t("shadow")) x2 += onOff5("w:shadow", chp.shadow);
  if (t("emboss")) x2 += onOff5("w:emboss", chp.emboss);
  if (t("imprint")) x2 += onOff5("w:imprint", chp.imprint);
  if (t("noProof")) x2 += onOff5("w:noProof", chp.noProof);
  if (t("vanish")) x2 += onOff5("w:vanish", chp.vanish);
  if (t("webHidden")) x2 += onOff5("w:webHidden", chp.webHidden);
  if (t("cv") || t("ico")) {
    const c = t("cv") && chp.cv !== void 0 ? chp.cv : icoColor(chp.ico ?? 0);
    x2 += el("w:color", { "w:val": hex(c) });
  }
  if (t("dxaSpace")) x2 += el("w:spacing", { "w:val": chp.dxaSpace });
  if (t("charScale") && chp.charScale !== void 0) x2 += el("w:w", { "w:val": chp.charScale });
  if (t("hpsKern")) x2 += el("w:kern", { "w:val": chp.hpsKern });
  if (t("hpsPos")) x2 += el("w:position", { "w:val": chp.hpsPos });
  if (t("hps")) x2 += el("w:sz", { "w:val": chp.hps });
  if (t("hpsBi")) x2 += el("w:szCs", { "w:val": chp.hpsBi });
  if (t("highlight")) x2 += el("w:highlight", { "w:val": HIGHLIGHT[chp.highlight ?? 0] ?? "none" });
  if (t("kul")) {
    const a = { "w:val": KUL[chp.kul ?? 0] ?? "single" };
    if (t("cvUl") && chp.cvUl !== void 0) a["w:color"] = hex(chp.cvUl);
    x2 += el("w:u", a);
  }
  if (t("brc")) x2 += brcXml("w:bdr", chp.brc);
  if (t("shd")) x2 += shdXml2(chp.shd);
  if (t("iss")) x2 += el("w:vertAlign", { "w:val": chp.iss === 1 ? "superscript" : chp.iss === 2 ? "subscript" : "baseline" });
  if (t("rtl")) x2 += onOff5("w:rtl", chp.rtl);
  if (t("cs")) x2 += onOff5("w:cs", chp.cs);
  if (t("kcd")) x2 += el("w:em", { "w:val": ["none", "dot", "comma", "circle", "underDot"][chp.kcd ?? 0] ?? "none" });
  if (t("lid") || t("lidFE") || t("lidBi")) {
    const a = {
      "w:val": t("lid") ? lcidTag(chp.lid) : void 0,
      "w:eastAsia": t("lidFE") ? lcidTag(chp.lidFE) : void 0,
      "w:bidi": t("lidBi") ? lcidTag(chp.lidBi) : void 0
    };
    if (a["w:val"] || a["w:eastAsia"] || a["w:bidi"]) x2 += el("w:lang", a);
  }
  if (t("specVanish")) x2 += onOff5("w:specVanish", chp.specVanish);
  return x2;
}
var JC = ["left", "center", "right", "both", "distribute", "mediumKashida", "both", "highKashida", "lowKashida", "thaiDistribute"];
function jcVal(jc, paraJc80 = false) {
  if (paraJc80 && jc !== void 0 && jc >= 3 && jc <= 5) return "both";
  return JC[jc ?? 0] ?? "left";
}
var TAB_JC = ["left", "center", "right", "decimal", "bar", "clear", "num", "left"];
var TAB_TLC = [void 0, "dot", "hyphen", "underscore", "heavy", "middleDot", void 0, void 0];
function tabsXml(base, final, cleared = []) {
  const b = base ?? [];
  const f = final ?? [];
  const same2 = (x3, y) => x3.pos === y.pos && x3.jc === y.jc && x3.tlc === y.tlc;
  const clearPos = new Set(b.filter((x3) => !f.some((y) => same2(x3, y))).map((x3) => x3.pos));
  for (const p of cleared) if (!f.some((y) => y.pos === p)) clearPos.add(p);
  const adds = f.filter((y) => !b.some((x3) => same2(x3, y)));
  if (!clearPos.size && !adds.length) return "";
  let x2 = "";
  for (const c of [...clearPos].sort((p, q) => p - q)) if (!adds.some((a) => a.pos === c)) x2 += el("w:tab", { "w:val": "clear", "w:pos": c });
  for (const a of adds) x2 += el("w:tab", { "w:val": TAB_JC[a.jc] ?? "left", "w:leader": TAB_TLC[a.tlc], "w:pos": a.pos });
  return x2 ? `<w:tabs>${x2}</w:tabs>` : "";
}
function pPrInner(pap, touched, ctx, o = {}) {
  const t = (k) => touched.has(k);
  let x2 = "";
  if (o.withStyle !== false && pap.istd !== 0 && pap.istd !== void 0) {
    const id = ctx.styleId(pap.istd);
    if (id) x2 += el("w:pStyle", { "w:val": id });
  }
  if (t("keepFollow")) x2 += onOff5("w:keepNext", pap.keepFollow);
  if (t("keep")) x2 += onOff5("w:keepLines", pap.keep);
  if (t("pageBreakBefore")) x2 += onOff5("w:pageBreakBefore", pap.pageBreakBefore);
  x2 += framePrXml(pap, touched);
  if (t("widowControl")) x2 += onOff5("w:widowControl", pap.widowControl);
  if (t("ilfo") || t("ilvl")) {
    const ilfo = pap.ilfo ?? 0;
    const numId = ilfo === 0 || ilfo === -2047 ? 0 : o.numId ? o.numId(Math.abs(ilfo)) : Math.abs(ilfo);
    let n = "";
    if (t("ilvl") || numId) n += el("w:ilvl", { "w:val": Math.min(8, pap.ilvl ?? 0) });
    n += el("w:numId", { "w:val": numId });
    x2 += `<w:numPr>${n}</w:numPr>`;
  }
  if (t("noLineNumb")) x2 += onOff5("w:suppressLineNumbers", pap.noLineNumb);
  const bdr = ["brcTop", "brcLeft", "brcBottom", "brcRight", "brcBetween", "brcBar"].filter((k) => t(k)).map((k) => brcXml(`w:${{ brcTop: "top", brcLeft: "left", brcBottom: "bottom", brcRight: "right", brcBetween: "between", brcBar: "bar" }[k]}`, pap[k])).join("");
  if (bdr) x2 += `<w:pBdr>${bdr}</w:pBdr>`;
  if (t("shd")) x2 += shdXml2(pap.shd);
  if (t("tabs")) x2 += tabsXml(o.baseTabs, pap.tabs, pap.tabsCleared);
  if (t("noAutoHyph")) x2 += onOff5("w:suppressAutoHyphens", pap.noAutoHyph);
  if (t("kinsoku")) x2 += onOff5("w:kinsoku", pap.kinsoku);
  if (t("wordWrap")) x2 += onOff5("w:wordWrap", pap.wordWrap);
  if (t("overflowPunct")) x2 += onOff5("w:overflowPunct", pap.overflowPunct);
  if (t("topLinePunct")) x2 += onOff5("w:topLinePunct", pap.topLinePunct);
  if (t("autoSpaceDE")) x2 += onOff5("w:autoSpaceDE", pap.autoSpaceDE);
  if (t("autoSpaceDN")) x2 += onOff5("w:autoSpaceDN", pap.autoSpaceDN);
  if (t("bidi")) x2 += onOff5("w:bidi", pap.bidi);
  if (t("adjustRight")) x2 += onOff5("w:adjustRightInd", pap.adjustRight);
  if (t("usePgsuSettings")) x2 += onOff5("w:snapToGrid", pap.usePgsuSettings);
  if (t("dyaBefore") || t("dyaAfter") || t("lineSpacing") || t("beforeAuto") || t("afterAuto") || t("dylBefore") || t("dylAfter")) {
    const ls = pap.lineSpacing;
    x2 += el("w:spacing", {
      "w:before": t("dyaBefore") ? pap.dyaBefore : void 0,
      "w:beforeLines": t("dylBefore") ? pap.dylBefore : void 0,
      "w:beforeAutospacing": t("beforeAuto") ? pap.beforeAuto ? "1" : "0" : void 0,
      "w:after": t("dyaAfter") ? pap.dyaAfter : void 0,
      "w:afterLines": t("dylAfter") ? pap.dylAfter : void 0,
      "w:afterAutospacing": t("afterAuto") ? pap.afterAuto ? "1" : "0" : void 0,
      "w:line": t("lineSpacing") && ls ? Math.abs(ls.line) : void 0,
      "w:lineRule": t("lineSpacing") && ls ? ls.mult ? "auto" : ls.line < 0 ? "exact" : "atLeast" : void 0
    });
  }
  if (t("dxaLeft") || t("dxaRight") || t("dxaLeft1") || t("dxcLeft") || t("dxcRight") || t("dxcLeft1")) {
    const l1 = pap.dxaLeft1;
    const a = {
      "w:left": t("dxaLeft") ? pap.dxaLeft : void 0,
      "w:leftChars": t("dxcLeft") ? pap.dxcLeft : void 0,
      "w:right": t("dxaRight") ? pap.dxaRight : void 0,
      "w:rightChars": t("dxcRight") ? pap.dxcRight : void 0
    };
    if (t("dxaLeft1") && l1 !== void 0) {
      if (l1 < 0) a["w:hanging"] = -l1;
      else a["w:firstLine"] = l1;
    }
    if (t("dxcLeft1") && pap.dxcLeft1 !== void 0) {
      if (pap.dxcLeft1 < 0) a["w:hangingChars"] = -pap.dxcLeft1;
      else a["w:firstLineChars"] = pap.dxcLeft1;
    }
    x2 += el("w:ind", a);
  }
  if (t("contextualSpacing")) x2 += onOff5("w:contextualSpacing", pap.contextualSpacing);
  if (t("mirrorIndents")) x2 += onOff5("w:mirrorIndents", pap.mirrorIndents);
  if (t("jc")) x2 += el("w:jc", { "w:val": jcVal(pap.jc) });
  if (t("wAlignFont")) x2 += el("w:textAlignment", { "w:val": ["top", "center", "baseline", "bottom", "auto"][pap.wAlignFont ?? 4] ?? "auto" });
  if (t("outLvl") && pap.outLvl !== void 0 && pap.outLvl <= 9) x2 += el("w:outlineLvl", { "w:val": pap.outLvl });
  if (o.rPr) x2 += `<w:rPr>${o.rPr}</w:rPr>`;
  if (o.sectPr) x2 += o.sectPr;
  return x2;
}
function framePrXml(pap, touched) {
  const keys = ["dxaAbs", "dyaAbs", "dxaWidth", "wr", "wHeightAbs", "dcs"];
  if (!keys.some((k) => touched.has(k) && pap[k])) return "";
  const pc = pap.pc ?? 0;
  const pcVert = pc >> 4 & 3;
  const pcHorz = pc >> 6 & 3;
  const a = {};
  if (pap.dcs) {
    const fdct = pap.dcs & 7;
    const lines = pap.dcs >> 3 & 31;
    if (fdct) {
      a["w:dropCap"] = fdct === 1 ? "drop" : "margin";
      a["w:lines"] = lines;
    }
  }
  if (pap.dxaWidth) a["w:w"] = pap.dxaWidth;
  if (pap.wHeightAbs) {
    a["w:h"] = pap.wHeightAbs & 32767;
    if (!(pap.wHeightAbs & 32768)) a["w:hRule"] = "exact";
  }
  if (pap.dxaFromText) a["w:hSpace"] = pap.dxaFromText;
  if (pap.dyaFromText) a["w:vSpace"] = pap.dyaFromText;
  a["w:wrap"] = ["auto", "notBeside", "around", "none", "tight", "through"][pap.wr ?? 0] ?? "auto";
  const v = ["margin", "page", "text"][pcVert];
  if (v && v !== "margin") a["w:vAnchor"] = v;
  a["w:hAnchor"] = ["text", "margin", "page"][pcHorz] ?? "text";
  const xa = pap.dxaAbs ?? 0;
  const xAlign = { [-4]: "center", [-8]: "right", [-12]: "inside", [-16]: "outside" };
  if (xAlign[xa]) a["w:xAlign"] = xAlign[xa];
  else if (xa) a["w:x"] = xa;
  const ya = pap.dyaAbs ?? 0;
  const yAlign = { [-4]: "top", [-8]: "center", [-12]: "bottom", [-16]: "inside", [-20]: "outside" };
  if (yAlign[ya]) a["w:yAlign"] = yAlign[ya];
  else if (ya) a["w:y"] = ya;
  if (pap.frameLocked) a["w:anchorLock"] = "1";
  const order2 = ["w:dropCap", "w:lines", "w:w", "w:h", "w:hRule", "w:hSpace", "w:vSpace", "w:wrap", "w:vAnchor", "w:hAnchor", "w:x", "w:xAlign", "w:y", "w:yAlign", "w:anchorLock"];
  const sorted = {};
  for (const k of order2) if (a[k] !== void 0) sorted[k] = a[k];
  return el("w:framePr", sorted);
}
var NFC = {
  0: "decimal",
  1: "upperRoman",
  2: "lowerRoman",
  3: "upperLetter",
  4: "lowerLetter",
  5: "ordinal",
  6: "cardinalText",
  7: "ordinalText",
  8: "hex",
  9: "chicago",
  10: "ideographDigital",
  11: "japaneseCounting",
  12: "aiueo",
  13: "iroha",
  14: "decimalFullWidth",
  15: "decimalHalfWidth",
  16: "japaneseLegal",
  17: "japaneseDigitalTenThousand",
  18: "decimalEnclosedCircle",
  19: "decimalFullWidth2",
  20: "aiueoFullWidth",
  21: "irohaFullWidth",
  22: "decimalZero",
  23: "bullet",
  24: "ganada",
  25: "chosung",
  26: "decimalEnclosedFullstop",
  27: "decimalEnclosedParen",
  28: "decimalEnclosedCircleChinese",
  29: "ideographEnclosedCircle",
  30: "ideographTraditional",
  31: "ideographZodiac",
  32: "ideographZodiacTraditional",
  33: "taiwaneseCounting",
  34: "ideographLegalTraditional",
  35: "taiwaneseCountingThousand",
  36: "taiwaneseDigital",
  37: "chineseCounting",
  38: "chineseLegalSimplified",
  39: "chineseCountingThousand",
  41: "koreanDigital",
  42: "koreanCounting",
  43: "koreanLegal",
  44: "koreanDigital2",
  45: "hebrew1",
  46: "arabicAlpha",
  47: "hebrew2",
  48: "arabicAbjad",
  49: "hindiVowels",
  50: "hindiConsonants",
  51: "hindiNumbers",
  52: "thaiLetters",
  53: "thaiNumbers",
  54: "thaiCounting",
  55: "vietnameseCounting",
  56: "numberInDash",
  57: "russianLower",
  58: "russianUpper",
  255: "none"
};
function numFmtOf(nfc) {
  return NFC[nfc] ?? "decimal";
}

// ../docx-core/src/doc/numbering.ts
var hex8 = (v) => (v >>> 0).toString(16).toUpperCase().padStart(8, "0");
function lvlText(lvl) {
  const marks = new Set(lvl.rgbxchNums);
  let s = "";
  for (let i2 = 0; i2 < lvl.xst.length; i2++) {
    const c = lvl.xst.charCodeAt(i2);
    if (marks.has(i2 + 1) && c <= 8) s += `%${c + 1}`;
    else s += lvl.xst[i2];
  }
  return s;
}
function lvlXml(lvl, ilvl, ctx, pStyle, tplc) {
  let x2 = "";
  x2 += el("w:start", { "w:val": lvl.start });
  x2 += el("w:numFmt", { "w:val": numFmtOf(lvl.nfc) });
  if (lvl.noRestart) x2 += el("w:lvlRestart", { "w:val": lvl.ilvlRestartLim });
  if (pStyle) x2 += el("w:pStyle", { "w:val": pStyle });
  if (lvl.legal) x2 += "<w:isLgl/>";
  if (lvl.follow === 1) x2 += el("w:suff", { "w:val": "space" });
  else if (lvl.follow === 2) x2 += el("w:suff", { "w:val": "nothing" });
  x2 += el("w:lvlText", { "w:val": lvlText(lvl) });
  x2 += el("w:lvlJc", { "w:val": ["left", "center", "right"][lvl.jc] ?? "left" });
  const pap = { istd: 0 };
  const pt = /* @__PURE__ */ new Set();
  for (const p of prls(lvl.grpprlPapx)) applyPap(pap, p, pt);
  const ppr = pPrInner(pap, pt, ctx, { withStyle: false, baseTabs: [] });
  if (ppr) x2 += `<w:pPr>${ppr}</w:pPr>`;
  const chp = {};
  const ct = /* @__PURE__ */ new Set();
  for (const p of prls(lvl.grpprlChpx)) applyChp(chp, p, { base: {} }, ct);
  const rpr = rPrInner(chp, ct, ctx, false);
  if (rpr) x2 += `<w:rPr>${rpr}</w:rPr>`;
  return el("w:lvl", { "w:ilvl": ilvl, "w:tplc": tplc !== void 0 ? hex8(tplc) : void 0, "w:tentative": lvl.tentative ? "1" : void 0 }, x2);
}
function buildNumbering(r, ctx) {
  const { lsts, lfos } = r.lists;
  if (!lsts.length) return void 0;
  let x2 = "";
  const absByLsid = /* @__PURE__ */ new Map();
  lsts.forEach((l, i2) => {
    absByLsid.set(l.lsid, i2);
    let c = el("w:nsid", { "w:val": hex8(l.lsid) });
    c += el("w:multiLevelType", { "w:val": l.simple ? "singleLevel" : l.hybrid ? "hybridMultilevel" : "multilevel" });
    c += el("w:tmpl", { "w:val": hex8(l.tplc) });
    l.levels.forEach((lvl, k) => {
      const istd = l.rgistdPara[k];
      const pStyle = istd !== void 0 && istd !== 4095 ? ctx.styleId(istd) : void 0;
      c += lvlXml(lvl, k, ctx, pStyle);
    });
    x2 += el("w:abstractNum", { "w:abstractNumId": i2 }, c);
  });
  lfos.forEach((lfo, i2) => {
    const abs = absByLsid.get(lfo.lsid);
    if (abs === void 0) return;
    let c = el("w:abstractNumId", { "w:val": abs });
    for (const ov of lfo.overrides) {
      let o = "";
      if (ov.startAt !== void 0) o += el("w:startOverride", { "w:val": ov.startAt });
      if (ov.lvl) o += lvlXml(ov.lvl, ov.ilvl, ctx, void 0);
      if (o) c += el("w:lvlOverride", { "w:ilvl": ov.ilvl }, o);
    }
    x2 += el("w:num", { "w:numId": i2 + 1 }, c);
  });
  return `${XML_DECL}<w:numbering xmlns:w="${NS2.w}" xmlns:r="${NS2.r}">${x2}</w:numbering>`;
}

// ../docx-core/src/doc/settings.ts
var COMPAT = [
  { el: "useSingleBorderforContiguousCells", src: "c60", bit: 8 },
  { el: "wpJustification", src: "c80", bit: 14 },
  { el: "noTabHangInd", src: "c60", bit: 0 },
  { el: "noLeading", src: "c80", bit: 3 },
  { el: "spaceForUL", src: "c80", bit: 4, inv: true },
  { el: "noColumnBalance", src: "c60", bit: 5 },
  { el: "balanceSingleByteDoubleByteWidth", src: "c60", bit: 15, inv: true },
  { el: "noExtraLineSpacing", src: "c80", bit: 11 },
  { el: "doNotLeaveBackslashAlone", src: "c60", bit: 12, inv: true },
  { el: "ulTrailSpace", src: "c60", bit: 14, inv: true },
  { el: "doNotExpandShiftReturn", src: "c60", bit: 13, inv: true },
  { el: "spacingInWholePoints", src: "c80", bit: 1 },
  { el: "lineWrapLikeWord6", src: "c80", bit: 9 },
  { el: "printBodyTextBeforeHeader", src: "c80", bit: 2 },
  { el: "printColBlack", src: "c60", bit: 4 },
  { el: "wpSpaceWidth", src: "c80", bit: 13 },
  { el: "showBreaksInFrames", src: "c60", bit: 10 },
  { el: "subFontBySize", src: "c80", bit: 8 },
  { el: "suppressBottomSpacing", src: "c80", bit: 12 },
  { el: "suppressTopSpacing", src: "c60", bit: 7 },
  { el: "suppressSpacingAtTopOfPage", src: "c80", bit: 0 },
  { el: "suppressTopSpacingWP", src: "c80", bit: 6 },
  { el: "suppressSpBfAfterPgBrk", src: "c60", bit: 2 },
  { el: "swapBordersFacingPages", src: "c60", bit: 11 },
  { el: "convMailMergeEsc", src: "c60", bit: 6 },
  { el: "truncateFontHeightsLikeWP6", src: "c80", bit: 7 },
  { el: "mwSmallCaps", src: "c80", bit: 5 },
  { el: "usePrinterMetrics", src: "c80", bit: 15 },
  { el: "doNotSuppressParagraphBorders", src: "c80", bit: 10 },
  { el: "wrapTrailSpaces", src: "c60", bit: 3 },
  { el: "footnoteLayoutLikeWW8", src: "c", bit: 1 },
  { el: "shapeLayoutLikeWW8", src: "c", bit: 0 },
  { el: "alignTablesRowByRow", src: "c", bit: 6 },
  { el: "forgetLastTabAlignment", src: "c", bit: 4 },
  { el: "adjustLineHeightInTable", src: "c", bit: 3, inv: true },
  { el: "autoSpaceLikeWord95", src: "c", bit: 5 },
  { el: "noSpaceRaiseLower", src: "c60", bit: 1 },
  { el: "doNotUseHTMLParagraphAutoSpacing", src: "c", bit: 2 },
  { el: "layoutRawTableWidth", src: "c", bit: 7 },
  { el: "layoutTableRowsApart", src: "c", bit: 8 },
  { el: "useWord97LineBreakRules", src: "c", bit: 9 },
  { el: "doNotBreakWrappedTables", src: "c", bit: 10 },
  { el: "doNotSnapToGridInCell", src: "c", bit: 11 },
  { el: "selectFldWithFirstOrLastChar", src: "c", bit: 12 },
  { el: "applyBreakingRules", src: "c", bit: 13 },
  { el: "doNotWrapTextWithPunct", src: "c", bit: 14 },
  { el: "doNotUseEastAsianBreakRules", src: "c", bit: 15 },
  { el: "useWord2002TableStyleRules", src: "c", bit: 16 },
  { el: "growAutofit", src: "c", bit: 17 },
  { el: "useFELayout", src: "fe", bit: 0 },
  { el: "useNormalStyleForList", src: "c", bit: 18 },
  { el: "doNotUseIndentAsNumberingTabStop", src: "c", bit: 19 },
  { el: "useAltKinsokuLineBreakRules", src: "c", bit: 20 },
  { el: "allowSpaceOfSameStyleInTable", src: "c", bit: 21 },
  { el: "doNotSuppressIndentation", src: "c", bit: 22 },
  { el: "doNotAutofitConstrainedTables", src: "c", bit: 23 },
  { el: "autofitToFirstFixedWidthCell", src: "c", bit: 24 },
  { el: "underlineTabInNumList", src: "c", bit: 25 },
  { el: "displayHangulFixedWidth", src: "c", bit: 26 },
  { el: "splitPgBreakAndParaMark", src: "c", bit: 27 },
  { el: "doNotVertAlignCellWithSp", src: "c", bit: 28 },
  { el: "doNotBreakConstrainedForcedTable", src: "c", bit: 29 },
  { el: "doNotVertAlignInTxbx", src: "c", bit: 30 },
  { el: "useAnsiKerningPairs", src: "c", bit: 31 },
  { el: "cachedColBalance", src: "c2", bit: 0 }
];
function readDop(bytes, nFib = 274) {
  const r = new ByteReader(bytes);
  const b0 = r.u8(0);
  const f32 = r.u32(4);
  const dop = {
    facingPages: (b0 & 1) !== 0,
    fpc: b0 >> 5 & 3,
    rncFtn: r.u16(2) & 3,
    nFtn: r.u16(2) >> 2,
    mirrorMargins: (f32 & 1 << 21) !== 0,
    autoHyphen: (f32 & 1 << 12) !== 0,
    hyphCapitals: (f32 & 1 << 11) !== 0,
    revMarking: (f32 & 1 << 15) !== 0,
    copts60: r.u16(8),
    dxaTab: r.u16(10) || 720,
    dxaHotZ: r.u16(14),
    cConsecHypLim: r.u16(16),
    rncEdn: r.u16(52) & 3,
    nEdn: r.u16(52) >> 2,
    epc: r.u16(54) & 3,
    zoom: r.u16(82) >> 3 & 511,
    copts80hi: bytes.length >= 88 ? r.u16(86) : 0,
    protForms: (f32 & 1 << 25) !== 0,
    lockAtn: (f32 & 1 << 20) !== 0,
    lockRev: (f32 & 1 << 30) !== 0,
    // Dop2003 (depois dos 594 bytes do Dop2002): flags A..M em 594, O..T em 598
    lockAtnReadOnly: bytes.length >= 600 && (r.u16(594) & 1) !== 0,
    styleLock: bytes.length >= 600 && (r.u16(594) & 2) !== 0,
    enforceDocProt: bytes.length >= 600 && (r.u16(598) & 8) !== 0,
    docProtCur: bytes.length >= 600 ? r.u16(598) >> 4 & 7 : 7,
    printFormData: (r.u16(54) & 1024) !== 0,
    saveFormData: (r.u16(54) & 2048) !== 0,
    shadeFormData: (r.u16(54) & 4096) !== 0,
    includeSubdocsInStats: (r.u16(54) & 32768) !== 0,
    snapBorder: bytes.length >= 412 && (r.u16(410) & 2048) !== 0,
    includeHeader: bytes.length < 412 || (r.u16(410) & 4096) !== 0,
    includeFooter: bytes.length < 412 || (r.u16(410) & 8192) !== 0,
    kerningPunct: bytes.length >= 92 && (r.u16(90) & 1) !== 0,
    justification: bytes.length >= 92 ? r.u16(90) >> 1 & 3 : 0
  };
  if (bytes.length >= 410) {
    const g = r.u16(408);
    dop.grid = { xa: r.u16(400), ya: r.u16(402), dxa: r.u16(404), dya: r.u16(406), dyDisplay: g & 127, dxDisplay: g >> 8 & 127, followMargins: (g & 32768) !== 0 };
  }
  if (bytes.length >= 520) {
    dop.copts = r.u32(512);
    dop.copts2 = r.u32(516);
  }
  if (nFib <= 217) dop.copts = (dop.copts ?? 0) | 4294958080;
  dop.copts2 = (dop.copts2 ?? 0) | 1;
  return dop;
}
function protectionXml(dop) {
  let edit;
  let enforced = true;
  if (dop.lockRev) edit = "trackedChanges";
  else if (dop.lockAtn) edit = dop.lockAtnReadOnly ? "readOnly" : "comments";
  else if (dop.protForms) edit = "forms";
  else if (dop.enforceDocProt) {
    edit = ["trackedChanges", "comments", "forms", "readOnly"][dop.docProtCur];
    enforced = false;
  }
  if (!edit && !dop.styleLock) return "";
  return el("w:documentProtection", {
    "w:edit": edit,
    "w:formatting": dop.styleLock ? "1" : void 0,
    "w:enforcement": edit ? enforced ? "1" : "0" : "0"
  });
}
function compatXml(dop, feLayout) {
  let x2 = "";
  for (const f of COMPAT) {
    let on;
    if (f.src === "fe") on = feLayout;
    else if (f.src === "c60") on = (dop.copts60 & 1 << f.bit) !== 0;
    else if (f.src === "c80") on = (dop.copts80hi & 1 << f.bit) !== 0;
    else if (f.src === "c") {
      if (dop.copts === void 0) continue;
      on = (dop.copts >>> f.bit & 1) !== 0;
    } else {
      if (dop.copts2 === void 0) continue;
      on = (dop.copts2 >>> f.bit & 1) !== 0;
    }
    if (f.inv) on = !on;
    if (on) x2 += `<w:${f.el}/>`;
  }
  x2 += el("w:compatSetting", { "w:name": "compatibilityMode", "w:uri": "http://schemas.microsoft.com/office/word", "w:val": 11 });
  return `<w:compat>${x2}</w:compat>`;
}
function buildSettings(r, o) {
  const dop = readDop(r.dop, r.fib.nFib);
  const fe = r.fonts[r.stsh.stshif.ftcFE];
  const feLayout = !!fe && [128, 129, 130, 134, 136].includes(fe.charset);
  let x2 = "";
  if (dop.zoom >= 10 && dop.zoom <= 500) x2 += el("w:zoom", { "w:percent": dop.zoom });
  if (dop.printFormData) x2 += "<w:printFormsData/>";
  if (dop.saveFormData) x2 += "<w:saveFormsData/>";
  if (dop.mirrorMargins) x2 += "<w:mirrorMargins/>";
  if (dop.snapBorder) x2 += "<w:alignBordersAndEdges/>";
  if (!dop.includeHeader) x2 += "<w:bordersDoNotSurroundHeader/>";
  if (!dop.includeFooter) x2 += "<w:bordersDoNotSurroundFooter/>";
  if (dop.revMarking) x2 += "<w:trackRevisions/>";
  x2 += protectionXml(dop);
  x2 += el("w:defaultTabStop", { "w:val": dop.dxaTab });
  if (dop.autoHyphen) x2 += "<w:autoHyphenation/>";
  if (dop.cConsecHypLim) x2 += el("w:consecutiveHyphenLimit", { "w:val": dop.cConsecHypLim });
  if (dop.dxaHotZ && dop.dxaHotZ !== 360) x2 += el("w:hyphenationZone", { "w:val": dop.dxaHotZ });
  if (!dop.hyphCapitals) x2 += "<w:doNotHyphenateCaps/>";
  if (dop.facingPages) x2 += "<w:evenAndOddHeaders/>";
  const g = dop.grid;
  if (g) {
    if (g.dxa !== 180) x2 += el("w:drawingGridHorizontalSpacing", { "w:val": g.dxa });
    if (g.dya !== 180) x2 += el("w:drawingGridVerticalSpacing", { "w:val": g.dya });
    if (g.dxDisplay !== 1) x2 += el("w:displayHorizontalDrawingGridEvery", { "w:val": g.dxDisplay });
    if (g.dyDisplay !== 1) x2 += el("w:displayVerticalDrawingGridEvery", { "w:val": g.dyDisplay });
    if (!g.followMargins) {
      x2 += "<w:doNotUseMarginsForDrawingGridOrigin/>";
      if (g.xa !== 1701) x2 += el("w:drawingGridHorizontalOrigin", { "w:val": g.xa });
      if (g.ya !== 1984) x2 += el("w:drawingGridVerticalOrigin", { "w:val": g.ya });
    }
  }
  if (!dop.shadeFormData) x2 += "<w:doNotShadeFormData/>";
  if (!dop.kerningPunct) x2 += "<w:noPunctuationKerning/>";
  x2 += el("w:characterSpacingControl", { "w:val": ["doNotCompress", "compressPunctuation", "compressPunctuationAndJapaneseKana"][dop.justification] ?? "doNotCompress" });
  if (o.footnotes) x2 += '<w:footnotePr><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr>';
  if (o.endnotes) x2 += '<w:endnotePr><w:endnote w:id="-1"/><w:endnote w:id="0"/></w:endnotePr>';
  x2 += compatXml(dop, feLayout);
  if (!dop.includeSubdocsInStats) x2 += "<w:doNotIncludeSubdocsInStats/>";
  return `${XML_DECL}<w:settings${attrs2({ "xmlns:w": NS2.w, "xmlns:r": NS2.r, "xmlns:m": NS2.m })}>${x2}</w:settings>`;
}

// ../docx-core/src/doc/styles-xml.ts
var STI_NAMES = [
  "Normal",
  "heading 1",
  "heading 2",
  "heading 3",
  "heading 4",
  "heading 5",
  "heading 6",
  "heading 7",
  "heading 8",
  "heading 9",
  "index 1",
  "index 2",
  "index 3",
  "index 4",
  "index 5",
  "index 6",
  "index 7",
  "index 8",
  "index 9",
  "toc 1",
  "toc 2",
  "toc 3",
  "toc 4",
  "toc 5",
  "toc 6",
  "toc 7",
  "toc 8",
  "toc 9",
  "Normal Indent",
  "footnote text",
  "annotation text",
  "header",
  "footer",
  "index heading",
  "caption",
  "table of figures",
  "envelope address",
  "envelope return",
  "footnote reference",
  "annotation reference",
  "line number",
  "page number",
  "endnote reference",
  "endnote text",
  "table of authorities",
  "macro",
  "toa heading",
  "List",
  "List Bullet",
  "List Number",
  "List 2",
  "List 3",
  "List 4",
  "List 5",
  "List Bullet 2",
  "List Bullet 3",
  "List Bullet 4",
  "List Bullet 5",
  "List Number 2",
  "List Number 3",
  "List Number 4",
  "List Number 5",
  "Title",
  "Closing",
  "Signature",
  "Default Paragraph Font",
  "Body Text",
  "Body Text Indent",
  "List Continue",
  "List Continue 2",
  "List Continue 3",
  "List Continue 4",
  "List Continue 5",
  "Message Header",
  "Subtitle",
  "Salutation",
  "Date",
  "Body Text First Indent",
  "Body Text First Indent 2",
  "Note Heading",
  "Body Text 2",
  "Body Text 3",
  "Body Text Indent 2",
  "Body Text Indent 3",
  "Block Text",
  "Hyperlink",
  "FollowedHyperlink",
  "Strong",
  "Emphasis",
  "Document Map",
  "Plain Text",
  "E-mail Signature",
  "HTML Top of Form",
  "HTML Bottom of Form",
  "Normal (Web)",
  "HTML Acronym",
  "HTML Address",
  "HTML Cite",
  "HTML Code",
  "HTML Definition",
  "HTML Keyboard",
  "HTML Preformatted",
  "HTML Sample",
  "HTML Typewriter",
  "HTML Variable",
  "Normal Table",
  "annotation subject",
  "No List",
  "Outline List 1",
  "Outline List 2",
  "Outline List 3",
  "Table Simple 1",
  "Table Simple 2",
  "Table Simple 3",
  "Table Classic 1",
  "Table Classic 2",
  "Table Classic 3",
  "Table Classic 4",
  "Table Colorful 1",
  "Table Colorful 2",
  "Table Colorful 3",
  "Table Columns 1",
  "Table Columns 2",
  "Table Columns 3",
  "Table Columns 4",
  "Table Columns 5",
  "Table Grid 1",
  "Table Grid 2",
  "Table Grid 3",
  "Table Grid 4",
  "Table Grid 5",
  "Table Grid 6",
  "Table Grid 7",
  "Table Grid 8",
  "Table List 1",
  "Table List 2",
  "Table List 3",
  "Table List 4",
  "Table List 5",
  "Table List 6",
  "Table List 7",
  "Table List 8",
  "Table 3D effects 1",
  "Table 3D effects 2",
  "Table 3D effects 3",
  "Table Contemporary",
  "Table Elegant",
  "Table Professional",
  "Table Subtle 1",
  "Table Subtle 2",
  "Table Web 1",
  "Table Web 2",
  "Table Web 3",
  "Balloon Text",
  "Table Grid",
  "Table Theme",
  // Word 2007+ (sti 156-266; ordem conferida contra o .docx do Word)
  "Placeholder Text",
  "No Spacing",
  "Light Shading",
  "Light List",
  "Light Grid",
  "Medium Shading 1",
  "Medium Shading 2",
  "Medium List 1",
  "Medium List 2",
  "Medium Grid 1",
  "Medium Grid 2",
  "Medium Grid 3",
  "Dark List",
  "Colorful Shading",
  "Colorful List",
  "Colorful Grid",
  ...accent(1, 0, 6),
  "Revision",
  "List Paragraph",
  "Quote",
  "Intense Quote",
  ...accent(1, 6, 14),
  ...accent(2),
  ...accent(3),
  ...accent(4),
  ...accent(5),
  ...accent(6),
  "Subtle Emphasis",
  "Intense Emphasis",
  "Subtle Reference",
  "Intense Reference",
  "Book Title",
  "Bibliography",
  "TOC Heading"
];
function accent(n, from = 0, to = 14) {
  const base = [
    "Light Shading",
    "Light List",
    "Light Grid",
    "Medium Shading 1",
    "Medium Shading 2",
    "Medium List 1",
    "Medium List 2",
    "Medium Grid 1",
    "Medium Grid 2",
    "Medium Grid 3",
    "Dark List",
    "Colorful Shading",
    "Colorful List",
    "Colorful Grid"
  ];
  return base.slice(from, to).map((b) => `${b} Accent ${n}`);
}
var SPECIAL_IDS = {
  "annotation text": "CommentText",
  "annotation reference": "CommentReference",
  "annotation subject": "CommentSubject",
  "Normal Table": "TableNormal",
  "table of figures": "TableofFigures",
  "table of authorities": "TableofAuthorities",
  "toa heading": "TOAHeading",
  "Normal (Web)": "NormalWeb",
  "E-mail Signature": "E-mailSignature",
  "macro": "MacroText",
  "List": "List",
  "line number": "LineNumber"
};
function englishId(name) {
  if (SPECIAL_IDS[name]) return SPECIAL_IDS[name];
  const toc = /^toc (\d)$/.exec(name);
  if (toc) return `TOC${toc[1]}`;
  return name.split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1) : "").join("").replace(/[^A-Za-z0-9-]/g, "");
}
var STI_EXTRA = { 374: "Unresolved Mention" };
function styleName(st) {
  if (st.sti < STI_NAMES.length) return STI_NAMES[st.sti];
  if (STI_EXTRA[st.sti]) return STI_EXTRA[st.sti];
  return st.name || `Estilo ${st.istd}`;
}
function styleIdMap(styles) {
  const ids = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Set();
  const order2 = [...styles.filter(Boolean)];
  order2.sort((a, b) => (a.sti < STI_NAMES.length ? 0 : 1) - (b.sti < STI_NAMES.length ? 0 : 1) || a.istd - b.istd);
  for (const st of order2) {
    let base = st.sti < STI_NAMES.length || STI_EXTRA[st.sti] ? englishId(styleName(st)) : (st.name || "").replace(/[^A-Za-z0-9-]/g, "");
    let id = base;
    if (!base) {
      id = "a";
      for (let k = 0; used.has(id.toLowerCase()); k++) id = `a${k}`;
    } else {
      let k = 1;
      while (used.has(id.toLowerCase())) id = `${base}${++k}`;
    }
    used.add(id.toLowerCase());
    ids.set(st.istd, id);
  }
  return ids;
}
function styleXml(r, st, ids, ctx, numIdOf) {
  const type = ["", "paragraph", "character", "table", "numbering"][st.stk] ?? "paragraph";
  const isDefault = st.stk === 1 && st.sti === 0 || st.stk === 2 && st.sti === 65 || st.stk === 3 && st.sti === 105 || st.stk === 4 && st.sti === 107;
  let x2 = st.sti >= STI_NAMES.length && !st.name ? "" : el("w:name", { "w:val": styleName(st) });
  if (st.aliases) x2 += el("w:aliases", { "w:val": st.aliases });
  if (st.istdBase !== ISTD_NIL && ids.has(st.istdBase) && st.istdBase !== st.istd) x2 += el("w:basedOn", { "w:val": ids.get(st.istdBase) });
  if (st.stk === 1 && st.istdNext !== st.istd && st.istdNext !== ISTD_NIL && ids.has(st.istdNext)) x2 += el("w:next", { "w:val": ids.get(st.istdNext) });
  if (st.istdLink !== void 0 && ids.has(st.istdLink)) x2 += el("w:link", { "w:val": ids.get(st.istdLink) });
  if (st.autoRedef) x2 += "<w:autoRedefine/>";
  if (st.hidden) x2 += "<w:hidden/>";
  if (st.semiHidden) x2 += "<w:semiHidden/>";
  if (st.unhideWhenUsed) x2 += "<w:unhideWhenUsed/>";
  if (st.qFormat) x2 += "<w:qFormat/>";
  if (st.locked) x2 += "<w:locked/>";
  if (st.stk === 1 || st.stk === 3 || st.stk === 4) {
    const res = r.styles.resolve(st.istd);
    const parent = st.istdBase !== ISTD_NIL && r.stsh.styles[st.istdBase] ? r.styles.resolve(st.istdBase) : void 0;
    const ppr = pPrInner(res.pap, res.ownPap, ctx, { withStyle: false, baseTabs: parent?.pap.tabs, numId: numIdOf });
    if (ppr) x2 += `<w:pPr>${ppr}</w:pPr>`;
    if (st.stk !== 4) {
      const rpr = rPrInner(res.chp, res.ownChp, ctx, false);
      if (rpr) x2 += `<w:rPr>${rpr}</w:rPr>`;
    }
    if (st.stk === 3) {
      const tbl = tableStylePr(st);
      if (tbl) x2 += `<w:tblPr>${tbl}</w:tblPr>`;
    }
  } else if (st.stk === 2) {
    const { chp, own: own2 } = r.styles.resolveChar(st.istd);
    const rpr = rPrInner(chp, own2, ctx, false);
    if (rpr) x2 += `<w:rPr>${rpr}</w:rPr>`;
  }
  return el("w:style", {
    "w:type": type,
    "w:default": isDefault ? "1" : void 0,
    "w:customStyle": st.sti >= STI_NAMES.length && !STI_EXTRA[st.sti] ? "1" : void 0,
    "w:styleId": ids.get(st.istd)
  }, x2);
}
function tableStylePr(st) {
  if (!st.tapx) return "";
  const tap = newTap();
  for (const p2 of prls(st.tapx)) if (sgcOf(p2.sprm) === 5) applyTap(tap, p2);
  let x2 = "";
  const ind = tap.widthIndent && tap.widthIndent.fts === 3 ? tap.widthIndent.w : tap.dxaLeft;
  if (ind !== void 0) x2 += el("w:tblInd", { "w:w": ind, "w:type": "dxa" });
  if (tap.bordersSet) {
    const sides = ["top", "left", "bottom", "right", "insideH", "insideV"];
    x2 += `<w:tblBorders>${sides.map((s) => brcXml(`w:${s}`, tap.borders[s])).join("")}</w:tblBorders>`;
  }
  if (tap.shdTable) x2 += shdXml2(tap.shdTable);
  const p = tap.padding;
  if (p.top !== void 0 || p.left !== void 0 || p.bottom !== void 0 || p.right !== void 0) {
    let m = "";
    if (p.top !== void 0) m += el("w:top", { "w:w": p.top, "w:type": "dxa" });
    if (p.left !== void 0) m += el("w:left", { "w:w": p.left, "w:type": "dxa" });
    if (p.bottom !== void 0) m += el("w:bottom", { "w:w": p.bottom, "w:type": "dxa" });
    if (p.right !== void 0) m += el("w:right", { "w:w": p.right, "w:type": "dxa" });
    x2 += `<w:tblCellMar>${m}</w:tblCellMar>`;
  }
  return x2;
}
function buildStyles(r, ctx, ids, numIdOf) {
  const f = r.stsh.stshif;
  const font = (ftc) => r.fonts[ftc]?.name;
  const normal = r.styles.resolve(0).chp;
  const lang = el("w:lang", {
    "w:val": lcidTag(normal.lid) ?? "pt-BR",
    "w:eastAsia": lcidTag(normal.lidFE) ?? lcidTag(normal.lid) ?? "pt-BR",
    "w:bidi": lcidTag(normal.lidBi && normal.lidBi !== 1024 ? normal.lidBi : 1025) ?? "ar-SA"
  });
  const rFonts = el("w:rFonts", { "w:ascii": font(f.ftcAsci), "w:eastAsia": font(f.ftcFE), "w:hAnsi": font(f.ftcOther), "w:cs": font(f.ftcBi) });
  let x2 = `<w:docDefaults><w:rPrDefault><w:rPr>${rFonts}${lang}</w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>`;
  for (const st of r.stsh.styles) {
    if (!st) continue;
    x2 += styleXml(r, st, ids, ctx, numIdOf);
  }
  const has = (sti, stk) => r.stsh.styles.some((s) => s && s.sti === sti && s.stk === stk);
  const used = new Set([...ids.values()].map((v) => v.toLowerCase()));
  const freeId = (base) => {
    let id = base;
    for (let k = 2; used.has(id.toLowerCase()); k++) id = `${base}${k}`;
    used.add(id.toLowerCase());
    return id;
  };
  if (!has(65, 2)) x2 += `<w:style w:type="character" w:default="1" w:styleId="${freeId("DefaultParagraphFont")}"><w:name w:val="Default Paragraph Font"/><w:semiHidden/></w:style>`;
  if (!has(105, 3)) {
    x2 += `<w:style w:type="table" w:default="1" w:styleId="${freeId("TableNormal")}"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>`;
  }
  if (!has(107, 4)) x2 += `<w:style w:type="numbering" w:default="1" w:styleId="${freeId("NoList")}"><w:name w:val="No List"/><w:semiHidden/></w:style>`;
  return `${XML_DECL}<w:styles${attrs2({ "xmlns:w": NS2.w, "xmlns:r": NS2.r })}>${x2}</w:styles>`;
}

// ../docx-core/src/doc/pictures.ts
function picFxOf(shape) {
  if (!shape) return void 0;
  const fx = {};
  const ct = shape.props.get(264)?.value, br = shape.props.get(265)?.value;
  const gain = ct !== void 0 ? (ct >>> 0) / 65536 : 1;
  const bl = br !== void 0 ? (br | 0) / 65536 : 0;
  if (Math.abs(gain - 1) > 1e-6) fx.contrast = Math.round((gain >= 1 ? 1 - 1 / gain : gain - 1) * 1e5);
  if (bl) fx.bright = Math.round(2 * bl * 1e5);
  const bb = shape.props.get(319)?.value;
  const flag = (bit) => bb !== void 0 && (bb >>> bit + 16 & 1) === 1 && (bb >>> bit & 1) === 1;
  if (flag(2)) fx.gray = true;
  if (flag(1)) fx.biLevel = true;
  return Object.keys(fx).length ? fx : void 0;
}
var EMU_PER_TWIP3 = 635;
function readInlinePicture(r, fc) {
  const data = r.data;
  if (!data || fc < 0 || fc + 68 > data.length) return void 0;
  const d = new ByteReader(data);
  const lcb = d.i32(fc);
  const cbHeader = d.u16(fc + 4);
  if (lcb < cbHeader || cbHeader < 68) return void 0;
  const end = Math.min(data.length, fc + lcb);
  const mm = d.i16(fc + 6);
  const dxaGoal = d.i16(fc + 28);
  const dyaGoal = d.i16(fc + 30);
  const mx = d.u16(fc + 32) || 1e3;
  const my = d.u16(fc + 34) || 1e3;
  const cropL = d.i16(fc + 36), cropT = d.i16(fc + 38), cropR = d.i16(fc + 40), cropB = d.i16(fc + 42);
  let o = fc + cbHeader;
  let name;
  if (mm === 102) {
    const cch = d.u8(o);
    name = "";
    for (let i2 = 0; i2 < cch; i2++) name += String.fromCharCode(d.u8(o + 1 + i2));
    o += 1 + cch;
  }
  const wTw = (dxaGoal - cropL - cropR) * mx / 1e3;
  const hTw = (dyaGoal - cropT - cropB) * my / 1e3;
  const info = { cx: Math.max(1, wTw) * EMU_PER_TWIP3, cy: Math.max(1, hTw) * EMU_PER_TWIP3, name };
  const recs = recsIn(d, o, end);
  let shape;
  const bses = [];
  for (const rec of recs) {
    if (rec.type === OA.SpContainer && !shape) shape = readSpContainer(rec);
    else if (rec.type === OA.FBSE) {
      const bse = readFbse(rec);
      let blip;
      if (bse.embedded) blip = decodeBlip(bse.embedded, r.blipBudget);
      else if (bse.foDelay && bse.foDelay !== 4294967295) blip = blipAt(r, r.word, bse.foDelay);
      if (blip) bses.push(blip);
    } else if (rec.type >= 61464 && rec.type <= 61719) {
      const blip = decodeBlip(rec, r.blipBudget);
      if (blip) bses.push(blip);
    }
  }
  const pib = shape?.props.get(260)?.value ?? 1;
  info.blip = bses[pib - 1] ?? bses[0];
  const fx = picFxOf(shape);
  if (fx) info.fx = fx;
  if (shape) {
    const f = (id) => ((shape.props.get(id)?.value ?? 0) | 0) / 65536;
    const c = { t: f(256), b: f(257), l: f(258), r: f(259) };
    if (c.t || c.b || c.l || c.r) info.crop = c;
  }
  if (shape && !info.blip && (shape.props.has(915) || shape.props.has(916) || shape.props.has(918))) {
    const pv = (k) => shape.props.get(k)?.value;
    const fill = pv(385);
    info.hr = {
      align: ["left", "center", "right"][pv(916) ?? 1] ?? "center",
      pct: pv(915),
      fill: fill !== void 0 && fill >>> 24 === 0 ? (fill & 255) << 16 | fill & 65280 | fill >> 16 & 255 : void 0,
      noshade: true
    };
  }
  if (!info.crop && dxaGoal > 0 && dyaGoal > 0 && (cropL || cropT || cropR || cropB)) {
    info.crop = { l: cropL / dxaGoal, r: cropR / dxaGoal, t: cropT / dyaGoal, b: cropB / dyaGoal };
  }
  return info;
}
function blipAt(r, stream, off) {
  if (off + 8 > stream.length) return void 0;
  const rec = readRec(new ByteReader(stream), off);
  if (!rec || rec.type < 61464 || rec.type > 61719) return void 0;
  return decodeBlip(rec, r.blipBudget);
}
function shapeBlip(r, shape) {
  const pib = shape.props.get(260);
  if (!pib || !pib.value) return void 0;
  const bse = r.bse(pib.value);
  if (!bse) return void 0;
  if (bse.embedded) return decodeBlip(bse.embedded, r.blipBudget);
  if (bse.foDelay !== 4294967295) return blipAt(r, r.word, bse.foDelay);
  return void 0;
}

// ../docx-core/src/doc/formfields.ts
function xstz(r, off) {
  const cch = Math.min(r.u16(off), 32767);
  return { s: r.utf16(off + 2, cch), next: off + 2 + cch * 2 + 2 };
}
function ffDataXml(data, fc) {
  if (!data || fc < 0 || fc + 68 + 10 > data.length) return void 0;
  const r = new ByteReader(data);
  const lcb = r.i32(fc);
  const cbHeader = r.u16(fc + 4);
  if (cbHeader !== 68 || lcb < cbHeader) return void 0;
  const end = Math.min(data.length, fc + lcb);
  let o = fc + cbHeader;
  const bits2 = r.u16(o + 4);
  const iType = bits2 & 3;
  const iRes = bits2 >> 2 & 31;
  const fOwnHelp = (bits2 & 128) !== 0;
  const fOwnStat = (bits2 & 256) !== 0;
  const fProt = (bits2 & 512) !== 0;
  const iSize = (bits2 & 1024) !== 0;
  const iTypeTxt = bits2 >> 11 & 7;
  const fRecalc = (bits2 & 16384) !== 0;
  const cch = r.u16(o + 6);
  const hps = r.u16(o + 8);
  o += 10;
  const read = () => {
    if (o + 2 > end) return "";
    const x3 = xstz(r, o);
    o = x3.next;
    return x3.s;
  };
  const name = read();
  let textDef = "";
  let wDef = 0;
  if (iType === 0) textDef = read();
  else {
    wDef = r.u16(o);
    o += 2;
  }
  const format = read();
  const help = read();
  const stat = read();
  const entryMcr = read();
  const exitMcr = read();
  const entries = [];
  if (iType === 2 && o + 6 <= end) {
    let p = o;
    if (r.u16(p) === 65535) p += 2;
    const n = r.u16(p);
    const cbExtra = r.u16(p + 2);
    p += 4;
    for (let i2 = 0; i2 < n && p + 2 <= end; i2++) {
      const c = r.u16(p);
      entries.push(r.utf16(p + 2, c));
      p += 2 + c * 2 + cbExtra;
    }
  }
  let x2 = el("w:name", { "w:val": name });
  if (!fProt) x2 += "<w:enabled/>";
  x2 += fRecalc ? "<w:calcOnExit/>" : '<w:calcOnExit w:val="0"/>';
  if (entryMcr) x2 += el("w:entryMacro", { "w:val": entryMcr });
  if (exitMcr) x2 += el("w:exitMacro", { "w:val": exitMcr });
  if (fOwnHelp && help) x2 += el("w:helpText", { "w:type": "text", "w:val": help });
  if (fOwnStat && stat) x2 += el("w:statusText", { "w:type": "text", "w:val": stat });
  if (iType === 1) {
    let c = iSize ? el("w:size", { "w:val": hps }) : "<w:sizeAuto/>";
    c += el("w:default", { "w:val": wDef ? 1 : 0 });
    if (iRes !== 25) c += el("w:checked", { "w:val": iRes ? 1 : 0 });
    x2 += `<w:checkBox>${c}</w:checkBox>`;
  } else if (iType === 2) {
    let c = "";
    if (iRes && iRes !== 25) c += el("w:result", { "w:val": iRes });
    if (wDef) c += el("w:default", { "w:val": wDef });
    for (const e of entries) c += el("w:listEntry", { "w:val": e });
    x2 += `<w:ddList>${c}</w:ddList>`;
  } else {
    let c = "";
    const type = ["regular", "number", "date", "currentDate", "currentTime", "calculated"][iTypeTxt];
    if (type && type !== "regular") c += el("w:type", { "w:val": type });
    if (textDef) c += el("w:default", { "w:val": textDef });
    if (cch) c += el("w:maxLength", { "w:val": cch });
    if (format) c += el("w:format", { "w:val": format });
    x2 += c ? `<w:textInput>${c}</w:textInput>` : "<w:textInput/>";
  }
  return `<w:ffData>${x2}</w:ffData>`;
}

// ../docx-core/src/doc/preset-map.ts
var K = 1e5 / 21600;
var ratio = (w, h, horiz) => {
  const ss = Math.min(w, h) || 1;
  return (horiz ? w : h) / ss;
};
var lin = (i2) => (a) => [a[i2] === void 0 ? void 0 : a[i2] * K];
var offW = (a, w, h) => [a[0] === void 0 ? void 0 : a[0] * K * ratio(w, h, true)];
var tipW = (a, w, h) => [a[0] === void 0 ? void 0 : (21600 - a[0]) * K * ratio(w, h, true)];
var seal = (a) => [a[0] === void 0 ? void 0 : (10800 - a[0]) / 10800 * 5e4];
var arrowH = (headAtStart) => (a, w, h) => [
  a[1] === void 0 ? void 0 : (21600 - 2 * a[1]) / 21600 * 1e5,
  a[0] === void 0 ? void 0 : (headAtStart ? a[0] : 21600 - a[0]) * K * ratio(w, h, true)
];
var arrowV = (headAtStart) => (a, w, h) => [
  a[1] === void 0 ? void 0 : (21600 - 2 * a[1]) / 21600 * 1e5,
  a[0] === void 0 ? void 0 : (headAtStart ? a[0] : 21600 - a[0]) * K * ratio(w, h, false)
];
var wedge = (a) => [
  a[0] === void 0 ? void 0 : (a[0] - 10800) * K,
  a[1] === void 0 ? void 0 : (a[1] - 10800) * K
];
var P = {
  1: { prst: "rect" },
  2: { prst: "roundRect", adj: lin(0) },
  3: { prst: "ellipse" },
  4: { prst: "diamond" },
  5: { prst: "triangle", adj: lin(0) },
  6: { prst: "rtTriangle" },
  7: { prst: "parallelogram", adj: offW },
  8: { prst: "trapezoid", adj: offW, flipV: true },
  9: { prst: "hexagon", adj: offW },
  10: { prst: "octagon", adj: lin(0) },
  11: { prst: "plus", adj: lin(0) },
  12: { prst: "star5" },
  13: { prst: "rightArrow", adj: arrowH(false) },
  14: { prst: "rightArrow", adj: arrowH(false) },
  15: { prst: "homePlate", adj: tipW },
  16: { prst: "cube", adj: lin(0) },
  17: { prst: "wedgeRoundRectCallout", adj: wedge, binDefaults: [1350, 25920] },
  18: { prst: "star16", adj: seal },
  19: { prst: "arc" },
  20: { prst: "line" },
  21: { prst: "plaque", adj: lin(0) },
  22: { prst: "can", adj: (a, w, h) => [a[0] === void 0 ? void 0 : a[0] * K * ratio(w, h, false)] },
  23: { prst: "donut", adj: lin(0) },
  32: { prst: "straightConnector1" },
  33: { prst: "bentConnector2" },
  34: { prst: "bentConnector3" },
  35: { prst: "bentConnector4" },
  36: { prst: "bentConnector5" },
  37: { prst: "curvedConnector2" },
  38: { prst: "curvedConnector3" },
  39: { prst: "curvedConnector4" },
  40: { prst: "curvedConnector5" },
  41: { prst: "callout1" },
  42: { prst: "callout2" },
  43: { prst: "callout3" },
  44: { prst: "accentCallout1" },
  45: { prst: "accentCallout2" },
  46: { prst: "accentCallout3" },
  47: { prst: "borderCallout1" },
  48: { prst: "borderCallout2" },
  49: { prst: "borderCallout3" },
  50: { prst: "accentBorderCallout1" },
  51: { prst: "accentBorderCallout2" },
  52: { prst: "accentBorderCallout3" },
  53: { prst: "ribbon" },
  54: { prst: "ribbon2" },
  55: { prst: "chevron", adj: tipW },
  56: { prst: "pentagon" },
  57: { prst: "noSmoking" },
  58: { prst: "star8", adj: seal },
  59: { prst: "star16", adj: seal },
  60: { prst: "star32", adj: seal },
  61: { prst: "wedgeRectCallout", adj: wedge, binDefaults: [1350, 25920] },
  62: { prst: "wedgeRoundRectCallout", adj: wedge, binDefaults: [1350, 25920] },
  63: { prst: "wedgeEllipseCallout", adj: wedge, binDefaults: [1350, 25920] },
  64: { prst: "wave" },
  65: { prst: "foldedCorner" },
  66: { prst: "leftArrow", adj: arrowH(true) },
  67: { prst: "downArrow", adj: arrowV(false) },
  68: { prst: "upArrow", adj: arrowV(true) },
  69: { prst: "leftRightArrow", adj: arrowH(true) },
  70: { prst: "upDownArrow", adj: arrowV(true) },
  71: { prst: "irregularSeal1" },
  72: { prst: "irregularSeal2" },
  73: { prst: "lightningBolt" },
  74: { prst: "heart" },
  75: { prst: "rect" },
  76: { prst: "quadArrow" },
  77: { prst: "leftArrowCallout" },
  78: { prst: "rightArrowCallout" },
  79: { prst: "upArrowCallout" },
  80: { prst: "downArrowCallout" },
  81: { prst: "leftRightArrowCallout" },
  82: { prst: "upDownArrowCallout" },
  83: { prst: "quadArrowCallout" },
  84: { prst: "bevel", adj: lin(0) },
  85: { prst: "leftBracket", adj: (a, w, h) => [a[0] === void 0 ? void 0 : a[0] * K * ratio(w, h, false)] },
  86: { prst: "rightBracket", adj: (a, w, h) => [a[0] === void 0 ? void 0 : a[0] * K * ratio(w, h, false)] },
  87: { prst: "leftBrace", adj: (a, w, h) => [a[0] === void 0 ? void 0 : a[0] * K * ratio(w, h, false), a[1] === void 0 ? void 0 : a[1] * K] },
  88: { prst: "rightBrace", adj: (a, w, h) => [a[0] === void 0 ? void 0 : a[0] * K * ratio(w, h, false), a[1] === void 0 ? void 0 : a[1] * K] },
  89: { prst: "leftUpArrow" },
  90: { prst: "bentUpArrow" },
  91: { prst: "bentArrow" },
  92: { prst: "star24", adj: seal },
  93: { prst: "stripedRightArrow", adj: arrowH(false) },
  94: { prst: "notchedRightArrow", adj: arrowH(false) },
  95: { prst: "blockArc" },
  96: { prst: "smileyFace", adj: (a) => [a[0] === void 0 ? void 0 : (a[0] - 16515) / (17520 - 16515) * 4653] },
  97: { prst: "verticalScroll" },
  98: { prst: "horizontalScroll" },
  99: { prst: "circularArrow" },
  100: { prst: "circularArrow" },
  101: { prst: "uturnArrow" },
  102: { prst: "curvedRightArrow" },
  103: { prst: "curvedLeftArrow" },
  104: { prst: "curvedUpArrow" },
  105: { prst: "curvedDownArrow" },
  106: { prst: "cloudCallout", adj: wedge, binDefaults: [1350, 25920] },
  107: { prst: "ellipseRibbon" },
  108: { prst: "ellipseRibbon2" },
  109: { prst: "flowChartProcess" },
  110: { prst: "flowChartDecision" },
  111: { prst: "flowChartInputOutput" },
  112: { prst: "flowChartPredefinedProcess" },
  113: { prst: "flowChartInternalStorage" },
  114: { prst: "flowChartDocument" },
  115: { prst: "flowChartMultidocument" },
  116: { prst: "flowChartTerminator" },
  117: { prst: "flowChartPreparation" },
  118: { prst: "flowChartManualInput" },
  119: { prst: "flowChartManualOperation" },
  120: { prst: "flowChartConnector" },
  121: { prst: "flowChartPunchedCard" },
  122: { prst: "flowChartPunchedTape" },
  123: { prst: "flowChartSummingJunction" },
  124: { prst: "flowChartOr" },
  125: { prst: "flowChartCollate" },
  126: { prst: "flowChartSort" },
  127: { prst: "flowChartExtract" },
  128: { prst: "flowChartMerge" },
  129: { prst: "flowChartOfflineStorage" },
  130: { prst: "flowChartOnlineStorage" },
  131: { prst: "flowChartMagneticTape" },
  132: { prst: "flowChartMagneticDisk" },
  133: { prst: "flowChartMagneticDrum" },
  134: { prst: "flowChartDisplay" },
  135: { prst: "flowChartDelay" },
  176: { prst: "flowChartAlternateProcess" },
  177: { prst: "flowChartOffpageConnector" },
  178: { prst: "callout1" },
  179: { prst: "accentCallout1" },
  180: { prst: "borderCallout1" },
  181: { prst: "accentBorderCallout1" },
  182: { prst: "leftRightUpArrow" },
  183: { prst: "sun", adj: lin(0) },
  184: { prst: "moon", adj: lin(0) },
  185: { prst: "bracketPair" },
  186: { prst: "bracePair" },
  187: { prst: "star4", adj: seal },
  188: { prst: "doubleWave" },
  189: { prst: "actionButtonBlank" },
  190: { prst: "actionButtonHome" },
  191: { prst: "actionButtonHelp" },
  192: { prst: "actionButtonInformation" },
  193: { prst: "actionButtonForwardNext" },
  194: { prst: "actionButtonBackPrevious" },
  195: { prst: "actionButtonEnd" },
  196: { prst: "actionButtonBeginning" },
  197: { prst: "actionButtonReturn" },
  198: { prst: "actionButtonDocument" },
  199: { prst: "actionButtonSound" },
  200: { prst: "actionButtonMovie" },
  201: { prst: "rect" },
  202: { prst: "rect" }
};
function isWordArtType(spt) {
  return spt >= 24 && spt <= 31 || spt >= 136 && spt <= 175;
}
function isConnectorType(spt) {
  return spt >= 32 && spt <= 40;
}
function presetFor(spt, adjust, w, h) {
  if (isWordArtType(spt)) return { prst: "rect", av: [] };
  const def = P[spt];
  if (!def) return void 0;
  const out = { prst: def.prst, av: [] };
  if (def.flipV) out.flipV = true;
  if (def.adj) {
    const a = def.binDefaults ? def.binDefaults.map((d, i2) => adjust[i2] ?? d) : adjust;
    const vals = def.adj(a, w, h);
    const any = vals.some((v) => v !== void 0);
    if (any) {
      const dflt2 = DML_DEFAULTS[def.prst] ?? [];
      vals.forEach((v, i2) => {
        const val3 = v ?? dflt2[i2];
        if (val3 === void 0) return;
        out.av.push({ name: vals.length === 1 ? "adj" : `adj${i2 + 1}`, val: Math.round(val3) });
      });
    }
  }
  return out;
}
var DML_DEFAULTS = {
  roundRect: [16667],
  triangle: [5e4],
  parallelogram: [25e3],
  trapezoid: [25e3],
  hexagon: [25e3],
  octagon: [29289],
  plus: [25e3],
  rightArrow: [5e4, 5e4],
  leftArrow: [5e4, 5e4],
  upArrow: [5e4, 5e4],
  downArrow: [5e4, 5e4],
  leftRightArrow: [5e4, 5e4],
  upDownArrow: [5e4, 5e4],
  homePlate: [5e4],
  chevron: [5e4],
  cube: [25e3],
  can: [25e3],
  donut: [25e3],
  plaque: [16667],
  bevel: [12500],
  sun: [25e3],
  moon: [5e4],
  smileyFace: [4653],
  star4: [12500],
  star8: [38250],
  star16: [37500],
  star24: [37500],
  star32: [37500],
  wedgeRectCallout: [-20833, 62500],
  wedgeRoundRectCallout: [-20833, 62500, 16667],
  wedgeEllipseCallout: [-20833, 62500],
  cloudCallout: [-20833, 62500],
  leftBracket: [8333],
  rightBracket: [8333],
  leftBrace: [8333, 5e4],
  rightBrace: [8333, 5e4],
  stripedRightArrow: [5e4, 5e4],
  notchedRightArrow: [5e4, 5e4]
};

// ../docx-core/src/doc/docx-writer.ts
var EMU_PER_TWIP4 = 635;
var PartRels = class {
  items = [];
  n = 0;
  byKey = /* @__PURE__ */ new Map();
  add(type, target, external = false) {
    const key = `${type}|${target}|${external}`;
    const hit = this.byKey.get(key);
    if (hit) return hit;
    const id = `rId${++this.n}`;
    this.items.push(el("Relationship", { Id: id, Type: `${NS2.relType}/${type}`, Target: target, TargetMode: external ? "External" : void 0 }));
    this.byKey.set(key, id);
    return id;
  }
  get size() {
    return this.items.length;
  }
  xml() {
    return `${XML_DECL}<Relationships xmlns="${NS2.rel}">${this.items.join("")}</Relationships>`;
  }
};
var MIME2 = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
  pict: "image/pict"
};
var DocxWriter = class {
  r;
  files = /* @__PURE__ */ new Map();
  overrides = [];
  mediaExt = /* @__PURE__ */ new Set();
  media = /* @__PURE__ */ new Map();
  mediaN = 0;
  hdrN = 0;
  ftrN = 0;
  docPrId = 0;
  propCtx;
  styleIds;
  chpCache = /* @__PURE__ */ new Map();
  footnoteIds = /* @__PURE__ */ new Map();
  endnoteIds = /* @__PURE__ */ new Map();
  commentByRef = /* @__PURE__ */ new Map();
  commentStarts = /* @__PURE__ */ new Map();
  commentEnds = /* @__PURE__ */ new Map();
  bkStarts = /* @__PURE__ */ new Map();
  bkEnds = /* @__PURE__ */ new Map();
  fspaMain = /* @__PURE__ */ new Map();
  fspaHdr = /* @__PURE__ */ new Map();
  txbxMain = /* @__PURE__ */ new Map();
  txbxHdr = /* @__PURE__ */ new Map();
  revAuthors;
  /** Ids das marcas de revisão (w:ins/w:del) — únicos no documento. */
  revIds = { next: 1 };
  numIdOf;
  /** Faixas de CP descartadas (ex.: _PictureBullets). */
  skipRanges = [];
  /** Campos abertos (atravessam parágrafos). */
  fieldStack = [];
  constructor(reader) {
    this.r = reader;
    this.styleIds = styleIdMap(reader.stsh.styles);
    this.propCtx = {
      fonts: reader.fonts,
      styleId: (istd) => this.styleIds.get(istd)
    };
    this.revAuthors = reader.revisionAuthors();
    const lfoCount = reader.lists.lfos.length;
    this.numIdOf = (ilfo) => ilfo >= 1 && ilfo <= lfoCount ? ilfo : 0;
  }
  // ───────────────────────────── pacote ─────────────────────────────
  build(opts = {}) {
    const r = this.r;
    for (const f of r.fspas(false)) this.fspaMain.set(f.cp, f);
    for (const f of r.fspas(true)) this.fspaHdr.set(f.cp, f);
    for (const t of r.textboxes(false)) this.txbxMain.set(t.spid, [t.cpStart, t.cpEnd]);
    for (const t of r.textboxes(true)) this.txbxHdr.set(t.spid, [t.cpStart, t.cpEnd]);
    let bkId = 0;
    for (const b of r.bookmarks()) {
      if (b.name === "_PictureBullets") {
        this.skipRanges.push([b.cpStart, b.cpEnd]);
        continue;
      }
      const id = bkId++;
      push(this.bkStarts, b.cpStart, { id, name: b.name });
      push(this.bkEnds, b.cpEnd, id);
    }
    const docRels = new PartRels();
    docRels.add("styles", "styles.xml");
    docRels.add("settings", "settings.xml");
    docRels.add("fontTable", "fontTable.xml");
    this.overrides.push(["/word/styles.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"]);
    this.overrides.push(["/word/settings.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"]);
    this.overrides.push(["/word/fontTable.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"]);
    const footnotes = r.notes("ftn");
    const endnotes = r.notes("edn");
    footnotes.forEach((n, i2) => this.footnoteIds.set(n.refCp, i2 + 1));
    endnotes.forEach((n, i2) => this.endnoteIds.set(n.refCp, i2 + 1));
    const comments = r.comments();
    comments.forEach((c, i2) => {
      this.commentByRef.set(c.refCp, i2);
      if (c.rangeStart !== void 0 && c.rangeEnd !== void 0 && c.rangeEnd >= c.rangeStart) {
        push(this.commentStarts, c.rangeStart, i2);
        push(this.commentEnds, c.rangeEnd, i2);
      }
    });
    const body = this.renderMain(docRels);
    this.files.set("word/document.xml", `${XML_DECL}<w:document${CONTENT_NS}>${backgroundXml(r.backgroundShape())}<w:body>${body}</w:body></w:document>`);
    this.overrides.push(["/word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"]);
    if (footnotes.length) {
      docRels.add("footnotes", "footnotes.xml");
      this.files.set("word/footnotes.xml", this.renderNotes(footnotes, "ftn"));
      this.overrides.push(["/word/footnotes.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"]);
    }
    if (endnotes.length) {
      docRels.add("endnotes", "endnotes.xml");
      this.files.set("word/endnotes.xml", this.renderNotes(endnotes, "edn"));
      this.overrides.push(["/word/endnotes.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"]);
    }
    if (comments.length) {
      docRels.add("comments", "comments.xml");
      this.files.set("word/comments.xml", this.renderComments(comments));
      this.overrides.push(["/word/comments.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"]);
    }
    this.files.set("word/styles.xml", buildStyles(r, this.propCtx, this.styleIds, this.numIdOf));
    const numbering = buildNumbering(r, this.propCtx);
    if (numbering) {
      docRels.add("numbering", "numbering.xml");
      this.files.set("word/numbering.xml", numbering);
      this.overrides.push(["/word/numbering.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"]);
    }
    this.files.set("word/fontTable.xml", this.fontTable());
    this.files.set("word/settings.xml", buildSettings(r, { footnotes: footnotes.length > 0, endnotes: endnotes.length > 0 }));
    this.files.set("word/_rels/document.xml.rels", docRels.xml());
    if (opts.docProps !== false) {
      this.files.set("docProps/app.xml", `${XML_DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Universal Office (convers\xE3o de .doc)</Application></Properties>`);
      this.overrides.push(["/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml"]);
    }
    const rootRels = new PartRels();
    rootRels.add("officeDocument", "word/document.xml");
    if (opts.docProps !== false) rootRels.add("extended-properties", "docProps/app.xml");
    this.files.set("_rels/.rels", rootRels.xml());
    let ct = `${XML_DECL}<Types xmlns="${NS2.ct}">`;
    ct += el("Default", { Extension: "rels", ContentType: "application/vnd.openxmlformats-package.relationships+xml" });
    ct += el("Default", { Extension: "xml", ContentType: "application/xml" });
    for (const ext of this.mediaExt) ct += el("Default", { Extension: ext, ContentType: MIME2[ext] ?? "application/octet-stream" });
    for (const [part, type] of this.overrides) ct += el("Override", { PartName: part, ContentType: type });
    ct += "</Types>";
    const zip = {};
    zip["[Content_Types].xml"] = new TextEncoder().encode(ct);
    const enc = new TextEncoder();
    for (const [path, data] of this.files) zip[path] = typeof data === "string" ? enc.encode(data) : data;
    return zipSync(zip, { level: 6 });
  }
  fontTable() {
    const fams = ["auto", "roman", "swiss", "modern", "script", "decorative", "auto", "auto"];
    const pitch = ["default", "fixed", "variable", "default"];
    const seen = /* @__PURE__ */ new Set();
    let x2 = "";
    for (const f of this.r.fonts) {
      if (seen.has(f.name)) continue;
      seen.add(f.name);
      let c = "";
      if (f.altName) c += el("w:altName", { "w:val": f.altName });
      if (f.panose.some((b) => b !== 0)) c += el("w:panose1", { "w:val": [...f.panose].map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join("") });
      c += el("w:charset", { "w:val": f.charset.toString(16).toUpperCase().padStart(2, "0") });
      c += el("w:family", { "w:val": fams[f.ff] ?? "auto" });
      if (!f.trueType) c += "<w:notTrueType/>";
      c += el("w:pitch", { "w:val": pitch[f.prq] ?? "default" });
      const h = (v) => (v >>> 0).toString(16).toUpperCase().padStart(8, "0");
      c += el("w:sig", { "w:usb0": h(f.sig[0]), "w:usb1": h(f.sig[1]), "w:usb2": h(f.sig[2]), "w:usb3": h(f.sig[3]), "w:csb0": h(f.sig[4]), "w:csb1": h(f.sig[5]) });
      x2 += el("w:font", { "w:name": f.name }, c);
    }
    return `${XML_DECL}<w:fonts xmlns:w="${NS2.w}" xmlns:r="${NS2.r}">${x2}</w:fonts>`;
  }
  // ───────────────────────────── histórias ─────────────────────────────
  renderMain(rels) {
    const r = this.r;
    const ctx = { rels, kind: "main", hdr: false };
    const [s, e] = r.sub.main;
    const paras = this.collectParas(s, e);
    const sectEnds = /* @__PURE__ */ new Map();
    r.sections.forEach((sec, i2) => {
      if (i2 < r.sections.length - 1) sectEnds.set(sec.cpEnd, i2);
    });
    const hdrStories = r.headerStories();
    const sectPrs = r.sections.map((sec, i2) => this.sectPrXml(sec.sep, i2, hdrStories, rels));
    this.fieldStack = [];
    const body = this.renderBlocks(paras, 0, paras.length, 0, ctx, (p) => {
      const si = sectEnds.get(p.cpEnd);
      return si !== void 0 ? sectPrs[si] : void 0;
    });
    return body + (sectPrs[sectPrs.length - 1] ?? "");
  }
  sectPrXml(sep, index, stories, docRels) {
    let refs = "";
    const kinds = [
      [0, "header", "even"],
      [1, "header", "default"],
      [4, "header", "first"],
      [2, "footer", "even"],
      [3, "footer", "default"],
      [5, "footer", "first"]
    ];
    const hdrRefs = [];
    const ftrRefs = [];
    for (const [k, kind, type] of kinds) {
      const st = stories[6 + index * 6 + k];
      if (!st) continue;
      const rid = this.renderHeaderPart(st, kind, docRels);
      if (!rid) continue;
      const x3 = el(kind === "header" ? "w:headerReference" : "w:footerReference", { "w:type": type, "r:id": rid });
      (kind === "header" ? hdrRefs : ftrRefs).push(x3);
    }
    refs = hdrRefs.join("") + ftrRefs.join("");
    let x2 = refs;
    const ftnPr = notePr(sep.fpc !== void 0 ? ["pageBottom", "pageBottom", "beneathText", "sectEnd"][sep.fpc] : void 0, sep.nfcFtnRef, sep.nFtn, sep.rncFtn, false);
    if (ftnPr) x2 += `<w:footnotePr>${ftnPr}</w:footnotePr>`;
    const ednPr = notePr(void 0, sep.nfcEdnRef, sep.nEdn, sep.rncEdn, true);
    if (ednPr) x2 += `<w:endnotePr>${ednPr}</w:endnotePr>`;
    const bkc = ["continuous", "nextColumn", "nextPage", "evenPage", "oddPage"][sep.bkc] ?? "nextPage";
    if (bkc !== "nextPage") x2 += el("w:type", { "w:val": bkc });
    x2 += el("w:pgSz", { "w:w": sep.xaPage, "w:h": sep.yaPage, "w:orient": sep.orientation === 2 ? "landscape" : void 0, "w:code": sep.dmPaperReq || void 0 });
    x2 += el("w:pgMar", {
      "w:top": sep.dyaTop,
      "w:right": sep.dxaRight,
      "w:bottom": sep.dyaBottom,
      "w:left": sep.dxaLeft,
      "w:header": sep.dyaHdrTop,
      "w:footer": sep.dyaHdrBottom,
      "w:gutter": sep.dzaGutter
    });
    if (sep.dmBinFirst || sep.dmBinOther) x2 += el("w:paperSrc", { "w:first": sep.dmBinFirst || void 0, "w:other": sep.dmBinOther || void 0 });
    if (sep.brcTop || sep.brcLeft || sep.brcBottom || sep.brcRight) {
      const pgb = sep.pgbProp;
      const applyTo = pgb & 7;
      const a = {
        "w:display": applyTo === 1 ? "firstPage" : applyTo === 2 ? "notFirstPage" : void 0,
        "w:zOrder": pgb & 8 ? "back" : void 0,
        "w:offsetFrom": (pgb >> 5 & 7) === 1 ? "page" : void 0
      };
      let b = "";
      if (sep.brcTop) b += brcXml("w:top", sep.brcTop);
      if (sep.brcLeft) b += brcXml("w:left", sep.brcLeft);
      if (sep.brcBottom) b += brcXml("w:bottom", sep.brcBottom);
      if (sep.brcRight) b += brcXml("w:right", sep.brcRight);
      x2 += el("w:pgBorders", a, b);
    }
    if (sep.lnnMod) {
      x2 += el("w:lnNumType", {
        "w:countBy": sep.lnnMod,
        "w:start": sep.lnnMin || void 0,
        "w:distance": sep.dxaLnn || void 0,
        "w:restart": ["newPage", "newSection", "continuous"][sep.lnc] ?? "newPage"
      });
    }
    const nfc = numFmtOf(sep.nfcPgn);
    if (sep.nfcPgn && nfc || sep.pgnRestart || sep.headingPgn) {
      x2 += el("w:pgNumType", {
        "w:fmt": sep.nfcPgn ? nfc : void 0,
        "w:start": sep.pgnRestart ? sep.pgnStart : void 0,
        "w:chapStyle": sep.headingPgn || void 0,
        "w:chapSep": sep.headingPgn ? ["hyphen", "period", "colon", "emDash", "enDash"][sep.cnsPgn ?? 0] ?? "hyphen" : void 0
      });
    }
    const cols = sep.ccolM1 + 1;
    if (cols > 1 && !sep.evenlySpaced) {
      let c = "";
      for (let i2 = 0; i2 < cols; i2++) c += el("w:col", { "w:w": sep.colWidths[i2] ?? 0, "w:space": i2 < cols - 1 ? sep.colSpacings[i2] ?? 0 : void 0 });
      x2 += el("w:cols", { "w:num": cols, "w:space": sep.dxaColumns, "w:equalWidth": "0", "w:sep": sep.lBetween || void 0 }, c);
    } else {
      x2 += el("w:cols", { "w:num": cols > 1 ? cols : void 0, "w:space": sep.dxaColumns, "w:sep": sep.lBetween || void 0 });
    }
    if (sep.protectedSec) x2 += '<w:formProt w:val="0"/>';
    if (sep.vjc) x2 += el("w:vAlign", { "w:val": ["top", "center", "both", "bottom"][sep.vjc] ?? "top" });
    if (!sep.fEndnote) x2 += "<w:noEndnote/>";
    if (sep.titlePage) x2 += "<w:titlePg/>";
    if (sep.textFlow) x2 += el("w:textDirection", { "w:val": ["lrTb", "tbRl", "btLr", "lrTbV", "tbRlV", "tbLrV"][sep.textFlow] ?? "lrTb" });
    if (sep.bidi) x2 += "<w:bidi/>";
    if (sep.rtlGutter) x2 += "<w:rtlGutter/>";
    const gridType = ["default", "linesAndChars", "lines", "snapToChars"][sep.clm] ?? "default";
    x2 += el("w:docGrid", {
      "w:type": sep.clm ? gridType : void 0,
      "w:linePitch": sep.dyaLinePitch,
      "w:charSpace": sep.dxtCharSpace || void 0
    });
    return `<w:sectPr>${x2}</w:sectPr>`;
  }
  /** Cabeçalho/rodapé → parte própria. Devolve o rId (no document.xml.rels). */
  renderHeaderPart(story, kind, docRels) {
    const rels = new PartRels();
    const ctx = { rels, kind: "hdr", hdr: true };
    let paras = this.collectParas(story[0], story[1]);
    if (paras.length > 1 && paras[paras.length - 1].cpEnd - paras[paras.length - 1].cpStart === 1) paras = paras.slice(0, -1);
    const saved = this.fieldStack;
    this.fieldStack = [];
    let body = this.renderBlocks(paras, 0, paras.length, 0, ctx);
    this.fieldStack = saved;
    if (!body) body = "<w:p/>";
    const n = kind === "header" ? ++this.hdrN : ++this.ftrN;
    const name = `${kind}${n}.xml`;
    const tag = kind === "header" ? "w:hdr" : "w:ftr";
    this.files.set(`word/${name}`, `${XML_DECL}<${tag}${CONTENT_NS}>${body}</${tag}>`);
    if (rels.size) this.files.set(`word/_rels/${name}.rels`, rels.xml());
    this.overrides.push([`/word/${name}`, `application/vnd.openxmlformats-officedocument.wordprocessingml.${kind}+xml`]);
    return docRels.add(kind, name);
  }
  renderNotes(notes, kind) {
    const tag = kind === "ftn" ? "w:footnote" : "w:endnote";
    const rels = new PartRels();
    const ctx = { rels, kind, hdr: false };
    let x2 = `<${tag} w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></${tag}>`;
    x2 += `<${tag} w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></${tag}>`;
    notes.forEach((n, i2) => {
      const paras = this.collectParas(n.cpStart, n.cpEnd);
      this.fieldStack = [];
      const body = this.renderBlocks(paras, 0, paras.length, 0, ctx) || "<w:p/>";
      x2 += `<${tag} w:id="${i2 + 1}">${body}</${tag}>`;
    });
    const root = kind === "ftn" ? "w:footnotes" : "w:endnotes";
    const name = kind === "ftn" ? "footnotes.xml" : "endnotes.xml";
    if (rels.size) this.files.set(`word/_rels/${name}.rels`, rels.xml());
    return `${XML_DECL}<${root}${CONTENT_NS}>${x2}</${root}>`;
  }
  renderComments(comments) {
    const rels = new PartRels();
    const ctx = { rels, kind: "atn", hdr: false };
    let x2 = "";
    comments.forEach((c, i2) => {
      const paras = this.collectParas(c.cpStart, c.cpEnd);
      this.fieldStack = [];
      let body = this.renderBlocks(paras, 0, paras.length, 0, ctx);
      if (!body) body = "<w:p/>";
      x2 += el("w:comment", { "w:id": i2, "w:author": c.author || "Autor desconhecido", "w:initials": c.initials || void 0 }, body);
    });
    if (rels.size) this.files.set("word/_rels/comments.xml.rels", rels.xml());
    return `${XML_DECL}<w:comments${CONTENT_NS}>${x2}</w:comments>`;
  }
  // ───────────────────────────── parágrafos ─────────────────────────────
  /** Parágrafos de uma faixa de CPs. */
  collectParas(cpStart, cpEnd) {
    const r = this.r;
    const out = [];
    let cp = cpStart;
    let guard = 0;
    while (cp < cpEnd && guard++ < 2e6) {
      const { end, run } = r.paragraphAt(cp, cpEnd);
      const pEnd = Math.max(cp + 1, Math.min(end, cpEnd));
      const markCp = pEnd - 1;
      const grpprls = [];
      if (run && run.grpprl.length) grpprls.push(run.grpprl);
      const pi = pieceAt(r.pieces, markCp);
      const prm = pi >= 0 ? r.prmGrpprl(r.pieces[pi]) : void 0;
      if (prm) grpprls.push(prm);
      const istd = run?.istd ?? 0;
      const base = r.styles.resolve(this.validParaStyle(istd));
      const pap = { ...base.pap, istd: this.validParaStyle(istd), inTable: void 0, ttp: void 0, itap: void 0, innerTableCell: void 0, innerTtp: void 0, tabsCleared: [] };
      const touched = /* @__PURE__ */ new Set();
      let seq = 0;
      let ilfoSeq = -1;
      const lastIndent = {};
      const apply = (p) => {
        seq++;
        const k = INDENT_SPRMS[p.sprm];
        if (k) lastIndent[k] = seq;
        if (p.sprm === 17931) {
          const v = p.r.i16(p.op);
          ilfoSeq = v > 0 ? seq : -1;
        }
        applyPap(pap, p, touched);
      };
      const tapPrls = [];
      for (const g of grpprls) {
        for (const p of prls(g)) {
          const sgc = sgcOf(p.sprm);
          if (sgc === 5) {
            tapPrls.push(p);
            continue;
          }
          if (sgc !== 1) continue;
          if ((p.sprm === 25707 || p.sprm === 26182) && r.data) {
            const extra = this.prcData(p.r.u32(p.op));
            if (extra.length) {
              for (const q of prls(extra)) {
                const s2 = sgcOf(q.sprm);
                if (s2 === 5) tapPrls.push(q);
                else if (s2 === 1) apply(q);
              }
              break;
            }
            continue;
          }
          apply(p);
        }
      }
      pruneNoneBorders(pap, base.pap, touched);
      if (ilfoSeq > 0) {
        for (const k of ["dxaLeft", "dxaLeft1", "dxcLeft", "dxcLeft1"]) {
          if (touched.has(k) && (lastIndent[k] ?? 0) < ilfoSeq) {
            touched.delete(k);
            pap[k] = base.pap[k];
          }
        }
      }
      if (pap.istd !== istd) pap.istd = this.validParaStyle(pap.istd);
      const mark = r.text.charCodeAt(markCp);
      let depth = pap.itap ?? 0;
      if (pap.inTable && depth < 1) depth = 1;
      if (!pap.inTable && pap.itap === void 0) depth = 0;
      let cellEnd = false;
      let rowEnd = false;
      if (depth === 1) {
        if (mark === 7) {
          if (pap.ttp) rowEnd = true;
          else cellEnd = true;
        }
      } else if (depth > 1) {
        if (pap.innerTtp) rowEnd = true;
        else if (pap.innerTableCell) cellEnd = true;
        else if (mark === 7) cellEnd = true;
      }
      out.push({ cpStart: cp, cpEnd: pEnd, mark, pap, touched, grpprls, tapPrls, depth, cellEnd, rowEnd });
      cp = pEnd;
    }
    return out;
  }
  validParaStyle(istd) {
    const st = this.r.stsh.styles[istd];
    return st && (st.stk === 1 || st.stk === void 0) ? istd : 0;
  }
  prcData(off) {
    const d = this.r.data;
    if (!d || off + 2 > d.length) return new Uint8Array(0);
    const cb = d[off] | d[off + 1] << 8;
    return d.subarray(off + 2, Math.min(d.length, off + 2 + cb));
  }
  /** Blocos (parágrafos e tabelas) de paras[from, to) na profundidade `depth`. */
  renderBlocks(paras, from, to, depth, ctx, sectPrOf) {
    let x2 = "";
    let i2 = from;
    while (i2 < to) {
      const p = paras[i2];
      if (p.depth > depth) {
        let j = i2;
        while (j < to && paras[j].depth > depth) j++;
        x2 += this.renderTable(paras, i2, j, depth + 1, ctx);
        i2 = j;
        continue;
      }
      x2 += this.renderParagraph(p, ctx, sectPrOf?.(p));
      i2++;
    }
    return x2;
  }
  renderParagraph(p, ctx, sectPr) {
    const r = this.r;
    const styleRes = r.styles.resolve(p.pap.istd);
    const markChp = this.chpFor(p, p.cpEnd - 1);
    const markRPr2 = this.revisionMark(markChp.chp) + rPrInner(markChp.chp, markChp.touched, this.propCtx);
    const pPr = pPrInner(p.pap, p.touched, this.propCtx, {
      baseTabs: styleRes.pap.tabs,
      numId: this.numIdOf,
      rPr: markRPr2 || void 0,
      sectPr
    });
    const runs = this.renderRuns(p, ctx);
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runs}</w:p>`;
  }
  revisionMark(chp) {
    if (chp.rmarkIns) return el("w:ins", { "w:id": this.revIds.next++, "w:author": this.revAuthors[chp.ibstRMark ?? 0] ?? "Autor desconhecido", "w:date": dttmIso(chp.dttmRMark) });
    if (chp.rmarkDel) return el("w:del", { "w:id": this.revIds.next++, "w:author": this.revAuthors[chp.ibstRMarkDel ?? 0] ?? "Autor desconhecido", "w:date": dttmIso(chp.dttmRMarkDel) });
    return "";
  }
  /** CHP + tocados do caractere em `cp` (dentro do parágrafo p). */
  chpFor(p, cp) {
    const seg = this.segmentAt(cp);
    return this.chpOf(p, seg.grpprls);
  }
  chpOf(p, grpprls) {
    const r = this.r;
    const key = `${p.pap.istd}|${grpprls.map((g) => keyOf(g)).join("/")}`;
    const hit = this.chpCache.get(key);
    if (hit) return hit;
    const paraChp = r.styles.resolve(p.pap.istd).chp;
    const chp = { ...paraChp };
    const touched = /* @__PURE__ */ new Set();
    const ctx = {
      base: { ...paraChp },
      applyCharStyle: (istd) => r.styles.applyCharStyle(istd, paraChp),
      paraStyle: paraChp
    };
    for (const g of grpprls) for (const q of prls(g)) if (sgcOf(q.sprm) === 2) applyChp(chp, q, ctx, touched);
    const res = { chp, touched };
    this.chpCache.set(key, res);
    return res;
  }
  segmentAt(cp) {
    for (const s of this.segments(cp, cp + 1)) return s;
    return { cpStart: cp, cpEnd: cp + 1, grpprls: [] };
  }
  /** Faixas de CHPX (por peça) em [s, e). */
  *segments(s, e) {
    const r = this.r;
    let cp = s;
    while (cp < e) {
      const i2 = pieceAt(r.pieces, cp);
      if (i2 < 0) {
        yield { cpStart: cp, cpEnd: e, grpprls: [] };
        return;
      }
      const p = r.pieces[i2];
      const cs = p.compressed ? 1 : 2;
      const fc = p.fc + (cp - p.cpStart) * cs;
      const pieceEnd = Math.min(p.cpEnd, e);
      let segEnd = pieceEnd;
      const grpprls = [];
      const idx = runIndexFrom(r.chpx, fc);
      const run = r.chpx[idx];
      if (run && run.fcStart <= fc) {
        segEnd = Math.min(pieceEnd, p.cpStart + Math.ceil((run.fcEnd - p.fc) / cs));
        if (run.grpprl.length) grpprls.push(run.grpprl);
      } else if (run) {
        segEnd = Math.min(pieceEnd, Math.max(cp + 1, p.cpStart + Math.ceil((run.fcStart - p.fc) / cs)));
      }
      const prm = r.prmGrpprl(p);
      if (prm) grpprls.push(prm);
      if (segEnd <= cp) segEnd = cp + 1;
      yield { cpStart: cp, cpEnd: segEnd, grpprls };
      cp = segEnd;
    }
  }
  // ───────────────────────────── runs ─────────────────────────────
  renderRuns(p, ctx) {
    const r = this.r;
    const text = r.text;
    const out = new RunBuf(this.revIds);
    const markCp = p.cpEnd - 1;
    const links = this.scanHyperlinks(p, ctx);
    let link;
    for (const seg of this.segments(p.cpStart, p.cpEnd)) {
      const { chp, touched } = this.chpOf(p, seg.grpprls);
      const rPr = rPrInner(chp, touched, this.propCtx);
      const wrap = this.wrapKey(chp);
      for (let cp = seg.cpStart; cp < seg.cpEnd; cp++) {
        this.emitMarkers(cp, out, ctx);
        if (cp === markCp) continue;
        if (this.skipRanges.length && this.skipRanges.some(([a, b]) => cp >= a && cp < b)) continue;
        const c = text.charCodeAt(cp);
        const inInstr = this.fieldStack.some((f) => f.instr);
        if (link) {
          if (cp <= link.sep) continue;
          if (cp === link.end) {
            if (!link.unwrap) out.raw("</w:hyperlink>");
            link = void 0;
            continue;
          }
        } else if (c === 19 && links.has(cp)) {
          link = links.get(cp);
          if (!link.unwrap) out.raw(`<w:hyperlink${attrs2({ "r:id": link.rid, "w:anchor": link.anchor, "w:tooltip": link.tooltip, "w:tgtFrame": link.target, "w:history": "1" })}>`);
          continue;
        }
        if (c === 19) {
          this.fieldStack.push({ instr: true });
          const ff = this.formFieldData(p, cp);
          out.special(rPr, wrap, ff ? `<w:fldChar w:fldCharType="begin">${ff}</w:fldChar>` : '<w:fldChar w:fldCharType="begin"/>');
          continue;
        }
        if (c === 20) {
          const top = this.fieldStack[this.fieldStack.length - 1];
          if (top) top.instr = false;
          out.special(rPr, wrap, '<w:fldChar w:fldCharType="separate"/>');
          continue;
        }
        if (c === 21) {
          if (this.fieldStack.length) this.fieldStack.pop();
          out.special(rPr, wrap, '<w:fldChar w:fldCharType="end"/>');
          continue;
        }
        if (inInstr) {
          if (c >= 32 || c === 9) out.instr(rPr, wrap, String.fromCharCode(c), !!chp.rmarkDel);
          continue;
        }
        if (ctx.kind === "main" && !chp.fSpec && c >= 32 && (this.footnoteIds.has(cp) || this.endnoteIds.has(cp))) {
          const f = this.footnoteIds.get(cp);
          const ref = f !== void 0 ? el("w:footnoteReference", { "w:customMarkFollows": "1", "w:id": f }) : el("w:endnoteReference", { "w:customMarkFollows": "1", "w:id": this.endnoteIds.get(cp) });
          out.special(rPr, wrap, ref + `<w:t>${escText(String.fromCharCode(c))}</w:t>`);
          continue;
        }
        if (chp.fSpec || c < 32) {
          const x2 = this.specialChar(c, cp, chp, ctx);
          if (x2 !== void 0) {
            if (x2) out.special(rPr, wrap, x2);
            continue;
          }
        }
        if (chp.symbol && (chp.fSpec || c === 40)) {
          const font = r.fonts[chp.symbol.ftc]?.name;
          out.special(rPr, wrap, el("w:sym", { "w:font": font, "w:char": chp.symbol.xchar.toString(16).toUpperCase().padStart(4, "0") }));
          continue;
        }
        if (c < 32) continue;
        out.text(rPr, wrap, String.fromCharCode(c), !!chp.rmarkDel);
      }
    }
    if (link && !link.unwrap) out.raw("</w:hyperlink>");
    this.emitMarkers(p.cpEnd, out, ctx, true);
    return out.close();
  }
  /** FFData do campo de formulário que começa em `begin` (0x01 com sprmCFData na instrução). */
  formFieldData(p, begin) {
    const text = this.r.text;
    let depth = 0;
    let instr = "";
    for (let cp = begin + 1; cp < p.cpEnd - 1; cp++) {
      const c = text.charCodeAt(cp);
      if (c === 19) depth++;
      else if (c === 21) {
        if (depth === 0) return void 0;
        depth--;
      } else if (c === 20 && depth === 0) return void 0;
      else if (c === 1 && depth === 0) {
        if (!/^\s*FORM(TEXT|CHECKBOX|DROPDOWN)\b/i.test(instr)) return void 0;
        const { chp } = this.chpFor(p, cp);
        if (chp.fData && chp.picLocation !== void 0) return ffDataXml(this.r.data, chp.picLocation);
      } else if (depth === 0 && c >= 32) instr += String.fromCharCode(c);
    }
    return void 0;
  }
  /**
   * Campos HYPERLINK de nível superior inteiramente dentro do parágrafo, sem
   * campos aninhados na instrução: begin (CP) → separador, fim, destino.
   */
  scanHyperlinks(p, ctx) {
    const out = /* @__PURE__ */ new Map();
    const text = this.r.text;
    if (text.indexOf("", p.cpStart) < 0 || text.indexOf("", p.cpStart) >= p.cpEnd) return out;
    if (this.fieldStack.length) return out;
    const stack = [];
    for (let cp = p.cpStart; cp < p.cpEnd - 1; cp++) {
      const c = text.charCodeAt(cp);
      if (c === 19) {
        if (stack.length) stack[stack.length - 1].nested = stack[stack.length - 1].sep === void 0 || stack[stack.length - 1].nested;
        stack.push({ begin: cp, nested: false });
      } else if (c === 20 && stack.length) {
        const top = stack[stack.length - 1];
        if (top.sep === void 0) top.sep = cp;
      } else if (c === 21 && stack.length) {
        const f = stack.pop();
        if (stack.length || f.sep === void 0 || f.nested) continue;
        const instr = text.slice(f.begin + 1, f.sep);
        if (/^\s*SHAPE\b/i.test(instr)) {
          out.set(f.begin, { sep: f.sep, end: cp, unwrap: true });
          continue;
        }
        const m = /^\s*HYPERLINK\s+(.*)$/i.exec(instr);
        if (!m) continue;
        const args = parseFieldArgs(m[1]);
        let url;
        let anchor, tooltip, target;
        for (let i2 = 0; i2 < args.length; i2++) {
          const a = args[i2];
          if (a === "\\l") anchor = args[++i2];
          else if (a === "\\o") tooltip = args[++i2];
          else if (a === "\\t") target = args[++i2];
          else if (a.startsWith("\\")) {
            if (a === "\\m" || a === "\\n") continue;
          } else if (url === void 0) url = a;
        }
        if (!url && !anchor) continue;
        const rid = url ? ctx.rels.add("hyperlink", url, true) : void 0;
        out.set(f.begin, { sep: f.sep, end: cp, rid, anchor, tooltip, target });
      }
    }
    return out;
  }
  /** Bookmarks/comentários que começam/terminam neste CP. */
  emitMarkers(cp, out, ctx, endOnly = false) {
    const ends = this.bkEnds.get(cp);
    if (ends) {
      for (const id of ends) out.raw(el("w:bookmarkEnd", { "w:id": id }));
      this.bkEnds.delete(cp);
    }
    const cEnds = ctx.kind === "main" ? this.commentEnds.get(cp) : void 0;
    if (cEnds) {
      for (const id of cEnds) out.raw(el("w:commentRangeEnd", { "w:id": id }));
      this.commentEnds.delete(cp);
    }
    if (endOnly) return;
    const starts = this.bkStarts.get(cp);
    if (starts) {
      for (const b of starts) out.raw(el("w:bookmarkStart", { "w:id": b.id, "w:name": b.name }));
      this.bkStarts.delete(cp);
    }
    const cStarts = ctx.kind === "main" ? this.commentStarts.get(cp) : void 0;
    if (cStarts) {
      for (const id of cStarts) out.raw(el("w:commentRangeStart", { "w:id": id }));
      this.commentStarts.delete(cp);
    }
  }
  wrapKey(chp) {
    if (chp.rmarkIns) return `ins|${this.revAuthors[chp.ibstRMark ?? 0] ?? "Autor desconhecido"}|${dttmIso(chp.dttmRMark) ?? ""}`;
    if (chp.rmarkDel) return `del|${this.revAuthors[chp.ibstRMarkDel ?? 0] ?? "Autor desconhecido"}|${dttmIso(chp.dttmRMarkDel) ?? ""}`;
    return "";
  }
  /**
   * Caractere especial → XML do conteúdo do run ('' = descartar), ou
   * undefined se for texto comum.
   */
  specialChar(c, cp, chp, ctx) {
    switch (c) {
      case 9:
        return "<w:tab/>";
      case 11:
        return "<w:br/>";
      case 12:
        return '<w:br w:type="page"/>';
      case 14:
        return '<w:br w:type="column"/>';
      case 30:
        return "<w:noBreakHyphen/>";
      case 31:
        return "<w:softHyphen/>";
      case 13:
        return "<w:cr/>";
      // 0x0D que não é marca de parágrafo (o Word grava w:cr)
      case 7:
        return "";
    }
    if (!chp.fSpec) return c < 32 ? "" : void 0;
    switch (c) {
      case 1: {
        if (chp.fData || chp.picLocation === void 0) return "";
        if (chp.fOle2) return "";
        const pic = readInlinePicture(this.r, chp.picLocation);
        if (!pic) return "";
        if (!pic.blip && pic.hr) return hrVml(pic);
        return this.inlineDrawing(pic, ctx);
      }
      case 2: {
        if (ctx.kind === "ftn") return "<w:footnoteRef/>";
        if (ctx.kind === "edn") return "<w:endnoteRef/>";
        const f = this.footnoteIds.get(cp);
        if (f !== void 0) return el("w:footnoteReference", { "w:id": f });
        const e = this.endnoteIds.get(cp);
        if (e !== void 0) return el("w:endnoteReference", { "w:id": e });
        return "";
      }
      case 5: {
        if (ctx.kind === "atn") return "<w:annotationRef/>";
        const i2 = this.commentByRef.get(cp);
        return i2 !== void 0 ? el("w:commentReference", { "w:id": i2 }) : "";
      }
      case 8: {
        const f = (ctx.hdr ? this.fspaHdr : this.fspaMain).get(cp);
        return f ? this.anchorDrawing(f, ctx) : "";
      }
      case 3:
        return ctx.kind === "ftn" || ctx.kind === "edn" ? "<w:separator/>" : "";
      case 4:
        return ctx.kind === "ftn" || ctx.kind === "edn" ? "<w:continuationSeparator/>" : "";
    }
    return c < 32 ? "" : void 0;
  }
  // ───────────────────────────── imagens/desenhos ─────────────────────────────
  mediaTarget(blip) {
    const key = `${blip.ext}:${blip.bytes.length}:${hash(blip.bytes)}`;
    const hit = this.media.get(key);
    if (hit) return hit;
    const ext = blip.ext === "jpeg" ? "jpeg" : blip.ext;
    const name = `media/image${++this.mediaN}.${ext}`;
    this.files.set(`word/${name}`, blip.bytes);
    this.mediaExt.add(ext);
    this.media.set(key, name);
    return name;
  }
  inlineDrawing(pic, ctx) {
    if (!pic.blip) return "";
    const rid = ctx.rels.add("image", this.mediaTarget(pic.blip));
    const id = ++this.docPrId;
    const cx = Math.max(1, Math.round(pic.cx));
    const cy = Math.max(1, Math.round(pic.cy));
    const name = pic.name ?? `Imagem ${id}`;
    return "<w:drawing>" + el(
      "wp:inline",
      { distT: 0, distB: 0, distL: 0, distR: 0 },
      el("wp:extent", { cx, cy }) + el("wp:effectExtent", { l: 0, t: 0, r: 0, b: 0 }) + el("wp:docPr", { id, name }) + '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' + picGraphic(id, name, rid, cx, cy, pic)
    ) + "</w:drawing>";
  }
  anchorDrawing(f, ctx) {
    const r = this.r;
    const shape = r.shape(f.spid, ctx.hdr);
    if (!shape || r.masters.has(shape.spid)) return "";
    const pv = (id2) => shape.props.get(id2)?.value;
    const cx = Math.max(1, (f.xaRight - f.xaLeft) * EMU_PER_TWIP4);
    const cy = Math.max(1, (f.yaBottom - f.yaTop) * EMU_PER_TWIP4);
    const relH = ["margin", "page", "column"][f.bx] ?? "column";
    const relV = ["margin", "page", "paragraph"][f.by] ?? "paragraph";
    const posrelh = pv(912), posrelv = pv(914), posh = pv(911), posv = pv(913);
    const relHName = posrelh !== void 0 ? ["margin", "page", "column", "character", "leftMargin", "rightMargin", "insideMargin", "outsideMargin"][posrelh] ?? relH : relH;
    const relVName = posrelv !== void 0 ? ["margin", "page", "paragraph", "line", "topMargin", "bottomMargin", "insideMargin", "outsideMargin"][posrelv] ?? relV : relV;
    const hAlign = posh ? ["", "left", "center", "right", "inside", "outside"][posh] : "";
    const vAlign = posv ? ["", "top", "center", "bottom", "inside", "outside"][posv] : "";
    const positionH = `<wp:positionH relativeFrom="${relHName}">${hAlign ? `<wp:align>${hAlign}</wp:align>` : `<wp:posOffset>${f.xaLeft * EMU_PER_TWIP4}</wp:posOffset>`}</wp:positionH>`;
    const positionV = `<wp:positionV relativeFrom="${relVName}">${vAlign ? `<wp:align>${vAlign}</wp:align>` : `<wp:posOffset>${f.yaTop * EMU_PER_TWIP4}</wp:posOffset>`}</wp:positionV>`;
    const wrapText = ["bothSides", "left", "right", "largest"][f.wrk] ?? "bothSides";
    let wrap;
    switch (f.wr) {
      case 1:
        wrap = "<wp:wrapTopAndBottom/>";
        break;
      case 2:
      case 0:
        wrap = `<wp:wrapSquare wrapText="${wrapText}"/>`;
        break;
      case 4:
        wrap = `<wp:wrapTight wrapText="${wrapText}"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapTight>`;
        break;
      case 5:
        wrap = `<wp:wrapThrough wrapText="${wrapText}"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapThrough>`;
        break;
      default:
        wrap = "<wp:wrapNone/>";
    }
    const dist = (id2, def) => pv(id2) ?? def;
    const id = ++this.docPrId;
    const name = `Forma ${id}`;
    const graphic = this.shapeGraphic(shape, f, ctx, id, name, cx, cy);
    if (!graphic) return "";
    if (posrelh === 3 && posrelv === 3 && !posh && !posv && f.xaLeft === 0 && f.yaTop === 0) {
      return "<w:drawing>" + el(
        "wp:inline",
        { distT: 0, distB: 0, distL: 0, distR: 0 },
        el("wp:extent", { cx, cy }) + el("wp:effectExtent", { l: 0, t: 0, r: 0, b: 0 }) + el("wp:docPr", { id, name }) + "<wp:cNvGraphicFramePr/>" + graphic
      ) + "</w:drawing>";
    }
    const g = pv(959);
    const behind = oaFlag(g, 5) ?? (f.wr === 3 && f.belowText);
    const a = {
      distT: dist(901, 0),
      distB: dist(903, 0),
      distL: dist(900, 114300),
      distR: dist(902, 114300),
      // ordem Z = ordem das formas no desenho (DgContainer), como o z-index do VML do Word
      simplePos: 0,
      relativeHeight: 251658240 + (shape.z ?? id) * 1024,
      behindDoc: behind ? 1 : 0,
      locked: f.anchorLock ? 1 : 0,
      layoutInCell: oaFlag(g, 15) ?? true ? 1 : 0,
      allowOverlap: oaFlag(g, 9) ?? true ? 1 : 0
    };
    return "<w:drawing>" + el(
      "wp:anchor",
      a,
      '<wp:simplePos x="0" y="0"/>' + positionH + positionV + el("wp:extent", { cx, cy }) + el("wp:effectExtent", { l: 0, t: 0, r: 0, b: 0 }) + wrap + el("wp:docPr", { id, name, hidden: oaFlag(g, 1) ? 1 : void 0 }) + "<wp:cNvGraphicFramePr/>" + graphic
    ) + "</w:drawing>";
  }
  /** a:graphic para uma forma flutuante: imagem, forma/caixa de texto ou grupo. */
  shapeGraphic(shape, f, ctx, id, name, cx, cy) {
    if (shape.children && shape.flags & FSP.group) {
      const g = shape.groupRect ?? { l: 0, t: 0, r: cx, b: cy };
      const xfrm = xfrmXml("a:xfrm", { x: 0, y: 0, cx, cy }, shape, { x: g.l, y: g.t, cx: g.r - g.l, cy: g.b - g.t });
      const kids = shape.children.map((c) => this.childShapeXml(c, ctx)).join("");
      return `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"><wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr>${xfrm}</wpg:grpSpPr>${kids}</wpg:wgp></a:graphicData></a:graphic>`;
    }
    const blip = shapeBlip(this.r, shape);
    const stories = ctx.hdr ? this.txbxHdr : this.txbxMain;
    const story = stories.get(shape.spid) ?? stories.get(f.spid);
    if (blip && !story) {
      const rid = ctx.rels.add("image", this.mediaTarget(blip));
      return picGraphic(id, name, rid, cx, cy, { cx, cy, blip, crop: cropOf(shape), fx: picFxOf(shape) });
    }
    return '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' + this.wspXml(shape, ctx, { x: 0, y: 0, cx, cy }, story, false) + "</a:graphicData></a:graphic>";
  }
  /** Forma dentro de grupo (coordenadas no espaço filho do grupo). */
  childShapeXml(shape, ctx) {
    const a = shape.childAnchor ?? { l: 0, t: 0, r: 0, b: 0 };
    const box = { x: a.l, y: a.t, cx: Math.max(0, a.r - a.l), cy: Math.max(0, a.b - a.t) };
    if (shape.children && shape.flags & FSP.group) {
      const g = shape.groupRect ?? { l: a.l, t: a.t, r: a.r, b: a.b };
      const xfrm = xfrmXml("a:xfrm", box, shape, { x: g.l, y: g.t, cx: g.r - g.l, cy: g.b - g.t });
      const kids = shape.children.map((c) => this.childShapeXml(c, ctx)).join("");
      return `<wpg:grpSp><wpg:cNvGrpSpPr/><wpg:grpSpPr>${xfrm}</wpg:grpSpPr>${kids}</wpg:grpSp>`;
    }
    const id = ++this.docPrId;
    const blip = shapeBlip(this.r, shape);
    const story = (ctx.hdr ? this.txbxHdr : this.txbxMain).get(shape.spid);
    if (blip && !story) {
      const rid = ctx.rels.add("image", this.mediaTarget(blip));
      return `<pic:pic><pic:nvPicPr>${el("pic:cNvPr", { id, name: `Imagem ${id}` })}<pic:cNvPicPr/></pic:nvPicPr><pic:blipFill>${el("a:blip", { "r:embed": rid })}<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr>${xfrmXml("a:xfrm", box, shape)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`;
    }
    return this.wspXml(shape, ctx, box, story, true, id);
  }
  /** wps:wsp: geometria predefinida, preenchimento, linha e (opcional) caixa de texto. */
  wspXml(shape, ctx, box, story, child, id) {
    const pv = (k) => shape.props.get(k)?.value;
    if (isWordArtType(shape.type) && !story) {
      const art = wordArtXml(shape, box, child, id);
      if (art) return art;
    }
    const adjust = [];
    for (let i2 = 0; i2 < 10; i2++) {
      const v = pv(327 + i2);
      adjust.push(v === void 0 ? void 0 : v | 0);
    }
    const geo = presetFor(shape.type, adjust, box.cx || 1, box.cy || 1) ?? { prst: "rect", av: [] };
    const isLine = shape.type === 20 || isConnectorType(shape.type);
    const filled = oaFlag(pv(447), 4) ?? !isLine;
    const lined = oaFlag(pv(511), 3) ?? true;
    const lineWidth = pv(459) ?? 9525;
    const av = geo.av.map((g) => el("a:gd", { name: g.name, fmla: `val ${g.val}` })).join("");
    let spPr = xfrmXml("a:xfrm", box, shape, void 0, !!geo.flipV) + `<a:prstGeom prst="${geo.prst}">${av ? `<a:avLst>${av}</a:avLst>` : "<a:avLst/>"}</a:prstGeom>`;
    if (!isLine) spPr += filled ? oaFillXml(shape) : "<a:noFill/>";
    if (lined) {
      const dash = ["solid", "sysDash", "sysDot", "sysDashDot", "sysDashDotDot", "dot", "dash", "lgDash", "dashDot", "lgDashDot", "lgDashDotDot"][pv(462) ?? 0] ?? "solid";
      const arrow = (v) => v ? ["none", "triangle", "stealth", "diamond", "oval", "arrow"][v] ?? "triangle" : void 0;
      const head = arrow(pv(464)), tail = arrow(pv(465));
      spPr += `<a:ln w="${lineWidth}"><a:solidFill><a:srgbClr val="${oaColor(pv(448), 0)}"/></a:solidFill>` + (dash !== "solid" ? `<a:prstDash val="${dash}"/>` : "") + (head ? `<a:headEnd type="${head}"/>` : "") + (tail ? `<a:tailEnd type="${tail}"/>` : "") + "</a:ln>";
    } else spPr += "<a:ln><a:noFill/></a:ln>";
    let txbx = "";
    if (story) {
      const paras = this.collectParas(story[0], story[1]);
      const last = paras[paras.length - 1];
      const list = paras.length > 1 && last && last.cpEnd - last.cpStart === 1 ? paras.slice(0, -1) : paras;
      const saved = this.fieldStack;
      this.fieldStack = [];
      const inner = this.renderBlocks(list, 0, list.length, 0, { ...ctx, kind: "txbx" });
      this.fieldStack = saved;
      txbx = `<wps:txbx><w:txbxContent>${inner || "<w:p/>"}</w:txbxContent></wps:txbx>`;
    }
    const l = pv(129) ?? 91440, t = pv(130) ?? 45720, rr = pv(131) ?? 91440, b = pv(132) ?? 45720;
    const anchor = ["t", "ctr", "b", "t", "ctr", "b"][pv(135) ?? 0] ?? "t";
    const textBits = pv(191) ?? 0;
    const autofit = textBits & 1 << 17 ? (textBits & 2) !== 0 : false;
    const bodyPr = el("wps:bodyPr", { rot: 0, vert: "horz", wrap: "square", lIns: l, tIns: t, rIns: rr, bIns: b, anchor, anchorCtr: 0 }, autofit ? "<a:spAutoFit/>" : "<a:noAutofit/>");
    const nv = child && id !== void 0 ? el("wps:cNvPr", { id, name: `Forma ${id}` }) : "";
    const cNv = isLine ? "<wps:cNvCnPr/>" : `<wps:cNvSpPr${story ? ' txBox="1"' : ""}/>`;
    return `<wps:wsp>${nv}${cNv}<wps:spPr>${spPr}</wps:spPr>${txbx}${bodyPr}</wps:wsp>`;
  }
  // ───────────────────────────── tabelas ─────────────────────────────
  tapOf(row) {
    const tap = newTap();
    for (const p of row.tapPrls) if (p.sprm === 22074) {
      const st = this.r.stsh.styles[p.r.u16(p.op)];
      if (st?.tapx) {
        for (const q of prls(st.tapx)) if (sgcOf(q.sprm) === 5 && q.sprm !== 22074) applyTap(tap, q);
      }
    }
    for (const p of row.tapPrls) applyTap(tap, p);
    finishTap(tap);
    return tap;
  }
  renderTable(paras, from, to, depth, ctx) {
    const rows = [];
    let cells = [];
    let cellStart = from;
    for (let k = from; k < to; k++) {
      const p = paras[k];
      if (p.depth !== depth) continue;
      if (p.rowEnd) {
        if (k > cellStart && !cells.length) cells.push([cellStart, k]);
        rows.push({ cells, tap: this.tapOf(p), ttp: p });
        cells = [];
        cellStart = k + 1;
      } else if (p.cellEnd) {
        cells.push([cellStart, k + 1]);
        cellStart = k + 1;
      }
    }
    if (cells.length || cellStart < to) {
      if (cellStart < to) cells.push([cellStart, to]);
      rows.push({ cells, tap: rows.length ? rows[rows.length - 1].tap : newTap() });
    }
    if (!rows.length) return "";
    for (const row of rows) row.centers = layoutCenters(row.tap, row.cells.length);
    const centered = rows.every((r) => r.tap.jc === 1) && !isPositioned(rows[0].tap);
    if (centered) {
      for (const row of rows) {
        const c = row.centers, n = Math.min(row.cells.length, c.length - 1);
        if (n > 0) {
          const mid = Math.round((c[0] + c[n]) / 2);
          row.centers = c.map((v) => v - mid);
        }
      }
    }
    const bounds = /* @__PURE__ */ new Set();
    for (const row of rows) {
      const c = row.centers;
      for (let i2 = 0; i2 < c.length && i2 <= row.cells.length; i2++) bounds.add(c[i2]);
    }
    const grid = [...bounds].sort((a, b) => a - b);
    const first = rows[0].tap;
    let x2 = "<w:tbl>";
    x2 += `<w:tblPr>${this.tblPrXml(first, centered && grid.length > 1 ? grid[grid.length - 1] - grid[0] : void 0)}</w:tblPr>`;
    x2 += "<w:tblGrid>";
    for (let i2 = 0; i2 + 1 < grid.length; i2++) x2 += el("w:gridCol", { "w:w": grid[i2 + 1] - grid[i2] });
    if (grid.length < 2) x2 += el("w:gridCol", { "w:w": 0 });
    x2 += "</w:tblGrid>";
    const gridIdx = (pos) => {
      let best = 0, bestD = Infinity;
      grid.forEach((g, i2) => {
        const d = Math.abs(g - pos);
        if (d < bestD) {
          bestD = d;
          best = i2;
        }
      });
      return best;
    };
    for (const row of rows) {
      const tap = row.tap;
      if (isPositioned(tap)) {
        for (const [cs, ce] of row.cells) for (let k = cs; k < ce; k++) if (paras[k].depth === depth) for (const key of FRAME_KEYS) paras[k].touched.delete(key);
      }
      const c = row.centers;
      let trPr = "";
      const startIdx = c.length ? gridIdx(c[0]) : 0;
      const endIdx = c.length ? gridIdx(c[Math.min(row.cells.length, c.length - 1)]) : 0;
      if (startIdx > 0) trPr += el("w:gridBefore", { "w:val": startIdx });
      if (endIdx < grid.length - 1 && c.length) trPr += el("w:gridAfter", { "w:val": grid.length - 1 - endIdx });
      if (startIdx > 0) trPr += el("w:wBefore", { "w:w": grid[startIdx] - grid[0], "w:type": "dxa" });
      if (endIdx < grid.length - 1 && c.length) trPr += el("w:wAfter", { "w:w": grid[grid.length - 1] - grid[endIdx], "w:type": "dxa" });
      if (tap.cantSplit) trPr += "<w:cantSplit/>";
      if (tap.rowHeight) trPr += el("w:trHeight", { "w:val": Math.abs(tap.rowHeight), "w:hRule": tap.rowHeight < 0 ? "exact" : void 0 });
      if (tap.header) trPr += "<w:tblHeader/>";
      if (tap.jc) trPr += el("w:jc", { "w:val": ["left", "center", "right"][tap.jc] ?? "left" });
      if (row.ttp && this.chpFor(row.ttp, row.ttp.cpEnd - 1).chp.vanish) trPr += "<w:hidden/>";
      x2 += "<w:tr>";
      const ex = this.tblPrExXml(tap, first);
      if (ex) x2 += `<w:tblPrEx>${ex}</w:tblPrEx>`;
      if (trPr) x2 += `<w:trPr>${trPr}</w:trPr>`;
      let ci = 0;
      while (ci < row.cells.length) {
        const tc = tap.tcs[ci];
        const [cs, ce] = row.cells[ci];
        let span = 1;
        if (tc && tc.horzMerge >= 2) {
          while (ci + span < row.cells.length && tap.tcs[ci + span] && tap.tcs[ci + span].horzMerge === 1) span++;
        }
        const left = c[ci] ?? 0;
        const right = c[Math.min(ci + span, c.length - 1)] ?? left;
        const gs = Math.max(1, gridIdx(right) - gridIdx(left));
        x2 += `<w:tc><w:tcPr>${this.tcPrXml(tap, ci, gs, right - left)}</w:tcPr>`;
        const inner = this.renderBlocks(paras, cs, ce, depth, ctx);
        x2 += inner || "<w:p/>";
        for (let k = 1; k < span; k++) {
          const [ms, me] = row.cells[ci + k];
          const extra = paras.slice(ms, me).some((pp) => pp.cpEnd - pp.cpStart > 1) ? this.renderBlocks(paras, ms, me, depth, ctx) : "";
          x2 += extra;
        }
        x2 += "</w:tc>";
        ci += span;
      }
      x2 += "</w:tr>";
    }
    x2 += "</w:tbl>";
    return x2;
  }
  tblPrXml(tap, centeredW) {
    let x2 = "";
    if (tap.istd !== void 0) {
      const id = this.styleIds.get(tap.istd);
      if (id && tap.istd !== 11) x2 += el("w:tblStyle", { "w:val": id });
    }
    if (isPositioned(tap)) {
      const pc = tap.pc ?? 0;
      const pcVert = pc >> 4 & 3, pcHorz = pc >> 6 & 3;
      const a = {
        "w:leftFromText": tap.dxaFromText,
        "w:rightFromText": tap.dxaFromTextRight,
        "w:topFromText": tap.dyaFromText,
        "w:bottomFromText": tap.dyaFromTextBottom,
        "w:vertAnchor": ["margin", "page", "text"][pcVert] ?? "text",
        "w:horzAnchor": ["text", "margin", "page"][pcHorz] ?? "text"
      };
      const xa = tap.dxaAbs ?? 0, ya = tap.dyaAbs ?? 0;
      const xAl = { [-4]: "center", [-8]: "right", [-12]: "inside", [-16]: "outside" };
      const yAl = { [-4]: "top", [-8]: "center", [-12]: "bottom", [-16]: "inside", [-20]: "outside" };
      if (xAl[xa]) a["w:tblpXSpec"] = xAl[xa];
      else if (xa) a["w:tblpX"] = xa;
      if (yAl[ya]) a["w:tblpYSpec"] = yAl[ya];
      else if (ya) a["w:tblpY"] = ya;
      x2 += el("w:tblpPr", a);
      if (tap.noAllowOverlap) x2 += '<w:tblOverlap w:val="never"/>';
    }
    if (tap.bidi) x2 += "<w:bidiVisual/>";
    const tw2 = centeredW !== void 0 && tap.tableWidth?.fts === 3 && tap.tableWidth.w > centeredW ? { fts: 3, w: centeredW } : tap.tableWidth;
    x2 += widthXml2("w:tblW", tw2) || el("w:tblW", { "w:w": 0, "w:type": "auto" });
    if (tap.jc) x2 += el("w:jc", { "w:val": ["left", "center", "right"][tap.jc] ?? "left" });
    if (tap.spacing) x2 += el("w:tblCellSpacing", { "w:w": tap.spacing, "w:type": "dxa" });
    const ind = tap.widthIndent && tap.widthIndent.fts === 3 ? tap.widthIndent.w : tableIndent(tap);
    if (ind !== void 0 && ind !== 0 && (!tap.jc || tap.jc === 1)) x2 += el("w:tblInd", { "w:w": ind, "w:type": "dxa" });
    if (tap.bordersSet && !allNone(tap.borders)) x2 += `<w:tblBorders>${bordersXml2(tap.borders, true)}</w:tblBorders>`;
    if (tap.shdTable) x2 += shdXml2(tap.shdTable);
    if (tap.autofit === false || tap.autofit === void 0) x2 += '<w:tblLayout w:type="fixed"/>';
    const mar = cellMargins(tap);
    if (mar) x2 += `<w:tblCellMar>${mar}</w:tblCellMar>`;
    const look = (tap.tlp?.grfatl ?? 0) & 2016;
    x2 += el("w:tblLook", {
      "w:val": look.toString(16).toUpperCase().padStart(4, "0"),
      "w:firstRow": look & 32 ? 1 : 0,
      "w:lastRow": look & 64 ? 1 : 0,
      "w:firstColumn": look & 128 ? 1 : 0,
      "w:lastColumn": look & 256 ? 1 : 0,
      "w:noHBand": look & 512 ? 1 : 0,
      "w:noVBand": look & 1024 ? 1 : 0
    });
    return x2;
  }
  /** Propriedades da linha que diferem da 1ª linha (tblPrEx). */
  tblPrExXml(tap, first) {
    let x2 = "";
    if (tap === first) return "";
    if (tap.bordersSet && JSON.stringify(tap.borders) !== JSON.stringify(first.borders)) x2 += `<w:tblBorders>${bordersXml2(tap.borders, true)}</w:tblBorders>`;
    const mar = cellMargins(tap);
    if (mar && mar !== cellMargins(first)) x2 += `<w:tblCellMar>${mar}</w:tblCellMar>`;
    return x2;
  }
  tcPrXml(tap, i2, gridSpan, width) {
    const tc = tap.tcs[i2];
    let x2 = "";
    if (tc && tc.ftsWidth === 1) x2 += el("w:tcW", { "w:w": 0, "w:type": "auto" });
    else if (tc && tc.ftsWidth) x2 += widthXml2("w:tcW", { fts: tc.ftsWidth, w: tc.wWidth });
    else x2 += el("w:tcW", { "w:w": Math.max(0, width), "w:type": "dxa" });
    if (gridSpan > 1) x2 += el("w:gridSpan", { "w:val": gridSpan });
    if (tc?.vertMerge) x2 += tc.vertMerge === 3 || tc.vertMerge === 2 ? '<w:vMerge w:val="restart"/>' : "<w:vMerge/>";
    if (tc) {
      const sides = [
        ["w:top", tc.brcTop, tc.brcSet.top],
        ["w:left", tc.brcLeft, tc.brcSet.left],
        ["w:bottom", tc.brcBottom, tc.brcSet.bottom],
        ["w:right", tc.brcRight, tc.brcSet.right]
      ];
      const b = sides.filter(([, , set]) => set).map(([n, brc]) => brcXml(n, brc)).join("");
      if (b) x2 += `<w:tcBorders>${b}</w:tcBorders>`;
    }
    const shd = cellShd(tap, i2);
    if (shd) x2 += shdXml2(shd);
    if (tc?.noWrap) x2 += "<w:noWrap/>";
    if (tc && (tc.mar.top !== void 0 || tc.mar.left !== void 0 || tc.mar.bottom !== void 0 || tc.mar.right !== void 0)) {
      let m = "";
      if (tc.mar.top !== void 0) m += el("w:top", { "w:w": tc.mar.top, "w:type": "dxa" });
      if (tc.mar.left !== void 0) m += el("w:left", { "w:w": tc.mar.left, "w:type": "dxa" });
      if (tc.mar.bottom !== void 0) m += el("w:bottom", { "w:w": tc.mar.bottom, "w:type": "dxa" });
      if (tc.mar.right !== void 0) m += el("w:right", { "w:w": tc.mar.right, "w:type": "dxa" });
      x2 += `<w:tcMar>${m}</w:tcMar>`;
    }
    if (tc?.textFlow) x2 += el("w:textDirection", { "w:val": ["lrTb", "tbRl", "btLr", "lrTbV", "tbRlV", "tbLrV"][tc.textFlow] ?? "lrTb" });
    if (tc?.fitText) x2 += "<w:tcFitText/>";
    if (tc?.vertAlign) x2 += el("w:vAlign", { "w:val": ["top", "center", "bottom"][tc.vertAlign] ?? "top" });
    if (tc?.hideMark) x2 += "<w:hideMark/>";
    return x2;
  }
};
function parseFieldArgs(s) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|(\S+)/g;
  let m;
  while (m = re.exec(s)) out.push(m[1] !== void 0 ? m[1].replace(/\\(.)/g, "$1") : m[2]);
  return out;
}
var FRAME_KEYS = ["dxaAbs", "dyaAbs", "dxaWidth", "pc", "wr", "wHeightAbs", "dyaFromText", "dxaFromText", "frameLocked"];
var INDENT_SPRMS = {
  33807: "dxaLeft",
  33886: "dxaLeft",
  17936: "dxaLeft",
  18015: "dxaLeft",
  33809: "dxaLeft1",
  33888: "dxaLeft1",
  17494: "dxcLeft",
  17495: "dxcLeft1"
};
function push(m, k, v) {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
}
var keyIds = /* @__PURE__ */ new WeakMap();
var keySeq = 0;
function keyOf(g) {
  let k = keyIds.get(g);
  if (k === void 0) {
    k = ++keySeq;
    keyIds.set(g, k);
  }
  return k;
}
function hash(b) {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(b.length / 4096));
  for (let i2 = 0; i2 < b.length; i2 += step) h = Math.imul(h ^ b[i2], 16777619);
  return h >>> 0;
}
function dttmIso(v) {
  if (!v) return void 0;
  const mint = v & 63, hr = v >> 6 & 31, dom = v >> 11 & 31, mon = v >> 16 & 15, yr = (v >>> 20 & 511) + 1900;
  if (!dom || !mon) return void 0;
  const p = (n) => String(n).padStart(2, "0");
  return `${yr}-${p(mon)}-${p(dom)}T${p(hr)}:${p(mint)}:00Z`;
}
function notePr(pos, nfc, start, rnc, endnote) {
  let x2 = "";
  if (pos && pos !== "pageBottom") x2 += el("w:pos", { "w:val": pos });
  if (nfc !== void 0 && nfc !== (endnote ? 2 : 0)) x2 += el("w:numFmt", { "w:val": numFmtOf(nfc) });
  if (start !== void 0 && start > 1) x2 += el("w:numStart", { "w:val": start });
  if (rnc) x2 += el("w:numRestart", { "w:val": ["continuous", "eachSect", "eachPage"][rnc] ?? "continuous" });
  return x2;
}
function widthXml2(name, w) {
  if (!w || !w.fts) return "";
  const type = ["nil", "auto", "pct", "dxa"][w.fts & 3] ?? "dxa";
  return el(name, { "w:w": w.fts === 1 ? 0 : w.w, "w:type": type });
}
function bordersXml2(b, inside) {
  const sides = inside ? ["top", "left", "bottom", "right", "insideH", "insideV"] : ["top", "left", "bottom", "right"];
  return sides.map((s) => brcXml(`w:${s}`, b[s])).join("");
}
function layoutCenters(tap, n) {
  const c = tap.centers;
  if (!c.length || n <= 0) return c;
  return c;
}
function isPositioned(tap) {
  return tap.dxaAbs !== void 0 || tap.dyaAbs !== void 0 || tap.pc !== void 0;
}
function allNone(b) {
  return ["top", "left", "bottom", "right", "insideH", "insideV"].every((s) => brcNone(b[s]));
}
function cellMargins(tap) {
  const p = tap.padding;
  let left = p.left, right = p.right;
  if (left === void 0 && right === void 0 && tap.dxaGapHalf !== void 0) {
    left = tap.dxaGapHalf;
    right = tap.dxaGapHalf;
  }
  let m = "";
  if (p.top !== void 0) m += el("w:top", { "w:w": p.top, "w:type": "dxa" });
  if (left !== void 0) m += el("w:left", { "w:w": left, "w:type": "dxa" });
  if (p.bottom !== void 0) m += el("w:bottom", { "w:w": p.bottom, "w:type": "dxa" });
  if (right !== void 0) m += el("w:right", { "w:w": right, "w:type": "dxa" });
  return m;
}
function tableIndent(tap) {
  if (!tap.centers.length) return void 0;
  const left = tap.tcs[0]?.mar.left ?? tap.padding.left ?? tap.dxaGapHalf ?? 0;
  return tap.centers[0] + left;
}
function cellShd(tap, i2) {
  const tc = tap.tcs[i2];
  if (tc?.shd) return tc.shd;
  const pick = (arr) => {
    const s = arr?.[i2];
    if (!s) return void 0;
    if (s.pat === 0 && s.back === -1 && s.fore === -1) return void 0;
    if (s.pat === 65535) return void 0;
    return s;
  };
  return pick(tap.shdRaw) ?? pick(tap.shdDef) ?? pick(tap.shd80);
}
function oaString(shape, id) {
  const c = shape.props.get(id)?.complex;
  if (!c || c.length < 2) return void 0;
  let s = "";
  for (let i2 = 0; i2 + 1 < c.length; i2 += 2) {
    const ch = c[i2] | c[i2 + 1] << 8;
    if (!ch) break;
    s += String.fromCharCode(ch);
  }
  return s;
}
function wordArtXml(shape, box, child, id) {
  const text = oaString(shape, 192);
  if (!text) return void 0;
  const pv = (k) => shape.props.get(k)?.value;
  const font = oaString(shape, 197);
  const sizeRaw = pv(195);
  const size = sizeRaw !== void 0 ? Math.max(1, Math.round(sizeRaw / 65536 * 2)) : 72;
  const filled = oaFlag(pv(447), 4) ?? true;
  const rPr = (font ? el("w:rFonts", { "w:ascii": font, "w:hAnsi": font, "w:cs": font }) : "") + (filled ? el("w:color", { "w:val": oaColor(pv(385), 16777215) }) : "") + el("w:sz", { "w:val": size }) + el("w:szCs", { "w:val": size });
  const paras = text.split(/\r\n|\r|\n/).map((line) => `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escText(line)}</w:t></w:r></w:p>`).join("");
  const spPr = xfrmXml("a:xfrm", box, shape) + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>';
  const bodyPr = el(
    "wps:bodyPr",
    { rot: 0, vert: "horz", wrap: "none", lIns: 0, tIns: 0, rIns: 0, bIns: 0, fromWordArt: 1, anchor: "ctr", anchorCtr: 0 },
    '<a:prstTxWarp prst="textPlain"><a:avLst/></a:prstTxWarp><a:noAutofit/>'
  );
  const nv = child && id !== void 0 ? el("wps:cNvPr", { id, name: `WordArt ${id}` }) : "";
  return `<wps:wsp>${nv}<wps:cNvSpPr txBox="1"/><wps:spPr>${spPr}</wps:spPr><wps:txbx><w:txbxContent>${paras}</w:txbxContent></wps:txbx>${bodyPr}</wps:wsp>`;
}
function oaFlag(v, bit) {
  if (v === void 0 || !(v >>> bit + 16 & 1)) return void 0;
  return (v >>> bit & 1) === 1;
}
function oaColor(v, def) {
  if (v === void 0 || v >>> 24 !== 0) return hex(def);
  return hex((v & 255) << 16 | v & 65280 | v >> 16 & 255);
}
function oaFillXml(shape) {
  const pv = (k) => shape.props.get(k)?.value;
  const c1 = oaColor(pv(385), 16777215);
  const type = pv(384) ?? 0;
  if (type !== 4 && type !== 7) return `<a:solidFill><a:srgbClr val="${c1}"/></a:solidFill>`;
  const col = (v) => {
    if (v === void 0 || v >>> 24 !== 16 || (v & 255) !== 240) return oaColor(v, 16777215);
    const fn = v >>> 8 & 15, p = v >>> 16 & 255, n = parseInt(c1, 16);
    const ch = (c) => Math.round(fn === 1 ? c * p / 255 : fn === 2 ? 255 - (255 - c) * p / 255 : c);
    return hex(ch(n >>> 16) << 16 | ch(n >>> 8 & 255) << 8 | ch(n & 255));
  };
  let base = [[0, c1], [1, col(pv(387))]];
  const arr = shape.props.get(407)?.complex;
  if (arr && arr.length >= 6) {
    const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    const n = dv.getUint16(0, true), cb = dv.getUint16(4, true);
    const list = [];
    for (let i2 = 0; i2 < n && cb >= 8 && 6 + (i2 + 1) * cb <= arr.length; i2++) list.push([dv.getInt32(6 + i2 * cb + 4, true) / 65536, col(dv.getUint32(6 + i2 * cb, true))]);
    if (list.length >= 2) base = list;
  }
  const f = Math.max(-100, Math.min(100, (pv(396) ?? 0) | 0)) / 100;
  const rev2 = base.map(([q, c]) => [1 - q, c]).reverse();
  const [a, b, mid] = f >= 0 ? [base, rev2, f] : [rev2, base, 1 + f];
  const stops = [];
  if (mid > 0) for (const [q, c] of a) stops.push([q * mid, c]);
  if (mid < 1) {
    for (const [q, c] of b) if (!(mid > 0 && q === 0)) stops.push([mid + q * (1 - mid), c]);
  }
  let alpha = ((pv(395) ?? 0) | 0) / 65536;
  while (alpha < 0) alpha += 180;
  const ang = ((90 - alpha) % 360 + 360) % 360 * 6e4;
  const gs = stops.map(([q, c]) => `<a:gs pos="${Math.round(Math.max(0, Math.min(1, q)) * 1e4) * 10}"><a:srgbClr val="${c}"/></a:gs>`).join("");
  return `<a:gradFill rotWithShape="1"><a:gsLst>${gs}</a:gsLst><a:lin ang="${Math.round(ang)}" scaled="${type === 7 ? 1 : 0}"/></a:gradFill>`;
}
function backgroundXml(shape) {
  if (!shape) return "";
  const pv = (k) => shape.props.get(k)?.value;
  if ((pv(384) ?? 0) !== 0 || oaFlag(pv(447), 4) === false) return "";
  const c = pv(385);
  if (c === void 0 || c >>> 24 !== 0) return "";
  const color = oaColor(c, 16777215);
  return color === "FFFFFF" ? "" : el("w:background", { "w:color": color });
}
function hrVml(pic) {
  const hr = pic.hr;
  const pt = (emu2) => String(Math.round(emu2 / 12700 * 10) / 10);
  const a = {
    style: `width:${pt(pic.cx)}pt;height:${pt(pic.cy)}pt`,
    "o:hrpct": hr.pct,
    "o:hralign": hr.align,
    "o:hrstd": "t",
    "o:hrnoshade": hr.noshade ? "t" : void 0,
    "o:hr": "t",
    fillcolor: hr.fill !== void 0 ? `#${hex(hr.fill)}` : void 0,
    stroked: "f"
  };
  return `<w:pict>${el("v:rect", a)}</w:pict>`;
}
function xfrmXml(name, b, shape, ch, extraFlipV = false) {
  const rotRaw = shape.props.get(4)?.value ?? 0;
  const rot = Math.round((rotRaw | 0) / 65536 * 6e4);
  const a = {
    rot: rot ? (rot % 216e5 + 216e5) % 216e5 : void 0,
    flipH: shape.flags & FSP.flipH ? 1 : void 0,
    // a preset pode ser o espelho vertical da geometria binária (preset-map)
    flipV: !!(shape.flags & FSP.flipV) !== extraFlipV ? 1 : void 0
  };
  const n = (v) => Math.round(v);
  let c = `<a:off x="${n(b.x)}" y="${n(b.y)}"/><a:ext cx="${Math.max(0, n(b.cx))}" cy="${Math.max(0, n(b.cy))}"/>`;
  if (ch) c += `<a:chOff x="${n(ch.x)}" y="${n(ch.y)}"/><a:chExt cx="${Math.max(0, n(ch.cx))}" cy="${Math.max(0, n(ch.cy))}"/>`;
  return el(name, a, c);
}
function cropOf(shape) {
  const f = (id) => {
    const v = shape.props.get(id)?.value ?? 0;
    return (v | 0) / 65536;
  };
  const c = { t: f(256), b: f(257), l: f(258), r: f(259) };
  return c.t || c.b || c.l || c.r ? c : void 0;
}
function picGraphic(id, name, rid, cx, cy, pic) {
  const fx = pic.fx;
  const blipKids = !fx ? "" : (fx.gray ? "<a:grayscl/>" : "") + (fx.biLevel ? '<a:biLevel thresh="50000"/>' : "") + (fx.bright || fx.contrast ? el("a:lum", { bright: fx.bright || void 0, contrast: fx.contrast || void 0 }) : "");
  let src = "";
  if (pic.crop) {
    const k = (v) => Math.round(v * 1e5);
    src = el("a:srcRect", { l: k(pic.crop.l) || void 0, t: k(pic.crop.t) || void 0, r: k(pic.crop.r) || void 0, b: k(pic.crop.b) || void 0 });
  }
  return `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr>${el("pic:cNvPr", { id: 0, name })}<pic:cNvPicPr/></pic:nvPicPr><pic:blipFill>${el("a:blip", { "r:embed": rid }, blipKids || void 0)}${src}<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>` + (id < 0 ? "" : "");
}
var RunBuf = class {
  constructor(ids) {
    this.ids = ids;
  }
  ids;
  parts = [];
  curRPr;
  openWrap = "";
  content = "";
  textBuf = "";
  textKind = "t";
  flushText() {
    if (!this.textBuf) return;
    const tag = { t: "w:t", instr: "w:instrText", del: "w:delText", delInstr: "w:delInstrText" }[this.textKind];
    const sp = /^\s|\s$/.test(this.textBuf) ? ' xml:space="preserve"' : "";
    this.content += `<${tag}${sp}>${escText(this.textBuf)}</${tag}>`;
    this.textBuf = "";
  }
  flushRun() {
    this.flushText();
    if (this.curRPr !== void 0 && this.content) {
      this.parts.push(`<w:r>${this.curRPr ? `<w:rPr>${this.curRPr}</w:rPr>` : ""}${this.content}</w:r>`);
    }
    this.content = "";
    this.curRPr = void 0;
  }
  setWrap(wrap) {
    if (wrap === this.openWrap) return;
    this.flushRun();
    if (this.openWrap) this.parts.push(this.openWrap.startsWith("ins|") ? "</w:ins>" : "</w:del>");
    this.openWrap = wrap;
    if (wrap) {
      const [kind, author, date] = wrap.split("|");
      this.parts.push(`<w:${kind}${attrs2({ "w:id": this.ids.next++, "w:author": author, "w:date": date || void 0 })}>`);
    }
  }
  begin(rPr, wrap) {
    this.setWrap(wrap);
    if (this.curRPr !== rPr) {
      this.flushRun();
      this.curRPr = rPr;
    }
  }
  text(rPr, wrap, s, deleted) {
    this.begin(rPr, wrap);
    const kind = deleted ? "del" : "t";
    if (this.textKind !== kind) {
      this.flushText();
      this.textKind = kind;
    }
    this.textBuf += s;
  }
  instr(rPr, wrap, s, deleted) {
    this.begin(rPr, wrap);
    const kind = deleted ? "delInstr" : "instr";
    if (this.textKind !== kind) {
      this.flushText();
      this.textKind = kind;
    }
    this.textBuf += s;
  }
  special(rPr, wrap, xml) {
    this.begin(rPr, wrap);
    this.flushText();
    if (xml.startsWith("<w:fldChar")) {
      this.flushRun();
      this.curRPr = rPr;
      this.content = xml;
      this.flushRun();
      return;
    }
    this.content += xml;
    if (xml.startsWith("<w:drawing") || xml.startsWith("<w:footnoteReference") || xml.startsWith("<w:endnoteReference") || xml.startsWith("<w:commentReference")) {
      this.flushRun();
    }
  }
  raw(xml) {
    this.flushRun();
    this.parts.push(xml);
  }
  close() {
    this.setWrap("");
    this.flushRun();
    return this.parts.join("");
  }
};

// ../docx-core/src/doc/index.ts
function isWordBinary(bytes) {
  if (!isCfbBytes(bytes)) return false;
  try {
    return readCfb(bytes).has("WordDocument");
  } catch {
    return false;
  }
}
function convertDocToDocx(bytes, options = {}) {
  if (!isCfbBytes(bytes)) throw new DocFormatError("O arquivo n\xE3o \xE9 um .doc do Word 97-2003 (assinatura de Compound File ausente).");
  try {
    const reader = new DocReader(bytes);
    return new DocxWriter(reader).build(options);
  } catch (e) {
    if (e instanceof DocFormatError) throw e;
    throw new DocFormatError(`Arquivo .doc corrompido ou n\xE3o suportado: ${e.message}`);
  }
}

// ../docx-core/src/table-ops.ts
var table_ops_exports = {};
__export(table_ops_exports, {
  DEFAULT_LOOK: () => DEFAULT_LOOK,
  NO_BORDER: () => NO_BORDER,
  autoFit: () => autoFit,
  canMerge: () => canMerge,
  cellAt: () => cellAt,
  cellContent: () => cellContent,
  cellEmpty: () => cellEmpty,
  cellsIn: () => cellsIn,
  cloneTable: () => cloneTable,
  columnsFor: () => columnsFor2,
  deleteCells: () => deleteCells,
  deleteColumns: () => deleteColumns,
  deleteRows: () => deleteRows,
  describe: () => describe,
  distributeColumns: () => distributeColumns,
  distributeRows: () => distributeRows,
  emptyPara: () => emptyPara,
  equalWidths: () => equalWidths,
  formatLike: () => formatLike,
  gridWidth: () => gridWidth,
  guessSeparator: () => guessSeparator,
  insertCells: () => insertCells,
  insertColumns: () => insertColumns,
  insertRows: () => insertRows,
  mapTable: () => mapTable,
  mergeCells: () => mergeCells,
  newTable: () => newTable,
  normRect: () => normRect,
  paraEmpty: () => paraEmpty,
  relink: () => relink,
  setBorders: () => setBorders,
  setCellContent: () => setCellContent,
  setCellProps: () => setCellProps,
  setCellSpacing: () => setCellSpacing,
  setCellWidth: () => setCellWidth,
  setColumnPct: () => setColumnPct,
  setColumnWidth: () => setColumnWidth,
  setLook: () => setLook,
  setPreferredWidth: () => setPreferredWidth,
  setRowHeight: () => setRowHeight,
  setRowProps: () => setRowProps,
  setShading: () => setShading,
  setTableAlign: () => setTableAlign,
  setTableProps: () => setTableProps,
  setTextDirection: () => setTextDirection,
  spanOf: () => spanOf,
  splitCells: () => splitCells,
  splitTable: () => splitTable,
  syncLegacy: () => syncLegacy,
  syncLegacyCell: () => syncLegacyCell,
  tableToText: () => tableToText,
  textToTable: () => textToTable,
  vExtent: () => vExtent,
  vMergeOf: () => vMergeOf,
  wholeRect: () => wholeRect
});
var clone = (v) => v === void 0 ? v : JSON.parse(JSON.stringify(v));
var spanOf = (c) => Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1);
var vMergeOf = (c) => c.tcPr?.vMerge;
function mapTable(t) {
  let nCols = t.gridColsTwips.length;
  const rows = t.rows.map((row, ri) => {
    let col = row.trPr?.gridBefore ?? 0;
    return row.cells.map((cell, ci) => {
      const g = { ri, ci, cell, col, span: spanOf(cell) };
      col += g.span;
      nCols = Math.max(nCols, col);
      return g;
    });
  });
  return { rows, nCols };
}
function cellAt(m, r, c) {
  return m.rows[r]?.find((g) => g.col <= c && c < g.col + g.span);
}
function vExtent(m, r, c) {
  const g = cellAt(m, r, c);
  if (!g) return [r, r];
  let r1 = r;
  if (vMergeOf(g.cell) === "continue") {
    while (r1 > 0) {
      const up = cellAt(m, r1 - 1, g.col);
      if (!up || up.col !== g.col || !vMergeOf(up.cell)) break;
      r1--;
      if (vMergeOf(up.cell) === "restart") break;
    }
  }
  let r2 = r;
  if (vMergeOf(g.cell)) {
    while (r2 + 1 < m.rows.length) {
      const dn = cellAt(m, r2 + 1, g.col);
      if (!dn || dn.col !== g.col || vMergeOf(dn.cell) !== "continue") break;
      r2++;
    }
  }
  return [r1, r2];
}
function normRect(m, rect) {
  let { r1, c1, r2, c2 } = rect;
  r1 = Math.max(0, Math.min(r1, r2));
  r2 = Math.min(m.rows.length - 1, Math.max(rect.r1, r2));
  c1 = Math.max(0, Math.min(c1, c2));
  c2 = Math.max(rect.c1, c2);
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;
    for (let r = r1; r <= r2; r++) {
      for (const g of m.rows[r] ?? []) {
        if (g.col + g.span - 1 < c1 || g.col > c2) continue;
        if (g.col < c1) {
          c1 = g.col;
          changed = true;
        }
        if (g.col + g.span - 1 > c2) {
          c2 = g.col + g.span - 1;
          changed = true;
        }
        const [a, b] = vExtent(m, r, g.col);
        if (a < r1) {
          r1 = a;
          changed = true;
        }
        if (b > r2) {
          r2 = b;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return { r1, c1, r2, c2 };
}
function cellsIn(m, rect) {
  const out = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (const g of m.rows[r] ?? []) if (g.col <= rect.c2 && g.col + g.span - 1 >= rect.c1) out.push(g);
  }
  return out;
}
var wholeRect = (t) => ({ r1: 0, c1: 0, r2: t.rows.length - 1, c2: Math.max(0, mapTable(t).nCols - 1) });
var edgeOf = (b) => b && b.val !== "nil" && b.val !== "none" ? { style: b.val, sizeEighthPt: b.sz ?? 0, ...b.color && b.color !== "auto" ? { color: b.color } : {}, spacePt: b.space ?? 0 } : void 0;
function legacyBorders(b, sides) {
  if (!b) return void 0;
  const out = {};
  let any = false;
  for (const s of sides) {
    const e = edgeOf(b[s]);
    if (e) {
      out[s] = e;
      any = true;
    }
  }
  return any ? out : void 0;
}
function syncLegacyCell(cell) {
  const p = cell.tcPr;
  cell.gridSpan = Math.max(1, p?.gridSpan ?? 1);
  cell.widthTwips = p?.tcW?.type === "dxa" ? p.tcW.w : void 0;
  const fill = p?.shd?.fill;
  cell.shadingHex = fill && fill !== "auto" ? fill : void 0;
  cell.borders = legacyBorders(p?.tcBorders, ["top", "left", "bottom", "right"]);
  if (cell.widthTwips === void 0) delete cell.widthTwips;
  if (cell.shadingHex === void 0) delete cell.shadingHex;
  if (cell.borders === void 0) delete cell.borders;
}
function syncLegacy(t) {
  t.borders = legacyBorders(t.tblPr?.tblBorders, ["top", "left", "bottom", "right", "insideH", "insideV"]);
  if (t.borders === void 0) delete t.borders;
  for (const row of t.rows) for (const cell of row.cells) syncLegacyCell(cell);
}
var emptyPara = () => ({ runs: [], props: {} });
function cellContent(cell) {
  if (cell.blocks?.length) return cell.blocks;
  return [
    ...cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph })),
    ...cell.tables
  ];
}
function setCellContent(cell, blocks) {
  if (!blocks.some((b) => b.type === "paragraph")) blocks = [...blocks, { type: "paragraph", paragraph: emptyPara() }];
  if (blocks[blocks.length - 1].type !== "paragraph") blocks = [...blocks, { type: "paragraph", paragraph: emptyPara() }];
  cell.blocks = blocks;
  cell.paragraphs = blocks.filter((b) => b.type === "paragraph").map((b) => b.paragraph);
  cell.tables = blocks.filter((b) => b.type === "table");
}
var runHasContent = (r) => r.text.length > 0 || !!(r.image || r.textbox || r.shape || r.group || r.noteRef || r.field || r.custom || r.math);
var paraEmpty = (p) => !p.runs.some(runHasContent);
var cellEmpty = (cell) => cellContent(cell).every((b) => b.type === "paragraph" && paraEmpty(b.paragraph));
function formatLike(p) {
  if (!p) return emptyPara();
  const props = clone(p.props);
  const fmt = props.src ?? props.fmtSrc;
  delete props.src;
  delete props.tocEntry;
  delete props.tocInstr;
  delete props.sectionBreak;
  if (fmt !== void 0) props.fmtSrc = fmt;
  else delete props.fmtSrc;
  const out = { runs: [], props };
  if (p.ppr) out.ppr = clone(p.ppr);
  return out;
}
var lastPara = (cell) => cell.paragraphs[cell.paragraphs.length - 1];
function cellLike(src, keepTcPr, widthTw) {
  const tcPr = keepTcPr && src?.tcPr ? clone(src.tcPr) : {};
  delete tcPr.vMerge;
  delete tcPr.hMerge;
  delete tcPr.cnfStyle;
  delete tcPr.gridSpan;
  tcPr.tcW = src?.tcPr?.tcW && src.tcPr.tcW.type !== "dxa" && keepTcPr ? clone(src.tcPr.tcW) : { w: widthTw, type: "dxa" };
  const paragraph = formatLike(src ? lastPara(src) : void 0);
  const cell = { paragraphs: [paragraph], tables: [], gridSpan: 1, tcPr, blocks: [{ type: "paragraph", paragraph }] };
  syncLegacyCell(cell);
  return cell;
}
var sum = (a) => a.reduce((x2, y) => x2 + y, 0);
function gridWidth(t, c, span) {
  let w = 0;
  for (let i2 = c; i2 < c + span; i2++) w += t.gridColsTwips[i2] ?? 0;
  return w;
}
function currentWidths(t) {
  const m = mapTable(t);
  return t.rows.map((row, ri) => {
    const before = row.trPr?.gridBefore ? gridWidth(t, 0, row.trPr.gridBefore) : 0;
    const cells = m.rows[ri].map((g) => ({ cell: g.cell, w: dxaW(g.cell) || gridWidth(t, g.col, g.span) || 0 }));
    const end = (m.rows[ri].at(-1)?.col ?? 0) + (m.rows[ri].at(-1)?.span ?? 0);
    const after = row.trPr?.gridAfter ? gridWidth(t, end, row.trPr.gridAfter) : 0;
    return { before, cells, after };
  });
}
var dxaW = (c) => c.tcPr?.tcW?.type === "dxa" ? c.tcPr.tcW.w : c.widthTwips;
function rebuildGrid(t, rows, tol = 3) {
  const edges = [0];
  for (const r of rows) {
    let x2 = r.before;
    if (r.before > 0) edges.push(x2);
    for (const c of r.cells) {
      x2 += c.w;
      edges.push(x2);
    }
    if (r.after > 0) edges.push(x2 + r.after);
  }
  edges.sort((a, b) => a - b);
  const uniq = [0];
  let first = 0;
  for (const e of edges) {
    if (e - first > tol) {
      uniq.push(e);
      first = e;
    } else if (uniq.length > 1) uniq[uniq.length - 1] = e;
  }
  const snap = (x2) => {
    let best = 0;
    for (let i2 = 0; i2 < uniq.length; i2++) if (Math.abs(uniq[i2] - x2) < Math.abs(uniq[best] - x2)) best = i2;
    return best;
  };
  t.gridColsTwips = uniq.slice(1).map((e, i2) => e - uniq[i2]);
  rows.forEach((r, ri) => {
    const row = t.rows[ri];
    let x2 = r.before;
    const b = snap(x2);
    if (b > 0) {
      row.trPr = { ...row.trPr ?? {}, gridBefore: b, wBefore: { w: r.before, type: "dxa" } };
    } else if (row.trPr) {
      delete row.trPr.gridBefore;
      delete row.trPr.wBefore;
    }
    let ci = b;
    for (const c of r.cells) {
      x2 += c.w;
      const e = Math.max(ci + 1, snap(x2));
      const span = e - ci;
      const tcPr = c.cell.tcPr ??= {};
      if (span > 1) tcPr.gridSpan = span;
      else delete tcPr.gridSpan;
      if (!tcPr.tcW || tcPr.tcW.type === "dxa" || tcPr.tcW.type === "nil") tcPr.tcW = { w: Math.round(c.w), type: "dxa" };
      syncLegacyCell(c.cell);
      ci = e;
    }
    const total = uniq.length - 1;
    if (r.after > 0 && ci < total) {
      row.trPr = { ...row.trPr ?? {}, gridAfter: total - ci, wAfter: { w: r.after, type: "dxa" } };
    } else if (row.trPr) {
      delete row.trPr.gridAfter;
      delete row.trPr.wAfter;
    }
    if (row.trPr && !Object.keys(row.trPr).length) delete row.trPr;
  });
}
function widenTblW(t, rows) {
  const w = Math.max(...rows.map((r) => r.before + sum(r.cells.map((c) => c.w)) + r.after));
  const tw2 = t.tblPr?.tblW;
  if (tw2?.type === "pct") return;
  (t.tblPr ??= {}).tblW = { w: Math.round(w), type: "dxa" };
}
var DEFAULT_LOOK = { firstRow: true, lastRow: false, firstColumn: true, lastColumn: false, noHBand: false, noVBand: true };
function equalWidths(total, n) {
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, i2) => base + (i2 >= n - rem ? 1 : 0));
}
function newTable(rows, cols, o) {
  rows = Math.max(1, Math.floor(rows));
  cols = Math.max(1, Math.floor(cols));
  const widths = o.colTwips ? Array(cols).fill(Math.round(o.colTwips)) : equalWidths(Math.max(cols, Math.round(o.availTwips) - 10), cols);
  const pref = o.colTwips ? widths : equalWidths(Math.max(cols, Math.round(o.prefTwips ?? o.availTwips + (o.indTwips ?? 0)) - 10), cols);
  const total = sum(pref);
  const pct2 = pref.map((w) => Math.round(w / total * 5e3));
  const tblPr = {};
  if (o.styleId !== null) tblPr.tblStyle = o.styleId ?? "Tabelacomgrade";
  tblPr.tblW = o.autofit === "window" ? { w: 5e3, type: "pct" } : { w: 0, type: "auto" };
  if (o.indTwips) tblPr.tblInd = { w: Math.round(o.indTwips), type: "dxa" };
  tblPr.tblLook = { ...DEFAULT_LOOK };
  const mk = () => ({
    cells: widths.map((w, i2) => {
      const paragraph = o.para?.() ?? emptyPara();
      const tcW = o.autofit === "content" ? { w: 0, type: "auto" } : o.autofit === "window" ? { w: pct2[i2], type: "pct" } : { w: pref[i2] ?? w, type: "dxa" };
      const cell = { paragraphs: [paragraph], tables: [], gridSpan: 1, tcPr: { tcW }, blocks: [{ type: "paragraph", paragraph }] };
      syncLegacyCell(cell);
      return cell;
    })
  });
  const t = { type: "table", rows: Array.from({ length: rows }, mk), gridColsTwips: widths, tblPr };
  syncLegacy(t);
  return t;
}
function rowLike(src) {
  const row = { cells: src.cells.map((c) => cellLike(c, true, dxaW(c) ?? 0)) };
  src.cells.forEach((c, i2) => {
    const n = row.cells[i2];
    if (c.tcPr?.gridSpan) n.tcPr.gridSpan = c.tcPr.gridSpan;
    if (c.tcPr?.tcW) n.tcPr.tcW = clone(c.tcPr.tcW);
    if (c.tcPr?.vMerge) n.tcPr.vMerge = c.tcPr.vMerge;
    syncLegacyCell(n);
  });
  if (src.trPr) row.trPr = clone(src.trPr);
  if (src.tblPrEx) row.tblPrEx = clone(src.tblPrEx);
  return row;
}
function insertRows(t, rect, where, count = rect.r2 - rect.r1 + 1) {
  const ref = where === "above" ? rect.r1 : rect.r2;
  const at = where === "above" ? rect.r1 : rect.r2 + 1;
  const src = t.rows[ref];
  const news = Array.from({ length: count }, () => rowLike(src));
  t.rows.splice(at, 0, ...news);
  const m = mapTable(t);
  for (let r = at; r < at + count; r++) {
    for (const g of m.rows[r]) {
      if (!g.cell.tcPr?.vMerge) continue;
      const up = r > 0 ? cellAt(m, r - 1, g.col) : void 0;
      const dn = cellAt(m, at + count, g.col);
      const inside = up && up.col === g.col && vMergeOf(up.cell) && dn && dn.col === g.col && vMergeOf(dn.cell) === "continue";
      if (inside) g.cell.tcPr.vMerge = "continue";
      else delete g.cell.tcPr.vMerge;
    }
  }
  return { r1: at, c1: 0, r2: at + count - 1, c2: Math.max(0, m.nCols - 1) };
}
function deleteRows(t, r1, r2) {
  const m = mapTable(t);
  if (r2 + 1 < t.rows.length) {
    for (const g of m.rows[r2 + 1]) {
      if (vMergeOf(g.cell) !== "continue") continue;
      const [a] = vExtent(m, r2 + 1, g.col);
      if (a >= r1) g.cell.tcPr.vMerge = "restart";
    }
  }
  t.rows.splice(r1, r2 - r1 + 1);
  return t.rows.length > 0;
}
function insertColumns(t, rect, where, count = rect.c2 - rect.c1 + 1) {
  const m = mapTable(t);
  const widths = currentWidths(t);
  const created = /* @__PURE__ */ new Set();
  t.rows.forEach((row, ri) => {
    const cells = m.rows[ri];
    if (!cells.length) return;
    let idx;
    if (where === "left") {
      const g = cells.find((x2) => x2.col + x2.span - 1 >= rect.c1) ?? cells[cells.length - 1];
      idx = g.ci;
    } else {
      const g = [...cells].reverse().find((x2) => x2.col <= rect.c2) ?? cells[0];
      idx = g.ci + 1;
    }
    const right = row.cells[idx];
    const left = row.cells[idx - 1];
    const model = right ?? left;
    const edge = !right || !left;
    const w = widths[ri].cells.find((c) => c.cell === model)?.w ?? 0;
    const news = Array.from({ length: count }, () => cellLike(model, edge, w));
    news.forEach((c) => created.add(c));
    row.cells.splice(idx, 0, ...news);
    widths[ri].cells.splice(idx, 0, ...news.map((cell) => ({ cell, w })));
  });
  rebuildGrid(t, widths);
  widenTblW(t, widths);
  return rectOf(t, created);
}
function rectOf(t, cells) {
  let r1 = Infinity, r2 = -1, c1 = Infinity, c2 = -1;
  for (const gs of mapTable(t).rows) for (const g of gs) {
    if (!cells.has(g.cell)) continue;
    r1 = Math.min(r1, g.ri);
    r2 = Math.max(r2, g.ri);
    c1 = Math.min(c1, g.col);
    c2 = Math.max(c2, g.col + g.span - 1);
  }
  return r2 < 0 ? { r1: 0, c1: 0, r2: 0, c2: 0 } : { r1, c1, r2, c2 };
}
function deleteColumns(t, c1, c2) {
  const m = mapTable(t);
  const widths = currentWidths(t);
  t.rows.forEach((row, ri) => {
    const keep = [];
    for (const g of m.rows[ri]) {
      const a = g.col, b = g.col + g.span - 1;
      const w = widths[ri].cells.find((c) => c.cell === g.cell).w;
      if (a >= c1 && b <= c2) continue;
      const overlap = Math.max(0, Math.min(b, c2) - Math.max(a, c1) + 1);
      keep.push({ cell: g.cell, w: overlap ? w - gridWidth(t, Math.max(a, c1), overlap) : w });
    }
    row.cells = keep.map((k) => k.cell);
    widths[ri].cells = keep;
  });
  for (let ri = t.rows.length - 1; ri >= 0; ri--) {
    if (!t.rows[ri].cells.length) {
      t.rows.splice(ri, 1);
      widths.splice(ri, 1);
    }
  }
  if (!t.rows.length) return false;
  rebuildGrid(t, widths);
  if (t.tblPr?.tblW?.type === "dxa") widenTblW(t, widths);
  return true;
}
function deleteCells(t, rect, shift) {
  const m = mapTable(t);
  if (shift === "left") {
    const widths = currentWidths(t);
    for (let r = rect.r1; r <= rect.r2; r++) {
      const gone = m.rows[r].filter((g) => g.col >= rect.c1 && g.col + g.span - 1 <= rect.c2);
      const goneW = sum(gone.map((g) => widths[r].cells.find((c) => c.cell === g.cell).w));
      t.rows[r].cells = t.rows[r].cells.filter((c) => !gone.some((g) => g.cell === c));
      widths[r].cells = widths[r].cells.filter((c) => !gone.some((g) => g.cell === c.cell));
      widths[r].after += goneW;
    }
    rebuildGrid(t, widths);
    return;
  }
  const h = rect.r2 - rect.r1 + 1;
  for (let c = rect.c1; c <= rect.c2; c++) {
    const col = [];
    for (let r = rect.r1; r < t.rows.length; r++) {
      const g = cellAt(m, r, c);
      if (g && g.col === c) col.push(g.cell);
    }
    for (let i2 = 0; i2 < col.length; i2++) {
      const from = col[i2 + h];
      setCellContent(col[i2], from ? cellContent(from) : [{ type: "paragraph", paragraph: formatLike(lastPara(col[i2])) }]);
    }
  }
}
function insertCells(t, rect, shift) {
  const m = mapTable(t);
  if (shift === "right") {
    const widths = currentWidths(t);
    let addW = 0;
    for (let r = rect.r1; r <= rect.r2; r++) {
      const gs = m.rows[r].filter((g) => g.col >= rect.c1 && g.col + g.span - 1 <= rect.c2);
      if (!gs.length) continue;
      const idx = gs[0].ci;
      const news = gs.map((g) => {
        const w = widths[r].cells.find((c) => c.cell === g.cell).w;
        return { cell: cellLike(g.cell, false, w), w };
      });
      addW = Math.max(addW, sum(news.map((n) => n.w)));
      t.rows[r].cells.splice(idx, 0, ...news.map((n) => n.cell));
      widths[r].cells.splice(idx, 0, ...news);
    }
    for (let r = 0; r < t.rows.length; r++) if (r < rect.r1 || r > rect.r2) widths[r].after += addW;
    rebuildGrid(t, widths);
    widenTblW(t, widths);
    return rect;
  }
  const h = rect.r2 - rect.r1 + 1;
  const last = t.rows[t.rows.length - 1];
  for (let i2 = 0; i2 < h; i2++) t.rows.push(rowLike(last));
  const m2 = mapTable(t);
  for (let c = rect.c1; c <= rect.c2; c++) {
    const col = [];
    for (let r = rect.r1; r < t.rows.length; r++) {
      const g = cellAt(m2, r, c);
      if (g && g.col === c) col.push(g.cell);
    }
    for (let i2 = col.length - 1; i2 >= 0; i2--) {
      const from = col[i2 - h];
      setCellContent(col[i2], from ? cellContent(from) : [{ type: "paragraph", paragraph: formatLike(lastPara(col[i2])) }]);
    }
  }
  return rect;
}
function canMerge(t, rect) {
  const m = mapTable(t);
  const r = normRect(m, rect);
  return cellsIn(m, r).filter((g) => vMergeOf(g.cell) !== "continue").length > 1;
}
function mergeCells(t, rect, o = {}) {
  const m = mapTable(t);
  const rr = normRect(m, rect);
  const widths = currentWidths(t);
  const span = rr.c2 - rr.c1 + 1;
  const top = cellAt(m, rr.r1, rr.c1);
  const W3 = sum(widths[rr.r1].cells.filter((c) => m.rows[rr.r1].some((g) => g.cell === c.cell && g.col >= rr.c1 && g.col + g.span - 1 <= rr.c2)).map((c) => c.w)) || gridWidth(t, rr.c1, span);
  const moved = [];
  const own2 = cellEmpty(top.cell) ? [] : cellContent(top.cell);
  let lastMoved;
  for (let r = rr.r1; r <= rr.r2; r++) {
    for (const g of m.rows[r]) {
      if (g.col < rr.c1 || g.col > rr.c2 || g.cell === top.cell || vMergeOf(g.cell) === "continue") continue;
      if (cellEmpty(g.cell)) continue;
      const bl = cellContent(g.cell);
      moved.push(...bl);
      if (r > rr.r1) {
        const lp = [...bl].reverse().find((b) => b.type === "paragraph");
        if (lp?.type === "paragraph") lastMoved = lp.paragraph;
      } else lastMoved = void 0;
    }
  }
  const contPara = /* @__PURE__ */ new Map();
  for (let r = rr.r1 + 1; r <= rr.r2; r++) {
    const g = m.rows[r].find((x2) => x2.col >= rr.c1 && x2.col + x2.span - 1 <= rr.c2);
    if (g) contPara.set(r, formatLike(lastPara(g.cell)));
  }
  const content = [...own2, ...moved];
  setCellContent(top.cell, content.length ? content : [{ type: "paragraph", paragraph: formatLike(lastPara(top.cell)) }]);
  const normal = o.normalSpacing;
  if (normal && rr.r2 > rr.r1 && lastMoved) applySpacing(lastMoved, normal);
  for (let r = rr.r1; r <= rr.r2; r++) {
    const row = t.rows[r];
    const gs = m.rows[r].filter((g) => g.col >= rr.c1 && g.col + g.span - 1 <= rr.c2);
    if (!gs.length) continue;
    const keep = r === rr.r1 ? top.cell : gs[0].cell;
    const tcPr = keep.tcPr ??= {};
    if (span > 1) tcPr.gridSpan = span;
    else delete tcPr.gridSpan;
    tcPr.tcW = { w: W3, type: tcPr.tcW?.type === "pct" ? "dxa" : "dxa" };
    if (rr.r2 > rr.r1) tcPr.vMerge = r === rr.r1 ? "restart" : "continue";
    if (r > rr.r1) {
      const p = contPara.get(r) ?? formatLike(lastPara(keep));
      if (normal && r < rr.r2) applySpacing(p, normal);
      setCellContent(keep, [{ type: "paragraph", paragraph: p }]);
    }
    row.cells = row.cells.filter((c) => c === keep || !gs.some((g) => g.cell === c));
    const wr = widths[r];
    const at = wr.cells.findIndex((c) => gs.some((g) => g.cell === c.cell));
    wr.cells = wr.cells.filter((c) => !gs.some((g) => g.cell === c.cell));
    wr.cells.splice(at, 0, { cell: keep, w: W3 });
    syncLegacyCell(keep);
  }
  rebuildGrid(t, widths);
  return { r1: rr.r1, c1: rr.c1, r2: rr.r2, c2: rr.c2 };
}
function applySpacing(p, s) {
  if (s.after !== void 0) p.props.spaceAfterTwips = s.after;
  if (s.line !== void 0) p.props.lineTwentieths = s.line;
}
function distribute(blocks, n) {
  const out = Array.from({ length: n }, () => []);
  if (blocks.length <= n) blocks.forEach((b, i2) => out[i2].push(b));
  else {
    const extra = blocks.length - n + 1;
    out[0].push(...blocks.slice(0, extra));
    blocks.slice(extra).forEach((b, i2) => out[i2 + 1].push(b));
  }
  return out;
}
function splitCells(t, rect, cols, rows, o = {}) {
  cols = Math.max(1, Math.floor(cols));
  rows = Math.max(1, Math.floor(rows));
  let rr = normRect(mapTable(t), rect);
  if ((o.mergeFirst ?? true) && canMerge(t, rr)) rr = mergeCells(t, rr, { normalSpacing: o.normalSpacing });
  const m = mapTable(t);
  const widths = currentWidths(t);
  const created = [];
  for (let r = rr.r2; r >= rr.r1; r--) {
    const gs = m.rows[r].filter((g) => g.col >= rr.c1 && g.col + g.span - 1 <= rr.c2 && vMergeOf(g.cell) !== "continue");
    if (!gs.length) continue;
    const row = t.rows[r];
    const wr = widths[r];
    const pieces = /* @__PURE__ */ new Map();
    for (const g of gs) {
      const W3 = wr.cells.find((c) => c.cell === g.cell).w;
      const ws = equalWidths(W3, cols);
      const parts = distribute(cellContent(g.cell), cols);
      const cells = ws.map((w, i2) => {
        const c = i2 === 0 ? g.cell : cellLike(g.cell, true, w);
        const tcPr = c.tcPr ??= {};
        delete tcPr.gridSpan;
        delete tcPr.vMerge;
        tcPr.tcW = { w, type: "dxa" };
        if (i2 === 0 || parts[i2].length) setCellContent(c, parts[i2].length ? parts[i2] : [{ type: "paragraph", paragraph: formatLike(lastPara(g.cell)) }]);
        syncLegacyCell(c);
        return c;
      });
      pieces.set(g.cell, cells);
      created.push(...cells);
      const at = row.cells.indexOf(g.cell);
      row.cells.splice(at, 1, ...cells);
      const wi = wr.cells.findIndex((c) => c.cell === g.cell);
      wr.cells.splice(wi, 1, ...cells.map((cell, i2) => ({ cell, w: ws[i2] })));
    }
    if (rows > 1) {
      for (const c of row.cells) {
        if (created.includes(c)) continue;
        const tcPr = c.tcPr ??= {};
        if (!tcPr.vMerge) tcPr.vMerge = "restart";
      }
      const h = o.rowHeights?.[r - rr.r1];
      const each = h ? Math.floor(h / rows) : void 0;
      if (each) row.trPr = { ...row.trPr ?? {}, trHeight: { val: each, hRule: "atLeast" } };
      const extra = [];
      const extraW = [];
      for (let k = 1; k < rows; k++) {
        const nr = { cells: [] };
        const nw = { before: wr.before, cells: [], after: wr.after };
        for (const c of row.cells) {
          const w = wr.cells.find((x2) => x2.cell === c).w;
          let n;
          if (created.includes(c)) {
            n = cellLike(c, true, w);
            created.push(n);
          } else {
            n = cellLike(c, true, w);
            n.tcPr.vMerge = "continue";
            if (c.tcPr?.gridSpan) n.tcPr.gridSpan = c.tcPr.gridSpan;
            syncLegacyCell(n);
          }
          nr.cells.push(n);
          nw.cells.push({ cell: n, w });
        }
        if (row.trPr) nr.trPr = clone(row.trPr);
        if (row.tblPrEx) nr.tblPrEx = clone(row.tblPrEx);
        extra.push(nr);
        extraW.push(nw);
      }
      t.rows.splice(r + 1, 0, ...extra);
      widths.splice(r + 1, 0, ...extraW);
    }
  }
  rebuildGrid(t, widths);
  return created.length ? rectOf(t, new Set(created)) : rr;
}
function splitTable(t, r) {
  if (r <= 0 || r >= t.rows.length) return null;
  const rows = t.rows.splice(r);
  const t2 = { type: "table", rows, gridColsTwips: [...t.gridColsTwips] };
  if (t.tblPr) t2.tblPr = clone(t.tblPr);
  if (t.borders) t2.borders = clone(t.borders);
  const m = mapTable(t2);
  for (const g of m.rows[0] ?? []) if (vMergeOf(g.cell) === "continue") g.cell.tcPr.vMerge = "restart";
  const m1 = mapTable(t);
  for (const g of m1.rows[m1.rows.length - 1] ?? []) {
    if (vMergeOf(g.cell) === "restart") delete g.cell.tcPr.vMerge;
  }
  return t2;
}
function setRowHeight(t, r1, r2, twips, rule = "atLeast") {
  for (let r = r1; r <= r2; r++) {
    const row = t.rows[r];
    if (twips > 0) row.trPr = { ...row.trPr ?? {}, trHeight: { val: Math.round(twips), hRule: rule } };
    else if (row.trPr) {
      delete row.trPr.trHeight;
      if (!Object.keys(row.trPr).length) delete row.trPr;
    }
  }
}
function distributeRows(t, r1, r2, heights) {
  const n = r2 - r1 + 1;
  const avg = Math.round(sum(heights.slice(0, n)) / n);
  setRowHeight(t, r1, r2, avg, "atLeast");
}
function setColumnWidth(t, c1, c2, twips) {
  const m = mapTable(t);
  const widths = currentWidths(t);
  const old = t.gridColsTwips.slice();
  const nw = old.map((w, i2) => i2 >= c1 && i2 <= c2 ? Math.round(twips) : w);
  t.rows.forEach((_, ri) => {
    for (const g of m.rows[ri]) {
      const c = widths[ri].cells.find((x2) => x2.cell === g.cell);
      let w = 0;
      for (let i2 = g.col; i2 < g.col + g.span; i2++) w += nw[i2] ?? 0;
      c.w = w;
    }
  });
  rebuildGrid(t, widths);
  if (t.tblPr?.tblW?.type === "dxa") widenTblW(t, widths);
}
function setCellWidth(t, rect, twips) {
  const m = mapTable(t);
  const r = normRect(m, rect);
  const widths = currentWidths(t);
  for (const g of cellsIn(m, r)) {
    const c = widths[g.ri].cells.find((x2) => x2.cell === g.cell);
    if (c) c.w = Math.round(twips);
  }
  rebuildGrid(t, widths);
  if (t.tblPr?.tblW?.type === "dxa") widenTblW(t, widths);
}
function setPreferredWidth(t, w, availTwips) {
  if (!w || w.type === "auto" || w.type === "nil" || !(w.w > 0)) {
    setTableProps(t, { tblW: { w: 0, type: "auto" } });
    return;
  }
  setTableProps(t, { tblW: { w: Math.round(w.w), type: w.type } });
  const total = sum(t.gridColsTwips) || 1;
  const target = w.type === "pct" ? (availTwips - 10) * w.w / 5e3 : w.w;
  t.gridColsTwips = t.gridColsTwips.map((x2) => Math.round(x2 / total * target));
}
function setColumnPct(t, c1, c2, pct50) {
  const m = mapTable(t);
  for (const g of cellsIn(m, { r1: 0, c1, r2: t.rows.length - 1, c2 })) {
    (g.cell.tcPr ??= {}).tcW = { w: Math.round(pct50), type: "pct" };
    syncLegacyCell(g.cell);
  }
  const total = sum(t.gridColsTwips) || 1;
  for (let c = c1; c <= c2 && c < t.gridColsTwips.length; c++) t.gridColsTwips[c] = Math.round(total * pct50 / 5e3 / (c2 - c1 + 1));
}
function distributeColumns(t, c1, c2) {
  const n = c2 - c1 + 1;
  const avg = Math.round(gridWidth(t, c1, n) / n);
  setColumnWidth(t, c1, c2, avg);
}
function autoFit(t, mode, availTwips) {
  const tblPr = t.tblPr ??= {};
  const m = mapTable(t);
  const total = sum(t.gridColsTwips) || 1;
  if (mode === "content") {
    delete tblPr.tblLayout;
    tblPr.tblW = { w: 0, type: "auto" };
    for (const row of t.rows) for (const c of row.cells) {
      (c.tcPr ??= {}).tcW = { w: 0, type: "auto" };
      syncLegacyCell(c);
    }
    return;
  }
  if (mode === "window") {
    delete tblPr.tblLayout;
    tblPr.tblW = { w: 5e3, type: "pct" };
    for (const gs of m.rows) for (const g of gs) {
      (g.cell.tcPr ??= {}).tcW = { w: Math.round(gridWidth(t, g.col, g.span) / total * 5e3), type: "pct" };
      syncLegacyCell(g.cell);
    }
    if (availTwips) {
      const W3 = Math.max(1, availTwips - 10);
      t.gridColsTwips = t.gridColsTwips.map((w) => Math.round(w / total * W3));
    }
    return;
  }
  tblPr.tblLayout = "fixed";
  for (const gs of m.rows) for (const g of gs) {
    (g.cell.tcPr ??= {}).tcW = { w: gridWidth(t, g.col, g.span), type: "dxa" };
    syncLegacyCell(g.cell);
  }
}
function setCellProps(t, rect, patch2) {
  const m = mapTable(t);
  for (const g of cellsIn(m, normRect(m, rect))) {
    const tcPr = g.cell.tcPr ??= {};
    for (const [k, v] of Object.entries(patch2)) {
      if (v === void 0) delete tcPr[k];
      else tcPr[k] = clone(v);
    }
    syncLegacyCell(g.cell);
  }
}
function setRowProps(t, r1, r2, patch2) {
  for (let r = r1; r <= r2; r++) {
    const row = t.rows[r];
    const trPr = row.trPr ??= {};
    for (const [k, v] of Object.entries(patch2)) {
      if (v === void 0) delete trPr[k];
      else trPr[k] = clone(v);
    }
    if (!Object.keys(trPr).length) delete row.trPr;
  }
}
function setTableProps(t, patch2) {
  const tblPr = t.tblPr ??= {};
  for (const [k, v] of Object.entries(patch2)) {
    if (v === void 0) delete tblPr[k];
    else tblPr[k] = clone(v);
  }
  syncLegacy(t);
}
function setTableAlign(t, jc) {
  setTableProps(t, { jc: jc === "left" ? void 0 : jc });
  setRowProps(t, 0, t.rows.length - 1, { jc: jc === "left" ? void 0 : jc });
}
function setCellSpacing(t, twips) {
  const v = twips && twips > 0 ? { w: Math.round(twips / 2), type: "dxa" } : void 0;
  setTableProps(t, { tblCellSpacing: v });
  setRowProps(t, 0, t.rows.length - 1, { tblCellSpacing: v });
}
function setTextDirection(t, rect, dir) {
  setCellProps(t, rect, { textDirection: dir && dir !== "lrTb" ? dir : void 0 });
  if (!dir || dir === "lrTb" || dir === "lrTbV") return;
  const rr = normRect(mapTable(t), rect);
  for (let r = rr.r1; r <= rr.r2; r++) {
    const row = t.rows[r];
    const trPr = row.trPr ??= {};
    trPr.cantSplit = true;
    if (!trPr.trHeight || trPr.trHeight.hRule !== "exact" && trPr.trHeight.val < 1134) trPr.trHeight = { val: 1134, hRule: "atLeast" };
  }
}
var NO_BORDER = { val: "nil" };
function setBorders(t, rect, kind, spec, o = {}) {
  const m = mapTable(t);
  const rr = normRect(m, rect);
  const sides = sidesOf(kind);
  const on = (s) => kind === "none" || sides.includes(s);
  if (o.wholeTable) {
    const tb = { ...t.tblPr?.tblBorders ?? {} };
    const want = kind === "none" ? { val: "none", sz: 0, space: 0, color: "auto" } : spec ?? { val: "none", sz: 0, space: 0, color: "auto" };
    for (const s of ["top", "left", "bottom", "right", "insideH", "insideV"]) {
      if (!on(s)) continue;
      const st = o.styleBorders?.[s];
      const same2 = st && st.val === want.val && (st.sz ?? 0) === (want.sz ?? 0) && (st.color ?? "auto") === (want.color ?? "auto");
      const styleNone = !st || st.val === "none" || st.val === "nil";
      if (same2 || styleNone && (want.val === "none" || want.val === "nil")) delete tb[s];
      else tb[s] = clone(want);
    }
    setTableProps(t, { tblBorders: Object.keys(tb).length ? tb : void 0 });
    for (const gs of m.rows) for (const g of gs) {
      const cb = g.cell.tcPr?.tcBorders;
      if (!cb) continue;
      for (const s of ["top", "left", "bottom", "right"]) if (on(s) || on("inside" + (s === "top" || s === "bottom" ? "H" : "V"))) delete cb[s];
      if (!Object.keys(cb).length) delete g.cell.tcPr.tcBorders;
      syncLegacyCell(g.cell);
    }
    return;
  }
  const val3 = kind === "none" || !spec ? NO_BORDER : spec;
  const setSide = (cell, s, b) => {
    const tcPr = cell.tcPr ??= {};
    (tcPr.tcBorders ??= {})[s] = clone(b);
    syncLegacyCell(cell);
  };
  for (const g of cellsIn(m, rr)) {
    const top = g.ri === rr.r1, bottom = g.ri === rr.r2 || vExtent(m, g.ri, g.col)[1] >= rr.r2;
    const left = g.col === rr.c1, right = g.col + g.span - 1 === rr.c2;
    const want = [
      ["top", top ? on("top") : on("insideH")],
      ["bottom", bottom ? on("bottom") : on("insideH")],
      ["left", left ? on("left") : on("insideV")],
      ["right", right ? on("right") : on("insideV")],
      ["tl2br", on("tl2br")],
      ["tr2bl", on("tr2bl")]
    ];
    for (const [s, yes] of want) {
      if (!yes) continue;
      if ((s === "tl2br" || s === "tr2bl") && kind === "none") {
        setSide(g.cell, s, NO_BORDER);
        continue;
      }
      if ((s === "tl2br" || s === "tr2bl") && !sides.includes(s)) continue;
      setSide(g.cell, s, val3);
      const nb = s === "top" ? cellAt(m, g.ri - 1, g.col) : s === "bottom" ? cellAt(m, vExtent(m, g.ri, g.col)[1] + 1, g.col) : s === "left" ? cellAt(m, g.ri, g.col - 1) : s === "right" ? cellAt(m, g.ri, g.col + g.span) : void 0;
      const opp = { top: "bottom", bottom: "top", left: "right", right: "left" }[s];
      if (nb && opp && !cellsIn(m, rr).includes(nb)) setSide(nb.cell, opp, val3);
    }
  }
}
function sidesOf(kind) {
  switch (kind) {
    case "all":
      return ["top", "left", "bottom", "right", "insideH", "insideV"];
    case "outside":
      return ["top", "left", "bottom", "right"];
    case "inside":
      return ["insideH", "insideV"];
    case "none":
      return ["top", "left", "bottom", "right", "insideH", "insideV"];
    default:
      return [kind];
  }
}
function setShading(t, rect, shd, wholeTable = false) {
  setCellProps(t, rect, { shd: shd ?? void 0 });
  if (wholeTable) setTableProps(t, { shd: shd ?? void 0 });
}
function setLook(t, patch2) {
  const look = { ...DEFAULT_LOOK, ...t.tblPr?.tblLook ?? {}, ...patch2 };
  setTableProps(t, { tblLook: look });
}
var sepChar = (s) => s === "tab" ? "	" : s === "semicolon" ? ";" : s === "comma" ? "," : s === "paragraph" ? null : s.char;
function splitRuns(p, ch) {
  const out = [[]];
  for (const r of p.runs) {
    if (r.image || r.textbox || r.shape || r.group || r.field || r.custom || r.math || r.noteRef || !r.text.includes(ch)) {
      out[out.length - 1].push(r);
      continue;
    }
    const parts = r.text.split(ch);
    parts.forEach((txt, i2) => {
      if (i2 > 0) out.push([]);
      if (txt) out[out.length - 1].push({ ...r, text: txt, props: { ...r.props } });
    });
  }
  return out;
}
function guessSeparator(paras) {
  const txt = paras.map((p) => p.runs.map((r) => r.text).join(""));
  if (txt.some((s) => s.includes("	"))) return "tab";
  if (txt.some((s) => s.includes(";"))) return "semicolon";
  return "paragraph";
}
function columnsFor2(paras, sep) {
  const ch = sepChar(sep);
  if (ch === null) return 1;
  return Math.max(1, ...paras.map((p) => p.runs.map((r) => r.text).join("").split(ch).length));
}
function textToTable(paras, sep, o) {
  const ch = sepChar(sep);
  let rowsContent;
  if (ch === null) {
    const cols2 = Math.max(1, o.cols ?? 1);
    rowsContent = [];
    for (let i2 = 0; i2 < paras.length; i2 += cols2) rowsContent.push(paras.slice(i2, i2 + cols2));
  } else {
    rowsContent = paras.map((p) => splitRuns(p, ch).map((runs) => ({ runs, props: cleanProps(p), ...p.ppr ? { ppr: clone(p.ppr) } : {} })));
  }
  const cols = Math.max(o.cols ?? 1, ...rowsContent.map((r) => r.length));
  const t = newTable(rowsContent.length, cols, o);
  rowsContent.forEach((cells, ri) => {
    cells.forEach((p, ci) => {
      const cell = t.rows[ri].cells[ci];
      setCellContent(cell, [{ type: "paragraph", paragraph: p }]);
    });
  });
  return t;
}
var cleanProps = (p) => {
  const props = { ...p.props };
  delete props.src;
  delete props.sectionBreak;
  return props;
};
function tableToText(t, sep) {
  const ch = sepChar(sep);
  const out = [];
  const m = mapTable(t);
  const flat = (cell) => cellContent(cell).flatMap((b) => b.type === "paragraph" ? [b.paragraph] : tableToText(b, sep));
  t.rows.forEach((_, ri) => {
    const cells = m.rows[ri].filter((g) => vMergeOf(g.cell) !== "continue");
    if (ch === null) {
      for (const g of cells) for (const p2 of flat(g.cell)) out.push({ ...p2, props: { ...p2.props } });
      return;
    }
    const first = flat(cells[0]?.cell ?? { paragraphs: [emptyPara()], tables: [], gridSpan: 1 })[0] ?? emptyPara();
    const runs = [];
    cells.forEach((g, i2) => {
      const ps = flat(g.cell);
      ps.forEach((p2, k) => {
        if (k > 0) runs.push({ text: " ", props: { ...p2.runs[0]?.props ?? {} } });
        runs.push(...p2.runs.map((r) => ({ ...r, props: { ...r.props } })));
      });
      if (i2 < cells.length - 1) runs.push({ text: ch, props: { ...ps.at(-1)?.runs.at(-1)?.props ?? first.runs[0]?.props ?? {} } });
    });
    const props = { ...first.props };
    if (ch === "	") {
      let x2 = 0;
      const stops = [];
      for (const g of cells.slice(0, -1)) {
        x2 += gridWidth(t, g.col, g.span);
        stops.push({ posTwips: x2 + 113, align: "left" });
      }
      props.tabStops = stops;
      props.indentLeftTwips = 113;
    }
    const p = { runs: runs.filter((r) => r.text !== "" || runHasContent(r)), props };
    if (first.ppr) p.ppr = clone(first.ppr);
    normalizeParagraph(p);
    out.push(p);
  });
  return out;
}
function relink(t) {
  for (const row of t.rows) {
    for (const cell of row.cells) {
      if (!cell.blocks?.length) {
        cell.tables.forEach(relink);
        continue;
      }
      let k = 0;
      cell.blocks = cell.blocks.map((b) => {
        if (b.type === "table") return relink(b);
        const p = cell.paragraphs[k++];
        return p ? { type: "paragraph", paragraph: p } : b;
      });
      if (k < cell.paragraphs.length) for (const p of cell.paragraphs.slice(k)) cell.blocks.push({ type: "paragraph", paragraph: p });
      cell.tables = cell.blocks.filter((b) => b.type === "table");
    }
  }
  return t;
}
function cloneTable(t) {
  const c = clone(t);
  delete c.src;
  for (const r of c.rows) {
    delete r.src;
    for (const cell of r.cells) delete cell.src;
  }
  return c;
}
function describe(t) {
  const m = mapTable(t);
  return m.rows.map((gs) => gs.map((g) => {
    const txt = cellContent(g.cell).map((b) => b.type === "paragraph" ? b.paragraph.runs.map((r) => r.text).join("") : "[T]").join("/");
    return `${g.col}${g.span > 1 ? `+${g.span}` : ""}${g.cell.tcPr?.vMerge ? g.cell.tcPr.vMerge === "restart" ? "V" : "v" : ""}:${txt}`;
  }).join(" | ")).join("\n");
}

// ../docx-core/src/table-formula.ts
var cellText = (cell) => cellContent(cell).map((b) => b.type === "paragraph" ? b.paragraph.runs.map((r) => r.text).join("") : "").join("\n");
function parseCellNumber(text) {
  const m = /^\s*(R\$|US\$|\$|€|£)?\s*(\(?)([-+]?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(\)?)\s*(%?)/.exec(text);
  if (!m) return null;
  const int4 = m[4].replace(/\./g, "");
  const dec = m[5] ?? "";
  let n = parseFloat(`${int4}${dec ? "." + dec : ""}`);
  if (m[3] === "-" || m[2] === "(" && m[6] === ")") n = -n;
  return { n, decimals: dec.length, thousands: m[4].includes("."), ...m[1] ? { prefix: m[1] + " " } : {}, ...m[7] ? { suffix: "%" } : {} };
}
var FxError = class extends Error {
};
var FORMULA_ERRORS = {
  divZero: "!Divis\xE3o por zero",
  unexpectedEnd: "!Fim imprevisto da f\xF3rmula",
  syntax: "!Erro de sintaxe",
  missingOperator: "!Operador ausente",
  undefinedBookmark: "!Indicador n\xE3o definido"
};
var FUNCS = ["ABS", "AND", "AVERAGE", "COUNT", "DEFINED", "FALSE", "IF", "INT", "MAX", "MIN", "MOD", "NOT", "OR", "PRODUCT", "ROUND", "SIGN", "SUM", "TRUE"];
var FORMULA_FUNCTIONS = FUNCS;
function evaluateFormula(formula, env) {
  const src = formula.replace(/^\s*=/, "");
  const m = mapTable(env.table);
  const fmt = { n: 0, decimals: 0, thousands: false };
  const seen = (x2) => {
    fmt.decimals = Math.max(fmt.decimals, x2.decimals);
    fmt.thousands ||= x2.thousands;
    if (x2.prefix && !fmt.prefix) fmt.prefix = x2.prefix;
    if (x2.suffix && !fmt.suffix) fmt.suffix = x2.suffix;
    return x2.n;
  };
  const toks = tokenize(src);
  let i2 = 0;
  const peek = () => toks[i2];
  const next = () => {
    const t = toks[i2++];
    if (t === void 0) throw new FxError(FORMULA_ERRORS.unexpectedEnd);
    return t;
  };
  const expect = (t) => {
    if (next() !== t) throw new FxError(FORMULA_ERRORS.syntax);
  };
  const num2 = (v) => {
    if (v.kind === "num") return v.v;
    if (v.v.length !== 1) throw new FxError(FORMULA_ERRORS.syntax);
    return v.v[0];
  };
  const flat = (vs) => vs.flatMap((v) => v.kind === "num" ? [v.v] : v.v);
  const comparison = () => {
    let a = additive();
    const op = peek();
    if (op && ["=", "<", ">", "<=", ">=", "<>"].includes(op)) {
      i2++;
      const b = num2(additive()), x2 = num2(a);
      const r = op === "=" ? x2 === b : op === "<" ? x2 < b : op === ">" ? x2 > b : op === "<=" ? x2 <= b : op === ">=" ? x2 >= b : x2 !== b;
      a = { kind: "num", v: r ? 1 : 0 };
    }
    return a;
  };
  const additive = () => {
    let a = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const b = num2(term());
      a = { kind: "num", v: op === "+" ? num2(a) + b : num2(a) - b };
    }
    return a;
  };
  const term = () => {
    let a = power();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const b = num2(power());
      if (op === "/" && b === 0) throw new FxError(FORMULA_ERRORS.divZero);
      a = { kind: "num", v: op === "*" ? num2(a) * b : num2(a) / b };
    }
    return a;
  };
  const power = () => {
    let a = unary();
    while (peek() === "^") {
      next();
      a = { kind: "num", v: Math.pow(num2(a), num2(unary())) };
    }
    return a;
  };
  const unary = () => {
    if (peek() === "-") {
      next();
      return { kind: "num", v: -num2(unary()) };
    }
    if (peek() === "+") {
      next();
      return unary();
    }
    let v = primary();
    while (peek() === "%") {
      next();
      v = { kind: "num", v: num2(v) / 100 };
    }
    return v;
  };
  const primary = () => {
    const t = next();
    if (t === "(") {
      const v = comparison();
      expect(")");
      return v;
    }
    if (/^\d/.test(t)) return { kind: "num", v: parseFloat(t.replace(/\./g, "").replace(",", ".")) };
    const up = t.toUpperCase();
    if (up === "TRUE") return { kind: "num", v: 1 };
    if (up === "FALSE") return { kind: "num", v: 0 };
    if (["ABOVE", "BELOW", "LEFT", "RIGHT"].includes(up)) return { kind: "list", v: directional(m, env, up).map(seen) };
    if (FUNCS.includes(up) && peek() === "(") {
      next();
      const args = [];
      if (peek() !== ")") {
        args.push(comparison());
        while (peek() === ";") {
          next();
          args.push(comparison());
        }
      }
      expect(")");
      return { kind: "num", v: call(up, args) };
    }
    const ref = /^([A-Za-z]{1,2})(\d+)$/.exec(t);
    if (ref) {
      let r2 = ref;
      if (peek() === ":") {
        next();
        const t2 = next();
        const m2 = /^([A-Za-z]{1,2})(\d+)$/.exec(t2);
        if (!m2) throw new FxError(FORMULA_ERRORS.syntax);
        r2 = m2;
      }
      const c1 = colIndex(ref[1]), c2 = colIndex(r2[1]), w1 = +ref[2] - 1, w2 = +r2[2] - 1;
      const vals = [];
      for (let row = Math.min(w1, w2); row <= Math.max(w1, w2); row++) {
        for (let ci = Math.min(c1, c2); ci <= Math.max(c1, c2); ci++) {
          const cell = env.table.rows[row]?.cells[ci];
          const x2 = cell ? parseCellNumber(cellText(cell)) : null;
          if (x2) vals.push(seen(x2));
          else if (ref === r2) vals.push(0);
        }
      }
      return ref === r2 ? { kind: "num", v: vals[0] ?? 0 } : { kind: "list", v: vals };
    }
    if (env.bookmarks?.has(t)) return { kind: "num", v: env.bookmarks.get(t) };
    throw new FxError(env.bookmarks ? FORMULA_ERRORS.undefinedBookmark : FORMULA_ERRORS.syntax);
  };
  const call = (f, args) => {
    const xs = flat(args);
    const one = (k) => num2(args[k] ?? { kind: "num", v: 0 });
    switch (f) {
      case "ABS":
        return Math.abs(one(0));
      case "AND":
        return one(0) && one(1) ? 1 : 0;
      case "OR":
        return one(0) || one(1) ? 1 : 0;
      case "NOT":
        return one(0) ? 0 : 1;
      case "AVERAGE":
        if (!xs.length) throw new FxError(FORMULA_ERRORS.divZero);
        return xs.reduce((a, b) => a + b, 0) / xs.length;
      case "COUNT":
        return xs.length;
      case "DEFINED":
        return 1;
      case "IF":
        return one(0) ? one(1) : one(2);
      case "INT":
        return Math.trunc(one(0));
      case "MAX":
        return xs.length ? Math.max(...xs) : 0;
      case "MIN":
        return xs.length ? Math.min(...xs) : 0;
      case "MOD": {
        const b = one(1);
        if (b === 0) throw new FxError(FORMULA_ERRORS.divZero);
        return one(0) % b;
      }
      case "PRODUCT":
        return xs.reduce((a, b) => a * b, 1);
      case "ROUND": {
        const d = Math.trunc(one(1));
        const p = Math.pow(10, d);
        const v = one(0) * p;
        return Math.sign(v) * Math.round(Math.abs(v)) / p;
      }
      case "SIGN":
        return Math.sign(one(0));
      case "SUM":
        return xs.reduce((a, b) => a + b, 0);
      case "TRUE":
        return 1;
      case "FALSE":
        return 0;
    }
    throw new FxError(FORMULA_ERRORS.syntax);
  };
  try {
    if (!toks.length) throw new FxError(FORMULA_ERRORS.unexpectedEnd);
    const v = comparison();
    if (i2 < toks.length) throw new FxError(FORMULA_ERRORS.missingOperator);
    const value = v.kind === "num" ? v.v : v.v.reduce((a, b) => a + b, 0);
    return { value, fmt };
  } catch (e) {
    if (e instanceof FxError) return { error: e.message };
    throw e;
  }
}
function tokenize(s) {
  const out = [];
  const re = /\s*(<=|>=|<>|\d[\d.]*(?:,\d+)?|[A-Za-z_][A-Za-z_0-9]*|[-+*/^%()=<>;:])/y;
  let m;
  while (re.lastIndex < s.length && (m = re.exec(s))) out.push(m[1]);
  if (re.lastIndex < s.trimEnd().length) out.push("\0");
  return out;
}
var colIndex = (letters) => {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
function directional(m, env, dir) {
  const out = [];
  const me = cellAt(m, env.r, env.c);
  let r = env.r, c = me?.col ?? env.c;
  for (; ; ) {
    if (dir === "ABOVE") r--;
    else if (dir === "BELOW") r++;
    else if (dir === "LEFT") {
      const g2 = cellAt(m, r, c - 1);
      if (!g2) break;
      c = g2.col;
    } else {
      const g2 = cellAt(m, r, c + (cellAt(m, r, c)?.span ?? 1));
      if (!g2) break;
      c = g2.col;
    }
    const g = cellAt(m, r, c);
    if (!g || r < 0 || r >= m.rows.length) break;
    if (vMergeOf(g.cell) === "continue") continue;
    const x2 = parseCellNumber(cellText(g.cell));
    if (!x2) break;
    out.push(x2);
  }
  return out;
}
var group = (digits, sep) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
var roundAway = (v, d) => {
  const p = Math.pow(10, d);
  return Math.sign(v) * Math.round(Math.abs(v) * p + 1e-9) / p;
};
function formatFormulaResult(v, fmt) {
  const cap = fmt.prefix ? Math.max(2, fmt.decimals) : Math.max(2, fmt.decimals);
  let d = 0;
  while (d < cap && Math.abs(roundAway(v, d) - v) > 1e-9) d++;
  if (fmt.prefix) d = Math.max(d, fmt.decimals);
  const r = roundAway(v, d);
  const [ip, dp] = Math.abs(r).toFixed(d).split(".");
  const body = (fmt.thousands ? group(ip, ".") : ip) + (dp ? "," + dp : "");
  return `${r < 0 ? "-" : ""}${fmt.prefix ?? ""}${body}${fmt.suffix ?? ""}`;
}
function formatPicture(v, picture) {
  const secs = splitSections(picture);
  let pic = secs[0];
  let x2 = v;
  if (v < 0 && secs[1] !== void 0) {
    pic = secs[1];
    x2 = -v;
  } else if (v === 0 && secs[2] !== void 0) pic = secs[2];
  pic = pic.replace(/^'(.*)'$/, "$1");
  const comma = pic.indexOf(",");
  const intPic = comma >= 0 ? pic.slice(0, comma) : pic;
  const decPic = comma >= 0 ? pic.slice(comma + 1) : "";
  const nDec = (decPic.match(/[0#x]/g) ?? []).length;
  const r = roundAway(Math.abs(x2), nDec);
  const [ip, dp = ""] = r.toFixed(nDec).split(".");
  let digits = ip === "0" && /#/.test(intPic) && !/0/.test(intPic) ? "" : ip;
  const chars = [...intPic];
  const out = [];
  const firstPh = chars.findIndex((ch) => ch === "0" || ch === "#" || ch === "x");
  const grouping = /[0#x]\.[0#x]/.test(intPic);
  for (let k = chars.length - 1; k >= 0; k--) {
    const ch = chars[k];
    if (ch === "0" || ch === "#" || ch === "x") {
      const d = digits.length ? digits[digits.length - 1] : void 0;
      digits = digits.slice(0, -1);
      if (k === firstPh && digits.length) {
        const all = digits + (d ?? "");
        out.unshift(grouping ? group(all, ".") : all);
        digits = "";
        continue;
      }
      out.unshift(d ?? (ch === "0" ? "0" : ch === "#" ? " " : ""));
    } else if (ch === ".") {
      const left = digits.length > 0;
      if (left) out.unshift(".");
    } else out.unshift(ch);
  }
  let dec = "";
  let di = 0;
  for (const ch of decPic) {
    if (ch === "0" || ch === "#" || ch === "x") {
      dec += dp[di] ?? (ch === "0" ? "0" : " ");
      di++;
    } else dec += ch;
  }
  const neg = x2 < 0 && secs[1] === void 0 ? "-" : "";
  return neg + out.join("") + (comma >= 0 ? "," + dec : "");
}
function splitSections(p) {
  const out = [];
  let cur = "", q = false;
  for (const ch of p) {
    if (ch === "'") q = !q;
    if (ch === ";" && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
function defaultFormula(table, r, c) {
  const m = mapTable(table);
  const env = { table, r, c };
  if (directional(m, env, "ABOVE").length) return "=SUM(ABOVE)";
  if (directional(m, env, "LEFT").length) return "=SUM(LEFT)";
  return "=";
}
var formulaInstr = (formula, picture) => ` ${formula.trim()}${picture ? ` \\# "${picture}"` : ""} `;
function parseFormulaInstr(instr) {
  const m = /^\s*(=[^\\]*?)\s*(?:\\#\s*"([^"]*)"|\\#\s*(\S+))?\s*$/.exec(instr);
  if (!m) return null;
  return { formula: m[1].trim(), ...m[2] ?? m[3] ? { picture: m[2] ?? m[3] } : {} };
}
function formulaResultText(instr, env) {
  const p = parseFormulaInstr(instr);
  if (!p) return FORMULA_ERRORS.syntax;
  const r = evaluateFormula(p.formula, env);
  if ("error" in r) return r.error;
  return p.picture ? formatPicture(r.value, p.picture) : formatFormulaResult(r.value, r.fmt);
}

// ../docx-core/src/table-sort.ts
var SORT_MERGED_ERROR = { en: "Cannot sort a table that contains merged cells.", pt: "N\xE3o \xE9 poss\xEDvel classificar uma tabela que cont\xE9m c\xE9lulas mescladas." };
var defaultCollator = null;
var intlCompare = (a, b) => {
  defaultCollator ??= new Intl.Collator("pt-BR", { sensitivity: "accent", numeric: false });
  return defaultCollator.compare(a, b);
};
function caseCompare(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i2 = 0; i2 < n; i2++) {
    const x2 = a[i2], y = b[i2];
    if (x2 === y) continue;
    const xl = x2 === x2.toLowerCase() && x2 !== x2.toUpperCase();
    const yl = y === y.toLowerCase() && y !== y.toUpperCase();
    if (xl !== yl && x2.toLowerCase() === y.toLowerCase()) return xl ? -1 : 1;
  }
  return 0;
}
function parseSortDate(text) {
  const s = text.trim();
  let d, m, y;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (r) {
    y = +r[1];
    m = +r[2];
    d = +r[3];
  } else {
    r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
    if (!r) return null;
    d = +r[1];
    m = +r[2];
    y = +r[3];
    if (r[3].length === 2) y += y < 30 ? 2e3 : 1900;
  }
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return Date.UTC(y, m - 1, d);
}
function parseSortNumber(text) {
  const x2 = parseCellNumber(text);
  if (!x2) return null;
  return x2.suffix === "%" ? x2.n / 100 : x2.n;
}
function keyValue(text, type) {
  if (type === "number") return { s: text, v: parseSortNumber(text) };
  if (type === "date") return { s: text, v: parseSortDate(text) };
  return { s: text, v: null };
}
function order(n, fields, o) {
  const cmp = o.compare ?? intlCompare;
  const vals = Array.from({ length: n }, (_, i2) => fields(i2).map((t, k) => keyValue(t, o.keys[k].type)));
  const idx = Array.from({ length: n }, (_, i2) => i2);
  const one = (a, b, key) => {
    if (key.type === "text") {
      const ea = a.s.trim() === "", eb = b.s.trim() === "";
      let c2 = ea || eb ? ea === eb ? 0 : ea ? -1 : 1 : cmp(a.s, b.s);
      if (!c2 && o.caseSensitive) c2 = caseCompare(a.s, b.s);
      return key.desc ? -c2 : c2;
    }
    if (a.v === null || b.v === null) {
      if (a.v === null && b.v === null) return 0;
      return a.v === null !== !!key.desc ? -1 : 1;
    }
    const c = a.v === b.v ? 0 : a.v < b.v ? -1 : 1;
    return key.desc ? -c : c;
  };
  idx.sort((i2, j) => {
    for (let k = 0; k < o.keys.length; k++) {
      const c = one(vals[i2][k], vals[j][k], o.keys[k]);
      if (c) return c;
    }
    return i2 - j;
  });
  return idx;
}
function canSortTable(t) {
  return t.rows.every((row) => row.cells.every((c) => spanOf(c) === 1 && !vMergeOf(c) && !c.tcPr?.hMerge));
}
function sortTable(t, r1, r2, o) {
  if (!canSortTable(t) || !o.keys.length) return false;
  const m = mapTable(t);
  const rows = t.rows.slice(r1, r2 + 1);
  const text = (ri, col) => {
    const g = m.rows[r1 + ri]?.find((x2) => x2.col <= col && col < x2.col + x2.span);
    return g ? cellText(g.cell).replace(/\n/g, " ") : "";
  };
  const idx = order(rows.length, (i2) => o.keys.map((k) => text(i2, k.col)), o);
  const sorted = idx.map((i2) => rows[i2]);
  t.rows.splice(r1, rows.length, ...sorted);
  return true;
}
var plain = (p) => p.runs.map((r) => r.text).join("");
function sortParagraphsOrder(paras, o) {
  const sep = o.separator ?? "tab";
  const ch = sep === "tab" ? "	" : sep === "comma" ? "," : sep.char || "	";
  return order(paras.length, (i2) => {
    const s = plain(paras[i2]);
    const parts = s.split(ch);
    return o.keys.map((k) => k.col <= 0 ? s : (parts[k.col - 1] ?? "").trim());
  }, o);
}

// ../docx-core/src/table-style-edit.ts
var TABLE_STYLE_CONDS = ["wholeTable", "firstRow", "lastRow", "firstCol", "lastCol", "band1Horz", "band2Horz", "band1Vert", "band2Vert", "nwCell", "neCell", "swCell", "seCell"];
var COND_ORDER = ["wholeTable", "firstRow", "lastRow", "firstCol", "lastCol", "band1Vert", "band2Vert", "band1Horz", "band2Horz", "neCell", "nwCell", "seCell", "swCell"];
var TSPR_ORDER = ["w:pPr", "w:rPr", "w:tblPr", "w:trPr", "w:tcPr"];
var TBLPR_ORDER2 = ["w:tblStyle", "w:tblpPr", "w:tblOverlap", "w:bidiVisual", "w:tblStyleRowBandSize", "w:tblStyleColBandSize", "w:tblW", "w:jc", "w:tblCellSpacing", "w:tblInd", "w:tblBorders", "w:shd", "w:tblLayout", "w:tblCellMar", "w:tblLook"];
var TCPR_ORDER2 = ["w:cnfStyle", "w:tcW", "w:gridSpan", "w:hMerge", "w:vMerge", "w:tcBorders", "w:shd", "w:noWrap", "w:tcMar", "w:textDirection", "w:tcFitText", "w:vAlign", "w:hideMark"];
var SIDES2 = ["top", "left", "bottom", "right", "insideH", "insideV"];
var esc7 = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function el2(raw, tag) {
  return raw ? splitElement(raw) : { open: `<${tag}>`, close: `</${tag}>`, kids: [] };
}
var join2 = (o) => o.kids.length ? o.open + o.kids.map((k) => k.raw).join("") + o.close : "";
var kid = (kids, n) => kids.find((k) => k.name === n)?.raw;
function patchBorderSet(raw, tag, b) {
  const o = el2(raw, tag);
  for (const s of SIDES2) {
    if (!(s in b)) continue;
    const spec = b[s];
    setKid2(o.kids, SIDES2.map((x2) => `w:${x2}`), `w:${s}`, spec ? borderXml(s, spec) : borderXml(s, { val: "nil" }));
  }
  return join2(o);
}
function patchTcPr2(raw, f, bordersHere) {
  const o = el2(raw, "w:tcPr");
  if (bordersHere && f.borders && Object.keys(f.borders).length) setKid2(o.kids, TCPR_ORDER2, "w:tcBorders", patchBorderSet(kid(o.kids, "w:tcBorders"), "w:tcBorders", f.borders) || null);
  if (f.fill !== void 0) setKid2(o.kids, TCPR_ORDER2, "w:shd", f.fill === null ? null : `<w:shd w:val="clear" w:color="auto" w:fill="${esc7(f.fill)}"/>`);
  if (f.vAlign !== void 0) setKid2(o.kids, TCPR_ORDER2, "w:vAlign", f.vAlign === null || f.vAlign === "top" ? null : `<w:vAlign w:val="${f.vAlign}"/>`);
  return join2(o);
}
function patchParts(kids, order2, f, whole) {
  const set = (n, xml) => setKid2(kids, order2, n, xml || null);
  const pf = {};
  for (const k of ["alignment", "spaceBeforeTwips", "spaceAfterTwips", "lineTwentieths", "indentLeftTwips", "indentRightTwips", "indentFirstLineTwips"]) if (f[k] !== void 0) pf[k] = f[k];
  const rf = {};
  for (const k of ["fontAscii", "szHalfPt", "bold", "italic", "underline", "strike", "allCaps", "smallCaps", "color", "charSpacingTwips"]) if (f[k] !== void 0) rf[k] = f[k];
  if (Object.keys(pf).length) set("w:pPr", patchStylePPr(kid(kids, "w:pPr"), pf));
  if (Object.keys(rf).length) set("w:rPr", patchStyleRPr(kid(kids, "w:rPr"), rf));
  if (whole && f.borders && Object.keys(f.borders).length) {
    const t = el2(kid(kids, "w:tblPr"), "w:tblPr");
    setKid2(t.kids, TBLPR_ORDER2, "w:tblBorders", patchBorderSet(kid(t.kids, "w:tblBorders"), "w:tblBorders", f.borders) || null);
    set("w:tblPr", join2(t));
  }
  if (f.fill !== void 0 || f.vAlign !== void 0 || !whole && f.borders && Object.keys(f.borders).length) {
    set("w:tcPr", patchTcPr2(kid(kids, "w:tcPr"), f, !whole));
  }
}
function patchTableStyleXml(raw, cond, f) {
  const o = splitElement(raw);
  if (cond === "wholeTable") {
    patchParts(o.kids, STYLE_ORDER, f, true);
    return join2(o) || raw;
  }
  const i2 = o.kids.findIndex((k) => k.name === "w:tblStylePr" && k.el.attrs["w:type"] === cond);
  const cur = i2 >= 0 ? splitElement(o.kids[i2].raw) : { open: `<w:tblStylePr w:type="${cond}">`, close: "</w:tblStylePr>", kids: [] };
  patchParts(cur.kids, TSPR_ORDER, f, false);
  const xml = cur.kids.length ? cur.open + cur.kids.map((k) => k.raw).join("") + cur.close : null;
  if (i2 >= 0) {
    if (xml === null) o.kids.splice(i2, 1);
    else o.kids[i2] = { name: "w:tblStylePr", raw: xml, el: o.kids[i2].el };
  } else if (xml !== null) {
    const rank = COND_ORDER.indexOf(cond);
    let at = o.kids.length;
    for (let k = 0; k < o.kids.length; k++) {
      const kd = o.kids[k];
      if (kd.name === "w:tblStylePr" && COND_ORDER.indexOf(kd.el.attrs["w:type"] ?? "") > rank) {
        at = k;
        break;
      }
    }
    o.kids.splice(at, 0, { name: "w:tblStylePr", raw: xml, el: { name: "w:tblStylePr", attrs: { "w:type": cond }, children: [] } });
  }
  return o.open + o.kids.map((k) => k.raw).join("") + o.close;
}
function newTableStyleXml(o) {
  return `<w:style w:type="table" w:customStyle="1" w:styleId="${esc7(o.id)}"><w:name w:val="${esc7(o.name)}"/>` + (o.basedOn ? `<w:basedOn w:val="${esc7(o.basedOn)}"/>` : "") + '<w:uiPriority w:val="99"/></w:style>';
}
function retitleTableStyleXml(raw, h) {
  const o = splitElement(raw);
  if (h.name !== void 0) setKid2(o.kids, STYLE_ORDER, "w:name", `<w:name w:val="${esc7(h.name)}"/>`);
  if (h.basedOn !== void 0) setKid2(o.kids, STYLE_ORDER, "w:basedOn", h.basedOn ? `<w:basedOn w:val="${esc7(h.basedOn)}"/>` : null);
  return o.open + o.kids.map((k) => k.raw).join("") + o.close;
}

// ../docx-core/src/table-styles.ts
var W2 = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
var CORE_TABLE_STYLES = {
  "Normal Table": {
    id: "Tabelanormal",
    local: "Tabela normal",
    xml: '<w:style w:type="table" w:default="1" w:styleId="Tabelanormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
  },
  "Table Grid": {
    id: "Tabelacomgrade",
    local: "Tabela com grade",
    xml: '<w:style w:type="table" w:styleId="Tabelacomgrade"><w:name w:val="Table Grid"/><w:basedOn w:val="Tabelanormal"/><w:uiPriority w:val="39"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>'
  }
};
var localStyleId = (local) => local.replace(/[^A-Za-z0-9-]/g, "");
var builtinCache = null;
function loadBuiltinTableStyles() {
  return builtinCache ??= import("./table-styles-builtin-OZBWU3UI.js").then(({ BUILTIN_TABLE_STYLES }) => {
    const out = [];
    for (const s of BUILTIN_TABLE_STYLES) {
      for (const a of s.accents ?? [null]) {
        const sub = (x2) => a === null ? x2 : x2.replace(/\{A\}/g, String(a));
        const local = sub(s.local);
        const id = localStyleId(local);
        out.push({ name: sub(s.name), local, id, modern: !!s.modern, xml: sub(s.xml).replace("{ID}", id) });
      }
    }
    return out;
  });
}
var THEME_KEY = {
  text1: "dk1",
  background1: "lt1",
  text2: "dk2",
  background2: "lt2",
  dark1: "dk1",
  light1: "lt1",
  dark2: "dk2",
  light2: "lt2",
  hyperlink: "hlink",
  followedHyperlink: "folHlink"
};
var OFFICE_THEME = {
  dk1: "000000",
  lt1: "FFFFFF",
  dk2: "0E2841",
  lt2: "E8E8E8",
  accent1: "156082",
  accent2: "E97132",
  accent3: "196B24",
  accent4: "0F9ED5",
  accent5: "A02B93",
  accent6: "4EA72E",
  hlink: "467886",
  folHlink: "96607D"
};
function themeHex(colors, themeColor, tint, shade) {
  const key = THEME_KEY[themeColor] ?? themeColor;
  const base = colors[key] ?? OFFICE_THEME[key] ?? "000000";
  if (!tint && !shade) return base.toUpperCase();
  const [r, g, b] = [0, 2, 4].map((i2) => parseInt(base.slice(i2, i2 + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  if (shade) l *= parseInt(shade, 16) / 255;
  if (tint) {
    const t = parseInt(tint, 16) / 255;
    l = l * t + 1 - t;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const ch = (x2) => {
    if (x2 < 0) x2 += 1;
    if (x2 > 1) x2 -= 1;
    const v = x2 < 1 / 6 ? p + (q - p) * 6 * x2 : x2 < 1 / 2 ? q : x2 < 2 / 3 ? p + (q - p) * (2 / 3 - x2) * 6 : p;
    return Math.max(0, Math.min(255, Math.floor(v * 255))).toString(16).padStart(2, "0");
  };
  return (ch(h + 1 / 3) + ch(h) + ch(h - 1 / 3)).toUpperCase();
}
function materializeStyleXml(xml, colors) {
  const attr2 = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
  return xml.replace(/w:color="~"([^/>]*)/g, (_m, rest) => `w:color="${themeHex(colors, attr2(rest, "w:themeColor") ?? "text1", attr2(rest, "w:themeTint"), attr2(rest, "w:themeShade"))}"${rest}`).replace(/w:fill="~"([^/>]*)/g, (_m, rest) => `w:fill="${themeHex(colors, attr2(rest, "w:themeFill") ?? "background1", attr2(rest, "w:themeFillTint"), attr2(rest, "w:themeFillShade"))}"${rest}`);
}
function styleDefOf(xml) {
  const sheet = readStyleSheet(`<w:styles ${W2}>${xml}</w:styles>`);
  return Object.values(sheet.styles)[0];
}
function styleIdByName(f, name) {
  const n = name.toLowerCase();
  for (const s of Object.values(f?.styles.styles ?? {})) if (s.type === "table" && s.name?.toLowerCase() === n) return s.styleId;
  return void 0;
}
function ensureTableStyle(f, name, pending, builtins2 = []) {
  const have = styleIdByName(f, name);
  if (have) return have;
  const d = CORE_TABLE_STYLES[name] ?? builtins2.find((b) => b.name === name);
  if (!d) return void 0;
  let xml = materializeStyleXml(d.xml, f.theme?.colors ?? {});
  let id = d.id;
  while (f.styles.styles[id]) id += "1";
  if (id !== d.id) xml = xml.replace(`w:styleId="${d.id}"`, () => `w:styleId="${id}"`);
  if (name !== "Normal Table") {
    const baseId = styleIdByName(f, "Normal Table") ?? ensureTableStyle(f, "Normal Table", pending, builtins2);
    if (baseId) xml = xml.replace(/<w:basedOn w:val="[^"]*"\/>/, () => `<w:basedOn w:val="${baseId}"/>`);
  }
  const def = styleDefOf(xml);
  if (!def) return void 0;
  f.styles.styles[def.styleId] = def;
  if (def.isDefault && !f.styles.defaults.table) f.styles.defaults.table = def.styleId;
  pending.set(def.styleId, xml);
  return def.styleId;
}
function addStylesXml(pkg, styles) {
  const list = [...styles];
  if (!list.length) return;
  const path = "word/styles.xml";
  let xml = pkg.getPartText(path);
  if (!xml) {
    xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W2}></w:styles>`;
    const ct = pkg.getPartText("[Content_Types].xml");
    if (ct && !ct.includes("/word/styles.xml")) {
      pkg.setPartText("[Content_Types].xml", ct.replace("</Types>", () => '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'));
    }
    const relsPath = "word/_rels/document.xml.rels";
    const rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    if (!rels.includes('relationships/styles"')) {
      let n = 1;
      while (rels.includes(`Id="rId${n}"`)) n++;
      pkg.setPartText(relsPath, rels.replace("</Relationships>", () => `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`));
    }
  }
  const add = list.filter(([id]) => !new RegExp(`w:styleId="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(xml)).map(([, x2]) => x2).join("");
  if (!add) return;
  pkg.setPartText(path, xml.replace(/<\/w:styles>\s*$/, () => `${add}</w:styles>`));
}

// ../../../shared/ui/src/i18n.ts
var DEFAULT_UI_LANG = "en";
function matchUiLang(tag) {
  if (!tag) return null;
  if (/^pt\b/i.test(tag)) return "pt";
  if (/^en\b/i.test(tag)) return "en";
  return null;
}
function browserUiLang() {
  const nav = typeof navigator !== "undefined" ? navigator : void 0;
  const prefs = nav?.languages?.length ? nav.languages : nav?.language ? [nav.language] : [];
  for (const tag of prefs) {
    const m = matchUiLang(tag);
    if (m) return m;
  }
  return DEFAULT_UI_LANG;
}
function uiLang(el3) {
  const forced = el3?.getAttribute("lang");
  if (forced) return matchUiLang(forced) ?? DEFAULT_UI_LANG;
  return browserUiLang();
}
function pickLabels(lang, labels) {
  const l = typeof lang === "string" ? lang : uiLang(lang);
  return labels[l] ?? labels[DEFAULT_UI_LANG];
}
function onBrowserLangChange(cb) {
  if (typeof window === "undefined") return () => {
  };
  window.addEventListener("languagechange", cb);
  return () => window.removeEventListener("languagechange", cb);
}

export {
  zlibSync,
  unzlibSync,
  zipSync,
  unzipSync,
  DocxPackage,
  parseXml,
  childElements,
  firstChild,
  readEmbeddedFonts,
  vmlColor,
  dmlColorSpec,
  readPictureFormat,
  DEFAULT_WRAP_POLYGON,
  patchPicture,
  newPictureXml,
  DEFAULT_TEXTBOX_BODY,
  readShapeFormat,
  patchShape,
  NEW_TEXTBOX_LINE,
  NEW_TEXTBOX_FILL,
  newTextboxDrawingXml,
  readStyleSheet,
  DEFAULT_RUN_PROPS,
  blipFxImageEffects,
  runPropsFromRPr,
  editBaseProps,
  paraPropsFromPPr,
  syncImageFromXml,
  syncShapeFromXml,
  readStylesXml,
  paraText,
  paraLength,
  comparePos,
  normalizeRange,
  normalizeParagraph,
  splitAt,
  propsAt,
  insertIndex,
  withoutRevisions,
  insertText,
  insertRun,
  splitParagraph,
  deleteRange,
  mergeWithPrevious,
  applyRunProps,
  applyParaProps,
  clearRunFormatting,
  clearParaFormatting,
  clearPara,
  newRevision,
  paraFormatting,
  finalParagraphs,
  finalBlocks,
  paragraphHasRevisions,
  collectRevisions,
  revisionAt,
  spanScope,
  acceptRevisions,
  rejectRevisions,
  trackInsertText,
  trackInsertRun,
  trackSplitParagraph,
  trackDelete,
  trackApplyRunProps,
  trackApplyParaProps,
  revisionAuthors,
  readTrackRevisions,
  ensureNoteParts,
  patchSettingsNotes,
  NOTE_STYLES,
  NOTE_REF_TEXT,
  noteMarkField,
  noteRefRun,
  newNoteParagraphs,
  vmlColorAttr,
  writePageBackground,
  WORD_PATTERNS,
  patternGif,
  oneColorGradientColor2,
  resolveColor2,
  markSectionBreaks,
  forEachTextbox,
  readHeaderFooterPart,
  readBodyFragment,
  noteRefIds,
  readFullDocument,
  COLUMN_SPACE_DEFAULT,
  sectionRanges,
  sectionIndexAt,
  sectionSectPr,
  sectionRefs,
  insertSectionBreak,
  insertPageBreakParagraph,
  contentWidth,
  maxColumns,
  columnsFor,
  presetColumns,
  columnsPresetOf,
  columnWidths,
  setOrientation,
  writeDefaultTabStop,
  writeHyphenationSettings,
  writeEvenAndOddHeaders,
  writeDisplayBackgroundShape,
  watermarkRunXml,
  isWatermarkXml,
  readWatermarkXml,
  autoTextBox,
  explicitTextBox,
  pictureBox,
  WATERMARK_GALLERY,
  WATERMARK_TEXTS,
  hfPartXml,
  copyHfPartXml,
  dropUnusedHfParts,
  pageNumberGroupIds,
  serializeBlocks,
  writeDocument,
  BLANK_STYLES_XML,
  blankDocxPackage,
  readStyleIndex,
  styleRaw,
  putStyle,
  dropStyle,
  setLatentQFormat,
  styleIdFromName,
  newStyleXml,
  patchStyleXml,
  styleKid,
  hasRunChanges,
  hasParaChanges,
  patchStyleRPr,
  patchStylePPr,
  builtinStyle,
  builtinStyles,
  builtinDisplayName,
  builtinXml,
  isWordBinary,
  convertDocToDocx,
  table_ops_exports,
  cellText,
  FORMULA_FUNCTIONS,
  defaultFormula,
  formulaInstr,
  formulaResultText,
  SORT_MERGED_ERROR,
  parseSortDate,
  parseSortNumber,
  canSortTable,
  sortTable,
  sortParagraphsOrder,
  TABLE_STYLE_CONDS,
  patchTableStyleXml,
  newTableStyleXml,
  retitleTableStyleXml,
  loadBuiltinTableStyles,
  themeHex,
  styleIdByName,
  ensureTableStyle,
  addStylesXml,
  DEFAULT_UI_LANG,
  uiLang,
  pickLabels,
  onBrowserLangChange
};
