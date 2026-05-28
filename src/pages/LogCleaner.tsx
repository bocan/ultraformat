import { useState, useMemo, useRef } from 'react';
import { Copy, Check, Trash2, ClipboardPaste, AlertTriangle, Info } from 'lucide-react';
import { cleanLog, detectFormat, DEFAULT_OPTIONS, type CleanOptions } from '../lib/logCleaner';
import './LogCleaner.css';

export default function LogCleaner() {
  const [input, setInput] = useState('');
  const [opts, setOpts] = useState<CleanOptions>({ ...DEFAULT_OPTIONS });
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    return cleanLog(input, opts);
  }, [input, opts]);

  const format = useMemo(() => (input.trim() ? detectFormat(input) : null), [input]);

  const toggle = (key: keyof CleanOptions) =>
    setOpts(o => ({ ...o, [key]: !o[key] }));

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setInput(text);
  };

  const handleCopy = async () => {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => setInput('');

  const pct = result
    ? Math.round((result.removedLines / Math.max(result.inputLines, 1)) * 100)
    : 0;

  return (
    <div className="lc-tool" role="region" aria-label="Log Cleaner">
      {/* ── Top toolbar ── */}
      <div className="lc-toolbar">
        <div className="lc-toolbar__left">
          <span className="lc-toolbar__title">Log Cleaner</span>
          {format && (
            <span className={`lc-format-badge lc-format-badge--${format}`}>
              {format === 'azure' ? 'Azure DevOps' : format === 'github' ? 'GitHub Actions' : 'Unknown format'}
            </span>
          )}
        </div>

        <div className="lc-toolbar__right">
          {/* Option toggles */}
          {(
            [
              { key: 'stripTimestamps', label: 'Timestamps' },
              { key: 'stripAnsi', label: 'ANSI codes' },
              { key: 'stripAzurePrefix', label: '##[cmd] tags' },
              { key: 'collapseBlankLines', label: 'Collapse blanks' },
              { key: 'trimLines', label: 'Trim lines' },
            ] as { key: keyof CleanOptions; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="lc-toggle" title={`Toggle: ${label}`}>
              <input
                type="checkbox"
                className="lc-toggle__check"
                checked={opts[key]}
                onChange={() => toggle(key)}
                aria-label={label}
              />
              <span className={`lc-toggle__pill ${opts[key] ? 'lc-toggle__pill--on' : ''}`} />
              <span className="lc-toggle__label">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Panes ── */}
      <div className="lc-panes">
        {/* Input pane */}
        <div className="lc-pane">
          <div className="lc-pane__header">
            <span>Raw Log Input</span>
            <div className="lc-pane__actions">
              <button className="lc-btn" onClick={handlePaste} title="Paste from clipboard">
                <ClipboardPaste size={13} /> Paste
              </button>
              <button className="lc-btn" onClick={handleClear} title="Clear input" disabled={!input}>
                <Trash2 size={13} /> Clear
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            className="lc-pane__editor"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Paste your Azure DevOps or GitHub Actions raw log here…

Example Azure DevOps raw log lines:
2024-01-15T10:23:45.1234567Z ##[section]Starting: Build
2024-01-15T10:23:45.2345678Z ##[command]dotnet build src/MyApp.csproj
2024-01-15T10:23:46.3456789Z   Build succeeded.
2024-01-15T10:23:46.4567890Z ##[error]Error MSB3001: ...
2024-01-15T10:23:46.5678901Z ##[section]Finishing: Build`}
            spellCheck={false}
            aria-label="Raw log input"
          />
          {input && (
            <div className="lc-pane__footer">
              <span>{input.split('\n').length.toLocaleString()} lines</span>
              <span>{input.length.toLocaleString()} chars</span>
            </div>
          )}
        </div>

        {/* Output pane */}
        <div className="lc-pane">
          <div className="lc-pane__header">
            <span>Cleaned Output</span>
            <div className="lc-pane__actions">
              <button
                className={`lc-btn lc-btn--accent ${copied ? 'lc-btn--done' : ''}`}
                onClick={handleCopy}
                disabled={!result?.output}
                title="Copy to clipboard"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            className="lc-pane__editor lc-pane__editor--output"
            value={result?.output ?? ''}
            readOnly
            placeholder="Cleaned log will appear here…"
            aria-label="Cleaned log output"
            aria-live="polite"
          />
          {result && (
            <div className="lc-pane__footer">
              <span>{result.outputLines.toLocaleString()} lines</span>
              <span>{result.output.length.toLocaleString()} chars</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      {result && (
        <div className="lc-stats">
          <div className="lc-stats__item">
            <span className="lc-stats__label">Input</span>
            <span className="lc-stats__value">{result.inputLines.toLocaleString()} lines</span>
          </div>
          <div className="lc-stats__divider" />
          <div className="lc-stats__item">
            <span className="lc-stats__label">Output</span>
            <span className="lc-stats__value">{result.outputLines.toLocaleString()} lines</span>
          </div>
          <div className="lc-stats__divider" />
          <div className="lc-stats__item lc-stats__item--highlight">
            <span className="lc-stats__label">Removed</span>
            <span className="lc-stats__value">
              {result.removedLines.toLocaleString()} lines ({pct}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="lc-stats__bar" aria-hidden="true">
            <div
              className="lc-stats__bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Help hint ── */}
      {!input && (
        <div className="lc-hint">
          <Info size={14} className="lc-hint__icon" />
          <div>
            <strong>How to get Azure DevOps raw logs:</strong> open a pipeline run → click any job →
            click the <em>View raw log</em> link (top-right of the log panel). The raw log contains
            ISO timestamps and ANSI colour codes — paste it here and they'll be stripped automatically.
          </div>
        </div>
      )}

      {/* ── Warning if ANSI not stripped but found ── */}
      {result && !opts.stripAnsi && input.includes('\x1b[') && (
        <div className="lc-warn" role="alert">
          <AlertTriangle size={14} />
          ANSI stripping is disabled — escape codes are still present in the output.
        </div>
      )}
    </div>
  );
}
