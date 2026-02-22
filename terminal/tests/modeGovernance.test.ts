import { describe, expect, it } from "vitest";
import { applyModeGovernance, computeAdjustedReflex } from "../src/modeGovernance";

describe("applyModeGovernance", () => {
  it("dampens adjusted reflex for positive recovery", () => {
    const result = computeAdjustedReflex({
      diff: 9,
      reflexScoreRaw: 0.75,
      trend: -1.1,
      polarity: "POS",
    });

    expect(result.reflexScoreAdjusted).toBeLessThan(result.reflexScoreRaw);
  });

  it("keeps low-reflex EMPATHETIC constraints calm", () => {
    const result = applyModeGovernance({
      mode: "EMPATHETIC",
      reflexScore: 0.1,
      trend: 0,
      polarity: "UNK",
    });

    expect(result.mode).toBe("EMPATHETIC");
    expect(result.constraints).toEqual([]);
  });

  it("adds recovery constraint for PROBING when trend is negative", () => {
    const result = applyModeGovernance({
      mode: "PROBING",
      reflexScore: 0.5,
      trend: -0.6,
      polarity: "NEG",
    });

    expect(result.mode).toBe("PROBING");
    expect(result.constraints).toContain("confirm recovery, avoid re-spike");
  });

  it("always includes grounding constraint in DEESCALATE", () => {
    const result = applyModeGovernance({
      mode: "DEESCALATE",
      reflexScore: 0.9,
      trend: 1.2,
      polarity: "NEG",
    });

    expect(result.mode).toBe("DEESCALATE");
    expect(result.constraints).toContain("lower intensity, increase grounding");
  });

  it("overrides to PROBING for positive recovery during spike", () => {
    const result = applyModeGovernance({
      mode: "DEESCALATE",
      reflexScore: 0.9,
      trend: -1.2,
      polarity: "POS",
    });

    expect(result.mode).toBe("PROBING");
    expect(result.constraints).toContain("confirm recovery, avoid re-spike");
  });
});
