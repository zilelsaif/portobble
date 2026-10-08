import Phaser from 'phaser';
import { REDUCED_MOTION } from '../config/gameConfig';
import type { PortId } from '../models/game';
import { VISUAL } from '../ui/visualTokens';
import { HarbourView } from './HarbourView';
export class JourneyPresentation {
  private harbour: HarbourView;
  constructor(private scene: Phaser.Scene, initialPort: PortId) { this.harbour = new HarbourView(scene, initialPort); }
  travelTo(port: PortId, onArrive: () => void): void {
    const duration=REDUCED_MOTION?180:VISUAL.motion.journey; const incoming=new HarbourView(this.scene,port,430);
    const marker=this.scene.add.container(430,250,[this.scene.add.ellipse(0,15,24,8,0x071d27,.25),this.scene.add.triangle(0,0,-9,16,9,16,0,-17,VISUAL.color.amber)]).setDepth(1);
    this.scene.tweens.add({targets:this.harbour.container,x:-430,duration:duration*.42,ease:'Sine.in'}); this.scene.tweens.add({targets:marker,x:-40,duration,ease:'Linear'});
    this.scene.time.delayedCall(duration*.38,()=>this.scene.tweens.add({targets:incoming.container,x:0,duration:duration*.62,ease:'Sine.out',onComplete:()=>{this.harbour.destroy();this.harbour=incoming;marker.destroy();onArrive();}}));
  }
}
