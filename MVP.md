# Hoshino — MVP Roadmap

This document tracks the remaining work to ship the Hoshino MVP. The data pipeline is complete (`hoshino.db` — 217k entries, 13k kanji, 232k examples). All source files under `app/`, `components/`, `services/`, `hooks/`, `stores/`, and `utils/` are currently placeholders.

Work flows top-down through the dependency chain:

```
database.ts → root layout → tab bar
  → dictionary service → search screen → word detail
    → conjugation engine → lists service → lists tab
      → SRS service → study session
        → Supabase + auth + sync
          → EAS build + submission
```

---

## Stage 1 — App Foundation

Get the app running with a working tab bar before building any features.

- [ ] `services/database.ts` — copy `hoshino.db` from the asset bundle to the writable directory on first launch, open the SQLite connection, export a shared `db` instance
- [ ] `app/_layout.tsx` — root layout: load fonts (Inter, Noto Sans JP), splash screen, Supabase session provider, Expo Router stack
- [ ] `app/(tabs)/_layout.tsx` — tab bar with 3 tabs (Dictionary, Study, Lists), Lucide icons, accent/tertiary active/inactive colour states

**Checkpoint:** `npx expo start` opens a blank app with a working tab bar on iOS, Android, and Web.

---

## Stage 2 — Dictionary Tab

The highest-leverage stage. The search experience and word detail view are the most visible quality signals for the whole app.

- [ ] `utils/furigana.ts` — parse furigana alignment from JMdict kanji + reading pairs
- [ ] `components/FuriganaText.tsx` — inline-block ruby rendering per the design system (not HTML `<ruby>` — see `DESIGN_SYSTEM.md` §7)
- [ ] `services/dictionary.ts` — FTS5 full-text search, single entry lookup by ID, kanji detail lookup, search history write (auto-adds every viewed entry to the Searched Terms list)
- [ ] `hooks/useDictionary.ts` — debounced search hook, entry lookup hook
- [ ] `stores/searchStore.ts` — recent searches, active query, results
- [ ] `app/(tabs)/dictionary/index.tsx` — search bar, featured word of the day, recent searches row, live results list
- [ ] `app/(tabs)/dictionary/[id].tsx` — word detail: furigana hero, all senses grouped by POS, example sentences with furigana, conjugation table, JLPT badge, kanji tap-through
- [ ] `utils/conjugation.ts` — generate all conjugation forms programmatically from POS tag + dictionary form; covers godan (all variants), ichidan, i-adjective; forms: dictionary, masu, te, ta, nai, potential, passive, causative, conditional, volitional — plain and polite
- [ ] `components/ConjugationTable.tsx` — display generated conjugation forms in a grid
- [ ] `app/(tabs)/dictionary/kanji/[char].tsx` — kanji detail: on/kun readings, meanings, stroke count, JLPT level, grade, frequency, vocabulary entries that contain this kanji
- [ ] `components/WordDetail.tsx` — reusable word breakdown component (used in both detail screen and flashcard back)
- [ ] `components/SearchBar.tsx` — search input with clear button, supports romaji/hiragana/katakana/kanji/English
- [ ] `components/RecentChip.tsx` — recently searched word chip (horizontal scroll row)
- [ ] `components/FeaturedWord.tsx` — word of the day card (random common entry seeded by date)

**Checkpoint:** Full dictionary search and word detail works offline. Tapping a kanji in a word opens the kanji detail. Conjugation table renders for verbs and i-adjectives.

---

## Stage 3 — Lists Tab

- [ ] `services/lists.ts` — read JLPT lists and list items, create/delete custom lists, add/remove entries, read Searched Terms list
- [ ] `hooks/useLists.ts` — lists catalogue hook, list detail hook
- [ ] `app/(tabs)/lists/index.tsx` — browse catalogue grouped by JLPT level (N5 → N1) + Searched Terms + custom lists; search bar to filter
- [ ] `app/(tabs)/lists/[id].tsx` — list detail: all entries with furigana, item count, add to study button
- [ ] `components/ListCard.tsx` — reusable list card (browse-only variant for Lists tab; active variant with progress bar for Study tab)
- [ ] `components/ListDuePill.tsx` — compact pill badge showing due card count per list

**Checkpoint:** All 10 JLPT lists are browsable. Searched Terms list accumulates from dictionary lookups. Custom lists can be created and entries added from the word detail screen.

---

## Stage 4 — Study System

- [ ] `services/srs.ts` — wrap `ts-fsrs`: initialise a new card, schedule after rating (Again/Hard/Good/Easy), get due cards for a list ordered by overdue-first, compute next interval labels for display
- [ ] `services/stats.ts` — write daily study stats row, compute day streak (consecutive days reviewed), read today's accuracy and reviewed count
- [ ] `stores/studyStore.ts` — session state: current card queue, current index, pending ratings, session totals
- [ ] `hooks/useStudySession.ts` — session lifecycle: load due cards, advance, rate, exit
- [ ] `hooks/useStudyStats.ts` — stats banner data: streak, accuracy, reviewed today
- [ ] `components/FlashCard.tsx` — flippable card using `react-native-reanimated`; front shows kanji + furigana (or English, per settings); back shows full `WordDetail`; supports tap-to-flip and swipe gestures
- [ ] `components/SRSRatingBar.tsx` — four buttons (Again / Hard / Good / Easy) with computed next-interval labels; semantic colours per `DESIGN_SYSTEM.md` §2.6
- [ ] `components/StatsBar.tsx` — compact stats row: streak (🔥), accuracy (%), reviewed today; separated by dividers
- [ ] `components/DueTodayCard.tsx` — slim accent bar showing total cards due across all active lists; tapping starts combined review session
- [ ] `app/(tabs)/study/index.tsx` — study landing: stats banner, due today bar, active lists with progress bars and due pills, "Browse All" link to Lists tab
- [ ] `app/(tabs)/study/session.tsx` — flashcard session: card queue loop, flip animation, rating bar, progress bar (`7 / 20`), X to exit and save progress

**Checkpoint:** A full FSRS study session works end-to-end. Cards are rated, intervals are scheduled, and the due count updates correctly after a session. Streak and accuracy update in the stats banner.

---

## Stage 5 — Auth & Sync

- [ ] **Supabase project** — create project at supabase.com; add `.env.local` from `.env.example` template
- [ ] **Supabase schema** — mirror the 5 user tables in PostgreSQL: `srs_cards`, `lists`, `list_items`, `search_history`, `study_stats`; add `user_id uuid` column referencing `auth.users` on each
- [ ] **Row-level security** — enable RLS on all 5 tables; policy: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE
- [ ] `app/auth/sign-in.tsx` — email + password sign-in form; link to sign-up and password reset
- [ ] `app/auth/sign-up.tsx` — registration form with email + password
- [ ] `app/auth/reset-password.tsx` — password reset via email
- [ ] Guest mode — app is fully usable without signing in; local data only; a subtle persistent prompt ("Back up your progress — sign in") appears on the Study landing after the first session
- [ ] `services/sync.ts` — pull on sign-in (fetch all remote user rows, seed local DB, last-write-wins by `last_review` timestamp); push after each study session (upsert changed `srs_cards` and `study_stats` rows); queue writes when offline and flush on reconnect

**Checkpoint:** A user can sign up, study on one device, sign in on a second device, and see their SRS progress and lists intact. Guest mode works fully offline with no errors.

---

## Stage 6 — Polish & Ship

- [ ] **Settings screen** (`app/settings.tsx`) — card direction (kanji→English or English→kanji), daily new card limit per list, theme preference, reset SRS progress for a list
- [ ] **`stores/settingsStore.ts`** — persisted settings (Zustand + AsyncStorage)
- [ ] **App icons** — 1024×1024 icon (星 character on accent background), adaptive icon for Android
- [ ] **Splash screen** — logo mark centred on `--bg-primary` background
- [ ] **`eas.json`** — EAS Build config: `development`, `preview` (internal distribution), and `production` profiles for iOS and Android
- [ ] **iOS** — TestFlight internal build via EAS; App Store Connect app record
- [ ] **Android** — internal track APK via EAS; Google Play Console app record
- [ ] **Web** — `npx expo export --platform web`; deploy to Vercel or similar

**Checkpoint:** App is installable from TestFlight (iOS) and Google Play internal track (Android). Core loop (search → add to list → study → review) works on all three platforms.

---

## Data Sources (reference)

All raw files live in `scripts/sources/` (gitignored). To regenerate `assets/hoshino.db`:

```bash
./scripts/download-sources.sh   # ~650 MB download
npx tsx scripts/fetch-jlpt.ts   # JLPT vocab mapping (~77 KB)
npm run build:db                 # generates assets/hoshino.db (~117 MB)
```

| Source | File | Licence |
|---|---|---|
| JMdict (vocabulary) | `JMdict_e.xml` | CC BY-SA 4.0 |
| KANJIDIC2 (kanji) | `kanjidic2.xml` | CC BY-SA 4.0 |
| Tatoeba (sentences) | `jpn_sentences.tsv`, `eng_sentences.tsv`, `links.csv`, `jpn_indices.csv` | CC BY 2.0 |
| Kanji JLPT overlay | `kanji-jlpt.json` | MIT |
| JLPT vocab mapping | `jlpt-vocab.json` (generated by `fetch-jlpt.ts`) | CC BY |
