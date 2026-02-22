import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { tagText } from "./tvsTagger";
import { computeReflex } from "./reflexEngine";
import { getHint } from "./cdeHintLayer";
import { applyModeGovernance, computeAdjustedReflex } from "./modeGovernance";
import { generateReply } from "./replyGenerator";

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function printInspector(params: {
  tag: string;
  confidence: number;
  rationale: string;
  baseline: number;
  diff: number;
  reflexScoreRaw: number;
  reflexScoreAdjusted: number;
  isSpike: boolean;
  isHardSpike: boolean;
  mode: string;
  history: number[];
  reply: string;
}): void {
  console.log("\n------------------------------");
  console.log(`Tag: ${params.tag} (conf ${fmt(params.confidence)}) ${params.rationale}`);
  console.log(`Baseline(N=5): ${fmt(params.baseline)}`);
  console.log(`Diff: ${fmt(params.diff)}`);
  const spikeText = params.isHardSpike ? "🔥🔥 Hard Spike" : params.isSpike ? "🔥 Spike" : "OK";
  console.log(
    `Reflex: raw ${fmt(params.reflexScoreRaw)} | adj ${fmt(params.reflexScoreAdjusted)} ${spikeText}`
  );
  console.log(`Mode: ${params.mode}`);
  console.log(`History(10): ${params.history.map((n) => fmt(n)).join(", ") || "(empty)"}`);
  console.log(`AI: ${params.reply}`);
  console.log("------------------------------\n");
}

async function main(): Promise<void> {
  const history: number[] = [];
  let baselineState: number | undefined;
  const configuredPrefix = process.env.DISPLAY_PREFIX?.trim();
  const displayPrefix = configuredPrefix ? configuredPrefix : undefined;

  const rl = readline.createInterface({
    input,
    output,
    prompt: "You> ",
  });

  console.log("Live Reflex-Aware Chat Engine (terminal demo)");
  console.log("Type a message and press Enter. Type 'exit' to quit.\n");
  rl.prompt();

  rl.on("line", async (line) => {
    const userText = line.trim();

    if (userText.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    if (!userText) {
      rl.prompt();
      return;
    }

    try {
      const tagResult = await tagText(userText, displayPrefix);
      const reflex = computeReflex(history, tagResult.scalar, 5, baselineState);
      const reflexAdjusted = computeAdjustedReflex({
        diff: reflex.diff,
        reflexScoreRaw: reflex.reflexScore,
        trend: reflex.trend,
        polarity: tagResult.polarity,
      });
      const hint = getHint(reflexAdjusted.reflexScoreAdjusted, reflex.trend);
      const governedHint = applyModeGovernance({
        mode: hint.mode,
        constraints: hint.constraints,
        reflexScore: reflex.reflexScore,
        trend: reflex.trend,
        polarity: tagResult.polarity,
      });
      const reply = generateReply(governedHint.mode, userText);
      baselineState = reflex.nextBaseline;

      history.push(tagResult.scalar);
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }

      printInspector({
        tag: tagResult.tag,
        confidence: tagResult.confidence,
        rationale: tagResult.rationale,
        baseline: reflex.baseline,
        diff: reflex.diff,
        reflexScoreRaw: reflexAdjusted.reflexScoreRaw,
        reflexScoreAdjusted: reflexAdjusted.reflexScoreAdjusted,
        isSpike: reflex.isSpike,
        isHardSpike: reflex.isHardSpike,
        mode: governedHint.mode,
        history,
        reply,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error: ${message}`);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Goodbye.");
    process.exit(0);
  });
}

void main();
