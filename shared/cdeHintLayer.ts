export type HintMode = "EMPATHETIC" | "PROBING" | "DEESCALATE";

export type HintResult = {
  mode: HintMode;
  constraints: string[];
};

export function getHint(reflexScore: number, trend: number): HintResult {
  let mode: HintMode;

  if (reflexScore < 0.35) {
    mode = "EMPATHETIC";
  } else if (reflexScore < 0.65) {
    mode = "PROBING";
  } else {
    mode = "DEESCALATE";
  }

  let constraint: string;
  if (trend > 0) {
    constraint = "lower intensity, increase grounding";
  } else if (trend < 0) {
    constraint = "confirm recovery, avoid re-spike";
  } else {
    constraint = "stay steady";
  }

  return {
    mode,
    constraints: [constraint],
  };
}
