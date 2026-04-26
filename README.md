# Chemtools

A simple website with tools for learning chemistry, built for university study.

**Live demo:** https://chemtools.snagmin.kim

## Features

- **Periodic table** — all 118 elements, color-coded by category, with search, filter, and detail view (atomic number, mass, period, group, electron configuration).
- **Molar mass calculator** — parses chemical formulas including parentheses (`Ca(OH)2`), brackets (`K4[Fe(CN)6]`), and hydrates (`CuSO4·5H2O`). Shows total mass, per-element breakdown, and percent composition.
- **Settings panel** — light/dark theme, font pairings, density, atomic mass display.

The two tools are linked: clicking **Add to formula** on an element inserts it into the calculator, and elements used in your formula get badges on the periodic table.

## Tech

SvelteKit (Svelte 5) with `@sveltejs/adapter-static`. Atomic weights from IUPAC 2021 standard atomic weights.

## Run locally

```bash
npm install
npm run dev
```

Then visit `http://localhost:5173`.

## Deploy

Static site deployed on Vercel. To deploy your own:

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects SvelteKit — click Deploy.

## License

MIT
