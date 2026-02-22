import type { HintMode } from "./cdeHintLayer";

export type Polarity = "POS" | "NEG" | "MIX" | "UNK";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeAdjustedReflex(params: {
  diff: number;
  reflexScoreRaw: number;
  fullScaleDiff?: number;
  trend: number;
  polarity?: Polarity;
}): { reflexScoreRaw: number; reflexScoreAdjusted: number } {
  const { diff, reflexScoreRaw, fullScaleDiff = 12.0, trend, polarity } = params;

  if (polarity === "POS" && trend < 0) {
    const adjustedDiff = diff * 0.7;
    const adjustedReflex = clamp(adjustedDiff / fullScaleDiff, 0, 1);
    return {
      reflexScoreRaw,
      reflexScoreAdjusted: adjustedReflex,
    };
  }

  return {
    reflexScoreRaw,
    reflexScoreAdjusted: reflexScoreRaw,
  };
}

export function selectConstraints(params: {
  modeAfterOverride: HintMode;
  reflexScore: number;
  trend: number;
  polarity?: Polarity;
}): string[] {
  const { modeAfterOverride, reflexScore, trend, polarity } = params;

  if (modeAfterOverride === "EMPATHETIC" && reflexScore < 0.35) {
    return [];
  }

  if (modeAfterOverride === "PROBING") {
    if (trend > 0) {
      return ["lower intensity, increase grounding"];
    }
    if (trend < 0) {
      return ["confirm recovery, avoid re-spike"];
    }
    return ["stay steady"];
  }

  if (modeAfterOverride === "DEESCALATE") {
    const constraints = ["lower intensity, increase grounding"];
    if (trend < 0 || polarity === "POS") {
      constraints.push("confirm recovery, avoid re-spike");
    }
    return constraints;
  }

  return trend === 0 ? ["stay steady"] : [];
}

export function applyModeGovernance(params: {
  mode: HintMode;
  constraints?: string[];
  reflexScore: number;
  trend: number;
  polarity?: Polarity;
}): { mode: HintMode; constraints: string[] } {
  const { mode, reflexScore, trend, polarity } = params;
  void params.constraints;

  const modeAfterOverride =
    reflexScore >= 0.65 && polarity === "POS" && trend < 0 ? "PROBING" : mode;
  const constraints = selectConstraints({
    modeAfterOverride,
    reflexScore,
    trend,
    polarity,
  });

  return { mode: modeAfterOverride, constraints };
}
