import { describe, expect, it } from 'vitest';
import { TABS, nextTabId } from './Tabs';

describe('nextTabId', () => {
  const first = TABS[0].id;
  const last = TABS[TABS.length - 1].id;

  it('wraps around with arrow keys so keyboard users never get stuck at an edge', () => {
    expect(nextTabId(last, 'ArrowRight')).toBe(first);
    expect(nextTabId(first, 'ArrowLeft')).toBe(last);
    expect(nextTabId(first, 'ArrowRight')).toBe(TABS[1].id);
  });

  it('jumps to the ends with Home/End', () => {
    expect(nextTabId(TABS[2].id, 'Home')).toBe(first);
    expect(nextTabId(TABS[2].id, 'End')).toBe(last);
  });

  it('ignores unrelated keys so typing and Tab keep native behavior', () => {
    expect(nextTabId(first, 'Tab')).toBeNull();
    expect(nextTabId(first, 'Enter')).toBeNull();
  });
});
