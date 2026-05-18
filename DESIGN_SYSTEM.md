# Hoshino — Design System

> A unified design system for the Hoshino Japanese learning app.
> Covers both light and dark themes with shared tokens.
> Layout style: professional/dense — flat lists with dividers, minimal card usage, compact spacing.

---

## 1. Brand

**Name:** Hoshino (星野 — "star field")
**Logo Mark:** 星 character in a rounded square, set in Noto Sans JP Bold
**Logo Text:** "Hoshino" in Inter Bold, 22px, -0.5px letter-spacing

| Element | Light | Dark |
|---|---|---|
| Logo mark background | `--text-primary` (#1C1917) | `--accent` (#6D28D9) |
| Logo mark text | `--text-inverse` (#FFFFFF) | `--text-inverse` (#FFFFFF) |

---

## 2. Colour Palette

### 2.1 Shared Accent

The primary accent is consistent across both themes, ensuring brand recognition regardless of mode.

| Token | Value | Usage |
|---|---|---|
| `--accent` | `#6D28D9` | Primary interactive colour, active tab, furigana, links, CTA backgrounds |
| `--accent-light` | `#7C3AED` | Hover/pressed state |
| `--accent-soft` | `rgba(109,40,217, 0.08)` light / `0.15` dark | Subtle tinted backgrounds (badges, pills, icon wraps) |
| `--accent-border` | `rgba(109,40,217, 0.20)` light / `0.30` dark | Focused/hovered border tint |
| `--furigana` | `#6D28D9` light / `#8B5CF6` dark | Furigana text colour (lighter in dark mode for readability) |

### 2.2 Surface Colours

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-primary` | `#F5F2ED` | `#0E0E14` | Page/screen background |
| `--bg-secondary` | `#EDE9E3` | `#161622` | Tab bar, status bar |
| `--bg-card` | `#FFFFFF` | `#1C1C28` | Flashcard, search bar, minimal card usage |
| `--bg-elevated` | `#F0ECE6` | `#24243A` | Conjugation cells, nested surfaces |
| `--bg-input` | `#F8F6F2` | `#1C1C28` | Input field backgrounds |

### 2.3 Text Colours

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--text-primary` | `#1C1917` | `#ECEAF2` | Headings, body text, kanji |
| `--text-secondary` | `#57534E` | `#A8A4B8` | Secondary info, meanings, descriptions |
| `--text-tertiary` | `#A8A29E` | `#6B6780` | Placeholders, hints, captions |
| `--text-inverse` | `#FFFFFF` | `#FFFFFF` | Text on accent/dark backgrounds |

### 2.4 Border & Shadow

| Token | Light | Dark |
|---|---|---|
| `--border` | `#E7E5E4` | `#2A2A3C` |
| `--border-strong` | `#D6D3D1` | `#3A3A50` |
| `--divider` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | `0 1px 2px rgba(0,0,0,0.2)` |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | `0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)` |
| `--shadow-lg` | `0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | `0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)` |

Note: The `--divider` token is the primary separation mechanism in the pro layout, used between list rows, stats columns, and content sections instead of card borders.

### 2.5 JLPT Level Colours

These are semantic colours representing difficulty tiers. Each has a solid variant for text/icons and a soft variant for badge backgrounds.

| Level | Solid (Light) | Solid (Dark) | Soft (Light) | Soft (Dark) |
|---|---|---|---|---|
| N5 (Beginner) | `#16A34A` | `#5CC98E` | `rgba(22,163,74, 0.08)` | `rgba(92,201,142, 0.12)` |
| N4 (Upper Beginner) | `#2563EB` | `#60A5FA` | `rgba(37,99,235, 0.08)` | `rgba(96,165,250, 0.12)` |
| N3 (Intermediate) | `#D97706` | `#FBBF24` | `rgba(217,119,6, 0.08)` | `rgba(251,191,36, 0.12)` |
| N2 (Advanced) | `#DC2626` | `#F87171` | `rgba(220,38,38, 0.08)` | `rgba(248,113,113, 0.12)` |
| N1 (Expert) | `#7C3AED` | `#A78BFA` | `rgba(124,58,237, 0.08)` | `rgba(167,139,250, 0.12)` |

### 2.6 SRS Rating Colours

Used for the Again / Hard / Good / Easy flashcard rating buttons. These are consistent semantic colours with mode-appropriate contrast.

| Rating | Light Mode | Dark Mode |
|---|---|---|
| Again (forgot) | text: `#B91C1C`, border: `rgba(185,28,28,0.2)` | text: `#F87171`, border: `rgba(248,113,113,0.25)`, bg: `rgba(185,28,28,0.1)` |
| Hard | text: `#B45309`, border: `rgba(180,83,9,0.2)` | text: `#FBBF24`, border: `rgba(251,191,36,0.25)`, bg: `rgba(180,83,9,0.1)` |
| Good | text: `#15803D`, border: `rgba(21,128,61,0.2)` | text: `#5CC98E`, border: `rgba(92,201,142,0.25)`, bg: `rgba(21,128,61,0.1)` |
| Easy | text: `#1D4ED8`, border: `rgba(29,78,216,0.2)` | text: `#60A5FA`, border: `rgba(96,165,250,0.25)`, bg: `rgba(29,78,216,0.1)` |

---

## 3. Typography

Based on the Apple Human Interface Guidelines type scale.

### 3.1 Font Stack

```
Primary: 'Inter', -apple-system, sans-serif
Japanese: 'Noto Sans JP', sans-serif
```

Inter is used for all Latin text (UI labels, English meanings). Noto Sans JP is used for all Japanese text (kanji, kana, furigana, example sentences).

### 3.2 Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--fs-largeTitle` | 34px | 700 | Due-today count, hero numbers |
| `--fs-title1` | 28px | 700 | — reserved — |
| `--fs-title2` | 22px | 700 | Page titles (logo text), stat values |
| `--fs-title3` | 20px | 600 | — reserved — |
| `--fs-body` | 17px | 400 | Body text, search input, example sentences |
| `--fs-subhead` | 15px | 400–600 | Card titles, list names, meanings |
| `--fs-footnote` | 13px | 400–500 | Secondary text, romaji, rating labels |
| `--fs-caption` | 12px | 500–600 | Section headers, stats, list counts |
| `--fs-caption2` | 11px | 600–700 | Badges, labels, featured tag |

### 3.3 Section Headers

Body-size (`--fs-body`, 17px), semibold (600), `--text-primary`, left-aligned. No uppercase, no letter-spacing. Clean and iOS-native in feel.

```
Recently Searched    JLPT N5    Active Lists
```

---

## 4. Spacing

Built on an **8dp base grid** per Material Design 3 guidelines, with 4dp half-steps for fine adjustments.

| Token | Value | Common Usage |
|---|---|---|
| `--sp-2` | 2px | Tight inline gaps |
| `--sp-4` | 4px | Badge padding, icon-label gap in tabs |
| `--sp-8` | 8px | Card-to-card margin, small gaps |
| `--sp-12` | 12px | Inner card padding (compact), search bar padding |
| `--sp-16` | 16px | **Content margin from screen edges**, standard card padding |
| `--sp-20` | 20px | Featured card padding, detail card padding |
| `--sp-24` | 24px | Detail hero bottom padding, progress-to-card gap |
| `--sp-32` | 32px | Flashcard inner padding |
| `--sp-40` | 40px | Large flashcard padding |
| `--sp-48` | 48px | Minimum touch target height |

**Key rule:** All content has a minimum 16px margin from screen edges (`--sp-16`).

---

## 5. Border Radii

| Token | Value | Usage |
|---|---|---|
| `--r-sm` | 8px | Conjugation cells, logo mark, small chips |
| `--r-md` | 12px | Result cards, list cards, rating buttons |
| `--r-lg` | 16px | Search bar, featured card, detail cards, stats banner |
| `--r-xl` | 20px | Flashcard |
| `--r-full` | 9999px | Circular buttons, pills, badges, tab badge |

---

## 6. Touch Targets

Per Apple HIG (44pt) and Material Design 3 (48dp):

| Element | Minimum Size | Notes |
|---|---|---|
| Tab bar button | 48px height | Full tab width, flex: 1 |
| Search bar | 48px height | Comfortable text input |
| Result card | 72px height | Generous tap area for word selection |
| List card | 64px height | Accommodates icon + text + chevron |
| Rating button | 48px height | Flex: 1 width, comfortable thumb reach |
| Icon button | 40×40px | Circular, for header actions |
| Back button | 40×40px | Circular, left-aligned |

---

## 7. Furigana System

Furigana (reading hints above kanji) use an **inline-block baseline** approach rather than HTML `<ruby>` elements, which gives precise control across platforms and correct baseline alignment with surrounding text.

### 7.1 Structure

```html
<span class="ruby-group">
  <span class="furi">た</span>
  <span class="kanji-char">食</span>
</span>
```

### 7.2 CSS

```css
.ruby-group {
  display: inline-block;
  text-align: center;
  vertical-align: baseline;
  line-height: 1;
}
.ruby-group .furi {
  display: block;
  /* ... size, colour, etc. */
}
.ruby-group .kanji-char {
  display: block;
  /* ... font-family, line-height */
}
```

**Why inline-block, not inline-flex?** An `inline-block` element derives its baseline from its *last* in-flow line box — the kanji character. This means surrounding hiragana/katakana text aligns perfectly with the kanji baseline, whilst furigana floats above it without disturbing the line. `inline-flex` with `flex-direction: column` incorrectly derives its baseline from the *first* flex item (the furigana), causing kanji to sit lower than adjacent kana.

### 7.3 Size Variants

| Context | Furigana Size | Kanji Size | Class |
|---|---|---|---|
| Search results | 9–10px | 26px | (default) |
| Recently searched chips | 9px | 24px | (default) |
| Featured card | 12px | 40px | (inline override) |
| Word detail hero | 15px | 56px | `.ruby-xl` |
| Flashcard | 18px | 72px | (inline override) |

### 7.4 Rules

- Furigana always appears in `--furigana` colour (matches `--accent`)
- For kana-only characters (べ, る, etc.), use a non-breaking space `　` as the furigana to maintain vertical alignment
- Min-height is set on `.furi` so alignment holds even when furigana is empty

---

## 8. Icon System

All icons are **Lucide** (lucide.dev), rendered as inline SVGs for zero external dependencies.

### 8.1 Base Styles

```css
.icon {
  width: 24px; height: 24px;
  stroke: currentColor; stroke-width: 2;
  stroke-linecap: round; stroke-linejoin: round;
  fill: none;
}
```

### 8.2 Size Variants

| Class | Size | Usage |
|---|---|---|
| `.icon-xs` | 16px | Inline with caption text, section action buttons |
| `.icon-sm` | 18px | Chevrons, detail card titles, header icon buttons |
| `.icon` | 24px | Tab bar icons, search icon, primary actions |
| `.icon-lg` | 28px | — reserved for emphasis — |

### 8.3 Key Icons Used

| Purpose | Lucide Icon |
|---|---|
| Search | `Search` (circle + diagonal line) |
| Settings | `Settings` (gear) |
| Study tab | `GraduationCap` |
| Lists tab | `Library` |
| Back | `ChevronLeft` |
| Close/Exit session | `X` |
| Bookmark/Save | `Bookmark` |
| Add to list | `Plus` |
| Disclosure | `ChevronRight` |
| Streak | `Flame` |
| Accuracy | `Target` |
| Reviewed | `GraduationCap` |
| Refresh | `RefreshCw` |
| Star/Featured | `Star` |
| Play session | `Play` |
| Meanings | `BookOpen` |
| Examples | `MessageSquare` |
| Colloquial | `Contact` |
| Conjugations | `SquarePen` |

---

## 9. Component Patterns

### 9.1 Layout Philosophy — Flat Lists

The pro layout avoids heavy card usage. Most content sits directly on `--bg-primary` with thin `--divider` lines between rows, similar to iOS Settings or native table views. Cards are reserved only for the flashcard and the search bar.

### 9.2 List Rows

Content rows have no background, no border-radius, no shadow. They are separated by `1px solid var(--divider)` bottom borders. Hover/active state uses subtle `--accent-soft` background tint.

### 9.3 Badges

Small rounded labels for metadata. Structure: `--fs-caption2`, font-weight 600, padding `2px 8px`, border-radius 6px. Background uses the soft colour variant, text uses the solid variant.

### 9.4 Section Headers

Flex row with title left, optional action right. Title: body-size (17px), semibold, `--text-primary`. Action: `--accent` colour, `--fs-footnote`.

### 9.5 Due Pill

Used on active study list rows. `--fs-caption`, `--accent` text, `--accent-soft` background, full-radius, padding `4px 12px`.

### 9.6 Stats Row

Compact horizontal row with no card wrapper. Three stat items separated by 1px dividers. Each stat: coloured value (`--fs-title2`, bold), label below (`--fs-caption2`, tertiary). No icons — just numbers and labels for maximum density.

### 9.7 Due Today Bar

Slim 48px-high bar with `--accent` background, `--r-sm` radius. Count on the left, "Start Review" text button on the right. Replaces the larger CTA card from previous iterations.

### 9.8 Flashcard

The sole remaining card element. Full-width, min-height 400px, `--r-xl` radius, `--shadow-sm` (lighter than previous), subtle accent tint background `rgba(109,40,217, 0.02)` light / `0.04` dark. 1px border. Centred content with ruby-group word and hint at the bottom.

### 9.9 Rating Bar

Four equal-width buttons in a flex row. Each has a semantic colour (see section 2.6), `--r-md` radius, `--border` in light mode / tinted border+bg in dark mode. Shows rating label and next interval below it.

### 9.10 Featured Word (Dictionary)

No card wrapper. Large kanji on the left, meaning and metadata on the right, separated from content below by a `--divider` line.

### 9.11 Recent Searches

Horizontal scroll of plain text items (no chip styling). Each item shows kanji + meaning, separated by thin vertical dividers.

---

## 10. Navigation Structure

### 10.1 Tab Bar

Fixed to bottom, 84px total height (56px tabs + 28px safe area). Three tabs: Dictionary, Study, Lists. Active tab uses `--accent` colour, inactive uses `--text-tertiary`.

### 10.2 View Hierarchy

```
Tab: Dictionary
  └─ Search Home (recommended word, recent searches, results)
      └─ Word Detail (push, back → search)

Tab: Study
  └─ Study Landing (stats, due CTA, active lists)
      └─ Flashcard Session (push, X → study landing)

Tab: Lists
  └─ Browse Catalogue (all available lists by JLPT level)
      └─ List Detail (push, back → catalogue) [future]
```

### 10.3 Navigation Patterns

- **Tab switches** replace the view entirely, preserving no sub-view state
- **Push transitions** (detail, session) overlay the parent and show a back/close button
- **X (close)** returns to the parent tab landing, not the previous tab
- **"Browse All"** on Study landing navigates to the Lists tab

---

## 11. Accessibility

### 11.1 Contrast

All text/background combinations must meet WCAG AA (4.5:1 for normal text, 3:1 for large text). The accent `#6D28D9` against light `--bg-primary` (#F5F2ED) achieves ~5.8:1 contrast. In dark mode, furigana uses the lighter `#8B5CF6` for adequate contrast against dark surfaces.

### 11.2 Touch Targets

No interactive element may be smaller than 44×44px (Apple HIG). Rating buttons, tab buttons, cards, and icon buttons all meet or exceed this.

### 11.3 Text Scaling

All font sizes are specified in px for prototyping but should use `rem` in production to respect system accessibility settings. The type scale is designed so that 1.5× scaling remains usable.

### 11.4 Screen Readers

All interactive elements must have accessible labels. SVG icons should include `aria-hidden="true"` when paired with visible text, or `aria-label` when standalone.

### 11.5 Motion

The flashcard flip animation and card press scale should respect `prefers-reduced-motion`. When reduced motion is preferred, use instant transitions instead.

---

## 12. Implementation Notes (NativeWind)

When implementing in Expo with NativeWind, these design tokens map to a Tailwind config:

```js
// tailwind.config.js (sketch)
module.exports = {
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#6D28D9', light: '#7C3AED' },
        surface: {
          primary: 'var(--bg-primary)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
        },
        jlpt: {
          n5: '#16A34A', n4: '#2563EB', n3: '#D97706',
          n2: '#DC2626', n1: '#7C3AED',
        },
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '16px', xl: '20px',
      },
      fontSize: {
        caption2: '11px', caption: '12px', footnote: '13px',
        subhead: '15px', body: '17px', title3: '20px',
        title2: '22px', title1: '28px', largeTitle: '34px',
      },
    },
  },
};
```

Light/dark mode switching uses NativeWind's `dark:` variant, toggling the surface, text, border, and shadow tokens. The accent colour remains constant.
