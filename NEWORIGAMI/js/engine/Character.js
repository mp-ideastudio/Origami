
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { Pawn } from './Pawn.js';
// We'll import the MovementComponent dynamically or pass it in to avoid circular deps if needed,
// but standard ES6 modules handle circularity okay-ish. Ideally use Dependency Injection.
import { CharacterMovementComponent } from '../game/components/CharacterMovementComponent.js';

export class Character extends Pawn {
    constructor(game) {
        super(game);
        
        // Adjust Camera Height (Eye Level)
        if (this.camera) {
            this.camera.position.set(0, 1.7, 0);
        }

        this.movementComponent = this.addComponent(CharacterMovementComponent);
    }
    
    // Wire input to movement
    tick(delta) {
        super.tick(delta);
        const input = this.game.input;
        const mc = this.movementComponent;

        // 1. Taps (Discrete)
        if (input.isActionTapped('TurnLeft')) {
            mc.rotateDiscrete(Math.PI / 2);
        } else if (input.isActionTapped('TurnRight')) {
            mc.rotateDiscrete(-Math.PI / 2);
        } else if (input.isActionTapped('MoveForward')) {
            mc.moveDiscrete(1);
        } else if (input.isActionTapped('MoveBackward')) {
            mc.moveDiscrete(-1);
        }
        
        // 2. Holds (Continuous)
        // Threshold check (150ms)
        const thresh = 150;
        let moving = false;
        
        // Forward/Back
        if (input.getActionDuration('MoveForward') > thresh) {
            this.addMovementInput(new THREE.Vector3(0,0,-1).applyQuaternion(this.rootComponent.quaternion));
            moving = true;
        } else if (input.getActionDuration('MoveBackward') > thresh) {
            this.addMovementInput(new THREE.Vector3(0,0,1).applyQuaternion(this.rootComponent.quaternion));
            moving = true;
        }

        // Strafe
        if (input.getActionDuration('StrafeLeft') > thresh) {
             this.addMovementInput(new THREE.Vector3(-1,0,0).applyQuaternion(this.rootComponent.quaternion));
             moving = true;
        } else if (input.getActionDuration('StrafeRight') > thresh) {
             this.addMovementInput(new THREE.Vector3(1,0,0).applyQuaternion(this.rootComponent.quaternion));
             moving = true;
        }
        
        // Continuous Turn
        if (input.getActionDuration('TurnLeft') > thresh) {
            this.addYawInput(1, delta);
        } else if (input.getActionDuration('TurnRight') > thresh) {
             this.addYawInput(-1, delta);
        }
    }

    addMovementInput(dir) {
        this.movementComponent.addInputVector(dir);
    }
    
    addYawInput(val, delta) {
        // Simple rotation for now, ideally handled by Controller or Movement
        this.rootComponent.rotation.y -= val * 2.0 * delta; // Sensitivity 2.0
    }
}
