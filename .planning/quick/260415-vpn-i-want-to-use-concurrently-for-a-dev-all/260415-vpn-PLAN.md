---
quick_id: 260415-vpn
description: "i want to use concurrently for a dev:all command"
status: complete
created: 2026-04-16
---

# Quick Task 260415-vpn Plan

## Goal
Run backend and client development processes together via a single command.

## Tasks

1. Add `concurrently` as a development dependency.
2. Add a `dev:all` script that starts `dev` and `client` in parallel.

## Verification

- `bun x concurrently --version` returns a version.
- `package.json` includes `devDependencies.concurrently`.
- `package.json` includes `scripts["dev:all"]`.
