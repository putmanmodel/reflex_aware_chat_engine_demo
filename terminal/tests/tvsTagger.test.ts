import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderTag, tagText } from "../src/tvsTagger";

type DatasetRow = {
  sentence: string;
  toneSig: string;
  label: string;
};

describe("tagText dataset lookup", () => {
  it("returns confidence 1.0 and exact toneSig for block01 sentence", async () => {
    const filePath = path.resolve(__dirname, "..", "..", "data", "block01.json");
    const rows = JSON.parse(fs.readFileSync(filePath, "utf8")) as DatasetRow[];
    const sample = rows[0];

    const result = await tagText(sample.sentence);

    expect(result.confidence).toBe(1);
    expect(result.tag).toBe(sample.toneSig);
  });
});

describe("renderTag", () => {
  it("converts prefix while preserving numeric part", () => {
    expect(renderTag("¡10.041", "XX")).toBe("XX10.041");
  });
});

describe("tagText heuristic fallback", () => {
  it("classifies boundary phrase as NEG with stronger confidence", async () => {
    const result = await tagText("Please stop asking and just drop it.");
    expect(result.polarity).toBe("NEG");
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.rationale).toBe("boundary irritation cues");
  });
});
