# Hoshino — Roadmap

Where the app is, and what ships next. Shipped work is recorded in
`CHANGELOG.md`; this file only tracks what remains and in what order.

## Where we are

The data pipeline and the dictionary read path are done. `assets/hoshino.db`
holds 217k entries, 13k kanji and 232k example sentences, and the dictionary now
searches offline on iOS, Android and web from a single service layer.

| Stage | Status |
|---|---|
| 1 — App foundation | Done |
| 2 — Dictionary tab | Search and detail done; conjugation outstanding |
| 3 — Lists tab | Not started |
| 4 — Study system | Not started |
| 5 — Auth and sync | Not started |
| 6 — Polish and ship | Settings done; build and store work outstanding |

Study and Lists are greyed out in the tab bar until Stage 3 begins.

Work flows top-down through the dependency chain:

```
database.ts → root layout → tab bar                        ✅
  → dictionary service → search screen → word detail       ✅
    → conjugation engine → lists service → lists tab
      → SRS service → study session
        → Supabase + auth + sync
          → EAS build + submission
```

---

## Now

Three things stand between the dictionary being *functional* and being *good*.

- [ ] **Search ranking, part two — the data the ranker still lacks.** Tiered
      scoring landed (see `CHANGELOG.md`) and the benchmark is at 45/45, but
      several results win by a margin of ten points or less because the only
      tie-breakers are the `is_common` boolean and `jlpt_level`, which covers
      3.5% of entries. Keep JMdict's `nfNN` priority tags in the build instead
      of collapsing them into `is_common`: `nf01` through `nf48` is the
      frequency signal Jisho-class ranking depends on, and it would replace
      those thin margins with a real ordering.
- [ ] **Mid-word kanji search.** `entries_fts` uses the default `unicode61`
      tokenizer, which makes a whole Japanese word one token, and matching is
      prefix-anchored. So 曜 finds 曜日 but can never reach 水曜日. Needs a
      second FTS table using the `trigram` tokenizer over kanji and reading
      text, which is a database rebuild.
- [ ] **`conjugation_class` is empty for all 217,783 rows.** `detectConjugationClass`
      looks up JMdict short codes (`v5r`, `adj-i`), but `fast-xml-parser`
      expands the XML entities first, so the value it actually receives is
      `Godan verb with 'ru' ending` and the lookup never hits. Not urgent:
      `utils/wordClass.ts` reads the expanded strings off `senses` at runtime,
      so nothing is blocked on it. Worth fixing to drop a dead column.
- [ ] **Native cold-start copy.** `importDatabaseFromAssetAsync` runs with
      `forceOverwrite: true`, re-copying 98MB on every launch. Needs a stored
      build version compared against the asset's, so it copies only when the
      dictionary actually changes — dropping the flag alone would strand users
      on a stale dictionary after an app update.
- [x] **`utils/conjugation.ts`** and **`components/ConjugationTable.tsx`** —
      done; see `CHANGELOG.md`.

---

## Stage 2 — remaining dictionary work

Deferred deliberately; the screens work without them.

- [ ] `components/FeaturedWord.tsx` — word of the day, a random common entry
      seeded by date
- [x] `utils/furigana.ts` — done. Alignment plus sentence annotation; 98.7% of
      kanji in example sentences get a reading. The remaining 1.3% are left
      bare on purpose, since a wrong reading is worse than none.
- [ ] Extract `SearchBar`, `RecentChip` and `WordDetail` from the screens. The
      search input and recent-search row are currently inline in
      `dictionary/index.tsx`; `WordDetail` needs extracting before the flashcard
      back can reuse it in Stage 4.

**Checkpoint:** conjugation table renders for verbs and i-adjectives, and search
ranking puts common words first.

Search quality is tracked by `npm test`, which measures ranking against
`tests/benchmark.ts` — 45 queries whose expected answers came from jisho.org.
The benchmark needs `assets/hoshino.db` present; without it the suite skips
rather than fails. Ranking cannot be tested against a small fixture, because
BM25 scores depend on corpus-wide statistics.

---

## Stage 3 — Lists tab

- [ ] `services/lists.ts` — read JLPT lists and items, create/delete custom
      lists, add/remove entries, read the Searched Terms list
- [ ] `hooks/useLists.ts` — catalogue hook, list detail hook
- [ ] `app/(tabs)/lists/index.tsx` — catalogue grouped by JLPT level (N5 → N1)
      plus Searched Terms and custom lists, with a filter bar
- [ ] `app/(tabs)/lists/[id].tsx` — list detail: entries with furigana, item
      count, add-to-study button
- [ ] `components/ListCard.tsx` — browse variant for Lists, active variant with
      progress bar for Study
- [ ] `components/ListDuePill.tsx` — due count badge per list
- [ ] Wire dictionary lookups into the Searched Terms list and re-enable the
      Lists tab

**Checkpoint:** all 10 JLPT lists browsable, Searched Terms accumulating from
lookups, custom lists creatable with entries added from word detail.

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
- **`Cannot pipe to a closed or destroyed stream`** on first dev run — an
  unpatched bug in `expo-server@1.0.6`, not our code. Harmless.

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
