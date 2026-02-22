import { describe, expect, it } from "vitest";
import { computeReflex } from "../src/reflexEngine";

describe("computeReflex", () => {
  it("uses current value as baseline when history is empty", () => {
    const result = computeReflex([], 12.3);
    expect(result.baseline).toBeCloseTo(12.3, 5);
    expect(result.nextBaseline).toBeCloseTo(12.3, 5);
    expect(result.diff).toBeCloseTo(0, 8);
    expect(result.reflexScore).toBeCloseTo(0, 8);
    expect(result.isSpike).toBe(false);
    expect(result.isHardSpike).toBe(false);
  });

  it("does not spike at diff 4.5 with fullScaleDiff 12", () => {
    const result = computeReflex([10, 10, 10, 10, 10], 14.5);
    expect(result.baseline).toBe(10);
    expect(result.diff).toBe(4.5);
    expect(result.reflexScore).toBe(0.375);
    expect(result.isSpike).toBe(false);
    expect(result.isHardSpike).toBe(false);
  });

  it("spikes at high diff and clamps to 1.0", () => {
    const result = computeReflex([10, 10, 10, 10, 10], 25);
    expect(result.diff).toBe(15);
    expect(result.reflexScore).toBe(1);
    expect(result.isSpike).toBe(true);
    expect(result.isHardSpike).toBe(true);
  });

  it("flags hard spike at threshold", () => {
    const result = computeReflex([10, 10, 10, 10, 10], 20.2);
    expect(result.reflexScore).toBeCloseTo(0.85, 5);
    expect(result.isHardSpike).toBe(true);
  });

  it("clamps reflexScore at lower and upper bounds", () => {
    const low = computeReflex([5, 5, 5], 5);
    expect(low.reflexScore).toBe(0);

    const high = computeReflex([0, 0, 0, 0, 0], 20);
    expect(high.reflexScore).toBe(1);
  });

  it("uses smoothed baseline when prevBaseline exists", () => {
    const result = computeReflex([10, 10, 10, 10, 10], 12, 5, 8);
    expect(result.baseline).toBeCloseTo(8.6, 5);
    expect(result.nextBaseline).toBeCloseTo(8.6, 5);
    expect(result.diff).toBeCloseTo(3.4, 5);
  });
});
