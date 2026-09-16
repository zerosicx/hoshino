# Hoshino — Roadmap

Where the app is, and what ships next. Shipped work is recorded in
`CHANGELOG.md`; this file only tracks what remains and in what order.

## Where we are

The data pipeline and the whole dictionary read path are done. `assets/hoshino.db`
holds 217k entries, 13k kanji and 62k example sentences (the five best of 232k
Tatoeba links per entry), and the dictionary
searches offline on iOS, Android and web from a single service layer. Search
handles conjugated verbs, kana and romaji; word detail shows conjugation tables
and furigana-annotated examples.

| Stage | Status |
|---|---|
| 1 — App foundation | Done |
| 2 — Dictionary tab | Done, bar the deferred items below |
| 3 — Lists tab | Done, bar the deferred items below |
| 4 — Study system | Done, bar the deferred items below |
| 5 — Auth and sync | Not started |
| 6 — Polish and ship | Settings done; first production build made; store work outstanding |
| 7 — Reader | Done, bar the deferred items below |

Work flows top-down through the dependency chain:

```
database.ts → root layout → tab bar                        ✅
  → dictionary service → search screen → word detail       ✅
    → conjugation engine                                   ✅
      → lists service → lists tab                          ✅
        → SRS service → study session                       ✅
          → segmenter → reader                              ✅
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
- **Segmentation** — `tests/segmentBenchmark.ts`, 20 sentences of ordinary
  Japanese with the words a reader should be able to tap in each, currently
  83/83. Run through the real dictionary in `services/readerQuery.test.ts`,
  which also holds the reader to one query per sentence and under a second
  for a long paragraph.

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

### Stage 7 — done. Paste anything, read it, tap any word

Built 16/09/26; preview build 10 and the first production build. The
Dictionary home has a "Read a text" row; the reader segments a paste into
words with their readings, and every tap goes through the word page, so it
lands in Searched Terms like a search does.

Designed by a three-seat product council (learner experience, growth and
first run, technical) whose memos were reconciled into these decisions:

- **One labelled door, on the Dictionary home**, not an icon in the search
  bar and not a fifth tab. With text saved the row reads "Continue reading"
  with the text's first line, which is the reader's return hook.
- **The empty reader shows the mechanic, not instructions:** a sample
  sentence rendered live with tappable words under "Try it — tap any word".
  Taps on it are real lookups.
- **Two states, never both:** the paste field with a Read button, or the
  text with an Edit button. Edit reopens the field prefilled; the field's X
  clears. No confirmation on clear.
- **A tap opens the word page at once.** No peek: the SRD promises one tap
  per unknown word, and the word page is where history is recorded.
- **Unknown Japanese is still tappable** — it opens search prefilled — so no
  tap mid-sentence is a dead end. Unknown text is not dimmed: grey reads as
  "the app failed". Digits, latin and punctuation are plain.
- **Words looked up before are underlined** in the accent colour, derived
  from `search_history` at read time, so the "search → study" loop is visible
  without a toast or counter.
- **No romaji in the reader.** Romaji above every kanji run spaces prose out
  until it stops reading as prose; the romaji setting shows kana here.
- **The text persists; the scroll position does not** (the reader stays
  mounted under the word page, so back lands where you were anyway).
- **Segmentation is dictionary-driven**, no new library: see
  `ARCHITECTURE.md` "Reader". Gated on the benchmark above.

**Test it on the S25:** Dictionary → Read a text → tap a word in the sample →
back → paste a paragraph from a news site → Read → tap three words you do
not know → Lists → Searched Terms has them. Then Edit, clear, and confirm the
Dictionary row is back to "Read a text".

### Review-only sessions — done

From the same council. A footnote link under the due bar on the Study
landing, "Review only · N cards, no new words", shown only when it changes
something: with nothing due the bar already says Learn New, and with a full
pile of due cards the two sessions are identical. Not a setting: a standing
"no new words" starves the loop and the pile reads "Nothing due" within a
week. The session is labelled "Review only" under the count and finishes as
"Review complete"; opened with nothing due it says so and offers a normal
session.

### Stage 4 — done. The study loop runs end to end

Built 15/09/26 as preview build 9 for the Android beta (version code 8 was
burnt by an upload that did not complete). The Study tab is back
in the tab bar. Every decision below was taken with Hannah before building;
the reasoning is in `ARCHITECTURE.md` under "Study".

- **FSRS, unmodified.** `services/scheduler.ts` is a thin wrap of `ts-fsrs`
  4.7: Again / Hard / Good / Easy, default parameters, 90% target retention,
  fuzz on so cards learned together drift apart.
- **A pile, not a backlog.** A session is `sessionSize` cards (default 20,
  in Settings), the most likely forgotten first, topped up with unseen words
  only when fewer than that are waiting. The landing shows "20 cards ready",
  never "340 due". Missed days do not grow the pile; FSRS schedules a late
  card from the time that actually passed.
- **"I already know this"** lives behind the ⋯ in the card's corner, not in
  the rating bar. It suspends the card; the list's page shows how many are
  suspended and restores them all in one tap.
- **JLPT lists copy on first study.** The reference stays as it was; Study on
  it creates (or reopens) a custom list of the same name with `jlpt_level`
  set, filled common-first in one transaction. Kanji lists cannot be studied
  yet — see deferred.
- **The card back is `WordDetail` minus conjugations**, with "See full entry"
  to the word page for the rest.
- **Reduce animations** in Settings: follow the device, reduced, or full.
  Reduced turns the card over with no flip.
- **A card rated Again comes back once** at the end of the same session.

**Test it on the S25:** Lists → any list with words → Study. Rate through
the pile; check the landing's streak, accuracy and reviewed count move; kill
the app mid-session and confirm the ratings given so far stuck. Then Settings
→ Animations → Reduced, and flip a card.

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
- [x] Extract `WordDetail` from the word screen. `components/WordDetail.tsx`
      renders hero, meanings, examples, conjugations and kanji breakdown from
      props and reports a kanji tap upward; the screen keeps loading, the header
      and the add-to-list drawer. Done ahead of Stage 4 so the flashcard back can
      mount the same component.
- [ ] Extract `SearchBar` and `RecentChip` from `dictionary/index.tsx`, where
      the search input and recent-search row are still inline.
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

- [x] `services/scheduler.ts` — ts-fsrs wrapped: schedule a rating, preview
      the four intervals, label an interval
- [x] `services/studyQuery.ts` — the review queue, the new queue, progress
      buckets and daily stats as SQL, tested against real SQLite
- [x] `services/srs.ts` — build a session, rate a card in one transaction
      with the day's stats, suspend, progress, active lists
- [x] `services/stats.ts` — daily rows; streak derived from them at read time
- [x] `hooks/useStudySession.ts`, `hooks/useStudyStats.ts`,
      `hooks/useReduceMotion.ts`
- [x] `components/FlashCard.tsx`, `SRSRatingBar.tsx`, `StatsBar.tsx`,
      `DueTodayBar.tsx`, `ActiveListRow.tsx`
- [x] `app/(tabs)/study/index.tsx` and `session.tsx`; Study tab re-enabled
- [x] Study button on a list's page; JLPT vocabulary copies on first study
- [x] Settings: cards per session, front of the card, animations
- [x] No `studyStore`: a session's state is local to its screen and every
      rating is written as it is given, so nothing needs to outlive the screen

**Checkpoint:** a full FSRS session runs end to end; intervals schedule, due
counts and streak update afterwards. Met in Jest; awaiting the S25.

### Deferred from Stage 4

- [ ] **Kanji cannot be studied.** Cards point at `entries`; kanji are keyed
      by character. Same blocker as kanji in custom lists (Stage 3), same fix.
- [ ] **The front shows furigana.** Per the SRD the front is "kanji with
      furigana", so the reading is given away when the reading setting is
      furigana. A learner testing readings may want a "kanji only" front;
      decide after using it.
- [ ] **Suspended words are not marked in the list.** The list page shows a
      count and a Restore-all; there is no per-word marker or per-word restore.
- [ ] **No per-list progress on the list's own page.** Mastered / learning /
      new counts appear on the Study landing only.
- [ ] **The ⋯ menu has one item.** "See full entry" and "skip for now" could
      join it.
- [ ] **Per-list review-only.** The landing's link runs review-only across
      every active list; tapping a list row still starts a mixed session.

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

- [x] Extend settings — card direction, cards per session, animations
- [ ] Reset SRS progress for a list
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
- [ ] **Prove an over-the-air update lands.** The first `eas update` on the
      `preview` channel went out 16/09/26 (the due-bar overflow fix), for the
      build 9 runtime. EAS reported "1 asset uploaded, 33 reused", so the
      dictionary was not re-uploaded: build 9 was made from this machine's
      rebuilt database, so the hashes agree. Confirm on the S25 that the fix
      arrives on the second launch after the update, and note how long the
      download takes. Note for later: the build is not byte-deterministic, so
      an update published after the next database rebuild will re-fetch it.
- [x] **First Android production build** — `eas build --profile production
      --platform android` on 16/09/26, version code 11, an app bundle for the
      Play Console. Not yet uploaded anywhere; no Play Console record exists.
      Version codes are one counter across profiles (`appVersionSource:
      remote`), so preview 10 and production 11 are the same code.
- [ ] **Play Console** — create the app record, internal testing track,
      upload the bundle
- [ ] **iOS** — TestFlight via EAS, App Store Connect record
- [ ] **Web** — `npx expo export --platform web`, deploy with the headers above

**Checkpoint:** installable from TestFlight and Play internal track; the core
loop (search → add to list → study → review) works on all three platforms.

### Running locally

**Node first.** `.nvmrc` pins Node 22 and `package.json` declares the range
Expo and Vite accept (`^20.19 || >=22.12`). Vite 7 will not load its config on
anything older, so on a fresh checkout or a new machine:

```bash
nvm install && nvm use      # reads .nvmrc
npm install
npm rebuild better-sqlite3  # only after switching Node major; it is a native module
```

The dictionary database is gitignored, so a fresh clone has none. Rebuild it
from the sources under "Data sources" below before running the Vitest half;
an old copy from before the frequency-rank rebuild fails 88 tests with
`no such column: e.frequency_rank`.

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

## Stage 7 — Reader

Requirement: `SRD.md` FR-10. Decisions: "Now" above. How it works:
`ARCHITECTURE.md` "Reader".

- [x] `utils/segment.ts` — candidate spans, deinflection, and the scored
      split, pure over a `Lexicon`; unit-tested on a fake lexicon
- [x] `services/readerQuery.ts` — the batched exact-form lookup against
      `entries_fts`, lexicon assembly with JMdict's "usually kana" flag,
      visited lookup, paragraph splitting; pure
- [x] `tests/segmentBenchmark.ts` + `services/readerQuery.test.ts` — 20
      sentences against the real dictionary, 83/83 words, ~5ms a sentence
- [x] `services/reader.ts` — one paragraph to tokens with furigana and
      visited marks; punctuation glued to the word before it
- [x] `stores/readerStore.ts` — the text, persisted; 20,000-character cap
- [x] `hooks/useReader.ts` — per-paragraph resolution with a session cache;
      visited marks refreshed on focus
- [x] `components/ReaderText.tsx` — wrapping row of tappable ruby tokens
- [x] `app/(tabs)/dictionary/reader.tsx` — field / text states, sample, Edit
- [x] Dictionary home: "Read a text" / "Continue reading" row; "See all" on
      Recently Searched, to the Searched Terms list

**Checkpoint:** paste a news paragraph, read it end to end with the readings
showing, tap three unknown words, find all three in Searched Terms. Met in
Jest against a mocked reader and in Vitest against the real dictionary;
awaiting the S25.

### Deferred from Stage 7

- [ ] **A library of saved texts.** One text at a time for now; pasting
      replaces it.
- [ ] **Share-sheet intake** from other apps needs `expo-share-intent` or
      similar — a new library, so ask first.
- [ ] **Reading the clipboard automatically** (`expo-clipboard`, also new).
      A paste into the field needs nothing.
- [ ] **OCR from a photo.**
- [ ] **Homographs.** A span with several entries (生 as なま / せい) opens the
      common one; the others are reachable from search only.
- [ ] **Irregular stems.** 来た shows 来 read く from 来る; it should be き. A
      table of the handful of irregulars belongs in `furiganaFor`.
- [ ] **Compound readings are one block.** 日本語 shows にほんご over the run,
      not per kanji as the word page does, since `splitCompounds` needs the
      KANJIDIC readings the reader does not fetch.
- [ ] **Scroll position across relaunch.** Revisit with saved texts.

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
