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
  var b5 = new u16(31);
  for (var i7 = 0; i7 < 31; ++i7) {
    b5[i7] = start += 1 << eb[i7 - 1];
  }
  var r6 = new i32(b5[30]);
  for (var i7 = 1; i7 < 30; ++i7) {
    for (var j = b5[i7]; j < b5[i7 + 1]; ++j) {
      r6[j] = j - b5[i7] << 5 | i7;
    }
  }
  return { b: b5, r: r6 };
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
var hMap = (function(cd, mb, r6) {
  var s4 = cd.length;
  var i7 = 0;
  var l3 = new u16(mb);
  for (; i7 < s4; ++i7) {
    if (cd[i7])
      ++l3[cd[i7] - 1];
  }
  var le = new u16(mb);
  for (i7 = 1; i7 < mb; ++i7) {
    le[i7] = le[i7 - 1] + l3[i7 - 1] << 1;
  }
  var co;
  if (r6) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i7 = 0; i7 < s4; ++i7) {
      if (cd[i7]) {
        var sv = i7 << 4 | cd[i7];
        var r_1 = mb - cd[i7];
        var v2 = le[cd[i7] - 1]++ << r_1;
        for (var m2 = v2 | (1 << r_1) - 1; v2 <= m2; ++v2) {
          co[rev[v2] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s4);
    for (i7 = 0; i7 < s4; ++i7) {
      if (cd[i7]) {
        co[i7] = rev[le[cd[i7] - 1]++] >> 15 - cd[i7];
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
var max = function(a3) {
  var m2 = a3[0];
  for (var i7 = 1; i7 < a3.length; ++i7) {
    if (a3[i7] > m2)
      m2 = a3[i7];
  }
  return m2;
};
var bits = function(d3, p3, m2) {
  var o7 = p3 / 8 | 0;
  return (d3[o7] | d3[o7 + 1] << 8) >> (p3 & 7) & m2;
};
var bits16 = function(d3, p3) {
  var o7 = p3 / 8 | 0;
  return (d3[o7] | d3[o7 + 1] << 8 | d3[o7 + 2] << 16) >> (p3 & 7);
};
var shft = function(p3) {
  return (p3 + 7) / 8 | 0;
};
var slc = function(v2, s4, e8) {
  if (s4 == null || s4 < 0)
    s4 = 0;
  if (e8 == null || e8 > v2.length)
    e8 = v2.length;
  return new u8(v2.subarray(s4, e8));
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
  var e8 = new Error(msg || ec[ind]);
  e8.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e8, err);
  if (!nt)
    throw e8;
  return e8;
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
  var cbuf = function(l4) {
    var bl = buf.length;
    if (l4 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l4));
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
        var s4 = shft(pos) + 4, l3 = dat[s4 - 4] | dat[s4 - 3] << 8, t5 = s4 + l3;
        if (t5 > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l3);
        buf.set(dat.subarray(s4, t5), bt);
        st.b = bt += l3, st.p = pos = t5 * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i7 = 0; i7 < hcLen; ++i7) {
          clt[clim[i7]] = bits(dat, pos + i7 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i7 = 0; i7 < tl; ) {
          var r6 = clm[bits(dat, pos, clbmsk)];
          pos += r6 & 15;
          var s4 = r6 >> 4;
          if (s4 < 16) {
            ldt[i7++] = s4;
          } else {
            var c4 = 0, n5 = 0;
            if (s4 == 16)
              n5 = 3 + bits(dat, pos, 3), pos += 2, c4 = ldt[i7 - 1];
            else if (s4 == 17)
              n5 = 3 + bits(dat, pos, 7), pos += 3;
            else if (s4 == 18)
              n5 = 11 + bits(dat, pos, 127), pos += 7;
            while (n5--)
              ldt[i7++] = c4;
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
      var c4 = lm[bits16(dat, pos) & lms], sym = c4 >> 4;
      pos += c4 & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c4)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i7 = sym - 257, b5 = fleb[i7];
          add = bits(dat, pos, (1 << b5) - 1) + fl[i7];
          pos += b5;
        }
        var d3 = dm[bits16(dat, pos) & dms], dsym = d3 >> 4;
        if (!d3)
          err(3);
        pos += d3 & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b5 = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b5) - 1, pos += b5;
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
var wbits = function(d3, p3, v2) {
  v2 <<= p3 & 7;
  var o7 = p3 / 8 | 0;
  d3[o7] |= v2;
  d3[o7 + 1] |= v2 >> 8;
};
var wbits16 = function(d3, p3, v2) {
  v2 <<= p3 & 7;
  var o7 = p3 / 8 | 0;
  d3[o7] |= v2;
  d3[o7 + 1] |= v2 >> 8;
  d3[o7 + 2] |= v2 >> 16;
};
var hTree = function(d3, mb) {
  var t5 = [];
  for (var i7 = 0; i7 < d3.length; ++i7) {
    if (d3[i7])
      t5.push({ s: i7, f: d3[i7] });
  }
  var s4 = t5.length;
  var t22 = t5.slice();
  if (!s4)
    return { t: et, l: 0 };
  if (s4 == 1) {
    var v2 = new u8(t5[0].s + 1);
    v2[t5[0].s] = 1;
    return { t: v2, l: 1 };
  }
  t5.sort(function(a3, b5) {
    return a3.f - b5.f;
  });
  t5.push({ s: -1, f: 25001 });
  var l3 = t5[0], r6 = t5[1], i0 = 0, i1 = 1, i22 = 2;
  t5[0] = { s: -1, f: l3.f + r6.f, l: l3, r: r6 };
  while (i1 != s4 - 1) {
    l3 = t5[t5[i0].f < t5[i22].f ? i0++ : i22++];
    r6 = t5[i0 != i1 && t5[i0].f < t5[i22].f ? i0++ : i22++];
    t5[i1++] = { s: -1, f: l3.f + r6.f, l: l3, r: r6 };
  }
  var maxSym = t22[0].s;
  for (var i7 = 1; i7 < s4; ++i7) {
    if (t22[i7].s > maxSym)
      maxSym = t22[i7].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t5[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i7 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t22.sort(function(a3, b5) {
      return tr[b5.s] - tr[a3.s] || a3.f - b5.f;
    });
    for (; i7 < s4; ++i7) {
      var i2_1 = t22[i7].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t22[i7].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i7;
    }
    for (; i7 >= 0 && dt; --i7) {
      var i2_3 = t22[i7].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n5, l3, d3) {
  return n5.s == -1 ? Math.max(ln(n5.l, l3, d3 + 1), ln(n5.r, l3, d3 + 1)) : l3[n5.s] = d3;
};
var lc = function(c4) {
  var s4 = c4.length;
  while (s4 && !c4[--s4])
    ;
  var cl = new u16(++s4);
  var cli = 0, cln = c4[0], cls = 1;
  var w2 = function(v2) {
    cl[cli++] = v2;
  };
  for (var i7 = 1; i7 <= s4; ++i7) {
    if (c4[i7] == cln && i7 != s4)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w2(32754);
        if (cls > 2) {
          w2(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w2(cln), --cls;
        for (; cls > 6; cls -= 6)
          w2(8304);
        if (cls > 2)
          w2(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w2(cln);
      cls = 1;
      cln = c4[i7];
    }
  }
  return { c: cl.subarray(0, cli), n: s4 };
};
var clen = function(cf, cl) {
  var l3 = 0;
  for (var i7 = 0; i7 < cl.length; ++i7)
    l3 += cf[i7] * cl[i7];
  return l3;
};
var wfblk = function(out, pos, dat) {
  var s4 = dat.length;
  var o7 = shft(pos + 2);
  out[o7] = s4 & 255;
  out[o7 + 1] = s4 >> 8;
  out[o7 + 2] = out[o7] ^ 255;
  out[o7 + 3] = out[o7 + 1] ^ 255;
  for (var i7 = 0; i7 < s4; ++i7)
    out[o7 + i7 + 4] = dat[i7];
  return (o7 + 4 + s4) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p3) {
  wbits(out, p3++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i7 = 0; i7 < lclt.length; ++i7)
    ++lcfreq[lclt[i7] & 31];
  for (var i7 = 0; i7 < lcdt.length; ++i7)
    ++lcfreq[lcdt[i7] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p3, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p3, 1 + (dtlen < ftlen)), p3 += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p3, nlc - 257);
    wbits(out, p3 + 5, ndc - 1);
    wbits(out, p3 + 10, nlcc - 4);
    p3 += 14;
    for (var i7 = 0; i7 < nlcc; ++i7)
      wbits(out, p3 + 3 * i7, lct[clim[i7]]);
    p3 += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i7 = 0; i7 < clct.length; ++i7) {
        var len = clct[i7] & 31;
        wbits(out, p3, llm[len]), p3 += lct[len];
        if (len > 15)
          wbits(out, p3, clct[i7] >> 5 & 127), p3 += clct[i7] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i7 = 0; i7 < li; ++i7) {
    var sym = syms[i7];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p3, lm[len + 257]), p3 += ll[len + 257];
      if (len > 7)
        wbits(out, p3, sym >> 23 & 31), p3 += fleb[len];
      var dst = sym & 31;
      wbits16(out, p3, dm[dst]), p3 += dl[dst];
      if (dst > 3)
        wbits16(out, p3, sym >> 5 & 8191), p3 += fdeb[dst];
    } else {
      wbits16(out, p3, lm[sym]), p3 += ll[sym];
    }
  }
  wbits16(out, p3, lm[256]);
  return p3 + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s4 = st.z || dat.length;
  var o7 = new u8(pre + s4 + 5 * (1 + Math.ceil(s4 / 7e3)) + post);
  var w2 = o7.subarray(pre, o7.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w2[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n5 = opt >> 13, c4 = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i8) {
      return (dat[i8] ^ dat[i8 + 1] << bs1_1 ^ dat[i8 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i7 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i7 + 2 < s4; ++i7) {
      var hv = hsh(i7);
      var imod = i7 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i7) {
        var rem = s4 - i7;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w2, 0, syms, lf, df, eb, li, bs, i7 - bs, pos);
          li = lc_1 = eb = 0, bs = i7;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l3 = 2, d3 = 0, ch_1 = c4, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i7 - dif)) {
          var maxn = Math.min(n5, rem) - 1;
          var maxd = Math.min(32767, i7);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i7 + l3] == dat[i7 + l3 - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i7 + nl] == dat[i7 + nl - dif]; ++nl)
                ;
              if (nl > l3) {
                l3 = nl, d3 = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i7 - dif + j & 32767;
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
        if (d3) {
          syms[li++] = 268435456 | revfl[l3] << 18 | revfd[d3];
          var lin = revfl[l3] & 31, din = revfd[d3] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i7 + l3;
          ++lc_1;
        } else {
          syms[li++] = dat[i7];
          ++lf[dat[i7]];
        }
      }
    }
    for (i7 = Math.max(i7, wi); i7 < s4; ++i7) {
      syms[li++] = dat[i7];
      ++lf[dat[i7]];
    }
    pos = wblk(dat, w2, lst, syms, lf, df, eb, li, bs, i7 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w2[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i7, st.w = wi;
    }
  } else {
    for (var i7 = st.w || 0; i7 < s4 + lst; i7 += 65535) {
      var e8 = i7 + 65535;
      if (e8 >= s4) {
        w2[pos / 8 | 0] = lst;
        e8 = s4;
      }
      pos = wfblk(w2, pos + 1, dat.subarray(i7, e8));
    }
    st.i = s4;
  }
  return slc(o7, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t5 = new Int32Array(256);
  for (var i7 = 0; i7 < 256; ++i7) {
    var c4 = i7, k2 = 9;
    while (--k2)
      c4 = (c4 & 1 && -306674912) ^ c4 >>> 1;
    t5[i7] = c4;
  }
  return t5;
})();
var crc = function() {
  var c4 = -1;
  return {
    p: function(d3) {
      var cr = c4;
      for (var i7 = 0; i7 < d3.length; ++i7)
        cr = crct[cr & 255 ^ d3[i7]] ^ cr >>> 8;
      c4 = cr;
    },
    d: function() {
      return ~c4;
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
var mrg = function(a3, b5) {
  var o7 = {};
  for (var k2 in a3)
    o7[k2] = a3[k2];
  for (var k2 in b5)
    o7[k2] = b5[k2];
  return o7;
};
var b2 = function(d3, b5) {
  return d3[b5] | d3[b5 + 1] << 8;
};
var b4 = function(d3, b5) {
  return (d3[b5] | d3[b5 + 1] << 8 | d3[b5 + 2] << 16 | d3[b5 + 3] << 24) >>> 0;
};
var b8 = function(d3, b5) {
  return b4(d3, b5) + b4(d3, b5 + 4) * 4294967296;
};
var wbytes = function(d3, b5, v2) {
  for (; v2; ++b5)
    d3[b5] = v2, v2 >>>= 8;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d3, p3, t5, o7) {
  for (var k2 in d3) {
    var val = d3[k2], n5 = p3 + k2, op = o7;
    if (Array.isArray(val))
      op = mrg(o7, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t5[n5] = [val, op];
    else {
      t5[n5 += "/"] = [new u8(0), op];
      fltn(val, n5, t5, o7);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e8) {
}
var dutf8 = function(d3) {
  for (var r6 = "", i7 = 0; ; ) {
    var c4 = d3[i7++];
    var eb = (c4 > 127) + (c4 > 223) + (c4 > 239);
    if (i7 + eb > d3.length)
      return { s: r6, r: slc(d3, i7 - 1) };
    if (!eb)
      r6 += String.fromCharCode(c4);
    else if (eb == 3) {
      c4 = ((c4 & 15) << 18 | (d3[i7++] & 63) << 12 | (d3[i7++] & 63) << 6 | d3[i7++] & 63) - 65536, r6 += String.fromCharCode(55296 | c4 >> 10, 56320 | c4 & 1023);
    } else if (eb & 1)
      r6 += String.fromCharCode((c4 & 31) << 6 | d3[i7++] & 63);
    else
      r6 += String.fromCharCode((c4 & 15) << 12 | (d3[i7++] & 63) << 6 | d3[i7++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i7 = 0; i7 < str.length; ++i7)
      ar_1[i7] = str.charCodeAt(i7);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l3 = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w2 = function(v2) {
    ar[ai++] = v2;
  };
  for (var i7 = 0; i7 < l3; ++i7) {
    if (ai + 5 > ar.length) {
      var n5 = new u8(ai + 8 + (l3 - i7 << 1));
      n5.set(ar);
      ar = n5;
    }
    var c4 = str.charCodeAt(i7);
    if (c4 < 128 || latin1)
      w2(c4);
    else if (c4 < 2048)
      w2(192 | c4 >> 6), w2(128 | c4 & 63);
    else if (c4 > 55295 && c4 < 57344)
      c4 = 65536 + (c4 & 1023 << 10) | str.charCodeAt(++i7) & 1023, w2(240 | c4 >> 18), w2(128 | c4 >> 12 & 63), w2(128 | c4 >> 6 & 63), w2(128 | c4 & 63);
    else
      w2(224 | c4 >> 12), w2(128 | c4 >> 6 & 63), w2(128 | c4 & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r6 = "";
    for (var i7 = 0; i7 < dat.length; i7 += 16384)
      r6 += String.fromCharCode.apply(null, dat.subarray(i7, i7 + 16384));
    return r6;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s4 = _a2.s, r6 = _a2.r;
    if (r6.length)
      err(8);
    return s4;
  }
}
var slzh = function(d3, b5) {
  return b5 + 30 + b2(d3, b5 + 26) + b2(d3, b5 + 28);
};
var zh = function(d3, b5, z2) {
  var fnl = b2(d3, b5 + 28), efl = b2(d3, b5 + 30), fn = strFromU8(d3.subarray(b5 + 46, b5 + 46 + fnl), !(b2(d3, b5 + 8) & 2048)), es = b5 + 46 + fnl;
  var _a2 = z64hs(d3, es, efl, z2, b4(d3, b5 + 20), b4(d3, b5 + 24), b4(d3, b5 + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d3, b5 + 10), sc, su, fn, es + efl + b2(d3, b5 + 32), off];
};
var z64hs = function(d3, b5, l3, z2, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e8 = b5 + l3;
  var nf = nsc + nsu + noff;
  if (z2 && nf) {
    for (; b5 + 4 < e8; b5 += 4 + b2(d3, b5 + 2)) {
      if (b2(d3, b5) == 1) {
        return [
          nsc ? b8(d3, b5 + 4 + 8 * nsu) : sc,
          nsu ? b8(d3, b5 + 4) : su,
          noff ? b8(d3, b5 + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z2 < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k2 in ex) {
      var l3 = ex[k2].length;
      if (l3 > 65535)
        err(9);
      le += l3 + 4;
    }
  }
  return le;
};
var wzh = function(d3, b5, f3, fn, u3, c4, ce, co) {
  var fl2 = fn.length, ex = f3.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d3, b5, ce != null ? 33639248 : 67324752), b5 += 4;
  if (ce != null)
    d3[b5++] = 20, d3[b5++] = f3.os;
  d3[b5] = 20, b5 += 2;
  d3[b5++] = f3.flag << 1 | (c4 < 0 && 8), d3[b5++] = u3 && 8;
  d3[b5++] = f3.compression & 255, d3[b5++] = f3.compression >> 8;
  var dt = new Date(f3.mtime == null ? Date.now() : f3.mtime), y3 = dt.getFullYear() - 1980;
  if (y3 < 0 || y3 > 119)
    err(10);
  wbytes(d3, b5, y3 << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b5 += 4;
  if (c4 != -1) {
    wbytes(d3, b5, f3.crc);
    wbytes(d3, b5 + 4, c4 < 0 ? -c4 - 2 : c4);
    wbytes(d3, b5 + 8, f3.size);
  }
  wbytes(d3, b5 + 12, fl2);
  wbytes(d3, b5 + 14, exl), b5 += 16;
  if (ce != null) {
    wbytes(d3, b5, col);
    wbytes(d3, b5 + 6, f3.attrs);
    wbytes(d3, b5 + 10, ce), b5 += 14;
  }
  d3.set(fn, b5);
  b5 += fl2;
  if (exl) {
    for (var k2 in ex) {
      var exf = ex[k2], l3 = exf.length;
      wbytes(d3, b5, +k2);
      wbytes(d3, b5 + 2, l3);
      d3.set(exf, b5 + 4), b5 += 4 + l3;
    }
  }
  if (col)
    d3.set(co, b5), b5 += col;
  return b5;
};
var wzf = function(o7, b5, c4, d3, e8) {
  wbytes(o7, b5, 101010256);
  wbytes(o7, b5 + 8, c4);
  wbytes(o7, b5 + 10, c4);
  wbytes(o7, b5 + 12, d3);
  wbytes(o7, b5 + 16, e8);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r6 = {};
  var files = [];
  fltn(data, "", r6, opts);
  var o7 = 0;
  var tot = 0;
  for (var fn in r6) {
    var _a2 = r6[fn], file = _a2[0], p3 = _a2[1];
    var compression = p3.level == 0 ? 0 : 8;
    var f3 = strToU8(fn), s4 = f3.length;
    var com = p3.comment, m2 = com && strToU8(com), ms = m2 && m2.length;
    var exl = exfl(p3.extra);
    if (s4 > 65535)
      err(11);
    var d3 = compression ? deflateSync(file, p3) : file, l3 = d3.length;
    var c4 = crc();
    c4.p(file);
    files.push(mrg(p3, {
      size: file.length,
      crc: c4.d(),
      c: d3,
      f: f3,
      m: m2,
      u: s4 != fn.length || m2 && com.length != ms,
      o: o7,
      compression
    }));
    o7 += 30 + s4 + exl + l3;
    tot += 76 + 2 * (s4 + exl) + (ms || 0) + l3;
  }
  var out = new u8(tot + 22), oe = o7, cdl = tot - o7;
  for (var i7 = 0; i7 < files.length; ++i7) {
    var f3 = files[i7];
    wzh(out, f3.o, f3, f3.f, f3.u, f3.c.length);
    var badd = 30 + f3.f.length + exfl(f3.extra);
    out.set(f3.c, f3.o + badd);
    wzh(out, o7, f3, f3.f, f3.u, f3.c.length, f3.o, f3.m), o7 += 16 + badd + (f3.m ? f3.m.length : 0);
  }
  wzf(out, o7, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e8 = data.length - 22;
  for (; b4(data, e8) != 101010256; --e8) {
    if (!e8 || data.length - e8 > 65558)
      err(13);
  }
  ;
  var c4 = b2(data, e8 + 8);
  if (!c4)
    return {};
  var o7 = b4(data, e8 + 16);
  var z2 = b4(data, e8 - 20) == 117853008;
  if (z2) {
    var ze = b4(data, e8 - 12);
    z2 = b4(data, ze) == 101075792;
    if (z2) {
      c4 = b4(data, ze + 32);
      o7 = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i7 = 0; i7 < c4; ++i7) {
    var _a2 = zh(data, o7, z2), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b5 = slzh(data, off);
    o7 = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b5, b5 + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b5, b5 + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// ../sheet-core/src/package.ts
var XlsxPackage = class _XlsxPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  /** Pacote OPC mínimo para workbooks novos. */
  static empty() {
    const enc = new TextEncoder();
    const parts = /* @__PURE__ */ new Map();
    parts.set("[Content_Types].xml", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
    ));
    parts.set("_rels/.rels", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    ));
    parts.set("xl/workbook.xml", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
    ));
    parts.set("xl/_rels/workbook.xml.rels", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    ));
    parts.set("xl/worksheets/sheet1.xml", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'
    ));
    parts.set("xl/styles.xml", enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'
    ));
    return new _XlsxPackage(parts);
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo n\xE3o \xE9 um pacote OOXML v\xE1lido (ZIP corrompido ou formato legado .xls/.xlsb)");
    }
    const pkg = new _XlsxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart("xl/workbook.xml")) {
      throw new Error("Pacote sem xl/workbook.xml \u2014 n\xE3o \xE9 uma pasta de trabalho do Excel");
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
  /** Conteúdo principal (xl/workbook.xml). */
  workbookXml() {
    const xml = this.getPartText("xl/workbook.xml");
    if (xml === void 0) throw new Error("Pacote sem xl/workbook.xml");
    return xml;
  }
  /**
   * Resolve o caminho de uma parte alvo a partir de um relacionamento.
   * Relativos ao diretório do .rels (ex.: workbook.xml.rels está em xl/_rels/,
   * target "worksheets/sheet1.xml" → "xl/worksheets/sheet1.xml").
   */
  resolveRelTarget(fromPart, target) {
    const dir = fromPart.includes("/") ? fromPart.slice(0, fromPart.lastIndexOf("/")) : "";
    if (target.startsWith("/")) return target.slice(1);
    return dir ? `${dir}/${target}` : target;
  }
};

// ../sheet-core/src/xml.ts
var ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};
function decodeEntities(s4) {
  return s4.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_2, e8) => {
    if (e8.startsWith("#x") || e8.startsWith("#X")) return String.fromCodePoint(parseInt(e8.slice(2), 16));
    if (e8.startsWith("#")) return String.fromCodePoint(parseInt(e8.slice(1), 10));
    return ENTITIES[e8] ?? `&${e8};`;
  });
}
function parseXml(xml) {
  let i7 = 0;
  const n5 = xml.length;
  function error(msg) {
    throw new Error(`XML inv\xE1lido @${i7}: ${msg}`);
  }
  function skipMisc() {
    for (; ; ) {
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      if (xml.startsWith("<?", i7)) {
        i7 = xml.indexOf("?>", i7);
        if (i7 < 0) error("?> n\xE3o fechado");
        i7 += 2;
      } else if (xml.startsWith("<!--", i7)) {
        i7 = xml.indexOf("-->", i7);
        if (i7 < 0) error("--> n\xE3o fechado");
        i7 += 3;
      } else if (xml.startsWith("<!", i7)) {
        i7 = xml.indexOf(">", i7);
        if (i7 < 0) error("<! n\xE3o fechado");
        i7 += 1;
      } else break;
    }
  }
  function parseElement() {
    if (xml[i7] !== "<") error("esperava <");
    i7++;
    const nameStart = i7;
    while (i7 < n5 && !/[\s/>]/.test(xml[i7])) i7++;
    const name = xml.slice(nameStart, i7);
    const attrs = {};
    for (; ; ) {
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      if (xml[i7] === "/") {
        if (xml[i7 + 1] !== ">") error("esperava />");
        i7 += 2;
        return { name, attrs, children: [] };
      }
      if (xml[i7] === ">") {
        i7++;
        break;
      }
      const aStart = i7;
      while (i7 < n5 && xml[i7] !== "=" && !/\s/.test(xml[i7])) i7++;
      const aName = xml.slice(aStart, i7);
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      if (xml[i7] !== "=") error(`atributo ${aName} sem =`);
      i7++;
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      const q = xml[i7];
      if (q !== '"' && q !== "'") error("valor de atributo sem aspas");
      i7++;
      const vStart = i7;
      i7 = xml.indexOf(q, i7);
      if (i7 < 0) error("aspas n\xE3o fechadas");
      attrs[aName] = decodeEntities(xml.slice(vStart, i7));
      i7++;
    }
    const children = [];
    for (; ; ) {
      if (i7 >= n5) error(`</${name}> ausente`);
      if (xml.startsWith("</", i7)) {
        const close = xml.indexOf(">", i7);
        i7 = close + 1;
        return { name, attrs, children };
      }
      if (xml.startsWith("<!--", i7)) {
        i7 = xml.indexOf("-->", i7) + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", i7)) {
        const end = xml.indexOf("]]>", i7);
        children.push(xml.slice(i7 + 9, end));
        i7 = end + 3;
        continue;
      }
      if (xml[i7] === "<") {
        children.push(parseElement());
        continue;
      }
      const tStart = i7;
      while (i7 < n5 && xml[i7] !== "<") i7++;
      const text = decodeEntities(xml.slice(tStart, i7));
      if (text.length > 0) children.push(text);
    }
  }
  skipMisc();
  const root = parseElement();
  return root;
}
function childElements(el, name) {
  return el.children.filter(
    (c4) => typeof c4 !== "string" && (name === void 0 || c4.name === name)
  );
}
function firstChild(el, name) {
  return childElements(el, name)[0];
}
function textContent(el) {
  let out = "";
  for (const c4 of el.children) {
    out += typeof c4 === "string" ? c4 : textContent(c4);
  }
  return out;
}

// ../sheet-core/src/read.ts
function readRels(pkg, relsPart) {
  const map = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(relsPart);
  if (xml === void 0) return map;
  const root = parseXml(xml);
  for (const rel of childElements(root, "Relationship")) {
    const id = rel.attrs["Id"];
    const target = rel.attrs["Target"];
    if (id !== void 0 && target !== void 0) map.set(id, target);
  }
  return map;
}
function readWorkbook(pkg) {
  const root = parseXml(pkg.workbookXml());
  const sheetsEl = firstChild(root, "sheets");
  const sheets = [];
  const rels = readRels(pkg, "xl/_rels/workbook.xml.rels");
  if (sheetsEl) {
    for (const s4 of childElements(sheetsEl, "sheet")) {
      const rId = s4.attrs["r:id"];
      const target = rId !== void 0 ? rels.get(rId) : void 0;
      sheets.push({
        name: s4.attrs["name"] ?? "",
        sheetId: s4.attrs["sheetId"] ?? "",
        rId: rId ?? "",
        state: s4.attrs["state"],
        target: target !== void 0 ? pkg.resolveRelTarget("xl/workbook.xml", target) : void 0
      });
    }
  }
  const wb = { sheets };
  const activeTab = root.attrs["activeTab"] !== void 0 ? parseInt(root.attrs["activeTab"], 10) : void 0;
  if (activeTab !== void 0) wb.activeTab = activeTab;
  return wb;
}
function readSharedStrings(pkg) {
  const xml = pkg.getPartText("xl/sharedStrings.xml");
  if (xml === void 0) return [];
  const root = parseXml(xml);
  const out = [];
  for (const si of childElements(root, "si")) {
    out.push(readSharedStringEntry(si));
  }
  return out;
}
function readSharedStringEntry(el) {
  const runsEls = childElements(el, "r");
  if (runsEls.length > 0) {
    const runs = runsEls.map((r6) => {
      const t6 = firstChild(r6, "t");
      const rPr = firstChild(r6, "rPr");
      const rPrAttrs = {};
      if (rPr) for (const a3 of Object.keys(rPr.attrs)) rPrAttrs[a3] = rPr.attrs[a3];
      return { text: t6 ? textContent(t6) : "", rPr: Object.keys(rPrAttrs).length ? rPrAttrs : void 0 };
    });
    return { text: runs.map((r6) => r6.text).join(""), runs };
  }
  const t5 = firstChild(el, "t");
  return { text: t5 ? textContent(t5) : "" };
}
function readWorksheet(pkg, sheetPath) {
  const xml = pkg.getPartText(sheetPath);
  if (xml === void 0) throw new Error(`Pacote sem ${sheetPath}`);
  const root = parseXml(xml);
  const rows = [];
  const sheetData = firstChild(root, "sheetData");
  if (sheetData) {
    for (const rowEl of childElements(sheetData, "row")) {
      rows.push(readRow(rowEl));
    }
  }
  const merges = [];
  const mergeCells = firstChild(root, "mergeCells");
  if (mergeCells) {
    for (const mc of childElements(mergeCells, "mergeCell")) {
      const ref = mc.attrs["ref"];
      if (ref !== void 0) merges.push(ref);
    }
  }
  const cols = [];
  const colsEl = firstChild(root, "cols");
  if (colsEl) {
    for (const c4 of childElements(colsEl, "col")) {
      const def = { min: parseInt(c4.attrs["min"] ?? "1", 10), max: parseInt(c4.attrs["max"] ?? "1", 10) };
      if (c4.attrs["width"] !== void 0) def.width = parseFloat(c4.attrs["width"]);
      if (c4.attrs["customWidth"] === "1") def.customWidth = true;
      if (c4.attrs["hidden"] === "1") def.hidden = true;
      if (c4.attrs["style"] !== void 0) def.style = parseInt(c4.attrs["style"], 10);
      cols.push(def);
    }
  }
  let pane;
  const sheetView = firstChild(firstChild(root, "sheetViews") ?? root, "sheetView");
  const paneEl = sheetView ? firstChild(sheetView, "pane") : void 0;
  if (paneEl) {
    pane = {
      xSplit: parseInt(paneEl.attrs["xSplit"] ?? "0", 10),
      ySplit: parseInt(paneEl.attrs["ySplit"] ?? "0", 10),
      topLeftCell: paneEl.attrs["topLeftCell"],
      state: paneEl.attrs["state"] ?? "split"
    };
  }
  const condFormats = [];
  for (const cfEl of childElements(root, "conditionalFormatting")) {
    const sqref = cfEl.attrs["sqref"] ?? "";
    const rules = [];
    for (const ruleEl of childElements(cfEl, "cfRule")) {
      const type = ruleEl.attrs["type"];
      const priority = parseInt(ruleEl.attrs["priority"] ?? "0", 10);
      if (type === "colorScale") {
        const cs = firstChild(ruleEl, "colorScale");
        const stops = [];
        if (cs) for (const cfvo of childElements(cs, "cfvo")) {
          stops.push({ type: cfvo.attrs["type"] ?? "min", value: cfvo.attrs["val"] !== void 0 ? parseFloat(cfvo.attrs["val"]) : void 0, color: "#808080" });
        }
        let i7 = 0;
        for (const colEl of cs ? childElements(cs, "color") : []) {
          const c4 = colorFromColorEl(colEl);
          if (stops[i7]) stops[i7].color = c4;
          i7++;
        }
        rules.push({ type, priority, stops });
      } else if (type === "dataBar") {
        const db = firstChild(ruleEl, "dataBar");
        const colorEl = db ? firstChild(db, "color") : void 0;
        rules.push({ type, priority, barColor: colorEl ? colorFromColorEl(colorEl) : "#638EC6" });
      } else if (type === "cellIs" || type === "expression") {
        const dxfId = ruleEl.attrs["dxfId"] !== void 0 ? parseInt(ruleEl.attrs["dxfId"], 10) : void 0;
        const formula = childElements(ruleEl, "formula").map((f3) => textContent(f3));
        rules.push({ type, priority, operator: ruleEl.attrs["operator"], formula, dxfId });
      }
    }
    if (rules.length) condFormats.push({ sqref, rules });
  }
  const ws = { rows };
  if (merges.length > 0) {
    ws.merges = merges;
    ws.mergedAreas = new Map(merges.map((m2) => {
      const [tl] = m2.split(":");
      return [tl ?? m2, m2];
    }));
  }
  if (cols.length > 0) ws.cols = cols;
  if (pane) ws.pane = pane;
  if (condFormats.length > 0) ws.condFormats = condFormats;
  return ws;
}
function colorFromColorEl(c4) {
  const rgb = c4.attrs["rgb"];
  if (rgb !== void 0) return "#" + rgb.slice(-6);
  const theme = c4.attrs["theme"];
  if (theme !== void 0) return THEME_COLORS[parseInt(theme, 10)] ?? "#000000";
  const indexed = c4.attrs["indexed"];
  if (indexed !== void 0) return INDEXED_COLORS[parseInt(indexed, 10)] ?? "#000000";
  return "#000000";
}
var THEME_COLORS = [
  "#FFFFFF",
  // 0 lt1 (background1)
  "#000000",
  // 1 dk1 (text1) — cor padrão da fonte
  "#E7E6E6",
  // 2 lt2
  "#44546A",
  // 3 dk2
  "#4472C4",
  "#ED7D31",
  "#A5A5A5",
  "#FFC000",
  "#5B9BD5",
  "#70AD47",
  // 4-9 accent1-6
  "#0563C1",
  // 10 hyperlink
  "#954F72"
  // 11 followedHyperlink
];
var INDEXED_COLORS = [];
(() => {
  INDEXED_COLORS[64] = "#000000";
  INDEXED_COLORS[65] = "#FFFFFF";
  INDEXED_COLORS[81] = "#FFFFFF";
  const base8 = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];
  base8.forEach((c4, i7) => {
    INDEXED_COLORS[i7] = c4;
  });
})();
function readRow(el) {
  const row = {
    r: parseInt(el.attrs["r"] ?? "0", 10),
    cells: []
  };
  if (el.attrs["spans"] !== void 0) row.spans = el.attrs["spans"];
  if (el.attrs["ht"] !== void 0) row.height = parseFloat(el.attrs["ht"]);
  if (el.attrs["customHeight"] === "1" || el.attrs["customHeight"] === "true") row.customHeight = true;
  if (el.attrs["hidden"] === "1" || el.attrs["hidden"] === "true") row.hidden = true;
  if (el.attrs["s"] !== void 0) row.style = parseInt(el.attrs["s"], 10);
  for (const cEl of childElements(el, "c")) row.cells.push(readCell(cEl));
  return row;
}
function readCell(el) {
  const cell = { ref: el.attrs["r"] ?? "" };
  if (el.attrs["t"] !== void 0) cell.type = el.attrs["t"];
  if (el.attrs["s"] !== void 0) cell.style = parseInt(el.attrs["s"], 10);
  const v2 = firstChild(el, "v");
  if (v2 !== void 0) cell.value = textContent(v2);
  const f3 = firstChild(el, "f");
  if (f3 !== void 0) cell.formula = textContent(f3);
  const isEl = firstChild(el, "is");
  if (isEl !== void 0) cell.inlineString = readSharedStringEntry(isEl);
  return cell;
}

// ../sheet-core/src/styles.ts
function readStyles(pkg) {
  const xml = pkg.getPartText("xl/styles.xml");
  if (xml === void 0) return { numFmts: /* @__PURE__ */ new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] };
  const root = parseXml(xml);
  const fonts = [];
  const fontsEl = firstChild(root, "fonts");
  if (fontsEl) {
    for (const f3 of childElements(fontsEl, "font")) {
      const font = {};
      if (firstChild(f3, "b")) font.bold = true;
      if (firstChild(f3, "i")) font.italic = true;
      if (firstChild(f3, "u")) font.underline = true;
      if (firstChild(f3, "strike")) font.strike = true;
      const sz = firstChild(f3, "sz");
      if (sz?.attrs["val"] !== void 0) font.size = parseFloat(sz.attrs["val"]);
      font.color = readColor(f3);
      const name = firstChild(f3, "name");
      if (name?.attrs["val"] !== void 0) font.name = name.attrs["val"];
      fonts.push(font);
    }
  }
  const fills = [];
  const fillsEl = firstChild(root, "fills");
  if (fillsEl) {
    for (const fl2 of childElements(fillsEl, "fill")) {
      const fill = {};
      const pf = firstChild(fl2, "patternFill");
      if (pf) {
        fill.pattern = pf.attrs["patternType"];
        if (pf.attrs["patternType"] === "solid") {
          const fg = firstChild(pf, "fgColor");
          fill.fgColor = fg ? colorFromEl(fg) : void 0;
        }
      }
      fills.push(fill);
    }
  }
  const borders = [];
  const bordersEl = firstChild(root, "borders");
  if (bordersEl) {
    for (const bd of childElements(bordersEl, "border")) {
      const border = {};
      for (const side of ["left", "right", "top", "bottom", "diagonal"]) {
        const e8 = firstChild(bd, side);
        if (e8 && e8.attrs["style"] && e8.attrs["style"] !== "none") {
          const colEl = firstChild(e8, "color");
          border[side] = {
            style: e8.attrs["style"],
            color: colEl ? colorFromEl(colEl) : "#000000"
          };
        }
      }
      borders.push(border);
    }
  }
  const dxfs = [];
  const dxfsEl = firstChild(root, "dxfs");
  if (dxfsEl) {
    for (const d3 of childElements(dxfsEl, "dxf")) {
      const dxf = {};
      const fill = firstChild(d3, "fill");
      const pf = fill ? firstChild(fill, "patternFill") : void 0;
      const bg = pf ? firstChild(pf, "bgColor") : void 0;
      if (bg && bg.attrs["rgb"]) dxf.fillColor = "#" + bg.attrs["rgb"].slice(-6);
      const font = firstChild(d3, "font");
      if (font) {
        if (firstChild(font, "b")) dxf.bold = true;
        if (firstChild(font, "i")) dxf.italic = true;
        const colEl = firstChild(font, "color");
        if (colEl && colEl.attrs["rgb"]) dxf.fontColor = "#" + colEl.attrs["rgb"].slice(-6);
      }
      dxfs.push(dxf);
    }
  }
  const numFmts = /* @__PURE__ */ new Map();
  const numFmtsEl = firstChild(root, "numFmts");
  if (numFmtsEl) {
    for (const nf of childElements(numFmtsEl, "numFmt")) {
      const id = nf.attrs["numFmtId"];
      const code = nf.attrs["formatCode"];
      if (id !== void 0 && code !== void 0) numFmts.set(parseInt(id, 10), code);
    }
  }
  const cellXfs = [];
  const cellXfsEl = firstChild(root, "cellXfs");
  if (cellXfsEl) {
    for (const xf of childElements(cellXfsEl, "xf")) {
      const a3 = xf.attrs;
      const rec = {
        numFmtId: parseInt(a3["numFmtId"] ?? "0", 10),
        fontId: parseInt(a3["fontId"] ?? "0", 10),
        fillId: parseInt(a3["fillId"] ?? "0", 10),
        borderId: parseInt(a3["borderId"] ?? "0", 10),
        xfId: parseInt(a3["xfId"] ?? "0", 10)
      };
      if (a3["applyNumberFormat"] === "1") rec.applyNumberFormat = true;
      if (a3["applyFont"] === "1") rec.applyFont = true;
      if (a3["applyFill"] === "1") rec.applyFill = true;
      if (a3["applyBorder"] === "1") rec.applyBorder = true;
      if (a3["applyAlignment"] === "1") rec.applyAlignment = true;
      const al = firstChild(xf, "alignment");
      if (al) {
        if (al.attrs["horizontal"] !== void 0) rec.horizontal = al.attrs["horizontal"];
        if (al.attrs["vertical"] !== void 0) rec.vertical = al.attrs["vertical"];
        if (al.attrs["wrapText"] === "1") rec.wrapText = true;
        if (al.attrs["indent"] !== void 0) rec.indent = parseInt(al.attrs["indent"], 10);
      }
      cellXfs.push(rec);
    }
  }
  return { numFmts, cellXfs, fonts, fills, borders, dxfs };
}
function readColor(el) {
  const c4 = firstChild(el, "color");
  return c4 ? colorFromEl(c4) : void 0;
}
var THEME_COLORS2 = [
  "#FFFFFF",
  "#000000",
  "#E7E6E6",
  "#44546A",
  "#4472C4",
  "#ED7D31",
  "#A5A5A5",
  "#FFC000",
  "#5B9BD5",
  "#70AD47",
  "#0563C1",
  "#954F72"
];
var INDEXED_COLORS2 = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];
INDEXED_COLORS2[64] = "#000000";
INDEXED_COLORS2[65] = "#FFFFFF";
INDEXED_COLORS2[81] = "#FFFFFF";
function colorFromEl(c4) {
  const rgb = c4.attrs["rgb"];
  if (rgb !== void 0) return "#" + rgb.slice(-6);
  const theme = c4.attrs["theme"];
  if (theme !== void 0) return THEME_COLORS2[parseInt(theme, 10)] ?? "#000000";
  const indexed = c4.attrs["indexed"];
  if (indexed !== void 0) return INDEXED_COLORS2[parseInt(indexed, 10)] ?? "#000000";
  return void 0;
}

// ../sheet-core/src/model.ts
var COL_RE = /([A-Z]+)(\d+)/;
function refToRowCol(ref) {
  const m2 = COL_RE.exec(ref);
  if (!m2) throw new Error(`Refer\xEAncia de c\xE9lula inv\xE1lida: ${ref}`);
  const col = m2[1].split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
  return { col, row: parseInt(m2[2], 10) };
}
function rowColToRef(col, row) {
  let c4 = col;
  let letters = "";
  while (c4 > 0) {
    const rem = (c4 - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    c4 = Math.floor((c4 - 1) / 26);
  }
  return `${letters}${row}`;
}

// src/universal-sheet.ts
var HEADER_W = 46;
var HEADER_H = 22;
var DEFAULT_COL_W = 64;
var DEFAULT_ROW_H = 20;
var MAX_ROW_DEFAULT = 200;
var MAX_COL_DEFAULT = 52;
var COL_HEADER_BG = "#f6f6f6";
var ROW_HEADER_BG = "#f6f6f6";
var CORNER_BG = "#ececec";
var GRID_LINE = "#e2e2e2";
var HEADER_LINE = "#d3d3d3";
var TEXT = "#1f1f1f";
var SELECTION_BORDER = "#1f6feb";
var SELECTION_FILL = "rgba(31,111,235,0.10)";
var HEADER_SEL = "#d8e6fb";
var UniversalSheetElement = class extends HTMLElement {
  host = this.attachShadow({ mode: "open" });
  canvas = document.createElement("canvas");
  status = document.createElement("div");
  workbook = null;
  pkg = null;
  shared = [];
  styles = { numFmts: /* @__PURE__ */ new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] };
  views = [];
  sheetIndex = 0;
  zoom = 1;
  scrollX = 0;
  scrollY = 0;
  sel = { col: 1, row: 1 };
  /** Posição x acumulada por borda de coluna (0..maxCol+1), coords locais. */
  xs = new Float64Array(0);
  ys = new Float64Array(0);
  /** Cache de valores numéricos por "col,row" para formatação condicional. */
  condNumMap = /* @__PURE__ */ new Map();
  /** Modo captura: suprime seleção/overlays para pixel-compare com o Excel. */
  capture = false;
  constructor() {
    super();
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.cursor = "cell";
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = "none";
    this.status.style.cssText = "position:absolute;left:0;top:0;background:#fff;border-bottom:1px solid #d3d3d3;border-right:1px solid #d3d3d3;height:" + HEADER_H + "px;width:" + HEADER_W + "px;display:flex;align-items:center;justify-content:center;font:600 11px/1 Segoe UI,Arial;color:#1f1f1f;z-index:2;pointer-events:none;";
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;width:100%;height:100%;overflow:hidden;";
    wrap.appendChild(this.status);
    wrap.appendChild(this.canvas);
    this.host.appendChild(wrap);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("keydown", this.onKeyDown);
    this.canvas.addEventListener("dblclick", this.onDblClick);
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
  }
  get view() {
    return this.views[this.sheetIndex] ?? null;
  }
  /** Carrega bytes .xlsx e monta as views de planilha. */
  loadXlsx(bytes) {
    const pkg = XlsxPackage.load(bytes);
    this.pkg = pkg;
    this.workbook = readWorkbook(pkg);
    this.shared = readSharedStrings(pkg);
    this.styles = readStyles(pkg);
    this.views = [];
    for (const ref of this.workbook.sheets) {
      if (!ref.target) continue;
      const ws = readWorksheet(pkg, ref.target);
      const colWidths = /* @__PURE__ */ new Map();
      const rowHeights = /* @__PURE__ */ new Map();
      const hiddenCols = /* @__PURE__ */ new Set();
      const hiddenRows = /* @__PURE__ */ new Set();
      let maxRow = 0;
      let maxCol = 0;
      for (const cd of ws.cols ?? []) {
        for (let c4 = cd.min; c4 <= cd.max; c4++) {
          if (cd.hidden) hiddenCols.add(c4);
          if (cd.width !== void 0 && cd.customWidth) colWidths.set(c4, colWidthPx(cd.width));
        }
      }
      for (const row of ws.rows) {
        if (row.hidden) hiddenRows.add(row.r);
        if (row.height !== void 0) rowHeights.set(row.r, Math.round(row.height * 96 / 72));
        if (row.r > maxRow) maxRow = row.r;
        for (const c4 of row.cells) {
          const { col } = refToRowCol(c4.ref);
          if (col > maxCol) maxCol = col;
        }
      }
      const merges = ws.mergedAreas ?? /* @__PURE__ */ new Map();
      this.views.push({
        worksheet: ws,
        colWidths,
        rowHeights,
        hiddenCols,
        hiddenRows,
        merges,
        pane: ws.pane,
        condFormats: ws.condFormats ?? [],
        maxRow: Math.max(maxRow, 30),
        maxCol: Math.max(maxCol, 26)
      });
    }
    this.sheetIndex = Math.min(0, this.views.length - 1);
    this.scrollX = 0;
    this.scrollY = 0;
    this.sel = { col: 1, row: 1 };
    this.recalcGrid();
    this.emitSelection();
    this.paint();
  }
  /** Reemite o pacote como bytes .xlsx (round-trip lossless). */
  saveXlsx() {
    if (!this.pkg) throw new Error("Nenhuma pasta de trabalho carregada");
    return this.pkg.save();
  }
  /** Retângulo (CSS px, zoom 1) da área de dados do range usado — para captura. */
  getUsedRangeRect() {
    const v2 = this.view;
    if (!v2) return null;
    let lr = 0, lc2 = 0;
    for (const r6 of v2.worksheet.rows) {
      if (r6.r > lr) lr = r6.r;
      for (const c4 of r6.cells) {
        const col = refToRowCol(c4.ref).col;
        if (col > lc2) lc2 = col;
      }
    }
    if (lr === 0) return null;
    return { x: HEADER_W, y: HEADER_H, w: this.xs[lc2] ?? 0, h: this.ys[lr] ?? 0 };
  }
  /** DEBUG: texto exibido por célula da aba atual (para auditoria de paridade). */
  debugCellDisplays() {
    const v2 = this.view;
    if (!v2) return [];
    const out = [];
    for (const r6 of v2.worksheet.rows) for (const c4 of r6.cells) out.push({ ref: c4.ref, display: this.displayText(c4) });
    return out;
  }
  /** Nomes das planilhas (abas). */
  getSheetNames() {
    return this.workbook?.sheets.map((s4) => s4.name) ?? [];
  }
  /** Seleciona a aba pelo índice. */
  selectSheet(i7) {
    if (i7 < 0 || i7 >= this.views.length || i7 === this.sheetIndex) return;
    this.sheetIndex = i7;
    this.scrollX = 0;
    this.scrollY = 0;
    this.sel = { col: 1, row: 1 };
    this.recalcGrid();
    this.emitSelection();
    this.paint();
  }
  /** Define o zoom (0.4–3) e re_renderiza. */
  setZoom(z2) {
    this.zoom = Math.min(3, Math.max(0.4, z2));
    this.recalcGrid();
    this.paint();
    this.dispatchEvent(new CustomEvent("us-zoom", { detail: { zoom: this.zoom } }));
  }
  /** Move a seleção para uma referência A1 (usada pela barra de fórmulas). */
  goToRef(ref) {
    const rc = refToRowCol(ref);
    this.sel = { col: rc.col, row: rc.row };
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  }
  /** Evento disparado quando a seleção muda: { ref, display, formula }. */
  onSelectionChange = null;
  emitSelection() {
    const ref = rowColToRef(this.sel.col, this.sel.row);
    const cell = this.findCell(this.sel.col, this.sel.row);
    this.onSelectionChange?.(ref, this.displayText(cell), cell?.formula ?? "");
    this.dispatchEvent(new CustomEvent("us-selection", {
      detail: { ref, display: this.displayText(cell), formula: cell?.formula ?? "" }
    }));
  }
  findCell(col, row) {
    const v2 = this.view;
    if (!v2) return void 0;
    const r6 = v2.worksheet.rows.find((rr) => rr.r === row);
    return r6?.cells.find((c4) => refToRowCol(c4.ref).col === col);
  }
  // ---- Layout helpers ----
  colWidth(col) {
    if (this.view?.hiddenCols.has(col)) return 0;
    return (this.view?.colWidths.get(col) ?? DEFAULT_COL_W) * this.zoom;
  }
  rowHeight(row) {
    if (this.view?.hiddenRows.has(row)) return 0;
    return (this.view?.rowHeights.get(row) ?? DEFAULT_ROW_H) * this.zoom;
  }
  recalcGrid() {
    const v2 = this.view;
    const maxCol = v2?.maxCol ?? MAX_COL_DEFAULT;
    const maxRow = v2?.maxRow ?? MAX_ROW_DEFAULT;
    this.xs = new Float64Array(maxCol + 2);
    let acc = 0;
    for (let i7 = 0; i7 <= maxCol; i7++) {
      this.xs[i7] = acc;
      acc += this.colWidth(i7 + 1);
    }
    this.xs[maxCol + 1] = acc;
    this.ys = new Float64Array(maxRow + 2);
    acc = 0;
    for (let j = 0; j <= maxRow; j++) {
      this.ys[j] = acc;
      acc += this.rowHeight(j + 1);
    }
    this.ys[maxRow + 1] = acc;
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w2 = this.canvas.clientWidth || 800;
    const h3 = this.canvas.clientHeight || 600;
    this.canvas.width = Math.round(w2 * dpr);
    this.canvas.height = Math.round(h3 * dpr);
  }
  maxScrollX() {
    const total = this.xs[this.xs.length - 1] ?? 0;
    return Math.max(0, total - (this.canvas.clientWidth - HEADER_W));
  }
  maxScrollY() {
    const total = this.ys[this.ys.length - 1] ?? 0;
    return Math.max(0, total - (this.canvas.clientHeight - HEADER_H));
  }
  /** Busca binária: maior índice i tal que arr[i] <= x. */
  bisectLE(arr, x3) {
    let lo = 0, hi = arr.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      if ((arr[mid] ?? 0) <= x3) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }
  cellAt(mx, my) {
    const col = this.bisectLE(this.xs, mx) + 1;
    const row = this.bisectLE(this.ys, my) + 1;
    if (col < 1 || row < 1 || col > (this.view?.maxCol ?? 0) || row > (this.view?.maxRow ?? 0)) return null;
    return { col, row };
  }
  // ---- Eventos ----
  onWheel = (e8) => {
    e8.preventDefault();
    if (e8.shiftKey || e8.ctrlKey) {
      this.scrollX = Math.min(this.maxScrollX(), Math.max(0, this.scrollX + e8.deltaY));
    } else if (e8.deltaX) {
      this.scrollX = Math.min(this.maxScrollX(), Math.max(0, this.scrollX + e8.deltaX));
      this.scrollY = Math.min(this.maxScrollY(), Math.max(0, this.scrollY + e8.deltaY));
    } else {
      this.scrollY = Math.min(this.maxScrollY(), Math.max(0, this.scrollY + e8.deltaY));
    }
    this.paint();
  };
  onMouseDown = (e8) => {
    const rect = this.canvas.getBoundingClientRect();
    const px = e8.clientX - rect.left;
    const py = e8.clientY - rect.top;
    this.canvas.focus();
    if (px < HEADER_W || py < HEADER_H) return;
    const hit = this.cellAt(px - HEADER_W + this.scrollX, py - HEADER_H + this.scrollY);
    if (hit) {
      this.sel = hit;
      this.emitSelection();
      this.paint();
    }
  };
  onDblClick = (_e) => {
  };
  onKeyDown = (e8) => {
    const v2 = this.view;
    if (!v2) return;
    let { col, row } = this.sel;
    switch (e8.key) {
      case "ArrowLeft":
        col = Math.max(1, col - 1);
        break;
      case "ArrowRight":
        col = Math.min(v2.maxCol, col + 1);
        break;
      case "ArrowUp":
        row = Math.max(1, row - 1);
        break;
      case "ArrowDown":
        row = Math.min(v2.maxRow, row + 1);
        break;
      case "Home":
        col = 1;
        break;
      case "End":
        col = v2.maxCol;
        break;
      case "PageDown":
        row = Math.min(v2.maxRow, row + 10);
        break;
      case "PageUp":
        row = Math.max(1, row - 10);
        break;
      default:
        return;
    }
    e8.preventDefault();
    this.sel = { col, row };
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  };
  ensureVisible() {
    const { col, row } = this.sel;
    const left = this.xs[col - 1] ?? 0;
    const right = this.xs[col] ?? 0;
    const top = this.ys[row - 1] ?? 0;
    const bottom = this.ys[row] ?? 0;
    const vw = this.canvas.clientWidth - HEADER_W;
    const vh = this.canvas.clientHeight - HEADER_H;
    if (left < this.scrollX) this.scrollX = left;
    else if (right > this.scrollX + vw) this.scrollX = right - vw;
    if (top < this.scrollY) this.scrollY = top;
    else if (bottom > this.scrollY + vh) this.scrollY = bottom - vh;
  }
  // ---- Renderização ----
  paint() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = this.canvas.clientWidth;
    const H2 = this.canvas.clientHeight;
    ctx.clearRect(0, 0, W, H2);
    if (!this.view) {
      ctx.fillStyle = "#888";
      ctx.font = "14px Segoe UI, Arial";
      ctx.fillText("Nenhum .xlsx carregado", 20, 30);
      return;
    }
    this.status.textContent = rowColToRef(this.sel.col, this.sel.row);
    ctx.save();
    ctx.translate(HEADER_W, HEADER_H);
    this.paintGrid(ctx, W - HEADER_W, H2 - HEADER_H);
    ctx.restore();
    this.paintHeaders(ctx, W, H2);
    this.paintScrollbars(ctx, W, H2);
  }
  paintGrid(ctx, vw, vh) {
    const v2 = this.view;
    const firstCol = Math.max(1, this.bisectLE(this.xs, this.scrollX) + 1);
    const lastCol = Math.min(v2.maxCol, this.bisectLE(this.xs, this.scrollX + vw) + 1);
    const firstRow = Math.max(1, this.bisectLE(this.ys, this.scrollY) + 1);
    const lastRow = Math.min(v2.maxRow, this.bisectLE(this.ys, this.scrollY + vh) + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, vw, vh);
    const rowMap = /* @__PURE__ */ new Map();
    for (const r6 of v2.worksheet.rows) {
      const cm = /* @__PURE__ */ new Map();
      for (const c4 of r6.cells) cm.set(refToRowCol(c4.ref).col, c4);
      rowMap.set(r6.r, cm);
    }
    this.condNumMap.clear();
    if (v2.condFormats.length > 0) {
      for (const r6 of v2.worksheet.rows) {
        for (const c4 of r6.cells) {
          if (c4.type === "s") continue;
          const n5 = parseFloat(c4.value ?? "NaN");
          if (!Number.isNaN(n5)) this.condNumMap.set(`${refToRowCol(c4.ref).col},${r6.r}`, n5);
        }
      }
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, vw, vh);
    ctx.clip();
    for (let row = firstRow; row <= lastRow; row++) {
      if (v2.hiddenRows.has(row)) continue;
      const top = (this.ys[row - 1] ?? 0) - this.scrollY;
      const h3 = this.rowHeight(row);
      if (h3 <= 0) continue;
      const cells = rowMap.get(row);
      for (let col = firstCol; col <= lastCol; col++) {
        if (v2.hiddenCols.has(col)) continue;
        const left = (this.xs[col - 1] ?? 0) - this.scrollX;
        const w2 = this.colWidth(col);
        if (w2 <= 0) continue;
        const m2 = this.mergeAt(col, row);
        if (m2 && !m2.isOrigin) continue;
        let drawW = w2, drawH = h3;
        if (m2) {
          drawW = (this.xs[m2.lastCol] ?? 0) - (this.xs[m2.firstCol - 1] ?? 0);
          drawH = (this.ys[m2.lastRow] ?? 0) - (this.ys[m2.firstRow - 1] ?? 0);
        }
        const cell = cells?.get(col);
        const st = this.resolveStyle(cell);
        if (st.fill?.fgColor) {
          ctx.fillStyle = st.fill.fgColor;
          ctx.fillRect(left, top, drawW, drawH);
        }
        this.paintCondFormat(ctx, cell, col, row, left, top, drawW, drawH);
        this.paintCell(ctx, cell, st, left, top, drawW, drawH);
        if (st.border) this.paintBorder(ctx, st.border, left, top, drawW, drawH);
      }
    }
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = firstCol; col <= lastCol + 1; col++) {
      const x3 = Math.round((this.xs[col - 1] ?? 0) - this.scrollX) + 0.5;
      ctx.moveTo(x3, 0);
      ctx.lineTo(x3, vh);
    }
    for (let row = firstRow; row <= lastRow + 1; row++) {
      const y3 = Math.round((this.ys[row - 1] ?? 0) - this.scrollY) + 0.5;
      ctx.moveTo(0, y3);
      ctx.lineTo(vw, y3);
    }
    ctx.stroke();
    this.paintSelection(ctx);
    ctx.restore();
  }
  /** Localiza a mescla que cobre (col,row), se houver. */
  mergeAt(col, row) {
    const v2 = this.view;
    if (!v2 || v2.merges.size === 0) return null;
    for (const [, range] of v2.merges) {
      const [a3, b5] = range.split(":");
      if (!a3 || !b5) continue;
      const s4 = refToRowCol(a3);
      const e8 = refToRowCol(b5);
      if (col >= s4.col && col <= e8.col && row >= s4.row && row <= e8.row) {
        return { firstCol: s4.col, lastCol: e8.col, firstRow: s4.row, lastRow: e8.row, isOrigin: col === s4.col && row === s4.row };
      }
    }
    return null;
  }
  paintBorder(ctx, border, left, top, w2, h3) {
    const edge = (e8, x1, y1, x22, y22, dash) => {
      if (!e8 || !e8.style) return;
      ctx.strokeStyle = e8.color ?? "#000000";
      const widths = { thin: 1, medium: 2, thick: 3 };
      ctx.lineWidth = (widths[e8.style] ?? 1) * this.zoom;
      ctx.setLineDash(e8.style === "dashed" ? [4 * this.zoom, 2 * this.zoom] : e8.style === "dotted" ? [1, 2 * this.zoom] : dash);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x22, y22);
      ctx.stroke();
    };
    const noDash = [];
    edge(border.left, Math.round(left) + 0.5, top, Math.round(left) + 0.5, top + h3, noDash);
    edge(border.right, Math.round(left + w2) + 0.5, top, Math.round(left + w2) + 0.5, top + h3, noDash);
    edge(border.top, left, Math.round(top) + 0.5, left + w2, Math.round(top) + 0.5, noDash);
    edge(border.bottom, left, Math.round(top + h3) + 0.5, left + w2, Math.round(top + h3) + 0.5, noDash);
    ctx.setLineDash([]);
  }
  /** Aplica formatação condicional (color scale / data bar / highlight). */
  paintCondFormat(ctx, cell, col, row, left, top, w2, h3) {
    const v2 = this.view;
    if (!v2 || v2.condFormats.length === 0 || !cell) return;
    const value = cell.type === "s" ? NaN : parseFloat(cell.value ?? "NaN");
    const vals = this.condNumMap;
    for (const cf of v2.condFormats) {
      if (!sqrefContains(cf.sqref, col, row)) continue;
      for (const rule of cf.rules) {
        if (rule.type === "colorScale" && rule.stops && !Number.isNaN(value)) {
          const color = colorScaleColor(rule.stops, value, cf.sqref, vals);
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(left, top, w2, h3);
          }
        } else if (rule.type === "dataBar" && !Number.isNaN(value)) {
          const { min, max: max2 } = rangeMinMax(cf.sqref, vals);
          if (max2 > min) {
            const frac = Math.max(0, Math.min(1, (value - min) / (max2 - min)));
            ctx.fillStyle = rule.barColor ?? "#638EC6";
            ctx.fillRect(left + 2 * this.zoom, top + h3 * 0.25, (w2 - 4 * this.zoom) * frac, h3 * 0.5);
          }
        } else if (rule.type === "cellIs" && rule.dxfId !== void 0 && !Number.isNaN(value)) {
          const thr = parseFloat(rule.formula?.[0] ?? "NaN");
          const dxf = this.styles.dxfs[rule.dxfId];
          if (dxf && !Number.isNaN(thr) && evalCellIs(rule.operator, value, thr)) {
            if (dxf.fillColor) {
              ctx.fillStyle = dxf.fillColor;
              ctx.fillRect(left, top, w2, h3);
            }
          }
        }
      }
    }
  }
  paintCell(ctx, cell, st, left, top, w2, h3) {
    const display = this.displayText(cell);
    if (display === "") return;
    const font = st.font;
    const size = (font?.size ?? 11) * 96 / 72 * this.zoom;
    const style = font?.italic ? "italic " : "";
    const weight = font?.bold ? "700 " : "400 ";
    ctx.font = `${style}${weight}${size}px 'Aptos Narrow', ${font?.name ?? "Segoe UI"}, Arial, sans-serif`;
    ctx.fillStyle = font?.color ?? TEXT;
    const pad = 3 * this.zoom;
    let ta = "left";
    if (st.align) ta = st.align === "center" ? "center" : st.align === "right" ? "right" : "left";
    else if (this.isNumericCell(cell)) ta = "right";
    ctx.textAlign = ta;
    ctx.textBaseline = "alphabetic";
    ctx.save();
    ctx.beginPath();
    ctx.rect(left + 0.5, top + 0.5, w2 - 1, h3 - 1);
    ctx.clip();
    if (st.wrap) {
      const lines = this.wrapText(ctx, display, w2 - pad * 2);
      const lineH = size * 1.2;
      const totalH = lines.length * lineH;
      let startY;
      const va = st.valign ?? "bottom";
      if (va === "top") startY = top + pad + size * 0.85;
      else if (va === "center") startY = top + (h3 - totalH) / 2 + size * 0.85;
      else startY = top + h3 - pad - totalH + size * 0.85;
      const x3 = ta === "right" ? left + w2 - pad : ta === "center" ? left + w2 / 2 : left + pad;
      for (let i7 = 0; i7 < lines.length; i7++) ctx.fillText(lines[i7], x3, startY + i7 * lineH);
    } else {
      const m2 = ctx.measureText(display);
      const asc = m2.actualBoundingBoxAscent || size * 0.8;
      const desc = m2.actualBoundingBoxDescent || size * 0.2;
      const va = st.valign ?? "bottom";
      let y3;
      if (va === "top") y3 = top + 2 * this.zoom + asc;
      else if (va === "center") y3 = top + (h3 + asc - desc) / 2;
      else y3 = top + h3 - 2 * this.zoom - desc;
      const x3 = ta === "right" ? left + w2 - pad : ta === "center" ? left + w2 / 2 : left + pad;
      ctx.fillText(display, x3, y3);
    }
    ctx.restore();
  }
  /** Quebra texto em linhas que cabem na largura disponível (word + char wrap). */
  wrapText(ctx, text, maxW) {
    if (text.includes("\n")) return text.split("\n").flatMap((l3) => this.wrapText(ctx, l3, maxW));
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      let chunk = "";
      for (const ch of word) {
        if (ctx.measureText(chunk + ch).width <= maxW) chunk += ch;
        else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      line = chunk;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }
  paintSelection(ctx) {
    if (this.capture) return;
    const { col, row } = this.sel;
    const left = (this.xs[col - 1] ?? 0) - this.scrollX;
    const top = (this.ys[row - 1] ?? 0) - this.scrollY;
    const w2 = this.colWidth(col);
    const h3 = this.rowHeight(row);
    ctx.fillStyle = SELECTION_FILL;
    ctx.fillRect(left, top, w2, h3);
    ctx.strokeStyle = SELECTION_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 1, top + 1, w2 - 2, h3 - 2);
  }
  paintHeaders(ctx, W, H2) {
    const v2 = this.view;
    ctx.fillStyle = CORNER_BG;
    ctx.fillRect(0, 0, HEADER_W, HEADER_H);
    ctx.fillStyle = COL_HEADER_BG;
    ctx.fillRect(HEADER_W, 0, W - HEADER_W, HEADER_H);
    ctx.fillStyle = ROW_HEADER_BG;
    ctx.fillRect(0, HEADER_H, HEADER_W, H2 - HEADER_H);
    ctx.font = `600 ${11 * this.zoom}px 'Aptos Narrow', Segoe UI, Arial`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const firstCol = Math.max(1, this.bisectLE(this.xs, this.scrollX) + 1);
    const lastCol = Math.min(v2.maxCol, this.bisectLE(this.xs, this.scrollX + (W - HEADER_W)) + 1);
    for (let col = firstCol; col <= lastCol; col++) {
      const left = HEADER_W + (this.xs[col - 1] ?? 0) - this.scrollX;
      const w2 = this.colWidth(col);
      ctx.fillStyle = col === this.sel.col ? HEADER_SEL : "#5a5a5a";
      const letters = colLetters(col);
      ctx.fillText(letters, left + w2 / 2, HEADER_H / 2);
    }
    const firstRow = Math.max(1, this.bisectLE(this.ys, this.scrollY) + 1);
    const lastRow = Math.min(v2.maxRow, this.bisectLE(this.ys, this.scrollY + (H2 - HEADER_H)) + 1);
    for (let row = firstRow; row <= lastRow; row++) {
      const top = HEADER_H + (this.ys[row - 1] ?? 0) - this.scrollY;
      const h3 = this.rowHeight(row);
      ctx.fillStyle = row === this.sel.row ? HEADER_SEL : "#5a5a5a";
      ctx.fillText(String(row), HEADER_W / 2, top + h3 / 2);
    }
    ctx.strokeStyle = HEADER_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_H + 0.5);
    ctx.lineTo(W, HEADER_H + 0.5);
    ctx.moveTo(HEADER_W + 0.5, 0);
    ctx.lineTo(HEADER_W + 0.5, H2);
    ctx.stroke();
  }
  paintScrollbars(ctx, W, H2) {
    const mx = this.maxScrollX();
    const my = this.maxScrollY();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    if (my > 0) {
      const track = H2 - HEADER_H;
      const thumb = Math.max(24, track * (this.canvas.clientHeight - HEADER_H) / (this.ys[this.ys.length - 1] ?? 1));
      const top = HEADER_H + (track - thumb) * (this.scrollY / my);
      ctx.fillRect(W - 10, top, 8, thumb);
    }
    if (mx > 0) {
      const track = W - HEADER_W;
      const thumb = Math.max(24, track * (this.canvas.clientWidth - HEADER_W) / (this.xs[this.xs.length - 1] ?? 1));
      const left = HEADER_W + (track - thumb) * (this.scrollX / mx);
      ctx.fillRect(left, H2 - 10, thumb, 8);
    }
  }
  // ---- Resolução de valor/estilo ----
  resolveStyle(cell) {
    const s4 = this.styles;
    const xfIdx = cell?.style ?? 0;
    const xf = s4.cellXfs[xfIdx];
    if (!xf) return { font: void 0, fill: void 0, border: void 0, numFmtId: 0, align: void 0, valign: void 0, wrap: false };
    return {
      font: s4.fonts[xf.fontId],
      fill: s4.fills[xf.fillId],
      border: s4.borders[xf.borderId],
      numFmtId: xf.numFmtId,
      align: xf.horizontal,
      valign: xf.vertical,
      wrap: !!xf.wrapText
    };
  }
  /** Texto a exibir na célula. */
  displayText(cell) {
    if (!cell) return "";
    if (cell.type === "s" && cell.value !== void 0) {
      return this.shared[parseInt(cell.value, 10)]?.text ?? "";
    }
    if (cell.type === "inlineStr") return cell.inlineString?.text ?? "";
    if (cell.type === "b") return cell.value === "1" ? "TRUE" : "FALSE";
    if (cell.type === "e") return cell.value ?? "";
    if (cell.value === void 0) return "";
    const { numFmtId } = this.resolveStyle(cell);
    const code = this.styles.numFmts.get(numFmtId) ?? BUILTIN_FMTS[numFmtId];
    if (code && code !== "General") {
      const n5 = parseFloat(cell.value);
      if (!Number.isNaN(n5)) {
        if (isDateCode(code)) return formatDate(n5, code);
        return formatNumeric(n5, code);
      }
    }
    return cell.value;
  }
  /** General: tipo numérico (n/date/currency/percent) → alinha à direita. */
  isNumericCell(cell) {
    if (!cell) return false;
    if (cell.type === "s" || cell.type === "inlineStr" || cell.type === "b" || cell.type === "e") return false;
    return cell.value !== void 0 && !Number.isNaN(parseFloat(cell.value));
  }
  isNumericDisplay(cell, display) {
    if (!cell) return false;
    if (cell.type === "s" || cell.type === "inlineStr") return false;
    return display !== "" && !Number.isNaN(Number(display.replace(/[^\d.,-]/g, "").replace(/,/g, "")));
  }
};
function colLetters(col) {
  let s4 = "";
  let c4 = col;
  while (c4 > 0) {
    const r6 = (c4 - 1) % 26;
    s4 = String.fromCharCode(65 + r6) + s4;
    c4 = Math.floor((c4 - 1) / 26);
  }
  return s4;
}
var BUILTIN_FMTS = {
  0: "General",
  1: "0",
  2: "0.00",
  3: "#,##0",
  4: "#,##0.00",
  9: "0%",
  10: "0.00%",
  // datas/horas (built-in 14-22)
  14: "m/d/yyyy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "h:mm",
  21: "h:mm:ss",
  22: "m/d/yyyy h:mm",
  37: "#,##0 ;(#,##0)",
  38: "#,##0 ;[Red](#,##0)",
  39: "#,##0.00;(#,##0.00)",
  40: "#,##0.00;[Red](#,##0.00)",
  45: "mm:ss",
  46: "[h]:mm:ss",
  47: "mmss.0",
  48: "##0.0E+0",
  49: "@"
};
function colWidthPx(width) {
  const MDW = 7;
  return Math.floor((256 * width + Math.floor(128 / MDW)) / 256 * MDW);
}
function stripLiterals(code) {
  let out = "";
  for (let i7 = 0; i7 < code.length; i7++) {
    const ch = code[i7];
    if (ch === '"') {
      const end = code.indexOf('"', i7 + 1);
      if (end > i7) {
        i7 = end;
        continue;
      }
    }
    if (ch === "\\") {
      i7++;
      continue;
    }
    out += ch;
  }
  return out;
}
function isDateCode(code) {
  const s4 = stripLiterals(code);
  return /[ymdhs]/i.test(s4) || /A\/P/i.test(s4) || /AM\/PM/i.test(s4);
}
function formatNumeric(value, code) {
  const neg = value < 0;
  let v2 = Math.abs(value);
  const specMatch = code.match(/[0#?][0#?.,%]*/);
  const numSpec = specMatch ? specMatch[0] : "";
  const hasPercent = numSpec.includes("%");
  if (hasPercent) v2 = v2 * 100;
  let decimals = 0;
  const dotIdx = numSpec.lastIndexOf(".");
  if (dotIdx >= 0) decimals = (numSpec.slice(dotIdx + 1).match(/[0#?]/g) ?? []).length;
  const group = numSpec.includes(",");
  const formatted = v2.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: group
  }) + (hasPercent ? "%" : "");
  let out = "";
  let i7 = 0;
  let specEmitted = false;
  const negSign = neg ? "-" : "";
  while (i7 < code.length) {
    const ch = code[i7];
    if (!specEmitted && numSpec && code.startsWith(numSpec, i7)) {
      out += negSign + formatted;
      i7 += numSpec.length;
      specEmitted = true;
      continue;
    }
    if (ch === '"') {
      const end = code.indexOf('"', i7 + 1);
      if (end > i7) {
        out += code.slice(i7 + 1, end);
        i7 = end + 1;
        continue;
      }
    }
    if (ch === "\\") {
      out += code[i7 + 1] ?? "";
      i7 += 2;
      continue;
    }
    if ("0#?.,%".includes(ch)) {
      i7++;
      continue;
    }
    out += ch;
    i7++;
  }
  if (!specEmitted) out = negSign + formatted + out;
  if (neg && specEmitted) {
  }
  return out;
}
var MONTHS_PT = ["janeiro", "fevereiro", "mar\xE7o", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
var MONTHS_SHORT_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
var DAYS_PT = ["domingo", "segunda-feira", "ter\xE7a-feira", "quarta-feira", "quinta-feira", "sexta-feira", "s\xE1bado"];
var DAYS_SHORT_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "s\xE1b"];
function serialToDate(serial) {
  const ms = Math.round(serial * 864e5);
  return new Date(Date.UTC(1899, 11, 30) + ms);
}
function formatDate(serial, code) {
  const d3 = serialToDate(serial);
  const yr = d3.getUTCFullYear();
  const mo = d3.getUTCMonth();
  const day = d3.getUTCDate();
  const wd = d3.getUTCDay();
  const h24 = d3.getUTCHours();
  const min = d3.getUTCMinutes();
  const sec = d3.getUTCSeconds();
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  let out = "";
  let i7 = 0;
  let prevTime = false;
  while (i7 < code.length) {
    const ch = code[i7];
    if (ch === '"') {
      const end = code.indexOf('"', i7 + 1);
      if (end > i7) {
        out += code.slice(i7 + 1, end);
        i7 = end + 1;
        continue;
      }
    }
    if (ch === "\\") {
      out += code[i7 + 1] ?? "";
      i7 += 2;
      continue;
    }
    if (/AM\/PM/i.test(code.slice(i7, i7 + 5))) {
      out += ampm;
      i7 += 5;
      prevTime = false;
      continue;
    }
    if (/A\/P/i.test(code.slice(i7, i7 + 3))) {
      out += ampm.slice(0, 1);
      i7 += 3;
      continue;
    }
    if (/[ymdhs]/i.test(ch)) {
      let run = "";
      while (i7 < code.length && code[i7].toLowerCase() === ch.toLowerCase()) {
        run += code[i7];
        i7++;
      }
      const L2 = run.length;
      const lower = ch.toLowerCase();
      if (lower === "y") out += L2 >= 3 ? String(yr) : String(yr).slice(-2).padStart(2, "0");
      else if (lower === "d") {
        if (L2 >= 4) out += DAYS_PT[wd] ?? "";
        else if (L2 === 3) out += DAYS_SHORT_PT[wd] ?? "";
        else out += L2 === 2 ? String(day).padStart(2, "0") : String(day);
      } else if (lower === "h") {
        const hh = code.includes("AM/PM") || code.includes("a/p") ? h12 : h24;
        out += L2 === 2 ? String(hh).padStart(2, "0") : String(hh);
        prevTime = true;
      } else if (lower === "m") {
        if (prevTime) out += L2 === 2 ? String(min).padStart(2, "0") : String(min);
        else if (L2 >= 4) out += MONTHS_PT[mo] ?? "";
        else if (L2 === 3) out += MONTHS_SHORT_PT[mo] ?? "";
        else out += L2 === 2 ? String(mo + 1).padStart(2, "0") : String(mo + 1);
      } else if (lower === "s") {
        out += L2 === 2 ? String(sec).padStart(2, "0") : String(sec);
      }
      continue;
    }
    out += ch;
    i7++;
  }
  return out;
}
function sqrefContains(sqref, col, row) {
  for (const part of sqref.split(/\s+/)) {
    if (!part) continue;
    const [a3, b5] = part.split(":");
    const s4 = refToRowCol(a3);
    const e8 = b5 ? refToRowCol(b5) : s4;
    if (col >= s4.col && col <= e8.col && row >= s4.row && row <= e8.row) return true;
  }
  return false;
}
function rangeMinMax(sqref, vals) {
  let min = Infinity, max2 = -Infinity;
  for (const part of sqref.split(/\s+/)) {
    if (!part) continue;
    const [a3, b5] = part.split(":");
    const s4 = refToRowCol(a3);
    const e8 = b5 ? refToRowCol(b5) : s4;
    for (let r6 = s4.row; r6 <= e8.row; r6++) {
      for (let c4 = s4.col; c4 <= e8.col; c4++) {
        const n5 = vals.get(`${c4},${r6}`);
        if (n5 !== void 0 && !Number.isNaN(n5)) {
          if (n5 < min) min = n5;
          if (n5 > max2) max2 = n5;
        }
      }
    }
  }
  if (min === Infinity) {
    min = 0;
    max2 = 0;
  }
  return { min, max: max2 };
}
function colorScaleColor(stops, value, sqref, vals) {
  if (stops.length < 2) return stops[0]?.color;
  const { min, max: max2 } = rangeMinMax(sqref, vals);
  if (max2 <= min) return stops[0].color;
  const t5 = Math.max(0, Math.min(1, (value - min) / (max2 - min)));
  const c0 = stops[0].color, c1 = stops[1].color;
  if (stops.length === 2) return lerpColor(c0, c1, t5);
  const mid = 0.5;
  return t5 <= mid ? lerpColor(c0, c1, t5 / mid) : lerpColor(c1, stops[2].color, (t5 - mid) / mid);
}
function lerpColor(a3, b5, t5) {
  const pa = hexRGB(a3), pb = hexRGB(b5);
  const r6 = Math.round(pa[0] + (pb[0] - pa[0]) * t5);
  const g2 = Math.round(pa[1] + (pb[1] - pa[1]) * t5);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t5);
  return `rgb(${r6},${g2},${bl})`;
}
function hexRGB(c4) {
  const m2 = /#?([0-9a-f]{6})/i.exec(c4);
  if (!m2) return [128, 128, 128];
  const n5 = parseInt(m2[1], 16);
  return [n5 >> 16 & 255, n5 >> 8 & 255, n5 & 255];
}
function evalCellIs(op, v2, t5) {
  switch (op) {
    case "greaterThan":
      return v2 > t5;
    case "lessThan":
      return v2 < t5;
    case "equal":
      return v2 === t5;
    case "notEqual":
      return v2 !== t5;
    case "greaterThanOrEqual":
      return v2 >= t5;
    case "lessThanOrEqual":
      return v2 <= t5;
    default:
      return false;
  }
}
customElements.define("universal-sheet", UniversalSheetElement);

// ../../node_modules/tslib/tslib.es6.mjs
function __decorate(decorators, target, key, desc) {
  var c4 = arguments.length, r6 = c4 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r6 = Reflect.decorate(decorators, target, key, desc);
  else for (var i7 = decorators.length - 1; i7 >= 0; i7--) if (d3 = decorators[i7]) r6 = (c4 < 3 ? d3(r6) : c4 > 3 ? d3(target, key, r6) : d3(target, key)) || r6;
  return c4 > 3 && r6 && Object.defineProperty(target, key, r6), r6;
}

// ../../node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e8, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e8;
  }
  get styleSheet() {
    let t5 = this.o;
    const s4 = this.t;
    if (e && void 0 === t5) {
      const e8 = void 0 !== s4 && 1 === s4.length;
      e8 && (t5 = o.get(s4)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e8 && o.set(s4, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i2 = (t5, ...e8) => {
  const o7 = 1 === t5.length ? t5[0] : e8.reduce((e9, s4, o8) => e9 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s4, o7) => {
  if (e) s4.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e8 of o7) {
    const o8 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o8.setAttribute("nonce", n5), o8.textContent = e8.cssText, s4.appendChild(o8);
  }
};
var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e8 = "";
  for (const s4 of t6.cssRules) e8 += s4.cssText;
  return r(e8);
})(t5) : t5;

// ../../node_modules/@lit/reactive-element/reactive-element.js
var { is: i3, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s4) => t5;
var u = { toAttribute(t5, s4) {
  switch (s4) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s4) {
  let i7 = t5;
  switch (s4) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var f = (t5, s4) => !i3(t5, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t5, s4), !s4.noAccessor) {
      const i7 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t5, i7, s4);
      void 0 !== h3 && e2(this.prototype, t5, h3);
    }
  }
  static getPropertyDescriptor(t5, s4, i7) {
    const { get: e8, set: r6 } = h(this.prototype, t5) ?? { get() {
      return this[s4];
    }, set(t6) {
      this[s4] = t6;
    } };
    return { get: e8, set(s5) {
      const h3 = e8?.call(this);
      r6?.call(this, s5), this.requestUpdate(t5, h3, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s4 = [...r2(t6), ...o2(t6)];
      for (const i7 of s4) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s4 = litPropertyMetadata.get(t5);
      if (void 0 !== s4) for (const [t6, i7] of s4) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s4] of this.elementProperties) {
      const i7 = this._$Eu(t6, s4);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i7 = [];
    if (Array.isArray(s4)) {
      const e8 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e8) i7.unshift(c(s5));
    } else void 0 !== s4 && i7.push(c(s4));
    return i7;
  }
  static _$Eu(t5, s4) {
    const i7 = s4.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i7 of s4.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s4, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s4) {
    const i7 = this.constructor.elementProperties.get(t5), e8 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e8 && true === i7.reflect) {
      const h3 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s4, i7.type);
      this._$Em = t5, null == h3 ? this.removeAttribute(e8) : this.setAttribute(e8, h3), this._$Em = null;
    }
  }
  _$AK(t5, s4) {
    const i7 = this.constructor, e8 = i7._$Eh.get(t5);
    if (void 0 !== e8 && this._$Em !== e8) {
      const t6 = i7.getPropertyOptions(e8), h3 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e8;
      const r6 = h3.fromAttribute(s4, t6.type);
      this[e8] = r6 ?? this._$Ej?.get(e8) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s4, i7, e8 = false, h3) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e8 && (h3 = this[t5]), i7 ??= r6.getPropertyOptions(t5), !((i7.hasChanged ?? f)(h3, s4) || i7.useDefault && i7.reflect && h3 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i7)))) return;
      this.C(t5, s4, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s4, { useDefault: i7, reflect: e8, wrapped: h3 }, r6) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s4 ?? this[t5]), true !== h3 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s4 = void 0), this._$AL.set(t5, s4)), true === e8 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s5] of this._$Ep) this[t7] = s5;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s5, i7] of t6) {
        const { wrapped: t7 } = i7, e8 = this[s5];
        true !== t7 || this._$AL.has(s5) || void 0 === e8 || this.C(s5, void 0, i7, e8);
      }
    }
    let t5 = false;
    const s4 = this._$AL;
    try {
      t5 = this.shouldUpdate(s4), t5 ? (this.willUpdate(s4), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t5 = false, this._$EM(), s5;
    }
    t5 && this._$AE(s4);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// ../../node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i4 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x2 = (t5) => (i7, ...s4) => ({ _$litType$: t5, strings: i7, values: s4 });
var b3 = x2(1);
var w = x2(2);
var T = x2(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s4 = t5.length - 1, e8 = [];
  let n5, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c4 = v;
  for (let i8 = 0; i8 < s4; i8++) {
    const s5 = t5[i8];
    let a3, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x3 = c4 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e8.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x3) : s5 + o3 + (-2 === d3 ? i8 : x3);
  }
  return [V(t5, l3 + (t5[s4] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e8];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e8) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t5.length - 1, d3 = this.parts, [f3, v2] = N(t5, i7);
    if (this.el = _S.createElement(f3, e8), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v2[a3++], s4 = r6.getAttribute(t6).split(o3), e9 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e9[2], strings: s4, ctor: "." === e9[1] ? I : "?" === e9[1] ? L : "@" === e9[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i8; s4++) r6.append(t6[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i7) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t5, s4;
  }
};
function M(t5, i7, s4 = t5, e8) {
  if (i7 === E) return i7;
  let h3 = void 0 !== e8 ? s4._$Co?.[e8] : s4._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h3?.constructor !== o7 && (h3?._$AO?.(false), void 0 === o7 ? h3 = void 0 : (h3 = new o7(t5), h3._$AT(t5, s4, e8)), void 0 !== e8 ? (s4._$Co ??= [])[e8] = h3 : s4._$Cl = h3), void 0 !== h3 && (i7 = M(t5, h3._$AS(t5, i7.values), h3, e8)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s4 } = this._$AD, e8 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e8;
    let h3 = P.nextNode(), o7 = 0, n5 = 0, r6 = s4[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h3, h3.nextSibling, this, t5) : 1 === r6.type ? i8 = new r6.ctor(h3, r6.name, r6.strings, this, t5) : 6 === r6.type && (i8 = new Z(h3, this, t5)), this._$AV.push(i8), r6 = s4[++n5];
      }
      o7 !== r6?.index && (h3 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e8;
  }
  p(t5) {
    let i7 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t5, s4, i7), i7 += s4.strings.length - 2) : s4._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s4, e8) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s4, this.options = e8, this._$Cv = e8?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s4 } = t5, e8 = "number" == typeof s4 ? this._$AC(t5) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e8) this._$AH.p(i7);
    else {
      const t6 = new R(e8, this), s5 = t6.u(this.options);
      t6.p(i7), this.T(s5), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s4, e8 = 0;
    for (const h3 of t5) e8 === i7.length ? i7.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i7[e8], s4._$AI(h3), e8++;
    e8 < i7.length && (this._$AR(s4 && s4._$AB.nextSibling, e8), i7.length = e8);
  }
  _$AR(t5 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t5 !== this._$AB; ) {
      const s5 = i4(t5).nextSibling;
      i4(t5).remove(), t5 = s5;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s4, e8, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e8, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s4, e8) {
    const h3 = this.strings;
    let o7 = false;
    if (void 0 === h3) t5 = M(this, t5, i7, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e9 = t5;
      let n5, r6;
      for (t5 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r6 = M(this, e9[s4 + n5], i7, n5), r6 === E && (r6 = this._$AH[n5]), o7 ||= !a2(r6) || r6 !== this._$AH[n5], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h3[n5 + 1]), this._$AH[n5] = r6;
    }
    o7 && !e8 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s4, e8, h3) {
    super(t5, i7, s4, e8, h3), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s4 = this._$AH, e8 = t5 === A && s4 !== A || t5.capture !== s4.capture || t5.once !== s4.once || t5.passive !== s4.passive, h3 = t5 !== A && (s4 === A || e8);
    e8 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s4) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s4) => {
  const e8 = s4?.renderBefore ?? i7;
  let h3 = e8._$litPart$;
  if (void 0 === h3) {
    const t6 = s4?.renderBefore ?? null;
    e8._$litPart$ = h3 = new k(i7.insertBefore(c3(), t6), t6, void 0, s4 ?? {});
  }
  return h3._$AI(t5), h3;
};

// ../../node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i5 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i5._$litElement$ = true, i5["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i5 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i5 });
(s3.litElementVersions ??= []).push("4.2.2");

// ../../node_modules/@lit/reactive-element/decorators/custom-element.js
var t3 = (t5) => (e8, o7) => {
  void 0 !== o7 ? o7.addInitializer(() => {
    customElements.define(t5, e8);
  }) : customElements.define(t5, e8);
};

// ../../node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t5 = o5, e8, r6) => {
  const { kind: n5, metadata: i7 } = r6;
  let s4 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i7, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t5 = Object.create(t5)).wrapped = true), s4.set(r6.name, t5), "accessor" === n5) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n6 = e8.get.call(this);
      e8.set.call(this, r7), this.requestUpdate(o7, n6, t5, true, r7);
    }, init(e9) {
      return void 0 !== e9 && this.C(o7, void 0, t5, e9), e9;
    } };
  }
  if ("setter" === n5) {
    const { name: o7 } = r6;
    return function(r7) {
      const n6 = this[o7];
      e8.call(this, r7), this.requestUpdate(o7, n6, t5, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t5) {
  return (e8, o7) => "object" == typeof o7 ? r4(t5, e8, o7) : ((t6, e9, o8) => {
    const r6 = e9.hasOwnProperty(o8);
    return e9.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e9, o8) : void 0;
  })(t5, e8, o7);
}

// ../../node_modules/@lit/reactive-element/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// ../../node_modules/@lit/reactive-element/decorators/base.js
var e4 = (e8, t5, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t5 && Object.defineProperty(e8, t5, c4), c4);

// ../../node_modules/@lit/reactive-element/decorators/query.js
function e5(e8, r6) {
  return (n5, s4, i7) => {
    const o7 = (t5) => t5.renderRoot?.querySelector(e8) ?? null;
    if (r6) {
      const { get: e9, set: r7 } = "object" == typeof s4 ? n5 : i7 ?? /* @__PURE__ */ (() => {
        const t5 = /* @__PURE__ */ Symbol();
        return { get() {
          return this[t5];
        }, set(e10) {
          this[t5] = e10;
        } };
      })();
      return e4(n5, s4, { get() {
        let t5 = e9.call(this);
        return void 0 === t5 && (t5 = o7(this), (null !== t5 || this.hasUpdated) && r7.call(this, t5)), t5;
      } });
    }
    return e4(n5, s4, { get() {
      return o7(this);
    } });
  };
}

// ../../node_modules/@universal-material/web/ripple/ripple.styles.js
var styles = i2`
  :host,
  .ripple-container::before {
    --_ripple-hover-color: var(--u-ripple-hover-color, var(--u-ripple-color, var(--u-state-layer-color, currentColor)));
    --_ripple-pressed-color: var(--u-ripple-pressed-color, var(--u-ripple-color, var(--u-state-layer-color, currentColor)));
    --_ripple-hover-opacity: var(--u-ripple-pressed-opacity, var(--u-state-hover-opacity, 0.08));
    --_ripple-pressed-opacity: var(--u-ripple-pressed-opacity, .2);
    display: block;
    inset: 0;
    isolation: isolate;
  }

  .ripple-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--u-ripple-border-radius, inherit);
  }

  .ripple-container::before {
    content: "";
    background: var(--_ripple-hover-color);
    opacity: 0;
    transition: opacity 200ms;
  }

  @media (hover: hover) {
    :host(:not([disabled]):hover) .ripple-container::before {
      content: "";
      background: var(--_ripple-hover-color);
      opacity: var(--_ripple-hover-opacity);
    }
  }
  :host,
  .ripple-container::before,
  .ripple {
    position: absolute;
    border-radius: inherit;
  }

  .ripple {
    top: 50%;
    left: 50%;
    background: var(--_ripple-pressed-color);
    border-radius: 50%;
    box-shadow: 0 0 64px 64px var(--_ripple-pressed-color);
    opacity: var(--_ripple-pressed-opacity);
    transform: scale3d(0, 0, 1);
    pointer-events: none;
    will-change: transform;
  }
  .ripple.show {
    transition: transform calc(var(--_ripple-transition-duration) / var(--u-ripple-speed, 1)) cubic-bezier(0.19, 1, 0.22, 1), opacity calc(750ms / var(--u-ripple-speed, 1));
    transform: scale3d(1, 1, 1);
  }
  .ripple.show-forced {
    transition: transform calc(var(--_ripple-transition-duration) / var(--u-ripple-speed, 1)) cubic-bezier(0.19, 1, 0.22, 1), opacity calc(200ms / var(--u-ripple-speed, 1)) 300ms;
    transform: scale3d(2, 2, 1);
    opacity: 0;
  }
  .ripple.dismiss {
    opacity: 0;
    transform: scale3d(2, 2, 1);
  }

  ::slotted(*) {
    position: absolute !important;
    inset: 0;
    border-radius: inherit;
  }
`;

// ../../node_modules/@universal-material/web/ripple/ripple.js
var Ripple_1;
var Ripple = class Ripple2 extends i5 {
  static {
    Ripple_1 = this;
  }
  static {
    this.styles = styles;
  }
  constructor() {
    super();
    this.isTouching = false;
    this.disabled = false;
  }
  render() {
    return b3`<div class="ripple-container"></div><slot></slot>`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.attachEvents();
    this.ariaHidden = "true";
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.dettachEvents();
  }
  attachEvents() {
    this.addEventListener("mousedown", this.handleMouseDown);
    this.addEventListener("touchstart", this.handleTouchStart);
  }
  dettachEvents() {
    this.removeEventListener("mousedown", this.handleMouseDown);
    this.removeEventListener("touchstart", this.handleTouchStart);
  }
  handleMouseDown(e8) {
    if (this.isTouching || !this.canCreateRipple()) {
      return;
    }
    this.createRipple(e8.clientX, e8.clientY, "mouseup");
  }
  handleTouchStart(e8) {
    if (!this.canCreateRipple()) {
      return;
    }
    this.isTouching = true;
    const dismiss = this.createRipple(e8.touches[0].clientX, e8.touches[0].clientY, "touchend");
    this.addEventListener("touchmove", dismiss);
  }
  canCreateRipple() {
    return !this.disabled;
  }
  createRipple(targetX = null, targetY = null, releaseEventName = null) {
    const preClientRect = this.rippleContainer.getBoundingClientRect();
    targetX ??= preClientRect.x + this.rippleContainer.clientWidth / 2;
    targetY ??= preClientRect.y + this.rippleContainer.clientHeight / 2;
    const ripple = document.createElement("DIV");
    ripple.classList.add("ripple");
    this.rippleContainer.appendChild(ripple);
    requestAnimationFrame(() => {
      const clientRect = this.getBoundingClientRect();
      const largestDimensionSize = Math.max(this.clientWidth, this.clientHeight);
      const rippleSize = largestDimensionSize * 2;
      Ripple_1._setElementSquareSizeAndCenter(ripple, rippleSize);
      ripple.style.setProperty("--_ripple-transition-duration", `${1080 * Math.pow(rippleSize, 0.3)}ms`);
      const x3 = targetX - clientRect.left + (rippleSize - this.rippleContainer.clientWidth) / 2;
      const y3 = targetY - clientRect.top + (rippleSize - this.rippleContainer.clientHeight) / 2;
      ripple.style.transformOrigin = `${x3}px ${y3}px`;
      ripple.classList.add(releaseEventName ? "show" : "show-forced");
    });
    const interval = setInterval(() => {
      if (!ripple.classList.contains("dismiss") && !ripple.classList.contains("show-forced")) {
        return;
      }
      const animations = ripple.getAnimations();
      if (animations.length) {
        return;
      }
      clearInterval(interval);
      ripple.remove();
    }, 1e3);
    if (!releaseEventName) {
      return null;
    }
    return this.createDismissEvent(ripple, releaseEventName);
  }
  createDismissEvent(ripple, releaseEventName) {
    const dismiss = () => {
      ripple.classList.add("dismiss");
      this.isTouching = false;
      this.removeEventListener("dragover", dismiss);
      this.removeEventListener("mouseleave", dismiss);
      window.removeEventListener(releaseEventName, dismiss);
    };
    this.addEventListener("dragover", dismiss);
    this.addEventListener("mouseleave", dismiss);
    window.addEventListener(releaseEventName, dismiss);
    return dismiss;
  }
  static _setElementSquareSizeAndCenter(element, size) {
    element.style.top = "50%";
    element.style.left = "50%";
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.style.marginLeft = `${-size / 2}px`;
    element.style.marginTop = `${-size / 2}px`;
  }
};
__decorate([
  n4({ type: Boolean, reflect: true })
], Ripple.prototype, "disabled", void 0);
__decorate([
  e5(".ripple-container")
], Ripple.prototype, "rippleContainer", void 0);
Ripple = Ripple_1 = __decorate([
  t3("u-ripple")
], Ripple);

// demo/ripple.ts
function attachRipple(el) {
  if (el.querySelector(":scope > u-ripple")) return;
  el.appendChild(document.createElement("u-ripple"));
}
function rippleAll(root, selector) {
  root.querySelectorAll(selector).forEach(attachRipple);
}

// demo/menu.ts
var current = null;
var detach = null;
function closeMenu() {
  if (current) {
    current.remove();
    current = null;
  }
  if (detach) {
    detach();
    detach = null;
  }
}
function openMenu(items, at) {
  closeMenu();
  const menu = document.createElement("div");
  menu.className = "wn-menu";
  menu.setAttribute("role", "menu");
  for (const it of items) {
    if (it.sep) {
      const s4 = document.createElement("div");
      s4.className = "wn-menu-sep";
      menu.appendChild(s4);
      continue;
    }
    const b5 = document.createElement("button");
    b5.type = "button";
    b5.className = "wn-menu-item";
    if (it.disabled) b5.disabled = true;
    if (it.checked) b5.classList.add("checked");
    const lead = document.createElement("span");
    lead.className = "lead";
    if (it.swatch !== void 0) {
      const sw = document.createElement("span");
      sw.className = "sw";
      if (it.swatch) sw.style.background = it.swatch;
      else sw.style.borderStyle = "dashed";
      lead.appendChild(sw);
    } else if (it.icon) {
      lead.classList.add("micon");
      lead.textContent = it.icon;
    } else if (it.checked) {
      lead.classList.add("micon");
      lead.textContent = "check";
    }
    b5.appendChild(lead);
    const lb = document.createElement("span");
    lb.className = "lb";
    lb.textContent = it.label ?? "";
    b5.appendChild(lb);
    if (it.shortcut) {
      const sc = document.createElement("span");
      sc.className = "sc";
      sc.textContent = it.shortcut;
      b5.appendChild(sc);
    }
    b5.addEventListener("mousedown", (e8) => e8.preventDefault());
    b5.addEventListener("click", (e8) => {
      e8.stopPropagation();
      closeMenu();
      it.onClick?.();
    });
    if (!it.disabled) attachRipple(b5);
    menu.appendChild(b5);
  }
  document.body.appendChild(menu);
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x3, y3;
  if ("anchor" in at) {
    const r6 = at.anchor.getBoundingClientRect();
    x3 = r6.left;
    y3 = r6.bottom + 4;
    if (y3 + mh > vh - 8) y3 = Math.max(8, r6.top - mh - 4);
  } else {
    x3 = at.x;
    y3 = at.y;
    if (y3 + mh > vh - 8) y3 = Math.max(8, y3 - mh);
  }
  if (x3 + mw > vw - 8) x3 = Math.max(8, vw - mw - 8);
  menu.style.left = `${Math.max(8, x3)}px`;
  menu.style.top = `${Math.max(8, y3)}px`;
  current = menu;
  const onDown = (e8) => {
    if (current && !current.contains(e8.target)) closeMenu();
  };
  const onKey = (e8) => {
    if (e8.key === "Escape") closeMenu();
  };
  const onBlur = () => closeMenu();
  setTimeout(() => {
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onBlur);
    window.addEventListener("blur", onBlur);
  }, 0);
  detach = () => {
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onBlur);
    window.removeEventListener("blur", onBlur);
  };
}

// ../../node_modules/@material/material-color-utilities/utils/math_utils.js
function signum(num) {
  if (num < 0) {
    return -1;
  } else if (num === 0) {
    return 0;
  } else {
    return 1;
  }
}
function lerp(start, stop, amount) {
  return (1 - amount) * start + amount * stop;
}
function clampInt(min, max2, input) {
  if (input < min) {
    return min;
  } else if (input > max2) {
    return max2;
  }
  return input;
}
function clampDouble(min, max2, input) {
  if (input < min) {
    return min;
  } else if (input > max2) {
    return max2;
  }
  return input;
}
function sanitizeDegreesInt(degrees) {
  degrees = degrees % 360;
  if (degrees < 0) {
    degrees = degrees + 360;
  }
  return degrees;
}
function sanitizeDegreesDouble(degrees) {
  degrees = degrees % 360;
  if (degrees < 0) {
    degrees = degrees + 360;
  }
  return degrees;
}
function differenceDegrees(a3, b5) {
  return 180 - Math.abs(Math.abs(a3 - b5) - 180);
}
function matrixMultiply(row, matrix) {
  const a3 = row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2];
  const b5 = row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2];
  const c4 = row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2];
  return [a3, b5, c4];
}

// ../../node_modules/@material/material-color-utilities/utils/color_utils.js
var SRGB_TO_XYZ = [
  [0.41233895, 0.35762064, 0.18051042],
  [0.2126, 0.7152, 0.0722],
  [0.01932141, 0.11916382, 0.95034478]
];
var XYZ_TO_SRGB = [
  [
    3.2413774792388685,
    -1.5376652402851851,
    -0.49885366846268053
  ],
  [
    -0.9691452513005321,
    1.8758853451067872,
    0.04156585616912061
  ],
  [
    0.05562093689691305,
    -0.20395524564742123,
    1.0571799111220335
  ]
];
var WHITE_POINT_D65 = [95.047, 100, 108.883];
function argbFromRgb(red, green, blue) {
  return (255 << 24 | (red & 255) << 16 | (green & 255) << 8 | blue & 255) >>> 0;
}
function argbFromLinrgb(linrgb) {
  const r6 = delinearized(linrgb[0]);
  const g2 = delinearized(linrgb[1]);
  const b5 = delinearized(linrgb[2]);
  return argbFromRgb(r6, g2, b5);
}
function redFromArgb(argb) {
  return argb >> 16 & 255;
}
function greenFromArgb(argb) {
  return argb >> 8 & 255;
}
function blueFromArgb(argb) {
  return argb & 255;
}
function argbFromXyz(x3, y3, z2) {
  const matrix = XYZ_TO_SRGB;
  const linearR = matrix[0][0] * x3 + matrix[0][1] * y3 + matrix[0][2] * z2;
  const linearG = matrix[1][0] * x3 + matrix[1][1] * y3 + matrix[1][2] * z2;
  const linearB = matrix[2][0] * x3 + matrix[2][1] * y3 + matrix[2][2] * z2;
  const r6 = delinearized(linearR);
  const g2 = delinearized(linearG);
  const b5 = delinearized(linearB);
  return argbFromRgb(r6, g2, b5);
}
function xyzFromArgb(argb) {
  const r6 = linearized(redFromArgb(argb));
  const g2 = linearized(greenFromArgb(argb));
  const b5 = linearized(blueFromArgb(argb));
  return matrixMultiply([r6, g2, b5], SRGB_TO_XYZ);
}
function argbFromLstar(lstar) {
  const y3 = yFromLstar(lstar);
  const component = delinearized(y3);
  return argbFromRgb(component, component, component);
}
function lstarFromArgb(argb) {
  const y3 = xyzFromArgb(argb)[1];
  return 116 * labF(y3 / 100) - 16;
}
function yFromLstar(lstar) {
  return 100 * labInvf((lstar + 16) / 116);
}
function lstarFromY(y3) {
  return labF(y3 / 100) * 116 - 16;
}
function linearized(rgbComponent) {
  const normalized = rgbComponent / 255;
  if (normalized <= 0.040449936) {
    return normalized / 12.92 * 100;
  } else {
    return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100;
  }
}
function delinearized(rgbComponent) {
  const normalized = rgbComponent / 100;
  let delinearized2 = 0;
  if (normalized <= 31308e-7) {
    delinearized2 = normalized * 12.92;
  } else {
    delinearized2 = 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
  }
  return clampInt(0, 255, Math.round(delinearized2 * 255));
}
function whitePointD65() {
  return WHITE_POINT_D65;
}
function labF(t5) {
  const e8 = 216 / 24389;
  const kappa = 24389 / 27;
  if (t5 > e8) {
    return Math.pow(t5, 1 / 3);
  } else {
    return (kappa * t5 + 16) / 116;
  }
}
function labInvf(ft) {
  const e8 = 216 / 24389;
  const kappa = 24389 / 27;
  const ft3 = ft * ft * ft;
  if (ft3 > e8) {
    return ft3;
  } else {
    return (116 * ft - 16) / kappa;
  }
}

// ../../node_modules/@material/material-color-utilities/hct/viewing_conditions.js
var ViewingConditions = class _ViewingConditions {
  /**
   * Create ViewingConditions from a simple, physically relevant, set of
   * parameters.
   *
   * @param whitePoint White point, measured in the XYZ color space.
   *     default = D65, or sunny day afternoon
   * @param adaptingLuminance The luminance of the adapting field. Informally,
   *     how bright it is in the room where the color is viewed. Can be
   *     calculated from lux by multiplying lux by 0.0586. default = 11.72,
   *     or 200 lux.
   * @param backgroundLstar The lightness of the area surrounding the color.
   *     measured by L* in L*a*b*. default = 50.0
   * @param surround A general description of the lighting surrounding the
   *     color. 0 is pitch dark, like watching a movie in a theater. 1.0 is a
   *     dimly light room, like watching TV at home at night. 2.0 means there
   *     is no difference between the lighting on the color and around it.
   *     default = 2.0
   * @param discountingIlluminant Whether the eye accounts for the tint of the
   *     ambient lighting, such as knowing an apple is still red in green light.
   *     default = false, the eye does not perform this process on
   *       self-luminous objects like displays.
   */
  static make(whitePoint = whitePointD65(), adaptingLuminance = 200 / Math.PI * yFromLstar(50) / 100, backgroundLstar = 50, surround = 2, discountingIlluminant = false) {
    const xyz = whitePoint;
    const rW = xyz[0] * 0.401288 + xyz[1] * 0.650173 + xyz[2] * -0.051461;
    const gW = xyz[0] * -0.250268 + xyz[1] * 1.204414 + xyz[2] * 0.045854;
    const bW = xyz[0] * -2079e-6 + xyz[1] * 0.048952 + xyz[2] * 0.953127;
    const f3 = 0.8 + surround / 10;
    const c4 = f3 >= 0.9 ? lerp(0.59, 0.69, (f3 - 0.9) * 10) : lerp(0.525, 0.59, (f3 - 0.8) * 10);
    let d3 = discountingIlluminant ? 1 : f3 * (1 - 1 / 3.6 * Math.exp((-adaptingLuminance - 42) / 92));
    d3 = d3 > 1 ? 1 : d3 < 0 ? 0 : d3;
    const nc = f3;
    const rgbD = [
      d3 * (100 / rW) + 1 - d3,
      d3 * (100 / gW) + 1 - d3,
      d3 * (100 / bW) + 1 - d3
    ];
    const k2 = 1 / (5 * adaptingLuminance + 1);
    const k4 = k2 * k2 * k2 * k2;
    const k4F = 1 - k4;
    const fl2 = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.cbrt(5 * adaptingLuminance);
    const n5 = yFromLstar(backgroundLstar) / whitePoint[1];
    const z2 = 1.48 + Math.sqrt(n5);
    const nbb = 0.725 / Math.pow(n5, 0.2);
    const ncb = nbb;
    const rgbAFactors = [
      Math.pow(fl2 * rgbD[0] * rW / 100, 0.42),
      Math.pow(fl2 * rgbD[1] * gW / 100, 0.42),
      Math.pow(fl2 * rgbD[2] * bW / 100, 0.42)
    ];
    const rgbA = [
      400 * rgbAFactors[0] / (rgbAFactors[0] + 27.13),
      400 * rgbAFactors[1] / (rgbAFactors[1] + 27.13),
      400 * rgbAFactors[2] / (rgbAFactors[2] + 27.13)
    ];
    const aw = (2 * rgbA[0] + rgbA[1] + 0.05 * rgbA[2]) * nbb;
    return new _ViewingConditions(n5, aw, nbb, ncb, c4, nc, rgbD, fl2, Math.pow(fl2, 0.25), z2);
  }
  /**
   * Parameters are intermediate values of the CAM16 conversion process. Their
   * names are shorthand for technical color science terminology, this class
   * would not benefit from documenting them individually. A brief overview
   * is available in the CAM16 specification, and a complete overview requires
   * a color science textbook, such as Fairchild's Color Appearance Models.
   */
  constructor(n5, aw, nbb, ncb, c4, nc, rgbD, fl2, fLRoot, z2) {
    this.n = n5;
    this.aw = aw;
    this.nbb = nbb;
    this.ncb = ncb;
    this.c = c4;
    this.nc = nc;
    this.rgbD = rgbD;
    this.fl = fl2;
    this.fLRoot = fLRoot;
    this.z = z2;
  }
};
ViewingConditions.DEFAULT = ViewingConditions.make();

// ../../node_modules/@material/material-color-utilities/hct/cam16.js
var Cam16 = class _Cam16 {
  /**
   * All of the CAM16 dimensions can be calculated from 3 of the dimensions, in
   * the following combinations:
   *      -  {j or q} and {c, m, or s} and hue
   *      - jstar, astar, bstar
   * Prefer using a static method that constructs from 3 of those dimensions.
   * This constructor is intended for those methods to use to return all
   * possible dimensions.
   *
   * @param hue
   * @param chroma informally, colorfulness / color intensity. like saturation
   *     in HSL, except perceptually accurate.
   * @param j lightness
   * @param q brightness; ratio of lightness to white point's lightness
   * @param m colorfulness
   * @param s saturation; ratio of chroma to white point's chroma
   * @param jstar CAM16-UCS J coordinate
   * @param astar CAM16-UCS a coordinate
   * @param bstar CAM16-UCS b coordinate
   */
  constructor(hue, chroma, j, q, m2, s4, jstar, astar, bstar) {
    this.hue = hue;
    this.chroma = chroma;
    this.j = j;
    this.q = q;
    this.m = m2;
    this.s = s4;
    this.jstar = jstar;
    this.astar = astar;
    this.bstar = bstar;
  }
  /**
   * CAM16 instances also have coordinates in the CAM16-UCS space, called J*,
   * a*, b*, or jstar, astar, bstar in code. CAM16-UCS is included in the CAM16
   * specification, and is used to measure distances between colors.
   */
  distance(other) {
    const dJ = this.jstar - other.jstar;
    const dA = this.astar - other.astar;
    const dB = this.bstar - other.bstar;
    const dEPrime = Math.sqrt(dJ * dJ + dA * dA + dB * dB);
    const dE = 1.41 * Math.pow(dEPrime, 0.63);
    return dE;
  }
  /**
   * @param argb ARGB representation of a color.
   * @return CAM16 color, assuming the color was viewed in default viewing
   *     conditions.
   */
  static fromInt(argb) {
    return _Cam16.fromIntInViewingConditions(argb, ViewingConditions.DEFAULT);
  }
  /**
   * @param argb ARGB representation of a color.
   * @param viewingConditions Information about the environment where the color
   *     was observed.
   * @return CAM16 color.
   */
  static fromIntInViewingConditions(argb, viewingConditions) {
    const red = (argb & 16711680) >> 16;
    const green = (argb & 65280) >> 8;
    const blue = argb & 255;
    const redL = linearized(red);
    const greenL = linearized(green);
    const blueL = linearized(blue);
    const x3 = 0.41233895 * redL + 0.35762064 * greenL + 0.18051042 * blueL;
    const y3 = 0.2126 * redL + 0.7152 * greenL + 0.0722 * blueL;
    const z2 = 0.01932141 * redL + 0.11916382 * greenL + 0.95034478 * blueL;
    const rC = 0.401288 * x3 + 0.650173 * y3 - 0.051461 * z2;
    const gC = -0.250268 * x3 + 1.204414 * y3 + 0.045854 * z2;
    const bC = -2079e-6 * x3 + 0.048952 * y3 + 0.953127 * z2;
    const rD = viewingConditions.rgbD[0] * rC;
    const gD = viewingConditions.rgbD[1] * gC;
    const bD = viewingConditions.rgbD[2] * bC;
    const rAF = Math.pow(viewingConditions.fl * Math.abs(rD) / 100, 0.42);
    const gAF = Math.pow(viewingConditions.fl * Math.abs(gD) / 100, 0.42);
    const bAF = Math.pow(viewingConditions.fl * Math.abs(bD) / 100, 0.42);
    const rA = signum(rD) * 400 * rAF / (rAF + 27.13);
    const gA = signum(gD) * 400 * gAF / (gAF + 27.13);
    const bA = signum(bD) * 400 * bAF / (bAF + 27.13);
    const a3 = (11 * rA + -12 * gA + bA) / 11;
    const b5 = (rA + gA - 2 * bA) / 9;
    const u3 = (20 * rA + 20 * gA + 21 * bA) / 20;
    const p22 = (40 * rA + 20 * gA + bA) / 20;
    const atan2 = Math.atan2(b5, a3);
    const atanDegrees = atan2 * 180 / Math.PI;
    const hue = atanDegrees < 0 ? atanDegrees + 360 : atanDegrees >= 360 ? atanDegrees - 360 : atanDegrees;
    const hueRadians = hue * Math.PI / 180;
    const ac = p22 * viewingConditions.nbb;
    const j = 100 * Math.pow(ac / viewingConditions.aw, viewingConditions.c * viewingConditions.z);
    const q = 4 / viewingConditions.c * Math.sqrt(j / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;
    const huePrime = hue < 20.14 ? hue + 360 : hue;
    const eHue = 0.25 * (Math.cos(huePrime * Math.PI / 180 + 2) + 3.8);
    const p1 = 5e4 / 13 * eHue * viewingConditions.nc * viewingConditions.ncb;
    const t5 = p1 * Math.sqrt(a3 * a3 + b5 * b5) / (u3 + 0.305);
    const alpha = Math.pow(t5, 0.9) * Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
    const c4 = alpha * Math.sqrt(j / 100);
    const m2 = c4 * viewingConditions.fLRoot;
    const s4 = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));
    const jstar = (1 + 100 * 7e-3) * j / (1 + 7e-3 * j);
    const mstar = 1 / 0.0228 * Math.log(1 + 0.0228 * m2);
    const astar = mstar * Math.cos(hueRadians);
    const bstar = mstar * Math.sin(hueRadians);
    return new _Cam16(hue, c4, j, q, m2, s4, jstar, astar, bstar);
  }
  /**
   * @param j CAM16 lightness
   * @param c CAM16 chroma
   * @param h CAM16 hue
   */
  static fromJch(j, c4, h3) {
    return _Cam16.fromJchInViewingConditions(j, c4, h3, ViewingConditions.DEFAULT);
  }
  /**
   * @param j CAM16 lightness
   * @param c CAM16 chroma
   * @param h CAM16 hue
   * @param viewingConditions Information about the environment where the color
   *     was observed.
   */
  static fromJchInViewingConditions(j, c4, h3, viewingConditions) {
    const q = 4 / viewingConditions.c * Math.sqrt(j / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;
    const m2 = c4 * viewingConditions.fLRoot;
    const alpha = c4 / Math.sqrt(j / 100);
    const s4 = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));
    const hueRadians = h3 * Math.PI / 180;
    const jstar = (1 + 100 * 7e-3) * j / (1 + 7e-3 * j);
    const mstar = 1 / 0.0228 * Math.log(1 + 0.0228 * m2);
    const astar = mstar * Math.cos(hueRadians);
    const bstar = mstar * Math.sin(hueRadians);
    return new _Cam16(h3, c4, j, q, m2, s4, jstar, astar, bstar);
  }
  /**
   * @param jstar CAM16-UCS lightness.
   * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
   *     coordinate on the Y axis.
   * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
   *     coordinate on the X axis.
   */
  static fromUcs(jstar, astar, bstar) {
    return _Cam16.fromUcsInViewingConditions(jstar, astar, bstar, ViewingConditions.DEFAULT);
  }
  /**
   * @param jstar CAM16-UCS lightness.
   * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
   *     coordinate on the Y axis.
   * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
   *     coordinate on the X axis.
   * @param viewingConditions Information about the environment where the color
   *     was observed.
   */
  static fromUcsInViewingConditions(jstar, astar, bstar, viewingConditions) {
    const a3 = astar;
    const b5 = bstar;
    const m2 = Math.sqrt(a3 * a3 + b5 * b5);
    const M2 = (Math.exp(m2 * 0.0228) - 1) / 0.0228;
    const c4 = M2 / viewingConditions.fLRoot;
    let h3 = Math.atan2(b5, a3) * (180 / Math.PI);
    if (h3 < 0) {
      h3 += 360;
    }
    const j = jstar / (1 - (jstar - 100) * 7e-3);
    return _Cam16.fromJchInViewingConditions(j, c4, h3, viewingConditions);
  }
  /**
   *  @return ARGB representation of color, assuming the color was viewed in
   *     default viewing conditions, which are near-identical to the default
   *     viewing conditions for sRGB.
   */
  toInt() {
    return this.viewed(ViewingConditions.DEFAULT);
  }
  /**
   * @param viewingConditions Information about the environment where the color
   *     will be viewed.
   * @return ARGB representation of color
   */
  viewed(viewingConditions) {
    const alpha = this.chroma === 0 || this.j === 0 ? 0 : this.chroma / Math.sqrt(this.j / 100);
    const t5 = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73), 1 / 0.9);
    const hRad = this.hue * Math.PI / 180;
    const eHue = 0.25 * (Math.cos(hRad + 2) + 3.8);
    const ac = viewingConditions.aw * Math.pow(this.j / 100, 1 / viewingConditions.c / viewingConditions.z);
    const p1 = eHue * (5e4 / 13) * viewingConditions.nc * viewingConditions.ncb;
    const p22 = ac / viewingConditions.nbb;
    const hSin = Math.sin(hRad);
    const hCos = Math.cos(hRad);
    const gamma = 23 * (p22 + 0.305) * t5 / (23 * p1 + 11 * t5 * hCos + 108 * t5 * hSin);
    const a3 = gamma * hCos;
    const b5 = gamma * hSin;
    const rA = (460 * p22 + 451 * a3 + 288 * b5) / 1403;
    const gA = (460 * p22 - 891 * a3 - 261 * b5) / 1403;
    const bA = (460 * p22 - 220 * a3 - 6300 * b5) / 1403;
    const rCBase = Math.max(0, 27.13 * Math.abs(rA) / (400 - Math.abs(rA)));
    const rC = signum(rA) * (100 / viewingConditions.fl) * Math.pow(rCBase, 1 / 0.42);
    const gCBase = Math.max(0, 27.13 * Math.abs(gA) / (400 - Math.abs(gA)));
    const gC = signum(gA) * (100 / viewingConditions.fl) * Math.pow(gCBase, 1 / 0.42);
    const bCBase = Math.max(0, 27.13 * Math.abs(bA) / (400 - Math.abs(bA)));
    const bC = signum(bA) * (100 / viewingConditions.fl) * Math.pow(bCBase, 1 / 0.42);
    const rF = rC / viewingConditions.rgbD[0];
    const gF = gC / viewingConditions.rgbD[1];
    const bF = bC / viewingConditions.rgbD[2];
    const x3 = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
    const y3 = 0.38752654 * rF + 0.62144744 * gF - 897398e-8 * bF;
    const z2 = -0.0158415 * rF - 0.03412294 * gF + 1.04996444 * bF;
    const argb = argbFromXyz(x3, y3, z2);
    return argb;
  }
  /// Given color expressed in XYZ and viewed in [viewingConditions], convert to
  /// CAM16.
  static fromXyzInViewingConditions(x3, y3, z2, viewingConditions) {
    const rC = 0.401288 * x3 + 0.650173 * y3 - 0.051461 * z2;
    const gC = -0.250268 * x3 + 1.204414 * y3 + 0.045854 * z2;
    const bC = -2079e-6 * x3 + 0.048952 * y3 + 0.953127 * z2;
    const rD = viewingConditions.rgbD[0] * rC;
    const gD = viewingConditions.rgbD[1] * gC;
    const bD = viewingConditions.rgbD[2] * bC;
    const rAF = Math.pow(viewingConditions.fl * Math.abs(rD) / 100, 0.42);
    const gAF = Math.pow(viewingConditions.fl * Math.abs(gD) / 100, 0.42);
    const bAF = Math.pow(viewingConditions.fl * Math.abs(bD) / 100, 0.42);
    const rA = signum(rD) * 400 * rAF / (rAF + 27.13);
    const gA = signum(gD) * 400 * gAF / (gAF + 27.13);
    const bA = signum(bD) * 400 * bAF / (bAF + 27.13);
    const a3 = (11 * rA + -12 * gA + bA) / 11;
    const b5 = (rA + gA - 2 * bA) / 9;
    const u3 = (20 * rA + 20 * gA + 21 * bA) / 20;
    const p22 = (40 * rA + 20 * gA + bA) / 20;
    const atan2 = Math.atan2(b5, a3);
    const atanDegrees = atan2 * 180 / Math.PI;
    const hue = atanDegrees < 0 ? atanDegrees + 360 : atanDegrees >= 360 ? atanDegrees - 360 : atanDegrees;
    const hueRadians = hue * Math.PI / 180;
    const ac = p22 * viewingConditions.nbb;
    const J = 100 * Math.pow(ac / viewingConditions.aw, viewingConditions.c * viewingConditions.z);
    const Q = 4 / viewingConditions.c * Math.sqrt(J / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;
    const huePrime = hue < 20.14 ? hue + 360 : hue;
    const eHue = 1 / 4 * (Math.cos(huePrime * Math.PI / 180 + 2) + 3.8);
    const p1 = 5e4 / 13 * eHue * viewingConditions.nc * viewingConditions.ncb;
    const t5 = p1 * Math.sqrt(a3 * a3 + b5 * b5) / (u3 + 0.305);
    const alpha = Math.pow(t5, 0.9) * Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
    const C2 = alpha * Math.sqrt(J / 100);
    const M2 = C2 * viewingConditions.fLRoot;
    const s4 = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));
    const jstar = (1 + 100 * 7e-3) * J / (1 + 7e-3 * J);
    const mstar = Math.log(1 + 0.0228 * M2) / 0.0228;
    const astar = mstar * Math.cos(hueRadians);
    const bstar = mstar * Math.sin(hueRadians);
    return new _Cam16(hue, C2, J, Q, M2, s4, jstar, astar, bstar);
  }
  /// XYZ representation of CAM16 seen in [viewingConditions].
  xyzInViewingConditions(viewingConditions) {
    const alpha = this.chroma === 0 || this.j === 0 ? 0 : this.chroma / Math.sqrt(this.j / 100);
    const t5 = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73), 1 / 0.9);
    const hRad = this.hue * Math.PI / 180;
    const eHue = 0.25 * (Math.cos(hRad + 2) + 3.8);
    const ac = viewingConditions.aw * Math.pow(this.j / 100, 1 / viewingConditions.c / viewingConditions.z);
    const p1 = eHue * (5e4 / 13) * viewingConditions.nc * viewingConditions.ncb;
    const p22 = ac / viewingConditions.nbb;
    const hSin = Math.sin(hRad);
    const hCos = Math.cos(hRad);
    const gamma = 23 * (p22 + 0.305) * t5 / (23 * p1 + 11 * t5 * hCos + 108 * t5 * hSin);
    const a3 = gamma * hCos;
    const b5 = gamma * hSin;
    const rA = (460 * p22 + 451 * a3 + 288 * b5) / 1403;
    const gA = (460 * p22 - 891 * a3 - 261 * b5) / 1403;
    const bA = (460 * p22 - 220 * a3 - 6300 * b5) / 1403;
    const rCBase = Math.max(0, 27.13 * Math.abs(rA) / (400 - Math.abs(rA)));
    const rC = signum(rA) * (100 / viewingConditions.fl) * Math.pow(rCBase, 1 / 0.42);
    const gCBase = Math.max(0, 27.13 * Math.abs(gA) / (400 - Math.abs(gA)));
    const gC = signum(gA) * (100 / viewingConditions.fl) * Math.pow(gCBase, 1 / 0.42);
    const bCBase = Math.max(0, 27.13 * Math.abs(bA) / (400 - Math.abs(bA)));
    const bC = signum(bA) * (100 / viewingConditions.fl) * Math.pow(bCBase, 1 / 0.42);
    const rF = rC / viewingConditions.rgbD[0];
    const gF = gC / viewingConditions.rgbD[1];
    const bF = bC / viewingConditions.rgbD[2];
    const x3 = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
    const y3 = 0.38752654 * rF + 0.62144744 * gF - 897398e-8 * bF;
    const z2 = -0.0158415 * rF - 0.03412294 * gF + 1.04996444 * bF;
    return [x3, y3, z2];
  }
};

// ../../node_modules/@material/material-color-utilities/hct/hct_solver.js
var HctSolver = class _HctSolver {
  /**
   * Sanitizes a small enough angle in radians.
   *
   * @param angle An angle in radians; must not deviate too much
   * from 0.
   * @return A coterminal angle between 0 and 2pi.
   */
  static sanitizeRadians(angle) {
    return (angle + Math.PI * 8) % (Math.PI * 2);
  }
  /**
   * Delinearizes an RGB component, returning a floating-point
   * number.
   *
   * @param rgbComponent 0.0 <= rgb_component <= 100.0, represents
   * linear R/G/B channel
   * @return 0.0 <= output <= 255.0, color channel converted to
   * regular RGB space
   */
  static trueDelinearized(rgbComponent) {
    const normalized = rgbComponent / 100;
    let delinearized2 = 0;
    if (normalized <= 31308e-7) {
      delinearized2 = normalized * 12.92;
    } else {
      delinearized2 = 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
    }
    return delinearized2 * 255;
  }
  static chromaticAdaptation(component) {
    const af = Math.pow(Math.abs(component), 0.42);
    return signum(component) * 400 * af / (af + 27.13);
  }
  /**
   * Returns the hue of a linear RGB color in CAM16.
   *
   * @param linrgb The linear RGB coordinates of a color.
   * @return The hue of the color in CAM16, in radians.
   */
  static hueOf(linrgb) {
    const scaledDiscount = matrixMultiply(linrgb, _HctSolver.SCALED_DISCOUNT_FROM_LINRGB);
    const rA = _HctSolver.chromaticAdaptation(scaledDiscount[0]);
    const gA = _HctSolver.chromaticAdaptation(scaledDiscount[1]);
    const bA = _HctSolver.chromaticAdaptation(scaledDiscount[2]);
    const a3 = (11 * rA + -12 * gA + bA) / 11;
    const b5 = (rA + gA - 2 * bA) / 9;
    return Math.atan2(b5, a3);
  }
  static areInCyclicOrder(a3, b5, c4) {
    const deltaAB = _HctSolver.sanitizeRadians(b5 - a3);
    const deltaAC = _HctSolver.sanitizeRadians(c4 - a3);
    return deltaAB < deltaAC;
  }
  /**
   * Solves the lerp equation.
   *
   * @param source The starting number.
   * @param mid The number in the middle.
   * @param target The ending number.
   * @return A number t such that lerp(source, target, t) = mid.
   */
  static intercept(source, mid, target) {
    return (mid - source) / (target - source);
  }
  static lerpPoint(source, t5, target) {
    return [
      source[0] + (target[0] - source[0]) * t5,
      source[1] + (target[1] - source[1]) * t5,
      source[2] + (target[2] - source[2]) * t5
    ];
  }
  /**
   * Intersects a segment with a plane.
   *
   * @param source The coordinates of point A.
   * @param coordinate The R-, G-, or B-coordinate of the plane.
   * @param target The coordinates of point B.
   * @param axis The axis the plane is perpendicular with. (0: R, 1:
   * G, 2: B)
   * @return The intersection point of the segment AB with the plane
   * R=coordinate, G=coordinate, or B=coordinate
   */
  static setCoordinate(source, coordinate, target, axis) {
    const t5 = _HctSolver.intercept(source[axis], coordinate, target[axis]);
    return _HctSolver.lerpPoint(source, t5, target);
  }
  static isBounded(x3) {
    return 0 <= x3 && x3 <= 100;
  }
  /**
   * Returns the nth possible vertex of the polygonal intersection.
   *
   * @param y The Y value of the plane.
   * @param n The zero-based index of the point. 0 <= n <= 11.
   * @return The nth possible vertex of the polygonal intersection
   * of the y plane and the RGB cube, in linear RGB coordinates, if
   * it exists. If this possible vertex lies outside of the cube,
   * [-1.0, -1.0, -1.0] is returned.
   */
  static nthVertex(y3, n5) {
    const kR = _HctSolver.Y_FROM_LINRGB[0];
    const kG = _HctSolver.Y_FROM_LINRGB[1];
    const kB = _HctSolver.Y_FROM_LINRGB[2];
    const coordA = n5 % 4 <= 1 ? 0 : 100;
    const coordB = n5 % 2 === 0 ? 0 : 100;
    if (n5 < 4) {
      const g2 = coordA;
      const b5 = coordB;
      const r6 = (y3 - g2 * kG - b5 * kB) / kR;
      if (_HctSolver.isBounded(r6)) {
        return [r6, g2, b5];
      } else {
        return [-1, -1, -1];
      }
    } else if (n5 < 8) {
      const b5 = coordA;
      const r6 = coordB;
      const g2 = (y3 - r6 * kR - b5 * kB) / kG;
      if (_HctSolver.isBounded(g2)) {
        return [r6, g2, b5];
      } else {
        return [-1, -1, -1];
      }
    } else {
      const r6 = coordA;
      const g2 = coordB;
      const b5 = (y3 - r6 * kR - g2 * kG) / kB;
      if (_HctSolver.isBounded(b5)) {
        return [r6, g2, b5];
      } else {
        return [-1, -1, -1];
      }
    }
  }
  /**
   * Finds the segment containing the desired color.
   *
   * @param y The Y value of the color.
   * @param targetHue The hue of the color.
   * @return A list of two sets of linear RGB coordinates, each
   * corresponding to an endpoint of the segment containing the
   * desired color.
   */
  static bisectToSegment(y3, targetHue) {
    let left = [-1, -1, -1];
    let right = left;
    let leftHue = 0;
    let rightHue = 0;
    let initialized = false;
    let uncut = true;
    for (let n5 = 0; n5 < 12; n5++) {
      const mid = _HctSolver.nthVertex(y3, n5);
      if (mid[0] < 0) {
        continue;
      }
      const midHue = _HctSolver.hueOf(mid);
      if (!initialized) {
        left = mid;
        right = mid;
        leftHue = midHue;
        rightHue = midHue;
        initialized = true;
        continue;
      }
      if (uncut || _HctSolver.areInCyclicOrder(leftHue, midHue, rightHue)) {
        uncut = false;
        if (_HctSolver.areInCyclicOrder(leftHue, targetHue, midHue)) {
          right = mid;
          rightHue = midHue;
        } else {
          left = mid;
          leftHue = midHue;
        }
      }
    }
    return [left, right];
  }
  static midpoint(a3, b5) {
    return [
      (a3[0] + b5[0]) / 2,
      (a3[1] + b5[1]) / 2,
      (a3[2] + b5[2]) / 2
    ];
  }
  static criticalPlaneBelow(x3) {
    return Math.floor(x3 - 0.5);
  }
  static criticalPlaneAbove(x3) {
    return Math.ceil(x3 - 0.5);
  }
  /**
   * Finds a color with the given Y and hue on the boundary of the
   * cube.
   *
   * @param y The Y value of the color.
   * @param targetHue The hue of the color.
   * @return The desired color, in linear RGB coordinates.
   */
  static bisectToLimit(y3, targetHue) {
    const segment = _HctSolver.bisectToSegment(y3, targetHue);
    let left = segment[0];
    let leftHue = _HctSolver.hueOf(left);
    let right = segment[1];
    for (let axis = 0; axis < 3; axis++) {
      if (left[axis] !== right[axis]) {
        let lPlane = -1;
        let rPlane = 255;
        if (left[axis] < right[axis]) {
          lPlane = _HctSolver.criticalPlaneBelow(_HctSolver.trueDelinearized(left[axis]));
          rPlane = _HctSolver.criticalPlaneAbove(_HctSolver.trueDelinearized(right[axis]));
        } else {
          lPlane = _HctSolver.criticalPlaneAbove(_HctSolver.trueDelinearized(left[axis]));
          rPlane = _HctSolver.criticalPlaneBelow(_HctSolver.trueDelinearized(right[axis]));
        }
        for (let i7 = 0; i7 < 8; i7++) {
          if (Math.abs(rPlane - lPlane) <= 1) {
            break;
          } else {
            const mPlane = Math.floor((lPlane + rPlane) / 2);
            const midPlaneCoordinate = _HctSolver.CRITICAL_PLANES[mPlane];
            const mid = _HctSolver.setCoordinate(left, midPlaneCoordinate, right, axis);
            const midHue = _HctSolver.hueOf(mid);
            if (_HctSolver.areInCyclicOrder(leftHue, targetHue, midHue)) {
              right = mid;
              rPlane = mPlane;
            } else {
              left = mid;
              leftHue = midHue;
              lPlane = mPlane;
            }
          }
        }
      }
    }
    return _HctSolver.midpoint(left, right);
  }
  static inverseChromaticAdaptation(adapted) {
    const adaptedAbs = Math.abs(adapted);
    const base = Math.max(0, 27.13 * adaptedAbs / (400 - adaptedAbs));
    return signum(adapted) * Math.pow(base, 1 / 0.42);
  }
  /**
   * Finds a color with the given hue, chroma, and Y.
   *
   * @param hueRadians The desired hue in radians.
   * @param chroma The desired chroma.
   * @param y The desired Y.
   * @return The desired color as a hexadecimal integer, if found; 0
   * otherwise.
   */
  static findResultByJ(hueRadians, chroma, y3) {
    let j = Math.sqrt(y3) * 11;
    const viewingConditions = ViewingConditions.DEFAULT;
    const tInnerCoeff = 1 / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
    const eHue = 0.25 * (Math.cos(hueRadians + 2) + 3.8);
    const p1 = eHue * (5e4 / 13) * viewingConditions.nc * viewingConditions.ncb;
    const hSin = Math.sin(hueRadians);
    const hCos = Math.cos(hueRadians);
    for (let iterationRound = 0; iterationRound < 5; iterationRound++) {
      const jNormalized = j / 100;
      const alpha = chroma === 0 || j === 0 ? 0 : chroma / Math.sqrt(jNormalized);
      const t5 = Math.pow(alpha * tInnerCoeff, 1 / 0.9);
      const ac = viewingConditions.aw * Math.pow(jNormalized, 1 / viewingConditions.c / viewingConditions.z);
      const p22 = ac / viewingConditions.nbb;
      const gamma = 23 * (p22 + 0.305) * t5 / (23 * p1 + 11 * t5 * hCos + 108 * t5 * hSin);
      const a3 = gamma * hCos;
      const b5 = gamma * hSin;
      const rA = (460 * p22 + 451 * a3 + 288 * b5) / 1403;
      const gA = (460 * p22 - 891 * a3 - 261 * b5) / 1403;
      const bA = (460 * p22 - 220 * a3 - 6300 * b5) / 1403;
      const rCScaled = _HctSolver.inverseChromaticAdaptation(rA);
      const gCScaled = _HctSolver.inverseChromaticAdaptation(gA);
      const bCScaled = _HctSolver.inverseChromaticAdaptation(bA);
      const linrgb = matrixMultiply([rCScaled, gCScaled, bCScaled], _HctSolver.LINRGB_FROM_SCALED_DISCOUNT);
      if (linrgb[0] < 0 || linrgb[1] < 0 || linrgb[2] < 0) {
        return 0;
      }
      const kR = _HctSolver.Y_FROM_LINRGB[0];
      const kG = _HctSolver.Y_FROM_LINRGB[1];
      const kB = _HctSolver.Y_FROM_LINRGB[2];
      const fnj = kR * linrgb[0] + kG * linrgb[1] + kB * linrgb[2];
      if (fnj <= 0) {
        return 0;
      }
      if (iterationRound === 4 || Math.abs(fnj - y3) < 2e-3) {
        if (linrgb[0] > 100.01 || linrgb[1] > 100.01 || linrgb[2] > 100.01) {
          return 0;
        }
        return argbFromLinrgb(linrgb);
      }
      j = j - (fnj - y3) * j / (2 * fnj);
    }
    return 0;
  }
  /**
   * Finds an sRGB color with the given hue, chroma, and L*, if
   * possible.
   *
   * @param hueDegrees The desired hue, in degrees.
   * @param chroma The desired chroma.
   * @param lstar The desired L*.
   * @return A hexadecimal representing the sRGB color. The color
   * has sufficiently close hue, chroma, and L* to the desired
   * values, if possible; otherwise, the hue and L* will be
   * sufficiently close, and chroma will be maximized.
   */
  static solveToInt(hueDegrees, chroma, lstar) {
    if (chroma < 1e-4 || lstar < 1e-4 || lstar > 99.9999) {
      return argbFromLstar(lstar);
    }
    hueDegrees = sanitizeDegreesDouble(hueDegrees);
    const hueRadians = hueDegrees / 180 * Math.PI;
    const y3 = yFromLstar(lstar);
    const exactAnswer = _HctSolver.findResultByJ(hueRadians, chroma, y3);
    if (exactAnswer !== 0) {
      return exactAnswer;
    }
    const linrgb = _HctSolver.bisectToLimit(y3, hueRadians);
    return argbFromLinrgb(linrgb);
  }
  /**
   * Finds an sRGB color with the given hue, chroma, and L*, if
   * possible.
   *
   * @param hueDegrees The desired hue, in degrees.
   * @param chroma The desired chroma.
   * @param lstar The desired L*.
   * @return An CAM16 object representing the sRGB color. The color
   * has sufficiently close hue, chroma, and L* to the desired
   * values, if possible; otherwise, the hue and L* will be
   * sufficiently close, and chroma will be maximized.
   */
  static solveToCam(hueDegrees, chroma, lstar) {
    return Cam16.fromInt(_HctSolver.solveToInt(hueDegrees, chroma, lstar));
  }
};
HctSolver.SCALED_DISCOUNT_FROM_LINRGB = [
  [
    0.001200833568784504,
    0.002389694492170889,
    2795742885861124e-19
  ],
  [
    5891086651375999e-19,
    0.0029785502573438758,
    3270666104008398e-19
  ],
  [
    10146692491640572e-20,
    5364214359186694e-19,
    0.0032979401770712076
  ]
];
HctSolver.LINRGB_FROM_SCALED_DISCOUNT = [
  [
    1373.2198709594231,
    -1100.4251190754821,
    -7.278681089101213
  ],
  [
    -271.815969077903,
    559.6580465940733,
    -32.46047482791194
  ],
  [
    1.9622899599665666,
    -57.173814538844006,
    308.7233197812385
  ]
];
HctSolver.Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722];
HctSolver.CRITICAL_PLANES = [
  0.015176349177441876,
  0.045529047532325624,
  0.07588174588720938,
  0.10623444424209313,
  0.13658714259697685,
  0.16693984095186062,
  0.19729253930674434,
  0.2276452376616281,
  0.2579979360165119,
  0.28835063437139563,
  0.3188300904430532,
  0.350925934958123,
  0.3848314933096426,
  0.42057480301049466,
  0.458183274052838,
  0.4976837250274023,
  0.5391024159806381,
  0.5824650784040898,
  0.6277969426914107,
  0.6751227633498623,
  0.7244668422128921,
  0.775853049866786,
  0.829304845476233,
  0.8848452951698498,
  0.942497089126609,
  1.0022825574869039,
  1.0642236851973577,
  1.1283421258858297,
  1.1946592148522128,
  1.2631959812511864,
  1.3339731595349034,
  1.407011200216447,
  1.4823302800086415,
  1.5599503113873272,
  1.6398909516233677,
  1.7221716113234105,
  1.8068114625156377,
  1.8938294463134073,
  1.9832442801866852,
  2.075074464868551,
  2.1693382909216234,
  2.2660538449872063,
  2.36523901573795,
  2.4669114995532007,
  2.5710888059345764,
  2.6777882626779785,
  2.7870270208169257,
  2.898822059350997,
  3.0131901897720907,
  3.1301480604002863,
  3.2497121605402226,
  3.3718988244681087,
  3.4967242352587946,
  3.624204428461639,
  3.754355295633311,
  3.887192587735158,
  4.022731918402185,
  4.160988767090289,
  4.301978482107941,
  4.445716283538092,
  4.592217266055746,
  4.741496401646282,
  4.893568542229298,
  5.048448422192488,
  5.20615066083972,
  5.3666897647573375,
  5.5300801301023865,
  5.696336044816294,
  5.865471690767354,
  6.037501145825082,
  6.212438385869475,
  6.390297286737924,
  6.571091626112461,
  6.7548350853498045,
  6.941541251256611,
  7.131223617812143,
  7.323895587840543,
  7.5195704746346665,
  7.7182615035334345,
  7.919981813454504,
  8.124744458384042,
  8.332562408825165,
  8.543448553206703,
  8.757415699253682,
  8.974476575321063,
  9.194643831691977,
  9.417930041841839,
  9.644347703669503,
  9.873909240696694,
  10.106627003236781,
  10.342513269534024,
  10.58158024687427,
  10.8238400726681,
  11.069304815507364,
  11.317986476196008,
  11.569896988756009,
  11.825048221409341,
  12.083451977536606,
  12.345119996613247,
  12.610063955123938,
  12.878295467455942,
  13.149826086772048,
  13.42466730586372,
  13.702830557985108,
  13.984327217668513,
  14.269168601521828,
  14.55736596900856,
  14.848930523210871,
  15.143873411576273,
  15.44220572664832,
  15.743938506781891,
  16.04908273684337,
  16.35764934889634,
  16.66964922287304,
  16.985093187232053,
  17.30399201960269,
  17.62635644741625,
  17.95219714852476,
  18.281524751807332,
  18.614349837764564,
  18.95068293910138,
  19.290534541298456,
  19.633915083172692,
  19.98083495742689,
  20.331304511189067,
  20.685334046541502,
  21.042933821039977,
  21.404114048223256,
  21.76888489811322,
  22.137256497705877,
  22.50923893145328,
  22.884842241736916,
  23.264076429332462,
  23.6469514538663,
  24.033477234264016,
  24.42366364919083,
  24.817520537484558,
  25.21505769858089,
  25.61628489293138,
  26.021211842414342,
  26.429848230738664,
  26.842203703840827,
  27.258287870275353,
  27.678110301598522,
  28.10168053274597,
  28.529008062403893,
  28.96010235337422,
  29.39497283293396,
  29.83362889318845,
  30.276079891419332,
  30.722335150426627,
  31.172403958865512,
  31.62629557157785,
  32.08401920991837,
  32.54558406207592,
  33.010999283389665,
  33.4802739966603,
  33.953417292456834,
  34.430438229418264,
  34.911345834551085,
  35.39614910352207,
  35.88485700094671,
  36.37747846067349,
  36.87402238606382,
  37.37449765026789,
  37.87891309649659,
  38.38727753828926,
  38.89959975977785,
  39.41588851594697,
  39.93615253289054,
  40.460400508064545,
  40.98864111053629,
  41.520882981230194,
  42.05713473317016,
  42.597404951718396,
  43.141702194811224,
  43.6900349931913,
  44.24241185063697,
  44.798841244188324,
  45.35933162437017,
  45.92389141541209,
  46.49252901546552,
  47.065252796817916,
  47.64207110610409,
  48.22299226451468,
  48.808024568002054,
  49.3971762874833,
  49.9904556690408,
  50.587870934119984,
  51.189430279724725,
  51.79514187861014,
  52.40501387947288,
  53.0190544071392,
  53.637271562750364,
  54.259673423945976,
  54.88626804504493,
  55.517063457223934,
  56.15206766869424,
  56.79128866487574,
  57.43473440856916,
  58.08241284012621,
  58.734331877617365,
  59.39049941699807,
  60.05092333227251,
  60.715611475655585,
  61.38457167773311,
  62.057811747619894,
  62.7353394731159,
  63.417162620860914,
  64.10328893648692,
  64.79372614476921,
  65.48848194977529,
  66.18756403501224,
  66.89098006357258,
  67.59873767827808,
  68.31084450182222,
  69.02730813691093,
  69.74813616640164,
  70.47333615344107,
  71.20291564160104,
  71.93688215501312,
  72.67524319850172,
  73.41800625771542,
  74.16517879925733,
  74.9167682708136,
  75.67278210128072,
  76.43322770089146,
  77.1981124613393,
  77.96744375590167,
  78.74122893956174,
  79.51947534912904,
  80.30219030335869,
  81.08938110306934,
  81.88105503125999,
  82.67721935322541,
  83.4778813166706,
  84.28304815182372,
  85.09272707154808,
  85.90692527145302,
  86.72564993000343,
  87.54890820862819,
  88.3767072518277,
  89.2090541872801,
  90.04595612594655,
  90.88742016217518,
  91.73345337380438,
  92.58406282226491,
  93.43925555268066,
  94.29903859396902,
  95.16341895893969,
  96.03240364439274,
  96.9059996312159,
  97.78421388448044,
  98.6670533535366,
  99.55452497210776
];

// ../../node_modules/@material/material-color-utilities/hct/hct.js
var Hct = class _Hct {
  static from(hue, chroma, tone) {
    return new _Hct(HctSolver.solveToInt(hue, chroma, tone));
  }
  /**
   * @param argb ARGB representation of a color.
   * @return HCT representation of a color in default viewing conditions
   */
  static fromInt(argb) {
    return new _Hct(argb);
  }
  toInt() {
    return this.argb;
  }
  /**
   * A number, in degrees, representing ex. red, orange, yellow, etc.
   * Ranges from 0 <= hue < 360.
   */
  get hue() {
    return this.internalHue;
  }
  /**
   * @param newHue 0 <= newHue < 360; invalid values are corrected.
   * Chroma may decrease because chroma has a different maximum for any given
   * hue and tone.
   */
  set hue(newHue) {
    this.setInternalState(HctSolver.solveToInt(newHue, this.internalChroma, this.internalTone));
  }
  get chroma() {
    return this.internalChroma;
  }
  /**
   * @param newChroma 0 <= newChroma < ?
   * Chroma may decrease because chroma has a different maximum for any given
   * hue and tone.
   */
  set chroma(newChroma) {
    this.setInternalState(HctSolver.solveToInt(this.internalHue, newChroma, this.internalTone));
  }
  /** Lightness. Ranges from 0 to 100. */
  get tone() {
    return this.internalTone;
  }
  /**
   * @param newTone 0 <= newTone <= 100; invalid valids are corrected.
   * Chroma may decrease because chroma has a different maximum for any given
   * hue and tone.
   */
  set tone(newTone) {
    this.setInternalState(HctSolver.solveToInt(this.internalHue, this.internalChroma, newTone));
  }
  constructor(argb) {
    this.argb = argb;
    const cam = Cam16.fromInt(argb);
    this.internalHue = cam.hue;
    this.internalChroma = cam.chroma;
    this.internalTone = lstarFromArgb(argb);
    this.argb = argb;
  }
  setInternalState(argb) {
    const cam = Cam16.fromInt(argb);
    this.internalHue = cam.hue;
    this.internalChroma = cam.chroma;
    this.internalTone = lstarFromArgb(argb);
    this.argb = argb;
  }
  /**
   * Translates a color into different [ViewingConditions].
   *
   * Colors change appearance. They look different with lights on versus off,
   * the same color, as in hex code, on white looks different when on black.
   * This is called color relativity, most famously explicated by Josef Albers
   * in Interaction of Color.
   *
   * In color science, color appearance models can account for this and
   * calculate the appearance of a color in different settings. HCT is based on
   * CAM16, a color appearance model, and uses it to make these calculations.
   *
   * See [ViewingConditions.make] for parameters affecting color appearance.
   */
  inViewingConditions(vc) {
    const cam = Cam16.fromInt(this.toInt());
    const viewedInVc = cam.xyzInViewingConditions(vc);
    const recastInVc = Cam16.fromXyzInViewingConditions(viewedInVc[0], viewedInVc[1], viewedInVc[2], ViewingConditions.make());
    const recastHct = _Hct.from(recastInVc.hue, recastInVc.chroma, lstarFromY(viewedInVc[1]));
    return recastHct;
  }
};

// ../../node_modules/@material/material-color-utilities/contrast/contrast.js
var Contrast = class _Contrast {
  /**
   * Returns a contrast ratio, which ranges from 1 to 21.
   *
   * @param toneA Tone between 0 and 100. Values outside will be clamped.
   * @param toneB Tone between 0 and 100. Values outside will be clamped.
   */
  static ratioOfTones(toneA, toneB) {
    toneA = clampDouble(0, 100, toneA);
    toneB = clampDouble(0, 100, toneB);
    return _Contrast.ratioOfYs(yFromLstar(toneA), yFromLstar(toneB));
  }
  static ratioOfYs(y1, y22) {
    const lighter = y1 > y22 ? y1 : y22;
    const darker = lighter === y22 ? y1 : y22;
    return (lighter + 5) / (darker + 5);
  }
  /**
   * Returns a tone >= tone parameter that ensures ratio parameter.
   * Return value is between 0 and 100.
   * Returns -1 if ratio cannot be achieved with tone parameter.
   *
   * @param tone Tone return value must contrast with.
   * Range is 0 to 100. Invalid values will result in -1 being returned.
   * @param ratio Contrast ratio of return value and tone.
   * Range is 1 to 21, invalid values have undefined behavior.
   */
  static lighter(tone, ratio) {
    if (tone < 0 || tone > 100) {
      return -1;
    }
    const darkY = yFromLstar(tone);
    const lightY = ratio * (darkY + 5) - 5;
    const realContrast = _Contrast.ratioOfYs(lightY, darkY);
    const delta = Math.abs(realContrast - ratio);
    if (realContrast < ratio && delta > 0.04) {
      return -1;
    }
    const returnValue = lstarFromY(lightY) + 0.4;
    if (returnValue < 0 || returnValue > 100) {
      return -1;
    }
    return returnValue;
  }
  /**
   * Returns a tone <= tone parameter that ensures ratio parameter.
   * Return value is between 0 and 100.
   * Returns -1 if ratio cannot be achieved with tone parameter.
   *
   * @param tone Tone return value must contrast with.
   * Range is 0 to 100. Invalid values will result in -1 being returned.
   * @param ratio Contrast ratio of return value and tone.
   * Range is 1 to 21, invalid values have undefined behavior.
   */
  static darker(tone, ratio) {
    if (tone < 0 || tone > 100) {
      return -1;
    }
    const lightY = yFromLstar(tone);
    const darkY = (lightY + 5) / ratio - 5;
    const realContrast = _Contrast.ratioOfYs(lightY, darkY);
    const delta = Math.abs(realContrast - ratio);
    if (realContrast < ratio && delta > 0.04) {
      return -1;
    }
    const returnValue = lstarFromY(darkY) - 0.4;
    if (returnValue < 0 || returnValue > 100) {
      return -1;
    }
    return returnValue;
  }
  /**
   * Returns a tone >= tone parameter that ensures ratio parameter.
   * Return value is between 0 and 100.
   * Returns 100 if ratio cannot be achieved with tone parameter.
   *
   * This method is unsafe because the returned value is guaranteed to be in
   * bounds for tone, i.e. between 0 and 100. However, that value may not reach
   * the ratio with tone. For example, there is no color lighter than T100.
   *
   * @param tone Tone return value must contrast with.
   * Range is 0 to 100. Invalid values will result in 100 being returned.
   * @param ratio Desired contrast ratio of return value and tone parameter.
   * Range is 1 to 21, invalid values have undefined behavior.
   */
  static lighterUnsafe(tone, ratio) {
    const lighterSafe = _Contrast.lighter(tone, ratio);
    return lighterSafe < 0 ? 100 : lighterSafe;
  }
  /**
   * Returns a tone >= tone parameter that ensures ratio parameter.
   * Return value is between 0 and 100.
   * Returns 100 if ratio cannot be achieved with tone parameter.
   *
   * This method is unsafe because the returned value is guaranteed to be in
   * bounds for tone, i.e. between 0 and 100. However, that value may not reach
   * the [ratio with [tone]. For example, there is no color darker than T0.
   *
   * @param tone Tone return value must contrast with.
   * Range is 0 to 100. Invalid values will result in 0 being returned.
   * @param ratio Desired contrast ratio of return value and tone parameter.
   * Range is 1 to 21, invalid values have undefined behavior.
   */
  static darkerUnsafe(tone, ratio) {
    const darkerSafe = _Contrast.darker(tone, ratio);
    return darkerSafe < 0 ? 0 : darkerSafe;
  }
};

// ../../node_modules/@material/material-color-utilities/dislike/dislike_analyzer.js
var DislikeAnalyzer = class _DislikeAnalyzer {
  /**
   * Returns true if a color is disliked.
   *
   * @param hct A color to be judged.
   * @return Whether the color is disliked.
   *
   * Disliked is defined as a dark yellow-green that is not neutral.
   */
  static isDisliked(hct) {
    const huePasses = Math.round(hct.hue) >= 90 && Math.round(hct.hue) <= 111;
    const chromaPasses = Math.round(hct.chroma) > 16;
    const tonePasses = Math.round(hct.tone) < 65;
    return huePasses && chromaPasses && tonePasses;
  }
  /**
   * If a color is disliked, lighten it to make it likable.
   *
   * @param hct A color to be judged.
   * @return A new color if the original color is disliked, or the original
   *   color if it is acceptable.
   */
  static fixIfDisliked(hct) {
    if (_DislikeAnalyzer.isDisliked(hct)) {
      return Hct.from(hct.hue, hct.chroma, 70);
    }
    return hct;
  }
};

// ../../node_modules/@material/material-color-utilities/dynamiccolor/dynamic_color.js
var DynamicColor = class _DynamicColor {
  /**
   * Create a DynamicColor defined by a TonalPalette and HCT tone.
   *
   * @param args Functions with DynamicScheme as input. Must provide a palette
   * and tone. May provide a background DynamicColor and ToneDeltaConstraint.
   */
  static fromPalette(args) {
    return new _DynamicColor(args.name ?? "", args.palette, args.tone, args.isBackground ?? false, args.background, args.secondBackground, args.contrastCurve, args.toneDeltaPair);
  }
  /**
   * The base constructor for DynamicColor.
   *
   * _Strongly_ prefer using one of the convenience constructors. This class is
   * arguably too flexible to ensure it can support any scenario. Functional
   * arguments allow  overriding without risks that come with subclasses.
   *
   * For example, the default behavior of adjust tone at max contrast
   * to be at a 7.0 ratio with its background is principled and
   * matches accessibility guidance. That does not mean it's the desired
   * approach for _every_ design system, and every color pairing,
   * always, in every case.
   *
   * @param name The name of the dynamic color. Defaults to empty.
   * @param palette Function that provides a TonalPalette given
   * DynamicScheme. A TonalPalette is defined by a hue and chroma, so this
   * replaces the need to specify hue/chroma. By providing a tonal palette, when
   * contrast adjustments are made, intended chroma can be preserved.
   * @param tone Function that provides a tone, given a DynamicScheme.
   * @param isBackground Whether this dynamic color is a background, with
   * some other color as the foreground. Defaults to false.
   * @param background The background of the dynamic color (as a function of a
   *     `DynamicScheme`), if it exists.
   * @param secondBackground A second background of the dynamic color (as a
   *     function of a `DynamicScheme`), if it
   * exists.
   * @param contrastCurve A `ContrastCurve` object specifying how its contrast
   * against its background should behave in various contrast levels options.
   * @param toneDeltaPair A `ToneDeltaPair` object specifying a tone delta
   * constraint between two colors. One of them must be the color being
   * constructed.
   */
  constructor(name, palette, tone, isBackground, background, secondBackground, contrastCurve, toneDeltaPair) {
    this.name = name;
    this.palette = palette;
    this.tone = tone;
    this.isBackground = isBackground;
    this.background = background;
    this.secondBackground = secondBackground;
    this.contrastCurve = contrastCurve;
    this.toneDeltaPair = toneDeltaPair;
    this.hctCache = /* @__PURE__ */ new Map();
    if (!background && secondBackground) {
      throw new Error(`Color ${name} has secondBackgrounddefined, but background is not defined.`);
    }
    if (!background && contrastCurve) {
      throw new Error(`Color ${name} has contrastCurvedefined, but background is not defined.`);
    }
    if (background && !contrastCurve) {
      throw new Error(`Color ${name} has backgrounddefined, but contrastCurve is not defined.`);
    }
  }
  /**
   * Return a ARGB integer (i.e. a hex code).
   *
   * @param scheme Defines the conditions of the user interface, for example,
   * whether or not it is dark mode or light mode, and what the desired
   * contrast level is.
   */
  getArgb(scheme) {
    return this.getHct(scheme).toInt();
  }
  /**
   * Return a color, expressed in the HCT color space, that this
   * DynamicColor is under the conditions in scheme.
   *
   * @param scheme Defines the conditions of the user interface, for example,
   * whether or not it is dark mode or light mode, and what the desired
   * contrast level is.
   */
  getHct(scheme) {
    const cachedAnswer = this.hctCache.get(scheme);
    if (cachedAnswer != null) {
      return cachedAnswer;
    }
    const tone = this.getTone(scheme);
    const answer = this.palette(scheme).getHct(tone);
    if (this.hctCache.size > 4) {
      this.hctCache.clear();
    }
    this.hctCache.set(scheme, answer);
    return answer;
  }
  /**
   * Return a tone, T in the HCT color space, that this DynamicColor is under
   * the conditions in scheme.
   *
   * @param scheme Defines the conditions of the user interface, for example,
   * whether or not it is dark mode or light mode, and what the desired
   * contrast level is.
   */
  getTone(scheme) {
    const decreasingContrast = scheme.contrastLevel < 0;
    if (this.toneDeltaPair) {
      const toneDeltaPair = this.toneDeltaPair(scheme);
      const roleA = toneDeltaPair.roleA;
      const roleB = toneDeltaPair.roleB;
      const delta = toneDeltaPair.delta;
      const polarity = toneDeltaPair.polarity;
      const stayTogether = toneDeltaPair.stayTogether;
      const bg = this.background(scheme);
      const bgTone = bg.getTone(scheme);
      const aIsNearer = polarity === "nearer" || polarity === "lighter" && !scheme.isDark || polarity === "darker" && scheme.isDark;
      const nearer = aIsNearer ? roleA : roleB;
      const farther = aIsNearer ? roleB : roleA;
      const amNearer = this.name === nearer.name;
      const expansionDir = scheme.isDark ? 1 : -1;
      const nContrast = nearer.contrastCurve.get(scheme.contrastLevel);
      const fContrast = farther.contrastCurve.get(scheme.contrastLevel);
      const nInitialTone = nearer.tone(scheme);
      let nTone = Contrast.ratioOfTones(bgTone, nInitialTone) >= nContrast ? nInitialTone : _DynamicColor.foregroundTone(bgTone, nContrast);
      const fInitialTone = farther.tone(scheme);
      let fTone = Contrast.ratioOfTones(bgTone, fInitialTone) >= fContrast ? fInitialTone : _DynamicColor.foregroundTone(bgTone, fContrast);
      if (decreasingContrast) {
        nTone = _DynamicColor.foregroundTone(bgTone, nContrast);
        fTone = _DynamicColor.foregroundTone(bgTone, fContrast);
      }
      if ((fTone - nTone) * expansionDir >= delta) {
      } else {
        fTone = clampDouble(0, 100, nTone + delta * expansionDir);
        if ((fTone - nTone) * expansionDir >= delta) {
        } else {
          nTone = clampDouble(0, 100, fTone - delta * expansionDir);
        }
      }
      if (50 <= nTone && nTone < 60) {
        if (expansionDir > 0) {
          nTone = 60;
          fTone = Math.max(fTone, nTone + delta * expansionDir);
        } else {
          nTone = 49;
          fTone = Math.min(fTone, nTone + delta * expansionDir);
        }
      } else if (50 <= fTone && fTone < 60) {
        if (stayTogether) {
          if (expansionDir > 0) {
            nTone = 60;
            fTone = Math.max(fTone, nTone + delta * expansionDir);
          } else {
            nTone = 49;
            fTone = Math.min(fTone, nTone + delta * expansionDir);
          }
        } else {
          if (expansionDir > 0) {
            fTone = 60;
          } else {
            fTone = 49;
          }
        }
      }
      return amNearer ? nTone : fTone;
    } else {
      let answer = this.tone(scheme);
      if (this.background == null) {
        return answer;
      }
      const bgTone = this.background(scheme).getTone(scheme);
      const desiredRatio = this.contrastCurve.get(scheme.contrastLevel);
      if (Contrast.ratioOfTones(bgTone, answer) >= desiredRatio) {
      } else {
        answer = _DynamicColor.foregroundTone(bgTone, desiredRatio);
      }
      if (decreasingContrast) {
        answer = _DynamicColor.foregroundTone(bgTone, desiredRatio);
      }
      if (this.isBackground && 50 <= answer && answer < 60) {
        if (Contrast.ratioOfTones(49, bgTone) >= desiredRatio) {
          answer = 49;
        } else {
          answer = 60;
        }
      }
      if (this.secondBackground) {
        const [bg1, bg2] = [this.background, this.secondBackground];
        const [bgTone1, bgTone2] = [bg1(scheme).getTone(scheme), bg2(scheme).getTone(scheme)];
        const [upper, lower] = [Math.max(bgTone1, bgTone2), Math.min(bgTone1, bgTone2)];
        if (Contrast.ratioOfTones(upper, answer) >= desiredRatio && Contrast.ratioOfTones(lower, answer) >= desiredRatio) {
          return answer;
        }
        const lightOption = Contrast.lighter(upper, desiredRatio);
        const darkOption = Contrast.darker(lower, desiredRatio);
        const availables = [];
        if (lightOption !== -1)
          availables.push(lightOption);
        if (darkOption !== -1)
          availables.push(darkOption);
        const prefersLight = _DynamicColor.tonePrefersLightForeground(bgTone1) || _DynamicColor.tonePrefersLightForeground(bgTone2);
        if (prefersLight) {
          return lightOption < 0 ? 100 : lightOption;
        }
        if (availables.length === 1) {
          return availables[0];
        }
        return darkOption < 0 ? 0 : darkOption;
      }
      return answer;
    }
  }
  /**
   * Given a background tone, find a foreground tone, while ensuring they reach
   * a contrast ratio that is as close to [ratio] as possible.
   *
   * @param bgTone Tone in HCT. Range is 0 to 100, undefined behavior when it
   *     falls outside that range.
   * @param ratio The contrast ratio desired between bgTone and the return
   *     value.
   */
  static foregroundTone(bgTone, ratio) {
    const lighterTone = Contrast.lighterUnsafe(bgTone, ratio);
    const darkerTone = Contrast.darkerUnsafe(bgTone, ratio);
    const lighterRatio = Contrast.ratioOfTones(lighterTone, bgTone);
    const darkerRatio = Contrast.ratioOfTones(darkerTone, bgTone);
    const preferLighter = _DynamicColor.tonePrefersLightForeground(bgTone);
    if (preferLighter) {
      const negligibleDifference = Math.abs(lighterRatio - darkerRatio) < 0.1 && lighterRatio < ratio && darkerRatio < ratio;
      return lighterRatio >= ratio || lighterRatio >= darkerRatio || negligibleDifference ? lighterTone : darkerTone;
    } else {
      return darkerRatio >= ratio || darkerRatio >= lighterRatio ? darkerTone : lighterTone;
    }
  }
  /**
   * Returns whether [tone] prefers a light foreground.
   *
   * People prefer white foregrounds on ~T60-70. Observed over time, and also
   * by Andrew Somers during research for APCA.
   *
   * T60 used as to create the smallest discontinuity possible when skipping
   * down to T49 in order to ensure light foregrounds.
   * Since `tertiaryContainer` in dark monochrome scheme requires a tone of
   * 60, it should not be adjusted. Therefore, 60 is excluded here.
   */
  static tonePrefersLightForeground(tone) {
    return Math.round(tone) < 60;
  }
  /**
   * Returns whether [tone] can reach a contrast ratio of 4.5 with a lighter
   * color.
   */
  static toneAllowsLightForeground(tone) {
    return Math.round(tone) <= 49;
  }
  /**
   * Adjust a tone such that white has 4.5 contrast, if the tone is
   * reasonably close to supporting it.
   */
  static enableLightForeground(tone) {
    if (_DynamicColor.tonePrefersLightForeground(tone) && !_DynamicColor.toneAllowsLightForeground(tone)) {
      return 49;
    }
    return tone;
  }
};

// ../../node_modules/@material/material-color-utilities/palettes/tonal_palette.js
var TonalPalette = class _TonalPalette {
  /**
   * @param argb ARGB representation of a color
   * @return Tones matching that color's hue and chroma.
   */
  static fromInt(argb) {
    const hct = Hct.fromInt(argb);
    return _TonalPalette.fromHct(hct);
  }
  /**
   * @param hct Hct
   * @return Tones matching that color's hue and chroma.
   */
  static fromHct(hct) {
    return new _TonalPalette(hct.hue, hct.chroma, hct);
  }
  /**
   * @param hue HCT hue
   * @param chroma HCT chroma
   * @return Tones matching hue and chroma.
   */
  static fromHueAndChroma(hue, chroma) {
    const keyColor = new KeyColor(hue, chroma).create();
    return new _TonalPalette(hue, chroma, keyColor);
  }
  constructor(hue, chroma, keyColor) {
    this.hue = hue;
    this.chroma = chroma;
    this.keyColor = keyColor;
    this.cache = /* @__PURE__ */ new Map();
  }
  /**
   * @param tone HCT tone, measured from 0 to 100.
   * @return ARGB representation of a color with that tone.
   */
  tone(tone) {
    let argb = this.cache.get(tone);
    if (argb === void 0) {
      argb = Hct.from(this.hue, this.chroma, tone).toInt();
      this.cache.set(tone, argb);
    }
    return argb;
  }
  /**
   * @param tone HCT tone.
   * @return HCT representation of a color with that tone.
   */
  getHct(tone) {
    return Hct.fromInt(this.tone(tone));
  }
};
var KeyColor = class {
  constructor(hue, requestedChroma) {
    this.hue = hue;
    this.requestedChroma = requestedChroma;
    this.chromaCache = /* @__PURE__ */ new Map();
    this.maxChromaValue = 200;
  }
  /**
   * Creates a key color from a [hue] and a [chroma].
   * The key color is the first tone, starting from T50, matching the given hue
   * and chroma.
   *
   * @return Key color [Hct]
   */
  create() {
    const pivotTone = 50;
    const toneStepSize = 1;
    const epsilon = 0.01;
    let lowerTone = 0;
    let upperTone = 100;
    while (lowerTone < upperTone) {
      const midTone = Math.floor((lowerTone + upperTone) / 2);
      const isAscending = this.maxChroma(midTone) < this.maxChroma(midTone + toneStepSize);
      const sufficientChroma = this.maxChroma(midTone) >= this.requestedChroma - epsilon;
      if (sufficientChroma) {
        if (Math.abs(lowerTone - pivotTone) < Math.abs(upperTone - pivotTone)) {
          upperTone = midTone;
        } else {
          if (lowerTone === midTone) {
            return Hct.from(this.hue, this.requestedChroma, lowerTone);
          }
          lowerTone = midTone;
        }
      } else {
        if (isAscending) {
          lowerTone = midTone + toneStepSize;
        } else {
          upperTone = midTone;
        }
      }
    }
    return Hct.from(this.hue, this.requestedChroma, lowerTone);
  }
  // Find the maximum chroma for a given tone
  maxChroma(tone) {
    if (this.chromaCache.has(tone)) {
      return this.chromaCache.get(tone);
    }
    const chroma = Hct.from(this.hue, this.maxChromaValue, tone).chroma;
    this.chromaCache.set(tone, chroma);
    return chroma;
  }
};

// ../../node_modules/@material/material-color-utilities/dynamiccolor/contrast_curve.js
var ContrastCurve = class {
  /**
   * Creates a `ContrastCurve` object.
   *
   * @param low Value for contrast level -1.0
   * @param normal Value for contrast level 0.0
   * @param medium Value for contrast level 0.5
   * @param high Value for contrast level 1.0
   */
  constructor(low, normal, medium, high) {
    this.low = low;
    this.normal = normal;
    this.medium = medium;
    this.high = high;
  }
  /**
   * Returns the value at a given contrast level.
   *
   * @param contrastLevel The contrast level. 0.0 is the default (normal); -1.0
   *     is the lowest; 1.0 is the highest.
   * @return The value. For contrast ratios, a number between 1.0 and 21.0.
   */
  get(contrastLevel) {
    if (contrastLevel <= -1) {
      return this.low;
    } else if (contrastLevel < 0) {
      return lerp(this.low, this.normal, (contrastLevel - -1) / 1);
    } else if (contrastLevel < 0.5) {
      return lerp(this.normal, this.medium, (contrastLevel - 0) / 0.5);
    } else if (contrastLevel < 1) {
      return lerp(this.medium, this.high, (contrastLevel - 0.5) / 0.5);
    } else {
      return this.high;
    }
  }
};

// ../../node_modules/@material/material-color-utilities/dynamiccolor/tone_delta_pair.js
var ToneDeltaPair = class {
  /**
   * Documents a constraint in tone distance between two DynamicColors.
   *
   * The polarity is an adjective that describes "A", compared to "B".
   *
   * For instance, ToneDeltaPair(A, B, 15, 'darker', stayTogether) states that
   * A's tone should be at least 15 darker than B's.
   *
   * 'nearer' and 'farther' describes closeness to the surface roles. For
   * instance, ToneDeltaPair(A, B, 10, 'nearer', stayTogether) states that A
   * should be 10 lighter than B in light mode, and 10 darker than B in dark
   * mode.
   *
   * @param roleA The first role in a pair.
   * @param roleB The second role in a pair.
   * @param delta Required difference between tones. Absolute value, negative
   * values have undefined behavior.
   * @param polarity The relative relation between tones of roleA and roleB,
   * as described above.
   * @param stayTogether Whether these two roles should stay on the same side of
   * the "awkward zone" (T50-59). This is necessary for certain cases where
   * one role has two backgrounds.
   */
  constructor(roleA, roleB, delta, polarity, stayTogether) {
    this.roleA = roleA;
    this.roleB = roleB;
    this.delta = delta;
    this.polarity = polarity;
    this.stayTogether = stayTogether;
  }
};

// ../../node_modules/@material/material-color-utilities/dynamiccolor/variant.js
var Variant;
(function(Variant2) {
  Variant2[Variant2["MONOCHROME"] = 0] = "MONOCHROME";
  Variant2[Variant2["NEUTRAL"] = 1] = "NEUTRAL";
  Variant2[Variant2["TONAL_SPOT"] = 2] = "TONAL_SPOT";
  Variant2[Variant2["VIBRANT"] = 3] = "VIBRANT";
  Variant2[Variant2["EXPRESSIVE"] = 4] = "EXPRESSIVE";
  Variant2[Variant2["FIDELITY"] = 5] = "FIDELITY";
  Variant2[Variant2["CONTENT"] = 6] = "CONTENT";
  Variant2[Variant2["RAINBOW"] = 7] = "RAINBOW";
  Variant2[Variant2["FRUIT_SALAD"] = 8] = "FRUIT_SALAD";
})(Variant || (Variant = {}));

// ../../node_modules/@material/material-color-utilities/dynamiccolor/material_dynamic_colors.js
function isFidelity(scheme) {
  return scheme.variant === Variant.FIDELITY || scheme.variant === Variant.CONTENT;
}
function isMonochrome(scheme) {
  return scheme.variant === Variant.MONOCHROME;
}
function findDesiredChromaByTone(hue, chroma, tone, byDecreasingTone) {
  let answer = tone;
  let closestToChroma = Hct.from(hue, chroma, tone);
  if (closestToChroma.chroma < chroma) {
    let chromaPeak = closestToChroma.chroma;
    while (closestToChroma.chroma < chroma) {
      answer += byDecreasingTone ? -1 : 1;
      const potentialSolution = Hct.from(hue, chroma, answer);
      if (chromaPeak > potentialSolution.chroma) {
        break;
      }
      if (Math.abs(potentialSolution.chroma - chroma) < 0.4) {
        break;
      }
      const potentialDelta = Math.abs(potentialSolution.chroma - chroma);
      const currentDelta = Math.abs(closestToChroma.chroma - chroma);
      if (potentialDelta < currentDelta) {
        closestToChroma = potentialSolution;
      }
      chromaPeak = Math.max(chromaPeak, potentialSolution.chroma);
    }
  }
  return answer;
}
var MaterialDynamicColors = class _MaterialDynamicColors {
  static highestSurface(s4) {
    return s4.isDark ? _MaterialDynamicColors.surfaceBright : _MaterialDynamicColors.surfaceDim;
  }
};
MaterialDynamicColors.contentAccentToneDelta = 15;
MaterialDynamicColors.primaryPaletteKeyColor = DynamicColor.fromPalette({
  name: "primary_palette_key_color",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => s4.primaryPalette.keyColor.tone
});
MaterialDynamicColors.secondaryPaletteKeyColor = DynamicColor.fromPalette({
  name: "secondary_palette_key_color",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => s4.secondaryPalette.keyColor.tone
});
MaterialDynamicColors.tertiaryPaletteKeyColor = DynamicColor.fromPalette({
  name: "tertiary_palette_key_color",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => s4.tertiaryPalette.keyColor.tone
});
MaterialDynamicColors.neutralPaletteKeyColor = DynamicColor.fromPalette({
  name: "neutral_palette_key_color",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.neutralPalette.keyColor.tone
});
MaterialDynamicColors.neutralVariantPaletteKeyColor = DynamicColor.fromPalette({
  name: "neutral_variant_palette_key_color",
  palette: (s4) => s4.neutralVariantPalette,
  tone: (s4) => s4.neutralVariantPalette.keyColor.tone
});
MaterialDynamicColors.background = DynamicColor.fromPalette({
  name: "background",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? 6 : 98,
  isBackground: true
});
MaterialDynamicColors.onBackground = DynamicColor.fromPalette({
  name: "on_background",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? 90 : 10,
  background: (s4) => MaterialDynamicColors.background,
  contrastCurve: new ContrastCurve(3, 3, 4.5, 7)
});
MaterialDynamicColors.surface = DynamicColor.fromPalette({
  name: "surface",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? 6 : 98,
  isBackground: true
});
MaterialDynamicColors.surfaceDim = DynamicColor.fromPalette({
  name: "surface_dim",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? 6 : new ContrastCurve(87, 87, 80, 75).get(s4.contrastLevel),
  isBackground: true
});
MaterialDynamicColors.surfaceBright = DynamicColor.fromPalette({
  name: "surface_bright",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? new ContrastCurve(24, 24, 29, 34).get(s4.contrastLevel) : 98,
  isBackground: true
});
MaterialDynamicColors.surfaceContainerLowest = DynamicColor.fromPalette({
  name: "surface_container_lowest",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? new ContrastCurve(4, 4, 2, 0).get(s4.contrastLevel) : 100,
  isBackground: true
});
MaterialDynamicColors.surfaceContainerLow = DynamicColor.fromPalette({
  name: "surface_container_low",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? new ContrastCurve(10, 10, 11, 12).get(s4.contrastLevel) : new ContrastCurve(96, 96, 96, 95).get(s4.contrastLevel),
  isBackground: true
});
MaterialDynamicColors.surfaceContainer = DynamicColor.fromPalette({
  name: "surface_container",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? new ContrastCurve(12, 12, 16, 20).get(s4.contrastLevel) : new ContrastCurve(94, 94, 92, 90).get(s4.contrastLevel),
  isBackground: true
});
MaterialDynamicColors.surfaceContainerHigh = DynamicColor.fromPalette({
  name: "surface_container_high",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? new ContrastCurve(17, 17, 21, 25).get(s4.contrastLevel) : new ContrastCurve(92, 92, 88, 85).get(s4.contrastLevel),
  isBackground: true
});
MaterialDynamicColors.surfaceContainerHighest = DynamicColor.fromPalette({
  name: "surface_container_highest",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? new ContrastCurve(22, 22, 26, 30).get(s4.contrastLevel) : new ContrastCurve(90, 90, 84, 80).get(s4.contrastLevel),
  isBackground: true
});
MaterialDynamicColors.onSurface = DynamicColor.fromPalette({
  name: "on_surface",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? 90 : 10,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.surfaceVariant = DynamicColor.fromPalette({
  name: "surface_variant",
  palette: (s4) => s4.neutralVariantPalette,
  tone: (s4) => s4.isDark ? 30 : 90,
  isBackground: true
});
MaterialDynamicColors.onSurfaceVariant = DynamicColor.fromPalette({
  name: "on_surface_variant",
  palette: (s4) => s4.neutralVariantPalette,
  tone: (s4) => s4.isDark ? 80 : 30,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});
MaterialDynamicColors.inverseSurface = DynamicColor.fromPalette({
  name: "inverse_surface",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? 90 : 20
});
MaterialDynamicColors.inverseOnSurface = DynamicColor.fromPalette({
  name: "inverse_on_surface",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => s4.isDark ? 20 : 95,
  background: (s4) => MaterialDynamicColors.inverseSurface,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.outline = DynamicColor.fromPalette({
  name: "outline",
  palette: (s4) => s4.neutralVariantPalette,
  tone: (s4) => s4.isDark ? 60 : 50,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1.5, 3, 4.5, 7)
});
MaterialDynamicColors.outlineVariant = DynamicColor.fromPalette({
  name: "outline_variant",
  palette: (s4) => s4.neutralVariantPalette,
  tone: (s4) => s4.isDark ? 30 : 80,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5)
});
MaterialDynamicColors.shadow = DynamicColor.fromPalette({
  name: "shadow",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => 0
});
MaterialDynamicColors.scrim = DynamicColor.fromPalette({
  name: "scrim",
  palette: (s4) => s4.neutralPalette,
  tone: (s4) => 0
});
MaterialDynamicColors.surfaceTint = DynamicColor.fromPalette({
  name: "surface_tint",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => s4.isDark ? 80 : 40,
  isBackground: true
});
MaterialDynamicColors.primary = DynamicColor.fromPalette({
  name: "primary",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 100 : 0;
    }
    return s4.isDark ? 80 : 40;
  },
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryContainer, MaterialDynamicColors.primary, 10, "nearer", false)
});
MaterialDynamicColors.onPrimary = DynamicColor.fromPalette({
  name: "on_primary",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 10 : 90;
    }
    return s4.isDark ? 20 : 100;
  },
  background: (s4) => MaterialDynamicColors.primary,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.primaryContainer = DynamicColor.fromPalette({
  name: "primary_container",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => {
    if (isFidelity(s4)) {
      return s4.sourceColorHct.tone;
    }
    if (isMonochrome(s4)) {
      return s4.isDark ? 85 : 25;
    }
    return s4.isDark ? 30 : 90;
  },
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryContainer, MaterialDynamicColors.primary, 10, "nearer", false)
});
MaterialDynamicColors.onPrimaryContainer = DynamicColor.fromPalette({
  name: "on_primary_container",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => {
    if (isFidelity(s4)) {
      return DynamicColor.foregroundTone(MaterialDynamicColors.primaryContainer.tone(s4), 4.5);
    }
    if (isMonochrome(s4)) {
      return s4.isDark ? 0 : 100;
    }
    return s4.isDark ? 90 : 30;
  },
  background: (s4) => MaterialDynamicColors.primaryContainer,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});
MaterialDynamicColors.inversePrimary = DynamicColor.fromPalette({
  name: "inverse_primary",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => s4.isDark ? 40 : 80,
  background: (s4) => MaterialDynamicColors.inverseSurface,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 7)
});
MaterialDynamicColors.secondary = DynamicColor.fromPalette({
  name: "secondary",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => s4.isDark ? 80 : 40,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryContainer, MaterialDynamicColors.secondary, 10, "nearer", false)
});
MaterialDynamicColors.onSecondary = DynamicColor.fromPalette({
  name: "on_secondary",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 10 : 100;
    } else {
      return s4.isDark ? 20 : 100;
    }
  },
  background: (s4) => MaterialDynamicColors.secondary,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.secondaryContainer = DynamicColor.fromPalette({
  name: "secondary_container",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => {
    const initialTone = s4.isDark ? 30 : 90;
    if (isMonochrome(s4)) {
      return s4.isDark ? 30 : 85;
    }
    if (!isFidelity(s4)) {
      return initialTone;
    }
    return findDesiredChromaByTone(s4.secondaryPalette.hue, s4.secondaryPalette.chroma, initialTone, s4.isDark ? false : true);
  },
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryContainer, MaterialDynamicColors.secondary, 10, "nearer", false)
});
MaterialDynamicColors.onSecondaryContainer = DynamicColor.fromPalette({
  name: "on_secondary_container",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 90 : 10;
    }
    if (!isFidelity(s4)) {
      return s4.isDark ? 90 : 30;
    }
    return DynamicColor.foregroundTone(MaterialDynamicColors.secondaryContainer.tone(s4), 4.5);
  },
  background: (s4) => MaterialDynamicColors.secondaryContainer,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});
MaterialDynamicColors.tertiary = DynamicColor.fromPalette({
  name: "tertiary",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 90 : 25;
    }
    return s4.isDark ? 80 : 40;
  },
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryContainer, MaterialDynamicColors.tertiary, 10, "nearer", false)
});
MaterialDynamicColors.onTertiary = DynamicColor.fromPalette({
  name: "on_tertiary",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 10 : 90;
    }
    return s4.isDark ? 20 : 100;
  },
  background: (s4) => MaterialDynamicColors.tertiary,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.tertiaryContainer = DynamicColor.fromPalette({
  name: "tertiary_container",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 60 : 49;
    }
    if (!isFidelity(s4)) {
      return s4.isDark ? 30 : 90;
    }
    const proposedHct = s4.tertiaryPalette.getHct(s4.sourceColorHct.tone);
    return DislikeAnalyzer.fixIfDisliked(proposedHct).tone;
  },
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryContainer, MaterialDynamicColors.tertiary, 10, "nearer", false)
});
MaterialDynamicColors.onTertiaryContainer = DynamicColor.fromPalette({
  name: "on_tertiary_container",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 0 : 100;
    }
    if (!isFidelity(s4)) {
      return s4.isDark ? 90 : 30;
    }
    return DynamicColor.foregroundTone(MaterialDynamicColors.tertiaryContainer.tone(s4), 4.5);
  },
  background: (s4) => MaterialDynamicColors.tertiaryContainer,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});
MaterialDynamicColors.error = DynamicColor.fromPalette({
  name: "error",
  palette: (s4) => s4.errorPalette,
  tone: (s4) => s4.isDark ? 80 : 40,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.errorContainer, MaterialDynamicColors.error, 10, "nearer", false)
});
MaterialDynamicColors.onError = DynamicColor.fromPalette({
  name: "on_error",
  palette: (s4) => s4.errorPalette,
  tone: (s4) => s4.isDark ? 20 : 100,
  background: (s4) => MaterialDynamicColors.error,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.errorContainer = DynamicColor.fromPalette({
  name: "error_container",
  palette: (s4) => s4.errorPalette,
  tone: (s4) => s4.isDark ? 30 : 90,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.errorContainer, MaterialDynamicColors.error, 10, "nearer", false)
});
MaterialDynamicColors.onErrorContainer = DynamicColor.fromPalette({
  name: "on_error_container",
  palette: (s4) => s4.errorPalette,
  tone: (s4) => {
    if (isMonochrome(s4)) {
      return s4.isDark ? 90 : 10;
    }
    return s4.isDark ? 90 : 30;
  },
  background: (s4) => MaterialDynamicColors.errorContainer,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});
MaterialDynamicColors.primaryFixed = DynamicColor.fromPalette({
  name: "primary_fixed",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => isMonochrome(s4) ? 40 : 90,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryFixed, MaterialDynamicColors.primaryFixedDim, 10, "lighter", true)
});
MaterialDynamicColors.primaryFixedDim = DynamicColor.fromPalette({
  name: "primary_fixed_dim",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => isMonochrome(s4) ? 30 : 80,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryFixed, MaterialDynamicColors.primaryFixedDim, 10, "lighter", true)
});
MaterialDynamicColors.onPrimaryFixed = DynamicColor.fromPalette({
  name: "on_primary_fixed",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => isMonochrome(s4) ? 100 : 10,
  background: (s4) => MaterialDynamicColors.primaryFixedDim,
  secondBackground: (s4) => MaterialDynamicColors.primaryFixed,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.onPrimaryFixedVariant = DynamicColor.fromPalette({
  name: "on_primary_fixed_variant",
  palette: (s4) => s4.primaryPalette,
  tone: (s4) => isMonochrome(s4) ? 90 : 30,
  background: (s4) => MaterialDynamicColors.primaryFixedDim,
  secondBackground: (s4) => MaterialDynamicColors.primaryFixed,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});
MaterialDynamicColors.secondaryFixed = DynamicColor.fromPalette({
  name: "secondary_fixed",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => isMonochrome(s4) ? 80 : 90,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryFixed, MaterialDynamicColors.secondaryFixedDim, 10, "lighter", true)
});
MaterialDynamicColors.secondaryFixedDim = DynamicColor.fromPalette({
  name: "secondary_fixed_dim",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => isMonochrome(s4) ? 70 : 80,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryFixed, MaterialDynamicColors.secondaryFixedDim, 10, "lighter", true)
});
MaterialDynamicColors.onSecondaryFixed = DynamicColor.fromPalette({
  name: "on_secondary_fixed",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => 10,
  background: (s4) => MaterialDynamicColors.secondaryFixedDim,
  secondBackground: (s4) => MaterialDynamicColors.secondaryFixed,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.onSecondaryFixedVariant = DynamicColor.fromPalette({
  name: "on_secondary_fixed_variant",
  palette: (s4) => s4.secondaryPalette,
  tone: (s4) => isMonochrome(s4) ? 25 : 30,
  background: (s4) => MaterialDynamicColors.secondaryFixedDim,
  secondBackground: (s4) => MaterialDynamicColors.secondaryFixed,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});
MaterialDynamicColors.tertiaryFixed = DynamicColor.fromPalette({
  name: "tertiary_fixed",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => isMonochrome(s4) ? 40 : 90,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryFixed, MaterialDynamicColors.tertiaryFixedDim, 10, "lighter", true)
});
MaterialDynamicColors.tertiaryFixedDim = DynamicColor.fromPalette({
  name: "tertiary_fixed_dim",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => isMonochrome(s4) ? 30 : 80,
  isBackground: true,
  background: (s4) => MaterialDynamicColors.highestSurface(s4),
  contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
  toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryFixed, MaterialDynamicColors.tertiaryFixedDim, 10, "lighter", true)
});
MaterialDynamicColors.onTertiaryFixed = DynamicColor.fromPalette({
  name: "on_tertiary_fixed",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => isMonochrome(s4) ? 100 : 10,
  background: (s4) => MaterialDynamicColors.tertiaryFixedDim,
  secondBackground: (s4) => MaterialDynamicColors.tertiaryFixed,
  contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
});
MaterialDynamicColors.onTertiaryFixedVariant = DynamicColor.fromPalette({
  name: "on_tertiary_fixed_variant",
  palette: (s4) => s4.tertiaryPalette,
  tone: (s4) => isMonochrome(s4) ? 90 : 30,
  background: (s4) => MaterialDynamicColors.tertiaryFixedDim,
  secondBackground: (s4) => MaterialDynamicColors.tertiaryFixed,
  contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
});

// ../../node_modules/@material/material-color-utilities/dynamiccolor/dynamic_scheme.js
var DynamicScheme = class {
  constructor(args) {
    this.sourceColorArgb = args.sourceColorArgb;
    this.variant = args.variant;
    this.contrastLevel = args.contrastLevel;
    this.isDark = args.isDark;
    this.sourceColorHct = Hct.fromInt(args.sourceColorArgb);
    this.primaryPalette = args.primaryPalette;
    this.secondaryPalette = args.secondaryPalette;
    this.tertiaryPalette = args.tertiaryPalette;
    this.neutralPalette = args.neutralPalette;
    this.neutralVariantPalette = args.neutralVariantPalette;
    this.errorPalette = TonalPalette.fromHueAndChroma(25, 84);
  }
  /**
   * Support design spec'ing Dynamic Color by schemes that specify hue
   * rotations that should be applied at certain breakpoints.
   * @param sourceColor the source color of the theme, in HCT.
   * @param hues The "breakpoints", i.e. the hues at which a rotation should
   * be apply.
   * @param rotations The rotation that should be applied when source color's
   * hue is >= the same index in hues array, and <= the hue at the next index
   * in hues array.
   */
  static getRotatedHue(sourceColor, hues, rotations) {
    const sourceHue = sourceColor.hue;
    if (hues.length !== rotations.length) {
      throw new Error(`mismatch between hue length ${hues.length} & rotations ${rotations.length}`);
    }
    if (rotations.length === 1) {
      return sanitizeDegreesDouble(sourceColor.hue + rotations[0]);
    }
    const size = hues.length;
    for (let i7 = 0; i7 <= size - 2; i7++) {
      const thisHue = hues[i7];
      const nextHue = hues[i7 + 1];
      if (thisHue < sourceHue && sourceHue < nextHue) {
        return sanitizeDegreesDouble(sourceHue + rotations[i7]);
      }
    }
    return sourceHue;
  }
  getArgb(dynamicColor) {
    return dynamicColor.getArgb(this);
  }
  getHct(dynamicColor) {
    return dynamicColor.getHct(this);
  }
  get primaryPaletteKeyColor() {
    return this.getArgb(MaterialDynamicColors.primaryPaletteKeyColor);
  }
  get secondaryPaletteKeyColor() {
    return this.getArgb(MaterialDynamicColors.secondaryPaletteKeyColor);
  }
  get tertiaryPaletteKeyColor() {
    return this.getArgb(MaterialDynamicColors.tertiaryPaletteKeyColor);
  }
  get neutralPaletteKeyColor() {
    return this.getArgb(MaterialDynamicColors.neutralPaletteKeyColor);
  }
  get neutralVariantPaletteKeyColor() {
    return this.getArgb(MaterialDynamicColors.neutralVariantPaletteKeyColor);
  }
  get background() {
    return this.getArgb(MaterialDynamicColors.background);
  }
  get onBackground() {
    return this.getArgb(MaterialDynamicColors.onBackground);
  }
  get surface() {
    return this.getArgb(MaterialDynamicColors.surface);
  }
  get surfaceDim() {
    return this.getArgb(MaterialDynamicColors.surfaceDim);
  }
  get surfaceBright() {
    return this.getArgb(MaterialDynamicColors.surfaceBright);
  }
  get surfaceContainerLowest() {
    return this.getArgb(MaterialDynamicColors.surfaceContainerLowest);
  }
  get surfaceContainerLow() {
    return this.getArgb(MaterialDynamicColors.surfaceContainerLow);
  }
  get surfaceContainer() {
    return this.getArgb(MaterialDynamicColors.surfaceContainer);
  }
  get surfaceContainerHigh() {
    return this.getArgb(MaterialDynamicColors.surfaceContainerHigh);
  }
  get surfaceContainerHighest() {
    return this.getArgb(MaterialDynamicColors.surfaceContainerHighest);
  }
  get onSurface() {
    return this.getArgb(MaterialDynamicColors.onSurface);
  }
  get surfaceVariant() {
    return this.getArgb(MaterialDynamicColors.surfaceVariant);
  }
  get onSurfaceVariant() {
    return this.getArgb(MaterialDynamicColors.onSurfaceVariant);
  }
  get inverseSurface() {
    return this.getArgb(MaterialDynamicColors.inverseSurface);
  }
  get inverseOnSurface() {
    return this.getArgb(MaterialDynamicColors.inverseOnSurface);
  }
  get outline() {
    return this.getArgb(MaterialDynamicColors.outline);
  }
  get outlineVariant() {
    return this.getArgb(MaterialDynamicColors.outlineVariant);
  }
  get shadow() {
    return this.getArgb(MaterialDynamicColors.shadow);
  }
  get scrim() {
    return this.getArgb(MaterialDynamicColors.scrim);
  }
  get surfaceTint() {
    return this.getArgb(MaterialDynamicColors.surfaceTint);
  }
  get primary() {
    return this.getArgb(MaterialDynamicColors.primary);
  }
  get onPrimary() {
    return this.getArgb(MaterialDynamicColors.onPrimary);
  }
  get primaryContainer() {
    return this.getArgb(MaterialDynamicColors.primaryContainer);
  }
  get onPrimaryContainer() {
    return this.getArgb(MaterialDynamicColors.onPrimaryContainer);
  }
  get inversePrimary() {
    return this.getArgb(MaterialDynamicColors.inversePrimary);
  }
  get secondary() {
    return this.getArgb(MaterialDynamicColors.secondary);
  }
  get onSecondary() {
    return this.getArgb(MaterialDynamicColors.onSecondary);
  }
  get secondaryContainer() {
    return this.getArgb(MaterialDynamicColors.secondaryContainer);
  }
  get onSecondaryContainer() {
    return this.getArgb(MaterialDynamicColors.onSecondaryContainer);
  }
  get tertiary() {
    return this.getArgb(MaterialDynamicColors.tertiary);
  }
  get onTertiary() {
    return this.getArgb(MaterialDynamicColors.onTertiary);
  }
  get tertiaryContainer() {
    return this.getArgb(MaterialDynamicColors.tertiaryContainer);
  }
  get onTertiaryContainer() {
    return this.getArgb(MaterialDynamicColors.onTertiaryContainer);
  }
  get error() {
    return this.getArgb(MaterialDynamicColors.error);
  }
  get onError() {
    return this.getArgb(MaterialDynamicColors.onError);
  }
  get errorContainer() {
    return this.getArgb(MaterialDynamicColors.errorContainer);
  }
  get onErrorContainer() {
    return this.getArgb(MaterialDynamicColors.onErrorContainer);
  }
  get primaryFixed() {
    return this.getArgb(MaterialDynamicColors.primaryFixed);
  }
  get primaryFixedDim() {
    return this.getArgb(MaterialDynamicColors.primaryFixedDim);
  }
  get onPrimaryFixed() {
    return this.getArgb(MaterialDynamicColors.onPrimaryFixed);
  }
  get onPrimaryFixedVariant() {
    return this.getArgb(MaterialDynamicColors.onPrimaryFixedVariant);
  }
  get secondaryFixed() {
    return this.getArgb(MaterialDynamicColors.secondaryFixed);
  }
  get secondaryFixedDim() {
    return this.getArgb(MaterialDynamicColors.secondaryFixedDim);
  }
  get onSecondaryFixed() {
    return this.getArgb(MaterialDynamicColors.onSecondaryFixed);
  }
  get onSecondaryFixedVariant() {
    return this.getArgb(MaterialDynamicColors.onSecondaryFixedVariant);
  }
  get tertiaryFixed() {
    return this.getArgb(MaterialDynamicColors.tertiaryFixed);
  }
  get tertiaryFixedDim() {
    return this.getArgb(MaterialDynamicColors.tertiaryFixedDim);
  }
  get onTertiaryFixed() {
    return this.getArgb(MaterialDynamicColors.onTertiaryFixed);
  }
  get onTertiaryFixedVariant() {
    return this.getArgb(MaterialDynamicColors.onTertiaryFixedVariant);
  }
};

// ../../node_modules/@material/material-color-utilities/palettes/core_palette.js
var CorePalette = class _CorePalette {
  /**
   * @param argb ARGB representation of a color
   */
  static of(argb) {
    return new _CorePalette(argb, false);
  }
  /**
   * @param argb ARGB representation of a color
   */
  static contentOf(argb) {
    return new _CorePalette(argb, true);
  }
  /**
   * Create a [CorePalette] from a set of colors
   */
  static fromColors(colors) {
    return _CorePalette.createPaletteFromColors(false, colors);
  }
  /**
   * Create a content [CorePalette] from a set of colors
   */
  static contentFromColors(colors) {
    return _CorePalette.createPaletteFromColors(true, colors);
  }
  static createPaletteFromColors(content, colors) {
    const palette = new _CorePalette(colors.primary, content);
    if (colors.secondary) {
      const p3 = new _CorePalette(colors.secondary, content);
      palette.a2 = p3.a1;
    }
    if (colors.tertiary) {
      const p3 = new _CorePalette(colors.tertiary, content);
      palette.a3 = p3.a1;
    }
    if (colors.error) {
      const p3 = new _CorePalette(colors.error, content);
      palette.error = p3.a1;
    }
    if (colors.neutral) {
      const p3 = new _CorePalette(colors.neutral, content);
      palette.n1 = p3.n1;
    }
    if (colors.neutralVariant) {
      const p3 = new _CorePalette(colors.neutralVariant, content);
      palette.n2 = p3.n2;
    }
    return palette;
  }
  constructor(argb, isContent) {
    const hct = Hct.fromInt(argb);
    const hue = hct.hue;
    const chroma = hct.chroma;
    if (isContent) {
      this.a1 = TonalPalette.fromHueAndChroma(hue, chroma);
      this.a2 = TonalPalette.fromHueAndChroma(hue, chroma / 3);
      this.a3 = TonalPalette.fromHueAndChroma(hue + 60, chroma / 2);
      this.n1 = TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 12, 4));
      this.n2 = TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 6, 8));
    } else {
      this.a1 = TonalPalette.fromHueAndChroma(hue, Math.max(48, chroma));
      this.a2 = TonalPalette.fromHueAndChroma(hue, 16);
      this.a3 = TonalPalette.fromHueAndChroma(hue + 60, 24);
      this.n1 = TonalPalette.fromHueAndChroma(hue, 4);
      this.n2 = TonalPalette.fromHueAndChroma(hue, 8);
    }
    this.error = TonalPalette.fromHueAndChroma(25, 84);
  }
};

// ../../node_modules/@material/material-color-utilities/scheme/scheme_expressive.js
var SchemeExpressive = class _SchemeExpressive extends DynamicScheme {
  constructor(sourceColorHct, isDark, contrastLevel) {
    super({
      sourceColorArgb: sourceColorHct.toInt(),
      variant: Variant.EXPRESSIVE,
      contrastLevel,
      isDark,
      primaryPalette: TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue + 240), 40),
      secondaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeExpressive.hues, _SchemeExpressive.secondaryRotations), 24),
      tertiaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeExpressive.hues, _SchemeExpressive.tertiaryRotations), 32),
      neutralPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue + 15, 8),
      neutralVariantPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue + 15, 12)
    });
  }
};
SchemeExpressive.hues = [
  0,
  21,
  51,
  121,
  151,
  191,
  271,
  321,
  360
];
SchemeExpressive.secondaryRotations = [
  45,
  95,
  45,
  20,
  45,
  90,
  45,
  45,
  45
];
SchemeExpressive.tertiaryRotations = [
  120,
  120,
  20,
  45,
  20,
  15,
  20,
  120,
  120
];

// ../../node_modules/@material/material-color-utilities/scheme/scheme_vibrant.js
var SchemeVibrant = class _SchemeVibrant extends DynamicScheme {
  constructor(sourceColorHct, isDark, contrastLevel) {
    super({
      sourceColorArgb: sourceColorHct.toInt(),
      variant: Variant.VIBRANT,
      contrastLevel,
      isDark,
      primaryPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue, 200),
      secondaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeVibrant.hues, _SchemeVibrant.secondaryRotations), 24),
      tertiaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeVibrant.hues, _SchemeVibrant.tertiaryRotations), 32),
      neutralPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue, 10),
      neutralVariantPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue, 12)
    });
  }
};
SchemeVibrant.hues = [
  0,
  41,
  61,
  101,
  131,
  181,
  251,
  301,
  360
];
SchemeVibrant.secondaryRotations = [
  18,
  15,
  10,
  12,
  15,
  18,
  15,
  12,
  12
];
SchemeVibrant.tertiaryRotations = [
  35,
  30,
  20,
  25,
  30,
  35,
  30,
  25,
  25
];

// ../../node_modules/@material/material-color-utilities/score/score.js
var SCORE_OPTION_DEFAULTS = {
  desired: 4,
  fallbackColorARGB: 4282549748,
  filter: true
  // Avoid unsuitable colors.
};
function compare(a3, b5) {
  if (a3.score > b5.score) {
    return -1;
  } else if (a3.score < b5.score) {
    return 1;
  }
  return 0;
}
var Score = class _Score {
  constructor() {
  }
  /**
   * Given a map with keys of colors and values of how often the color appears,
   * rank the colors based on suitability for being used for a UI theme.
   *
   * @param colorsToPopulation map with keys of colors and values of how often
   *     the color appears, usually from a source image.
   * @param {ScoreOptions} options optional parameters.
   * @return Colors sorted by suitability for a UI theme. The most suitable
   *     color is the first item, the least suitable is the last. There will
   *     always be at least one color returned. If all the input colors
   *     were not suitable for a theme, a default fallback color will be
   *     provided, Google Blue.
   */
  static score(colorsToPopulation, options) {
    const { desired, fallbackColorARGB, filter } = { ...SCORE_OPTION_DEFAULTS, ...options };
    const colorsHct = [];
    const huePopulation = new Array(360).fill(0);
    let populationSum = 0;
    for (const [argb, population] of colorsToPopulation.entries()) {
      const hct = Hct.fromInt(argb);
      colorsHct.push(hct);
      const hue = Math.floor(hct.hue);
      huePopulation[hue] += population;
      populationSum += population;
    }
    const hueExcitedProportions = new Array(360).fill(0);
    for (let hue = 0; hue < 360; hue++) {
      const proportion = huePopulation[hue] / populationSum;
      for (let i7 = hue - 14; i7 < hue + 16; i7++) {
        const neighborHue = sanitizeDegreesInt(i7);
        hueExcitedProportions[neighborHue] += proportion;
      }
    }
    const scoredHct = new Array();
    for (const hct of colorsHct) {
      const hue = sanitizeDegreesInt(Math.round(hct.hue));
      const proportion = hueExcitedProportions[hue];
      if (filter && (hct.chroma < _Score.CUTOFF_CHROMA || proportion <= _Score.CUTOFF_EXCITED_PROPORTION)) {
        continue;
      }
      const proportionScore = proportion * 100 * _Score.WEIGHT_PROPORTION;
      const chromaWeight = hct.chroma < _Score.TARGET_CHROMA ? _Score.WEIGHT_CHROMA_BELOW : _Score.WEIGHT_CHROMA_ABOVE;
      const chromaScore = (hct.chroma - _Score.TARGET_CHROMA) * chromaWeight;
      const score = proportionScore + chromaScore;
      scoredHct.push({ hct, score });
    }
    scoredHct.sort(compare);
    const chosenColors = [];
    for (let differenceDegrees2 = 90; differenceDegrees2 >= 15; differenceDegrees2--) {
      chosenColors.length = 0;
      for (const { hct } of scoredHct) {
        const duplicateHue = chosenColors.find((chosenHct) => {
          return differenceDegrees(hct.hue, chosenHct.hue) < differenceDegrees2;
        });
        if (!duplicateHue) {
          chosenColors.push(hct);
        }
        if (chosenColors.length >= desired)
          break;
      }
      if (chosenColors.length >= desired)
        break;
    }
    const colors = [];
    if (chosenColors.length === 0) {
      colors.push(fallbackColorARGB);
    }
    for (const chosenHct of chosenColors) {
      colors.push(chosenHct.toInt());
    }
    return colors;
  }
};
Score.TARGET_CHROMA = 48;
Score.WEIGHT_PROPORTION = 0.7;
Score.WEIGHT_CHROMA_ABOVE = 0.3;
Score.WEIGHT_CHROMA_BELOW = 0.1;
Score.CUTOFF_CHROMA = 5;
Score.CUTOFF_EXCITED_PROPORTION = 0.01;

// ../../node_modules/@material/material-color-utilities/utils/string_utils.js
function hexFromArgb(argb) {
  const r6 = redFromArgb(argb);
  const g2 = greenFromArgb(argb);
  const b5 = blueFromArgb(argb);
  const outParts = [r6.toString(16), g2.toString(16), b5.toString(16)];
  for (const [i7, part] of outParts.entries()) {
    if (part.length === 1) {
      outParts[i7] = "0" + part;
    }
  }
  return "#" + outParts.join("");
}
function argbFromHex(hex) {
  hex = hex.replace("#", "");
  const isThree = hex.length === 3;
  const isSix = hex.length === 6;
  const isEight = hex.length === 8;
  if (!isThree && !isSix && !isEight) {
    throw new Error("unexpected hex " + hex);
  }
  let r6 = 0;
  let g2 = 0;
  let b5 = 0;
  if (isThree) {
    r6 = parseIntHex(hex.slice(0, 1).repeat(2));
    g2 = parseIntHex(hex.slice(1, 2).repeat(2));
    b5 = parseIntHex(hex.slice(2, 3).repeat(2));
  } else if (isSix) {
    r6 = parseIntHex(hex.slice(0, 2));
    g2 = parseIntHex(hex.slice(2, 4));
    b5 = parseIntHex(hex.slice(4, 6));
  } else if (isEight) {
    r6 = parseIntHex(hex.slice(2, 4));
    g2 = parseIntHex(hex.slice(4, 6));
    b5 = parseIntHex(hex.slice(6, 8));
  }
  return (255 << 24 | (r6 & 255) << 16 | (g2 & 255) << 8 | b5 & 255) >>> 0;
}
function parseIntHex(value) {
  return parseInt(value, 16);
}

// ../../node_modules/@universal-material/web/theme/css-var-builder.js
var CssVarBuilder = class _CssVarBuilder {
  constructor() {
    this.content = "";
  }
  static create() {
    return new _CssVarBuilder();
  }
  add(name, value) {
    const cssVar = `  ${name}: ${value};
`;
    this.content += cssVar;
    return this;
  }
  addFromArgb(name, argb) {
    this.add(`--u-color-${name}`, hexFromArgb(argb));
    return this;
  }
  addLightAndDarkFromArgb(name, lightArgb, darkArgb) {
    this.add(`--u-color-${name}`, `light-dark(${hexFromArgb(lightArgb)}, ${hexFromArgb(darkArgb)})`);
    return this;
  }
  build() {
    return this.content;
  }
};

// ../../node_modules/@universal-material/web/theme/neutral-colors.js
var neutralColors = [
  { name: "surface", lightTone: 98, darkTone: 6 },
  { name: "surface-bright", lightTone: 98, darkTone: 24 },
  { name: "surface-dim", lightTone: 87, darkTone: 6 },
  { name: "surface-container-lowest", lightTone: 100, darkTone: 4 },
  { name: "surface-container-low", lightTone: 96, darkTone: 10 },
  { name: "surface-container", lightTone: 94, darkTone: 12 },
  { name: "surface-container-high", lightTone: 92, darkTone: 17 },
  { name: "surface-container-highest", lightTone: 90, darkTone: 22 },
  { name: "on-surface", lightTone: 10, darkTone: 90 },
  { name: "light", fixedTone: 98 },
  { name: "on-light", fixedTone: 10 },
  { name: "dark", fixedTone: 6 },
  { name: "on-dark", fixedTone: 90 },
  { name: "scrim", fixedTone: 0 },
  { name: "shadow", fixedTone: 0 }
];
var neutralVariantColors = [
  { name: "surface-variant", lightTone: 90, darkTone: 30 },
  { name: "on-surface-variant", lightTone: 30, darkTone: 80 },
  { name: "outline", lightTone: 50, darkTone: 60 },
  { name: "outline-variant", lightTone: 80, darkTone: 30 }
];

// ../../node_modules/@universal-material/web/theme/theme-builder.js
var getCss = (selector, content) => `${selector} {
${content}}`;
var ThemeBuilder = class _ThemeBuilder {
  #corePalette;
  constructor(primaryColorHex) {
    this.colors = [];
    this.partial = false;
    this.cssClass = null;
    this.#corePalette = CorePalette.of(argbFromHex(primaryColorHex));
    this.addColorFromPalette("primary", this.#corePalette.a1);
  }
  static create(primaryColorHex) {
    return new _ThemeBuilder(primaryColorHex);
  }
  static createPartial(primaryColorHex) {
    const themeBuilder = new _ThemeBuilder(primaryColorHex);
    themeBuilder.partial = true;
    return themeBuilder;
  }
  addColorFromHex(name, hex) {
    const palette = TonalPalette.fromInt(argbFromHex(hex));
    this.addColorFromPalette(name, palette);
    return this;
  }
  addColorFromPalette(name, palette) {
    this.colors.push({ name, lightTone: 40, darkTone: 80, tonalPalette: palette });
    this.colors.push({ name: `on-${name}`, lightTone: 100, darkTone: 20, tonalPalette: palette });
    this.colors.push({ name: `${name}-container`, lightTone: 90, darkTone: 30, tonalPalette: palette });
    this.colors.push({ name: `on-${name}-container`, lightTone: 10, darkTone: 90, tonalPalette: palette });
    this.colors.push({ name: `${name}-fixed`, fixedTone: 90, tonalPalette: palette });
    this.colors.push({ name: `${name}-fixed-dim`, fixedTone: 80, tonalPalette: palette });
    this.colors.push({ name: `on-${name}-fixed`, fixedTone: 10, tonalPalette: palette });
    this.colors.push({ name: `on-${name}-fixed-variant`, fixedTone: 30, tonalPalette: palette });
    return this;
  }
  addStaticColor(name, hex, tone = 80) {
    const palette = TonalPalette.fromInt(argbFromHex(hex));
    this.colors.push({ name, fixedTone: tone, tonalPalette: palette });
    this.colors.push({ name: `on-${name}`, fixedTone: 15, tonalPalette: palette });
    this.colors.push({ name: `${name}-container`, fixedTone: 90, tonalPalette: palette });
    this.colors.push({ name: `on-${name}-container`, fixedTone: 15, tonalPalette: palette });
    return this;
  }
  setCssClass(cssClass) {
    this.cssClass = cssClass;
    return this;
  }
  ensureCssClassStartsWithDot() {
    if (!this.cssClass || this.cssClass.startsWith(".")) {
      return;
    }
    this.cssClass = `.${this.cssClass}`;
  }
  ensureThemeColors() {
    if (!this.colors.find((c4) => c4.name === "secondary")) {
      this.addColorFromPalette("secondary", this.#corePalette.a2);
    }
    if (!this.colors.find((c4) => c4.name === "tertiary")) {
      this.addColorFromPalette("tertiary", this.#corePalette.a3);
    }
  }
  ensureStatusColors() {
    if (!this.colors.find((c4) => c4.name === "success")) {
      this.addStaticColor("success", "#198754", 60);
    }
    if (!this.colors.find((c4) => c4.name === "info")) {
      this.addStaticColor("info", "#0dcaf0");
    }
    if (!this.colors.find((c4) => c4.name === "warning")) {
      this.addStaticColor("warning", "#ffc107");
    }
    if (!this.colors.find((c4) => c4.name === "error")) {
      this.addColorFromHex("error", "#b3261e");
    }
  }
  getNeutralVariables() {
    const builder = CssVarBuilder.create();
    this.addColors(builder, neutralColors, this.#corePalette.n1);
    builder.add("--u-color-body", "var(--u-color-surface)").add("--u-color-inverse-body", "var(--u-color-inverse-surface)").add("--u-color-on-body", "var(--u-color-on-surface)").add("--u-color-on-inverse-body", "var(--u-color-on-inverse-surface)");
    return builder.build();
  }
  getNeutralVariantVariables() {
    const builder = CssVarBuilder.create();
    this.addColors(builder, neutralVariantColors, this.#corePalette.n2);
    return builder.build();
  }
  getColorVariables(color) {
    const builder = CssVarBuilder.create();
    this.addToneColor(builder, color, color.tonalPalette);
    return builder.build();
  }
  getColorsVariables() {
    let variables = "";
    for (const color of this.colors) {
      variables += this.getColorVariables(color);
    }
    variables += this.getNeutralVariables();
    variables += this.getNeutralVariantVariables();
    return variables;
  }
  addColors(builder, colors, palette) {
    for (const color of colors) {
      this.addToneColor(builder, color, palette);
    }
  }
  addToneColor(builder, color, palette) {
    if (color.fixedTone !== void 0) {
      builder.addFromArgb(color.name, palette.tone(color.fixedTone));
      return;
    }
    const inverseName = `inverse-${color.name}`.replace("inverse-on", "on-inverse");
    builder.addLightAndDarkFromArgb(color.name, palette.tone(color.lightTone), palette.tone(color.darkTone)).addLightAndDarkFromArgb(inverseName, palette.tone(color.darkTone), palette.tone(color.lightTone));
    if (color.name === "surface" || color.name === "on-surface") {
      const prefix = color.name.startsWith("on-") ? "on-" : "";
      builder.addFromArgb(`${prefix}light-surface`, palette.tone(color.lightTone));
      builder.addFromArgb(`${prefix}dark-surface`, palette.tone(color.darkTone));
    }
  }
  build() {
    this.ensureCssClassStartsWithDot();
    const selector = this.cssClass ?? ":root";
    this.ensureThemeColors();
    if (!this.partial) {
      this.ensureStatusColors();
    }
    const variables = `${getCss(selector, this.getColorsVariables())}
`;
    return variables;
  }
};

// demo/theme.ts
var ACCENT_SEEDS = {
  neutral: "#5F6368",
  teal: "#1F7A75",
  blue: "#1A73E8",
  red: "#C0392B",
  green: "#2E8B4E",
  amber: "#A6791F",
  purple: "#6750A4"
};
var styleEl = null;
function applyGeneratedTheme(accent) {
  const seed = ACCENT_SEEDS[accent] ?? ACCENT_SEEDS.blue;
  const css = ThemeBuilder.create(seed).build();
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "u-theme";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

// ../../node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e6 = (t5) => (...e8) => ({ _$litDirective$: t5, values: e8 });
var i6 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e8, i7) {
    this._$Ct = t5, this._$AM = e8, this._$Ci = i7;
  }
  _$AS(t5, e8) {
    return this.update(t5, e8);
  }
  update(t5, e8) {
    return this.render(...e8);
  }
};

// ../../node_modules/lit-html/directives/class-map.js
var e7 = e6(class extends i6 {
  constructor(t5) {
    if (super(t5), t5.type !== t4.ATTRIBUTE || "class" !== t5.name || t5.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t5) {
    return " " + Object.keys(t5).filter((s4) => t5[s4]).join(" ") + " ";
  }
  update(s4, [i7]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s4.strings && (this.nt = new Set(s4.strings.join(" ").split(/\s/).filter((t5) => "" !== t5)));
      for (const t5 in i7) i7[t5] && !this.nt?.has(t5) && this.st.add(t5);
      return this.render(i7);
    }
    const r6 = s4.element.classList;
    for (const t5 of this.st) t5 in i7 || (r6.remove(t5), this.st.delete(t5));
    for (const t5 in i7) {
      const s5 = !!i7[t5];
      s5 === this.st.has(t5) || this.nt?.has(t5) || (s5 ? (r6.add(t5), this.st.add(t5)) : (r6.remove(t5), this.st.delete(t5)));
    }
    return E;
  }
});

// ../../node_modules/@universal-material/web/button/button.styles.js
var styles2 = i2`
  :host {
    --u-common-button-line-height: var(--u-label-large-line-height, 1.25rem);
    --u-common-button-font-size: var(--u-label-large-font-size, .875rem);
    --u-common-button-font-weight: var(--u-font-weight-medium, 500);
    --_common-button-padding: var(--u-common-button-padding, 16px);
    --_extra-small-font-size: var(--u-common-button-extra-small-font-size, .875rem);
    --_small-font-size: var(--u-common-button-small-font-size, .875rem);
    --_medium-font-size: var(--u-common-button-medium-font-size, 1rem);
    --_large-font-size: var(--u-common-button-large-font-size, 1.5rem);
    --_extra-large-font-size: var(--u-common-button-extra-large-font-size, 2rem);
    --_extra-small-font-weight: var(--u-common-button-extra-small-font-weight, var(--u-font-weight-medium, 500));
    --_small-font-weight: var(--u-common-button-small-font-weight, var(--u-font-weight-medium, 500));
    --_medium-font-weight: var(--u-common-button-medium-font-weight, var(--u-font-weight-medium, 500));
    --_large-font-weight: var(--u-common-button-large-font-weight, var(--u-font-weight-regular, 400));
    --_extra-large-font-weight: var(--u-common-button-extra-large-font-weight, var(--u-font-weight-regular, 400));
    --_extra-small-size: var(--u-common-button-extra-small-height, 32px);
    --_small-size: var(--u-common-button-small-height, 40px);
    --_medium-size: var(--u-common-button-medium-height, 56px);
    --_large-size: var(--u-common-button-large-height, 96px);
    --_extra-large-size: var(--u-common-button-extra-large-height, 136px);
    --_extra-small-icon-size: var(--u-icon-button-extra-small-icon-size, 1.25rem);
    --_small-icon-size: var(--u-icon-button-small-icon-size, 1.25rem);
    --_medium-icon-size: var(--u-icon-button-medium-icon-size, 1.5rem);
    --_large-icon-size: var(--u-icon-button-large-icon-size, 2rem);
    --_extra-large-icon-size: var(--u-icon-button-extra-large-icon-size, 2.5rem);
    --_extra-small-icon-margin: var(--u-icon-button-extra-small-icon-margin, 8px);
    --_small-icon-margin: var(--u-icon-button-small-icon-margin, 8px);
    --_medium-icon-margin: var(--u-icon-button-medium-icon-margin, 8px);
    --_large-icon-margin: var(--u-icon-button-large-icon-margin, 12px);
    --_extra-large-icon-margin: var(--u-icon-button-extra-large-icon-margin, 16px);
    --_extra-small-padding: var(--u-common-button-extra-small-padding, 12px);
    --_small-padding: var(--u-common-button-small-padding, 16px);
    --_medium-padding: var(--u-common-button-medium-padding, 24px);
    --_large-padding: var(--u-common-button-large-padding, 48px);
    --_extra-large-padding: var(--u-common-button-extra-large-padding, 64px);
    --_extra-small-square-shape-corner: var(--u-common-button-extra-small-square-shape-corner, 12px);
    --_small-square-shape-corner: var(--u-common-button-small-square-shape-corner, 12px);
    --_medium-square-shape-corner: var(--u-common-button-medium-square-shape-corner, 16px);
    --_large-square-shape-corner: var(--u-common-button-large-square-shape-corner, 28px);
    --_extra-large-square-shape-corner: var(--u-common-button-extra-large-square-shape-corner, 28px);
    --_extra-small-pressed-shape-corner: var(--u-common-button-extra-small-pressed-shape-corner, 8px);
    --_small-pressed-shape-corner: var(--u-common-button-small-pressed-shape-corner, 8px);
    --_medium-pressed-shape-corner: var(--u-common-button-medium-pressed-shape-corner, 12px);
    --_large-pressed-shape-corner: var(--u-common-button-large-pressed-shape-corner, 16px);
    --_extra-large-pressed-shape-corner: var(--u-common-button-extra-large-pressed-shape-corner, 16px);
    --_font-size: var(--_small-font-size);
    --_font-weight: var(--_small-font-weight);
    --_padding: var(--_small-padding);
    --_icon-margin: var(--_small-icon-margin);
    --_round-shape-corner: var(--u-common-button-round-shape-corner, calc(var(--_size) / 2));
  }

  .extra-small {
    --_font-size: var(--_extra-small-font-size);
    --_font-weight: var(--_extra-small-font-weight);
    --_padding: var(--_extra-small-padding);
    --_icon-margin: var(--_extra-small-icon-margin);
  }

  .medium {
    --_font-size: var(--_medium-font-size);
    --_font-weight: var(--_medium-font-weight);
    --_padding: var(--_medium-padding);
    --_icon-margin: var(--_medium-icon-margin);
  }

  .large {
    --_font-size: var(--_large-font-size);
    --_font-weight: var(--_large-font-weight);
    --_padding: var(--_large-padding);
    --_icon-margin: var(--_large-icon-margin);
  }

  .extra-large {
    --_font-size: var(--_extra-large-font-size);
    --_font-weight: var(--_extra-large-font-weight);
    --_padding: var(--_extra-large-padding);
    --_icon-margin: var(--_extra-large-icon-margin);
  }

  .container {
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
    font-size: var(--_font-size);
    font-weight: var(--_font-weight);
    padding-inline: var(--_padding);
    box-sizing: border-box;
  }

  .filled.primary, .filled.primary.selected {
    background-color: var(--u-filled-button-primary-container-color, var(--u-color-primary, rgb(103, 80, 164)));
    color: var(--u-filled-button-primary-text-color, var(--u-color-on-primary, rgb(255, 255, 255)));
  }
  .filled.secondary, .filled.secondary.selected {
    background-color: var(--u-filled-button-secondary-container-color, var(--u-color-secondary, rgb(98, 91, 113)));
    color: var(--u-filled-button-secondary-text-color, var(--u-color-on-secondary, rgb(255, 255, 255)));
  }
  .filled.tertiary, .filled.tertiary.selected {
    background-color: var(--u-filled-button-tertiary-container-color, var(--u-color-tertiary, rgb(125, 82, 96)));
    color: var(--u-filled-button-tertiary-text-color, var(--u-color-on-tertiary, rgb(255, 255, 255)));
  }
  .filled.error, .filled.error.selected {
    background-color: var(--u-filled-button-error-container-color, var(--u-color-error, rgb(179, 38, 30)));
    color: var(--u-filled-button-error-text-color, var(--u-color-on-error, rgb(255, 255, 255)));
  }
  .filled.toggle {
    background-color: var(--u-filled-button-container-unselected-color, var(--u-color-surface-container, rgb(243, 237, 247)));
    color: var(--u-filled-button-unselected-text-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }

  .tonal {
    background-color: var(--u-tonal-button-container-color, var(--u-color-secondary-container, rgb(232, 222, 248)));
    color: var(--u-tonal-button-text-color, var(--u-color-on-secondary-container, rgb(29, 25, 43)));
  }
  .tonal.selected {
    background-color: var(--u-tonal-button-container-selected-color, var(--u-color-secondary, rgb(98, 91, 113)));
    color: var(--u-tonal-button-text-selected-color, var(--u-color-on-secondary, rgb(255, 255, 255)));
  }

  .elevated {
    background-color: var(--u-elevated-button-container-color, var(--u-color-surface-container-low, rgb(247, 242, 250)));
    color: var(--u-elevated-button-text-color, var(--u-color-primary, rgb(103, 80, 164)));
  }
  .elevated.selected {
    background-color: var(--u-elevated-button-container-selected-color, var(--u-color-primary, rgb(103, 80, 164)));
    color: var(--u-elevated-button-text-selected-color, var(--u-color-on-primary, rgb(255, 255, 255)));
  }

  @media (hover: hover) {
    .filled:hover:not(:focus-within):not(:active),
    .tonal:hover:not(:focus-within):not(:active) {
      --u-elevation-level: var(--u-filled-button-hover-elevation-level, 1);
    }
  }
  .text {
    color: var(--u-text-button-text-color, var(--_color-primary));
  }

  .outlined {
    color: var(--u-outlined-button-text-color, var(--u-text-button-text-color, var(--_color-primary)));
    border: 1px solid var(--u-outlined-button-outline-color, var(--u-color-outline, rgb(121, 116, 126)));
  }
  .outlined.selected {
    background-color: var(--u-outlined-button-container-selected-color, var(--u-color-inverse-surface, rgb(50, 47, 53)));
    color: var(--u-outlined-button-text-selected-color, var(--u-color-on-inverse-surface, rgb(245, 239, 247)));
  }
  .outlined.disabled {
    border-color: var(--u-outlined-button-disabled-border-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-outlined-button-disabled-border-opacity, 12%), transparent)) !important;
  }
  .outlined.disabled:not(.selected) {
    background-color: transparent !important;
  }

  .elevated {
    --u-elevation-level: var(--u-elevated-button-elevation-level, 1);
    color: var(--u-elevated-button-text-color, var(--_color-primary));
  }
  @media (hover: hover) {
    .elevated:hover {
      --u-elevation-level: var(--u-elevated-button-hover-elevation-level, 2);
    }
  }

  .container:not(.has-icon) .icon-container {
    display: none;
  }

  .content {
    gap: var(--_icon-margin);
  }

  .icon {
    font-size: var(--_icon-size);
  }

  .trailing-icon .content {
    flex-direction: row-reverse;
  }

  #label {
    display: inline-block;
  }

  .label {
    display: inline-block;
    inset-inline-start: 0;
    transition-duration: calc(var(--_morph-duration) * 0.7);
  }

  .label-container {
    position: relative;
  }
  .label-container.animate {
    transition: width var(--_morph-duration) linear;
  }

  .label-default {
    opacity: 1;
    transition-delay: calc(var(--_morph-duration) / 2);
  }

  .label-selected {
    position: absolute;
    opacity: 0;
    transition-delay: 0ms;
  }

  .selected.has-selection-label .label-default {
    position: absolute;
    opacity: 0;
    transition-delay: 0ms;
  }
  .selected.has-selection-label .label-selected {
    position: static;
    opacity: 1;
    transition-delay: calc(var(--_morph-duration) / 2);
  }
`;

// ../../node_modules/lit-html/directives/if-defined.js
var o6 = (o7) => o7 ?? A;

// ../../node_modules/@universal-material/web/shared/base.styles.js
var styles3 = i2`
  :host,
  * {
    --_focus-ring-color: var(--u-focus-ring-color, var(--u-color-secondary, rgb(98, 91, 113)));
    --_focus-ring-outline-offset: var(--u-focus-ring-outline-offset, 2px);
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
    box-sizing: border-box;
    outline: 0;
  }

  .force-focus-ring .focus-ring,
  :host(.force-focus-ring) .focus-ring,
  .focus-ring:focus-visible {
    animation: u-focus-pulse 500ms ease;
    animation-fill-mode: forwards;
    outline-offset: var(--_focus-ring-outline-offset);
  }

  @keyframes u-focus-pulse {
    0% {
      outline: 0 solid var(--_focus-ring-color);
    }
    50% {
      outline: 6px solid var(--_focus-ring-color);
    }
    100% {
      outline: 4px solid var(--_focus-ring-color);
    }
  }
`;

// ../../node_modules/@universal-material/web/shared/button-wrapper.styles.js
var styles4 = i2`
  :host {
    --_color-primary: var(--u-color-primary, rgb(103, 80, 164));
    -webkit-tap-highlight-color: transparent;
    --u-elevation-level: 0;
    display: inline-block;
  }

  .container {
    position: relative;
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
    appearance: none !important;
  }

  .disabled {
    --u-elevation-level: 0 !important;
    background-color: var(--u-button-disabled-bg-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-button-disabled-background-opacity, 10%), transparent)) !important;
    color: var(--u-button-disabled-text-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-button-disabled-opacity, 38%), transparent)) !important;
  }
  .disabled .button {
    cursor: default;
  }

  * {
    color: inherit;
  }

  u-elevation {
    z-index: -1;
  }

  .button {
    cursor: pointer;
    position: absolute;
    inset-inline-start: 0;
    inset-block-start: 0;
    width: 100%;
    height: 100%;
    font-family: inherit;
    border-radius: inherit;
    color: inherit;
    border: none;
    margin: 0;
    padding: 0;
    text-align: center;
    white-space: nowrap;
    background: transparent;
    user-select: none;
    text-decoration: none;
    outline: 0;
    z-index: 0;
  }

  .content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: inherit;
    width: 100%;
    height: 100%;
  }
`;

// ../../node_modules/@universal-material/web/shared/events/redispatch-event.js
var redispatchEvent = (element, event, newType = null) => {
  if (event.bubbles && (!element.shadowRoot || event.composed)) {
    event.stopPropagation();
  }
  const copy = Reflect.construct(event.constructor, [newType ?? event.type, event]);
  const dispatched = element.dispatchEvent(copy);
  if (!dispatched) {
    event.preventDefault();
  }
  return dispatched;
};

// ../../node_modules/@universal-material/web/elevation/elevation.styles.js
var styles5 = i2`
  :host {
    --_level: var(--u-elevation-level, 0);
    --_shadow-color: var(--u-color-shadow, rgb(0, 0, 0));
    -webkit-tap-highlight-color: transparent;
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
  }
  :host::before, :host::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    transition: box-shadow 150ms ease-in-out;
  }
  :host::before {
    box-shadow: 0 calc(1px * (clamp(0, var(--_level), 1) + clamp(0, var(--_level) - 3, 1) + 2 * clamp(0, var(--_level) - 4, 1))) calc(1px * (2 * clamp(0, var(--_level), 1) + clamp(0, var(--_level) - 2, 1) + clamp(0, var(--_level) - 4, 1))) 0 var(--_shadow-color);
    opacity: 0.3;
  }
  :host::after {
    box-shadow: 0 calc(1px * (clamp(0, var(--_level), 1) + clamp(0, var(--_level) - 1, 1) + 2 * clamp(0, var(--_level) - 2, 3))) calc(1px * (3 * clamp(0, var(--_level), 2) + 2 * clamp(0, var(--_level) - 2, 3))) calc(1px * (clamp(0, var(--_level), 4) + 2 * clamp(0, var(--_level) - 4, 1))) var(--_shadow-color);
    opacity: 0.15;
  }
`;

// ../../node_modules/@universal-material/web/elevation/elevation.js
var Elevation = class Elevation2 extends i5 {
  static {
    this.styles = styles5;
  }
  connectedCallback() {
    super.connectedCallback();
    this.ariaHidden = "true";
  }
};
Elevation = __decorate([
  t3("u-elevation")
], Elevation);

// ../../node_modules/@universal-material/web/shared/button-wrapper.js
var ButtonWrapper = class extends i5 {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.renderRipple = true;
    this.innerRole = null;
  }
  static {
    this.styles = [styles3, styles4];
  }
  get pathname() {
    return this.buttonElement?.pathname;
  }
  render() {
    const contents = typeof this.href === "string" ? this.#renderLink() : this.#renderButton();
    const containerClasses = e7(this._getContainerClasses());
    return b3`<div class="container ${containerClasses}" part="container"> ${contents}</div>`;
  }
  _getContainerClasses() {
    return { disabled: this.disabled };
  }
  #renderButton() {
    return b3`
      <div class="content">${this._renderContent()}</div>
      <button
        id="button"
        class="button focus-ring"
        ?disabled=${this.disabled}
        aria-label=${this.getAriaLabel() || A}
        aria-labelledby="${this.getAriaLabel() ? A : "text"}"
        .role=${this.innerRole}
        type="button"
        @click=${this.#innerClickHandler}>
        <u-ripple ?disabled=${this.disabled || !this.renderRipple}></u-ripple>
        <u-elevation></u-elevation>
      </button>
    `;
  }
  #renderLink() {
    return b3`
      <div class="content">${this._renderContent()}</div>
      <a
        id="link"
        class="button"
        href=${this.disabled ? A : o6(this.href)}
        aria-disabled=${this.disabled || A}
        aria-label=${this.ariaLabel || A}
        aria-labelledby="${this.ariaLabel ? A : "text"}"
        .role=${this.innerRole}
        target=${this.target || A}
        @click=${this.#innerClickHandler}>
        <u-elevation></u-elevation>
        <u-ripple ?disabled=${this.disabled || !this.renderRipple}></u-ripple>
      </a>
    `;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("focus", this.#innerFocusHandler);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("focus", this.#innerFocusHandler);
  }
  focus() {
    this.buttonElement?.focus();
  }
  blur() {
    this.buttonElement?.blur();
  }
  getAriaLabel() {
    return this.ariaLabel;
  }
  #innerFocusHandler() {
    const tabIndexAttributeValue = this.getAttribute("tabindex");
    if (tabIndexAttributeValue !== "0") {
      return;
    }
    this.removeAttribute("tabindex");
    setTimeout(() => this.buttonElement?.focus());
  }
  #innerClickHandler(event) {
    if (this.disabled) {
      return;
    }
    const preventDefault = !redispatchEvent(this, event);
    if (preventDefault) {
      return;
    }
    if (!event.pointerType) {
      this._ripple.createRipple();
    }
    this._handleClick(event);
  }
  _handleClick(_2) {
  }
};
__decorate([
  n4({ type: Boolean, reflect: true })
], ButtonWrapper.prototype, "disabled", void 0);
__decorate([
  r5()
], ButtonWrapper.prototype, "renderRipple", void 0);
__decorate([
  n4()
], ButtonWrapper.prototype, "href", void 0);
__decorate([
  n4()
], ButtonWrapper.prototype, "target", void 0);
__decorate([
  n4()
], ButtonWrapper.prototype, "name", void 0);
__decorate([
  e5(".button")
], ButtonWrapper.prototype, "buttonElement", void 0);
__decorate([
  e5("u-ripple")
], ButtonWrapper.prototype, "_ripple", void 0);

// ../../node_modules/@universal-material/web/button/button-base.styles.js
var styles6 = i2`
  :host {
    --_morph-duration: var(--u-button-morph-duration, 125ms);
  }

  .container {
    transition: background-color var(--_morph-duration) linear, border-radius var(--_morph-duration) linear, color var(--_morph-duration) linear;
  }

  .icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 1em;
    height: 1em;
    line-height: 1em;
  }

  ::slotted([slot=icon]) {
    display: inline-block;
  }
`;

// ../../node_modules/@universal-material/web/button/button-base.js
var ButtonBase = class extends ButtonWrapper {
  static {
    this.formAssociated = true;
  }
  static {
    this.styles = [ButtonWrapper.styles, styles6];
  }
  get form() {
    return this.#elementInternals.form;
  }
  #elementInternals;
  constructor() {
    super();
    this.type = "submit";
    this.value = "";
    this.#elementInternals = this.attachInternals();
  }
  _handleClick(_2) {
    if (this.type === "button" || !!this.href) {
      return;
    }
    if (!this.form) {
      return;
    }
    this.#elementInternals.setFormValue(this.value);
    if (this.type === "reset") {
      this.form.reset();
      return;
    }
    this.form.addEventListener("submit", (submitEvent) => {
      Object.defineProperty(submitEvent, "submitter", {
        configurable: true,
        enumerable: true,
        get: () => this
      });
    }, { capture: true, once: true });
    this.form.requestSubmit();
  }
};
__decorate([
  n4()
], ButtonBase.prototype, "type", void 0);
__decorate([
  n4({ reflect: true })
], ButtonBase.prototype, "value", void 0);

// ../../node_modules/@universal-material/web/button/toggle-button.styles.js
var styles7 = i2`
  :host {
    --_size: var(--_small-size);
    --_square-shape-corner: var(--_small-square-shape-corner);
    --_pressed-shape-corner: var(--_small-pressed-shape-corner);
    --_icon-size: var(--_small-icon-size);
  }

  .extra-small {
    --_size: var(--_extra-small-size);
    --_icon-size: var(--_extra-small-icon-size);
    --_square-shape-corner: var(--_extra-small-square-shape-corner);
    --_pressed-shape-corner: var(--_extra-small-pressed-shape-corner);
  }

  .medium {
    --_size: var(--_medium-size);
    --_icon-size: var(--_medium-icon-size);
    --_square-shape-corner: var(--_medium-square-shape-corner);
    --_pressed-shape-corner: var(--_medium-pressed-shape-corner);
  }

  .large {
    --_size: var(--_large-size);
    --_icon-size: var(--_large-icon-size);
    --_square-shape-corner: var(--_large-square-shape-corner);
    --_pressed-shape-corner: var(--_large-pressed-shape-corner);
  }

  .extra-large {
    --_size: var(--_extra-large-size);
    --_icon-size: var(--_extra-large-icon-size);
    --_square-shape-corner: var(--_extra-large-square-shape-corner);
    --_pressed-shape-corner: var(--_extra-large-pressed-shape-corner);
  }

  .container {
    height: var(--_size);
  }

  .round {
    border-radius: var(--_round-shape-corner);
  }

  .square {
    border-radius: var(--_square-shape-corner);
  }

  .selected.toggle-shape.round {
    border-radius: var(--_square-shape-corner);
  }
  .selected.toggle-shape.square {
    border-radius: var(--_round-shape-corner);
  }

  :host(:active) .toggle-shape:not(.disabled) {
    border-radius: var(--_pressed-shape-corner);
  }

  .icon-container {
    position: relative;
    width: var(--_icon-size);
    height: 1px;
  }

  .icon-default {
    opacity: 1;
  }

  .icon-selected {
    opacity: 0;
    transition-delay: calc(var(--_morph-duration) / 2);
  }

  .selected.selection-icon .icon-default {
    opacity: 0;
    transition-delay: 0ms;
  }
  .selected.selection-icon .icon-selected {
    opacity: 1;
    transition-delay: calc(var(--_morph-duration) / 2);
  }

  .icon {
    position: absolute;
    top: 50%;
    left: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: var(--_icon-size);
    transform: translate3d(-50%, -50%, 0);
    transition: opacity var(--_morph-duration) linear;
  }
`;

// ../../node_modules/@universal-material/web/button/toggle-button.js
var ToggleButton = class extends ButtonBase {
  constructor() {
    super(...arguments);
    this.toggle = false;
    this.toggleShape = false;
    this.selected = false;
    this.shape = "round";
    this.size = "small";
    this.ariaLabelSelected = "";
    this._hasSelectionIcon = false;
  }
  static {
    this.styles = [ButtonBase.styles, styles7];
  }
  _getContainerClasses() {
    return {
      ...super._getContainerClasses(),
      [this.shape]: true,
      [this.size]: true,
      selected: this.selected,
      toggle: this.toggle,
      "toggle-shape": this.toggleShape,
      "selection-icon": this._hasSelectionIcon
    };
  }
  _handleClick(event) {
    super._handleClick(event);
    if (!this.toggle) {
      return;
    }
    this.selected = !this.selected;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }
  getAriaLabel() {
    return this.selected ? this.ariaLabelSelected || super.getAriaLabel() : super.getAriaLabel();
  }
  _handleSelectedIconSlotChange(e8) {
    this._hasSelectionIcon = e8.target.assignedElements({ flatten: true }).length > 0;
  }
};
__decorate([
  n4({ type: Boolean, reflect: true })
], ToggleButton.prototype, "toggle", void 0);
__decorate([
  n4({ attribute: "toggle-shape", type: Boolean, reflect: true })
], ToggleButton.prototype, "toggleShape", void 0);
__decorate([
  n4({ type: Boolean, reflect: true })
], ToggleButton.prototype, "selected", void 0);
__decorate([
  n4({ reflect: true })
], ToggleButton.prototype, "shape", void 0);
__decorate([
  n4({ reflect: true })
], ToggleButton.prototype, "size", void 0);
__decorate([
  n4({ attribute: "aria-label-selected" })
], ToggleButton.prototype, "ariaLabelSelected", void 0);
__decorate([
  r5()
], ToggleButton.prototype, "_hasSelectionIcon", void 0);

// ../../node_modules/@universal-material/web/button/button.js
var Button = class Button2 extends ToggleButton {
  constructor() {
    super(...arguments);
    this.variant = "filled";
    this.color = "primary";
    this.trailingIcon = false;
    this._hasIcon = false;
    this._hasSelectionLabel = false;
    this.animateTextChange = false;
  }
  static {
    this.styles = [ToggleButton.styles, styles2];
  }
  #textSizeObserver;
  firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this.#textSizeObserver = new ResizeObserver(() => this.#setTextWrapperWidth());
    this.#textSizeObserver.observe(this._text);
    this.#setTextWrapperWidth();
  }
  #setTextWrapperWidth() {
    const width = `${this._text.offsetWidth}px`;
    this._textWrapper.style.width = width;
    const animateTextChange = !!parseInt(width, 10);
    if (this.animateTextChange === animateTextChange) {
      return;
    }
    setTimeout(() => this.animateTextChange = animateTextChange);
  }
  _getContainerClasses() {
    return {
      ...super._getContainerClasses(),
      [this.color]: true,
      [this.variant]: true,
      "trailing-icon": this.trailingIcon,
      "has-icon": this._hasIcon,
      "has-selection-label": this._hasSelectionLabel
    };
  }
  _renderContent() {
    const labelContainerClasses = { animate: this.animateTextChange };
    return b3`
      <span class="icon-container" aria-hidden="true">
        <span class="icon icon-default">
          <slot name="icon" @slotchange="${this.#handleIconSlotChange}"></slot>
        </span>
        <span class="icon icon-selected">
          <slot name="icon-selected" @slotchange="${this._handleSelectedIconSlotChange}"></slot>
        </span>
      </span>

      <span class="label-container ${e7(labelContainerClasses)}">
        <span id="label">
          <span class="label label-default">
            <slot></slot>
          </span>
          <span class="label label-selected">
            <slot name="label-selected" @slotchange="${this.#handleSelectedLabelSlotChange}"></slot>
          </span>
        </span>
      </span>
    `;
  }
  #handleIconSlotChange(e8) {
    this._hasIcon = e8.target.assignedElements({ flatten: true }).length > 0;
  }
  #handleSelectedLabelSlotChange(e8) {
    this._hasSelectionLabel = e8.target.assignedElements({ flatten: true }).length > 0;
  }
};
__decorate([
  n4()
], Button.prototype, "variant", void 0);
__decorate([
  n4()
], Button.prototype, "color", void 0);
__decorate([
  n4({ type: Boolean, attribute: "trailing-icon", reflect: true })
], Button.prototype, "trailingIcon", void 0);
__decorate([
  r5()
], Button.prototype, "_hasIcon", void 0);
__decorate([
  r5()
], Button.prototype, "_hasSelectionLabel", void 0);
__decorate([
  r5()
], Button.prototype, "animateTextChange", void 0);
__decorate([
  e5(".label-container", true)
], Button.prototype, "_textWrapper", void 0);
__decorate([
  e5("#label", true)
], Button.prototype, "_text", void 0);
Button = __decorate([
  t3("u-button")
], Button);

// ../../node_modules/@universal-material/web/button/icon-button.styles.js
var styles8 = i2`
  :host {
    --_round-shape-corner: var(--u-icon-button-round-shape-corner, calc(var(--_size) / 2));
    --_square-shape-corner: var(--u-icon-button-square-shape-corner, 12px);
    --_extra-small-size: var(--u-icon-button-extra-small-size, 32px);
    --_small-size: var(--u-icon-button-small-size, 40px);
    --_medium-size: var(--u-icon-button-medium-size, 56px);
    --_large-size: var(--u-icon-button-large-size, 96px);
    --_extra-large-size: var(--u-icon-button-extra-large-size, 136px);
    --_extra-small-narrow-width: var(--u-icon-button-extra-small-narrow-width, 28px);
    --_small-narrow-width: var(--u-icon-button-small-narrow-width, 32px);
    --_medium-narrow-width: var(--u-icon-button-medium-narrow-width, 48px);
    --_large-narrow-width: var(--u-icon-button-large-narrow-width, 64px);
    --_extra-large-narrow-width: var(--u-icon-button-extra-large-narrow-width, 104px);
    --_extra-small-wide-width: var(--u-icon-button-extra-small-wide-width, 40px);
    --_small-wide-width: var(--u-icon-button-small-wide-width, 52px);
    --_medium-wide-width: var(--u-icon-button-medium-wide-width, 72px);
    --_large-wide-width: var(--u-icon-button-large-wide-width, 128px);
    --_extra-large-wide-width: var(--u-icon-button-extra-large-wide-width, 184px);
    --_extra-small-icon-size: var(--u-icon-button-extra-small-icon-size, 1.25rem);
    --_small-icon-size: var(--u-icon-button-small-icon-size, 1.5rem);
    --_medium-icon-size: var(--u-icon-button-medium-icon-size, 1.5rem);
    --_large-icon-size: var(--u-icon-button-large-icon-size, 2rem);
    --_extra-large-icon-size: var(--u-icon-button-extra-large-icon-size, 2.5rem);
    --_extra-small-square-shape-corner: var(--u-icon-button-extra-small-square-shape-corner, 12px);
    --_small-square-shape-corner: var(--u-icon-button-small-square-shape-corner, 12px);
    --_medium-square-shape-corner: var(--u-icon-button-medium-square-shape-corner, 16px);
    --_large-square-shape-corner: var(--u-icon-button-large-square-shape-corner, 28px);
    --_extra-large-square-shape-corner: var(--u-icon-button-extra-large-square-shape-corner, 28px);
    --_extra-small-pressed-shape-corner: var(--u-icon-button-extra-small-pressed-shape-corner, 8px);
    --_small-pressed-shape-corner: var(--u-icon-button-small-pressed-shape-corner, 8px);
    --_medium-pressed-shape-corner: var(--u-icon-button-medium-pressed-shape-corner, 12px);
    --_large-pressed-shape-corner: var(--u-icon-button-large-pressed-shape-corner, 16px);
    --_extra-large-pressed-shape-corner: var(--u-icon-button-extra-large-pressed-shape-corner, 16px);
    --_narrow-width: var(--_small-narrow-width);
    --_wide-width: var(--_small-wide-width);
  }

  .container {
    width: var(--_size);
    height: var(--_size);
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
  }

  .extra-small {
    --_narrow-width: var(--_extra-small-narrow-width);
    --_wide-width: var(--_extra-small-wide-width);
  }

  .medium {
    --_narrow-width: var(--_medium-narrow-width);
    --_wide-width: var(--_medium-wide-width);
  }

  .large {
    --_narrow-width: var(--_large-narrow-width);
    --_wide-width: var(--_large-wide-width);
  }

  .extra-large {
    --_narrow-width: var(--_extra-large-narrow-width);
    --_wide-width: var(--_extra-large-wide-width);
  }

  .narrow {
    width: var(--_narrow-width);
  }

  .wide {
    width: var(--_wide-width);
  }

  .filled, .filled.selected {
    background-color: var(--u-filled-icon-button-container-color, var(--u-color-primary, rgb(103, 80, 164)));
    color: var(--u-filled-icon-button-text-color, var(--u-color-on-primary, rgb(255, 255, 255)));
  }
  .filled.toggle {
    background-color: var(--u-filled-icon-button-unselected-container-color, var(--u-color-surface-container, rgb(243, 237, 247)));
    color: var(--u-filled-icon-button-unselected-text-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }

  .tonal {
    background-color: var(--u-total-icon-button-unselected-container-color, var(--u-color-secondary-container, rgb(232, 222, 248)));
    color: var(--u-tonal-icon-button-unselected-text-color, var(--u-color-on-secondary-container, rgb(29, 25, 43)));
  }
  .tonal.selected {
    background-color: var(--u-tonal-icon-button-container-color, var(--u-color-secondary, rgb(98, 91, 113)));
    color: var(--u-tonal-icon-button-text-color, var(--u-color-on-secondary, rgb(255, 255, 255)));
  }

  .standard {
    color: var(--u-standard-icon-button-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }
  .standard.selected {
    color: var(--u-standard-icon-button-selected-text-color, var(--u-color-primary, rgb(103, 80, 164)));
    background-color: var(--u-standard-icon-button-selected-container-color, transparent);
  }

  .outlined {
    color: var(--u-outlined-icon-button-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }
  .outlined, .outlined.selected.disabled {
    border: 1px solid var(--u-color-outline-variant, rgb(202, 196, 208));
  }
  .outlined.selected {
    border: none;
    background-color: var(--u-outlined-icon-button-selected-container-color, var(--u-color-inverse-surface, rgb(50, 47, 53)));
    color: var(--u-outlined-icon-button-selected-text-color, var(--u-color-on-inverse-surface, rgb(245, 239, 247)));
  }
  .outlined.disabled {
    color: var(--u-outlined-icon-button-disabled-icon-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-outlined-icon-button-disabled-border-opacity, 10%), transparent)) !important;
  }
`;

// ../../node_modules/@universal-material/web/button/icon-button.js
var IconButton = class IconButton2 extends ToggleButton {
  constructor() {
    super(...arguments);
    this.variant = "standard";
    this.width = "default";
  }
  static {
    this.styles = [ToggleButton.styles, styles8];
  }
  _getContainerClasses() {
    return {
      ...super._getContainerClasses(),
      [this.variant]: true,
      [this.width]: true
    };
  }
  _renderContent() {
    return b3`
      <span class="icon-container" aria-hidden="true">
        <span class="icon icon-default">
          <slot></slot>
        </span>
        <span class="icon icon-selected">
          <slot name="selected" @slotchange="${this._handleSelectedIconSlotChange}"></slot>
        </span>
      </span>
    `;
  }
};
__decorate([
  n4()
], IconButton.prototype, "variant", void 0);
__decorate([
  n4()
], IconButton.prototype, "width", void 0);
IconButton = __decorate([
  t3("u-icon-button")
], IconButton);

// demo/main.ts
var us = document.getElementById("us");
var $2 = (id) => document.getElementById(id);
var titleInput = $2("docTitle");
var MODE_LABELS = { auto: "Autom\xE1tico", light: "Claro", dark: "Escuro", black: "Escuro total" };
var MODE_ICONS = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode", black: "bedtime" };
var colorMode = "auto";
var prefersDark = matchMedia("(prefers-color-scheme: dark)");
var applyMode = (m2) => {
  colorMode = m2;
  document.documentElement.style.colorScheme = m2 === "auto" ? "light dark" : m2 === "light" ? "light" : "dark";
  $2("darkToggleIcon").textContent = MODE_ICONS[m2];
  localStorage.setItem("us-mode", m2);
};
prefersDark.addEventListener("change", () => {
  if (colorMode === "auto") applyMode("auto");
});
$2("darkToggle").addEventListener("mousedown", (e8) => e8.preventDefault());
$2("darkToggle").addEventListener("click", (e8) => {
  e8.stopPropagation();
  const item = (m2) => ({ label: MODE_LABELS[m2], checked: colorMode === m2, onClick: () => applyMode(m2) });
  openMenu([item("auto"), item("light"), item("dark"), item("black")], { anchor: $2("darkToggle") });
});
var accentMenu = $2("accentMenu");
var applyAccent = (a3) => {
  applyGeneratedTheme(a3);
  accentMenu.querySelectorAll(".accent-sw").forEach((b5) => b5.classList.toggle("sel", b5.dataset.accent === (a3 || "neutral")));
};
$2("accentBtn").addEventListener("click", (e8) => {
  e8.stopPropagation();
  if (accentMenu.style.display !== "none") {
    accentMenu.style.display = "none";
    return;
  }
  const r6 = $2("accentBtn").getBoundingClientRect();
  accentMenu.style.display = "grid";
  accentMenu.style.top = `${r6.bottom + 6}px`;
  accentMenu.style.left = `${Math.max(8, r6.right - accentMenu.offsetWidth)}px`;
});
accentMenu.querySelectorAll(".accent-sw").forEach(
  (b5) => b5.addEventListener("click", () => {
    applyAccent(b5.dataset.accent);
    localStorage.setItem("us-accent", b5.dataset.accent);
    accentMenu.style.display = "none";
  })
);
document.addEventListener("mousedown", (e8) => {
  if (accentMenu.style.display !== "none" && !accentMenu.contains(e8.target) && !e8.target?.closest?.("#accentBtn")) accentMenu.style.display = "none";
});
var menus = [["menuFile", "ddFile"], ["menuInsert", "ddInsert"], ["menuFormat", "ddFormat"]];
for (const [btn, dd] of menus) {
  $2(btn).addEventListener("click", (e8) => {
    e8.stopPropagation();
    const open = $2(dd).classList.contains("show");
    closeMenus();
    if (!open) {
      $2(dd).classList.add("show");
      $2(btn).classList.add("open");
    }
  });
}
function closeMenus() {
  for (const [btn, dd] of menus) {
    $2(dd).classList.remove("show");
    $2(btn).classList.remove("open");
  }
}
document.addEventListener("click", closeMenus);
var fileHandle = null;
function setTitle(name) {
  titleInput.value = name.replace(/\.xlsx$/i, "");
  document.title = `${titleInput.value} \u2014 Universal Sheet`;
}
function flashStatus(msg) {
  const st = $2("status");
  const prev = st.textContent;
  st.textContent = msg;
  setTimeout(() => {
    st.textContent = prev;
  }, 1800);
}
function downloadBlob(data, filename, type) {
  const a3 = document.createElement("a");
  a3.href = URL.createObjectURL(new Blob([data], { type }));
  a3.download = filename;
  a3.click();
  setTimeout(() => URL.revokeObjectURL(a3.href), 4e3);
}
function openBytes(bytes, name) {
  try {
    us.loadXlsx(bytes);
  } catch {
    flashStatus(`\u26A0 "${name}" n\xE3o \xE9 uma planilha v\xE1lida`);
    return;
  }
  fileHandle = null;
  setTitle(name);
  renderTabs();
  flashStatus(`"${name}" aberto \u2713`);
}
async function actionOpen() {
  closeMenus();
  if ("showOpenFilePicker" in window) {
    try {
      const [h3] = await window.showOpenFilePicker({
        types: [{ description: "Planilha", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } }]
      });
      const file = await h3.getFile();
      fileHandle = h3;
      openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      return;
    } catch {
      return;
    }
  }
  $2("xlsxFile").click();
}
$2("xlsxFile").addEventListener("change", async (e8) => {
  const file = e8.target.files?.[0];
  if (file) openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  e8.target.value = "";
});
async function actionSave(saveAs) {
  closeMenus();
  const bytes = us.saveXlsx();
  const suggested = `${titleInput.value || "Pasta"}.xlsx`;
  if ("showSaveFilePicker" in window) {
    try {
      if (!fileHandle || saveAs) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{ description: "Planilha", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } }]
        });
      }
      const w2 = await fileHandle.createWritable();
      await w2.write(new Blob([bytes.buffer]));
      await w2.close();
      flashStatus("Salvo \u2713");
      return;
    } catch {
      return;
    }
  }
  downloadBlob(
    bytes.buffer,
    suggested,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  flashStatus("Baixado .xlsx \u2713");
}
$2("actNew").addEventListener("click", () => {
  closeMenus();
  flashStatus("Novo: em breve");
});
$2("actOpen").addEventListener("click", () => void actionOpen());
$2("actSave").addEventListener("click", () => void actionSave(false));
$2("saveBtn").addEventListener("click", () => void actionSave(false));
$2("actSaveAs").addEventListener("click", () => void actionSave(true));
$2("actExportCsv").addEventListener("click", () => {
  closeMenus();
  flashStatus("Exportar CSV: em breve");
});
$2("actPrint").addEventListener("click", () => {
  closeMenus();
  window.print();
});
titleInput.addEventListener("change", () => {
  document.title = `${titleInput.value} \u2014 Universal Sheet`;
});
document.addEventListener("keydown", (e8) => {
  if (!(e8.ctrlKey || e8.metaKey)) return;
  const k2 = e8.key.toLowerCase();
  if (k2 === "o") {
    e8.preventDefault();
    void actionOpen();
  }
  if (k2 === "s") {
    e8.preventDefault();
    void actionSave(e8.shiftKey);
  }
  if (k2 === "p") {
    e8.preventDefault();
    window.print();
  }
});
var dragDepth = 0;
document.addEventListener("dragenter", (e8) => {
  e8.preventDefault();
  dragDepth++;
  $2("dropOverlay").classList.add("show");
});
document.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $2("dropOverlay").classList.remove("show");
  }
});
document.addEventListener("dragover", (e8) => e8.preventDefault());
document.addEventListener("drop", async (e8) => {
  e8.preventDefault();
  dragDepth = 0;
  $2("dropOverlay").classList.remove("show");
  const file = e8.dataTransfer?.files?.[0];
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name) || bytes[0] === 80 && bytes[1] === 75) openBytes(bytes, file.name);
  else flashStatus(`\u26A0 "${file.name}" n\xE3o parece ser .xlsx`);
});
function renderTabs() {
  const names = us.getSheetNames();
  const host = $2("sheetTabs");
  host.replaceChildren();
  names.forEach((n5, i7) => {
    const b5 = document.createElement("button");
    b5.className = "tab" + (i7 === 0 ? " active" : "");
    b5.textContent = n5;
    b5.addEventListener("click", () => {
      us.selectSheet(i7);
      host.querySelectorAll(".tab").forEach((t5) => t5.classList.remove("active"));
      b5.classList.add("active");
    });
    host.appendChild(b5);
  });
  const add = document.createElement("button");
  add.className = "add";
  add.title = "Nova planilha";
  add.innerHTML = '<span class="micon" style="font-size:18px">add</span>';
  add.addEventListener("click", () => flashStatus("Nova planilha: em breve"));
  host.appendChild(add);
}
var cellRef = $2("cellRef");
var fxInput = $2("fxInput");
us.addEventListener("us-selection", ((e8) => {
  cellRef.value = e8.detail.ref;
  fxInput.value = e8.detail.formula || e8.detail.display || "";
}));
cellRef.addEventListener("change", () => {
  try {
    us.goToRef(cellRef.value.trim().toUpperCase());
  } catch {
  }
});
var zoomSlider = $2("zoom");
var zoomLabel = $2("zoomLabel");
var zoom = 1;
var showZoom = (z2) => {
  zoom = z2;
  const pct = Math.round(z2 * 100);
  zoomSlider.value = String(pct);
  zoomLabel.textContent = `${pct}%`;
  $2("zoomNum").textContent = `${pct}%`;
};
zoomSlider.addEventListener("input", () => us.setZoom(parseInt(zoomSlider.value, 10) / 100));
$2("zoomOut").addEventListener("click", () => us.setZoom(zoom / 1.1));
$2("zoomIn").addEventListener("click", () => us.setZoom(zoom * 1.1));
us.addEventListener("us-zoom", ((e8) => showZoom(e8.detail.zoom)));
var ZOOMS = [50, 75, 90, 100, 125, 150, 200];
$2("zoomMenu").addEventListener("click", (e8) => {
  e8.stopPropagation();
  openMenu(ZOOMS.map((z2) => ({ label: `${z2}%`, checked: z2 === Math.round(zoom * 100), onClick: () => us.setZoom(z2 / 100) })), { anchor: $2("zoomMenu") });
});
var soon = (id) => {
  $2(id).addEventListener("click", () => flashStatus("Edi\xE7\xE3o de c\xE9lulas: em breve"));
};
for (const id of [
  "undo",
  "redo",
  "bold",
  "italic",
  "underline",
  "shrink",
  "grow",
  "merge",
  "borders",
  "alignMenu",
  "valignMenu",
  "wrap",
  "numFmtMenu",
  "percent",
  "currency",
  "condFormat",
  "filter",
  "actInsChart",
  "actInsFunc",
  "actInsLink",
  "actFmtCells",
  "actFmtRowH",
  "actFmtColW",
  "actFmtSheet"
]) {
  if ($2(id)) soon(id);
}
$2("print").addEventListener("click", () => window.print());
var onSel = (id, fn) => $2(id).addEventListener("change", (e8) => fn(e8.target.value));
onSel("font", () => flashStatus("Fonte: em breve"));
$2("colorBtn").addEventListener("click", () => $2("color").click());
$2("color").addEventListener("change", (e8) => {
  const v2 = e8.target.value;
  $2("colorBar").style.background = v2;
  flashStatus("Cor do texto: em breve");
});
$2("fillBtn").addEventListener("click", () => $2("fill").click());
$2("fill").addEventListener("change", (e8) => {
  const v2 = e8.target.value;
  $2("fillBar").style.background = v2;
  flashStatus("Preenchimento: em breve");
});
for (const btn of document.querySelectorAll("footer [data-view]")) {
  btn.addEventListener("click", () => {
    document.querySelectorAll("footer [data-view]").forEach((b5) => b5.classList.remove("active"));
    btn.classList.add("active");
    if (btn.dataset.view !== "normal") flashStatus("Modos de exibi\xE7\xE3o: em breve");
  });
}
applyAccent(localStorage.getItem("us-accent") || "green");
applyMode(localStorage.getItem("us-mode") || "auto");
rippleAll(document, "#toolbarRow .tb-g button, footer [data-view]");
(async () => {
  try {
    const res = await fetch("/samples/showcase.xlsx");
    if (res.ok) {
      openBytes(new Uint8Array(await res.arrayBuffer()), "showcase.xlsx");
      us.setZoom(1);
    }
  } catch {
  }
})();
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
lit-html/directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@material/material-color-utilities/utils/math_utils.js:
@material/material-color-utilities/utils/color_utils.js:
@material/material-color-utilities/hct/viewing_conditions.js:
@material/material-color-utilities/hct/cam16.js:
@material/material-color-utilities/hct/hct_solver.js:
@material/material-color-utilities/hct/hct.js:
@material/material-color-utilities/blend/blend.js:
@material/material-color-utilities/palettes/tonal_palette.js:
@material/material-color-utilities/palettes/core_palette.js:
@material/material-color-utilities/quantize/lab_point_provider.js:
@material/material-color-utilities/quantize/quantizer_wsmeans.js:
@material/material-color-utilities/quantize/quantizer_map.js:
@material/material-color-utilities/quantize/quantizer_wu.js:
@material/material-color-utilities/quantize/quantizer_celebi.js:
@material/material-color-utilities/scheme/scheme.js:
@material/material-color-utilities/scheme/scheme_android.js:
@material/material-color-utilities/score/score.js:
@material/material-color-utilities/utils/string_utils.js:
@material/material-color-utilities/utils/image_utils.js:
@material/material-color-utilities/utils/theme_utils.js:
@material/material-color-utilities/index.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/contrast/contrast.js:
@material/material-color-utilities/dynamiccolor/dynamic_color.js:
@material/material-color-utilities/dynamiccolor/variant.js:
@material/material-color-utilities/dynamiccolor/material_dynamic_colors.js:
@material/material-color-utilities/dynamiccolor/dynamic_scheme.js:
@material/material-color-utilities/scheme/scheme_expressive.js:
@material/material-color-utilities/scheme/scheme_fruit_salad.js:
@material/material-color-utilities/scheme/scheme_monochrome.js:
@material/material-color-utilities/scheme/scheme_neutral.js:
@material/material-color-utilities/scheme/scheme_rainbow.js:
@material/material-color-utilities/scheme/scheme_tonal_spot.js:
@material/material-color-utilities/scheme/scheme_vibrant.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/dislike/dislike_analyzer.js:
@material/material-color-utilities/dynamiccolor/contrast_curve.js:
@material/material-color-utilities/dynamiccolor/tone_delta_pair.js:
@material/material-color-utilities/temperature/temperature_cache.js:
@material/material-color-utilities/scheme/scheme_content.js:
@material/material-color-utilities/scheme/scheme_fidelity.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

lit-html/directives/class-map.js:
lit-html/directives/if-defined.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
