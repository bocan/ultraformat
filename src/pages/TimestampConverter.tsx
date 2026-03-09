import { useState, useCallback, useEffect } from 'react';
import './TimestampConverter.css';

function formatDate(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatUtc(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

function formatIso(d: Date): string {
  return d.toISOString();
}

function formatRelative(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'ago' : 'from now';

  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) return `${Math.floor(abs / 60_000)} minute${Math.floor(abs / 60_000) !== 1 ? 's' : ''} ${suffix}`;
  if (abs < 86_400_000) return `${Math.floor(abs / 3_600_000)} hour${Math.floor(abs / 3_600_000) !== 1 ? 's' : ''} ${suffix}`;
  if (abs < 2_592_000_000) return `${Math.floor(abs / 86_400_000)} day${Math.floor(abs / 86_400_000) !== 1 ? 's' : ''} ${suffix}`;
  return `${Math.floor(abs / 2_592_000_000)} month${Math.floor(abs / 2_592_000_000) !== 1 ? 's' : ''} ${suffix}`;
}

export default function TimestampConverter() {
  const [input, setInput] = useState('');
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNowTs(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const parsedDate = useCallback((): Date | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Unix timestamp (seconds or milliseconds)
    if (/^\d{1,10}$/.test(trimmed)) {
      return new Date(+trimmed * 1000);
    }
    if (/^\d{13}$/.test(trimmed)) {
      return new Date(+trimmed);
    }

    // Try Date.parse
    const ms = Date.parse(trimmed);
    if (!isNaN(ms)) return new Date(ms);

    return null;
  }, [input])();

  const handleNow = () => {
    setInput(String(Math.floor(Date.now() / 1000)));
  };

  const handleClear = () => setInput('');

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setInput(text);
  };

  const handleCopy = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const formats = parsedDate
    ? [
        { label: 'Unix (seconds)', value: String(Math.floor(parsedDate.getTime() / 1000)) },
        { label: 'Unix (milliseconds)', value: String(parsedDate.getTime()) },
        { label: 'Local', value: formatDate(parsedDate) },
        { label: 'UTC', value: formatUtc(parsedDate) },
        { label: 'ISO 8601', value: formatIso(parsedDate) },
        { label: 'Relative', value: formatRelative(parsedDate) },
      ]
    : null;

  return (
    <div className="ts-tool" role="region" aria-label="Timestamp Converter">
      {/* Live clock */}
      <div className="ts-clock" aria-label="Current Unix timestamp">
        <span className="ts-clock__label">Now</span>
        <span className="ts-clock__value">{nowTs}</span>
      </div>

      {/* Input */}
      <div className="ts-input">
        <div className="ts-input__header">
          <span>Input</span>
          <div className="ts-input__controls">
            <button className="ts-input__btn ts-input__btn--now" onClick={handleNow}>Now</button>
            <button className="ts-input__btn" onClick={handlePaste}>Paste</button>
            <button className="ts-input__btn" onClick={handleClear}>Clear</button>
          </div>
        </div>
        <input
          type="text"
          className="ts-input__field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Unix timestamp, ISO date, or any parseable date string…"
          spellCheck={false}
          aria-label="Timestamp or date input"
        />
      </div>

      {/* Results */}
      {formats ? (
        <div className="ts-results" aria-label="Converted timestamps">
          {formats.map((f) => (
            <div key={f.label} className="ts-card">
              <div className="ts-card__header">
                <span>{f.label}</span>
                <button
                  className={`ts-card__copy ${copiedField === f.label ? 'ts-card__copy--done' : ''}`}
                  onClick={() => handleCopy(f.label, f.value)}
                  aria-label={`Copy ${f.label}`}
                >
                  {copiedField === f.label ? '✓' : 'Copy'}
                </button>
              </div>
              <div className="ts-card__value">{f.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ts-empty">
          {input ? 'Could not parse this date or timestamp' : 'Enter a timestamp or date above to convert'}
        </div>
      )}
    </div>
  );
}
