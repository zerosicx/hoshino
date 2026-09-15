# Hoshino — Roadmap

Where the app is, and what ships next. Shipped work is recorded in
`CHANGELOG.md`; this file only tracks what remains and in what order.

## Where we are

The data pipeline and the whole dictionary read path are done. `assets/hoshino.db`
holds 217k entries, 13k kanji and 232k example sentences, and the dictionary
searches offline on iOS, Android and web from a single service layer. Search
handles conjugated verbs, kana and romaji; word detail shows conjugation tables
and furigana-annotated examples.

| Stage | Status |
|---|---|
| 1 — App foundation | Done |
| 2 — Dictionary tab | Done, bar the deferred items below |
| 3 — Lists tab | Done, bar the deferred items below |
| 4 — Study system | Not started — **next** |
| 5 — Auth and sync | Not started |
| 6 — Polish and ship | Settings done; build and store work outstanding |

Study is hidden from the tab bar until Stage 4 begins. Its routes still exist and
resolve if navigated to directly — only the tab entry is removed.

Work flows top-down through the dependency chain:

```
database.ts → root layout → tab bar                        ✅
  → dictionary service → search screen → word detail       ✅
    → conjugation engine                                   ✅
      → lists service → lists tab                          ✅
        → SRS service → study session
          → Supabase + auth + sync
            → EAS build + submission
```

## How quality is checked

`npm test` runs Vitest and then Jest. Two suites measure behaviour rather than
assert on mocks, and both open the real `assets/hoshino.db`:

- **Search ranking** — `tests/benchmark.ts`, 45 queries whose expected answers
  came from jisho.org, currently 45/45. `services/searchRobustness.test.ts`
  holds a second set never used for tuning, to catch overfitting.
- **Furigana coverage** — the share of kanji in example sentences that get a
  reading, currently 98.8%.

Neither can run against a small fixture: BM25 scores depend on corpus-wide
statistics, so a cut-down database ranks differently. Both suites skip rather
than fail when the database is absent.

Components render under Jest, split from Vitest by file extension: Vitest owns
`*.test.ts`, Jest owns `*.test.tsx`. Run the fast half alone with
`npm run test:components`.

**A render is not a device.** The Jest half catches wiring, conditional
rendering, handlers and theme-class logic, but it draws nothing — so a layout or
colour fault still passes. That is how light mode shipped rendering white text
on Android. Check a real device after any theme or typography change.

---

## Now

### Beta bug fixes — done. All four milestones verified on the S25

Every bug from the first Android beta is fixed and confirmed on device
(`BUG_TRIAGE.md`, 17 reports, closed 15/09/26 on preview build version code
7). Milestone 1 restructured navigation; 1′ fixed what testing it exposed; 2
was the parallel sweep of the remaining reports; 2′ fixed the three things
testing *that* exposed — back from a new list, one reading per kanji in
compounds, and deleting a list. The one apparent regression along the way,
the popped page sliding away white, was an Expo Go artefact (B14) and does not
exist in a real build.

**Parked, not forgotten:** the push into a word or kanji page is not perfectly
smooth on the S25 — the perf monitor shows a dip and "2+ stutters" on
navigation, in a dev build on an adaptive-refresh screen. The likely cause is
the page body (hundreds of furigana and conjugation views) mounting mid-slide;
the candidate fix is to hold the body and the search-history write until the
navigator's `transitionEnd`. Judge it again on a release build before spending
on it.

**Next: Stage 4, the study system.** It is the reason the app exists — a
dictionary with lists but no review loop is a bookmark folder. Two Stage 2
leftovers are prerequisites and go first: extracting `WordDetail` from
`app/word/[id].tsx` (the flashcard back reuses it) and deciding on the
conjugation table's collapse (it will be on the back of every card).

### The database rebuild — done

All three landed in one rebuild. The database is 101MB, up from 98MB.

- [x] **Keep JMdict's `nfNN` frequency tags.** Stored as `frequency_rank`.
      Weighted far lower than planned: `nfNN` turned out to be *newspaper*
      frequency, and everyday words carry `ichi1` with no band at all — 本 and
      行く have none, while 書物 and 行う score nf14 and nf01. Scoring an absent
      band as "least frequent" cost two benchmark cases. Absent now scores as
      average, and the whole signal is worth 12 points against `is_common`'s 50.
- [x] **Mid-word kanji search.** Not the planned trigram table: FTS5's trigram
      tokenizer ignores queries under three characters, so it could not have
      answered 曜 or 曜日 — the very queries it was for. Each kanji instead
      stores its 50 most frequent words (`kanji.entry_ids`, ~3MB against 19MB
      for indexing all 502k pairs). 曜 now returns 曜日 first and the weekdays
      behind it.
- [x] **Fix or drop `conjugation_class`.** Dropped. `utils/wordClass.ts` derives
      the class from sense tags at runtime and nothing read the column.

Known limitation: every word starting with the query outranks every word merely
containing it, so a kanji with many compounds of its own buries its mid-word
matches — 64 words begin with 階, pushing 二階 to position 65. Reachable, but
not on the first page.

### Independent of the rebuild

- [x] **Native cold-start copy.** Was re-copying 98MB on every launch. Now keyed
      on the asset's MD5, with the marker written only after the schema check
      passes so a bad copy is not trusted.

---

## Stage 2 — remaining dictionary work

Deferred deliberately; the screens work without them.

- [ ] `components/FeaturedWord.tsx` — word of the day, a random common entry
      seeded by date
- [ ] Extract `SearchBar`, `RecentChip` and `WordDetail` from the screens. The
      search input and recent-search row are currently inline in
      `dictionary/index.tsx`; `WordDetail` needs extracting before the flashcard
      back can reuse it in Stage 4.
- [ ] **Decide whether the conjugation table needs collapsing.** Every group is
      expanded — seven of them for a verb — which is a lot of vertical scroll on
      a phone. Left that way on purpose so nothing has to be tapped to be
      understood; revisit once it has been used on a device.
- [ ] **Check how romaji mode reads on a phone.** Romaji is wider than the kana
      it replaces and sits above each kanji run in the same column layout, so
      example sentences space out more than in furigana mode. Correct, but it
      may want a smaller size or a different placement once seen on a device.
- [ ] **Expose the "none" reading mode, or drop it.** `ReadingMode` has three
      values and the components honour all three, but Settings only offers
      Furigana and Romaji, so `none` is unreachable.

---

## Stage 3 — Lists tab

- [x] `services/schema.ts` — user schema and built-in list seeds, importable by
      tests without expo-sqlite
- [x] `services/listQuery.ts` — the ordering rules as SQL, tested against real
      SQLite
- [x] `services/lists.ts` — create, star, add, read; JLPT contents resolved from
      `jlpt_level` rather than stored
- [x] `hooks/useLists.ts` — catalogue hook, add-to-list with toast reporting
- [x] `app/(tabs)/lists/index.tsx` — starred, then Searched Terms, then recent
- [x] `app/(tabs)/lists/jlpt.tsx` — the ten preloaded lists, star to pin
- [x] `app/(tabs)/lists/[id].tsx` — words, or kanji rows for JLPT kanji lists;
      delete for custom lists
- [x] `components/BottomDrawer.tsx`, `CreateListDialog.tsx`,
      `AddToListDrawer.tsx`, `ListRow.tsx`, `SwipeAction.tsx`, `Toast.tsx`
- [x] Plus button on word detail, swipe-to-add on search results, Lists tab
      re-enabled
- [x] Removing a word: tap a ticked list in the picker, or swipe a list entry
      left

### Deferred from Stage 3

- [ ] **No way to rename a list.** A typo in a list's name cannot be fixed.
      Delete landed in Milestone 2′ (trash icon on the list's page, native
      confirm); rename would sit beside it.
- [ ] **No undo on removing a word.** The toast reports the removal but cannot
      reverse it; the word has to be searched for and added again.
- [ ] **Kanji cannot go into a custom list.** `list_items.entry_id` is an
      integer pointing at `entries`, and kanji are keyed by character in a
      separate table. The JLPT kanji lists sidestep this by being query-backed.
      Supporting it properly means an `item_type` + `item_key` pair on
      `list_items`, which is worth doing only once study needs it.
- [ ] **Swipe-to-add gives no undo.** It is one gesture away from putting a word
      somewhere you did not mean, and nothing reverses it. The toast is the
      natural place to hang an Undo action.

**Checkpoint:** all 10 JLPT lists browsable, Searched Terms accumulating from
lookups, custom lists creatable with entries added from word detail. Met.

---

## Stage 4 — Study system

- [ ] `services/srs.ts` — wrap `ts-fsrs`: initialise a card, schedule after a
      rating, fetch due cards overdue-first, compute interval labels
- [ ] `services/stats.ts` — write daily stats, compute day streak, read today's
      accuracy and reviewed count
- [ ] `stores/studyStore.ts` — card queue, index, pending ratings, totals
- [ ] `hooks/useStudySession.ts` — load, advance, rate, exit
- [ ] `hooks/useStudyStats.ts` — streak, accuracy, reviewed today
- [ ] `components/FlashCard.tsx` — reanimated flip; front kanji + furigana or
      English per settings, back the full `WordDetail`; tap and swipe
- [ ] `components/SRSRatingBar.tsx` — Again/Hard/Good/Easy with next-interval
      labels, semantic colours per `DESIGN_SYSTEM.md` §2.6
- [ ] `components/StatsBar.tsx` — streak, accuracy, reviewed today
- [ ] `components/DueTodayCard.tsx` — total due across active lists, starts a
      combined session
- [ ] `app/(tabs)/study/index.tsx` — stats banner, due bar, active lists,
      Browse All
- [ ] `app/(tabs)/study/session.tsx` — queue loop, flip, rating bar, progress,
      exit-and-save
- [ ] Re-enable the Study tab

**Checkpoint:** a full FSRS session runs end to end; intervals schedule, due
counts and streak update afterwards.

---

## Stage 5 — Auth and sync

- [ ] **Supabase project** — create it; `.env.local` from `.env.example`
- [ ] **Schema** — mirror the five user tables in PostgreSQL (`srs_cards`,
      `lists`, `list_items`, `search_history`, `study_stats`), each with
      `user_id uuid` referencing `auth.users`
- [ ] **Row-level security** — enable on all five; `auth.uid() = user_id` for
      every operation
- [ ] `app/auth/sign-in.tsx`, `sign-up.tsx`, `reset-password.tsx`
- [ ] **Guest mode** — fully usable unsigned, local only; a subtle prompt on the
      Study landing after the first session
- [ ] `services/sync.ts` — pull on sign-in (seed local, last-write-wins by
      `last_review`), push after each session, queue offline writes and flush on
      reconnect

**Checkpoint:** study on one device, sign in on a second, progress intact. Guest
mode works fully offline.

---

## Stage 6 — Polish and ship

Settings (`app/(tabs)/settings/index.tsx`) and `stores/settingsStore.ts` are
already built with theme and reading-mode preferences.

- [ ] Extend settings — card direction, daily new-card limit per list, reset SRS
      progress for a list
- [ ] **Tab bar on detail pages.** Word and kanji detail live in the root stack
      so that back always returns to the previous screen, which hides the tab
      bar while reading a word. Accepted for the beta; the tab bar should be
      visible on every screen so the app can be navigated with the least
      friction. See `BUG_TRIAGE.md`, Decision 1.
- [ ] **COOP/COEP on production web.** `Cross-Origin-Opener-Policy: same-origin`
      and `Cross-Origin-Embedder-Policy: require-corp` are set by
      `metro.config.js` in dev only. Without them on the host, the user database
      loses `SharedArrayBuffer` and web breaks in production.
- [x] **App icons** — 1024×1024 (星 on accent), Android adaptive
- [x] **Splash screen** — logo mark on `--bg-primary`
- [x] **`eas.json`** — development, preview and production profiles for both
      platforms
- [x] **EAS project and updates** — `@zerosicx/hoshino`, updates served from
      `u.expo.dev`. `preview` builds and the `preview` channel carry the beta.
- [x] **Android beta** — APK by internal distribution, no Play Console yet.
      Seven preview builds so far; the embedded dictionary opens on the S25.
- [ ] **Prove an over-the-air update lands.** Nothing has been published to the
      `preview` channel yet, so the update path is configured but unexercised.
      Worth watching the first one for download size: the dictionary is an
      update asset, and only its hash keeps it from being re-fetched.
- [ ] **iOS** — TestFlight via EAS, App Store Connect record
- [ ] **Web** — `npx expo export --platform web`, deploy with the headers above

**Checkpoint:** installable from TestFlight and Play internal track; the core
loop (search → add to list → study → review) works on all three platforms.

### Running locally

Two loops, one per platform.

- **S25 Ultra — a development build, not Expo Go.** Expo Go's own build of
  react-native-screens shows Android transition faults that a project build
  does not have (B14), so it cannot be trusted to judge how the app feels.
  Build the dev client once with `eas build --profile development --platform
  android`, install the APK from the build page (it replaces the beta — same
  package name, same signing key), then:

  ```bash
  npx expo start          # open the hoshino: jisho dev launcher on the phone
  ```

  Rebuild it only when native code changes — a new library, an SDK bump, an
  icon or splash change.

- **iOS simulator — Expo Go pinned to SDK 54.** Expo CLI installs the matching
  Expo Go itself; the store version carries only the newest SDK.

  ```bash
  npx expo start --go     # press i
  ```

- **Local native builds** (`npx expo run:ios`) need the simulator runtime that
  matches the installed Xcode; `xcodebuild -downloadPlatform iOS` fetches it.
  There is no Android toolchain on this machine, so Android native builds go
  through EAS.

### Releasing a beta update

JavaScript and assets ship over the air; anything native needs a build.

```bash
eas update --branch preview --message "added: study tab"   # JS only, ~1 min
eas build --profile preview --platform android             # native changes
```

A build is only needed for a new native dependency, an edit to `plugins`,
`android` or `ios` in `app.json`, an icon or display-name change, an SDK bump,
or a dictionary rebuild. The `fingerprint` runtime version enforces this without
being asked: native changes produce a different fingerprint, so an incompatible
update is never offered to an older build.

`eas-cli` must be 23.x or newer. 7.6.0 was installed globally and predates
fingerprint runtime versions by about two years; `eas.json` now sets that floor.

---

## Known issues

- **`npm run lint` has never worked.** There is no ESLint configuration file in
  the repo, so the command exits with "couldn't find a configuration file".
  `eslint-config-expo` is installed but nothing references it.
- **Dev cache key is weak.** Web dev builds have no asset hash and Metro sends
  no ETag or Last-Modified, so the OPFS cache keys on byte length. A rebuild
  landing on exactly the same size would serve a stale dictionary. Production
  builds key on MD5 and are unaffected. Clear `/hoshino-dictionary` in DevTools
  > Application > Storage if suspected.
- **Second browser tab loses OPFS.** The pool needs exclusive file handles, so a
  second tab falls back to an in-memory copy: correct, but it holds 98MB in the
  heap and re-downloads each load.
- **`Cannot pipe to a closed or destroyed stream`** on first dev run — a bug in
  `expo-server@1.0.6` (pulled in by `expo-router`), not our code, and harmless.
  The browser cancels a bundle request, Node destroys the socket, and `respond`
  in `vendor/http.ts` pipes the finished bundle to it anyway with no
  `res.destroyed` guard. The same file already registers an abort listener on
  `close`, so the disconnect is detected and then ignored. It clusters on the
  first load because our bundles take 2–3 seconds, which widens the window for
  the browser to give up first. The failed response is one nothing was waiting
  for, so it is noise rather than a failure.

---

## Data sources (reference)

Raw files live in `scripts/sources/` (gitignored). To regenerate
`assets/hoshino.db`:

```bash
./scripts/download-sources.sh   # ~650 MB download
npx tsx scripts/fetch-jlpt.ts   # JLPT vocab mapping (~77 KB)
npm run build:db                # generates assets/hoshino.db (~98 MB)
```

The build must finalise in `journal_mode = DELETE`. WAL is recorded in the file
header and cannot be opened by any browser VFS.

| Source | File | Licence |
|---|---|---|
| JMdict (vocabulary) | `JMdict_e.xml` | CC BY-SA 4.0 |
| KANJIDIC2 (kanji) | `kanjidic2.xml` | CC BY-SA 4.0 |
| Tatoeba (sentences) | `jpn_sentences.tsv`, `eng_sentences.tsv`, `links.csv`, `jpn_indices.csv` | CC BY 2.0 |
| Kanji JLPT overlay | `kanji-jlpt.json` | MIT |
| JLPT vocab mapping | `jlpt-vocab.json` (generated by `fetch-jlpt.ts`) | CC BY |
