import Phaser from 'phaser';
import { DEBUG_MODE, GAME_CONFIG, REDUCED_MOTION } from '../config/gameConfig';
import { getLevel } from '../data/levels';
import { getVehicleDefinition } from '../data/vehicles';
import type { FerryState, LaneIndex, LevelDefinition, Placement, VehicleInstance } from '../models/game';
import { BalanceSystem } from '../systems/BalanceSystem';
import { ExitSystem } from '../systems/ExitSystem';
import { FeedbackSystem } from '../systems/FeedbackSystem';
import { LevelValidator } from '../systems/LevelValidator';
import { PlacementSystem } from '../systems/PlacementSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { addButton, addPanel, addStars, addWaterBackdrop, textStyle } from '../ui/theme';
import { Sfx } from '../utils/Sfx';

interface GameSceneData { levelId?: number }

const DECK_X = 37;
const DECK_Y = 286;
const CELL_W = 60;
const CELL_H = 55;

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private state: FerryState = { placements: [] };
  private history: Placement[][] = [];
  private vehicles = new Map<string, Phaser.GameObjects.Container>();
  private ferryVisual!: Phaser.GameObjects.Container;
  private ramp!: Phaser.GameObjects.Graphics;
  private wake!: Phaser.GameObjects.Graphics;
  private exitCues: Phaser.GameObjects.GameObject[] = [];
  private placementPreview!: Phaser.GameObjects.Graphics;
  private dragGhost!: Phaser.GameObjects.Graphics;
  private feedbackText!: Phaser.GameObjects.Text;
  private balanceText!: Phaser.GameObjects.Text;
  private balanceNeedle!: Phaser.GameObjects.Triangle;
  private balancePanel!: Phaser.GameObjects.Container;
  private debugText?: Phaser.GameObjects.Text;
  private sailing = false;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.level = getLevel(data.levelId ?? 1);
    this.state = { placements: [] };
    this.history = [];
    this.vehicles.clear();
    this.exitCues = [];
    this.sailing = false;
  }

  create(): void {
    addWaterBackdrop(this);
    this.add.rectangle(195, 27, 390, 54, GAME_CONFIG.colors.navy, 0.96);
    this.add.text(19, 14, `ROUTE ${String(this.level.id).padStart(2, '0')}`, textStyle(12, '#d7e7df', 'left')).setLetterSpacing(1.4);
    this.add.text(19, 31, this.level.title.toUpperCase(), textStyle(18, '#fff7df', 'left'));
    const objective = this.level.rules.priorityExit ? '✚ AMBULANCE OUT FIRST  →' : this.level.hint;
    const objectivePanel = this.add.rectangle(195, 74, 350, 36, this.level.rules.priorityExit ? 0xf4eee0 : 0xe1ebe4, 0.98)
      .setStrokeStyle(2, this.level.rules.priorityExit ? GAME_CONFIG.colors.red : GAME_CONFIG.colors.green, 0.8);
    this.add.text(195, 74, objective, textStyle(11, this.level.rules.priorityExit ? '#8f3638' : '#355c48')).setOrigin(0.5).setWordWrapWidth(328);
    objectivePanel.setDepth(1);
    this.add.text(28, 104, this.level.rules.priorityExit ? 'PRIORITY VEHICLES' : 'WAITING VEHICLES', textStyle(11, '#fff7df', 'left')).setLetterSpacing(1.1);
    this.drawFerry();
    this.createVehicles();
    this.drawBalancePanel();
    this.createControls();
    this.placementPreview = this.add.graphics().setDepth(5);
    this.dragGhost = this.add.graphics().setDepth(6);
    this.feedbackText = this.add.text(195, 437, 'LOAD EVERY VEHICLE', textStyle(13, '#fff7df')).setOrigin(0.5)
      .setBackgroundColor('#203e4acc').setPadding(12, 5);
    this.renderState();
  }

  private drawFerry(): void {
    this.wake = this.add.graphics({ x: 195, y: DECK_Y + CELL_H }).setAlpha(0);
    this.wake.lineStyle(5, GAME_CONFIG.colors.foam, 0.6).lineBetween(-178, 72, -245, 95).lineBetween(-178, 51, -258, 54);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x0a2731, 0.32).fillEllipse(0, 16, 360, 156);
    const hull = this.add.graphics();
    hull.fillStyle(0x213c46).fillTriangle(-174, 54, 174, 54, 143, 84).fillTriangle(-174, 54, -143, 84, 143, 84);
    hull.fillStyle(0xe8ddc4).fillRoundedRect(-174, -70, 348, 135, 22);
    hull.fillStyle(0xd98245).fillRect(-166, 42, 332, 8);
    hull.lineStyle(3, 0x17313a).strokeRoundedRect(-174, -70, 348, 135, 22);
    hull.lineStyle(2, 0x6f7c77, 0.75).lineBetween(-156, -58, -156, 52).lineBetween(156, -58, 156, 52);
    const deck = this.add.graphics();
    for (let lane = 0; lane < 2; lane += 1) {
      for (let cell = 0; cell < 5; cell += 1) {
        const x = DECK_X + cell * CELL_W - 195;
        const y = DECK_Y + lane * CELL_H - (DECK_Y + CELL_H);
        deck.fillStyle(0xf6efda, 0.96).fillRoundedRect(x + 2, y + 2, CELL_W - 4, CELL_H - 5, 5);
        deck.lineStyle(1, 0x82908a, 0.45).strokeRoundedRect(x + 2, y + 2, CELL_W - 4, CELL_H - 5, 5);
      }
      deck.lineStyle(3, 0xd8ad49, 0.5).lineBetween(-150, lane * CELL_H - 24, 140, lane * CELL_H - 24);
      for (let arrowX = -105; arrowX < 130; arrowX += 74) {
        deck.fillStyle(0x49616a, 0.22).fillTriangle(arrowX, lane * CELL_H - 32, arrowX + 14, lane * CELL_H - 24, arrowX, lane * CELL_H - 16);
      }
    }
    const rail = this.add.graphics();
    rail.lineStyle(3, 0x304d56, 0.9).lineBetween(-158, -63, 142, -63).lineBetween(-158, 61, 142, 61);
    for (let x = -155; x < 150; x += 38) rail.lineBetween(x, -67, x, -58).lineBetween(x, 57, x, 66);
    const cabin = this.add.graphics();
    cabin.fillStyle(0xfffbef).fillRoundedRect(-169, -89, 62, 30, 6);
    cabin.fillStyle(0x385f69).fillRect(-158, -81, 13, 10).fillRect(-140, -81, 13, 10).fillRect(-122, -81, 8, 10);
    cabin.fillStyle(0xd98245).fillRect(-151, -96, 23, 7);
    this.ramp = this.add.graphics();
    this.ramp.fillStyle(0xb7aa8e).fillRoundedRect(147, -57, 31, 115, 5);
    this.ramp.lineStyle(3, 0x17313a).strokeRoundedRect(147, -57, 31, 115, 5);
    this.ramp.lineStyle(2, 0xf6efda, 0.75).lineBetween(153, -27, 172, -27).lineBetween(153, 27, 172, 27);
    const exitA = this.add.text(159, -25, 'EXIT  →', textStyle(10, '#fff7df')).setOrigin(0.5);
    const exitB = this.add.text(159, 29, 'EXIT  →', textStyle(10, '#fff7df')).setOrigin(0.5);
    this.exitCues = [exitA, exitB, this.ramp];
    this.ferryVisual = this.add.container(195, DECK_Y + CELL_H, [shadow, hull, deck, rail, cabin, this.ramp, exitA, exitB]);
    if (!REDUCED_MOTION) this.tweens.add({ targets: this.ferryVisual, y: '+=2', duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    for (let lane = 0; lane < 2; lane += 1) {
      for (let cell = 0; cell < 5; cell += 1) {
        const x = DECK_X + cell * CELL_W;
        const y = DECK_Y + lane * CELL_H;
        if (DEBUG_MODE) this.add.text(x + 6, y + 4, `${lane === 0 ? 'A' : 'B'}${cell + 1}`, textStyle(9, '#64777a'));
      }
    }
  }

  private createVehicles(): void {
    this.level.vehicles.forEach((vehicle, index) => {
      const definition = getVehicleDefinition(vehicle.type);
      const width = definition.length * CELL_W - 8;
      const body = this.add.graphics();
      body.fillStyle(0x0b2732, 0.28).fillEllipse(3, 20, width - 2, 17);
      if (vehicle.type === 'motorcycle') {
        body.fillStyle(0x26383b).fillCircle(-14, 11, 10).fillCircle(14, 11, 10);
        body.fillStyle(0xbcc8c3).fillCircle(-14, 11, 5).fillCircle(14, 11, 5);
        body.lineStyle(5, definition.color).lineBetween(-12, 4, 1, -10).lineBetween(1, -10, 15, 8).lineBetween(-7, 4, 10, 4);
        body.fillStyle(definition.accent).fillRoundedRect(-6, -12, 17, 7, 3).fillRect(11, -12, 4, 16);
      } else {
        const top = vehicle.type === 'van' || vehicle.type === 'ambulance' ? -25 : -20;
        const height = vehicle.type === 'truck' ? 42 : vehicle.type === 'van' || vehicle.type === 'ambulance' ? 45 : 38;
        body.fillStyle(definition.color).fillRoundedRect(-width / 2, top, width, height, vehicle.type === 'truck' ? 5 : 10);
        body.lineStyle(2, definition.accent, 0.8).strokeRoundedRect(-width / 2, top, width, height, vehicle.type === 'truck' ? 5 : 10);
        body.fillStyle(0x26383b).fillCircle(-width / 2 + 17, 18, 8).fillCircle(width / 2 - 17, 18, 8);
        body.fillStyle(0xbcc8c3).fillCircle(-width / 2 + 17, 18, 4).fillCircle(width / 2 - 17, 18, 4);
        body.fillStyle(0x315965).fillRoundedRect(width / 2 - 39, top + 6, 27, 15, 4);
        body.fillStyle(0xe5f2eb, 0.5).fillRect(width / 2 - 35, top + 8, 10, 11);
        body.fillStyle(0xf2d77c).fillCircle(width / 2 - 3, 7, 3);
        if (vehicle.type === 'car') body.fillStyle(definition.accent, 0.8).fillRoundedRect(-width / 2 + 18, top + 4, 42, 15, 7);
        if (vehicle.type === 'van') {
          body.fillStyle(0xf0e5ca, 0.45).fillRect(-width / 2 + 13, top + 7, 19, 14).fillRect(-width / 2 + 37, top + 7, 19, 14);
          body.lineStyle(2, definition.accent, 0.45).lineBetween(-3, top + 3, -3, top + height - 4);
        }
        if (vehicle.type === 'ambulance') {
          body.fillStyle(0xb94c48).fillRect(-9, top + 6, 8, 25).fillRect(-17, top + 14, 24, 8);
          body.fillStyle(0x4d91ad).fillRoundedRect(-width / 2 + 16, top - 5, 20, 7, 3);
        }
        if (vehicle.type === 'truck') {
          body.fillStyle(definition.accent, 0.85).fillRoundedRect(-width / 2 + 5, top + 4, width - 60, height - 8, 3);
          body.lineStyle(2, 0xdce0bf, 0.38).lineBetween(-width / 2 + 18, top + 5, -width / 2 + 18, top + height - 5)
            .lineBetween(-width / 2 + 37, top + 5, -width / 2 + 37, top + height - 5);
        }
      }
      const label = this.add.text(0, vehicle.type === 'ambulance' ? -35 : -5, vehicle.priority ? `◆ PRIORITY` : definition.shortLabel, textStyle(9, '#fff8e8')).setOrigin(0.5);
      if (vehicle.priority) label.setBackgroundColor('#9d3f42').setPadding(5, 2);
      const container = this.add.container(0, 0, [body, label]).setSize(width, 96).setDepth(10);
      container.setData('vehicleId', vehicle.id).setData('queueIndex', index).setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(container);
      this.bindDrag(container, vehicle);
      this.vehicles.set(vehicle.id, container);
    });
  }

  private bindDrag(container: Phaser.GameObjects.Container, vehicle: VehicleInstance): void {
    container.on('dragstart', () => {
      if (this.sailing) return;
      const placement = this.state.placements.find((item) => item.vehicleId === vehicle.id);
      this.dragGhost.clear();
      if (placement) {
        const definition = getVehicleDefinition(vehicle.type);
        const x = DECK_X + placement.startCell * CELL_W;
        const y = DECK_Y + placement.lane * CELL_H;
        this.dragGhost.lineStyle(2, GAME_CONFIG.colors.gold, 0.65).strokeRoundedRect(x + 4, y + 5, definition.length * CELL_W - 8, CELL_H - 10, 7);
      }
      container.setDepth(30).setScale(1.04).setAngle(-1.5);
      this.feedbackText.setText('LIFTED • FIND A CLEAR SLOT').setColor('#fff7df');
      FeedbackSystem.event('pickup');
    });
    container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.sailing) return;
      container.setPosition(dragX, dragY);
      this.drawPlacementPreview(vehicle, dragX, dragY);
    });
    container.on('dragend', (pointer: Phaser.Input.Pointer) => {
      if (this.sailing) return;
      this.placementPreview.clear();
      this.dragGhost.clear();
      const candidate = this.candidateAt(vehicle, pointer.worldX, pointer.worldY);
      const previous = this.state.placements.find((placement) => placement.vehicleId === vehicle.id);
      if (candidate) {
        const result = PlacementSystem.validate(this.level, this.state, candidate);
        if (result.valid) {
          const changed = !previous || previous.lane !== candidate.lane || previous.startCell !== candidate.startCell;
          if (changed) {
            this.pushHistory();
            this.state.placements = this.state.placements.filter((placement) => placement.vehicleId !== vehicle.id);
            this.state.placements.push(candidate);
            FeedbackSystem.placement(vehicle.type);
          }
        } else {
          this.showInvalid(container, result.reason === 'OVERLAP' ? 'CELL OCCUPIED' : 'DOES NOT FIT');
        }
      } else if (previous) {
        this.pushHistory();
        this.state.placements = this.state.placements.filter((placement) => placement.vehicleId !== vehicle.id);
        FeedbackSystem.placement(vehicle.type);
      } else {
        this.feedbackText.setText('DROP ON THE FERRY DECK').setColor('#fff7df');
      }
      this.renderState(vehicle.id);
    });
  }

  private candidateAt(vehicle: VehicleInstance, x: number, y: number): Placement | null {
    const definition = getVehicleDefinition(vehicle.type);
    const lane = Math.round((y - (DECK_Y + CELL_H / 2)) / CELL_H);
    if (lane < 0 || lane > 1 || y < DECK_Y - 20 || y > DECK_Y + CELL_H * 2 + 20) return null;
    const startCell = Math.round((x - DECK_X - definition.length * CELL_W / 2) / CELL_W);
    if (x < DECK_X - 20 || x > DECK_X + CELL_W * 5 + 20) return null;
    return { vehicleId: vehicle.id, lane: lane as LaneIndex, startCell };
  }

  private drawPlacementPreview(vehicle: VehicleInstance, x: number, y: number): void {
    this.placementPreview.clear();
    const candidate = this.candidateAt(vehicle, x, y);
    if (!candidate) return;
    const definition = getVehicleDefinition(vehicle.type);
    const valid = PlacementSystem.validate(this.level, this.state, candidate).valid;
    this.feedbackText.setText(valid ? '✓ CLEAR SLOT • RELEASE TO LOAD' : '✕ SLOT BLOCKED').setColor(valid ? '#d9ffd6' : '#ffd0c5');
    const px = DECK_X + candidate.startCell * CELL_W;
    const py = DECK_Y + candidate.lane * CELL_H;
    this.placementPreview.fillStyle(valid ? GAME_CONFIG.colors.green : GAME_CONFIG.colors.red, 0.38)
      .fillRoundedRect(px + 2, py + 2, definition.length * CELL_W - 4, CELL_H - 4, 8);
    this.placementPreview.lineStyle(3, valid ? 0xc4f0c4 : 0xffbbb2, 0.9)
      .strokeRoundedRect(px + 2, py + 2, definition.length * CELL_W - 4, CELL_H - 4, 8);
  }

  private renderState(animatedVehicleId?: string): void {
    this.level.vehicles.forEach((vehicle, index) => {
      const container = this.vehicles.get(vehicle.id);
      if (!container) return;
      const placement = this.state.placements.find((item) => item.vehicleId === vehicle.id);
      if (placement) {
        const length = getVehicleDefinition(vehicle.type).length;
        const targetX = DECK_X + placement.startCell * CELL_W + length * CELL_W / 2;
        const targetY = DECK_Y + placement.lane * CELL_H + CELL_H / 2;
        if (animatedVehicleId === vehicle.id && !REDUCED_MOTION) {
          this.tweens.add({ targets: container, x: targetX, y: targetY, scale: 0.92, angle: 0, duration: 190, ease: 'Back.out' });
        } else container.setPosition(targetX, targetY).setScale(0.92).setAngle(0);
        container.setDepth(10);
      } else {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const targetX = 66 + column * 129;
        const targetY = 146 + row * 72;
        if (animatedVehicleId === vehicle.id && !REDUCED_MOTION) {
          this.tweens.add({ targets: container, x: targetX, y: targetY, scale: 0.57, angle: 0, duration: 180, ease: 'Sine.out' });
        } else container.setPosition(targetX, targetY).setScale(0.57).setAngle(0);
        container.setDepth(10);
      }
    });
    this.updateBalance(animatedVehicleId !== undefined);
    if (animatedVehicleId && !REDUCED_MOTION) {
      const vehicle = this.level.vehicles.find((item) => item.id === animatedVehicleId);
      const weight = vehicle ? getVehicleDefinition(vehicle.type).weight : 1;
      this.tweens.add({ targets: this.ferryVisual, scaleY: 1 - weight * 0.006, duration: 90, yoyo: true, ease: 'Sine.inOut' });
    }
  }

  private drawBalancePanel(): void {
    this.balancePanel = addPanel(this, 195, 505, 350, 94);
    this.add.text(36, 469, '◀  PORT', textStyle(10, '#52666b')).setOrigin(0, 0.5);
    this.add.text(354, 469, 'STARBOARD  ▶', textStyle(10, '#52666b')).setOrigin(1, 0.5);
    const balanceTrack = this.add.graphics();
    balanceTrack.lineStyle(7, 0xd8d0bd, 1).lineBetween(64, 496, 326, 496);
    balanceTrack.lineStyle(3, 0x6f8786, 1).lineBetween(64, 496, 326, 496);
    balanceTrack.fillStyle(GAME_CONFIG.colors.red, 0.65).fillCircle(64, 496, 5).fillCircle(326, 496, 5);
    balanceTrack.fillStyle(GAME_CONFIG.colors.green).fillCircle(195, 496, 6);
    this.balanceNeedle = this.add.triangle(195, 486, 0, 0, 16, 0, 8, 13, GAME_CONFIG.colors.orange).setOrigin(0.5)
      .setStrokeStyle(2, GAME_CONFIG.colors.ink);
    this.balanceText = this.add.text(195, 526, '● PERFECT • EVEN', textStyle(14, '#2f704d')).setOrigin(0.5);
  }

  private updateBalance(animate = false): void {
    if (!this.balanceText) return;
    const result = BalanceSystem.calculate(this.level, this.state);
    const maximum = Math.max(this.level.ferry.balanceTolerance + 3, 6);
    const needleX = 195 + Phaser.Math.Clamp(result.value / maximum, -1, 1) * 124;
    const color = result.label === 'PERFECT' || result.label === 'SAFE' ? '#2f704d' : result.label === 'WARNING' ? '#9b691e' : '#af3f43';
    const icon = result.label === 'PERFECT' || result.label === 'SAFE' ? '●' : result.label === 'WARNING' ? '▲' : '✕';
    this.balanceText.setText(`${icon} ${result.label} • ${result.value === 0 ? 'EVEN' : result.value < 0 ? 'HEAVY PORT' : 'HEAVY STARBOARD'}`).setColor(color);
    const tilt = Phaser.Math.Clamp(result.value * 0.75, -4, 4);
    if (animate && !REDUCED_MOTION) {
      this.tweens.add({ targets: this.balanceNeedle, x: needleX, duration: 230, ease: 'Sine.out' });
      this.tweens.add({ targets: this.ferryVisual, angle: tilt, duration: 280, ease: 'Back.out' });
    } else {
      this.balanceNeedle.x = needleX;
      this.ferryVisual.setAngle(tilt);
    }
    if (this.debugText) this.debugText.setText(`balance=${result.value}  loaded=${this.state.placements.length}/${this.level.vehicles.length}`);
  }

  private createControls(): void {
    addButton(this, 195, 580, 202, 58, '⚓  SAIL', () => this.attemptSail(), 'primary');
    addButton(this, 72, 646, 108, 48, '↶  UNDO', () => this.undo(), 'secondary');
    addButton(this, 195, 646, 108, 48, '↺  RESET', () => this.resetLevel(), 'quiet');
    addButton(this, 318, 646, 108, 48, '≡  ROUTES', () => this.scene.start('LevelSelect'), 'secondary');
    if (DEBUG_MODE) this.debugText = this.add.text(8, 682, '', textStyle(10, '#ffffff', 'left')).setAlpha(0.75);
  }

  private attemptSail(): void {
    if (this.sailing) return;
    Sfx.play('button');
    const validation = LevelValidator.validate(this.level, this.state);
    if (!validation.valid) {
      FeedbackSystem.event('failure');
      if (validation.code === 'PRIORITY_BLOCKED' && validation.blockedVehicleId && validation.blockerVehicleId) {
        this.showBlockedFailure(validation.blockedVehicleId, validation.blockerVehicleId);
      } else {
        this.feedbackText.setText(`✕ ${validation.message}`).setColor('#ffd0c5');
        if (validation.code === 'UNBALANCED') {
          Sfx.play('warning');
          this.tweens.add({ targets: [this.balancePanel, this.balanceNeedle], x: '+=5', duration: 55, yoyo: true, repeat: 3 });
        } else if (validation.code === 'VEHICLE_STILL_WAITING') {
          const waiting = this.level.vehicles.find((vehicle) => !this.state.placements.some((placement) => placement.vehicleId === vehicle.id));
          if (waiting) this.pulseVehicle(waiting.id);
        }
        this.tweens.add({ targets: this.feedbackText, x: { from: 188, to: 202 }, duration: 55, yoyo: true, repeat: 3 });
      }
      return;
    }
    this.sailing = true;
    this.feedbackText.setText('✓ MANIFEST CLEAR • RAMP CLOSING').setColor('#d9ffd6');
    Sfx.play('ramp');
    const order = ExitSystem.unloadingOrder(this.level, this.state);
    this.tweens.add({ targets: this.ramp, scaleX: 0.22, duration: REDUCED_MOTION ? 1 : 240, ease: 'Sine.in', onComplete: () => {
      Sfx.play('horn');
      this.feedbackText.setText('FERRY AWAY • NEXT STOP HARBOUR').setColor('#d9ffd6');
      this.wake.setAlpha(1);
      Sfx.play('wake');
      this.tweens.add({
        targets: [this.ferryVisual, this.wake, ...this.vehicles.values()], x: '+=20', duration: REDUCED_MOTION ? 1 : 650,
        ease: 'Sine.inOut', onComplete: () => this.time.delayedCall(REDUCED_MOTION ? 1 : 320, () => this.animateUnload(order)),
      });
    } });
  }

  private animateUnload(order: Placement[]): void {
    const tweens = order.flatMap((placement) => {
      const container = this.vehicles.get(placement.vehicleId);
      return container ? [{ targets: container, x: 438, duration: REDUCED_MOTION ? 1 : 150, ease: 'Sine.in' }] : [];
    });
    this.feedbackText.setText(this.level.rules.priorityExit ? 'RAMP OPEN • PRIORITY VEHICLE FIRST' : 'RAMP OPEN • UNLOADING').setColor('#d9ffd6');
    Sfx.play('ramp');
    this.tweens.add({ targets: this.ramp, scaleX: 1, duration: REDUCED_MOTION ? 1 : 220, ease: 'Sine.out', onComplete: () => {
      this.tweens.chain({ targets: [], tweens, onComplete: () => this.finishLevel() });
    } });
  }

  private finishLevel(): void {
    const stars = ScoreSystem.stars(this.level, this.state);
    SaveSystem.recordCompletion(this.level.id, stars);
    FeedbackSystem.event('success');
    const shade = this.add.rectangle(195, 350, 390, 700, 0x102a32, 0.78).setDepth(90);
    const panel = addPanel(this, 195, 342, 336, 348, 91);
    this.add.text(195, 212, 'HARBOUR ARRIVAL', textStyle(11, '#6a7b77')).setOrigin(0.5).setDepth(92).setLetterSpacing(1.7);
    this.add.text(195, 242, 'CROSSING COMPLETE', textStyle(25)).setOrigin(0.5).setDepth(92);
    addStars(this, 195, 299, stars, 43).setDepth(92);
    this.add.text(195, 347, stars === 3 ? '● PERFECTLY BALANCED' : stars === 2 ? '● GOOD BALANCE' : '● SAFE ARRIVAL', textStyle(14, '#4f765e')).setOrigin(0.5).setDepth(92);
    const nextLevel = Math.min(10, this.level.id + 1);
    const next = addButton(this, 195, 416, 226, 54, this.level.id === 10 ? 'HARBOUR ROUTES' : `NEXT • ROUTE ${nextLevel}`, () => {
      this.scene.start(this.level.id === 10 ? 'LevelSelect' : 'Game', this.level.id === 10 ? undefined : { levelId: nextLevel });
    });
    next.setDepth(93);
    const retry = addButton(this, 195, 480, 168, 46, 'REPLAY', () => this.scene.restart({ levelId: this.level.id }), 'secondary');
    retry.setDepth(93);
    shade.setInteractive();
    panel.setInteractive();
  }

  private pushHistory(): void {
    this.history.push(this.state.placements.map((placement) => ({ ...placement })));
  }

  private undo(): void {
    if (this.sailing) return;
    const previous = this.history.pop();
    if (!previous) {
      this.feedbackText.setText('NOTHING TO UNDO').setColor('#fff7df');
      return;
    }
    this.state.placements = previous;
    this.feedbackText.setText('LAST MOVE UNDONE').setColor('#d9ffd6');
    FeedbackSystem.event('undo');
    this.renderState();
  }

  private resetLevel(): void {
    if (this.sailing || this.state.placements.length === 0) return;
    this.pushHistory();
    this.state.placements = [];
    this.feedbackText.setText('DECK RESET').setColor('#fff7df');
    FeedbackSystem.event('reset');
    this.renderState();
  }

  private showInvalid(container: Phaser.GameObjects.Container, message: string): void {
    this.feedbackText.setText(`✕ ${message}`).setColor('#ffd0c5');
    FeedbackSystem.event('invalid');
    this.tweens.add({ targets: container, angle: { from: -4, to: 4 }, duration: 45, yoyo: true, repeat: 3, onComplete: () => container.setAngle(0) });
  }

  private showBlockedFailure(blockedVehicleId: string, blockerVehicleId: string): void {
    const blocked = this.vehicles.get(blockedVehicleId);
    const blocker = this.vehicles.get(blockerVehicleId);
    this.feedbackText.setText('✕ AMBULANCE BLOCKED • CLEAR PATH TO EXIT →').setColor('#ffd0c5');
    if (blocked) {
      const halo = this.add.ellipse(blocked.x, blocked.y, blocked.displayWidth + 18, 60, 0xf6e8a6, 0.14).setStrokeStyle(4, 0xf6e8a6, 0.95).setDepth(9);
      this.tweens.add({ targets: [blocked, halo], scaleX: '+=0.05', scaleY: '+=0.05', alpha: { from: 0.75, to: 1 }, duration: 130, yoyo: true, repeat: 2, onComplete: () => halo.destroy() });
    }
    if (blocker) {
      const blockerHalo = this.add.rectangle(blocker.x, blocker.y, blocker.displayWidth + 15, 58, 0xb94c48, 0.1).setStrokeStyle(4, GAME_CONFIG.colors.red).setDepth(9);
      this.tweens.add({ targets: [blocker, blockerHalo], angle: { from: -3, to: 3 }, duration: 65, yoyo: true, repeat: 4, onComplete: () => { blocker.setAngle(0); blockerHalo.destroy(); } });
    }
    this.exitCues.forEach((cue, index) => this.tweens.add({ targets: cue, alpha: { from: 0.35, to: 1 }, scale: { from: 0.96, to: 1.08 }, duration: 140, delay: index * 40, yoyo: true, repeat: 2 }));
  }

  private pulseVehicle(vehicleId: string): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) this.tweens.add({ targets: vehicle, scaleX: 1.05, scaleY: 1.05, duration: 120, yoyo: true, repeat: 2 });
  }
}
