# Electron e2e tests

These tests run the real desktop app (dev mode) with Playwright against **isolated profiles** in the OS temp folder (`whats-reader-e2e/`). Your real app data is never used.

```bash
npm run test:e2e              # all tests (about 8 minutes)
npm run test:e2e -- 03 04     # only files whose name contains 03 or 04
```

- Needs Electron installed (`node node_modules/electron/install.js` if it isn't).
- Starts the Vite dev server itself if port 5173 is free; stops it afterwards.
- A window opens and closes repeatedly; don't touch it while tests run.
- Output is `PASS`/`FAIL` lines. The command exits non-zero if anything fails.

| File | Covers |
|---|---|
| `01-links-and-site-data` | external links, cookie/cache cleanup |
| `02-pin-lock` | auto-lock paused during file dialogs and imports (~90s) |
| `03-orphans-and-prune` | no auto-prune, manual orphan cleanup, main-process guards |
| `04-unavailable-storage-and-stars` | locked-vault simulation, stars after restart/Update |
| `05-import-delete-reextract` | import, cancel, Delete Chat, manual re-extract |
| `06-transcription-model-cache` | Whisper model survives restart (needs internet once, skipped otherwise) |
| `07-chat-storage-location` | chat storage: locked vault, markers, move/cancel/failure, reconnect, restore default |

Tests reach UI elements by their English labels, so run them with the app in English (the default when the system language isn't Indonesian).
