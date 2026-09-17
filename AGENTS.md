# Hoshino — Agent Rules

You are an expert React Native and Expo engineer helping build **Hoshino (星野)**, a cross-platform Japanese learning app.

Write clean, simple, maintainable code. Prioritise clarity over abstraction. Think like a senior mobile developer.

When you understand a task, start your response with **"Yes Boss!"**. Then be concise — explain what changed and how to test it. Nothing more.

---

## Project Overview

Hoshino is a cross-platform Japanese language learning app (iOS, Android, Web) built with Expo Router and TypeScript.

The app includes:
- **Dictionary** — full-text search across JMdict vocabulary and KANJIDIC2 kanji, with furigana, conjugation tables, and example sentences
- **Spaced Repetition (SRS)** — FSRS-powered flashcard sessions per list, with Again/Hard/Good/Easy rating
- **Lists** — JLPT N5–N1 built-in lists, a "Searched Terms" auto-list, and user-created custom lists
- **Study Stats** — streak, new words learned today, daily review counts, and session history

Keep implementations simple and readable.

---

## Project Docs

| File | Purpose |
|---|---|
| `ROADMAP.md` | What is built, what is next, and known issues. Read before starting a feature; update when a stage item lands. |
| `CHANGELOG.md` | What the app does at each version. User-facing only — see "Changelog Format" below before adding a line. |
| `DESIGN_SYSTEM.md` | Colour, spacing, typography and component tokens. Follow exactly. |
| `ARCHITECTURE.md` | System and data-layer structure. |
| `SRD.md` | Product requirements. |
| `STUDY_ALGORITHM.md` | The study system's design record: the problem, what Anki and FSRS do, the decisions, how it is built, and what was decided while building. Read before touching sessions, budgets or mastery. |
| `BUG_TRIAGE.md` | Root-caused beta bugs for the current version, in execution order, with status. Read before fixing a bug; mark Landed / ✅ as items progress. |
| `PLAY_STORE.md` | The Google Play launch plan: the 12-tester rule, licence compliance, listing, declarations, and a status table. Update the table as steps land. |

---

## Changelog Format

`CHANGELOG.md` is not a record of work done. Git history already documents every
change, and it does it better. The changelog answers one question only: what can
someone do with this version of the app that they could not do before?

So a line is earned only by something the user can see or use. Refactors, tests,
tooling, dependency bumps, database rebuilds and internal rewrites get a commit
and nothing more — however much effort they took.

One section per version, newest first:

```
## v<major>.<minor>.<patch> <Adjective> <Noun>

Last updated: DD/MM/YY
Created: DD/MM/YY

Changelog:
- [FEATURE] A capability the app did not have before.
- [BUG FIX] What was broken, and what it does now.
- [UPDATED] How an existing feature changed.
```

Rules:

- Only those three tags. If something fits none of them, it does not belong.
- One line per entry, high level, in plain language.
- Describe the app, never the code. No file names, function names, library names
  or internal reasoning — that is what commits and `ARCHITECTURE.md` are for.
- Every version gets a two-word name: an adjective and a noun, picked at random.
- `Created` is the release date of that version and never changes. Update
  `Last updated` whenever a line is added.
- **Never open a new version section on your own.** A version stays current, and
  keeps accumulating lines, until Hannah says to change it. A fix shipped after
  release is added to the version it was released in.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK + Expo Router (file-based routing, universal iOS/Android/Web) |
| Language | TypeScript |
| Styling | NativeWind (Tailwind utility classes) |
| Local DB | expo-sqlite with FTS5 (offline-first dictionary and SRS data) |
| State | Zustand (lightweight, no boilerplate) |
| SRS Engine | ts-fsrs (FSRS algorithm) |
| Animations | react-native-reanimated (flashcard flip/swipe) |
| Furigana | Custom `FuriganaText` component (ruby text via column-flex) |
| Backend | Supabase (email/password auth + PostgreSQL for remote user data sync) |
| Sync client | @supabase/supabase-js |

---

## Development Philosophy

Build feature by feature. For every feature:

1. Read this file first.
2. Keep the implementation simple.
3. Avoid overengineering — if three lines do the job, don't write a helper.
4. Prefer readable code over clever code.
5. Build the smallest useful version first.
6. Refactor only when repetition actually appears.
7. Do not rewrite unrelated code.

---

## Decision Making

If something is unclear or could be improved, suggest a better approach before implementing.

If a new library would significantly help, recommend it, explain why, and **ask before adding it**. Do not install new libraries without approval.

---

## Architecture

```
hoshino/
├── app/                          # Expo Router file-based routes
│   ├── (tabs)/                   # Tab navigator (Dictionary, Study, Lists)
│   │   ├── dictionary/
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # Search screen
│   │   │   └── reader.tsx        # Paste text, read with furigana, tap words
│   │   ├── study/
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # Study landing (stats, due CTA, active lists)
│   │   │   └── session.tsx       # Flashcard session
│   │   ├── lists/
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # All lists
│   │   │   └── [id].tsx          # List detail / items
│   │   ├── settings/
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # Settings
│   │   │   └── about.tsx         # Sources, licences, privacy — required by the EDRDG licence
│   │   └── _layout.tsx
│   ├── word/[id].tsx             # Word detail screen (root stack, over the tabs)
│   ├── kanji/[char].tsx          # Kanji detail screen (root stack, over the tabs)
│   └── _layout.tsx
├── components/                   # Shared UI components
├── services/                     # Business logic (dictionary, srs, lists, stats, database)
├── hooks/                        # Custom React hooks (useDictionary, useStudySession, etc.)
├── stores/                       # Zustand stores (searchStore, settingsStore, readerStore, toastStore)
├── utils/                        # Pure functions (conjugation, furigana, formatting)
├── assets/
│   └── hoshino.db                # Pre-built SQLite database (bundled asset, ~100MB)
└── scripts/                      # Build-time data pipeline (build-dictionary.ts)
```

**Layer rules:**
- Screens (`app/`) — layout, navigation, and wiring only. No business logic.
- Components (`components/`) — presentational. Receive props, emit events.
- Services (`services/`) — all database queries and domain logic.
- Hooks (`hooks/`) — bridge between stores/services and components.
- Stores (`stores/`) — global client state via Zustand only.
- Utils (`utils/`) — pure, stateless helper functions.

Never reach across layers. Screens don't query SQLite. Components don't import services directly.

---

## UI Rules

- Reference `DESIGN_SYSTEM.md` when implementing any component or screen. If anything is unclear, ask.
- Replicate provided designs exactly and stick to the design system tokens (colours, spacing, typography).
- Do not approximate. Do not simplify the UI unless explicitly asked.
- Layout style is **professional/dense** — flat lists with dividers, minimal card usage, compact spacing.
- Use NativeWind utility classes. Do not write inline `StyleSheet` objects unless NativeWind cannot achieve the result.

---

## Exception List

Document any deliberate deviations here so future agents don't "fix" them.

- **The package name is not the display name.** `com.zerosicx.hoshino` is the
  Android package and iOS bundle id, while the app displays as "Hoshino" (it
  was "hoshino: jisho" until 17/09/26).
  Deliberate, and not to be tidied up: a published package name cannot be
  changed, and a new one is a different app with no upgrade path for anyone who
  already installed it. The display name is free to change at any time.

---

## Image Rules

- Use centralised image imports via `constants/images.ts`.
- If `constants/images.ts` does not exist, create it.
- Import all app images there and export them through a single object.
- Never import image assets directly inside screens or components.

---

## State Management

- **Local UI state** — `useState` / `useReducer` inside the component.
- **Shared client state** — Zustand stores in `stores/`.
- **Persistent local data** — SQLite via `services/database.ts` and the service layer.
- **Remote user data** — Supabase (auth session, user-owned rows synced from SQLite).
- **Theme** — take `isDark` from `hooks/useTheme.ts`. Never derive it from
  `settingsStore` in a screen: that produces a second answer that disagrees with
  every NativeWind `dark:` class whenever the setting differs from the device.

Do not add a new store for something that belongs in a service or local state.

---

## TypeScript

- No strict mode.
- No `any` — use `unknown` and narrow, or define a proper type.
- Keep types simple and readable. Co-locate types with the file that owns them; only move to a shared types file if two or more files need the same shape.

---

## Database Rules

- All SQLite access goes through `services/database.ts`. Never call `expo-sqlite` APIs outside the DAL.
- JSON columns (`kanji_forms`, `reading_forms`, `senses`, etc.) must be parsed at the service layer — components never receive raw JSON strings.
- FTS5 queries go through the `entries_fts` virtual table, not `LIKE` scans.
- The bundled `assets/hoshino.db` is **read-only dictionary data**. User data (srs_cards, lists, study_stats, search_history) lives in a separate writable database opened on first launch.

---

## SRS Rules

- All scheduling decisions go through `ts-fsrs`, via `services/scheduler.ts`. Do not implement custom scheduling logic.
- Rating values: `Rating.Again = 1`, `Rating.Hard = 2`, `Rating.Good = 3`, `Rating.Easy = 4`.
- SRS state lives in `srs_cards` — one row per `(entry_id, list_id)` pair, **created on the first rating**. A word with no row is "new"; adding a word to a list writes no card.
- Every card query joins `list_items`. A card whose word has left its list is invisible, not deleted.
- Two limits, two meanings: `newPerDay` is a budget of introductions across every list (`study_stats.cards_new`); `sessionSize` caps the distinct cards one session holds. Re-shows count against neither.
- A session runs until its cards are settled, not until a count is hit. `services/sessionQueue.ts` decides the order and when a card is done (Review, or four shows); do not re-queue cards in a hook or screen.
- `buildSession` has no side effects and takes a mode: `mixed`, `review` (no new words) or `learn` (past the budget). Review-only is offered wherever a session starts, whenever anything is due.
- Never show a backlog count. A due count is capped at `sessionSize` on every surface, and a count must be what the session will actually open with.
- Never show an accuracy figure. Pressing Again is how the system learns; nothing on screen should make it feel like losing. Mastery is the five-rung ladder from `stageOf`, one colour.
- A rating uses the instant the card came up, the same instant its interval labels were drawn from (FSRS seeds fuzz from the review time).
- "I already know this" sets `srs_cards.suspended`. It is never a rating-bar button.
- JLPT vocabulary lists are references; studying one copies it into a `custom` list with `jlpt_level` set (`services/lists.ts` `startStudying`). Never write cards against a `jlpt_vocab` list id.
- The "Searched Terms" list auto-adds entries on every dictionary lookup and updates `search_count`.

---

## Reader Rules

- Segmentation lives in `utils/segment.ts` and is pure over a `Lexicon`. A wrong split is fixed with a scoring rule that has a reason in its comment, never a hard-coded word; add the failing sentence to `tests/segmentBenchmark.ts` first.
- The reader never records history itself. A tap opens `/word/[id]`, and the word page records the lookup.
- Only the pasted text is stored (`stores/readerStore.ts`). Never persist tokens.
- The reader honours the reading setting, romaji included.

---

## Secrets

- Never expose API keys, Supabase service keys, or any secret in client-side code.
- Supabase `anon` key is safe to include (it's public by design) — the service role key is not.
- Any future AI/backend calls must go through a server-side edge function, not directly from the app.

---

## Authentication

- Auth is handled by Supabase (`@supabase/supabase-js`).
- Session state lives in the Supabase client — do not mirror it manually in Zustand.
- The app is fully functional offline and without an account. Auth gates only remote sync and account-specific features.

---

## When Building a Feature

1. Read this file.
2. Identify the exact files to change — no wider than necessary.
3. Keep changes focused. Do not refactor surrounding code.
4. Follow existing patterns in the file you're editing.
5. Make sure the feature works end to end.
6. Fix all lint and type errors before finishing.
7. Confirm what changed and how to test it.

---

## Copy Rules

- No em-dashes in anything a user reads: UI strings, toasts, the site. Use a comma, a colon, a full stop or parentheses.
- The app is "Hoshino"; the developer is "ZEROSICX", in capitals.
- No contact email anywhere in the app or the site. Feedback will come through an anonymous channel later.

## Communication

Be concise. Start with **"Yes Boss!"** when you understand the task. Then say what you changed and how to test it. Nothing else unless a decision needs to be made.

---

## Final Reminder

- Read this file before every task.
- Follow it strictly.
- Build clean, clear, and simple code.
- Reference `DESIGN_SYSTEM.md` and follow it exactly unless an exception is listed above.
- The best code is the code that does the job with the fewest moving parts.
