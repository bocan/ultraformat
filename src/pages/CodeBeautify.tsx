import { useState, useCallback, useRef, useEffect } from 'react';
import {
  LANGUAGES,
  detectLanguage,
  beautifyCode,
  minifyCode,
  type Language,
} from '../lib/beautify';
import './CodeBeautify.css';

type Mode = 'beautify' | 'minify';

export default function CodeBeautify() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('beautify');
  const [language, setLanguage] = useState<Language>('javascript');
  const [autoDetect, setAutoDetect] = useState(true);
  const [indentSize, setIndentSize] = useState(2);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const process = useCallback(
    async (raw: string, m: Mode, lang: Language, indent: number) => {
      if (!raw.trim()) {
        setOutput('');
        setError('');
        setProcessing(false);
        return;
      }
      try {
        setProcessing(true);
        const result =
          m === 'beautify'
            ? await beautifyCode(raw, lang, indent)
            : minifyCode(raw, lang);
        setOutput(result);
        setError('');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Formatting failed';
        setError(msg);
        setOutput('');
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  // Debounced processing to avoid hammering Prettier on every keystroke
  const scheduleProcess = useCallback(
    (raw: string, m: Mode, lang: Language, indent: number) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => process(raw, m, lang, indent), 300);
    },
    [process],
  );

  // Clean up debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleInput = (value: string) => {
    setInput(value);
    let lang = language;
    if (autoDetect && value.trim()) {
      lang = detectLanguage(value);
      setLanguage(lang);
    }
    scheduleProcess(value, mode, lang, indentSize);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    scheduleProcess(input, m, language, indentSize);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setAutoDetect(false);
    scheduleProcess(input, mode, lang, indentSize);
  };

  const handleIndentChange = (size: number) => {
    setIndentSize(size);
    scheduleProcess(input, mode, language, size);
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
    setAutoDetect(true);
    clearTimeout(debounceRef.current);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    handleInput(text);
  };

  return (
    <div className="beau-tool" role="region" aria-label="Code Beautify">
      {/* Toolbar */}
      <div className="beau-toolbar" role="toolbar" aria-label="Beautify operations">
        <div className="beau-toolbar__tabs" role="tablist" aria-label="Operation mode">
          {(['beautify', 'minify'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className={`beau-toolbar__tab ${mode === m ? 'beau-toolbar__tab--active' : ''}`}
              onClick={() => handleModeChange(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="beau-toolbar__controls">
          <label className="beau-toolbar__lang">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              aria-label="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            {autoDetect && input.trim() && (
              <span className="beau-toolbar__auto" aria-label="Auto-detected language">
                auto
              </span>
            )}
          </label>

          {mode === 'beautify' && (
            <label className="beau-toolbar__indent">
              <span>Indent</span>
              <select
                value={indentSize}
                onChange={(e) => handleIndentChange(Number(e.target.value))}
                aria-label="Indent size"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={8}>8</option>
              </select>
            </label>
          )}

          <button className="beau-toolbar__btn" onClick={handlePaste}>
            Paste
          </button>
          <button className="beau-toolbar__btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {/* Editor panes */}
      <div className="beau-panes">
        <div className="beau-pane">
          <div className="beau-pane__header">
            <span>Input</span>
            <span className="beau-pane__meta">
              {input.length > 0 && `${input.length.toLocaleString()} chars`}
            </span>
          </div>
          <textarea
            className="beau-pane__editor"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Paste code here — language will be auto-detected…"
            spellCheck={false}
            aria-label="Code input"
          />
        </div>

        <div className="beau-pane">
          <div className="beau-pane__header">
            <span>
              Output
              {processing && (
                <span className="beau-pane__spinner" aria-label="Processing">
                  …
                </span>
              )}
            </span>
            <button
              className="beau-pane__copy"
              onClick={handleCopy}
              disabled={!output}
              aria-label="Copy output"
              title="Copy to clipboard"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="beau-pane__editor beau-pane__editor--output"
            value={output}
            readOnly
            aria-label="Formatted output"
            aria-live="polite"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="beau-error" role="alert" aria-live="assertive">
          <span className="beau-error__icon" aria-hidden="true">✕</span>
          {error}
        </div>
      )}
    </div>
  );
}
