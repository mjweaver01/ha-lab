---
quick_id: 260415-vpn
description: "i want to use concurrently for a dev:all command"
status: complete
completed: 2026-04-16
tags: [devx, scripts, concurrently]
---

# Quick Task 260415-vpn Summary

`dev:all` now starts both backend and client development processes via one command.

## Accomplishments

- Added `concurrently` to `devDependencies`.
- Added `dev:all` script to run `bun run dev` and `bun run client` in parallel.
- Regenerated `bun.lock` to capture the new dependency tree.

## Verification

- `bun x concurrently --version` -> `9.2.1`
- `package.json` contains `scripts["dev:all"]`
- `package.json` contains `devDependencies.concurrently`

## Task Commits

1. `51b761a` - feat(260415-vpn): add unified dev:all runner
