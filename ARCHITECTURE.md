# Hoshino (星野) — Architectural Plan

## Overview

Hoshino is a cross-platform Japanese language learning app (iOS, Android, Web) built with Expo Router and TypeScript. The MVP delivers a dictionary with rich word data and a spaced-repetition flashcard system, shipping with complete JLPT N5–N1 vocabulary and kanji sets.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | **Expo SDK + Expo Router** | Universal (iOS/Android/Web) from one codebase, file-based routing |
| Language | **TypeScript** | Type safety across the entire stack |
| Styling | **NativeWind (Tailwind)** | Utility-first styling that works cross-platform |
| Local DB | **expo-sqlite** | Offline-first dictionary and SRS data; fast full-text search |
| State | **Zustand** | Lightweight, TypeScript-friendly, no boilerplate |
| SRS Engine | **FSRS (ts-fsrs)** | Modern spaced repetition; 20–30% more efficient than SM-2 |
| Animations | **react-native-reanimated** | Smooth flashcard flip/swipe gestures at 60fps |
| Text/Furigana | Custom component | Ruby text rendering for kanji with furigana overlay |
| Backend | **Supabase** | Auth (email + password) and PostgreSQL for remote persistence of user data |
| Sync client | **@supabase/supabase-js** | Typed JS client for auth session management and user-table sync |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Expo Router                          │
│                 (File-based navigation)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │  Dictionary   │  │      Study       │  │   Lists    │  │
│  │    Screen     │  │  ┌────────────┐  │  │  (Browse   │  │
│  │  ┌──────────┐ │  │  │  Landing   │  │  │ Catalogue) │  │
│  │  │  Search   │ │  │  │ Stats/Due  │  │  └────────────┘  │
│  │  │  Detail   │ │  │  │ Active     │  │                  │
│  │  │  Kanji    │ │  │  ├────────────┤  │                  │
│  │  └──────────┘ │  │  │  Session   │  │                  │
│  └──────────────┘  │  │ Flashcard   │  │                  │
│                     │  │ Rating Bar  │  │                  │
│                     │  └────────────┘  │                  │
│                     └──────────────────┘                  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │               Shared UI Components                  │   │
│  │  FuriganaText, FlashCard, WordDetail, StatsBar,     │   │
│  │  DueTodayCard, ListDuePill, SRSRatingBar, etc.      │   │
│  └──────────────────────┬─────────────────────────────┘   │
│                         │                                  │
│  ┌──────────────────────┴─────────────────────────────┐   │
│  │                  Service Layer                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │   │
│  │  │Dictionary│ │   SRS    │ │  List   │ │ Stats  │  │   │
│  │  │ Service  │ │ Engine   │ │ Manager │ │Service │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬────┘ └───┬────┘  │   │
│  └───────┼─────────────┼────────────┼──────────┼───────┘   │
│          │             │            │          │            │
│  ┌───────┴─────────────┴────────────┴──────────┴───────┐   │
│  │              Data Access Layer (DAL)                  │   │
│  │                 expo-sqlite + FTS5                    │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │                 SQLite Database                        │   │
│  │  ┌────────┐ ┌─────┐ ┌─────┐ ┌──────┐ ┌───────────┐  │   │
│  │  │entries │ │kanji│ │ srs │ │lists │ │study_stats│  │   │
│  │  └────────┘ └─────┘ └─────┘ └──────┘ └───────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Architecture

### Database Schema (SQLite)

The app ships with a pre-built SQLite database bundled as an asset. On first launch, it's copied to the app's writable directory.

#### `entries` — Dictionary entries (from JMdict)

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | JMdict sequence number |
| kanji_forms | TEXT (JSON) | Array of kanji writings |
| reading_forms | TEXT (JSON) | Array of readings (hiragana) |
| senses | TEXT (JSON) | Meanings, POS tags, usage notes |
| jlpt_level | INTEGER | 1–5 (nullable for non-JLPT words) |
| is_common | BOOLEAN | Common word flag |
| frequency_rank | INTEGER | JMdict `nfNN` band, 1–48 (nullable — newspaper frequency, absent on much everyday vocabulary) |
| tags | TEXT (JSON) | Usage domains, dialects, formality |

#### `kanji` — Kanji details (from KANJIDIC2)

| Column | Type | Description |
|---|---|---|
| character | TEXT PK | The kanji character |
| meanings | TEXT (JSON) | English meanings |
| on_readings | TEXT (JSON) | On'yomi readings |
| kun_readings | TEXT (JSON) | Kun'yomi readings |
| jlpt_level | INTEGER | 1–5 |
| grade | INTEGER | School grade level |
| stroke_count | INTEGER | Number of strokes |
| radicals | TEXT (JSON) | Component radicals |
| frequency | INTEGER | Newspaper frequency rank |
| entry_ids | TEXT (JSON) | The 50 most frequent words using this kanji |

#### `examples` — Example sentences (from Tatoeba)

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Sentence ID |
| japanese | TEXT | Japanese sentence |
| english | TEXT | English translation |
| tokens | TEXT (JSON) | Tokenised words (for linking to entries) |

#### `entry_examples` — Links entries to example sentences

| Column | Type | Description |
|---|---|---|
| entry_id | INTEGER FK | References entries.id |
| example_id | INTEGER FK | References examples.id |

#### `lists` — User-created and system lists

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Display name |
| type | TEXT | "custom", "system", "jlpt_vocab", "jlpt_kanji" |
| jlpt_level | INTEGER | For JLPT lists only |
| created_at | TEXT | ISO timestamp |
| starred | INTEGER | 1 pins the list to the top of the Lists screen |

There is no `updated_at`. Recency is derived from `list_items` — see "Recency is derived, not stored".

#### `list_items` — Entries belonging to a list

Holds rows only for `custom` and `system` lists. JLPT lists are resolved from `jlpt_level` at read time and store nothing here.

| Column | Type | Description |
|---|---|---|
| list_id | INTEGER FK | References lists.id |
| entry_id | INTEGER FK | References entries.id |
| added_at | TEXT | ISO timestamp |

#### `srs_cards` — Spaced repetition state per entry per list

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| entry_id | INTEGER FK | References entries.id |
| list_id | INTEGER FK | References lists.id |
| due | TEXT | Next review date (ISO) |
| stability | REAL | FSRS stability parameter |
| difficulty | REAL | FSRS difficulty parameter |
| elapsed_days | INTEGER | Days since last review |
| scheduled_days | INTEGER | Days until next review |
| reps | INTEGER | Total review count |
| lapses | INTEGER | Times forgotten |
| state | INTEGER | 0=new, 1=learning, 2=review, 3=relearning |
| last_review | TEXT | ISO timestamp |
| suspended | INTEGER | 1 = "I already know this"; out of every queue until restored |

Unique on `(entry_id, list_id)`. A row exists only once a word has been rated
or suspended — see "Study" under Key Design Decisions.

#### `search_history` — Powers the "Searched Terms" list

| Column | Type | Description |
|---|---|---|
| entry_id | INTEGER FK | References entries.id |
| searched_at | TEXT | ISO timestamp |
| search_count | INTEGER | Times this term was searched |

#### `study_stats` — Daily study statistics: streak, new words, graduations

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| date | TEXT | ISO date (YYYY-MM-DD), unique |
| cards_reviewed | INTEGER | Ratings given that day, counting re-shows |
| cards_correct | INTEGER | Unused since the accuracy figure went; no longer written |
| cards_again | INTEGER | Cards rated Again |
| cards_hard | INTEGER | Cards rated Hard |
| cards_easy | INTEGER | Cards rated Easy |
| cards_new | INTEGER | New words introduced (first rating), spent against "New words per day" |
| cards_learned | INTEGER | Words that reached Review from New or Learning — "Learned today" |
| session_count | INTEGER | Number of study sessions that day |
| streak_length | INTEGER | Unused. The streak is derived from the rows at read time |

### Full-Text Search

SQLite FTS5 virtual table over `entries` for fast dictionary lookup:

```sql
CREATE VIRTUAL TABLE entries_fts USING fts5(
  kanji_text,    -- flattened kanji forms
  reading_text,  -- flattened readings
  meaning_text,  -- flattened English meanings
  content=entries,
  content_rowid=id
);
```

This enables sub-millisecond searches across kanji, readings, and English meanings simultaneously.

---

## Data Pipeline

The raw data sources (JMdict XML, KANJIDIC2 XML, Tatoeba TSV) need to be processed into the SQLite database before the app ships.

```
JMdict.xml ──┐
              ├──▶ build-dictionary.ts ──▶ hoshino.db (bundled asset)
KANJIDIC2.xml┘          │
                        │
Tatoeba TSV ────────────┘
```

This is a **build-time** script (Node.js/TypeScript) that:
1. Parses XML/TSV sources
2. Normalises and links data
3. Generates conjugation tables from POS + dictionary form
4. Links example sentences to entries via token matching
5. Creates FTS5 index
6. Outputs a single `.db` file (~50–80MB)

---

## Key Design Decisions

### Offline-first
The entire dictionary and SRS state lives locally. No network required for core functionality. This is non-negotiable for a study tool — you need it on the train, on a plane, anywhere.

### Conjugation engine, not conjugation data
Japanese conjugation is highly regular, so rather than storing every conjugated form we derive the verb class and generate forms programmatically. This covers: dictionary, masu, te, ta, nai, potential, passive, causative, imperative, conditional, volitional forms — plus their polite variants.

The class is read at runtime rather than stored. `utils/wordClass.ts` derives it from the part-of-speech tags on `senses`, which is why the conjugation feature needed no database rebuild. A `conjugation_class` column existed until the last rebuild and was null on every row — the build script looked up JMdict short codes like `v5r` while `fast-xml-parser` had already expanded them to `Godan verb with 'ru' ending` — and was dropped rather than fixed, since nothing read it.

### Frequency is a tie-breaker, not a ranking signal
`entries.frequency_rank` holds JMdict's `nfNN` band, but it measures *newspaper* frequency and much everyday vocabulary has no band at all: 本 and 行く carry only `ichi1`, while 書物 and 行う score nf14 and nf01. Weighting it heavily promotes newspaper words over the words a learner is looking for, so it is worth 12 points against `is_common`'s 50, and an absent band scores as average rather than worst.

### Mid-word kanji search is an index, not a tokenizer
`entries_fts` treats a whole Japanese word as one token and matches prefixes, so 曜 reaches 曜日 but never 水曜日. A trigram FTS table cannot fix this: FTS5's trigram tokenizer ignores queries shorter than three characters, and Japanese queries are routinely one or two. `kanji.entry_ids` instead stores the 50 most frequent words using each kanji, and `buildMidWordQuery` unions the lists for the characters typed. Capping at 50 costs about 3MB where indexing all 502k (kanji, word) pairs would cost 19MB.

### One source of truth for the colour scheme
NativeWind resolves every `dark:` class from its own colour scheme, which follows the device unless it is told otherwise. Anything that computes its own `isDark` from the settings store is therefore a second, competing answer, and the two disagree whenever the chosen theme differs from the device — which is exactly how light mode ended up rendering white text on Android.

Screens must take `isDark` from `hooks/useTheme.ts`, which writes the setting into NativeWind and reads the resolved value back. `tailwind.config.js` must keep `darkMode: "class"`: NativeWind's web runtime throws on a manual colour-scheme change while dark mode is `"media"`, which is the default.

### JLPT lists are a query, not stored rows
The ten preloaded JLPT lists exist in `lists` for identity, starring and naming, but hold nothing in `list_items`. Their contents come from `jlpt_level`, which the build already writes onto both `entries` and `kanji`. Materialising them would put roughly 9,700 rows in the user database to express something the dictionary already knows, and would need reseeding whenever the dictionary is rebuilt.

It also sidesteps a type mismatch: `list_items.entry_id` is an integer pointing at `entries`, so it cannot hold a kanji, which is keyed by character. Query-backed JLPT kanji lists work anyway. Letting a user put a kanji in their own list is still unsolved and needs an `item_type` + `item_key` pair on `list_items`.

### Recency is derived, not stored
A list sorts by when it was last added to. That is read at query time as the newest `list_items.added_at`, falling back to `lists.created_at` for an empty list, rather than kept in an `updated_at` column. A stored column is one more thing every write has to remember to touch, and it goes wrong silently; the derived value cannot disagree with the items it is derived from. The cost is a correlated subquery over a table holding tens of lists, which is not worth optimising.

### Schema lives apart from the connection
`services/schema.ts` holds the user-database DDL and the built-in list seeds, and `services/database.ts` executes it. The split exists so tests can build the identical schema in plain SQLite without importing expo-sqlite, which does not run under Node. That is what allows the list ordering rules to be tested as the actual SQL the app runs, rather than a JavaScript reimplementation of them that could drift.

Columns added after release also need an entry in `MIGRATIONS`, because `CREATE TABLE IF NOT EXISTS` does nothing to a database an earlier build already created.

### FSRS over SM-2
The FSRS algorithm (used by Anki 23.10+) is empirically better. The `ts-fsrs` npm package provides a TypeScript implementation ready to use. `services/scheduler.ts` is the only file that imports it for scheduling; everything else asks that file.

### Study

The long version — the problem, what Anki and FSRS do, the decisions and how
they were built — is `STUDY_ALGORITHM.md`. This is the engineering summary.

**A card is created on the first rating, not when a word joins a list.** A word
in a list with no `srs_cards` row is new. Adding a word therefore writes
nothing but the list item, and the new-card queue is a `LEFT JOIN` that finds
items without a card. Suspending a never-rated word writes an empty row with
`suspended = 1`, which is the one exception.

**Every card query joins `list_items`.** Removing a word from a list leaves its
card in place but invisible: it is in no queue and no count. Re-add the word and
its progress is back. Nothing is destroyed by a removal that the user might
undo, and no query has to remember to clean up.

**Two limits, two meanings.** `newPerDay` (default 10) is how many never-seen
words may be introduced today across every list, counted in
`study_stats.cards_new` as they are first rated. `sessionSize` (default 20) is
the most distinct cards one session holds. Re-shows within a session count
against neither.

**A session is due cards, then new words within the budget; there is no
backlog.** `buildSession(listIds, { mode, sessionSize, newPerDay })` takes the
`sessionSize` most-at-risk due cards — including Learning and Relearning cards
due within a twenty-minute learn-ahead window, so a session that was left
mid-loop resumes at once — then fills the room left with new words: up to
`newPerDay − cards_new` in a *mixed* session, none in *review*, as many as fit
in *learn*. "At risk" is ordered in SQL by elapsed time over stability, which is
the variable FSRS's forgetting curve is a function of, so the order is by recall
probability without evaluating the curve per row. FSRS has no notion of review
debt — a late card is scheduled from the time that actually passed, and
recalling a very overdue card raises stability more than an on-time recall
would — so leaving cards waiting costs only their own retention, honestly. The
progress query counts `due` with the same learn-ahead rule, so the landing's
"6 due · 4 new" is exactly what the session opens with (`previewSession`).

**A session runs until its cards are settled.** `services/sessionQueue.ts` is
a pure scheduler over the pile: `next()` picks a card that has come due again
(earliest first), else the next unseen card in build order, else the earliest
card still waiting on its timer — never the same card within three others
(fewer when fewer remain). `settle()` marks a card done when FSRS moved it to
Review, capped after four shows (it stays in Learning for tomorrow), and
otherwise re-queues it at the due time FSRS gave. The header counts settled
cards of the session's distinct cards. The rating is applied at the instant
the card came up, the same instant the interval labels were drawn from: FSRS
seeds its fuzz from the review time, so two clocks would promise one interval
and give another.

**Mastery is a ladder read off stability.** `stageOf(card)` in `scheduler.ts`:
New (no card) · Learning (Learning or Relearning state, or stability under a
day) · Familiar (1–7 days) · Known (7–30) · Mastered (30 and up). The progress
buckets in `progressSql` are the same rungs, and `MasteryBadge` shows the rung
on the card and beside each word on a list's page.

**A rating writes the card and the day's counters in one transaction.**
`rateCard` upserts the card and calls `recordReview` with the card before and
after: one review, the grade, an introduction when the card had no row, and a
graduation when the state crossed into Review from New or Learning (not from
Relearning — a lapsed word coming back is not learned again). There is no
accuracy figure anywhere: the banner is Day streak · Learned today · Reviewed
today.

**JLPT lists copy on first study.** The ten reference lists hold no items and
no cards. `startStudying` creates a `custom` list with the same name and
`jlpt_level` as provenance, fills `list_items` from the dictionary in one
transaction (common words first, which becomes the new-card order), and
returns the existing copy on later taps. Kanji lists cannot be copied because
`list_items.entry_id` cannot hold a kanji.

**Stats are per local day and the streak is derived.** `study_stats` has one
row per `YYYY-MM-DD` in the device's time zone. The streak counts back from
today, or from yesterday if today has no review yet, so it holds until midnight
passes without one. `streak_length` is not written.

**No study store.** A session's state — queue, current card, tally — lives in
`useStudySession` on the session screen. Every rating is written as it is
given, so nothing needs to survive the screen, and the landing reloads on
focus.

### Reader

**Segmentation is the dictionary asking itself.** Japanese has no spaces.
Rather than ship a morphological analyser and its 15–20MB dictionary,
`utils/segment.ts` takes every span of up to eight characters at every
position, adds the dictionary forms `deinflect` can reduce a kana-ending span
to, and asks `entries_fts` which of those terms exist. The index stores each
written form and reading as one token, so a bare `"term"` match (no prefix
star) is an exact whole-form lookup, and one `MATCH` with a few thousand
terms OR'd answers a paragraph in one query — about 100ms in Node for 400
characters, under 5ms for a sentence.

**The split is scored, not greedy.** Dynamic programming over positions picks
the segmentation with the highest total, where a word scores its length
squared (so 日本語 beats 日本 + 語), on a lower curve when JMdict does not flag
it common (so 毎日 + 野菜 beats 日野菜, a turnip), plus a little for matching
as written rather than by deinflection. Unknown characters cost a little each
and merge into one plain run. Four rules encode how Japanese is written and
were each added for a benchmark sentence that failed without them:

- A lone kana is never a candidate: it is a particle or an ending.
- A kana surface may only be a kanji word that JMdict marks "usually written
  in kana" — ある is 有る, but は is not 歯 and れつ is not 列.
- Words seldom start or end inside a run of kanji, so a span that does
  (解|決する) pays for it.
- A deinflection that only works by treating a trailing case particle as an
  ending (近くで → 近い) pays; so does a span with a case particle inside it
  (面が割れて) unless it is common as written.

`tests/segmentBenchmark.ts` holds 20 hand-marked sentences; the reader shipped
at 83/83. When a sentence fails, the fix is a rule with a reason, not a
special case.

**Readings follow the dictionary form onto the surface.** 食べた matched 食べる
/ たべる: the kanji keep the readings `alignFurigana` gives them in the
dictionary form, and whatever the passage has after the shared prefix is kana
that needs none (`furiganaFor`). A kana-only word, or a match through a
reading rather than a written form, is shown bare.

**Every tap is a search.** A word opens `/word/[id]`, which records the lookup
into `search_history` and Searched Terms exactly as a typed search does. The
reader adds no tracking of its own. Unknown Japanese opens search prefilled
instead, so no tap is a dead end. "Visited" underlines come from
`search_history` at read time and are refreshed when the screen regains focus.

**Rendering is Views in a wrapping row, not nested Text.** Android cannot lay
out a View inside Text without a fixed size, and nested-Text press targets
land wrong, so each token is a Pressable column of ruby over base text inside
`flex-row flex-wrap`. The cost is no kinsoku, so punctuation is glued onto the
word before it in `services/reader.ts`. Paragraphs — newline-separated, and
broken at sentence ends past 400 characters — go in a `FlatList`, each
resolving itself when it comes on screen, so a long article never mounts
thousands of views at once and the first screen paints before the rest is
looked up.

**The text lives in a persisted store, not the user database.** It is not one
of the five synced tables, has no query, needs no migration, and a pasted
passage may be someone else's writing. Only the text is stored; the
segmentation is recomputed from the dictionary, which is the one source of
truth for what a word is.

### Searched Terms as a first-class list
Every dictionary lookup automatically adds the entry to a "Searched Terms" list with a timestamp and frequency count. This list is reviewable as flashcards just like any JLPT list. Frequently searched words surface higher — if you keep looking something up, you clearly need to learn it.

### Pre-built database as a bundled asset
Rather than downloading data on first launch, the processed SQLite DB ships with the app binary. This ensures instant usability and avoids first-run complexity. The tradeoff is a larger app size (~80MB), but for a dictionary app this is standard and expected.

---

## Project Structure

```
hoshino/
├── app/                          # Expo Router file-based routes
│   ├── (tabs)/                   # Tab navigator (3 tabs: Dictionary, Study, Lists)
│   │   ├── dictionary/           # Search
│   │   │   ├── _layout.tsx       # Stack
│   │   │   └── index.tsx         # Search screen (recommended word, recent chips, results)
│   │   ├── study/                # Study tab
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # Study landing (stats banner, due CTA, active lists)
│   │   │   └── session.tsx       # Flashcard session (card, rating bar, progress)
│   │   ├── lists/                # Browse catalogue of all available lists
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # All lists (JLPT, Searched Terms, custom)
│   │   │   └── [id].tsx          # List detail / items
│   │   └── _layout.tsx           # Tab bar layout
│   ├── word/[id].tsx             # Word detail screen (meanings, examples, conjugations)
│   ├── kanji/[char].tsx          # Kanji detail screen
│   ├── create-list.tsx           # Name a new list; a transparent modal over whatever pushed it
│   └── _layout.tsx               # Root layout (Stack: tabs, word, kanji, create-list)
├── components/                   # Shared UI
│   ├── FuriganaText.tsx          # Kanji with furigana overlay (column-flex approach)
│   ├── FlashCard.tsx             # Flip on tap; back is WordDetail without conjugations; ⋯ menu suspends
│   ├── WordDetail.tsx            # Full word breakdown
│   ├── ConjugationTable.tsx      # Verb/adj conjugation display
│   ├── ExampleSentences.tsx      # Word page examples; divider under every row but the last
│   ├── SRSRatingBar.tsx          # Again/Hard/Good/Easy buttons with intervals
│   ├── SearchBar.tsx             # Dictionary search input
│   ├── StatsBar.tsx              # Study landing stats (streak, learned today, reviewed today)
│   ├── DueTodayBar.tsx           # Slim accent bar: "6 due · 4 new" (never backlog), Start / Learn more
│   ├── ActiveListRow.tsx         # A studied list: ladder counts, progress bar, due pill, Review
│   ├── MasteryBadge.tsx          # A word's rung on the ladder: name and five dots
│   ├── ListRow.tsx               # List row with star toggle and item count
│   ├── KanjiResultRow.tsx        # One kanji per row: character, meanings, readings, JLPT
│   ├── BottomDrawer.tsx          # Slide-up panel shell used by the drawers
│   ├── CreateListDialog.tsx      # Floating card with the list-name field; rises above the keyboard
│   ├── AddToListDrawer.tsx       # Pick a list for a word, or make one
│   ├── SwipeAction.tsx          # Swipe a row right to add it, left to remove it
│   ├── Toast.tsx                 # Bottom toast, mounted once at the root
│   ├── ReaderText.tsx            # A paragraph of tappable ruby tokens
│   ├── RecentChip.tsx            # Recently searched word chip
│   └── FeaturedWord.tsx          # Word of the Day / recommended word card
├── services/                     # Business logic
│   ├── dictionary.ts             # Search, lookup, conjugation
│   ├── searchQuery.ts            # Query intent, FTS5 SQL, tiered ranking
│   ├── scheduler.ts              # The only ts-fsrs import: schedule, preview, label, mastery rung
│   ├── studyQuery.ts             # Queues, budget, progress and stats as SQL, testable in Node
│   ├── sessionQueue.ts           # In-session order and settling, pure
│   ├── srs.ts                    # Sessions, ratings, suspend, progress against the user db
│   ├── readerQuery.ts            # Batched exact-form lookup, lexicon, paragraphs; pure
│   ├── reader.ts                 # A paragraph to tokens with furigana and visited marks
│   ├── lists.ts                  # List CRUD, Searched Terms
│   ├── listQuery.ts              # List ordering and membership SQL
│   ├── schema.ts                 # User schema, built-in seeds, migrations
│   ├── stats.ts                  # Streak, today's new words and graduations, review counts
│   └── database.ts               # SQLite connection + DAL
├── hooks/                        # Custom React hooks
│   ├── useDictionary.ts
│   ├── useTheme.ts               # Theme setting -> NativeWind colour scheme
│   ├── useStudySession.ts        # One session: queue until settled, reveal, rate, suspend
│   ├── useStudyStats.ts          # Landing data, reloaded on focus
│   ├── useReduceMotion.ts        # Setting or device preference
│   ├── useReader.ts              # Per-paragraph resolution with a session cache
│   └── useLists.ts
├── stores/                       # Zustand stores
│   ├── searchStore.ts
│   ├── readerStore.ts            # The pasted text, persisted
│   ├── toastStore.ts
│   └── settingsStore.ts
├── utils/                        # Pure functions
│   ├── conjugation.ts            # Conjugation engine
│   ├── furigana.ts               # Furigana alignment; splits compounds per kanji from KANJIDIC readings
│   ├── segment.ts                # Running text to dictionary words, scored over a lexicon
│   ├── confirm.ts                # Native yes/no before something irreversible; browser confirm on web
│   ├── japanese.ts               # Script detection, kana folding, romaji both ways
│   ├── deinflect.ts              # Conjugated form -> dictionary form
│   ├── wordClass.ts              # JMdict POS tags -> word class + transitivity
│   ├── entryJson.ts              # Parses the JSON columns on entries
│   └── formatting.ts             # Display helpers
├── assets/
│   └── hoshino.db                # Pre-built dictionary database (gitignored; ~100MB)
├── scripts/                      # Build-time data pipeline
│   ├── build-dictionary.ts       # XML/TSV → SQLite
│   └── sources/                  # Raw data files
│       ├── JMdict_e.xml
│       ├── kanjidic2.xml
│       └── tatoeba-jpn-eng.tsv
├── app.json                      # Expo config
├── tailwind.config.js            # NativeWind config
├── tsconfig.json
└── package.json
```

---

## Future Architecture Considerations

These are **not MVP** but worth keeping in mind so we don't paint ourselves into a corner:

- **Remote API layer**: When the AI chat feature lands, we'll need a backend. A lightweight edge function (Cloudflare Workers or Vercel Edge) calling Claude's API would slot in cleanly.
- **Extended sync features**: The MVP sync covers the 5 user tables with last-write-wins conflict resolution. Post-MVP could introduce finer-grained conflict handling, real-time sync via Supabase Realtime, or shared/collaborative lists.
- **Grammar lessons**: These are structured content — markdown or JSON lesson files that can be bundled or fetched. The lesson viewer is a separate screen group in Expo Router.
- **Audio pronunciation**: TTS via device APIs or bundled audio clips per entry. The schema can accommodate an `audio_url` column on entries without breaking anything.
