import { useState, useCallback } from 'react';
import './JsonFormatter.css';

type Tab = 'format' | 'minify' | 'validate';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('format');
  const [indentSize, setIndentSize] = useState(2);
  const [copied, setCopied] = useState(false);

  const process = useCallback(
    (raw: string, mode: Tab, indent: number) => {
      if (!raw.trim()) {
        setOutput('');
        setError('');
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        setError('');
        switch (mode) {
          case 'format':
            setOutput(JSON.stringify(parsed, null, indent));
            break;
          case 'minify':
            setOutput(JSON.stringify(parsed));
            break;
          case 'validate':
            setOutput('✓ Valid JSON');
            break;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid JSON';
        setError(msg);
        setOutput('');
      }
    },
    [],
  );

  const handleInput = (value: string) => {
    setInput(value);
    process(value, activeTab, indentSize);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    process(input, tab, indentSize);
  };

  const handleIndentChange = (size: number) => {
    setIndentSize(size);
    process(input, activeTab, size);
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
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    handleInput(text);
  };

  return (
    <div className="json-tool" role="region" aria-label="JSON Formatter">
      {/* Toolbar */}
      <div className="json-toolbar" role="toolbar" aria-label="JSON operations">
        <div className="json-toolbar__tabs" role="tablist" aria-label="Operation mode">
          {(['format', 'minify', 'validate'] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`json-toolbar__tab ${activeTab === tab ? 'json-toolbar__tab--active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="json-toolbar__controls">
          {activeTab === 'format' && (
            <label className="json-toolbar__indent">
              <span>Indent</span>
              <select
                value={indentSize}
                onChange={(e) => handleIndentChange(Number(e.target.value))}
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
                <option value={1}>Tab</option>
              </select>
            </label>
          )}
          <button className="json-toolbar__btn" onClick={handlePaste}>
            Paste
          </button>
          <button className="json-toolbar__btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {/* Editor panes */}
      <div className="json-panes">
        <div className="json-pane">
          <div className="json-pane__header">
            <span>Input</span>
            <span className="json-pane__meta">
              {input.length > 0 && `${input.length.toLocaleString()} chars`}
            </span>
          </div>
          <textarea
            className="json-pane__editor"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder='Paste or type JSON here…'
            spellCheck={false}
            aria-label="JSON input"
          />
        </div>

        <div className="json-pane">
          <div className="json-pane__header">
            <span>Output</span>
            <button
              className={`json-pane__copy ${copied ? 'json-pane__copy--done' : ''}`}
              onClick={handleCopy}
              disabled={!output}
              title="Copy to clipboard"
              aria-label="Copy output"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          {error ? (
            <div className="json-pane__error" role="alert" aria-live="assertive">
              <span className="json-pane__error-icon" aria-hidden="true">✕</span>
              {error}
            </div>
          ) : (
            <textarea
              className="json-pane__editor json-pane__editor--output"
              value={output}
              readOnly
              placeholder="Output will appear here…"
              aria-label="JSON output"
              aria-live="polite"
            />
          )}
        </div>
      </div>
    </div>
  );
}
