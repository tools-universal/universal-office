export { UniversalSheetElement, formatNumeric, type SheetFormatChange, type FindOptions } from './universal-sheet.js';
export type { FontChange, AlignChange } from './sheet-calc.js';
export type { NumberFormatKind } from './number-formats.js';
// plugins (o mesmo modelo do <universal-write>: use/unuse, register, toolbar)
export type {
  UniversalSheetPlugin, UniversalSheetPluginContext, UniversalSheetPluginHost, UniversalSheetToolbarContext, UniversalSheetBarKit,
} from './plugins.js';
// barras (topbar/bottombar/toolbar): integração opcional com o app hospedeiro
export type { UniversalSheetHost, UniversalSheetHostFile, UniversalSheetHostSaved, UniversalSheetExportKind } from './chrome-host.js';
// resolvedor de fontes único dos apps: o host configura base/fontes do SO nele
export { FontResolver, type HostFontFace, type HostFontProvider } from '@universal-office/fonts';
import type { UiLang } from '@universal-office/ui';
import type { UniversalSheetElement } from './universal-sheet.js';
import type { UniversalSheetBarKit } from './plugins.js';

/**
 * Abre uma planilha como o menu Arquivo › Abrir das barras: título, nome do
 * arquivo e (com `path`, vindo do host) o destino do "Salvar". Carrega o módulo
 * das barras sob demanda. Devolve false se os bytes não são uma planilha.
 */
export async function openWorkbook(el: UniversalSheetElement, bytes: Uint8Array, name: string, opts: { path?: string } = {}): Promise<boolean> {
  const { appFor } = await import('./chrome-app.js');
  return appFor(el).openBytes(bytes, name, null, opts);
}

/**
 * Kit das barras para o hospedeiro montar FORA do elemento uma linha igual à
 * da barra (`createBarRow`, `createBarButton`, `createBarIcon`, `barCss`…).
 * Carregado sob demanda; `lang` põe o idioma nos rótulos `{ en, pt, es }`.
 */
export async function loadBarKit(lang?: UiLang): Promise<UniversalSheetBarKit> {
  const { barKit } = await import('./bar-kit.js');
  return lang ? { ...barKit, createBarButton: (o) => barKit.createBarButton({ lang, ...o }) } : barKit;
}
