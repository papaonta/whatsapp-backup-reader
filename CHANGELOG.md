# 1.0.0 (2026-08-31)


### Bug Fixes

* add actions write permission to release workflow for build triggering ([90c3348](https://github.com/papaonta/whatsapp-backup-reader/commit/90c3348755313d2a3993ea11a1d4b499b547e61e))
* add author email for deb builds and disable electron-builder auto-publish ([25fd8cb](https://github.com/papaonta/whatsapp-backup-reader/commit/25fd8cb64b0dd2c24cbc7f110b904e58ee8d4b6f))
* add changelog and git plugins to semantic-release ([a78c934](https://github.com/papaonta/whatsapp-backup-reader/commit/a78c93462f1f120ade3f085582b47c02df255fee))
* add GH_TOKEN env var to electron-builder steps ([2eea66a](https://github.com/papaonta/whatsapp-backup-reader/commit/2eea66ad218a34ada2710e1d71ce2fc03ab607e1))
* add GH_TOKEN env var to electron-builder steps ([11e73a1](https://github.com/papaonta/whatsapp-backup-reader/commit/11e73a16f2b5411f04b86ab1290d203fe7c531c2))
* add JSDoc comment to IconName type ([#38](https://github.com/papaonta/whatsapp-backup-reader/issues/38)) ([905164d](https://github.com/papaonta/whatsapp-backup-reader/commit/905164dfeb23547d3aa8e53cd798149d5e5c899c)), closes [#33](https://github.com/papaonta/whatsapp-backup-reader/issues/33)
* add JSDoc comment to IconName type for better IDE support ([2693e00](https://github.com/papaonta/whatsapp-backup-reader/commit/2693e007796fb17ee074f793435d2102ca504229))
* add npm plugin to semantic-release to update package.json version ([a30492f](https://github.com/papaonta/whatsapp-backup-reader/commit/a30492faad3b1f49673056e8cf1d31c74998a52c))
* add pull-requests permission for branch sync ([f2be78d](https://github.com/papaonta/whatsapp-backup-reader/commit/f2be78d7b185f8e79001e34ebc38849151560965))
* add pull-requests permission for branch sync ([#42](https://github.com/papaonta/whatsapp-backup-reader/issues/42)) ([48fa840](https://github.com/papaonta/whatsapp-backup-reader/commit/48fa84033dd9cc10165d143ba01ac56f80dbc77e)), closes [#33](https://github.com/papaonta/whatsapp-backup-reader/issues/33)
* add retry logic for npm install to handle CDN failures ([970bd9e](https://github.com/papaonta/whatsapp-backup-reader/commit/970bd9e72fde45688a658cce2e432bedf836bdbd))
* add retry logic to release workflow npm install ([214862b](https://github.com/papaonta/whatsapp-backup-reader/commit/214862bc666410a97255359517dffe3cdcbe8aac))
* add retry logic with npm ci for reliable dependency installation ([c394cb1](https://github.com/papaonta/whatsapp-backup-reader/commit/c394cb16452a4a3e0ec2eb2ed9abd46d6f15db47))
* add retry logic with npm ci for reliable dependency installation ([0ddb07e](https://github.com/papaonta/whatsapp-backup-reader/commit/0ddb07e47a983bcfd20b291c33eb5fae505f5e46))
* add support for YYYY/MM/DD format with 12-hour AM/PM time ([4223d81](https://github.com/papaonta/whatsapp-backup-reader/commit/4223d818f2cbc6b3f164001c3dadf4788921fbfe)), closes [#69](https://github.com/papaonta/whatsapp-backup-reader/issues/69)
* address code review comments - improve video handling, error checking, and file size handling ([88a6b47](https://github.com/papaonta/whatsapp-backup-reader/commit/88a6b4760dcda38046a495951e2d56450a177a0f))
* address code review comments for gallery enhancements ([2e4e7d0](https://github.com/papaonta/whatsapp-backup-reader/commit/2e4e7d0de251d69d357be560f5e87f92c5c83629))
* address code review feedback - prevent infinite loop and SSR check ([35cefe4](https://github.com/papaonta/whatsapp-backup-reader/commit/35cefe40a8986e406ac5f5607b1dd36e178a3996))
* address PR review comments - improve code quality and fix bugs ([0afaa83](https://github.com/papaonta/whatsapp-backup-reader/commit/0afaa8324700e2222a5d0699bbe17de3dc0e7c49))
* address UX audit findings on layout, sidebar, and Backup-ZIP icon ([8eca78d](https://github.com/papaonta/whatsapp-backup-reader/commit/8eca78d0b2c308c8d05aa2d04818763ebafe3e33))
* apply biome formatting to bookmarks panel ([1791533](https://github.com/papaonta/whatsapp-backup-reader/commit/17915331f6afe0bb9bb8886f239ea48e1392ec59))
* apply biome lint fixes for template literals ([cc7740a](https://github.com/papaonta/whatsapp-backup-reader/commit/cc7740a35fea4c3fe7db7f23224a4611a9e3da54))
* auto-restore remembered chats when the restore prompt is dismissed with "don't show again" ([cb981b0](https://github.com/papaonta/whatsapp-backup-reader/commit/cb981b0d9408184af098c7b2b189e249c3557b5d))
* bookmark navigation and collapsible sidebar improvements ([40a3f02](https://github.com/papaonta/whatsapp-backup-reader/commit/40a3f02e015daf90f66811e219101d94fc7d9812))
* Bookmarks dual-mode, header placement, navigation, system messages ([cffdc68](https://github.com/papaonta/whatsapp-backup-reader/commit/cffdc68b00d1303cc67ffd4466e0acd7093fda2b))
* **build:** add arch suffix to Windows installer filenames ([7bb7cac](https://github.com/papaonta/whatsapp-backup-reader/commit/7bb7caccfb28a0d90e2eb9452b1e6dc804ee1ea9))
* **build:** fix race condition by letting CLI control architecture ([a142434](https://github.com/papaonta/whatsapp-backup-reader/commit/a142434281754018ceaa3405c8cbf50e667a3649))
* **build:** split Windows builds into separate x64 and arm64 jobs ([7976c47](https://github.com/papaonta/whatsapp-backup-reader/commit/7976c47763928856518221964992429a8a881f5b))
* **build:** split Windows installers by architecture ([e5e3c0e](https://github.com/papaonta/whatsapp-backup-reader/commit/e5e3c0eff297501a71c4a84a1b2fc9cdc08dcbc6))
* **build:** use macos-14 for both mac architectures ([494ca74](https://github.com/papaonta/whatsapp-backup-reader/commit/494ca74dd8a5e6422d9f0999a9364dde24d54f60))
* chat lock (and other per-chat settings) reset on app lock/unlock ([65fe81f](https://github.com/papaonta/whatsapp-backup-reader/commit/65fe81f1147599e3a478c32c52d74a2e72f50042))
* **chat:** add null checks for chatContainer to prevent scrollHeight errors ([d122385](https://github.com/papaonta/whatsapp-backup-reader/commit/d12238502643b94fac81162863c92311b1149559))
* **chat:** prevent scrollHeight errors with null checks ([#29](https://github.com/papaonta/whatsapp-backup-reader/issues/29)) ([afa848e](https://github.com/papaonta/whatsapp-backup-reader/commit/afa848ebc9386204473ade11d7fb7de8b414e8d1))
* **ci:** add actions:write permission to trigger deploy ([cdeffb8](https://github.com/papaonta/whatsapp-backup-reader/commit/cdeffb8ec2404723e890a1e396c8904e625932b3))
* **ci:** cleanup draft releases on cancelled builds ([00d3fc1](https://github.com/papaonta/whatsapp-backup-reader/commit/00d3fc1b75300a6e8836a05de9ae35fa8f866b2f))
* **ci:** create PR for dev sync (branch is protected) ([b5a999a](https://github.com/papaonta/whatsapp-backup-reader/commit/b5a999a0b0a07dc88eb0fe83629b16b1368dea5a))
* **ci:** create PR instead of direct push for main→dev sync ([51e1e84](https://github.com/papaonta/whatsapp-backup-reader/commit/51e1e847b3865c2a6d9b1f4a1bc7dae06fa13486))
* **ci:** remove duplicate release asset uploads ([c451a83](https://github.com/papaonta/whatsapp-backup-reader/commit/c451a8394caf439afd29d4dedc3dfaf2ab27b779)), closes [softprops/action-#release](https://github.com/softprops/action-/issues/release)
* **ci:** split Windows installers and sync main to dev ([d2c4a95](https://github.com/papaonta/whatsapp-backup-reader/commit/d2c4a953e8d417f9d0144df5bdc9feea9a418519))
* **ci:** sync main to dev after release is published ([6969a70](https://github.com/papaonta/whatsapp-backup-reader/commit/6969a70f8ca5bf826d2ca974d0556b1186664bcd))
* **ci:** trigger deploy from build workflow after publish ([74c1567](https://github.com/papaonta/whatsapp-backup-reader/commit/74c1567b5f9458b0782affab397d8515476bfa92))
* **ci:** trigger deploy only after release is published ([f257908](https://github.com/papaonta/whatsapp-backup-reader/commit/f257908d446ad6af6651a8e676ab1adcf6eaeeb0))
* **ci:** use GitHub API for branch sync (no git repo needed) ([35e1007](https://github.com/papaonta/whatsapp-backup-reader/commit/35e100721b61ba4fcda921110af203bea0b0de8d))
* **ci:** use native ARM64 runner for linux-arm64 builds ([68675e6](https://github.com/papaonta/whatsapp-backup-reader/commit/68675e6a4cb134717a76c6fcce529998df03d2e0))
* **ci:** use runner.temp for electron cache paths ([1145384](https://github.com/papaonta/whatsapp-backup-reader/commit/1145384c26b4fdc4792329e70f12868c2d2afd57))
* **ci:** use x64 runner for linux-arm64 with AppImage only ([94d85b8](https://github.com/papaonta/whatsapp-backup-reader/commit/94d85b8af1757f5834c2d3acb7a3e3187222028b))
* close media gallery and auto-load media on mobile navigation + consolidate platform detection + i18n ([#62](https://github.com/papaonta/whatsapp-backup-reader/issues/62)) ([ca8bcf5](https://github.com/papaonta/whatsapp-backup-reader/commit/ca8bcf522629298178541dac4bd6882a1cdf6c03))
* configure base path for GitHub Pages deployment ([c77c8f3](https://github.com/papaonta/whatsapp-backup-reader/commit/c77c8f31fbdce40bfcaf5bacccbf9c8d168d47fb))
* correct closing tags in empty state layout ([82b448c](https://github.com/papaonta/whatsapp-backup-reader/commit/82b448caa1a081f99dc6bf4f3022d03c47ffb18a))
* correct media file filtering logic for hidden files ([4955587](https://github.com/papaonta/whatsapp-backup-reader/commit/4955587ad3806a4b75f3a2434e71429739b59de8))
* duplicate-import detection missing Android exports, inconsistent Update ([4352feb](https://github.com/papaonta/whatsapp-backup-reader/commit/4352feb415e3e063743b2f4255228d5a27ce999f))
* enable automatic changelog updates ([82352c3](https://github.com/papaonta/whatsapp-backup-reader/commit/82352c3d2eb4130c44fca10e995c7384dd0ea11c))
* ensure auto-updater metadata files are uploaded to releases ([ababfa3](https://github.com/papaonta/whatsapp-backup-reader/commit/ababfa34742d6f2aa0b881dc33c9d655b0a950aa))
* extract better chat titles from iOS _chat.txt exports ([e7f76fe](https://github.com/papaonta/whatsapp-backup-reader/commit/e7f76fe65d16d0a622d1fb8e87fbc3403bd19879))
* final verification of asset consistency ([7d1e0d0](https://github.com/papaonta/whatsapp-backup-reader/commit/7d1e0d09299651603e51009845d446db41c86966))
* forget removes all stale duplicate records, reject mismatched reselect ([efea226](https://github.com/papaonta/whatsapp-backup-reader/commit/efea22682c43c9e12c6e3aaeed75df98fcb16186))
* give merge-chats its own icon instead of reusing upload ([112c0a0](https://github.com/papaonta/whatsapp-backup-reader/commit/112c0a0df285d0d6249da81b1610834945e2ccff))
* header no longer shrinks when side panels expand ([1fa3fc9](https://github.com/papaonta/whatsapp-backup-reader/commit/1fa3fc93fbc3e5c3f65d79b55a8799deb6290af7))
* improve afterPack logging to show architecture ([859e187](https://github.com/papaonta/whatsapp-backup-reader/commit/859e187a32f087a516324b9f234a66bf7dc1ff76))
* improve empty state layout and unify colors ([d2cb381](https://github.com/papaonta/whatsapp-backup-reader/commit/d2cb3814a596903f96aed2cebfb02bda227dbcdd))
* improve empty state settings buttons positioning ([372a740](https://github.com/papaonta/whatsapp-backup-reader/commit/372a7408ba77f242feb7d5b0a32a2faa28365020))
* improve favicon/PWA setup per best practices ([ecb4a0b](https://github.com/papaonta/whatsapp-backup-reader/commit/ecb4a0b9ec3239b745eb8047e28d75e8b784dd71))
* include dependencies in electron build to resolve module not found errors ([b8335a2](https://github.com/papaonta/whatsapp-backup-reader/commit/b8335a2d77d42d97caa61b29bb51d19c7d1e95fc))
* iOS chat titles, title-collision data loss, and remember/reselect UX ([a5fee42](https://github.com/papaonta/whatsapp-backup-reader/commit/a5fee4244426d4f10fcb9d999d0042157c4ac463))
* language switching and fixed position for settings buttons ([33ef476](https://github.com/papaonta/whatsapp-backup-reader/commit/33ef4764febe2ac2e6c0aaf6d247cfc25f7eb87a))
* let a stale saved conversation be deleted directly from restore prompt ([6ad94ad](https://github.com/papaonta/whatsapp-backup-reader/commit/6ad94ad5c2db4dff7ca2c29f088d88f0aa2d0c98))
* locking/unlocking the app duplicates every open chat ([1475598](https://github.com/papaonta/whatsapp-backup-reader/commit/14755988bbab48190dd8a48f53b3fa297a0d7f1d))
* logo not displaying on GitHub Pages due to absolute path ([bd47e97](https://github.com/papaonta/whatsapp-backup-reader/commit/bd47e97eab50bb27d3b8e1356ca7f09b6eac15f3))
* macOS dock icon with proper rounded corners and padding ([2c8df2a](https://github.com/papaonta/whatsapp-backup-reader/commit/2c8df2a6f6dc876d5aa534644b2fe7806f3bab90))
* make Archived chats reachable on mobile-width ([f52a590](https://github.com/papaonta/whatsapp-backup-reader/commit/f52a590569d4c8aa62ddd2c33eba17f69cc008d8))
* make go-to-message navigation deterministic, add close-chat and scroll-to-bottom buttons ([2c93c5b](https://github.com/papaonta/whatsapp-backup-reader/commit/2c93c5b59537aadd02caa95bf0b81fd0448a80ff))
* make language and dark mode buttons fixed position at top-right ([d8d6e5e](https://github.com/papaonta/whatsapp-backup-reader/commit/d8d6e5e1525f1acbc0df9499e86892f0c86f1ec0))
* only show electron titlebar drag region on macOS ([4e5bf73](https://github.com/papaonta/whatsapp-backup-reader/commit/4e5bf73046553a3b4624891c3ab8639a117563b8))
* **parser:** derive iOS _chat title from zip ([981af9d](https://github.com/papaonta/whatsapp-backup-reader/commit/981af9daa91cc46fcc361248520a3029cdc0f0a4))
* **parser:** support iOS <attached: media markers in all languages ([50f24f3](https://github.com/papaonta/whatsapp-backup-reader/commit/50f24f3c9e286a3306bb7db05b8cd9ef59c209c6))
* pin electron-builder to ~26.0.12 ([95cb0b7](https://github.com/papaonta/whatsapp-backup-reader/commit/95cb0b71ef8aa7443b1300f6a3ad52e366f1b04b))
* preserve original line content in parseLine for sender/content ([ec7c3da](https://github.com/papaonta/whatsapp-backup-reader/commit/ec7c3daf1640735678a47fff490eb7303afa5eb0))
* prevent loadMoreMessages from hijacking go-to-message scroll in long chats ([a24f783](https://github.com/papaonta/whatsapp-backup-reader/commit/a24f7839ccf9b8b46460407c937be15c5aedb6de))
* prevent premature release publishing by keeping draft status ([9c94b7f](https://github.com/papaonta/whatsapp-backup-reader/commit/9c94b7fa51c2a32c49647d34266f9b0a0dd0d82e))
* recover chat transcripts from real WhatsApp exports with a bogus zip entry count ([1dfe228](https://github.com/papaonta/whatsapp-backup-reader/commit/1dfe22895c73e2ca8fc0d8e8ca8817d0bb3db5b7))
* regenerate package-lock.json after removing postinstall script ([d69043d](https://github.com/papaonta/whatsapp-backup-reader/commit/d69043d6d9e142b297b479d9f721db0407244bdb))
* regenerate package-lock.json for Node.js 24 compatibility ([cce6493](https://github.com/papaonta/whatsapp-backup-reader/commit/cce6493d25e8ff7505224aec87c4a15afdbb276e))
* reload page on locale change for proper UI update ([41c032d](https://github.com/papaonta/whatsapp-backup-reader/commit/41c032dcc81a6928697372b24434079268b1f01e))
* remove AppImage target due to unreliable CDN downloads ([6c41ee9](https://github.com/papaonta/whatsapp-backup-reader/commit/6c41ee9fcb67aaad5c7a4f3eb46c6a408ce3098e))
* remove duplicate electron-drag bars causing chunky headers ([95d27d9](https://github.com/papaonta/whatsapp-backup-reader/commit/95d27d91f3dedf19d9cd5d232b560733721342e9))
* remove duplicate sync step (handled in build.yml) ([e0499de](https://github.com/papaonta/whatsapp-backup-reader/commit/e0499de1c146c96dc279fe6a152de4821b7428d0))
* remove duplicate sync step from release workflow ([#41](https://github.com/papaonta/whatsapp-backup-reader/issues/41)) ([d68c258](https://github.com/papaonta/whatsapp-backup-reader/commit/d68c258f116f59cb08281ba288905f2cc84390fc)), closes [#33](https://github.com/papaonta/whatsapp-backup-reader/issues/33)
* remove git plugin from semantic-release (conflicts with branch protection) ([54e21dc](https://github.com/papaonta/whatsapp-backup-reader/commit/54e21dc45cbf51de7f4b8a3add3dcaafc63938c1))
* remove git plugin from semantic-release to avoid branch protection issues ([defa594](https://github.com/papaonta/whatsapp-backup-reader/commit/defa59476790808df315d5dcbcdb173ff239f679))
* remove invalid compressionLevel from NSIS config ([8688228](https://github.com/papaonta/whatsapp-backup-reader/commit/868822891d5ed45d125d991f4cfd3ca36a47093e))
* remove TypeScript error by eliminating private _data property access ([25ce061](https://github.com/papaonta/whatsapp-backup-reader/commit/25ce06115e60702cca0747ba9cf2f7b002fbe815))
* resolve search freeze and improve scroll to results ([#4](https://github.com/papaonta/whatsapp-backup-reader/issues/4)) ([904ea97](https://github.com/papaonta/whatsapp-backup-reader/commit/904ea9723bdee57400a9a1100def46bbf052cc65))
* resolve TypeScript and lint errors in auto-updater implementation ([181797b](https://github.com/papaonta/whatsapp-backup-reader/commit/181797b1f9f362527f23d0139f8b532dda4a8f9b))
* resolve TypeScript type error with LocalizedString concatenation ([6e9d6a4](https://github.com/papaonta/whatsapp-backup-reader/commit/6e9d6a48a04c01f6b73b737a500257110710a176))
* restore changelog and git plugins to semantic-release ([3e1fb9a](https://github.com/papaonta/whatsapp-backup-reader/commit/3e1fb9afd95d99e48f808cf8fa2392337cf4fd13))
* restored chats losing their disambiguated title, causing duplicates ([a3d6215](https://github.com/papaonta/whatsapp-backup-reader/commit/a3d62158470efbd5cf78b69d374d32f1b512fcfa))
* retry build to verify asset consistency ([fd916da](https://github.com/papaonta/whatsapp-backup-reader/commit/fd916dae89a467c61db199150912e86d27a24629))
* skip CUDA binaries for onnxruntime to prevent CDN timeouts ([7e94061](https://github.com/papaonta/whatsapp-backup-reader/commit/7e94061d39474c3482614c22d9209080f5d1fca8))
* sort chat list by most recent message, not import/restore order ([bbe60f5](https://github.com/papaonta/whatsapp-backup-reader/commit/bbe60f5307035cf877bf1a3922fdac9653924006))
* stream large ZIP imports to disk instead of buffering in memory (Electron) ([2e3824d](https://github.com/papaonta/whatsapp-backup-reader/commit/2e3824de280c7050cee556017f43d28f678cb19f))
* support dot-separated time and invisible chars in chat date parsing ([a82fc30](https://github.com/papaonta/whatsapp-backup-reader/commit/a82fc30586bb68582888ae603c18ed14a0f73f91))
* switch to yauzl-promise to handle 4-6GB WhatsApp export ZIPs ([2b32c3b](https://github.com/papaonta/whatsapp-backup-reader/commit/2b32c3b453340ab7c151d4708c1d33acf6286dd6)), closes [thejoshwolfe/yauzl#69](https://github.com/thejoshwolfe/yauzl/issues/69)
* switching from Archived to Starred left the rail stuck on Archived ([7d7dde1](https://github.com/papaonta/whatsapp-backup-reader/commit/7d7dde1fa1eef002294699a50622757f6e92cd3b))
* test build with CUDA skip configuration ([f24cd55](https://github.com/papaonta/whatsapp-backup-reader/commit/f24cd5543f362fb88b21a03f806cdda0c70d8020))
* trigger build workflow after release ([4d4ef5a](https://github.com/papaonta/whatsapp-backup-reader/commit/4d4ef5aeafcebb86347551778344d83c563dbd17))
* trigger build workflow after semantic release ([bd96c83](https://github.com/papaonta/whatsapp-backup-reader/commit/bd96c83ea713aee284cba30e0c96c3ef422e7742))
* trigger manual release for testing ([92658a6](https://github.com/papaonta/whatsapp-backup-reader/commit/92658a617d5f3ed1c29767a1b9485ec1c5fc7046))
* trigger release ([82c7622](https://github.com/papaonta/whatsapp-backup-reader/commit/82c7622e3c1bbdc267c0305209d66d7498869c7d))
* **ui:** make empty state page scrollable on small screens ([802123e](https://github.com/papaonta/whatsapp-backup-reader/commit/802123e460e983643cd36a72aacb1cd787d04b94))
* update CI badge to use dev branch ([db945ee](https://github.com/papaonta/whatsapp-backup-reader/commit/db945ee2c7c4e7dd7dbc79b77ffe9d1f3625c4fa))
* update electron:dev script to use cross-env for setting NODE_ENV ([65a1683](https://github.com/papaonta/whatsapp-backup-reader/commit/65a1683e4b5620da8e3b8ac0f53fedc88fb26260))
* update package-lock.json to resolve picomatch dependency conflict ([98af4c9](https://github.com/papaonta/whatsapp-backup-reader/commit/98af4c9c8c8432f1f841a8f76217f7d3b85f885c))
* update package.json version in build workflow before building ([49a6978](https://github.com/papaonta/whatsapp-backup-reader/commit/49a6978ad62a959e51f98ddde5058e255bdab0af))
* update README images to reference favicon.png ([05c88f3](https://github.com/papaonta/whatsapp-backup-reader/commit/05c88f394f664700a7bbd20b8caea6d4be821a87))
* use custom protocol for Electron production builds ([5cf7865](https://github.com/papaonta/whatsapp-backup-reader/commit/5cf786513fc57ad43c2b16905bd6553c35abdaad))
* use GitHub API to sync dev with main after release ([a7bb91f](https://github.com/papaonta/whatsapp-backup-reader/commit/a7bb91ffc2c5543148ecb48781907789db6b674f))
* use npm install instead of npm ci to avoid lock file sync issues ([1da401c](https://github.com/papaonta/whatsapp-backup-reader/commit/1da401c932dc9dbb977f231733c6097d2e7337b9))
* verify asset generation consistency ([2468e16](https://github.com/papaonta/whatsapp-backup-reader/commit/2468e16a8d2311a534a740e3d6dc678b2e7d88a9))


### Features

* add "On This Day" memories banner ([37eaa27](https://github.com/papaonta/whatsapp-backup-reader/commit/37eaa27132bad873593b232bf79cc31c33cf76ea))
* add app icons, favicon, and PWA manifest ([19384c0](https://github.com/papaonta/whatsapp-backup-reader/commit/19384c0d10739c3641f0024d02f76711d7096707))
* add app-level PIN lock, first-run onboarding, and a Settings screen ([c869d4d](https://github.com/papaonta/whatsapp-backup-reader/commit/c869d4db5aee25b1beb436e284880dcfd3a24108))
* add AppImage build for Linux ([c2a9b49](https://github.com/papaonta/whatsapp-backup-reader/commit/c2a9b495e832add275ddcb166bbbd1806c082638))
* add audio transcription with Web Worker, auto-load media, and floating menus ([754d31e](https://github.com/papaonta/whatsapp-backup-reader/commit/754d31eb7fd0ee81a9dbccba4eb3b7f57cb3a79f))
* add auto-update checker with version badge and toast notification ([977afbf](https://github.com/papaonta/whatsapp-backup-reader/commit/977afbf091c62dfe0649b8d0a4e776d184b8fd10))
* add cancel button for in-progress ZIP extraction ([f0bb0a4](https://github.com/papaonta/whatsapp-backup-reader/commit/f0bb0a48fd385c02967af127e59e81b893d0d274))
* add chat info panel, subsuming the old Participants modal (Fase 6a) ([7aa03fa](https://github.com/papaonta/whatsapp-backup-reader/commit/7aa03fad24b01e940bba7e490004a08df5a89bc4))
* add clickable links with WhatsApp-style colors in chat bubbles ([94ec4a3](https://github.com/papaonta/whatsapp-backup-reader/commit/94ec4a3f3f6c5170bb13bb1a3c2f840c9e9cbc45)), closes [#00897B](https://github.com/papaonta/whatsapp-backup-reader/issues/00897B) [#4FC3F7](https://github.com/papaonta/whatsapp-backup-reader/issues/4FC3F7)
* add cross-chat message content search (Fase 6d) ([efb2358](https://github.com/papaonta/whatsapp-backup-reader/commit/efb2358e3a4d3a28971fa08153ffef02d2d42e4b))
* add distinct Android and iOS example chats with improved documentation ([b8f41f7](https://github.com/papaonta/whatsapp-backup-reader/commit/b8f41f7559fd4bfe08467181418f0aeec975d3c4))
* add FlatItem types for precomputed message indexing ([b002fb5](https://github.com/papaonta/whatsapp-backup-reader/commit/b002fb56f32d2c27ffeba9baeb25e29bab5f2053))
* add global "View as" default identity (Fase 6c) ([650b3a9](https://github.com/papaonta/whatsapp-backup-reader/commit/650b3a9d78c7a15eb48481127d8fa67efc2db2d2))
* add i18n with Paraglide JS and UI improvements ([bbe45bd](https://github.com/papaonta/whatsapp-backup-reader/commit/bbe45bdf1757fd215ffc66026609f0da98b314bf))
* add left icon rail and clean up idle empty states (Fase 2) ([3ffef01](https://github.com/papaonta/whatsapp-backup-reader/commit/3ffef015cf8eaeff7f4f1323ace1c798cabc12f8))
* add message bookmarks with comments ([bf61c67](https://github.com/papaonta/whatsapp-backup-reader/commit/bf61c6787a179b3e91c89d310eb8cac0ac91e611))
* add missing README translations for Italian, Dutch, Japanese, Chinese, and Russian ([5f0f2bf](https://github.com/papaonta/whatsapp-backup-reader/commit/5f0f2bfbea62fb84b179252d6ed87e17af83b8de))
* add missing translations for bookmarks and loading states ([#10](https://github.com/papaonta/whatsapp-backup-reader/issues/10)) ([4c5db28](https://github.com/papaonta/whatsapp-backup-reader/commit/4c5db2872cf5c03f1d919f254ebba4d58c6c4010))
* add multi-language support and enhanced parser ([591084a](https://github.com/papaonta/whatsapp-backup-reader/commit/591084aa53eca16a745019e03b54de14faaf469c))
* add multiselect filters for media gallery ([#49](https://github.com/papaonta/whatsapp-backup-reader/issues/49)) ([3cd58e3](https://github.com/papaonta/whatsapp-backup-reader/commit/3cd58e36b406f67309b737bfab0eac6afd297a25))
* add per-chat backup ZIP download (transcript + all media) ([b5a40fe](https://github.com/papaonta/whatsapp-backup-reader/commit/b5a40fe5bcac577c1354cec8dd2a500e071ab59a))
* add persistent conversation feature with cross-platform file restoration ([#66](https://github.com/papaonta/whatsapp-backup-reader/issues/66)) ([432bdb4](https://github.com/papaonta/whatsapp-backup-reader/commit/432bdb44f04ad9e3850430bc97ed47026385456a))
* Add responsive chat header options menu for small screens ([#55](https://github.com/papaonta/whatsapp-backup-reader/issues/55)) ([4932bd2](https://github.com/papaonta/whatsapp-backup-reader/commit/4932bd21ee0bfd552308e43b41e027e8f20ec6c5)), closes [#56](https://github.com/papaonta/whatsapp-backup-reader/issues/56)
* add support for all OS architectures in releases ([5e76828](https://github.com/papaonta/whatsapp-backup-reader/commit/5e76828dcc9ce28d643497524339892dacd02029))
* add support for iOS WhatsApp export format with enhanced error handling ([8a8e8ea](https://github.com/papaonta/whatsapp-backup-reader/commit/8a8e8ead22c91b76a25935442891310afa9472d6))
* always show remembered chats on launch, replace remove/forget with Delete Chat ([7d507bf](https://github.com/papaonta/whatsapp-backup-reader/commit/7d507bf535ddef7bbd57d3ea51a03e81ca39c57c))
* assign distinct per-sender name colors in group chats ([42a5532](https://github.com/papaonta/whatsapp-backup-reader/commit/42a5532925c9dd462f6ff986f650381c47c62c7a))
* auto-infer "View as" from a deleted-message placeholder ([2f1fc7c](https://github.com/papaonta/whatsapp-backup-reader/commit/2f1fc7c202a171693cf17195201c147dd1301da6))
* complete all README translations with full content matching README.md structure ([0086b90](https://github.com/papaonta/whatsapp-backup-reader/commit/0086b90d62748c2712e9d08e9b7b4859671a99f9))
* complete Spanish, Portuguese, German, French README translations ([12b6523](https://github.com/papaonta/whatsapp-backup-reader/commit/12b6523a7d2652fbcdae8ae40f7c53c7d9d6f19f))
* create releases as drafts, publish only after all assets are uploaded ([6eaa902](https://github.com/papaonta/whatsapp-backup-reader/commit/6eaa902e9f6c106affacc539b53214a5ccbcf1d4))
* elegant branch sync with peter-evans/create-pull-request ([#40](https://github.com/papaonta/whatsapp-backup-reader/issues/40)) ([a910f69](https://github.com/papaonta/whatsapp-backup-reader/commit/a910f69d6ed7af9f786d48f101d4e2f200ce8c73)), closes [#33](https://github.com/papaonta/whatsapp-backup-reader/issues/33)
* export chat as a printable, self-contained HTML file ([7fa74e8](https://github.com/papaonta/whatsapp-backup-reader/commit/7fa74e833b2cf46b4e0f5a842d3e8aaa1f8433e8))
* extract reusable UI components ([cad1fe9](https://github.com/papaonta/whatsapp-backup-reader/commit/cad1fe906f8362fe3726492031cb42687ee1ed76))
* **gallery:** enhance media thumbnails with video preview, audio duration, and improved document display ([8e8b1a4](https://github.com/papaonta/whatsapp-backup-reader/commit/8e8b1a49bef6afc0860a48bd05b8e0c0078d415a))
* **gallery:** enhance media thumbnails with video preview, audio duration, and improved document display ([#26](https://github.com/papaonta/whatsapp-backup-reader/issues/26)) ([53b79dd](https://github.com/papaonta/whatsapp-backup-reader/commit/53b79dd1bc6d49c6220d93d53af245c9b87f7200))
* **i18n:** complete translation coverage for all UI strings ([f5fc8a3](https://github.com/papaonta/whatsapp-backup-reader/commit/f5fc8a320d2bf840ef3f9f32b544f5df53565c30))
* implement Fase 3 - Archive & Delete ([7afd53a](https://github.com/papaonta/whatsapp-backup-reader/commit/7afd53a9664e9d3d87d501e411bc44cb04094fdc))
* implement true auto-update with electron-updater, optimize build pipeline, reduce Windows binary size ([53b9197](https://github.com/papaonta/whatsapp-backup-reader/commit/53b91971a99265a96dcc2d93f4bedff3a9dd0f61))
* improve bookmark button positioning and UI responsiveness ([68327cb](https://github.com/papaonta/whatsapp-backup-reader/commit/68327cb6d0119ce28ea1d66828a66f272199bc85))
* improve date format detection and resilience ([d8f9ddc](https://github.com/papaonta/whatsapp-backup-reader/commit/d8f9ddc4d51c33be258cc6652bbd6637b556f6ab)), closes [#69](https://github.com/papaonta/whatsapp-backup-reader/issues/69)
* improve search UX and progress indicators ([0eab2f7](https://github.com/papaonta/whatsapp-backup-reader/commit/0eab2f727d5a992a0dd6c728b2a00c41aa7bf5db))
* improve social media preview images with app logo ([f0c4c26](https://github.com/papaonta/whatsapp-backup-reader/commit/f0c4c268d18c7728ddcde4e8ab72b2f030464e7c))
* improve update dialog with ignore version and never ask options ([068e65e](https://github.com/papaonta/whatsapp-backup-reader/commit/068e65e56dbed0f45a9fa590dd3f9d6db29a9fb6))
* make All Media real - cross-chat media gallery (Fase 6b) ([d9996f4](https://github.com/papaonta/whatsapp-backup-reader/commit/d9996f4203299062df28b725b24c5d8012c4758d))
* make merged chats durable across restarts ([be67d88](https://github.com/papaonta/whatsapp-backup-reader/commit/be67d88850872277fc4dd510d274030d18128b80))
* media gallery with go-to-date calendar ([#17](https://github.com/papaonta/whatsapp-backup-reader/issues/17)) ([fda4bd6](https://github.com/papaonta/whatsapp-backup-reader/commit/fda4bd6705400436350a3262bd76eb48a218d784)), closes [#18](https://github.com/papaonta/whatsapp-backup-reader/issues/18)
* merge bookmarks on import instead of replacing ([26fb943](https://github.com/papaonta/whatsapp-backup-reader/commit/26fb943da1bc15c1caa08a5434c7249b277b9b3b))
* merge multiple exports of the same chat ([d127b05](https://github.com/papaonta/whatsapp-backup-reader/commit/d127b05dceae5eae1c90b609537e219424d034dc))
* rebrand fork with independent credit and point updates at own repo ([f7cc850](https://github.com/papaonta/whatsapp-backup-reader/commit/f7cc850da19e005bfd311fba8ac090911c04b501))
* redesign export instructions as collapsible accordion ([d637cd8](https://github.com/papaonta/whatsapp-backup-reader/commit/d637cd82b21058f64e5c12987083e41bf43e56c9))
* redesign export instructions as collapsible accordion ([#8](https://github.com/papaonta/whatsapp-backup-reader/issues/8)) ([c6e1bd8](https://github.com/papaonta/whatsapp-backup-reader/commit/c6e1bd8009678d5bb8c471333bab193febdd4de6))
* relocate import button and add chat-list search filter (Fase 5) ([893ef1e](https://github.com/papaonta/whatsapp-backup-reader/commit/893ef1ee57f86644f70029a3186289d21d94e483))
* remember conversations by default, with a per-chat opt-out ([0bf99c5](https://github.com/papaonta/whatsapp-backup-reader/commit/0bf99c5e05bdb3d0d1df8e87d8d677241e664fdf))
* rename Bookmarks to Starred, fix persistence/scroll bugs, star from All Media ([c8b9554](https://github.com/papaonta/whatsapp-backup-reader/commit/c8b9554f94e57be8e2335b183a995f1c5aa70836))
* synchronize all README translations with complete content matching README.md structure ([75ce077](https://github.com/papaonta/whatsapp-backup-reader/commit/75ce077168db51f3d36b60c93bc75005d6b442ea))
* turn Settings into a full section instead of a modal (Fase 4) ([1ad9cdc](https://github.com/papaonta/whatsapp-backup-reader/commit/1ad9cdc414be7b0abea3351cd247a51abd7ba663))
* UI componentization with reusable components ([47f0496](https://github.com/papaonta/whatsapp-backup-reader/commit/47f04961283f85198f36fed3b9b75fd06f4e6d41))
* use browser preferred language as default locale ([ea19ea8](https://github.com/papaonta/whatsapp-backup-reader/commit/ea19ea8de75ac7ec3eb65600e9798889ad89916e))
* use peter-evans/create-pull-request for elegant branch sync ([f302d5f](https://github.com/papaonta/whatsapp-backup-reader/commit/f302d5f32491f8f7f3aca526d4529722e42cbe6a))
* validate and test complete draft-first release workflow ([c2a4397](https://github.com/papaonta/whatsapp-backup-reader/commit/c2a4397d469a7edda0c6e9375a0aa60f6fb103f5))
* verify consistent asset generation across releases ([1d4b549](https://github.com/papaonta/whatsapp-backup-reader/commit/1d4b549516da6bf7cbb280d1d4b56da61b7838dc))
* warn before re-importing a chat that's already been saved (Electron) ([b9ad92d](https://github.com/papaonta/whatsapp-backup-reader/commit/b9ad92db020911431f7f289ae76ee91e82b80453))


### Performance Improvements

* **build:** split macOS builds into parallel x64/arm64 jobs ([cbda8f2](https://github.com/papaonta/whatsapp-backup-reader/commit/cbda8f20db49845251fc27f95face06ff45f7af8))
* **build:** use ULFO format for DMG (faster lzfse compression) ([76f2077](https://github.com/papaonta/whatsapp-backup-reader/commit/76f20771986a5b1395b5229c8ac3c4e01986bbb4))
* **ci:** fix electron cache to persist between builds ([fb5104f](https://github.com/papaonta/whatsapp-backup-reader/commit/fb5104f0c5492d334f21e4f57ef5dc0f3105865b))
* optimize binary size by excluding unnecessary node_modules ([ffab963](https://github.com/papaonta/whatsapp-backup-reader/commit/ffab96378c02117346153e62a2f2f606e6521214))
* optimize electron build size by removing onnxruntime-node (saves 210MB) ([3e75ddd](https://github.com/papaonta/whatsapp-backup-reader/commit/3e75ddd6d533b66143b563935f926c182823d046))
* precompute message index via web worker for faster navigation ([4bb036e](https://github.com/papaonta/whatsapp-backup-reader/commit/4bb036e3bbd3fbcabe821998ed8bbd3d82036db5))
* reduce Electron app bundle size ([bf6b3b1](https://github.com/papaonta/whatsapp-backup-reader/commit/bf6b3b102d6cb5fdb3f8a6e06fb9c5e0a9240fe4))
* swap ONNX Runtime JSEP WASM for CPU-only variant ([3014cbd](https://github.com/papaonta/whatsapp-backup-reader/commit/3014cbdd6e3aa44ed080e46dbc9583d510e9f75f))
* use afterPack hook to remove onnxruntime-node (saves 141MB) ([0c91df3](https://github.com/papaonta/whatsapp-backup-reader/commit/0c91df3c8f5cd553e8884ebd9214bee918444b35))

## [1.30.4](https://github.com/rodrigogs/whats-reader/compare/v1.30.3...v1.30.4) (2026-04-03)


### Bug Fixes

* update README images to reference favicon.png ([05c88f3](https://github.com/rodrigogs/whats-reader/commit/05c88f394f664700a7bbd20b8caea6d4be821a87))

## [1.30.3](https://github.com/rodrigogs/whats-reader/compare/v1.30.2...v1.30.3) (2026-04-03)


### Performance Improvements

* swap ONNX Runtime JSEP WASM for CPU-only variant ([3014cbd](https://github.com/rodrigogs/whats-reader/commit/3014cbdd6e3aa44ed080e46dbc9583d510e9f75f))

## [1.30.2](https://github.com/rodrigogs/whats-reader/compare/v1.30.1...v1.30.2) (2026-04-03)


### Performance Improvements

* reduce Electron app bundle size ([bf6b3b1](https://github.com/rodrigogs/whats-reader/commit/bf6b3b102d6cb5fdb3f8a6e06fb9c5e0a9240fe4))

## [1.30.1](https://github.com/rodrigogs/whats-reader/compare/v1.30.0...v1.30.1) (2026-04-01)


### Bug Fixes

* pin electron-builder to ~26.0.12 ([95cb0b7](https://github.com/rodrigogs/whats-reader/commit/95cb0b71ef8aa7443b1300f6a3ad52e366f1b04b))

# [1.30.0](https://github.com/rodrigogs/whats-reader/compare/v1.29.4...v1.30.0) (2026-04-01)


### Bug Fixes

* preserve original line content in parseLine for sender/content ([ec7c3da](https://github.com/rodrigogs/whats-reader/commit/ec7c3daf1640735678a47fff490eb7303afa5eb0))


### Features

* add persistent conversation feature with cross-platform file restoration ([#66](https://github.com/rodrigogs/whats-reader/issues/66)) ([432bdb4](https://github.com/rodrigogs/whats-reader/commit/432bdb44f04ad9e3850430bc97ed47026385456a))
* improve date format detection and resilience ([d8f9ddc](https://github.com/rodrigogs/whats-reader/commit/d8f9ddc4d51c33be258cc6652bbd6637b556f6ab)), closes [#69](https://github.com/rodrigogs/whats-reader/issues/69)

## [1.29.4](https://github.com/rodrigogs/whats-reader/compare/v1.29.3...v1.29.4) (2026-03-31)


### Bug Fixes

* **parser:** support iOS <attached: media markers in all languages ([50f24f3](https://github.com/rodrigogs/whats-reader/commit/50f24f3c9e286a3306bb7db05b8cd9ef59c209c6))

## [1.29.3](https://github.com/rodrigogs/whats-reader/compare/v1.29.2...v1.29.3) (2026-03-03)


### Bug Fixes

* add support for YYYY/MM/DD format with 12-hour AM/PM time ([4223d81](https://github.com/rodrigogs/whats-reader/commit/4223d818f2cbc6b3f164001c3dadf4788921fbfe)), closes [#69](https://github.com/rodrigogs/whats-reader/issues/69)

## [1.29.2](https://github.com/rodrigogs/whats-reader/compare/v1.29.1...v1.29.2) (2026-03-03)


### Bug Fixes

* trigger release ([82c7622](https://github.com/rodrigogs/whats-reader/commit/82c7622e3c1bbdc267c0305209d66d7498869c7d))

## [1.29.1](https://github.com/rodrigogs/whats-reader/compare/v1.29.0...v1.29.1) (2026-01-11)


### Bug Fixes

* close media gallery and auto-load media on mobile navigation + consolidate platform detection + i18n ([#62](https://github.com/rodrigogs/whats-reader/issues/62)) ([ca8bcf5](https://github.com/rodrigogs/whats-reader/commit/ca8bcf522629298178541dac4bd6882a1cdf6c03))

# [1.29.0](https://github.com/rodrigogs/whats-reader/compare/v1.28.0...v1.29.0) (2026-01-05)


### Features

* improve bookmark button positioning and UI responsiveness ([68327cb](https://github.com/rodrigogs/whats-reader/commit/68327cb6d0119ce28ea1d66828a66f272199bc85))

# [1.28.0](https://github.com/rodrigogs/whats-reader/compare/v1.27.0...v1.28.0) (2026-01-05)


### Features

* add clickable links with WhatsApp-style colors in chat bubbles ([94ec4a3](https://github.com/rodrigogs/whats-reader/commit/94ec4a3f3f6c5170bb13bb1a3c2f840c9e9cbc45)), closes [#00897](https://github.com/rodrigogs/whats-reader/issues/00897) [#4FC3F7](https://github.com/rodrigogs/whats-reader/issues/4FC3F7)

# [1.27.0](https://github.com/rodrigogs/whats-reader/compare/v1.26.1...v1.27.0) (2026-01-05)


### Features

* improve social media preview images with app logo ([f0c4c26](https://github.com/rodrigogs/whats-reader/commit/f0c4c268d18c7728ddcde4e8ab72b2f030464e7c))

## [1.26.1](https://github.com/rodrigogs/whats-reader/compare/v1.26.0...v1.26.1) (2026-01-05)


### Bug Fixes

* header no longer shrinks when side panels expand ([1fa3fc9](https://github.com/rodrigogs/whats-reader/commit/1fa3fc93fbc3e5c3f65d79b55a8799deb6290af7))

# [1.26.0](https://github.com/rodrigogs/whats-reader/compare/v1.25.1...v1.26.0) (2026-01-05)


### Features

* Add responsive chat header options menu for small screens ([#55](https://github.com/rodrigogs/whats-reader/issues/55)) ([4932bd2](https://github.com/rodrigogs/whats-reader/commit/4932bd21ee0bfd552308e43b41e027e8f20ec6c5)), closes [#56](https://github.com/rodrigogs/whats-reader/issues/56)

## [1.25.1](https://github.com/rodrigogs/whats-reader/compare/v1.25.0...v1.25.1) (2026-01-05)


### Bug Fixes

* logo not displaying on GitHub Pages due to absolute path ([bd47e97](https://github.com/rodrigogs/whats-reader/commit/bd47e97eab50bb27d3b8e1356ca7f09b6eac15f3))

# [1.25.0](https://github.com/rodrigogs/whats-reader/compare/v1.24.0...v1.25.0) (2026-01-05)


### Bug Fixes

* update package-lock.json to resolve picomatch dependency conflict ([98af4c9](https://github.com/rodrigogs/whats-reader/commit/98af4c9c8c8432f1f841a8f76217f7d3b85f885c))


### Features

* add multiselect filters for media gallery ([#49](https://github.com/rodrigogs/whats-reader/issues/49)) ([3cd58e3](https://github.com/rodrigogs/whats-reader/commit/3cd58e36b406f67309b737bfab0eac6afd297a25))

# [1.24.0](https://github.com/rodrigogs/whats-reader/compare/v1.23.0...v1.24.0) (2026-01-04)


### Bug Fixes

* add JSDoc comment to IconName type for better IDE support ([2693e00](https://github.com/rodrigogs/whats-reader/commit/2693e007796fb17ee074f793435d2102ca504229))
* add pull-requests permission for branch sync ([f2be78d](https://github.com/rodrigogs/whats-reader/commit/f2be78d7b185f8e79001e34ebc38849151560965))
* remove duplicate sync step (handled in build.yml) ([e0499de](https://github.com/rodrigogs/whats-reader/commit/e0499de1c146c96dc279fe6a152de4821b7428d0))
* trigger manual release for testing ([92658a6](https://github.com/rodrigogs/whats-reader/commit/92658a617d5f3ed1c29767a1b9485ec1c5fc7046))
* use GitHub API to sync dev with main after release ([a7bb91f](https://github.com/rodrigogs/whats-reader/commit/a7bb91ffc2c5543148ecb48781907789db6b674f))


### Features

* extract reusable UI components ([cad1fe9](https://github.com/rodrigogs/whats-reader/commit/cad1fe906f8362fe3726492031cb42687ee1ed76))
* use peter-evans/create-pull-request for elegant branch sync ([f302d5f](https://github.com/rodrigogs/whats-reader/commit/f302d5f32491f8f7f3aca526d4529722e42cbe6a))

# [1.23.0](https://github.com/rodrigogs/whats-reader/compare/v1.22.2...v1.23.0) (2026-01-02)


### Features

* UI componentization with reusable components ([47f0496](https://github.com/rodrigogs/whats-reader/commit/47f04961283f85198f36fed3b9b75fd06f4e6d41))

## [1.22.2](https://github.com/rodrigogs/whats-reader/compare/v1.22.1...v1.22.2) (2026-01-02)


### Bug Fixes

* add pull-requests permission for branch sync ([#42](https://github.com/rodrigogs/whats-reader/issues/42)) ([48fa840](https://github.com/rodrigogs/whats-reader/commit/48fa84033dd9cc10165d143ba01ac56f80dbc77e)), closes [#33](https://github.com/rodrigogs/whats-reader/issues/33)

## [1.22.1](https://github.com/rodrigogs/whats-reader/compare/v1.22.0...v1.22.1) (2026-01-02)


### Bug Fixes

* remove duplicate sync step from release workflow ([#41](https://github.com/rodrigogs/whats-reader/issues/41)) ([d68c258](https://github.com/rodrigogs/whats-reader/commit/d68c258f116f59cb08281ba288905f2cc84390fc)), closes [#33](https://github.com/rodrigogs/whats-reader/issues/33)

# [1.22.0](https://github.com/rodrigogs/whats-reader/compare/v1.21.23...v1.22.0) (2026-01-02)


### Features

* elegant branch sync with peter-evans/create-pull-request ([#40](https://github.com/rodrigogs/whats-reader/issues/40)) ([a910f69](https://github.com/rodrigogs/whats-reader/commit/a910f69d6ed7af9f786d48f101d4e2f200ce8c73)), closes [#33](https://github.com/rodrigogs/whats-reader/issues/33)

## [1.21.23](https://github.com/rodrigogs/whats-reader/compare/v1.21.22...v1.21.23) (2026-01-02)


### Bug Fixes

* add JSDoc comment to IconName type ([#38](https://github.com/rodrigogs/whats-reader/issues/38)) ([905164d](https://github.com/rodrigogs/whats-reader/commit/905164dfeb23547d3aa8e53cd798149d5e5c899c)), closes [#33](https://github.com/rodrigogs/whats-reader/issues/33)

## [1.21.22](https://github.com/rodrigogs/whats-reader/compare/v1.21.21...v1.21.22) (2026-01-02)

## [1.21.21](https://github.com/rodrigogs/whats-reader/compare/v1.21.20...v1.21.21) (2025-12-30)


### Bug Fixes

* **ci:** create PR for dev sync (branch is protected) ([b5a999a](https://github.com/rodrigogs/whats-reader/commit/b5a999a0b0a07dc88eb0fe83629b16b1368dea5a))

## [1.21.20](https://github.com/rodrigogs/whats-reader/compare/v1.21.19...v1.21.20) (2025-12-30)


### Bug Fixes

* **ci:** use GitHub API for branch sync (no git repo needed) ([35e1007](https://github.com/rodrigogs/whats-reader/commit/35e100721b61ba4fcda921110af203bea0b0de8d))

## [1.21.19](https://github.com/rodrigogs/whats-reader/compare/v1.21.18...v1.21.19) (2025-12-30)


### Bug Fixes

* **ci:** add actions:write permission to trigger deploy ([cdeffb8](https://github.com/rodrigogs/whats-reader/commit/cdeffb8ec2404723e890a1e396c8904e625932b3))

## [1.21.18](https://github.com/rodrigogs/whats-reader/compare/v1.21.17...v1.21.18) (2025-12-30)


### Bug Fixes

* **ci:** trigger deploy from build workflow after publish ([74c1567](https://github.com/rodrigogs/whats-reader/commit/74c1567b5f9458b0782affab397d8515476bfa92))

## [1.21.17](https://github.com/rodrigogs/whats-reader/compare/v1.21.16...v1.21.17) (2025-12-30)


### Bug Fixes

* **ci:** sync main to dev after release is published ([6969a70](https://github.com/rodrigogs/whats-reader/commit/6969a70f8ca5bf826d2ca974d0556b1186664bcd))

## [1.21.16](https://github.com/rodrigogs/whats-reader/compare/v1.21.15...v1.21.16) (2025-12-30)


### Bug Fixes

* **ci:** trigger deploy only after release is published ([f257908](https://github.com/rodrigogs/whats-reader/commit/f257908d446ad6af6651a8e676ab1adcf6eaeeb0))

## [1.21.15](https://github.com/rodrigogs/whats-reader/compare/v1.21.14...v1.21.15) (2025-12-30)


### Performance Improvements

* **ci:** fix electron cache to persist between builds ([fb5104f](https://github.com/rodrigogs/whats-reader/commit/fb5104f0c5492d334f21e4f57ef5dc0f3105865b))

## [1.21.14](https://github.com/rodrigogs/whats-reader/compare/v1.21.13...v1.21.14) (2025-12-30)


### Bug Fixes

* **ci:** cleanup draft releases on cancelled builds ([00d3fc1](https://github.com/rodrigogs/whats-reader/commit/00d3fc1b75300a6e8836a05de9ae35fa8f866b2f))

## [1.21.13](https://github.com/rodrigogs/whats-reader/compare/v1.21.12...v1.21.13) (2025-12-30)


### Bug Fixes

* **ci:** use x64 runner for linux-arm64 with AppImage only ([94d85b8](https://github.com/rodrigogs/whats-reader/commit/94d85b8af1757f5834c2d3acb7a3e3187222028b))

## [1.21.12](https://github.com/rodrigogs/whats-reader/compare/v1.21.11...v1.21.12) (2025-12-30)


### Bug Fixes

* **ci:** use runner.temp for electron cache paths ([1145384](https://github.com/rodrigogs/whats-reader/commit/1145384c26b4fdc4792329e70f12868c2d2afd57))

## [1.21.11](https://github.com/rodrigogs/whats-reader/compare/v1.21.10...v1.21.11) (2025-12-30)


### Bug Fixes

* **ci:** use native ARM64 runner for linux-arm64 builds ([68675e6](https://github.com/rodrigogs/whats-reader/commit/68675e6a4cb134717a76c6fcce529998df03d2e0))

## [1.21.10](https://github.com/rodrigogs/whats-reader/compare/v1.21.9...v1.21.10) (2025-12-30)


### Performance Improvements

* **build:** use ULFO format for DMG (faster lzfse compression) ([76f2077](https://github.com/rodrigogs/whats-reader/commit/76f20771986a5b1395b5229c8ac3c4e01986bbb4))

## [1.21.9](https://github.com/rodrigogs/whats-reader/compare/v1.21.8...v1.21.9) (2025-12-29)


### Bug Fixes

* **build:** fix race condition by letting CLI control architecture ([a142434](https://github.com/rodrigogs/whats-reader/commit/a142434281754018ceaa3405c8cbf50e667a3649))

## [1.21.8](https://github.com/rodrigogs/whats-reader/compare/v1.21.7...v1.21.8) (2025-12-29)


### Bug Fixes

* **build:** use macos-14 for both mac architectures ([494ca74](https://github.com/rodrigogs/whats-reader/commit/494ca74dd8a5e6422d9f0999a9364dde24d54f60))

## [1.21.7](https://github.com/rodrigogs/whats-reader/compare/v1.21.6...v1.21.7) (2025-12-29)


### Performance Improvements

* **build:** split macOS builds into parallel x64/arm64 jobs ([cbda8f2](https://github.com/rodrigogs/whats-reader/commit/cbda8f20db49845251fc27f95face06ff45f7af8))

## [1.21.6](https://github.com/rodrigogs/whats-reader/compare/v1.21.5...v1.21.6) (2025-12-29)


### Bug Fixes

* **ci:** create PR instead of direct push for main→dev sync ([51e1e84](https://github.com/rodrigogs/whats-reader/commit/51e1e847b3865c2a6d9b1f4a1bc7dae06fa13486))

## [1.21.5](https://github.com/rodrigogs/whats-reader/compare/v1.21.4...v1.21.5) (2025-12-29)


### Bug Fixes

* **build:** add arch suffix to Windows installer filenames ([7bb7cac](https://github.com/rodrigogs/whats-reader/commit/7bb7caccfb28a0d90e2eb9452b1e6dc804ee1ea9))

## [1.21.4](https://github.com/rodrigogs/whats-reader/compare/v1.21.3...v1.21.4) (2025-12-29)


### Bug Fixes

* **build:** split Windows builds into separate x64 and arm64 jobs ([7976c47](https://github.com/rodrigogs/whats-reader/commit/7976c47763928856518221964992429a8a881f5b))

## [1.21.3](https://github.com/rodrigogs/whats-reader/compare/v1.21.2...v1.21.3) (2025-12-29)


### Bug Fixes

* **ci:** split Windows installers and sync main to dev ([d2c4a95](https://github.com/rodrigogs/whats-reader/commit/d2c4a953e8d417f9d0144df5bdc9feea9a418519))

## [1.21.2](https://github.com/rodrigogs/whats-reader/compare/v1.21.1...v1.21.2) (2025-12-29)


### Bug Fixes

* **build:** split Windows installers by architecture ([e5e3c0e](https://github.com/rodrigogs/whats-reader/commit/e5e3c0eff297501a71c4a84a1b2fc9cdc08dcbc6))

## [1.21.1](https://github.com/rodrigogs/whats-reader/compare/v1.21.0...v1.21.1) (2025-12-29)


### Bug Fixes

* **ci:** remove duplicate release asset uploads ([c451a83](https://github.com/rodrigogs/whats-reader/commit/c451a8394caf439afd29d4dedc3dfaf2ab27b779))

# [1.21.0](https://github.com/rodrigogs/whats-reader/compare/v1.20.1...v1.21.0) (2025-12-29)


### Bug Fixes

* address code review comments - improve video handling, error checking, and file size handling ([88a6b47](https://github.com/rodrigogs/whats-reader/commit/88a6b4760dcda38046a495951e2d56450a177a0f))
* address code review comments for gallery enhancements ([2e4e7d0](https://github.com/rodrigogs/whats-reader/commit/2e4e7d0de251d69d357be560f5e87f92c5c83629))
* **chat:** add null checks for chatContainer to prevent scrollHeight errors ([d122385](https://github.com/rodrigogs/whats-reader/commit/d12238502643b94fac81162863c92311b1149559))


### Features

* **gallery:** enhance media thumbnails with video preview, audio duration, and improved document display ([8e8b1a4](https://github.com/rodrigogs/whats-reader/commit/8e8b1a49bef6afc0860a48bd05b8e0c0078d415a))

## [1.20.1](https://github.com/rodrigogs/whats-reader/compare/v1.20.0...v1.20.1) (2025-12-26)


### Bug Fixes

* **chat:** prevent scrollHeight errors with null checks ([#29](https://github.com/rodrigogs/whats-reader/issues/29)) ([afa848e](https://github.com/rodrigogs/whats-reader/commit/afa848ebc9386204473ade11d7fb7de8b414e8d1))

# [1.20.0](https://github.com/rodrigogs/whats-reader/compare/v1.19.0...v1.20.0) (2025-12-26)


### Features

* **gallery:** enhance media thumbnails with video preview, audio duration, and improved document display ([#26](https://github.com/rodrigogs/whats-reader/issues/26)) ([53b79dd](https://github.com/rodrigogs/whats-reader/commit/53b79dd1bc6d49c6220d93d53af245c9b87f7200))

# [1.19.0](https://github.com/rodrigogs/whats-reader/compare/v1.18.0...v1.19.0) (2025-12-25)


### Bug Fixes

* correct media file filtering logic for hidden files ([4955587](https://github.com/rodrigogs/whats-reader/commit/4955587ad3806a4b75f3a2434e71429739b59de8))
* extract better chat titles from iOS _chat.txt exports ([e7f76fe](https://github.com/rodrigogs/whats-reader/commit/e7f76fe65d16d0a622d1fb8e87fbc3403bd19879))
* **parser:** derive iOS _chat title from zip ([981af9d](https://github.com/rodrigogs/whats-reader/commit/981af9daa91cc46fcc361248520a3029cdc0f0a4))
* remove TypeScript error by eliminating private _data property access ([25ce061](https://github.com/rodrigogs/whats-reader/commit/25ce06115e60702cca0747ba9cf2f7b002fbe815))


### Features

* add distinct Android and iOS example chats with improved documentation ([b8f41f7](https://github.com/rodrigogs/whats-reader/commit/b8f41f7559fd4bfe08467181418f0aeec975d3c4))
* add support for iOS WhatsApp export format with enhanced error handling ([8a8e8ea](https://github.com/rodrigogs/whats-reader/commit/8a8e8ead22c91b76a25935442891310afa9472d6))

# [1.18.0](https://github.com/rodrigogs/whats-reader/compare/v1.17.0...v1.18.0) (2025-12-22)


### Features

* media gallery with go-to-date calendar ([#17](https://github.com/rodrigogs/whats-reader/issues/17)) ([fda4bd6](https://github.com/rodrigogs/whats-reader/commit/fda4bd6705400436350a3262bd76eb48a218d784)), closes [#18](https://github.com/rodrigogs/whats-reader/issues/18)

# [1.17.0](https://github.com/rodrigogs/whats-reader/compare/v1.16.2...v1.17.0) (2025-12-19)


### Features

* add AppImage build for Linux ([c2a9b49](https://github.com/rodrigogs/whats-reader/commit/c2a9b495e832add275ddcb166bbbd1806c082638))

## [1.16.2](https://github.com/rodrigogs/whats-reader/compare/v1.16.1...v1.16.2) (2025-12-14)


### Bug Fixes

* add retry logic with npm ci for reliable dependency installation ([0ddb07e](https://github.com/rodrigogs/whats-reader/commit/0ddb07e47a983bcfd20b291c33eb5fae505f5e46))

## [1.16.1](https://github.com/rodrigogs/whats-reader/compare/v1.16.0...v1.16.1) (2025-12-11)


### Bug Fixes

* apply biome lint fixes for template literals ([cc7740a](https://github.com/rodrigogs/whats-reader/commit/cc7740a35fea4c3fe7db7f23224a4611a9e3da54))

# [1.16.0](https://github.com/rodrigogs/whats-reader/compare/v1.15.9...v1.16.0) (2025-12-11)


### Features

* improve update dialog with ignore version and never ask options ([068e65e](https://github.com/rodrigogs/whats-reader/commit/068e65e56dbed0f45a9fa590dd3f9d6db29a9fb6))

## [1.15.9](https://github.com/rodrigogs/whats-reader/compare/v1.15.8...v1.15.9) (2025-12-11)


### Bug Fixes

* improve afterPack logging to show architecture ([859e187](https://github.com/rodrigogs/whats-reader/commit/859e187a32f087a516324b9f234a66bf7dc1ff76))

## [1.15.8](https://github.com/rodrigogs/whats-reader/compare/v1.15.7...v1.15.8) (2025-12-11)


### Bug Fixes

* regenerate package-lock.json after removing postinstall script ([d69043d](https://github.com/rodrigogs/whats-reader/commit/d69043d6d9e142b297b479d9f721db0407244bdb))


### Performance Improvements

* use afterPack hook to remove onnxruntime-node (saves 141MB) ([0c91df3](https://github.com/rodrigogs/whats-reader/commit/0c91df3c8f5cd553e8884ebd9214bee918444b35))

## [1.15.7](https://github.com/rodrigogs/whats-reader/compare/v1.15.6...v1.15.7) (2025-12-11)


### Performance Improvements

* optimize electron build size by removing onnxruntime-node (saves 210MB) ([3e75ddd](https://github.com/rodrigogs/whats-reader/commit/3e75ddd6d533b66143b563935f926c182823d046))

## [1.15.6](https://github.com/rodrigogs/whats-reader/compare/v1.15.5...v1.15.6) (2025-12-11)


### Bug Fixes

* include dependencies in electron build to resolve module not found errors ([b8335a2](https://github.com/rodrigogs/whats-reader/commit/b8335a2d77d42d97caa61b29bb51d19c7d1e95fc))

## [1.15.5](https://github.com/rodrigogs/whats-reader/compare/v1.15.4...v1.15.5) (2025-12-11)


### Bug Fixes

* final verification of asset consistency ([7d1e0d0](https://github.com/rodrigogs/whats-reader/commit/7d1e0d09299651603e51009845d446db41c86966))

## [1.15.4](https://github.com/rodrigogs/whats-reader/compare/v1.15.3...v1.15.4) (2025-12-11)


### Bug Fixes

* test build with CUDA skip configuration ([f24cd55](https://github.com/rodrigogs/whats-reader/commit/f24cd5543f362fb88b21a03f806cdda0c70d8020))

## [1.15.3](https://github.com/rodrigogs/whats-reader/compare/v1.15.2...v1.15.3) (2025-12-11)


### Bug Fixes

* skip CUDA binaries for onnxruntime to prevent CDN timeouts ([7e94061](https://github.com/rodrigogs/whats-reader/commit/7e94061d39474c3482614c22d9209080f5d1fca8))

## [1.15.2](https://github.com/rodrigogs/whats-reader/compare/v1.15.1...v1.15.2) (2025-12-11)


### Bug Fixes

* retry build to verify asset consistency ([fd916da](https://github.com/rodrigogs/whats-reader/commit/fd916dae89a467c61db199150912e86d27a24629))

## [1.15.1](https://github.com/rodrigogs/whats-reader/compare/v1.15.0...v1.15.1) (2025-12-11)


### Bug Fixes

* verify asset generation consistency ([2468e16](https://github.com/rodrigogs/whats-reader/commit/2468e16a8d2311a534a740e3d6dc678b2e7d88a9))

# [1.15.0](https://github.com/rodrigogs/whats-reader/compare/v1.14.1...v1.15.0) (2025-12-11)


### Features

* verify consistent asset generation across releases ([1d4b549](https://github.com/rodrigogs/whats-reader/commit/1d4b549516da6bf7cbb280d1d4b56da61b7838dc))

## [1.14.1](https://github.com/rodrigogs/whats-reader/compare/v1.14.0...v1.14.1) (2025-12-11)


### Bug Fixes

* prevent premature release publishing by keeping draft status ([9c94b7f](https://github.com/rodrigogs/whats-reader/commit/9c94b7fa51c2a32c49647d34266f9b0a0dd0d82e))

# [1.14.0](https://github.com/rodrigogs/whats-reader/compare/v1.13.4...v1.14.0) (2025-12-11)


### Features

* validate and test complete draft-first release workflow ([c2a4397](https://github.com/rodrigogs/whats-reader/commit/c2a4397d469a7edda0c6e9375a0aa60f6fb103f5))

## [1.13.4](https://github.com/rodrigogs/whats-reader/compare/v1.13.3...v1.13.4) (2025-12-11)


### Bug Fixes

* remove AppImage target due to unreliable CDN downloads ([6c41ee9](https://github.com/rodrigogs/whats-reader/commit/6c41ee9fcb67aaad5c7a4f3eb46c6a408ce3098e))

## [1.13.3](https://github.com/rodrigogs/whats-reader/compare/v1.13.2...v1.13.3) (2025-12-11)


### Bug Fixes

* add retry logic with npm ci for reliable dependency installation ([c394cb1](https://github.com/rodrigogs/whats-reader/commit/c394cb16452a4a3e0ec2eb2ed9abd46d6f15db47))

## [1.13.2](https://github.com/rodrigogs/whats-reader/compare/v1.13.1...v1.13.2) (2025-12-11)

## [1.13.1](https://github.com/rodrigogs/whats-reader/compare/v1.13.0...v1.13.1) (2025-12-11)


### Bug Fixes

* add retry logic for npm install to handle CDN failures ([970bd9e](https://github.com/rodrigogs/whats-reader/commit/970bd9e72fde45688a658cce2e432bedf836bdbd))
* add retry logic to release workflow npm install ([214862b](https://github.com/rodrigogs/whats-reader/commit/214862bc666410a97255359517dffe3cdcbe8aac))

# [1.13.0](https://github.com/rodrigogs/whats-reader/compare/v1.12.3...v1.13.0) (2025-12-11)


### Bug Fixes

* add GH_TOKEN env var to electron-builder steps ([11e73a1](https://github.com/rodrigogs/whats-reader/commit/11e73a16f2b5411f04b86ab1290d203fe7c531c2))


### Features

* create releases as drafts, publish only after all assets are uploaded ([6eaa902](https://github.com/rodrigogs/whats-reader/commit/6eaa902e9f6c106affacc539b53214a5ccbcf1d4))

## [1.12.3](https://github.com/rodrigogs/whats-reader/compare/v1.12.2...v1.12.3) (2025-12-11)


### Bug Fixes

* ensure auto-updater metadata files are uploaded to releases ([ababfa3](https://github.com/rodrigogs/whats-reader/commit/ababfa34742d6f2aa0b881dc33c9d655b0a950aa))

## [1.12.2](https://github.com/rodrigogs/whats-reader/compare/v1.12.1...v1.12.2) (2025-12-11)


### Bug Fixes

* add GH_TOKEN env var to electron-builder steps ([2eea66a](https://github.com/rodrigogs/whats-reader/commit/2eea66ad218a34ada2710e1d71ce2fc03ab607e1))

## [1.12.1](https://github.com/rodrigogs/whats-reader/compare/v1.12.0...v1.12.1) (2025-12-11)


### Bug Fixes

* remove invalid compressionLevel from NSIS config ([8688228](https://github.com/rodrigogs/whats-reader/commit/868822891d5ed45d125d991f4cfd3ca36a47093e))

# [1.12.0](https://github.com/rodrigogs/whats-reader/compare/v1.11.1...v1.12.0) (2025-12-11)


### Bug Fixes

* resolve TypeScript and lint errors in auto-updater implementation ([181797b](https://github.com/rodrigogs/whats-reader/commit/181797b1f9f362527f23d0139f8b532dda4a8f9b))
* use npm install instead of npm ci to avoid lock file sync issues ([1da401c](https://github.com/rodrigogs/whats-reader/commit/1da401c932dc9dbb977f231733c6097d2e7337b9))


### Features

* implement true auto-update with electron-updater, optimize build pipeline, reduce Windows binary size ([53b9197](https://github.com/rodrigogs/whats-reader/commit/53b91971a99265a96dcc2d93f4bedff3a9dd0f61))

## [1.11.1](https://github.com/rodrigogs/whats-reader/compare/v1.11.0...v1.11.1) (2025-12-11)


### Bug Fixes

* add actions write permission to release workflow for build triggering ([90c3348](https://github.com/rodrigogs/whats-reader/commit/90c3348755313d2a3993ea11a1d4b499b547e61e))

# [1.11.0](https://github.com/rodrigogs/whats-reader/compare/v1.10.0...v1.11.0) (2025-12-11)


### Bug Fixes

* trigger build workflow after semantic release ([bd96c83](https://github.com/rodrigogs/whats-reader/commit/bd96c83ea713aee284cba30e0c96c3ef422e7742))


### Features

* add auto-update checker with version badge and toast notification ([977afbf](https://github.com/rodrigogs/whats-reader/commit/977afbf091c62dfe0649b8d0a4e776d184b8fd10))

# [1.10.0](https://github.com/rodrigogs/whats-reader/compare/v1.9.0...v1.10.0) (2025-12-10)


### Features

* complete Spanish, Portuguese, German, French README translations ([12b6523](https://github.com/rodrigogs/whats-reader/commit/12b6523a7d2652fbcdae8ae40f7c53c7d9d6f19f))
* synchronize all README translations with complete content matching README.md structure ([75ce077](https://github.com/rodrigogs/whats-reader/commit/75ce077168db51f3d36b60c93bc75005d6b442ea))

# [1.9.0](https://github.com/rodrigogs/whats-reader/compare/v1.8.0...v1.9.0) (2025-12-10)


### Features

* complete all README translations with full content matching README.md structure ([0086b90](https://github.com/rodrigogs/whats-reader/commit/0086b90d62748c2712e9d08e9b7b4859671a99f9))

# [1.8.0](https://github.com/rodrigogs/whats-reader/compare/v1.7.1...v1.8.0) (2025-12-10)


### Features

* add missing README translations for Italian, Dutch, Japanese, Chinese, and Russian ([5f0f2bf](https://github.com/rodrigogs/whats-reader/commit/5f0f2bfbea62fb84b179252d6ed87e17af83b8de))

## [1.7.1](https://github.com/rodrigogs/whats-reader/compare/v1.7.0...v1.7.1) (2025-12-10)


### Bug Fixes

* apply biome formatting to bookmarks panel ([1791533](https://github.com/rodrigogs/whats-reader/commit/17915331f6afe0bb9bb8886f239ea48e1392ec59))
* resolve TypeScript type error with LocalizedString concatenation ([6e9d6a4](https://github.com/rodrigogs/whats-reader/commit/6e9d6a48a04c01f6b73b737a500257110710a176))

# [1.7.0](https://github.com/rodrigogs/whats-reader/compare/v1.6.0...v1.7.0) (2025-12-10)


### Features

* add missing translations for bookmarks and loading states ([#10](https://github.com/rodrigogs/whats-reader/issues/10)) ([4c5db28](https://github.com/rodrigogs/whats-reader/commit/4c5db2872cf5c03f1d919f254ebba4d58c6c4010))

# [1.6.0](https://github.com/rodrigogs/whats-reader/compare/v1.5.4...v1.6.0) (2025-12-10)


### Features

* add multi-language support and enhanced parser ([591084a](https://github.com/rodrigogs/whats-reader/commit/591084aa53eca16a745019e03b54de14faaf469c))

# [1.5.0](https://github.com/rodrigogs/whats-reader/compare/v1.4.1...v1.5.0) (2025-12-09)


### Bug Fixes

* **ui:** make empty state page scrollable on small screens ([802123e](https://github.com/rodrigogs/whats-reader/commit/802123e460e983643cd36a72aacb1cd787d04b94))


### Features

* redesign export instructions as collapsible accordion ([d637cd8](https://github.com/rodrigogs/whats-reader/commit/d637cd82b21058f64e5c12987083e41bf43e56c9))

## [1.4.1](https://github.com/rodrigogs/whats-reader/compare/v1.4.0...v1.4.1) (2025-12-09)


### Bug Fixes

* enable automatic changelog updates ([82352c3](https://github.com/rodrigogs/whats-reader/commit/82352c3d2eb4130c44fca10e995c7384dd0ea11c))

# Changelog

All notable changes to this project will be documented in this file.

# [1.4.0](https://github.com/rodrigogs/whats-reader/compare/v1.3.3...v1.4.0) (2025-12-09)

### ✨ Features

* redesign export instructions as collapsible accordion ([#8](https://github.com/rodrigogs/whats-reader/issues/8)) ([c6e1bd8](https://github.com/rodrigogs/whats-reader/commit/c6e1bd8009678d5bb8c471333bab193febdd4de6))

## [1.3.3](https://github.com/rodrigogs/whats-reader/compare/v1.3.2...v1.3.3) (2025-12-09)

### 🐛 Bug Fixes

* trigger build workflow after release ([4d4ef5a](https://github.com/rodrigogs/whats-reader/commit/4d4ef5aeafcebb86347551778344d83c563dbd17))

## [1.3.2](https://github.com/rodrigogs/whats-reader/compare/v1.3.1...v1.3.2) (2025-12-09)

### 🐛 Bug Fixes

* restore changelog and git plugins to semantic-release ([3e1fb9a](https://github.com/rodrigogs/whats-reader/commit/3e1fb9afd95d99e48f808cf8fa2392337cf4fd13))

## [1.3.1](https://github.com/rodrigogs/whats-reader/compare/v1.3.0...v1.3.1) (2025-12-09)

### 🐛 Bug Fixes

* **Search freeze resolved**: Removed MiniSearch to eliminate ~5-10MB postMessage serialization that was freezing the browser
* **Scroll to search results**: Added retry mechanism for scrolling to results (fixes system notification messages)
* **TypeScript errors**: Fixed duplicate type identifiers and postMessage signatures in workers

### ✨ Improvements

* **Simplified search**: Uses fast \`string.includes()\` with bitmap results for O(1) match lookup
* **Better UI**: Replaced floating hamburger button with discrete header toggle icon
* **Cleaner code**: Unified duplicate types, removed outdated MiniSearch references

### ♻️ Refactoring

* Unified \`SerializedMessage\` and \`FlatItem\` types in index-worker
* Renamed \`WorkerInput\` to unique names per worker to avoid conflicts
* Removed ~65 lines of hamburger CSS animations

# [1.3.0](https://github.com/rodrigogs/whats-reader/compare/v1.2.4...v1.3.0) (2025-12-08)

### 🐛 Bug Fixes

* add changelog and git plugins to semantic-release ([a78c934](https://github.com/rodrigogs/whats-reader/commit/a78c93462f1f120ade3f085582b47c02df255fee))
* remove git plugin from semantic-release (conflicts with branch protection) ([54e21dc](https://github.com/rodrigogs/whats-reader/commit/54e21dc45cbf51de7f4b8a3add3dcaafc63938c1))

### ✨ Features

* use browser preferred language as default locale ([ea19ea8](https://github.com/rodrigogs/whats-reader/commit/ea19ea8de75ac7ec3eb65600e9798889ad89916e))

## [1.2.4](https://github.com/rodrigogs/whats-reader/compare/v1.2.3...v1.2.4) (2025-12-08)

### 🐛 Bug Fixes

* update package.json version in build workflow before building ([49a6978](https://github.com/rodrigogs/whats-reader/commit/49a6978ad62a959e51f98ddde5058e255bdab0af))

## [1.2.3](https://github.com/rodrigogs/whats-reader/compare/v1.2.2...v1.2.3) (2025-12-08)

### 🐛 Bug Fixes

* add npm plugin to semantic-release to update package.json version ([a30492f](https://github.com/rodrigogs/whats-reader/commit/a30492faad3b1f49673056e8cf1d31c74998a52c))

## [1.2.2](https://github.com/rodrigogs/whats-reader/compare/v1.2.1...v1.2.2) (2025-12-08)

### 🐛 Bug Fixes

* update CI badge to use dev branch ([db945ee](https://github.com/rodrigogs/whats-reader/commit/db945ee2c7c4e7dd7dbc79b77ffe9d1f3625c4fa))

## [1.2.1](https://github.com/rodrigogs/whats-reader/compare/v1.2.0...v1.2.1) (2025-12-08)

### 🐛 Bug Fixes

* improve empty state settings buttons positioning ([372a740](https://github.com/rodrigogs/whats-reader/commit/372a7408ba77f242feb7d5b0a32a2faa28365020))

# [1.2.0](https://github.com/rodrigogs/whats-reader/compare/v1.1.6...v1.2.0) (2025-12-08)

### ✨ Features

* add FlatItem types for precomputed message indexing ([b002fb5](https://github.com/rodrigogs/whats-reader/commit/b002fb56f32d2c27ffeba9baeb25e29bab5f2053))
* merge bookmarks on import instead of replacing ([26fb943](https://github.com/rodrigogs/whats-reader/commit/26fb943da1bc15c1caa08a5434c7249b277b9b3b))

### ⚡ Performance Improvements

* precompute message index via web worker for faster navigation ([4bb036e](https://github.com/rodrigogs/whats-reader/commit/4bb036e3bbd3fbcabe821998ed8bbd3d82036db5))

## [1.1.6](https://github.com/rodrigogs/whats-reader/compare/v1.1.5...v1.1.6) (2025-12-08)

### 🐛 Bug Fixes

* regenerate package-lock.json for Node.js 24 compatibility ([cce6493](https://github.com/rodrigogs/whats-reader/commit/cce6493d25e8ff7505224aec87c4a15afdbb276e))

## [1.1.5](https://github.com/rodrigogs/whats-reader/compare/v1.1.4...v1.1.5) (2025-12-08)

### ⚡ Performance Improvements

* optimize binary size by excluding unnecessary node_modules ([ffab963](https://github.com/rodrigogs/whats-reader/commit/ffab96378c02117346153e62a2f2f606e6521214))

## [1.1.4](https://github.com/rodrigogs/whats-reader/compare/v1.1.3...v1.1.4) (2025-12-08)

### 🐛 Bug Fixes

* make language and dark mode buttons fixed position at top-right ([d8d6e5e](https://github.com/rodrigogs/whats-reader/commit/d8d6e5e1525f1acbc0df9499e86892f0c86f1ec0))

## [1.1.3](https://github.com/rodrigogs/whats-reader/compare/v1.1.2...v1.1.3) (2025-12-08)

### 🐛 Bug Fixes

* reload page on locale change for proper UI update ([41c032d](https://github.com/rodrigogs/whats-reader/commit/41c032dcc81a6928697372b24434079268b1f01e))

## [1.1.2](https://github.com/rodrigogs/whats-reader/compare/v1.1.1...v1.1.2) (2025-12-08)

### 🐛 Bug Fixes

* language switching and fixed position for settings buttons ([33ef476](https://github.com/rodrigogs/whats-reader/commit/33ef4764febe2ac2e6c0aaf6d247cfc25f7eb87a))

## [1.1.1](https://github.com/rodrigogs/whats-reader/compare/v1.1.0...v1.1.1) (2025-12-08)

### 🐛 Bug Fixes

* configure base path for GitHub Pages deployment ([c77c8f3](https://github.com/rodrigogs/whats-reader/commit/c77c8f31fbdce40bfcaf5bacccbf9c8d168d47fb))

# [1.1.0](https://github.com/rodrigogs/whats-reader/compare/v1.0.2...v1.1.0) (2025-12-08)

### 🐛 Bug Fixes

* remove git plugin from semantic-release to avoid branch protection issues ([defa594](https://github.com/rodrigogs/whats-reader/commit/defa59476790808df315d5dcbcdb173ff239f679))

### ✨ Features

* add support for all OS architectures in releases ([5e76828](https://github.com/rodrigogs/whats-reader/commit/5e76828dcc9ce28d643497524339892dacd02029))

## [1.0.2](https://github.com/rodrigogs/whats-reader/compare/v1.0.1...v1.0.2) (2025-12-08)

### 🐛 Bug Fixes

* update electron:dev script to use cross-env for setting NODE_ENV ([65a1683](https://github.com/rodrigogs/whats-reader/commit/65a1683e4b5620da8e3b8ac0f53fedc88fb26260))

## [1.0.1](https://github.com/rodrigogs/whats-reader/compare/v1.0.0...v1.0.1) (2025-12-08)

### 🐛 Bug Fixes

* add author email for deb builds and disable electron-builder auto-publish ([25fd8cb](https://github.com/rodrigogs/whats-reader/commit/25fd8cb64b0dd2c24cbc7f110b904e58ee8d4b6f))

# 1.0.0 (2025-12-08)

### 🐛 Bug Fixes

* address code review feedback - prevent infinite loop and SSR check ([35cefe4](https://github.com/rodrigogs/whats-reader/commit/35cefe40a8986e406ac5f5607b1dd36e178a3996))
* address PR review comments - improve code quality and fix bugs ([0afaa83](https://github.com/rodrigogs/whats-reader/commit/0afaa8324700e2222a5d0699bbe17de3dc0e7c49))
* bookmark navigation and collapsible sidebar improvements ([40a3f02](https://github.com/rodrigogs/whats-reader/commit/40a3f02e015daf90f66811e219101d94fc7d9812))
* improve favicon/PWA setup per best practices ([ecb4a0b](https://github.com/rodrigogs/whats-reader/commit/ecb4a0b9ec3239b745eb8047e28d75e8b784dd71))
* macOS dock icon with proper rounded corners and padding ([2c8df2a](https://github.com/rodrigogs/whats-reader/commit/2c8df2a6f6dc876d5aa534644b2fe7806f3bab90))
* only show electron titlebar drag region on macOS ([4e5bf73](https://github.com/rodrigogs/whats-reader/commit/4e5bf73046553a3b4624891c3ab8639a117563b8))
* remove duplicate electron-drag bars causing chunky headers ([95d27d9](https://github.com/rodrigogs/whats-reader/commit/95d27d91f3dedf19d9cd5d232b560733721342e9))
* use custom protocol for Electron production builds ([5cf7865](https://github.com/rodrigogs/whats-reader/commit/5cf786513fc57ad43c2b16905bd6553c35abdaad))

### ✨ Features

* add app icons, favicon, and PWA manifest ([19384c0](https://github.com/rodrigogs/whats-reader/commit/19384c0d10739c3641f0024d02f76711d7096707))
* add audio transcription with Web Worker, auto-load media, and floating menus ([754d31e](https://github.com/rodrigogs/whats-reader/commit/754d31eb7fd0ee81a9dbccba4eb3b7f57cb3a79f))
* add i18n with Paraglide JS and UI improvements ([bbe45bd](https://github.com/rodrigogs/whats-reader/commit/bbe45bdf1757fd215ffc66026609f0da98b314bf))
* add message bookmarks with comments ([bf61c67](https://github.com/rodrigogs/whats-reader/commit/bf61c6787a179b3e91c89d310eb8cac0ac91e611))
* **i18n:** complete translation coverage for all UI strings ([f5fc8a3](https://github.com/rodrigogs/whats-reader/commit/f5fc8a320d2bf840ef3f9f32b544f5df53565c30))
* improve search UX and progress indicators ([0eab2f7](https://github.com/rodrigogs/whats-reader/commit/0eab2f727d5a992a0dd6c728b2a00c41aa7bf5db))
