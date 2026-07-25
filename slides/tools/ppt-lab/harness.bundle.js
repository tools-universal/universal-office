// node_modules/fflate/esm/browser.js
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

// packages/slides-core/src/package.ts
var PptxPackage = class _PptxPackage {
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  static load(bytes) {
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

// packages/slides-core/src/xml.ts
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
      if (i2 < 0) error("aspas nao fechadas");
      attrs[aName] = decodeEntities(xml.slice(vStart, i2));
      i2++;
    }
    const children = [];
    for (; ; ) {
      if (i2 >= n) error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        i2 = xml.indexOf(">", i2) + 1;
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
  return parseElement();
}
function childElements(el, name) {
  return el.children.filter((c) => typeof c !== "string" && (name === void 0 || c.name === name));
}
function firstChild(el, name) {
  return childElements(el, name)[0];
}
function descend(el, name) {
  for (const c of el.children) {
    if (typeof c === "string") continue;
    if (c.name === name) return c;
    const found = descend(c, name);
    if (found) return found;
  }
  return void 0;
}
function textContent(el) {
  let out = "";
  for (const c of el.children) out += typeof c === "string" ? c : textContent(c);
  return out;
}

// packages/slides-core/src/theme.ts
var STD_MAP = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
function readTheme(pkg, themePath) {
  const colors = {};
  const xml = pkg.getPartText(themePath);
  if (xml === void 0) return { colors };
  const root = parseXml(xml);
  const themeEls = firstChild(root, "a:themeElements");
  const scheme = themeEls ? firstChild(themeEls, "a:clrScheme") : void 0;
  if (scheme) {
    for (const el of childElements(scheme)) {
      const key = el.name.replace(/^a:/, "");
      const c = colorFromDml(childElements(el)[0], { colors });
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
function colorFromDml(el, theme) {
  if (!el) return void 0;
  let base;
  if (el.name === "a:srgbClr") base = "#" + (el.attrs["val"] ?? "000000");
  else if (el.name === "a:sysClr") base = "#" + (el.attrs["lastClr"] ?? "000000");
  else if (el.name === "a:prstClr") base = PRESET[el.attrs["val"] ?? "black"] ?? "#000000";
  else if (el.name === "a:schemeClr") {
    const v = el.attrs["val"] ?? "";
    base = theme.colors[v] ?? theme.colors[STD_MAP[v] ?? v] ?? "#000000";
  }
  if (base === void 0) return void 0;
  for (const mod of childElements(el)) {
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
  const lin = (v) => Math.pow(v / 255, 2.2);
  const srgb = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
  const mix = (v) => srgb(lin(v) * f + target * (1 - f));
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

// packages/slides-core/src/table-style.ts
var PART_NAMES = [
  ["wholeTbl", "a:wholeTbl"],
  ["band1H", "a:band1H"],
  ["band2H", "a:band2H"],
  ["firstRow", "a:firstRow"],
  ["lastRow", "a:lastRow"],
  ["firstCol", "a:firstCol"],
  ["lastCol", "a:lastCol"]
];
function parsePart(el, theme) {
  const out = {};
  const tx = firstChild(el, "a:tcTxStyle");
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
  const tc = firstChild(el, "a:tcStyle");
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
      const el = firstChild(st, name);
      if (el) def[key] = parsePart(el, theme);
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

// packages/slides-core/src/text-style.ts
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
function parseTxStyleLevels(el, theme) {
  const levels = Array.from({ length: 9 }, () => ({}));
  if (!el) return levels;
  const defPPr = firstChild(el, "a:defPPr");
  const base = defPPr ? parsePPrLevel(defPPr, theme) : {};
  for (let i2 = 0; i2 < 9; i2++) {
    const lvlEl = firstChild(el, LEVEL_NAMES[i2]);
    levels[i2] = lvlEl ? { ...base, ...parsePPrLevel(lvlEl, theme) } : { ...base };
  }
  return levels;
}
function parsePPrLevel(pPr, theme) {
  const lvl = {};
  if (pPr.attrs["algn"]) lvl.align = pPr.attrs["algn"];
  if (pPr.attrs["marL"] !== void 0) lvl.marL = parseInt(pPr.attrs["marL"], 10);
  if (pPr.attrs["indent"] !== void 0) lvl.indent = parseInt(pPr.attrs["indent"], 10);
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

// packages/slides-core/src/read.ts
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
  const phMap = placeholderXfrmMap(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.xfrm && sh.phType !== void 0) {
      const x2 = phMap.get(phKey(sh.phType, sh.phIdx)) ?? phMap.get(phKey(sh.phType)) ?? phMap.get("idx:" + (sh.phIdx ?? ""));
      if (x2) sh.xfrm = x2;
    }
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
  const bgEl = cSld ? firstChild(cSld, "p:bg") : void 0;
  if (bgEl) {
    const bgPr = firstChild(bgEl, "p:bgPr");
    if (bgPr) {
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
        const img = resolveBlip(blip, pkg, slideRels);
        if (img) slide.bgImage = img;
      }
    }
  }
  const timing = firstChild(root, "p:timing");
  if (timing) {
    const anims = parseTiming(timing);
    if (anims.length) slide.animations = anims;
  }
  const transEl = firstChild(root, "p:transition");
  if (transEl) slide.transition = parseTransition(transEl);
  return slide;
}
function parseTransition(el) {
  const spd = el.attrs["spd"] ?? "med";
  const durMs = spd === "fast" ? 300 : spd === "slow" ? 1e3 : 500;
  for (const c of childElements(el)) {
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
function deepFindAttr(el, name, attr, val) {
  for (const c of el.children) {
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
      if (gf) out.push(gf);
    } else if (c.name === "p:grpSp") {
      out.push(...readGroup(c, theme, pkg, rels));
    }
  }
  return out;
}
function readGroup(grp, theme, pkg, rels) {
  const children = readShapes(grp, theme, pkg, rels);
  const grpSpPr = firstChild(grp, "p:grpSpPr");
  const xfrmEl = grpSpPr ? firstChild(grpSpPr, "a:xfrm") : void 0;
  if (!xfrmEl) return children;
  const num = (el, a, dflt2) => el?.attrs[a] !== void 0 ? parseInt(el.attrs[a], 10) : dflt2;
  const off = firstChild(xfrmEl, "a:off");
  const ext = firstChild(xfrmEl, "a:ext");
  const chOff = firstChild(xfrmEl, "a:chOff");
  const chExt = firstChild(xfrmEl, "a:chExt");
  const gx = num(off, "x", 0), gy = num(off, "y", 0);
  const gcx = num(ext, "cx", 0), gcy = num(ext, "cy", 0);
  const cox = num(chOff, "x", gx), coy = num(chOff, "y", gy);
  const cex = num(chExt, "cx", gcx), cey = num(chExt, "cy", gcy);
  const sx = cex !== 0 ? gcx / cex : 1;
  const sy = cey !== 0 ? gcy / cey : 1;
  const rotRaw = xfrmEl.attrs["rot"] ? parseInt(xfrmEl.attrs["rot"], 10) : 0;
  const flipH = xfrmEl.attrs["flipH"] === "1";
  const flipV = xfrmEl.attrs["flipV"] === "1";
  const gCenterX = gx + gcx / 2, gCenterY = gy + gcy / 2;
  for (const sh of children) {
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
  return children;
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
        let bw = 0;
        let bc;
        for (const side of ["a:lnL", "a:lnR", "a:lnT", "a:lnB"]) {
          const ln2 = firstChild(tcPr, side);
          if (!ln2) continue;
          const w = ln2.attrs["w"] ? parseInt(ln2.attrs["w"], 10) : 0;
          if (w > bw) bw = w;
          if (!bc) {
            const fillEl = firstChild(ln2, "a:solidFill");
            const srgb = fillEl ? firstChild(fillEl, "a:srgbClr") : void 0;
            if (srgb?.attrs["val"]) bc = "#" + srgb.attrs["val"];
          }
        }
        if (bw) cell.borderWidth = bw;
        if (bc) cell.borderColor = bc;
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
        if (img) shape.fillImage = img;
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
      const srgb = firstChild(shd, "a:srgbClr");
      const scheme = firstChild(shd, "a:schemeClr");
      let color = "#000000", alpha = 1;
      const colorEl = srgb ?? scheme;
      if (colorEl) {
        if (srgb?.attrs["val"]) color = "#" + srgb.attrs["val"];
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
  const pt = (el) => ({
    x: el?.attrs["x"] !== void 0 ? parseInt(el.attrs["x"], 10) : 0,
    y: el?.attrs["y"] !== void 0 ? parseInt(el.attrs["y"], 10) : 0
  });
  for (const path of childElements(pathLst, "a:path")) {
    if (path.attrs["w"]) pw = Math.max(pw, parseInt(path.attrs["w"], 10));
    if (path.attrs["h"]) ph = Math.max(ph, parseInt(path.attrs["h"], 10));
    const segs = [];
    for (const el of childElements(path)) {
      const pts = childElements(el, "a:pt");
      if (el.name === "a:moveTo") {
        const p = pt(pts[0]);
        segs.push({ c: "M", x: p.x, y: p.y });
      } else if (el.name === "a:lnTo") {
        const p = pt(pts[0]);
        segs.push({ c: "L", x: p.x, y: p.y });
      } else if (el.name === "a:cubicBezTo") {
        const p1 = pt(pts[0]), p2 = pt(pts[1]), p3 = pt(pts[2]);
        segs.push({ c: "C", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p3.x, y: p3.y });
      } else if (el.name === "a:quadBezTo") {
        const p1 = pt(pts[0]), p2 = pt(pts[1]);
        segs.push({ c: "Q", x1: p1.x, y1: p1.y, x: p2.x, y: p2.y });
      } else if (el.name === "a:close") segs.push({ c: "Z" });
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
    const color = colorFromDml(childElements(gs)[0], theme);
    if (color) stops.push({ pos: Math.max(0, Math.min(1, pos)), color });
  }
  if (stops.length < 2) return void 0;
  stops.sort((a, b) => a.pos - b.pos);
  const lin = firstChild(grad, "a:lin");
  const angleDeg = lin?.attrs["ang"] !== void 0 ? parseInt(lin.attrs["ang"], 10) / 6e4 : 0;
  const out = { type: "gradient", stops, angleDeg };
  if (lin?.attrs["scaled"] === "1") out.scaled = true;
  const pathEl = firstChild(grad, "a:path");
  if (pathEl) out.path = pathEl.attrs["path"] ?? "shape";
  return out;
}
function parseXfrm(el) {
  const off = firstChild(el, "a:off");
  const ext = firstChild(el, "a:ext");
  const x2 = {
    x: off?.attrs["x"] !== void 0 ? parseInt(off.attrs["x"], 10) : 0,
    y: off?.attrs["y"] !== void 0 ? parseInt(off.attrs["y"], 10) : 0,
    cx: ext?.attrs["cx"] !== void 0 ? parseInt(ext.attrs["cx"], 10) : 0,
    cy: ext?.attrs["cy"] !== void 0 ? parseInt(ext.attrs["cy"], 10) : 0
  };
  if (el.attrs["rot"]) x2.rot = parseInt(el.attrs["rot"], 10);
  if (el.attrs["flipH"] === "1") x2.flipH = true;
  if (el.attrs["flipV"] === "1") x2.flipV = true;
  return x2;
}
function readTxBody(el, theme, rels) {
  const bodyPr = firstChild(el, "a:bodyPr");
  const tb = { paragraphs: [] };
  if (bodyPr) {
    if (bodyPr.attrs["anchor"]) tb.anchor = bodyPr.attrs["anchor"];
    if (bodyPr.attrs["wrap"]) tb.wrap = bodyPr.attrs["wrap"];
    if (bodyPr.attrs["lIns"] !== void 0) tb.insL = parseInt(bodyPr.attrs["lIns"], 10);
    if (bodyPr.attrs["tIns"] !== void 0) tb.insT = parseInt(bodyPr.attrs["tIns"], 10);
    if (bodyPr.attrs["rIns"] !== void 0) tb.insR = parseInt(bodyPr.attrs["rIns"], 10);
    if (bodyPr.attrs["bIns"] !== void 0) tb.insB = parseInt(bodyPr.attrs["bIns"], 10);
    const na = firstChild(bodyPr, "a:normAutofit");
    if (na) {
      if (na.attrs["fontScale"] !== void 0) tb.fontScale = parseInt(na.attrs["fontScale"], 10) / 1e5;
      if (na.attrs["lnSpcReduction"] !== void 0) tb.lnSpcReduction = parseInt(na.attrs["lnSpcReduction"], 10) / 1e5;
    }
  }
  const lst = firstChild(el, "a:lstStyle");
  if (lst && childElements(lst).length > 0) tb.lstStyle = parseTxStyleLevels(lst, theme);
  for (const p of childElements(el, "a:p")) tb.paragraphs.push(readParagraph(p, theme, rels));
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
      const pct = firstChild(lnSpc, "a:spcPct");
      const pts = firstChild(lnSpc, "a:spcPts");
      if (pct?.attrs["val"]) para.lineSpacing = parseInt(pct.attrs["val"], 10) / 1e5;
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
  for (const child of childElements(p)) {
    if (child.name === "a:r") para.runs.push(readRun(child, theme, rels));
    else if (child.name === "a:br") para.runs.push({ text: "\n" });
    else if (child.name === "a:fld") {
      const t = firstChild(child, "a:t");
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
  if (blip) {
    const img = resolveBlip(blip, pkg, rels);
    if (img) shape.image = img;
    const am = firstChild(blip, "a:alphaModFix");
    if (am?.attrs["amt"]) shape.alpha = Math.max(0, Math.min(1, parseInt(am.attrs["amt"], 10) / 1e5));
  }
  if (srcRect) {
    const num = (a) => (a ? parseInt(a, 10) : 0) / 1e5;
    shape.srcRect = {
      l: num(srcRect.attrs["l"]),
      t: num(srcRect.attrs["t"]),
      r: num(srcRect.attrs["r"]),
      b: num(srcRect.attrs["b"])
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

// packages/slides-core/src/chart-engine.ts
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
    const cache = strRef ? firstChild(strRef, "c:strCache") : void 0;
    if (cache) {
      const pt = firstChild(cache, "c:pt");
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
  const cache = deepFind(block, "c:numCache");
  if (!cache) return;
  const indexed = [];
  for (const pt of childElements(cache, "c:pt")) {
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
function deepFind(el, name) {
  for (const c of el.children) {
    if (typeof c === "string") continue;
    if (c.name === name) return c;
    const f = deepFind(c, name);
    if (f) return f;
  }
  return void 0;
}
function walkText(el, out) {
  for (const c of el.children) {
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
function paintChart(ctx, chart, x2, y, w, h, pxPerPt, frameBorder) {
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
  const legendH = showLegend ? labelPx + 20 * u : 0;
  const legendTop = chart.legendPos === "t";
  const px = x2 + 8 * u;
  const py = plotY + (legendTop ? legendH : 0);
  const pw = w - 16 * u;
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
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, 0);
      break;
    case "doughnut":
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, chart.holeSize ?? 0.75);
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
    const ly = legendTop ? plotY : py + ph + 6 * u;
    paintLegend(ctx, chart, px, ly, pw, legendH, labelPx);
  }
}
function paletteOf(chart) {
  return chart.palette && chart.palette.length ? chart.palette : DEFAULT_PALETTE;
}
function colorOf(chart, i2) {
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
  const raw = (max2 - min) / 5 || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = mag * (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10);
  const lo = min < 0 ? Math.floor(min * 1.05 / step) * step : Math.floor(min / step) * step;
  const hi = max2 > 0 ? Math.ceil(max2 * 1.05 / step) * step : Math.ceil(max2 / step) * step;
  return { lo, hi, step };
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
    ctx.fillStyle = colorOf(chart, s);
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
    const col = colorOf(chart, s);
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
function paintPieOrDoughnut(ctx, chart, x2, y, w, h, holeFrac) {
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
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, radius / 90);
    ctx.stroke();
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
    ctx.fillStyle = colorOf(chart, s);
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
    const c = colorOf(chart, s);
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
  const entries = byCategory ? chart.categories.map((c, i2) => ({ label: c, color: pal[i2 % pal.length] })) : chart.series.map((s, i2) => ({ label: s.name || `S\xE9rie ${i2 + 1}`, color: colorOf(chart, i2) }));
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

// packages/slides-core/src/model.ts
var EMU_PER_INCH = 914400;
var EMU_PER_POINT = 12700;
var EMU_PER_PX = EMU_PER_INCH / 96;

// packages/slides-core/src/text-layout.ts
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
function tokenize(runs) {
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
  const wrap = tb.wrap !== "none";
  const fOpts = { defaultSzPt, defaultFont };
  const measureEmu = (text, f) => measure(text, f) * EMU_PER_POINT;
  const proto = [];
  const heights = [];
  const spacers = [];
  let pendingSpacer = 0;
  const autoNumCounters = Array.from({ length: 9 }, () => 0);
  for (const p of tb.paragraphs) {
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
    const words = tokenize(runs);
    let cur = { runs: [], marL: firstX, align, bullet };
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
      cur = { runs: [], marL: contX, align };
      curW = 0;
    };
    for (const wd of words) {
      if (wd.text === "\n") {
        flush();
        continue;
      }
      const f = fontOf(wd.run, fontScale, fOpts);
      const wEmu = measureEmu(wd.text, f);
      const availW = Math.max(0, usableW - (cur.marL - insL));
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
  if (anchor === "ctr") y = insT + (usableH - totalH) / 2;
  else if (anchor === "b") y = insT + usableH - totalH;
  const lines = [];
  for (let i2 = 0; i2 < proto.length; i2++) {
    const pl = proto[i2];
    const h = heights[i2];
    y += spacers[i2] ?? 0;
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
      placed.push(pr);
      w += mw;
    }
    let dx = 0;
    if (pl.align === "ctr") dx = (usableW - (pl.marL - insL) - w) / 2;
    else if (pl.align === "r") dx = usableW - (pl.marL - insL) - w;
    if (dx > 0) for (const pr of placed) pr.x += dx;
    const line = { runs: placed, baseline: y + h * BASELINE_FACTOR, height: h };
    if (pl.bullet) line.bullet = pl.bullet;
    lines.push(line);
    y += h;
  }
  return { lines, totalH };
}

// packages/slides-core/src/geometry.ts
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
function presetPath(geom, w, h) {
  const ss = Math.min(w, h);
  switch (geom) {
    case "ellipse":
      return { kind: "ellipse" };
    case "roundRect":
      return { kind: "roundRect", r: ss * 0.1 };
    case "triangle":
      return { kind: "poly", points: [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case "rtTriangle":
      return { kind: "poly", points: [{ x: 0, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case "diamond":
      return { kind: "poly", points: [{ x: w / 2, y: 0 }, { x: w, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h / 2 }] };
    case "parallelogram": {
      const d = ss * 0.25;
      return { kind: "poly", points: [{ x: d, y: 0 }, { x: w, y: 0 }, { x: w - d, y: h }, { x: 0, y: h }] };
    }
    case "trapezoid": {
      const d = ss * 0.25;
      return { kind: "poly", points: [{ x: d, y: 0 }, { x: w - d, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    }
    case "pentagon":
      return { kind: "poly", points: fitToBox(regularPolygon(5, w, h), w, h) };
    case "hexagon": {
      const d = ss * 0.25;
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
      const inner = 19098 / 5e4;
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
      const hd = ss * 0.5, t = h * 0.25;
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
      const hd = ss * 0.5, t = h * 0.25;
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
      const hd = ss * 0.5, t = w * 0.25;
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
      const hd = ss * 0.5, t = w * 0.25;
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
      const d = ss * 0.5;
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
      return { kind: "pie", startDeg: 0, endDeg: 270 };
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
      const t = ss * 0.25;
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
      return { kind: "rect" };
  }
}

// packages/slides-core/src/render.ts
var DEFAULT_TITLE_PT = 40;
var DEFAULT_BODY_PT = 18;
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
  for (let i2 = 0; i2 < slide.shapes.length; i2++) {
    const shp = slide.shapes[i2];
    const op = opts.shapeOpacity ? opts.shapeOpacity(shp, i2) : 1;
    if (op <= 0) continue;
    ctx.save();
    if (op < 1) ctx.globalAlpha = ctx.globalAlpha * op;
    paintShape(ctx, shp, fit, resources, opts.suppressTextShapeIdx === i2);
    ctx.restore();
  }
  ctx.restore();
}
function imgW(img) {
  return typeof img.naturalWidth === "number" && img.naturalWidth > 0 ? img.naturalWidth : typeof img.width === "number" ? img.width : 0;
}
function imgH(img) {
  return typeof img.naturalHeight === "number" && img.naturalHeight > 0 ? img.naturalHeight : typeof img.height === "number" ? img.height : 0;
}
function paintShape(ctx, sh, fit, res, suppressText) {
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
  if (sh.chartXml) {
    let model = res.charts?.get(sh.chartXml);
    if (!model) {
      model = parseChart(sh.chartXml);
      res.charts?.set(sh.chartXml, model);
    }
    if (!model.palette && sh.chartPalette) model.palette = sh.chartPalette;
    paintChart(ctx, model, x2, y, w, h, EMU_PER_POINT * fit.scale);
    if (hasXform || hasAlpha) ctx.restore();
    return;
  }
  if (sh.table) {
    const natW = sh.table.colWidthsEmu.reduce((a, b) => a + b, 0);
    const natH = sh.table.rows.reduce((a, r) => a + r.heightEmu, 0);
    const tw = natW > 0 ? natW * fit.scale : w;
    const th = natH > 0 ? natH * fit.scale : h;
    paintTable(ctx, sh.table, x2, y, tw, th, fit.scale);
    if (hasXform || hasAlpha) ctx.restore();
    return;
  }
  if (sh.image) {
    const img = res.images?.get(sh.image.part);
    if (img) {
      const clipGeom = sh.geom !== void 0 && sh.geom !== "rect";
      if (clipGeom) {
        ctx.save();
        const rule = shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom);
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
    }
    if (sh.lineColor) {
      ctx.strokeStyle = sh.lineColor;
      ctx.lineWidth = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
      shapePath(ctx, sh.geom ?? "rect", x2, y, w, h, sh.custGeom);
      ctx.stroke();
    }
    if (hasXform || hasAlpha) ctx.restore();
    return;
  }
  if (sh.shadow) {
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
    ctx.fillStyle = sh.fill?.type === "solid" && sh.fill.color ? sh.fill.color : "#ffffff";
    const shRule = shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom);
    if (shRule) ctx.fill(shRule);
    else ctx.fill();
    ctx.restore();
  }
  const isLineGeom = sh.geom === "line" || sh.geom === "arc" || /^(straight|bent|curved)Connector\d?$/.test(sh.geom ?? "");
  if (!isLineGeom && (sh.fillImage || sh.fill && sh.fill.type !== "none")) {
    ctx.save();
    if (sh.fillAlpha !== void 0 && sh.fillAlpha < 1) ctx.globalAlpha = ctx.globalAlpha * sh.fillAlpha;
    const rule = shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom);
    if (sh.fillImage) {
      const img = res.images?.get(sh.fillImage.part);
      if (img) {
        ctx.clip();
        ctx.drawImage(img, x2, y, w, h);
      }
    } else if (sh.fill.type === "gradient" && sh.fill.stops && sh.fill.stops.length >= 2) {
      ctx.fillStyle = makeLinearGradient(ctx, sh.fill, x2, y, w, h);
      if (rule) ctx.fill(rule);
      else ctx.fill();
    } else if (sh.fill.type === "solid" && sh.fill.color) {
      const desc = sh.custGeom ? null : presetPath(sh.geom, w, h);
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
  if (sh.lineColor) {
    ctx.strokeStyle = sh.lineColor;
    const lw = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
    ctx.lineWidth = lw;
    if (sh.lineDash) ctx.setLineDash(dashPattern(sh.lineDash, lw));
    shapePath(ctx, sh.geom, x2, y, w, h, sh.custGeom);
    ctx.stroke();
    if (sh.lineDash) ctx.setLineDash([]);
    if (isLineGeom && (sh.headArrow || sh.tailArrow)) {
      const ends = lineEndpoints(sh.geom, x2, y, w, h);
      if (ends) {
        ctx.fillStyle = sh.lineColor;
        if (sh.headArrow) paintArrowhead(ctx, sh.headArrow, ends.hx, ends.hy, ends.hAng, lw);
        if (sh.tailArrow) paintArrowhead(ctx, sh.tailArrow, ends.tx, ends.ty, ends.tAng, lw);
      }
    }
  }
  if (sh.txBody && !suppressText) paintText(ctx, sh, sh.txBody, x2, y, w, h, fit.scale);
  if (hasXform || hasAlpha) ctx.restore();
}
function shapePath(ctx, geom, x2, y, w, h, custGeom) {
  ctx.beginPath();
  if (custGeom) {
    const sx = w / custGeom.w, sy = h / custGeom.h;
    drawSegs(ctx, custGeom.subs, x2, y, sx, sy);
    return void 0;
  }
  const p = presetPath(geom, w, h);
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
function paintText(ctx, sh, tb, x2, y, w, h, scale) {
  const isTitle = sh.phType === "title" || sh.phType === "ctrTitle";
  const measure = (text, f) => {
    ctx.font = layoutFontStr(f, 1);
    return ctx.measureText(text).width;
  };
  const layout = layoutTextBody(tb, w / scale, h / scale, measure, {
    defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT,
    defaultAnchor: isTitle ? "ctr" : "t"
  });
  const pxPerPt = EMU_PER_POINT * scale;
  ctx.textBaseline = "alphabetic";
  for (const line of layout.lines) {
    const by = y + line.baseline * scale;
    if (line.bullet) {
      ctx.font = layoutFontStr(line.bullet.font, pxPerPt);
      ctx.fillStyle = line.bullet.color;
      ctx.fillText(line.bullet.text, x2 + line.bullet.x * scale, by);
    }
    for (const r of line.runs) {
      ctx.font = layoutFontStr(r.font, pxPerPt);
      ctx.fillStyle = r.color;
      const tx = x2 + r.x * scale;
      ctx.fillText(r.text, tx, by);
      if (r.underline) {
        const sizePx = r.font.sizePt * pxPerPt;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = Math.max(1, sizePx / 16);
        const uy = Math.round(by + sizePx * 0.12) + 0.5;
        ctx.beginPath();
        ctx.moveTo(tx, uy);
        ctx.lineTo(tx + r.w * scale, uy);
        ctx.stroke();
      }
    }
  }
}
function layoutFontStr(f, pxPerPt) {
  return `${f.italic ? "italic " : ""}${f.bold ? "700 " : "400 "}${f.sizePt * pxPerPt}px '${f.family}', 'Aptos', Calibri, Arial, sans-serif`;
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
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x2, y, w, h);
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
        ctx.fillStyle = cell.fill;
        ctx.fillRect(cx0, cy0, cw, ch);
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
      const bw = (cell.borderWidth ?? 12700) * scale;
      const bc = cell.borderColor ?? "#CBD5E1";
      ctx.strokeStyle = bc;
      ctx.lineWidth = Math.max(0.5, bw);
      ctx.strokeRect(cx0 + 0.5, cy0 + 0.5, cw - 1, ch - 1);
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
        ctx.font = `${l.italic ? "italic " : ""}${l.bold ? "700 " : "400 "}${l.size}px '${l.font}', 'Aptos', Calibri, Arial, sans-serif`;
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
  const stops = rawStops.map((s) => ({ pos: Math.max(0, Math.min(1, s.pos)), color: s.color }));
  for (let i2 = 0; i2 < stops.length; i2++) {
    const s = stops[i2];
    g.addColorStop(s.pos, s.color);
    const nx = stops[i2 + 1];
    if (!nx || nx.pos - s.pos < 0.05) continue;
    for (let k = 1; k < 8; k++) {
      const f = k / 8;
      g.addColorStop(s.pos + (nx.pos - s.pos) * f, mixLinearRgb(s.color, nx.color, f));
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
  const lin = (v) => Math.pow(v / 255, 2.2);
  const srgb = (v) => Math.round(Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255);
  const mix = (a, b) => srgb(lin(a) * (1 - f) + lin(b) * f);
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

// packages/viewer/src/universal-presentation-viewer.ts
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
  play = { startMs: null, rafId: 0, pausedAt: 0 };
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
    this.pkg = PptxPackage.load(bytes);
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
    this.play.startMs = (window.performance ?? Date).now();
    const lastEnd = Math.max(...slide.animations.map((a) => a.delayMs + a.durMs));
    const tick = () => {
      if (this.play.startMs == null) return;
      const tMs = (window.performance ?? Date).now() - this.play.startMs;
      this.paint();
      if (tMs < lastEnd) this.play.rafId = requestAnimationFrame(tick);
      else this.play.startMs = null;
    };
    this.play.rafId = requestAnimationFrame(tick);
  }
  /** Para qualquer animação em curso (cancela o RAF). */
  stopAnimation() {
    if (this.play.rafId) cancelAnimationFrame(this.play.rafId);
    this.play.startMs = null;
    this.play.rafId = 0;
  }
  /**
   * Opacidade computada de uma shape no instante t da timeline. Sem animacao
   * para essa shape → opaca. Antes do delay → invisível. Durante o ramp →
   * linear; após o fim → opaca.
   */
  shapeOpacity(shape, slide) {
    if (!slide.animations || slide.animations.length === 0) return 1;
    if (this.play.startMs == null) return 1;
    const t = (window.performance ?? Date).now() - this.play.startMs;
    const entry = slide.animations.find((a) => a.spid === shape.id);
    if (!entry) return 1;
    if (t < entry.delayMs) return 0;
    if (t >= entry.delayMs + entry.durMs) return 1;
    const f = (t - entry.delayMs) / entry.durMs;
    return entry.type === "fade" ? f : 1;
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

// tools/ppt-lab/harness.ts
var pv = document.getElementById("pv");
var cv = document.getElementById("cv");
window.harness = {
  /** Carrega o deck e resolve com o número de slides. */
  async loadDeck(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    pv.loadPptx(new Uint8Array(await res.arrayBuffer()));
    return pv.getSlideCount();
  },
  /** Pinta o slide i no canvas visível em tamanho exato. */
  paintSlide(i2, pxWidth) {
    return pv.renderSlideToCanvas(i2, cv, pxWidth);
  },
  /** Quantas imagens do deck ainda não decodificaram (0 = pronto p/ capturar). */
  pendingImages() {
    const cache = pv.imageCache;
    let n = 0;
    for (const e of cache.values()) if (!e.ready) n++;
    return n;
  }
};
