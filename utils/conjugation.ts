/**
 * Generates conjugated forms from a dictionary form and its word class.
 *
 * Conjugation only ever rewrites the okurigana at the end of a word, which is
 * always kana. That means the same transformation applies unchanged to the
 * kanji spelling and to the reading, so 食べる/たべる yields 食べた/たべた from
 * one rule — and the reading stays available for furigana.
 */

import type { WordClass } from "@/utils/wordClass";

export interface ConjugatedForm {
  name: string;
  /** How the form is written, e.g. 食べた. */
  written: string;
  /** How it is read, e.g. たべた. */
  reading: string;
  /** Shown under the group title when the form needs explaining. */
  hint?: string;
}

export interface ConjugationGroup {
  title: string;
  forms: ConjugatedForm[];
}

/** う-row kana to the other rows of the same consonant. */
const GODAN_ROWS: Record<string, { a: string; i: string; e: string; o: string }> =
  {
    う: { a: "わ", i: "い", e: "え", o: "お" },
    く: { a: "か", i: "き", e: "け", o: "こ" },
    ぐ: { a: "が", i: "ぎ", e: "げ", o: "ご" },
    す: { a: "さ", i: "し", e: "せ", o: "そ" },
    つ: { a: "た", i: "ち", e: "て", o: "と" },
    ぬ: { a: "な", i: "に", e: "ね", o: "の" },
    ぶ: { a: "ば", i: "び", e: "べ", o: "ぼ" },
    む: { a: "ま", i: "み", e: "め", o: "も" },
    る: { a: "ら", i: "り", e: "れ", o: "ろ" },
  };

/** て-form ending for each godan verb ending. */
const GODAN_TE: Record<string, string> = {
  う: "って", つ: "って", る: "って",
  む: "んで", ぶ: "んで", ぬ: "んで",
  く: "いて", ぐ: "いで", す: "して",
};

type Stems = {
  /** Everything before the final kana, e.g. 食べ for 食べる. */
  negative: string;
  polite: string;
  conditional: string;
  volitional: string;
  te: string;
  ta: string;
  /** Prefix used to build potential/passive/causative. */
  potential: string;
  passive: string;
  causative: string;
  imperative: string;
};

function godanStems(word: string, wordClass: WordClass): Stems {
  const body = word.slice(0, -1);
  const ending = word[word.length - 1];
  const row = GODAN_ROWS[ending];

  // 行く is the one godan verb whose て-form ignores its ending.
  const te = wordClass === "godan-iku" ? "って" : GODAN_TE[ending];

  return {
    negative: body + row.a,
    polite: body + row.i,
    conditional: body + row.e,
    volitional: `${body}${row.o}う`,
    te: body + te,
    ta: body + te.replace("て", "た").replace("で", "だ"),
    potential: `${body + row.e}る`,
    passive: `${body + row.a}れる`,
    causative: `${body + row.a}せる`,
    imperative: body + row.e,
  };
}

function ichidanStems(word: string): Stems {
  const stem = word.slice(0, -1);
  return {
    negative: stem,
    polite: stem,
    conditional: `${stem}れ`,
    volitional: `${stem}よう`,
    te: `${stem}て`,
    ta: `${stem}た`,
    potential: `${stem}られる`,
    passive: `${stem}られる`,
    causative: `${stem}させる`,
    imperative: `${stem}ろ`,
  };
}

/**
 * する and 来る change their stem vowel, so the irregular part is whatever
 * follows the prefix: 勉強する keeps 勉強, 来る keeps nothing in kana but 来 in
 * kanji. `written` and `reading` therefore need different prefixes, which is
 * why these take the prefix as an argument.
 */
function suruStems(prefix: string): Stems {
  return {
    negative: `${prefix}し`,
    polite: `${prefix}し`,
    conditional: `${prefix}すれ`,
    volitional: `${prefix}しよう`,
    te: `${prefix}して`,
    ta: `${prefix}した`,
    potential: `${prefix}できる`,
    passive: `${prefix}される`,
    causative: `${prefix}させる`,
    imperative: `${prefix}しろ`,
  };
}

function kuruStems(prefix: string, kanji: boolean): Stems {
  // 来る is read こない / きます / こよう — the kanji never changes, the kana does.
  const ko = kanji ? "来" : "こ";
  const ki = kanji ? "来" : "き";
  const ku = kanji ? "来" : "く";
  return {
    negative: prefix + ko,
    polite: prefix + ki,
    conditional: `${prefix + ku}れ`,
    volitional: `${prefix + ko}よう`,
    te: `${prefix + ki}て`,
    ta: `${prefix + ki}た`,
    potential: `${prefix + ko}られる`,
    passive: `${prefix + ko}られる`,
    causative: `${prefix + ko}させる`,
    imperative: `${prefix + ko}い`,
  };
}

function verbStems(word: string, wordClass: WordClass, kanji: boolean): Stems {
  if (wordClass === "ichidan") return ichidanStems(word);
  if (wordClass === "suru") return suruStems(suruPrefix(word));
  if (wordClass === "kuru") {
    return kuruStems(word.replace(/(来る|くる)$/, ""), kanji);
  }
  return godanStems(word, wordClass);
}

/**
 * JMdict lists 勉強 as a "noun which takes suru", so the headword has no する
 * on it. Everything before the する is the invariant part either way.
 */
function suruPrefix(word: string): string {
  return word.replace(/(する|為る)$/, "");
}

// ---------------------------------------------------------------------------
// Group builders
// ---------------------------------------------------------------------------

/**
 * Builds one form by running the same rule over the written and read spellings.
 * `build` receives the stems for whichever spelling is being produced.
 */
type FormRule = (s: Stems) => string;

function verbGroups(
  written: string,
  reading: string,
  wordClass: WordClass
): ConjugationGroup[] {
  const w = verbStems(written, wordClass, true);
  const r = verbStems(reading, wordClass, false);

  const form = (name: string, rule: FormRule, hint?: string): ConjugatedForm => ({
    name,
    written: rule(w),
    reading: rule(r),
    hint,
  });

  const dictionary: ConjugatedForm = {
    name: "Dictionary",
    written,
    reading,
  };

  return [
    {
      title: "Plain",
      forms: [
        dictionary,
        form("Past", (s) => s.ta),
        form("Negative", (s) => `${s.negative}ない`),
        form("Past negative", (s) => `${s.negative}なかった`),
      ],
    },
    {
      title: "Polite",
      forms: [
        form("Present", (s) => `${s.polite}ます`),
        form("Past", (s) => `${s.polite}ました`),
        form("Negative", (s) => `${s.polite}ません`),
        form("Past negative", (s) => `${s.polite}ませんでした`),
      ],
    },
    {
      title: "Te-form and conditional",
      forms: [
        form("Te-form", (s) => s.te),
        form("Negative te", (s) => `${s.negative}なくて`),
        form("Conditional ば", (s) => `${s.conditional}ば`),
        form("Conditional たら", (s) => `${s.ta}ら`),
      ],
    },
    {
      title: "Potential",
      forms: [
        form("Can do", (s) => s.potential),
        form("Cannot do", (s) => `${s.potential.slice(0, -1)}ない`),
        form("Polite", (s) => `${s.potential.slice(0, -1)}ます`),
      ],
    },
    {
      title: "Passive and causative",
      forms: [
        form("Passive", (s) => s.passive),
        form("Passive negative", (s) => `${s.passive.slice(0, -1)}ない`),
        form("Causative", (s) => s.causative),
        form("Causative passive", (s) => `${s.causative.slice(0, -1)}られる`),
      ],
    },
    {
      title: "Volitional and imperative",
      forms: [
        form("Volitional", (s) => s.volitional, "let's"),
        form("Volitional polite", (s) => `${s.polite}ましょう`),
        form("Tried to", (s) => `${s.volitional}とした`),
        form("Imperative", (s) => s.imperative),
        form("Prohibitive", () => `${written}な`, "don't"),
      ],
    },
    {
      title: "Desire",
      forms: [
        form("Want to", (s) => `${s.polite}たい`),
        form("Do not want to", (s) => `${s.polite}たくない`),
        form("Wanted to", (s) => `${s.polite}たかった`),
      ],
    },
  ];
}

function adjectiveGroups(
  written: string,
  reading: string,
  wordClass: WordClass
): ConjugationGroup[] {
  if (wordClass === "na-adjective") {
    const form = (name: string, suffix: string): ConjugatedForm => ({
      name,
      written: written + suffix,
      reading: reading + suffix,
    });
    return [
      {
        title: "Plain",
        forms: [
          form("Present", "だ"),
          form("Past", "だった"),
          form("Negative", "ではない"),
          form("Past negative", "ではなかった"),
        ],
      },
      {
        title: "Polite",
        forms: [
          form("Present", "です"),
          form("Past", "でした"),
          form("Negative", "ではありません"),
          form("Past negative", "ではありませんでした"),
        ],
      },
      {
        title: "Other",
        forms: [
          form("Te-form", "で"),
          form("Conditional", "なら"),
          form("Adverbial", "に"),
          form("Before a noun", "な"),
        ],
      },
    ];
  }

  // いい conjugates from よい: よかった, よくない — but stays いい in the present.
  const stem = (text: string): string =>
    wordClass === "i-adjective-ii"
      ? text.replace(/(いい|良い)$/, (m) => (m === "いい" ? "よ" : "良"))
      : text.slice(0, -1);

  const wStem = stem(written);
  const rStem = stem(reading);

  const form = (name: string, suffix: string): ConjugatedForm => ({
    name,
    written: wStem + suffix,
    reading: rStem + suffix,
  });

  return [
    {
      title: "Plain",
      forms: [
        { name: "Present", written, reading },
        form("Past", "かった"),
        form("Negative", "くない"),
        form("Past negative", "くなかった"),
      ],
    },
    {
      title: "Polite",
      forms: [
        { name: "Present", written: `${written}です`, reading: `${reading}です` },
        form("Past", "かったです"),
        form("Negative", "くないです"),
        form("Past negative", "くなかったです"),
      ],
    },
    {
      title: "Other",
      forms: [
        form("Te-form", "くて"),
        form("Conditional", "ければ"),
        form("Adverbial", "く"),
        form("Seems", "そう"),
      ],
    },
  ];
}

const ADJECTIVE_CLASSES: WordClass[] = [
  "i-adjective",
  "i-adjective-ii",
  "na-adjective",
];

/**
 * All conjugated forms for a word, grouped for display.
 * `reading` should be the kana reading of `written`; for a kana-only word pass
 * the same string twice.
 */
export function conjugate(
  written: string,
  reading: string,
  wordClass: WordClass
): ConjugationGroup[] {
  if (!written) return [];

  let read = reading || written;

  if (ADJECTIVE_CLASSES.includes(wordClass)) {
    return adjectiveGroups(written, read, wordClass);
  }

  // The dictionary form of a suru-noun is the noun plus する.
  if (wordClass === "suru") {
    written = `${suruPrefix(written)}する`;
    read = `${suruPrefix(read)}する`;
  }

  // A godan verb must end in a う-row kana for the row table to apply.
  if (wordClass.startsWith("godan") && !GODAN_ROWS[written.slice(-1)]) return [];

  return verbGroups(written, read, wordClass);
}
