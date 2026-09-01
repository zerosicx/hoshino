# Changelog

Notable changes to Hoshino, newest first.

## Unreleased

### The dictionary is no longer copied on every launch

`importDatabaseFromAssetAsync` ran with `forceOverwrite: true`, so all 98MB was
copied out of the app bundle every cold start. It cost seconds of startup and a
second 98MB on disk, for a file that only changes when the app is updated.

The copy now happens on first launch and after a dictionary rebuild, keyed on
the asset's MD5. The marker is written only once the schema check has passed, so
an interrupted copy or a file deleted underneath the app is re-imported next
launch rather than trusted forever. A build whose hash cannot be read copies, on
the grounds that slow beats stale.

### Lists

Words can now be collected into lists. The plus button on a word page opens a
picker showing your lists most-recently-added-to first, with a New list option
that creates one and adds the word in a single step. On a search result, a
rightward swipe reveals a plus and drops the word into whichever list you used
last; if you have no lists yet, the swipe opens the creation drawer instead of
failing. Every add reports itself with a toast naming both the word and the
list, and says the same on failure so it is clear which add did not happen.

The main Lists screen shows starred lists first, then Searched Terms, then the
rest by how recently they were added to. "Recently edited" is derived at read
time from the newest item's timestamp, falling back to the creation date for an
empty list, so it cannot fall out of step with the items the way a stored
`updated_at` could.

The ten JLPT lists live behind a JLPT section rather than filling the main
screen, and starring one pins it alongside your own lists. They store no rows in
`list_items`: their contents come from `jlpt_level`, which is already on both
`entries` and `kanji`. That keeps ~9,700 rows out of the user database and means
the kanji lists work despite `list_items` holding entry ids, which kanji do not
have.

The item counts shown for those lists are now read from the database. The
previous screen hardcoded them, and while the five vocabulary figures were
right, every kanji figure was wrong — N5 claimed 180 against an actual 79, and
N1 claimed 847 against an actual 1,232.

`lists` gained a `starred` column. Because `CREATE TABLE IF NOT EXISTS` leaves
an existing database alone, a migration step adds the column to user databases
an earlier build already created. The schema moved to `services/schema.ts` so
tests can build the same tables in plain SQLite, which is what lets the ordering
rules be tested against real queries rather than a reimplementation of them.

### The theme setting now actually changes the theme

Picking Light while the device was in Dark produced white Japanese text on a
white background. It was only visible on Android because that device was the
one set to dark at the OS level; the iOS simulator happened to agree with the
app, which hid the bug.

The app had two independent ideas of "dark". Every screen computed its own
`isDark` from the settings store, and used it for inline colours and for
conditional class strings. NativeWind resolved every `dark:` class from its own
colour scheme, which follows the device unless told otherwise, and nothing ever
told it. So the screen background came out light while `dark:text-zinc-50` on
the furigana stayed near-white.

`hooks/useTheme.ts` now pushes the setting into NativeWind and reads the
resolved answer back, so the two cannot drift apart. The seven screens that
each repeated the same two-line computation now call the hook instead.

`tailwind.config.js` also sets `darkMode: "class"`. NativeWind's web runtime
throws outright on a manual colour-scheme change while dark mode is `"media"`,
which is the default, so web would have broken the moment the fix worked
everywhere else.

### Romaji reading mode

`readingMode` was saved and had a settings toggle, but nothing read it —
furigana showed in kana no matter which option was picked. Readings above kanji
now follow the setting, in the hero, in example sentences and in the
conjugation table.

`kanaToRomaji` in `utils/japanese.ts` does the conversion in Hepburn: 食(た),
きって → kitte, まっちゃ → matcha, しんゆう → shin'yuu, コーヒー → koohii.
Search result rows follow the setting too. Their reading stays visible under
"none" though, because there it is the thing telling two spellings apart rather
than a ruby gloss.

### Dependency ranges match what is installed

`expo` was declared as `~54.0.0` and `expo-router` as `~6.0.23` while
`node_modules` held 54.0.37 and 6.0.24, which is what produced the version
warning on every `expo start`. `expo install --check` tightened the ranges; no
package actually changed version.

### Conjugation tables, word class, and furigana on every example

Word detail now shows a full conjugation table. For 食べる that means 食べた,
食べない, 食べなかった, 食べます, 食べました, 食べませんでした, 食べよう,
食べられる, 食べられない and 食べようとした, grouped as plain, polite, te-form
and conditional, potential, passive and causative, volitional and imperative,
and desire. Verbs, i-adjectives and na-adjectives are all covered, including
する, 来る, the 行く te-form exception, and the いい/よい split.

The hero now says what kind of word it is: transitivity, and the verb class
under both names a textbook might use — "Ichidan verb · ru-verb". Godan and
u-verb are the same fact, so they share one badge rather than looking like two.

**None of this needed the database rebuild the roadmap assumed.** The part-of-
speech tags on `senses` already hold `Ichidan verb` and `transitive verb`, so
`utils/wordClass.ts` reads them at runtime. `entries.conjugation_class` is
still null on all 217,783 rows — `detectConjugationClass` looks up JMdict short
codes like `v5r`, but `fast-xml-parser` expands the XML entities before the
build script sees them, so the lookup never matches. That column is now simply
unused rather than blocking.

Conjugation rules only ever rewrite the okurigana at the end of a word, which
is always kana. The same rule therefore applies unchanged to the kanji
spelling and to the reading, so each form carries both and the reading can be
shown alongside it.

**Example sentences now carry furigana without expanding anything.** Tatoeba's
token data records the dictionary form of each word, not how it is inflected in
the sentence, so matching whole words only reached 78% of kanji. Matching kanji
runs instead — 戻る tells you 戻 is もど, which is all 戻ります needs — reaches
98.7%, with 97.1% of sentences fully annotated. Kanji with no known reading are
left bare rather than guessed.

`utils/furigana.ts` also replaces the placeholder alignment that put one
reading over a whole word: 食べる now renders 食(た)べる rather than
食べる(たべる).

### Search finds conjugated verbs, kana and romaji — and ranks the right word first

Measured against a 45-query benchmark whose expected answers were taken from
jisho.org, search went from **16/45 to 45/45** correct top results.

Two separate faults were doing the damage.

**Nothing distinguished an exact match from an incidental one.** Everything went
into one pool ordered by `rank - (is_common * 15) - jlptBonus`, where `rank` is
FTS5's BM25 score. BM25 divides by document length, and in a dictionary the
indexed document is the word's full set of meanings — so the more useful a word
is, the more senses it has, and the harder BM25 punishes it. Searching 水
returned 水曜日 ("Wednesday", one sense, 103 characters) above 水 ("water", five
senses, 565 characters). Searching `eat` put the honorific 召し上がる above 食べる,
losing by 0.18 of a point.

Ranking is now banded, in `services/searchQuery.ts`: an exact form match scores
above any gloss match, a gloss match scores by which sense and which gloss it
landed in, and `is_common` and `jlpt_level` only break ties inside a band. They
can no longer promote an unrelated entry over a real match.

**Conjugated input returned nothing at all.** 食べます, 食べた, 見ました and 買わない
each returned zero results, because the default `unicode61` tokenizer makes a
whole Japanese word a single token and matching was prefix-anchored, so any
change to the tail of a word stopped matching. `utils/deinflect.ts` now maps a
conjugated form back to candidate dictionary forms. The rules are deliberately
over-generous — 飲み yields both 飲みる and 飲む — because the dictionary itself is
the filter, which keeps the rule table small enough to read.

Also new: katakana input folds to hiragana (タベル finds 食べる), and romaji
converts before matching (`taberu`, `tabemasu`, `arigatou`). Romaji is Hepburn
only; accepting wapuro spellings like `ti` is what makes jisho.org answer `time`
with 血眼 (ちめ, "bloodshot eyes").

The slowest query in the suite runs in under 4ms.

### Tests

Vitest, run with `npm test`. The ranking benchmark opens `assets/hoshino.db`
directly through `better-sqlite3` rather than booting Expo, and skips when the
database is absent. It has to use the real 217k-entry dictionary: BM25 scores
depend on corpus-wide statistics, so a small fixture would rank differently and
prove nothing.

`services/searchRobustness.test.ts` holds a second set of queries that were
never used for tuning, so the benchmark score can be checked for overfitting.

### Dictionary now works on web

The dictionary could not be opened on web at all. Every query failed with
`SQLITE_CANTOPEN` (error 14). There were two independent causes, and because
each one masked the other, fixing either alone still failed — with a different
error, which made every partial fix look like a wrong turn.

**FTS5 was missing from expo-sqlite's WebAssembly build.** Its compile options
list only `ENABLE_BATCH_ATOMIC_WRITE`, `ENABLE_PREUPDATE_HOOK` and
`ENABLE_SESSION`, and the binary contains no fts5 symbols. A SQLite build
without that module cannot read a schema declaring
`CREATE VIRTUAL TABLE ... USING fts5`, so no amount of tuning file size, OPFS
state or available memory would ever have helped. Web now serves the dictionary
from `@sqlite.org/sqlite-wasm`, which ships FTS5 plus the unicode61, trigram,
porter and ascii tokenizers. Native is untouched — expo-sqlite compiles FTS5 in
there via `SQLITE_ENABLE_FTS5`.

**The database was built in WAL mode.** WAL is recorded in the file header and
requires a real file plus shared memory, which no browser VFS provides.
`scripts/build-dictionary.ts` now finalises with `journal_mode = DELETE`, and a
runtime guard rejects a WAL image with an actionable message instead of an
opaque error code.

Both failures surfaced at the *first query* rather than at open, because SQLite
opens files lazily. That is why every step of initialisation reported success
right up to the failure, and why step-by-step timing revealed nothing.

### Dictionary cached in OPFS, off the main thread

sqlite runs in a dedicated worker (`services/dictionaryWorker.ts`) so the
dictionary can be cached in an OPFS pool. That VFS is built on
`createSyncAccessHandle()`, which the spec only exposes inside a dedicated
worker — on the main thread it throws.

Three benefits follow: the 98MB file is downloaded once per browser rather than
on every load; reading through a VFS keeps it out of the WASM heap, since SQLite
pages in only what a query touches; and FTS5 searches no longer block the main
thread.

The cache is keyed by the asset's MD5 where the bundler provides it, so
rebuilding the dictionary evicts stale copies automatically. Web dev builds have
no asset hash and Metro's dev server sends neither ETag nor Last-Modified, so
they fall back to keying on byte length. A rebuild landing on exactly the same
size would go unnoticed there; clear `/hoshino-dictionary` in DevTools >
Application > Storage if ever suspected.

If OPFS is unavailable — an unsupported browser, or a second tab, which cannot
share the pool's exclusive file handles — it falls back to an in-memory copy and
still works.

### Bundled database halved: 198MB to 98MB

- `entries_fts` is now contentless, since the source columns already live in
  `entries`
- example sentences capped at five per entry, shortest first; Tatoeba links
  common words to hundreds, but the UI only ever shows a handful
- dropped a redundant index on `entry_examples`

### Search accuracy

Rewrote FTS5 matching to be column-aware and language-aware, and added a
composite ranking that weights `rank` against `is_common` and `jlpt_level`, so
everyday words outrank obscure ones. Ranking is still known to be weak — see
`ROADMAP.md`.

### Fixed

- `metro.config.js` assigned `config.server` instead of extending it, silently
  dropping six Expo and Metro defaults including `unstable_serverRoot`, the
  value worker bundle URLs are resolved against
- Metro's `blockList` regex `/\/scripts\/.*/` matched any path containing
  `scripts/`, which broke `react-native-reanimated` on native; now scoped to the
  project root
- tab bar was clipped on web and ignored the iOS home indicator; the app is now
  wrapped in `SafeAreaProvider` with padding derived from the real insets
- `getDatabase()` is guarded by a shared promise, so React's dev-mode double
  invocation of effects no longer starts the dictionary download twice
- `import.meta.url` cannot be used to locate the worker: `babel-preset-expo`
  rewrites it to a lookup backed by `document.currentScript`, which is null
  outside synchronous script evaluation. Uses `window.location.href` instead.
- the worker defines `globalThis.__ExpoImportMetaRegistry` itself, since Expo
  installs it from the app entry's polyfills, which a worker bundle never runs

### Changed

- Study and Lists tabs greyed out and non-navigable while the dictionary is the
  focus
- `lucide-react-native` upgraded to `^1.37.0` for React 19 support
- dropped the temporary startup diagnostics and OPFS pool inspection used to
  chase error 14; initialisation now logs one summary line, and failures are
  attributed to the step that produced them

### Known issues

- Metro's dev server logs `Cannot pipe to a closed or destroyed stream` on first
  run. This is an unpatched bug in `expo-server@1.0.6`, whose `respond()` pipes
  to the socket without checking the client is still connected. Upstream fixes
  exist (expo/expo#43305, expo/expo#48660) but are not in this version. Dev-only
  and harmless.
- Native re-copies the 98MB dictionary on every cold start, because
  `importDatabaseFromAssetAsync` is called with `forceOverwrite: true`. Removing
  it naively would leave a stale dictionary after an app update, so it needs a
  version check.
