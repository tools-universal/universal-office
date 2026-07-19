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
  /** Conteúdo principal (word/document.xml). */
  documentXml() {
    const xml = this.getPartText("word/document.xml");
    if (xml === void 0) throw new Error("Pacote sem word/document.xml");
    return xml;
  }
};

// ../docx-core/src/xml.ts
var ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};
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
  function parseElement() {
    if (xml[i2] !== "<") error("esperava <");
    i2++;
    const nameStart = i2;
    while (i2 < n && !/[\s/>]/.test(xml[i2])) i2++;
    const name = xml.slice(nameStart, i2);
    const attrs = {};
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2])) i2++;
      if (xml[i2] === "/") {
        if (xml[i2 + 1] !== ">") error("esperava />");
        i2 += 2;
        return { name, attrs, children: [] };
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
      if (i2 < 0) error("aspas n\xE3o fechadas");
      attrs[aName] = decodeEntities(xml.slice(vStart, i2));
      i2++;
    }
    const children = [];
    for (; ; ) {
      if (i2 >= n) error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        const close = xml.indexOf(">", i2);
        i2 = close + 1;
        return { name, attrs, children };
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
        children.push(parseElement());
        continue;
      }
      const tStart = i2;
      while (i2 < n && xml[i2] !== "<") i2++;
      const text = decodeEntities(xml.slice(tStart, i2));
      if (text.length > 0) children.push(text);
    }
  }
  skipMisc();
  const root = parseElement();
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

// ../docx-core/src/document.ts
var DEFAULT_RUN_PROPS = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  allCaps: false,
  smallCaps: false
};
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
var onOff = (el) => {
  if (!el) return false;
  const v = el.attrs["w:val"];
  return v !== "0" && v !== "false" && v !== "none";
};
function readRunProps(rPr) {
  const p = { ...DEFAULT_RUN_PROPS };
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
      case "w:u":
        p.underline = val !== void 0 && val !== "none";
        if (val === "double" || val === "dotted" || val === "dash" || val === "wave" || val === "thick") {
          p.underlineStyle = val;
        }
        if (el.attrs["w:color"] && el.attrs["w:color"] !== "auto") p.underlineColor = el.attrs["w:color"];
        break;
      case "w:strike":
        p.strike = onOff(el);
        break;
      case "w:dstrike":
        p.doubleStrike = onOff(el);
        break;
      case "w:caps":
        p.allCaps = onOff(el);
        break;
      case "w:smallCaps":
        p.smallCaps = onOff(el);
        break;
      case "w:vertAlign":
        if (val === "superscript" || val === "subscript") p.vertAlign = val;
        break;
      case "w:sz":
        if (val) p.szHalfPt = parseInt(val, 10);
        break;
      case "w:color":
        if (val && val !== "auto") p.color = val;
        break;
      case "w:highlight":
        if (val && val !== "none") p.highlight = val;
        break;
      case "w:rFonts":
        p.fontAscii = el.attrs["w:ascii"];
        break;
      case "w:spacing":
        if (val) p.charSpacingTwips = parseInt(val, 10);
        break;
    }
  }
  return p;
}
function findDeep(el, name) {
  for (const c of childElements(el)) {
    if (c.name === name) return c;
    const found = findDeep(c, name);
    if (found) return found;
  }
  return void 0;
}
function readDrawing(drawing, resolveImage) {
  const anchor = firstChild(drawing, "wp:anchor");
  const extent = findDeep(drawing, "wp:extent");
  const blip = findDeep(drawing, "a:blip");
  const rid = blip?.attrs["r:embed"];
  if (!extent || !rid) return void 0;
  const media = resolveImage(rid);
  if (!media) return void 0;
  const img = {
    data: media.data,
    ext: media.ext,
    widthTwips: parseInt(extent.attrs["cx"] ?? "0", 10) / EMU_PER_TWIP,
    heightTwips: parseInt(extent.attrs["cy"] ?? "0", 10) / EMU_PER_TWIP
  };
  if (anchor) {
    img.floating = true;
    const posH = firstChild(anchor, "wp:positionH");
    const posV = firstChild(anchor, "wp:positionV");
    const offH = posH && firstChild(posH, "wp:posOffset");
    const offV = posV && firstChild(posV, "wp:posOffset");
    if (offH) img.offsetXTwips = parseInt(textContentOf(offH), 10) / EMU_PER_TWIP;
    if (offV) img.offsetYTwips = parseInt(textContentOf(offV), 10) / EMU_PER_TWIP;
  }
  return img;
}
function textContentOf(el) {
  let out = "";
  for (const c of el.children) out += typeof c === "string" ? c : textContentOf(c);
  return out;
}
function readRunsInto(runs, container, ctx, inherit) {
  for (const child of childElements(container)) {
    if (child.name === "w:commentRangeStart") {
      ctx.activeComments?.add(parseInt(child.attrs["w:id"] ?? "-1", 10));
    } else if (child.name === "w:commentRangeEnd") {
      ctx.activeComments?.delete(parseInt(child.attrs["w:id"] ?? "-1", 10));
    } else if (child.name === "w:bookmarkStart") {
      const name = child.attrs["w:name"];
      if (name) ctx.onBookmark?.(name);
    } else if (child.name === "w:r") {
      readSingleRun(runs, child, ctx, inherit);
    } else if (child.name === "w:hyperlink") {
      const rid = child.attrs["r:id"];
      const anchor = child.attrs["w:anchor"];
      const link = rid && ctx.resolveLink(rid) || (anchor ? `#${anchor}` : void 0);
      readRunsInto(runs, child, ctx, { ...inherit, link });
    } else if (child.name === "w:fldSimple") {
      const instr = child.attrs["w:instr"] ?? "";
      const before = runs.length;
      readRunsInto(runs, child, ctx, { ...inherit, field: instr });
      if (runs.length === before) {
        runs.push({ text: "", props: { ...DEFAULT_RUN_PROPS }, field: instr });
      }
    } else if (child.name === "m:oMath" || child.name === "m:oMathPara") {
      const text = collectMathText(child);
      if (text) {
        runs.push({
          text,
          props: { ...DEFAULT_RUN_PROPS, italic: true, isMath: true }
        });
      }
    } else if (child.name === "w:sdt") {
      const content = findDeep(child, "w:sdtContent");
      const sdtPr = firstChild(child, "w:sdtPr");
      const tag = sdtPr ? firstChild(sdtPr, "w:tag")?.attrs["w:val"] : void 0;
      const custom = parseCustomInlineTag(tag);
      if (content && custom) {
        const nested = [];
        readRunsInto(nested, content, ctx, inherit);
        const fallbackText = nested.map((run) => run.text).join("");
        runs.push({
          text: "\uFFFC",
          props: { ...nested[0]?.props ?? DEFAULT_RUN_PROPS },
          custom: { ...custom, fallbackText }
        });
      } else if (content) {
        readRunsInto(runs, content, ctx, inherit);
      }
    } else if (child.name === "w:smartTag" || child.name === "w:ins") {
      readRunsInto(runs, child, ctx, inherit);
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
  const rProps = readRunProps(firstChild(rEl, "w:rPr"));
  if (inherit?.link) {
    rProps.link = inherit.link;
    rProps.underline = true;
    rProps.color ??= "0563C1";
  }
  const flush = (text2, extra) => {
    if (text2.length === 0 && !extra) return;
    const props = { ...rProps };
    if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
    runs.push({ text: text2, props, ...inherit?.field ? { field: inherit.field } : {}, ...extra });
  };
  let text = "";
  for (const child of childElements(rEl)) {
    if (child.name === "w:fldChar") {
      const type = child.attrs["w:fldCharType"];
      if (type === "begin") {
        if (text) {
          flush(text);
          text = "";
        }
        ctx.fieldState = { instr: "", phase: "instr", result: "" };
      } else if (type === "separate") {
        if (ctx.fieldState) ctx.fieldState.phase = "result";
      } else if (type === "end") {
        const fs = ctx.fieldState;
        ctx.fieldState = null;
        if (fs) {
          const instr = ` ${fs.instr.trim()} `;
          const props = { ...rProps };
          if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
          runs.push({ text: fs.result, props, field: instr });
        }
      }
      continue;
    }
    if (child.name === "w:instrText") {
      if (ctx.fieldState) ctx.fieldState.instr += textContentOf(child);
      continue;
    }
    if (ctx.fieldState) {
      if (child.name === "w:t" && ctx.fieldState.phase === "result") {
        ctx.fieldState.result += child.children.filter((c) => typeof c === "string").join("");
      }
      continue;
    }
    if (child.name === "w:t") {
      text += child.children.filter((c) => typeof c === "string").join("");
    } else if (child.name === "w:tab") text += "	";
    else if (child.name === "w:br" || child.name === "w:cr") {
      text += child.attrs["w:type"] === "page" ? "\f" : "\n";
    } else if (child.name === "w:sym") {
      if (text) {
        flush(text);
        text = "";
      }
      const hex = child.attrs["w:char"] ?? "F0B7";
      let code = parseInt(hex, 16);
      if (code <= 255) code |= 61440;
      runs.push({
        text: String.fromCharCode(code),
        props: { ...rProps, fontAscii: child.attrs["w:font"] ?? rProps.fontAscii }
      });
    } else if (child.name === "w:footnoteReference" || child.name === "w:endnoteReference") {
      if (text) {
        flush(text);
        text = "";
      }
      const id = parseInt(child.attrs["w:id"] ?? "0", 10);
      runs.push({
        text: "",
        props: { ...rProps, vertAlign: "superscript" },
        noteRef: { kind: child.name === "w:footnoteReference" ? "footnote" : "endnote", id }
      });
    } else if (child.name === "w:drawing") {
      if (text) {
        flush(text);
        text = "";
      }
      const image = readDrawing(child, ctx.resolveImage);
      if (image) runs.push({ text: "\uFFFC", props: { ...rProps }, image });
    }
  }
  if (text.length > 0) flush(text);
}
function readParagraph(pEl, ctx) {
  const props = {};
  const pPr = firstChild(pEl, "w:pPr");
  if (pPr) {
    const jc = firstChild(pPr, "w:jc")?.attrs["w:val"];
    if (jc === "center" || jc === "right" || jc === "both" || jc === "left") props.alignment = jc;
    props.styleId = firstChild(pPr, "w:pStyle")?.attrs["w:val"];
    const numPr = firstChild(pPr, "w:numPr");
    if (numPr) {
      const numId = parseInt(firstChild(numPr, "w:numId")?.attrs["w:val"] ?? "0", 10);
      props.numbering = {
        kind: numId === 1002 ? "decimal" : "bullet",
        ilvl: parseInt(firstChild(numPr, "w:ilvl")?.attrs["w:val"] ?? "0", 10)
      };
    }
    const ind = firstChild(pPr, "w:ind");
    if (ind) {
      if (ind.attrs["w:left"]) props.indentLeftTwips = parseInt(ind.attrs["w:left"], 10);
      if (ind.attrs["w:right"]) props.indentRightTwips = parseInt(ind.attrs["w:right"], 10);
      if (ind.attrs["w:firstLine"]) props.indentFirstLineTwips = parseInt(ind.attrs["w:firstLine"], 10);
      if (ind.attrs["w:hanging"]) props.indentFirstLineTwips = -parseInt(ind.attrs["w:hanging"], 10);
    }
    const spacing = firstChild(pPr, "w:spacing");
    if (spacing) {
      if (spacing.attrs["w:line"] && spacing.attrs["w:lineRule"] === "auto") {
        props.lineTwentieths = parseInt(spacing.attrs["w:line"], 10);
      }
      if (spacing.attrs["w:after"]) props.spaceAfterTwips = parseInt(spacing.attrs["w:after"], 10);
      if (spacing.attrs["w:before"]) props.spaceBeforeTwips = parseInt(spacing.attrs["w:before"], 10);
    }
    const shd = firstChild(pPr, "w:shd")?.attrs["w:fill"];
    if (shd && shd !== "auto") props.shadingHex = shd;
    const tabs = firstChild(pPr, "w:tabs");
    if (tabs) {
      const stops = childElements(tabs, "w:tab").map((t) => ({
        posTwips: parseInt(t.attrs["w:pos"] ?? "0", 10),
        align: t.attrs["w:val"] === "right" ? "right" : "left",
        leader: t.attrs["w:leader"] === "dot" ? "dot" : void 0
      })).filter((t) => t.posTwips > 0);
      if (stops.length) props.tabStops = stops;
    }
    const pBdr = firstChild(pPr, "w:pBdr");
    if (pBdr) {
      props.boxBorder = true;
      const borders = {};
      for (const side of ["top", "left", "bottom", "right"]) {
        const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
        if (edge) borders[side] = edge;
      }
      if (Object.keys(borders).length > 0) props.borders = borders;
    }
    if (firstChild(pPr, "w:pageBreakBefore")) props.pageBreakBefore = true;
    const framePr = firstChild(pPr, "w:framePr");
    if (framePr?.attrs["w:dropCap"] && framePr.attrs["w:dropCap"] !== "none") props.dropCap = true;
  }
  const runs = [];
  readRunsInto(runs, pEl, ctx);
  const instr = collectInstrText(pEl);
  if (/\bTOC\b/.test(instr)) props.tocInstr = instr.trim();
  return { runs, props };
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
    fieldState: null,
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
    marginBottomTwips: tw(pgMar, "w:bottom", 1417)
  };
  const num = colsEl ? parseInt(colsEl.attrs["w:num"] ?? "1", 10) : 1;
  if (num > 1) {
    sect.cols = {
      count: num,
      spaceTwips: parseInt(colsEl.attrs["w:space"] ?? "720", 10),
      sep: colsEl.attrs["w:sep"] === "true" || colsEl.attrs["w:sep"] === "1"
    };
  }
  return sect;
}

// ../docx-core/src/styles.ts
var onOff2 = (el) => {
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
        p.bold = onOff2(el);
        break;
      case "w:i":
        p.italic = onOff2(el);
        break;
      case "w:caps":
        p.allCaps = onOff2(el);
        break;
      case "w:smallCaps":
        p.smallCaps = onOff2(el);
        break;
      case "w:strike":
        p.strike = onOff2(el);
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
      run: { ...base.run, ...r.run }
    };
    out.set(id, resolved);
    return resolved;
  };
  for (const id of raw.keys()) resolve(id, /* @__PURE__ */ new Set());
  out.set("docDefaults", { para: { ...defPara }, run: { ...defRun } });
  return out;
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
function readTable(tblEl, ctx) {
  const grid = firstChild(tblEl, "w:tblGrid");
  const gridColsTwips = grid ? childElements(grid, "w:gridCol").map((c) => parseInt(c.attrs["w:w"] ?? "0", 10)) : [];
  const tblPr = firstChild(tblEl, "w:tblPr");
  const tblBorders = readBorderSet(tblPr && firstChild(tblPr, "w:tblBorders"), true);
  const rows = [];
  for (const trEl of childElements(tblEl, "w:tr")) {
    const cells = [];
    for (const tcEl of childElements(trEl, "w:tc")) {
      const tcPr = firstChild(tcEl, "w:tcPr");
      const shd = tcPr && firstChild(tcPr, "w:shd")?.attrs["w:fill"];
      const tcW = tcPr && firstChild(tcPr, "w:tcW");
      const cellBorders = readBorderSet(tcPr && firstChild(tcPr, "w:tcBorders"), true);
      const gridSpan = tcPr ? parseInt(firstChild(tcPr, "w:gridSpan")?.attrs["w:val"] ?? "1", 10) : 1;
      const paragraphs = childElements(tcEl, "w:p").map((p) => readParagraph(p, ctx));
      const tables = childElements(tcEl, "w:tbl").map((t) => readTable(t, ctx));
      if (paragraphs.length === 0 && tables.length === 0) paragraphs.push({ runs: [], props: {} });
      cells.push({
        paragraphs,
        tables,
        gridSpan,
        widthTwips: tcW && tcW.attrs["w:type"] === "dxa" ? parseInt(tcW.attrs["w:w"] ?? "0", 10) : void 0,
        shadingHex: shd && shd !== "auto" ? shd : void 0,
        borders: cellBorders
      });
    }
    if (cells.length > 0) rows.push({ cells });
  }
  return { type: "table", rows, gridColsTwips, borders: tblBorders };
}
function readHeaderFooterPart(pkg, path) {
  const xml = pkg.getPartText(path);
  if (!xml) return void 0;
  const root = parseXml(xml);
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  const paras = [];
  for (const child of childElements(root)) {
    if (child.name === "w:p") paras.push(readParagraph(child, ctx));
    else if (child.name === "w:tbl") {
      const t = readTable(child, ctx);
      for (const r of t.rows) for (const c of r.cells) paras.push(...c.paragraphs);
    }
  }
  return paras;
}
function readNotesPart(pkg, path, elementName) {
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(path);
  if (!xml) return out;
  const root = parseXml(xml);
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  for (const note of childElements(root, elementName)) {
    const id = parseInt(note.attrs["w:id"] ?? "0", 10);
    const type = note.attrs["w:type"];
    if (type === "separator" || type === "continuationSeparator") continue;
    out.set(id, childElements(note, "w:p").map((p) => readParagraph(p, ctx)));
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
function readFullDocument(pkg) {
  const root = parseXml(pkg.documentXml());
  const body = firstChild(root, "w:body");
  if (!body) throw new Error("w:document sem w:body");
  const ctx = buildReadContext(pkg, "word/_rels/document.xml.rels");
  const relsXml = pkg.getPartText("word/_rels/document.xml.rels");
  const relTargets = /* @__PURE__ */ new Map();
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), "Relationship")) {
      if (rel.attrs["Id"] && rel.attrs["Target"]) {
        relTargets.set(rel.attrs["Id"], `word/${rel.attrs["Target"].replace(/^\.\//, "")}`);
      }
    }
  }
  const readHfSet = (sectEl, kind) => {
    const set = {};
    const refs = [];
    for (const ref of childElements(sectEl, `w:${kind}`)) {
      const rid = ref.attrs["r:id"];
      const type = ref.attrs["w:type"] ?? "default";
      const target = rid && relTargets.get(rid);
      if (target && rid) {
        const paras = readHeaderFooterPart(pkg, target);
        if (paras) {
          set[type] = paras;
          refs.push({ type, rid, path: target });
        }
      }
    }
    return { set, refs };
  };
  const blocks = [];
  const sections = [];
  const bookmarks = /* @__PURE__ */ new Map();
  ctx.onBookmark = (name) => {
    if (!bookmarks.has(name)) bookmarks.set(name, blocks.length);
  };
  let sectionStart = 0;
  const closeSection = (sectEl, endBlock) => {
    const h = readHfSet(sectEl, "headerReference");
    const f = readHfSet(sectEl, "footerReference");
    sections.push({
      sectPr: readSectPr(sectEl),
      blockStart: sectionStart,
      blockEnd: endBlock,
      headers: h.set,
      footers: f.set,
      headerRefs: h.refs,
      footerRefs: f.refs
    });
    sectionStart = endBlock + 1;
  };
  for (const child of childElements(body)) {
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
    } else if (child.name === "w:sdt") {
      const content = firstChild(child, "w:sdtContent");
      if (content) {
        for (const inner of childElements(content)) {
          if (inner.name === "w:p") blocks.push({ type: "paragraph", paragraph: readParagraph(inner, ctx) });
          else if (inner.name === "w:tbl") blocks.push(readTable(inner, ctx));
        }
      }
    }
  }
  if (sections.length === 0) {
    closeSection(firstChild(body, "w:sectPr") ?? { name: "w:sectPr", attrs: {}, children: [] }, blocks.length - 1);
  }
  if (blocks.length === 0) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  return {
    blocks,
    sections,
    footnotes: readNotesPart(pkg, "word/footnotes.xml", "w:footnote"),
    endnotes: readNotesPart(pkg, "word/endnotes.xml", "w:endnote"),
    comments: readComments(pkg),
    styles: readStyles(pkg),
    bookmarks
  };
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

// src/word-diff.ts
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
  --wd-insert-bg: light-dark(rgba(63,185,80,0.15), rgba(63,185,80,0.18));
  --wd-insert-bg-intra: light-dark(rgba(63,185,80,0.40), rgba(63,185,80,0.45));
  --wd-delete-bg: light-dark(rgba(248,81,73,0.15), rgba(248,81,73,0.18));
  --wd-delete-bg-intra: light-dark(rgba(248,81,73,0.40), rgba(248,81,73,0.45));
  --wd-minor-bg: light-dark(rgba(59,130,246,0.12), rgba(59,130,246,0.16));
  --wd-stripe-insert: #3fb950;
  --wd-stripe-delete: #f85149;
  --wd-stripe-minor: #3b82f6;
  --wd-border: light-dark(#d0d7de, #3d444d);
  --wd-text: light-dark(#1f2328, #e6edf3);
  --wd-text-2: light-dark(#59636e, #9198a1);
  --wd-chrome: light-dark(#f6f8fa, #151b23);
  --wd-page: light-dark(#ffffff, #0d1117);
  color: var(--wd-text);
  background: var(--wd-page);
}
.wd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--wd-border);
  background: var(--wd-chrome);
  font-size: 13px;
  flex: none;
}
.wd-header .wd-stats { display: flex; gap: 10px; color: var(--wd-text-2); }
.wd-stat::before { content: "\u25CF"; margin-right: 4px; font-size: 10px; }
.wd-stat--ins::before { color: var(--wd-stripe-insert); }
.wd-stat--del::before { color: var(--wd-stripe-delete); }
.wd-stat--chg::before { color: var(--wd-stripe-delete); }
.wd-stat--fmt::before { color: var(--wd-stripe-minor); }
.wd-header .wd-spacer { flex: 1; }
.wd-header button {
  border: 1px solid var(--wd-border);
  background: transparent;
  color: var(--wd-text);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}
.wd-header button[data-on="1"] { background: var(--wd-minor-bg); border-color: var(--wd-stripe-minor); }
.wd-header .wd-close { border: none; font-size: 16px; line-height: 1; padding: 2px 8px; }
.wd-body { flex: 1; overflow: auto; min-height: 0; }
.wd-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
}
.wd-pane-header {
  position: sticky;
  top: 0;
  z-index: 1;
  grid-column: span 2;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--wd-text-2);
  background: var(--wd-chrome);
  border-bottom: 1px solid var(--wd-border);
}
.wd-gutter {
  padding: 4px 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--wd-text-2);
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--wd-border);
}
.wd-cell {
  position: relative;
  padding: 4px 12px 4px 14px;
  overflow-wrap: anywhere;
  border-right: 1px solid var(--wd-border);
}
.wd-cell::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--stripe, transparent);
}
.wd-cell[data-kind="insert"] { --stripe: var(--wd-stripe-insert); background: var(--wd-insert-bg); }
.wd-cell[data-kind="delete"] { --stripe: var(--wd-stripe-delete); background: var(--wd-delete-bg); }
.wd-cell[data-kind="change"] { --stripe: var(--wd-stripe-delete); background: var(--wd-delete-bg); }
.wd-cell[data-kind="format"] { --stripe: var(--wd-stripe-minor); background: var(--wd-minor-bg); }
.wd-cell[data-kind="pad"] {
  background:
    repeating-linear-gradient(45deg, transparent, transparent 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 8px);
}
.wd-intra--ins { background: var(--wd-insert-bg-intra); border-radius: 2px; }
.wd-intra--del { background: var(--wd-delete-bg-intra); border-radius: 2px; }
.wd-band {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  color: var(--wd-text-2);
  background: var(--wd-chrome);
  border-top: 1px solid var(--wd-border);
  border-bottom: 1px solid var(--wd-border);
  cursor: pointer;
  user-select: none;
}
.wd-band:hover { background: var(--wd-minor-bg); }
.wd-para { margin: 0; min-height: 1.2em; }
.wd-para img { max-width: 100%; height: auto; vertical-align: bottom; }
.wd-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 10px;
  background: var(--wd-minor-bg);
  color: var(--wd-text-2);
  vertical-align: middle;
}
table.wd-table { border-collapse: collapse; margin: 2px 0; width: 100%; }
table.wd-table td {
  border: 1px solid var(--wd-border);
  padding: 2px 6px;
  vertical-align: top;
}
tr.wd-row--insert { background: var(--wd-insert-bg); }
tr.wd-row--delete { background: var(--wd-delete-bg); }
tr.wd-row--change { background: var(--wd-delete-bg); }
tr.wd-row--format { background: var(--wd-minor-bg); }
.wd-empty { color: var(--wd-text-2); font-style: italic; padding: 24px; text-align: center; }
`
);
var WordDiffElement = class extends Base {
  static get observedAttributes() {
    return ["view", "left-label", "right-label"];
  }
  _shadow;
  _aDoc = null;
  _bDoc = null;
  _diff = null;
  _blobUrls = [];
  _expandedBands = /* @__PURE__ */ new Set();
  _renderScheduled = false;
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
  }
  attributeChangedCallback() {
    this._schedule();
  }
  connectedCallback() {
    if (this._diff) this._schedule();
  }
  disconnectedCallback() {
    this._revokeBlobs();
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
      empty.className = "wd-empty";
      empty.textContent = "Nenhuma compara\xE7\xE3o carregada \u2014 chame loadPair(aBytes, bBytes).";
      root.append(empty);
      this._shadow.replaceChildren(style, root);
      return;
    }
    root.append(this._renderHeader(doc));
    const body = doc.createElement("div");
    body.className = "wd-body";
    const grid = doc.createElement("div");
    grid.className = "wd-grid";
    const headA = doc.createElement("div");
    headA.className = "wd-pane-header";
    headA.textContent = this.getAttribute("left-label") ?? "Original";
    const headB = doc.createElement("div");
    headB.className = "wd-pane-header";
    headB.textContent = this.getAttribute("right-label") ?? "Modificado";
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
      empty.className = "wd-empty";
      empty.style.gridColumn = "1 / -1";
      empty.textContent = "Documentos vazios.";
      grid.append(empty);
    }
    body.append(grid);
    root.append(body);
    this._shadow.replaceChildren(style, root);
  }
  _renderHeader(doc) {
    const stats = this._diff.stats;
    const header = doc.createElement("div");
    header.className = "wd-header";
    const statsBox = doc.createElement("div");
    statsBox.className = "wd-stats";
    const stat = (cls, label, n) => {
      if (n === 0) return;
      const s = doc.createElement("span");
      s.className = `wd-stat wd-stat--${cls}`;
      s.textContent = `${n} ${label}`;
      statsBox.append(s);
    };
    stat("ins", "inseridos", stats.inserted);
    stat("del", "removidos", stats.deleted);
    stat("chg", "alterados", stats.changed);
    stat("fmt", "formata\xE7\xE3o", stats.formatOnly);
    if (statsBox.childElementCount === 0) {
      const s = doc.createElement("span");
      s.textContent = "Documentos id\xEAnticos";
      statsBox.append(s);
    }
    header.append(statsBox);
    const spacer = doc.createElement("div");
    spacer.className = "wd-spacer";
    header.append(spacer);
    const toggle = doc.createElement("button");
    toggle.textContent = "S\xF3 altera\xE7\xF5es";
    toggle.dataset["on"] = this.view === "diffs" ? "1" : "0";
    toggle.addEventListener("click", () => {
      this.view = this.view === "diffs" ? "all" : "diffs";
    });
    header.append(toggle);
    const close = doc.createElement("button");
    close.className = "wd-close";
    close.title = "Fechar compara\xE7\xE3o";
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
    band.className = "wd-band";
    band.textContent = `\u2026 ${count} bloco${count === 1 ? "" : "s"} sem altera\xE7\xF5es \u2026`;
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
    g.className = "wd-gutter";
    g.textContent = blockIdx === null ? "" : String(blockIdx + 1);
    return g;
  }
  _cell(doc, side, row, edit) {
    const cell = doc.createElement("div");
    cell.className = "wd-cell";
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
        badge.className = "wd-badge";
        badge.textContent = "formata\xE7\xE3o";
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
    el.className = "wd-para";
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
        wrap.className = marks[0].kind === "insert" ? "wd-intra--ins" : "wd-intra--del";
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
      mark.className = m.kind === "insert" ? "wd-intra--ins" : "wd-intra--del";
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
    el.className = "wd-table";
    for (let ri = 0; ri < t.rows.length; ri++) {
      const tr = doc.createElement("tr");
      const kind = rowKind.get(ri);
      if (kind && kind !== "equal") tr.className = `wd-row--${kind}`;
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
if (typeof customElements !== "undefined" && !customElements.get("word-diff")) {
  customElements.define("word-diff", WordDiffElement);
}
export {
  DEFAULT_DOC_DIFF_OPTIONS,
  WordDiffElement,
  bytesEqual,
  diffBlocks,
  diffDocuments,
  fnv1a,
  histogramDiff,
  intraWordMarks,
  myersDiff,
  tokenizeBlock,
  tokenizeBlocks,
  tokensEqual
};
