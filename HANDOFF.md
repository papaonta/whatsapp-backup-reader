# Session Handoff

Personal running log for continuing this fork's work in a fresh Claude Code
session (new chat window, or a different machine). Not part of the
upstream project — delete anytime, or keep updating it.

## Paste this as your first message in a new session

```
Lanjut kerjain whats-reader (repo ini / clone
https://github.com/papaonta/whatsapp-backup-reader.git kalau folder ini
kosong, terus npm install). Baca HANDOFF.md di root repo dulu sebelum
mulai apapun - itu rangkuman status terakhir: redesign 6-fase yang lagi
jalan, fase mana yang udah kelar, dan keputusan-keputusan yang udah
diambil biar gak diulang tanya. Remote "origin" = upstream (read-only),
remote "mine" = papaonta/whatsapp-backup-reader (push target).
```

## Current status (as of commit `3ffef01`, 2026-08-15)

Working through a 6-phase WhatsApp-Desktop-style redesign, brainstormed
and broken down across several sessions. **Fase 1 and Fase 2 are shipped
and pushed to `mine/main`.**

- **Fase 1 — Persistent chat list (done):** every saved chat now just
  appears on launch (no restore-prompt modal, no per-chat remember/forget
  toggle). Old Remove/Forget/X actions replaced by a single confirmed
  "Delete Chat". Shipped along with several real bugs found through
  hands-on testing afterward: duplicate-import detection missing for
  Android exports, "Update" creating duplicates instead of replacing,
  restored chats losing their disambiguated title, merged chats not
  surviving restart, and two separate app-lock/chat-lock duplication bugs
  (root cause both times: `+layout.svelte`'s lock gate fully remounts
  `+page.svelte`, so any state that needs to survive that remount must
  live in a `<script module>` block, not a regular instance-scoped
  `$state` — this bit twice, watch for it a third time before adding new
  per-chat state in `+page.svelte`).
- **Fase 2 — Icon rail + empty states (done):** new `IconRail.svelte`,
  vertical strip left of the sidebar (Chats/Archived/Starred/All
  Media/Settings, desktop-width only — `hidden md:flex`). Archived and
  All Media are **inert placeholders** this phase (disabled, tooltip
  "Coming soon") - their real functionality is later phases. "Starred" =
  the existing Bookmarks feature relabeled, not renamed internally
  (`bookmarksState`/`BookmarksPanel.svelte` file names, data model
  untouched) - it was already a cross-chat-capable singleton, just never
  mounted outside the selected-chat branch; fixed by moving its mount
  point to be a sibling of the sidebar. Also: chat list now sorts by
  `chat.endDate` (last message timestamp) instead of import/restore
  order, and the empty-import screen's "How to export"/"Privacy &
  Security" collapsibles were removed (redundant with the onboarding
  wizard added since that screen was last touched).
- **Not started yet — Fase 3:** Archive & Delete. New `archived` field on
  persisted chat metadata, filter the chat list by it, give the rail's
  Archived icon a real destination. (Delete itself already works, from
  Fase 1.)
- **Not started yet — Fase 4:** Settings becomes a full section instead
  of a modal (currently `SettingsModal.svelte`, opened from 3 places incl.
  the new rail's Settings icon - all 3 triggers were deliberately kept on
  purpose, not consolidated, so mobile/narrow widths - where the rail is
  hidden - still have a way in). Add a storage-usage stat while at it.
- **Not started yet — Fase 5:** relocate the import button, add a search
  bar to filter the chat list.
- **Not started yet — Fase 6 (bigger, standalone, optional/later):** "View
  as" as a global profile concept, search across all chats' message
  content, a per-chat info panel. Also where "All Media" (cross-chat
  media aggregation across all open chats' `mediaFiles`) should get its
  real implementation - `gallery.svelte.ts`/`MediaGallery.svelte` are
  currently 100% single-chat scoped (`appState.selectedChat` only), so
  this needs genuinely new aggregation logic, not just a new mount point.

### Separately-tracked, not part of the 6-phase redesign

- Backup-ZIP-download (export full chat+media back out as a ZIP) - not
  started.
- Web/browser architecture rework so it can handle large ZIPs the way
  Electron does (currently Electron-only optimization) - not started.
- Cancel button for an in-progress extraction - not started.
- Windows testing - not done this fork.
- At-rest encryption for the PIN-lock feature - discussed, explicitly
  **not** implemented. The lock is a UI gate, not encryption (data sits
  plaintext in IndexedDB) - deliberate, not a bug. Don't "fix" this
  without discussing first.

## Working conventions established across sessions (don't relitigate)

- New i18n keys: only add to `messages/en.json`. Never hand-translate to
  the other 9 locales (`npm run machine-translate` exists for that if it's
  ever actually needed).
- Never `npx biome` — always `./node_modules/.bin/biome check/format
  --write <files>` directly (bare `npx biome` pulls the wrong version).
- Verify UI changes live before calling them done - dev server
  (`npm run dev`, localhost:5173) + a throwaway Playwright script against
  a real browser for web-only changes; for Electron-specific behavior
  (extraction, file paths, app-lock), launch Electron with an isolated
  `--user-data-dir` and CDP-attach (`--remote-debugging-port=9222`),
  never the real user profile.
- Commit after each verified fix/feature (not batched), build a fresh
  `.dmg` when asked (`CSC_IDENTITY_AUTO_DISCOVERY=false npm run
  electron:build:mac` - the GitHub-publish step at the end always fails
  with a missing-token error, that's expected/harmless, the `.dmg` itself
  is already written to `dist-electron/` by then), and report back with a
  concrete manual test scenario. Never push without explicit confirmation
  in the conversation, even after a prior push was approved.

## Remotes

- `origin` → `rodrigogs/whats-reader` (upstream, read-only for us)
- `mine` → `papaonta/whatsapp-backup-reader` (private fork, push target),
  workflow: `git push mine main`.
