/**
 * Nomes de exibição em ESPANHOL dos estilos internos do Word (só a interface:
 * galeria e painel de estilos, galeria de estilos de tabela). O w:name gravado
 * continua o canônico em inglês e os ids continuam os do Word pt-BR (oráculo);
 * estes nomes são os do Word em espanhol, escritos à mão (não há oráculo es).
 */

/** Estilos de parágrafo/caractere: w:name canônico em minúsculas → nome em espanhol. */
export const BUILTIN_STYLE_NAMES_ES: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {
    'annotation reference': 'Referencia de comentario', 'annotation subject': 'Asunto del comentario',
    'annotation text': 'Texto comentario', 'balloon text': 'Texto de globo', bibliography: 'Bibliografía',
    'block text': 'Texto de bloque', 'body text': 'Texto independiente', 'body text 2': 'Texto independiente 2',
    'body text 3': 'Texto independiente 3', 'body text first indent': 'Texto independiente primera sangría',
    'body text first indent 2': 'Texto independiente primera sangría 2', 'body text indent': 'Sangría de texto normal',
    'body text indent 2': 'Sangría 2 de t. independiente', 'body text indent 3': 'Sangría 3 de t. independiente',
    'book title': 'Título del libro', caption: 'Descripción', closing: 'Cierre', date: 'Fecha',
    'document map': 'Mapa del documento', 'e-mail signature': 'Firma de correo electrónico', emphasis: 'Énfasis',
    'endnote reference': 'Referencia de nota al final', 'endnote text': 'Texto nota al final',
    'envelope address': 'Dirección sobre', 'envelope return': 'Remite sobre', followedhyperlink: 'Hipervínculo visitado',
    footer: 'Pie de página', 'footnote reference': 'Referencia de nota al pie', 'footnote text': 'Texto nota pie',
    hashtag: 'Hashtag', header: 'Encabezado',
    'html acronym': 'Acrónimo HTML', 'html address': 'Dirección HTML', 'html cite': 'Cita HTML', 'html code': 'Código HTML',
    'html definition': 'Definición HTML', 'html keyboard': 'Teclado HTML', 'html preformatted': 'HTML con formato previo',
    'html sample': 'Ejemplo de HTML', 'html typewriter': 'Máquina de escribir HTML', 'html variable': 'Variable HTML',
    hyperlink: 'Hipervínculo', 'index heading': 'Título de índice', 'intense emphasis': 'Énfasis intenso',
    'intense quote': 'Cita destacada', 'intense reference': 'Referencia intensa', 'line number': 'Número de línea',
    list: 'Lista', 'list bullet': 'Lista con viñetas', 'list continue': 'Continuar lista', 'list number': 'Lista con números',
    'list paragraph': 'Párrafo de lista', macro: 'Texto macro', mention: 'Mención', 'message header': 'Encabezado de mensaje',
    'no spacing': 'Sin espaciado', normal: 'Normal', 'normal (web)': 'Normal (Web)', 'normal indent': 'Sangría normal',
    'note heading': 'Encabezado de nota', 'page number': 'Número de página', 'placeholder text': 'Texto del marcador de posición',
    'plain text': 'Texto sin formato', quote: 'Cita', salutation: 'Saludo', signature: 'Firma',
    'smart hyperlink': 'Hipervínculo inteligente', 'smart link': 'Vínculo inteligente', strong: 'Texto en negrita',
    subtitle: 'Subtítulo', 'subtle emphasis': 'Énfasis sutil', 'subtle reference': 'Referencia sutil',
    'table of authorities': 'Tabla de autoridades', 'table of figures': 'Tabla de ilustraciones', title: 'Título',
    'toa heading': 'Título de tabla de autoridades', 'toc heading': 'Título de TDC', 'unresolved mention': 'Mención sin resolver',
    // fora da tabela do oráculo (como o EXTRA_PT)
    'default paragraph font': 'Fuente de párrafo predeter.', 'normal table': 'Tabla normal', 'no list': 'Sin lista',
    'table grid': 'Tabla con cuadrícula',
  };
  for (let n = 1; n <= 9; n++) {
    out[`heading ${n}`] = `Título ${n}`;
    out[`index ${n}`] = `Índice ${n}`;
    out[`toc ${n}`] = `TDC ${n}`;
  }
  for (let n = 2; n <= 5; n++) {
    out[`list ${n}`] = `Lista ${n}`;
    out[`list bullet ${n}`] = `Lista con viñetas ${n}`;
    out[`list continue ${n}`] = `Continuar lista ${n}`;
    out[`list number ${n}`] = `Lista con números ${n}`;
  }
  return out;
})();

const TABLE_FIXED: Readonly<Record<string, string>> = {
  'Normal Table': 'Tabla normal', 'Table Grid': 'Tabla con cuadrícula', 'Grid Table Light': 'Tabla con cuadrícula clara',
  'Table Theme': 'Tabla con tema', 'Table Contemporary': 'Tabla contemporánea', 'Table Elegant': 'Tabla elegante',
  'Table Professional': 'Tabla profesional',
};
const TABLE_FAMILY: readonly [RegExp, string][] = [
  [/^Grid Table (\d)$/, 'Tabla de cuadrícula $1'],
  [/^Grid Table (\d) Light$/, 'Tabla de cuadrícula $1 clara'],
  [/^Grid Table (\d) Dark$/, 'Tabla de cuadrícula $1 oscura'],
  [/^Grid Table (\d) Colorful$/, 'Tabla de cuadrícula $1 con colores'],
  [/^List Table (\d)$/, 'Tabla de lista $1'],
  [/^List Table (\d) Light$/, 'Tabla de lista $1 clara'],
  [/^List Table (\d) Dark$/, 'Tabla de lista $1 oscura'],
  [/^List Table (\d) Colorful$/, 'Tabla de lista $1 con colores'],
  [/^Plain Table (\d)$/, 'Tabla normal $1'],
  [/^Light Shading$/, 'Sombreado claro'], [/^Medium Shading (\d)$/, 'Sombreado medio $1'],
  [/^Dark Shading$/, 'Sombreado oscuro'], [/^Colorful Shading$/, 'Sombreado vistoso'],
  [/^Light List$/, 'Lista clara'], [/^Medium List (\d)$/, 'Lista media $1'], [/^Dark List$/, 'Lista oscura'], [/^Colorful List$/, 'Lista vistosa'],
  [/^Light Grid$/, 'Cuadrícula clara'], [/^Medium Grid (\d)$/, 'Cuadrícula media $1'], [/^Colorful Grid$/, 'Cuadrícula vistosa'],
  [/^Table Classic (\d)$/, 'Tabla clásica $1'], [/^Table Colorful (\d)$/, 'Tabla con colores $1'],
  [/^Table 3D effects (\d)$/, 'Tabla con efectos 3D $1'], [/^Table Grid (\d)$/, 'Tabla con cuadrícula $1'],
  [/^Table Web (\d)$/, 'Tabla web $1'], [/^Table Columns (\d)$/, 'Tabla con columnas $1'], [/^Table List (\d)$/, 'Tabla con lista $1'],
  [/^Table Simple (\d)$/, 'Tabla sencilla $1'], [/^Table Subtle (\d)$/, 'Tabla sutil $1'],
];

/** Nome em espanhol de um estilo de tabela interno pelo w:name ("Grid Table 4 Accent 1"); undefined se não for conhecido. */
export function tableStyleNameEs(name: string): string | undefined {
  const m = /^(.*?)(?: Accent (\d))?$/.exec(name)!;
  const base = m[1]!, accent = m[2];
  let es = TABLE_FIXED[base];
  if (!es) for (const [re, out] of TABLE_FAMILY) if (re.test(base)) { es = base.replace(re, out); break; }
  if (!es) return undefined;
  return accent ? `${es} - Énfasis ${accent}` : es;
}
