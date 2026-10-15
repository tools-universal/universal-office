// Casos de SINTAXE para o oráculo do idioma (xl-syntax.ps1). Só a ENTRADA é
// escrita aqui; a saída (Formula2, Formula2Local, R1C1…) vem do Excel e vira
// test/oracle/locale-<idioma>.syntax.json (generate.mjs). Entradas locais
// (f2Local/r1c1Local) são do Excel pt-BR desta máquina.

export const setup = {
  sheets: ['S', 'Dados', 'Dados2', 'Outra Aba', "Plan'x"],
  cells: { A1: 1, A2: 2, A3: 3, B1: 4, B2: 5, B3: 6, C1: 'x' },
  // Names.Add do COM lê a fórmula no idioma local (medido) — sem decimal aqui
  names: [{ name: 'Taxa', ref: '=S!$A$1' }],
  tables: [
    {
      range: 'H1:K4', name: 'Vendas', totals: true,
      values: [['Col A', 'B', 'C[1]', 'Calc'], [1, 2, 3, null], [4, 5, 6, null], [7, 8, 9, null]],
    },
    // uma coluna por caso: a coluna calculada regrava a coluna inteira, e a forma
    // de arquivo de cada caso precisa sobreviver até o salvamento
    {
      range: 'P1:Y4', name: 'Itens',
      values: [['Qtd', 'Valor', 'Total Geral', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
        [1, 2, 3, null, null, null, null, null, null, null], [4, 5, 6, null, null, null, null, null, null, null],
        [7, 8, 9, null, null, null, null, null, null, null]],
    },
  ],
};

/** Tabela que contém a célula (a tela omite o nome da própria tabela em [@Col]). */
export function tableAt(at) {
  const m = /^([A-Z]+)([0-9]+)$/.exec(at ?? '');
  if (!m) return undefined;
  const col = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  for (const t of setup.tables) {
    const [a, b] = t.range.split(':').map((x) => /^([A-Z]+)([0-9]+)$/.exec(x));
    if (+m[2] > +a[2] && +m[2] <= +b[2] && col(m[1]) >= col(a[1]) && col(m[1]) <= col(b[1])) return t.name;
  }
  return undefined;
}

// [id, set, texto, célula?]
const raw = [
  // números
  ['num-dec', 'f2', '=1.5'], ['num-neg', 'f2', '=-0.25'], ['num-exp', 'f2', '=1E+30'], ['num-exp-neg', 'f2', '=1.5E-10'],
  ['num-leading-dot', 'f2', '=0.5+.5'], ['num-big', 'f2', '=1234567.89'], ['num-pct', 'f2', '=50%'], ['num-pct-dec', 'f2', '=1.5%'],
  ['num-pow', 'f2', '=2^0.5'], ['num-int-big', 'f2', '=123456789012345678'], ['num-exp15', 'f2', '=1.23E+15'], ['num-in-fn', 'f2', '=ROUND(2.675,2)'],
  // textos
  ['str-seps', 'f2', '="a,b;c"'], ['str-num', 'f2', '="1.5"'], ['str-quote', 'f2', '="He said ""hi"""'], ['str-err', 'f2', '="#N/A"'],
  ['str-bool', 'f2', '="TRUE"'], ['str-fn', 'f2', '="SUM(1,2)"'], ['str-accent', 'f2', '="ação"'], ['str-concat-num', 'f2', '=""&1.5'],
  ['str-braces', 'f2', '="{1,2}"'], ['str-apos', 'f2', '="\'x\'"'],
  // booleanos
  ['bool-true', 'f2', '=TRUE'], ['bool-false', 'f2', '=FALSE'], ['bool-fn', 'f2', '=TRUE()'], ['bool-not', 'f2', '=NOT(FALSE)'],
  ['bool-if', 'f2', '=IF(TRUE,1,0)'], ['bool-and', 'f2', '=AND(TRUE,FALSE,1)'], ['bool-lower', 'f2', '=true'], ['bool-sum', 'f2', '=TRUE+FALSE'],
  ['bool-false-fn', 'f2', '=FALSE()'],
  // erros
  ['err-na', 'f2', '=#N/A'], ['err-div0', 'f2', '=#DIV/0!'], ['err-value', 'f2', '=#VALUE!'], ['err-ref', 'f2', '=#REF!'],
  ['err-name', 'f2', '=#NAME?'], ['err-num', 'f2', '=#NUM!'], ['err-null', 'f2', '=#NULL!'], ['err-getting', 'f2', '=#GETTING_DATA'],
  ['err-iferror', 'f2', '=IFERROR(#N/A,1)'], ['err-isna', 'f2', '=ISNA(#N/A)'], ['err-nested', 'f2', '=IF(ISERROR(1/0),#N/A,#VALUE!)'],
  ['err-lower', 'f2', '=#n/a'], ['err-type', 'f2', '=ERROR.TYPE(#REF!)'], ['err-sheet-ref', 'f2', '=SUM(#REF!,1)'],
  // constantes de matriz
  ['arr-2x2', 'f2', '={1,2;3,4}'], ['arr-mixed', 'f2', '={1.5,-2.5;"a",TRUE}'], ['arr-err', 'f2', '={#N/A,FALSE}'],
  ['arr-sum', 'f2', '=SUM({1,2,3})'], ['arr-col', 'f2', '={1;2;3}'], ['arr-index', 'f2', '=INDEX({1,2;3,4},2,1)'],
  ['arr-str-seps', 'f2', '={"a,b","c;d"}'], ['arr-exp', 'f2', '={1E+30,0.5}'], ['arr-two', 'f2', '=SUM({1,2},{3;4})'],
  ['arr-neg', 'f2', '={-1,2;-3,"x"}'],
  // referências
  ['ref-a1', 'f2', '=A1'], ['ref-abs', 'f2', '=$A$1'], ['ref-mixed', 'f2', '=SUM(A$1:$B2)'], ['ref-col', 'f2', '=SUM(A:A)'],
  ['ref-row', 'f2', '=SUM(1:1)'], ['ref-cols-abs', 'f2', '=SUM($A:$C)'], ['ref-sheet', 'f2', '=Dados!A1'], ['ref-sheet-space', 'f2', "='Outra Aba'!A1"],
  ['ref-sheet-apos', 'f2', "='Plan''x'!A1"], ['ref-3d', 'f2', '=SUM(Dados:Dados2!A1)'], ['ref-spill', 'f2', '=A1#'], ['ref-at', 'f2', '=@A1:A3'],
  ['ref-union', 'f2', '=SUM((A1,B1))'], ['ref-isect', 'f2', '=SUM(A1:A3 A2:B2)'], ['ref-isect2', 'f2', '=SUM(A1:B2 B1:C3)'], ['ref-name', 'f2', '=Taxa*2'],
  ['ref-name-arg', 'f2', '=SUM(A1:A3,Taxa)'], ['ref-sheets-mix', 'f2', "=SUM(Dados!A1:B2,'Outra Aba'!C3)"], ['ref-trim-trailing', 'f2', '=SUM(A1:.A3)'],
  ['ref-trim-leading', 'f2', '=SUM(A1.:A3)'], ['ref-trim-all', 'f2', '=SUM(A1.:.A3)'], ['ref-sheet-col', 'f2', '=SUM(Dados!$A:$A)'], ['ref-sheet-row', 'f2', '=ROW(Dados!3:3)'],
  ['ref-last', 'f2', '=XFD1048576'], ['ref-space-arg', 'f2', '=SUM(A1, B1)'], ['ref-space-op', 'f2', '=A1 + B1'], ['ref-neg', 'f2', '=-A1'],
  ['ref-pct', 'f2', '=A1%'], ['ref-fn-like', 'f2', '=LOG10+1'], ['ref-eta-like', 'f2', '=SUM(T1,N1)'],
  // funções
  ['fn-nested', 'f2', '=IF(A1>0,SUM(A1:A3),AVERAGE(B1:B3))'], ['fn-vlookup', 'f2', '=VLOOKUP(A1,Dados!A:B,2,FALSE)'],
  ['fn-xlookup', 'f2', '=XLOOKUP(1,A1:A3,B1:B3,"none")'], ['fn-let', 'f2', '=LET(x,1.5,y,2,x*y)'], ['fn-lambda', 'f2', '=LAMBDA(a,b,a+b)(1,2)'],
  ['fn-map', 'f2', '=MAP({1,2},LAMBDA(v,v*2))'], ['fn-text', 'f2', '=TEXT(A1,"#,##0.00")'], ['fn-concatenate', 'f2', '=CONCATENATE("a",",","b")'],
  ['fn-sumifs', 'f2', '=SUMIFS(A1:A3,B1:B3,">1.5")'], ['fn-sequence', 'f2', '=SEQUENCE(2,2)'], ['fn-filter', 'f2', '=FILTER(A1:A3,A1:A3>1,"")'],
  ['fn-sort', 'f2', '=SORT({3;1;2})'], ['fn-norm', 'f2', '=NORM.S.DIST(1,TRUE)'], ['fn-stdev', 'f2', '=STDEV.S(1,2,3)'], ['fn-ceiling', 'f2', '=CEILING.MATH(1.5)'],
  ['fn-textjoin', 'f2', '=TEXTJOIN(",",TRUE,A1:A3)'], ['fn-ifs', 'f2', '=IFS(A1>1,"a",TRUE,"b")'], ['fn-indirect', 'f2', '=INDIRECT("A1")'],
  ['fn-offset', 'f2', '=SUM(OFFSET(A1,1,1))'], ['fn-row', 'f2', '=ROW()'], ['fn-column', 'f2', '=COLUMN(A1)'], ['fn-ets', 'f2', '=FORECAST.ETS(1,A1:A3,B1:B3)'],
  ['fn-regex', 'f2', '=REGEXTEST("a","a")'], ['fn-eta', 'f2', '=GROUPBY(A1:A3,B1:B3,SUM)'], ['fn-eta-byrow', 'f2', '=BYROW(A1:B3,MAX)'],
  ['fn-eta-alone', 'f2', '=SUM'], ['fn-map-let', 'f2', '=MAP(A1:A3,LAMBDA(x,LET(y,x*2,y)))'], ['fn-div', 'f2', '=SUM(A1:A3)/COUNT(A1:A3)'],
  ['fn-prefix', 'f2', '=_xlfn.XLOOKUP(1,A1:A3,B1:B3)'], ['fn-prefix-ws', 'f2', '=_xlfn._xlws.SORT(A1:A3)'], ['fn-unknown', 'f2', '=FOO(1,2)'],
  ['fn-unknown-prefix', 'f2', '=_xlfn.FOO(1)'], ['fn-choose', 'f2', '=CHOOSE(2,"a","b")'], ['fn-t-n', 'f2', '=T(A1)+N(A1)'], ['fn-log10', 'f2', '=LOG10(100)'],
  ['fn-atan2', 'f2', '=ATAN2(1,1)'], ['fn-dec2bin', 'f2', '=DEC2BIN(5)'], ['fn-tdist', 'f2', '=T.DIST.2T(1,2)'], ['fn-lower', 'f2', '=sum(a1:a3)'],
  ['fn-single', 'f2', '=SINGLE(A1:A3)'], ['fn-single-expr', 'f2', '=SINGLE(A1:A3+1)'], ['fn-single-fn', 'f2', '=SINGLE(INDEX(A1:A3,1))'],
  ['fn-isomitted', 'f2', '=LAMBDA(a,[b],IF(ISOMITTED(b),a,b))(1)'],
  // referências estruturadas
  ['tbl-col', 'f2', '=SUM(Vendas[B])'], ['tbl-all-col', 'f2', '=SUM(Vendas[[#All],[B]])'], ['tbl-data-range', 'f2', '=SUM(Vendas[[#Data],[Col A]:[B]])'],
  ['tbl-headers', 'f2', '=ROWS(Vendas[#Headers])'], ['tbl-totals', 'f2', '=SUM(Vendas[#Totals])'], ['tbl-all', 'f2', '=COUNTA(Vendas[#All])'],
  ['tbl-hdr-data', 'f2', '=SUM(Vendas[[#Headers],[#Data],[B]])'], ['tbl-escape', 'f2', "=SUM(Vendas[C'[1']])"], ['tbl-empty', 'f2', '=SUM(Vendas[])'],
  ['tbl-name', 'f2', '=SUM(Vendas)'], ['tbl-data', 'f2', '=ROWS(Vendas[#Data])'], ['tbl-data-totals', 'f2', '=SUM(Vendas[[#Data],[#Totals],[B]])'],
  ['tbl-totals-col', 'f2', '=Vendas[[#Totals],[B]]'], ['tbl-range-escape', 'f2', "=SUM(Vendas[[Col A]:[C'[1']]])"],
  ['tbl-this-row', 'f2', '=Vendas[@B]', 'M2'], ['tbl-this-row-kw', 'f2', '=Vendas[[#This Row],[Col A]]', 'M3'], ['tbl-row-all', 'f2', '=SUM(Vendas[@])', 'M4'],
  ['tbl-in-at', 'f2', '=[@B]*2', 'K2'], ['tbl-in-mixed', 'f2', '=Vendas[@[Col A]]+[@B]', 'K3'], ['tbl-in-escape', 'f2', "=[@[C'[1']]]", 'K4'],
  // dentro da tabela Itens (P1:Y4), uma coluna por caso: quando a tela omite o nome da tabela
  ['tbl2-single', 'f2', '=[@Qtd]*2', 'S2'], ['tbl2-single-named', 'f2', '=Itens[@Qtd]*2', 'T2'],
  ['tbl2-range', 'f2', '=SUM(Itens[@[Qtd]:[Valor]])', 'U2'], ['tbl2-range-noname', 'f2', '=SUM([@[Qtd]:[Valor]])', 'V2'],
  ['tbl2-space', 'f2', '=[@[Total Geral]]+1', 'W2'], ['tbl2-row', 'f2', '=COUNT(Itens[@])', 'X2'],
  ['tbl2-kw', 'f2', '=Itens[[#This Row],[Valor]]', 'Y2'],
  // entradas no idioma (pt-BR)
  ['loc-sum', 'f2Local', '=SOMA(1;2)'], ['loc-sum-lower', 'f2Local', '=soma(1;2)'], ['loc-if', 'f2Local', '=SE(VERDADEIRO;1;0)'],
  ['loc-bool-lower', 'f2Local', '=verdadeiro'], ['loc-err-lower', 'f2Local', '=#n/d'], ['loc-arr', 'f2Local', '={1\\2;3\\4}'],
  ['loc-english', 'f2Local', '=SUM(1;2)'], ['loc-prefix-local', 'f2Local', '=_xlfn.PROCX(1;A1:A3;B1:B3)'], ['loc-english-bool', 'f2Local', '=TRUE'],
  ['loc-vlookup', 'f2Local', '=PROCV(A1;Dados!A:B;2;FALSO)'], ['loc-tbl-all', 'f2Local', '=SOMA(Vendas[[#Tudo];[B]])'],
  ['loc-tbl-data', 'f2Local', '=SOMA(Vendas[[#Dados];[B]])'], ['loc-tbl-this-row', 'f2Local', '=Vendas[[#Esta Linha];[B]]', 'N2'],
  ['loc-tbl-this-row-lc', 'f2Local', '=Vendas[[#Esta linha];[B]]', 'N3'], ['loc-dec', 'f2Local', '=1,5+0,5'], ['loc-str', 'f2Local', '="a;b"'],
  ['loc-arr-dec', 'f2Local', '={1,5\\2,5}'], ['loc-sum-args', 'f2Local', '=SOMA(A1:A3;B1)'], ['loc-union', 'f2Local', '=SOMA((A1;B1))'],
  ['loc-index', 'f2Local', '=ÍNDICE({1\\2;3\\4};2;1)'], ['loc-index-lower', 'f2Local', '=índice({1\\2;3\\4};2;1)'],
  ['loc-tbl-headers', 'f2Local', '=LINS(Vendas[#Cabeçalhos])'], ['loc-tbl-totals', 'f2Local', '=SOMA(Vendas[#Totais])'],
  ['loc-tbl-all-only', 'f2Local', '=CONT.VALORES(Vendas[#Tudo])'], ['loc-eta', 'f2Local', '=AGRUPARPOR(A1:A3;B1:B3;SOMA)'],
  ['loc-err-name', 'f2Local', '=#NOME?'], ['loc-err-null', 'f2Local', '=#nulo!'], ['loc-err-getting', 'f2Local', '=#OBTENDO_DADOS'],
  ['loc-isect', 'f2Local', '=SOMA(A1:A3 A2:B2)'], ['loc-english-prefixed', 'f2Local', '=XLOOKUP(1;A1:A3;B1:B3)'], ['loc-false-fn', 'f2Local', '=FALSO()'],
  ['loc-english-xlfn', 'f2Local', '=_xlfn.XLOOKUP(1;A1:A3;B1:B3)'], ['loc-unknown', 'f2Local', '=MINHAFUNC(1;2)'], ['loc-r1c1-in-a1', 'f2Local', '=ABS(L1C1)'],
  // R1C1 canônico
  ['r1c1-abs', 'r1c1', '=R1C1'], ['r1c1-rel-col', 'r1c1', '=RC[-1]'], ['r1c1-rel-row', 'r1c1', '=R[-1]C'], ['r1c1-sum', 'r1c1', '=SUM(R[-3]C:R[-1]C)'],
  ['r1c1-col', 'r1c1', '=SUM(C[1])'], ['r1c1-row', 'r1c1', '=SUM(R2)'], ['r1c1-rows', 'r1c1', '=SUM(R[1]:R[2])'], ['r1c1-range', 'r1c1', '=SUM(R1C1:R2C2)'],
  ['r1c1-sheet', 'r1c1', '=Dados!R1C1'], ['r1c1-cols', 'r1c1', '=SUM(C1:C3)'], ['r1c1-self-row', 'r1c1', '=SUM(R)'], ['r1c1-self-col', 'r1c1', '=SUM(C)'],
  ['r1c1-log10', 'r1c1', '=LOG10(R1C1)'], ['r1c1-ln', 'r1c1', '=LN(RC[-1])'], ['r1c1-tbl', 'r1c1', '=SUM(Vendas[B])'], ['r1c1-arr', 'r1c1', '=SUM({1.5,2;3,4})'],
  // R1C1 no idioma
  ['r1c1l-abs', 'r1c1Local', '=L1C1'], ['r1c1l-rel', 'r1c1Local', '=LC[-1]'], ['r1c1l-sum', 'r1c1Local', '=SOMA(L[-3]C:L[-1]C)'], ['r1c1l-lower', 'r1c1Local', '=l1c1'],
  ['r1c1l-col', 'r1c1Local', '=SOMA(C[1])'], ['r1c1l-row', 'r1c1Local', '=SOMA(L2)'], ['r1c1l-ln', 'r1c1Local', '=LN(LC[-1])'], ['r1c1l-self-row', 'r1c1Local', '=SOMA(L)'],
  ['r1c1l-rel-both', 'r1c1Local', '=L[1]C[1]*2'],
];

// valores (ValueLocale): conversões e TEXT no idioma do Excel
const values = [
  ['val-true', '=""&TRUE'], ['val-false', '=""&FALSE'], ['val-dec', '=""&1234.5'], ['val-small', '=""&-0.001'], ['val-big', '=""&1E+20'],
  ['val-am-pm', '=TEXT(0.75,"h AM/PM")'], ['val-a-p', '=TEXT(0.25,"h:mm A/P")'], ['val-general', '=TEXT(1234.5,"Geral")'], ['val-general-en', '=TEXT(1234.5,"General")'],
  ['val-value-group', '=VALUE("1.234,5")'], ['val-datevalue', '=DATEVALUE("1/2/2024")'], ['val-currency', '=VALUE("R$ 1.234,50")'],
  ['val-text-group', '=TEXT(1234.5,"#.##0,00")'], ['val-text-group-en', '=TEXT(1234.5,"#,##0.00")'], ['val-date-pt', '=TEXT(DATE(2024,2,1),"dd/mm/aaaa")'],
  ['val-date-en', '=TEXT(DATE(2024,2,1),"dd/mm/yyyy")'], ['val-time', '=TEXT(0.5,"hh:mm:ss")'], ['val-value-time', '=VALUE("10:30")'], ['val-value-dm', '=VALUE("1/2")'],
  ['val-date-num', '=""&DATE(2024,2,1)'], ['val-currency-fmt', '=TEXT(1234.5,"R$ #.##0,00")'], ['val-value-pct', '=VALUE("1,5%")'],
];
for (let m = 1; m <= 12; m++) values.push([`val-month-${m}`, `=TEXT(DATE(2024,${m},1),"mmmm|mmm|mmmmm")`]);
for (let d = 0; d < 7; d++) values.push([`val-day-${d}`, `=TEXT(DATE(2024,1,${7 + d}),"dddd|ddd")`]);

// o Excel grava =TRUE digitado no pt-BR (nome indefinido 'TRUE') num .xlsx que ele
// mesmo não reabre ("Não é possível obter a propriedade Open"): fica fora do arquivo
const NO_SAVE = new Set(['loc-english-bool']);

export const cases = [
  ...raw.map(([id, set, text, at]) => ({ id: `locale-${id}`, set, text, ...(at ? { at } : {}), ...(NO_SAVE.has(id) ? { noSave: true } : {}) })),
  ...values.map(([id, text]) => ({ id: `locale-${id}`, set: 'f2', text, kind: 'value' })),
];
