export const GAME_CONFIG = {
  title: 'PORTOBBLE',
  subtitle: 'Space • Weight • Exit • Destination',
  version: 'v0.3',
  width: 390,
  height: 700,
  colors: {
    deepWater: 0x102f3a,
    water: 0x397f87,
    waterLight: 0x75b4ae,
    foam: 0xb8ddd4,
    ink: 0x17313a,
    navy: 0x203e4a,
    cream: 0xf3ead4,
    paper: 0xfffbef,
    concrete: 0xb9ad91,
    timber: 0x765843,
    orange: 0xd98245,
    green: 0x4f8164,
    red: 0xb94c48,
    gold: 0xd8ad49,
  },
} as const;

export const DEBUG_MODE = new URLSearchParams(window.location.search).has('debug');
export const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
