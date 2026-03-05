# UltraFormat — Project Guidelines

## Privacy & Security (Non-Negotiable)

UltraFormat is a privacy-first tool. All processing happens client-side. These rules are absolute:

- **No cookies.** Never use `document.cookie` or any cookie library. Not for preferences, not for analytics, not for anything.
- **No outbound requests.** Never use `fetch()`, `XMLHttpRequest`, `navigator.sendBeacon()`, WebSocket, or any other network API. No telemetry, no analytics, no CDN calls at runtime.
- **`localStorage` is for preferences only.** The only permitted `localStorage` key is `uf-theme` (dark/light mode). Never store user content, tool input/output, or anything derived from user data.
- **No `sessionStorage`.** Do not use it.
- **No fingerprinting.** Do not read hardware info, canvas data, installed fonts, or any browser fingerprinting vectors.
- **No third-party scripts at runtime.** All dependencies must be bundled at build time. No external `<script>` tags, no dynamic imports from CDNs.

If a feature cannot be built without violating these rules, it should not be built.

## Architecture

- Single-page React app with client-side routing (React Router)
- One page component + one CSS file per tool in `src/pages/`
- Pure algorithms go in `src/lib/` — no React imports, no side effects
- Tool registry in `src/tools.ts` — each tool has an id, name, description, path, and accent color
- Theme system via `src/useTheme.tsx` with `data-theme` attribute on `<html>`

## Code Style

- TypeScript strict mode — no `any` unless unavoidable
- Functional React components with hooks — no class components
- BEM-like CSS naming scoped per component (e.g., `.json-formatter__output`)
- CSS custom properties for theming — all colors reference `var(--name)` tokens from `src/index.css`

## Testing

- Vitest + Testing Library + jsdom
- Tests live in `src/__tests__/` and mirror the source file name
- Run with `make test` or `npm test`
