# Changelog

What the app does at each version, newest first.

## Format

Git history documents individual changes; this file does not. A line is earned
here only by something that changes what the app does for the person using it.
Refactors, tests, tooling and dependency bumps live in commits alone.

A version keeps accumulating lines until the version number changes, so a fix
made after release is added to the version it was released in.

```
## v<major>.<minor>.<patch> <Adjective> <Noun>

Last updated: DD/MM/YY
Created: DD/MM/YY

Changelog:
- [FEATURE] A capability the app did not have before.
- [BUG FIX] What was broken, and what it does now.
- [UPDATED] How an existing feature changed.
```

Every version carries a two-word name — an adjective and a noun, picked at
random — so a build can be referred to by something more memorable than a number.

Rules for the lines:

- One line each, high level, in plain language.
- Describe the app, never the code. No file names, function names, library names
  or internal reasoning; that is what commits and `ARCHITECTURE.md` are for.
- `Created` is the date the version was first released, and never changes.
- `Last updated` is the date the most recent line was added.
- Only the three tags above. If something fits none of them, it does not belong.

---

## v0.1.0 Happy Fruit

Last updated: 17/09/26
Created: 03/09/26

Changelog:

- [FEATURE] Full Japanese-English dictionary covering 217,000 words and 13,000 kanji, working entirely offline with no account required.
- [FEATURE] Search by kanji, kana, romaji or English and get the word you meant first.
- [FEATURE] Search recognises conjugated verbs and adjectives, so an inflected form finds its dictionary entry.
- [FEATURE] Word pages show meanings, part of speech, JLPT level and how common the word is.
- [FEATURE] Full conjugation tables for verbs and both kinds of adjective, covering plain, polite, te-form, potential, passive, causative, volitional, imperative and conditional forms.
- [FEATURE] Example sentences for a word, with readings shown above the kanji.
- [FEATURE] Kanji pages show meanings, on and kun readings, stroke count, JLPT level and the most common words using that character.
- [FEATURE] Ten built-in JLPT lists covering the vocabulary and kanji for levels N5 to N1.
- [FEATURE] A Searched Terms list that collects every word looked up, counting how often each one was needed.
- [FEATURE] Custom lists you can create, name and fill with words.
- [FEATURE] Add a word to a list from its page, or by swiping it right in the search results.
- [FEATURE] Remove a word from a list by swiping it left, or by tapping the list again in the picker.
- [FEATURE] Star a list to pin it to the top of the Lists screen.
- [FEATURE] Delete a list you made from its page, after confirming by name; its words and study progress go with it.
- [FEATURE] Choose a light, dark, or device-matching theme.
- [FEATURE] Choose whether readings appear as furigana or romaji throughout the app.
- [FEATURE] Runs on Android, iOS and the web from one app.
- [FEATURE] Android beta installs directly from a link and updates itself over the air.
- [FEATURE] Study any list as flashcards: tap Study on a list's page, turn each card over, and rate it Again, Hard, Good or Easy. Each button shows how long until you would see the word again.
- [FEATURE] Spaced repetition decides when each word comes back, so words you know well appear less often and words you keep missing appear sooner.
- [FEATURE] The Study tab shows your day streak and today's counts, with a bar to start a session on everything that is ready.
- [FEATURE] A session never holds more than a set number of cards (20, adjustable in Settings) however many days you missed, so a break never comes back as a mountain.
- [FEATURE] Mark a word as already known from the card's corner menu to take it out of study; restore known words from the list's page.
- [FEATURE] Study a JLPT vocabulary list and it becomes a list of your own, with its progress kept there.
- [FEATURE] Choose whether the front of the card shows the Japanese or the meaning.
- [FEATURE] Reduce animations in Settings if the card flip is uncomfortable; the card then turns over instantly.
- [FEATURE] Read a text: paste any Japanese into the Dictionary tab and read it with the readings shown above the kanji; tap any word to open its entry, and it joins your Searched Terms like a search would.
- [FEATURE] Words you have looked up before are underlined in the reader, so you can see what you have met.
- [FEATURE] Tap a word the dictionary does not recognise in the reader to search for it instead.
- [FEATURE] Your pasted text stays in the reader until you replace it, and the Dictionary tab offers to continue reading it.
- [FEATURE] Review only: when some cards are due, a link under the study bar runs through just those, with no new words added.
- [FEATURE] "See all" on Recently Searched opens the Searched Terms list.
- [FEATURE] A daily budget of new words, set in Settings (10 a day to start), separate from how many cards one session may show; once the day's new words are done the Study tab says so and offers to learn more if you want to keep going.
- [FEATURE] A word you get wrong comes back within the same session — soonest after Again, later after Hard, later still after Good — until you know it, or until it has had four goes, in which case it returns tomorrow. The session header counts the cards you have settled.
- [FEATURE] Every word has a place on a five-rung ladder — New, Learning, Familiar, Known, Mastered — shown on the card's corner, in each list's progress, and beside each word on a list's page.
- [FEATURE] Review only from anywhere a session starts: the link under the study bar whenever anything is due, a Review button on each active list, and Review beside Study on a list's page.
- [FEATURE] A list's page shows how far you have come with it, under the word count.
- [UPDATED] The study bar says exactly what the session will hold, such as "6 due · 4 new", and the session ends on a summary like "8 of 10 new words learned · 12 reviews · 2 still learning, back tomorrow".
- [UPDATED] The Study tab's banner shows your day streak, the words you learned today and the cards you reviewed today; the accuracy figure is gone, so being honest with Again never costs you anything on screen.
- [UPDATED] A session picks up any words still being learned from an earlier session that day, so leaving mid-way loses nothing.
- [BUG FIX] The interval shown under a rating button is now the interval you get; the two could previously differ by a day or so.
- [BUG FIX] The study bar no longer pushes its button off the screen when nothing is due; it now says so, with an action that fits.
- [BUG FIX] Going back from a word, kanji or list page now returns to the screen you came from, instead of the Dictionary home.
- [BUG FIX] Opening a list no longer briefly shows the previous list's words.
- [BUG FIX] Reopening a kanji page starts at the top rather than where you last scrolled to.
- [BUG FIX] Tab bar labels now sit clear of the system navigation bar and the home indicator.
- [BUG FIX] JLPT lists on the Lists screen show their real word and kanji counts instead of 0.
- [BUG FIX] Moving between screens no longer flashes a light frame or a loading spinner; each page arrives with its frame already drawn.
- [BUG FIX] Naming a new list no longer hides the field behind the keyboard or the Android navigation bar.
- [BUG FIX] Example sentences on a word page are separated by a divider with even spacing, in step with the rest of the page.
- [BUG FIX] Readings now sit over the right kanji in words like 痛い, 五つ and 言い訳, instead of spanning the whole word or landing on the wrong character.
- [BUG FIX] Kanji in JLPT lists no longer stretch to odd sizes on the last row.
- [BUG FIX] Going back from a list you have just created returns to the Lists screen in one step, instead of the Dictionary.
- [UPDATED] Words made only of kanji, like 学校 or 図書館, show a reading over each kanji rather than one reading across the whole word.
- [UPDATED] JLPT kanji lists show one kanji per row with its meanings, readings and level, matching the word lists.
- [UPDATED] New lists are named in a floating card in the upper part of the screen, with the keyboard opening straight away; it stays clear of the keyboard and closes on Cancel, hardware back, or a tap outside it.
- [UPDATED] Word and kanji pages open full-screen over the tabs; the tab bar is hidden while reading one.
- [UPDATED] Pages slide in from the right on Android as they do on iOS.
- [UPDATED] New app icon: a gold star on navy, with 日本語 and 辞書.
