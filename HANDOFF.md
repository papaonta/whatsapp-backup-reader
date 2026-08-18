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

## Current status (as of commit `2c93c5b`, 2026-08-17, not yet pushed)

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
- **Cancel button for an in-progress extraction (done):** the custom
  extractor (`electron/lib/extract-zip.cjs` + `zip-reader.cjs`) already
  had an unused `signal?: AbortSignal` param; wired it up end-to-end -
  `main.cjs` now tracks in-flight `AbortController`s in an
  `activeExtractions` Map keyed by `extractionId`, exposes a new
  `extraction:cancelExtract` IPC channel, and threads the signal into
  the orphan-recovery pass too (`recoverOrphanEntries`, previously
  unchecked - the phase most likely to actually run long). On cancel,
  the existing catch-block cleanup already removes the partial
  extraction directory, so no new renderer-side cleanup was needed.
  `ChatList.svelte`'s loading-placeholder row gets a small Cancel
  icon button, shown only during the `extracting` stage.
  **Real bug found and fixed via testing**: the first version
  registered the `AbortController` in the map *after* an `await`
  (`validateAbsoluteZipPath`), so a cancel arriving in that gap would
  silently no-op - `ipcMain.handle` callbacks only run synchronously up
  to their first `await`, and a second `invoke` on another channel can
  land in that gap. Fixed by registering the controller as the very
  first statement in the handler. Caught by direct-IPC testing (racing
  `extract()` against an immediate `cancelExtract()` via
  `page.evaluate`, not a UI click), not by clicking the button.
  **Testing note for future sessions**: verifying this specific
  feature's *UI* (not just the IPC plumbing) via Playwright's
  `_electron` + `setInputFiles()` didn't work - Electron's legacy
  `File.path` property (used by `getElectronFilePath()` to decide
  whether to take the extraction-to-disk path vs. the web/JSZip
  in-memory fallback) isn't populated on files injected via CDP's
  `setInputFiles`, so every such import silently falls back to the
  in-memory path and never touches the Electron extractor at all. The
  underlying mechanism was instead verified deterministically via
  direct `window.electronAPI.extraction.*` calls in `page.evaluate`
  (race the cancel, confirm `cancelled:true`, confirm no orphaned
  extraction directory via `getStorageUsage`, confirm cancelling an
  unknown/already-finished id is a safe no-op, confirm a normal import
  still completes end-to-end) - reuse this approach rather than trying
  to click the button through a CDP-injected file input again.
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
- **UX audit fixes (done):** the user's own hands-on click-through of the
  finished redesign surfaced 7 real issues, all fixed in one pass -
  established a clearer layout vocabulary along the way (**rail**,
  **sidebar**, **header**, **main content**, **panel** - see the
  architectural principle below).
  - **Settings/Starred/All Media/Cross-chat Search are now "global"
    views**, not side panels: they take over everything right of the
    rail (sidebar + header + chat all disappear), rather than the old
    behavior of narrowing a still-fully-visible chat. New
    `isInGlobalView` derived in `+page.svelte` gates a top-level
    `{#if isInGlobalView} <!-- one of the 4 panels, full-bleed -->
    {:else} <!-- normal rail-sidebar-header-content layout --> {/if}`
    split. Chat Info and per-chat Media Gallery stay side panels
    on purpose - they're genuinely scoped to one chat, unlike these 4.
    Deleted the now-dead `.bookmarks-panel`/`.search-panel` CSS
    (fully migrated); `.gallery-panel` stays for per-chat mode only.
  - **Sidebar never collapses at desktop width** anymore (real
    WhatsApp Desktop doesn't have this control) - only mobile keeps
    the slide-in-drawer + toggle-button behavior.
  - **Removed the header's redundant Settings gear** entirely (3
    instances) - it sat inline with a specific open chat's name/icons,
    misleadingly implying "settings for this chat." Added one proper
    mobile-only replacement in the sidebar's own title bar (next to
    Archived), matching the Archived mobile-fix pattern exactly -
    that's chat-list-level UI, not per-chat UI.
  - **Archived-filter/stale-chat bug**: switching to the Archived
    filter while a non-archived chat was open left both the header and
    the chat room showing that stale chat. Fixed with a shared
    `isSelectedChatVisible` derived (`selectedChat` exists AND is
    archived-or-filter-is-off), used by both the header and
    main-content conditionals so they can't drift out of sync again -
    `appState.selectedChatIndex` itself is never touched, so switching
    back to "All Chats" naturally restores the same chat.
  - **Backup-ZIP icon confusion**: it reused the `archive` icon,
    right next to the real "Archive chat" action elsewhere - the user
    mistook one for the other. New `cloud-download` icon added to
    `Icon.svelte` (mirrors `cloud-upload`, arrow reversed), plus a new
    `ConfirmBackupModal.svelte` (mirrors `ConfirmDeleteChatModal`,
    neutral tone) gating `handleBackupChatAsZip` behind a confirm step.
  - **All Media polish**: header title now says "All Media" (reuses
    `rail_all_media`) instead of generic "Media"; each thumbnail gets
    a small chat-name badge (`MediaThumbnail`'s new `showChatBadge`
    prop, reading the already-present `GalleryItem.chatTitle`) so
    it's obvious which chat a given item came from.
  - Verified live via Playwright at both desktop and mobile widths,
    including the full archive-a-chat-while-another-is-open repro.
- **UX audit fixes, round 2 (done):** further hands-on feedback,
  including two screenshots comparing directly against real WhatsApp
  Desktop's layout.
  - **Bookmarks now mirrors Media Gallery's dual mode exactly**: new
    `bookmarksScope: 'all' | 'chat'` state in `+page.svelte` (set by
    `toggleBookmarks()`/rail's `onSelectStarred`, same pattern as
    `galleryState.viewMode`). `'chat'` mode is a restored `.bookmarks-panel`
    side panel (CSS re-added to `app.css`, deleted in the round-1 pass
    when Bookmarks was briefly *always* full-view); `'all'` mode is the
    full global view, now omitting `currentChatId` so `BookmarksPanel`'s
    own existing `{#if currentChatId}`-gated "All chats"/"This chat"
    tab UI doesn't show when there's no real per-chat context (rail
    entry).
  - **Header moved from full-app-width to scoped inside the chat
    column** - confirmed via side-by-side screenshot that real WhatsApp
    Desktop never shows the chat header above the sidebar (sidebar has
    its own separate title bar, unchanged). Restructured
    `+page.svelte`'s non-global-view branch: `Content area` (flex row)
    now holds `[Sidebar][new "chat column" flex-col: header + main
    content]` instead of `[Header full-width][Content area: sidebar +
    main content]`. Pure relocation, no logic changes to the header's 3
    branches or the `perspectiveSelectorContent` snippet.
  - **Real regression found and fixed during this move**: the Chat Info
    `.info-panel` div lives inside "Main content"'s chat-room branch,
    which is now nested inside the new flex-*column* "chat column"
    wrapper - `.info-panel` (meant to sit beside the chat, narrowing it
    horizontally, same as `.gallery-panel`/`.bookmarks-panel`) was
    stacking *below* the chat instead, collapsing the message list to a
    few px of visible height. Caught via `getBoundingClientRect()`
    debugging (a screenshot alone just looked "blank" - not obviously a
    layout bug at a glance). Fixed by relocating `.info-panel` out to
    be a flex-row sibling of the chat column, alongside
    gallery-panel/bookmarks-panel, exactly where it was structurally
    before this round's header move.
  - **`navigateToMessageInChat` fixed** (was the root cause of both
    "Go to message" from All Media and "Go to" from Bookmarks silently
    not navigating): it switched the selected chat but never closed
    whichever global view triggered it, so the view - which fully owns
    the screen while open - just kept rendering over the now-irrelevant
    chat switch. Added the same full mutual-exclusion reset used
    everywhere else in this file as the function's first lines.
  - **System-message detection fixes** in `chat-parser.ts`: security-
    code-changed used a fixed-string `.includes('security code
    changed')` that broke once a contact name is inserted in the real
    export text ("...security code **with X** changed.") - replaced
    with a dedicated `SECURITY_CODE_CHANGE_REGEX`. New
    `ChatMessage.isDeletedMessage` field + `DELETED_MESSAGE_INDICATORS`
    (multi-locale, matching `SYSTEM_INDICATORS`'s existing English/
    Portuguese/Spanish/French/German/Italian/Dutch coverage) - deleted-
    message placeholders ("You deleted this message.", "This message
    was deleted.") previously rendered as indistinguishable normal
    bubbles. Per the user's explicit choice, deleted messages get a
    *different* treatment than system messages: they stay in their
    normal bubble position (sender/alignment/grouping unchanged), just
    italic + muted (`MessageBubble.svelte`), matching real WhatsApp's
    per-message (not group-wide-event) styling.
  - Verified via a small synthetic fixture zip (colon-prefixed security-
    code line + both deleted-message variants) plus DOM/layout
    inspection (`getBoundingClientRect()` walking the ancestor chain),
    not just screenshots - the info-panel regression above would have
    been easy to miss from a screenshot alone since the page doesn't
    show an error, just an empty-looking chat pane.
- **Auto-infer "View as" from a deleted-message placeholder (done):**
  user's own idea - "You deleted this message." only ever appears on
  the export owner's own messages (unlike "This message was deleted."
  for everyone else's), so it unambiguously identifies who "you" are,
  no configuration needed. New `inferOwnerFromDeletedMessage()` in
  `chat-parser.ts`, exported via `parser/index.ts`. Refactored the
  round-2 deleted-message indicator list into
  `DELETED_MESSAGE_INDICATOR_PAIRS: [own, other][]` (was two flat lists)
  so the "own" subset used here can't drift out of sync with
  `isDeletedMessagePlaceholder`'s use of both. New
  `applyDeletedMessagePerspectiveIfNeeded()` in `+page.svelte`, called
  right before `applyDefaultIdentityIfNeeded()` at both its call sites
  (fresh import + merge, never restore - same gating/reasoning as
  Default Identity) - takes priority since it's a hard signal rather
  than a name/phone heuristic; if it sets a perspective,
  `applyDefaultIdentityIfNeeded`'s own already-set guard makes it a
  no-op after. Opportunistic like Default Identity - only fires if the
  chat happens to contain such a message. Verified live: a chat where
  "Bob" has a "You deleted this message." line auto-opens with Bob's
  messages on the right (own-message side), zero settings touched.
  Explicitly scoped to just this one signal for now (group-event system
  messages like "You created group X" don't carry sender attribution
  the same way, so they can't resolve to a name the same way - see the
  conversation, not written up further here) - designed so a second
  signal could slot in the same way if one is ever confirmed reliable.
- **System-message false positives + Starred rename + persistence bug +
  go-to-message scroll + star-from-All-Media (done):** another hands-on
  round, this time cross-checked against the user's own two real chat
  exports (grepped via `ditto`, same corrupted-central-directory
  workaround the app's own unzip needs) plus a comprehensive official
  WhatsApp system-message string list the user supplied.
  - **Real bug found in real data:** `isSystemMessage()`'s bare
    `'left'`/`'added '`/`'removed '` substring checks misclassified
    genuine farewell messages ("izin pamit **left** group ya 🤗") as
    system pills. Tightened `'left'` to `/(?:^|\s)left$/i` (must be the
    last word) and capped `'added'`/`'removed'` to short content
    (`isAddedOrRemovedGroupEvent`, ≤100 chars) in `chat-parser.ts`.
    Added new confirmed-real indicator ("changed their phone number to
    a new number") plus several more from the official list that
    weren't in the sampled data but are well-known official strings
    (admin promote/demote, kept/unkept message, block/unblock, shared
    message history, community join, group-settings-changed variants).
    Skipped the list's "profile picture"/"profile name" entries -
    grepping real data showed those as false-positive risks with no
    safe pattern to build from.
  - **Starred rename:** `messages/en.json`'s bookmark-related *values*
    (not key names) now say "Star"/"Starred" everywhere user-facing;
    new `star-outline` icon in `Icon.svelte` (same path as `star`,
    `stroke` not `fill`, mirrors the `bookmark`/`bookmark-outline`
    pair); every bookmark-icon usage swapped. `bookmarksState`/
    `BookmarksPanel.svelte`/`BookmarkModal.svelte` etc. stay named as-is
    internally - labels/icons only, same precedent as Fase 2's rail
    relabel.
  - **Real bug fixed: bookmarks weren't persisted at all** (refresh or
    restart wiped every starred message - `bookmarks.svelte.ts`'s own
    old header comment said so explicitly). New
    `persistBookmarksForChat()` in `+page.svelte` + an `$effect`
    watching `bookmarksState.bookmarks` that calls it for every loaded
    chat, mirroring the existing `persistLockedFlag`/
    `persistArchivedFlag` pattern against `PersistedChatMetadata.bookmarks`.
    Two gotchas: (1) `$state`-proxied `Bookmark[]` throws
    `DataCloneError` against IndexedDB's structured clone unless wrapped
    in `$state.snapshot()` first; (2) the restore path sets
    `chatFileReferences` (a plain, non-reactive `Map`) *after*
    `applyRestoredChatData` already fired the reactive triggers the
    `$effect` depends on, so it never got a second chance to run for a
    restored chat's `persistedId` - fixed with an explicit
    `persistBookmarksForChat(...)` nudge right after the `Map` is set in
    `handleRestoreChats`. `generateDeterministicId()` confirmed to be a
    pure content hash, not time-of-parse, so bookmark `messageId`s stay
    valid across re-parses/restarts.
  - **Go-to-message didn't scroll to the specific message:** root cause
    was a race in `ChatView.svelte` between two `$effect`s - "scroll to
    bottom on first load" (fires because the component fully
    remounts whenever a global view like Starred/All Media closes,
    resetting `hasScrolledToBottom`) and "scroll to the specific
    message" (`scrollToMessageWithRetry`, smooth-scroll). The instant
    bottom-jump always won over the still-animating smooth scroll,
    regardless of which effect *started* first, because the bottom-jump
    was scheduled via `requestAnimationFrame` at mount time - before
    `scrollToMessageId` had even been set to its real target - and that
    already-queued callback fired later regardless of what the
    triggering effect's own re-evaluation later concluded. Fixed by (1)
    re-checking live state *inside* the rAF callback itself (not just
    when scheduling it) - skip the bottom-jump if `scrollToMessageId`
    now resolves to a message in this chat's `messageIndexMap`; (2)
    removing a vestigial `scrollToMessageId = null` step in
    `navigateToMessageInChat` (`+page.svelte`) that existed to force a
    reset but is unnecessary since ChatView always remounts on this
    path anyway - it was the reason the live value wasn't visible yet at
    mount time; (3) since `scrollToMessageId` is otherwise never reset
    to `null` after a successful navigation, added a reset in
    `handleSelectChat` (normal chat-list open) so a stale target from an
    old navigation can't suppress a later, unrelated chat's normal
    scroll-to-bottom. Verified live via Playwright bounding-box checks
    (both a text message from Starred and a media message from All
    Media land the target inside the viewport, highlighted).
  - **Star-from-All-Media (new feature):** lightbox in
    `MediaGallery.svelte` gets a star toggle next to "Go to message"
    (same `item.messageId` visibility gate), reusing `BookmarkModal`
    exactly like `MessageBubble.svelte` does - `newBookmarkData` built
    from `GalleryItem` fields, with `messageContent` looked up from the
    owning chat's `messagesById` map (falls back to the filename if the
    chat/message can't be found). Verified live end-to-end: star a
    media item from the lightbox → shows up in Starred with correct
    sender/timestamp/content → "Go to" from there scrolls straight to
    and highlights the message.
  - Test-fixture note: `examples/chats/ios-group-chat.zip`'s two
    "(file attached)" references (WA0005/WA0006) don't have matching
    files actually in the zip, and its two images that DO exist
    (WA0001/WA0004) aren't referenced by any message line - so it has
    zero *linked* media items for testing media-star/go-to. Use
    `ios-private-chat.zip` instead (its 4 attachments are fully
    matched) for anything media-linkage-related.
- **Go-to-message race fix wasn't actually deterministic; made it so, plus
  a close-chat button and a scroll-to-bottom button (done):** user
  reported the go-to-message fix above still failed specifically when no
  chat switch was needed (already viewing the target chat, star a message,
  Starred → Go to → lands nowhere sensible) but worked fine after
  switching to a different chat first, both for Starred and All Media.
  - Root cause: the previous fix (re-checking live state inside the rAF
    callback) only narrowed the race, it didn't eliminate it -
    `navigateToMessageInChat` still set `scrollToMessageId` *after*
    `await tick()` (immediately, with zero delay, when no chat switch was
    needed), leaving a window where ChatView's mount-time effect run
    could still observe the old/stale value before the real target
    landed. Fixed properly this time: `scrollToMessageId = messageId` now
    happens synchronously, before `await tick()` - since closing the
    global view (and switching chats, if needed) both happen
    synchronously beforehand, ChatView's very first effect run already
    sees the correct target, no race window at all regardless of timing.
    The 300ms post-switch delay is now purely cosmetic (kept so the
    transition doesn't look jarring) since `scrollToMessageWithRetry`'s
    own retry loop already handles waiting for the new chat's DOM to be
    ready. Lesson: a race "usually" fixed by narrowing the window is
    still a race - test the exact failing scenario the user described (no
    chat switch), not just a scenario that happens to avoid it. Verified
    live for both Starred and All Media, explicitly in the no-switch case
    this time (open the target chat first, star/note a message inside it,
    then go straight to Starred/All Media → Go to, without visiting
    another chat in between).
  - **New: "Close chat" button** - deselects the current chat back to the
    "select a chat" empty state (`appState.selectChat(null)`), without
    touching the chat list. Added to the header's desktop icon row, the
    mobile options dropdown, and the locked-chat compact header (which
    previously had no way to back out without unlocking). New
    `handleCloseChat()` in `+page.svelte`, mirrors `handleSelectChat`'s
    `scrollToMessageId` reset for the same reason.
  - **New: floating "scroll to bottom" button** in `ChatView.svelte` -
    appears once the user scrolls more than 400px away from the latest
    message (tracked in the existing `handleScroll` handler, no new
    listener needed), smooth-scrolls to `scrollHeight` on click. Root
    template wrapped in a `relative` div so the button can be absolutely
    positioned over the message list; state resets on chat change
    alongside `hasScrolledToBottom`.
- **Go-to-message STILL broken for real (long) chats - a third scroll
  mechanism was the actual remaining culprit (done):** user tested the fix
  above and reported it got *worse*, not better, specifically for their
  two real long chats (team marcomm, all star) - previously worked "on
  condition" (switch chats first), now doesn't land anywhere sensible at
  all, same for All Media. Confirmed short test chats still worked fine,
  which is why this didn't surface earlier - the bug only manifests once
  the target message is far enough back that `scrollToMessageWithRetry`
  needs to expand `loadedChunksFromEnd` beyond the initial window.
  - Reproduced with a synthetic 5000-message chat (`hugechat.zip`
    pattern, not committed - see the two-step `node -e` fixture generator
    in this round's conversation if it needs rebuilding: iOS bracket
    format `[DD/MM/YYYY, HH:MM:SS AM/PM]` requires seconds or the whole
    file silently parses as one giant unparsed message - discovered this
    the hard way building the fixture). Added temporary debug logging to
    trace the scroll math live rather than continuing to guess.
  - Actual root cause: a **third** scroll-affecting mechanism no prior
    round had accounted for - `topSentinel`'s `IntersectionObserver`
    (drives "load more/older messages" when scrolled near the top).
    ChatView's earlier fix correctly stops the "scroll to bottom on
    mount" effect from firing when a message-target is pending, but that
    leaves `chatContainer.scrollTop` at its default `0` while
    `scrollToMessageWithRetry` expands chunks and waits for refs -
    `scrollTop: 0` sits right in `topSentinel`'s trigger zone, firing
    `loadMoreMessages()` *during* the navigation. That function's own
    "preserve scroll position from the bottom" logic
    (`scrollTop = scrollHeight - scrollBottom`) then fires in a separate
    `requestAnimationFrame` and stomps on whatever position the
    navigation scroll had just set, landing the view somewhere between
    the two - explained by live-logged evidence:
    `scrollHeight` grew from 30084 to 45061 *after* `scrollToMessage`
    already logged "Success". Confirms the earlier "switch chats first
    helped" observation was luck, not a real fix - the extra chat-switch
    delay happened to let `loadMoreMessages`'s own scroll adjustment
    settle *before* the message-scroll started, rather than during it;
    once the previous round made `scrollToMessageId` land correctly on
    the very first mount-time effect run (removing that accidental
    delay), the topSentinel race started firing consistently instead of
    intermittently.
  - Fix: reuse the existing `isNavigationScroll` flag (already used
    elsewhere to suppress persistent-highlight-clearing during a
    navigation scroll) as the guard - added `!isNavigationScroll` to the
    `IntersectionObserver` callback's condition before calling
    `loadMoreMessages()`, and moved `isNavigationScroll = true` to the
    *start* of `scrollToMessageWithRetry` (previously only set right
    before the final `scrollTo()` call, i.e. *after* the vulnerable
    chunk-expansion phase) with resets added on every early-return exit
    path (message not found, target changed mid-retry, retries
    exhausted) so it can't get stuck `true` forever. Applied the
    identical fix to the parallel cross-chat-search scroll effect
    (`currentSearchResultId`), which has the exact same chunk-expansion-
    before-`isNavigationScroll` structure and would hit the same bug for
    a search result deep in a long chat, even though it wasn't reported
    yet.
  - Verified live with the 5000-message fixture: target at index 4700
    (shallow expansion) and index 50 (near-total expansion, ~50 chunks)
    both land correctly, in both the no-switch and switch-chat-first
    scenarios. Also re-verified the short-chat cases and the Close-chat/
    scroll-to-bottom buttons from the round above still work unaffected.
  - Lesson reinforced: when a user reports "this got worse instead of
    better" after a scroll/timing fix, don't assume the previous
    diagnosis was right and look for a smaller missed detail - a
    *bigger* regression after a partial fix is often a sign a **separate,
    previously-masked** mechanism is now exposed, not that the same fix
    needs tuning. Reproducing with data at the *scale* the user actually
    has (thousands of messages, not dozens) was what surfaced it - the
    short example fixtures in `examples/chats/` never exercise chunk
    expansion at all (all under 200 messages, fitting the initial
    render window).

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
