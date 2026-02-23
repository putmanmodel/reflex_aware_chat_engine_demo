# Reflex-Aware Chat Engine Demo

This repository contains a deterministic, local-only demo of a reflex-aware conversational pipeline in two interfaces: a Node/TypeScript terminal REPL and a React/Vite web UI. Both surfaces share the same core reflex, hinting, governance, and reply-generation logic so behavior stays aligned across environments.

The system tags user text against a reference dataset (with deterministic heuristic fallback), computes reflex dynamics over recent scalar history, applies mode governance, and generates rule-based replies. No external APIs or LLM calls are required.

## Quickstart: Terminal Demo

```bash
cd terminal
npm install
npm run dev
```

## Quickstart: React Demo

```bash
cd react
npm install
npm run dev
```

## Notes

- **Seed field (React):** optional deterministic template variation; blank uses `Math.random`, set value uses seeded RNG.
- **Download Run Log (React):** exports per-turn JSON run data (timestamp, tag/reflex/mode/constraints/reply/history/template metadata).
- **Show template IDs (React):** debug toggle to display selected template IDs in inspector and AI bubbles.
- **`VITE_DISPLAY_PREFIX` (React):** optional tag display prefix override (render-only; scalar parsing and raw dataset tags remain unchanged).

## License

This project is licensed under **Creative Commons Attribution–NonCommercial 4.0 International (CC BY-NC 4.0)**.
See `LICENSE`.

Copyright (c) 2026 Stephen A. Putman  
Contact: putmanmodel@pm.me