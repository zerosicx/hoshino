# Bug Triage — v0.1.0 Happy Fruit

Tracking document for the beta bugs. It spans sessions: when a fix lands, mark
it **Landed**; once Hannah has tested it on device, mark it ✅.

Twelve reports from the Android beta (Samsung Galaxy S25 Ultra, 3-button
navigation) and the iOS simulator. Four read-only investigations root-caused
every item against the actual code and, where possible, the real database.

**The headline:** five reports — B1, B8, B10, B12 and (by file) B2 — share one
root cause. Every detail screen is registered as a hidden *tab* (`href: null`)
in the single `Tabs` navigator. There is no stack anywhere below the root. So
`router.push` is silently rewritten to a tab jump, `router.back()` uses the tab
router's history whose default lands on the first tab (Dictionary), and a screen
that is already mounted is *reused* with new params rather than remounted. Two
investigators reached this independently from different bugs.

| ID | Report | Verdict | Workstream | Status |
|---|---|---|---|---|
| B1 | Back goes to Dictionary root | Bug — navigator architecture | A | ✅ |
| B2 | Tab bar hard to see | Bug — content abuts the system bar | A || ✅ |
| B3 | Starred JLPT list shows 0 items | Bug — proven in SQL | A′ || ✅ |
| B4 | Create-list drawer under keyboard | Bug — one line | D | Landed |
| B5 | Examples too far apart | Bug — unsupported NativeWind variant | C | Landed |
| B6 | Furigana misaligned on hero | Bug — proven on 980 real words | C | Landed |
| B7 | Black-and-white redesign | **Dropped from scope** — see below | — | — |
| B8 | Random crash opening JLPT pages | Bug — symptom of B1's root cause | A + B | Landed |
| B9 | Startup loading state | **Deferred** — see below | — | — |
| B10 | Kanji page keeps scrolling | Bug — symptom of B1's root cause | A | Landed |
| B11 | Kanji as rows, not grid | Bug — flex behaviour | B | Landed |
| B12 | Old list state flashes | Bug — symptom of B1's root cause | A | Landed |
| B13 | Every transition flashes | Bug — found testing M1; three causes | A′ || ✅ |
| B14 | Android: popped page goes white as it slides out | Known react-native-screens fault on the new architecture; Expo Go only | A′ | ✅ Not in the dev build — Expo Go artefact, no code change |
| B15 | Back from a new list goes to Dictionary | Bug — found testing M2; reproduced in Jest | 2′ | Landed |
| B16 | Kanji-only words show one reading over the whole word | Bug — found testing M2; no per-kanji split existed | 2′ | Landed |
| B17 | No way to delete a list | Missing feature, requested testing M2 | 2′ | Landed |

---

## Decisions made

1. **Word and kanji detail live in the root stack**, pushed over the tabs, so
   back always returns to the exact previous screen from any tab. No duplicate
   routes per surface. **Accepted limitation:** the tab bar is hidden while on
   a detail page. Hannah's position is that the tab bar should be visible on
   every screen so the app can be navigated with the least friction; this is
   accepted for now and recorded in `ROADMAP.md` as deferred polish.
2. **B7 (redesign) is out of scope.** "Mino" is one of Hannah's own unpublished
   apps. Dropped entirely from this plan.
3. **B2 is device-informed.** 3-button navigation reports a ~48dp bottom inset,
   so the "tiny inset" hypothesis does not apply; the real fault is `max()`
   semantics — see the deep dive.
4. **B9 is deferred.** Hannah sees the purple spinner today and would rather
   replace it with a proper animation later than patch it now. The hidden
   fault the investigation found is recorded under "Deferred" so it is not lost.

---

## Execution order

Two milestones. Each ends in a build Hannah tests with the short steps under
"Test plan" before the next starts.

### Milestone 1 — Navigation foundation (Workstream A, one agent)

| ID | Bug | Root cause | Solution | Status |
|---|---|---|---|---|
| B1 | Back goes to Dictionary root from every page | No stack exists; `back()` hits `TabRouter` history whose `firstRoute` default is always Dictionary | Per-tab `Stack` layouts for tab-internal screens; word and kanji detail moved to the root stack | Landed |
| B12 | Old list flashes before new one loads | `lists/[id]` is one permanently mounted instance; `loading` only starts `true` on first mount | Fixed by the restructure — each push is a fresh instance. No hook or store change | Landed |
| B10 | Kanji page reopens mid-scroll | Same instance reused when revisiting the *same* kanji; its `ScrollView` keeps its offset. Layout is clean | Fixed by the restructure. No layout change | Landed |
| B8 | Crash opening JLPT pages (trigger half) | Reused `lists/[id]` swaps `FlatList numColumns` 5 ↔ undefined when the list type changes; RN 0.81 throws. Never on the first list after cold start — matching the report | Restructure removes the reuse; B11 (Milestone 2) removes `numColumns` entirely | Landed |
| B2 | Tab bar hard to see | `paddingBottom = max(inset, 8)` uses the system bar's height *as* the padding, so labels sit directly on the 3-button bar with no gap | `paddingBottom = inset + 8`; drop the fixed `height` so a scaled label cannot clip — *dropping the height was wrong; reversed in Milestone 1′* | Landed |

**Why this goes first and alone.** It changes how every screen mounts, and four
bugs hinge on it. If anything regresses, it was this and nothing else.

### Milestone 1′ — What device testing of M1 turned up (one agent, one commit each)

Hannah's first pass on the S25 (Expo Go, SDK 54) confirmed B1 and found three
things. Fixed before Milestone 2 because they set the feel of every screen.

| ID | Bug | Root cause | Solution | Status |
|---|---|---|---|---|
| B2 | Tab bar labels cut in half | M1 removed our `height` but React Navigation then sizes the bar at `49 + inset` regardless, so our `inset + 8` padding was taken out of the 49 — 35dp for a 24dp icon and a label | Explicit `height = 56 + paddingBottom`. Padding is added *on top of* the content, never out of it || ✅ |
| B3 | Started JLPT list shows "0 words" | As below — pulled forward because Hannah hit it | Service fills `itemCount` for JLPT rows; `count` prop and `jlpt.tsx` override deleted || ✅ |
| B14 | Android: popped page turns white as it slides away | On the new architecture React tears the popped screen's views down leaf-first, before react-native-screens flags the screen as leaving, so the exit animation slides an empty card (react-native-screens #1685, open since 2023). Every report since Jan 2026 says it shows in Expo Go only; dev and production builds are clean | None needed. Confirmed clean on a dev-client build of the S25 (09/09/26); Expo Go is no longer the Android dev loop | ✅ |
| B13 | Flash on every push and pop | Three stacked causes: (a) Expo Router gives every navigator React Navigation's *light* theme, so `#F2F2F2` shows under each screen until its own background paints — a bright frame in dark mode; (b) detail screens rendered a centred spinner then swapped to content, which M1's fresh-mount-per-visit made visible on every navigation; (c) Android's default stack animation is the short system activity transition, which exposes the first paint | (a) `NavigationThemeProvider` with the app's surface colours around the root stack; (b) detail screens paint their frame — background and Back — on the first frame and fill the body in, no spinner; (c) `slide_from_right` on every stack via one shared `stackScreenOptions` || ✅ |

### Milestone 2 — Parallel sweep (Workstreams B, C, D — three agents, disjoint files)

**Workstream B — Lists data**

| ID | Bug | Root cause | Solution | Status |
|---|---|---|---|---|
| B3 | Starred JLPT list shows 0 items | Pulled forward into Milestone 1′ | — || ✅ |
| B11 | Kanji cells grow on a short last row | Each cell is `flex-1` in a 5-column row; 1232 mod 5 = 2, so the last two share the full width. Bordered cards also contradict the design system's flat rows | New `KanjiResultRow` mirroring `DictionaryResultRow`; single-column `FlatList`. Also closes B8 permanently | Landed |
| B8 | Crash (fix half) | See Milestone 1 | With B11 landed there is no `numColumns` to change | Landed |

**Workstream C — Dictionary detail**

| ID | Bug | Root cause | Solution | Status |
|---|---|---|---|---|
| B6 | Furigana over the wrong kanji | `alignFurigana` anchors each kana run at its *first* occurrence in the reading; when the okurigana also appears inside the kanji's reading the split lands early. 709 words fall back to one reading over the whole word (痛い, 可愛い, 五つ, 疑う); 271 silently attach the reading to the wrong kanji (言い訳) | Two rules, ~8 lines in `utils/furigana.ts`. Re-audited on landing over all 176,688 written forms: wrong-kanji 271 → 0; whole-word fallbacks 1345 → 869 counting full-width digits and letters as anchors (what remains is that class — １月, Ｘ線 — unanchorable by nature). All 8 existing tests unchanged; sentence coverage 98.7% → 98.8% | Landed |
| B5 | Examples too far apart | `last:border-b-0` is unsupported by NativeWind and compiles to an *unconditional* rule, so every divider is removed and each gap is 32px of blank space | `components/ExampleSentences.tsx` owns the section; `exampleRowClass(i, count)` gives every row but the last `pb-3 mb-3 border-b`. It has a Jest test of its own, since Jest has no compiled CSS to read a class back from a render | Landed |

**Workstream D — App shell**

| ID | Bug | Root cause | Solution | Status |
|---|---|---|---|---|
| B4 | Drawer hidden by keyboard | `KeyboardAvoidingView` gets `behavior={undefined}` on Android, relying on the window resizing. SDK 54 defaults to edge-to-edge, under which the Modal's window is not resized. Same regression fixed upstream in react-native-paper the same way. *Device testing of the one-line fix then showed two more Modal-window faults — see the deep dive* | Create-list is no longer a Modal at all: `app/create-list.tsx` is a `transparentModal` route in the root stack rendering `CreateListDialog`, a floating card. `BottomDrawer` keeps `behavior="padding"` for the list picker | Landed |

**Why these run in parallel.** B touches `services/lists.ts`, `listQuery.ts`,
`lists/*.tsx`, `ListRow.tsx`. C touches `utils/furigana.ts`, `app/word/[id].tsx`
(moved there by Milestone 1). D touches `BottomDrawer.tsx`. No file appears
twice. Each lands as its own commit.

### Milestone 2′ — What device testing of M2 turned up (one agent, one commit each)

| ID | Bug | Root cause | Solution | Status |
|---|---|---|---|---|
| B15 | Back from a just-created list lands on Dictionary; several backs to reach Lists | `create-list` closed with `router.back()` then `router.push('/lists/<id>')`. The push ran before the back had applied, so Expo Router saw the dialog as the focused route and pushed a *second* `(tabs)` onto the root stack with the list inside it. Back from the list fell to that copy's first tab | One call: `router.dismissTo('/lists/<id>')` pops the dialog and opens the list inside the Lists stack that is already there. `tests/createList.test.tsx` now uses the real Tabs layout — the stubbed Stack could not reproduce this — and asserts one `(tabs)` and back → `/lists` | Landed |
| B16 | 日本語 shows にほんご centred over three kanji | `alignFurigana` only splits at kana; a run of two or more kanji is one pair. No per-kanji furigana data exists in the bundle | `splitKanjiRun` in `utils/furigana.ts` matches the KANJIDIC readings of each kanji against the run's reading, allowing rendaku after the first kanji (新聞 しん\|ぶん) and a doubled final consonant before the next (学校 がっ\|こう), longest first. Audited over all 142,992 multi-kanji runs: 132,792 (92.9%) split exactly, 6 ambiguous (longest-first picks the conventional one). Jukujikun (大人) and irregulars (日本's に) are refused and keep one reading — a one-wildcard fallback was tried and produced visibly wrong splits (真面目 → ま\|じ\|め). `getEntry` returns `entry.furigana` already split, as `getExamples` does for sentences | Landed |
| B17 | No way to delete a list | Never built | Trash icon on a custom list's page → `confirmDestructive` (native `Alert`; `window.confirm` on web, where `Alert.alert` is an empty function) → `deleteList` runs `DELETE_LIST_SQL` in one transaction over `srs_cards`, `list_items`, `lists` → back to Lists. The SQL is guarded by `type = 'custom'`, so built-ins cannot go. A confirm as a `transparentModal` route was tried first and rejected: `dismissTo('/lists')` from a root dialog pushes a second `index` into the Lists stack | Landed |

---

## Deferred

**B9 — Startup loading state.** Hannah wants a proper loading animation rather
than a patched spinner; parked until that's worth doing. Two things to carry
forward when it is:

- **Hidden fault found by the investigation, not reported by Hannah:** nobody
  calls `SplashScreen.hideAsync`. Expo Router hides the splash when a navigator
  mounts. The `dbError` branch in `app/_layout.tsx` mounts no navigator, so if
  the database ever fails to open on a device the splash stays up forever and
  the error message can never be seen. Fix is small: own the splash lifecycle
  with `preventAutoHideAsync` at module scope and `hideAsync` on ready *or*
  error. Worth pulling forward on its own if a tester ever reports a hang.
- **Discrepancy to reconcile:** the same reasoning predicts the pre-ready
  spinner is never visible on native (the splash covers it), yet Hannah sees
  the purple spinner on device. Establish which build (release APK vs dev
  client) shows what before designing the replacement.

**Tab bar hidden on detail pages.** Accepted consequence of Decision 1. Hannah
wants it visible everywhere eventually. Recorded in `ROADMAP.md`.

**Romaji on lone small kana.** A lone っ or ょ column has nothing to attach to
in romaji mode and echoes itself (三つ → `miっ`). Found under B6, not part of it.

**Splash colour.** `app.json` splash is `#0F0F14`, not `--bg-primary`, and has
no light variant. Native rebuild; not this round.

## Dropped

**B7 — Redesign.** Out of scope for this version. For the record: 53
hardcoded hex colours across 17 files plus `tailwind.config.js` tokens, and
`DESIGN_SYSTEM.md` §2.5 already disagrees with the config on the JLPT palette.
Whenever a palette change does happen, route every inline colour through one
`colors.ts` first.

---

## Rules every implementing agent works under

- Owns only the files listed for its workstream. Anything else is a question
  back to the coordinator, not an edit.
- Nobody touches `CHANGELOG.md`. The coordinator adds `[BUG FIX]` / `[UPDATED]`
  lines at each milestone commit under v0.1.0.
- TDD: failing test first, in Vitest (`*.test.ts`) for pure functions and SQL,
  in Jest (`*.test.tsx`) for anything that renders. Prove the test can fail.
- No new libraries.
- Follow `AGENTS.md` layer rules. One existing violation gets fixed in passing:
  `DictionaryResultRow` calls `router.push` itself. Components emit events;
  screens navigate.
- `npx tsc --noEmit` and `npm test` green before reporting done. Agents do not
  commit; the coordinator does.

---

## Test plan — what Hannah does at each milestone

Each step is one thing to tap and one thing to look for.

**After Milestone 1**

| Bug | Steps | Pass when |
|---|---|---|
| B1 | Dictionary → search 食べる → tap it → back | Your search results, not an empty search |
| B1 | Lists → JLPT → back | The Lists screen |
| B1 | Lists → any list → tap a word → back | The list |
| B1 | Any word page → tap a kanji → back → back | Word page, then wherever you started |
| B1 | Android hardware back from any of the above | Same as the on-screen back |
| B8 | Lists → N5 Vocabulary → back → N5 Kanji → back → N5 Vocabulary | No crash, five times in a row |
| B12 | Open Searched Terms → back → open N1 Vocabulary | No flash of the old list's words |
| B10 | Open a kanji, scroll to the bottom, back, open the *same* kanji | Opens at the top |
| B2 | Look at the tab bar on the S25 and the iOS simulator | Clear gap between the labels and the system buttons / home indicator |
| — | On a word page, tap the Dictionary tab area — there is none | Confirms the accepted limitation looks acceptable |

**After Milestone 1′** (S25 dev build, both themes) — all passed 09/09/26 ✅

| Bug | Steps | Pass when |
|---|---|---|
| B2 | Look at the tab bar, light and dark | Whole labels visible, clear gap above the 3-button bar |
| B3 | Lists → JLPT → star N5 Vocabulary → back | Main Lists row says 634 words, same as the JLPT screen |
| B13 | Dark mode: Lists → JLPT → N1 Kanji → any kanji → back → back → back | No light frame at any point |
| B13 | Any list, word or kanji page | Back button is there immediately; no centred spinner; content fills in under it |
| B13 | Push and pop anywhere on Android | Screen slides in from the right and out to the right, every time |
| B14 | S25 **dev-client build**, not Expo Go: open a word, then a kanji from it; back, back | Each page slides away with its content still on it — never a blank white page. If it is blank here too, B14 reopens as a code change |
| — | iOS simulator: swipe from the left edge on a word page | Interactive back gesture works and follows the finger |

**After Milestone 2**

| Bug | Steps | Pass when |
|---|---|---|
| B11 | Lists → JLPT → N1 Kanji | Rows, all the same height, scroll to the bottom |
| B6 | Search 痛い, 可愛い, 五つ, 言い訳, 疑う | Reading sits over the kanji only; い / つ / け have nothing above them |
| B6 | Settings → Romaji, repeat | Same alignment with romaji |
| B5 | Any word with 3+ examples | Thin divider between examples, roughly half the previous gap |
| B4 | Lists → + | Keyboard opens by itself; the card floats in the upper part of the screen, clear of the keyboard, with Cancel and Create visible |
| B4 | Word page → + → New list; Dictionary → swipe a result right with no custom lists yet | Same card; after Create the word is in the new list and you are back where you started |
| B4 | Lists → + → hardware back / tap the dimmed area | Card closes, Lists screen unchanged |

**After Milestone 2′**

| Bug | Steps | Pass when |
|---|---|---|
| B15 | Lists → + → name → Create → Back | One tap lands on Lists, with the new list in it |
| B16 | Search 日本語, 学校, 図書館, 新聞, 出発 | One reading over each kanji: に·ほん·ご stays whole (irregular), がっ·こう, と·しょ·かん, しん·ぶん, しゅっ·ぱつ split |
| B16 | Search 大人, 今日 | Still one reading over the pair — never a wrong split |
| B16 | Settings → Romaji, repeat | Same splits in romaji |
| B17 | Open a custom list → trash icon → Cancel | Nothing changes |
| B17 | Same → Delete | Back on Lists; the list is gone; its words are untouched in any other list |
| B17 | Open Searched Terms, then any JLPT list | No trash icon |

---

## Deep dives

### B1 — Back navigation

Every screen under `app/(tabs)/` is a direct child of one `Tabs` navigator.
The four detail pages are registered as hidden tabs:

```54:77:app/(tabs)/_layout.tsx
      <Tabs.Screen
        name="dictionary/[id]"
        options={{
          href: null,
        }}
      />
```

Three library behaviours follow. Expo Router downgrades `push` when the target
is not a stack (`expo-router/build/global-state/routing.js:232`). React
Navigation's `TabRouter` defaults to `backBehavior: 'firstRoute'`, so history
is always `[routes[0], current]` and `GO_BACK` lands on `dictionary/index`.
And a tab route with unchanged `getId` keeps its key, so the same component
instance receives new params instead of a fresh mount.

Every back affordance calls `router.back()` (`lists/[id].tsx:70`,
`lists/jlpt.tsx:43`, `dictionary/[id].tsx:143`, `kanji/[char].tsx:53,88`,
`study/session.tsx:9`). All are correct calls hitting a navigator that cannot
honour them. Once stacks exist, `push` becomes a real push and `back` a real
pop.

Structure (Decision 1):

```
app/
  _layout.tsx              Stack: (tabs), word/[id], kanji/[char]
  (tabs)/
    _layout.tsx            Tabs: dictionary, lists, settings, study(hidden)
    dictionary/_layout.tsx Stack        dictionary/index.tsx
    lists/_layout.tsx      Stack        lists/index.tsx, jlpt.tsx, [id].tsx
    study/_layout.tsx      Stack        study/index.tsx, session.tsx
    settings/index.tsx
  word/[id].tsx            moved from (tabs)/dictionary/[id].tsx
  kanji/[char].tsx         moved from (tabs)/dictionary/kanji/[char].tsx
```

Verified gotchas: tab press does *not* reset a stack by default (good — tab
position is preserved). Tapping the *active* tab while deep in its stack may
push a duplicate `index` via the tab button's `Link`; verify on device, and
add a `tabPress` → `popToTop` listener only if it reproduces. Typed routes
regenerate, so run `expo start` once before `tsc`.

Test: `expo-router/testing-library` ships `renderRouter` and
`toHavePathname`. Stub the screens (the real ones hit SQLite), push
`/lists/5`, back, assert `/lists`; same for JLPT and word detail.

### B2 — Tab bar visibility

```11:24:app/(tabs)/_layout.tsx
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 4 : 8);
```

Edge-to-edge is on (SDK 54 default; `app.json` does not opt out), so
`insets.bottom` is the real system bar height: ~48dp for the S25's 3-button
bar, 34pt for the iOS home indicator. `max(inset, 8)` then makes the padding
*equal* to the inset — the tab content ends exactly where the system bar
begins, with zero breathing room. That is the cramped look reported. The
earlier "tiny inset" hypothesis would have applied to a gesture-nav Samsung
with the hint bar off; it does not apply to this device.

Fix: `paddingBottom = insets.bottom + 8` (web keeps 4, it has no inset).

**Correction after device testing.** The first pass also removed the fixed
`height` on the claim that "our `tabBarStyle` overrides React Navigation
entirely, so we own the maths." That was wrong. `tabBarStyle` is spread last,
but the bar's *height* is computed separately:

```140:150:node_modules/@react-navigation/bottom-tabs/src/views/BottomTabBar.tsx
  if (typeof customHeight === 'number') {
    return customHeight;
  }

  const inset = insets[tabBarPosition === 'top' ? 'top' : 'bottom'];

  if (isCompact({ state, descriptors, dimensions })) {
    return TABBAR_HEIGHT_UIKIT_COMPACT + inset;
  }

  return TABBAR_HEIGHT_UIKIT + inset;
```

With no height of our own the bar was `49 + 48 = 97dp`, our padding was
`48 + 8 + 6 = 62dp`, and the icon and label had 35dp — so the label was cut in
half. More padding would have made it worse. The fix is the opposite of the
first pass: `height = TAB_BAR_CONTENT_HEIGHT (56) + paddingBottom`, so padding
is added on top of the content instead of eating into it. Both constants are
exported from the layout and asserted by the Jest test, so the relationship
cannot silently break again.

### B3 — Starred JLPT list shows 0

```22:24:services/listQuery.ts
const ITEM_COUNT = `
  (SELECT COUNT(*) FROM list_items WHERE list_items.list_id = lists.id)
`;
```

JLPT lists hold nothing in `list_items` by design (`ARCHITECTURE.md`, "JLPT
lists are a query, not stored rows"). `jlpt.tsx:20-37` patches around this by
calling `getJlptCounts()` and overriding `ListRow`'s `count` prop;
`lists/index.tsx:103-110` passes no `count`, so `ListRow.tsx:21` falls back to
`list.itemCount` = 0. Reproduced by seeding the schema in memory, starring
N1 Kanji, and running `visibleListsSql()`: `item_count 0`.

The fix cannot be SQL — `list_items` and `entries` live in different database
files (and on web the dictionary is a WASM worker). It belongs in
`services/lists.ts`: every reader fills `itemCount` for JLPT rows from
`getJlptCounts()` when any JLPT row is present. The pure mapper
`toSummary(row, counts)` goes in `listQuery.ts` so Vitest can reach it without
expo-sqlite — that file's stated purpose. Then delete the workaround in
`jlpt.tsx` and the `count` prop on `ListRow`. Real counts from the database:
vocab 634 / 602 / 1613 / 1682 / 3014; kanji 79 / 166 / 367 / 367 / 1232.

### B13 — Every transition flashes

Reported by Hannah after testing M1: "extremely clear and noticeable" flashing
between lists, back, and detail pages. Three independent causes, all fixed.

**(a) The navigator's own colour.** Expo Router's container defaults to
React Navigation's light theme and nothing in the app overrode it:

```33:33:node_modules/expo-router/build/fork/NavigationContainer.js
function NavigationContainerInner({ direction = react_native_1.I18nManager.getConstants().isRTL ? 'rtl' : 'ltr', theme = native_1.DefaultTheme, linking, fallback = null, documentTitle, onReady, onStateChange, ...rest }, ref) {
```

So every stack card and tab scene was `#F2F2F2` until the screen's own
`bg-zinc-950` / `bg-white` View painted over it. In dark mode that is a bright
frame on every push and pop. `components/NavigationThemeProvider.tsx` wraps
the root stack in a theme whose `background` and `card` are the app's surface
tokens, following `isDark` from `useTheme`. One place, all navigators.

**(b) Spinner then content.** `lists/[id]`, `word/[id]` and `kanji/[char]`
each returned a centred `ActivityIndicator` while loading, then swapped to the
full layout. Before M1 the reused screen instance hid this on revisits; after
M1 every push is a fresh mount, so the swap showed on every navigation. Local
SQLite reads finish in tens of milliseconds — too fast for a spinner to be
anything but a flash. Each screen now paints its frame (background, Back,
title once known) immediately and gates only the body and the empty / not-found
text on `loading`.

**(c) The transition itself.** Android's `default` native-stack animation is
the system activity transition, which is short and lets the incoming screen's
first paint show. `constants/navigation.ts` exports one `stackScreenOptions`,
used by the root stack and all three tab stacks.

**iOS keeps `default`.** The first pass set `animation: 'slide_from_right'`
on both platforms. iOS already slides from the right natively, and naming the
animation is not a no-op there:

```525:528:node_modules/react-native-screens/ios/RNSScreenStackAnimator.mm
+ (BOOL)isCustomAnimation:(RNSScreenStackAnimation)animation
{
  return (animation != RNSScreenStackAnimationFlip && animation != RNSScreenStackAnimationDefault);
}
```

Anything but `default`/`flip` swaps UIKit's `UINavigationController` transition
(and its interactive swipe-back) for react-native-screens' own animator, for no
gain. So `stackAnimation('android')` is `slide_from_right` and everything else
is `default`. This was first written up as the fix for B14, on the mistaken
reading that B14 was seen on the iOS simulator. It was not; see below.

### B14 — Android: the popped page slides away white

Reported on the S25 in Expo Go after M1′: going back from a kanji or word page,
the page turns completely white as it slides out. The push looks right; only
the pop is affected.

This is react-native-screens #1685 (duplicates: #2459, expo/expo#32425),
present on the new architecture since Expo 52. The maintainers' own
diagnosis: Fabric unmounts a removed subtree *leaf-first*, so the popped
screen's children are gone before the screen itself is removed from the
stack. react-native-screens keeps a leaving screen painted by calling
`startViewTransition` on every descendant when it learns the screen is going:

```460:464:node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt
    fun startRemovalTransition() {
        if (!isBeingRemoved) {
            isBeingRemoved = true
            startTransitionRecursive(this)
        }
    }
```

If that runs after the children have already been detached there is nothing
left to keep, and the exit animation slides an empty card whose only colour is
the window background — white. It is a race, and the shipped 4.16.0 has since
been patched twice upstream for variants of it (#4161, #4444). Android's
`default` animation has the same fault; it is just a ~150ms fade, so before (c)
it read as one of the "flashes", not as a white page.

Every report on the thread since January 2026, including one on Expo 57, says
the same thing: it reproduces in **Expo Go only**, and a development or
production build of the same project is clean. A plausible mechanism — not
verified, Expo Go's native build is not inspectable from here — is that the
early-removal hook (`NativeProxy.notifyScreenRemoved`, fired from the mounting
thread before the UI-thread teardown) is not wired in Expo Go, so the flag is
set only at the very end of the batch, after the children are gone. Either
way, the deployed beta APK never drew this complaint while Expo Go does.

**Decision: verify before touching code.** The APK is what users run, so the
question is whether the APK has it. One `eas build --profile development
--platform android` gives a dev client that loads JS from `npx expo start`
exactly like Expo Go does, but with the project's own native code; it is also
the right dev loop from here on, since Expo Go is now known to misreport this
class of behaviour. If the dev build is clean, B14 closes as an Expo Go
artefact. If it is not, the candidates in order are a react-native-screens
upgrade past #4161 (native change — a new build, and a compatibility check
against SDK 54), or falling back to `fade` on Android, which hides the empty
card rather than fixing it.

### B4 — Drawer under the keyboard

```52:53:components/BottomDrawer.tsx
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
```

`undefined` renders a plain `View` — no avoidance. The author relied on
Android's `adjustResize` shrinking the Modal window. Under edge-to-edge (on by
default in SDK 54, and not disableable on targetSdk 36) the window is not
resized, so `justify-end` content stays behind the keyboard. react-native-paper
hit the identical regression in its Dialog and fixed it identically
(callstack/react-native-paper#5023). Fix: `behavior="padding"` on both
platforms; `padding` measures against the keyboard's `screenY` so it adds ~0
if the OS ever does resize. Tuning knob if the offset is a few dp out on a
device: `keyboardVerticalOffset`.

**What device testing added (10/09/26).** The padding fix worked — the drawer
rose with the keyboard — but exposed two more faults, both from the same root:
an Android `Modal` is a *separate OS window*. (1) `autoFocus`, and a second
`focus()` from `Modal.onShow`, both failed to open the keyboard on the first
open, because the input asks for focus before the dialog window is attached
and the request is dropped. (2) On first mount the drawer's bottom padding sat
partly under the 3-button bar: `useSafeAreaInsets` inside the Modal reports
the *main* window's insets, which do not describe the Modal's window.

Rather than patch a third symptom, create-list left `Modal` altogether.
`app/create-list.tsx` is a route in the root stack with
`presentation: "transparentModal"` and a fade (`dialogScreenOptions` in
`constants/navigation.ts`), so it renders in the main window like every other
screen: `autoFocus` fires normally, `KeyboardAvoidingView` measures the real
window, hardware back and a tap on the dim backdrop both pop it, and it covers
the tab bar because the root stack sits over the tabs. `CreateListDialog` is
a floating card placed with `flex: 2` above and `flex: 3` below, so it sits
two-fifths of the way down the free space (lowered from a quarter after
Hannah found the buttons a stretch one-handed) and rises as the keyboard pads
the bottom. The three callers — Lists +, the word page's list picker, and the
dictionary swipe with no lists yet — push `/create-list`, the latter two with
`entryId` and `word` so the screen adds the word itself and returns.
`AddToListDrawer` still uses `BottomDrawer`; it has no text field, so only
fault (2) can reach it — worth watching for, and the same route treatment is
the fix if it does.

**Gotcha found on the first device run: the app booted straight into the
dialog.** Listing a screen as a `<Stack.Screen>` child moves it to the front
of the navigator's route order, and on Android the launch URL arrives through
a promise that a dev client can resolve to nothing — React Navigation then
boots on the first route. With `create-list` the only listed child, that was
the dialog; before, the router's own sort put `index` first, so nobody had
noticed the mechanism. Fix: `<Stack.Screen name="index" />` is listed first
in `app/_layout.tsx`, and `tests/createList.test.tsx` asserts
`routeNames[0] === "index"` on the root stack. `unstable_settings.anchor` was
rejected: an anchor is also prepended to every deep-linked state, and `index`
is a `Redirect` that would then fire under any deep link.

### B5 — Examples too far apart

```256:258:app/(tabs)/dictionary/[id].tsx
              <View
                key={ex.id}
                className="mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/50 last:border-b-0"
```

(After Milestone 1 this file is `app/word/[id].tsx`.) Compiled through the
installed `react-native-css-interop`: its pseudo-class handler knows
`hover/active/focus/disabled/empty` only. `last-child` produces an
*unconditional* rule at higher specificity than `border-b`, so
`borderBottomWidth: 0` applies to every row. Result: no hairline, 32px gaps
(`pb-4` + `mb-4`), 52px before the next section. This is the only `first:` /
`last:` / `odd:` variant in the repo. Fix: hide the last divider by index;
`pb-3 mb-3` for 25px, the same rhythm as `DictionaryResultRow`. Extract
`ExampleSentences` so the border-by-index logic has a Jest test — the next
person to write `last:` will be caught by it.

### B6 — Furigana alignment

```101:104:utils/furigana.ts
  const at = foldedReading.indexOf(fold(next.text), cursor);
  if (at < 0) return [{ base: written, reading }];

  pairs.push({ base: segment.text, reading: reading.slice(cursor, at) });
```

`indexOf` from `cursor` finds the *first* occurrence of the okurigana in the
reading. For 痛い / いたい it finds い at position 0 — inside 痛's own reading —
so 痛 gets an empty reading, the leftover trips the length check, and the
whole word falls back to `痛い(いたい)`. For 言い訳 / いいわけ the leftover
happens to fit, so nothing trips: 言 is bare and 訳 carries いわけ. That
second class is worse because it looks aligned.

Run against every entry in `assets/hoshino.db`: 709 whole-word fallbacks with
kana anchors, 271 kanji runs with an empty reading. Two rules fix it: search
for the next anchor from `cursor + 1` (a kanji run is at least one kana), and
anchor a *trailing* kana run to the end of the reading. Prototype result:
271 → 0 and 709 → 233, the remainder unanchorable by nature. All 8 existing
`alignFurigana` tests unchanged; all 63 changed `is_common` entries correct on
inspection. Example sentences flow through the same function
(`kanjiRunReadings` → `annotateSentence`), so they improve too.

Rendering (`FuriganaText.tsx:52-71`) is correct and untouched: one column per
pair, ruby centred, bases share a baseline. In romaji mode a ruby wider than
its kanji does open a small gap before the okurigana — inherent to column
ruby and modest; not the misalignment reported.

### B8 — Crash opening JLPT pages

```122:127:app/(tabs)/lists/[id].tsx
      {list.type === "jlpt_kanji" ? (
        <FlatList
          data={kanji}
          keyExtractor={(item) => item.character}
          numColumns={5}
          columnWrapperStyle={{ paddingHorizontal: 12 }}
```

Same element type at the same tree position with no `key`, so React reuses
the `FlatList` instance. RN 0.81's `FlatList.componentDidUpdate` throws
`Changing numColumns on the fly is not supported`. In a release build an
uncaught JS exception is fatal. The instance is reused only because
`lists/[id]` is a tab screen (B1's root cause) — `reload` re-runs on the new
id, `setList` flips the type, and the live list receives `numColumns` 5 ↔
undefined. First list after cold start: fresh mount, no crash. Word → kanji or
kanji → word afterwards: crash. That is exactly the "random, but fine at
startup" reported.

Refuted: DB not ready (root layout gates on it), 1232 cells (it's virtualised;
N1 kanji payload ~424KB), missing param (handled), duplicate keys (0).

Confidence medium-high. `adb logcat | grep numColumns` while reproducing
would make it certain. Either way the restructure plus B11 removes the
trigger; if a crash survives both, we dig again.

### B10 — Kanji page scrolling

Layout is clean: `kanji/[char].tsx:79-84` is structurally identical to the
word page that scrolls fine — one `ScrollView`, no nested scrollable, no
`flex-1` in the content container. The page is short, so its only scroll range
is the `paddingBottom: 100`. What was seen is persistence: the effect that
resets the page keys on `char`, so revisiting the *same* kanji skips it and
the surviving `ScrollView` opens at its old offset. Nothing shares scroll
state across pages. The restructure gives every visit a fresh instance.

### B11 — Kanji rows

```130:132:app/(tabs)/lists/[id].tsx
            <Pressable
              onPress={() => router.push(`/dictionary/kanji/${item.character}`)}
              className={`flex-1 m-1 aspect-square items-center justify-center rounded-md border ${
```

`flex-1` shares the row width among however many cells the row has; the last
row of N1 Kanji has two, so they double in width and `aspect-square` doubles
their height. New `KanjiResultRow`: character left at `text-title2`, meanings
on one line, on/kun readings in accent, `JlptBadge`, chevron; `py-3 border-b`
like `DictionaryResultRow`. `KanjiEntry` already carries every field. 1232
rows is heavier than 247 grid rows but virtualised; set `initialNumToRender`
around 15 and confirm scroll on device.

### B12 — Old list flashes

```27:30:app/(tabs)/lists/[id].tsx
  const [list, setList] = useState<ListSummary | null>(null);
  const [entries, setEntries] = useState<SearchResult[]>([]);
  const [kanji, setKanji] = useState<KanjiEntry[]>([]);
  const [loading, setLoading] = useState(true);
```

Local state on a screen instance that is never unmounted (B1). On the second
list `loading` is already `false`, so the old name and rows render until the
new fetch resolves. The word and kanji pages do not flash because they call
`setLoading(true)` in an effect keyed on the param; this screen does not.

The lists investigator proposed a `useListDetail` hook with a cancellation
flag against out-of-order fetches. Declined: once each push is a fresh
instance, a superseded fetch belongs to an unmounted component and its
`setState` is a no-op. No store holds list-detail state (`hooks/useLists.ts`
serves only the index screen), so there is nothing to clean up. If we ever
choose *not* to restructure, the one-line fallback is
`useEffect(() => setLoading(true), [id])`.

### B15 — Back from a new list

```
Root stack (after Create, before the fix)      Root stack (after the fix)
  (tabs)                                          (tabs)
    lists: index                                    lists: index, [id]
  (tabs)   ← second copy, pushed by push()
    lists: [id]
```

`router.back()` dispatches GO_BACK, but the state it produces is committed by
React, not on the spot. `router.push('/lists/7')` on the next line therefore
computed its action from a state in which `create-list` was still focused. The
deepest navigator both routes share is the root stack, so Expo Router pushed a
whole new `(tabs)` with `lists/[id]` inside it. Back from `[id]` had nothing
under it in that copy's Lists stack, and a tab navigator's fallback is its
first tab. `router.navigate` behaves the same on React Navigation 7 (it stopped
popping to an existing route; that moved to `popTo`). `router.dismissTo` is
`popTo` on the existing `(tabs)` with the nested target as params, which is the
one call that does both halves in one committed action. Reproduced and each
alternative tried in Jest with the real Tabs layout before the change.

### B16 — One reading per kanji

The bundle has JMdict readings per *word* and KANJIDIC readings per *kanji*,
but nothing that says which part of にほんご belongs to 本. `splitKanjiRun`
derives it: for each kanji in turn, try every listed on/kun reading (kun stem
only, `-` affix marks stripped) against the reading at the cursor, plus the two
sound changes compounds actually undergo — a voiced first consonant after the
first kanji, and つ/ち/く/き doubling into っ before another kanji. Depth-first,
longest reading first; the run splits only if the whole reading is consumed.

Audit over every first written form in the dictionary: 142,992 runs of two or
more kanji; 132,792 split (92.9%); 6 have two exact splits and longest-first
picks the conventional one in each (合気道 あい|き|どう). A fallback that let
one kanji take an unlisted reading was prototyped to reach 日本 and rejected:
it produced confident wrong splits (真面目 → ま|じ|め, 座技 → すわ|りわざ). The
gold standard would be the JmdictFurigana dataset in the build pipeline; that
is a database rebuild and belongs to a later version.

### B17 — Delete a list

The obvious shape — a confirm card on a `transparentModal` route like
create-list — was tried and dropped. After the delete the dialog has to pop
*and* the list page under it has to pop, and no single router call does that
from a root-level route: `dismissTo('/lists')` reaches `popTo('(tabs)')` with
`{screen: 'lists', params: {screen: 'index'}}`, and the nested `navigate` to
`index` pushes a second one (`[index, [id], index]`). A confirm has no text
field, so none of the reasons create-list left `Modal` apply; the platform's
own dialog is the right tool, and it is what was asked for.
