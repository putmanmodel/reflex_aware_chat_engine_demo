# Reflex-Aware Chat Engine Demo

**Live demo:** https://putmanmodel.github.io/reflex_aware_chat_engine_demo/

## What this demonstrates
- A lightweight governance primitive that can sit in front of an LLM or NPC dialogue system.
- Real-time tone tagging → reflex deviation score → governance mode selection
- Deterministic replay via seed + downloadable run logs
- Same shared core logic across Terminal + React

This repository contains a deterministic, local-only demo of a reflex-aware conversational pipeline in two interfaces: a Node/TypeScript terminal interface and a React/Vite web UI. Both surfaces share the same core reflex, hinting, governance, and reply-generation logic so behavior stays aligned across environments.

The system tags user text against a reference dataset (with deterministic heuristic fallback), computes reflex dynamics over recent scalar history, applies mode governance, and generates rule-based replies. No external APIs or LLM calls are required.

## Quickstart: Terminal Demo

Requires Node.js 18+ (20 recommended).

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