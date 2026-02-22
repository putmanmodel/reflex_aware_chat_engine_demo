import { lookupSentence } from "./tvsDataset";

export type TVSTagResult = {
  tag: string;
  scalar: number;
  confidence: number;
  rationale: string;
  polarity?: "POS" | "NEG" | "MIX" | "UNK";
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeForRules(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractNumericPart(rawTag: string): string {
  return rawTag.replace(/^[^\d.-]+/, "");
}

export function renderTag(rawTag: string, displayPrefix?: string): string {
  if (displayPrefix === undefined) {
    return rawTag;
  }

  return `${displayPrefix}${extractNumericPart(rawTag)}`;
}

function parseScalarFromTag(rawTag: string): number {
  return Number.parseFloat(extractNumericPart(rawTag));
}

function inferDatasetPolarity(label: string): "POS" | "NEG" | "MIX" | "UNK" {
  const normalized = label.toLowerCase();
  if (normalized.includes("positive") || normalized.includes("comfort")) {
    return "POS";
  }
  if (
    normalized.includes("negative") ||
    normalized.includes("anger") ||
    normalized.includes("fear") ||
    normalized.includes("resent")
  ) {
    return "NEG";
  }
  if (normalized.includes("contradiction") || normalized.includes("mixed")) {
    return "MIX";
  }
  return "UNK";
}

function fallbackTagFromText(
  text: string
): Omit<TVSTagResult, "tag" | "scalar"> & { rawTag: string } {
  const normalized = normalizeForRules(text);

  let base = 18;
  let confidence = 0.45;
  let rationale = "general ambiguity";
  let polarity: "POS" | "NEG" | "MIX" | "UNK" = "UNK";

  const contradiction =
    /\bfine\b.*\bnot fine\b|\bnot fine\b.*\bfine\b/.test(normalized) ||
    /\bbut\b/.test(normalized);
  const anger = /\bangry\b|\bmad\b|\bfurious\b|\bhate\b|\bannoyed\b/.test(normalized);
  const fear = /\bafraid\b|\bscared\b|\bpanic\b|\bworry\b/.test(normalized);
  const gratitude = /\bthanks\b|\bthank you\b|\bgrateful\b|\bappreciate\b/.test(normalized);
  const boundaryIrritation =
    /\bstop asking\b|\bleave me alone\b|\bdoesn't matter\b|\bwhatever\b|\bdrop it\b/.test(normalized);
  const strain =
    /\boverwhelmed\b|\bcan'?t\b|\btoo much\b|\bstressed\b|\banxious\b/.test(normalized);

  if (contradiction) {
    base = 31;
    confidence = 0.78;
    rationale = "mixed signal contradiction";
    polarity = "MIX";
  } else if (anger) {
    base = 35;
    confidence = 0.75;
    rationale = "anger language detected";
    polarity = "NEG";
  } else if (boundaryIrritation) {
    base = 30;
    confidence = 0.7;
    rationale = "boundary irritation cues";
    polarity = "NEG";
  } else if (fear) {
    base = 28;
    confidence = 0.72;
    rationale = "fear cues detected";
    polarity = "NEG";
  } else if (strain) {
    base = 24;
    confidence = 0.64;
    rationale = "strain cues detected";
    polarity = "NEG";
  } else if (gratitude) {
    base = 12;
    confidence = 0.65;
    rationale = "gratitude cues detected";
    polarity = "POS";
  } else if (normalized.endsWith("?")) {
    base = 16;
    confidence = 0.58;
    rationale = "questioning uncertainty tone";
    polarity = "UNK";
  }

  // Deterministic suffix from character code sum.
  const sum = [...normalized].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const decimal = String(sum % 1000).padStart(3, "0");
  const rawTag = `¡${base.toString().padStart(2, "0")}.${decimal}`;

  return {
    rawTag,
    confidence: clamp(confidence, 0.4, 0.8),
    rationale,
    polarity,
  };
}

export async function tagText(userText: string, prefix?: string): Promise<TVSTagResult> {
  const hit = lookupSentence(userText);
  if (hit) {
    const rawTag = hit.toneSig;
    return {
      tag: renderTag(rawTag, prefix),
      scalar: parseScalarFromTag(rawTag),
      confidence: 1,
      rationale: `dataset:${hit.label}`,
      polarity: inferDatasetPolarity(hit.label),
    };
  }

  const fallback = fallbackTagFromText(userText);
  return {
    tag: renderTag(fallback.rawTag, prefix),
    scalar: parseScalarFromTag(fallback.rawTag),
    confidence: fallback.confidence,
    rationale: fallback.rationale,
    polarity: fallback.polarity,
  };
}
