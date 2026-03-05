import { useState, useMemo } from 'react';
import './UrlCodec.css';

type Mode = 'encode' | 'decode';
type Scope = 'component' | 'full';

export default function UrlCodec() {
  const [mode, setMode] = useState<Mode>('encode');
  const [scope, setScope] = useState<Scope>('component');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: '' };
    try {
      if (mode === 'encode') {
        const encoded =
          scope === 'component'
            ? encodeURIComponent(input)
            : encodeURI(input);
        return { output: encoded, error: '' };
      } else {
        const decoded =
          scope === 'component'
            ? decodeURIComponent(input)
            : decodeURI(input);
        return { output: decoded, error: '' };
      }
    } catch (e) {
      return {
        output: '',
        error: e instanceof Error ? e.message : 'Invalid input',
      };
    }
  }, [input, mode, scope]);

  // Parse query params from the decoded side
  const params = useMemo(() => {
    const text = mode === 'encode' ? input : output;
    if (!text) return [];
    try {
      const qIdx = text.indexOf('?');
      const queryPart = qIdx >= 0 ? text.slice(qIdx + 1) : text;
      // Only parse if it looks like key=value pairs
      if (!queryPart.includes('=')) return [];
      const sp = new URLSearchParams(queryPart);
      const entries: [string, string][] = [];
      sp.forEach((v, k) => entries.push([k, v]));
      return entries;
    } catch {
      return [];
    }
  }, [input, output, mode]);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSwap = () => {
    setInput(output);
    setMode((m) => (m === 'encode' ? 'decode' : 'encode'));
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setInput(text);
  };

  const handleClear = () => setInput('');

  return (
    <div className="url-tool" role="region" aria-label="URL Encoder / Decoder">
      {/* Toolbar */}
      <div className="url-toolbar" role="toolbar" aria-label="URL Codec controls">
        <div className="url-toolbar__tabs" role="tablist">
          <button
            className={`url-toolbar__tab ${mode === 'encode' ? 'url-toolbar__tab--active' : ''}`}
            role="tab"
            aria-selected={mode === 'encode'}
            onClick={() => setMode('encode')}
          >
            Encode
          </button>
          <button
            className={`url-toolbar__tab ${mode === 'decode' ? 'url-toolbar__tab--active' : ''}`}
            role="tab"
            aria-selected={mode === 'decode'}
            onClick={() => setMode('decode')}
          >
            Decode
          </button>
        </div>

        <div className="url-toolbar__controls">
          <label className="url-toolbar__scope">
            Scope
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              <option value="component">Component</option>
              <option value="full">Full URI</option>
            </select>
          </label>
          <button className="url-toolbar__btn" onClick={handleSwap} title="Swap input and output">
            Swap
          </button>
          <button className="url-toolbar__btn" onClick={handlePaste} title="Paste from clipboard">
            Paste
          </button>
          <button className="url-toolbar__btn" onClick={handleClear} title="Clear input">
            Clear
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="url-error" role="alert" aria-live="assertive">
          <span className="url-error__icon" aria-hidden="true">✕</span>
          {error}
        </div>
      )}

      {/* Panes */}
      <div className="url-panes">
        <div className="url-pane">
          <div className="url-pane__header">
            <span>Input{mode === 'encode' ? ' (Plain)' : ' (Encoded)'}</span>
            <span className="url-pane__meta">
              {input.length > 0 && `${input.length.toLocaleString()} chars`}
            </span>
          </div>
          <textarea
            className="url-pane__editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'encode'
                ? 'Paste URL or text to encode…'
                : 'Paste encoded URL to decode…'
            }
            spellCheck={false}
            aria-label={mode === 'encode' ? 'Plain text input' : 'Encoded URL input'}
          />
        </div>

        <div className="url-pane">
          <div className="url-pane__header">
            <span>Output{mode === 'encode' ? ' (Encoded)' : ' (Decoded)'}</span>
            <button
              className={`url-pane__copy ${copied ? 'url-pane__copy--done' : ''}`}
              onClick={handleCopy}
              disabled={!output}
              aria-label="Copy output"
              title="Copy to clipboard"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="url-pane__editor url-pane__editor--output"
            value={output}
            readOnly
            aria-label={mode === 'encode' ? 'Encoded output' : 'Decoded output'}
            aria-live="polite"
          />
        </div>
      </div>

      {/* Parsed Query Params */}
      <div className="url-params">
        <div className="url-params__header">
          <span>Query Parameters</span>
          <span className="url-pane__meta">
            {params.length > 0 && `${params.length} param${params.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {params.length > 0 ? (
          <table className="url-params__table" aria-label="Parsed query parameters">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {params.map(([k, v], i) => (
                <tr key={i}>
                  <td className="url-params__key">{k}</td>
                  <td className="url-params__val">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="url-params__empty">
            {input ? 'No query parameters detected' : 'Query parameters will be parsed here…'}
          </div>
        )}
      </div>
    </div>
  );
}
