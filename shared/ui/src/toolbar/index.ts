// Framework declarativo de barras dos web components (Write hoje; Sheet e
// Slides depois): registro de comandos, barra compacta (Google Docs), ribbon
// (Word), menus, diálogo e avisos — todos funcionando dentro de shadow root.
export * from './types.js';
export { CommandRegistry } from './commands.js';
export { planCollapse, type CollapseInput, type CollapsePlan } from './collapse.js';
export { symbol, hasSymbol } from './icons.js';
export { openMenu, closeMenus, isMenuOpen, isMenuOpenFor, type MenuAt, type MenuOptions } from './menu.js';
export { openDialog, promptDialog, closeDialogs, showToast, dialogTabs, type DialogAction, type DialogHandle, type DialogOptions, type PromptOptions } from './dialog.js';
export { renderItem, toggleMenu, ripple, esc, type RenderedItem } from './items.js';
export { openPopover, closePopover } from './popover.js';
export { createCompactBar } from './compact.js';
export { createRibbon } from './ribbon.js';
export {
  colorGrid, OFFICE_COLORS, HIGHLIGHT_COLORS, THEME_SLOTS, STANDARD_COLORS, themePaletteColors, themeVariants, themeTintHex, parseThemePick,
  type ColorGridOptions, type ThemeColorPick,
} from './colors.js';
export { renderGallery, closeGallery, tileGrid, type GalleryConfig, type GalleryItem, type RenderedGallery, type TileGridOptions } from './gallery.js';
export { openPane, closePanes, paneOpen, type PaneOptions, type PaneHandle } from './pane.js';
export { createRuler, rulerStep, type RulerHandle, type RulerModel, type RulerMarker, type RulerMarkerKind, type RulerTabKind, type RulerSelectorKind, type RulerEvents } from './ruler.js';
export { BAR_CSS, ensureBarStyles } from './css.js';
