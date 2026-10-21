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
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
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
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
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
    let attrs = {};
    let ren = parentRen;
    let declares = false;
    const scope = () => {
      let own2 = null;
      for (const k in declares ? attrs : {}) {
        if (!k.startsWith("xmlns:")) continue;
        const pfx = k.slice(6);
        const uri = attrs[k];
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
      for (const k in attrs) out[k.startsWith("xmlns:") ? k : renamed(k, ren)] = attrs[k];
      attrs = out;
    };
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      if (xml[i2] === "/") {
        if (xml[i2 + 1] !== ">") error("esperava />");
        i2 += 2;
        scope();
        const el = { name, attrs, children: [] };
        if (RAW_CAPTURE.has(name)) el.raw = xml.slice(elStart, i2);
        if (pos) {
          el.s = elStart;
          el.cs = i2;
          el.ce = i2;
          el.e = i2;
        }
        return el;
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
      attrs[aName] = decodeEntities(xml.slice(vStart, i2));
      if (aName.startsWith("xmlns:")) declares = true;
      i2++;
    }
    const contentStart = i2;
    const children = [];
    for (; ; ) {
      if (i2 >= n) error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        const contentEnd = i2;
        const close = xml.indexOf(">", i2);
        i2 = close + 1;
        const el = { name, attrs, children };
        if (RAW_CAPTURE.has(name)) el.raw = xml.slice(elStart, i2);
        if (pos) {
          el.s = elStart;
          el.cs = contentStart;
          el.ce = contentEnd;
          el.e = i2;
        }
        return el;
      }
      if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2) + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", i2)) {
        const end = xml.indexOf("]]>", i2);
        children.push(xml.slice(i2 + 9, end));
        i2 = end + 3;
        continue;
      }
      if (xml[i2] === "<") {
        children.push(parseElement(ren));
        continue;
      }
      const tStart = i2;
      while (i2 < n && xml[i2] !== "<") i2++;
      const text = decodeEntities(xml.slice(tStart, i2));
      if (text.length > 0) children.push(text);
    }
  }
  skipMisc();
  const root = parseElement(NO_RENAMES);
  return root;
}
function childElements(el, name) {
  return el.children.filter(
    (c) => typeof c !== "string" && (name === void 0 || c.name === name)
  );
}
function firstChild(el, name) {
  return childElements(el, name)[0];
}

// ../docx-core/src/ooxml/props.ts
var int = (v) => {
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
function onOffVal(el) {
  const v = el.attrs["w:val"];
  return !(v === "0" || v === "false" || v === "off" || v === "none");
}
function colorOf(el) {
  const c = {};
  if (el.attrs["w:val"] !== void 0) c.val = el.attrs["w:val"];
  if (el.attrs["w:themeColor"]) c.themeColor = el.attrs["w:themeColor"];
  if (el.attrs["w:themeTint"]) c.themeTint = el.attrs["w:themeTint"];
  if (el.attrs["w:themeShade"]) c.themeShade = el.attrs["w:themeShade"];
  return c;
}
function readBorder(el) {
  if (!el) return void 0;
  const b = { val: el.attrs["w:val"] ?? "single" };
  const sz = int(el.attrs["w:sz"]);
  if (sz !== void 0) b.sz = sz;
  const space = int(el.attrs["w:space"]);
  if (space !== void 0) b.space = space;
  if (el.attrs["w:color"]) b.color = el.attrs["w:color"];
  if (el.attrs["w:themeColor"]) b.themeColor = el.attrs["w:themeColor"];
  if (el.attrs["w:themeTint"]) b.themeTint = el.attrs["w:themeTint"];
  if (el.attrs["w:themeShade"]) b.themeShade = el.attrs["w:themeShade"];
  if (el.attrs["w:shadow"] !== void 0) b.shadow = onOffAttr(el.attrs["w:shadow"]);
  if (el.attrs["w:frame"] !== void 0) b.frame = onOffAttr(el.attrs["w:frame"]);
  return b;
}
var onOffAttr = (v) => !(v === "0" || v === "false" || v === "off");
function readShading(el) {
  if (!el) return void 0;
  const s = {};
  for (const k of ["val", "color", "fill", "themeFill", "themeFillTint", "themeFillShade", "themeColor"]) {
    const v = el.attrs[`w:${k}`];
    if (v !== void 0) s[k] = v;
  }
  return s;
}
function readWidth(el) {
  if (!el) return void 0;
  const type = el.attrs["w:type"] ?? "dxa";
  const raw = el.attrs["w:w"] ?? "0";
  let w;
  if (raw.endsWith("%")) w = Math.round(parseFloat(raw) * 50);
  else w = type === "dxa" ? measureTwips(raw) ?? 0 : int(raw) ?? 0;
  return { w, type: type === "pct" || type === "auto" || type === "nil" ? type : "dxa" };
}
function readRPr(rPr) {
  if (!rPr) return void 0;
  const p = {};
  for (const el of childElements(rPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:rStyle":
        if (val) p.rStyle = val;
        break;
      case "w:rFonts": {
        const f = {};
        for (const k of ["ascii", "hAnsi", "eastAsia", "cs", "asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme", "hint"]) {
          const v = el.attrs[`w:${k}`];
          if (v !== void 0) f[k] = v;
        }
        p.rFonts = f;
        break;
      }
      case "w:b":
        p.b = onOffVal(el);
        break;
      case "w:bCs":
        p.bCs = onOffVal(el);
        break;
      case "w:i":
        p.i = onOffVal(el);
        break;
      case "w:iCs":
        p.iCs = onOffVal(el);
        break;
      case "w:caps":
        p.caps = onOffVal(el);
        break;
      case "w:smallCaps":
        p.smallCaps = onOffVal(el);
        break;
      case "w:strike":
        p.strike = onOffVal(el);
        break;
      case "w:dstrike":
        p.dstrike = onOffVal(el);
        break;
      case "w:outline":
        p.outline = onOffVal(el);
        break;
      case "w:shadow":
        p.shadow = onOffVal(el);
        break;
      case "w:emboss":
        p.emboss = onOffVal(el);
        break;
      case "w:imprint":
        p.imprint = onOffVal(el);
        break;
      case "w:vanish":
        p.vanish = onOffVal(el);
        break;
      case "w:specVanish":
        p.specVanish = onOffVal(el);
        break;
      case "w:webHidden":
        p.webHidden = onOffVal(el);
        break;
      case "w:noProof":
        p.noProof = onOffVal(el);
        break;
      case "w:snapToGrid":
        p.snapToGrid = onOffVal(el);
        break;
      case "w:rtl":
        p.rtl = onOffVal(el);
        break;
      case "w:cs":
        p.cs = onOffVal(el);
        break;
      case "w:color":
        p.color = colorOf(el);
        break;
      case "w14:textFill": {
        const solid = firstChild(el, "w14:solidFill");
        const clr = solid && (firstChild(solid, "w14:srgbClr") ?? firstChild(solid, "w14:schemeClr"));
        if (clr) {
          const tf = {};
          const v = clr.attrs["w14:val"];
          if (clr.name === "w14:srgbClr" && v) tf.color = v.toUpperCase();
          else if (v) tf.themeColor = v;
          const a = firstChild(clr, "w14:alpha")?.attrs["w14:val"];
          if (a !== void 0) tf.alpha = Math.max(0, 1 - (parseInt(a, 10) || 0) / 1e5);
          p.textFill = tf;
        } else if (firstChild(el, "w14:noFill")) p.textFill = { alpha: 0 };
        break;
      }
      case "w14:ligatures":
        p.ligatures = el.attrs["w14:val"] ?? "standard";
        break;
      case "w14:shadow": {
        const emu = (k) => (parseInt(el.attrs[k] ?? "0", 10) || 0) / 12700;
        p.textShadow = { blur: emu("w14:blurRad"), dist: emu("w14:dist"), dir: (parseInt(el.attrs["w14:dir"] ?? "0", 10) || 0) / 6e4 };
        break;
      }
      case "w14:textOutline":
        p.textOutline = !firstChild(el, "w14:noFill") && !!(firstChild(el, "w14:solidFill") ?? firstChild(el, "w14:gradFill"));
        break;
      case "w:spacing": {
        const n = measureTwips(val);
        if (n !== void 0) p.spacing = n;
        break;
      }
      case "w:w": {
        const n = int(val?.replace("%", ""));
        if (n !== void 0) p.w = n;
        break;
      }
      case "w:kern": {
        const n = int(val);
        if (n !== void 0) p.kern = n;
        break;
      }
      case "w:position": {
        const n = int(val);
        if (n !== void 0) p.position = n;
        break;
      }
      case "w:sz": {
        const n = int(val);
        if (n !== void 0) p.sz = n;
        break;
      }
      case "w:szCs": {
        const n = int(val);
        if (n !== void 0) p.szCs = n;
        break;
      }
      case "w:highlight":
        if (val) p.highlight = val;
        break;
      case "w:u": {
        const u = { val: val ?? "single" };
        if (el.attrs["w:color"]) u.color = el.attrs["w:color"];
        if (el.attrs["w:themeColor"]) u.themeColor = el.attrs["w:themeColor"];
        p.u = u;
        break;
      }
      case "w:effect":
        if (val) p.effect = val;
        break;
      case "w:bdr":
        p.bdr = readBorder(el);
        break;
      case "w:shd":
        p.shd = readShading(el);
        break;
      case "w:vertAlign":
        if (val === "superscript" || val === "subscript" || val === "baseline") p.vertAlign = val;
        break;
      case "w:em":
        if (val) p.em = val;
        break;
      case "w:lang": {
        const l = {};
        if (el.attrs["w:val"]) l.val = el.attrs["w:val"];
        if (el.attrs["w:eastAsia"]) l.eastAsia = el.attrs["w:eastAsia"];
        if (el.attrs["w:bidi"]) l.bidi = el.attrs["w:bidi"];
        p.lang = l;
        break;
      }
    }
  }
  return p;
}
function readPBdr(el) {
  if (!el) return void 0;
  const b = {};
  for (const side of ["top", "left", "bottom", "right", "between", "bar"]) {
    const e = readBorder(firstChild(el, `w:${side}`) ?? (side === "left" ? firstChild(el, "w:start") : side === "right" ? firstChild(el, "w:end") : void 0));
    if (e) b[side] = e;
  }
  return b;
}
var TAB_VALS = /* @__PURE__ */ new Set(["left", "center", "right", "decimal", "bar", "clear", "num", "start", "end"]);
var LEADERS = /* @__PURE__ */ new Set(["none", "dot", "hyphen", "underscore", "heavy", "middleDot"]);
function readPPr(pPr) {
  if (!pPr) return void 0;
  const p = {};
  for (const el of childElements(pPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:pStyle":
        if (val) p.pStyle = val;
        break;
      case "w:keepNext":
        p.keepNext = onOffVal(el);
        break;
      case "w:keepLines":
        p.keepLines = onOffVal(el);
        break;
      case "w:pageBreakBefore":
        p.pageBreakBefore = onOffVal(el);
        break;
      case "w:widowControl":
        p.widowControl = onOffVal(el);
        break;
      case "w:suppressLineNumbers":
        p.suppressLineNumbers = onOffVal(el);
        break;
      case "w:suppressAutoHyphens":
        p.suppressAutoHyphens = onOffVal(el);
        break;
      case "w:kinsoku":
        p.kinsoku = onOffVal(el);
        break;
      case "w:wordWrap":
        p.wordWrap = onOffVal(el);
        break;
      case "w:overflowPunct":
        p.overflowPunct = onOffVal(el);
        break;
      case "w:autoSpaceDE":
        p.autoSpaceDE = onOffVal(el);
        break;
      case "w:autoSpaceDN":
        p.autoSpaceDN = onOffVal(el);
        break;
      case "w:bidi":
        p.bidi = onOffVal(el);
        break;
      case "w:adjustRightInd":
        p.adjustRightInd = onOffVal(el);
        break;
      case "w:snapToGrid":
        p.snapToGrid = onOffVal(el);
        break;
      case "w:contextualSpacing":
        p.contextualSpacing = onOffVal(el);
        break;
      case "w:mirrorIndents":
        p.mirrorIndents = onOffVal(el);
        break;
      case "w:suppressOverlap":
        p.suppressOverlap = onOffVal(el);
        break;
      case "w:jc":
        if (val) p.jc = val;
        break;
      case "w:textAlignment":
        if (val) p.textAlignment = val;
        break;
      case "w:outlineLvl": {
        const n = int(val);
        if (n !== void 0) p.outlineLvl = n;
        break;
      }
      case "w:numPr": {
        const numPr = {};
        const numId = int(firstChild(el, "w:numId")?.attrs["w:val"]);
        const ilvl = int(firstChild(el, "w:ilvl")?.attrs["w:val"]);
        if (numId !== void 0) numPr.numId = numId;
        if (ilvl !== void 0) numPr.ilvl = ilvl;
        p.numPr = numPr;
        break;
      }
      case "w:pBdr":
        p.pBdr = readPBdr(el);
        break;
      case "w:shd":
        p.shd = readShading(el);
        break;
      case "w:tabs": {
        const tabs = [];
        for (const t of childElements(el, "w:tab")) {
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
        const a = el.attrs;
        const before = measureTwips(a["w:before"]);
        if (before !== void 0) s.before = before;
        const after = measureTwips(a["w:after"]);
        if (after !== void 0) s.after = after;
        const bl = int(a["w:beforeLines"]);
        if (bl !== void 0) s.beforeLines = bl;
        const al = int(a["w:afterLines"]);
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
        const a = el.attrs;
        const left = measureTwips(a["w:left"] ?? a["w:start"]);
        if (left !== void 0) s.left = left;
        const right = measureTwips(a["w:right"] ?? a["w:end"]);
        if (right !== void 0) s.right = right;
        const hanging = measureTwips(a["w:hanging"]);
        if (hanging !== void 0) s.hanging = hanging;
        const firstLine = measureTwips(a["w:firstLine"]);
        if (firstLine !== void 0) s.firstLine = firstLine;
        for (const k of ["leftChars", "rightChars", "hangingChars", "firstLineChars"]) {
          const n = int(a[`w:${k}`] ?? (k === "leftChars" ? a["w:startChars"] : k === "rightChars" ? a["w:endChars"] : void 0));
          if (n !== void 0) s[k] = n;
        }
        p.ind = s;
        break;
      }
      case "w:framePr": {
        const a = el.attrs;
        const f = {};
        const dc = a["w:dropCap"];
        if (dc === "none" || dc === "drop" || dc === "margin") f.dropCap = dc;
        for (const k of ["lines", "w", "h", "hSpace", "vSpace", "x", "y"]) {
          const n = k === "lines" ? int(a[`w:${k}`]) : measureTwips(a[`w:${k}`]);
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
        p.rPr = readRPr(el);
        if (childElements(el).some((c) => c.name === "w:del" || c.name === "w:moveFrom")) p.markDeleted = true;
        break;
    }
  }
  return p;
}
function readBorders(el) {
  if (!el) return void 0;
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
      const e = readBorder(firstChild(el, n));
      if (e) {
        b[k] = e;
        break;
      }
    }
  }
  return b;
}
function readCellMar(el) {
  if (!el) return void 0;
  const m = {};
  const t = readWidth(firstChild(el, "w:top"));
  if (t) m.top = t;
  const l = readWidth(firstChild(el, "w:left") ?? firstChild(el, "w:start"));
  if (l) m.left = l;
  const b = readWidth(firstChild(el, "w:bottom"));
  if (b) m.bottom = b;
  const r = readWidth(firstChild(el, "w:right") ?? firstChild(el, "w:end"));
  if (r) m.right = r;
  return m;
}
function readTblPr(tblPr) {
  if (!tblPr) return void 0;
  const p = {};
  for (const el of childElements(tblPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:tblStyle":
        if (val) p.tblStyle = val;
        break;
      case "w:tblpPr": {
        const a = el.attrs;
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
        if (val) p.tblOverlap = val;
        break;
      case "w:bidiVisual":
        p.bidiVisual = onOffVal(el);
        break;
      case "w:tblStyleRowBandSize": {
        const n = int(val);
        if (n !== void 0) p.tblStyleRowBandSize = n;
        break;
      }
      case "w:tblStyleColBandSize": {
        const n = int(val);
        if (n !== void 0) p.tblStyleColBandSize = n;
        break;
      }
      case "w:tblW":
        p.tblW = readWidth(el);
        break;
      case "w:jc":
        if (val) p.jc = val;
        break;
      case "w:tblCellSpacing":
        p.tblCellSpacing = readWidth(el);
        break;
      case "w:tblInd":
        p.tblInd = readWidth(el);
        break;
      case "w:tblBorders":
        p.tblBorders = readBorders(el);
        break;
      case "w:shd":
        p.shd = readShading(el);
        break;
      case "w:tblLayout":
        p.tblLayout = el.attrs["w:type"] === "fixed" ? "fixed" : "autofit";
        break;
      case "w:tblCellMar":
        p.tblCellMar = readCellMar(el);
        break;
      case "w:tblLook": {
        const a = el.attrs;
        const look = {};
        const hex = parseInt(a["w:val"] ?? "", 16);
        if (Number.isFinite(hex)) {
          look.firstRow = (hex & 32) !== 0;
          look.lastRow = (hex & 64) !== 0;
          look.firstColumn = (hex & 128) !== 0;
          look.lastColumn = (hex & 256) !== 0;
          look.noHBand = (hex & 512) !== 0;
          look.noVBand = (hex & 1024) !== 0;
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
  for (const el of childElements(trPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:cnfStyle":
        if (val) p.cnfStyle = val;
        break;
      case "w:gridBefore": {
        const n = int(val);
        if (n !== void 0) p.gridBefore = n;
        break;
      }
      case "w:gridAfter": {
        const n = int(val);
        if (n !== void 0) p.gridAfter = n;
        break;
      }
      case "w:wBefore":
        p.wBefore = readWidth(el);
        break;
      case "w:wAfter":
        p.wAfter = readWidth(el);
        break;
      case "w:cantSplit":
        p.cantSplit = onOffVal(el);
        break;
      case "w:trHeight": {
        const v = measureTwips(val) ?? 0;
        const r = el.attrs["w:hRule"];
        p.trHeight = { val: v, hRule: r === "exact" || r === "auto" ? r : "atLeast" };
        break;
      }
      case "w:tblHeader":
        p.tblHeader = onOffVal(el);
        break;
      case "w:tblCellSpacing":
        p.tblCellSpacing = readWidth(el);
        break;
      case "w:jc":
        if (val) p.jc = val;
        break;
      case "w:hidden":
        p.hidden = onOffVal(el);
        break;
    }
  }
  return p;
}
function readTcPr(tcPr) {
  if (!tcPr) return void 0;
  const p = {};
  for (const el of childElements(tcPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:cnfStyle":
        if (val) p.cnfStyle = val;
        break;
      case "w:tcW":
        p.tcW = readWidth(el);
        break;
      case "w:gridSpan": {
        const n = int(val);
        if (n !== void 0) p.gridSpan = n;
        break;
      }
      case "w:hMerge":
        p.hMerge = val === "restart" ? "restart" : "continue";
        break;
      case "w:vMerge":
        p.vMerge = val === "restart" ? "restart" : "continue";
        break;
      case "w:tcBorders":
        p.tcBorders = readBorders(el);
        break;
      case "w:shd":
        p.shd = readShading(el);
        break;
      case "w:noWrap":
        p.noWrap = onOffVal(el);
        break;
      case "w:tcMar":
        p.tcMar = readCellMar(el);
        break;
      case "w:textDirection":
        if (val) p.textDirection = val;
        break;
      case "w:tcFitText":
        p.tcFitText = onOffVal(el);
        break;
      case "w:vAlign":
        if (val === "top" || val === "center" || val === "bottom" || val === "both") p.vAlign = val;
        break;
      case "w:hideMark":
        p.hideMark = onOffVal(el);
        break;
    }
  }
  return p;
}

// ../docx-core/src/drawing.ts
var EMU_PER_TWIP_D = 635;
var emuTw = (v) => {
  if (v === void 0 || v === "") return void 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n / EMU_PER_TWIP_D : void 0;
};
function findDeep(el, name) {
  for (const c of childElements(el)) {
    if (c.name === name) return c;
    const f = findDeep(c, name);
    if (f) return f;
  }
  return void 0;
}
function textOf(el) {
  let s = "";
  for (const c of el.children) s += typeof c === "string" ? c : textOf(c);
  return s;
}
function readPos(el, defFrom) {
  const pos = { relativeFrom: el?.attrs["relativeFrom"] ?? defFrom };
  if (!el) return pos;
  const align = firstChild(el, "wp:align");
  if (align) pos.align = textOf(align).trim();
  const off = firstChild(el, "wp:posOffset");
  if (off) pos.offset = (parseInt(textOf(off).trim(), 10) || 0) / EMU_PER_TWIP_D;
  const pct = firstChild(el, "wp14:pctPosHOffset") ?? firstChild(el, "wp14:pctPosVOffset");
  if (pct) pos.pct = parseInt(textOf(pct).trim(), 10) || 0;
  return pos;
}
function readWpAnchor(anchor) {
  if (!anchor) return void 0;
  const a = anchor.attrs;
  let wrap = "none";
  let wrapText;
  let wrapBox;
  const polyBox = (w) => {
    const poly = firstChild(w, "wp:wrapPolygon");
    if (!poly) return void 0;
    const pts = childElements(poly).filter((e) => e.name === "wp:start" || e.name === "wp:lineTo").map((e) => [parseInt(e.attrs["x"] ?? "0", 10) || 0, parseInt(e.attrs["y"] ?? "0", 10) || 0]);
    if (pts.length < 3) return void 0;
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return { x0: Math.min(...xs) / 21600, y0: Math.min(...ys) / 21600, x1: Math.max(...xs) / 21600, y1: Math.max(...ys) / 21600 };
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
    posH: readPos(firstChild(anchor, "wp:positionH"), "column"),
    posV: readPos(firstChild(anchor, "wp:positionV"), "paragraph")
  };
  if (wrapText) out.wrapText = wrapText;
  if (wrapBox) out.wrapBox = wrapBox;
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
function srgbOf(el, theme) {
  if (!el) return void 0;
  const c = firstChild(el, "a:srgbClr") ?? firstChild(el, "a:schemeClr") ?? firstChild(el, "a:sysClr") ?? firstChild(el, "a:prstClr");
  if (!c) return void 0;
  let hex;
  if (c.name === "a:srgbClr") hex = c.attrs["val"];
  else if (c.name === "a:sysClr") hex = c.attrs["lastClr"] ?? (c.attrs["val"] === "window" ? "FFFFFF" : "000000");
  else if (c.name === "a:schemeClr") {
    const key = c.attrs["val"] ?? "";
    const map = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
    hex = own(theme, own(map, key) ?? key) ?? `@${key}`;
  } else if (c.name === "a:prstClr") {
    const named = { black: "000000", white: "FFFFFF", red: "FF0000", green: "00FF00", blue: "0000FF", yellow: "FFFF00", gray: "808080" };
    hex = own(named, c.attrs["val"] ?? "") ?? "000000";
  }
  if (!hex) return void 0;
  const alphaEl = firstChild(c, "a:alpha");
  const out = { hex: hex.startsWith("@") ? hex : hex.toUpperCase() };
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
    const lin = findDeep(gf, "a:lin");
    if (from && to) {
      st.gradient = { from: from.hex, to: to.hex, angleDeg: (parseInt(lin?.attrs["ang"] ?? "0", 10) || 0) / 6e4 };
      const g = st.gradient;
      g.stops = stops.map((s) => ({ pos: (parseInt(s.attrs["pos"] ?? "0", 10) || 0) / 1e5, color: srgbOf(s)?.hex ?? "000000" })).sort((a, b) => a.pos - b.pos);
      if (lin && lin.attrs["scaled"] !== void 0) g.scaled = lin.attrs["scaled"] === "1" || lin.attrs["scaled"] === "true";
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
  } else if (styleEl) {
    const fillRef = firstChild(styleEl, "a:fillRef");
    if (fillRef && fillRef.attrs["idx"] !== "0") {
      const c = srgbOf(fillRef);
      if (c) st.fill = c.hex;
    }
  }
  const eff = firstChild(spPr, "a:effectLst");
  const shd = eff && firstChild(eff, "a:outerShdw");
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
function vmlShapeStyle(el, geom) {
  const st = { geom };
  const a = el.attrs;
  const fillEl = firstChild(el, "v:fill");
  const strokeEl = firstChild(el, "v:stroke");
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
  const num = (s) => {
    if (s === void 0) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : own(v, s) ?? 0;
  };
  const rad = (a) => a / 6e4 * (Math.PI / 180);
  const evalGd = (f) => {
    const [op, ...a] = f.trim().split(/\s+/);
    const [x2 = 0, y = 0, z = 0] = a.map(num);
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
    const el = firstChild(cg, lst);
    for (const gd of el ? childElements(el, "a:gd") : []) {
      const name = gd.attrs["name"];
      if (name) v[name] = evalGd(gd.attrs["fmla"] ?? "val 0");
    }
  }
  const out = [];
  const pl = firstChild(cg, "a:pathLst");
  for (const p of pl ? childElements(pl, "a:path") : []) {
    const path = {
      w: num(p.attrs["w"]) || w,
      h: num(p.attrs["h"]) || h,
      fill: p.attrs["fill"] !== "none",
      stroke: p.attrs["stroke"] !== "0" && p.attrs["stroke"] !== "false",
      cmds: []
    };
    const pts = (el) => childElements(el, "a:pt").map((q) => [num(q.attrs["x"]), num(q.attrs["y"])]);
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
          path.cmds.push({ op: "A", wR: num(c.attrs["wR"]), hR: num(c.attrs["hR"]), st: num(c.attrs["stAng"]) / 6e4, sw: num(c.attrs["swAng"]) / 6e4 });
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
function vmlImageEffects(el) {
  const a = el.attrs;
  const fx = {};
  const gain = vmlFixed(a["gain"]), bl = vmlFixed(a["blacklevel"]);
  if (gain !== void 0 && gain !== 1) fx.gain = gain;
  if (bl) fx.bright = 2 * bl;
  if (a["grayscale"] === "t" || a["grayscale"] === "true") fx.gray = true;
  if (a["bilevel"] === "t" || a["bilevel"] === "true") fx.biLevel = 0.5;
  return Object.keys(fx).length ? fx : void 0;
}
function blipImageEffects(blip) {
  const fx = {};
  const lum = firstChild(blip, "a:lum");
  if (lum) {
    const b = (parseInt(lum.attrs["bright"] ?? "0", 10) || 0) / 1e5;
    const c = Math.max(-1, Math.min(0.999, (parseInt(lum.attrs["contrast"] ?? "0", 10) || 0) / 1e5));
    if (c) fx.gain = c > 0 ? 1 / (1 - c) : 1 + c;
    if (b) fx.bright = b;
    if (b || c) fx.floor = true;
  }
  if (firstChild(blip, "a:grayscl")) fx.gray = true;
  const bi = firstChild(blip, "a:biLevel");
  if (bi) fx.biLevel = (parseInt(bi.attrs["thresh"] ?? "50000", 10) || 0) / 1e5;
  return Object.keys(fx).length ? fx : void 0;
}
var EMU_PER_TWIP = 635;
function readBorderEdge(el) {
  if (!el) return void 0;
  const style = el.attrs["w:val"];
  if (!style || style === "none" || style === "nil") return void 0;
  const color = el.attrs["w:color"];
  return {
    style,
    sizeEighthPt: parseInt(el.attrs["w:sz"] ?? "4", 10),
    color: color && color !== "auto" ? color : void 0,
    spacePt: parseInt(el.attrs["w:space"] ?? "0", 10)
  };
}
function runPropsFromRPr(rpr) {
  const p = { ...DEFAULT_RUN_PROPS };
  if (!rpr) return p;
  if (rpr.b !== void 0) p.bold = rpr.b;
  if (rpr.i !== void 0) p.italic = rpr.i;
  if (rpr.u) {
    const val = rpr.u.val;
    p.underline = val !== "none" && val !== "";
    if (val === "double" || val === "dotted" || val === "dash" || val === "wave" || val === "thick") p.underlineStyle = val;
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
  return p;
}
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
  }
  if (ppr.shd?.fill && ppr.shd.fill !== "auto") props.shadingHex = ppr.shd.fill;
  if (ppr.tabs) {
    const stops = ppr.tabs.filter((t) => t.pos > 0 && t.val !== "clear" && t.val !== "bar").map((t) => ({
      posTwips: t.pos,
      align: t.val === "right" ? "right" : "left",
      leader: t.leader === "dot" ? "dot" : void 0
    }));
    if (stops.length) props.tabStops = stops;
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
  if (ppr.pageBreakBefore) props.pageBreakBefore = true;
  if (ppr.framePr?.dropCap && ppr.framePr.dropCap !== "none") props.dropCap = true;
  return props;
}
function findDeep2(el, name) {
  for (const c of childElements(el)) {
    if (c.name === name) return c;
    const found = findDeep2(c, name);
    if (found) return found;
  }
  return void 0;
}
var RPR_EL = /* @__PURE__ */ Symbol("docx-rpr-el");
var rPrElOf = (r) => r?.[RPR_EL];
var setRPrEl = (r, el) => {
  if (el) r[RPR_EL] = el;
};
var OBJ_EL = /* @__PURE__ */ Symbol("docx-obj-el");
var objElOf = (r) => r[OBJ_EL];
function tagObjectRuns(list, from, el) {
  if (!list) return;
  for (let i2 = from; i2 < list.length; i2++) list[i2][OBJ_EL] = i2 === from ? el : true;
}
var INLINE_WRAPPERS = /* @__PURE__ */ new Set(["w:sdt", "w:hyperlink", "w:smartTag", "w:customXml", "w:ins", "w:moveTo", "w:dir", "w:bdo"]);
var OBJ = "\uFFFC";
function readPic(pic, ctx, wTw, hTw) {
  const blip = findDeep2(pic, "a:blip");
  const rid = blip?.attrs["r:embed"] ?? blip?.attrs["r:link"];
  if (!rid) return void 0;
  const media = ctx.resolveImage(rid) ?? { data: new Uint8Array(0), ext: "png" };
  const svgRid = blip && findDeep2(blip, "asvg:svgBlip")?.attrs["r:embed"];
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
  const src = findDeep2(pic, "a:srcRect");
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
  if (findDeep2(bodyPr, "a:spAutoFit")) tb.autoFit = true;
  if (bodyPr.attrs["wrap"] === "none") tb.noWrap = true;
  const insTw = (name, def) => {
    const v = bodyPr.attrs[name];
    return v !== void 0 ? Math.round(parseInt(v, 10) / EMU_PER_TWIP) : def;
  };
  tb.insets = { l: insTw("lIns", 144), t: insTw("tIns", 72), r: insTw("rIns", 144), b: insTw("bIns", 72) };
  const anc = bodyPr.attrs["anchor"];
  if (anc === "t" || anc === "ctr" || anc === "b") tb.vAnchor = anc;
  if (bodyPr.attrs["fromWordArt"] === "1" || bodyPr.attrs["fromWordArt"] === "true") {
    tb.wordArt = firstChild(bodyPr, "a:prstTxWarp")?.attrs["prst"] ?? "textPlain";
  }
}
function textboxBlocks(txbx, ctx, tb) {
  if (ctx.readBlocks) {
    const blocks = ctx.readBlocks(txbx, ctx);
    tb.blocks = blocks;
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
    if (content) {
      const tb = { paras: [], widthTwips: wTw, heightTwips: hTw };
      textboxBlocks(content, ctx, tb);
      bodyPrOf(tb, firstChild(obj, "wps:bodyPr"));
      if (style.fill || style.line || style.gradient) tb.shape = style;
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
    const n = (el, k) => parseInt(el?.attrs[k] ?? "0", 10) || 0;
    const chOff = xfrm && firstChild(xfrm, "a:chOff");
    const chExt = xfrm && firstChild(xfrm, "a:chExt");
    const ext = xfrm && firstChild(xfrm, "a:ext");
    const cw = n(chExt, "cx") || n(ext, "cx");
    const ch = n(chExt, "cy") || n(ext, "cy");
    const sx = cw ? wTw * EMU_PER_TWIP / cw : 1;
    const sy = ch ? hTw * EMU_PER_TWIP / ch : 1;
    const items = [];
    for (const child of childElements(obj)) {
      if (!["wps:wsp", "pic:pic", "wpg:grpSp"].includes(child.name)) continue;
      const cpr = firstChild(child, "wps:spPr") ?? firstChild(child, "pic:spPr") ?? firstChild(child, "wpg:grpSpPr");
      const cx = cpr && firstChild(cpr, "a:xfrm");
      const off = cx && firstChild(cx, "a:off");
      const cext = cx && firstChild(cx, "a:ext");
      const x2 = (n(off, "x") - n(chOff, "x")) * sx / EMU_PER_TWIP;
      const y = (n(off, "y") - n(chOff, "y")) * sy / EMU_PER_TWIP;
      const w = n(cext, "cx") * sx / EMU_PER_TWIP;
      const h = n(cext, "cy") * sy / EMU_PER_TWIP;
      const run = readGraphicObject(child, ctx, w, h);
      if (run) items.push({ x: x2, y, w, h, run: { ...run, props: { ...DEFAULT_RUN_PROPS } } });
    }
    if (!items.length) return void 0;
    const group = { widthTwips: wTw, heightTwips: hTw, items };
    const rot = parseInt(xfrm?.attrs["rot"] ?? "0", 10);
    if (rot) group.rot = rot / 6e4;
    if (xfrm?.attrs["flipH"] === "1") group.flipH = true;
    if (xfrm?.attrs["flipV"] === "1") group.flipV = true;
    return { text: OBJ, group };
  }
  return void 0;
}
function dmlRunColor(el) {
  const c = el && (firstChild(el, "a:srgbClr") ?? firstChild(el, "a:sysClr") ?? firstChild(el, "a:schemeClr") ?? firstChild(el, "a:prstClr"));
  if (!c) return void 0;
  if (c.name === "a:srgbClr") return { val: (c.attrs["val"] ?? "000000").toUpperCase() };
  if (c.name === "a:sysClr") return { val: (c.attrs["lastClr"] ?? (c.attrs["val"] === "window" ? "FFFFFF" : "000000")).toUpperCase() };
  if (c.name === "a:prstClr") return { val: c.attrs["val"] === "white" ? "FFFFFF" : "000000" };
  const spec = { themeColor: c.attrs["val"] ?? "tx1" };
  const frac = (k) => {
    const m = firstChild(c, k);
    return m ? Math.round((parseInt(m.attrs["val"] ?? "100000", 10) || 0) / 1e5 * 255).toString(16).padStart(2, "0").toUpperCase() : void 0;
  };
  const t = frac("a:tint"), sh = frac("a:shade");
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
  const num = (el) => parseInt(el?.attrs["val"] ?? "0", 10) || 0;
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
      const pts = e && firstChild(e, "a:spcPts"), pct = e && firstChild(e, "a:spcPct");
      return pts ? Math.round(num(pts) / 5) : pct ? Math.round(num(pct) / 1e5 * 1.2 * szPt * 20) : 0;
    };
    const ln2 = pPr && firstChild(pPr, "a:lnSpc");
    const lnPct = ln2 && firstChild(ln2, "a:spcPct"), lnPts = ln2 && firstChild(ln2, "a:spcPts");
    const algn = pPr?.attrs["algn"];
    const emu = (k2) => Math.round((parseInt(pPr?.attrs[k2] ?? "0", 10) || 0) / EMU_PER_TWIP);
    const indent = emu("indent");
    const ppr = {
      jc: algn === "ctr" ? "center" : algn === "r" ? "right" : algn === "just" ? "both" : algn === "dist" ? "distribute" : "left",
      spacing: {
        before: k === 0 && !edges ? 0 : gap("a:spcBef"),
        after: k === aps.length - 1 && !edges ? 0 : gap("a:spcAft"),
        ...lnPts ? { line: Math.round(num(lnPts) / 5), lineRule: "exact" } : { line: lnPct ? Math.round(240 * num(lnPct) / 1e5) : 240, lineRule: "auto" }
      },
      ind: { left: emu("marL"), right: 0, ...indent < 0 ? { hanging: -indent } : { firstLine: indent } },
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
  const ext = data && findDeep2(data, "dsp:dataModelExt");
  const drawing = ext && ctx.resolvePart?.(ext.attrs["relId"] ?? "");
  const tree = drawing && findDeep2(drawing, "dsp:spTree");
  if (!tree) return void 0;
  const colors = relIds && ctx.resolvePart?.(relIds.attrs["r:cs"] ?? "");
  const lbls = /* @__PURE__ */ new Map();
  for (const l of colors ? childElements(colors, "dgm:styleLbl") : []) lbls.set(l.attrs["name"] ?? "", l);
  const txFill = /* @__PURE__ */ new Map();
  const ptLst = data && findDeep2(data, "dgm:ptLst");
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
  const n = (el, k) => (parseInt(el?.attrs[k] ?? "0", 10) || 0) / EMU_PER_TWIP;
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
  const wTw = parseInt(extent?.attrs["cx"] ?? "0", 10) / EMU_PER_TWIP;
  const hTw = parseInt(extent?.attrs["cy"] ?? "0", 10) / EMU_PER_TWIP;
  const gd = findDeep2(container, "a:graphicData");
  const obj = gd && childElements(gd).find((c) => ["pic:pic", "wps:wsp", "wpg:wgp", "wpc:wpc"].includes(c.name));
  const dgm = !obj && /\/drawingml\/2006\/diagram$/.test(gd?.attrs["uri"] ?? "");
  if (!obj && !dgm) return void 0;
  const run = obj ? readGraphicObject(obj, ctx, wTw, hTw) : (gd && readDiagram(gd, ctx, wTw, hTw)) ?? { text: OBJ, shape: { style: { geom: "rect" }, widthTwips: wTw, heightTwips: hTw } };
  if (!run) return void 0;
  const anchor = readWpAnchor(anchorEl);
  const target = run.image ?? run.textbox ?? run.shape ?? run.group;
  const ee = !anchorEl ? firstChild(container, "wp:effectExtent") : void 0;
  if (ee && (run.image || run.shape)) {
    const e = (k) => (parseInt(ee.attrs[k] ?? "0", 10) || 0) / EMU_PER_TWIP;
    const v = { l: e("l"), t: e("t"), r: e("r"), b: e("b") };
    if (v.l || v.t || v.r || v.b) (run.image ?? run.shape).inlineEffect = v;
  }
  if (ee && run.group) {
    const e = (k) => (parseInt(ee.attrs[k] ?? "0", 10) || 0) / EMU_PER_TWIP;
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
  return run;
}
function readVmlRuns(container, ctx, inline) {
  const out = [];
  const shapeOf = (el, inGroup) => {
    const st = parseVmlStyle(el.attrs["style"]);
    if (st["visibility"] === "hidden" || st["display"] === "none") return void 0;
    let w = vmlLenTwips(st["width"]) ?? 0;
    let h = vmlLenTwips(st["height"]) ?? 0;
    let anchor = inGroup ? void 0 : vmlAnchor(st, findDeep2(el, "w10:wrap"));
    if (inGroup) {
      w = (parseFloat(st["width"] ?? "0") || 0) * inGroup.sx;
      h = (parseFloat(st["height"] ?? "0") || 0) * inGroup.sy;
    }
    const textpath = findDeep2(el, "v:textpath");
    if (textpath) {
      const text = textpath.attrs["string"] ?? "";
      if (!text.trim()) return void 0;
      const tps = parseVmlStyle(textpath.attrs["style"]);
      const famRaw = (tps["font-family"] ?? "").replace(/^["']|["']$/g, "").trim();
      const sh = vmlShapeStyle(el, "rect");
      let color = sh.fill ?? "000000";
      const a = sh.fillAlpha;
      if (a !== void 0 && a < 1) {
        const mix = (i2) => Math.round(parseInt(color.slice(i2, i2 + 2), 16) * a + 255 * (1 - a));
        color = [0, 2, 4].map((i2) => mix(i2).toString(16).padStart(2, "0")).join("").toUpperCase();
      }
      const rpr = {
        ...famRaw ? { rFonts: { ascii: famRaw, hAnsi: famRaw, cs: famRaw } } : {},
        color: { val: color },
        sz: 72,
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
    const imagedata = firstChild(el, "v:imagedata");
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
      const txb = firstChild(el, "v:textbox");
      const content = txb && firstChild(txb, "w:txbxContent");
      if (content) {
        const tb = { paras: [], widthTwips: w, heightTwips: h, vml: true };
        textboxBlocks(content, ctx, tb);
        const inset = (txb.attrs["inset"] ?? "").split(",");
        const ins = (i2, def) => inset[i2] && inset[i2].trim() ? vmlLenTwips(inset[i2].trim()) ?? def : def;
        tb.insets = { l: ins(0, 144), t: ins(1, 72), r: ins(2, 144), b: ins(3, 72) };
        const tbStyle = parseVmlStyle(txb.attrs["style"]);
        if (tbStyle["mso-fit-shape-to-text"] === "t") tb.autoFit = true;
        if (parseVmlStyle(el.attrs["style"])["mso-wrap-style"] === "none") tb.noWrap = true;
        const sh = vmlShapeStyle(el, "rect");
        if (sh.fill || sh.line) tb.shape = sh;
        run = { text: OBJ, textbox: tb };
      } else {
        const tag = el.name.replace(/^v:/, "");
        const type = el.attrs["type"] ?? "";
        const declared = el.attrs["fillcolor"] || el.attrs["strokecolor"] || el.attrs["filled"] || el.attrs["stroked"] || firstChild(el, "v:fill") || firstChild(el, "v:stroke");
        if (tag === "shape" && (type.includes("_x0000_t75") || !declared)) {
          return void 0;
        }
        const geom = tag === "oval" ? "ellipse" : tag === "roundrect" ? "roundRect" : tag === "line" || type.includes("_x0000_t32") ? "line" : "rect";
        const style = vmlShapeStyle(el, geom);
        if (geom === "line") delete style.fill;
        const shape = { style, widthTwips: w, heightTwips: h };
        if (el.attrs["o:hr"] === "t") shape.hr = true;
        if (tag === "line") {
          const pt = (s) => (s ?? "0,0").split(",").map((v) => vmlLenTwips(v.trim()) ?? 0);
          const [x1 = 0, y1 = 0] = pt(el.attrs["from"]);
          const [x2 = 0, y2 = 0] = pt(el.attrs["to"]);
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
  for (const el of childElements(container)) {
    if (el.name === "v:shapetype" || el.name.startsWith("o:") || el.name.startsWith("w10:")) continue;
    if (el.name === "v:group") {
      const st = parseVmlStyle(el.attrs["style"]);
      const w = vmlLenTwips(st["width"]) ?? 0;
      const h = vmlLenTwips(st["height"]) ?? 0;
      const cs = (el.attrs["coordsize"] ?? "1000,1000").split(",").map((v) => parseFloat(v) || 1e3);
      const co = (el.attrs["coordorigin"] ?? "0,0").split(",").map((v) => parseFloat(v) || 0);
      const sx = w / (cs[0] || 1), sy = h / (cs[1] || 1);
      const items = [];
      for (const c of childElements(el)) {
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
      const group = { widthTwips: w, heightTwips: h, items };
      const anchor = vmlAnchor(st, findDeep2(el, "w10:wrap"));
      if (anchor) {
        group.floating = true;
        group.anchor = anchor;
      }
      out.push({ text: OBJ, group });
      continue;
    }
    if (el.name.startsWith("v:")) {
      const r = shapeOf(el);
      if (r) {
        if (inline && r.image) {
          delete r.image.floating;
          delete r.image.anchor;
        }
        out.push(r);
      }
    }
  }
  return out;
}
function textContentOf(el) {
  let out = "";
  for (const c of el.children) out += typeof c === "string" ? c : textContentOf(c);
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
  if (f.crossed) return;
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
      case "w:bookmarkStart": {
        const name = child.attrs["w:name"];
        if (name) ctx.onBookmark?.(name, runs.reduce((n, r) => n + r.text.length, 0));
        break;
      }
      case "w:r":
        readSingleRun(runs, child, ctx, inherit);
        break;
      case "w:hyperlink": {
        const rid = child.attrs["r:id"];
        const anchor = child.attrs["w:anchor"];
        const link = rid && ctx.resolveLink(rid) || (anchor ? `#${anchor}` : void 0);
        readRunsInto(runs, child, ctx, { ...inherit, link });
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
        const content = findDeep2(child, "w:sdtContent");
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
      case "w:ins":
      case "w:moveTo":
      case "w:customXml":
      case "w:dir":
      case "w:bdo":
        readRunsInto(runs, child, ctx, inherit);
        break;
    }
  }
}
var CUSTOM_INLINE_TAG_PREFIX = "wordnext:inline:";
function parseCustomInlineTag(tag) {
  if (!tag?.startsWith(CUSTOM_INLINE_TAG_PREFIX)) return void 0;
  const payload = tag.slice(CUSTOM_INLINE_TAG_PREFIX.length);
  const split = payload.indexOf(":");
  if (split <= 0) return void 0;
  const type = payload.slice(0, split);
  if (!/^[a-zA-Z0-9._-]+$/.test(type)) return void 0;
  try {
    return { type, data: JSON.parse(decodeURIComponent(payload.slice(split + 1))) };
  } catch {
    return void 0;
  }
}
function readMathNodes(el, out = []) {
  for (const c of childElements(el)) {
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
        const num = firstChild(c, "m:num"), den = firstChild(c, "m:den");
        out.push({ t: "f", num: num ? readMathNodes(num) : [], den: den ? readMathNodes(den) : [], ...type ? { type } : {} });
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
function collectMathText(el) {
  let out = "";
  for (const c of el.children) {
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
    rProps.underline = true;
    rProps.color ??= "0563C1";
  }
  ctx.fieldStack ??= [];
  const stack = ctx.fieldStack;
  const make = (text2, extra) => {
    const props = { ...rProps };
    if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
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
        const frame2 = { instr: "", phase: "instr", runs: [], crossed: false, props: { ...rProps } };
        if (rpr) frame2.rpr = rpr;
        if (rPrEl) frame2.rPrEl = rPrEl;
        const ff = firstChild(child, "w:ffData");
        if (ff) {
          const cb = firstChild(ff, "w:checkBox");
          if (cb) {
            const def = firstChild(cb, "w:default")?.attrs["w:val"];
            const chk = firstChild(cb, "w:checked");
            const size = firstChild(cb, "w:size")?.attrs["w:val"];
            frame2.ff = {
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
            frame2.ff = { type: "dropDown", entries, selected: idx("w:result") ?? idx("w:default") ?? 0 };
          } else if (firstChild(ff, "w:textInput")) frame2.ff = { type: "textInput" };
        }
        stack.push(frame2);
      } else if (type === "separate") {
        const top = stack[stack.length - 1];
        if (top) top.phase = "result";
      } else if (type === "end") {
        if (stack.length) closeField(ctx, runs);
      }
      continue;
    }
    if (child.name === "w:instrText") {
      const top = stack[stack.length - 1];
      if (top && top.phase === "instr") top.instr += textContentOf(child);
      continue;
    }
    switch (child.name) {
      case "w:t":
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
        const hex = child.attrs["w:char"] ?? "F0B7";
        let code = parseInt(hex, 16);
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
        const run = make("", { noteRef: { kind: child.name === "w:footnoteReference" ? "footnote" : "endnote", id } });
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
        const drawing = choice && findDeep2(choice, "w:drawing");
        const r = drawing && readDrawingRun(drawing, ctx);
        if (r) pushRun(r);
        else {
          const fb = firstChild(child, "mc:Fallback");
          const pict = fb && (findDeep2(fb, "w:pict") ?? findDeep2(fb, "w:object"));
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
    if (i2 === stack.length - 1 && f.runs.length) {
      const textRuns = f.runs.filter((r) => !isObjectRun(r));
      const first = textRuns[0] ?? f.runs[0];
      const run = {
        text: textRuns.map((r) => r.text).join(""),
        props: { ...first?.props ?? f.props },
        field: ` ${f.instr.trim()} `,
        fieldResult: f.runs
      };
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
    if (seg.wrapOpen !== void 0 && seg.raw.startsWith("<w:hyperlink")) seg.link = para.runs[from]?.props.link ?? "";
    for (let i2 = from; i2 < to; i2++) {
      const run = para.runs[i2];
      const sid = store.id();
      const el = rPrElOf(run);
      const obj = objElOf(run);
      store.runs.set(sid, {
        ...el ? { rPr: xml.slice(el.s, el.e) } : {},
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
function collectInstrText(el) {
  let out = "";
  for (const c of el.children) {
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
      return { data, ext };
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
var tw = (el, attr, fallback) => {
  const v = el?.attrs[attr];
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
  const num = colsEl ? parseInt(colsEl.attrs["w:num"] ?? "1", 10) : 1;
  if (num > 1) {
    sect.cols = {
      count: num,
      spaceTwips: parseInt(colsEl.attrs["w:space"] ?? "720", 10),
      sep: colsEl.attrs["w:sep"] === "true" || colsEl.attrs["w:sep"] === "1"
    };
    const eq = colsEl.attrs["w:equalWidth"];
    const defs = childElements(colsEl, "w:col");
    if ((eq === "0" || eq === "false") && defs.length >= num) {
      sect.cols.widths = defs.slice(0, num).map((c) => ({
        widthTwips: parseInt(c.attrs["w:w"] ?? "0", 10) || 0,
        spaceTwips: parseInt(c.attrs["w:space"] ?? "0", 10) || 0
      }));
    }
  }
  const titlePg = sectEl && firstChild(sectEl, "w:titlePg");
  if (titlePg && titlePg.attrs["w:val"] !== "0" && titlePg.attrs["w:val"] !== "false") {
    sect.titlePg = true;
  }
  const pgNumType = sectEl && firstChild(sectEl, "w:pgNumType");
  const startAttr = pgNumType?.attrs["w:start"];
  if (startAttr !== void 0) {
    const n = parseInt(startAttr, 10);
    if (!Number.isNaN(n)) sect.pgNumStart = n;
  }
  return sect;
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
    const val = (n) => firstChild(st, n)?.attrs["w:val"];
    const name = val("w:name");
    if (name !== void 0) def.name = name;
    const basedOn = val("w:basedOn");
    if (basedOn) def.basedOn = basedOn;
    const next = val("w:next");
    if (next) def.next = next;
    const link = val("w:link");
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
    if (!sheet.styles[id]) sheet.styles[id] = def;
  }
  return sheet;
}
function readLevel(el) {
  const ilvl = parseInt(el.attrs["w:ilvl"] ?? "0", 10) || 0;
  const lvl = { ilvl };
  const v = (n) => firstChild(el, n)?.attrs["w:val"];
  const start = v("w:start");
  if (start !== void 0) lvl.start = parseInt(start, 10);
  const fmtEl = firstChild(el, "w:numFmt");
  if (fmtEl?.attrs["w:val"]) lvl.numFmt = fmtEl.attrs["w:val"];
  if (fmtEl?.attrs["w:format"]) lvl.numFmtCustom = fmtEl.attrs["w:format"];
  const restart = v("w:lvlRestart");
  if (restart !== void 0) lvl.lvlRestart = parseInt(restart, 10);
  const ps = v("w:pStyle");
  if (ps) lvl.pStyle = ps;
  const isLgl = firstChild(el, "w:isLgl");
  if (isLgl) lvl.isLgl = onOffVal(isLgl);
  const suff = v("w:suff");
  if (suff === "tab" || suff === "space" || suff === "nothing") lvl.suff = suff;
  const lt = firstChild(el, "w:lvlText");
  if (lt) {
    if (lt.attrs["w:val"] !== void 0) lvl.lvlText = lt.attrs["w:val"];
    if (lt.attrs["w:null"] === "1" || lt.attrs["w:null"] === "true") lvl.lvlTextNull = true;
  }
  const pic = v("w:lvlPicBulletId");
  if (pic !== void 0) lvl.lvlPicBulletId = parseInt(pic, 10);
  const jc = v("w:lvlJc");
  if (jc) lvl.lvlJc = jc;
  const pPr = readPPr(firstChild(el, "w:pPr"));
  if (pPr) lvl.pPr = pPr;
  const rPr = readRPr(firstChild(el, "w:rPr"));
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
  for (const num of childElements(root, "w:num")) {
    const numId = parseInt(num.attrs["w:numId"] ?? "-1", 10);
    const abs = parseInt(firstChild(num, "w:abstractNumId")?.attrs["w:val"] ?? "-1", 10);
    const inst = { numId, abstractNumId: abs, overrides: {} };
    for (const ov of childElements(num, "w:lvlOverride")) {
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
    const el = fontScheme && firstChild(fontScheme, tag);
    if (!el) continue;
    const set = theme[key];
    const latin = firstChild(el, "a:latin")?.attrs["typeface"];
    if (latin) set.latin = latin;
    const ea = firstChild(el, "a:ea")?.attrs["typeface"];
    if (ea) set.ea = ea;
    const cs = firstChild(el, "a:cs")?.attrs["typeface"];
    if (cs) set.cs = cs;
    for (const f of childElements(el, "a:font")) {
      if (f.attrs["script"] && f.attrs["typeface"]) set.scripts[f.attrs["script"]] = f.attrs["typeface"];
    }
  }
  const lnList = find(root, "a:lnStyleLst");
  if (lnList) theme.lineWidthsPt = childElements(lnList, "a:ln").map((l) => (parseInt(l.attrs["w"] ?? "0", 10) || 0) / 12700);
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
      for (const [k, val] of Object.entries(sig.attrs)) info.sig[k.replace(/^w:/, "")] = val;
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

// ../docx-core/src/styles.ts
var onOff = (el) => {
  if (!el) return void 0;
  const v = el.attrs["w:val"];
  return v !== "0" && v !== "false" && v !== "none";
};
function readStyleRunProps(rPr) {
  const p = {};
  if (!rPr) return p;
  for (const el of childElements(rPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:b":
        p.bold = onOff(el);
        break;
      case "w:i":
        p.italic = onOff(el);
        break;
      case "w:caps":
        p.allCaps = onOff(el);
        break;
      case "w:smallCaps":
        p.smallCaps = onOff(el);
        break;
      case "w:strike":
        p.strike = onOff(el);
        break;
      case "w:sz":
        if (val) p.szHalfPt = parseInt(val, 10);
        break;
      case "w:color":
        if (val && val !== "auto") p.color = val;
        break;
      case "w:rFonts":
        if (el.attrs["w:ascii"]) p.fontAscii = el.attrs["w:ascii"];
        break;
      case "w:u":
        p.underline = val !== "none";
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
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText("word/styles.xml");
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

// ../docx-core/src/lossless.ts
function splitElement(raw) {
  const el = parseXml(raw, { positions: true });
  if (el.cs === el.e) {
    const open = raw.replace(/\s*\/>\s*$/, ">");
    return { open, close: `</${el.name}>`, kids: [], el };
  }
  const kids = childElements(el).map((k) => ({ name: k.name, raw: raw.slice(k.s, k.e), el: k }));
  return { open: raw.slice(0, el.cs), close: raw.slice(el.ce), kids, el };
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
  /** Por caminho da parte (word/document.xml, word/header1.xml…). */
  stories = /* @__PURE__ */ new Map();
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
function tableSig(t) {
  return sigHash(JSON.stringify(t, sigReplacer));
}

// ../docx-core/src/fulldoc.ts
function readBorderSet(el, inside) {
  if (!el) return void 0;
  const out = {};
  const sides = inside ? ["top", "left", "bottom", "right", "insideH", "insideV"] : ["top", "left", "bottom", "right"];
  let any = false;
  for (const side of sides) {
    const edge = readBorderEdge(firstChild(el, `w:${side}`));
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  return any ? out : void 0;
}
function unwrap(el, name) {
  const out = [];
  for (const c of childElements(el)) {
    if (c.name === name) out.push(c);
    else if (c.name === "w:sdt") {
      const content = firstChild(c, "w:sdtContent");
      if (content) out.push(...unwrap(content, name));
    } else if (c.name === "w:customXml") out.push(...unwrap(c, name));
  }
  return out;
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
  const slice = (el) => el && xml !== void 0 ? xml.slice(el.s, el.e) : void 0;
  const openOf = (el) => xml.slice(el.s, el.cs === el.e ? el.e : el.cs).replace(/\s*\/>$/, ">");
  const srcRows = [];
  const grid = firstChild(tblEl, "w:tblGrid");
  const gridColsTwips = grid ? childElements(grid, "w:gridCol").map((c) => parseInt(c.attrs["w:w"] ?? "0", 10) || 0) : [];
  const tblPrEl = firstChild(tblEl, "w:tblPr");
  const tblBorders = readBorderSet(tblPrEl && firstChild(tblPrEl, "w:tblBorders"), true);
  const rows = [];
  for (const trEl of unwrap(tblEl, "w:tr")) {
    const cells = [];
    const srcCells = [];
    for (const tcEl of unwrap(trEl, "w:tc")) {
      if (xml !== void 0) {
        const tcPrRaw = slice(firstChild(tcEl, "w:tcPr"));
        srcCells.push({ open: openOf(tcEl), ...tcPrRaw ? { tcPr: tcPrRaw } : {} });
      }
      const tcPrEl = firstChild(tcEl, "w:tcPr");
      const tcPr = readTcPr(tcPrEl);
      const shd = tcPrEl && firstChild(tcPrEl, "w:shd")?.attrs["w:fill"];
      const tcW = tcPrEl && firstChild(tcPrEl, "w:tcW");
      const cellBorders = readBorderSet(tcPrEl && firstChild(tcPrEl, "w:tcBorders"), true);
      const blocks = readBlocksOf(tcEl, ctx);
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
      cells.push(cell);
    }
    if (cells.length > 0) {
      if (xml !== void 0) {
        const trPrRaw = slice(firstChild(trEl, "w:trPr"));
        const exRaw = slice(firstChild(trEl, "w:tblPrEx"));
        srcRows.push({ open: openOf(trEl), cells: srcCells, ...trPrRaw ? { trPr: trPrRaw } : {}, ...exRaw ? { tblPrEx: exRaw } : {} });
      }
      const row = { cells };
      const trPr = readTrPr(firstChild(trEl, "w:trPr"));
      if (trPr) row.trPr = trPr;
      const ex = readTblPr(firstChild(trEl, "w:tblPrEx"));
      if (ex) row.tblPrEx = ex;
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
      rows: srcRows,
      ...tblPrRaw ? { tblPr: tblPrRaw } : {},
      ...gridRaw ? { tblGrid: gridRaw } : {}
    });
  }
  return table;
}
function blockSrc(b) {
  return b.type === "paragraph" ? b.paragraph.props.src : b.src;
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
function readHeaderFooterPart(pkg, path, store) {
  const xml = pkg.getPartText(path);
  if (!xml) return void 0;
  const root = parseXml(xml, { positions: !!store });
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  ctx.readBlocks = readBlocksOf;
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
function readNotesPart(pkg, path, elementName, blocksOut) {
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(path);
  if (!xml) return out;
  const root = parseXml(xml);
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  ctx.readBlocks = readBlocksOf;
  for (const note of childElements(root, elementName)) {
    const id = parseInt(note.attrs["w:id"] ?? "0", 10);
    const type = note.attrs["w:type"];
    if (type === "separator" || type === "continuationSeparator" || type === "continuationNotice") continue;
    const blocks = readBlocksOf(note, ctx);
    out.set(id, blocks.filter((bl) => bl.type === "paragraph").map((bl) => bl.paragraph));
    blocksOut?.set(id, blocks);
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
  ctx.onBookmark = (name, offset) => {
    if (!bookmarks.has(name)) {
      bookmarks.set(name, blocks.length);
      bookmarkOffsets.set(name, offset);
    }
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
      else story.groups.push(groupOf(docXml, child, blocks.slice(before), store));
    }
  }
  if (sections.length === 0) {
    closeSection(firstChild(body, "w:sectPr") ?? { name: "w:sectPr", attrs: {}, children: [] }, blocks.length - 1);
  }
  if (blocks.length === 0) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  const comments = readComments(pkg);
  if (store) {
    for (const c of comments) store.commentIds.add(c.id);
    store.commentsSig = JSON.stringify(comments);
  }
  const footnoteBlocks = /* @__PURE__ */ new Map();
  const endnoteBlocks = /* @__PURE__ */ new Map();
  return {
    blocks,
    sections,
    footnotes: readNotesPart(pkg, "word/footnotes.xml", "w:footnote", footnoteBlocks),
    endnotes: readNotesPart(pkg, "word/endnotes.xml", "w:endnote", endnoteBlocks),
    comments,
    styles: readStyles(pkg),
    bookmarks,
    bookmarkOffsets,
    formatting: readDocFormatting(pkg),
    footnoteBlocks,
    endnoteBlocks,
    ...readCoreProps(pkg),
    ...readBackground(root),
    ...store ? { sources: store } : {}
  };
}
function readBackground(root) {
  const bg = firstChild(root, "w:background");
  if (!bg) return {};
  const out = {};
  for (const k of ["color", "themeColor", "themeTint", "themeShade"]) {
    const v = bg.attrs[`w:${k}`];
    if (v) out[k] = v;
  }
  return Object.keys(out).length ? { background: out } : {};
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
    const eq = cols.attrs["w:equalWidth"];
    if (eq !== void 0) out.equalWidth = !(eq === "0" || eq === "false");
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

// ../docx-core/src/model-ops.ts
var paraText = (p) => p.runs.map((r) => r.text).join("");

// src/myers.ts
function myersDiff(n, m, eq) {
  if (n === 0 && m === 0) return [];
  if (n === 0) {
    const out = [];
    for (let j = 0; j < m; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return out;
  }
  if (m === 0) {
    const out = [];
    for (let i2 = 0; i2 < n; i2++) {
      out.push({ op: "delete", aIndex: i2, bIndex: -1 });
    }
    return out;
  }
  const max2 = n + m;
  const size = 2 * max2 + 1;
  const trace = [];
  const V = new Int32Array(size);
  outer: for (let d = 0; d <= max2; d++) {
    trace.push(new Int32Array(V));
    for (let k = -d; k <= d; k += 2) {
      const kIdx = k + max2;
      let x3;
      if (k === -d) {
        x3 = V[kIdx + 1] ?? 0;
      } else if (k === d) {
        x3 = (V[kIdx - 1] ?? 0) + 1;
      } else {
        const down = V[kIdx + 1] ?? 0;
        const right = (V[kIdx - 1] ?? 0) + 1;
        x3 = down > right ? down : right;
      }
      let y2 = x3 - k;
      while (x3 < n && y2 < m && eq(x3, y2)) {
        x3++;
        y2++;
      }
      V[kIdx] = x3;
      if (x3 >= n && y2 >= m) {
        break outer;
      }
    }
  }
  const ops = [];
  let x2 = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const Vd = trace[d];
    if (!Vd) break;
    const k = x2 - y;
    const kIdx = k + max2;
    let prevK;
    if (k === -d) {
      prevK = k + 1;
    } else if (k === d) {
      prevK = k - 1;
    } else {
      const down = Vd[kIdx + 1] ?? 0;
      const right = Vd[kIdx - 1] ?? 0;
      prevK = down > right ? k + 1 : k - 1;
    }
    const prevX = Vd[prevK + max2] ?? 0;
    const prevY = prevX - prevK;
    while (x2 > prevX && y > prevY) {
      ops.push({ op: "equal", aIndex: x2 - 1, bIndex: y - 1 });
      x2--;
      y--;
    }
    if (d > 0) {
      if (x2 === prevX) {
        ops.push({ op: "insert", aIndex: -1, bIndex: y - 1 });
      } else {
        ops.push({ op: "delete", aIndex: x2 - 1, bIndex: -1 });
      }
      x2 = prevX;
      y = prevY;
    }
  }
  ops.reverse();
  return ops;
}

// src/histogram.ts
function histogramDiff(n, m, eq, getKeyA, getKeyB) {
  if (n === 0 && m === 0) return [];
  if (n === 0) {
    const out = [];
    for (let j = 0; j < m; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return out;
  }
  if (m === 0) {
    const out = [];
    for (let i2 = 0; i2 < n; i2++) {
      out.push({ op: "delete", aIndex: i2, bIndex: -1 });
    }
    return out;
  }
  const ops = [];
  recurse(0, n, 0, m, eq, getKeyA, getKeyB, ops);
  return ops;
}
function recurse(a0, a1, b0, b1, eq, getKeyA, getKeyB, out) {
  if (a0 >= a1 && b0 >= b1) return;
  if (a0 >= a1) {
    for (let j = b0; j < b1; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return;
  }
  if (b0 >= b1) {
    for (let i2 = a0; i2 < a1; i2++) {
      out.push({ op: "delete", aIndex: i2, bIndex: -1 });
    }
    return;
  }
  const histA = /* @__PURE__ */ new Map();
  for (let i2 = a0; i2 < a1; i2++) {
    const k = getKeyA(i2);
    const bucket = histA.get(k);
    if (bucket) {
      bucket.push(i2);
    } else {
      histA.set(k, [i2]);
    }
  }
  let bestCount = Number.POSITIVE_INFINITY;
  let bestSpan = -1;
  let bestShift = Number.POSITIVE_INFINITY;
  let bestAL = -1;
  let bestAR = -1;
  let bestBL = -1;
  for (let j = b0; j < b1; j++) {
    const k = getKeyB(j);
    const bucket = histA.get(k);
    if (!bucket) continue;
    const count = bucket.length;
    for (const aIdx of bucket) {
      if (!eq(aIdx, j)) continue;
      let aL = aIdx;
      let bL = j;
      while (aL > a0 && bL > b0 && eq(aL - 1, bL - 1)) {
        aL--;
        bL--;
      }
      let aR = aIdx + 1;
      let bR = j + 1;
      while (aR < a1 && bR < b1 && eq(aR, bR)) {
        aR++;
        bR++;
      }
      const span = aR - aL;
      const shift = aL > bL ? aL - bL : bL - aL;
      let better = false;
      if (count < bestCount) {
        better = true;
      } else if (count === bestCount) {
        if (span > bestSpan) {
          better = true;
        } else if (span === bestSpan) {
          if (shift < bestShift) {
            better = true;
          } else if (shift === bestShift) {
            if (bL < bestBL) {
              better = true;
            } else if (bL === bestBL && aL < bestAL) {
              better = true;
            }
          }
        }
      }
      if (better) {
        bestCount = count;
        bestSpan = span;
        bestShift = shift;
        bestAL = aL;
        bestAR = aR;
        bestBL = bL;
      }
    }
  }
  if (bestAL === -1) {
    const subOps = myersDiff(a1 - a0, b1 - b0, (i2, j) => eq(a0 + i2, b0 + j));
    for (const op of subOps) {
      out.push({
        op: op.op,
        aIndex: op.aIndex >= 0 ? op.aIndex + a0 : -1,
        bIndex: op.bIndex >= 0 ? op.bIndex + b0 : -1
      });
    }
    return;
  }
  const bRight = bestBL + (bestAR - bestAL);
  recurse(a0, bestAL, b0, bestBL, eq, getKeyA, getKeyB, out);
  for (let off = 0; off < bestAR - bestAL; off++) {
    out.push({ op: "equal", aIndex: bestAL + off, bIndex: bestBL + off });
  }
  recurse(bestAR, a1, bRight, b1, eq, getKeyA, getKeyB, out);
}

// src/tokens.ts
function fnv1a(bytes) {
  let h = 2166136261;
  for (let i2 = 0; i2 < bytes.length; i2++) {
    h ^= bytes[i2];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
function bytesEqual(a, b) {
  if (a === b) return true;
  if (a.byteLength !== b.byteLength) return false;
  for (let i2 = 0; i2 < a.byteLength; i2++) {
    if (a[i2] !== b[i2]) return false;
  }
  return true;
}
var SEP = "";
var sanitize = (s) => s.includes(SEP) ? s.split(SEP).join("") : s;
var imageContentMarker = (data) => `${SEP}img:${data.byteLength}:${fnv1a(data)}${SEP}`;
var frame = (tag, s) => `${SEP}${tag}${s.length}${SEP}${s}`;
function runPropsSig(p) {
  return [
    p.bold ? "b" : "",
    p.italic ? "i" : "",
    p.underline ? `u${p.underlineStyle ?? "single"}${p.underlineColor ?? ""}` : "",
    p.strike ? "s" : "",
    p.doubleStrike ? "ds" : "",
    p.vertAlign ?? "",
    p.szHalfPt ?? "",
    p.color ?? "",
    p.highlight ?? "",
    p.fontAscii ?? "",
    p.allCaps ? "ac" : "",
    p.smallCaps ? "sc" : "",
    p.charSpacingTwips ?? "",
    p.link ?? "",
    p.isMath ? "m" : ""
  ].join("|");
}
function paraPropsSig(p) {
  return [
    p.alignment ?? "",
    p.styleId ?? "",
    p.numbering ? `${p.numbering.kind}:${p.numbering.ilvl}` : "",
    p.indentLeftTwips ?? "",
    p.indentRightTwips ?? "",
    p.indentFirstLineTwips ?? "",
    p.lineTwentieths ?? "",
    p.spaceAfterTwips ?? "",
    p.spaceBeforeTwips ?? "",
    p.tocInstr ?? "",
    p.tocEntry ? "t" : "",
    p.tabStops ? JSON.stringify(p.tabStops) : "",
    p.shadingHex ?? "",
    p.boxBorder ? "bb" : "",
    p.borders ? JSON.stringify(p.borders) : "",
    p.pageBreakBefore ? "pb" : "",
    p.dropCap ? "dc" : "",
    p.sectionBreak ? JSON.stringify(p.sectionBreak.sectPr) : ""
  ].join("|");
}
function paragraphContentKey(p) {
  const segs = [];
  let prevField = null;
  for (const r of p.runs) {
    if (r.field !== void 0) {
      const instr = sanitize(r.field.trim());
      if (prevField !== instr) segs.push(`${SEP}fld:${instr}${SEP}`);
      prevField = instr;
      continue;
    }
    prevField = null;
    if (r.image) {
      segs.push(imageContentMarker(r.image.data));
    } else if (r.noteRef) {
      segs.push(`${SEP}note:${r.noteRef.kind}${SEP}`);
    } else if (r.custom) {
      const t = sanitize(r.custom.type);
      segs.push(`${SEP}custom:${t.length}:${t}:${sanitize(r.custom.fallbackText)}${SEP}`);
    } else {
      segs.push(sanitize(r.text));
    }
  }
  return segs.join("");
}
function paragraphFormatKey(p) {
  const segs = [];
  let curSig = "";
  let curLen = 0;
  let curImg = "";
  const flush = () => {
    if (curLen > 0 || curImg) segs.push(`${curLen}:${curSig}${curImg}`);
    curLen = 0;
    curImg = "";
  };
  for (const r of p.runs) {
    const sig = runPropsSig(r.props);
    const img = r.image ? `img[${r.image.widthTwips}x${r.image.heightTwips}${r.image.floating ? `@${r.image.offsetXTwips ?? 0},${r.image.offsetYTwips ?? 0}` : ""}]` : "";
    if (sig !== curSig || img) {
      flush();
      curSig = sig;
      curImg = img;
    }
    curLen += r.text.length;
    if (img) flush();
  }
  flush();
  return `${paraPropsSig(p.props)}${SEP}${segs.join(SEP)}`;
}
function collectParagraphImages(p, out) {
  for (const r of p.runs) {
    if (r.image) out.push(r.image.data);
  }
}
function cellContentKey(c) {
  const parts = [
    ...c.paragraphs.map((p) => frame("P", paragraphContentKey(p))),
    ...c.tables.map((t) => frame("T", tableContentKey(t)))
  ];
  return `${parts.join("")}${SEP}span${c.gridSpan}`;
}
function tableContentKey(t) {
  return t.rows.map((row) => frame("R", row.cells.map((c) => frame("C", cellContentKey(c))).join(""))).join("");
}
function cellFormatKey(c) {
  const parts = [
    ...c.paragraphs.map((p) => frame("P", paragraphFormatKey(p))),
    ...c.tables.map((t) => frame("T", tableFormatKey(t)))
  ];
  return [
    parts.join(""),
    c.widthTwips ?? "",
    c.shadingHex ?? "",
    c.borders ? JSON.stringify(c.borders) : ""
  ].join(SEP);
}
function tableFormatKey(t) {
  const rows = t.rows.map((row) => frame("R", row.cells.map((c) => frame("C", cellFormatKey(c))).join(""))).join("");
  return [
    t.gridColsTwips.join(","),
    t.borders ? JSON.stringify(t.borders) : "",
    rows
  ].join(SEP);
}
function collectTableImages(t, out) {
  for (const row of t.rows) {
    for (const cell of row.cells) {
      for (const p of cell.paragraphs) collectParagraphImages(p, out);
      for (const nested of cell.tables) collectTableImages(nested, out);
    }
  }
}
function tokenizeBlock(block) {
  if (block.type === "paragraph") {
    const images2 = [];
    collectParagraphImages(block.paragraph, images2);
    return {
      kind: "paragraph",
      block,
      contentKey: frame("p", paragraphContentKey(block.paragraph)),
      formatKey: paragraphFormatKey(block.paragraph),
      images: images2
    };
  }
  const images = [];
  collectTableImages(block, images);
  return {
    kind: "table",
    block,
    contentKey: frame("t", tableContentKey(block)),
    formatKey: tableFormatKey(block),
    images
  };
}
function tokenizeBlocks(blocks) {
  return blocks.map(tokenizeBlock);
}
function tokensEqual(a, b) {
  if (a.contentKey !== b.contentKey) return false;
  if (a.images.length !== b.images.length) return false;
  for (let i2 = 0; i2 < a.images.length; i2++) {
    if (!bytesEqual(a.images[i2], b.images[i2])) return false;
  }
  return true;
}
var rowContentKey = (row) => row.cells.map((c) => frame("C", cellContentKey(c))).join("");
var rowFormatKey = (row) => row.cells.map((c) => frame("C", cellFormatKey(c))).join("");

// src/diff.ts
var DEFAULT_DOC_DIFF_OPTIONS = {
  algorithm: "histogram",
  intraWord: true
};
function opsToRuns(ops, aTokens, bTokens) {
  const tagged = ops.map((o) => {
    if (o.op === "equal" && aTokens[o.aIndex].formatKey !== bTokens[o.bIndex].formatKey) {
      return { op: "format", aIndex: o.aIndex, bIndex: o.bIndex };
    }
    return o;
  });
  const runs = [];
  let i2 = 0;
  let aPos = 0;
  let bPos = 0;
  while (i2 < tagged.length) {
    const op = tagged[i2];
    let j = i2 + 1;
    while (j < tagged.length && tagged[j].op === op.op) j++;
    const slice = tagged.slice(i2, j);
    const aIdxs = [];
    const bIdxs = [];
    for (const s of slice) {
      if (s.aIndex >= 0) aIdxs.push(s.aIndex);
      if (s.bIndex >= 0) bIdxs.push(s.bIndex);
    }
    runs.push({
      kind: op.op,
      aIdxs,
      bIdxs,
      aStart: aPos + 1,
      bStart: bPos + 1
    });
    aPos += aIdxs.length;
    bPos += bIdxs.length;
    i2 = j;
  }
  return runs;
}
function runsToEdits(runs) {
  const edits = [];
  let i2 = 0;
  while (i2 < runs.length) {
    const r = runs[i2];
    const next = runs[i2 + 1];
    if (r.kind === "delete" && next && next.kind === "insert") {
      edits.push({
        kind: "change",
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: next.bStart, end: next.bStart + next.bIdxs.length - 1 },
        aBlocks: r.aIdxs,
        bBlocks: next.bIdxs
      });
      i2 += 2;
      continue;
    }
    if (r.kind === "insert" && next && next.kind === "delete") {
      edits.push({
        kind: "change",
        a: { start: next.aStart, end: next.aStart + next.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: next.aIdxs,
        bBlocks: r.bIdxs
      });
      i2 += 2;
      continue;
    }
    if (r.kind === "equal" || r.kind === "format") {
      edits.push({
        kind: r.kind === "format" ? "change" : "equal",
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: r.aIdxs,
        bBlocks: r.bIdxs,
        ...r.kind === "format" ? { formatOnly: true, importance: "minor" } : {}
      });
    } else if (r.kind === "delete") {
      edits.push({
        kind: "delete",
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart - 1 },
        aBlocks: r.aIdxs,
        bBlocks: []
      });
    } else {
      edits.push({
        kind: "insert",
        a: { start: r.aStart, end: r.aStart - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: [],
        bBlocks: r.bIdxs
      });
    }
    i2++;
  }
  return edits;
}
function wordTokens(text) {
  const out = [];
  const re = /\S+|\s+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}
function intraWordMarks(aText, bText, pairOffset) {
  if (aText === bText) return [];
  const aToks = wordTokens(aText);
  const bToks = wordTokens(bText);
  const ops = myersDiff(
    aToks.length,
    bToks.length,
    (i2, j) => aToks[i2].text === bToks[j].text
  );
  const marks = [];
  let hasEqual = false;
  for (const op of ops) {
    if (op.op === "equal") {
      if (/\S/.test(aToks[op.aIndex].text)) hasEqual = true;
    } else if (op.op === "delete") {
      const t = aToks[op.aIndex];
      marks.push({ kind: "delete", side: "a", pairOffset, startCh: t.start, endCh: t.end });
    } else {
      const t = bToks[op.bIndex];
      marks.push({ kind: "insert", side: "b", pairOffset, startCh: t.start, endCh: t.end });
    }
  }
  if (!hasEqual) return [];
  const merged = [];
  for (const mk of marks) {
    const last = merged[merged.length - 1];
    if (last && last.side === mk.side && last.kind === mk.kind && last.endCh === mk.startCh) {
      last.endCh = mk.endCh;
    } else {
      merged.push(mk);
    }
  }
  return merged;
}
function tableRowDiff(a, b) {
  if (a.type !== "table" || b.type !== "table") return null;
  const aKeys = a.rows.map(rowContentKey);
  const bKeys = b.rows.map(rowContentKey);
  const ops = histogramDiff(
    a.rows.length,
    b.rows.length,
    (i3, j) => aKeys[i3] === bKeys[j],
    (i3) => aKeys[i3],
    (j) => bKeys[j]
  );
  const out = [];
  let i2 = 0;
  const tagged = ops.map((o) => ({
    op: o.op === "equal" && rowFormatKey(a.rows[o.aIndex]) !== rowFormatKey(b.rows[o.bIndex]) ? "format" : o.op,
    aIndex: o.aIndex,
    bIndex: o.bIndex
  }));
  while (i2 < tagged.length) {
    const op = tagged[i2];
    let j = i2 + 1;
    while (j < tagged.length && tagged[j].op === op.op) j++;
    const slice = tagged.slice(i2, j);
    const aRows = slice.filter((s) => s.aIndex >= 0).map((s) => s.aIndex);
    const bRows = slice.filter((s) => s.bIndex >= 0).map((s) => s.bIndex);
    const last = out[out.length - 1];
    if (op.op === "insert" && last && last.kind === "delete" && last.bRows.length === 0) {
      last.kind = "change";
      last.bRows = bRows;
    } else if (op.op === "delete" && last && last.kind === "insert" && last.aRows.length === 0) {
      last.kind = "change";
      last.aRows = aRows;
    } else {
      out.push({
        kind: op.op === "format" ? "change" : op.op === "equal" ? "equal" : op.op,
        aRows,
        bRows,
        ...op.op === "format" ? { formatOnly: true } : {}
      });
    }
    i2 = j;
  }
  return out;
}
function diffBlocks(aBlocks, bBlocks, opts = {}) {
  const o = { ...DEFAULT_DOC_DIFF_OPTIONS, ...opts };
  const aTokens = tokenizeBlocks(aBlocks);
  const bTokens = tokenizeBlocks(bBlocks);
  const eq = (i2, j) => tokensEqual(aTokens[i2], bTokens[j]);
  const ops = o.algorithm === "myers" ? myersDiff(aTokens.length, bTokens.length, eq) : histogramDiff(
    aTokens.length,
    bTokens.length,
    eq,
    (i2) => aTokens[i2].contentKey,
    (j) => bTokens[j].contentKey
  );
  const edits = runsToEdits(opsToRuns(ops, aTokens, bTokens));
  for (const e of edits) {
    if (e.kind !== "change" || e.formatOnly) continue;
    const pairs = Math.min(e.aBlocks.length, e.bBlocks.length);
    const intra = [];
    const tableRows = [];
    let anyTable = false;
    for (let p = 0; p < pairs; p++) {
      const aB = aBlocks[e.aBlocks[p]];
      const bB = bBlocks[e.bBlocks[p]];
      if (aB.type === "paragraph" && bB.type === "paragraph") {
        if (o.intraWord) {
          intra.push(...intraWordMarks(paraText(aB.paragraph), paraText(bB.paragraph), p));
        }
        tableRows.push(null);
      } else {
        const rd = tableRowDiff(aB, bB);
        tableRows.push(rd);
        if (rd) anyTable = true;
      }
    }
    if (intra.length > 0) e.intra = intra;
    if (anyTable) e.tableRows = tableRows;
  }
  const stats = { inserted: 0, deleted: 0, changed: 0, formatOnly: 0, equal: 0 };
  for (const e of edits) {
    if (e.kind === "equal") stats.equal += e.aBlocks.length;
    else if (e.kind === "insert") stats.inserted += e.bBlocks.length;
    else if (e.kind === "delete") stats.deleted += e.aBlocks.length;
    else if (e.formatOnly) stats.formatOnly += e.aBlocks.length;
    else stats.changed += Math.max(e.aBlocks.length, e.bBlocks.length);
  }
  return { edits, stats };
}
function diffDocuments(a, b, opts = {}) {
  return diffBlocks(a.blocks, b.blocks, opts);
}

// ../../../shared/ui/dist/i18n.js
var DEFAULT_UI_LANG = "en";
function matchUiLang(tag) {
  if (!tag)
    return null;
  if (/^pt\b/i.test(tag))
    return "pt";
  if (/^en\b/i.test(tag))
    return "en";
  return null;
}
function browserUiLang() {
  const nav = typeof navigator !== "undefined" ? navigator : void 0;
  const prefs = nav?.languages?.length ? nav.languages : nav?.language ? [nav.language] : [];
  for (const tag of prefs) {
    const m = matchUiLang(tag);
    if (m)
      return m;
  }
  return DEFAULT_UI_LANG;
}
function uiLang(el) {
  const forced = el?.getAttribute("lang");
  if (forced)
    return matchUiLang(forced) ?? DEFAULT_UI_LANG;
  return browserUiLang();
}
function pickLabels(lang, labels) {
  const l = typeof lang === "string" ? lang : uiLang(lang);
  return labels[l] ?? labels[DEFAULT_UI_LANG];
}
function onBrowserLangChange(cb) {
  if (typeof window === "undefined")
    return () => {
    };
  window.addEventListener("languagechange", cb);
  return () => window.removeEventListener("languagechange", cb);
}

// src/universal-write-diff.ts
var s_ = (n) => n === 1 ? "" : "s";
var LABELS = {
  en: {
    noComparison: "No comparison loaded \u2014 call loadPair(aBytes, bBytes).",
    empty: "Empty documents.",
    left: "Original",
    right: "Modified",
    identical: "Identical documents",
    onlyChanges: "Only changes",
    close: "Close comparison",
    formatting: "formatting",
    inserted: (n) => `${n} inserted`,
    deleted: (n) => `${n} deleted`,
    changed: (n) => `${n} changed`,
    formatOnly: (n) => `${n} formatting`,
    unchanged: (n) => `\u2026 ${n} unchanged block${s_(n)} \u2026`
  },
  pt: {
    noComparison: "Nenhuma compara\xE7\xE3o carregada \u2014 chame loadPair(aBytes, bBytes).",
    empty: "Documentos vazios.",
    left: "Original",
    right: "Revisado",
    identical: "Documentos id\xEAnticos",
    onlyChanges: "S\xF3 as altera\xE7\xF5es",
    close: "Fechar compara\xE7\xE3o",
    formatting: "formata\xE7\xE3o",
    inserted: (n) => `${n} inserido${s_(n)}`,
    deleted: (n) => `${n} exclu\xEDdo${s_(n)}`,
    changed: (n) => `${n} alterado${s_(n)}`,
    formatOnly: (n) => `${n} de formata\xE7\xE3o`,
    unchanged: (n) => `\u2026 ${n} bloco${s_(n)} sem altera\xE7\xE3o \u2026`
  }
};
var Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {
};
var HIGHLIGHT = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#00008b",
  darkCyan: "#008b8b",
  darkGreen: "#006400",
  darkMagenta: "#8b008b",
  darkRed: "#8b0000",
  darkYellow: "#808000",
  darkGray: "#a9a9a9",
  lightGray: "#d3d3d3",
  black: "#000000",
  white: "#ffffff"
};
var hex6 = (s) => s && /^[0-9a-fA-F]{6}$/.test(s) ? `#${s}` : null;
var MIME = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  emf: "image/emf"
};
var STYLE = (
  /* css */
  `
:host {
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: system-ui, sans-serif;
  /* Conven\xE7\xF5es de cor do OpenCompare (insert verde, delete vermelho,
     change vermelho no par, minor/formata\xE7\xE3o azul). */
  --uwd-insert-bg: light-dark(rgba(63,185,80,0.15), rgba(63,185,80,0.18));
  --uwd-insert-bg-intra: light-dark(rgba(63,185,80,0.40), rgba(63,185,80,0.45));
  --uwd-delete-bg: light-dark(rgba(248,81,73,0.15), rgba(248,81,73,0.18));
  --uwd-delete-bg-intra: light-dark(rgba(248,81,73,0.40), rgba(248,81,73,0.45));
  --uwd-minor-bg: light-dark(rgba(59,130,246,0.12), rgba(59,130,246,0.16));
  --uwd-stripe-insert: #3fb950;
  --uwd-stripe-delete: #f85149;
  --uwd-stripe-minor: #3b82f6;
  --uwd-border: light-dark(#d0d7de, #3d444d);
  --uwd-text: light-dark(#1f2328, #e6edf3);
  --uwd-text-2: light-dark(#59636e, #9198a1);
  --uwd-chrome: light-dark(#f6f8fa, #151b23);
  --uwd-page: light-dark(#ffffff, #0d1117);
  color: var(--uwd-text);
  background: var(--uwd-page);
}
.uwd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--uwd-border);
  background: var(--uwd-chrome);
  font-size: 13px;
  flex: none;
}
.uwd-header .uwd-stats { display: flex; gap: 10px; color: var(--uwd-text-2); }
.uwd-stat::before { content: "\u25CF"; margin-right: 4px; font-size: 10px; }
.uwd-stat--ins::before { color: var(--uwd-stripe-insert); }
.uwd-stat--del::before { color: var(--uwd-stripe-delete); }
.uwd-stat--chg::before { color: var(--uwd-stripe-delete); }
.uwd-stat--fmt::before { color: var(--uwd-stripe-minor); }
.uwd-header .uwd-spacer { flex: 1; }
.uwd-header button {
  border: 1px solid var(--uwd-border);
  background: transparent;
  color: var(--uwd-text);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}
.uwd-header button[data-on="1"] { background: var(--uwd-minor-bg); border-color: var(--uwd-stripe-minor); }
.uwd-header .uwd-close { border: none; font-size: 16px; line-height: 1; padding: 2px 8px; }
.uwd-body { flex: 1; overflow: auto; min-height: 0; }
.uwd-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
}
.uwd-pane-header {
  position: sticky;
  top: 0;
  z-index: 1;
  grid-column: span 2;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-bottom: 1px solid var(--uwd-border);
}
.uwd-gutter {
  padding: 4px 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--uwd-text-2);
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell {
  position: relative;
  padding: 4px 12px 4px 14px;
  overflow-wrap: anywhere;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--stripe, transparent);
}
.uwd-cell[data-kind="insert"] { --stripe: var(--uwd-stripe-insert); background: var(--uwd-insert-bg); }
.uwd-cell[data-kind="delete"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="change"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="format"] { --stripe: var(--uwd-stripe-minor); background: var(--uwd-minor-bg); }
.uwd-cell[data-kind="pad"] {
  background:
    repeating-linear-gradient(45deg, transparent, transparent 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 8px);
}
.uwd-intra--ins { background: var(--uwd-insert-bg-intra); border-radius: 2px; }
.uwd-intra--del { background: var(--uwd-delete-bg-intra); border-radius: 2px; }
.uwd-band {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-top: 1px solid var(--uwd-border);
  border-bottom: 1px solid var(--uwd-border);
  cursor: pointer;
  user-select: none;
}
.uwd-band:hover { background: var(--uwd-minor-bg); }
.uwd-para { margin: 0; min-height: 1.2em; }
.uwd-para img { max-width: 100%; height: auto; vertical-align: bottom; }
.uwd-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 10px;
  background: var(--uwd-minor-bg);
  color: var(--uwd-text-2);
  vertical-align: middle;
}
table.uwd-table { border-collapse: collapse; margin: 2px 0; width: 100%; }
table.uwd-table td {
  border: 1px solid var(--uwd-border);
  padding: 2px 6px;
  vertical-align: top;
}
tr.uwd-row--insert { background: var(--uwd-insert-bg); }
tr.uwd-row--delete { background: var(--uwd-delete-bg); }
tr.uwd-row--change { background: var(--uwd-delete-bg); }
tr.uwd-row--format { background: var(--uwd-minor-bg); }
.uwd-empty { color: var(--uwd-text-2); font-style: italic; padding: 24px; text-align: center; }
`
);
var UniversalWriteDiffElement = class extends Base {
  static get observedAttributes() {
    return ["view", "left-label", "right-label", "lang"];
  }
  _shadow;
  _aDoc = null;
  _bDoc = null;
  _diff = null;
  _blobUrls = [];
  _expandedBands = /* @__PURE__ */ new Set();
  _renderScheduled = false;
  _unsubscribeLang = null;
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
  }
  attributeChangedCallback() {
    this._schedule();
  }
  connectedCallback() {
    if (this._diff) this._schedule();
    this._unsubscribeLang ??= onBrowserLangChange(() => this._schedule());
  }
  disconnectedCallback() {
    this._revokeBlobs();
    this._unsubscribeLang?.();
    this._unsubscribeLang = null;
  }
  /** Textos no idioma da interface. */
  get _L() {
    return pickLabels(this, LABELS);
  }
  get view() {
    return this.getAttribute("view") === "diffs" ? "diffs" : "all";
  }
  set view(v) {
    this.setAttribute("view", v);
  }
  /** Carrega e compara dois .docx (bytes). */
  loadPair(aBytes, bBytes, opts = {}) {
    const aDoc = readFullDocument(DocxPackage.load(aBytes));
    const bDoc = readFullDocument(DocxPackage.load(bBytes));
    this.loadDocuments(aDoc, bDoc, opts);
  }
  /** Compara dois documentos já parseados. */
  loadDocuments(aDoc, bDoc, opts = {}) {
    this._aDoc = aDoc;
    this._bDoc = bDoc;
    if (opts.leftLabel !== void 0) this.setAttribute("left-label", opts.leftLabel);
    if (opts.rightLabel !== void 0) this.setAttribute("right-label", opts.rightLabel);
    this._diff = diffDocuments(aDoc, bDoc);
    this._expandedBands.clear();
    this._schedule();
    queueMicrotask(() => {
      this.dispatchEvent(new CustomEvent("ready", {
        detail: { stats: this._diff.stats },
        bubbles: true,
        composed: true
      }));
    });
  }
  get stats() {
    return this._diff?.stats ?? null;
  }
  _schedule() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    queueMicrotask(() => {
      this._renderScheduled = false;
      this._render();
    });
  }
  _revokeBlobs() {
    for (const u of this._blobUrls) URL.revokeObjectURL(u);
    this._blobUrls = [];
  }
  // ───────────────────────── render ─────────────────────────
  _render() {
    if (!this.isConnected) return;
    this._revokeBlobs();
    const doc = this.ownerDocument;
    const root = doc.createElement("div");
    root.style.cssText = "display:flex;flex-direction:column;min-height:0;height:100%;";
    const style = doc.createElement("style");
    style.textContent = STYLE;
    if (!this._diff || !this._aDoc || !this._bDoc) {
      const empty = doc.createElement("div");
      empty.className = "uwd-empty";
      empty.textContent = this._L.noComparison;
      root.append(empty);
      this._shadow.replaceChildren(style, root);
      return;
    }
    root.append(this._renderHeader(doc));
    const body = doc.createElement("div");
    body.className = "uwd-body";
    const grid = doc.createElement("div");
    grid.className = "uwd-grid";
    const headA = doc.createElement("div");
    headA.className = "uwd-pane-header";
    headA.textContent = this.getAttribute("left-label") ?? this._L.left;
    const headB = doc.createElement("div");
    headB.className = "uwd-pane-header";
    headB.textContent = this.getAttribute("right-label") ?? this._L.right;
    grid.append(headA, headB);
    const rows = this._buildRows();
    const showAll = this.view !== "diffs";
    let i2 = 0;
    while (i2 < rows.length) {
      const row = rows[i2];
      if (!showAll && row.kind === "equal" && !this._expandedBands.has(row.editIndex)) {
        let j = i2;
        while (j < rows.length && rows[j].kind === "equal" && rows[j].editIndex === row.editIndex) j++;
        grid.append(this._renderBand(doc, row.editIndex, j - i2));
        i2 = j;
        continue;
      }
      this._renderRow(doc, grid, row);
      i2++;
    }
    if (rows.length === 0) {
      const empty = doc.createElement("div");
      empty.className = "uwd-empty";
      empty.style.gridColumn = "1 / -1";
      empty.textContent = this._L.empty;
      grid.append(empty);
    }
    body.append(grid);
    root.append(body);
    this._shadow.replaceChildren(style, root);
  }
  _renderHeader(doc) {
    const stats = this._diff.stats;
    const header = doc.createElement("div");
    header.className = "uwd-header";
    const statsBox = doc.createElement("div");
    statsBox.className = "uwd-stats";
    const L = this._L;
    const stat = (cls, label, n) => {
      if (n === 0) return;
      const s = doc.createElement("span");
      s.className = `uwd-stat uwd-stat--${cls}`;
      s.textContent = label(n);
      statsBox.append(s);
    };
    stat("ins", L.inserted, stats.inserted);
    stat("del", L.deleted, stats.deleted);
    stat("chg", L.changed, stats.changed);
    stat("fmt", L.formatOnly, stats.formatOnly);
    if (statsBox.childElementCount === 0) {
      const s = doc.createElement("span");
      s.textContent = L.identical;
      statsBox.append(s);
    }
    header.append(statsBox);
    const spacer = doc.createElement("div");
    spacer.className = "uwd-spacer";
    header.append(spacer);
    const toggle = doc.createElement("button");
    toggle.textContent = L.onlyChanges;
    toggle.dataset["on"] = this.view === "diffs" ? "1" : "0";
    toggle.addEventListener("click", () => {
      this.view = this.view === "diffs" ? "all" : "diffs";
    });
    header.append(toggle);
    const close = doc.createElement("button");
    close.className = "uwd-close";
    close.title = L.close;
    close.setAttribute("aria-label", L.close);
    close.textContent = "\u2715";
    close.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close-request", { bubbles: true, composed: true }));
    });
    header.append(close);
    return header;
  }
  _buildRows() {
    const rows = [];
    const edits = this._diff.edits;
    for (let e = 0; e < edits.length; e++) {
      const edit = edits[e];
      const kind = edit.kind === "change" && edit.formatOnly ? "format" : edit.kind;
      const n = Math.max(edit.aBlocks.length, edit.bBlocks.length);
      for (let p = 0; p < n; p++) {
        rows.push({
          kind,
          editIndex: e,
          pairOffset: p,
          aBlock: edit.aBlocks[p] ?? null,
          bBlock: edit.bBlocks[p] ?? null
        });
      }
    }
    return rows;
  }
  _renderBand(doc, editIndex, count) {
    const band = doc.createElement("div");
    band.className = "uwd-band";
    band.textContent = this._L.unchanged(count);
    band.addEventListener("click", () => {
      this._expandedBands.add(editIndex);
      this._schedule();
    });
    return band;
  }
  _renderRow(doc, grid, row) {
    const edit = this._diff.edits[row.editIndex];
    grid.append(this._gutter(doc, row.aBlock));
    grid.append(this._cell(doc, "a", row, edit));
    grid.append(this._gutter(doc, row.bBlock));
    grid.append(this._cell(doc, "b", row, edit));
  }
  _gutter(doc, blockIdx) {
    const g = doc.createElement("div");
    g.className = "uwd-gutter";
    g.textContent = blockIdx === null ? "" : String(blockIdx + 1);
    return g;
  }
  _cell(doc, side, row, edit) {
    const cell = doc.createElement("div");
    cell.className = "uwd-cell";
    const blockIdx = side === "a" ? row.aBlock : row.bBlock;
    const docModel = side === "a" ? this._aDoc : this._bDoc;
    if (blockIdx === null) {
      cell.dataset["kind"] = "pad";
      return cell;
    }
    if (row.kind !== "equal") cell.dataset["kind"] = row.kind;
    const block = docModel.blocks[blockIdx];
    const marks = row.kind === "change" ? (edit.intra ?? []).filter((m) => m.side === side && m.pairOffset === row.pairOffset) : [];
    const rowDiff = row.kind === "change" ? edit.tableRows?.[row.pairOffset] ?? null : null;
    if (block.type === "paragraph") {
      cell.append(this._renderParagraph(doc, block.paragraph, marks));
      if (row.kind === "format") {
        const badge = doc.createElement("span");
        badge.className = "uwd-badge";
        badge.textContent = this._L.formatting;
        cell.append(badge);
      }
    } else {
      cell.append(this._renderTable(doc, block, side, rowDiff));
    }
    cell.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("block-click", {
        detail: { editIndex: row.editIndex, side, blockIndex: blockIdx },
        bubbles: true,
        composed: true
      }));
    });
    return cell;
  }
  // ─────────────── blocos ───────────────
  _renderParagraph(doc, p, marks) {
    const el = doc.createElement("div");
    el.className = "uwd-para";
    const pr = p.props;
    if (pr.alignment && pr.alignment !== "left") {
      el.style.textAlign = pr.alignment === "both" ? "justify" : pr.alignment;
    }
    if (pr.indentLeftTwips) el.style.paddingLeft = `${pr.indentLeftTwips / 20}pt`;
    if (pr.indentRightTwips) el.style.paddingRight = `${pr.indentRightTwips / 20}pt`;
    if (pr.indentFirstLineTwips) el.style.textIndent = `${pr.indentFirstLineTwips / 20}pt`;
    if (pr.spaceBeforeTwips) el.style.marginTop = `${pr.spaceBeforeTwips / 20}pt`;
    if (pr.spaceAfterTwips) el.style.marginBottom = `${pr.spaceAfterTwips / 20}pt`;
    const shd = hex6(pr.shadingHex);
    if (shd) el.style.background = shd;
    if (pr.numbering) {
      const marker = doc.createElement("span");
      marker.textContent = pr.numbering.kind === "bullet" ? "\u2022 " : "# ";
      marker.style.paddingLeft = `${pr.numbering.ilvl * 18}pt`;
      el.append(marker);
    }
    let offset = 0;
    for (const r of p.runs) {
      const len = r.text.length;
      const runMarks = marks.filter((m) => m.startCh < offset + len && m.endCh > offset).map((m) => ({
        start: Math.max(0, m.startCh - offset),
        end: Math.min(len, m.endCh - offset),
        kind: m.kind
      })).sort((x2, y) => x2.start - y.start);
      el.append(...this._renderRun(doc, r, runMarks));
      offset += len;
    }
    return el;
  }
  _renderRun(doc, r, marks) {
    if (r.image) {
      const img = doc.createElement("img");
      const mime = MIME[r.image.ext.toLowerCase()] ?? "application/octet-stream";
      const bytes = r.image.data;
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const url = URL.createObjectURL(new Blob([buf], { type: mime }));
      this._blobUrls.push(url);
      img.src = url;
      img.width = Math.round(r.image.widthTwips / 15);
      img.height = Math.round(r.image.heightTwips / 15);
      if (marks.length > 0) {
        const wrap = doc.createElement("span");
        wrap.className = marks[0].kind === "insert" ? "uwd-intra--ins" : "uwd-intra--del";
        wrap.append(img);
        return [wrap];
      }
      return [img];
    }
    const base = this._styledSpan(doc, r);
    const text = r.text;
    if (marks.length === 0) {
      base.textContent = text;
      return [base];
    }
    let pos = 0;
    for (const m of marks) {
      if (m.start > pos) base.append(doc.createTextNode(text.slice(pos, m.start)));
      const mark = doc.createElement("span");
      mark.className = m.kind === "insert" ? "uwd-intra--ins" : "uwd-intra--del";
      mark.textContent = text.slice(m.start, m.end);
      base.append(mark);
      pos = m.end;
    }
    if (pos < text.length) base.append(doc.createTextNode(text.slice(pos)));
    return [base];
  }
  _styledSpan(doc, r) {
    const s = doc.createElement("span");
    const p = r.props;
    if (p.bold) s.style.fontWeight = "700";
    if (p.italic || p.isMath) s.style.fontStyle = "italic";
    const deco = [];
    if (p.underline) deco.push("underline");
    if (p.strike || p.doubleStrike) deco.push("line-through");
    if (deco.length) s.style.textDecoration = deco.join(" ");
    const uc = hex6(p.underlineColor);
    if (uc) s.style.textDecorationColor = uc;
    if (p.szHalfPt) s.style.fontSize = `${p.szHalfPt / 2}pt`;
    const fg = hex6(p.color);
    if (fg) s.style.color = fg;
    if (p.highlight && HIGHLIGHT[p.highlight]) s.style.background = HIGHLIGHT[p.highlight];
    if (p.fontAscii) s.style.fontFamily = `"${p.fontAscii}", sans-serif`;
    if (p.allCaps) s.style.textTransform = "uppercase";
    if (p.smallCaps) s.style.fontVariant = "small-caps";
    if (p.vertAlign === "superscript") {
      s.style.verticalAlign = "super";
      s.style.fontSize = "smaller";
    }
    if (p.vertAlign === "subscript") {
      s.style.verticalAlign = "sub";
      s.style.fontSize = "smaller";
    }
    if (p.link) {
      s.style.color = "#0563c1";
      s.style.textDecoration = "underline";
      s.title = p.link;
    }
    return s;
  }
  _renderTable(doc, t, side, rowDiff) {
    const rowKind = /* @__PURE__ */ new Map();
    if (rowDiff) {
      for (const rd of rowDiff) {
        const idxs = side === "a" ? rd.aRows : rd.bRows;
        const kind = rd.kind === "change" && rd.formatOnly ? "format" : rd.kind === "change" ? "change" : rd.kind;
        for (const idx of idxs) {
          if (kind !== "equal") rowKind.set(idx, kind);
        }
      }
    }
    const el = doc.createElement("table");
    el.className = "uwd-table";
    for (let ri = 0; ri < t.rows.length; ri++) {
      const tr = doc.createElement("tr");
      const kind = rowKind.get(ri);
      if (kind && kind !== "equal") tr.className = `uwd-row--${kind}`;
      for (const c of t.rows[ri].cells) {
        const td2 = doc.createElement("td");
        if (c.gridSpan > 1) td2.colSpan = c.gridSpan;
        const cellShd = hex6(c.shadingHex);
        if (cellShd) td2.style.background = cellShd;
        for (const cp of c.paragraphs) td2.append(this._renderParagraph(doc, cp, []));
        for (const nested of c.tables) td2.append(this._renderTable(doc, nested, side, null));
        tr.append(td2);
      }
      el.append(tr);
    }
    return el;
  }
};
if (typeof customElements !== "undefined" && !customElements.get("universal-write-diff")) {
  customElements.define("universal-write-diff", UniversalWriteDiffElement);
}
export {
  DEFAULT_DOC_DIFF_OPTIONS,
  DocxPackage,
  UniversalWriteDiffElement,
  bytesEqual,
  diffBlocks,
  diffDocuments,
  fnv1a,
  histogramDiff,
  intraWordMarks,
  myersDiff,
  readFullDocument,
  tokenizeBlock,
  tokenizeBlocks,
  tokensEqual
};
