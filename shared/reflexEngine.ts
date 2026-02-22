export type ReflexResult = {
  baseline: number;
  nextBaseline: number;
  diff: number;
  reflexScore: number;
  isSpike: boolean;
  isHardSpike: boolean;
  trend: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function computeReflex(
  history: number[],
  current: number,
  windowN = 5,
  prevBaseline?: number,
  fullScaleDiff = 12.0
): ReflexResult {
  const window = history.slice(-windowN);
  const baselineMean = window.length > 0 ? mean(window) : current;
  const baseline = (prevBaseline ?? baselineMean) * 0.7 + baselineMean * 0.3;
  const nextBaseline = baseline;
  const diff = Math.abs(current - baseline);
  const reflexScore = clamp(diff / fullScaleDiff, 0, 1);
  const isSpike = reflexScore >= 0.65;
  const isHardSpike = reflexScore >= 0.85;
  const trend = current - baseline;

  return { baseline, nextBaseline, diff, reflexScore, isSpike, isHardSpike, trend };
}
