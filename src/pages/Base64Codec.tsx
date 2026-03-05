import { useState, useCallback, useRef } from 'react';
import './Base64Codec.css';

type Mode = 'encode' | 'decode';

export default function Base64Codec() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const process = useCallback((raw: string, m: Mode) => {
    if (!raw.trim()) {
      setOutput('');
      setError('');
      return;
    }
    try {
      if (m === 'encode') {
        // TextEncoder handles full unicode safely
        const bytes = new TextEncoder().encode(raw);
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        setOutput(btoa(binary));
      } else {
        const binary = atob(raw.replace(/\s/g, ''));
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        setOutput(new TextDecoder().decode(bytes));
      }
      setError('');
    } catch {
      setError(m === 'decode' ? 'Invalid Base64 string' : 'Encoding failed');
      setOutput('');
    }
  }, []);

  const handleInput = (value: string) => {
    setInput(value);
    setFileName('');
    process(value, mode);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    process(input, m);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    if (mode === 'encode') {
      reader.onload = () => {
        const result = reader.result as string;
        // Extract the base64 portion from the data URL
        const base64 = result.split(',')[1] ?? '';
        setInput(`[File: ${file.name}]`);
        setOutput(base64);
        setError('');
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        const text = reader.result as string;
        setInput(text);
        process(text, mode);
      };
      reader.readAsText(file);
    }
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
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    handleInput(text);
  };

  const handleSwap = () => {
    const prev = output;
    setInput(prev);
    setFileName('');
    const newMode: Mode = mode === 'encode' ? 'decode' : 'encode';
    setMode(newMode);
    process(prev, newMode);
  };

  return (
    <div className="b64-tool" role="region" aria-label="Base64 Codec">
      {/* Toolbar */}
      <div className="b64-toolbar" role="toolbar" aria-label="Base64 operations">
        <div className="b64-toolbar__tabs" role="tablist" aria-label="Operation mode">
          {(['encode', 'decode'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className={`b64-toolbar__tab ${mode === m ? 'b64-toolbar__tab--active' : ''}`}
              onClick={() => handleModeChange(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="b64-toolbar__controls">
          <label className="b64-toolbar__file-btn">
            File
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              onChange={handleFile}
              aria-label="Load file"
            />
          </label>
          <button className="b64-toolbar__btn" onClick={handleSwap}>
            Swap
          </button>
          <button className="b64-toolbar__btn" onClick={handlePaste}>
            Paste
          </button>
          <button className="b64-toolbar__btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {/* Editor panes */}
      <div className="b64-panes">
        <div className="b64-pane">
          <div className="b64-pane__header">
            <span>Input{mode === 'encode' ? ' (Text)' : ' (Base64)'}</span>
            <span className="b64-pane__meta">
              {input.length > 0 && (fileName || `${input.length.toLocaleString()} chars`)}
            </span>
          </div>
          <textarea
            className="b64-pane__editor"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Type or paste text to encode…' : 'Paste Base64 string to decode…'}
            spellCheck={false}
            aria-label={mode === 'encode' ? 'Text input' : 'Base64 input'}
          />
        </div>

        <div className="b64-pane">
          <div className="b64-pane__header">
            <span>Output{mode === 'encode' ? ' (Base64)' : ' (Text)'}</span>
            <button
              className="b64-pane__copy"
              onClick={handleCopy}
              disabled={!output}
              aria-label="Copy output"
              title="Copy to clipboard"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            className="b64-pane__editor b64-pane__editor--output"
            value={output}
            readOnly
            aria-label={mode === 'encode' ? 'Base64 output' : 'Decoded text output'}
            aria-live="polite"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="b64-error" role="alert" aria-live="assertive">
          <span className="b64-error__icon" aria-hidden="true">✕</span>
          {error}
        </div>
      )}
    </div>
  );
}
