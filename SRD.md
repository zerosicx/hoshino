# Hoshino — Software Requirements Document

---

## 1. Vision

Hoshino is a Japanese language learning app that adapts to its user. Unlike existing dictionary and flashcard tools that treat these as separate experiences, Hoshino unifies them: every word you search becomes a word you can study, and every word you study links back to its full dictionary context. The app learns what you struggle with and surfaces those items more often, while words you've mastered fade into longer review intervals.

Hoshino ships with complete JLPT N5–N1 vocabulary and kanji data, giving learners a structured path from beginner to advanced. But its real power lies in personalisation — the "Searched Terms" list captures your organic curiosity and turns it into study material, ensuring the app always reflects what *you* need to learn, not just what a syllabus dictates.

The app is beautiful, fast, and works entirely offline. It should feel like a native Japanese tool — clean, considered, and a pleasure to use.

---

## 2. Background

### Problem Space

Current Japanese learning tools fall short in several ways:

- **Fragmented experience**: Learners juggle separate apps for dictionary lookup (Jisho, Takoboto), flashcards (Anki), and JLPT prep (various). Context is lost between them.
- **No adaptive learning from search behaviour**: When you look up a word three times in a dictionary app, nothing happens. That repeated lookup is a powerful signal that existing tools ignore entirely.
- **Anki's complexity**: Anki is powerful but intimidating. Creating good Japanese flashcards with furigana, example sentences, and conjugation data requires significant manual effort or add-on configuration.
- **Incomplete word context**: Most flashcard apps show a word and its meaning. They rarely include example sentences, colloquial usage, or conjugation tables — all of which are essential for actually *using* the word.
- **Poor offline support**: Many modern apps require connectivity for basic features.

### Target User

The primary user is an intermediate-to-advanced Japanese learner (JLPT N3–N1 level) who is actively studying, reads Japanese content, and frequently looks up words. They want a single app that serves as both reference tool and study companion. They primarily study on mobile (commute, breaks) with occasional desktop sessions for deeper study.

### Prior Art & Differentiation

| Feature | Jisho | Anki | WaniKani | **Hoshino** |
|---|---|---|---|---|
| Dictionary search | Yes | No | No | **Yes** |
| Furigana display | Yes | Manual | Yes | **Yes** |
| Example sentences | Some | Manual | Some | **Yes (Tatoeba)** |
| Conjugation tables | No | Manual | No | **Yes (auto-generated)** |
| Colloquial usage | No | Manual | No | **Yes** |
| Spaced repetition | No | Yes (SM-2/FSRS) | Yes (custom) | **Yes (FSRS)** |
| JLPT-structured lists | No | Community decks | N/A | **Yes (built-in)** |
| Search → study pipeline | No | No | No | **Yes** |
| Offline-first | Yes | Yes | No | **Yes** |
| Cross-platform | Web only | Desktop + mobile | Web only | **iOS, Android, Web** |

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-01: Dictionary Search
- Users can search by English meaning, romaji, hiragana, katakana, or kanji
- Search results appear in real-time as the user types (debounced at ~200ms)
- Results show: word in kanji, furigana reading, primary English meaning, JLPT level badge, common-word indicator
- Full-text search across all fields using SQLite FTS5
- Search works entirely offline

#### FR-02: Word Detail View
- Tapping a search result opens a comprehensive word detail screen displaying:
  - **Kanji with furigana** rendered above each character
  - **All readings** (on'yomi, kun'yomi for kanji; all readings for vocab)
  - **All English meanings** grouped by sense, with part-of-speech labels
  - **Example sentences** (Japanese with furigana + English translation), sourced from Tatoeba
  - **Common use cases** showing the word in typical contexts
  - **Colloquial usage** with informal/spoken examples where applicable
  - **Conjugation table** (for verbs and i-adjectives): dictionary, masu, te, ta, nai, potential, passive, causative, conditional, volitional forms — plain and polite
  - **JLPT level** and frequency ranking
  - **Kanji breakdown**: tapping any kanji in the word opens its kanji detail (stroke count, radicals, readings, grade level)

#### FR-03: Searched Terms List
- Every word viewed in the dictionary is automatically added to a "Searched Terms" list
- The list tracks: entry, first searched timestamp, last searched timestamp, search count
- Frequently searched words are surfaced prominently (sorted by count or recency, user's choice)
- The Searched Terms list can be studied as flashcards, just like any other list
- Users can remove individual items from the Searched Terms list

#### FR-04: Lists (Browse Catalogue)
- The **Lists tab** serves as a browse catalogue of all available lists, regardless of study progress
- The app ships with pre-built JLPT lists: N5 Vocabulary, N5 Kanji, N4 Vocabulary, N4 Kanji, ..., N1 Vocabulary, N1 Kanji (10 lists total)
- Users can create custom lists with a name
- Users can add/remove entries to/from any user-created list
- Users can add entries to a list directly from the word detail view or search results
- Each list card shows: name, item count, and a brief description
- Lists can be filtered via a search bar
- Tapping a list opens its detail view showing all contained entries
- The Lists tab is **discovery-focused** — it answers "what can I study?" rather than "what am I studying?"

#### FR-05: Study Landing & Flashcard Sessions
- The **Study tab** opens to a landing page that serves as the user's study workspace
- The Study landing displays:
  - **Stats banner**: day streak (consecutive days studied), new words learned today (words that reached the review stage), and cards reviewed today. There is no accuracy figure: nothing on screen should make pressing Again feel like losing
  - **Due Today bar**: a slim accent bar saying exactly what a session will hold across all active lists — "6 due · 4 new" — with Start; "Review only" under it whenever anything is due; "Done for today" with "Learn more" once the day's new words are introduced and nothing is due
  - **Active lists**: lists that have study progress, each showing name, progress bar, counts up the mastery ladder, a due pill and a Review action
  - A "Browse All" link navigating to the Lists tab for discovering new lists
- Tapping an active list or the Due Today bar enters a **flashcard session**; a list's own page offers Study and, when anything is due, Review
- The session presents cards in order of SRS priority: due cards first (most likely forgotten first), then new cards; a card in the minute-scale learning loop counts as due up to twenty minutes early, so a session left mid-way resumes
- Each card displays the **front** (kanji with furigana, or English meaning — configurable)
- Tapping/swiping reveals the **back**: full word detail (meaning, readings, example sentence)
- After viewing the back, the user rates recall with four buttons:
  - **Again** — completely forgot; reschedule for very soon
  - **Hard** — struggled significantly; shorter interval
  - **Good** — remembered with some effort; standard interval
  - **Easy** — instant recall; longer interval
- Each rating button displays the next scheduled interval (e.g., "<1m", "6m", "10m", "4d")
- The FSRS algorithm calculates the next review date based on the rating
- The session shows a progress bar and a card counter, done over distinct cards (e.g., "7 / 20")
- Users can exit a session early via the X button, which returns to the Study landing; every rating is saved as it is given
- **Two limits.** New words per day (default 10) caps how many never-seen words may be introduced in a day across every list. Cards per session (default 20) caps the distinct cards one session holds; due cards fill it first, ordered by how likely they are to have been forgotten, then new words within the day's remaining budget. The landing shows what the session will hold, never a backlog count
- **A session runs until its cards are settled.** A card comes back within the session — soonest after Again, then Hard, then Good, never straight after itself — until the algorithm moves it to the review stage, or until it has been shown four times, in which case it stays in learning and returns tomorrow
- **Three modes**: mixed (the default), review only (due cards, no new words), and learn more (new words past the day's budget, for a learner who has finished and wants to go on). Review only is offered wherever a session starts, whenever anything is due. None of these is a setting
- The session ends on a summary: "8 of 10 new words learned · 12 reviews · 2 still learning, back tomorrow", leaving out any part that is zero
- Card flip animation is smooth and satisfying (react-native-reanimated)

#### FR-06: Study Progress & Statistics
- Every word in study sits on a five-rung **mastery ladder**, named so it can be said: New (never seen) · Learning (in the minute loop, or FSRS stability under a day) · Familiar (1–7 days) · Known (7–30 days) · Mastered (30 days and up). The rung shows on the flashcard, in each active list's counts and progress bar, and beside each word on a list's page
- Each active list on the Study landing shows: counts up the ladder, new and marked-known counts, a due pill, and a visual progress bar; a list's own page shows the same summary under its word count
- The stats banner tracks:
  - **Day streak**: consecutive days with at least one review (persisted in `study_stats`)
  - **Learned today**: words that reached the review stage for the first time today
  - **Reviewed today**: ratings given in the current day
- There is no accuracy figure
- Stats reset daily and accumulate over the course of the day

#### FR-07: Kanji Detail View
- Accessible by tapping any kanji character anywhere in the app
- Displays: character, meanings, on'yomi, kun'yomi, stroke count, radical components, JLPT level, school grade, newspaper frequency rank
- Shows vocabulary entries that contain this kanji (linked back to word detail)

#### FR-08: Settings
- Front-of-card preference: kanji → English or English → kanji
- Daily new card limit per list
- Theme preference (if multiple themes offered)
- Data management: reset SRS progress for a list, export/import progress

#### FR-09: Authentication & Cross-Device Sync
- Users can create an account (email + password) to save progress and access it across iOS, Android, and Web
- The app supports **guest mode**: users can use all core features without signing in; data is stored locally only
- Sign-in is not required at launch; instead, a natural prompt is shown when appropriate ("your progress is only saved on this device — sign in to back it up")
- Auth screens required for MVP: Sign Up, Sign In, Password Reset, and a guest mode entry point (accessible from the sign-in screen)
- OAuth (Google, Apple) is deferred to post-MVP; email + password is sufficient for MVP
- The backend is **Supabase** (Auth + PostgreSQL); the Supabase JS client is used from React Native/Web via `@supabase/supabase-js`
- Dictionary data (JMdict, KANJIDIC2, Tatoeba) is **never synced** — it is bundled locally and read-only
- Only the following 5 user tables are synced to Supabase: `srs_cards`, `lists`, `list_items`, `search_history`, `study_stats`
- **Local SQLite is the source of truth while offline**; writes go to SQLite first, then are pushed to Supabase when connectivity is available
- Sync is **opportunistic**: triggered on app launch and periodically in the background when online
- **Conflict resolution**: last-write-wins based on `last_review` timestamp; FSRS card state is self-contained and does not require merge logic
- When a user signs in on a new device, their remote data is pulled down and merged into the local SQLite database

#### FR-10: Reader (paste text, read with furigana, tap to look up)

**Job to be done.** *When I am reading Japanese somewhere else — a message, an
article, a game's dialogue, a menu photo's text — and I hit words I do not know,
I want to bring that text into Hoshino and read it with the readings shown and
every word one tap from its entry, so that I keep reading instead of stopping
to type each word into a search box, and so that the words I stumbled on become
the words I study.*

**The problem today.** The dictionary answers one word at a time and only if
the learner can type it. Reading real Japanese means meeting ten unknown words
a paragraph, copying each into the search bar, and losing the thread of the
text in between. Kanji the learner cannot read cannot be typed at all, so the
very words that most need looking up are the hardest to look up. Meanwhile the
"Searched Terms" list, the app's core innovation, only ever sees the words the
learner managed to type.

**What the Reader does.**
- A screen where the learner pastes (or types) any Japanese text
- The text is segmented into words; each word that matches a dictionary entry
  is shown with its reading above it (furigana or romaji, per the reading
  setting) and is tappable; text the dictionary does not know is shown as is
- Tapping a word opens the word detail page, which records the lookup in
  search history and so in the Searched Terms list — the same path as a search
- Tapping Japanese the dictionary does not know opens search with it filled
  in, so no tap is a dead end; digits, latin and punctuation are plain
- Words looked up before, in the reader or in search, are underlined
- Conjugated forms resolve to their dictionary entry, as search already does
- Readings only for kanji: kana and punctuation carry none
- Back returns to the text, at the same scroll position, so reading continues
- The pasted text survives leaving the screen and relaunching the app, so a
  long article can be read across several sittings; the Dictionary home offers
  to continue it
- Before anything is pasted, a sample sentence is shown live with tappable
  words, so the mechanic is seen rather than explained
- Romaji is not offered in the reader; the romaji setting shows kana there
- Works offline, on all three platforms, from the bundled dictionary alone

**Out of scope for the first version.** Saving several texts as a library;
sharing text into the app from other apps; reading from a photo (OCR);
per-word "add to list" from the reader (the word page already offers it);
grammar or particle explanations.

**Success looks like** a learner pasting a paragraph and reading it end to end
with, at most, one tap per unknown word — and finding those words waiting in
Searched Terms afterwards.

### 3.2 Non-Functional Requirements

#### NFR-01: Performance
- Dictionary search results must appear within 100ms of the final keystroke
- Flashcard flip animation must run at 60fps with no dropped frames
- App cold start to interactive must be under 2 seconds
- Database queries must complete within 50ms for single-entry lookups

#### NFR-02: Offline Capability
- All core features (search, study, lists) must work with no network connection
- The pre-built dictionary database ships with the app binary
- No feature may silently fail due to lack of connectivity

#### NFR-03: Data Integrity
- SRS progress must never be lost due to app crash or unexpected termination
- Database writes use transactions to prevent partial updates
- The Searched Terms list must reliably capture every dictionary lookup

#### NFR-04: Cross-Platform Consistency
- The app must behave identically on iOS, Android, and Web
- Touch gestures (swipe, tap) on mobile must have equivalent interactions on web (click, keyboard shortcuts)
- Furigana rendering must be visually correct on all platforms

#### NFR-05: Accessibility
- Text sizes must respect system accessibility settings
- Sufficient colour contrast ratios (WCAG AA minimum)
- Screen reader support for all interactive elements
- Flashcard rating buttons must be tappable with a minimum 44x44pt hit area

#### NFR-06: App Size
- Initial app download (including bundled database) should not exceed 100MB
- The database should be optimised for size (no redundant data, compressed where possible)

#### NFR-07: Maintainability
- TypeScript strict mode enabled across the entire codebase
- All services have clear interfaces and are independently testable
- Database migrations are versioned for future schema updates

#### NFR-08: Sync Reliability
- The app must be fully functional with no network connection; sync failure must never block core features
- All writes go to local SQLite first; Supabase is a secondary, asynchronous destination
- Sync operations are idempotent — retrying a failed sync must not produce duplicate records
- Conflict resolution uses last-write-wins by `last_review` timestamp; no manual merge UI is required for MVP
- On first sign-in, a full pull from Supabase is performed; subsequent syncs are incremental (rows modified since last sync timestamp)
- Sync errors are logged silently; the user is not shown error alerts for background sync failures
- Auth token refresh is handled transparently by the Supabase client; session expiry must not cause data loss

---

## 4. Roadmap

### Phase 1 — MVP (Immediate)
> *Build the core loop: search → learn → review*

| Item | Priority | Notes |
|---|---|---|
| Data pipeline (JMdict + KANJIDIC2 + Tatoeba → SQLite) | P0 | Foundation for everything |
| Dictionary search with FTS5 | P0 | Core feature |
| Word detail view (meanings, readings, furigana, examples) | P0 | Must be rich and useful |
| Conjugation engine (verbs + i-adjectives) | P0 | Key differentiator |
| Kanji detail view | P0 | Essential for study |
| Pre-built JLPT lists (N5–N1, vocab + kanji) | P0 | Structured study path |
| Searched Terms auto-capture | P0 | Core innovation |
| Flashcard study session with FSRS | P0 | Core study mechanic |
| SRS rating (Again/Hard/Good/Easy) | P0 | Drives the algorithm |
| Custom list creation and management | P1 | Important but can be slightly simplified at launch |
| Basic study progress per list | P1 | Motivational feedback |
| Settings (card direction, daily limits) | P1 | Personalisation basics |
| Beautiful, polished UI with animations | P0 | The app must feel premium from day one |
| Supabase project setup (auth + PostgreSQL schema) | P0 | Backend foundation for sync; schema mirrors local SQLite user tables |
| Auth screens: Sign Up, Sign In, Password Reset, Guest mode entry | P0 | Required before any sync work; guest mode is the default path |
| Sync service for the 5 user tables (srs_cards, lists, list_items, search_history, study_stats) | P1 | Opportunistic background sync; offline-first, last-write-wins conflict resolution |

### Phase 2 — Enhanced Study Experience
> *Deepen the learning tools*

| Item | Notes |
|---|---|
| Colloquial usage examples | AI-generated or community-curated natural usage |
| Handwriting recognition for kanji input | Draw a kanji to search for it |
| Audio pronunciation | TTS or bundled audio for vocabulary readings |
| Stroke order animation for kanji | Visual guide for writing practice |
| Study statistics dashboard | Charts showing progress over time, accuracy trends, streak history |
| Multiple study modes | Listening quiz, reading quiz, writing quiz, matching |
| **Reader** (FR-10) | Paste any Japanese text; read it with furigana and tap any word for its entry. Feeds Searched Terms. Shipped as Stage 7, 16/09/26 |

### Phase 3 — Grammar & Lessons
> *Evolve from vocabulary tool to comprehensive study companion*

| Item | Notes |
|---|---|
| Grammar lesson library | Structured N5–N1 grammar points with explanations and examples |
| Grammar linked to vocabulary | "This grammar pattern commonly uses these words" |
| Practice exercises per grammar point | Fill-in-the-blank, sentence construction |
| Reading comprehension passages | Short texts with tap-to-lookup and comprehension questions |

### Phase 4 — AI & Social
> *Make it intelligent and connected*

| Item | Notes |
|---|---|
| AI conversation partner | Chat with Claude to practise Japanese; corrects mistakes, explains nuance |
| AI-powered explanations | "Why is this word used here and not X?" on any example sentence |
| Smart review suggestions | AI analyses weak areas and suggests focused study sessions |
| OAuth sign-in (Google, Apple) | Extends the MVP email + password auth with social login options |
| Community sentence contributions | Users submit and vote on example sentences |
| Shared custom lists | Export/import lists, or share publicly |

### Phase 5 — Platform Growth
> *Become the go-to Japanese study platform*

| Item | Notes |
|---|---|
| Other language support (Korean, Mandarin) | Architecture allows for it; new data pipeline per language |
| Integrations (Kindle highlights, browser extension) | Import words from reading sessions automatically |
| Premium tier | Advanced AI features, priority sync, extended statistics |
| Widget support (iOS/Android) | "Word of the day" or "cards due" on home screen |

---

## Appendix: Key Decisions Log

| Decision | Rationale | Date |
|---|---|---|
| Expo Router over Next.js + Expo monorepo | Single codebase, no SEO needed, simpler maintenance | 2026-05-18 |
| SQLite over remote API for dictionary | Offline-first is non-negotiable for a study app | 2026-05-18 |
| FSRS over SM-2 | Empirically better retention with fewer reviews | 2026-05-18 |
| Bundled DB over first-run download | Instant usability, no first-launch friction | 2026-05-18 |
| Conjugation engine over stored forms | Smaller DB, consistent generation, easier to extend | 2026-05-18 |
| NativeWind over styled-components | Tailwind DX, cross-platform, strong community | 2026-05-18 |
| Supabase over custom backend | Auth + PostgreSQL + JS client in one service; free tier sufficient for MVP; schema mirrors local SQLite user tables | 2026-05-18 |
