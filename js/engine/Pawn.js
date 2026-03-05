
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { Actor } from './Actor.js';

export class Pawn extends Actor {
    constructor(game) {
        super(game);
        
        // Default Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.rootComponent.add(this.camera);
        
        // Register as active camera if none exists
        if (!this.world.activeCamera) {
            this.world.activeCamera = this.camera;
        }
    }

    // Input Handling Interface (to be overridden or used by Controller)
    addMovementInput(inputVector) {
        // Consumed by MovementComponent
    }
}
