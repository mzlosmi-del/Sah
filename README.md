# ♟ Chess Simulator

A chess game with a trash-talking bot in Serbian (Leskovački/Vranjanski dialect).

## Features
- 4 bot difficulty levels (500 / 1000 / 1500 / 2000 rating)
- Iterative deepening search with alpha-beta pruning
- Quiescence search (no horizon-effect blunders)
- Transposition table for position caching
- Rich evaluation: mobility, king safety, pawn structure, bishop pair
- Move quality analysis (Best / Excellent / Good / Inaccuracy / Mistake / Blunder)
- Drag & drop or click-to-move
- Bot trash talks in Leskovački/Vranjanski dialect 🤖

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

Make sure to update the `base` in `vite.config.js` to match your repo name.
