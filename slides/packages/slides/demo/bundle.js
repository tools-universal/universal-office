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
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
function unzlibSync(data, opts) {
  return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
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
function strToU8(str, latin12) {
  if (latin12) {
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
    if (c < 128 || latin12)
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
function strFromU8(dat, latin12) {
  if (latin12) {
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

// ../slides-core/src/ppt/cfb.ts
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
    if (major === 3 && this.sectorShift !== 9 || major === 4 && this.sectorShift !== 12) {
      if (this.sectorShift < 7 || this.sectorShift > 16) throw new Error(`Compound File com setor inv\xE1lido (2^${this.sectorShift})`);
    }
    if (this.miniSectorShift < 2 || this.miniSectorShift > this.sectorShift) throw new Error("Compound File com mini setor inv\xE1lido");
    const numFatSectors = v.getUint32(44, true);
    const firstDirSector = v.getUint32(48, true);
    this.miniCutoff = v.getUint32(56, true) || 4096;
    const firstMiniFatSector = v.getUint32(60, true);
    const numMiniFatSectors = v.getUint32(64, true);
    const firstDifatSector = v.getUint32(68, true);
    const numDifatSectors = v.getUint32(72, true);
    const sectorSize = 1 << this.sectorShift;
    const fatSectors = [];
    for (let i2 = 0; i2 < 109; i2++) {
      const s = v.getUint32(76 + i2 * 4, true);
      if (s <= MAXREGSECT) fatSectors.push(s);
    }
    let difat = firstDifatSector;
    const perDifat = sectorSize / 4 - 1;
    const seenDifat = /* @__PURE__ */ new Set();
    for (let n = 0; n < numDifatSectors && difat <= MAXREGSECT; n++) {
      if (seenDifat.has(difat)) throw new Error("Compound File com ciclo na DIFAT");
      seenDifat.add(difat);
      const off = this.sectorOffset(difat);
      for (let i2 = 0; i2 < perDifat; i2++) {
        const s = this.u32At(off + i2 * 4);
        if (s <= MAXREGSECT) fatSectors.push(s);
      }
      difat = this.u32At(off + perDifat * 4);
    }
    const fatCount = Math.min(fatSectors.length, numFatSectors || fatSectors.length);
    const perSector = sectorSize / 4;
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
    const walk = (id, prefix) => {
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
          if (e.type === 1 && e.child !== NOSTREAM) walk(e.child, path);
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
  sectorOffset(sector2) {
    return sector2 + 1 << this.sectorShift;
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
    const total = size >= 0 ? size : sectors.length * sectorSize;
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
    const out = new Uint8Array(size);
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

// ../slides-core/src/ppt/records.ts
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
  f32(off) {
    return off + 4 <= this.bytes.length && off >= 0 ? this.view.getFloat32(off, true) : 0;
  }
  sub(start, end) {
    return this.bytes.subarray(Math.max(0, start), Math.min(this.bytes.length, end));
  }
};
function readRec(r, off, limit = r.length) {
  if (off + 8 > limit) return void 0;
  const vi = r.u16(off);
  const len = r.u32(off + 4);
  const start = off + 8;
  return { ver: vi & 15, inst: vi >>> 4, type: r.u16(off + 2), len, hdr: off, start, end: Math.min(limit, start + len), r };
}
function children(rec) {
  return recsIn(rec.r, rec.start, rec.end);
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
function child(rec, type, inst) {
  for (const c of children(rec)) if (c.type === type && (inst === void 0 || c.inst === inst)) return c;
  return void 0;
}
function recData(rec) {
  return rec.r.sub(rec.start, rec.end);
}
function utf16(r, start, end) {
  let s = "";
  for (let o = start; o + 1 < end; o += 2) s += String.fromCharCode(r.u16(o));
  return s;
}
function latin1(r, start, end) {
  let s = "";
  for (let o = start; o < end; o++) s += String.fromCharCode(r.u8(o));
  return s;
}
var RT = {
  Document: 1e3,
  DocumentAtom: 1001,
  EndDocumentAtom: 1002,
  Slide: 1006,
  SlideAtom: 1007,
  Notes: 1008,
  NotesAtom: 1009,
  Environment: 1010,
  SlidePersistAtom: 1011,
  MainMaster: 1016,
  SlideShowSlideInfoAtom: 1017,
  SlideShowDocInfoAtom: 1025,
  ExternalObjectList: 1033,
  DrawingGroup: 1035,
  Drawing: 1036,
  RoundTripTheme12Atom: 1038,
  RoundTripColorMapping12Atom: 1039,
  RoundTripContentMasterInfo12Atom: 1054,
  RoundTripOArtTextStyles12Atom: 1059,
  List: 2e3,
  FontCollection: 2005,
  SoundCollection: 2020,
  ColorSchemeAtom: 2032,
  ExObjRefAtom: 3009,
  PlaceholderAtom: 3011,
  ShapeAtom: 3035,
  ShapeFlags10Atom: 3036,
  RoundTripNewPlaceholderId12Atom: 3037,
  OutlineTextRefAtom: 3998,
  TextHeaderAtom: 3999,
  TextCharsAtom: 4e3,
  StyleTextPropAtom: 4001,
  MasterTextPropAtom: 4002,
  TextMasterStyleAtom: 4003,
  TextCharFormatExceptionAtom: 4004,
  TextParagraphFormatExceptionAtom: 4005,
  TextRulerAtom: 4006,
  TextBookmarkAtom: 4007,
  TextBytesAtom: 4008,
  TextSpecialInfoDefaultAtom: 4009,
  TextSpecialInfoAtom: 4010,
  DefaultRulerAtom: 4011,
  StyleTextProp9Atom: 4012,
  TextMasterStyle9Atom: 4013,
  FontEntityAtom: 4023,
  CString: 4026,
  ExternalHyperlinkAtom: 4051,
  ExternalHyperlink: 4055,
  SlideNumberMetaCharAtom: 4056,
  HeadersFooters: 4057,
  HeadersFootersAtom: 4058,
  TextInteractiveInfoAtom: 4063,
  SlideListWithText: 4080,
  AnimationInfoAtom: 4081,
  InteractiveInfo: 4082,
  InteractiveInfoAtom: 4083,
  UserEditAtom: 4085,
  CurrentUserAtom: 4086,
  DateTimeMetaCharAtom: 4087,
  GenericDateMetaCharAtom: 4088,
  HeaderMetaCharAtom: 4089,
  FooterMetaCharAtom: 4090,
  ExternalVideo: 4101,
  AnimationInfo: 4116,
  RtfDateTimeMetaCharAtom: 4117,
  ProgTags: 5e3,
  ProgStringTag: 5001,
  ProgBinaryTag: 5002,
  BinaryTagDataBlob: 5003,
  PersistDirectoryAtom: 6002,
  HashCodeAtom: 11008,
  BuildList: 11010,
  BuildAtom: 11011,
  ChartBuild: 11012,
  ChartBuildAtom: 11013,
  DiagramBuild: 11014,
  DiagramBuildAtom: 11015,
  ParaBuild: 11016,
  ParaBuildAtom: 11017,
  LevelInfoAtom: 11018,
  RoundTripAnimationAtom12Atom: 11019,
  RoundTripAnimationHashAtom12Atom: 11021,
  SlideFlags10Atom: 12010,
  SlideTime10Atom: 12011,
  CryptSession10Container: 12052,
  TimeConditionContainer: 61733,
  TimeNode: 61735,
  TimeCondition: 61736,
  TimeModifier: 61737,
  TimeBehaviorContainer: 61738,
  TimeAnimateBehaviorContainer: 61739,
  TimeColorBehaviorContainer: 61740,
  TimeEffectBehaviorContainer: 61741,
  TimeMotionBehaviorContainer: 61742,
  TimeRotationBehaviorContainer: 61743,
  TimeScaleBehaviorContainer: 61744,
  TimeSetBehaviorContainer: 61745,
  TimeCommandBehaviorContainer: 61746,
  TimeBehavior: 61747,
  TimeAnimateBehavior: 61748,
  TimeColorBehavior: 61749,
  TimeEffectBehavior: 61750,
  TimeMotionBehavior: 61751,
  TimeRotationBehavior: 61752,
  TimeScaleBehavior: 61753,
  TimeSetBehavior: 61754,
  TimeCommandBehavior: 61755,
  TimeClientVisualElement: 61756,
  TimePropertyList: 61757,
  TimeVariantList: 61758,
  TimeAnimationValueList: 61759,
  TimeIterateData: 61760,
  TimeSequenceData: 61761,
  TimeVariant: 61762,
  TimeAnimationValue: 61763,
  ExtTimeNodeContainer: 61764,
  SubEffectContainer: 61765
};
var OA = {
  DggContainer: 61440,
  BStoreContainer: 61441,
  DgContainer: 61442,
  SpgrContainer: 61443,
  SpContainer: 61444,
  SolverContainer: 61445,
  FDGGBlock: 61446,
  FBSE: 61447,
  FDG: 61448,
  FSPGR: 61449,
  FSP: 61450,
  FOPT: 61451,
  ClientTextbox: 61453,
  ChildAnchor: 61455,
  ClientAnchor: 61456,
  ClientData: 61457,
  BlipEMF: 61466,
  BlipWMF: 61467,
  BlipPICT: 61468,
  BlipJPEG: 61469,
  BlipPNG: 61470,
  BlipDIB: 61471,
  BlipTIFF: 61481,
  BlipJPEGCMYK: 61482,
  SecondaryFOPT: 61729,
  TertiaryFOPT: 61730
};

// ../slides-core/src/ppt/officeart.ts
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
    const prop2 = { id: opid & 16383, value, bid: (opid & 16384) !== 0 };
    if (opid & 32768) {
      let size = value;
      if (MSO_ARRAY_PROPS.has(prop2.id) && complexOff + 6 <= rec.end) {
        let cb = r.u16(complexOff + 4);
        if (cb === 65520) cb = 4;
        const arrSize = 6 + r.u16(complexOff) * cb;
        if (value === arrSize - 6 && complexOff + arrSize <= rec.end) size = arrSize;
      }
      const len = Math.max(0, Math.min(size, rec.end - complexOff));
      prop2.complex = r.sub(complexOff, complexOff + len);
      complexOff += len;
    }
    into.set(prop2.id, prop2);
  }
}
function readRect(r, o) {
  return { l: r.i32(o), t: r.i32(o + 4), r: r.i32(o + 8), b: r.i32(o + 12) };
}
function readClientAnchor(rec) {
  const r = rec.r;
  const o = rec.start;
  if (rec.end - rec.start >= 16) return { t: r.i32(o), l: r.i32(o + 4), r: r.i32(o + 8), b: r.i32(o + 12) };
  return { t: r.i16(o), l: r.i16(o + 2), r: r.i16(o + 4), b: r.i16(o + 6) };
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
      case OA.ClientAnchor:
        shape.anchor = readClientAnchor(c);
        shape.anchorKind = "client";
        break;
      case OA.ChildAnchor:
        shape.anchor = readRect(c.r, c.start);
        shape.anchorKind = "child";
        break;
      case OA.ClientData:
        shape.clientData = c;
        break;
      case OA.ClientTextbox:
        shape.clientTextbox = c;
        break;
    }
  }
  return shape;
}
var MAX_GROUP_DEPTH = 64;
function readSpgrContainer(rec, depth = 0) {
  const kids = children(rec);
  const first = kids[0];
  const group = first && first.type === OA.SpContainer ? readSpContainer(first) : { spid: 0, type: 0, flags: FSP.group, props: /* @__PURE__ */ new Map() };
  group.children = [];
  for (const c of kids.slice(first && first.type === OA.SpContainer ? 1 : 0)) {
    if (c.type === OA.SpContainer) {
      const s = readSpContainer(c);
      if (!(s.flags & FSP.deleted)) group.children.push(s);
    } else if (c.type === OA.SpgrContainer && depth < MAX_GROUP_DEPTH) {
      const g = readSpgrContainer(c, depth + 1);
      if (!(g.flags & FSP.deleted)) group.children.push(g);
    }
  }
  return group;
}
function readDgContainer(rec) {
  const d = {};
  for (const c of children(rec)) {
    if (c.type === OA.SpgrContainer && !d.root) d.root = readSpgrContainer(c);
    else if (c.type === OA.SpContainer) {
      const s = readSpContainer(c);
      if (s.flags & FSP.background) d.background = s;
    }
  }
  return d;
}
function readBStore(rec) {
  const out = [];
  for (const c of children(rec)) {
    if (c.type !== OA.FBSE) {
      out.push(void 0);
      continue;
    }
    const r = c.r;
    const o = c.start;
    const cbName = r.u8(o + 33);
    const e = { btWin32: r.u8(o), size: r.u32(o + 20), cRef: r.u32(o + 24), foDelay: r.u32(o + 28) };
    const embOff = o + 36 + cbName;
    if (embOff + 8 <= c.end) {
      const emb = readRec(r, embOff, c.end);
      if (emb && emb.type >= 61464 && emb.type <= 61719) e.embedded = emb;
    }
    out.push(e);
  }
  return out;
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
function decodeBlip(rec) {
  const r = rec.r;
  const uids = blipUidCount(rec.type, rec.inst) * 16;
  const data = (off) => r.sub(rec.start + off, rec.end);
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
          bytes = unzlibSync(raw);
        } catch {
          try {
            bytes = inflateSync(raw);
          } catch {
            return void 0;
          }
        }
      }
      if (cbSize > 0 && cbSize < bytes.length) bytes = bytes.subarray(0, cbSize);
      if (rec.type === OA.BlipEMF) return { ext: "emf", mime: "image/x-emf", bytes };
      if (rec.type === OA.BlipWMF) {
        const b = { l: r.i32(h + 4), t: r.i32(h + 8), r: r.i32(h + 12), b: r.i32(h + 16) };
        return { ext: "wmf", mime: "image/x-wmf", bytes: withPlaceableHeader(bytes, b) };
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
function withPlaceableHeader(wmf, b) {
  const out = new Uint8Array(22 + wmf.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 2596720087, true);
  v.setInt16(6, b.l, true);
  v.setInt16(8, b.t, true);
  v.setInt16(10, b.r, true);
  v.setInt16(12, b.b, true);
  v.setUint16(14, 1440, true);
  let sum = 0;
  for (let i2 = 0; i2 < 10; i2++) sum ^= v.getUint16(i2 * 2, true);
  v.setUint16(20, sum, true);
  out.set(wmf, 22);
  return out;
}

// ../slides-core/src/ppt/text.ts
var readColorIndex = (r, o) => ({ r: r.u8(o), g: r.u8(o + 1), b: r.u8(o + 2), index: r.u8(o + 3) });
var MAX_TABS = 64;
function readTabStops(r, o) {
  const n = r.u16(o);
  const tabs = [];
  for (let i2 = 0; i2 < Math.min(n, MAX_TABS); i2++) tabs.push({ pos: r.i16(o + 2 + i2 * 4), type: r.u16(o + 4 + i2 * 4) });
  return { tabs, size: 2 + n * 4 };
}
function readPFFields(r, o, masks) {
  const start = o;
  const pf = {};
  if (masks & 15) {
    const f = r.u16(o);
    o += 2;
    if (masks & 1) pf.hasBullet = (f & 1) !== 0;
    if (masks & 2) pf.bulletHasFont = (f & 2) !== 0;
    if (masks & 4) pf.bulletHasColor = (f & 4) !== 0;
    if (masks & 8) pf.bulletHasSize = (f & 8) !== 0;
  }
  if (masks & 128) {
    pf.bulletChar = r.u16(o);
    o += 2;
  }
  if (masks & 16) {
    pf.bulletFont = r.u16(o);
    o += 2;
  }
  if (masks & 64) {
    pf.bulletSize = r.i16(o);
    o += 2;
  }
  if (masks & 32) {
    pf.bulletColor = readColorIndex(r, o);
    o += 4;
  }
  if (masks & 2048) {
    pf.align = r.u16(o);
    o += 2;
  }
  if (masks & 4096) {
    pf.lineSpacing = r.i16(o);
    o += 2;
  }
  if (masks & 8192) {
    pf.spaceBefore = r.i16(o);
    o += 2;
  }
  if (masks & 16384) {
    pf.spaceAfter = r.i16(o);
    o += 2;
  }
  if (masks & 256) {
    pf.leftMargin = r.i16(o);
    o += 2;
  }
  if (masks & 1024) {
    pf.indent = r.i16(o);
    o += 2;
  }
  if (masks & 32768) {
    pf.defaultTabSize = r.i16(o);
    o += 2;
  }
  if (masks & 1048576) {
    const t = readTabStops(r, o);
    pf.tabStops = t.tabs;
    o += t.size;
  }
  if (masks & 65536) {
    pf.fontAlign = r.u16(o);
    o += 2;
  }
  if (masks & 917504) {
    pf.wrapFlags = r.u16(o);
    o += 2;
  }
  if (masks & 2097152) {
    pf.textDirection = r.u16(o);
    o += 2;
  }
  return { pf, size: o - start };
}
var CF_STYLE_BITS = 1 | 2 | 4 | 16 | 32 | 128 | 512 | 15360;
function readCFFields(r, o, masks) {
  const start = o;
  const cf = {};
  if (masks & CF_STYLE_BITS) {
    const s = r.u16(o);
    o += 2;
    if (masks & 1) cf.bold = (s & 1) !== 0;
    if (masks & 2) cf.italic = (s & 2) !== 0;
    if (masks & 4) cf.underline = (s & 4) !== 0;
    if (masks & 16) cf.shadow = (s & 16) !== 0;
    if (masks & 512) cf.emboss = (s & 512) !== 0;
    if (masks & 15360) cf.pp9rt = s >> 10 & 15;
  }
  if (masks & 65536) {
    cf.font = r.u16(o);
    o += 2;
  }
  if (masks & 2097152) {
    cf.eaFont = r.u16(o);
    o += 2;
  }
  if (masks & 4194304) {
    cf.ansiFont = r.u16(o);
    o += 2;
  }
  if (masks & 8388608) {
    cf.symbolFont = r.u16(o);
    o += 2;
  }
  if (masks & 131072) {
    cf.size = r.i16(o);
    o += 2;
  }
  if (masks & 262144) {
    cf.color = readColorIndex(r, o);
    o += 4;
  }
  if (masks & 524288) {
    cf.position = r.i16(o);
    o += 2;
  }
  return { cf, size: o - start };
}
function readStyleTextProp(rec, textLen) {
  const r = rec.r;
  let o = rec.start;
  const end = rec.end;
  const pf = [];
  const cf = [];
  let ok = true;
  let covered = 0;
  while (covered < textLen + 1 && o + 10 <= end) {
    const count = r.u32(o);
    const indentLevel = r.u16(o + 4);
    const masks = r.u32(o + 6);
    const { pf: p, size } = readPFFields(r, o + 10, masks);
    o += 10 + size;
    pf.push({ count, indentLevel, pf: p });
    covered += count;
    if (count === 0) {
      ok = false;
      break;
    }
  }
  covered = 0;
  while (covered < textLen + 1 && o + 8 <= end) {
    const count = r.u32(o);
    const masks = r.u32(o + 4);
    const { cf: c, size } = readCFFields(r, o + 8, masks);
    o += 8 + size;
    cf.push({ count, cf: c });
    covered += count;
    if (count === 0) {
      ok = false;
      break;
    }
  }
  if (o > end) ok = false;
  return { pf, cf, ok, leftover: end - o };
}
function readTextRuler(rec) {
  const r = rec.r;
  let o = rec.start;
  const masks = r.u32(o);
  o += 4;
  const ruler = { leftMargin: [], indent: [] };
  if (masks & 2) {
    ruler.cLevels = r.i16(o);
    o += 2;
  }
  if (masks & 1) {
    ruler.defaultTabSize = r.i16(o);
    o += 2;
  }
  if (masks & 4) {
    const t = readTabStops(r, o);
    ruler.tabStops = t.tabs;
    o += t.size;
  }
  for (let lvl = 0; lvl < 5; lvl++) {
    if (masks & 8 << lvl) {
      ruler.leftMargin[lvl] = r.i16(o);
      o += 2;
    }
    if (masks & 256 << lvl) {
      ruler.indent[lvl] = r.i16(o);
      o += 2;
    }
  }
  return ruler;
}
function readTextMasterStyle(rec) {
  const r = rec.r;
  let o = rec.start;
  const n = r.u16(o);
  o += 2;
  const out = [];
  for (let i2 = 0; i2 < n && o < rec.end; i2++) {
    let level;
    if (rec.inst >= 5) {
      level = r.u16(o);
      o += 2;
    }
    const pm = r.u32(o);
    o += 4;
    const p = readPFFields(r, o, pm);
    o += p.size;
    const cm = r.u32(o);
    o += 4;
    const c = readCFFields(r, o, cm);
    o += c.size;
    const lvl = { pf: p.pf, cf: c.cf };
    if (level !== void 0) lvl.level = level;
    out.push(lvl);
  }
  return out;
}
function readCFExceptionAtom(rec) {
  return readCFFields(rec.r, rec.start + 4, rec.r.u32(rec.start)).cf;
}
function readPFExceptionAtom(rec) {
  return readPFFields(rec.r, rec.start + 6, rec.r.u32(rec.start + 2)).pf;
}
function readStyleTextProp9(rec) {
  const r = rec.r;
  let o = rec.start;
  const out = [];
  while (o + 12 <= rec.end) {
    const pm = r.u32(o);
    o += 4;
    const pf = {};
    if (pm & 8388608) o += 2;
    if (pm & 33554432) {
      pf.hasAutoNum = r.u16(o) !== 0;
      o += 2;
    }
    if (pm & 16777216) {
      pf.autoNumScheme = r.u16(o);
      pf.autoNumStart = r.i16(o + 2);
      o += 4;
    }
    const cm = r.u32(o);
    o += 4;
    if (cm & 1048576) o += 4;
    const sm = r.u32(o);
    o += 4;
    o += textSIExceptionSize(r, o, sm);
    out.push(pf);
  }
  return out;
}
function textSIExceptionSize(r, o, masks) {
  let n = 0;
  if (masks & 1) n += 2;
  if (masks & 2) n += 2;
  if (masks & 4) n += 2;
  if (masks & 64) n += 2;
  if (masks & 32) n += 4;
  if (masks & 512) n += 4 + 4 * r.u32(o + n);
  return n;
}
function readTextBlock(recs) {
  const header = recs[0];
  if (!header || header.type !== RT.TextHeaderAtom) return void 0;
  const block = { textType: header.r.u32(header.start), text: "", pfRuns: [], cfRuns: [] };
  let style;
  let lastAction;
  for (const rec of recs.slice(1)) {
    switch (rec.type) {
      case RT.InteractiveInfo: {
        const a = children(rec).find((k) => k.type === RT.InteractiveInfoAtom);
        lastAction = a && rec.inst === 0 ? { hyperlinkId: a.r.u32(a.start + 4), action: a.r.u8(a.start + 8), jump: a.r.u8(a.start + 10) } : void 0;
        break;
      }
      case RT.TextInteractiveInfoAtom:
        if (rec.inst === 0 && lastAction) {
          (block.links ??= []).push({ start: rec.r.u32(rec.start), end: rec.r.u32(rec.start + 4), ...lastAction });
        }
        lastAction = void 0;
        break;
      case RT.TextCharsAtom:
        block.text = utf16(rec.r, rec.start, rec.end);
        break;
      case RT.TextBytesAtom:
        block.text = latin1(rec.r, rec.start, rec.end);
        break;
      case RT.StyleTextPropAtom:
        style = rec;
        break;
      case RT.TextRulerAtom:
        block.ruler = readTextRuler(rec);
        break;
      case RT.SlideNumberMetaCharAtom:
      case RT.DateTimeMetaCharAtom:
      case RT.GenericDateMetaCharAtom:
      case RT.HeaderMetaCharAtom:
      case RT.FooterMetaCharAtom:
      case RT.RtfDateTimeMetaCharAtom:
        (block.metaChars ??= []).push({ pos: rec.r.u32(rec.start), type: rec.type });
        break;
    }
  }
  if (style) {
    const st = readStyleTextProp(style, block.text.length);
    block.pfRuns = st.pf;
    block.cfRuns = st.cf;
  }
  return block;
}
function splitTextBlocks(recs) {
  const out = [];
  let cur;
  for (const rec of recs) {
    if (rec.type === RT.TextHeaderAtom) {
      if (cur) {
        const b = readTextBlock(cur);
        if (b) out.push(b);
      }
      cur = [rec];
    } else if (cur) cur.push(rec);
  }
  if (cur) {
    const b = readTextBlock(cur);
    if (b) out.push(b);
  }
  return out;
}
function readClientTextbox(rec) {
  const kids = children(rec);
  const ref = kids.find((k) => k.type === RT.OutlineTextRefAtom);
  if (ref) return { outlineRef: ref.r.u32(ref.start) };
  const blocks = splitTextBlocks(kids);
  return blocks[0] ? { block: blocks[0] } : {};
}

// ../slides-core/src/ppt/ppt-reader.ts
var PptFormatError = class extends Error {
  constructor(msg) {
    super(msg);
    this.name = "PptFormatError";
  }
};
var HEADER_TOKEN_PLAIN = 3817979999;
var HEADER_TOKEN_ENCRYPTED = 4090610911;
function readPptDocument(bytes) {
  let cfb;
  try {
    cfb = readCfb(bytes);
  } catch (e) {
    throw new PptFormatError(`Arquivo .ppt inv\xE1lido ou corrompido: ${e.message}`);
  }
  if (cfb.has("EncryptedPackage") || cfb.has("EncryptionInfo")) {
    throw new PptFormatError("Apresenta\xE7\xE3o protegida por senha (criptografada) \u2014 n\xE3o \xE9 poss\xEDvel abri-la.");
  }
  const docBytes = cfb.getStream("PowerPoint Document");
  if (!docBytes) {
    if (cfb.has("PP40") || cfb.has("PP97_DUALSTORAGE")) {
      throw new PptFormatError("Formato do PowerPoint 95 ou anterior n\xE3o \xE9 suportado (use PowerPoint 97-2003 ou .pptx).");
    }
    throw new PptFormatError('O arquivo n\xE3o cont\xE9m uma apresenta\xE7\xE3o do PowerPoint (stream "PowerPoint Document" ausente).');
  }
  const doc = new ByteReader(docBytes);
  let currentEdit;
  const cuBytes = cfb.getStream("Current User");
  if (cuBytes && cuBytes.length >= 20) {
    const cu = new ByteReader(cuBytes);
    const rec = readRec(cu, 0);
    if (rec && rec.type === RT.CurrentUserAtom) {
      const token = cu.u32(rec.start + 4);
      if (token === HEADER_TOKEN_ENCRYPTED) {
        throw new PptFormatError("Apresenta\xE7\xE3o protegida por senha (criptografada) \u2014 n\xE3o \xE9 poss\xEDvel abri-la.");
      }
      void HEADER_TOKEN_PLAIN;
      currentEdit = cu.u32(rec.start + 8);
    }
  }
  const edits = collectUserEdits(doc, currentEdit);
  if (!edits.length) throw new PptFormatError("Estrutura do .ppt n\xE3o reconhecida (UserEditAtom ausente).");
  const newest = edits[0];
  if (newest.len >= 32 && doc.u32(newest.start + 28) !== 0) {
    throw new PptFormatError("Apresenta\xE7\xE3o protegida por senha (criptografada) \u2014 n\xE3o \xE9 poss\xEDvel abri-la.");
  }
  const persist = buildPersistDirectory(doc, edits);
  const docPersistId = doc.u32(newest.start + 16);
  const docRec = recAtPersist(doc, persist, docPersistId);
  if (!docRec || docRec.type !== RT.Document) throw new PptFormatError("DocumentContainer ausente no .ppt.");
  const out = {
    slideW: 5760,
    slideH: 4320,
    notesW: 4320,
    notesH: 5760,
    slideSizeType: 0,
    firstSlideNumber: 1,
    fonts: [],
    docCF: {},
    docPF: {},
    blips: [],
    masters: [],
    slides: [],
    notes: [],
    binaryTags: /* @__PURE__ */ new Map(),
    hyperlinks: /* @__PURE__ */ new Map(),
    omitTitlePlace: false,
    outlinePf9: /* @__PURE__ */ new Map()
  };
  let notesMasterPersist = 0;
  const picStream = cfb.getStream("Pictures");
  const pics = picStream ? new ByteReader(picStream) : void 0;
  const masterRefs = [];
  const slideRefs = [];
  const notesRefs = [];
  for (const c of children(docRec)) {
    switch (c.type) {
      case RT.DocumentAtom: {
        const r = c.r, o = c.start;
        out.slideW = r.i32(o);
        out.slideH = r.i32(o + 4);
        out.notesW = r.i32(o + 8);
        out.notesH = r.i32(o + 12);
        notesMasterPersist = r.u32(o + 24);
        out.firstSlideNumber = r.u16(o + 32);
        out.slideSizeType = r.u16(o + 34);
        out.omitTitlePlace = r.u8(o + 37) !== 0;
        break;
      }
      case RT.HeadersFooters:
        if (c.inst === 3) out.slideHeadersFooters = readHeadersFooters(c);
        break;
      case RT.Environment:
        readEnvironment(c, out);
        break;
      case RT.DrawingGroup: {
        const dgg = child(c, OA.DggContainer);
        const bstore = dgg ? child(dgg, OA.BStoreContainer) : void 0;
        if (bstore) {
          out.blips = readBStore(bstore).map((e) => {
            if (!e) return void 0;
            try {
              if (e.embedded) return decodeBlip(e.embedded);
              if (!pics || e.foDelay === 4294967295 || e.foDelay >= pics.length) return void 0;
              const blipRec = readRec(pics, e.foDelay);
              return blipRec ? decodeBlip(blipRec) : void 0;
            } catch {
              return void 0;
            }
          });
        }
        break;
      }
      case RT.SlideListWithText: {
        let cur;
        let pending = [];
        const flush = () => {
          if (cur) cur.texts.push(...splitTextBlocks(pending));
          pending = [];
        };
        for (const k of children(c)) {
          if (k.type === RT.SlidePersistAtom) {
            flush();
            cur = { persistId: k.r.u32(k.start), slideId: k.r.u32(k.start + 12), texts: [] };
            if (c.inst === 1) masterRefs.push(cur);
            else if (c.inst === 0) slideRefs.push(cur);
            else if (c.inst === 2) notesRefs.push(cur);
          } else pending.push(k);
        }
        flush();
        break;
      }
      case RT.List:
        readProgTags(c, out.binaryTags);
        break;
      case RT.ExternalObjectList:
        for (const x2 of children(c)) {
          if (x2.type !== RT.ExternalHyperlink) continue;
          let id;
          const link = {};
          for (const k of children(x2)) {
            if (k.type === RT.ExternalHyperlinkAtom) id = k.r.u32(k.start);
            else if (k.type === RT.CString) {
              const s = utf16(k.r, k.start, k.end);
              if (k.inst === 0) link.friendlyName = s;
              else if (k.inst === 1) link.target = s;
              else if (k.inst === 3) link.location = s;
            }
          }
          if (id !== void 0) out.hyperlinks.set(id, link);
        }
        break;
    }
  }
  const pp9 = out.binaryTags.get("___PPT9");
  if (pp9) {
    for (const c of recsIn(pp9.r, pp9.start, pp9.end)) {
      if (c.type !== 4014) continue;
      let key;
      for (const k of children(c)) {
        if (k.type === 4015) key = `${k.r.u32(k.start)}:${k.r.u32(k.start + 4)}`;
        else if (k.type === RT.StyleTextProp9Atom && key) {
          out.outlinePf9.set(key, readStyleTextProp9(k));
          key = void 0;
        }
      }
    }
  }
  for (const m of masterRefs) {
    const rec = recAtPersist(doc, persist, m.persistId);
    if (!rec) continue;
    const kind = rec.type === RT.MainMaster ? "mainMaster" : rec.type === RT.Slide ? "titleMaster" : void 0;
    if (!kind) continue;
    out.masters.push(readSlideContainer(rec, kind, m.persistId, m.slideId, []));
  }
  for (const s of slideRefs) {
    const rec = recAtPersist(doc, persist, s.persistId);
    if (!rec || rec.type !== RT.Slide) continue;
    out.slides.push(readSlideContainer(rec, "slide", s.persistId, s.slideId, s.texts));
  }
  for (const n of notesRefs) {
    const rec = recAtPersist(doc, persist, n.persistId);
    if (rec && rec.type === RT.Notes) out.notes.push(readSlideContainer(rec, "notes", n.persistId, n.slideId, n.texts));
  }
  if (notesMasterPersist) {
    const rec = recAtPersist(doc, persist, notesMasterPersist);
    if (rec && rec.type === RT.Notes) out.notesMaster = readSlideContainer(rec, "notes", notesMasterPersist, 0, []);
  }
  return out;
}
function collectUserEdits(doc, currentEdit) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  let off = currentEdit;
  if (off === void 0 || !isUserEdit(doc, off)) off = lastTopLevelUserEdit(doc);
  while (off !== void 0 && off > 0 && !seen.has(off) && isUserEdit(doc, off)) {
    seen.add(off);
    const ue = readRec(doc, off);
    out.push(ue);
    off = doc.u32(ue.start + 8);
  }
  return out;
}
function isUserEdit(doc, off) {
  const r = readRec(doc, off);
  return !!r && r.type === RT.UserEditAtom && r.len >= 28;
}
function lastTopLevelUserEdit(doc) {
  let last;
  for (const r of recsIn(doc, 0, doc.length)) if (r.type === RT.UserEditAtom) last = r.hdr;
  return last;
}
function buildPersistDirectory(doc, edits) {
  const map = /* @__PURE__ */ new Map();
  for (const ue of [...edits].reverse()) {
    const pd = readRec(doc, doc.u32(ue.start + 12));
    if (!pd || pd.type !== RT.PersistDirectoryAtom) continue;
    let o = pd.start;
    while (o + 4 <= pd.end) {
      const v = doc.u32(o);
      const id = v & 1048575;
      const n = v >>> 20;
      for (let k = 0; k < n && o + 8 + k * 4 <= pd.end; k++) map.set(id + k, doc.u32(o + 4 + k * 4));
      o += 4 + n * 4;
    }
  }
  return map;
}
function recAtPersist(doc, persist, id) {
  const off = persist.get(id);
  return off === void 0 ? void 0 : readRec(doc, off);
}
function readEnvironment(env, out) {
  for (const c of children(env)) {
    if (c.type === RT.FontCollection) {
      for (const f of children(c)) {
        if (f.type !== RT.FontEntityAtom) continue;
        let name = utf16(f.r, f.start, f.start + 64);
        const z = name.indexOf("\0");
        if (z >= 0) name = name.slice(0, z);
        out.fonts[f.inst] = { name, charset: f.r.u8(f.start + 64), pitchFamily: f.r.u8(f.start + 67) };
      }
    } else if (c.type === RT.TextSpecialInfoDefaultAtom) {
      const masks = c.r.u32(c.start);
      if (masks & 2) out.docLcid = c.r.u16(c.start + 4 + (masks & 1 ? 2 : 0));
    } else if (c.type === RT.TextCharFormatExceptionAtom) out.docCF = readCFExceptionAtom(c);
    else if (c.type === RT.TextParagraphFormatExceptionAtom) out.docPF = readPFExceptionAtom(c);
    else if (c.type === RT.TextMasterStyleAtom) out.docOtherStyle = readTextMasterStyle(c);
  }
}
function readProgTags(rec, into) {
  for (const c of children(rec)) {
    if (c.type === RT.ProgTags || c.type === RT.List) readProgTags(c, into);
    else if (c.type === RT.ProgBinaryTag) {
      const kids = children(c);
      const nameRec = kids.find((k) => k.type === RT.CString);
      const blob = kids.find((k) => k.type === RT.BinaryTagDataBlob);
      if (nameRec && blob) into.set(utf16(nameRec.r, nameRec.start, nameRec.end), blob);
    }
  }
}
function readHeadersFooters(rec) {
  const hf = {
    hasDate: false,
    hasTodayDate: false,
    hasUserDate: false,
    hasSlideNumber: false,
    hasHeader: false,
    hasFooter: false,
    formatId: 0
  };
  for (const k of children(rec)) {
    if (k.type === RT.HeadersFootersAtom) {
      hf.formatId = k.r.i16(k.start);
      const f = k.r.u16(k.start + 2);
      hf.hasDate = (f & 1) !== 0;
      hf.hasTodayDate = (f & 2) !== 0;
      hf.hasUserDate = (f & 4) !== 0;
      hf.hasSlideNumber = (f & 8) !== 0;
      hf.hasHeader = (f & 16) !== 0;
      hf.hasFooter = (f & 32) !== 0;
    } else if (k.type === RT.CString) {
      const s = utf16(k.r, k.start, k.end);
      if (k.inst === 0) hf.userDate = s;
      else if (k.inst === 1) hf.header = s;
      else if (k.inst === 2) hf.footer = s;
    }
  }
  return hf;
}
function readColorScheme(rec) {
  const out = [];
  for (let i2 = 0; i2 < 8; i2++) {
    const o = rec.start + i2 * 4;
    out.push([rec.r.u8(o), rec.r.u8(o + 1), rec.r.u8(o + 2)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase());
  }
  return out;
}
function readSlideContainer(rec, kind, persistId, slideId, outline) {
  const s = {
    kind,
    persistId,
    slideId,
    geom: 0,
    placeholderTypes: [],
    masterIdRef: 0,
    flags: 0,
    drawing: {},
    outline,
    binaryTags: /* @__PURE__ */ new Map()
  };
  for (const c of children(rec)) {
    switch (c.type) {
      case RT.SlideAtom: {
        const r = c.r, o = c.start;
        s.geom = r.u32(o);
        for (let i2 = 0; i2 < 8; i2++) s.placeholderTypes.push(r.u8(o + 4 + i2));
        s.masterIdRef = r.u32(o + 12);
        s.flags = r.u16(o + 20);
        break;
      }
      case RT.NotesAtom:
        s.slideIdRef = c.r.u32(c.start);
        s.flags = c.r.u16(c.start + 4);
        break;
      case RT.SlideShowSlideInfoAtom: {
        const r = c.r, o = c.start;
        const flags = r.u16(o + 10);
        s.transition = {
          slideTime: r.i32(o),
          effectDirection: r.u8(o + 8),
          effectType: r.u8(o + 9),
          speed: r.u8(o + 12),
          manualAdvance: (flags & 1) !== 0,
          hidden: (flags & 4) !== 0,
          sound: (flags & 16) !== 0,
          autoAdvance: (flags & 1024) !== 0
        };
        break;
      }
      case RT.Drawing: {
        const dg = child(c, OA.DgContainer);
        if (dg) s.drawing = readDgContainer(dg);
        break;
      }
      case RT.ColorSchemeAtom:
        if (c.inst === 1) s.colorScheme = readColorScheme(c);
        break;
      case RT.TextMasterStyleAtom:
        (s.masterStyles ??= /* @__PURE__ */ new Map()).set(c.inst, readTextMasterStyle(c));
        break;
      case RT.ProgTags:
        readProgTags(c, s.binaryTags);
        break;
      case RT.CString:
        if (c.inst === 2 || c.inst === 3) s.name = utf16(c.r, c.start, c.end);
        break;
      case RT.RoundTripTheme12Atom:
        s.roundTripTheme = recData(c);
        break;
      case RT.HeadersFooters:
        s.headersFooters = readHeadersFooters(c);
        break;
    }
  }
  return s;
}

// ../slides-core/src/ppt/xmlw.ts
function stripInvalid(s) {
  let out = "";
  for (let i2 = 0; i2 < s.length; i2++) {
    const c = s.charCodeAt(i2);
    if (c < 32 && c !== 9 && c !== 10 && c !== 13 || c === 65534 || c === 65535) continue;
    out += s[i2];
  }
  return out;
}
function escText(s) {
  return stripInvalid(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s) {
  return escText(s).replace(/"/g, "&quot;");
}
function attrs(obj) {
  let out = "";
  for (const [k, v] of Object.entries(obj)) {
    if (v === void 0 || v === null || v === false) continue;
    out += ` ${k}="${escAttr(v === true ? "1" : String(v))}"`;
  }
  return out;
}
function el(name, a = {}, content = "") {
  return content ? `<${name}${attrs(a)}>${content}</${name}>` : `<${name}${attrs(a)}/>`;
}
var XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
var NS = {
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  p: "http://schemas.openxmlformats.org/presentationml/2006/main",
  rel: "http://schemas.openxmlformats.org/package/2006/relationships",
  ct: "http://schemas.openxmlformats.org/package/2006/content-types",
  relType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
};

// ../slides-core/src/ppt/textconv.ts
var MU_TO_EMU = 1587.5;
var emu = (mu) => Math.round(mu * MU_TO_EMU);
var JUMPS = ["", "nextslide", "previousslide", "firstslide", "lastslide", "lastslideviewed", "endshow"];
function baseType(t) {
  if (t === 6) return 0;
  if (t === 5 || t === 7 || t === 8) return 1;
  return t;
}
function levelOf(levels, lvl) {
  if (!levels) return void 0;
  if (levels.some((l) => l.level !== void 0)) return levels.find((l) => l.level === lvl);
  return levels[lvl];
}
var cache = /* @__PURE__ */ new WeakMap();
function resolveLevel(ctx, textType, level) {
  let m = cache.get(ctx);
  if (!m) {
    m = /* @__PURE__ */ new Map();
    cache.set(ctx, m);
  }
  const lvl = Math.max(0, Math.min(4, level));
  const key = `${textType}:${lvl}`;
  const hit = m.get(key);
  if (hit) return hit;
  const pf = { ...ctx.doc.docPF };
  const cf = { ...ctx.doc.docCF };
  const base = baseType(textType);
  const baseLevels = ctx.styles?.get(base) ?? ctx.styles?.get(4) ?? ctx.doc.docOtherStyle;
  const derived = base !== textType ? ctx.styles?.get(textType) : void 0;
  for (let l = 0; l <= lvl; l++) {
    const b = levelOf(baseLevels, l);
    if (b) {
      Object.assign(pf, b.pf);
      Object.assign(cf, b.cf);
    }
  }
  for (let l = 0; l <= lvl; l++) {
    const d = levelOf(derived, l);
    if (d) {
      Object.assign(pf, d.pf);
      Object.assign(cf, d.cf);
    }
  }
  const out = { pf, cf };
  m.set(key, out);
  return out;
}
function colorIndexHex(ci, scheme) {
  if (!ci) return void 0;
  if (ci.index === 254) return hex3(ci.r, ci.g, ci.b);
  if (ci.index <= 7) return scheme[ci.index];
  return void 0;
}
function hex3(r, g, b) {
  return [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}
var ALIGN = ["l", "ctr", "r", "just", "dist", "thaiDist", "justLow"];
var AUTONUM = [
  "alphaLcPeriod",
  "alphaUcPeriod",
  "arabicParenR",
  "arabicPeriod",
  "romanLcParenBoth",
  "romanLcParenR",
  "romanLcPeriod",
  "romanUcPeriod",
  "alphaLcParenBoth",
  "alphaLcParenR",
  "alphaUcParenBoth",
  "alphaUcParenR",
  "arabicParenBoth",
  "arabicPlain",
  "romanUcParenBoth",
  "romanUcParenR",
  "ea1ChsPlain",
  "ea1ChsPeriod",
  "circleNumDbPlain",
  "circleNumWdWhitePlain",
  "circleNumWdBlackPlain",
  "thaiAlphaPeriod",
  "thaiAlphaParenR",
  "thaiAlphaParenBoth",
  "thaiNumPeriod",
  "thaiNumParenR",
  "thaiNumParenBoth",
  "hindiAlphaPeriod",
  "hindiNumPeriod",
  "ea1JpnChsDbPeriod",
  "hindiNumParenR",
  "hindiAlpha1Period",
  "ea1ChtPlain",
  "ea1ChtPeriod",
  "arabicDbPlain",
  "arabicDbPeriod",
  "ea1JpnKorPlain",
  "ea1JpnKorPeriod",
  "arabic1Minus",
  "arabic2Minus",
  "hebrew2Minus",
  "thaiAlphaPeriod",
  "thaiAlphaParenR"
];
function spacingXml(tag, v) {
  if (v === void 0) return "";
  if (v >= 0) return el(tag, {}, el("a:spcPct", { val: Math.round(v * 1e3) }));
  return el(tag, {}, el("a:spcPts", { val: Math.round(-v / 8 * 100) }));
}
function fontName(ctx, idx) {
  if (idx === void 0 || idx === 65535) return void 0;
  return ctx.doc.fonts[idx]?.name || void 0;
}
function bulletCharStr(code) {
  const c = code >= 61440 && code <= 61695 ? code - 61440 : code;
  return String.fromCharCode(c || 8226);
}
function pPrXml(tag, pf, cf, ctx, extra = {}) {
  const left = extra.marginOverride?.left ?? pf.leftMargin ?? 0;
  const ind = extra.marginOverride?.indent ?? pf.indent ?? 0;
  const a = {
    marL: emu(left),
    lvl: extra.lvl ? extra.lvl : void 0,
    indent: emu(ind - left),
    algn: ALIGN[pf.align ?? 0] ?? "l"
  };
  if (pf.defaultTabSize !== void 0) a["defTabSz"] = emu(pf.defaultTabSize);
  if (pf.textDirection === 1) a["rtl"] = "1";
  if (pf.fontAlign !== void 0) a["fontAlgn"] = ["base", "t", "ctr", "b"][pf.fontAlign] ?? void 0;
  let kids = "";
  kids += spacingXml("a:lnSpc", pf.lineSpacing);
  kids += spacingXml("a:spcBef", pf.spaceBefore);
  kids += spacingXml("a:spcAft", pf.spaceAfter);
  if (pf.hasBullet) {
    if (pf.bulletHasColor) {
      const c = colorIndexHex(pf.bulletColor, ctx.scheme);
      if (c) kids += el("a:buClr", {}, el("a:srgbClr", { val: c }));
    }
    if (pf.bulletHasSize && pf.bulletSize !== void 0 && pf.bulletSize !== 0) {
      kids += pf.bulletSize > 0 ? el("a:buSzPct", { val: Math.round(pf.bulletSize * 1e3) }) : el("a:buSzPts", { val: Math.round(-pf.bulletSize * 100) });
    }
    const bf = pf.bulletHasFont ? fontName(ctx, pf.bulletFont) : void 0;
    if (bf) kids += el("a:buFont", { typeface: bf });
    if (pf.hasAutoNum) {
      kids += el("a:buAutoNum", {
        type: AUTONUM[pf.autoNumScheme ?? 3] ?? "arabicPeriod",
        startAt: pf.autoNumStart !== void 0 && pf.autoNumStart > 1 ? pf.autoNumStart : void 0
      });
    } else kids += el("a:buChar", { char: bulletCharStr(pf.bulletChar ?? 8226) });
  } else kids += "<a:buNone/>";
  if (pf.tabStops?.length) {
    kids += el("a:tabLst", {}, pf.tabStops.map((t) => el("a:tab", { pos: emu(t.pos), algn: ["l", "ctr", "r", "dec"][t.type] ?? "l" })).join(""));
  }
  if (tag !== "a:pPr") kids += rPrXml("a:defRPr", cf, ctx);
  return el(tag, a, kids);
}
var LCID = {
  1046: "pt-BR",
  2070: "pt-PT",
  1033: "en-US",
  2057: "en-GB",
  3081: "en-AU",
  4105: "en-CA",
  3082: "es-ES",
  1034: "es-ES",
  2058: "es-MX",
  11274: "es-AR",
  1036: "fr-FR",
  3084: "fr-CA",
  1031: "de-DE",
  2055: "de-CH",
  3079: "de-AT",
  1040: "it-IT",
  1043: "nl-NL",
  2067: "nl-BE",
  1049: "ru-RU",
  1045: "pl-PL",
  1029: "cs-CZ",
  1038: "hu-HU",
  1053: "sv-SE",
  1030: "da-DK",
  1044: "nb-NO",
  1035: "fi-FI",
  1032: "el-GR",
  1055: "tr-TR",
  1041: "ja-JP",
  1042: "ko-KR",
  2052: "zh-CN",
  1028: "zh-TW",
  1037: "he-IL",
  1025: "ar-SA",
  1054: "th-TH",
  1066: "vi-VN",
  1048: "ro-RO",
  1058: "uk-UA",
  1026: "bg-BG",
  1050: "hr-HR",
  1051: "sk-SK",
  1060: "sl-SI",
  1027: "ca-ES",
  1057: "id-ID",
  1081: "hi-IN"
};
function rPrXml(tag, cf, ctx, link) {
  const a = {
    lang: ctx.doc.docLcid !== void 0 ? LCID[ctx.doc.docLcid] : void 0,
    sz: cf.size !== void 0 && cf.size > 0 ? Math.round(cf.size * 100) : void 0,
    b: cf.bold ? "1" : "0",
    i: cf.italic ? "1" : "0",
    u: cf.underline ? "sng" : void 0,
    baseline: cf.position ? Math.round(cf.position * 1e3) : void 0
  };
  if (tag === "a:defRPr") delete a["lang"];
  let kids = "";
  const color = colorIndexHex(cf.color, ctx.scheme) ?? ctx.scheme[1];
  if (color) kids += el("a:solidFill", {}, el("a:srgbClr", { val: color }));
  if (cf.shadow) {
    kids += '<a:effectLst><a:outerShdw blurRad="38100" dist="38100" dir="2700000" algn="tl"><a:srgbClr val="000000"><a:alpha val="43137"/></a:srgbClr></a:outerShdw></a:effectLst>';
  }
  const latin = fontName(ctx, cf.font);
  if (latin) kids += el("a:latin", { typeface: latin });
  const ea = fontName(ctx, cf.eaFont);
  if (ea) kids += el("a:ea", { typeface: ea });
  const sym = fontName(ctx, cf.symbolFont);
  if (sym) kids += el("a:sym", { typeface: sym });
  if (link) kids += el("a:hlinkClick", { "r:id": link.rid, action: link.action });
  return el(tag, a, kids);
}
function runLinkFor(block, pos, ctx) {
  const l = block.links?.find((x2) => pos >= x2.start && pos < x2.end);
  if (!l) return void 0;
  if (l.action === 4) {
    const target = ctx.doc.hyperlinks.get(l.hyperlinkId)?.target;
    if (target && ctx.linkRel) return { rid: ctx.linkRel(target) };
    return void 0;
  }
  if (l.action === 3 && JUMPS[l.jump]) return { rid: "", action: `ppaction://hlinkshowjump?jump=${JUMPS[l.jump]}` };
  return void 0;
}
function metaCharContent(recType, ctx) {
  switch (recType) {
    case RT.SlideNumberMetaCharAtom:
      return { fld: "slidenum", text: String(ctx.slideNumber ?? 1) };
    case RT.DateTimeMetaCharAtom:
    case RT.GenericDateMetaCharAtom:
    case RT.RtfDateTimeMetaCharAtom: {
      if (ctx.hf?.userDate) return { text: ctx.hf.userDate };
      const d = /* @__PURE__ */ new Date();
      return { fld: "datetime1", text: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` };
    }
    case RT.FooterMetaCharAtom:
      return { text: ctx.hf?.footer ?? "" };
    case RT.HeaderMetaCharAtom:
      return { text: ctx.hf?.header ?? "" };
    default:
      return void 0;
  }
}
var fieldSeq = 0;
function fieldId() {
  fieldSeq = (fieldSeq + 1) % 65535;
  return `{B6F15528-21DE-4FAA-801E-634DDDAF${fieldSeq.toString(16).padStart(4, "0").toUpperCase()}}`;
}
function runAt(runs, pos) {
  let acc = 0;
  for (const r of runs) {
    acc += r.count;
    if (pos < acc) return r;
  }
  return runs[runs.length - 1];
}
function cfBoundaries(block, start, end) {
  const set = /* @__PURE__ */ new Set([start, end]);
  let acc = 0;
  for (const r of block.cfRuns) {
    acc += r.count;
    if (acc > start && acc < end) set.add(acc);
  }
  for (const l of block.links ?? []) {
    if (l.start > start && l.start < end) set.add(l.start);
    if (l.end > start && l.end < end) set.add(l.end);
  }
  return [...set].sort((a, b) => a - b);
}
function paragraphsXml(block, ctx) {
  const text = block.text;
  const paras = [];
  let s = 0;
  for (let i2 = 0; i2 < text.length; i2++) {
    if (text[i2] === "\r") {
      paras.push({ start: s, end: i2 });
      s = i2 + 1;
    }
  }
  paras.push({ start: s, end: text.length });
  const fields = /* @__PURE__ */ new Map();
  for (const m of block.metaChars ?? []) {
    const c = metaCharContent(m.type, ctx);
    if (c) fields.set(m.pos, c);
  }
  let out = "";
  for (const para of paras) {
    const pfRun = runAt(block.pfRuns, para.start);
    const level = Math.min(pfRun?.indentLevel ?? 0, 4);
    const base = resolveLevel(ctx, block.textType, level);
    const pf = { ...base.pf };
    const ruler = block.ruler;
    if (ruler) {
      const lm = ruler.leftMargin[level];
      const id = ruler.indent[level];
      if (lm !== void 0) pf.leftMargin = lm;
      if (id !== void 0) pf.indent = id;
      if (ruler.defaultTabSize !== void 0) pf.defaultTabSize = ruler.defaultTabSize;
      if (ruler.tabStops?.length) pf.tabStops = ruler.tabStops;
    }
    if (pfRun) Object.assign(pf, pfRun.pf);
    const firstCf = runAt(block.cfRuns, para.start);
    if (block.pf9?.length && pf.hasBullet) {
      const p9 = block.pf9[firstCf?.cf.pp9rt ?? 0];
      if (p9?.hasAutoNum) {
        pf.hasAutoNum = true;
        if (p9.autoNumScheme !== void 0) pf.autoNumScheme = p9.autoNumScheme;
        if (p9.autoNumStart !== void 0) pf.autoNumStart = p9.autoNumStart;
      }
    }
    let body = pPrXml("a:pPr", pf, base.cf, ctx, { lvl: level });
    const cfAt = (pos) => ({ ...base.cf, ...runAt(block.cfRuns, pos)?.cf ?? {} });
    if (para.end > para.start) {
      const bounds = cfBoundaries(block, para.start, para.end);
      for (let k = 0; k + 1 < bounds.length; k++) {
        const a = bounds[k], b = bounds[k + 1];
        const cf = cfAt(a);
        const link = runLinkFor(block, a, ctx);
        if (link && !link.action && ctx.scheme[6]) cf.color = { r: 0, g: 0, b: 0, index: 6 };
        const rPr = rPrXml("a:rPr", cf, ctx, link);
        let seg = "";
        const flush = () => {
          if (seg) body += `<a:r>${rPr}<a:t>${escText(seg)}</a:t></a:r>`;
          seg = "";
        };
        for (let i2 = a; i2 < b; i2++) {
          const ch = text[i2];
          const fld = fields.get(i2);
          if (fld) {
            flush();
            if (fld.fld) body += `<a:fld${attrs({ id: fieldId(), type: fld.fld })}>${rPr}<a:t>${escText(fld.text)}</a:t></a:fld>`;
            else if (fld.text) body += `<a:r>${rPr}<a:t>${escText(fld.text)}</a:t></a:r>`;
          } else if (ch === "\v") {
            flush();
            body += `<a:br>${rPr}</a:br>`;
          } else seg += ch;
        }
        flush();
      }
    } else {
      body += `<a:r>${rPrXml("a:rPr", cfAt(para.start), ctx)}<a:t></a:t></a:r>`;
    }
    body += rPrXml("a:endParaRPr", cfAt(para.end), ctx);
    out += `<a:p>${body}</a:p>`;
  }
  return out;
}
function levelsXml(tag, ctx, textType) {
  let kids = "";
  for (let i2 = 0; i2 < 9; i2++) {
    const st = resolveLevel(ctx, textType, Math.min(i2, 4));
    kids += pPrXml(`a:lvl${i2 + 1}pPr`, st.pf, st.cf, ctx);
  }
  return el(tag, {}, kids);
}

// ../slides-core/src/ppt/anim.ts
var FLOATS = /* @__PURE__ */ new WeakSet();
var FloatVal = class {
  constructor(v) {
    this.v = v;
    FLOATS.add(this);
  }
  v;
};
function readVariant(rec) {
  const r = rec.r, o = rec.start;
  switch (r.u8(o)) {
    case 0:
      return r.u8(o + 1) !== 0;
    case 1:
      return r.i32(o + 1);
    case 2:
      return r.f32(o + 1);
    case 3: {
      let s = utf16(r, o + 1, rec.end);
      const z = s.indexOf("\0");
      if (z >= 0) s = s.slice(0, z);
      return s;
    }
    default:
      return void 0;
  }
}
function readTypedVariant(rec) {
  return rec.r.u8(rec.start) === 2 ? new FloatVal(rec.r.f32(rec.start + 1)) : readVariant(rec);
}
var FILL = ["", "remove", "freeze", "hold", "transition"];
var RESTART = ["", "always", "whenNotActive", "never"];
var NODE_TYPE = ["", "clickEffect", "withEffect", "afterEffect", "mainSeq", "interactiveSeq", "clickPar", "withGroup", "afterGroup", "tmRoot"];
var PRESET_CLASS = ["", "entr", "exit", "emph", "path", "verb", "mediacall"];
var TRIGGER_EVT = ["", "onBegin", "onEnd", "begin", "end", "onClick", "onDblClick", "onMouseOver", "onMouseOut", "onNext", "onPrev", "onStopAudio"];
var Writer = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  ctx;
  nextId = 1;
  id() {
    return this.nextId++;
  }
};
var fmtNum = (v) => Number.isInteger(v) ? String(v) : String(Math.round(v * 1e3) / 1e3);
function targetXml(cve, w) {
  if (!cve) return "";
  for (const k of children(cve)) {
    if (k.type === RT_VisualPageAtom) return "<p:tgtEl><p:sldTgt/></p:tgtEl>";
    if (k.type !== RT_VisualShapeAtom) continue;
    const r = k.r, o = k.start;
    const type = r.u32(o), refType = r.u32(o + 4), spid = r.u32(o + 8), d1 = r.i32(o + 12), d2 = r.i32(o + 16);
    if (refType === 2) return "";
    if (!w.ctx.hasShape(spid)) return null;
    let inner = "";
    if (type === 2) inner = textRangeXml(w.ctx.textOf(spid), d1, d2);
    else if (type === 6) inner = "<p:bg/>";
    else if (type === 5) inner = el("p:oleChartEl", { type: ["gridLegend", "series", "category", "ptInSeries", "ptInCategory"][d1] ?? "gridLegend", lvl: d2 > 0 ? d2 : void 0 });
    return `<p:tgtEl>${el("p:spTgt", { spid }, inner)}</p:tgtEl>`;
  }
  return "";
}
function textRangeXml(text, st, end) {
  if (text === void 0) return el("p:txEl", {}, el("p:charRg", { st, end }));
  const starts = [0];
  for (let i2 = 0; i2 < text.length; i2++) if (text[i2] === "\r") starts.push(i2 + 1);
  const paraAt = (pos) => {
    let p = 0;
    while (p + 1 < starts.length && starts[p + 1] <= pos) p++;
    return p;
  };
  const first = paraAt(st);
  const last = paraAt(Math.max(st, end - 1));
  const lastEnd = last + 1 < starts.length ? starts[last + 1] : text.length + 1;
  if (starts[first] === st && (end >= lastEnd || end === text.length)) {
    return el("p:txEl", {}, el("p:pRg", { st: first, end: last }));
  }
  return el("p:txEl", {}, el("p:charRg", { st, end }));
}
function condXml(c, w, tag = "p:cond") {
  const atom = children(c).find((k) => k.type === RT.TimeCondition);
  if (!atom) return null;
  const r = atom.r, o = atom.start;
  const trigObj = r.u32(o), evt = r.u32(o + 4), id = r.u32(o + 8), delay = r.i32(o + 12);
  let inner = "";
  if (trigObj === 1) {
    const t = targetXml(children(c).find((k) => k.type === RT.TimeClientVisualElement), w);
    if (t === null) return null;
    inner = t;
  } else if (trigObj === 2) inner = el("p:tn", { val: id });
  else if (trigObj === 3) inner = el("p:rtn", { val: ["first", "last", "all"][id] ?? "all" });
  return el(tag, { evt: TRIGGER_EVT[evt] || void 0, delay: delay === -1 ? "indefinite" : delay }, inner);
}
function condListXml(conds, tag, w) {
  const items = conds.map((c) => condXml(c, w)).filter((x2) => !!x2);
  return items.length ? el(tag, {}, items.join("")) : "";
}
var MAX_NODE_DEPTH = 64;
function readNode(rec, depth = 0) {
  const n = { restart: 0, type: 0, fill: 0, dur: 0, flags: 0, props: /* @__PURE__ */ new Map(), conds: /* @__PURE__ */ new Map(), modifiers: [], sub: [], kids: [] };
  if (depth > MAX_NODE_DEPTH) return n;
  for (const c of children(rec)) {
    switch (c.type) {
      case RT.TimeNode: {
        const r = c.r, o = c.start;
        n.restart = r.u32(o + 4);
        n.type = r.u32(o + 8);
        n.fill = r.u32(o + 12);
        n.dur = r.i32(o + 24);
        n.flags = r.u32(o + 28);
        break;
      }
      case RT.TimePropertyList:
        for (const v of children(c)) if (v.type === RT.TimeVariant) {
          const val = readVariant(v);
          if (val !== void 0) n.props.set(v.inst, val);
        }
        break;
      case RT.TimeSetBehaviorContainer:
      case RT.TimeAnimateBehaviorContainer:
      case RT.TimeEffectBehaviorContainer:
      case RT.TimeMotionBehaviorContainer:
      case RT.TimeRotationBehaviorContainer:
      case RT.TimeScaleBehaviorContainer:
      case RT.TimeColorBehaviorContainer:
      case RT.TimeCommandBehaviorContainer:
        n.behavior = c;
        break;
      case RT.TimeIterateData:
        n.iterate = c;
        break;
      case RT.TimeSequenceData:
        n.seqData = c;
        break;
      case RT.TimeConditionContainer: {
        const l = n.conds.get(c.inst) ?? [];
        l.push(c);
        n.conds.set(c.inst, l);
        break;
      }
      case RT.TimeModifier:
        n.modifiers.push({ type: c.r.u32(c.start), value: c.r.f32(c.start + 4) });
        break;
      case RT.SubEffectContainer:
        n.sub.push(readNode(c, depth + 1));
        break;
      case RT.ExtTimeNodeContainer:
        n.kids.push(readNode(c, depth + 1));
        break;
      case RT.TimeClientVisualElement:
        n.cve = c;
        break;
    }
  }
  return n;
}
function cTnAttrs(n, id) {
  const p = n.props;
  const num2 = (k) => typeof p.get(k) === "number" ? p.get(k) : void 0;
  const a = { id };
  const pc = num2(11), pid = num2(9), pst = num2(10);
  if (pid !== void 0) a["presetID"] = pid;
  if (pc !== void 0) a["presetClass"] = PRESET_CLASS[pc];
  if (pst !== void 0) a["presetSubtype"] = pst;
  if (n.flags & 2) a["restart"] = RESTART[n.restart] || void 0;
  if (n.flags & 16) a["dur"] = n.dur === -1 ? "indefinite" : n.dur;
  for (const m of n.modifiers) {
    switch (m.type) {
      case 0:
        if (m.value !== 1) a["repeatCount"] = m.value < 0 || !Number.isFinite(m.value) ? "indefinite" : Math.round(m.value * 1e3);
        break;
      case 1:
        a["repeatDur"] = m.value < 0 || !Number.isFinite(m.value) ? "indefinite" : Math.round(m.value);
        break;
      case 2:
        if (m.value !== 1) a["spd"] = Math.round(m.value * 1e5);
        break;
      case 3:
        if (m.value) a["accel"] = Math.round(m.value * 1e5);
        break;
      case 4:
        if (m.value) a["decel"] = Math.round(m.value * 1e5);
        break;
      case 5:
        if (m.value) a["autoRev"] = 1;
        break;
    }
  }
  if (n.flags & 1) a["fill"] = FILL[n.fill] || void 0;
  const tf = p.get(16), ef = p.get(17);
  if (typeof tf === "string") a["tmFilter"] = tf;
  if (typeof ef === "string") a["evtFilter"] = ef;
  const disp = p.get(2);
  if (disp === 1 || disp === false) a["display"] = 0;
  const mr = num2(5);
  if (mr !== void 0) a["masterRel"] = ["sameClick", "lastClick", "nextClick"][mr];
  const g = num2(19);
  if (g !== void 0) a["grpId"] = g;
  if (p.get(13) === true) a["afterEffect"] = 1;
  const nt = num2(20);
  if (nt !== void 0) a["nodeType"] = NODE_TYPE[nt];
  if (p.get(21) === true) a["nodePh"] = 1;
  return a;
}
function iterateXml(rec) {
  if (!rec) return "";
  const r = rec.r, o = rec.start;
  const interval = r.f32(o), type = r.u32(o + 4), dir = r.u32(o + 8), itype = r.u32(o + 12), f = r.u32(o + 16);
  const kid = itype === 1 ? el("p:tmPct", { val: Math.round(interval * 1e3) }) : el("p:tmAbs", { val: Math.round(interval * 1e3) });
  return el("p:iterate", { type: ["el", "wd", "lt"][type] ?? "el", backwards: f & 1 && dir === 1 ? 1 : void 0 }, kid);
}
function cTnXml(n, w, extraId) {
  const id = extraId ?? w.id();
  const attrsCTn = cTnAttrs(n, id);
  let body = condListXml(n.conds.get(1) ?? [], "p:stCondLst", w);
  body += condListXml(n.conds.get(2) ?? [], "p:endCondLst", w);
  const es = (n.conds.get(5) ?? [])[0];
  if (es) {
    const x2 = condXml(es, w, "p:endSync");
    if (x2) body += x2;
  }
  body += iterateXml(n.iterate);
  const kids = n.kids.map((k) => nodeXml(k, w)).filter(Boolean).join("");
  if (kids) body += el("p:childTnLst", {}, kids);
  const sub = n.sub.map((k) => nodeXml(k, w)).filter(Boolean).join("");
  if (sub) body += el("p:subTnLst", {}, sub);
  return el("p:cTn", attrsCTn, body);
}
function nodeXml(n, w) {
  switch (n.type) {
    case 0:
      return el("p:par", {}, cTnXml(n, w));
    case 1: {
      const sd = n.seqData;
      const a = {};
      if (sd) {
        const r = sd.r, o = sd.start;
        const conc = r.u32(o), next = r.u32(o + 4), prev = r.u32(o + 8), f = r.u32(o + 16);
        if (f & 1) a["concurrent"] = conc ? 1 : 0;
        if (f & 4) a["prevAc"] = prev === 1 ? "skipTimed" : "none";
        if (f & 2) a["nextAc"] = next === 1 ? "seek" : "none";
      }
      const inner = cTnXml(n, w) + condListXml(n.conds.get(4) ?? [], "p:prevCondLst", w) + condListXml(n.conds.get(3) ?? [], "p:nextCondLst", w);
      return el("p:seq", a, inner);
    }
    case 2:
      return el("p:excl", {}, cTnXml(n, w));
    case 3:
      return n.behavior ? behaviorXml(n, n.behavior, w) : "";
    case 4:
      return mediaXml(n, w);
    default:
      return "";
  }
}
function cBhvrXml(n, bc, w, props) {
  const id = w.id();
  let tgt = "";
  let names = [];
  const a = {};
  if (bc) {
    for (const k of children(bc)) {
      if (k.type === RT.TimeBehavior) {
        const r = k.r, o = k.start;
        const f = r.u32(o), add = r.u32(o + 4), acc = r.u32(o + 8), xf = r.u32(o + 12);
        if (f & 1) a["additive"] = ["base", "sum", "repl", "mult", "none"][add];
        if (f & 2) a["accumulate"] = acc === 1 ? "none" : "always";
        if (f & 8) a["xfrmType"] = xf === 1 ? "img" : "pt";
      } else if (k.type === RT.TimeVariantList) {
        names = children(k).filter((v) => v.type === RT.TimeVariant).map((v) => readVariant(v)).filter((v) => typeof v === "string");
      } else if (k.type === RT.TimeClientVisualElement) {
        const t = targetXml(k, w);
        if (t === null) return null;
        tgt = t;
      }
    }
  }
  const rctx = props.get(2);
  if (typeof rctx === "string" && rctx) a["rctx"] = rctx;
  if (props.get(6) === 1) a["override"] = "childStyle";
  const body = el("p:cTn", cTnAttrs(n, id), condListXml(n.conds.get(1) ?? [], "p:stCondLst", w) + condListXml(n.conds.get(2) ?? [], "p:endCondLst", w)) + tgt + (names.length ? el("p:attrNameLst", {}, names.map((s) => `<p:attrName>${escAttr(s)}</p:attrName>`).join("")) : "");
  return el("p:cBhvr", a, body);
}
function behaviorProps(bc) {
  const m = /* @__PURE__ */ new Map();
  if (!bc) return m;
  for (const k of children(bc)) {
    if (k.type !== RT.TimePropertyList) continue;
    for (const v of children(k)) {
      const val = v.type === RT.TimeVariant ? readVariant(v) : void 0;
      if (val !== void 0) m.set(v.inst, val);
    }
  }
  return m;
}
function variantVal(tag, v) {
  if (v === void 0) return "";
  if (v instanceof FloatVal) return el(tag, {}, el("p:fltVal", { val: fmtNum(v.v) }));
  if (typeof v === "boolean") return el(tag, {}, el("p:boolVal", { val: v ? 1 : 0 }));
  if (typeof v === "number") return el(tag, {}, Number.isInteger(v) ? el("p:intVal", { val: v }) : el("p:fltVal", { val: fmtNum(v) }));
  const m = /^#([0-9a-fA-F]{6})(?:\s*\[(\d+)\])?$/.exec(v.trim());
  if (m) {
    const idx = m[2] !== void 0 ? parseInt(m[2], 10) : void 0;
    const clr = idx !== void 0 && SCHEME_NAMES[idx] ? el("a:schemeClr", { val: SCHEME_NAMES[idx] }) : el("a:srgbClr", { val: m[1].toUpperCase() });
    return el(tag, {}, el("p:clrVal", {}, clr));
  }
  return el(tag, {}, el("p:strVal", { val: v }));
}
var pct = (v) => Math.round(v * 1e3);
var frac = (v) => Math.round(v * 1e5);
var SCHEME_NAMES = ["bg1", "tx1", "bg2", "tx2", "accent1", "accent2", "hlink", "folHlink"];
function colorStructXml(r, o, forBy) {
  const model = r.u32(o), c0 = r.i32(o + 4), c1 = r.i32(o + 8), c2 = r.i32(o + 12);
  if (model === 1 && forBy) {
    return el("p:hsl", { h: Math.round(c0 * 360 / 255 * 6e4), s: Math.round(c1 / 255 * 1e5), l: Math.round(c2 / 255 * 1e5) });
  }
  if (model === 2) return el("a:schemeClr", { val: SCHEME_NAMES[c0] ?? "tx1" });
  if (forBy) return el("p:rgb", { r: Math.round(c0 / 255 * 1e5), g: Math.round(c1 / 255 * 1e5), b: Math.round(c2 / 255 * 1e5) });
  const h = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0").toUpperCase();
  return el("a:srgbClr", { val: h(c0) + h(c1) + h(c2) });
}
function behaviorXml(n, rec, w) {
  const kids = children(rec);
  const bc = kids.find((k) => k.type === RT.TimeBehaviorContainer);
  const atom = kids.find((k) => k.type >= RT.TimeBehavior && k.type <= RT.TimeCommandBehavior && k.type !== RT.TimeBehavior);
  const vars2 = /* @__PURE__ */ new Map();
  const typed = /* @__PURE__ */ new Map();
  for (const k of kids) {
    if (k.type !== RT.TimeVariant) continue;
    const v = readVariant(k), t = readTypedVariant(k);
    if (v !== void 0) vars2.set(k.inst, v);
    if (t !== void 0) typed.set(k.inst, t);
  }
  const props = behaviorProps(bc);
  const r = atom?.r, o = atom?.start ?? 0;
  switch (rec.type) {
    case RT.TimeSetBehaviorContainer: {
      const cb = cBhvrXml(n, bc, w, props);
      return cb === null ? "" : el("p:set", {}, cb + variantVal("p:to", typed.get(1)));
    }
    case RT.TimeEffectBehaviorContainer: {
      const f = r?.u32(o) ?? 0, tr = r?.u32(o + 4) ?? 0;
      const rc = vars2.get(3);
      if (typeof rc === "string" && rc && !props.has(2)) props.set(2, rc);
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return "";
      const filter = vars2.get(1), progress = vars2.get(2), prLst = props.get(1);
      const a = {
        transition: f & 1 ? ["in", "out", "none"][tr] : void 0,
        filter: typeof filter === "string" ? filter : void 0,
        prLst: typeof prLst === "string" && prLst ? prLst : void 0
      };
      return el("p:animEffect", a, cb + (typeof progress === "number" ? el("p:progress", {}, el("p:fltVal", { val: fmtNum(progress) })) : ""));
    }
    case RT.TimeAnimateBehaviorContainer: {
      const calc = r?.u32(o) ?? 1, f = r?.u32(o + 4) ?? 0, vt = r?.u32(o + 8) ?? 1;
      const a = {
        calcmode: f & 8 ? ["discrete", "lin", "fmla"][calc] : void 0,
        valueType: f & 32 ? ["str", "num", "clr"][vt] : void 0
      };
      const by = vars2.get(1), from = vars2.get(2), to = vars2.get(3);
      if (typeof by === "string") a["by"] = by;
      if (typeof from === "string") a["from"] = from;
      if (typeof to === "string") a["to"] = to;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return "";
      let tav = "";
      const list = kids.find((k) => k.type === RT.TimeAnimationValueList);
      if (list) {
        let cur;
        const items = [];
        for (const k of children(list)) {
          if (k.type === RT.TimeAnimationValue) {
            cur = { tm: k.r.i32(k.start) };
            items.push(cur);
          } else if (k.type === RT.TimeVariant && cur) {
            if (k.inst === 0) cur.val = readTypedVariant(k);
            else if (k.inst === 1) {
              const v = readVariant(k);
              if (typeof v === "string" && v) cur.fmla = v;
            }
          }
        }
        tav = el("p:tavLst", {}, items.map((it) => el("p:tav", { tm: it.tm * 100, fmla: it.fmla }, variantVal("p:val", it.val))).join(""));
      }
      return el("p:anim", a, cb + tav);
    }
    case RT.TimeScaleBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const v = (i2) => r?.f32(o + 4 + i2 * 4) ?? 0;
      const zoom = r?.u8(o + 28) ?? 0;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return "";
      let inner = cb;
      if (f & 1) inner += el("p:by", { x: pct(v(0)), y: pct(v(1)) });
      if (f & 2) inner += el("p:from", { x: pct(v(2)), y: pct(v(3)) });
      if (f & 4) inner += el("p:to", { x: pct(v(4)), y: pct(v(5)) });
      return el("p:animScale", { zoomContents: f & 8 ? zoom ? 1 : 0 : void 0 }, inner);
    }
    case RT.TimeRotationBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const v = (i2) => r?.f32(o + 4 + i2 * 4) ?? 0;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return "";
      return el("p:animRot", {
        by: f & 1 ? Math.round(v(0) * 6e4) : void 0,
        from: f & 2 ? Math.round(v(1) * 6e4) : void 0,
        to: f & 4 ? Math.round(v(2) * 6e4) : void 0
      }, cb);
    }
    case RT.TimeMotionBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const v = (i2) => r?.f32(o + 4 + i2 * 4) ?? 0;
      const origin = r?.u32(o + 28) ?? 0;
      const path = vars2.get(1), pts = props.get(10), rel = props.get(3);
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return "";
      let inner = cb;
      if (f & 1) inner += el("p:by", { x: frac(v(0)), y: frac(v(1)) });
      if (f & 2) inner += el("p:from", { x: frac(v(2)), y: frac(v(3)) });
      if (f & 4) inner += el("p:to", { x: frac(v(4)), y: frac(v(5)) });
      return el("p:animMotion", {
        origin: f & 8 ? origin === 2 ? "layout" : "parent" : void 0,
        path: typeof path === "string" ? path : void 0,
        pathEditMode: rel === void 0 ? void 0 : rel ? "relative" : "fixed",
        ptsTypes: typeof pts === "string" ? pts : void 0
      }, inner);
    }
    case RT.TimeColorBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null || !r) return "";
      let inner = cb;
      if (f & 1) inner += el("p:by", {}, colorStructXml(r, o + 4, true));
      if (f & 2) inner += el("p:from", {}, colorStructXml(r, o + 20, false));
      if (f & 4) inner += el("p:to", {}, colorStructXml(r, o + 36, false));
      const spc = props.get(4), dir = props.get(5);
      return el("p:animClr", {
        clrSpc: spc === void 0 ? void 0 : spc === 1 ? "hsl" : "rgb",
        dir: dir === void 0 ? void 0 : dir === 1 ? "ccw" : "cw"
      }, inner);
    }
    case RT.TimeCommandBehaviorContainer: {
      const f = r?.u32(o) ?? 0, t = r?.u32(o + 4) ?? 0;
      const cmd = vars2.get(2) ?? vars2.get(1);
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return "";
      return el("p:cmd", { type: f & 1 ? ["evt", "call", "verb"][t] : void 0, cmd: typeof cmd === "string" ? cmd : void 0 }, cb);
    }
  }
  return "";
}
function mediaXml(n, w) {
  let kind = "p:video";
  let tgt = "";
  if (n.cve) {
    for (const k of children(n.cve)) {
      if (k.type === RT_VisualShapeAtom && k.r.u32(k.start) === 3) kind = "p:audio";
    }
    const t = targetXml(n.cve, w);
    if (t === null) return "";
    tgt = t;
  }
  const vol = n.props.get(22), mute = n.props.get(23), hide = n.props.get(18), sld = n.props.get(15);
  const cm = el("p:cMediaNode", {
    vol: typeof vol === "number" ? Math.round(vol * 1e5) : void 0,
    mute: mute === true ? 1 : void 0,
    numSld: typeof sld === "number" && sld !== 1 ? sld : void 0,
    showWhenStopped: hide === true ? 0 : void 0
  }, cTnXml(n, w) + tgt);
  return el(kind, {}, cm);
}
var RT_VisualShapeAtom = 11003;
var RT_VisualPageAtom = 11009;
function buildListXml(rec, ctx) {
  const out = [];
  for (const b of children(rec)) {
    const kids = children(b);
    const ba = kids.find((k) => k.type === RT.BuildAtom);
    if (!ba) continue;
    const grpId = ba.r.u32(ba.start + 4), spid = ba.r.u32(ba.start + 8), uiExp = ba.r.u8(ba.start + 13);
    if (!ctx.hasShape(spid)) continue;
    if (b.type === RT.ParaBuild) {
      const pa = kids.find((k) => k.type === RT.ParaBuildAtom);
      const a = { spid, grpId };
      if (uiExp) a["uiExpand"] = 1;
      if (pa) {
        const r = pa.r, o = pa.start;
        const build = r.u32(o), lvl = r.u32(o + 4), delay = r.u32(o + 12);
        a["build"] = build === 3 ? void 0 : ["allAtOnce", "p", "cust"][build];
        if (lvl > 1) a["bldLvl"] = lvl;
        if (r.u8(o + 8)) a["animBg"] = 1;
        if (r.u8(o + 9)) a["rev"] = 1;
        if (r.u8(o + 11)) a["advAuto"] = delay;
      }
      out.push(el("p:bldP", a));
    } else if (b.type === RT.ChartBuild) {
      const ca = kids.find((k) => k.type === RT.ChartBuildAtom);
      const t = ca ? ca.r.u32(ca.start) : 0;
      const bg = ca ? ca.r.u8(ca.start + 4) : 0;
      const bld = ["", "series", "category", "seriesEl", "categoryEl"][t];
      out.push(el("p:bldGraphic", { spid, grpId }, bld ? el("p:bldSub", {}, el("a:bldChart", { bld, animBg: bg ? void 0 : 0 })) : "<p:bldAsOne/>"));
    } else if (b.type === RT.DiagramBuild) {
      const da = kids.find((k) => k.type === RT.DiagramBuildAtom);
      const t = da ? da.r.u32(da.start) : 0;
      const bld = ["", "depthByNode", "depthByBranch", "breadthByNode", "breadthByLvl", "cw", "cwIn", "cwOut", "ccw", "ccwIn", "ccwOut", "inByRing", "outByRing", "up", "down", "allAtOnce", "cust"][t];
      out.push(el("p:bldGraphic", { spid, grpId }, bld ? el("p:bldSub", {}, el("a:bldDgm", { bld })) : "<p:bldAsOne/>"));
    } else {
      out.push(el("p:bldOleChart", { spid, grpId }));
    }
  }
  return out.length ? el("p:bldLst", {}, out.join("")) : "";
}
function pp10Records(slide) {
  const blob = slide.binaryTags.get("___PPT10");
  return blob ? recsIn(blob.r, blob.start, blob.end) : [];
}
function buildTimingXml(slide, ctx) {
  if (!ctx) return "";
  const recs = pp10Records(slide);
  const root = recs.find((r) => r.type === RT.ExtTimeNodeContainer);
  if (!root) return "";
  const w = new Writer(ctx);
  const tree = nodeXml(readNode(root), w);
  if (!tree || !/<p:(set|anim|animEffect|animMotion|animRot|animScale|animClr|cmd|video|audio)\b/.test(tree)) return "";
  const bl = recs.find((r) => r.type === RT.BuildList);
  return el("p:timing", {}, el("p:tnLst", {}, tree) + (bl ? buildListXml(bl, ctx) : ""));
}

// ../slides-core/src/xml.ts
var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e) => {
    if (e.startsWith("#x") || e.startsWith("#X")) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#")) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? `&${e};`;
  });
}
function parseXml(xml) {
  let i2 = 0;
  const n = xml.length;
  function error(msg) {
    throw new Error(`XML invalido @${i2}: ${msg}`);
  }
  function skipMisc() {
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      if (xml.startsWith("<?", i2)) {
        i2 = xml.indexOf("?>", i2);
        if (i2 < 0) error("?> nao fechado");
        i2 += 2;
      } else if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2);
        if (i2 < 0) error("--> nao fechado");
        i2 += 3;
      } else if (xml.startsWith("<!", i2)) {
        i2 = xml.indexOf(">", i2);
        if (i2 < 0) error("<! nao fechado");
        i2 += 1;
      } else break;
    }
  }
  function parseElement() {
    if (xml[i2] !== "<") error("esperava <");
    i2++;
    const nameStart = i2;
    while (i2 < n && !/[\s/>]/.test(xml[i2])) i2++;
    const name = xml.slice(nameStart, i2);
    const attrs2 = {};
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      if (xml[i2] === "/") {
        if (xml[i2 + 1] !== ">") error("esperava />");
        i2 += 2;
        return { name, attrs: attrs2, children: [] };
      }
      if (xml[i2] === ">") {
        i2++;
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
      if (i2 < 0) error("aspas nao fechadas");
      attrs2[aName] = decodeEntities(xml.slice(vStart, i2));
      i2++;
    }
    const children2 = [];
    for (; ; ) {
      if (i2 >= n) error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        i2 = xml.indexOf(">", i2) + 1;
        return { name, attrs: attrs2, children: children2 };
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
        children2.push(parseElement());
        continue;
      }
      const tStart = i2;
      while (i2 < n && xml[i2] !== "<") i2++;
      const text = decodeEntities(xml.slice(tStart, i2));
      if (text.length > 0) children2.push(text);
    }
  }
  skipMisc();
  return parseElement();
}
function childElements(el2, name) {
  return el2.children.filter((c) => typeof c !== "string" && (name === void 0 || c.name === name));
}
function firstChild(el2, name) {
  return childElements(el2, name)[0];
}
function descend(el2, name) {
  for (const c of el2.children) {
    if (typeof c === "string") continue;
    if (c.name === name) return c;
    const found = descend(c, name);
    if (found) return found;
  }
  return void 0;
}
function textContent(el2) {
  let out = "";
  for (const c of el2.children) out += typeof c === "string" ? c : textContent(c);
  return out;
}

// ../slides-core/src/ppt/roundtrip.ts
function zipPartText(bytes, suffix) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 80 || bytes[1] !== 75) return void 0;
  try {
    const parts = unzipSync(bytes, { filter: (f) => f.name.endsWith(suffix) });
    const name = Object.keys(parts)[0];
    return name ? strFromU8(parts[name]) : void 0;
  } catch {
    return void 0;
  }
}
function roundTripThemeXml(bytes) {
  const xml = zipPartText(bytes, "theme1.xml");
  if (!xml || !xml.includes("<a:theme")) return void 0;
  try {
    parseXml(xml);
  } catch {
    return void 0;
  }
  return xml;
}
var metroCache = /* @__PURE__ */ new WeakMap();
function metroShape(sh) {
  const hit = metroCache.get(sh);
  if (hit !== void 0) return hit ?? void 0;
  let root = null;
  const blob = sh.props.get(937)?.complex;
  const xml = zipPartText(blob, "shapexml.xml");
  if (xml) {
    try {
      root = parseXml(xml);
    } catch {
      root = null;
    }
  }
  metroCache.set(sh, root);
  return root ?? void 0;
}
function metroSpPr(sh) {
  const root = metroShape(sh);
  return root ? firstChild(root, "p:spPr") : void 0;
}
var FILL_TAGS = ["a:noFill", "a:solidFill", "a:gradFill", "a:pattFill"];
var LINE_FILLS = ["a:noFill", "a:solidFill", "a:gradFill", "a:pattFill"];
function metroVisual(sh) {
  const spPr = metroSpPr(sh);
  if (!spPr) return void 0;
  const v = {};
  const geom = firstChild(spPr, "a:prstGeom") ?? firstChild(spPr, "a:custGeom");
  if (geom) v.geometry = serializeXml(geom);
  const fill = FILL_TAGS.map((t) => firstChild(spPr, t)).find((x2) => x2 !== void 0);
  if (fill) v.fill = serializeXml(fill);
  const ln2 = firstChild(spPr, "a:ln");
  if (ln2 && childElements(ln2).some((c) => LINE_FILLS.includes(c.name))) v.line = serializeXml(ln2);
  const eff = firstChild(spPr, "a:effectLst");
  if (eff) v.effects = serializeXml(eff);
  const xfrm = firstChild(spPr, "a:xfrm");
  const off = xfrm ? firstChild(xfrm, "a:off") : void 0;
  const ext = xfrm ? firstChild(xfrm, "a:ext") : void 0;
  if (xfrm && off && ext) {
    const n = (e, a) => parseInt(e.attrs[a] ?? "0", 10) || 0;
    v.xfrm = {
      x: n(off, "x"),
      y: n(off, "y"),
      cx: n(ext, "cx"),
      cy: n(ext, "cy"),
      rot: (parseInt(xfrm.attrs["rot"] ?? "0", 10) || 0) / 6e4,
      flipH: xfrm.attrs["flipH"] === "1",
      flipV: xfrm.attrs["flipV"] === "1"
    };
  }
  return v;
}
function metroTextBody(sh, text) {
  const root = metroShape(sh);
  const tx = root ? firstChild(root, "p:txBody") : void 0;
  if (!tx) return void 0;
  const paras = childElements(tx, "a:p");
  const bin = text.split("\r");
  if (paras.length !== bin.length) return void 0;
  const out = { name: tx.name, attrs: tx.attrs, children: [] };
  let pi = 0;
  for (const c of tx.children) {
    if (typeof c === "string") continue;
    if (c.name !== "a:p") {
      out.children.push(c);
      continue;
    }
    const bt = bin[pi++] ?? "";
    let pos = 0;
    const np = { name: c.name, attrs: c.attrs, children: [] };
    for (const k of c.children) {
      if (typeof k === "string") continue;
      if (k.name === "a:r" || k.name === "a:fld") {
        const t = firstChild(k, "a:t");
        const len = t ? t.children.filter((x2) => typeof x2 === "string").join("").length : 0;
        const seg = bt.slice(pos, pos + len);
        pos += len;
        np.children.push({ name: k.name, attrs: k.attrs, children: k.children.map((x2) => typeof x2 !== "string" && x2.name === "a:t" ? { name: "a:t", attrs: {}, children: seg ? [seg] : [] } : x2) });
      } else if (k.name === "a:br") {
        if (bt[pos] !== "\v") return void 0;
        pos++;
        np.children.push(k);
      } else np.children.push(k);
    }
    if (pos !== bt.length) return void 0;
    out.children.push(np);
  }
  const xml = serializeXml(out);
  if (/\br:(id|embed|link)=/.test(xml)) return void 0;
  return xml;
}
function serializeXml(el2) {
  let out = `<${el2.name}`;
  for (const [k, v] of Object.entries(el2.attrs)) out += ` ${k}="${escAttr(v)}"`;
  if (!el2.children.length) return out + "/>";
  out += ">";
  for (const c of el2.children) out += typeof c === "string" ? escText(c) : serializeXml(c);
  return out + `</${el2.name}>`;
}

// ../slides-core/src/ppt/preset-map.ts
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
        const val = v ?? dflt2[i2];
        if (val === void 0) return;
        out.av.push({ name: vals.length === 1 ? "adj" : `adj${i2 + 1}`, val: Math.round(val) });
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

// ../slides-core/src/ppt/context.ts
var PartRels = class {
  list = [];
  add(type, target, external = false) {
    const found = this.list.find((r) => r.type === type && r.target === target && !!r.external === external);
    if (found) return found.id;
    const id = `rId${this.list.length + 1}`;
    const rel = { id, type, target };
    if (external) rel.external = true;
    this.list.push(rel);
    return id;
  }
  xml() {
    return XML_DECL + el(
      "Relationships",
      { xmlns: NS.rel },
      this.list.map((r) => el("Relationship", {
        Id: r.id,
        Type: r.type.startsWith("http") ? r.type : `${NS.relType}/${r.type}`,
        Target: r.target,
        TargetMode: r.external ? "External" : void 0
      })).join("")
    );
  }
};
var DEFAULT_SCHEME = ["FFFFFF", "000000", "808080", "000000", "00CC99", "3333CC", "CCCCFF", "B2B2B2"];
function newPartCtx(conv, scheme, styles, outline, slideNumber, rels = new PartRels()) {
  const text = { doc: conv.doc, scheme, linkRel: (target) => rels.add("hyperlink", target, true) };
  if (styles) text.styles = styles;
  if (slideNumber !== void 0) text.slideNumber = slideNumber;
  return { conv, rels, text, scheme, outline, usedIds: /* @__PURE__ */ new Set([1]), spids: /* @__PURE__ */ new Set(), texts: /* @__PURE__ */ new Map() };
}

// ../slides-core/src/ppt/shapeconv.ts
var prop = (sh, id) => sh.props.get(id)?.value;
var propS = (sh, id) => {
  const v = sh.props.get(id)?.value;
  return v === void 0 ? void 0 : v | 0;
};
function boolProp(sh, id, bit, dflt2) {
  const p = sh.props.get(id);
  if (!p) return dflt2;
  const v = p.value;
  if (v & 1 << bit + 16) return (v & 1 << bit) !== 0;
  if (v >>> 16 === 0) return (v & 1 << bit) !== 0;
  return dflt2;
}
var fixed = (v, dflt2 = 0) => v === void 0 ? dflt2 : (v | 0) / 65536;
function propString(p) {
  if (!p?.complex || p.complex.length < 2) return void 0;
  const r = new ByteReader(p.complex);
  let s = utf16(r, 0, p.complex.length);
  const z = s.indexOf("\0");
  if (z >= 0) s = s.slice(0, z);
  return s || void 0;
}
function msoArray(p) {
  if (!p?.complex || p.complex.length < 6) return void 0;
  const r = new ByteReader(p.complex);
  const n = r.u16(0);
  let size = r.u16(4);
  if (size === 65520) size = 4;
  if (size === 0) return void 0;
  return { n: Math.min(n, Math.floor((p.complex.length - 6) / size)), size, r, off: 6 };
}
var SYS_COLORS = [
  "C8C8C8",
  "000000",
  "99B4D1",
  "BFCDDB",
  "F0F0F0",
  "FFFFFF",
  "646464",
  "000000",
  "000000",
  "000000",
  "B4B4B4",
  "F4F7FC",
  "ABABAB",
  "3399FF",
  "FFFFFF",
  "F0F0F0",
  "A0A0A0",
  "6D6D6D",
  "000000",
  "434E54",
  "FFFFFF",
  "696969",
  "E3E3E3",
  "000000",
  "FFFFE1"
];
function oaColor(value, sh, pc, depth = 0) {
  const flags = value >>> 24 & 255;
  const r = value & 255, g = value >>> 8 & 255, b = value >>> 16 & 255;
  if (flags & 8) return pc.scheme[r] ?? DEFAULT_SCHEME[r] ?? "000000";
  if (flags & 16) {
    const idx = value & 255;
    const fn = value >>> 8 & 15;
    const invert = (value >>> 8 & 32) !== 0;
    const param = value >>> 16 & 255;
    let base;
    const sub = (id, d) => depth > 2 ? "000000" : oaColor(prop(sh, id) ?? d, sh, pc, depth + 1);
    switch (idx) {
      case 240:
        base = sub(385, 16777215);
        break;
      case 241:
        base = boolProp(sh, 511, 3, true) ? sub(448, 0) : sub(385, 16777215);
        break;
      case 242:
        base = sub(448, 0);
        break;
      case 243:
        base = sub(513, 8421504);
        break;
      case 245:
        base = sub(387, 16777215);
        break;
      case 246:
        base = sub(450, 16777215);
        break;
      case 247:
        base = boolProp(sh, 447, 4, true) ? sub(385, 16777215) : sub(448, 0);
        break;
      default:
        base = SYS_COLORS[idx] ?? "000000";
    }
    let [cr, cg, cb] = [0, 2, 4].map((i2) => parseInt(base.slice(i2, i2 + 2), 16));
    const f = (c) => {
      switch (fn) {
        case 1:
          return c * param / 255;
        // escurecer
        case 2:
          return 255 - (255 - c) * param / 255;
        // clarear
        case 3:
          return c + param;
        // somar cinza
        case 4:
          return c - param;
        // subtrair cinza
        case 5:
          return param - c;
        // subtração reversa
        case 6:
          return c < param ? 0 : 255;
        // limiar
        default:
          return c;
      }
    };
    [cr, cg, cb] = [f(cr), f(cg), f(cb)];
    if (invert) [cr, cg, cb] = [255 - cr, 255 - cg, 255 - cb];
    const clamp = (c) => Math.max(0, Math.min(255, Math.round(c)));
    return hex3(clamp(cr), clamp(cg), clamp(cb));
  }
  return hex3(r, g, b);
}
function srgb(val, alpha) {
  return alpha !== void 0 && alpha < 1 ? el("a:srgbClr", { val }, el("a:alpha", { val: Math.round(alpha * 1e5) })) : el("a:srgbClr", { val });
}
function mediaFor(conv, pib) {
  const hit = conv.media.get(pib);
  if (hit) return hit;
  const blip = conv.doc.blips[pib - 1];
  if (!blip) return void 0;
  const path = `ppt/media/image${conv.media.size + 1}.${blip.ext}`;
  conv.media.set(pib, path);
  conv.parts.set(path, blip.bytes);
  conv.mediaExts.add(blip.ext);
  return path;
}
function imageRel(pc, pib) {
  const path = mediaFor(pc.conv, pib);
  if (!path) return void 0;
  return pc.rels.add("image", "../media/" + path.slice("ppt/media/".length));
}
function gradientStops(sh, pc, fill, back, fillA, backA) {
  const arr = msoArray(sh.props.get(407));
  const stops = [];
  if (arr && arr.size === 8 && arr.n >= 2) {
    for (let i2 = 0; i2 < arr.n; i2++) {
      const o = arr.off + i2 * 8;
      stops.push({ color: oaColor(arr.r.u32(o), sh, pc), pos: fixed(arr.r.u32(o + 4)) });
    }
  } else {
    const focus = propS(sh, 396) ?? 0;
    const f = { color: fill, alpha: fillA }, b = { color: back, alpha: backA };
    if (focus === 0) stops.push({ pos: 0, ...f }, { pos: 1, ...b });
    else if (focus >= 100 || focus <= -100) stops.push({ pos: 0, ...b }, { pos: 1, ...f });
    else if (focus > 0) stops.push({ pos: 0, ...b }, { pos: focus / 100, ...f }, { pos: 1, ...b });
    else stops.push({ pos: 0, ...f }, { pos: 1 + focus / 100, ...b }, { pos: 1, ...f });
  }
  stops.sort((x2, y) => x2.pos - y.pos);
  return el("a:gsLst", {}, stops.map((s) => el("a:gs", { pos: Math.round(Math.max(0, Math.min(1, s.pos)) * 1e5) }, srgb(s.color, s.alpha))).join(""));
}
function fillXml(sh, pc, isBackground = false) {
  if (!isBackground && !boolProp(sh, 447, 4, true)) return "<a:noFill/>";
  const type = prop(sh, 384) ?? 0;
  const color = oaColor(prop(sh, 385) ?? 16777215, sh, pc);
  const opacity = fixed(prop(sh, 386), 1);
  const back = oaColor(prop(sh, 387) ?? 16777215, sh, pc);
  const backOpacity = fixed(prop(sh, 388), 1);
  switch (type) {
    case 2:
    case 3: {
      const pib = prop(sh, 390);
      const rid = pib ? imageRel(pc, pib) : void 0;
      if (!rid) return el("a:solidFill", {}, srgb(color, opacity));
      return el(
        "a:blipFill",
        { dpi: 0, rotWithShape: 1 },
        el("a:blip", { "r:embed": rid }) + "<a:srcRect/>" + (type === 2 ? '<a:tile tx="0" ty="0" sx="100000" sy="100000" flip="none" algn="tl"/>' : "<a:stretch><a:fillRect/></a:stretch>")
      );
    }
    case 4:
    case 5:
    case 6:
    case 7:
    case 8: {
      if (type === 4 || type === 7 || type === 8) {
        const ang = ((270 + fixed(prop(sh, 395))) % 360 + 360) % 360;
        const gs2 = gradientStops(sh, pc, color, back, opacity, backOpacity);
        return el("a:gradFill", { flip: "none", rotWithShape: 1 }, gs2 + el("a:lin", { ang: Math.round(ang * 6e4) % 216e5, scaled: type === 7 ? 1 : 0 }));
      }
      const gs = gradientStops(sh, pc, back, color, backOpacity, opacity);
      const l = fixed(prop(sh, 397)), t = fixed(prop(sh, 398)), r = fixed(prop(sh, 399)), b = fixed(prop(sh, 400));
      return el("a:gradFill", { flip: "none", rotWithShape: 1 }, gs + el(
        "a:path",
        { path: type === 6 ? "shape" : "rect" },
        el("a:fillToRect", { l: Math.round(l * 1e5), t: Math.round(t * 1e5), r: Math.round((1 - r) * 1e5), b: Math.round((1 - b) * 1e5) })
      ));
    }
    case 9:
      return pc.bgColor ? el("a:solidFill", {}, srgb(pc.bgColor)) : "<a:noFill/>";
    case 1:
    // padrão (bitmap 8×8): aproximado pela cor de frente
    default:
      return el("a:solidFill", {}, srgb(color, opacity));
  }
}
var DASH = ["solid", "sysDash", "sysDot", "sysDashDot", "sysDashDotDot", "dot", "dash", "lgDash", "dashDot", "lgDashDot", "lgDashDotDot"];
var ARROW = ["none", "triangle", "stealth", "diamond", "oval", "arrow"];
var ARROW_SZ = ["sm", "med", "lg"];
function arrowEnd(tag, sh, typeId, wId, lenId) {
  const t = prop(sh, typeId) ?? 0;
  if (!t) return "";
  const w = prop(sh, wId), len = prop(sh, lenId);
  return el(tag, {
    type: ARROW[t] ?? "triangle",
    w: w !== void 0 && w !== 1 ? ARROW_SZ[w] : void 0,
    len: len !== void 0 && len !== 1 ? ARROW_SZ[len] : void 0
  });
}
function lineXml(sh, pc, dfltOn) {
  if (!boolProp(sh, 511, 3, dfltOn)) return "<a:ln><a:noFill/></a:ln>";
  const w = prop(sh, 459) ?? 9525;
  const color = oaColor(prop(sh, 448) ?? 0, sh, pc);
  const alpha = fixed(prop(sh, 449), 1);
  const dash = prop(sh, 462) ?? 0;
  const cap = prop(sh, 471);
  const cmpd = prop(sh, 461);
  const join = prop(sh, 470);
  let kids = el("a:solidFill", {}, srgb(color, alpha));
  kids += el("a:prstDash", { val: DASH[dash] ?? "solid" });
  if (join === 0) kids += "<a:bevel/>";
  else if (join === 1) kids += '<a:miter lim="800000"/>';
  else kids += "<a:round/>";
  kids += arrowEnd("a:headEnd", sh, 464, 466, 467);
  kids += arrowEnd("a:tailEnd", sh, 465, 468, 469);
  return el("a:ln", {
    w,
    cap: cap === 0 ? "rnd" : cap === 1 ? "sq" : void 0,
    cmpd: cmpd ? ["sng", "dbl", "thickThin", "thinThick", "tri"][cmpd] : void 0
  }, kids);
}
function shadowXml(sh, pc) {
  if (!boolProp(sh, 575, 1, false)) return "";
  const color = oaColor(prop(sh, 513) ?? 8421504, sh, pc);
  const alpha = fixed(prop(sh, 516), 1);
  const ox = propS(sh, 517) ?? 25400;
  const oy = propS(sh, 518) ?? 25400;
  const dist = Math.round(Math.hypot(ox, oy));
  let dir = Math.round(Math.atan2(oy, ox) * 180 / Math.PI * 6e4);
  if (dir < 0) dir += 216e5;
  const blur = prop(sh, 540) ?? 0;
  const oxr = fixed(prop(sh, 528)), oyr = fixed(prop(sh, 529));
  const algn = (oyr < -0.25 ? "t" : oyr > 0.25 ? "b" : "") + (oxr < -0.25 ? "l" : oxr > 0.25 ? "r" : "");
  const sx = prop(sh, 521), sy = prop(sh, 524);
  return el("a:effectLst", {}, el("a:outerShdw", {
    blurRad: blur || void 0,
    dist,
    dir,
    sx: sx !== void 0 && sx !== 65536 ? Math.round(fixed(sx) * 1e5) : void 0,
    sy: sy !== void 0 && sy !== 65536 ? Math.round(fixed(sy) * 1e5) : void 0,
    algn: algn || "ctr",
    rotWithShape: 0
  }, srgb(color, alpha)));
}
function rotationDeg(sh) {
  const r = fixed(prop(sh, 4));
  return (r % 360 + 360) % 360;
}
function anchorXf(sh) {
  const a = sh.anchor;
  if (!a) return void 0;
  let x2 = Math.min(a.l, a.r), y = Math.min(a.t, a.b);
  let w = Math.abs(a.r - a.l), h = Math.abs(a.b - a.t);
  const rot = rotationDeg(sh);
  if (rot >= 45 && rot < 135 || rot >= 225 && rot < 315) {
    const cx = x2 + w / 2, cy = y + h / 2;
    [w, h] = [h, w];
    x2 = cx - w / 2;
    y = cy - h / 2;
  }
  return {
    x: emu(x2),
    y: emu(y),
    cx: emu(w),
    cy: emu(h),
    rot,
    flipH: (sh.flags & FSP.flipH) !== 0,
    flipV: (sh.flags & FSP.flipV) !== 0
  };
}
function xfrmXml(xf, tag = "a:xfrm", inner = "") {
  const rot = Math.round(xf.rot * 6e4) % 216e5;
  return el(
    tag,
    { rot: rot || void 0, flipH: xf.flipH || void 0, flipV: xf.flipV || void 0 },
    el("a:off", { x: xf.x, y: xf.y }) + el("a:ext", { cx: xf.cx, cy: xf.cy }) + inner
  );
}
function rawAdjust(sh) {
  const out = [];
  for (let i2 = 0; i2 < 10; i2++) {
    const v = sh.props.get(327 + i2)?.value;
    out.push(v === void 0 ? void 0 : v | 0);
  }
  return out;
}
function custGeomXml(sh) {
  const verts = msoArray(sh.props.get(325));
  if (!verts || verts.n === 0) return void 0;
  const pts = [];
  for (let i2 = 0; i2 < verts.n; i2++) {
    const o = verts.off + i2 * verts.size;
    if (verts.size >= 8) pts.push([verts.r.i32(o), verts.r.i32(o + 4)]);
    else pts.push([verts.r.i16(o), verts.r.i16(o + 2)]);
  }
  const gl = propS(sh, 320) ?? 0, gt = propS(sh, 321) ?? 0;
  const gr = propS(sh, 322) ?? 21600, gb = propS(sh, 323) ?? 21600;
  const w = Math.max(1, gr - gl), h = Math.max(1, gb - gt);
  const pt = (p) => el("a:pt", { x: Math.round((p?.[0] ?? 0) - gl), y: Math.round((p?.[1] ?? 0) - gt) });
  const segs = msoArray(sh.props.get(326));
  const paths = [];
  let cur = "";
  let noFill = false, noLine = false;
  const endPath = () => {
    if (cur) paths.push(el("a:path", { w, h, fill: noFill ? "none" : void 0, stroke: noLine ? "0" : void 0 }, cur));
    cur = "";
    noFill = false;
    noLine = false;
  };
  let pi = 0;
  if (!segs || segs.n === 0) {
    cur += el("a:moveTo", {}, pt(pts[0]));
    for (pi = 1; pi < pts.length; pi++) cur += el("a:lnTo", {}, pt(pts[pi]));
    const sp = prop(sh, 324) ?? 1;
    if (sp === 1 || sp === 3) cur += "<a:close/>";
    endPath();
  } else {
    for (let i2 = 0; i2 < segs.n && pi <= pts.length; i2++) {
      const s = segs.size >= 4 ? segs.r.u32(segs.off + i2 * segs.size) : segs.r.u16(segs.off + i2 * segs.size);
      const type = segs.size >= 4 ? s >>> 29 & 7 : s >>> 13 & 7;
      const count = segs.size >= 4 ? s & 536870911 : s & 8191;
      switch (type) {
        case 0:
          for (let k = 0; k < Math.max(1, count) && pi < pts.length; k++) cur += el("a:lnTo", {}, pt(pts[pi++]));
          break;
        case 1:
          for (let k = 0; k < Math.max(1, count) && pi + 2 < pts.length; k++) {
            cur += el("a:cubicBezTo", {}, pt(pts[pi]) + pt(pts[pi + 1]) + pt(pts[pi + 2]));
            pi += 3;
          }
          break;
        case 2:
          cur += el("a:moveTo", {}, pt(pts[pi++]));
          break;
        case 3:
          cur += "<a:close/>";
          break;
        case 4:
          endPath();
          break;
        case 5: {
          const code = s >>> 8 & 31;
          const n = s & 255;
          if (code === 10) noFill = true;
          else if (code === 11) noLine = true;
          else pi += n;
          break;
        }
        default:
          break;
      }
    }
    endPath();
  }
  if (!paths.length) return void 0;
  return el("a:custGeom", {}, '<a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/>' + el("a:pathLst", {}, paths.join("")));
}
function geometryXml(sh, xf) {
  if (sh.type === 0 || !presetFor(sh.type, [], 1, 1)) {
    const cg = custGeomXml(sh);
    if (cg) return { xml: cg, flipV: false };
  }
  const pr = presetFor(sh.type, rawAdjust(sh), xf?.cx || 1, xf?.cy || 1) ?? { prst: "rect", av: [] };
  const av = pr.av.map((g) => el("a:gd", { name: g.name, fmla: `val ${g.val}` })).join("");
  return { xml: el("a:prstGeom", { prst: pr.prst }, el("a:avLst", {}, av)), flipV: !!pr.flipV };
}
var ANCHOR = {
  0: ["t", false],
  1: ["ctr", false],
  2: ["b", false],
  3: ["t", true],
  4: ["ctr", true],
  5: ["b", true],
  6: ["t", false],
  7: ["b", false],
  8: ["t", true],
  9: ["b", true]
};
function bodyPrXml(sh) {
  const [anchor, anchorCtr] = ANCHOR[prop(sh, 135) ?? 0] ?? ["t", false];
  const flow = prop(sh, 136) ?? 0;
  const vert = flow === 1 || flow === 3 || flow === 5 ? "vert" : flow === 2 ? "vert270" : void 0;
  const fit = boolProp(sh, 191, 1, false);
  return el("a:bodyPr", {
    vert,
    wrap: (prop(sh, 133) ?? 0) === 2 ? "none" : "square",
    lIns: prop(sh, 129) ?? 91440,
    tIns: prop(sh, 130) ?? 45720,
    rIns: prop(sh, 131) ?? 91440,
    bIns: prop(sh, 132) ?? 45720,
    anchor,
    anchorCtr: anchorCtr || void 0,
    rtlCol: 0
  }, fit ? "<a:spAutoFit/>" : "<a:noAutofit/>");
}
function textBlockOf(sh, pc) {
  if (!sh.clientTextbox) return void 0;
  const ct = readClientTextbox(sh.clientTextbox);
  const block = ct.block ?? (ct.outlineRef !== void 0 ? pc.outline[ct.outlineRef] : void 0);
  if (!block) return void 0;
  const pf9 = (sh.clientData ? pp9Of(sh.clientData) : void 0) ?? (ct.outlineRef !== void 0 && pc.slideId !== void 0 ? pc.conv.doc.outlinePf9.get(`${pc.slideId}:${block.textType}`) : void 0);
  return pf9 ? { ...block, pf9 } : block;
}
function pp9Of(clientData) {
  for (const c of children(clientData)) {
    if (c.type !== RT.ProgTags) continue;
    for (const t of children(c)) {
      if (t.type !== RT.ProgBinaryTag) continue;
      const kids = children(t);
      const name = kids.find((k) => k.type === RT.CString);
      const blob = kids.find((k) => k.type === RT.BinaryTagDataBlob);
      if (!name || !blob || utf16(name.r, name.start, name.end) !== "___PPT9") continue;
      let o = blob.start;
      while (o + 8 <= blob.end) {
        const rec = readRec(blob.r, o, blob.end);
        if (!rec) break;
        if (rec.type === RT.StyleTextProp9Atom) return readStyleTextProp9(rec);
        o = rec.start + rec.len;
      }
    }
  }
  return void 0;
}
var PH_TYPE = {
  1: "title",
  2: "body",
  3: "ctrTitle",
  4: "subTitle",
  5: "sldImg",
  6: "body",
  7: "dt",
  8: "sldNum",
  9: "ftr",
  10: "hdr",
  11: "sldImg",
  12: "body",
  13: "title",
  14: "body",
  15: "ctrTitle",
  16: "subTitle",
  17: "title",
  18: "body",
  19: "obj",
  20: "chart",
  21: "tbl",
  22: "clipArt",
  23: "dgm",
  24: "media",
  25: "obj",
  26: "pic"
};
function placeholderOf(sh) {
  if (!sh.clientData) return void 0;
  for (const c of children(sh.clientData)) {
    if (c.type !== RT.PlaceholderAtom) continue;
    const position = c.r.i32(c.start);
    const id = c.r.u8(c.start + 4);
    const type = PH_TYPE[id];
    if (!type) return void 0;
    const info = { type };
    if (type !== "title" && type !== "ctrTitle" && position >= 0) info.idx = position;
    if (id === 17 || id === 18 || id === 25) info.vert = true;
    return info;
  }
  return void 0;
}
function placeholderType(sh) {
  return placeholderOf(sh)?.type;
}
function phXml(ph) {
  if (!ph) return "<p:nvPr/>";
  return el("p:nvPr", {}, el("p:ph", {
    type: ph.type === "obj" ? void 0 : ph.type,
    orient: ph.vert ? "vert" : void 0,
    idx: ph.idx
  }));
}
function shapeName(sh, fallback) {
  return propString(sh.props.get(896)) ?? `${fallback} ${sh.spid}`;
}
function shapeId(sh, pc) {
  let id = sh.spid > 0 ? sh.spid : 2;
  while (pc.usedIds.has(id)) id++;
  pc.usedIds.add(id);
  if (id === sh.spid) pc.spids.add(id);
  return id;
}
var isHidden = (sh) => boolProp(sh, 959, 1, false);
function visualParts(sh, pc, xf, kind, inGroup) {
  const geom = geometryXml(sh, xf);
  let flipV = geom.flipV;
  const parts = {
    geom: geom.xml,
    fill: kind === "line" ? "<a:noFill/>" : fillXml(sh, pc),
    line: lineXml(sh, pc, kind !== "pic"),
    effects: shadowXml(sh, pc)
  };
  const mv = pc.conv.useRoundTrip ? metroVisual(sh) : void 0;
  if (mv) {
    if (mv.geometry) {
      parts.geom = mv.geometry;
      flipV = false;
    }
    if (mv.fill && kind !== "pic") parts.fill = mv.fill;
    if (mv.line) parts.line = mv.line;
    if (mv.effects !== void 0) parts.effects = mv.effects;
    const m = mv.xfrm;
    const tol = 1600;
    if (m && !inGroup && Math.abs(m.x - xf.x) <= tol && Math.abs(m.y - xf.y) <= tol && Math.abs(m.cx - xf.cx) <= tol && Math.abs(m.cy - xf.cy) <= tol && Math.abs(((m.rot - xf.rot) % 360 + 540) % 360 - 180) < 1) {
      Object.assign(xf, { x: m.x, y: m.y, cx: m.cx, cy: m.cy, rot: m.rot, flipH: m.flipH, flipV: m.flipV });
      flipV = false;
    }
  }
  if (flipV) xf.flipV = !xf.flipV;
  return parts;
}
function shapeXml(sh, pc, opts = {}) {
  if (sh.flags & FSP.deleted) return "";
  if (isHidden(sh)) return "";
  if (sh.children) return groupXml(sh, pc, opts);
  const ph = placeholderOf(sh);
  if (ph && opts.skipPlaceholders) return "";
  const xf = anchorXf(sh);
  if (!xf) return "";
  const pib = prop(sh, 260);
  const name = shapeName(sh, pib ? "Imagem" : "Forma");
  const descr = propString(sh.props.get(897));
  const id = shapeId(sh, pc);
  const cNvPr = el("p:cNvPr", { id, name, descr });
  const inGroup = !!opts.inGroup;
  if (pib) {
    const rid = imageRel(pc, pib);
    if (rid) {
      const v2 = visualParts(sh, pc, xf, "pic", inGroup);
      const crop = (pid) => Math.round(fixed(prop(sh, pid)) * 1e5);
      const t = crop(256), b = crop(257), l = crop(258), r = crop(259);
      const blipFill = el(
        "p:blipFill",
        {},
        el("a:blip", { "r:embed": rid }) + (t || b || l || r ? el("a:srcRect", { l: l || void 0, t: t || void 0, r: r || void 0, b: b || void 0 }) : "") + "<a:stretch><a:fillRect/></a:stretch>"
      );
      const spPr2 = el("p:spPr", {}, xfrmXml(xf) + v2.geom + v2.fill + v2.line + v2.effects);
      return el(
        "p:pic",
        {},
        el("p:nvPicPr", {}, cNvPr + el("p:cNvPicPr", {}, '<a:picLocks noChangeAspect="1"/>') + phXml(ph)) + blipFill + spPr2
      );
    }
  }
  const wordArt = isWordArtType(sh.type) ? wordArtXml(sh, pc, xf) : void 0;
  if (wordArt) {
    return el("p:sp", {}, el("p:nvSpPr", {}, cNvPr + '<p:cNvSpPr txBox="1"/>' + phXml(ph)) + el("p:spPr", {}, xfrmXml(xf) + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>') + wordArt);
  }
  const block = textBlockOf(sh, pc);
  if (block) pc.texts.set(sh.spid, block.text);
  const isConn = isConnectorType(sh.type);
  const isLine = sh.type === 20 || isConn;
  const v = visualParts(sh, pc, xf, isLine ? "line" : "shape", inGroup);
  const spPr = el("p:spPr", {}, xfrmXml(xf) + v.geom + v.fill + v.line + v.effects);
  if (isConn) {
    return el("p:cxnSp", {}, el("p:nvCxnSpPr", {}, cNvPr + "<p:cNvCxnSpPr/>" + phXml(ph)) + spPr);
  }
  let txBody = "";
  if (block) {
    const metroTx = pc.conv.useRoundTrip && !ph ? metroTextBody(sh, block.text) : void 0;
    txBody = metroTx ?? el("p:txBody", {}, bodyPrXml(sh) + "<a:lstStyle/>" + paragraphsXml(block, pc.text));
  }
  const cNvSpPr = sh.type === 202 && !ph ? '<p:cNvSpPr txBox="1"/>' : "<p:cNvSpPr/>";
  return el("p:sp", {}, el("p:nvSpPr", {}, cNvPr + cNvSpPr + phXml(ph)) + spPr + txBody);
}
function wordArtXml(sh, pc, xf) {
  const text = propString(sh.props.get(192));
  if (!text) return void 0;
  const font = propString(sh.props.get(197));
  const bold = boolProp(sh, 255, 5, false), italic = boolProp(sh, 255, 4, false);
  const color = oaColor(prop(sh, 385) ?? 16777215, sh, pc);
  const lines = text.split(/\r\n|\r|\n/);
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const byH = xf.cy / 12700 / lines.length * 0.75;
  const byW = xf.cx / 12700 / (longest * (bold ? 0.66 : 0.6));
  const szPt = Math.max(4, Math.min(400, byH, byW));
  const rPr = el(
    "a:rPr",
    { sz: Math.round(szPt * 100), b: bold ? 1 : 0, i: italic ? 1 : 0 },
    el("a:solidFill", {}, srgb(color)) + (font ? el("a:latin", { typeface: font }) : "")
  );
  const paras = lines.map((l) => `<a:p><a:pPr algn="ctr"><a:buNone/></a:pPr><a:r>${rPr}<a:t>${escText(l)}</a:t></a:r></a:p>`).join("");
  return el("p:txBody", {}, '<a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" rtlCol="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>' + paras);
}
function groupXml(sh, pc, opts) {
  const kids = (sh.children ?? []).map((c) => shapeXml(c, pc, { ...opts, inGroup: true })).join("");
  if (!kids) return "";
  const xf = anchorXf(sh);
  const g = sh.groupRect;
  const id = shapeId(sh, pc);
  const name = shapeName(sh, "Grupo");
  let xfrm = "<a:xfrm/>";
  if (xf && g) {
    xfrm = xfrmXml(
      xf,
      "a:xfrm",
      el("a:chOff", { x: emu(Math.min(g.l, g.r)), y: emu(Math.min(g.t, g.b)) }) + el("a:chExt", { cx: emu(Math.abs(g.r - g.l)), cy: emu(Math.abs(g.b - g.t)) })
    );
  }
  return el(
    "p:grpSp",
    {},
    el("p:nvGrpSpPr", {}, el("p:cNvPr", { id, name }) + "<p:cNvGrpSpPr/><p:nvPr/>") + el("p:grpSpPr", {}, xfrm) + kids
  );
}
function backgroundXml(bg, pc) {
  if (!bg) return "";
  const fill = fillXml(bg, pc, true);
  if (fill === "<a:noFill/>") return "";
  return el("p:bg", {}, el("p:bgPr", {}, fill + "<a:effectLst/>"));
}
function backgroundColor(bg, pc) {
  if (!bg) return void 0;
  const type = prop(bg, 384) ?? 0;
  return type === 0 ? oaColor(prop(bg, 385) ?? 16777215, bg, pc) : void 0;
}

// ../slides-core/src/ppt/transition.ts
var DIR8 = ["l", "u", "r", "d", "lu", "ru", "ld", "rd"];
function transitionXml(t) {
  if (!t) return "";
  const d = t.effectDirection;
  let fx = "";
  switch (t.effectType) {
    case 0:
      fx = el("p:cut", { thruBlk: d === 1 || void 0 });
      break;
    case 1:
      fx = "<p:random/>";
      break;
    case 2:
      fx = el("p:blinds", { dir: d === 0 ? "vert" : void 0 });
      break;
    case 3:
      fx = el("p:checker", { dir: d === 1 ? "vert" : void 0 });
      break;
    case 4:
      fx = el("p:cover", { dir: d === 0 ? void 0 : DIR8[d] });
      break;
    case 5:
      fx = "<p:dissolve/>";
      break;
    case 6:
      fx = '<p:fade thruBlk="1"/>';
      break;
    case 7:
      fx = el("p:pull", { dir: d === 0 ? void 0 : DIR8[d] });
      break;
    case 8:
      fx = el("p:randomBar", { dir: d === 1 ? "vert" : void 0 });
      break;
    case 9:
      fx = el("p:strips", { dir: DIR8[d] && d >= 4 ? DIR8[d] : void 0 });
      break;
    case 10:
      fx = el("p:wipe", { dir: d === 0 ? void 0 : DIR8[d] });
      break;
    case 11:
      fx = el("p:zoom", { dir: d === 1 ? "in" : void 0 });
      break;
    case 13:
      fx = el("p:split", { orient: d >= 2 ? "vert" : void 0, dir: d === 1 || d === 3 ? "in" : void 0 });
      break;
    case 17:
      fx = "<p:diamond/>";
      break;
    case 18:
      fx = "<p:plus/>";
      break;
    case 19:
      fx = "<p:wedge/>";
      break;
    case 20:
      fx = el("p:push", { dir: d === 0 ? void 0 : DIR8[d] });
      break;
    case 21:
      fx = el("p:comb", { dir: d === 1 ? "vert" : void 0 });
      break;
    case 22:
      fx = "<p:newsflash/>";
      break;
    case 23:
      fx = "<p:fade/>";
      break;
    case 26:
      fx = el("p:wheel", { spokes: d && d !== 4 ? d : void 0 });
      break;
    case 27:
      fx = "<p:circle/>";
      break;
    default:
      fx = "";
  }
  const a = {
    spd: t.speed === 0 ? "slow" : t.speed === 1 ? "med" : void 0,
    advClick: t.manualAdvance ? void 0 : 0,
    advTm: t.autoAdvance ? Math.max(0, t.slideTime) : void 0
  };
  if (!fx && a.advTm === void 0 && a.advClick === void 0) return "";
  return el("p:transition", a, fx);
}

// ../slides-core/src/ppt/notes.ts
var NS_ATTRS = { "xmlns:a": NS.a, "xmlns:r": NS.r, "xmlns:p": NS.p };
var SPTREE_HEAD = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
var UNDEF = -2147483647;
function validAnchor(sh) {
  const a = sh.anchor;
  return !!a && a.l !== UNDEF && a.t !== UNDEF && a.r > a.l && a.b > a.t;
}
function flatShapes(s) {
  const out = [];
  const walk = (sh) => {
    if (sh.children) sh.children.forEach(walk);
    else out.push(sh);
  };
  (s?.drawing.root?.children ?? []).forEach(walk);
  return out;
}
function notesFor(doc, slide) {
  return doc.notes.find((n) => n.slideIdRef === slide.slideId);
}
function notesSlideXml(notes, ctx) {
  let body = "";
  for (const sh of flatShapes(notes)) {
    if (placeholderType(sh) !== "body" || !sh.clientTextbox) continue;
    const ct = readClientTextbox(sh.clientTextbox);
    const block = ct.block ?? (ct.outlineRef !== void 0 ? notes.outline[ct.outlineRef] : void 0);
    if (block && block.text.trim()) body += paragraphsXml(block, ctx);
  }
  if (!body) return void 0;
  const ph = (id, name, type, idx, txBody = "") => el("p:sp", {}, el("p:nvSpPr", {}, el("p:cNvPr", { id, name }) + "<p:cNvSpPr/>" + el("p:nvPr", {}, el("p:ph", { type, idx }))) + "<p:spPr/>" + txBody);
  const tree = ph(2, "Imagem do Slide", "sldImg") + ph(3, "Anota\xE7\xF5es", "body", 1, el("p:txBody", {}, "<a:bodyPr/><a:lstStyle/>" + body));
  return XML_DECL + el(
    "p:notes",
    NS_ATTRS,
    el("p:cSld", {}, el("p:spTree", {}, SPTREE_HEAD + tree)) + "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>"
  );
}
function notesMasterXml(doc) {
  const W = doc.notesW, H = doc.notesH;
  const rect = (type, dflt2) => {
    const sh = flatShapes(doc.notesMaster).find((s) => placeholderType(s) === type && validAnchor(s));
    const a = sh?.anchor;
    return a ? [a.l, a.t, a.r - a.l, a.b - a.t] : dflt2;
  };
  const img = rect("sldImg", [W * 0.15, H * 0.08, W * 0.7, H * 0.39]);
  const body = rect("body", [W * 0.1, H * 0.5, W * 0.8, H * 0.39]);
  const sp = (id, name, type, r, idx, txt = false) => el(
    "p:sp",
    {},
    el("p:nvSpPr", {}, el("p:cNvPr", { id, name }) + "<p:cNvSpPr/>" + el("p:nvPr", {}, el("p:ph", { type, idx }))) + el("p:spPr", {}, el("a:xfrm", {}, el("a:off", { x: emu(r[0]), y: emu(r[1]) }) + el("a:ext", { cx: emu(r[2]), cy: emu(r[3]) })) + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>') + (txt ? '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="pt-BR"/></a:p></p:txBody>' : "")
  );
  return XML_DECL + el(
    "p:notesMaster",
    NS_ATTRS,
    el("p:cSld", {}, el("p:spTree", {}, SPTREE_HEAD + sp(2, "Imagem do Slide", "sldImg", img) + sp(3, "Anota\xE7\xF5es", "body", body, 1, true))) + '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
  );
}

// ../slides-core/src/ppt/to-pptx.ts
var SPTREE_HEAD2 = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
var NS_ATTRS2 = { "xmlns:a": NS.a, "xmlns:r": NS.r, "xmlns:p": NS.p };
var SLD_SZ_TYPE = { 0: "screen4x3", 1: "letter", 2: "A4", 3: "35mm", 4: "overhead", 5: "banner" };
function themeXml(name, scheme, major, minor) {
  const c = (i2) => scheme[i2] ?? DEFAULT_SCHEME[i2];
  const clr = (tag, v) => el(`a:${tag}`, {}, el("a:srgbClr", { val: v }));
  const fonts = (f) => el("a:latin", { typeface: f }) + '<a:ea typeface=""/><a:cs typeface=""/>';
  const phSolid = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  return XML_DECL + el(
    "a:theme",
    { "xmlns:a": NS.a, name },
    el(
      "a:themeElements",
      {},
      el(
        "a:clrScheme",
        { name },
        clr("dk1", c(1)) + clr("lt1", c(0)) + clr("dk2", c(3)) + clr("lt2", c(2)) + clr("accent1", c(4)) + clr("accent2", c(5)) + clr("accent3", c(6)) + clr("accent4", c(7)) + clr("accent5", c(4)) + clr("accent6", c(5)) + clr("hlink", c(6)) + clr("folHlink", c(7))
      ) + el("a:fontScheme", { name }, el("a:majorFont", {}, fonts(major)) + el("a:minorFont", {}, fonts(minor))) + el(
        "a:fmtScheme",
        { name },
        el("a:fillStyleLst", {}, phSolid + phSolid + phSolid) + el("a:lnStyleLst", {}, [6350, 12700, 19050].map((w) => el("a:ln", { w, cap: "flat", cmpd: "sng", algn: "ctr" }, phSolid + '<a:prstDash val="solid"/><a:miter lim="800000"/>')).join("")) + el("a:effectStyleLst", {}, "<a:effectStyle><a:effectLst/></a:effectStyle>".repeat(3)) + el("a:bgFillStyleLst", {}, phSolid + phSolid + phSolid)
      )
    ) + "<a:objectDefaults/><a:extraClrSchemeLst/>"
  );
}
function themeMatchesScheme(xml, scheme) {
  const pick = (tag) => {
    const m = new RegExp(`<a:${tag}>\\s*<a:(?:srgbClr val|sysClr[^>]*lastClr)="([0-9A-Fa-f]{6})"`).exec(xml);
    return m?.[1]?.toUpperCase();
  };
  const want = [["dk1", 1], ["lt1", 0], ["dk2", 3], ["lt2", 2], ["accent1", 4], ["accent2", 5]];
  return want.every(([tag, i2]) => pick(tag) === scheme[i2]?.toUpperCase());
}
function masterById(doc, id) {
  return doc.masters.find((m) => m.slideId === id);
}
function mainMasterOf(doc, m) {
  if (!m) return doc.masters.find((x2) => x2.kind === "mainMaster");
  if (m.kind === "mainMaster") return m;
  return masterById(doc, m.masterIdRef) ?? doc.masters.find((x2) => x2.kind === "mainMaster");
}
function headerFooterShapes(doc, s, m, pc) {
  const hf = s.headersFooters ?? doc.slideHeadersFooters;
  if (!hf || !m) return "";
  const want = /* @__PURE__ */ new Set();
  if (hf.hasDate) want.add("dt");
  if (hf.hasSlideNumber) want.add("sldNum");
  if (hf.hasFooter) want.add("ftr");
  if (!want.size) return "";
  if (doc.omitTitlePlace && s.geom === 0) return "";
  const own = /* @__PURE__ */ new Set();
  for (const c of s.drawing.root?.children ?? []) {
    const t = placeholderType(c);
    if (t) own.add(t);
  }
  const hfText = {};
  if (hf.footer) hfText.footer = hf.footer;
  if (hf.header) hfText.header = hf.header;
  if (hf.hasUserDate && hf.userDate) hfText.userDate = hf.userDate;
  pc.text.hf = hfText;
  let xml = "";
  for (const c of m.drawing.root?.children ?? []) {
    const t = placeholderType(c);
    if (t && want.has(t) && !own.has(t)) xml += shapeXml(c, pc);
  }
  return xml;
}
function relsPath(part) {
  const i2 = part.lastIndexOf("/");
  return `${part.slice(0, i2)}/_rels/${part.slice(i2 + 1)}.rels`;
}
function pptToPptxParts(doc, opts = {}) {
  const conv = { doc, media: /* @__PURE__ */ new Map(), parts: /* @__PURE__ */ new Map(), mediaExts: /* @__PURE__ */ new Set(), useRoundTrip: opts.useRoundTrip !== false };
  const out = /* @__PURE__ */ new Map();
  const put = (path, xml) => {
    out.set(path, strToU8(xml));
  };
  const fontOf2 = (idx) => idx === void 0 ? void 0 : doc.fonts[idx]?.name;
  const used = new Set(doc.slides.map((s) => s.masterIdRef));
  let masters = doc.masters.filter((m) => used.has(m.slideId));
  if (!masters.length && doc.masters[0]) masters = [doc.masters[0]];
  const masterIndex = /* @__PURE__ */ new Map();
  masters.forEach((m, i2) => masterIndex.set(m.slideId, i2 + 1));
  const needsNoMasterLayout = /* @__PURE__ */ new Set();
  for (const s of doc.slides) if (!(s.flags & 1)) needsNoMasterLayout.add(masterIndex.get(s.masterIdRef) ?? 1);
  let layoutCounter = 0;
  let layoutIdSeed = 2147483648 + masters.length + 1;
  const layoutFor = /* @__PURE__ */ new Map();
  const masterXmls = [];
  const layoutXmls = [];
  const themeXmls = [];
  masters.forEach((m, mi) => {
    const k = mi + 1;
    const main = mainMasterOf(doc, m);
    const scheme = m.colorScheme ?? main?.colorScheme ?? DEFAULT_SCHEME;
    const mrels = new PartRels();
    const pc = newPartCtx(conv, scheme, main?.masterStyles, m.outline, void 0, mrels);
    pc.bgColor = backgroundColor(m.drawing.background ?? main?.drawing.background, pc);
    const ctx = pc.text;
    let tree = "";
    if (m.kind === "titleMaster" && m.flags & 1 && main && main !== m) {
      for (const c of main.drawing.root?.children ?? []) tree += shapeXml(c, pc, { skipPlaceholders: true });
    }
    for (const c of m.drawing.root?.children ?? []) tree += shapeXml(c, pc);
    const bg = backgroundXml(m.drawing.background ?? main?.drawing.background, pc);
    const lids = [];
    const mkLayout = (noMaster) => {
      layoutCounter++;
      const lrels = new PartRels();
      lrels.add("slideMaster", `../slideMasters/slideMaster${k}.xml`);
      const lxml = XML_DECL + el(
        "p:sldLayout",
        { ...NS_ATTRS2, type: "blank", preserve: 1, showMasterSp: noMaster ? 0 : void 0 },
        el("p:cSld", { name: noMaster ? "Em branco (sem objetos do mestre)" : "Em branco" }, el("p:spTree", {}, SPTREE_HEAD2)) + "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>"
      );
      layoutXmls.push({ path: `ppt/slideLayouts/slideLayout${layoutCounter}.xml`, xml: lxml, rels: lrels });
      layoutFor.set(`${k}:${noMaster ? "n" : "m"}`, layoutCounter);
      lids.push({ id: layoutIdSeed++, n: layoutCounter });
    };
    mkLayout(false);
    if (needsNoMasterLayout.has(k)) mkLayout(true);
    const lidXml = lids.map((l) => el("p:sldLayoutId", { id: l.id, "r:id": mrels.add("slideLayout", `../slideLayouts/slideLayout${l.n}.xml`) })).join("");
    mrels.add("theme", `../theme/theme${k}.xml`);
    const txStyles = el(
      "p:txStyles",
      {},
      levelsXml("p:titleStyle", ctx, 0) + levelsXml("p:bodyStyle", ctx, 1) + levelsXml("p:otherStyle", ctx, 4)
    );
    const mxml = XML_DECL + el(
      "p:sldMaster",
      NS_ATTRS2,
      el("p:cSld", { name: m.name }, bg + el("p:spTree", {}, SPTREE_HEAD2 + tree)) + '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' + el("p:sldLayoutIdLst", {}, lidXml) + txStyles
    );
    masterXmls.push({ path: `ppt/slideMasters/slideMaster${k}.xml`, xml: mxml, rels: mrels });
    const major = fontOf2(resolveLevel(ctx, 0, 0).cf.font) ?? "Calibri";
    const minor = fontOf2(resolveLevel(ctx, 1, 0).cf.font) ?? "Calibri";
    const rt = conv.useRoundTrip ? roundTripThemeXml(m.roundTripTheme ?? main?.roundTripTheme) : void 0;
    themeXmls.push({ path: `ppt/theme/theme${k}.xml`, xml: rt && themeMatchesScheme(rt, scheme) ? rt : themeXml(m.name ?? `Tema ${k}`, scheme, major, minor) });
  });
  const slideXmls = [];
  const notesXmls = [];
  const usedSldIds = /* @__PURE__ */ new Set();
  doc.slides.forEach((s, si) => {
    const m = masterById(doc, s.masterIdRef) ?? masters[0];
    const main = mainMasterOf(doc, m);
    const k = (m && masterIndex.get(m.slideId)) ?? 1;
    const scheme = s.flags & 2 ? m?.colorScheme ?? main?.colorScheme ?? s.colorScheme ?? DEFAULT_SCHEME : s.colorScheme ?? m?.colorScheme ?? DEFAULT_SCHEME;
    const pc = newPartCtx(conv, scheme, main?.masterStyles, s.outline, doc.firstSlideNumber + si);
    pc.slideId = s.slideId;
    const layoutN = layoutFor.get(`${k}:${s.flags & 1 ? "m" : "n"}`) ?? layoutFor.get(`${k}:m`) ?? 1;
    pc.rels.add("slideLayout", `../slideLayouts/slideLayout${layoutN}.xml`);
    const ownBg = !(s.flags & 4) ? s.drawing.background : void 0;
    pc.bgColor = backgroundColor(ownBg ?? m?.drawing.background, pc);
    let tree = "";
    for (const c of s.drawing.root?.children ?? []) tree += shapeXml(c, pc);
    tree = headerFooterShapes(doc, s, m, pc) + tree;
    const bg = ownBg ? backgroundXml(ownBg, pc) : "";
    const timing = buildTimingXml(s, { textOf: (id2) => pc.texts.get(id2), hasShape: (id2) => pc.spids.has(id2), scheme });
    const xml = XML_DECL + el(
      "p:sld",
      { ...NS_ATTRS2, show: s.transition?.hidden ? 0 : void 0, showMasterSp: s.flags & 1 ? void 0 : 0 },
      el("p:cSld", {}, bg + el("p:spTree", {}, SPTREE_HEAD2 + tree)) + "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>" + transitionXml(s.transition) + timing
    );
    let id = s.slideId >= 256 && s.slideId < 2147483648 ? s.slideId : 256 + si;
    while (usedSldIds.has(id)) id++;
    usedSldIds.add(id);
    const nt = notesFor(doc, s);
    const notesCtx = { doc, scheme: nt?.colorScheme ?? scheme, slideNumber: doc.firstSlideNumber + si };
    if (main?.masterStyles) notesCtx.styles = main.masterStyles;
    const nxml = nt ? notesSlideXml(nt, notesCtx) : void 0;
    if (nxml) {
      const nn = notesXmls.length + 1;
      const nrels = new PartRels();
      nrels.add("notesMaster", "../notesMasters/notesMaster1.xml");
      nrels.add("slide", `../slides/slide${si + 1}.xml`);
      notesXmls.push({ path: `ppt/notesSlides/notesSlide${nn}.xml`, xml: nxml, rels: nrels });
      pc.rels.add("notesSlide", `../notesSlides/notesSlide${nn}.xml`);
    }
    slideXmls.push({ path: `ppt/slides/slide${si + 1}.xml`, xml, rels: pc.rels, id });
  });
  const notesMaster = notesXmls.length ? (() => {
    const themeN = themeXmls.length + 1;
    themeXmls.push({ path: `ppt/theme/theme${themeN}.xml`, xml: themeXmls[0]?.xml ?? themeXml("Notas", DEFAULT_SCHEME, "Calibri", "Calibri") });
    const rels = new PartRels();
    rels.add("theme", `../theme/theme${themeN}.xml`);
    return { path: "ppt/notesMasters/notesMaster1.xml", xml: notesMasterXml(doc), rels };
  })() : void 0;
  const prels = new PartRels();
  const mIds = masterXmls.map((mx, i2) => el("p:sldMasterId", { id: 2147483648 + i2, "r:id": prels.add("slideMaster", mx.path.replace("ppt/", "")) })).join("");
  const nmIds = notesMaster ? el("p:notesMasterIdLst", {}, el("p:notesMasterId", { "r:id": prels.add("notesMaster", notesMaster.path.replace("ppt/", "")) })) : "";
  const sIds = slideXmls.map((sx) => el("p:sldId", { id: sx.id, "r:id": prels.add("slide", sx.path.replace("ppt/", "")) })).join("");
  prels.add("presProps", "presProps.xml");
  prels.add("viewProps", "viewProps.xml");
  prels.add("theme", "theme/theme1.xml");
  prels.add("tableStyles", "tableStyles.xml");
  const firstMain = mainMasterOf(doc, masters[0]);
  const defCtx = { doc, scheme: masters[0]?.colorScheme ?? firstMain?.colorScheme ?? DEFAULT_SCHEME };
  const presXml = XML_DECL + el(
    "p:presentation",
    { ...NS_ATTRS2, saveSubsetFonts: 1, firstSlideNum: doc.firstSlideNumber !== 1 ? doc.firstSlideNumber : void 0 },
    el("p:sldMasterIdLst", {}, mIds) + nmIds + (sIds ? el("p:sldIdLst", {}, sIds) : "") + el("p:sldSz", { cx: emu(doc.slideW), cy: emu(doc.slideH), type: SLD_SZ_TYPE[doc.slideSizeType] }) + el("p:notesSz", { cx: emu(doc.notesW), cy: emu(doc.notesH) }) + levelsXml("p:defaultTextStyle", defCtx, 4)
  );
  const overrides = [
    ["/ppt/presentation.xml", "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"],
    ...masterXmls.map((x2) => ["/" + x2.path, "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"]),
    ...slideXmls.map((x2) => ["/" + x2.path, "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"]),
    ...layoutXmls.map((x2) => ["/" + x2.path, "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"]),
    ...themeXmls.map((x2) => ["/" + x2.path, "application/vnd.openxmlformats-officedocument.theme+xml"]),
    ...notesMaster ? [[`/${notesMaster.path}`, "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"]] : [],
    ...notesXmls.map((x2) => ["/" + x2.path, "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"]),
    ["/ppt/presProps.xml", "application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"],
    ["/ppt/viewProps.xml", "application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"],
    ["/ppt/tableStyles.xml", "application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"],
    ["/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml"],
    ["/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml"]
  ];
  const MIME = {
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
  const defaults = ["rels", "xml", ...conv.mediaExts].map((ext) => el("Default", {
    Extension: ext,
    ContentType: ext === "rels" ? "application/vnd.openxmlformats-package.relationships+xml" : ext === "xml" ? "application/xml" : MIME[ext] ?? "application/octet-stream"
  })).join("");
  put("[Content_Types].xml", XML_DECL + el("Types", { xmlns: NS.ct }, defaults + overrides.map(([p, t]) => el("Override", { PartName: p, ContentType: t })).join("")));
  const rootRels = new PartRels();
  rootRels.add("officeDocument", "ppt/presentation.xml");
  rootRels.add("http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml");
  rootRels.add("extended-properties", "docProps/app.xml");
  put("_rels/.rels", rootRels.xml());
  put("docProps/core.xml", XML_DECL + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Apresenta\xE7\xE3o convertida de .ppt</dc:title></cp:coreProperties>');
  put("docProps/app.xml", XML_DECL + el(
    "Properties",
    { xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" },
    `<Application>Universal Slides (convers\xE3o .ppt)</Application><Slides>${slideXmls.length}</Slides>`
  ));
  put("ppt/presentation.xml", presXml);
  put("ppt/_rels/presentation.xml.rels", prels.xml());
  for (const x2 of [...masterXmls, ...layoutXmls, ...slideXmls, ...notesMaster ? [notesMaster] : [], ...notesXmls]) {
    put(x2.path, x2.xml);
    put(relsPath(x2.path), x2.rels.xml());
  }
  for (const x2 of themeXmls) put(x2.path, x2.xml);
  put("ppt/presProps.xml", XML_DECL + el("p:presentationPr", NS_ATTRS2));
  put("ppt/viewProps.xml", XML_DECL + el("p:viewPr", NS_ATTRS2, '<p:normalViewPr/><p:slideViewPr><p:cSldViewPr><p:cViewPr><p:scale><a:sx n="1" d="1"/><a:sy n="1" d="1"/></p:scale><p:origin x="0" y="0"/></p:cViewPr><p:guideLst/></p:cSldViewPr></p:slideViewPr><p:gridSpacing cx="72008" cy="72008"/>'));
  put("ppt/tableStyles.xml", XML_DECL + el("a:tblStyleLst", { "xmlns:a": NS.a, def: "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}" }));
  for (const [path, bytes] of conv.parts) out.set(path, bytes);
  return out;
}
function pptDocumentToPptx(doc, opts = {}) {
  const parts = pptToPptxParts(doc, opts);
  const zippable = {};
  for (const [p, b] of parts) zippable[p] = b;
  return zipSync(zippable, { level: 6, mtime: new Date(2e3, 0, 1) });
}

// ../slides-core/src/ppt/index.ts
function isCfb(bytes) {
  return isCfbBytes(bytes);
}
function convertPptToPptx(bytes, options = {}) {
  if (!isCfbBytes(bytes)) throw new PptFormatError("O arquivo n\xE3o \xE9 um .ppt (Compound File) \u2014 assinatura ausente.");
  try {
    const doc = readPptDocument(bytes);
    if (!doc.slides.length && !doc.masters.length) {
      throw new PptFormatError("Apresenta\xE7\xE3o .ppt sem slides leg\xEDveis.");
    }
    return pptDocumentToPptx(doc, options);
  } catch (e) {
    if (e instanceof PptFormatError) throw e;
    throw new PptFormatError(`Arquivo .ppt corrompido ou n\xE3o suportado: ${e.message}`);
  }
}

// ../slides-core/src/package.ts
var PptxPackage = class _PptxPackage {
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  static load(bytes) {
    if (isCfb(bytes)) bytes = convertPptToPptx(bytes);
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo nao e um pacote OOXML valido (ZIP corrompido ou .ppt legado)");
    }
    const pkg = new _PptxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart("ppt/presentation.xml")) {
      throw new Error("Pacote sem ppt/presentation.xml \u2014 nao e uma apresentacao valida");
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
    const d = this.parts.get(path);
    return d === void 0 ? void 0 : new TextDecoder().decode(d);
  }
  setPartText(path, text) {
    this.parts.set(path, new TextEncoder().encode(text));
  }
  presentationXml() {
    const xml = this.getPartText("ppt/presentation.xml");
    if (xml === void 0) throw new Error("Pacote sem ppt/presentation.xml");
    return xml;
  }
  /** Resolve o caminho de uma parte alvo a partir de um relacionamento (.rels). */
  resolveRelTarget(fromPart, target) {
    if (target.startsWith("/")) return target.slice(1);
    let dir = fromPart.includes("/") ? fromPart.slice(0, fromPart.lastIndexOf("/")) : "";
    let t = target;
    while (t.startsWith("../")) {
      t = t.slice(3);
      dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";
    }
    return dir ? `${dir}/${t}` : t;
  }
};

// ../slides-core/src/theme.ts
var STD_MAP = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
function readTheme(pkg, themePath) {
  const colors = {};
  const xml = pkg.getPartText(themePath);
  if (xml === void 0) return { colors };
  const root = parseXml(xml);
  const themeEls = firstChild(root, "a:themeElements");
  const scheme = themeEls ? firstChild(themeEls, "a:clrScheme") : void 0;
  if (scheme) {
    for (const el2 of childElements(scheme)) {
      const key = el2.name.replace(/^a:/, "");
      const c = colorFromDml(childElements(el2)[0], { colors });
      if (c) colors[key] = c;
    }
  }
  for (const [alias, src] of Object.entries(STD_MAP)) if (colors[src]) colors[alias] = colors[src];
  const theme = { colors };
  const fmtScheme = themeEls ? firstChild(themeEls, "a:fmtScheme") : void 0;
  const lnList = fmtScheme ? firstChild(fmtScheme, "a:lnStyleLst") : void 0;
  if (lnList) {
    const widths = [];
    for (const ln2 of childElements(lnList, "a:ln")) {
      widths.push(ln2.attrs["w"] !== void 0 ? parseInt(ln2.attrs["w"], 10) : 9525);
    }
    if (widths.length) theme.lineWidths = widths;
  }
  const fontScheme = themeEls ? firstChild(themeEls, "a:fontScheme") : void 0;
  if (fontScheme) {
    const majLatin = firstChild(fontScheme, "a:majorFont");
    const minLatin = firstChild(fontScheme, "a:minorFont");
    const major = majLatin ? firstChild(majLatin, "a:latin")?.attrs["typeface"] : void 0;
    const minor = minLatin ? firstChild(minLatin, "a:latin")?.attrs["typeface"] : void 0;
    if (major || minor) {
      theme.fonts = {};
      if (major) theme.fonts.major = major;
      if (minor) theme.fonts.minor = minor;
    }
  }
  return theme;
}
function colorFromDml(el2, theme) {
  if (!el2) return void 0;
  let base;
  if (el2.name === "a:srgbClr") base = "#" + (el2.attrs["val"] ?? "000000");
  else if (el2.name === "a:sysClr") base = "#" + (el2.attrs["lastClr"] ?? "000000");
  else if (el2.name === "a:prstClr") base = PRESET[el2.attrs["val"] ?? "black"] ?? "#000000";
  else if (el2.name === "a:schemeClr") {
    const v = el2.attrs["val"] ?? "";
    base = theme.colors[v] ?? theme.colors[STD_MAP[v] ?? v] ?? "#000000";
  }
  if (base === void 0) return void 0;
  for (const mod of childElements(el2)) {
    const val = mod.attrs["val"] !== void 0 ? parseInt(mod.attrs["val"], 10) / 1e5 : void 0;
    if (val === void 0) continue;
    if (mod.name === "a:shade") base = mixLinear(base, 0, val);
    else if (mod.name === "a:tint") base = mixLinear(base, 1, val);
    else if (mod.name === "a:lumMod") base = lumHsl(base, val, 0);
    else if (mod.name === "a:lumOff") base = lumHsl(base, 1, val);
  }
  return base;
}
function solidFillColor(parent, theme) {
  const sf = firstChild(parent, "a:solidFill");
  if (!sf) return void 0;
  return colorFromDml(childElements(sf)[0], theme);
}
function rgb(hex2) {
  const m = /#?([0-9a-fA-F]{6})/.exec(hex2);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function hex(r, g, b) {
  const c = (x2) => Math.round(Math.min(255, Math.max(0, x2))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function lumHsl(hexIn, mod, off) {
  const [r, g, b] = rgb(hexIn);
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max2 = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max2 - min;
  let hh = 0, s = 0;
  let l = (max2 + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max2 - min) : d / (max2 + min);
    if (max2 === rf) hh = (gf - bf) / d % 6;
    else if (max2 === gf) hh = (bf - rf) / d + 2;
    else hh = (rf - gf) / d + 4;
    hh /= 6;
    if (hh < 0) hh += 1;
  }
  l = Math.max(0, Math.min(1, l * mod + off));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x2 = c * (1 - Math.abs(hh * 6 % 2 - 1));
  const m = l - c / 2;
  let r2 = 0, g2 = 0, b22 = 0;
  const seg = Math.floor(hh * 6) % 6;
  if (seg === 0) {
    r2 = c;
    g2 = x2;
  } else if (seg === 1) {
    r2 = x2;
    g2 = c;
  } else if (seg === 2) {
    g2 = c;
    b22 = x2;
  } else if (seg === 3) {
    g2 = x2;
    b22 = c;
  } else if (seg === 4) {
    r2 = x2;
    b22 = c;
  } else {
    r2 = c;
    b22 = x2;
  }
  return hex((r2 + m) * 255, (g2 + m) * 255, (b22 + m) * 255);
}
function mixLinear(h, target, f) {
  const [r, g, b] = rgb(h);
  const lin2 = (v) => Math.pow(v / 255, 2.2);
  const srgb2 = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
  const mix = (v) => srgb2(lin2(v) * f + target * (1 - f));
  return hex(mix(r), mix(g), mix(b));
}
var PRESET = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  gray: "#808080",
  grey: "#808080"
};

// ../slides-core/src/table-style.ts
var PART_NAMES = [
  ["wholeTbl", "a:wholeTbl"],
  ["band1H", "a:band1H"],
  ["band2H", "a:band2H"],
  ["firstRow", "a:firstRow"],
  ["lastRow", "a:lastRow"],
  ["firstCol", "a:firstCol"],
  ["lastCol", "a:lastCol"]
];
function parsePart(el2, theme) {
  const out = {};
  const tx = firstChild(el2, "a:tcTxStyle");
  if (tx) {
    if (tx.attrs["b"] === "on") out.txBold = true;
    for (const c of childElements(tx)) {
      if (c.name === "a:fontRef") continue;
      const col = colorFromDml(c, theme);
      if (col) {
        out.txColor = col;
        break;
      }
    }
  }
  const tc = firstChild(el2, "a:tcStyle");
  if (tc) {
    const fill = firstChild(tc, "a:fill");
    const sf = fill ? firstChild(fill, "a:solidFill") : void 0;
    if (sf) {
      const col = colorFromDml(childElements(sf)[0], theme);
      if (col) out.fill = col;
    }
    const bdr = firstChild(tc, "a:tcBdr");
    if (bdr) {
      for (const side of ["a:insideH", "a:insideV", "a:left", "a:top"]) {
        const s = firstChild(bdr, side);
        const ln2 = s ? firstChild(s, "a:ln") : void 0;
        if (!ln2) continue;
        const sf2 = firstChild(ln2, "a:solidFill");
        const col = sf2 ? colorFromDml(childElements(sf2)[0], theme) : void 0;
        if (col) out.borderColor = col;
        if (ln2.attrs["w"]) out.borderWidth = parseInt(ln2.attrs["w"], 10);
        if (out.borderColor) break;
      }
    }
  }
  return out;
}
function readTableStyle(pkg, styleId, theme) {
  const xml = pkg.getPartText("ppt/tableStyles.xml");
  if (!xml) return void 0;
  let root;
  try {
    root = parseXml(xml);
  } catch {
    return void 0;
  }
  for (const st of childElements(root, "a:tblStyle")) {
    if (st.attrs["styleId"] !== styleId) continue;
    const def = {};
    for (const [key, name] of PART_NAMES) {
      const el2 = firstChild(st, name);
      if (el2) def[key] = parsePart(el2, theme);
    }
    return def;
  }
  return void 0;
}
function readTblPr(tbl) {
  const pr = firstChild(tbl, "a:tblPr");
  const out = {
    firstRow: pr?.attrs["firstRow"] === "1",
    bandRow: pr?.attrs["bandRow"] === "1"
  };
  const idEl = pr ? firstChild(pr, "a:tableStyleId") : void 0;
  if (idEl) out.styleId = textContent(idEl).trim();
  return out;
}
function applyTableStyle(t, def, firstRowOn, bandRowOn) {
  const whole = def.wholeTbl;
  for (let ri = 0; ri < t.rows.length; ri++) {
    const isHeader = firstRowOn && ri === 0;
    const dataIdx = ri - (firstRowOn ? 1 : 0);
    for (const cell of t.rows[ri].cells) {
      if (cell.hMerge || cell.vMerge) continue;
      let part;
      if (isHeader) part = def.firstRow;
      else if (bandRowOn && dataIdx >= 0 && dataIdx % 2 === 0) part = def.band1H;
      else if (bandRowOn && dataIdx >= 0) part = def.band2H;
      if (cell.fill === void 0) {
        const f = part?.fill ?? whole?.fill;
        if (f) cell.fill = f;
      }
      if (cell.txColor === void 0) {
        const c = part?.txColor ?? whole?.txColor;
        if (c) cell.txColor = c;
      }
      if (cell.txBold === void 0 && (part?.txBold ?? whole?.txBold)) cell.txBold = true;
      if (cell.borderColor === void 0) {
        const b = part?.borderColor ?? whole?.borderColor;
        if (b) cell.borderColor = b;
      }
      if (cell.borderWidth === void 0) {
        const w = part?.borderWidth ?? whole?.borderWidth;
        if (w) cell.borderWidth = w;
      }
    }
  }
}

// ../slides-core/src/text-style.ts
var LEVEL_NAMES = [
  "a:lvl1pPr",
  "a:lvl2pPr",
  "a:lvl3pPr",
  "a:lvl4pPr",
  "a:lvl5pPr",
  "a:lvl6pPr",
  "a:lvl7pPr",
  "a:lvl8pPr",
  "a:lvl9pPr"
];
function parseTxStyleLevels(el2, theme) {
  const levels = Array.from({ length: 9 }, () => ({}));
  if (!el2) return levels;
  const defPPr = firstChild(el2, "a:defPPr");
  const base = defPPr ? parsePPrLevel(defPPr, theme) : {};
  for (let i2 = 0; i2 < 9; i2++) {
    const lvlEl = firstChild(el2, LEVEL_NAMES[i2]);
    levels[i2] = lvlEl ? { ...base, ...parsePPrLevel(lvlEl, theme) } : { ...base };
  }
  return levels;
}
function parsePPrLevel(pPr, theme) {
  const lvl = {};
  if (pPr.attrs["algn"]) lvl.align = pPr.attrs["algn"];
  if (pPr.attrs["marL"] !== void 0) lvl.marL = parseInt(pPr.attrs["marL"], 10);
  if (pPr.attrs["indent"] !== void 0) lvl.indent = parseInt(pPr.attrs["indent"], 10);
  const lnSpc = firstChild(pPr, "a:lnSpc");
  if (lnSpc) {
    const pct2 = firstChild(lnSpc, "a:spcPct");
    const pts = firstChild(lnSpc, "a:spcPts");
    if (pct2?.attrs["val"]) lvl.lineSpacing = parseInt(pct2.attrs["val"], 10) / 1e5;
    else if (pts?.attrs["val"]) lvl.lineSpacingPt = parseInt(pts.attrs["val"], 10) / 100;
  }
  const spcBefEl = firstChild(pPr, "a:spcBef");
  const befPts = spcBefEl ? firstChild(spcBefEl, "a:spcPts") : void 0;
  if (befPts?.attrs["val"]) lvl.spaceBeforePt = parseInt(befPts.attrs["val"], 10) / 100;
  const spcAftEl = firstChild(pPr, "a:spcAft");
  const aftPts = spcAftEl ? firstChild(spcAftEl, "a:spcPts") : void 0;
  if (aftPts?.attrs["val"]) lvl.spaceAfterPt = parseInt(aftPts.attrs["val"], 10) / 100;
  const buChar = firstChild(pPr, "a:buChar");
  if (buChar?.attrs["char"]) lvl.buChar = buChar.attrs["char"];
  const buAuto = firstChild(pPr, "a:buAutoNum");
  if (buAuto) lvl.buAutoNum = buAuto.attrs["type"] ?? "arabicPeriod";
  if (firstChild(pPr, "a:buNone")) lvl.buNone = true;
  const defRPr = firstChild(pPr, "a:defRPr");
  if (defRPr) {
    if (defRPr.attrs["sz"]) lvl.sz = parseInt(defRPr.attrs["sz"], 10) / 100;
    if (defRPr.attrs["b"] !== void 0) lvl.bold = defRPr.attrs["b"] === "1";
    if (defRPr.attrs["i"] !== void 0) lvl.italic = defRPr.attrs["i"] === "1";
    const sf = firstChild(defRPr, "a:solidFill");
    if (sf) {
      const c = colorFromDml(childElements(sf)[0], theme);
      if (c) lvl.color = c;
    }
    const latin = firstChild(defRPr, "a:latin");
    if (latin?.attrs["typeface"]) lvl.font = latin.attrs["typeface"];
    const eff = firstChild(defRPr, "a:effectLst");
    const shd = eff ? firstChild(eff, "a:outerShdw") : void 0;
    if (shd) {
      const colorEl = childElements(shd)[0];
      let color = "#000000", alpha = 0.6;
      if (colorEl) {
        const c = colorFromDml(colorEl, theme);
        if (c) color = c;
        const aEl = firstChild(colorEl, "a:alpha");
        if (aEl?.attrs["val"]) alpha = parseInt(aEl.attrs["val"], 10) / 1e5;
      }
      lvl.shadow = {
        color,
        blurRad: shd.attrs["blurRad"] ? parseInt(shd.attrs["blurRad"], 10) : 0,
        dist: shd.attrs["dist"] ? parseInt(shd.attrs["dist"], 10) : 0,
        dirDeg: (shd.attrs["dir"] ? parseInt(shd.attrs["dir"], 10) : 54e5) / 6e4,
        alpha
      };
    }
  }
  return lvl;
}
function mergeStyleLevels(...layers) {
  const out = Array.from({ length: 9 }, () => ({}));
  for (const layer of layers) {
    for (let i2 = 0; i2 < 9; i2++) {
      const src = layer[i2];
      if (!src) continue;
      const dst = out[i2];
      if (src.sz !== void 0) dst.sz = src.sz;
      if (src.bold !== void 0) dst.bold = src.bold;
      if (src.italic !== void 0) dst.italic = src.italic;
      if (src.color !== void 0) dst.color = src.color;
      if (src.font !== void 0) dst.font = src.font;
      if (src.align !== void 0) dst.align = src.align;
      if (src.shadow !== void 0) dst.shadow = src.shadow;
      if (src.lineSpacing !== void 0) {
        dst.lineSpacing = src.lineSpacing;
        delete dst.lineSpacingPt;
      }
      if (src.lineSpacingPt !== void 0) {
        dst.lineSpacingPt = src.lineSpacingPt;
        delete dst.lineSpacing;
      }
      if (src.spaceBeforePt !== void 0) dst.spaceBeforePt = src.spaceBeforePt;
      if (src.spaceAfterPt !== void 0) dst.spaceAfterPt = src.spaceAfterPt;
      if (src.marL !== void 0) dst.marL = src.marL;
      if (src.indent !== void 0) dst.indent = src.indent;
      if (src.buChar !== void 0 || src.buAutoNum !== void 0 || src.buNone) {
        delete dst.buChar;
        delete dst.buAutoNum;
        delete dst.buNone;
        if (src.buChar !== void 0) dst.buChar = src.buChar;
        if (src.buAutoNum !== void 0) dst.buAutoNum = src.buAutoNum;
        if (src.buNone) dst.buNone = true;
      }
    }
  }
  return out;
}
function resolveFontAlias(font, theme) {
  if (font === void 0) return void 0;
  if (font.startsWith("+mj")) return theme.fonts?.major;
  if (font.startsWith("+mn")) return theme.fonts?.minor;
  return font;
}
function applyTextStyles(tb, levels, theme) {
  for (const p of tb.paragraphs) {
    const lvl = levels[Math.min(p.level ?? 0, 8)] ?? {};
    if (p.align === void 0 && lvl.align !== void 0) p.align = lvl.align;
    if (p.lineSpacing === void 0 && p.lineSpacingPt === void 0) {
      if (lvl.lineSpacing !== void 0) p.lineSpacing = lvl.lineSpacing;
      else if (lvl.lineSpacingPt !== void 0) p.lineSpacingPt = lvl.lineSpacingPt;
    }
    if (p.spaceBeforePt === void 0 && lvl.spaceBeforePt !== void 0) p.spaceBeforePt = lvl.spaceBeforePt;
    if (p.spaceAfterPt === void 0 && lvl.spaceAfterPt !== void 0) p.spaceAfterPt = lvl.spaceAfterPt;
    if (p.marL === void 0 && lvl.marL !== void 0) p.marL = lvl.marL;
    if (p.indent === void 0 && lvl.indent !== void 0) p.indent = lvl.indent;
    if (p.bullet === void 0) {
      if (lvl.buChar !== void 0) {
        p.bullet = true;
        p.bulletChar = lvl.buChar;
      } else if (lvl.buAutoNum !== void 0) {
        p.bullet = true;
        p.bulletAutoNum = lvl.buAutoNum;
      } else if (lvl.buNone) p.bullet = false;
    } else if (p.bullet && p.bulletChar === void 0 && p.bulletAutoNum === void 0) {
      if (lvl.buChar !== void 0) p.bulletChar = lvl.buChar;
      else if (lvl.buAutoNum !== void 0) p.bulletAutoNum = lvl.buAutoNum;
    }
    for (const r of p.runs) {
      if (r.sz === void 0 && lvl.sz !== void 0) r.sz = lvl.sz;
      if (r.bold === void 0 && lvl.bold !== void 0) r.bold = lvl.bold;
      if (r.italic === void 0 && lvl.italic !== void 0) r.italic = lvl.italic;
      if (r.color === void 0 && lvl.color !== void 0) r.color = lvl.color;
      if (r.shadow === void 0 && lvl.shadow !== void 0) r.shadow = lvl.shadow;
      if (r.font === void 0 && lvl.font !== void 0) {
        const f = resolveFontAlias(lvl.font, theme);
        if (f !== void 0) r.font = f;
      } else if (r.font !== void 0 && r.font.startsWith("+")) {
        const f = resolveFontAlias(r.font, theme);
        if (f !== void 0) r.font = f;
      }
    }
  }
}
function masterStyleFor(ctx, phType) {
  if (phType === "title" || phType === "ctrTitle") return ctx.titleStyle;
  if (phType === "body" || phType === "subTitle") return ctx.bodyStyle;
  return ctx.otherStyle;
}
function applyShapeTextCascade(sh, ctx, theme, phKeys) {
  if (!sh.txBody) return;
  const layers = [ctx.defaultStyle, masterStyleFor(ctx, sh.phType)];
  if (sh.styleFontColor !== void 0 || sh.styleFontIdx !== void 0) {
    const font = sh.styleFontIdx === "major" ? theme.fonts?.major : sh.styleFontIdx === "minor" ? theme.fonts?.minor : void 0;
    const lvl = {};
    if (sh.styleFontColor !== void 0) lvl.color = sh.styleFontColor;
    if (font !== void 0) lvl.font = font;
    layers.push(Array.from({ length: 9 }, () => ({ ...lvl })));
  }
  for (const map of [ctx.masterPh, ctx.layoutPh]) {
    for (const key of phKeys) {
      const ls = map.get(key);
      if (ls) {
        layers.push(ls);
        break;
      }
    }
  }
  if (sh.txBody.lstStyle) layers.push(sh.txBody.lstStyle);
  applyTextStyles(sh.txBody, mergeStyleLevels(...layers), theme);
}

// ../slides-core/src/timing.ts
function unwrapAlternate(root, name) {
  const direct = firstChild(root, name);
  if (direct) return direct;
  for (const ac of childElements(root, "mc:AlternateContent")) {
    for (const branch of childElements(ac)) {
      if (branch.name !== "mc:Choice" && branch.name !== "mc:Fallback") continue;
      const el2 = firstChild(branch, name);
      if (el2) return el2;
    }
  }
  return void 0;
}
var SPEED_MS = { fast: 500, med: 750, slow: 1e3 };
function parseSlideTransition(sld) {
  const el2 = unwrapAlternate(sld, "p:transition");
  if (!el2) return void 0;
  let durMs = SPEED_MS[el2.attrs["spd"] ?? "fast"] ?? 500;
  const p14dur = el2.attrs["p14:dur"];
  if (p14dur !== void 0 && /^\d+$/.test(p14dur)) durMs = parseInt(p14dur, 10);
  const fx = childElements(el2).find((c) => !c.name.endsWith(":sndAc") && c.name !== "p:extLst");
  const info = {
    type: fx ? fx.name.slice(fx.name.indexOf(":") + 1) : "none",
    ns: fx ? fx.name.slice(0, fx.name.indexOf(":")) : "",
    attrs: fx ? { ...fx.attrs } : {},
    durMs,
    advClick: el2.attrs["advClick"] !== "0" && el2.attrs["advClick"] !== "false"
  };
  const adv = el2.attrs["advTm"];
  if (adv !== void 0 && /^\d+$/.test(adv)) info.advTmMs = parseInt(adv, 10);
  return info;
}
function num(v) {
  if (v === void 0) return void 0;
  if (v === "indefinite") return Infinity;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : void 0;
}
function parseConds(lst) {
  if (!lst) return [];
  return childElements(lst, "p:cond").map((c) => {
    const d = c.attrs["delay"];
    const cond = { delayMs: d === void 0 ? 0 : d === "indefinite" ? null : parseFloat(d) || 0 };
    if (c.attrs["evt"]) cond.evt = c.attrs["evt"];
    return cond;
  });
}
function parseCTn(tag, cTn) {
  const a = cTn.attrs;
  const node = { tag, st: parseConds(firstChild(cTn, "p:stCondLst")), children: [] };
  if (a["id"]) node.id = a["id"];
  const dur = num(a["dur"]);
  if (dur !== void 0) node.dur = dur;
  const rc = num(a["repeatCount"]);
  if (rc !== void 0) node.repeat = rc === Infinity ? Infinity : rc / 1e3;
  if (a["autoRev"] === "1" || a["autoRev"] === "true") node.autoRev = true;
  const accel = num(a["accel"]);
  if (accel) node.accel = accel / 1e5;
  const decel = num(a["decel"]);
  if (decel) node.decel = decel / 1e5;
  if (a["fill"]) node.fill = a["fill"];
  if (a["nodeType"]) node.nodeType = a["nodeType"];
  if (a["presetClass"]) node.presetClass = a["presetClass"];
  const pid = num(a["presetID"]);
  if (pid !== void 0) node.presetId = pid;
  const pst = num(a["presetSubtype"]);
  if (pst !== void 0) node.presetSubtype = pst;
  if (a["grpId"] !== void 0) node.grpId = a["grpId"];
  const spd = num(a["spd"]);
  if (spd !== void 0 && spd > 0) node.spd = spd / 1e5;
  if (a["tmFilter"]) {
    const pts = a["tmFilter"].split(";").map((pair) => pair.split(",").map((v) => parseFloat(v))).filter((xy) => xy.length === 2 && Number.isFinite(xy[0]) && Number.isFinite(xy[1]));
    if (pts.length >= 2) node.tmFilter = pts;
  }
  const it = firstChild(cTn, "p:iterate");
  if (it) {
    const type = it.attrs["type"] ?? "el";
    const iter = { type, backwards: it.attrs["backwards"] === "1" };
    const pct2 = firstChild(it, "p:tmPct");
    const abs = firstChild(it, "p:tmAbs");
    if (pct2?.attrs["val"] !== void 0) iter.pct = parseFloat(pct2.attrs["val"]) / 1e5;
    if (abs?.attrs["val"] !== void 0) iter.absMs = parseFloat(abs.attrs["val"]);
    node.iterate = iter;
  }
  return node;
}
function parseTarget(tgtEl) {
  if (!tgtEl) return void 0;
  const sp = firstChild(tgtEl, "p:spTgt");
  if (!sp?.attrs["spid"]) return void 0;
  const t = { spid: sp.attrs["spid"] };
  const txEl = firstChild(sp, "p:txEl");
  if (txEl) {
    const pRg = firstChild(txEl, "p:pRg");
    const cRg = firstChild(txEl, "p:charRg");
    if (pRg) t.pRange = [parseInt(pRg.attrs["st"] ?? "0", 10), parseInt(pRg.attrs["end"] ?? "0", 10)];
    if (cRg) t.charRange = [parseInt(cRg.attrs["st"] ?? "0", 10), parseInt(cRg.attrs["end"] ?? "0", 10)];
  }
  for (const k of ["p:bg", "p:subSp", "p:oleChartEl", "p:inkTgt", "p:graphicEl"]) {
    if (firstChild(sp, k)) t.sub = k.slice(2);
  }
  return t;
}
var BEHAVIORS = /* @__PURE__ */ new Set(["set", "anim", "animEffect", "animMotion", "animRot", "animScale", "animClr", "cmd"]);
function colorChild(el2) {
  if (!el2) return void 0;
  return childElements(el2).find((c) => /^a:(srgbClr|schemeClr|sysClr|prstClr|scrgbClr|hslClr)$/.test(c.name));
}
function readXY(el2, div) {
  if (!el2) return void 0;
  const x2 = num(el2.attrs["x"]), y = num(el2.attrs["y"]);
  if (x2 === void 0 && y === void 0) return void 0;
  return [(x2 ?? 0) / div, (y ?? 0) / div];
}
function readVal(el2, color) {
  if (!el2) return {};
  for (const c of childElements(el2)) {
    if (c.name === "p:strVal") return { val: c.attrs["val"] ?? "" };
    if (c.name === "p:fltVal" || c.name === "p:intVal") return { val: parseFloat(c.attrs["val"] ?? "0") };
    if (c.name === "p:boolVal") return { val: c.attrs["val"] === "1" || c.attrs["val"] === "true" ? 1 : 0 };
    if (c.name === "p:clrVal") {
      const ce = colorChild(c);
      const hex2 = ce && color ? color(ce) : void 0;
      return hex2 ? { color: hex2 } : {};
    }
  }
  return {};
}
function parseTimeNode(el2, color) {
  const tag = el2.name.slice(el2.name.indexOf(":") + 1);
  if (tag === "par" || tag === "seq" || tag === "excl") {
    const cTn = firstChild(el2, "p:cTn");
    if (!cTn) return null;
    const node = parseCTn(tag, cTn);
    const lst = firstChild(cTn, "p:childTnLst");
    if (lst) for (const c of childElements(lst)) {
      const n = parseTimeNode(c, color);
      if (n) node.children.push(n);
    }
    return node;
  }
  if (BEHAVIORS.has(tag)) {
    const cBhvr = firstChild(el2, "p:cBhvr");
    const cTn = cBhvr ? firstChild(cBhvr, "p:cTn") : void 0;
    if (!cBhvr || !cTn) return null;
    const node = parseCTn(tag, cTn);
    const t = parseTarget(firstChild(cBhvr, "p:tgtEl"));
    if (t) node.target = t;
    const names = firstChild(cBhvr, "p:attrNameLst");
    if (names) node.attrNames = childElements(names, "p:attrName").map((n) => n.children.filter((c) => typeof c === "string").join(""));
    if (cBhvr.attrs["additive"]) node.additive = cBhvr.attrs["additive"];
    const a = el2.attrs;
    if (tag === "animEffect") {
      if (a["filter"]) node.filter = a["filter"];
      if (a["transition"]) node.transition = a["transition"];
      if (a["prLst"]) node.prLst = a["prLst"];
    } else if (tag === "set") {
      const v = readVal(firstChild(el2, "p:to"), color);
      if (typeof v.val === "string") node.setTo = v.val;
      else if (typeof v.val === "number") node.setTo = String(v.val);
      if (v.color) node.toColor = v.color;
    } else if (tag === "anim") {
      if (a["calcmode"]) node.calcmode = a["calcmode"];
      if (a["valueType"]) node.valueType = a["valueType"];
      if (a["from"] !== void 0) node.from = a["from"];
      if (a["to"] !== void 0) node.to = a["to"];
      if (a["by"] !== void 0) node.by = a["by"];
      const lst = firstChild(el2, "p:tavLst");
      if (lst) {
        node.tav = childElements(lst, "p:tav").map((t2) => {
          const v = readVal(firstChild(t2, "p:val"), color);
          const k = { tm: t2.attrs["tm"] !== void 0 ? parseFloat(t2.attrs["tm"]) / 1e5 : NaN };
          if (v.val !== void 0) k.val = v.val;
          if (v.color) k.color = v.color;
          if (t2.attrs["fmla"]) k.fmla = t2.attrs["fmla"];
          return k;
        });
        const n = node.tav.length;
        node.tav.forEach((k, i2) => {
          if (!Number.isFinite(k.tm)) k.tm = n > 1 ? i2 / (n - 1) : 0;
        });
      }
    } else if (tag === "animScale") {
      const by = readXY(firstChild(el2, "p:by"), 1e5);
      const from = readXY(firstChild(el2, "p:from"), 1e5);
      const to = readXY(firstChild(el2, "p:to"), 1e5);
      if (by) node.byXY = by;
      if (from) node.fromXY = from;
      if (to) node.toXY = to;
    } else if (tag === "animRot") {
      const by = num(a["by"]), from = num(a["from"]), to = num(a["to"]);
      if (by !== void 0) node.rotBy = by / 6e4;
      if (from !== void 0) node.rotFrom = from / 6e4;
      if (to !== void 0) node.rotTo = to / 6e4;
    } else if (tag === "animMotion") {
      if (a["path"]) node.path = a["path"];
      if (a["origin"]) node.origin = a["origin"];
      if (a["pathEditMode"]) node.pathEditMode = a["pathEditMode"];
      const r = num(a["rAng"]);
      if (r !== void 0) node.rAng = r / 6e4;
      const by = readXY(firstChild(el2, "p:by"), 1e5);
      const from = readXY(firstChild(el2, "p:from"), 1e5);
      const to = readXY(firstChild(el2, "p:to"), 1e5);
      if (by) node.byXY = by;
      if (from) node.fromXY = from;
      if (to) node.toXY = to;
    } else if (tag === "cmd") {
      if (a["cmd"] !== void 0) node.cmd = a["cmd"];
      if (a["type"]) node.cmdType = a["type"];
    } else if (tag === "animClr") {
      if (a["clrSpc"]) node.clrSpc = a["clrSpc"];
      if (a["dir"]) node.clrDir = a["dir"];
      const toEl = colorChild(firstChild(el2, "p:to"));
      const fromEl = colorChild(firstChild(el2, "p:from"));
      if (toEl && color) {
        const c = color(toEl);
        if (c) node.toColor = c;
      }
      if (fromEl && color) {
        const c = color(fromEl);
        if (c) node.fromColor = c;
      }
      const byEl = firstChild(el2, "p:by");
      const hsl = byEl ? firstChild(byEl, "p:hsl") : void 0;
      if (hsl) node.byHsl = [(num(hsl.attrs["h"]) ?? 0) / 6e4, (num(hsl.attrs["s"]) ?? 0) / 1e5, (num(hsl.attrs["l"]) ?? 0) / 1e5];
    }
    return node;
  }
  if (tag === "audio" || tag === "video") {
    const media = firstChild(el2, "p:cMediaNode");
    const cTn = media ? firstChild(media, "p:cTn") : void 0;
    if (!media || !cTn) return null;
    const node = parseCTn(tag, cTn);
    const t = parseTarget(firstChild(media, "p:tgtEl"));
    if (t) node.target = t;
    const m = media.attrs, info = {};
    if (m["vol"] !== void 0) info.vol = parseInt(m["vol"], 10) / 1e5;
    if (m["mute"] !== void 0) info.mute = m["mute"] === "1" || m["mute"] === "true";
    if (m["showWhenStopped"] !== void 0) info.showWhenStopped = !(m["showWhenStopped"] === "0" || m["showWhenStopped"] === "false");
    if (m["numSld"] !== void 0) info.numSld = parseInt(m["numSld"], 10);
    if (tag === "video" && el2.attrs["fullScrn"] !== void 0) info.fullScrn = el2.attrs["fullScrn"] === "1" || el2.attrs["fullScrn"] === "true";
    node.media = info;
    return node;
  }
  return null;
}
function beginOffset(n) {
  if (n.st.length === 0) return 0;
  for (const c of n.st) {
    if (c.delayMs === null) continue;
    if (!c.evt || c.evt === "onBegin") return c.delayMs;
  }
  return null;
}
function wholeShape(t) {
  return !t.pRange && !t.charRange && !t.sub;
}
function firstTarget(n) {
  if (n.target) return n.target;
  for (const c of n.children) {
    const t = firstTarget(c);
    if (t) return t;
  }
  return void 0;
}
function simpleDur(n, ctx) {
  let base;
  if (n.dur !== void 0) base = n.dur;
  else if (n.tag === "seq") {
    base = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break;
      base += b + activeDur(c, ctx);
    }
  } else {
    base = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) continue;
      base = Math.max(base, b + activeDur(c, ctx));
    }
  }
  if (n.iterate && Number.isFinite(base)) {
    const tgt = firstTarget(n);
    const count = Math.max(1, ctx.units(tgt, n.iterate.type));
    const gap = n.iterate.absMs ?? (n.iterate.pct ?? 0) * base;
    const bg = tgt && wholeShape(tgt) && ctx.animBg?.(tgt.spid, n.grpId) ? base : 0;
    base += bg + (count - 1) * gap;
  }
  return base;
}
function blockDur(n, ctx) {
  const d = activeDur(n, ctx);
  if (Number.isFinite(d)) return d;
  if (n.repeat === Infinity) return 0;
  let base = 0;
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null) continue;
    base = Math.max(base, b + blockDur(c, ctx));
  }
  if (n.iterate) {
    const tgt = firstTarget(n);
    const count = Math.max(1, ctx.units(tgt, n.iterate.type));
    const gap = n.iterate.absMs ?? 0;
    base += (count - 1) * gap;
  }
  return base;
}
function activeDur(n, ctx) {
  let d = simpleDur(n, ctx) * (n.autoRev ? 2 : 1);
  if (n.repeat !== void 0) d = n.repeat === Infinity ? Infinity : d * n.repeat;
  return d;
}
function firstOf(n, tag) {
  if (n.tag === tag) return n;
  for (const c of n.children) {
    const f = firstOf(c, tag);
    if (f) return f;
  }
  return void 0;
}
function collectEffects(n, t0, ctx, out) {
  if (n.presetClass) {
    const fx = {
      presetClass: n.presetClass,
      presetId: n.presetId ?? 0,
      presetSubtype: n.presetSubtype ?? 0,
      startMs: t0,
      durMs: activeDur(n, ctx),
      blockMs: blockDur(n, ctx),
      node: n
    };
    if (n.id) fx.id = n.id;
    if (n.nodeType) fx.nodeType = n.nodeType;
    if (n.fill) fx.fill = n.fill;
    const t = firstTarget(n);
    if (t) fx.target = t;
    const ae = firstOf(n, "animEffect");
    if (ae?.filter) fx.filter = ae.filter;
    if (firstOf(n, "animMotion")) fx.motion = true;
    out.push(fx);
    return;
  }
  if (n.tag === "seq") {
    let t = t0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break;
      t += b;
      collectEffects(c, t, ctx, out);
      t += activeDur(c, ctx);
    }
    return;
  }
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null) continue;
    collectEffects(c, t0 + b, ctx, out);
  }
}
function firstNodeType(n) {
  if (n.presetClass) return n.nodeType;
  for (const c of n.children) {
    const t = firstNodeType(c);
    if (t) return t;
  }
  return void 0;
}
function collectGroup(group, t0, ctx, out) {
  let prevEnd = t0;
  let end = t0;
  group.children.forEach((sub, i2) => {
    const b = beginOffset(sub);
    if (b === null) return;
    const start = i2 > 0 && firstNodeType(sub) === "afterEffect" ? prevEnd : t0 + b;
    collectEffects(sub, start, ctx, out);
    prevEnd = start + blockDur(sub, ctx);
    end = Math.max(end, prevEnd);
  });
  return end;
}
function stepFrom(nodes, auto, ctx) {
  const effects = [];
  let t = 0;
  for (const { node, offset } of nodes) {
    t += offset;
    t = node.presetClass ? (collectEffects(node, t, ctx, effects), t + activeDur(node, ctx)) : collectGroup(node, t, ctx, effects);
  }
  let dur = 0;
  let hasIndefinite = false;
  for (const e of effects) {
    dur = Math.max(dur, e.startMs + e.blockMs);
    if (!Number.isFinite(e.durMs)) hasIndefinite = true;
  }
  return { auto, durMs: dur, hasIndefinite, effects };
}
function parseSlideTiming(sld, units, color, hasBackground2) {
  const model = { steps: [], interactive: [], hidden: sld.attrs["show"] === "0" };
  const tr = parseSlideTransition(sld);
  if (tr) model.transition = tr;
  const timing = unwrapAlternate(sld, "p:timing");
  const tnLst = timing ? firstChild(timing, "p:tnLst") : void 0;
  const rootEl = tnLst ? childElements(tnLst)[0] : void 0;
  const root = rootEl ? parseTimeNode(rootEl, color) : null;
  if (!root) return model;
  const bgSet = /* @__PURE__ */ new Set();
  const bldLst = timing ? firstChild(timing, "p:bldLst") : void 0;
  if (bldLst) for (const b of childElements(bldLst, "p:bldP")) {
    if (b.attrs["animBg"] === "1" || b.attrs["animBg"] === "true") bgSet.add(`${b.attrs["spid"]}|${b.attrs["grpId"] ?? "0"}`);
  }
  const ctx = {
    units,
    animBg: hasBackground2 ? (spid) => hasBackground2(spid) : (spid, grpId) => bgSet.has(`${spid}|${grpId ?? "0"}`)
  };
  const bgIds = /* @__PURE__ */ new Set();
  const findIter = (n) => {
    if (n.iterate && (n.iterate.type === "wd" || n.iterate.type === "lt")) {
      const t = firstTarget(n);
      if (t && wholeShape(t) && ctx.animBg(t.spid, n.grpId)) bgIds.add(t.spid);
    }
    for (const c of n.children) findIter(c);
  };
  findIter(root);
  if (bgIds.size) model.animBg = [...bgIds];
  const media = [];
  const findMedia = (n) => {
    if ((n.tag === "video" || n.tag === "audio") && n.target) {
      const m = { spid: n.target.spid, kind: n.tag };
      if (n.media?.vol !== void 0) m.vol = n.media.vol;
      if (n.media?.mute !== void 0) m.mute = n.media.mute;
      if (n.media?.showWhenStopped !== void 0) m.showWhenStopped = n.media.showWhenStopped;
      media.push(m);
    }
    for (const c of n.children) findMedia(c);
  };
  findMedia(root);
  if (media.length) model.media = media;
  const seqs = [];
  const findSeqs = (n) => {
    if (n.tag === "seq") {
      seqs.push(n);
      return;
    }
    for (const c of n.children) findSeqs(c);
  };
  findSeqs(root);
  for (const seq of seqs) {
    if (seq.nodeType === "mainSeq") {
      let cur = [];
      let curAuto = true;
      const flush = () => {
        if (cur.length) model.steps.push(stepFrom(cur, curAuto, ctx));
        cur = [];
      };
      seq.children.forEach((c, i2) => {
        const auto = i2 === 0 && c.st.some((k) => k.evt === "onBegin");
        if (!auto) {
          flush();
          curAuto = false;
        }
        cur.push({ node: c, offset: auto ? beginOffset(c) ?? 0 : 0 });
        if (!auto) flush();
      });
      flush();
    } else if (seq.nodeType === "interactiveSeq") {
      for (const c of seq.children) collectGroup({ ...c, st: [] }, 0, ctx, model.interactive);
    }
  }
  return model;
}

// ../slides-core/src/read.ts
function readRels(pkg, relsPart, ownerPart) {
  const map = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(relsPart);
  if (xml === void 0) return map;
  const root = parseXml(xml);
  for (const rel of childElements(root, "Relationship")) {
    const id = rel.attrs["Id"];
    const target = rel.attrs["Target"];
    const mode = rel.attrs["TargetMode"];
    if (id === void 0 || target === void 0) continue;
    if (mode === "External") map.set(id, target);
    else map.set(id, pkg.resolveRelTarget(ownerPart, target));
  }
  return map;
}
function relsPathFor(part) {
  const slash = part.lastIndexOf("/");
  const dir = part.slice(0, slash);
  const file = part.slice(slash + 1);
  return `${dir}/_rels/${file}.rels`;
}
function readPresentation(pkg) {
  const root = parseXml(pkg.presentationXml());
  const rels = readRels(pkg, "ppt/_rels/presentation.xml.rels", "ppt/presentation.xml");
  const sz = firstChild(root, "p:sldSz");
  const slideW = sz?.attrs["cx"] !== void 0 ? parseInt(sz.attrs["cx"], 10) : 9144e3;
  const slideH = sz?.attrs["cy"] !== void 0 ? parseInt(sz.attrs["cy"], 10) : 5143500;
  const slides = [];
  const lst = firstChild(root, "p:sldIdLst");
  if (lst) for (const s of childElements(lst, "p:sldId")) {
    const rId = s.attrs["r:id"] ?? "";
    slides.push({ id: s.attrs["id"] ?? "", rId, target: rels.get(rId) });
  }
  const pres = { slideW, slideH, slides };
  if (sz?.attrs["type"]) pres.sizeType = sz.attrs["type"];
  return pres;
}
function themeFor(pkg, part) {
  const masterPath = findRelTarget(pkg, part, "slideMaster") ?? findRelTarget(pkg, findRelTarget(pkg, part, "slideLayout") ?? "", "slideMaster");
  const themePath = masterPath ? findRelTarget(pkg, masterPath, "theme") : findRelTarget(pkg, "ppt/presentation.xml", "theme");
  return readTheme(pkg, themePath ?? "ppt/theme/theme1.xml");
}
function findRelTarget(pkg, part, typeSuffix) {
  if (!part) return void 0;
  const xml = pkg.getPartText(relsPathFor(part));
  if (xml === void 0) return void 0;
  const root = parseXml(xml);
  for (const rel of childElements(root, "Relationship")) {
    if ((rel.attrs["Type"] ?? "").endsWith("/" + typeSuffix)) {
      return pkg.resolveRelTarget(part, rel.attrs["Target"] ?? "");
    }
  }
  return void 0;
}
function readSlide(pkg, slidePath) {
  const xml = pkg.getPartText(slidePath);
  if (xml === void 0) throw new Error(`Pacote sem ${slidePath}`);
  const root = parseXml(xml);
  const theme = themeFor(pkg, slidePath);
  const slideRels = readRels(pkg, relsPathFor(slidePath), slidePath);
  const cSld = firstChild(root, "p:cSld");
  const spTree = cSld ? firstChild(cSld, "p:spTree") : void 0;
  const shapes = spTree ? readShapes(spTree, theme, pkg, slideRels) : [];
  const layoutPath = findRelTarget(pkg, slidePath, "slideLayout");
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, "slideMaster") : void 0;
  const inherited = [];
  let layoutShowMasterSp = true;
  if (layoutPath) {
    const lx = pkg.getPartText(layoutPath);
    if (lx !== void 0) {
      const lroot = parseXml(lx);
      if (lroot.attrs["showMasterSp"] === "0") layoutShowMasterSp = false;
      const parts = [
        [masterPath, layoutShowMasterSp],
        [layoutPath, true]
      ];
      for (const [part, enabled] of parts) {
        if (!part || !enabled) continue;
        const xml2 = pkg.getPartText(part);
        if (xml2 === void 0) continue;
        const tree = descend(parseXml(xml2), "p:spTree");
        if (!tree) continue;
        const partRels = readRels(pkg, relsPathFor(part), part);
        for (const sh of readShapes(tree, theme, pkg, partRels)) {
          if (sh.phType !== void 0 || sh.phIdx !== void 0) continue;
          sh.inherited = true;
          inherited.push(sh);
        }
      }
    }
  }
  if (inherited.length) shapes.unshift(...inherited);
  const phMap = placeholderXfrmMap(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.xfrm && sh.phType !== void 0) {
      const x2 = phMap.get(phKey(sh.phType, sh.phIdx)) ?? phMap.get(phKey(sh.phType)) ?? phMap.get("idx:" + (sh.phIdx ?? ""));
      if (x2) sh.xfrm = x2;
    }
  }
  const shadowMap = /* @__PURE__ */ new Map();
  for (const part of [masterPath, layoutPath]) {
    if (!part) continue;
    const xml2 = pkg.getPartText(part);
    if (xml2 === void 0) continue;
    const tree = descend(parseXml(xml2), "p:spTree");
    if (!tree) continue;
    for (const psh of readShapes(tree, theme, pkg, /* @__PURE__ */ new Map())) {
      if (psh.phType === void 0 && psh.phIdx === void 0 || !psh.shadow) continue;
      shadowMap.set(phKey(psh.phType, psh.phIdx), psh.shadow);
      shadowMap.set(phKey(psh.phType), psh.shadow);
      if (psh.phIdx !== void 0) shadowMap.set("idx:" + psh.phIdx, psh.shadow);
    }
  }
  for (const sh of shapes) {
    if (sh.shadow || sh.phType === void 0 && sh.phIdx === void 0) continue;
    const inh = shadowMap.get(phKey(sh.phType, sh.phIdx)) ?? shadowMap.get(phKey(sh.phType)) ?? shadowMap.get("idx:" + (sh.phIdx ?? ""));
    if (inh) sh.shadow = inh;
  }
  const bodyPrMap = placeholderBodyPrMap(pkg, slidePath);
  for (const sh of shapes) {
    if (!sh.txBody || sh.phType === void 0 && sh.phIdx === void 0) continue;
    const inh = bodyPrMap.get(phKey(sh.phType, sh.phIdx)) ?? bodyPrMap.get(phKey(sh.phType)) ?? bodyPrMap.get("idx:" + (sh.phIdx ?? ""));
    if (!inh) continue;
    const tb = sh.txBody;
    if (tb.anchor === void 0 && inh.anchor !== void 0) tb.anchor = inh.anchor;
    if (tb.wrap === void 0 && inh.wrap !== void 0) tb.wrap = inh.wrap;
    if (tb.insL === void 0 && inh.insL !== void 0) tb.insL = inh.insL;
    if (tb.insT === void 0 && inh.insT !== void 0) tb.insT = inh.insT;
    if (tb.insR === void 0 && inh.insR !== void 0) tb.insR = inh.insR;
    if (tb.insB === void 0 && inh.insB !== void 0) tb.insB = inh.insB;
    if (tb.numCol === void 0 && inh.numCol !== void 0) tb.numCol = inh.numCol;
    if (tb.spcCol === void 0 && inh.spcCol !== void 0) tb.spcCol = inh.spcCol;
    if (tb.fontScale === void 0 && inh.fontScale !== void 0) tb.fontScale = inh.fontScale;
    if (tb.lnSpcReduction === void 0 && inh.lnSpcReduction !== void 0) tb.lnSpcReduction = inh.lnSpcReduction;
  }
  const styleCtx = buildTextStyleContext(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.txBody) continue;
    const keys = sh.phType !== void 0 || sh.phIdx !== void 0 ? [phKey(sh.phType, sh.phIdx), phKey(sh.phType), "idx:" + (sh.phIdx ?? "")] : [];
    applyShapeTextCascade(sh, styleCtx, theme, keys);
  }
  for (const sh of shapes) {
    if (!sh.table) continue;
    const base = mergeStyleLevels(styleCtx.defaultStyle, styleCtx.otherStyle);
    for (const row of sh.table.rows) {
      for (const cell of row.cells) {
        if (!cell.txBody) continue;
        const overlay = {};
        if (cell.txColor !== void 0) overlay.color = cell.txColor;
        if (cell.txBold) overlay.bold = true;
        const levels = overlay.color !== void 0 || overlay.bold !== void 0 ? mergeStyleLevels(base, Array.from({ length: 9 }, () => ({ ...overlay }))) : base;
        applyTextStyles(cell.txBody, levels, theme);
      }
    }
  }
  const slide = { shapes };
  const applyBg = (part, partRoot, rels) => {
    const bgEl = descend(partRoot, "p:bg");
    if (!bgEl) return false;
    const bgPr = firstChild(bgEl, "p:bgPr");
    if (!bgPr) return false;
    const c = solidFillColor(bgPr, theme);
    if (c) slide.bg = { type: "solid", color: c };
    if (!slide.bg) {
      const grad = firstChild(bgPr, "a:gradFill");
      if (grad) {
        const g = parseGradFill(grad, theme);
        if (g) slide.bg = g;
      }
    }
    const blip = descend(bgPr, "a:blip");
    if (blip) {
      const img = resolveBlip(blip, pkg, rels);
      if (img) slide.bgImage = img;
    }
    return slide.bg !== void 0 || slide.bgImage !== void 0;
  };
  let bgDone = cSld ? applyBg(slidePath, cSld, slideRels) : false;
  if (!bgDone && layoutPath) {
    const lx = pkg.getPartText(layoutPath);
    if (lx !== void 0) {
      bgDone = applyBg(layoutPath, parseXml(lx), readRels(pkg, relsPathFor(layoutPath), layoutPath));
    }
  }
  if (!bgDone && masterPath) {
    const mx = pkg.getPartText(masterPath);
    if (mx !== void 0) {
      applyBg(masterPath, parseXml(mx), readRels(pkg, relsPathFor(masterPath), masterPath));
    }
  }
  const timing = firstChild(root, "p:timing");
  if (timing) {
    const anims = parseTiming(timing);
    if (anims.length) slide.animations = anims;
  }
  const transEl = firstChild(root, "p:transition");
  if (transEl) slide.transition = parseTransition(transEl);
  slide.timing = parseSlideTiming(root, countTextUnits(shapes), (el2) => colorFromDml(el2, theme), hasBackground(shapes));
  return slide;
}
function hasBackground(shapes) {
  return (spid) => {
    const sh = shapes.find((s) => !s.inherited && s.id === spid);
    if (!sh) return false;
    return !!(sh.fillImage || sh.fill && sh.fill.type !== "none" || sh.lineColor && !sh.lineNone);
  };
}
function countTextUnits(shapes) {
  return (target, type) => {
    if (!target || type === "el") return 1;
    const sh = shapes.find((s) => !s.inherited && s.id === target.spid);
    let paras = sh?.txBody?.paragraphs ?? [];
    if (target.pRange) paras = paras.slice(target.pRange[0], target.pRange[1] + 1);
    let text = paras.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
    if (target.charRange) text = text.slice(target.charRange[0], target.charRange[1]);
    if (type === "wd") return Math.max(1, text.split(/\s+/).filter(Boolean).length);
    return Math.max(1, text.replace(/\s/g, "").length);
  };
}
function parseTransition(el2) {
  const spd = el2.attrs["spd"] ?? "med";
  const durMs = spd === "fast" ? 300 : spd === "slow" ? 1e3 : 500;
  for (const c of childElements(el2)) {
    switch (c.name) {
      case "p:fade":
        return { type: "fade", durMs };
      case "p:push":
        return { type: "push", durMs, dir: c.attrs["dir"] };
      case "p:cover":
        return { type: "cover", durMs, dir: c.attrs["dir"] };
      case "p:wipe":
        return { type: "wipe", durMs, dir: c.attrs["dir"] };
      case "p:dissolve":
        return { type: "dissolve", durMs };
      case "p:blinds":
        return { type: "blinds", durMs, dir: c.attrs["dir"] };
      case "p:split":
        return { type: "split", durMs, dir: c.attrs["dir"] };
      case "p:circle":
        return { type: "circle", durMs };
    }
  }
  return { type: "fade", durMs };
}
function parseTiming(timing) {
  const out = [];
  const mainSeq = deepFindAttr(timing, "p:cTn", "nodeType", "mainSeq");
  if (!mainSeq) return out;
  const childList = firstChild(mainSeq, "p:childTnLst");
  if (!childList) return out;
  let acc = 0;
  for (const par of childElements(childList, "p:par")) {
    const cTn = firstChild(par, "p:cTn");
    if (!cTn) continue;
    const stDelay = readCondDelay(cTn);
    acc += stDelay;
    const inner = firstChild(cTn, "p:childTnLst");
    if (!inner) continue;
    for (const ipar of childElements(inner, "p:par")) {
      const icTn = firstChild(ipar, "p:cTn");
      if (!icTn) continue;
      if (icTn.attrs["presetClass"] !== "entr") continue;
      const localDelay = readCondDelay(icTn);
      const clickGated = icTn.attrs["nodeType"] === "clickEffect";
      const grandKids = firstChild(icTn, "p:childTnLst");
      if (!grandKids) continue;
      let type = "appear";
      let durMs = 500;
      let spid;
      for (const k of childElements(grandKids)) {
        if (k.name === "p:animEffect") {
          if (k.attrs["filter"]?.includes("fade")) type = "fade";
          const cBhvr = firstChild(k, "p:cBhvr");
          const innerCTn = cBhvr ? firstChild(cBhvr, "p:cTn") : void 0;
          if (innerCTn?.attrs["dur"]) durMs = parseInt(innerCTn.attrs["dur"], 10);
          const tgt = cBhvr ? firstChild(cBhvr, "p:tgtEl") : void 0;
          const spTgt = tgt ? firstChild(tgt, "p:spTgt") : void 0;
          if (spTgt?.attrs["spid"]) spid = spTgt.attrs["spid"];
        } else if (k.name === "p:set" && !spid) {
          const cBhvr = firstChild(k, "p:cBhvr");
          const tgt = cBhvr ? firstChild(cBhvr, "p:tgtEl") : void 0;
          const spTgt = tgt ? firstChild(tgt, "p:spTgt") : void 0;
          if (spTgt?.attrs["spid"]) spid = spTgt.attrs["spid"];
        }
      }
      if (!spid) continue;
      out.push({ spid, delayMs: acc + localDelay, durMs, type, clickGated });
    }
  }
  return out;
}
function readCondDelay(cTn) {
  const st = firstChild(cTn, "p:stCondLst");
  if (!st) return 0;
  const cond = firstChild(st, "p:cond");
  if (!cond) return 0;
  const d = cond.attrs["delay"];
  if (!d || d === "indefinite") return 0;
  return parseInt(d, 10) || 0;
}
function deepFindAttr(el2, name, attr, val) {
  for (const c of el2.children) {
    if (typeof c === "string") continue;
    if (c.name === name && c.attrs[attr] === val) return c;
    const f = deepFindAttr(c, name, attr, val);
    if (f) return f;
  }
  return void 0;
}
function phKey(type, idx) {
  const t = type === "ctrTitle" ? "title" : type ?? "body";
  return idx !== void 0 ? `${t}#${idx}` : t;
}
function placeholderXfrmMap(pkg, slidePath, theme) {
  const map = /* @__PURE__ */ new Map();
  const layoutPath = findRelTarget(pkg, slidePath, "slideLayout");
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, "slideMaster") : void 0;
  for (const part of [masterPath, layoutPath]) {
    if (!part) continue;
    const xml = pkg.getPartText(part);
    if (xml === void 0) continue;
    const tree = descend(parseXml(xml), "p:spTree");
    if (!tree) continue;
    for (const sh of readShapes(tree, theme, pkg, /* @__PURE__ */ new Map())) {
      if (sh.phType === void 0 && sh.phIdx === void 0) continue;
      if (!sh.xfrm) continue;
      map.set(phKey(sh.phType, sh.phIdx), sh.xfrm);
      map.set(phKey(sh.phType), sh.xfrm);
      if (sh.phIdx !== void 0) map.set("idx:" + sh.phIdx, sh.xfrm);
    }
  }
  return map;
}
function emptyLevels() {
  return Array.from({ length: 9 }, () => ({}));
}
function placeholderBodyPrMap(pkg, slidePath) {
  const map = /* @__PURE__ */ new Map();
  const layoutPath = findRelTarget(pkg, slidePath, "slideLayout");
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, "slideMaster") : void 0;
  for (const part of [masterPath, layoutPath]) {
    if (!part) continue;
    const xml = pkg.getPartText(part);
    if (xml === void 0) continue;
    const tree = descend(parseXml(xml), "p:spTree");
    if (!tree) continue;
    for (const sp of childElements(tree, "p:sp")) {
      const nv = firstChild(sp, "p:nvSpPr");
      const ph = nv ? firstChild(firstChild(nv, "p:nvPr") ?? nv, "p:ph") : void 0;
      if (!ph) continue;
      const txBody = firstChild(sp, "p:txBody");
      const bodyPr = txBody ? firstChild(txBody, "a:bodyPr") : void 0;
      if (!bodyPr) continue;
      const props = {};
      if (bodyPr.attrs["anchor"]) props.anchor = bodyPr.attrs["anchor"];
      if (bodyPr.attrs["wrap"]) props.wrap = bodyPr.attrs["wrap"];
      if (bodyPr.attrs["lIns"] !== void 0) props.insL = parseInt(bodyPr.attrs["lIns"], 10);
      if (bodyPr.attrs["tIns"] !== void 0) props.insT = parseInt(bodyPr.attrs["tIns"], 10);
      if (bodyPr.attrs["rIns"] !== void 0) props.insR = parseInt(bodyPr.attrs["rIns"], 10);
      if (bodyPr.attrs["bIns"] !== void 0) props.insB = parseInt(bodyPr.attrs["bIns"], 10);
      if (bodyPr.attrs["numCol"] !== void 0) props.numCol = parseInt(bodyPr.attrs["numCol"], 10);
      if (bodyPr.attrs["spcCol"] !== void 0) props.spcCol = parseInt(bodyPr.attrs["spcCol"], 10);
      const na = firstChild(bodyPr, "a:normAutofit");
      if (na) {
        if (na.attrs["fontScale"] !== void 0) props.fontScale = parseInt(na.attrs["fontScale"], 10) / 1e5;
        if (na.attrs["lnSpcReduction"] !== void 0) props.lnSpcReduction = parseInt(na.attrs["lnSpcReduction"], 10) / 1e5;
      }
      if (Object.keys(props).length === 0) continue;
      const type = ph.attrs["type"] ?? "body";
      const idx = ph.attrs["idx"];
      map.set(phKey(type, idx), props);
      map.set(phKey(type), props);
      if (idx !== void 0) map.set("idx:" + idx, props);
    }
  }
  return map;
}
function buildTextStyleContext(pkg, slidePath, theme) {
  const ctx = {
    defaultStyle: emptyLevels(),
    titleStyle: emptyLevels(),
    bodyStyle: emptyLevels(),
    otherStyle: emptyLevels(),
    masterPh: /* @__PURE__ */ new Map(),
    layoutPh: /* @__PURE__ */ new Map()
  };
  const presXml = pkg.getPartText("ppt/presentation.xml");
  if (presXml !== void 0) {
    const dts = firstChild(parseXml(presXml), "p:defaultTextStyle");
    if (dts) ctx.defaultStyle = parseTxStyleLevels(dts, theme);
  }
  const layoutPath = findRelTarget(pkg, slidePath, "slideLayout");
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, "slideMaster") : void 0;
  if (masterPath) {
    const xml = pkg.getPartText(masterPath);
    if (xml !== void 0) {
      const root = parseXml(xml);
      const tx = firstChild(root, "p:txStyles");
      if (tx) {
        ctx.titleStyle = parseTxStyleLevels(firstChild(tx, "p:titleStyle"), theme);
        ctx.bodyStyle = parseTxStyleLevels(firstChild(tx, "p:bodyStyle"), theme);
        ctx.otherStyle = parseTxStyleLevels(firstChild(tx, "p:otherStyle"), theme);
      }
      collectPhStyles(root, theme, pkg, ctx.masterPh);
    }
  }
  if (layoutPath) {
    const xml = pkg.getPartText(layoutPath);
    if (xml !== void 0) collectPhStyles(parseXml(xml), theme, pkg, ctx.layoutPh);
  }
  return ctx;
}
function collectPhStyles(root, theme, pkg, map) {
  const tree = descend(root, "p:spTree");
  if (!tree) return;
  for (const sh of readShapes(tree, theme, pkg, /* @__PURE__ */ new Map())) {
    if (sh.phType === void 0 && sh.phIdx === void 0) continue;
    const ls = sh.txBody?.lstStyle;
    if (!ls) continue;
    map.set(phKey(sh.phType, sh.phIdx), ls);
    if (!map.has(phKey(sh.phType))) map.set(phKey(sh.phType), ls);
    if (sh.phIdx !== void 0 && !map.has("idx:" + sh.phIdx)) map.set("idx:" + sh.phIdx, ls);
  }
}
function readShapes(spTree, theme, pkg, rels) {
  const out = [];
  for (const c of childElements(spTree)) {
    if (c.name === "p:sp" || c.name === "p:cxnSp") out.push(readShape(c, theme, pkg, rels));
    else if (c.name === "p:pic") out.push(readPic(c, theme, pkg, rels));
    else if (c.name === "p:graphicFrame") {
      const gf = readGraphicFrame(c, pkg, rels, theme);
      if (Array.isArray(gf)) out.push(...gf);
      else if (gf) out.push(gf);
    } else if (c.name === "p:grpSp") {
      out.push(...readGroup(c, theme, pkg, rels));
    }
  }
  return out;
}
function readGroup(grp, theme, pkg, rels) {
  const children2 = readShapes(grp, theme, pkg, rels);
  const nvGrp = firstChild(grp, "p:nvGrpSpPr");
  const gid = nvGrp ? firstChild(nvGrp, "p:cNvPr")?.attrs["id"] : void 0;
  if (gid !== void 0) for (const sh of children2) sh.groupIds = [gid, ...sh.groupIds ?? []];
  const grpSpPr = firstChild(grp, "p:grpSpPr");
  const xfrmEl = grpSpPr ? firstChild(grpSpPr, "a:xfrm") : void 0;
  if (!xfrmEl) return children2;
  const num2 = (el2, a, dflt2) => el2?.attrs[a] !== void 0 ? parseInt(el2.attrs[a], 10) : dflt2;
  const off = firstChild(xfrmEl, "a:off");
  const ext = firstChild(xfrmEl, "a:ext");
  const chOff = firstChild(xfrmEl, "a:chOff");
  const chExt = firstChild(xfrmEl, "a:chExt");
  const gx = num2(off, "x", 0), gy = num2(off, "y", 0);
  const gcx = num2(ext, "cx", 0), gcy = num2(ext, "cy", 0);
  const cox = num2(chOff, "x", gx), coy = num2(chOff, "y", gy);
  const cex = num2(chExt, "cx", gcx), cey = num2(chExt, "cy", gcy);
  const sx = cex !== 0 ? gcx / cex : 1;
  const sy = cey !== 0 ? gcy / cey : 1;
  const rotRaw = xfrmEl.attrs["rot"] ? parseInt(xfrmEl.attrs["rot"], 10) : 0;
  const flipH = xfrmEl.attrs["flipH"] === "1";
  const flipV = xfrmEl.attrs["flipV"] === "1";
  const gCenterX = gx + gcx / 2, gCenterY = gy + gcy / 2;
  for (const sh of children2) {
    const x2 = sh.xfrm;
    if (!x2) continue;
    x2.x = gx + (x2.x - cox) * sx;
    x2.y = gy + (x2.y - coy) * sy;
    x2.cx = x2.cx * sx;
    x2.cy = x2.cy * sy;
    if (flipH) {
      x2.x = 2 * gCenterX - (x2.x + x2.cx);
      x2.flipH = !x2.flipH || void 0;
      if (x2.rot) x2.rot = -x2.rot;
    }
    if (flipV) {
      x2.y = 2 * gCenterY - (x2.y + x2.cy);
      x2.flipV = !x2.flipV || void 0;
      if (x2.rot) x2.rot = -x2.rot;
    }
    if (rotRaw) {
      const a = rotRaw / 6e4 * Math.PI / 180;
      const dx = x2.x + x2.cx / 2 - gCenterX;
      const dy = x2.y + x2.cy / 2 - gCenterY;
      const ncx = gCenterX + dx * Math.cos(a) - dy * Math.sin(a);
      const ncy = gCenterY + dx * Math.sin(a) + dy * Math.cos(a);
      x2.x = ncx - x2.cx / 2;
      x2.y = ncy - x2.cy / 2;
      x2.rot = (x2.rot ?? 0) + rotRaw || void 0;
    }
    if (sh.lineWidth !== void 0 && sx > 0 && sy > 0) {
      sh.lineWidth = Math.round(sh.lineWidth * Math.sqrt(sx * sy));
    }
  }
  return children2;
}
function readGraphicFrame(gf, pkg, rels, theme) {
  const nvPr = firstChild(gf, "p:nvGraphicFramePr");
  const cNvPr = nvPr ? firstChild(nvPr, "p:cNvPr") : void 0;
  const shape = {
    id: cNvPr?.attrs["id"] ?? "",
    name: cNvPr?.attrs["name"] ?? ""
  };
  const xfrm = firstChild(gf, "p:xfrm") ?? firstChild(gf, "a:xfrm");
  if (xfrm) shape.xfrm = parseXfrm(xfrm);
  const graphic = firstChild(gf, "a:graphic");
  const data = graphic ? firstChild(graphic, "a:graphicData") : void 0;
  if (!data) return shape;
  const chartEl = firstChild(data, "c:chart");
  if (chartEl) {
    const rid = chartEl.attrs["r:id"] ?? chartEl.attrs["id"];
    if (rid) {
      const target = rels.get(rid);
      if (target) {
        const xml = pkg.getPartText(target);
        if (xml) {
          shape.chartXml = xml;
          const pal = [];
          for (let i2 = 1; i2 <= 6; i2++) {
            const c = theme.colors[`accent${i2}`];
            if (c) pal.push(c);
          }
          if (pal.length) shape.chartPalette = pal;
        }
      }
    }
  }
  const relIds = firstChild(data, "dgm:relIds");
  if (relIds && shape.xfrm) {
    const dmId = relIds.attrs["r:dm"];
    const dataPath = dmId ? rels.get(dmId) : void 0;
    if (dataPath) {
      let drawingPath;
      const dataRels = readRels(pkg, relsPathFor(dataPath), dataPath);
      for (const t of dataRels.values()) if (t.includes("drawing")) {
        drawingPath = t;
        break;
      }
      if (!drawingPath) {
        const guess = dataPath.replace(/data(\d+)\.xml$/, "drawing$1.xml");
        if (pkg.getPartText(guess) !== void 0) drawingPath = guess;
      }
      if (drawingPath) {
        const shapes = readDiagramShapes(pkg, drawingPath, theme, shape.xfrm);
        if (shapes.length) return shapes;
      }
    }
  }
  const tblEl = firstChild(data, "a:tbl");
  if (tblEl) {
    const table = readTable(tblEl, theme);
    const pr = readTblPr(tblEl);
    if (pr.styleId) {
      const style = readTableStyle(pkg, pr.styleId, theme);
      if (style) applyTableStyle(table, style, pr.firstRow, pr.bandRow);
    }
    shape.table = table;
  }
  return shape;
}
function renamePrefix(el2, from, to) {
  return {
    name: el2.name.startsWith(from) ? to + el2.name.slice(from.length) : el2.name,
    attrs: el2.attrs,
    children: el2.children.map((c) => typeof c === "string" ? c : renamePrefix(c, from, to))
  };
}
function readDiagramShapes(pkg, drawingPath, theme, frame) {
  const xml = pkg.getPartText(drawingPath);
  if (!xml) return [];
  let root;
  try {
    root = parseXml(xml);
  } catch {
    return [];
  }
  const spTree = descend(root, "dsp:spTree");
  if (!spTree) return [];
  const out = [];
  for (const c of childElements(spTree, "dsp:sp")) {
    const sp = renamePrefix(c, "dsp:", "p:");
    const sh = readShape(sp, theme);
    if (sh.xfrm) out.push(sh);
  }
  if (!out.length) return out;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const sh of out) {
    const f = sh.xfrm;
    if (f.x < minX) minX = f.x;
    if (f.y < minY) minY = f.y;
    if (f.x + f.cx > maxX) maxX = f.x + f.cx;
    if (f.y + f.cy > maxY) maxY = f.y + f.cy;
  }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const s = Math.min(frame.cx / bw, frame.cy / bh);
  const ox = frame.x + (frame.cx - bw * s) / 2 - minX * s;
  const oy = frame.y + (frame.cy - bh * s) / 2 - minY * s;
  for (const sh of out) {
    const f = sh.xfrm;
    f.x = ox + f.x * s;
    f.y = oy + f.y * s;
    f.cx = f.cx * s;
    f.cy = f.cy * s;
  }
  return out;
}
function readTable(tbl, theme) {
  const gridEl = firstChild(tbl, "a:tblGrid");
  const colWidthsEmu = [];
  if (gridEl) {
    for (const gc of childElements(gridEl, "a:gridCol")) {
      colWidthsEmu.push(gc.attrs["w"] ? parseInt(gc.attrs["w"], 10) : 0);
    }
  }
  const rows = [];
  for (const tr of childElements(tbl, "a:tr")) {
    const heightEmu = tr.attrs["h"] ? parseInt(tr.attrs["h"], 10) : 0;
    const cells = [];
    for (const tc of childElements(tr, "a:tc")) {
      const cell = {};
      if (tc.attrs["gridSpan"]) cell.gridSpan = parseInt(tc.attrs["gridSpan"], 10);
      if (tc.attrs["rowSpan"]) cell.rowSpan = parseInt(tc.attrs["rowSpan"], 10);
      if (tc.attrs["hMerge"] === "1") cell.hMerge = true;
      if (tc.attrs["vMerge"] === "1") cell.vMerge = true;
      const txBody = firstChild(tc, "a:txBody");
      if (txBody) cell.txBody = readTxBody(txBody, theme);
      const tcPr = firstChild(tc, "a:tcPr");
      if (tcPr) {
        if (tcPr.attrs["anchor"]) cell.anchor = tcPr.attrs["anchor"];
        const fill = solidFillColor(tcPr, theme);
        if (fill) cell.fill = fill;
        const sfEl = firstChild(tcPr, "a:solidFill");
        const aEl = sfEl ? descend(sfEl, "a:alpha") : void 0;
        if (aEl?.attrs["val"]) cell.fillAlpha = parseInt(aEl.attrs["val"], 10) / 1e5;
        const sides = [["l", "a:lnL"], ["r", "a:lnR"], ["t", "a:lnT"], ["b", "a:lnB"]];
        for (const [key, name] of sides) {
          const ln2 = firstChild(tcPr, name);
          if (!ln2) continue;
          const fillEl = firstChild(ln2, "a:solidFill");
          const color = fillEl ? colorFromDml(childElements(fillEl)[0], theme) : void 0;
          if (!color) continue;
          const width = ln2.attrs["w"] ? parseInt(ln2.attrs["w"], 10) : 12700;
          cell.borders = cell.borders ?? {};
          const edge = { color, width };
          const dashEl = firstChild(ln2, "a:prstDash");
          if (dashEl?.attrs["val"] && dashEl.attrs["val"] !== "solid") edge.dash = dashEl.attrs["val"];
          cell.borders[key] = edge;
        }
      }
      cells.push(cell);
    }
    rows.push({ heightEmu, cells });
  }
  return { colWidthsEmu, rows };
}
function readShape(sp, theme, pkg, rels) {
  const nvSpPr = firstChild(sp, "p:nvSpPr") ?? firstChild(sp, "p:nvCxnSpPr");
  const cNvPr = nvSpPr ? firstChild(nvSpPr, "p:cNvPr") : void 0;
  const cNvSpPr = nvSpPr ? firstChild(nvSpPr, "p:cNvSpPr") : void 0;
  const nvPr = nvSpPr ? firstChild(nvSpPr, "p:nvPr") : void 0;
  const ph = nvPr ? firstChild(nvPr, "p:ph") : void 0;
  const spPr = firstChild(sp, "p:spPr");
  const shape = {
    id: cNvPr?.attrs["id"] ?? "",
    name: cNvPr?.attrs["name"] ?? ""
  };
  if (cNvSpPr?.attrs["txBox"] === "1") shape.isTextBox = true;
  if (ph) {
    if (ph.attrs["type"]) shape.phType = ph.attrs["type"];
    if (ph.attrs["idx"]) shape.phIdx = ph.attrs["idx"];
  }
  if (ph && shape.phType === void 0) shape.phType = "body";
  if (spPr) {
    const xfrm = firstChild(spPr, "a:xfrm");
    if (xfrm) shape.xfrm = parseXfrm(xfrm);
    const geom = firstChild(spPr, "a:prstGeom");
    if (geom?.attrs["prst"]) shape.geom = geom.attrs["prst"];
    const avLst = geom ? firstChild(geom, "a:avLst") : void 0;
    if (avLst) {
      const adj = [];
      for (const gd of childElements(avLst, "a:gd")) {
        const m = /val (-?\d+)/.exec(gd.attrs["fmla"] ?? "");
        if (m) adj.push(parseInt(m[1], 10));
      }
      if (adj.length) shape.adj = adj;
    }
    const cust = firstChild(spPr, "a:custGeom");
    if (cust) {
      const cg = parseCustGeom(cust);
      if (cg) shape.custGeom = cg;
    }
    if (firstChild(spPr, "a:noFill")) shape.fill = { type: "none" };
    else {
      const c = solidFillColor(spPr, theme);
      if (c) shape.fill = { type: "solid", color: c };
    }
    if (!shape.fill) {
      const grad = firstChild(spPr, "a:gradFill");
      if (grad) {
        const g = parseGradFill(grad, theme);
        if (g) shape.fill = g;
      }
    }
    if (pkg && rels) {
      const bf = firstChild(spPr, "a:blipFill");
      const blip = bf ? firstChild(bf, "a:blip") : void 0;
      if (blip) {
        const img = resolveBlip(blip, pkg, rels);
        if (img) {
          shape.fillImage = img;
          if (bf && firstChild(bf, "a:tile")) shape.fillTile = true;
        }
      }
    }
    const sf = firstChild(spPr, "a:solidFill");
    if (sf) {
      const alphaEl = descend(sf, "a:alpha");
      if (alphaEl?.attrs["val"]) shape.fillAlpha = parseInt(alphaEl.attrs["val"], 10) / 1e5;
    }
    const ln2 = firstChild(spPr, "a:ln");
    if (ln2) {
      if (firstChild(ln2, "a:noFill")) shape.lineNone = true;
      const lc2 = solidFillColor(ln2, theme);
      if (lc2) shape.lineColor = lc2;
      if (ln2.attrs["w"]) shape.lineWidth = parseInt(ln2.attrs["w"], 10);
      const dash = firstChild(ln2, "a:prstDash");
      if (dash?.attrs["val"]) shape.lineDash = dash.attrs["val"];
      const head = firstChild(ln2, "a:headEnd");
      if (head?.attrs["type"] && head.attrs["type"] !== "none") shape.headArrow = head.attrs["type"];
      const tail = firstChild(ln2, "a:tailEnd");
      if (tail?.attrs["type"] && tail.attrs["type"] !== "none") shape.tailArrow = tail.attrs["type"];
    }
    const eff = firstChild(spPr, "a:effectLst");
    const shd = eff ? firstChild(eff, "a:outerShdw") : void 0;
    if (shd) {
      const blurRad = shd.attrs["blurRad"] ? parseInt(shd.attrs["blurRad"], 10) : 0;
      const dist = shd.attrs["dist"] ? parseInt(shd.attrs["dist"], 10) : 0;
      const dirDeg = (shd.attrs["dir"] ? parseInt(shd.attrs["dir"], 10) : 54e5) / 6e4;
      const srgb2 = firstChild(shd, "a:srgbClr");
      const scheme = firstChild(shd, "a:schemeClr");
      let color = "#000000", alpha = 1;
      const colorEl = srgb2 ?? scheme;
      if (colorEl) {
        if (srgb2?.attrs["val"]) color = "#" + srgb2.attrs["val"];
        const aEl = firstChild(colorEl, "a:alpha");
        if (aEl?.attrs["val"]) alpha = parseInt(aEl.attrs["val"], 10) / 1e5;
      }
      shape.shadow = { color, blurRad, dist, dirDeg, alpha };
    }
  }
  const styleEl = firstChild(sp, "p:style");
  if (styleEl) {
    const refColor = (name) => {
      const ref = firstChild(styleEl, name);
      if (!ref || ref.attrs["idx"] === "0") return void 0;
      return colorFromDml(childElements(ref)[0], theme);
    };
    if (!shape.fill && !shape.fillImage) {
      const fc = refColor("a:fillRef");
      if (fc) shape.fill = { type: "solid", color: fc };
    }
    if (shape.lineColor === void 0 && !shape.lineNone) {
      const lc2 = refColor("a:lnRef");
      if (lc2) {
        shape.lineColor = lc2;
        if (shape.lineWidth === void 0) {
          const lnRef = firstChild(styleEl, "a:lnRef");
          const idx = lnRef?.attrs["idx"] !== void 0 ? parseInt(lnRef.attrs["idx"], 10) : 0;
          const w = idx >= 1 ? theme.lineWidths?.[idx - 1] : void 0;
          if (w !== void 0) shape.lineWidth = w;
        }
      }
    }
    const fontRef = firstChild(styleEl, "a:fontRef");
    if (fontRef) {
      const fc = colorFromDml(childElements(fontRef)[0], theme);
      if (fc) shape.styleFontColor = fc;
      if (fontRef.attrs["idx"]) shape.styleFontIdx = fontRef.attrs["idx"];
    }
  }
  const txBody = firstChild(sp, "p:txBody");
  if (txBody) shape.txBody = readTxBody(txBody, theme, rels);
  return shape;
}
function parseCustGeom(cust) {
  const pathLst = firstChild(cust, "a:pathLst");
  if (!pathLst) return void 0;
  const subs = [];
  let pw = 0, ph = 0;
  const pt = (el2) => ({
    x: el2?.attrs["x"] !== void 0 ? parseInt(el2.attrs["x"], 10) : 0,
    y: el2?.attrs["y"] !== void 0 ? parseInt(el2.attrs["y"], 10) : 0
  });
  for (const path of childElements(pathLst, "a:path")) {
    if (path.attrs["w"]) pw = Math.max(pw, parseInt(path.attrs["w"], 10));
    if (path.attrs["h"]) ph = Math.max(ph, parseInt(path.attrs["h"], 10));
    const segs = [];
    for (const el2 of childElements(path)) {
      const pts = childElements(el2, "a:pt");
      if (el2.name === "a:moveTo") {
        const p = pt(pts[0]);
        segs.push({ c: "M", x: p.x, y: p.y });
      } else if (el2.name === "a:lnTo") {
        const p = pt(pts[0]);
        segs.push({ c: "L", x: p.x, y: p.y });
      } else if (el2.name === "a:cubicBezTo") {
        const p1 = pt(pts[0]), p2 = pt(pts[1]), p3 = pt(pts[2]);
        segs.push({ c: "C", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p3.x, y: p3.y });
      } else if (el2.name === "a:quadBezTo") {
        const p1 = pt(pts[0]), p2 = pt(pts[1]);
        segs.push({ c: "Q", x1: p1.x, y1: p1.y, x: p2.x, y: p2.y });
      } else if (el2.name === "a:close") segs.push({ c: "Z" });
    }
    if (segs.length) subs.push(segs);
  }
  if (!subs.length) return void 0;
  return { w: pw || 1, h: ph || 1, subs };
}
function parseGradFill(grad, theme) {
  const gsLst = firstChild(grad, "a:gsLst");
  if (!gsLst) return void 0;
  const stops = [];
  for (const gs of childElements(gsLst, "a:gs")) {
    const pos = gs.attrs["pos"] !== void 0 ? parseInt(gs.attrs["pos"], 10) / 1e5 : 0;
    const colorEl = childElements(gs)[0];
    const color = colorFromDml(colorEl, theme);
    if (!color) continue;
    const stop = { pos: Math.max(0, Math.min(1, pos)), color };
    const alphaEl = colorEl ? firstChild(colorEl, "a:alpha") : void 0;
    if (alphaEl?.attrs["val"]) stop.alpha = parseInt(alphaEl.attrs["val"], 10) / 1e5;
    stops.push(stop);
  }
  if (stops.length < 2) return void 0;
  stops.sort((a, b) => a.pos - b.pos);
  const lin2 = firstChild(grad, "a:lin");
  const angleDeg = lin2?.attrs["ang"] !== void 0 ? parseInt(lin2.attrs["ang"], 10) / 6e4 : 0;
  const out = { type: "gradient", stops, angleDeg };
  if (lin2?.attrs["scaled"] === "1") out.scaled = true;
  const pathEl = firstChild(grad, "a:path");
  if (pathEl) out.path = pathEl.attrs["path"] ?? "shape";
  return out;
}
function parseXfrm(el2) {
  const off = firstChild(el2, "a:off");
  const ext = firstChild(el2, "a:ext");
  const x2 = {
    x: off?.attrs["x"] !== void 0 ? parseInt(off.attrs["x"], 10) : 0,
    y: off?.attrs["y"] !== void 0 ? parseInt(off.attrs["y"], 10) : 0,
    cx: ext?.attrs["cx"] !== void 0 ? parseInt(ext.attrs["cx"], 10) : 0,
    cy: ext?.attrs["cy"] !== void 0 ? parseInt(ext.attrs["cy"], 10) : 0
  };
  if (el2.attrs["rot"]) x2.rot = parseInt(el2.attrs["rot"], 10);
  if (el2.attrs["flipH"] === "1") x2.flipH = true;
  if (el2.attrs["flipV"] === "1") x2.flipV = true;
  return x2;
}
function readTxBody(el2, theme, rels) {
  const bodyPr = firstChild(el2, "a:bodyPr");
  const tb = { paragraphs: [] };
  if (bodyPr) {
    if (bodyPr.attrs["anchor"]) tb.anchor = bodyPr.attrs["anchor"];
    if (bodyPr.attrs["wrap"]) tb.wrap = bodyPr.attrs["wrap"];
    if (bodyPr.attrs["lIns"] !== void 0) tb.insL = parseInt(bodyPr.attrs["lIns"], 10);
    if (bodyPr.attrs["tIns"] !== void 0) tb.insT = parseInt(bodyPr.attrs["tIns"], 10);
    if (bodyPr.attrs["rIns"] !== void 0) tb.insR = parseInt(bodyPr.attrs["rIns"], 10);
    if (bodyPr.attrs["bIns"] !== void 0) tb.insB = parseInt(bodyPr.attrs["bIns"], 10);
    if (bodyPr.attrs["numCol"] !== void 0) tb.numCol = parseInt(bodyPr.attrs["numCol"], 10);
    if (bodyPr.attrs["spcCol"] !== void 0) tb.spcCol = parseInt(bodyPr.attrs["spcCol"], 10);
    const na = firstChild(bodyPr, "a:normAutofit");
    if (na) {
      if (na.attrs["fontScale"] !== void 0) tb.fontScale = parseInt(na.attrs["fontScale"], 10) / 1e5;
      if (na.attrs["lnSpcReduction"] !== void 0) tb.lnSpcReduction = parseInt(na.attrs["lnSpcReduction"], 10) / 1e5;
    }
  }
  const lst = firstChild(el2, "a:lstStyle");
  if (lst && childElements(lst).length > 0) tb.lstStyle = parseTxStyleLevels(lst, theme);
  for (const p of childElements(el2, "a:p")) tb.paragraphs.push(readParagraph(p, theme, rels));
  return tb;
}
function readParagraph(p, theme, rels) {
  const para = { runs: [] };
  const pPr = firstChild(p, "a:pPr");
  if (pPr) {
    if (pPr.attrs["algn"]) para.align = pPr.attrs["algn"];
    if (pPr.attrs["lvl"]) para.level = parseInt(pPr.attrs["lvl"], 10);
    if (pPr.attrs["marL"] !== void 0) para.marL = parseInt(pPr.attrs["marL"], 10);
    if (pPr.attrs["indent"] !== void 0) para.indent = parseInt(pPr.attrs["indent"], 10);
    const lnSpc = firstChild(pPr, "a:lnSpc");
    if (lnSpc) {
      const pct2 = firstChild(lnSpc, "a:spcPct");
      const pts = firstChild(lnSpc, "a:spcPts");
      if (pct2?.attrs["val"]) para.lineSpacing = parseInt(pct2.attrs["val"], 10) / 1e5;
      else if (pts?.attrs["val"]) para.lineSpacingPt = parseInt(pts.attrs["val"], 10) / 100;
    }
    const spcBef = firstChild(pPr, "a:spcBef");
    const befPts = spcBef ? firstChild(spcBef, "a:spcPts") : void 0;
    if (befPts?.attrs["val"]) para.spaceBeforePt = parseInt(befPts.attrs["val"], 10) / 100;
    const spcAft = firstChild(pPr, "a:spcAft");
    const aftPts = spcAft ? firstChild(spcAft, "a:spcPts") : void 0;
    if (aftPts?.attrs["val"]) para.spaceAfterPt = parseInt(aftPts.attrs["val"], 10) / 100;
    const buChar = firstChild(pPr, "a:buChar");
    const buAuto = firstChild(pPr, "a:buAutoNum");
    if (buChar) {
      para.bullet = true;
      if (buChar.attrs["char"]) para.bulletChar = buChar.attrs["char"];
    } else if (buAuto) {
      para.bullet = true;
      para.bulletAutoNum = buAuto.attrs["type"] ?? "arabicPeriod";
    } else if (firstChild(pPr, "a:buNone")) {
      para.bullet = false;
    }
  }
  for (const child2 of childElements(p)) {
    if (child2.name === "a:r") para.runs.push(readRun(child2, theme, rels));
    else if (child2.name === "a:br") para.runs.push({ text: "\n" });
    else if (child2.name === "a:fld") {
      const t = firstChild(child2, "a:t");
      para.runs.push({ text: t ? textContent(t) : "" });
    }
  }
  return para;
}
function readRun(r, theme, rels) {
  const t = firstChild(r, "a:t");
  const run = { text: t ? textContent(t) : "" };
  const rPr = firstChild(r, "a:rPr");
  if (rPr) {
    if (rPr.attrs["sz"]) run.sz = parseInt(rPr.attrs["sz"], 10) / 100;
    if (rPr.attrs["b"] !== void 0) run.bold = rPr.attrs["b"] === "1";
    if (rPr.attrs["i"] !== void 0) run.italic = rPr.attrs["i"] === "1";
    if (rPr.attrs["u"] && rPr.attrs["u"] !== "none") run.underline = true;
    const c = solidFillColor(rPr, theme);
    if (c) run.color = c;
    const latin = firstChild(rPr, "a:latin");
    if (latin?.attrs["typeface"]) run.font = latin.attrs["typeface"];
    const hlink = firstChild(rPr, "a:hlinkClick");
    if (hlink && rels) {
      const rid = hlink.attrs["r:id"] ?? hlink.attrs["id"];
      if (rid) {
        const direct = rels.get(rid);
        if (direct && /^https?:/i.test(direct)) run.hyperlink = direct;
      }
    }
  }
  if (rPr) {
    const eff = firstChild(rPr, "a:effectLst");
    const shd = eff ? firstChild(eff, "a:outerShdw") : void 0;
    if (shd) {
      const blurRad = shd.attrs["blurRad"] ? parseInt(shd.attrs["blurRad"], 10) : 0;
      const dist = shd.attrs["dist"] ? parseInt(shd.attrs["dist"], 10) : 0;
      const dirDeg = (shd.attrs["dir"] ? parseInt(shd.attrs["dir"], 10) : 54e5) / 6e4;
      const colorEl = childElements(shd)[0];
      let color = "#000000", alpha = 0.6;
      if (colorEl) {
        const c = colorFromDml(colorEl, theme);
        if (c) color = c;
        const aEl = firstChild(colorEl, "a:alpha");
        if (aEl?.attrs["val"]) alpha = parseInt(aEl.attrs["val"], 10) / 1e5;
      }
      run.shadow = { color, blurRad, dist, dirDeg, alpha };
    }
  }
  return run;
}
function readPic(pic, theme, pkg, rels) {
  const nvPicPr = firstChild(pic, "p:nvPicPr");
  const cNvPr = nvPicPr ? firstChild(nvPicPr, "p:cNvPr") : void 0;
  const blipFill = firstChild(pic, "p:blipFill");
  const blip = blipFill ? firstChild(blipFill, "a:blip") : void 0;
  const srcRect = blipFill ? firstChild(blipFill, "a:srcRect") : void 0;
  const spPr = firstChild(pic, "p:spPr");
  const shape = {
    id: cNvPr?.attrs["id"] ?? "",
    name: cNvPr?.attrs["name"] ?? ""
  };
  const media = nvPicPr ? readPicMedia(nvPicPr, pkg, rels) : void 0;
  if (media) shape.media = media;
  if (blip) {
    const img = resolveBlip(blip, pkg, rels);
    if (img) shape.image = img;
    const am = firstChild(blip, "a:alphaModFix");
    if (am?.attrs["amt"]) shape.alpha = Math.max(0, Math.min(1, parseInt(am.attrs["amt"], 10) / 1e5));
  }
  if (srcRect) {
    const num2 = (a) => (a ? parseInt(a, 10) : 0) / 1e5;
    shape.srcRect = {
      l: num2(srcRect.attrs["l"]),
      t: num2(srcRect.attrs["t"]),
      r: num2(srcRect.attrs["r"]),
      b: num2(srcRect.attrs["b"])
    };
  }
  if (spPr) {
    const xfrm = firstChild(spPr, "a:xfrm");
    if (xfrm) shape.xfrm = parseXfrm(xfrm);
    const geom = firstChild(spPr, "a:prstGeom");
    if (geom?.attrs["prst"]) shape.geom = geom.attrs["prst"];
    const ln2 = firstChild(spPr, "a:ln");
    if (ln2) {
      const lc2 = solidFillColor(ln2, theme);
      if (lc2) shape.lineColor = lc2;
      if (ln2.attrs["w"]) shape.lineWidth = parseInt(ln2.attrs["w"], 10);
    }
  }
  return shape;
}
function readPicMedia(nvPicPr, pkg, rels) {
  const nvPr = firstChild(nvPicPr, "p:nvPr");
  if (!nvPr) return void 0;
  let kind;
  let link;
  for (const c of childElements(nvPr)) {
    if (c.name === "a:videoFile" || c.name === "a:quickTimeFile") {
      kind = "video";
      link = c.attrs["r:link"];
    } else if (c.name === "a:audioFile" || c.name === "a:wavAudioFile") {
      kind = "audio";
      link = c.attrs["r:link"] ?? c.attrs["r:embed"];
    }
  }
  if (!kind) return void 0;
  const ext = firstChild(nvPr, "p:extLst");
  let embed;
  if (ext) for (const e of childElements(ext, "p:ext")) {
    const m = childElements(e).find((x2) => x2.name.endsWith(":media"));
    if (m?.attrs["r:embed"]) embed = m.attrs["r:embed"];
  }
  const media = { kind, mime: "application/octet-stream" };
  for (const rid of [embed, link]) {
    const target = rid ? rels.get(rid) : void 0;
    if (!target) continue;
    if (pkg.getPart(target)) {
      media.part = target;
      break;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !media.url) media.url = target;
  }
  if (!media.part && !media.url) return void 0;
  media.mime = mediaMime(media.part ?? media.url, kind);
  return media;
}
function mediaMime(path, kind) {
  const ext = (/\.([a-z0-9]+)(?:[?#].*)?$/i.exec(path)?.[1] ?? "").toLowerCase();
  switch (ext) {
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return kind === "audio" ? "audio/webm" : "video/webm";
    case "ogv":
      return "video/ogg";
    case "wmv":
      return "video/x-ms-wmv";
    case "avi":
      return "video/x-msvideo";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "wav":
      return "audio/wav";
    case "wma":
      return "audio/x-ms-wma";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "mid":
    case "midi":
      return "audio/midi";
    default:
      return kind === "audio" ? "audio/*" : "video/*";
  }
}
function resolveBlip(blip, pkg, rels) {
  const rid = blip.attrs["r:embed"] ?? blip.attrs["embed"];
  if (!rid) return void 0;
  const part = rels.get(rid);
  if (!part) return void 0;
  const bytes = pkg.getPart(part);
  if (!bytes) return void 0;
  return { part, bytes, mime: mimeFromPart(part) };
}
function mimeFromPart(part) {
  const dot = part.lastIndexOf(".");
  const ext = (dot >= 0 ? part.slice(dot + 1) : "").toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

// ../slides-core/src/playback.ts
function instantTransition(tr) {
  if (!tr || tr.type === "none") return true;
  if (tr.type === "cut") return !(tr.attrs["thruBlk"] === "1" || tr.attrs["thruBlk"] === "true");
  return false;
}
function buildPlaybackTimeline(models, opts = {}) {
  const useTimings = opts.useTimings ?? true;
  const defaultMs = opts.defaultSlideMs ?? 5e3;
  const tick = Math.max(0, opts.tickMs ?? 0);
  const slides = [];
  let cursor = 0;
  models.forEach((m, index) => {
    const model = m ?? { steps: [], interactive: [], hidden: false };
    if (model.hidden) return;
    const tr = model.transition;
    let transitionMs = instantTransition(tr) ? 0 : Math.max(0, tr.durMs);
    if (transitionMs > 0 && opts.transitionFps && tick > 0) transitionMs = Math.round(transitionMs * opts.transitionFps / 1e3) * tick;
    if (slides.length === 0 && tick > 0 && tr?.type === "cut" && transitionMs === 0) transitionMs = tick;
    const startMs = cursor;
    const hasPhase = slides.length > 0 || tr !== void 0 && tr.type !== "none";
    const animStartMs = startMs + transitionMs + (hasPhase ? 2 * tick : 0);
    const recorded = useTimings && tr?.advTmMs !== void 0;
    let D = recorded ? tr.advTmMs : defaultMs;
    if (!recorded && opts.transitionFps && tick > 0) D = Math.round(D * opts.transitionFps / 1e3) * tick;
    const steps = model.steps;
    const total = steps.reduce((s, st) => s + st.durMs, 0);
    const clicks = steps.filter((s) => !s.auto).length;
    const wait = Math.max(0, D - total) / (clicks + 1);
    const stepStartMs = [];
    let t = animStartMs;
    for (const st of steps) {
      if (!st.auto) t += wait;
      stepStartMs.push(t);
      t += st.durMs;
    }
    t += wait;
    if (tick > 0) t = Math.ceil(t / tick - 1e-9) * tick;
    if (steps.length && total >= D) t += tick;
    const effects = [];
    steps.forEach((st, si) => {
      for (const e of st.effects) effects.push({ ...e, t0: stepStartMs[si] - animStartMs + e.startMs, step: si });
    });
    slides.push({
      index,
      startMs,
      transition: tr ?? null,
      transitionMs,
      animStartMs,
      stepStartMs,
      endMs: t,
      effects
    });
    cursor = t;
  });
  const mediaClock = opts.transitionFps && tick > 0 ? 1e3 / opts.transitionFps / tick : 1;
  return { slides, durationMs: cursor, tickMs: tick, mediaClock };
}
function playbackStateAt(tl, t) {
  const n = tl.slides.length;
  if (n === 0) return { pos: -1, transitionProgress: 1, animMs: 0, ended: true };
  const ended = t >= tl.durationMs;
  const tt = Math.max(0, Math.min(t, tl.durationMs));
  let pos = n - 1;
  for (let i2 = 0; i2 < n; i2++) {
    if (tt < tl.slides[i2].endMs) {
      pos = i2;
      break;
    }
  }
  const slide = tl.slides[pos];
  const local = tt - slide.startMs;
  const st = {
    pos,
    slide,
    transitionProgress: slide.transitionMs > 0 ? Math.max(0, Math.min(1, local / slide.transitionMs)) : 1,
    animMs: ended ? Infinity : tt - slide.animStartMs,
    ended
  };
  if (st.transitionProgress < 1 && pos > 0) st.from = tl.slides[pos - 1];
  return st;
}

// ../slides-core/src/anim-formula.ts
var cache2 = /* @__PURE__ */ new Map();
function tokenize(s) {
  const out = [];
  let i2 = 0;
  while (i2 < s.length) {
    const c = s[i2];
    if (/\s/.test(c)) {
      i2++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i2 + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      if (j < s.length && /[eE]/.test(s[j]) && /[-+0-9]/.test(s[j + 1] ?? "")) {
        j += 2;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
      }
      out.push(s.slice(i2, j));
      i2 = j;
      continue;
    }
    if (c === "#" || c === "$" || /[A-Za-z_]/.test(c)) {
      let j = i2 + 1;
      while (j < s.length && /[A-Za-z0-9_.]/.test(s[j])) j++;
      out.push(s.slice(i2, j));
      i2 = j;
      continue;
    }
    out.push(c);
    i2++;
  }
  return out;
}
function parse(src) {
  const t = tokenize(src);
  let p = 0;
  const peek = () => t[p];
  const next = () => t[p++];
  function expr() {
    let a = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      a = { k: "b", op, a, b: term() };
    }
    return a;
  }
  function term() {
    let a = power();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      a = { k: "b", op, a, b: power() };
    }
    return a;
  }
  function power() {
    let a = unary();
    while (peek() === "^") {
      next();
      a = { k: "b", op: "^", a, b: unary() };
    }
    return a;
  }
  function unary() {
    if (peek() === "-") {
      next();
      return { k: "u", op: "-", a: unary() };
    }
    if (peek() === "+") {
      next();
      return unary();
    }
    return atom();
  }
  function atom() {
    const tok = next();
    if (tok === void 0) throw new Error("fim inesperado");
    if (tok === "(") {
      const e = expr();
      if (next() !== ")") throw new Error(") esperado");
      return e;
    }
    if (/^[0-9.]/.test(tok)) return { k: "n", v: parseFloat(tok) };
    if (peek() === "(") {
      next();
      const args = [];
      if (peek() !== ")") {
        args.push(expr());
        while (peek() === ",") {
          next();
          args.push(expr());
        }
      }
      if (next() !== ")") throw new Error(") esperado");
      return { k: "f", name: tok.toLowerCase(), args };
    }
    return { k: "v", name: tok };
  }
  try {
    const n = expr();
    return p === t.length ? n : null;
  } catch {
    return null;
  }
}
function ev(n, vars2) {
  switch (n.k) {
    case "n":
      return n.v;
    case "v": {
      const key = n.name.toLowerCase();
      if (key === "pi") return Math.PI;
      if (key === "e") return Math.E;
      return vars2[n.name] ?? vars2[key] ?? 0;
    }
    case "u":
      return -ev(n.a, vars2);
    case "b": {
      const a = ev(n.a, vars2), b = ev(n.b, vars2);
      switch (n.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return b === 0 ? 0 : a / b;
        case "^":
          return Math.pow(a, b);
      }
      return 0;
    }
    case "f": {
      const x2 = n.args.map((a) => ev(a, vars2));
      const a0 = x2[0] ?? 0;
      switch (n.name) {
        case "sin":
          return Math.sin(a0);
        case "cos":
          return Math.cos(a0);
        case "tan":
          return Math.tan(a0);
        case "asin":
          return Math.asin(a0);
        case "acos":
          return Math.acos(a0);
        case "atan":
          return Math.atan(a0);
        case "sqrt":
          return Math.sqrt(Math.max(0, a0));
        case "abs":
          return Math.abs(a0);
        case "ln":
          return a0 > 0 ? Math.log(a0) : 0;
        case "exp":
          return Math.exp(a0);
        case "max":
          return Math.max(...x2);
        case "min":
          return Math.min(...x2);
        case "floor":
          return Math.floor(a0);
        case "ceil":
          return Math.ceil(a0);
        // rand(x): o app usa aleatório; determinístico aqui (meio do intervalo)
        case "rand":
          return a0 / 2;
      }
      return 0;
    }
  }
}
function evalFormula(src, vars2) {
  const s = src.trim();
  if (/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return parseFloat(s);
  let n = cache2.get(s);
  if (n === void 0) {
    n = parse(s);
    cache2.set(s, n);
  }
  if (!n) return NaN;
  const v = ev(n, vars2);
  return Number.isFinite(v) ? v : NaN;
}

// ../slides-core/src/anim-engine.ts
function accelDecel(f, a, d) {
  if (!a && !d) return f;
  if (a + d > 1) {
    const k = 1 / (a + d);
    a *= k;
    d *= k;
  }
  const r = 1 / (1 - a / 2 - d / 2);
  if (f < a) return r * f * f / (2 * a);
  if (f <= 1 - d) return r * (f - a / 2);
  const td2 = 1 - f;
  return 1 - r * td2 * td2 / (2 * d);
}
function tmFilterMap(f, pts) {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i2 = 0; i2 < pts.length - 1; i2++) {
    const [x0, y0] = pts[i2], [x1, y1] = pts[i2 + 1];
    if (f <= x1) return x1 > x0 ? y0 + (y1 - y0) * (f - x0) / (x1 - x0) : y1;
  }
  return pts[pts.length - 1][1];
}
function simpleDurOf(n) {
  if (n.dur !== void 0) return n.dur;
  if (n.tag === "seq") {
    let t = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break;
      t += b + activeDurOf(c);
    }
    return t;
  }
  let m = 0;
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null) continue;
    m = Math.max(m, b + activeDurOf(c));
  }
  return m;
}
function activeDurOf(n) {
  let d = simpleDurOf(n) * (n.autoRev ? 2 : 1);
  if (n.repeat !== void 0) d = n.repeat === Infinity ? Infinity : d * n.repeat;
  return d / (n.spd ?? 1);
}
function progressOf(n, local, simple) {
  if (!Number.isFinite(simple)) return 0;
  const t = local * (n.spd ?? 1);
  const period = simple * (n.autoRev ? 2 : 1);
  const reps = n.repeat ?? 1;
  const active = reps === Infinity ? Infinity : period * reps;
  let it;
  if (t >= active) {
    if (n.fill !== "hold" && n.fill !== "freeze") return null;
    const frac2 = reps - Math.floor(reps);
    it = frac2 > 1e-9 ? frac2 * period : period;
  } else {
    it = period > 0 ? t % period : 0;
  }
  const s = n.autoRev && it > simple ? 2 * simple - it : Math.min(it, simple);
  let f = simple > 0 ? s / simple : 1;
  f = accelDecel(f, n.accel ?? 0, n.decel ?? 0);
  if (n.tmFilter) f = tmFilterMap(f, n.tmFilter);
  return f;
}
function hexRgb(h) {
  const n = parseInt(h.replace("#", ""), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgbHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function rgbHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}
function hslHex(h, s, l) {
  h = (h % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x2 = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x2, 0] : h < 120 ? [x2, c, 0] : h < 180 ? [0, c, x2] : h < 240 ? [0, x2, c] : h < 300 ? [x2, 0, c] : [c, 0, x2];
  return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
function mixColor(a, b, f, n) {
  if (n.clrSpc === "hsl") {
    const [h1, s1, l1] = rgbHsl(hexRgb(a)), [h2, s2, l2] = rgbHsl(hexRgb(b));
    let dh = h2 - h1;
    if (n.clrDir === "ccw") {
      if (dh > 0) dh -= 360;
    } else if (dh < 0) dh += 360;
    return hslHex(h1 + dh * f, s1 + (s2 - s1) * f, l1 + (l2 - l1) * f);
  }
  const [r1, g1, b1] = hexRgb(a), [r2, g2, b22] = hexRgb(b);
  return rgbHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b22 - b1) * f);
}
var pathCache = /* @__PURE__ */ new Map();
function motionPath(src) {
  let mp = pathCache.get(src);
  if (mp) return mp;
  const tok = src.match(/[MLCZEmlcze]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const pts = [];
  let i2 = 0, cmd = "M", rel = false;
  let cur = [0, 0], start = [0, 0];
  const n = () => parseFloat(tok[i2++] ?? "0");
  const pt = (o) => {
    const x2 = n(), y = n();
    return rel ? [o[0] + x2, o[1] + y] : [x2, y];
  };
  while (i2 < tok.length) {
    if (/[A-Za-z]/.test(tok[i2])) {
      const c = tok[i2++];
      cmd = c.toUpperCase();
      rel = c !== cmd;
    }
    if (cmd === "Z") {
      pts.push([...start]);
      cur = [...start];
      continue;
    }
    if (cmd === "E") break;
    if (cmd === "M") {
      cur = pt(cur);
      start = [...cur];
      pts.push([...cur]);
      cmd = "L";
      continue;
    }
    if (cmd === "L") {
      cur = pt(cur);
      pts.push([...cur]);
      continue;
    }
    if (cmd === "C") {
      const p0 = cur;
      const p1 = pt(p0), p2 = pt(p0), p3 = pt(p0);
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        pts.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        ]);
      }
      cur = p3;
      continue;
    }
    i2++;
  }
  if (!pts.length) pts.push([0, 0]);
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  mp = { pts, cum, total: cum[cum.length - 1] };
  pathCache.set(src, mp);
  return mp;
}
function pointOnPath(mp, f) {
  if (mp.total <= 0 || mp.pts.length < 2) return mp.pts[0];
  const d = Math.max(0, Math.min(1, f)) * mp.total;
  let k = 1;
  while (k < mp.cum.length - 1 && mp.cum[k] < d) k++;
  const d0 = mp.cum[k - 1], d1 = mp.cum[k];
  const t = d1 > d0 ? (d - d0) / (d1 - d0) : 0;
  const a = mp.pts[k - 1], b = mp.pts[k];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
function vars(base) {
  const r = base.rot ?? 0;
  return {
    "#ppt_x": base.x,
    "#ppt_y": base.y,
    "#ppt_w": base.w,
    "#ppt_h": base.h,
    "#ppt_r": r,
    ppt_x: base.x,
    ppt_y: base.y,
    ppt_w: base.w,
    ppt_h: base.h,
    ppt_r: r
  };
}
var NUMERIC_ATTRS = /* @__PURE__ */ new Set(["ppt_x", "ppt_y", "ppt_w", "ppt_h", "style.rotation", "r", "style.opacity", "style.fontSize"]);
function numVal(v, vr) {
  if (v === void 0) return NaN;
  return typeof v === "number" ? v : evalFormula(v, vr);
}
function currentOf(attr, st) {
  switch (attr) {
    case "ppt_x":
      return st.x;
    case "ppt_y":
      return st.y;
    case "ppt_w":
      return st.w;
    case "ppt_h":
      return st.h;
    case "style.rotation":
    case "r":
      return st.rot;
    case "style.opacity":
      return st.opacity;
    case "style.fontSize":
      return st.fontScale ?? 1;
    case "style.visibility":
      return st.visible ? "visible" : "hidden";
  }
  return void 0;
}
function assign(attr, v, st) {
  const n = typeof v === "number" ? v : parseFloat(v);
  switch (attr) {
    case "ppt_x":
      if (Number.isFinite(n)) st.x = n;
      break;
    case "ppt_y":
      if (Number.isFinite(n)) st.y = n;
      break;
    case "ppt_w":
      if (Number.isFinite(n)) st.w = n;
      break;
    case "ppt_h":
      if (Number.isFinite(n)) st.h = n;
      break;
    case "style.rotation":
    case "r":
      if (Number.isFinite(n)) st.rot = n;
      break;
    case "style.opacity":
      if (Number.isFinite(n)) st.opacity = Math.max(0, Math.min(1, n));
      break;
    case "style.visibility":
      st.visible = String(v) !== "hidden";
      break;
    case "style.fontSize":
      if (Number.isFinite(n)) st.fontScale = n;
      break;
    case "style.fontWeight":
      st.fontWeight = String(v);
      break;
    case "style.fontStyle":
      st.fontStyle = String(v);
      break;
    case "style.textDecorationUnderline":
      st.underline = String(v) === "true";
      break;
    case "style.fontFamily":
      st.fontFamily = String(v);
      break;
    case "fillcolor":
    case "fillColor":
    case "fill.color":
      st.fillColor = String(v);
      break;
    case "stroke.color":
    case "strokecolor":
      st.lineColor = String(v);
      break;
    case "style.color":
      st.textColor = String(v);
      break;
    default:
      break;
  }
}
function colorOf(attr, st, base) {
  switch (attr) {
    case "fillcolor":
    case "fillColor":
    case "fill.color":
      return st.fillColor ?? base.fill;
    case "stroke.color":
    case "strokecolor":
      return st.lineColor ?? base.line;
    case "style.color":
      return st.textColor ?? base.text;
  }
  return void 0;
}
function applyBehavior(n, p, st, base) {
  const attrs2 = n.attrNames ?? [];
  const vr = vars(base);
  switch (n.tag) {
    case "set": {
      for (const a of attrs2) {
        if (n.toColor) assign(a, n.toColor, st);
        else if (n.setTo !== void 0) {
          const v = NUMERIC_ATTRS.has(a) ? numVal(n.setTo, vr) : NaN;
          assign(a, Number.isFinite(v) ? v : n.setTo, st);
        }
      }
      return;
    }
    case "anim": {
      for (const a of attrs2) {
        let v;
        if (n.tav && n.tav.length) {
          const tav = n.tav;
          let i2 = Math.max(0, tav.length - 2);
          for (let k = 0; k < tav.length - 1; k++) {
            if (p < tav[k + 1].tm) {
              i2 = k;
              break;
            }
          }
          const ka = tav[i2], kb = tav[Math.min(i2 + 1, tav.length - 1)];
          if (ka.color || kb.color) {
            const ca = ka.color ?? colorOf(a, st, base) ?? "#000000";
            const cb = kb.color ?? ca;
            const f = kb.tm > ka.tm ? (p - ka.tm) / (kb.tm - ka.tm) : 0;
            v = n.calcmode === "discrete" ? ca : mixColor(ca, cb, Math.max(0, Math.min(1, f)), n);
          } else {
            const na = numVal(ka.val, vr), nb = numVal(kb.val, vr);
            if (!Number.isFinite(na)) {
              v = ka.val;
            } else {
              const f = kb.tm > ka.tm ? Math.max(0, Math.min(1, (p - ka.tm) / (kb.tm - ka.tm))) : 0;
              let x2 = n.calcmode === "discrete" || !Number.isFinite(nb) ? na : na + (nb - na) * f;
              if (ka.fmla) x2 = evalFormula(ka.fmla, { ...vr, $: x2 });
              v = x2;
            }
          }
        } else {
          const cur = currentOf(a, st);
          const from = n.from !== void 0 ? numVal(n.from, vr) : typeof cur === "number" ? cur : NaN;
          if (n.to !== void 0) {
            const to = numVal(n.to, vr);
            v = Number.isFinite(to) && Number.isFinite(from) ? from + (to - from) * p : p > 0 ? n.to : cur ?? n.to;
          } else if (n.by !== void 0) {
            const by = numVal(n.by, vr);
            if (Number.isFinite(by) && Number.isFinite(from)) v = from + by * p;
          }
        }
        if (v !== void 0 && (typeof v === "string" || Number.isFinite(v))) assign(a, v, st);
      }
      return;
    }
    case "animEffect": {
      if (n.filter === "image") {
        const m = /opacity:\s*([\d.]+)/.exec(n.prLst ?? "");
        if (m) st.opacity = Math.min(st.opacity, parseFloat(m[1]));
        return;
      }
      if (n.filter) st.filters.push({ filter: n.filter, transition: n.transition ?? "in", p });
      return;
    }
    case "animScale": {
      const from = n.fromXY ?? [st.sx, st.sy];
      const to = n.toXY ?? (n.byXY ? [from[0] * n.byXY[0], from[1] * n.byXY[1]] : from);
      st.sx = from[0] + (to[0] - from[0]) * p;
      st.sy = from[1] + (to[1] - from[1]) * p;
      return;
    }
    case "animRot": {
      if (n.rotFrom !== void 0 || n.rotTo !== void 0) {
        const from = n.rotFrom ?? st.rot, to = n.rotTo ?? from;
        st.rot = from + (to - from) * p;
      } else if (n.rotBy !== void 0) {
        st.rot += n.rotBy * p;
      }
      return;
    }
    case "animMotion": {
      if (n.path) {
        const mp = motionPath(n.path);
        let [px, py] = pointOnPath(mp, p);
        if (n.rAng) {
          const a = n.rAng * Math.PI / 180;
          [px, py] = [px * Math.cos(a) - py * Math.sin(a), px * Math.sin(a) + py * Math.cos(a)];
        }
        st.mx += px;
        st.my += py;
      } else {
        const from = n.fromXY ?? [0, 0];
        const to = n.toXY ?? (n.byXY ? [from[0] + n.byXY[0], from[1] + n.byXY[1]] : from);
        st.mx += from[0] + (to[0] - from[0]) * p;
        st.my += from[1] + (to[1] - from[1]) * p;
      }
      return;
    }
    case "animClr": {
      for (const a of attrs2) {
        const fromC = n.fromColor ?? colorOf(a, st, base) ?? "#000000";
        let v;
        if (n.toColor) v = mixColor(fromC, n.toColor, p, n);
        else if (n.byHsl) {
          const [h, s, l] = rgbHsl(hexRgb(fromC));
          const sign = n.clrDir === "ccw" ? -1 : 1;
          v = hslHex(h + sign * n.byHsl[0] * p, Math.max(0, Math.min(1, s + n.byHsl[1] * p)), Math.max(0, Math.min(1, l + n.byHsl[2] * p)));
        }
        if (v) assign(a, v, st);
      }
      return;
    }
    default:
      return;
  }
}
function evalNode(n, local, st, base) {
  const container = n.tag === "par" || n.tag === "seq" || n.tag === "excl";
  const simple = simpleDurOf(n);
  const f = progressOf(n, local, simple);
  if (f === null) return;
  if (!container) {
    applyBehavior(n, f, st, base);
    return;
  }
  const t = Number.isFinite(simple) ? f * simple : local;
  if (n.tag === "seq") {
    let c0 = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break;
      c0 += b;
      if (t < c0) break;
      evalNode(c, t - c0, st, base);
      c0 += activeDurOf(c);
    }
    return;
  }
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null || t < b) continue;
    evalNode(c, t - b, st, base);
  }
}
function firstVisibility(n) {
  let best;
  const walk = (x2, t0) => {
    if (x2.tag === "set" && x2.attrNames?.includes("style.visibility") && x2.setTo) {
      if (!best || t0 < best.t) best = { t: t0, v: x2.setTo };
      return;
    }
    for (const c of x2.children) {
      const b = beginOffset(c);
      if (b !== null) walk(c, t0 + b);
    }
  };
  walk(n, 0);
  return best?.v;
}
function neutral(base, visible) {
  return { visible, opacity: 1, x: base.x, y: base.y, w: base.w, h: base.h, rot: 0, sx: 1, sy: 1, mx: 0, my: 0, filters: [] };
}
function evalTracks(tracks, animMs, base, initiallyVisible) {
  const st = neutral(base, initiallyVisible);
  for (const tr of tracks) {
    const local = animMs - tr.e.t0 - tr.shift;
    if (local < 0) continue;
    evalNode(tr.e.node, local, st, base);
  }
  return st;
}
function initialVisible(tracks) {
  const sorted = [...tracks].sort((a, b) => a.e.t0 + a.shift - (b.e.t0 + b.shift));
  for (const tr of sorted) {
    const v = firstVisibility(tr.e.node);
    if (v) return v !== "visible";
  }
  return true;
}
function shapeAnimHooks(effects, ids, animMs, ctx = {}) {
  const mine = effects.filter((e) => e.target && ids.includes(e.target.spid)).sort((a, b) => a.t0 - b.t0);
  if (!mine.length) return null;
  const all = [];
  const bg = [];
  const paras = [];
  const units = [];
  for (const e of mine) {
    const t = e.target;
    const it = e.node.iterate;
    if (t.sub === "bg") bg.push({ e, shift: 0 });
    else if (it && (it.type === "wd" || it.type === "lt")) {
      const bgFirst = ctx.animBg?.(t.spid) ?? false;
      units.push({ e, ...t.pRange ? { range: t.pRange } : {}, bgFirst });
      if (bgFirst) bg.push({ e, shift: 0 });
    } else if (t.pRange) paras.push({ tr: { e, shift: 0 }, range: t.pRange });
    else all.push({ e, shift: 0 });
  }
  const hooks = {
    all: (base) => evalTracks(all, animMs, base, initialVisible(all))
  };
  if (bg.length) {
    const vis = initialVisible(bg);
    hooks.bg = (base) => evalTracks(bg, animMs, base, vis);
  }
  if (paras.length) {
    hooks.para = (i2, base) => {
      const tr = paras.filter((p) => i2 >= p.range[0] && i2 <= p.range[1]).map((p) => p.tr);
      if (!tr.length) return null;
      return evalTracks(tr, animMs, base, initialVisible(tr));
    };
  }
  if (units.length) {
    const type = units[0].e.node.iterate.type;
    hooks.unit = {
      type,
      state: (ref, base) => {
        const tr = [];
        for (const u of units) {
          if (u.range && (ref.para < u.range[0] || ref.para > u.range[1])) continue;
          const it = u.e.node.iterate;
          const simple = simpleDurOf(u.e.node);
          const gap = it.absMs ?? (it.pct ?? 0) * simple;
          const local = u.range !== void 0 && u.range[0] === u.range[1];
          const k = local ? ref.kPara : ref.k, count = local ? ref.countPara : ref.count;
          const idx = it.backwards ? count - 1 - k : k;
          tr.push({ e: u.e, shift: idx * gap + (u.bgFirst ? simple : 0) });
        }
        if (!tr.length) return null;
        return evalTracks(tr, animMs, base, initialVisible(tr));
      }
    };
  }
  return hooks;
}

// ../slides-core/src/reveal.ts
function hash01(a, b) {
  let h = a * 374761393 + b * 668265263 | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function parseFilter(filter) {
  const m = /^([a-zA-Z]+)(?:\(([^)]*)\))?$/.exec(filter.trim());
  return m ? [m[1].toLowerCase(), (m[2] ?? "").trim()] : [filter.toLowerCase(), ""];
}
function sector(ctx, cx, cy, r, a0, a1) {
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, a0 - Math.PI / 2, a1 - Math.PI / 2, false);
  ctx.closePath();
}
function applyReveal(ctx, filter, q, x2, y, w, h) {
  q = Math.max(0, Math.min(1, q));
  if (q >= 1) return 1;
  const [name, arg] = parseFilter(filter);
  if (name === "fade") return q;
  if (q <= 0) {
    ctx.beginPath();
    ctx.rect(x2, y, 0, 0);
    ctx.clip();
    return 1;
  }
  const cx = x2 + w / 2, cy = y + h / 2;
  ctx.beginPath();
  switch (name) {
    case "wipe": {
      if (arg === "down") ctx.rect(x2, y + h * (1 - q), w, h * q);
      else if (arg === "up") ctx.rect(x2, y, w, h * q);
      else if (arg === "left") ctx.rect(x2, y, w * q, h);
      else ctx.rect(x2 + w * (1 - q), y, w * q, h);
      break;
    }
    case "barn": {
      const vertical = arg.includes("Vertical");
      const inward = arg.startsWith("in");
      if (vertical) {
        if (inward) {
          ctx.rect(x2, y, w * q / 2, h);
          ctx.rect(x2 + w - w * q / 2, y, w * q / 2, h);
        } else ctx.rect(cx - w * q / 2, y, w * q, h);
      } else if (inward) {
        ctx.rect(x2, y, w, h * q / 2);
        ctx.rect(x2, y + h - h * q / 2, w, h * q / 2);
      } else ctx.rect(x2, cy - h * q / 2, w, h * q);
      break;
    }
    case "blinds": {
      const n = 6;
      if (arg === "vertical") {
        const bw = w / n;
        for (let i2 = 0; i2 < n; i2++) ctx.rect(x2 + i2 * bw, y, bw * q, h);
      } else {
        const bh = h / n;
        for (let i2 = 0; i2 < n; i2++) ctx.rect(x2, y + i2 * bh, w, bh * q);
      }
      break;
    }
    case "box": {
      if (arg === "in") {
        const iw = w * (1 - q), ih = h * (1 - q);
        ctx.rect(x2, y, w, h);
        ctx.rect(cx + iw / 2, cy - ih / 2, -iw, ih);
      } else ctx.rect(cx - w * q / 2, cy - h * q / 2, w * q, h * q);
      break;
    }
    case "circle": {
      const R = Math.hypot(w, h) / 2;
      if (arg === "in") {
        ctx.rect(x2, y, w, h);
        ctx.moveTo(cx + R * (1 - q), cy);
        ctx.arc(cx, cy, R * (1 - q), 0, Math.PI * 2, true);
      } else ctx.arc(cx, cy, R * q, 0, Math.PI * 2);
      break;
    }
    case "diamond": {
      const dx = w * q, dy = h * q;
      if (arg === "in") {
        const ix = w * (1 - q), iy = h * (1 - q);
        ctx.rect(x2, y, w, h);
        ctx.moveTo(cx, cy - iy);
        ctx.lineTo(cx - ix, cy);
        ctx.lineTo(cx, cy + iy);
        ctx.lineTo(cx + ix, cy);
        ctx.closePath();
      } else {
        ctx.moveTo(cx, cy - dy);
        ctx.lineTo(cx + dx, cy);
        ctx.lineTo(cx, cy + dy);
        ctx.lineTo(cx - dx, cy);
        ctx.closePath();
      }
      break;
    }
    case "plus": {
      if (arg === "in") {
        const aw = w / 2 * (1 - q), ah = h / 2 * (1 - q);
        ctx.rect(x2, y, w, h);
        ctx.moveTo(cx - aw, y);
        ctx.lineTo(cx - aw, cy - ah);
        ctx.lineTo(x2, cy - ah);
        ctx.lineTo(x2, cy + ah);
        ctx.lineTo(cx - aw, cy + ah);
        ctx.lineTo(cx - aw, y + h);
        ctx.lineTo(cx + aw, y + h);
        ctx.lineTo(cx + aw, cy + ah);
        ctx.lineTo(x2 + w, cy + ah);
        ctx.lineTo(x2 + w, cy - ah);
        ctx.lineTo(cx + aw, cy - ah);
        ctx.lineTo(cx + aw, y);
        ctx.closePath();
      } else {
        const aw = w / 2 * q, ah = h / 2 * q;
        ctx.rect(cx - aw, y, aw * 2, h);
        ctx.rect(x2, cy - ah, w, ah * 2);
      }
      break;
    }
    case "checkerboard": {
      const cols = 8, rows = 8;
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const odd = (r + c) % 2;
          const f = Math.max(0, Math.min(1, q * 2 - odd));
          if (f <= 0) continue;
          if (arg === "down") ctx.rect(x2 + c * cw, y + r * ch, cw, ch * f);
          else ctx.rect(x2 + c * cw, y + r * ch, cw * f, ch);
        }
      }
      break;
    }
    case "dissolve": {
      const cols = Math.max(24, Math.round(w / 8)), rows = Math.max(1, Math.round(cols * h / Math.max(1, w)));
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (hash01(c, r) < q) ctx.rect(x2 + c * cw, y + r * ch, cw + 0.5, ch + 0.5);
      break;
    }
    case "randombar": {
      const n = 64;
      if (arg === "vertical") {
        const bw = w / n;
        for (let i2 = 0; i2 < n; i2++) if (hash01(i2, 7) < q) ctx.rect(x2 + i2 * bw, y, bw + 0.5, h);
      } else {
        const bh = h / n;
        for (let i2 = 0; i2 < n; i2++) if (hash01(i2, 3) < q) ctx.rect(x2, y + i2 * bh, w, bh + 0.5);
      }
      break;
    }
    case "strips": {
      const steps = 16;
      const fromRight = arg.includes("Left"), fromTop = arg.startsWith("down");
      const cw = w / steps, ch = h / steps;
      for (let r = 0; r < steps; r++) {
        for (let c = 0; c < steps; c++) {
          const u = fromRight ? steps - 1 - c : c;
          const v = fromTop ? r : steps - 1 - r;
          if ((u + v) / (2 * steps - 2) <= q) ctx.rect(x2 + c * cw, y + r * ch, cw + 0.5, ch + 0.5);
        }
      }
      break;
    }
    case "wedge": {
      const R = Math.hypot(w, h);
      sector(ctx, cx, cy, R, 2 * Math.PI - Math.PI * q, 2 * Math.PI);
      sector(ctx, cx, cy, R, 0, Math.PI * q);
      break;
    }
    case "wheel": {
      const n = Math.max(1, parseInt(arg, 10) || 1);
      const R = Math.hypot(w, h);
      const span = 2 * Math.PI / n;
      for (let i2 = 0; i2 < n; i2++) sector(ctx, cx, cy, R, i2 * span, i2 * span + span * q);
      break;
    }
    case "slide": {
      ctx.rect(x2, y, w, h);
      ctx.clip();
      const off = 1 - q;
      if (arg === "fromBottom") ctx.translate(0, h * off);
      else if (arg === "fromTop") ctx.translate(0, -h * off);
      else if (arg === "fromLeft") ctx.translate(-w * off, 0);
      else ctx.translate(w * off, 0);
      return 1;
    }
    default:
      return q;
  }
  ctx.clip();
  return 1;
}

// ../slides-core/src/transition.ts
function easeInOut(p) {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, p)));
}
function easeOut3(p) {
  const q = 1 - Math.max(0, Math.min(1, p));
  return 1 - q * q * q;
}
var clamp01 = (v) => Math.max(0, Math.min(1, v));
function easePow(p, k, end = 1) {
  const t = clamp01(p / end);
  return t < 0.5 ? 0.5 * Math.pow(2 * t, k) : 1 - 0.5 * Math.pow(2 * (1 - t), k);
}
function hash012(a, b) {
  let h = a * 374761393 + b * 668265263 | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
var scratches = [];
function scratch(slot, w, h) {
  let c = scratches[slot];
  if (!c) {
    c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : document.createElement("canvas");
    scratches[slot] = c;
  }
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  const x2 = c.getContext("2d");
  x2.setTransform(1, 0, 0, 1, 0, 0);
  x2.globalAlpha = 1;
  x2.globalCompositeOperation = "source-over";
  x2.clearRect(0, 0, w, h);
  return { c, x: x2 };
}
function softOver(ctx, from, to, r, cw, ch, paintMask) {
  draw(ctx, from, r);
  const t = scratch(0, cw, ch);
  t.x.drawImage(to, 0, 0);
  t.x.globalCompositeOperation = "destination-in";
  paintMask(t.x);
  ctx.drawImage(t.c, 0, 0);
}
function linearMask(m, ax, ay, bx, by, q, band, r) {
  const s = q * (1 + band) - band;
  const dx = bx - ax, dy = by - ay;
  const x0 = ax + dx * s, y0 = ay + dy * s;
  const g = m.createLinearGradient(x0, y0, x0 + dx * band, y0 + dy * band);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  m.fillStyle = g;
  m.fillRect(r.x, r.y, r.w, r.h);
}
function softShape(m, q, band, shape, steps = 12) {
  const mk = scratch(1, m.canvas.width, m.canvas.height);
  mk.x.globalCompositeOperation = "lighter";
  mk.x.fillStyle = `rgba(255,255,255,${(1 / steps).toFixed(4)})`;
  for (let i2 = 0; i2 < steps; i2++) {
    const k = q + band * (0.5 - (i2 + 0.5) / steps);
    if (k <= 0) continue;
    mk.x.beginPath();
    shape(k, mk.x);
    mk.x.fill();
  }
  m.drawImage(mk.c, 0, 0);
}
function flipTile(ctx, from, to, x2, y, w, h, f, horizontalAxis) {
  const ff = clamp01(f);
  const img = ff < 0.5 ? from : to;
  const k = Math.abs(Math.cos(Math.PI * ff));
  if (k < 0.01) return;
  ctx.save();
  if (horizontalAxis) {
    const cy = y + h / 2;
    ctx.translate(0, cy);
    ctx.scale(1, k);
    ctx.translate(0, -cy);
  } else {
    const cx = x2 + w / 2;
    ctx.translate(cx, 0);
    ctx.scale(k, 1);
    ctx.translate(-cx, 0);
  }
  ctx.globalAlpha *= 0.75 + 0.25 * k;
  ctx.drawImage(img, x2, y, w, h, x2, y, w, h);
  ctx.restore();
}
function draw(ctx, img, r, dx = 0, dy = 0) {
  ctx.drawImage(img, r.x, r.y, r.w, r.h, r.x + dx, r.y + dy, r.w, r.h);
}
function dirVec(dir) {
  switch (dir) {
    case "r":
      return [1, 0];
    case "u":
      return [0, -1];
    case "d":
      return [0, 1];
    case "lu":
      return [-1, -1];
    case "ru":
      return [1, -1];
    case "ld":
      return [-1, 1];
    case "rd":
      return [1, 1];
    default:
      return [-1, 0];
  }
}
function revealOver(ctx, from, to, r, filter, q) {
  draw(ctx, from, r);
  ctx.save();
  const a = applyReveal(ctx, filter, q, r.x, r.y, r.w, r.h);
  ctx.globalAlpha *= a;
  draw(ctx, to, r);
  ctx.restore();
}
function drawScaled(ctx, img, r, kx, ky, rot = 0, alpha = 1, cx = r.x + r.w / 2, cy = r.y + r.h / 2) {
  if (kx <= 1e-3 || ky <= 1e-3 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  ctx.scale(kx, ky);
  ctx.translate(-cx, -cy);
  draw(ctx, img, r);
  ctx.restore();
}
function paintTransition(ctx, from, to, tr, p, r, canvasW, canvasH) {
  const a = tr.attrs;
  const dir = a["dir"] ?? "";
  const thruBlk = a["thruBlk"] === "1" || a["thruBlk"] === "true";
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  switch (tr.type) {
    case "cut": {
      if (thruBlk) {
        if (p < 0.5) draw(ctx, from, r);
      } else draw(ctx, p > 0 ? to : from, r);
      break;
    }
    case "fade": {
      if (thruBlk) {
        ctx.globalAlpha = p < 0.5 ? 1 - 2 * p : 2 * p - 1;
        draw(ctx, p < 0.5 ? from : to, r);
      } else {
        draw(ctx, from, r);
        ctx.globalAlpha = p;
        draw(ctx, to, r);
      }
      break;
    }
    case "push": {
      const e = easeInOut(p);
      const [vx, vy] = dirVec(dir || "l");
      draw(ctx, from, r, vx * r.w * e, vy * r.h * e);
      draw(ctx, to, r, vx * r.w * (e - 1), vy * r.h * (e - 1));
      break;
    }
    case "cover": {
      const [vx, vy] = dirVec(dir || "l");
      const e = vx !== 0 && vy !== 0 ? easeOut3(p) : easePow(p, 3);
      draw(ctx, from, r);
      draw(ctx, to, r, -vx * r.w * (1 - e), -vy * r.h * (1 - e));
      break;
    }
    case "pull": {
      const e = easePow(p, 1.8, 0.9);
      const [vx, vy] = dirVec(dir || "l");
      draw(ctx, to, r);
      draw(ctx, from, r, vx * r.w * e, vy * r.h * e);
      break;
    }
    case "wipe": {
      const [vx, vy] = dirVec(dir || "l");
      const ax = vx > 0 ? r.x : vx < 0 ? r.x + r.w : r.x, ay = vy > 0 ? r.y : vy < 0 ? r.y + r.h : r.y;
      const bx = vx > 0 ? r.x + r.w : vx < 0 ? r.x : r.x, by = vy > 0 ? r.y + r.h : vy < 0 ? r.y : r.y;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => linearMask(m, ax, ay, bx, by, p, 1, r));
      break;
    }
    case "split": {
      const vert = a["orient"] === "vert";
      const inward = a["dir"] === "in";
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => {
        const half = (x0, y0, x1, y1, clip) => {
          m.save();
          m.beginPath();
          m.rect(...clip);
          m.clip();
          linearMask(m, x0, y0, x1, y1, p, 1, r);
          m.restore();
        };
        if (vert) {
          if (inward) {
            half(r.x, cy, cx, cy, [r.x, r.y, r.w / 2, r.h]);
            half(r.x + r.w, cy, cx, cy, [cx, r.y, r.w / 2, r.h]);
          } else {
            half(cx, cy, r.x, cy, [r.x, r.y, r.w / 2, r.h]);
            half(cx, cy, r.x + r.w, cy, [cx, r.y, r.w / 2, r.h]);
          }
        } else if (inward) {
          half(cx, r.y, cx, cy, [r.x, r.y, r.w, r.h / 2]);
          half(cx, r.y + r.h, cx, cy, [r.x, cy, r.w, r.h / 2]);
        } else {
          half(cx, cy, cx, r.y, [r.x, r.y, r.w, r.h / 2]);
          half(cx, cy, cx, r.y + r.h, [r.x, cy, r.w, r.h / 2]);
        }
      });
      break;
    }
    case "randomBar": {
      const vert = dir === "vert";
      const n = Math.max(60, Math.round((vert ? r.w : r.h) / 2));
      draw(ctx, from, r);
      for (let i2 = 0; i2 < n; i2++) {
        const u = (hash012(i2, 11) + hash012(i2, 29)) / 2;
        const al = clamp01((p - 0.18 - 0.4 * u) / 0.3);
        if (al <= 0) continue;
        ctx.globalAlpha = al;
        if (vert) {
          const bx = r.x + i2 * r.w / n, bw = r.w / n + 0.5;
          ctx.drawImage(to, bx, r.y, bw, r.h, bx, r.y, bw, r.h);
        } else {
          const by = r.y + i2 * r.h / n, bh = r.h / n + 0.5;
          ctx.drawImage(to, r.x, by, r.w, bh, r.x, by, r.w, bh);
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "blinds": {
      const vert = dir === "vert";
      const n = 12;
      for (let i2 = 0; i2 < n; i2++) {
        const f = (p - 0.1 - 0.4 * i2 / (n - 1)) / 0.35;
        if (vert) flipTile(ctx, from, to, r.x + i2 * r.w / n, r.y, r.w / n + 0.5, r.h, f, false);
        else flipTile(ctx, from, to, r.x, r.y + i2 * r.h / n, r.w, r.h / n + 0.5, f, true);
      }
      break;
    }
    case "checker": {
      const vert = dir === "vert";
      const cols = 10, rows = 6;
      for (let rI = 0; rI < rows; rI++) {
        for (let c = 0; c < cols; c++) {
          const lead = vert ? rI / (rows - 1) : c / (cols - 1);
          const f = (p - 0.5 * lead - 0.05 * hash012(c, rI)) / 0.45;
          flipTile(ctx, from, to, r.x + c * r.w / cols, r.y + rI * r.h / rows, r.w / cols + 0.5, r.h / rows + 0.5, f, false);
        }
      }
      break;
    }
    case "strips": {
      const [vx, vy] = dirVec(dir || "lu");
      const ax = vx > 0 ? r.x : r.x + r.w, ay = vy > 0 ? r.y : r.y + r.h;
      const bx = vx > 0 ? r.x + r.w : r.x, by = vy > 0 ? r.y + r.h : r.y;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => linearMask(m, ax, ay, bx, by, p, 1, r));
      break;
    }
    case "circle":
    case "diamond":
    case "plus": {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const R = Math.hypot(r.w, r.h) / 2;
      const band = 0.5;
      const q = p * (1 + band) - band / 2;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => softShape(m, q, band, (k, x2) => {
        if (tr.type === "circle") x2.arc(cx, cy, R * k, 0, Math.PI * 2);
        else if (tr.type === "diamond") {
          x2.moveTo(cx, cy - r.h * k);
          x2.lineTo(cx + r.w * k, cy);
          x2.lineTo(cx, cy + r.h * k);
          x2.lineTo(cx - r.w * k, cy);
          x2.closePath();
        } else {
          const aw = r.w / 2 * k * 1.2, ah = r.h / 2 * k * 1.2;
          x2.rect(cx - aw, r.y, aw * 2, r.h);
          x2.rect(r.x, cy - ah, r.w, ah * 2);
        }
      }, 16));
      break;
    }
    case "zoom": {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const soft = 0.06;
      if (dir === "in") {
        const k = clamp01(1 - 2 * p);
        draw(ctx, to, r);
        if (k > 0) softOver(ctx, to, from, r, canvasW, canvasH, (m) => softShape(m, k, soft, (kk, x2) => {
          x2.rect(cx - r.w * kk / 2, cy - r.h * kk / 2, r.w * kk, r.h * kk);
        }, 8));
      } else {
        const k = clamp01(2 * p - 1);
        if (k <= 0) draw(ctx, from, r);
        else softOver(ctx, from, to, r, canvasW, canvasH, (m) => softShape(m, k, soft, (kk, x2) => {
          x2.rect(cx - r.w * kk / 2, cy - r.h * kk / 2, r.w * kk, r.h * kk);
        }, 8));
      }
      break;
    }
    case "wedge":
      revealOver(ctx, from, to, r, "wedge", p);
      break;
    case "wheel":
      revealOver(ctx, from, to, r, `wheel(${a["spokes"] ?? "4"})`, p);
      break;
    case "wheelReverse": {
      draw(ctx, from, r);
      ctx.save();
      ctx.translate(r.x + r.w, 0);
      ctx.scale(-1, 1);
      ctx.translate(-r.x, 0);
      applyReveal(ctx, `wheel(${a["spokes"] ?? "1"})`, p, r.x, r.y, r.w, r.h);
      ctx.translate(r.x + r.w, 0);
      ctx.scale(-1, 1);
      ctx.translate(-r.x, 0);
      draw(ctx, to, r);
      ctx.restore();
      break;
    }
    case "dissolve":
      revealOver(ctx, from, to, r, "dissolve", p);
      break;
    case "comb": {
      const n = 8, e = easeInOut(p);
      draw(ctx, from, r);
      const vert = dir === "vert";
      for (let i2 = 0; i2 < n; i2++) {
        ctx.save();
        ctx.beginPath();
        if (vert) ctx.rect(r.x + i2 * r.w / n, r.y, r.w / n + 0.5, r.h);
        else ctx.rect(r.x, r.y + i2 * r.h / n, r.w, r.h / n + 0.5);
        ctx.clip();
        const s = i2 % 2 === 0 ? 1 : -1;
        if (vert) draw(ctx, to, r, 0, s * r.h * (1 - e));
        else draw(ctx, to, r, s * r.w * (1 - e), 0);
        ctx.restore();
      }
      break;
    }
    case "newsflash": {
      draw(ctx, from, r);
      drawScaled(ctx, to, r, p, p, (1 - p) * Math.PI * 4);
      break;
    }
    case "flash": {
      if (p < 0.62) {
        draw(ctx, from, r);
        ctx.fillStyle = `rgba(255,255,255,${clamp01(p / 0.12).toFixed(3)})`;
      } else {
        draw(ctx, to, r);
        ctx.fillStyle = `rgba(255,255,255,${clamp01((0.95 - p) / 0.33).toFixed(3)})`;
      }
      ctx.fillRect(r.x, r.y, r.w, r.h);
      break;
    }
    case "reveal": {
      const [vx] = dirVec(dir === "r" ? "r" : "l");
      if (thruBlk) {
        const out = clamp01(p / 0.45);
        if (out < 1) {
          ctx.globalAlpha = 1 - out;
          draw(ctx, from, r, vx * r.w * 0.15 * out, 0);
        }
        const inn = clamp01((p - 0.6) / 0.2);
        if (inn > 0) {
          ctx.globalAlpha = inn;
          draw(ctx, to, r);
        }
      } else {
        draw(ctx, from, r);
        ctx.globalAlpha = p;
        draw(ctx, to, r);
      }
      break;
    }
    // ── aproximações 2D das transições 3D/dinâmicas ──
    case "pan":
    case "conveyor":
    case "gallery":
    case "ferris": {
      const e = easeInOut(p);
      const [vx, vy] = dirVec(dir === "r" ? "r" : dir === "u" ? "u" : dir === "d" ? "d" : "l");
      const k = tr.type === "pan" ? 1 : 1 - 0.15 * Math.sin(Math.PI * p);
      drawScaled(ctx, from, r, k, k, 0, 1, r.x + r.w / 2 + vx * r.w * e, r.y + r.h / 2 + vy * r.h * e);
      drawScaled(ctx, to, r, k, k, 0, 1, r.x + r.w / 2 + vx * r.w * (e - 1), r.y + r.h / 2 + vy * r.h * (e - 1));
      break;
    }
    case "prism": {
      const e = easeInOut(p);
      const [vx] = dirVec(dir === "r" ? "r" : "l");
      const fromW = 1 - e, toW = e;
      ctx.save();
      ctx.translate(vx < 0 ? r.x : r.x + r.w, 0);
      ctx.scale(fromW || 1e-3, 1);
      ctx.translate(-(vx < 0 ? r.x : r.x + r.w), 0);
      draw(ctx, from, r);
      ctx.restore();
      ctx.save();
      ctx.translate(vx < 0 ? r.x + r.w : r.x, 0);
      ctx.scale(toW || 1e-3, 1);
      ctx.translate(-(vx < 0 ? r.x + r.w : r.x), 0);
      draw(ctx, to, r);
      ctx.restore();
      break;
    }
    case "flip":
    case "switch": {
      const e = easeInOut(p);
      if (e < 0.5) drawScaled(ctx, from, r, 1 - 2 * e, 1 - 0.1 * e);
      else drawScaled(ctx, to, r, 2 * e - 1, 1 - 0.1 * (1 - e));
      break;
    }
    case "doors":
    case "window": {
      const e = easeInOut(p);
      const vert = (a["dir"] ?? "vert") === "vert";
      drawScaled(ctx, to, r, 0.8 + 0.2 * e, 0.8 + 0.2 * e, 0, Math.min(1, e * 1.4));
      for (const side of [0, 1]) {
        ctx.save();
        ctx.beginPath();
        if (vert) ctx.rect(r.x + side * r.w / 2, r.y, r.w / 2, r.h);
        else ctx.rect(r.x, r.y + side * r.h / 2, r.w, r.h / 2);
        ctx.clip();
        const ox = vert ? side === 0 ? r.x : r.x + r.w : r.x + r.w / 2;
        const oy = vert ? r.y + r.h / 2 : side === 0 ? r.y : r.y + r.h;
        ctx.translate(ox, oy);
        if (vert) ctx.scale(Math.max(1e-3, 1 - e), 1);
        else ctx.scale(1, Math.max(1e-3, 1 - e));
        ctx.translate(-ox, -oy);
        draw(ctx, from, r);
        ctx.restore();
      }
      break;
    }
    case "warp":
    case "flythrough": {
      const e = easeInOut(p);
      const inward = (a["dir"] ?? "in") === "in";
      if (inward) {
        drawScaled(ctx, from, r, 1 + e, 1 + e, 0, 1 - e);
        drawScaled(ctx, to, r, 0.5 + 0.5 * e, 0.5 + 0.5 * e, 0, e);
      } else {
        drawScaled(ctx, from, r, 1 - 0.5 * e, 1 - 0.5 * e, 0, 1 - e);
        drawScaled(ctx, to, r, 2 - e, 2 - e, 0, e);
      }
      break;
    }
    case "prstTrans": {
      const e = easeInOut(p);
      draw(ctx, to, r);
      const prst = a["prst"] ?? "";
      if (prst === "fallOver") drawScaled(ctx, from, r, 1, Math.max(1e-3, Math.cos(e * Math.PI / 2)), 0, 1, r.x + r.w / 2, r.y + r.h);
      else if (prst === "curtains" || prst === "drape") {
        for (const side of [0, 1]) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(r.x + side * r.w / 2, r.y, r.w / 2, r.h);
          ctx.clip();
          const ox = side === 0 ? r.x : r.x + r.w;
          ctx.translate(ox, 0);
          ctx.scale(Math.max(1e-3, 1 - e), 1);
          ctx.translate(-ox, 0);
          draw(ctx, from, r);
          ctx.restore();
        }
      } else {
        ctx.globalAlpha = 1 - e;
        draw(ctx, from, r, (a["invX"] === "1" ? 1 : -1) * r.w * e * 0.2, 0);
      }
      break;
    }
    default: {
      draw(ctx, from, r);
      ctx.globalAlpha = p;
      draw(ctx, to, r);
    }
  }
  ctx.restore();
}

// ../slides-core/src/chart-engine.ts
var DEFAULT_PALETTE = [
  "#4472C4",
  "#ED7D31",
  "#A5A5A5",
  "#FFC000",
  "#5B9BD5",
  "#70AD47",
  "#264478",
  "#9E480E",
  "#636363",
  "#997300",
  "#255E91",
  "#43682B"
];
function parseChart(xml) {
  const root = parseXml(xml);
  const chart = firstChild(root, "c:chart");
  if (!chart) return { type: "unknown", series: [], categories: [] };
  const out = { type: "unknown", series: [], categories: [] };
  const titleEl = firstChild(chart, "c:title");
  if (titleEl) {
    const rich = deepFind(titleEl, "c:rich");
    if (rich) {
      const t = [];
      walkText(rich, t);
      const title = t.join("");
      if (title) out.title = title;
    }
  }
  const plot = firstChild(chart, "c:plotArea");
  if (!plot) return out;
  const legend = firstChild(chart, "c:legend");
  if (legend) {
    const pos = firstChild(legend, "c:legendPos");
    out.legendPos = pos?.attrs["val"] ?? "b";
  }
  const perSeriesTypes = [];
  for (const block of childElements(plot)) {
    const t = chartTypeForBlock(block.name);
    if (t === "unknown") continue;
    if (out.type === "unknown") out.type = t;
    const hole = firstChild(block, "c:holeSize");
    if (hole?.attrs["val"]) out.holeSize = parseInt(hole.attrs["val"], 10) / 100;
    const rs = firstChild(block, "c:radarStyle");
    if (rs?.attrs["val"]) out.radarStyle = rs.attrs["val"];
    const gap = firstChild(block, "c:gapWidth");
    if (gap?.attrs["val"]) out.gapWidth = parseInt(gap.attrs["val"], 10);
    const ov = firstChild(block, "c:overlap");
    if (ov?.attrs["val"]) out.overlap = parseInt(ov.attrs["val"], 10);
    for (const ser of childElements(block, "c:ser")) {
      const series = parseSeries(ser);
      if (series.values.length === 0) continue;
      out.series.push(series);
      perSeriesTypes.push(t);
      if (out.categories.length === 0) {
        const cats = readCategories(ser);
        if (cats.length) out.categories = cats;
      }
    }
  }
  const uniqueTypes = new Set(perSeriesTypes);
  if (uniqueTypes.size > 1) out.perSeriesType = perSeriesTypes;
  return out;
}
function chartTypeForBlock(name) {
  switch (name) {
    case "c:barChart":
      return "bar-col";
    // refinado abaixo via barDir
    case "c:lineChart":
      return "line";
    case "c:pieChart":
      return "pie";
    case "c:doughnutChart":
      return "doughnut";
    case "c:scatterChart":
      return "scatter";
    case "c:radarChart":
      return "radar";
    case "c:areaChart":
      return "area";
    default:
      return "unknown";
  }
}
function parseSeries(ser) {
  let name = "";
  const tx = firstChild(ser, "c:tx");
  if (tx) {
    const strRef = firstChild(tx, "c:strRef");
    const cache3 = strRef ? firstChild(strRef, "c:strCache") : void 0;
    if (cache3) {
      const pt = firstChild(cache3, "c:pt");
      const v = pt ? firstChild(pt, "c:v") : void 0;
      if (v) name = textContent(v).trim();
    } else {
      const v = firstChild(tx, "c:v");
      if (v) name = textContent(v).trim();
    }
  }
  const values = [];
  const valBlock = firstChild(ser, "c:val") ?? firstChild(ser, "c:yVal");
  if (valBlock) collectNumPts(valBlock, values);
  let color;
  const spPr = firstChild(ser, "c:spPr");
  if (spPr) {
    const fill = firstChild(spPr, "a:solidFill");
    const clr = fill ? firstChild(fill, "a:srgbClr") : void 0;
    if (clr?.attrs["val"]) color = "#" + clr.attrs["val"];
  }
  const out = { name, values };
  if (color) out.color = color;
  const marker = firstChild(ser, "c:marker");
  if (marker) {
    const sym = firstChild(marker, "c:symbol");
    out.marker = sym?.attrs["val"] !== "none";
  }
  return out;
}
function collectNumPts(block, out) {
  const cache3 = deepFind(block, "c:numCache");
  if (!cache3) return;
  const indexed = [];
  for (const pt of childElements(cache3, "c:pt")) {
    const idx = parseInt(pt.attrs["idx"] ?? "0", 10);
    const v = firstChild(pt, "c:v");
    indexed[idx] = v ? parseFloat(textContent(v)) : NaN;
  }
  for (let i2 = 0; i2 < indexed.length; i2++) out.push(Number.isFinite(indexed[i2]) ? indexed[i2] : 0);
}
function readCategories(ser) {
  const cat = firstChild(ser, "c:cat") ?? firstChild(ser, "c:xVal");
  if (!cat) return [];
  const out = [];
  const strCache = deepFind(cat, "c:strCache");
  if (strCache) {
    const indexed = [];
    for (const pt of childElements(strCache, "c:pt")) {
      const idx = parseInt(pt.attrs["idx"] ?? "0", 10);
      const v = firstChild(pt, "c:v");
      indexed[idx] = v ? textContent(v) : "";
    }
    for (let i2 = 0; i2 < indexed.length; i2++) out.push(indexed[i2] ?? "");
    return out;
  }
  const nums = [];
  collectNumPts(cat, nums);
  return nums.map((n) => String(n));
}
function deepFind(el2, name) {
  for (const c of el2.children) {
    if (typeof c === "string") continue;
    if (c.name === name) return c;
    const f = deepFind(c, name);
    if (f) return f;
  }
  return void 0;
}
function walkText(el2, out) {
  for (const c of el2.children) {
    if (typeof c === "string") {
      out.push(c);
      continue;
    }
    if (c.name === "a:t") {
      out.push(textContent(c));
      continue;
    }
    walkText(c, out);
  }
}
function paintChart(ctx, chart, x2, y, w, h, pxPerPt, frameBorder, sliceBorder = true) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x2, y, w, h);
  if (frameBorder) {
    ctx.strokeStyle = frameBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x2 + 0.5, y + 0.5, w - 1, h - 1);
  }
  const ppt = pxPerPt ?? Math.max(0.8, h / 360);
  const u = ppt / 1.333;
  const titlePx = 15.5 * ppt;
  const labelPx = 10 * ppt;
  let plotY = y + 8 * u;
  let plotH = h - 16 * u;
  if (chart.title) {
    ctx.fillStyle = "#595959";
    ctx.font = `${titlePx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(chart.title, x2 + w / 2, y + 16 * u);
    plotY = y + titlePx + 36 * u;
    plotH = h - (titlePx + 44 * u);
  }
  const showLegend = chart.legendPos !== void 0;
  const legendRight = chart.legendPos === "r";
  const legendH = showLegend && !legendRight ? labelPx + 20 * u : 0;
  const legendTop = chart.legendPos === "t";
  const legendW = legendRight ? legendRightWidth(ctx, chart, labelPx) : 0;
  const px = x2 + 8 * u;
  const py = plotY + (legendTop ? legendH : 0);
  const pw = w - 16 * u - legendW;
  const ph = plotH - legendH;
  switch (chart.type) {
    case "bar-col":
      paintBars(ctx, chart, px, py, pw, ph, "col", labelPx);
      break;
    case "bar-row":
      paintBars(ctx, chart, px, py, pw, ph, "row", labelPx);
      break;
    case "line":
      paintLines(ctx, chart, px, py, pw, ph, labelPx, false);
      break;
    case "area":
      paintLines(ctx, chart, px, py, pw, ph, labelPx, true);
      break;
    case "pie":
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, 0, sliceBorder);
      break;
    case "doughnut":
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, chart.holeSize ?? 0.75, sliceBorder);
      break;
    case "scatter":
      paintScatter(ctx, chart, px, py, pw, ph, labelPx);
      break;
    case "radar":
      paintRadar(ctx, chart, px, py, pw, ph, labelPx);
      break;
    default:
      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Gr\xE1fico (${chart.type}) \u2014 render em breve`, x2 + w / 2, y + h / 2);
  }
  if (showLegend) {
    if (legendRight) {
      paintLegendRight(ctx, chart, px + pw + 4 * u, py, legendW, ph, labelPx);
    } else {
      const ly = legendTop ? plotY : py + ph + 6 * u;
      paintLegend(ctx, chart, px, ly, pw, legendH, labelPx);
    }
  }
}
function legendRightWidth(ctx, chart, labelPx) {
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  let maxW = 0;
  for (const s of chart.series) maxW = Math.max(maxW, ctx.measureText(s.name || "S\xE9rie").width);
  return maxW + labelPx * 1.6;
}
function paintLegendRight(ctx, chart, x2, y, w, h, labelPx) {
  const entries = chart.series.map((s, i2) => ({ label: s.name || `S\xE9rie ${i2 + 1}`, color: colorOf2(chart, i2) }));
  if (!entries.length) return;
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const lineH = labelPx * 1.7;
  const sq = labelPx * 0.65;
  let cy = y + (h - entries.length * lineH) / 2 + lineH / 2;
  for (const e of entries) {
    ctx.fillStyle = e.color;
    ctx.fillRect(x2, cy - sq / 2, sq, sq);
    ctx.fillStyle = "#595959";
    ctx.fillText(e.label, x2 + sq + labelPx * 0.4, cy);
    cy += lineH;
  }
}
function paletteOf(chart) {
  return chart.palette && chart.palette.length ? chart.palette : DEFAULT_PALETTE;
}
function colorOf2(chart, i2) {
  const pal = paletteOf(chart);
  return chart.series[i2]?.color ?? pal[i2 % pal.length];
}
function valueRange(chart) {
  let min = 0, max2 = 0;
  for (const s of chart.series) for (const v of s.values) {
    if (v < min) min = v;
    if (v > max2) max2 = v;
  }
  if (max2 === min) max2 = min + 1;
  return { min, max: max2 };
}
function niceTicks(min, max2) {
  const minAdj = min < 0 ? min * 1.05 : min;
  const maxAdj = max2 > 0 ? max2 * 1.05 : max2;
  const span = Math.max(maxAdj - minAdj, 1e-9);
  let mag = Math.pow(10, Math.floor(Math.log10(span / 10)));
  for (let k = 0; k < 4; k++) {
    for (const f of [1, 2, 5]) {
      const step2 = f * mag;
      const lo = Math.floor(minAdj / step2) * step2;
      const hi = Math.ceil(maxAdj / step2) * step2;
      if ((hi - lo) / step2 <= 10) return { lo, hi, step: step2 };
    }
    mag *= 10;
  }
  const step = span;
  return { lo: Math.floor(minAdj / step) * step, hi: Math.ceil(maxAdj / step) * step, step };
}
function paintBars(ctx, chart, x2, y, w, h, dir, labelPx) {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats || chart.series.length === 0) return;
  const { min, max: max2 } = valueRange(chart);
  const t = niceTicks(min, max2);
  const axW = labelPx * 2, axH = labelPx * 2.4;
  const plotL = x2 + axW, plotT = y, plotR = x2 + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, t);
  const gap = (chart.gapWidth ?? 219) / 100;
  const ov = (chart.overlap ?? (chart.series.length > 1 ? -27 : 0)) / 100;
  const nSer = chart.series.length;
  const groupW = (plotR - plotL) / cats;
  const barW = groupW / ((nSer - 1) * (1 - ov) + 1 + gap);
  const span = barW * ((nSer - 1) * (1 - ov) + 1);
  for (let s = 0; s < nSer; s++) {
    ctx.fillStyle = colorOf2(chart, s);
    const vals = chart.series[s].values;
    for (let i2 = 0; i2 < cats; i2++) {
      const v = vals[i2] ?? 0;
      const gx = plotL + i2 * groupW + (groupW - span) / 2;
      const xBar = gx + s * barW * (1 - ov);
      const yTop = plotB - (v - t.lo) / (t.hi - t.lo) * (plotB - plotT);
      const bh = plotB - yTop;
      if (dir === "col") ctx.fillRect(xBar, yTop, barW, bh);
      else ctx.fillRect(plotL, xBar, bh, barW);
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, labelPx);
  paintValueAxis(ctx, t, plotL - labelPx * 0.9, plotT, plotB - plotT, labelPx);
}
function paintLines(ctx, chart, x2, y, w, h, labelPx, area) {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats) return;
  const { min, max: max2 } = valueRange(chart);
  const t = niceTicks(min, max2);
  const axW = labelPx * 2, axH = labelPx * 2.4;
  const plotL = x2 + axW, plotT = y, plotR = x2 + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, t);
  const stepX = (plotR - plotL) / cats;
  const xAt = (i2) => plotL + stepX * (i2 + 0.5);
  const yAt = (v) => plotB - (v - t.lo) / (t.hi - t.lo) * (plotB - plotT);
  for (let s = 0; s < chart.series.length; s++) {
    const col = colorOf2(chart, s);
    const vals = chart.series[s].values;
    if (area) {
      ctx.fillStyle = col;
      ctx.globalAlpha = ctx.globalAlpha * 1;
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(vals[0] ?? 0));
      for (let i2 = 1; i2 < cats; i2++) ctx.lineTo(xAt(i2), yAt(vals[i2] ?? 0));
      ctx.lineTo(xAt(cats - 1), plotB);
      ctx.lineTo(xAt(0), plotB);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = Math.max(2, labelPx / 6);
    ctx.beginPath();
    for (let i2 = 0; i2 < cats; i2++) {
      const yp = yAt(vals[i2] ?? 0);
      if (i2 === 0) ctx.moveTo(xAt(i2), yp);
      else ctx.lineTo(xAt(i2), yp);
    }
    ctx.stroke();
    if (chart.series[s].marker) {
      for (let i2 = 0; i2 < cats; i2++) {
        ctx.beginPath();
        ctx.arc(xAt(i2), yAt(vals[i2] ?? 0), labelPx / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, labelPx);
  paintValueAxis(ctx, t, plotL - labelPx * 0.9, plotT, plotB - plotT, labelPx);
}
function paintPieOrDoughnut(ctx, chart, x2, y, w, h, holeFrac, sliceBorder = true) {
  const s0 = chart.series[0];
  if (!s0) return;
  const total = s0.values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return;
  const pal = paletteOf(chart);
  const cx = x2 + w / 2, cy = y + h / 2 - h * 0.012;
  const radius = Math.min(w, h) / 2 * 0.97;
  let a0 = -Math.PI / 2;
  for (let i2 = 0; i2 < s0.values.length; i2++) {
    const v = Math.max(0, s0.values[i2] ?? 0);
    if (v === 0) continue;
    const a1 = a0 + v / total * Math.PI * 2;
    ctx.fillStyle = pal[i2 % pal.length];
    ctx.beginPath();
    if (holeFrac > 0) {
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.arc(cx, cy, radius * holeFrac, a1, a0, true);
      ctx.closePath();
    } else {
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.closePath();
    }
    ctx.fill();
    if (sliceBorder) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, radius / 90);
      ctx.stroke();
    }
    a0 = a1;
  }
}
function paintScatter(ctx, chart, x2, y, w, h, labelPx) {
  const xs = chart.categories.map((c) => parseFloat(c)).filter((v) => Number.isFinite(v));
  const n = chart.series[0]?.values.length ?? 0;
  if (!n) return;
  let xMin = 0, xMax = 0;
  for (const v of xs) {
    if (v < xMin) xMin = v;
    if (v > xMax) xMax = v;
  }
  if (xMax === xMin) xMax = xMin + 1;
  const { min, max: max2 } = valueRange(chart);
  const tx = niceTicks(xMin, xMax);
  const ty = niceTicks(min, max2);
  const axW = labelPx * 2, axH = labelPx * 2.4;
  const plotL = x2 + axW, plotT = y, plotR = x2 + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, ty);
  ctx.strokeStyle = "#D9D9D9";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let v = tx.lo; v <= tx.hi + 1e-9; v += tx.step) {
    const xx = plotL + (v - tx.lo) / (tx.hi - tx.lo) * (plotR - plotL);
    ctx.moveTo(Math.round(xx) + 0.5, plotT);
    ctx.lineTo(Math.round(xx) + 0.5, plotB);
  }
  ctx.stroke();
  for (let s = 0; s < chart.series.length; s++) {
    ctx.fillStyle = colorOf2(chart, s);
    const vals = chart.series[s].values;
    for (let i2 = 0; i2 < n; i2++) {
      const xv = xs[i2] ?? i2;
      const xp = plotL + (xv - tx.lo) / (tx.hi - tx.lo) * (plotR - plotL);
      const yp = plotB - ((vals[i2] ?? 0) - ty.lo) / (ty.hi - ty.lo) * (plotB - plotT);
      ctx.beginPath();
      ctx.arc(xp, yp, labelPx / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#595959";
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let v = tx.lo; v <= tx.hi + 1e-9; v += tx.step) {
    const xx = plotL + (v - tx.lo) / (tx.hi - tx.lo) * (plotR - plotL);
    ctx.fillText(formatVal(v), xx, plotB + labelPx * 0.35);
  }
  paintValueAxis(ctx, ty, plotL - labelPx * 0.9, plotT, plotB - plotT, labelPx);
}
function paintRadar(ctx, chart, x2, y, w, h, labelPx) {
  const n = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!n) return;
  const { min, max: max2 } = valueRange(chart);
  const t = niceTicks(Math.min(0, min), max2);
  const cx = x2 + w / 2, cy = y + h / 2;
  const radius = Math.min(w, h) / 2 - labelPx * 2.4;
  const angleAt = (i2) => -Math.PI / 2 + i2 * (Math.PI * 2 / n);
  const rAt = (v) => (v - t.lo) / (t.hi - t.lo) * radius;
  ctx.strokeStyle = "#D9D9D9";
  ctx.lineWidth = 1;
  for (let v = t.lo + t.step; v <= t.hi + 1e-9; v += t.step) {
    ctx.beginPath();
    for (let i2 = 0; i2 < n; i2++) {
      const a = angleAt(i2);
      const px = cx + Math.cos(a) * rAt(v);
      const py = cy + Math.sin(a) * rAt(v);
      if (i2 === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = "#595959";
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let v = t.lo; v <= t.hi + 1e-9; v += t.step) {
    ctx.fillText(formatVal(v), cx - labelPx * 0.4, cy - rAt(v));
  }
  for (let i2 = 0; i2 < n; i2++) {
    const a = angleAt(i2);
    const px = cx + Math.cos(a) * (radius + labelPx * 0.9);
    const py = cy + Math.sin(a) * (radius + labelPx * 0.9);
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? "center" : Math.cos(a) > 0 ? "left" : "right";
    ctx.textBaseline = Math.sin(a) < -0.3 ? "bottom" : Math.sin(a) > 0.3 ? "top" : "middle";
    ctx.fillText(chart.categories[i2] ?? String(i2 + 1), px, py);
  }
  const filled = chart.radarStyle === "filled";
  for (let s = 0; s < chart.series.length; s++) {
    const c = colorOf2(chart, s);
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(2, labelPx / 6);
    ctx.beginPath();
    const vals = chart.series[s].values;
    for (let i2 = 0; i2 < n; i2++) {
      const a = angleAt(i2);
      const px = cx + Math.cos(a) * rAt(vals[i2] ?? 0);
      const py = cy + Math.sin(a) * rAt(vals[i2] ?? 0);
      if (i2 === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = c.length === 7 ? c + "40" : c;
      ctx.fill();
    }
    ctx.stroke();
  }
}
function paintGrid(ctx, l, t, r, b, ticks) {
  ctx.strokeStyle = "#D9D9D9";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let v = ticks.lo; v <= ticks.hi + 1e-9; v += ticks.step) {
    const y = b - (v - ticks.lo) / (ticks.hi - ticks.lo) * (b - t);
    ctx.moveTo(l, Math.round(y) + 0.5);
    ctx.lineTo(r, Math.round(y) + 0.5);
  }
  ctx.stroke();
}
function paintCategoryAxis(ctx, cats, l, b, w, labelPx) {
  if (cats.length === 0) return;
  ctx.fillStyle = "#595959";
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const stepX = w / cats.length;
  for (let i2 = 0; i2 < cats.length; i2++) {
    const text = cats[i2] ?? String(i2 + 1);
    ctx.fillText(text, l + stepX * (i2 + 0.5), b + labelPx * 0.8);
  }
}
function paintValueAxis(ctx, ticks, xRight, y, h, labelPx) {
  ctx.fillStyle = "#595959";
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let v = ticks.lo; v <= ticks.hi + 1e-9; v += ticks.step) {
    const yy = y + h - (v - ticks.lo) / (ticks.hi - ticks.lo) * h;
    ctx.fillText(formatVal(v), xRight, yy);
  }
}
function formatVal(v) {
  if (Math.abs(v) >= 1e3) return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (Number.isInteger(v)) return String(v);
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function paintLegend(ctx, chart, x2, y, w, h, labelPx) {
  const pal = paletteOf(chart);
  const byCategory = chart.type === "pie" || chart.type === "doughnut";
  const entries = byCategory ? chart.categories.map((c, i2) => ({ label: c, color: pal[i2 % pal.length] })) : chart.series.map((s, i2) => ({ label: s.name || `S\xE9rie ${i2 + 1}`, color: colorOf2(chart, i2) }));
  if (!entries.length) return;
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  const sq = labelPx * 0.7;
  const gapIn = sq * 0.5, gapOut = labelPx * 1.4;
  let total = 0;
  const widths = entries.map((e) => {
    const tw = ctx.measureText(e.label).width;
    total += sq + gapIn + tw + gapOut;
    return tw;
  });
  total -= gapOut;
  let cx = x2 + Math.max(0, (w - total) / 2);
  const cy = y + h / 2;
  for (let i2 = 0; i2 < entries.length; i2++) {
    const e = entries[i2];
    ctx.fillStyle = e.color;
    ctx.fillRect(cx, cy - sq / 2, sq, sq);
    cx += sq + gapIn;
    ctx.fillStyle = "#595959";
    ctx.textAlign = "left";
    ctx.fillText(e.label, cx, cy);
    cx += widths[i2] + gapOut;
    if (cx > x2 + w) break;
  }
}

// ../slides-core/src/model.ts
var EMU_PER_INCH = 914400;
var EMU_PER_POINT = 12700;
var EMU_PER_PX = EMU_PER_INCH / 96;

// ../slides-core/src/text-layout.ts
var DEF_INS_L = 91440;
var DEF_INS_T = 45720;
var DEF_INS_R = 91440;
var DEF_INS_B = 45720;
var LINE_FACTOR = 1.2;
var BASELINE_FACTOR = 0.8;
function formatAutoNum(scheme, n) {
  const roman = (v) => {
    const table = [[1e3, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    let out = "";
    let x2 = v;
    for (const [val, sym] of table) while (x2 >= val) {
      out += sym;
      x2 -= val;
    }
    return out;
  };
  const alpha = (v) => String.fromCharCode(96 + (v - 1) % 26 + 1);
  switch (scheme) {
    case "alphaLcPeriod":
      return `${alpha(n)}.`;
    case "alphaUcPeriod":
      return `${alpha(n).toUpperCase()}.`;
    case "alphaLcParenR":
      return `${alpha(n)})`;
    case "alphaUcParenR":
      return `${alpha(n).toUpperCase()})`;
    case "romanLcPeriod":
      return `${roman(n)}.`;
    case "romanUcPeriod":
      return `${roman(n).toUpperCase()}.`;
    case "arabicParenR":
      return `${n})`;
    case "arabicPlain":
      return `${n}`;
    case "arabicPeriod":
    default:
      return `${n}.`;
  }
}
function tokenize2(runs) {
  const out = [];
  for (const r of runs) {
    if (r.text === "\n") {
      out.push({ text: "\n", run: r });
      continue;
    }
    const parts = r.text.match(/\S+\s*|\s+/g) ?? [];
    for (const p of parts) out.push({ text: p, run: r });
  }
  return out;
}
function fontOf(r, fontScale, opts) {
  return {
    family: r.font ?? opts.defaultFont,
    sizePt: (r.sz ?? opts.defaultSzPt) * fontScale,
    bold: !!r.bold,
    italic: !!r.italic
  };
}
function layoutTextBody(tb, boxW, boxH, measure, opts = {}) {
  const insL = tb.insL ?? opts.insL ?? DEF_INS_L;
  const insT = tb.insT ?? opts.insT ?? DEF_INS_T;
  const insR = tb.insR ?? opts.insR ?? DEF_INS_R;
  const insB = tb.insB ?? opts.insB ?? DEF_INS_B;
  const defaultSzPt = opts.defaultSzPt ?? 18;
  const defaultFont = opts.defaultFont ?? "Calibri";
  const defaultColor = opts.defaultColor ?? "#000000";
  const fontScale = tb.fontScale ?? 1;
  const lineFactor = LINE_FACTOR * (1 - (tb.lnSpcReduction ?? 0));
  const usableW = Math.max(0, boxW - insL - insR);
  const numCol = Math.max(1, tb.numCol ?? 1);
  const spcCol = tb.spcCol ?? 0;
  const colW = numCol > 1 ? Math.max(0, (usableW - (numCol - 1) * spcCol) / numCol) : usableW;
  const wrap = tb.wrap !== "none";
  const fOpts = { defaultSzPt, defaultFont };
  const measureEmu = (text, f) => measure(text, f) * EMU_PER_POINT;
  const proto = [];
  const heights = [];
  const spacers = [];
  let pendingSpacer = 0;
  const autoNumCounters = Array.from({ length: 9 }, () => 0);
  for (let pi = 0; pi < tb.paragraphs.length; pi++) {
    const p = tb.paragraphs[pi];
    const level = Math.min(p.level ?? 0, 8);
    const marL = p.marL ?? 0;
    const indent = p.indent ?? 0;
    const align = p.align ?? "l";
    const runs = p.runs.length ? p.runs : [{ text: "" }];
    let bullet;
    if (p.bullet) {
      for (let l = level + 1; l < 9; l++) autoNumCounters[l] = 0;
      let btext;
      if (p.bulletAutoNum !== void 0) {
        autoNumCounters[level] = (autoNumCounters[level] ?? 0) + 1;
        btext = formatAutoNum(p.bulletAutoNum, autoNumCounters[level]);
      } else {
        btext = p.bulletChar ?? "\u2022";
      }
      const bFont = fontOf(runs[0], fontScale, fOpts);
      bullet = {
        text: btext,
        // hanging indent: bullet fica em marL+indent (indent tipicamente negativo)
        x: insL + Math.max(0, marL + indent),
        font: bFont,
        color: runs[0].color ?? defaultColor
      };
    }
    const contX = insL + marL;
    const firstX = p.bullet ? contX : insL + Math.max(0, marL + indent);
    const words = tokenize2(runs);
    let cur = { runs: [], marL: firstX, align, bullet, para: pi };
    let curW = 0;
    let firstLineOfPara = true;
    const emptyPt = (runs[0].sz ?? defaultSzPt) * fontScale;
    const paraFactor = p.lineSpacing ?? 1;
    const flush = () => {
      proto.push(cur);
      const maxPt = cur.runs.reduce((a, t) => Math.max(a, (t.run.sz ?? defaultSzPt) * fontScale), cur.runs.length ? 0 : emptyPt);
      heights.push(p.lineSpacingPt !== void 0 ? p.lineSpacingPt * EMU_PER_POINT : maxPt * EMU_PER_POINT * lineFactor * paraFactor);
      spacers.push(firstLineOfPara ? pendingSpacer + (p.spaceBeforePt ?? 0) * EMU_PER_POINT : 0);
      if (firstLineOfPara) pendingSpacer = 0;
      firstLineOfPara = false;
      cur = { runs: [], marL: contX, align, para: pi };
      curW = 0;
    };
    for (const wd of words) {
      if (wd.text === "\n") {
        flush();
        continue;
      }
      const f = fontOf(wd.run, fontScale, fOpts);
      const wEmu = measureEmu(wd.text, f);
      const availW = Math.max(0, colW - (cur.marL - insL));
      if (wrap && cur.runs.length > 0 && curW + measureEmu(wd.text.replace(/\s+$/, ""), f) > availW) flush();
      cur.runs.push({ text: wd.text, run: wd.run });
      curW += wEmu;
    }
    flush();
    if (p.spaceAfterPt !== void 0) pendingSpacer += p.spaceAfterPt * EMU_PER_POINT;
  }
  const totalH = heights.reduce((a, b) => a + b, 0) + spacers.reduce((a, b) => a + b, 0);
  const usableH = Math.max(0, boxH - insT - insB);
  const anchor = tb.anchor ?? opts.defaultAnchor ?? "t";
  let y = insT;
  if (numCol === 1) {
    if (anchor === "ctr") y = insT + (usableH - totalH) / 2;
    else if (anchor === "b") y = insT + usableH - totalH;
  }
  let colIdx = 0;
  const lines = [];
  for (let i2 = 0; i2 < proto.length; i2++) {
    const pl = proto[i2];
    const h = heights[i2];
    y += spacers[i2] ?? 0;
    if (numCol > 1 && colIdx < numCol - 1 && y + h > insT + usableH) {
      colIdx++;
      y = insT;
    }
    const colShift = colIdx * (colW + spcCol);
    const merged = [];
    for (const t of pl.runs) {
      const last = merged[merged.length - 1];
      if (last && last.run === t.run) last.text += t.text;
      else merged.push({ text: t.text, run: t.run });
    }
    if (merged.length) {
      const last = merged[merged.length - 1];
      last.text = last.text.replace(/\s+$/, "");
    }
    const placed = [];
    let w = 0;
    for (const m of merged) {
      const f = fontOf(m.run, fontScale, fOpts);
      const mw = measureEmu(m.text, f);
      const pr = {
        text: m.text,
        x: pl.marL + w,
        w: mw,
        font: f,
        color: m.run.color ?? defaultColor,
        underline: !!m.run.underline
      };
      if (m.run.hyperlink !== void 0) pr.hyperlink = m.run.hyperlink;
      if (m.run.shadow !== void 0) pr.shadow = m.run.shadow;
      placed.push(pr);
      w += mw;
    }
    let dx = 0;
    if (pl.align === "ctr") dx = (colW - (pl.marL - insL) - w) / 2;
    else if (pl.align === "r") dx = colW - (pl.marL - insL) - w;
    if (dx > 0) for (const pr of placed) pr.x += dx;
    if (colShift > 0) {
      for (const pr of placed) pr.x += colShift;
      if (pl.bullet) pl.bullet = { ...pl.bullet, x: pl.bullet.x + colShift };
    }
    const line = { runs: placed, baseline: y + h * BASELINE_FACTOR, height: h, para: pl.para };
    if (pl.bullet) line.bullet = pl.bullet;
    lines.push(line);
    y += h;
  }
  return { lines, totalH };
}

// ../slides-core/src/geometry.ts
function regularPolygon(n, w, h) {
  const pts = [];
  for (let i2 = 0; i2 < n; i2++) {
    const a = -Math.PI / 2 + i2 * 2 * Math.PI / n;
    pts.push({ x: w / 2 + w / 2 * Math.cos(a), y: h / 2 + h / 2 * Math.sin(a) });
  }
  return pts;
}
function fitToBox(pts, w, h) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const sw = maxX - minX || 1, sh = maxY - minY || 1;
  return pts.map((p) => ({ x: (p.x - minX) / sw * w, y: (p.y - minY) / sh * h }));
}
function presetPath(geom, w, h, adj) {
  const ss = Math.min(w, h);
  switch (geom) {
    case "frame": {
      const t = ss * ((adj?.[0] ?? 12500) / 1e5);
      return {
        kind: "path",
        fillRule: "evenodd",
        subs: [
          [{ c: "M", x: 0, y: 0 }, { c: "L", x: w, y: 0 }, { c: "L", x: w, y: h }, { c: "L", x: 0, y: h }, { c: "Z" }],
          [{ c: "M", x: t, y: t }, { c: "L", x: w - t, y: t }, { c: "L", x: w - t, y: h - t }, { c: "L", x: t, y: h - t }, { c: "Z" }]
        ]
      };
    }
    case "ellipse":
      return { kind: "ellipse" };
    case "roundRect":
      return { kind: "roundRect", r: ss * ((adj?.[0] ?? 16667) / 1e5) };
    case "triangle":
      return { kind: "poly", points: [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case "rtTriangle":
      return { kind: "poly", points: [{ x: 0, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case "diamond":
      return { kind: "poly", points: [{ x: w / 2, y: 0 }, { x: w, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h / 2 }] };
    case "parallelogram": {
      const d = ss * ((adj?.[0] ?? 25e3) / 1e5);
      return { kind: "poly", points: [{ x: d, y: 0 }, { x: w, y: 0 }, { x: w - d, y: h }, { x: 0, y: h }] };
    }
    case "trapezoid": {
      const d = ss * ((adj?.[0] ?? 25e3) / 1e5);
      return { kind: "poly", points: [{ x: d, y: 0 }, { x: w - d, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    }
    case "pentagon":
      return { kind: "poly", points: fitToBox(regularPolygon(5, w, h), w, h) };
    case "hexagon": {
      const d = ss * ((adj?.[0] ?? 25e3) / 1e5);
      return {
        kind: "poly",
        points: [
          { x: d, y: 0 },
          { x: w - d, y: 0 },
          { x: w, y: h / 2 },
          { x: w - d, y: h },
          { x: d, y: h },
          { x: 0, y: h / 2 }
        ]
      };
    }
    case "star5": {
      const inner = (adj?.[0] ?? 19098) / 5e4;
      const pts = [];
      for (let i2 = 0; i2 < 10; i2++) {
        const a = -Math.PI / 2 + i2 * Math.PI / 5;
        const fx = i2 % 2 === 0 ? 1 : inner;
        pts.push({ x: w / 2 + w / 2 * fx * Math.cos(a), y: h / 2 + h / 2 * fx * Math.sin(a) });
      }
      return { kind: "poly", points: fitToBox(pts, w, h) };
    }
    // setas em bloco (adj1=50000 → haste com metade da altura; adj2=50000 →
    // cabeça com comprimento ss/2)
    case "rightArrow": {
      const hd = ss * ((adj?.[1] ?? 5e4) / 1e5);
      const t = h * (1 - (adj?.[0] ?? 5e4) / 1e5) / 2;
      return {
        kind: "poly",
        points: [
          { x: 0, y: t },
          { x: w - hd, y: t },
          { x: w - hd, y: 0 },
          { x: w, y: h / 2 },
          { x: w - hd, y: h },
          { x: w - hd, y: h - t },
          { x: 0, y: h - t }
        ]
      };
    }
    case "leftArrow": {
      const hd = ss * ((adj?.[1] ?? 5e4) / 1e5);
      const t = h * (1 - (adj?.[0] ?? 5e4) / 1e5) / 2;
      return {
        kind: "poly",
        points: [
          { x: w, y: t },
          { x: hd, y: t },
          { x: hd, y: 0 },
          { x: 0, y: h / 2 },
          { x: hd, y: h },
          { x: hd, y: h - t },
          { x: w, y: h - t }
        ]
      };
    }
    case "upArrow": {
      const hd = ss * ((adj?.[1] ?? 5e4) / 1e5);
      const t = w * (1 - (adj?.[0] ?? 5e4) / 1e5) / 2;
      return {
        kind: "poly",
        points: [
          { x: t, y: h },
          { x: t, y: hd },
          { x: 0, y: hd },
          { x: w / 2, y: 0 },
          { x: w, y: hd },
          { x: w - t, y: hd },
          { x: w - t, y: h }
        ]
      };
    }
    case "downArrow": {
      const hd = ss * ((adj?.[1] ?? 5e4) / 1e5);
      const t = w * (1 - (adj?.[0] ?? 5e4) / 1e5) / 2;
      return {
        kind: "poly",
        points: [
          { x: t, y: 0 },
          { x: t, y: h - hd },
          { x: 0, y: h - hd },
          { x: w / 2, y: h },
          { x: w, y: h - hd },
          { x: w - t, y: h - hd },
          { x: w - t, y: 0 }
        ]
      };
    }
    case "chevron": {
      const d = ss * ((adj?.[0] ?? 5e4) / 1e5);
      return {
        kind: "poly",
        points: [
          { x: 0, y: 0 },
          { x: w - d, y: 0 },
          { x: w, y: h / 2 },
          { x: w - d, y: h },
          { x: 0, y: h },
          { x: d, y: h / 2 }
        ]
      };
    }
    case "pie":
      return {
        kind: "pie",
        startDeg: (adj?.[0] ?? 0) / 6e4,
        endDeg: (adj?.[1] ?? 162e5) / 6e4
      };
    case "line":
    case "straightConnector1":
      return { kind: "line", x1: 0, y1: 0, x2: w, y2: h };
    case "bentConnector2":
      return { kind: "path", subs: [[{ c: "M", x: 0, y: 0 }, { c: "L", x: w, y: 0 }, { c: "L", x: w, y: h }]] };
    case "bentConnector3":
      return {
        kind: "path",
        subs: [[
          { c: "M", x: 0, y: 0 },
          { c: "L", x: w / 2, y: 0 },
          { c: "L", x: w / 2, y: h },
          { c: "L", x: w, y: h }
        ]]
      };
    case "bentConnector4":
      return {
        kind: "path",
        subs: [[
          { c: "M", x: 0, y: 0 },
          { c: "L", x: w / 2, y: 0 },
          { c: "L", x: w / 2, y: h / 2 },
          { c: "L", x: w, y: h / 2 },
          { c: "L", x: w, y: h }
        ]]
      };
    case "curvedConnector2":
    case "curvedConnector3":
    case "curvedConnector4":
    case "curvedConnector5":
      return {
        kind: "path",
        subs: [[
          { c: "M", x: 0, y: 0 },
          { c: "C", x1: w / 2, y1: 0, x2: w / 2, y2: h, x: w, y: h }
        ]]
      };
    case "arc": {
      return {
        kind: "path",
        subs: [[
          { c: "E", cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, a0: -Math.PI / 2, a1: 0 }
        ]]
      };
    }
    case "blockArc": {
      const t = ss * 0.25;
      return {
        kind: "path",
        subs: [[
          { c: "M", x: 0, y: h / 2 },
          { c: "E", cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, a0: Math.PI, a1: Math.PI * 2 },
          { c: "L", x: w - t, y: h / 2 },
          { c: "E", cx: w / 2, cy: h / 2, rx: w / 2 - t, ry: h / 2 - t, a0: 0, a1: Math.PI, ccw: true },
          { c: "Z" }
        ]]
      };
    }
    case "octagon": {
      const d = ss * 0.29289;
      return {
        kind: "poly",
        points: [
          { x: d, y: 0 },
          { x: w - d, y: 0 },
          { x: w, y: d },
          { x: w, y: h - d },
          { x: w - d, y: h },
          { x: d, y: h },
          { x: 0, y: h - d },
          { x: 0, y: d }
        ]
      };
    }
    case "donut": {
      const t = ss * ((adj?.[0] ?? 25e3) / 1e5);
      return {
        kind: "path",
        fillRule: "evenodd",
        subs: [
          [{ c: "E", cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, a0: 0, a1: Math.PI * 2 }, { c: "Z" }],
          [{ c: "E", cx: w / 2, cy: h / 2, rx: w / 2 - t, ry: h / 2 - t, a0: 0, a1: Math.PI * 2 }, { c: "Z" }]
        ]
      };
    }
    case "moon": {
      const irx = w * 0.5;
      return {
        kind: "path",
        subs: [[
          { c: "M", x: w, y: 0 },
          { c: "E", cx: w, cy: h / 2, rx: w, ry: h / 2, a0: -Math.PI / 2, a1: -Math.PI * 1.5, ccw: true },
          { c: "E", cx: w, cy: h / 2, rx: irx, ry: h * 0.4, a0: Math.PI / 2, a1: -Math.PI / 2, ccw: false },
          { c: "Z" }
        ]]
      };
    }
    case "heart": {
      return {
        kind: "path",
        subs: [[
          { c: "M", x: w / 2, y: h * 0.3 },
          { c: "C", x1: w * 0.5, y1: h * 0.12, x2: w * 0.38, y2: h * 0.01, x: w * 0.26, y: h * 0.01 },
          { c: "C", x1: w * 0.1, y1: h * 0.01, x2: 0, y2: h * 0.14, x: 0, y: h * 0.31 },
          { c: "C", x1: 0, y1: h * 0.51, x2: w * 0.18, y2: h * 0.66, x: w / 2, y: h },
          { c: "C", x1: w * 0.82, y1: h * 0.66, x2: w, y2: h * 0.51, x: w, y: h * 0.31 },
          { c: "C", x1: w, y1: h * 0.14, x2: w * 0.9, y2: h * 0.01, x: w * 0.74, y: h * 0.01 },
          { c: "C", x1: w * 0.62, y1: h * 0.01, x2: w * 0.5, y2: h * 0.12, x: w / 2, y: h * 0.3 },
          { c: "Z" }
        ]]
      };
    }
    case "lightningBolt": {
      const u = (px, py) => ({ x: px / 21600 * w, y: py / 21600 * h });
      const pts = [
        u(8472, 0),
        u(12860, 6080),
        u(11050, 6797),
        u(16577, 12007),
        u(14767, 12877),
        u(21600, 21600),
        u(10800, 14915),
        u(12482, 14072),
        u(7602, 8382),
        u(9722, 7292),
        u(0, 3890)
      ];
      return { kind: "poly", points: pts };
    }
    case "sun": {
      const cx = w / 2, cy = h / 2;
      const rx = w * 0.28, ry = h * 0.28;
      const brx = w * 0.32, bry = h * 0.32;
      const subs = [
        [{ c: "E", cx, cy, rx, ry, a0: 0, a1: Math.PI * 2 }, { c: "Z" }]
      ];
      for (let i2 = 0; i2 < 8; i2++) {
        const a = i2 * Math.PI / 4;
        const spread = 0.35;
        subs.push([
          { c: "M", x: cx + Math.cos(a) * (w / 2), y: cy + Math.sin(a) * (h / 2) },
          { c: "L", x: cx + Math.cos(a + spread) * brx, y: cy + Math.sin(a + spread) * bry },
          { c: "L", x: cx + Math.cos(a - spread) * brx, y: cy + Math.sin(a - spread) * bry },
          { c: "Z" }
        ]);
      }
      return { kind: "path", subs };
    }
    case "can": {
      const ry = ss * 0.125;
      return {
        kind: "path",
        subs: [
          [
            // corpo: laterais + fundo arqueado + topo arqueado (contorno completo)
            { c: "M", x: 0, y: ry },
            { c: "L", x: 0, y: h - ry },
            { c: "E", cx: w / 2, cy: h - ry, rx: w / 2, ry, a0: Math.PI, a1: 0, ccw: true },
            { c: "L", x: w, y: ry },
            { c: "E", cx: w / 2, cy: ry, rx: w / 2, ry, a0: 0, a1: Math.PI, ccw: true },
            { c: "Z" }
          ],
          [
            // tampa (elipse completa — o stroke marca a boca do cilindro)
            { c: "E", cx: w / 2, cy: ry, rx: w / 2, ry, a0: 0, a1: Math.PI * 2 },
            { c: "Z" }
          ]
        ],
        subLum: [0, 0.18]
      };
    }
    case "cube": {
      const d = ss * 0.25;
      return {
        kind: "path",
        subs: [
          [
            // face frontal
            { c: "M", x: 0, y: d },
            { c: "L", x: w - d, y: d },
            { c: "L", x: w - d, y: h },
            { c: "L", x: 0, y: h },
            { c: "Z" }
          ],
          [
            // face superior (mais clara)
            { c: "M", x: 0, y: d },
            { c: "L", x: d, y: 0 },
            { c: "L", x: w, y: 0 },
            { c: "L", x: w - d, y: d },
            { c: "Z" }
          ],
          [
            // face lateral direita (mais escura)
            { c: "M", x: w - d, y: d },
            { c: "L", x: w, y: 0 },
            { c: "L", x: w, y: h - d },
            { c: "L", x: w - d, y: h },
            { c: "Z" }
          ]
        ],
        subLum: [0, 0.15, -0.15]
      };
    }
    default:
      if (geom?.startsWith("actionButton")) {
        const cx = w / 2, cy = h / 2, g = Math.min(w, h) * 0.3;
        const glyph = actionGlyph(geom, cx, cy, g);
        const lums = glyph.map((_, i2) => geom === "actionButtonDocument" && i2 === 1 ? 0 : -0.25);
        return {
          kind: "path",
          subs: [
            [{ c: "M", x: 0, y: 0 }, { c: "L", x: w, y: 0 }, { c: "L", x: w, y: h }, { c: "L", x: 0, y: h }, { c: "Z" }],
            ...glyph
          ],
          subLum: [0, ...lums]
        };
      }
      return { kind: "rect" };
  }
}
function actionGlyph(geom, cx, cy, g) {
  const tri = (dir) => [
    { c: "M", x: cx + dir * g, y: cy },
    { c: "L", x: cx - dir * g, y: cy - g },
    { c: "L", x: cx - dir * g, y: cy + g },
    { c: "Z" }
  ];
  const bar = (x2) => [
    { c: "M", x: x2 - g * 0.18, y: cy - g },
    { c: "L", x: x2 + g * 0.18, y: cy - g },
    { c: "L", x: x2 + g * 0.18, y: cy + g },
    { c: "L", x: x2 - g * 0.18, y: cy + g },
    { c: "Z" }
  ];
  switch (geom) {
    case "actionButtonForwardNext":
      return [tri(1)];
    case "actionButtonBackPrevious":
      return [tri(-1)];
    case "actionButtonBeginning":
      return [bar(cx - g), tri(-1)];
    case "actionButtonEnd":
      return [tri(1), bar(cx + g)];
    case "actionButtonReturn":
      return [[
        { c: "M", x: cx - g * 0.15, y: cy - g },
        // ponta da seta (esq)
        { c: "L", x: cx + g * 0.45, y: cy - g * 0.35 },
        { c: "L", x: cx + g * 0.1, y: cy - g * 0.35 },
        { c: "C", x1: cx + g * 0.1, y1: cy + g * 0.35, x2: cx - g * 0.1, y2: cy + g * 0.55, x: cx - g * 0.35, y: cy + g * 0.55 },
        { c: "L", x: cx - g, y: cy + g * 0.55 },
        { c: "L", x: cx - g, y: cy + g },
        { c: "L", x: cx - g * 0.35, y: cy + g },
        { c: "C", x1: cx + g * 0.35, y1: cy + g, x2: cx + g * 0.55, y2: cy + g * 0.4, x: cx + g * 0.55, y: cy - g * 0.35 },
        { c: "L", x: cx + g * 0.75, y: cy - g * 0.35 },
        { c: "Z" }
      ]];
    case "actionButtonDocument": {
      return [
        [
          { c: "M", x: cx - g * 0.7, y: cy - g },
          { c: "L", x: cx + g * 0.25, y: cy - g },
          { c: "L", x: cx + g * 0.7, y: cy - g * 0.55 },
          { c: "L", x: cx + g * 0.7, y: cy + g },
          { c: "L", x: cx - g * 0.7, y: cy + g },
          { c: "Z" }
        ],
        [
          // dobra do canto (recorte)
          { c: "M", x: cx + g * 0.25, y: cy - g },
          { c: "L", x: cx + g * 0.25, y: cy - g * 0.55 },
          { c: "L", x: cx + g * 0.7, y: cy - g * 0.55 },
          { c: "Z" }
        ]
      ];
    }
    default:
      return [tri(1)];
  }
}

// ../slides-core/src/fonts.ts
var VARIANT_TAGS = [
  ["p:regular", "regular"],
  ["p:bold", "bold"],
  ["p:italic", "italic"],
  ["p:boldItalic", "boldItalic"]
];
function looksLikeSfnt(d) {
  if (d.length < 4) return false;
  const m = d[0] << 24 | d[1] << 16 | d[2] << 8 | d[3];
  return m === 65536 || m === 1330926671 || m === 1953658213 || m === 1953784678;
}
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
  const xml = pkg.getPartText("ppt/presentation.xml");
  if (!xml) return [];
  const root = parseXml(xml);
  const lst = firstChild(root, "p:embeddedFontLst");
  if (!lst) return [];
  const rels = readRels(pkg, "ppt/_rels/presentation.xml.rels", "ppt/presentation.xml");
  const out = [];
  for (const ef of childElements(lst, "p:embeddedFont")) {
    const fontEl = firstChild(ef, "p:font");
    const family = fontEl?.attrs["typeface"];
    if (!family) continue;
    for (const [tag, variant] of VARIANT_TAGS) {
      const v = firstChild(ef, tag);
      const rid = v?.attrs["r:id"];
      if (!rid) continue;
      const target = rels.get(rid);
      if (!target) continue;
      const raw = pkg.getPart(target);
      if (!raw) continue;
      let data = raw;
      if (!looksLikeSfnt(data)) {
        const key = v?.attrs["fontKey"] ?? v?.attrs["p:fontKey"];
        if (key) data = deobfuscateFont(raw, key);
        if (!looksLikeSfnt(data)) continue;
      }
      out.push({ family, variant, data });
    }
  }
  return out;
}
function collectDeckTypefaces(pkg) {
  const out = /* @__PURE__ */ new Set();
  for (const part of pkg.partNames()) {
    if (!/^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(part)) continue;
    const xml = pkg.getPartText(part);
    if (!xml) continue;
    for (const m of xml.matchAll(/typeface="([^"+][^"]*)"/g)) out.add(m[1]);
  }
  return [...out].sort();
}

// ../slides-core/src/media.ts
function mediaCommands(effects, spid) {
  const out = [];
  const walk = (n, t) => {
    if (n.tag === "cmd") {
      if (n.cmd && n.target?.spid === spid) {
        const c = { atMs: t, cmd: n.cmd };
        if (n.dur !== void 0 && Number.isFinite(n.dur)) c.durMs = n.dur;
        out.push(c);
      }
      return;
    }
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b !== null) walk(c, t + b);
    }
  };
  for (const e of effects) walk(e.node, e.t0);
  return out.sort((a, b) => a.atMs - b.atMs);
}
function mediaStateAt(effects, spid, animMs, clock = {}) {
  const k = clock.scale ?? 1, lat = clock.latencyMs ?? 0;
  let started = false, playing = false, pos = 0, since = 0;
  let durMs, startAt = 0;
  for (const c of mediaCommands(effects, spid)) {
    if (c.atMs > animMs) break;
    const m = /^playFrom\(\s*(-?[\d.]+)\s*\)$/.exec(c.cmd);
    if (m) {
      started = true;
      playing = true;
      pos = Math.max(0, parseFloat(m[1]));
      since = c.atMs + lat;
      startAt = c.atMs;
      if (c.durMs !== void 0) durMs = c.durMs;
      continue;
    }
    switch (c.cmd) {
      case "pause":
        if (playing) {
          pos += Math.max(0, c.atMs - since) * k / 1e3;
          playing = false;
        }
        break;
      case "resume":
        if (started && !playing) {
          playing = true;
          since = c.atMs + lat;
        }
        break;
      case "togglePause":
        if (playing) {
          pos += Math.max(0, c.atMs - since) * k / 1e3;
          playing = false;
        } else if (started) {
          playing = true;
          since = c.atMs + lat;
        }
        break;
      case "stop":
        started = false;
        playing = false;
        pos = 0;
        break;
      default:
        break;
    }
  }
  let timeSec = playing ? pos + Math.max(0, animMs - since) * k / 1e3 : pos;
  if (playing && durMs !== void 0 && (animMs - startAt) * k >= durMs) {
    playing = false;
    timeSec = Math.min(timeSec, pos + (durMs - lat * k) / 1e3);
  }
  const st = { started, playing, timeSec };
  if (durMs !== void 0) st.durMs = durMs;
  return st;
}
function gifFrameAt(delaysMs, elapsedMs, repeat = Infinity) {
  const n = delaysMs.length;
  if (n <= 1 || !(elapsedMs > 0)) return 0;
  const d = delaysMs.map((x2) => x2 > 10 ? x2 : 100);
  const total = d.reduce((a, b) => a + b, 0);
  const round = Math.floor(elapsedMs / total);
  if (round > repeat) return n - 1;
  let t = elapsedMs - round * total;
  for (let i2 = 0; i2 < n; i2++) {
    if (t < d[i2]) return i2;
    t -= d[i2];
  }
  return n - 1;
}

// ../slides-core/src/render.ts
var DEFAULT_TITLE_PT = 40;
var DEFAULT_BODY_PT = 18;
function boxBase(x2, y, w, h, m, extra) {
  return { x: (x2 + w / 2 - m.ox) / m.sw, y: (y + h / 2 - m.oy) / m.sh, w: w / m.sw, h: h / m.sh, ...extra };
}
function applyPart(ctx, st, base, x2, y, w, h, m, baseRotRad = 0) {
  if (!st.visible || st.opacity <= 0) return false;
  const kx = (base.w > 0 ? st.w / base.w : 1) * st.sx;
  const ky = (base.h > 0 ? st.h / base.h : 1) * st.sy;
  if (!Number.isFinite(kx) || !Number.isFinite(ky) || Math.abs(kx) < 1e-4 || Math.abs(ky) < 1e-4) return false;
  ctx.globalAlpha = ctx.globalAlpha * st.opacity;
  const bcx = x2 + w / 2, bcy = y + h / 2;
  const ncx = m.ox + (st.x + st.mx) * m.sw, ncy = m.oy + (st.y + st.my) * m.sh;
  if (Math.abs(ncx - bcx) > 1e-3 || Math.abs(ncy - bcy) > 1e-3 || st.rot || Math.abs(kx - 1) > 1e-6 || Math.abs(ky - 1) > 1e-6) {
    ctx.translate(ncx, ncy);
    if (st.rot) ctx.rotate(st.rot * Math.PI / 180);
    if (baseRotRad && (kx !== 1 || ky !== 1)) {
      ctx.rotate(baseRotRad);
      ctx.scale(kx, ky);
      ctx.rotate(-baseRotRad);
    } else ctx.scale(kx, ky);
    ctx.translate(-bcx, -bcy);
  }
  for (const f of st.filters) {
    const q = f.transition === "out" ? 1 - f.p : f.p;
    ctx.globalAlpha = ctx.globalAlpha * applyReveal(ctx, f.filter, q, x2, y, w, h);
    if (ctx.globalAlpha <= 0) return false;
  }
  return true;
}
function firstRunColor(sh) {
  for (const p of sh.txBody?.paragraphs ?? []) for (const r of p.runs) if (r.color) return r.color;
  return void 0;
}
function paintSlideTo(ctx, slide, resources, scale, opts = {}) {
  const ox = opts.ox ?? 0;
  const oy = opts.oy ?? 0;
  const sw = resources.slideW * scale;
  const sh = resources.slideH * scale;
  const fit = { ox, oy, scale };
  if (slide.bg?.type === "gradient" && slide.bg.stops && slide.bg.stops.length >= 2) {
    ctx.fillStyle = makeLinearGradient(ctx, slide.bg, ox, oy, sw, sh);
  } else {
    ctx.fillStyle = slide.bg?.color ?? "#ffffff";
  }
  ctx.fillRect(ox, oy, sw, sh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, sw, sh);
  ctx.clip();
  if (slide.bgImage) {
    const bg = resources.images?.get(slide.bgImage.part);
    if (bg) ctx.drawImage(bg, ox, oy, sw, sh);
  }
  const m = { ox, oy, sw, sh };
  for (let i2 = 0; i2 < slide.shapes.length; i2++) {
    const shp = slide.shapes[i2];
    const op = opts.shapeOpacity ? opts.shapeOpacity(shp, i2) : 1;
    if (op <= 0) continue;
    const hooks = opts.shapeAnim && shp.xfrm ? opts.shapeAnim(shp, i2) : null;
    ctx.save();
    if (op < 1) ctx.globalAlpha = ctx.globalAlpha * op;
    let anim;
    if (hooks && shp.xfrm) {
      const x2 = ox + shp.xfrm.x * scale, y = oy + shp.xfrm.y * scale;
      const w = shp.xfrm.cx * scale, h = shp.xfrm.cy * scale;
      const rotDeg = (shp.xfrm.rot ?? 0) / 6e4;
      const base = boxBase(x2, y, w, h, m, { rot: rotDeg, fill: shp.fill?.color, line: shp.lineColor, text: firstRunColor(shp) });
      const all = hooks.all(base);
      if (!applyPart(ctx, all, base, x2, y, w, h, m, rotDeg * Math.PI / 180)) {
        ctx.restore();
        continue;
      }
      anim = { hooks, all, base, m };
    }
    paintShape(ctx, shp, fit, resources, opts.suppressTextShapeIdx === i2, anim, opts.mediaFrame?.(shp, i2) ?? void 0);
    ctx.restore();
  }
  ctx.restore();
}
function imgW(img) {
  const vw = img.videoWidth;
  if (typeof vw === "number" && vw > 0) return vw;
  return typeof img.naturalWidth === "number" && img.naturalWidth > 0 ? img.naturalWidth : typeof img.width === "number" ? img.width : 0;
}
function imgH(img) {
  const vh = img.videoHeight;
  if (typeof vh === "number" && vh > 0) return vh;
  return typeof img.naturalHeight === "number" && img.naturalHeight > 0 ? img.naturalHeight : typeof img.height === "number" ? img.height : 0;
}
function paintShape(ctx, sh, fit, res, suppressText, anim, frame) {
  if (!sh.xfrm) {
    if (sh.txBody && !suppressText) paintText(ctx, sh, sh.txBody, fit.ox + 40, fit.oy + 40, 400, 200, fit.scale);
    return;
  }
  const x2 = fit.ox + sh.xfrm.x * fit.scale;
  const y = fit.oy + sh.xfrm.y * fit.scale;
  const w = sh.xfrm.cx * fit.scale;
  const h = sh.xfrm.cy * fit.scale;
  const hasXform = sh.xfrm.rot || sh.xfrm.flipH || sh.xfrm.flipV;
  const hasAlpha = sh.alpha !== void 0 && sh.alpha < 1;
  if (hasXform || hasAlpha) {
    ctx.save();
    if (hasAlpha) ctx.globalAlpha = ctx.globalAlpha * sh.alpha;
    if (hasXform) {
      const cx = x2 + w / 2, cy = y + h / 2;
      ctx.translate(cx, cy);
      if (sh.xfrm.rot) ctx.rotate(sh.xfrm.rot / 6e4 * Math.PI / 180);
      if (sh.xfrm.flipH) ctx.scale(-1, 1);
      if (sh.xfrm.flipV) ctx.scale(1, -1);
      ctx.translate(-cx, -cy);
    }
  }
  const bgSt = anim?.hooks.bg ? anim.hooks.bg(anim.base) : void 0;
  const ov = {};
  const fillOv = bgSt?.fillColor ?? anim?.all.fillColor;
  const lineOv = bgSt?.lineColor ?? anim?.all.lineColor;
  if (fillOv) ov.fill = fillOv;
  if (lineOv) ov.line = lineOv;
  if (frame) ov.frame = frame;
  ctx.save();
  const bodyOn = !bgSt || applyPart(ctx, bgSt, anim.base, x2, y, w, h, anim.m);
  const hostsText = bodyOn ? paintBody(ctx, sh, x2, y, w, h, fit, res, ov) : !(sh.chartXml || sh.table || sh.image);
  ctx.restore();
  if (hostsText && sh.txBody && !suppressText) paintText(ctx, sh, sh.txBody, x2, y, w, h, fit.scale, anim);
  if (hasXform || hasAlpha) ctx.restore();
}
function paintBody(ctx, sh, x2, y, w, h, fit, res, ov) {
  if (sh.chartXml) {
    let model = res.charts?.get(sh.chartXml);
    if (!model) {
      model = parseChart(sh.chartXml);
      res.charts?.set(sh.chartXml, model);
    }
    if (!model.palette && sh.chartPalette) model.palette = sh.chartPalette;
    paintChart(ctx, model, x2, y, w, h, EMU_PER_POINT * fit.scale);
    return false;
  }
  if (sh.table) {
    const natW = sh.table.colWidthsEmu.reduce((a, b) => a + b, 0);
    const natH = sh.table.rows.reduce((a, r) => a + r.heightEmu, 0);
    const tw = natW > 0 ? natW * fit.scale : w;
    const th = natH > 0 ? natH * fit.scale : h;
    paintTable(ctx, sh.table, x2, y, tw, th, fit.scale);
    return false;
  }
  if (sh.image) {
    const img = ov.frame ?? res.images?.get(sh.image.part);
    if (img) {
      if (sh.shadow) {
        const sc = sh.shadow;
        const n = parseInt(sc.color.replace("#", ""), 16);
        ctx.save();
        ctx.shadowColor = `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${sc.alpha})`;
        ctx.shadowBlur = sc.blurRad * fit.scale;
        ctx.shadowOffsetX = sc.dist * Math.cos(sc.dirDeg * Math.PI / 180) * fit.scale;
        ctx.shadowOffsetY = sc.dist * Math.sin(sc.dirDeg * Math.PI / 180) * fit.scale;
      }
      const clipGeom = sh.geom !== void 0 && sh.geom !== "rect";
      if (clipGeom) {
        ctx.save();
        const rule = shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom, sh.adj);
        if (rule) ctx.clip(rule);
        else ctx.clip();
      }
      if (sh.srcRect) {
        const iw = imgW(img), ih = imgH(img);
        const sx = sh.srcRect.l * iw;
        const sy = sh.srcRect.t * ih;
        const sw = iw - (sh.srcRect.l + sh.srcRect.r) * iw;
        const sh2 = ih - (sh.srcRect.t + sh.srcRect.b) * ih;
        ctx.drawImage(img, sx, sy, sw, sh2, x2, y, w, h);
      } else {
        ctx.drawImage(img, x2, y, w, h);
      }
      if (clipGeom) ctx.restore();
      if (sh.shadow) ctx.restore();
    }
    if (sh.lineColor) {
      ctx.strokeStyle = sh.lineColor;
      ctx.lineWidth = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
      shapePath(ctx, sh.geom ?? "rect", x2, y, w, h, sh.custGeom, sh.adj);
      ctx.stroke();
    }
    return false;
  }
  const hasVisibleFill = sh.fill !== void 0 && sh.fill.type !== "none";
  if (sh.shadow && hasVisibleFill) {
    const sx = sh.shadow.dist * Math.cos(sh.shadow.dirDeg * Math.PI / 180) / 9525 * fit.scale;
    const sy = sh.shadow.dist * Math.sin(sh.shadow.dirDeg * Math.PI / 180) / 9525 * fit.scale;
    ctx.save();
    const hex2 = sh.shadow.color.replace("#", "");
    const r = parseInt(hex2.slice(0, 2), 16) || 0;
    const g = parseInt(hex2.slice(2, 4), 16) || 0;
    const b = parseInt(hex2.slice(4, 6), 16) || 0;
    ctx.shadowColor = `rgba(${r},${g},${b},${sh.shadow.alpha})`;
    ctx.shadowBlur = sh.shadow.blurRad / 9525 * fit.scale;
    ctx.shadowOffsetX = sx;
    ctx.shadowOffsetY = sy;
    ctx.fillStyle = ov.fill ?? (sh.fill?.type === "solid" && sh.fill.color ? sh.fill.color : "#ffffff");
    const shRule = shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom, sh.adj);
    if (shRule) ctx.fill(shRule);
    else ctx.fill();
    ctx.restore();
  }
  const isLineGeom = sh.geom === "line" || sh.geom === "arc" || /^(straight|bent|curved)Connector\d?$/.test(sh.geom ?? "");
  if (!isLineGeom && (ov.fill || sh.fillImage || sh.fill && sh.fill.type !== "none")) {
    ctx.save();
    if (sh.fillAlpha !== void 0 && sh.fillAlpha < 1) ctx.globalAlpha = ctx.globalAlpha * sh.fillAlpha;
    const rule = shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom, sh.adj);
    if (ov.fill) {
      ctx.fillStyle = ov.fill;
      if (rule) ctx.fill(rule);
      else ctx.fill();
    } else if (sh.fillImage) {
      const img = res.images?.get(sh.fillImage.part);
      if (img && sh.fillTile) {
        const pat = ctx.createPattern(img, "repeat");
        if (pat) {
          const k = 9525 * fit.scale;
          if (typeof pat.setTransform === "function" && typeof DOMMatrix !== "undefined") {
            pat.setTransform(new DOMMatrix([k, 0, 0, k, x2, y]));
          }
          ctx.fillStyle = pat;
          if (rule) ctx.fill(rule);
          else ctx.fill();
        }
      } else if (img) {
        ctx.clip();
        ctx.drawImage(img, x2, y, w, h);
      }
    } else if (sh.fill.type === "gradient" && sh.fill.stops && sh.fill.stops.length >= 2) {
      ctx.fillStyle = makeLinearGradient(ctx, sh.fill, x2, y, w, h);
      if (rule) ctx.fill(rule);
      else ctx.fill();
    } else if (sh.fill.type === "solid" && sh.fill.color) {
      const desc = sh.custGeom ? null : presetPath(sh.geom, w, h, sh.adj);
      if (desc && desc.kind === "path" && desc.subLum) {
        for (let i2 = 0; i2 < desc.subs.length; i2++) {
          const lum = desc.subLum[i2];
          if (lum === null || lum === void 0) continue;
          ctx.beginPath();
          drawSegs(ctx, [desc.subs[i2]], x2, y, 1, 1);
          ctx.fillStyle = lum === 0 ? sh.fill.color : lumHsl(sh.fill.color, 1, lum);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = sh.fill.color;
        if (rule) ctx.fill(rule);
        else ctx.fill();
      }
    }
    ctx.restore();
  }
  const lineColor = ov.line ?? sh.lineColor;
  if (lineColor) {
    ctx.strokeStyle = lineColor;
    const lw = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
    ctx.lineWidth = lw;
    if (sh.lineDash) ctx.setLineDash(dashPattern(sh.lineDash, lw));
    shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom, sh.adj);
    ctx.stroke();
    if (sh.lineDash) ctx.setLineDash([]);
    if (isLineGeom && (sh.headArrow || sh.tailArrow)) {
      const ends = lineEndpoints(sh.geom, x2, y, w, h);
      if (ends) {
        ctx.fillStyle = lineColor;
        if (sh.headArrow) paintArrowhead(ctx, sh.headArrow, ends.hx, ends.hy, ends.hAng, lw);
        if (sh.tailArrow) paintArrowhead(ctx, sh.tailArrow, ends.tx, ends.ty, ends.tAng, lw);
      }
    }
  }
  return true;
}
function shapePath(ctx, geom, x2, y, w, h, custGeom, adj) {
  ctx.beginPath();
  if (custGeom) {
    const sx = w / custGeom.w, sy = h / custGeom.h;
    drawSegs(ctx, custGeom.subs, x2, y, sx, sy);
    return void 0;
  }
  const p = presetPath(geom, w, h, adj);
  switch (p.kind) {
    case "path": {
      drawSegs(ctx, p.subs, x2, y, 1, 1);
      return p.fillRule;
    }
    case "ellipse":
      ctx.ellipse(x2 + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case "roundRect":
      roundRect(ctx, x2, y, w, h, p.r);
      break;
    case "poly": {
      const pts = p.points;
      if (pts.length) {
        ctx.moveTo(x2 + pts[0].x, y + pts[0].y);
        for (let i2 = 1; i2 < pts.length; i2++) ctx.lineTo(x2 + pts[i2].x, y + pts[i2].y);
        ctx.closePath();
      }
      break;
    }
    case "line":
      ctx.moveTo(x2 + p.x1, y + p.y1);
      ctx.lineTo(x2 + p.x2, y + p.y2);
      break;
    case "pie": {
      const cx = x2 + w / 2, cy = y + h / 2;
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, p.startDeg * Math.PI / 180, p.endDeg * Math.PI / 180);
      ctx.closePath();
      break;
    }
    default:
      ctx.rect(x2, y, w, h);
  }
  return void 0;
}
function lineEndpoints(geom, x2, y, w, h) {
  switch (geom) {
    case "line":
    case "straightConnector1": {
      const a = Math.atan2(h, w);
      return { hx: x2, hy: y, hAng: a + Math.PI, tx: x2 + w, ty: y + h, tAng: a };
    }
    case "bentConnector2":
      return { hx: x2, hy: y, hAng: Math.PI, tx: x2 + w, ty: y + h, tAng: Math.PI / 2 };
    case "bentConnector3":
      return { hx: x2, hy: y, hAng: Math.PI, tx: x2 + w, ty: y + h, tAng: 0 };
    case "bentConnector4":
      return { hx: x2, hy: y, hAng: Math.PI, tx: x2 + w, ty: y + h, tAng: Math.PI / 2 };
    case "curvedConnector2":
    case "curvedConnector3":
    case "curvedConnector4":
    case "curvedConnector5":
      return { hx: x2, hy: y, hAng: Math.PI, tx: x2 + w, ty: y + h, tAng: 0 };
    default:
      return null;
  }
}
function paintArrowhead(ctx, type, px, py, ang, lw) {
  const L = lw * 3.5 + 2;
  const W = lw * 1.6 + 1;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.beginPath();
  switch (type) {
    case "stealth":
      ctx.moveTo(0, 0);
      ctx.lineTo(-L, W);
      ctx.lineTo(-L * 0.6, 0);
      ctx.lineTo(-L, -W);
      ctx.closePath();
      ctx.fill();
      break;
    case "arrow":
      ctx.moveTo(-L, W);
      ctx.lineTo(0, 0);
      ctx.lineTo(-L, -W);
      ctx.stroke();
      break;
    case "diamond":
      ctx.moveTo(L * 0.5, 0);
      ctx.lineTo(0, W);
      ctx.lineTo(-L * 0.5, 0);
      ctx.lineTo(0, -W);
      ctx.closePath();
      ctx.fill();
      break;
    case "oval":
      ctx.ellipse(0, 0, lw * 1.9 + 1, lw * 1.9 + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.moveTo(0, 0);
      ctx.lineTo(-L, W);
      ctx.lineTo(-L, -W);
      ctx.closePath();
      ctx.fill();
  }
  ctx.restore();
}
function drawSegs(ctx, subs, x2, y, sx, sy) {
  for (const sub of subs) {
    for (const s of sub) {
      if (s.c === "M") ctx.moveTo(x2 + s.x * sx, y + s.y * sy);
      else if (s.c === "L") ctx.lineTo(x2 + s.x * sx, y + s.y * sy);
      else if (s.c === "C") ctx.bezierCurveTo(x2 + s.x1 * sx, y + s.y1 * sy, x2 + s.x2 * sx, y + s.y2 * sy, x2 + s.x * sx, y + s.y * sy);
      else if (s.c === "Q") ctx.quadraticCurveTo(x2 + s.x1 * sx, y + s.y1 * sy, x2 + s.x * sx, y + s.y * sy);
      else if (s.c === "E") ctx.ellipse(x2 + s.cx * sx, y + s.cy * sy, s.rx * sx, s.ry * sy, 0, s.a0, s.a1, s.ccw ?? false);
      else ctx.closePath();
    }
  }
}
function roundRect(ctx, x2, y, w, h, r) {
  ctx.moveTo(x2 + r, y);
  ctx.arcTo(x2 + w, y, x2 + w, y + h, r);
  ctx.arcTo(x2 + w, y + h, x2, y + h, r);
  ctx.arcTo(x2, y + h, x2, y, r);
  ctx.arcTo(x2, y, x2 + w, y, r);
  ctx.closePath();
}
function paintText(ctx, sh, tb, x2, y, w, h, scale, anim) {
  const unflip = sh.xfrm?.flipH || sh.xfrm?.flipV;
  if (unflip) {
    ctx.save();
    const cx = x2 + w / 2, cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.scale(sh.xfrm.flipH ? -1 : 1, sh.xfrm.flipV ? -1 : 1);
    ctx.translate(-cx, -cy);
  }
  const all = anim?.all;
  const fsc = all?.fontScale !== void 0 && all.fontScale !== 1 ? all.fontScale : 1;
  const body = fsc !== 1 ? { ...tb, fontScale: (tb.fontScale ?? 1) * fsc } : tb;
  const isTitle = sh.phType === "title" || sh.phType === "ctrTitle";
  const measure = (text, f) => {
    ctx.font = layoutFontStr(f, 1);
    return ctx.measureText(text).width;
  };
  const layout = layoutTextBody(body, w / scale, h / scale, measure, {
    defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT,
    defaultAnchor: isTitle ? "ctr" : "t"
  });
  const pxPerPt = EMU_PER_POINT * scale;
  const fontOf2 = (f, st) => {
    const wgt = st?.fontWeight ?? all?.fontWeight, sty = st?.fontStyle ?? all?.fontStyle, fam = st?.fontFamily ?? all?.fontFamily;
    if (!wgt && !sty && !fam) return f;
    return { ...f, bold: wgt ? wgt === "bold" : f.bold, italic: sty ? sty === "italic" : f.italic, family: fam ?? f.family };
  };
  const colorOf3 = (c, st) => st?.textColor ?? all?.textColor ?? c;
  const underOf = (u, st) => st?.underline ?? all?.underline ?? u;
  const drawText = (text, r, tx, by, st) => {
    const f = fontOf2(r.font, st);
    ctx.font = layoutFontStr(f, pxPerPt);
    const color = colorOf3(r.color, st);
    ctx.fillStyle = color;
    const effShadow = r.shadow ?? sh.shadow;
    if (effShadow) {
      const sc = effShadow;
      const n = parseInt(sc.color.replace("#", ""), 16);
      ctx.save();
      ctx.shadowColor = `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${sc.alpha})`;
      ctx.shadowBlur = sc.blurRad * scale;
      ctx.shadowOffsetX = sc.dist * Math.cos(sc.dirDeg * Math.PI / 180) * scale;
      ctx.shadowOffsetY = sc.dist * Math.sin(sc.dirDeg * Math.PI / 180) * scale;
      ctx.fillText(text, tx, by);
      ctx.restore();
    } else {
      ctx.fillText(text, tx, by);
    }
    if (underOf(r.underline, st)) {
      const sizePx = f.sizePt * pxPerPt;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, sizePx / 16);
      const uy = Math.round(by + sizePx * 0.12) + 0.5;
      const tw = text === r.text ? r.w * scale : ctx.measureText(text).width;
      ctx.beginPath();
      ctx.moveTo(tx, uy);
      ctx.lineTo(tx + tw, uy);
      ctx.stroke();
    }
  };
  const paraHook = anim?.hooks.para;
  const unitHook = anim?.hooks.unit;
  const pbox = /* @__PURE__ */ new Map();
  const pcolor = /* @__PURE__ */ new Map();
  if (paraHook) {
    for (const line of layout.lines) {
      if (!pcolor.has(line.para) && line.runs[0]) pcolor.set(line.para, line.runs[0].color);
      let x0 = Infinity, x1 = -Infinity;
      for (const r of line.runs) {
        x0 = Math.min(x0, x2 + r.x * scale);
        x1 = Math.max(x1, x2 + (r.x + r.w) * scale);
      }
      if (line.bullet) x0 = Math.min(x0, x2 + line.bullet.x * scale);
      if (!Number.isFinite(x0)) continue;
      const top = y + (line.baseline - line.height * 0.8) * scale, bot = y + (line.baseline + line.height * 0.2) * scale;
      const b = pbox.get(line.para);
      pbox.set(line.para, b ? [Math.min(b[0], x0), Math.min(b[1], top), Math.max(b[2], x1), Math.max(b[3], bot)] : [x0, top, x1, bot]);
    }
  }
  const paraSt = /* @__PURE__ */ new Map();
  const stOfPara = (pi) => {
    if (!paraHook || !anim) return null;
    if (!paraSt.has(pi)) {
      const b = pbox.get(pi);
      paraSt.set(pi, b ? paraHook(pi, boxBase(b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m, { text: pcolor.get(pi) })) : null);
    }
    return paraSt.get(pi) ?? null;
  };
  const unitRe = unitHook?.type === "wd" ? /\S+/g : /\S/g;
  const perPara = /* @__PURE__ */ new Map();
  let total = 0;
  if (unitHook) for (const line of layout.lines) for (const r of line.runs) {
    const c = (r.text.match(unitRe) ?? []).length;
    perPara.set(line.para, (perPara.get(line.para) ?? 0) + c);
    total += c;
  }
  const seenPara = /* @__PURE__ */ new Map();
  let seenTotal = 0;
  const skipUnits = (line) => {
    if (!unitHook) return;
    for (const r of line.runs) {
      const c = (r.text.match(unitRe) ?? []).length;
      seenPara.set(line.para, (seenPara.get(line.para) ?? 0) + c);
      seenTotal += c;
    }
  };
  ctx.textBaseline = "alphabetic";
  for (const line of layout.lines) {
    const by = y + line.baseline * scale;
    const pst = stOfPara(line.para);
    if (pst && !pst.visible) {
      skipUnits(line);
      continue;
    }
    ctx.save();
    if (pst && anim) {
      const b = pbox.get(line.para);
      if (!applyPart(ctx, pst, boxBase(b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m), b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m)) {
        ctx.restore();
        skipUnits(line);
        continue;
      }
    }
    if (line.bullet) {
      let bulletOn = true;
      if (unitHook && anim && (seenPara.get(line.para) ?? 0) === 0) {
        const sizePx = line.bullet.font.sizePt * pxPerPt;
        const bst = unitHook.state(
          { para: line.para, k: seenTotal, count: total, kPara: 0, countPara: perPara.get(line.para) ?? 1 },
          boxBase(x2 + line.bullet.x * scale, by - sizePx * 0.8, sizePx, sizePx, anim.m, { text: line.bullet.color })
        );
        bulletOn = !bst || bst.visible && bst.opacity > 0;
      }
      if (bulletOn) {
        ctx.font = layoutFontStr(line.bullet.font, pxPerPt);
        ctx.fillStyle = line.bullet.color;
        ctx.fillText(line.bullet.text, x2 + line.bullet.x * scale, by);
      }
    }
    for (const r of line.runs) {
      const tx = x2 + r.x * scale;
      if (!unitHook || !anim) {
        drawText(r.text, r, tx, by, pst);
        continue;
      }
      ctx.font = layoutFontStr(fontOf2(r.font, pst), pxPerPt);
      unitRe.lastIndex = 0;
      let mm;
      while (mm = unitRe.exec(r.text)) {
        const ux = tx + ctx.measureText(r.text.slice(0, mm.index)).width;
        const uw = ctx.measureText(mm[0]).width;
        const kPara = seenPara.get(line.para) ?? 0;
        seenPara.set(line.para, kPara + 1);
        const kAll = seenTotal++;
        const sizePx = r.font.sizePt * pxPerPt;
        const uy = by - sizePx * 0.8;
        const ubase = boxBase(ux, uy, uw, sizePx, anim.m, { text: r.color });
        const ust = unitHook.state({ para: line.para, k: kAll, count: total, kPara, countPara: perPara.get(line.para) ?? 1 }, ubase);
        if (ust && !ust.visible) continue;
        ctx.save();
        if (ust && !applyPart(ctx, ust, ubase, ux, uy, uw, sizePx, anim.m)) {
          ctx.restore();
          continue;
        }
        drawText(mm[0], r, ux, by, ust ?? pst);
        ctx.restore();
        ctx.font = layoutFontStr(fontOf2(r.font, pst), pxPerPt);
      }
    }
    ctx.restore();
  }
  if (unflip) ctx.restore();
}
function layoutFontStr(f, pxPerPt) {
  return `${f.italic ? "italic " : ""}${f.bold ? "700 " : "400 "}${f.sizePt * pxPerPt}px '${f.family}', 'Aptos', Calibri, 'Liberation Sans', Arial, sans-serif`;
}
function paintTable(ctx, t, x2, y, w, h, scale) {
  const allZeroRows = t.rows.every((r) => !r.heightEmu);
  const rowHs = allZeroRows ? t.rows.map(() => 1) : t.rows.map((r) => Math.max(r.heightEmu, 1));
  const totalColEmu = t.colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const totalRowEmu = rowHs.reduce((a, b) => a + b, 0) || 1;
  const sx = w / totalColEmu;
  const sy = h / totalRowEmu;
  const colX = [0];
  for (const cw of t.colWidthsEmu) colX.push(colX[colX.length - 1] + cw * sx);
  const rowY = [0];
  for (const rh of rowHs) rowY.push(rowY[rowY.length - 1] + rh * sy);
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri];
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      if (cell.hMerge || cell.vMerge) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      const cx0 = x2 + colX[ci];
      const cy0 = y + rowY[ri];
      const cw = (colX[ci + span] ?? colX[colX.length - 1]) - colX[ci];
      const ch = (rowY[ri + rspan] ?? rowY[rowY.length - 1]) - rowY[ri];
      if (cell.fill) {
        ctx.save();
        if (cell.fillAlpha !== void 0 && cell.fillAlpha < 1) ctx.globalAlpha = ctx.globalAlpha * cell.fillAlpha;
        ctx.fillStyle = cell.fill;
        ctx.fillRect(cx0, cy0, cw, ch);
        ctx.restore();
      }
    }
  }
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri];
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      if (cell.hMerge || cell.vMerge) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      const cx0 = x2 + colX[ci];
      const cy0 = y + rowY[ri];
      const cw = (colX[ci + span] ?? colX[colX.length - 1]) - colX[ci];
      const ch = (rowY[ri + rspan] ?? rowY[rowY.length - 1]) - rowY[ri];
      if (cell.borderColor) {
        const bw = (cell.borderWidth ?? 12700) * scale;
        ctx.strokeStyle = cell.borderColor;
        ctx.lineWidth = Math.max(0.5, bw);
        ctx.strokeRect(cx0 + 0.5, cy0 + 0.5, cw - 1, ch - 1);
      }
      if (cell.borders) {
        const edges = [
          [cell.borders.t, cx0, cy0, cx0 + cw, cy0],
          [cell.borders.b, cx0, cy0 + ch, cx0 + cw, cy0 + ch],
          [cell.borders.l, cx0, cy0, cx0, cy0 + ch],
          [cell.borders.r, cx0 + cw, cy0, cx0 + cw, cy0 + ch]
        ];
        for (const [edge, x1, y1, x22, y2] of edges) {
          if (!edge) continue;
          ctx.strokeStyle = edge.color;
          const elw = Math.max(1, edge.width * scale);
          ctx.lineWidth = elw;
          if (edge.dash) ctx.setLineDash(dashPattern(edge.dash, elw));
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x22, y2);
          ctx.stroke();
          if (edge.dash) ctx.setLineDash([]);
        }
      }
    }
  }
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri];
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      if (cell.hMerge || cell.vMerge) continue;
      if (!cell.txBody) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      const cx0 = x2 + colX[ci];
      const cy0 = y + rowY[ri];
      const cw = (colX[ci + span] ?? colX[colX.length - 1]) - colX[ci];
      const ch = (rowY[ri + rspan] ?? rowY[rowY.length - 1]) - rowY[ri];
      const padX = 91440 * scale;
      const padY = 45720 * scale;
      const cellAnchor = cell.anchor ?? "t";
      const pxPerPt = EMU_PER_POINT * scale;
      const lines = [];
      for (const p of cell.txBody.paragraphs) {
        for (const r of p.runs.length ? p.runs : [{ text: "" }]) {
          lines.push({
            text: r.text,
            bold: !!(r.bold ?? cell.txBold),
            italic: !!r.italic,
            color: r.color ?? cell.txColor ?? "#000000",
            size: (r.sz ?? 18) * pxPerPt,
            align: p.align ?? "l",
            font: r.font ?? "Calibri"
          });
        }
      }
      const lineH = (lines[0]?.size ?? 18 * pxPerPt) * 1.2;
      const totalH = lines.length * lineH;
      let cy = cy0 + padY;
      if (cellAnchor === "ctr") cy = cy0 + (ch - totalH) / 2;
      else if (cellAnchor === "b") cy = cy0 + ch - totalH - padY;
      ctx.textBaseline = "top";
      for (const l of lines) {
        ctx.font = `${l.italic ? "italic " : ""}${l.bold ? "700 " : "400 "}${l.size}px '${l.font}', 'Aptos', Calibri, 'Liberation Sans', Arial, sans-serif`;
        ctx.fillStyle = l.color;
        const tw = ctx.measureText(l.text).width;
        let tx;
        if (l.align === "ctr") tx = cx0 + (cw - tw) / 2;
        else if (l.align === "r") tx = cx0 + cw - tw - padX;
        else tx = cx0 + padX;
        ctx.fillText(l.text, tx, cy);
        cy += lineH;
      }
    }
  }
}
function makeLinearGradient(ctx, fill, x2, y, w, h) {
  if (fill.path) {
    const cx2 = x2 + w / 2, cy2 = y + h / 2;
    const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.max(w, h) / 2);
    addLinearSpaceStops(g2, fill.stops ?? []);
    return g2;
  }
  const ang = (fill.angleDeg ?? 0) * Math.PI / 180;
  let dx = Math.cos(ang), dy = Math.sin(ang);
  if (fill.scaled) {
    dx = Math.cos(ang) * h;
    dy = Math.sin(ang) * w;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
  }
  const cx = x2 + w / 2, cy = y + h / 2;
  const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  addLinearSpaceStops(g, fill.stops ?? []);
  return g;
}
function addLinearSpaceStops(g, rawStops) {
  const stops = rawStops.map((s) => ({
    pos: Math.max(0, Math.min(1, s.pos)),
    color: s.color,
    alpha: s.alpha ?? 1
  }));
  const rgba = (hex2, a) => {
    if (a >= 1) return hex2;
    const n = parseInt(hex2.replace("#", ""), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a.toFixed(3)})`;
  };
  for (let i2 = 0; i2 < stops.length; i2++) {
    const s = stops[i2];
    g.addColorStop(s.pos, rgba(s.color, s.alpha));
    const nx = stops[i2 + 1];
    if (!nx || nx.pos - s.pos < 0.05) continue;
    for (let k = 1; k < 8; k++) {
      const f = k / 8;
      const a = s.alpha + (nx.alpha - s.alpha) * f;
      g.addColorStop(s.pos + (nx.pos - s.pos) * f, rgba(mixLinearRgb(s.color, nx.color, f), a));
    }
  }
}
function mixLinearRgb(c1, c2, f) {
  const p = (h) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  const [r1, g1, b1] = p(c1);
  const [r2, g2, b22] = p(c2);
  const lin2 = (v) => Math.pow(v / 255, 2.2);
  const srgb2 = (v) => Math.round(Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255);
  const mix = (a, b) => srgb2(lin2(a) * (1 - f) + lin2(b) * f);
  const hx = (v) => v.toString(16).padStart(2, "0");
  return "#" + hx(mix(r1, r2)) + hx(mix(g1, g2)) + hx(mix(b1, b22));
}
function dashPattern(prstDash, lw) {
  switch (prstDash) {
    case "dash":
      return [5 * lw, 3 * lw];
    case "lgDash":
      return [9.5 * lw, 3 * lw];
    case "dashDot":
      return [5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case "lgDashDot":
      return [9.5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case "lgDashDotDot":
      return [9.5 * lw, 3 * lw, 1.5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case "dot":
      return [1.5 * lw, 3 * lw];
    case "sysDot":
      return [1.5 * lw, 1 * lw];
    case "sysDash":
      return [3 * lw, 1 * lw];
    case "sysDashDot":
      return [3 * lw, 1 * lw, 1.5 * lw, 1 * lw];
    case "sysDashDotDot":
      return [3.8 * lw, 0.7 * lw, 1.5 * lw, 0.7 * lw, 1.5 * lw, 0.7 * lw];
    default:
      return [];
  }
}

// ../viewer/src/media-player.ts
var MediaPlayer = class {
  constructor(repaint) {
    this.repaint = repaint;
  }
  repaint;
  mode = "realtime";
  els = /* @__PURE__ */ new Map();
  urls = [];
  gifs = /* @__PURE__ */ new Map();
  gifJobs = /* @__PURE__ */ new Map();
  /** Posições pedidas no último quadro pintado (elemento → estado). */
  wanted = /* @__PURE__ */ new Map();
  /** Quadros de GIF mostrados no último quadro (parte → índice). */
  gifShown = /* @__PURE__ */ new Map();
  /** Relógio da mídia (export emulado: 2 ticks de latência, 1/30 s por quadro). */
  clock = {};
  /** Chave do elemento de uma forma com mídia. */
  key(sh) {
    return sh.media ? sh.media.part ?? sh.media.url : void 0;
  }
  /** Elemento (criado sob demanda) da mídia da forma. */
  element(sh, bytes) {
    const k = this.key(sh);
    if (!k || !sh.media) return null;
    let el2 = this.els.get(k);
    if (el2) return el2;
    let src;
    if (sh.media.part) {
      const b = bytes(sh.media.part);
      if (!b) return null;
      src = URL.createObjectURL(new Blob([new Uint8Array(b)], { type: sh.media.mime }));
      this.urls.push(src);
    } else src = sh.media.url;
    if (!src) return null;
    el2 = document.createElement(sh.media.kind === "audio" ? "audio" : "video");
    el2.preload = "auto";
    el2.muted = this.mode === "seek";
    el2.playsInline = true;
    el2.addEventListener("loadeddata", () => this.repaint());
    el2.src = src;
    this.els.set(k, el2);
    return el2;
  }
  /** Decodifica (uma vez) os GIFs animados do slide; repinta quando prontos. */
  warmGifs(slide) {
    for (const sh of slide.shapes) {
      const img = sh.image;
      if (!img || img.mime !== "image/gif" || this.gifs.has(img.part) || this.gifJobs.has(img.part)) continue;
      this.gifJobs.set(img.part, this.decodeGif(img.part, img.bytes).then((g) => {
        this.gifs.set(img.part, g);
        this.gifJobs.delete(img.part);
        if (g) this.repaint();
      }));
    }
  }
  async decodeGif(part, bytes) {
    const Ctor = globalThis.ImageDecoder;
    if (!Ctor) return null;
    try {
      const dec = new Ctor({ data: new Uint8Array(bytes), type: "image/gif" });
      await dec.tracks.ready;
      const tr = dec.tracks.selectedTrack;
      if (!tr || tr.frameCount <= 1) {
        dec.close();
        return null;
      }
      const frames = [], delays = [];
      for (let i2 = 0; i2 < tr.frameCount; i2++) {
        const { image } = await dec.decode({ frameIndex: i2 });
        delays.push((image.duration ?? 0) / 1e3);
        frames.push(await createImageBitmap(image));
        image.close();
      }
      const repeat = Number.isFinite(tr.repetitionCount) ? tr.repetitionCount : Infinity;
      dec.close();
      void part;
      return { frames, delays, repeat };
    } catch {
      return null;
    }
  }
  /**
   * Quadro a pintar no lugar da imagem da forma: vídeo em curso (ou parado
   * no último quadro) / quadro atual do GIF. null = imagem normal (capa).
   * `animMs` = tempo de animação do slide (Infinity = estado final).
   */
  frame(sh, ps, animMs, bytes, vol = 1, muted = false) {
    if (sh.media) {
      const st = mediaStateAt(ps.effects, sh.id, animMs, this.clock);
      const el2 = this.element(sh, bytes);
      if (!el2) return null;
      const dur = Number.isFinite(el2.duration) && el2.duration > 0 ? el2.duration : (st.durMs ?? Infinity) / 1e3;
      const end = Math.max(0, dur - 1e-3);
      const time = Math.max(0, Math.min(st.timeSec, end));
      if (st.started) this.wanted.set(el2, { time, playing: st.playing && st.timeSec < dur, volume: vol, muted });
      if (sh.media.kind !== "video" || !st.started) return null;
      return el2.readyState >= 2 ? el2 : null;
    }
    const img = sh.image;
    if (img?.mime === "image/gif") {
      const g = this.gifs.get(img.part);
      if (!g) return null;
      const t = Number.isFinite(animMs) ? animMs : ps.endMs - ps.animStartMs;
      const elapsed = Math.max(0, t) * (this.clock.scale ?? 1);
      const i2 = gifFrameAt(g.delays, elapsed, g.repeat);
      this.gifShown.set(img.part, i2);
      return g.frames[i2] ?? null;
    }
    return null;
  }
  /** Modo tempo real: toca/pausa/corrige os elementos conforme o último quadro. */
  syncRealtime() {
    for (const [, el2] of this.els) {
      const w = this.wanted.get(el2);
      if (!w) {
        if (!el2.paused) el2.pause();
        continue;
      }
      el2.volume = Math.max(0, Math.min(1, w.volume));
      el2.muted = w.muted;
      if (w.playing) {
        if (el2.paused) {
          el2.currentTime = w.time;
          void el2.play().catch(() => {
          });
        } else if (Math.abs(el2.currentTime - w.time) > 0.3) el2.currentTime = w.time;
      } else {
        if (!el2.paused) el2.pause();
        if (Math.abs(el2.currentTime - w.time) > 0.05) el2.currentTime = w.time;
      }
    }
    this.wanted.clear();
  }
  /** Esquece as posições pedidas (antes de recalcular um quadro). */
  resetWanted() {
    this.wanted.clear();
    this.gifShown.clear();
  }
  /** Assinatura das posições do último quadro (vídeo em ms, quadro de GIF). */
  signature() {
    const parts = [];
    for (const [el2, w] of this.wanted) parts.push(`${el2.currentSrc.slice(-12)}@${Math.round(w.time * 1e3)}`);
    for (const [k, i2] of this.gifShown) parts.push(`${k}#${i2}`);
    return parts.join("|");
  }
  /** A mídia da forma está tocando em `animMs`? */
  isPlaying(sh, ps, animMs) {
    return mediaStateAt(ps.effects, sh.id, animMs, this.clock).playing;
  }
  /**
   * Modo busca: posiciona cada vídeo pedido no instante exato e espera o
   * quadro decodificado (+ GIFs pendentes). Chamar após um quadro "seco"
   * (que registra as posições) e antes do quadro definitivo.
   */
  async seekAll(timeoutMs = 3e3) {
    const jobs = [...this.gifJobs.values()];
    for (const [el2, w] of this.wanted) {
      if (!(el2 instanceof HTMLVideoElement)) continue;
      jobs.push(seekTo(el2, w.time + 1 / 60, timeoutMs));
    }
    await Promise.all(jobs);
  }
  /** Para tudo (fim da reprodução). */
  stop() {
    for (const [, el2] of this.els) if (!el2.paused) el2.pause();
    this.wanted.clear();
  }
  /** Libera elementos/URLs/quadros (troca de deck). */
  dispose() {
    this.stop();
    for (const [, el2] of this.els) {
      el2.removeAttribute("src");
      el2.load();
    }
    this.els.clear();
    for (const u of this.urls) URL.revokeObjectURL(u);
    this.urls = [];
    for (const [, g] of this.gifs) g?.frames.forEach((f) => f.close());
    this.gifs.clear();
    this.gifJobs.clear();
  }
};
async function seekTo(el2, time, timeoutMs) {
  const wait = (ev2) => new Promise((res) => {
    const t = setTimeout(res, timeoutMs);
    el2.addEventListener(ev2, () => {
      clearTimeout(t);
      res();
    }, { once: true });
  });
  if (el2.readyState < 1) await wait("loadedmetadata");
  const target = Math.max(0, Math.min(time, Number.isFinite(el2.duration) ? Math.max(0, el2.duration - 1e-3) : time));
  if (Math.abs(el2.currentTime - target) > 5e-4 || el2.readyState < 2) {
    const done = wait("seeked");
    el2.currentTime = target;
    await done;
  }
  if (el2.readyState < 2) await wait("loadeddata");
}

// ../viewer/src/universal-presentation-viewer.ts
var UniversalPresentationViewerElement = class extends HTMLElement {
  host = this.attachShadow({ mode: "open" });
  canvas = document.createElement("canvas");
  badge = document.createElement("div");
  /** Wrapper que hospeda canvas + badge (+ overlays de subclasses). */
  wrap = document.createElement("div");
  pkg = null;
  pres = null;
  slides = [];
  index = 0;
  /**
   * Cache de decodificacao de imagens (`<p:pic>` + bg image). Chave = `ImageRef.part`
   * (caminho unico no pacote). Reutilizamos entre slides — uma logo repetida em
   * varios slides decodifica UMA vez. Pintamos sem bloquear: enquanto a imagem
   * ainda nao carregou, deixamos o retangulo vazio; um repaint e disparado quando
   * `onload` chega.
   */
  imageCache = /* @__PURE__ */ new Map();
  /** Cache de ChartModel parseado, por XML cru (passado a paintSlideTo). */
  chartCache = /* @__PURE__ */ new Map();
  /**
   * Estado da animação em curso. Sem animação tocando, `playStartMs = null`.
   */
  animPlay = { startMs: null, rafId: 0, pausedAt: 0 };
  /**
   * Snapshot do frame anterior pra transição entre slides. `prevImage` é o
   * ImageData do canvas no instante em que selectSlide foi chamado.
   */
  trans = {
    prevImage: null,
    startMs: null,
    durMs: 0,
    type: "fade"
  };
  /**
   * Reprodução automática em curso (`play()`): linha do tempo PURA
   * (slides-core/playback.ts) + relógio. `null` = navegação manual.
   */
  auto = null;
  /** Canvases de trabalho da transição (origem/destino) na reprodução automática. */
  fromCanvas = null;
  toCanvas = null;
  fromKey = "";
  /** Vídeo/áudio/GIF da reprodução automática. */
  media = new MediaPlayer(() => this.paint());
  static get observedAttributes() {
    return ["src"];
  }
  constructor() {
    super();
    this.canvas.style.cssText = "display:block;width:100%;height:100%;outline:none;background:#3c3c3c;";
    this.canvas.tabIndex = 0;
    this.badge.style.cssText = "position:absolute;right:10px;bottom:8px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.55);color:#fff;font:600 12px/1.4 Segoe UI,Arial;pointer-events:none;";
    this.wrap.style.cssText = "position:relative;width:100%;height:100%;overflow:hidden;";
    this.wrap.appendChild(this.canvas);
    this.wrap.appendChild(this.badge);
    this.host.appendChild(this.wrap);
    this.canvas.addEventListener("keydown", this.onKeyDown);
    this.canvas.addEventListener("click", this.onClick);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
  }
  connectedCallback() {
    new ResizeObserver(() => {
      this.resize();
      this.paint();
    }).observe(this.canvas);
    this.resize();
    this.paint();
    document.fonts?.ready.then(() => this.paint()).catch(() => {
    });
    const src = this.getAttribute("src");
    if (src && !this.pkg) void this.loadSrc(src);
  }
  attributeChangedCallback(name, oldV, newV) {
    if (name === "src" && newV && newV !== oldV && this.isConnected) void this.loadSrc(newV);
  }
  /** Carrega um .pptx por URL (mesma origem ou CORS liberado). */
  async loadSrc(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      this.loadPptx(new Uint8Array(await res.arrayBuffer()));
    } catch {
    }
  }
  // ───────────────────────── FONTES (lógica do Universal Write) ─────────────────────────
  // 1 fonte DEFAULT embarcada (Liberation Sans, via atributo `fonts` = base URL),
  // fontes EMBUTIDAS no arquivo (p:embeddedFontLst) e fontes do SO carregadas
  // SOB DEMANDA (queryLocalFonts) para as famílias que o deck realmente usa.
  /** Famílias com FontFace carregado (embutidas/SO/default). */
  loadedFamilyNames = /* @__PURE__ */ new Set();
  defaultFontsInstalled = false;
  /** Busca os assets default (Liberation Sans) da base do atributo `fonts`. */
  async installDefaultFonts() {
    if (this.defaultFontsInstalled) return;
    this.defaultFontsInstalled = true;
    const base = this.getAttribute("fonts");
    if (!base) return;
    const files = [
      ["liberationsans-regular.ttf", "400", "normal"],
      ["liberationsans-bold.ttf", "700", "normal"],
      ["liberationsans-italic.ttf", "400", "italic"],
      ["liberationsans-bolditalic.ttf", "700", "italic"]
    ];
    for (const [file, weight, style] of files) {
      try {
        const res = await fetch(`${base.replace(/\/$/, "")}/${file}`);
        if (!res.ok) continue;
        const face = new FontFace("Liberation Sans", await res.arrayBuffer(), { weight, style });
        document.fonts.add(await face.load());
        this.loadedFamilyNames.add("Liberation Sans");
      } catch {
      }
    }
    if (this.loadedFamilyNames.has("Liberation Sans")) this.paint();
  }
  /** Registra as fontes EMBUTIDAS no pacote (FontFace) e repinta ao carregar. */
  registerEmbeddedFonts(pkg) {
    for (const f of readEmbeddedFonts(pkg)) {
      const weight = f.variant === "bold" || f.variant === "boldItalic" ? "700" : "400";
      const style = f.variant === "italic" || f.variant === "boldItalic" ? "italic" : "normal";
      try {
        const buf = f.data.slice().buffer;
        const face = new FontFace(f.family, buf, { weight, style });
        void face.load().then(() => {
          document.fonts.add(face);
          this.loadedFamilyNames.add(f.family);
          this.paint();
        }).catch(() => {
        });
      } catch {
      }
    }
  }
  /**
   * Carrega SOB DEMANDA as fontes do SO usadas pelo deck e ainda não
   * disponíveis (queryLocalFonts — Chromium/Electron). Sem permissão/API,
   * o fallback CSS (default → Aptos → Calibri → Arial) cobre.
   */
  async ensureDeckFonts(pkg) {
    const wanted = collectDeckTypefaces(pkg).filter((fam) => !this.loadedFamilyNames.has(fam)).filter((fam) => {
      try {
        return !document.fonts.check(`12px "${fam}"`);
      } catch {
        return true;
      }
    });
    if (!wanted.length) return;
    const qlf = window.queryLocalFonts;
    if (!qlf) return;
    let faces;
    try {
      faces = await qlf.call(window);
    } catch {
      return;
    }
    const wantSet = new Set(wanted.map((f) => f.toLowerCase()));
    let added = false;
    for (const fd2 of faces) {
      if (!wantSet.has(fd2.family.toLowerCase())) continue;
      const styleLc = fd2.style.toLowerCase();
      const weight = /bold|black|heavy|semibold|demi/.test(styleLc) ? "700" : "400";
      const style = /italic|oblique/.test(styleLc) ? "italic" : "normal";
      try {
        const bytes = await (await fd2.blob()).arrayBuffer();
        const face = new FontFace(fd2.family, bytes, { weight, style });
        document.fonts.add(await face.load());
        this.loadedFamilyNames.add(fd2.family);
        added = true;
      } catch {
      }
    }
    if (added) this.paint();
  }
  /** True quando uma subclasse está com edição inline aberta (viewer: nunca). */
  isEditing() {
    return false;
  }
  /** Índice de shape cujo texto NÃO deve ser pintado (edição inline). */
  suppressTextIdx() {
    return void 0;
  }
  /** Carrega bytes .pptx e monta os slides. */
  loadPptx(bytes) {
    if (this.auto) this.stopPlayback();
    this.media.dispose();
    this.pkg = PptxPackage.load(bytes);
    void this.installDefaultFonts();
    this.registerEmbeddedFonts(this.pkg);
    void this.ensureDeckFonts(this.pkg);
    this.pres = readPresentation(this.pkg);
    this.slides = [];
    for (const ref of this.pres.slides) {
      if (!ref.target) continue;
      try {
        this.slides.push(readSlide(this.pkg, ref.target));
      } catch {
        this.slides.push({ shapes: [] });
      }
    }
    this.imageCache.clear();
    for (const s of this.slides) {
      if (s.bgImage) this.warmImage(s.bgImage);
      for (const sh of s.shapes) {
        if (sh.image) this.warmImage(sh.image);
        if (sh.fillImage) this.warmImage(sh.fillImage);
      }
    }
    this.index = 0;
    this.resize();
    this.paint();
    this.startAnimation();
    this.dispatchEvent(new CustomEvent("us-loaded", { detail: { count: this.slides.length } }));
  }
  /** Reinicia a animação do slide atual (útil para um botão "replay"). */
  replayAnimation() {
    this.stopAnimation();
    this.paint();
    this.startAnimation();
  }
  /** Entra em modo apresentação: fullscreen do próprio componente. */
  present(from) {
    if (from !== void 0) this.selectSlide(from);
    if (document.fullscreenEnabled && this.wrap.requestFullscreen) {
      this.wrap.requestFullscreen().catch(() => {
      });
    }
    this.canvas.focus();
  }
  /**
   * Inicia a decodificacao de uma ImageRef e dispara um repaint quando carrega.
   * Reentrante: chamadas repetidas para o mesmo `part` reaproveitam o HTMLImageElement.
   */
  warmImage(ref) {
    if (this.imageCache.has(ref.part)) return;
    const img = new Image();
    const entry = { img, ready: false };
    this.imageCache.set(ref.part, entry);
    const buf = new Uint8Array(ref.bytes);
    const blob = new Blob([buf], { type: ref.mime });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      entry.ready = true;
      this.paint();
      URL.revokeObjectURL(url);
      this.dispatchEvent(new CustomEvent("us-image", { detail: { part: ref.part } }));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
  /**
   * Mapa `part → imagem decodificada` para o `paintSlideTo`. Só entram as
   * PRONTAS (paint pula as pendentes; onload dispara repaint). Aproveita para
   * aquecer imagens do slide que ainda não entraram no cache (path raro).
   */
  readyImages(slide) {
    if (slide.bgImage) this.warmImage(slide.bgImage);
    for (const sh of slide.shapes) {
      if (sh.image) this.warmImage(sh.image);
      if (sh.fillImage) this.warmImage(sh.fillImage);
    }
    const map = /* @__PURE__ */ new Map();
    for (const [part, e] of this.imageCache) if (e.ready) map.set(part, e.img);
    return map;
  }
  getSlideCount() {
    return this.slides.length;
  }
  getSlideIndex() {
    return this.index;
  }
  selectSlide(i2) {
    if (i2 < 0 || i2 >= this.slides.length || i2 === this.index) return;
    if (this.auto) this.stopPlayback();
    this.stopAnimation();
    const target = this.slides[i2];
    if (target?.transition) {
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        try {
          this.trans.prevImage = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          this.trans.startMs = (window.performance ?? Date).now();
          this.trans.durMs = target.transition.durMs;
          this.trans.type = target.transition.type;
        } catch {
          this.trans.prevImage = null;
        }
      }
    }
    this.index = i2;
    this.paint();
    this.startTransitionPlayback();
    this.startAnimation();
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: i2 } }));
  }
  next() {
    this.selectSlide(Math.min(this.slides.length - 1, this.index + 1));
  }
  prev() {
    this.selectSlide(Math.max(0, this.index - 1));
  }
  /** RAF loop que pinta a transição até completar, depois libera o snapshot. */
  startTransitionPlayback() {
    if (this.trans.startMs == null || !this.trans.prevImage) return;
    const tick = () => {
      if (this.trans.startMs == null) return;
      const dt = (window.performance ?? Date).now() - this.trans.startMs;
      if (dt >= this.trans.durMs) {
        this.trans.prevImage = null;
        this.trans.startMs = null;
        this.paint();
        return;
      }
      this.paint();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  /**
   * Auto-play da timeline do slide atual. Chama paint() via RAF até o último
   * efeito terminar. Sem animacoes → noop.
   */
  startAnimation() {
    const slide = this.slides[this.index];
    if (!slide?.animations || slide.animations.length === 0) return;
    this.animPlay.startMs = (window.performance ?? Date).now();
    const lastEnd = Math.max(...slide.animations.map((a) => a.delayMs + a.durMs));
    const tick = () => {
      if (this.animPlay.startMs == null) return;
      const tMs = (window.performance ?? Date).now() - this.animPlay.startMs;
      this.paint();
      if (tMs < lastEnd) this.animPlay.rafId = requestAnimationFrame(tick);
      else this.animPlay.startMs = null;
    };
    this.animPlay.rafId = requestAnimationFrame(tick);
  }
  /** Para qualquer animação em curso (cancela o RAF). */
  stopAnimation() {
    if (this.animPlay.rafId) cancelAnimationFrame(this.animPlay.rafId);
    this.animPlay.startMs = null;
    this.animPlay.rafId = 0;
  }
  /**
   * Opacidade computada de uma shape no instante t da timeline. Sem animacao
   * para essa shape → opaca. Antes do delay → invisível. Durante o ramp →
   * linear; após o fim → opaca.
   */
  shapeOpacity(shape, slide) {
    if (!slide.animations || slide.animations.length === 0) return 1;
    if (this.animPlay.startMs == null) return 1;
    const t = (window.performance ?? Date).now() - this.animPlay.startMs;
    const entry = slide.animations.find((a) => a.spid === shape.id);
    if (!entry) return 1;
    if (t < entry.delayMs) return 0;
    if (t >= entry.delayMs + entry.durMs) return 1;
    const f = (t - entry.delayMs) / entry.durMs;
    return entry.type === "fade" ? f : 1;
  }
  // ───────────────────────── REPRODUÇÃO AUTOMÁTICA ─────────────────────────
  /**
   * REPRODUÇÃO AUTOMÁTICA (quiosque / "usar intervalos"): a apresentação toca
   * sozinha — transição de entrada, animações (passos por clique disparam no
   * tempo do export de vídeo do app de referência), avanço por `advTm` (ou
   * `defaultSlideMs` sem intervalo), slides ocultos pulados. Pinta em modo
   * slideshow (fundo preto, slide encaixado sem margem, sem selo). O estado
   * de cada quadro é função PURA de `performance.now() − início`
   * (`playbackStateAt`) — determinístico sob relógio virtual.
   * Emite `us-slide` a cada troca e `us-playback-end` ao terminar.
   */
  play(opts = {}) {
    this.stopAnimation();
    this.stopPlayback();
    this.trans.prevImage = null;
    this.trans.startMs = null;
    const tl = buildPlaybackTimeline(this.slides.map((s) => s.timing), opts);
    this.media.mode = opts.media ?? "realtime";
    this.media.clock = tl.tickMs > 0 ? { latencyMs: 2 * tl.tickMs, scale: tl.mediaClock } : {};
    for (const s of this.slides) this.media.warmGifs(s);
    const from = opts.from ?? 0;
    const first = tl.slides.find((s) => s.index >= from);
    const now = (window.performance ?? Date).now();
    this.auto = { tl, t0: now - (first?.startMs ?? 0), loop: opts.loop ?? false, rafId: 0, pos: -1 };
    this.fromKey = "";
    this.badge.style.display = "none";
    const tick = () => {
      const a = this.auto;
      if (!a) return;
      const t = (window.performance ?? Date).now() - a.t0;
      if (t >= a.tl.durationMs && a.loop && a.tl.durationMs > 0) a.t0 += a.tl.durationMs;
      this.paint();
      if (t >= a.tl.durationMs && !a.loop) {
        a.rafId = 0;
        this.dispatchEvent(new CustomEvent("us-playback-end"));
        return;
      }
      a.rafId = requestAnimationFrame(tick);
    };
    this.paint();
    this.auto.rafId = requestAnimationFrame(tick);
    return tl;
  }
  /** Para a reprodução automática; o viewer fica no slide em cena. */
  stopPlayback() {
    if (!this.auto) return;
    if (this.auto.rafId) cancelAnimationFrame(this.auto.rafId);
    this.auto = null;
    this.media.stop();
    this.badge.style.display = "";
    this.paint();
  }
  isPlaying() {
    return this.auto !== null;
  }
  /** Linha do tempo da reprodução em curso (debug/lab de playback). */
  getPlaybackTimeline() {
    return this.auto?.tl ?? null;
  }
  /** Tempo (ms) da reprodução em curso, ou null. */
  getPlaybackTime() {
    return this.auto ? (window.performance ?? Date).now() - this.auto.t0 : null;
  }
  /**
   * Modo `media: 'seek'` (captura): posiciona vídeos/GIFs do quadro atual no
   * instante exato e espera os quadros decodificados. Devolve uma assinatura
   * das posições (muda quando o quadro de mídia muda).
   */
  async syncMedia() {
    if (!this.auto) return "";
    this.media.resetWanted();
    this.paint();
    await this.media.seekAll();
    return this.media.signature();
  }
  /** Canvas de trabalho do tamanho do canvas principal. */
  workCanvas(c) {
    const cv = c ?? document.createElement("canvas");
    if (cv.width !== this.canvas.width) cv.width = this.canvas.width;
    if (cv.height !== this.canvas.height) cv.height = this.canvas.height;
    return cv;
  }
  /** Pinta um slide da linha do tempo num contexto, no tempo de animação `animMs`. */
  paintPlaybackSlide(ctx, ps, animMs, fit) {
    const slide = this.slides[ps.index];
    if (!slide || !this.pres) return;
    const bg = new Set(slide.timing?.animBg ?? []);
    const actx = { animBg: (spid) => bg.has(spid) };
    const mediaInfo = new Map((slide.timing?.media ?? []).map((m) => [m.spid, m]));
    const bytes = (part) => this.pkg?.getPart(part);
    const hasMedia = slide.shapes.some((sh) => sh.media || sh.image?.mime === "image/gif");
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, fit.scale, {
      ox: fit.ox,
      oy: fit.oy,
      // motor SMIL: cada forma toca os comportamentos gravados no arquivo
      shapeAnim: (sh) => sh.inherited || !ps.effects.length ? null : shapeAnimHooks(ps.effects, sh.groupIds ? [sh.id, ...sh.groupIds] : [sh.id], animMs, actx),
      // vídeo tocando / quadro do GIF no lugar da capa
      ...hasMedia ? {
        mediaFrame: (sh) => {
          if (sh.inherited) return null;
          const mi = mediaInfo.get(sh.id);
          return this.media.frame(sh, ps, animMs, bytes, mi?.vol ?? 1, mi?.mute ?? false);
        },
        // "ocultar enquanto não estiver tocando" (cMediaNode showWhenStopped="0")
        shapeOpacity: (sh) => sh.media && mediaInfo.get(sh.id)?.showWhenStopped === false && !this.media.isPlaying(sh, ps, animMs) ? 0 : 1
      } : {}
    });
  }
  /**
   * Quadro da reprodução automática: slide em cena no estado de animação do
   * instante atual; durante a transição, compõe ORIGEM (slide anterior no
   * estado final, ou preto no 1º slide) × DESTINO. v1: esmaecer cruzado;
   * `thruBlk` passa pelo preto; corte seco é instantâneo (transitionMs = 0).
   */
  paintPlayback(ctx) {
    const a = this.auto;
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (!this.pres) return;
    const st = playbackStateAt(a.tl, (window.performance ?? Date).now() - a.t0);
    if (!st.slide) return;
    if (st.pos !== a.pos) {
      a.pos = st.pos;
      this.index = st.slide.index;
      this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: st.slide.index } }));
    }
    const scale = Math.min(W / this.pres.slideW, H / this.pres.slideH);
    const fit = { scale, ox: (W - this.pres.slideW * scale) / 2, oy: (H - this.pres.slideH * scale) / 2 };
    const p = st.transitionProgress;
    if (p >= 1) {
      this.paintPlaybackSlide(ctx, st.slide, st.animMs, fit);
      if (this.media.mode === "realtime") this.media.syncRealtime();
      return;
    }
    const to = this.toCanvas = this.workCanvas(this.toCanvas);
    const tctx = to.getContext("2d");
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.fillStyle = "#000";
    tctx.fillRect(0, 0, W, H);
    this.paintPlaybackSlide(tctx, st.slide, st.animMs, fit);
    const from = this.fromCanvas = this.workCanvas(this.fromCanvas);
    const key = `${st.from?.index ?? -1}:${from.width}x${from.height}`;
    if (key !== this.fromKey) {
      const fctx = from.getContext("2d");
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.fillStyle = "#000";
      fctx.fillRect(0, 0, W, H);
      if (st.from) this.paintPlaybackSlide(fctx, st.from, Infinity, fit);
      this.fromKey = key;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tr = st.slide.transition ?? { type: "fade", ns: "p", attrs: {}, durMs: 0, advClick: true };
    const rect = {
      x: fit.ox * dpr,
      y: fit.oy * dpr,
      w: this.pres.slideW * fit.scale * dpr,
      h: this.pres.slideH * fit.scale * dpr
    };
    paintTransition(ctx, from, to, tr, p, rect, this.canvas.width, this.canvas.height);
    ctx.restore();
    if (this.media.mode === "realtime") this.media.syncRealtime();
  }
  /**
   * Pinta o slide `i` num canvas externo (uso: miniaturas da sidebar). Usa o
   * MESMO `paintSlideTo` — uma so fonte de verdade entre slide principal
   * e thumbnail. Retorna `false` se a imagem do slide ainda nao decodificou —
   * o chamador pode escutar `us-loaded`/`us-image` para repintar.
   */
  renderThumbnail(i2, target) {
    const slide = this.slides[i2];
    if (!slide || !this.pres) return false;
    const ctx = target.getContext("2d");
    if (!ctx) return false;
    const dpr = window.devicePixelRatio || 1;
    const cssW = target.clientWidth || 200;
    const cssH = target.clientHeight || Math.round(cssW * this.pres.slideH / this.pres.slideW);
    if (target.width !== Math.round(cssW * dpr)) target.width = Math.round(cssW * dpr);
    if (target.height !== Math.round(cssH * dpr)) target.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const scale = Math.min(cssW / this.pres.slideW, cssH / this.pres.slideH);
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    const ox = (cssW - sw) / 2, oy = (cssH - sh) / 2;
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, scale, { ox, oy });
    return true;
  }
  /**
   * Pinta o slide `i` num canvas externo em TAMANHO EXATO: o canvas é
   * redimensionado para `pxWidth × (proporção do slide)` e o slide preenche
   * 100% da área (sem margens/chrome). Uso: export, comparação 1:1 com o
   * app de referência, impressão.
   */
  renderSlideToCanvas(i2, target, pxWidth = 1280) {
    const slide = this.slides[i2];
    if (!slide || !this.pres) return false;
    const ctx = target.getContext("2d");
    if (!ctx) return false;
    const pxHeight = Math.round(pxWidth * this.pres.slideH / this.pres.slideW);
    if (target.width !== pxWidth) target.width = pxWidth;
    if (target.height !== pxHeight) target.height = pxHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pxWidth, pxHeight);
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, pxWidth / this.pres.slideW);
    return true;
  }
  onKeyDown = (e) => {
    if (this.isEditing()) return;
    if (this.auto && e.key === "Escape") {
      this.stopPlayback();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      this.next();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      this.prev();
      e.preventDefault();
    } else if (e.key === "Home") {
      this.selectSlide(0);
      e.preventDefault();
    } else if (e.key === "End") {
      this.selectSlide(this.slides.length - 1);
      e.preventDefault();
    }
  };
  /**
   * Detecta hyperlink na posição (canvas-relativa) e abre URL se houver.
   * v1: o link é "shape-wide" (a primeira run com hyperlink no txBody manda).
   */
  onClick = (e) => {
    if (this.isEditing()) return;
    const hit = this.hitTestHyperlink(e);
    if (hit) {
      window.open(hit, "_blank", "noopener");
      e.preventDefault();
    }
  };
  onMouseMove = (e) => {
    if (this.isEditing()) return;
    this.canvas.style.cursor = this.hitTestHyperlink(e) ? "pointer" : "default";
  };
  /** Devolve a primeira URL de hyperlink sob (clientX, clientY) ou null. */
  hitTestHyperlink(e) {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i2 = slide.shapes.length - 1; i2 >= 0; i2--) {
      const sh = slide.shapes[i2];
      if (!sh.xfrm || !sh.txBody) continue;
      const sx = fit.ox + sh.xfrm.x * fit.scale;
      const sy = fit.oy + sh.xfrm.y * fit.scale;
      const sw = sh.xfrm.cx * fit.scale;
      const sh2 = sh.xfrm.cy * fit.scale;
      if (x2 < sx || x2 > sx + sw || y < sy || y > sy + sh2) continue;
      for (const p of sh.txBody.paragraphs) {
        for (const r of p.runs) {
          if (r.hyperlink) return r.hyperlink;
        }
      }
    }
    return null;
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 600;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }
  /** Geometria de encaixe do slide no canvas (origem + escala EMU→px). */
  fit() {
    if (!this.pres) return null;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const margin = 16;
    const aw = W - margin * 2, ah = H - margin * 2;
    const scale = Math.min(aw / this.pres.slideW, ah / this.pres.slideH);
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    return { ox: (W - sw) / 2, oy: (H - sh) / 2, scale, sw, sh };
  }
  paint() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    if (this.auto) {
      this.paintPlayback(ctx);
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    ctx.fillStyle = "#3c3c3c";
    ctx.fillRect(0, 0, W, H);
    const fit = this.fit();
    const slide = this.slides[this.index];
    if (!fit || !slide) {
      ctx.fillStyle = "#bbb";
      ctx.font = "14px Segoe UI, Arial";
      ctx.fillText("Nenhum .pptx carregado", 20, 30);
      this.badge.textContent = "";
      return;
    }
    const paintOpts = {
      ox: fit.ox,
      oy: fit.oy,
      shapeOpacity: (sh) => this.shapeOpacity(sh, slide)
    };
    const suppress = this.suppressTextIdx();
    if (suppress !== void 0) paintOpts.suppressTextShapeIdx = suppress;
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, fit.scale, paintOpts);
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(fit.ox + 0.5, fit.oy + 0.5, fit.sw - 1, fit.sh - 1);
    if (this.trans.prevImage && this.trans.startMs != null) {
      const dt = (window.performance ?? Date).now() - this.trans.startMs;
      const f = Math.max(0, Math.min(1, dt / this.trans.durMs));
      const overlay = document.createElement("canvas");
      overlay.width = this.canvas.width;
      overlay.height = this.canvas.height;
      const octx = overlay.getContext("2d");
      if (octx) {
        octx.putImageData(this.trans.prevImage, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - f;
        ctx.drawImage(overlay, 0, 0);
        ctx.restore();
      }
    }
    this.badge.textContent = `${this.index + 1} / ${this.slides.length}`;
  }
};
customElements.define("universal-presentation-viewer", UniversalPresentationViewerElement);

// src/universal-slides.ts
var UniversalSlidesElement = class extends UniversalPresentationViewerElement {
  /** Editor inline da shape de texto (criado em `beginEditShape`). */
  editor = null;
  editingShape = null;
  constructor() {
    super();
    this.canvas.addEventListener("dblclick", this.onDblClick);
  }
  isEditing() {
    return this.editingShape !== null;
  }
  suppressTextIdx() {
    return this.editingShape && this.editingShape.slide === this.index ? this.editingShape.shapeIdx : void 0;
  }
  selectSlide(i2) {
    if (this.editingShape) this.commitEditShape();
    super.selectSlide(i2);
  }
  onDblClick = (e) => {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const rect = this.canvas.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i2 = slide.shapes.length - 1; i2 >= 0; i2--) {
      const sh = slide.shapes[i2];
      if (!sh.txBody || !sh.xfrm) continue;
      const sx = fit.ox + sh.xfrm.x * fit.scale;
      const sy = fit.oy + sh.xfrm.y * fit.scale;
      const sw = sh.xfrm.cx * fit.scale;
      const sh2 = sh.xfrm.cy * fit.scale;
      if (x2 >= sx && x2 <= sx + sw && y >= sy && y <= sy + sh2) {
        this.beginEditShape(i2);
        e.preventDefault();
        return;
      }
    }
  };
  // ───────────────────────── EDIÇÃO DE TEXTO ─────────────────────────
  /**
   * Entra em modo edição numa shape de texto. Cria um `<div contenteditable>`
   * sobre o `xfrm` da shape. Enter (sem Shift) e Esc commitam; blur commita.
   * **Limitação v1:** ao commitar, descarta runs e mantém um único run com o
   * texto editado no PRIMEIRO parágrafo. Preservação de runs/formato vem em
   * iterações futuras (precisa de diff + reaplicação por offset).
   */
  beginEditShape(shapeIdx) {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const sh = slide.shapes[shapeIdx];
    if (!sh || !sh.xfrm || !sh.txBody) return;
    if (this.editor) this.commitEditShape();
    this.editingShape = { slide: this.index, shapeIdx };
    const initialText = sh.txBody.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
    const left = fit.ox + sh.xfrm.x * fit.scale;
    const top = fit.oy + sh.xfrm.y * fit.scale;
    const w = sh.xfrm.cx * fit.scale;
    const h = sh.xfrm.cy * fit.scale;
    const firstRun = sh.txBody.paragraphs[0]?.runs[0];
    const pt = firstRun?.sz ?? (sh.phType === "title" || sh.phType === "ctrTitle" ? 40 : 18);
    const px = pt * 12700 * fit.scale / 12700;
    const color = firstRun?.color ?? "#000000";
    const font = firstRun?.font ?? "Calibri";
    const align = sh.txBody.paragraphs[0]?.align;
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.spellcheck = false;
    div.textContent = initialText;
    div.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${w}px;min-height:${h}px;padding:4px;border:2px dashed #ff7043;outline:none;background:rgba(255,255,255,.92);color:${color};font:${px}px '${font}', 'Aptos', Calibri, Arial, sans-serif;text-align:${align === "ctr" ? "center" : align === "r" ? "right" : "left"};white-space:pre-wrap;z-index:5;`;
    this.wrap.appendChild(div);
    this.editor = div;
    div.focus();
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    let suppressBlur = false;
    div.addEventListener("keydown", (ev2) => {
      if (ev2.key === "Enter" && !ev2.shiftKey) {
        ev2.preventDefault();
        suppressBlur = true;
        this.commitEditShape();
        this.canvas.focus();
      } else if (ev2.key === "Escape") {
        ev2.preventDefault();
        suppressBlur = true;
        this.cancelEditShape();
        this.canvas.focus();
      }
    });
    div.addEventListener("blur", () => {
      if (suppressBlur || !this.editingShape) return;
      this.commitEditShape();
    });
  }
  /** Commita a edição → atualiza shape.txBody.paragraphs com o texto editado. */
  commitEditShape() {
    if (!this.editor || !this.editingShape) return;
    const text = this.editor.innerText.replace(/\r\n/g, "\n");
    const { slide: slideIdx, shapeIdx } = this.editingShape;
    const slide = this.slides[slideIdx];
    const sh = slide?.shapes[shapeIdx];
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    if (!sh || !sh.txBody) {
      this.paint();
      return;
    }
    const firstRun = sh.txBody.paragraphs[0]?.runs[0];
    const firstPara = sh.txBody.paragraphs[0];
    sh.txBody.paragraphs = text.split("\n").map((line) => {
      const run = { text: line };
      if (firstRun?.sz !== void 0) run.sz = firstRun.sz;
      if (firstRun?.bold) run.bold = true;
      if (firstRun?.italic) run.italic = true;
      if (firstRun?.underline) run.underline = true;
      if (firstRun?.color) run.color = firstRun.color;
      if (firstRun?.font) run.font = firstRun.font;
      const para = { runs: [run] };
      if (firstPara?.align) para.align = firstPara.align;
      if (firstPara?.bullet) para.bullet = firstPara.bullet;
      return para;
    });
    this.dispatchEvent(new CustomEvent("us-shape-edit", {
      detail: { slide: slideIdx, shapeIdx, text }
    }));
    this.paint();
  }
  /** Descarta a edição em curso (texto original mantido). */
  cancelEditShape() {
    if (!this.editor) return;
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    this.paint();
  }
};
customElements.define("universal-slides", UniversalSlidesElement);

// demo/main.ts
var us = document.getElementById("us");
var $ = (id) => document.getElementById(id);
var docTitle = $("docTitle");
var status = $("status");
var slideNumEl = $("slideNum");
var thumbsEl = $("thumbs");
var savedBytes = null;
var savedName = "apresentacao.pptx";
var menus = [["menuFile", "ddFile"], ["menuInsert", "ddInsert"], ["menuPresent", "ddPresent"]];
for (const [btn, dd] of menus) {
  $(btn).addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = $(dd).classList.contains("show");
    closeMenus();
    if (!wasOpen) {
      $(dd).classList.add("show");
      $(btn).classList.add("open");
    }
  });
}
function closeMenus() {
  for (const [btn, dd] of menus) {
    $(dd).classList.remove("show");
    $(btn).classList.remove("open");
  }
}
document.addEventListener("click", closeMenus);
var applyTheme = (dark) => {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("us-theme", dark ? "dark" : "light");
};
$("darkToggle").addEventListener("click", () => applyTheme(!document.documentElement.classList.contains("dark")));
applyTheme(localStorage.getItem("us-theme") === "dark");
function setStatus(msg, ms = 1800) {
  status.textContent = msg;
  if (ms) setTimeout(() => {
    if (status.textContent === msg) status.textContent = "Pronto";
  }, ms);
}
function setTitle(name) {
  docTitle.value = name.replace(/\.pptx?$/i, "");
  document.title = `${docTitle.value} \u2014 Universal Slides`;
  savedName = name;
}
function openBytes(bytes, name) {
  try {
    if (isCfb(bytes)) {
      bytes = convertPptToPptx(bytes);
      name = name.replace(/\.ppt$/i, ".pptx");
    }
    us.loadPptx(bytes);
  } catch (e) {
    setStatus(`\u26A0 "${name}" n\xE3o abriu: ${e instanceof Error ? e.message : String(e)}`);
    console.error(e);
    return;
  }
  savedBytes = bytes;
  setTitle(name);
  setStatus(`"${name}" aberto \u2713`);
  renderThumbnails();
}
async function actionOpen() {
  closeMenus();
  if ("showOpenFilePicker" in window) {
    try {
      const [h] = await window.showOpenFilePicker({
        types: [{ description: "Apresenta\xE7\xE3o", accept: {
          "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
          "application/vnd.ms-powerpoint": [".ppt"]
        } }]
      });
      const file = await h.getFile();
      openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      return;
    } catch {
      return;
    }
  }
  $("pptxFile").click();
}
$("pptxFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (file) openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  e.target.value = "";
});
function actionSave(saveAs = false) {
  closeMenus();
  if (!savedBytes) {
    setStatus("\u26A0 Nada para salvar");
    return;
  }
  const suggested = saveAs ? `${docTitle.value}.pptx` : savedName;
  downloadBlob(savedBytes, suggested, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  setStatus(`"${suggested}" baixado \u2713`);
}
function downloadBlob(data, filename, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
}
$("actNew").addEventListener("click", () => {
  closeMenus();
  setStatus("Novo: em breve");
});
$("actOpen").addEventListener("click", () => void actionOpen());
$("actSave").addEventListener("click", () => actionSave(false));
$("actSaveAs").addEventListener("click", () => actionSave(true));
$("actPrint").addEventListener("click", () => {
  closeMenus();
  window.print();
});
$("primaryOpen").addEventListener("click", () => void actionOpen());
for (const id of ["actInsSlide", "actInsImage", "actInsShape", "actInsText"])
  $(id).addEventListener("click", () => {
    closeMenus();
    setStatus("Edi\xE7\xE3o de slide: em breve");
  });
$("actPlayBegin").addEventListener("click", () => {
  closeMenus();
  play(0);
});
$("actPlayHere").addEventListener("click", () => {
  closeMenus();
  play(us.getSlideIndex());
});
$("play").addEventListener("click", () => play(us.getSlideIndex()));
function play(from) {
  if (!savedBytes) {
    setStatus("\u26A0 Nada para apresentar");
    return;
  }
  const pv = document.createElement("universal-presentation-viewer");
  pv.style.cssText = "position:fixed;inset:0;z-index:100;background:#000;";
  document.body.appendChild(pv);
  pv.loadPptx(savedBytes);
  pv.selectSlide(from);
  const close = () => {
    pv.remove();
    document.removeEventListener("fullscreenchange", onFsChange);
    document.removeEventListener("keydown", onKey, true);
    us.selectSlide(pv.getSlideIndex());
  };
  const onFsChange = () => {
    if (!document.fullscreenElement) close();
  };
  const onKey = (e) => {
    if (e.key === "Escape" && !document.fullscreenElement) {
      e.preventDefault();
      close();
    }
  };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("keydown", onKey, true);
  pv.present();
}
$("prev").addEventListener("click", () => us.prev());
$("next").addEventListener("click", () => us.next());
$("prev2").addEventListener("click", () => us.prev());
$("next2").addEventListener("click", () => us.next());
$("zoomFit").addEventListener("click", () => {
  setStatus("Ajustado");
});
$("undo").addEventListener("click", () => setStatus("Desfazer: em breve"));
$("redo").addEventListener("click", () => setStatus("Refazer: em breve"));
document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase();
    if (k === "o") {
      e.preventDefault();
      void actionOpen();
    } else if (k === "s") {
      e.preventDefault();
      actionSave(e.shiftKey);
    } else if (k === "p") {
      e.preventDefault();
      window.print();
    }
    return;
  }
  if (e.key === "F5") {
    e.preventDefault();
    play(e.shiftKey ? us.getSlideIndex() : 0);
  }
});
var dragDepth = 0;
document.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragDepth++;
  $("dropOverlay").classList.add("show");
});
document.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $("dropOverlay").classList.remove("show");
  }
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragDepth = 0;
  $("dropOverlay").classList.remove("show");
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  if (/\.pptx$/i.test(file.name)) openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  else setStatus(`\u26A0 "${file.name}" n\xE3o parece ser .pptx`);
});
function renderThumbnails() {
  const total = us.getSlideCount();
  thumbsEl.replaceChildren();
  for (let i2 = 0; i2 < total; i2++) {
    const wrap = document.createElement("div");
    wrap.className = "thumb" + (i2 === us.getSlideIndex() ? " active" : "");
    wrap.dataset.idx = String(i2);
    const c = document.createElement("canvas");
    wrap.appendChild(c);
    const num2 = document.createElement("span");
    num2.className = "num";
    num2.textContent = String(i2 + 1);
    wrap.appendChild(num2);
    wrap.addEventListener("click", () => us.selectSlide(i2));
    thumbsEl.appendChild(wrap);
  }
  paintAllThumbs();
}
function paintAllThumbs() {
  const total = us.getSlideCount();
  for (let i2 = 0; i2 < total; i2++) {
    const wrap = thumbsEl.children[i2];
    if (!wrap) continue;
    const canvas = wrap.querySelector("canvas");
    us.renderThumbnail(i2, canvas);
  }
}
function updateActiveThumb() {
  for (const el2 of thumbsEl.querySelectorAll(".thumb")) {
    el2.classList.toggle("active", Number(el2.dataset.idx) === us.getSlideIndex());
  }
  const active = thumbsEl.querySelector(".thumb.active");
  active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
us.addEventListener("us-loaded", ((e) => {
  slideNumEl.textContent = `1 / ${e.detail.count}`;
}));
us.addEventListener("us-slide", ((e) => {
  slideNumEl.textContent = `${e.detail.index + 1} / ${us.getSlideCount()}`;
  updateActiveThumb();
}));
us.addEventListener("us-image", (() => {
  paintAllThumbs();
}));
(async () => {
  try {
    const res = await fetch("/samples/showcase_animado.pptx");
    if (res.ok) {
      openBytes(new Uint8Array(await res.arrayBuffer()), "showcase_animado.pptx");
      return;
    }
  } catch {
  }
  try {
    const res = await fetch("/samples/reference.pptx");
    if (res.ok) openBytes(new Uint8Array(await res.arrayBuffer()), "reference.pptx");
  } catch {
    setStatus("Arraste um .pptx para come\xE7ar", 0);
  }
})();
