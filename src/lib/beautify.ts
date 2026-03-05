import { format } from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from 'prettier/plugins/estree';
import parserHtml from 'prettier/plugins/html';
import parserCss from 'prettier/plugins/postcss';
import parserTs from 'prettier/plugins/typescript';
import parserYaml from 'prettier/plugins/yaml';

export type Language = 'html' | 'css' | 'javascript' | 'typescript' | 'yaml' | 'sql' | 'xml';

export interface LanguageOption {
  id: Language;
  label: string;
  parser: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'html', label: 'HTML', parser: 'html' },
  { id: 'css', label: 'CSS', parser: 'css' },
  { id: 'javascript', label: 'JavaScript', parser: 'babel' },
  { id: 'typescript', label: 'TypeScript', parser: 'typescript' },
  { id: 'yaml', label: 'YAML', parser: 'yaml' },
  { id: 'sql', label: 'SQL', parser: '__sql' },
  { id: 'xml', label: 'XML', parser: 'html' },
];

const PRETTIER_PLUGINS = [parserBabel, parserEstree, parserHtml, parserCss, parserTs, parserYaml];

/** Detect language from content heuristics */
export function detectLanguage(code: string): Language {
  const trimmed = code.trimStart();

  // XML declaration or common XML roots
  if (/^<\?xml\b/i.test(trimmed) || /^<(svg|manifest|project|resources|configuration)\b/i.test(trimmed)) return 'xml';

  // HTML
  if (/^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return 'html';
  if (/<\/?(div|span|head|body|section|article|nav|main|header|footer|form|table|ul|ol|li|p|h[1-6])\b/i.test(trimmed)) return 'html';

  // YAML — starts with "---" or "key:" pattern at start of line
  if (/^---\s*$/m.test(trimmed) || /^[a-zA-Z_][\w-]*\s*:/m.test(trimmed) && !trimmed.includes('{')) return 'yaml';

  // SQL keywords
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(trimmed)) return 'sql';

  // TypeScript — type annotations, interfaces, generics
  if (/\b(interface|type|enum)\s+\w/i.test(trimmed) || /:\s*(string|number|boolean|any|void|never)\b/.test(trimmed)) return 'typescript';

  // CSS — selectors, @rules, properties
  if (/^(@import|@media|@keyframes|@font-face|\*|body|html|\.[\w-]+|#[\w-]+)\s*[{,]/m.test(trimmed)) return 'css';
  if (/{\s*[\w-]+\s*:\s*[^;]+;\s*}/s.test(trimmed)) return 'css';

  // Default to JavaScript
  return 'javascript';
}

/** Beautify code using Prettier (or hand-rolled SQL formatter) */
export async function beautifyCode(
  code: string,
  language: Language,
  indent: number = 2,
): Promise<string> {
  if (!code.trim()) return '';

  if (language === 'sql') {
    return formatSQL(code, indent);
  }

  const lang = LANGUAGES.find((l) => l.id === language)!;

  const result = await format(code, {
    parser: lang.parser,
    plugins: PRETTIER_PLUGINS,
    tabWidth: indent,
    printWidth: 100,
    singleQuote: true,
    trailingComma: 'all',
    // HTML-specific
    ...(language === 'html' || language === 'xml'
      ? { htmlWhitespaceSensitivity: 'ignore' as const }
      : {}),
  });

  return result;
}

/** Minify code — strip whitespace/comments */
export function minifyCode(code: string, language: Language): string {
  if (!code.trim()) return '';

  if (language === 'sql') {
    return code.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
  }

  if (language === 'yaml') {
    // YAML can't really be "minified", just strip comments and blank lines
    return code
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trimEnd())
      .filter((l) => l.trim() !== '')
      .join('\n');
  }

  if (language === 'html' || language === 'xml') {
    return code
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (language === 'css') {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,>~+])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim();
  }

  // JS/TS — basic minification (strip comments, collapse whitespace)
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,=<>!&|?:+\-*/])\s*/g, '$1')
    .trim();
}

// ── Hand-rolled SQL formatter ──

const SQL_KEYWORDS_MAJOR = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY',
  'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'INNER JOIN', 'LEFT JOIN',
  'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'INSERT INTO',
  'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
  'ALTER TABLE', 'DROP TABLE', 'UNION', 'UNION ALL', 'WITH', 'AS',
];

function formatSQL(code: string, indent: number): string {
  const spaces = ' '.repeat(indent);
  let result = code
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Insert newlines before major keywords
  for (const kw of SQL_KEYWORDS_MAJOR) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
    result = result.replace(regex, '\n$1');
  }

  // Indent lines after SELECT, SET, VALUES
  const lines = result.split('\n').filter((l) => l.trim());
  const formatted: string[] = [];
  let indentLevel = 0;

  for (const line of lines) {
    const upper = line.trim().toUpperCase();

    if (/^(FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|SET|VALUES|ON)\b/.test(upper)) {
      indentLevel = Math.max(0, indentLevel);
    }

    if (/^(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|WITH)\b/.test(upper)) {
      formatted.push(line.trim());
      indentLevel = 1;
    } else if (/^(FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|ON)\b/.test(upper)) {
      formatted.push(line.trim());
      indentLevel = 1;
    } else if (/^(AND|OR)\b/.test(upper)) {
      formatted.push(spaces + line.trim());
    } else {
      formatted.push(spaces.repeat(indentLevel) + line.trim());
    }
  }

  return formatted.join('\n');
}
