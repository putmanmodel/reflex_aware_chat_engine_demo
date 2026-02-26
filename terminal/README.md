# Live Reflex-Aware Chat Engine (Terminal)

## Install and run

```bash
cd terminal
npm install
npm test
npm run dev
```

Type messages in the REPL. Type `exit` to quit.

Optional tag rendering:

- `DISPLAY_PREFIX` unset or empty: print raw tags as stored (for example `¡10.041`)
- `DISPLAY_PREFIX=XX`: print converted tags (for example `XX10.041`) while internal dataset values remain unchanged

## Canned input sequence (calm -> spike -> de-escalate -> recovery)

1. `I think we might need to address this soon.`
2. `I am furious and everything is breaking.`
3. `I am fine but not fine.`
4. `Let’s slow down and take this step by step.`
5. `Thanks, I appreciate the help and I feel calmer now.`

## How the loop works

Each turn runs a deterministic pipeline: `tagText` assigns a TVS-style tag and scalar (first from dataset lookup, otherwise keyword heuristic), `computeReflex` compares the new scalar to recent history to calculate reflex intensity and trend, `getHint` maps that signal to an interaction mode, and `generateReply` outputs a short rule-based response aligned to that mode. Reflex uses a configurable full-scale diff (`12.0` by default), so `reflexScore = clamp(diff / 12, 0, 1)`, and baseline is smoothed turn-to-turn with a tiny EMA (`0.7 * prev + 0.3 * currentMean`) to reduce twitchiness.

- Recovery override: when reflex is in spike range but polarity is positive and trend is downward (recovery), mode is forced to `PROBING` instead of `DEESCALATE`.
