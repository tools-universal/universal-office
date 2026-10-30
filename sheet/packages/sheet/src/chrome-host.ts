// HOST opcional do <universal-sheet>: o que só o app hospedeiro sabe fazer
// (Electron: diálogos nativos, fontes do SO, confirmação ao fechar, cor dos
// controles da janela). Tudo é opcional — sem host, as barras usam o caminho
// web (File System Access, download, beforeunload). O mesmo desenho do
// `host` do <universal-write>.
//
//   const sheet = document.querySelector('universal-sheet');
//   sheet.host = { openFile: () => window.myBridge.open(), setDirty: … };
import { FontResolver, type HostFontProvider } from '@universal-office/fonts';

export interface UniversalSheetHostFile {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  /** Onde o host guarda o arquivo (opaco; Electron: caminho absoluto). Volta no
   *  saveFile para "Salvar" gravar no mesmo lugar sem perguntar. */
  path?: string;
}

/** Resultado do saveFile: o nome gravado (e onde, para o próximo "Salvar"). */
export type UniversalSheetHostSaved = string | { name: string; path?: string };

/** Formatos do Arquivo › Baixar/Exportar. */
export type UniversalSheetExportKind = 'pdf' | 'ods' | 'csv' | 'tsv' | 'html' | 'md' | 'xml';

export interface UniversalSheetHost {
  /** Diálogo de abrir do host (.xlsx/.xlsm/.xls); null = cancelado. */
  openFile?(): Promise<UniversalSheetHostFile | null>;
  /** Grava o .xlsx; devolve o nome gravado (ou { name, path }) ou null (cancelado). `path`: de
   *  onde a pasta veio/foi salva — ausente em pasta nova e em Salvar como. */
  saveFile?(data: Uint8Array, opts: { name: string; format: 'xlsx'; saveAs: boolean; path?: string }): Promise<UniversalSheetHostSaved | null>;
  /** Exportar pelo host (diálogo nativo): `data` gera os bytes só depois da escolha do destino.
   *  Devolve o nome gravado ou null (cancelado). Sem ele: download. */
  exportFile?(kind: UniversalSheetExportKind, name: string, data: () => Promise<Uint8Array | string>): Promise<string | null>;
  /** Imprimir pelo host (diálogo do sistema) o PDF da pasta. Sem ele: o PDF abre numa janela do navegador. */
  print?(opts: { pdf: Uint8Array; title: string }): Promise<void>;
  /** Fontes do SO (famílias / bytes) — viram o host do resolvedor de fontes. */
  listFonts?: HostFontProvider['list'];
  resolveFonts?: HostFontProvider['resolve'];
  /** Alterações não salvas (confirmação ao fechar a janela). */
  setDirty?(dirty: boolean, name: string): void;
  /** "Salvar" na confirmação ao fechar: o componente salva e chama closeWindow. */
  onSaveBeforeClose?(cb: () => void): void;
  closeWindow?(): void;
  /** Tema efetivo (controles da janela sobrepostos à barra de título); `barColor` = fundo da barra (#RRGGBB). */
  setTitleTheme?(dark: boolean, barColor?: string): void;
  /** Título da pasta mudou. */
  setTitle?(title: string): void;
  /**
   * O componente ocupa o topo de uma janela SEM MOLDURA cujos controles do SO
   * ficam sobrepostos (Electron `titleBarOverlay`, PWA window-controls-overlay):
   * a linha de título reserva a área deles e passa a arrastar a janela.
   */
  windowControlsOverlay?: boolean;
}

export function hostOf(el: { host?: UniversalSheetHost | null }): UniversalSheetHost | null {
  return el.host ?? null;
}

const fontHosts = new WeakMap<UniversalSheetHost, HostFontProvider>();

/** Liga as fontes do host ao resolvedor ÚNICO, se ninguém o configurou antes. */
export function bindHostFonts(host: UniversalSheetHost | null): void {
  if (!host?.listFonts || !host.resolveFonts) return;
  const r = FontResolver.shared();
  if (r.hasHost) return;
  let p = fontHosts.get(host);
  if (!p) {
    p = { list: host.listFonts.bind(host), resolve: host.resolveFonts.bind(host) };
    fontHosts.set(host, p);
  }
  r.configure({ host: p });
}
