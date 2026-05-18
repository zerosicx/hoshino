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
  - **Stats banner**: day streak (consecutive days studied), accuracy (Good + Easy hit rate), and cards reviewed today
  - **Due Today CTA**: a prominent accent-coloured card showing total cards due across all active lists, tapping starts a combined review session
  - **Active lists**: lists that have study progress (any cards in learning, review, or mastered state), each showing name, progress bar, mastered/learning/new counts, and a due pill badge
  - A "Browse All" link navigating to the Lists tab for discovering new lists
- Tapping an active list or the Due Today CTA enters a **flashcard session**
- The session presents cards in order of SRS priority: overdue cards first, then new cards
- Each card displays the **front** (kanji with furigana, or English meaning — configurable)
- Tapping/swiping reveals the **back**: full word detail (meaning, readings, example sentence)
- After viewing the back, the user rates recall with four buttons:
  - **Again** — completely forgot; reschedule for very soon
  - **Hard** — struggled significantly; shorter interval
  - **Good** — remembered with some effort; standard interval
  - **Easy** — instant recall; longer interval
- Each rating button displays the next scheduled interval (e.g., "<1m", "6m", "10m", "4d")
- The FSRS algorithm calculates the next review date based on the rating
- The session shows a progress bar and count (e.g., "7 / 20")
- Users can exit a session early via the X button, which returns to the Study landing; progress is saved
- Card flip animation is smooth and satisfying (react-native-reanimated)

#### FR-06: Study Progress & Statistics
- Each active list on the Study landing shows: total cards, mastered count, learning count, new count, due count, and a visual progress bar
- A card is considered "mastered" when its FSRS stability exceeds a threshold (e.g., interval > 30 days)
- The stats banner tracks:
  - **Day streak**: consecutive days with at least one review session (persisted in `study_stats` table)
  - **Accuracy**: percentage of cards rated Good or Easy (computed from daily stats)
  - **Reviewed today**: total cards reviewed in the current day
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
