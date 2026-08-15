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

## Current status (as of commit `1ad9cdc`, 2026-08-15, not yet pushed)

Working through a 6-phase WhatsApp-Desktop-style redesign, brainstormed
and broken down across several sessions. **Fase 1-4 are shipped.**

**Heads up for whoever picks this up:** two Claude Code sessions worked on
this repo concurrently at one point mid-redesign (Fase 3 landed from a
separate session while another was mid-conversation) - it was reconciled
fine (audited, one real bug found and fixed), but if you notice
commits/HANDOFF.md content you don't recognize, check `git log` and
`git fetch mine && git log main..mine/main` before assuming something's
broken - it may just be another concurrent session's work, already safe.

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
  `$state` — this bit three times now across Fase 1-2, watch for it
  before adding new per-chat/global-UI state in `+page.svelte`).
- **Fase 2 — Icon rail + empty states (done):** `IconRail.svelte`,
  vertical strip left of the sidebar (desktop-width only — `hidden
  md:flex`). "Starred" = the existing Bookmarks feature relabeled, not
  renamed internally (`bookmarksState`/`BookmarksPanel.svelte` untouched)
  - mounted as a sibling of the sidebar so it's reachable with no chat
  selected. Chat list sorts by `chat.endDate` (last message timestamp),
  not import/restore order. Empty-import screen's "How to
  export"/"Privacy & Security" collapsibles removed (redundant with
  onboarding).
- **Fase 3 — Archive & Delete (done, audited):** `settings.archived:
  boolean` on `PersistedChatMetadata`, plumbed exactly like `locked`
  (module-scoped `archivedByChat` Map, restore-on-launch sync, instant
  persist-on-toggle). `ChatList.svelte`'s `showArchivedOnly` prop filters
  `sortedChatIndices` to show only-archived or hide-archived. Rail's
  Archived button swaps the sidebar's title bar (Import button ↔
  "Archived" + back chevron), reusing `ChatList` rather than a separate
  component. **Audited after landing** (a second concurrent session did
  the initial implementation): found and fixed one real bug (switching
  Archived → Starred via the rail left the active-highlight stuck on
  Archived - `onSelectStarred` wasn't resetting `showArchivedView` the
  way `onSelectArchived` reset `showBookmarks`); separately verified
  persistence-survives-restart (the first attempt gave a false negative
  from a test-harness artifact - `<input type=file>`-driven imports in
  Electron don't carry a real file path the way the native import flow
  does, so the restored chat got stuck at "reselect-required" before the
  archived-restore code ever ran; patching a persisted record's
  `fileReference` to a real `electron-path` and reloading confirmed it
  actually works). Also confirmed Lock+Archive together, Delete-while-
  archived, and Merge-with-an-archived-source all behave correctly - no
  other bugs found.
- **Fase 4 — Settings as a full section, not a modal (done):**
  `SettingsModal.svelte` deleted, replaced by `SettingsSection.svelte`.
  New `showSettingsView` state occupies the same main-content slot a
  chat/the empty placeholder does (unlike `showBookmarks`/
  `showArchivedView`, which are independent overlay/sidebar-filter state)
  - all 4 rail actions (`chats`/`archived`/`starred`/`settings`) now
  unconditionally clear the other three, generalizing the Fase 3 bug fix
  above so a 4th state can't reintroduce the same class of issue.
  `handleSelectChat` also clears it (selecting a chat must exit Settings,
  since they share the one slot). The 3 header gear-icon triggers stay in
  place (mobile/narrow-width fallback, rail is desktop-only) - just
  retargeted to `showSettingsView`. Dark-mode toggle and the language
  switcher (`LocaleSwitcher`) moved fully into the new section and were
  **removed** from their scattered header locations - confirmed with the
  user first, since the old modal never actually contained them (this was
  a real consolidation, not a reshuffle). New storage-usage stat needed
  new plumbing from scratch (nothing existed before): `getDirectorySize()`
  in `electron/lib/extract-zip.cjs` (recursive walk of the extraction
  root, mirrors `pruneOrphans`' `ENOENT` handling) behind a new
  `extraction:getStorageUsage` IPC handler for Electron,
  `navigator.storage.estimate()` for web. Verified the Electron path
  against the real on-disk folder size (byte-for-byte match via a forced
  real extraction, same test-harness workaround as Fase 3's persistence
  check - `<input type=file>` imports don't exercise the real extraction
  path in a test harness).
- **Not started yet — Fase 5:** relocate the import button, add a search
  bar to filter the chat list.
- **Not started yet — Fase 6 (bigger, standalone, optional/later):** "View
  as" as a global profile concept, search across all chats' message
  content, a per-chat info panel. Also where "All Media" (currently an
  inert rail placeholder since Fase 2) should get its real cross-chat
  aggregation implementation - `gallery.svelte.ts`/`MediaGallery.svelte`
  are currently 100% single-chat scoped (`appState.selectedChat` only).

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
- Mobile reachability of Archived - noted during the Fase 3 audit:
  Archived is currently only reachable via the desktop-only rail. Real
  gap, not introduced by any single phase, not yet fixed.

## Working conventions established across sessions (don't relitigate)

- New i18n keys: only add to `messages/en.json`. Never hand-translate to
  the other 9 locales (`npm run machine-translate` exists for that if it's
  ever actually needed).
- Never `npx biome` — always `./node_modules/.bin/biome check/format
  --write <files>` directly (bare `npx biome` pulls the wrong version).
- `npm run check` (svelte-check) does NOT reliably catch every Svelte
  template structural error (e.g. an unbalanced `{#if}`/`</div>`) - it
  passed clean once mid-Fase-4 while a real unbalanced-div compile error
  was showing in the actual dev server. Always also load the page for
  real (or in a fresh Playwright browser) before calling a UI change
  done, not just `npm run check`.
- Verify UI changes live before calling them done - dev server
  (`npm run dev`, localhost:5173) + a throwaway Playwright script against
  a real browser for web-only changes; for Electron-specific behavior
  (extraction, file paths, app-lock), launch Electron with an isolated
  `--user-data-dir` and CDP-attach (`--remote-debugging-port`, pick a
  fresh port if a previous test's process is still lingering on 9222 -
  check `lsof -i :PORT` / `ps aux | grep electron` first since concurrent
  sessions' leftover test instances can collide).
- `<input type=file>`-driven imports in a Playwright test do **not**
  exercise Electron's real file-path/extraction pipeline the same way the
  app's actual import flow does (no `.path` on the resulting `File`, so
  it silently falls back to in-memory parsing like the web build) - this
  produced two false-negative test results this session (Fase 3's
  archived-persistence check, Fase 4's storage-stat-is-nonzero check).
  When testing something that depends on a real extraction folder
  existing on disk, either patch a persisted record's `fileReference` to
  a real `electron-path`/`electron-extracted` before reloading, or call
  `window.electronAPI.extraction.extract(...)` directly via
  `page.evaluate()` to force a real extraction.
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
