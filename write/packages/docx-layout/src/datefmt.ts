// Campos DATE/TIME do Word: imagem de data/hora (\@ "…") e formatos de texto
// (\* Upper/Lower/FirstCap/Caps). O Word recalcula DATE e TIME ao exportar/
// imprimir — o valor é o "agora" desse momento (LayoutOptions.now).

const PT = {
  months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  monthsShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  days: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
  daysShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  date: 'dd/MM/yyyy', time: 'HH:mm',
};
const EN = {
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  date: 'M/d/yyyy', time: 'h:mm am/pm',
};

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** Formata `d` com a imagem de data/hora do Word. */
export function formatWordDate(d: Date, picture: string, lang = 'pt-BR'): string {
  const L = lang.toLowerCase().startsWith('en') ? EN : PT;
  let out = '';
  let i = 0;
  const run = (ch: string) => { let n = 0; while (picture[i + n] === ch) n++; return n; };
  while (i < picture.length) {
    const c = picture[i]!;
    if (c === "'") {
      const j = picture.indexOf("'", i + 1);
      out += j < 0 ? picture.slice(i + 1) : picture.slice(i + 1, j);
      i = j < 0 ? picture.length : j + 1;
      continue;
    }
    const lower = picture.slice(i, i + 5).toLowerCase();
    if (lower === 'am/pm') {
      const pm = d.getHours() >= 12;
      const s = pm ? 'pm' : 'am';
      out += picture[i] === 'A' ? s.toUpperCase() : s;
      i += 5;
      continue;
    }
    if (c === 'd' || c === 'D') {
      const n = run(c);
      out += n >= 4 ? L.days[d.getDay()] : n === 3 ? L.daysShort[d.getDay()] : n === 2 ? pad(d.getDate(), 2) : String(d.getDate());
      i += n; continue;
    }
    if (c === 'M') {
      const n = run(c);
      out += n >= 4 ? L.months[d.getMonth()] : n === 3 ? L.monthsShort[d.getMonth()] : n === 2 ? pad(d.getMonth() + 1, 2) : String(d.getMonth() + 1);
      i += n; continue;
    }
    if (c === 'y' || c === 'Y') {
      const n = run(c);
      out += n >= 3 ? String(d.getFullYear()) : pad(d.getFullYear() % 100, 2);
      i += n; continue;
    }
    if (c === 'H') {
      const n = run(c);
      out += n >= 2 ? pad(d.getHours(), 2) : String(d.getHours());
      i += n; continue;
    }
    if (c === 'h') {
      const n = run(c);
      const h = d.getHours() % 12 || 12;
      out += n >= 2 ? pad(h, 2) : String(h);
      i += n; continue;
    }
    if (c === 'm') {
      const n = run(c);
      out += n >= 2 ? pad(d.getMinutes(), 2) : String(d.getMinutes());
      i += n; continue;
    }
    if (c === 's' || c === 'S') {
      const n = run(c);
      out += n >= 2 ? pad(d.getSeconds(), 2) : String(d.getSeconds());
      i += n; continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Valor de um campo DATE/TIME (instrução completa) no instante `now`. */
export function dateFieldValue(instr: string, now: Date, lang = 'pt-BR'): string {
  const name = instr.trim().split(/\s+/)[0]!.toUpperCase();
  const L = lang.toLowerCase().startsWith('en') ? EN : PT;
  const m = /\\@\s*(?:"([^"]*)"|(\S+))/.exec(instr);
  const picture = m ? (m[1] ?? m[2] ?? '') : name === 'TIME' ? L.time : L.date;
  let v = formatWordDate(now, picture, lang);
  const fmt = /\\\*\s*(\w+)/g;
  let f: RegExpExecArray | null;
  while ((f = fmt.exec(instr))) {
    const k = f[1]!.toLowerCase();
    if (k === 'upper') v = v.toUpperCase();
    else if (k === 'lower') v = v.toLowerCase();
    else if (k === 'firstcap') v = v.charAt(0).toUpperCase() + v.slice(1);
    else if (k === 'caps') v = v.replace(/(^|\s)(\S)/g, (_, a: string, b: string) => a + b.toUpperCase());
  }
  return v;
}
