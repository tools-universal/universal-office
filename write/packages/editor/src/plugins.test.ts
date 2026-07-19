import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS } from '@universal-office/docx-core';
import { createMentionPlugin } from './mention-plugin.js';

describe('plugin de mention', () => {
  it('produz fallback textual e medida determinística', () => {
    const plugin = createMentionPlugin({ prefix: '@' });
    const renderer = plugin.inlineRenderers?.[0];
    expect(renderer?.type).toBe('mention');
    expect(renderer?.toText?.({ id: '1', label: 'Ada' })).toBe('@Ada');
    expect(renderer?.measure?.({
      data: { id: '1', label: 'Ada' },
      fallbackText: '@Ada',
      props: { ...DEFAULT_RUN_PROPS },
      sizePt: 11,
      measureText: (text) => text.length * 100,
    })).toEqual({ widthTwips: 580 });
  });
});
