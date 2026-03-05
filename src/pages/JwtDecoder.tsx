import { useState, useMemo } from 'react';
import './JwtDecoder.css';

/** Decode a Base64URL string to UTF-8 */
function b64urlDecode(str: string): string {
  // Restore standard Base64 padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Known JWT claims with human-readable labels */
const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires At',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
};

/** Format a unix timestamp as ISO + relative */
function formatTimestamp(ts: number): { iso: string; expired?: boolean } {
  const d = new Date(ts * 1000);
  return {
    iso: d.toISOString(),
    expired: ts * 1000 < Date.now(),
  };
}

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const { decoded, error } = useMemo((): {
    decoded: DecodedJwt | null;
    error: string;
  } => {
    const trimmed = token.trim();
    if (!trimmed) return { decoded: null, error: '' };

    const parts = trimmed.split('.');
    if (parts.length !== 3)
      return { decoded: null, error: 'JWT must have 3 parts separated by dots' };

    try {
      const header = JSON.parse(b64urlDecode(parts[0]));
      const payload = JSON.parse(b64urlDecode(parts[1]));
      return { decoded: { header, payload, signature: parts[2] }, error: '' };
    } catch (e) {
      return {
        decoded: null,
        error: e instanceof Error ? e.message : 'Failed to decode JWT',
      };
    }
  }, [token]);

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setToken(text);
  };

  const handleClear = () => setToken('');

  const handleCopySection = async (key: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 1500);
  };

  const renderClaimValue = (key: string, value: unknown) => {
    // Timestamp claims
    if (['exp', 'nbf', 'iat'].includes(key) && typeof value === 'number') {
      const { iso, expired } = formatTimestamp(value);
      const isExp = key === 'exp';
      return (
        <span
          className={
            isExp
              ? expired
                ? 'jwt-claims__val--expired'
                : 'jwt-claims__val--valid'
              : ''
          }
        >
          {iso}
          {isExp && (
            <span className="jwt-claims__sub">
              {expired ? '⚠ Expired' : '✓ Valid'}
            </span>
          )}
        </span>
      );
    }

    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="jwt-tool" role="region" aria-label="JWT Decoder">
      {/* Token input */}
      <div className="jwt-input">
        <div className="jwt-input__header">
          <span>JWT Token</span>
          <div className="jwt-input__controls">
            <button
              className="jwt-input__btn"
              onClick={handlePaste}
              title="Paste from clipboard"
            >
              Paste
            </button>
            <button
              className="jwt-input__btn"
              onClick={handleClear}
              title="Clear input"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          className="jwt-input__editor"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste a JWT token (eyJhbG…)…"
          spellCheck={false}
          aria-label="JWT token input"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="jwt-error" role="alert" aria-live="assertive">
          <span className="jwt-error__icon" aria-hidden="true">✕</span>
          {error}
        </div>
      )}

      {/* Decoded sections */}
      {decoded ? (
        <div className="jwt-sections">
          {/* Header */}
          <div className="jwt-section">
            <div className="jwt-section__header jwt-section__header--header">
              <span>Header</span>
              <button
                className={`jwt-section__copy ${copiedSection === 'header' ? 'jwt-section__copy--done' : ''}`}
                onClick={() =>
                  handleCopySection('header', JSON.stringify(decoded.header, null, 2))
                }
                title="Copy header JSON"
              >
                {copiedSection === 'header' ? '✓' : 'Copy'}
              </button>
            </div>
            <div className="jwt-section__body">
              <table className="jwt-claims" aria-label="JWT header claims">
                <tbody>
                  {Object.entries(decoded.header).map(([k, v]) => (
                    <tr key={k}>
                      <td className="jwt-claims__key">{k}</td>
                      <td className="jwt-claims__val">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payload */}
          <div className="jwt-section">
            <div className="jwt-section__header jwt-section__header--payload">
              <span>Payload</span>
              <button
                className={`jwt-section__copy ${copiedSection === 'payload' ? 'jwt-section__copy--done' : ''}`}
                onClick={() =>
                  handleCopySection('payload', JSON.stringify(decoded.payload, null, 2))
                }
                title="Copy payload JSON"
              >
                {copiedSection === 'payload' ? '✓' : 'Copy'}
              </button>
            </div>
            <div className="jwt-section__body">
              <table className="jwt-claims" aria-label="JWT payload claims">
                <tbody>
                  {Object.entries(decoded.payload).map(([k, v]) => (
                    <tr key={k}>
                      <td className="jwt-claims__key">
                        {k}
                        {CLAIM_LABELS[k] && (
                          <span className="jwt-claims__sub">{CLAIM_LABELS[k]}</span>
                        )}
                      </td>
                      <td className="jwt-claims__val">{renderClaimValue(k, v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature */}
          <div className="jwt-section">
            <div className="jwt-section__header jwt-section__header--signature">
              <span>Signature</span>
              <button
                className={`jwt-section__copy ${copiedSection === 'sig' ? 'jwt-section__copy--done' : ''}`}
                onClick={() => handleCopySection('sig', decoded.signature)}
                title="Copy signature"
              >
                {copiedSection === 'sig' ? '✓' : 'Copy'}
              </button>
            </div>
            <div className="jwt-section__body">
              <code className="jwt-sig-raw">{decoded.signature}</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="jwt-empty">
          {!error && 'Paste a JWT above to decode it'}
        </div>
      )}
    </div>
  );
}
