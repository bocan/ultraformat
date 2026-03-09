import { useState, useCallback } from 'react';
import './UuidGenerator.css';

function generateUuidV4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export default function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [noDashes, setNoDashes] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      let uuid = generateUuidV4();
      if (noDashes) uuid = uuid.replace(/-/g, '');
      if (uppercase) uuid = uuid.toUpperCase();
      list.push(uuid);
    }
    setUuids(list);
  }, [count, uppercase, noDashes]);

  const handleCopyAll = async () => {
    if (!uuids.length) return;
    await navigator.clipboard.writeText(uuids.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopySingle = async (uuid: string) => {
    await navigator.clipboard.writeText(uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => setUuids([]);

  return (
    <div className="uuid-tool" role="region" aria-label="UUID Generator">
      {/* Toolbar */}
      <div className="uuid-toolbar" role="toolbar" aria-label="UUID options">
        <div className="uuid-toolbar__group">
          <label className="uuid-toolbar__label">
            Count
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(500, +e.target.value || 1)))}
              className="uuid-toolbar__count"
              aria-label="Number of UUIDs"
            />
          </label>

          <label className="uuid-toolbar__checkbox">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
            />
            Uppercase
          </label>

          <label className="uuid-toolbar__checkbox">
            <input
              type="checkbox"
              checked={noDashes}
              onChange={(e) => setNoDashes(e.target.checked)}
            />
            No dashes
          </label>
        </div>

        <div className="uuid-toolbar__actions">
          <button className="uuid-toolbar__btn uuid-toolbar__btn--generate" onClick={handleGenerate}>
            Generate
          </button>
          <button className="uuid-toolbar__btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="uuid-output">
        <div className="uuid-output__header">
          <span>Generated UUIDs {uuids.length > 0 && `(${uuids.length})`}</span>
          <button
            className="uuid-output__copy"
            onClick={handleCopyAll}
            disabled={!uuids.length}
            aria-label="Copy all UUIDs"
          >
            {copied ? '✓ Copied' : 'Copy All'}
          </button>
        </div>
        <div className="uuid-output__list" aria-label="UUID list">
          {uuids.length > 0 ? (
            uuids.map((uuid, i) => (
              <div key={i} className="uuid-output__item">
                <code className="uuid-output__value">{uuid}</code>
                <button
                  className="uuid-output__item-copy"
                  onClick={() => handleCopySingle(uuid)}
                  aria-label={`Copy UUID ${i + 1}`}
                  title="Copy"
                >
                  Copy
                </button>
              </div>
            ))
          ) : (
            <div className="uuid-output__empty">
              Click Generate to create UUIDs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
