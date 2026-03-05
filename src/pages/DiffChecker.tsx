import { useState, useCallback, useMemo } from 'react';
import { diffLines, diffStats, highlightLine, type DiffLine, type CharSpan } from '../lib/diff';
import './DiffChecker.css';

type ViewMode = 'split' | 'inline';

/** Render a line's text with character-level highlight marks */
function HighlightedText({ spans }: { spans: CharSpan[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.type === 'equal' ? (
          <span key={i}>{span.value}</span>
        ) : (
          <mark key={i} className={`diff-hl diff-hl--${span.type}`}>
            {span.value}
          </mark>
        ),
      )}
    </>
  );
}

export default function DiffChecker() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const diff = useMemo(() => diffLines(original, modified), [original, modified]);
  const stats = useMemo(() => diffStats(diff), [diff]);
  const hasDiff = original.trim() !== '' || modified.trim() !== '';

  const handleSwap = useCallback(() => {
    setOriginal(modified);
    setModified(original);
  }, [original, modified]);

  const handleClear = useCallback(() => {
    setOriginal('');
    setModified('');
  }, []);

  // Split the diff into left/right columns for side-by-side view
  const splitColumns = useMemo(() => {
    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];

    let i = 0;
    while (i < diff.length) {
      if (diff[i].type === 'equal') {
        left.push(diff[i]);
        right.push(diff[i]);
        i++;
      } else {
        // Collect contiguous removed/added block
        const removedBlock: DiffLine[] = [];
        const addedBlock: DiffLine[] = [];
        while (i < diff.length && diff[i].type === 'removed') {
          removedBlock.push(diff[i]);
          i++;
        }
        while (i < diff.length && diff[i].type === 'added') {
          addedBlock.push(diff[i]);
          i++;
        }
        const max = Math.max(removedBlock.length, addedBlock.length);
        for (let k = 0; k < max; k++) {
          left.push(k < removedBlock.length ? removedBlock[k] : null);
          right.push(k < addedBlock.length ? addedBlock[k] : null);
        }
      }
    }
    return { left, right };
  }, [diff]);

  // Pre-compute character-level highlights for paired changed lines
  type HighlightMap = Map<DiffLine, CharSpan[]>;
  const highlights = useMemo<{ old: HighlightMap; new: HighlightMap }>(() => {
    const oldMap: HighlightMap = new Map();
    const newMap: HighlightMap = new Map();

    // Walk through diff pairing contiguous removed/added blocks
    let i = 0;
    while (i < diff.length) {
      if (diff[i].type === 'equal') {
        i++;
        continue;
      }
      const removedBlock: DiffLine[] = [];
      const addedBlock: DiffLine[] = [];
      while (i < diff.length && diff[i].type === 'removed') {
        removedBlock.push(diff[i]);
        i++;
      }
      while (i < diff.length && diff[i].type === 'added') {
        addedBlock.push(diff[i]);
        i++;
      }
      // Pair them up 1:1 for char-level highlight
      const pairs = Math.min(removedBlock.length, addedBlock.length);
      for (let k = 0; k < pairs; k++) {
        const { oldSpans, newSpans } = highlightLine(removedBlock[k].value, addedBlock[k].value);
        oldMap.set(removedBlock[k], oldSpans);
        newMap.set(addedBlock[k], newSpans);
      }
    }
    return { old: oldMap, new: newMap };
  }, [diff]);

  /** Render the text content of a diff line, with char highlights if available */
  const renderLineText = (line: DiffLine) => {
    const spans = line.type === 'removed' ? highlights.old.get(line) : highlights.new.get(line);
    if (spans) return <HighlightedText spans={spans} />;
    return <>{line.value}</>;
  };

  return (
    <div className="diff-tool" role="region" aria-label="Diff Checker">
      {/* Toolbar */}
      <div className="diff-toolbar" role="toolbar" aria-label="Diff operations">
        <div className="diff-toolbar__tabs" role="tablist" aria-label="View mode">
          {(['split', 'inline'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              className={`diff-toolbar__tab ${viewMode === mode ? 'diff-toolbar__tab--active' : ''}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'split' ? 'Side by Side' : 'Inline'}
            </button>
          ))}
        </div>

        <div className="diff-toolbar__controls">
          {hasDiff && (
            <div className="diff-toolbar__stats" aria-live="polite">
              <span className="diff-toolbar__stat diff-toolbar__stat--added">+{stats.added}</span>
              <span className="diff-toolbar__stat diff-toolbar__stat--removed">−{stats.removed}</span>
            </div>
          )}
          <button className="diff-toolbar__btn" onClick={handleSwap}>
            Swap
          </button>
          <button className="diff-toolbar__btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {/* Input panes */}
      <div className="diff-inputs">
        <div className="diff-pane">
          <div className="diff-pane__header">
            <span>Original</span>
            <span className="diff-pane__meta">
              {original.length > 0 && `${original.split('\n').length} lines`}
            </span>
          </div>
          <textarea
            className="diff-pane__editor"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Paste original text here…"
            spellCheck={false}
            aria-label="Original text"
          />
        </div>
        <div className="diff-pane">
          <div className="diff-pane__header">
            <span>Modified</span>
            <span className="diff-pane__meta">
              {modified.length > 0 && `${modified.split('\n').length} lines`}
            </span>
          </div>
          <textarea
            className="diff-pane__editor"
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            placeholder="Paste modified text here…"
            spellCheck={false}
            aria-label="Modified text"
          />
        </div>
      </div>

      {/* Diff output */}
      {hasDiff && stats.added + stats.removed > 0 && (
        <div className="diff-output" aria-label="Diff results" role="region">
          <div className="diff-output__header">
            <span>Differences</span>
          </div>
          {viewMode === 'split' ? (
            <div className="diff-split" role="table" aria-label="Side-by-side diff">
              <div className="diff-split__col" role="rowgroup" aria-label="Original">
                {splitColumns.left.map((line, i) => (
                  <div
                    key={i}
                    className={`diff-line ${line ? `diff-line--${line.type}` : 'diff-line--empty'}`}
                    role="row"
                  >
                    <span className="diff-line__no" aria-hidden="true">
                      {line?.oldLineNo ?? ''}
                    </span>
                    <span className="diff-line__prefix" aria-hidden="true">
                      {line?.type === 'removed' ? '−' : line?.type === 'equal' ? ' ' : ''}
                    </span>
                    <span className="diff-line__text" role="cell">
                      {line ? renderLineText(line) : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="diff-split__col" role="rowgroup" aria-label="Modified">
                {splitColumns.right.map((line, i) => (
                  <div
                    key={i}
                    className={`diff-line ${line ? `diff-line--${line.type}` : 'diff-line--empty'}`}
                    role="row"
                  >
                    <span className="diff-line__no" aria-hidden="true">
                      {line?.newLineNo ?? ''}
                    </span>
                    <span className="diff-line__prefix" aria-hidden="true">
                      {line?.type === 'added' ? '+' : line?.type === 'equal' ? ' ' : ''}
                    </span>
                    <span className="diff-line__text" role="cell">
                      {line ? renderLineText(line) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="diff-inline" role="table" aria-label="Inline diff">
              {diff.map((line, i) => (
                <div
                  key={i}
                  className={`diff-line diff-line--${line.type}`}
                  role="row"
                >
                  <span className="diff-line__no diff-line__no--old" aria-hidden="true">
                    {line.oldLineNo ?? ''}
                  </span>
                  <span className="diff-line__no diff-line__no--new" aria-hidden="true">
                    {line.newLineNo ?? ''}
                  </span>
                  <span className="diff-line__prefix" aria-hidden="true">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                  </span>
                  <span className="diff-line__text" role="cell">
                    {line.type === 'equal' ? line.value : renderLineText(line)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasDiff && stats.added === 0 && stats.removed === 0 && (
        <div className="diff-match" role="status">
          <span className="diff-match__icon" aria-hidden="true">✓</span>
          Texts are identical — no differences found.
        </div>
      )}
    </div>
  );
}
