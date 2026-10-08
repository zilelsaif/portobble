import Phaser from 'phaser';
import { GAME_CONFIG, REDUCED_MOTION } from '../config/gameConfig';
import { TYPE, VISUAL } from './visualTokens';

export type ButtonKind = 'primary' | 'secondary' | 'quiet' | 'locked';

export const textStyle = (
  size: number,
  color = '#17313a',
  align: Phaser.Types.GameObjects.Text.TextStyle['align'] = 'center',
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: TYPE.family, fontSize: `${size}px`, fontStyle: 'bold', color, align,
});

const buttonColors: Record<ButtonKind, number> = {
  primary: GAME_CONFIG.colors.orange, secondary: GAME_CONFIG.colors.navy, quiet: 0x6f695e, locked: 0x8d9692,
};

export function addButton(
  scene: Phaser.Scene, x: number, y: number, width: number, height: number, label: string,
  onClick: () => void, fillOrKind: number | ButtonKind = 'primary',
): Phaser.GameObjects.Container {
  const fill = typeof fillOrKind === 'number' ? fillOrKind : buttonColors[fillOrKind];
  const shadow = scene.add.graphics().fillStyle(VISUAL.shadow.color, VISUAL.shadow.alpha).fillRoundedRect(-width / 2, -height / 2 + VISUAL.shadow.offsetY, width, height, VISUAL.radius.medium);
  const rim = scene.add.graphics().fillStyle(GAME_CONFIG.colors.cream).fillRoundedRect(-width / 2, -height / 2, width, height, 10);
  const background = scene.add.graphics();
  const drawBackground = (color: number) => background.clear().fillStyle(color).fillRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 5, 8)
    .lineStyle(1, 0xffffff, 0.2).strokeRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 5, 8);
  drawBackground(fill);
  const shine = scene.add.rectangle(0, -height * 0.31, width - 16, 1, 0xffffff, 0.14);
  const labelText = scene.add.text(0, -2, label, textStyle(height >= 52 ? 17 : 14, '#fff9e8')).setOrigin(0.5).setShadow(0, 1, '#17313a', 1);
  const button = scene.add.container(x, y, [shadow, rim, background, shine, labelText]);
  button.setSize(width, Math.max(48, height)).setInteractive({ useHandCursor: true });
  button.on('pointerover', () => drawBackground(Phaser.Display.Color.ValueToColor(fill).brighten(7).color));
  button.on('pointerout', () => { drawBackground(fill); button.setScale(1).setY(y); });
  button.on('pointerdown', () => button.setScale(0.965).setY(y + 2));
  button.on('pointerup', () => { button.setScale(1).setY(y); onClick(); });
  return button;
}

export function addPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, depth = 0): Phaser.GameObjects.Container {
  const shadow = scene.add.graphics().fillStyle(0x0b252e, 0.3).fillRoundedRect(-width / 2 + 4, -height / 2 + 7, width, height, 15);
  const rim = scene.add.graphics().fillStyle(GAME_CONFIG.colors.cream).fillRoundedRect(-width / 2, -height / 2, width, height, 15)
    .lineStyle(3, GAME_CONFIG.colors.ink, 0.72).strokeRoundedRect(-width / 2, -height / 2, width, height, 15);
  const surface = scene.add.graphics().fillStyle(GAME_CONFIG.colors.paper, 0.98).fillRoundedRect(-width / 2 + 5, -height / 2 + 3, width - 10, height - 10, 12)
    .lineStyle(1, 0xffffff, 0.8).strokeRoundedRect(-width / 2 + 5, -height / 2 + 3, width - 10, height - 10, 12);
  return scene.add.container(x, y, [shadow, rim, surface]).setDepth(depth);
}

export function addStars(scene: Phaser.Scene, x: number, y: number, stars: number, size = 28): Phaser.GameObjects.Text {
  return scene.add.text(x, y, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, textStyle(size, '#d5a63e')).setOrigin(0.5).setShadow(0, 2, '#6a5126', 2);
}
export function addMasteryMark(scene: Phaser.Scene, x: number, y: number, size = 18): Phaser.GameObjects.Container { const g=scene.add.graphics(); const s=size/18; g.lineStyle(2*s,VISUAL.color.amber,1).strokeCircle(0,-5*s,3*s).lineBetween(0,-2*s,0,7*s).lineBetween(-7*s,3*s,0,8*s).lineBetween(7*s,3*s,0,8*s); return scene.add.container(x,y,[g]); }

export function addWaterBackdrop(scene: Phaser.Scene, harbour = true): Phaser.GameObjects.Container {
  scene.cameras.main.setBackgroundColor(GAME_CONFIG.colors.deepWater);
  const water = scene.add.graphics();
  water.fillGradientStyle(GAME_CONFIG.colors.waterLight, GAME_CONFIG.colors.waterLight, GAME_CONFIG.colors.deepWater, GAME_CONFIG.colors.deepWater, 1).fillRect(-20, -10, GAME_CONFIG.width + 40, GAME_CONFIG.height + 20);
  water.fillStyle(0x163f4b, 0.35).fillRect(-20, 370, GAME_CONFIG.width + 40, 340);
  const waves = scene.add.graphics();
  waves.lineStyle(2, GAME_CONFIG.colors.foam, 0.16);
  for (let y = 18; y < GAME_CONFIG.height; y += 31) {
    const offset = (Math.floor(y / 31) % 2) * 24;
    for (let x = -50 + offset; x < GAME_CONFIG.width + 40; x += 72) waves.arc(x, y, 17, Math.PI * 0.1, Math.PI * 0.9);
  }
  const highlights = scene.add.graphics();
  highlights.lineStyle(3, GAME_CONFIG.colors.waterLight, 0.13);
  for (let y = 46; y < GAME_CONFIG.height; y += 86) highlights.lineBetween(24, y, 126, y - 7);
  const depthBands=scene.add.graphics(); for(let y=110;y<GAME_CONFIG.height;y+=78) depthBands.fillStyle(y%156?0x8fc5bf:0x0c2731,.055).fillRect(0,y,GAME_CONFIG.width,22);
  const container = scene.add.container(0, 0, [water, depthBands, waves, highlights]);
  if (!REDUCED_MOTION) {
    scene.tweens.add({ targets: waves, x: 24, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: highlights, x: -18, alpha: 0.7, duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }
  if (harbour) addHarbourEdges(scene);
  return container;
}

function addHarbourEdges(scene: Phaser.Scene): void {
  const harbour = scene.add.graphics();
  harbour.fillStyle(GAME_CONFIG.colors.concrete).fillRect(0, 0, 390, 10);
  harbour.fillStyle(0x8f846d).fillRect(0, 9, 390, 4);
  harbour.fillStyle(GAME_CONFIG.colors.timber).fillRoundedRect(-8, 82, 31, 182, 4);
  harbour.fillStyle(0x4a3c32);
  for (let y = 95; y < 254; y += 28) harbour.fillRect(-2, y, 24, 4);
  harbour.fillStyle(GAME_CONFIG.colors.concrete, 0.75).fillRoundedRect(368, 470, 30, 185, 5);
  harbour.fillStyle(GAME_CONFIG.colors.ink).fillCircle(13, 92, 7).fillCircle(13, 245, 7);
  harbour.fillStyle(GAME_CONFIG.colors.gold).fillCircle(376, 505, 6);
  harbour.lineStyle(2, 0xd8cba9, 0.48).arc(13, 166, 47, -1.35, 1.2);
}
