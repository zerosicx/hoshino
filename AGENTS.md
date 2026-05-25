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
- **Study Stats** — streak, accuracy, daily review counts, and session history

Keep implementations simple and readable.

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
│   │   │   ├── index.tsx         # Search screen
│   │   │   ├── [id].tsx          # Word detail screen
│   │   │   └── kanji/[char].tsx  # Kanji detail screen
│   │   ├── study/
│   │   │   ├── index.tsx         # Study landing (stats, due CTA, active lists)
│   │   │   └── session.tsx       # Flashcard session
│   │   ├── lists/
│   │   │   ├── index.tsx         # All lists
│   │   │   └── [id].tsx          # List detail / items
│   │   └── _layout.tsx
│   └── _layout.tsx
├── components/                   # Shared UI components
├── services/                     # Business logic (dictionary, srs, lists, stats, database)
├── hooks/                        # Custom React hooks (useDictionary, useStudySession, etc.)
├── stores/                       # Zustand stores (searchStore, studyStore, settingsStore)
├── utils/                        # Pure functions (conjugation, furigana, formatting)
├── assets/
│   └── hoshino.db                # Pre-built SQLite database (bundled asset, ~80MB)
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

- *(None yet — add exceptions as they arise)*

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

- All scheduling decisions go through `ts-fsrs`. Do not implement custom scheduling logic.
- Rating values: `Rating.Again = 1`, `Rating.Hard = 2`, `Rating.Good = 3`, `Rating.Easy = 4`.
- SRS state lives in `srs_cards` — one row per `(entry_id, list_id)` pair.
- The "Searched Terms" list auto-adds entries on every dictionary lookup and updates `search_count`.

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

## Communication

Be concise. Start with **"Yes Boss!"** when you understand the task. Then say what you changed and how to test it. Nothing else unless a decision needs to be made.

---

## Final Reminder

- Read this file before every task.
- Follow it strictly.
- Build clean, clear, and simple code.
- Reference `DESIGN_SYSTEM.md` and follow it exactly unless an exception is listed above.
- The best code is the code that does the job with the fewest moving parts.
