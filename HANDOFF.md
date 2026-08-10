# Session Handoff

Personal note for continuing this fork's work in a fresh Claude Code session
(e.g. on a different machine). Not part of the upstream project — delete
anytime, or keep it as your own running log.

## Paste this as your first message in the new session

```
Ini fork pribadi (papaonta/whatsapp-backup-reader) dari open-source
"WhatsApp Backup Reader" (SvelteKit + Svelte 5 + Electron). Baca HANDOFF.md
di root repo ini dulu buat konteks lengkap sebelum mulai kerja.

Ringkas: sesi sebelumnya (di Windows) saya (1) fix bug "Page Unresponsive"
Chrome yang muncul tiap kali app pakai showOpenFilePicker() — solusinya
ganti ke <input type="file"> biasa di semua tempat (FileDropZone,
ReselectFileModal, sidebar import); dan (2) bikin fitur baru "Chat Lock"
per-chat (PIN + opsional WebAuthn/Windows Hello/Touch ID) mirip fitur
Chat Lock WhatsApp asli — lihat src/lib/components/LockPinModal.svelte,
LockedChatPane.svelte, src/lib/helpers/lock-crypto.ts, webauthn.ts.

Sebelum nyaranin/ngubah apapun soal fitur lock ini, penting: ini CUMA UI
gate lokal, BUKAN enkripsi (data chat tetap plaintext di IndexedDB) —
itu keputusan sadar, bukan bug, karena app-nya emang 100% local/no-server.
Jangan asumsikan perlu "diperbaiki" jadi encrypted tanpa didiskusiin dulu.
```

## What got built this session

1. **Fixed a Chrome "Page Unresponsive" false-positive** — every call site
   using `showOpenFilePicker()` (File System Access API) triggered it while
   the native dialog was open. Replaced with plain `<input type="file">`
   everywhere except the drag-and-drop path (which still captures a
   `FileSystemFileHandle` safely via `getAsFileSystemHandle()` +
   `Promise.allSettled`, not `Promise.all` — the original drag-drop bug was
   a single rejected item in `Promise.all` silently killing the whole
   drop). `openZipFilePicker()` in `src/lib/helpers/file-picker.ts` was
   fully removed as dead code once nothing called it anymore.

2. **Per-chat "Chat Lock" feature**, modeled on WhatsApp's own Chat Lock:
   - PIN set once, shared across all locked chats, hashed with PBKDF2
     (`src/lib/helpers/lock-crypto.ts`), stored in IndexedDB via
     `src/lib/persistence.svelte.ts` (`getLockPin`/`setLockPin`/`clearLockPin`).
   - Locking a chat hides its sidebar preview and gates the *entire* right
     pane (header, messages, Media Gallery, Bookmarks, Stats — confirmed via
     code read that they're all inside the same conditional block, not
     separately gated).
   - Unlocking is **session-scoped**: entering the PIN reveals a chat until
     you navigate away (auto re-locks — see the `previousSelectedChatTitle`
     `$effect` in `+page.svelte`, mirrors `ChatView.svelte`'s
     `previousChatId` pattern) or click the manual "Lock now" button. Full
     removal of the lock (vs. just viewing) is a separate action requiring
     the PIN, labeled "Remove lock" in the chat's context menu.
   - "Forgot PIN" only appears after a failed attempt, and requires typing
     "RESET" to confirm — deliberate friction, not real security (see
     below).
   - Optional **WebAuthn biometric unlock** (Windows Hello / Touch ID /
     etc.) via `src/lib/helpers/webauthn.ts`, offered as a checkbox at PIN
     setup and after a correct PIN entry (never before — enrollment must
     never be possible without first proving PIN knowledge). Guarded by an
     `AbortController` + a visible "Waiting for {label}..." state, because
     the WebAuthn `timeout` option alone isn't reliably honored and a
     stuck/unanswered OS prompt used to hang the modal with zero feedback.

## Threat model — read before touching this again

This is explicitly a **local UI gate, not encryption at rest**. Chat/media
data sits unencrypted in IndexedDB and in the loaded ZIP regardless of lock
state. Demonstrated live: the PIN hash record is trivially readable (and
deletable) from the browser's own DevTools console via
`indexedDB.open('keyval-store')` — anyone with console access bypasses
everything, no PIN needed. This is accepted as the ceiling for a
no-server, no-account app; the point is stopping a casual glance
(someone briefly holding your unlocked device), not a technical/malicious
local user. If a stronger promise is ever wanted, that's a real encryption
project (derive a key from the PIN, encrypt chat content), not a small
patch — don't half-do it.

## Verification performed

Installed Playwright + Chromium into a scratch npm project (not a repo
dependency) specifically to drive real browser tests, since no browser
automation tool was otherwise available. Ran ~34 automated UI checks
across the lock flows (setup, wrong PIN, forgot-PIN friction, auto
re-lock, Lock-now, WebAuthn register/verify via a CDP virtual
authenticator) plus a live IndexedDB dump to prove the bypass claim above.
All passed after the WebAuthn timeout fix. `npm run check` is clean.
Electron's packaged build (`app://` custom scheme) was **not** empirically
tested for WebAuthn — only reasoned about from `electron/main.cjs`'s
`protocol.registerSchemesAsPrivileged` config (`secure: true` there, so it
*should* work, but hasn't been built and run to confirm).

## Known, accepted gaps (not TODOs unless you want them to be)

- `lockedByChat` / `unlockedThisSession` entries aren't cleaned up when a
  chat is removed via "Remove chat" — harmless stale Map/Set entries,
  matches the pre-existing convention for `languageByChat` etc.
- New `lock_*` / `chat_remove_lock` i18n keys only exist in `messages/en.json`.
  The other 9 locale files were left as-is on purpose — the user only
  needs EN/ID, and machine-translating strings nobody will read/verify
  was judged not worth doing. Backfill later with `npm run machine-translate`
  if that ever changes.

## Remotes

- `origin` → `rodrigogs/whats-reader` (upstream, read-only for us)
- `mine` → `papaonta/whatsapp-backup-reader` (private fork, push target)
  Current workflow: `git push mine dev:main`.
