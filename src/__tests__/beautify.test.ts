import { describe, it, expect } from 'vitest';
import { detectLanguage, minifyCode, beautifyCode, LANGUAGES } from '../lib/beautify';

describe('LANGUAGES', () => {
  it('has 7 language options', () => {
    expect(LANGUAGES).toHaveLength(7);
  });

  it('includes expected languages', () => {
    const ids = LANGUAGES.map((l) => l.id);
    expect(ids).toEqual(['html', 'css', 'javascript', 'typescript', 'yaml', 'sql', 'xml']);
  });
});

describe('detectLanguage', () => {
  it('detects HTML from doctype', () => {
    expect(detectLanguage('<!DOCTYPE html><html></html>')).toBe('html');
  });

  it('detects HTML from common tags', () => {
    expect(detectLanguage('<div class="x">hello</div>')).toBe('html');
  });

  it('detects CSS from selector', () => {
    expect(detectLanguage('.card { color: red; }')).toBe('css');
  });

  it('detects CSS from @media', () => {
    expect(detectLanguage('@media (max-width: 768px) {\n  body { font-size: 14px; }\n}')).toBe('css');
  });

  it('detects TypeScript from interface', () => {
    expect(detectLanguage('interface User { name: string; age: number; }')).toBe('typescript');
  });

  it('detects TypeScript from type annotations', () => {
    expect(detectLanguage('const x: number = 5;')).toBe('typescript');
  });

  it('detects YAML from frontmatter dashes', () => {
    expect(detectLanguage('---\ntitle: Hello\n')).toBe('yaml');
  });

  it('detects SQL from SELECT', () => {
    expect(detectLanguage('SELECT id, name FROM users WHERE active = 1')).toBe('sql');
  });

  it('detects SQL from CREATE', () => {
    expect(detectLanguage('CREATE TABLE users (id INT PRIMARY KEY)')).toBe('sql');
  });

  it('detects XML from declaration', () => {
    expect(detectLanguage('<?xml version="1.0"?><root></root>')).toBe('xml');
  });

  it('detects XML from svg root', () => {
    expect(detectLanguage('<svg viewBox="0 0 100 100"></svg>')).toBe('xml');
  });

  it('defaults to javascript', () => {
    expect(detectLanguage('const x = 42;')).toBe('javascript');
  });
});

describe('minifyCode', () => {
  it('minifies JavaScript', () => {
    const code = 'const x  =  1;\n// comment\nconst y = 2;';
    const result = minifyCode(code, 'javascript');
    expect(result).not.toContain('// comment');
    expect(result).not.toContain('\n');
  });

  it('minifies CSS', () => {
    const code = '.card {\n  color: red;\n  /* comment */\n  margin: 0;\n}';
    const result = minifyCode(code, 'css');
    expect(result).not.toContain('/* comment */');
    expect(result).not.toContain('\n');
  });

  it('minifies HTML', () => {
    const code = '<div>\n  <!-- comment -->\n  <p>Hello</p>\n</div>';
    const result = minifyCode(code, 'html');
    expect(result).not.toContain('<!-- comment -->');
    expect(result).toBe('<div><p>Hello</p></div>');
  });

  it('minifies SQL', () => {
    const code = 'SELECT *\n-- comment\nFROM users';
    const result = minifyCode(code, 'sql');
    expect(result).not.toContain('-- comment');
  });

  it('strips blank lines from YAML', () => {
    const code = 'key: value\n\n# comment\nother: data';
    const result = minifyCode(code, 'yaml');
    expect(result).not.toContain('# comment');
    expect(result).toContain('key: value');
  });

  it('returns empty string for blank input', () => {
    expect(minifyCode('   ', 'javascript')).toBe('');
  });
});

describe('beautifyCode', () => {
  it('returns empty string for blank input', async () => {
    expect(await beautifyCode('  ', 'javascript')).toBe('');
  });

  it('formats JavaScript with Prettier', async () => {
    const ugly = 'const x=1;const y=2;function hello(){return x+y}';
    const result = await beautifyCode(ugly, 'javascript');
    expect(result).toContain('const x = 1;');
    expect(result).toContain('function hello()');
  });

  it('formats CSS with Prettier', async () => {
    const ugly = '.card{color:red;margin:0}';
    const result = await beautifyCode(ugly, 'css');
    expect(result).toContain('color: red;');
  });

  it('formats SQL with hand-rolled formatter', async () => {
    const ugly = 'SELECT id, name FROM users WHERE active = 1 ORDER BY name';
    const result = await beautifyCode(ugly, 'sql');
    expect(result).toContain('SELECT');
    expect(result).toContain('FROM');
    expect(result).toContain('WHERE');
  });

  it('respects indent size', async () => {
    const code = 'function hello(){return 1}';
    const two = await beautifyCode(code, 'javascript', 2);
    const four = await beautifyCode(code, 'javascript', 4);
    // 4-space indent should have more leading whitespace on indented lines
    const twoIndent = two.split('\n').find((l) => l.startsWith('  '));
    const fourIndent = four.split('\n').find((l) => l.startsWith('    '));
    expect(twoIndent).toBeDefined();
    expect(fourIndent).toBeDefined();
  });
});
