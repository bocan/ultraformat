export interface CharSpan {
  type: 'equal' | 'added' | 'removed';
  value: string;
}

export interface DiffLine {
  type: 'equal' | 'added' | 'removed';
  value: string;
  oldLineNo?: number;
  newLineNo?: number;
}

/**
 * Myers-style LCS line diff — runs entirely in the browser.
 * Returns an array of DiffLine objects representing the diff.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const n = oldLines.length;
  const m = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'equal', value: oldLines[i - 1], oldLineNo: i, newLineNo: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', value: newLines[j - 1], newLineNo: j });
      j--;
    } else {
      result.push({ type: 'removed', value: oldLines[i - 1], oldLineNo: i });
      i--;
    }
  }

  return result.reverse();
}

/** Summary stats for a diff */
export function diffStats(lines: DiffLine[]) {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.type === 'added') added++;
    else if (line.type === 'removed') removed++;
  }
  return { added, removed, total: lines.length };
}

/**
 * Character-level LCS diff between two strings.
 * Returns spans of equal / added / removed characters.
 */
export function diffChars(oldStr: string, newStr: string): CharSpan[] {
  const n = oldStr.length;
  const m = newStr.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldStr[i - 1] === newStr[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const raw: CharSpan[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldStr[i - 1] === newStr[j - 1]) {
      raw.push({ type: 'equal', value: oldStr[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: 'added', value: newStr[j - 1] });
      j--;
    } else {
      raw.push({ type: 'removed', value: oldStr[i - 1] });
      i--;
    }
  }
  raw.reverse();

  // Merge consecutive same-type spans
  const merged: CharSpan[] = [];
  for (const span of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === span.type) {
      last.value += span.value;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

/**
 * Given paired removed/added lines, returns char-level highlight spans.
 * Feed a removed line and its paired added line to get spans for each side.
 */
export function highlightLine(
  oldValue: string,
  newValue: string,
): { oldSpans: CharSpan[]; newSpans: CharSpan[] } {
  const chars = diffChars(oldValue, newValue);
  const oldSpans: CharSpan[] = [];
  const newSpans: CharSpan[] = [];

  for (const span of chars) {
    if (span.type === 'equal') {
      oldSpans.push({ type: 'equal', value: span.value });
      newSpans.push({ type: 'equal', value: span.value });
    } else if (span.type === 'removed') {
      oldSpans.push({ type: 'removed', value: span.value });
    } else {
      newSpans.push({ type: 'added', value: span.value });
    }
  }
  return { oldSpans, newSpans };
}
