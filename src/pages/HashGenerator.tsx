import { useState, useCallback } from 'react';
import './HashGenerator.css';

type Algorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

const ALGORITHMS: Algorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

/* ── Minimal MD5 (no deps) ── */
function md5(input: string): string {
  // Convert string to UTF-8 byte array
  const bytes = new TextEncoder().encode(input);
  const words: number[] = [];

  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      (bytes[i] || 0) |
      ((bytes[i + 1] || 0) << 8) |
      ((bytes[i + 2] || 0) << 16) |
      ((bytes[i + 3] || 0) << 24)
    );
  }

  const bitLen = bytes.length * 8;
  // Append 0x80 byte
  const bytePos = bytes.length % 4;
  const wordIdx = Math.floor(bytes.length / 4);
  if (wordIdx >= words.length) words.push(0);
  words[wordIdx] |= 0x80 << (bytePos * 8);

  // Pad to 56 mod 64 bytes
  while ((words.length % 16) !== 14) words.push(0);
  words.push(bitLen >>> 0);
  words.push(0); // we only support < 2^32 bits

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = Array.from({ length: 64 }, (_, i) =>
    Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000)
  );

  for (let chunk = 0; chunk < words.length; chunk += 16) {
    const M = words.slice(chunk, chunk + 16);
    let [A, B, C, D] = [a0, b0, c0, d0];

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }

      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const hex = (n: number) => {
    let s = '';
    for (let i = 0; i < 4; i++) s += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    return s;
  };
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

async function hashSHA(algo: string, input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHash(algo: Algorithm, input: string): Promise<string> {
  if (algo === 'MD5') return md5(input);
  return hashSHA(algo, input);
}

export default function HashGenerator() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const [copiedAlgo, setCopiedAlgo] = useState<string | null>(null);

  const handleInput = useCallback(async (value: string) => {
    setInput(value);
    if (!value) {
      setResults({});
      return;
    }
    const entries: Record<string, string> = {};
    for (const algo of ALGORITHMS) {
      entries[algo] = await computeHash(algo, value);
    }
    setResults(entries);
  }, []);

  const handleCopy = async (algo: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedAlgo(algo);
    setTimeout(() => setCopiedAlgo(null), 1500);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    handleInput(text);
  };

  const handleClear = () => {
    setInput('');
    setResults({});
  };

  return (
    <div className="hash-tool" role="region" aria-label="Hash Generator">
      {/* Input */}
      <div className="hash-input">
        <div className="hash-input__header">
          <span>Input Text</span>
          <div className="hash-input__controls">
            <button className="hash-input__btn" onClick={handlePaste}>Paste</button>
            <button className="hash-input__btn" onClick={handleClear}>Clear</button>
          </div>
        </div>
        <textarea
          className="hash-input__editor"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Type or paste text to hash…"
          spellCheck={false}
          aria-label="Text to hash"
        />
      </div>

      {/* Results */}
      <div className="hash-results" aria-label="Hash results">
        {ALGORITHMS.map((algo) => (
          <div key={algo} className="hash-card">
            <div className="hash-card__header">
              <span>{algo}</span>
              <button
                className={`hash-card__copy ${copiedAlgo === algo ? 'hash-card__copy--done' : ''}`}
                onClick={() => results[algo] && handleCopy(algo, results[algo])}
                disabled={!results[algo]}
                aria-label={`Copy ${algo} hash`}
              >
                {copiedAlgo === algo ? '✓' : 'Copy'}
              </button>
            </div>
            <div className="hash-card__value" aria-label={`${algo} hash value`}>
              {results[algo] || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
