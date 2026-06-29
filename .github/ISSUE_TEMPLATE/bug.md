---
name: Bug report
about: Report a bug to help improve OneMind.
title: ''
labels: 'bug'
assignees: ''
---

## Describe the bug

A clear and concise description of what the bug is.

## To reproduce

Steps to reproduce the behavior. Include the selected agent, workspace path, and
the command or UI flow that triggered the issue.

```bash
npm run tauri dev
# or:
npm run build
```

## Expected behavior

What you expected to happen.

## Actual behavior / logs

What actually happened. Paste the error or traceback — **redact any API keys or
secrets** first:

```text
...
```

## Environment

- OneMind version or git commit SHA:
- OS (e.g. Ubuntu 24.04, Windows 11, macOS 14):
- App mode (Tauri dev / packaged app / browser preview):
- Node.js version (`node --version`):
- npm version (`npm --version`):
- Rust version (`rustc --version`):
- Selected agent or protocol (e.g. Claude Code, Codex, generic JSONL):
- Workspace path:

## Additional context

Relevant `.agents` config, logs, screenshots, or recordings. Redact API keys,
tokens, local secrets, and private workspace content before posting.
