# AGENTS.md — Repository Agent Rules

## Package Manager (Strict)

- Use `bun` and `bunx` only.
- Never use `npm`, `npx`, `yarn`, or `pnpm`.
- Translate any third-party command examples to Bun equivalents before running them.

## Command Conventions

- Install dependencies: `bun add ...`
- Run scripts: `bun run <script>`
- One-off CLIs: `bunx <tool> ...`
- Convex commands: `bunx convex ...`
- shadcn commands: `bunx --bun shadcn ...`

## Lockfile

- `bun.lock` is the authoritative lockfile and must stay in sync with dependency changes.
