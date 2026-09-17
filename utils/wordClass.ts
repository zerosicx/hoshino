/**
 * Classifies an entry from its JMdict part-of-speech tags.
 *
 * The tags arrive already expanded from XML entities, so what the database
 * holds is `Godan verb with 'ru' ending` rather than `v5r`. That is why
 * `entries.conjugation_class` is null for every row, the build script looks
 * up the short codes, which never arrive.
 */

import type { Sense } from "@/types/dictionary";

export type WordClass =
  | "godan-u"
  | "godan-ku"
  | "godan-gu"
  | "godan-su"
  | "godan-tsu"
  | "godan-nu"
  | "godan-bu"
  | "godan-mu"
  | "godan-ru"
  | "godan-iku"
  | "ichidan"
  | "suru"
  | "kuru"
  | "i-adjective"
  | "i-adjective-ii"
  | "na-adjective";

export type Transitivity = "transitive" | "intransitive";

export interface WordClassInfo {
  wordClass: WordClass;
  /** Full description, e.g. "Godan verb ending in る". */
  label: string;
  /** The textbook grouping a learner will recognise: "u-verb", "ru-verb". */
  group: string | null;
  transitivity: Transitivity | null;
}

const POS_TO_CLASS: Record<string, WordClass> = {
  "Godan verb with 'u' ending": "godan-u",
  "Godan verb with 'u' ending (special class)": "godan-u",
  "Godan verb with 'ku' ending": "godan-ku",
  "Godan verb with 'gu' ending": "godan-gu",
  "Godan verb with 'su' ending": "godan-su",
  "Godan verb with 'tsu' ending": "godan-tsu",
  "Godan verb with 'nu' ending": "godan-nu",
  "Godan verb with 'bu' ending": "godan-bu",
  "Godan verb with 'mu' ending": "godan-mu",
  "Godan verb with 'ru' ending": "godan-ru",
  "Godan verb with 'ru' ending (irregular verb)": "godan-ru",
  "Godan verb - -aru special class": "godan-ru",
  "Godan verb - Iku/Yuku special class": "godan-iku",
  "Ichidan verb": "ichidan",
  "Ichidan verb - kureru special class": "ichidan",
  "Ichidan verb - zuru verb (alternative form of -jiru verbs)": "ichidan",
  "Kuru verb - special class": "kuru",
  "suru verb - included": "suru",
  "suru verb - special class": "suru",
  "noun or participle which takes the aux. verb suru": "suru",
  "su verb - precursor to the modern suru": "suru",
  "adjective (keiyoushi)": "i-adjective",
  "adjective (keiyoushi) - yoi/ii class": "i-adjective-ii",
  "adjectival nouns or quasi-adjectives (keiyodoshi)": "na-adjective",
};

const CLASS_LABELS: Record<WordClass, { label: string; group: string | null }> =
  {
    "godan-u": { label: "Godan verb ending in う", group: "u-verb" },
    "godan-ku": { label: "Godan verb ending in く", group: "u-verb" },
    "godan-gu": { label: "Godan verb ending in ぐ", group: "u-verb" },
    "godan-su": { label: "Godan verb ending in す", group: "u-verb" },
    "godan-tsu": { label: "Godan verb ending in つ", group: "u-verb" },
    "godan-nu": { label: "Godan verb ending in ぬ", group: "u-verb" },
    "godan-bu": { label: "Godan verb ending in ぶ", group: "u-verb" },
    "godan-mu": { label: "Godan verb ending in む", group: "u-verb" },
    "godan-ru": { label: "Godan verb ending in る", group: "u-verb" },
    "godan-iku": { label: "Godan verb, 行く class", group: "u-verb" },
    ichidan: { label: "Ichidan verb", group: "ru-verb" },
    suru: { label: "Suru verb", group: "irregular" },
    kuru: { label: "Kuru verb", group: "irregular" },
    "i-adjective": { label: "i-adjective", group: null },
    "i-adjective-ii": { label: "i-adjective, いい class", group: null },
    "na-adjective": { label: "na-adjective", group: null },
  };

export function classifySenses(senses: Sense[]): WordClassInfo | null {
  let wordClass: WordClass | null = null;
  let transitivity: Transitivity | null = null;

  for (const sense of senses) {
    for (const pos of sense.pos) {
      if (!wordClass && POS_TO_CLASS[pos]) wordClass = POS_TO_CLASS[pos];
      if (!transitivity && pos === "transitive verb") transitivity = "transitive";
      if (!transitivity && pos === "intransitive verb")
        transitivity = "intransitive";
    }
  }

  if (!wordClass) return null;

  const { label, group } = CLASS_LABELS[wordClass];
  return { wordClass, label, group, transitivity };
}