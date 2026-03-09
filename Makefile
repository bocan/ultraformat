.PHONY: dev build clean test preview install lint release

## Start development server
dev:
	npx vite

## Type-check and build for production
build:
	npx tsc -b && npx vite build

## Lint source files
lint:
	npx eslint src/

## Run unit tests
test:
	npx vitest run

## Run tests in watch mode
test-watch:
	npx vitest

## Remove build artifacts and caches
clean:
	rm -rf dist node_modules/.vite node_modules/.cache

## Install dependencies
install:
	npm install

## Preview production build locally
preview: build
	npx vite preview

## Bump version, update CHANGELOG.md, commit and tag
release:
	npm run release
