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

Last updated: 10/09/26
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
- [FEATURE] Choose a light, dark, or device-matching theme.
- [FEATURE] Choose whether readings appear as furigana or romaji throughout the app.
- [FEATURE] Runs on Android, iOS and the web from one app.
- [FEATURE] Android beta installs directly from a link and updates itself over the air.
- [BUG FIX] Going back from a word, kanji or list page now returns to the screen you came from, instead of the Dictionary home.
- [BUG FIX] Opening a list no longer briefly shows the previous list's words.
- [BUG FIX] Reopening a kanji page starts at the top rather than where you last scrolled to.
- [BUG FIX] Tab bar labels now sit clear of the system navigation bar and the home indicator.
- [BUG FIX] JLPT lists on the Lists screen show their real word and kanji counts instead of 0.
- [BUG FIX] Moving between screens no longer flashes a light frame or a loading spinner; each page arrives with its frame already drawn.
- [BUG FIX] Naming a new list no longer hides the field behind the keyboard or the Android navigation bar.
- [UPDATED] New lists are named in a floating card in the upper part of the screen, with the keyboard opening straight away; it stays clear of the keyboard and closes on Cancel, hardware back, or a tap outside it.
- [UPDATED] Word and kanji pages open full-screen over the tabs; the tab bar is hidden while reading one.
- [UPDATED] Pages slide in from the right on Android as they do on iOS.
- [UPDATED] New app icon: a gold star on navy, with 日本語 and 辞書.
