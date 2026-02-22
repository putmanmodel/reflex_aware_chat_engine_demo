import { describe, expect, it } from "vitest";
import { tagText } from "../../terminal/src/tvsTagger";
import { computeReflex } from "../reflexEngine";
import { getHint } from "../cdeHintLayer";
import { applyModeGovernance, computeAdjustedReflex } from "../modeGovernance";
import { generateReply } from "../replyGenerator";

type TurnResult = {
  modeAfterOverride: "EMPATHETIC" | "PROBING" | "DEESCALATE";
  constraints: string[];
  isHardSpike: boolean;
};

const demoInputs = [
  "I think we might need to address this soon.",
  "I am furious and everything is breaking.",
  "I am fine but not fine.",
  "Let’s slow down and take this step by step.",
  "Thanks, I appreciate the help and I feel calmer now.",
];

describe("demo script golden invariants", () => {
  it("preserves expected spike/mode transitions", async () => {
    const history: number[] = [];
    let baselineState: number | undefined;
    const turns: TurnResult[] = [];

    for (const userText of demoInputs) {
      const tagResult = await tagText(userText);
      const reflex = computeReflex(history, tagResult.scalar, 5, baselineState);
      const reflexAdjusted = computeAdjustedReflex({
        diff: reflex.diff,
        reflexScoreRaw: reflex.reflexScore,
        trend: reflex.trend,
        polarity: tagResult.polarity,
      });
      const hint = getHint(reflexAdjusted.reflexScoreAdjusted, reflex.trend);
      const governed = applyModeGovernance({
        mode: hint.mode,
        constraints: hint.constraints,
        reflexScore: reflex.reflexScore,
        trend: reflex.trend,
        polarity: tagResult.polarity,
      });

      // Reply is intentionally generated but not text-asserted (template can vary).
      void generateReply(governed.mode, userText);

      history.push(tagResult.scalar);
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }
      baselineState = reflex.nextBaseline;

      turns.push({
        modeAfterOverride: governed.mode,
        constraints: governed.constraints,
        isHardSpike: reflex.isHardSpike,
      });
    }

    expect(turns[1].isHardSpike).toBe(true);
    expect(turns[1].modeAfterOverride).toBe("DEESCALATE");

    expect(turns[2].isHardSpike).toBe(true);
    expect(turns[2].modeAfterOverride).toBe("DEESCALATE");

    expect(turns[4].modeAfterOverride).toBe("PROBING");
    expect(turns[4].constraints).toContain("confirm recovery, avoid re-spike");
  });
});
