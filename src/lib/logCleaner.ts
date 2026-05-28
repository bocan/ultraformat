// Pure log cleaning utilities — no React, no side effects.
// Handles Azure DevOps and GitHub Actions raw log formats.

export interface CleanOptions {
  stripTimestamps: boolean;
  stripAnsi: boolean;
  stripAzurePrefix: boolean;   // ##[section], ##[command], ##[error], ##[warning] etc.
  collapseBlankLines: boolean;
  trimLines: boolean;
}

export const DEFAULT_OPTIONS: CleanOptions = {
  stripTimestamps: true,
  stripAnsi: true,
  stripAzurePrefix: true,
  collapseBlankLines: true,
  trimLines: true,
};

export interface CleanResult {
  output: string;
  inputLines: number;
  outputLines: number;
  removedLines: number;
}

// ── Regex patterns ────────────────────────────────────────────────────────────

// ANSI/VT100 escape sequences: ESC[ ... m  plus OSC, cursor movement, etc.
const ANSI_RE =
  // eslint-disable-next-line no-control-regex
  /(\x9B|\x1B\[)[0-?]*[ -/]*[@-~]|\x1B[()][AB012]|\x1B[ABCDEFGHJKST]|\x1B\][^\x07]*\x07|\x1B\][^\x1B]*\x1B\\|\x0F|\x0E|\x1B=/g;

// Azure DevOps timestamp prefix:  2024-01-15T10:23:45.1234567Z  (with or without trailing space)
// Also handles ##[timestamp]2024-01-15T10:23:45.1234567Z format
const AZURE_TS_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s*/;

// GitHub Actions timestamp:  2024-01-15T10:23:45.1234567Z  (same format)
// Also  [hh:mm:ss]  short form used by some runners
const SHORT_TS_RE = /^\[\d{2}:\d{2}:\d{2}\]\s*/;

// Azure DevOps "grouping" / special command prefixes on their own line
// e.g.  ##[section]Starting: Build   ##[command]...   ##[endgroup]
const AZURE_COMMAND_RE = /^##\[([a-z]+)\]/i;

// Azure DevOps group start/end markers used in newer pipelines
// e.g.  ##[group]Restore packages    ##[endgroup]
const AZURE_GROUP_ONLY_RE = /^##\[(?:group|endgroup|section)\]\s*/i;

// ── Per-line processing ───────────────────────────────────────────────────────

function processLine(line: string, opts: CleanOptions): string | null {
  let s = line;

  // Strip ANSI codes first so subsequent regexes see clean text
  if (opts.stripAnsi) {
    s = s.replace(ANSI_RE, '');
  }

  // Strip Azure DevOps timestamps
  if (opts.stripTimestamps) {
    s = s.replace(AZURE_TS_RE, '');
    s = s.replace(SHORT_TS_RE, '');
  }

  // Handle Azure special prefixes
  if (opts.stripAzurePrefix) {
    // Drop lines that are *only* a group/section marker (no useful content)
    if (AZURE_GROUP_ONLY_RE.test(s) && s.replace(AZURE_GROUP_ONLY_RE, '').trim() === '') {
      return null; // drop entirely
    }
    // For other ##[cmd] prefixes, keep the content but remove the marker tag
    // e.g.  ##[section]Starting: Build  →  Starting: Build
    //       ##[error]Something failed    →  Something failed
    if (AZURE_COMMAND_RE.test(s)) {
      const stripped = s.replace(AZURE_COMMAND_RE, '').trim();
      // Drop lines that become empty after stripping
      if (stripped === '') return null;
      s = stripped;
    }
  }

  if (opts.trimLines) {
    s = s.trim();
  }

  return s;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function cleanLog(raw: string, opts: CleanOptions = DEFAULT_OPTIONS): CleanResult {
  const inputLines = raw.split('\n');
  const processed: string[] = [];

  let lastWasBlank = false;

  for (const line of inputLines) {
    const result = processLine(line, opts);

    // null means drop the line entirely
    if (result === null) continue;

    const isBlank = result.trim() === '';

    if (opts.collapseBlankLines) {
      if (isBlank) {
        if (!lastWasBlank) processed.push('');
        lastWasBlank = true;
        continue;
      }
      lastWasBlank = false;
    }

    processed.push(result);
  }

  // Trim leading/trailing blank lines from output
  while (processed.length > 0 && processed[0].trim() === '') processed.shift();
  while (processed.length > 0 && processed[processed.length - 1].trim() === '') processed.pop();

  const output = processed.join('\n');
  const outputLines = output ? processed.length : 0;

  return {
    output,
    inputLines: inputLines.length,
    outputLines,
    removedLines: inputLines.length - outputLines,
  };
}

/** Quick heuristic to detect if the pasted text looks like a raw Azure DevOps log */
export function detectFormat(raw: string): 'azure' | 'github' | 'unknown' {
  const sample = raw.slice(0, 2000);
  if (/##\[[a-z]+\]/i.test(sample) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z/m.test(sample)) {
    return 'azure';
  }
  if (/^\[\d{2}:\d{2}:\d{2}\]/m.test(sample)) {
    return 'github';
  }
  return 'unknown';
}
