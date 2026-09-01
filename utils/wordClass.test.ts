import { describe, expect, it } from "vitest";
import { classifySenses } from "@/utils/wordClass";
import type { Sense } from "@/types/dictionary";

function senses(...pos: string[][]): Sense[] {
  return pos.map((p) => ({ glosses: [], pos: p, misc: [], info: [] }));
}

describe("classifySenses", () => {
  it("reads 食べる as a transitive ichidan verb", () => {
    const info = classifySenses(senses(["Ichidan verb", "transitive verb"]));
    expect(info).toEqual({
      wordClass: "ichidan",
      label: "Ichidan verb",
      group: "ru-verb",
      transitivity: "transitive",
    });
  });

  it("reads 飲む as a transitive godan verb", () => {
    const info = classifySenses(
      senses(["Godan verb with 'mu' ending", "transitive verb"])
    );
    expect(info?.wordClass).toBe("godan-mu");
    expect(info?.group).toBe("u-verb");
    expect(info?.transitivity).toBe("transitive");
  });

  it("reads 行く as intransitive and in the iku class", () => {
    const info = classifySenses(
      senses(["Godan verb - Iku/Yuku special class", "intransitive verb"])
    );
    expect(info?.wordClass).toBe("godan-iku");
    expect(info?.transitivity).toBe("intransitive");
  });

  it.each([
    ["Ichidan verb - kureru special class", "ichidan"],
    ["Kuru verb - special class", "kuru"],
    ["suru verb - included", "suru"],
    ["noun or participle which takes the aux. verb suru", "suru"],
    ["adjective (keiyoushi)", "i-adjective"],
    ["adjective (keiyoushi) - yoi/ii class", "i-adjective-ii"],
    ["adjectival nouns or quasi-adjectives (keiyodoshi)", "na-adjective"],
    ["Godan verb with 'ru' ending (irregular verb)", "godan-ru"],
  ])("maps %s", (pos, expected) => {
    expect(classifySenses(senses([pos]))?.wordClass).toBe(expected);
  });

  it("finds transitivity on a later sense", () => {
    const info = classifySenses(
      senses(["Ichidan verb"], ["Ichidan verb", "intransitive verb"])
    );
    expect(info?.transitivity).toBe("intransitive");
  });

  it("returns null for a plain noun", () => {
    expect(classifySenses(senses(["noun (common) (futsuumeishi)"]))).toBeNull();
  });

  it("returns null when there are no senses", () => {
    expect(classifySenses([])).toBeNull();
  });
});
