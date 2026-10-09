import Phaser from 'phaser';
import { DEBUG_MODE, GAME_CONFIG, REDUCED_MOTION } from '../config/gameConfig';
import { getLevel } from '../data/levels';
import { getVehicleDefinition } from '../data/vehicles';
import { getPortMetadata, portFullName, portShortName } from '../data/ports';
import type { AttemptMetrics, FerryState, LaneIndex, LevelDefinition, ManifestState, Placement, RouteLegDefinition, VehicleInstance } from '../models/game';
import { BalanceSystem } from '../systems/BalanceSystem';
import { ExitSystem } from '../systems/ExitSystem';
import { FeedbackSystem } from '../systems/FeedbackSystem';
import { LevelValidator } from '../systems/LevelValidator';
import { PlacementSystem } from '../systems/PlacementSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { RouteSystem } from '../systems/RouteSystem';
import { TideSystem } from '../systems/TideSystem';
import { ManifestSystem } from '../systems/ManifestSystem';
import { findLevelVehicle } from '../systems/LevelVehicleCatalog';
import { LevelSolver } from '../systems/LevelSolver';
import { MasterySystem } from '../systems/MasterySystem';
import { addButton, addMasteryMark, addPanel, addStars, addWaterBackdrop, textStyle } from '../ui/theme';
import { Sfx } from '../utils/Sfx';
import { JourneyPresentation } from '../views/JourneyPresentation';

interface GameSceneData { levelId?: number; attemptMetrics?: AttemptMetrics }

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
  private routeText?: Phaser.GameObjects.Text;
  private tideText?: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private masteryText?: Phaser.GameObjects.Text;
  private attemptMetrics: AttemptMetrics = MasterySystem.initialMetrics();
  private manifestState?: ManifestState;
  private scoringState: FerryState = { placements: [] };
  private sailing = false;
  private journey!: JourneyPresentation;

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
    this.manifestState = this.level.pickups?.length ? ManifestSystem.initialState(this.level) : undefined;
    this.scoringState = { placements: [] };
    this.attemptMetrics = data.attemptMetrics ? { ...data.attemptMetrics } : MasterySystem.initialMetrics();
  }

  create(): void {
    addWaterBackdrop(this, false);
    this.journey = new JourneyPresentation(this, this.level.route?.startPort ?? 'A');
    this.add.rectangle(195, 27, 390, 54, GAME_CONFIG.colors.navy, 0.96);
    this.add.text(19, 14, `ROUTE ${String(this.level.id).padStart(2, '0')}`, textStyle(12, '#d7e7df', 'left')).setLetterSpacing(1.4);
    this.add.text(19, 31, this.level.title.toUpperCase(), textStyle(18, '#fff7df', 'left'));
    if (this.level.route) {
      this.routeText = this.add.text(371, 21, this.formatRoute(RouteSystem.nextPort(this.level)), textStyle(11, '#d9eee5', 'right')).setOrigin(1, 0.5);
      if (this.level.route.legs?.length) {
        this.tideText = this.add.text(371, 42, '', textStyle(10, '#ffe8ad', 'right')).setOrigin(1, 0.5);
        this.updateTideHud(this.level.route.legs[0]);
      }
    }
    const nextPort = RouteSystem.nextPort(this.level);
    const objective = this.level.rules.priorityExit
      ? `✚ ${nextPort ? `${portFullName(nextPort).toUpperCase()} • ` : ''}AMBULANCE OUT FIRST  →`
      : this.level.hint;
    const objectivePanel = this.add.rectangle(195, 74, 350, 36, this.level.rules.priorityExit ? 0xf4eee0 : 0xe1ebe4, 0.98)
      .setStrokeStyle(2, this.level.rules.priorityExit ? GAME_CONFIG.colors.red : GAME_CONFIG.colors.green, 0.8);
    this.objectiveText = this.add.text(195, 74, this.manifestState ? this.manifestForecast() : objective, textStyle(this.manifestState ? 9 : 11, this.level.rules.priorityExit ? '#8f3638' : '#355c48')).setOrigin(0.5).setWordWrapWidth(328).setDepth(2);
    objectivePanel.setDepth(1);
    if (this.level.mastery) this.masteryText = this.add.text(195, 101, `MASTERY • ${MasterySystem.description(this.level.mastery)}`, textStyle(9, '#ffe09a')).setOrigin(0.5);
    this.add.text(28, this.level.mastery ? 119 : 104, this.level.rules.priorityExit ? 'PRIORITY VEHICLES' : 'WAITING VEHICLES', textStyle(11, '#fff7df', 'left')).setLetterSpacing(1.1);
    this.drawFerry();
    this.createVehicles();
    this.drawBalancePanel();
    this.createControls();
    this.placementPreview = this.add.graphics().setDepth(5);
    this.dragGhost = this.add.graphics().setDepth(6);
    this.feedbackText = this.add.text(195, 437, 'LOAD EVERY VEHICLE', textStyle(13, '#fff7df')).setOrigin(0.5)
      .setBackgroundColor('#203e4acc').setPadding(12, 5);
    this.renderState();
    const debugParams = new URLSearchParams(window.location.search);
    if (DEBUG_MODE && debugParams.has('solve')) this.time.delayedCall(0, () => {
      this.debugLoadSolution();
      if (debugParams.has('sail')) this.time.delayedCall(120, () => this.attemptSail());
    });
  }

  private drawFerry(): void {
    this.wake = this.add.graphics({ x: 195, y: DECK_Y + CELL_H }).setAlpha(0);
    this.wake.lineStyle(5, GAME_CONFIG.colors.foam, 0.6).lineBetween(-178, 72, -245, 95).lineBetween(-178, 51, -258, 54);
    const ferry = this.add.image(0, 0, 'ferry').setDisplaySize(360, 180);
    this.ramp = this.add.graphics().setVisible(false);
    const exitA = this.add.text(159, -25, 'EXIT  →', textStyle(10, '#fff7df')).setOrigin(0.5);
    const exitB = this.add.text(159, 29, 'EXIT  →', textStyle(10, '#fff7df')).setOrigin(0.5);
    this.exitCues = [exitA, exitB];
    this.ferryVisual = this.add.container(195, DECK_Y + CELL_H, [ferry, this.ramp, exitA, exitB]);
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
    ManifestSystem.allVehicles(this.level).forEach((vehicle, index) => {
      const definition = getVehicleDefinition(vehicle.type);
      const width = definition.length * CELL_W - 8;
      const body = this.add.image(0, 0, `vehicle-${vehicle.type}`);
      const targetWidth = vehicle.type === 'motorcycle' ? 52 : width;
      const artScale = Math.min(targetWidth / body.width, 64 / body.height);
      body.setScale(artScale);
      const label = this.add.text(0, vehicle.type === 'ambulance' ? -35 : -5, vehicle.priority ? 'PRIORITY' : definition.shortLabel, textStyle(9, '#fff8e8')).setOrigin(0.5);
      if (vehicle.priority) label.setBackgroundColor('#9d3f42').setPadding(5, 2);
      let badge: Phaser.GameObjects.Container | undefined;
      if (vehicle.destination) {
        const port = getPortMetadata(vehicle.destination);
        const badgeWidth = port.shortName.length > 3 ? 42 : 36;
        const badgeBg = this.add.rectangle(0, 0, badgeWidth, 21, port.badgeColor, 1).setStrokeStyle(2, 0xfff6df, 0.95);
        const badgeLabel = this.add.text(0, 0, port.shortName, textStyle(10, `#${port.badgeTextColor.toString(16).padStart(6, '0')}`)).setOrigin(0.5);
        badge = this.add.container(vehicle.type === 'motorcycle' ? 0 : width / 2 - 21, vehicle.type === 'motorcycle' ? -30 : 1, [badgeBg, badgeLabel]).setDepth(3);
      }
      const lock = this.add.text(-width / 2 + 15, -29, 'LOCK', textStyle(7, '#fff4c7')).setOrigin(0.5).setBackgroundColor('#203e4a').setPadding(4, 2).setVisible(false);
      const container = this.add.container(0, 0, badge ? [body, label, badge, lock] : [body, label, lock]).setSize(width, 96).setDepth(10);
      if (badge) container.setData('destinationBadge', badge);
      container.setData('lockBadge', lock);
      container.setData('vehicleId', vehicle.id).setData('queueIndex', index).setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(container);
      this.bindDrag(container, vehicle);
      this.vehicles.set(vehicle.id, container);
    });
  }

  private bindDrag(container: Phaser.GameObjects.Container, vehicle: VehicleInstance): void {
    container.on('pointerdown', () => {
      if (this.manifestState?.lockedVehicleIds.includes(vehicle.id)) this.feedbackText.setText('THROUGH CARGO • LOCKED').setColor('#fff7df');
    });
    container.on('dragstart', () => {
      if (this.sailing) return;
      if (this.manifestState && !ManifestSystem.canManipulate(this.manifestState, vehicle.id)) return;
      const placement = this.state.placements.find((item) => item.vehicleId === vehicle.id);
      this.dragGhost.clear();
      if (placement) {
        const definition = getVehicleDefinition(vehicle.type);
        const x = DECK_X + placement.startCell * CELL_W;
        const y = DECK_Y + placement.lane * CELL_H;
        this.dragGhost.lineStyle(2, GAME_CONFIG.colors.gold, 0.65).strokeRoundedRect(x + 4, y + 5, definition.length * CELL_W - 8, CELL_H - 10, 7);
      }
      container.setDepth(30).setScale(1.04).setAngle(-1.5);
      this.setBadgeScreenScale(container, 1.04);
      this.feedbackText.setText('LIFTED • FIND A CLEAR SLOT').setColor('#fff7df');
      FeedbackSystem.event('pickup');
    });
    container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.sailing) return;
      if (this.manifestState && !ManifestSystem.canManipulate(this.manifestState, vehicle.id)) return;
      container.setPosition(dragX, dragY);
      this.drawPlacementPreview(vehicle, dragX, dragY);
    });
    container.on('dragend', (pointer: Phaser.Input.Pointer) => {
      if (this.sailing) return;
      if (this.manifestState && !ManifestSystem.canManipulate(this.manifestState, vehicle.id)) {
        this.renderState();
        return;
      }
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
            this.trackMastery(previous ? 'reposition' : 'placement');
          }
        } else {
          this.showInvalid(container, result.reason === 'OVERLAP' ? 'CELL OCCUPIED' : 'DOES NOT FIT');
        }
      } else if (previous) {
        this.pushHistory();
        this.state.placements = this.state.placements.filter((placement) => placement.vehicleId !== vehicle.id);
        FeedbackSystem.placement(vehicle.type);
        this.trackMastery('return');
      } else {
        this.feedbackText.setText('DROP ON THE FERRY DECK').setColor('#fff7df');
      }
      this.renderState(vehicle.id);
      if (this.manifestState) this.manifestState = { ...this.manifestState, ferry: this.state };
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
    const visibleVehicles = this.manifestState
      ? ManifestSystem.allVehicles(this.level).filter((vehicle) => this.manifestState!.waitingVehicleIds.includes(vehicle.id) || this.state.placements.some((placement) => placement.vehicleId === vehicle.id))
      : this.level.vehicles;
    ManifestSystem.allVehicles(this.level).forEach((vehicle) => {
      const container = this.vehicles.get(vehicle.id);
      if (!container) return;
      const visibleIndex = visibleVehicles.findIndex((item) => item.id === vehicle.id);
      if (visibleIndex < 0) {
        container.setVisible(false).disableInteractive();
        return;
      }
      container.setVisible(true).setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(container);
      const locked = this.manifestState?.lockedVehicleIds.includes(vehicle.id) ?? false;
      (container.getData('lockBadge') as Phaser.GameObjects.Text | undefined)?.setVisible(locked);
      const placement = this.state.placements.find((item) => item.vehicleId === vehicle.id);
      if (placement) {
        const length = getVehicleDefinition(vehicle.type).length;
        const targetX = DECK_X + placement.startCell * CELL_W + length * CELL_W / 2;
        const targetY = DECK_Y + placement.lane * CELL_H + CELL_H / 2;
        if (animatedVehicleId === vehicle.id && !REDUCED_MOTION) {
          this.tweens.add({ targets: container, x: targetX, y: targetY, scale: 0.92, angle: 0, duration: 190, ease: 'Back.out' });
        } else container.setPosition(targetX, targetY).setScale(0.92).setAngle(0);
        this.setBadgeScreenScale(container, 0.92);
        container.setDepth(10);
      } else {
        const column = visibleIndex % 3;
        const row = Math.floor(visibleIndex / 3);
        const targetX = 66 + column * 129;
        const targetY = 146 + row * 72;
        if (animatedVehicleId === vehicle.id && !REDUCED_MOTION) {
          this.tweens.add({ targets: container, x: targetX, y: targetY, scale: 0.57, angle: 0, duration: 180, ease: 'Sine.out' });
        } else container.setPosition(targetX, targetY).setScale(0.57).setAngle(0);
        this.setBadgeScreenScale(container, 0.57);
        container.setDepth(10);
      }
    });
    this.updateBalance(animatedVehicleId !== undefined);
    if (animatedVehicleId && !REDUCED_MOTION) {
      const vehicle = findLevelVehicle(this.level, animatedVehicleId);
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
    if (this.debugText) {
      const nextPort = RouteSystem.nextPort(this.level);
      const leg = this.level.route?.legs?.[0];
      const tide = leg ? TideSystem.evaluateLeg(this.level, this.state, leg) : undefined;
      const manifest = this.manifestState;
      const future = manifest ? (this.level.pickups ?? []).filter((pickup) => (this.level.route?.ports.indexOf(pickup.port) ?? 0) > manifest.portIndex).reduce((sum, pickup) => sum + pickup.vehicles.length, 0) : 0;
      this.debugText.setText(`bal=${result.value} load=${this.state.placements.length}/${ManifestSystem.allVehicles(this.level).length}${nextPort ? ` next=${nextPort}:${portShortName(nextPort)}` : ''}${tide ? ` leg=${leg?.from}>${leg?.to} ${leg?.tide} wt=${tide.totalWeight} heel=${tide.heelDraftPenalty} draft=${tide.effectiveDraft}/${tide.maxDraft} ${tide.safe ? 'PASS' : 'FAIL'}` : ''}${manifest ? ` port=${this.level.route?.ports[manifest.portIndex]} phase=${manifest.phase} locked=${manifest.lockedVehicleIds.join(',')} pickup=${manifest.waitingVehicleIds.join(',')} future=${future} delivered=${manifest.deliveredVehicleIds.join(',')}` : ''}`);
    }
  }

  private createControls(): void {
    addButton(this, this.manifestState ? 155 : 195, 580, this.manifestState ? 184 : 202, 58, 'SAIL', () => this.attemptSail(), 'primary');
    if (this.manifestState) addButton(this, 326, 580, 104, 50, 'RESTART ROUTE', () => this.restartRoute(), 'quiet');
    addButton(this, 72, 646, 108, 48, 'UNDO', () => this.undo(), 'secondary'); addButton(this, 195, 646, 108, 48, 'RESET', () => this.resetLevel(), 'quiet'); addButton(this, 318, 646, 108, 48, 'ROUTES', () => this.scene.start('LevelSelect'), 'secondary');
    if (DEBUG_MODE) {
      this.debugText = this.add.text(8, 682, '', textStyle(10, '#ffffff', 'left')).setAlpha(0.75);
      this.input.keyboard?.on('keydown-S', () => this.debugLoadSolution());
    }
  }

  private attemptSail(): void {
    if (this.sailing) return;
    if (this.manifestState) {
      this.attemptManifestSail();
      return;
    }
    Sfx.play('button');
    const validation = LevelValidator.validate(this.level, this.state);
    if (!validation.valid) {
      FeedbackSystem.event('failure');
      if ((validation.code === 'PRIORITY_BLOCKED' || validation.code === 'DESTINATION_BLOCKED') && validation.blockedVehicleId && validation.blockerVehicleId) {
        this.showBlockedFailure(validation.blockedVehicleId, validation.blockerVehicleId, validation.message);
      } else if (validation.code === 'TIDE_UNSAFE' && validation.tideFailure) {
        this.showTideFailure(validation.tideFailure);
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
    const route = RouteSystem.simulate(this.level, this.state);
    this.tweens.add({ targets: this.ramp, scaleX: 0.22, duration: REDUCED_MOTION ? 1 : 240, ease: 'Sine.in', onComplete: () => {
      Sfx.play('horn');
      this.feedbackText.setText('FERRY AWAY • NEXT STOP HARBOUR').setColor('#d9ffd6');
      this.wake.setAlpha(1);
      Sfx.play('wake');
      this.tweens.add({
        targets: [this.ferryVisual, this.wake, ...this.vehicles.values()], x: '+=20', duration: REDUCED_MOTION ? 1 : 650,
        ease: 'Sine.inOut', onComplete: () => this.time.delayedCall(REDUCED_MOTION ? 1 : 320, () => {
          if (this.level.route) this.animateRoute(route.stops, 0);
          else this.animateUnload(order);
        }),
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

  private animateRoute(stops: ReturnType<typeof RouteSystem.simulate>['stops'], index: number): void {
    const stop = stops[index];
    if (!stop) {
      this.finishLevel();
      return;
    }
    this.feedbackText.setText(`OPEN WATER • APPROACHING ${portFullName(stop.port).toUpperCase()}`).setColor('#d9ffd6'); this.journey.travelTo(stop.port,()=>this.animateRouteArrival(stops,index));
  }
  private animateRouteArrival(stops: ReturnType<typeof RouteSystem.simulate>['stops'], index: number): void {
    const stop=stops[index]; if(!stop)return; this.routeText?.setText(this.formatRoute(stop.port));
    const departingLeg = this.level.route?.legs?.find((leg) => leg.from === stop.port);
    this.updateTideHud(departingLeg);
    this.feedbackText.setText(`${portFullName(stop.port).toUpperCase()} • UNLOADING ${stop.unloadedVehicleIds.length}`).setColor('#d9ffd6');
    Sfx.play('ramp');
    const tweens = stop.unloadedVehicleIds.flatMap((vehicleId) => {
      const container = this.vehicles.get(vehicleId);
      return container ? [{ targets: container, x: 438, alpha: 0, duration: REDUCED_MOTION ? 1 : 180, ease: 'Sine.in' }] : [];
    });
    this.tweens.chain({
      targets: [],
      tweens,
      onComplete: () => {
        const next = stops[index + 1];
        if (!next) this.finishLevel();
        else this.time.delayedCall(REDUCED_MOTION ? 1 : 320, () => {
          this.routeText?.setText(this.formatRoute(next.port));
          this.feedbackText.setText(`DEPARTING FOR ${portFullName(next.port).toUpperCase()}`).setColor('#d9ffd6');
          Sfx.play('horn');
          this.time.delayedCall(REDUCED_MOTION ? 1 : 420, () => this.animateRoute(stops, index + 1));
        });
      },
    });
  }

  private finishLevel(): void {
    const stars = ScoreSystem.stars(this.level, this.manifestState ? this.scoringState : this.state);
    const before = SaveSystem.load();
    const masteryEarned = MasterySystem.evaluate(this.level.mastery, this.attemptMetrics, this.level, this.manifestState ? this.scoringState : this.state);
    SaveSystem.recordCompletion(this.level.id, stars);
    if (masteryEarned) SaveSystem.recordMastery(this.level.id);
    const firstChapterCompletion = this.level.id % 10 === 0 && !before.stars[String(this.level.id)];
    FeedbackSystem.event('success');
    const shade = this.add.rectangle(195, 350, 390, 700, 0x102a32, 0.78).setDepth(90);
    const panel = addPanel(this, 195, 350, 336, 382, 91);
    const finalPort = this.level.route?.ports.at(-1);
    this.add.text(195, 196, firstChapterCompletion ? `CHAPTER COMPLETE • ${['THE CROSSING', 'PORT HOPPER', 'TIDAL PASSAGE', 'HARBOUR EXCHANGE', 'MASTER ROUTES'][Math.floor((this.level.id - 1) / 10)]}` : finalPort ? `ARRIVED • ${portFullName(finalPort).toUpperCase()}` : 'HARBOUR ARRIVAL', textStyle(10, '#6a7b77')).setOrigin(0.5).setDepth(92).setLetterSpacing(1.1);
    this.add.text(195, 242, 'CROSSING COMPLETE', textStyle(25)).setOrigin(0.5).setDepth(92);
    addStars(this, 195, 299, stars, 43).setDepth(92);
    this.add.text(195, 347, stars === 3 ? '● PERFECTLY BALANCED' : stars === 2 ? '● GOOD BALANCE' : '● SAFE ARRIVAL', textStyle(14, '#4f765e')).setOrigin(0.5).setDepth(92);
    if (this.level.mastery) { if(masteryEarned)addMasteryMark(this,83,377,17).setDepth(92); this.add.text(195,377,masteryEarned?`MASTERED • ${MasterySystem.description(this.level.mastery)}`:`MASTERY NOT EARNED • ${MasterySystem.description(this.level.mastery)}`,textStyle(11,masteryEarned?'#8b6824':'#6a7b77')).setOrigin(.5).setDepth(92); }
    const nextLevel = Math.min(50, this.level.id + 1);
    const next = addButton(this, 195, 426, 226, 54, this.level.id === 50 ? 'MASTER ROUTES' : `NEXT • ROUTE ${nextLevel}`, () => {
      this.scene.start(this.level.id === 50 ? 'LevelSelect' : 'Game', this.level.id === 50 ? { chapter: 4 } : { levelId: nextLevel });
    });
    next.setDepth(93);
    const retry = addButton(this, 195, 491, 168, 46, masteryEarned || !this.level.mastery ? 'REPLAY' : 'TRY MASTERY', () => this.scene.restart({ levelId: this.level.id }), 'secondary');
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
    this.trackMastery('undo');
    if (this.manifestState) this.manifestState = { ...this.manifestState, ferry: this.state };
    this.feedbackText.setText('LAST MOVE UNDONE').setColor('#d9ffd6');
    FeedbackSystem.event('undo');
    this.renderState();
  }

  private resetLevel(): void {
    if (this.sailing || this.state.placements.length === 0) return;
    if (this.manifestState?.phase === 'pickup') {
      this.manifestState = ManifestSystem.resetPickup({ ...this.manifestState, ferry: this.state });
      this.state = this.manifestState.ferry;
      this.history = [];
      this.trackMastery('reset');
      this.feedbackText.setText('CURRENT PICKUP RESET').setColor('#fff7df');
      FeedbackSystem.event('reset');
      this.renderState();
      return;
    }
    this.pushHistory();
    this.state.placements = [];
    this.trackMastery('reset');
    if (this.manifestState) this.manifestState = { ...this.manifestState, ferry: this.state };
    this.feedbackText.setText('DECK RESET').setColor('#fff7df');
    FeedbackSystem.event('reset');
    this.renderState();
  }

  private showInvalid(container: Phaser.GameObjects.Container, message: string): void {
    this.trackMastery('invalidDrop');
    this.feedbackText.setText(`✕ ${message}`).setColor('#ffd0c5');
    FeedbackSystem.event('invalid');
    this.tweens.add({ targets: container, angle: { from: -4, to: 4 }, duration: 45, yoyo: true, repeat: 3, onComplete: () => container.setAngle(0) });
  }

  private showBlockedFailure(blockedVehicleId: string, blockerVehicleId: string, message: string): void {
    const blocked = this.vehicles.get(blockedVehicleId);
    const blocker = this.vehicles.get(blockerVehicleId);
    this.feedbackText.setText(`✕ ${message} • CLEAR EXIT →`).setColor('#ffd0c5');
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

  private formatRoute(current?: string): string {
    if (!this.level.route) return '';
    return this.level.route.ports.map((port) => {
      const name = portShortName(port);
      return port === current ? `[${name}]` : name;
    }).join(' → ');
  }

  private setBadgeScreenScale(container: Phaser.GameObjects.Container, vehicleScale: number): void {
    const badge = container.getData('destinationBadge') as Phaser.GameObjects.Container | undefined;
    if (badge) badge.setScale(1 / vehicleScale);
  }

  private updateTideHud(leg?: RouteLegDefinition): void {
    if (!this.tideText) return;
    if (!leg) {
      this.tideText.setText('ROUTE CLEAR');
      return;
    }
    this.tideText.setText(`${leg.tide.toUpperCase()} TIDE • ${portShortName(leg.from)}→${portShortName(leg.to)}`);
  }

  private showTideFailure(failure: NonNullable<ReturnType<typeof LevelValidator.validate>['tideFailure']>): void {
    this.feedbackText.setText(`✕ TOO DEEP FOR ${failure.leg.tide.toUpperCase()} TIDE • BALANCE THE LOAD`).setColor('#ffd0c5');
    this.updateTideHud(failure.leg);
    Sfx.play('warning');
    this.tweens.add({ targets: [this.balancePanel, this.balanceNeedle], x: '+=5', duration: 55, yoyo: true, repeat: 3 });
    this.tweens.add({ targets: this.ferryVisual, y: '+=6', angle: Phaser.Math.Clamp(failure.balance, -5, 5), duration: 160, yoyo: true, repeat: 1 });
  }

  private pulseVehicle(vehicleId: string): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) this.tweens.add({ targets: vehicle, scaleX: 1.05, scaleY: 1.05, duration: 120, yoyo: true, repeat: 2 });
  }

  private attemptManifestSail(): void {
    if (!this.manifestState) return;
    this.manifestState = { ...this.manifestState, ferry: this.state };
    const validation = ManifestSystem.validateDeparture(this.level, this.manifestState);
    if (!validation.valid) {
      FeedbackSystem.event('failure');
      const messages = {
        PICKUP_WAITING: this.manifestState.phase === 'pickup' ? 'LOAD ALL PICKUPS' : 'LOAD EVERY VEHICLE',
        INVALID_PLACEMENT: 'INVALID DECK PLACEMENT', OVERWEIGHT: 'FERRY OVERWEIGHT', UNBALANCED: 'FERRY UNBALANCED',
        DESTINATION_BLOCKED: 'DESTINATION VEHICLE BLOCKED', PRIORITY_BLOCKED: 'PRIORITY VEHICLE BLOCKED', TIDE_UNSAFE: 'TOO DEEP FOR NEXT TIDE',
      } as const;
      this.feedbackText.setText(`✕ ${messages[validation.code ?? 'INVALID_PLACEMENT']}`).setColor('#ffd0c5');
      return;
    }
    this.sailing = true;
    this.manifestState = ManifestSystem.transition(this.manifestState, 'sailing') ?? this.manifestState;
    if (BalanceSystem.calculate(this.level, this.state).absolute >= BalanceSystem.calculate(this.level, this.scoringState).absolute) {
      this.scoringState = { placements: this.state.placements.map((placement) => ({ ...placement })) };
    }
    this.feedbackText.setText('✓ MANIFEST CLEAR • DEPARTING').setColor('#d9ffd6');
    const nextPort = this.level.route!.ports[this.manifestState.portIndex + 1]!;
    const unloadIds = this.state.placements.filter((placement) => findLevelVehicle(this.level, placement.vehicleId)?.destination === nextPort).map((placement) => placement.vehicleId);
    Sfx.play('horn'); this.journey.travelTo(nextPort, () => {
      if (this.manifestState) this.manifestState = ManifestSystem.transition(this.manifestState, 'unloading') ?? this.manifestState;
      const tweens = unloadIds.flatMap((id) => {
        const vehicle = this.vehicles.get(id);
        return vehicle ? [{ targets: vehicle, x: 438, alpha: 0, duration: REDUCED_MOTION ? 1 : 160 }] : [];
      });
      this.tweens.chain({ targets: [], tweens, onComplete: () => this.enterManifestPort(nextPort) });
    });
  }

  private enterManifestPort(port: string): void {
    if (!this.manifestState) return;
    this.manifestState = ManifestSystem.arrive(this.level, { ...this.manifestState, ferry: this.state });
    this.state = this.manifestState.ferry;
    this.history = [];
    this.sailing = false;
    if (this.manifestState.phase === 'complete') {
      this.finishLevel();
      return;
    }
    for (const id of this.manifestState.waitingVehicleIds) this.vehicles.get(id)?.setAlpha(1);
    this.objectiveText.setText(`${portFullName(port).toUpperCase()} • PICKUP • ${this.manifestState.waitingVehicleIds.length} VEHICLE${this.manifestState.waitingVehicleIds.length === 1 ? '' : 'S'} WAITING`);
    this.feedbackText.setText(ManifestSystem.canFitWaiting(this.level, this.manifestState) ? 'NEW PICKUP • THROUGH CARGO LOCKED' : `NO ROOM FOR ${portShortName(port)} PICKUP • REPLAN EARLIER LOAD`).setColor(ManifestSystem.canFitWaiting(this.level, this.manifestState) ? '#d9ffd6' : '#ffd0c5');
    this.routeText?.setText(this.formatRoute(this.level.route?.ports[this.manifestState.portIndex + 1]));
    const leg = this.level.route?.legs?.find((candidate) => candidate.from === port);
    this.updateTideHud(leg);
    this.renderState();
  }

  private restartRoute(): void {
    this.scene.restart({ levelId: this.level.id, attemptMetrics: MasterySystem.track(this.attemptMetrics, 'restart') });
  }

  private trackMastery(action: Parameters<typeof MasterySystem.track>[1]): void {
    this.attemptMetrics = MasterySystem.track(this.attemptMetrics, action);
    if (!this.level.mastery || !this.masteryText) return;
    const failure = MasterySystem.failureReason(this.level.mastery, this.attemptMetrics);
    this.masteryText.setText(failure?`MASTERY • FAILED • ${failure}`:`MASTERY • ${MasterySystem.description(this.level.mastery)}`).setColor(failure?'#ffd0c5':'#ffe09a');
  }

  private manifestForecast(): string {
    const entries = (this.level.pickups ?? []).map((pickup) => {
      const cargo = pickup.vehicles.map((vehicle) => `${getVehicleDefinition(vehicle.type).shortLabel}→${vehicle.destination ? portShortName(vehicle.destination) : '?'}`).join(', ');
      return `${portShortName(pickup.port)} PICKUP: ${cargo}`;
    });
    return `ROUTE MANIFEST • ${entries.join(' • ')}`;
  }

  private debugLoadSolution(): void {
    if (!DEBUG_MODE || this.sailing) return;
    const solution = this.manifestState
      ? LevelSolver.solveManifest(this.level)?.stages[this.manifestState.portIndex]?.departureState
      : LevelSolver.solve(this.level);
    if (!solution) return;
    this.state = { placements: solution.placements.map((placement) => ({ ...placement })) };
    if (this.manifestState) this.manifestState = { ...this.manifestState, ferry: this.state };
    this.feedbackText.setText('DEBUG • VERIFIED SOLUTION LOADED').setColor('#d9ffd6');
    this.renderState();
  }
}
