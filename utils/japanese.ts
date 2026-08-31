/** Script detection and script conversion for search input. */

const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KATAKANA_OFFSET = KATAKANA_START - HIRAGANA_START;

export function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

export function toHiragana(text: string): string {
  return text.replace(/[\u30A1-\u30F6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - KATAKANA_OFFSET)
  );
}

export function toKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + KATAKANA_OFFSET)
  );
}

function isKana(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= HIRAGANA_START && code <= HIRAGANA_END) ||
    (code >= KATAKANA_START && code <= KATAKANA_END)
  );
}

export function isKanaOnly(text: string): boolean {
  return text.length > 0 && [...text].every(isKana);
}

// ---------------------------------------------------------------------------
// Romaji
// ---------------------------------------------------------------------------

/**
 * Hepburn only. Wapuro spellings such as `ti`, `tu`, `si` and `hu` are
 * deliberately excluded: they turn ordinary English words into kana, which is
 * how jisho.org ends up answering "time" with 血眼 (ちめ, "bloodshot eyes").
 */
const ROMAJI: Record<string, string> = {
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", shi: "し",
  ja: "じゃ", ju: "じゅ", jo: "じょ", ji: "じ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", chi: "ち",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  tsu: "つ", fu: "ふ",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", su: "す", se: "せ", so: "そ",
  za: "ざ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", te: "て", to: "と",
  da: "だ", de: "で", do: "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を",
  a: "あ", i: "い", u: "う", e: "え", o: "お",
};

const MAX_ROMAJI_LEN = 3;

/**
 * Converts romaji to hiragana, or returns null if the text is not romaji.
 *
 * Returning null for anything that does not convert cleanly is what keeps
 * English words out of the Japanese side of the search.
 */
export function romajiToHiragana(text: string): string | null {
  const source = text.toLowerCase();
  if (!/^[a-z']+$/.test(source)) return null;

  let out = "";
  let i = 0;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    // Doubled consonant marks a small tsu: "kitte" -> きって
    if (char === next && char !== "n" && /[a-z]/.test(char)) {
      out += "っ";
      i += 1;
      continue;
    }

    // A lone "n" before a consonant, an apostrophe, or the end of the word
    if (char === "n" && (next === undefined || next === "'" || !"aiueoy".includes(next))) {
      out += "ん";
      i += next === "'" ? 2 : 1;
      continue;
    }

    let matched = false;
    for (let len = MAX_ROMAJI_LEN; len >= 1; len--) {
      const kana = ROMAJI[source.slice(i, i + len)];
      if (kana) {
        out += kana;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }

  return out;
}
