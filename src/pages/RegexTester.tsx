import { useState, useMemo } from 'react';
import './RegexTester.css';

interface MatchResult {
  index: number;
  text: string;
  groups: Record<string, string>;
}

/** Escape HTML special chars */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const FLAG_OPTIONS = [
  { id: 'g', label: 'global' },
  { id: 'i', label: 'case-insensitive' },
  { id: 'm', label: 'multiline' },
  { id: 's', label: 'dotAll' },
  { id: 'u', label: 'unicode' },
] as const;

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('gi');
  const [testStr, setTestStr] = useState('');

  const toggleFlag = (f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f));
  };

  const { regex, matches, error } = useMemo(() => {
    if (!pattern)
      return { regex: null, matches: [] as MatchResult[], error: '' };
    try {
      const re = new RegExp(pattern, flags);
      const found: MatchResult[] = [];
      if (!testStr) return { regex: re, matches: found, error: '' };

      if (flags.includes('g')) {
        let m: RegExpExecArray | null;
        // Safety: limit iterations to prevent catastrophic backtracking on pathological patterns
        let limit = 10_000;
        while ((m = re.exec(testStr)) !== null && limit-- > 0) {
          found.push({
            index: m.index,
            text: m[0],
            groups: m.groups ? { ...m.groups } : {},
          });
          if (m[0].length === 0) re.lastIndex++;
        }
      } else {
        const m = re.exec(testStr);
        if (m) {
          found.push({
            index: m.index,
            text: m[0],
            groups: m.groups ? { ...m.groups } : {},
          });
        }
      }
      return { regex: re, matches: found, error: '' };
    } catch (e) {
      return {
        regex: null,
        matches: [] as MatchResult[],
        error: e instanceof Error ? e.message : 'Invalid pattern',
      };
    }
  }, [pattern, flags, testStr]);

  // Build highlighted HTML for the test string
  const highlighted = useMemo(() => {
    if (!testStr) return '';
    if (!regex || matches.length === 0) return esc(testStr);

    const parts: string[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) parts.push(esc(testStr.slice(cursor, m.index)));
      parts.push(`<mark class="rx-hl">${esc(m.text)}</mark>`);
      cursor = m.index + m.text.length;
    }
    if (cursor < testStr.length) parts.push(esc(testStr.slice(cursor)));
    return parts.join('');
  }, [testStr, regex, matches]);

  return (
    <div className="rx-tool" role="region" aria-label="Regex Tester">
      {/* Pattern bar */}
      <div className="rx-pattern" role="toolbar" aria-label="Regex pattern input">
        <span className="rx-pattern__slash" aria-hidden="true">/</span>
        <input
          className="rx-pattern__input"
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Enter regex pattern…"
          spellCheck={false}
          aria-label="Regex pattern"
        />
        <span className="rx-pattern__slash" aria-hidden="true">/</span>
        <span className="rx-pattern__flags">{flags || '—'}</span>
      </div>

      {/* Flags */}
      <div className="rx-flags" role="group" aria-label="Regex flags">
        {FLAG_OPTIONS.map((f) => (
          <button
            key={f.id}
            className={`rx-flags__btn ${flags.includes(f.id) ? 'rx-flags__btn--active' : ''}`}
            onClick={() => toggleFlag(f.id)}
            aria-pressed={flags.includes(f.id)}
            title={f.label}
          >
            {f.id}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rx-error" role="alert" aria-live="assertive">
          <span className="rx-error__icon" aria-hidden="true">✕</span>
          {error}
        </div>
      )}

      {/* Main area */}
      <div className="rx-main">
        {/* Test string input */}
        <div className="rx-pane">
          <div className="rx-pane__header">
            <span>Test String</span>
            <span className="rx-pane__meta">
              {testStr.length > 0 && `${testStr.length.toLocaleString()} chars`}
            </span>
          </div>
          <textarea
            className="rx-pane__editor"
            value={testStr}
            onChange={(e) => setTestStr(e.target.value)}
            placeholder="Enter test string…"
            spellCheck={false}
            aria-label="Test string"
          />
        </div>

        {/* Highlighted output */}
        <div className="rx-pane">
          <div className="rx-pane__header">
            <span>Highlighted</span>
            <span className="rx-pane__meta" aria-live="polite">
              {matches.length > 0 && `${matches.length} match${matches.length === 1 ? '' : 'es'}`}
            </span>
          </div>
          {testStr ? (
            <div
              className="rx-pane__rendered"
              dangerouslySetInnerHTML={{ __html: highlighted }}
              aria-label="Highlighted matches"
            />
          ) : (
            <div className="rx-pane__rendered rx-pane__rendered--empty">
              Highlighted matches will appear here…
            </div>
          )}
        </div>
      </div>

      {/* Match details */}
      <div className="rx-matches-bar">
        <div className="rx-matches-bar__header">
          <span>Match Details</span>
          <span className="rx-pane__meta" aria-live="polite">
            {matches.length > 0 && `${matches.length} match${matches.length === 1 ? '' : 'es'}`}
          </span>
        </div>
        <div className="rx-matches" role="list" aria-label="Match results">
          {matches.length === 0 && pattern && testStr && !error && (
            <div className="rx-matches__empty">No matches</div>
          )}
          {matches.map((m, i) => (
            <div key={i} className="rx-match" role="listitem">
              <div className="rx-match__header">
                <span className="rx-match__idx">#{i + 1}</span>
                <span className="rx-match__pos">index {m.index}</span>
              </div>
              <code className="rx-match__text">{m.text || '(empty)'}</code>
              {Object.keys(m.groups).length > 0 && (
                <div className="rx-match__groups">
                  {Object.entries(m.groups).map(([name, val]) => (
                    <div key={name} className="rx-match__group">
                      <span className="rx-match__group-name">{name}</span>
                      <code className="rx-match__group-val">{val}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
