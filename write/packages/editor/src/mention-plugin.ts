import type {
  UniversalWriteInlineDrawContext,
  UniversalWritePlugin,
  UniversalWritePluginHost,
} from './plugins.js';

export interface MentionData {
  id: string;
  label: string;
}

export interface MentionPluginOptions {
  background?: string;
  color?: string;
  prefix?: string;
  /** Fonte local ou remota de sugestões. Ausente mantém o plugin apenas como renderer. */
  source?: (query: string) => readonly MentionData[] | Promise<readonly MentionData[]>;
  maxSuggestions?: number;
  emptyLabel?: string;
}

/**
 * Renderer e autocomplete de referência para mentions. A aplicação continua
 * livre para usar Quill ou outro popover e chamar insertCustomInline diretamente;
 * ao fornecer `source`, este plugin também implementa @ → lista → seleção.
 */
export function createMentionPlugin(options: MentionPluginOptions = {}): UniversalWritePlugin {
  const prefix = options.prefix ?? '@';
  return {
    id: 'universalwrite.mention',
    inlineRenderers: [{
      type: 'mention',
      toText: (data) => `${prefix}${(data as MentionData).label}`,
      measure: ({ fallbackText, measureText }) => ({
        widthTwips: measureText(fallbackText) + 180,
      }),
      draw: (context) => drawMention(context, options),
    }],
    setup: options.source
      ? ({ editor }) => setupMentionAutocomplete(editor, options, prefix)
      : undefined,
  };
}

function setupMentionAutocomplete(
  editor: UniversalWritePluginHost,
  options: MentionPluginOptions,
  prefix: string,
): () => void {
  const source = options.source!;
  const maxSuggestions = Math.max(1, options.maxSuggestions ?? 8);
  const popup = document.createElement('div');
  popup.hidden = true;
  popup.className = 'wordnext-mention-menu';
  popup.setAttribute('role', 'listbox');
  popup.setAttribute('aria-label', 'Mention suggestions');
  Object.assign(popup.style, {
    position: 'fixed',
    zIndex: '2147483647',
    width: '280px',
    maxHeight: '260px',
    overflowY: 'auto',
    padding: '6px',
    border: '1px solid rgba(127,127,127,.35)',
    borderRadius: '10px',
    background: '#fff',
    color: '#202124',
    boxShadow: '0 12px 32px rgba(0,0,0,.28)',
    font: '14px/1.35 system-ui, sans-serif',
  });
  document.body.append(popup);

  let active = false;
  let query = '';
  let items: readonly MentionData[] = [];
  let selected = 0;
  let request = 0;

  const position = (): void => {
    const rect = editor.getBoundingClientRect();
    const left = Math.max(12, Math.min(window.innerWidth - 304, rect.left + 48));
    const top = Math.max(12, Math.min(window.innerHeight - 284, rect.top + 88));
    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
  };

  const choose = (item: MentionData): void => {
    close();
    editor.insertCustomInline('mention', item);
    editor.focusEditor();
  };

  const render = (): void => {
    popup.replaceChildren();
    popup.hidden = !active;
    if (!active) return;

    const heading = document.createElement('div');
    heading.textContent = query ? `${prefix}${query}` : 'Escolha uma pessoa';
    Object.assign(heading.style, {
      padding: '6px 10px 8px',
      color: '#5f6368',
      fontSize: '12px',
      fontWeight: '600',
    });
    popup.append(heading);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = options.emptyLabel ?? 'No mentions found';
      Object.assign(empty.style, { padding: '10px', color: '#6b7280' });
      popup.append(empty);
      return;
    }

    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `wordnext-mention-option-${index}`;
      button.dataset.index = String(index);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === selected));
      button.textContent = `${prefix}${item.label}`;
      Object.assign(button.style, {
        display: 'block',
        width: '100%',
        padding: '9px 10px',
        border: '0',
        borderRadius: '7px',
        background: index === selected ? '#e8f0fe' : 'transparent',
        color: index === selected ? '#174ea6' : '#202124',
        textAlign: 'left',
        cursor: 'pointer',
        font: 'inherit',
      });
      button.addEventListener('mouseenter', () => {
        selected = index;
        render();
      });
      button.addEventListener('click', () => choose(item));
      popup.append(button);
    });
    popup.setAttribute('aria-activedescendant', `wordnext-mention-option-${selected}`);
  };

  const refresh = async (): Promise<void> => {
    const current = ++request;
    let result: readonly MentionData[];
    try {
      result = await source(query);
    } catch {
      result = [];
    }
    if (!active || current !== request) return;
    items = result.slice(0, maxSuggestions);
    selected = Math.min(selected, Math.max(0, items.length - 1));
    render();
  };

  function open(): void {
    active = true;
    query = '';
    items = [];
    selected = 0;
    position();
    render();
    void refresh();
  }

  function close(): void {
    active = false;
    query = '';
    items = [];
    request++;
    popup.hidden = true;
    popup.replaceChildren();
    popup.removeAttribute('aria-activedescendant');
  }

  const onBeforeInput = (raw: Event): void => {
    const event = raw as CustomEvent<{ text?: string }>;
    const text = event.detail?.text ?? '';
    if (!active) {
      if (text === prefix) {
        event.preventDefault();
        open();
      }
      return;
    }
    event.preventDefault();
    if (!text || /[\r\n\t ]/.test(text)) {
      close();
      return;
    }
    query += text;
    selected = 0;
    void refresh();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!active) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (items.length) {
        selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        render();
      }
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = items[selected];
      if (item) choose(item);
      else close();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!query) close();
      else {
        query = query.slice(0, -1);
        selected = 0;
        void refresh();
      }
    }
  };

  const onPointerDown = (event: Event): void => {
    if (active && event.target !== editor && !popup.contains(event.target as Node)) close();
  };
  const onLayout = (): void => { if (active) position(); };

  editor.addEventListener('uw-before-input', onBeforeInput);
  editor.addEventListener('keydown', onKeyDown, true);
  popup.addEventListener('mousedown', (event) => event.preventDefault());
  window.addEventListener('mousedown', onPointerDown);
  window.addEventListener('resize', onLayout);
  editor.addEventListener('scroll', onLayout);

  return () => {
    editor.removeEventListener('uw-before-input', onBeforeInput);
    editor.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('mousedown', onPointerDown);
    window.removeEventListener('resize', onLayout);
    editor.removeEventListener('scroll', onLayout);
    popup.remove();
  };
}

function drawMention(
  context: UniversalWriteInlineDrawContext,
  options: MentionPluginOptions,
): void {
  const { ctx, xTwips, yTwips, baselineTwips, widthTwips, heightTwips, scale } = context;
  const x = xTwips * scale;
  const y = (yTwips + 16) * scale;
  const width = widthTwips * scale;
  const height = Math.max(1, heightTwips - 32) * scale;
  const radius = Math.min(80 * scale, height / 2);

  ctx.save();
  ctx.fillStyle = options.background ?? (context.dark ? '#394b63' : '#dce8ff');
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
  ctx.fillStyle = options.color ?? (context.dark ? '#d8e6ff' : '#174ea6');
  ctx.fillText(context.fallbackText, x + 90 * scale, baselineTwips * scale);
  ctx.restore();
}
