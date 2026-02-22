import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { tagText, type TVSTagResult } from "./tvsTagger";
import { computeReflex } from "../../shared/reflexEngine";
import { getHint, type HintMode } from "../../shared/cdeHintLayer";
import { applyModeGovernance, computeAdjustedReflex } from "../../shared/modeGovernance";
import { generateReplyWithMeta } from "../../shared/replyGenerator";

type Message = {
  speaker: "You" | "AI";
  text: string;
  templateId?: string;
};

type InspectorTurn = {
  tagResult: TVSTagResult;
  baseline: number;
  diff: number;
  reflexScoreRaw: number;
  reflexScoreAdjusted: number;
  isSpike: boolean;
  isHardSpike: boolean;
  mode: HintMode;
  constraints: string[];
  templateId: string;
  history: number[];
};

type RunLogEntry = {
  timestampMs: number;
  userText: string;
  tagResult: {
    tag: string;
    scalar: number;
    confidence: number;
    polarity: TVSTagResult["polarity"];
    rationale: string;
  };
  reflexResult: {
    baseline: number;
    diff: number;
    reflexScoreRaw: number;
    reflexScoreAdjusted: number;
    isSpike: boolean;
    isHardSpike: boolean;
    trend: number;
  };
  modeBeforeOverride: HintMode;
  modeAfterOverride: HintMode;
  constraints: string[];
  seedUsed: string | null;
  templateId: string;
  aiReply: string;
  historyScalarsSnapshot: number[];
};

const cannedInputs = [
  "I think we might need to address this soon.",
  "I am furious and everything is breaking.",
  "I am fine but not fine.",
  "Let’s slow down and take this step by step.",
  "Thanks, I appreciate the help and I feel calmer now.",
];

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function getSpikeText(turn: InspectorTurn): string {
  if (turn.isHardSpike) {
    return "Hard Spike";
  }
  if (turn.isSpike) {
    return "Spike";
  }
  return "OK";
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function App() {
  const [inputText, setInputText] = useState("");
  const [seedText, setSeedText] = useState("");
  const [showTemplateIds, setShowTemplateIds] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [latestTurn, setLatestTurn] = useState<InspectorTurn | null>(null);
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string>("");
  const historyRef = useRef<number[]>([]);
  const baselineRef = useRef<number | undefined>(undefined);
  const seededRngRef = useRef<{ seed: string; rng: () => number } | null>(null);

  const displayPrefix = useMemo(() => {
    const raw = import.meta.env.VITE_DISPLAY_PREFIX?.trim();
    return raw ? raw : undefined;
  }, []);

  function getCurrentRng(): { rng?: () => number; seedUsed: string | null } {
    const normalizedSeed = seedText.trim();
    if (!normalizedSeed) {
      seededRngRef.current = null;
      return { rng: undefined, seedUsed: null };
    }

    if (!seededRngRef.current || seededRngRef.current.seed !== normalizedSeed) {
      seededRngRef.current = {
        seed: normalizedSeed,
        rng: mulberry32(hashSeed(normalizedSeed)),
      };
    }

    return { rng: seededRngRef.current.rng, seedUsed: normalizedSeed };
  }

  async function runTurn(userText: string): Promise<void> {
    const trimmed = userText.trim();
    if (!trimmed) {
      return;
    }

    const tagResult = await tagText(trimmed, displayPrefix);
    const reflex = computeReflex(historyRef.current, tagResult.scalar, 5, baselineRef.current);
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
    const { rng, seedUsed } = getCurrentRng();
    const replyResult = generateReplyWithMeta(governed.mode, trimmed, rng);
    const reply = replyResult.reply;

    const nextHistory = [...historyRef.current, tagResult.scalar].slice(-10);

    setMessages((prev) => [
      ...prev,
      { speaker: "You", text: trimmed },
      { speaker: "AI", text: reply, templateId: replyResult.templateId },
    ]);
    historyRef.current = nextHistory;
    baselineRef.current = reflex.nextBaseline;
    setLatestTurn({
      tagResult,
      baseline: reflex.baseline,
      diff: reflex.diff,
      reflexScoreRaw: reflexAdjusted.reflexScoreRaw,
      reflexScoreAdjusted: reflexAdjusted.reflexScoreAdjusted,
      isSpike: reflex.isSpike,
      isHardSpike: reflex.isHardSpike,
      mode: governed.mode,
      constraints: governed.constraints,
      templateId: replyResult.templateId,
      history: nextHistory,
    });
    setRunLog((prev) => [
      ...prev,
      {
        timestampMs: Date.now(),
        userText: trimmed,
        tagResult: {
          tag: tagResult.tag,
          scalar: tagResult.scalar,
          confidence: tagResult.confidence,
          polarity: tagResult.polarity,
          rationale: tagResult.rationale,
        },
        reflexResult: {
          baseline: reflex.baseline,
          diff: reflex.diff,
          reflexScoreRaw: reflexAdjusted.reflexScoreRaw,
          reflexScoreAdjusted: reflexAdjusted.reflexScoreAdjusted,
          isSpike: reflex.isSpike,
          isHardSpike: reflex.isHardSpike,
          trend: reflex.trend,
        },
        modeBeforeOverride: hint.mode,
        modeAfterOverride: governed.mode,
        constraints: [...governed.constraints],
        seedUsed,
        templateId: replyResult.templateId,
        aiReply: reply,
        historyScalarsSnapshot: [...nextHistory],
      },
    ]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = inputText;
    setInputText("");
    await runTurn(text);
  }

  function handleClear(): void {
    setInputText("");
    setMessages([]);
    historyRef.current = [];
    baselineRef.current = undefined;
    seededRngRef.current = null;
    setLatestTurn(null);
    setRunLog([]);
    setLastDownloadedFile("");
  }

  async function handleDemoRun(): Promise<void> {
    for (const line of cannedInputs) {
      await runTurn(line);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  function formatDownloadFileName(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `reflex_runlog_${yyyy}${mm}${dd}_${hh}${min}${ss}.json`;
  }

  function handleDownloadRunLog(): void {
    const fileName = formatDownloadFileName(new Date());
    const payload = JSON.stringify(runLog, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLastDownloadedFile(fileName);
  }

  return (
    <main className="app-shell">
      <section className="chat-column panel">
        <header className="panel-header">
          <h1>Live Reflex-Aware Chat Engine</h1>
          <p>React demo using the same deterministic loop as terminal.</p>
        </header>

        <div className="transcript">
          {messages.length === 0 ? (
            <p className="placeholder">Start by typing a message or click a demo input.</p>
          ) : (
            messages.map((message, idx) => (
              <article key={`${message.speaker}-${idx}`} className={`bubble bubble-${message.speaker.toLowerCase()}`}>
                <strong>{message.speaker}</strong>
                <p>{message.text}</p>
                {showTemplateIds && message.speaker === "AI" && message.templateId ? (
                  <p className="template-note">{message.templateId}</p>
                ) : null}
              </article>
            ))
          )}
        </div>

        <form className="input-row" onSubmit={handleSubmit}>
          <input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Type your message..."
            aria-label="Chat input"
          />
          <input
            className="seed-input"
            value={seedText}
            onChange={(event) => setSeedText(event.target.value)}
            placeholder="Seed (optional)"
            aria-label="Seed input"
          />
          <button type="submit">Send</button>
          <button type="button" onClick={handleClear}>
            Clear
          </button>
          <button type="button" onClick={() => void handleDemoRun()}>
            Demo Run
          </button>
          <button type="button" onClick={handleDownloadRunLog} disabled={runLog.length === 0}>
            Download Run Log
          </button>
        </form>
        <p className="download-note">
          {lastDownloadedFile ? `Last run log file: ${lastDownloadedFile}` : "No run log downloaded yet."}
        </p>
      </section>

      <section className="inspector-column panel">
        <header className="panel-header">
          <h2>Inspector</h2>
          <p>{displayPrefix ? `Display prefix: ${displayPrefix}` : "Display prefix: raw"}</p>
          <label className="template-toggle">
            <input
              type="checkbox"
              checked={showTemplateIds}
              onChange={(event) => setShowTemplateIds(event.target.checked)}
            />
            Show template IDs
          </label>
        </header>

        {latestTurn ? (
          <div className="inspector-grid">
            <div>
              <span className="label">Tag</span>
              <p>
                {latestTurn.tagResult.tag} (conf {fmt(latestTurn.tagResult.confidence)})
              </p>
              <p className="muted">{latestTurn.tagResult.rationale}</p>
            </div>

            <div>
              <span className="label">Polarity</span>
              <p>{latestTurn.tagResult.polarity ?? "UNK"}</p>
            </div>

            <div>
              <span className="label">Baseline(N=5)</span>
              <p>{fmt(latestTurn.baseline)}</p>
            </div>

            <div>
              <span className="label">Diff</span>
              <p>{fmt(latestTurn.diff)}</p>
            </div>

            <div>
              <span className="label">ReflexScore (raw / adj)</span>
              <p>
                {fmt(latestTurn.reflexScoreRaw)} / {fmt(latestTurn.reflexScoreAdjusted)}
              </p>
            </div>

            <div>
              <span className="label">Spike Status</span>
              <p>{getSpikeText(latestTurn)}</p>
            </div>

            <div>
              <span className="label">Mode</span>
              <p>{latestTurn.mode}</p>
            </div>

            {showTemplateIds ? (
              <div>
                <span className="label">Template</span>
                <p>{latestTurn.templateId}</p>
              </div>
            ) : null}

            <div>
              <span className="label">Constraints</span>
              {latestTurn.constraints.length === 0 ? (
                <p className="muted">(none)</p>
              ) : (
                <ul>
                  {latestTurn.constraints.map((constraint) => (
                    <li key={constraint}>{constraint}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="wide">
              <span className="label">History(10)</span>
              <p>{latestTurn.history.map((value) => fmt(value)).join(", ")}</p>
            </div>

            <div className="wide">
              <span className="label">Spark Bars</span>
              <div className="spark-row">
                {latestTurn.history.map((value, idx) => {
                  const height = Math.max(6, Math.min(48, (value / 40) * 48));
                  return <span key={`${idx}-${value}`} style={{ height: `${height}px` }} />;
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="placeholder">Inspector appears after first turn.</p>
        )}

        <section className="demo-panel">
          <h3>Demo Script</h3>
          <div className="demo-buttons">
            {cannedInputs.map((line) => (
              <button key={line} type="button" onClick={() => void runTurn(line)}>
                {line}
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
