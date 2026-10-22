import {
  subsetTrueType
} from "./chunk-4FTRJ73Y.js";
import {
  DEFAULT_RUN_PROPS,
  WORD_PATTERNS,
  blipFxImageEffects,
  dmlColorSpec,
  editBaseProps,
  forEachTextbox,
  oneColorGradientColor2,
  paraPropsFromPPr,
  resolveColor2,
  revisionAuthors,
  runPropsFromRPr,
  unzlibSync,
  zlibSync
} from "./chunk-NPDEUMTK.js";

// ../../../shared/drawingml/src/preset-defs.ts
var PRESET_DEFS = {
  accentBorderCallout1: "adj1=val 18750;adj2=val -8333;adj3=val 112500;adj4=val -38333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000|,,,~M l t;L r t;L r b;L l b;Z#,,none,~M x1 t;Z;L x1 b#,,none,~M x1 y1;L x2 y2|l t r b",
  accentBorderCallout2: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 112500;adj6=val -46667|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000|,,,~M l t;L r t;L r b;L l b;Z#,,none,~M x1 t;Z;L x1 b#,,none,~M x1 y1;L x2 y2;L x3 y3|l t r b",
  accentBorderCallout3: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 100000;adj6=val -16667;adj7=val 112963;adj8=val -8333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000;y4=*/ h adj7 100000;x4=*/ w adj8 100000|,,,~M l t;L r t;L r b;L l b;Z#,,none,~M x1 t;Z;L x1 b#,,none,~M x1 y1;L x2 y2;L x3 y3;L x4 y4|l t r b",
  accentCallout1: "adj1=val 18750;adj2=val -8333;adj3=val 112500;adj4=val -38333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000|,,,false~M l t;L r t;L r b;L l b;Z#,,none,~M x1 t;Z;L x1 b#,,none,~M x1 y1;L x2 y2|l t r b",
  accentCallout2: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 112500;adj6=val -46667|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000|,,,false~M l t;L r t;L r b;L l b;Z#,,none,~M x1 t;Z;L x1 b#,,none,~M x1 y1;L x2 y2;L x3 y3|l t r b",
  accentCallout3: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 100000;adj6=val -16667;adj7=val 112963;adj8=val -8333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000;y4=*/ h adj7 100000;x4=*/ w adj8 100000|,,,false~M l t;L r t;L r b;L l b;Z#,,none,~M x1 t;Z;L x1 b#,,none,~M x1 y1;L x2 y2;L x3 y3;L x4 y4|l t r b",
  actionButtonBackPrevious: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0|,,,false~M l t;L r t;L r b;L l b;Z;M g11 vc;L g12 g9;L g12 g10;Z#,,darken,false~M g11 vc;L g12 g9;L g12 g10;Z#,,none,~M g11 vc;L g12 g9;L g12 g10;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonBeginning: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0;g13=*/ ss 3 4;g14=*/ g13 1 8;g15=*/ g13 1 4;g16=+- g11 g14 0;g17=+- g11 g15 0|,,,false~M l t;L r t;L r b;L l b;Z;M g17 vc;L g12 g9;L g12 g10;Z;M g16 g9;L g11 g9;L g11 g10;L g16 g10;Z#,,darken,false~M g17 vc;L g12 g9;L g12 g10;Z;M g16 g9;L g11 g9;L g11 g10;L g16 g10;Z#,,none,~M g17 vc;L g12 g9;L g12 g10;Z;M g16 g9;L g16 g10;L g11 g10;L g11 g9;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonBlank: "||,,,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonDocument: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;dx1=*/ ss 9 32;g11=+- hc 0 dx1;g12=+- hc dx1 0;g13=*/ ss 3 16;g14=+- g12 0 g13;g15=+- g9 g13 0|,,,false~M l t;L r t;L r b;L l b;Z;M g11 g9;L g14 g9;L g12 g15;L g12 g10;L g11 g10;Z#,,darkenLess,false~M g11 g9;L g14 g9;L g14 g15;L g12 g15;L g12 g10;L g11 g10;Z#,,darken,false~M g14 g9;L g14 g15;L g12 g15;Z#,,none,~M g11 g9;L g14 g9;L g12 g15;L g12 g10;L g11 g10;Z;M g12 g15;L g14 g15;L g14 g9#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonEnd: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0;g13=*/ ss 3 4;g14=*/ g13 3 4;g15=*/ g13 7 8;g16=+- g11 g14 0;g17=+- g11 g15 0|,,,false~M l t;L r t;L r b;L l b;Z;M g16 vc;L g11 g9;L g11 g10;Z;M g17 g9;L g12 g9;L g12 g10;L g17 g10;Z#,,darken,false~M g16 vc;L g11 g9;L g11 g10;Z;M g17 g9;L g12 g9;L g12 g10;L g17 g10;Z#,,none,~M g16 vc;L g11 g10;L g11 g9;Z;M g17 g9;L g12 g9;L g12 g10;L g17 g10;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonForwardNext: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0|,,,false~M l t;L r t;L r b;L l b;Z;M g12 vc;L g11 g9;L g11 g10;Z#,,darken,false~M g12 vc;L g11 g9;L g11 g10;Z#,,none,~M g12 vc;L g11 g10;L g11 g9;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonHelp: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g11=+- hc 0 dx2;g13=*/ ss 3 4;g14=*/ g13 1 7;g15=*/ g13 3 14;g16=*/ g13 2 7;g19=*/ g13 3 7;g20=*/ g13 4 7;g21=*/ g13 17 28;g23=*/ g13 21 28;g24=*/ g13 11 14;g27=+- g9 g16 0;g29=+- g9 g21 0;g30=+- g9 g23 0;g31=+- g9 g24 0;g33=+- g11 g15 0;g36=+- g11 g19 0;g37=+- g11 g20 0;g41=*/ g13 1 14;g42=*/ g13 3 28|,,,false~M l t;L r t;L r b;L l b;Z;M g33 g27;A g16 g16 cd2 cd2;A g14 g15 0 cd4;A g41 g42 3cd4 -5400000;L g37 g30;L g36 g30;L g36 g29;A g14 g15 cd2 cd4;A g41 g42 cd4 -5400000;A g14 g14 0 -10800000;Z;M hc g31;A g42 g42 3cd4 21600000;Z#,,darken,false~M g33 g27;A g16 g16 cd2 cd2;A g14 g15 0 cd4;A g41 g42 3cd4 -5400000;L g37 g30;L g36 g30;L g36 g29;A g14 g15 cd2 cd4;A g41 g42 cd4 -5400000;A g14 g14 0 -10800000;Z;M hc g31;A g42 g42 3cd4 21600000;Z#,,none,~M g33 g27;A g16 g16 cd2 cd2;A g14 g15 0 cd4;A g41 g42 3cd4 -5400000;L g37 g30;L g36 g30;L g36 g29;A g14 g15 cd2 cd4;A g41 g42 cd4 -5400000;A g14 g14 0 -10800000;Z;M hc g31;A g42 g42 3cd4 21600000;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonHome: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0;g13=*/ ss 3 4;g14=*/ g13 1 16;g15=*/ g13 1 8;g16=*/ g13 3 16;g17=*/ g13 5 16;g18=*/ g13 7 16;g19=*/ g13 9 16;g20=*/ g13 11 16;g21=*/ g13 3 4;g22=*/ g13 13 16;g23=*/ g13 7 8;g24=+- g9 g14 0;g25=+- g9 g16 0;g26=+- g9 g17 0;g27=+- g9 g21 0;g28=+- g11 g15 0;g29=+- g11 g18 0;g30=+- g11 g19 0;g31=+- g11 g20 0;g32=+- g11 g22 0;g33=+- g11 g23 0|,,,false~M l t;L r t;L r b;L l b;Z;M hc g9;L g11 vc;L g28 vc;L g28 g10;L g33 g10;L g33 vc;L g12 vc;L g32 g26;L g32 g24;L g31 g24;L g31 g25;Z#,,darkenLess,false~M g32 g26;L g32 g24;L g31 g24;L g31 g25;Z;M g28 vc;L g28 g10;L g29 g10;L g29 g27;L g30 g27;L g30 g10;L g33 g10;L g33 vc;Z#,,darken,false~M hc g9;L g11 vc;L g12 vc;Z;M g29 g27;L g30 g27;L g30 g10;L g29 g10;Z#,,none,~M hc g9;L g31 g25;L g31 g24;L g32 g24;L g32 g26;L g12 vc;L g33 vc;L g33 g10;L g28 g10;L g28 vc;L g11 vc;Z;M g31 g25;L g32 g26;M g33 vc;L g28 vc;M g29 g10;L g29 g27;L g30 g27;L g30 g10#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonInformation: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g11=+- hc 0 dx2;g13=*/ ss 3 4;g14=*/ g13 1 32;g17=*/ g13 5 16;g18=*/ g13 3 8;g19=*/ g13 13 32;g20=*/ g13 19 32;g22=*/ g13 11 16;g23=*/ g13 13 16;g24=*/ g13 7 8;g25=+- g9 g14 0;g28=+- g9 g17 0;g29=+- g9 g18 0;g30=+- g9 g23 0;g31=+- g9 g24 0;g32=+- g11 g17 0;g34=+- g11 g19 0;g35=+- g11 g20 0;g37=+- g11 g22 0;g38=*/ g13 3 32|,,,false~M l t;L r t;L r b;L l b;Z;M hc g9;A dx2 dx2 3cd4 21600000;Z#,,darken,false~M hc g9;A dx2 dx2 3cd4 21600000;Z;M hc g25;A g38 g38 3cd4 21600000;M g32 g28;L g32 g29;L g34 g29;L g34 g30;L g32 g30;L g32 g31;L g37 g31;L g37 g30;L g35 g30;L g35 g28;Z#,,lighten,false~M hc g25;A g38 g38 3cd4 21600000;M g32 g28;L g35 g28;L g35 g30;L g37 g30;L g37 g31;L g32 g31;L g32 g30;L g34 g30;L g34 g29;L g32 g29;Z#,,none,~M hc g9;A dx2 dx2 3cd4 21600000;Z;M hc g25;A g38 g38 3cd4 21600000;M g32 g28;L g35 g28;L g35 g30;L g37 g30;L g37 g31;L g32 g31;L g32 g30;L g34 g30;L g34 g29;L g32 g29;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonMovie: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0;g13=*/ ss 3 4;g14=*/ g13 1455 21600;g15=*/ g13 1905 21600;g16=*/ g13 2325 21600;g17=*/ g13 16155 21600;g18=*/ g13 17010 21600;g19=*/ g13 19335 21600;g20=*/ g13 19725 21600;g21=*/ g13 20595 21600;g22=*/ g13 5280 21600;g23=*/ g13 5730 21600;g24=*/ g13 6630 21600;g25=*/ g13 7492 21600;g26=*/ g13 9067 21600;g27=*/ g13 9555 21600;g28=*/ g13 13342 21600;g29=*/ g13 14580 21600;g30=*/ g13 15592 21600;g31=+- g11 g14 0;g32=+- g11 g15 0;g33=+- g11 g16 0;g34=+- g11 g17 0;g35=+- g11 g18 0;g36=+- g11 g19 0;g37=+- g11 g20 0;g38=+- g11 g21 0;g39=+- g9 g22 0;g40=+- g9 g23 0;g41=+- g9 g24 0;g42=+- g9 g25 0;g43=+- g9 g26 0;g44=+- g9 g27 0;g45=+- g9 g28 0;g46=+- g9 g29 0;g47=+- g9 g30 0;g48=+- g9 g31 0|,,,false~M l t;L r t;L r b;L l b;Z;M g11 g39;L g11 g44;L g31 g44;L g32 g43;L g33 g43;L g33 g47;L g35 g47;L g35 g45;L g36 g45;L g38 g46;L g12 g46;L g12 g41;L g38 g41;L g37 g42;L g35 g42;L g35 g41;L g34 g40;L g32 g40;L g31 g39;Z#,,darken,false~M g11 g39;L g11 g44;L g31 g44;L g32 g43;L g33 g43;L g33 g47;L g35 g47;L g35 g45;L g36 g45;L g38 g46;L g12 g46;L g12 g41;L g38 g41;L g37 g42;L g35 g42;L g35 g41;L g34 g40;L g32 g40;L g31 g39;Z#,,none,~M g11 g39;L g31 g39;L g32 g40;L g34 g40;L g35 g41;L g35 g42;L g37 g42;L g38 g41;L g12 g41;L g12 g46;L g38 g46;L g36 g45;L g35 g45;L g35 g47;L g33 g47;L g33 g43;L g32 g43;L g31 g44;L g11 g44;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonReturn: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0;g13=*/ ss 3 4;g14=*/ g13 7 8;g15=*/ g13 3 4;g16=*/ g13 5 8;g17=*/ g13 3 8;g18=*/ g13 1 4;g19=+- g9 g15 0;g20=+- g9 g16 0;g21=+- g9 g18 0;g22=+- g11 g14 0;g23=+- g11 g15 0;g24=+- g11 g16 0;g25=+- g11 g17 0;g26=+- g11 g18 0;g27=*/ g13 1 8|,,,false~M l t;L r t;L r b;L l b;Z;M g12 g21;L g23 g9;L hc g21;L g24 g21;L g24 g20;A g27 g27 0 cd4;L g25 g19;A g27 g27 cd4 cd4;L g26 g21;L g11 g21;L g11 g20;A g17 g17 cd2 -5400000;L hc g10;A g17 g17 cd4 -5400000;L g22 g21;Z#,,darken,false~M g12 g21;L g23 g9;L hc g21;L g24 g21;L g24 g20;A g27 g27 0 cd4;L g25 g19;A g27 g27 cd4 cd4;L g26 g21;L g11 g21;L g11 g20;A g17 g17 cd2 -5400000;L hc g10;A g17 g17 cd4 -5400000;L g22 g21;Z#,,none,~M g12 g21;L g22 g21;L g22 g20;A g17 g17 0 cd4;L g25 g10;A g17 g17 cd4 cd4;L g11 g21;L g26 g21;L g26 g20;A g27 g27 cd2 -5400000;L hc g19;A g27 g27 cd4 -5400000;L g24 g21;L hc g21;L g23 g9;Z#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  actionButtonSound: "|dx2=*/ ss 3 8;g9=+- vc 0 dx2;g10=+- vc dx2 0;g11=+- hc 0 dx2;g12=+- hc dx2 0;g13=*/ ss 3 4;g14=*/ g13 1 8;g15=*/ g13 5 16;g16=*/ g13 5 8;g17=*/ g13 11 16;g18=*/ g13 3 4;g19=*/ g13 7 8;g20=+- g9 g14 0;g21=+- g9 g15 0;g22=+- g9 g17 0;g23=+- g9 g19 0;g24=+- g11 g15 0;g25=+- g11 g16 0;g26=+- g11 g18 0|,,,false~M l t;L r t;L r b;L l b;Z;M g11 g21;L g11 g22;L g24 g22;L g25 g10;L g25 g9;L g24 g21;Z#,,darken,false~M g11 g21;L g11 g22;L g24 g22;L g25 g10;L g25 g9;L g24 g21;Z#,,none,~M g11 g21;L g24 g21;L g25 g9;L g25 g10;L g24 g22;L g11 g22;Z;M g26 g21;L g12 g20;M g26 vc;L g12 vc;M g26 g22;L g12 g23#,,none,~M l t;L r t;L r b;L l b;Z|l t r b",
  arc: "adj1=val 16200000;adj2=val 0|stAng=pin 0 adj1 21599999;enAng=pin 0 adj2 21599999;sw11=+- enAng 0 stAng;sw12=+- sw11 21600000 0;swAng=?: sw11 sw11 sw12;wt1=sin wd2 stAng;ht1=cos hd2 stAng;dx1=cat2 wd2 ht1 wt1;dy1=sat2 hd2 ht1 wt1;wt2=sin wd2 enAng;ht2=cos hd2 enAng;dx2=cat2 wd2 ht2 wt2;dy2=sat2 hd2 ht2 wt2;x1=+- hc dx1 0;y1=+- vc dy1 0;x2=+- hc dx2 0;y2=+- vc dy2 0;sw0=+- 21600000 0 stAng;da1=+- swAng 0 sw0;g1=max x1 x2;ir=?: da1 r g1;sw1=+- cd4 0 stAng;sw2=+- 27000000 0 stAng;sw3=?: sw1 sw1 sw2;da2=+- swAng 0 sw3;g5=max y1 y2;ib=?: da2 b g5;sw4=+- cd2 0 stAng;sw5=+- 32400000 0 stAng;sw6=?: sw4 sw4 sw5;da3=+- swAng 0 sw6;g9=min x1 x2;il=?: da3 l g9;sw7=+- 3cd4 0 stAng;sw8=+- 37800000 0 stAng;sw9=?: sw7 sw7 sw8;da4=+- swAng 0 sw9;g13=min y1 y2;it=?: da4 t g13;cang1=+- stAng 0 cd4;cang2=+- enAng cd4 0;cang3=+/ cang1 cang2 2|,,,false~M x1 y1;A wd2 hd2 stAng swAng;L hc vc;Z#,,none,~M x1 y1;A wd2 hd2 stAng swAng|il it ir ib",
  bentArrow: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 43750|a2=pin 0 adj2 50000;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;a3=pin 0 adj3 50000;th=*/ ss a1 100000;aw2=*/ ss a2 100000;th2=*/ th 1 2;dh2=+- aw2 0 th2;ah=*/ ss a3 100000;bw=+- r 0 ah;bh=+- b 0 dh2;bs=min bw bh;maxAdj4=*/ 100000 bs ss;a4=pin 0 adj4 maxAdj4;bd=*/ ss a4 100000;bd3=+- bd 0 th;bd2=max bd3 0;x3=+- th bd2 0;x4=+- r 0 ah;y3=+- dh2 th 0;y4=+- y3 dh2 0;y5=+- dh2 bd 0;y6=+- y3 bd2 0|,,,~M l b;L l y5;A bd bd cd2 cd4;L x4 dh2;L x4 t;L r aw2;L x4 y4;L x4 y3;L x3 y3;A bd2 bd2 3cd4 -5400000;L th b;Z|l t r b",
  bentConnector2: "||,,none,~M l t;L r t;L r b|l t r b",
  bentConnector3: "adj1=val 50000|x1=*/ w adj1 100000|,,none,~M l t;L x1 t;L x1 b;L r b|l t r b",
  bentConnector4: "adj1=val 50000;adj2=val 50000|x1=*/ w adj1 100000;x2=+/ x1 r 2;y2=*/ h adj2 100000;y1=+/ t y2 2|,,none,~M l t;L x1 t;L x1 y2;L r y2;L r b|l t r b",
  bentConnector5: "adj1=val 50000;adj2=val 50000;adj3=val 50000|x1=*/ w adj1 100000;x3=*/ w adj3 100000;x2=+/ x1 x3 2;y2=*/ h adj2 100000;y1=+/ t y2 2;y3=+/ b y2 2|,,none,~M l t;L x1 t;L x1 y2;L x3 y2;L x3 b;L r b|l t r b",
  bentUpArrow: "adj1=val 25000;adj2=val 25000;adj3=val 25000|a1=pin 0 adj1 50000;a2=pin 0 adj2 50000;a3=pin 0 adj3 50000;y1=*/ ss a3 100000;dx1=*/ ss a2 50000;x1=+- r 0 dx1;dx3=*/ ss a2 100000;x3=+- r 0 dx3;dx2=*/ ss a1 200000;x2=+- x3 0 dx2;x4=+- x3 dx2 0;dy2=*/ ss a1 100000;y2=+- b 0 dy2;x0=*/ x4 1 2;y3=+/ y2 b 2;y15=+/ y1 b 2|,,,~M l y2;L x2 y2;L x2 y1;L x1 y1;L x3 t;L r y1;L x4 y1;L x4 b;L l b;Z|l y2 x4 b",
  bevel: "adj=val 12500|a=pin 0 adj 50000;x1=*/ ss a 100000;x2=+- r 0 x1;y2=+- b 0 x1|,,,false~M x1 x1;L x2 x1;L x2 y2;L x1 y2;Z#,,lightenLess,false~M l t;L r t;L x2 x1;L x1 x1;Z#,,darkenLess,false~M l b;L x1 y2;L x2 y2;L r b;Z#,,lighten,false~M l t;L x1 x1;L x1 y2;L l b;Z#,,darken,false~M r t;L r b;L x2 y2;L x2 x1;Z#,,none,~M l t;L r t;L r b;L l b;Z;M x1 x1;L x2 x1;L x2 y2;L x1 y2;Z;M l t;L x1 x1;M l b;L x1 y2;M r t;L x2 x1;M r b;L x2 y2|x1 x1 x2 y2",
  blockArc: "adj1=val 10800000;adj2=val 0;adj3=val 25000|stAng=pin 0 adj1 21599999;istAng=pin 0 adj2 21599999;a3=pin 0 adj3 50000;sw11=+- istAng 0 stAng;sw12=+- sw11 21600000 0;swAng=?: sw11 sw11 sw12;iswAng=+- 0 0 swAng;wt1=sin wd2 stAng;ht1=cos hd2 stAng;wt3=sin wd2 istAng;ht3=cos hd2 istAng;dx1=cat2 wd2 ht1 wt1;dy1=sat2 hd2 ht1 wt1;dx3=cat2 wd2 ht3 wt3;dy3=sat2 hd2 ht3 wt3;x1=+- hc dx1 0;y1=+- vc dy1 0;x3=+- hc dx3 0;y3=+- vc dy3 0;dr=*/ ss a3 100000;iwd2=+- wd2 0 dr;ihd2=+- hd2 0 dr;wt2=sin iwd2 istAng;ht2=cos ihd2 istAng;wt4=sin iwd2 stAng;ht4=cos ihd2 stAng;dx2=cat2 iwd2 ht2 wt2;dy2=sat2 ihd2 ht2 wt2;dx4=cat2 iwd2 ht4 wt4;dy4=sat2 ihd2 ht4 wt4;x2=+- hc dx2 0;y2=+- vc dy2 0;x4=+- hc dx4 0;y4=+- vc dy4 0;sw0=+- 21600000 0 stAng;da1=+- swAng 0 sw0;g1=max x1 x2;g2=max x3 x4;g3=max g1 g2;ir=?: da1 r g3;sw1=+- cd4 0 stAng;sw2=+- 27000000 0 stAng;sw3=?: sw1 sw1 sw2;da2=+- swAng 0 sw3;g5=max y1 y2;g6=max y3 y4;g7=max g5 g6;ib=?: da2 b g7;sw4=+- cd2 0 stAng;sw5=+- 32400000 0 stAng;sw6=?: sw4 sw4 sw5;da3=+- swAng 0 sw6;g9=min x1 x2;g10=min x3 x4;g11=min g9 g10;il=?: da3 l g11;sw7=+- 3cd4 0 stAng;sw8=+- 37800000 0 stAng;sw9=?: sw7 sw7 sw8;da4=+- swAng 0 sw9;g13=min y1 y2;g14=min y3 y4;g15=min g13 g14;it=?: da4 t g15;x5=+/ x1 x4 2;y5=+/ y1 y4 2;x6=+/ x3 x2 2;y6=+/ y3 y2 2;cang1=+- stAng 0 cd4;cang2=+- istAng cd4 0;cang3=+/ cang1 cang2 2|,,,~M x1 y1;A wd2 hd2 stAng swAng;L x2 y2;A iwd2 ihd2 istAng iswAng;Z|il it ir ib",
  borderCallout1: "adj1=val 18750;adj2=val -8333;adj3=val 112500;adj4=val -38333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000|,,,~M l t;L r t;L r b;L l b;Z#,,none,~M x1 y1;L x2 y2|l t r b",
  borderCallout2: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 112500;adj6=val -46667|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000|,,,~M l t;L r t;L r b;L l b;Z#,,none,~M x1 y1;L x2 y2;L x3 y3|l t r b",
  borderCallout3: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 100000;adj6=val -16667;adj7=val 112963;adj8=val -8333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000;y4=*/ h adj7 100000;x4=*/ w adj8 100000|,,,~M l t;L r t;L r b;L l b;Z#,,none,~M x1 y1;L x2 y2;L x3 y3;L x4 y4|l t r b",
  bracePair: "adj=val 8333|a=pin 0 adj 25000;x1=*/ ss a 100000;x2=*/ ss a 50000;x3=+- r 0 x2;x4=+- r 0 x1;y2=+- vc 0 x1;y3=+- vc x1 0;y4=+- b 0 x1;it=*/ x1 29289 100000;il=+- x1 it 0;ir=+- r 0 il;ib=+- b 0 it|,,,false~M x2 b;A x1 x1 cd4 cd4;L x1 y3;A x1 x1 0 -5400000;A x1 x1 cd4 -5400000;L x1 x1;A x1 x1 cd2 cd4;L x3 t;A x1 x1 3cd4 cd4;L x4 y2;A x1 x1 cd2 -5400000;A x1 x1 3cd4 -5400000;L x4 y4;A x1 x1 0 cd4;Z#,,none,~M x2 b;A x1 x1 cd4 cd4;L x1 y3;A x1 x1 0 -5400000;A x1 x1 cd4 -5400000;L x1 x1;A x1 x1 cd2 cd4;M x3 t;A x1 x1 3cd4 cd4;L x4 y2;A x1 x1 cd2 -5400000;A x1 x1 3cd4 -5400000;L x4 y4;A x1 x1 0 cd4|il il ir ib",
  bracketPair: "adj=val 16667|a=pin 0 adj 50000;x1=*/ ss a 100000;x2=+- r 0 x1;y2=+- b 0 x1;il=*/ x1 29289 100000;ir=+- r 0 il;ib=+- b 0 il|,,,false~M l x1;A x1 x1 cd2 cd4;L x2 t;A x1 x1 3cd4 cd4;L r y2;A x1 x1 0 cd4;L x1 b;A x1 x1 cd4 cd4;Z#,,none,~M x1 b;A x1 x1 cd4 cd4;L l x1;A x1 x1 cd2 cd4;M x2 t;A x1 x1 3cd4 cd4;L r y2;A x1 x1 0 cd4|il il ir ib",
  callout1: "adj1=val 18750;adj2=val -8333;adj3=val 112500;adj4=val -38333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000|,,,false~M l t;L r t;L r b;L l b;Z#,,none,~M x1 y1;L x2 y2|l t r b",
  callout2: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 112500;adj6=val -46667|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000|,,,false~M l t;L r t;L r b;L l b;Z#,,none,~M x1 y1;L x2 y2;L x3 y3|l t r b",
  callout3: "adj1=val 18750;adj2=val -8333;adj3=val 18750;adj4=val -16667;adj5=val 100000;adj6=val -16667;adj7=val 112963;adj8=val -8333|y1=*/ h adj1 100000;x1=*/ w adj2 100000;y2=*/ h adj3 100000;x2=*/ w adj4 100000;y3=*/ h adj5 100000;x3=*/ w adj6 100000;y4=*/ h adj7 100000;x4=*/ w adj8 100000|,,,false~M l t;L r t;L r b;L l b;Z#,,none,~M x1 y1;L x2 y2;L x3 y3;L x4 y4|l t r b",
  can: "adj=val 25000|maxAdj=*/ 50000 h ss;a=pin 0 adj maxAdj;y1=*/ ss a 200000;y2=+- y1 y1 0;y3=+- b 0 y1|,,,false~M l y1;A wd2 y1 cd2 -10800000;L r y3;A wd2 y1 0 cd2;Z#,,lighten,false~M l y1;A wd2 y1 cd2 cd2;A wd2 y1 0 cd2;Z#,,none,~M r y1;A wd2 y1 0 cd2;A wd2 y1 cd2 cd2;L r y3;A wd2 y1 0 cd2;L l y1|l y2 r y3",
  chartPlus: "||10,10,none,~M 5 0;L 5 10;M 0 5;L 10 5#10,10,,false~M 0 0;L 0 10;L 10 10;L 10 0;Z|",
  chartStar: "||10,10,none,~M 0 0;L 10 10;M 0 10;L 10 0;M 5 0;L 5 10#10,10,,false~M 0 0;L 0 10;L 10 10;L 10 0;Z|",
  chartX: "||10,10,none,~M 0 0;L 10 10;M 0 10;L 10 0#10,10,,false~M 0 0;L 0 10;L 10 10;L 10 0;Z|",
  chevron: "adj=val 50000|maxAdj=*/ 100000 w ss;a=pin 0 adj maxAdj;x1=*/ ss a 100000;x2=+- r 0 x1;x3=*/ x2 1 2;dx=+- x2 0 x1;il=?: dx x1 l;ir=?: dx x2 r|,,,~M l t;L x2 t;L r vc;L x2 b;L l b;L x1 vc;Z|il t ir b",
  chord: "adj1=val 2700000;adj2=val 16200000|stAng=pin 0 adj1 21599999;enAng=pin 0 adj2 21599999;sw1=+- enAng 0 stAng;sw2=+- sw1 21600000 0;swAng=?: sw1 sw1 sw2;wt1=sin wd2 stAng;ht1=cos hd2 stAng;dx1=cat2 wd2 ht1 wt1;dy1=sat2 hd2 ht1 wt1;wt2=sin wd2 enAng;ht2=cos hd2 enAng;dx2=cat2 wd2 ht2 wt2;dy2=sat2 hd2 ht2 wt2;x1=+- hc dx1 0;y1=+- vc dy1 0;x2=+- hc dx2 0;y2=+- vc dy2 0;x3=+/ x1 x2 2;y3=+/ y1 y2 2;midAng0=*/ swAng 1 2;midAng=+- stAng midAng0 cd2;idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M x1 y1;A wd2 hd2 stAng swAng;Z|il it ir ib",
  circularArrow: "adj1=val 12500;adj2=val 1142319;adj3=val 20457681;adj4=val 10800000;adj5=val 12500|a5=pin 0 adj5 25000;maxAdj1=*/ a5 2 1;a1=pin 0 adj1 maxAdj1;enAng=pin 1 adj3 21599999;stAng=pin 0 adj4 21599999;th=*/ ss a1 100000;thh=*/ ss a5 100000;th2=*/ th 1 2;rw1=+- wd2 th2 thh;rh1=+- hd2 th2 thh;rw2=+- rw1 0 th;rh2=+- rh1 0 th;rw3=+- rw2 th2 0;rh3=+- rh2 th2 0;wtH=sin rw3 enAng;htH=cos rh3 enAng;dxH=cat2 rw3 htH wtH;dyH=sat2 rh3 htH wtH;xH=+- hc dxH 0;yH=+- vc dyH 0;rI=min rw2 rh2;u1=*/ dxH dxH 1;u2=*/ dyH dyH 1;u3=*/ rI rI 1;u4=+- u1 0 u3;u5=+- u2 0 u3;u6=*/ u4 u5 u1;u7=*/ u6 1 u2;u8=+- 1 0 u7;u9=sqrt u8;u10=*/ u4 1 dxH;u11=*/ u10 1 dyH;u12=+/ 1 u9 u11;u13=at2 1 u12;u14=+- u13 21600000 0;u15=?: u13 u13 u14;u16=+- u15 0 enAng;u17=+- u16 21600000 0;u18=?: u16 u16 u17;u19=+- u18 0 cd2;u20=+- u18 0 21600000;u21=?: u19 u20 u18;maxAng=abs u21;aAng=pin 0 adj2 maxAng;ptAng=+- enAng aAng 0;wtA=sin rw3 ptAng;htA=cos rh3 ptAng;dxA=cat2 rw3 htA wtA;dyA=sat2 rh3 htA wtA;xA=+- hc dxA 0;yA=+- vc dyA 0;wtE=sin rw1 stAng;htE=cos rh1 stAng;dxE=cat2 rw1 htE wtE;dyE=sat2 rh1 htE wtE;xE=+- hc dxE 0;yE=+- vc dyE 0;dxG=cos thh ptAng;dyG=sin thh ptAng;xG=+- xH dxG 0;yG=+- yH dyG 0;dxB=cos thh ptAng;dyB=sin thh ptAng;xB=+- xH 0 dxB 0;yB=+- yH 0 dyB 0;sx1=+- xB 0 hc;sy1=+- yB 0 vc;sx2=+- xG 0 hc;sy2=+- yG 0 vc;rO=min rw1 rh1;x1O=*/ sx1 rO rw1;y1O=*/ sy1 rO rh1;x2O=*/ sx2 rO rw1;y2O=*/ sy2 rO rh1;dxO=+- x2O 0 x1O;dyO=+- y2O 0 y1O;dO=mod dxO dyO 0;q1=*/ x1O y2O 1;q2=*/ x2O y1O 1;DO=+- q1 0 q2;q3=*/ rO rO 1;q4=*/ dO dO 1;q5=*/ q3 q4 1;q6=*/ DO DO 1;q7=+- q5 0 q6;q8=max q7 0;sdelO=sqrt q8;ndyO=*/ dyO -1 1;sdyO=?: ndyO -1 1;q9=*/ sdyO dxO 1;q10=*/ q9 sdelO 1;q11=*/ DO dyO 1;dxF1=+/ q11 q10 q4;q12=+- q11 0 q10;dxF2=*/ q12 1 q4;adyO=abs dyO;q13=*/ adyO sdelO 1;q14=*/ DO dxO -1;dyF1=+/ q14 q13 q4;q15=+- q14 0 q13;dyF2=*/ q15 1 q4;q16=+- x2O 0 dxF1;q17=+- x2O 0 dxF2;q18=+- y2O 0 dyF1;q19=+- y2O 0 dyF2;q20=mod q16 q18 0;q21=mod q17 q19 0;q22=+- q21 0 q20;dxF=?: q22 dxF1 dxF2;dyF=?: q22 dyF1 dyF2;sdxF=*/ dxF rw1 rO;sdyF=*/ dyF rh1 rO;xF=+- hc sdxF 0;yF=+- vc sdyF 0;x1I=*/ sx1 rI rw2;y1I=*/ sy1 rI rh2;x2I=*/ sx2 rI rw2;y2I=*/ sy2 rI rh2;dxI=+- x2I 0 x1I;dyI=+- y2I 0 y1I;dI=mod dxI dyI 0;v1=*/ x1I y2I 1;v2=*/ x2I y1I 1;DI=+- v1 0 v2;v3=*/ rI rI 1;v4=*/ dI dI 1;v5=*/ v3 v4 1;v6=*/ DI DI 1;v7=+- v5 0 v6;v8=max v7 0;sdelI=sqrt v8;v9=*/ sdyO dxI 1;v10=*/ v9 sdelI 1;v11=*/ DI dyI 1;dxC1=+/ v11 v10 v4;v12=+- v11 0 v10;dxC2=*/ v12 1 v4;adyI=abs dyI;v13=*/ adyI sdelI 1;v14=*/ DI dxI -1;dyC1=+/ v14 v13 v4;v15=+- v14 0 v13;dyC2=*/ v15 1 v4;v16=+- x1I 0 dxC1;v17=+- x1I 0 dxC2;v18=+- y1I 0 dyC1;v19=+- y1I 0 dyC2;v20=mod v16 v18 0;v21=mod v17 v19 0;v22=+- v21 0 v20;dxC=?: v22 dxC1 dxC2;dyC=?: v22 dyC1 dyC2;sdxC=*/ dxC rw2 rI;sdyC=*/ dyC rh2 rI;xC=+- hc sdxC 0;yC=+- vc sdyC 0;ist0=at2 sdxC sdyC;ist1=+- ist0 21600000 0;istAng=?: ist0 ist0 ist1;isw1=+- stAng 0 istAng;isw2=+- isw1 0 21600000;iswAng=?: isw1 isw2 isw1;p1=+- xF 0 xC;p2=+- yF 0 yC;p3=mod p1 p2 0;p4=*/ p3 1 2;p5=+- p4 0 thh;xGp=?: p5 xF xG;yGp=?: p5 yF yG;xBp=?: p5 xC xB;yBp=?: p5 yC yB;en0=at2 sdxF sdyF;en1=+- en0 21600000 0;en2=?: en0 en0 en1;sw0=+- en2 0 stAng;sw1=+- sw0 21600000 0;swAng=?: sw0 sw0 sw1;wtI=sin rw3 stAng;htI=cos rh3 stAng;dxI=cat2 rw3 htI wtI;dyI=sat2 rh3 htI wtI;xI=+- hc dxI 0;yI=+- vc dyI 0;aI=+- stAng 0 cd4;aA=+- ptAng cd4 0;aB=+- ptAng cd2 0;idx=cos rw1 2700000;idy=sin rh1 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M xE yE;A rw1 rh1 stAng swAng;L xGp yGp;L xA yA;L xBp yBp;L xC yC;A rw2 rh2 istAng iswAng;Z|il it ir ib",
  cloud: "|il=*/ w 2977 21600;it=*/ h 3262 21600;ir=*/ w 17087 21600;ib=*/ h 17337 21600;g27=*/ w 67 21600;g28=*/ h 21577 21600;g29=*/ w 21582 21600;g30=*/ h 1235 21600|43200,43200,,~M 3900 14370;A 6753 9190 -11429249 7426832;A 5333 7267 -8646143 5396714;A 4365 5945 -8748475 5983381;A 4857 6595 -7859164 7034504;A 5333 7273 -4722533 6541615;A 6775 9220 -2776035 7816140;A 5785 7867 37501 6842000;A 6752 9215 1347096 6910353;A 7720 10543 3974558 4542661;A 4360 5918 -16496525 8804134;A 4345 5945 -14809710 9151131;Z#43200,43200,none,~M 4693 26177;A 4345 5945 5204520 1585770;M 6928 34899;A 4360 5918 4416628 686848;M 16478 39090;A 6752 9215 8257449 844866;M 28827 34751;A 6752 9215 387196 959901;M 34129 22954;A 5785 7867 -4217541 4255042;M 41798 15354;A 5333 7273 1819082 1665090;M 38324 5426;A 4857 6595 -824660 891534;M 29078 3952;A 4857 6595 -8950887 1091722;M 22141 4720;A 4365 5945 -9809656 1061181;M 14000 5192;A 6753 9190 -4002417 739161;M 4127 15789;A 6753 9190 9459261 711490|il it ir ib",
  cloudCallout: "adj1=val -20833;adj2=val 62500|dxPos=*/ w adj1 100000;dyPos=*/ h adj2 100000;xPos=+- hc dxPos 0;yPos=+- vc dyPos 0;ht=cat2 hd2 dxPos dyPos;wt=sat2 wd2 dxPos dyPos;g2=cat2 wd2 ht wt;g3=sat2 hd2 ht wt;g4=+- hc g2 0;g5=+- vc g3 0;g6=+- g4 0 xPos;g7=+- g5 0 yPos;g8=mod g6 g7 0;g9=*/ ss 6600 21600;g10=+- g8 0 g9;g11=*/ g10 1 3;g12=*/ ss 1800 21600;g13=+- g11 g12 0;g14=*/ g13 g6 g8;g15=*/ g13 g7 g8;g16=+- g14 xPos 0;g17=+- g15 yPos 0;g18=*/ ss 4800 21600;g19=*/ g11 2 1;g20=+- g18 g19 0;g21=*/ g20 g6 g8;g22=*/ g20 g7 g8;g23=+- g21 xPos 0;g24=+- g22 yPos 0;g25=*/ ss 1200 21600;g26=*/ ss 600 21600;x23=+- xPos g26 0;x24=+- g16 g25 0;x25=+- g23 g12 0;il=*/ w 2977 21600;it=*/ h 3262 21600;ir=*/ w 17087 21600;ib=*/ h 17337 21600;g27=*/ w 67 21600;g28=*/ h 21577 21600;g29=*/ w 21582 21600;g30=*/ h 1235 21600;pang=at2 dxPos dyPos|43200,43200,,~M 3900 14370;A 6753 9190 -11429249 7426832;A 5333 7267 -8646143 5396714;A 4365 5945 -8748475 5983381;A 4857 6595 -7859164 7034504;A 5333 7273 -4722533 6541615;A 6775 9220 -2776035 7816140;A 5785 7867 37501 6842000;A 6752 9215 1347096 6910353;A 7720 10543 3974558 4542661;A 4360 5918 -16496525 8804134;A 4345 5945 -14809710 9151131;Z#,,,~M x23 yPos;A g26 g26 0 21600000;Z#,,,~M x24 g17;A g25 g25 0 21600000;Z#,,,~M x25 g24;A g12 g12 0 21600000;Z#43200,43200,none,~M 4693 26177;A 4345 5945 5204520 1585770;M 6928 34899;A 4360 5918 4416628 686848;M 16478 39090;A 6752 9215 8257449 844866;M 28827 34751;A 6752 9215 387196 959901;M 34129 22954;A 5785 7867 -4217541 4255042;M 41798 15354;A 5333 7273 1819082 1665090;M 38324 5426;A 4857 6595 -824660 891534;M 29078 3952;A 4857 6595 -8950887 1091722;M 22141 4720;A 4365 5945 -9809656 1061181;M 14000 5192;A 6753 9190 -4002417 739161;M 4127 15789;A 6753 9190 9459261 711490|il it ir ib",
  corner: "adj1=val 50000;adj2=val 50000|maxAdj1=*/ 100000 h ss;maxAdj2=*/ 100000 w ss;a1=pin 0 adj1 maxAdj1;a2=pin 0 adj2 maxAdj2;x1=*/ ss a2 100000;dy1=*/ ss a1 100000;y1=+- b 0 dy1;cx1=*/ x1 1 2;cy1=+/ y1 b 2;d=+- w 0 h;it=?: d y1 t;ir=?: d r x1|,,,~M l t;L x1 t;L x1 y1;L r y1;L r b;L l b;Z|l it ir b",
  cornerTabs: "|md=mod w h 0;dx=*/ 1 md 20;y1=+- 0 b dx;x1=+- 0 r dx|,,,~M l t;L dx t;L l dx;Z#,,,~M l y1;L dx b;L l b;Z#,,,~M x1 t;L r t;L r dx;Z#,,,~M r y1;L r b;L x1 b;Z|dx dx x1 y1",
  cube: "adj=val 25000|a=pin 0 adj 100000;y1=*/ ss a 100000;y4=+- b 0 y1;y2=*/ y4 1 2;y3=+/ y1 b 2;x4=+- r 0 y1;x2=*/ x4 1 2;x3=+/ y1 r 2|,,,false~M l y1;L x4 y1;L x4 b;L l b;Z#,,darkenLess,false~M x4 y1;L r t;L r y4;L x4 b;Z#,,lightenLess,false~M l y1;L y1 t;L r t;L x4 y1;Z#,,none,~M l y1;L y1 t;L r t;L r y4;L x4 b;L l b;Z;M l y1;L x4 y1;L r t;M x4 y1;L x4 b|l y1 x4 b",
  curvedConnector2: "||,,none,~M l t;C wd2 t r hd2 r b|l t r b",
  curvedConnector3: "adj1=val 50000|x2=*/ w adj1 100000;x1=+/ l x2 2;x3=+/ r x2 2;y3=*/ h 3 4|,,none,~M l t;C x1 t x2 hd4 x2 vc;C x2 y3 x3 b r b|l t r b",
  curvedConnector4: "adj1=val 50000;adj2=val 50000|x2=*/ w adj1 100000;x1=+/ l x2 2;x3=+/ r x2 2;x4=+/ x2 x3 2;x5=+/ x3 r 2;y4=*/ h adj2 100000;y1=+/ t y4 2;y2=+/ t y1 2;y3=+/ y1 y4 2;y5=+/ b y4 2|,,none,~M l t;C x1 t x2 y2 x2 y1;C x2 y3 x4 y4 x3 y4;C x5 y4 r y5 r b|l t r b",
  curvedConnector5: "adj1=val 50000;adj2=val 50000;adj3=val 50000|x3=*/ w adj1 100000;x6=*/ w adj3 100000;x1=+/ x3 x6 2;x2=+/ l x3 2;x4=+/ x3 x1 2;x5=+/ x6 x1 2;x7=+/ x6 r 2;y4=*/ h adj2 100000;y1=+/ t y4 2;y2=+/ t y1 2;y3=+/ y1 y4 2;y5=+/ b y4 2;y6=+/ y5 y4 2;y7=+/ y5 b 2|,,none,~M l t;C x2 t x3 y2 x3 y1;C x3 y3 x4 y4 x1 y4;C x5 y4 x6 y6 x6 y5;C x6 y7 x7 b r b|l t r b",
  curvedDownArrow: "adj1=val 25000;adj2=val 50000;adj3=val 25000|maxAdj2=*/ 50000 w ss;a2=pin 0 adj2 maxAdj2;a1=pin 0 adj1 100000;th=*/ ss a1 100000;aw=*/ ss a2 100000;q1=+/ th aw 4;wR=+- wd2 0 q1;q7=*/ wR 2 1;q8=*/ q7 q7 1;q9=*/ th th 1;q10=+- q8 0 q9;q11=sqrt q10;idy=*/ q11 h q7;maxAdj3=*/ 100000 idy ss;a3=pin 0 adj3 maxAdj3;ah=*/ ss adj3 100000;x3=+- wR th 0;q2=*/ h h 1;q3=*/ ah ah 1;q4=+- q2 0 q3;q5=sqrt q4;dx=*/ q5 wR h;x5=+- wR dx 0;x7=+- x3 dx 0;q6=+- aw 0 th;dh=*/ q6 1 2;x4=+- x5 0 dh;x8=+- x7 dh 0;aw2=*/ aw 1 2;x6=+- r 0 aw2;y1=+- b 0 ah;swAng=at2 ah dx;mswAng=+- 0 0 swAng;iy=+- b 0 idy;ix=+/ wR x3 2;q12=*/ th 1 2;dang2=at2 idy q12;stAng=+- 3cd4 swAng 0;stAng2=+- 3cd4 0 dang2;swAng2=+- dang2 0 cd4;swAng3=+- cd4 dang2 0|,,,false~M x6 b;L x4 y1;L x5 y1;A wR h stAng mswAng;L x3 t;A wR h 3cd4 swAng;L x8 y1;Z#,,darkenLess,false~M ix iy;A wR h stAng2 swAng2;L l b;A wR h cd2 swAng3;Z#,,none,~M ix iy;A wR h stAng2 swAng2;L l b;A wR h cd2 cd4;L x3 t;A wR h 3cd4 swAng;L x8 y1;L x6 b;L x4 y1;L x5 y1;A wR h stAng mswAng|l t r b",
  curvedLeftArrow: "adj1=val 25000;adj2=val 50000;adj3=val 25000|maxAdj2=*/ 50000 h ss;a2=pin 0 adj2 maxAdj2;a1=pin 0 adj1 a2;th=*/ ss a1 100000;aw=*/ ss a2 100000;q1=+/ th aw 4;hR=+- hd2 0 q1;q7=*/ hR 2 1;q8=*/ q7 q7 1;q9=*/ th th 1;q10=+- q8 0 q9;q11=sqrt q10;idx=*/ q11 w q7;maxAdj3=*/ 100000 idx ss;a3=pin 0 adj3 maxAdj3;ah=*/ ss a3 100000;y3=+- hR th 0;q2=*/ w w 1;q3=*/ ah ah 1;q4=+- q2 0 q3;q5=sqrt q4;dy=*/ q5 hR w;y5=+- hR dy 0;y7=+- y3 dy 0;q6=+- aw 0 th;dh=*/ q6 1 2;y4=+- y5 0 dh;y8=+- y7 dh 0;aw2=*/ aw 1 2;y6=+- b 0 aw2;x1=+- l ah 0;swAng=at2 ah dy;mswAng=+- 0 0 swAng;ix=+- l idx 0;iy=+/ hR y3 2;q12=*/ th 1 2;dang2=at2 idx q12;swAng2=+- dang2 0 swAng;swAng3=+- swAng dang2 0;stAng3=+- 0 0 dang2|,,,false~M l y6;L x1 y4;L x1 y5;A w hR swAng swAng2;A w hR stAng3 swAng3;L x1 y8;Z#,,darkenLess,false~M r y3;A w hR 0 -5400000;L l t;A w hR 3cd4 cd4;Z#,,none,~M r y3;A w hR 0 -5400000;L l t;A w hR 3cd4 cd4;L r y3;A w hR 0 swAng;L x1 y8;L l y6;L x1 y4;L x1 y5;A w hR swAng swAng2|l t r b",
  curvedRightArrow: "adj1=val 25000;adj2=val 50000;adj3=val 25000|maxAdj2=*/ 50000 h ss;a2=pin 0 adj2 maxAdj2;a1=pin 0 adj1 a2;th=*/ ss a1 100000;aw=*/ ss a2 100000;q1=+/ th aw 4;hR=+- hd2 0 q1;q7=*/ hR 2 1;q8=*/ q7 q7 1;q9=*/ th th 1;q10=+- q8 0 q9;q11=sqrt q10;idx=*/ q11 w q7;maxAdj3=*/ 100000 idx ss;a3=pin 0 adj3 maxAdj3;ah=*/ ss a3 100000;y3=+- hR th 0;q2=*/ w w 1;q3=*/ ah ah 1;q4=+- q2 0 q3;q5=sqrt q4;dy=*/ q5 hR w;y5=+- hR dy 0;y7=+- y3 dy 0;q6=+- aw 0 th;dh=*/ q6 1 2;y4=+- y5 0 dh;y8=+- y7 dh 0;aw2=*/ aw 1 2;y6=+- b 0 aw2;x1=+- r 0 ah;swAng=at2 ah dy;stAng=+- cd2 0 swAng;mswAng=+- 0 0 swAng;ix=+- r 0 idx;iy=+/ hR y3 2;q12=*/ th 1 2;dang2=at2 idx q12;swAng2=+- dang2 0 cd4;swAng3=+- cd4 dang2 0;stAng3=+- cd2 0 dang2|,,,false~M l hR;A w hR cd2 mswAng;L x1 y4;L r y6;L x1 y8;L x1 y7;A w hR stAng swAng;Z#,,darkenLess,false~M r th;A w hR 3cd4 swAng2;A w hR stAng3 swAng3;Z#,,none,~M l hR;A w hR cd2 mswAng;L x1 y4;L r y6;L x1 y8;L x1 y7;A w hR stAng swAng;L l hR;A w hR cd2 cd4;L r th;A w hR 3cd4 swAng2|l t r b",
  curvedUpArrow: "adj1=val 25000;adj2=val 50000;adj3=val 25000|maxAdj2=*/ 50000 w ss;a2=pin 0 adj2 maxAdj2;a1=pin 0 adj1 100000;th=*/ ss a1 100000;aw=*/ ss a2 100000;q1=+/ th aw 4;wR=+- wd2 0 q1;q7=*/ wR 2 1;q8=*/ q7 q7 1;q9=*/ th th 1;q10=+- q8 0 q9;q11=sqrt q10;idy=*/ q11 h q7;maxAdj3=*/ 100000 idy ss;a3=pin 0 adj3 maxAdj3;ah=*/ ss adj3 100000;x3=+- wR th 0;q2=*/ h h 1;q3=*/ ah ah 1;q4=+- q2 0 q3;q5=sqrt q4;dx=*/ q5 wR h;x5=+- wR dx 0;x7=+- x3 dx 0;q6=+- aw 0 th;dh=*/ q6 1 2;x4=+- x5 0 dh;x8=+- x7 dh 0;aw2=*/ aw 1 2;x6=+- r 0 aw2;y1=+- t ah 0;swAng=at2 ah dx;mswAng=+- 0 0 swAng;iy=+- t idy 0;ix=+/ wR x3 2;q12=*/ th 1 2;dang2=at2 idy q12;swAng2=+- dang2 0 swAng;mswAng2=+- 0 0 swAng2;stAng3=+- cd4 0 swAng;swAng3=+- swAng dang2 0;stAng2=+- cd4 0 dang2|,,,false~M x6 t;L x8 y1;L x7 y1;A wR h stAng3 swAng3;A wR h stAng2 swAng2;L x4 y1;Z#,,darkenLess,false~M wR b;A wR h cd4 cd4;L th t;A wR h cd2 -5400000;Z#,,none,~M ix iy;A wR h stAng2 swAng2;L x4 y1;L x6 t;L x8 y1;L x7 y1;A wR h stAng3 swAng;L wR b;A wR h cd4 cd4;L th t;A wR h cd2 -5400000|l t r b",
  decagon: "vf=val 105146|shd2=*/ hd2 vf 100000;dx1=cos wd2 2160000;dx2=cos wd2 4320000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;dy1=sin shd2 4320000;dy2=sin shd2 2160000;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc dy2 0;y4=+- vc dy1 0|,,,~M l vc;L x1 y2;L x2 y1;L x3 y1;L x4 y2;L r vc;L x4 y3;L x3 y4;L x2 y4;L x1 y3;Z|x1 y2 x4 y3",
  diagStripe: "adj=val 50000|a=pin 0 adj 100000;x2=*/ w a 100000;x1=*/ x2 1 2;x3=+/ x2 r 2;y2=*/ h a 100000;y1=*/ y2 1 2;y3=+/ y2 b 2|,,,~M l y2;L x2 t;L r t;L l b;Z|l t x3 y3",
  diamond: "|ir=*/ w 3 4;ib=*/ h 3 4|,,,~M l vc;L hc t;L r vc;L hc b;Z|wd4 hd4 ir ib",
  dodecagon: "|x1=*/ w 2894 21600;x2=*/ w 7906 21600;x3=*/ w 13694 21600;x4=*/ w 18706 21600;y1=*/ h 2894 21600;y2=*/ h 7906 21600;y3=*/ h 13694 21600;y4=*/ h 18706 21600|,,,~M l y2;L x1 y1;L x2 t;L x3 t;L x4 y1;L r y2;L r y3;L x4 y4;L x3 b;L x2 b;L x1 y4;L l y3;Z|x1 y1 x4 y4",
  donut: "adj=val 25000|a=pin 0 adj 50000;dr=*/ ss a 100000;iwd2=+- wd2 0 dr;ihd2=+- hd2 0 dr;idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z;M dr vc;A iwd2 ihd2 cd2 -5400000;A iwd2 ihd2 cd4 -5400000;A iwd2 ihd2 0 -5400000;A iwd2 ihd2 3cd4 -5400000;Z|il it ir ib",
  doubleWave: "adj1=val 6250;adj2=val 0|a1=pin 0 adj1 12500;a2=pin -10000 adj2 10000;y1=*/ h a1 100000;dy2=*/ y1 10 3;y2=+- y1 0 dy2;y3=+- y1 dy2 0;y4=+- b 0 y1;y5=+- y4 0 dy2;y6=+- y4 dy2 0;dx1=*/ w a2 100000;of2=*/ w a2 50000;x1=abs dx1;dx2=?: of2 0 of2;x2=+- l 0 dx2;dx8=?: of2 of2 0;x8=+- r 0 dx8;dx3=+/ dx2 x8 6;x3=+- x2 dx3 0;dx4=+/ dx2 x8 3;x4=+- x2 dx4 0;x5=+/ x2 x8 2;x6=+- x5 dx3 0;x7=+/ x6 x8 2;x9=+- l dx8 0;x15=+- r dx2 0;x10=+- x9 dx3 0;x11=+- x9 dx4 0;x12=+/ x9 x15 2;x13=+- x12 dx3 0;x14=+/ x13 x15 2;x16=+- r 0 x1;xAdj=+- hc dx1 0;il=max x2 x9;ir=min x8 x15;it=*/ h a1 50000;ib=+- b 0 it|,,,~M x2 y1;C x3 y2 x4 y3 x5 y1;C x6 y2 x7 y3 x8 y1;L x15 y4;C x14 y6 x13 y5 x12 y4;C x11 y6 x10 y5 x9 y4;Z|il it ir ib",
  downArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 100000 h ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;dy1=*/ ss a2 100000;y1=+- b 0 dy1;dx1=*/ w a1 200000;x1=+- hc 0 dx1;x2=+- hc dx1 0;dy2=*/ x1 dy1 wd2;y2=+- y1 dy2 0|,,,~M l y1;L x1 y1;L x1 t;L x2 t;L x2 y1;L r y1;L hc b;Z|x1 t x2 y2",
  downArrowCallout: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 64977|maxAdj2=*/ 50000 w ss;a2=pin 0 adj2 maxAdj2;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=*/ 100000 h ss;a3=pin 0 adj3 maxAdj3;q2=*/ a3 ss h;maxAdj4=+- 100000 0 q2;a4=pin 0 adj4 maxAdj4;dx1=*/ ss a2 100000;dx2=*/ ss a1 200000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;dy3=*/ ss a3 100000;y3=+- b 0 dy3;y2=*/ h a4 100000;y1=*/ y2 1 2|,,,~M l t;L r t;L r y2;L x3 y2;L x3 y3;L x4 y3;L hc b;L x1 y3;L x2 y3;L x2 y2;L l y2;Z|l t r y2",
  ellipse: "|idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z|il it ir ib",
  ellipseRibbon: "adj1=val 25000;adj2=val 50000;adj3=val 12500|a1=pin 0 adj1 100000;a2=pin 25000 adj2 75000;q10=+- 100000 0 a1;q11=*/ q10 1 2;q12=+- a1 0 q11;minAdj3=max 0 q12;a3=pin minAdj3 adj3 a1;dx2=*/ w a2 200000;x2=+- hc 0 dx2;x3=+- x2 wd8 0;x4=+- r 0 x3;x5=+- r 0 x2;x6=+- r 0 wd8;dy1=*/ h a3 100000;f1=*/ 4 dy1 w;q1=*/ x3 x3 w;q2=+- x3 0 q1;y1=*/ f1 q2 1;cx1=*/ x3 1 2;cy1=*/ f1 cx1 1;cx2=+- r 0 cx1;q1=*/ h a1 100000;dy3=+- q1 0 dy1;q3=*/ x2 x2 w;q4=+- x2 0 q3;q5=*/ f1 q4 1;y3=+- q5 dy3 0;q6=+- dy1 dy3 y3;q7=+- q6 dy1 0;cy3=+- q7 dy3 0;rh=+- b 0 q1;q8=*/ dy1 14 16;y2=+/ q8 rh 2;y5=+- q5 rh 0;y6=+- y3 rh 0;cx4=*/ x2 1 2;q9=*/ f1 cx4 1;cy4=+- q9 rh 0;cx5=+- r 0 cx4;cy6=+- cy3 rh 0;y7=+- y1 dy3 0;cy7=+- q1 q1 y7;y8=+- b 0 dy1|,,,false~M l t;Q cx1 cy1 x3 y1;L x2 y3;Q hc cy3 x5 y3;L x4 y1;Q cx2 cy1 r t;L x6 y2;L r rh;Q cx5 cy4 x5 y5;L x5 y6;Q hc cy6 x2 y6;L x2 y5;Q cx4 cy4 l rh;L wd8 y2;Z#,,darkenLess,false~M x3 y7;L x3 y1;L x2 y3;Q hc cy3 x5 y3;L x4 y1;L x4 y7;Q hc cy7 x3 y7;Z#,,none,~M l t;Q cx1 cy1 x3 y1;L x2 y3;Q hc cy3 x5 y3;L x4 y1;Q cx2 cy1 r t;L x6 y2;L r rh;Q cx5 cy4 x5 y5;L x5 y6;Q hc cy6 x2 y6;L x2 y5;Q cx4 cy4 l rh;L wd8 y2;Z;M x2 y5;L x2 y3;M x5 y3;L x5 y5;M x3 y1;L x3 y7;M x4 y7;L x4 y1|x2 q1 x5 y6",
  ellipseRibbon2: "adj1=val 25000;adj2=val 50000;adj3=val 12500|a1=pin 0 adj1 100000;a2=pin 25000 adj2 75000;q10=+- 100000 0 a1;q11=*/ q10 1 2;q12=+- a1 0 q11;minAdj3=max 0 q12;a3=pin minAdj3 adj3 a1;dx2=*/ w a2 200000;x2=+- hc 0 dx2;x3=+- x2 wd8 0;x4=+- r 0 x3;x5=+- r 0 x2;x6=+- r 0 wd8;dy1=*/ h a3 100000;f1=*/ 4 dy1 w;q1=*/ x3 x3 w;q2=+- x3 0 q1;u1=*/ f1 q2 1;y1=+- b 0 u1;cx1=*/ x3 1 2;cu1=*/ f1 cx1 1;cy1=+- b 0 cu1;cx2=+- r 0 cx1;q1=*/ h a1 100000;dy3=+- q1 0 dy1;q3=*/ x2 x2 w;q4=+- x2 0 q3;q5=*/ f1 q4 1;u3=+- q5 dy3 0;y3=+- b 0 u3;q6=+- dy1 dy3 u3;q7=+- q6 dy1 0;cu3=+- q7 dy3 0;cy3=+- b 0 cu3;rh=+- b 0 q1;q8=*/ dy1 14 16;u2=+/ q8 rh 2;y2=+- b 0 u2;u5=+- q5 rh 0;y5=+- b 0 u5;u6=+- u3 rh 0;y6=+- b 0 u6;cx4=*/ x2 1 2;q9=*/ f1 cx4 1;cu4=+- q9 rh 0;cy4=+- b 0 cu4;cx5=+- r 0 cx4;cu6=+- cu3 rh 0;cy6=+- b 0 cu6;u7=+- u1 dy3 0;y7=+- b 0 u7;cu7=+- q1 q1 u7;cy7=+- b 0 cu7|,,,false~M l b;Q cx1 cy1 x3 y1;L x2 y3;Q hc cy3 x5 y3;L x4 y1;Q cx2 cy1 r b;L x6 y2;L r q1;Q cx5 cy4 x5 y5;L x5 y6;Q hc cy6 x2 y6;L x2 y5;Q cx4 cy4 l q1;L wd8 y2;Z#,,darkenLess,false~M x3 y7;L x3 y1;L x2 y3;Q hc cy3 x5 y3;L x4 y1;L x4 y7;Q hc cy7 x3 y7;Z#,,none,~M l b;L wd8 y2;L l q1;Q cx4 cy4 x2 y5;L x2 y6;Q hc cy6 x5 y6;L x5 y5;Q cx5 cy4 r q1;L x6 y2;L r b;Q cx2 cy1 x4 y1;L x5 y3;Q hc cy3 x2 y3;L x3 y1;Q cx1 cy1 l b;Z;M x2 y3;L x2 y5;M x5 y5;L x5 y3;M x3 y7;L x3 y1;M x4 y1;L x4 y7|x2 y6 x5 rh",
  flowChartAlternateProcess: "|x2=+- r 0 ssd6;y2=+- b 0 ssd6;il=*/ ssd6 29289 100000;ir=+- r 0 il;ib=+- b 0 il|,,,~M l ssd6;A ssd6 ssd6 cd2 cd4;L x2 t;A ssd6 ssd6 3cd4 cd4;L r y2;A ssd6 ssd6 0 cd4;L ssd6 b;A ssd6 ssd6 cd4 cd4;Z|il il ir ib",
  flowChartCollate: "|ir=*/ w 3 4;ib=*/ h 3 4|2,2,,~M 0 0;L 2 0;L 1 1;L 2 2;L 0 2;L 1 1;Z|wd4 hd4 ir ib",
  flowChartConnector: "|idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z|il it ir ib",
  flowChartDecision: "|ir=*/ w 3 4;ib=*/ h 3 4|2,2,,~M 0 1;L 1 0;L 2 1;L 1 2;Z|wd4 hd4 ir ib",
  flowChartDelay: "|idx=cos wd2 2700000;idy=sin hd2 2700000;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M l t;L hc t;A wd2 hd2 3cd4 cd2;L l b;Z|l it ir ib",
  flowChartDisplay: "|x2=*/ w 5 6|6,6,,~M 0 3;L 1 0;L 5 0;A 1 3 3cd4 cd2;L 1 6;Z|wd6 t x2 b",
  flowChartDocument: "|y1=*/ h 17322 21600;y2=*/ h 20172 21600|21600,21600,,~M 0 0;L 21600 0;L 21600 17322;C 10800 17322 10800 23922 0 20172;Z|l t r y1",
  flowChartExtract: "|x2=*/ w 3 4|2,2,,~M 0 2;L 1 0;L 2 2;Z|wd4 vc x2 b",
  flowChartInputOutput: "|x3=*/ w 2 5;x4=*/ w 3 5;x5=*/ w 4 5;x6=*/ w 9 10|5,5,,~M 0 5;L 1 0;L 5 0;L 4 5;Z|wd5 t x5 b",
  flowChartInternalStorage: "||1,1,,false~M 0 0;L 1 0;L 1 1;L 0 1;Z#8,8,none,~M 1 0;L 1 8;M 0 1;L 8 1#1,1,none,~M 0 0;L 1 0;L 1 1;L 0 1;Z|wd8 hd8 r b",
  flowChartMagneticDisk: "|y3=*/ h 5 6|6,6,,false~M 0 1;A 3 1 cd2 cd2;L 6 5;A 3 1 0 cd2;Z#6,6,none,~M 6 1;A 3 1 0 cd2#6,6,none,~M 0 1;A 3 1 cd2 cd2;L 6 5;A 3 1 0 cd2;Z|l hd3 r y3",
  flowChartMagneticDrum: "|x2=*/ w 2 3|6,6,,false~M 1 0;L 5 0;A 1 3 3cd4 cd2;L 1 6;A 1 3 cd4 cd2;Z#6,6,none,~M 5 6;A 1 3 cd4 cd2#6,6,none,~M 1 0;L 5 0;A 1 3 3cd4 cd2;L 1 6;A 1 3 cd4 cd2;Z|wd6 t x2 b",
  flowChartMagneticTape: "|idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0;ang1=at2 w h|,,,~M hc b;A wd2 hd2 cd4 cd4;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 ang1;L r ib;L r b;Z|il it ir ib",
  flowChartManualInput: "||5,5,,~M 0 1;L 5 0;L 5 5;L 0 5;Z|l hd5 r b",
  flowChartManualOperation: "|x3=*/ w 4 5;x4=*/ w 9 10|5,5,,~M 0 0;L 5 0;L 4 5;L 1 5;Z|wd5 t x3 b",
  flowChartMerge: "|x2=*/ w 3 4|2,2,,~M 0 0;L 2 0;L 1 2;Z|wd4 t x2 vc",
  flowChartMultidocument: "|y2=*/ h 3675 21600;y8=*/ h 20782 21600;x3=*/ w 9298 21600;x4=*/ w 12286 21600;x5=*/ w 18595 21600|21600,21600,,false~M 0 20782;C 9298 23542 9298 18022 18595 18022;L 18595 3675;L 0 3675;Z;M 1532 3675;L 1532 1815;L 20000 1815;L 20000 16252;C 19298 16252 18595 16352 18595 16352;L 18595 3675;Z;M 2972 1815;L 2972 0;L 21600 0;L 21600 14392;C 20800 14392 20000 14467 20000 14467;L 20000 1815;Z#21600,21600,none,~M 0 3675;L 18595 3675;L 18595 18022;C 9298 18022 9298 23542 0 20782;Z;M 1532 3675;L 1532 1815;L 20000 1815;L 20000 16252;C 19298 16252 18595 16352 18595 16352;M 2972 1815;L 2972 0;L 21600 0;L 21600 14392;C 20800 14392 20000 14467 20000 14467#21600,21600,none,false~M 0 20782;C 9298 23542 9298 18022 18595 18022;L 18595 16352;C 18595 16352 19298 16252 20000 16252;L 20000 14467;C 20000 14467 20800 14392 21600 14392;L 21600 0;L 2972 0;L 2972 1815;L 1532 1815;L 1532 3675;L 0 3675;Z|l y2 x5 y8",
  flowChartOfflineStorage: "|x4=*/ w 3 4|2,2,,false~M 0 0;L 2 0;L 1 2;Z#5,5,none,~M 2 4;L 3 4#2,2,none,~M 0 0;L 2 0;L 1 2;Z|wd4 t x4 vc",
  flowChartOffpageConnector: "|y1=*/ h 4 5|10,10,,~M 0 0;L 10 0;L 10 8;L 5 10;L 0 8;Z|l t r y1",
  flowChartOnlineStorage: "|x2=*/ w 5 6|6,6,,~M 1 0;L 6 0;A 1 3 3cd4 -10800000;L 1 6;A 1 3 cd4 cd2;Z|wd6 t x2 b",
  flowChartOr: "|idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,false~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z#,,none,~M hc t;L hc b;M l vc;L r vc#,,none,~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z|il it ir ib",
  flowChartPredefinedProcess: "|x2=*/ w 7 8|1,1,,false~M 0 0;L 1 0;L 1 1;L 0 1;Z#8,8,none,~M 1 0;L 1 8;M 7 0;L 7 8#1,1,none,~M 0 0;L 1 0;L 1 1;L 0 1;Z|wd8 t x2 b",
  flowChartPreparation: "|x2=*/ w 4 5|10,10,,~M 0 5;L 2 0;L 8 0;L 10 5;L 8 10;L 2 10;Z|wd5 t x2 b",
  flowChartProcess: "||1,1,,~M 0 0;L 1 0;L 1 1;L 0 1;Z|l t r b",
  flowChartPunchedCard: "||5,5,,~M 0 1;L 1 0;L 5 0;L 5 5;L 0 5;Z|l hd5 r b",
  flowChartPunchedTape: "|y2=*/ h 9 10;ib=*/ h 4 5|20,20,,~M 0 2;A 5 2 cd2 -10800000;A 5 2 cd2 cd2;L 20 18;A 5 2 0 -10800000;A 5 2 0 cd2;Z|l hd5 r ib",
  flowChartSort: "|ir=*/ w 3 4;ib=*/ h 3 4|2,2,,false~M 0 1;L 1 0;L 2 1;L 1 2;Z#2,2,none,~M 0 1;L 2 1#2,2,none,~M 0 1;L 1 0;L 2 1;L 1 2;Z|wd4 hd4 ir ib",
  flowChartSummingJunction: "|idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,false~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z#,,none,~M il it;L ir ib;M ir it;L il ib#,,none,~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z|il it ir ib",
  flowChartTerminator: "|il=*/ w 1018 21600;ir=*/ w 20582 21600;it=*/ h 3163 21600;ib=*/ h 18437 21600|21600,21600,,~M 3475 0;L 18125 0;A 3475 10800 3cd4 cd2;L 3475 21600;A 3475 10800 cd4 cd2;Z|il it ir ib",
  foldedCorner: "adj=val 16667|a=pin 0 adj 50000;dy2=*/ ss a 100000;dy1=*/ dy2 1 5;x1=+- r 0 dy2;x2=+- x1 dy1 0;y2=+- b 0 dy2;y1=+- y2 dy1 0|,,,false~M l t;L r t;L r y2;L x1 b;L l b;Z#,,darkenLess,false~M x1 b;L x2 y1;L r y2;Z#,,none,~M x1 b;L x2 y1;L r y2;L x1 b;L l b;L l t;L r t;L r y2|l t r y2",
  frame: "adj1=val 12500|a1=pin 0 adj1 50000;x1=*/ ss a1 100000;x4=+- r 0 x1;y4=+- b 0 x1|,,,~M l t;L r t;L r b;L l b;Z;M x1 x1;L x1 y4;L x4 y4;L x4 x1;Z|x1 x1 x4 y4",
  funnel: "|d=*/ ss 1 20;rw2=+- wd2 0 d;rh2=+- hd4 0 d;t1=cos wd2 480000;t2=sin hd4 480000;da=at2 t1 t2;2da=*/ da 2 1;stAng1=+- cd2 0 da;swAng1=+- cd2 2da 0;swAng3=+- cd2 0 2da;rw3=*/ wd2 1 4;rh3=*/ hd4 1 4;ct1=cos hd4 stAng1;st1=sin wd2 stAng1;m1=mod ct1 st1 0;n1=*/ wd2 hd4 m1;dx1=cos n1 stAng1;dy1=sin n1 stAng1;x1=+- hc dx1 0;y1=+- hd4 dy1 0;ct3=cos rh3 da;st3=sin rw3 da;m3=mod ct3 st3 0;n3=*/ rw3 rh3 m3;dx3=cos n3 da;dy3=sin n3 da;x3=+- hc dx3 0;vc3=+- b 0 rh3;y2=+- vc3 dy3 0;x2=+- wd2 0 rw2;cd=*/ cd2 2 1|,,,~M x1 y1;A wd2 hd4 stAng1 swAng1;L x3 y2;A rw3 rh3 da swAng3;Z;M x2 hd4;A rw2 rh2 cd2 -21600000;Z|l t r b",
  gear6: "adj1=val 15000;adj2=val 3526|a1=pin 0 adj1 20000;a2=pin 0 adj2 5358;th=*/ ss a1 100000;lFD=*/ ss a2 100000;th2=*/ th 1 2;l2=*/ lFD 1 2;l3=+- th2 l2 0;rh=+- hd2 0 th;rw=+- wd2 0 th;dr=+- rw 0 rh;maxr=?: dr rh rw;ha=at2 maxr l3;aA1=+- 19800000 0 ha;aD1=+- 19800000 ha 0;ta11=cos rw aA1;ta12=sin rh aA1;bA1=at2 ta11 ta12;cta1=cos rh bA1;sta1=sin rw bA1;ma1=mod cta1 sta1 0;na1=*/ rw rh ma1;dxa1=cos na1 bA1;dya1=sin na1 bA1;xA1=+- hc dxa1 0;yA1=+- vc dya1 0;td11=cos rw aD1;td12=sin rh aD1;bD1=at2 td11 td12;ctd1=cos rh bD1;std1=sin rw bD1;md1=mod ctd1 std1 0;nd1=*/ rw rh md1;dxd1=cos nd1 bD1;dyd1=sin nd1 bD1;xD1=+- hc dxd1 0;yD1=+- vc dyd1 0;xAD1=+- xA1 0 xD1;yAD1=+- yA1 0 yD1;lAD1=mod xAD1 yAD1 0;a1=at2 yAD1 xAD1;dxF1=sin lFD a1;dyF1=cos lFD a1;xF1=+- xD1 dxF1 0;yF1=+- yD1 dyF1 0;xE1=+- xA1 0 dxF1;yE1=+- yA1 0 dyF1;yC1t=sin th a1;xC1t=cos th a1;yC1=+- yF1 yC1t 0;xC1=+- xF1 0 xC1t;yB1=+- yE1 yC1t 0;xB1=+- xE1 0 xC1t;aD6=+- 3cd4 ha 0;td61=cos rw aD6;td62=sin rh aD6;bD6=at2 td61 td62;ctd6=cos rh bD6;std6=sin rw bD6;md6=mod ctd6 std6 0;nd6=*/ rw rh md6;dxd6=cos nd6 bD6;dyd6=sin nd6 bD6;xD6=+- hc dxd6 0;yD6=+- vc dyd6 0;xA6=+- hc 0 dxd6;xF6=+- xD6 0 lFD;xE6=+- xA6 lFD 0;yC6=+- yD6 0 th;swAng1=+- bA1 0 bD6;aA2=+- 1800000 0 ha;aD2=+- 1800000 ha 0;ta21=cos rw aA2;ta22=sin rh aA2;bA2=at2 ta21 ta22;yA2=+- h 0 yD1;td21=cos rw aD2;td22=sin rh aD2;bD2=at2 td21 td22;yD2=+- h 0 yA1;yC2=+- h 0 yB1;yB2=+- h 0 yC1;xB2=val xC1;swAng2=+- bA2 0 bD1;aD3=+- cd4 ha 0;td31=cos rw aD3;td32=sin rh aD3;bD3=at2 td31 td32;yD3=+- h 0 yD6;yB3=+- h 0 yC6;aD4=+- 9000000 ha 0;td41=cos rw aD4;td42=sin rh aD4;bD4=at2 td41 td42;xD4=+- w 0 xD1;xC4=+- w 0 xC1;xB4=+- w 0 xB1;aD5=+- 12600000 ha 0;td51=cos rw aD5;td52=sin rh aD5;bD5=at2 td51 td52;xD5=+- w 0 xA1;xC5=+- w 0 xB1;xB5=+- w 0 xC1;xCxn1=+/ xB1 xC1 2;yCxn1=+/ yB1 yC1 2;yCxn2=+- b 0 yCxn1;xCxn4=+/ r 0 xCxn1|,,,~M xA1 yA1;L xB1 yB1;L xC1 yC1;L xD1 yD1;A rw rh bD1 swAng2;L xC1 yB2;L xB1 yC2;L xA1 yD2;A rw rh bD2 swAng1;L xF6 yB3;L xE6 yB3;L xA6 yD3;A rw rh bD3 swAng1;L xB4 yC2;L xC4 yB2;L xD4 yA2;A rw rh bD4 swAng2;L xB5 yC1;L xC5 yB1;L xD5 yA1;A rw rh bD5 swAng1;L xE6 yC6;L xF6 yC6;L xD6 yD6;A rw rh bD6 swAng1;Z|xD5 yA1 xA1 yD2",
  gear9: "adj1=val 10000;adj2=val 1763|a1=pin 0 adj1 20000;a2=pin 0 adj2 2679;th=*/ ss a1 100000;lFD=*/ ss a2 100000;th2=*/ th 1 2;l2=*/ lFD 1 2;l3=+- th2 l2 0;rh=+- hd2 0 th;rw=+- wd2 0 th;dr=+- rw 0 rh;maxr=?: dr rh rw;ha=at2 maxr l3;aA1=+- 18600000 0 ha;aD1=+- 18600000 ha 0;ta11=cos rw aA1;ta12=sin rh aA1;bA1=at2 ta11 ta12;cta1=cos rh bA1;sta1=sin rw bA1;ma1=mod cta1 sta1 0;na1=*/ rw rh ma1;dxa1=cos na1 bA1;dya1=sin na1 bA1;xA1=+- hc dxa1 0;yA1=+- vc dya1 0;td11=cos rw aD1;td12=sin rh aD1;bD1=at2 td11 td12;ctd1=cos rh bD1;std1=sin rw bD1;md1=mod ctd1 std1 0;nd1=*/ rw rh md1;dxd1=cos nd1 bD1;dyd1=sin nd1 bD1;xD1=+- hc dxd1 0;yD1=+- vc dyd1 0;xAD1=+- xA1 0 xD1;yAD1=+- yA1 0 yD1;lAD1=mod xAD1 yAD1 0;a1=at2 yAD1 xAD1;dxF1=sin lFD a1;dyF1=cos lFD a1;xF1=+- xD1 dxF1 0;yF1=+- yD1 dyF1 0;xE1=+- xA1 0 dxF1;yE1=+- yA1 0 dyF1;yC1t=sin th a1;xC1t=cos th a1;yC1=+- yF1 yC1t 0;xC1=+- xF1 0 xC1t;yB1=+- yE1 yC1t 0;xB1=+- xE1 0 xC1t;aA2=+- 21000000 0 ha;aD2=+- 21000000 ha 0;ta21=cos rw aA2;ta22=sin rh aA2;bA2=at2 ta21 ta22;cta2=cos rh bA2;sta2=sin rw bA2;ma2=mod cta2 sta2 0;na2=*/ rw rh ma2;dxa2=cos na2 bA2;dya2=sin na2 bA2;xA2=+- hc dxa2 0;yA2=+- vc dya2 0;td21=cos rw aD2;td22=sin rh aD2;bD2=at2 td21 td22;ctd2=cos rh bD2;std2=sin rw bD2;md2=mod ctd2 std2 0;nd2=*/ rw rh md2;dxd2=cos nd2 bD2;dyd2=sin nd2 bD2;xD2=+- hc dxd2 0;yD2=+- vc dyd2 0;xAD2=+- xA2 0 xD2;yAD2=+- yA2 0 yD2;lAD2=mod xAD2 yAD2 0;a2=at2 yAD2 xAD2;dxF2=sin lFD a2;dyF2=cos lFD a2;xF2=+- xD2 dxF2 0;yF2=+- yD2 dyF2 0;xE2=+- xA2 0 dxF2;yE2=+- yA2 0 dyF2;yC2t=sin th a2;xC2t=cos th a2;yC2=+- yF2 yC2t 0;xC2=+- xF2 0 xC2t;yB2=+- yE2 yC2t 0;xB2=+- xE2 0 xC2t;swAng1=+- bA2 0 bD1;aA3=+- 1800000 0 ha;aD3=+- 1800000 ha 0;ta31=cos rw aA3;ta32=sin rh aA3;bA3=at2 ta31 ta32;cta3=cos rh bA3;sta3=sin rw bA3;ma3=mod cta3 sta3 0;na3=*/ rw rh ma3;dxa3=cos na3 bA3;dya3=sin na3 bA3;xA3=+- hc dxa3 0;yA3=+- vc dya3 0;td31=cos rw aD3;td32=sin rh aD3;bD3=at2 td31 td32;ctd3=cos rh bD3;std3=sin rw bD3;md3=mod ctd3 std3 0;nd3=*/ rw rh md3;dxd3=cos nd3 bD3;dyd3=sin nd3 bD3;xD3=+- hc dxd3 0;yD3=+- vc dyd3 0;xAD3=+- xA3 0 xD3;yAD3=+- yA3 0 yD3;lAD3=mod xAD3 yAD3 0;a3=at2 yAD3 xAD3;dxF3=sin lFD a3;dyF3=cos lFD a3;xF3=+- xD3 dxF3 0;yF3=+- yD3 dyF3 0;xE3=+- xA3 0 dxF3;yE3=+- yA3 0 dyF3;yC3t=sin th a3;xC3t=cos th a3;yC3=+- yF3 yC3t 0;xC3=+- xF3 0 xC3t;yB3=+- yE3 yC3t 0;xB3=+- xE3 0 xC3t;swAng2=+- bA3 0 bD2;aA4=+- 4200000 0 ha;aD4=+- 4200000 ha 0;ta41=cos rw aA4;ta42=sin rh aA4;bA4=at2 ta41 ta42;cta4=cos rh bA4;sta4=sin rw bA4;ma4=mod cta4 sta4 0;na4=*/ rw rh ma4;dxa4=cos na4 bA4;dya4=sin na4 bA4;xA4=+- hc dxa4 0;yA4=+- vc dya4 0;td41=cos rw aD4;td42=sin rh aD4;bD4=at2 td41 td42;ctd4=cos rh bD4;std4=sin rw bD4;md4=mod ctd4 std4 0;nd4=*/ rw rh md4;dxd4=cos nd4 bD4;dyd4=sin nd4 bD4;xD4=+- hc dxd4 0;yD4=+- vc dyd4 0;xAD4=+- xA4 0 xD4;yAD4=+- yA4 0 yD4;lAD4=mod xAD4 yAD4 0;a4=at2 yAD4 xAD4;dxF4=sin lFD a4;dyF4=cos lFD a4;xF4=+- xD4 dxF4 0;yF4=+- yD4 dyF4 0;xE4=+- xA4 0 dxF4;yE4=+- yA4 0 dyF4;yC4t=sin th a4;xC4t=cos th a4;yC4=+- yF4 yC4t 0;xC4=+- xF4 0 xC4t;yB4=+- yE4 yC4t 0;xB4=+- xE4 0 xC4t;swAng3=+- bA4 0 bD3;aA5=+- 6600000 0 ha;aD5=+- 6600000 ha 0;ta51=cos rw aA5;ta52=sin rh aA5;bA5=at2 ta51 ta52;td51=cos rw aD5;td52=sin rh aD5;bD5=at2 td51 td52;xD5=+- w 0 xA4;xC5=+- w 0 xB4;xB5=+- w 0 xC4;swAng4=+- bA5 0 bD4;aD6=+- 9000000 ha 0;td61=cos rw aD6;td62=sin rh aD6;bD6=at2 td61 td62;xD6=+- w 0 xA3;xC6=+- w 0 xB3;xB6=+- w 0 xC3;aD7=+- 11400000 ha 0;td71=cos rw aD7;td72=sin rh aD7;bD7=at2 td71 td72;xD7=+- w 0 xA2;xC7=+- w 0 xB2;xB7=+- w 0 xC2;aD8=+- 13800000 ha 0;td81=cos rw aD8;td82=sin rh aD8;bD8=at2 td81 td82;xA8=+- w 0 xD1;xD8=+- w 0 xA1;xC8=+- w 0 xB1;xB8=+- w 0 xC1;aA9=+- 3cd4 0 ha;aD9=+- 3cd4 ha 0;td91=cos rw aD9;td92=sin rh aD9;bD9=at2 td91 td92;ctd9=cos rh bD9;std9=sin rw bD9;md9=mod ctd9 std9 0;nd9=*/ rw rh md9;dxd9=cos nd9 bD9;dyd9=sin nd9 bD9;xD9=+- hc dxd9 0;yD9=+- vc dyd9 0;ta91=cos rw aA9;ta92=sin rh aA9;bA9=at2 ta91 ta92;xA9=+- hc 0 dxd9;xF9=+- xD9 0 lFD;xE9=+- xA9 lFD 0;yC9=+- yD9 0 th;swAng5=+- bA9 0 bD8;xCxn1=+/ xB1 xC1 2;yCxn1=+/ yB1 yC1 2;xCxn2=+/ xB2 xC2 2;yCxn2=+/ yB2 yC2 2;xCxn3=+/ xB3 xC3 2;yCxn3=+/ yB3 yC3 2;xCxn4=+/ xB4 xC4 2;yCxn4=+/ yB4 yC4 2;xCxn5=+/ r 0 xCxn4;xCxn6=+/ r 0 xCxn3;xCxn7=+/ r 0 xCxn2;xCxn8=+/ r 0 xCxn1|,,,~M xA1 yA1;L xB1 yB1;L xC1 yC1;L xD1 yD1;A rw rh bD1 swAng1;L xB2 yB2;L xC2 yC2;L xD2 yD2;A rw rh bD2 swAng2;L xB3 yB3;L xC3 yC3;L xD3 yD3;A rw rh bD3 swAng3;L xB4 yB4;L xC4 yC4;L xD4 yD4;A rw rh bD4 swAng4;L xB5 yC4;L xC5 yB4;L xD5 yA4;A rw rh bD5 swAng3;L xB6 yC3;L xC6 yB3;L xD6 yA3;A rw rh bD6 swAng2;L xB7 yC2;L xC7 yB2;L xD7 yA2;A rw rh bD7 swAng1;L xB8 yC1;L xC8 yB1;L xD8 yA1;A rw rh bD8 swAng5;L xE9 yC9;L xF9 yC9;L xD9 yD9;A rw rh bD9 swAng5;Z|xA8 yD1 xD1 yD3",
  halfFrame: "adj1=val 33333;adj2=val 33333|maxAdj2=*/ 100000 w ss;a2=pin 0 adj2 maxAdj2;x1=*/ ss a2 100000;g1=*/ h x1 w;g2=+- h 0 g1;maxAdj1=*/ 100000 g2 ss;a1=pin 0 adj1 maxAdj1;y1=*/ ss a1 100000;dx2=*/ y1 w h;x2=+- r 0 dx2;dy2=*/ x1 h w;y2=+- b 0 dy2;cx1=*/ x1 1 2;cy1=+/ y2 b 2;cx2=+/ x2 r 2;cy2=*/ y1 1 2|,,,~M l t;L r t;L x2 y1;L x1 y1;L x1 y2;L l b;Z|l t r b",
  heart: "|dx1=*/ w 49 48;dx2=*/ w 10 48;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;y1=+- t 0 hd3;il=*/ w 1 6;ir=*/ w 5 6;ib=*/ h 2 3|,,,~M hc hd4;C x3 y1 x4 hd4 hc b;C x1 hd4 x2 y1 hc hd4;Z|il hd4 ir ib",
  heptagon: "hf=val 102572;vf=val 105210|swd2=*/ wd2 hf 100000;shd2=*/ hd2 vf 100000;svc=*/ vc  vf 100000;dx1=*/ swd2 97493 100000;dx2=*/ swd2 78183 100000;dx3=*/ swd2 43388 100000;dy1=*/ shd2 62349 100000;dy2=*/ shd2 22252 100000;dy3=*/ shd2 90097 100000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc 0 dx3;x4=+- hc dx3 0;x5=+- hc dx2 0;x6=+- hc dx1 0;y1=+- svc 0 dy1;y2=+- svc dy2 0;y3=+- svc dy3 0;ib=+- b 0 y1|,,,~M x1 y2;L x2 y1;L hc t;L x5 y1;L x6 y2;L x4 y3;L x3 y3;Z|x2 y1 x5 ib",
  hexagon: "adj=val 25000;vf=val 115470|maxAdj=*/ 50000 w ss;a=pin 0 adj maxAdj;shd2=*/ hd2 vf 100000;x1=*/ ss a 100000;x2=+- r 0 x1;dy1=sin shd2 3600000;y1=+- vc 0 dy1;y2=+- vc dy1 0;q1=*/ maxAdj -1 2;q2=+- a q1 0;q3=?: q2 4 2;q4=?: q2 3 2;q5=?: q2 q1 0;q6=+/ a q5 q1;q7=*/ q6 q4 -1;q8=+- q3 q7 0;il=*/ w q8 24;it=*/ h q8 24;ir=+- r 0 il;ib=+- b 0 it|,,,~M l vc;L x1 y1;L x2 y1;L r vc;L x2 y2;L x1 y2;Z|il it ir ib",
  homePlate: "adj=val 50000|maxAdj=*/ 100000 w ss;a=pin 0 adj maxAdj;dx1=*/ ss a 100000;x1=+- r 0 dx1;ir=+/ x1 r 2;x2=*/ x1 1 2|,,,~M l t;L x1 t;L r vc;L x1 b;L l b;Z|l t ir b",
  horizontalScroll: "adj=val 12500|a=pin 0 adj 25000;ch=*/ ss a 100000;ch2=*/ ch 1 2;ch4=*/ ch 1 4;y3=+- ch ch2 0;y4=+- ch ch 0;y6=+- b 0 ch;y7=+- b 0 ch2;y5=+- y6 0 ch2;x3=+- r 0 ch;x4=+- r 0 ch2|,,,false~M r ch2;A ch2 ch2 0 cd4;L x4 ch2;A ch4 ch4 0 cd2;L x3 ch;L ch2 ch;A ch2 ch2 3cd4 -5400000;L l y7;A ch2 ch2 cd2 -10800000;L ch y6;L x4 y6;A ch2 ch2 cd4 -5400000;Z;M ch2 y4;A ch2 ch2 cd4 -5400000;A ch4 ch4 0 -10800000;Z#,,darkenLess,false~M ch2 y4;A ch2 ch2 cd4 -5400000;A ch4 ch4 0 -10800000;Z;M x4 ch;A ch2 ch2 cd4 -16200000;A ch4 ch4 cd2 -10800000;Z#,,none,~M l y3;A ch2 ch2 cd2 cd4;L x3 ch;L x3 ch2;A ch2 ch2 cd2 cd2;L r y5;A ch2 ch2 0 cd4;L ch y6;L ch y7;A ch2 ch2 0 cd2;Z;M x3 ch;L x4 ch;A ch2 ch2 cd4 -5400000;M x4 ch;L x4 ch2;A ch4 ch4 0 cd2;M ch2 y4;L ch2 y3;A ch4 ch4 cd2 cd2;A ch2 ch2 0 cd2;M ch y3;L ch y6|ch ch x4 y6",
  irregularSeal1: "|x5=*/ w 4627 21600;x12=*/ w 8485 21600;x21=*/ w 16702 21600;x24=*/ w 14522 21600;y3=*/ h 6320 21600;y6=*/ h 8615 21600;y9=*/ h 13937 21600;y18=*/ h 13290 21600|21600,21600,,~M 10800 5800;L 14522 0;L 14155 5325;L 18380 4457;L 16702 7315;L 21097 8137;L 17607 10475;L 21600 13290;L 16837 12942;L 18145 18095;L 14020 14457;L 13247 19737;L 10532 14935;L 8485 21600;L 7715 15627;L 4762 17617;L 5667 13937;L 135 14587;L 3722 11775;L 0 8615;L 4627 7617;L 370 2295;L 7312 6320;L 8352 2295;Z|x5 y3 x21 y9",
  irregularSeal2: "|x2=*/ w 9722 21600;x5=*/ w 5372 21600;x16=*/ w 11612 21600;x19=*/ w 14640 21600;y2=*/ h 1887 21600;y3=*/ h 6382 21600;y8=*/ h 12877 21600;y14=*/ h 19712 21600;y16=*/ h 18842 21600;y17=*/ h 15935 21600;y24=*/ h 6645 21600|21600,21600,,~M 11462 4342;L 14790 0;L 14525 5777;L 18007 3172;L 16380 6532;L 21600 6645;L 16985 9402;L 18270 11290;L 16380 12310;L 18877 15632;L 14640 14350;L 14942 17370;L 12180 15935;L 11612 18842;L 9872 17370;L 8700 19712;L 7527 18125;L 4917 21600;L 4805 18240;L 1285 17825;L 3330 15370;L 0 12877;L 3935 11592;L 1172 8270;L 5372 7817;L 4502 3625;L 8550 6382;L 9722 1887;Z|x5 y3 x19 y17",
  leftArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 100000 w ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;dx2=*/ ss a2 100000;x2=+- l dx2 0;dy1=*/ h a1 200000;y1=+- vc 0 dy1;y2=+- vc dy1 0;dx1=*/ y1 dx2 hd2;x1=+- x2  0 dx1|,,,~M l vc;L x2 t;L x2 y1;L r y1;L r y2;L x2 y2;L x2 b;Z|x1 y1 r y2",
  leftArrowCallout: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 64977|maxAdj2=*/ 50000 h ss;a2=pin 0 adj2 maxAdj2;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=*/ 100000 w ss;a3=pin 0 adj3 maxAdj3;q2=*/ a3 ss w;maxAdj4=+- 100000 0 q2;a4=pin 0 adj4 maxAdj4;dy1=*/ ss a2 100000;dy2=*/ ss a1 200000;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc dy2 0;y4=+- vc dy1 0;x1=*/ ss a3 100000;dx2=*/ w a4 100000;x2=+- r 0 dx2;x3=+/ x2 r 2|,,,~M l vc;L x1 y1;L x1 y2;L x2 y2;L x2 t;L r t;L r b;L x2 b;L x2 y3;L x1 y3;L x1 y4;Z|x2 t r b",
  leftBrace: "adj1=val 8333;adj2=val 50000|a2=pin 0 adj2 100000;q1=+- 100000 0 a2;q2=min q1 a2;q3=*/ q2 1 2;maxAdj1=*/ q3 h ss;a1=pin 0 adj1 maxAdj1;y1=*/ ss a1 100000;y3=*/ h a2 100000;y4=+- y3 y1 0;dx1=cos wd2 2700000;dy1=sin y1 2700000;il=+- r 0 dx1;it=+- y1 0 dy1;ib=+- b dy1 y1|,,,false~M r b;A wd2 y1 cd4 cd4;L hc y4;A wd2 y1 0 -5400000;A wd2 y1 cd4 -5400000;L hc y1;A wd2 y1 cd2 cd4;Z#,,none,~M r b;A wd2 y1 cd4 cd4;L hc y4;A wd2 y1 0 -5400000;A wd2 y1 cd4 -5400000;L hc y1;A wd2 y1 cd2 cd4|il it r ib",
  leftBracket: "adj=val 8333|maxAdj=*/ 50000 h ss;a=pin 0 adj maxAdj;y1=*/ ss a 100000;y2=+- b 0 y1;dx1=cos w 2700000;dy1=sin y1 2700000;il=+- r 0 dx1;it=+- y1 0 dy1;ib=+- b dy1 y1|,,,false~M r b;A w y1 cd4 cd4;L l y1;A w y1 cd2 cd4;Z#,,none,~M r b;A w y1 cd4 cd4;L l y1;A w y1 cd2 cd4|il it r ib",
  leftCircularArrow: "adj1=val 12500;adj2=val -1142319;adj3=val 1142319;adj4=val 10800000;adj5=val 12500|a5=pin 0 adj5 25000;maxAdj1=*/ a5 2 1;a1=pin 0 adj1 maxAdj1;enAng=pin 1 adj3 21599999;stAng=pin 0 adj4 21599999;th=*/ ss a1 100000;thh=*/ ss a5 100000;th2=*/ th 1 2;rw1=+- wd2 th2 thh;rh1=+- hd2 th2 thh;rw2=+- rw1 0 th;rh2=+- rh1 0 th;rw3=+- rw2 th2 0;rh3=+- rh2 th2 0;wtH=sin rw3 enAng;htH=cos rh3 enAng;dxH=cat2 rw3 htH wtH;dyH=sat2 rh3 htH wtH;xH=+- hc dxH 0;yH=+- vc dyH 0;rI=min rw2 rh2;u1=*/ dxH dxH 1;u2=*/ dyH dyH 1;u3=*/ rI rI 1;u4=+- u1 0 u3;u5=+- u2 0 u3;u6=*/ u4 u5 u1;u7=*/ u6 1 u2;u8=+- 1 0 u7;u9=sqrt u8;u10=*/ u4 1 dxH;u11=*/ u10 1 dyH;u12=+/ 1 u9 u11;u13=at2 1 u12;u14=+- u13 21600000 0;u15=?: u13 u13 u14;u16=+- u15 0 enAng;u17=+- u16 21600000 0;u18=?: u16 u16 u17;u19=+- u18 0 cd2;u20=+- u18 0 21600000;u21=?: u19 u20 u18;u22=abs u21;minAng=*/ u22 -1 1;u23=abs adj2;a2=*/ u23 -1 1;aAng=pin minAng a2 0;ptAng=+- enAng aAng 0;wtA=sin rw3 ptAng;htA=cos rh3 ptAng;dxA=cat2 rw3 htA wtA;dyA=sat2 rh3 htA wtA;xA=+- hc dxA 0;yA=+- vc dyA 0;wtE=sin rw1 stAng;htE=cos rh1 stAng;dxE=cat2 rw1 htE wtE;dyE=sat2 rh1 htE wtE;xE=+- hc dxE 0;yE=+- vc dyE 0;wtD=sin rw2 stAng;htD=cos rh2 stAng;dxD=cat2 rw2 htD wtD;dyD=sat2 rh2 htD wtD;xD=+- hc dxD 0;yD=+- vc dyD 0;dxG=cos thh ptAng;dyG=sin thh ptAng;xG=+- xH dxG 0;yG=+- yH dyG 0;dxB=cos thh ptAng;dyB=sin thh ptAng;xB=+- xH 0 dxB 0;yB=+- yH 0 dyB 0;sx1=+- xB 0 hc;sy1=+- yB 0 vc;sx2=+- xG 0 hc;sy2=+- yG 0 vc;rO=min rw1 rh1;x1O=*/ sx1 rO rw1;y1O=*/ sy1 rO rh1;x2O=*/ sx2 rO rw1;y2O=*/ sy2 rO rh1;dxO=+- x2O 0 x1O;dyO=+- y2O 0 y1O;dO=mod dxO dyO 0;q1=*/ x1O y2O 1;q2=*/ x2O y1O 1;DO=+- q1 0 q2;q3=*/ rO rO 1;q4=*/ dO dO 1;q5=*/ q3 q4 1;q6=*/ DO DO 1;q7=+- q5 0 q6;q8=max q7 0;sdelO=sqrt q8;ndyO=*/ dyO -1 1;sdyO=?: ndyO -1 1;q9=*/ sdyO dxO 1;q10=*/ q9 sdelO 1;q11=*/ DO dyO 1;dxF1=+/ q11 q10 q4;q12=+- q11 0 q10;dxF2=*/ q12 1 q4;adyO=abs dyO;q13=*/ adyO sdelO 1;q14=*/ DO dxO -1;dyF1=+/ q14 q13 q4;q15=+- q14 0 q13;dyF2=*/ q15 1 q4;q16=+- x2O 0 dxF1;q17=+- x2O 0 dxF2;q18=+- y2O 0 dyF1;q19=+- y2O 0 dyF2;q20=mod q16 q18 0;q21=mod q17 q19 0;q22=+- q21 0 q20;dxF=?: q22 dxF1 dxF2;dyF=?: q22 dyF1 dyF2;sdxF=*/ dxF rw1 rO;sdyF=*/ dyF rh1 rO;xF=+- hc sdxF 0;yF=+- vc sdyF 0;x1I=*/ sx1 rI rw2;y1I=*/ sy1 rI rh2;x2I=*/ sx2 rI rw2;y2I=*/ sy2 rI rh2;dxI=+- x2I 0 x1I;dyI=+- y2I 0 y1I;dI=mod dxI dyI 0;v1=*/ x1I y2I 1;v2=*/ x2I y1I 1;DI=+- v1 0 v2;v3=*/ rI rI 1;v4=*/ dI dI 1;v5=*/ v3 v4 1;v6=*/ DI DI 1;v7=+- v5 0 v6;v8=max v7 0;sdelI=sqrt v8;v9=*/ sdyO dxI 1;v10=*/ v9 sdelI 1;v11=*/ DI dyI 1;dxC1=+/ v11 v10 v4;v12=+- v11 0 v10;dxC2=*/ v12 1 v4;adyI=abs dyI;v13=*/ adyI sdelI 1;v14=*/ DI dxI -1;dyC1=+/ v14 v13 v4;v15=+- v14 0 v13;dyC2=*/ v15 1 v4;v16=+- x1I 0 dxC1;v17=+- x1I 0 dxC2;v18=+- y1I 0 dyC1;v19=+- y1I 0 dyC2;v20=mod v16 v18 0;v21=mod v17 v19 0;v22=+- v21 0 v20;dxC=?: v22 dxC1 dxC2;dyC=?: v22 dyC1 dyC2;sdxC=*/ dxC rw2 rI;sdyC=*/ dyC rh2 rI;xC=+- hc sdxC 0;yC=+- vc sdyC 0;ist0=at2 sdxC sdyC;ist1=+- ist0 21600000 0;istAng0=?: ist0 ist0 ist1;isw1=+- stAng 0 istAng0;isw2=+- isw1 21600000 0;iswAng0=?: isw1 isw1 isw2;istAng=+- istAng0 iswAng0 0;iswAng=+- 0 0 iswAng0;p1=+- xF 0 xC;p2=+- yF 0 yC;p3=mod p1 p2 0;p4=*/ p3 1 2;p5=+- p4 0 thh;xGp=?: p5 xF xG;yGp=?: p5 yF yG;xBp=?: p5 xC xB;yBp=?: p5 yC yB;en0=at2 sdxF sdyF;en1=+- en0 21600000 0;en2=?: en0 en0 en1;sw0=+- en2 0 stAng;sw1=+- sw0 0 21600000;swAng=?: sw0 sw1 sw0;stAng0=+- stAng swAng 0;swAng0=+- 0 0 swAng;wtI=sin rw3 stAng;htI=cos rh3 stAng;dxI=cat2 rw3 htI wtI;dyI=sat2 rh3 htI wtI;xI=+- hc dxI 0;yI=+- vc dyI 0;aI=+- stAng cd4 0;aA=+- ptAng 0 cd4;aB=+- ptAng cd2 0;idx=cos rw1 2700000;idy=sin rh1 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M xE yE;L xD yD;A rw2 rh2 istAng iswAng;L xBp yBp;L xA yA;L xGp yGp;L xF yF;A rw1 rh1 stAng0 swAng0;Z|il it ir ib",
  leftRightArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 50000 w ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;x2=*/ ss a2 100000;x3=+- r 0 x2;dy=*/ h a1 200000;y1=+- vc 0 dy;y2=+- vc dy 0;dx1=*/ y1 x2 hd2;x1=+- x2 0 dx1;x4=+- x3 dx1 0|,,,~M l vc;L x2 t;L x2 y1;L x3 y1;L x3 t;L r vc;L x3 b;L x3 y2;L x2 y2;L x2 b;Z|x1 y1 x4 y2",
  leftRightArrowCallout: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 48123|maxAdj2=*/ 50000 h ss;a2=pin 0 adj2 maxAdj2;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=*/ 50000 w ss;a3=pin 0 adj3 maxAdj3;q2=*/ a3 ss wd2;maxAdj4=+- 100000 0 q2;a4=pin 0 adj4 maxAdj4;dy1=*/ ss a2 100000;dy2=*/ ss a1 200000;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc dy2 0;y4=+- vc dy1 0;x1=*/ ss a3 100000;x4=+- r 0 x1;dx2=*/ w a4 200000;x2=+- hc 0 dx2;x3=+- hc dx2 0|,,,~M l vc;L x1 y1;L x1 y2;L x2 y2;L x2 t;L x3 t;L x3 y2;L x4 y2;L x4 y1;L r vc;L x4 y4;L x4 y3;L x3 y3;L x3 b;L x2 b;L x2 y3;L x1 y3;L x1 y4;Z|x2 t x3 b",
  leftRightCircularArrow: "adj1=val 12500;adj2=val 1142319;adj3=val 20457681;adj4=val 11942319;adj5=val 12500|a5=pin 0 adj5 25000;maxAdj1=*/ a5 2 1;a1=pin 0 adj1 maxAdj1;enAng=pin 1 adj3 21599999;stAng=pin 0 adj4 21599999;th=*/ ss a1 100000;thh=*/ ss a5 100000;th2=*/ th 1 2;rw1=+- wd2 th2 thh;rh1=+- hd2 th2 thh;rw2=+- rw1 0 th;rh2=+- rh1 0 th;rw3=+- rw2 th2 0;rh3=+- rh2 th2 0;wtH=sin rw3 enAng;htH=cos rh3 enAng;dxH=cat2 rw3 htH wtH;dyH=sat2 rh3 htH wtH;xH=+- hc dxH 0;yH=+- vc dyH 0;rI=min rw2 rh2;u1=*/ dxH dxH 1;u2=*/ dyH dyH 1;u3=*/ rI rI 1;u4=+- u1 0 u3;u5=+- u2 0 u3;u6=*/ u4 u5 u1;u7=*/ u6 1 u2;u8=+- 1 0 u7;u9=sqrt u8;u10=*/ u4 1 dxH;u11=*/ u10 1 dyH;u12=+/ 1 u9 u11;u13=at2 1 u12;u14=+- u13 21600000 0;u15=?: u13 u13 u14;u16=+- u15 0 enAng;u17=+- u16 21600000 0;u18=?: u16 u16 u17;u19=+- u18 0 cd2;u20=+- u18 0 21600000;u21=?: u19 u20 u18;maxAng=abs u21;aAng=pin 0 adj2 maxAng;ptAng=+- enAng aAng 0;wtA=sin rw3 ptAng;htA=cos rh3 ptAng;dxA=cat2 rw3 htA wtA;dyA=sat2 rh3 htA wtA;xA=+- hc dxA 0;yA=+- vc dyA 0;dxG=cos thh ptAng;dyG=sin thh ptAng;xG=+- xH dxG 0;yG=+- yH dyG 0;dxB=cos thh ptAng;dyB=sin thh ptAng;xB=+- xH 0 dxB 0;yB=+- yH 0 dyB 0;sx1=+- xB 0 hc;sy1=+- yB 0 vc;sx2=+- xG 0 hc;sy2=+- yG 0 vc;rO=min rw1 rh1;x1O=*/ sx1 rO rw1;y1O=*/ sy1 rO rh1;x2O=*/ sx2 rO rw1;y2O=*/ sy2 rO rh1;dxO=+- x2O 0 x1O;dyO=+- y2O 0 y1O;dO=mod dxO dyO 0;q1=*/ x1O y2O 1;q2=*/ x2O y1O 1;DO=+- q1 0 q2;q3=*/ rO rO 1;q4=*/ dO dO 1;q5=*/ q3 q4 1;q6=*/ DO DO 1;q7=+- q5 0 q6;q8=max q7 0;sdelO=sqrt q8;ndyO=*/ dyO -1 1;sdyO=?: ndyO -1 1;q9=*/ sdyO dxO 1;q10=*/ q9 sdelO 1;q11=*/ DO dyO 1;dxF1=+/ q11 q10 q4;q12=+- q11 0 q10;dxF2=*/ q12 1 q4;adyO=abs dyO;q13=*/ adyO sdelO 1;q14=*/ DO dxO -1;dyF1=+/ q14 q13 q4;q15=+- q14 0 q13;dyF2=*/ q15 1 q4;q16=+- x2O 0 dxF1;q17=+- x2O 0 dxF2;q18=+- y2O 0 dyF1;q19=+- y2O 0 dyF2;q20=mod q16 q18 0;q21=mod q17 q19 0;q22=+- q21 0 q20;dxF=?: q22 dxF1 dxF2;dyF=?: q22 dyF1 dyF2;sdxF=*/ dxF rw1 rO;sdyF=*/ dyF rh1 rO;xF=+- hc sdxF 0;yF=+- vc sdyF 0;x1I=*/ sx1 rI rw2;y1I=*/ sy1 rI rh2;x2I=*/ sx2 rI rw2;y2I=*/ sy2 rI rh2;dxI=+- x2I 0 x1I;dyI=+- y2I 0 y1I;dI=mod dxI dyI 0;v1=*/ x1I y2I 1;v2=*/ x2I y1I 1;DI=+- v1 0 v2;v3=*/ rI rI 1;v4=*/ dI dI 1;v5=*/ v3 v4 1;v6=*/ DI DI 1;v7=+- v5 0 v6;v8=max v7 0;sdelI=sqrt v8;v9=*/ sdyO dxI 1;v10=*/ v9 sdelI 1;v11=*/ DI dyI 1;dxC1=+/ v11 v10 v4;v12=+- v11 0 v10;dxC2=*/ v12 1 v4;adyI=abs dyI;v13=*/ adyI sdelI 1;v14=*/ DI dxI -1;dyC1=+/ v14 v13 v4;v15=+- v14 0 v13;dyC2=*/ v15 1 v4;v16=+- x1I 0 dxC1;v17=+- x1I 0 dxC2;v18=+- y1I 0 dyC1;v19=+- y1I 0 dyC2;v20=mod v16 v18 0;v21=mod v17 v19 0;v22=+- v21 0 v20;dxC=?: v22 dxC1 dxC2;dyC=?: v22 dyC1 dyC2;sdxC=*/ dxC rw2 rI;sdyC=*/ dyC rh2 rI;xC=+- hc sdxC 0;yC=+- vc sdyC 0;wtI=sin rw3 stAng;htI=cos rh3 stAng;dxI=cat2 rw3 htI wtI;dyI=sat2 rh3 htI wtI;xI=+- hc dxI 0;yI=+- vc dyI 0;lptAng=+- stAng 0 aAng;wtL=sin rw3 lptAng;htL=cos rh3 lptAng;dxL=cat2 rw3 htL wtL;dyL=sat2 rh3 htL wtL;xL=+- hc dxL 0;yL=+- vc dyL 0;dxK=cos thh lptAng;dyK=sin thh lptAng;xK=+- xI dxK 0;yK=+- yI dyK 0;dxJ=cos thh lptAng;dyJ=sin thh lptAng;xJ=+- xI 0 dxJ 0;yJ=+- yI 0 dyJ 0;p1=+- xF 0 xC;p2=+- yF 0 yC;p3=mod p1 p2 0;p4=*/ p3 1 2;p5=+- p4 0 thh;xGp=?: p5 xF xG;yGp=?: p5 yF yG;xBp=?: p5 xC xB;yBp=?: p5 yC yB;en0=at2 sdxF sdyF;en1=+- en0 21600000 0;en2=?: en0 en0 en1;od0=+- en2 0 enAng;od1=+- od0 21600000 0;od2=?: od0 od0 od1;st0=+- stAng 0 od2;st1=+- st0 21600000 0;st2=?: st0 st0 st1;sw0=+- en2 0 st2;sw1=+- sw0 21600000 0;swAng=?: sw0 sw0 sw1;ist0=at2 sdxC sdyC;ist1=+- ist0 21600000 0;istAng=?: ist0 ist0 ist1;id0=+- istAng 0 enAng;id1=+- id0 0 21600000;id2=?: id0 id1 id0;ien0=+- stAng 0 id2;ien1=+- ien0 0 21600000;ien2=?: ien1 ien1 ien0;isw1=+- ien2 0 istAng;isw2=+- isw1 0 21600000;iswAng=?: isw1 isw2 isw1;wtE=sin rw1 st2;htE=cos rh1 st2;dxE=cat2 rw1 htE wtE;dyE=sat2 rh1 htE wtE;xE=+- hc dxE 0;yE=+- vc dyE 0;wtD=sin rw2 ien2;htD=cos rh2 ien2;dxD=cat2 rw2 htD wtD;dyD=sat2 rh2 htD wtD;xD=+- hc dxD 0;yD=+- vc dyD 0;xKp=?: p5 xE xK;yKp=?: p5 yE yK;xJp=?: p5 xD xJ;yJp=?: p5 yD yJ;aL=+- lptAng 0 cd4;aA=+- ptAng cd4 0;aB=+- ptAng cd2 0;aJ=+- lptAng cd2 0;idx=cos rw1 2700000;idy=sin rh1 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M xL yL;L xKp yKp;L xE yE;A rw1 rh1 st2 swAng;L xGp yGp;L xA yA;L xBp yBp;L xC yC;A rw2 rh2 istAng iswAng;L xJp yJp;Z|il it ir ib",
  leftRightRibbon: "adj1=val 50000;adj2=val 50000;adj3=val 16667|a3=pin 0 adj3 33333;maxAdj1=+- 100000 0 a3;a1=pin 0 adj1 maxAdj1;w1=+- wd2 0 wd32;maxAdj2=*/ 100000 w1 ss;a2=pin 0 adj2 maxAdj2;x1=*/ ss a2 100000;x4=+- r 0 x1;dy1=*/ h a1 200000;dy2=*/ h a3 -200000;ly1=+- vc dy2 dy1;ry4=+- vc dy1 dy2;ly2=+- ly1 dy1 0;ry3=+- b 0 ly2;ly4=*/ ly2 2 1;ry1=+- b 0 ly4;ly3=+- ly4 0 ly1;ry2=+- b 0 ly3;hR=*/ a3 ss 400000;x2=+- hc 0 wd32;x3=+- hc wd32 0;y1=+- ly1 hR 0;y2=+- ry2 0 hR|,,,false~M l ly2;L x1 t;L x1 ly1;L hc ly1;A wd32 hR 3cd4 cd2;A wd32 hR 3cd4 -10800000;L x4 ry2;L x4 ry1;L r ry3;L x4 b;L x4 ry4;L hc ry4;A wd32 hR cd4 cd4;L x2 ly3;L x1 ly3;L x1 ly4;Z#,,darkenLess,false~M x3 y1;A wd32 hR 0 cd4;A wd32 hR 3cd4 -10800000;L x3 ry2;Z#,,none,~M l ly2;L x1 t;L x1 ly1;L hc ly1;A wd32 hR 3cd4 cd2;A wd32 hR 3cd4 -10800000;L x4 ry2;L x4 ry1;L r ry3;L x4 b;L x4 ry4;L hc ry4;A wd32 hR cd4 cd4;L x2 ly3;L x1 ly3;L x1 ly4;Z;M x3 y1;L x3 ry2;M x2 y2;L x2 ly3|x1 ly1 x4 ry4",
  leftRightUpArrow: "adj1=val 25000;adj2=val 25000;adj3=val 25000|a2=pin 0 adj2 50000;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;q1=+- 100000 0 maxAdj1;maxAdj3=*/ q1 1 2;a3=pin 0 adj3 maxAdj3;x1=*/ ss a3 100000;dx2=*/ ss a2 100000;x2=+- hc 0 dx2;x5=+- hc dx2 0;dx3=*/ ss a1 200000;x3=+- hc 0 dx3;x4=+- hc dx3 0;x6=+- r 0 x1;dy2=*/ ss a2 50000;y2=+- b 0 dy2;y4=+- b 0 dx2;y3=+- y4 0 dx3;y5=+- y4 dx3 0;il=*/ dx3 x1 dx2;ir=+- r 0 il|,,,~M l y4;L x1 y2;L x1 y3;L x3 y3;L x3 x1;L x2 x1;L hc t;L x5 x1;L x4 x1;L x4 y3;L x6 y3;L x6 y2;L r y4;L x6 b;L x6 y5;L x1 y5;L x1 b;Z|il y3 ir y5",
  leftUpArrow: "adj1=val 25000;adj2=val 25000;adj3=val 25000|a2=pin 0 adj2 50000;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=+- 100000 0 maxAdj1;a3=pin 0 adj3 maxAdj3;x1=*/ ss a3 100000;dx2=*/ ss a2 50000;x2=+- r 0 dx2;y2=+- b 0 dx2;dx4=*/ ss a2 100000;x4=+- r 0 dx4;y4=+- b 0 dx4;dx3=*/ ss a1 200000;x3=+- x4 0 dx3;x5=+- x4 dx3 0;y3=+- y4 0 dx3;y5=+- y4 dx3 0;il=*/ dx3 x1 dx4;cx1=+/ x1 x5 2;cy1=+/ x1 y5 2|,,,~M l y4;L x1 y2;L x1 y3;L x3 y3;L x3 x1;L x2 x1;L x4 t;L r x1;L x5 x1;L x5 y5;L x1 y5;L x1 b;Z|il y3 x4 y5",
  lightningBolt: "|x1=*/ w 5022 21600;x3=*/ w 8472 21600;x4=*/ w 8757 21600;x5=*/ w 10012 21600;x8=*/ w 12860 21600;x9=*/ w 13917 21600;x11=*/ w 16577 21600;y1=*/ h 3890 21600;y2=*/ h 6080 21600;y4=*/ h 7437 21600;y6=*/ h 9705 21600;y7=*/ h 12007 21600;y10=*/ h 14277 21600;y11=*/ h 14915 21600|21600,21600,,~M 8472 0;L 12860 6080;L 11050 6797;L 16577 12007;L 14767 12877;L 21600 21600;L 10012 14915;L 12222 13987;L 5022 9705;L 7602 8382;L 0 3890;Z|x4 y4 x9 y10",
  line: "||,,,~M l t;L r b|",
  lineInv: "||,,,~M l b;L r t|",
  mathDivide: "adj1=val 23520;adj2=val 5880;adj3=val 11760|a1=pin 1000 adj1 36745;ma1=+- 0 0 a1;ma3h=+/ 73490 ma1 4;ma3w=*/ 36745 w h;maxAdj3=min ma3h ma3w;a3=pin 1000 adj3 maxAdj3;m4a3=*/ -4 a3 1;maxAdj2=+- 73490 m4a3 a1;a2=pin 0 adj2 maxAdj2;dy1=*/ h a1 200000;yg=*/ h a2 100000;rad=*/ h a3 100000;dx1=*/ w 73490 200000;y3=+- vc 0 dy1;y4=+- vc dy1 0;a=+- yg rad 0;y2=+- y3 0 a;y1=+- y2 0 rad;y5=+- b 0 y1;x1=+- hc 0 dx1;x3=+- hc dx1 0;x2=+- hc 0 rad|,,,~M hc y1;A rad rad 3cd4 21600000;Z;M hc y5;A rad rad cd4 21600000;Z;M x1 y3;L x3 y3;L x3 y4;L x1 y4;Z|x1 y3 x3 y4",
  mathEqual: "adj1=val 23520;adj2=val 11760|a1=pin 0 adj1 36745;2a1=*/ a1 2 1;mAdj2=+- 100000 0 2a1;a2=pin 0 adj2 mAdj2;dy1=*/ h a1 100000;dy2=*/ h a2 200000;dx1=*/ w 73490 200000;y2=+- vc 0 dy2;y3=+- vc dy2 0;y1=+- y2 0 dy1;y4=+- y3 dy1 0;x1=+- hc 0 dx1;x2=+- hc dx1 0;yC1=+/ y1 y2 2;yC2=+/ y3 y4 2|,,,~M x1 y1;L x2 y1;L x2 y2;L x1 y2;Z;M x1 y3;L x2 y3;L x2 y4;L x1 y4;Z|x1 y1 x2 y4",
  mathMinus: "adj1=val 23520|a1=pin 0 adj1 100000;dy1=*/ h a1 200000;dx1=*/ w 73490 200000;y1=+- vc 0 dy1;y2=+- vc dy1 0;x1=+- hc 0 dx1;x2=+- hc dx1 0|,,,~M x1 y1;L x2 y1;L x2 y2;L x1 y2;Z|x1 y1 x2 y2",
  mathMultiply: "adj1=val 23520|a1=pin 0 adj1 51965;th=*/ ss a1 100000;a=at2 w h;sa=sin 1 a;ca=cos 1 a;ta=tan 1 a;dl=mod w h 0;rw=*/ dl 51965 100000;lM=+- dl 0 rw;xM=*/ ca lM 2;yM=*/ sa lM 2;dxAM=*/ sa th 2;dyAM=*/ ca th 2;xA=+- xM 0 dxAM;yA=+- yM dyAM 0;xB=+- xM dxAM 0;yB=+- yM 0 dyAM;xBC=+- hc 0 xB;yBC=*/ xBC ta 1;yC=+- yBC yB 0;xD=+- r 0 xB;xE=+- r 0 xA;yFE=+- vc 0 yA;xFE=*/ yFE 1 ta;xF=+- xE 0 xFE;xL=+- xA xFE 0;yG=+- b 0 yA;yH=+- b 0 yB;yI=+- b 0 yC;xC2=+- r 0 xM;yC3=+- b 0 yM|,,,~M xA yA;L xB yB;L hc yC;L xD yB;L xE yA;L xF vc;L xE yG;L xD yH;L hc yI;L xB yH;L xA yG;L xL vc;Z|xA yB xE yH",
  mathNotEqual: "adj1=val 23520;adj2=val 6600000;adj3=val 11760|a1=pin 0 adj1 50000;crAng=pin 4200000 adj2 6600000;2a1=*/ a1 2 1;maxAdj3=+- 100000 0 2a1;a3=pin 0 adj3 maxAdj3;dy1=*/ h a1 100000;dy2=*/ h a3 200000;dx1=*/ w 73490 200000;x1=+- hc 0 dx1;x8=+- hc dx1 0;y2=+- vc 0 dy2;y3=+- vc dy2 0;y1=+- y2 0 dy1;y4=+- y3 dy1 0;cadj2=+- crAng 0 cd4;xadj2=tan hd2 cadj2;len=mod xadj2 hd2 0;bhw=*/ len dy1 hd2;bhw2=*/ bhw 1 2;x7=+- hc xadj2 bhw2;dx67=*/ xadj2 y1 hd2;x6=+- x7 0 dx67;dx57=*/ xadj2 y2 hd2;x5=+- x7 0 dx57;dx47=*/ xadj2 y3 hd2;x4=+- x7 0 dx47;dx37=*/ xadj2 y4 hd2;x3=+- x7 0 dx37;dx27=*/ xadj2 2 1;x2=+- x7 0 dx27;rx7=+- x7 bhw 0;rx6=+- x6 bhw 0;rx5=+- x5 bhw 0;rx4=+- x4 bhw 0;rx3=+- x3 bhw 0;rx2=+- x2 bhw 0;dx7=*/ dy1 hd2 len;rxt=+- x7 dx7 0;lxt=+- rx7 0 dx7;rx=?: cadj2 rxt rx7;lx=?: cadj2 x7 lxt;dy3=*/ dy1 xadj2 len;dy4=+- 0 0 dy3;ry=?: cadj2 dy3 t;ly=?: cadj2 t dy4;dlx=+- w 0 rx;drx=+- w 0 lx;dly=+- h 0 ry;dry=+- h 0 ly;xC1=+/ rx lx 2;xC2=+/ drx dlx 2;yC1=+/ ry ly 2;yC2=+/ y1 y2 2;yC3=+/ y3 y4 2;yC4=+/ dry dly 2|,,,~M x1 y1;L x6 y1;L lx ly;L rx ry;L rx6 y1;L x8 y1;L x8 y2;L rx5 y2;L rx4 y3;L x8 y3;L x8 y4;L rx3 y4;L drx dry;L dlx dly;L x3 y4;L x1 y4;L x1 y3;L x4 y3;L x5 y2;L x1 y2;Z|x1 y1 x8 y4",
  mathPlus: "adj1=val 23520|a1=pin 0 adj1 73490;dx1=*/ w 73490 200000;dy1=*/ h 73490 200000;dx2=*/ ss a1 200000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;y1=+- vc 0 dy1;y2=+- vc 0 dx2;y3=+- vc dx2 0;y4=+- vc dy1 0|,,,~M x1 y2;L x2 y2;L x2 y1;L x3 y1;L x3 y2;L x4 y2;L x4 y3;L x3 y3;L x3 y4;L x2 y4;L x2 y3;L x1 y3;Z|x1 y2 x4 y3",
  moon: "adj=val 50000|a=pin 0 adj 87500;g0=*/ ss a 100000;g0w=*/ g0 w ss;g1=+- ss 0 g0;g2=*/ g0 g0 g1;g3=*/ ss ss g1;g4=*/ g3 2 1;g5=+- g4 0 g2;g6=+- g5 0 g0;g6w=*/ g6 w ss;g7=*/ g5 1 2;g8=+- g7 0 g0;dy1=*/ g8 hd2 ss;g10h=+- vc 0 dy1;g11h=+- vc dy1 0;g12=*/ g0 9598 32768;g12w=*/ g12 w ss;g13=+- ss 0 g12;q1=*/ ss ss 1;q2=*/ g13 g13 1;q3=+- q1 0 q2;q4=sqrt q3;dy4=*/ q4 hd2 ss;g15h=+- vc 0 dy4;g16h=+- vc dy4 0;g17w=+- g6w 0 g0w;g18w=*/ g17w 1 2;dx2p=+- g0w g18w w;dx2=*/ dx2p -1 1;dy2=*/ hd2 -1 1;stAng1=at2 dx2 dy2;enAngp1=at2 dx2 hd2;enAng1=+- enAngp1 0 21600000;swAng1=+- enAng1 0 stAng1|,,,~M r b;A w hd2 cd4 cd2;A g18w dy1 stAng1 swAng1;Z|g12w g15h g0w g16h",
  noSmoking: "adj=val 18750|a=pin 0 adj 50000;dr=*/ ss a 100000;iwd2=+- wd2 0 dr;ihd2=+- hd2 0 dr;ang=at2 w h;ct=cos ihd2 ang;st=sin iwd2 ang;m=mod ct st 0;n=*/ iwd2 ihd2 m;drd2=*/ dr 1 2;dang=at2 n drd2;dang2=*/ dang 2 1;swAng=+- -10800000 dang2 0;t3=at2 w h;stAng1=+- t3 0 dang;stAng2=+- stAng1 0 cd2;ct1=cos ihd2 stAng1;st1=sin iwd2 stAng1;m1=mod ct1 st1 0;n1=*/ iwd2 ihd2 m1;dx1=cos n1 stAng1;dy1=sin n1 stAng1;x1=+- hc dx1 0;y1=+- vc dy1 0;x2=+- hc 0 dx1;y2=+- vc 0 dy1;idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M l vc;A wd2 hd2 cd2 cd4;A wd2 hd2 3cd4 cd4;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z;M x1 y1;A iwd2 ihd2 stAng1 swAng;Z;M x2 y2;A iwd2 ihd2 stAng2 swAng;Z|il it ir ib",
  nonIsoscelesTrapezoid: "adj1=val 25000;adj2=val 25000|maxAdj=*/ 50000 w ss;a1=pin 0 adj1 maxAdj;a2=pin 0 adj2 maxAdj;x1=*/ ss a1 200000;x2=*/ ss a1 100000;dx3=*/ ss a2 100000;x3=+- r 0 dx3;x4=+/ r x3 2;il=*/ wd3 a1 maxAdj;adjm=max a1 a2;it=*/ hd3 adjm maxAdj;irt=*/ wd3 a2 maxAdj;ir=+- r 0 irt|,,,~M l b;L x2 t;L x3 t;L r b;Z|il it ir b",
  notchedRightArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 100000 w ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;dx2=*/ ss a2 100000;x2=+- r 0 dx2;dy1=*/ h a1 200000;y1=+- vc 0 dy1;y2=+- vc dy1 0;x1=*/ dy1 dx2 hd2;x3=+- r 0 x1|,,,~M l y1;L x2 y1;L x2 t;L r vc;L x2 b;L x2 y2;L l y2;L x1 vc;Z|x1 y1 x3 y2",
  octagon: "adj=val 29289|a=pin 0 adj 50000;x1=*/ ss a 100000;x2=+- r 0 x1;y2=+- b 0 x1;il=*/ x1 1 2;ir=+- r 0 il;ib=+- b 0 il|,,,~M l x1;L x1 t;L x2 t;L r x1;L r y2;L x2 b;L x1 b;L l y2;Z|il il ir ib",
  parallelogram: "adj=val 25000|maxAdj=*/ 100000 w ss;a=pin 0 adj maxAdj;x1=*/ ss a 200000;x2=*/ ss a 100000;x6=+- r 0 x1;x5=+- r 0 x2;x3=*/ x5 1 2;x4=+- r 0 x3;il=*/ wd2 a maxAdj;q1=*/ 5 a maxAdj;q2=+/ 1 q1 12;il=*/ q2 w 1;it=*/ q2 h 1;ir=+- r 0 il;ib=+- b 0 it;q3=*/ h hc x2;y1=pin 0 q3 h;y2=+- b 0 y1|,,,~M l b;L x2 t;L r t;L x5 b;Z|il it ir ib",
  pentagon: "hf=val 105146;vf=val 110557|swd2=*/ wd2 hf 100000;shd2=*/ hd2 vf 100000;svc=*/ vc  vf 100000;dx1=cos swd2 1080000;dx2=cos swd2 18360000;dy1=sin shd2 1080000;dy2=sin shd2 18360000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;y1=+- svc 0 dy1;y2=+- svc 0 dy2;it=*/ y1 dx2 dx1|,,,~M x1 y1;L hc t;L x4 y1;L x3 y2;L x2 y2;Z|x2 it x3 y2",
  pie: "adj1=val 0;adj2=val 16200000|stAng=pin 0 adj1 21599999;enAng=pin 0 adj2 21599999;sw1=+- enAng 0 stAng;sw2=+- sw1 21600000 0;swAng=?: sw1 sw1 sw2;wt1=sin wd2 stAng;ht1=cos hd2 stAng;dx1=cat2 wd2 ht1 wt1;dy1=sat2 hd2 ht1 wt1;x1=+- hc dx1 0;y1=+- vc dy1 0;wt2=sin wd2 enAng;ht2=cos hd2 enAng;dx2=cat2 wd2 ht2 wt2;dy2=sat2 hd2 ht2 wt2;x2=+- hc dx2 0;y2=+- vc dy2 0;idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M x1 y1;A wd2 hd2 stAng swAng;L hc vc;Z|il it ir ib",
  pieWedge: "|g1=cos w 13500000;g2=sin h 13500000;x1=+- r g1 0;y1=+- b g2 0|,,,~M l b;A w h cd2 cd4;L r b;Z|x1 y1 r b",
  plaque: "adj=val 16667|a=pin 0 adj 50000;x1=*/ ss a 100000;x2=+- r 0 x1;y2=+- b 0 x1;il=*/ x1 70711 100000;ir=+- r 0 il;ib=+- b 0 il|,,,~M l x1;A x1 x1 cd4 -5400000;L x2 t;A x1 x1 cd2 -5400000;L r y2;A x1 x1 3cd4 -5400000;L x1 b;A x1 x1 0 -5400000;Z|il il ir ib",
  plaqueTabs: "|md=mod w h 0;dx=*/ 1 md 20;y1=+- 0 b dx;x1=+- 0 r dx|,,,~M l t;L dx t;A dx dx 0 cd4;Z#,,,~M l y1;A dx dx 3cd4 cd4;L l b;Z#,,,~M r t;L r dx;A dx dx cd4 cd4;Z#,,,~M x1 b;A dx dx cd2 cd4;L r b;Z|dx dx x1 y1",
  plus: "adj=val 25000|a=pin 0 adj 50000;x1=*/ ss a 100000;x2=+- r 0 x1;y2=+- b 0 x1;d=+- w 0 h;il=?: d l x1;ir=?: d r x2;it=?: d x1 t;ib=?: d y2 b|,,,~M l x1;L x1 x1;L x1 t;L x2 t;L x2 x1;L r x1;L r y2;L x2 y2;L x2 b;L x1 b;L x1 y2;L l y2;Z|il it ir ib",
  quadArrow: "adj1=val 22500;adj2=val 22500;adj3=val 22500|a2=pin 0 adj2 50000;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;q1=+- 100000 0 maxAdj1;maxAdj3=*/ q1 1 2;a3=pin 0 adj3 maxAdj3;x1=*/ ss a3 100000;dx2=*/ ss a2 100000;x2=+- hc 0 dx2;x5=+- hc dx2 0;dx3=*/ ss a1 200000;x3=+- hc 0 dx3;x4=+- hc dx3 0;x6=+- r 0 x1;y2=+- vc 0 dx2;y5=+- vc dx2 0;y3=+- vc 0 dx3;y4=+- vc dx3 0;y6=+- b 0 x1;il=*/ dx3 x1 dx2;ir=+- r 0 il|,,,~M l vc;L x1 y2;L x1 y3;L x3 y3;L x3 x1;L x2 x1;L hc t;L x5 x1;L x4 x1;L x4 y3;L x6 y3;L x6 y2;L r vc;L x6 y5;L x6 y4;L x4 y4;L x4 y6;L x5 y6;L hc b;L x2 y6;L x3 y6;L x3 y4;L x1 y4;L x1 y5;Z|il y3 ir y4",
  quadArrowCallout: "adj1=val 18515;adj2=val 18515;adj3=val 18515;adj4=val 48123|a2=pin 0 adj2 50000;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=+- 50000 0 a2;a3=pin 0 adj3 maxAdj3;q2=*/ a3 2 1;maxAdj4=+- 100000 0 q2;a4=pin a1 adj4 maxAdj4;dx2=*/ ss a2 100000;dx3=*/ ss a1 200000;ah=*/ ss a3 100000;dx1=*/ w a4 200000;dy1=*/ h a4 200000;x8=+- r 0 ah;x2=+- hc 0 dx1;x7=+- hc dx1 0;x3=+- hc 0 dx2;x6=+- hc dx2 0;x4=+- hc 0 dx3;x5=+- hc dx3 0;y8=+- b 0 ah;y2=+- vc 0 dy1;y7=+- vc dy1 0;y3=+- vc 0 dx2;y6=+- vc dx2 0;y4=+- vc 0 dx3;y5=+- vc dx3 0|,,,~M l vc;L ah y3;L ah y4;L x2 y4;L x2 y2;L x4 y2;L x4 ah;L x3 ah;L hc t;L x6 ah;L x5 ah;L x5 y2;L x7 y2;L x7 y4;L x8 y4;L x8 y3;L r vc;L x8 y6;L x8 y5;L x7 y5;L x7 y7;L x5 y7;L x5 y8;L x6 y8;L hc b;L x3 y8;L x4 y8;L x4 y7;L x2 y7;L x2 y5;L ah y5;L ah y6;Z|x2 y2 x7 y7",
  rect: "||,,,~M l t;L r t;L r b;L l b;Z|l t r b",
  ribbon: "adj1=val 16667;adj2=val 50000|a1=pin 0 adj1 33333;a2=pin 25000 adj2 75000;x10=+- r 0 wd8;dx2=*/ w a2 200000;x2=+- hc 0 dx2;x9=+- hc dx2 0;x3=+- x2 wd32 0;x8=+- x9 0 wd32;x5=+- x2 wd8 0;x6=+- x9 0 wd8;x4=+- x5 0 wd32;x7=+- x6 wd32 0;y1=*/ h a1 200000;y2=*/ h a1 100000;y4=+- b 0 y2;y3=*/ y4 1 2;hR=*/ h a1 400000;y5=+- b 0 hR;y6=+- y2 0 hR|,,,false~M l t;L x4 t;A wd32 hR 3cd4 cd2;L x3 y1;A wd32 hR 3cd4 -10800000;L x8 y2;A wd32 hR cd4 -10800000;L x7 y1;A wd32 hR cd4 cd2;L r t;L x10 y3;L r y4;L x9 y4;L x9 y5;A wd32 hR 0 cd4;L x3 b;A wd32 hR cd4 cd4;L x2 y4;L l y4;L wd8 y3;Z#,,darkenLess,false~M x5 hR;A wd32 hR 0 cd4;L x3 y1;A wd32 hR 3cd4 -10800000;L x5 y2;Z;M x6 hR;A wd32 hR cd2 -5400000;L x8 y1;A wd32 hR 3cd4 cd2;L x6 y2;Z#,,none,~M l t;L x4 t;A wd32 hR 3cd4 cd2;L x3 y1;A wd32 hR 3cd4 -10800000;L x8 y2;A wd32 hR cd4 -10800000;L x7 y1;A wd32 hR cd4 cd2;L r t;L x10 y3;L r y4;L x9 y4;L x9 y5;A wd32 hR 0 cd4;L x3 b;A wd32 hR cd4 cd4;L x2 y4;L l y4;L wd8 y3;Z;M x5 hR;L x5 y2;M x6 y2;L x6 hR;M x2 y4;L x2 y6;M x9 y6;L x9 y4|x2 y2 x9 b",
  ribbon2: "adj1=val 16667;adj2=val 50000|a1=pin 0 adj1 33333;a2=pin 25000 adj2 75000;x10=+- r 0 wd8;dx2=*/ w a2 200000;x2=+- hc 0 dx2;x9=+- hc dx2 0;x3=+- x2 wd32 0;x8=+- x9 0 wd32;x5=+- x2 wd8 0;x6=+- x9 0 wd8;x4=+- x5 0 wd32;x7=+- x6 wd32 0;dy1=*/ h a1 200000;y1=+- b 0 dy1;dy2=*/ h a1 100000;y2=+- b 0 dy2;y4=+- t dy2 0;y3=+/ y4 b 2;hR=*/ h a1 400000;y6=+- b 0 hR;y7=+- y1 0 hR|,,,false~M l b;L x4 b;A wd32 hR cd4 -10800000;L x3 y1;A wd32 hR cd4 cd2;L x8 y2;A wd32 hR 3cd4 cd2;L x7 y1;A wd32 hR 3cd4 -10800000;L r b;L x10 y3;L r y4;L x9 y4;L x9 hR;A wd32 hR 0 -5400000;L x3 t;A wd32 hR 3cd4 -5400000;L x2 y4;L l y4;L wd8 y3;Z#,,darkenLess,false~M x5 y6;A wd32 hR 0 -5400000;L x3 y1;A wd32 hR cd4 cd2;L x5 y2;Z;M x6 y6;A wd32 hR cd2 cd4;L x8 y1;A wd32 hR cd4 -10800000;L x6 y2;Z#,,none,~M l b;L wd8 y3;L l y4;L x2 y4;L x2 hR;A wd32 hR cd2 cd4;L x8 t;A wd32 hR 3cd4 cd4;L x9 y4;L x9 y4;L r y4;L x10 y3;L r b;L x7 b;A wd32 hR cd4 cd2;L x8 y1;A wd32 hR cd4 -10800000;L x3 y2;A wd32 hR 3cd4 -10800000;L x4 y1;A wd32 hR 3cd4 cd2;Z;M x5 y2;L x5 y6;M x6 y6;L x6 y2;M x2 y7;L x2 y4;M x9 y4;L x9 y7|x2 t x9 y2",
  rightArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 100000 w ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;dx1=*/ ss a2 100000;x1=+- r 0 dx1;dy1=*/ h a1 200000;y1=+- vc 0 dy1;y2=+- vc dy1 0;dx2=*/ y1 dx1 hd2;x2=+- x1 dx2 0|,,,~M l y1;L x1 y1;L x1 t;L r vc;L x1 b;L x1 y2;L l y2;Z|l y1 x2 y2",
  rightArrowCallout: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 64977|maxAdj2=*/ 50000 h ss;a2=pin 0 adj2 maxAdj2;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=*/ 100000 w ss;a3=pin 0 adj3 maxAdj3;q2=*/ a3 ss w;maxAdj4=+- 100000 0 q2;a4=pin 0 adj4 maxAdj4;dy1=*/ ss a2 100000;dy2=*/ ss a1 200000;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc dy2 0;y4=+- vc dy1 0;dx3=*/ ss a3 100000;x3=+- r 0 dx3;x2=*/ w a4 100000;x1=*/ x2 1 2|,,,~M l t;L x2 t;L x2 y2;L x3 y2;L x3 y1;L r vc;L x3 y4;L x3 y3;L x2 y3;L x2 b;L l b;Z|l t x2 b",
  rightBrace: "adj1=val 8333;adj2=val 50000|a2=pin 0 adj2 100000;q1=+- 100000 0 a2;q2=min q1 a2;q3=*/ q2 1 2;maxAdj1=*/ q3 h ss;a1=pin 0 adj1 maxAdj1;y1=*/ ss a1 100000;y3=*/ h a2 100000;y2=+- y3 0 y1;y4=+- b 0 y1;dx1=cos wd2 2700000;dy1=sin y1 2700000;ir=+- l dx1 0;it=+- y1 0 dy1;ib=+- b dy1 y1|,,,false~M l t;A wd2 y1 3cd4 cd4;L hc y2;A wd2 y1 cd2 -5400000;A wd2 y1 3cd4 -5400000;L hc y4;A wd2 y1 0 cd4;Z#,,none,~M l t;A wd2 y1 3cd4 cd4;L hc y2;A wd2 y1 cd2 -5400000;A wd2 y1 3cd4 -5400000;L hc y4;A wd2 y1 0 cd4|l it ir ib",
  rightBracket: "adj=val 8333|maxAdj=*/ 50000 h ss;a=pin 0 adj maxAdj;y1=*/ ss a 100000;y2=+- b 0 y1;dx1=cos w 2700000;dy1=sin y1 2700000;ir=+- l dx1 0;it=+- y1 0 dy1;ib=+- b dy1 y1|,,,false~M l t;A w y1 3cd4 cd4;L r y2;A w y1 0 cd4;Z#,,none,~M l t;A w y1 3cd4 cd4;L r y2;A w y1 0 cd4|l it ir ib",
  round1Rect: "adj=val 16667|a=pin 0 adj 50000;dx1=*/ ss a 100000;x1=+- r 0 dx1;idx=*/ dx1 29289 100000;ir=+- r 0 idx|,,,~M l t;L x1 t;A dx1 dx1 3cd4 cd4;L r b;L l b;Z|l t ir b",
  round2DiagRect: "adj1=val 16667;adj2=val 0|a1=pin 0 adj1 50000;a2=pin 0 adj2 50000;x1=*/ ss a1 100000;y1=+- b 0 x1;a=*/ ss a2 100000;x2=+- r 0 a;y2=+- b 0 a;dx1=*/ x1 29289 100000;dx2=*/ a 29289 100000;d=+- dx1 0 dx2;dx=?: d dx1 dx2;ir=+- r 0 dx;ib=+- b 0 dx|,,,~M x1 t;L x2 t;A a a 3cd4 cd4;L r y1;A x1 x1 0 cd4;L a b;A a a cd4 cd4;L l x1;A x1 x1 cd2 cd4;Z|dx dx ir ib",
  round2SameRect: "adj1=val 16667;adj2=val 0|a1=pin 0 adj1 50000;a2=pin 0 adj2 50000;tx1=*/ ss a1 100000;tx2=+- r 0 tx1;bx1=*/ ss a2 100000;bx2=+- r 0 bx1;by1=+- b 0 bx1;d=+- tx1 0 bx1;tdx=*/ tx1 29289 100000;bdx=*/ bx1 29289 100000;il=?: d tdx bdx;ir=+- r 0 il;ib=+- b 0 bdx|,,,~M tx1 t;L tx2 t;A tx1 tx1 3cd4 cd4;L r by1;A bx1 bx1 0 cd4;L bx1 b;A bx1 bx1 cd4 cd4;L l tx1;A tx1 tx1 cd2 cd4;Z|il tdx ir ib",
  roundRect: "adj=val 16667|a=pin 0 adj 50000;x1=*/ ss a 100000;x2=+- r 0 x1;y2=+- b 0 x1;il=*/ x1 29289 100000;ir=+- r 0 il;ib=+- b 0 il|,,,~M l x1;A x1 x1 cd2 cd4;L x2 t;A x1 x1 3cd4 cd4;L r y2;A x1 x1 0 cd4;L x1 b;A x1 x1 cd4 cd4;Z|il il ir ib",
  rtTriangle: "|it=*/ h 7 12;ir=*/ w 7 12;ib=*/ h 11 12|,,,~M l b;L l t;L r b;Z|wd12 it ir ib",
  smileyFace: "adj=val 4653|a=pin -4653 adj 4653;x1=*/ w 4969 21699;x2=*/ w 6215 21600;x3=*/ w 13135 21600;x4=*/ w 16640 21600;y1=*/ h 7570 21600;y3=*/ h 16515 21600;dy2=*/ h a 100000;y2=+- y3 0 dy2;y4=+- y3 dy2 0;dy3=*/ h a 50000;y5=+- y4 dy3 0;idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0;wR=*/ w 1125 21600;hR=*/ h 1125 21600|,,,false~M l vc;A wd2 hd2 cd2 21600000;Z#,,darkenLess,~M x2 y1;A wR hR cd2 21600000;M x3 y1;A wR hR cd2 21600000#,,none,~M x1 y2;Q hc y5 x4 y2#,,none,~M l vc;A wd2 hd2 cd2 21600000;Z|il it ir ib",
  snip1Rect: "adj=val 16667|a=pin 0 adj 50000;dx1=*/ ss a 100000;x1=+- r 0 dx1;it=*/ dx1 1 2;ir=+/ x1 r 2|,,,~M l t;L x1 t;L r dx1;L r b;L l b;Z|l it ir b",
  snip2DiagRect: "adj1=val 0;adj2=val 16667|a1=pin 0 adj1 50000;a2=pin 0 adj2 50000;lx1=*/ ss a1 100000;lx2=+- r 0 lx1;ly1=+- b 0 lx1;rx1=*/ ss a2 100000;rx2=+- r 0 rx1;ry1=+- b 0 rx1;d=+- lx1 0 rx1;dx=?: d lx1 rx1;il=*/ dx 1 2;ir=+- r 0 il;ib=+- b 0 il|,,,~M lx1 t;L rx2 t;L r rx1;L r ly1;L lx2 b;L rx1 b;L l ry1;L l lx1;Z|il il ir ib",
  snip2SameRect: "adj1=val 16667;adj2=val 0|a1=pin 0 adj1 50000;a2=pin 0 adj2 50000;tx1=*/ ss a1 100000;tx2=+- r 0 tx1;bx1=*/ ss a2 100000;bx2=+- r 0 bx1;by1=+- b 0 bx1;d=+- tx1 0 bx1;dx=?: d tx1 bx1;il=*/ dx 1 2;ir=+- r 0 il;it=*/ tx1 1 2;ib=+/ by1 b 2|,,,~M tx1 t;L tx2 t;L r tx1;L r by1;L bx2 b;L bx1 b;L l by1;L l tx1;Z|il it ir ib",
  snipRoundRect: "adj1=val 16667;adj2=val 16667|a1=pin 0 adj1 50000;a2=pin 0 adj2 50000;x1=*/ ss a1 100000;dx2=*/ ss a2 100000;x2=+- r 0 dx2;il=*/ x1 29289 100000;ir=+/ x2 r 2|,,,~M x1 t;L x2 t;L r dx2;L r b;L l b;L l x1;A x1 x1 cd2 cd4;Z|il il ir b",
  squareTabs: "|md=mod w h 0;dx=*/ 1 md 20;y1=+- 0 b dx;x1=+- 0 r dx|,,,~M l t;L dx t;L dx dx;L l dx;Z#,,,~M l y1;L dx y1;L dx b;L l b;Z#,,,~M x1 t;L r t;L r dx;L x1 dx;Z#,,,~M x1 y1;L r y1;L r b;L x1 b;Z|dx dx x1 y1",
  star10: "adj=val 42533;hf=val 105146|a=pin 0 adj 50000;swd2=*/ wd2 hf 100000;dx1=*/ swd2 95106 100000;dx2=*/ swd2 58779 100000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;dy1=*/ hd2 80902 100000;dy2=*/ hd2 30902 100000;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc dy2 0;y4=+- vc dy1 0;iwd2=*/ swd2 a 50000;ihd2=*/ hd2 a 50000;sdx1=*/ iwd2 80902 100000;sdx2=*/ iwd2 30902 100000;sdy1=*/ ihd2 95106 100000;sdy2=*/ ihd2 58779 100000;sx1=+- hc 0 iwd2;sx2=+- hc 0 sdx1;sx3=+- hc 0 sdx2;sx4=+- hc sdx2 0;sx5=+- hc sdx1 0;sx6=+- hc iwd2 0;sy1=+- vc 0 sdy1;sy2=+- vc 0 sdy2;sy3=+- vc sdy2 0;sy4=+- vc sdy1 0;yAdj=+- vc 0 ihd2|,,,~M x1 y2;L sx2 sy2;L x2 y1;L sx3 sy1;L hc t;L sx4 sy1;L x3 y1;L sx5 sy2;L x4 y2;L sx6 vc;L x4 y3;L sx5 sy3;L x3 y4;L sx4 sy4;L hc b;L sx3 sy4;L x2 y4;L sx2 sy3;L x1 y3;L sx1 vc;Z|sx2 sy2 sx5 sy3",
  star12: "adj=val 37500|a=pin 0 adj 50000;dx1=cos wd2 1800000;dy1=sin hd2 3600000;x1=+- hc 0 dx1;x3=*/ w 3 4;x4=+- hc dx1 0;y1=+- vc 0 dy1;y3=*/ h 3 4;y4=+- vc dy1 0;iwd2=*/ wd2 a 50000;ihd2=*/ hd2 a 50000;sdx1=cos iwd2 900000;sdx2=cos iwd2 2700000;sdx3=cos iwd2 4500000;sdy1=sin ihd2 4500000;sdy2=sin ihd2 2700000;sdy3=sin ihd2 900000;sx1=+- hc 0 sdx1;sx2=+- hc 0 sdx2;sx3=+- hc 0 sdx3;sx4=+- hc sdx3 0;sx5=+- hc sdx2 0;sx6=+- hc sdx1 0;sy1=+- vc 0 sdy1;sy2=+- vc 0 sdy2;sy3=+- vc 0 sdy3;sy4=+- vc sdy3 0;sy5=+- vc sdy2 0;sy6=+- vc sdy1 0;yAdj=+- vc 0 ihd2|,,,~M l vc;L sx1 sy3;L x1 hd4;L sx2 sy2;L wd4 y1;L sx3 sy1;L hc t;L sx4 sy1;L x3 y1;L sx5 sy2;L x4 hd4;L sx6 sy3;L r vc;L sx6 sy4;L x4 y3;L sx5 sy5;L x3 y4;L sx4 sy6;L hc b;L sx3 sy6;L wd4 y4;L sx2 sy5;L x1 y3;L sx1 sy4;Z|sx2 sy2 sx5 sy5",
  star16: "adj=val 37500|a=pin 0 adj 50000;dx1=*/ wd2 92388 100000;dx2=*/ wd2 70711 100000;dx3=*/ wd2 38268 100000;dy1=*/ hd2 92388 100000;dy2=*/ hd2 70711 100000;dy3=*/ hd2 38268 100000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc 0 dx3;x4=+- hc dx3 0;x5=+- hc dx2 0;x6=+- hc dx1 0;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc 0 dy3;y4=+- vc dy3 0;y5=+- vc dy2 0;y6=+- vc dy1 0;iwd2=*/ wd2 a 50000;ihd2=*/ hd2 a 50000;sdx1=*/ iwd2 98079 100000;sdx2=*/ iwd2 83147 100000;sdx3=*/ iwd2 55557 100000;sdx4=*/ iwd2 19509 100000;sdy1=*/ ihd2 98079 100000;sdy2=*/ ihd2 83147 100000;sdy3=*/ ihd2 55557 100000;sdy4=*/ ihd2 19509 100000;sx1=+- hc 0 sdx1;sx2=+- hc 0 sdx2;sx3=+- hc 0 sdx3;sx4=+- hc 0 sdx4;sx5=+- hc sdx4 0;sx6=+- hc sdx3 0;sx7=+- hc sdx2 0;sx8=+- hc sdx1 0;sy1=+- vc 0 sdy1;sy2=+- vc 0 sdy2;sy3=+- vc 0 sdy3;sy4=+- vc 0 sdy4;sy5=+- vc sdy4 0;sy6=+- vc sdy3 0;sy7=+- vc sdy2 0;sy8=+- vc sdy1 0;idx=cos iwd2 2700000;idy=sin ihd2 2700000;il=+- hc 0 idx;it=+- vc 0 idy;ir=+- hc idx 0;ib=+- vc idy 0;yAdj=+- vc 0 ihd2|,,,~M l vc;L sx1 sy4;L x1 y3;L sx2 sy3;L x2 y2;L sx3 sy2;L x3 y1;L sx4 sy1;L hc t;L sx5 sy1;L x4 y1;L sx6 sy2;L x5 y2;L sx7 sy3;L x6 y3;L sx8 sy4;L r vc;L sx8 sy5;L x6 y4;L sx7 sy6;L x5 y5;L sx6 sy7;L x4 y6;L sx5 sy8;L hc b;L sx4 sy8;L x3 y6;L sx3 sy7;L x2 y5;L sx2 sy6;L x1 y4;L sx1 sy5;Z|il it ir ib",
  star24: "adj=val 37500|a=pin 0 adj 50000;dx1=cos wd2 900000;dx2=cos wd2 1800000;dx3=cos wd2 2700000;dx4=val wd4;dx5=cos wd2 4500000;dy1=sin hd2 4500000;dy2=sin hd2 3600000;dy3=sin hd2 2700000;dy4=val hd4;dy5=sin hd2 900000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc 0 dx3;x4=+- hc 0 dx4;x5=+- hc 0 dx5;x6=+- hc dx5 0;x7=+- hc dx4 0;x8=+- hc dx3 0;x9=+- hc dx2 0;x10=+- hc dx1 0;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc 0 dy3;y4=+- vc 0 dy4;y5=+- vc 0 dy5;y6=+- vc dy5 0;y7=+- vc dy4 0;y8=+- vc dy3 0;y9=+- vc dy2 0;y10=+- vc dy1 0;iwd2=*/ wd2 a 50000;ihd2=*/ hd2 a 50000;sdx1=*/ iwd2 99144 100000;sdx2=*/ iwd2 92388 100000;sdx3=*/ iwd2 79335 100000;sdx4=*/ iwd2 60876 100000;sdx5=*/ iwd2 38268 100000;sdx6=*/ iwd2 13053 100000;sdy1=*/ ihd2 99144 100000;sdy2=*/ ihd2 92388 100000;sdy3=*/ ihd2 79335 100000;sdy4=*/ ihd2 60876 100000;sdy5=*/ ihd2 38268 100000;sdy6=*/ ihd2 13053 100000;sx1=+- hc 0 sdx1;sx2=+- hc 0 sdx2;sx3=+- hc 0 sdx3;sx4=+- hc 0 sdx4;sx5=+- hc 0 sdx5;sx6=+- hc 0 sdx6;sx7=+- hc sdx6 0;sx8=+- hc sdx5 0;sx9=+- hc sdx4 0;sx10=+- hc sdx3 0;sx11=+- hc sdx2 0;sx12=+- hc sdx1 0;sy1=+- vc 0 sdy1;sy2=+- vc 0 sdy2;sy3=+- vc 0 sdy3;sy4=+- vc 0 sdy4;sy5=+- vc 0 sdy5;sy6=+- vc 0 sdy6;sy7=+- vc sdy6 0;sy8=+- vc sdy5 0;sy9=+- vc sdy4 0;sy10=+- vc sdy3 0;sy11=+- vc sdy2 0;sy12=+- vc sdy1 0;idx=cos iwd2 2700000;idy=sin ihd2 2700000;il=+- hc 0 idx;it=+- vc 0 idy;ir=+- hc idx 0;ib=+- vc idy 0;yAdj=+- vc 0 ihd2|,,,~M l vc;L sx1 sy6;L x1 y5;L sx2 sy5;L x2 y4;L sx3 sy4;L x3 y3;L sx4 sy3;L x4 y2;L sx5 sy2;L x5 y1;L sx6 sy1;L hc t;L sx7 sy1;L x6 y1;L sx8 sy2;L x7 y2;L sx9 sy3;L x8 y3;L sx10 sy4;L x9 y4;L sx11 sy5;L x10 y5;L sx12 sy6;L r vc;L sx12 sy7;L x10 y6;L sx11 sy8;L x9 y7;L sx10 sy9;L x8 y8;L sx9 sy10;L x7 y9;L sx8 sy11;L x6 y10;L sx7 sy12;L hc b;L sx6 sy12;L x5 y10;L sx5 sy11;L x4 y9;L sx4 sy10;L x3 y8;L sx3 sy9;L x2 y7;L sx2 sy8;L x1 y6;L sx1 sy7;Z|il it ir ib",
  star32: "adj=val 37500|a=pin 0 adj 50000;dx1=*/ wd2 98079 100000;dx2=*/ wd2 92388 100000;dx3=*/ wd2 83147 100000;dx4=cos wd2 2700000;dx5=*/ wd2 55557 100000;dx6=*/ wd2 38268 100000;dx7=*/ wd2 19509 100000;dy1=*/ hd2 98079 100000;dy2=*/ hd2 92388 100000;dy3=*/ hd2 83147 100000;dy4=sin hd2 2700000;dy5=*/ hd2 55557 100000;dy6=*/ hd2 38268 100000;dy7=*/ hd2 19509 100000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc 0 dx3;x4=+- hc 0 dx4;x5=+- hc 0 dx5;x6=+- hc 0 dx6;x7=+- hc 0 dx7;x8=+- hc dx7 0;x9=+- hc dx6 0;x10=+- hc dx5 0;x11=+- hc dx4 0;x12=+- hc dx3 0;x13=+- hc dx2 0;x14=+- hc dx1 0;y1=+- vc 0 dy1;y2=+- vc 0 dy2;y3=+- vc 0 dy3;y4=+- vc 0 dy4;y5=+- vc 0 dy5;y6=+- vc 0 dy6;y7=+- vc 0 dy7;y8=+- vc dy7 0;y9=+- vc dy6 0;y10=+- vc dy5 0;y11=+- vc dy4 0;y12=+- vc dy3 0;y13=+- vc dy2 0;y14=+- vc dy1 0;iwd2=*/ wd2 a 50000;ihd2=*/ hd2 a 50000;sdx1=*/ iwd2 99518 100000;sdx2=*/ iwd2 95694 100000;sdx3=*/ iwd2 88192 100000;sdx4=*/ iwd2 77301 100000;sdx5=*/ iwd2 63439 100000;sdx6=*/ iwd2 47140 100000;sdx7=*/ iwd2 29028 100000;sdx8=*/ iwd2 9802 100000;sdy1=*/ ihd2 99518 100000;sdy2=*/ ihd2 95694 100000;sdy3=*/ ihd2 88192 100000;sdy4=*/ ihd2 77301 100000;sdy5=*/ ihd2 63439 100000;sdy6=*/ ihd2 47140 100000;sdy7=*/ ihd2 29028 100000;sdy8=*/ ihd2 9802 100000;sx1=+- hc 0 sdx1;sx2=+- hc 0 sdx2;sx3=+- hc 0 sdx3;sx4=+- hc 0 sdx4;sx5=+- hc 0 sdx5;sx6=+- hc 0 sdx6;sx7=+- hc 0 sdx7;sx8=+- hc 0 sdx8;sx9=+- hc sdx8 0;sx10=+- hc sdx7 0;sx11=+- hc sdx6 0;sx12=+- hc sdx5 0;sx13=+- hc sdx4 0;sx14=+- hc sdx3 0;sx15=+- hc sdx2 0;sx16=+- hc sdx1 0;sy1=+- vc 0 sdy1;sy2=+- vc 0 sdy2;sy3=+- vc 0 sdy3;sy4=+- vc 0 sdy4;sy5=+- vc 0 sdy5;sy6=+- vc 0 sdy6;sy7=+- vc 0 sdy7;sy8=+- vc 0 sdy8;sy9=+- vc sdy8 0;sy10=+- vc sdy7 0;sy11=+- vc sdy6 0;sy12=+- vc sdy5 0;sy13=+- vc sdy4 0;sy14=+- vc sdy3 0;sy15=+- vc sdy2 0;sy16=+- vc sdy1 0;idx=cos iwd2 2700000;idy=sin ihd2 2700000;il=+- hc 0 idx;it=+- vc 0 idy;ir=+- hc idx 0;ib=+- vc idy 0;yAdj=+- vc 0 ihd2|,,,~M l vc;L sx1 sy8;L x1 y7;L sx2 sy7;L x2 y6;L sx3 sy6;L x3 y5;L sx4 sy5;L x4 y4;L sx5 sy4;L x5 y3;L sx6 sy3;L x6 y2;L sx7 sy2;L x7 y1;L sx8 sy1;L hc t;L sx9 sy1;L x8 y1;L sx10 sy2;L x9 y2;L sx11 sy3;L x10 y3;L sx12 sy4;L x11 y4;L sx13 sy5;L x12 y5;L sx14 sy6;L x13 y6;L sx15 sy7;L x14 y7;L sx16 sy8;L r vc;L sx16 sy9;L x14 y8;L sx15 sy10;L x13 y9;L sx14 sy11;L x12 y10;L sx13 sy12;L x11 y11;L sx12 sy13;L x10 y12;L sx11 sy14;L x9 y13;L sx10 sy15;L x8 y14;L sx9 sy16;L hc b;L sx8 sy16;L x7 y14;L sx7 sy15;L x6 y13;L sx6 sy14;L x5 y12;L sx5 sy13;L x4 y11;L sx4 sy12;L x3 y10;L sx3 sy11;L x2 y9;L sx2 sy10;L x1 y8;L sx1 sy9;Z|il it ir ib",
  star4: "adj=val 12500|a=pin 0 adj 50000;iwd2=*/ wd2 a 50000;ihd2=*/ hd2 a 50000;sdx=cos iwd2 2700000;sdy=sin ihd2 2700000;sx1=+- hc 0 sdx;sx2=+- hc sdx 0;sy1=+- vc 0 sdy;sy2=+- vc sdy 0;yAdj=+- vc 0 ihd2|,,,~M l vc;L sx1 sy1;L hc t;L sx2 sy1;L r vc;L sx2 sy2;L hc b;L sx1 sy2;Z|sx1 sy1 sx2 sy2",
  star5: "adj=val 19098;hf=val 105146;vf=val 110557|a=pin 0 adj 50000;swd2=*/ wd2 hf 100000;shd2=*/ hd2 vf 100000;svc=*/ vc  vf 100000;dx1=cos swd2 1080000;dx2=cos swd2 18360000;dy1=sin shd2 1080000;dy2=sin shd2 18360000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;y1=+- svc 0 dy1;y2=+- svc 0 dy2;iwd2=*/ swd2 a 50000;ihd2=*/ shd2 a 50000;sdx1=cos iwd2 20520000;sdx2=cos iwd2 3240000;sdy1=sin ihd2 3240000;sdy2=sin ihd2 20520000;sx1=+- hc 0 sdx1;sx2=+- hc 0 sdx2;sx3=+- hc sdx2 0;sx4=+- hc sdx1 0;sy1=+- svc 0 sdy1;sy2=+- svc 0 sdy2;sy3=+- svc ihd2 0;yAdj=+- svc 0 ihd2|,,,~M x1 y1;L sx2 sy1;L hc t;L sx3 sy1;L x4 y1;L sx4 sy2;L x3 y2;L hc sy3;L x2 y2;L sx1 sy2;Z|sx1 sy1 sx4 sy3",
  star6: "adj=val 28868;hf=val 115470|a=pin 0 adj 50000;swd2=*/ wd2 hf 100000;dx1=cos swd2 1800000;x1=+- hc 0 dx1;x2=+- hc dx1 0;y2=+- vc hd4 0;iwd2=*/ swd2 a 50000;ihd2=*/ hd2 a 50000;sdx2=*/ iwd2 1 2;sx1=+- hc 0 iwd2;sx2=+- hc 0 sdx2;sx3=+- hc sdx2 0;sx4=+- hc iwd2 0;sdy1=sin ihd2 3600000;sy1=+- vc 0 sdy1;sy2=+- vc sdy1 0;yAdj=+- vc 0 ihd2|,,,~M x1 hd4;L sx2 sy1;L hc t;L sx3 sy1;L x2 hd4;L sx4 vc;L x2 y2;L sx3 sy2;L hc b;L sx2 sy2;L x1 y2;L sx1 vc;Z|sx1 sy1 sx4 sy2",
  star7: "adj=val 34601;hf=val 102572;vf=val 105210|a=pin 0 adj 50000;swd2=*/ wd2 hf 100000;shd2=*/ hd2 vf 100000;svc=*/ vc  vf 100000;dx1=*/ swd2 97493 100000;dx2=*/ swd2 78183 100000;dx3=*/ swd2 43388 100000;dy1=*/ shd2 62349 100000;dy2=*/ shd2 22252 100000;dy3=*/ shd2 90097 100000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc 0 dx3;x4=+- hc dx3 0;x5=+- hc dx2 0;x6=+- hc dx1 0;y1=+- svc 0 dy1;y2=+- svc dy2 0;y3=+- svc dy3 0;iwd2=*/ swd2 a 50000;ihd2=*/ shd2 a 50000;sdx1=*/ iwd2 97493 100000;sdx2=*/ iwd2 78183 100000;sdx3=*/ iwd2 43388 100000;sx1=+- hc 0 sdx1;sx2=+- hc 0 sdx2;sx3=+- hc 0 sdx3;sx4=+- hc sdx3 0;sx5=+- hc sdx2 0;sx6=+- hc sdx1 0;sdy1=*/ ihd2 90097 100000;sdy2=*/ ihd2 22252 100000;sdy3=*/ ihd2 62349 100000;sy1=+- svc 0 sdy1;sy2=+- svc 0 sdy2;sy3=+- svc sdy3 0;sy4=+- svc ihd2 0;yAdj=+- svc 0 ihd2|,,,~M x1 y2;L sx1 sy2;L x2 y1;L sx3 sy1;L hc t;L sx4 sy1;L x5 y1;L sx6 sy2;L x6 y2;L sx5 sy3;L x4 y3;L hc sy4;L x3 y3;L sx2 sy3;Z|sx2 sy1 sx5 sy3",
  star8: "adj=val 37500|a=pin 0 adj 50000;dx1=cos wd2 2700000;x1=+- hc 0 dx1;x2=+- hc dx1 0;dy1=sin hd2 2700000;y1=+- vc 0 dy1;y2=+- vc dy1 0;iwd2=*/ wd2 a 50000;ihd2=*/ hd2 a 50000;sdx1=*/ iwd2 92388 100000;sdx2=*/ iwd2 38268 100000;sdy1=*/ ihd2 92388 100000;sdy2=*/ ihd2 38268 100000;sx1=+- hc 0 sdx1;sx2=+- hc 0 sdx2;sx3=+- hc sdx2 0;sx4=+- hc sdx1 0;sy1=+- vc 0 sdy1;sy2=+- vc 0 sdy2;sy3=+- vc sdy2 0;sy4=+- vc sdy1 0;yAdj=+- vc 0 ihd2|,,,~M l vc;L sx1 sy2;L x1 y1;L sx2 sy1;L hc t;L sx3 sy1;L x2 y1;L sx4 sy2;L r vc;L sx4 sy3;L x2 y2;L sx3 sy4;L hc b;L sx2 sy4;L x1 y2;L sx1 sy3;Z|sx1 sy1 sx4 sy4",
  straightConnector1: "||,,none,~M l t;L r b|l t r b",
  stripedRightArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 84375 w ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;x4=*/ ss 5 32;dx5=*/ ss a2 100000;x5=+- r 0 dx5;dy1=*/ h a1 200000;y1=+- vc 0 dy1;y2=+- vc dy1 0;dx6=*/ dy1 dx5 hd2;x6=+- r 0 dx6|,,,~M l y1;L ssd32 y1;L ssd32 y2;L l y2;Z;M ssd16 y1;L ssd8 y1;L ssd8 y2;L ssd16 y2;Z;M x4 y1;L x5 y1;L x5 t;L r vc;L x5 b;L x5 y2;L x4 y2;Z|x4 y1 x6 y2",
  sun: "adj=val 25000|a=pin 12500 adj 46875;g0=+- 50000 0 a;g1=*/ g0 30274 32768;g2=*/ g0 12540 32768;g3=+- g1 50000 0;g4=+- g2 50000 0;g5=+- 50000 0 g1;g6=+- 50000 0 g2;g7=*/ g0 23170 32768;g8=+- 50000 g7 0;g9=+- 50000 0 g7;g10=*/ g5 3 4;g11=*/ g6 3 4;g12=+- g10 3662 0;g13=+- g11 3662 0;g14=+- g11 12500 0;g15=+- 100000 0 g10;g16=+- 100000 0 g12;g17=+- 100000 0 g13;g18=+- 100000 0 g14;ox1=*/ w 18436 21600;oy1=*/ h 3163 21600;ox2=*/ w 3163 21600;oy2=*/ h 18436 21600;x8=*/ w g8 100000;x9=*/ w g9 100000;x10=*/ w g10 100000;x12=*/ w g12 100000;x13=*/ w g13 100000;x14=*/ w g14 100000;x15=*/ w g15 100000;x16=*/ w g16 100000;x17=*/ w g17 100000;x18=*/ w g18 100000;x19=*/ w a 100000;wR=*/ w g0 100000;hR=*/ h g0 100000;y8=*/ h g8 100000;y9=*/ h g9 100000;y10=*/ h g10 100000;y12=*/ h g12 100000;y13=*/ h g13 100000;y14=*/ h g14 100000;y15=*/ h g15 100000;y16=*/ h g16 100000;y17=*/ h g17 100000;y18=*/ h g18 100000|,,,~M r vc;L x15 y18;L x15 y14;Z;M ox1 oy1;L x16 y13;L x17 y12;Z;M hc t;L x18 y10;L x14 y10;Z;M ox2 oy1;L x13 y12;L x12 y13;Z;M l vc;L x10 y14;L x10 y18;Z;M ox2 oy2;L x12 y17;L x13 y16;Z;M hc b;L x14 y15;L x18 y15;Z;M ox1 oy2;L x17 y16;L x16 y17;Z;M x19 vc;A wR hR cd2 21600000;Z|x9 y9 x8 y8",
  swooshArrow: "adj1=val 25000;adj2=val 16667|a1=pin 1 adj1 75000;maxAdj2=*/ 70000 w ss;a2=pin 0 adj2 maxAdj2;ad1=*/ h a1 100000;ad2=*/ ss a2 100000;xB=+- r 0 ad2;yB=+- t ssd8 0;alfa=*/ cd4 1 14;dx0=tan ssd8 alfa;xC=+- xB 0 dx0;dx1=tan ad1 alfa;yF=+- yB ad1 0;xF=+- xB dx1 0;xE=+- xF dx0 0;yE=+- yF ssd8 0;dy2=+- yE 0 t;dy22=*/ dy2 1 2;dy3=*/ h 1 20;yD=+- t dy22 dy3;dy4=*/ hd6 1 1;yP1=+- hd6 dy4 0;xP1=val wd6;dy5=*/ hd6 1 2;yP2=+- yF dy5 0;xP2=val wd4|,,,~M l b;Q xP1 yP1 xB yB;L xC t;L r yD;L xE yE;L xF yF;Q xP2 yP2 l b;Z|l t r b",
  teardrop: "adj=val 100000|a=pin 0 adj 200000;r2=sqrt 2;tw=*/ wd2 r2 1;th=*/ hd2 r2 1;sw=*/ tw a 100000;sh=*/ th a 100000;dx1=cos sw 2700000;dy1=sin sh 2700000;x1=+- hc dx1 0;y1=+- vc 0 dy1;x2=+/ hc x1 2;y2=+/ vc y1 2;idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M l vc;A wd2 hd2 cd2 cd4;Q x2 t x1 y1;Q r y2 r vc;A wd2 hd2 0 cd4;A wd2 hd2 cd4 cd4;Z|il it ir ib",
  trapezoid: "adj=val 25000|maxAdj=*/ 50000 w ss;a=pin 0 adj maxAdj;x1=*/ ss a 200000;x2=*/ ss a 100000;x3=+- r 0 x2;x4=+- r 0 x1;il=*/ wd3 a maxAdj;it=*/ hd3 a maxAdj;ir=+- r 0 il|,,,~M l b;L x2 t;L x3 t;L r b;Z|il it ir b",
  triangle: "adj=val 50000|a=pin 0 adj 100000;x1=*/ w a 200000;x2=*/ w a 100000;x3=+- x1 wd2 0|,,,~M l b;L x2 t;L r b;Z|x1 vc x3 b",
  upArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 100000 h ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;dy2=*/ ss a2 100000;y2=+- t dy2 0;dx1=*/ w a1 200000;x1=+- hc 0 dx1;x2=+- hc dx1 0;dy1=*/ x1 dy2 wd2;y1=+- y2  0 dy1|,,,~M l y2;L hc t;L r y2;L x2 y2;L x2 b;L x1 b;L x1 y2;Z|x1 y1 x2 b",
  upArrowCallout: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 64977|maxAdj2=*/ 50000 w ss;a2=pin 0 adj2 maxAdj2;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=*/ 100000 h ss;a3=pin 0 adj3 maxAdj3;q2=*/ a3 ss h;maxAdj4=+- 100000 0 q2;a4=pin 0 adj4 maxAdj4;dx1=*/ ss a2 100000;dx2=*/ ss a1 200000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;y1=*/ ss a3 100000;dy2=*/ h a4 100000;y2=+- b 0 dy2;y3=+/ y2 b 2|,,,~M l y2;L x2 y2;L x2 y1;L x1 y1;L hc t;L x4 y1;L x3 y1;L x3 y2;L r y2;L r b;L l b;Z|l y2 r b",
  upDownArrow: "adj1=val 50000;adj2=val 50000|maxAdj2=*/ 50000 h ss;a1=pin 0 adj1 100000;a2=pin 0 adj2 maxAdj2;y2=*/ ss a2 100000;y3=+- b 0 y2;dx1=*/ w a1 200000;x1=+- hc 0 dx1;x2=+- hc dx1 0;dy1=*/ x1 y2 wd2;y1=+- y2 0 dy1;y4=+- y3 dy1 0|,,,~M l y2;L hc t;L r y2;L x2 y2;L x2 y3;L r y3;L hc b;L l y3;L x1 y3;L x1 y2;Z|x1 y1 x2 y4",
  upDownArrowCallout: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 48123|maxAdj2=*/ 50000 w ss;a2=pin 0 adj2 maxAdj2;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;maxAdj3=*/ 50000 h ss;a3=pin 0 adj3 maxAdj3;q2=*/ a3 ss hd2;maxAdj4=+- 100000 0 q2;a4=pin 0 adj4 maxAdj4;dx1=*/ ss a2 100000;dx2=*/ ss a1 200000;x1=+- hc 0 dx1;x2=+- hc 0 dx2;x3=+- hc dx2 0;x4=+- hc dx1 0;y1=*/ ss a3 100000;y4=+- b 0 y1;dy2=*/ h a4 200000;y2=+- vc 0 dy2;y3=+- vc dy2 0|,,,~M l y2;L x2 y2;L x2 y1;L x1 y1;L hc t;L x4 y1;L x3 y1;L x3 y2;L r y2;L r y3;L x3 y3;L x3 y4;L x4 y4;L hc b;L x1 y4;L x2 y4;L x2 y3;L l y3;Z|l y2 r y3",
  uturnArrow: "adj1=val 25000;adj2=val 25000;adj3=val 25000;adj4=val 43750;adj5=val 75000|a2=pin 0 adj2 25000;maxAdj1=*/ a2 2 1;a1=pin 0 adj1 maxAdj1;q2=*/ a1 ss h;q3=+- 100000 0 q2;maxAdj3=*/ q3 h ss;a3=pin 0 adj3 maxAdj3;q1=+- a3 a1 0;minAdj5=*/ q1 ss h;a5=pin minAdj5 adj5 100000;th=*/ ss a1 100000;aw2=*/ ss a2 100000;th2=*/ th 1 2;dh2=+- aw2 0 th2;y5=*/ h a5 100000;ah=*/ ss a3 100000;y4=+- y5 0 ah;x9=+- r 0 dh2;bw=*/ x9 1 2;bs=min bw y4;maxAdj4=*/ bs 100000 ss;a4=pin 0 adj4 maxAdj4;bd=*/ ss a4 100000;bd3=+- bd 0 th;bd2=max bd3 0;x3=+- th bd2 0;x8=+- r 0 aw2;x6=+- x8 0 aw2;x7=+- x6 dh2 0;x4=+- x9 0 bd;x5=+- x7 0 bd2;cx=+/ th x7 2|,,,~M l b;L l bd;A bd bd cd2 cd4;L x4 t;A bd bd 3cd4 cd4;L x9 y4;L r y4;L x8 y5;L x6 y4;L x7 y4;L x7 x3;A bd2 bd2 0 -5400000;L x3 th;A bd2 bd2 3cd4 -5400000;L th b;Z|l t r b",
  verticalScroll: "adj=val 12500|a=pin 0 adj 25000;ch=*/ ss a 100000;ch2=*/ ch 1 2;ch4=*/ ch 1 4;x3=+- ch ch2 0;x4=+- ch ch 0;x6=+- r 0 ch;x7=+- r 0 ch2;x5=+- x6 0 ch2;y3=+- b 0 ch;y4=+- b 0 ch2|,,,false~M ch2 b;A ch2 ch2 cd4 -5400000;L ch2 y4;A ch4 ch4 cd4 -10800000;L ch y3;L ch ch2;A ch2 ch2 cd2 cd4;L x7 t;A ch2 ch2 3cd4 cd2;L x6 ch;L x6 y4;A ch2 ch2 0 cd4;Z;M x4 ch2;A ch2 ch2 0 cd4;A ch4 ch4 cd4 cd2;Z#,,darkenLess,false~M x4 ch2;A ch2 ch2 0 cd4;A ch4 ch4 cd4 cd2;Z;M ch y4;A ch2 ch2 0 3cd4;A ch4 ch4 3cd4 cd2;Z#,,none,~M ch y3;L ch ch2;A ch2 ch2 cd2 cd4;L x7 t;A ch2 ch2 3cd4 cd2;L x6 ch;L x6 y4;A ch2 ch2 0 cd4;L ch2 b;A ch2 ch2 cd4 cd2;Z;M x3 t;A ch2 ch2 3cd4 cd2;A ch4 ch4 cd4 cd2;L x4 ch2;M x6 ch;L x3 ch;M ch2 y3;A ch4 ch4 3cd4 cd2;L ch y4;M ch2 b;A ch2 ch2 cd4 -5400000;L ch y3|ch ch x6 y4",
  wave: "adj1=val 12500;adj2=val 0|a1=pin 0 adj1 20000;a2=pin -10000 adj2 10000;y1=*/ h a1 100000;dy2=*/ y1 10 3;y2=+- y1 0 dy2;y3=+- y1 dy2 0;y4=+- b 0 y1;y5=+- y4 0 dy2;y6=+- y4 dy2 0;dx1=*/ w a2 100000;of2=*/ w a2 50000;x1=abs dx1;dx2=?: of2 0 of2;x2=+- l 0 dx2;dx5=?: of2 of2 0;x5=+- r 0 dx5;dx3=+/ dx2 x5 3;x3=+- x2 dx3 0;x4=+/ x3 x5 2;x6=+- l dx5 0;x10=+- r dx2 0;x7=+- x6 dx3 0;x8=+/ x7 x10 2;x9=+- r 0 x1;xAdj=+- hc dx1 0;xAdj2=+- hc 0 dx1;il=max x2 x6;ir=min x5 x10;it=*/ h a1 50000;ib=+- b 0 it|,,,~M x2 y1;C x3 y2 x4 y3 x5 y1;L x10 y4;C x8 y6 x7 y5 x6 y4;Z|il it ir ib",
  wedgeEllipseCallout: "adj1=val -20833;adj2=val 62500|dxPos=*/ w adj1 100000;dyPos=*/ h adj2 100000;xPos=+- hc dxPos 0;yPos=+- vc dyPos 0;sdx=*/ dxPos h 1;sdy=*/ dyPos w 1;pang=at2 sdx sdy;stAng=+- pang 660000 0;enAng=+- pang 0 660000;dx1=cos wd2 stAng;dy1=sin hd2 stAng;x1=+- hc dx1 0;y1=+- vc dy1 0;dx2=cos wd2 enAng;dy2=sin hd2 enAng;x2=+- hc dx2 0;y2=+- vc dy2 0;stAng1=at2 dx1 dy1;enAng1=at2 dx2 dy2;swAng1=+- enAng1 0 stAng1;swAng2=+- swAng1 21600000 0;swAng=?: swAng1 swAng1 swAng2;idx=cos wd2 2700000;idy=sin hd2 2700000;il=+- hc 0 idx;ir=+- hc idx 0;it=+- vc 0 idy;ib=+- vc idy 0|,,,~M xPos yPos;L x1 y1;A wd2 hd2 stAng1 swAng;Z|il it ir ib",
  wedgeRectCallout: "adj1=val -20833;adj2=val 62500|dxPos=*/ w adj1 100000;dyPos=*/ h adj2 100000;xPos=+- hc dxPos 0;yPos=+- vc dyPos 0;dx=+- xPos 0 hc;dy=+- yPos 0 vc;dq=*/ dxPos h w;ady=abs dyPos;adq=abs dq;dz=+- ady 0 adq;xg1=?: dxPos 7 2;xg2=?: dxPos 10 5;x1=*/ w xg1 12;x2=*/ w xg2 12;yg1=?: dyPos 7 2;yg2=?: dyPos 10 5;y1=*/ h yg1 12;y2=*/ h yg2 12;t1=?: dxPos l xPos;xl=?: dz l t1;t2=?: dyPos x1 xPos;xt=?: dz t2 x1;t3=?: dxPos xPos r;xr=?: dz r t3;t4=?: dyPos xPos x1;xb=?: dz t4 x1;t5=?: dxPos y1 yPos;yl=?: dz y1 t5;t6=?: dyPos t yPos;yt=?: dz t6 t;t7=?: dxPos yPos y1;yr=?: dz y1 t7;t8=?: dyPos yPos b;yb=?: dz t8 b|,,,~M l t;L x1 t;L xt yt;L x2 t;L r t;L r y1;L xr yr;L r y2;L r b;L x2 b;L xb yb;L x1 b;L l b;L l y2;L xl yl;L l y1;Z|l t r b",
  wedgeRoundRectCallout: "adj1=val -20833;adj2=val 62500;adj3=val 16667|dxPos=*/ w adj1 100000;dyPos=*/ h adj2 100000;xPos=+- hc dxPos 0;yPos=+- vc dyPos 0;dq=*/ dxPos h w;ady=abs dyPos;adq=abs dq;dz=+- ady 0 adq;xg1=?: dxPos 7 2;xg2=?: dxPos 10 5;x1=*/ w xg1 12;x2=*/ w xg2 12;yg1=?: dyPos 7 2;yg2=?: dyPos 10 5;y1=*/ h yg1 12;y2=*/ h yg2 12;t1=?: dxPos l xPos;xl=?: dz l t1;t2=?: dyPos x1 xPos;xt=?: dz t2 x1;t3=?: dxPos xPos r;xr=?: dz r t3;t4=?: dyPos xPos x1;xb=?: dz t4 x1;t5=?: dxPos y1 yPos;yl=?: dz y1 t5;t6=?: dyPos t yPos;yt=?: dz t6 t;t7=?: dxPos yPos y1;yr=?: dz y1 t7;t8=?: dyPos yPos b;yb=?: dz t8 b;u1=*/ ss adj3 100000;u2=+- r 0 u1;v2=+- b 0 u1;il=*/ u1 29289 100000;ir=+- r 0 il;ib=+- b 0 il|,,,~M l u1;A u1 u1 cd2 cd4;L x1 t;L xt yt;L x2 t;L u2 t;A u1 u1 3cd4 cd4;L r y1;L xr yr;L r y2;L r v2;A u1 u1 0 cd4;L x2 b;L xb yb;L x1 b;L u1 b;A u1 u1 cd4 cd4;L l y2;L xl yl;L l y1;Z|il il ir ib"
};

// ../../../shared/drawingml/src/preset-engine.ts
var parsed = /* @__PURE__ */ new Map();
function parseDef(name) {
  if (parsed.has(name)) return parsed.get(name);
  const raw = Object.prototype.hasOwnProperty.call(PRESET_DEFS, name) ? PRESET_DEFS[name] : void 0;
  let def = null;
  if (raw !== void 0) {
    const [av = "", gd = "", ps = "", rc = ""] = raw.split("|");
    const words = (s) => s.trim().split(/\s+/).filter(Boolean);
    const guides = (s) => s ? s.split(";").map((e) => {
      const i = e.indexOf("=");
      return [e.slice(0, i).trim(), words(e.slice(i + 1))];
    }) : [];
    const paths = ps ? ps.split("#").map((p) => {
      const [attrs = "", cmds = ""] = p.split("~");
      const [w = "", h = "", fill = "", stroke = ""] = attrs.split(",");
      const d = { fill, stroke: stroke !== "false" && stroke !== "0", cmds: cmds ? cmds.split(";").map(words) : [] };
      if (w) d.w = Number(w);
      if (h) d.h = Number(h);
      return d;
    }) : [];
    def = { av: guides(av), gd: guides(gd), paths };
    const rw = words(rc);
    if (rw.length === 4) def.rect = rw;
  }
  parsed.set(name, def);
  return def;
}
var DEG = Math.PI / (180 * 6e4);
function builtins(w, h) {
  const ss = Math.min(w, h), ls = Math.max(w, h);
  const v = [
    ["l", 0],
    ["t", 0],
    ["r", w],
    ["b", h],
    ["w", w],
    ["h", h],
    ["hc", w / 2],
    ["vc", h / 2],
    ["ss", ss],
    ["ls", ls],
    ["cd2", 108e5],
    ["cd4", 54e5],
    ["cd8", 27e5],
    ["3cd4", 162e5],
    ["3cd8", 81e5],
    ["5cd8", 135e5],
    ["7cd8", 189e5]
  ];
  for (const d of [2, 3, 4, 5, 6, 8, 10, 12, 16, 32]) {
    v.push([`wd${d}`, w / d], [`hd${d}`, h / d], [`ssd${d}`, ss / d]);
  }
  return new Map(v);
}
function evalFormula(f, val) {
  const [op, a = "0", b = "0", c = "0"] = f;
  const x = () => val(a), y = () => val(b), z = () => val(c);
  switch (op) {
    case "val":
      return x();
    case "*/":
      return x() * y() / (z() || 1);
    case "+-":
      return x() + y() - z();
    case "+/":
      return (x() + y()) / (z() || 1);
    case "?:":
      return x() > 0 ? y() : z();
    case "abs":
      return Math.abs(x());
    case "at2":
      return Math.atan2(y(), x()) / DEG;
    case "cat2":
      return x() * Math.cos(Math.atan2(z(), y()));
    case "sat2":
      return x() * Math.sin(Math.atan2(z(), y()));
    case "cos":
      return x() * Math.cos(y() * DEG);
    case "sin":
      return x() * Math.sin(y() * DEG);
    case "tan":
      return x() * Math.tan(y() * DEG);
    case "max":
      return Math.max(x(), y());
    case "min":
      return Math.min(x(), y());
    case "mod":
      return Math.sqrt(x() * x() + y() * y() + z() * z());
    case "pin": {
      const lo = x(), v = y(), hi = z();
      return v < lo ? lo : v > hi ? hi : v;
    }
    case "sqrt":
      return Math.sqrt(Math.max(0, x()));
    default:
      return 0;
  }
}
var SHADE = { none: null, darken: -0.4, darkenLess: -0.2, lighten: 0.4, lightenLess: 0.2 };
function presetVals(def, w, h, adj, adjNames) {
  const vars = builtins(w, h);
  const val = (t) => {
    const v = vars.get(t);
    if (v !== void 0) return v;
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  };
  def.av.forEach(([n, f], i) => {
    let v;
    if (adj && adjNames) {
      const k = adjNames.indexOf(n);
      if (k >= 0) v = adj[k];
    } else if (adj && i < adj.length) v = adj[i];
    vars.set(n, v ?? evalFormula(f, val));
  });
  for (const [n, f] of def.gd) vars.set(n, evalFormula(f, val));
  return val;
}
function presetTextRect(name, w, h, adj, adjNames) {
  const def = name ? parseDef(name) : null;
  if (!def?.rect) return null;
  const val = presetVals(def, w, h, adj, adjNames);
  const [l, t, r, b] = def.rect.map(val);
  if (!(r > l) || !(b > t)) return null;
  return { l, t, r, b };
}
function evalPreset(name, w, h, adj, adjNames) {
  const def = parseDef(name);
  if (!def) return null;
  const val = presetVals(def, w, h, adj, adjNames);
  const out = { subs: [], fill: [], stroke: [] };
  for (const p of def.paths) {
    const sx = p.w ? w / p.w : 1, sy = p.h ? h / p.h : 1;
    const segs = [];
    let cx = 0, cy = 0;
    for (const c of p.cmds) {
      switch (c[0]) {
        case "M":
          cx = val(c[1]) * sx;
          cy = val(c[2]) * sy;
          segs.push({ c: "M", x: cx, y: cy });
          break;
        case "L":
          cx = val(c[1]) * sx;
          cy = val(c[2]) * sy;
          segs.push({ c: "L", x: cx, y: cy });
          break;
        case "Q": {
          const x1 = val(c[1]) * sx, y1 = val(c[2]) * sy;
          cx = val(c[3]) * sx;
          cy = val(c[4]) * sy;
          segs.push({ c: "Q", x1, y1, x: cx, y: cy });
          break;
        }
        case "C": {
          const x1 = val(c[1]) * sx, y1 = val(c[2]) * sy, x2 = val(c[3]) * sx, y2 = val(c[4]) * sy;
          cx = val(c[5]) * sx;
          cy = val(c[6]) * sy;
          segs.push({ c: "C", x1, y1, x2, y2, x: cx, y: cy });
          break;
        }
        case "A": {
          const rx = val(c[1]) * sx, ry = val(c[2]) * sy;
          const st = val(c[3]) * DEG, sw = val(c[4]) * DEG;
          if (rx <= 0 || ry <= 0 || sw === 0) break;
          const param = (a) => Math.atan2(rx * Math.sin(a), ry * Math.cos(a));
          const p0 = param(st);
          let p1 = param(st + sw);
          if (Math.abs(sw) >= 2 * Math.PI - 1e-9) p1 = p0 + Math.sign(sw) * 2 * Math.PI;
          else if (sw > 0) {
            while (p1 <= p0) p1 += 2 * Math.PI;
          } else {
            while (p1 >= p0) p1 -= 2 * Math.PI;
          }
          const ecx = cx - rx * Math.cos(p0), ecy = cy - ry * Math.sin(p0);
          segs.push({ c: "E", cx: ecx, cy: ecy, rx, ry, a0: p0, a1: p1, ccw: sw < 0 });
          cx = ecx + rx * Math.cos(p1);
          cy = ecy + ry * Math.sin(p1);
          break;
        }
        case "Z":
          segs.push({ c: "Z" });
          break;
      }
    }
    out.subs.push(segs);
    out.fill.push(p.fill in SHADE ? SHADE[p.fill] : 0);
    out.stroke.push(p.stroke);
  }
  return out;
}

// ../../../shared/drawingml/src/outline.ts
var rect = (w, h) => ({
  subs: [[{ c: "M", x: 0, y: 0 }, { c: "L", x: w, y: 0 }, { c: "L", x: w, y: h }, { c: "L", x: 0, y: h }, { c: "Z" }]],
  fill: [true],
  stroke: [true]
});
function presetOutline(prst, w, h, adj) {
  if (!prst || prst === "rect") return rect(w, h);
  const names = adj ? Object.keys(adj) : void 0;
  const g = evalPreset(prst, w, h, names?.map((n) => adj[n]), names);
  if (!g || !g.subs.length) return rect(w, h);
  return { subs: g.subs, fill: g.fill.map((f) => f !== null), stroke: g.stroke };
}

// ../../../shared/drawingml/src/adjust.ts
function rgbToHsl(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
var clamp8 = (v) => v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v);
function adjustSaturation(d, s) {
  if (Math.abs(s - 1) < 1e-6) return;
  for (let i = 0; i < d.length; i += 4) {
    const [h, sat, l] = rgbToHsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    if (sat === 0) continue;
    const ns = s <= 0 ? 0 : s < 1 ? sat * s : Math.min(1, Math.pow(sat, 1 / s));
    const [r, g, b] = hslToRgb(h, ns, l);
    d[i] = clamp8(r * 255);
    d[i + 1] = clamp8(g * 255);
    d[i + 2] = clamp8(b * 255);
  }
}
var TEMP_TABLE = [
  [4700, -18.7, 34.7],
  [5300, -10.7, 20],
  [5900, -5.3, 9.3],
  [6500, 0, 0],
  [7200, 5.3, -8],
  [8800, 13.3, -21.3],
  [11200, 22.7, -33.3]
];
function adjustTemperature(d, kelvin) {
  if (Math.abs(kelvin - 6500) < 1) return;
  const m = 1e6 / Math.max(1e3, kelvin);
  const mk = TEMP_TABLE.map(([k, r, b]) => [1e6 / k, r, b]);
  let i0 = 0;
  while (i0 < mk.length - 2 && m < mk[i0 + 1][0]) i0++;
  const [m0, r0, b0] = mk[i0], [m1, r1, b1] = mk[i0 + 1];
  const t = (m - m0) / (m1 - m0);
  const DR = r0 + (r1 - r0) * t, DB = b0 + (b1 - b0) * t;
  const DG = -(0.2126 * DR + 0.0722 * DB) / 0.7152;
  const D = [DR, DG, DB];
  const lut = [0, 1, 2].map((c) => {
    const l = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      const x = v / 255;
      l[v] = clamp8(v + D[c] * (1 - (1 - x) * (1 - x)));
    }
    return l;
  });
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[0][d[i]];
    d[i + 1] = lut[1][d[i + 1]];
    d[i + 2] = lut[2][d[i + 2]];
  }
}
var BRIGHT_LUT = [
  [-1, "0 0 1 1 1 1 2 2 2 2 3 3 3 3 4 4 4 4 5 5 5 5 6 6 6 6 7 7 7 7 8 8 8"],
  [-0.8, "0 1 3 4 6 7 8 10 11 12 14 15 17 18 19 21 22 23 25 26 28 29 30 32 33 34 36 37 39 41 44 48 51"],
  [-0.6, "0 2 5 7 10 12 15 17 20 22 25 27 30 32 35 37 40 42 45 47 50 52 55 59 64 68 73 78 83 88 93 98 102"],
  [-0.4, "0 4 8 12 16 19 23 27 31 35 39 43 47 51 55 58 62 66 71 76 82 88 93 99 105 111 117 123 129 135 141 148 153"],
  [-0.3, "0 5 9 14 19 24 28 33 38 43 47 52 57 62 66 71 76 82 88 94 101 107 114 120 127 133 140 146 153 159 166 173 179"],
  [-0.2, "0 6 11 17 23 28 34 40 45 51 57 63 68 74 80 86 93 100 106 113 120 127 134 141 148 155 162 169 176 183 191 198 204"],
  [-0.1, "0 7 14 20 27 34 41 47 54 61 68 74 81 88 95 103 110 118 125 132 140 147 155 162 170 177 185 193 200 208 215 223 230"],
  [0.1, "0 9 19 28 38 47 57 66 76 85 95 104 113 121 130 139 147 156 164 173 181 190 198 207 215 224 232 241 249 255 255 255 255"],
  [0.2, "0 11 23 34 46 57 68 80 91 103 113 122 132 141 151 160 169 178 187 196 205 215 224 233 242 251 255 255 255 255 255 255 255"],
  [0.3, "0 14 28 42 56 70 84 98 112 123 133 144 154 164 174 184 194 204 213 223 233 242 252 255 255 255 255 255 255 255 255 255 255"],
  [0.4, "0 17 35 52 70 87 105 122 135 146 157 168 179 190 201 212 222 233 243 254 255 255 255 255 255 255 255 255 255 255 255 255 255"],
  [0.6, "0 31 61 92 122 149 164 178 192 206 219 233 245 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255"],
  [0.8, "0 74 147 188 210 230 248 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255"],
  [1, "255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255"]
];
var CONTRAST_LUT = [
  [-1, "127 127 127 127 127 127 127 127 127 127 127 127 127 127 127 127 128 128 128 128 128 128 128 128 128 128 128 128 128 128 128 128 128"],
  [-0.8, "97 100 103 105 107 109 111 113 115 117 118 120 121 123 125 126 128 129 131 132 134 135 137 139 140 142 144 146 148 150 153 155 158"],
  [-0.6, "41 60 70 78 84 89 94 98 102 106 109 112 116 119 122 125 128 131 134 137 140 143 146 150 153 157 162 166 172 178 186 197 214"],
  [-0.4, "0 20 37 50 60 69 77 83 89 95 100 105 110 114 119 123 128 132 137 141 146 151 155 161 166 172 179 187 196 207 220 237 255"],
  [-0.3, "0 14 28 40 50 60 68 76 83 89 96 101 107 112 117 123 128 133 138 144 149 154 160 166 173 180 188 196 206 217 229 242 255"],
  [-0.2, "0 11 22 33 43 52 61 69 77 84 91 97 104 110 116 122 128 134 140 146 152 159 165 172 179 187 195 204 213 223 234 245 255"],
  [-0.1, "0 9 19 28 37 46 54 62 70 78 86 93 100 107 114 121 128 135 142 149 156 163 170 178 186 194 202 210 219 228 237 247 255"],
  [0.1, "0 7 14 21 28 35 42 50 58 66 74 83 91 100 110 119 128 137 147 156 165 173 182 190 198 206 214 221 228 235 242 249 255"],
  [0.2, "0 6 11 17 23 30 36 43 51 59 68 77 87 97 107 118 128 139 149 160 170 179 189 197 205 212 219 226 232 238 244 250 255"],
  [0.3, "0 4 9 14 19 24 30 37 44 52 60 70 81 92 104 116 128 141 153 164 176 186 196 204 212 219 226 232 237 242 247 251 255"],
  [0.4, "0 3 6 10 14 18 23 29 35 43 52 62 74 86 100 114 128 143 157 170 183 194 204 213 221 227 233 238 242 246 249 252 255"],
  [0.6, "0 0 0 0 0 0 2 6 11 18 27 38 52 68 87 107 129 150 171 189 205 218 229 238 245 250 253 255 255 255 255 255 255"],
  [0.8, "0 0 0 0 0 0 0 0 0 0 0 0 0 21 52 89 130 171 208 238 255 255 255 255 255 255 255 255 255 255 255 255 255"],
  [1, "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255"]
];
var lutCache = /* @__PURE__ */ new Map();
function curveFor(table2, v, tag) {
  if (Math.abs(v) < 1e-6) return null;
  v = Math.max(-1, Math.min(1, v));
  const key = `${tag}${v}`;
  const hit = lutCache.get(key);
  if (hit) return hit;
  const knots = (s) => s ? s.split(" ").map(Number) : Array.from({ length: 33 }, (_, i2) => Math.min(255, i2 * 8));
  const pts = [[0, knots(null)], ...table2.map(([p, s]) => [p, knots(s)])];
  pts.sort((x, y) => x[0] - y[0]);
  let i = 0;
  while (i < pts.length - 2 && v > pts[i + 1][0]) i++;
  const [p0, k0] = pts[i], [p1, k1] = pts[i + 1];
  const t = p1 === p0 ? 0 : (v - p0) / (p1 - p0);
  const k = k0.map((y, j) => y + (k1[j] - y) * t);
  const lut = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    const j = Math.min(31, x >> 3), x0 = j * 8, x1 = j === 31 ? 255 : x0 + 8;
    lut[x] = clamp8(k[j] + (k[j + 1] - k[j]) * ((x - x0) / (x1 - x0)));
  }
  if (tag === "c" && v >= 1) for (let x = 0; x < 256; x++) lut[x] = x >= 128 ? 255 : 0;
  lutCache.set(key, lut);
  return lut;
}
function adjustBrightnessContrast(d, bright, contrast) {
  const lb = curveFor(BRIGHT_LUT, bright, "b"), lc = curveFor(CONTRAST_LUT, contrast, "c");
  if (!lb && !lc) return;
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    const y = lb ? lb[v] : v;
    lut[v] = lc ? lc[y] : y;
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
}
function blurRgb(d, w, h, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h * 3), out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let i = -r; i <= r; i++) s += d[(y * w + Math.min(w - 1, Math.max(0, x + i))) * 4 + c] * k[i + r];
        tmp[(y * w + x) * 3 + c] = s;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let i = -r; i <= r; i++) s += tmp[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * 3 + c] * k[i + r];
        out[(y * w + x) * 3 + c] = s;
      }
    }
  }
  return out;
}
function adjustSharpen(d, w, h, amount) {
  if (!amount || w < 2 || h < 2) return;
  const a = Math.min(1, Math.abs(amount)), sigma = 2.35 * a;
  if (amount < 0) {
    const b = blurRgb(d, w, h, sigma);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
      d[i] = clamp8(b[j]);
      d[i + 1] = clamp8(b[j + 1]);
      d[i + 2] = clamp8(b[j + 2]);
    }
    return;
  }
  const n = w * h, y = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) y[i * 4] = y[i * 4 + 1] = y[i * 4 + 2] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  const yb = blurRgb(y, w, h, sigma), k = 0.65 * Math.exp(1.7 * a), T4 = 2.5;
  for (let i = 0; i < n; i++) {
    const x = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2] - yb[i * 3];
    const dl = Math.abs(x) <= T4 ? 0 : k * (x - Math.sign(x) * T4);
    if (dl) for (let c = 0; c < 3; c++) d[i * 4 + c] = clamp8(d[i * 4 + c] + dl);
  }
}

// ../../../shared/drawingml/src/contour.ts
function wrapContour(rgba, w, h) {
  if (w < 1 || h < 1) return null;
  const N = 96;
  const gw = w >= h ? N : Math.max(1, Math.round(N * w / h));
  const gh = h >= w ? N : Math.max(1, Math.round(N * h / w));
  const occ = new Uint8Array(gw * gh);
  let filled = 0;
  for (let y = 0; y < h; y++) {
    const gy = Math.min(gh - 1, Math.floor(y * gh / h));
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] === 0) continue;
      const k = gy * gw + Math.min(gw - 1, Math.floor(x * gw / w));
      if (!occ[k]) {
        occ[k] = 1;
        filled++;
      }
    }
  }
  if (!filled || filled === gw * gh) return null;
  const R = 2;
  const dil = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!occ[y * gw + x]) continue;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) dil[yy * gw + xx] = 1;
        }
      }
    }
  }
  if (dil.every((v) => v === 1)) return null;
  const left = [], right = [];
  for (let y = 0; y < gh; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < gw; x++) if (dil[y * gw + x]) {
      if (l < 0) l = x;
      r = x;
    }
    if (l < 0) continue;
    left.push([l, y]);
    right.push([r, y]);
  }
  if (!left.length) return null;
  const ring = [...left, ...right.reverse()];
  const simple = douglasPeucker(ring, 1);
  const pts = simple.map(([x, y]) => [Math.round(x * 21600 / gw), Math.round(y * 21600 / gh)]);
  pts.push([pts[0][0], pts[0][1]]);
  return pts;
}
function douglasPeucker(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > best) {
        best = d;
        bi = i;
      }
    }
    if (best > eps && bi > 0) {
      keep[bi] = 1;
      stack.push([a, bi], [bi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// ../../../shared/drawingml/src/patterns.ts
var PRESET_PATTERNS = {
  pct5: "8000000008000000",
  pct10: "8000080080000800",
  pct20: "8800220088002200",
  pct25: "8822882288228822",
  pct30: "aa44aa11aa44aa11",
  pct40: "aa55aa51aa55aa15",
  pct50: "aa55aa55aa55aa55",
  pct60: "ee55bb55ee55bb55",
  pct70: "77dd77dd77dd77dd",
  pct75: "77ffddff77ffddff",
  pct80: "effffeffeffffeff",
  pct90: "fffffff7ffffff7f",
  horz: "ff00000000000000",
  vert: "8080808080808080",
  ltHorz: "ff000000ff000000",
  ltVert: "8888888888888888",
  dkHorz: "ffff0000ffff0000",
  dkVert: "cccccccccccccccc",
  narHorz: "ff00ff00ff00ff00",
  narVert: "5555555555555555",
  dashHorz: "f00000000f000000",
  dashVert: "8080808008080808",
  cross: "ff80808080808080",
  dnDiag: "8040201008040201",
  upDiag: "0102040810204080",
  ltDnDiag: "8844221188442211",
  ltUpDiag: "1122448811224488",
  dkDnDiag: "cc663399cc663399",
  dkUpDiag: "3366cc993366cc99",
  wdDnDiag: "c1e070381c0e0783",
  wdUpDiag: "83070e1c3870e0c1",
  dashDnDiag: "0000884422110000",
  dashUpDiag: "0000112244880000",
  diagCross: "8142241818244281",
  smCheck: "9966669999666699",
  lgCheck: "f0f0f0f00f0f0f0f",
  smGrid: "ff888888ff888888",
  lgGrid: "ff80808080808080",
  dotGrid: "aa00800080008000",
  smConfetti: "8008400210012004",
  lgConfetti: "b130031bd8c00c8d",
  horzBrick: "ff808080ff080808",
  diagBrick: "0102040818244281",
  solidDmnd: "10387cfe7c381000",
  openDmnd: "8244281028448201",
  dotDmnd: "8000220008002200",
  plaid: "aa55aa55f0f0f0f0",
  sphere: "77898f8f7798f8f8",
  weave: "8854224588142251",
  divot: "0010081000800180",
  shingle: "038448300c020101",
  wave: "001825c0001825c0",
  trellis: "ff66ff99ff66ff99",
  zigZag: "8142241881422418"
};
function patternRows(prst) {
  const hex = PRESET_PATTERNS[prst];
  if (!hex) return void 0;
  return Array.from({ length: 8 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
}

// ../../../shared/drawingml/src/shape-styles.ts
var SHAPE_STYLE_PRESETS = [
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="dk1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="dk1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent2"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent2"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent3"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent3"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent4"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent4"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent5"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent5"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent6"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent6"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="dk1"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="dk1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="dk1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent1"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent2"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent2"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent2"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent3"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent3"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent3"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent4"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent4"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent4"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent5"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent5"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent5"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent6"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent6"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent6"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="3"><a:schemeClr val="lt1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="dk1"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="dk1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="3"><a:schemeClr val="lt1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="3"><a:schemeClr val="lt1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent2"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent2"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="3"><a:schemeClr val="lt1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent3"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent3"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="3"><a:schemeClr val="lt1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent4"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent4"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="3"><a:schemeClr val="lt1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent5"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent5"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="3"><a:schemeClr val="lt1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent6"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent6"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="dk1"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="dk1"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="dk1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent2"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="accent2"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent2"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent3"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="accent3"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent3"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent4"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="accent4"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent4"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent5"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="accent5"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent5"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent6"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="accent6"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent6"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="dk1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="dk1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="dk1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent2"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent2"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent2"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent3"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent3"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent3"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent4"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent4"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent4"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent5"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent5"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent5"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="1"><a:schemeClr val="accent6"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent6"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent6"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="0"><a:schemeClr val="dk1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="dk1"/></a:fillRef><a:effectRef idx="3"><a:schemeClr val="dk1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="0"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="3"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="0"><a:schemeClr val="accent2"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent2"/></a:fillRef><a:effectRef idx="3"><a:schemeClr val="accent2"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="0"><a:schemeClr val="accent3"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent3"/></a:fillRef><a:effectRef idx="3"><a:schemeClr val="accent3"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="0"><a:schemeClr val="accent4"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent4"/></a:fillRef><a:effectRef idx="3"><a:schemeClr val="accent4"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="0"><a:schemeClr val="accent5"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent5"/></a:fillRef><a:effectRef idx="3"><a:schemeClr val="accent5"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:ln/>", '<wps:style><a:lnRef idx="0"><a:schemeClr val="accent6"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent6"/></a:fillRef><a:effectRef idx="3"><a:schemeClr val="accent6"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ["<a:noFill/><a:ln><a:noFill/></a:ln>", '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ["<a:noFill/><a:ln><a:noFill/></a:ln>", '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent1"/></a:fontRef></wps:style>'],
  ["<a:noFill/><a:ln><a:noFill/></a:ln>", '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent2"/></a:fontRef></wps:style>'],
  ["<a:noFill/><a:ln><a:noFill/></a:ln>", '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent3"/></a:fontRef></wps:style>'],
  ["<a:noFill/><a:ln><a:noFill/></a:ln>", '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent4"/></a:fontRef></wps:style>'],
  ["<a:noFill/><a:ln><a:noFill/></a:ln>", '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent5"/></a:fontRef></wps:style>'],
  ["<a:noFill/><a:ln><a:noFill/></a:ln>", '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent6"/></a:fontRef></wps:style>'],
  ['<a:noFill/><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="dk1"/></a:solidFill><a:prstDash val="solid"/><a:round/><a:headEnd type="none" w="med" len="med"/><a:tailEnd type="none" w="med" len="med"/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></wps:style>'],
  ['<a:noFill/><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:prstDash val="solid"/><a:round/><a:headEnd type="none" w="med" len="med"/><a:tailEnd type="none" w="med" len="med"/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent1"/></a:fontRef></wps:style>'],
  ['<a:noFill/><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:prstDash val="solid"/><a:round/><a:headEnd type="none" w="med" len="med"/><a:tailEnd type="none" w="med" len="med"/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent2"/></a:fontRef></wps:style>'],
  ['<a:noFill/><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent3"/></a:solidFill><a:prstDash val="solid"/><a:round/><a:headEnd type="none" w="med" len="med"/><a:tailEnd type="none" w="med" len="med"/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent3"/></a:fontRef></wps:style>'],
  ['<a:noFill/><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent4"/></a:solidFill><a:prstDash val="solid"/><a:round/><a:headEnd type="none" w="med" len="med"/><a:tailEnd type="none" w="med" len="med"/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent4"/></a:fontRef></wps:style>'],
  ['<a:noFill/><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent5"/></a:solidFill><a:prstDash val="solid"/><a:round/><a:headEnd type="none" w="med" len="med"/><a:tailEnd type="none" w="med" len="med"/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent5"/></a:fontRef></wps:style>'],
  ['<a:noFill/><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent6"/></a:solidFill><a:prstDash val="solid"/><a:round/><a:headEnd type="none" w="med" len="med"/><a:tailEnd type="none" w="med" len="med"/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="accent6"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="dk1"><a:alpha val="50000"/></a:schemeClr></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent1"><a:alpha val="50000"/></a:schemeClr></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent2"><a:alpha val="50000"/></a:schemeClr></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent3"><a:alpha val="50000"/></a:schemeClr></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent4"><a:alpha val="50000"/></a:schemeClr></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent5"><a:alpha val="50000"/></a:schemeClr></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent6"><a:alpha val="50000"/></a:schemeClr></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="dk1"/></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent3"/></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent4"/></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent5"/></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:solidFill><a:schemeClr val="accent6"/></a:solidFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="dk1"><a:lumMod val="67000"/></a:schemeClr></a:gs><a:gs pos="48000"><a:schemeClr val="dk1"><a:lumMod val="97000"/><a:lumOff val="3000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="dk1"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/><a:tileRect/></a:gradFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent1"><a:lumMod val="67000"/></a:schemeClr></a:gs><a:gs pos="48000"><a:schemeClr val="accent1"><a:lumMod val="97000"/><a:lumOff val="3000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="accent1"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/><a:tileRect/></a:gradFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent2"><a:lumMod val="67000"/></a:schemeClr></a:gs><a:gs pos="48000"><a:schemeClr val="accent2"><a:lumMod val="97000"/><a:lumOff val="3000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="accent2"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/><a:tileRect/></a:gradFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent3"><a:lumMod val="67000"/></a:schemeClr></a:gs><a:gs pos="48000"><a:schemeClr val="accent3"><a:lumMod val="97000"/><a:lumOff val="3000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="accent3"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/><a:tileRect/></a:gradFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent4"><a:lumMod val="67000"/></a:schemeClr></a:gs><a:gs pos="48000"><a:schemeClr val="accent4"><a:lumMod val="97000"/><a:lumOff val="3000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="accent4"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/><a:tileRect/></a:gradFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent5"><a:lumMod val="67000"/></a:schemeClr></a:gs><a:gs pos="48000"><a:schemeClr val="accent5"><a:lumMod val="97000"/><a:lumOff val="3000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="accent5"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/><a:tileRect/></a:gradFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>'],
  ['<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent6"><a:lumMod val="67000"/></a:schemeClr></a:gs><a:gs pos="48000"><a:schemeClr val="accent6"><a:lumMod val="97000"/><a:lumOff val="3000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="accent6"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/><a:tileRect/></a:gradFill><a:ln><a:noFill/></a:ln>', '<wps:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>']
];

// ../../../shared/drawingml/src/light3d.ts
var PH = [0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 85];
var DIR = { t: 0, tl: 45, l: 90, bl: 135, b: 180, br: -135, r: -90, tr: -45 };
var TABLES = {
  "threePt|": "Ozs7ADExMQApKSkAICAgABUVFQAMDAwABgYGAAMDAwACAgIAAgICAAICAgA7OzsAMDAwACgoKAAdHR0AExMTAAoKCgAFBQUABAQEAAQEBAAEBAQABAQEADs7OwAvLy8AKCgoAB4eHgAREREACgoKAAcHBwAHBwcABwcHAAcHBwAHBwcAOzs7ADAwMAArKysBIyMjARMTEwELCwsACQkJAAoKCgAMDAwBDg4OAQ4ODgE7OzsAMTExAC8vLwEqKioDFhYWAg0NDQEMDAwAExMTARkZGQIcHBwCHBwcAjs7OwAxMTEAMTExAjAwMAQaGhoDDw8PARAQEAEjIyMDKioqBC4uLgQuLi4EOzs7ADExMQAwMDABLCwsAxgYGAIQEBABGhoaAjg4OAhDQ0MJQ0NDB0NDQwc7OzsAMjIyAC0tLQElJSUBGBgYARISEgEfHx8EREREDkxMTA5OTk4MTk5ODDs7OwAyMjIALCwsACMjIwAXFxcAFBQUAR4eHgU/Pz8RRkZGD0ZGRgxGRkYMOzs7ADQ0NAAtLS0AJCQkABoaGgAWFhYBGxsbAywsLAsxMTEMMTExCTExMQk7OzsANjY2ADAwMAAoKCgAHh4eABcXFwAWFhYBIiIiBSMjIwYiIiIGIiIiBjs7OwA5OTkAMzMzACwsLAAkJCQAGxsbABUVFQAYGBgCGRkZAhkZGQMZGRkDOzs7AD8/PwE7OzsAMjIyACgoKAAfHx8AGBgYABQUFAEUFBQBFRUVARUVFQE7OzsARkZGAUlJSQE7OzsBMDAwACcnJwAhISEAHBwcABoaGgAZGRkAGRkZADs7OwBPT08CX19fBU5OTgI6OjoAMjIyAC4uLgAnJycAIyMjACIiIgAiIiIAOzs7AFdXVwN7e3sMa2trCEtLSwE8PDwANzc3ADAwMAAsLCwAKSkpACkpKQA7OzsAXV1dBJGRkRODg4MOWFhYAkNDQwA8PDwANTU1ADIyMgAvLy8ALy8vADs7OwBdXV0EkJCQE4ODgw9ZWVkDQ0NDADw8PAA2NjYAMjIyADAwMAAwMDAAOzs7AFhYWAR5eXkLZmZmB0lJSQE8PDwANzc3ADAwMAAqKioAKSkpACkpKQA7OzsAT09PAl1dXQVLS0sCOTk5ADIyMgAuLi4AJiYmACMjIwAhISEAISEhADs7OwBFRUUBRUVFATc3NwEsLCwAJiYmACIiIgAaGhoAFxcXABUVFQAVFRUAOzs7AD09PQE3NzcALi4uACMjIwAcHBwAFhYWAA8PDwAMDAwACwsLAAsLCwA7OzsAODg4ADExMQAoKCgAHx8fABYWFgANDQ0ABwcHAAUFBQAEBAQABAQEADs7OwA0NDQALCwsACQkJAAbGxsAERERAAkJCQAEBAQAAgICAAICAgACAgIAOzs7AA==",
  "threePt|matte": "NjY2ADExMQApKSkAICAgABUVFQAMDAwABgYGAAMDAwACAgIAAgICAAICAgA2NjYAMDAwACcnJwAdHR0AExMTAAoKCgAFBQUABAQEAAQEBAAEBAQABAQEADY2NgAvLy8AJSUlABsbGwAQEBAACgoKAAcHBwAHBwcABwcHAAYGBgAGBgYANjY2AC8vLwAkJCQAGhoaAA8PDwAKCgoACQkJAAkJCQAKCgoACwsLAAsLCwA2NjYALy8vACQkJAAZGRkADw8PAAsLCwALCwsADQ0NABAQEAATExMAExMTADY2NgAuLi4AJCQkABoaGgAQEBAACwsLAAwMDAAUFBQAFxcXABoaGgAaGhoANjY2AC4uLgAlJSUAGxsbABAQEAAMDAwADw8PABkZGQAfHx8AIiIiACIiIgA2NjYAMDAwACcnJwAdHR0AExMTAA0NDQAPDw8AGRkZABwcHAAfHx8AHx8fADY2NgAxMTEAKSkpACAgIAAWFhYADw8PAA4ODgAVFRUAGRkZABwcHAAcHBwANjY2ADMzMwAsLCwAJCQkABoaGgATExMADw8PAA8PDwASEhIAFBQUABQUFAA2NjYANDQ0ADAwMAAoKCgAHh4eABUVFQAQEBAAEBAQABAQEAAPDw8ADw8PADY2NgA2NjYAMzMzACwsLAAkJCQAGxsbABISEgAPDw8ADw8PAA8PDwAPDw8ANjY2ADg4OAA2NjYAMTExACgoKAAfHx8AGBgYABEREQAPDw8ADw8PAA8PDwA2NjYAOTk5ADk5OQA1NTUALy8vACcnJwAhISEAGxsbABgYGAAXFxcAFxcXADY2NgA6OjoAOzs7ADg4OAA1NTUAMjIyAC4uLgAnJycAIyMjACEhIQAhISEANjY2ADs7OwA8PDwAOjo6ADw8PAA7OzsANzc3ADAwMAAsLCwAKSkpACkpKQA2NjYAPDw8AD4+PgA9PT0APz8/AEBAQAA8PDwANTU1ADIyMgAvLy8ALy8vADY2NgA7OzsAPDw8ADw8PABAQEAAQEBAADw8PAA2NjYAMjIyADAwMAAwMDAANjY2ADo6OgA7OzsAOTk5ADs7OwA7OzsANzc3ADAwMAAqKioAKSkpACkpKQA2NjYAOjo6ADk5OQA2NjYANDQ0ADIyMgAuLi4AJiYmACMjIwAhISEAISEhADY2NgA4ODgANjY2ADExMQArKysAJiYmACIiIgAaGhoAFxcXABUVFQAVFRUANjY2ADY2NgAzMzMALS0tACMjIwAcHBwAFhYWAA8PDwAMDAwACwsLAAsLCwA2NjYANDQ0ADAwMAAoKCgAHx8fABYWFgANDQ0ABwcHAAUFBQAEBAQABAQEADY2NgAzMzMALCwsACQkJAAbGxsAERERAAkJCQAEBAQAAgICAAICAgACAgIANjY2AA==",
  "threePt|plastic": "ODg4ADExMQApKSkAICAgABUVFQAMDAwABgYGAAMDAwACAgIAAgICAAICAgA4ODgAMDAwACcnJwAdHR0AExMTAAoKCgAFBQUABAQEAAQEBAAEBAQABAQEADg4OAAvLy8AJycnAB0dHQAREREACgoKAAcHBwAHBwcABwcHAAcHBwAHBwcAODg4AC8vLwAsLCwBJiYmAhMTEwELCwsACQkJAAoKCgALCwsADQ0NAQ0NDQE4ODgAMDAwADMzMwI7OzsKHBwcBA0NDQELCwsAEhISARkZGQIcHBwCHBwcAjg4OAAwMDAAODg4A0lJSRAkJCQHDw8PAQ8PDwEpKSkFMjIyBzY2Ngc2NjYHODg4AC8vLwA0NDQCOzs7CBwcHAMQEBABHR0dA1FRURZeXl4WWlpaEFpaWhA4ODgAMTExAC4uLgEoKCgCGBgYAREREQEoKCgJd3d3N39/fzZ6enopenp6KTg4OAAxMTEAKysrACIiIgAXFxcAFBQUAScnJwtzc3NEe3t7PW5ubidubm4nODg4ADMzMwAsLCwAJCQkABoaGgAWFhYBICAgBUdHRyVQUFAnSkpKG0pKShs4ODgANDQ0ADAwMAAoKCgAHh4eABcXFwAWFhYBLCwsCy8vLw4tLS0MLS0tDDg4OAA3NzcAMzMzACwsLAAkJCQAGxsbABQUFAAYGBgCGxsbAxwcHAMcHBwDODg4AD09PQA5OTkAMTExACgoKAAfHx8AGBgYABISEgATExMBFBQUARQUFAE4ODgAREREAUdHRwE5OTkALy8vACcnJwAhISEAGxsbABkZGQAYGBgAGBgYADg4OABPT08CbGxsCFFRUQM4ODgAMjIyAC4uLgAnJycAIyMjACEhIQAhISEAODg4AF5eXgSurq4iiIiIEk1NTQI7OzsANzc3ADAwMAAsLCwAKSkpACkpKQA4ODgAaWlpB6enp0e6uroxYWFhBEJCQgA8PDwANTU1ADIyMgAvLy8ALy8vADg4OABqamoHpaWlSbm5uTJkZGQEQkJCADw8PAA2NjYAMjIyADAwMAAwMDAAODg4AGFhYQWrq6shgICAEEpKSgE7OzsANzc3ADAwMAAqKioAKSkpACkpKQA4ODgAUVFRA2lpaQhMTEwCODg4ADIyMgAuLi4AJiYmACMjIwAhISEAISEhADg4OABDQ0MBREREATU1NQAsLCwAJiYmACIiIgAaGhoAFxcXABUVFQAVFRUAODg4ADo6OgA1NTUALS0tACMjIwAcHBwAFhYWAA8PDwAMDAwACwsLAAsLCwA4ODgANTU1ADAwMAAoKCgAHx8fABYWFgANDQ0ABwcHAAUFBQAEBAQABAQEADg4OAAzMzMALCwsACQkJAAbGxsAERERAAkJCQAEBAQAAgICAAICAgACAgIAODg4AA==",
  "threePt|metal": "Ojo6ADExMQApKSkAICAgABYWFgAODg4ACQkJAQcHBwYICAgTCQkJIAkJCSA6OjoAMDAwACcnJwAeHh4AFBQUAAwMDAAICAgBCwsLBw0NDQ8PDw8ZDw8PGTo6OgAwMDAAKSkpAB8fHwESEhIACwsLAAoKCgEQEBAIExMTFBYWFigWFhYoOjo6ADAwMAAyMjICMjIyCBgYGAINDQ0BDQ0NARQUFAkbGxsdICAgOyAgIDs6OjoAMTExAENDQwhXV1cwJycnDxEREQIPDw8BIyMjFC4uLi8zMzNOMzMzTjo6OgAxMTEATU1NDm5ublc1NTUfFBQUAxcXFwRCQkI7UVFRYFNTU3lTU1N5Ojo6ADExMQBCQkIHVlZWJigoKAwVFRUDKysrFTU1NcUAAAD/BQUF+QUFBfk6OjoAMjIyADQ0NAIyMjIFHR0dAhcXFwM8PDw5AAAA/wAAAP8AAAD/AAAA/zo6OgAxMTEALCwsACMjIwAYGBgAGhoaBDk5OUMAAAD/AAAA/wAAAP8AAAD/Ojo6ADMzMwAsLCwAJSUlABoaGgAaGhoCMjIyIQMDA/wAAAD/AAAA/wAAAP86OjoANTU1ADAwMAAoKCgAHx8fABoaGgEhISEIRUVFa0VFRaU8PDy6PDw8ujo6OgA5OTkAMzMzACwsLAAlJSUAHR0dABkZGQIqKioWLy8vLDExMUAxMTFAOjo6AEJCQgE7OzsBMTExACkpKQAhISEAHBwcAR8fHwcmJiYXKSkpIykpKSM6OjoAT09PA1RUVAQ/Pz8BLy8vACkpKQAmJiYBKCgoBSoqKgsrKysRKysrETo6OgBnZ2cJmpqaJWlpaQo9PT0BNDQ0ADMzMwE0NDQFNjY2Czc3NxM3NzcTOjo6AH9/fxQ+Pj66kZGRX19fXwY9PT0APT09AT09PQVAQEALQUFBFEFBQRQ6OjoAlJSUIAAAAP8EBAT6hISEEkRERAFCQkIBQ0NDBUVFRQtGRkYTRkZGEzo6OgCVlZUgAAAA/wICAvyHh4cVREREAUJCQgFDQ0MFRUVFCUZGRg5GRkYOOjo6AISEhBZCQkK3mpqaVVpaWgU9PT0APDw8AT8/PwVAQEANQEBAE0BAQBM6OjoAaGhoCpWVlSViYmIKPDw8ATMzMwAzMzMBNTU1BTc3Nwo3NzcQNzc3EDo6OgBOTk4DU1NTBDk5OQEsLCwAKCgoACYmJgEoKCgGKSkpDSoqKhYqKioWOjo6AEBAQAE4ODgALS0tACQkJAAeHh4AGhoaARsbGwYcHBwPHR0dHB0dHRw6OjoANzc3ADAwMAAoKCgAHx8fABcXFwAREREBEBAQBxAQEA8QEBAbEBAQGzo6OgAzMzMALCwsACQkJAAbGxsAEhISAA0NDQEKCgoHCgoKDQkJCRQJCQkUOjo6AA==",
  "threePt|flat": "MTExADExMQAxMTEAMTExADExMQAuLi4AKysrACAgIAAXFxcAERERABEREQAxMTEAMTExADExMQAxMTEAMTExAC8vLwArKysAICAgABkZGQAUFBQAFBQUADExMQAxMTEAMTExADExMQAxMTEALy8vACsrKwAfHx8AFxcXABAQEAAQEBAAMTExADExMQAxMTEAMjIyADExMQAvLy8AKysrACAgIAAWFhYADg4OAA4ODgAxMTEAMTExADIyMgBJSUkDOzs7AS8vLwArKysAHx8fABcXFwAQEBAAEBAQADExMQAxMTEANTU1AH9/fxVVVVUGLy8vACsrKwAhISEAGhoaABQUFAAUFBQAMTExADExMQAyMjIAPz8/ATY2NgAuLi4AKysrACwsLAEgICACFhYWARYWFgExMTEAMTExADExMQAxMTEAMTExAC8vLwAuLi4Ab29vIWJiYiJBQUESQUFBEjExMQAxMTEAMTExADExMQAxMTEALy8vADExMQGdnZ1NeHh4Pz09PRM9PT0TMTExADExMQAxMTEAMTExADExMQAvLy8ALS0tAEZGRgg9PT0KIiIiBCIiIgQxMTEAMTExADExMQAxMTEAMTExAC8vLwArKysAJCQkAB4eHgEXFxcAFxcXADExMQAxMTEAMTExADExMQAxMTEALy8vACsrKwAjIyMAHR0dABkZGQAZGRkAMTExADExMQAxMTEAMTExADExMQAuLi4AKysrACMjIwAbGxsAFhYWABYWFgAxMTEAMTExADExMQAxMTEAMTExAC8vLwArKysAIyMjAB4eHgAZGRkAGRkZADExMQAxMTEAMjIyADExMQAxMTEALy8vACsrKwAiIiIAHBwcABcXFwAXFxcAMTExADIyMgBHR0cCODg4ATExMQAvLy8AKysrACMjIwAbGxsAFhYWABYWFgAxMTEAMzMzAJ+fnyZnZ2cLMTExAC8vLwArKysAIiIiABwcHAAXFxcAFxcXADExMQAzMzMAp6enLGlpaQwyMjIALy8vACsrKwAiIiIAHR0dABoaGgAaGhoAMTExADIyMgBGRkYCNjY2ADExMQAuLi4AKysrACMjIwAaGhoAFxcXABcXFwAxMTEAMTExADIyMgAxMTEAMTExAC8vLwArKysAIiIiABwcHAAYGBgAGBgYADExMQAxMTEAMTExADExMQAxMTEALy8vACsrKwAhISEAGhoaABUVFQAVFRUAMTExADExMQAxMTEAMTExADExMQAvLy8AKysrACEhIQAZGRkAEhISABISEgAxMTEAMTExADExMQAxMTEAMTExAC8vLwArKysAICAgABkZGQASEhIAEhISADExMQAxMTEAMTExADExMQAxMTEALy8vACsrKwAgICAAGhoaABUVFQAVFRUAMTExAA==",
  "threePt|softEdge": "NjY2ADExMQApKSkAICAgABYWFgAODg4ACgoKAQgICAcJCQkZCQkJKwkJCSs2NjYAMDAwACcnJwAdHR0AExMTAAwMDAAICAgBDAwMCA0NDRIPDw8gDw8PIDY2NgAvLy8AJSUlABsbGwAREREACwsLAAoKCgEQEBAJFBQUFxYWFjAWFhYwNjY2AC8vLwAkJCQAGxsbABAQEAALCwsADQ0NARMTEwgaGhoaHR0dOh0dHTo2NjYALy8vACgoKAA3NzcIGRkZAgwMDAAODg4BGxsbCSQkJBgpKSkzKSkpMzY2NgAuLi4ALCwsAWZmZiYpKSkKDAwMABAQEAElJSUJLy8vFTQ0NCQ0NDQkNjY2AC4uLgAoKCgAMTExBBcXFwEODg4AFBQUAUFBQRtPT089SEhIS0hISEs2NjYAMDAwACcnJwAeHh4AFBQUAA8PDwAbGxsEXV1dlzk5OcBISEimSEhIpjY2NgAxMTEAKSkpACAgIAAXFxcAERERABoaGgURERHtDQ0N8Tc3N7U3Nze1NjY2ADMzMwAsLCwAJCQkABsbGwAUFBQAFhYWAklJST5WVlZwRkZGa0ZGRms2NjYANDQ0ADAwMAAoKCgAHx8fABgYGAAUFBQBJCQkDCoqKhwqKiotKioqLTY2NgA2NjYAMzMzACwsLAAlJSUAHR0dABYWFgEaGhoGHx8fDCEhIRQhISEUNjY2ADg4OAA2NjYAMTExACoqKgAiIiIAHBwcARsbGwUgICAQIyMjGSMjIxk2NjYAOTk5ADk5OQA1NTUALy8vACkpKQAnJycBKSkpBSoqKgsrKysSKysrEjY2NgA7OzsAQUFBADk5OQA2NjYANTU1ADMzMwE2NjYGNzc3DTg4OBc4ODgXNjY2AD8/PwB7e3sMVFRUAz09PQA9PT0APT09AUBAQAVBQUEOQUFBGkFBQRo2NjYARUVFAY2NjWSxsbEmRkZGAUJCQgBCQkIBRkZGBkdHRw1HR0cXR0dHFzY2NgBFRUUBg4ODb7S0tChGRkYBQkJCAEJCQgFFRUUFR0dHCkhISBFISEgRNjY2AD8/PwB4eHgLTU1NAj09PQA9PT0APT09AT8/PwVDQ0MPQkJCGEJCQhg2NjYAOzs7AD8/PwE2NjYANTU1ADQ0NAAzMzMBNTU1Bjc3Nww4ODgUODg4FDY2NgA4ODgANjY2ADExMQAsLCwAKSkpACcnJwEpKSkHKysrDywsLB4sLCweNjY2ADY2NgAzMzMALS0tACQkJAAeHh4AGhoaARwcHAYeHh4THh4eJh4eHiY2NjYANDQ0ADAwMAAoKCgAHx8fABcXFwAREREBEBAQBxERERIQEBAlEBAQJTY2NgAzMzMALCwsACQkJAAbGxsAEhISAA0NDQELCwsHCgoKDwkJCRsJCQkbNjY2AA==",
  "threePt|powder": "bm5uclpaWlxERERALy8vLCAgICAVFRUcDAwMHggICDEGBgZOBQUFYQUFBWFubm5yWFhYWEJCQj0tLS0rHR0dHxAQEBkJCQkcCgoKOAoKCksJCQleCQkJXm5ubnJXV1dXQEBAQCwsLC4aGhofERERGg0NDSEODg5ADQ0NWAsLC3ELCwtxbm5uclZWVlY/Pz9DLS0tNBsbGyQSEhIfERERKBEREUMQEBBhEBAQgBAQEIBubm5yV1dXV0NDQ0cxMTE5HR0dKRUVFSQUFBQtFhYWUBcXF2wVFRWHFRUVh25ubnJXV1dXQ0NDSTIyMj4fHx8wFhYWKhkZGTYeHh5gICAgdh8fH4gfHx+Ibm5uclhYWFhFRUVJNDQ0PiMjIzIbGxs0Hx8fTSkpKYMoKCiqJSUlvCUlJbxubm5yW1tbW0ZGRkg2NjY7JycnNiEhIT8oKChpMDAwvh8fH90NDQ3wDQ0N8G5ubnJcXFxeSkpKSDg4ODkqKio1IyMjQiQkJGsqKirLDg4O7wMDA/wDAwP8bm5ucmBgYGFNTU1IPDw8NywsLDIkJCQ4ISEhUiIiIoYiIiKsHx8fxx8fH8dubm5yZWVlZ1RUVE9BQUE5MDAwLyQkJC8dHR04GxsbXBkZGXEWFhaEFhYWhG5ubnJra2tvXV1dWUtLS0I3Nzc0KCgoLh0dHTEXFxdJFxcXWBYWFmUWFhZlbm5ucnFxcXlpaWlqV1dXUkJCQj0vLy81IyMjNhoaGkcWFhZeFhYWahYWFmpubm5yb29vhXR0dH9mZmZpT09PTzo6OkIwMDBEJSUlVyEhIWIdHR1sHR0dbG5ubnJlZWWPXV1dmG5uboZhYWFnT09PWD8/P1YwMDBlKSkpciMjI34jIyN+bm5ucl9fX5dHR0exU1NTpG9vb4VgYGBuTExMZTo6Om8vLy9+KSkpiikpKYpubm5yWVlZnTs7O75DQ0O1XFxcmWlpaX1TU1NvPT09eDY2NoEwMDCLMDAwi25ubnJZWVmdPDw8vUJCQrZbW1uaaWlpfVNTU28+Pj54ODg4fzMzM4YzMzOGbm5ucl1dXZhLS0usV1dXn29vb4RdXV1tS0tLZDg4OHAtLS2BKioqiSoqKolubm5yZ2dnjWFhYZVwcHCAX19fZ05OTlg+Pj5WLy8vZysrK3InJyd7Jycne25ubnJzc3OBcXFxfF9fX2JJSUlKOzs7Qi8vL0UjIyNaHh4eaRsbG3cbGxt3bm5ucm9vb3VhYWFjTk5OSzg4ODcrKyswICAgNRgYGEsTExNfEBAQchAQEHJubm5yZ2dna1ZWVlJBQUE6Li4uLCEhISYWFhYpDg4OPwsLC1AKCgpjCgoKY25ubnJgYGBiTExMRjc3NzAmJiYlGhoaIBISEiMLCws2CAgIQwcHB08HBwdPbm5ucg==",
  "balanced|": "MjIyASoqKgAlJSUAHx8fABoaGgAcHBwBIiIiAyoqKgQoKCgCJiYmASYmJgEyMjIBKSkpACIiIgAbGxsAFhYWABYWFgEbGxsDFxcXBBQUFAITExMCExMTAjIyMgEpKSkAIiIiABsbGwAWFhYAFRUVARgYGAIWFhYCEhISAQ4ODgEODg4BMjIyAS0tLQAnJycAIyMjAB0dHQAaGhoAGxsbARoaGgEWFhYBFBQUARQUFAEyMjIBNDQ0ATIyMgErKysAJycnACIiIgAfHx8AHR0dABsbGwAZGRkAGRkZADIyMgE8PDwCQUFBAjk5OQAzMzMALS0tACcnJwAhISEAICAgAB8fHwAfHx8AMjIyAUdHRwNYWFgFTU1NAj4+PgA4ODgAMjIyACoqKgAlJSUAIyMjACMjIwAyMjIBUFBQBHR0dAtoaGgFTU1NAUBAQAA7OzsAMzMzADAwMAAtLS0ALS0tADIyMgFWVlYFiYmJEX19fQlWVlYBRkZGAEBAQAA3NzcAMzMzADAwMAAwMDAAMjIyAVVVVQWNjY0SgICACldXVwFGRkYAQEBAADk5OQAzMzMALy8vAC8vLwAyMjIBT09PBHZ2dgtqamoGTU1NAUFBQQA7OzsAMzMzAC8vLwAsLCwALCwsADIyMgFGRkYDWVlZBU5OTgJAQEAAODg4ADMzMwAqKioAKCgoACYmJgAmJiYAMjIyAT09PQJCQkICODg4ADIyMgAtLS0AKCgoACEhIQAcHBwAGxsbABsbGwAyMjIBNzc3ATMzMwEtLS0AKCgoACIiIgAcHBwAFhYWABMTEwASEhIAEhISADIyMgE0NDQAMjIyAC8vLwAqKioAJSUlAB4eHgAWFhYAExMTABEREQAREREAMjIyATMzMwAzMzMAMzMzAC4uLgApKSkAIiIiABsbGwAXFxcAFBQUABQUFAAyMjIBMzMzADU1NQA1NTUAMjIyACwsLAAmJiYAHR0dABsbGwAbGxsAGxsbADIyMgEzMzMANTU1ADk5OQA9PT0BNjY2ASoqKgAnJycAKSkpACoqKgAqKioAMjIyATIyMgA2NjYAQ0NDAVRUVAVLS0sENzc3ATU1NQA2NjYANzc3ADc3NwAyMjIBMTExADY2NgBISEgCY2NjC2BgYAtFRUUCPDw8ADw8PAA9PT0APT09ADIyMgEwMDAANDQ0AEJCQgJZWVkJV1dXCURERAI+Pj4AQkJCAEZGRgBGRkYAMjIyAS8vLwAvLy8ANTU1ATw8PAM6OjoDODg4AUFBQQBHR0cAS0tLAEtLSwAyMjIBLS0tACwsLAAqKioAJiYmASYmJgEwMDABQEBAAURERAFHR0cBR0dHATIyMgEsLCwAKCgoACMjIwAeHh4AHx8fASoqKgI4ODgCOjo6Ajs7OwE7OzsBMjIyAQ==",
  "soft|": "MDAwADMzMwAyMjIAMDAwAC0tLQArKysAKSkpACYmJgAkJCQAIyMjACMjIwAwMDAAMDAwAC4uLgAsLCwAKioqACcnJwAjIyMAICAgAB8fHwAeHh4AHh4eADAwMAAuLi4AKysrACgoKAAlJSUAISEhAB4eHgAaGhoAGRkZABgYGAAYGBgAMDAwACwsLAApKSkAJSUlACEhIQAdHR0AGRkZABYWFgAUFBQAEhISABISEgAwMDAAKysrACcnJwAiIiIAHh4eABkZGQAVFRUAEhISABAQEAAPDw8ADw8PADAwMAAqKioAJSUlACEhIQAbGxsAFxcXABMTEwAPDw8ADg4OAA4ODgAODg4AMDAwACkpKQAkJCQAHh4eABkZGQAVFRUAERERAA4ODgAMDAwADAwMAAwMDAAwMDAAKSkpACMjIwAeHh4AGRkZABQUFAAQEBAADQ0NAAwMDAALCwsACwsLADAwMAApKSkAJCQkAB4eHgAZGRkAFBQUABAQEAANDQ0ADAwMAAsLCwALCwsAMDAwACkpKQAkJCQAHx8fABoaGgAWFhYAEhISAA4ODgAMDAwADAwMAAwMDAAwMDAAKioqACYmJgAhISEAHBwcABgYGAATExMAEBAQAA8PDwAODg4ADg4OADAwMAArKysAJycnACQkJAAfHx8AGhoaABcXFwATExMAEhISABEREQAREREAMDAwACwsLAApKSkAJiYmACIiIgAeHh4AGxsbABcXFwAWFhYAFRUVABUVFQAwMDAALi4uACwsLAApKSkAJiYmACMjIwAgICAAHBwcABsbGwAbGxsAGxsbADAwMAAwMDAALy8vAC0tLQArKysAKCgoACYmJgAiIiIAISEhACAgIAAgICAAMDAwADMzMwA0NDQAMjIyADAwMAAuLi4ALCwsACgoKAAnJycAJiYmACYmJgAwMDAAODg4AT4+PgE6OjoANTU1ADQ0NAAxMTEALy8vAC0tLQArKysAKysrADAwMAA+Pj4BTk5OA0lJSQI+Pj4BODg4ADY2NgAzMzMAMjIyADExMQAxMTEAMDAwAENDQwJeXl4GXV1dBUdHRwE8PDwAOTk5ADg4OAA2NjYANTU1ADU1NQAwMDAARUVFAmtrawlubm4IT09PAj8/PwA7OzsAOjo6ADk5OQA3NzcANzc3ADAwMABEREQCaGhoCGpqagdMTEwCPj4+ADs7OwA4ODgANzc3ADY2NgA2NjYAMDAwAEFBQQJZWVkFVlZWBENDQwE7OzsAODg4ADY2NgA1NTUANDQ0ADQ0NAAwMDAAPDw8AUZGRgJDQ0MBOjo6ADY2NgA1NTUAMjIyADAwMAAvLy8ALy8vADAwMAA3NzcBOTk5ATY2NgAzMzMAMTExAC8vLwAsLCwAKysrACsrKwArKysAMDAwAA==",
  "harsh|": "ISEhABISEgAHBwcABAQEAAQEBAAEBAQABAQEAAQEBAAEBAQABAQEAAQEBAAhISEAExMTAAgICAAFBQUABAQEAAQEBAAEBAQABAQEAAQEBAAEBAQABAQEACEhIQAVFRUACwsLAAgICAAGBgYABAQEAAQEBAAEBAQABAQEAAQEBAAEBAQAISEhABcXFwAODg4ADQ0NAAsLCwAKCgoACAgIAAcHBwAGBgYABQUFAAUFBQAhISEAGhoaABISEgASEhIAEhISABEREQAREREADw8PAA4ODgAODg4ADg4OACEhIQAeHh4AGBgYABkZGQAbGxsAHBwcABwcHAAcHBwAGxsbABsbGwAbGxsAISEhACMjIwAiIiIAIiIiACYmJgApKSkAKSkpACkpKQApKSkAKSkpACkpKQAhISEAJycnADAwMAE8PDwCPDw8Ajg4OAE1NTUANzc3ADc3NwA3NzcANzc3ACEhIQAsLCwAQEBAAWVlZQZubm4GWlpaAkZGRgBAQEAAQEBAAEBAQABAQEAAISEhAC8vLwBPT08Bh4eHCZycnAqGhoYEZWVlAF9fXwBbW1sAWFhYAFhYWAAhISEAMzMzAFJSUgGMjIwGpaWlBpWVlQJ/f38AfHx8AHp6egB3d3cAd3d3ACEhIQA0NDQAU1NTAXt7ewKRkZECkpKSAY2NjQCQkJAAjo6OAIyMjACMjIwAISEhADU1NQBSUlIBd3d3AYqKigGPj48AkpKSAJOTkwCRkZEAj4+PAI+PjwAhISEANDQ0AFNTUwGCgoIDmZmZA5OTkwGKiooAiIiIAIeHhwCFhYUAhYWFACEhIQAxMTEAUVFRAY+PjwimpqYIkZGRA3Z2dgBxcXEAb29vAG1tbQBtbW0AISEhAC4uLgBLS0sBfX19CIyMjAl1dXUDWFhYAFFRUQBPT08ATU1NAE1NTQAhISEAKioqADk5OQFVVVUEV1dXBEhISAE9PT0APT09AD09PQA8PDwAPDw8ACEhIQAlJSUAKioqADAwMAExMTEBMjIyADExMQAxMTEAMTExADExMQAxMTEAISEhACAgIAAdHR0AHx8fACEhIQAjIyMAJSUlACQkJAAjIyMAIyMjACMjIwAhISEAHBwcABYWFgAWFhYAGBgYABgYGAAYGBgAFhYWABYWFgAVFRUAFRUVACEhIQAZGRkAERERABAQEAAPDw8ADg4OAA0NDQAMDAwACwsLAAoKCgAKCgoAISEhABYWFgANDQ0ACwsLAAkJCQAHBwcABgYGAAUFBQAEBAQABAQEAAQEBAAhISEAFBQUAAoKCgAHBwcABQUFAAQEBAAEBAQABAQEAAQEBAAEBAQABAQEACEhIQASEhIACAgIAAQEBAAEBAQABAQEAAQEBAAEBAQABAQEAAQEBAAEBAQAISEhAA==",
  "glow|": "MTExAD8/PwBPT08AcnJyAa2trQbBwcEGqKioApmZmQCbm5sAnJycAJycnAAxMTEAPT09AE5OTgBqamoBlZWVA6urqwSenp4BlJSUAJWVlQCXl5cAl5eXADExMQA8PDwASUlJAFtbWwB0dHQBg4ODAYSEhACHh4cAiIiIAIqKigCKiooAMTExADo6OgBFRUUAT09PAFtbWwBlZWUAa2trAHFxcQBzc3MAdXV1AHV1dQAxMTEANzc3AD4+PgBFRUUATExMAFJSUgBYWFgAXFxcAF1dXQBeXl4AXl5eADExMQA0NDQANzc3ADo6OgA+Pj4AQUFBAERERABGRkYARkZGAEZGRgBGRkYAMTExADExMQAxMTEAMjIyADIyMgAyMjIAMjIyADIyMgAyMjIAMjIyADIyMgAxMTEANjY2ADs7OwA/Pz8AREREAElJSQBMTEwAT09PAFBQUABQUFAAUFBQADExMQA6OjoAREREAE9PTwBbW1sAZGRkAGxsbABzc3MAdnZ2AHd3dwB3d3cAMTExAD4+PgBPT08AX19fAHR0dACEhIQAj4+PAJeXlwCcnJwAnp6eAJ6engAxMTEAQUFBAFVVVQBycnIAmpqaAbW1tQK4uLgBuLi4ALy8vAC/v78Av7+/ADExMQBDQ0MAXFxcAIWFhQHPz88G4eHhCOTk5ALS0tIA1NTUANbW1gDW1tYAMTExAERERABeXl4AkJCQAt7e3gvc3NwN5OTkBN7e3gDd3d0A39/fAN/f3wAxMTEAQ0NDAFxcXACFhYUBz8/PBuHh4Qjk5OQC09PTANTU1ADW1tYA1tbWADExMQBBQUEAVVVVAHFxcQCampoCtra2Arm5uQG6uroAvb29AL+/vwC/v78AMTExAD4+PgBPT08AYGBgAHNzcwCDg4MAjo6OAJaWlgCcnJwAnp6eAJ6engAxMTEAOjo6AEVFRQBQUFAAWlpaAGRkZABsbGwAc3NzAHV1dQB3d3cAd3d3ADExMQA1NTUAOzs7AEBAQABEREQASUlJAE1NTQBOTk4AT09PAFBQUABQUFAAMTExADExMQAxMTEAMjIyADIyMgAyMjIAMjIyADIyMgAyMjIAMjIyADIyMgAxMTEANDQ0ADc3NwA7OzsAPj4+AEFBQQBDQ0MARUVFAEZGRgBGRkYARkZGADExMQA3NzcAPj4+AEZGRgBMTEwAU1NTAFhYWABcXFwAXFxcAF1dXQBdXV0AMTExADo6OgBFRUUAT09PAFxcXABmZmYAbGxsAHJycgB1dXUAdnZ2AHZ2dgAxMTEAPDw8AElJSQBbW1sAdHR0AYODgwGEhIQAhYWFAIeHhwCIiIgAiIiIADExMQA9PT0AT09PAGlpaQGVlZUDqqqqBJ6engGUlJQAlJSUAJWVlQCVlZUAMTExAA==",
  "twoPt|": "NDQ0ACsrKwAjIyMAGxsbABMTEwAMDAwABwcHAAYGBgAGBgYABgYGAAYGBgA0NDQALCwsACUlJQAdHR0AFhYWAA4ODgAJCQkABQUFAAQEBAAEBAQABAQEADQ0NAAuLi4AJycnACAgIAAYGBgAERERAAwMDAAHBwcABgYGAAUFBQAFBQUANDQ0ADExMQApKSkAIyMjAB0dHQAYGBgAEhISAA0NDQALCwsACQkJAAkJCQA0NDQANTU1ATAwMAAoKCgAJCQkACAgIAAbGxsAFBQUABISEgAQEBAAEBAQADQ0NAA7OzsBOzs7ATExMQAsLCwAKCgoACQkJAAeHh4AGxsbABoaGgAaGhoANDQ0AERERAJLS0sDQEBAATU1NQAwMDAALS0tACYmJgAjIyMAISEhACEhIQA0NDQAS0tLA15eXgdUVFQEPz8/ATc3NwAzMzMALS0tACoqKgAoKCgAKCgoADQ0NABQUFAEbm5uC2NjYwZHR0cBOzs7ADc3NwAwMDAALS0tACsrKwArKysANDQ0AFFRUQRxcXELZGRkB0dHRwE7OzsANzc3ADExMQAtLS0AKysrACsrKwA0NDQATU1NA2RkZAdUVFQEPz8/ATY2NgAzMzMALS0tACoqKgAoKCgAKCgoADQ0NABHR0cCUlJSA0VFRQE3NzcAMDAwAC0tLQAnJycAJSUlACMjIwAjIyMANDQ0AD8/PwFBQUEBOTk5ADExMQApKSkAJCQkAB4eHgAbGxsAGhoaABoaGgA0NDQAOTk5ATg4OAAyMjIALCwsACcnJwAgICAAGRkZABcXFwAVFRUAFRUVADQ0NAA1NTUAMjIyAC4uLgAoKCgAIiIiABwcHAAVFRUAEhISABAQEAAQEBAANDQ0ADIyMgAuLi4AKSkpACMjIwAdHR0AFxcXABAQEAANDQ0ADAwMAAwMDAA0NDQAMDAwACwsLAAnJycAICAgABgYGAASEhIADAwMAAoKCgAKCgoACgoKADQ0NAAuLi4AKioqACcnJwEeHh4AFRUVAA4ODgAMDAwADAwMAAwMDAAMDAwANDQ0AC0tLQArKysAKSkpAR4eHgETExMADQ0NAA0NDQANDQ0ADQ0NAA0NDQA0NDQAKysrACkpKQEoKCgCHh4eARISEgEODg4ADg4OAA4ODgAODg4ADg4OADQ0NAArKysAJiYmACMjIwEZGRkBEBAQAA0NDQANDQ0ADQ0NAA0NDQANDQ0ANDQ0ACoqKgAjIyMAHx8fARQUFAAODg4ADAwMAAwMDAAMDAwADAwMAAwMDAA0NDQAKioqACIiIgAaGhoAERERAAwMDAAKCgoACgoKAAoKCgAKCgoACgoKADQ0NAAqKioAIiIiABoaGgASEhIADAwMAAgICAAICAgACAgIAAgICAAICAgANDQ0AA==",
  "freezing|": "FRslAAwQFgAMERUAEBkfASE4SgcwVHQPME9tCCY8UQElOU4AJjpQACY6UAAVGyUADhIYAA0RFwAPFhwAFSIsAhwwPwQfMUIDHS49AB4uPgAeLz8AHi8/ABYbJQAQFBwADhMZAA8UGwAQFyAAERojAREaIwESHCYAFB8pABUhKwAVISsAFhslABIXIQAQFB0AEhYgABEWIQAQFSAADxQeAA8VHgAPFh8ADxYfAA8WHwAWGyYAFhsmABUZJgAUGCMAFRgmABQXJgATFiMAExckABMXJAATFyMAExcjABYbJgAZHy0AHSIzAB4jNQAdIDUAGx0xABcYKwAUFSQAFBUlABQVJQAUFSUAFhsmAB0jNAAkK0AAKzFMAC0zUgAsMlMAKi5OACYoRwAjJUIAIyRBACMkQQAWGyYAHyY4ACszTwA5Q2gAQk17AURNfgBBRngAOz9uADk8agA2OmcANjpnABYbJgAhKTwAMjpbAExajQFhb7MCYm62AlZgogBPVpMATFKNAElOhwBJTocAFhsmACMqPQA3QmUAWGiiAneL3QV4it4DZHK6AVtlqgBXYaMAVF2dAFRdnQAWGyYAIyo+ADdBYgBWZp4CcobSA3OH1AJlcrwAXGirAFpkpwBXYaIAV2GiABYbJgAiKjwAMz5bAEdWgQFZaaIBXW2rAVdnogBSYJkAUV2VAE9bkgBPW5IAFhsmACAoOQAsNk8AOUVnAEJQdwBEVH0ARFJ8AEJMdgA+SHAAPEZtADxGbQAWGyYAHSUzACYvQwAsN04AMDtWADE8WAAwOlUAKzRNACkySgAoMEYAKDBGABYbJgAaIS4AHiY1ACApOQAhKTgAHyc1ABsjMAAXHSgAFRskABMZIQATGSEAFhsmABcdKAAXHigAFhwmABMZIAAQFRsADBEVAAkMDgAHCgsABggKAAYICgAWGyYAExkhABAWHQANEhYACg0QAAcKCgAFBwcABAYGAAMFBQADBAQAAwQEABUbJQARFR0ACw8TAAgMDQAGCQkABQcHAAQGBgADBQUAAwQEAAMEBAADBAQAFRslAA4SGAAJDA4ABggJAAUHBwAFBwcABQcIAAUHCAAFBwgABQcIAAUHCAAVGyUADRAVAAcKCwAGCQoACAwNAAkOEAALEBMACxEUAAsRFQALERUACxEVABYbJQAMDxMACAsNAAkNDwAMExYAEBgdABIcIgATHiYAEx4mABMeJgATHiYAFRslAAsOEgAJDQ8ACxIUABMeJAEaKjUBHi89ARwsOAAcKzgAGyo4ABsqOAAVGyUACw8TAAoOEgAOFhsAHjE+BCxKYwguS2YFIzhLASE1RwAiNUgAIjVIABUbJQAMDxQACxAUAA8ZHgEkPFEIOGKKEzdfggsoP1UBJzxRACc7UQAnO1EAFhsmAA==",
  "contrasting|": "MTExADExMQAzMzMARkZGAmlpaQxpaWkLSUlJAzU1NQAxMTEAMTExADExMQAxMTEAMTExADMzMwBAQEABWVlZBltbWwdCQkICNDQ0ADIyMgAxMTEAMTExADExMQAxMTEAMjIyADY2NgBBQUECQkJCAjg4OAEyMjIAMjIyADExMQAxMTEAMTExADExMQAxMTEAMjIyADQ0NAA0NDQAMzMzADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMjIyADQ0NAA0NDQAMzMzADExMQAxMTEAMTExADExMQAxMTEAMTExADIyMgA3NzcAQEBAAUJCQgI5OTkBMjIyADIyMgAxMTEAMTExADExMQAxMTEAMjIyAD4+PgFYWFgGXV1dCEdHRwI0NDQAMjIyADExMQAxMTEAMTExADExMQAzMzMAQkJCAmdnZwtsbGwNTk5OBDY2NgAyMjIAMTExADExMQAxMTEAMTExADMzMwA+Pj4BV1dXBl5eXghGRkYCNDQ0ADIyMgAxMTEAMTExADExMQAxMTEAMjIyADY2NgBAQEACQkJCAjk5OQEyMjIAMjIyADExMQAxMTEAMTExADExMQAxMTEAMjIyADQ0NAA0NDQAMzMzADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMjIyADQ0NAA0NDQAMzMzADExMQAxMTEAMTExADExMQAxMTEAMTExADIyMgA3NzcBQEBAAkJCQgI5OTkBMjIyADIyMgAxMTEAMTExADExMQAxMTEAMjIyAD8/PwFZWVkGXFxcB0NDQwIzMzMAMjIyADExMQAxMTEAMTExAA==",
  "flood|": "JCQkAA8PDwAICAgABgYGAAYGBgAFBQUABQUFAAQEBAADAwMAAwMDAAMDAwAjIyMAEBAQAAgICAAEBAQABAQEAAMDAwACAgIAAgICAAEBAQABAQEAAQEBACQkJAAREREACgoKAAUFBQACAgIAAQEBAAEBAQABAQEAAQEBAAEBAQABAQEAJCQkABMTEwAMDAwACAgIAAQEBAADAwMAAgICAAEBAQABAQEAAQEBAAEBAQAkJCQAFhYWAA8PDwALCwsACgoKAAkJCQAICAgABgYGAAUFBQAFBQUABQUFACQkJAAbGxsAExMTABEREQASEhIAExMTABMTEwAREREAERERABAQEAAQEBAAJCQkACEhIQAdHR0AHBwcAB4eHgAgICAAIiIiACEhIQAhISEAICAgACAgIAAkJCQAKCgoAC4uLgA5OTkBQEBAAUBAQAA+Pj4APDw8ADs7OwA5OTkAOTk5ACQkJAAvLy8ARUVFAW5ubgWGhoYFgYGBAnd3dwB3d3cAdnZ2AHR0dAB0dHQAJCQkADY2NgBgYGACra2tC9zc3A3W1tYFtbW1ALW1tQC3t7cAtra2ALa2tgAkJCQAPDw8AHBwcALZ2dkO2dnZEOLi4gbn5+cB6OjoAOjo6ADo6OgA6OjoACQkJABBQUEAeXl5Ad7e3gnb29sO4uLiBufn5wHo6OgA6OjoAOjo6ADo6OgAJCQkAEJCQgB4eHgB39/fCNnZ2RDg4OAI5+fnAejo6ADo6OgA6OjoAOjo6AAkJCQAQEBAAHNzcwHZ2dkG2NjYEd3d3Qvm5uYC6OjoAOjo6ADo6OgA6OjoACQkJAA9PT0AZmZmALKysgPg4OAJ4uLiBubm5gHU1NQA0dHRAM7OzgDOzs4AJCQkADk5OQBYWFgAgYGBAaampgKtra0Bo6OjAJubmwCXl5cAlJSUAJSUlAAkJCQAMzMzAEhISABgYGABaWlpAWpqagBmZmYAXl5eAF5eXgBdXV0AXV1dACQkJAAsLCwAOzs7AUtLSwJKSkoBRkZGAEdHRwBISEgASEhIAEdHRwBHR0cAJCQkACUlJQAuLi4BOzs7BD09PQM0NDQBLy8vAC4uLgAsLCwALCwsACwsLAAkJCQAHx8fACAgIAEsLCwFKysrAyEhIQEaGhoAGBgYABcXFwAXFxcAFxcXACQkJAAZGRkAFBQUARgYGAIYGBgCFRUVABQUFAAUFBQAExMTABMTEwATExMAJCQkABUVFQANDQ0AEBAQAREREQAQEBAAEBAQABAQEAAPDw8ADw8PAA8PDwAkJCQAERERAAoKCgALCwsADAwMAAwMDAAMDAwADAwMAAsLCwALCwsACwsLACQkJAAPDw8ACQkJAAkJCQAJCQkACAgIAAgICAAICAgABwcHAAcHBwAHBwcAJCQkAA==",
  "chilly|": "MTE2ACEhJAAXFxkAEBESAA4PEAAOEBAADQ4QAAoMDQAJCwwACQoLAAkKCwAxMTYAJCQoABoZHAATExUADQ0OAAkKCgAICQkABgcIAAYHBwAGBwcABgcHADExNgApKS4AHx8jABcXGQAQEBEACgoLAAYGBgADBAQAAwMEAAMEBAADBAQAMTE2AC4uMwAnJiwAICAkABcXGgAQEBMACgoLAAYGBwAEBAUABAQEAAQEBAAxMTYAMzM5ADIyOQAuLTUAJyctACAfJAAYGBwAERETAA8PEgAODhAADg4QADExNwA5OEAAPT1GAD8/SQA8PEYANjY/AC4uNwAlJS0AJCQrACMjKQAjIykAMTE3AD4+RgBISFMAUU9dAFRUYQBQUF8ASkpZAEFBTgA9PUkAPDxIADw8SAAxMTcAQkJLAFRTYABkZHUAbG1/AG1tgABmZXkAW1tuAFdXaQBWVWcAVlVnADExNgBFRE0AW1tqAHd4iwGKi6MBiomlAX9+lwBwcIcAa2uBAGhofgBoaH4AMTE2AEdHTwBjYnEAg4OWAZ6dtwKenrsBjIypAIB+mAB4eJAAcnKKAHJyigAxMTYAR0ZPAF9fbgCBgZQBmJmxAZiYswGKi6UAfX2VAHd3jwBycokAcnKJADExNwBFQ00AWlpnAHBwgQCAgJUBg4OZAHp6kABvb4UAa2uBAGdnfQBnZ30AMTE3AEFBSgBRUVsAXl5uAGZmdgBmZnYAYWFxAFlZaABRUV8ATk5cAE5OXAAxMTcAPT1FAEdHUABOTlgAUFBbAExMWABGRlEAPT1GADk5QgA2Nj4ANjY+ADExNgA3Nz4AOztDAD08RAA6OUAANDM5ACwrMQAiIiYAHx8iABwcHgAcHB4AMTE2ADMxOAAwMDUALSwxACYmKQAfHyEAFxcYABAQEQAMDAwACgoKAAoKCgAxMTYALS0yACcnKgAfHyEAFhYYAA8PEAAKCwsACQkJAAgICAAICAgACAgIADExNgApKCwAHh4gABYWFwASEhIADw8QAA8PDwANDQ4ADA0NAAwMDQAMDA0AMTE2ACQkJwAZGhsAExMUABITEwATFBUAExQVABESEwAQERIAEBERABAREQAxMTYAISElABcXGQATExQAFRYWABcYGQAWGBoAFBYXABMVFgATFBYAExQWADExNgAgHyMAFhYXABQUFQAZGxwBHSAiARwfIAEWGRsAFBcZABQWGAAUFhgAMTE2AB8fIQAVFhYAFBUWABwfIQEiJyoDHyMmAhcaHAAUFxkAExYXABMWFwAxMTYAHx8iABYWFwATFBQAGx0gAiAkJwMcICQCFBYYABIUFgARExUAERMVADExNgAgHyIAFhYYABAREQAUFhcBFxocARUYGQEQERMADhASAA4PEQAODxEAMTE2AA==",
  "morning|": "JSMcABUUEAAREAwAEhAMACMdFAQyKhwHLSUaBCIcFAEhHBQAIRwUACEcFAAlIxwAGBYSABMRDgASEQ0AFxMOARwYEAIcGBECGRYQABoWEAAbFhAAGxYQACUjHAAcGhUAFxURABQSDwATEQ4AEhAMABANCgAQDgoAEQ8LABIQDAASEAwAJSMcACAfGQAcGhYAGxkVABgWEgAVEw8AEg8NABAOCwAQDgsADw0KAA8NCgAmIxwAJiQeACYjHAAjIRwAIh8bACAdGQAcGRYAGhgUABoXFAAZFhMAGRYTACYjHAAtKiIAMy8nADUyKgA1MSkAMSwnACsmIgAkIR4AJCEdACQhHQAkIR0AJiMcADIwJwBAPTIATEg8AFJNQQBTTEIATkg/AEdBOgBCPDYAQTs1AEE7NQAmIxwAODUrAE9JPABpYlEBe3JhAYB1ZAF5bmAAbmZYAGphVQBnXlMAZ15TACYjHAA8OC4AW1RGAI2BbQKzposDtqeOAqKVfwCUiHUAj4NyAIh+bgCIfm4AJiMcAD05MABlXk0Aopd9A97Mqwbgz60EvK2VAaudhgCkl4EAnpJ9AJ6SfQAmIxwAPTowAGFbSwCeknoC1cOkBNTGpgO7rZEBrJ+HAKeagwCilYAAopWAACYjHAA8OC4AW1RHAIF4ZAGimH0BrKCGAaKXfwCZj3cAlYl0AJKGcgCShnIAJiMcADk2KwBPSjwAZmFOAHduXAB9dGEAfHNgAHZuXABwaFcAbWVVAG1lVQAmIxwAMzAnAEM/MwBOSjwAVlFCAFhTRABVUEEATUk8AEpGOQBGQjcARkI3ACYjHAAuKyIANTEoADk1LAA4NSsANTMoADAtJAAoJR4AJCIbACEfGQAhHxkAJiMcACglHgAoJR4AJiMcACAfGAAbGhQAFRQPAA4OCgALCwgACgkHAAoJBwAmIxwAISAZABwbFQAWFRAAEA8LAAoKBwAHBwUABgYEAAUFBAAEBAMABAQDACUjHAAdGxYAExIOAA0NCQAJCQcABwcFAAYGBAAFBAMABAQDAAQEAwAEBAMAJSMcABgXEgAODgsACQgGAAcHBQAHBgUABwYFAAYGBAAGBQQABgUEAAYFBAAlIxwAFRQQAAsLCAAICAYACgkHAAsLCAAMDAgADAsIAAwLCAAMCggADAoIACUjHAATEg8ACwsIAAsKBwAODQoAERALABMRDQATEAwAEhAMABIQDAASEAwAJSMcABIRDgANDAkADQwJABUSDQEbGBEBHRkSARoXEQAZFRAAGBUPABgVDwAlIxwAExIOAA4NCgAQDwsAHxsTAi0nGwQsJhsDIBsUAB4ZEwAeGRMAHhkTACUiHAATEg8ADw4LABEPCwAnIRcEOzIhCTYtHwUjHhYBIR0VACEdFQAhHRUAJiMcAA==",
  "sunrise|": "Ix0VABQRDAAWEwwAHBcOACYeEgA1KBcAQTEbAFM+IQBeRiUAYkknAGJJJwAjHRUAFhMOABcTDQAcFw4AIhoPACkgEgA0JxUARTMcAEs3HgBPOh8ATzofACMdFQAaFhAAGBUOABwXDwAfGQ8AIhoPACUbDwAvIhMAMyUVADcoFgA3KBYAIx4WAB4aEgAbFxAAHxkRACEaEQAhGhAAIRkPACMaDwAkGxAAJBsQACQbEAAjHhYAIx4WACIdFQAgGxQAIx0UACMcFAAjGxIAJBsTACUcEwAlHBMAJRwTACMeFgApIxkALicbADAoHgAwJxwALCQaACYeFwAhGhQAIRsUACEbFAAhGxQAIx4WAC8oHAA7MiMARjopAEw+LABLPSwARzgpAD8yJQA6LiIAOS0iADktIgAjHhYAMywfAEk9KgBgTzcBcFxBAXNdQgFrVz4AZE85AF9MNwBcSTUAXEk1ACMeFgA3LyEAU0YxAIFsSwKmiV4DpohfApJ3VACFa00AgGVKAHthRwB7YUcAIx4WADgwIgBcTTYAlX1VA8qqcwXMqXUEqopjAZp9WQCTeFUAjnNSAI5zUgAjHhYAOTEiAFlNNQCSelUCw6NwBMWibwKqjGIAnIBbAJd7VwCTd1UAk3dVACMeFgA3MCEAVEcyAHhlRwGVfVYBnoRbAZV8VwCMclIAiW9PAIZtTQCGbU0AIx4WADQtIABJPisAX1A3AG9dQQB1YkQAcmBDAG1bQABmVTwAZFM6AGRTOgAjHhYAMCodAD81JQBJPysAUEQvAFJGMQBQQzAARz0rAEU6KQBCOCcAQjgnACMeFgAqJRoAMSseADUvIAA1LiAAMisfAC0nGwAlIRYAIh4VAB8bEwAfGxMAIx4WACUhFgAlIRcAIx8WAB8bEwAaFxAAFBIMAA4MCQALCgcACQkGAAkJBgAjHhYAIBwTABoYEAAVEw0ADw4JAAoKBgAHBwUABgYEAAUFAwAEBAMABAQDACMdFQAaGBEAEhELAA0MCAAJCQYABwcFAAYGBAAFBQMABAQDAAQEAwAEBAMAIx0VABcUDgAODQkACAgGAAcHBQAHBwUACAgFAAgIBQAICAUACAgFAAgIBQAjHRUAExIMAAsKBwAKCQYADg0IABIQCgAWEgsAGBMMABgUDAAYFAwAGBQMACMdFgASEAsADAsIABAOCQAYFQwAIBsPACgfEgAtIxMALiQUAC8kFAAvJBQAIx0VABEPCwAPDgkAFRMLACEcEAAtJBUAOCwZAEExGwBEMxwARjQcAEY0HAAjHRUAEhALABIQCgAaFg0AKSATADcrGQBFNR0AUDsgAFQ+IgBZQiMAWUIjACIdFQATEAsAFRILABsWDQAqIRMAOiwZAEg2HgBXQSIAXkYlAGNJJwBjSScAIx4WAA==",
  "sunset|": "JBYNABUPCQAQDgcADgwGAA4MBQAPDQUAEA0FABAOBQARDgUAEg8FABIPBQAkFg0AGBEKABEOCAAQDQcADQwFAAwKBAAMCgQADAoEAAwKBAAMCgQADAoEACQXDQAcEwsAFQ8JABEOCAAPDAYADAoFAAkIAwAHBgIABwYCAAcGAgAHBgIAJBcNACEVDQAdEwsAGRAJABUOCAARCwYADAkFAAgGAwAGBQIABQQCAAUEAgAkFw0AJxgOACkXDgAnFg4AIxMMAB0PCgAXCwcAEAgFAA0GBAAMBQMADAUDACQXDQAtGhAANR0SADseEwA8HBIAORkQADQWDgArEQsAJw8KACUNCQAlDQkAJBcNADMdEQBDIhUAUSYYAFsnGQBcJRgAWSIWAFEcEwBKGREARhcQAEYXEAAkFw0AOB4SAFAmFwBsLRwAgDEgAIYxIAB+Lh4AdykbAHMmGQBvJBgAbyQYACQXDQA6IBMAWyoaAIw2IQC2PCcBuD0nAKM4JQCVMiEAjy8gAIstHgCLLR4AJBcNADsgFABiLBsAnzkkANtELAHbRS0BtT8oAKY4JQCgNCIAmjEhAJoxIQAkFw0AOyAUAF4rGgCZOCMAzUEqAcpCKgCuPCcAnzYkAJozIgCVMSEAlTEhACQXDQA4HxMAVCkZAHkyHwCVOCMAmzgkAJE0IgCGLx8Agy0eAIAsHQCALB0AJBcNADUeEQBIJRYAXCoaAGktHABtLBwAaioaAGMlFwBcIRUAWiAUAFogFAAkFw0AMBwQADwgEwBFIhUASCMVAEggFABEHRIAPRgPADoXDgA3FQ0ANxUNACQXDQAqGQ8ALhsQADAbEAAtGA8AKRUNACQRCwAcDQgAGQsHABYKBgAWCgYAJBcNACQXDQAiFg0AHxMLABkQCQATDAcADQgFAAgFAwAGBAIABAMCAAQDAgAkFw0AHxQMABgRCgARDQcACwkFAAYGAwADAwIAAgIBAAICAQABAQEAAQEBACQXDQAaEgsAEA0IAAoJBQAGBgMABAQCAAQEAgADAwIAAwIBAAICAQACAgEAJBcNABYQCQAMCwYACAgEAAgHBAAIBwMABwcDAAcGAwAGBQIABgUCAAYFAgAkFw0AFA8JAAwLBgAJCQQACwoEAAsKBAAMCgQACwkEAAoJAwAKCQMACgkDACQXDQASDggADAsGAAwKBQAODAUADw0FABANBQAPDQUADwwEAA8MBAAPDAQAJBcNABIOCAANCwYADQwFABAOBgARDwYAExAGABMPBQATDwUAFBAGABQQBgAkFw0AEg8IAA4MBgAODAUAEA4GABMQBgAUEQYAFREGABYSBgAXEwYAFxMGACQWDQATDwkADw0HAA0MBQAQDgYAEg8GABMQBgAUEAUAFBEGABURBgAVEQYAJBcNAA==",
  "threePt|dkEdge": "NjY2ADExMQApKSkAHx8fABMTEwAKCgoABAQEAAEBAQABAQEAAQEBAAEBAQA2NjYAMDAwACYmJgAcHBwAERERAAgICAADAwMAAgICAAEBAQABAQEAAQEBADY2NgAvLy8AJSUlABoaGgAPDw8ACAgIAAQEBAADAwMAAgICAAEBAQABAQEANjY2AC8vLwAkJCQAGhoaAA4ODgAICAgABgYGAAMDAwACAgIAAgICAAICAgA2NjYALy8vACgoKAA2NjYIFhYWAggICAAGBgYABQUFAAQEBAADAwMAAwMDADY2NgAuLi4ALCwsAWNjYyYlJSUKCAgIAAcHBwAICAgABwcHAQYGBgEGBgYBNjY2AC4uLgAnJycALy8vBBQUFAEJCQkACQkJABYWFgcTExMHDAwMBAwMDAQ2NjYAMDAwACYmJgAdHR0AERERAAsLCwANDQ0BSEhIVUBAQFQqKiouKioqLjY2NgAxMTEAKSkpAB8fHwATExMADAwMAA4ODgJVVVWbQUFBfiMjIy0jIyMtNjY2ADMzMwAsLCwAIyMjABcXFwAODg4ACwsLASAgIBweHh4hEBAQDhAQEA42NjYANDQ0ADAwMAAnJycAGxsbABEREQAKCgoACQkJAQgICAIGBgYCBgYGAjY2NgA2NjYAMjIyACsrKwAhISEAFRUVAAsLCwAGBgYABQUFAAQEBAAEBAQANjY2ADg4OAA2NjYALy8vACUlJQAYGBgADg4OAAcHBwAEBAQABAQEAAQEBAA2NjYAOTk5ADg4OAAzMzMAKSkpAB0dHQAUFBQACgoKAAcHBwAGBgYABgYGADY2NgA7OzsAQEBAADc3NwAvLy8AJiYmABsbGwAODg4ACQkJAAcHBwAHBwcANjY2AD8/PwB7e3sMUVFRAzU1NQAtLS0AISEhABISEgALCwsACAgIAAgICAA2NjYARUVFAY2NjWSurq4mPT09AS8vLwAjIyMAExMTAA0NDQAJCQkACQkJADY2NgBFRUUBg4ODb7GxsSg+Pj4BLy8vACMjIwATExMADg4OAAsLCwALCwsANjY2AD8/PwB2dnYLS0tLAjU1NQArKysAHx8fABEREQAKCgoACAgIAAgICAA2NjYAOzs7AD4+PgE0NDQALi4uACUlJQAaGhoADQ0NAAoKCgAICAgACAgIADY2NgA4ODgANTU1ADAwMAAmJiYAHR0dABMTEwAJCQkABgYGAAQEBAAEBAQANjY2ADY2NgAyMjIALCwsAB8fHwAVFRUADAwMAAYGBgADAwMAAgICAAICAgA2NjYANDQ0AC8vLwAnJycAGxsbABAQEAAICAgAAwMDAAEBAQABAQEAAQEBADY2NgAzMzMALCwsACMjIwAXFxcADQ0NAAYGBgACAgIAAQEBAAEBAQABAQEANjY2AA==",
  "threePt|softmetal": "QkJCATQ0NAApKSkAICAgABUVFQAMDAwABgYGAAMDAwACAgIAAgICAAICAgBCQkIBMzMzACgoKAAeHh4AExMTAAoKCgAFBQUABQUFAAQEBAAFBQUABQUFAEJCQgEyMjIALS0tACMjIwETExMACgoKAAcHBwAICAgACAgIAAoKCgEKCgoBQkJCATMzMwA3NzcBNTU1AxoaGgENDQ0ACgoKAA0NDQEREREBFRUVARUVFQFCQkIBNDQ0AEVFRQNUVFQIKSkpBBEREQEODg4AICAgAisrKwMxMTEEMTExBEJCQgE2NjYATk5OA2dnZws1NTUGFxcXAhoaGgJLS0sIWlpaCl5eXgpeXl4KQkJCATU1NQBEREQCU1NTBykpKQMaGhoCNTU1BpSUlBakpKQXmJiYEpiYmBJCQkIBNTU1ADk5OQE2NjYCISEhARwcHAJNTU0LwsLCKcPDwynDw8Mhw8PDIUJCQgE1NTUAMDAwACcnJwAaGhoAHR0dAkxMTA28vLwwv7+/LLm5uSC5ubkgQkJCATY2NgAuLi4AJSUlABsbGwAcHBwBPT09CI+PjyCcnJwhjIyMGYyMjBlCQkIBOjo6ADAwMAAoKCgAHx8fABsbGwAmJiYDV1dXDl5eXhBYWFgPWFhYD0JCQgFBQUEANjY2ACwsLAAkJCQAHBwcABkZGQEqKioEMTExBTQ0NAY0NDQGQkJCAU5OTgFFRUUBNDQ0ACkpKQAfHx8AGRkZABkZGQEeHh4CICAgAiAgIAJCQkIBX19fAmZmZgNISEgBMjIyACcnJwAiIiIAHh4eAB4eHgAeHh4BHh4eAUJCQgF5eXkFsLCwDHt7ewVGRkYBMzMzAC4uLgAnJycAJSUlACQkJAAkJCQAQkJCAZGRkQfKysoh1NTUFWpqagM/Pz8ANzc3ADAwMAAtLS0AKysrACsrKwBCQkIBo6OjCra2tjbCwsIpiYmJBkhISAA8PDwANTU1ADIyMgAvLy8ALy8vAEJCQgGlpaULtbW1OMLCwimRkZEGSEhIADw8PAA2NjYAMjIyADAwMAAwMDAAQkJCAZaWlgnLy8sg0tLSE2RkZAI+Pj4ANzc3ADAwMAAqKioAKSkpACkpKQBCQkIBe3t7Baurqwx1dXUFQ0NDATIyMgAuLi4AJiYmACMjIwAhISEAISEhAEJCQgFfX18CY2NjA0JCQgEvLy8AJiYmACIiIgAaGhoAFxcXABUVFQAVFRUAQkJCAUxMTAFAQEABMDAwACMjIwAcHBwAFhYWAA8PDwAMDAwACwsLAAsLCwBCQkIBPz8/ATMzMwAoKCgAHx8fABYWFgANDQ0ABwcHAAUFBQAEBAQABAQEAEJCQgE3NzcALCwsACQkJAAbGxsAERERAAkJCQAEBAQAAgICAAICAgACAgIAQkJCAQ==",
  "brightRoom|": "MTExADw8PABJSUkAWlpaAG1tbQCFhYUAm5ubALOzswDDw8MAysrKAMrKygAxMTEAOzs7AEhISABWVlYAa2trAIGBgQCYmJgAsbGxALu7uwDCwsIAwsLCADExMQA7OzsARkZGAFRUVABmZmYAenp6AI6OjgCoqKgAs7OzALy8vAC8vLwAMTExADo6OgBGRkYAUVFRAF5eXgBubm4AgYGBAJaWlgCioqIAq6urAKurqwAxMTEAOjo6AEpKSgFVVVUBWlpaAGJiYgBwcHAAhISEAIyMjACTk5MAk5OTADExMQA6OjoBVVVVA2dnZwVdXV0CWFhYAGBgYABtbW0Ac3NzAHh4eAB4eHgAMTExADo6OgFbW1sGenp6DWJiYgRPT08BUFBQAFtbWwBiYmIAZmZmAGZmZgAxMTEAQEBAAXBwcAifn58Si4uLB3FxcQFycnIAg4ODAIqKigCPj48Aj4+PADExMQBDQ0MBc3NzBaKiogqYmJgEjo6OAZmZmQCysrIAvLy8AMXFxQDFxcUAMTExAERERABubm4Cj4+PA5iYmAGmpqYAwMDAAODg4ADo6OgA6OjoAOjo6AAxMTEARUVFAGRkZAGCgoIBnp6eALy8vADg4OAA6OjoAOjo6ADo6OgA6OjoADExMQBGRkYAYGBgAH9/fwCjo6MAzc3NAOjo6ADo6OgA6OjoAOjo6ADo6OgAMTExAEVFRQBgYGAAgYGBAKqqqgDV1dUA6OjoAOjo6ADo6OgA6OjoAOjo6AAxMTEAREREAF5eXgB9fX0AoqKiAM3NzQDo6OgA6OjoAOjo6ADo6OgA6OjoADExMQBBQUEAWFhYAHV1dQCWlpYAurq6AN/f3wDo6OgA6OjoAOjo6ADo6OgAMTExAD4+PgBTU1MAZ2dnAISEhACgoKAAv7+/AN3d3QDn5+cA6OjoAOjo6AAxMTEAOzs7AEdHRwBaWloAbW1tAIGBgQCYmJgAsbGxALu7uwDCwsIAwsLCADExMQA3NzcAPj4+AEhISABUVFQAYmJiAHFxcQCCgoIAiIiIAIyMjACMjIwAMTExADExMQA0NDQAOTk5AD4+PgBHR0cAT09PAFtbWwBiYmIAZWVlAGVlZQAxMTEANDQ0ADk5OQBAQEAASUlJAFRUVABeXl4Abm5uAHNzcwB3d3cAd3d3ADExMQA3NzcAPj4+AEdHRwBUVFQAYmJiAHBwcACCgoIAioqKAI+PjwCPj48AMTExADg4OABDQ0MATk5OAF5eXgBubm4AgICAAJSUlAChoaEAqKioAKioqAAxMTEAOjo6AEVFRQBUVFQAZmZmAHl5eQCNjY0ApqamALCwsAC4uLgAuLi4ADExMQA7OzsAR0dHAFdXVwBqamoAgICAAJeXlwCwsLAAubm5AMDAwADAwMAAMTExAA==",
  "flat|": "MTExADExMQAxMTEAMjIyAEhPVASAprsrdnZ2fYumsDthcoEPUVxkB1FcZAcxMTEAMTExADExMQAyMjIAQERHAm6InhmXn59QeZyxJWN2hhBTXmcIU15nCDExMQAxMTEAMTExADExMQA3OToBTVZdBmh+kRRba3gMTVVcBUJHSwJCR0sCMTExADExMQAxMTEAMTExADMzMwA4OjsBQkdLAkRJTQM+QUQCOTs9ATk7PQExMTEAMTExADExMQAxMTEAMTExADIyMwA0NDUANjc4ATU2NwA1NjYANTY2ADExMQAxMTEAMTExADIyMgAxMTEAMTExADExMQAyMjIAMjIyADIyMgAyMjIAMTExADExMQAzMzMAOTk5ATs7OwE3NzcAMjIyADExMQAxMTEAMTExADExMQAxMTEAMjIyADo6OgFbW1sHbm5uDVpaWgc6OjoBMTExADExMQAxMTEAMTExADExMQAyMjIARkZGAqmpqS2JiYlorKysMUxMTAMyMjIAMjIyADExMQAxMTEAMTExADMzMwBTU1MFlpaWWQwMDPJwcHCDXV1dCDQ0NAAyMjIAMTExADExMQAxMTEAMzMzAEpKSgOqqqpETk5OqpqamlZXV1cGMzMzADIyMgAxMTEAMTExADExMQAyMjIAPz8/AXNzcw+ampoje3t7EkNDQwIyMjIAMjIyADExMQAxMTEAMTExADExMQA1NTUAQkJCAkdHRwI/Pz8BNDQ0ADExMQAxMTEAMTExADExMQAxMTEAMTExADIyMgAzMzMAMzMzADIyMgAxMTEAMTExADExMQAxMTEAMTExADExMQAxMTEAMjIyADMzMwAzMzMAMjIyADExMQAxMTEAMTExADExMQAxMTEAMTExADExMQA0NDQAOTk5ATo6OgE3NzcAMjIyADExMQAxMTEAMTExADExMQAxMTEAMTExADc3NwFISEgDTk5OBENDQwI1NTUAMTExADExMQAxMTEAMTExADExMQAyMjIAOzs7AVZWVgZhYWEJT09PBDc3NwAxMTEAMTExADExMQAxMTEAMTExADIyMgA6OjoBVFRUBVxcXAdKSkoDNjY2ADExMQAxMTEAMTExADExMQAxMTEAMTExADc3NwBEREQCSEhIAz4+PgE0NDQAMjIzADIyMwAyMjMAMjIzADExMQAxMTEAMzMzADc3NwA3ODgBNTU2ADQ1NQA2NzgBNjc3ATU2NwA1NjcAMTExADExMQAxMTEAMjIyADMzMwA3ODoBQUZKAkRJTgM/Q0YCOz1AATs9QAExMTEAMTExADExMQAxMTEANzg6AUxUWwVnfI8TXW98DlBaYgdGS1EDRktRAzExMQAxMTEAMTExADIyMgBAREgCbISZF5egoE59obQoZ32PFFdlcQpXZXEKMTExAA=="
};
var decoded = /* @__PURE__ */ new Map();
function table(key) {
  let t = decoded.get(key);
  if (t) return t;
  const s = TABLES[key];
  if (!s) return void 0;
  if (typeof atob === "function") {
    const b = atob(s);
    t = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) t[i] = b.charCodeAt(i);
  } else t = new Uint8Array(globalThis.Buffer.from(s, "base64"));
  decoded.set(key, t);
  return t;
}
function lightTable(rig, mat) {
  const r = rig && TABLES[`${rig}|`] ? rig : "threePt";
  const m = mat && mat !== "warmMatte" && TABLES[`${r}|${mat}`] ? mat : "";
  return table(`${r}|${m}`);
}
function lightAt(t, dir, thetaDeg, phiDeg, out) {
  const th = ((thetaDeg + (DIR[dir ?? "t"] ?? 0)) % 360 + 360) % 360;
  const ti = th / 15, t0 = Math.floor(ti) % 24, t1 = (t0 + 1) % 24, ft = ti - Math.floor(ti);
  const ph = Math.max(0, Math.min(85, phiDeg));
  let p0 = 0;
  while (p0 < PH.length - 2 && PH[p0 + 1] <= ph) p0++;
  const fp = Math.max(0, Math.min(1, (ph - PH[p0]) / (PH[p0 + 1] - PH[p0])));
  for (let c = 0; c < 4; c++) {
    const v = (ti2, pi2) => t[(ti2 * PH.length + pi2) * 4 + c];
    const a = v(t0, p0) * (1 - fp) + v(t0, p0 + 1) * fp, b = v(t1, p0) * (1 - fp) + v(t1, p0 + 1) * fp;
    const q = a * (1 - ft) + b * ft;
    out[c] = c < 3 ? q * 0.02 : q / 255;
  }
}
function lightFace(t, out) {
  const o = 24 * PH.length * 4;
  for (let c = 0; c < 4; c++) out[c] = c < 3 ? t[o + c] * 0.02 : t[o + c] / 255;
}
var PROFILES = {
  relaxedInset: [81, 73, 67.5, 61.5, 54.5, 50, 48, 42.5, 38, 34, 30.5, -40.5, -50, -50, -50, -48.5, -44.5, -40, -36, -28, -20, -14, -7, -1.5],
  softRound: [80, 80, 68, -39, -53, -60.5, -60.5, -57, -52, -50, -49, -45.5, -39.5, -36, -32.5, -30.5, -26.5, -17.5, -18, -15, -10.5, -6.5, -3.5, -0.5],
  convex: [4, 4, 4, 10.5, 16, 20, 23.5, 28.5, 32, 34.5, 37.5, 40, 43.5, 46.5, 49, 50, 50.5, 53.5, 58.5, 62.5, 69, 67, 39.5, 1],
  coolSlant: [73.5, 69.5, 68, 67, 66.5, 66, 63, 51.5, 45, 33.5, 26.5, 11, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};
function bevelPhi(prst, t, hw) {
  const u = Math.max(1e-3, Math.min(1, t));
  const tab = prst ? PROFILES[prst] : void 0;
  let tan;
  if (tab) {
    const p = Math.max(0, Math.min(tab.length - 1, u * 24 - 0.5)), i = Math.floor(p), f = p - i;
    const deg = tab[i] * (1 - f) + tab[Math.min(tab.length - 1, i + 1)] * f;
    tan = Math.tan(deg * Math.PI / 180);
  } else if (prst === "angle") tan = 1;
  else {
    const s = 1 - u;
    tan = s / Math.sqrt(Math.max(1e-6, 1 - s * s));
  }
  return Math.atan(tan * hw) * 180 / Math.PI;
}

// ../../../shared/drawingml/src/raster.ts
function newMask(w, h) {
  return { w, h, a: new Float32Array(Math.max(0, w * h)) };
}
var IDENTITY = [1, 0, 0, 1, 0, 0];
function mulAffine(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}
var apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
function flattenPath(subs, m = IDENTITY, tol = 0.35) {
  const out = [];
  const scale = Math.max(1e-9, Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
  for (const sub of subs) {
    const poly2 = [];
    let cx = 0, cy = 0, sx = 0, sy = 0;
    const push = (x, y) => {
      const p = apply(m, x, y);
      poly2.push(p[0], p[1]);
    };
    for (const s of sub) {
      switch (s.c) {
        case "M":
          if (poly2.length >= 6) {
            out.push(poly2.splice(0));
          } else poly2.length = 0;
          cx = sx = s.x;
          cy = sy = s.y;
          push(s.x, s.y);
          break;
        case "L":
          cx = s.x;
          cy = s.y;
          push(s.x, s.y);
          break;
        case "C": {
          const len = (Math.hypot(s.x1 - cx, s.y1 - cy) + Math.hypot(s.x2 - s.x1, s.y2 - s.y1) + Math.hypot(s.x - s.x2, s.y - s.y2)) * scale;
          const n = Math.max(2, Math.min(256, Math.ceil(len / tol / 4)));
          for (let i = 1; i <= n; i++) {
            const t = i / n, u = 1 - t;
            push(u * u * u * cx + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x, u * u * u * cy + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y);
          }
          cx = s.x;
          cy = s.y;
          break;
        }
        case "Q": {
          const len = (Math.hypot(s.x1 - cx, s.y1 - cy) + Math.hypot(s.x - s.x1, s.y - s.y1)) * scale;
          const n = Math.max(2, Math.min(256, Math.ceil(len / tol / 4)));
          for (let i = 1; i <= n; i++) {
            const t = i / n, u = 1 - t;
            push(u * u * cx + 2 * u * t * s.x1 + t * t * s.x, u * u * cy + 2 * u * t * s.y1 + t * t * s.y);
          }
          cx = s.x;
          cy = s.y;
          break;
        }
        case "E": {
          let a0 = s.a0, a1 = s.a1;
          if (s.ccw) {
            if (a1 > a0) a1 -= Math.PI * 2;
          } else if (a1 < a0) a1 += Math.PI * 2;
          const len = Math.abs(a1 - a0) * Math.max(s.rx, s.ry) * scale;
          const n = Math.max(2, Math.min(512, Math.ceil(len / tol / 2)));
          for (let i = 0; i <= n; i++) {
            const t = a0 + (a1 - a0) * i / n;
            push(s.cx + s.rx * Math.cos(t), s.cy + s.ry * Math.sin(t));
          }
          cx = s.cx + s.rx * Math.cos(a1);
          cy = s.cy + s.ry * Math.sin(a1);
          break;
        }
        case "Z":
          cx = sx;
          cy = sy;
          break;
      }
    }
    if (poly2.length >= 6) out.push(poly2);
  }
  return out;
}
function fillPolygons(mask, polys, evenOdd = false) {
  const { w, h, a } = mask;
  const SUB = 4;
  const edges = [];
  for (const p of polys) {
    const n = p.length / 2;
    for (let i = 0; i < n; i++) {
      const x0 = p[2 * i], y0 = p[2 * i + 1], x1 = p[2 * ((i + 1) % n)], y1 = p[2 * ((i + 1) % n) + 1];
      if (y0 === y1) continue;
      edges.push(y0 < y1 ? { x0, y0, x1, y1, dir: 1 } : { x0: x1, y0: y1, x1: x0, y1: y0, dir: -1 });
    }
  }
  if (!edges.length) return mask;
  const row = new Float32Array(w + 1);
  const xs = [];
  let ymin = h, ymax = 0;
  for (const e of edges) {
    ymin = Math.min(ymin, e.y0);
    ymax = Math.max(ymax, e.y1);
  }
  const r0 = Math.max(0, Math.floor(ymin)), r1 = Math.min(h - 1, Math.ceil(ymax));
  for (let py = r0; py <= r1; py++) {
    row.fill(0);
    for (let s = 0; s < SUB; s++) {
      const y = py + (s + 0.5) / SUB;
      xs.length = 0;
      for (const e of edges) {
        if (y < e.y0 || y >= e.y1) continue;
        xs.push({ x: e.x0 + (y - e.y0) / (e.y1 - e.y0) * (e.x1 - e.x0), d: e.dir });
      }
      if (!xs.length) continue;
      xs.sort((p, q) => p.x - q.x);
      let wind = 0;
      for (let k = 0; k < xs.length - 1; k++) {
        wind += evenOdd ? 1 : xs[k].d;
        const inside = evenOdd ? wind % 2 !== 0 : wind !== 0;
        if (!inside) continue;
        const xa = Math.max(0, xs[k].x), xb = Math.min(w, xs[k + 1].x);
        if (xb <= xa) continue;
        const ia = Math.floor(xa), ib = Math.floor(xb);
        if (ia === ib) {
          row[ia] += (xb - xa) / SUB;
          continue;
        }
        row[ia] += (ia + 1 - xa) / SUB;
        for (let ix = ia + 1; ix < ib; ix++) row[ix] += 1 / SUB;
        if (ib < w) row[ib] += (xb - ib) / SUB;
      }
    }
    const o = py * w;
    for (let x = 0; x < w; x++) a[o + x] = Math.min(1, a[o + x] + row[x]);
  }
  return mask;
}
function gaussianBlur(m, sigma) {
  if (sigma < 0.05) return { w: m.w, h: m.h, a: new Float32Array(m.a) };
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + r] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const { w, h } = m;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) {
      let s = 0;
      const lo = Math.max(-r, -x), hi = Math.min(r, w - 1 - x);
      for (let i = lo; i <= hi; i++) s += m.a[o + x + i] * k[i + r];
      tmp[o + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    const lo = Math.max(-r, -y), hi = Math.min(r, h - 1 - y);
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = lo; i <= hi; i++) s += tmp[(y + i) * w + x] * k[i + r];
      out[y * w + x] = s;
    }
  }
  return { w, h, a: out };
}
function distanceTo(m, inside) {
  const { w, h } = m;
  const INF = 1e20;
  const f = new Float64Array(Math.max(w, h));
  const d = new Float64Array(Math.max(w, h));
  const v = new Int32Array(Math.max(w, h));
  const z = new Float64Array(Math.max(w, h) + 1);
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = m.a[i] >= 0.5 === inside ? 0 : INF;
  const pass = (n) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    pass(h);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    pass(w);
    for (let x = 0; x < w; x++) g[y * w + x] = d[x];
  }
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(g[i]);
  return out;
}
function morph(m, r) {
  const out = newMask(m.w, m.h);
  if (Math.abs(r) < 0.01) {
    out.a.set(m.a);
    return out;
  }
  const p = Math.ceil(Math.abs(r)) + 2;
  const pw = m.w + 2 * p, ph = m.h + 2 * p;
  const pad2 = newMask(pw, ph);
  for (let y = 0; y < m.h; y++) pad2.a.set(m.a.subarray(y * m.w, (y + 1) * m.w), (y + p) * pw + p);
  const d = distanceTo(pad2, r > 0);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, dd = d[(y + p) * pw + x + p];
      out.a[i] = r > 0 ? Math.max(m.a[i], Math.min(1, Math.max(0, r - dd + 0.5))) : Math.min(m.a[i], Math.min(1, Math.max(0, dd + r + 0.5)));
    }
  }
  return out;
}
function shiftMask(m, dx, dy, w = m.w, h = m.h) {
  const out = newMask(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y - dy;
    const y0 = Math.floor(sy), fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = x - dx;
      const x0 = Math.floor(sx), fx = sx - x0;
      const at = (xx, yy) => xx < 0 || yy < 0 || xx >= m.w || yy >= m.h ? 0 : m.a[yy * m.w + xx];
      out.a[y * w + x] = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    }
  }
  return out;
}
function warpMask(m, inv, w, h) {
  const out = newMask(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx0, sy0] = apply(inv, x + 0.5, y + 0.5);
      const sx = sx0 - 0.5, sy = sy0 - 0.5;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      const at = (xx, yy) => xx < 0 || yy < 0 || xx >= m.w || yy >= m.h ? 0 : m.a[yy * m.w + xx];
      out.a[y * w + x] = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    }
  }
  return out;
}
function invertAffine(m) {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-12;
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

// ../../../shared/drawingml/src/effects.ts
function alignPoint(algn, x, y, w, h) {
  const a = algn ?? "b";
  const fx = a === "tl" || a === "l" || a === "bl" ? 0 : a === "tr" || a === "r" || a === "br" ? 1 : 0.5;
  const fy = a === "tl" || a === "t" || a === "tr" ? 0 : a === "bl" || a === "b" || a === "br" ? 1 : 0.5;
  return [x + fx * w, y + fy * h];
}
function shadowAffine(s, box, ppt) {
  const [ax, ay] = alignPoint(s.algn, box.x, box.y, box.w, box.h);
  const sx = s.sx ?? 1, sy = s.sy ?? 1;
  const kx = Math.tan((s.kxDeg ?? 0) * Math.PI / 180), ky = Math.tan((s.kyDeg ?? 0) * Math.PI / 180);
  const a = s.dirDeg * Math.PI / 180;
  const dx = s.distPt * ppt * Math.cos(a), dy = s.distPt * ppt * Math.sin(a);
  const K4 = [1, ky, kx, 1, 0, 0];
  const S = [sx, 0, 0, sy, 0, 0];
  const toA = [1, 0, 0, 1, -ax, -ay];
  const back = [1, 0, 0, 1, ax + dx, ay + dy];
  return mulAffine(back, mulAffine(S, mulAffine(K4, toA)));
}
function outerShadowMask(sil, box, s, ppt) {
  const m = shadowAffine(s, box, ppt);
  const moved = warpMask(sil, invertAffine(m), sil.w, sil.h);
  return gaussianBlur(moved, s.blurPt / 3 * ppt);
}
function innerShadowMask(sil, s, ppt) {
  const a = s.dirDeg * Math.PI / 180;
  const sh = shiftMask(sil, -s.distPt * ppt * Math.cos(a), -s.distPt * ppt * Math.sin(a));
  const b = gaussianBlur(sh, s.blurPt / 3 * ppt);
  const out = newMask(sil.w, sil.h);
  for (let i = 0; i < out.a.length; i++) out.a[i] = sil.a[i] * (1 - b.a[i]);
  return out;
}
function glowMask(sil, radPt, ppt) {
  return gaussianBlur(morph(sil, radPt / 2 * ppt), radPt / 6 * ppt);
}
function softEdgeMask(sil, radPt, ppt) {
  const e = gaussianBlur(morph(sil, -0.86 * radPt * ppt), radPt / 3 * ppt);
  for (let i = 0; i < e.a.length; i++) e.a[i] = Math.min(e.a[i], sil.a[i]);
  return e;
}
function reflectionAlpha(t, r) {
  if (t < r.stPos) return r.stA;
  if (t > r.endPos || r.endPos <= r.stPos) return t > r.endPos ? 0 : r.stA;
  return r.stA + (r.endA - r.stA) * (t - r.stPos) / (r.endPos - r.stPos);
}

// ../../../shared/drawingml/src/color.ts
var clamp01 = (v) => Math.max(0, Math.min(1, v));
function srgbToLin(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function linToSrgb(v) {
  v = clamp01(v);
  return v <= 31308e-7 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}
function hsl(c, f) {
  const [rf, gf, bf] = c;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rf) h = (gf - bf) / d % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  let [h2, s2, l2] = f(h, s, l);
  h2 = (h2 % 1 + 1) % 1;
  l2 = clamp01(l2);
  const k = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = k * (1 - Math.abs(h2 * 6 % 2 - 1));
  const m = l2 - k / 2;
  const seg = Math.floor(h2 * 6) % 6;
  const [r2, g2, b2] = seg === 0 ? [k, x, 0] : seg === 1 ? [x, k, 0] : seg === 2 ? [0, k, x] : seg === 3 ? [0, x, k] : seg === 4 ? [x, 0, k] : [k, 0, x];
  return [clamp01(r2 + m), clamp01(g2 + m), clamp01(b2 + m)];
}
function applyColorMods(c, mods) {
  let srgbMode = false;
  for (const [name, raw] of mods) {
    if (name === "gamma") {
      srgbMode = true;
      continue;
    }
    if (name === "invGamma") {
      srgbMode = false;
      continue;
    }
    if (name === "comp") {
      c = hsl(c, (h, s, l) => [h + 0.5, s, l]);
      continue;
    }
    if (name === "inv") {
      c = [1 - c[0], 1 - c[1], 1 - c[2]];
      continue;
    }
    if (name === "gray") {
      const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      c = [y, y, y];
      continue;
    }
    if (raw === void 0 || !Number.isFinite(raw)) continue;
    const val = raw / 1e5;
    switch (name) {
      case "shade":
        c = c.map((v) => srgbMode ? v * val : linToSrgb(srgbToLin(v) * val));
        break;
      case "tint":
        c = c.map((v) => srgbMode ? v * val + (1 - val) : linToSrgb(srgbToLin(v) * val + (1 - val)));
        break;
      case "lumMod":
        c = hsl(c, (h, s, l) => [h, s, clamp01(l * val)]);
        break;
      case "lumOff":
        c = hsl(c, (h, s, l) => [h, s, clamp01(l + val)]);
        break;
      case "lum":
        c = hsl(c, (h, s) => [h, s, clamp01(val)]);
        break;
      case "satMod":
        c = hsl(c, (h, s, l) => [h, Math.max(0, s * val), l]);
        break;
      case "satOff":
        c = hsl(c, (h, s, l) => [h, Math.max(0, s + val), l]);
        break;
      case "sat":
        c = hsl(c, (h, _s, l) => [h, Math.max(0, val), l]);
        break;
      case "hueMod":
        c = hsl(c, (h, s, l) => [h * val, s, l]);
        break;
      case "hueOff":
        c = hsl(c, (h, s, l) => [h + raw / 216e5, s, l]);
        break;
      case "hue":
        c = hsl(c, (_h, s, l) => [raw / 216e5, s, l]);
        break;
      default:
        break;
    }
  }
  return c;
}

// ../../../shared/drawingml/src/bevel-word.ts
var WORD_BEVEL = {
  relaxedInset: "AQECAQMBBQEHAQoBDQEQARQBFwEbAR8BIQEjACQAJQAnACsAMQE1AzkDPAM7AjsBOwEDAQQBBQEGAQgACgAMAA8AEgAWARsBIQEmAioCLQEuADAANAA6AkEFRgdEBkADOwE7AQQDBgMGAgcBCAEKAAwADgASABgBHgElAi0CMgI1ATcBOQA+AkUGTgxQEE4MRQY9AjsBCAYKBQkCCgELAQsBDQEQARQCGgIhAyoDMgM4AzwBPwFDAkgFTgtPFU4aThNFCTwEOwERDBEHEQQQAg8BDgEOAhEDFQQbBSQFLgU3Az4CQgFEAUcCSgZQD00cTB9NFkMLOgQ6ARsUHQ0cChgGEgMPAg4BEQMWBB0EJgUwBDcDPQFAAEIBQQJEBkoNThZNHE4TRgk8AjsBIBskGCQTHQoVBRABDwERAhUCGgMiAykDMQI1ATcAOgA7AD8CRQVMDE8RSwxEBjwBOwEdHyUgJRcgDBkFEwERARMBFgIaAh8CJAIpAisBLgAvADAAMwA5AkAGQwhBBjwDOQE7ARUaGhwcFhoMGAYUAhQAFgAZARwBHgIgASABIQAiACMAJQApAC0BMwI2AzkDOQI5ATsBDg8VFRcNGQgZBBgBGQAaABwBHgIfAh0CGwAaABoAHAAfACIAJwEsATACMwI2AjgBOwEMChAKFAcXBBkCGgEcAB4AIAEhAiEDHQIYABUAFQAXABkAHQAhACcBLAExATUBOAE7AQwHDwUSAxYBGgAdACEAIgAjAiUCJQQfAhYAEgARABIAEwAYAB4BIwEpAS8BMwE3AToBDgYTAxYBGwEfACIAJQAoACwBLQIrBSMDEwAOAA0ADQAQABQAGQAgAScBLQEyATYBOgESBBoEIgImACoALAAwADMBNQM1BjILIgYPAAsACwALAA4BEAEWAR0CJAIrAjIBNwE7ARYFIQUqAjEANAA4ADsBPgJCBkQNQBItCxMACwAKAAoBDAEPARUCHAMjAyoCMAI1AjoBGAUoBTEDNwA8AEAAQgJGBkkMSxZGIDESEwAMAAsBCwENAhIDGAQfBCYDLQMyAzYCOwEeBisFMwI5AD8AQABEAkoITA9KGUUnLhgTAg0ADQENAREDFQMbBSEFJwUtBTIDNQI7ARwGKQMwAjYBOwA9AEIBSQVODE0SRx4yFRQCDAEMAg0CEAMXBB0EIwQrBDADMwM2AjoBFgQkAyoCLwA1ADcAOgA/A0EFRAtAEi0LFQENAQwBDQEQAhUCGwIiAykDLwMzAjYCOwERBBcEHQIiASgALQAwADMBNgI1BjIJJAUWARAADgAPAREBFAEaASECKAIvAjMCNgI7AQkCDgMSAhcBHQAhACUAJwAoASoEJwUgAxgBEwASABMBFAEXARsBIQEoAi4CMwE3ATsBBAEHAQoBDgESARYAGgAdASABIgIhAh4CGgAXABYAFwAZABwAIAElASoBLwEzAjYBOwECAAMBBgEJAQ0BEAEUARgBGwEeAh8CHQEbABoAGgAbAB4AIQAlASgBLQEyAjUCNwE7AQEAAgEDAQYBCQENARABEwEYARoBHQEfAR4AHgAfACAAIgAmACoBLwE0ATYBOAE5ATsB",
  circle: "AgEDAQQBBgEIAQsBDQEQARMBFgEZABsBHgEhASMBJQEoASoBLQEvATIBNQE3ATkBOwEDAQQBBgEHAQkBCwENAQ8BEQAUARcBGgEdASABIwElASgBKgEsAS8BMQE0ATYBNwE6AQUCBwMHAQgBCgELAQwBDgEQARIBFgEZAhwCIAIjAiYCKQIrAi0CMAEyATQBNQE3ATsBCAUJBAoCCgELAQwBDQEOAhECFAIXAxsEHwQjBSYEKQQsBC4DMAMyAjMCNQI2AjcCOwEPCRAGEAQQAw8DDgIOAg8CEgMVBBkFHgUiBiYGKQYrBi0FLwQxBDMDNAM2AjcCNwI6ARcQGA0ZChcHFAQSAxACEQITAxYEGQQdBSEGJwYrBi0GLwUxBDMDNAM1AjUCNgI3AjsBHhcjFiMQHgoYBRQDEQEQARMCFQMZAx4DIQQmBCkEKwQuAzADMgIzAjUCNgI2AjcCOwEbHCQfIxUgDBwHFwITABMBFQEXARoCHQIgAiMCJwIpAiwCLgIwATEBMwE1ATYBNwI7ARMWGxwcEhwLGgYYAhYAFgAYABoBHQEgASIBJQEnASoBLAEuATABMgE0ATYBNwE4ATsBDgwVExgNGAgZBRkCGQEaABwAHgAhACMAJgAoACsALAAuATABMQEzATQBNgE3ATgBOwELBxAKFQcXBBoCGwEdAB8AIQAjACUAJwAqACwBLgEwADEAMwA0ADUANgE3ATgBOQE7AQsFDQURAxUCGQEdASEAJQAnACoALAAtAC8BMQEzATQBNQE2ATcAOAA4ATgBOQE5AToBDQUSAxUCGwEhACQAJwAqACwBLQEvATMCNgI4AjsCPAI8ATsBOwE7AToBOgE6AToBOwERBBoEIQImACoALAAvADIBNAE3AjsDPwVCBkUHRQdGB0UGQwVCBEADPwI+AjwBOwE7ARUFIQUqAzEBNAA4ADoAPgFCA0cFSgdNC04OTxJPEk8RTw9NDEoKRwdEBUEEPgI8ATsBGAYoBy8DNgE8AEAAQgFGA0oGTQtQEE8WTRxMIEsiSyBMG0wWTBJKDkYKQwY/AzsCOwEdBiwGNAI7AEEARABGAUoDTghPDk0VSxxKI0gqSCtJKEshTBtMFUoRSAxEB0AEPQE7AR0HKgQyAjkBPwBBAEMARwJMBk4KThBNFkocSiJKJUsgThpPFU4RSw1HCUMGPwM7ATsBGAUmBCwCMgA3ADcAOgA9AkACRQRIB0wJTA5OEU4SThFPD00MSglHCEMGQAM+AjwBOwASBBkEHwIkASkBLAAuADAANAE2AjoDPAQ/BkEGQwdDBkIGQQU/BD8DPQM8AjsBOgE7AQoDDgMTAhcCHAEfASMAJgApACsALgEwATMCNQI2AjcCNwI4AjgCOQE5ATkBOgE6ATsBBQEIAgsCDwESARcBGgEeACEAJAAmACkALAAuADAAMQEyATMBNAE1ATYBNwE4ATkBOwECAQQBBwEKAQ0BEQEVARgBGwAeACEAJAAmACkAKwAsAC4AMAExATMBNQE2ATgBOQE7AQEBAgEEAQcBCgENARABFAEYABoAHQAhACIAJQAnASkBKgEsAS4BMAEzATUBNwE4ATsB",
  slope: "AQECAQMABQANARkCJgMxAjgBOwA8ADwAPAI6BDEDKAIdABcBFgEWARkBIgIsAzUDOwEDAQQBBgAJAA8AGgImAy8DNQI5ATsAPQFAAj8EOAQuAiQBHwAdABwAIQAqAzQFOAQ7AQUDBwMJAQwAEgAcAScDMAM2AjgBOQA8AUAEQwg/BzcELgEpACgAJwArADcFPwo7BTsBCQcNBw8DEAEXASACKAIwAzUDOAE4ATwCQwVICUgKQAY2AS8ALgAtADIBQwtIDj8GOwETDhgNGgcaAx4CJAIqAzADNQI4AToAPQJDBUkKSwxECDcBMgAwAC8ANQFID0wSPQU7AR4WIxMlDyMHIgQmAisBMwI3AjcBOAE6AkAESglNCUQFNwEvACsALAAvAUMOSRI6BDsBJBowGjAWKw0iBCMCKgIyAjcCOAE6ATwBQANFBkIFOwMxACcAIgAjACgAOAZACTsDOwElHy8cMRYuDiUDJAArATICNQI3AjgBOwE+Az4FNgQtAiMAHgAaABsAIAAqAzEENQQ7ARgaIBwkFiYNIwQlAC4BNgE6ATsAOgA6ATgDMwUqBCACGAATABEAEQAWAB8CKQMxBDsBEA8YFBwNHwchAyUBLQI0AjgBOgE7ADsBOQIyAyYDGQEPAAkABwAHAAsAFQEjAzEDOwENCxILFgcaBB8CKAIxAjcBOgE7ADoAOQE1Ai0DIQMUAgkABAACAAMABQAPASEEMQQ7AQwIEAcTBBYBIQIqAzIDNwM6ATsAPAA6ADYBLgMfAhICBwACAAEAAQADAA4BHgMvBTsBDAYQBBQCGgAmATECOgM7AzsAOQE4ATUCMwMqAx0CEgEHAAQAAwADAAUADwEcAywFOwEQBRYDHQEjACwBNgM+BT4DOwE7ADoBOAEyAykDHAIRAQkABgAFAQUACAAQAR0DLAQ7ARQGHAQjAi0BNgJBBUYGQwQ+AToAOAE3AjEDKQMeAhMADQAKAAkBCQEMARIBHAMpBToBGAYjBSoBNABBBEsHTAlGBT4BOgA4ATYCMAMpBCADFwESARECEgMTAxUCHAMkBC4EOgEaBiYELAA2AEYFTwlPCUYFPgI5ATgBNgIxAysDIwMcAxoDGwUeByAHIwYoBiwFMAQ7ARkGIgMpATQBQgNMB00JRQU+AToBOAE1AjMCKwMlAyIDIwcoCywNLw0xCi8IMAYxBDoBFQUbBCEBKwE2Aj8FRgdCBD8BOwA6ADcCMwMrAyMCIgMoCjESNxM4EjgOMgktAzADOgEPBBQDGQEgACsBNwM+BD8DPAI5ATcBNQIzAywCJQAlAi4LNRQ2FTYUNxExCCwCLwE7AQgCCwIPARUAIAErAjUDOwM7AToBOQA3ATQCLQIlASMCJwgrDy0SLhIuDioHKQIuAjsBAwEFAQgADgAXASQDLwQ2AzkBOgA6ATkCNQItAiYCIQMgBSAJIQshCyIJIwUnBCwDOwEBAAIABAAIABEBHgIsAzQDOAE7ADsAOgE4AjECKAIgAxsEGQUYBhkGHAUhBCcDLwM7AQEAAQACAAUADgEbAikDMwI5AToAPAA6ATkBNQMrAyICGQEVAxQDFAQYAiADKwI0AjsB",
  cross: "EAEpATgBOQE5ATkBOQE5ATkBMgEWAQcBDgEoATgBOQE5ATkBOQE5ATkBOQE5ATkBOQEQASoBOAE5ATkBOQE5ATkBOQEuARMBCAEQASoBOAE5ATkBOQE5ATkBOQE5ATkBOQE5AREBKgE4ATkBOQE5ATkBOQE5AS4BEgEMARABKgE4ATkBOQE5ATkBOQE5ATkBOQE5ATkBEgIqATgBOQE5ATkBOQE5ATkBLAETAhICEgIqATgBOQE5ATkBOQE5ATkBOQE5ATkBOQEXAiwBOAE5ATkBOQE5ATkBOQEsAhQCGAIVAioCOAE5ATkBOQE5ATkBOQE5ATkBOQE5ARcCLQI4ATkBOQE5ATkBOQE5AS4BFQIcAxgCKwI4ATkBOQE5ATkBOQE5ATkBOQE5ATkBGAItATgBOQE5ATkBOQE5ATkBLwEXAh0CGgIsATgBOQE5ATkBOQE5ATkBOQE5ATkBOQEbAS4BOAE5ATkBOQE5ATkBOQEsARgBHgIaASsBOAE5ATkBOQE5ATkBOQE5ATkBOQE5ARwBLQE4ATkBOQE5ATkBOQE4AS4BGgEbARwBLgE4ATkBOQE5ATkBOQE5ATkBOQE5ATkBHQEvATgBOQE5ATkBOQE5ATkBMAEdARkBHAEvATgBOQE5ATkBOQE5ATkBOQE5ATkBOQEgATIBOQE5ATkBOQE5ATkBOQExAR8BFgEfATEBOAE5ATkBOQE5ATkBOQE5ATkBOQE5ASQBMwE5ATkBOQE5ATkBOQE5ATQBJAEYASEBMgE5ATkBOQE5ATkBOQE5ATkBOQE5ATkBJwE0ATkBOQE5ATkBOQE5ATkBNgEpARwBJAEzATkBOQE5ATkBOQE5ATkBOQE5ATkBOQEuADYBOQE5ATkBOQE5ATkBOQE3AS8AIAEsATYBOQE5ATkBOQE5ATkBOQE5ATkBOQE5ATYBOgE5ATkBOQE5ATkBOQE5ATkBOAAoATQBOQE5ATkBOQE5ATkBOQE5ATkBOQE5ATkBPAE8ATkBOQE5ATkBOQE5ATkBOwE+AS4COwE8ATkBOQE5ATkBOQE5ATkBOQE5ATkBOQFAAT0BOQE5ATkBOQE5ATkBOQE7AT4BMQI/AT4BOQE5ATkBOQE5ATkBOQE5ATkBOQE5AT0BPAE5ATkBOQE5ATkBOQE5AToBPQEwAjoBPAE5ATkBOQE5ATkBOQE5ATkBOQE5ATkBOAA5ATkBOQE5ATkBOQE5ATkBOQE4ASgBMgE6ATkBOQE5ATkBOQE5ATkBOQE5ATkBOQEuADYBOQE5ATkBOQE5ATkBOQE4AS4BHwEqATQBOQE5ATkBOQE5ATkBOQE5ATkBOQE5ASMBMAE4ATkBOQE5ATkBOQE5ATYBJwEUASABMAE4ATkBOQE5ATkBOQE5ATkBOQE5ATkBHQEtATgBOQE5ATkBOQE5ATkBNAEhAQ0BGAEtATgBOQE5ATkBOQE5ATkBOQE5ATkBOQEYASwBOQE5ATkBOQE5ATkBOQEyARwBCAEVASwBOAE5ATkBOQE5ATkBOQE5ATkBOQE5ARQBKwE4ATkBOQE5ATkBOQE5ATMBGQEGAQ8BKQE4ATkBOQE5ATkBOQE5ATkBOQE5ATkB",
  angle: "DwEOAQ8BDwEPAQ4BDwEPAQ4BDwEPAQ4BDwEPAQ8BDwEPAQ8BDgEPAQ8BDgEPARwBOQEMAQwBDAEMAQwBDAEMAQwBDAEMAQwBDAEMAQwBDAEMAQwBDAEMAQwBDAEMAQwBGgE5AQsBCwELAQsBCwELAQsBCwELAQsBCwELAQsBCwELAQsBCwELAQsBCwELAQsBCwEXATkBCwILAgsCCwILAgsCCwILAgsCCwILAgsCCwILAgsCCwILAgsCCwILAgsCCwILAhkCOQEMAgwCDAIMAgwCDAIMAgwCDAIMAgwCDAIMAgwCDAIMAgwCDAIMAgwCDAIMAgwCGgI5AQ0CDQINAg0CDQINAg0CDQINAw0CDQINAg0CDQINAg0CDQINAg0CDQINAg0CDQIbAjkBDgIOAg4CDgIOAg4CDgIOAg4CDgIOAg4CDgIOAg4CDgIOAg4CDgIOAg4CDgIOAhsCOQEPAQ8BDwEPAQ8BDwEPAQ8BDwEPAQ8BDwEPAQ8BDwEPAQ8BDwEPAQ8BDwEPARABHAE5ARMBEgETARMBEgETARMBEwETARIBEwETARMBEwETARMBEwESARIBEwESARIBEwEdATkBFwEXARcBFwEXARcBFwEXARcBFwEXARcBFwEXARcBFwEXARcBFwEXARcBFwEXASABOQEcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAJgE5ASIAIQAhACEAIQAhACEAIgAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIgAqATkBJgAnACcAJgAnACcAJwAmACcAJgAnACcAJwAmACcAJwAnACcAJwAnACYAJwAmAC0AOQEvAC8ALwAvAC8ALgAvAC8ALwAvAC8ALwAuAC8ALgAvAC4ALwAvAC8ALwAuAC8AMwA5AToAOgA6ADoAOgA6ADoAOgA6ADoAOgA6ADoAOgA6ADoAOgA6ADoAOgA6ADoAOgA6ADkBQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAD8BOQFGAUYBRgFGAUYBRgFGAUYBRgFGAUYBRgFGAUYBRgFGAUYBRgFGAUYBRgFGAUYBQQE5AUIAQwBCAEIAQgBDAEIAQgBDAEIAQgBDAEIAQgBDAEIAQgBCAEMAQgBCAEMAQgA/ATkBOgA5ADoAOgA6ADoAOgA6ADkAOgA6ADkAOgA6ADkAOgA6ADoAOQA6ADoAOQA6ADoAOQEvAC8ALwAvAC8ALwAvAC8ALwAvAC8ALgAvAC8ALwAvAC8ALwAvAC8ALwAvAC8AMwA5ASMAIwAjACMAIwAjACMAIwAjACMAIwAjACMAIwAjACMAIwAjACMAIwAjACMAIwArATkBHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcACUBOQEXARcBFwEXARcBFwEXARcBFwEXARcBFwEXARcBFwEXARcBFwEXARcBFwEWARcBJAE5ARIBEgESARIBEgESARIBEgESARIBEgESARIBEgESARIBEgESARIBEgESARIBEgEfATkB",
  softRound: "AgEEAAcAFQYbBBsBHAAdACEAIQAjACcBKAEsATEBNQE5Aj0DPwM/Az0CPAI7AToBOwEEAQYADAAbBiIFJAIoACsALQAvADAAMgE0ATcCOQI9BEIFRgdICEgHRQZBBD4CPAE7AQcCCgARACADLAUwAjIANQA3ADkAOwE/A0EERQZHCEoKTg1PD1ARTw9MC0YGQQM9ATsADQYRAxUAJQM0BTYBOgA+AD4AQgFGA0oHTQpODk8STxVOGE4aThpOF0wRRgtABTsCOwEWDRsHHgIrAjcDPQE/AEIAQwBFAUkFTAlODk8SThdNG0weTB9MH00bSxRFDD8GOwI7ASASJw4pBi4DNAM5ATsAPQBAAEIBRQNJB0sLTQ9OE04VThhOG00bTxdNEEcKQQU8ATsBIxcvFjEMMAQwATMANAA1ADcAOQA7AT4DQgRFBkYHSQpNDU4QTxBODkoKRgZBAzwBOwAgGC0dLhArBioBKQApACsAKwArAC0BLwEyAjQCOAI8BEAFRAdGB0YHQwVAAz0COwE7ABkSJRknESQFIAEeAB4AHgAeACABIQEkAScBKgEuATIBNgI6AzsDPAM7AjoCOgE6ATsBDwwYEhwNGgYWARMAEwAUABQAFgAYABwBIAAkACgAKwEvATIBNAE2ATgBOQE5AToBOwENCBMJFwgXBRIBDgANAA0ADwARARMBFwEbAR4BIQElASgBLAEvATEBNAE2ATcBOQE7AQ0GEgUUAxkGDgEKAAkACQEKAQsBDwETARYBGgEfASEBJgAqAC0ALwAxATQBNgE4AToBDgYSAxYDGQYNAAgABwAHAQcBCQEMAQ8BEgEWARoBHQEiACcAKgAtADABMwE1ATcBOgERBRQDGgYZBQ0ACAAHAAYABwAIAQoBDQEQARQBGAEcASABJQEpASwBLwEyATUBNwE7ARQFGwUgBxwFDwAKAAgABwEIAQoBDAEPARICFQIZAh0CIAIlAikBLAEwATMBNQE3ATsBFwYhBiUGIQUTAA0ACgAKAQoBDAEOARICFQQZBBwFHwUjBCYEKQMsAi8CMgI1AjcBOwEcBiQDKgYjBBQADwANAQwBDAENAhADEwQXBhsHIAgjCCYGKQUrAy4DMAI0AjUCOAE7ARoGJAQoBSUEFgAUAhEDDgMNAg4CEQMUBBcGGwggCCUHKQUsBC0DLwIxAjQCNgI3ATsBFgQeAyQDJAQXARgFFQcQBQ8EDwMSAxYDGAQcBCAEIgQnAyoDKwIuAjACMwI1AjcCOwEQBBQDGwUcBRcDGQcYCBQGEQQRAxMDFQMXAxoCHQIhAiQCKAErAS8BMQE0ATYBOAE7AQgCDAMSBBYFGAUYBRgGFgUUAxMDFAMWAxkCGwIeASIBJgEpAC0BMAEyATQBNgE4ATsBBAAHAQwDEwUWBRcEFwQWAxQCFAIVAhcCGgIeASEBJQEoACwALwAyADQANwA4ADoAOwECAAMACQISBxQFFQIVARYBFgEXARkBGwEeASIBJgEpAS0BMAEzADQBNgE3ATgBOQE7AQEAAgAGABQIFgMWARcAGAAZABsAHAAfASIBJwErAC8BMwA3ADgBOgE6AToBOgE6ATsB",
  convex: "EAIfBi0FLwIvACsAJwAhABoBGAEVARIBEQEPAA4ADAAJAQYBBQEFAAUACwAWASgEOwEPAh8GKwYuAy0BKgAkAB8AGgEXARMBEQEPAQ0BCwEJAQcBBgEGAQYABwAMABcCJgU6AQ8CHQYpBi0ELAIpASUBIQEdARkCFQERAQ4BCwEJAQgBBwEHAQgBCQAMABEAGgEoAzsBEQMeBygHLAUtAysDKAMlBCEEHQQYBBQDEAMNAgsCCgEJAQoBCwEOABEAFgEeAigDOwEUBCIHLAcvBS8DLAQpBSYHIggeCBoHFgYSBBADDQIMAgwBDQEPARMCFwIcASIBKwM7ARQEJActBi8ELwMtBCoFJgYjCCAIGwcYBRQEEAMOAg0CDgIRAxQEGgUgBh8CIgEtAzoBFAQlBi0FMAMvAi4CKQMkBCAEHQUYBRQEEQQPAg0BDgIRAxUFGwghCSUJIgIiAC4DOgEWAyUGLgUxAi8BLAEoASMCHwIbAhgCFQISAhACDgIPAhIEFwceCyQNJQgiAiUALQI7ARUEIwctBTACMQEtACkAJAAhAR0BGwEYARUBEwERARECEwMWBhsJIAohBiACIwEsAjsBFAQiCC0GMAIyADAALgApACUAIgAfABwBGQEWARQBEwIUAxUEGAYbBRwDHgEkAS0COwEXBCYHMAUzAjUAMwAwACwAKQAnACQAIQEdARsBGAEWARUCFQIWAhYCFwAbACQBLgM7ARoFKgUzBDgBOQE0ATIBLwEsASsAKgAnACQAIAEdARsBGQEXARUBFQAXAB0AJgEwAzoBGwcpBjMEOgI+Aj8CPQE3ATUBMQEvACwBKAEmASMBIgAfARwBHAEaABsAIQApATEDOwEeBysGOARBA0cESgZIBkIEPQM5AjcCNAIzATABLQErASkBKAEmACQAJAAnAC0BMwM7ASAJLgg4BUQHTQ1QEU4QTA1JCUcHRQREA0ECPQE5ATUBMwExATEBLgAtAC8AMwE4AjsBIwowCDgGRgxNFkwdSx5MGk0UTxBPDE4ISgVGA0ECPgE8ATsAOQA3ADUANgA5AToCOwEoCzMFOQZGDkscSiRKI0sgTRtPFVAQTwxMCEgFRQNBAT8APgA8ADgANgA3ADsCOwI7ASgLNAY7BUcMTBZMHkweThlOFlAPTwxOCUgGRARBAT8APwA9ADoANgAxADUAOQI6AjsBJAgxBToERQZLC04QTRJJDkUJRghEBUEDPgM7AjoBOAA3ADQAMgAvACoALgA0AjcCOwEeByoHNAU9BEUFSAdEBj4EOgM2AjUBMwEyAS8BLQErACkBKAEmACQAIwAmAC0BMwI7ARkFJAguBjUEOgM8AzoCNQEyAC4ALAApACcAJAEiAR8BHQEcARoBGAAYABsAJAEtAzsBFQMiBi4GMwM0ATQAMQAuACoAJwAkACIAIAAdABoBFgETARABDwEOAA0AEgAcASkEOwEUAiMFLwU0AjIAMAArACgAIwEgAR0BGwEZARcAFQESAQ4BDAEKAQgABwAMABkCKQY6ARMCIQUsBS8DLwEsACkAJAAgAR0BGQEYARUAEwARAA8BDAEIAQYBBQAFAAoAFwIpBDsB",
  coolSlant: "AQECAQIBAgEDAAQABgAKABAAFgEfASYCLgE0AjkBOwE7ADsAOwA7AToBOQE6ATkBOwECAQQCBQEFAQUABgAIAAoADwAVAR4CJgIuAjQCOAE6ATsAOwA7ADsAOwA7ADsAOgE7AQQCBgMGAgcBBwEIAAkACwAQABcBIAIoAy4DMwM2AjgCOQE5AToBOgE6ADsAOwA7ADsBBwUJBAkCCgILAQsBCwANABEBGgMiBikGLgQyAzYCOQE7ATsAPAA8ADsAOwA6AToBOwEQCxEIEQURBBADEAMPAg8BEwEdBScILAcwBTMDNgI4AToBOwA7ADsAOwA7ADoBOgE7ARoVHQ8eCx0JHQkaCBcGEgEUAhwFJggtBzAFNAM4AjgBOgE7ADoAOwA6ATkBOQE5ATsAIB8nGigUJxElESQSHgsUAhQBHAQkBioFLwQ0AzkBOgA8ADwAPAA7ADoBOQE6ATkBOwAhKCgiKhwpGCgYJRYdDBUDFAEaAiQDLAMyAjcBOgE7ATsAOgA6AToBOgE6AToBOwE7ARghHSEeGh4WIBQfEhwKGAMYAB4BJQErATECNQI4AjkBOQE6AToBOgE6ATsBOgE6ATsBDhMUFxYQGQ4bDB0JHQUbAhwAIAAnAS0CMgI1ATgBOgE6AToBOwE6AToBOgE6AToBOwENDREMEwgVBxYFFwQZAhoBHgEkASoBLwE0ATcBOgE6ATsAOwA6AToAOgE6AToBOgE7AQsHDgYPAxACEgISARUBGgEgASgBMQE2ADgBOQE5ATgBOAE5AToBOwA7AToBOgE6ATsBDQURBBQDFwIZARoAHAAgACcBLQI0AjgCOQE6ATsAOgE6ADoBOgA6AToBOwE7ADsAOwATBRoEIAIjACQAJQAnACoAMAE6BD8FQAQ+AjwBOgE6ADoBOgE6ADoAOwA7AToBOgE7ARgGIgUoAi0BLwAwADAAMwA8A0cJTQxLCkMFPAI6ATkBOgE6AToBOgA6ATsBOwE6ATsBHAYqBS8DNAA2ADcANwA5AUMFTxBPF08RRwg9AzkBOAE4ATkBOQE5ATkBOQE6ATkBOwEfBy0GMwI4AD0APAA7AD0BQwdNFE0eTxdHCz0DOAE4ATkBOQE6AToBOgE6AToBOQE7AR4IKgQxAjYAOgA6ADwAPABEBkwQThpOE0QKPAM6ATsAOwA7AToBOQE6AToBOgE6ATsBGwYlAykCLgEtAC0AMAAyADoCRwdODEwIQwU8AjoBOgE6AToBOgE5AToBOgE6ATsBOwATBBgEHQIgASMAJgAnACsAMAE3Az0FPQQ8AzsBOgE6AToBOwA6AToBOgE6AToBOgE7AAsDDgQSAhQBFwAZABwAIAAlACsBMQI1AjcCOQE6AToBOgE7AToBOgE6AToBOQE5ATsBBAIHAwkCCwEMAA8AEgAWABwAIwEpAS8CMwI3AjgBOgE6ATsAOwE6ADoBOwE6ATsBOwECAQMBBAEFAQcACAALABAAFgEeASQCKwIwAjUBOQE7ATwAPAA8ADwAPAA7ADoBOgE7AQEBAgECAQMBBAAGAAgADAASARkBIQIpAi8CNQI5ATsBOwA8ADwAOwA7ADoBOgE6ATsA",
  divot: "AQECAQMBBAAHAAsBDwEUABgBHQEhASQAKAAyAzcCNwI4AjcCNAMvAiEAJQArATMCOwECAQQBBQEGAQcACgAOARIBFwEcASEBJwAuATQCOAM3AjUCNQM0Ay4BJQAlACsAMgM7AQQDBgMGAgcBCQALAA4AEgEYAh0CIgEnAS4CNAI3AjcCNwI3AjYDMAEpACgALAAyAjsBCAYKBQoCCgELAQwBDwEUAhoEIAUlBCkDLwI0AjgCOQE5ATgCNgIyAS0ALAAuATICOwEQDhIJEQUPAg4BDwERAhYEHQckCCkGLQMyAjcCOQE5ATkBOAI2AjICLwIvAjACMgM7ARoXHBIaChcGEwMQARECFgQdCCMJKAYrAzICOAE8ATsAOgA4ATUDMgMwAi8DMQMzAzsBIR8nHSUUHgsWBRICEAEVAxwEIgYnBCoBMAE3AToBOgA5ATgBNwIzAi4BLQEwAjQCOgEfJCgnJRggDRoGFAISABYBGwMgAyQCJwEtATQBOQI5ATgBOAI3AzMBLQAsADAANAI7ARYeHSQdFxsMGAUVARYAGgEeASIBJAAlACoAMQI2AzYDNgI3AjcCNAEvAC4AMAA1ATsBDxIWFxcOGAgYBBcBGQAcACEBJAElACQAKAAxAjUDNQM1AjYDNgIyAS4ALgAwADUBOwENDBEMEwYVAxcBGwEeACAAJAEnAigCIQAlADEDMwM0AzUDNQI3AjUBLwAxADQANwE7AQwIDwURAhUBGQAeASEBJQEnASsDKgQeACEAMwI4AjkBOQE4AjcCNQEwADIANQA3AToBDQYRBBQCGQEeASQAJwAsADABMAMvBSIAIAA0AzUCOAI5AjgCOgE2ATMANQA1ADcBOgESBRkEIAEmACoALgAxATQCNwQ5BjoIKQApADUDNQI2AjgCOAI3ATcBNgE3ATkBOQE7ARQFHwUnAjABNQA5AD4BQQRECUgQQg0xAigAMgI2AzgCNwE6AToBOQE7Aj4DPQM7AjsBFwYlBi4DNwA/AEMARwJLCE4RTRlGFDYHLAEwAjYDNgI4ATsBOQA7AUIGRQhCBj0COwEcBioFMgI7AEIARABIBEwLTRZLIEoaPAsxAjMCNgM3AjgBOQE4ADsCRQdKCkUGPgI7AB0GKgMxAjcAPAA/AUMCSglPEk4WTRVEDDoFNgI3AToBOwE5ATgAOwFDBkkJQwU9ATsAFwUiBCgCMAA2ADoAPABABEMGSAtJDUMKPQc4AjcBOQE6ATkBOQA5AT0CPgM+AzsBOwESBBgDHgIjASgALQAvADMBNgM5BD0GPwc+BjoDNwE4ATkCOQI3ATUANQA1ADcBOAE7AQoCDgMSAhYBHAEgACQAKAAsADABNAM4BDkENwM2AjUCNwI3AzYCMgAwADEAMwA2ATsBBAEHAgoBDQERARYBGwEgASQBKAEsAjECNAM2AzYCNQI2AjYDNQIxACwALQAxADUBOwECAAMBBgEJAQwBEQEWARsBHwEjAScBKwExATUCNwI2AjcCNwI1Ay8AKAAqADABMwI6AQEAAgADAQUBCQENARIBFwEcASABJAEmACoANAI4AjgCOAI1AjQELwMhACcALQE0AjsB",
  riblet: "AQEDAQQBBQEHAAgBCgENAQ4BEQAUABkAHwEnAS8BNAA4ATkBNgIzAywDGgAdAC0COgECAQQBBQEGAQcBCAEKAQsBDQAPABMAGQAgAScBLQEyATUBNgI0AzIDLAIbAB8ALAM6AQUCBgIHAQgBCQEKAQoBCgELAQ0BEQEXAh8CJgItAjIBNgE3AjUDNAUpARwAHgAsAzsBBwQJBAkBCgEKAQsBCwELAQwBDwITAxoEIgUpBC4CMgE1ATcCNgM0AysBIgAkAC0COwEPCg4FDgMOAw0CDAMMAgwCDQIRAxgEIAYnBiwFLwIxATUBNgI2AzIDKwEnACoAMAI6ARgTGAoYBxYFFAQSBA8DDgIOAhEDFgQfBiYHLAUwAjMBNgE4ATcCMwMtAiYAKgIwAzoBHRwgFB8OHAkYBxUFEgQPAg8BEQIWAh4DJQUsAzABMwE2ATcCNgMyAy0CKAErAi8DOgEdIiAaIBIeDBoIFwYTAxEBEQETARcBHQIkAioCMQEzATYBNwI2AzMDLgIqASwBLwI7ARQcGBoYEBkLGggYBRYCFQEUABYAGgAfASUBKwEwATMBNgI3AjcDNAIwASwALAAwAToBDxEUERYLGAgZBRkEGAIYARgAGgAdACIAKAAtATIBNQI2AjYCNwM1AjAALAAtADIBOgENCxAIEwYWBBcCGgIaARsAHQAfACMAJwAtADIBNQE2AjYBNgI2AjUCMAAqAC0AMgE7AQwHDgQQAhQCGAEbAB4BHwAhASQAJwAqATABNgI6AjsBOwE6ATgBNgIzASkALQAzAjoBDQURBBUCGgIeACEAJAAmACcAKQAsADABNQI7Az4DPgI7AToBOQE5ATUALQAvADUCOgETBRsEIwImACkAKgAsAC0ALgAwADQAOwNBBUQGQgY/BDoCOAI4ATgBNgA0ADUANwE7ARgFJAUsAjEBMwA2ADcAOAA5ADsAQAJJB08NTw5JCUIFPQM7AToBOQA5ADoBOgE7ATsBGwYrBzIDOAE8AD8AQABBAEEAQwJIBlAPThhPFkoNQgc+AzsBOgA6ADwBPgJAAz8COwEgBjAFNgI8AD8AQgBDAEQARAJFA0gIThNNHU0cSxFECD4DPAE6ADkAOgE+A0MFQAM7AR4HLQQ0AjkAPgA/AEAAQQBCAUICRgZPEU4YThdKDUQHPwM7ATkBOAE6AT4CQAM+AjsAGgUoAy8CMwA2ADQANgA2ATUBOgE/AkkGTgxNDUcJQwU+AjoBOQE4ATgBOAE6AToBOgETBBoEHwIkASgBKgArACwALgAvADMBNwI+BUEGQQY/BDsCOgE5ATgBNQAzADMANgE7AQsDEAMVAhkBHQAfACEAIgAkACUAKQAtATICNwI6AzoDOQI4AjcCNgIxAC0ALgAyADsBBQEIAgsCDgERARQBFwEaABwAIAAjACcALAAxATYCOAM2AjUCNgM1Ay4AKAApADAAOwEDAQQBBwIJAQsBDgERARQBFgAaAB4AIwApAC4AMwE2AjcCNgI1AzMDLgEgACQALwI6AQEAAwEFAQcBCQELAQ0BDwERARQAGAAdACIBKQExATUBOQE4AjcCNAMtAxsAHwAuAzoB",
  hardEdge: "AQEDAAQABwAVAiUFMQQ3AjgBOwA7ADkAOQI1Ay8DJAAkAC0CMwM2AjgBOwE6ATgBOwEDAQUBBwAMABgCJgUxBTUDOAE5ATsBOgE5AjYBMgAuADIAOgM+BT8FPQQ7AzsCOgE7AQUCCAIKARAAGwIoBTEFNQM3AToBOwA8ADsAOgE2ADYAPQRGCksOSgxGCUIFPgM8ATsBCgYQBhMDGQIjBC0FMwQ2AzcBOgE7ATsAOgE6ATcAOQJECU4VThlOFUwPRgk/BDwCOwEUDhoLHwclBS0FMwQ2AzgCOQE6AToBOQE5ATgBNQE5A0UMTRtMH04ZTBJHDEAGOgI7AR8UJhEsDjAKMQY0BDQCOAI5AToBOgE5AToBOQE2ATkCQwlOFk4aTxVLDUYJQQU7ATsBJBkwGDUTNg0xBDMDNQI5AjkAOwA8ADsAOgE4ATMBMgE5BEULSg1JC0UHQQU/AzsBOwEkHi4ZNRU3DTADMgI1AjgCOQI5ATkBOAE5AjcCMgAtADEANwM7BTsFOgM6AzoCOQE7ARoYJBkqEy4LLQQxATYCOQE5ATkBOAE3AjYDMwMrACYAJwAsATECMwI0AjUBNwE5ATsBEA4aEh4LIwYoAy8CNgI6ATsAOwE6ATcCNQMxBCcBHQAcACIAKAIrAi4CMgE3ATkBOwENCxMKGAcfBCYDMAM2AjoBOwA7ADkBNgIzAy8FIwEVABUAHgEkAigCLAIvAjQBOQE7AQsIEAYVBBsCKAMyAjgCOQE6ATkAOwE5ATYDMAUiAg8ADwAZAiECJgErATABNAE3ATsBCwYRBBUCHAArAzMDOAI6ATsAOgA5ATgCNQMwBSMDEAAOABcBHwIkASoBLwEyATYBOwEQBRUEGgEkATEEOAQ4ATkAOwE6ATgBNgI0BDAFJAMUABMAGAAdAiICJgIsAjECNgE7ARQGHAUhAisCOgc/BjkCOQA7ADwAOgA2ATQEMAYkAxcAFQAaASADJAMnAy0DMQI0AjoBGAYiBCkBMwJGDEUIOwI5ADkBPAE5ATcBNQMxBScDGwAZAB8DIwYmBSoFLgQxAzUCOgEaByQEKQE3A0wRRgg7AToBOgE6ATgBOAI2AzMEKgMjAiEDJQYpCCsILQYwBTMDNgM7ARgHIQQnATICSw9FBzsBOQE4AToBOgE4ATgBNQMxBS0GKQgoCCkHLQYwBTMENQM3AjoBFQUcAyIBKQA9CDwGOAI4ATkBOwA9ADwBOQE1AzUHMwwvDCoIKAUqBC4EMgM0AjYCOwEOBBMDFwEgAC4DNwM6AjoAOwA7ADoBOAE2AjQDNwg6DTUMLAUmAicBKwIvAjICNgI7AQgCCwIOABYAIgIuBDUDOAE6ADsAOwE5ATYCNAQ0BzUKMAkpBCQBJQEpAi4CMQI1AjsBAwEFAQgADgAbAioFMwQ3AjoBOwE6ATgCNQIzBDEFLgUrBCgCKAEpASwBMAE0ATYBOwEBAQIAAwAIABUCJgYxBDcBOgA+ADsAOQE1AjIELgMoAicBJwEpASwCLwEyATUBNwE7AQEAAQACAAUAFAMkBjAFNwI6AT0APAA7ADoBNQMrAyIAHwAmASsDMQE0ADcBNwE3ATsB",
  artDeco: "BAAJARABGQEgAiMDIQcUAgcABgAIAAoBDgESARYBGwEfACQAKAAqAC4BMgE0ATgBOwEFAQoBEQEZASACJAQkBxcCCwAIAAkACgENARABFAEZAR4BIgEmASkBLQExATQBNwE6AQYBCwERARkBIgMnBiUGGwMQAAsACgALAQwBDwETAhgCHgIiAicCKgIuAjEBNAI3ATsBBwIMAhECGQMjBigIJwceBBUBDwANAAwBDgEQAhQDGgQfBSUFKQUtBDADMwI2AjcBOwEMBg8CFAIeBSYHKwgpByMFGwMVAhECDwIPAhEDFgQbBiIHKActBjAEMwM1AjcCOAI7ARINEAMVAh8EKgcsBi0GKwclBiAGFwQSAxACEgMWBRwGIwcpBy0GMQUzAzYCNgI4ATsBFRMSBBQBHgMoBSsFLgUuBzANKAwdBxYCEgEUAhcDHAQiBCgELAMvAzICNAI2AjgBOwEXFRUEFwEfASYCKwMsBC8IMQ8sDyAIFwITABQBGAIdAiECJgIrAi4BMQE1ATcBOAE7ARURFQUYASABJgErAioEKwgoCyQMHQcXAxUBFwAbASABJAEoASsBLgExATQBNgE4ATsBEQoWBhsBIgEpASwCKwMoBSQGIQcdBBkCGQEbAR4BIgEmASoBLAEvATIBNAE3ATgBOwERBxcEHwEoASwCLgMrBCIDHQIbAxoCGgIdASAAIwAnACsBLgExATIBNAE2ATYBOAE7AQ8EGAMiAisBMgExAi4EIwIZABcAGQEbAiABJgEpAC0ALwAzATUBNwE4ADgBOAE4AToBEgQbAyUCMQM3AzgDMwMnASAAHAAeACIBJQIqAS4BMwE2AjkCOwI7AjoBOgE6AToBOgEXBSIEMAM9BUUHRAY7BCwAJQAlACcAKwEvATUBOQI/BEMGRgdFBkMGQAQ9AzwCOgE7ARwGKwY4BkcMSxFKED0IMAEsAC8AMwA4ADsBQQNGB0sMThBPEk8RTQ1JCUQFQAM9ATsBHwcxCD4JTRRMH00YRAo4AjMANgA5AT0BQANGB0oOTRZMHUsgTB1NF0sQRgpBBTwCOwEmCDQGQQtMGEojTRtFDTgDMwA3AT0BPwJCBEcJSxFMG0sjSShLI0wbSxRGDEAGPAM7ASIIMgY/CU4TTR1NF0UMMwIxADQAOwA/AEICSQZMDU4VTR1LIUweThdKD0YKQQU8AjsBIActBTkFSQpOD0oOQQkvASoALgAzADcAOwA/A0MGSQpNEE8STxBNDUkJRAVAAzwBOwAYBSMELgM5BEEGQAc2BCkAIwAjACgAKwEvADMBNwM8BD8GQQdBBkAFPgQ9AjsBOwE7ARADGAQiAykDMQQzBS4EIwAcABoAHQAfASMBJgEqAS8BMwI2AjgCOQE5ATkBOQE5ATsBCwEUAh0CJQEqAywFJgUaAREAEQATABgBGgEeASIBJgEqAS0BMAEzATYBOAE5AToBOwEHAQ4BGQEiAScBKAMmBxQBCQAKAAwAEAEVARoBHgEiASYBKQEsAS8AMwA1ATcBNwE7AQUACwETARwBIwImBCEIEgIHAAcACQANAREBFgEaAR4AIgAmACsALAEvATMBNgE5ATsB"
};

// ../../../shared/drawingml/src/bevel.ts
var wordTabs = /* @__PURE__ */ new Map();
function wordTable(b) {
  if (!b.word || b.rig && b.rig !== "threePt" || b.dir && b.dir !== "t" || b.material && b.material !== "warmMatte") return void 0;
  const k = b.prst ?? "circle";
  const raw = WORD_BEVEL[k];
  if (!raw) return void 0;
  let t = wordTabs.get(k);
  if (!t) {
    const bin = atob(raw);
    t = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
    wordTabs.set(k, t);
  }
  return t;
}
function wordLight(t, thDeg, u, out) {
  const NA = 24, NT = 24;
  const th = (thDeg % 360 + 360) % 360;
  const ai = th / 15 - 0.5, a0 = (Math.floor(ai) % NA + NA) % NA, a1 = (a0 + 1) % NA, fa = ai - Math.floor(ai);
  const ti = Math.max(0, Math.min(NT - 1, u * NT - 0.5)), t0 = Math.floor(ti), t1 = Math.min(NT, t0 + 1), ft = ti - t0;
  const at = (a, k, c) => t[(a * (NT + 1) + k) * 2 + c];
  for (let c = 0; c < 2; c++) {
    const v = (at(a0, t0, c) * (1 - ft) + at(a0, t1, c) * ft) * (1 - fa) + (at(a1, t0, c) * (1 - ft) + at(a1, t1, c) * ft) * fa;
    if (c === 0) out[0] = out[1] = out[2] = v * 0.02;
    else out[3] = v / 255;
  }
}
var SRGB_LIN = new Float32Array(256);
for (let v = 0; v < 256; v++) {
  const x = v / 255;
  SRGB_LIN[v] = x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
var LIN_SRGB = new Uint8Array(4096);
for (let i = 0; i < 4096; i++) {
  const x = i / 4095;
  LIN_SRGB[i] = Math.round(255 * (x <= 31308e-7 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055));
}
function shadeBevel(rgba, sil, b) {
  const wt = wordTable(b);
  const tab = lightTable(b.rig, b.material);
  if (!tab && !wt || !(b.w > 0.5)) return;
  const { w: W, h: H } = sil;
  const P = { w: W + 2, h: H + 2, a: new Float32Array((W + 2) * (H + 2)) };
  for (let r = 0; r < H; r++) P.a.set(sil.a.subarray(r * W, r * W + W), (r + 1) * (W + 2) + 1);
  const pd = distanceTo(P, false);
  const dist = new Float32Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) dist[r * W + c] = pd[(r + 1) * (W + 2) + c + 1];
  const sm = gaussianBlur({ w: W, h: H, a: dist }, 1.2).a;
  const hw = b.h / b.w;
  const L = new Float32Array(4), face = new Float32Array(4);
  if (wt) {
    const o = 24 * 25 * 2 - 2;
    face[0] = face[1] = face[2] = wt[o] * 0.02;
    face[3] = wt[o + 1] / 255;
  } else lightFace(tab, face);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c, a = sil.a[i];
      if (a <= 0) continue;
      const d = dist[i];
      let lt = face;
      if (d < b.w) {
        const g = (cc, rr) => sm[Math.min(H - 1, Math.max(0, rr)) * W + Math.min(W - 1, Math.max(0, cc))];
        const gx = g(c + 1, r - 1) + 2 * g(c + 1, r) + g(c + 1, r + 1) - g(c - 1, r - 1) - 2 * g(c - 1, r) - g(c - 1, r + 1);
        const gy = g(c - 1, r + 1) + 2 * g(c, r + 1) + g(c + 1, r + 1) - g(c - 1, r - 1) - 2 * g(c, r - 1) - g(c + 1, r - 1);
        const th = Math.atan2(-gy, -gx) * 180 / Math.PI;
        if (wt) wordLight(wt, th, d / b.w, L);
        else {
          const ph = bevelPhi(b.prst, d / b.w, hw);
          lightAt(tab, b.dir, ph < 0 ? th + 180 : th, Math.abs(ph), L);
        }
        lt = L;
      }
      const o = i * 4;
      for (let k = 0; k < 3; k++) {
        const v = SRGB_LIN[rgba[o + k]] * lt[k] + lt[3];
        const nv = LIN_SRGB[Math.max(0, Math.min(4095, Math.round(v * 4095)))];
        rgba[o + k] = a >= 1 ? nv : Math.round(rgba[o + k] + (nv - rgba[o + k]) * a);
      }
    }
  }
}

// src/page-design.ts
var GRADIENT_VARIANTS = {
  horizontal: 4,
  vertical: 4,
  diagonalUp: 4,
  diagonalDown: 4,
  fromCorner: 4,
  fromCenter: 2
};
function gradientGeometry(style, variant) {
  const v = Math.max(1, Math.min(GRADIENT_VARIANTS[style], Math.round(variant))) - 1;
  const pick = (arr) => arr[v];
  switch (style) {
    case "horizontal":
      return { type: "gradient", focus: pick([100, 0, 50, -50]) };
    case "vertical":
      return { type: "gradient", angle: -90, focus: pick([100, 0, -50, 50]) };
    case "diagonalUp":
      return { type: "gradient", angle: -135, focus: pick([100, 0, -50, 50]) };
    case "diagonalDown":
      return { type: "gradient", angle: -45, focus: pick([0, 100, -50, 50]) };
    case "fromCorner": {
      const fp = pick([void 0, [1, 0], [0, 1], [1, 1]]);
      return { type: "gradientRadial", focus: 100, gradientCenter: true, ...fp ? { focusPosition: fp } : {} };
    }
    case "fromCenter":
      return { type: "gradientRadial", focusPosition: [0.5, 0.5], focus: pick([100, 0]) };
  }
}
var GRADIENT_PRESETS = [
  { id: "mist", name: { en: "Mist", pt: "N\xE9voa" }, stops: [{ pos: 0, color: "EEF2F7" }, { pos: 1, color: "B8C6D9" }] },
  { id: "sand", name: { en: "Sand", pt: "Areia" }, stops: [{ pos: 0, color: "FBF3E4" }, { pos: 0.6, color: "EAD6B0" }, { pos: 1, color: "C9A66B" }] },
  { id: "lavender", name: { en: "Lavender", pt: "Lavanda" }, stops: [{ pos: 0, color: "F4EEFB" }, { pos: 1, color: "B9A2DD" }] },
  { id: "mint", name: { en: "Mint", pt: "Menta" }, stops: [{ pos: 0, color: "EAF8F1" }, { pos: 1, color: "8FD3B6" }] },
  { id: "coral", name: { en: "Coral", pt: "Coral" }, stops: [{ pos: 0, color: "FFF1EC" }, { pos: 0.5, color: "FFB49A" }, { pos: 1, color: "E8735A" }] },
  { id: "slate", name: { en: "Slate", pt: "Ard\xF3sia" }, stops: [{ pos: 0, color: "5B6B7F" }, { pos: 1, color: "1F2A38" }] },
  { id: "aurora", name: { en: "Aurora", pt: "Aurora" }, stops: [{ pos: 0, color: "163A5F" }, { pos: 0.45, color: "1D8C82" }, { pos: 1, color: "B9E77A" }] },
  { id: "citrus", name: { en: "Citrus", pt: "C\xEDtrico" }, stops: [{ pos: 0, color: "FFF9C4" }, { pos: 0.5, color: "FFD54F" }, { pos: 1, color: "FF9F43" }] }
];
function pageFillFrom(input, lang, patternGif) {
  if (input.type === "pattern") {
    const p = WORD_PATTERNS.find((x) => x.prst === input.pattern);
    const gif = patternGif(input.pattern);
    if (!p || !gif) return null;
    return { color: input.color, fill: { type: "pattern", color: input.color, color2: `#${input.background.toLowerCase()}`, title: p.title[lang], image: { data: gif, ext: "gif" } } };
  }
  if (input.type === "picture" || input.type === "texture") {
    const ext = input.ext.toLowerCase() === "jpg" ? "jpeg" : input.ext.toLowerCase();
    return { fill: { type: input.type === "picture" ? "frame" : "tile", title: input.name.replace(/\.[^.]+$/, ""), image: { data: input.data, ext } } };
  }
  if (input.type !== "gradient") return null;
  const geo = gradientGeometry(input.style, input.variant);
  if (input.colors === "one") {
    return { color: input.color, fill: { ...geo, color: input.color, color2: oneColorGradientColor2(input.degree), method: "linear sigma" } };
  }
  if (input.colors === "two") {
    return { color: input.color, fill: { ...geo, color: input.color, color2: `#${input.color2.toLowerCase()}` } };
  }
  const pre = GRADIENT_PRESETS.find((p) => p.id === input.preset) ?? GRADIENT_PRESETS[0];
  const first = pre.stops[0].color, last = pre.stops[pre.stops.length - 1].color;
  return { color: first, fill: { ...geo, color: first, color2: `#${last.toLowerCase()}`, colors: pre.stops, method: "none" } };
}
function themeTintShade(ref) {
  const hex = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).toUpperCase().padStart(2, "0");
  if (ref.tint && ref.tint > 0) return { themeTint: hex(255 * (1 - ref.tint)) };
  if (ref.shade && ref.shade > 0) return { themeShade: hex(255 * (1 - ref.shade)) };
  return {};
}

// src/picture-ops.ts
var STEP = 19050;
var up = (v) => v <= 0.5 ? 0 : Math.ceil(v / STEP - 1e-6) * STEP;
function effectExtentOf(f) {
  const { cx, cy } = f;
  let l = 0, t = 0, r = 0, b = 0;
  const grow = (L, T4, R, B2) => {
    l = Math.max(l, L);
    t = Math.max(t, T4);
    r = Math.max(r, R);
    b = Math.max(b, B2);
  };
  let ex = 0, ey = 0;
  if (f.rot) {
    const a = f.rot / 6e4 * Math.PI / 180;
    const bw = Math.abs(cx * Math.cos(a)) + Math.abs(cy * Math.sin(a));
    const bh = Math.abs(cx * Math.sin(a)) + Math.abs(cy * Math.cos(a));
    ex = (bw - cx) / 2;
    ey = (bh - cy) / 2;
    grow(ex, ey, ex, ey);
  }
  const ln = f.line;
  if (ln && ln.fill !== null && (ln.fill !== void 0 || ln.fillRaw)) {
    const w = ln.w ?? 9525;
    grow(ex + w, ey + w, ex + w, ey + w);
  }
  const fx = f.effects;
  const s = fx.shadow;
  if (s && s.kind === "outer") {
    const blur = s.blurRad ?? 0, d = s.dist ?? 0;
    const a = (s.dir ?? 0) / 6e4 * Math.PI / 180;
    const dx = d * Math.cos(a), dy = d * Math.sin(a);
    const sx = (s.sx ?? 1e5) / 1e5, sy = (s.sy ?? 1e5) / 1e5;
    const kx = Math.tan((s.kx ?? 0) / 6e4 * Math.PI / 180), ky = Math.tan((s.ky ?? 0) / 6e4 * Math.PI / 180);
    const al = s.algn ?? "b";
    const ax = al.includes("l") ? 0 : al.includes("r") ? 1 : 0.5;
    const ay = al.startsWith("t") ? 0 : al.startsWith("b") ? 1 : 0.5;
    const corners = [[0, 0], [cx, 0], [0, cy], [cx, cy]].map(([x, y]) => {
      const px = ax * cx + (x - ax * cx) * sx + (y - ay * cy) * kx * sy;
      const py = ay * cy + (y - ay * cy) * sy + (x - ax * cx) * ky * sx;
      return [px + dx, py + dy];
    });
    const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
    grow(blur - Math.min(...xs), blur - Math.min(...ys), Math.max(...xs) - cx + blur, Math.max(...ys) - cy + blur);
  }
  if (fx.glow) grow(fx.glow.rad + ex, fx.glow.rad + ey, fx.glow.rad + ex, fx.glow.rad + ey);
  const rf = fx.reflection;
  if (rf) {
    const blur = rf.blurRad ?? 0;
    const span = (rf.endPos ?? 1e5) / 1e5 * cy;
    grow(blur, 0, blur, (rf.dist ?? 0) + span + blur * 4);
  }
  return { l: up(l), t: up(t), r: up(r), b: up(b) };
}
var Z_FIRST = 251658240;
function zFor(op, mine, others) {
  const all = others.filter((v) => v !== mine).sort((a, b) => a - b);
  if (!all.length) return mine;
  const max = all[all.length - 1], min = all[0];
  if (op === "front") return max + 1024;
  if (op === "back") return min - 1025;
  if (op === "forward") {
    const above = all.filter((v) => v > mine);
    if (!above.length) return mine;
    const next = above[0], after = above[1];
    return after === void 0 ? next + 1024 : Math.floor((next + after) / 2);
  }
  const below = all.filter((v) => v < mine);
  if (!below.length) return mine;
  const prev = below[below.length - 1], before = below[below.length - 2];
  return before === void 0 ? prev - 1025 : Math.floor((prev + before) / 2);
}
function fillFitCrop(mode, box, natural) {
  const boxA = box.cx / box.cy, imgA = natural.w / natural.h;
  const r = { l: 0, t: 0, r: 0, b: 0 };
  if (Math.abs(boxA - imgA) < 1e-9) return r;
  const wide = boxA > imgA;
  if (mode === "fill") {
    if (wide) r.t = r.b = Math.round((1 - imgA / boxA) / 2 * 1e5);
    else r.l = r.r = Math.round((1 - boxA / imgA) / 2 * 1e5);
  } else {
    if (wide) r.l = r.r = -Math.round((boxA / imgA - 1) / 2 * 1e5);
    else r.t = r.b = -Math.round((imgA / boxA - 1) / 2 * 1e5);
  }
  return r;
}
function aspectCrop(f, ratio) {
  const s = f.srcRect;
  const visW = 1 - (s.l + s.r) / 1e5, visH = 1 - (s.t + s.b) / 1e5;
  const fullW = f.cx / visW, fullH = f.cy / visH;
  let cx = f.cx, cy = f.cy;
  if (cx / cy > ratio) cx = cy * ratio;
  else cy = cx / ratio;
  const dx = (f.cx - cx) / 2 / fullW, dy = (f.cy - cy) / 2 / fullH;
  return {
    crop: { l: Math.round(s.l + dx * 1e5), r: Math.round(s.r + dx * 1e5), t: Math.round(s.t + dy * 1e5), b: Math.round(s.b + dy * 1e5) },
    cx: Math.round(cx),
    cy: Math.round(cy)
  };
}
var ASPECT_RATIOS = [
  { id: "1:1", group: "square", w: 1, h: 1 },
  { id: "2:3", group: "portrait", w: 2, h: 3 },
  { id: "3:4", group: "portrait", w: 3, h: 4 },
  { id: "3:5", group: "portrait", w: 3, h: 5 },
  { id: "4:5", group: "portrait", w: 4, h: 5 },
  { id: "3:2", group: "landscape", w: 3, h: 2 },
  { id: "4:3", group: "landscape", w: 4, h: 3 },
  { id: "5:3", group: "landscape", w: 5, h: 3 },
  { id: "5:4", group: "landscape", w: 5, h: 4 },
  { id: "16:9", group: "landscape", w: 16, h: 9 },
  { id: "16:10", group: "landscape", w: 16, h: 10 }
];
var CROP_SHAPES = [
  { label: { en: "Rectangles", pt: "Ret\xE2ngulos" }, shapes: [
    ["rect", "Rectangle", "Ret\xE2ngulo"],
    ["roundRect", "Rectangle: Rounded Corners", "Ret\xE2ngulo: Cantos Arredondados"],
    ["snip1Rect", "Rectangle: Single Corner Snipped", "Ret\xE2ngulo: \xDAnico Canto Recortado"],
    ["snip2SameRect", "Rectangle: Top Corners Snipped", "Ret\xE2ngulo: Cantos Superiores Recortados"],
    ["snip2DiagRect", "Rectangle: Diagonal Corners Snipped", "Ret\xE2ngulo: Cantos Diagonais Recortados"],
    ["snipRoundRect", "Rectangle: Top Corners One Rounded and One Snipped", "Ret\xE2ngulo: Cantos Superiores, Um Arredondado e Um Recortado"],
    ["round1Rect", "Rectangle: Single Corner Rounded", "Ret\xE2ngulo: \xDAnico Canto Arredondado"],
    ["round2SameRect", "Rectangle: Top Corners Rounded", "Ret\xE2ngulo: Cantos Superiores Arredondados"],
    ["round2DiagRect", "Rectangle: Diagonal Corners Rounded", "Ret\xE2ngulo: Cantos Diagonais Arredondados"]
  ] },
  { label: { en: "Basic Shapes", pt: "Formas B\xE1sicas" }, shapes: [
    ["ellipse", "Oval", "Elipse"],
    ["triangle", "Isosceles Triangle", "Tri\xE2ngulo Is\xF3sceles"],
    ["rtTriangle", "Right Triangle", "Tri\xE2ngulo Ret\xE2ngulo"],
    ["parallelogram", "Parallelogram", "Paralelogramo"],
    ["trapezoid", "Trapezoid", "Trapezoide"],
    ["diamond", "Diamond", "Losango"],
    ["pentagon", "Regular Pentagon", "Pent\xE1gono Regular"],
    ["hexagon", "Hexagon", "Hex\xE1gono"],
    ["heptagon", "Heptagon", "Hept\xE1gono"],
    ["octagon", "Octagon", "Oct\xF3gono"],
    ["decagon", "Decagon", "Dec\xE1gono"],
    ["dodecagon", "Dodecagon", "Dodec\xE1gono"],
    ["pie", "Partial Circle", "C\xEDrculo Parcial"],
    ["chord", "Chord", "Corda"],
    ["teardrop", "Teardrop", "L\xE1grima"],
    ["frame", "Frame", "Moldura"],
    ["halfFrame", "Half Frame", "Meia Moldura"],
    ["corner", "L-Shape", "Forma em L"],
    ["diagStripe", "Diagonal Stripe", "Faixa Diagonal"],
    ["plus", "Cross", "Cruz"],
    ["plaque", "Plaque", "Placa"],
    ["can", "Cylinder", "Cilindro"],
    ["cube", "Cube", "Cubo"],
    ["bevel", "Rectangle: Beveled", "Ret\xE2ngulo: Chanfrado"],
    ["donut", "Circle: Hollow", "C\xEDrculo: Vazado"],
    ["noSmoking", '"No" Symbol', 'S\xEDmbolo "N\xE3o"'],
    ["blockArc", "Block Arc", "Arco Fechado"],
    ["foldedCorner", "Rectangle: Folded Corner", "Ret\xE2ngulo: Canto Dobrado"],
    ["smileyFace", "Smiley Face", "Rosto Feliz"],
    ["heart", "Heart", "Cora\xE7\xE3o"],
    ["lightningBolt", "Lightning Bolt", "Raio"],
    ["sun", "Sun", "Sol"],
    ["moon", "Moon", "Lua"],
    ["cloud", "Cloud", "Nuvem"],
    ["arc", "Arc", "Arco"],
    ["bracketPair", "Double Bracket", "Colchetes Duplos"],
    ["bracePair", "Double Brace", "Chaves Duplas"],
    ["leftBracket", "Left Bracket", "Colchete Esquerdo"],
    ["rightBracket", "Right Bracket", "Colchete Direito"],
    ["leftBrace", "Left Brace", "Chave Esquerda"],
    ["rightBrace", "Right Brace", "Chave Direita"]
  ] },
  { label: { en: "Block Arrows", pt: "Setas Largas" }, shapes: [
    ["rightArrow", "Arrow: Right", "Seta: para a Direita"],
    ["leftArrow", "Arrow: Left", "Seta: para a Esquerda"],
    ["upArrow", "Arrow: Up", "Seta: para Cima"],
    ["downArrow", "Arrow: Down", "Seta: para Baixo"],
    ["leftRightArrow", "Arrow: Left-Right", "Seta: Esquerda e Direita"],
    ["upDownArrow", "Arrow: Up-Down", "Seta: para Cima e para Baixo"],
    ["quadArrow", "Arrow: Quad", "Seta: Cruzada"],
    ["leftRightUpArrow", "Arrow: Left-Right-Up", "Seta: para a Esquerda, para a Direita e para Cima"],
    ["bentArrow", "Arrow: Bent", "Seta: Dobrada"],
    ["uturnArrow", "Arrow: U-Turn", "Seta: em Forma de U"],
    ["leftUpArrow", "Arrow: Left-Up", "Seta: para a Esquerda e para Cima"],
    ["bentUpArrow", "Arrow: Bent-Up", "Seta: Dobrada para Cima"],
    ["curvedRightArrow", "Arrow: Curved Right", "Seta: Curvada para a Direita"],
    ["curvedLeftArrow", "Arrow: Curved Left", "Seta: Curvada para a Esquerda"],
    ["curvedUpArrow", "Arrow: Curved Up", "Seta: Curvada para Cima"],
    ["curvedDownArrow", "Arrow: Curved Down", "Seta: Curvada para Baixo"],
    ["stripedRightArrow", "Arrow: Striped Right", "Seta: Listrada para a Direita"],
    ["notchedRightArrow", "Arrow: Notched Right", "Seta: Entalhada para a Direita"],
    ["homePlate", "Arrow: Pentagon", "Seta: Pent\xE1gono"],
    ["chevron", "Arrow: Chevron", "Seta: Divisa"],
    ["rightArrowCallout", "Callout: Right Arrow", "Texto Explicativo: Seta para a Direita"],
    ["downArrowCallout", "Callout: Down Arrow", "Texto Explicativo: Seta para Baixo"],
    ["leftArrowCallout", "Callout: Left Arrow", "Texto Explicativo: Seta para a Esquerda"],
    ["upArrowCallout", "Callout: Up Arrow", "Texto Explicativo: Seta para Cima"],
    ["leftRightArrowCallout", "Callout: Left-Right Arrow", "Texto Explicativo: Seta para a Esquerda e para a Direita"],
    ["quadArrowCallout", "Callout: Quad Arrow", "Texto Explicativo: Seta Cruzada"],
    ["circularArrow", "Arrow: Circular", "Seta: Circular"]
  ] },
  { label: { en: "Equation Shapes", pt: "Formas de Equa\xE7\xE3o" }, shapes: [
    ["mathPlus", "Plus Sign", "Sinal de Adi\xE7\xE3o"],
    ["mathMinus", "Minus Sign", "Sinal de Subtra\xE7\xE3o"],
    ["mathMultiply", "Multiplication Sign", "Sinal de Multiplica\xE7\xE3o"],
    ["mathDivide", "Division Sign", "Sinal de Divis\xE3o"],
    ["mathEqual", "Equals", "Igual a"],
    ["mathNotEqual", "Not Equal", "Diferente de"]
  ] },
  { label: { en: "Flowchart", pt: "Fluxograma" }, shapes: [
    ["Process", "Process", "Processo"],
    ["AlternateProcess", "Alternate Process", "Processo Alternativo"],
    ["Decision", "Decision", "Decis\xE3o"],
    ["InputOutput", "Data", "Dados"],
    ["PredefinedProcess", "Predefined Process", "Processo Predefinido"],
    ["InternalStorage", "Internal Storage", "Armazenamento Interno"],
    ["Document", "Document", "Documento"],
    ["Multidocument", "Multidocument", "V\xE1rios Documentos"],
    ["Terminator", "Terminator", "Termina\xE7\xE3o"],
    ["Preparation", "Preparation", "Prepara\xE7\xE3o"],
    ["ManualInput", "Manual Input", "Entrada Manual"],
    ["ManualOperation", "Manual Operation", "Opera\xE7\xE3o Manual"],
    ["Connector", "Connector", "Conector"],
    ["OffpageConnector", "Off-page Connector", "Conector Fora da P\xE1gina"],
    ["PunchedCard", "Card", "Cart\xE3o"],
    ["PunchedTape", "Punched Tape", "Fita Perfurada"],
    ["SummingJunction", "Summing Junction", "Jun\xE7\xE3o de Soma"],
    ["Or", "Or", "Ou"],
    ["Collate", "Collate", "Agrupar"],
    ["Sort", "Sort", "Classificar"],
    ["Extract", "Extract", "Extrair"],
    ["Merge", "Merge", "Mesclar"],
    ["OnlineStorage", "Stored Data", "Dados Armazenados"],
    ["Delay", "Delay", "Atraso"],
    ["MagneticTape", "Sequential Access Storage", "Armazenamento de Acesso Sequencial"],
    ["MagneticDisk", "Magnetic Disk", "Disco Magn\xE9tico"],
    ["MagneticDrum", "Direct Access Storage", "Armazenamento de Acesso Direto"],
    ["Display", "Display", "Exibir"]
  ].map(([k, en, pt]) => [`flowChart${k}`, `Flowchart: ${en}`, `Fluxograma: ${pt}`]) },
  { label: { en: "Stars and Banners", pt: "Estrelas e Faixas" }, shapes: [
    ["irregularSeal1", "Explosion: 8 Points", "Explos\xE3o: 8 Pontos"],
    ["irregularSeal2", "Explosion: 14 Points", "Explos\xE3o: 14 Pontos"],
    ["star4", "Star: 4 Points", "Estrela: 4 Pontas"],
    ["star5", "Star: 5 Points", "Estrela: 5 Pontas"],
    ["star6", "Star: 6 Points", "Estrela: 6 Pontas"],
    ["star7", "Star: 7 Points", "Estrela: 7 Pontas"],
    ["star8", "Star: 8 Points", "Estrela: 8 Pontas"],
    ["star10", "Star: 10 Points", "Estrela: 10 Pontas"],
    ["star12", "Star: 12 Points", "Estrela: 12 Pontas"],
    ["star16", "Star: 16 Points", "Estrela: 16 Pontas"],
    ["star24", "Star: 24 Points", "Estrela: 24 Pontas"],
    ["star32", "Star: 32 Points", "Estrela: 32 Pontas"],
    ["ribbon2", "Ribbon: Tilted Up", "Faixa: Inclinada para Cima"],
    ["ribbon", "Ribbon: Tilted Down", "Faixa: Inclinada para Baixo"],
    ["ellipseRibbon2", "Ribbon: Curved and Tilted Up", "Faixa: Curvada e Inclinada para Cima"],
    ["ellipseRibbon", "Ribbon: Curved and Tilted Down", "Faixa: Curvada e Inclinada para Baixo"],
    ["verticalScroll", "Scroll: Vertical", "Rolagem: Vertical"],
    ["horizontalScroll", "Scroll: Horizontal", "Rolagem: Horizontal"],
    ["wave", "Wave", "Onda"],
    ["doubleWave", "Double Wave", "Onda Dupla"]
  ] },
  { label: { en: "Callouts", pt: "Textos Explicativos" }, shapes: [
    ["wedgeRectCallout", "Speech Bubble: Rectangle", "Bal\xE3o de Fala: Ret\xE2ngulo"],
    ["wedgeRoundRectCallout", "Speech Bubble: Rectangle with Corners Rounded", "Bal\xE3o de Fala: Ret\xE2ngulo com Cantos Arredondados"],
    ["wedgeEllipseCallout", "Speech Bubble: Oval", "Bal\xE3o de Fala: Oval"],
    ["cloudCallout", "Thought Bubble: Cloud", "Bal\xE3o de Pensamento: Nuvem"],
    ["borderCallout1", "Callout: Line", "Texto Explicativo: Linha"],
    ["borderCallout2", "Callout: Bent Line", "Texto Explicativo: Linha Dobrada"],
    ["borderCallout3", "Callout: Double Bent Line", "Texto Explicativo: Linha Dobrada Dupla"],
    ["accentCallout1", "Callout: Line with Accent Bar", "Texto Explicativo: Linha com Barra de \xCAnfase"],
    ["accentCallout2", "Callout: Bent Line with Accent Bar", "Texto Explicativo: Linha Dobrada com Barra de \xCAnfase"],
    ["accentCallout3", "Callout: Double Bent Line with Accent Bar", "Texto Explicativo: Linha Dobrada Dupla com Barra de \xCAnfase"],
    ["callout1", "Callout: Line with No Border", "Texto Explicativo: Linha sem Borda"],
    ["callout2", "Callout: Bent Line with No Border", "Texto Explicativo: Linha Dobrada sem Borda"],
    ["callout3", "Callout: Double Bent Line with No Border", "Texto Explicativo: Linha Dobrada Dupla sem Borda"],
    ["accentBorderCallout1", "Callout: Line with Border and Accent Bar", "Texto Explicativo: Linha com Borda e Barra de \xCAnfase"],
    ["accentBorderCallout2", "Callout: Bent Line with Border and Accent Bar", "Texto Explicativo: Linha Dobrada com Borda e Barra de \xCAnfase"],
    ["accentBorderCallout3", "Callout: Double Bent Line with Border and Accent Bar", "Texto Explicativo: Linha Dobrada Dupla com Borda e Barra de \xCAnfase"]
  ] }
];
var black = (alpha) => ({ kind: "prstClr", val: "black", ...alpha !== void 0 ? { mods: [["alpha", alpha]] } : {} });
var SHADOW_PRESETS = [
  { id: "outer-br", group: "outer", label: { en: "Offset: Bottom Right", pt: "Deslocamento: Inferior Direito" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, dir: 27e5, algn: "tl", color: black(4e4) } },
  { id: "outer-b", group: "outer", label: { en: "Offset: Bottom", pt: "Deslocamento: Inferior" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, dir: 54e5, algn: "t", color: black(4e4) } },
  { id: "outer-bl", group: "outer", label: { en: "Offset: Bottom Left", pt: "Deslocamento: Inferior Esquerdo" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, dir: 81e5, algn: "tr", color: black(4e4) } },
  { id: "outer-r", group: "outer", label: { en: "Offset: Right", pt: "Deslocamento: Direita" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, algn: "l", color: black(4e4) } },
  { id: "outer-c", group: "outer", label: { en: "Offset: Center", pt: "Deslocamento: Centro" }, shadow: { kind: "outer", blurRad: 63500, sx: 102e3, sy: 102e3, algn: "ctr", color: black(4e4) } },
  { id: "outer-l", group: "outer", label: { en: "Offset: Left", pt: "Deslocamento: Esquerda" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, dir: 108e5, algn: "r", color: black(4e4) } },
  { id: "outer-tr", group: "outer", label: { en: "Offset: Top Right", pt: "Deslocamento: Superior Direito" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, dir: 189e5, algn: "bl", color: black(4e4) } },
  { id: "outer-t", group: "outer", label: { en: "Offset: Top", pt: "Deslocamento: Superior" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, dir: 162e5, color: black(4e4) } },
  { id: "outer-tl", group: "outer", label: { en: "Offset: Top Left", pt: "Deslocamento: Superior Esquerdo" }, shadow: { kind: "outer", blurRad: 50800, dist: 38100, dir: 135e5, algn: "br", color: black(4e4) } },
  { id: "inner-tl", group: "inner", label: { en: "Inside: Top Left", pt: "Interna: Superior Esquerda" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, dir: 135e5, color: black(5e4) } },
  { id: "inner-t", group: "inner", label: { en: "Inside: Top", pt: "Interna: Superior" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, dir: 162e5, color: black(5e4) } },
  { id: "inner-tr", group: "inner", label: { en: "Inside: Top Right", pt: "Interna: Superior Direita" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, dir: 189e5, color: black(5e4) } },
  { id: "inner-l", group: "inner", label: { en: "Inside: Left", pt: "Interna: Esquerda" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, dir: 108e5, color: black(5e4) } },
  { id: "inner-c", group: "inner", label: { en: "Inside: Center", pt: "Interna: Centro" }, shadow: { kind: "inner", blurRad: 114300, color: black() } },
  { id: "inner-r", group: "inner", label: { en: "Inside: Right", pt: "Interna: Direita" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, color: black(5e4) } },
  { id: "inner-bl", group: "inner", label: { en: "Inside: Bottom Left", pt: "Interna: Inferior Esquerda" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, dir: 81e5, color: black(5e4) } },
  { id: "inner-b", group: "inner", label: { en: "Inside: Bottom", pt: "Interna: Inferior" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, dir: 54e5, color: black(5e4) } },
  { id: "inner-br", group: "inner", label: { en: "Inside: Bottom Right", pt: "Interna: Inferior Direita" }, shadow: { kind: "inner", blurRad: 63500, dist: 50800, dir: 27e5, color: black(5e4) } },
  { id: "persp-ul", group: "persp", label: { en: "Perspective: Upper Left", pt: "Perspectiva: Superior Esquerda" }, shadow: { kind: "outer", blurRad: 76200, dir: 135e5, sy: 23e3, kx: 12e5, algn: "br", color: black(2e4) } },
  { id: "persp-ur", group: "persp", label: { en: "Perspective: Upper Right", pt: "Perspectiva: Superior Direita" }, shadow: { kind: "outer", blurRad: 76200, dir: 189e5, sy: 23e3, kx: -12e5, algn: "bl", color: black(2e4) } },
  { id: "persp-below", group: "persp", label: { en: "Perspective: Below", pt: "Perspectiva: Abaixo" }, shadow: { kind: "outer", blurRad: 152400, dist: 317500, dir: 54e5, sx: 9e4, sy: -19e3, color: black(15e3) } },
  { id: "persp-ll", group: "persp", label: { en: "Perspective: Lower Left", pt: "Perspectiva: Inferior Esquerda" }, shadow: { kind: "outer", blurRad: 76200, dist: 12700, dir: 81e5, sy: -23e3, kx: 800400, algn: "br", color: black(2e4) } },
  { id: "persp-lr", group: "persp", label: { en: "Perspective: Lower Right", pt: "Perspectiva: Inferior Direita" }, shadow: { kind: "outer", blurRad: 76200, dist: 12700, dir: 27e5, sy: -23e3, kx: -800400, algn: "bl", color: black(2e4) } }
];
var refl = (stA, endA, endPos, dist) => ({
  blurRad: 6350,
  stA,
  endA,
  endPos,
  ...dist ? { dist } : {},
  dir: 54e5,
  sy: -1e5,
  algn: "bl",
  rotWithShape: false
});
var REFLECTION_PRESETS = [
  { id: "tight-touch", label: { en: "Tight Reflection: Touching", pt: "Reflexo Justo: Encostado" }, reflection: refl(52e3, 300, 35e3) },
  { id: "half-touch", label: { en: "Half Reflection: Touching", pt: "Meio Reflexo: Encostado" }, reflection: refl(5e4, 300, 55e3) },
  { id: "full-touch", label: { en: "Full Reflection: Touching", pt: "Reflexo Total: Encostado" }, reflection: refl(5e4, 300, 9e4) },
  { id: "tight-4", label: { en: "Tight Reflection: 4 pt offset", pt: "Reflexo Justo: Deslocamento de 4 pt" }, reflection: refl(5e4, 300, 38500, 50800) },
  { id: "half-4", label: { en: "Half Reflection: 4 pt offset", pt: "Meio Reflexo: Deslocamento de 4 pt" }, reflection: refl(5e4, 300, 55500, 50800) },
  { id: "full-4", label: { en: "Full Reflection: 4 pt offset", pt: "Reflexo Total: Deslocamento de 4 pt" }, reflection: refl(5e4, 300, 9e4, 50800) },
  { id: "tight-8", label: { en: "Tight Reflection: 8 pt offset", pt: "Reflexo Justo: Deslocamento de 8 pt" }, reflection: refl(5e4, 275, 4e4, 101600) },
  { id: "half-8", label: { en: "Half Reflection: 8 pt offset", pt: "Meio Reflexo: Deslocamento de 8 pt" }, reflection: refl(5e4, 300, 55500, 101600) },
  { id: "full-8", label: { en: "Full Reflection: 8 pt offset", pt: "Reflexo Total: Deslocamento de 8 pt" }, reflection: refl(5e4, 295, 92e3, 101600) }
];
var SOFT_EDGE_PRESETS = [12700, 31750, 63500, 127e3, 317500, 635e3];
var GLOW_SIZES = [63500, 101600, 139700, 228600];
var glowPreset = (rad, accent2) => ({ rad, color: { kind: "schemeClr", val: `accent${accent2}`, mods: [["alpha", 4e4]] } });
var BEVEL_PRESETS = [
  { prst: "circle", label: { en: "Circle", pt: "C\xEDrculo" } },
  { prst: "relaxedInset", label: { en: "Relaxed Inset", pt: "Inser\xE7\xE3o Leve" } },
  { prst: "cross", label: { en: "Cross", pt: "Cruz" } },
  { prst: "coolSlant", label: { en: "Cool Slant", pt: "Inclina\xE7\xE3o Suave" } },
  { prst: "angle", label: { en: "Angle", pt: "\xC2ngulo" } },
  { prst: "softRound", label: { en: "Soft Round", pt: "Arredondamento Suave" } },
  { prst: "convex", label: { en: "Convex", pt: "Convexo" } },
  { prst: "slope", label: { en: "Slope", pt: "Declive" } },
  { prst: "divot", label: { en: "Divot", pt: "Torr\xE3o" } },
  { prst: "riblet", label: { en: "Riblet", pt: "Ondulado" } },
  { prst: "hardEdge", label: { en: "Hard Edge", pt: "Borda R\xEDgida" } },
  { prst: "artDeco", label: { en: "Art Deco", pt: "Art D\xE9co" } }
];
function bevel3D(prst) {
  return { camera: { prst: "orthographicFront" }, lightRig: { rig: "threePt", dir: "t" }, bevelT: prst === "circle" ? {} : { prst } };
}
var ROTATION_PRESETS = [
  { group: "parallel", prst: "isometricLeftDown", label: { en: "Isometric: Left Down", pt: "Isom\xE9trica: Esquerda para Baixo" } },
  { group: "parallel", prst: "isometricRightUp", label: { en: "Isometric: Right Up", pt: "Isom\xE9trica: Direita para Cima" } },
  { group: "parallel", prst: "isometricTopUp", label: { en: "Isometric: Top Up", pt: "Isom\xE9trica: Superior para Cima" } },
  { group: "parallel", prst: "isometricBottomDown", label: { en: "Isometric: Bottom Down", pt: "Isom\xE9trica: Inferior para Baixo" } },
  { group: "parallel", prst: "isometricOffAxis1Left", label: { en: "Off Axis 1: Left", pt: "Fora do Eixo 1: Esquerda" } },
  { group: "parallel", prst: "isometricOffAxis1Right", label: { en: "Off Axis 1: Right", pt: "Fora do Eixo 1: Direita" } },
  { group: "parallel", prst: "isometricOffAxis1Top", label: { en: "Off Axis 1: Top", pt: "Fora do Eixo 1: Superior" } },
  { group: "parallel", prst: "isometricOffAxis2Left", label: { en: "Off Axis 2: Left", pt: "Fora do Eixo 2: Esquerda" } },
  { group: "parallel", prst: "isometricOffAxis2Right", label: { en: "Off Axis 2: Right", pt: "Fora do Eixo 2: Direita" } },
  { group: "parallel", prst: "isometricOffAxis2Top", label: { en: "Off Axis 2: Top", pt: "Fora do Eixo 2: Superior" } },
  { group: "perspective", prst: "perspectiveFront", label: { en: "Perspective: Front", pt: "Perspectiva: Frente" } },
  { group: "perspective", prst: "perspectiveLeft", label: { en: "Perspective: Left", pt: "Perspectiva: Esquerda" } },
  { group: "perspective", prst: "perspectiveRight", label: { en: "Perspective: Right", pt: "Perspectiva: Direita" } },
  { group: "perspective", prst: "perspectiveBelow", label: { en: "Perspective: Below", pt: "Perspectiva: Abaixo" } },
  { group: "perspective", prst: "perspectiveAbove", label: { en: "Perspective: Above", pt: "Perspectiva: Acima" } },
  { group: "perspective", prst: "perspectiveAboveLeftFacing", label: { en: "Perspective: Above Left", pt: "Perspectiva: Acima \xE0 Esquerda" } },
  { group: "perspective", prst: "perspectiveAboveRightFacing", label: { en: "Perspective: Above Right", pt: "Perspectiva: Acima \xE0 Direita" } },
  { group: "perspective", prst: "perspectiveContrastingLeftFacing", label: { en: "Perspective: Contrasting Left", pt: "Perspectiva: Contrastante \xE0 Esquerda" } },
  { group: "perspective", prst: "perspectiveContrastingRightFacing", label: { en: "Perspective: Contrasting Right", pt: "Perspectiva: Contrastante \xE0 Direita" } },
  { group: "perspective", prst: "perspectiveHeroicLeftFacing", label: { en: "Perspective: Heroic Left", pt: "Perspectiva: Heroica \xE0 Esquerda" } },
  { group: "perspective", prst: "perspectiveHeroicRightFacing", label: { en: "Perspective: Heroic Right", pt: "Perspectiva: Heroica \xE0 Direita" } },
  { group: "perspective", prst: "perspectiveHeroicExtremeLeftFacing", label: { en: "Perspective: Heroic Extreme Left", pt: "Perspectiva: Heroica Extrema \xE0 Esquerda" } },
  { group: "perspective", prst: "perspectiveHeroicExtremeRightFacing", label: { en: "Perspective: Heroic Extreme Right", pt: "Perspectiva: Heroica Extrema \xE0 Direita" } },
  { group: "perspective", prst: "perspectiveRelaxed", label: { en: "Perspective: Relaxed", pt: "Perspectiva: Relaxada" } },
  { group: "perspective", prst: "perspectiveRelaxedModerately", label: { en: "Perspective: Relaxed Moderately", pt: "Perspectiva: Moderadamente Relaxada" } },
  { group: "oblique", prst: "obliqueTopLeft", label: { en: "Oblique: Top Left", pt: "Obl\xEDqua: Superior \xE0 Esquerda" } },
  { group: "oblique", prst: "obliqueTopRight", label: { en: "Oblique: Top Right", pt: "Obl\xEDqua: Superior \xE0 Direita" } },
  { group: "oblique", prst: "obliqueBottomLeft", label: { en: "Oblique: Bottom Left", pt: "Obl\xEDqua: Inferior \xE0 Esquerda" } },
  { group: "oblique", prst: "obliqueBottomRight", label: { en: "Oblique: Bottom Right", pt: "Obl\xEDqua: Inferior \xE0 Direita" } }
];
var SATURATION_PRESETS = [0, 33e3, 66e3, 1e5, 2e5, 3e5, 4e5];
var TEMPERATURE_PRESETS = [4700, 5300, 5900, 6500, 7200, 8800, 11200];
var SHARPEN_PRESETS = [-5e4, -25e3, 0, 25e3, 5e4];
var BRIGHT_CONTRAST_STEPS = [-4e4, -2e4, 0, 2e4, 4e4];
var TRANSPARENCY_PRESETS = [0, 15, 30, 50, 65, 80, 95];
var scheme = (val, mods = []) => ({ kind: "schemeClr", val, ...mods.length ? { mods } : {} });
var darkOf = (val) => scheme(val, [["shade", 45e3], ["satMod", 135e3]]);
var RECOLOR_PRESETS = [
  { id: "none", group: "mode", label: { en: "No Recolor", pt: "Sem Recolorir" }, fx: {} },
  { id: "grayscale", group: "mode", label: { en: "Grayscale", pt: "Escala de Cinza" }, fx: { grayscl: true } },
  { id: "sepia", group: "mode", label: { en: "Sepia", pt: "S\xE9pia" }, fx: { duotone: [{ kind: "prstClr", val: "black" }, { kind: "srgbClr", val: "D9C3A5", mods: [["tint", 5e4], ["satMod", 18e4]] }] } },
  { id: "washout", group: "mode", label: { en: "Washout", pt: "Desbotar" }, fx: { lum: { bright: 7e4, contrast: -7e4 } } },
  { id: "bw25", group: "mode", label: { en: "Black and White: 25%", pt: "Preto e Branco: 25%" }, fx: { biLevel: 25e3 } },
  { id: "bw50", group: "mode", label: { en: "Black and White: 50%", pt: "Preto e Branco: 50%" }, fx: { biLevel: 5e4 } },
  { id: "bw75", group: "mode", label: { en: "Black and White: 75%", pt: "Preto e Branco: 75%" }, fx: { biLevel: 75e3 } },
  ...["tx2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"].map((c, i) => ({
    id: `dark-${c}`,
    group: "dark",
    label: i === 0 ? { en: "Text color 2 Dark", pt: "Cor do texto 2 Escuro" } : { en: `Accent color ${i} Dark`, pt: `Cor de \xEAnfase ${i} Escuro` },
    fx: { duotone: [{ kind: "prstClr", val: "black" }, darkOf(c)] }
  })),
  ...["bg2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"].map((c, i) => ({
    id: `light-${c}`,
    group: "light",
    label: i === 0 ? { en: "Background color 2 Light", pt: "Cor do plano de fundo 2 Claro" } : { en: `Accent color ${i} Light`, pt: `Cor de \xEAnfase ${i} Claro` },
    fx: { duotone: [darkOf(c), { kind: "prstClr", val: "white" }] }
  }))
];
var LINE_WEIGHTS_PT = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6];
var LINE_DASHES = [
  { val: "solid", label: { en: "Solid", pt: "S\xF3lido" } },
  { val: "sysDot", label: { en: "Round Dot", pt: "Ponto Redondo" } },
  { val: "sysDash", label: { en: "Square Dot", pt: "Ponto Quadrado" } },
  { val: "dash", label: { en: "Dash", pt: "Tra\xE7o" } },
  { val: "dashDot", label: { en: "Dash Dot", pt: "Tra\xE7o Ponto" } },
  { val: "lgDash", label: { en: "Long Dash", pt: "Tra\xE7o Longo" } },
  { val: "lgDashDot", label: { en: "Long Dash Dot", pt: "Tra\xE7o Longo Ponto" } },
  { val: "lgDashDotDot", label: { en: "Long Dash Dot Dot", pt: "Tra\xE7o Longo Ponto Ponto" } }
];
var POSITION_PRESETS = (() => {
  const H = [["left", "Esquerda", "Left"], ["center", "Centro", "Center"], ["right", "Direita", "Right"]];
  const V = [["top", "Superior", "Top"], ["center", "Meio", "Middle"], ["bottom", "Inferior", "Bottom"]];
  const out = [];
  for (const [v, vp, ve] of V) for (const [h, hp, he] of H) {
    out.push({ id: `${v}-${h}`, h, v, label: { en: `Position in ${ve} ${he} with Square Text Wrapping`, pt: `Posi\xE7\xE3o ${vp === "Meio" ? "no Meio" : vp === "Superior" ? "Superior" : "Inferior"} ${hp === "Centro" ? "no Centro" : hp === "Esquerda" ? "\xE0 Esquerda" : "\xE0 Direita"} com Quebra Autom\xE1tica de Texto Quadrada` } });
  }
  return out;
})();

// src/shape-ops.ts
function isShapeFill(x) {
  return ["none", "style", "solid", "gradient", "pattern", "picture", "raw"].includes(x.kind);
}
var squash = (s) => s.replace(/>\s+</g, "><").replace(/\s+/g, " ");
function shapeStyleIndex(raw) {
  const style = /<wps:style>[\s\S]*?<\/wps:style>/.exec(raw)?.[0];
  if (!style) return 0;
  const st = squash(style);
  const sp2 = /<wps:spPr\b[^>]*>([\s\S]*?)<\/wps:spPr>/.exec(raw)?.[1] ?? "";
  const fillLn = squash(sp2.replace(/^[\s\S]*?(<\/a:prstGeom>|<\/a:custGeom>|<a:prstGeom\b[^>]*\/>)/, "")).replace(/<a:effectLst[\s\S]*$|<a:scene3d[\s\S]*$|<a:sp3d[\s\S]*$|<a:extLst[\s\S]*$/, "");
  for (let i = 0; i < SHAPE_STYLE_PRESETS.length; i++) {
    const [p, s] = SHAPE_STYLE_PRESETS[i];
    if (s === st && p === fillLn) return i + 1;
  }
  return 0;
}
var T = (en, pt) => ({ en, pt });
var TEXTBOX_TEMPLATES = [
  { id: "simple", name: T("Simple text box", "Caixa de texto simples") },
  { id: "quote", name: T("Accent quote", "Cita\xE7\xE3o em destaque") },
  { id: "sidebarRight", name: T("Sidebar, right", "Barra lateral \xE0 direita") },
  { id: "sidebarLeft", name: T("Sidebar, left", "Barra lateral \xE0 esquerda") },
  { id: "band", name: T("Title band", "Faixa com t\xEDtulo") },
  { id: "note", name: T("Note", "Nota") }
];
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var run = (text, rPr = "") => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
var para = (body, pPr = "", rPr = "") => `<w:p><w:pPr>${pPr}${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}</w:pPr>${body}</w:p>`;
var sz = (half) => `<w:sz w:val="${half}"/><w:szCs w:val="${half}"/>`;
var accent = (k = 1) => ({ kind: "schemeClr", val: `accent${k}` });
var WHITE = '<w:color w:val="FFFFFF" w:themeColor="background1"/>';
var ACCENT = (hex) => `<w:color w:val="${hex}" w:themeColor="accent1"/>`;
function texts(lang) {
  return lang === "pt" ? {
    body: "[Use este espa\xE7o para destacar um ponto-chave do documento. Para mover a caixa de texto, arraste a borda dela.]",
    quote: "[\u201CChame a aten\xE7\xE3o do leitor com uma cita\xE7\xE3o marcante do documento.\u201D]",
    source: "[Cite a fonte aqui.]",
    title: "[T\xEDtulo da barra lateral]",
    side: "[A barra lateral \xE9 um bom lugar para informa\xE7\xF5es complementares: uma lista de pontos, um resumo ou uma dica. Ela fica junto \xE0 margem e acompanha a p\xE1gina.]",
    note: "[Nota]"
  } : {
    body: "[Use this space to highlight a key point from your document. To move this text box, drag its border.]",
    quote: "[\u201CGrab your reader\u2019s attention with a great quote from the document.\u201D]",
    source: "[Cite your source here.]",
    title: "[Sidebar title]",
    side: "[A sidebar is a good place for supporting information: a list of points, a summary or a tip. It sits by the margin and stays with the page.]",
    note: "[Note]"
  };
}
function textboxTemplateSpec(id, env) {
  const t = texts(env.lang);
  const pad2 = 0.1 * 914400;
  switch (id) {
    case "simple":
      return {
        cx: Math.round(2.5 * 914400),
        cy: Math.round(1 * 914400),
        posH: { relativeFrom: "margin", align: "center" },
        posV: { relativeFrom: "paragraph", offset: 0 },
        wrap: "square",
        fill: { kind: "solid", color: { kind: "schemeClr", val: "lt1" } },
        line: { w: 6350, fill: { kind: "prstClr", val: "black" } },
        body: { lIns: 91440, tIns: 45720, rIns: 91440, bIns: 45720, autofit: "shape" },
        content: para(run(t.body))
      };
    case "quote":
      return {
        cx: Math.round(3 * 914400),
        cy: Math.round(1.2 * 914400),
        sizeRelH: { relativeFrom: "margin", pct: 55e3 },
        posH: { relativeFrom: "margin", align: "right" },
        posV: { relativeFrom: "paragraph", offset: 0 },
        wrap: "square",
        fill: { kind: "none" },
        line: null,
        body: { lIns: 182880, tIns: 182880, rIns: 182880, bIns: 182880, autofit: "shape" },
        content: para(run(t.quote, `<w:i/><w:iCs/>${ACCENT(env.accent)}${sz(28)}`), `<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="${env.accent}" w:themeColor="accent1"/></w:pBdr><w:spacing w:after="120"/>`, `<w:i/><w:iCs/>${ACCENT(env.accent)}${sz(28)}`) + para(run(t.source, sz(18)), `<w:jc w:val="right"/>`, sz(18))
      };
    case "sidebarRight":
    case "sidebarLeft": {
      const right = id === "sidebarRight";
      return {
        cx: Math.round(2.2 * 914400),
        cy: Math.round(9 * 914400),
        sizeRelH: { relativeFrom: "page", pct: 28e3 },
        sizeRelV: { relativeFrom: "page", pct: 1e5 },
        posH: { relativeFrom: "page", align: right ? "right" : "left" },
        posV: { relativeFrom: "page", align: "top" },
        wrap: "square",
        fill: { kind: "solid", color: accent() },
        line: null,
        body: { lIns: 228600, tIns: 914400, rIns: 228600, bIns: 457200, autofit: "none" },
        content: para(run(t.title, `<w:b/><w:bCs/>${WHITE}${sz(32)}`), '<w:spacing w:after="240"/>', `<w:b/><w:bCs/>${WHITE}${sz(32)}`) + para(run(t.side, `${WHITE}${sz(22)}`), "", `${WHITE}${sz(22)}`)
      };
    }
    case "band":
      return {
        cx: Math.round(6 * 914400),
        cy: Math.round(1.1 * 914400),
        sizeRelH: { relativeFrom: "margin", pct: 1e5 },
        posH: { relativeFrom: "margin", align: "center" },
        posV: { relativeFrom: "paragraph", offset: 0 },
        wrap: "topAndBottom",
        fill: { kind: "solid", color: { kind: "schemeClr", val: "accent1", mods: [["lumMod", 2e4], ["lumOff", 8e4]] } },
        line: null,
        body: { lIns: pad2 * 2, tIns: pad2, rIns: pad2 * 2, bIns: pad2, autofit: "shape" },
        content: para(run(t.title, `<w:b/><w:bCs/>${ACCENT(env.accent)}${sz(26)}`), '<w:spacing w:after="60"/>', `<w:b/><w:bCs/>${ACCENT(env.accent)}${sz(26)}`) + para(run(t.body))
      };
    case "note":
      return {
        cx: Math.round(2 * 914400),
        cy: Math.round(1.4 * 914400),
        posH: { relativeFrom: "margin", align: "right" },
        posV: { relativeFrom: "paragraph", offset: 0 },
        wrap: "square",
        fill: { kind: "solid", color: { kind: "schemeClr", val: "accent4", mods: [["lumMod", 2e4], ["lumOff", 8e4]] } },
        line: { w: 12700, fill: { kind: "schemeClr", val: "accent4" } },
        body: { lIns: 91440, tIns: 91440, rIns: 91440, bIns: 91440, autofit: "shape" },
        content: para(run(t.note, `<w:b/><w:bCs/>${sz(20)}`), '<w:spacing w:after="60"/>', `<w:b/><w:bCs/>${sz(20)}`) + para(run(t.body, sz(18)), "", sz(18))
      };
  }
  return null;
}
function gradientVariations(base) {
  const mod = (m) => ({ ...base, mods: [...base.mods ?? [], ...m] });
  const light = [mod([["tint", 66e3], ["satMod", 16e4]]), mod([["tint", 44500], ["satMod", 16e4]]), mod([["tint", 23500], ["satMod", 16e4]])];
  const dark = [mod([["shade", 3e4], ["satMod", 115e3]]), mod([["shade", 67500], ["satMod", 115e3]]), mod([["shade", 1e5], ["satMod", 115e3]])];
  const dirs = [["down", 54e5], ["right", 0], ["up", 162e5], ["left", 108e5]];
  const out = [];
  for (const [isDark2, stops] of [[false, light], [true, dark]]) {
    for (const [d, ang] of dirs) {
      out.push({
        id: `${isDark2 ? "dark" : "light"}-${d}`,
        dark: isDark2,
        fill: { kind: "gradient", stops: [{ pos: 0, color: stops[0] }, { pos: 5e4, color: stops[1] }, { pos: 1e5, color: stops[2] }], lin: { ang, scaled: true }, rotWithShape: true, flip: "none", tileRect: true }
      });
    }
  }
  return out;
}

// src/toc.ts
var TOC_TEMPLATES = [
  { id: "auto1", name: { en: "Automatic Table 1", pt: "Sum\xE1rio Autom\xE1tico 1" }, heading: { en: "Contents", pt: "Conte\xFAdo" } },
  { id: "auto2", name: { en: "Automatic Table 2", pt: "Sum\xE1rio Autom\xE1tico 2" }, heading: { en: "Table of Contents", pt: "Sum\xE1rio" } },
  { id: "manual", name: { en: "Manual Table", pt: "Sum\xE1rio Manual" }, heading: { en: "Table of Contents", pt: "Sum\xE1rio" }, manual: true }
];
var TOC_AUTO_INSTR = ' TOC \\o "1-3" \\h \\z \\u ';
var manualPlaceholder = (lang, level) => lang === "pt" ? `Digite o t\xEDtulo do cap\xEDtulo (n\xEDvel ${level})` : `Type chapter title (level ${level})`;
var MANUAL_LEVELS = [1, 2, 3, 1, 2, 3];
var TOC_GALLERY = "Table of Contents";
var isTocSdt = (s) => s?.gallery === TOC_GALLERY;
var tocSdtPr = (id) => `<w:sdtPr><w:id w:val="${id}"/><w:docPartObj><w:docPartGallery w:val="${TOC_GALLERY}"/><w:docPartUnique/></w:docPartObj></w:sdtPr>`;
var TOC_FORMATS = [
  { id: "template", label: { en: "From template", pt: "Do modelo" } },
  { id: "classic", label: { en: "Classic", pt: "Cl\xE1ssico" } },
  { id: "distinctive", label: { en: "Distinctive", pt: "Elegante" } },
  { id: "fancy", label: { en: "Fancy", pt: "Sofisticado" } },
  { id: "modern", label: { en: "Modern", pt: "Moderno" } },
  { id: "formal", label: { en: "Formal", pt: "Formal" } },
  { id: "simple", label: { en: "Simple", pt: "Simples" } }
];
var sp = (before, after) => `<w:spacing${before !== null ? ` w:before="${before}"` : ""} w:after="${after}"/>`;
var ind = (left) => left > 0 ? `<w:ind w:left="${left}"/>` : "";
var sz2 = (hp) => `<w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/>`;
var B = "<w:b/><w:bCs/>";
var I = "<w:i/><w:iCs/>";
function tocFormatStyle(f, level) {
  const n = Math.min(9, Math.max(1, level));
  switch (f) {
    case "classic":
      if (n === 1) return { pPr: sp(360, 0), rPr: `<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/>${B}<w:caps/>${sz2(24)}` };
      if (n === 2) return { pPr: sp(240, 0), rPr: B + sz2(20) };
      return { pPr: sp(null, 0) + ind(220 * (n - 2)), rPr: sz2(20) };
    case "distinctive":
      if (n === 1) return { pPr: sp(120, 0), rPr: B + I + sz2(24) };
      if (n === 2) return { pPr: sp(120, 0) + ind(220), rPr: B };
      return { pPr: sp(null, 0) + ind(220 * (n - 1)), rPr: sz2(20) };
    case "fancy":
      if (n === 1) return { pPr: sp(360, 360), rPr: `${B}<w:caps/><w:u w:val="single"/>` };
      if (n === 2) return { pPr: sp(null, 0), rPr: `${B}<w:smallCaps/>` };
      if (n === 3) return { pPr: sp(null, 0), rPr: "<w:smallCaps/>" };
      return { pPr: sp(null, 0), rPr: "" };
    case "modern": {
      const bdr = '<w:pBdr><w:between w:val="double" w:sz="6" w:space="0" w:color="auto"/></w:pBdr>';
      const jc = '<w:jc w:val="center"/>';
      if (n === 1) return { pPr: bdr + sp(120, 120) + jc, rPr: B + I + sz2(24) };
      if (n === 2) return { pPr: bdr + sp(120, 120) + jc, rPr: I + sz2(20) };
      return { pPr: bdr + sp(120, 120) + ind(220 * (n - 2)) + jc, rPr: sz2(20) };
    }
    case "formal":
      if (n === 1) return { pPr: sp(120, 120), rPr: `${B}<w:caps/>${sz2(20)}` };
      if (n === 2) return { pPr: sp(null, 0) + ind(220), rPr: `<w:smallCaps/>${sz2(20)}` };
      if (n === 3) return { pPr: sp(null, 0) + ind(440), rPr: I + sz2(20) };
      return { pPr: sp(null, 0) + ind(220 * (n - 1)), rPr: sz2(18) };
    case "simple":
      if (n === 1) return { pPr: sp(240, 120), rPr: B + sz2(20) };
      if (n === 2) return { pPr: sp(120, 0) + ind(220), rPr: I + sz2(20) };
      return { pPr: sp(null, 0) + ind(220 * (n - 1)), rPr: sz2(20) };
    default:
      return { pPr: sp(null, 100) + ind(220 * (n - 1)), rPr: "" };
  }
}
function parseTcInstr(instr) {
  const m = /^\s*TC\s+(?:"((?:[^"\\]|\\.)*)"|(\S+))/i.exec(instr ?? "");
  if (!m) return null;
  const text = (m[1] ?? m[2] ?? "").replace(/\\(.)/g, "$1");
  const rest = (instr ?? "").slice(m.index + m[0].length);
  const f = /\\f\s+(?:"([^"]*)"|([^\s\\"]+))/i.exec(rest);
  const l = /\\l\s+"?(\d+)/i.exec(rest);
  return { text, id: f ? f[1] ?? f[2] ?? "C" : "C", level: l ? Math.min(9, Math.max(1, +l[1])) : 1, noPage: /\\n\b/i.test(rest) };
}
function tcInstr(o) {
  const id = (o.id ?? "").trim() || "C";
  const text = o.text.replace(/(["\\])/g, "\\$1");
  return ` TC "${text}" \\f ${/\s/.test(id) ? `"${id}"` : id} \\l "${Math.min(9, Math.max(1, o.level ?? 1))}" `;
}
function tcInToc(o, tc) {
  if (!o.fields) return false;
  if ((o.fieldId ?? "C").toLowerCase() !== tc.id.toLowerCase()) return false;
  const l = o.fieldLevels;
  return !l || tc.level >= l[0] && tc.level <= l[1];
}
function tocOptionsFrom(d) {
  const levels = Math.min(9, Math.max(1, d.levels ?? 3));
  const links = d.hyperlinks !== false;
  const o = { hyperlinks: links, hideInWeb: true };
  if (d.useStyles !== false) o.outline = [1, levels];
  if (d.fields) {
    o.fields = true;
    if (d.fieldId) o.fieldId = d.fieldId;
  }
  if (d.pageNumbers === false) o.noPageNumbers = true;
  else if (d.rightAlign === false) o.separator = " ";
  if (d.useStyles !== false && d.styles?.length) o.styles = d.styles.filter((s) => s.level >= 1 && s.level <= 9);
  if (d.outlineLevels !== false) o.outlineLevels = true;
  if (!links) delete o.hyperlinks;
  return o;
}
function dialogOptionsFrom(o) {
  return {
    pageNumbers: !o.noPageNumbers,
    rightAlign: o.separator === void 0,
    hyperlinks: !!o.hyperlinks,
    levels: o.outline?.[1] ?? o.fieldLevels?.[1] ?? 3,
    useStyles: !!o.outline || !!o.styles?.length,
    styles: o.styles ?? [],
    outlineLevels: !!o.outlineLevels,
    fields: !!o.fields,
    ...o.fieldId ? { fieldId: o.fieldId } : {}
  };
}
function addTextPlan(level, styleKind) {
  if (level <= 0) return styleKind === "heading" ? { normal: true } : { outline: null };
  if (styleKind === "other") return { outline: level };
  return { heading: level };
}

// ../docx-layout/src/typography/font/gpos.ts
var kernKey = (g1, g2) => g1 * 65536 + g2;
function gposKernInLatin(view, gposOffset) {
  const u16 = (o) => view.getUint16(o);
  const tagAt = (o) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
  const scriptListOff = gposOffset + u16(gposOffset + 4);
  const featureListOff = gposOffset + u16(gposOffset + 6);
  let latn = -1, dflt = -1;
  for (let i = 0, n = u16(scriptListOff); i < n; i++) {
    const rec = scriptListOff + 2 + i * 6;
    const tag = tagAt(rec);
    if (tag === "latn") latn = scriptListOff + u16(rec + 4);
    else if (tag === "DFLT") dflt = scriptListOff + u16(rec + 4);
  }
  const script = latn >= 0 ? latn : dflt;
  if (script < 0 || !u16(script)) return false;
  const ls = script + u16(script);
  const isKern = (fi) => fi !== 65535 && tagAt(featureListOff + 2 + fi * 6) === "kern";
  if (isKern(u16(ls + 2))) return true;
  for (let k = 0, n = u16(ls + 4); k < n; k++) if (isKern(u16(ls + 6 + k * 2))) return true;
  return false;
}
function parseGposKern(view, gposOffset, class0) {
  const kern = /* @__PURE__ */ new Map();
  const u16 = (o) => view.getUint16(o);
  const i16 = (o) => view.getInt16(o);
  const scriptListOff = gposOffset + u16(gposOffset + 4);
  const featureListOff = gposOffset + u16(gposOffset + 6);
  const lookupListOff = gposOffset + u16(gposOffset + 8);
  const kernFeatures = /* @__PURE__ */ new Set();
  const featureCount = u16(featureListOff);
  for (let i = 0; i < featureCount; i++) {
    const rec = featureListOff + 2 + i * 6;
    const tag = String.fromCharCode(
      view.getUint8(rec),
      view.getUint8(rec + 1),
      view.getUint8(rec + 2),
      view.getUint8(rec + 3)
    );
    if (tag === "kern") kernFeatures.add(i);
  }
  if (kernFeatures.size === 0) return kern;
  void scriptListOff;
  const lookupIdx = /* @__PURE__ */ new Set();
  for (const fi of kernFeatures) {
    const featOff = featureListOff + u16(featureListOff + 2 + fi * 6 + 4);
    const n = u16(featOff + 2);
    for (let k = 0; k < n; k++) lookupIdx.add(u16(featOff + 4 + k * 2));
  }
  const lookupCount = u16(lookupListOff);
  for (const li of lookupIdx) {
    if (li >= lookupCount) continue;
    const lookupOff = lookupListOff + u16(lookupListOff + 2 + li * 2);
    let type = u16(lookupOff);
    const subCount = u16(lookupOff + 4);
    for (let s = 0; s < subCount; s++) {
      let subOff = lookupOff + u16(lookupOff + 6 + s * 2);
      let t = type;
      if (t === 9) {
        t = u16(subOff + 2);
        subOff = subOff + view.getUint32(subOff + 4);
      }
      if (t !== 2) continue;
      parsePairPos(subOff);
    }
  }
  return kern;
  function readCoverage(off) {
    const fmt2 = u16(off);
    const out = [];
    if (fmt2 === 1) {
      const n = u16(off + 2);
      for (let i = 0; i < n; i++) out.push(u16(off + 4 + i * 2));
    } else if (fmt2 === 2) {
      const n = u16(off + 2);
      for (let r = 0; r < n; r++) {
        const start = u16(off + 4 + r * 6);
        const end = u16(off + 6 + r * 6);
        for (let g = start; g <= end; g++) out.push(g);
      }
    }
    return out;
  }
  function readClassDef(off) {
    const map = /* @__PURE__ */ new Map();
    const fmt2 = u16(off);
    if (fmt2 === 1) {
      const start = u16(off + 2);
      const n = u16(off + 4);
      for (let i = 0; i < n; i++) map.set(start + i, u16(off + 6 + i * 2));
    } else if (fmt2 === 2) {
      const n = u16(off + 2);
      for (let r = 0; r < n; r++) {
        const s = u16(off + 4 + r * 6);
        const e = u16(off + 6 + r * 6);
        const c = u16(off + 8 + r * 6);
        for (let g = s; g <= e; g++) map.set(g, c);
      }
    }
    return map;
  }
  function valueSize(format) {
    let n = 0;
    for (let b = 0; b < 16; b++) if (format & 1 << b) n++;
    return n * 2;
  }
  function readXAdvance(off, format) {
    let p = off;
    if (format & 1) p += 2;
    if (format & 2) p += 2;
    if (format & 4) return i16(p);
    return 0;
  }
  function parsePairPos(off) {
    const fmt2 = u16(off);
    const coverage = readCoverage(off + u16(off + 2));
    const vf1 = u16(off + 4);
    const vf2 = u16(off + 6);
    const size1 = valueSize(vf1);
    const size2 = valueSize(vf2);
    if (fmt2 === 1) {
      const pairSetCount = u16(off + 8);
      for (let i = 0; i < Math.min(pairSetCount, coverage.length); i++) {
        const ps = off + u16(off + 10 + i * 2);
        const n = u16(ps);
        const recSize = 2 + size1 + size2;
        for (let r = 0; r < n; r++) {
          const rec = ps + 2 + r * recSize;
          const g2 = u16(rec);
          const adv = readXAdvance(rec + 2, vf1);
          if (adv !== 0) {
            const key = kernKey(coverage[i], g2);
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    } else if (fmt2 === 2) {
      const cd1 = readClassDef(off + u16(off + 8));
      const cd2 = readClassDef(off + u16(off + 10));
      const c1n = u16(off + 12);
      const c2n = u16(off + 14);
      const recSize = size1 + size2;
      const classAdv = [];
      for (let c1 = 0; c1 < c1n; c1++) {
        classAdv.push([]);
        for (let c2 = 0; c2 < c2n; c2++) {
          const rec = off + 16 + (c1 * c2n + c2) * recSize;
          classAdv[c1].push(readXAdvance(rec, vf1));
        }
      }
      const class1 = /* @__PURE__ */ new Map();
      for (const g of coverage) class1.set(g, cd1.get(g) ?? 0);
      if (class0) {
        for (const [g1, c1] of class1) {
          const adv = classAdv[c1]?.[0] ?? 0;
          if (adv !== 0 && !class0.has(g1)) class0.set(g1, { adv, cd2 });
        }
      }
      for (const [g1, c1] of class1) {
        for (const [g2, c2] of cd2) {
          const adv = classAdv[c1]?.[c2] ?? 0;
          if (adv !== 0) {
            const key = kernKey(g1, g2);
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    }
  }
}

// ../docx-layout/src/typography/font/gsub.ts
function parseGsubLigatures(view, off) {
  const u16 = (o) => view.getUint16(o);
  const u32 = (o) => view.getUint32(o);
  const tagAt = (o) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
  const scriptList = off + u16(off + 4);
  const featureList = off + u16(off + 6);
  const lookupList = off + u16(off + 8);
  const features = /* @__PURE__ */ new Map();
  const lookups = /* @__PURE__ */ new Map();
  let latn = -1, dflt = -1;
  for (let i = 0, n = u16(scriptList); i < n; i++) {
    const rec = scriptList + 2 + i * 6;
    const tag = tagAt(rec);
    if (tag === "latn") latn = scriptList + u16(rec + 4);
    else if (tag === "DFLT") dflt = scriptList + u16(rec + 4);
  }
  const script = latn >= 0 ? latn : dflt;
  if (script < 0 || !u16(script)) return { features, lookups };
  const ls = script + u16(script);
  const fidx = [];
  const req = u16(ls + 2);
  if (req !== 65535) fidx.push(req);
  for (let k = 0, n = u16(ls + 4); k < n; k++) fidx.push(u16(ls + 6 + k * 2));
  for (const fi of fidx) {
    const tag = tagAt(featureList + 2 + fi * 6);
    const fo = featureList + u16(featureList + 2 + fi * 6 + 4);
    const list = features.get(tag) ?? [];
    for (let k = 0, n = u16(fo + 2); k < n; k++) list.push(u16(fo + 4 + k * 2));
    features.set(tag, list);
  }
  const coverage = (o) => {
    const out = [];
    if (u16(o) === 1) for (let i = 0, n = u16(o + 2); i < n; i++) out.push(u16(o + 4 + i * 2));
    else for (let i = 0, n = u16(o + 2); i < n; i++) {
      const s = u16(o + 4 + i * 6), e = u16(o + 6 + i * 6);
      for (let g = s; g <= e; g++) out.push(g);
    }
    return out;
  };
  const wanted = new Set([...features.values()].flat());
  for (const li of wanted) {
    if (li >= u16(lookupList)) continue;
    const lo = lookupList + u16(lookupList + 2 + li * 2);
    const type = u16(lo);
    const map = /* @__PURE__ */ new Map();
    for (let s = 0, ns = u16(lo + 4); s < ns; s++) {
      let so = lo + u16(lo + 6 + s * 2);
      let t = type;
      if (t === 7) {
        t = u16(so + 2);
        so += u32(so + 4);
      }
      if (t !== 4 || u16(so) !== 1) continue;
      const cov = coverage(so + u16(so + 2));
      for (let k = 0, n = u16(so + 4); k < n && k < cov.length; k++) {
        const set = so + u16(so + 6 + k * 2);
        const list = map.get(cov[k]) ?? [];
        for (let j = 0, m = u16(set); j < m; j++) {
          const lg = set + u16(set + 2 + j * 2);
          const cc = u16(lg + 2);
          const rest = [];
          for (let q = 1; q < cc; q++) rest.push(u16(lg + 4 + (q - 1) * 2));
          list.push({ rest, lig: u16(lg) });
        }
        if (list.length) map.set(cov[k], list);
      }
    }
    if (map.size) lookups.set(li, map);
  }
  return { features, lookups };
}
function applyLigatures(g, gids, feats) {
  let out = gids.map((gid) => ({ gid, len: 1 }));
  const idx = [...new Set(feats.flatMap((f) => g.features.get(f) ?? []))].sort((a, b) => a - b);
  for (const li of idx) {
    const lk = g.lookups.get(li);
    if (!lk) continue;
    const next = [];
    for (let i = 0; i < out.length; i++) {
      const cands = lk.get(out[i].gid);
      let hit;
      if (cands) hit = cands.find((c) => c.rest.every((r, k) => out[i + 1 + k]?.gid === r));
      if (!hit) {
        next.push(out[i]);
        continue;
      }
      let len = out[i].len;
      for (let k = 0; k < hit.rest.length; k++) len += out[i + 1 + k].len;
      next.push({ gid: hit.lig, len });
      i += hit.rest.length;
    }
    out = next;
  }
  return out;
}

// ../docx-layout/src/typography/font/sfnt.ts
var SfntFont = class {
  view;
  tables = /* @__PURE__ */ new Map();
  metrics;
  numGlyphs;
  numberOfHMetrics;
  hmtxOffset;
  cmapRanges = [];
  advanceCache = /* @__PURE__ */ new Map();
  /** 'kern' registrada no script latino (ou DFLT) do GPOS — com ligaduras OpenType o
   *  Word só kerneia nesse caso; sem GPOS (só a tabela 'kern' legada): true */
  kernInLatin = true;
  constructor(bytes) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const numTables = v.getUint16(4);
    for (let i = 0; i < numTables; i++) {
      const p = 12 + i * 16;
      const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
      this.tables.set(tag, { offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
    }
    const head = this.req("head");
    const hhea = this.req("hhea");
    const maxp = this.req("maxp");
    const os2 = this.req("OS/2");
    this.numGlyphs = v.getUint16(maxp.offset + 4);
    this.numberOfHMetrics = v.getUint16(hhea.offset + 34);
    this.hmtxOffset = this.req("hmtx").offset;
    this.metrics = {
      unitsPerEm: v.getUint16(head.offset + 18),
      ascender: v.getInt16(hhea.offset + 4),
      descender: v.getInt16(hhea.offset + 6),
      lineGap: v.getInt16(hhea.offset + 8),
      sTypoAscender: v.getInt16(os2.offset + 68),
      sTypoDescender: v.getInt16(os2.offset + 70),
      sTypoLineGap: v.getInt16(os2.offset + 72),
      usWinAscent: v.getUint16(os2.offset + 74),
      usWinDescent: v.getUint16(os2.offset + 76),
      fsSelection: v.getUint16(os2.offset + 62),
      ...os2.length >= 86 && v.getUint16(os2.offset) >= 1 ? { codePageRange1: v.getUint32(os2.offset + 78) } : {},
      ...os2.length >= 26 ? { ySuperscriptYOffset: v.getInt16(os2.offset + 24) } : {},
      ...os2.length >= 4 ? { xAvgCharWidth: v.getInt16(os2.offset + 2) } : {},
      ...os2.length >= 42 ? { panose: Array.from({ length: 10 }, (_, i) => v.getUint8(os2.offset + 32 + i)) } : {},
      underlinePosition: 0,
      underlineThickness: 0
    };
    const post = this.tables.get("post");
    if (post && post.length >= 12) {
      this.metrics.underlinePosition = v.getInt16(post.offset + 8);
      this.metrics.underlineThickness = v.getInt16(post.offset + 10);
    }
    this.parseCmap();
    const gpos = this.tables.get("GPOS");
    if (gpos) {
      try {
        this.kernMap = parseGposKern(this.view, gpos.offset, this.kernClass0);
        this.kernInLatin = gposKernInLatin(this.view, gpos.offset);
      } catch {
        this.kernMap = /* @__PURE__ */ new Map();
        this.kernClass0.clear();
      }
    } else this.kernMap = /* @__PURE__ */ new Map();
    const kernT = this.tables.get("kern");
    if (this.kernMap.size === 0 && kernT) {
      try {
        this.parseLegacyKern(kernT.offset);
      } catch {
      }
    }
  }
  kernMap;
  /** PairPos formato 2: ajuste contra a classe 0 do 2º glifo, por 1º glifo */
  kernClass0 = /* @__PURE__ */ new Map();
  /** Tabela 'kern' (versão 0, subtabelas formato 0 horizontais). */
  parseLegacyKern(off) {
    const v = this.view;
    if (v.getUint16(off) !== 0) return;
    const n = v.getUint16(off + 2);
    let p = off + 4;
    for (let t = 0; t < n; t++) {
      const length = v.getUint16(p + 2);
      const coverage = v.getUint16(p + 4);
      const format = coverage >> 8;
      const horizontal = (coverage & 1) !== 0;
      const cross = (coverage & 4) !== 0;
      if (format === 0 && horizontal && !cross) {
        const pairs = v.getUint16(p + 6);
        for (let i = 0; i < pairs; i++) {
          const r = p + 14 + i * 6;
          const key = kernKey(v.getUint16(r), v.getUint16(r + 2));
          if (!this.kernMap.has(key)) this.kernMap.set(key, v.getInt16(r + 4));
        }
      }
      p += length;
    }
  }
  /** Ajuste de kerning (par prev→cur) em TWIPS no em de dispositivo.
   *  O app de referência (DirectWrite) aplica a feature kern por padrão. */
  kernTwips(prevCodePoint, codePoint, sizePt) {
    return this.kernGlyphsTwips(this.glyphId(prevCodePoint), this.glyphId(codePoint), sizePt);
  }
  /** Kerning do par de GLIFOS (g1→g2) em twips — para pares com glifo de ligadura. */
  kernGlyphsTwips(g1, g2, sizePt) {
    if (g1 > 65535 || g2 > 65535) return 0;
    let units = this.kernMap.get(kernKey(g1, g2));
    if (units === void 0) {
      const c0 = this.kernClass0.get(g1);
      if (c0 && !c0.cd2.has(g2)) units = c0.adv;
    }
    if (!units) return 0;
    const deviceEmPt2 = Math.round(sizePt * 600 / 72) * 72 / 600;
    return units * deviceEmPt2 * 20 / this.metrics.unitsPerEm;
  }
  gsub;
  /**
   * Ligaduras OpenType (GSUB, script latino) das features pedidas ('liga', 'clig',
   * 'dlig', 'hlig') sobre uma sequência de glifos: grupos {glifo, quantos glifos de
   * entrada cobre}; null se a fonte não tem nenhuma dessas ligaduras.
   */
  ligate(gids, features) {
    if (this.gsub === void 0) {
      const t = this.tables.get("GSUB");
      try {
        this.gsub = t ? parseGsubLigatures(this.view, t.offset) : null;
      } catch {
        this.gsub = null;
      }
    }
    const g = this.gsub;
    if (!g || !g.lookups.size || !features.some((f) => (g.features.get(f) ?? []).some((li) => g.lookups.has(li)))) return null;
    return applyLigatures(g, gids, features);
  }
  req(tag) {
    const t = this.tables.get(tag);
    if (!t) throw new Error(`Tabela ${tag} ausente`);
    return t;
  }
  parseCmap() {
    const v = this.view;
    const cmap = this.req("cmap");
    const n = v.getUint16(cmap.offset + 2);
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const p = cmap.offset + 4 + i * 8;
      const platform = v.getUint16(p);
      const encoding = v.getUint16(p + 2);
      const offset = v.getUint32(p + 4);
      const score = platform === 3 && encoding === 10 ? 4 : platform === 3 && encoding === 1 ? 3 : platform === 0 ? 2 : platform === 3 && encoding === 0 ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = cmap.offset + offset;
      }
    }
    if (best < 0) throw new Error("cmap sem subtabela utiliz\xE1vel");
    this.symbolCmap = bestScore === 1;
    const format = v.getUint16(best);
    if (format === 4) {
      const segCount = v.getUint16(best + 6) / 2;
      const endP = best + 14;
      const startP = endP + segCount * 2 + 2;
      const deltaP = startP + segCount * 2;
      const rangeP = deltaP + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = v.getUint16(endP + s * 2);
        const start = v.getUint16(startP + s * 2);
        const delta = v.getInt16(deltaP + s * 2);
        const rangeOffset = v.getUint16(rangeP + s * 2);
        const idP = rangeP + s * 2;
        this.cmapRanges.push({
          start,
          end,
          mapper: rangeOffset === 0 ? (c) => c + delta & 65535 : (c) => {
            const gp = idP + rangeOffset + (c - start) * 2;
            const g = v.getUint16(gp);
            return g === 0 ? 0 : g + delta & 65535;
          }
        });
      }
    } else if (format === 12) {
      const nGroups = v.getUint32(best + 12);
      for (let g = 0; g < nGroups; g++) {
        const p = best + 16 + g * 12;
        const start = v.getUint32(p);
        const end = v.getUint32(p + 4);
        const startGlyph = v.getUint32(p + 8);
        this.cmapRanges.push({ start, end, mapper: (c) => startGlyph + (c - start) });
      }
    } else {
      throw new Error(`cmap format ${format} n\xE3o suportado`);
    }
    this.cmapRanges.sort((a, b) => a.start - b.start);
  }
  /** cmap Windows Symbol (3,0): os glifos ficam em U+F000+código */
  symbolCmap = false;
  /** COLR v0 (registros base/camadas — o v1 os mantém) + CPAL; preparado sob demanda */
  colr;
  colrInfo() {
    if (this.colr !== void 0) return this.colr;
    this.colr = null;
    const t = this.tables.get("COLR"), cp = this.tables.get("CPAL");
    if (!t || !cp || t.length < 14 || cp.length < 14) return null;
    const v = this.view;
    try {
      const nBase = v.getUint16(t.offset + 2), bo = v.getUint32(t.offset + 4), lo = v.getUint32(t.offset + 8), nLayers = v.getUint16(t.offset + 12);
      if (!nBase || !bo || !lo) return null;
      this.colr = {
        base: t.offset + bo,
        nBase,
        layers: t.offset + lo,
        nLayers,
        colors: cp.offset + v.getUint32(cp.offset + 8),
        firstColor: v.getUint16(cp.offset + 12),
        nColors: v.getUint16(cp.offset + 2)
      };
    } catch {
      this.colr = null;
    }
    return this.colr;
  }
  hasColorGlyphs() {
    return this.colrInfo() !== null;
  }
  colorLayers(glyphId) {
    const c = this.colrInfo();
    if (!c) return null;
    const v = this.view;
    let lo = 0, hi = c.nBase - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1, p = c.base + mid * 6, g = v.getUint16(p);
      if (g < glyphId) {
        lo = mid + 1;
        continue;
      }
      if (g > glyphId) {
        hi = mid - 1;
        continue;
      }
      const first = v.getUint16(p + 2), n = v.getUint16(p + 4);
      const out = [];
      for (let k = 0; k < n && first + k < c.nLayers; k++) {
        const q = c.layers + (first + k) * 4;
        const pal = v.getUint16(q + 2);
        if (pal === 65535 || pal >= c.nColors) {
          out.push({ glyphId: v.getUint16(q), color: null, alpha: 1 });
          continue;
        }
        const r = c.colors + (c.firstColor + pal) * 4;
        const hex = (o) => v.getUint8(r + o).toString(16).padStart(2, "0").toUpperCase();
        out.push({ glyphId: v.getUint16(q), color: hex(2) + hex(1) + hex(0), alpha: v.getUint8(r + 3) / 255 });
      }
      return out.length ? out : null;
    }
    return null;
  }
  glyphId(codePoint) {
    const g = this.lookupGlyph(codePoint);
    if (g === 0 && this.symbolCmap && codePoint < 256) return this.lookupGlyph(codePoint + 61440);
    return g;
  }
  lookupGlyph(codePoint) {
    let lo = 0, hi = this.cmapRanges.length - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      const r = this.cmapRanges[mid];
      if (codePoint < r.start) hi = mid - 1;
      else if (codePoint > r.end) lo = mid + 1;
      else return r.mapper(codePoint);
    }
    return 0;
  }
  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId) {
    const cached = this.advanceCache.get(glyphId);
    if (cached !== void 0) return cached;
    const i = Math.min(glyphId, this.numberOfHMetrics - 1);
    const w = this.view.getUint16(this.hmtxOffset + i * 4);
    this.advanceCache.set(glyphId, w);
    return w;
  }
  /** Tabela empírica de advances do app de referência (hinting/ClearType), por tamanho:
   *  { "11": { "a": twips, ... } } — extraída via word-lab/extract-advances.mjs.
   *  O hinting altera advances em até ±3% vs escala linear; sem a tabela o
   *  texto deriva ao longo da linha (visto no pixel-diff). */
  advanceTable = null;
  setAdvanceTable(table2) {
    this.advanceTable = table2;
  }
  /** Advance de um code point em TWIPS para um tamanho em pontos.
   *  1º tabela empírica do app de referência; fallback: escala linear com o em
   *  arredondado ao pixel de 600 DPI (11pt → 92/600" = 11.04pt). */
  advanceTwips(codePoint, sizePt) {
    if (this.advanceTable) {
      const t = this.advanceTable[String(sizePt)]?.[String.fromCodePoint(codePoint)];
      if (t !== void 0) return t;
    }
    const units = this.advanceWidth(this.glyphId(codePoint));
    const deviceEmPt2 = Math.round(sizePt * 600 / 72) * 72 / 600;
    return units * deviceEmPt2 * 20 / this.metrics.unitsPerEm;
  }
  outlineCache = /* @__PURE__ */ new Map();
  /**
   * Contorno do glifo (TrueType `glyf`, glifos simples e compostos) em unidades
   * da fonte, y para CIMA: M/L/Q/Z. null se a fonte não tem `glyf` (CFF) ou o
   * glifo não existe. Usado para desenhar texto como curvas (WordArt no PDF,
   * como o Word faz).
   */
  glyphOutline(glyphId) {
    if (this.outlineCache.has(glyphId)) return this.outlineCache.get(glyphId);
    let out = null;
    try {
      const pts = this.glyphContours(glyphId, 0);
      out = pts ? contoursToPath(pts) : null;
    } catch {
      out = null;
    }
    this.outlineCache.set(glyphId, out);
    return out;
  }
  /** Contornos (pontos com on/off curve) de um glifo, compostos resolvidos. */
  glyphContours(gid, depth) {
    const glyf = this.tables.get("glyf"), loca = this.tables.get("loca"), head = this.tables.get("head"), maxp = this.tables.get("maxp");
    if (!glyf || !loca || !head || !maxp || depth > 8) return null;
    const v = this.view;
    const numGlyphs = v.getUint16(maxp.offset + 4);
    if (gid < 0 || gid >= numGlyphs) return null;
    const longLoca = v.getInt16(head.offset + 50) === 1;
    const at = (i) => longLoca ? v.getUint32(loca.offset + i * 4) : v.getUint16(loca.offset + i * 2) * 2;
    const start = at(gid), end = at(gid + 1);
    if (end <= start) return [];
    const p0 = glyf.offset + start;
    const nContours = v.getInt16(p0);
    if (nContours >= 0) {
      let p2 = p0 + 10;
      const ends = [];
      for (let i = 0; i < nContours; i++) {
        ends.push(v.getUint16(p2));
        p2 += 2;
      }
      const nPts = nContours ? ends[nContours - 1] + 1 : 0;
      p2 += 2 + v.getUint16(p2);
      const flags = [];
      while (flags.length < nPts) {
        const f = v.getUint8(p2++);
        flags.push(f);
        if (f & 8) {
          let rep = v.getUint8(p2++);
          while (rep-- > 0 && flags.length < nPts) flags.push(f);
        }
      }
      const xs = [], ys = [];
      let x = 0;
      for (const f of flags) {
        if (f & 2) {
          const d = v.getUint8(p2++);
          x += f & 16 ? d : -d;
        } else if (!(f & 16)) {
          x += v.getInt16(p2);
          p2 += 2;
        }
        xs.push(x);
      }
      let y = 0;
      for (const f of flags) {
        if (f & 4) {
          const d = v.getUint8(p2++);
          y += f & 32 ? d : -d;
        } else if (!(f & 32)) {
          y += v.getInt16(p2);
          p2 += 2;
        }
        ys.push(y);
      }
      const contours = [];
      let s = 0;
      for (const e of ends) {
        const c = [];
        for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
        contours.push(c);
        s = e + 1;
      }
      return contours;
    }
    const all = [];
    let p = p0 + 10;
    for (let guard = 0; guard < 64; guard++) {
      const flags = v.getUint16(p), comp = v.getUint16(p + 2);
      p += 4;
      let dx = 0, dy = 0;
      if (flags & 1) {
        dx = v.getInt16(p);
        dy = v.getInt16(p + 2);
        p += 4;
      } else {
        dx = v.getInt8(p);
        dy = v.getInt8(p + 1);
        p += 2;
      }
      if (!(flags & 2)) {
        dx = 0;
        dy = 0;
      }
      let a = 1, b = 0, c = 0, d = 1;
      const f2 = (o) => v.getInt16(o) / 16384;
      if (flags & 8) {
        a = d = f2(p);
        p += 2;
      } else if (flags & 64) {
        a = f2(p);
        d = f2(p + 2);
        p += 4;
      } else if (flags & 128) {
        a = f2(p);
        b = f2(p + 2);
        c = f2(p + 4);
        d = f2(p + 6);
        p += 8;
      }
      const sub = this.glyphContours(comp, depth + 1);
      if (sub) for (const ct of sub) all.push(ct.map((q) => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy, on: q.on })));
      if (!(flags & 32)) break;
    }
    return all;
  }
};
function contoursToPath(contours) {
  const out = [];
  for (const c of contours) {
    const n = c.length;
    if (n < 2) continue;
    let startIdx = c.findIndex((q) => q.on);
    let start;
    if (startIdx < 0) {
      start = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
      startIdx = 0;
    } else start = c[startIdx];
    out.push({ op: "M", x: start.x, y: start.y });
    let ctrl = null;
    for (let k = 1; k <= n; k++) {
      const q = c[(startIdx + k) % n];
      if (q.on) {
        if (ctrl) {
          out.push({ op: "Q", cx: ctrl.x, cy: ctrl.y, x: q.x, y: q.y });
          ctrl = null;
        } else out.push({ op: "L", x: q.x, y: q.y });
      } else if (ctrl) {
        const mid = { x: (ctrl.x + q.x) / 2, y: (ctrl.y + q.y) / 2 };
        out.push({ op: "Q", cx: ctrl.x, cy: ctrl.y, x: mid.x, y: mid.y });
        ctrl = q;
      } else ctrl = q;
    }
    if (ctrl) out.push({ op: "Q", cx: ctrl.x, cy: ctrl.y, x: start.x, y: start.y });
    out.push({ op: "Z" });
  }
  return out;
}

// ../docx-layout/src/typography/lineheight.ts
function deviceEmPt(sizePt) {
  return Math.round(sizePt * 600 / 72) * 72 / 600;
}
function singleLineHeightPt(font, sizePt) {
  const m = font.metrics;
  const units = m.ascender + Math.abs(m.descender) + m.lineGap;
  return units / m.unitsPerEm * deviceEmPt(sizePt);
}
function lineHeightPt(font, sizePt, spacing) {
  const single = singleLineHeightPt(font, sizePt);
  switch (spacing.lineRule) {
    case "auto":
      return single * spacing.line / 240;
    case "exact":
      return spacing.line / 20;
    // twips
    case "atLeast":
      return Math.max(single, spacing.line / 20);
  }
}

// ../docx-layout/src/typography/units.ts
var TWIPS_PER_PT = 20;

// ../docx-layout/src/typography/richbreak.ts
function breakRich(spans, fonts, opts) {
  const tabLeaders = /* @__PURE__ */ new Map();
  const tabStop = opts.defaultTabStopTwips ?? 708;
  const chars = [];
  spans.forEach((span, si) => {
    const font = fonts.resolve(span.family, span.variant);
    const ls = span.letterSpacingTwips ?? 0;
    for (let i2 = 0; i2 < span.text.length; i2++) {
      const ch = span.text[i2];
      const isTab = ch === "	";
      let adv;
      if (span.imageWidthTwips !== void 0) adv = span.imageWidthTwips;
      else if (isTab || ch === "\n" || ch === "\f") adv = 0;
      else {
        adv = font.advanceTwips(ch.codePointAt(0), span.sizePt) + ls;
        const next = span.text[i2 + 1];
        if (next && next !== " " && next !== "	" && ch !== " ") {
          adv += font.kernTwips(ch.codePointAt(0), next.codePointAt(0), span.sizePt);
        }
      }
      chars.push({
        ch,
        spanIndex: si,
        offsetInSpan: i2,
        baseAdvance: adv,
        isGap: span.imageWidthTwips === void 0 && (ch === " " || isTab),
        isTab: span.imageWidthTwips === void 0 && isTab
      });
    }
  });
  const charAdvances = new Array(chars.length).fill(0);
  const availOf = (lineIdx2) => {
    let avail = lineIdx2 === 0 ? opts.firstLineAvailableTwips ?? opts.availableTwips : opts.availableTwips;
    if (opts.indentFirstKLines && lineIdx2 < opts.indentFirstKLines.k) {
      avail -= opts.indentFirstKLines.indentTwips;
    }
    return avail;
  };
  const tabOffsetOf = (lineIdx2) => lineIdx2 === 0 ? opts.firstLineTabOriginOffsetTwips ?? opts.tabOriginOffsetTwips ?? 0 : opts.tabOriginOffsetTwips ?? 0;
  const breaks = [];
  let lineStart = 0;
  let width = 0;
  let pendingGap = 0;
  let i = 0;
  const lineIdx = () => breaks.length;
  while (i < chars.length) {
    const c = chars[i];
    if (c.ch === "\n" || c.ch === "\f") {
      charAdvances[i] = 0;
      breaks.push({ start: lineStart, end: i + 1, widthTwips: width + pendingGap });
      lineStart = i + 1;
      width = 0;
      pendingGap = 0;
      i++;
      continue;
    }
    if (c.isGap) {
      const cursor = width + pendingGap;
      let adv;
      if (c.isTab) {
        const fromMargin = tabOffsetOf(lineIdx()) + cursor;
        const custom = opts.tabStops?.find((t) => t.posTwips > fromMargin + 1);
        if (custom) {
          if (custom.align === "right") {
            let w = 0;
            for (let k = i + 1; k < chars.length; k++) {
              const cc = chars[k];
              if (cc.isTab || cc.ch === "\n" || cc.ch === "\f") break;
              w += cc.baseAdvance;
            }
            adv = Math.max(80, custom.posTwips - fromMargin - w);
          } else {
            adv = custom.posTwips - fromMargin;
          }
          if (custom.leader) tabLeaders.set(i, custom.leader);
        } else {
          const next = (Math.floor(fromMargin / tabStop + 1e-6) + 1) * tabStop;
          adv = next - fromMargin;
        }
      } else adv = c.baseAdvance;
      charAdvances[i] = adv;
      pendingGap += adv;
      i++;
      continue;
    }
    const wordStart = i;
    let wordWidth2 = 0;
    while (i < chars.length && !chars[i].isGap && chars[i].ch !== "\n" && chars[i].ch !== "\f") {
      charAdvances[i] = chars[i].baseAdvance;
      wordWidth2 += chars[i].baseAdvance;
      i++;
    }
    const avail = availOf(lineIdx());
    if (wordStart > lineStart && width + pendingGap + wordWidth2 > avail) {
      breaks.push({ start: lineStart, end: wordStart, widthTwips: width });
      lineStart = wordStart;
      width = wordWidth2;
      pendingGap = 0;
      width = emergency(chars, charAdvances, wordStart, i, availOf, lineIdx, breaks, (s) => {
        lineStart = s;
      }, width);
    } else if (wordStart === lineStart && wordWidth2 > avail) {
      width = emergency(chars, charAdvances, wordStart, i, availOf, lineIdx, breaks, (s) => {
        lineStart = s;
      }, wordWidth2);
      pendingGap = 0;
    } else {
      width += pendingGap + wordWidth2;
      pendingGap = 0;
    }
  }
  if (lineStart < chars.length || breaks.length === 0) {
    breaks.push({ start: lineStart, end: chars.length, widthTwips: width });
  }
  const lines = breaks.map((b) => {
    const segments = [];
    let x = 0;
    let maxSizePt = 0;
    let maxAscTwips = 0;
    let segStart = b.start;
    for (let k = b.start; k <= b.end; k++) {
      const boundary = k === b.end || chars[k].spanIndex !== chars[segStart].spanIndex;
      if (boundary && k > segStart) {
        const first = chars[segStart];
        let w = 0;
        for (let m = segStart; m < k; m++) w += charAdvances[m];
        segments.push({
          spanIndex: first.spanIndex,
          start: first.offsetInSpan,
          end: chars[k - 1].offsetInSpan + 1,
          xTwips: x,
          widthTwips: w
        });
        const span = spans[first.spanIndex];
        const font = fonts.resolve(span.family, span.variant);
        maxSizePt = Math.max(maxSizePt, span.sizePt);
        maxAscTwips = Math.max(
          maxAscTwips,
          span.imageHeightTwips ?? font.metrics.ascender / font.metrics.unitsPerEm * span.sizePt * 20
        );
        x += w;
        segStart = k;
      }
    }
    if (segments.length === 0 && spans.length > 0) {
      maxSizePt = spans[0].sizePt;
      const f = fonts.resolve(spans[0].family, spans[0].variant);
      maxAscTwips = f.metrics.ascender / f.metrics.unitsPerEm * maxSizePt * 20;
    }
    return { start: b.start, end: b.end, widthTwips: b.widthTwips, segments, maxSizePt, maxAscTwips };
  });
  return { lines, charAdvances, tabLeaders };
}
function emergency(chars, charAdvances, wordStart, wordEnd, availOf, lineIdx, breaks, setLineStart, initialWidth) {
  if (initialWidth <= availOf(lineIdx())) return initialWidth;
  let start = wordStart;
  let w = 0;
  for (let k = wordStart; k < wordEnd; k++) {
    const a = charAdvances[k];
    if (w + a > availOf(lineIdx()) && k > start) {
      breaks.push({ start, end: k, widthTwips: w });
      start = k;
      w = a;
    } else w += a;
  }
  setLineStart(start);
  return w;
}

// ../docx-layout/src/typography/hyphen/liang.ts
var DOT = 46;
function lowerCp(ch) {
  const l = ch.toLowerCase();
  const cp = l.codePointAt(0);
  return l.length === ch.length || String.fromCodePoint(cp) === l ? cp : ch.codePointAt(0);
}
var Hyphenator = class {
  constructor(data) {
    this.data = data;
    for (const p of data.patterns.split(/\s+/)) if (p) this.add(p.normalize("NFC"));
    for (const e of data.exceptions.split(/\s+/)) {
      if (!e) continue;
      const pts = [];
      let n = 0;
      for (const ch of e.normalize("NFC")) {
        if (ch === "-") pts.push(n);
        else n++;
      }
      this.exceptions.set(e.replace(/-/g, "").normalize("NFC").toLowerCase(), pts);
    }
  }
  data;
  root = {};
  exceptions = /* @__PURE__ */ new Map();
  cache = /* @__PURE__ */ new Map();
  add(pat) {
    const letters2 = [];
    const vals = [0];
    for (const ch of pat) {
      if (ch >= "0" && ch <= "9") vals[vals.length - 1] = ch.charCodeAt(0) - 48;
      else {
        letters2.push(ch.codePointAt(0));
        vals.push(0);
      }
    }
    let n = this.root;
    for (const c of letters2) {
      n.k ??= /* @__PURE__ */ new Map();
      let nx = n.k.get(c);
      if (!nx) {
        nx = {};
        n.k.set(c, nx);
      }
      n = nx;
    }
    n.v = Uint8Array.from(vals);
  }
  /** Pontos de quebra pelos padrões, SEM mínimos: k ∈ [1, n−1] = hífen depois de k letras
   *  (código a código — a palavra deve vir em NFC, como os padrões). */
  points(word) {
    const hit = this.cache.get(word);
    if (hit) return hit;
    const chars = Array.from(word);
    const n = chars.length;
    const low = chars.map(lowerCp);
    const exc = this.exceptions.get(String.fromCodePoint(...low));
    let out;
    if (exc) out = exc.filter((k) => k > 0 && k < n);
    else {
      const w = [DOT, ...low, DOT];
      const vals = new Uint8Array(w.length + 1);
      for (let i = 0; i < w.length; i++) {
        let node = this.root;
        for (let j = i; j < w.length && node; j++) {
          node = node.k?.get(w[j]);
          if (node?.v) {
            const v = node.v;
            for (let q = 0; q < v.length; q++) if (v[q] > vals[i + q]) vals[i + q] = v[q];
          }
        }
      }
      out = [];
      for (let k = 1; k < n; k++) if (vals[k + 1] & 1) out.push(k);
    }
    if (this.cache.size > 5e4) this.cache.clear();
    this.cache.set(word, out);
    return out;
  }
  /** Pontos com os mínimos de letras antes/depois do hífen (padrão: os do hyph-utf8). */
  hyphenate(word, left = this.data.left, right = this.data.right) {
    const n = Array.from(word).length;
    return this.points(word).filter((k) => k >= left && n - k >= right);
  }
};

// ../docx-layout/src/typography/hyphen/index.ts
var LOADERS = {
  pt: () => import("./pt-SOV6P63W.js"),
  "en-us": () => import("./en-us-VQLEPFOP.js"),
  es: () => import("./es-7AJJTOLW.js"),
  fr: () => import("./fr-24H6HF66.js"),
  "de-1996": () => import("./de-1996-B6RFDIMK.js"),
  it: () => import("./it-XDEXL37H.js"),
  nl: () => import("./nl-FXXCLWPJ.js")
};
function hyphenationPatternId(lang) {
  if (!lang) return void 0;
  const [base = ""] = lang.toLowerCase().split(/[-_]/);
  switch (base) {
    case "pt":
      return "pt";
    case "es":
      return "es";
    case "fr":
      return "fr";
    case "de":
      return "de-1996";
    case "it":
      return "it";
    case "nl":
      return "nl";
    case "en":
      return "en-us";
    default:
      return void 0;
  }
}
var loaded = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
function registerHyphenation(data) {
  const h = new Hyphenator(data);
  loaded.set(data.id, h);
  return h;
}
async function loadHyphenation(langs) {
  const ids = /* @__PURE__ */ new Set();
  for (const l of langs) {
    const id = l && LOADERS[l] ? l : hyphenationPatternId(l);
    if (id && !loaded.has(id)) ids.add(id);
  }
  await Promise.all([...ids].map((id) => {
    let p = pending.get(id);
    if (!p) {
      p = LOADERS[id]().then((m) => {
        if (!loaded.has(id)) registerHyphenation(m.default);
      });
      pending.set(id, p);
    }
    return p;
  }));
}
var HYPHENATION_PATTERN_IDS = Object.keys(LOADERS);
function hyphenatorFor(lang) {
  const id = hyphenationPatternId(lang);
  return id ? loaded.get(id) : void 0;
}

// ../docx-layout/src/pdf-writer/bytes.ts
var ByteBuilder = class {
  chunks = [];
  len = 0;
  /** Comprimento atual em bytes (offset corrente). */
  get length() {
    return this.len;
  }
  /** Anexa uma string como latin1 (1 byte por code unit; só use ASCII/latin1). */
  str(s) {
    const n = s.length;
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = s.charCodeAt(i) & 255;
    return this.bytes(out);
  }
  /** Anexa bytes crus. */
  bytes(b) {
    this.chunks.push(b);
    this.len += b.length;
    return this;
  }
  /** Concatena tudo num único Uint8Array. */
  toUint8Array() {
    const out = new Uint8Array(this.len);
    let off = 0;
    for (const c of this.chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }
};
function utf16beHex(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out += (c >> 8 & 255).toString(16).padStart(2, "0");
    out += (c & 255).toString(16).padStart(2, "0");
  }
  return out;
}

// ../docx-layout/src/pdf-writer/font.ts
var EmbeddedFont = class {
  constructor(index, baseName, bytes, program) {
    this.index = index;
    this.baseName = baseName;
    this.bytes = bytes;
    this.program = program;
    this.resourceName = `F${index}`;
    this.scale = 1e3 / program.unitsPerEm;
  }
  index;
  baseName;
  bytes;
  program;
  /** Recurso usado no content stream (ex.: "F0"). */
  resourceName;
  used = /* @__PURE__ */ new Map();
  // gid -> codePoint (para ToUnicode)
  /** fonte de símbolo (Symbol, Wingdings — códigos na área privada F0xx) com a tabela de
   *  equivalentes Unicode que o Word grava no ToUnicode; também a negrita/itálica */
  get symbolTable() {
    const n = this.baseName.replace(/^[A-Z]{6}\+/, "").replace(/[\s,]+/g, "");
    if (/^Symbol(?:MT)?(?:-|$)/i.test(n)) return WORD_SYMBOL_UNICODE;
    if (/^Wingdings(?:-|$)/i.test(n)) return WORD_WINGDINGS_UNICODE;
    return void 0;
  }
  scale;
  /** Mapeia um code point para (gid, advance em unidades de fonte) e registra uso. */
  encode(codePoint) {
    const g0 = this.program.glyphId(codePoint);
    const gid = g0 >= 0 && g0 <= 65535 ? g0 : 0;
    if (!this.used.has(gid)) this.used.set(gid, codePoint);
    return { gid, advanceWidth: this.program.advanceWidth(gid) };
  }
  /** Largura em milésimos de em (espaço de texto do PDF) de um glifo. */
  widthThousandths(gid) {
    return Math.round(this.program.advanceWidth(gid) * this.scale);
  }
  psName() {
    return this.baseName.replace(/[^A-Za-z0-9+\-]/g, "");
  }
  /** Emite o grafo de objetos da fonte e retorna o número do objeto Type0. */
  write(w) {
    const name = this.psName();
    const um = this.program.unitsPerEm;
    const asc = Math.round((this.program.ascender ?? um * 0.8) * this.scale);
    const desc = Math.round((this.program.descender ?? -um * 0.2) * this.scale);
    const bbox = this.program.fontBBox ? this.program.fontBBox.map((v) => Math.round(v * this.scale)) : [-200, desc, 1200, asc];
    const italic = this.program.italicAngle ?? 0;
    const flags = 32 | (italic !== 0 ? 64 : 0);
    const gids = [...this.used.keys()].sort((a, b) => a - b);
    const subset = subsetTrueType(this.bytes, gids);
    const fontFile = w.addStream(`/Length1 ${subset.length}`, subset);
    const descriptor = w.addDict(
      `<< /Type /FontDescriptor /FontName /${name} /Flags ${flags} /FontBBox [${bbox.join(" ")}] /ItalicAngle ${italic} /Ascent ${asc} /Descent ${desc} /CapHeight ${asc} /StemV 80 /FontFile2 ${fontFile} 0 R >>`
    );
    const wParts = [];
    for (const gid of gids) wParts.push(`${gid} [${this.widthThousandths(gid)}]`);
    const cidFont = w.addDict(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap /Identity /DW 1000 /W [${wParts.join(" ")}] >>`
    );
    const toUnicode = w.addStream("", this.buildToUnicode(gids));
    return w.addDict(
      `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cidFont} 0 R] /ToUnicode ${toUnicode} 0 R >>`
    );
  }
  /** CMap ToUnicode: mapeia cada CID (=GID) usado ao seu code point Unicode. */
  buildToUnicode(gids) {
    const b = new ByteBuilder();
    b.str(
      "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n"
    );
    for (let i = 0; i < gids.length; i += 100) {
      const chunk = gids.slice(i, i + 100);
      b.str(`${chunk.length} beginbfchar
`);
      for (const gid of chunk) {
        const cp0 = this.used.get(gid);
        const table2 = this.symbolTable;
        const sym = table2 && cp0 >= 61472 && cp0 <= 61695 ? table2[cp0 - 61440] : void 0;
        const cp = sym ?? cp0;
        b.str(`<${gid.toString(16).padStart(4, "0")}> <${utf16beHex(String.fromCodePoint(cp))}>
`);
      }
      b.str("endbfchar\n");
    }
    b.str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
    return b.toUint8Array();
  }
};
var WORD_SYMBOL_UNICODE = {
  40: 40,
  41: 41,
  43: 43,
  45: 8722,
  61: 61,
  94: 8869,
  174: 8594,
  183: 8226,
  190: 9135,
  211: 169,
  227: 169
};
var WORD_WINGDINGS_UNICODE = {
  74: 9786,
  108: 9899,
  110: 9724,
  113: 10065,
  115: 11047,
  116: 10731,
  117: 9670,
  118: 10070,
  167: 9642,
  216: 10146,
  224: 8594,
  232: 10132,
  252: 10003
};

// ../docx-layout/src/pdf-writer/writer.ts
var PdfWriter = class {
  /** Corpo serializado de cada objeto (índice 0 = objeto 1). null = ainda não definido. */
  bodies = [];
  compress;
  constructor(opts = {}) {
    this.compress = opts.compress ?? true;
  }
  /** Reserva um número de objeto (1-based) para referência antecipada. */
  alloc() {
    this.bodies.push(null);
    return this.bodies.length;
  }
  /** Define o corpo de um objeto já alocado (entre `obj`/`endobj`). */
  define(num, body) {
    this.bodies[num - 1] = typeof body === "string" ? new ByteBuilder().str(body).toUint8Array() : body;
  }
  /** Atalho: aloca e define um dicionário a partir de uma string `<< ... >>`. */
  addDict(dict) {
    const n = this.alloc();
    this.define(n, dict);
    return n;
  }
  /**
   * Aloca e define um objeto stream. `dict` são as entradas extras do dicionário
   * (sem `/Length`, sem `<<`/`>>`). Comprime com FlateDecode quando habilitado e
   * vantajoso. Retorna o número do objeto.
   */
  addStream(dict, data, opts = {}) {
    const n = this.alloc();
    this.defineStream(n, dict, data, opts);
    return n;
  }
  defineStream(num, dict, data, opts = {}) {
    let payload = data;
    let filter = "";
    if (this.compress && (opts.allowCompress ?? true) && data.length > 64) {
      const z = zlibSync(data);
      if (z.length < data.length) {
        payload = z;
        filter = " /Filter /FlateDecode";
      }
    }
    const head = `<< ${dict.trim()}${filter} /Length ${payload.length} >>
stream
`;
    const b = new ByteBuilder();
    b.str(head).bytes(payload).str("\nendstream");
    this.define(num, b.toUint8Array());
  }
  /** Monta o arquivo PDF completo, com xref clássico e trailer. `root` = obj do /Catalog. */
  build(root) {
    const out = new ByteBuilder();
    out.str("%PDF-1.7\n");
    out.bytes(new Uint8Array([37, 226, 227, 207, 211])).str("\n");
    const offsets = new Array(this.bodies.length).fill(0);
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (!body) throw new Error(`Objeto PDF ${i + 1} alocado mas n\xE3o definido`);
      offsets[i] = out.length;
      out.str(`${i + 1} 0 obj
`).bytes(body).str("\nendobj\n");
    }
    const xrefOffset = out.length;
    const count = this.bodies.length + 1;
    out.str(`xref
0 ${count}
`);
    out.str("0000000000 65535 f \n");
    for (let i = 0; i < this.bodies.length; i++) {
      out.str(`${String(offsets[i]).padStart(10, "0")} 00000 n 
`);
    }
    out.str("trailer\n");
    out.str(`<< /Size ${count} /Root ${root} 0 R >>
`);
    out.str(`startxref
${xrefOffset}
%%EOF
`);
    return out.toUint8Array();
  }
};

// ../docx-layout/src/pdf-writer/document.ts
function rgb255(r, g, b) {
  return [r / 255, g / 255, b / 255];
}
function hexColor(hex) {
  const h = hex.replace("#", "");
  return rgb255(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}
var MAX_REAL = 1e9;
var fmt = (n) => {
  if (Number.isNaN(n)) return "0";
  const r = Math.round(Math.max(-MAX_REAL, Math.min(MAX_REAL, n)) * 1e3) / 1e3;
  return Object.is(r, -0) ? "0" : String(r);
};
var PdfPage = class {
  constructor(widthPt, heightPt, gsFor) {
    this.widthPt = widthPt;
    this.heightPt = heightPt;
    this.gsFor = gsFor;
  }
  widthPt;
  heightPt;
  gsFor;
  /** @internal */
  content = new ByteBuilder();
  /**
   * Desenha com opacidade (0..1) de preenchimento/traço: envolve o desenho em
   * q /GSn gs … Q. Página avulsa (sem documento) ou opaco: desenha direto.
   */
  withAlpha(fillAlpha, strokeAlpha, draw) {
    const fa = fillAlpha ?? 1, sa = strokeAlpha ?? 1;
    if (!this.gsFor || fa >= 1 && sa >= 1) {
      draw();
      return;
    }
    this.content.str(`q
/${this.gsFor(Math.max(0, fa), Math.max(0, sa))} gs
`);
    draw();
    this.content.str("Q\n");
  }
  fromTop(yTop) {
    return this.heightPt - yTop;
  }
  /** Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo. */
  fillRect(xPt, yTopPt, wPt, hPt, color2) {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(
      `${fmt(color2[0])} ${fmt(color2[1])} ${fmt(color2[2])} rg
${fmt(xPt)} ${fmt(y)} ${fmt(wPt)} ${fmt(hPt)} re f
`
    );
  }
  /** Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo. */
  line(x0, y0Top, x1, y1Top, color2, widthPt, dash) {
    const d = dash && dash.length ? `[${dash.map(fmt).join(" ")}] 0 d
` : "[] 0 d\n";
    this.content.str(
      `${fmt(color2[0])} ${fmt(color2[1])} ${fmt(color2[2])} RG
${fmt(widthPt)} w
${d}${fmt(x0)} ${fmt(this.fromTop(y0Top))} m ${fmt(x1)} ${fmt(this.fromTop(y1Top))} l S
`
    );
  }
  /**
   * Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
   * recebe sua própria matriz de texto (posição absoluta), reproduzindo
   * exatamente as posições calculadas pelo layout (inclusive o snap de 1/600").
   */
  glyphs(font, sizePt, color2, glyphs, opts = {}) {
    if (!glyphs.length) return;
    const c = this.content;
    const col = `${fmt(color2[0])} ${fmt(color2[1])} ${fmt(color2[2])}`;
    c.str(`BT
/${font.resourceName} ${fmt(sizePt)} Tf
${col} rg
`);
    if (opts.synthBold) c.str(`${col} RG ${fmt(sizePt / 35)} w 2 Tr
`);
    const a = fmt(opts.scaleX ?? 1);
    const skew = opts.synthItalic ? "0.21" : "0";
    if (opts.runs) {
      const sx = opts.scaleX ?? 1;
      let i = 0;
      while (i < glyphs.length) {
        const g0 = glyphs[i];
        let j = i + 1;
        while (j < glyphs.length && glyphs[j].baselineFromTopPt === g0.baselineFromTopPt && glyphs[j].xPt >= glyphs[j - 1].xPt) j++;
        let s = `${a} 0 ${skew} 1 ${fmt(g0.xPt)} ${fmt(this.fromTop(g0.baselineFromTopPt))} Tm [`;
        let pen = 0;
        for (let k = i; k < j; k++) {
          const g = glyphs[k];
          if (k > i) {
            const n = Math.round((pen - (g.xPt - g0.xPt) / sx) * 1e3 / sizePt);
            if (n !== 0) {
              s += `${n}`;
              pen -= n * sizePt / 1e3;
            }
          }
          s += `<${g.gid.toString(16).padStart(4, "0")}>`;
          pen += font.widthThousandths(g.gid) * sizePt / 1e3;
        }
        c.str(`${s}] TJ
`);
        i = j;
      }
    } else for (const g of glyphs) {
      const y = this.fromTop(g.baselineFromTopPt);
      c.str(`${a} 0 ${skew} 1 ${fmt(g.xPt)} ${fmt(y)} Tm <${g.gid.toString(16).padStart(4, "0")}> Tj
`);
    }
    if (opts.synthBold) c.str("0 Tr\n");
    c.str("ET\n");
  }
  /** Caminho preenchido e/ou contornado. */
  path(cmds, fill, stroke, evenOdd = false) {
    if (!cmds.length || !fill && !stroke) return;
    let s = "";
    if (fill) s += `${fmt(fill[0])} ${fmt(fill[1])} ${fmt(fill[2])} rg
`;
    if (stroke) {
      s += `${fmt(stroke.color[0])} ${fmt(stroke.color[1])} ${fmt(stroke.color[2])} RG ${fmt(stroke.widthPt)} w `;
      s += stroke.dash && stroke.dash.length ? `[${stroke.dash.map(fmt).join(" ")}] 0 d
` : "[] 0 d\n";
    }
    for (const cmd of cmds) {
      if (cmd.op === "M") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m
`;
      else if (cmd.op === "L") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l
`;
      else if (cmd.op === "C") {
        s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c
`;
      } else s += "h\n";
    }
    s += fill && stroke ? evenOdd ? "B*\n" : "B\n" : fill ? evenOdd ? "f*\n" : "f\n" : "S\n";
    this.content.str(s);
  }
  /** Preenche o caminho com um degradê (recorta pelo caminho e pinta com `sh`). */
  fillShaded(cmds, sh, evenOdd = false) {
    if (!cmds.length) return;
    let s = "q\n";
    for (const cmd of cmds) {
      if (cmd.op === "M") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m
`;
      else if (cmd.op === "L") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l
`;
      else if (cmd.op === "C") s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c
`;
      else s += "h\n";
    }
    s += `${evenOdd ? "W*" : "W"} n
/${sh.resourceName} sh
Q
`;
    this.content.str(s);
  }
  /** Empilha um recorte retangular (até popClip). */
  pushClipRect(xPt, yTopPt, wPt, hPt) {
    this.content.str(`q
${fmt(xPt)} ${fmt(this.fromTop(yTopPt + hPt))} ${fmt(wPt)} ${fmt(hPt)} re W n
`);
  }
  popClip() {
    this.content.str("Q\n");
  }
  /** Empilha um recorte por caminho (até popClip); `evenOdd` = regra par-ímpar. */
  pushClipPath(cmds, evenOdd = false) {
    let s = "q\n";
    for (const cmd of cmds) {
      if (cmd.op === "M") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m
`;
      else if (cmd.op === "L") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l
`;
      else if (cmd.op === "C") s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c
`;
      else s += "h\n";
    }
    this.content.str(`${s}${evenOdd ? "W*" : "W"} n
`);
  }
  /** Imagem pela matriz (a b c d e f) que leva o quadrado unitário à página (y a
   *  partir do TOPO; (0,0) = canto de cima à esquerda da imagem). */
  drawImageMatrix(img, a, b, c, d, e, f) {
    const H = this.heightPt;
    this.content.str(`q
${fmt(a)} ${fmt(-b)} ${fmt(-c)} ${fmt(d)} ${fmt(c + e)} ${fmt(H - d - f)} cm
/${img.resourceName} Do
Q
`);
  }
  /** Empilha uma transformação afim (matriz cm, em pt) até popClip(). */
  pushTransform(a, b, c, d, e, f) {
    this.content.str(`q
${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} cm
`);
  }
  /** Imagem com rotação (graus, horário, em torno do centro) e espelhamento. */
  drawImageTransformed(img, xPt, yTopPt, wPt, hPt, rotDeg = 0, flipH = false, flipV = false) {
    const cx = xPt + wPt / 2;
    const cy = this.fromTop(yTopPt + hPt / 2);
    const r = -rotDeg * Math.PI / 180;
    const cos = Math.cos(r), sin = Math.sin(r);
    const sx = flipH ? -wPt : wPt, sy = flipV ? -hPt : hPt;
    const a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
    const e = cx - (a + c) / 2, f = cy - (b + d) / 2;
    this.content.str(`q
${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} cm
/${img.resourceName} Do
Q
`);
  }
  /** Desenha uma imagem já embutida. (x,y) = canto superior esquerdo. */
  drawImage(img, xPt, yTopPt, wPt, hPt) {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(
      `q
${fmt(wPt)} 0 0 ${fmt(hPt)} ${fmt(xPt)} ${fmt(y)} cm
/${img.resourceName} Do
Q
`
    );
  }
};
var PdfDocument = class {
  writer;
  fonts = [];
  images = [];
  pages = [];
  shadings = [];
  /** ExtGState de opacidade: chave "ca|CA" → nome do recurso */
  alphaStates = /* @__PURE__ */ new Map();
  constructor(opts = {}) {
    this.writer = new PdfWriter({ compress: opts.compress });
  }
  /** Embute uma fonte TrueType (bytes crus + consultas de métrica). */
  embedFont(name, bytes, program) {
    const f = new EmbeddedFont(this.fonts.length, name, bytes, program);
    this.fonts.push(f);
    return f;
  }
  /** Embute um JPEG (baseline) diretamente via DCTDecode. */
  embedJpeg(bytes, widthPx, heightPx, components = 3, adobeInverted = false, decodeArr, smask) {
    const cs = components === 1 ? "/DeviceGray" : components === 4 ? "/DeviceCMYK" : "/DeviceRGB";
    const decode = components === 4 && adobeInverted ? " /Decode [1 0 1 0 1 0 1 0]" : decodeArr?.length ? ` /Decode [${decodeArr.map(fmt).join(" ")}]` : "";
    const sm = smask ? ` /SMask ${this.writer.addStream(`/Type /XObject /Subtype /Image /Width ${smask.width} /Height ${smask.height} /ColorSpace /DeviceGray /BitsPerComponent 8`, smask.alpha)} 0 R` : "";
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace ${cs} /BitsPerComponent 8 /Filter /DCTDecode${decode}${sm}`,
      bytes,
      { allowCompress: false }
      // já comprimido
    );
    const handle = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }
  /**
   * Embute pixels RGBA crus via DeviceRGB + FlateDecode. Quando o alpha não é
   * trivial (algum pixel < 255), o canal vira um /SMask DeviceGray — PNGs com
   * transparência preservam o recorte no PDF.
   */
  embedRgba(rgba, widthPx, heightPx) {
    const rgb4 = new Uint8Array(widthPx * heightPx * 3);
    const alpha = new Uint8Array(widthPx * heightPx);
    let hasAlpha = false;
    for (let i = 0, j = 0, k = 0; i < rgba.length; i += 4, j += 3, k++) {
      rgb4[j] = rgba[i];
      rgb4[j + 1] = rgba[i + 1];
      rgb4[j + 2] = rgba[i + 2];
      const a = rgba[i + 3];
      alpha[k] = a;
      if (a !== 255) hasAlpha = true;
    }
    let smask = "";
    if (hasAlpha) {
      const smaskNum = this.writer.addStream(
        `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceGray /BitsPerComponent 8`,
        alpha
      );
      smask = ` /SMask ${smaskNum} 0 R`;
    }
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8${smask}`,
      rgb4
    );
    const handle = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }
  /**
   * Degradê axial (ShadingType 2, do ponto 0 ao 1) ou radial (ShadingType 3,
   * círculos concêntricos de centro (x0,y0), raio 0 → r) com cores amostradas
   * (função tipo 0: n amostras RGB de 8 bits, como o Word grava). Coordenadas em
   * pt com y a partir do TOPO; estende as cores das pontas.
   */
  addShading(geom, samples, pageHeightPt) {
    const n = Math.max(2, Math.floor(samples.length / 3));
    const fn = this.writer.addStream(
      `/FunctionType 0 /Domain [0 1] /Range [0 1 0 1 0 1] /Size [${n}] /BitsPerSample 8 /Order 1 /Encode [0 ${n - 1}]`,
      samples.subarray(0, n * 3)
    );
    const H = pageHeightPt;
    const coords = geom.kind === "axial" ? `/ShadingType 2 /Coords [${fmt(geom.x0)} ${fmt(H - geom.y0)} ${fmt(geom.x1)} ${fmt(H - geom.y1)}]` : `/ShadingType 3 /Coords [${fmt(geom.x0)} ${fmt(H - geom.y0)} 0 ${fmt(geom.x0)} ${fmt(H - geom.y0)} ${fmt(geom.r)}]`;
    const objNum = this.writer.addDict(`<< /ColorSpace /DeviceRGB ${coords} /Extend [true true] /Function ${fn} 0 R >>`);
    const handle = { resourceName: `Sh${this.shadings.length}`, objNum };
    this.shadings.push(handle);
    return handle;
  }
  addPage(widthPt, heightPt) {
    const p = new PdfPage(widthPt, heightPt, (ca, CA) => {
      const key = `${fmt(ca)}|${fmt(CA)}`;
      let name = this.alphaStates.get(key);
      if (!name) {
        name = `GS${this.alphaStates.size}`;
        this.alphaStates.set(key, name);
      }
      return name;
    });
    this.pages.push(p);
    return p;
  }
  /** Serializa o PDF completo. */
  build() {
    const w = this.writer;
    const fontRefs = this.fonts.map((f) => ({ name: f.resourceName, ref: f.write(w) }));
    const fontDict = fontRefs.length ? `/Font << ${fontRefs.map((f) => `/${f.name} ${f.ref} 0 R`).join(" ")} >>` : "";
    const xobjDict = this.images.length ? `/XObject << ${this.images.map((i) => `/${i.handle.resourceName} ${i.objNum} 0 R`).join(" ")} >>` : "";
    const gsDict = this.alphaStates.size ? `/ExtGState << ${[...this.alphaStates].map(([k, n]) => {
      const [ca, CA] = k.split("|");
      return `/${n} << /Type /ExtGState /ca ${ca} /CA ${CA} >>`;
    }).join(" ")} >>` : "";
    const shDict = this.shadings.length ? `/Shading << ${this.shadings.map((h) => `/${h.resourceName} ${h.objNum} 0 R`).join(" ")} >>` : "";
    const resources = gsDict || shDict ? `<< ${fontDict} ${xobjDict} ${gsDict} ${shDict} >>` : `<< ${fontDict} ${xobjDict} >>`;
    const catalog = w.alloc();
    const pagesNode = w.alloc();
    const pageRefs = [];
    for (const page of this.pages) {
      const contentNum = w.addStream("", page.content.toUint8Array());
      const pageNum = w.addDict(
        `<< /Type /Page /Parent ${pagesNode} 0 R /MediaBox [0 0 ${fmt(page.widthPt)} ${fmt(page.heightPt)}] /Resources ${resources} /Contents ${contentNum} 0 R >>`
      );
      pageRefs.push(pageNum);
    }
    w.define(
      pagesNode,
      `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((r) => `${r} 0 R`).join(" ")}] >>`
    );
    w.define(catalog, `<< /Type /Catalog /Pages ${pagesNode} 0 R >>`);
    return w.build(catalog);
  }
};

// ../docx-layout/src/resolve.ts
var TOGGLES = ["b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow", "emboss", "imprint", "vanish"];
function mergeRFonts(base, over) {
  if (!over) return base;
  if (!base) return { ...over };
  const out = { ...base };
  const slot = (name, theme) => {
    if (over[name] !== void 0 || over[theme] !== void 0) {
      delete out[name];
      delete out[theme];
      if (over[name] !== void 0) out[name] = over[name];
      if (over[theme] !== void 0) out[theme] = over[theme];
    }
  };
  slot("ascii", "asciiTheme");
  slot("hAnsi", "hAnsiTheme");
  slot("eastAsia", "eastAsiaTheme");
  slot("cs", "cstheme");
  if (over.hint !== void 0) out.hint = over.hint;
  return out;
}
function mergeRPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over };
  const out = { ...base, ...over };
  const f = mergeRFonts(base.rFonts, over.rFonts);
  if (f) out.rFonts = f;
  if (base.lang && over.lang) out.lang = { ...base.lang, ...over.lang };
  return out;
}
function mergeTabs(base, over) {
  if (!over) return base;
  const map = /* @__PURE__ */ new Map();
  for (const t of base ?? []) map.set(t.pos, t);
  for (const t of over) {
    if (t.val === "clear") map.delete(t.pos);
    else map.set(t.pos, t);
  }
  return [...map.values()].sort((a, b) => a.pos - b.pos);
}
function mergePPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over, ...over.tabs ? { tabs: over.tabs.filter((t) => t.val !== "clear") } : {} };
  const out = { ...base, ...over };
  if (base.spacing || over.spacing) out.spacing = { ...base.spacing, ...over.spacing };
  if (base.ind || over.ind) {
    const ind2 = { ...base.ind, ...over.ind };
    if (over.ind?.hanging !== void 0 && over.ind.firstLine === void 0) delete ind2.firstLine;
    if (over.ind?.firstLine !== void 0 && over.ind.hanging === void 0) delete ind2.hanging;
    if (over.ind?.hangingChars !== void 0) delete ind2.firstLineChars;
    if (over.ind?.firstLineChars !== void 0) delete ind2.hangingChars;
    out.ind = ind2;
  }
  if (base.pBdr || over.pBdr) out.pBdr = { ...base.pBdr, ...over.pBdr };
  if (base.numPr || over.numPr) out.numPr = { ...base.numPr, ...over.numPr };
  const tabs = mergeTabs(base.tabs, over.tabs);
  if (tabs) out.tabs = tabs;
  if (base.rPr || over.rPr) out.rPr = mergeRPr(base.rPr, over.rPr);
  if (base.framePr || over.framePr) out.framePr = { ...base.framePr, ...over.framePr };
  return out;
}
function mergeBorders(base, over) {
  if (!over) return base;
  if (!base) return { ...over };
  return { ...base, ...over };
}
function mergeMargins(base, over) {
  if (!over) return base;
  if (!base) return { ...over };
  return { ...base, ...over };
}
function mergeTblPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over };
  const out = { ...base, ...over };
  const b = mergeBorders(base.tblBorders, over.tblBorders);
  if (b) out.tblBorders = b;
  const m = mergeMargins(base.tblCellMar, over.tblCellMar);
  if (m) out.tblCellMar = m;
  if (base.tblLook || over.tblLook) out.tblLook = { ...base.tblLook, ...over.tblLook };
  return out;
}
function mergeTrPr(base, over) {
  return { ...base ?? {}, ...over ?? {} };
}
function mergeTcPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over };
  const out = { ...base, ...over };
  const b = mergeBorders(base.tcBorders, over.tcBorders);
  if (b) out.tcBorders = b;
  const m = mergeMargins(base.tcMar, over.tcMar);
  if (m) out.tcMar = m;
  return out;
}
var COND_ORDER = [
  "wholeTable",
  "band1Vert",
  "band2Vert",
  "band1Horz",
  "band2Horz",
  "firstCol",
  "lastCol",
  "firstRow",
  "lastRow",
  "nwCell",
  "neCell",
  "swCell",
  "seCell"
];
var StyleResolver = class {
  constructor(fmt2) {
    this.fmt = fmt2;
    this.styles = fmt2.styles.styles;
    this.docDefaults = fmt2.styles.docDefaults;
    this.defaults = fmt2.styles.defaults;
  }
  fmt;
  paraCache = /* @__PURE__ */ new Map();
  charCache = /* @__PURE__ */ new Map();
  tableCache = /* @__PURE__ */ new Map();
  styles;
  docDefaults;
  defaults;
  chain(id, type) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    let cur = id ? own(this.styles, id) : void 0;
    while (cur && !seen.has(cur.styleId) && out.length < 32) {
      if (cur.type !== type) break;
      seen.add(cur.styleId);
      out.unshift(cur);
      cur = cur.basedOn ? own(this.styles, cur.basedOn) : void 0;
    }
    return out;
  }
  /** Cadeia basedOn de um estilo de parágrafo (raiz primeiro). */
  paraChain(id) {
    return this.chain(this.paraStyleId(id) ?? "", "paragraph");
  }
  /** Estilo de parágrafo efetivo (ausente/inexistente → estilo padrão). */
  paraStyleId(id) {
    if (id && own(this.styles, id)?.type === "paragraph") return id;
    return this.defaults.paragraph;
  }
  paraStyle(id) {
    const key = this.paraStyleId(id) ?? "";
    let r = this.paraCache.get(key);
    if (!r) {
      let pPr = {};
      let rPr = {};
      for (const s of this.chain(key, "paragraph")) {
        pPr = mergePPr(pPr, s.pPr);
        rPr = mergeRPr(rPr, s.rPr);
      }
      r = { pPr, rPr };
      this.paraCache.set(key, r);
    }
    return r;
  }
  charStyle(id) {
    if (!id) return {};
    let r = this.charCache.get(id);
    if (!r) {
      r = {};
      for (const s of this.chain(id, "character")) r = mergeRPr(r, s.rPr);
      if (!this.chain(id, "character").length && own(this.styles, id)?.type === "paragraph") r = this.paraStyle(id).rPr;
      this.charCache.set(id, r);
    }
    return r;
  }
  tableStyle(id) {
    const key = id && own(this.styles, id)?.type === "table" ? id : this.defaults.table ?? "";
    let r = this.tableCache.get(key);
    if (!r) {
      r = { tblPr: {}, trPr: {}, tcPr: {}, pPr: {}, rPr: {}, cond: {} };
      if (this.chain(key, "table").length) r.hasStyle = true;
      for (const s of this.chain(key, "table")) {
        r.tblPr = mergeTblPr(r.tblPr, s.tblPr);
        r.trPr = mergeTrPr(r.trPr, s.trPr);
        r.tcPr = mergeTcPr(r.tcPr, s.tcPr);
        r.pPr = mergePPr(r.pPr, s.pPr);
        r.rPr = mergeRPr(r.rPr, s.rPr);
        for (const [t, part] of Object.entries(s.tblStylePr ?? {})) {
          const prev = r.cond[t] ?? {};
          r.cond[t] = {
            pPr: mergePPr(prev.pPr, part.pPr),
            rPr: mergeRPr(prev.rPr, part.rPr),
            tblPr: mergeTblPr(prev.tblPr, part.tblPr),
            trPr: mergeTrPr(prev.trPr, part.trPr),
            tcPr: mergeTcPr(prev.tcPr, part.tcPr)
          };
        }
      }
      this.tableCache.set(key, r);
    }
    return r;
  }
};
function cascadeRPr(docDefaults, styleLevels, direct) {
  let out = { ...docDefaults ?? {} };
  const toggled = {};
  for (const lvl of styleLevels) {
    if (!lvl) continue;
    const { ...rest } = lvl;
    for (const k of TOGGLES) {
      if (lvl[k] === void 0) continue;
      delete rest[k];
      if (lvl[k]) toggled[k] = !(toggled[k] ?? false);
      else toggled[k] ??= false;
    }
    out = mergeRPr(out, rest);
  }
  for (const k of TOGGLES) {
    const t = toggled[k];
    if (t === void 0) continue;
    const base = docDefaults?.[k] ?? false;
    out[k] = t ? !base : base;
  }
  return mergeRPr(out, direct);
}
function fontOfSlot(rf, slot, theme) {
  if (!rf) return void 0;
  const themeKey = slot === "cs" ? "cstheme" : `${slot}Theme`;
  const t = rf[themeKey];
  if (t) {
    const set = t.startsWith("major") ? theme.major : theme.minor;
    const name = t.endsWith("EastAsia") ? set.ea : t.endsWith("Bidi") ? set.cs : set.latin;
    if (name) return name;
  }
  return rf[slot];
}
var own = (rec, k) => rec && k !== void 0 && Object.hasOwn(rec, k) ? rec[k] : void 0;
var HIGHLIGHT = {
  yellow: "FFFF00",
  green: "00FF00",
  cyan: "00FFFF",
  magenta: "FF00FF",
  blue: "0000FF",
  red: "FF0000",
  darkBlue: "000080",
  darkCyan: "008080",
  darkGreen: "008000",
  darkMagenta: "800080",
  darkRed: "800000",
  darkYellow: "808000",
  darkGray: "808080",
  lightGray: "C0C0C0",
  black: "000000",
  white: "FFFFFF"
};
var highlightHex = (name) => own(HIGHLIGHT, name);
var THEME_ALIAS = {
  text1: "dk1",
  background1: "lt1",
  text2: "dk2",
  background2: "lt2",
  dark1: "dk1",
  light1: "lt1",
  dark2: "dk2",
  light2: "lt2",
  hyperlink: "hlink",
  followedHyperlink: "folHlink",
  tx1: "dk1",
  bg1: "lt1",
  tx2: "dk2",
  bg2: "lt2"
};
function rgb(hex) {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function toHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return (c(r) + c(g) + c(b)).toUpperCase();
}
function applyTintShade(hex, tint, shade) {
  if (!tint && !shade) return hex.toUpperCase();
  const [r, g, b] = rgb(hex).map((v) => v / 255);
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
  const ch = (x) => {
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
    return Math.floor(v * 255);
  };
  return toHex(ch(h + 1 / 3), ch(h), ch(h - 1 / 3));
}
function resolveColor(spec, theme) {
  if (!spec) return void 0;
  if (spec.themeColor) {
    const key = own(THEME_ALIAS, spec.themeColor) ?? spec.themeColor;
    const base = own(theme.colors, key);
    if (base) return applyTintShade(base, spec.themeTint, spec.themeShade);
  }
  const v = spec.val;
  if (!v || v === "auto") return void 0;
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : void 0;
}
var SHD_COVER = {
  horzStripe: 0.5,
  vertStripe: 0.5,
  reverseDiagStripe: 0.5,
  diagStripe: 0.5,
  horzCross: 0.5,
  diagCross: 0.75,
  thinHorzStripe: 0.25,
  thinVertStripe: 0.25,
  thinReverseDiagStripe: 0.25,
  thinDiagStripe: 0.25,
  thinHorzCross: 0.4375,
  thinDiagCross: 0.4375,
  pct12: 0.125,
  pct37: 0.375,
  pct62: 0.625,
  pct87: 0.875
};
function shadingFill(shd, theme) {
  if (!shd || shd.val === "nil") return void 0;
  const fg = () => resolveColor({ val: shd.color, themeColor: shd.themeColor }, theme) ?? "000000";
  if (shd.val === "solid") return fg();
  const fill = shd.themeFill ? resolveColor({ themeColor: shd.themeFill, themeTint: shd.themeFillTint, themeShade: shd.themeFillShade }, theme) : shd.fill && shd.fill !== "auto" ? shd.fill.toUpperCase() : void 0;
  const v = shd.val ?? "clear";
  const cover = own(SHD_COVER, v) ?? (/^pct\d+$/.test(v) ? parseInt(v.slice(3), 10) / 100 : void 0);
  if (cover === void 0) return fill;
  const f = fg(), bg = fill ?? "FFFFFF";
  const mix = (i) => Math.round(parseInt(bg.slice(i, i + 2), 16) * (1 - cover) + parseInt(f.slice(i, i + 2), 16) * cover);
  return [0, 2, 4].map((i) => mix(i).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function resolveDrawingColor(spec, theme) {
  if (!spec) return void 0;
  const [head, mods] = spec.split("|");
  const hex = head.startsWith("@") ? own(theme.colors, own(THEME_ALIAS, head.slice(1)) ?? head.slice(1)) : head;
  if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) return void 0;
  if (!mods) return hex.toUpperCase();
  const list = mods.split(",").map((m) => {
    const [k, v] = m.split("=");
    const n = v === void 0 || v === "undefined" ? void 0 : parseInt(v, 10);
    return [k, n !== void 0 && Number.isFinite(n) ? n : void 0];
  });
  const [r, g, b] = applyColorMods(rgb(hex).map((v) => v / 255), list);
  return toHex(r * 255, g * 255, b * 255);
}

// ../docx-layout/src/fonts.ts
var metricsCache = /* @__PURE__ */ new WeakMap();
function faceMetrics(font) {
  let m = metricsCache.get(font);
  if (!m) {
    const fm = font.metrics;
    const u = fm.unitsPerEm || 1e3;
    const hheaTotal = fm.ascender - fm.descender + fm.lineGap;
    let asc, desc, gap;
    if ((fm.fsSelection ?? 0) & 128) {
      asc = fm.sTypoAscender;
      desc = -fm.sTypoDescender;
      gap = fm.sTypoLineGap;
    } else if (fm.usWinAscent > 0 || fm.usWinDescent > 0) {
      asc = fm.usWinAscent;
      desc = fm.usWinDescent;
      gap = Math.max(0, hheaTotal - (asc + desc));
    } else {
      asc = fm.ascender;
      desc = -fm.descender;
      gap = fm.lineGap;
    }
    if ((fm.codePageRange1 ?? 0) >>> 17 & 31) {
      const extra = Math.round(0.15 * (asc + desc));
      asc += extra;
      desc += extra;
      gap = 0;
    }
    const lineHeight = (asc + desc + gap) / u;
    m = {
      ascent: (gap + asc) / u,
      descent: desc / u,
      lineHeight,
      underlinePos: fm.underlinePosition ? -fm.underlinePosition / u : 0.1,
      underlineThick: fm.underlineThickness > 0 ? fm.underlineThickness / u : 0.05,
      bareAscent: asc / u,
      ...fm.ySuperscriptYOffset && fm.ySuperscriptYOffset > 0 ? { supOffset: fm.ySuperscriptYOffset / u } : {}
    };
    metricsCache.set(font, m);
  }
  return m;
}
var VERT_TABLE = {
  "arial": ["5555666767878999aabbbcccdcdeeefffgggh", "1111221112221222222322233322333344434"],
  "calibri": ["5544555677888999aabbabbbcccdddeeefffg", "1221122212222322233333334434444544455"],
  "courier new": ["35445556567667778899999aababbccccdddd", "1221122222222322333233344434445444555"],
  "segoe ui": ["4556666778989aaabbccbddceeefffggghhhi", "1121112221222232223333333344334445444"],
  "times new roman": ["4555666777899999aabbbcccddeffefffgggh", "1112211222222222322233323233333333344"],
  "tahoma": ["4555666777888999aabbbcccdddeeefffgggh", "0111122211222212222223222333323333444"],
  "verdana": ["4555666777888999aabbbcccdddeeefffgggh", "0111112211222232222233222333223333444"],
  "cambria": ["333444455556666777788889999aaaabbbbcc", "1111111112221222222222333323333333344"],
  "georgia": ["334444555666677778888999aaaabbbbccccd", "1111111122221222222222333322333333333"],
  "century gothic": ["3344445555666677788889999aaaabbbbcccc", "1111111111122212222222222233333333333"]
};
var VERT_ALIAS = { "calibri light": "calibri" };
function vertTable(family, base, k) {
  const f = family.toLowerCase();
  const key = Object.hasOwn(VERT_ALIAS, f) ? VERT_ALIAS[f] : f;
  const t = Object.hasOwn(VERT_TABLE, key) ? VERT_TABLE[key][k] : void 0;
  const i = (base - 6) * 2;
  if (!t || !Number.isInteger(i) || i < 0 || i >= t.length) return void 0;
  return parseInt(t[i], 36) / 2;
}
function superscriptRaiseFor(family, m, base, sup) {
  return vertTable(family, base, 0) ?? superscriptRaisePt(m, base, sup);
}
function subscriptDropPt(family, base) {
  return vertTable(family, base, 1) ?? base * 0.08;
}
function superscriptRaisePt(m, base, sup) {
  const half = (v) => Math.floor(v * 2 + 0.5) / 2;
  const align = half(m.ascent * base - m.bareAscent * sup);
  return m.supOffset !== void 0 ? Math.min(half(m.supOffset * base), align) : align;
}
function isSymbolFont(font) {
  return (font.metrics.codePageRange1 ?? 0) >>> 31 === 1 || font.glyphId(61472) !== 0;
}
var own2 = (rec, k) => rec && k !== void 0 && Object.hasOwn(rec, k) ? rec[k] : void 0;
var ALIASES = {
  helvetica: "Arial",
  "helvetica neue": "Arial",
  arialmt: "Arial",
  "arial mt": "Arial",
  "ms sans serif": "Microsoft Sans Serif",
  "tms rmn": "Times New Roman",
  times: "Times New Roman",
  "times roman": "Times New Roman",
  timesnewromanpsmt: "Times New Roman",
  "ms serif": "Times New Roman",
  courier: "Courier New",
  "courier newpsmt": "Courier New",
  couriernewpsmt: "Courier New",
  "ms shell dlg": "Microsoft Sans Serif",
  "ms shell dlg 2": "Tahoma",
  "arial unicode ms": "Arial",
  symbolmt: "Symbol",
  "wingdings-regular": "Wingdings",
  "zapfdingbats": "Wingdings"
};
function parsePostScriptName(name) {
  const m = /^([A-Za-z][A-Za-z0-9 ]*?)[-,](Bold|BoldMT|Italic|ItalicMT|BoldItalic|BoldItalicMT|Regular|MT|Roman|BoldOblique|Oblique|Light|Semibold)$/.exec(name);
  if (!m) return null;
  const fam = m[1].replace(/MT$/, "").replace(/PS$/, "");
  const st = m[2].toLowerCase();
  return {
    family: fam.replace(/([a-z])([A-Z])/g, "$1 $2"),
    bold: st.includes("bold") || void 0,
    italic: st.includes("italic") || st.includes("oblique") || void 0
  };
}
function genericFor(info) {
  switch (info?.family) {
    case "roman":
      return "Times New Roman";
    case "modern":
      return "Courier New";
    case "script":
      return "Times New Roman";
    case "decorative":
      return "Times New Roman";
    case "swiss":
      return "Arial";
    default: {
      const p = info?.panose1;
      if (p && p.length >= 4) {
        const serif = parseInt(p.slice(2, 4), 16);
        if (serif >= 11 && serif <= 13) return "Arial";
        if (serif > 0 && serif < 11) return "Times New Roman";
      }
      return "Times New Roman";
    }
  }
}
var CJK_DEFAULT = {
  "80": ["Yu Gothic", "Yu Gothic"],
  "81": ["Dotum", "Batang"],
  "86": ["Microsoft YaHei", "SimSun"],
  "88": ["Microsoft JhengHei", "PMingLiU"]
};
var FaceResolver = class {
  constructor(provider, fontTable = {}, fallbacks = ["Times New Roman", "Arial", "Liberation Serif", "Liberation Sans"], docDefault) {
    this.provider = provider;
    this.fontTable = fontTable;
    this.fallbacks = fallbacks;
    this.docDefault = docDefault;
  }
  provider;
  fontTable;
  fallbacks;
  docDefault;
  cache = /* @__PURE__ */ new Map();
  get(family, bold, italic) {
    const fam = (family ?? "").trim() || "Times New Roman";
    const key = `${fam.toLowerCase()}|${bold ? 1 : 0}${italic ? 1 : 0}`;
    let f = this.cache.get(key);
    if (!f) {
      f = this.lookup(fam, bold, italic);
      this.cache.set(key, f);
    }
    return f;
  }
  lookup(fam, bold, italic) {
    const tries = [{ family: fam, bold, italic }];
    const alias = own2(ALIASES, fam.toLowerCase());
    const info0 = own2(this.fontTable, fam);
    const cjk = CJK_DEFAULT[info0?.charset?.toUpperCase() ?? ""]?.[info0?.family === "roman" ? 1 : 0];
    if (cjk) {
      if (!alias && info0?.altName) for (const alt of info0.altName.split(/[,;]/)) tries.push({ family: alt.trim(), bold, italic });
      tries.push({ family: cjk, bold, italic });
    }
    if (alias) tries.push({ family: alias, bold, italic });
    const ps = parsePostScriptName(fam);
    if (ps) {
      const a2 = own2(ALIASES, ps.family.toLowerCase()) ?? ps.family;
      tries.push({ family: a2, bold: bold || !!ps.bold, italic: italic || !!ps.italic });
    }
    const info = own2(this.fontTable, fam);
    if (info?.altName) for (const alt of info.altName.split(/[,;]/)) tries.push({ family: alt.trim(), bold, italic });
    const symbolic = info?.charset === "02" || info?.family === "decorative";
    if (!symbolic) {
      const arabic = info?.sig?.usb0 ? (parseInt(info.sig.usb0, 16) & 1 << 13) !== 0 : false;
      if (arabic) tries.push({ family: info?.family === "roman" ? "Sakkal Majalla" : "Arial", bold, italic });
      else tries.push({ family: !info || info.family === "roman" ? "Cambria" : "Calibri", bold, italic });
    }
    void this.docDefault;
    tries.push({ family: genericFor(info), bold, italic });
    for (const fb of this.fallbacks) tries.push({ family: fb, bold, italic });
    for (const t of tries) {
      if (!t.family) continue;
      const face = this.provider.face(t.family, t.bold, t.italic);
      if (face) return face;
    }
    throw new Error(`nenhuma fonte dispon\xEDvel para "${fam}"`);
  }
};
function withEmbeddedFonts(provider, embedded, makeFont) {
  if (!embedded.length) return provider;
  const byFam = /* @__PURE__ */ new Map();
  for (const e of embedded) {
    try {
      const font = makeFont(e.data);
      const m = byFam.get(e.family.toLowerCase()) ?? /* @__PURE__ */ new Map();
      m.set(e.variant, { font, bytes: e.data });
      byFam.set(e.family.toLowerCase(), m);
    } catch {
    }
  }
  const cache2 = /* @__PURE__ */ new Map();
  return {
    face(family, bold, italic) {
      const fam = byFam.get(family.toLowerCase());
      if (!fam) return provider.face(family, bold, italic);
      const key = `${family.toLowerCase()}|${bold}|${italic}`;
      if (cache2.has(key)) return cache2.get(key);
      const want = bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
      const order = [want, bold ? "bold" : "regular", italic ? "italic" : "regular", "regular", "bold", "italic", "boldItalic"];
      let out = null;
      for (const v of order) {
        const f = fam.get(v);
        if (!f) continue;
        const fb = v === "bold" || v === "boldItalic", fi = v === "italic" || v === "boldItalic";
        out = {
          key: `embed:${family}|${v}`,
          family,
          font: f.font,
          bytes: f.bytes,
          bold,
          italic,
          ...bold && !fb ? { synthBold: true } : {},
          ...italic && !fi ? { synthItalic: true } : {}
        };
        break;
      }
      if (out && (out.synthBold || out.synthItalic)) out = provider.face(family, bold, italic) ?? out;
      cache2.set(key, out);
      return out;
    }
  };
}

// ../docx-layout/src/numbering.ts
var ROMAN = [
  [1e3, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"]
];
function roman(n) {
  if (n <= 0) return String(n);
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) {
    out += s;
    n -= v;
  }
  return out;
}
function letters(n) {
  if (n <= 0) return String(n);
  const ch = String.fromCharCode(97 + (n - 1) % 26);
  return ch.repeat(Math.floor((n - 1) / 26) + 1);
}
var UNITS_PT = [
  "zero",
  "um",
  "dois",
  "tr\xEAs",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove"
];
var TENS_PT = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
function cardinalPt(n) {
  if (n < 20) return UNITS_PT[n] ?? String(n);
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    return TENS_PT[t] + (u ? ` e ${UNITS_PT[u]}` : "");
  }
  return String(n);
}
function formatNumber(n, fmt2, lang = "pt-BR") {
  switch (fmt2) {
    case void 0:
    case "decimal":
      return String(n);
    case "decimalZero":
      return n < 10 && n >= 0 ? `0${n}` : String(n);
    case "upperRoman":
      return roman(n).toUpperCase();
    case "lowerRoman":
      return roman(n);
    case "upperLetter":
      return letters(n).toUpperCase();
    case "lowerLetter":
      return letters(n);
    case "ordinal":
      return lang.startsWith("pt") ? `${n}\xBA` : `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? "th"}`;
    case "cardinalText": {
      const s = cardinalPt(n);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    case "ordinalText":
      return `${n}\xBA`;
    case "hex":
      return n.toString(16).toUpperCase();
    case "decimalEnclosedCircle":
      return n >= 1 && n <= 20 ? String.fromCodePoint(9312 + n - 1) : String(n);
    case "decimalEnclosedParen":
      return `(${n})`;
    case "decimalEnclosedFullstop":
      return `${n}.`;
    // número de página "- 1 -" (w:pgNumType fmt — oráculo hfopts fmt-dash)
    case "numberInDash":
      return `- ${n} -`;
    // notas "símbolos": *, †, ‡, § e depois repetidos (**, ††…) — oráculo notefmt, fmt-chicago
    case "chicago":
      return n <= 0 ? String(n) : "*\u2020\u2021\xA7"[(n - 1) % 4].repeat(Math.floor((n - 1) / 4) + 1);
    case "none":
      return "";
    case "bullet":
      return "";
    default:
      return String(n);
  }
}
var NumberingState = class _NumberingState {
  constructor(numbering, styles, lang = "pt-BR") {
    this.numbering = numbering;
    this.styles = styles;
    this.lang = lang;
  }
  numbering;
  styles;
  lang;
  /** contadores por abstractNum (compartilhados por todos os w:num dele) */
  counters = /* @__PURE__ */ new Map();
  /** w:num já usados (o startOverride só reinicia no 1º uso) */
  seenNums = /* @__PURE__ */ new Set();
  /** "numId:ilvl" com startOverride adiado (nível pai ainda sem uso no 1º uso do w:num) */
  deferred = /* @__PURE__ */ new Set();
  /** Cópia independente dos contadores (medições sem efeito colateral). */
  clone() {
    const c = new _NumberingState(this.numbering, this.styles, this.lang);
    for (const [k, v] of this.counters) c.counters.set(k, v.map((x) => x ? { ...x } : x));
    for (const n of this.seenNums) c.seenNums.add(n);
    for (const d of this.deferred) c.deferred.add(d);
    return c;
  }
  /** Lista (abstractNum efetivo) de um w:num — espaçamento automático entre itens. */
  listKey(numId) {
    const a = numId ? this.abstractFor(numId) : null;
    return a ? `a${a.absId}` : void 0;
  }
  /** abstractNum efetivo (segue numStyleLink → estilo de numeração → numId). */
  abstractFor(numId, depth = 0) {
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const abs = this.numbering.abstractNums[inst.abstractNumId];
    if (!abs) return null;
    if (abs.numStyleLink && depth < 4) {
      const st = own(this.styles, abs.numStyleLink);
      const linked = st?.pPr?.numPr?.numId;
      if (linked !== void 0 && linked !== numId) {
        const r = this.abstractFor(linked, depth + 1);
        if (r) return r;
      }
    }
    return { absId: abs.abstractNumId };
  }
  /** Nível efetivo (override da instância > abstractNum). */
  level(numId, ilvl) {
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const ov = inst.overrides[ilvl]?.lvl;
    if (ov && (ov.lvlText !== void 0 || ov.numFmt !== void 0)) return ov;
    const a = this.abstractFor(numId);
    const abs = a ? this.numbering.abstractNums[a.absId] : void 0;
    return abs?.levels[ilvl] ?? null;
  }
  /**
   * Avança o contador e devolve o marcador do parágrafo (null = sem numeração).
   * Regras medidas no Word (oráculo numbering2):
   *  - o contador é do abstractNum, compartilhado por todos os w:num dele;
   *  - startOverride só age no 1º uso do w:num: os níveis com override do
   *    nível do parágrafo para baixo reiniciam (valem o override); um nível
   *    pai com override ainda sem uso fica com o valor do override (o próximo
   *    parágrafo de OUTRO w:num nele soma 1) e reinicia no 1º parágrafo deste
   *    w:num naquele nível; pai já usado ignora o override;
   *  - o início do nível de um w:num é o seu startOverride (vale nos reinícios);
   *  - nível pai nunca usado (parágrafo pulou níveis) aparece com o início do
   *    nível e passa a contar: o próximo parágrafo nele vem com início + 1.
   */
  next(numId, ilvl) {
    if (!numId) return null;
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const a = this.abstractFor(numId);
    if (!a) return null;
    ilvl = Math.max(0, Math.min(8, ilvl));
    const lvl = this.level(numId, ilvl);
    if (!lvl) return null;
    const key = `a${a.absId}`;
    let c = this.counters.get(key);
    if (!c) {
      c = [];
      this.counters.set(key, c);
    }
    const ovStart = (l) => inst.overrides[l]?.startOverride;
    const lvlStart = (l) => this.level(numId, l)?.start ?? 0;
    const startOf = (l) => ovStart(l) ?? lvlStart(l);
    if (!this.seenNums.has(numId)) {
      this.seenNums.add(numId);
      for (let l = 0; l < 9; l++) {
        const s = ovStart(l);
        if (s === void 0) continue;
        if (l >= ilvl) c[l] = void 0;
        else if (!c[l]?.real) {
          c[l] = { v: s, real: false };
          this.deferred.add(`${numId}:${l}`);
        }
      }
    }
    const cur = c[ilvl];
    if (this.deferred.delete(`${numId}:${ilvl}`) || !cur) c[ilvl] = { v: startOf(ilvl), real: true };
    else c[ilvl] = { v: cur.v + 1, real: true };
    for (let l = 0; l < ilvl; l++) if (!c[l]) c[l] = { v: startOf(l), real: false };
    for (let d = ilvl + 1; d < 9; d++) {
      const r = this.level(numId, d)?.lvlRestart;
      if (r === 0) continue;
      if (r === void 0 || ilvl < r) c[d] = void 0;
    }
    const lvlText = lvl.lvlTextNull ? "" : lvl.lvlText ?? "";
    const fill = (t, own3) => t.replace(/%([1-9])/g, (_, k) => {
      const l = parseInt(k, 10) - 1;
      const n = c[l];
      const v = n?.real ? n.v : lvlStart(l);
      const fmt2 = own3.isLgl && l !== ilvl ? "decimal" : this.level(numId, l)?.numFmt ?? "decimal";
      return formatNumber(v, fmt2 === "bullet" ? "decimal" : fmt2, this.lang);
    });
    let text;
    let chapter;
    if (lvl.numFmt === "bullet") text = lvlText;
    else {
      text = fill(lvlText, lvl);
      const a2 = lvlText.search(/%[1-9]/), b = lvlText.lastIndexOf("%");
      if (a2 >= 0 && b >= a2) chapter = fill(lvlText.slice(a2, b + 2), lvl);
    }
    const out = { text, level: lvl, numId, ilvl, listKey: key, ...chapter !== void 0 ? { chapter } : {} };
    if (lvl.numFmt !== "bullet") {
      const refs = (t) => [...t.matchAll(/%([1-9])/g)].map((m) => +m[1] - 1);
      const parts = [text];
      let cited = new Set(refs(lvlText));
      for (let l = ilvl - 1; l >= 0 && !cited.has(l); l--) {
        const pl = this.level(numId, l);
        const pt = pl?.lvlTextNull ? "" : pl?.lvlText ?? "";
        if (!pl || pl.numFmt === "bullet") break;
        parts.unshift(fill(pt, pl));
        cited = /* @__PURE__ */ new Set([...cited, ...refs(pt)]);
      }
      out.parts = parts;
    }
    return out;
  }
};

// ../docx-layout/src/context.ts
var cloneNotes = (n) => ({
  marks: { footnote: new Map(n.marks.footnote), endnote: new Map(n.marks.endnote) },
  seq: { ...n.seq },
  endnoteOrder: [...n.endnoteOrder]
});
var DocContext = class {
  constructor(fmt2, provider, opts = {}) {
    this.fmt = fmt2;
    this.resolver = new StyleResolver(fmt2);
    const ddFonts = fmt2.styles.docDefaults.rPr?.rFonts;
    this.faces = new FaceResolver(provider, fmt2.fontTable, void 0, fontOfSlot(ddFonts, "ascii", fmt2.theme) ?? fmt2.theme.minor.latin);
    this.opts = { advanceEm: opts.advanceEm ?? "nominal", advanceRound: opts.advanceRound ?? "word", justifyShrink: opts.justifyShrink ?? { ratio: 0.25, expandRatio: 0.5 }, lang: opts.lang ?? "pt-BR", now: opts.now ?? /* @__PURE__ */ new Date(), ...opts.onWordFit ? { onWordFit: opts.onWordFit } : {}, hyphenation: opts.hyphenation ?? true, ...opts.hyphenationLanguages ? { hyphenationLanguages: opts.hyphenationLanguages } : {}, ...opts.onField ? { onField: opts.onField } : {} };
    this.numbering = new NumberingState(fmt2.numbering, fmt2.styles.styles, this.opts.lang);
    this.rev = new RevisionDisplay(opts.revisions, opts.revisions?.order ?? []);
  }
  fmt;
  resolver;
  faces;
  numbering;
  warnings = /* @__PURE__ */ new Set();
  opts;
  /** como as revisões aparecem (modo, filtros, cores) */
  rev;
  warn(msg) {
    this.warnings.add(msg);
  }
  notes = { marks: { footnote: /* @__PURE__ */ new Map(), endnote: /* @__PURE__ */ new Map() }, seq: { footnote: 0, endnote: 0 }, endnoteOrder: [] };
  /** numeração da seção corrente (o motor troca em cada seção) */
  noteNumbering = {
    footnote: { fmt: "decimal", start: 1, restart: "continuous" },
    endnote: { fmt: "lowerRoman", start: 1, restart: "continuous" }
  };
  /** marcas finais de uma passada anterior (reinício por página: a página da
   *  referência só se sabe depois de diagramar) */
  noteMarkOverride;
  /** contadores dos campos SEQ (ordem do documento) */
  seqCounters = /* @__PURE__ */ new Map();
  /** títulos diagramados (níveis) e o ponto de cada SEQ — ver FlowState */
  heads = [];
  seqHeads = /* @__PURE__ */ new Map();
  /** Fotografia do estado que avança com o conteúdo. */
  saveFlow() {
    return { numbering: this.numbering.clone(), seq: new Map(this.seqCounters), heads: [...this.heads], seqHeads: new Map(this.seqHeads), notes: cloneNotes(this.notes) };
  }
  /** Volta ao estado fotografado (a fotografia continua reutilizável). */
  restoreFlow(s) {
    this.numbering = s.numbering.clone();
    this.seqCounters = new Map(s.seq);
    this.heads = [...s.heads];
    this.seqHeads = new Map(s.seqHeads);
    this.notes = cloneNotes(s.notes);
  }
  /** Medição sem efeito colateral: não avança listas, SEQ nem números de nota. */
  pure(fn) {
    const s = this.saveFlow();
    try {
      return fn();
    } finally {
      this.restoreFlow(s);
    }
  }
  /** Seção nova: formato/início da numeração das notas e o reinício por seção. */
  beginNoteSection(n, first) {
    this.noteNumbering = n;
    for (const k of ["footnote", "endnote"]) if (first || n[k].restart === "eachSect") this.notes.seq[k] = 0;
  }
  /** Página nova: reinicia a contagem das notas de rodapé "a cada página". */
  beginNotePage() {
    if (this.noteNumbering.footnote.restart === "eachPage") this.notes.seq.footnote = 0;
  }
  /** Marca exibida de uma nota (ordem da 1ª referência, no formato da seção dela);
   *  com marca personalizada não consome número (oráculo notefmt, custom-mark). */
  noteMark(kind, id, custom = false) {
    const marks = this.notes.marks[kind];
    let m = marks.get(id);
    if (m === void 0) {
      if (kind === "endnote") this.notes.endnoteOrder.push(id);
      if (custom) m = "";
      else {
        const nn = this.noteNumbering[kind];
        const seq = ++this.notes.seq[kind];
        m = this.noteMarkOverride?.get(`${kind[0]}${id}`) ?? formatNumber(nn.start - 1 + seq, nn.fmt, this.opts.lang);
      }
      marks.set(id, m);
    }
    return m;
  }
  /** Marca já atribuída (sem numerar). */
  noteMarkOf(kind, id) {
    return this.notes.marks[kind].get(id);
  }
  /** Todas as marcas atribuídas ("f<id>"/"e<id>") — NOTEREF na passada seguinte. */
  allNoteMarks() {
    const out = /* @__PURE__ */ new Map();
    for (const [id, m] of this.notes.marks.footnote) out.set(`f${id}`, m);
    for (const [id, m] of this.notes.marks.endnote) out.set(`e${id}`, m);
    return out;
  }
  /** Notas de fim referenciadas até aqui (ordem da 1ª referência). */
  get endnoteOrder() {
    return this.notes.endnoteOrder;
  }
};
function emptyFormatting() {
  return {
    styles: { docDefaults: {}, styles: {}, defaults: {} },
    numbering: { abstractNums: {}, nums: {}, picBullets: {} },
    theme: { major: { scripts: {} }, minor: { scripts: {} }, colors: {} },
    settings: {
      defaultTabStop: 720,
      compatibilityMode: 15,
      compat: {},
      evenAndOddHeaders: false,
      mirrorMargins: false,
      autoHyphenation: false,
      doNotHyphenateCaps: false,
      displayBackgroundShape: false,
      updateFields: false
    },
    fontTable: {}
  };
}
var eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function directRPr(run2) {
  const base = run2.rpr ? { ...run2.rpr } : {};
  const p = run2.props;
  const orig = editBaseProps(run2, run2.rpr);
  if (!run2.rpr) {
    if (p.bold) base.b = true;
    if (p.italic) base.i = true;
    if (p.underline && !(p.link && !p.underlineStyle && !p.underlineColor)) base.u = { val: p.underlineStyle ?? "single", ...p.underlineColor ? { color: p.underlineColor } : {} };
    if (p.strike) base.strike = true;
    if (p.doubleStrike) base.dstrike = true;
    if (p.allCaps) base.caps = true;
    if (p.smallCaps) base.smallCaps = true;
    if (p.vertAlign && p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign;
    if (p.szHalfPt !== void 0) base.sz = p.szHalfPt;
    if (p.color && !(p.link && p.color === "0563C1")) base.color = { val: p.color };
    if (p.highlight) base.highlight = p.highlight;
    if (p.fontAscii && p.fontAscii !== orig.fontAscii) base.rFonts = { ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii };
    if (p.charSpacingTwips) base.spacing = p.charSpacingTwips;
    if (p.charStyle) base.rStyle = p.charStyle;
    return base;
  }
  if (p.bold !== orig.bold) base.b = p.bold;
  if (p.italic !== orig.italic) base.i = p.italic;
  if (p.underline !== orig.underline || p.underlineStyle !== orig.underlineStyle || p.underlineColor !== orig.underlineColor) {
    base.u = p.underline ? { val: p.underlineStyle ?? "single", ...p.underlineColor ? { color: p.underlineColor } : {} } : { val: "none" };
  }
  if (p.strike !== orig.strike) base.strike = p.strike;
  if (p.doubleStrike !== orig.doubleStrike) base.dstrike = !!p.doubleStrike;
  if (p.allCaps !== orig.allCaps) base.caps = p.allCaps;
  if (p.smallCaps !== orig.smallCaps) base.smallCaps = p.smallCaps;
  if (p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign ?? "baseline";
  if (p.szHalfPt !== orig.szHalfPt) {
    if (p.szHalfPt === void 0) delete base.sz;
    else base.sz = p.szHalfPt;
  }
  if (p.color !== orig.color) {
    if (p.color === void 0) delete base.color;
    else base.color = { val: p.color };
  }
  if (p.highlight !== orig.highlight) {
    if (p.highlight === void 0) delete base.highlight;
    else base.highlight = p.highlight;
  }
  if (p.fontAscii !== orig.fontAscii) {
    if (p.fontAscii === void 0) delete base.rFonts;
    else base.rFonts = { ...base.rFonts, ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii, asciiTheme: void 0, hAnsiTheme: void 0, cstheme: void 0 };
  }
  if (p.charSpacingTwips !== orig.charSpacingTwips) {
    if (!p.charSpacingTwips) delete base.spacing;
    else base.spacing = p.charSpacingTwips;
  }
  if (p.charStyle !== orig.charStyle) {
    if (p.charStyle === void 0) delete base.rStyle;
    else base.rStyle = p.charStyle;
  }
  return base;
}
function directPPr(para2) {
  const base = para2.ppr ? { ...para2.ppr } : {};
  const p = para2.props;
  const orig = paraPropsFromPPr(para2.ppr);
  if (!eq(p.alignment, orig.alignment)) {
    if (p.alignment) base.jc = p.alignment;
    else delete base.jc;
  }
  if (p.styleId !== orig.styleId) {
    if (p.styleId) base.pStyle = p.styleId;
    else delete base.pStyle;
  }
  if (!eq(p.numbering, orig.numbering)) {
    if (!p.numbering) base.numPr = { numId: 0 };
    else if (para2.ppr?.numPr?.numId) base.numPr = { ...para2.ppr.numPr, ilvl: p.numbering.ilvl };
    else base.numPr = { numId: p.numbering.kind === "decimal" ? 1002 : 1001, ilvl: p.numbering.ilvl };
  }
  if (p.indentLeftTwips !== orig.indentLeftTwips || p.indentRightTwips !== orig.indentRightTwips || p.indentFirstLineTwips !== orig.indentFirstLineTwips) {
    const ind2 = { ...base.ind };
    if (p.indentLeftTwips !== void 0) ind2.left = p.indentLeftTwips;
    else delete ind2.left;
    if (p.indentRightTwips !== void 0) ind2.right = p.indentRightTwips;
    else delete ind2.right;
    delete ind2.firstLine;
    delete ind2.hanging;
    if (p.indentFirstLineTwips !== void 0) {
      if (p.indentFirstLineTwips < 0) ind2.hanging = -p.indentFirstLineTwips;
      else ind2.firstLine = p.indentFirstLineTwips;
    }
    base.ind = ind2;
  }
  if (p.lineTwentieths !== orig.lineTwentieths || p.spaceAfterTwips !== orig.spaceAfterTwips || p.spaceBeforeTwips !== orig.spaceBeforeTwips) {
    const sp2 = { ...base.spacing };
    if (p.lineTwentieths !== orig.lineTwentieths) {
      if (p.lineTwentieths !== void 0) {
        sp2.line = p.lineTwentieths;
        sp2.lineRule = "auto";
      } else {
        delete sp2.line;
        delete sp2.lineRule;
      }
    }
    if (p.spaceAfterTwips !== orig.spaceAfterTwips) {
      if (p.spaceAfterTwips !== void 0) sp2.after = p.spaceAfterTwips;
      else delete sp2.after;
    }
    if (p.spaceBeforeTwips !== orig.spaceBeforeTwips) {
      if (p.spaceBeforeTwips !== void 0) sp2.before = p.spaceBeforeTwips;
      else delete sp2.before;
    }
    base.spacing = sp2;
  }
  if (p.shadingHex !== orig.shadingHex) {
    if (p.shadingHex) base.shd = { val: "clear", fill: p.shadingHex };
    else delete base.shd;
  }
  if (!eq(p.borders, orig.borders)) {
    if (!p.borders) delete base.pBdr;
    else {
      base.pBdr = {};
      for (const side of ["top", "left", "bottom", "right"]) {
        const e = p.borders[side];
        if (e) base.pBdr[side] = { val: e.style, sz: e.sizeEighthPt, space: e.spacePt, ...e.color ? { color: e.color } : {} };
      }
    }
  }
  if (!eq(p.tabStops, orig.tabStops)) {
    base.tabs = (p.tabStops ?? []).map((t) => ({ val: t.align, pos: t.posTwips, ...t.leader ? { leader: t.leader } : {} }));
  }
  if (!!p.pageBreakBefore !== !!orig.pageBreakBefore) base.pageBreakBefore = !!p.pageBreakBefore;
  if (!!p.keepNext !== !!orig.keepNext) base.keepNext = !!p.keepNext;
  return base;
}

// ../docx-layout/src/revisions.ts
var AUTHOR_PALETTE = [
  "D13438",
  "0078D4",
  "5C2E91",
  "498205",
  "CC3595",
  "7160E8",
  "038387",
  "6D5700",
  "CF0F1F",
  "4E6AED",
  "B146C2",
  "394146",
  "0B6A0B",
  "CA5010",
  "750B1C",
  "5D5A58",
  "881798",
  "69797E",
  "005B70",
  "8E562E"
];
var MOVE_COLOR = "2C6234";
var BAR_COLOR = "000000";
var SIMPLE_BAR_COLOR = "C00000";
var BAR_WIDTH = 14.4;
function authorColor(order, author) {
  const i = order.indexOf(author);
  return AUTHOR_PALETTE[(i < 0 ? order.length : i) % AUTHOR_PALETTE.length];
}
function barX(marginLeft) {
  return Math.max(268.8, marginLeft >= 1440 ? marginLeft - 720 : marginLeft / 2);
}
var RevisionDisplay = class {
  mode;
  insDel;
  fmt;
  authors;
  order;
  colors;
  constructor(view, docOrder) {
    this.mode = view?.mode ?? "final";
    this.insDel = view?.insDel ?? true;
    this.fmt = view?.formatting ?? true;
    this.authors = view?.authors ? new Set(view.authors) : null;
    this.order = [...view?.order ?? docOrder];
    this.colors = view?.colors ?? {};
  }
  /** A marcação desta revisão aparece (modo 'all'/'simple', tipo e autor ligados)? */
  shown(r, kind) {
    if (!r) return false;
    if (kind === "insDel" ? !this.insDel : !this.fmt) return false;
    return !this.authors || this.authors.has(r.author);
  }
  color(author) {
    return this.colors[author] ?? authorColor(this.order, author);
  }
  /** O run aparece? Marcado? (texto inserido/excluído) */
  run(run2) {
    const { ins, del } = run2.props;
    if (!ins && !del) return null;
    if (this.mode === "original") return ins ? "hide" : null;
    const marks = this.mode === "all";
    if (del) {
      if (!marks || !this.shown(del, "insDel")) return "hide";
      return { color: del.move ? MOVE_COLOR : this.color(del.author), kind: "del", move: !!del.move };
    }
    if (!marks || !this.shown(ins, "insDel")) return null;
    return { color: ins.move ? MOVE_COLOR : this.color(ins.author), kind: "ins", move: !!ins.move };
  }
  /** rPr direto a desenhar: no modo Original, o de antes da formatação controlada. */
  directRPr(run2) {
    const f = run2.props.fmt;
    if (this.mode !== "original" || !f) return directRPr(run2);
    const c = run2.rpr?.change;
    if (c && c.author === f.author && c.date === f.date && JSON.stringify(runPropsFromRPr(c.rPr)) === JSON.stringify(f.old)) return { ...c.rPr };
    const p = run2.props;
    return directRPr({ ...run2, props: { ...f.old, ...p.src !== void 0 ? { src: p.src } : {}, ...p.link ? { link: p.link } : {} } });
  }
  /** Parágrafo a diagramar: no modo Original, com a formatação de antes. */
  paragraph(para2) {
    const f = para2.props.pfmt;
    if (this.mode !== "original" || !f) return para2;
    const c = para2.ppr?.change;
    const meta = { ...para2.props.src !== void 0 ? { src: para2.props.src } : {}, ...para2.props.sectionBreak ? { sectionBreak: para2.props.sectionBreak } : {} };
    if (c && c.author === f.author && c.date === f.date && JSON.stringify(paraPropsFromPPr(c.pPr)) === JSON.stringify(f.old)) {
      const ppr = { ...c.pPr, ...para2.ppr?.rPr ? { rPr: para2.ppr.rPr } : {} };
      return { ...para2, ppr, props: { ...paraPropsFromPPr(ppr), ...meta } };
    }
    return { ...para2, ppr: directPPr({ ...para2, props: { ...f.old, ...meta } }), props: { ...f.old, ...meta } };
  }
  /** A marca deste parágrafo some (o texto vai para o seguinte) nesta visão? */
  markGone(para2) {
    const { markDel, markIns } = para2.props;
    if (this.mode === "original") return !!markIns;
    if (!markDel) return false;
    return this.mode !== "all" || !this.shown(markDel, "insDel");
  }
  /** A revisão pede barra nesta visão? (texto, formatação, marca) */
  barFor(r, kind) {
    if (!r || this.mode !== "all" && this.mode !== "simple") return false;
    if (this.mode === "simple") return kind === "fmt" ? this.fmt : this.insDel;
    return this.shown(r, kind);
  }
  /** Cor das barras (null = sem barras). */
  barColor() {
    return this.mode === "all" ? BAR_COLOR : this.mode === "simple" ? SIMPLE_BAR_COLOR : null;
  }
};
var REV_JOINS = /* @__PURE__ */ Symbol("rev-joins");
function joinDeleted(carried, next) {
  const out = { ...next, runs: [...carried, ...next.runs] };
  out[REV_JOINS] = [carried.reduce((n, r) => n + r.text.length, 0)];
  return out;
}
function revisionRanges(rd, para2) {
  if (!rd.barColor()) return null;
  const ranges = [];
  let acc = 0;
  for (const r of para2.runs) {
    const rs = acc;
    acc += r.text.length;
    if (rd.barFor(r.props.ins, "insDel") || rd.barFor(r.props.del, "insDel") || rd.barFor(r.props.fmt, "fmt")) ranges.push([rs, acc, rd.run(r) === "hide"]);
  }
  if (rd.mode === "simple") for (const k of para2[REV_JOINS] ?? []) ranges.push([k, k, true]);
  const whole = rd.barFor(para2.props.pfmt, "fmt");
  const mark = rd.barFor(para2.props.markIns, "insDel") || rd.barFor(para2.props.markDel, "insDel");
  return ranges.length || whole || mark ? { ranges, whole, mark } : null;
}

// ../docx-layout/src/math.ts
var K = { leading: 0, axis: 1, numUp: 28, numUpD: 29, denDown: 30, denDownD: 31, numGap: 32, numGapD: 33, rule: 34, denGap: 35, denGapD: 36 };
var CM = { 0: 300, 1: 585, 28: 1200, 29: 1550, 30: 1030, 31: 1370, 32: 133, 33: 260, 34: 133, 35: 133, 36: 260 };
var infoCache = /* @__PURE__ */ new WeakMap();
function fontInfo(face) {
  let info = infoCache.get(face.font);
  if (!info) {
    info = { upm: face.font.metrics.unitsPerEm || 2048, k: null, scriptPct: 73, ital: /* @__PURE__ */ new Map(), box: () => null };
    try {
      if (face.bytes) info = parseFont(face.bytes) ?? info;
    } catch {
    }
    infoCache.set(face.font, info);
  }
  return info;
}
function parseFont(b) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tables = /* @__PURE__ */ new Map();
  const n = v.getUint16(4);
  for (let i = 0; i < n; i++) {
    const p = 12 + 16 * i;
    tables.set(String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]), v.getUint32(p + 8));
  }
  const head = tables.get("head");
  if (head === void 0) return null;
  const upm = v.getUint16(head + 18) || 2048;
  let k = null;
  let scriptPct = 73;
  const ital = /* @__PURE__ */ new Map();
  const m = tables.get("MATH");
  if (m !== void 0) {
    const c = m + v.getUint16(m + 4);
    scriptPct = v.getInt16(c) || 73;
    k = [];
    for (let i = 0; i <= 36; i++) k.push(v.getInt16(c + 8 + 4 * i));
    const gi = m + v.getUint16(m + 6);
    const io = v.getUint16(gi);
    if (io) {
      const ic = gi + io;
      const cov = ic + v.getUint16(ic);
      const cnt = v.getUint16(ic + 2);
      forCoverage(v, cov, (g, idx) => {
        if (idx < cnt) ital.set(g, v.getInt16(ic + 4 + 4 * idx));
      });
    }
  }
  const glyf = tables.get("glyf"), loca = tables.get("loca");
  const longLoca = v.getInt16(head + 50) === 1;
  const box = (gid) => {
    if (glyf === void 0 || loca === void 0) return null;
    const at = (i) => longLoca ? v.getUint32(loca + 4 * i) : v.getUint16(loca + 2 * i) * 2;
    const s = at(gid), e = at(gid + 1);
    if (e <= s || glyf + s + 10 > b.byteLength) return null;
    return [v.getInt16(glyf + s + 4), v.getInt16(glyf + s + 8)];
  };
  return { upm, k, scriptPct, ital, box };
}
function forCoverage(v, at, fn) {
  const fmt2 = v.getUint16(at), cnt = v.getUint16(at + 2);
  for (let i = 0; i < cnt; i++) {
    if (fmt2 === 1) fn(v.getUint16(at + 4 + 2 * i), i);
    else {
      const s = v.getUint16(at + 4 + 6 * i), e = v.getUint16(at + 6 + 6 * i), si = v.getUint16(at + 8 + 6 * i);
      for (let g = s; g <= e; g++) fn(g, si + g - s);
    }
  }
}
function kEm(info, i) {
  return info.k ? info.k[i] / info.upm : CM[i] / 2048;
}
var q600 = (tw) => Math.ceil(tw / 2.4 - 1e-6) * 2.4;
function mathTextMetrics(face) {
  const info = fontInfo(face);
  const fm = face.font.metrics;
  if (info.k && fm.sTypoAscender > 0) {
    const u = fm.unitsPerEm || 2048;
    return { ascent: (fm.sTypoAscender + Math.max(0, fm.sTypoLineGap)) / u, descent: -fm.sTypoDescender / u };
  }
  const m = faceMetrics(face.font);
  return { ascent: m.ascent, descent: m.descent };
}
var REL = new Set(Array.from("=<>\u2264\u2265\u2260\u2248\u2261\u223C\u2243\u2245\u221D\u2190\u2192\u2194\u21D0\u21D2\u21D4\u2208\u2209\u220B\u2282\u2283\u2286\u2287\u226A\u226B\u2254").map((c) => c.codePointAt(0)));
var BIN = new Set(Array.from("+-\u2212\xB1\u2213\xD7\xF7\xB7\u2217\u2218\u2219\u2229\u222A\u2227\u2228\u2295\u2297\u2296*").map((c) => c.codePointAt(0)));
var OPEN = new Set(Array.from("([{\u27E8\u2308\u230A").map((c) => c.codePointAt(0)));
var CLOSE = new Set(Array.from(")]}\u27E9\u2309\u230B").map((c) => c.codePointAt(0)));
var clsOf = (cp) => REL.has(cp) ? "rel" : BIN.has(cp) ? "bin" : OPEN.has(cp) ? "open" : CLOSE.has(cp) ? "close" : "ord";
function mathAlpha(cp, sty) {
  const up2 = cp >= 65 && cp <= 90, lo = cp >= 97 && cp <= 122;
  const s = sty ?? "i";
  if (s === "i") {
    if (cp === 104) return 8462;
    if (up2) return 119860 + cp - 65;
    if (lo) return 119886 + cp - 97;
    if (cp >= 945 && cp <= 969) return 120572 + cp - 945;
  } else if (s === "b") {
    if (up2) return 119808 + cp - 65;
    if (lo) return 119834 + cp - 97;
    if (cp >= 48 && cp <= 57) return 120782 + cp - 48;
  } else if (s === "bi") {
    if (up2) return 119912 + cp - 65;
    if (lo) return 119938 + cp - 97;
  }
  return cp;
}
function mathAtoms(env, nodes, lvl = "D", scale = 1, off = { n: 0 }) {
  const atoms = [];
  for (const nd of nodes) {
    if (nd.t === "br") continue;
    if (nd.t === "f") {
      const o0 = off.n;
      const fb = fracBox(env, nd, lvl, scale, off);
      const st = env.styleOf(void 0);
      atoms.push({ kind: "frac", cp: 65532, face: env.face(false, false), sizePt: st.style.sizePt * scale, style: st.style, adv: fb.w, box: fb, offset: o0, cls: "ord", ital: 0, italic: false, top: fb.top, bottom: fb.bottom });
      continue;
    }
    const { style } = env.styleOf(nd.rpr);
    const size = style.sizePt * scale;
    const bold = nd.sty === "b" || nd.sty === "bi";
    for (const ch of Array.from(nd.text)) {
      const cp0 = ch.codePointAt(0);
      let cp = mathAlpha(cp0, nd.sty);
      let face = env.face(bold && cp === cp0, false);
      if (cp !== cp0 && face.font.glyphId(cp) === 0) {
        face = env.face(bold, nd.sty !== "b");
        cp = cp0;
      }
      const info = fontInfo(face);
      const gid = face.font.glyphId(cp);
      const bx = info.box(gid);
      const em = size * 20 / info.upm;
      const italic = cp !== cp0 && nd.sty !== "b";
      atoms.push({
        kind: "char",
        cp,
        face,
        sizePt: size,
        style,
        adv: env.adv(face, cp, size),
        offset: off.n,
        cls: clsOf(cp0),
        ital: italic ? (info.ital.get(gid) ?? 0) * em : 0,
        italic,
        top: bx ? Math.max(0, bx[1]) * em : 0,
        bottom: bx ? Math.max(0, -bx[0]) * em : 0
      });
      off.n += ch.length;
    }
  }
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    if (a.cls !== "bin") continue;
    const pv = atoms[i - 1]?.cls, nx = atoms[i + 1]?.cls;
    if (!pv || pv === "bin" || pv === "rel" || pv === "open" || !nx || nx === "rel" || nx === "close") a.cls = "ord";
  }
  const emTw = (a) => a.sizePt * 20;
  for (let i = 0; i + 1 < atoms.length; i++) {
    const a = atoms[i], b = atoms[i + 1];
    const kern = a.style.rpr.kern;
    if (kern && a.kind === "char" && b.kind === "char" && a.face === b.face && a.sizePt === b.sizePt && a.sizePt * 2 >= kern) a.adv += env.kern(a.face, a.cp, b.cp, a.sizePt);
    if (a.italic && !b.italic) a.adv += a.ital;
    if (lvl === "S") continue;
    let sp2 = 0;
    if (a.cls === "rel" !== (b.cls === "rel") && a.cls !== "open" && b.cls !== "close") sp2 = 5 / 18;
    else if ((a.cls === "bin" || b.cls === "bin") && a.cls !== "open") sp2 = 4 / 18;
    if (sp2) a.adv += sp2 * emTw(a.cls === "ord" || a.cls === "close" ? b : a);
  }
  return atoms;
}
function rowBox(atoms) {
  const box = { w: 0, items: [], rules: [], top: 0, bottom: 0, lineTop: 0, lineBottom: 0 };
  let x = 0;
  for (const a of atoms) {
    if (a.kind === "frac" && a.box) {
      for (const it of a.box.items) box.items.push({ ...it, x: it.x + x });
      for (const r of a.box.rules) box.rules.push({ ...r, x: r.x + x });
    } else if (a.cp !== 32) {
      box.items.push({ cp: a.cp, x, y: 0, face: a.face, sizePt: a.sizePt, style: a.style });
    }
    box.top = Math.max(box.top, a.top);
    box.bottom = Math.max(box.bottom, a.bottom);
    x += a.adv;
  }
  box.w = x;
  return box;
}
function fracBox(env, f, lvl, scale, off) {
  const face = env.face(false, false);
  const info = fontInfo(face);
  const st = env.styleOf(void 0).style;
  const display = lvl === "D";
  const inner = display ? "T" : "S";
  const iscale = display ? scale : scale * (info.scriptPct / 100);
  const num = rowBox(mathAtoms(env, f.num, inner, iscale, off));
  const den = rowBox(mathAtoms(env, f.den, inner, iscale, off));
  const first = num.items[0] ?? den.items[0];
  const size = first ? first.sizePt * (scale / iscale) : st.sizePt * scale;
  const em = size * 20;
  const c = (i) => kEm(info, i) * em;
  const axis = c(K.axis), rule = c(K.rule);
  const noBar = f.type === "noBar";
  const ruleQ = noBar ? 0 : q600(rule);
  let numShift = c(display ? K.numUpD : K.numUp);
  let denShift = c(display ? K.denDownD : K.denDown);
  numShift = Math.max(numShift, axis + rule / 2 + c(display ? K.numGapD : K.numGap) + num.bottom);
  denShift = Math.max(denShift, den.top + c(display ? K.denGapD : K.denGap) - (axis - rule / 2));
  const numQ = q600(numShift), denQ = q600(denShift);
  const w = Math.max(num.w, den.w);
  const nx = (w - num.w) / 2, dx = (w - den.w) / 2;
  const box = {
    w,
    items: [
      ...num.items.map((it) => ({ ...it, x: it.x + nx, y: it.y - numQ })),
      ...den.items.map((it) => ({ ...it, x: it.x + dx, y: it.y + denQ }))
    ],
    rules: [
      ...num.rules.map((r) => ({ ...r, x: r.x + nx, y: r.y - numQ })),
      ...den.rules.map((r) => ({ ...r, x: r.x + dx, y: r.y + denQ }))
    ],
    top: numQ + num.top,
    bottom: denQ + den.bottom,
    lineTop: numQ + num.top + c(K.leading),
    lineBottom: denShift + den.bottom
  };
  if (!noBar) box.rules.push({ x: 0, y: -(axis + ruleQ / 2), w, h: ruleQ, color: st.color });
  return box;
}

// ../docx-layout/src/para.ts
var GLUED_FIELD = /* @__PURE__ */ new WeakSet();
var CJK = (cp) => cp >= 11904 && cp <= 40959 || cp >= 44032 && cp <= 55215 || cp >= 63744 && cp <= 64255 || cp >= 65280 && cp <= 65519 || cp >= 12288 && cp <= 12351;
var NO_BREAK_AFTER_DASH = /^[\s\u00a0\u202f\u2000-\u200b\u3000\ufeff\u00ad]$/u;
var CS = (cp) => cp >= 1424 && cp <= 2303 || cp >= 64285 && cp <= 65023 || cp >= 65136 && cp <= 65279;
var MATH_FONT = "Cambria Math";
var FALLBACK_FAMILIES = ["Segoe UI Symbol", "Segoe UI Emoji", "Arial Unicode MS", "MS Gothic", "Cambria Math", "Segoe UI", "Arial"];
function classFallback(font) {
  const pn = font.metrics.panose;
  if (pn && pn[0] === 2 && pn[3] === 9) return "Courier New";
  if (pn && pn[0] === 2 && pn[1] >= 11 && pn[1] <= 15) return "Arial";
  return "Times New Roman";
}
function fallbackOrder(cp, font) {
  if (cp >= 8592 && cp <= 8703 || cp >= 9632 && cp <= 9727) return [classFallback(font), "Cambria Math", ...FALLBACK_FAMILIES];
  if (cp >= 8704 && cp <= 8959 || cp >= 10624 && cp <= 10751) return ["Cambria Math", ...FALLBACK_FAMILIES];
  return FALLBACK_FAMILIES;
}
function resolveRunStyle(ctx, rpr, env, link) {
  const theme = ctx.fmt.theme;
  const sz3 = (rpr.sz ?? 20) / 2;
  const va = rpr.vertAlign;
  const sizePt = va === "superscript" || va === "subscript" ? Math.round(sz3 * 2 * 1331 / 2048) / 2 : sz3;
  const shift = (rpr.position ?? 0) * 10;
  const tf = rpr.textFill;
  const color2 = (tf && (tf.color ?? (tf.themeColor ? resolveColor({ themeColor: tf.themeColor }, theme) : void 0))) ?? resolveColor(rpr.color, theme);
  const u = rpr.u && rpr.u.val !== "none" && rpr.u.val !== "" ? { val: rpr.u.val, ...rpr.u.color && rpr.u.color !== "auto" ? { color: rpr.u.color } : {} } : void 0;
  const shd = shadingFill(rpr.shd, theme);
  const style = {
    rpr,
    sizePt,
    color: color2 ?? env.defaultColor ?? (env.darkBackground ? "FFFFFF" : "000000"),
    autoColor: !color2 && !env.defaultColor,
    bold: !!rpr.b,
    italic: !!rpr.i,
    underline: u,
    strike: !!rpr.strike,
    dstrike: !!rpr.dstrike,
    highlight: highlightHex(rpr.highlight),
    shading: shd,
    shift,
    hidden: !!rpr.vanish || !!rpr.specVanish,
    ...tf?.alpha !== void 0 && tf.alpha < 1 ? { alpha: tf.alpha } : {},
    ...rpr.textOutline ? { outline: true } : {},
    ...link ? { link } : {}
  };
  if (va === "superscript" || va === "subscript") {
    const face = faceFor(ctx, rpr, 65, style);
    style.shift += va === "superscript" ? superscriptRaiseFor(face.family, faceMetrics(face.font), sz3, sizePt) * 20 : -subscriptDropPt(face.family, sz3) * 20;
  }
  return style;
}
var notdefPua = (face, cp) => cp >= 61440 && cp <= 61695 && face.font.glyphId(cp) === 0 && !isSymbolFont(face.font);
function faceFor(ctx, rpr, cp, style, symFont) {
  const theme = ctx.fmt.theme;
  let family;
  let bold = style.bold, italic = style.italic;
  if (symFont && (cp >= 61440 && cp <= 61695 || !CJK(cp))) family = symFont;
  else if (CJK(cp)) family = fontOfSlot(rpr.rFonts, "eastAsia", theme) ?? fontOfSlot(rpr.rFonts, "ascii", theme);
  else if (CS(cp) || rpr.cs || rpr.rtl) {
    family = fontOfSlot(rpr.rFonts, "cs", theme) ?? fontOfSlot(rpr.rFonts, "ascii", theme);
    bold = !!rpr.bCs;
    italic = !!rpr.iCs;
  } else if (cp < 128) family = fontOfSlot(rpr.rFonts, "ascii", theme);
  else {
    family = rpr.rFonts?.hint === "eastAsia" && (cp === 8220 || cp === 8221 || cp === 8216 || cp === 8217) ? fontOfSlot(rpr.rFonts, "eastAsia", theme) : fontOfSlot(rpr.rFonts, "hAnsi", theme) ?? fontOfSlot(rpr.rFonts, "ascii", theme);
  }
  const face = ctx.faces.get(family, bold, italic);
  if (cp <= 32 || SPACE_WIDTHS[cp] !== void 0 || face.font.glyphId(cp) !== 0) return face;
  if (cp >= 61440 && cp <= 61695) {
    if (isSymbolFont(face.font) && face.font.glyphId(cp - 61440) !== 0) return face;
    return ctx.faces.get("Calibri", false, false);
  }
  for (const fb of fallbackOrder(cp, face.font)) {
    const f = ctx.faces.get(fb, bold, italic);
    if (f.font.glyphId(cp) !== 0) return f;
  }
  return face;
}
function vMetrics(m, style) {
  const va = style.rpr.vertAlign;
  if (va === "superscript" || va === "subscript") {
    const base = (style.rpr.sz ?? 20) / 2;
    return { asc: m.ascent * base * 20, desc: m.descent * base * 20 };
  }
  const [sa, sd] = shadowExtent(style);
  const a = m.ascent * style.sizePt * 20 + sa, d = m.descent * style.sizePt * 20 + sd;
  if (!style.shift) return { asc: a, desc: d };
  return { asc: Math.max(0, a + style.shift), desc: Math.max(0, d - style.shift), nAsc: a, nDesc: d };
}
function shadowExtent(style) {
  const sh = style.rpr.textShadow;
  if (!sh || !sh.blur && !sh.dist) return [0, 0];
  const k = Math.pow(style.sizePt / 72, 0.7);
  const dy = sh.dist * Math.sin(sh.dir * Math.PI / 180);
  return [k * Math.max(0, sh.blur - dy) * 20, k * Math.max(0, sh.blur + dy) * 20];
}
function isHyperlinkStyle(ctx, id) {
  const st = own(ctx.resolver.styles, id);
  return id === "Hyperlink" || st?.name?.toLowerCase() === "hyperlink";
}
var SPACE_WIDTHS = {
  8192: 0.5,
  8193: 1,
  8194: 0.5,
  8195: 1,
  8196: 1 / 3,
  8197: 0.25,
  8198: 1 / 6,
  8199: "0",
  8200: ".",
  8201: 0.2,
  8202: 0.1,
  8203: 0,
  8239: " ",
  8287: 4 / 18
};
var WORD_UNIT = 20 / 4096;
function wordWidth(units, sizePt, upm) {
  return Math.floor(units * sizePt * 4096 / upm + 1e-7) * WORD_UNIT;
}
function toWordUnit(tw) {
  return Math.round(tw / WORD_UNIT) * WORD_UNIT;
}
function scaledUnits(units, font, w) {
  const avg = font.metrics.xAvgCharWidth;
  if (!avg || avg <= 0) return units * w / 100;
  const lf = Math.floor(avg * w / 100 + 1e-9);
  return Math.floor(units * lf / avg + 0.5);
}
function spacingTwips(ctx, sp2) {
  return ctx.opts.advanceRound === "word" && ctx.opts.advanceEm !== "device" ? toWordUnit(sp2) : sp2;
}
function advanceTwips(ctx, face, cp, sizePt, w = 100) {
  const f = face.font;
  let gid = f.glyphId(cp);
  let extra = 0;
  if (gid === 0 && cp >= 61440 && cp <= 61695) {
    if (isSymbolFont(f)) gid = f.glyphId(cp - 61440);
    else extra = f.advanceWidth(f.glyphId(32));
  }
  if (gid === 0 && SPACE_WIDTHS[cp] !== void 0) {
    const sw = SPACE_WIDTHS[cp];
    if (typeof sw === "string") return advanceTwips(ctx, face, sw.codePointAt(0), sizePt, w) * (cp === 8239 ? 0.5 : 1);
    return sw * sizePt * 20 * w / 100;
  }
  let frac = 1;
  if (gid !== 0 && (cp === 8194 || cp === 8195 || cp === 8197)) {
    const dg = f.glyphId(cp === 8194 ? 8211 : 8212);
    if (dg) {
      gid = dg;
      frac = cp === 8197 ? 1 / 4 : 1;
    }
  }
  const units = f.advanceWidth(gid) * frac + extra;
  if (ctx.opts.advanceRound === "word" && ctx.opts.advanceEm !== "device") {
    return wordWidth(w !== 100 ? scaledUnits(units, f, w) : units, sizePt, f.metrics.unitsPerEm);
  }
  return roundAdvance(ctx, units * emOf(ctx, sizePt) * 20 / f.metrics.unitsPerEm) * w / 100;
}
var emOf = (ctx, sizePt) => ctx.opts.advanceEm === "device" ? deviceEmPt(sizePt) : sizePt;
function roundAdvance(ctx, tw) {
  switch (ctx.opts.advanceRound) {
    case "twip":
      return Math.round(tw);
    case "twipFloor":
      return Math.floor(tw);
    case "twipCeil":
      return Math.ceil(tw);
    case "dev600":
      return Math.round(tw / 2.4) * 2.4;
    case "half":
      return Math.round(tw * 2) / 2;
    default:
      return tw;
  }
}
function kernGlyphs(ctx, face, g1, g2, sizePt) {
  const kg = face.font.kernGlyphsTwips;
  const k = kg ? kg.call(face.font, g1, g2, sizePt) : 0;
  if (!k) return 0;
  if (ctx.opts.advanceEm === "device") return k;
  return k * sizePt / deviceEmPt(sizePt);
}
function glyphAdvTwips(ctx, face, gid, sizePt) {
  const f = face.font;
  if (ctx.opts.advanceRound === "word" && ctx.opts.advanceEm !== "device") return wordWidth(f.advanceWidth(gid), sizePt, f.metrics.unitsPerEm);
  return roundAdvance(ctx, f.advanceWidth(gid) * emOf(ctx, sizePt) * 20 / f.metrics.unitsPerEm);
}
function ligFeatures(v) {
  if (!v || v === "none") return [];
  if (v === "all") return ["liga", "clig", "hlig", "dlig"];
  const out = [];
  if (/standard/i.test(v)) out.push("liga");
  if (/contextual/i.test(v)) out.push("clig");
  if (/historical/i.test(v)) out.push("hlig");
  if (/discretional/i.test(v)) out.push("dlig");
  return out;
}
function applyLigatures2(ctx, glyphs) {
  const keyOf = (g) => {
    const r = g.style.rpr;
    return `${r.lang?.val ?? ""}|${r.w ?? 100}|${g.style.shift}|${r.ligatures ?? ""}|${r.spacing ?? 0}`;
  };
  for (let k = 0; k < glyphs.length; ) {
    const g0 = glyphs[k];
    const rpr = g0.style.rpr;
    const feats = g0.kind === "char" && !rpr.spacing ? ligFeatures(rpr.ligatures) : [];
    const ligate = g0.face.font.ligate;
    if (!feats.length || !ligate) {
      k++;
      continue;
    }
    const key = keyOf(g0);
    let e = k + 1;
    while (e < glyphs.length) {
      const q = glyphs[e];
      if (q.kind !== "char" || q.face !== g0.face || q.sizePt !== g0.sizePt || q.runIdx !== g0.runIdx && keyOf(q) !== key) break;
      e++;
    }
    if (e - k >= 2) {
      const f = g0.face.font;
      const groups = ligate.call(f, glyphs.slice(k, e).map((q) => f.glyphId(q.cp)), feats);
      let pos = k;
      for (const grp of groups ?? []) {
        if (grp.len > 1) {
          const first = glyphs[pos], last = glyphs[pos + grp.len - 1];
          let sum = 0;
          for (let j = pos; j < pos + grp.len; j++) sum += glyphAdvTwips(ctx, first.face, f.glyphId(glyphs[j].cp), first.sizePt);
          const w = rpr.w && rpr.w !== 100 ? rpr.w / 100 : 1;
          let delta = (glyphAdvTwips(ctx, first.face, grp.gid, first.sizePt) - sum) * w;
          if (first.face.synthBold) delta -= (grp.len - 1) * first.sizePt * 20 / 2048;
          for (let j = pos; j < pos + grp.len - 1; j++) {
            const q = glyphs[j];
            if (q.kernAdj) {
              q.adv -= q.kernAdj;
              q.kernAdj = 0;
            }
          }
          const nx = glyphs[pos + grp.len];
          if (last.kernAdj !== void 0 && nx && nx.runIdx === last.runIdx) {
            const nk = kernGlyphs(ctx, first.face, grp.gid, nx.ligStart ?? f.glyphId(nx.cp), first.sizePt);
            last.adv += nk - last.kernAdj;
            last.kernAdj = nk;
          }
          const pv = glyphs[pos - 1];
          if (pv && pv.kernAdj !== void 0 && pv.runIdx === first.runIdx && pv.face === first.face) {
            const nk = kernGlyphs(ctx, first.face, pv.ligEnd ?? f.glyphId(pv.cp), grp.gid, first.sizePt);
            pv.adv += nk - pv.kernAdj;
            pv.kernAdj = nk;
          }
          last.adv += delta;
          first.ligStart = grp.gid;
          last.ligEnd = grp.gid;
        }
        pos += grp.len;
      }
    }
    k = e;
  }
}
function kernTwips(ctx, face, cp, next, sizePt) {
  const k = face.font.kernTwips(cp, next, sizePt);
  if (!k) return 0;
  if (ctx.opts.advanceEm === "device") return k;
  return k * sizePt / deviceEmPt(sizePt);
}
function fieldRuns(ctx, run2, env, at) {
  const instr = (run2.field ?? "").trim();
  const name = instr.split(/\s+/)[0]?.toUpperCase() ?? "";
  if (["PAGE", "NUMPAGES", "SECTIONPAGES", "SECTION", "PAGEREF", "SEQ", "REF", "NOTEREF", "DATE", "TIME", "SAVEDATE", "CREATEDATE", "PRINTDATE"].includes(name) || name.endsWith("_MARK") || name === "STYLEREF" && !env.hf) {
    const v = env.field?.(name, instr, at);
    if (v !== void 0) {
      ctx.opts.onField?.(run2, v);
      const base = run2.fieldResult?.find((r) => !r.image && !r.textbox) ?? run2;
      const out = { ...base, text: v, field: void 0, fieldResult: void 0 };
      if (env.hf && name === "PAGE") GLUED_FIELD.add(out);
      return [out];
    }
  }
  if (run2.fieldResult?.length) {
    if (!run2.fieldResult.some((r) => r.field !== void 0)) return run2.fieldResult;
    return run2.fieldResult.flatMap((r) => r.field !== void 0 ? fieldRuns(ctx, r, env, at) ?? (r.text ? [r] : []) : [r]);
  }
  return null;
}
var isMarkRun = (r) => !!(r.bookmark || r.fieldBegin !== void 0 || r.fieldEnd);
function displayRuns(ctx, para2, env) {
  const out = [];
  let offset = 0;
  para2.runs.forEach((run2, idx) => {
    if (isMarkRun(run2)) return;
    if (run2.formField?.type === "checkBox") out.push({ run: run2, idx, offset });
    else if (run2.formField?.type === "dropDown" && run2.formField.entries) {
      const text = run2.formField.entries[run2.formField.selected ?? 0] ?? "";
      if (text) out.push({ run: { ...run2, text, field: void 0, fieldResult: void 0, formField: void 0 }, idx, offset });
    } else if (run2.field !== void 0) {
      const fr = fieldRuns(ctx, run2, env, offset);
      if (fr) {
        for (const r of fr) out.push({ run: r, idx, offset });
      } else if (run2.text) out.push({ run: run2, idx, offset });
    } else out.push({ run: run2, idx, offset });
    offset += run2.text.length;
  });
  return out;
}
function isDark(hex) {
  if (!hex || !/^[0-9A-Fa-f]{6}/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 80;
}
var NO_LINE_END = "$([{\xA3\xA5\u2018\u201C\u3008\u300A\u300C\u300E\u3010\u3014\u3016\u301D\uFE59\uFE5B\uFE5D\uFF04\uFF08\uFF3B\uFF5B\uFF62\uFFE1\uFFE5\uFFE6";
var CJK_FONT_NAME = /^(ms (p|ui )?(gothic|mincho)|yu (gothic|mincho)|meiryo|hg.*(gothic|mincho)|(p)?mingliu|n?simsun|simhei|kaiti|fangsong|microsoft (yahei|jhenghei)|dengxian|(batang|gulim|dotum|gungsuh)(che)?|malgun gothic|nanum)|[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/i;
function isCjkFont(ctx, name) {
  if (!name) return false;
  const cs = own(ctx.fmt.fontTable, name)?.charset?.toUpperCase();
  if (cs) return ["80", "81", "82", "86", "88"].includes(cs);
  if (CJK_FONT_NAME.test(name)) return true;
  const f = ctx.faces.get(name, false, false);
  return f.family.toLowerCase() === name.toLowerCase() && (f.font.glyphId(19968) !== 0 || f.font.glyphId(44032) !== 0);
}
function docEastAsiaCjk(ctx) {
  const rf = ctx.resolver.docDefaults.rPr?.rFonts;
  const name = fontOfSlot(rf, "eastAsia", ctx.fmt.theme);
  if (name && !own(ctx.fmt.fontTable, name)?.charset && /^(ms (p|ui )(gothic|mincho)|meiryo|malgun gothic)\b/i.test(name)) return false;
  if (name) return isCjkFont(ctx, name);
  return !!rf?.eastAsiaTheme && /^(ja|zh|ko)\b/i.test(ctx.fmt.settings.themeFontLang?.eastAsia ?? "");
}
var isCjkLang = (rpr) => /^(ja|zh|ko)\b/i.test(rpr.lang?.eastAsia ?? "");
function eastAsianBreakRules(ctx, rpr) {
  if (!isCjkLang(rpr)) return false;
  return ctx.fmt.settings.compatibilityMode >= 15 || docEastAsiaCjk(ctx);
}
var HANG_BASE = ",.\u3001\u3002\uFF0C\uFF0E";
var HANG_CLOSE = ");:!?]}\uFF1A\uFF1B\uFF1F\uFF01\uFF09\uFF3D\uFF5D";
var HANG_QUOTES = "\u201D\u2019";
var hangPunct = (rpr, alt) => {
  const ea = rpr.lang?.eastAsia ?? "";
  if (/^ja/i.test(ea)) return alt ? HANG_BASE : HANG_BASE + HANG_QUOTES;
  if (alt) return /^ko/i.test(ea) ? HANG_BASE : HANG_BASE + HANG_CLOSE;
  return HANG_BASE + HANG_CLOSE + HANG_QUOTES + (/^zh-(tw|hk|mo)/i.test(ea) ? "" : "%");
};
var SPACE_LIKE = /* @__PURE__ */ new Set([32, 8194, 8195, 8197, 8203, 12288]);
function resolvePPr(ctx, para2, env) {
  const dd = ctx.resolver.docDefaults;
  const direct = directPPr(para2);
  const styleId = ctx.resolver.paraStyleId(direct.pStyle);
  const st = ctx.resolver.paraStyle(styleId);
  let ppr = mergePPr(dd.pPr, env.tablePPr);
  const numPr = { ...st.pPr.numPr, ...direct.numPr };
  const lvl = numPr.numId ? ctx.numbering.level(numPr.numId, numPr.ilvl ?? 0) : void 0;
  const addLvl = () => {
    if (lvl?.pPr) ppr = mergePPr(ppr, { ...lvl.pPr, tabs: void 0 });
    if (lvl?.pPr?.tabs) ppr = mergePPr(ppr, { tabs: lvl.pPr.tabs });
  };
  if (numPr.numId && direct.numPr?.numId === void 0) {
    const chain = ctx.resolver.paraChain(styleId);
    let at = -1;
    chain.forEach((s, i) => {
      if (s.pPr?.numPr?.numId !== void 0) at = i;
    });
    chain.forEach((s, i) => {
      if (i === at) addLvl();
      ppr = mergePPr(ppr, s.pPr);
    });
    if (at < 0) addLvl();
  } else {
    ppr = mergePPr(ppr, st.pPr);
    if (numPr.numId) addLvl();
  }
  ppr = mergePPr(ppr, direct);
  ppr.numPr = numPr;
  return { ppr, styleId, styleRPr: st.rPr };
}
function paraVisibility(ctx, para0, env) {
  const para2 = ctx.rev.paragraph(para0);
  const { ppr, styleRPr } = resolvePPr(ctx, para2, env);
  const dd = ctx.resolver.docDefaults;
  const runRPr = (rpr) => cascadeRPr(dd.rPr, [env.tableRPr, styleRPr, ctx.resolver.charStyle(rpr.rStyle)], rpr);
  const hidden = (rpr) => !!rpr.vanish || !!rpr.specVanish;
  const markHidden = hidden(runRPr(ppr.rPr ?? {}));
  const visible = displayRuns(ctx, para2, env).some(({ run: run2 }) => !!(run2.text || run2.image || run2.shape || run2.group || run2.textbox || run2.formField?.type === "checkBox" || run2.custom || run2.ptab || run2.noteRef) && ctx.rev.run(run2) !== "hide" && !hidden(runRPr(ctx.rev.directRPr(run2))));
  return { markHidden, visible };
}
function prepareParagraph(ctx, para0, env0) {
  const para2 = ctx.rev.paragraph(para0);
  const { ppr, styleId, styleRPr } = resolvePPr(ctx, para2, env0);
  const shd = ppr.shd;
  const paraFill = shadingFill(shd, ctx.fmt.theme);
  const env = paraFill && isDark(paraFill) && !env0.darkBackground ? { ...env0, darkBackground: true } : env0;
  const dd = ctx.resolver.docDefaults;
  const settings = ctx.fmt.settings;
  const yenBackslash = !!settings.compat["doNotLeaveBackslashAlone"] && docEastAsiaCjk(ctx);
  const runRPr = (rpr) => cascadeRPr(dd.rPr, [env.tableRPr, styleRPr, ctx.resolver.charStyle(rpr.rStyle)], rpr);
  const markRpr = runRPr(ppr.rPr ?? {});
  const markStyle = resolveRunStyle(ctx, markRpr, env);
  const markFace = faceFor(ctx, markRpr, 32, markStyle);
  const glyphs = [];
  const pushChars = (text, run2, rpr, style, offset0, runIdx, formText = false) => {
    let t = text;
    if (rpr.caps) t = t.toUpperCase();
    const chars = Array.from(t);
    let off = offset0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const cp = ch.codePointAt(0);
      if (cp === 65279 || cp === 8204 || cp === 8205) {
        const prev = glyphs[glyphs.length - 1];
        if (cp === 65279 && prev?.kind === "space") {
          prev.kind = "nbsp";
          prev.breakAfter = false;
        }
        off += ch.length;
        continue;
      }
      let kind = "char";
      if (ch === "	") kind = "tab";
      else if (ch === "\n" || ch === "\r" || ch === "\u2028") kind = "lb";
      else if (ch === "\f" || ch === "\v") {
        if (env.noPageBreaks) {
          off += ch.length;
          continue;
        }
        kind = ch === "\f" ? "pb" : "cb";
      } else if (cp === 160 || cp === 8239) kind = "nbsp";
      else if (cp === 173) kind = "shy";
      else if (SPACE_LIKE.has(cp) && !(cp !== 32 && formText)) kind = "space";
      let size = style.sizePt;
      let shownCh = ch;
      let shownCp = cp;
      if (cp === 8209) shownCp = 45;
      if (cp === 92 && yenBackslash && /^ja/i.test(rpr.lang?.eastAsia ?? "")) {
        shownCh = "\xA5";
        shownCp = 165;
      }
      if (rpr.smallCaps && !rpr.caps && ch.toLowerCase() === ch && ch.toUpperCase() !== ch) {
        shownCh = ch.toUpperCase();
        shownCp = shownCh.codePointAt(0);
        size = Math.round(style.sizePt * 2 * 0.8) / 2;
      } else if (rpr.smallCaps && !rpr.caps && cp === 32) {
        size = Math.round(style.sizePt * 2 * 0.8) / 2;
      }
      const face = faceFor(ctx, rpr, kind === "lb" ? 32 : shownCp, style, run2.symFont);
      const m = faceMetrics(notdefPua(face, shownCp) ? faceFor(ctx, rpr, 65, style).font : face.font);
      let adv = 0;
      let kernAdj;
      if (kind === "char" || kind === "space" || kind === "nbsp") {
        const hs = rpr.w && rpr.w !== 100 ? rpr.w : 100;
        adv = advanceTwips(ctx, face, shownCp, size, hs);
        if (face.synthBold) adv += size * 20 / 2048 * (hs / 100);
        const next = chars[i + 1];
        const lig = rpr.ligatures;
        const kernOff = !!lig && lig !== "none" && face.font.kernInLatin === false;
        if (next && (kind === "char" || kind === "space") && rpr.kern && style.sizePt * 2 >= rpr.kern && !kernOff) {
          const sc = rpr.smallCaps && !rpr.caps;
          const lower = sc && next.toLowerCase() === next && next.toUpperCase() !== next && next.toUpperCase().length === 1;
          const nextShown = lower ? next.toUpperCase() : next;
          const nextSize = sc && (lower || next === " ") ? Math.round(style.sizePt * 2 * 0.8) / 2 : style.sizePt;
          kernAdj = sc && nextSize !== size ? 0 : kernTwips(ctx, face, shownCp, nextShown.codePointAt(0), size);
          adv += kernAdj;
        }
        if (rpr.spacing) adv += spacingTwips(ctx, rpr.spacing);
        if (cp >= 65024 && cp <= 65039) adv = 0;
      }
      const breakAfter = kind === "space" || kind === "tab" || kind === "shy" || (cp === 45 || cp === 8211 || cp === 8212) && i + 1 < chars.length && !NO_BREAK_AFTER_DASH.test(chars[i + 1]) || CJK(cp);
      glyphs.push({
        kind,
        ch: shownCh,
        cp: shownCp,
        face,
        style,
        adv,
        // sobrescrito/subscrito não mudam a altura da linha (medido no Word):
        // a linha mede como se o texto estivesse no corpo original; w:position mede
        ...vMetrics(m, style),
        offset: off,
        runIdx,
        breakAfter,
        sizePt: size,
        ...cp === 8232 ? { clear: true } : {},
        ...kernAdj !== void 0 ? { kernAdj } : {}
      });
      off += ch.length;
    }
  };
  let mathJc;
  const mathRuns = /* @__PURE__ */ new Set();
  const pushMath = (run2, runIdx, offset0) => {
    const zone = run2.math;
    mathJc = zone.jc ?? "centerGroup";
    mathRuns.add(runIdx);
    const menv = {
      styleOf: (r) => {
        const mr = { ...runRPr(r ?? {}) };
        delete mr.spacing;
        delete mr.w;
        delete mr.ligatures;
        return { rpr: mr, style: resolveRunStyle(ctx, mr, env) };
      },
      face: (bold, italic) => ctx.faces.get(MATH_FONT, bold, italic),
      adv: (face, cp, size) => advanceTwips(ctx, face, cp, size),
      kern: (face, cp, next, size) => kernTwips(ctx, face, cp, next, size)
    };
    const last = Math.max(0, run2.text.length - 1);
    const off = { n: 0 };
    let seg = [];
    const flushSeg = () => {
      for (const a of mathAtoms(menv, seg, "D", 1, off)) {
        const tm = mathTextMetrics(a.face);
        const tA = tm.ascent * a.sizePt * 20, tD = tm.descent * a.sizePt * 20;
        const g = { kind: "char", ch: String.fromCodePoint(a.cp), cp: a.cp, face: a.face, style: a.style, adv: a.adv, asc: tA, desc: tD, offset: offset0 + Math.min(a.offset, last), runIdx, breakAfter: false, sizePt: a.sizePt };
        if (a.box) Object.assign(g, { asc: Math.max(tA, a.box.lineTop), desc: Math.max(tD, a.box.lineBottom), nAsc: tA, nDesc: tD, math: a.box });
        glyphs.push(g);
      }
      seg = [];
    };
    for (const nd of zone.nodes) {
      if (nd.t !== "br") {
        seg.push(nd);
        continue;
      }
      flushSeg();
      const { style: bs } = menv.styleOf(nd.rpr);
      const bf = menv.face(false, false);
      const tm = mathTextMetrics(bf);
      glyphs.push({ kind: "lb", ch: "\n", cp: 10, face: bf, style: bs, adv: 0, asc: tm.ascent * bs.sizePt * 20, desc: tm.descent * bs.sizePt * 20, offset: offset0 + Math.min(off.n, last), runIdx, breakAfter: true, sizePt: bs.sizePt });
    }
    flushSeg();
  };
  let pendingNote;
  for (const { run: run2, idx, offset } of displayRuns(ctx, para2, env)) {
    const rev = ctx.rev.run(run2);
    if (rev === "hide") continue;
    const direct = ctx.rev.directRPr(run2);
    if (run2.inToc && direct.rStyle && isHyperlinkStyle(ctx, direct.rStyle)) delete direct.rStyle;
    const rpr = runRPr(direct);
    const style = resolveRunStyle(ctx, rpr, env, run2.props.link);
    if (style.hidden) continue;
    if (rev) {
      style.color = rev.color;
      style.autoColor = false;
      if (rev.kind === "ins") style.underline = { val: rev.move ? "double" : "single" };
      else {
        style.strike = !rev.move;
        style.dstrike = rev.move;
      }
    }
    if (run2.image || run2.shape || run2.group || run2.textbox) {
      const floating = run2.image?.floating ?? run2.shape?.floating ?? run2.group?.floating ?? run2.textbox?.floating;
      const face = faceFor(ctx, rpr, 32, style);
      if (floating) {
        glyphs.push({ kind: "obj", ch: "", cp: 65532, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: false, obj: run2, sizePt: style.sizePt });
        continue;
      }
      const ie = run2.image?.inlineEffect ?? run2.shape?.inlineEffect;
      const w = (run2.image?.widthTwips ?? run2.shape?.widthTwips ?? run2.group?.widthTwips ?? run2.textbox?.widthTwips ?? 0) + (ie ? ie.l + ie.r : 0);
      const h = (run2.image?.heightTwips ?? run2.shape?.heightTwips ?? run2.group?.heightTwips ?? run2.textbox?.heightTwips ?? 0) + (ie ? ie.t + ie.b : 0);
      if (run2.shape?.hr) {
        glyphs.push({ kind: "obj", ch: "\uFFFC", cp: 65532, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: true, obj: run2, sizePt: style.sizePt, hr: h });
        continue;
      }
      const m = faceMetrics(face.font);
      glyphs.push({
        kind: "obj",
        ch: "\uFFFC",
        cp: 65532,
        face,
        style,
        adv: w,
        asc: Math.max(0, h + style.shift),
        desc: Math.max(0, -style.shift),
        // a imagem fica na baseline: sem descendente (medido)
        offset,
        runIdx: idx,
        breakAfter: true,
        obj: run2,
        sizePt: style.sizePt
      });
      continue;
    }
    if (run2.formField?.type === "checkBox") {
      const face = faceFor(ctx, rpr, 32, style);
      const size = run2.formField.sizeAuto || !run2.formField.sizeHalfPt ? style.sizePt : run2.formField.sizeHalfPt / 2;
      const side = 1.07 * size * 20;
      const fm = faceMetrics(face.font);
      glyphs.push({
        kind: "box",
        ch: "\u2610",
        cp: 9744,
        face,
        style,
        adv: side + 18,
        asc: fm.ascent * size * 20,
        desc: fm.descent * size * 20,
        offset,
        runIdx: idx,
        breakAfter: false,
        sizePt: style.sizePt,
        box: { side, checked: !!run2.formField.checked }
      });
      continue;
    }
    if (run2.custom) {
      const face = faceFor(ctx, rpr, 32, style);
      const text = run2.custom.fallbackText || " ";
      pushChars(text, run2, rpr, style, offset, idx);
      continue;
    }
    if (run2.ptab) {
      const face = faceFor(ctx, rpr, 32, style);
      glyphs.push({ kind: "tab", ch: "	", cp: 9, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: true, ptab: run2.ptab, sizePt: style.sizePt });
      continue;
    }
    if (run2.noteRef) {
      const { kind, id, custom } = run2.noteRef;
      const mark = ctx.noteMark(kind, id, custom);
      if (custom) {
        if (kind === "footnote") pendingNote = id;
        continue;
      }
      const before2 = glyphs.length;
      pushChars(mark, run2, rpr, style, offset, idx);
      for (let k = before2; k < glyphs.length; k++) {
        glyphs[k].offset = offset;
        if (kind === "footnote") glyphs[k].noteId = id;
      }
      continue;
    }
    if (run2.math) {
      pushMath(run2, idx, offset);
      continue;
    }
    const before = glyphs.length;
    pushChars(run2.text, run2, rpr, style, offset, idx, /^\s*FORMTEXT\b/i.test(para2.runs[idx]?.field ?? ""));
    if (GLUED_FIELD.has(run2)) for (let k = before + 1; k < glyphs.length; k++) glyphs[k].glue = true;
    if (/_MARK\s*$/.test(para2.runs[idx]?.field ?? "")) for (let k = before; k < glyphs.length; k++) glyphs[k].offset = offset;
    if (pendingNote !== void 0 && glyphs.length > before) {
      glyphs[before].noteId = pendingNote;
      pendingNote = void 0;
    }
  }
  for (let k = 1; k < glyphs.length; k++) {
    if (glyphs[k].kind !== "obj" || glyphs[k].adv <= 0) continue;
    let j = k - 1;
    while (j > 0 && glyphs[j].kind === "obj" && glyphs[j].adv === 0) j--;
    const pv = glyphs[j];
    if (!pv.breakAfter && pv.kind !== "nbsp" && !(pv.kind === "obj" && pv.adv === 0)) pv.breakAfter = true;
  }
  for (let k = 0; k + 1 < glyphs.length; k++) {
    const g = glyphs[k], nx = glyphs[k + 1];
    if (!g.breakAfter && g.kind === "char" && (g.cp === 45 || g.cp === 8211 || g.cp === 8212) && g.ch !== "\u2011" && g.runIdx !== nx.runIdx && nx.kind === "char" && !NO_BREAK_AFTER_DASH.test(nx.ch)) g.breakAfter = true;
  }
  applyLigatures2(ctx, glyphs);
  for (let k = 0; k + 1 < glyphs.length; k++) {
    const g = glyphs[k], nx = glyphs[k + 1];
    if (g.runIdx === nx.runIdx || g.kind !== "char" && g.kind !== "space" || nx.kind !== "char" && nx.kind !== "space") continue;
    const a = g.style.rpr, b = nx.style.rpr;
    if (g.face !== nx.face || g.sizePt !== nx.sizePt || g.style.sizePt !== nx.style.sizePt || g.style.shift !== nx.style.shift) continue;
    if (!a.kern || !b.kern || g.style.sizePt * 2 < a.kern || nx.style.sizePt * 2 < b.kern) continue;
    if ((a.lang?.val ?? "") !== (b.lang?.val ?? "") || (a.w ?? 100) !== (b.w ?? 100)) continue;
    const lig = a.ligatures;
    if (lig && lig !== "none" && g.face.font.kernInLatin === false) continue;
    g.adv += g.ligEnd !== void 0 || nx.ligStart !== void 0 ? kernGlyphs(ctx, g.face, g.ligEnd ?? g.face.font.glyphId(g.cp), nx.ligStart ?? g.face.font.glyphId(nx.cp), g.sizePt) : kernTwips(ctx, g.face, g.cp, nx.cp, g.sizePt);
  }
  for (let k = 0; k < glyphs.length; k++) {
    if (glyphs[k].kind !== "space") continue;
    let e = k;
    while (e + 1 < glyphs.length && glyphs[e + 1].kind === "space") e++;
    if (glyphs[k - 1]?.kind === "nbsp" || glyphs[e + 1]?.kind === "nbsp") for (let j = k; j <= e; j++) glyphs[j].breakAfter = false;
    k = e;
  }
  if (ppr.kinsoku !== false) {
    for (let k = 1; k < glyphs.length; k++) {
      if (glyphs[k].kind !== "space" || glyphs[k - 1].kind !== "char") continue;
      const pv = glyphs[k - 1];
      if (!NO_LINE_END.includes(pv.ch) || !eastAsianBreakRules(ctx, pv.style.rpr)) continue;
      for (let j = k; j < glyphs.length && glyphs[j].kind === "space"; j++) glyphs[j].breakAfter = false;
    }
  }
  if (docEastAsiaCjk(ctx)) {
    const compress = settings.compatibilityMode < 15 && !!settings.characterSpacingControl && settings.characterSpacingControl !== "doNotCompress";
    const balance = !!settings.compat["balanceSingleByteDoubleByteWidth"];
    const altKinsoku = settings.compatibilityMode < 15 && !!settings.compat["useAltKinsokuLineBreakRules"];
    if (balance) for (let k = 0; k < glyphs.length; k++) {
      if (glyphs[k].kind !== "space" || glyphs[k].cp !== 32) continue;
      let e = k;
      while (e + 1 < glyphs.length && glyphs[e + 1].kind === "space" && glyphs[e + 1].cp === 32) e++;
      const lead = glyphs.slice(0, k).every((q) => q.kind === "obj" && q.adv === 0);
      if (e > k || lead) for (let j = k; j <= e; j++) {
        const g = glyphs[j];
        g.adv = g.sizePt * 10 + spacingTwips(ctx, g.style.rpr.spacing ?? 0);
        g.fixed = true;
      }
      k = e;
    }
    if (compress) {
      for (const g of glyphs) {
        if (g.kind === "char" && (g.cp === 45 || g.cp === 8212 || g.cp === 8211 && settings.compatibilityMode < 14)) g.breakAfter = false;
      }
    }
    for (const g of glyphs) {
      if (compress && g.kind === "space" && g.cp === 32 && !g.fixed) {
        const xAvg = g.face.font.metrics.xAvgCharWidth;
        const minSp = balance ? g.sizePt * 20 / 4 : xAvg ? xAvg * g.sizePt * 20 / g.face.font.metrics.unitsPerEm / 2 : void 0;
        if (minSp !== void 0) g.feShrink = Math.max(0, g.adv - minSp);
      } else if (g.kind === "char" && ppr.overflowPunct !== false && isCjkLang(g.style.rpr) && hangPunct(g.style.rpr, altKinsoku).includes(g.ch)) g.hang = true;
    }
  }
  markHyphenation(ctx, ppr, glyphs, mathRuns);
  let marker;
  const numId = ppr.numPr?.numId;
  if (numId && env.numbering !== false && !env.continuation) {
    let nm = ctx.numbering.next(numId, ppr.numPr?.ilvl ?? 0);
    if (!nm && (numId === 1001 || numId === 1002)) {
      const ilvl = ppr.numPr?.ilvl ?? 0;
      nm = { text: numId === 1001 ? ["\u2022", "o", "\u25AA"][ilvl % 3] : "1.", level: { ilvl, numFmt: numId === 1001 ? "bullet" : "decimal", suff: "tab" }, numId, ilvl, listKey: "synthetic" };
    }
    if (nm && (nm.text || nm.level.lvlPicBulletId !== void 0)) {
      const lvlRpr = nm.level.rPr ?? {};
      const mrpr = mergeRPr(markRpr, lvlRpr);
      const ms = resolveRunStyle(ctx, mrpr, env);
      const mg = [];
      let w = 0;
      for (const ch of Array.from(nm.text)) {
        const cp = ch.codePointAt(0);
        const face = faceFor(ctx, mrpr, cp, ms);
        const m = faceMetrics(notdefPua(face, cp) ? faceFor(ctx, mrpr, 65, ms).font : face.font);
        let adv = advanceTwips(ctx, face, cp, ms.sizePt, mrpr.w && mrpr.w !== 100 ? mrpr.w : 100);
        if (mrpr.spacing) adv += spacingTwips(ctx, mrpr.spacing);
        mg.push({ kind: "char", ch, cp, face, style: ms, adv, asc: m.ascent * ms.sizePt * 20, desc: m.descent * ms.sizePt * 20, offset: -1, runIdx: -1, breakAfter: false, sizePt: ms.sizePt });
        w += adv;
      }
      marker = { text: nm.text, glyphs: mg, width: w, level: nm.level, suff: nm.level.suff ?? "tab", jc: nm.level.lvlJc ?? "left", ...nm.chapter !== void 0 ? { chapter: nm.chapter } : {} };
    }
  }
  const ind2 = ppr.ind ?? {};
  const sp2 = ppr.spacing ?? {};
  let jc = ppr.jc ?? "left";
  if (jc === "start") jc = "left";
  if (jc === "end") jc = "right";
  let firstLine = env.continuation ? 0 : ind2.hanging !== void 0 ? -ind2.hanging : ind2.firstLine ?? 0;
  if (mathJc && !glyphs.some((g) => !mathRuns.has(g.runIdx) && g.kind !== "lb" && g.kind !== "pb" && g.kind !== "space" && !(g.kind === "obj" && g.adv === 0))) {
    jc = mathJc === "left" ? "left" : mathJc === "right" ? "right" : "center";
    firstLine = 0;
  }
  const revBars = revisionRanges(ctx.rev, para2);
  return {
    para: para2,
    ppr,
    styleId,
    markStyle,
    markFace,
    glyphs,
    marker,
    ...revBars ? { revBars } : {},
    indLeft: ind2.left ?? 0,
    indRight: ind2.right ?? 0,
    firstLine,
    jc,
    tabs: (ppr.tabs ?? []).filter((t) => t.val !== "clear"),
    spaceBefore: env.continuation ? 0 : sp2.before ?? 0,
    spaceAfter: sp2.after ?? 0,
    // w:doNotUseHTMLParagraphAutoSpacing: o automático ("HTML", 14 pt) não vale — ficam os
    // w:before/w:after explícitos (oráculo autosphtml)
    beforeAuto: !env.continuation && !!sp2.beforeAutospacing && !settings.compat["doNotUseHTMLParagraphAutoSpacing"],
    afterAuto: !!sp2.afterAutospacing && !settings.compat["doNotUseHTMLParagraphAutoSpacing"],
    lineRule: sp2.lineRule ?? "auto",
    line: sp2.line ?? 240,
    contextual: !!ppr.contextualSpacing,
    keepNext: !!ppr.keepNext,
    keepLines: !!ppr.keepLines,
    widowControl: ppr.widowControl ?? false,
    pageBreakBefore: !env.continuation && !!ppr.pageBreakBefore,
    empty: glyphs.every((g) => g.kind === "pb" || g.kind === "obj" && !!(g.obj?.image?.floating || g.obj?.shape?.floating || g.obj?.group?.floating || g.obj?.textbox?.floating))
  };
  void settings;
}

// ../docx-layout/src/hyphenate.ts
var HYPHEN_GAP15 = 421;
var HYPHEN_EXPAND15 = 0.4868;
function hyphenMins(compat) {
  return [2, compat >= 15 ? 3 : 2];
}
var LETTER = /^[\p{L}\p{M}]$/u;
var MARK = /^\p{M}$/u;
function langOf(ctx, g) {
  return g.style.rpr.lang?.val ?? ctx.opts.lang;
}
function langAllowed(ctx, lang) {
  const list = ctx.opts.hyphenationLanguages;
  if (!list) return true;
  const l = lang.toLowerCase();
  return list.some((x) => {
    const y = x.toLowerCase();
    return l === y || l.startsWith(`${y}-`);
  });
}
function documentHyphenationLanguages(full, fallback = "pt-BR") {
  const fmt2 = full.formatting;
  if (!fmt2?.settings.autoHyphenation) return [];
  const out = /* @__PURE__ */ new Set([fmt2.styles.docDefaults.rPr?.lang?.val ?? fallback]);
  const visit = (x) => {
    if (!x || typeof x !== "object") return;
    if (x instanceof Map) {
      for (const v of x.values()) visit(v);
      return;
    }
    if (Array.isArray(x)) {
      for (const y of x) visit(y);
      return;
    }
    for (const [k, v] of Object.entries(x)) {
      if (k === "lang" && v && typeof v === "object" && typeof v.val === "string") out.add(v.val);
      else if (v && typeof v === "object") visit(v);
    }
  };
  visit(fmt2.styles.styles);
  visit(full.blocks);
  visit(full.sections);
  visit(full.footnoteBlocks);
  visit(full.endnoteBlocks);
  return [...out];
}
function markHyphenation(ctx, ppr, glyphs, skipRuns) {
  const s = ctx.fmt.settings;
  if (!s.autoHyphenation || ppr.suppressAutoHyphens || ctx.opts.hyphenation === false) return;
  const [left, right] = hyphenMins(s.compatibilityMode);
  for (let k = 0; k < glyphs.length; ) {
    const g = glyphs[k];
    if (g.kind !== "char" || !LETTER.test(g.ch) || MARK.test(g.ch) || skipRuns?.has(g.runIdx)) {
      k++;
      continue;
    }
    const lang = langOf(ctx, g);
    const idx = [];
    let e = k;
    for (; e < glyphs.length; e++) {
      const q = glyphs[e];
      if (q.kind === "shy") continue;
      if (q.kind !== "char" || !LETTER.test(q.ch) || langOf(ctx, q) !== lang || skipRuns?.has(q.runIdx)) break;
      idx.push(e);
    }
    k = e;
    const rpr = g.style.rpr;
    if (rpr.noProof || rpr.cs || rpr.rtl || !langAllowed(ctx, lang)) continue;
    if (s.doNotHyphenateCaps && idx.every((j) => {
      const c = glyphs[j].ch;
      return c.toLowerCase() === c.toUpperCase() || c === c.toUpperCase();
    })) continue;
    const h = hyphenatorFor(lang);
    if (!h) continue;
    const clusters = [];
    for (const j of idx) {
      if (MARK.test(glyphs[j].ch) && clusters.length) clusters[clusters.length - 1].push(j);
      else clusters.push([j]);
    }
    if (clusters.length < left + right) continue;
    const word = clusters.map((c) => {
      const t = c.map((j) => glyphs[j].ch).join("");
      const n = t.normalize("NFC");
      return Array.from(n).length === 1 ? n : glyphs[c[0]].ch;
    }).join("");
    for (const p of h.hyphenate(word, left, right)) {
      const c = clusters[p - 1];
      glyphs[c[c.length - 1]].hyph = true;
    }
  }
}
function hyphenCandidates(gs, i, e) {
  const out = [];
  let letters2 = 0;
  for (let k = i; k < e - 1; k++) {
    const g = gs[k];
    if (g.kind === "shy") {
      if (k > i) out.push(k);
      continue;
    }
    if (g.kind === "char" && LETTER.test(g.ch) && !MARK.test(g.ch)) letters2++;
    if (g.hyph && gs[k + 1]?.kind !== "shy" && letters2 >= 2) out.push(k);
  }
  return out;
}
var HYPHEN_ZONE_DEFAULT = 425;
function chooseHyphenation(ctx, gs, u) {
  const s = ctx.fmt.settings;
  let cands = hyphenCandidates(gs, u.i, u.e);
  const limit = s.consecutiveHyphenLimit ?? 0;
  if (limit > 0 && u.hyphenRun >= limit) cands = cands.filter((k) => gs[k].kind === "shy");
  if (!cands.length) return null;
  const modern = s.compatibilityMode >= 15;
  const justify = u.justify && modern;
  const hyphenW = (k) => advanceTwips(ctx, gs[k].face, 45, gs[k].sizePt);
  const ends = [];
  let x = u.x;
  let ci = 0;
  for (let k = u.i; k < u.e && ci < cands.length; k++) {
    const g = gs[k];
    if (g.kind !== "shy") x += g.adv;
    if (k === cands[ci]) {
      ends.push(x);
      ci++;
    }
  }
  if (!modern) {
    for (let n = cands.length - 1; n >= 0; n--) {
      const k = cands[n];
      if (gs[k].kind === "shy" && ends[n] + hyphenW(k) - u.right <= 1e-3) return { k, w: hyphenW(k) };
    }
    if (!u.lineStart && u.right - u.x < (s.hyphenationZone ?? HYPHEN_ZONE_DEFAULT) - 1e-3) return null;
    for (let n = cands.length - 1; n >= 0; n--) {
      const k = cands[n];
      if (gs[k].kind === "shy") continue;
      let nx = k + 1;
      while (nx < u.e && (gs[nx].kind === "shy" || gs[nx].kind === "obj" && gs[nx].adv === 0)) nx++;
      const end = Math.max(ends[n] + hyphenW(k), ends[n] + (nx < u.e ? gs[nx].adv : 0));
      if (end - u.right <= 1e-3) return { k, w: hyphenW(k) };
    }
    return null;
  }
  if (!u.lineStart) {
    if (justify) {
      const slack = u.right - u.contentEnd;
      if (u.restW > 0 && slack / u.restW <= HYPHEN_EXPAND15) return null;
    } else if (u.right - u.contentEnd < HYPHEN_GAP15) return null;
  }
  const fits = cands.map((k, n) => ends[n] + hyphenW(k) - u.right);
  for (let n = cands.length - 1; n >= 0; n--) {
    const ov = fits[n];
    if (ov <= 1e-3) return { k: cands[n], w: hyphenW(cands[n]) };
    if (!justify || u.nSpaces === 0) continue;
    const shrink = ctx.opts.justifyShrink;
    if (ov > shrink.ratio * u.spacesW + 0.0175) continue;
    if (n > 0) {
      const slackPrev = -fits[n - 1];
      if (ov <= shrink.expandRatio * slackPrev + 0.02) return { k: cands[n], w: hyphenW(cands[n]) };
    } else {
      const slack = u.right - u.contentEnd;
      if (u.lineStart || u.restW <= 0 || ov / u.spacesW <= shrink.expandRatio * slack / u.restW + 75e-4 * u.nSpaces / u.spacesW) return { k: cands[n], w: hyphenW(cands[n]) };
    }
  }
  return null;
}

// ../docx-layout/src/datefmt.ts
var PT = {
  months: ["janeiro", "fevereiro", "mar\xE7o", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  monthsShort: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  days: ["domingo", "segunda-feira", "ter\xE7a-feira", "quarta-feira", "quinta-feira", "sexta-feira", "s\xE1bado"],
  daysShort: ["dom", "seg", "ter", "qua", "qui", "sex", "s\xE1b"],
  date: "dd/MM/yyyy",
  time: "HH:mm"
};
var EN = {
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  date: "M/d/yyyy",
  time: "h:mm am/pm"
};
var pad = (n, w) => String(n).padStart(w, "0");
function formatWordDate(d, picture, lang = "pt-BR") {
  const L = lang.toLowerCase().startsWith("en") ? EN : PT;
  let out = "";
  let i = 0;
  const run2 = (ch) => {
    let n = 0;
    while (picture[i + n] === ch) n++;
    return n;
  };
  while (i < picture.length) {
    const c = picture[i];
    if (c === "'") {
      const j = picture.indexOf("'", i + 1);
      out += j < 0 ? picture.slice(i + 1) : picture.slice(i + 1, j);
      i = j < 0 ? picture.length : j + 1;
      continue;
    }
    const lower = picture.slice(i, i + 5).toLowerCase();
    if (lower === "am/pm") {
      out += L === EN ? d.getHours() >= 12 ? "PM" : "AM" : "";
      i += 5;
      continue;
    }
    if (c === "d" || c === "D") {
      const n = run2(c);
      out += n >= 4 ? L.days[d.getDay()] : n === 3 ? L.daysShort[d.getDay()] : n === 2 ? pad(d.getDate(), 2) : String(d.getDate());
      i += n;
      continue;
    }
    if (c === "M") {
      const n = run2(c);
      out += n >= 4 ? L.months[d.getMonth()] : n === 3 ? L.monthsShort[d.getMonth()] : n === 2 ? pad(d.getMonth() + 1, 2) : String(d.getMonth() + 1);
      i += n;
      continue;
    }
    if (c === "y" || c === "Y") {
      const n = run2(c);
      out += n >= 3 ? String(d.getFullYear()) : pad(d.getFullYear() % 100, 2);
      i += n;
      continue;
    }
    if (c === "H") {
      const n = run2(c);
      out += n >= 2 ? pad(d.getHours(), 2) : String(d.getHours());
      i += n;
      continue;
    }
    if (c === "h") {
      const n = run2(c);
      const h = d.getHours() % 12 || 12;
      out += n >= 2 ? pad(h, 2) : String(h);
      i += n;
      continue;
    }
    if (c === "m") {
      const n = run2(c);
      out += n >= 2 ? pad(d.getMinutes(), 2) : String(d.getMinutes());
      i += n;
      continue;
    }
    if (c === "s" || c === "S") {
      const n = run2(c);
      out += n >= 2 ? pad(d.getSeconds(), 2) : String(d.getSeconds());
      i += n;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
function dateFieldValue(instr, now, lang = "pt-BR") {
  const name = instr.trim().split(/\s+/)[0].toUpperCase();
  const L = lang.toLowerCase().startsWith("en") ? EN : PT;
  const m = /\\@\s*(?:"([^"]*)"|(\S+))/.exec(instr);
  const picture = m ? m[1] ?? m[2] ?? "" : name === "TIME" ? L.time : L.date;
  let v = formatWordDate(now, picture, lang);
  const fmt2 = /\\\*\s*(\w+)/g;
  let f;
  while (f = fmt2.exec(instr)) {
    const k = f[1].toLowerCase();
    if (k === "upper") v = v.toUpperCase();
    else if (k === "lower") v = v.toLowerCase();
    else if (k === "firstcap") v = v.charAt(0).toUpperCase() + v.slice(1);
    else if (k === "caps") v = v.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
  }
  return v;
}

// ../docx-layout/src/geometry.ts
var K2 = 0.5522847498;
function arcTo(out, cur, wR, hR, stDeg, swDeg) {
  const st = stDeg * Math.PI / 180, sw = swDeg * Math.PI / 180;
  const cx = cur[0] - wR * Math.cos(st), cy = cur[1] - hR * Math.sin(st);
  const n = Math.max(1, Math.ceil(Math.abs(swDeg) / 90 - 1e-9));
  const d = sw / n, k = 4 / 3 * Math.tan(d / 4);
  let a = st, x = cur[0], y = cur[1];
  for (let i = 0; i < n; i++) {
    const b = a + d;
    const x2 = cx + wR * Math.cos(b), y2 = cy + hR * Math.sin(b);
    out.push({
      op: "C",
      x1: x - k * wR * Math.sin(a),
      y1: y + k * hR * Math.cos(a),
      x2: x2 + k * wR * Math.sin(b),
      y2: y2 - k * hR * Math.cos(b),
      x: x2,
      y: y2
    });
    a = b;
    x = x2;
    y = y2;
  }
  return [x, y];
}
var poly = (pts, close = true) => {
  const out = pts.map(([x, y], i) => ({ op: i ? "L" : "M", x, y }));
  if (close) out.push({ op: "Z" });
  return out;
};
var pin = (lo, v, hi) => Math.max(lo, Math.min(hi, v));
function presetPathLocal(prst, w, h, adj = {}) {
  const ss = Math.min(w, h), hc = w / 2, vc = h / 2;
  const av = (name, def) => adj[name] ?? (name === "adj1" && adj["adj"] !== void 0 ? adj["adj"] : def);
  switch (prst) {
    case "triangle": {
      const a = pin(0, av("adj", 5e4), 1e5);
      return poly([[0, h], [w * a / 1e5, 0], [w, h]]);
    }
    case "rtTriangle":
      return poly([[0, 0], [w, h], [0, h]]);
    case "diamond":
      return poly([[0, vc], [hc, 0], [w, vc], [hc, h]]);
    case "parallelogram": {
      const a = pin(0, av("adj", 25e3), 1e5 * w / ss), x2 = ss * a / 1e5;
      return poly([[0, h], [x2, 0], [w, 0], [w - x2, h]]);
    }
    case "trapezoid": {
      const a = pin(0, av("adj", 25e3), 5e4 * w / ss), x2 = ss * a / 1e5;
      return poly([[0, h], [x2, 0], [w - x2, 0], [w, h]]);
    }
    case "homePlate": {
      const a = pin(0, av("adj", 5e4), 1e5 * w / ss), x1 = w - ss * a / 1e5;
      return poly([[0, 0], [x1, 0], [w, vc], [x1, h], [0, h]]);
    }
    case "chevron": {
      const a = pin(0, av("adj", 5e4), 1e5 * w / ss), x1 = ss * a / 1e5;
      return poly([[0, 0], [w - x1, 0], [w, vc], [w - x1, h], [0, h], [x1, vc]]);
    }
    case "hexagon": {
      const a = pin(0, av("adj", 25e3), 5e4 * w / ss), x1 = ss * a / 1e5;
      const dy1 = h / 2 * (av("vf", 115470) / 1e5) * Math.sin(Math.PI / 3);
      return poly([[0, vc], [x1, vc - dy1], [w - x1, vc - dy1], [w, vc], [w - x1, vc + dy1], [x1, vc + dy1]]);
    }
    case "octagon": {
      const x1 = ss * pin(0, av("adj", 29289), 5e4) / 1e5;
      return poly([[0, x1], [x1, 0], [w - x1, 0], [w, x1], [w, h - x1], [w - x1, h], [x1, h], [0, h - x1]]);
    }
    case "rightArrow":
    case "leftArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 1e5 * w / ss);
      const dx = ss * a2 / 1e5, dy1 = h * a1 / 2e5, y1 = vc - dy1, y2 = vc + dy1;
      if (prst === "rightArrow") {
        const x1 = w - dx;
        return poly([[0, y1], [x1, y1], [x1, 0], [w, vc], [x1, h], [x1, y2], [0, y2]]);
      }
      return poly([[0, vc], [dx, 0], [dx, y1], [w, y1], [w, y2], [dx, y2], [dx, h]]);
    }
    case "upArrow":
    case "downArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 1e5 * h / ss);
      const dy = ss * a2 / 1e5, dx1 = w * a1 / 2e5, x1 = hc - dx1, x2 = hc + dx1;
      if (prst === "downArrow") {
        const y1 = h - dy;
        return poly([[0, y1], [x1, y1], [x1, 0], [x2, 0], [x2, y1], [w, y1], [hc, h]]);
      }
      return poly([[0, dy], [hc, 0], [w, dy], [x2, dy], [x2, h], [x1, h], [x1, dy]]);
    }
    // setas duplas (presetShapeDefinitions; corpus t15: forma 70 de .doc)
    case "upDownArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 5e4 * h / ss);
      const y2 = ss * a2 / 1e5, y3 = h - y2, dx1 = w * a1 / 2e5, x1 = hc - dx1, x2 = hc + dx1;
      return poly([[0, y2], [hc, 0], [w, y2], [x2, y2], [x2, y3], [w, y3], [hc, h], [0, y3], [x1, y3], [x1, y2]]);
    }
    case "leftRightArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 5e4 * w / ss);
      const x2 = ss * a2 / 1e5, x3 = w - x2, dy = h * a1 / 2e5, y1 = vc - dy, y2 = vc + dy;
      return poly([[0, vc], [x2, 0], [x2, y1], [x3, y1], [x3, 0], [w, vc], [x3, h], [x3, y2], [x2, y2], [x2, h]]);
    }
    case "ellipse": {
      const rx = w / 2, ry = h / 2;
      return [
        { op: "M", x: w, y: vc },
        { op: "C", x1: w, y1: vc + ry * K2, x2: hc + rx * K2, y2: h, x: hc, y: h },
        { op: "C", x1: hc - rx * K2, y1: h, x2: 0, y2: vc + ry * K2, x: 0, y: vc },
        { op: "C", x1: 0, y1: vc - ry * K2, x2: hc - rx * K2, y2: 0, x: hc, y: 0 },
        { op: "C", x1: hc + rx * K2, y1: 0, x2: w, y2: vc - ry * K2, x: w, y: vc },
        { op: "Z" }
      ];
    }
    case "roundRect": {
      const r = ss * pin(0, av("adj", 16667), 5e4) / 1e5;
      const out = [{ op: "M", x: 0, y: r }];
      let c = arcTo(out, [0, r], r, r, 180, 90);
      out.push({ op: "L", x: w - r, y: 0 });
      c = arcTo(out, [w - r, 0], r, r, 270, 90);
      out.push({ op: "L", x: w, y: h - r });
      c = arcTo(out, [w, h - r], r, r, 0, 90);
      out.push({ op: "L", x: r, y: h });
      arcTo(out, [r, h], r, r, 90, 90);
      void c;
      out.push({ op: "Z" });
      return out;
    }
    case "round2SameRect": {
      const t = ss * pin(0, av("adj1", 16667), 5e4) / 1e5, b = ss * pin(0, av("adj2", 0), 5e4) / 1e5;
      const out = [{ op: "M", x: t, y: 0 }, { op: "L", x: w - t, y: 0 }];
      arcTo(out, [w - t, 0], t, t, 270, 90);
      out.push({ op: "L", x: w, y: h - b });
      arcTo(out, [w, h - b], b, b, 0, 90);
      out.push({ op: "L", x: b, y: h });
      arcTo(out, [b, h], b, b, 90, 90);
      out.push({ op: "L", x: 0, y: t });
      arcTo(out, [0, t], t, t, 180, 90);
      out.push({ op: "Z" });
      return out;
    }
    case "frame": {
      const x1 = ss * pin(0, av("adj1", 12500), 5e4) / 1e5;
      return [...poly([[0, 0], [w, 0], [w, h], [0, h]]), ...poly([[x1, x1], [x1, h - x1], [w - x1, h - x1], [w - x1, x1]])];
    }
    case "bentConnector3": {
      const x1 = w * av("adj1", 5e4) / 1e5;
      return poly([[0, 0], [x1, 0], [x1, h], [w, h]], false);
    }
    case "line":
    case "straightConnector1":
      return poly([[0, 0], [w, h]], false);
    default:
      return poly([[0, 0], [w, 0], [w, h], [0, h]]);
  }
}
var OPEN_PRESETS = /* @__PURE__ */ new Set(["line", "straightConnector1", "bentConnector3", "bentConnector2", "curvedConnector3"]);
function mapPath(cmds, f) {
  return cmds.map((c) => {
    if (c.op === "Z") return c;
    if (c.op === "C") {
      const [x1, y1] = f(c.x1, c.y1), [x2, y2] = f(c.x2, c.y2), [x3, y3] = f(c.x, c.y);
      return { op: "C", x1, y1, x2, y2, x: x3, y: y3 };
    }
    const [x, y] = f(c.x, c.y);
    return { op: c.op, x, y };
  });
}
function presetPath(prst, x, y, w, h, opts = {}) {
  const local = presetPathLocal(prst, w, h, opts.adj);
  const r = (opts.rot ?? 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const cx = w / 2, cy = h / 2;
  return mapPath(local, (px, py) => {
    if (opts.flipH) px = w - px;
    if (opts.flipV) py = h - py;
    const dx = px - cx, dy = py - cy;
    return [x + cx + dx * c - dy * s, y + cy + dx * s + dy * c];
  });
}
function pathBounds(cmds) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const c of cmds) {
    if (c.op === "Z") continue;
    if (c.op === "C") {
      add(c.x1, c.y1);
      add(c.x2, c.y2);
    }
    add(c.x, c.y);
  }
  return { x0, y0, x1, y1 };
}
function phi(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const e = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + e) / 2 : (1 - e) / 2;
}
var hexRgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
function gradientSamples(stops, n = 512) {
  const out = new Uint8Array(n * 3);
  if (!stops.length) return out;
  const st = stops.map((s) => ({ pos: s.pos, c: hexRgb(s.color) }));
  const two = st.length === 2 && st[0].pos <= 0 && st[1].pos >= 1;
  const sig = 0.25, p0 = phi(-0.5 / sig), p1 = phi(0.5 / sig);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let c;
    if (two) {
      const g = (phi((t - 0.5) / sig) - p0) / (p1 - p0);
      c = [0, 1, 2].map((k) => 255 * ((st[0].c[k] / 255) ** 2.2 * (1 - g) + (st[1].c[k] / 255) ** 2.2 * g) ** (1 / 2.2));
    } else {
      let j = 0;
      while (j < st.length - 1 && st[j + 1].pos < t) j++;
      const a = st[j], b = st[Math.min(j + 1, st.length - 1)];
      const f = t <= a.pos ? 0 : t >= b.pos || b.pos === a.pos ? 1 : (t - a.pos) / (b.pos - a.pos);
      c = [0, 1, 2].map((k) => a.c[k] + (b.c[k] - a.c[k]) * f);
    }
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.max(0, Math.min(255, Math.round(c[k])));
  }
  return out;
}
function gradientGeometry2(g, box, pathBox) {
  const withShape = g.rotWithShape !== false;
  const b = withShape ? box : { x: pathBox.x0, y: pathBox.y0, w: pathBox.x1 - pathBox.x0, h: pathBox.y1 - pathBox.y0 };
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rotPt = (px, py) => {
    if (!withShape || !box.rot) return [px, py];
    const r = box.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
  };
  if (g.path) {
    const f = g.fillTo ?? { l: 0.5, t: 0.5, r: 0.5, b: 0.5 };
    const fx = b.x + b.w * (f.l + (1 - f.l - f.r) / 2), fy = b.y + b.h * (f.t + (1 - f.t - f.b) / 2);
    const r = Math.max(...[[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([px, py]) => Math.hypot(px - fx, py - fy)));
    const [x02, y02] = rotPt(fx, fy);
    return { kind: "radial", x0: x02, y0: y02, r };
  }
  const a = g.angleDeg * Math.PI / 180;
  let dx = Math.cos(a), dy = Math.sin(a);
  if (g.scaled) {
    dx *= b.h;
    dy *= b.w;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const proj = [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [-b.w / 2, b.h / 2], [b.w / 2, b.h / 2]].map(([px, py]) => px * dx + py * dy);
  const t0 = Math.min(...proj), t1 = Math.max(...proj);
  const [x0, y0] = rotPt(cx + dx * t0, cy + dy * t0);
  const [x1, y1] = rotPt(cx + dx * t1, cy + dy * t1);
  return { kind: "axial", x0, y0, x1, y1 };
}
function patternRaster(p, x, y, w, h, px, k = 1) {
  const rows = patternRows(p.prst);
  if (!rows || w <= 0 || h <= 0) return null;
  const i0 = Math.floor(x / px), j0 = Math.floor(y / px);
  const W = Math.max(1, Math.ceil((x + w) / px) - i0), H = Math.max(1, Math.ceil((y + h) / px) - j0);
  const fg = hexRgb(p.fg), bg = hexRgb(p.bg);
  const RW = W * k, RH = H * k;
  const data = new Uint8Array(RW * RH * 4);
  for (let y2 = 0; y2 < RH; y2++) {
    const j = Math.floor(y2 / k);
    const row = rows[((j0 + j) % 8 + 8) % 8];
    for (let x2 = 0; x2 < RW; x2++) {
      const i = Math.floor(x2 / k);
      const on = row >> 7 - ((i0 + i) % 8 + 8) % 8 & 1;
      const c = on ? fg : bg, q = (y2 * RW + x2) * 4;
      data[q] = c[0];
      data[q + 1] = c[1];
      data[q + 2] = c[2];
      data[q + 3] = 255;
    }
  }
  return { data, w: RW, h: RH, x: i0 * px, y: j0 * px, cells: { w: W, h: H } };
}
function blipTiles(b, x, y, w, h, emu, natural) {
  const t = b.tile;
  if (!t || !natural) return [{ x, y, w, h }];
  const tw = natural.width * 9525 * emu * (t.sx / 1e5), th = natural.height * 9525 * emu * (t.sy / 1e5);
  if (!(tw > 0) || !(th > 0)) return [{ x, y, w, h }];
  const a = t.algn ?? "tl";
  const ax = a === "tr" || a === "r" || a === "br" ? x + w - tw : a === "t" || a === "ctr" || a === "b" ? x + (w - tw) / 2 : x;
  const ay = a.startsWith("b") ? y + h - th : a === "l" || a === "ctr" || a === "r" ? y + (h - th) / 2 : y;
  const ox = ax + t.tx * emu, oy = ay + t.ty * emu;
  const sx0 = ox - Math.ceil((ox - x) / tw) * tw, sy0 = oy - Math.ceil((oy - y) / th) * th;
  const out = [];
  for (let ty = sy0; ty < y + h && out.length < 4e3; ty += th) for (let tx = sx0; tx < x + w; tx += tw) out.push({ x: tx, y: ty, w: tw, h: th });
  return out;
}
function isRectGradient(g) {
  return !!g && (g.path === "rect" || g.path === "shape");
}
function rectGradientRaster(g, w, h, ppu) {
  const W = Math.max(1, Math.min(2e3, Math.round(w * ppu))), H = Math.max(1, Math.min(2e3, Math.round(h * ppu)));
  const f = g.fillTo ?? { l: 0.5, t: 0.5, r: 0.5, b: 0.5 };
  const fx0 = f.l * W, fx1 = (1 - f.r) * W, fy0 = f.t * H, fy1 = (1 - f.b) * H;
  const smp = gradientSamples(g.stops, 256);
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const py = y + 0.5;
    const ty = py < fy0 ? (fy0 - py) / Math.max(1e-6, fy0) : py > fy1 ? (py - fy1) / Math.max(1e-6, H - fy1) : 0;
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      const tx = px < fx0 ? (fx0 - px) / Math.max(1e-6, fx0) : px > fx1 ? (px - fx1) / Math.max(1e-6, W - fx1) : 0;
      const t = Math.min(1, Math.max(tx, ty));
      const i = Math.round(t * 255) * 3, k = (y * W + x) * 4;
      data[k] = smp[i];
      data[k + 1] = smp[i + 1];
      data[k + 2] = smp[i + 2];
      data[k + 3] = 255;
    }
  }
  return { data, w: W, h: H };
}
function substPhClr(spec, color2) {
  if (!spec.startsWith("@phClr")) return spec;
  const mods = spec.split("|")[1];
  if (!mods) return color2;
  const [base, cm] = color2.split("|");
  return `${base}|${[cm, mods].filter(Boolean).join(",")}`;
}
function withThemeStyles(s, theme) {
  let out = s;
  if (s.fillRef) {
    const list = s.fillRef.idx >= 1e3 ? theme.bgFillStyles : theme.fillStyles;
    const ts = list?.[s.fillRef.idx % 1e3 - 1];
    if (ts) {
      const c = s.fillRef.color;
      out = {
        ...out,
        ...ts.fill ? { fill: substPhClr(ts.fill, c) } : {},
        ...ts.gradient ? { gradient: { ...ts.gradient, from: substPhClr(ts.gradient.from, c), to: substPhClr(ts.gradient.to, c), ...ts.gradient.stops ? { stops: ts.gradient.stops.map((x) => ({ ...x, color: substPhClr(x.color, c) })) } : {} } } : {},
        ...ts.pattern ? { pattern: { ...ts.pattern, fg: substPhClr(ts.pattern.fg, c), bg: substPhClr(ts.pattern.bg, c) } } : {}
      };
    }
  }
  if (s.effectRef && !s.shadow) {
    const sh = theme.effectStyles?.[s.effectRef.idx - 1];
    if (sh) out = { ...out, shadow: { ...sh, color: substPhClr(sh.color, s.effectRef.color) } };
  }
  return out;
}
function shapeExtras(s0, theme) {
  const s = withThemeStyles(s0, theme);
  const out = {};
  if (s.fx) {
    const f = s.fx, c = (x) => resolveDrawingColor(x, theme) ?? "000000";
    const fx = {};
    if (f.inner) fx.shadow = { kind: "inner", color: c(f.inner.color), alpha: f.inner.alpha, blurPt: f.inner.blurPt, distPt: f.inner.distPt, dirDeg: f.inner.dirDeg };
    else if (f.outer) {
      const o = f.outer;
      fx.shadow = {
        kind: "outer",
        color: c(o.color),
        alpha: o.alpha,
        blurPt: o.blurPt,
        distPt: o.distPt,
        dirDeg: o.dirDeg,
        ...o.sx !== void 0 ? { sx: o.sx } : {},
        ...o.sy !== void 0 ? { sy: o.sy } : {},
        ...o.kxDeg ? { kxDeg: o.kxDeg } : {},
        ...o.kyDeg ? { kyDeg: o.kyDeg } : {},
        ...o.algn ? { algn: o.algn } : {},
        ...o.rotWithShape !== void 0 ? { rotWithShape: o.rotWithShape } : {}
      };
    }
    if (f.glow) fx.glow = { color: c(f.glow.color), alpha: f.glow.alpha, radPt: f.glow.radPt };
    if (f.softEdgePt) fx.softEdgePt = f.softEdgePt;
    if (f.reflection) fx.reflection = { ...f.reflection };
    if (Object.keys(fx).length) out.fx = fx;
  }
  if (s.pattern) {
    out.pattern = { prst: s.pattern.prst, fg: resolveDrawingColor(s.pattern.fg, theme) ?? "000000", bg: resolveDrawingColor(s.pattern.bg, theme) ?? "FFFFFF" };
  }
  if (s.blip) out.blip = s.blip;
  const g = s.gradient;
  if (g?.stops && g.stops.length) {
    out.grad = {
      stops: g.stops.map((st) => ({ pos: st.pos, color: resolveDrawingColor(st.color, theme) ?? "000000" })),
      angleDeg: g.angleDeg,
      ...g.scaled !== void 0 ? { scaled: g.scaled } : {},
      ...g.rotWithShape !== void 0 ? { rotWithShape: g.rotWithShape } : {},
      ...g.path ? { path: g.path } : {},
      ...g.fillTo ? { fillTo: g.fillTo } : {}
    };
  }
  if (s.shadow) {
    const c = resolveDrawingColor(s.shadow.color, theme);
    if (c) out.shadow = { ...s.shadow, color: c };
  }
  return out;
}
function groupChild(gr, item, x, y, w, h) {
  const sx = gr.widthTwips ? w / gr.widthTwips : 1, sy = gr.heightTwips ? h / gr.heightTwips : 1;
  const iw = item.w * sx, ih = item.h * sy;
  let ix = x + item.x * sx, iy = y + item.y * sy;
  if (!gr.rot && !gr.flipH && !gr.flipV) return { run: item.run, x: ix, y: iy, w: iw, h: ih };
  const gcx = x + w / 2, gcy = y + h / 2;
  let cx = ix + iw / 2, cy = iy + ih / 2;
  if (gr.flipH) cx = 2 * gcx - cx;
  if (gr.flipV) cy = 2 * gcy - cy;
  const a = (gr.rot ?? 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  [cx, cy] = [gcx + (cx - gcx) * c - (cy - gcy) * s, gcy + (cx - gcx) * s + (cy - gcy) * c];
  ix = cx - iw / 2;
  iy = cy - ih / 2;
  const mirror = !!gr.flipH !== !!gr.flipV;
  const xf = (st) => {
    if (!st) return st;
    const r = ((mirror ? -(st.rot ?? 0) : st.rot ?? 0) + (gr.rot ?? 0)) % 360;
    return { ...st, rot: r, flipH: !!st.flipH !== !!gr.flipH, flipV: !!st.flipV !== !!gr.flipV };
  };
  const r0 = item.run;
  const run2 = { ...r0 };
  if (r0.shape) run2.shape = { ...r0.shape, style: xf(r0.shape.style) };
  if (r0.image) run2.image = { ...r0.image, style: xf(r0.image.style ?? { geom: "rect" }) };
  if (r0.textbox) {
    const tb = { ...r0.textbox };
    if (tb.shape) tb.shape = xf(tb.shape);
    const tr = ((mirror ? -(tb.rot ?? 0) : tb.rot ?? 0) + (gr.rot ?? 0)) % 360;
    if (tr) tb.rot = tr;
    run2.textbox = tb;
  }
  if (r0.group) run2.group = { ...r0.group, rot: ((r0.group.rot ?? 0) + (gr.rot ?? 0)) % 360, flipH: !!r0.group.flipH !== !!gr.flipH, flipV: !!r0.group.flipV !== !!gr.flipV };
  return { run: run2, x: ix, y: iy, w: iw, h: ih };
}
function custPaths(cust, x, y, w, h, opts = {}) {
  const r = (opts.rot ?? 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const cx = w / 2, cy = h / 2;
  const place = (px, py) => {
    if (opts.flipH) px = w - px;
    if (opts.flipV) py = h - py;
    const dx = px - cx, dy = py - cy;
    return [x + cx + dx * c - dy * s, y + cy + dx * s + dy * c];
  };
  return cust.map((p) => {
    const sx = w / (p.w || 1), sy = h / (p.h || 1);
    const local = [];
    let cur = [0, 0];
    let start = [0, 0];
    for (const k of p.cmds) {
      if (k.op === "M" || k.op === "L") {
        cur = [k.x * sx, k.y * sy];
        if (k.op === "M") start = cur;
        local.push({ op: k.op, x: cur[0], y: cur[1] });
      } else if (k.op === "C" && k.pts.length >= 3) {
        const [a, b, d] = k.pts.map(([px, py]) => [px * sx, py * sy]);
        local.push({ op: "C", x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: d[0], y: d[1] });
        cur = d;
      } else if (k.op === "Q" && k.pts.length >= 2) {
        const [q, d] = k.pts.map(([px, py]) => [px * sx, py * sy]);
        local.push({ op: "C", x1: cur[0] + 2 / 3 * (q[0] - cur[0]), y1: cur[1] + 2 / 3 * (q[1] - cur[1]), x2: d[0] + 2 / 3 * (q[0] - d[0]), y2: d[1] + 2 / 3 * (q[1] - d[1]), x: d[0], y: d[1] });
        cur = d;
      } else if (k.op === "A") {
        cur = arcTo(local, cur, k.wR * sx, k.hR * sy, k.st, k.sw);
      } else if (k.op === "Z") {
        local.push({ op: "Z" });
        cur = start;
      }
    }
    return { cmds: mapPath(local, place), fill: p.fill, stroke: p.stroke };
  });
}

// ../docx-layout/src/images.ts
function jpegInfo(b) {
  if (b[0] !== 255 || b[1] !== 216) return null;
  let i = 2;
  let adobe = false;
  while (i + 4 < b.length) {
    if (b[i] !== 255) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m === 255) {
      i++;
      continue;
    }
    if (m === 216 || m === 1 || m >= 208 && m <= 215) {
      i += 2;
      continue;
    }
    const len = b[i + 2] << 8 | b[i + 3];
    if (m === 238 && b[i + 4] === 65 && b[i + 5] === 100) adobe = true;
    if (m >= 192 && m <= 207 && m !== 196 && m !== 200 && m !== 204) {
      if (i + 9 >= b.length) return null;
      const height = b[i + 5] << 8 | b[i + 6];
      const width = b[i + 7] << 8 | b[i + 8];
      const components = b[i + 9];
      return { width, height, components, adobe };
    }
    i += 2 + len;
  }
  return null;
}
function imagePixelSize(b) {
  const jp = jpegInfo(b);
  if (jp) return { width: jp.width, height: jp.height };
  if (b.length > 24 && b[0] === 137 && b[1] === 80) return { width: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, height: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
  if (b.length > 10 && b[0] === 71 && b[1] === 73) return { width: b[6] | b[7] << 8, height: b[8] | b[9] << 8 };
  if (b.length > 26 && b[0] === 66 && b[1] === 77) return { width: Math.abs(b[18] | b[19] << 8 | b[20] << 16 | b[21] << 24), height: Math.abs(b[22] | b[23] << 8 | b[24] << 16 | b[25] << 24) };
  return null;
}
var PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
function decodePng(b) {
  for (let k = 0; k < 8; k++) if (b[k] !== PNG_SIG[k]) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 8;
  let width = 0, height = 0, depth = 8, ctype = 0, interlace = 0;
  let palette = null;
  let trns = null;
  const idat = [];
  while (pos + 8 <= b.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = dv.getUint32(pos + 8);
      height = dv.getUint32(pos + 12);
      depth = b[pos + 16];
      ctype = b[pos + 17];
      interlace = b[pos + 20];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (!width || !height) return null;
  let total = 0;
  for (const c of idat) total += c.length;
  const z = new Uint8Array(total);
  let o = 0;
  for (const c of idat) {
    z.set(c, o);
    o += c.length;
  }
  let raw;
  try {
    raw = unzlibSync(z);
  } catch {
    return null;
  }
  const channels = ctype === 0 ? 1 : ctype === 2 ? 3 : ctype === 3 ? 1 : ctype === 4 ? 2 : 4;
  const bitsPP = channels * depth;
  const bpp = Math.max(1, bitsPP >> 3);
  const out = new Uint8Array(width * height * 4);
  const pass = (rp, w, h, put) => {
    if (w === 0 || h === 0) return rp;
    const stride = Math.ceil(w * bitsPP / 8);
    let prev = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      const ft = raw[rp++];
      const line = raw.slice(rp, rp + stride);
      rp += stride;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? line[i - bpp] : 0;
        const up2 = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let v = line[i];
        if (ft === 1) v += a;
        else if (ft === 2) v += up2;
        else if (ft === 3) v += a + up2 >> 1;
        else if (ft === 4) {
          const pp = a + up2 - c;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - up2), pc = Math.abs(pp - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? up2 : c;
        }
        line[i] = v & 255;
      }
      for (let x = 0; x < w; x++) {
        const rawSample = (ch) => {
          if (depth === 8) return line[x * channels + ch];
          if (depth === 16) {
            const i = (x * channels + ch) * 2;
            return line[i] << 8 | line[i + 1];
          }
          const bit = (x * channels + ch) * depth;
          const byte = line[bit >> 3];
          const shift = 8 - depth - (bit & 7);
          return byte >> shift & (1 << depth) - 1;
        };
        const sample = (ch) => {
          if (depth === 8) return line[x * channels + ch];
          if (depth === 16) return line[(x * channels + ch) * 2];
          const v = rawSample(ch);
          return ctype === 3 ? v : Math.round(v * 255 / ((1 << depth) - 1));
        };
        const key = (k) => trns[k * 2] << 8 | trns[k * 2 + 1];
        let px;
        if (ctype === 0) {
          const g = sample(0);
          const transparent = !!trns && trns.length >= 2 && key(0) === rawSample(0);
          px = [g, g, g, transparent ? 0 : 255];
        } else if (ctype === 2) {
          const transparent = !!trns && trns.length >= 6 && key(0) === rawSample(0) && key(1) === rawSample(1) && key(2) === rawSample(2);
          px = [sample(0), sample(1), sample(2), transparent ? 0 : 255];
        } else if (ctype === 3) {
          const i = sample(0);
          px = palette ? [palette[i * 3] ?? 0, palette[i * 3 + 1] ?? 0, palette[i * 3 + 2] ?? 0, trns && i < trns.length ? trns[i] : 255] : [0, 0, 0, 255];
        } else if (ctype === 4) {
          const g = sample(0);
          px = [g, g, g, sample(1)];
        } else px = [sample(0), sample(1), sample(2), sample(3)];
        put(x, y, px);
      }
      prev = line;
    }
    return rp;
  };
  const putAt = (ox, oy, dx, dy) => (x, y, px) => {
    const X = ox + x * dx, Y = oy + y * dy;
    const k = (Y * width + X) * 4;
    out[k] = px[0];
    out[k + 1] = px[1];
    out[k + 2] = px[2];
    out[k + 3] = px[3];
  };
  if (!interlace) pass(0, width, height, putAt(0, 0, 1, 1));
  else {
    const passes = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
    let rp = 0;
    for (const [ox, oy, dx, dy] of passes) {
      const w = Math.ceil((width - ox) / dx), h = Math.ceil((height - oy) / dy);
      rp = pass(rp, w > 0 ? w : 0, h > 0 ? h : 0, putAt(ox, oy, dx, dy));
    }
  }
  return { width, height, data: out };
}
function decodeGif(b) {
  if (b[0] !== 71 || b[1] !== 73 || b[2] !== 70) return null;
  const width = b[6] | b[7] << 8, height = b[8] | b[9] << 8;
  const flags = b[10];
  let pos = 13;
  let gct = null;
  if (flags & 128) {
    const n = 3 * (1 << (flags & 7) + 1);
    gct = b.subarray(pos, pos + n);
    pos += n;
  }
  let transparent = -1;
  const out = new Uint8Array(width * height * 4);
  while (pos < b.length) {
    const t = b[pos++];
    if (t === 33) {
      const label = b[pos++];
      if (label === 249 && b[pos + 1] & 1) transparent = b[pos + 4];
      while (pos < b.length && b[pos]) pos += b[pos] + 1;
      pos++;
    } else if (t === 44) {
      const ix = b[pos] | b[pos + 1] << 8, iy = b[pos + 2] | b[pos + 3] << 8;
      const iw = b[pos + 4] | b[pos + 5] << 8, ih = b[pos + 6] | b[pos + 7] << 8;
      const lf = b[pos + 8];
      pos += 9;
      let ct = gct;
      if (lf & 128) {
        const n = 3 * (1 << (lf & 7) + 1);
        ct = b.subarray(pos, pos + n);
        pos += n;
      }
      const interlaced = !!(lf & 64);
      const minCode = b[pos++];
      if (!(minCode >= 1 && minCode <= 11)) return null;
      const chunks = [];
      while (pos < b.length && b[pos]) {
        const n = b[pos];
        for (let k = 1; k <= n; k++) chunks.push(b[pos + k]);
        pos += n + 1;
      }
      pos++;
      const idx = lzw(Uint8Array.from(chunks), minCode, iw * ih);
      const rows = [];
      if (interlaced) {
        for (const [s, st] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let r = s; r < ih; r += st) rows.push(r);
      } else for (let r = 0; r < ih; r++) rows.push(r);
      for (let r = 0; r < ih; r++) {
        const yy = iy + rows[r];
        if (yy >= height) continue;
        for (let x = 0; x < iw; x++) {
          if (ix + x >= width) break;
          const ci = idx[r * iw + x] ?? 0;
          const k = (yy * width + ix + x) * 4;
          if (ci === transparent || !ct) {
            out[k + 3] = 0;
            continue;
          }
          out[k] = ct[ci * 3];
          out[k + 1] = ct[ci * 3 + 1];
          out[k + 2] = ct[ci * 3 + 2];
          out[k + 3] = 255;
        }
      }
      return { width, height, data: out };
    } else break;
  }
  return null;
}
function lzw(data, minCode, n) {
  const out = new Uint8Array(n);
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = [];
    dict[eoi] = [];
    size = minCode + 1;
  };
  reset();
  let bit = 0, o = 0;
  let prev = null;
  while (o < n) {
    let code = 0;
    for (let k = 0; k < size; k++) {
      if (data[bit + k >> 3] >> (bit + k & 7) & 1) code |= 1 << k;
    }
    bit += size;
    if (bit > data.length * 8) break;
    if (code === clear) {
      reset();
      prev = null;
      continue;
    }
    if (code === eoi) break;
    let entry;
    if (dict[code]) entry = dict[code];
    else if (prev) entry = [...prev, prev[0]];
    else break;
    for (const v of entry) {
      if (o < n) out[o++] = v;
    }
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length >= 1 << size && size < 12) size++;
  }
  return out;
}
function decodeBmp(b) {
  if (b[0] !== 66 || b[1] !== 77) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const off = dv.getUint32(10, true);
  const width = dv.getInt32(18, true);
  let height = dv.getInt32(22, true);
  const bpp = dv.getUint16(28, true);
  const comp = dv.getUint32(30, true);
  if (comp !== 0 && comp !== 3) return null;
  if (width <= 0 || height === 0) return null;
  const topDown = height < 0;
  height = Math.abs(height);
  const stride = Math.ceil(width * bpp / 32) * 4;
  const hdr = dv.getUint32(14, true);
  const palOff = 14 + hdr;
  let masks = bpp === 16 ? [31744, 992, 31, 0] : [16711680, 65280, 255, 0];
  if (comp === 3 && (bpp === 16 || bpp === 32)) masks = [dv.getUint32(54, true), dv.getUint32(58, true), dv.getUint32(62, true), hdr >= 56 ? dv.getUint32(66, true) : 0];
  const chan = (v, m, dflt) => {
    if (!m) return dflt;
    let shift = 0;
    while (!(m >>> shift & 1)) shift++;
    const bits = Math.clz32(0) - Math.clz32(m >>> shift);
    return Math.round(((v & m) >>> shift) * 255 / (2 ** bits - 1));
  };
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = off + (topDown ? y : height - 1 - y) * stride;
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      if (bpp === 24) {
        const p = row + x * 3;
        out[k] = b[p + 2];
        out[k + 1] = b[p + 1];
        out[k + 2] = b[p];
        out[k + 3] = 255;
      } else if (bpp === 16 || bpp === 32) {
        const p = row + x * (bpp / 8);
        const v = bpp === 16 ? b[p] | b[p + 1] << 8 : (b[p] | b[p + 1] << 8 | b[p + 2] << 16 | b[p + 3] << 24) >>> 0;
        out[k] = chan(v, masks[0], 0);
        out[k + 1] = chan(v, masks[1], 0);
        out[k + 2] = chan(v, masks[2], 0);
        out[k + 3] = chan(v, masks[3], 255);
      } else if (bpp <= 8) {
        const bit = x * bpp;
        const v = b[row + (bit >> 3)] >> 8 - bpp - (bit & 7) & (1 << bpp) - 1;
        const p = palOff + v * 4;
        out[k] = b[p + 2];
        out[k + 1] = b[p + 1];
        out[k + 2] = b[p];
        out[k + 3] = 255;
      }
    }
  }
  return { width, height, data: out };
}
function decodeRaster(b) {
  return decodePng(b) ?? decodeGif(b) ?? decodeBmp(b) ?? decodeTiff(b);
}
function tiffLzw(data, expected) {
  const out = new Uint8Array(expected);
  let o = 0;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < 256; i++) dict[i] = new Uint8Array([i]);
    dict[256] = new Uint8Array(0);
    dict[257] = new Uint8Array(0);
  };
  reset();
  let bitPos = 0, width = 9;
  let prev = null;
  const read = () => {
    let v = 0;
    for (let k = 0; k < width; k++) {
      const byte = data[bitPos + k >> 3];
      if (byte === void 0) return 257;
      v = v << 1 | byte >> 7 - (bitPos + k & 7) & 1;
    }
    bitPos += width;
    return v;
  };
  while (o < expected) {
    const code = read();
    if (code === 257) break;
    if (code === 256) {
      reset();
      width = 9;
      prev = null;
      continue;
    }
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (prev) {
      entry = new Uint8Array(prev.length + 1);
      entry.set(prev);
      entry[prev.length] = prev[0];
    } else break;
    for (let k = 0; k < entry.length && o < expected; k++) out[o++] = entry[k];
    if (prev) {
      const ne = new Uint8Array(prev.length + 1);
      ne.set(prev);
      ne[prev.length] = entry[0];
      dict.push(ne);
    }
    prev = entry;
    if (dict.length + 1 >= 1 << width && width < 12) width++;
  }
  return out;
}
function packBits(data, expected) {
  const out = new Uint8Array(expected);
  let i = 0, o = 0;
  while (i < data.length && o < expected) {
    const n = data[i++] << 24 >> 24;
    if (n >= 0) {
      for (let k = 0; k <= n && o < expected; k++) out[o++] = data[i++];
    } else if (n !== -128) {
      const v = data[i++];
      for (let k = 0; k < 1 - n && o < expected; k++) out[o++] = v;
    }
  }
  return out;
}
function decodeTiff(b) {
  const le = b[0] === 73 && b[1] === 73;
  const be = b[0] === 77 && b[1] === 77;
  if (!le && !be) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = (o) => dv.getUint16(o, le);
  const u32 = (o) => dv.getUint32(o, le);
  if (u16(2) !== 42) return null;
  const ifd = u32(4);
  const n = u16(ifd);
  const tags = /* @__PURE__ */ new Map();
  const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 };
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
    const size = (SIZES[type] ?? 1) * count;
    const base = size <= 4 ? e + 8 : u32(e + 8);
    const vals = [];
    for (let k = 0; k < Math.min(count, 1 << 20); k++) {
      if (type === 3) vals.push(u16(base + k * 2));
      else if (type === 4) vals.push(u32(base + k * 4));
      else if (type === 1 || type === 7) vals.push(b[base + k]);
      else if (type === 5) vals.push(u32(base + k * 8) / (u32(base + k * 8 + 4) || 1));
    }
    tags.set(tag, vals);
  }
  const t = (k, d = 0) => tags.get(k)?.[0] ?? d;
  const width = t(256), height = t(257);
  const bps = tags.get(258) ?? [1];
  const comp = t(259, 1);
  const photo = t(262, 1);
  const spp = t(277, 1);
  const predictor = t(317, 1);
  const planar = t(284, 1);
  if (!width || !height || planar !== 1 || ![1, 5, 8, 32946, 32773].includes(comp)) return null;
  const bits = bps[0] ?? 8;
  const decode0 = (chunk, expected) => {
    if (comp === 1) return chunk;
    if (comp === 5) return tiffLzw(chunk, expected);
    if (comp === 32773) return packBits(chunk, expected);
    try {
      return unzlibSync(chunk);
    } catch {
      return new Uint8Array(expected);
    }
  };
  const ycc = photo === 6 && bits === 8 && spp === 3;
  const sub = tags.get(530) ?? [2, 2];
  const sh = ycc ? Math.max(1, sub[0] ?? 2) : 1, sv = ycc ? Math.max(1, sub[1] ?? 2) : 1;
  const coef = tags.get(529) ?? [0.299, 0.587, 0.114];
  const toRgb = (Y, cb, cr) => {
    const lr = coef[0] ?? 0.299, lg = coef[1] ?? 0.587, lb = coef[2] ?? 0.114;
    const R = Y + (cr - 128) * (2 - 2 * lr), B2 = Y + (cb - 128) * (2 - 2 * lb);
    const G = (Y - lb * B2 - lr * R) / lg;
    const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return [c(R), c(G), c(B2)];
  };
  if (ycc && (sh > 1 || sv > 1)) {
    if (tags.has(322)) return null;
    const across = Math.ceil(width / sh), unit = sh * sv + 2, blockRow = across * unit, blockRows = Math.ceil(height / sv);
    const data = new Uint8Array(blockRow * blockRows);
    const rps = t(278, height);
    let o = 0;
    (tags.get(273) ?? []).forEach((off, i) => {
      if (o >= data.length) return;
      const rows = Math.min(rps, height - i * rps);
      const exp = Math.ceil(rows / sv) * blockRow;
      const d = decode0(b.subarray(off, off + (tags.get(279)?.[i] ?? 0)), exp);
      data.set(d.subarray(0, Math.min(d.length, data.length - o)), o);
      o += exp;
    });
    const out2 = new Uint8Array(width * height * 4);
    for (let by = 0; by < blockRows; by++) {
      for (let bx = 0; bx < across; bx++) {
        const u = by * blockRow + bx * unit;
        const cb = data[u + sh * sv], cr = data[u + sh * sv + 1];
        for (let j = 0; j < sv; j++) {
          for (let i = 0; i < sh; i++) {
            const x = bx * sh + i, y = by * sv + j;
            if (x >= width || y >= height) continue;
            const [R, G, B2] = toRgb(data[u + j * sh + i], cb, cr);
            const k = (y * width + x) * 4;
            out2[k] = R;
            out2[k + 1] = G;
            out2[k + 2] = B2;
            out2[k + 3] = 255;
          }
        }
      }
    }
    return { width, height, data: out2 };
  }
  const rowBytes = Math.ceil(width * spp * bits / 8);
  const raw = new Uint8Array(rowBytes * height);
  const tiled = tags.has(322);
  const offs = tags.get(tiled ? 324 : 273) ?? [];
  const counts = tags.get(tiled ? 325 : 279) ?? [];
  const decode = decode0;
  if (!tiled) {
    const rps = t(278, height);
    let o = 0;
    offs.forEach((off, i) => {
      if (o >= raw.length) return;
      const rows = Math.min(rps, height - i * rps);
      const d = decode(b.subarray(off, off + (counts[i] ?? 0)), rows * rowBytes);
      raw.set(d.subarray(0, Math.min(d.length, raw.length - o)), o);
      o += rows * rowBytes;
    });
  } else {
    const tw = t(322), th = t(323);
    const tilesAcross = Math.ceil(width / tw);
    const tileRow = Math.ceil(tw * spp * bits / 8);
    offs.forEach((off, i) => {
      const d = decode(b.subarray(off, off + (counts[i] ?? 0)), tileRow * th);
      const tx = i % tilesAcross * tw, ty = Math.floor(i / tilesAcross) * th;
      for (let y = 0; y < th && ty + y < height; y++) {
        const dst = (ty + y) * rowBytes + Math.floor(tx * spp * bits / 8);
        const len = Math.min(tileRow, rowBytes - Math.floor(tx * spp * bits / 8));
        raw.set(d.subarray(y * tileRow, y * tileRow + len), dst);
      }
    });
  }
  if (predictor === 2 && bits === 8) {
    for (let y = 0; y < height; y++) {
      for (let x = spp; x < width * spp; x++) raw[y * rowBytes + x] = raw[y * rowBytes + x] + raw[y * rowBytes + x - spp] & 255;
    }
  } else if (predictor === 2 && bits === 16) {
    const get = (o) => le ? raw[o] | raw[o + 1] << 8 : raw[o] << 8 | raw[o + 1];
    const set = (o, v) => {
      if (le) {
        raw[o] = v & 255;
        raw[o + 1] = v >> 8;
      } else {
        raw[o] = v >> 8;
        raw[o + 1] = v & 255;
      }
    };
    for (let y = 0; y < height; y++) {
      for (let s = spp; s < width * spp; s++) {
        const o = y * rowBytes + s * 2;
        set(o, get(o) + get(o - spp * 2) & 65535);
      }
    }
  }
  const out = new Uint8Array(width * height * 4);
  const cmap = tags.get(320);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      const sample = (c) => {
        if (bits === 8) return raw[y * rowBytes + x * spp + c];
        if (bits === 16) return raw[y * rowBytes + (x * spp + c) * 2 + (le ? 1 : 0)];
        const bit = (x * spp + c) * bits;
        const v = raw[y * rowBytes + (bit >> 3)] >> 8 - bits - (bit & 7) & (1 << bits) - 1;
        return v;
      };
      if (ycc) {
        const [R, G, B2] = toRgb(sample(0), sample(1), sample(2));
        out[k] = R;
        out[k + 1] = G;
        out[k + 2] = B2;
        out[k + 3] = 255;
      } else if (photo === 2 || photo === 6) {
        out[k] = sample(0);
        out[k + 1] = sample(1);
        out[k + 2] = sample(2);
        out[k + 3] = spp >= 4 ? sample(3) : 255;
      } else if (photo === 3 && cmap) {
        const i = sample(0), nColors = 1 << bits;
        out[k] = cmap[i] >> 8;
        out[k + 1] = cmap[nColors + i] >> 8;
        out[k + 2] = cmap[2 * nColors + i] >> 8;
        out[k + 3] = 255;
      } else if (photo === 5) {
        const c = sample(0), m = sample(1), yy = sample(2), kk = sample(3);
        out[k] = 255 - Math.min(255, c + kk);
        out[k + 1] = 255 - Math.min(255, m + kk);
        out[k + 2] = 255 - Math.min(255, yy + kk);
        out[k + 3] = 255;
      } else {
        const max = bits >= 8 ? 255 : (1 << bits) - 1;
        let g = Math.round(sample(0) * 255 / max);
        if (photo === 0) g = 255 - g;
        out[k] = g;
        out[k + 1] = g;
        out[k + 2] = g;
        out[k + 3] = spp >= 2 ? sample(1) : 255;
      }
    }
  }
  return { width, height, data: out };
}
function effectLine(fx) {
  if (fx.gain === void 0 && !fx.bright) return null;
  const s = fx.gain ?? 1, b = fx.bright ?? 0;
  return { slope: s, off: 0.5 - 0.5 * s + b / 2 * (1 + s) };
}
function applyImageEffects(rgba, fx) {
  const ln = effectLine(fx);
  const map = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    const y = ln ? (v / 255 * ln.slope + ln.off) * 255 : v;
    map[v] = Math.max(0, Math.min(255, fx.floor ? Math.floor(y + 1e-9) : Math.round(y)));
  }
  const thr = fx.biLevel !== void 0 ? fx.biLevel * 255 : -1;
  for (let i = 0; i < rgba.length; i += 4) {
    let r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    if (fx.gray) r = g = b = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    r = map[r];
    g = map[g];
    b = map[b];
    if (thr >= 0) r = g = b = 0.2126 * r + 0.7152 * g + 0.0722 * b >= thr ? 255 : 0;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
  }
}
function effectDecode(fx, components) {
  if (fx.gray || fx.biLevel !== void 0 || components === 4) return null;
  const ln = effectLine(fx);
  if (!ln) return null;
  const d = [ln.off, ln.off + ln.slope];
  return components === 1 ? d : [...d, ...d, ...d];
}
function applyPictureAdjust(d, o) {
  const hex = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  if (o.clrChange) {
    const [fr, fg, fb] = hex(o.clrChange.from), [tr, tg, tb] = hex(o.clrChange.to);
    const ta = Math.round(o.clrChange.toAlpha * 255);
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - fr) <= 2 && Math.abs(d[i + 1] - fg) <= 2 && Math.abs(d[i + 2] - fb) <= 2) {
        d[i] = tr;
        d[i + 1] = tg;
        d[i + 2] = tb;
        d[i + 3] = Math.round(d[i + 3] * ta / 255);
      }
    }
  }
  if (o.duotone) {
    const [a, b] = [hex(o.duotone[0]), hex(o.duotone[1])];
    for (let i = 0; i < d.length; i += 4) {
      const t = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      d[i] = Math.round(a[0] + (b[0] - a[0]) * t);
      d[i + 1] = Math.round(a[1] + (b[1] - a[1]) * t);
      d[i + 2] = Math.round(a[2] + (b[2] - a[2]) * t);
    }
  }
  if (o.alpha !== void 0) for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i] * o.alpha);
}

// ../docx-layout/src/page-fill.ts
function resolvePageFill(bg, pageColor) {
  const f = bg.fill;
  if (!f) return void 0;
  const c1 = (f.color ?? pageColor ?? "FFFFFF").toUpperCase();
  const out = {
    type: f.type,
    c1,
    c2: resolveColor2(f.color2, c1),
    angle: f.angle ?? 0,
    focus: f.focus ?? 0,
    ...f.colors?.length ? { stops: f.colors } : {},
    ...f.focusPosition ? { focusPosition: f.focusPosition } : {},
    ...f.gradientCenter ? { gradientCenter: true } : {}
  };
  if (f.image) {
    const info = imagePixelInfo(f.image.data);
    out.image = { data: f.image.data, ext: f.image.ext, widthTwips: info ? info.w * 1440 / info.dpi : 1440, heightTwips: info ? info.h * 1440 / info.dpi : 1440 };
    if (info) out.imagePx = info;
    if (f.type === "pattern") {
      const rows = patternRowsFromImage(f.image.data);
      if (rows) out.pattern = rows;
    }
  }
  if (f.type === "pattern" && !out.pattern) return void 0;
  if ((f.type === "frame" || f.type === "tile") && !out.imagePx) return void 0;
  return out;
}
var tri = (q) => 1 - Math.abs(1 - 2 * q);
var fract = (v) => v - Math.floor(v);
var near = (a, b) => Math.abs(a - b) < 0.5;
function fillParam(f, x, y, pdfCorner = false) {
  const fo = f.focus;
  if (f.type === "gradientRadial") {
    if (f.gradientCenter) {
      const qx = pdfCorner ? x : tri(x), qy = pdfCorner ? y : tri(y);
      const [fx2, fy2] = f.focusPosition ?? [0, 0];
      const p2 = Math.max(Math.abs(qx - fx2), Math.abs(qy - fy2));
      return fo > 0 ? p2 : 1 - p2;
    }
    const [fx, fy] = f.focusPosition ?? [0.5, 0.5];
    const p = Math.min(1, Math.max(Math.abs(x - fx) / Math.max(fx, 1 - fx, 1e-6), Math.abs(y - fy) / Math.max(fy, 1 - fy, 1e-6)));
    return fo > 0 ? p : 1 - p;
  }
  let a = (f.angle % 360 + 360) % 360;
  if (a > 180) a -= 360;
  if (near(a, 0) || near(Math.abs(a), 180)) return fo > 0 ? tri(y) : 1 - tri(y);
  if (near(Math.abs(a), 90)) return fo >= 75 || fo < 0 ? tri(x) : 1 - tri(x);
  if (near(a, -135) || near(a, 45)) {
    const q2 = (x + y) / 2;
    if (fo >= 75) return tri(q2);
    if (fo > 0) return 1 - tri(fract(2 * q2));
    if (fo < 0) return tri(fract(2 * q2));
    return 1 - tri(q2);
  }
  if (near(a, -45) || near(a, 135)) {
    const v = x - y;
    const base = 1 - Math.abs(((v + 1.5) % 2 + 2) % 2 - 1);
    if (fo >= 75) return 1 - base;
    if (fo > 0) return tri(fract(v));
    if (fo < 0) return 1 - tri(fract(v));
    return base;
  }
  const r = a * Math.PI / 180;
  const dx = -Math.sin(r), dy = Math.cos(r);
  const lo = Math.min(0, dx) + Math.min(0, dy), hi = Math.max(0, dx) + Math.max(0, dy);
  const q = hi > lo ? (x * dx + y * dy - lo) / (hi - lo) : 0;
  return fo > 0 ? tri(q) : 1 - tri(q);
}
function ramp(f, n) {
  const stops = f.stops?.length ? f.stops : [{ pos: 0, color: f.c1 }, { pos: 1, color: f.c2 }];
  return gradientSamples(stops, n);
}
function gradientTilePx(f, pdf) {
  return pdf && f.type === "gradientRadial" && f.gradientCenter ? { w: 512, h: 384 } : { w: 1024, h: 768 };
}
function gradientTileRgba(f, w, h, pdf = false) {
  const N = 1024;
  const lut = ramp(f, N);
  const out = new Uint8Array(w * h * 4);
  const corner = pdf && f.type === "gradientRadial" && !!f.gradientCenter;
  for (let j = 0; j < h; j++) {
    const y = h > 1 ? j / (h - 1) : 0;
    for (let i = 0; i < w; i++) {
      const x = w > 1 ? i / (w - 1) : 0;
      const k = Math.max(0, Math.min(N - 1, Math.round(fillParam(f, x, y, corner) * (N - 1)))) * 3;
      const o = (j * w + i) * 4;
      out[o] = lut[k];
      out[o + 1] = lut[k + 1];
      out[o + 2] = lut[k + 2];
      out[o + 3] = 255;
    }
  }
  return out;
}
function patternRgba(f) {
  const out = new Uint8Array(64 * 4);
  const fg = hexRgb2(f.c1), bg = hexRgb2(f.c2);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const on = (f.pattern?.[y] ?? 0) >> 7 - x & 1;
      const c = on ? fg : bg;
      const o = (y * 8 + x) * 4;
      out[o] = c[0];
      out[o + 1] = c[1];
      out[o + 2] = c[2];
      out[o + 3] = 255;
    }
  }
  return out;
}
var hexRgb2 = (h) => [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
function pageFillTileTw(f, devicePxTw, patternPxTw, pdf = false) {
  if (f.type === "gradient" || f.type === "gradientRadial") {
    const t = gradientTilePx(f, pdf);
    return { w: t.w * devicePxTw, h: t.h * devicePxTw };
  }
  if (f.type === "pattern") return f.pattern ? { w: 8 * patternPxTw, h: 8 * patternPxTw } : null;
  const px = f.imagePx;
  if (!px || px.w <= 0 || px.h <= 0) return null;
  if (f.type === "frame") return { w: px.w * devicePxTw, h: px.h * devicePxTw };
  const dpi = px.dpi > 0 ? px.dpi : 96;
  return { w: px.w * 1440 / dpi, h: px.h * 1440 / dpi };
}
function imagePixelInfo(b) {
  if (b[0] === 137 && b[1] === 80) {
    const w = (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h = (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0;
    let dpi = 96;
    for (let i = 8; i + 8 < b.length; ) {
      const len = (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
      const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
      if (type === "pHYs" && b[i + 16] === 1) dpi = Math.round(((b[i + 8] << 24 | b[i + 9] << 16 | b[i + 10] << 8 | b[i + 11]) >>> 0) * 0.0254);
      if (type === "IDAT" || type === "IEND") break;
      i += 12 + len;
    }
    return { w, h, dpi };
  }
  const jp = jpegInfo(b);
  if (jp) {
    let dpi = 96;
    if (b[2] === 255 && b[3] === 224 && b[6] === 74 && b[7] === 70 && b[13] === 1) dpi = b[14] << 8 | b[15];
    return { w: jp.width, h: jp.height, dpi: dpi || 96 };
  }
  if (b[0] === 71 && b[1] === 73 && b[2] === 70) return { w: b[6] | b[7] << 8, h: b[8] | b[9] << 8, dpi: 96 };
  if (b[0] === 66 && b[1] === 77) {
    const w = b[18] | b[19] << 8 | b[20] << 16, h = Math.abs(b[22] | b[23] << 8 | b[24] << 16 | b[25] << 24 | 0);
    const ppm = (b[38] | b[39] << 8 | b[40] << 16 | b[41] << 24) >>> 0;
    return { w, h, dpi: ppm ? Math.round(ppm * 0.0254) : 96 };
  }
  const png = decodePng(b);
  return png ? { w: png.width, h: png.height, dpi: 96 } : null;
}
function patternRowsFromImage(b) {
  const img = decodeGif(b) ?? decodePng(b);
  if (!img || img.width < 8 || img.height < 8) return void 0;
  const rows = [];
  for (let y = 0; y < 8; y++) {
    let r = 0;
    for (let x = 0; x < 8; x++) {
      const o = (y * img.width + x) * 4;
      const lum = 0.299 * img.data[o] + 0.587 * img.data[o + 1] + 0.114 * img.data[o + 2];
      if (lum >= 128) r |= 128 >> x;
    }
    rows.push(r);
  }
  return rows;
}

// ../docx-layout/src/chain.ts
var CONTINUATION = /* @__PURE__ */ new WeakSet();
function indexChains(full) {
  const out = /* @__PURE__ */ new Map();
  const scan = (blocks) => {
    const heads = /* @__PURE__ */ new Map();
    const links = [];
    forEachTextbox(blocks, (tb) => {
      if (tb.link) links.push(tb);
      else if (tb.story !== void 0 && !heads.has(tb.story)) heads.set(tb.story, tb);
    });
    if (!links.length) return;
    for (const [id, head] of heads) {
      const ms = links.filter((l) => l.link.id === id).sort((a, b) => a.link.seq - b.link.seq);
      if (!ms.length) continue;
      const chain = { members: [head, ...ms] };
      for (const m of chain.members) out.set(m, chain);
    }
  };
  scan(full.blocks);
  const seen = /* @__PURE__ */ new Set();
  for (const s of full.sections) {
    for (const set of [s.headerBlocks, s.footerBlocks]) {
      for (const bs of Object.values(set ?? {})) {
        if (bs && !seen.has(bs)) {
          seen.add(bs);
          scan(bs);
        }
      }
    }
  }
  return out;
}
function sliceParagraphFrom(p, offset) {
  const runs = [];
  let pos = 0;
  for (const r of p.runs) {
    const len = r.text.length;
    if (pos + len <= offset) {
      pos += len;
      continue;
    }
    if (pos >= offset || r.field || r.fieldResult || r.image || r.textbox || r.shape || r.group || r.custom || r.math) runs.push(r);
    else runs.push({ ...r, text: r.text.slice(offset - pos) });
    pos += len;
  }
  const out = { ...p, runs };
  CONTINUATION.add(out);
  return out;
}
function topBlockOf(ref) {
  const m = /^[^/]+\/b(\d+)/.exec(ref);
  return m ? +m[1] : -1;
}
function topRowOf(ref) {
  const m = /^[^/]+\/b\d+\/r(\d+)\//.exec(ref);
  return m ? +m[1] : -1;
}
function remapLines(lines, map, cont, rows = 0) {
  return lines.map((l) => {
    const m = /^([^/]+)\/b(\d+)(.*)$/.exec(l.ref);
    if (!m) return l;
    const j = +m[2];
    const tail = j === 0 && rows ? m[3].replace(/^\/r(\d+)/, (_s, r) => `/r${+r + rows}`) : m[3];
    const ref = `${m[1]}/b${map[j] ?? j}${tail}`;
    if (j !== 0 || !cont || m[3]) return ref === l.ref ? l : { ...l, ref };
    return { ...l, ref, start: l.start + cont, end: l.end + cont, ...l.chars ? { chars: l.chars.map((c) => ({ ...c, o: c.o + cont })) } : {} };
  });
}

// ../docx-layout/src/lines.ts
var FIXED_SPACE = (cp) => cp >= 8192 && cp <= 8202 || cp === 12288;
var FIT_EPS = 1e-3;
function nextTab(x, tabs, defaultTab, hangingStop, rightLimit) {
  let best;
  for (const t of tabs) {
    if (t.val === "bar") continue;
    if (t.pos > x + 0.5) {
      best = { pos: t.pos, tab: t };
      break;
    }
  }
  if (hangingStop !== void 0 && hangingStop > x + 0.5 && (!best || hangingStop < best.pos)) {
    best = { pos: hangingStop };
  }
  if (best) return best;
  const lastCustom = tabs.length ? Math.max(...tabs.map((t) => t.pos)) : -Infinity;
  const from = Math.max(x, lastCustom);
  const dts = defaultTab > 0 ? defaultTab : 720;
  let pos = (Math.floor(from / dts + 1e-6) + 1) * dts;
  if (pos <= x + 0.5) pos += dts;
  void rightLimit;
  return { pos };
}
function moreTabs(gs, i) {
  for (let k = i + 1; k < gs.length; k++) {
    const q = gs[k];
    if (q.kind === "tab") return true;
    if (q.kind === "lb" || q.kind === "pb" || q.kind === "cb") return false;
  }
  return false;
}
function lineBox(asc, desc, p, textNat, grid) {
  const nat = asc + desc;
  if (p.lineRule === "exact") {
    const h2 = p.line;
    return { height: h2, baseline: h2 * 0.8 };
  }
  if (grid && grid > 0) {
    const g = Math.max(1, Math.ceil((nat - 1) / grid)) * grid;
    const gBase = (g - nat) / 2 + asc;
    if (p.lineRule === "atLeast") {
      const h3 = Math.max(g, p.line);
      return { height: h3, baseline: h3 - g + gBase };
    }
    const h2 = Math.max(grid * p.line / 240, g);
    return { height: h2, baseline: (h2 - nat) / 2 + asc };
  }
  if (p.lineRule === "atLeast") {
    const h2 = Math.max(nat, p.line);
    return { height: h2, baseline: h2 - desc };
  }
  const extra = (p.line / 240 - 1) * (textNat ?? nat);
  const h = nat + extra;
  return { height: h, baseline: extra >= 0 ? asc : asc * (h / nat) };
}
var LineBreaker = class {
  constructor(ctx, p, grid) {
    this.ctx = ctx;
    this.p = p;
    this.grid = grid;
  }
  ctx;
  p;
  grid;
  pos = 0;
  lineIdx = 0;
  /** quebra de linha (w:br) no FIM do parágrafo: a marca de parágrafo vai
   *  para uma linha vazia própria (Word) */
  trailingBreak = false;
  /** linhas seguidas terminadas em hífen (w:consecutiveHyphenLimit) */
  hyphenRun = 0;
  done() {
    return this.pos >= this.p.glyphs.length && this.lineIdx > 0 && !this.trailingBreak;
  }
  /** Estado antes de uma linha (para refazê-la noutro quadro). */
  /** largura da próxima palavra (até o 1º ponto de quebra): o vão ao lado de um
   *  objeto só recebe texto se ela cabe nele (oráculo wrapsides) */
  peekWordWidth() {
    const gs = this.p.glyphs;
    let w = 0;
    for (let e = this.pos; e < gs.length; e++) {
      const q = gs[e];
      if (q.kind === "space" || q.kind === "tab" || q.kind === "lb" || q.kind === "pb" || q.kind === "cb") break;
      if (q.kind === "obj" && q.adv === 0) continue;
      w += q.kind === "shy" ? 0 : q.adv;
      if (q.breakAfter) break;
    }
    return w + (this.indentFirst() ? Math.max(0, this.p.firstLine) : 0);
  }
  /** Linha com o recuo da 1ª linha e o número da lista: a 1ª — ou, no parágrafo que
   *  COMEÇA com quebra de coluna, a que vem depois dela, na coluna seguinte (a linha da
   *  quebra fica sem os dois — oráculo brfirst, corpus t70). */
  indentFirst() {
    return this.lineIdx === (this.p.glyphs[0]?.kind === "cb" && this.p.glyphs.length > 1 ? 1 : 0);
  }
  mark() {
    return { pos: this.pos, lineIdx: this.lineIdx, trailingBreak: this.trailingBreak, hyphenRun: this.hyphenRun };
  }
  reset(m) {
    this.pos = m.pos;
    this.lineIdx = m.lineIdx;
    this.trailingBreak = m.trailingBreak;
    this.hyphenRun = m.hyphenRun;
  }
  /** Borda direita do teste "cabe" (x relativo ao quadro): o Word converte a largura da
   *  coluna/célula (borda direita + recuo direito) e cada recuo para 1/4096 pt
   *  separadamente, arredondando — oráculo emwidth. */
  fitRight(frame, xStart, first) {
    if (this.ctx.opts.advanceRound !== "word" || this.ctx.opts.advanceEm === "device") return frame.right;
    const p = this.p, q = toWordUnit;
    return xStart + q(frame.right + p.indRight) - q(p.indRight) - q(frame.left - p.indLeft) - q(p.indLeft) - (first ? q(p.firstLine) : 0);
  }
  /** Próxima linha no quadro dado. `frame` já desconta recuos do parágrafo. */
  next(frame) {
    const p = this.p;
    const gs = p.glyphs;
    const indFirst = this.indentFirst();
    const start = this.pos;
    const xStart = frame.left + (indFirst ? p.firstLine : 0);
    let right = frame.right;
    let rightQ = this.fitRight(frame, xStart, indFirst);
    const placed = [];
    let x = xStart;
    let markerPlaced;
    const defaultTab = this.ctx.fmt.settings.defaultTabStop;
    const hangingStop = indFirst && p.firstLine < 0 ? frame.left : void 0;
    if (indFirst && p.marker) {
      const mk = p.marker;
      let mx = xStart;
      if (mk.jc === "right") mx -= mk.width;
      else if (mk.jc === "center") mx -= mk.width / 2;
      markerPlaced = [];
      for (const g of mk.glyphs) {
        markerPlaced.push({ g, x: mx, w: g.adv });
        mx += g.adv;
      }
      x = Math.max(mx, xStart);
      if (mk.suff === "tab") {
        const xe = x - 0.5 - 1e-3;
        let ns = nextTab(xe, p.tabs, defaultTab, frame.left > xe + 0.5 ? frame.left : void 0, right);
        if (this.ctx.fmt.settings.compat["doNotUseIndentAsNumberingTabStop"] && this.ctx.fmt.settings.compatibilityMode < 15) {
          const plain = nextTab(xe, p.tabs, defaultTab, void 0, right);
          ns = frame.left > xe + 0.5 && frame.left < plain.pos ? { pos: frame.left } : plain;
        }
        x = ns.pos;
      } else if (mk.suff === "space") {
        x += advanceTwips(this.ctx, mk.glyphs[0]?.face ?? p.markFace, 32, mk.glyphs[0]?.sizePt ?? p.markStyle.sizePt);
      }
    }
    let i = start;
    let lastBreak = -1;
    const justify = (p.jc === "both" || p.jc === "distribute") && this.ctx.fmt.settings.compatibilityMode >= 15;
    const shrink = this.ctx.opts.justifyShrink;
    let spacesW = 0;
    let nSpaces = 0;
    let segWord = false;
    let lastGapW = 0;
    let lastGapSp = 0;
    let unitX = xStart, unitSpacesW = 0, unitGapW = 0, unitGapSp = 0;
    let feShrinkW = 0;
    let wordOk = false;
    let squeezed = false;
    let prevWasGap = true;
    let widthAtBreak = 0;
    let contentEnd = xStart;
    let pendTab = null;
    let breakAfter;
    let clearAfter = false;
    let gapTab;
    let spanned = false;
    let pastMargin = false;
    let forced = false;
    let hyphAt = -1, hyphW = 0, endedHyphen = false;
    const closePending = () => {
      if (!pendTab) return;
      const pt = placed[pendTab.idx];
      const segW = x - pendTab.segStart;
      let shift = 0;
      const avail2 = pendTab.pos - pendTab.startX;
      if (pendTab.tab.val === "right") shift = Math.max(0, avail2 - segW);
      else if (pendTab.tab.val === "center") shift = Math.max(0, avail2 - segW / 2);
      else if (pendTab.tab.val === "decimal") {
        const dx2 = pendTab.decimalSeen ? pendTab.decimalX - pendTab.segStart : segW;
        shift = Math.max(0, avail2 - dx2);
      }
      pt.w = shift;
      for (let k = pendTab.idx + 1; k < placed.length; k++) placed[k].x += shift;
      x += shift;
      if (contentEnd > pendTab.segStart) contentEnd += shift;
      pendTab = null;
    };
    for (; i < gs.length; i++) {
      const g = gs[i];
      if (hyphAt >= 0 && i > hyphAt) {
        const kg = gs[hyphAt];
        if (kg.kind === "shy") placed[placed.length - 1].w = hyphW;
        else placed.push({ g: { ...kg, kind: "shy", ch: "", cp: 173, adv: 0, hyph: false, autoHyphen: true, offset: kg.offset + kg.ch.length }, x, w: hyphW });
        contentEnd = x + hyphW;
        endedHyphen = kg.kind !== "shy";
        pendTab = null;
        break;
      }
      if (g.kind === "lb" || g.kind === "pb" || g.kind === "cb") {
        closePending();
        placed.push({ g, x, w: 0 });
        i++;
        forced = true;
        if (g.kind === "pb") {
          breakAfter = "page";
          let j = i;
          while (j < gs.length && gs[j].kind === "obj" && gs[j].adv === 0 && gs[j].hr === void 0) j++;
          if (j > i && j >= gs.length) for (; i < j; i++) placed.push({ g: gs[i], x, w: 0 });
        } else if (g.kind === "cb") breakAfter = "column";
        else if (g.clear) clearAfter = true;
        break;
      }
      if (g.hr !== void 0) {
        if (placed.some((q) => q.g.kind !== "obj" || q.g.adv > 0 || q.g.hr !== void 0)) break;
        placed.push({ g, x, w: 0 });
        i++;
        break;
      }
      if (g.kind === "tab") {
        closePending();
        let pos;
        let tab;
        if (g.ptab) {
          const width2 = right - frame.left;
          pos = g.ptab.alignment === "center" ? frame.left + width2 / 2 : g.ptab.alignment === "right" ? right : frame.left;
          tab = { val: g.ptab.alignment === "center" ? "center" : g.ptab.alignment === "right" ? "right" : "left", pos, ...g.ptab.leader && g.ptab.leader !== "none" ? { leader: g.ptab.leader } : {} };
        } else ({ pos, tab } = nextTab(x, p.tabs, defaultTab, hangingStop, right));
        if (frame.gap && !g.ptab && pos > right + 0.5 && moreTabs(gs, i)) {
          const nx = frame.next && !spanned ? nextTab(frame.next.left, p.tabs, defaultTab, hangingStop, frame.next.right) : void 0;
          if (nx && frame.next && nx.pos <= frame.next.right + 0.5) {
            spanned = true;
            x = frame.next.left;
            right = frame.next.right;
            rightQ = this.fitRight({ left: frame.left, right }, xStart, indFirst);
            ({ pos, tab } = nx);
          } else if (i > start) {
            gapTab = "break";
            break;
          } else gapTab = "start";
        }
        if (!g.ptab && tab && (tab.val === "right" || tab.val === "center" || tab.val === "decimal") && this.ctx.fmt.settings.compatibilityMode >= 15 && pos > Math.max(right, right + p.indRight) + 0.5) {
          pos = right;
          tab = { ...tab, val: "right" };
        }
        if (!g.ptab && tab && tab.val !== "right" && tab.val !== "center" && tab.val !== "decimal" && this.ctx.fmt.settings.compatibilityMode >= 15 && pos > right + 0.5) {
          if (i > start) break;
          pos = Math.max(x, right);
        }
        const legacyNoWrap = this.ctx.fmt.settings.compatibilityMode < 15 && p.tabs.some((t) => t.val !== "bar" && t.val !== "clear");
        if (!g.ptab && !tab && !legacyNoWrap && pos > right + 0.5 && i > start) break;
        if (legacyNoWrap && pos > right + 0.5) pastMargin = true;
        const pg = { g, x, w: 0, ...tab?.leader && tab.leader !== "none" ? { leader: tab.leader } : {} };
        placed.push(pg);
        if (tab && (tab.val === "right" || tab.val === "center" || tab.val === "decimal")) {
          pendTab = { idx: placed.length - 1, pos, tab, segStart: x, startX: x, decimalSeen: false, decimalX: 0 };
        } else {
          pg.w = Math.max(0, pos - x);
          x = Math.max(x, pos);
        }
        lastBreak = i > start ? i - 1 : i;
        widthAtBreak = contentEnd - xStart;
        spacesW = 0;
        nSpaces = 0;
        feShrinkW = 0;
        segWord = false;
        lastGapW = 0;
        lastGapSp = 0;
        prevWasGap = true;
        continue;
      }
      if (g.kind === "obj" && g.adv === 0) {
        placed.push({ g, x, w: 0 });
        continue;
      }
      const isGap = g.kind === "space";
      if (!isGap && g.kind !== "shy" && prevWasGap) {
        let e = i, wordW = 0;
        for (; e < gs.length; e++) {
          const q = gs[e];
          if (q.kind === "space" || q.kind === "tab" || q.kind === "lb" || q.kind === "pb" || q.kind === "cb") break;
          if (q.kind === "obj" && q.adv === 0) continue;
          if (q.kind === "shy") continue;
          wordW += q.adv;
          if (q.breakAfter && q.kind !== "char") break;
          if (q.breakAfter) {
            e++;
            break;
          }
        }
        const over = x + wordW - rightQ;
        if (i === start || !(gs[i - 1].kind === "space" && !gs[i - 1].breakAfter)) {
          const gap = i > start && gs[i - 1].kind === "space";
          unitX = x;
          unitSpacesW = spacesW;
          unitGapW = gap ? lastGapW : 0;
          unitGapSp = gap ? lastGapSp : 0;
        }
        wordOk = over <= FIT_EPS;
        const hangW = e > i && gs[e - 1].hang && (justify || this.ctx.fmt.settings.compatibilityMode < 15) ? gs[e - 1].adv : 0;
        if (!wordOk && (hangW > 0 || feShrinkW > 0) && i > start) {
          const paraEnd = gs.slice(e).every((q) => q.kind === "pb" || q.kind === "cb" || q.kind === "obj" && q.adv === 0);
          wordOk = over - hangW <= (hangW > 0 && paraEnd ? 0 : feShrinkW) + FIT_EPS;
        }
        if (!wordOk && justify && lastBreak >= start && i > start) {
          const slack = x + wordW - unitX + unitGapW - over;
          const rest = unitSpacesW - unitGapSp;
          const ov = over - hangW;
          wordOk = nSpaces > 0 && ov <= shrink.ratio * spacesW + 0.0175 && (nSpaces <= 1 || rest <= 0 || ov / spacesW <= shrink.expandRatio * slack / rest + 75e-4 * nSpaces / spacesW);
        }
        if (squeezed && i > start) wordOk = false;
        else if (wordOk && over > FIT_EPS) squeezed = true;
        else if (!wordOk && !pendTab && !pastMargin) {
          const ch = chooseHyphenation(this.ctx, gs, {
            i,
            e,
            x,
            right: rightQ,
            lineStart: lastBreak < start,
            contentEnd: xStart + widthAtBreak,
            justify: p.jc === "both" || p.jc === "distribute",
            spacesW,
            restW: unitSpacesW - unitGapSp,
            nSpaces,
            hyphenRun: this.hyphenRun
          });
          if (ch) {
            hyphAt = ch.k;
            hyphW = ch.w;
            wordOk = true;
          }
        }
        if (this.ctx.opts.onWordFit && over > -2e3) {
          this.ctx.opts.onWordFit({
            over,
            spacesW,
            nSpaces,
            wordW,
            lastGapW,
            justify,
            accepted: wordOk,
            lineStart: start,
            wordStart: i,
            wordEnd: e,
            sizePt: g.sizePt ?? 0,
            family: g.face?.family ?? "",
            compat: this.ctx.fmt.settings.compatibilityMode,
            lineText: gs.slice(start, i).map((q) => q.ch ?? (q.kind === "space" || q.kind === "tab" ? " " : "")).join(""),
            wordText: gs.slice(i, e).map((q) => q.ch ?? "").join("")
          });
        }
      }
      const projected = isGap ? x : x + g.adv;
      if (!isGap && g.kind !== "shy" && !wordOk && !pastMargin && projected > rightQ + FIT_EPS && i > start && pendTab?.tab.val === "right" && this.ctx.fmt.settings.compatibilityMode < 15) pastMargin = true;
      if (!isGap && g.kind !== "shy" && !wordOk && !pastMargin && projected > rightQ + FIT_EPS && i > start && placed.some((q) => q.g.kind !== "obj" || q.g.adv > 0)) {
        if (lastBreak >= start) {
          const keep = lastBreak + 1;
          while (placed.length && placed[placed.length - 1].g !== gs[lastBreak]) placed.pop();
          i = keep;
          contentEnd = xStart + widthAtBreak;
          pendTab = null;
          break;
        }
        if (!g.glue) break;
      }
      if (g.kind === "shy") {
        placed.push({ g, x, w: 0 });
        continue;
      }
      placed.push({ g, x, w: g.adv });
      if (isGap) {
        if (!prevWasGap) {
          lastGapW = 0;
          lastGapSp = 0;
        }
        lastGapW += g.adv;
        if (segWord && !FIXED_SPACE(g.cp) && !g.fixed) {
          spacesW += g.adv;
          nSpaces++;
          lastGapSp += g.adv;
          feShrinkW += g.feShrink ?? 0;
        }
      } else segWord = true;
      prevWasGap = isGap || !!g.breakAfter;
      if (pendTab?.tab.val === "decimal" && !pendTab.decimalSeen && (g.ch === "," || g.ch === ".")) {
        pendTab.decimalSeen = true;
        pendTab.decimalX = x;
      }
      x += g.adv;
      if (!isGap) contentEnd = x;
      if (g.breakAfter) {
        lastBreak = i;
        widthAtBreak = (isGap ? contentEnd : x) - xStart;
      }
    }
    closePending();
    let width = 0;
    for (const pg of placed) {
      if (pg.g.kind === "obj" && pg.g.adv === 0) continue;
      if (pg.g.kind !== "space" && pg.g.kind !== "lb" && pg.g.kind !== "pb" && pg.g.kind !== "cb") {
        width = Math.max(width, pg.x + pg.w - xStart);
      }
    }
    this.pos = Math.min(gs.length, i);
    if (this.pos === start && start < gs.length) this.pos = start + 1;
    this.hyphenRun = endedHyphen ? this.hyphenRun + 1 : 0;
    let lkI = placed.length - 1;
    while (lkI > 0 && placed[lkI].g.kind === "obj" && placed[lkI].g.adv === 0 && placed[lkI].g.hr === void 0) lkI--;
    const lk = placed[lkI]?.g.kind === "pb" ? "pb" : placed[placed.length - 1]?.g.kind;
    const splitPg = this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat["splitPgBreakAndParaMark"];
    this.trailingBreak = forced && this.pos >= gs.length && (lk === "lb" || lk === "cb" || lk === "pb" && splitPg);
    const last = this.pos >= gs.length && !this.trailingBreak;
    this.lineIdx++;
    let asc = 0, desc = 0, tAsc = 0, tDesc = 0;
    let oAsc = 0, oDesc = 0;
    const content = placed.filter((pg) => pg.g.kind !== "obj" || pg.g.adv > 0);
    const withObj = content.some((pg) => pg.g.kind === "obj");
    for (const pg of content) {
      if (pg.g.kind === "pb" || pg.g.kind === "cb") continue;
      if (pg.g.kind === "lb" && withObj) continue;
      if (pg.g.ch === " " || pg.g.kind === "tab") continue;
      asc = Math.max(asc, pg.g.asc);
      desc = Math.max(desc, pg.g.desc);
      if (pg.g.kind !== "obj") {
        tAsc = Math.max(tAsc, pg.g.nAsc ?? pg.g.asc);
        tDesc = Math.max(tDesc, pg.g.nDesc ?? pg.g.desc);
      } else if (pg.g.kind === "obj") {
        const om = faceMetrics(pg.g.face.font);
        oAsc = Math.max(oAsc, om.ascent * pg.g.sizePt * 20);
        oDesc = Math.max(oDesc, om.descent * pg.g.sizePt * 20);
        if (pg.g.style.underline && pg.g.style.underline.val !== "none") desc = Math.max(desc, om.descent * pg.g.sizePt * 20);
      }
    }
    if (tAsc + tDesc === 0 && oAsc > 0) asc = Math.max(asc, oAsc + oDesc - desc);
    for (const pg of placed) {
      if (pg.g.hr === void 0) continue;
      const om = faceMetrics(pg.g.face.font);
      const fa = om.ascent * pg.g.sizePt * 20, fd = om.descent * pg.g.sizePt * 20;
      tAsc = Math.max(tAsc, fa);
      tDesc = Math.max(tDesc, fd);
      desc = Math.max(desc, fd);
      asc = Math.max(asc, fa, pg.g.hr + 100 - desc);
    }
    if (!last && asc === 0 && desc === 0 && content.some((pg) => pg.g.kind === "tab") && content.every((pg) => pg.g.kind === "tab" || pg.g.ch === " ")) {
      for (const pg of content) {
        if (pg.g.kind !== "tab") continue;
        asc = Math.max(asc, pg.g.asc);
        desc = Math.max(desc, pg.g.desc);
        tAsc = Math.max(tAsc, pg.g.nAsc ?? pg.g.asc);
        tDesc = Math.max(tDesc, pg.g.nDesc ?? pg.g.desc);
      }
    }
    const emptyLine = asc === 0 && desc === 0;
    if (emptyLine) {
      const mm = faceMetrics(p.markFace.font);
      const va = p.markStyle.rpr.vertAlign;
      const sz3 = (va === "superscript" || va === "subscript" ? (p.markStyle.rpr.sz ?? 20) / 2 : p.markStyle.sizePt) * 20;
      const sh = va ? 0 : p.markStyle.shift;
      const [ea, ed] = shadowExtent(p.markStyle);
      asc = Math.max(0, mm.ascent * sz3 + ea + sh);
      desc = Math.max(0, mm.descent * sz3 + ed - sh);
    }
    if (tAsc + tDesc === 0) {
      const mm = faceMetrics(p.markFace.font);
      tAsc = oAsc || (emptyLine ? asc : mm.ascent * p.markStyle.sizePt * 20);
      tDesc = oAsc ? oDesc : emptyLine ? desc : mm.descent * p.markStyle.sizePt * 20;
    }
    if (markerPlaced) for (const pg of markerPlaced) asc = Math.max(asc, pg.g.asc);
    const box = lineBox(asc, desc, p, tAsc + tDesc > 0 ? tAsc + tDesc : void 0, this.grid);
    const avail = right - xStart;
    let dx = 0;
    const jc = p.jc;
    let lastC;
    for (const pg of placed) if (pg.g.kind !== "space" && pg.g.kind !== "lb" && pg.g.kind !== "pb" && pg.g.kind !== "cb") lastC = pg;
    const alignW = lastC?.g.hang && width > avail + FIT_EPS ? width - lastC.w : width;
    const justified = (jc === "both" || jc === "distribute") && (!last || jc === "distribute") && breakAfter === void 0;
    if (!justified && alignW > avail + FIT_EPS) {
      const sh = placed.filter((pg) => pg.g.feShrink && pg.x < (lastC?.x ?? 0));
      const total = sh.reduce((a, pg) => a + pg.g.feShrink, 0);
      if (total > 0) {
        const f = Math.min(1, (alignW - avail) / total);
        let acc = 0;
        for (const pg of placed) {
          pg.x -= acc;
          if (pg.g.feShrink && sh.includes(pg)) {
            pg.w -= pg.g.feShrink * f;
            acc += pg.g.feShrink * f;
          }
        }
      }
    }
    if (jc === "center") dx = (avail - alignW) / 2;
    else if (jc === "right") dx = avail - alignW;
    else if (justified) {
      let lastTab = -1;
      placed.forEach((pg, k) => {
        if (pg.g.kind === "tab") lastTab = k;
      });
      let lastContent = -1;
      placed.forEach((pg, k) => {
        if (pg.g.kind !== "space" && pg.g.kind !== "lb") lastContent = k;
      });
      let firstContent = placed.length;
      for (let k = lastTab + 1; k < placed.length; k++) if (placed[k].g.kind !== "space") {
        firstContent = k;
        break;
      }
      const spaces = placed.filter((pg, k) => k > firstContent && k < lastContent && pg.g.kind === "space" && !FIXED_SPACE(pg.g.cp) && !pg.g.fixed);
      const extra = avail - alignW;
      if (spaces.length && (extra > 0 || extra < 0)) {
        const each = extra / spaces.length;
        let acc = 0;
        for (let k = 0; k < placed.length; k++) {
          const pg = placed[k];
          pg.x += acc;
          if (spaces.includes(pg)) {
            pg.w += each;
            acc += each;
          }
        }
      }
    }
    if (dx > 0 || dx < 0) {
      for (const pg of placed) pg.x += dx;
      if (markerPlaced && jc !== "left") for (const pg of markerPlaced) pg.x += dx;
    }
    return {
      start,
      end: this.pos,
      placed,
      ...markerPlaced ? { marker: markerPlaced } : {},
      width,
      xStart: xStart + Math.max(0, dx),
      asc,
      desc,
      height: box.height,
      baseline: box.baseline,
      ...breakAfter ? { breakAfter } : {},
      ...clearAfter ? { clear: true } : {},
      ...gapTab ? { gapTab } : {},
      ...spanned ? { spanned: true } : {},
      last
    };
  }
};

// ../docx-layout/src/picture.ts
var EMU_PT = 12700;
function color(c, theme) {
  if (!c) return void 0;
  const { spec, alpha } = dmlColorSpec(c);
  const hex = resolveDrawingColor(spec, theme);
  return hex ? { color: hex, alpha } : void 0;
}
function pictureLook(im, theme) {
  const f = im.format;
  if (!f) return void 0;
  const out = {};
  if (f.geom && f.geom !== "rect" && f.geom !== "custom") out.geom = { prst: f.geom, ...f.adj ? { adj: f.adj } : {} };
  const ln = f.line;
  if (ln && ln.fill) {
    const c = color(ln.fill, theme);
    if (c) {
      out.line = { color: c.color, alpha: c.alpha, widthPt: (ln.w ?? 9525) / EMU_PT };
      if (ln.dash && ln.dash !== "solid") out.line.dash = ln.dash;
      if (ln.cmpd && ln.cmpd !== "sng") out.line.cmpd = ln.cmpd;
      if (ln.cap) out.line.cap = ln.cap;
      if (ln.join) out.line.join = ln.join;
    }
  }
  const fx = f.effects;
  const s = fx.shadow;
  if (s && (s.kind === "outer" || s.kind === "inner")) {
    const c = color(s.color, theme);
    if (c) {
      out.shadow = {
        kind: s.kind,
        color: c.color,
        alpha: c.alpha,
        blurPt: (s.blurRad ?? 0) / EMU_PT,
        distPt: (s.dist ?? 0) / EMU_PT,
        dirDeg: (s.dir ?? 0) / 6e4,
        ...s.sx !== void 0 ? { sx: s.sx / 1e5 } : {},
        ...s.sy !== void 0 ? { sy: s.sy / 1e5 } : {},
        ...s.kx ? { kxDeg: s.kx / 6e4 } : {},
        ...s.ky ? { kyDeg: s.ky / 6e4 } : {},
        ...s.algn ? { algn: s.algn } : {},
        ...s.rotWithShape !== void 0 ? { rotWithShape: s.rotWithShape } : {}
      };
    }
  }
  if (fx.glow) {
    const c = color(fx.glow.color, theme);
    if (c) out.glow = { color: c.color, alpha: c.alpha, radPt: fx.glow.rad / EMU_PT };
  }
  if (fx.softEdge) out.softEdgePt = fx.softEdge / EMU_PT;
  const td = f.threeD;
  if (td?.bevelT && (!td.camera || td.camera.prst === "orthographicFront") && !td.camera?.rot) {
    out.bevel = {
      wPt: (td.bevelT.w ?? 76200) / EMU_PT,
      hPt: (td.bevelT.h ?? 76200) / EMU_PT,
      ...td.bevelT.prst ? { prst: td.bevelT.prst } : {},
      ...td.lightRig ? { rig: td.lightRig.rig, dir: td.lightRig.dir } : {},
      ...td.prstMaterial ? { material: td.prstMaterial } : {}
    };
  }
  const r = fx.reflection;
  if (r) {
    out.reflection = {
      blurPt: (r.blurRad ?? 0) / EMU_PT,
      stA: (r.stA ?? 1e5) / 1e5,
      stPos: (r.stPos ?? 0) / 1e5,
      endA: (r.endA ?? 0) / 1e5,
      endPos: (r.endPos ?? 1e5) / 1e5,
      distPt: (r.dist ?? 0) / EMU_PT,
      dirDeg: (r.dir ?? 54e5) / 6e4,
      sy: (r.sy ?? 1e5) / 1e5,
      ...r.algn ? { algn: r.algn } : {},
      ...r.rotWithShape !== void 0 ? { rotWithShape: r.rotWithShape } : {}
    };
  }
  Object.assign(out, blipLook(f.blip, theme));
  return Object.keys(out).length ? out : void 0;
}
function blipLook(b, theme) {
  const out = {};
  if (b.alphaModFix !== void 0 && b.alphaModFix < 1e5) out.alpha = b.alphaModFix / 1e5;
  if (b.duotone) {
    const c0 = color(b.duotone[0], theme), c1 = color(b.duotone[1], theme);
    if (c0 && c1) out.duotone = [c0.color, c1.color];
  }
  if (b.clrChange) {
    const from = color(b.clrChange.from, theme), to = color(b.clrChange.to, theme);
    if (from && to) out.clrChange = { from: from.color, to: to.color, toAlpha: to.alpha };
  }
  return out;
}
function applyBlipFx(d, b, theme) {
  const fx = blipFxImageEffects(b);
  if (fx) applyImageEffects(d, fx);
  applyPictureAdjust(d, blipLook(b, theme));
}

// ../docx-layout/src/emf.ts
var IDENT = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
var mul = (m, n) => ({
  a: m.a * n.a + m.b * n.c,
  b: m.a * n.b + m.b * n.d,
  c: m.c * n.a + m.d * n.c,
  d: m.c * n.b + m.d * n.d,
  e: m.e * n.a + m.f * n.c + n.e,
  f: m.e * n.b + m.f * n.d + n.f
});
var colorOf = (v) => [v & 255, v >> 8 & 255, v >> 16 & 255].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
var STOCK = {
  0: { kind: "brush", brush: { style: 0, color: "FFFFFF" } },
  1: { kind: "brush", brush: { style: 0, color: "C0C0C0" } },
  2: { kind: "brush", brush: { style: 0, color: "808080" } },
  3: { kind: "brush", brush: { style: 0, color: "404040" } },
  4: { kind: "brush", brush: { style: 0, color: "000000" } },
  5: { kind: "brush", brush: { style: 1, color: "000000" } },
  6: { kind: "pen", pen: { style: 0, width: 0, color: "FFFFFF" } },
  7: { kind: "pen", pen: { style: 0, width: 0, color: "000000" } },
  8: { kind: "pen", pen: { style: 5, width: 0, color: "000000" } },
  13: { kind: "font", font: { height: -12, weight: 400, italic: false, underline: false, strike: false, face: "Arial", escapement: 0 } },
  17: { kind: "font", font: { height: -11, weight: 400, italic: false, underline: false, strike: false, face: "Segoe UI", escapement: 0 } }
};
function isEmf(b) {
  return b.length > 44 && b[0] === 1 && b[1] === 0 && b[2] === 0 && b[3] === 0 && b[40] === 32 && b[41] === 69 && b[42] === 77 && b[43] === 70;
}
function renderEmf(ctx, bytes, dest) {
  const out = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i32 = (o) => dv.getInt32(o, true);
  const u32 = (o) => dv.getUint32(o, true);
  const i16 = (o) => dv.getInt16(o, true);
  const u16 = (o) => dv.getUint16(o, true);
  if (!isEmf(bytes)) return out;
  const frame = [i32(24), i32(28), i32(32), i32(36)];
  const devPx = [i32(72), i32(76)];
  const devMm = [i32(80), i32(84)];
  const pxPerHmmX = devPx[0] / Math.max(1, devMm[0] * 100);
  const pxPerHmmY = devPx[1] / Math.max(1, devMm[1] * 100);
  const fx0 = frame[0] * pxPerHmmX, fy0 = frame[1] * pxPerHmmY;
  const fw = Math.max(1e-6, (frame[2] - frame[0]) * pxPerHmmX), fh = Math.max(1e-6, (frame[3] - frame[1]) * pxPerHmmY);
  const sx = dest.w / fw, sy = dest.h / fh;
  const twipsPerDevPx = devMm[0] * 100 / Math.max(1, devPx[0]) * (1440 / 2540);
  let dc = {
    mapMode: 1,
    winOrg: [0, 0],
    winExt: [1, 1],
    vpOrg: [0, 0],
    vpExt: [1, 1],
    world: IDENT,
    pen: STOCK[7].pen,
    brush: STOCK[0].brush,
    font: STOCK[13].font,
    textColor: "000000",
    bkColor: "FFFFFF",
    bkMode: 2,
    textAlign: 0,
    polyFill: 1,
    cur: [0, 0]
  };
  const stack = [];
  const objs = /* @__PURE__ */ new Map();
  const mapScale = () => {
    switch (dc.mapMode) {
      case 2:
        return [0.1 * pxPerHmmX * 10, -0.1 * pxPerHmmY * 10];
      // LOMETRIC: 0,1 mm
      case 3:
        return [0.01 * pxPerHmmX * 100 / 1, -0.01 * pxPerHmmY * 100];
      // HIMETRIC
      case 4:
        return [0.254 * pxPerHmmX * 100, -0.254 * pxPerHmmY * 100];
      // LOENGLISH 0,01"
      case 5:
        return [0.0254 * pxPerHmmX * 100, -0.0254 * pxPerHmmY * 100];
      // HIENGLISH
      case 6:
        return [25.4 / 1440 * pxPerHmmX * 100, -(25.4 / 1440) * pxPerHmmY * 100];
      // TWIPS
      case 7:
      case 8:
        return [dc.vpExt[0] / (dc.winExt[0] || 1), dc.vpExt[1] / (dc.winExt[1] || 1)];
      default:
        return [1, 1];
    }
  };
  const toDev = (x, y) => {
    const w = dc.world;
    const wx = x * w.a + y * w.c + w.e, wy = x * w.b + y * w.d + w.f;
    const [kx, ky] = mapScale();
    let s = [kx, ky];
    if (dc.mapMode === 7) {
      const k = Math.min(Math.abs(kx), Math.abs(ky));
      s = [Math.sign(kx) * k, Math.sign(ky) * k];
    }
    return [(wx - dc.winOrg[0]) * s[0] + dc.vpOrg[0], (wy - dc.winOrg[1]) * s[1] + dc.vpOrg[1]];
  };
  const toPage = (x, y) => {
    const [dx, dy] = toDev(x, y);
    return [dest.x + (dx - fx0) * sx, dest.y + (dy - fy0) * sy];
  };
  const lenTw = (logical) => {
    const [kx] = mapScale();
    const w = dc.world;
    return Math.abs(logical * Math.hypot(w.a, w.b) * kx) * sx;
  };
  let path = null;
  const emitPath = (cmds, fill, stroke) => {
    if (!cmds.length) return;
    const f = fill && dc.brush.style !== 1 ? dc.brush.color : void 0;
    const pen = dc.pen;
    const st = stroke && pen.style !== 5 ? { color: pen.color, widthPt: Math.max(0.25, lenTw(pen.width || 1) / 20), ...pen.style >= 1 && pen.style <= 4 ? { dash: "dashed" } : {} } : void 0;
    if (!f && !st) return;
    out.push({ t: "path", cmds, ...f ? { fill: f } : {}, ...st ? { stroke: st } : {}, ...dc.polyFill === 1 ? { evenOdd: true } : {} });
  };
  const draw = (cmds, closed) => {
    if (path) {
      path.push(...cmds);
      return;
    }
    emitPath(cmds, closed, true);
  };
  const pts16 = (o, n) => Array.from({ length: n }, (_, k) => [i16(o + k * 4), i16(o + k * 4 + 2)]);
  const pts32 = (o, n) => Array.from({ length: n }, (_, k) => [i32(o + k * 8), i32(o + k * 8 + 4)]);
  const poly2 = (pts, closed, cont = false) => {
    const c = [];
    pts.forEach(([x, y], k) => {
      const [px, py] = toPage(x, y);
      c.push({ op: k === 0 && !cont ? "M" : "L", x: px, y: py });
    });
    if (closed) c.push({ op: "Z" });
    return c;
  };
  const bezier = (pts, startWithMove) => {
    const c = [];
    let k = 0;
    if (startWithMove) {
      const [x, y] = toPage(pts[0][0], pts[0][1]);
      c.push({ op: "M", x, y });
      k = 1;
    }
    for (; k + 2 < pts.length + (startWithMove ? 0 : 0); k += 3) {
      const a = toPage(...pts[k]), b = toPage(...pts[k + 1]), d = toPage(...pts[k + 2]);
      c.push({ op: "C", x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: d[0], y: d[1] });
    }
    return c;
  };
  const rect2 = (l, t, r, b) => poly2([[l, t], [r, t], [r, b], [l, b]], true);
  const ellipse = (l, t, r, b) => {
    const K4 = 0.5523;
    const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
    const P = (x, y) => toPage(x, y);
    const p0 = P(cx + rx, cy);
    const seg = (x1, y1, x2, y2, x, y) => {
      const a = P(x1, y1), b2 = P(x2, y2), d = P(x, y);
      return { op: "C", x1: a[0], y1: a[1], x2: b2[0], y2: b2[1], x: d[0], y: d[1] };
    };
    return [
      { op: "M", x: p0[0], y: p0[1] },
      seg(cx + rx, cy + ry * K4, cx + rx * K4, cy + ry, cx, cy + ry),
      seg(cx - rx * K4, cy + ry, cx - rx, cy + ry * K4, cx - rx, cy),
      seg(cx - rx, cy - ry * K4, cx - rx * K4, cy - ry, cx, cy - ry),
      seg(cx + rx * K4, cy - ry, cx + rx, cy - ry * K4, cx + rx, cy),
      { op: "Z" }
    ];
  };
  const dib = (off, cbBmi, offBits, cbBits, premul = false) => {
    if (!cbBmi || !cbBits || off + cbBmi > bytes.length || offBits + cbBits > bytes.length) return null;
    const build = (hdr) => {
      const b = new Uint8Array(14 + hdr + cbBits);
      b[0] = 66;
      b[1] = 77;
      const v = new DataView(b.buffer);
      v.setUint32(2, b.length, true);
      v.setUint32(10, 14 + hdr, true);
      b.set(bytes.subarray(off, off + cbBmi), 14);
      b.set(bytes.subarray(offBits, offBits + cbBits), 14 + hdr);
      return [b, v];
    };
    let [bmp, bv] = build(cbBmi);
    if (premul && bv.getUint16(14 + 14, true) === 32) {
      const hdr = Math.max(cbBmi, 56);
      [bmp, bv] = build(hdr);
      bv.setUint32(14, hdr, true);
      bv.setUint32(14 + 16, 3, true);
      bv.setUint32(14 + 40, 16711680, true);
      bv.setUint32(14 + 44, 65280, true);
      bv.setUint32(14 + 48, 255, true);
      bv.setUint32(14 + 52, 4278190080, true);
      for (let k = 14 + hdr; k + 3 < bmp.length; k += 4) {
        const a = bmp[k + 3];
        if (a > 0 && a < 255) for (let c = 0; c < 3; c++) bmp[k + c] = Math.min(255, Math.round(bmp[k + c] * 255 / a));
      }
    }
    return { data: bmp, ext: "bmp", widthTwips: 0, heightTwips: 0 };
  };
  const plus = emfPlusOnly(bytes) ? new EmfPlusPlayer(bytes, (img, x0, y0, x1, y1, crop) => {
    const [px0, py0] = [dest.x + (x0 - fx0) * sx, dest.y + (y0 - fy0) * sy];
    const [px1, py1] = [dest.x + (x1 - fx0) * sx, dest.y + (y1 - fy0) * sy];
    out.push({
      t: "image",
      x: Math.min(px0, px1),
      y: Math.min(py0, py1),
      w: Math.abs(px1 - px0),
      h: Math.abs(py1 - py0),
      image: img,
      ...crop ? { crop } : {},
      ...px1 < px0 ? { flipH: true } : {},
      ...py1 < py0 ? { flipV: true } : {}
    });
  }) : null;
  const rasterText = !plus && emfRastersDest(bytes);
  let pos = 0;
  let guard = 0;
  while (pos + 8 <= bytes.length && guard++ < 2e5) {
    const type = u32(pos), size = u32(pos + 4);
    if (size < 8 || pos + size > bytes.length) break;
    const r = pos + 8;
    if (plus) {
      if (type === 70 && size >= 16 && u32(r + 4) === EMF_PLUS) plus.play(r + 8, Math.min(pos + size, r + 4 + u32(r)));
      if (type === 14) break;
      pos += size;
      continue;
    }
    switch (type) {
      case 14:
        pos = bytes.length;
        continue;
      // EOF
      case 17:
        dc.mapMode = u32(r);
        break;
      case 9:
        dc.winExt = [i32(r), i32(r + 4)];
        break;
      case 10:
        dc.winOrg = [i32(r), i32(r + 4)];
        break;
      case 11:
        dc.vpExt = [i32(r), i32(r + 4)];
        break;
      case 12:
        dc.vpOrg = [i32(r), i32(r + 4)];
        break;
      case 35: {
        dc.world = { a: dv.getFloat32(r, true), b: dv.getFloat32(r + 4, true), c: dv.getFloat32(r + 8, true), d: dv.getFloat32(r + 12, true), e: dv.getFloat32(r + 16, true), f: dv.getFloat32(r + 20, true) };
        break;
      }
      case 36: {
        const m = { a: dv.getFloat32(r, true), b: dv.getFloat32(r + 4, true), c: dv.getFloat32(r + 8, true), d: dv.getFloat32(r + 12, true), e: dv.getFloat32(r + 16, true), f: dv.getFloat32(r + 20, true) };
        const mode = u32(r + 24);
        dc.world = mode === 1 ? IDENT : mode === 2 ? mul(m, dc.world) : mode === 3 ? mul(dc.world, m) : m;
        break;
      }
      case 33:
        stack.push({ ...dc, winOrg: [...dc.winOrg], winExt: [...dc.winExt], vpOrg: [...dc.vpOrg], vpExt: [...dc.vpExt], cur: [...dc.cur] });
        break;
      case 34: {
        let n = i32(r);
        let s;
        while (n < 0 && stack.length) {
          s = stack.pop();
          n++;
        }
        if (s) dc = s;
        break;
      }
      case 18:
        dc.bkMode = u32(r);
        break;
      case 19:
        dc.polyFill = u32(r);
        break;
      case 22:
        dc.textAlign = u32(r);
        break;
      case 24:
        dc.textColor = colorOf(u32(r));
        break;
      case 25:
        dc.bkColor = colorOf(u32(r));
        break;
      case 38:
        objs.set(u32(r), { kind: "pen", pen: { style: u32(r + 4) & 15, width: i32(r + 8), color: colorOf(u32(r + 16)) } });
        break;
      case 95:
        objs.set(u32(r), { kind: "pen", pen: { style: u32(r + 20) & 15, width: u32(r + 24), color: colorOf(u32(r + 32)) } });
        break;
      case 39:
        objs.set(u32(r), { kind: "brush", brush: { style: u32(r + 4), color: colorOf(u32(r + 8)) } });
        break;
      case 82: {
        let face = "";
        for (let k = 0; k < 32; k++) {
          const c = u16(r + 32 + k * 2);
          if (!c) break;
          face += String.fromCharCode(c);
        }
        objs.set(u32(r), { kind: "font", font: { height: i32(r + 4), escapement: i32(r + 12), weight: i32(r + 20), italic: bytes[r + 24] !== 0, underline: bytes[r + 25] !== 0, strike: bytes[r + 26] !== 0, face } });
        break;
      }
      case 37: {
        const h = u32(r);
        const o = h & 2147483648 ? STOCK[h & 2147483647] : objs.get(h);
        if (o?.kind === "pen") dc.pen = o.pen;
        else if (o?.kind === "brush") dc.brush = o.brush;
        else if (o?.kind === "font") dc.font = o.font;
        break;
      }
      case 40:
        objs.delete(u32(r));
        break;
      case 27:
        dc.cur = [i32(r), i32(r + 4)];
        if (path) {
          const [x, y] = toPage(dc.cur[0], dc.cur[1]);
          path.push({ op: "M", x, y });
        }
        break;
      case 54: {
        const to = [i32(r), i32(r + 4)];
        if (path) {
          const [x, y] = toPage(...to);
          path.push({ op: "L", x, y });
        } else draw(poly2([dc.cur, to], false), false);
        dc.cur = to;
        break;
      }
      case 43:
        draw(rect2(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true);
        break;
      case 44:
        draw(rect2(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true);
        break;
      // ROUNDRECT ≈ ret.
      case 42:
        draw(ellipse(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true);
        break;
      case 86:
        draw(poly2(pts16(r + 20, u32(r + 16)), true), true);
        break;
      // POLYGON16
      case 87:
        draw(poly2(pts16(r + 20, u32(r + 16)), false), false);
        break;
      // POLYLINE16
      case 3:
        draw(poly2(pts32(r + 20, u32(r + 16)), true), true);
        break;
      case 4:
        draw(poly2(pts32(r + 20, u32(r + 16)), false), false);
        break;
      case 89:
      case 6: {
        const pts = type === 89 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        if (path) path.push(...poly2(pts, false, true));
        else draw(poly2([dc.cur, ...pts], false), false);
        if (pts.length) dc.cur = pts[pts.length - 1];
        break;
      }
      case 85:
      case 2: {
        const pts = type === 85 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        draw(bezier(pts, true), false);
        break;
      }
      case 88:
      case 5: {
        const pts = type === 88 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        const c = bezier([dc.cur, ...pts], !path);
        if (path) path.push(...c.slice(0));
        else draw(c, false);
        if (pts.length) dc.cur = pts[pts.length - 1];
        break;
      }
      case 91:
      case 8: {
        const n = u32(r + 16);
        const counts = Array.from({ length: n }, (_, k) => u32(r + 24 + k * 4));
        let o = r + 24 + n * 4;
        const cmds = [];
        for (const c of counts) {
          const pts = type === 91 ? pts16(o, c) : pts32(o, c);
          cmds.push(...poly2(pts, true));
          o += c * (type === 91 ? 4 : 8);
        }
        draw(cmds, true);
        break;
      }
      case 90:
      case 7: {
        const n = u32(r + 16);
        const counts = Array.from({ length: n }, (_, k) => u32(r + 24 + k * 4));
        let o = r + 24 + n * 4;
        for (const c of counts) {
          draw(poly2(type === 90 ? pts16(o, c) : pts32(o, c), false), false);
          o += c * (type === 90 ? 4 : 8);
        }
        break;
      }
      case 59:
        path = [];
        break;
      // BEGINPATH
      case 60:
        break;
      // ENDPATH
      case 61:
        path?.push({ op: "Z" });
        break;
      // CLOSEFIGURE
      case 62:
        if (path) emitPath(path, true, false);
        path = null;
        break;
      // FILLPATH
      case 63:
        if (path) emitPath(path, true, true);
        path = null;
        break;
      // STROKEANDFILLPATH
      case 64:
        if (path) emitPath(path, false, true);
        path = null;
        break;
      // STROKEPATH
      case 67:
      case 68:
        path = null;
        break;
      // SELECTCLIPPATH / ABORTPATH
      case 84: {
        const refX = i32(r + 28), refY = i32(r + 32);
        const nChars = u32(r + 36), offStr = u32(r + 40), offDx = u32(r + 64);
        const byGid = (u32(r + 44) & 16) !== 0;
        let text = "";
        for (let k = 0; k < nChars; k++) text += String.fromCharCode(u16(pos + offStr + k * 2));
        if (!byGid && !text.trim()) break;
        if (byGid && !nChars) break;
        const f = dc.font;
        const face = ctx.faces.get(f.face || "Arial", f.weight >= 600, f.italic);
        const fm = face.font.metrics;
        const cell = Math.abs(f.height) || 12;
        const emLog = f.height < 0 ? cell : cell * fm.unitsPerEm / Math.max(1, fm.usWinAscent + fm.usWinDescent);
        const emTw = lenTw(emLog);
        if (emTw < 1) break;
        const sizePt = emTw / 20;
        const [px, py] = toPage(dc.textAlign & 1 ? dc.cur[0] : refX, dc.textAlign & 1 ? dc.cur[1] : refY);
        const ascTw = (fm.usWinAscent || fm.ascender) / fm.unitsPerEm * emTw;
        const descTw = (fm.usWinDescent || -fm.descender) / fm.unitsPerEm * emTw;
        const va = dc.textAlign & 24;
        const baseY = va === 24 ? py : va === 8 ? py - descTw : py + ascTw;
        const dxs = [];
        const gidOf = (k) => byGid ? text.charCodeAt(k) : face.font.glyphId(text.charCodeAt(k));
        for (let k = 0; k < nChars; k++) dxs.push(offDx ? lenTw(i32(pos + offDx + k * 4)) : face.font.advanceWidth(gidOf(k)) * emTw / fm.unitsPerEm);
        const total = dxs.reduce((a, b) => a + b, 0);
        const ha = dc.textAlign & 6;
        let x = ha === 2 ? px - total : ha === 6 ? px - total / 2 : px;
        const glyphs = [];
        for (let k = 0; k < nChars; k++) {
          glyphs.push({ cp: text.charCodeAt(k), x, ...byGid ? { gid: text.charCodeAt(k) } : {} });
          x += dxs[k];
        }
        out.push({ t: "glyphs", face, sizePt, color: dc.textColor, y: baseY, glyphs, text, ...byGid || rasterText ? { asPath: true } : {} });
        break;
      }
      case 76:
      case 77: {
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        const img = cbBmi ? dib(pos + offBmi, cbBmi, pos + offBits, cbBits) : null;
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: "image", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img });
        else {
          const rop3 = u32(r + 32) >>> 16 & 255;
          if ((rop3 === 240 || rop3 === 0 || rop3 === 255) && dc.brush.style !== 1) out.push({ t: "rect", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), fill: dc.brush.color });
        }
        break;
      }
      case 114: {
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const alphaFmt = bytes[r + 35];
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        const img = dib(pos + offBmi, cbBmi, pos + offBits, cbBits, alphaFmt === 1);
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: "image", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img });
        break;
      }
      case 81: {
        const xd = i32(r + 16), yd = i32(r + 20);
        const offBmi = u32(r + 40), cbBmi = u32(r + 44), offBits = u32(r + 48), cbBits = u32(r + 52);
        const cx = i32(r + 64), cy = i32(r + 68);
        const img = dib(pos + offBmi, cbBmi, pos + offBits, cbBits);
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: "image", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img, ...y1 < y0 ? { flipV: true } : {} });
        break;
      }
    }
    pos += size;
  }
  void twipsPerDevPx;
  return out;
}
var EMF_PLUS = 726027589;
function emfRastersDest(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 0;
  for (let guard = 0; pos + 8 <= b.length && guard < 2e5; guard++) {
    const type = dv.getUint32(pos, true), size = dv.getUint32(pos + 4, true);
    if (size < 8 || pos + size > b.length || type === 14) break;
    const at = type === 76 || type === 77 ? 40 : type === 81 ? 68 : -1;
    const withBits = type === 81 || pos + 92 <= b.length && dv.getUint32(pos + 88, true) > 0;
    if (at >= 0 && withBits && pos + at + 4 <= b.length) {
      const rop3 = dv.getUint32(pos + at, true) >>> 16 & 255;
      const usesD = (rop3 & 170) >>> 1 !== (rop3 & 85), usesS = (rop3 & 204) >>> 2 !== (rop3 & 51);
      if (usesD && usesS) return true;
    }
    pos += size;
  }
  return false;
}
function emfPlusOnly(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 0;
  for (let guard = 0; pos + 16 <= b.length && guard < 64; guard++) {
    const type = dv.getUint32(pos, true), size = dv.getUint32(pos + 4, true);
    if (size < 8) return false;
    if (type === 70 && dv.getUint32(pos + 12, true) === EMF_PLUS && pos + 28 <= b.length) {
      return dv.getUint16(pos + 16, true) === 16385 && (dv.getUint16(pos + 18, true) & 1) === 0;
    }
    if (type !== 1) return false;
    pos += size;
  }
  return false;
}
var matMul = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5]
];
function emfPlusBitmap(b, o, end) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (o + 20 > end) return null;
  const w = dv.getInt32(o, true), h = dv.getInt32(o + 4, true), stride = dv.getInt32(o + 8, true);
  const fmt2 = dv.getUint32(o + 12, true), kind = dv.getUint32(o + 16, true);
  const data = b.subarray(o + 20, end);
  if (kind === 1) {
    const ext = data[0] === 137 ? "png" : data[0] === 255 ? "jpeg" : data[0] === 71 ? "gif" : data[0] === 66 ? "bmp" : "tiff";
    return { data: data.slice(), ext, widthTwips: 0, heightTwips: 0 };
  }
  const bpp = fmt2 >>> 8 & 255;
  if (w <= 0 || h <= 0 || bpp !== 32 && bpp !== 24 || fmt2 & 65536 || stride * h > data.length) return null;
  const alpha = (fmt2 & 262144) !== 0, premul = (fmt2 & 524288) !== 0;
  const hdr = bpp === 32 ? 56 : 40;
  const rowOut = Math.ceil(w * bpp / 32) * 4;
  const bmp = new Uint8Array(14 + hdr + rowOut * h);
  const v = new DataView(bmp.buffer);
  bmp[0] = 66;
  bmp[1] = 77;
  v.setUint32(2, bmp.length, true);
  v.setUint32(10, 14 + hdr, true);
  v.setUint32(14, hdr, true);
  v.setInt32(18, w, true);
  v.setInt32(22, -h, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, bpp, true);
  if (bpp === 32) {
    v.setUint32(30, 3, true);
    v.setUint32(54, 16711680, true);
    v.setUint32(58, 65280, true);
    v.setUint32(62, 255, true);
    v.setUint32(66, alpha ? 4278190080 : 0, true);
  }
  for (let y = 0; y < h; y++) {
    const src = y * stride, dst = 14 + hdr + y * rowOut;
    bmp.set(data.subarray(src, src + Math.min(stride, rowOut)), dst);
    if (premul) {
      for (let k = dst; k < dst + w * 4; k += 4) {
        const a = bmp[k + 3];
        if (a > 0 && a < 255) for (let c = 0; c < 3; c++) bmp[k + c] = Math.min(255, Math.round(bmp[k + c] * 255 / a));
      }
    }
  }
  return { data: bmp, ext: "bmp", widthTwips: 0, heightTwips: 0 };
}
var EmfPlusPlayer = class {
  constructor(b, emit) {
    this.b = b;
    this.emit = emit;
    this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  b;
  emit;
  world = [1, 0, 0, 1, 0, 0];
  pageScale = 1;
  unit = 2;
  dpi = 96;
  saved = /* @__PURE__ */ new Map();
  images = /* @__PURE__ */ new Map();
  pending = null;
  dv;
  /** unidade de página → pixels */
  unitPx() {
    switch (this.unit) {
      case 3:
        return this.dpi / 72;
      case 4:
        return this.dpi;
      case 5:
        return this.dpi / 300;
      case 6:
        return this.dpi / 25.4;
      default:
        return 1;
    }
  }
  dev(x, y) {
    const m = this.world, k = this.pageScale * this.unitPx();
    return [(x * m[0] + y * m[2] + m[4]) * k, (x * m[1] + y * m[3] + m[5]) * k];
  }
  /** EmfPlusImage (só bitmap) */
  image(id, b, o, end) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (o + 16 > end || dv.getUint32(o + 4, true) !== 1) {
      this.images.set(id, { img: null, w: 0, h: 0 });
      return;
    }
    this.images.set(id, { img: emfPlusBitmap(b, o + 8, end), w: dv.getInt32(o + 8, true), h: dv.getInt32(o + 12, true) });
  }
  draw(id, srcUnit, src, p0, p1, p2) {
    const im = this.images.get(id);
    if (!im?.img) return;
    const [d0x, d0y] = this.dev(...p0), [d1x] = this.dev(...p1), [, d2y] = this.dev(...p2);
    let crop;
    if (srcUnit === 2 && im.w > 0 && im.h > 0) {
      const c = { l: src[0] / im.w, t: src[1] / im.h, r: 1 - (src[0] + src[2]) / im.w, b: 1 - (src[1] + src[3]) / im.h };
      if (Math.abs(c.l) > 1e-3 || Math.abs(c.t) > 1e-3 || Math.abs(c.r) > 1e-3 || Math.abs(c.b) > 1e-3) crop = c;
    }
    this.emit(im.img, d0x, d0y, d1x, d2y, crop);
  }
  play(start, end) {
    const dv = this.dv;
    let q = start;
    while (q + 12 <= end) {
      const type = dv.getUint16(q, true), flags = dv.getUint16(q + 2, true);
      const size = dv.getUint32(q + 4, true), dsz = dv.getUint32(q + 8, true);
      if (size < 12 || q + size > end) break;
      const d = q + 12, dEnd = Math.min(q + size, d + dsz);
      const f32 = (o) => dv.getFloat32(o, true);
      switch (type) {
        case 16385:
          this.dpi = dv.getUint32(d + 8, true) || 96;
          break;
        // cabeçalho
        case 16392: {
          const id = flags & 255;
          if ((flags >> 8 & 127) !== 5) break;
          if (flags & 32768) {
            const total = dv.getUint32(d, true);
            if (!this.pending || this.pending.id !== id) this.pending = { id, total, parts: [], got: 0 };
            const part = this.b.subarray(d + 4, dEnd);
            this.pending.parts.push(part);
            this.pending.got += part.length;
            if (this.pending.got >= total) {
              const all = new Uint8Array(this.pending.got);
              let o = 0;
              for (const p of this.pending.parts) {
                all.set(p, o);
                o += p.length;
              }
              this.pending = null;
              this.image(id, all, 0, all.length);
            }
          } else this.image(id, this.b, d, dEnd);
          break;
        }
        case 16410: {
          const id = flags & 255, srcUnit = dv.getInt32(d + 4, true);
          const src = [f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          const r = flags & 16384 ? [dv.getInt16(d + 24, true), dv.getInt16(d + 26, true), dv.getInt16(d + 28, true), dv.getInt16(d + 30, true)] : [f32(d + 24), f32(d + 28), f32(d + 32), f32(d + 36)];
          this.draw(id, srcUnit, src, [r[0], r[1]], [r[0] + r[2], r[1]], [r[0], r[1] + r[3]]);
          break;
        }
        case 16411: {
          const id = flags & 255, srcUnit = dv.getInt32(d + 4, true);
          const src = [f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          if (flags & 2048) break;
          const pt = (k) => flags & 16384 ? [dv.getInt16(d + 28 + k * 4, true), dv.getInt16(d + 30 + k * 4, true)] : [f32(d + 28 + k * 8), f32(d + 32 + k * 8)];
          this.draw(id, srcUnit, src, pt(0), pt(1), pt(2));
          break;
        }
        case 16426:
          this.world = [f32(d), f32(d + 4), f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          break;
        case 16427:
          this.world = [1, 0, 0, 1, 0, 0];
          break;
        case 16428:
        case 16429:
        case 16430:
        case 16431: {
          let m;
          if (type === 16428) m = [f32(d), f32(d + 4), f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          else if (type === 16429) m = [1, 0, 0, 1, f32(d), f32(d + 4)];
          else if (type === 16430) m = [f32(d), 0, 0, f32(d + 4), 0, 0];
          else {
            const a = f32(d) * Math.PI / 180;
            m = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
          }
          this.world = flags & 8192 ? matMul(this.world, m) : matMul(m, this.world);
          break;
        }
        case 16432:
          this.unit = flags & 255;
          this.pageScale = f32(d) || 1;
          break;
        case 16421:
          this.saved.set(dv.getUint32(d, true), { world: this.world, pageScale: this.pageScale, unit: this.unit });
          break;
        case 16422: {
          const s = this.saved.get(dv.getUint32(d, true));
          if (s) {
            this.world = s.world;
            this.pageScale = s.pageScale;
            this.unit = s.unit;
          }
          break;
        }
      }
      q += size;
    }
  }
};

// ../docx-layout/src/wmf.ts
var colorOf2 = (v) => [v & 255, v >> 8 & 255, v >> 16 & 255].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
var CP1252 = [8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 141, 381, 143, 144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, 157, 382, 376];
function isWmf(b) {
  if (b.length < 40) return false;
  if (b[0] === 215 && b[1] === 205 && b[2] === 198 && b[3] === 154) return true;
  return (b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0;
}
function renderWmf(ctx, bytes, dest) {
  const out = [];
  if (!isWmf(bytes)) return out;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i16 = (o) => dv.getInt16(o, true);
  const u16 = (o) => dv.getUint16(o, true);
  const u32 = (o) => dv.getUint32(o, true);
  const placeable = bytes[0] === 215;
  let pos = placeable ? 22 : 0;
  const box = placeable ? [i16(6), i16(8), i16(10), i16(12)] : [0, 0, 1, 1];
  pos += u16(pos + 2) * 2;
  let dc = {
    org: [box[0], box[1]],
    ext: [box[2] - box[0] || 1, box[3] - box[1] || 1],
    pen: { style: 0, width: 0, color: "000000" },
    brush: { style: 0, color: "FFFFFF" },
    font: { height: -12, weight: 400, italic: false, face: "Arial", charset: 0 },
    textColor: "000000",
    textAlign: 0,
    cur: [0, 0]
  };
  const stack = [];
  const objs = [];
  const add = (o) => {
    const k = objs.indexOf(null);
    if (k >= 0) objs[k] = o;
    else objs.push(o);
  };
  const sx = () => dest.w / dc.ext[0], sy = () => dest.h / dc.ext[1];
  const toPage = (x, y) => [dest.x + (x - dc.org[0]) * sx(), dest.y + (y - dc.org[1]) * sy()];
  const stroke = (cmds, fill) => {
    const f = fill && dc.brush.style !== 1 ? dc.brush.color : void 0;
    const st = dc.pen.style !== 5 ? { color: dc.pen.color, widthPt: Math.max(0.25, (Math.abs(dc.pen.width * sx()) || 0) / 20) } : void 0;
    if (cmds.length && (f || st)) out.push({ t: "path", cmds, ...f ? { fill: f } : {}, ...st ? { stroke: st } : {} });
  };
  const poly2 = (o, n, closed) => {
    const c = [];
    for (let k = 0; k < n; k++) {
      const [x, y] = toPage(i16(o + 4 * k), i16(o + 4 * k + 2));
      c.push({ op: k ? "L" : "M", x, y });
    }
    if (closed) c.push({ op: "Z" });
    return c;
  };
  const text = (x, y, raw, dx) => {
    const f = dc.font;
    const sym = f.charset === 2;
    let s = "";
    for (const b of raw) s += String.fromCharCode(sym ? 61440 + b : b >= 128 && b < 160 ? CP1252[b - 128] : b);
    if (!s.trim()) return;
    const face = ctx.faces.get(f.face || "Arial", f.weight >= 600, f.italic);
    const fm = face.font.metrics;
    const cell = Math.abs(f.height) || 12;
    const emLog = f.height < 0 ? cell : cell * fm.unitsPerEm / Math.max(1, fm.usWinAscent + fm.usWinDescent);
    const emTw = Math.abs(emLog * sy());
    if (emTw < 1) return;
    const [px, py] = toPage(dc.textAlign & 1 ? dc.cur[0] : x, dc.textAlign & 1 ? dc.cur[1] : y);
    const asc = (fm.usWinAscent || fm.ascender) / fm.unitsPerEm * emTw, desc = (fm.usWinDescent || -fm.descender) / fm.unitsPerEm * emTw;
    const va = dc.textAlign & 24;
    const baseY = va === 24 ? py : va === 8 ? py - desc : py + asc;
    const adv = Array.from(s, (ch, k) => dx ? Math.abs(dx(k) * sx()) : face.font.advanceWidth(face.font.glyphId(ch.charCodeAt(0))) * emTw / fm.unitsPerEm);
    const total = adv.reduce((a, b) => a + b, 0);
    const ha = dc.textAlign & 6;
    let gx = ha === 2 ? px - total : ha === 6 ? px - total / 2 : px;
    const glyphs = [];
    for (let k = 0; k < s.length; k++) {
      glyphs.push({ cp: s.charCodeAt(k), x: gx });
      gx += adv[k];
    }
    out.push({ t: "glyphs", face, sizePt: emTw / 20, color: dc.textColor, y: baseY, glyphs, text: s });
    if (dc.textAlign & 1) dc.cur = [dc.cur[0] + total / sx(), dc.cur[1]];
  };
  while (pos + 6 <= bytes.length) {
    const size = u32(pos) * 2, fn = u16(pos + 4), p = pos + 6;
    if (fn === 0 || size < 6 || pos + size > bytes.length) break;
    switch (fn) {
      case 523:
        dc.org = [i16(p + 2), i16(p)];
        break;
      // SETWINDOWORG (y, x)
      case 524:
        dc.ext = [i16(p + 2) || 1, i16(p) || 1];
        break;
      // SETWINDOWEXT
      case 302:
        dc.textAlign = u16(p);
        break;
      case 521:
        dc.textColor = colorOf2(u32(p));
        break;
      case 30:
        stack.push({ ...dc });
        break;
      // SAVEDC
      case 295: {
        const k = i16(p);
        const s = k < 0 ? stack.splice(stack.length + k)[0] : void 0;
        if (s) dc = s;
        break;
      }
      // RESTOREDC
      case 762:
        add({ kind: "pen", pen: { style: u16(p), width: i16(p + 2), color: colorOf2(u32(p + 6)) } });
        break;
      case 764:
        add({ kind: "brush", brush: { style: u16(p), color: colorOf2(u32(p + 2)) } });
        break;
      case 763: {
        let face = "";
        for (let k = p + 18; k < Math.min(p + 50, pos + size) && bytes[k]; k++) face += String.fromCharCode(bytes[k]);
        add({ kind: "font", font: { height: i16(p), weight: i16(p + 8), italic: bytes[p + 10] !== 0, face, charset: bytes[p + 13] } });
        break;
      }
      case 247:
      case 322:
      case 505:
      case 1791:
        add({ kind: "other" });
        break;
      // paleta, pincel DIB, região
      case 301: {
        const o = objs[u16(p)];
        if (o?.kind === "pen") dc.pen = o.pen;
        else if (o?.kind === "brush") dc.brush = o.brush;
        else if (o?.kind === "font") dc.font = o.font;
        break;
      }
      case 496:
        if (u16(p) < objs.length) objs[u16(p)] = null;
        break;
      // DELETEOBJECT
      case 532:
        dc.cur = [i16(p + 2), i16(p)];
        break;
      // MOVETO (y, x)
      case 531: {
        const [x0, y0] = toPage(dc.cur[0], dc.cur[1]);
        dc.cur = [i16(p + 2), i16(p)];
        const [x1, y1] = toPage(dc.cur[0], dc.cur[1]);
        stroke([{ op: "M", x: x0, y: y0 }, { op: "L", x: x1, y: y1 }], false);
        break;
      }
      case 805:
        stroke(poly2(p + 2, i16(p), false), false);
        break;
      // POLYLINE
      case 804:
        stroke(poly2(p + 2, i16(p), true), true);
        break;
      // POLYGON
      case 1051: {
        const [x0, y0] = toPage(i16(p + 6), i16(p + 4)), [x1, y1] = toPage(i16(p + 2), i16(p));
        stroke([{ op: "M", x: x0, y: y0 }, { op: "L", x: x1, y: y0 }, { op: "L", x: x1, y: y1 }, { op: "L", x: x0, y: y1 }, { op: "Z" }], true);
        break;
      }
      case 1313: {
        const n = i16(p), o = p + 2 + (n + 1 & ~1);
        text(i16(o + 2), i16(o), bytes.subarray(p + 2, p + 2 + n), null);
        break;
      }
      case 2610: {
        const n = i16(p + 4), opt = u16(p + 6);
        const so = p + 8 + (opt & 6 ? 8 : 0);
        const dxo = so + (n + 1 & ~1);
        const hasDx = dxo + 2 * n <= pos + size;
        text(i16(p + 2), i16(p), bytes.subarray(so, so + n), hasDx ? (k) => i16(dxo + 2 * k) : null);
        break;
      }
    }
    pos += size;
  }
  return out;
}

// ../docx-layout/src/paint.ts
var lineSeq = 0;
function paintLine(ctx, out, line, frameX, top) {
  const baseY = top + line.baseline;
  const lineId = ++lineSeq;
  const all = [...line.marker ?? [], ...line.placed];
  for (const pg of all) {
    const st = pg.g.style;
    const fill = st.highlight ?? st.shading;
    if (!fill || pg.w <= 0 || pg.g.kind === "lb" || pg.g.kind === "pb") continue;
    const m = faceMetrics(pg.g.face.font);
    const asc = m.ascent * st.sizePt * 20, desc = m.descent * st.sizePt * 20;
    out.push({ t: "rect", x: frameX + pg.x, y: baseY - asc, w: pg.w, h: asc + desc, fill });
  }
  let run2 = null;
  let runKey = "";
  const flush = () => {
    if (run2 && run2.glyphs.length) out.push(run2);
    run2 = null;
    runKey = "";
  };
  for (const pg of all) {
    const g = pg.g;
    if (g.math) {
      flush();
      paintMath(out, g.math, frameX, pg.x, baseY, line, lineId);
      continue;
    }
    if (g.kind !== "char" && g.kind !== "nbsp" && !(g.kind === "shy" && pg.w > 0)) {
      if (g.kind === "space") continue;
      flush();
      if (g.kind === "tab" && pg.leader) paintLeader(ctx, out, pg, frameX, baseY, all);
      if (g.kind === "obj" && g.obj && g.adv > 0) paintInlineObject(ctx, out, g, frameX + pg.x, baseY);
      if (g.kind === "box" && g.box) paintCheckBox(out, g, frameX + pg.x, baseY);
      continue;
    }
    if (g.cp >= 65024 && g.cp <= 65039) continue;
    if (g.cp >= 8192 && g.cp <= 8202 || g.cp === 12288) continue;
    const st = g.style;
    if (st.alpha === 0 && !st.outline) {
      flush();
      continue;
    }
    const colr = !!g.face.font.hasColorGlyphs?.() && !!g.face.font.colorLayers?.(g.face.font.glyphId(g.cp));
    const key = `${g.face.key}|${g.face.synthBold ? 1 : 0}${g.face.synthItalic ? 1 : 0}|${g.sizePt}|${st.color}|${st.shift}|${st.rpr.w ?? 100}|${st.alpha ?? 1}|${colr ? "c" : ""}`;
    if (key !== runKey) {
      flush();
      runKey = key;
      run2 = {
        t: "glyphs",
        face: g.face,
        sizePt: g.sizePt,
        color: st.color,
        y: baseY - st.shift,
        glyphs: [],
        text: "",
        ...st.rpr.w && st.rpr.w !== 100 ? { scaleX: st.rpr.w / 100 } : {},
        ...g.face.synthBold ? { synthBold: true } : {},
        ...g.face.synthItalic ? { synthItalic: true } : {},
        ...st.alpha !== void 0 ? { alpha: st.alpha } : {},
        // semitransparente: o Word desenha CURVAS, não texto (oráculo hidetext/tf-alpha50)
        ...st.alpha !== void 0 && st.alpha > 0 && st.alpha < 1 ? { asPath: true } : {},
        lineBox: { asc: line.baseline - st.shift, desc: line.height - line.baseline + st.shift, lead: pg.x, line: lineId },
        ...colr ? { asPath: true, colr: true } : {}
      };
    }
    const cp = g.kind === "shy" ? 45 : g.cp;
    run2.glyphs.push({ cp, x: frameX + pg.x });
    run2.text += String.fromCodePoint(cp);
  }
  flush();
  paintDecorations(out, all, frameX, baseY, line);
}
function paintLeader(ctx, out, pg, frameX, baseY, all) {
  if (pg.w <= 0) return;
  const g = pg.g;
  const ch = pg.leader === "hyphen" ? "-" : pg.leader === "underscore" || pg.leader === "heavy" ? "_" : pg.leader === "middleDot" ? "\xB7" : ".";
  const cp = ch.codePointAt(0);
  const face = g.face;
  const f = face.font;
  const rpr = g.style.rpr;
  const emPx = Math.round(g.sizePt * 600 / 72);
  let step = Math.round(f.advanceWidth(f.glyphId(cp)) * emPx / f.metrics.unitsPerEm);
  if (rpr.spacing) step += Math.round(rpr.spacing / 2.4);
  const scale = rpr.w && rpr.w !== 100 ? rpr.w / 100 : 1;
  step = Math.round(step * scale);
  if (step <= 0) return;
  const fv = frameX / 2.4, ff = Math.floor(fv);
  const fx = Math.abs(fv - ff - 0.5) < 1e-6 ? ff + ff % 2 : Math.round(fv);
  const x0 = displayEnd(ctx, all, pg, fx), x1 = fx + Math.round((pg.x + pg.w) / 2.4);
  const run2 = {
    t: "glyphs",
    face,
    sizePt: g.sizePt,
    color: g.style.color,
    y: baseY - g.style.shift,
    glyphs: [],
    text: "",
    ...scale !== 1 ? { scaleX: scale } : {}
  };
  for (let k = Math.ceil(x0 / step); (k + 1) * step <= x1; k++) {
    run2.glyphs.push({ cp, x: k * step * 2.4 });
    run2.text += ch;
  }
  if (run2.glyphs.length) out.push(run2);
}
function displayEnd(ctx, all, tab, fx) {
  const i = all.indexOf(tab);
  let s = i;
  while (s > 0 && all[s - 1].g.kind !== "tab") s--;
  const st = ctx.fmt.settings;
  if (st.compatibilityMode < 15 && st.compat["useWord97LineBreakRules"] && fontOfSlot((s < i ? all[s] : tab).g.style.rpr.rFonts, "eastAsia", ctx.fmt.theme)) return fx + Math.round(tab.x / 2.4);
  const seg = (u2) => Math.floor((u2 * 8534 + 2097152) / 4194304);
  let px = fx + Math.round((s < i ? all[s].x : tab.x) / 2.4);
  let u = 0;
  for (let j = s; j < i; j++) {
    const w = Math.round(all[j].w / WORD_UNIT);
    if (u > 0 && (u + w) * 8534 + 2097152 >= 4294967296) {
      px += seg(u);
      u = 0;
    }
    u += w;
  }
  return px + seg(u);
}
function paintMath(out, box, frameX, x, baseY, line, lineId) {
  let run2 = null;
  let key = "";
  for (const it of box.items) {
    const k = `${it.face.key}|${it.sizePt}|${it.style.color}|${it.y}`;
    if (!run2 || k !== key) {
      if (run2) out.push(run2);
      key = k;
      run2 = {
        t: "glyphs",
        face: it.face,
        sizePt: it.sizePt,
        color: it.style.color,
        y: baseY + it.y,
        glyphs: [],
        text: "",
        lineBox: { asc: line.baseline + it.y, desc: line.height - line.baseline - it.y, lead: x + it.x, line: lineId }
      };
    }
    run2.glyphs.push({ cp: it.cp, x: frameX + x + it.x });
    run2.text += String.fromCodePoint(it.cp);
  }
  if (run2) out.push(run2);
  for (const r of box.rules) out.push({ t: "rect", x: frameX + x + r.x, y: baseY + r.y, w: r.w, h: r.h, fill: r.color });
}
function paintCheckBox(out, g, x, baseY) {
  const b = g.box;
  const top = baseY + 0.18 * (b.side / 1.07) - b.side;
  const w = Math.max(0.5, b.side / 20 / 16);
  const c = g.style.color;
  out.push({ t: "line", x1: x, y1: top, x2: x + b.side, y2: top, color: c, widthPt: w });
  out.push({ t: "line", x1: x, y1: top + b.side, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
  out.push({ t: "line", x1: x, y1: top, x2: x, y2: top + b.side, color: c, widthPt: w });
  out.push({ t: "line", x1: x + b.side, y1: top, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
  if (b.checked) {
    out.push({ t: "line", x1: x, y1: top, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
    out.push({ t: "line", x1: x + b.side, y1: top, x2: x, y2: top + b.side, color: c, widthPt: w });
  }
}
function paintInlineObject(ctx, out, g, x0, baseY0) {
  const obj = g.obj;
  const shift = g.style.shift;
  const ie = obj.image?.inlineEffect ?? obj.shape?.inlineEffect;
  const x = x0 + (ie?.l ?? 0), baseY = baseY0 - (ie?.b ?? 0);
  if (obj.image && isEmf(obj.image.data)) {
    const im = obj.image;
    const r = { x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips };
    out.push({ t: "clip", op: "push", ...r, src: im }, ...renderEmf(ctx, im.data, r), { t: "clip", op: "pop" });
  } else if (obj.image && isWmf(obj.image.data)) {
    const im = obj.image;
    const r = { x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips };
    out.push({ t: "clip", op: "push", ...r, src: im }, ...renderWmf(ctx, im.data, r), { t: "clip", op: "pop" });
  } else if (obj.image) {
    const im = obj.image;
    out.push({
      t: "image",
      x,
      y: baseY - shift - im.heightTwips,
      w: im.widthTwips,
      h: im.heightTwips,
      image: im,
      ...im.crop ? { crop: im.crop } : {},
      ...im.style?.rot ? { rot: im.style.rot } : {},
      ...im.style?.flipH ? { flipH: true } : {},
      ...im.style?.flipV ? { flipV: true } : {},
      ...(() => {
        const pic = pictureLook(im, ctx.fmt.theme);
        return pic ? { pic } : {};
      })()
    });
  } else if (obj.shape) {
    const s = obj.shape;
    out.push({ t: "shape", x, y: baseY - shift - s.heightTwips, w: s.widthTwips, h: s.heightTwips, style: s.style });
  }
}
function paintDecorations(out, all, frameX, baseY, line) {
  const segs = (pred) => {
    const res = [];
    let cur = null;
    let lastContent = -1;
    all.forEach((pg, k) => {
      if (pg.g.kind !== "space" && pg.g.kind !== "lb" && pg.g.kind !== "pb") lastContent = k;
    });
    all.forEach((pg, k) => {
      const g = pg.g;
      const on = k <= lastContent && pred(g) && pg.w > 0 && g.kind !== "lb" && g.kind !== "pb";
      if (on && cur && cur.g.style === g.style && Math.abs(cur.x1 - (frameX + pg.x)) < 1) {
        cur.x1 = frameX + pg.x + pg.w;
      } else if (on) {
        if (cur) res.push(cur);
        cur = { x0: frameX + pg.x, x1: frameX + pg.x + pg.w, g };
      } else if (cur) {
        res.push(cur);
        cur = null;
      }
    });
    if (cur) res.push(cur);
    return res;
  };
  for (const s of segs((g) => !!g.style.underline && g.style.underline.val !== "none")) {
    const st = s.g.style;
    const m = faceMetrics(s.g.face.font);
    const sz3 = st.sizePt * 20;
    const y = baseY - st.shift + m.underlinePos * sz3;
    const w = Math.max(0.5, m.underlineThick * st.sizePt);
    const color2 = st.underline.color ?? st.color;
    const val = st.underline.val;
    if (val === "words" && s.g.kind === "space") continue;
    const dash = val.startsWith("dotted") ? "dotted" : val.startsWith("dash") ? "dashed" : void 0;
    out.push({ t: "line", x1: s.x0, y1: y, x2: s.x1, y2: y, color: color2, widthPt: val === "thick" ? w * 2 : w, ...dash ? { dash } : {} });
    if (val === "double") out.push({ t: "line", x1: s.x0, y1: y + w * 20 * 2, x2: s.x1, y2: y + w * 20 * 2, color: color2, widthPt: w });
  }
  for (const s of segs((g) => g.style.strike || g.style.dstrike)) {
    const st = s.g.style;
    const m = faceMetrics(s.g.face.font);
    const y = baseY - st.shift - m.ascent * st.sizePt * 20 * 0.3;
    const w = Math.max(0.5, m.underlineThick * st.sizePt);
    out.push({ t: "line", x1: s.x0, y1: y, x2: s.x1, y2: y, color: st.color, widthPt: w });
    if (st.dstrike) out.push({ t: "line", x1: s.x0, y1: y - w * 40, x2: s.x1, y2: y - w * 40, color: st.color, widthPt: w });
  }
  void line;
}
var BORDER_SINGLE_LIKE = /* @__PURE__ */ new Set(["single", "thick", "dotted", "dashed", "dotDash", "dotDotDash", "hairline", "dashSmallGap"]);
function borderWidth(b) {
  if (!b || b.val === "none" || b.val === "nil") return 0;
  const tw = Math.floor(Math.max(1, b.sz ?? 4) * 2.5 + 1e-9);
  switch (b.val) {
    case "double":
      return tw * 3;
    case "thinThickSmallGap":
    case "thickThinSmallGap":
      return tw + 40;
    // as outras compostas: a soma das faixas que o Word desenha (sonda de bordas do table-lab)
    case "triple":
      return tw * 5;
    case "thinThickThinSmallGap":
      return tw + 58;
    case "thinThickMediumGap":
    case "thickThinMediumGap":
      return tw * 2;
    case "thinThickThinMediumGap":
      return tw * 3;
    case "thinThickLargeGap":
    case "thickThinLargeGap":
      return tw + 43;
    case "thinThickThinLargeGap":
      return tw * 2 + 58;
    case "threeDEmboss":
    case "threeDEngrave":
      return tw + 2 * Math.max(14, Math.floor(tw / 2));
    default:
      return tw;
  }
}
function borderBands(val, w) {
  const q = (x) => Math.max(2.4, Math.floor(x / 2.4 + 1e-9) * 2.4);
  const thin = 14.4, half = q(w / 2), thick = 28.8, gap = (t) => ({ t });
  const ink = (t) => ({ t, c: "ink" });
  switch (val) {
    case "double":
      return [ink(w), gap(w), ink(w)];
    case "triple":
      return [ink(w), gap(w), ink(w), gap(w), ink(w)];
    case "thinThickSmallGap":
      return [ink(w), gap(thin), ink(thin)];
    case "thickThinSmallGap":
      return [ink(thin), gap(thin), ink(w)];
    case "thinThickThinSmallGap":
      return [ink(thin), gap(thin), ink(w), gap(thin), ink(thin)];
    case "thinThickMediumGap":
      return [ink(w), gap(half), ink(half)];
    case "thickThinMediumGap":
      return [ink(half), gap(half), ink(w)];
    case "thinThickThinMediumGap":
      return [ink(half), gap(half), ink(w), gap(half), ink(half)];
    case "thinThickLargeGap":
      return [ink(thick), gap(w), ink(thin)];
    case "thickThinLargeGap":
      return [ink(thin), gap(w), ink(thick)];
    case "thinThickThinLargeGap":
      return [ink(thin), gap(w), ink(thick), gap(w), ink(thin)];
    case "threeDEmboss": {
      const t = Math.max(thin, half);
      return [{ t, c: "light" }, { t: w, c: "mid" }, { t, c: "ink" }];
    }
    case "threeDEngrave": {
      const t = Math.max(thin, half);
      return [{ t, c: "ink" }, { t: w, c: "mid" }, { t, c: "light" }];
    }
    default:
      return [ink(w)];
  }
}
var toWhite = (hex, f) => {
  const n = parseInt(hex, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.round(v + (255 - v) * f).toString(16).padStart(2, "0")).join("").toUpperCase();
};
var BORDER_DASH = {
  dotted: "bdrDot",
  dashed: "bdrDash",
  dotDash: "bdrDashDot",
  dotDotDash: "bdrDashDotDot",
  dashSmallGap: "bdrDashSmall",
  dashDotStroked: "bdrDashDot"
};
function borderPaintWidth(b) {
  return Math.max(1, Math.floor(Math.max(2, b.sz ?? 4) * 25 / 24 + 1e-9)) * 2.4;
}
function paintBorder(ctx, out, b, x1, y1, x2, y2, outer) {
  if (!b || b.val === "none" || b.val === "nil") return;
  const color2 = resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, ctx.fmt.theme) ?? "000000";
  const w = borderPaintWidth(b);
  const dash = BORDER_DASH[b.val];
  if (dash) {
    out.push({ t: "line", x1, y1, x2, y2, color: color2, widthPt: w / 20, dash });
    return;
  }
  if (x1 !== x2 && y1 !== y2) {
    out.push({ t: "line", x1, y1, x2, y2, color: color2, widthPt: w / 20 });
    return;
  }
  const horizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  if (b.val === "wave" || b.val === "doubleWave") {
    paintWave(out, b.val === "doubleWave", color2, w, horizontal, x1, y1, x2, y2);
    return;
  }
  const bands = borderBands(b.val, w);
  const total = bands.reduce((s, x) => s + x.t, 0);
  const flip = outer === "bottom" || outer === "right";
  let pos = -total / 2;
  for (const band of flip ? [...bands].reverse() : bands) {
    if (band.c) {
      const fill = band.c === "light" ? toWhite(color2, 192 / 255) : band.c === "mid" ? toWhite(color2, 96 / 255) : color2;
      if (horizontal) out.push({ t: "rect", x: Math.min(x1, x2), y: y1 + pos, w: Math.abs(x2 - x1), h: band.t, fill });
      else out.push({ t: "rect", x: x1 + pos, y: Math.min(y1, y2), w: band.t, h: Math.abs(y2 - y1), fill });
    }
    pos += band.t;
  }
  void BORDER_SINGLE_LIKE;
}
function paintWave(out, double, color2, w, horizontal, x1, y1, x2, y2) {
  const h = Math.max(60, w * 3), period = h * 2, lw = Math.max(0.5, w / 20 / 1.5);
  const len = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const waves = double ? [-h / 4, h / 4] : [0];
  for (const off of waves) {
    const cmds = [];
    for (let s = 0; s <= len + 0.01; s += period / 2) {
      const d = (Math.round(s / (period / 2)) % 2 ? 1 : -1) * (h / (double ? 4 : 2));
      const a = Math.min(s, len);
      cmds.push(horizontal ? { op: cmds.length ? "L" : "M", x: Math.min(x1, x2) + a, y: y1 + off + d } : { op: cmds.length ? "L" : "M", x: x1 + off + d, y: Math.min(y1, y2) + a });
    }
    out.push({ t: "path", cmds, stroke: { color: color2, widthPt: lw } });
  }
}
function paintParaBox(ctx, out, p, pBdr, left, right, top, bottom, drawTop, drawBottom, between = false) {
  const fill = shadingFill(p.ppr.shd, ctx.fmt.theme);
  const EXT = 29;
  const bl = pBdr?.left, br = pBdr?.right;
  const padL = bl && bl.val !== "none" && bl.val !== "nil" ? (bl.space ?? 0) * 20 : 0;
  const padR = br && br.val !== "none" && br.val !== "nil" ? (br.space ?? 0) * 20 : 0;
  const inL = left - EXT - padL, inR = right + EXT + padR;
  const shT = drawTop && pBdr?.top?.shadow ? borderWidth(pBdr.top) : 0;
  const shB = drawBottom && pBdr?.bottom?.shadow ? borderWidth(pBdr.bottom) : 0;
  const shR = br?.shadow ? borderWidth(br) : 0;
  const fTop = shT ? top + shT + borderWidth(pBdr.top) : top, fBot = shB ? bottom - shB - borderWidth(pBdr.bottom) : bottom;
  if (fill) out.push({ t: "rect", x: inL, y: fTop, w: inR - inL, h: fBot - fTop, fill });
  if (!pBdr) return;
  const outL = inL - borderWidth(bl), outR = inR + borderWidth(br);
  if (drawTop) {
    const y = top + shT + borderWidth(pBdr.top) / 2;
    paintBorder(ctx, out, pBdr.top, outL, y, outR, y);
  }
  if (between && pBdr.between && pBdr.between.val !== "none" && pBdr.between.val !== "nil") {
    const yb = top + (pBdr.between.space ?? 0) * 20 + borderWidth(pBdr.between) / 2;
    paintBorder(ctx, out, pBdr.between, outL, yb, outR, yb);
  }
  if (drawBottom) {
    const y = bottom - shB - borderWidth(pBdr.bottom) / 2;
    paintBorder(ctx, out, pBdr.bottom, outL, y, outR, y);
    if (shB) paintBorder(ctx, out, pBdr.bottom, outL + shB, bottom - shB / 2, outR + shB, bottom - shB / 2);
  }
  paintBorder(ctx, out, bl, inL - borderWidth(bl) / 2, top + shT, inL - borderWidth(bl) / 2, bottom - shB);
  paintBorder(ctx, out, br, inR + borderWidth(br) / 2, top + shT, inR + borderWidth(br) / 2, bottom - shB);
  if (shR) paintBorder(ctx, out, br, inR + borderWidth(br) + shR / 2, top + shT + shR, inR + borderWidth(br) + shR / 2, bottom);
}
function pageBorderItems(ctx, pb, g, surround) {
  const on = (b) => !!b && b.val !== "none" && b.val !== "nil";
  const lw = (b) => on(b) ? Math.max(0.25, (b.sz ?? 4) / 8) * 20 : 0;
  const thick = (b) => on(b) && b.val === "double" ? 3 * lw(b) : lw(b);
  const sp2 = (b) => (b?.space ?? 0) * 20;
  const page = pb.offsetFrom === "page";
  const top = page ? sp2(pb.top) : (surround.header ? g.hdr : g.marT) - sp2(pb.top) - thick(pb.top);
  const bottom = page ? g.pageH - sp2(pb.bottom) : g.pageH - (surround.footer ? g.ftr : g.marB) + sp2(pb.bottom) + thick(pb.bottom);
  const left = page ? sp2(pb.left) : g.marL - sp2(pb.left) - thick(pb.left);
  const right = page ? g.pageW - sp2(pb.right) : g.pageW - g.marR + sp2(pb.right) + thick(pb.right);
  const out = [];
  const color2 = (b) => resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, ctx.fmt.theme) ?? "000000";
  const bands = (b) => b.val === "double" ? [[0, lw(b)], [2 * lw(b), 3 * lw(b)]] : [[0, lw(b)]];
  if (on(pb.top)) for (const [a, z] of bands(pb.top)) out.push({ t: "rect", x: left, y: top + a, w: right - left, h: z - a, fill: color2(pb.top) });
  if (on(pb.bottom)) for (const [a, z] of bands(pb.bottom)) out.push({ t: "rect", x: left, y: bottom - z, w: right - left, h: z - a, fill: color2(pb.bottom) });
  if (on(pb.left)) for (const [a, z] of bands(pb.left)) out.push({ t: "rect", x: left + a, y: top, w: z - a, h: bottom - top, fill: color2(pb.left) });
  if (on(pb.right)) for (const [a, z] of bands(pb.right)) out.push({ t: "rect", x: right - z, y: top, w: z - a, h: bottom - top, fill: color2(pb.right) });
  return out;
}

// ../docx-layout/src/table.ts
function splitContent(c, availContent) {
  const nr = c.nest?.find((n) => n.top < availContent - 0.5 && n.top + n.row.height > availContent + 0.05);
  if (nr) {
    const parts = nr.row.split?.(availContent - nr.top) ?? null;
    if (parts && parts[0].height > 0) return splitAtNest(c, nr, parts);
    if (nr.top > 0.5) return splitContent(c, nr.top);
  }
  const paras = c.paras;
  const lastOf = /* @__PURE__ */ new Map();
  if (paras) {
    for (const l of c.lines) if (paras.has(l.ref)) lastOf.set(l.ref, l);
  }
  let cut = 0;
  for (const l of c.lines) {
    const bottom = l.y + l.height + (lastOf.get(l.ref) === l ? paras.get(l.ref).band ?? 0 : 0);
    const after = lastOf.get(l.ref) === l ? paras.get(l.ref).after : 0;
    if (bottom + after <= availContent + 0.05 && bottom > cut) cut = bottom;
  }
  if (cut > 0 && paras) cut = widowCut(c, paras, cut);
  if (cut > 0) cut = nestedRowCut(c, cut);
  if (cut <= 0) return null;
  let cutB = cut;
  if (paras) {
    let last, next = Infinity;
    for (const l of c.lines) {
      if (l.y + l.height <= cut + 0.5) {
        if (!last || l.y + l.height > last.y + last.height) last = l;
      } else next = Math.min(next, l.y);
    }
    if (last && lastOf.get(last.ref) === last) cutB = Math.min(cut + paras.get(last.ref).after, next);
  }
  const w = paras ? { paras } : {};
  const a = { items: [], lines: [], height: cut, ...w };
  const b = { items: [], lines: [], height: Math.max(0, c.height - cutB), ...w };
  const keyY = (it) => it.t === "line" ? Math.min(it.y1, it.y2) : it.t === "clip" ? it.y ?? 0 : it.t === "xform" ? it.m?.[5] ?? 0 : it.t === "path" ? Math.min(...it.cmds.map((c2) => c2.op === "Z" ? Infinity : c2.y)) : it.y;
  const moved = /* @__PURE__ */ new Map();
  for (const it of c.items) {
    const y = it.t === "glyphs" ? it.y : keyY(it);
    if (y < cut) a.items.push(it);
    else {
      const s = shiftItem(it, -cutB);
      moved.set(it, s);
      b.items.push(s);
    }
  }
  for (const l of c.lines) {
    if (l.y < cut) a.lines.push(l);
    else {
      const s = { ...l, y: l.y - cutB, baseline: l.baseline - cutB };
      moved.set(l, s);
      b.lines.push(s);
    }
  }
  const na = (c.nest ?? []).filter((n) => n.top < cut);
  const nb = (c.nest ?? []).filter((n) => n.top >= cut).map((n) => ({
    top: n.top - cutB,
    row: n.row,
    items: n.items.map((it) => moved.get(it) ?? it),
    lines: n.lines.map((l) => moved.get(l) ?? l)
  }));
  if (na.length) a.nest = na;
  if (nb.length) b.nest = nb;
  return [a, b];
}
function itemTop(it) {
  return it.t === "glyphs" ? it.y : it.t === "line" ? Math.min(it.y1, it.y2) : it.t === "clip" ? it.y ?? 0 : it.t === "xform" ? it.m?.[5] ?? 0 : it.t === "path" ? Math.min(...it.cmds.map((c) => c.op === "Z" ? Infinity : c.y)) : it.y;
}
function splitAtNest(c, nr, [p0, p1]) {
  const own3 = /* @__PURE__ */ new Set([...nr.items, ...nr.lines]);
  const end = nr.top + nr.row.height;
  const dy = p1.height - end;
  const w = c.paras ? { paras: c.paras } : {};
  const aItems = [], aLines = [], bItems = [], bLines = [];
  const moved = /* @__PURE__ */ new Map();
  for (const it of c.items) {
    if (own3.has(it)) continue;
    if (itemTop(it) < nr.top + 0.5) aItems.push(it);
    else {
      const s = shiftItem(it, dy);
      moved.set(it, s);
      bItems.push(s);
    }
  }
  for (const l of c.lines) {
    if (own3.has(l)) continue;
    if (l.y < nr.top + 0.5) aLines.push(l);
    else {
      const s = { ...l, y: l.y + dy, baseline: l.baseline + dy };
      moved.set(l, s);
      bLines.push(s);
    }
  }
  const p0Items = [...p0.items, ...p0.borderItems].map((it) => shiftItem(it, nr.top));
  const p0Lines = p0.lines.map((l) => ({ ...l, y: l.y + nr.top, baseline: l.baseline + nr.top }));
  aItems.push(...p0Items);
  aLines.push(...p0Lines);
  const p1Items = [...p1.items, ...p1.borderItems];
  const p1Lines = p1.lines.map((l) => ({ ...l }));
  bItems.unshift(...p1Items);
  bLines.unshift(...p1Lines);
  const before = (c.nest ?? []).filter((n) => n.top + n.row.height <= nr.top + 0.5);
  const after = (c.nest ?? []).filter((n) => n.top >= end - 0.5).map((n) => ({
    top: n.top + dy,
    row: n.row,
    items: n.items.map((it) => moved.get(it) ?? it),
    lines: n.lines.map((l) => moved.get(l) ?? l)
  }));
  const a = { items: aItems, lines: aLines, height: nr.top + p0.height, ...w, nest: [...before, { top: nr.top, row: p0, items: p0Items, lines: p0Lines }] };
  const b = { items: bItems, lines: bLines, height: Math.max(0, c.height - end) + p1.height, ...w, nest: [{ top: 0, row: p1, items: p1Items, lines: p1Lines }, ...after] };
  return [a, b];
}
function nestedRowCut(c, cut) {
  if (!c.lines.length) return cut;
  const segs = (r) => r.split("/");
  const base = Math.min(...c.lines.map((l) => segs(l.ref).length)) - 1;
  const rows = /* @__PURE__ */ new Map();
  for (const l of c.lines) {
    const s = segs(l.ref);
    if (s.length < base + 4) continue;
    const k = s.slice(0, base + 2).join("/");
    (rows.get(k) ?? rows.set(k, []).get(k)).push(l);
  }
  for (const ls of rows.values()) {
    const above = ls.filter((l) => l.y < cut);
    if (!above.length || above.length === ls.length) continue;
    const cells = new Set(ls.map((l) => segs(l.ref).slice(0, base + 3).join("/")));
    if (![...cells].some((ck) => !above.some((l) => l.ref.startsWith(ck + "/")))) continue;
    const top = Math.min(...ls.map((l) => l.y));
    let prev = 0;
    for (const l of c.lines) if (l.y + l.height <= top + 0.5) prev = Math.max(prev, l.y + l.height);
    cut = Math.min(cut, prev, top);
  }
  return cut;
}
function widowCut(c, paras, cut) {
  const byRef = /* @__PURE__ */ new Map();
  for (const l of c.lines) (byRef.get(l.ref) ?? byRef.set(l.ref, []).get(l.ref)).push(l);
  let out = cut;
  for (const [ref, mine] of byRef) {
    const info = paras.get(ref);
    if (!info?.widow) continue;
    const n1 = mine.filter((l) => l.y + l.height <= cut + 0.5).length;
    if (n1 === 0 || n1 === mine.length) continue;
    const hasFirst = mine.length === info.lines;
    let keep = n1;
    if (keep === 1 && hasFirst) keep = 0;
    else if (mine.length - n1 === 1 && n1 >= 2) {
      keep--;
      if (keep === 1 && hasFirst) keep = 0;
    }
    if (keep === n1) continue;
    if (keep > 0) {
      out = Math.min(out, mine[keep - 1].y + mine[keep - 1].height);
      continue;
    }
    let prev = 0;
    for (const l of c.lines) if (l.y + l.height <= mine[0].y + 0.5) prev = Math.max(prev, l.y + l.height);
    out = Math.min(out, prev, mine[0].y);
  }
  return out;
}
var DEFAULT_LOOK = { firstRow: true, lastRow: false, firstColumn: true, lastColumn: false, noHBand: false, noVBand: true };
function widthTw(w, base) {
  if (!w) return void 0;
  if (w.type === "dxa") return w.w;
  if (w.type === "pct") return base * w.w / 5e3;
  return void 0;
}
function boundaryWidths(cells, nCols, v, spread) {
  const byEnd = Array.from({ length: nCols + 1 }, () => []);
  const late = [];
  for (const row of cells) {
    for (const c of row) {
      const s = Math.min(c.col, nCols), e = Math.min(nCols, c.col + c.span);
      if (e <= s) continue;
      if (e - s > 1 && spread?.(c)) late.push(c);
      else byEnd[e].push({ start: s, v: v(c) });
    }
  }
  const b = [0];
  for (let k = 1; k <= nCols; k++) {
    let m = b[k - 1];
    for (const c of byEnd[k]) m = Math.max(m, b[c.start] + c.v);
    b.push(m);
  }
  const w = b.slice(1).map((x, k) => x - b[k]);
  late.sort((a, z) => a.span - z.span);
  for (const c of late) {
    const s = Math.min(c.col, nCols), e = Math.min(nCols, c.col + c.span);
    const have = w.slice(s, e).reduce((a, x) => a + x, 0), need = v(c) - have;
    if (need <= 0) continue;
    for (let k = s; k < e; k++) w[k] = w[k] + (have > 0 ? need * w[k] / have : need / (e - s));
  }
  return w;
}
var prefOf = (w) => w && w.w > 0 && (w.type === "dxa" || w.type === "pct") ? w.type : "auto";
function fitPctMins(p, cells, minOf, colMin, pct) {
  for (let it = 0; it < 2 * p.length + 2; it++) {
    let worst, need = 1e-6;
    for (const c of cells) {
      if (!pct(c.col)) continue;
      const d = minOf(c) - p.slice(c.col, c.col + c.span).reduce((a, x) => a + x, 0);
      if (d > need) {
        need = d;
        worst = c;
      }
    }
    if (!worst) break;
    const s = worst.col, e = Math.min(p.length, worst.col + worst.span);
    const others = p.map((_, k) => k).filter((k) => (k < s || k >= e) && pct(k) && p[k] > colMin[k] + 1e-6);
    const have = p.slice(s, e).reduce((a, x) => a + x, 0);
    for (let k = s; k < e; k++) p[k] = p[k] + (have > 0 ? need * p[k] / have : need / (e - s));
    if (!others.length) continue;
    for (const k of others) p[k] = p[k] - need / others.length;
  }
}
function fixedMins(cells, w) {
  const out = [...w];
  const locked = /* @__PURE__ */ new Set();
  for (let it = 0; it < 4; it++) {
    let changed = false;
    for (const c of cells.flat()) {
      if (c.pad === void 0) continue;
      const cols = Array.from({ length: Math.max(0, Math.min(out.length, c.col + c.span) - c.col) }, (_, k) => c.col + k);
      if (!cols.length) continue;
      const have = cols.reduce((a, k) => a + out[k], 0);
      const need = c.pad + 20 - have;
      if (need <= 0.5) continue;
      const donors = out.map((_, k) => k).filter((k) => !cols.includes(k) && !locked.has(k));
      const pool = donors.reduce((a, k) => a + out[k], 0);
      if (pool <= need) continue;
      for (const k of cols) {
        out[k] = out[k] + (have > 0 ? need * out[k] / have : need / cols.length);
        locked.add(k);
      }
      for (const k of donors) out[k] = out[k] - need * out[k] / pool;
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}
function columnWidths(cells, nCols, docGrid, tblW, fixed, base, avail) {
  return columnWidthsExact(cells, nCols, docGrid, tblW, fixed, base, avail).map((x) => Math.round(x));
}
function columnWidthsExact(cells, nCols, docGrid, tblW, fixed, base, avail) {
  const tw = prefOf(tblW);
  const T0 = tw === "dxa" ? tblW.w : tw === "pct" ? base * tblW.w / 5e3 : void 0;
  const all = cells.flat();
  if (fixed) {
    const gridSum = (c) => docGrid.slice(c.col, c.col + c.span).reduce((a, b) => a + b, 0);
    const tRef = T0 ?? base;
    const w = boundaryWidths(cells, nCols, (c) => {
      const k = prefOf(c.tcW);
      return k === "dxa" ? c.tcW.w : k === "pct" ? tRef * c.tcW.w / 5e3 : gridSum(c);
    });
    const sum = w.reduce((a, b) => a + b, 0);
    return fixedMins(cells, T0 !== void 0 && sum > 0 ? w.map((x) => x * T0 / sum) : w);
  }
  const m = /* @__PURE__ */ new Map();
  for (const c of all) m.set(c, c.measure());
  const g1 = boundaryWidths(cells, nCols, (c) => m.get(c).min, () => true);
  const minOf = (c) => m.get(c).min;
  if (all.length && all.every((c) => prefOf(c.tcW) === "pct")) {
    const T5 = T0 ?? Math.min(Math.max(...all.map((c) => m.get(c).max * 5e3 / c.tcW.w)), avail);
    const p2 = boundaryWidths(cells, nCols, (c) => T5 * c.tcW.w / 5e3);
    let room = T5;
    for (let j = 0; j < nCols; j++) {
      p2[j] = Math.max(0, Math.min(p2[j], room));
      room -= p2[j];
    }
    fitPctMins(p2, all, minOf, g1, () => true);
    const sp2 = p2.reduce((a, b) => a + b, 0);
    const cap = T0 !== void 0 && T0 > base + 0.5 ? Infinity : Math.max(T5, base);
    if (sp2 > cap + 0.5) return p2.map((x) => x * cap / sp2);
    return sp2 > 0 && T5 > sp2 + 0.5 ? p2.map((x) => x * T5 / sp2) : p2;
  }
  const frac = Array.from({ length: nCols }, (_, j) => {
    const own3 = all.filter((c) => c.span === 1 && c.col === j);
    if (!own3.some((c) => prefOf(c.tcW) === "pct") || own3.some((c) => prefOf(c.tcW) === "dxa")) return 0;
    return Math.max(...own3.filter((c) => prefOf(c.tcW) === "pct").map((c) => c.tcW.w / 5e3));
  });
  const isPct = frac.map((f) => f > 0);
  const kind = (c, T5) => {
    const k = prefOf(c.tcW);
    if (k === "pct") return c.span === 1 && isPct[c.col] ? { k: "pct", w: 0 } : { k: "dxa", w: T5 * c.tcW.w / 5e3 };
    return { k, w: k === "dxa" ? c.tcW.w : 0 };
  };
  const sumOf = (v, pick) => v.reduce((a, x, j) => a + (pick(j) ? x : 0), 0);
  const gMax = boundaryWidths(cells, nCols, (c) => m.get(c).max, () => true);
  const g3of = (T5) => boundaryWidths(cells, nCols, (c) => {
    const q = kind(c, T5);
    return q.k === "dxa" ? Math.max(q.w, m.get(c).min) : m.get(c).min;
  }, (c) => kind(c, T5).k !== "dxa");
  const g4of = (T5) => boundaryWidths(cells, nCols, (c) => {
    const q = kind(c, T5), mm = m.get(c);
    return q.k === "dxa" ? Math.max(q.w, mm.min) : q.k === "auto" ? mm.max : mm.min;
  }, (c) => kind(c, T5).k !== "dxa");
  let T4 = T0;
  if (T4 === void 0) {
    const g42 = g4of(0);
    const rest = sumOf(g42, (j) => !isPct[j]);
    const fr = Math.min(1, frac.reduce((a, b) => a + b, 0));
    let t = rest;
    if (fr > 0) {
      for (let j = 0; j < nCols; j++) if (isPct[j]) t = Math.max(t, gMax[j] / frac[j]);
      if (fr < 1) t = Math.max(t, rest / (1 - fr));
    }
    T4 = Math.min(t, avail);
  }
  const explicit = T0 !== void 0;
  const p = new Array(nCols).fill(0);
  if (isPct.some(Boolean)) {
    let room = T4 - sumOf(g1, (j) => !isPct[j]);
    for (let j = 0; j < nCols; j++) if (isPct[j]) {
      p[j] = Math.max(0, Math.min(frac[j] * T4, room));
      room -= p[j];
    }
    fitPctMins(p, all.filter((c) => c.span === 1), minOf, g1, (k) => isPct[k]);
  }
  const np = (j) => !isPct[j];
  if (!isPct.some((x) => !x)) {
    const sp2 = sumOf(p, () => true);
    return sp2 > 0 && T4 > sp2 + 0.5 ? p.map((x) => x * T4 / sp2) : p;
  }
  let R = T4 - sumOf(p, () => true);
  const g3 = g3of(T4), g4 = g4of(T4);
  const S1 = sumOf(g1, np), S3 = sumOf(g3, np), S4 = sumOf(g4, np);
  const lerp = (a, b, t) => a.map((x, j) => isPct[j] ? p[j] : x + (b[j] - x) * t);
  if (R >= S4 - 0.5) {
    const covered = (j) => all.some((c) => c.col <= j && c.col + c.span > j);
    const auto = Array.from({ length: nCols }, (_, j) => np(j) && covered(j) && !all.some((c) => c.col <= j && c.col + c.span > j && kind(c, T4).k !== "auto"));
    let grow = auto;
    if (!grow.some(Boolean)) grow = isPct.map((x, j) => !x && covered(j));
    const wsum = sumOf(g4, (j) => grow[j]);
    const n = grow.filter(Boolean).length;
    return g4.map((x, j) => isPct[j] ? p[j] : grow[j] ? x + (R - S4) * (wsum > 0 ? x / wsum : 1 / n) : x);
  }
  if (R >= S3) return lerp(g3, g4, (R - S3) / (S4 - S3));
  if (R >= S1) return lerp(g1, g3, S3 > S1 ? (R - S1) / (S3 - S1) : 0);
  if (all.some((c) => c.floor) && !isPct.some(Boolean) && !(explicit && T4 > avail) && S1 > avail + 0.5) {
    const pad2 = Array.from({ length: nCols }, (_, j) => Math.max(0, ...all.filter((c) => c.span === 1 && c.col === j).map((c) => c.pad ?? 0)));
    const inner = g1.map((x, j) => Math.max(0, x - pad2[j]));
    const si = inner.reduce((a, b) => a + b, 0), cut = S1 - avail;
    return g1.map((x, j) => x - (si > 0 ? cut * inner[j] / si : cut / nCols));
  }
  if (explicit) {
    if (!(S1 > avail + 0.5 && (tw === "pct" ? T4 <= avail + 0.5 : T4 < avail - 0.5))) return g3.map((x, j) => isPct[j] ? p[j] : x);
    R += avail - T4;
    T4 = avail;
  }
  const sg = docGrid.reduce((a, b) => a + b, 0);
  if (!isPct.some(Boolean) && Math.abs(sg - T4) <= Math.max(20, 5e-3 * T4)) return docGrid.map((x) => x * T4 / sg);
  return g1.map((x, j) => isPct[j] ? p[j] : S1 > 0 ? x * R / S1 : x);
}
function measureCell(ctx, cell, r, mar) {
  const blocks = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
  const env = { tablePPr: r.pPr, tableRPr: r.rPr };
  let min = 0, max = 0;
  ctx.pure(() => {
    for (const b of blocks) {
      if (b.type !== "paragraph") {
        const w2 = prefOf(b.tblPr?.tblW) === "dxa" ? b.tblPr.tblW.w : prefOf(b.tblPr?.tblW) === "pct" ? 0 : b.gridColsTwips.reduce((a, g) => a + g, 0);
        let nMin = 0;
        for (const row of b.rows) {
          let sum = 0;
          for (const c of row.cells) sum += measureCell(ctx, c, { pPr: {}, rPr: {} }, 216).min;
          nMin = Math.max(nMin, sum);
        }
        min = Math.max(min, prefOf(b.tblPr?.tblW) === "dxa" ? w2 : nMin);
        max = Math.max(max, w2);
        continue;
      }
      const w = paraContentWidths(prepareParagraph(ctx, b.paragraph, env), ctx.fmt.settings.defaultTabStop);
      const ow = anchoredWidth(ctx, b.paragraph);
      min = Math.max(min, w.min, ow);
      max = Math.max(max, w.max, ow);
    }
  });
  return { min: Math.max(6, Math.ceil(min - 1e-6)) + mar, max: Math.max(6, Math.ceil(max - 1e-6)) + mar };
}
function anchoredWidth(ctx, para2) {
  let w = 0;
  for (const run2 of para2.runs) {
    const t = run2.image ?? run2.shape ?? run2.group ?? run2.textbox;
    const anc = t?.anchor;
    if (!t?.floating || !anc || anc.wrap === "none" || anc.wrap === "inline" || anc.layoutInCell === false) continue;
    let ow = t.widthTwips;
    const tb = run2.textbox;
    if (tb?.autoFit && tb.noWrap) {
      let tw = 0;
      for (const tp of tb.paras) tw = Math.max(tw, paraContentWidths(prepareParagraph(ctx, tp, {}), ctx.fmt.settings.defaultTabStop).max);
      ow = tw + (tb.insets?.l ?? 144) + (tb.insets?.r ?? 144);
    }
    w = Math.max(w, ow);
  }
  return w;
}
function paraContentWidths(p, defaultTab) {
  const tabs = p.tabs.filter((t) => t.val !== "bar").map((t) => t.pos).sort((a, b) => a - b);
  const dts = defaultTab > 0 ? defaultTab : 720;
  const nextTab2 = (x2) => {
    const t = tabs.find((pos) => pos > x2 + 0.5);
    if (p.firstLine < 0 && p.indLeft > x2 + 0.5 && (t === void 0 || p.indLeft < t)) return p.indLeft;
    if (t !== void 0) return t;
    return (Math.floor(Math.max(x2, tabs.length ? tabs[tabs.length - 1] : x2) / dts + 1e-6) + 1) * dts;
  };
  let x = p.indLeft + p.firstLine;
  if (p.marker) {
    x += p.marker.width;
    if (p.marker.suff === "tab") x = nextTab2(x);
    else if (p.marker.suff === "space") x += p.markStyle.sizePt * 5;
  }
  let end = x, max = 0, min = 0, seg = 0, first = true;
  const x0 = x;
  const flush = () => {
    if (seg > 0) min = Math.max(min, seg + Math.max(0, first ? x0 : p.indLeft) + p.indRight);
    if (seg > 0) first = false;
    seg = 0;
  };
  for (const g of p.glyphs) {
    if (g.kind === "pb" || g.kind === "cb") continue;
    if (g.kind === "lb") {
      flush();
      max = Math.max(max, end + p.indRight);
      x = p.indLeft;
      end = x;
      continue;
    }
    if (g.kind === "tab") {
      flush();
      x = nextTab2(x);
      continue;
    }
    x += g.adv;
    if (g.kind === "space") {
      flush();
      continue;
    }
    end = x;
    seg += g.adv;
    if (g.breakAfter) flush();
  }
  flush();
  max = Math.max(max, end + p.indRight);
  return { min, max };
}
function isHiddenRow(ctx, row) {
  if (!row.trPr?.hidden) return false;
  return row.cells.every((c) => (c.blocks ?? c.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }))).every((b) => {
    if (b.type !== "paragraph") return false;
    const v = paraVisibility(ctx, b.paragraph, {});
    return v.markHidden && !v.visible;
  }));
}
function layoutTable(ctx, table0, frameX, frameWidth, layoutCell, ref) {
  const table2 = table0.rows.some((r) => r.trPr?.hidden) ? { ...table0, rows: table0.rows.filter((r) => !isHiddenRow(ctx, r)) } : table0;
  const theme = ctx.fmt.theme;
  const direct = table2.tblPr ?? {};
  const style = ctx.resolver.tableStyle(direct.tblStyle);
  const tblPr = mergeTblPr(style.tblPr, direct);
  const look = { ...DEFAULT_LOOK, ...direct.tblLook ?? style.tblPr.tblLook ?? {} };
  const defMar = style.hasStyle ? 0 : 108;
  const noVaSp = ctx.fmt.settings.compatibilityMode < 15 && !!ctx.fmt.settings.compat["doNotVertAlignCellWithSp"];
  const vaOf = (c, v) => noVaSp && c?.shape ? void 0 : v;
  const nRows = table2.rows.length;
  const usedCols = Math.max(1, ...table2.rows.map((r) => r.cells.reduce((s, c) => s + Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1), 0) + (r.trPr?.gridBefore ?? 0) + (r.trPr?.gridAfter ?? 0)));
  let docGrid = table2.gridColsTwips.slice();
  if (!docGrid.length || docGrid.every((g) => g <= 0)) {
    const total = widthTw(tblPr.tblW, frameWidth) || frameWidth;
    docGrid = Array.from({ length: usedCols }, () => total / usedCols);
  } else if (docGrid.length < usedCols) {
    const avg = docGrid.reduce((a, b) => a + b, 0) / docGrid.length;
    while (docGrid.length < usedCols) docGrid.push(avg);
  }
  const nCols = docGrid.length;
  const slots = [];
  table2.rows.forEach((row, ri) => {
    const rowSlots = [];
    let col = row.trPr?.gridBefore ?? 0;
    for (const cell of row.cells) {
      const tc = cell.tcPr ?? {};
      const span = Math.max(1, tc.gridSpan ?? cell.gridSpan ?? 1);
      const prev = rowSlots[rowSlots.length - 1];
      if (tc.hMerge === "continue" && prev && prev.col + prev.span === col) {
        prev.span += span;
        col += span;
        continue;
      }
      rowSlots.push({ cell, col, lcol: col, span, row: ri, tcPr: tc, rowSpan: 1, merged: tc.vMerge === "continue" });
      col += span;
    }
    slots.push(rowSlots);
  });
  const rtl = !!tblPr.bidiVisual;
  if (rtl) {
    for (const rs of slots) {
      for (const sl of rs) sl.col = nCols - sl.lcol - sl.span;
      rs.reverse();
    }
    docGrid.reverse();
  }
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]) {
      if (s.tcPr.vMerge !== "restart") continue;
      let k = ri + 1;
      while (k < slots.length && slots[k].some((o) => o.col === s.col && o.merged)) k++;
      s.rowSpan = k - ri;
    }
  }
  const rowBand = Math.max(1, tblPr.tblStyleRowBandSize ?? 1);
  const colBand = Math.max(1, tblPr.tblStyleColBandSize ?? 1);
  const condFor = (ri, s) => {
    const out = ["wholeTable"];
    const firstRow = look.firstRow && ri === 0 || !!table2.rows[ri]?.trPr?.tblHeader && look.firstRow;
    const lastRow = look.lastRow && ri === nRows - 1;
    const firstCol = look.firstColumn && s.lcol === 0;
    const lastCol = look.lastColumn && s.lcol + s.span >= nCols;
    if (!look.noVBand) {
      const c0 = s.lcol - (look.firstColumn ? 1 : 0);
      if (c0 >= 0 && !(lastCol && look.lastColumn)) out.push(Math.floor(c0 / colBand) % 2 === 0 ? "band1Vert" : "band2Vert");
    }
    if (!look.noHBand) {
      const r0 = ri - (look.firstRow ? 1 : 0);
      if (r0 >= 0 && !lastRow) out.push(Math.floor(r0 / rowBand) % 2 === 0 ? "band1Horz" : "band2Horz");
    }
    if (firstCol) out.push("firstCol");
    if (lastCol) out.push("lastCol");
    if (firstRow) out.push("firstRow");
    if (lastRow) out.push("lastRow");
    if (firstRow && firstCol) out.push("nwCell");
    if (firstRow && lastCol) out.push("neCell");
    if (lastRow && firstCol) out.push("swCell");
    if (lastRow && lastCol) out.push("seCell");
    return COND_ORDER.filter((t) => out.includes(t));
  };
  const resolved = /* @__PURE__ */ new Map();
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]) {
      let tcPr = style.tcPr;
      let pPr = style.pPr;
      let rPr = style.rPr;
      for (const c of condFor(ri, s)) {
        const part = style.cond[c];
        if (!part) continue;
        tcPr = mergeTcPr(tcPr, part.tcPr);
        pPr = mergePPr(pPr, part.pPr);
        rPr = mergeRPr(rPr, part.rPr);
      }
      const merged = mergeTcPr(tcPr, s.tcPr);
      resolved.set(s, { tcPr: rtl ? { ...merged, ...merged.tcBorders ? { tcBorders: swapLR(merged.tcBorders) } : {}, ...merged.tcMar ? { tcMar: swapLR(merged.tcMar) } : {} } : merged, pPr, rPr });
    }
  }
  const tblBorders = (rtl ? swapLR(tblPr.tblBorders) : tblPr.tblBorders) ?? {};
  const exBorders = (ri) => rtl ? swapLR(table2.rows[ri]?.tblPrEx?.tblBorders) : table2.rows[ri]?.tblPrEx?.tblBorders;
  const cellMarOf = (m) => rtl ? swapLR(m) : m;
  const edge = (s, side) => {
    const own3 = resolved.get(s)?.tcPr.tcBorders?.[side];
    if (own3) return own3;
    const exb = exBorders(s.row);
    const tb = exb ? { ...tblBorders, ...exb } : tblBorders;
    const isOuter = side === "top" ? s.row === 0 : side === "bottom" ? s.row + s.rowSpan >= nRows : side === "left" ? s.col === 0 : s.col + s.span >= nCols;
    return isOuter ? tb[side] : side === "top" || side === "bottom" ? tb.insideH : tb.insideV;
  };
  const heavier = (a, b) => borderWidth(b) > borderWidth(a) ? b : a;
  const covering = (ri, c0, c1) => (slots[ri] ?? []).filter((o) => o.col < c1 && o.col + o.span > c0);
  const topWinner = (s) => {
    let w;
    if (s.row > 0) for (const u of covering(s.row - 1, s.col, s.col + s.span)) w = heavier(w, edge(u, "bottom"));
    return heavier(w, edge(s, "top"));
  };
  const band = [];
  for (let k = 0; k <= nRows; k++) {
    let m = 0;
    if (k === nRows) for (const s of slots[nRows - 1] ?? []) m = Math.max(m, borderWidth(edge(s, "bottom")));
    else for (const s of slots[k] ?? []) {
      if (!s.merged) m = Math.max(m, borderWidth(topWinner(s)));
      else for (const u of covering(k - 1, s.col, s.col + s.span)) m = Math.max(m, borderWidth(edge(u, "bottom")));
    }
    band.push(m);
  }
  const legacy = ctx.fmt.settings.compatibilityMode < 15 && !/\/r\d+\/c\d+/.test(ref);
  const row0 = slots[0] ?? [];
  const sFirst = row0[0], sLast = row0[row0.length - 1];
  const marOf = (s, side) => {
    const ex = table2.rows[s.row]?.tblPrEx;
    const m = resolved.get(s)?.tcPr.tcMar?.[side] ?? cellMarOf(ex?.tblCellMar)?.[side] ?? cellMarOf(tblPr.tblCellMar)?.[side];
    return widthTw(m, frameWidth) ?? defMar;
  };
  const bL = sFirst ? borderWidth(edge(sFirst, "left")) : 0;
  const bR = sLast ? borderWidth(edge(sLast, "right")) : 0;
  const effL = sFirst ? Math.max(marOf(sFirst, "left"), bL / 2) : 108;
  const effR = sLast ? Math.max(marOf(sLast, "right"), bR / 2) : 108;
  const base = legacy ? frameWidth + effL + effR : frameWidth - (bL + bR) / 2;
  const spacingOf = (ri) => widthTw(table2.rows[ri]?.trPr?.tblCellSpacing ?? tblPr.tblCellSpacing, frameWidth) ?? 0;
  const rawMeasure = /* @__PURE__ */ new Map();
  const padOf = (s) => ["left", "right"].reduce((a, side) => a + (spacingOf(s.row) > 0 ? marOf(s, side) : Math.max(marOf(s, side), borderWidth(edge(s, side)) / 2)), 0);
  const rawOf = (s) => {
    let mm = rawMeasure.get(s);
    if (!mm) rawMeasure.set(s, mm = measureCell(ctx, s.cell, resolved.get(s), padOf(s)));
    return mm;
  };
  const geoCells = slots.map((rs, ri) => {
    const sp2 = spacingOf(ri);
    const out = rs.map((s) => {
      const tcW0 = resolved.get(s)?.tcPr.tcW;
      const exSp = sp2 > 0 ? 2 * sp2 + (s.col === 0 ? sp2 : 0) + (s.col + s.span >= nCols ? sp2 : 0) : 0;
      const ex = sp2 > 0 ? exSp + borderWidth(edge(s, "left")) + borderWidth(edge(s, "right")) : 0;
      const tcW = tcW0 && exSp && prefOf(tcW0) === "dxa" ? { ...tcW0, w: tcW0.w + exSp } : tcW0;
      const nw = !!resolved.get(s)?.tcPr.noWrap;
      const noWrap = nw && prefOf(tcW0) !== "dxa";
      const floorW = nw && prefOf(tcW0) === "dxa" ? tcW0.w : 0;
      const tdir = resolved.get(s)?.tcPr.textDirection;
      const vertical = !!verticalDir(tdir);
      const measure = () => {
        if (vertical) {
          const rr = resolved.get(s);
          const c = ctx.pure(() => layoutCell(s.cell, 0, 31680, { tablePPr: rr.pPr, tableRPr: rr.rPr }, `${ref}/r${s.row}/c${s.lcol}`));
          const linesH = c.lines.reduce((a, l) => a + l.height, 0);
          const vh = c.lines.reduce((a, l) => a + Math.round(l.height * 37 / 36), 0) + Math.max(0, c.height - linesH);
          const w = vh + 6 + padOf(s);
          return { min: w + ex, max: w + ex };
        }
        const mm = rawOf(s);
        const fits = () => mm.max + rs.reduce((a, o) => a + (o === s ? 0 : rawOf(o).min), 0) <= base;
        const min = noWrap && fits() ? mm.max : Math.max(mm.min, floorW);
        return { min: min + ex, max: Math.max(mm.max, min) + ex };
      };
      return { col: s.col, span: s.span, ...tcW ? { tcW } : {}, measure, ...floorW ? { floor: true } : {}, pad: padOf(s) + ex };
    });
    const tr = table2.rows[ri]?.trPr;
    if (tr?.gridBefore && tr.wBefore?.type === "dxa" && tr.wBefore.w > 0) out.unshift({ col: 0, span: tr.gridBefore, tcW: tr.wBefore, measure: () => ({ min: 0, max: 0 }) });
    const end = rs.length ? rs[rs.length - 1].col + rs[rs.length - 1].span : 0;
    if (tr?.gridAfter && tr.wAfter?.type === "dxa" && tr.wAfter.w > 0) out.push({ col: end, span: tr.gridAfter, tcW: tr.wAfter, measure: () => ({ min: 0, max: 0 }) });
    return out;
  });
  const floating = !!tblPr.tblpPr && tblPr.tblpPr.tblpYSpec !== "inline";
  const jc = floating ? void 0 : tblPr.jc ?? table2.rows[0]?.trPr?.jc;
  const indent = floating || jc === "center" || jc === "right" || jc === "end" ? 0 : widthTw(tblPr.tblInd, frameWidth) ?? 0;
  const maxInd = legacy && jc === "center" && !floating ? widthTw(tblPr.tblInd, frameWidth) ?? 0 : indent;
  const grid = columnWidths(geoCells, nCols, docGrid, tblPr.tblW, tblPr.tblLayout === "fixed", base, base - maxInd);
  const width = grid.reduce((a, b) => a + b, 0);
  const colX = [0];
  for (const g of grid) colX.push(colX[colX.length - 1] + g);
  let x = frameX + indent + (legacy ? -effL : bL / 2);
  if (jc === "center") x = frameX + (frameWidth - width) / 2;
  else if (jc === "right" || jc === "end") x = frameX + frameWidth - width + (legacy ? effR : -bR / 2);
  if (rtl && !floating && jc !== "center") x = jc === "right" || jc === "end" ? frameX + (legacy ? -effL : bL / 2) : frameX + frameWidth - indent - width + (legacy ? effR : -bR / 2);
  const rowByRow = legacy && !floating && !!ctx.fmt.settings.compat["alignTablesRowByRow"];
  const rowShift = (ri) => {
    const rjc = table2.rows[ri]?.trPr?.jc ?? jc;
    const rs = slots[ri] ?? [];
    if (!rowByRow || !rs.length || rjc !== "center" && rjc !== "right" && rjc !== "end") return 0;
    const c0 = colX[Math.min(rs[0].col, nCols)], c1 = colX[Math.min(rs[rs.length - 1].col + rs[rs.length - 1].span, nCols)];
    const want = rjc === "center" ? frameX + (frameWidth - (c1 - c0)) / 2 : frameX + frameWidth - (c1 - c0) + effR;
    return want - (x + c0);
  };
  const separated = !!tblPr.tblCellSpacing || table2.rows.some((r) => !!r.trPr?.tblCellSpacing);
  const spRow = (ri) => widthTw(table2.rows[ri]?.trPr?.tblCellSpacing ?? tblPr.tblCellSpacing, width) ?? 0;
  const spTbl = widthTw(tblPr.tblCellSpacing ?? table2.rows.find((r) => r.trPr?.tblCellSpacing)?.trPr?.tblCellSpacing, width) ?? 0;
  const outerB = (ri, side) => exBorders(ri)?.[side] ?? tblBorders[side];
  const sepTop = [], sepBottom = [], sepWT = [], sepWB = [];
  if (separated) {
    for (let ri = 0; ri < nRows; ri++) {
      const sp2 = spRow(ri);
      let wT = 0, wB = 0;
      for (const sl of slots[ri] ?? []) {
        wT = Math.max(wT, borderWidth(edge(sl, "top")));
        wB = Math.max(wB, borderWidth(edge(sl, "bottom")));
      }
      sepWT.push(wT);
      sepWB.push(wB);
      sepTop.push((ri === 0 ? borderWidth(outerB(0, "top")) + sp2 : 0) + sp2 + wT);
      sepBottom.push(wB + sp2 + (ri === nRows - 1 ? sp2 + borderWidth(outerB(ri, "bottom")) : 0));
    }
  }
  const bandTopOf = (ri) => separated ? sepTop[ri] : band[ri];
  const bandBottomOf = (ri) => separated ? sepBottom[ri] : ri === nRows - 1 ? band[nRows] : 0;
  const g0 = colX[0], gn = colX[nCols];
  const sepB = (i) => i <= 0 ? g0 + spTbl : i >= nCols ? gn - spTbl : colX[i];
  const rows = [];
  const pendingMerges = [];
  const maxLineW = (c) => c.lines.reduce((m, l) => Math.max(m, l.x + l.width), 0);
  const layoutVertical = (s, avail, env, cref) => {
    const natural = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 31680, env, cref)));
    if (natural <= avail + 0.5) return layoutCell(s.cell, 0, Math.max(1, avail), env, cref);
    const longest = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 1, env, cref)));
    return layoutCell(s.cell, 0, Math.max(1, avail, longest), env, cref);
  };
  const rowHeights = [];
  table2.rows.forEach((row, ri) => {
    const ex = row.tblPrEx;
    const trp = { ...style.trPr, ...look.firstRow && ri === 0 ? style.cond.firstRow?.trPr : void 0, ...row.trPr };
    let contentH = 0;
    const cellInfos = [];
    const shiftR = rowShift(ri);
    for (const s of slots[ri]) {
      const { tcPr, pPr, rPr } = resolved.get(s);
      const bx0 = (separated ? sepB(Math.min(s.col, nCols)) + spTbl : colX[Math.min(s.col, nCols)]) + shiftR;
      const bx1 = (separated ? sepB(Math.min(s.col + s.span, nCols)) - spTbl : colX[Math.min(s.col + s.span, nCols)]) + shiftR;
      const x0r = bx0, x1r = bx1;
      const mar = { ...cellMarOf(tblPr.tblCellMar) ?? {}, ...cellMarOf(ex?.tblCellMar) ?? {}, ...tcPr.tcMar ?? {} };
      const marL = Math.max(widthTw(mar.left, width) ?? defMar, separated ? 0 : borderWidth(edge(s, "left")) / 2);
      const marR = Math.max(widthTw(mar.right, width) ?? defMar, separated ? 0 : borderWidth(edge(s, "right")) / 2);
      const marT = widthTw(mar.top, width) ?? 0;
      const marB = widthTw(mar.bottom, width) ?? 0;
      const wl = separated ? borderWidth(edge(s, "left")) : 0, wr = separated ? borderWidth(edge(s, "right")) : 0;
      const x0 = !separated ? x0r : spTbl > 0 ? x0r + wl : x0r + Math.max(wl - marL, wl / 2);
      const x1 = !separated ? x1r : spTbl > 0 ? x1r - wr : x1r - Math.max(wr - marR, wr / 2);
      const env = { tablePPr: pPr, tableRPr: rPr, ...isDark(cellFill(tcPr, theme)) ? { darkBackground: true } : {} };
      const vertical = verticalDir(tcPr.textDirection);
      const info = { slot: s, tcPr, x0, x1, bx0, bx1, marT, marB, marL, marR, env, ...vertical ? { vertical } : {} };
      if (!s.merged) {
        if (vertical) {
          if (s.rowSpan !== 1) pendingMerges.push({ slot: s, content: null, tcPr, x0, x1, startRow: ri, vertical, marL, marR, marT, marB, env });
        } else {
          const content = layoutCell(s.cell, x + x0 + marL, Math.max(1, x1 - x0 - marL - marR), { ...env, cellMar: { l: marL, r: marR, t: bandTopOf(ri) + marT } }, `${ref}/r${ri}/c${s.lcol}`);
          info.content = content;
          if (s.rowSpan === 1) contentH = Math.max(contentH, content.height + marT + marB);
          else pendingMerges.push({ slot: s, content, tcPr, x0, x1, startRow: ri, marL, marR, marT, marB, env });
        }
      }
      cellInfos.push(info);
    }
    const rowMarT = Math.max(0, ...cellInfos.map((ci) => ci.marT)), rowMarB = Math.max(0, ...cellInfos.map((ci) => ci.marB));
    for (const ci of cellInfos) {
      if (ci.marT === rowMarT && ci.marB === rowMarB) continue;
      ci.marT = rowMarT;
      ci.marB = rowMarB;
      if (ci.content && !ci.slot.merged && ci.slot.rowSpan === 1 && !ci.vertical) contentH = Math.max(contentH, ci.content.height + rowMarT + rowMarB);
    }
    for (const m of pendingMerges) if (m.startRow === ri) {
      m.marT = rowMarT;
      m.marB = rowMarB;
    }
    const th = row.trPr?.trHeight?.hRule === "auto" ? void 0 : row.trPr?.trHeight;
    let maxMar = 0, maxMarB = 0;
    for (const ci of cellInfos) {
      maxMar = Math.max(maxMar, ci.marT + ci.marB);
      maxMarB = Math.max(maxMarB, ci.marB);
    }
    for (const ci of cellInfos) {
      if (!ci.vertical || ci.slot.merged || ci.slot.rowSpan !== 1) continue;
      const rowMin = th ? th.val + (th.hRule === "exact" ? maxMarB : maxMar) : 0;
      const avail = Math.max(contentH, rowMin) - ci.marT - ci.marB;
      const c = layoutVertical(ci.slot, avail, ci.env, `${ref}/r${ri}/c${ci.slot.lcol}`);
      ci.content = c;
      if (th?.hRule !== "exact") contentH = Math.max(contentH, maxLineW(c) + ci.marT + ci.marB);
    }
    const rowKeepNext = cellInfos.some((ci) => ci.content?.keepNext);
    let h = contentH;
    if (th) {
      if (th.hRule === "exact") h = th.val;
      else h = Math.max(h, th.val + maxMar);
    }
    let minMarT = Infinity, ownTop = 0;
    for (const ci of cellInfos) {
      if (ci.slot.merged) continue;
      minMarT = Math.min(minMarT, ci.marT);
      ownTop = Math.max(ownTop, borderWidth(edge(ci.slot, "top")));
    }
    const absorb = !separated && ri > 0 && ownTop === 0 && Number.isFinite(minMarT);
    const bandTop = absorb ? Math.max(0, bandTopOf(ri) - minMarT) : bandTopOf(ri);
    if (th?.hRule === "exact") h = Math.max(0, th.val - bandTop) + maxMarB;
    if (h <= 0) h = 0;
    const bandBottom = bandBottomOf(ri);
    for (const m of pendingMerges) {
      if (th?.hRule === "exact") break;
      if (m.startRow + m.slot.rowSpan - 1 !== ri || !m.content) continue;
      const spanned = rowHeights.slice(m.startRow).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) + bandTop + h;
      const need = m.content.height + m.marT + m.marB;
      if (need > spanned) h += need - spanned;
    }
    rowHeights.push(bandTop + h + bandBottom);
    const cellBoxes = () => cellInfos.map((ci) => ({ ref: `${ref}/r${ri}/c${ci.slot.lcol}`, x: x + ci.bx0, w: ci.bx1 - ci.bx0, span: ci.slot.span }));
    const paintRow = (ch, contents, vTop, drawTop, bTop, bBottom) => {
      const nest = [];
      const nestOf = (c, va, marT, marB) => {
        if (!c.nest?.length) return;
        const dy = contentDy(c, va, ch, marT, marB, bTop);
        for (const nr of c.nest) for (const b of nr.row.cells ?? []) nest.push({ ...b, dy: dy + nr.top + (b.dy ?? 0), h: b.h ?? nr.row.height });
      };
      const its = [];
      const lns = [];
      const brd = [];
      const brk = [];
      const rh = bTop + ch + bBottom;
      const mergeAt = [];
      if (separated) {
        const cy0 = bTop - sepWT[ri], cy1 = bTop + ch + (bBottom > 0 ? sepWB[ri] : 0);
        const tblFill = shdFill(tblPr.shd, theme);
        if (tblFill) {
          const xl2 = x + g0, xr2 = x + gn;
          const strip = (x0, y0, x1, y1) => {
            if (x1 - x0 > 0.01 && y1 - y0 > 0.01) its.push({ t: "rect", x: x0, y: y0, w: x1 - x0, h: y1 - y0, fill: tblFill });
          };
          strip(xl2, 0, xr2, cy0);
          strip(xl2, cy1, xr2, rh);
          let cx = xl2;
          for (const ci of [...cellInfos].sort((a, b) => a.bx0 - b.bx0)) {
            strip(cx, cy0, x + ci.bx0, cy1);
            cx = Math.max(cx, x + ci.bx1);
          }
          strip(cx, cy0, xr2, cy1);
        }
        for (const ci of cellInfos) {
          const s = ci.slot;
          if (s.merged) continue;
          const fill = cellFill(ci.tcPr, theme);
          const content = contents.get(s);
          if (fill) its.push({ t: "rect", x: x + ci.bx0, y: cy0, w: ci.bx1 - ci.bx0, h: cy1 - cy0, fill });
          if (s.rowSpan > 1) mergeAt.push({ col: s.col, at: its.length, endRow: ri + s.rowSpan - 1 });
          if (s.rowSpan === 1) {
            if (content && ci.vertical) paintVertical(its, content, ci.vertical, vaOf(content, ci.tcPr.vAlign), x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
            else if (content) {
              placeContent(its, lns, content, vTop ? "top" : vaOf(content, ci.tcPr.vAlign), ch, ci.marT, ci.marB, bTop);
              nestOf(content, vTop ? "top" : vaOf(content, ci.tcPr.vAlign), ci.marT, ci.marB);
            }
          }
          const bT = edge(s, "top"), bB = edge(s, "bottom"), bL2 = edge(s, "left"), bR2 = edge(s, "right");
          if (drawTop && bT) paintBorder(ctx, brd, bT, x + ci.bx0, cy0 + borderWidth(bT) / 2, x + ci.bx1, cy0 + borderWidth(bT) / 2, "top");
          if (bBottom > 0 && bB) paintBorder(ctx, brd, bB, x + ci.bx0, cy1 - borderWidth(bB) / 2, x + ci.bx1, cy1 - borderWidth(bB) / 2, "bottom");
          if (bL2) paintBorder(ctx, brd, bL2, x + ci.bx0 + borderWidth(bL2) / 2, cy0, x + ci.bx0 + borderWidth(bL2) / 2, cy1, "left");
          if (bR2) paintBorder(ctx, brd, bR2, x + ci.bx1 - borderWidth(bR2) / 2, cy0, x + ci.bx1 - borderWidth(bR2) / 2, cy1, "right");
        }
        const oL = outerB(ri, "left"), oR = outerB(ri, "right"), oT = outerB(ri, "top"), oB = outerB(ri, "bottom");
        const xl = x + g0, xr = x + gn;
        paintBorder(ctx, brd, oL, xl, 0, xl, rh, "left");
        paintBorder(ctx, brd, oR, xr, 0, xr, rh, "right");
        if (ri === 0 && drawTop) paintBorder(ctx, brd, oT, xl - borderWidth(oL) / 2, borderWidth(oT) / 2, xr + borderWidth(oR) / 2, borderWidth(oT) / 2, "top");
        if (ri === nRows - 1 && bBottom > 0) paintBorder(ctx, brd, oB, xl - borderWidth(oL) / 2, rh - borderWidth(oB) / 2, xr + borderWidth(oR) / 2, rh - borderWidth(oB) / 2, "bottom");
        return {
          height: rh,
          items: its,
          lines: lns,
          borderItems: brd,
          breakBorderItems: brk,
          cantSplit: !!trp.cantSplit,
          header: !!trp.tblHeader,
          cells: [...cellBoxes(), ...nest],
          ...mergeAt.length ? { mergeAt } : {},
          ...rowKeepNext ? { keepNext: true } : {},
          natural: bTop + Math.min(ch, contentH) + bBottom
        };
      }
      const topBrd = [], ownBrd = [];
      let ownBand = 0;
      for (const ci of cellInfos) {
        const s = ci.slot;
        const fill = cellFill(ci.tcPr, theme);
        const content = contents.get(s);
        if (!s.merged && s.rowSpan > 1) mergeAt.push({ col: s.col, at: its.length, endRow: ri + s.rowSpan - 1 });
        if (!s.merged && s.rowSpan === 1) {
          if (fill) its.push({ t: "rect", x: x + ci.x0, y: 0, w: ci.x1 - ci.x0, h: rh, fill });
          if (content && ci.vertical) paintVertical(its, content, ci.vertical, vaOf(content, ci.tcPr.vAlign), x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
          else if (content) {
            placeContent(its, lns, content, vTop ? "top" : vaOf(content, ci.tcPr.vAlign), ch, ci.marT, ci.marB, bTop);
            nestOf(content, vTop ? "top" : vaOf(content, ci.tcPr.vAlign), ci.marT, ci.marB);
          }
        }
        const tcb = ci.tcPr.tcBorders;
        const top = drawTop ? s.merged ? void 0 : topWinner(s) : edge(s, "top") ?? edge(s, "bottom");
        const nb = brd.length;
        if (top) paintBorder(ctx, brd, top, x + ci.x0, borderWidth(top) / 2, x + ci.x1, borderWidth(top) / 2, "top");
        if (drawTop && ri > 0) {
          topBrd.push(...brd.slice(nb));
          const own3 = edge(s, "top");
          ownBand = Math.max(ownBand, borderWidth(own3));
          if (own3 && !s.merged) paintBorder(ctx, ownBrd, own3, x + ci.x0, borderWidth(own3) / 2, x + ci.x1, borderWidth(own3) / 2, "top");
        }
        const bottom = edge(s, "bottom");
        const lastOfMerge = !slots[ri + 1]?.some((o) => o.col === s.col && o.merged);
        if (bBottom > 0) {
          const b = bottom ?? edge(s, "top");
          paintBorder(ctx, brd, b, x + ci.x0, rh - bBottom + borderWidth(b) / 2, x + ci.x1, rh - bBottom + borderWidth(b) / 2, "bottom");
        } else if (lastOfMerge) {
          let w = bottom;
          for (const d of covering(ri + 1, s.col, s.col + s.span)) w = heavier(w, edge(d, "top"));
          if (w) paintBorder(ctx, brk, w, x + ci.x0, rh + borderWidth(w) / 2, x + ci.x1, rh + borderWidth(w) / 2, "bottom");
        }
        const prev = slots[ri]?.find((o) => o.col + o.span === s.col);
        const next = slots[ri]?.some((o) => o.col === s.col + s.span);
        const left = prev ? heavier(edge(prev, "right"), edge(s, "left")) : edge(s, "left"), right = edge(s, "right");
        paintBorder(ctx, brd, left, x + ci.x0, 0, x + ci.x0, rh, "left");
        if (!next) paintBorder(ctx, brd, right, x + ci.x1, 0, x + ci.x1, rh, "right");
        if (tcb?.tl2br) paintBorder(ctx, brd, tcb.tl2br, x + ci.x0, bTop, x + ci.x1, rh - bBottom);
        if (tcb?.tr2bl) paintBorder(ctx, brd, tcb.tr2bl, x + ci.x1, bTop, x + ci.x0, rh - bBottom);
      }
      return {
        height: rh,
        items: its,
        lines: lns,
        borderItems: brd,
        breakBorderItems: brk,
        cantSplit: !!trp.cantSplit,
        header: !!trp.tblHeader,
        cells: [...cellBoxes(), ...nest],
        ...mergeAt.length ? { mergeAt } : {},
        ...rowKeepNext ? { keepNext: true } : {},
        natural: bTop + Math.min(ch, contentH) + bBottom,
        ...drawTop && ri > 0 && bTop - ownBand > 0.5 ? { topCut: bTop - ownBand, topBorders: topBrd, ownTopBorders: ownBrd } : {}
      };
    };
    const full = new Map(cellInfos.map((ci) => [ci.slot, ci.content]));
    const canSplit = !trp.cantSplit && row.trPr?.trHeight?.hRule !== "exact";
    let brkW = 0;
    if (!separated) {
      for (const ci of cellInfos) {
        const s = ci.slot;
        if (slots[ri + 1]?.some((o) => o.col === s.col && o.merged)) continue;
        let w = edge(s, "bottom");
        for (const d of covering(ri + 1, s.col, s.col + s.span)) w = heavier(w, edge(d, "top"));
        brkW = Math.max(brkW, borderWidth(w));
      }
    }
    const minRow = th && th.hRule !== "exact" ? bandTop + th.val + maxMar + bandBottom : 0;
    const build = (ch, contents, vTop, drawTop) => {
      const r = paintRow(ch, contents, vTop, drawTop, bandTop, bandBottom);
      if (brkW > 0 && ri < nRows - 1) r.breakW = brkW;
      if (!canSplit) return r;
      r.split = (avail) => {
        if (drawTop && minRow > avail + 0.5) return null;
        const a = /* @__PURE__ */ new Map();
        const rest = /* @__PURE__ */ new Map();
        let h1 = 0, h2 = 0, any = false;
        const availContent = avail - bandTop;
        for (const ci of cellInfos) {
          const c = contents.get(ci.slot);
          if (!c || ci.slot.merged || ci.slot.rowSpan !== 1) {
            a.set(ci.slot, c);
            continue;
          }
          const sp2 = splitContent(c, availContent - ci.marT - ci.marB - brkW);
          if (!sp2) {
            if (c.lines.length) return null;
            rest.set(ci.slot, c);
            h2 = Math.max(h2, c.height + ci.marT + ci.marB);
            continue;
          }
          any = true;
          a.set(ci.slot, sp2[0]);
          rest.set(ci.slot, sp2[1]);
          h1 = Math.max(h1, sp2[0].height + ci.marT + ci.marB);
          h2 = Math.max(h2, sp2[1].height + ci.marT + ci.marB);
        }
        if (!any) return null;
        const first = paintRow(h1, a, false, drawTop, bandTop, 0);
        first.borderItems.push(...first.breakBorderItems ?? []);
        first.breakBorderItems = [];
        return [first, build(Math.max(h2, 1, th && th.hRule !== "exact" ? th.val + maxMar : 0), rest, false, false)];
      };
      return r;
    };
    rows.push(build(h, full, false, true));
  });
  for (const m of pendingMerges) {
    const endRow = m.startRow + m.slot.rowSpan - 1;
    const h = rowHeights.slice(m.startRow, endRow + 1).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) - bandBottomOf(endRow);
    const first = rows[m.startRow];
    const target = rows[endRow] ?? first;
    const fill = cellFill(m.tcPr, theme);
    if (fill) {
      const item = { t: "rect", x: x + m.x0, y: 0, w: m.x1 - m.x0, h, fill };
      first.items.unshift(item);
      for (const a of first.mergeAt ?? []) a.at++;
      if (!first.header) (first.mergeFills ??= []).push({ item, end: endRow });
    }
    const { marT, marB } = m;
    const top = bandTopOf(m.startRow) - rowHeights.slice(m.startRow, Math.min(endRow, rows.length - 1)).reduce((a, b) => a + b, 0);
    if (m.vertical) {
      const c = layoutVertical(m.slot, h - marT - marB, m.env, `${ref}/r${m.startRow}/c${m.slot.lcol}`);
      paintVertical(target.items, c, m.vertical, vaOf(c, m.tcPr.vAlign), x + m.x0 + m.marL, x + m.x1 - m.marR, top + marT, top + h - marB);
    } else if (m.content) {
      const i0 = target.items.length, l0 = target.lines.length;
      placeContent(target.items, target.lines, m.content, vaOf(m.content, m.tcPr.vAlign), h, marT, marB, top);
      if (target !== first) (target.mergeText ??= []).push({ col: m.slot.col, items: target.items.slice(i0), lines: target.lines.slice(l0), dy: rowHeights.slice(m.startRow, endRow).reduce((a, b) => a + b, 0), start: m.startRow, content: m.content, marT, band: bandTopOf(m.startRow), ...vaOf(m.content, m.tcPr.vAlign) ? { vAlign: vaOf(m.content, m.tcPr.vAlign) } : {} });
    }
  }
  const borderLeft = slots[0]?.[0] ? borderWidth(edge(slots[0][0], "left")) : 0;
  return { x, width, rows, borderLeft, ...legacy ? { effR } : {}, ...tblPr.tblpPr ? { tblpPr: tblPr.tblpPr } : {} };
}
function cellFill(tcPr, theme) {
  return shdFill(tcPr.shd, theme);
}
var shdFill = (shd, theme) => shadingFill(shd, theme);
function swapLR(o) {
  if (!o) return o;
  const { left, right, ...rest } = o;
  return { ...rest, ...right !== void 0 ? { left: right } : {}, ...left !== void 0 ? { right: left } : {} };
}
function verticalDir(td) {
  if (td === "btLr" || td === "lr") return "btLr";
  if (td === "tbRl" || td === "tbRlV" || td === "tbLrV" || td === "rl" || td === "rlV" || td === "lrV") return "tbRl";
  return void 0;
}
function paintVertical(items, c, dir, vAlign, left, right, top, bottom) {
  const free = right - left - c.height;
  const off = vAlign === "center" ? free / 2 : vAlign === "bottom" ? free : 0;
  const m = dir === "btLr" ? [0, -1, 1, 0, left, bottom] : [0, 1, -1, 0, right, top];
  items.push({ t: "xform", op: "push", m });
  for (const it of c.items) items.push(shiftItem(it, Math.max(0, off)));
  items.push({ t: "xform", op: "pop" });
}
function contentDy(c, vAlign, rowH, marT, marB, y0 = 0) {
  let dy = y0 + marT;
  const free = rowH - marT - marB - (c.alignH ?? c.height);
  if (vAlign === "center" && free > 0) dy += free / 2;
  else if (vAlign === "bottom" && free > 0) dy += free;
  return dy;
}
function placeContent(items, lines, c, vAlign, rowH, marT, marB, y0 = 0) {
  if (!c) return;
  const dy = contentDy(c, vAlign, rowH, marT, marB, y0);
  for (const it of c.items) items.push(shiftItem(it, dy));
  for (const l of c.lines) lines.push({ ...l, y: l.y + dy, baseline: l.baseline + dy });
}
function mergeTextFirst(rows, ri, row, moved, fits) {
  if (!row.mergeAt?.length) return row;
  let items = row.items, lines = row.lines;
  for (const m of [...row.mergeAt].sort((a, b) => b.at - a.at || b.col - a.col)) {
    const mt = rows[m.endRow]?.mergeText?.find((x) => x.col === m.col);
    if (!mt || !fits(rows.slice(ri, m.endRow + 1).reduce((a, r) => a + r.height, 0))) continue;
    if (items === row.items) {
      items = [...items];
      lines = [...lines];
    }
    const dy = mt.dy - (row.cut ?? 0);
    items.splice(m.at, 0, ...mt.items.map((it) => shiftItem(it, dy)));
    lines.push(...mt.lines.map((l) => ({ ...l, y: l.y + dy, baseline: l.baseline + dy })));
    for (const o of [...mt.items, ...mt.lines]) moved.add(o);
  }
  return items === row.items ? row : { ...row, items, lines };
}
function atPageTop(row) {
  const d = row.topCut ?? 0;
  if (d <= 0) return row;
  const h = row.height;
  const top = new Set(row.topBorders ?? []);
  const keep = new Set((row.mergeText ?? []).flatMap((m) => [...m.items, ...m.lines]));
  const cut = (it) => keep.has(it) ? it : it.t === "rect" && it.y === 0 ? { ...it, h: it.h - d } : it.t === "line" && it.y1 === 0 && it.y2 === h ? { ...it, y2: h - d } : shiftItem(it, -d);
  const { split: _s, topCut: _t, topBorders: _b, ownTopBorders: _o, ...rest } = row;
  const items = row.items.map(cut);
  return {
    ...rest,
    height: h - d,
    cut: d,
    items,
    ...row.mergeFills ? { mergeFills: row.mergeFills.map((f) => ({ ...f, item: items[row.items.indexOf(f.item)] })) } : {},
    lines: row.lines.map((l) => keep.has(l) ? l : { ...l, y: l.y - d, baseline: l.baseline - d }),
    borderItems: [...row.borderItems.filter((it) => !top.has(it)).map(cut), ...row.ownTopBorders ?? []],
    ...row.breakBorderItems ? { breakBorderItems: row.breakBorderItems.map((it) => shiftItem(it, -d)) } : {},
    ...row.natural !== void 0 ? { natural: row.natural - d } : {}
  };
}
function dropMoved(row, moved) {
  if (!moved.size || !row.mergeText) return row;
  return { ...row, items: row.items.filter((it) => !moved.has(it)), lines: row.lines.filter((l) => !moved.has(l)) };
}
var LATE_ITEMS = /* @__PURE__ */ new WeakMap();
function shiftItem(it, dy, dx = 0) {
  const out = shiftItem0(it, dy, dx);
  const m = out !== it ? LATE_ITEMS.get(it) : void 0;
  if (m) LATE_ITEMS.set(out, m);
  return out;
}
function shiftItem0(it, dy, dx) {
  switch (it.t) {
    case "glyphs":
      return { ...it, y: it.y + dy, glyphs: dx ? it.glyphs.map((g) => ({ ...g, x: g.x + dx })) : it.glyphs };
    case "rect":
    case "image":
    case "shape":
      return { ...it, x: it.x + dx, y: it.y + dy };
    case "line":
      return { ...it, x1: it.x1 + dx, x2: it.x2 + dx, y1: it.y1 + dy, y2: it.y2 + dy };
    case "clip":
      return it.y === void 0 ? it : { ...it, x: (it.x ?? 0) + dx, y: it.y + dy };
    case "xform": {
      if (!it.m) return it;
      const [a, b, c, d, e, f] = it.m;
      return { ...it, m: [a, b, c, d, e + dx - (a * dx + c * dy), f + dy - (b * dx + d * dy)] };
    }
    case "path":
      return { ...it, cmds: it.cmds.map((c) => c.op === "Z" ? c : c.op === "C" ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy }) };
  }
}

// ../docx-layout/src/frames.ts
var FRAME_INFO = /* @__PURE__ */ new WeakMap();
var FRAME_SKIP = /* @__PURE__ */ new WeakSet();
var FRAME_CARRY = /* @__PURE__ */ new WeakMap();
var INNER = /* @__PURE__ */ new WeakSet();
var runCache = /* @__PURE__ */ new WeakMap();
var anchorCache = /* @__PURE__ */ new WeakMap();
function frameOf(p) {
  const f = p.ppr?.framePr;
  if (!f || f.dropCap && f.dropCap !== "none" || INNER.has(p)) return void 0;
  return f;
}
var sameFrame = (a, b) => {
  const ks = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of ks) if (a[k] !== b[k]) return false;
  return true;
};
function frameRun(paras, f) {
  const hit = runCache.get(paras[0]);
  if (hit) return hit;
  const inner = paras.map((p) => {
    const ppr = { ...p.ppr };
    delete ppr.framePr;
    const q = { ...p, ppr };
    INNER.add(q);
    return q;
  });
  const hRule = f.hRule ?? (f.h ? "atLeast" : "auto");
  const wrap = f.wrap === "none" ? "none" : f.wrap === "notBeside" ? "topAndBottom" : "square";
  const hFrom = f.hAnchor === "page" ? "page" : f.hAnchor === "margin" ? "margin" : "column";
  const vFrom = f.vAnchor === "page" ? "page" : f.vAnchor === "text" ? "paragraph" : "margin";
  const hs = f.hSpace ?? 0, vs = f.vSpace ?? 0;
  const tb = {
    paras: inner,
    blocks: inner.map((paragraph) => ({ type: "paragraph", paragraph })),
    widthTwips: f.w ?? 0,
    heightTwips: f.h ?? 0,
    floating: true,
    insets: { l: 0, t: 0, r: 0, b: 0 },
    anchor: {
      // (o vão à esquerda da moldura mede 1 twip a menos — ws-a-fr-l18, ws-fr-l30)
      wrap,
      wrapText: "bothSides",
      distL: hs + 1,
      distR: hs,
      distT: vs,
      distB: vs,
      posH: { relativeFrom: hFrom, ...f.xAlign ? { align: f.xAlign } : { offset: f.x ?? 0 } },
      posV: { relativeFrom: vFrom, ...f.yAlign && f.yAlign !== "inline" ? { align: f.yAlign } : { offset: f.y ?? 0 } },
      layoutInCell: true,
      allowOverlap: true
    }
  };
  FRAME_INFO.set(tb, { autoWidth: !f.w, hRule: hRule === "exact" && f.h ? "exact" : hRule === "auto" || !f.h ? "auto" : "atLeast", h: f.h ?? 0 });
  const run2 = { text: "\uFFFC", props: { ...DEFAULT_RUN_PROPS }, textbox: tb };
  runCache.set(paras[0], run2);
  return run2;
}
function liftFrames(blocks, stops) {
  let out = null;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== "paragraph") continue;
    const f = frameOf(b.paragraph);
    if (!f) continue;
    const group = [b.paragraph];
    let j = i + 1;
    for (; j < blocks.length && !stops?.has(j - 1); j++) {
      const n = blocks[j];
      const nf = n.type === "paragraph" ? frameOf(n.paragraph) : void 0;
      if (!nf || !sameFrame(f, nf)) break;
      group.push(n.paragraph);
    }
    for (const p of group) FRAME_SKIP.add(p);
    const run2 = frameRun(group, f);
    let k = j;
    while (k < blocks.length && !stops?.has(k - 1)) {
      const n = blocks[k];
      if (n.type !== "paragraph" || !frameOf(n.paragraph)) break;
      k++;
    }
    const anchorB = k < blocks.length && !stops?.has(k - 1) ? blocks[k] : void 0;
    if (anchorB?.type === "paragraph") {
      out ??= blocks.slice();
      const cur = out[k];
      const src = cur.paragraph;
      let c = anchorCache.get(src);
      if (!c || !c.runs.includes(run2)) {
        const prevRuns = c?.runs ?? [];
        const runs = [...prevRuns, run2];
        const base = c ? c.para : src;
        const para2 = { ...base, runs: [...base.runs, run2] };
        c = { runs, para: para2 };
        anchorCache.set(src, c);
      }
      out[k] = { ...cur, paragraph: c.para };
    } else FRAME_CARRY.set(group[0], run2);
    i = j - 1;
  }
  return out ?? blocks;
}

// ../docx-layout/src/engine.ts
var balKey = (g) => g.balKey ?? g.index;
function polyBandIntervals(poly2, ya, yb) {
  const iv = [];
  const n = poly2.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = poly2[i], [x1, y1] = poly2[(i + 1) % n];
    const lo = Math.max(ya, Math.min(y0, y1)), hi = Math.min(yb, Math.max(y0, y1));
    if (lo > hi) continue;
    if (y0 === y1) {
      iv.push([Math.min(x0, x1), Math.max(x0, x1)]);
      continue;
    }
    const xa = x0 + (lo - y0) / (y1 - y0) * (x1 - x0), xb = x0 + (hi - y0) / (y1 - y0) * (x1 - x0);
    iv.push([Math.min(xa, xb), Math.max(xa, xb)]);
  }
  for (const yy of [ya, yb]) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = poly2[i], [x1, y1] = poly2[(i + 1) % n];
      if (y0 <= yy !== y1 <= yy) xs.push(x0 + (yy - y0) / (y1 - y0) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) iv.push([xs[k], xs[k + 1]]);
  }
  iv.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [a, b] of iv) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1e-6) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}
var zItems = (objs) => [...objs].sort((a, b) => a.z - b.z || a.seq - b.seq).flatMap((o) => o.items);
var CHAP_SEP = { hyphen: "-", period: ".", colon: ":", emDash: "\u2014", enDash: "\u2013" };
var sameChapters = (a, b) => a.size === b.size && [...a].every(([k, v]) => {
  const w = b.get(k);
  return !!w && w.length === v.length && v.every((x, i) => x.page === w[i].page && x.text === w[i].text);
});
var COL_SEP_W = 16.8;
function layoutDocument(full0, provider, opts = {}) {
  if (opts.revisions && opts.revisions.mode !== "final" && !opts.revisions.order) opts = { ...opts, revisions: { ...opts.revisions, order: revisionAuthors(full0) } };
  const fmt2 = full0.formatting ?? emptyFormatting();
  const lifted = liftFrames(full0.blocks, new Set(full0.sections.map((s) => s.blockEnd)));
  const full = lifted === full0.blocks ? full0 : { ...full0, blocks: lifted };
  let total = 1;
  let marks = /* @__PURE__ */ new Map();
  let result = null;
  let late = /* @__PURE__ */ new Map();
  let lateTables = /* @__PURE__ */ new Map();
  let noteMarks;
  let noteRefs = /* @__PURE__ */ new Map();
  const newCtx = () => {
    const c = new DocContext(fmt2, provider, opts);
    if (noteMarks) c.noteMarkOverride = noteMarks;
    return c;
  };
  let chaps = /* @__PURE__ */ new Map();
  let last = null;
  for (let pass = 0; pass < 5; pass++) {
    const eng = new Engine(newCtx(), full, total, marks, late, lateTables, /* @__PURE__ */ new Map(), noteRefs);
    eng.chaptersGuess = chaps;
    result = eng.run();
    last = eng;
    const newMarks = eng.usedPageRef ? eng.bookmarkPages() : marks;
    const newNoteRefs = eng.usedNoteRef ? eng.ctx.allNoteMarks() : noteRefs;
    const newLate = eng.lateFound.size ? mergeLate(late, eng.lateFound) : late;
    const newLateTables = eng.lateTablesFound.size ? new Map([...lateTables, ...eng.lateTablesFound]) : lateTables;
    const fix = eng.noteMarkFix();
    const newChaps = eng.usedChapter ? eng.chapterIndex() : chaps;
    const stable = (!eng.usedNumPages || result.pages.length === total) && (!eng.usedPageRef || sameMap(newMarks, marks)) && (!eng.usedNoteRef || sameMap(newNoteRefs, noteRefs)) && newLate === late && newLateTables === lateTables && !fix && (!eng.usedChapter || sameChapters(newChaps, chaps));
    if (stable) break;
    chaps = newChaps;
    total = result.pages.length;
    marks = newMarks;
    noteRefs = newNoteRefs;
    late = newLate;
    lateTables = newLateTables;
    if (fix) noteMarks = fix;
  }
  const balance = /* @__PURE__ */ new Map();
  const runWith = (bal) => {
    const eng = new Engine(newCtx(), full, total, marks, late, lateTables, bal, noteRefs);
    eng.chaptersGuess = chaps;
    result = eng.run();
    return eng;
  };
  const done = /* @__PURE__ */ new Set();
  for (let guard = 0; guard < 20 && last; guard++) {
    const next = [...last.balanceFound].find(([s2, i]) => !done.has(s2) && i.n > 1);
    if (!next) break;
    const [s, info] = next;
    done.add(s);
    let lo = Math.max(0, Math.floor(info.sum / info.n) - 1), hi = Math.ceil(info.bottom - info.colTop);
    if (hi <= lo + 1) continue;
    const fits = (h) => {
      const f = runWith(new Map([...balance, [s, { page: info.page, h }]])).balanceFound.get(s);
      return f?.page === info.page && f.used[f.used.length - 1] <= f.used[0] + 1;
    };
    if (!fits(hi)) continue;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    balance.set(s, { page: info.page, h: hi });
    last = runWith(balance);
  }
  return result;
}
function mergeLate(a, b) {
  const seen = new Set([...a.values()].flat());
  let out = null;
  for (const [pg, runs] of b) for (const r of runs) {
    if (seen.has(r)) continue;
    seen.add(r);
    out ??= new Map([...a].map(([k, v]) => [k, [...v]]));
    (out.get(pg) ?? out.set(pg, []).get(pg)).push(r);
  }
  return out ?? a;
}
function sameMap(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}
var Engine = class {
  constructor(ctx, full, totalPagesGuess, marksGuess = /* @__PURE__ */ new Map(), lateFloats = /* @__PURE__ */ new Map(), lateTables = /* @__PURE__ */ new Map(), balance = /* @__PURE__ */ new Map(), noteRefGuess = /* @__PURE__ */ new Map()) {
    this.ctx = ctx;
    this.full = full;
    this.totalPagesGuess = totalPagesGuess;
    this.marksGuess = marksGuess;
    this.lateFloats = lateFloats;
    this.lateTables = lateTables;
    this.balance = balance;
    this.noteRefGuess = noteRefGuess;
  }
  ctx;
  full;
  totalPagesGuess;
  marksGuess;
  lateFloats;
  lateTables;
  balance;
  noteRefGuess;
  pages = [];
  cur;
  col = 0;
  y = 0;
  /** topo da área de colunas corrente (muda numa seção contínua) */
  colTop = 0;
  atTop = true;
  /** topo de página que MANTÉM o espaço antes do próximo parágrafo (1º da seção
   *  nova, parágrafo que começa com quebra de página, quebra antes no modo ≤ 14):
   *  o "depois" do último parágrafo da página anterior, que o Word desconta —
   *  espaço = colapso(depois, antes) − depois (oráculo tocref-sectgap). null = suprime */
  topGapPrevAfter = null;
  prev = null;
  firstInDoc = true;
  usedNumPages = false;
  geoms = [];
  /** numeração de linhas: contador e onde foi zerado */
  lnCount = 0;
  lnPage = null;
  lnSect = -1;
  /** última linha de tabela emitida (borda de fechamento na quebra de página) */
  lastRowEmit = null;
  /** diagramando cabeçalho/rodapé (floats vão para as camadas do HF) */
  inHf = false;
  /** linhas de tabelas flutuantes que continuam na próxima página */
  floatCarry = [];
  /** tabela flutuante que parte: partes de linhas emitidas e mesclas verticais que
   *  atravessam a página (o texto flui pelas partes — oráculo ftvmsplit) */
  floatFlow = /* @__PURE__ */ new WeakMap();
  /** medição do rodapé: ignora flutuantes de posição absoluta */
  onlyTextFloats = false;
  /** flutuantes já posicionados antes do fluxo (posição vertical absoluta no HF) */
  prePlaced = /* @__PURE__ */ new Set();
  zSeq = 0;
  usedPageRef = false;
  /** campo PAGE com número de capítulo: títulos de cada nível por página (passada anterior) */
  chaptersGuess = /* @__PURE__ */ new Map();
  usedChapter = false;
  /** títulos numerados (estilo Título N) diagramados nesta passada: ref → nível e número */
  headingMarks = /* @__PURE__ */ new Map();
  usedNoteRef = false;
  /** seções de várias colunas seguidas de seção contínua: o que ocupam na última página */
  balanceFound = /* @__PURE__ */ new Map();
  /** alturas usadas pelas colunas já encerradas na porção da seção nesta página */
  colUsed = [];
  /** fundo do corpo antes do limite de coluna equilibrada (restaurado na seção seguinte) */
  balanceSaved = null;
  /** Limita a altura das colunas na última página de uma seção equilibrada. */
  applyBalance() {
    const spec = this.balance.get(balKey(this.cur.geom));
    if (!spec || spec.page !== this.pages.length - 1) return;
    this.balanceSaved = this.cur.bodyBottom;
    this.cur.bodyBottom = Math.min(this.cur.bodyBottom, this.colTop + spec.h);
  }
  /** flutuantes tardios achados nesta passada */
  lateFound = /* @__PURE__ */ new Map();
  lateTablesFound = /* @__PURE__ */ new Map();
  /** tabelas flutuantes do corpo já colocadas (blocos) */
  placedTables = /* @__PURE__ */ new Set();
  /** tabelas tardias (início da página) que partiram: a âncora vai para a continuação */
  lateSplit = /* @__PURE__ */ new Set();
  /** SEQ id [\* formato] [\r n] [\c] [\h] [\s n] — contadores na ordem do documento;
   *  \s n zera o contador se houve título de nível ≤ n desde a última vez que ele
   *  contou (oráculo refs-lab, sr-*: um título 2 não zera o \s 1). */
  seqValue(instr) {
    const tok = instr.trim().split(/\s+/);
    const id = tok[1]?.toLowerCase();
    if (!id || id.startsWith("\\")) return void 0;
    const reset = parseInt(/\\s\s*(\d)/i.exec(instr)?.[1] ?? "", 10);
    const since = this.ctx.seqHeads.get(id) ?? 0;
    if (reset && this.ctx.heads.slice(since).some((l) => l <= reset)) this.ctx.seqCounters.set(id, 0);
    this.ctx.seqHeads.set(id, this.ctx.heads.length);
    let v = this.ctx.seqCounters.get(id) ?? 0;
    const r = /\\r\s*(\d+)/i.exec(instr);
    if (r) v = parseInt(r[1], 10);
    else if (!/\\c\b/i.test(instr)) v++;
    this.ctx.seqCounters.set(id, v);
    if (/\\h\b/i.test(instr)) return "";
    const fmt2 = /\\\*\s*(\w+)/.exec(instr)?.[1] ?? "ARABIC";
    const map = { ARABIC: "decimal", ALPHABETIC: "upperLetter", alphabetic: "lowerLetter", ROMAN: "upperRoman", roman: "lowerRoman" };
    return formatNumber(v, map[fmt2] ?? "decimal", this.ctx.opts.lang);
  }
  /**
   * "acima"/"abaixo" (REF/NOTEREF \p): o campo vem depois do indicador ou antes
   * dele, na ordem do documento (oráculo refs-lab, xr-*-pos, xr-before). Sem a
   * posição do campo (cabeçalho, caixa), mantém o cache.
   */
  positionWord(bm, block, at) {
    const b = this.full.bookmarks?.get(bm);
    if (b === void 0 || block === void 0 || block < 0) return void 0;
    const off = this.full.bookmarkOffsets?.get(bm) ?? 0;
    const below = block < b || block === b && at !== void 0 && at < off;
    const pt = /^pt/i.test(this.ctx.opts.lang);
    return below ? pt ? "abaixo" : "below" : pt ? "acima" : "above";
  }
  /** NOTEREF indicador: a marca da nota cuja referência está no trecho do indicador. */
  noteRefValue(instr, block, at) {
    const bm = instr.trim().split(/\s+/)[1];
    if (!bm) return void 0;
    if (/\\p\b/i.test(instr)) return this.positionWord(bm, block, at);
    const b = this.full.bookmarks?.get(bm);
    const blk = b !== void 0 ? this.full.blocks[b] : void 0;
    if (!blk || blk.type !== "paragraph") return void 0;
    const from = this.full.bookmarkOffsets?.get(bm) ?? 0;
    const end = this.full.bookmarkEnds?.get(bm);
    const to = end && end.block === b ? end.offset : Infinity;
    let acc = 0;
    for (const r of blk.paragraph.runs) {
      const rs = acc;
      acc += r.text.length;
      if (!r.noteRef || r.noteRef.custom || rs < from || rs > to || rs === to && to > from) continue;
      this.usedNoteRef = true;
      const { kind, id } = r.noteRef;
      return this.ctx.noteMarkOf(kind, id) ?? this.noteRefGuess.get(`${kind[0]}${id}`);
    }
    return void 0;
  }
  /** REF indicador: o texto do trecho do indicador (sem o fim conhecido, o parágrafo
   *  dele); \n \r \w = número do parágrafo; \p = acima/abaixo. */
  refValue(instr, block, at) {
    const tok = instr.trim().split(/\s+/);
    const bm = tok[1];
    if (!bm) return void 0;
    if (/\\p\b/i.test(instr)) return this.positionWord(bm, block, at);
    if (/\\[nrw]\b/i.test(instr)) {
      const bi = this.full.bookmarks?.get(bm);
      if (bi === void 0 || this.full.blocks[bi]?.type !== "paragraph") return void 0;
      const m = this.listNumberOf(bi);
      if (!m?.text) return "0";
      const sep = /\\d\s+"([^"]*)"/i.exec(instr)?.[1];
      const t = /\\w\b/i.test(instr) && m.parts ? m.parts.join(sep ?? "") : m.text;
      return t.replace(/\.+$/, "");
    }
    const b = this.full.bookmarks?.get(bm);
    const blk = b !== void 0 ? this.full.blocks[b] : void 0;
    if (!blk || blk.type !== "paragraph") return void 0;
    const end = this.full.bookmarkEnds?.get(bm);
    const from = this.full.bookmarkOffsets?.get(bm);
    if (end && from !== void 0 && end.block === b) {
      let text2 = "", acc = 0;
      for (const x of blk.paragraph.runs) {
        const rs = acc;
        acc += x.text.length;
        if (x.image || x.textbox || x.shape || x.group) continue;
        text2 += x.text.slice(Math.max(0, from - rs), Math.max(0, end.offset - rs));
      }
      return text2 || void 0;
    }
    const text = blk.paragraph.runs.map((x) => x.field || x.image || x.textbox ? "" : x.text).join("").replace(/[\t\n\f\u000B]/g, " ").trim();
    return text || void 0;
  }
  /** número de lista de cada parágrafo do corpo (bloco → marcador), na ordem do documento */
  listTexts;
  listNumberOf(block) {
    if (!this.listTexts) {
      const out = /* @__PURE__ */ new Map();
      const saved = this.ctx.numbering;
      const st = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      this.ctx.numbering = st;
      const num = (para2) => {
        const n = resolvePPr(this.ctx, para2, {}).ppr.numPr;
        return n?.numId ? st.next(n.numId, n.ilvl ?? 0) : null;
      };
      const visit = (b) => {
        if (b.type === "paragraph") {
          num(b.paragraph);
          return;
        }
        for (const row of b.rows) {
          for (const cell of row.cells) for (const c of cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }))) visit(c);
        }
      };
      try {
        this.full.blocks.forEach((b, i) => {
          if (b.type === "paragraph") out.set(i, num(b.paragraph));
          else visit(b);
        });
      } finally {
        this.ctx.numbering = saved;
      }
      this.listTexts = out;
    }
    return this.listTexts.get(block);
  }
  /** Nível N do estilo de título interno do parágrafo ("heading N" — o próprio
   *  estilo, como o STYLEREF procura), 0 = outro estilo. */
  headingStyleLevel(p) {
    const id = p.props.styleId ?? p.ppr?.pStyle;
    const name = id ? this.ctx.fmt.styles.styles[id]?.name : void 0;
    const m = name ? /^heading ([1-9])$/i.exec(name) : null;
    return m ? +m[1] : 0;
  }
  /**
   * STYLEREF n [\s|\n] no corpo: o título de nível n mais próximo ANTES do campo
   * (no próprio parágrafo inclusive); sem nenhum, o primeiro depois (oráculo
   * refs-lab, sr-*). Sem switch: o texto do título; \n: o número (sem ponto
   * final; "0" sem número); \s: só os números ("Cap %1" → "1"). Sem título
   * desse nível: a mensagem de erro do Word.
   */
  styleRefValue(instr, block) {
    const n = parseInt(/^\s*STYLEREF\s+"?([1-9])"?/i.exec(instr)?.[1] ?? "", 10);
    if (!n || block === void 0 || block < 0) return void 0;
    const blocks = this.full.blocks;
    const at = (i) => {
      const b = blocks[i];
      return b?.type === "paragraph" && this.headingStyleLevel(b.paragraph) === n;
    };
    let hit = -1;
    for (let i = Math.min(block, blocks.length - 1); i >= 0 && hit < 0; i--) if (at(i)) hit = i;
    for (let i = block + 1; i < blocks.length && hit < 0; i++) if (at(i)) hit = i;
    if (hit < 0) return /^pt/i.test(this.ctx.opts.lang) ? "Erro! Nenhum texto com o estilo especificado foi encontrado no documento." : "Error! No text of specified style in document.";
    const p = blocks[hit].paragraph;
    if (/\\[sn]\b/i.test(instr)) {
      const m = this.listNumberOf(hit);
      if (!m?.text) return "0";
      return (/\\s\b/i.test(instr) ? m.level.numFmt === "bullet" ? m.text : m.chapter ?? "" : m.text).replace(/\.+$/, "");
    }
    return p.runs.map((x) => x.image || x.textbox || x.shape || x.group ? "" : x.text).join("").replace(/[\t\n\f\u000B]/g, " ").trim();
  }
  /**
   * Reinício a cada página (w:numRestart eachPage): a marca de cada nota pela
   * página onde ela saiu (a continuação de nota partida não conta de novo). null =
   * as marcas desta passada já valem; senão todas as marcas certas, para a próxima.
   */
  noteMarkFix() {
    const want = /* @__PURE__ */ new Map();
    let differs = false;
    const seen = /* @__PURE__ */ new Set();
    for (const ps of this.pages) {
      const nn = ps.geom.notes.footnote;
      let k = 0;
      for (const n of ps.notes) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        const cur = this.ctx.noteMarkOf("footnote", n.id);
        if (!cur || nn.restart !== "eachPage") continue;
        const m = formatNumber(nn.start - 1 + ++k, nn.fmt, this.ctx.opts.lang);
        want.set(`f${n.id}`, m);
        if (m !== cur) differs = true;
      }
    }
    return differs ? want : null;
  }
  /** Página exibida (já formatada) do parágrafo de cada indicador. */
  /** Número de capítulo da página `page` no nível `level`: o do ÚLTIMO título do
   *  nível que começa nela ou antes; antes do 1º título, o do 1º; sem título
   *  numerado, nenhum (o PAGE fica só com a página) — oráculo hfopts, chap-*. */
  chapterOf(level, page) {
    this.usedChapter = true;
    const list = this.chaptersGuess.get(level);
    if (!list?.length) return void 0;
    let out = list[0].text;
    for (const h of list) {
      if (h.page > page) break;
      out = h.text;
    }
    return out;
  }
  /** Títulos numerados desta passada por nível: a página onde cada um começa. */
  chapterIndex() {
    const out = /* @__PURE__ */ new Map();
    const seen = /* @__PURE__ */ new Set();
    this.pages.forEach((ps, i) => {
      for (const l of ps.page.lines) {
        const h = this.headingMarks.get(l.ref);
        if (!h || seen.has(l.ref)) continue;
        seen.add(l.ref);
        const arr = out.get(h.level) ?? [];
        arr.push({ page: i, text: h.text });
        out.set(h.level, arr);
      }
    });
    return out;
  }
  bookmarkPages() {
    const out = /* @__PURE__ */ new Map();
    const firstPage = /* @__PURE__ */ new Map();
    const paraLines = /* @__PURE__ */ new Map();
    for (const ps of this.pages) {
      for (const l of ps.page.lines) {
        const m = /^b(\d+)/.exec(l.ref);
        if (m && !firstPage.has(+m[1])) firstPage.set(+m[1], ps.page);
        if (m && l.ref === `b${m[1]}`) {
          const arr = paraLines.get(+m[1]) ?? [];
          arr.push({ end: l.end, page: ps.page });
          paraLines.set(+m[1], arr);
        }
      }
    }
    for (const [name, block] of this.full.bookmarks ?? []) {
      let pg;
      const off = this.full.bookmarkOffsets?.get(name);
      if (off !== void 0) pg = paraLines.get(block)?.find((l) => l.end > off)?.page;
      for (let b = block; b < block + 50 && !pg; b++) pg = firstPage.get(b);
      if (!pg) continue;
      const ps = this.pages.find((x) => x.page === pg);
      out.set(name, formatNumber(pg.number, ps.geom.pgFmt ?? "decimal", this.ctx.opts.lang));
    }
    return out;
  }
  run() {
    const full = this.full;
    this.geoms = [];
    full.sections.forEach((s, i) => {
      this.geoms.push(this.geomOf(s, i));
    });
    if (!this.geoms.length) {
      this.geoms.push(this.geomOf({
        sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
        blockStart: 0,
        blockEnd: full.blocks.length - 1,
        headers: {},
        footers: {},
        headerRefs: [],
        footerRefs: []
      }, 0));
    }
    const enSectEnd = this.ctx.fmt.settings.endnotePr?.pos === "sectEnd";
    for (const g of this.geoms) {
      this.ctx.beginNoteSection(g.notes, g.index === 0);
      const samePaper = !!this.cur && this.cur.page.widthTw === g.pageW && this.cur.page.heightTw === g.pageH;
      if (g.index > 0 && g.type === "nextColumn" && samePaper && this.nextColumnFits(g)) this.nextColumnSection(g);
      else if (g.index === 0 || g.type !== "continuous" || !samePaper) {
        const lastAfter = this.prev ? this.prev.after : 0;
        this.newPage(g, g.type);
        if (g.index > 0) this.topGapPrevAfter = lastAfter;
      } else this.continuousSection(g);
      for (let b = g.blocks[0]; b <= g.blocks[1] && b < full.blocks.length; b++) {
        const block = full.blocks[b];
        if (block.type === "paragraph") this.placeParagraph(block.paragraph, `b${b}`, b, g);
        else this.placeTable(block, `b${b}`, b);
      }
      const lastSect = g === this.geoms[this.geoms.length - 1];
      if (lastSect || enSectEnd && !full.sections[g.index]?.sect?.noEndnote) this.placeEndnotes(g);
    }
    for (let k = 0; k < 100 && this.floatCarry.length && this.cur; k++) this.newPage(this.cur.geom);
    if (this.cur) {
      this.closeColumns();
      this.paintNotes(this.cur);
    }
    const bgSpec = full.background;
    const bg = bgSpec ? resolveColor({ ...bgSpec.color ? { val: bgSpec.color } : {}, ...bgSpec.themeColor ? { themeColor: bgSpec.themeColor } : {}, ...bgSpec.themeTint ? { themeTint: bgSpec.themeTint } : {}, ...bgSpec.themeShade ? { themeShade: bgSpec.themeShade } : {} }, this.ctx.fmt.theme) : void 0;
    const bgFill = bgSpec?.fill ? resolvePageFill(bgSpec, bg) : void 0;
    const bgShow = !!this.ctx.fmt.settings.displayBackgroundShape;
    const pages = this.pages.map((ps) => {
      const late = (arr) => {
        const keep = [], front = [], back = [];
        let cur = null, curMk = null;
        for (const it of arr) {
          const mk = LATE_ITEMS.get(it);
          if (!mk) {
            keep.push(it);
            continue;
          }
          if (mk !== curMk) {
            cur = { z: mk.z, seq: mk.seq, items: [] };
            (mk.behind ? back : front).push(cur);
            curMk = mk;
          }
          cur.items.push(it);
        }
        return { keep, front, back };
      };
      const lateZ = (objs, into) => objs.map((o) => {
        const r = late(o.items);
        into.front.push(...r.front);
        into.back.push(...r.back);
        return r.front.length || r.back.length ? { ...o, items: r.keep } : o;
      });
      const lh = late(ps.hf), lb = late(ps.body);
      const hfB = lateZ(ps.hfBehind, lh), hfF = lateZ(ps.hfFront, lh), bB = lateZ(ps.behind, lb), bF = lateZ(ps.front, lb);
      const hfLayer = cullOffPage([...zItems([...hfB, ...lh.back]), ...lh.keep, ...zItems([...hfF, ...lh.front])], ps.page.widthTw, ps.page.heightTw);
      const pb = this.full.sections[ps.geom.index]?.sect?.pgBorders;
      const pbItems = pb ? this.pageBorders(ps, pb) : [];
      const pbBack = pb?.zOrder === "back";
      ps.page.items = [...hfLayer, ...pbBack ? pbItems : [], ...cullOffPage([...zItems([...bB, ...lb.back]), ...lb.keep, ...zItems([...bF, ...lb.front])], ps.page.widthTw, ps.page.heightTw), ...pbBack ? [] : pbItems];
      const barColor = this.ctx.rev.barColor();
      if (barColor && ps.page.lines.some((l) => l.rev)) {
        const ml = this.full.sections[ps.geom.index]?.sectPr.marginLeftTwips ?? 1701;
        ps.page.items.push(...revisionBarItems(ps.page.lines, barX(ml), barColor));
      }
      ps.page.hfItems = hfLayer.length;
      if (bg && bg.toUpperCase() !== "FFFFFF" && bg !== "auto") ps.page.background = bg;
      if (bgFill) ps.page.backgroundFill = bgFill;
      if (bgShow && (ps.page.background || bgFill)) ps.page.backgroundShow = true;
      return ps.page;
    });
    return { pages, warnings: [...this.ctx.warnings] };
  }
  // ───────────────────────── seções e páginas ─────────────────────────
  /** Bordas de página da seção nesta página (w:display, contorno do cabeçalho/rodapé). */
  pageBorders(ps, pb) {
    const first = ps.sectPage === 0;
    if (pb.display === "firstPage" && !first || pb.display === "notFirstPage" && first) return [];
    const topOf = (it) => it.t === "glyphs" || it.t === "rect" || it.t === "image" || it.t === "shape" ? it.y : it.t === "line" ? it.y1 : void 0;
    const hf = [...ps.hf, ...zItems(ps.hfBehind), ...zItems(ps.hfFront)];
    const set = this.ctx.fmt.settings;
    return pageBorderItems(this.ctx, pb, ps.geom, {
      header: !set.bordersDoNotSurroundHeader && hf.some((it) => (topOf(it) ?? Infinity) < ps.bodyTop),
      footer: !set.bordersDoNotSurroundFooter && hf.some((it) => (topOf(it) ?? -Infinity) > ps.bodyBottom)
    });
  }
  geomOf(s, i) {
    const sp2 = s.sectPr;
    const pageW = sp2.pageWidthTwips, pageH = sp2.pageHeightTwips;
    const marL = sp2.marginLeftTwips, marR = sp2.marginRightTwips;
    const contentW = Math.max(720, pageW - marL - marR);
    const cols = [];
    const defs = s.sect?.colDefs;
    const n = Math.max(1, sp2.cols?.count ?? 1);
    if (n > 1 && defs && defs.length >= n && s.sect?.equalWidth === false) {
      let x = marL;
      for (const d of defs.slice(0, n)) {
        cols.push({ x, w: d.w });
        x += d.w + d.space;
      }
    } else if (n > 1) {
      const space = sp2.cols?.spaceTwips ?? 720;
      const w = (contentW - space * (n - 1)) / n;
      for (let k = 0; k < n; k++) cols.push({ x: marL + k * (w + space), w });
    } else cols.push({ x: marL, w: contentW });
    const prev = i > 0 ? this.geoms[i - 1] : void 0;
    const pick = (own3, inherited) => {
      const out = { ...inherited ?? {} };
      if (own3?.default) out.default = own3.default;
      if (own3?.first) out.first = own3.first;
      if (own3?.even) out.even = own3.even;
      return out;
    };
    const hb = s.headerBlocks ?? blocksOfParas(s.headers);
    const fb = s.footerBlocks ?? blocksOfParas(s.footers);
    const st = this.ctx.fmt.settings;
    const fnPr = { ...st.footnotePr, ...sp2.footnotePr }, enPr = { ...st.endnotePr, ...sp2.endnotePr };
    const notes = {
      footnote: { fmt: fnPr.numFmt ?? "decimal", start: fnPr.numStart ?? 1, restart: fnPr.numRestart ?? "continuous" },
      // (nota de fim não reinicia por página)
      endnote: { fmt: enPr.numFmt ?? "lowerRoman", start: enPr.numStart ?? 1, restart: enPr.numRestart === "eachSect" ? "eachSect" : "continuous" },
      fnPos: fnPr.pos ?? "pageBottom",
      ...sp2.footnoteColumns ? { fnCols: sp2.footnoteColumns } : {}
    };
    return {
      notes,
      index: i,
      pageW,
      pageH,
      marL,
      marR,
      marT: sp2.marginTopTwips,
      marB: sp2.marginBottomTwips,
      hdr: sp2.headerDistanceTwips ?? 720,
      ftr: sp2.footerDistanceTwips ?? 720,
      cols,
      colSep: !!sp2.cols?.sep,
      titlePg: !!sp2.titlePg,
      type: s.sect?.type ?? "nextPage",
      ...s.sect?.vAlign ? { vAlign: s.sect.vAlign } : {},
      ...sp2.pgNumStart !== void 0 ? { pgStart: sp2.pgNumStart } : {},
      ...sp2.pgNumFmt ?? s.sect?.pgNumFmt ? { pgFmt: sp2.pgNumFmt ?? s.sect.pgNumFmt } : {},
      ...sp2.pgNumChapStyle ? { chap: { level: sp2.pgNumChapStyle, sep: CHAP_SEP[sp2.pgNumChapSep ?? "hyphen"] ?? "-" } } : {},
      headers: pick(hb, prev?.headers),
      footers: pick(fb, prev?.footers),
      blocks: [s.blockStart, s.blockEnd],
      ...s.sect?.docGrid && (s.sect.docGrid.type === "lines" || s.sect.docGrid.type === "linesAndChars") && (s.sect.docGrid.linePitch ?? 0) > 0 ? { linePitch: s.sect.docGrid.linePitch } : {},
      ...s.sect?.lnNumType ? { lnNum: {
        countBy: Math.max(1, s.sect.lnNumType.countBy ?? 1),
        start: s.sect.lnNumType.start ?? 0,
        restart: s.sect.lnNumType.restart ?? "newPage",
        distance: s.sect.lnNumType.distance ?? 360
      } } : {}
    };
  }
  pageNumber(g, sectPage) {
    if (g.pgStart !== void 0) return g.pgStart + sectPage;
    const prev = this.pages.length ? this.pages[this.pages.length - 1] : void 0;
    if (sectPage === 0) return prev ? prev.page.number + 1 : 1;
    return (prev?.page.number ?? 0) + 1;
  }
  newPage(g, breakType = "nextPage") {
    const sectPage = this.cur && this.cur.geom === g ? this.cur.sectPage + 1 : 0;
    let number = this.pageNumber(g, sectPage);
    if (sectPage === 0 && this.pages.length && (breakType === "evenPage" || breakType === "oddPage")) {
      const wantEven = breakType === "evenPage";
      if (number % 2 === 0 !== wantEven) {
        this.makePage(g, sectPage, number);
        number++;
        return this.newPageAt(g, sectPage + 1, number);
      }
    }
    this.newPageAt(g, sectPage, number);
  }
  newPageAt(g, sectPage, number) {
    this.makePage(g, sectPage, number);
    this.col = 0;
    this.colTop = this.cur.bodyTop;
    this.y = this.cur.bodyTop;
    this.colUsed = [];
    this.balanceSaved = null;
    this.applyBalance();
    this.atTop = true;
    this.topGapPrevAfter = null;
    this.prev = null;
    this.ctx.beginNotePage();
    if (this.enFlow?.sepDone) this.continuationSeparator(true);
    if (this.floatCarry.length) this.placeFloatCarry();
    if (this.cur.notesFull) return this.newPage(this.cur.geom);
    const late = this.lateFloats.get(this.pages.length - 1);
    if (late) {
      const fr = this.colFrame();
      for (const run2 of late) {
        this.placeFloat(run2, this.cur, fr.x, fr.w, this.cur.bodyTop, this.cur.body, 0);
        this.prePlaced.add(run2);
      }
    }
    for (const [bi, lt] of this.lateTables) {
      const b = this.full.blocks[bi];
      if (lt.page !== this.pages.length - 1 || this.placedTables.has(bi) || b?.type !== "table" || !b.tblPr?.tblpPr) continue;
      this.placedTables.add(bi);
      const fr = this.colFrame();
      const t = layoutTable(this.ctx, b, 0, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), `b${bi}`);
      const items = [];
      this.placeFloatingTable(t, b.tblPr.tblpPr, this.cur, lt.flowY, fr.x, fr.w, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
      if (this.floatCarry.some((c) => c.t === t)) this.lateSplit.add(bi);
    }
  }
  makePage(g, sectPage, number) {
    const page = { widthTw: g.pageW, heightTw: g.pageH, section: g.index, number, items: [], lines: [] };
    const ps = {
      page,
      geom: g,
      bodyTop: g.marT,
      bodyBottom: g.pageH - g.marB,
      behind: [],
      hf: [],
      body: [],
      front: [],
      hfBehind: [],
      hfFront: [],
      floats: [],
      sectPage,
      notes: [],
      noteArea: 0,
      bodyBottomBase: g.pageH - g.marB
    };
    if (this.cur) {
      this.closeColumns();
      this.paintNotes(this.cur);
    }
    this.pages.push(ps);
    this.cur = ps;
    this.colMaxY = 0;
    this.layoutHeaderFooter(ps);
    ps.bodyBottomBase = ps.bodyBottom;
    if (this.noteCarry.length) {
      const carry = this.noteCarry;
      this.noteCarry = [];
      for (const n of carry) {
        const avail = ps.bodyBottomBase - ps.bodyTop - this.noteAreaOf(ps.notes.map((x) => x.content), g) - (ps.notes.length ? 0 : this.separatorHeight());
        const sp2 = n.content.height > avail + 0.05 && !ps.notesFull ? splitContent(n.content, avail) : null;
        if (sp2 && sp2[0].lines.length && sp2[1].lines.length) {
          ps.notes.push({ id: n.id, content: sp2[0] });
          this.noteCarry.push({ id: n.id, content: sp2[1] });
          ps.notesFull = true;
        } else if (ps.notesFull) this.noteCarry.push(n);
        else ps.notes.push(n);
      }
      ps.noteArea = this.noteAreaOf(ps.notes.map((n) => n.content), g);
      ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
    }
  }
  continuousSection(g) {
    const ending = this.cur.geom;
    this.recordBalance(ending);
    if (this.balanceSaved !== null) {
      this.cur.bodyBottom = this.balanceSaved;
      this.balanceSaved = null;
    }
    this.closeColumns();
    this.colUsed = [];
    const lastAfter = this.prev && !this.atTop ? this.prev.after : 0;
    if ((ending.cols.length > 1 || g.cols.length > 1) && lastAfter > 0 && this.sectGapAfter === null) {
      this.y = Math.min(this.y + lastAfter, this.cur.bodyBottom);
      this.sectGapAfter = lastAfter;
    }
    this.y = Math.max(this.y, this.colMaxY);
    this.colMaxY = 0;
    this.cur.geom = g;
    delete this.cur.cols;
    this.col = 0;
    this.colTop = this.y;
    this.applyBalance();
  }
  /** Seção de várias colunas que termina nesta página: o que cada coluna ocupou
   *  (o equilíbrio é buscado em layoutDocument). */
  recordBalance(ending) {
    if (ending.cols.length <= 1) return;
    const used = [...this.colUsed, this.y - this.colTop];
    this.balanceFound.set(balKey(ending), { page: this.pages.length - 1, colTop: this.colTop, bottom: this.balanceSaved ?? this.cur.bodyBottom, sum: used.reduce((a, b) => a + Math.max(0, b), 0), n: ending.cols.length, used });
  }
  /** "Próxima coluna" continua na mesma página: mesmo nº de colunas e não estamos
   *  na última (senão vale como próxima página — oráculo sections, nc-*) */
  nextColumnFits(g) {
    if (!this.cur || g.cols.length < 2) return false;
    const cols = this.pageCols();
    return cols.length === g.cols.length && this.col < cols.length - 1;
  }
  /** Seção "próxima coluna": a seção nova começa no topo da coluna seguinte, com as
   *  colunas da página de antes (as dela valem da próxima página em diante); o 1º
   *  parágrafo leva o "antes" descontado do "depois" anterior, como numa seção nova
   *  (oráculo sections, nc-2to2-before). A seção que termina não é equilibrada. */
  nextColumnSection(g) {
    const lastAfter = this.prev ? this.prev.after : 0;
    if (this.balanceSaved !== null) {
      this.cur.bodyBottom = this.balanceSaved;
      this.balanceSaved = null;
    }
    const cols = this.pageCols();
    this.cur.cols = cols;
    this.cur.geom = g;
    this.colUsed.push(this.y - this.colTop);
    this.colMaxY = Math.max(this.colMaxY, this.y);
    this.col++;
    this.y = this.colTop;
    this.atTop = true;
    this.prev = null;
    this.topGapPrevAfter = lastAfter;
  }
  /** Colunas da página corrente (as da seção, salvo "próxima coluna"). */
  pageCols() {
    return this.cur.cols ?? this.cur.geom.cols;
  }
  colFrame() {
    const cols = this.pageCols();
    const c = cols[this.col] ?? cols[0];
    return { x: c.x, w: c.w };
  }
  /** Fim da coluna: próxima coluna ou nova página. */
  breakColumn() {
    const g = this.cur.geom;
    if (this.col < this.pageCols().length - 1) {
      this.colUsed.push(this.y - this.colTop);
      this.colMaxY = Math.max(this.colMaxY, this.y);
      this.col++;
      this.y = this.colTop;
      this.atTop = true;
      this.prev = null;
      if (this.enFlow?.sepDone) this.continuationSeparator(false);
    } else this.newPage(g);
  }
  /** fim do conteúdo de cada coluna da área de colunas corrente (com o "depois"
   *  do último parágrafo); ausente = coluna vazia */
  colBottoms = [];
  /** Conteúdo na coluna corrente até `bottom` (linha entre colunas). */
  noteColContent(bottom) {
    const c = this.col;
    this.colBottoms[c] = Math.max(this.colBottoms[c] ?? -Infinity, Math.min(bottom, this.balanceSaved ?? this.cur.bodyBottom));
  }
  /**
   * Fecha a área de colunas corrente (nova página, seção contínua, fim): com
   * w:sep, a linha entre colunas — retângulo preto de 0,84 pt no meio do vão,
   * do topo das colunas até o fim da coluna mais comprida, só antes das colunas
   * que têm conteúdo nesta página (oráculo sections, sep-*).
   */
  closeColumns() {
    const ps = this.cur, cols = this.pageCols(), b = this.colBottoms;
    this.colBottoms = [];
    if (!ps || !ps.geom.colSep || cols.length < 2 || !b.length) return;
    const bottom = Math.max(...b.filter((v) => v !== void 0));
    if (!(bottom > this.colTop)) return;
    for (let c = 1; c < cols.length; c++) {
      if (b[c] === void 0) continue;
      const x = (cols[c - 1].x + cols[c - 1].w + cols[c].x) / 2;
      ps.body.push({ t: "rect", x: x - COL_SEP_W / 2, y: this.colTop, w: COL_SEP_W, h: bottom - this.colTop, fill: "000000" });
    }
  }
  // ───────────────────────── cabeçalho / rodapé ─────────────────────────
  /** Valor dos campos dinâmicos; `block` = bloco do corpo onde o campo está (REF \p). */
  fieldValue(ps, block) {
    return (name, instr, at) => {
      if (name === "PAGEREF") {
        this.usedPageRef = true;
        const bm = (instr ?? "").trim().split(/\s+/)[1];
        return bm ? this.marksGuess.get(bm) : void 0;
      }
      if (name === "SEQ") return this.seqValue(instr ?? "");
      if (name === "ENDNOTEREF_MARK" && this.curEndnote !== void 0) return this.ctx.noteMarkOf("endnote", this.curEndnote) ?? "";
      if (name === "REF") return this.refValue(instr ?? "", block, at);
      if (name === "NOTEREF") return this.noteRefValue(instr ?? "", block, at);
      if (name === "STYLEREF") return this.styleRefValue(instr ?? "", block);
      if (name === "PAGE") {
        const num = formatNumber(ps.page.number, ps.geom.pgFmt ?? "decimal", this.ctx.opts.lang);
        const chap = ps.geom.chap ? this.chapterOf(ps.geom.chap.level, this.pages.indexOf(ps)) : void 0;
        return chap !== void 0 ? chap + ps.geom.chap.sep + num : num;
      }
      if (name === "NUMPAGES") {
        this.usedNumPages = true;
        return String(this.totalPagesGuess);
      }
      if (name === "SECTIONPAGES") {
        this.usedNumPages = true;
        return String(this.totalPagesGuess);
      }
      if (name === "SECTION") return String(ps.geom.index + 1);
      if (name === "DATE" || name === "TIME") return dateFieldValue(instr ?? name, this.ctx.opts.now ?? /* @__PURE__ */ new Date(), this.ctx.opts.lang);
      if (name === "SAVEDATE" || name === "CREATEDATE" || name === "PRINTDATE") {
        const cp = this.full.coreProps;
        const iso = name === "SAVEDATE" ? cp?.modified : name === "CREATEDATE" ? cp?.created : cp?.lastPrinted;
        const d = iso ? new Date(iso) : void 0;
        return d && !isNaN(d.getTime()) ? dateFieldValue(instr ?? name, d, this.ctx.opts.lang) : void 0;
      }
      return void 0;
    };
  }
  layoutHeaderFooter(ps) {
    const g = ps.geom;
    const settings = this.ctx.fmt.settings;
    const first = ps.sectPage === 0 && g.titlePg;
    const even = settings.evenAndOddHeaders && ps.page.number % 2 === 0;
    const kind = first ? "first" : even ? "even" : "default";
    const pick = (set) => first ? set.first : even ? set.even : set.default;
    const env = { field: this.fieldValue(ps), hf: true };
    const width = g.pageW - g.marL - g.marR;
    const savedNum = this.ctx.numbering;
    this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
    this.inHf = true;
    try {
      const hdr = pick(g.headers);
      if (hdr?.length) {
        const probe = this.ctx.pure(() => this.layoutStatic(hdr, g.marL, width, env, `hdr:${kind}`, scratchPage(ps), g.hdr));
        ps.bodyTop = Math.max(g.marT, g.hdr + probe.height);
        const r = this.layoutStatic(hdr, g.marL, width, env, `hdr:${kind}`, ps, g.hdr);
        for (const it of r.items) ps.hf.push(shiftItem(it, g.hdr));
        for (const l of r.lines) ps.page.lines.push(shiftLine(l, g.hdr));
        ps.bodyTop = Math.max(g.marT, g.hdr + r.height);
      }
      const ftr = pick(g.footers);
      if (ftr?.length) {
        const probe = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, void 0, 0));
        let top = g.pageH - g.ftr - probe.height;
        const probe2 = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, scratchPage(ps), top));
        let limitH = probe.height;
        if (probe2.height > probe.height + 1) {
          top = g.pageH - g.ftr - probe2.height;
          this.onlyTextFloats = true;
          try {
            limitH = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, scratchPage(ps), top)).height;
          } finally {
            this.onlyTextFloats = false;
          }
        }
        const r = this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, ps, top);
        for (const it of r.items) ps.hf.push(shiftItem(it, top));
        for (const l of r.lines) ps.page.lines.push(shiftLine(l, top));
        ps.bodyBottom = Math.min(g.pageH - g.marB, g.pageH - g.ftr - limitH);
      }
    } finally {
      this.inHf = false;
      this.ctx.numbering = savedNum;
    }
  }
  // ───────────────────────── fluxo estático (célula, HF, caixa) ─────────────────────────
  /**
   * Lays out blocos sem paginação (y relativo a 0). Floats ancorados são
   * posicionados na página `ps` (se houver) com `yOrigin` = y absoluto do topo.
   */
  layoutStatic(blocks0, x, width, env, ref, ps, yOrigin = 0, nb) {
    const blocks = this.inCell ? blocks0 : liftFrames(blocks0);
    const items = [];
    const lines = [];
    let y = 0;
    let prev = null;
    let prevList;
    let keepNext = false;
    const n = blocks.length;
    const isHf = !!ps && /^(hdr|ftr):\w+$/.test(ref);
    const hfFlow = /^(hdr|ftr):\w+$/.test(ref);
    const cellFloats = [];
    const cellPs = { floats: cellFloats };
    let floatBottom = 0;
    let alignBottom = 0;
    let cellShape = false;
    const floatItems = [];
    const floatLines = [];
    if (isHf) {
      for (const b of blocks) {
        if (b.type !== "paragraph") continue;
        const carry = FRAME_CARRY.get(b.paragraph);
        for (const run2 of FRAME_SKIP.has(b.paragraph) ? carry ? [carry] : [] : b.paragraph.runs) {
          const fl = run2.image?.floating || run2.shape?.floating || run2.group?.floating || run2.textbox?.floating;
          const anc = run2.image?.anchor ?? run2.shape?.anchor ?? run2.group?.anchor ?? run2.textbox?.anchor;
          if (!fl || !anc || !ABSOLUTE_V.has(anc.posV.relativeFrom ?? "") || this.onlyTextFloats) continue;
          this.placeFloat(run2, ps, x, width, yOrigin, items, yOrigin);
          this.prePlaced.add(run2);
        }
      }
    }
    let join = null;
    let delRuns = null;
    const paras = /* @__PURE__ */ new Map();
    const nest = [];
    let lastPara = null;
    blocks.forEach((b, bi) => {
      if (b.type === "paragraph") {
        if (FRAME_SKIP.has(b.paragraph)) {
          const carry = FRAME_CARRY.get(b.paragraph);
          if (carry && ps && !this.prePlaced.has(carry)) this.placeFloat(carry, ps, x + this.staticDx, width, yOrigin + y + (prev ? prev.after : 0), items, yOrigin);
          if (this.hfFrameAfter.length && blocks[bi + 1]?.type === "table") {
            this.hfFrameTbl.push(...this.hfFrameAfter);
            this.hfFrameAfter = [];
          }
          if (this.hfFrameAfter.length) {
            items.push(...this.hfFrameAfter);
            this.hfFrameAfter = [];
          }
          return;
        }
        if (this.ctx.rev.markGone(b.paragraph) && !join && bi < n - 1 && blocks[bi + 1].type === "paragraph") {
          delRuns = [...delRuns ?? [], ...b.paragraph.runs];
          return;
        }
        if (this.ctx.rev.markGone(b.paragraph) && this.noShownRuns(b.paragraph) && !join && !delRuns) return;
        const merged = delRuns ? joinDeleted(delRuns, b.paragraph) : b.paragraph;
        delRuns = null;
        const para2 = join ? this.joinHidden(join, merged, env) : merged;
        const p = prepareParagraph(this.ctx, para2, { ...env, noPageBreaks: true, ...join ? { numbering: false } : {}, ...CONTINUATION.has(para2) ? { continuation: true } : {} });
        if (join) p.marker = join.marker;
        join = null;
        if (p.markStyle.hidden && bi < n - 1) {
          if (!p.glyphs.length) return;
          if (blocks[bi + 1].type === "paragraph") {
            join = { para: para2, marker: p.marker };
            return;
          }
        }
        if (p.keepNext) keepNext = true;
        const firstInCell = bi === 0;
        const lastInCell = bi === n - 1;
        let before = p.beforeAuto ? firstInCell ? 0 : 280 : p.spaceBefore;
        let prevAfter = prev ? prev.after : 0;
        let ctxAfter = null;
        if (prev && prev.styleId === p.styleId) {
          if (prev.contextual) {
            ctxAfter = prevAfter;
            prevAfter = 0;
          }
          if (p.contextual) before = 0;
        }
        const list = this.listOf(p);
        if (list && prevList === list) {
          if (p.beforeAuto) before = 0;
          if (prev?.afterAuto) prevAfter = 0;
        }
        prevList = list;
        if (bi === 0 && nb?.prev && p.contextual && nb.prev.styleId === p.styleId) before = 0;
        if (lastPara) lastPara.after = prevAfter;
        const gapS = ctxAfter !== null ? Math.max(0, this.collapse(ctxAfter, before) - ctxAfter) : this.collapse(prevAfter, before);
        const paraRefS = y + Math.min(prevAfter, gapS);
        y += gapS;
        const top = y;
        const br = new LineBreaker(this.ctx, p);
        const frame0 = { left: p.indLeft, right: width - p.indRight };
        const hfWrap = !!ps && /^(hdr|ftr):\w+$/.test(ref);
        if (hfWrap) this.placeFloats(p, ps, x, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
        const cellAnch = this.inCell && ps && !hfWrap && /\/r\d+\/c\d+$/.test(ref) ? [] : null;
        if (this.inCell && !cellShape) cellShape = p.glyphs.some((g) => !!(g.obj?.image?.floating || g.obj?.shape?.floating || g.obj?.group?.floating || g.obj?.textbox?.floating));
        if (cellAnch) {
          for (const g of p.glyphs) {
            const run2 = g.obj;
            if (!run2 || this.prePlaced.has(run2) || !(run2.image?.floating || run2.shape?.floating || run2.group?.floating || run2.textbox?.floating)) continue;
            if (this.onlyTextFloats && !followsText(floatAnchor(run2))) continue;
            const its = [];
            const rc = this.placeFloat(run2, ps, x + this.staticDx, width, yOrigin + top, its, yOrigin, void 0, yOrigin + paraRefS);
            const mk = { z: floatAnchor(run2)?.relativeHeight ?? 0, seq: this.zSeq++, behind: rc.obj.layer === "behind" };
            for (const it of its) LATE_ITEMS.set(it, mk);
            cellAnch.push(...its);
            if (rc.box && !floatAnchor(run2)?.simplePos) {
              cellFloats.push({ ...rc.box, x: rc.box.x - this.staticDx, y: rc.box.y - yOrigin });
              floatBottom = Math.max(floatBottom, rc.obj.y - yOrigin + rc.obj.h);
            }
            alignBottom = Math.max(alignBottom, rc.obj.y - yOrigin + rc.obj.h);
          }
        }
        const boxTop = y;
        const boxAt = items.length;
        y += this.borderTopExtent(p, prev);
        const l0 = lines.length;
        do {
          let frame = frame0;
          const wPs = hfWrap ? ps : cellFloats.length ? cellPs : null;
          const wY0 = hfWrap ? yOrigin : 0;
          if (wPs) {
            const lh2 = markLineH(p);
            frame = this.wrapFrame(frame0, x, wY0 + y, lh2, wPs);
            for (let k = 0; k < 8 && frame.skipTo !== void 0 && frame.skipTo - wY0 > y; k++) {
              y = frame.skipTo - wY0;
              frame = this.wrapFrame(frame0, x, wY0 + y, lh2, wPs);
            }
          }
          const mark = br.mark();
          let seg = this.pickSeg(br, frame);
          let line = br.next(seg.f);
          const textH = Math.min(line.height, line.baseline + line.desc);
          if (wPs && wPs.floats.length && textH > markLineH(p) + 1) {
            const f2 = this.wrapFrame(frame0, x, wY0 + y, textH, wPs);
            if (f2.skipTo !== void 0 && f2.skipTo - wY0 > y) {
              y = f2.skipTo - wY0;
              frame = this.wrapFrame(frame0, x, wY0 + y, markLineH(p), wPs);
              br.reset(mark);
              seg = this.pickSeg(br, frame);
              line = br.next(seg.f);
            } else if (narrower(f2, frame)) {
              frame = f2;
              br.reset(mark);
              seg = this.pickSeg(br, frame);
              line = br.next(seg.f);
            }
          }
          let lh = 0;
          const put = (l) => {
            paintLine(this.ctx, items, l, x, y);
            this.paintInlineDrawings(items, l, x, y, ps);
            lines.push(lineRecord(`${ref}/b${bi}`, p, l, x, y, width));
            lh = Math.max(lh, l.height);
          };
          put(line);
          this.moreSegs(br, frame, seg.k, line, put);
          y += lh;
        } while (!br.done());
        if (this.hfFrameAfter.length) {
          items.push(...this.hfFrameAfter);
          this.hfFrameAfter = [];
        }
        const groupedNext = this.groupsWithNext(p, blocks[bi + 1], env);
        const bandB = this.borderBottomExtent(p, groupedNext);
        y += bandB;
        this.paintBox(items, p, x, width, boxTop, y, prev, boxAt, groupedNext);
        if (ps && !hfWrap && !cellAnch) this.placeFloats(p, ps, x + this.staticDx, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
        if (cellAnch) items.push(...cellAnch);
        let after = p.afterAuto ? lastInCell && !hfFlow ? 0 : 280 : p.spaceAfter;
        if (lastInCell && nb?.next && p.contextual && nb.next.styleId === p.styleId) after = 0;
        lastPara = {
          lines: lines.length - l0,
          after,
          ...bandB ? { band: bandB } : {},
          widow: this.ctx.fmt.settings.compatibilityMode >= 15 && (p.widowControl || p.ppr.widowControl === void 0)
        };
        paras.set(`${ref}/b${bi}`, lastPara);
        prev = { after, afterAuto: p.afterAuto, ...p.styleId ? { styleId: p.styleId } : {}, contextual: p.contextual, ...p.ppr.pBdr ? { pBdr: p.ppr.pBdr, pBdrKey: bdrKey(p.ppr) } : {} };
      } else if (b.rows.every((r) => isHiddenRow(this.ctx, r))) {
      } else if (b.tblPr?.tblpPr && b.tblPr.tblpPr.tblpYSpec !== "inline" && !hfFlow && this.inCell) {
        const fp = b.tblPr.tblpPr;
        if (prev && this.dropsAfterBeforeTable(prev, b)) {
          prev = { ...prev, after: 0 };
          if (lastPara) lastPara.after = 0;
        }
        const t0 = this.ctx.pure(() => layoutTable(this.ctx, b, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`));
        const H = t0.rows.reduce((a, r) => a + r.height, 0);
        const top = y + (prev ? prev.after : 0) + (fp.tblpYSpec ? 0 : fp.tblpY ?? 0);
        const [aL, aR] = fp.horzAnchor === "page" ? [x - 103, x + width + 103] : [x, x + width];
        const xs = fp.tblpXSpec;
        const refX = xs === "center" ? aL + (aR - aL - t0.width) / 2 : xs === "right" || xs === "outside" ? aR - t0.width : aL + (xs ? 0 : fp.tblpX ?? 0);
        const t = layoutTable(this.ctx, b, refX - t0.x, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
        let ry = top;
        for (const row of t.rows) {
          for (const it of row.items) floatItems.push(shiftItem(it, ry));
          for (const it of row.borderItems) floatItems.push(shiftItem(it, ry));
          for (const l of row.lines) floatLines.push({ ...l, y: l.y + ry, baseline: l.baseline + ry });
          ry += row.height;
        }
        cellFloats.push({
          x: t.x,
          y: top,
          w: t.width,
          h: H,
          wrap: "square",
          side: "bothSides",
          distL: fp.leftFromText ?? 0,
          distR: fp.rightFromText ?? 0,
          distT: fp.topFromText ?? 0,
          distB: fp.bottomFromText ?? 0
        });
        floatBottom = Math.max(floatBottom, top + H);
      } else if (b.tblPr?.tblpPr && b.tblPr.tblpPr.tblpYSpec !== "inline" && hfFlow) {
        if (ps) {
          const t = layoutTable(this.ctx, b, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
          const fItems = [];
          this.placeFloatingTable(t, b.tblPr.tblpPr, ps, yOrigin + y, x, width, fItems, 0, this.ctx.fmt.settings.compatibilityMode >= 15);
          ps.hfFront.push({ z: -1, seq: this.zSeq++, items: fItems });
        }
      } else {
        y += prev && !this.dropsAfterBeforeTable(prev, b) ? prev.after : 0;
        if (lastPara && prev && this.dropsAfterBeforeTable(prev, b)) lastPara.after = 0;
        lastPara = null;
        this.assignCellNeighbors(b, prev ? { ...prev.styleId ? { styleId: prev.styleId } : {} } : bi === 0 ? nb?.prev : void 0);
        const t = layoutTable(this.ctx, b, x, width, (cell, cx, cw, cenv, cref) => {
          const cc = this.layoutCell(cell, cx, cw, cenv, cref, ps);
          if (cc.paras) for (const [k, v] of cc.paras) paras.set(k, v);
          return cc;
        }, `${ref}/b${bi}`);
        const tblAt = items.length;
        if (isHf && t.rows[0]) {
          const h0 = t.rows.reduce((a, r) => a + r.height, 0);
          for (let k = 0; k < 8; k++) {
            const yy = yOrigin + y;
            const hit = ps.floats.find((fl) => !fl.bodyOnly && (fl.wrap === "topAndBottom" || fl.wrap === "square" || fl.wrap === "tight" || fl.wrap === "through") && yy + h0 > fl.y - fl.distT && yy < fl.y + fl.h + fl.distB && t.x + t.width > fl.x - fl.distL && t.x < fl.x + fl.w + fl.distR);
            if (!hit) break;
            y = hit.y + hit.h + hit.distB - yOrigin;
          }
        }
        const mergeMoved = /* @__PURE__ */ new Set();
        for (const [ri, row0] of t.rows.entries()) {
          const row = dropMoved(mergeTextFirst(t.rows, ri, row0, mergeMoved, () => true), mergeMoved);
          const ni = [], nl = [];
          for (const it of row.items) {
            const s = shiftItem(it, y);
            items.push(s);
            ni.push(s);
          }
          for (const it of row.borderItems) {
            const s = shiftItem(it, y);
            items.push(s);
            ni.push(s);
          }
          for (const l of row.lines) {
            const s = { ...l, y: l.y + y, baseline: l.baseline + y };
            lines.push(s);
            nl.push(s);
          }
          nest.push({ top: y, row, items: ni, lines: nl });
          y += row.height;
        }
        if (this.hfFrameTbl.length) {
          const fx = Math.min(...this.hfFrameTbl.map((it) => it.t === "glyphs" && it.glyphs[0] ? it.glyphs[0].x : Infinity));
          let at = items.length;
          for (let k = tblAt; k < items.length; k++) {
            const it = items[k];
            if (it.t === "glyphs" && it.glyphs[0] && it.glyphs[0].x >= fx - 10) {
              at = k;
              break;
            }
          }
          items.splice(at, 0, ...this.hfFrameTbl);
          this.hfFrameTbl = [];
        }
        prev = this.rowEndPrev();
        prevList = void 0;
      }
    });
    if (prev) y += prev.after;
    items.push(...floatItems);
    lines.push(...floatLines);
    return { items, lines, height: Math.max(y, floatBottom), ...alignBottom > Math.max(y, floatBottom) ? { alignH: alignBottom } : {}, ...cellShape ? { shape: true } : {}, ...keepNext ? { keepNext: true } : {}, ...paras.size ? { paras } : {}, ...nest.length ? { nest } : {} };
  }
  /** diagramando o conteúdo de uma célula (flutuantes ficam relativos à célula) */
  inCell = false;
  /** molduras do cabeçalho/rodapé à direita do início da linha: entram depois das linhas do âncora */
  hfFrameAfter = [];
  /** molduras do cabeçalho/rodapé ancoradas na tabela seguinte (entram na 1ª linha dela) */
  hfFrameTbl = [];
  /** conteúdo de caixa de texto: x da caixa na página (flutuantes dentro dela) */
  staticDx = 0;
  /** margens laterais da célula em diagramação (âncoras relativas à célula — oráculo cellwrap) */
  cellMar = null;
  /** fundo da coluna mais alta já deixada nesta página (seção de várias colunas) */
  colMaxY = 0;
  /** "depois" do parágrafo vazio de quebra contínua que não ocupa altura: o seguinte
   *  desconta (oráculo colbreak) */
  sectGapAfter = null;
  layoutCell(cell, x, width, env, ref, ps) {
    const prevInCell = this.inCell, prevMar = this.cellMar;
    this.inCell = true;
    this.cellMar = env.cellMar ?? null;
    try {
      return this.layoutCellIn(cell, x, width, env, ref, ps);
    } finally {
      this.inCell = prevInCell;
      this.cellMar = prevMar;
    }
  }
  layoutCellIn(cell, x, width, env, ref, ps) {
    const blocks = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
    const penv = { ...env.tablePPr ? { tablePPr: env.tablePPr } : {}, ...env.tableRPr ? { tableRPr: env.tableRPr } : {}, ...env.darkBackground ? { darkBackground: true } : {} };
    if (ps) penv.field = this.fieldValue(ps);
    if (this.inHf) penv.hf = true;
    const c = this.layoutStatic(blocks, x, width, penv, ref, ps, 0, this.cellNb.get(cell));
    if (cell.tcPr?.hideMark && blocks.every((b) => b.type === "paragraph" && !paraVisibility(this.ctx, b.paragraph, penv).visible)) return { ...c, height: 0 };
    const lastB = blocks[blocks.length - 1];
    if (cell.tcPr?.hideMark && blocks.length > 1 && lastB?.type === "paragraph" && !paraVisibility(this.ctx, lastB.paragraph, penv).visible) {
      const nb = this.cellNb.get(cell);
      return { ...c, height: this.ctx.pure(() => this.layoutStatic(blocks.slice(0, -1), x, width, penv, ref, ps, 0, nb)).height };
    }
    if (blocks.length > 1 && lastB?.type === "paragraph" && blocks[blocks.length - 2]?.type === "table" && !paraVisibility(this.ctx, lastB.paragraph, penv).visible) {
      const nb = this.cellNb.get(cell);
      return { ...c, height: this.ctx.pure(() => this.layoutStatic(blocks.slice(0, -1), x, width, penv, ref, ps, 0, nb)).height };
    }
    return c;
  }
  // ───────────────────────── espaçamento contextual em volta de tabelas ─────────────────────────
  // (oráculos autosp/autosp2) Para o contextualSpacing, os parágrafos seguem a ordem do
  // documento através da tabela: o de antes → 1º parágrafo da 1ª célula; o último de cada
  // célula → 1º da célula seguinte; o fim de cada linha é uma marca com o estilo de
  // parágrafo PADRÃO (não o da célula, nem o do parágrafo antes) → próxima linha / depois.
  cellNb = /* @__PURE__ */ new WeakMap();
  cellBlocks(cell) {
    return cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
  }
  /** Estilo do 1º parágrafo (em ordem de documento) de uma sequência de blocos. */
  firstParaNeighbor(blocks) {
    const b = blocks[0];
    if (!b) return void 0;
    if (b.type === "paragraph") {
      const id = this.ctx.resolver.paraStyleId(directPPr(b.paragraph).pStyle);
      return id ? { styleId: id } : {};
    }
    const c = b.rows[0]?.cells[0];
    return c ? this.firstParaNeighbor(this.cellBlocks(c)) : void 0;
  }
  /** Estilo do último parágrafo de uma célula (tabela no fim: a marca de fim de linha dela). */
  lastParaNeighbor(blocks) {
    const b = blocks[blocks.length - 1];
    if (!b) return void 0;
    if (b.type !== "paragraph") return this.rowEndNeighbor();
    const id = this.ctx.resolver.paraStyleId(directPPr(b.paragraph).pStyle);
    return id ? { styleId: id } : {};
  }
  /** Marca de fim de linha da tabela: estilo de parágrafo padrão. */
  rowEndNeighbor() {
    const id = this.ctx.resolver.paraStyleId(void 0);
    return id ? { styleId: id } : {};
  }
  /** "Parágrafo anterior" depois de uma tabela: a marca de fim de linha (sem espaço próprio). */
  rowEndPrev() {
    return { after: 0, afterAuto: false, ...this.rowEndNeighbor(), contextual: false };
  }
  /** O "depois" do parágrafo antes da tabela some (contextual com o 1º parágrafo dela)? */
  dropsAfterBeforeTable(prev, table2) {
    if (!prev.contextual) return false;
    const f = this.firstParaNeighbor([table2]);
    return !!f && f.styleId === prev.styleId;
  }
  /** Registra os vizinhos de cada célula da tabela (`prev` = parágrafo antes dela). */
  assignCellNeighbors(table2, prev) {
    table2.rows.forEach((row, ri) => row.cells.forEach((cell, ci) => {
      const pv = ci > 0 ? this.lastParaNeighbor(this.cellBlocks(row.cells[ci - 1])) : ri > 0 ? this.rowEndNeighbor() : prev;
      const nx = ci + 1 < row.cells.length ? this.firstParaNeighbor(this.cellBlocks(row.cells[ci + 1])) : this.rowEndNeighbor();
      this.cellNb.set(cell, { ...pv ? { prev: pv } : {}, ...nx ? { next: nx } : {} });
    }));
  }
  collapse(after, before) {
    if (this.ctx.fmt.settings.compat["doNotUseHTMLParagraphAutoSpacing"]) return after + before;
    return Math.max(after, before);
  }
  /**
   * Bordas em grupo (oráculo pbdr): parágrafos seguidos com as mesmas bordas e
   * recuos formam uma caixa — o topo (espaço + espessura) só no 1º; entre eles
   * a borda "between" com o espaço dos DOIS lados; a base só no último.
   */
  borderTopExtent(p, prev) {
    const b = p.ppr.pBdr;
    if (prev?.pBdrKey && prev.pBdrKey === bdrKey(p.ppr)) {
      const bt = b?.between;
      return bt && bt.val !== "none" && bt.val !== "nil" ? 2 * (bt.space ?? 0) * 20 + borderWidth(bt) : 0;
    }
    if (!b?.top || b.top.val === "none" || b.top.val === "nil") return 0;
    return (b.top.space ?? 0) * 20 + borderWidth(b.top) * (b.top.shadow ? 2 : 1);
  }
  borderBottomExtent(p, groupedNext = false) {
    const b = p.ppr.pBdr;
    if (groupedNext || !b?.bottom || b.bottom.val === "none" || b.bottom.val === "nil") return 0;
    return (b.bottom.space ?? 0) * 20 + borderWidth(b.bottom) * (b.bottom.shadow ? 2 : 1);
  }
  /** O bloco seguinte continua o grupo de bordas deste parágrafo? */
  groupsWithNext(p, next, env = {}) {
    if (!p.ppr.pBdr || !next || next.type !== "paragraph") return false;
    return bdrKey(resolvePPr(this.ctx, next.paragraph, env).ppr) === bdrKey(p.ppr);
  }
  /**
   * Número da linha (w:lnNumType) — medido no Word (oráculo lnnum): só linhas
   * do corpo (tabela e parágrafo com suppressLineNumbers não contam), vazio
   * conta; o 1º número é start+1; alinhado à direita em (coluna − distância,
   * auto = 360tw), mesma baseline, estilo Normal + "Line Number".
   */
  paintLineNumber(colX, baseline) {
    const ln = this.cur.geom.lnNum;
    const restart = ln.restart === "continuous" ? this.lnSect < 0 : ln.restart === "newSection" ? this.lnSect !== this.cur.geom.index : this.lnPage !== this.cur;
    if (restart) this.lnCount = ln.start;
    this.lnPage = this.cur;
    this.lnSect = this.cur.geom.index;
    this.lnCount++;
    if (this.lnCount % ln.countBy !== 0) return;
    const styles = this.ctx.fmt.styles.styles;
    const sid = Object.values(styles).find((d) => d.type === "character" && d.name?.toLowerCase() === "line number")?.styleId;
    const rpr = sid ? { rStyle: sid } : {};
    const para2 = { runs: [{ text: String(this.lnCount), props: runPropsFromRPr(rpr), rpr }], props: {}, ppr: {} };
    const np = prepareParagraph(this.ctx, para2, { numbering: false });
    const line = new LineBreaker(this.ctx, np).next({ left: 0, right: 2e4 });
    const x = colX - ln.distance - line.width;
    paintLine(this.ctx, this.cur.body, line, x, baseline - line.baseline);
  }
  /** Sombreamento/bordas do parágrafo — inseridos em `at` (antes do texto já pintado). */
  paintBox(out, p, x, width, top, bottom, prev, at = out.length, groupedNext = false) {
    const hasFill = !!shadingFill(p.ppr.shd, this.ctx.fmt.theme);
    if (!p.ppr.pBdr && !hasFill) return;
    const grouped = !!prev?.pBdrKey && prev.pBdrKey === bdrKey(p.ppr);
    const left = x + p.indLeft + Math.min(0, p.firstLine);
    const right = x + width - p.indRight;
    const box = [];
    paintParaBox(this.ctx, box, p, p.ppr.pBdr, left, right, top, bottom, !grouped, !groupedNext, grouped);
    out.splice(at, 0, ...box);
  }
  // ───────────────────────── parágrafo no corpo (paginado) ─────────────────────────
  /** Lista (abstractNum) do parágrafo numerado/com marcador. */
  listOf(p) {
    const id = p.ppr.numPr?.numId;
    return id ? this.ctx.numbering.listKey(id) : void 0;
  }
  /** Passo da grade de linhas para um parágrafo do corpo (snapToGrid=0 desliga). */
  gridFor(p) {
    const pitch = this.cur?.geom.linePitch;
    return pitch && p.ppr.snapToGrid !== false ? pitch : void 0;
  }
  /** parágrafo de marca oculta que se junta ao parágrafo seguinte */
  pendingJoin = null;
  /** runs de parágrafos de marca excluída (revisão) que vão para o início do seguinte */
  pendingDel = null;
  /** o bloco anterior é uma tabela flutuante ancorada no texto (o parágrafo âncora
   *  empurrado para baixo dela tem o "antes" de novo — oráculo ftable2) */
  floatTableGap = false;
  /** âncora levada para a página da continuação da tabela flutuante: abaixo dela, o "antes" inteiro */
  carryAnchorGap = false;
  /**
   * Parágrafo de marca oculta + o seguinte: um parágrafo só, com as propriedades
   * (recuos, alinhamento…) do 1º e a marca do seguinte; o número que aparece é o
   * do 1º, mas o do seguinte também é consumido (oráculo numbering3, hidmark-*).
   */
  joinHidden(join, next, env) {
    const n = resolvePPr(this.ctx, next, env).ppr.numPr;
    if (n?.numId && env.numbering !== false) this.ctx.numbering.next(n.numId, n.ilvl ?? 0);
    const ppr = { ...join.para.ppr };
    if (next.ppr?.rPr) ppr.rPr = next.ppr.rPr;
    else delete ppr.rPr;
    return { ...join.para, ppr, runs: [...join.para.runs, ...next.runs] };
  }
  /** Nenhum run aparece nesta visão (todo o texto excluído — ou parágrafo vazio). */
  noShownRuns(p) {
    return p.runs.every((r) => isMarkRun(r) || this.ctx.rev.run(r) === "hide");
  }
  placeParagraph(para0, ref, blockIdx, g) {
    if (FRAME_SKIP.has(para0)) {
      const carry = FRAME_CARRY.get(para0);
      if (carry) {
        const fr = this.colFrame();
        this.placeFloat(carry, this.cur, fr.x, fr.w, this.y, this.cur.body, 0);
      }
      return;
    }
    if (this.ctx.rev.markGone(para0) && !this.pendingJoin && blockIdx < g.blocks[1] && this.full.blocks[blockIdx + 1]?.type === "paragraph") {
      this.pendingDel = [...this.pendingDel ?? [], ...para0.runs];
      return;
    }
    if (this.ctx.rev.markGone(para0) && this.noShownRuns(para0) && !this.pendingJoin && !this.pendingDel) return;
    const join = this.pendingJoin;
    this.pendingJoin = null;
    const env = { field: this.fieldValue(this.cur, blockIdx) };
    const merged = this.pendingDel ? joinDeleted(this.pendingDel, para0) : para0;
    this.pendingDel = null;
    const para2 = join ? this.joinHidden(join, merged, env) : merged;
    const p = prepareParagraph(this.ctx, para2, join ? { ...env, numbering: false } : env);
    if (join) p.marker = join.marker;
    if (p.marker?.chapter !== void 0 && p.styleId) {
      const lv = /^heading ([1-9])$/i.exec(this.ctx.fmt.styles.styles[p.styleId]?.name ?? "")?.[1];
      if (lv) this.headingMarks.set(ref, { level: +lv, text: p.marker.chapter });
    }
    const hl = this.headingStyleLevel(para0);
    if (hl) this.ctx.heads.push(hl);
    if (p.markStyle.hidden && blockIdx < g.blocks[1]) {
      if (!p.glyphs.length) return;
      if (this.full.blocks[blockIdx + 1]?.type === "paragraph") {
        this.pendingJoin = { para: para2, marker: p.marker };
        return;
      }
    }
    if (blockIdx === g.blocks[1] && !p.glyphs.length && !this.enFlow && this.geoms[g.index + 1]?.type === "continuous" && (this.full.blocks[blockIdx - 1]?.type === "paragraph" || this.ctx.fmt.settings.compatibilityMode < 15)) {
      const sb = p.beforeAuto ? 280 : p.spaceBefore, sa = p.afterAuto ? 280 : p.spaceAfter;
      if (this.prev && !this.atTop) this.y += Math.max(0, this.collapse(this.prev.after, sb) - sb);
      this.prev = { after: 0, afterAuto: false, contextual: false };
      this.sectGapAfter = (this.geoms[g.index + 1]?.cols.length ?? 1) > 1 ? null : sa;
      return;
    }
    if (p.markStyle.hidden && !p.glyphs.length && blockIdx === this.full.blocks.length - 1 && !this.atTop) return;
    const ps0 = this.cur;
    if (p.glyphs[0]?.kind === "pb" && p.glyphs.length > 1) {
      const lastAfter = this.prev ? this.prev.after : 0;
      p.glyphs = p.glyphs.slice(1);
      this.newPage(this.cur.geom);
      this.topGapPrevAfter = lastAfter;
    }
    if (p.marker && p.glyphs.length === 1 && p.glyphs[0].kind === "pb" && !(this.ctx.fmt.settings.compatibilityMode < 15 && this.ctx.fmt.settings.compat["splitPgBreakAndParaMark"])) p.marker = void 0;
    if (p.pageBreakBefore && !this.atTop) {
      const lastAfter = this.prev ? this.prev.after : 0;
      this.newPage(this.cur.geom);
      if (this.ctx.fmt.settings.compatibilityMode < 15) this.topGapPrevAfter = lastAfter;
    }
    const frameBase = this.colFrame();
    const avail = () => this.cur.bodyBottom - this.y;
    let before = p.beforeAuto ? this.firstInDoc ? 0 : 280 : p.spaceBefore;
    let prevAfter = this.prev ? this.prev.after : 0;
    let ctxAfter = null;
    if (this.prev && this.prev.styleId === p.styleId) {
      if (this.prev.contextual) {
        ctxAfter = prevAfter;
        prevAfter = 0;
      }
      if (p.contextual) before = 0;
    }
    const list = this.listOf(p);
    if (list && this.prev?.list === list) {
      if (p.beforeAuto) before = 0;
      if (this.prev.afterAuto) prevAfter = 0;
    }
    let gap = this.collapse(prevAfter, before);
    if (ctxAfter !== null) gap = Math.max(0, this.collapse(ctxAfter, before) - ctxAfter);
    if (this.sectGapAfter !== null) {
      gap = Math.max(0, this.collapse(this.sectGapAfter, before) - this.sectGapAfter);
      this.sectGapAfter = null;
    }
    const keepAfter = this.topGapPrevAfter;
    this.topGapPrevAfter = null;
    if (this.atTop && !this.firstInDoc) gap = keepAfter !== null ? Math.max(0, this.collapse(keepAfter, before) - keepAfter) : 0;
    let tailAt = -1;
    if (p.keepLines || p.keepNext) {
      const ls = this.paragraphLines(p, frameBase.w);
      const lastL = ls[ls.length - 1];
      const fullH = ls.reduce((a, l) => a + l.height, this.borderTopExtent(p, null) + this.borderBottomExtent(p));
      const closedH = fullH - lastL.height + this.closingFit(p, lastL);
      const need = gap + (p.keepNext ? fullH + this.nextBlockLead(blockIdx, g, frameBase.w) : closedH);
      const full = this.cur.bodyBottom - this.colTop;
      if (need > avail() && need <= full && !this.atTop) {
        if (!p.keepLines && gap + closedH > avail()) {
        } else if (!p.keepLines && this.ctx.fmt.settings.compatibilityMode >= 15 && ls.length > 1) {
          const widowOn = p.widowControl || p.ppr.widowControl === void 0;
          const m = widowOn ? ls.length - 2 >= 2 ? 2 : ls.length : 1;
          if (m >= ls.length) {
            this.breakColumn();
            gap = 0;
          } else tailAt = ls.length - m;
        } else {
          this.breakColumn();
          gap = 0;
        }
      }
    }
    const yPre = this.y;
    const gapIn = !this.atTop || this.firstInDoc || keepAfter !== null ? gap : 0;
    this.y += gapIn;
    if (this.atTop && gapIn > 0 && this.cur.floats.some((f) => f.bodyOnly)) {
      const fr = this.colFrame();
      const f0 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, yPre, gapIn + markLineH(p));
      if (f0.skipTo !== void 0 && f0.skipTo > yPre) this.y = Math.max(this.y, f0.skipTo + gapIn);
    }
    const paraRef = yPre + Math.min(prevAfter, gapIn);
    const selfGap = gapIn - Math.min(prevAfter, gapIn);
    const ftGap = this.floatTableGap && !this.atTop ? gap : this.carryAnchorGap ? before : 0;
    this.floatTableGap = false;
    this.carryAnchorGap = false;
    this.firstInDoc = false;
    void ps0;
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    const groupedNext = blockIdx + 1 <= g.blocks[1] && this.groupsWithNext(p, this.full.blocks[blockIdx + 1]);
    const widow = p.widowControl || p.ppr.widowControl === void 0;
    let frag = [];
    let fragTop = this.y;
    let fragHasFirst = true;
    const flushFrag = (isLast) => {
      if (!frag.length) return;
      const frameX = frag[0].frameX;
      const boxTop = fragTop;
      const boxAt = this.cur.body.length;
      for (const f of frag) {
        if (this.cur.geom.lnNum && !p.ppr.suppressLineNumbers) this.paintLineNumber(f.frameX, f.y + f.line.baseline);
        paintLine(this.ctx, this.cur.body, f.line, f.frameX, f.y);
        this.paintInlineDrawings(this.cur.body, f.line, f.frameX, f.y, this.cur);
        this.cur.page.lines.push(lineRecord(ref, p, f.line, f.frameX, f.y, this.colFrame().w));
      }
      const last = frag[frag.length - 1];
      let bottom = last.y + last.line.height;
      this.noteColContent(bottom);
      if (isLast) bottom += this.borderBottomExtent(p, groupedNext);
      this.paintBox(this.cur.body, p, frameX, this.colFrame().w, boxTop, bottom, frag === null ? null : this.prev, boxAt, isLast && groupedNext);
      frag = [];
    };
    this.y += this.borderTopExtent(p, this.prev);
    let first = true;
    let lineNo = 0;
    const tailPs = this.cur;
    let anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: paraRef };
    let early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y, void 0, paraRef);
    const over = early.filter((e) => followsText(floatAnchor(e.obj.run)) && e.obj.y + e.obj.h > this.cur.bodyBottom + 0.5);
    if (!this.atTop && over.length) {
      const paraBottom = this.y + this.paragraphHeight(p, frameBase.w);
      const lift = over.every((e) => this.cur.bodyBottom - e.obj.h >= paraBottom - 0.5);
      for (const e of early) this.unplaceFloat(e);
      if (lift) {
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y, this.cur.bodyBottom, paraRef);
      } else {
        this.breakColumn();
        this.y += this.borderTopExtent(p, this.prev);
        anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: void 0 };
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
      }
    }
    let earlyAt = { ps: this.cur, x: this.colFrame().x };
    const earlyRuns = new Set(early.map((e) => e.obj.run));
    const hangs = blockIdx === g.blocks[1] && g.index < this.full.sections.length - 1 && p.glyphs.every((gl) => gl.kind === "obj" && gl.adv === 0);
    const frameHere = () => {
      const fr = this.colFrame();
      const lineH = markLineH(p);
      let frame = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, lineH);
      for (let k = 0; k < 8 && frame.skipTo !== void 0 && frame.skipTo > this.y; k++) {
        this.y = frame.skipTo;
        frame = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, lineH);
      }
      return frame;
    };
    do {
      const y0 = this.y;
      let frame = frameHere();
      const pushGap = ftGap > 0 ? ftGap : selfGap;
      if (first && pushGap > 0 && this.y > y0) {
        this.y += pushGap;
        frame = frameHere();
      }
      const mark = br.mark();
      let seg = this.pickSeg(br, frame);
      let line = br.next(seg.f);
      const textH = Math.min(line.height, line.baseline + line.desc);
      if (this.cur.floats.length && textH > markLineH(p) + 1) {
        const fr = this.colFrame();
        const f2 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, textH);
        if (f2.skipTo !== void 0 && f2.skipTo > this.y) {
          this.y = f2.skipTo + (first ? selfGap : 0);
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        } else if (narrower(f2, frame)) {
          frame = f2;
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      if (this.cur.floats.length && this.y > y0 + 0.5) {
        const textH2 = Math.min(line.height, line.baseline + line.desc);
        if (textH2 < markLineH(p) - 1) {
          const fr = this.colFrame();
          const f0 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, y0, textH2);
          if (f0.skipTo === void 0 && !narrower(f0, frame)) {
            const yb = this.y;
            this.y = y0;
            br.reset(mark);
            const seg0 = this.pickSeg(br, f0);
            const line0 = br.next(seg0.f);
            if (Math.min(line0.height, line0.baseline + line0.desc) <= textH2 + 0.5) {
              frame = f0;
              seg = seg0;
              line = line0;
            } else {
              this.y = yb;
              br.reset(mark);
              seg = this.pickSeg(br, frame);
              line = br.next(seg.f);
            }
          }
        }
      }
      if (this.cur.floats.length && !line.last && line.end > line.start && line.end < p.glyphs.length) {
        const fr = this.colFrame();
        const narrowed = frame.left > p.indLeft + 0.5 || frame.right < fr.w - p.indRight - 0.5;
        const g0 = p.glyphs[line.end - 1], g1 = p.glyphs[line.end];
        const word = (g2) => g2.kind === "char" && !/\s/.test(g2.ch);
        if (narrowed && word(g0) && !g0.breakAfter && word(g1) && !line.placed[line.placed.length - 1]?.g.autoHyphen) {
          const lineH2 = Math.max(markLineH(p), line.height);
          let below = Infinity;
          for (const f of this.cur.floats) {
            if (f.wrap !== "square" && f.wrap !== "tight" && f.wrap !== "through") continue;
            if (this.y + lineH2 <= f.y - f.distT + 0.5 || this.y >= f.y + f.h + f.distB - 0.5) continue;
            below = Math.min(below, f.y + f.h + f.distB);
          }
          if (below < Infinity && below > this.y) {
            this.y = below;
            frame = frameHere();
            br.reset(mark);
            seg = this.pickSeg(br, frame);
            line = br.next(seg.f);
          }
        }
      }
      if (line.gapTab === "start" && this.cur.floats.length) {
        const lineH2 = Math.max(markLineH(p), line.height);
        let below = Infinity;
        for (const f of this.cur.floats) {
          if (f.wrap !== "square" && f.wrap !== "tight" && f.wrap !== "through") continue;
          if (this.y + lineH2 <= f.y - f.distT + 0.5 || this.y >= f.y + f.h + f.distB - 0.5) continue;
          below = Math.min(below, f.y + f.h + f.distB);
        }
        if (below < Infinity && below > this.y) {
          this.y = below;
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      if (this.cur.floats.length && line.last && this.ctx.fmt.settings.compatibilityMode < 15) {
        const aft = p.afterAuto ? 280 : p.spaceAfter;
        const fr = this.colFrame();
        const f3 = aft > 0 ? this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, line.height + aft) : void 0;
        if (f3?.skipTo !== void 0 && f3.skipTo > this.y) {
          this.y = f3.skipTo + (first ? selfGap : 0);
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      let noteNeed = this.noteNeed(p, line);
      let pageChanged = false;
      const breakOnly = line.breakAfter === "page" && !line.last && line.placed.every((pg) => pg.g.kind === "pb");
      const fitH = breakOnly ? 0 : p.lineRule === "exact" || p.lineRule === "atLeast" ? line.height : Math.min(line.height, line.baseline + line.desc);
      let noteCut = null;
      if (noteNeed.extra > 0 && !this.atTop && !hangs && this.y + this.noteLineFit(p, line) > this.cur.bodyBottom - noteNeed.extra + 0.05 && this.y + this.noteLineFit(p, line) <= this.cur.bodyBottom + 0.05) noteCut = this.notePartial(noteNeed.ids, this.y + this.noteLineFit(p, line));
      if (lineNo === tailAt && this.cur === tailPs && frag.length && !this.atTop) {
        flushFrag(false);
        fragHasFirst = false;
        this.breakColumn();
        fragTop = this.y;
        pageChanged = true;
      } else if (!noteCut && this.y + (noteNeed.extra > 0 ? this.noteLineFit(p, line) : fitH) > this.cur.bodyBottom - noteNeed.extra + 0.05 && !this.atTop && !hangs) {
        const placedHere = frag.length;
        const moved = [];
        if (widow && placedHere === 1 && fragHasFirst && !first) {
          moved.push(frag.pop().line);
        } else if (widow && line.last && placedHere >= 2) {
          moved.push(frag.pop().line);
          if (frag.length === 1 && fragHasFirst) moved.unshift(frag.pop().line);
        }
        const allMoved = fragHasFirst && frag.length === 0;
        flushFrag(false);
        fragHasFirst = allMoved;
        this.breakColumn();
        fragTop = this.y;
        if (allMoved) anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: void 0 };
        for (const m of moved) {
          const fx = this.colFrame().x;
          frag.push({ line: m, y: this.y, frameX: fx });
          this.y += m.height;
        }
        pageChanged = true;
      }
      if (first) {
        if (early.length && (earlyAt.ps !== this.cur || earlyAt.x !== this.colFrame().x)) {
          for (const e of early) this.unplaceFloat(e);
          early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
          earlyAt = { ps: this.cur, x: this.colFrame().x };
        }
        if (anchorAt.ps !== this.cur || this.y <= anchorAt.top + 0.5 || this.y > this.cur.bodyBottom) anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: void 0 };
      }
      if (pageChanged) {
        const yTop = this.y;
        let nf = frameHere();
        if (first && fragHasFirst && !frag.length && pushGap > 0 && this.y > yTop + 0.01) {
          this.y += pushGap;
          nf = frameHere();
        }
        if (nf.left !== frame.left || nf.right !== frame.right || nf.segs || frame.segs) {
          br.reset(mark);
          frame = nf;
          seg = this.pickSeg(br, nf);
          line = br.next(seg.f);
          noteNeed = this.noteNeed(p, line);
        }
      }
      if (noteNeed.ids.length) this.reserveNotes(noteNeed.ids, pageChanged ? null : noteCut);
      frag.push({ line, y: this.y, frameX: this.colFrame().x });
      let lineH = line.height;
      line = this.moreSegs(br, frame, seg.k, line, (l) => {
        const nn = this.noteNeed(p, l);
        if (nn.ids.length) this.reserveNotes(nn.ids);
        frag.push({ line: l, y: this.y, frameX: this.colFrame().x });
        lineH = Math.max(lineH, l.height);
      });
      this.y += lineH;
      this.atTop = false;
      first = false;
      lineNo++;
      if (line.clear) {
        for (let k = 0; k < 8; k++) {
          const yy = this.y;
          const below = this.cur.floats.filter((f) => f.wrap !== "none" && f.y - f.distT < yy && f.y + f.h + f.distB > yy);
          if (!below.length) break;
          this.y = Math.max(...below.map((f) => f.y + f.h + f.distB));
        }
      }
      if (line.breakAfter === "page") {
        flushFrag(false);
        fragHasFirst = false;
        this.newPage(this.cur.geom);
        fragTop = this.y;
        this.atTop = true;
      } else if (line.breakAfter === "column") {
        flushFrag(false);
        fragHasFirst = false;
        this.breakColumn();
        fragTop = this.y;
      }
    } while (!br.done());
    flushFrag(true);
    this.y += this.borderBottomExtent(p, groupedNext);
    if (!this.atTop) this.noteColContent(this.y + (p.afterAuto ? 280 : p.spaceAfter));
    for (const r of earlyRuns) this.prePlaced.add(r);
    this.placeFloats(p, anchorAt.ps, anchorAt.x, anchorAt.w, anchorAt.top, anchorAt.ps.body, 0, anchorAt.ref);
    for (const r of earlyRuns) this.prePlaced.delete(r);
    const lastGlyph = p.glyphs[p.glyphs.length - 1];
    const splitPg = this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat["splitPgBreakAndParaMark"];
    if (lastGlyph?.kind === "pb" && !splitPg) this.atTop = true;
    this.prev = {
      after: p.afterAuto ? 280 : p.spaceAfter,
      afterAuto: p.afterAuto,
      ...list ? { list } : {},
      ...p.styleId ? { styleId: p.styleId } : {},
      contextual: p.contextual,
      ...p.ppr.pBdr ? { pBdr: p.ppr.pBdr, pBdrKey: bdrKey(p.ppr) } : {}
    };
  }
  // ───────────────────────── notas de rodapé ─────────────────────────
  /** conteúdo diagramado por nota e largura */
  noteCache = /* @__PURE__ */ new Map();
  /** Colunas da área de notas de rodapé: com w15:footnoteColumns, N iguais com vão de
   *  720 tw (oráculo notefmt, cols2); sem ("coincidir layout de seção"), as colunas da
   *  própria seção (sect-cols2). x relativo à margem esquerda; w = a da 1ª coluna. */
  noteCols(g) {
    const contentW = g.pageW - g.marL - g.marR;
    const n = g.notes.fnCols ?? g.cols.length;
    if (g.notes.fnCols === void 0 && n > 1) return { n, w: g.cols[0].w, dx: g.cols.map((c) => c.x - g.marL) };
    const gap = 720, w = n > 1 ? (contentW - gap * (n - 1)) / n : contentW;
    return { n, w, dx: Array.from({ length: n }, (_, k) => k * (w + gap)) };
  }
  /** Conteúdo diagramado de uma nota (largura do corpo ou da coluna de notas). */
  noteContent(id) {
    const g = this.cur.geom;
    const w = this.noteCols(g).w;
    const key = `${id}:${Math.round(w)}`;
    let c = this.noteCache.get(key);
    if (!c) {
      const blocks = this.full.footnoteBlocks?.get(id) ?? (this.full.footnotes.get(id) ?? []).map((paragraph) => ({ type: "paragraph", paragraph }));
      const mark = this.ctx.noteMarkOf("footnote", id) ?? "";
      const saved = this.ctx.numbering;
      this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      try {
        c = this.layoutStatic(blocks, g.marL, w, {
          field: (name) => name === "FOOTNOTEREF_MARK" ? mark : this.fieldValue(this.cur)(name)
        }, `fn${id}`);
      } finally {
        this.ctx.numbering = saved;
      }
      this.noteCache.set(key, c);
    }
    return c;
  }
  /** Notas de rodapé NOVAS referenciadas pelas linhas de texto de uma linha de tabela
   *  (cada linha diz o parágrafo de origem no ref: b3/r2/c0/b1…). */
  rowNoteIds(row) {
    const ids = [];
    for (const l of row.lines) {
      const para2 = this.paraByRef(l.ref);
      if (!para2) continue;
      let off = 0;
      for (const r of para2.runs) {
        const len = r.text.length;
        const id = r.noteRef?.kind === "footnote" ? r.noteRef.id : void 0;
        if (id !== void 0 && off + Math.max(len, 1) > l.start && off < Math.max(l.end, l.start + 1) && !ids.includes(id) && !this.cur.notes.some((n) => n.id === id)) ids.push(id);
        off += len;
      }
    }
    return ids;
  }
  rowNoteExtra(row) {
    return this.notesExtra(this.rowNoteIds(row));
  }
  /** Parágrafo do corpo pelo caminho do ref ("b3/r2/c0/b1"). */
  paraByRef(ref) {
    const seg = ref.split("/");
    const m = /^b(\d+)$/.exec(seg[0] ?? "");
    if (!m) return void 0;
    let block = this.full.blocks[+m[1]];
    for (let i = 1; i + 2 < seg.length + 1 && block; i += 3) {
      if (block.type !== "table") return void 0;
      const ri = /^r(\d+)$/.exec(seg[i] ?? ""), ci = /^c(\d+)$/.exec(seg[i + 1] ?? ""), bi = /^b(\d+)$/.exec(seg[i + 2] ?? "");
      if (!ri || !ci || !bi) return void 0;
      const row = block.rows[+ri[1]];
      let col = row?.trPr?.gridBefore ?? 0, cell;
      for (const c of row?.cells ?? []) {
        if (col === +ci[1]) {
          cell = c;
          break;
        }
        col += Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1);
      }
      if (!cell) return void 0;
      const blocks = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
      block = blocks[+bi[1]];
    }
    return block?.type === "paragraph" ? block.paragraph : void 0;
  }
  sepCache;
  /**
   * Linha do separador: altura (1 linha SIMPLES da fonte do Normal, sem espaçamento —
   * o pPr do separador e a entrelinha do Normal não contam, oráculo fnsep), o meio do
   * traço (0,23 em acima da base da linha) e a espessura (0,05 em em pixels de 1/600",
   * por cima — medidos com Arial, Calibri e Times: oráculo endnotes, sep-*).
   */
  sepGeom() {
    if (!this.sepCache) {
      const ppr = { spacing: { before: 0, after: 0, line: 240, lineRule: "auto" } };
      const p = prepareParagraph(this.ctx, { runs: [], props: paraPropsFromPPr(ppr), ppr }, {});
      const l = new LineBreaker(this.ctx, p).next({ left: 0, right: 1e4 });
      const em = (p.markStyle.sizePt || 10) * 20;
      this.sepCache = { h: l.height, mid: l.baseline - 0.23 * em, thick: Math.max(2.4, Math.ceil(0.05 * em / 2.4 - 0.01) * 2.4) };
    }
    return this.sepCache;
  }
  /** Altura do separador (1 linha do estilo Normal). */
  separatorHeight() {
    return this.sepGeom().h;
  }
  /** Traço do separador a partir do topo `top` da linha dele (2" no normal, a
   *  largura da coluna no de continuação das notas de fim). */
  sepLine(x, top, w) {
    const sg = this.sepGeom();
    return { t: "rect", x, y: top + sg.mid - sg.thick / 2, w, h: sg.thick, fill: "000000" };
  }
  /** Altura da área de notas (separador + notas; em colunas, a coluna mais alta). */
  noteAreaOf(contents, g = this.cur.geom) {
    if (!contents.length) return 0;
    return this.separatorHeight() + this.packNotes(contents.map((c) => c.height), this.noteCols(g).n).height;
  }
  /** Notas inteiras por coluna: cada coluna recebe notas até passar da média
   *  (oráculo notefmt, cols2); uma coluna = em sequência. */
  packNotes(hs, n) {
    const col = [], top = [];
    const target = n > 1 ? hs.reduce((a, b) => a + b, 0) / n : Infinity;
    let c = 0, y = 0, max = 0;
    for (const h of hs) {
      if (y > 0 && y >= target - 0.5 && c < n - 1) {
        c++;
        y = 0;
      }
      col.push(c);
      top.push(y);
      y += h;
      max = Math.max(max, y);
    }
    return { col, top, height: max };
  }
  /** Espaço que as notas NOVAS `ids` acrescentam à área de notas da página. */
  notesExtra(ids) {
    if (!ids.length) return 0;
    const cur = this.cur.notes.map((n) => n.content);
    return this.noteAreaOf([...cur, ...ids.map((id) => this.noteContent(id))]) - this.noteAreaOf(cur);
  }
  /** Altura com que a linha que traz uma nota NOVA precisa caber acima das notas: a
   *  linha inteira (com a entrelinha extra) e, na última do parágrafo, o "depois"
   *  dele (oráculo fnsep, varreduras fsep-top* / fsep-a0-*) */
  noteLineFit(p, line) {
    return line.height + (line.last ? p.afterAuto ? 280 : p.spaceAfter : 0);
  }
  /** Notas NOVAS referenciadas na linha e o espaço extra que exigem. */
  noteNeed(p, line) {
    const ids = [];
    for (let k = line.start; k < line.end; k++) {
      const id = p.glyphs[k]?.noteId;
      if (id !== void 0 && !ids.includes(id) && !this.cur.notes.some((n) => n.id === id)) ids.push(id);
    }
    return { ids, extra: this.notesExtra(ids) };
  }
  reserveNotes(ids, cut) {
    const ps = this.cur;
    for (const id of ids) {
      if (ps.notes.some((n) => n.id === id)) continue;
      const content = cut && cut.id === id ? cut.first : this.noteContent(id);
      ps.notes.push({ id, content });
      if (cut && cut.id === id) this.noteCarry.push({ id, content: cut.rest });
    }
    ps.noteArea = this.noteAreaOf(ps.notes.map((n) => n.content), ps.geom);
    ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
  }
  /** notas que continuam na página seguinte (o resto de uma nota partida) */
  noteCarry = [];
  /** nota partida da linha de tabela que vai ser emitida */
  rowNoteCut = null;
  /** tabela do fluxo: os fundos de mescla vertical saem por página no fim (oráculo vmshd) */
  flowFills = false;
  /**
   * Nota NOVA que não cabe inteira com a linha da referência (que termina em `bottom`):
   * o começo dela fica nesta página — o que couber, com viúvas/órfãs da própria nota — e o
   * resto continua no pé da seguinte, antes das notas de lá (oráculo fncont). Só a última
   * das notas da linha parte; sem ao menos o começo permitido, null (a linha desce).
   * Com a área de notas em colunas, a nota não parte.
   */
  notePartial(ids, bottom) {
    if (!ids.length || this.noteCols(this.cur.geom).n > 1) return null;
    const ps = this.cur;
    let h = ps.notes.length ? 0 : this.separatorHeight();
    for (const id2 of ids.slice(0, -1)) h += this.noteContent(id2).height;
    const id = ids[ids.length - 1];
    const avail = ps.bodyBottom - bottom - h;
    if (avail <= 0) return null;
    const sp2 = splitContent(this.noteContent(id), avail);
    return sp2 && sp2[0].lines.length && sp2[1].lines.length ? { id, first: sp2[0], rest: sp2[1] } : null;
  }
  /** Separador + notas, alinhados ao fundo do corpo (medido no Word); "abaixo do
   *  texto" (w:pos beneathText): logo depois do conteúdo da página, como as notas de
   *  fim (oráculo notefmt, pos-beneath*). As linhas das notas entram na página
   *  (o editor edita a nota no lugar). */
  paintNotes(ps) {
    if (!ps.notes.length) return;
    const g = ps.geom;
    let y = ps.bodyBottomBase - ps.noteArea;
    if (g.notes.fnPos === "beneathText" && ps === this.cur) {
      const end = Math.max(this.y, this.colMaxY) + (this.prev && !this.atTop ? this.prev.after : 0);
      y = Math.max(ps.bodyTop, Math.min(y, end));
    }
    ps.body.push(this.sepLine(g.marL, y, 2880));
    y += this.separatorHeight();
    const cols = this.noteCols(g);
    const pack = this.packNotes(ps.notes.map((n) => n.content.height), cols.n);
    ps.notes.forEach((n, i) => {
      const dx = cols.dx[pack.col[i]] ?? 0, dy = y + pack.top[i];
      for (const it of n.content.items) ps.body.push(shiftItem(it, dy, dx));
      for (const l of n.content.lines) ps.page.lines.push(shiftLineXY(l, dx, dy));
    });
  }
  // ───────────────────────── notas de fim ─────────────────────────
  /** fluxo de notas de fim em curso (o separador já saiu: páginas e colunas seguintes
   *  ganham o de continuação) */
  enFlow = null;
  /** nota de fim sendo diagramada (o número dela no campo ENDNOTEREF_MARK) */
  curEndnote;
  /** quantas notas de fim (na ordem de referência) já saíram */
  endnotesDone = 0;
  /**
   * Notas de fim pendentes no fluxo, depois do conteúdo da seção/documento: o
   * separador (uma linha simples da fonte do Normal, depois do "depois" do último
   * parágrafo, que mantém a 1ª linha da 1ª nota com ele) e as notas na ordem de
   * referência; a continuação noutra página tem o separador de continuação
   * (oráculo endnotes). Linhas com ref "en<id>/b<k>".
   */
  placeEndnotes(g) {
    const order = this.ctx.endnoteOrder;
    const ids = order.slice(this.endnotesDone);
    this.endnotesDone = order.length;
    if (!ids.length) return;
    const sepPPr = { spacing: { before: 0, after: 0, line: 240, lineRule: "auto" }, keepNext: true };
    const sep = { runs: [], props: paraPropsFromPPr(sepPPr), ppr: sepPPr };
    const blocks = [{ type: "paragraph", paragraph: sep }];
    const refs = ["ensep"];
    const owner = [void 0];
    for (const id of ids) {
      const bs = this.full.endnoteBlocks?.get(id) ?? (this.full.endnotes.get(id) ?? []).map((paragraph) => ({ type: "paragraph", paragraph }));
      bs.forEach((b, k) => {
        blocks.push(b);
        refs.push(`en${id}/b${k}`);
        owner.push(id);
      });
    }
    if (blocks.length < 2) return;
    const saved = this.full;
    this.full = { ...saved, blocks };
    const multi = this.pageCols().length > 1 || g.cols.length > 1;
    const gEn = { ...g, blocks: [0, blocks.length - 1], ...multi ? { balKey: -1 - g.index } : {} };
    if (multi) this.continuousSection(gEn);
    this.enFlow = { sepDone: false };
    try {
      for (let b = 0; b < blocks.length; b++) {
        const block = blocks[b];
        this.curEndnote = owner[b];
        if (block.type === "paragraph") this.placeParagraph(block.paragraph, refs[b], b, gEn);
        else this.placeTable(block, refs[b]);
        if (b === 0) {
          const lines = this.cur.page.lines;
          const at = lines.map((l) => l.ref).lastIndexOf("ensep");
          if (at >= 0) {
            const l = lines[at];
            lines.splice(at, 1);
            this.cur.body.push(this.sepLine(l.x, l.y, 2880));
          }
          this.enFlow.sepDone = true;
        }
      }
      if (multi) this.recordBalance(gEn);
    } finally {
      this.full = saved;
      this.enFlow = null;
      this.curEndnote = void 0;
    }
  }
  /** Separador de continuação no topo da página/coluna nova do fluxo de notas de fim
   *  (`draw`: o traço, da largura da coluna; na coluna seguinte só o lugar). */
  continuationSeparator(draw) {
    const fr = this.colFrame();
    if (draw) this.cur.body.push(this.sepLine(fr.x, this.y, fr.w));
    this.y += this.separatorHeight();
  }
  /** Linhas de um parágrafo (sem quebra de página), p/ keepLines/keepNext. */
  paragraphLines(p, width) {
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    const ls = [];
    do
      ls.push(br.next({ left: p.indLeft, right: width - p.indRight }));
    while (!br.done());
    return ls;
  }
  /** Altura com que a linha que fecha um bloco precisa caber: a entrelinha extra
   *  (múltipla > 1) fica abaixo do texto e pode passar da margem (oráculos pagefit, keepfit). */
  closingFit(p, l) {
    return p.lineRule === "exact" || p.lineRule === "atLeast" ? l.height : Math.min(l.height, l.baseline + l.desc);
  }
  /** Altura total de um parágrafo (sem quebra de página), p/ keepLines/keepNext. */
  paragraphHeight(p, width) {
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    let h = this.borderTopExtent(p, null) + this.borderBottomExtent(p);
    do
      h += br.next({ left: p.indLeft, right: width - p.indRight }).height;
    while (!br.done());
    return h;
  }
  /** Altura da 1ª linha (e cadeia keepNext) do bloco seguinte. */
  nextBlockLead(blockIdx, g, width) {
    const nb = this.full.blocks[blockIdx + 1];
    if (!nb || blockIdx + 1 > g.blocks[1]) return 0;
    const saved = this.ctx.saveFlow();
    try {
      const curB = this.full.blocks[blockIdx];
      const from = curB?.type === "paragraph" ? prepareParagraph(this.ctx, curB.paragraph, {}) : void 0;
      let after = from ? from.afterAuto ? 280 : from.spaceAfter : 0;
      if (nb.type === "table") {
        const t = layoutTable(this.ctx, nb, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref), "preview");
        const r0 = t.rows[0];
        if (!r0) return 0;
        const startNeed = (r, cap) => r.cantSplit || (r.natural ?? r.height) < r.height ? r.height : Math.min(r.height, cap);
        const r1 = t.rows[1];
        let chain = 0, k = 0;
        while (t.rows[k]?.keepNext && t.rows[k + 1]) {
          chain += t.rows[k].height;
          k++;
        }
        const lead = k > 0 ? chain + startNeed(t.rows[k], 400) : r1 && r0.keepNext ? r0.height + startNeed(r1, 400) : startNeed(r0, r0.natural ?? r0.height);
        const dropped = !!from && this.dropsAfterBeforeTable({ after, afterAuto: from.afterAuto, contextual: from.contextual, ...from.styleId ? { styleId: from.styleId } : {} }, nb);
        return (dropped ? 0 : after) + lead;
      }
      const q = prepareParagraph(this.ctx, nb.paragraph, {});
      let before = q.spaceBefore;
      let ctxAfter = null;
      if (from && from.styleId === q.styleId) {
        if (from.contextual) {
          ctxAfter = after;
          after = 0;
        }
        if (q.contextual) before = 0;
      }
      const gap = ctxAfter !== null ? Math.max(0, this.collapse(ctxAfter, before) - ctxAfter) : this.collapse(after, before);
      if (q.keepNext) return gap + this.paragraphHeight(q, width) + this.nextBlockLead(blockIdx + 1, g, width);
      if (q.keepLines) {
        const ls = this.paragraphLines(q, width);
        const lastL = ls[ls.length - 1];
        return gap + ls.reduce((a, l) => a + l.height, this.borderTopExtent(q, null)) - lastL.height + this.closingFit(q, lastL);
      }
      const br = new LineBreaker(this.ctx, q, this.gridFor(q));
      const qs = [];
      do
        qs.push(br.next({ left: q.indLeft, right: width - q.indRight }));
      while (!br.done() && qs.length < 4);
      const widow = q.widowControl || q.ppr.widowControl === void 0;
      const n = !widow ? 1 : br.done() && qs.length <= 3 ? qs.length : 2;
      const take = qs.slice(0, n);
      return gap + take.reduce((a, l) => a + l.height, 0) - take[n - 1].height + this.closingFit(q, take[n - 1]);
    } finally {
      this.ctx.restoreFlow(saved);
    }
  }
  // ───────────────────────── tabelas no corpo ─────────────────────────
  placeTable(table2, ref, blockIdx = -1) {
    if (table2.rows.every((r) => isHiddenRow(this.ctx, r))) return;
    this.sectGapAfter = null;
    const fr = this.colFrame();
    const fp = table2.tblPr?.tblpPr;
    if (fp && fp.tblpYSpec !== "inline") {
      const textAnchor = fp.vertAnchor !== "page" && fp.vertAnchor !== "margin";
      if (textAnchor) {
        if (this.prev && !this.atTop && this.prev.after > 0 && !this.prev.contextual) {
          this.y += this.prev.after;
          this.prev = { ...this.prev, after: 0 };
        }
        this.floatTableGap = true;
      }
      const ltp = blockIdx >= 0 && !textAnchor ? this.lateTables.get(blockIdx) : void 0;
      for (let k = 0; ltp && k < 20 && this.pages.length - 1 < ltp.page; k++) this.breakColumn();
      if (blockIdx >= 0 && this.placedTables.has(blockIdx)) {
        const lt = this.lateTables.get(blockIdx);
        if (lt && !textAnchor && this.pages.length - 1 > lt.page && !this.lateTablesFound.size) this.lateTablesFound.set(blockIdx, { page: this.pages.length - 1, flowY: this.y });
        if (this.lateSplit.delete(blockIdx) && this.floatCarry.length && this.col === this.cur.geom.cols.length - 1) {
          this.breakColumn();
          this.carryAnchorGap = true;
        }
        return;
      }
      if (blockIdx >= 0) this.placedTables.add(blockIdx);
      const t2 = layoutTable(this.ctx, table2, 0, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
      const items = [];
      let flowY = this.y;
      if (textAnchor) {
        let f = this.wrapFrame({ left: 0, right: fr.w }, fr.x, flowY);
        for (let k = 0; k < 8 && f.skipTo !== void 0 && f.skipTo > flowY; k++) {
          flowY = f.skipTo;
          f = this.wrapFrame({ left: 0, right: fr.w }, fr.x, flowY);
        }
        const top = fp.tblpYSpec ? flowY : flowY + (fp.tblpY ?? 0);
        const r0 = t2.rows[0];
        if (this.noBreakWrapped()) {
          if (!this.atTop && flowY + t2.rows.reduce((a, r) => a + r.height, 0) > this.cur.bodyBottom + 0.5) {
            this.breakColumn();
            flowY = this.y;
          }
        } else if (!this.atTop && r0 && top + r0.height > this.cur.bodyBottom + 0.5) {
          const avail = this.cur.bodyBottom - top;
          const onlyMin = (r0.natural ?? r0.height) <= avail + 0.5;
          const parts = onlyMin || r0.cantSplit ? null : r0.split?.(avail) ?? null;
          if (!(parts && parts[0].height > 0)) {
            this.breakColumn();
            flowY = this.y;
          }
        }
      }
      const nFloats = this.cur.floats.length;
      const nCarry = this.floatCarry.length;
      this.placeFloatingTable(t2, fp, this.cur, flowY, fr.x, fr.w, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
      const box = this.cur.floats.length > nFloats ? this.cur.floats[this.cur.floats.length - 1] : void 0;
      if (blockIdx >= 0 && box) {
        const g = this.cur.geom;
        const hit = this.cur.page.lines.some((l) => /^b\d+$/.test(l.ref) && l.y + l.height > box.y - box.distT + 1 && l.y < box.y + box.h + box.distB - 1 && box.x + box.w + box.distR > g.marL && box.x - box.distL < g.pageW - g.marR);
        if (hit && !this.lateTablesFound.size) this.lateTablesFound.set(blockIdx, { page: this.pages.indexOf(this.cur), flowY });
      }
      if (this.floatCarry.length > nCarry && this.col === this.cur.geom.cols.length - 1) {
        this.breakColumn();
        this.carryAnchorGap = true;
      }
      return;
    }
    this.floatTableGap = false;
    if (this.prev) {
      this.y += this.atTop || this.dropsAfterBeforeTable(this.prev, table2) ? 0 : this.prev.after;
    }
    this.assignCellNeighbors(table2, this.prev ? { ...this.prev.styleId ? { styleId: this.prev.styleId } : {} } : void 0);
    this.prev = null;
    this.firstInDoc = false;
    this.topGapPrevAfter = null;
    const t = layoutTable(this.ctx, table2, fr.x, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
    if (blockIdx >= 0) this.pinFloatsOverTable(t, blockIdx);
    this.lastRowEmit = null;
    const headerRows = [];
    for (const r of t.rows) {
      if (r.header) headerRows.push(r);
      else break;
    }
    const mergeMoved = /* @__PURE__ */ new Set();
    const rowEmits = [];
    const flowMerges = [];
    this.flowFills = true;
    t.rows.forEach((row0, ri) => {
      let row = row0;
      if (ri === 0 && headerRows.length && headerRows.length < t.rows.length && !this.atTop && this.ctx.fmt.settings.compatibilityMode >= 15) {
        const avail = this.cur.bodyBottom - this.y;
        const hh = headerRows.reduce((a, r) => a + r.height, 0);
        if (hh <= avail + 0.5 && !this.rowCanStart(t.rows[headerRows.length], avail - hh)) this.breakColumn();
      }
      if (row.keepNext && !this.atTop && ri + 1 < t.rows.length) {
        const avail = this.cur.bodyBottom - this.y;
        let chainH = row.height, k = ri + 1;
        while (k + 1 < t.rows.length && t.rows[k].keepNext && chainH + t.rows[k].height <= avail + 0.5) {
          chainH += t.rows[k].height;
          k++;
        }
        if (chainH <= avail + 0.5 && !this.rowCanStart(t.rows[k], avail - chainH)) {
          if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
          this.breakColumn();
          if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
        }
      }
      for (let guard = 0; guard < 500; guard++) {
        this.y = this.belowFloats(t.x, t.width, this.y, row.lines.length ? Math.min(row.height, ...row.lines.map((l) => l.y + l.height)) : row.height);
        const avail = Math.min(this.cur.bodyBottom - this.rowNoteExtra(row), this.floatFloor(t.x, t.width, this.y)) - this.y;
        const bw = ri < t.rows.length - 1 ? row.breakW ?? 0 : 0;
        if (this.atTop && row.topCut && row.height - row.topCut + bw <= avail + 0.5) row = atPageTop(row);
        if (row.height + bw <= avail + 0.05) break;
        if (!this.atTop && this.y + row.height + bw <= Math.min(this.cur.bodyBottom, this.floatFloor(t.x, t.width, this.y)) + 0.05) {
          const cut = this.notePartial(this.rowNoteIds(row), this.y + row.height + bw);
          if (cut) {
            this.rowNoteCut = cut;
            break;
          }
        }
        const onlyMin = (row.natural ?? row.height) + bw <= avail + 0.05;
        const parts = onlyMin ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          rowEmits.push({ ri, ps: this.cur, y: this.y, h: parts[0].height, at: this.cur.body.length });
          this.emitRow(parts[0]);
          row = parts[1];
        } else if (this.atTop) break;
        if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
        this.breakColumn();
        if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
      }
      if (row === row0 || row.cut !== void 0) row = dropMoved(mergeTextFirst(t.rows, ri, row, mergeMoved, (h) => this.y + h <= this.cur.bodyBottom + 0.5 && this.belowFloats(t.x, t.width, this.y, h) === this.y), mergeMoved);
      let grow = 0;
      for (const mt of row0.mergeText ?? []) {
        const s = rowEmits.find((e) => e.ri === mt.start);
        if (!s || s.ps === this.cur || !mt.content) continue;
        for (const o of [...mt.items, ...mt.lines]) mergeMoved.add(o);
        const off = (mt.band ?? 0) + (mt.marT ?? 0);
        flowMerges.push({ start: mt.start, end: ri, col: mt.col, content: mt.content, off, ...mt.vAlign ? { vAlign: mt.vAlign } : {} });
        let rest = mt.content, segPs = null, segTop = 0, segBot = 0, segCut = 0;
        for (const e of rowEmits) {
          if (e.ri < mt.start || e.ps === this.cur || !rest) continue;
          if (e.ps !== segPs) {
            if (segPs) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
            segPs = e.ps;
            segTop = e.y;
            segCut = e.cut ?? 0;
          }
          segBot = e.y + e.h;
        }
        if (segPs && rest) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
        const hereE = rowEmits.find((e) => e.ri >= mt.start && e.ps === this.cur);
        const here = hereE?.y ?? this.y;
        const hereCut = hereE ? hereE.cut ?? 0 : row.cut ?? 0;
        if (rest) grow = Math.max(grow, off - hereCut + rest.height + (mt.band ?? 0) - (this.y - here + row.height));
      }
      if (row0.mergeText && mergeMoved.size) row = dropMoved(row, mergeMoved);
      rowEmits.push({ ri, ps: this.cur, y: this.y, h: row.height + Math.max(0, grow), at: this.cur.body.length, cut: row.cut ?? 0 });
      this.emitRow(row);
      if (grow > 0.5) this.y += grow;
    });
    this.flowFills = false;
    const ins = [];
    for (const m of flowMerges) {
      const segs = [];
      for (const e of rowEmits) {
        if (e.ri < m.start || e.ri > m.end) continue;
        const last = segs[segs.length - 1];
        if (last && last.ps === e.ps) last.bottom = e.y + e.h;
        else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, at: e.at, cut: e.cut ?? 0 });
      }
      const colAt = (t.rows[m.start]?.mergeAt?.find((a) => a.col === m.col)?.at ?? 0) - (t.rows[m.start]?.mergeFills?.length ?? 0);
      let c = m.content;
      segs.forEach((sg, k) => {
        if (!c) return;
        let part = c, rest = null;
        if (k < segs.length - 1) {
          const sp2 = splitContent(c, sg.bottom - sg.top - (m.off - sg.cut));
          if (sp2) [part, rest] = sp2;
          else {
            part = { items: [], lines: [], height: 0 };
            rest = c;
          }
        }
        const free = Math.max(0, sg.bottom - sg.top - (m.off - sg.cut) - part.height);
        const dy = sg.top + m.off - sg.cut + (m.vAlign === "center" ? free / 2 : m.vAlign === "bottom" ? free : 0);
        ins.push({ ps: sg.ps, at: sg.at + (k === 0 ? colAt : 0), items: part.items.map((it) => shiftItem(it, dy)) });
        for (const l of part.lines) sg.ps.page.lines.push({ ...l, y: l.y + dy, baseline: l.baseline + dy });
        c = rest;
      });
    }
    t.rows.forEach((r0, start) => {
      for (const f of r0.mergeFills ?? []) {
        const short = t.rows.slice(start, f.end + 1).reduce((a, r) => a + r.height, 0) - f.item.h;
        const segs = [];
        for (const e of rowEmits) {
          if (e.ri < start || e.ri > f.end) continue;
          const last = segs[segs.length - 1];
          if (last && last.ps === e.ps) last.bottom = e.y + e.h;
          else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, at: e.at });
        }
        segs.forEach((sg, k) => {
          const h = sg.bottom - sg.top - (k === segs.length - 1 ? short : 0);
          if (h > 0) ins.push({ ps: sg.ps, at: sg.at, items: [{ ...f.item, y: sg.top, h }] });
        });
      }
    });
    for (const n of ins.sort((a, b) => b.at - a.at)) n.ps.body.splice(n.at, 0, ...n.items);
    this.prev = this.rowEndPrev();
  }
  /** Topo do flutuante com quebra abaixo de `y` que cruza [x, x+w] e vai até o pé do corpo
   *  (o conteúdo da tabela não passa dele nesta página); sem nenhum, o pé do corpo. */
  floatFloor(x, w, y) {
    const fls = this.cur.floats;
    let floor = this.cur.bodyBottom;
    for (const f of fls) {
      const top = f.y - f.distT;
      if (f.wrap === "none" || top <= y + 0.5 || f.y + f.h + f.distB < this.cur.bodyBottom - 0.5) continue;
      if (x + w > f.x - f.distL && x < f.x + f.w + f.distR) floor = Math.min(floor, top);
    }
    return floor;
  }
  /** Topo livre para uma faixa [x, x+w] × [y, y+h] que não contorna flutuantes (linha de tabela). */
  belowFloats(x, w, y, h) {
    const fls = this.cur.floats;
    for (let k = 0; k < 8; k++) {
      const hit = fls.find((f) => f.wrap !== "none" && y + h > f.y - f.distT + 0.5 && y < f.y + f.h + f.distB - 0.5 && x + w > f.x - f.distL && x < f.x + f.w + f.distR);
      if (!hit) break;
      y = hit.y + hit.h + hit.distB;
    }
    return y;
  }
  /** Topo mínimo de um flutuante com quebra relativo ao texto: corpo (modo 15) ou página (≤ 14). */
  floatMinY(ps) {
    return this.ctx.fmt.settings.compatibilityMode >= 15 ? ps.bodyTop : 0;
  }
  /** flutuantes com y já decidido (presos antes do parágrafo âncora) */
  pinnedFloats = /* @__PURE__ */ new Map();
  /**
   * Flutuante com quebra do parágrafo SEGUINTE à tabela, relativo a ele e com
   * deslocamento negativo que cai sobre a tabela (oráculo toptbl): o Word o posiciona
   * pela posição INICIAL do parágrafo (logo após a tabela), preso no topo da margem;
   * a tabela desce para baixo dele e o objeto fica onde foi posto, mesmo que o
   * parágrafo desça com a tabela.
   */
  pinFloatsOverTable(t, blockIdx) {
    const nb = this.full.blocks[blockIdx + 1];
    if (!nb || nb.type !== "paragraph") return;
    const runs = nb.paragraph.runs.filter((run2) => {
      const fl = run2.image?.floating || run2.shape?.floating || run2.group?.floating || run2.textbox?.floating;
      const anc = floatAnchor(run2);
      return !!fl && !!anc && WRAPPING.has(anc.wrap ?? "") && !anc.simplePos && (anc.posV.relativeFrom ?? "paragraph") === "paragraph" && anc.posV.align === void 0 && anc.posV.pct === void 0 && (anc.posV.offset ?? 0) < 0;
    });
    if (!runs.length) return;
    const H = t.rows.reduce((a, r) => a + r.height, 0);
    const top = this.y;
    const q = this.ctx.pure(() => prepareParagraph(this.ctx, nb.paragraph, {}));
    let before = q.beforeAuto ? 280 : q.spaceBefore;
    if (q.contextual && q.styleId === this.rowEndNeighbor().styleId) before = 0;
    const anchorTop0 = top + H + this.collapse(0, before);
    const fr = this.colFrame();
    const g = this.cur.geom;
    let newTop = top;
    for (const run2 of runs) {
      const anc = floatAnchor(run2);
      const w = run2.image?.widthTwips ?? run2.shape?.widthTwips ?? run2.group?.widthTwips ?? run2.textbox?.widthTwips ?? 0;
      const h = run2.image?.heightTwips ?? run2.shape?.heightTwips ?? run2.group?.heightTwips ?? run2.textbox?.heightTwips ?? 0;
      const y = Math.max(this.floatMinY(this.cur), anchorTop0 + (anc.posV.offset ?? 0));
      const hRef = horizRef(anc.posH.relativeFrom ?? "column", g, fr.x, fr.w);
      const x = alignPos(anc.posH.align, anc.posH.offset, hRef.x, hRef.w, w, anc.posH.pct, g.pageW, anc.effectExtent?.l, anc.effectExtent?.r);
      const wb = anc.wrap === "tight" || anc.wrap === "through" ? anc.wrapBox : void 0;
      const by0 = wb ? y + h * wb.y0 : y, by1 = wb ? y + h * wb.y1 : y + h;
      const bx0 = wb ? x + w * wb.x0 : x, bx1 = wb ? x + w * wb.x1 : x + w;
      const overV = by0 - (anc.distT ?? 0) < top + H && by1 + (anc.distB ?? 0) > top;
      const overH = bx0 - (anc.distL ?? 0) < t.x + t.width && bx1 + (anc.distR ?? 0) > t.x;
      if (!overV || !overH) continue;
      this.pinnedFloats.set(run2, { ps: this.cur, y });
      newTop = Math.max(newTop, by1 + (anc.distB ?? 0));
    }
    if (newTop > top) this.y = newTop;
  }
  /**
   * Tabela flutuante (oráculo ftable): âncoras página/margem/texto; tblpX/Y
   * ou tblpX/YSpec (left/center/right, top/center/bottom). No modo 15 a borda
   * externa fica na posição; nos antigos, o TEXTO da 1ª célula (como tblInd).
   * `t` foi diagramada com frameX = 0; os itens são deslocados para a posição.
   */
  placeFloatingTable(t, fp, ps, flowY, colX, colW, out, yOrigin, wrap, split = false) {
    const g = ps.geom;
    const legacy = this.ctx.fmt.settings.compatibilityMode < 15;
    const H = t.rows.reduce((a, r) => a + r.height, 0);
    const refW = legacy ? Math.max(0, t.width + t.x - (t.effR ?? 108)) : t.width;
    const [aL, aR] = fp.horzAnchor === "page" ? [0, g.pageW] : fp.horzAnchor === "margin" ? [g.marL, g.pageW - g.marR] : [colX, colX + colW];
    const xs = fp.tblpXSpec;
    const refX = xs === "center" ? aL + (aR - aL - refW) / 2 : xs === "right" || xs === "outside" ? aR - refW : aL + (xs ? 0 : fp.tblpX ?? 0);
    const [aT, aB] = fp.vertAnchor === "page" ? [0, g.pageH] : fp.vertAnchor === "margin" ? [g.marT, g.pageH - g.marB] : [flowY, flowY];
    const ys = fp.tblpYSpec;
    let top = ys === "center" ? aT + (aB - aT - H) / 2 : ys === "bottom" ? aB - H : aT + (ys ? 0 : fp.tblpY ?? 0);
    if (this.inHf && top + H > g.pageH) {
      top = Math.max(0, g.pageH - H);
      wrap = false;
    }
    this.emitFloatRows(t, t.rows, fp, ps, refX, top, out, yOrigin, wrap, split);
  }
  /** Linhas de uma tabela flutuante a partir de `top`. Com `split`, as que não
   *  cabem na página seguem para o topo da próxima (o texto as contorna lá). */
  emitFloatRows(t, rows, fp, ps, refX, top, out, yOrigin, wrap, split) {
    const legacy = this.ctx.fmt.settings.compatibilityMode < 15;
    let y = top;
    let n = 0;
    rows = [...rows];
    let fl = split ? this.floatFlow.get(t) : void 0;
    if (split && !fl && t.rows.some((r) => r.mergeText?.length)) {
      fl = { idx: new Map(t.rows.map((r, k) => [r, k])), moved: /* @__PURE__ */ new Set(), seen: /* @__PURE__ */ new Set(), emits: [], merges: [] };
      this.floatFlow.set(t, fl);
    }
    const vmMoved = fl?.moved ?? /* @__PURE__ */ new Set();
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      const ri = fl?.idx.get(row);
      if (split && n === 0 && i === 0 && row !== t.rows[0] && row.topCut && y + row.height - row.topCut <= ps.bodyBottom + 0.5) {
        row = atPageTop(row);
        rows[i] = row;
      }
      const bw = i < rows.length - 1 ? row.breakW ?? 0 : 0;
      let cutHere = false;
      if (split && !this.noBreakWrapped() && y + row.height + bw > ps.bodyBottom + 0.05) {
        const avail = ps.bodyBottom - y;
        const onlyMin = (row.natural ?? row.height) + bw <= avail + 0.05;
        const parts = onlyMin || row.cantSplit ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          rows.splice(i, 1, parts[0], parts[1]);
          cutHere = true;
          if (fl && ri !== void 0) {
            fl.idx.set(parts[0], ri);
            fl.idx.set(parts[1], ri);
          }
          row = parts[0];
        } else if (n > 0) break;
      }
      const rk = t.rows.indexOf(row);
      if (rk >= 0) row = dropMoved(mergeTextFirst(t.rows, rk, row, vmMoved, (h) => !split || y + h <= ps.bodyBottom + 0.5), vmMoved);
      else if (vmMoved.size) row = dropMoved(row, vmMoved);
      let grow = 0;
      if (fl && ri !== void 0) {
        for (const mt of t.rows[ri].mergeText ?? []) {
          if (fl.seen.has(mt)) continue;
          const s = fl.emits.find((e) => e.ri === mt.start);
          if (!s || s.ps === ps || !mt.content) continue;
          fl.seen.add(mt);
          for (const o of [...mt.items, ...mt.lines]) fl.moved.add(o);
          const off = (mt.band ?? 0) + (mt.marT ?? 0);
          fl.merges.push({ start: mt.start, end: ri, col: mt.col, content: mt.content, off, ...mt.vAlign ? { vAlign: mt.vAlign } : {} });
          let rest = mt.content, segPs = null, segTop = 0, segBot = 0, segCut = 0;
          for (const e of fl.emits) {
            if (e.ri < mt.start || e.ps === ps || !rest) continue;
            if (e.ps !== segPs) {
              if (segPs) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
              segPs = e.ps;
              segTop = e.y;
              segCut = e.cut ?? 0;
            }
            segBot = e.y + e.h;
          }
          if (segPs && rest) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
          const hereE = fl.emits.find((e) => e.ri >= mt.start && e.ps === ps);
          const here = hereE?.y ?? y;
          const hereCut = hereE ? hereE.cut ?? 0 : row.cut ?? 0;
          if (rest) grow = Math.max(grow, off - hereCut + rest.height + (mt.band ?? 0) - (y - here + row.height));
        }
        if (fl.moved.size) row = dropMoved(row, fl.moved);
        fl.emits.push({ ri, ps, y, h: row.height + Math.max(0, grow), out, at: out.length, yOrigin, refX, cut: row.cut ?? 0 });
      }
      for (const it of row.items) out.push(shiftItem(it, y - yOrigin, refX));
      for (const it of row.borderItems) out.push(shiftItem(it, y - yOrigin, refX));
      for (const l of row.lines) ps.page.lines.push({ ...l, x: l.x + refX, y: l.y + y, baseline: l.baseline + y, ...l.chars ? { chars: l.chars.map((c) => ({ ...c, x: c.x + refX })) } : {} });
      if (row.cells && !this.inHf) for (const c of row.cells) (ps.page.cells ??= []).push({ ref: c.ref, x: c.x + refX, y: y + (c.dy ?? 0), w: c.w, h: c.h ?? row.height, span: c.span });
      y += row.height + (grow > 0.5 ? grow : 0);
      n++;
      if (cutHere) break;
    }
    if (wrap) {
      ps.floats.push({
        // caixa = bordas externas (modo antigo: a grade fica na margem da célula antes do texto)
        x: refX + (legacy ? t.x - (t.borderLeft ?? 0) / 2 : 0),
        y: top,
        w: t.width + (legacy ? t.borderLeft ?? 0 : 0),
        h: y - top,
        wrap: "square",
        distL: fp.leftFromText ?? 0,
        distR: fp.rightFromText ?? 0,
        distT: fp.topFromText ?? 0,
        distB: fp.bottomFromText ?? 0
      });
    }
    if (n < rows.length) this.floatCarry.push({ t, rows: rows.slice(n), fp, refX });
    else if (fl) {
      this.floatFlow.delete(t);
      this.flowFloatMerges(t, fl);
    }
  }
  /** Texto das mesclas verticais de uma tabela flutuante que partiu: cada parte no topo
   *  da mescla na sua página (1ª parte na posição da coluna entre as células) */
  flowFloatMerges(t, fl) {
    const ins = [];
    for (const m of fl.merges) {
      const segs = [];
      for (const e of fl.emits) {
        if (e.ri < m.start || e.ri > m.end) continue;
        const last = segs[segs.length - 1];
        if (last && last.ps === e.ps) last.bottom = e.y + e.h;
        else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, out: e.out, at: e.at, yOrigin: e.yOrigin, refX: e.refX, cut: e.cut ?? 0 });
      }
      const colAt = t.rows[m.start]?.mergeAt?.find((a) => a.col === m.col)?.at ?? 0;
      let c = m.content;
      segs.forEach((sg, k) => {
        if (!c) return;
        let part = c, rest = null;
        if (k < segs.length - 1) {
          const sp2 = splitContent(c, sg.bottom - sg.top - (m.off - sg.cut));
          if (sp2) [part, rest] = sp2;
          else {
            part = { items: [], lines: [], height: 0 };
            rest = c;
          }
        }
        const free = Math.max(0, sg.bottom - sg.top - (m.off - sg.cut) - part.height);
        const dy = sg.top + m.off - sg.cut + (m.vAlign === "center" ? free / 2 : m.vAlign === "bottom" ? free : 0);
        ins.push({ out: sg.out, at: sg.at + (k === 0 ? colAt : 0), items: part.items.map((it) => shiftItem(it, dy - sg.yOrigin, sg.refX)) });
        for (const l of part.lines) sg.ps.page.lines.push({ ...l, x: l.x + sg.refX, y: l.y + dy, baseline: l.baseline + dy, ...l.chars ? { chars: l.chars.map((ch) => ({ ...ch, x: ch.x + sg.refX })) } : {} });
        c = rest;
      });
    }
    for (const n of ins.sort((a, b) => b.at - a.at)) n.out.splice(n.at, 0, ...n.items);
  }
  /** w:doNotBreakWrappedTables: tabelas flutuantes não partem (o modo 15 ignora — oráculo ftnobreak) */
  noBreakWrapped() {
    return this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat["doNotBreakWrappedTables"];
  }
  /** Continuação de tabelas flutuantes divididas: topo do corpo da página nova. */
  placeFloatCarry() {
    const carry = this.floatCarry;
    this.floatCarry = [];
    for (const c of carry) {
      const items = [];
      const hdr = [];
      for (const r of c.t.rows) {
        if (r.header) hdr.push(r);
        else break;
      }
      const rows = hdr.length && hdr.length < c.t.rows.length && !hdr.includes(c.rows[0]) ? [...hdr, ...c.rows] : c.rows;
      this.emitFloatRows(c.t, rows, c.fp, this.cur, c.refX, this.cur.bodyTop, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
    }
  }
  /** A linha pode começar no espaço dado (inteira, ou dividida se puder)? */
  rowCanStart(row, avail) {
    if (row.height <= avail + 0.5) return true;
    if (row.cantSplit || (row.natural ?? row.height) <= avail + 0.5) return false;
    const parts = row.split?.(avail) ?? null;
    return !!parts && parts[0].height > 0;
  }
  emitRow(row) {
    const ids = this.rowNoteIds(row);
    if (ids.length) this.reserveNotes(ids, this.rowNoteCut);
    this.rowNoteCut = null;
    this.lastRowEmit = { row, y: this.y };
    const skip = this.flowFills && row.mergeFills ? new Set(row.mergeFills.map((f) => f.item)) : null;
    for (const it of row.items) if (!skip?.has(it)) this.cur.body.push(shiftItem(it, this.y));
    for (const it of row.borderItems) this.cur.body.push(shiftItem(it, this.y));
    for (const l of row.lines) this.cur.page.lines.push({ ...l, y: l.y + this.y, baseline: l.baseline + this.y });
    if (row.cells && !this.inHf) for (const c of row.cells) (this.cur.page.cells ??= []).push({ ref: c.ref, x: c.x, y: this.y + (c.dy ?? 0), w: c.w, h: c.h ?? row.height, span: c.span });
    this.y += row.height;
    this.atTop = false;
    this.noteColContent(this.y);
  }
  // ───────────────────────── objetos flutuantes ─────────────────────────
  /** Quadro de uma linha descontando floats com contorno (wrap) que a cruzam. */
  wrapFrame(frame, frameX, y, lineH = 240, ps = this.cur) {
    const floats = ps.floats;
    if (!floats.length) return frame;
    const { left, right } = frame;
    const crossed = right < left;
    let tl = left, tr = right;
    if (crossed) {
      const col = this.colFrame();
      if (Math.abs(frameX - col.x) < 0.5) {
        tl = Math.min(left, 0);
        tr = Math.max(left, col.w);
      } else tr = left;
    }
    let skipTo;
    let free = [[tl, tr]];
    let hit = false;
    let minBottom = Infinity;
    for (const f of floats) {
      if (f.wrap !== "square" && f.wrap !== "tight" && f.wrap !== "through" && f.wrap !== "topAndBottom") continue;
      if (f.bodyOnly && this.inHf) continue;
      const top = f.y - f.distT, bottom = f.y + f.h + f.distB;
      if (y + lineH <= top + 0.5 || y >= bottom - 0.5) continue;
      let parts;
      if (f.poly) {
        const band = polyBandIntervals(f.poly, y, y + lineH);
        if (!band.length) continue;
        const hull = [[band[0][0], band[band.length - 1][1]]];
        parts = (f.wrap === "through" ? band : hull).map(([a, b]) => [a - f.distL - frameX, b + f.distR - frameX]);
      }
      const fl = parts ? parts[0][0] : f.x - f.distL - frameX, fr = parts ? parts[parts.length - 1][1] : f.x + f.w + f.distR - frameX;
      if (fr <= tl || fl >= tr) continue;
      if (f.wrap === "topAndBottom") {
        skipTo = Math.max(skipTo ?? 0, bottom);
        continue;
      }
      hit = true;
      minBottom = Math.min(minBottom, bottom);
      const side = f.side ?? "bothSides";
      let blocks = parts && side === "bothSides" ? parts : [[fl, fr]];
      if (side === "left") blocks = [[fl, Infinity]];
      else if (side === "right") blocks = [[-Infinity, fr]];
      else if (side === "largest") blocks = [fl - tl >= tr - fr ? [fl, Infinity] : [-Infinity, fr]];
      for (const [bl, bh] of blocks) {
        const next = [];
        for (const [a, b] of free) {
          if (bh <= a || bl >= b) {
            next.push([a, b]);
            continue;
          }
          if (bl > a) next.push([a, bl]);
          if (bh < b) next.push([bh, b]);
        }
        free = next;
      }
    }
    if (hit) {
      const col = this.colFrame();
      const cR = Math.abs(frameX - col.x) < 0.5 ? col.w : Infinity, cL = cR === Infinity ? -Infinity : 0;
      const ext = (a, b) => cR === Infinity ? [a, b] : [a <= tl + 0.5 ? Math.min(a, cL) : a, b >= tr - 0.5 ? Math.max(b, cR) : b];
      free = free.filter(([a, b]) => {
        const [ea, eb] = ext(a, b);
        return Math.min(eb, cR) - Math.max(ea, cL) >= MIN_GAP;
      });
      let best;
      for (const iv of free) if (!best || iv[1] - iv[0] > best[1] - best[0]) best = iv;
      if (!best) skipTo = Math.max(skipTo ?? 0, minBottom);
      else if (skipTo === void 0) return crossed ? { left, right } : { left: best[0], right: best[1], gap: true, ...free.length > 1 ? { segs: free } : {} };
    }
    if (skipTo !== void 0) return { ...frame, skipTo };
    return { left, right };
  }
  /**
   * Vão onde começa a linha: com o objeto no meio dela, o 1º vão (da esquerda)
   * em que a próxima palavra cabe — vão estreito demais fica vazio (oráculo
   * wrapsides). Nenhum cabe: o mais largo, sozinho (k = fim).
   */
  pickSeg(br, frame) {
    if (!frame.segs) return { k: -1, f: frame };
    const need = br.peekWordWidth();
    for (let k = 0; k < frame.segs.length; k++) {
      const [a, b] = frame.segs[k];
      const nx = frame.segs[k + 1];
      if (b - a + 0.01 >= need) return { k, f: { left: a, right: b, gap: true, ...nx ? { next: { left: nx[0], right: nx[1] } } : {} } };
    }
    return { k: frame.segs.length, f: { left: frame.left, right: frame.right, gap: true } };
  }
  /** linhas dos vãos seguintes da mesma linha (depois do vão `k`) */
  moreSegs(br, frame, k, last, put) {
    if (!frame.segs) return last;
    for (let j = k + 1 + (last.spanned ? 1 : 0); j < frame.segs.length && !br.done() && !last.breakAfter && !last.clear && last.gapTab !== "break"; j++) {
      const [a, b] = frame.segs[j];
      if (b - a + 0.01 < br.peekWordWidth()) continue;
      const nx = frame.segs[j + 1];
      last = br.next({ left: a, right: b, gap: true, ...nx ? { next: { left: nx[0], right: nx[1] } } : {} });
      put(last);
      if (last.spanned) j++;
    }
    return last;
  }
  /** Ambiente do texto da caixa: fundo escuro (cor automática branca) e a cor do
   *  wps:style/a:fontRef para o texto sem cor (medido: estilo de forma "preenchido"). */
  tbEnv(tb) {
    const theme = this.ctx.fmt.theme;
    const fc = tb.fontColor ? resolveDrawingColor(tb.fontColor, theme) : void 0;
    const s = tb.shape;
    const solid = s && !s.gradient && !s.pattern && !s.blip && !s.fillRef ? s.fill : void 0;
    return { darkBackground: isDark(resolveDrawingColor(solid, theme)), ...fc ? { defaultColor: fc } : {} };
  }
  /** cadeias de caixas vinculadas (montadas na 1ª caixa que precisa) */
  chains = null;
  /** conteúdo de cada caixa de uma cadeia (diagramado uma vez por passada) */
  chainSlices = /* @__PURE__ */ new Map();
  chainOf(tb) {
    if (tb.story === void 0 && !tb.link) return void 0;
    this.chains ??= indexChains(this.full);
    return this.chains.get(tb);
  }
  /**
   * Pedaço do conteúdo da cadeia que cabe na caixa `tb`: o conteúdo da 1ª caixa é
   * diagramado na largura de cada caixa, em ordem; o corte (o mesmo da linha de tabela
   * partida: viúvas/órfãs, espaço depois) manda o resto para a seguinte, que quebra de
   * novo na largura dela — o parágrafo partido continua sem recuo da 1ª linha e sem
   * espaço antes. A última fica com tudo o que sobra (transborda). Oráculo txbxlink.
   */
  chainSlice(chain, tb, env0) {
    let slices = this.chainSlices.get(chain);
    if (!slices) {
      const out = /* @__PURE__ */ new Map();
      slices = out;
      this.chainSlices.set(chain, out);
      const theme = this.ctx.fmt.theme;
      const head = chain.members[0];
      let rem = head.blocks ?? head.paras.map((paragraph) => ({ type: "paragraph", paragraph }));
      let map = rem.map((_, i) => i);
      let cont = 0, rows = 0;
      const empty = () => ({ items: [], lines: [], height: 0 });
      chain.members.forEach((m, k) => {
        if (!rem.length) {
          out.set(m, empty());
          return;
        }
        const fr = tbFrame(m, theme, m.widthTwips, m.heightTwips);
        const env = { ...env0, ...this.tbEnv(m) };
        const blocks = rem, curMap = map, curCont = cont, curRows = rows;
        const c = this.ctx.pure(() => this.layoutStatic(blocks, 0, Math.max(1, fr.iw), env, "txbx"));
        const ci = curCont ? c.paras?.get("txbx/b0") : void 0;
        if (ci) c.paras.set("txbx/b0", { ...ci, lines: ci.lines + 1 });
        let slice = c;
        rem = [];
        if (k < chain.members.length - 1) {
          let parts = splitContent(c, fr.ih);
          if (!parts) {
            out.set(m, empty());
            rem = blocks;
            return;
          }
          let cut = parts[0].height;
          let moved = c.lines.filter((l) => l.y >= cut - 0.01);
          let first = moved.length ? moved.reduce((a, b) => b.y < a.y ? b : a) : void 0;
          let row = first ? topRowOf(first.ref) : -1;
          if (first && row >= 0) {
            const jt = topBlockOf(first.ref), r0 = row;
            const nr = c.nest?.find((n) => n.lines.some((l) => topBlockOf(l.ref) === jt && topRowOf(l.ref) === r0));
            if (nr && nr.top < cut - 0.01) {
              const p2 = nr.top > 0.5 ? splitContent(c, nr.top) : null;
              if (!p2) {
                out.set(m, empty());
                rem = blocks;
                return;
              }
              parts = p2;
              cut = p2[0].height;
              moved = c.lines.filter((l) => l.y >= cut - 0.01);
              first = moved.reduce((a, b) => b.y < a.y ? b : a);
              row = topRowOf(first.ref);
            }
          }
          if (first) {
            slice = { ...parts[0], height: cut };
            const j = Math.max(0, topBlockOf(first.ref));
            const off = /^[^/]+\/b\d+$/.test(first.ref) ? first.start : 0;
            map = curMap.slice(j);
            const pb = blocks[j];
            cont = 0;
            rows = 0;
            if (off > 0 && pb?.type === "paragraph") {
              cont = (j === 0 ? curCont : 0) + off;
              rem = [{ type: "paragraph", paragraph: sliceParagraphFrom(pb.paragraph, off) }, ...blocks.slice(j + 1)];
            } else if (row > 0 && pb?.type === "table") {
              rows = (j === 0 ? curRows : 0) + row;
              rem = [{ ...pb, rows: pb.rows.slice(row) }, ...blocks.slice(j + 1)];
            } else {
              rem = blocks.slice(j);
            }
          }
        }
        out.set(m, { ...slice, lines: remapLines(slice.lines, curMap, curCont, curRows) });
      });
    }
    return slices.get(tb) ?? { items: [], lines: [], height: 0 };
  }
  placeFloats(p, ps, colX, colW, paraTop, flowItems, yOrigin, paraRef) {
    for (const g of p.glyphs) {
      const run2 = g.obj;
      if (!run2) continue;
      const fl = run2.image?.floating || run2.shape?.floating || run2.group?.floating || run2.textbox?.floating;
      if (!fl || this.prePlaced.has(run2)) continue;
      if (this.onlyTextFloats && !followsText(floatAnchor(run2))) continue;
      this.placeFloat(run2, ps, colX, colW, paraTop, flowItems, yOrigin, void 0, paraRef);
    }
  }
  placeFloat(run2, ps, colX, colW, paraTop, flowItems, yOrigin, clampBottom, paraRef) {
    const g = ps.geom;
    if (run2.image?.floating && run2.image.format?.docPr.hidden || run2.textbox?.hidden || run2.shape?.hidden || run2.group?.hidden) {
      return { ps, target: [], zobj: { z: 0, seq: this.zSeq++, items: [] }, obj: { run: run2, x: 0, y: 0, w: 0, h: 0, layer: "front", hf: this.inHf } };
    }
    const anchor = run2.image?.anchor ?? run2.shape?.anchor ?? run2.group?.anchor ?? run2.textbox?.anchor;
    let w = run2.image?.widthTwips ?? run2.shape?.widthTwips ?? run2.group?.widthTwips ?? run2.textbox?.widthTwips ?? 0;
    let h = run2.image?.heightTwips ?? run2.shape?.heightTwips ?? run2.group?.heightTwips ?? run2.textbox?.heightTwips ?? 0;
    const wrapsText = !!anchor && anchor.wrap !== "none";
    const behind = !(wrapsText && this.ctx.fmt.settings.compatibilityMode >= 15) && (!!anchor?.behindDoc || !!run2.image?.behindDoc || !!run2.textbox?.behindDoc);
    let tbContent = null;
    let tbFinal = null;
    const chain = run2.textbox ? this.chainOf(run2.textbox) : void 0;
    if (run2.textbox && chain) {
      tbContent = this.chainSlice(chain, run2.textbox, { field: this.fieldValue(ps), ...this.inHf ? { hf: true } : {} });
    } else if (run2.textbox) {
      const tb = run2.textbox;
      const fr = tbFrame(tb, this.ctx.fmt.theme, w, h);
      const ins = fr.ins;
      const blocks = tb.blocks ?? tb.paras.map((paragraph) => ({ type: "paragraph", paragraph }));
      const env = { field: this.fieldValue(ps), ...this.tbEnv(tb), ...this.inHf ? { hf: true } : {} };
      let inner = fr.iw;
      const fi = FRAME_INFO.get(tb);
      if (fi?.autoWidth) {
        const probe = this.ctx.pure(() => this.layoutStatic(blocks, 0, colW, env, "txbx"));
        w = inner = Math.max(1, probe.lines.reduce((m, l) => {
          const side = Math.min(l.x, colW - l.x - l.width);
          return Math.max(m, l.width + (side < 2880 ? side : 0));
        }, 0));
      }
      if (tb.noWrap) {
        const probe = this.ctx.pure(() => this.layoutStatic(blocks, 0, 31680, env, "txbx"));
        const natural = probe.lines.reduce((m, l) => {
          const side = Math.min(l.x, 31680 - l.x - l.width);
          return Math.max(m, l.width + (side < 2880 ? side : 0));
        }, 0);
        if (tb.autoFit) {
          w = natural + ins.l + ins.r;
          inner = natural;
        } else inner = Math.max(inner, natural);
      }
      const iw = Math.max(1, inner);
      tbContent = this.ctx.pure(() => this.layoutStatic(blocks, 0, iw, env, "txbx"));
      if (!fr.rot) {
        tbFinal = (bx, by) => {
          const prevDx = this.staticDx;
          this.staticDx = bx + ins.l;
          try {
            return this.layoutStatic(blocks, 0, iw, env, "txbx", ps, by + ins.t);
          } finally {
            this.staticDx = prevDx;
          }
        };
      }
      if (tb.autoFit && fr.rot) w = verticalHeight(tbContent) + ins.t + ins.b;
      else if (tb.autoFit) h = tbContent.height + ins.t + ins.b;
      if (fi) h = fi.hRule === "exact" ? fi.h : fi.hRule === "atLeast" ? Math.max(fi.h, tbContent.height) : tbContent.height;
    }
    let x, y;
    if (anchor?.simplePos) {
      x = anchor.simplePos.x;
      y = anchor.simplePos.y;
    } else {
      const hRef = horizRef(anchor?.posH.relativeFrom ?? "column", g, colX, colW);
      x = alignPos(anchor?.posH.align, anchor?.posH.offset, hRef.x, hRef.w, w, anchor?.posH.pct, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      const pin2 = this.pinnedFloats.get(run2);
      if (pin2 && pin2.ps === ps) y = pin2.y;
      else {
        const vFrom0 = anchor?.posV.relativeFrom ?? "paragraph";
        const vRef = vertRef(vFrom0, g, ps, vFrom0 === "paragraph" && paraRef !== void 0 ? paraRef : paraTop);
        y = alignPos(anchor?.posV.align, anchor?.posV.offset, vRef.y, vRef.h, h, anchor?.posV.pct, g.pageH, anchor?.effectExtent?.t, anchor?.effectExtent?.b);
        if (clampBottom !== void 0 && y + h > clampBottom) y = clampBottom - h;
        if (!this.inHf && anchor && WRAPPING.has(anchor.wrap) && followsText(anchor)) y = Math.max(y, this.floatMinY(ps));
        else if (this.inHf && this.ctx.fmt.settings.compatibilityMode < 15 && anchor && WRAPPING.has(anchor.wrap) && followsText(anchor)) {
          y = Math.max(y, 0);
          x = Math.max(x, 0);
        }
      }
    }
    if (this.inCell && !anchor?.simplePos) {
      const vFrom = anchor?.posV.relativeFrom ?? "paragraph";
      const cm = this.cellMar ?? { l: 0, r: 0 };
      const hFrom = anchor?.posH.relativeFrom ?? "column";
      const [hx, hw] = hFrom === "rightMargin" || hFrom === "outsideMargin" ? [colX + colW, cm.r] : hFrom === "leftMargin" || hFrom === "insideMargin" ? [colX - cm.l, cm.l] : [colX, colW];
      const outCell = anchor?.layoutInCell === false && this.ctx.fmt.settings.compatibilityMode < 15;
      if (outCell) {
        const fr = this.colFrame(), hr = horizRef(hFrom, g, fr.x, fr.w);
        x = alignPos(anchor?.posH.align, anchor?.posH.offset, hr.x, hr.w, w, anchor?.posH.pct, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      } else x = alignPos(anchor?.posH.align, anchor?.posH.offset, hx, hw, w, void 0, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      const vRef = outCell && (vFrom === "paragraph" || vFrom === "line") ? yOrigin - (cm.t ?? 0) : vFrom === "paragraph" ? paraRef ?? paraTop : vFrom === "line" ? paraTop : yOrigin;
      y = alignPos(anchor?.posV.align, anchor?.posV.offset, vRef, 0, h, void 0, g.pageH, anchor?.effectExtent?.t, anchor?.effectExtent?.b);
      if (anchor && WRAPPING.has(anchor.wrap) && (vFrom === "paragraph" || vFrom === "line")) y = Math.max(y, yOrigin);
      if (tbFinal) tbContent = this.ctx.pure(() => tbFinal(x, y));
      const cellItems = this.paintObject(run2, x, y, w, h, tbContent, ps);
      if (behind) flowItems.unshift(...cellItems);
      else flowItems.push(...cellItems);
      const wb = anchor && (anchor.wrap === "tight" || anchor.wrap === "through") ? anchor.wrapBox : void 0;
      const cbox = anchor && WRAPPING.has(anchor.wrap) && anchor.layoutInCell !== false ? { x: wb ? x + w * wb.x0 : x, y: wb ? y + h * wb.y0 : y, w: wb ? w * (wb.x1 - wb.x0) : w, h: wb ? h * (wb.y1 - wb.y0) : h, wrap: anchor.wrap, side: anchor.wrapText ?? "bothSides", distL: anchor.distL ?? 0, distR: anchor.distR ?? 0, distT: anchor.distT ?? 0, distB: anchor.distB ?? 0 } : void 0;
      return { ps, target: [], zobj: { z: 0, seq: this.zSeq++, items: cellItems }, obj: { run: run2, x, y, w, h, layer: behind ? "behind" : "front", hf: this.inHf }, ...cbox ? { box: cbox } : {} };
    }
    const target = this.inHf ? behind ? ps.hfBehind : ps.hfFront : behind ? ps.behind : ps.front;
    if (tbFinal) tbContent = tbFinal(x, y);
    const items = this.paintObject(run2, x, y, w, h, tbContent, ps);
    const obj = {
      run: run2,
      x,
      y,
      w,
      h,
      layer: behind ? "behind" : "front",
      hf: this.inHf,
      frame: { colX, colW, paraTop: paraRef ?? paraTop, pageW: g.pageW, pageH: g.pageH, marL: g.marL, marR: g.marR, marT: g.marT, marB: g.marB, bodyTop: Math.max(g.marT, ps.bodyTop ?? g.marT) }
    };
    if (run2.textbox && tbContent) obj.content = tbContentPlacement(run2.textbox, this.ctx.fmt.theme, x, y, w, h, tbContent);
    (ps.page.objects ??= []).push(obj);
    const frameFlow = this.inHf && !!run2.textbox && FRAME_INFO.has(run2.textbox);
    let inFlow;
    if (frameFlow) {
      const rel = yOrigin ? items.map((it) => shiftItem(it, -yOrigin)) : items;
      if (x > colX + 20) this.hfFrameAfter.push(...rel);
      else flowItems.push(...rel);
      inFlow = { arr: flowItems, items: rel };
    }
    const zobj = { z: anchor?.relativeHeight ?? 0, seq: this.zSeq++, items: frameFlow ? [] : items };
    if (!frameFlow) target.push(zobj);
    let box;
    const hfLegacy = this.inHf && this.ctx.fmt.settings.compatibilityMode < 15;
    if (anchor && WRAPPING.has(anchor.wrap)) {
      const wb = anchor.wrap === "tight" || anchor.wrap === "through" ? anchor.wrapBox : void 0;
      const bx = wb ? x + w * wb.x0 : x, by = wb ? y + h * wb.y0 : y;
      const bw = wb ? w * (wb.x1 - wb.x0) : w, bh = wb ? h * (wb.y1 - wb.y0) : h;
      const fb = { x: bx, y: by, w: bw, h: bh, wrap: anchor.wrap, side: anchor.wrapText ?? "bothSides", distL: anchor.distL ?? 0, distR: anchor.distR ?? 0, distT: anchor.distT ?? 0, distB: anchor.distB ?? 0 };
      if (anchor.wrapPoly && wb) fb.poly = anchor.wrapPoly.map(([u, v]) => [x + w * u, y + h * v]);
      if (hfLegacy) fb.bodyOnly = true;
      box = fb;
    }
    if (box) {
      ps.floats.push(box);
      if (!this.inHf && !followsText(anchor) && !this.prePlaced.has(run2)) {
        const pi = this.pages.indexOf(ps);
        const b = box;
        const hit = pi >= 0 && ps.page.lines.some((l) => !/^(hdr|ftr|txbx)/.test(l.ref) && l.y + l.height > b.y - b.distT && l.y < b.y + b.h + b.distB && b.x + b.w + b.distR > ps.geom.marL && b.x - b.distL < ps.geom.pageW - ps.geom.marR);
        if (hit) (this.lateFound.get(pi) ?? this.lateFound.set(pi, []).get(pi)).push(run2);
      }
    }
    return { ps, target, zobj, obj, ...box ? { box } : {}, ...inFlow ? { inFlow } : {} };
  }
  /** Desfaz um flutuante colocado (parágrafo que mudou de página). */
  unplaceFloat(r) {
    const rm = (arr, v) => {
      const i = arr ? arr.indexOf(v) : -1;
      if (i >= 0) arr.splice(i, 1);
    };
    rm(r.target, r.zobj);
    if (r.inFlow) for (const it of r.inFlow.items) rm(r.inFlow.arr, it);
    rm(r.ps.page.objects, r.obj);
    if (r.box) rm(r.ps.floats, r.box);
    if (r.flow) this.ctx.restoreFlow(r.flow);
  }
  /**
   * Flutuantes do parágrafo do corpo posicionados ANTES das linhas, para que o
   * próprio texto do parágrafo os contorne (como no cabeçalho). Só os
   * de quebra que afeta o texto; os demais seguem depois das linhas.
   */
  placeFloatsEarly(p, ps, colX, colW, paraTop, clampBottom, paraRef) {
    const out = [];
    let flow;
    for (const g of p.glyphs) {
      const run2 = g.obj;
      if (!run2) continue;
      const fl = run2.image?.floating || run2.shape?.floating || run2.group?.floating || run2.textbox?.floating;
      const anc = run2.image?.anchor ?? run2.shape?.anchor ?? run2.group?.anchor ?? run2.textbox?.anchor;
      if (!fl || !anc || !WRAPPING.has(anc.wrap ?? "") || this.prePlaced.has(run2)) continue;
      flow ??= this.ctx.saveFlow();
      out.push({ ...this.placeFloat(run2, ps, colX, colW, paraTop, ps.body, 0, clampBottom !== void 0 && followsText(anc) ? clampBottom : void 0, paraRef), flow });
    }
    return out;
  }
  /** Desenha imagem/forma/caixa/grupo no retângulo dado. */
  /** Grupo de desenho e caixa de texto EM LINHA (wp:inline): desenhados como os
   *  flutuantes, na caixa do glifo — o paintLine só desenha imagem e forma (corpus t15) */
  paintInlineDrawings(out, line, frameX, top, ps) {
    for (const pg of line.placed) {
      const r = pg.g.obj;
      if (pg.g.kind !== "obj" || !r || pg.g.adv <= 0 || !r.group && !r.textbox || r.image || r.shape) continue;
      const w = r.group?.widthTwips ?? r.textbox?.widthTwips ?? 0, h = r.group?.heightTwips ?? r.textbox?.heightTwips ?? 0;
      const x = frameX + pg.x, y = top + line.baseline - pg.g.style.shift - h;
      let tc = null;
      if (r.textbox) {
        const blocks = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: "paragraph", paragraph }));
        const chain = this.chainOf(r.textbox);
        tc = chain ? this.chainSlice(chain, r.textbox, {}) : this.layoutStatic(blocks, 0, Math.max(1, tbFrame(r.textbox, this.ctx.fmt.theme, w, h).iw), { ...this.tbEnv(r.textbox) }, "itb", ps);
      }
      const drawn = this.paintObject(r, x, y, w, h, tc, ps ?? this.cur);
      if (out === this.cur.body) this.cur.front.push({ z: 0, seq: this.zSeq++, items: drawn });
      else out.push(...drawn);
    }
  }
  paintObject(run2, x, y, w, h, tbContent, ps = this.cur, inGroup = false) {
    const out = [];
    const theme = this.ctx.fmt.theme;
    if (run2.image && isEmf(run2.image.data)) {
      out.push({ t: "clip", op: "push", x, y, w, h, src: run2.image }, ...renderEmf(this.ctx, run2.image.data, { x, y, w, h }), { t: "clip", op: "pop" });
    } else if (run2.image && isWmf(run2.image.data)) {
      out.push({ t: "clip", op: "push", x, y, w, h, src: run2.image }, ...renderWmf(this.ctx, run2.image.data, { x, y, w, h }), { t: "clip", op: "pop" });
    } else if (run2.image) {
      const im = run2.image;
      out.push({
        t: "image",
        x,
        y,
        w,
        h,
        image: im,
        ...im.crop ? { crop: im.crop } : {},
        ...im.style?.rot ? { rot: im.style.rot } : {},
        ...im.style?.flipH ? { flipH: true } : {},
        ...im.style?.flipV ? { flipV: true } : {},
        ...(() => {
          const pic = pictureLook(im, theme);
          return pic ? { pic } : {};
        })()
      });
    } else if (run2.shape) {
      const s = run2.shape.style;
      const fill = resolveDrawingColor(withThemeStyles(s, theme).fill, theme);
      const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
      const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? "000000", widthPt: lw, ...s.line.dash ? { dash: s.line.dash } : {} } : void 0;
      out.push({ t: "shape", x, y, w, h, style: s, ...fill ? { fill } : {}, ...stroke ? { stroke } : {}, ...run2.shape.line ? { line: run2.shape.line } : {}, ...shapeExtras(s, theme) });
    } else if (run2.textbox) {
      const tb = run2.textbox;
      const s = tb.shape;
      if (s && (s.fill || s.line || s.gradient || s.pattern || s.blip)) {
        const fill = resolveDrawingColor(withThemeStyles(s, theme).fill, theme);
        const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
        const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? "000000", widthPt: lw, ...s.line.dash ? { dash: s.line.dash } : {} } : void 0;
        out.push({ t: "shape", x, y, w, h, style: s, ...fill ? { fill } : {}, ...stroke ? { stroke } : {}, ...shapeExtras(s, theme) });
      }
      if (tbContent) {
        const fr = tbFrame(tb, this.ctx.fmt.theme, w, h);
        const ins = fr.ins;
        const rot = tb.rot ?? s?.rot ?? 0;
        let art = null;
        if (tb.wordArt && tbContent.lines.length) {
          const x0 = Math.min(...tbContent.lines.map((l) => l.x)), x1 = Math.max(...tbContent.lines.map((l) => l.x + l.width));
          const iw = Math.max(1, w - ins.l - ins.r), ih = Math.max(1, h - ins.t - ins.b);
          const sx = iw / Math.max(1, x1 - x0), sy = ih / Math.max(1, tbContent.height);
          art = { m: [sx, 0, 0, sy, x + ins.l - x0 * sx, y + ins.t], dy: 0 };
          const g0 = tb.vml ? tbContent.items.find((it) => it.t === "glyphs") : void 0;
          if (g0 && tbContent.lines.length === 1) {
            const fm = g0.face.font.metrics, u = fm.unitsPerEm || 1e3;
            const desc = (fm.usWinDescent || -fm.descender) / u;
            const sy2 = ih / Math.max(1, g0.sizePt * 20);
            art.m = [sx, 0, 0, sy2, x + ins.l - x0 * sx, y + ins.t + ih - ih * desc - g0.y * sy2];
            if (rot % 180 !== 0 && tb.anchor?.posV.align === "center") {
              const ink = rotatedInkY(tbContent.items, art.m, x + w / 2, y + h / 2, rot);
              if (ink) art.dy = y + h / 2 - (ink.lo + ink.hi) / 2;
            }
          }
        }
        if (art?.dy) out.push({ t: "xform", op: "push", m: [1, 0, 0, 1, 0, art.dy] });
        if (rot) out.push({ t: "xform", op: "push", m: rotation(x + w / 2, y + h / 2, rot) });
        if (art) {
          out.push({ t: "xform", op: "push", m: art.m });
          for (const it of tbContent.items) out.push(it.t === "glyphs" ? { ...it, asPath: true } : it);
          out.push({ t: "xform", op: "pop" });
        } else if (fr.rot) {
          out.push({ t: "clip", op: "push", x, y, w, h });
          out.push(...verticalContent(tbContent, fr, tb.vAnchor, x, y, w, h));
          out.push({ t: "clip", op: "pop" });
        } else {
          let dy = y + ins.t;
          const free = h - ins.t - ins.b - tbContent.height;
          if (tb.vAnchor === "ctr" && free > 0) dy += free / 2;
          else if (tb.vAnchor === "b" && free > 0) dy += free;
          out.push({ t: "clip", op: "push", x, y, w, h });
          const raster = rot % 90 !== 0;
          const outside = (r) => r.y >= y + h || r.y + r.h <= y || r.x >= x + w || r.x + r.w <= x;
          let skip = 0;
          for (const it of tbContent.items) {
            if (skip) {
              if (it.t === "clip") skip += it.op === "push" ? 1 : -1;
              continue;
            }
            if (it.t === "clip" && it.op === "push" && it.y !== void 0 && it.w !== void 0 && it.h !== void 0 && outside({ x: (it.x ?? 0) + x + ins.l, y: it.y + dy, w: it.w, h: it.h })) {
              skip = 1;
              continue;
            }
            if (it.t === "image" && outside({ x: it.x + x + ins.l, y: it.y + dy, w: it.w, h: it.h })) continue;
            const s2 = shiftItem(it, dy, x + ins.l);
            const curves = raster || inGroup && s2.t === "glyphs" && s2.scaleX !== void 0 && s2.scaleX !== 1;
            out.push(curves && s2.t === "glyphs" ? { ...s2, asPath: true } : s2);
          }
          out.push({ t: "clip", op: "pop" });
        }
        if (rot) out.push({ t: "xform", op: "pop" });
        if (art?.dy) out.push({ t: "xform", op: "pop" });
      }
    } else if (run2.group) {
      const gr = run2.group;
      for (const item of gr.items) {
        const { run: r, x: ix, y: iy, w: iw, h: ih } = groupChild(gr, item, x, y, w, h);
        let tc = null;
        if (r.textbox) {
          const blocks = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: "paragraph", paragraph }));
          const chain = this.chainOf(item.run.textbox);
          tc = chain ? this.chainSlice(chain, item.run.textbox, { field: this.fieldValue(ps), ...this.inHf ? { hf: true } : {} }) : this.layoutStatic(blocks, 0, Math.max(1, tbFrame(r.textbox, this.ctx.fmt.theme, iw, ih).iw), { field: this.fieldValue(ps), ...this.tbEnv(r.textbox), ...this.inHf ? { hf: true } : {} }, "grp", ps);
        }
        out.push(...this.paintObject(r, ix, iy, iw, ih, tc, ps, true));
      }
    }
    return out;
  }
};
function blocksOfParas(set) {
  const conv = (ps) => ps?.map((paragraph) => ({ type: "paragraph", paragraph }));
  const out = {};
  if (set.default) out.default = conv(set.default);
  if (set.first) out.first = conv(set.first);
  if (set.even) out.even = conv(set.even);
  return out;
}
function horizRef(from, g, colX, colW) {
  switch (from) {
    case "page":
      return { x: 0, w: g.pageW };
    case "margin":
      return { x: g.marL, w: g.pageW - g.marL - g.marR };
    case "leftMargin":
    case "insideMargin":
      return { x: 0, w: g.marL };
    case "rightMargin":
    case "outsideMargin":
      return { x: g.pageW - g.marR, w: g.marR };
    case "character":
      return { x: colX, w: colW };
    default:
      return { x: colX, w: colW };
  }
}
function vertRef(from, g, ps, paraTop) {
  switch (from) {
    case "page":
      return { y: 0, h: g.pageH };
    case "margin": {
      const top = Math.max(g.marT, ps?.bodyTop ?? g.marT);
      return { y: top, h: g.pageH - top - g.marB };
    }
    case "topMargin":
    case "insideMargin":
      return { y: 0, h: g.marT };
    case "bottomMargin":
    case "outsideMargin":
      return { y: g.pageH - g.marB, h: g.marB };
    default:
      return { y: paraTop, h: 0 };
  }
  void ps;
}
function tbInsets(tb, theme, w, h) {
  const ins0 = tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
  const tr = tb.geom && w !== void 0 && h !== void 0 ? textRectInsets(tb.geom, w, h) : null;
  const ins = tr ? { l: ins0.l + tr.l, t: ins0.t + tr.t, r: ins0.r + tr.r, b: ins0.b + tr.b } : ins0;
  const li = tb.lineInset;
  const lw = li ? li.w ?? (li.ref ? theme?.lineWidthsPt?.[li.ref - 1] ?? [1, 1.5, 2][li.ref - 1] ?? 0.75 : 0) : tb.shape?.line?.widthPt ?? 0;
  const half = lw * 10;
  return half ? { l: ins.l + half, t: ins.t + half, r: ins.r + half, b: ins.b + half } : ins;
}
function vertKind(v) {
  switch (v) {
    case "vert":
    case "eaVert":
      return 90;
    case "vert270":
      return 270;
    case "mongolianVert":
    case "wordArtVert":
    case "wordArtVertRtl":
      return -90;
    default:
      return 0;
  }
}
function tbFrame(tb, theme, w, h) {
  const p = tbInsets(tb, theme, w, h);
  const rot = vertKind(tb.vert);
  if (rot === 90) return { ins: { l: p.t, t: p.r, r: p.b, b: p.l }, iw: h - p.t - p.b, ih: w - p.l - p.r, rot };
  if (rot === 270) return { ins: { l: p.b, t: p.l, r: p.t, b: p.r }, iw: h - p.t - p.b, ih: w - p.l - p.r, rot };
  if (rot === -90) return { ins: { l: p.t, t: p.l, r: p.b, b: p.r }, iw: h - p.t - p.b, ih: w - p.l - p.r, rot };
  return { ins: p, iw: w - p.l - p.r, ih: h - p.t - p.b, rot };
}
function verticalMatrix(rot, x, y, w, h) {
  return rot === 270 ? [0, -1, 1, 0, x, y + h] : [0, 1, -1, 0, x + w, y];
}
var VERT_PITCH = 1 / 36.8;
function verticalBands(c) {
  const ls = [...c.lines].sort((a, b) => a.y - b.y);
  let acc = 0;
  return ls.map((l) => {
    const b = { y0: l.y, y1: l.y + l.height, add: acc };
    acc += l.height * VERT_PITCH;
    return b;
  });
}
function verticalHeight(c) {
  return c.height + c.lines.reduce((a, l) => a + l.height * VERT_PITCH, 0);
}
function verticalContent(c, fr, vAnchor, x, y, w, h) {
  const lh = w;
  let dy = fr.ins.t;
  const free = lh - fr.ins.t - fr.ins.b - verticalHeight(c);
  if (vAnchor === "ctr" && free > 0) dy += free / 2;
  else if (vAnchor === "b" && free > 0) dy += free;
  const out = [{ t: "xform", op: "push", m: verticalMatrix(fr.rot, x, y, w, h) }];
  const bands = verticalBands(c);
  const shiftOf = (y0, y1) => {
    const mid = (y0 + y1) / 2;
    const b = bands.find((q) => mid >= q.y0 - 0.5 && mid <= q.y1 + 0.5) ?? [...bands].reverse().find((q) => q.y0 <= mid);
    const add = b?.add ?? 0;
    if (fr.rot !== -90) return dy + add;
    const a0 = (b ? b.y0 : y0) + add, a1 = (b ? b.y1 : y1) + add;
    return lh - (dy + a1) - a0 + add;
  };
  for (const it of c.items) {
    const r = it;
    const d = it.t === "glyphs" ? shiftOf(it.y, it.y) : it.t === "line" ? shiftOf(Math.min(it.y1, it.y2), Math.max(it.y1, it.y2)) : r.y !== void 0 ? shiftOf(r.y, r.y + (r.h ?? 0)) : dy;
    out.push(shiftItem(it, d, fr.ins.l));
  }
  out.push({ t: "xform", op: "pop" });
  return out;
}
function textRectInsets(g, w, h) {
  const names = g.adj ? Object.keys(g.adj) : void 0;
  const tr = presetTextRect(g.prst, w, h, names?.map((n) => g.adj[n]), names);
  if (tr) return { l: tr.l, t: tr.t, r: w - tr.r, b: h - tr.b };
  switch (g.prst) {
    case "roundRect": {
      const i = Math.min(w, h) * (g.adj?.["adj"] ?? 16667) / 1e5 * 0.29289;
      return { l: i, t: i, r: i, b: i };
    }
    case "ellipse": {
      const k = 0.5 - Math.SQRT1_2 / 2;
      return { l: w * k, t: h * k, r: w * k, b: h * k };
    }
    case "triangle": {
      const x1 = w * (g.adj?.["adj"] ?? 5e4) / 2e5;
      return { l: x1, t: h / 2, r: w / 2 - x1, b: 0 };
    }
    case "diamond":
      return { l: w / 4, t: h / 4, r: w / 4, b: h / 4 };
    default:
      return null;
  }
}
function alignPos(align, offset, base, span, size, pct, pageSpan, e0 = 0, e1 = 0) {
  if (align && (e0 || e1)) return alignPos(align, offset, base, span, size + e0 + e1, pct, pageSpan) + e0;
  if (align) {
    switch (align) {
      case "center":
        return base + (span - size) / 2;
      case "right":
      case "bottom":
      case "outside":
        return base + span - size;
      default:
        return base;
    }
  }
  if (pct !== void 0) return base + pct / 1e5 * pageSpan;
  return base + (offset ?? 0);
}
var PFMT = /* @__PURE__ */ new WeakMap();
var pfmtOf = (p) => {
  let f = PFMT.get(p);
  if (!f) PFMT.set(p, f = { left: p.indLeft, right: p.indRight, firstLine: p.firstLine, tabs: p.tabs });
  return f;
};
function lineRecord(ref, p, line, frameX, top, frameW) {
  const gs = p.glyphs;
  const first = gs[line.start];
  const lastG = gs[Math.max(line.start, line.end - 1)];
  const start = first ? first.offset : 0;
  const end = lastG ? lastG.offset + (lastG.ch.length || 1) : start;
  const chars = line.placed.filter((pg) => pg.g.kind !== "pb" && pg.g.kind !== "cb" && !pg.g.autoHyphen).map((pg) => ({ o: pg.g.offset, x: frameX + pg.x, w: pg.w }));
  const rb = p.revBars;
  const firstLine = line.start === 0, lastLine = line.end >= gs.length;
  const rev = !!rb && (rb.whole || rb.mark && lastLine || rb.ranges.some(([a, b, hidden]) => hidden ? a <= end && b >= start : a < end && b > start));
  const x = frameX + line.xStart;
  return {
    ref,
    start,
    end,
    x,
    y: top,
    height: line.height,
    baseline: top + line.baseline,
    width: line.width,
    chars,
    ...rev ? { rev: { before: firstLine ? p.spaceBefore : 0, after: lastLine ? p.spaceAfter : 0 } } : {},
    // régua do editor: o quadro (relativo a x) e os recuos/tabulações efetivos
    ...frameW !== void 0 ? { frame: { l: frameX - x, r: frameX + frameW - x }, pfmt: pfmtOf(p) } : {}
  };
}
function revisionBarItems(lines, x, color2) {
  const all = [...lines].sort((a, b) => a.y - b.y);
  const segs = [];
  all.forEach((l, i) => {
    if (!l.rev) return;
    const prevBottom = i > 0 ? all[i - 1].y + all[i - 1].height : -Infinity;
    const nextTop = i + 1 < all.length ? all[i + 1].y : Infinity;
    const top = Math.max(l.y - l.rev.before, Math.min(l.y, prevBottom));
    const bottom = Math.min(l.y + l.height + l.rev.after, Math.max(l.y + l.height, nextTop));
    const last = segs[segs.length - 1];
    if (last && top <= last[1] + 20) last[1] = Math.max(last[1], bottom);
    else segs.push([top, bottom]);
  });
  return segs.map(([y0, y1]) => ({ t: "rect", x, y: y0, w: BAR_WIDTH, h: y1 - y0, fill: color2 }));
}
function cullOffPage(items, pageW, pageH) {
  const stack = [];
  let m = null;
  const outside = /* @__PURE__ */ new Set();
  const lineIn = /* @__PURE__ */ new Set();
  for (const it of items) {
    if (it.t === "xform") {
      if (it.op === "push" && it.m) {
        stack.push(m);
        const n = it.m;
        m = m ? [
          m[0] * n[0] + m[2] * n[1],
          m[1] * n[0] + m[3] * n[1],
          m[0] * n[2] + m[2] * n[3],
          m[1] * n[2] + m[3] * n[3],
          m[0] * n[4] + m[2] * n[5] + m[4],
          m[1] * n[4] + m[3] * n[5] + m[5]
        ] : n;
      } else if (it.op === "pop") m = stack.pop() ?? null;
      continue;
    }
    if (it.t !== "glyphs" || !it.glyphs.length) continue;
    const em = it.sizePt * 20;
    const box = it.lineBox ?? { asc: em, desc: em * 0.3, lead: 0 };
    let x0 = Infinity, x1 = -Infinity;
    for (const g of it.glyphs) {
      x0 = Math.min(x0, g.x);
      x1 = Math.max(x1, g.x + em);
    }
    const frameL = it.glyphs[0].x - box.lead;
    x0 = Math.min(x0, frameL);
    x1 = Math.max(x1, frameL);
    const y0 = it.y - box.asc, y1 = it.y + box.desc;
    let bx0 = x0, bx1 = x1, by0 = y0, by1 = y1;
    if (m) {
      const mm = m;
      const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([px, py]) => [mm[0] * px + mm[2] * py + mm[4], mm[1] * px + mm[3] * py + mm[5]]);
      bx0 = Math.min(...pts.map((q) => q[0]));
      bx1 = Math.max(...pts.map((q) => q[0]));
      by0 = Math.min(...pts.map((q) => q[1]));
      by1 = Math.max(...pts.map((q) => q[1]));
    }
    if (bx1 <= 0 || bx0 >= pageW || by1 <= 0 || by0 >= pageH) outside.add(it);
    else if (it.lineBox) lineIn.add(it.lineBox.line);
  }
  if (!outside.size) return items;
  return items.filter((it) => !outside.has(it) || it.t === "glyphs" && !!it.lineBox && lineIn.has(it.lineBox.line));
}
var mulM = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
function tbContentPlacement(tb, theme, x, y, w, h, c) {
  const fr = tbFrame(tb, theme, w, h);
  const ins = fr.ins;
  const rot = tb.upright ? 0 : tb.rot ?? tb.shape?.rot ?? 0;
  const around = rot ? rotation(x + w / 2, y + h / 2, rot) : [1, 0, 0, 1, 0, 0];
  if (tb.wordArt) return { lines: [], xf: around };
  if (!fr.rot) {
    let dy2 = ins.t;
    const free2 = h - ins.t - ins.b - c.height;
    if (tb.vAnchor === "ctr" && free2 > 0) dy2 += free2 / 2;
    else if (tb.vAnchor === "b" && free2 > 0) dy2 += free2;
    return { lines: c.lines, xf: mulM(around, [1, 0, 0, 1, x + ins.l, y + dy2]) };
  }
  const lh = w;
  let dy = ins.t;
  const free = lh - ins.t - ins.b - verticalHeight(c);
  if (tb.vAnchor === "ctr" && free > 0) dy += free / 2;
  else if (tb.vAnchor === "b" && free > 0) dy += free;
  const bands = verticalBands(c);
  const lines = c.lines.map((l) => {
    const b = bands.find((q) => Math.abs(q.y0 - l.y) < 0.01);
    const add = b?.add ?? 0;
    const sh = fr.rot === -90 ? lh - (dy + l.y + add + l.height) - l.y : dy + add;
    return { ...l, x: l.x + ins.l, y: l.y + sh, baseline: l.baseline + sh, ...l.chars ? { chars: l.chars.map((q) => ({ ...q, x: q.x + ins.l })) } : {} };
  });
  return { lines, xf: mulM(around, verticalMatrix(fr.rot, x, y, w, h)) };
}
function rotation(cx, cy, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c];
}
function bdrKey(ppr) {
  return ppr.pBdr ? JSON.stringify([ppr.pBdr, ppr.ind ?? null]) : void 0;
}
var ABSOLUTE_V = /* @__PURE__ */ new Set(["page", "margin", "topMargin", "bottomMargin", "insideMargin", "outsideMargin"]);
function shiftLine(l, dy) {
  return { ...l, y: l.y + dy, baseline: l.baseline + dy };
}
function shiftLineXY(l, dx, dy) {
  return { ...l, x: l.x + dx, y: l.y + dy, baseline: l.baseline + dy, ...l.chars && dx ? { chars: l.chars.map((c) => ({ ...c, x: c.x + dx })) } : {} };
}
var WRAPPING = /* @__PURE__ */ new Set(["square", "tight", "through", "topAndBottom"]);
var MIN_GAP = 359.5;
function floatAnchor(run2) {
  return run2.image?.anchor ?? run2.shape?.anchor ?? run2.group?.anchor ?? run2.textbox?.anchor;
}
function followsText(a) {
  return !!a && !a.simplePos && !ABSOLUTE_V.has(a.posV.relativeFrom ?? "paragraph");
}
function narrower(a, b) {
  return a.left > b.left + 0.5 || a.right < b.right - 0.5 || (a.segs?.length ?? 0) !== (b.segs?.length ?? 0);
}
function markLineH(p) {
  const mm = faceMetrics(p.markFace.font);
  return Math.round((mm.ascent + mm.descent) * p.markStyle.sizePt * 20);
}
function scratchPage(ps) {
  return {
    ...ps,
    page: { ...ps.page, items: [], lines: [], objects: [], cells: [] },
    behind: [],
    hf: [],
    body: [],
    front: [],
    hfBehind: [],
    hfFront: [],
    floats: [...ps.floats],
    notes: []
  };
}
function rotatedInkY(items, m, cx, cy, rotDeg) {
  const r = rotDeg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
  let lo = Infinity, hi = -Infinity;
  for (const it of items) {
    if (it.t !== "glyphs") continue;
    const font = it.face.font;
    if (!font.glyphOutline) continue;
    const k = it.sizePt * 20 / (font.metrics.unitsPerEm || 1e3);
    const sxg = it.scaleX ?? 1;
    for (const g of it.glyphs) {
      const ol = font.glyphOutline(g.gid ?? font.glyphId(g.cp));
      if (!ol) continue;
      for (const c of ol) {
        if (c.op === "Z") continue;
        const pts = c.op === "Q" ? [[c.cx, c.cy], [c.x, c.y]] : [[c.x, c.y]];
        for (const [px, py] of pts) {
          const lx = g.x + px * k * sxg, ly = it.y - py * k;
          const X = m[0] * lx + m[2] * ly + m[4], Y = m[1] * lx + m[3] * ly + m[5];
          const Yr = cy + (X - cx) * sn + (Y - cy) * cs;
          if (Yr < lo) lo = Yr;
          if (Yr > hi) hi = Yr;
        }
      }
    }
  }
  return lo <= hi ? { lo, hi } : null;
}

// ../docx-layout/src/tree.ts
var BORDER_DASHES = {
  bdrDot: (w) => [w, w],
  bdrDash: (w) => [3 * w, w],
  bdrDashDot: (w) => [3 * w, w, w, w],
  bdrDashDotDot: (w) => [3 * w, w, w, w, w, w],
  bdrDashSmall: (w) => [25 * w / 6, 5 * w / 6]
};

// ../docx-layout/src/pdf-picture.ts
var T2 = 20;
var PPT = 200 / 72;
function shapeSubs(look, w, h, flipH, flipV) {
  const o = presetOutline(look?.geom?.prst, w, h, look?.geom?.adj);
  const subs = o.subs.filter((_, i) => o.fill[i] !== false);
  if (!flipH && !flipV) return subs;
  const fx = (x) => flipH ? w - x : x, fy = (y) => flipV ? h - y : y;
  return subs.map((sub) => sub.map((s) => {
    switch (s.c) {
      case "M":
      case "L":
        return { ...s, x: fx(s.x), y: fy(s.y) };
      case "C":
        return { ...s, x1: fx(s.x1), y1: fy(s.y1), x2: fx(s.x2), y2: fy(s.y2), x: fx(s.x), y: fy(s.y) };
      case "Q":
        return { ...s, x1: fx(s.x1), y1: fy(s.y1), x: fx(s.x), y: fy(s.y) };
      case "E": {
        const a0 = flipH ? Math.PI - s.a0 : s.a0, a1 = flipH ? Math.PI - s.a1 : s.a1;
        return { ...s, cx: fx(s.cx), cy: fy(s.cy), a0: flipV ? -a0 : a0, a1: flipV ? -a1 : a1, ccw: flipH !== flipV ? !s.ccw : !!s.ccw };
      }
      default:
        return s;
    }
  }));
}
var rgb2 = (hex) => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
function colored(m, hex, alpha) {
  const out = new Uint8Array(m.w * m.h * 4);
  const [r, g, b] = rgb2(hex);
  for (let i = 0; i < m.a.length; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, m.a[i] * alpha)) * 255);
  }
  return out;
}
function bounds(look, w, h) {
  let x0 = 0, y0 = 0, x1 = w, y1 = h;
  const grow = (a, b, c, d) => {
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, c);
    y1 = Math.max(y1, d);
  };
  if (look.line) {
    const lw = look.line.widthPt;
    grow(-lw, -lw, w + lw, h + lw);
  }
  if (look.glow) {
    const r2 = look.glow.radPt;
    grow(-r2, -r2, w + r2, h + r2);
  }
  const s = look.shadow;
  if (s?.kind === "outer") {
    const a = s.dirDeg * Math.PI / 180, dx = s.distPt * Math.cos(a), dy = s.distPt * Math.sin(a);
    const sx = Math.abs(s.sx ?? 1), sy = Math.abs(s.sy ?? 1);
    const k = Math.abs(Math.tan((s.kxDeg ?? 0) * Math.PI / 180)) * h + Math.abs(Math.tan((s.kyDeg ?? 0) * Math.PI / 180)) * w;
    const m = s.blurPt + k + Math.max(w, h) * Math.max(0, Math.max(sx, sy) - 1);
    const flip = s.sy !== void 0 && s.sy < 0 ? h : 0;
    grow(dx - m, dy - m - flip, w + dx + m, h + dy + m + flip);
  }
  const r = look.reflection;
  if (r) {
    const a = r.dirDeg * Math.PI / 180;
    const dx = r.distPt * Math.cos(a), dy = r.distPt * Math.sin(a);
    const lw = look.line?.widthPt ?? 0;
    grow(dx - r.blurPt - lw, h + dy - r.blurPt, w + dx + r.blurPt + lw, 2 * h + dy + r.blurPt + lw);
  }
  return { x0, y0, x1, y1 };
}
function paintShapeEffectsPdf(page, it, embedRgba, drawBody) {
  const fx = it.fx ?? {};
  const st = it.style;
  const w = it.w / T2, h = it.h / T2;
  const rot = (st.rot ?? 0) * Math.PI / 180, cos = Math.cos(rot), sin = Math.sin(rot);
  const cx = it.x / T2 + w / 2, cy = it.y / T2 + h / 2;
  const M = [cos, sin, -sin, cos, cx - cos * w / 2 + sin * h / 2, cy - sin * w / 2 - cos * h / 2];
  const rectMatrix = (x, y, rw, rh) => [M[0] * rw, M[1] * rw, M[2] * rh, M[3] * rh, M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  const draw = (img, m) => page.drawImageMatrix(img, m[0], m[1], m[2], m[3], m[4], m[5]);
  const lw0 = it.stroke?.widthPt ?? 0;
  const look = { ...fx, geom: { prst: st.geom === "custom" ? "rect" : st.geom, ...st.adj ? { adj: st.adj } : {} }, ...lw0 ? { line: { color: "000000", alpha: 1, widthPt: lw0 / 2 } } : {} };
  const bb = bounds(look, w, h);
  let ppt = PPT;
  const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * ppt * ppt;
  if (area > 8e6) ppt *= Math.sqrt(8e6 / area);
  const W = Math.max(1, Math.ceil((bb.x1 - bb.x0) * ppt)), H = Math.max(1, Math.ceil((bb.y1 - bb.y0) * ppt));
  const ox = -bb.x0 * ppt, oy = -bb.y0 * ppt;
  const subs = shapeSubs(look, w, h, !!st.flipH, !!st.flipV);
  const area0 = fillPolygons(newMask(W, H), flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35));
  const filled = !!(it.fill || it.grad || it.pattern || it.blip);
  const lwPx = (it.stroke?.widthPt ?? 0) * ppt;
  let sil = area0;
  if (!filled && lwPx > 0) {
    const r2 = Math.max(1, lwPx / 2);
    const outer = morph(area0, r2), inner = morph(area0, -r2);
    sil = newMask(W, H);
    for (let i = 0; i < sil.a.length; i++) sil.a[i] = Math.max(0, outer.a[i] - inner.a[i]);
  }
  const box = { x: ox, y: oy, w: w * ppt, h: h * ppt };
  const layerMatrix = rectMatrix(bb.x0, bb.y0, W / ppt, H / ppt);
  const fillHex = it.fill ?? it.grad?.stops[0]?.color ?? it.pattern?.fg ?? it.stroke?.color ?? "FFFFFF";
  const s = fx.shadow;
  if (s?.kind === "outer") {
    const dir = s.rotWithShape ? s.dirDeg : s.dirDeg - (st.rot ?? 0);
    const m = outerShadowMask(sil, box, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: dir, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt);
    draw(embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }
  if (fx.glow) draw(embedRgba(colored(glowMask(sil, fx.glow.radPt, ppt), fx.glow.color, fx.glow.alpha), W, H), layerMatrix);
  const soft = fx.softEdgePt ? softEdgeMask(sil, fx.softEdgePt, ppt) : null;
  const r = fx.reflection;
  if (r) {
    const a = r.dirDeg * Math.PI / 180;
    const dx = r.distPt * Math.cos(a) * ppt, dy = r.distPt * Math.sin(a) * ppt;
    let m = newMask(W, H);
    const src = soft ?? sil;
    const top = oy + h * ppt + dy;
    for (let y = 0; y < H; y++) {
      const sy = Math.round(2 * (oy + h * ppt) + dy - y - 1);
      const t = (y + 0.5 - top) / (h * ppt);
      const al = t < 0 ? 0 : reflectionAlpha(t, r);
      if (sy < 0 || sy >= H || al <= 0) continue;
      for (let x = 0; x < W; x++) {
        const sx = Math.round(x - dx);
        if (sx >= 0 && sx < W) m.a[y * W + x] = src.a[sy * W + sx] * al;
      }
    }
    if (r.blurPt > 0) m = gaussianBlur(m, r.blurPt / 3 * ppt);
    draw(embedRgba(colored(m, fillHex, 1), W, H), layerMatrix);
  }
  if (soft) draw(embedRgba(colored(soft, fillHex, st.fillAlpha ?? 1), W, H), layerMatrix);
  else drawBody();
  if (s?.kind === "inner" && filled) {
    const m = innerShadowMask(sil, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: s.dirDeg }, ppt);
    draw(embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }
}
function paintPicturePdf(page, it, env) {
  const look = it.pic ?? {};
  const w = it.w / T2, h = it.h / T2;
  const rot = (it.rot ?? 0) * Math.PI / 180, cos = Math.cos(rot), sin = Math.sin(rot);
  const cx = it.x / T2 + w / 2, cy = it.y / T2 + h / 2;
  const M = [cos, sin, -sin, cos, cx - cos * w / 2 + sin * h / 2, cy - sin * w / 2 - cos * h / 2];
  const P = (x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  const rectMatrix = (x, y, rw, rh) => [M[0] * rw, M[1] * rw, M[2] * rh, M[3] * rh, M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  const draw = (img2, m) => page.drawImageMatrix(img2, m[0], m[1], m[2], m[3], m[4], m[5]);
  const subs = shapeSubs(look, w, h, !!it.flipH, !!it.flipV);
  const polysLocal = flattenPath(subs, [1, 0, 0, 1, 0, 0], 0.2);
  const cmds = (polys) => {
    const out = [];
    for (const p of polys) {
      for (let i = 0; i < p.length; i += 2) {
        const [x, y] = P(p[i], p[i + 1]);
        out.push({ op: i ? "L" : "M", x, y });
      }
      out.push({ op: "Z" });
    }
    return out;
  };
  const bb = bounds(look, w, h);
  let ppt = PPT;
  const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * ppt * ppt;
  if (area > 8e6) ppt *= Math.sqrt(8e6 / area);
  const W = Math.max(1, Math.ceil((bb.x1 - bb.x0) * ppt)), H = Math.max(1, Math.ceil((bb.y1 - bb.y0) * ppt));
  const ox = -bb.x0 * ppt, oy = -bb.y0 * ppt;
  const needSil = !!(look.shadow || look.glow || look.softEdgePt);
  const sil = needSil ? fillPolygons(newMask(W, H), flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35)) : null;
  const box = { x: ox, y: oy, w: w * ppt, h: h * ppt };
  const layerMatrix = rectMatrix(bb.x0, bb.y0, W / ppt, H / ppt);
  const s = look.shadow;
  if (s?.kind === "outer" && sil) {
    const dir = s.rotWithShape ? s.dirDeg : s.dirDeg - (it.rot ?? 0);
    const m = outerShadowMask(sil, box, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: dir, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt);
    draw(env.embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }
  if (look.glow && sil) draw(env.embedRgba(colored(glowMask(sil, look.glow.radPt, ppt), look.glow.color, look.glow.alpha), W, H), layerMatrix);
  const crop = it.crop ?? { l: 0, t: 0, r: 0, b: 0 };
  const fw = w / Math.max(0.01, 1 - crop.l - crop.r), fh = h / Math.max(0.01, 1 - crop.t - crop.b);
  const fx0 = -crop.l * fw, fy0 = -crop.t * fh;
  const imgRect = () => {
    const x = it.flipH ? w - fx0 - fw : fx0, y = it.flipV ? h - fy0 - fh : fy0;
    const m = rectMatrix(it.flipH ? x + fw : x, it.flipV ? y + fh : y, it.flipH ? -fw : fw, it.flipV ? -fh : fh);
    return m;
  };
  const softMask = () => {
    if (!look.softEdgePt || !sil) return null;
    const m = softEdgeMask(sil, look.softEdgePt, ppt);
    const iw = Math.max(1, Math.round(fw * ppt)), ih = Math.max(1, Math.round(fh * ppt));
    const alpha = new Uint8Array(iw * ih);
    for (let y = 0; y < ih; y++) {
      for (let x = 0; x < iw; x++) {
        const lx = (it.flipH ? w - (fx0 + (x + 0.5) / ppt) : fx0 + (x + 0.5) / ppt) * ppt + ox;
        const ly = (it.flipV ? h - (fy0 + (y + 0.5) / ppt) : fy0 + (y + 0.5) / ppt) * ppt + oy;
        const xi = Math.floor(lx), yi = Math.floor(ly);
        alpha[y * iw + x] = xi < 0 || yi < 0 || xi >= W || yi >= H ? 0 : Math.round(m.a[yi * W + xi] * 255);
      }
    }
    return { alpha, width: iw, height: ih };
  };
  const r = look.reflection;
  if (r) {
    const a = r.dirDeg * Math.PI / 180;
    const dy = r.distPt * Math.sin(a), dx = r.distPt * Math.cos(a);
    const iw = Math.max(1, Math.round(fw * ppt)), ih = Math.max(1, Math.round(fh * ppt));
    const alpha = new Uint8Array(iw * ih);
    const shapeM = fillPolygons(newMask(iw, ih), flattenPath(subs, [ppt, 0, 0, ppt, -fx0 * ppt, -fy0 * ppt], 0.35));
    const soft = look.softEdgePt ? softEdgeMask(shapeM, look.softEdgePt, ppt) : shapeM;
    for (let y = 0; y < ih; y++) {
      const ly = fy0 + (y + 0.5) / ppt;
      const t = (h - ly) / h;
      const al = reflectionAlpha(t, r);
      for (let x = 0; x < iw; x++) alpha[y * iw + x] = Math.round(soft.a[y * iw + x] * al * 255);
    }
    const img2 = env.masked(alpha, iw, ih);
    if (img2) {
      const m = rectMatrix(fx0 + dx, 2 * h - fy0 + dy, fw, -fh);
      draw(img2, m);
    }
  }
  const src = look.bevel ? env.rgba() : null;
  if (look.bevel && src) {
    const shapeM = sil ?? fillPolygons(newMask(W, H), flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35));
    const alphaM = look.softEdgePt ? softEdgeMask(shapeM, look.softEdgePt, ppt) : shapeM;
    const px = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (shapeM.a[k] <= 0) continue;
        let lx = (x + 0.5 - ox) / ppt, ly = (y + 0.5 - oy) / ppt;
        if (it.flipH) lx = w - lx;
        if (it.flipV) ly = h - ly;
        const u = (lx - fx0) / fw, v = (ly - fy0) / fh;
        if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
        const si = (Math.min(src.height - 1, Math.floor(v * src.height)) * src.width + Math.min(src.width - 1, Math.floor(u * src.width))) * 4;
        px[k * 4] = src.data[si];
        px[k * 4 + 1] = src.data[si + 1];
        px[k * 4 + 2] = src.data[si + 2];
        px[k * 4 + 3] = Math.round(src.data[si + 3] * Math.min(1, alphaM.a[k]));
      }
    }
    shadeBevel(px, shapeM, { w: look.bevel.wPt * ppt, h: look.bevel.hPt * ppt, prst: look.bevel.prst, rig: look.bevel.rig, dir: look.bevel.dir, material: look.bevel.material, word: true });
    draw(env.embedRgba(px, W, H), layerMatrix);
  }
  const sm = look.bevel && src ? null : softMask();
  const img = look.bevel && src ? null : sm ? env.masked(sm.alpha, sm.width, sm.height) : env.image();
  if (img) {
    page.pushClipPath(cmds(polysLocal));
    draw(img, imgRect());
    page.popClip();
  }
  if (s?.kind === "inner" && sil) {
    const m = innerShadowMask(sil, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: s.dirDeg }, ppt);
    draw(env.embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }
  const ln = look.line;
  if (ln && ln.widthPt > 0) {
    const outer = [];
    const big = [[bb.x0 - 10, bb.y0 - 10], [bb.x1 + 10, bb.y0 - 10], [bb.x1 + 10, bb.y1 + 10], [bb.x0 - 10, bb.y1 + 10]];
    big.forEach(([x, y], i) => {
      const [px, py] = P(x, y);
      outer.push({ op: i ? "L" : "M", x: px, y: py });
    });
    outer.push({ op: "Z" });
    page.pushClipPath([...outer, ...cmds(polysLocal)], true);
    const dash = ln.dash ? DASH[ln.dash]?.map((v) => v * ln.widthPt) : void 0;
    page.withAlpha(void 0, ln.alpha < 1 ? ln.alpha : void 0, () => page.path(cmds(polysLocal), void 0, { color: rgb2(ln.color).map((v) => v / 255), widthPt: 2 * ln.widthPt, ...dash ? { dash } : {} }));
    page.popClip();
  }
  void gaussianBlur;
}
var DASH = {
  sysDot: [1, 1],
  sysDash: [3, 1],
  dash: [4, 3],
  dashDot: [4, 3, 1, 3],
  lgDash: [8, 3],
  lgDashDot: [8, 3, 1, 3],
  lgDashDotDot: [8, 3, 1, 3, 1, 3],
  sysDashDot: [3, 1, 1, 1],
  sysDashDotDot: [3, 1, 1, 1, 1, 1]
};

// ../docx-layout/src/pdf.ts
var T3 = 20;
function renderPdf(result, opts = {}) {
  const doc = new PdfDocument({ compress: opts.compress ?? true });
  const fonts = /* @__PURE__ */ new Map();
  const images = /* @__PURE__ */ new WeakMap();
  const fontFor = (face, pua = false) => {
    const key = pua ? `${face.key}#pua` : face.key;
    let f = fonts.get(key);
    if (f === void 0) {
      if (!face.bytes) f = null;
      else {
        const sf = face.font;
        const m = sf.metrics;
        f = doc.embedFont(face.family.replace(/\s+/g, "") + (face.bold ? "-Bold" : "") + (face.italic ? "-Italic" : ""), face.bytes, {
          unitsPerEm: m.unitsPerEm,
          ascender: m.ascender,
          descender: m.descender,
          glyphId: (cp) => {
            const g = sf.glyphId(cp);
            return g === 0 && cp >= 61440 && cp <= 61695 && isSymbolFont(sf) ? sf.glyphId(cp - 61440) : g;
          },
          advanceWidth: (g) => sf.advanceWidth(g)
        });
      }
      fonts.set(key, f);
    }
    return f;
  };
  const imageFor = (img) => {
    let h = images.get(img);
    if (h !== void 0) return h;
    h = null;
    const data = img.data;
    try {
      const fx = img.effects;
      const jp = jpegInfo(data);
      const dec = jp && fx ? effectDecode(fx, jp.components) : null;
      if (jp && (!fx || dec)) h = doc.embedJpeg(data, jp.width, jp.height, jp.components, jp.adobe, dec ?? void 0);
      else {
        const r = jp ? null : decodeRaster(data);
        if (r) {
          if (fx) applyImageEffects(r.data, fx);
          h = doc.embedRgba(r.data, r.width, r.height);
        } else {
          const ext = opts.decodeImage?.(img);
          if (ext && fx) applyImageEffects(ext.rgba, fx);
          if (ext) h = doc.embedRgba(ext.rgba, ext.width, ext.height);
          else if (jp) h = doc.embedJpeg(data, jp.width, jp.height, jp.components, jp.adobe);
        }
      }
    } catch {
      h = null;
    }
    images.set(img, h);
    return h;
  };
  const rgbaOf = (it) => {
    const img = it.image;
    let r = null;
    try {
      const jp = jpegInfo(img.data);
      const d = jp ? null : decodeRaster(img.data);
      if (d) r = { data: new Uint8Array(d.data), width: d.width, height: d.height };
      else {
        const ext = opts.decodeImage?.(img);
        if (ext) r = { data: new Uint8Array(ext.rgba), width: ext.width, height: ext.height };
      }
    } catch {
      r = null;
    }
    if (!r) return null;
    if (img.effects) applyImageEffects(r.data, img.effects);
    if (it.pic) applyPictureAdjust(r.data, it.pic);
    return r;
  };
  const adjusted2 = /* @__PURE__ */ new Map();
  const pictureEnv = (it) => {
    const look = it.pic;
    const needPixels = !!(look && (look.alpha !== void 0 || look.duotone || look.clrChange));
    return {
      image: () => {
        if (!needPixels) return imageFor(it.image);
        const key = JSON.stringify([look?.alpha, look?.duotone, look?.clrChange]);
        let byImg = adjustedFor.get(it.image);
        if (!byImg) {
          byImg = /* @__PURE__ */ new Map();
          adjustedFor.set(it.image, byImg);
        }
        if (byImg.has(key)) return byImg.get(key) ?? null;
        const r = rgbaOf(it);
        const h = r ? doc.embedRgba(r.data, r.width, r.height) : imageFor(it.image);
        byImg.set(key, h);
        return h;
      },
      rgba: () => rgbaOf(it),
      masked: (alpha, mw, mh) => {
        const jp = jpegInfo(it.image.data);
        if (jp && !needPixels) {
          const fx = it.image.effects;
          const dec = fx ? effectDecode(fx, jp.components) : null;
          if (!fx || dec) return doc.embedJpeg(it.image.data, jp.width, jp.height, jp.components, jp.adobe, dec ?? void 0, { alpha, width: mw, height: mh });
        }
        const r = rgbaOf(it);
        if (!r) return imageFor(it.image);
        for (let y = 0; y < r.height; y++) {
          const my = Math.min(mh - 1, Math.floor((y + 0.5) / r.height * mh));
          for (let x = 0; x < r.width; x++) {
            const mx = Math.min(mw - 1, Math.floor((x + 0.5) / r.width * mw));
            const k = (y * r.width + x) * 4 + 3;
            r.data[k] = Math.round(r.data[k] * alpha[my * mw + mx] / 255);
          }
        }
        return doc.embedRgba(r.data, r.width, r.height);
      },
      embedRgba: (d, w, h) => doc.embedRgba(d, w, h)
    };
  };
  const adjustedFor = /* @__PURE__ */ new Map();
  void adjusted2;
  const bgImages = /* @__PURE__ */ new Map();
  const bgImage = (key, make) => {
    let h = bgImages.get(key);
    if (!h) {
      const r = make();
      h = doc.embedRgba(r.rgba, r.w, r.h);
      bgImages.set(key, h);
    }
    return h;
  };
  for (const lp of result.pages) {
    const page = doc.addPage(lp.widthTw / T3, lp.heightTw / T3);
    if (lp.background) page.fillRect(0, 0, lp.widthTw / T3, lp.heightTw / T3, hexColor(lp.background));
    if (lp.backgroundFill) paintFillPdf(page, lp, lp.backgroundFill, bgImage, imageFor);
    for (const it of lp.items) paintItem(page, it, fontFor, imageFor, (g, smp) => doc.addShading(g, smp, page.heightPt), pictureEnv, (d, w, h) => doc.embedRgba(d, w, h));
  }
  return doc.build();
}
function outlineInto(cmds, font, gid, ox, base, sx, s, skew) {
  const ol = font.glyphOutline?.(gid);
  if (!ol) return false;
  const X = (x, y) => ox + x * sx + skew * y * s;
  const Y = (y) => base - y * s;
  let px = 0, py = 0;
  for (const c of ol) {
    if (c.op === "Z") {
      cmds.push({ op: "Z" });
      continue;
    }
    if (c.op === "Q") {
      const c1x = px + 2 / 3 * (c.cx - px), c1y = py + 2 / 3 * (c.cy - py);
      const c2x = c.x + 2 / 3 * (c.cx - c.x), c2y = c.y + 2 / 3 * (c.cy - c.y);
      cmds.push({ op: "C", x1: X(c1x, c1y), y1: Y(c1y), x2: X(c2x, c2y), y2: Y(c2y), x: X(c.x, c.y), y: Y(c.y) });
    } else cmds.push({ op: c.op, x: X(c.x, c.y), y: Y(c.y) });
    px = c.x;
    py = c.y;
  }
  return true;
}
function glyphsAsPath(page, it) {
  const font = it.face.font;
  if (!font.glyphOutline) return false;
  const upm = font.metrics.unitsPerEm;
  const s = it.sizePt / upm, sx = s * (it.scaleX ?? 1);
  const skew = it.synthItalic ? 0.2 : 0;
  const base = it.y / T3;
  const cmds = [];
  for (const g of it.glyphs) {
    const gid = g.gid ?? font.glyphId(g.cp);
    const layers = it.colr ? font.colorLayers?.(gid) : null;
    if (layers) {
      for (const L of layers) {
        const lc = [];
        if (!outlineInto(lc, font, L.glyphId, g.x / T3, base, sx, s, skew)) continue;
        if (!lc.length) continue;
        const a = L.alpha * (it.alpha ?? 1);
        page.withAlpha(a < 1 ? a : void 0, void 0, () => page.path(lc, hexColor(L.color ?? it.color)));
      }
      continue;
    }
    const ol = font.glyphOutline(gid);
    if (!ol) return false;
    const ox = g.x / T3;
    const X = (x, y) => ox + x * sx + skew * y * s;
    const Y = (y) => base - y * s;
    let px = 0, py = 0;
    for (const c of ol) {
      if (c.op === "Z") {
        cmds.push({ op: "Z" });
        continue;
      }
      if (c.op === "Q") {
        const c1x = px + 2 / 3 * (c.cx - px), c1y = py + 2 / 3 * (c.cy - py);
        const c2x = c.x + 2 / 3 * (c.cx - c.x), c2y = c.y + 2 / 3 * (c.cy - c.y);
        cmds.push({ op: "C", x1: X(c1x, c1y), y1: Y(c1y), x2: X(c2x, c2y), y2: Y(c2y), x: X(c.x, c.y), y: Y(c.y) });
      } else cmds.push({ op: c.op, x: X(c.x, c.y), y: Y(c.y) });
      px = c.x;
      py = c.y;
    }
  }
  if (!cmds.length) return true;
  const color2 = hexColor(it.color);
  const stroke = it.synthBold ? { color: color2, widthPt: it.sizePt * 0.03 } : void 0;
  page.withAlpha(it.alpha, it.alpha, () => page.path(cmds, color2, stroke));
  return true;
}
function paintItem(page, it, fontFor, imageFor, shade, pictureEnv, embedRgba) {
  switch (it.t) {
    case "glyphs": {
      if (it.asPath && glyphsAsPath(page, it)) return;
      const ef = fontFor(it.face);
      if (!ef) return;
      const pdfSize = Math.round(it.sizePt / 0.12) * 0.12;
      const sf = it.face.font;
      const isPua = (cp) => cp >= 61440 && cp <= 61695 && sf.glyphId(cp) === 0;
      const all = it.glyphs.filter((g) => g.gid === void 0);
      for (let i = 0; i < all.length; ) {
        const pua = isPua(all[i].cp);
        let j = i + 1;
        while (j < all.length && isPua(all[j].cp) === pua) j++;
        const f = pua ? fontFor(it.face, true) ?? ef : ef;
        const placed = all.slice(i, j).map((g) => {
          const { gid } = f.encode(g.cp);
          return { gid, codePoint: g.cp, xPt: g.x / T3, baselineFromTopPt: it.y / T3 };
        });
        page.withAlpha(it.alpha, it.alpha, () => page.glyphs(f, pdfSize, hexColor(it.color), placed, {
          ...it.scaleX ? { scaleX: it.scaleX } : {},
          ...it.synthBold ? { synthBold: true } : {},
          ...it.synthItalic ? { synthItalic: true } : {},
          // texto em corridas (Tm + TJ) como no PDF do Word: a extração não embaralha linhas sobrepostas
          runs: true
        }));
        i = j;
      }
      return;
    }
    case "rect":
      page.withAlpha(it.alpha, void 0, () => page.fillRect(it.x / T3, it.y / T3, it.w / T3, it.h / T3, hexColor(it.fill)));
      return;
    case "line": {
      const dash = it.dash === "dotted" ? [it.widthPt, it.widthPt * 2] : it.dash === "dashed" ? [it.widthPt * 4, it.widthPt * 3] : it.dash === "dashDot" ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2] : it.dash === "dashDotDot" ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2, it.widthPt, it.widthPt * 2] : it.dash ? BORDER_DASHES[it.dash]?.(it.widthPt) : void 0;
      page.line(it.x1 / T3, it.y1 / T3, it.x2 / T3, it.y2 / T3, hexColor(it.color), it.widthPt, dash);
      return;
    }
    case "image": {
      if (pictureEnv && (it.pic || it.crop && (it.rot || it.flipH || it.flipV))) {
        paintPicturePdf(page, it, pictureEnv(it));
        return;
      }
      const h = imageFor(it.image);
      if (!h) return;
      let x = it.x / T3, y = it.y / T3, w = it.w / T3, hh = it.h / T3;
      const crop = it.crop;
      if (crop && (crop.l || crop.t || crop.r || crop.b)) {
        page.pushClipRect(x, y, w, hh);
        const fw = w / Math.max(0.01, 1 - crop.l - crop.r);
        const fh = hh / Math.max(0.01, 1 - crop.t - crop.b);
        x -= crop.l * fw;
        y -= crop.t * fh;
        w = fw;
        hh = fh;
        page.drawImageTransformed(h, x, y, w, hh, it.rot ?? 0, !!it.flipH, !!it.flipV);
        page.popClip();
      } else if (it.rot || it.flipH || it.flipV) page.drawImageTransformed(h, x, y, w, hh, it.rot ?? 0, !!it.flipH, !!it.flipV);
      else page.drawImage(h, x, y, w, hh);
      return;
    }
    case "shape": {
      if (it.fx && embedRgba && it.style.geom !== "line") {
        paintShapeEffectsPdf(page, it, embedRgba, () => paintItem(page, { ...it, fx: void 0, shadow: void 0 }, fontFor, imageFor, shade, pictureEnv, embedRgba));
        return;
      }
      const st = it.style;
      const fill = it.fill && /^[0-9A-Fa-f]{6}$/.test(it.fill) ? hexColor(it.fill) : void 0;
      const stroke = it.stroke && /^[0-9A-Fa-f]{6}$/.test(it.stroke.color) ? { color: hexColor(it.stroke.color), widthPt: Math.max(0.25, it.stroke.widthPt), ...it.stroke.dash ? { dash: [it.stroke.widthPt * 3, it.stroke.widthPt * 2] } : {} } : void 0;
      if (!fill && !stroke && !it.grad && !it.pattern && !it.blip) return;
      const x = it.x / T3, y = it.y / T3, w = it.w / T3, h = it.h / T3;
      const isLine = st.geom === "line" || st.geom.startsWith("straightConnector");
      const xf = { flipH: !!st.flipH, flipV: !!st.flipV, rot: st.rot ?? 0 };
      let parts;
      if (isLine) {
        let cmds = linePath(x, y, w, h, it.line, !!st.flipH, !!st.flipV);
        if (st.rot) cmds = rotatePath(cmds, x + w / 2, y + h / 2, st.rot);
        parts = [{ cmds, fill: false, stroke: true, evenOdd: false }];
      } else if (st.geom === "custom" && st.cust) {
        parts = custPaths(st.cust, x, y, w, h, xf).map((p) => ({ cmds: p.cmds, fill: p.fill, stroke: p.stroke, evenOdd: true }));
      } else {
        parts = [{ cmds: presetPath(st.geom, x, y, w, h, { ...st.adj ? { adj: st.adj } : {}, ...xf }), fill: !OPEN_PRESETS.has(st.geom), stroke: true, evenOdd: false }];
      }
      if (it.shadow) {
        const dx = it.shadow.dx / T3, dy = it.shadow.dy / T3;
        const col = hexColor(it.shadow.color);
        for (const p of parts) {
          if (!p.fill && !stroke) continue;
          const sc = p.cmds.map((c) => c.op === "Z" ? c : c.op === "C" ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy });
          page.withAlpha(it.shadow.alpha, it.shadow.alpha, () => page.path(sc, p.fill && (fill || it.grad) ? col : void 0, p.stroke && stroke ? { ...stroke, color: col } : void 0, p.evenOdd));
        }
      }
      if ((it.pattern || it.blip) && embedRgba) {
        const fillParts = parts.filter((p) => p.fill);
        for (const p of fillParts) {
          page.pushClipPath(p.cmds, p.evenOdd);
          if (it.pattern) {
            const pr = patternRaster(it.pattern, x, y, w, h, 0.75, 4);
            if (pr) page.drawImage(embedRgba(pr.data, pr.w, pr.h), pr.x, pr.y, pr.cells.w * 0.75, pr.cells.h * 0.75);
          } else if (it.blip) {
            const im = imageFor(it.blip.image);
            const nat = imagePixelSize(it.blip.image.data);
            if (im) page.withAlpha(it.blip.alpha, void 0, () => {
              for (const t of blipTiles(it.blip, x, y, w, h, 1 / 12700, nat)) page.drawImage(im, t.x, t.y, t.w, t.h);
            });
          }
          page.popClip();
        }
        if (stroke) {
          for (const p of parts) if (p.stroke) page.withAlpha(void 0, st.line?.alpha, () => page.path(p.cmds, void 0, stroke));
        }
        return;
      }
      if (it.grad && isRectGradient(it.grad) && embedRgba) {
        const r = rectGradientRaster(it.grad, w, h, 2);
        const im = embedRgba(r.data, r.w, r.h);
        for (const p of parts) {
          if (!p.fill) continue;
          page.pushClipPath(p.cmds, p.evenOdd);
          page.withAlpha(st.fillAlpha, void 0, () => page.drawImageTransformed(im, x, y, w, h, st.rot ?? 0, !!st.flipH, !!st.flipV));
          page.popClip();
        }
        if (stroke) {
          for (const p of parts) if (p.stroke) page.withAlpha(void 0, st.line?.alpha, () => page.path(p.cmds, void 0, stroke));
        }
        return;
      }
      if (it.grad) {
        const pb = pathBounds(parts.flatMap((p) => p.cmds));
        const g = gradientGeometry2(it.grad, { x, y, w, h, rot: st.rot ?? 0 }, pb);
        const sh = shade(g, gradientSamples(it.grad.stops, it.grad.path ? 256 : 512));
        for (const p of parts) if (p.fill) page.withAlpha(st.fillAlpha, void 0, () => page.fillShaded(p.cmds, sh, p.evenOdd));
        if (stroke) {
          for (const p of parts) if (p.stroke) page.withAlpha(void 0, st.line?.alpha, () => page.path(p.cmds, void 0, stroke));
        }
        return;
      }
      for (const p of parts) page.withAlpha(st.fillAlpha, st.line?.alpha, () => page.path(p.cmds, p.fill ? fill : void 0, p.stroke ? stroke : void 0, p.evenOdd));
      return;
    }
    case "path": {
      const fill = it.fill && /^[0-9A-Fa-f]{6}$/.test(it.fill) ? hexColor(it.fill) : void 0;
      const stroke = it.stroke ? { color: hexColor(it.stroke.color), widthPt: Math.max(0.25, it.stroke.widthPt), ...it.stroke.dash ? { dash: [it.stroke.widthPt * 3, it.stroke.widthPt * 2] } : {} } : void 0;
      const cmds = it.cmds.map((c) => c.op === "Z" ? c : c.op === "C" ? { op: "C", x1: c.x1 / T3, y1: c.y1 / T3, x2: c.x2 / T3, y2: c.y2 / T3, x: c.x / T3, y: c.y / T3 } : { op: c.op, x: c.x / T3, y: c.y / T3 });
      page.path(cmds, fill, stroke);
      return;
    }
    case "xform": {
      if (it.op === "pop" || !it.m) {
        page.popClip();
        return;
      }
      const [a, b, c, d, e, f] = it.m;
      const H = page.heightPt;
      page.pushTransform(a, -b, -c, d, c * H + e / T3, H - d * H - f / T3);
      return;
    }
    case "clip":
      if (it.op === "push") page.pushClipRect((it.x ?? 0) / T3, (it.y ?? 0) / T3, (it.w ?? 0) / T3, (it.h ?? 0) / T3);
      else page.popClip();
      return;
  }
}
function rotatePath(cmds, cx, cy, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const tr = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  return cmds.map((m) => {
    if (m.op === "M" || m.op === "L") {
      const [x, y] = tr(m.x, m.y);
      return { op: m.op, x, y };
    }
    if (m.op === "C") {
      const [x1, y1] = tr(m.x1, m.y1);
      const [x2, y2] = tr(m.x2, m.y2);
      const [x, y] = tr(m.x, m.y);
      return { op: "C", x1, y1, x2, y2, x, y };
    }
    return m;
  });
}
function linePath(x, y, w, h, line, flipH = false, flipV = false) {
  if (line) return [{ op: "M", x: x + line.x1 / T3, y: y + line.y1 / T3 }, { op: "L", x: x + line.x2 / T3, y: y + line.y2 / T3 }];
  const [x1, x2] = flipH ? [x + w, x] : [x, x + w];
  const [y1, y2] = flipV ? [y + h, y] : [y, y + h];
  return [{ op: "M", x: x1, y: y1 }, { op: "L", x: x2, y: y2 }];
}
function paintFillPdf(page, lp, f, bgImage, imageFor) {
  const tile = pageFillTileTw(f, 2.4, 20, true);
  if (!tile) return;
  let img = null;
  let tw = tile.w / T3, th = tile.h / T3;
  if (f.type === "gradient" || f.type === "gradientRadial") {
    const pw = Math.max(2, Math.round(tw * 96 / 72)), ph = Math.max(2, Math.round(th * 96 / 72));
    img = bgImage(
      `g|${JSON.stringify([f.type, f.c1, f.c2, f.stops, f.angle, f.focus, f.focusPosition, f.gradientCenter])}|${pw}x${ph}`,
      () => ({ rgba: gradientTileRgba(f, pw, ph, true), w: pw, h: ph })
    );
  } else if (f.type === "pattern") {
    const base = patternRgba(f);
    img = bgImage(`p|${f.c1}|${f.c2}|${f.pattern?.join(",")}`, () => {
      const rgba = new Uint8Array(64 * 64 * 4);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) rgba.set(base.subarray((y % 8 * 8 + x % 8) * 4, (y % 8 * 8 + x % 8) * 4 + 4), (y * 64 + x) * 4);
      return { rgba, w: 64, h: 64 };
    });
    tw *= 8;
    th *= 8;
  } else if (f.image) img = imageFor(f.image);
  if (!img || tw <= 0 || th <= 0) return;
  const W = lp.widthTw / T3, H = lp.heightTw / T3;
  page.pushClipRect(0, 0, W, H);
  for (let y = 0; y < H; y += th) for (let x = 0; x < W; x += tw) page.drawImage(img, x, y, tw, th);
  page.popClip();
}

// ../docx-layout/src/canvas-picture.ts
function canvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
var ctx2d = (c) => c.getContext("2d");
var cache = /* @__PURE__ */ new WeakMap();
function needsPicturePainter(it) {
  return !!it.pic || !!it.image.effects || !!(it.crop && (it.crop.l || it.crop.t || it.crop.r || it.crop.b) && (it.rot || it.flipH || it.flipV));
}
var DASH2 = {
  sysDot: [1, 1],
  sysDash: [3, 1],
  dash: [4, 3],
  dashDot: [4, 3, 1, 3],
  lgDash: [8, 3],
  lgDashDot: [8, 3, 1, 3],
  lgDashDotDot: [8, 3, 1, 3, 1, 3],
  sysDashDot: [3, 1, 1, 1],
  sysDashDotDot: [3, 1, 1, 1, 1, 1]
};
function bounds2(look, w, h) {
  let x0 = 0, y0 = 0, x1 = w, y1 = h;
  const grow = (a, b, c, d) => {
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, c);
    y1 = Math.max(y1, d);
  };
  if (!look) return { x0, y0, x1, y1 };
  if (look.line) {
    const lw = look.line.widthPt;
    grow(-lw, -lw, w + lw, h + lw);
  }
  if (look.glow) {
    const r2 = look.glow.radPt;
    grow(-r2, -r2, w + r2, h + r2);
  }
  const s = look.shadow;
  if (s?.kind === "outer") {
    const a = s.dirDeg * Math.PI / 180, dx = s.distPt * Math.cos(a), dy = s.distPt * Math.sin(a);
    const sx = Math.abs(s.sx ?? 1), sy = Math.abs(s.sy ?? 1);
    const k = Math.abs(Math.tan((s.kxDeg ?? 0) * Math.PI / 180)) * h + Math.abs(Math.tan((s.kyDeg ?? 0) * Math.PI / 180)) * w;
    const m = s.blurPt + k + Math.max(w, h) * Math.max(0, Math.max(sx, sy) - 1) + (sy < 0 || (s.sy ?? 1) < 0 ? h : 0);
    grow(dx - m, dy - m - (s.sy !== void 0 && s.sy < 0 ? h : 0), w + dx + m, h + dy + m + (s.sy !== void 0 && s.sy < 0 ? h : 0));
  }
  const r = look.reflection;
  if (r) {
    const a = r.dirDeg * Math.PI / 180;
    const dx = r.distPt * Math.cos(a), dy = r.distPt * Math.sin(a);
    const lw = look.line?.widthPt ?? 0;
    grow(dx - r.blurPt - lw, h + dy - r.blurPt, w + dx + r.blurPt + lw, 2 * h + dy + r.blurPt + lw);
  }
  return { x0, y0, x1, y1 };
}
function shapeSubs2(look, w, h, flipH, flipV) {
  const o = presetOutline(look?.geom?.prst, w, h, look?.geom?.adj);
  const subs = o.subs.filter((_, i) => o.fill[i] !== false);
  if (!flipH && !flipV) return subs;
  const fx = (x) => flipH ? w - x : x, fy = (y) => flipV ? h - y : y;
  return subs.map((sub) => sub.map((s) => {
    switch (s.c) {
      case "M":
      case "L":
        return { ...s, x: fx(s.x), y: fy(s.y) };
      case "C":
        return { ...s, x1: fx(s.x1), y1: fy(s.y1), x2: fx(s.x2), y2: fy(s.y2), x: fx(s.x), y: fy(s.y) };
      case "Q":
        return { ...s, x1: fx(s.x1), y1: fy(s.y1), x: fx(s.x), y: fy(s.y) };
      case "E": {
        const a0 = flipH ? Math.PI - s.a0 : s.a0, a1 = flipH ? Math.PI - s.a1 : s.a1;
        const b0 = flipV ? -a0 : a0, b1 = flipV ? -a1 : a1;
        return { ...s, cx: fx(s.cx), cy: fy(s.cy), a0: b0, a1: b1, ccw: flipH !== flipV ? !s.ccw : !!s.ccw };
      }
      default:
        return s;
    }
  }));
}
function tracePath(c, polys) {
  c.beginPath();
  for (const p of polys) {
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
  }
}
var rgb3 = (hex) => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
function maskToCanvas(m, hex, alpha) {
  const c = canvas(m.w, m.h);
  const x = ctx2d(c);
  const img = x.createImageData(m.w, m.h);
  const [r, g, b] = rgb3(hex);
  for (let i = 0; i < m.a.length; i++) {
    const k = i * 4;
    img.data[k] = r;
    img.data[k + 1] = g;
    img.data[k + 2] = b;
    img.data[k + 3] = Math.round(Math.max(0, Math.min(1, m.a[i] * alpha)) * 255);
  }
  x.putImageData(img, 0, 0);
  return c;
}
var adjusted = /* @__PURE__ */ new WeakMap();
function adjustedBitmap(it, bmp) {
  const look = it.pic, fx = it.image.effects;
  if (!fx && look?.alpha === void 0 && !look?.duotone && !look?.clrChange) return bmp;
  const key = JSON.stringify([fx, look?.alpha, look?.duotone, look?.clrChange]);
  let m = adjusted.get(it.image);
  if (!m) {
    m = /* @__PURE__ */ new Map();
    adjusted.set(it.image, m);
  }
  const hit = m.get(key);
  if (hit) return hit;
  const c = canvas(Math.max(1, bmp.width), Math.max(1, bmp.height));
  const x = ctx2d(c);
  x.drawImage(bmp, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  if (fx) applyImageEffects(d, fx);
  if (look) applyPictureAdjust(d, look);
  x.putImageData(img, 0, 0);
  m.set(key, c);
  return c;
}
function buildLayer(it, bmp, ppt0) {
  const look = it.pic;
  const w = it.w / 20, h = it.h / 20;
  const bb = bounds2(look, w, h);
  let ppt = ppt0;
  const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * ppt * ppt;
  if (area > 12e6) ppt *= Math.sqrt(12e6 / area);
  const W = Math.max(1, Math.ceil((bb.x1 - bb.x0) * ppt)), H = Math.max(1, Math.ceil((bb.y1 - bb.y0) * ppt));
  const ox = -bb.x0 * ppt, oy = -bb.y0 * ppt;
  const subs = shapeSubs2(look, w, h, !!it.flipH, !!it.flipV);
  const polys = flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35);
  const pic = canvas(W, H);
  const pc = ctx2d(pic);
  pc.save();
  tracePath(pc, polys);
  pc.clip();
  const crop = it.crop ?? { l: 0, t: 0, r: 0, b: 0 };
  const fw = w / Math.max(0.01, 1 - crop.l - crop.r), fh = h / Math.max(0.01, 1 - crop.t - crop.b);
  pc.translate(ox + w / 2 * ppt, oy + h / 2 * ppt);
  pc.scale(it.flipH ? -1 : 1, it.flipV ? -1 : 1);
  const src = adjustedBitmap(it, bmp);
  pc.imageSmoothingEnabled = true;
  pc.imageSmoothingQuality = "high";
  pc.drawImage(src, (-w / 2 - crop.l * fw) * ppt, (-h / 2 - crop.t * fh) * ppt, fw * ppt, fh * ppt);
  pc.restore();
  if (look?.bevel) {
    const img = pc.getImageData(0, 0, W, H);
    const shapeM = fillPolygons(newMask(W, H), polys);
    shadeBevel(img.data, shapeM, { w: look.bevel.wPt * ppt, h: look.bevel.hPt * ppt, prst: look.bevel.prst, rig: look.bevel.rig, dir: look.bevel.dir, material: look.bevel.material, word: true });
    pc.putImageData(img, 0, 0);
  }
  const sil = fillPolygons(newMask(W, H), polys);
  if (look?.softEdgePt || look?.shadow || look?.glow) {
    const a = pc.getImageData(0, 0, W, H).data;
    for (let i = 0; i < sil.a.length; i++) sil.a[i] = Math.min(sil.a[i], a[i * 4 + 3] / 255 / (look?.alpha ?? 1));
  }
  const box = { x: ox, y: oy, w: w * ppt, h: h * ppt };
  const shape = canvas(W, H);
  const sc = ctx2d(shape);
  sc.drawImage(pic, 0, 0);
  if (look?.shadow?.kind === "inner") {
    const s2 = look.shadow;
    const m = innerShadowMask(sil, { blurPt: s2.blurPt, distPt: s2.distPt, dirDeg: s2.dirDeg }, ppt);
    sc.drawImage(maskToCanvas(m, s2.color, s2.alpha), 0, 0);
  }
  if (look?.line && look.line.widthPt > 0) {
    const ln = look.line;
    const lc = canvas(W, H), lx = ctx2d(lc);
    tracePath(lx, polys);
    lx.lineWidth = 2 * ln.widthPt * ppt;
    lx.lineJoin = ln.join === "round" ? "round" : ln.join === "bevel" ? "bevel" : "miter";
    lx.lineCap = ln.cap === "rnd" ? "round" : ln.cap === "sq" ? "square" : "butt";
    const dash = ln.dash ? DASH2[ln.dash] : void 0;
    if (dash) lx.setLineDash(dash.map((v) => v * ln.widthPt * ppt));
    lx.strokeStyle = `#${ln.color}`;
    lx.globalAlpha = ln.alpha;
    lx.stroke();
    lx.globalAlpha = 1;
    lx.globalCompositeOperation = "destination-out";
    tracePath(lx, polys);
    lx.fill();
    sc.drawImage(lc, 0, 0);
  }
  if (look?.softEdgePt) {
    const m = softEdgeMask(sil, look.softEdgePt, ppt);
    const img = sc.getImageData(0, 0, W, H);
    for (let i = 0; i < m.a.length; i++) img.data[i * 4 + 3] = Math.round(img.data[i * 4 + 3] * m.a[i]);
    sc.putImageData(img, 0, 0);
  }
  const out = canvas(W, H);
  const o = ctx2d(out);
  const s = look?.shadow;
  if (s?.kind === "outer") {
    const dir = s.rotWithShape === false || s.rotWithShape === void 0 ? s.dirDeg - (it.rot ?? 0) : s.dirDeg;
    const m = outerShadowMask(sil, box, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: dir, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt);
    o.drawImage(maskToCanvas(m, s.color, s.alpha), 0, 0);
  }
  if (look?.glow) o.drawImage(maskToCanvas(glowMask(sil, look.glow.radPt, ppt), look.glow.color, look.glow.alpha), 0, 0);
  const r = look?.reflection;
  if (r) {
    const rc = canvas(W, H), rx = ctx2d(rc);
    const a = r.dirDeg * Math.PI / 180;
    const dx = r.distPt * Math.cos(a) * ppt, dy = r.distPt * Math.sin(a) * ppt;
    rx.translate(dx, 2 * (oy + h * ppt) + dy);
    rx.scale(1, -1);
    rx.drawImage(shape, 0, 0);
    const img = rx.getImageData(0, 0, W, H);
    const top = oy + h * ppt + dy;
    for (let y = 0; y < H; y++) {
      const t = (y + 0.5 - top) / (h * ppt);
      const al = t < 0 ? 0 : reflectionAlpha(t, r);
      for (let x = 0; x < W; x++) img.data[(y * W + x) * 4 + 3] = Math.round(img.data[(y * W + x) * 4 + 3] * al);
    }
    if (r.blurPt > 0) {
      const ch = [0, 1, 2, 3].map((k) => {
        const m = newMask(W, H);
        for (let i = 0; i < m.a.length; i++) m.a[i] = (k === 3 ? img.data[i * 4 + 3] : img.data[i * 4 + k] * img.data[i * 4 + 3] / 255) / 255;
        return gaussianBlur(m, r.blurPt / 3 * ppt).a;
      });
      for (let i = 0; i < W * H; i++) {
        const al = ch[3][i];
        img.data[i * 4 + 3] = Math.round(al * 255);
        for (let k = 0; k < 3; k++) img.data[i * 4 + k] = al > 0 ? Math.round(ch[k][i] / al * 255) : 0;
      }
    }
    rx.setTransform(1, 0, 0, 1, 0, 0);
    rx.putImageData(img, 0, 0);
    o.drawImage(rc, 0, 0);
  }
  o.drawImage(shape, 0, 0);
  return { c: out, x0: bb.x0, y0: bb.y0, ppt };
}
var shapeCache = /* @__PURE__ */ new Map();
function paintShapeEffects(ctx, it, drawBody) {
  const fx = it.fx ?? {};
  const m0 = ctx.getTransform();
  let ppt = Math.max(0.5, Math.min(8, Math.hypot(m0.a, m0.b) * 20));
  const w = it.w / 20, h = it.h / 20;
  const lw = it.stroke?.widthPt ?? 0;
  const look = { ...fx, ...lw ? { line: { color: "000000", alpha: 1, widthPt: lw / 2 } } : {} };
  const key = JSON.stringify([it.style, it.fill, it.stroke, it.grad, it.pattern, fx, it.w, it.h, it.blip ? it.blip.image.data.length : 0, Math.round(ppt * 50)]);
  let layer = shapeCache.get(key);
  if (!layer) {
    const bb = bounds2(look, w, h);
    const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * ppt * ppt;
    if (area > 8e6) ppt *= Math.sqrt(8e6 / area);
    const W = Math.max(1, Math.ceil((bb.x1 - bb.x0) * ppt)), H = Math.max(1, Math.ceil((bb.y1 - bb.y0) * ppt));
    const ox = -bb.x0 * ppt, oy = -bb.y0 * ppt;
    const body = canvas(W, H);
    const bc = ctx2d(body);
    bc.translate(ox, oy);
    drawBody(bc, ppt / 20);
    bc.setTransform(1, 0, 0, 1, 0, 0);
    const sil = newMask(W, H);
    {
      const d = bc.getImageData(0, 0, W, H).data;
      for (let i = 0; i < sil.a.length; i++) sil.a[i] = d[i * 4 + 3] / 255;
    }
    const box = { x: ox, y: oy, w: w * ppt, h: h * ppt };
    const s = fx.shadow;
    if (s?.kind === "inner" && (it.fill || it.grad || it.pattern || it.blip)) {
      const m = innerShadowMask(sil, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: s.dirDeg }, ppt);
      bc.globalCompositeOperation = "source-atop";
      bc.drawImage(maskToCanvas(m, s.color, s.alpha), 0, 0);
      bc.globalCompositeOperation = "source-over";
    }
    if (fx.softEdgePt) {
      const m = softEdgeMask(sil, fx.softEdgePt, ppt);
      const img = bc.getImageData(0, 0, W, H);
      for (let i = 0; i < m.a.length; i++) img.data[i * 4 + 3] = Math.round(img.data[i * 4 + 3] * m.a[i]);
      bc.putImageData(img, 0, 0);
    }
    const out = canvas(W, H);
    const o = ctx2d(out);
    if (s?.kind === "outer") {
      const dir = s.rotWithShape === false || s.rotWithShape === void 0 ? s.dirDeg - (it.style.rot ?? 0) : s.dirDeg;
      const m = outerShadowMask(sil, box, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: dir, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt);
      o.drawImage(maskToCanvas(m, s.color, s.alpha), 0, 0);
    }
    if (fx.glow) o.drawImage(maskToCanvas(glowMask(sil, fx.glow.radPt, ppt), fx.glow.color, fx.glow.alpha), 0, 0);
    const r = fx.reflection;
    if (r) {
      const rc = canvas(W, H), rx = ctx2d(rc);
      const a = r.dirDeg * Math.PI / 180;
      const dx = r.distPt * Math.cos(a) * ppt, dy = r.distPt * Math.sin(a) * ppt;
      rx.translate(dx, 2 * (oy + h * ppt) + dy);
      rx.scale(1, -1);
      rx.drawImage(body, 0, 0);
      rx.setTransform(1, 0, 0, 1, 0, 0);
      const img = rx.getImageData(0, 0, W, H);
      const top = oy + h * ppt + dy;
      for (let y = 0; y < H; y++) {
        const t = (y + 0.5 - top) / (h * ppt);
        const al = t < 0 ? 0 : reflectionAlpha(t, r);
        for (let x = 0; x < W; x++) img.data[(y * W + x) * 4 + 3] = Math.round(img.data[(y * W + x) * 4 + 3] * al);
      }
      if (r.blurPt > 0) {
        const ch = [0, 1, 2, 3].map((k) => {
          const m = newMask(W, H);
          for (let i = 0; i < m.a.length; i++) m.a[i] = (k === 3 ? img.data[i * 4 + 3] : img.data[i * 4 + k] * img.data[i * 4 + 3] / 255) / 255;
          return gaussianBlur(m, r.blurPt / 3 * ppt).a;
        });
        for (let i = 0; i < W * H; i++) {
          const al = ch[3][i];
          img.data[i * 4 + 3] = Math.round(al * 255);
          for (let k = 0; k < 3; k++) img.data[i * 4 + k] = al > 0 ? Math.round(ch[k][i] / al * 255) : 0;
        }
      }
      rx.putImageData(img, 0, 0);
      o.drawImage(rc, 0, 0);
    }
    o.drawImage(body, 0, 0);
    layer = { c: out, x0: bb.x0, y0: bb.y0, ppt };
    if (shapeCache.size > 32) shapeCache.clear();
    shapeCache.set(key, layer);
  }
  ctx.save();
  ctx.translate(it.x + it.w / 2, it.y + it.h / 2);
  if (it.style.rot) ctx.rotate(it.style.rot * Math.PI / 180);
  const sc = 20 / layer.ppt;
  ctx.drawImage(layer.c, layer.x0 * 20 - it.w / 2, layer.y0 * 20 - it.h / 2, layer.c.width * sc, layer.c.height * sc);
  ctx.restore();
}
function paintPicture(ctx, it, bmp) {
  const b = bmp;
  const m = ctx.getTransform();
  const ppt = Math.max(0.5, Math.min(12, Math.hypot(m.a, m.b) * 20));
  const key = JSON.stringify([it.pic, it.crop, it.flipH, it.flipV, it.w, it.h, it.rot ?? 0, Math.round(ppt * 50)]);
  let byImg = cache.get(it.image);
  if (!byImg) {
    byImg = /* @__PURE__ */ new Map();
    cache.set(it.image, byImg);
  }
  let layer = byImg.get(key);
  if (!layer) {
    if (byImg.size > 8) byImg.clear();
    layer = buildLayer(it, b, ppt);
    byImg.set(key, layer);
  }
  ctx.save();
  ctx.translate(it.x + it.w / 2, it.y + it.h / 2);
  if (it.rot) ctx.rotate(it.rot * Math.PI / 180);
  const s = 20 / layer.ppt;
  ctx.drawImage(layer.c, layer.x0 * 20 - it.w / 2, layer.y0 * 20 - it.h / 2, layer.c.width * s, layer.c.height * s);
  ctx.restore();
}

// ../docx-layout/src/canvas.ts
var HEX6 = /^[0-9A-Fa-f]{6}$/;
var fillTiles = /* @__PURE__ */ new Map();
function rgbaCanvas(rgba, w, h) {
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : typeof document !== "undefined" ? Object.assign(document.createElement("canvas"), { width: w, height: h }) : null;
  const x = c?.getContext("2d");
  if (!c || !x) return null;
  const id = x.createImageData(w, h);
  id.data.set(rgba);
  x.putImageData(id, 0, 0);
  return c;
}
function paintPageBackground(ctx, page, env, opts) {
  const show = !opts.screen || !!page.backgroundShow;
  const f = show ? page.backgroundFill : void 0;
  const solid = show && page.background && !(f && (f.type === "frame" || f.type === "tile")) ? `#${page.background}` : f && (f.type === "frame" || f.type === "tile") ? "#ffffff" : opts.paper;
  ctx.fillStyle = solid;
  ctx.fillRect(0, 0, page.widthTw, page.heightTw);
  if (!f) return;
  const tile = pageFillTileTw(f, opts.devicePxTw, opts.devicePxTw);
  if (!tile) return;
  let src = null;
  let srcW = 1, srcH = 1;
  if (f.type === "gradient" || f.type === "gradientRadial") {
    const t = gradientTilePx(f, false);
    const key = `g|${JSON.stringify([f.type, f.c1, f.c2, f.stops, f.angle, f.focus, f.focusPosition, f.gradientCenter])}`;
    src = fillTiles.get(key) ?? null;
    if (!src) {
      src = rgbaCanvas(gradientTileRgba(f, t.w, t.h), t.w, t.h);
      if (src) fillTiles.set(key, src);
    }
    srcW = t.w;
    srcH = t.h;
  } else if (f.type === "pattern") {
    const key = `p|${f.c1}|${f.c2}|${f.pattern?.join(",")}`;
    src = fillTiles.get(key) ?? null;
    if (!src) {
      src = rgbaCanvas(patternRgba(f), 8, 8);
      if (src) fillTiles.set(key, src);
    }
    srcW = 8;
    srcH = 8;
  } else if (f.image) {
    src = env.image(f.image);
    srcW = f.imagePx?.w ?? 1;
    srcH = f.imagePx?.h ?? 1;
  }
  if (!src) return;
  if (fillTiles.size > 32) fillTiles.clear();
  const pat = ctx.createPattern(src, "repeat");
  if (!pat) return;
  pat.setTransform(new DOMMatrix([tile.w / srcW, 0, 0, tile.h / srcH, 0, 0]));
  ctx.save();
  if (f.type === "pattern") ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, page.widthTw, page.heightTw);
  ctx.restore();
}
var K3 = 0.5523;
function paintItems(ctx, items, env, opts = {}) {
  const from = opts.from ?? 0;
  const to = Math.min(items.length, opts.to ?? items.length);
  const base = opts.alpha ?? 1;
  let depth = 0;
  ctx.save();
  ctx.globalAlpha = base;
  for (let i = from; i < to; i++) {
    const it = items[i];
    switch (it.t) {
      case "glyphs":
        paintGlyphs(ctx, it, env);
        break;
      case "rect": {
        if (!HEX6.test(it.fill)) break;
        let w = it.w;
        while (i + 1 < to) {
          const n = items[i + 1];
          if (n.t !== "rect" || n.fill !== it.fill || n.alpha !== it.alpha || n.y !== it.y || n.h !== it.h || Math.abs(n.x - (it.x + w)) > 0.5) break;
          w = n.x + n.w - it.x;
          i++;
        }
        ctx.globalAlpha = base * (it.alpha ?? 1);
        ctx.fillStyle = env.color(it.fill);
        ctx.fillRect(it.x, it.y, w, it.h);
        ctx.globalAlpha = base;
        break;
      }
      case "line": {
        if (!HEX6.test(it.color)) break;
        const w = it.widthPt;
        const dash = it.dash === "dotted" ? [w, w * 2] : it.dash === "dashed" ? [w * 4, w * 3] : it.dash === "dashDot" ? [w * 4, w * 2, w, w * 2] : it.dash === "dashDotDot" ? [w * 4, w * 2, w, w * 2, w, w * 2] : it.dash ? BORDER_DASHES[it.dash](w) : [];
        let { x1, y1, x2, y2 } = it;
        let lw = w * 20;
        const m = ctx.getTransform();
        if (m.b === 0 && m.c === 0) {
          const horiz = Math.abs(y1 - y2) < 0.01, vert = Math.abs(x1 - x2) < 0.01;
          const dev = lw * (horiz ? m.d : m.a);
          if ((horiz || vert) && dev < 3 && dev > 0) {
            const dw = Math.max(1, Math.round(dev));
            const snap = (v, s, o) => {
              const d = v * s + o;
              return ((dw % 2 ? Math.floor(d) + 0.5 : Math.round(d)) - o) / s;
            };
            if (horiz) {
              y1 = y2 = snap(y1, m.d, m.f);
              lw = dw / m.d;
            } else {
              x1 = x2 = snap(x1, m.a, m.e);
              lw = dw / m.a;
            }
          }
        }
        ctx.strokeStyle = env.color(it.color);
        ctx.lineWidth = lw;
        ctx.lineCap = "butt";
        ctx.setLineDash(dash.map((d) => d * 20));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case "image": {
        const bmp = env.image(it.image);
        if (!bmp) break;
        if (needsPicturePainter(it)) {
          paintPicture(ctx, it, bmp);
          break;
        }
        let x = it.x, y = it.y, w = it.w, h = it.h;
        const crop = it.crop;
        const cropped = !!crop && !!(crop.l || crop.t || crop.r || crop.b);
        ctx.save();
        if (cropped) {
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          const fw = w / Math.max(0.01, 1 - crop.l - crop.r);
          const fh = h / Math.max(0.01, 1 - crop.t - crop.b);
          x -= crop.l * fw;
          y -= crop.t * fh;
          w = fw;
          h = fh;
        }
        if (it.rot || it.flipH || it.flipV) {
          ctx.translate(x + w / 2, y + h / 2);
          if (it.rot) ctx.rotate(it.rot * Math.PI / 180);
          ctx.scale(it.flipH ? -1 : 1, it.flipV ? -1 : 1);
          ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
        } else ctx.drawImage(bmp, x, y, w, h);
        ctx.restore();
        break;
      }
      case "shape":
        paintShape(ctx, it, env, base);
        break;
      case "path": {
        const fill = it.fill && HEX6.test(it.fill) ? env.color(it.fill) : void 0;
        const stroke = it.stroke && HEX6.test(it.stroke.color) ? it.stroke : void 0;
        if (!fill && !stroke) break;
        ctx.beginPath();
        tracePath2(ctx, it.cmds);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill("nonzero");
        }
        if (stroke) strokeWith(ctx, env.color(stroke.color), stroke.widthPt, stroke.dash);
        break;
      }
      case "clip":
        if (it.op === "push") {
          ctx.save();
          depth++;
          ctx.beginPath();
          ctx.rect(it.x ?? 0, it.y ?? 0, it.w ?? 0, it.h ?? 0);
          ctx.clip();
        } else if (depth > 0) {
          ctx.restore();
          depth--;
        }
        break;
      default: {
        const x = it;
        if (x.t !== "xform") break;
        if (x.op === "push" && x.m) {
          ctx.save();
          depth++;
          ctx.transform(x.m[0], x.m[1], x.m[2], x.m[3], x.m[4], x.m[5]);
        } else if (depth > 0) {
          ctx.restore();
          depth--;
        }
      }
    }
  }
  while (depth-- > 0) ctx.restore();
  ctx.restore();
}
function paintGlyphs(ctx, it, env) {
  if (!it.glyphs.length || !HEX6.test(it.color)) return;
  const f = env.fontOf(it.face);
  const font = it.face.font;
  ctx.font = `${f.italic ? "italic " : ""}${f.weight} ${it.sizePt * 20}px ${f.family}`;
  const color2 = env.color(it.color);
  ctx.fillStyle = color2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (it.synthBold) {
    ctx.strokeStyle = color2;
    ctx.lineWidth = it.sizePt / 35 * 20;
    ctx.lineJoin = "miter";
  }
  const sx = it.scaleX ?? 1;
  const skew = it.synthItalic ? -0.21 : 0;
  const plain = sx === 1 && skew === 0;
  const gl = it.glyphs;
  const batch = plain && "fontKerning" in ctx;
  if (batch) ctx.fontKerning = "none";
  const upem = font.metrics.unitsPerEm || 1e3;
  const adv = (cp) => font.advanceWidth(font.glyphId(cp)) * it.sizePt * 20 / upem;
  for (let i = 0; i < gl.length; i++) {
    const g = gl[i];
    let cp = g.cp;
    if (cp >= 61440 && cp <= 61695 && font.glyphId(cp) === 0 && font.glyphId(cp - 61440) !== 0) cp -= 61440;
    let ch = String.fromCodePoint(cp);
    if (batch && batchable(cp)) {
      while (i + 1 < gl.length) {
        const n = gl[i + 1];
        const prev = gl[i];
        if (!batchable(n.cp) || Math.abs(n.x - (prev.x + adv(prev.cp))) > 0.25) break;
        ch += "\u200C" + String.fromCodePoint(n.cp);
        i++;
      }
    }
    if (plain) {
      ctx.fillText(ch, g.x, it.y);
      if (it.synthBold) ctx.strokeText(ch, g.x, it.y);
    } else {
      ctx.save();
      ctx.translate(g.x, it.y);
      ctx.transform(sx, 0, skew, 1, 0, 0);
      ctx.fillText(ch, 0, 0);
      if (it.synthBold) ctx.strokeText(ch, 0, 0);
      ctx.restore();
    }
  }
}
function batchable(cp) {
  return cp >= 32 && cp < 768 || cp >= 880 && cp < 1424 || cp >= 8192 && cp < 8304 && cp !== 8204 && cp !== 8205 || cp >= 8352 && cp < 8400;
}
function strokeWith(ctx, color2, widthPt, dash) {
  const w = Math.max(0.25, widthPt);
  ctx.strokeStyle = color2;
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b) || 1;
  ctx.lineWidth = Math.max(w * 20, 1 / px);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.setLineDash(dash ? [w * 3 * 20, w * 2 * 20] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}
function paintShape(ctx, it, env, base) {
  if (it.fx && it.style.geom !== "line") {
    const local = { ...it, x: 0, y: 0, style: { ...it.style, rot: 0 }, fx: void 0, shadow: void 0 };
    paintShapeEffects(ctx, it, (c, s) => {
      c.scale(s, s);
      paintShape(c, local, env, 1);
    });
    return;
  }
  const st = it.style;
  const fill = it.fill && HEX6.test(it.fill) ? env.color(it.fill) : void 0;
  const stroke = it.stroke && HEX6.test(it.stroke.color) ? it.stroke : void 0;
  if (!fill && !stroke && !it.grad && !it.pattern && !it.blip) return;
  const { x, y, w, h } = it;
  const isLine = st.geom === "line" || st.geom.startsWith("straightConnector");
  const xf = { flipH: !!st.flipH, flipV: !!st.flipV, rot: st.rot ?? 0 };
  let parts;
  if (isLine) {
    let cmds = shapePath("line", x, y, w, h, it.line, !!st.flipH, !!st.flipV);
    if (st.rot) cmds = rotatePath2(cmds, x + w / 2, y + h / 2, st.rot);
    parts = [{ cmds, fill: false, stroke: true, evenOdd: false }];
  } else if (st.geom === "custom" && st.cust) {
    parts = custPaths(st.cust, x, y, w, h, xf).map((p) => ({ cmds: p.cmds, fill: p.fill, stroke: p.stroke, evenOdd: true }));
  } else {
    parts = [{ cmds: presetPath(st.geom, x, y, w, h, { ...st.adj ? { adj: st.adj } : {}, ...xf }), fill: !OPEN_PRESETS.has(st.geom), stroke: true, evenOdd: false }];
  }
  const fillPart = (p) => {
    ctx.beginPath();
    tracePath2(ctx, p.cmds);
    ctx.fill(p.evenOdd ? "evenodd" : "nonzero");
  };
  const strokePart = (p) => {
    ctx.beginPath();
    tracePath2(ctx, p.cmds);
    strokeWith(ctx, env.color(stroke.color), stroke.widthPt, stroke.dash);
  };
  if (it.shadow && HEX6.test(it.shadow.color)) {
    ctx.save();
    ctx.translate(it.shadow.dx, it.shadow.dy);
    ctx.globalAlpha = base * (it.shadow.alpha ?? 1);
    ctx.fillStyle = env.color(it.shadow.color);
    for (const p of parts) {
      if (p.fill && (fill || it.grad || it.pattern || it.blip)) fillPart(p);
      if (p.stroke && stroke) {
        ctx.beginPath();
        tracePath2(ctx, p.cmds);
        strokeWith(ctx, env.color(it.shadow.color), stroke.widthPt, stroke.dash);
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = base * (st.fillAlpha ?? 1);
  if (it.pattern || it.blip) {
    for (const p of parts) {
      if (!p.fill) continue;
      ctx.save();
      ctx.beginPath();
      tracePath2(ctx, p.cmds);
      ctx.clip(p.evenOdd ? "evenodd" : "nonzero");
      if (it.pattern) {
        const pr = patternRaster({ ...it.pattern, fg: it.pattern.fg, bg: it.pattern.bg }, x, y, w, h, 15);
        if (pr) {
          const c = rgbaCanvasThemed(pr.data, pr.w, pr.h, env, it.pattern);
          ctx.imageSmoothingEnabled = false;
          if (c) ctx.drawImage(c, pr.x, pr.y, pr.cells.w * 15, pr.cells.h * 15);
        }
      } else if (it.blip) {
        const bmp = env.image(it.blip.image);
        if (bmp) {
          ctx.globalAlpha = base * (it.blip.alpha ?? 1);
          for (const t of blipTiles(it.blip, x, y, w, h, 1 / 635, imagePixelSize(it.blip.image.data))) ctx.drawImage(bmp, t.x, t.y, t.w, t.h);
        }
      }
      ctx.restore();
    }
  } else if (it.grad && isRectGradient(it.grad)) {
    const r = rectGradientRaster(it.grad, w / 20, h / 20, 2);
    const c = rgbaCanvasThemed(r.data, r.w, r.h, env, null);
    for (const p of parts) {
      if (!p.fill || !c) continue;
      ctx.save();
      ctx.beginPath();
      tracePath2(ctx, p.cmds);
      ctx.clip(p.evenOdd ? "evenodd" : "nonzero");
      ctx.translate(x + w / 2, y + h / 2);
      if (st.rot) ctx.rotate(st.rot * Math.PI / 180);
      ctx.scale(st.flipH ? -1 : 1, st.flipV ? -1 : 1);
      ctx.drawImage(c, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  } else if (it.grad) {
    const pb = pathBounds(parts.flatMap((p) => p.cmds));
    const g = gradientGeometry2(it.grad, { x, y, w, h, rot: st.rot ?? 0 }, pb);
    const smp = gradientSamples(it.grad.stops, 64);
    const cg = g.kind === "axial" ? ctx.createLinearGradient(g.x0, g.y0, g.x1, g.y1) : ctx.createRadialGradient(g.x0, g.y0, 0, g.x0, g.y0, g.r);
    for (let i = 0; i < 64; i++) cg.addColorStop(i / 63, env.color(hex2(smp[i * 3]) + hex2(smp[i * 3 + 1]) + hex2(smp[i * 3 + 2])));
    ctx.fillStyle = cg;
    for (const p of parts) if (p.fill) fillPart(p);
  } else if (fill) {
    ctx.fillStyle = fill;
    for (const p of parts) if (p.fill) fillPart(p);
  }
  if (stroke) {
    ctx.globalAlpha = base * (st.line?.alpha ?? 1);
    for (const p of parts) if (p.stroke) strokePart(p);
  }
  ctx.globalAlpha = base;
}
var hex2 = (n) => n.toString(16).padStart(2, "0").toUpperCase();
function rgbaCanvasThemed(data, w, h, env, p) {
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const x = c.getContext("2d");
  if (!x) return null;
  const img = x.createImageData(w, h);
  img.data.set(data);
  const fg = p ? env.color(p.fg) : "", bg = p ? env.color(p.bg) : "";
  if (p && (fg !== `#${p.fg}` || bg !== `#${p.bg}`)) {
    const parse = (s) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(s);
      return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
    };
    const f = parse(fg), b = parse(bg), f0 = parse(p.fg);
    if (f && b) for (let i = 0; i < img.data.length; i += 4) {
      const on = img.data[i] === f0[0] && img.data[i + 1] === f0[1] && img.data[i + 2] === f0[2];
      const c2 = on ? f : b;
      img.data[i] = c2[0];
      img.data[i + 1] = c2[1];
      img.data[i + 2] = c2[2];
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}
function tracePath2(ctx, cmds) {
  for (const c of cmds) {
    if (c.op === "M") ctx.moveTo(c.x, c.y);
    else if (c.op === "L") ctx.lineTo(c.x, c.y);
    else if (c.op === "C") ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else ctx.closePath();
  }
}
function rotatePath2(cmds, cx, cy, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const tr = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  return cmds.map((m) => {
    if (m.op === "M" || m.op === "L") {
      const [x, y] = tr(m.x, m.y);
      return { op: m.op, x, y };
    }
    if (m.op === "C") {
      const [x1, y1] = tr(m.x1, m.y1);
      const [x2, y2] = tr(m.x2, m.y2);
      const [x, y] = tr(m.x, m.y);
      return { op: "C", x1, y1, x2, y2, x, y };
    }
    return m;
  });
}
function shapePath(geom, x, y, w, h, line, flipH = false, flipV = false) {
  if (geom === "line" || geom.startsWith("straightConnector")) {
    if (line) return [{ op: "M", x: x + line.x1, y: y + line.y1 }, { op: "L", x: x + line.x2, y: y + line.y2 }];
    const [x1, x2] = flipH ? [x + w, x] : [x, x + w];
    const [y1, y2] = flipV ? [y + h, y] : [y, y + h];
    return [{ op: "M", x: x1, y: y1 }, { op: "L", x: x2, y: y2 }];
  }
  if (geom === "ellipse") {
    const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    return [
      { op: "M", x: cx + rx, y: cy },
      { op: "C", x1: cx + rx, y1: cy + ry * K3, x2: cx + rx * K3, y2: cy + ry, x: cx, y: cy + ry },
      { op: "C", x1: cx - rx * K3, y1: cy + ry, x2: cx - rx, y2: cy + ry * K3, x: cx - rx, y: cy },
      { op: "C", x1: cx - rx, y1: cy - ry * K3, x2: cx - rx * K3, y2: cy - ry, x: cx, y: cy - ry },
      { op: "C", x1: cx + rx * K3, y1: cy - ry, x2: cx + rx, y2: cy - ry * K3, x: cx + rx, y: cy },
      { op: "Z" }
    ];
  }
  if (geom === "roundRect") {
    const r = Math.min(w, h) * 0.1667;
    return [
      { op: "M", x: x + r, y },
      { op: "L", x: x + w - r, y },
      { op: "C", x1: x + w - r + r * K3, y1: y, x2: x + w, y2: y + r - r * K3, x: x + w, y: y + r },
      { op: "L", x: x + w, y: y + h - r },
      { op: "C", x1: x + w, y1: y + h - r + r * K3, x2: x + w - r + r * K3, y2: y + h, x: x + w - r, y: y + h },
      { op: "L", x: x + r, y: y + h },
      { op: "C", x1: x + r - r * K3, y1: y + h, x2: x, y2: y + h - r + r * K3, x, y: y + h - r },
      { op: "L", x, y: y + r },
      { op: "C", x1: x, y1: y + r - r * K3, x2: x + r - r * K3, y2: y, x: x + r, y },
      { op: "Z" }
    ];
  }
  return [{ op: "M", x, y }, { op: "L", x: x + w, y }, { op: "L", x: x + w, y: y + h }, { op: "L", x, y: y + h }, { op: "Z" }];
}

// ../docx-layout/src/refs.ts
function cellAtGrid(t, r, c) {
  const row = t.rows[r];
  if (!row) return null;
  let col = row.trPr?.gridBefore ?? 0;
  for (const cell of row.cells) {
    if (col === c) return cell;
    col += Math.max(1, cell.tcPr?.gridSpan ?? cell.gridSpan ?? 1);
  }
  return null;
}
function cellBlocks(cell) {
  return cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
}
function paragraphAtPath(blocks, path) {
  let list = blocks;
  for (let i = 0; i < path.length; i += 3) {
    const b = /^b(\d+)$/.exec(path[i] ?? "");
    const blk = b ? list[+b[1]] : void 0;
    if (!blk) return null;
    if (i + 1 >= path.length) return blk.type === "paragraph" ? blk.paragraph : null;
    const r = /^r(\d+)$/.exec(path[i + 1] ?? ""), c = /^c(\d+)$/.exec(path[i + 2] ?? "");
    if (blk.type !== "table" || !r || !c) return null;
    const cell = cellAtGrid(blk, +r[1], +c[1]);
    if (!cell) return null;
    list = cellBlocks(cell);
  }
  return null;
}

// ../docx-layout/src/outline.ts
var NO_FONTS = { face: () => null };
function headingText(p, caps) {
  let s = "";
  for (const r of p.runs) {
    if (r.props.del) continue;
    s += caps?.(r) ? r.text.toUpperCase() : r.text;
  }
  return s.replace(/[\u00ad\ufffc]/g, "").replace(/[\t\n\r\u000b\u000c]/g, " ").replace(/\s+/g, " ").trim();
}
var BUILTIN_HEADING = /^heading ([1-9])$/i;
function outlineLevelOf(ctx, p, ppr = resolvePPr(ctx, p, {}).ppr) {
  const chain = ctx.resolver.paraChain(ppr.pStyle ?? directStyle(p));
  for (let i = chain.length - 1; i >= 0; i--) {
    const s = chain[i];
    const m = BUILTIN_HEADING.exec(s.name ?? "");
    if (m) return +m[1];
    if (s.pPr?.outlineLvl !== void 0) break;
  }
  const lvl = ppr.outlineLvl;
  return lvl !== void 0 && lvl >= 0 && lvl <= 8 ? lvl + 1 : 0;
}
var directStyle = (p) => p.props.styleId;
function documentOutline(full, opts = {}) {
  const ctx = new DocContext(full.formatting ?? emptyFormatting(), NO_FONTS, { lang: opts.lang });
  const dd = ctx.resolver.docDefaults;
  const out = [];
  const walk = (blocks, top) => {
    blocks.forEach((b, i) => {
      if (b.type === "table") {
        for (const row of b.rows) for (const cell of row.cells) walk(cellBlocks(cell), false);
        return;
      }
      const p = b.paragraph;
      const { ppr, styleRPr } = resolvePPr(ctx, p, {});
      const n = ppr.numPr;
      const num = n?.numId ? ctx.numbering.next(n.numId, n.ilvl ?? 0)?.text ?? "" : "";
      if (!top) return;
      const level = outlineLevelOf(ctx, p, ppr);
      if (!level) return;
      const caps = (r) => {
        const d = directRPr(r);
        return !!cascadeRPr(dd.rPr, [styleRPr, ctx.resolver.charStyle(d.rStyle)], d).caps;
      };
      const text = headingText(p, caps);
      if (!text) return;
      out.push({ block: i, level, text: num ? `${num} ${text}` : text, number: num });
    });
  };
  walk(full.blocks, true);
  return out;
}
function numberedItems(full, opts = {}) {
  const ctx = new DocContext(full.formatting ?? emptyFormatting(), NO_FONTS, { lang: opts.lang });
  const out = [];
  const walk = (blocks, top) => {
    blocks.forEach((b, i) => {
      if (b.type === "table") {
        for (const row of b.rows) for (const cell of row.cells) walk(cellBlocks(cell), false);
        return;
      }
      const n = resolvePPr(ctx, b.paragraph, {}).ppr.numPr;
      const m = n?.numId ? ctx.numbering.next(n.numId, n.ilvl ?? 0) : null;
      if (!top || !m || m.level.numFmt === "bullet" || !m.text) return;
      const text = headingText(b.paragraph);
      if (text) out.push({ block: i, ilvl: m.ilvl, number: m.text, text });
    });
  };
  walk(full.blocks, true);
  return out;
}
function outlineParagraphs(full, opts = {}) {
  const ctx = new DocContext(full.formatting ?? emptyFormatting(), NO_FONTS, { lang: opts.lang });
  const out = [];
  const walk = (blocks, top) => {
    blocks.forEach((b, i) => {
      if (b.type === "table") {
        for (const row of b.rows) for (const cell of row.cells) walk(cellBlocks(cell), top ?? i);
        return;
      }
      const p = b.paragraph;
      const { ppr } = resolvePPr(ctx, p, {});
      const n = ppr.numPr;
      const num = n?.numId ? ctx.numbering.next(n.numId, n.ilvl ?? 0)?.text ?? "" : "";
      out.push({ paragraph: p, block: top ?? i, level: outlineLevelOf(ctx, p, ppr), number: num });
    });
  };
  walk(full.blocks, null);
  return out;
}

// ../docx-layout/src/paraformat.ts
var NO_FONTS2 = { face: () => null };
var CTX = /* @__PURE__ */ new WeakMap();
var ctxOf = (fmt2) => {
  let c = CTX.get(fmt2);
  if (!c) CTX.set(fmt2, c = new DocContext(fmt2, NO_FONTS2));
  return c;
};
function inheritedPPr(fmt2, para2) {
  const d = directPPr(para2);
  const base = {};
  if (d.pStyle !== void 0) base.pStyle = d.pStyle;
  if (d.numPr) base.numPr = d.numPr;
  return resolvePPr(ctxOf(fmt2), { runs: [], ppr: base, props: paraPropsFromPPr(base) }, {}).ppr;
}
function effectivePPr(fmt2, para2) {
  return resolvePPr(ctxOf(fmt2), para2, {}).ppr;
}

export {
  presetOutline,
  adjustSaturation,
  adjustTemperature,
  adjustBrightnessContrast,
  adjustSharpen,
  wrapContour,
  PRESET_PATTERNS,
  patternRows,
  SHAPE_STYLE_PRESETS,
  GRADIENT_VARIANTS,
  gradientGeometry,
  GRADIENT_PRESETS,
  pageFillFrom,
  themeTintShade,
  effectExtentOf,
  Z_FIRST,
  zFor,
  fillFitCrop,
  aspectCrop,
  ASPECT_RATIOS,
  CROP_SHAPES,
  SHADOW_PRESETS,
  REFLECTION_PRESETS,
  SOFT_EDGE_PRESETS,
  GLOW_SIZES,
  glowPreset,
  BEVEL_PRESETS,
  bevel3D,
  ROTATION_PRESETS,
  SATURATION_PRESETS,
  TEMPERATURE_PRESETS,
  SHARPEN_PRESETS,
  BRIGHT_CONTRAST_STEPS,
  TRANSPARENCY_PRESETS,
  RECOLOR_PRESETS,
  LINE_WEIGHTS_PT,
  LINE_DASHES,
  POSITION_PRESETS,
  isShapeFill,
  shapeStyleIndex,
  TEXTBOX_TEMPLATES,
  textboxTemplateSpec,
  gradientVariations,
  TOC_TEMPLATES,
  TOC_AUTO_INSTR,
  manualPlaceholder,
  MANUAL_LEVELS,
  isTocSdt,
  tocSdtPr,
  TOC_FORMATS,
  tocFormatStyle,
  parseTcInstr,
  tcInstr,
  tcInToc,
  tocOptionsFrom,
  dialogOptionsFrom,
  addTextPlan,
  SfntFont,
  deviceEmPt,
  lineHeightPt,
  TWIPS_PER_PT,
  breakRich,
  hyphenationPatternId,
  loadHyphenation,
  hyphenatorFor,
  hexColor,
  PdfDocument,
  mergePPr,
  StyleResolver,
  cascadeRPr,
  fontOfSlot,
  resolveColor,
  resolveDrawingColor,
  withEmbeddedFonts,
  formatNumber,
  authorColor,
  RevisionDisplay,
  emptyFormatting,
  documentHyphenationLanguages,
  applyBlipFx,
  formatWordDate,
  gradientTileRgba,
  patternRgba,
  imagePixelInfo,
  layoutDocument,
  renderPdf,
  paintPicture,
  paintPageBackground,
  paintItems,
  cellAtGrid,
  cellBlocks,
  paragraphAtPath,
  documentOutline,
  numberedItems,
  outlineParagraphs,
  inheritedPPr,
  effectivePPr
};
