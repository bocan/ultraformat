export interface Tool {
  id: string;
  name: string;
  description: string;
  path: string;
  color: string;
  colorDim: string;
  colorGlow: string;
  icon: string;
}

export const tools: Tool[] = [
  {
    id: 'json',
    name: 'JSON Formatter',
    description: 'Validate, format & minify JSON with syntax highlighting',
    path: '/json',
    color: 'var(--cyan)',
    colorDim: 'var(--cyan-dim)',
    colorGlow: 'var(--cyan-glow)',
    icon: '{ }',
  },
  {
    id: 'diff',
    name: 'Diff Checker',
    description: 'Compare two blocks of text and see every difference',
    path: '/diff',
    color: 'var(--magenta)',
    colorDim: 'var(--magenta-dim)',
    colorGlow: 'var(--magenta-glow)',
    icon: '⇄',
  },
  {
    id: 'base64',
    name: 'Base64 Codec',
    description: 'Encode and decode Base64 — text or files, instantly',
    path: '/base64',
    color: 'var(--amber)',
    colorDim: 'var(--amber-dim)',
    colorGlow: 'var(--amber-glow)',
    icon: '◈',
  },
  {
    id: 'beautify',
    name: 'Code Beautify',
    description: 'Auto-format HTML, CSS, JS, SQL and more',
    path: '/beautify',
    color: 'var(--lime)',
    colorDim: 'var(--lime-dim)',
    colorGlow: 'var(--lime-glow)',
    icon: '✦',
  },
  {
    id: 'regex',
    name: 'Regex Tester',
    description: 'Write, test and debug regular expressions live',
    path: '/regex',
    color: 'var(--violet)',
    colorDim: 'var(--violet-dim)',
    colorGlow: 'var(--violet-glow)',
    icon: '/.*/',
  },
  {
    id: 'url',
    name: 'URL Codec',
    description: 'Encode, decode & parse URLs and query strings',
    path: '/url',
    color: 'var(--teal)',
    colorDim: 'var(--teal-dim)',
    colorGlow: 'var(--teal-glow)',
    icon: '%',
  },
  {
    id: 'jwt',
    name: 'JWT Decoder',
    description: 'Decode JSON Web Tokens and inspect every claim',
    path: '/jwt',
    color: 'var(--rose)',
    colorDim: 'var(--rose-dim)',
    colorGlow: 'var(--rose-glow)',
    icon: '🔑',
  },
  {
    id: 'color',
    name: 'Color Converter',
    description: 'Convert between HEX, RGB, HSL and preview live',
    path: '/color',
    color: 'var(--orange)',
    colorDim: 'var(--orange-dim)',
    colorGlow: 'var(--orange-glow)',
    icon: '◐',
  },
];
