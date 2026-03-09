import { useState, useCallback } from 'react';
import './LoremGenerator.css';

type Style = 'classic' | 'hipster';
type Unit = 'paragraphs' | 'sentences' | 'words';

const CLASSIC_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
  'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
  'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
  'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
  'explicabo', 'nemo', 'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
  'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi',
  'nesciunt', 'neque', 'porro', 'quisquam', 'nihil', 'impedit', 'quo', 'minus',
];

const HIPSTER_WORDS = [
  'artisan', 'kombucha', 'aesthetic', 'vinyl', 'sustainable', 'craft', 'brooklyn',
  'avocado', 'toast', 'fixie', 'helvetica', 'selfies', 'thundercats', 'brunch',
  'typewriter', 'gastropub', 'vexillologist', 'tacos', 'poutine', 'normcore',
  'kinfolk', 'literally', 'heirloom', 'chambray', 'microdosing', 'cold-pressed',
  'skateboard', 'mustache', 'wayfarers', 'portland', 'shoreditch', 'listicle',
  'flannel', 'enamel', 'pin', 'pitchfork', 'stumptown', 'cardigan', 'copper',
  'mug', 'gluten-free', 'gentrify', 'meditation', 'chia', 'plaid', 'bitters',
  'banjo', 'crucifix', 'jean', 'shorts', 'squid', 'bushwick', 'truffaut',
  'messenger', 'bag', 'tumblr', 'dreamcatcher', 'edison', 'bulb', 'XOXO',
  'tattooed', 'cred', 'paleo', 'raw', 'denim', 'swag', 'semiotics',
  'authentic', 'irony', 'single-origin', 'coffee', 'woke', 'echo', 'park',
  'disrupt', 'vegan', 'cornhole', 'blue', 'bottle', 'sriracha', 'tote',
  'lomo', 'chartreuse', 'poke', 'meh', 'unicorn', 'farm-to-table', 'retro',
  'lo-fi', 'pabst', 'distillery', 'raclette', 'fanny', 'pack', 'succulents',
  'polaroid', 'slow-carb', 'scenester', 'hashtag', 'church-key', 'flexitarian',
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSentence(words: string[], minWords: number, maxWords: number): string {
  const count = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const parts: string[] = [];
  for (let i = 0; i < count; i++) parts.push(pick(words));
  parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.join(' ') + '.';
}

function generateParagraph(words: string[]): string {
  const sentenceCount = 4 + Math.floor(Math.random() * 4); // 4-7 sentences
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(generateSentence(words, 6, 16));
  }
  return sentences.join(' ');
}

function generate(style: Style, unit: Unit, count: number): string {
  const words = style === 'classic' ? CLASSIC_WORDS : HIPSTER_WORDS;

  if (unit === 'words') {
    const parts: string[] = [];
    for (let i = 0; i < count; i++) parts.push(pick(words));
    parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return parts.join(' ') + '.';
  }

  if (unit === 'sentences') {
    const sentences: string[] = [];
    for (let i = 0; i < count; i++) {
      sentences.push(generateSentence(words, 6, 16));
    }
    return sentences.join(' ');
  }

  // paragraphs
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i++) {
    paragraphs.push(generateParagraph(words));
  }
  return paragraphs.join('\n\n');
}

export default function LoremGenerator() {
  const [style, setStyle] = useState<Style>('classic');
  const [unit, setUnit] = useState<Unit>('paragraphs');
  const [count, setCount] = useState(3);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    setOutput(generate(style, unit, count));
  }, [style, unit, count]);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => setOutput('');

  return (
    <div className="lorem-tool" role="region" aria-label="Lorem Generator">
      {/* Toolbar */}
      <div className="lorem-toolbar" role="toolbar" aria-label="Lorem options">
        <div className="lorem-toolbar__tabs" role="tablist" aria-label="Lorem style">
          {(['classic', 'hipster'] as Style[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={style === s}
              className={`lorem-toolbar__tab ${style === s ? 'lorem-toolbar__tab--active' : ''}`}
              onClick={() => setStyle(s)}
            >
              {s === 'classic' ? 'Classic' : 'Hipster'}
            </button>
          ))}
        </div>

        <div className="lorem-toolbar__options">
          <label className="lorem-toolbar__label">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="lorem-toolbar__select"
              aria-label="Text unit"
            >
              <option value="paragraphs">Paragraphs</option>
              <option value="sentences">Sentences</option>
              <option value="words">Words</option>
            </select>
          </label>

          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, +e.target.value || 1)))}
            className="lorem-toolbar__count"
            aria-label="Count"
          />

          <button className="lorem-toolbar__btn lorem-toolbar__btn--generate" onClick={handleGenerate}>
            Generate
          </button>
          <button className="lorem-toolbar__btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="lorem-output">
        <div className="lorem-output__header">
          <span>Output</span>
          <div className="lorem-output__meta">
            {output && (
              <span className="lorem-output__stats">
                {output.split(/\s+/).filter(Boolean).length} words
              </span>
            )}
            <button
              className="lorem-output__copy"
              onClick={handleCopy}
              disabled={!output}
              aria-label="Copy output"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <textarea
          className="lorem-output__editor"
          value={output}
          readOnly
          placeholder="Click Generate to create lorem ipsum text…"
          aria-label="Generated text output"
          aria-live="polite"
        />
      </div>
    </div>
  );
}
