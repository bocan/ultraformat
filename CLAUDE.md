# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

UltraFormat is a privacy-first, 100% client-side developer toolkit (JSON formatter, diff checker, Base64, JWT decoder, etc.) built with React 19, TypeScript, Vite, and React Router. **No code may make network calls**, with one deliberate exception: the Link Checker tool fetches only the URLs the user explicitly asks it to check, directly from the browser (never via a proxy). Everything else processes data entirely client-side. No UI framework or component library; all CSS is hand-written.

## Commands

```bash
npm run dev          # Vite dev server at localhost:5173
npm run build        # tsc -b + vite build + copy index.html to 404.html (GitHub Pages SPA fallback)
npm run lint         # eslint src/
npm test             # vitest run (all tests)
npm run test:watch   # vitest watch mode
npx vitest run src/__tests__/UuidGenerator.test.tsx   # single test file
```

A Makefile mirrors these (`make dev`, `make test`, `make build`, etc.).

## Releases & CI

- Commits must follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.). On every push to `main`, CI (`.github/workflows/node.js.yml`) runs `commit-and-tag-version` to bump the version and update `CHANGELOG.md` based on commit messages, then creates a GitHub Release and deploys `dist/` to GitHub Pages. Never edit `CHANGELOG.md` or bump the version in `package.json` by hand.
- Every push and PR runs lint, tests, and build; all three must pass.

## Architecture

Each tool is a self-contained page. The registry pattern ties everything together:

- `src/tools.ts` - the tool registry: id, name, description, route path, lucide icon, and a color triple (`color`/`colorDim`/`colorGlow`) referencing CSS custom properties. The Home grid and Layout navigation are both driven by this array.
- `src/App.tsx` - route definitions; every tool gets a `<Route>` inside the shared `<Layout>`.
- `src/pages/<Tool>.tsx` + `<Tool>.css` - one component and one stylesheet per tool.
- `src/lib/` - pure, framework-free algorithms (diff engine, Prettier wrapper, CIDR math, log cleaning), unit-tested separately from their page components.
- `src/__tests__/` - one Vitest + Testing Library test file per tool/component (jsdom environment, globals enabled, setup in `src/test-setup.ts`).
- `src/index.css` - the design system: theme variables, per-tool color triples (e.g. `--cyan`, `--cyan-dim`, `--cyan-glow`), typography, shared utilities.
- `src/useTheme.tsx` - dark/light theme provider; sets `data-theme` on `<html>`, persists to `localStorage` under `uf-theme`, falls back to OS preference.

**Adding a new tool** requires touching four places: a page component + CSS in `src/pages/`, a route in `App.tsx`, a registry entry in `tools.ts` (picking or adding a color triple in `index.css`), and a test file in `src/__tests__/`.

`__APP_VERSION__` is a compile-time global injected from `package.json` via `vite.config.ts`.

## Constraints

- Accessibility is a stated feature: keep WCAG-compliant contrast, keyboard navigation, focus indicators, and `prefers-reduced-motion` support intact.
- The app must remain a fully static site (servable from `dist/` by any static host); don't introduce server runtime dependencies.
