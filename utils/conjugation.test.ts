import { describe, expect, it } from "vitest";
import { conjugate, type ConjugationGroup } from "@/utils/conjugation";
import type { WordClass } from "@/utils/wordClass";

function formsOf(
  written: string,
  reading: string,
  wordClass: WordClass
): Record<string, string> {
  const groups: ConjugationGroup[] = conjugate(written, reading, wordClass);
  const out: Record<string, string> = {};
  for (const group of groups) {
    for (const form of group.forms) out[`${group.title} / ${form.name}`] = form.written;
  }
  return out;
}

function readingsOf(
  written: string,
  reading: string,
  wordClass: WordClass
): string[] {
  return conjugate(written, reading, wordClass).flatMap((g) =>
    g.forms.map((f) => f.reading)
  );
}

describe("ichidan verbs", () => {
  const f = formsOf("食べる", "たべる", "ichidan");

  it.each([
    ["Plain / Dictionary", "食べる"],
    ["Plain / Past", "食べた"],
    ["Plain / Negative", "食べない"],
    ["Plain / Past negative", "食べなかった"],
    ["Polite / Present", "食べます"],
    ["Polite / Past", "食べました"],
    ["Polite / Negative", "食べません"],
    ["Polite / Past negative", "食べませんでした"],
    ["Te-form and conditional / Te-form", "食べて"],
    ["Te-form and conditional / Conditional ば", "食べれば"],
    ["Te-form and conditional / Conditional たら", "食べたら"],
    ["Potential / Can do", "食べられる"],
    ["Potential / Cannot do", "食べられない"],
    ["Passive and causative / Passive", "食べられる"],
    ["Passive and causative / Causative", "食べさせる"],
    ["Passive and causative / Causative passive", "食べさせられる"],
    ["Volitional and imperative / Volitional", "食べよう"],
    ["Volitional and imperative / Tried to", "食べようとした"],
    ["Volitional and imperative / Imperative", "食べろ"],
    ["Desire / Want to", "食べたい"],
    ["Desire / Do not want to", "食べたくない"],
  ])("%s is %s", (key, expected) => {
    expect(f[key]).toBe(expected);
  });

  it("conjugates the reading in step with the spelling", () => {
    expect(readingsOf("食べる", "たべる", "ichidan")).toContain("たべました");
    expect(readingsOf("食べる", "たべる", "ichidan")).toContain("たべられる");
  });
});

describe("godan verbs", () => {
  it.each([
    ["飲む", "godan-mu", "Plain / Past", "飲んだ"],
    ["飲む", "godan-mu", "Te-form and conditional / Te-form", "飲んで"],
    ["飲む", "godan-mu", "Plain / Negative", "飲まない"],
    ["飲む", "godan-mu", "Polite / Present", "飲みます"],
    ["飲む", "godan-mu", "Potential / Can do", "飲める"],
    ["飲む", "godan-mu", "Volitional and imperative / Volitional", "飲もう"],
    ["買う", "godan-u", "Plain / Negative", "買わない"],
    ["買う", "godan-u", "Plain / Past", "買った"],
    ["買う", "godan-u", "Polite / Present", "買います"],
    ["買う", "godan-u", "Potential / Can do", "買える"],
    ["書く", "godan-ku", "Plain / Past", "書いた"],
    ["書く", "godan-ku", "Te-form and conditional / Te-form", "書いて"],
    ["泳ぐ", "godan-gu", "Plain / Past", "泳いだ"],
    ["話す", "godan-su", "Plain / Past", "話した"],
    ["待つ", "godan-tsu", "Plain / Past", "待った"],
    ["死ぬ", "godan-nu", "Plain / Past", "死んだ"],
    ["遊ぶ", "godan-bu", "Plain / Past", "遊んだ"],
    ["走る", "godan-ru", "Plain / Past", "走った"],
    ["走る", "godan-ru", "Plain / Negative", "走らない"],
    ["走る", "godan-ru", "Passive and causative / Causative", "走らせる"],
  ])("%s (%s) %s is %s", (word, wordClass, key, expected) => {
    expect(formsOf(word, word, wordClass as WordClass)[key]).toBe(expected);
  });

  it("uses the 行く exception for the te- and ta-forms", () => {
    const f = formsOf("行く", "いく", "godan-iku");
    expect(f["Plain / Past"]).toBe("行った");
    expect(f["Te-form and conditional / Te-form"]).toBe("行って");
    // Everything else still follows the く row
    expect(f["Polite / Present"]).toBe("行きます");
    expect(f["Plain / Negative"]).toBe("行かない");
  });
});

describe("irregular verbs", () => {
  it("conjugates する", () => {
    const f = formsOf("する", "する", "suru");
    expect(f["Plain / Past"]).toBe("した");
    expect(f["Plain / Negative"]).toBe("しない");
    expect(f["Polite / Present"]).toBe("します");
    expect(f["Potential / Can do"]).toBe("できる");
    expect(f["Volitional and imperative / Volitional"]).toBe("しよう");
  });

  it("conjugates a noun + する compound", () => {
    const f = formsOf("勉強する", "べんきょうする", "suru");
    expect(f["Plain / Past"]).toBe("勉強した");
    expect(f["Polite / Present"]).toBe("勉強します");
    expect(f["Plain / Negative"]).toBe("勉強しない");
  });

  it("adds する to a suru-noun headword, which JMdict stores bare", () => {
    const groups = conjugate("勉強", "べんきょう", "suru");
    const dictionary = groups[0].forms[0];
    expect(dictionary.written).toBe("勉強する");
    expect(dictionary.reading).toBe("べんきょうする");
    expect(formsOf("勉強", "べんきょう", "suru")["Polite / Present"]).toBe(
      "勉強します"
    );
  });

  it("handles 為る, the kanji spelling of する", () => {
    expect(formsOf("為る", "する", "suru")["Plain / Past"]).toBe("した");
  });

  it("conjugates 来る, changing the reading but not the kanji", () => {
    const groups = conjugate("来る", "くる", "kuru");
    const byName = new Map(
      groups.flatMap((g) => g.forms.map((f) => [`${g.title} / ${f.name}`, f]))
    );
    expect(byName.get("Plain / Negative")?.written).toBe("来ない");
    expect(byName.get("Plain / Negative")?.reading).toBe("こない");
    expect(byName.get("Polite / Present")?.written).toBe("来ます");
    expect(byName.get("Polite / Present")?.reading).toBe("きます");
    expect(byName.get("Plain / Past")?.reading).toBe("きた");
  });
});

describe("adjectives", () => {
  it("conjugates an i-adjective", () => {
    const f = formsOf("高い", "たかい", "i-adjective");
    expect(f["Plain / Past"]).toBe("高かった");
    expect(f["Plain / Negative"]).toBe("高くない");
    expect(f["Plain / Past negative"]).toBe("高くなかった");
    expect(f["Other / Te-form"]).toBe("高くて");
    expect(f["Other / Adverbial"]).toBe("高く");
  });

  it("conjugates いい from よ, not い", () => {
    const f = formsOf("いい", "いい", "i-adjective-ii");
    expect(f["Plain / Present"]).toBe("いい");
    expect(f["Plain / Past"]).toBe("よかった");
    expect(f["Plain / Negative"]).toBe("よくない");
  });

  it("conjugates a na-adjective", () => {
    const f = formsOf("静か", "しずか", "na-adjective");
    expect(f["Plain / Present"]).toBe("静かだ");
    expect(f["Plain / Past"]).toBe("静かだった");
    expect(f["Polite / Present"]).toBe("静かです");
    expect(f["Other / Before a noun"]).toBe("静かな");
  });
});

describe("guards", () => {
  it("returns nothing for an empty word", () => {
    expect(conjugate("", "", "ichidan")).toEqual([]);
  });

  it("returns nothing for a godan verb with an impossible ending", () => {
    expect(conjugate("食べ", "たべ", "godan-ru")).toEqual([]);
  });

  it("falls back to the written form when no reading is given", () => {
    const groups = conjugate("走る", "", "godan-ru");
    expect(groups[0].forms[1].reading).toBe("走った");
  });
});
