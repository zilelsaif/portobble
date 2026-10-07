# PORTOBBLE v0.2

PORTOBBLE is a portrait-first ferry logistics puzzle set in a stylized miniature harbour. A successful load must fit on the deck, balance the ferry, and let priority vehicles reach an exit in the required order.

## Requirements

- Node.js 20.19+ (Node 22+ recommended)
- npm
- A current desktop or mobile browser

## Commands

```bash
npm install
npm run dev
npm run dev:host
npm test
npm run build
npm run preview
npm run preview:host
```

The development server prints its local URL. Add `?debug` to that URL for developer tools, for example `http://localhost:5173/?debug`.

### Testing on another device

Connect the computer and device to the same trusted local network, then run `npm run dev:host` (or build first and use `npm run preview:host`). Open the printed Network URL on the device; its format is `http://<computer-ip>:5173/` for development or `http://<computer-ip>:4173/` for preview. For example, if the computer is `192.168.1.200`, use `http://192.168.1.200:5173/`.

The operating-system firewall may ask for permission the first time Node/Vite listens on the network. Allow access only on trusted/private networks. Client isolation on guest Wi-Fi, a VPN, or a firewall rule can prevent another device from connecting.

## Controls

- Drag a vehicle from the queue to a ferry lane. It snaps to logical cells.
- Drag a loaded vehicle to another cell, or off the deck to return it to the queue.
- **SAIL** validates loading, weight, balance, and priority exit order.
- **UNDO** reverses the most recent meaningful load, move, return, or reset.
- **RESET** clears the current deck.

Touch and mouse input use the same drag system.

## Progress and save reset

Completion stars and the next unlocked level are saved in browser local storage under `portobble-save-v1`. Corrupt or missing data falls back to a clean save.

In debug mode:

- Use **UNLOCK ALL** on Level Select to unlock all ten levels.
- Press `R` on Level Select to clear progression.
- Logical ferry cell IDs and numeric balance values are visible during play.

For a manual reset, remove the `portobble-save-v1` entry in the browser's Application/Storage developer tools.

## Project layout

```text
src/
  config/      visible title and game-wide dimensions/colours
  data/        central vehicle definitions and ten handcrafted levels
  models/      framework-independent game types
  systems/     placement, balance, exit, validation, solver, save, scoring
  scenes/      Phaser boot, title, level select, and gameplay scenes
  ui/          shared Phaser UI helpers
  utils/       lightweight generated mechanical sound effects
tests/         pure TypeScript rule and solvability tests
public/assets/ replaceable asset categories for future production art/audio
```

Phaser owns scenes, rendering, pointer input, and animation. Puzzle rules do not import Phaser and run under Node in the test suite.

## Responsive design

The game renders into a fixed 390×700 portrait composition and uses Phaser's `FIT` scaling with centered letterboxing. This keeps the entire control surface visible without page scrolling on tall phones, short 360×640 screens, tablets, and desktop windows. Decorative bobbing and ambient water motion respect the browser's reduced-motion preference.

## Deployment

### Local development

```bash
npm install
npm run dev
```

### LAN device testing

```bash
npm run preview:host
```

### Production build

```bash
npm run build
```

The production output is written to:

```text
dist/
```

### Cloudflare Pages

Use the following Git integration settings:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: `24.20.0` (pinned in `.node-version`)

No runtime environment variables are required for v0.2. A push to `main` triggers a production deployment; non-production branches remain available for Cloudflare preview deployments.
