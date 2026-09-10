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

#### `search_history` — Powers the "Searched Terms" list

| Column | Type | Description |
|---|---|---|
| entry_id | INTEGER FK | References entries.id |
| searched_at | TEXT | ISO timestamp |
| search_count | INTEGER | Times this term was searched |

#### `study_stats` — Daily study statistics for streak and accuracy tracking

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| date | TEXT | ISO date (YYYY-MM-DD), unique |
| cards_reviewed | INTEGER | Total cards reviewed that day |
| cards_correct | INTEGER | Cards rated Good or Easy (for accuracy) |
| cards_again | INTEGER | Cards rated Again |
| cards_hard | INTEGER | Cards rated Hard |
| cards_easy | INTEGER | Cards rated Easy |
| session_count | INTEGER | Number of study sessions that day |
| streak_length | INTEGER | Consecutive days studied (computed/cached) |

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
The FSRS algorithm (used by Anki 23.10+) is empirically better. The `ts-fsrs` npm package provides a TypeScript implementation ready to use.

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
│   ├── FlashCard.tsx             # Flippable card with gestures
│   ├── WordDetail.tsx            # Full word breakdown
│   ├── ConjugationTable.tsx      # Verb/adj conjugation display
│   ├── ExampleSentences.tsx      # Word page examples; divider under every row but the last
│   ├── SRSRatingBar.tsx          # Again/Hard/Good/Easy buttons with intervals
│   ├── SearchBar.tsx             # Dictionary search input
│   ├── StatsBar.tsx              # Study landing stats (streak, accuracy, reviewed today)
│   ├── DueTodayCard.tsx          # Accent-coloured CTA showing total due cards
│   ├── ListDuePill.tsx           # Compact pill badge showing due count per list
│   ├── ListRow.tsx               # List row with star toggle and item count
│   ├── KanjiResultRow.tsx        # One kanji per row: character, meanings, readings, JLPT
│   ├── BottomDrawer.tsx          # Slide-up panel shell used by the drawers
│   ├── CreateListDialog.tsx      # Floating card with the list-name field; rises above the keyboard
│   ├── AddToListDrawer.tsx       # Pick a list for a word, or make one
│   ├── SwipeAction.tsx          # Swipe a row right to add it, left to remove it
│   ├── Toast.tsx                 # Bottom toast, mounted once at the root
│   ├── RecentChip.tsx            # Recently searched word chip
│   └── FeaturedWord.tsx          # Word of the Day / recommended word card
├── services/                     # Business logic
│   ├── dictionary.ts             # Search, lookup, conjugation
│   ├── searchQuery.ts            # Query intent, FTS5 SQL, tiered ranking
│   ├── srs.ts                    # FSRS scheduling logic
│   ├── lists.ts                  # List CRUD, Searched Terms
│   ├── listQuery.ts              # List ordering and membership SQL
│   ├── schema.ts                 # User schema, built-in seeds, migrations
│   ├── stats.ts                  # Streak, accuracy, daily review counts
│   └── database.ts               # SQLite connection + DAL
├── hooks/                        # Custom React hooks
│   ├── useDictionary.ts
│   ├── useTheme.ts               # Theme setting -> NativeWind colour scheme
│   ├── useStudySession.ts
│   ├── useStudyStats.ts          # Hook for stats banner data
│   └── useLists.ts
├── stores/                       # Zustand stores
│   ├── searchStore.ts
│   ├── studyStore.ts
│   ├── toastStore.ts
│   └── settingsStore.ts
├── utils/                        # Pure functions
│   ├── conjugation.ts            # Conjugation engine
│   ├── furigana.ts               # Furigana parsing/alignment
│   ├── japanese.ts               # Script detection, kana folding, romaji both ways
│   ├── deinflect.ts              # Conjugated form -> dictionary form
│   ├── wordClass.ts              # JMdict POS tags -> word class + transitivity
│   ├── entryJson.ts              # Parses the JSON columns on entries
│   └── formatting.ts             # Display helpers
├── assets/
│   └── hoshino.db                # Pre-built dictionary database
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
