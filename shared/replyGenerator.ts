import type { HintMode } from "./cdeHintLayer";

function limitSentences(text: string, maxSentences = 4): string {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, maxSentences).join(" ");
}

type ReplyVariant = {
  id: string;
  text: string;
};

export type ReplyMeta = {
  reply: string;
  templateId: string;
};

export function generateReplyWithMeta(
  mode: HintMode,
  userText: string,
  rng?: () => number
): ReplyMeta {
  void userText;
  const random = rng ?? Math.random;

  if (mode === "EMPATHETIC") {
    const empatheticVariants: ReplyVariant[] = [
      { id: "EMPATHETIC_1", text: "It sounds like this matters to you." },
      { id: "EMPATHETIC_2", text: "What part of this feels most urgent right now?" },
      { id: "EMPATHETIC_3", text: "Is this mostly about timing, impact, or something else?" },
      { id: "EMPATHETIC_4", text: "I am with you on this. What would be most helpful to address first?" },
    ];
    const selected = empatheticVariants[Math.floor(random() * empatheticVariants.length)];
    return {
      reply: limitSentences(selected.text, 3),
      templateId: selected.id,
    };
  }

  if (mode === "PROBING") {
    return {
      reply: limitSentences(
        "You seem to be finding a steadier footing. What would help you keep that momentum right now?"
      ),
      templateId: "PROBING_1",
    };
  }

  return {
    reply: limitSentences(
      "Let’s slow this down and take one steady breath. We can focus on immediate safety first or sort the facts step by step. Which option feels better right now?"
    ),
    templateId: "DEESCALATE_1",
  };
}

export function generateReply(mode: HintMode, userText: string, rng?: () => number): string {
  return generateReplyWithMeta(mode, userText, rng).reply;
}
