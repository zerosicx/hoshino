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

`npm test` runs Vitest. Two suites measure behaviour rather than assert on
mocks, and both open the real `assets/hoshino.db`:

- **Search ranking** — `tests/benchmark.ts`, 45 queries whose expected answers
  came from jisho.org, currently 45/45. `services/searchRobustness.test.ts`
  holds a second set never used for tuning, to catch overfitting.
- **Furigana coverage** — the share of kanji in example sentences that get a
  reading, currently 98.7%.

Neither can run against a small fixture: BM25 scores depend on corpus-wide
statistics, so a cut-down database ranks differently. Both suites skip rather
than fail when the database is absent.

**Nothing renders a component.** The suite covers pure functions and database
queries only, so anything that goes wrong in layout or colour has to be caught
by eye — which is how light mode shipped rendering white text on Android. Check
a real device after any theme or typography change.

---

## Now

### The next database rebuild

Three things need the bundled database regenerated, so they should land
together in one rebuild rather than forcing users through a 98MB download
twice.

- [ ] **Keep JMdict's `nfNN` frequency tags.** The build collapses `ichi1`,
      `news1` and `spec1` into the `is_common` boolean and throws `nf01`–`nf48`
      away. Ranking is at 45/45 on the benchmark, but several of those wins are
      by ten points or less, because the only tie-breakers are that boolean and
      `jlpt_level`, which covers 3.5% of entries. `nfNN` is the frequency signal
      Jisho-class ranking depends on and would turn those thin margins into a
      real ordering.
- [ ] **Mid-word kanji search.** `entries_fts` uses the default `unicode61`
      tokenizer, which makes a whole Japanese word a single token, and matching
      is prefix-anchored. So 曜 finds 曜日 but can never reach 水曜日. Needs a
      second FTS table using the `trigram` tokenizer over kanji and reading text.
- [ ] **Fix or drop `conjugation_class`.** Null on all 217,783 rows:
      `detectConjugationClass` looks up short codes like `v5r`, but
      `fast-xml-parser` expands the XML entities first, so what arrives is
      `Godan verb with 'ru' ending`. Nothing is blocked — `utils/wordClass.ts`
      reads the expanded strings at runtime — so this is dead-column cleanup.

### Independent of the rebuild

- [ ] **Native cold-start copy.** `importDatabaseFromAssetAsync` runs with
      `forceOverwrite: true`, re-copying 98MB on every launch. Needs a stored
      build version compared against the asset's, so it copies only when the
      dictionary actually changes — dropping the flag alone would strand users
      on a stale dictionary after an app update.

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
- [x] `app/(tabs)/lists/[id].tsx` — words, or a kanji grid for JLPT kanji lists
- [x] `components/BottomDrawer.tsx`, `CreateListDrawer.tsx`,
      `AddToListDrawer.tsx`, `ListRow.tsx`, `SwipeToAdd.tsx`, `Toast.tsx`
- [x] Plus button on word detail, swipe-to-add on search results, Lists tab
      re-enabled

### Deferred from Stage 3

- [ ] **No way to delete or rename a list.** A list created by accident is
      permanent, and a typo in its name cannot be fixed. Needs a decision on the
      gesture — swipe on the row, or an edit mode.
- [ ] **No way to remove a word from a list.** Same shape of problem as above.
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
- [ ] **COOP/COEP on production web.** `Cross-Origin-Opener-Policy: same-origin`
      and `Cross-Origin-Embedder-Policy: require-corp` are set by
      `metro.config.js` in dev only. Without them on the host, the user database
      loses `SharedArrayBuffer` and web breaks in production.
- [ ] **App icons** — 1024×1024 (星 on accent), Android adaptive
- [ ] **Splash screen** — logo mark on `--bg-primary`
- [ ] **`eas.json`** — development, preview and production profiles for both
      platforms
- [ ] **iOS** — TestFlight via EAS, App Store Connect record
- [ ] **Android** — internal-track APK via EAS, Play Console record
- [ ] **Web** — `npx expo export --platform web`, deploy with the headers above

**Checkpoint:** installable from TestFlight and Play internal track; the core
loop (search → add to list → study → review) works on all three platforms.

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
