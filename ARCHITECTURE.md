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
| conjugation_class | TEXT | e.g. "godan-ru", "ichidan", "i-adj" |
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
| type | TEXT | "jlpt", "system", "user" |
| jlpt_level | INTEGER | For JLPT lists only |
| created_at | TEXT | ISO timestamp |

#### `list_items` — Entries belonging to a list

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
Japanese conjugation is highly regular. Rather than storing every conjugated form, we store the verb class and generate forms programmatically. This covers: dictionary, masu, te, ta, nai, potential, passive, causative, imperative, conditional, volitional forms — plus their polite variants.

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
│   │   ├── dictionary/           # Search & word detail
│   │   │   ├── index.tsx         # Search screen (recommended word, recent chips, results)
│   │   │   ├── [id].tsx          # Word detail screen (meanings, examples, conjugations)
│   │   │   └── kanji/[char].tsx  # Kanji detail screen
│   │   ├── study/                # Study tab
│   │   │   ├── index.tsx         # Study landing (stats banner, due CTA, active lists)
│   │   │   └── session.tsx       # Flashcard session (card, rating bar, progress)
│   │   ├── lists/                # Browse catalogue of all available lists
│   │   │   ├── index.tsx         # All lists (JLPT, Searched Terms, custom)
│   │   │   └── [id].tsx          # List detail / items
│   │   └── _layout.tsx           # Tab bar layout
│   └── _layout.tsx               # Root layout
├── components/                   # Shared UI
│   ├── FuriganaText.tsx          # Kanji with furigana overlay (column-flex approach)
│   ├── FlashCard.tsx             # Flippable card with gestures
│   ├── WordDetail.tsx            # Full word breakdown
│   ├── ConjugationTable.tsx      # Verb/adj conjugation display
│   ├── SRSRatingBar.tsx          # Again/Hard/Good/Easy buttons with intervals
│   ├── SearchBar.tsx             # Dictionary search input
│   ├── StatsBar.tsx              # Study landing stats (streak, accuracy, reviewed today)
│   ├── DueTodayCard.tsx          # Accent-coloured CTA showing total due cards
│   ├── ListDuePill.tsx           # Compact pill badge showing due count per list
│   ├── ListCard.tsx              # Reusable list card (active w/ progress or browse-only)
│   ├── RecentChip.tsx            # Recently searched word chip
│   └── FeaturedWord.tsx          # Word of the Day / recommended word card
├── services/                     # Business logic
│   ├── dictionary.ts             # Search, lookup, conjugation
│   ├── srs.ts                    # FSRS scheduling logic
│   ├── lists.ts                  # List CRUD, Searched Terms
│   ├── stats.ts                  # Streak, accuracy, daily review counts
│   └── database.ts               # SQLite connection + DAL
├── hooks/                        # Custom React hooks
│   ├── useDictionary.ts
│   ├── useStudySession.ts
│   ├── useStudyStats.ts          # Hook for stats banner data
│   └── useLists.ts
├── stores/                       # Zustand stores
│   ├── searchStore.ts
│   ├── studyStore.ts
│   └── settingsStore.ts
├── utils/                        # Pure functions
│   ├── conjugation.ts            # Conjugation engine
│   ├── furigana.ts               # Furigana parsing/alignment
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
- **User accounts & sync**: If you want progress to sync across devices, a Supabase or similar backend with auth + PostgreSQL would mirror the local SQLite schema. Use CRDT or last-write-wins for conflict resolution on SRS state.
- **Grammar lessons**: These are structured content — markdown or JSON lesson files that can be bundled or fetched. The lesson viewer is a separate screen group in Expo Router.
- **Audio pronunciation**: TTS via device APIs or bundled audio clips per entry. The schema can accommodate an `audio_url` column on entries without breaking anything.
