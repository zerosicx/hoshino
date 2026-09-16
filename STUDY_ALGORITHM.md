# Hoshino — How the flashcards work

The design record for the study system: what the problem was, what the
well-known systems do, what we decided, and how it is built. Written 17/09/26
from two investigations — an audit of the code as it shipped in build 14, and
a survey of Anki, FSRS, ts-fsrs 4.7.1, WaniKani, Memrise and Duolingo — and
Hannah's account of using build 9 for a week. `ARCHITECTURE.md` "Study" holds
the shorter engineering summary; this is the long version, kept for the story.

---

## 1. The problem, in Hannah's words

Settings: cards per session 10.

- A session is always 10 cards. Rate one Again and it comes back once. Rate
  one Hard and, within the hour, the Study tab says it is due again.
- Come back to review those, and the session pads itself to 10 with words
  never seen, so a review turns into learning.
- The bar says "6 cards ready → Start Review", the session says "1 / 10".
- Nothing tells you how well you know a word, and the "Accuracy" figure falls
  every time you are honest and press Again or Hard, which makes you not want
  to press them.

What she expected instead:

- A daily budget of new words (10), separate from how many cards a session
  may show. Finish the budget and you may keep learning if you choose.
- Within a session, a card keeps coming back — Again most often, Good once
  more, Easy done — until you can answer Easy. Mastery is built over days:
  a word learned today returns tomorrow to make sure.
- Focused review: due cards only, no new words, per list and overall.
- The pile is whatever mastery demands, but capped per session so a missed
  week never becomes a 200-card wall.

She asked whether this matches Anki. It does, almost exactly — see §3.

---

## 2. What the code did (audit of build 14)

**A session was a fixed pile.** `buildSession` took the `sessionSize` most
at-risk due cards, then filled the remainder with never-seen words. A mixed
session was therefore always `min(size, due + new)` cards, and every entry
point — the bar, a list row, a list's Study button — ran a mixed session.
"6 cards ready" counted due cards; the session then added 4 new ones.

**A rating was already right; the session ignored it.** `scheduler.ts` wraps
ts-fsrs with short-term scheduling on. A new card rated Again is due in one
minute, Hard five, Good ten; only Easy leaves the minute scale (16 days). A
Learning card rated Good graduates to Review, in days. That is precisely
"Again most often, Good once more, Easy done." But the session showed each
card once, re-queued an Again once, and ended at the pile size. The cards
left in Learning were due in minutes, so ten minutes later the landing said
they were "ready", and the next session padded them with new words.

**Review-only existed only under one condition.** A footnote link under the
bar, shown only when `0 < due < sessionSize` — so never with 10 or more due,
and nowhere per list. Build 9 had no link at all.

**Accuracy** was `Good + Easy` over all ratings that day. Hard counted as
wrong, and on a day of new words the figure was dominated by first-sight
guesses. It measured nothing about any word.

**Mastery** existed in code (`stability ≥ 30` days) and appeared only in a
list row's summary line. The card, the session and the list page did not
show it.

---

## 3. What the established systems do

### Anki (SM-2 or FSRS)

- **Learning steps** (default 1m, 10m). Good moves a new card to the next
  step and graduates it after the last; Again returns it to the first step;
  Easy graduates at once with a 4-day interval. Learning cards are due in
  minutes and so **return within the same session**, in due order, shown up
  to 20 minutes early if nothing else is left (the "learn-ahead limit"). A
  session ends when no card is due within that window.
- **Two daily limits.** "New cards/day" (default 20) counts *introductions*;
  "Maximum reviews/day" (default 200) counts review cards shown. Both are
  counters that decrement through the day across sessions. Learning re-shows
  count against neither. Reviews beyond the cap stay due and carry over —
  the backlog.
- **The deck screen** shows three numbers: New, Learn, Due. Each rating
  button shows the interval it would give.

### FSRS, and ts-fsrs 4.7.1 exactly

FSRS keeps three quantities per card: **stability** (days until recall
probability falls to 90%), **difficulty** (1–10), and **retrievability**
(probability of recall right now). The next interval is when retrievability
would fall to the target retention, 90% by default. Measured on the installed
library with default parameters:

| From | Again | Hard | Good | Easy |
|---|---|---|---|---|
| New | Learning, +1 min | Learning, +5 min | Learning, +10 min | **Review, +16 d** |
| Learning (after New→Good) | Learning, +5 min | Learning, +10 min | **Review, +4 d** | Review, +7 d |
| Review (4 d, on time) | **Relearning, +5 min** | Review, +7 d | Review, +14 d | Review, +34 d |
| Relearning | Relearning, +5 min | Relearning, +10 min | Review, +2 d | Review, +3 d |

Consecutive Good from new: 10 min → 4 days → 14 days → 44 days. A late
review is not punished: the 4-day card reviewed 8 days late and recalled
gets 29 days, not 14. Fuzz only spreads intervals of 2.5 days or more; it
never touches the minute steps. There are no configurable learning steps in
this version; the minutes are hard-coded.

FSRS has no terminal state. "Mastered" has to be a stability threshold.

### Others

**WaniKani** gives every item a nine-rung ladder (Apprentice 1–4, Guru 1–2,
Master, Enlightened, Burned) with a name the learner can say out loud, keeps
Lessons (new) and Reviews (due) as separate counts everywhere, and caps
lessons per day. **Memrise** grows a seed into a flower and "waters" it.
**Duolingo** showed a four-bar word strength, then hid it and moved review
into a Practice Hub — a deliberate retreat from visible backlog. The common
pattern: separate new from due, a small named ladder per item, and never a
mountain of overdue.

---

## 4. Decisions

1. **Keep ts-fsrs, unmodified, with short-term scheduling on.** Its per-card
   behaviour is already the one Hannah described. The work is in the session
   layer around it.
2. **Two settings, two meanings.** *New words per day* (default 10): how many
   never-seen words may be introduced today, across all lists, counted as they
   are first shown. *Cards per session* (default 20): the most distinct cards
   one session may hold. Re-shows within a session count against neither.
3. **A session runs until its cards are settled, not until a count is hit.**
   A card is done for the session when the library moves it to Review
   (New→Easy, Learning→Good or Easy, Relearning→Good or Easy) or when it has
   been shown four times, in which case it stays in Learning for tomorrow.
   Otherwise it comes back, ordered by due time with a minimum gap of three
   other cards (two when fewer than four remain, none when it is alone), and
   shown early rather than making anyone wait for a nine-minute timer.
4. **Three session modes.** *Mixed* (the default): due cards, then new words
   up to today's remaining budget, capped at the session size. *Review*: due
   cards only. *Learn more*: new words beyond today's budget, for the learner
   who has finished and wants to go on. Review-only is offered wherever a
   session starts — the bar, each list row, each list's page — whenever
   anything is due.
5. **Honest counts, no backlog.** The bar says what the session will contain:
   "6 due · 4 new". A due count is capped at the session size on every
   surface; the learner is never shown 200.
6. **A five-rung mastery ladder from stability**, named so it can be said:
   New (never seen) · Learning (in the minute loop, or stability under a
   day) · Familiar (1–7 days) · Known (7–30 days) · Mastered (30 days and
   up). Shown on the card, on list rows, and on the list page per word.
7. **No accuracy figure.** The banner shows Day streak · Learned today (new
   words that graduated) · Reviewed today. The session ends on "8 of 10 new
   words learned · 12 reviews · 2 still learning, back tomorrow". Pressing
   Again is how the system learns what you do not know; nothing on screen
   should make it feel like losing.

---

## 5. How it is built

- **Schema.** `study_stats` gains `cards_new` (introductions) and
  `cards_learned` (graduations to Review) per day, via `MIGRATIONS`. No
  change to `srs_cards`: state and stability already carry everything.
- **`buildSession(listIds, { mode, sessionSize, newBudget })`** returns due
  cards (including Learning cards due within a 20-minute learn-ahead window,
  so an exited session's loop resumes) ordered by risk, then new words up to
  the smaller of the remaining session room and the remaining daily budget
  (unlimited by budget in *learn* mode).
- **`services/sessionQueue.ts`** is the pure in-session scheduler: a queue of
  cards with due times and show counts, `next()` under the gap rule,
  `settle(card, result)` deciding done / back / capped. Unit-tested without
  a database.
- **`rateCard`** records, in the same transaction as the card write, an
  introduction when the card had no row and a graduation when the state
  crossed into Review.
- **`stageOf(card)`** in `scheduler.ts` maps a card to the five rungs; a
  `MasteryBadge` shows it.
- **Screens.** The bar and its two actions; a Review button on each active
  list row; Study and Review on a list page; the session header shows the
  mode and "settled N of M"; the end screen shows the three-part summary.
  Settings gains New words per day and keeps Cards per session with its
  meaning made explicit.

Everything measurable is tested: the transition table against the real
library, the queue rule as a pure function, the budget and the daily
counters against SQLite, and the screens under Jest.
