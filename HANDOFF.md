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

## Current status (as of commit `b5a40fe`, 2026-08-15, not yet pushed)

Working through a 6-phase WhatsApp-Desktop-style redesign, brainstormed
and broken down across several sessions. **All 6 phases are now shipped**
(Fase 6 was split into 4 independent sub-projects, user's explicit choice
via AskUserQuestion - 6a/6b/6c/6d all done). Nothing from the original
redesign brainstorm remains unbuilt.

**Next step is the user's, not a next phase**: they said they'd do their
own full manual test pass once everything's done, and want a UAT document
covering all fases at that point - that request hasn't been fulfilled yet
if you're picking this up mid-way. Ask before starting anything new;
don't assume there's a "Fase 7". The per-phase "here's a dmg + test
scenario" ritual used through Fase 5 was relaxed for the rest of Fase 6
(self-verify via Playwright + real browser/Electron, commit after each
verified step without waiting for a go-ahead) - that relaxed cadence
likely still applies to whatever comes next unless told otherwise.

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
- **Fase 5 — Import relocation + chat-list search filter (done):** the
  sidebar's full-width "+Import Chat" button was replaced by a name-filter
  input (`chatSearchQuery` in `+page.svelte`) in that same slot, with a
  compact "+" `IconButton` beside it for the same `handleSidebarImport`
  trigger - purely a relocation, the import pipeline itself is untouched.
  Matches chat title OR any participant name (reuses the same
  lowercase-includes pattern already used for the "View as" participant
  search, `filteredParticipants`) - so group chats are findable by a
  member's name. `ChatList.svelte`'s `sortedChatIndices` filter chain
  gained a third condition (name match) alongside the existing archived
  filter; a new "no chats match" empty state takes priority over the
  generic "no chats at all" one when a filter is active and matches
  nothing. The filter persists across the Chats/Archived rail switch
  (Archived's own title bar - back button + label - is unchanged, no
  second search input there, but the same `chatSearchQuery` still applies
  to whatever list it's filtering). Deliberately does **not** search
  message content across chats - that's Fase 6.
- **Fase 6a — Chat info panel (done):** new `InfoPanel.svelte`, an
  always-mounted slide-in panel (`.info-panel` CSS class, mirrors
  `.bookmarks-panel`) - not a worker-backed overlay like `ChatStats`,
  everything it shows is already on `ChatData`. Subsumes the old
  Participants modal (avatar/name/phone-or-VCF/per-participant message
  count, all reused as-is) rather than duplicating it - the modal is
  gone, both the subtitle-click and a new header `info` icon open the
  same panel now. Participates in the existing Bookmarks/MediaGallery
  mutual-exclusion toggle logic (`toggleChatInfo` follows the same
  pattern). Deliberately doesn't touch `ChatStats.svelte` - histogram/
  analytics stay separate, Info is identity/metadata only.
- **Fase 6b — All Media (done):** the rail button is real now.
  `gallery.svelte.ts` gained `viewMode: 'chat' | 'all'` - `'all'` flat-maps
  every loaded chat's `mediaFiles` instead of just the selected chat's;
  everything else (date grouping, filters, selection, lightbox,
  `MediaThumbnail`) needed zero changes, already generic over
  `GalleryItem[]`. Found and fixed a real bug along the way:
  `GalleryItem.id` was just `media.path`, safe per-chat but not once
  chats are merged (WhatsApp's auto-generated media filenames can
  collide across separate exports) - selection/lightbox/video-frame-cache
  now key off `` `${chatTitle}::${path}` ``, not raw `path`. Cross-chat
  "go to message" reuses the exact switch-chat-then-scroll logic already
  proven for bookmarks (`handleNavigateToBookmark`) via a new shared
  `navigateToMessageInChat` helper - the media version previously had no
  chat lookup at all, single-chat only. `gallery-panel`'s mount moved out
  of the `selectedChat`-gated branch (same fix Starred needed in Fase 2).
  All 5 rail destinations now fully reset each other (a gap where the
  rail never coordinated with `showMediaGallery`/`showChatInfo` before).
- **Fase 6c — Global "View as" default identity (done):** new
  `DefaultIdentitySettings { enabled, identity }` (`persistence.svelte.ts`,
  mirrors `AppLockSettings`' exact storage shape) + a reactive
  `defaultIdentityState` singleton (`default-identity.svelte.ts`, mirrors
  `app-lock.svelte.ts`). Auto-matches the saved identity against
  `chat.participants` on fresh import/merge only (`applyDefaultIdentityIfNeeded`,
  gated on `!perspectiveByChat.has(title)`) - deliberately conservative
  matching (exact case-insensitive string, or a bounded last-9-digits
  comparison for phone-shaped identities), never on restore (every
  persisted chat's `settings.perspective` is always defined, even `null`,
  so the schema can't tell "explicitly none" from "never decided" for an
  already-seen chat - restore is left untouched on purpose, not
  retrofitted). `chat.contacts` (VCF) was considered and rejected as a
  matching signal - confirmed opportunistic, not a reliable directory.
  Once auto-matched, a chat's perspective persists and is overridable
  exactly like a manual pick always was - no new dropdown UI needed.
  New Settings section between App Lock/PIN and Storage.
- **Fase 6d — Cross-chat message search (done):** the biggest of the four
  sub-projects - confirmed no existing multi-chat search capacity to
  extend (`index-worker.ts` builds navigation data, not a search index;
  `search-worker.ts`'s actual matching is per-chat brute-force
  `.includes()`). New `cross-chat-search.svelte.ts` orchestrates **one
  unmodified `search-worker.ts` instance per currently-loaded, indexed
  chat** (`Map<chatTitle, Worker>`, diffed against `appState.chats` so
  results self-correct if a chat is deleted mid-session) rather than
  redesigning the worker to hold multiple chats. Each worker's own
  `searchId` cancellation is reused directly as a shared search-
  generation token to discard stale responses - no second cancellation
  mechanism built. Result previews come from cross-referencing each
  worker's `matchingIds` against that chat's `messagesById` (already
  populated by the existing index pass) - no worker changes needed. New
  `SearchResultsPanel.svelte` (same slide-in family as Bookmarks/Gallery/
  Info, `.search-panel` CSS) is deliberately **not** folded into Fase 5's
  live chat-list filter - a new "Search messages for ..." row in
  `ChatList.svelte` triggers it explicitly (passing the filter text
  through as the initial query), keeping Fase 5's already-shipped
  behavior untouched and avoiding running N-worker search on every
  keystroke of a casual list filter. Unlike its panel siblings, mounted
  conditionally (`{#if showCrossChatSearch}`) rather than always-mounted-
  CSS-hidden, since opening it has a real cost (spawning N workers).
  Joins the existing panel mutual-exclusion group (now 6-way).

### Separately-tracked, not part of the 6-phase redesign

- **Backup-ZIP-download (done):** new `handleBackupChatAsZip` in
  `+page.svelte`, a new `archive`-icon button next to the existing
  "Export chat" (HTML-only) one. Reused two patterns proven elsewhere
  this session rather than inventing new ones - `MediaGallery`'s
  `downloadSelected()` mechanics (JSZip + `getMediaBytes`/
  `mediaFileHasSource` skip-if-no-source), and the `rawLine`-join
  transcript trick from `handleMergeChats` (no reverse-parser needed,
  `WhatsApp Chat with {title}.txt` naming round-trips the title). Media
  written flat at the ZIP root (not grouped into type subfolders like the
  media-gallery download) to match a real WhatsApp export's shape.
  Verified end-to-end: downloaded, inspected contents, re-imported into a
  fresh session, confirmed identical title/participants/message/media
  counts to the original - not just "a zip got created."
- Web/browser architecture rework so it can handle large ZIPs the way
  Electron does (currently Electron-only optimization) - not started.
- Cancel button for an in-progress extraction - not started.
- Windows testing - not done this fork.
- At-rest encryption for the PIN-lock feature - discussed, explicitly
  **not** implemented. The lock is a UI gate, not encryption (data sits
  plaintext in IndexedDB) - deliberate, not a bug. Don't "fix" this
  without discussing first.
- **Mobile reachability of Archived (done):** added a small `archive`-
  icon `IconButton` to the sidebar's "Chats title bar" row in
  `+page.svelte` (the search input + "+" import row, which unlike
  `IconRail` is NOT `md:`-gated), right after the import button. Wired
  with the identical mutual-exclusion reset used by the rail's own
  `onSelectArchived` handler. Reused the existing `rail_archived` i18n
  key rather than adding a new one. Verified live at 375px width via
  Playwright: rail confirmed hidden, new icon reachable and opens the
  Archived view (back-chevron returns correctly), and confirmed no
  regression/overflow at desktop width (both rail and sidebar triggers
  present side by side).

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
