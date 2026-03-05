import { describe, it, expect } from 'vitest';
import { diffLines, diffStats, diffChars, highlightLine } from '../lib/diff';

describe('diffLines', () => {
  it('returns a single equal line for identical single-line strings', () => {
    const result = diffLines('hello', 'hello');
    expect(result).toEqual([
      { type: 'equal', value: 'hello', oldLineNo: 1, newLineNo: 1 },
    ]);
  });

  it('returns all equal lines for identical multi-line strings', () => {
    const text = 'line1\nline2\nline3';
    const result = diffLines(text, text);
    expect(result).toHaveLength(3);
    expect(result.every((l) => l.type === 'equal')).toBe(true);
  });

  it('detects added lines', () => {
    const result = diffLines('', 'new line');
    // Empty string splits to [''], so the diff sees a removed empty line + added new line
    expect(result).toEqual([
      { type: 'removed', value: '', oldLineNo: 1 },
      { type: 'added', value: 'new line', newLineNo: 1 },
    ]);
  });

  it('detects removed lines', () => {
    const result = diffLines('old line', '');
    // Empty string splits to [''], so the diff sees a removed line + added empty line
    expect(result).toEqual([
      { type: 'removed', value: 'old line', oldLineNo: 1 },
      { type: 'added', value: '', newLineNo: 1 },
    ]);
  });

  it('detects a mix of added, removed, and equal lines', () => {
    const oldText = 'aaa\nbbb\nccc';
    const newText = 'aaa\nxxx\nccc';
    const result = diffLines(oldText, newText);

    expect(result[0]).toMatchObject({ type: 'equal', value: 'aaa' });
    expect(result.find((l) => l.type === 'removed')?.value).toBe('bbb');
    expect(result.find((l) => l.type === 'added')?.value).toBe('xxx');
    expect(result[result.length - 1]).toMatchObject({ type: 'equal', value: 'ccc' });
  });

  it('handles both texts empty', () => {
    const result = diffLines('', '');
    expect(result).toEqual([
      { type: 'equal', value: '', oldLineNo: 1, newLineNo: 1 },
    ]);
  });

  it('assigns correct line numbers', () => {
    const result = diffLines('a\nb', 'a\nc');
    const equal = result.find((l) => l.type === 'equal');
    expect(equal?.oldLineNo).toBe(1);
    expect(equal?.newLineNo).toBe(1);

    const removed = result.find((l) => l.type === 'removed');
    expect(removed?.oldLineNo).toBe(2);

    const added = result.find((l) => l.type === 'added');
    expect(added?.newLineNo).toBe(2);
  });
});

describe('diffStats', () => {
  it('counts added and removed lines', () => {
    const lines = diffLines('aaa\nbbb', 'aaa\nccc');
    const stats = diffStats(lines);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
  });

  it('returns zero for identical texts', () => {
    const lines = diffLines('same', 'same');
    const stats = diffStats(lines);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
    expect(stats.total).toBe(1);
  });

  it('counts total lines', () => {
    const lines = diffLines('a\nb\nc', 'a\nx');
    const stats = diffStats(lines);
    expect(stats.total).toBe(lines.length);
  });
});

describe('diffChars', () => {
  it('returns a single equal span for identical strings', () => {
    const result = diffChars('hello', 'hello');
    expect(result).toEqual([{ type: 'equal', value: 'hello' }]);
  });

  it('detects a single changed character', () => {
    const result = diffChars('Port: 8080', 'Port: 8081');
    // Everything matches except the last char
    const removed = result.filter((s) => s.type === 'removed');
    const added = result.filter((s) => s.type === 'added');
    expect(removed).toHaveLength(1);
    expect(removed[0].value).toBe('0');
    expect(added).toHaveLength(1);
    expect(added[0].value).toBe('1');
  });

  it('detects multiple changed spans', () => {
    const result = diffChars('abc123', 'xyz123');
    const removed = result.filter((s) => s.type === 'removed');
    const added = result.filter((s) => s.type === 'added');
    expect(removed.map((s) => s.value).join('')).toBe('abc');
    expect(added.map((s) => s.value).join('')).toBe('xyz');
  });

  it('merges consecutive same-type spans', () => {
    const result = diffChars('aaa', 'bbb');
    // Should be merged into one removed + one added, not three of each
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'removed', value: 'aaa' });
    expect(result[1]).toEqual({ type: 'added', value: 'bbb' });
  });

  it('handles empty inputs', () => {
    expect(diffChars('', '')).toEqual([]);
    expect(diffChars('', 'abc')).toEqual([{ type: 'added', value: 'abc' }]);
    expect(diffChars('abc', '')).toEqual([{ type: 'removed', value: 'abc' }]);
  });
});

describe('highlightLine', () => {
  it('splits spans into old and new sides', () => {
    const { oldSpans, newSpans } = highlightLine('Port: 8080', 'Port: 8081');
    // Old side should have the removed char, new side the added char
    const oldChanged = oldSpans.filter((s) => s.type === 'removed');
    const newChanged = newSpans.filter((s) => s.type === 'added');
    expect(oldChanged.map((s) => s.value).join('')).toBe('0');
    expect(newChanged.map((s) => s.value).join('')).toBe('1');
  });

  it('preserves equal parts on both sides', () => {
    const { oldSpans, newSpans } = highlightLine('abc', 'axc');
    const oldEqual = oldSpans.filter((s) => s.type === 'equal').map((s) => s.value).join('');
    const newEqual = newSpans.filter((s) => s.type === 'equal').map((s) => s.value).join('');
    expect(oldEqual).toBe('ac');
    expect(newEqual).toBe('ac');
  });
});
