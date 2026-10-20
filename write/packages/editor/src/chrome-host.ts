// HOST opcional do <universal-write>: o que só o app hospedeiro sabe fazer
// (Electron: diálogo nativo com Mark-of-the-Web, fontes do SO, confirmação ao
// fechar, cor dos controles da janela). Tudo é opcional — sem host, as barras
// usam o caminho web (File System Access, download, beforeunload).
//
//   const wn = document.querySelector('universal-write');
//   wn.host = { openFile: () => window.myBridge.open(), setDirty: … };
import { FontResolver, type HostFontProvider } from '@universal-office/fonts';

export interface UniversalWriteHostFile {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  /** o arquivo veio da Internet (Mark-of-the-Web) → abre no Modo Protegido */
  motw?: boolean;
}

export interface UniversalWriteHost {
  /** Diálogo de abrir do host; null = cancelado. */
  openFile?(): Promise<UniversalWriteHostFile | null>;
  /** Escolhe o outro lado de "Comparar com…". */
  openFileForCompare?(title: string): Promise<UniversalWriteHostFile | null>;
  /** Grava; devolve o nome gravado ou null (cancelado). Sem ele: File System Access / download. */
  saveFile?(data: Uint8Array, opts: { name: string; format: 'docx' | 'odt'; saveAs: boolean }): Promise<string | null>;
  /** Fontes do SO (famílias / bytes) — viram o host do resolvedor de fontes. */
  listFonts?: HostFontProvider['list'];
  resolveFonts?: HostFontProvider['resolve'];
  /** Alterações não salvas (confirmação ao fechar a janela). */
  setDirty?(dirty: boolean, name: string): void;
  /** "Salvar" na confirmação ao fechar: o componente salva e chama closeWindow. */
  onSaveBeforeClose?(cb: () => void): void;
  closeWindow?(): void;
  /** Tema efetivo (controles da janela sobrepostos à barra de título). */
  setTitleTheme?(dark: boolean): void;
  /** Título do documento mudou. */
  setTitle?(title: string): void;
  /**
   * O componente ocupa o topo de uma janela SEM MOLDURA cujos controles do SO
   * ficam sobrepostos (Electron `titleBarOverlay`, PWA window-controls-overlay):
   * a linha de título reserva a área deles e passa a arrastar a janela.
   */
  windowControlsOverlay?: boolean;
}

declare module './universal-write.js' {
  interface UniversalWriteElement {
    /** Integração opcional com o app hospedeiro (ver UniversalWriteHost). */
    host?: UniversalWriteHost | null;
  }
}

export function hostOf(el: { host?: UniversalWriteHost | null }): UniversalWriteHost | null {
  return el.host ?? null;
}

const fontHosts = new WeakMap<UniversalWriteHost, HostFontProvider>();

/** Liga as fontes do host ao resolvedor ÚNICO, se ninguém o configurou antes. */
export function bindHostFonts(host: UniversalWriteHost | null): void {
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
