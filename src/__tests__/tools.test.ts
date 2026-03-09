import { describe, it, expect } from 'vitest';
import { tools } from '../tools';

describe('tools config', () => {
  it('has exactly 12 tools', () => {
    expect(tools).toHaveLength(12);
  });

  it('each tool has required fields', () => {
    for (const tool of tools) {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.path).toMatch(/^\//);
      expect(tool.color).toBeTruthy();
      expect(tool.icon).toBeTruthy();
    }
  });

  it('all tool ids are unique', () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all tool paths are unique', () => {
    const paths = tools.map((t) => t.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
