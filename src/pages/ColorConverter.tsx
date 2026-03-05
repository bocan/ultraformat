import { useState, useMemo, useCallback } from 'react';
import './ColorConverter.css';

/* ── Color math helpers ── */
interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function rgbToHex({ r, g, b }: RGB): string {
  const hex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hexToRgb(hex: string): RGB | null {
  const m = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = h / 360;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

/** Parse any supported color string → RGB */
function parseColor(input: string): RGB | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // HEX
  const hex = hexToRgb(s);
  if (hex) return hex;

  // rgb(r, g, b) or rgb(r g b)
  const rgbMatch = s.match(/^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/);
  if (rgbMatch) {
    return {
      r: clamp(+rgbMatch[1], 0, 255),
      g: clamp(+rgbMatch[2], 0, 255),
      b: clamp(+rgbMatch[3], 0, 255),
    };
  }

  // hsl(h, s%, l%) or hsl(h s% l%)
  const hslMatch = s.match(/^hsla?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})%?\s*[,\s]\s*(\d{1,3})%?/);
  if (hslMatch) {
    return hslToRgb({
      h: clamp(+hslMatch[1], 0, 360),
      s: clamp(+hslMatch[2], 0, 100),
      l: clamp(+hslMatch[3], 0, 100),
    });
  }

  return null;
}

const FORMATS = ['HEX', 'RGB', 'HSL'] as const;

export default function ColorConverter() {
  const [input, setInput] = useState('');
  const [pickerColor, setPickerColor] = useState('#ff7043');
  const [copiedFmt, setCopiedFmt] = useState<string | null>(null);

  const rgb = useMemo(() => parseColor(input), [input]);

  const formats = useMemo(() => {
    if (!rgb) return null;
    const hsl = rgbToHsl(rgb);
    return {
      HEX: rgbToHex(rgb),
      RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      HSL: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    };
  }, [rgb]);

  const hexForSwatch = formats?.HEX ?? 'transparent';

  const handlePickerChange = (hex: string) => {
    setPickerColor(hex);
    setInput(hex);
  };

  const handleCopy = async (fmt: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedFmt(fmt);
    setTimeout(() => setCopiedFmt(null), 1500);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setInput(text);
  };

  const handleClear = () => setInput('');

  // RGB sliders
  const handleSlider = useCallback(
    (channel: 'r' | 'g' | 'b', value: number) => {
      const base = rgb ?? { r: 0, g: 0, b: 0 };
      const next = { ...base, [channel]: clamp(value, 0, 255) };
      setInput(rgbToHex(next));
    },
    [rgb]
  );

  return (
    <div className="clr-tool" role="region" aria-label="Color Converter">
      {/* Input row */}
      <div className="clr-input-row">
        <div className="clr-input">
          <div className="clr-input__header">
            <span>Color Input</span>
            <div className="clr-input__controls">
              <button className="clr-input__btn" onClick={handlePaste} title="Paste from clipboard">
                Paste
              </button>
              <button className="clr-input__btn" onClick={handleClear} title="Clear input">
                Clear
              </button>
            </div>
          </div>
          <div className="clr-input__field">
            <input
              className="clr-input__text"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="#FF7043, rgb(255,112,67), hsl(14,100%,63%)…"
              spellCheck={false}
              aria-label="Color value input"
            />
            <input
              className="clr-input__picker"
              type="color"
              value={pickerColor}
              onChange={(e) => handlePickerChange(e.target.value)}
              aria-label="Color picker"
              title="Pick a color"
            />
          </div>
        </div>

        <div
          className="clr-preview"
          style={{ '--swatch-color': hexForSwatch } as React.CSSProperties}
        >
          <div className="clr-preview__swatch" aria-label={`Color preview: ${hexForSwatch}`} />
          <span className="clr-preview__label">Preview</span>
        </div>
      </div>

      {/* Format output cards */}
      {formats ? (
        <>
          <div className="clr-formats" aria-label="Color format conversions">
            {FORMATS.map((fmt) => (
              <div key={fmt} className="clr-card">
                <div className="clr-card__header">
                  <span>{fmt}</span>
                  <button
                    className={`clr-card__copy ${copiedFmt === fmt ? 'clr-card__copy--done' : ''}`}
                    onClick={() => handleCopy(fmt, formats[fmt])}
                    title="Copy to clipboard"
                    aria-label={`Copy ${fmt} value`}
                  >
                    {copiedFmt === fmt ? '✓' : 'Copy'}
                  </button>
                </div>
                <div className="clr-card__value">{formats[fmt]}</div>
              </div>
            ))}
          </div>

          {/* RGB Sliders */}
          <div className="clr-sliders">
            <div className="clr-sliders__header">RGB Channels</div>
            {(['r', 'g', 'b'] as const).map((ch) => (
              <div key={ch} className="clr-slider-row">
                <span className="clr-slider-row__label">{ch.toUpperCase()}</span>
                <input
                  className="clr-slider-row__input"
                  type="range"
                  min={0}
                  max={255}
                  value={rgb?.[ch] ?? 0}
                  onChange={(e) => handleSlider(ch, +e.target.value)}
                  aria-label={`${ch.toUpperCase()} channel`}
                />
                <span className="clr-slider-row__val">{rgb?.[ch] ?? 0}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="clr-empty">
          {input ? 'Unrecognised color format' : 'Enter a color above to convert it'}
        </div>
      )}
    </div>
  );
}
