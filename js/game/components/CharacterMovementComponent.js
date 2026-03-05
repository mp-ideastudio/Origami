
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { Component } from '../../engine/Component.js';

export class CharacterMovementComponent extends Component {
    constructor(owner) {
        super(owner);
        
        // Physics Params
        this.maxSpeed = 8.0; // Units per second
        this.acceleration = 25.0; 
        this.brakingDeceleration = 25.0; // Friction
        this.snapStrength = 15.0; // Force pulling to grid center
        
        // State
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.inputVector = new THREE.Vector3(0, 0, 0);
        this.isMoving = false;
        
        // Hybrid Logic
        this.tileSize = 5.0; // Default, should be injected
        this.useMasterGuidance = false; // Default off, Player enables it
    }

    addInputVector(v) {
        this.inputVector.add(v);
        // Clamp length to 1
        if (this.inputVector.length() > 1) this.inputVector.normalize();
    }

    tick(delta) {
        // Apply Acceleration
        if (this.inputVector.lengthSq() > 0.001) {
            // Accelerate
            const targetVel = this.inputVector.clone().multiplyScalar(this.maxSpeed);
            const dv = targetVel.sub(this.velocity);
            
            if (dv.length() > this.acceleration * delta) {
                dv.normalize().multiplyScalar(this.acceleration * delta);
            }
            this.velocity.add(dv);
            
            this.isMoving = true;
        } else {
            // Decelerate (Friction)
            const speed = this.velocity.length();
            if (speed > 0) {
                const drop = this.brakingDeceleration * delta;
                let newSpeed = speed - drop;
                if (newSpeed < 0) newSpeed = 0;
                this.velocity.multiplyScalar(newSpeed / speed);
            }
            
            // Reached stop?
            if (speed < 0.1) {
                this.velocity.set(0,0,0);
                this.isMoving = false;
                
                // Hybrid: Apply Snap if stopped (and input is zero)
                if (this.inputVector.lengthSq() < 0.001) {
                    this.applyGridSnap(delta);
                }
            }
        }
        
        // Integrate Position
        if (this.velocity.lengthSq() > 0) {
           const moveStep = this.velocity.clone().multiplyScalar(delta);
           
           // Attempt Move X
           this.owner.rootComponent.position.x += moveStep.x;
           if (this.checkCollision(this.owner.rootComponent.position)) {
               this.owner.rootComponent.position.x -= moveStep.x; // Revert
               this.velocity.x = 0; // Stop momentum
           }

           // Attempt Move Z
           this.owner.rootComponent.position.z += moveStep.z;
           if (this.checkCollision(this.owner.rootComponent.position)) {
               this.owner.rootComponent.position.z -= moveStep.z; // Revert
               this.velocity.z = 0; // Stop momentum
           }
        }

        // Reset inputs for next frame
        this.inputVector.set(0, 0, 0);
    }
    
    // Discrete Move (Teleport for now, interpolate later if needed or just push velocity)
    moveDiscrete(tiles) {
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.owner.rootComponent.rotation);
        // Cardinalize forward
        if (Math.abs(forward.x) > Math.abs(forward.z)) {
            forward.x = Math.sign(forward.x); forward.z = 0;
        } else {
            forward.z = Math.sign(forward.z); forward.x = 0;
        }
        
        const target = this.owner.rootComponent.position.clone().add(forward.multiplyScalar(tiles * this.tileSize));
        
        // Round to grid to be safe
        target.x = Math.round(target.x / this.tileSize) * this.tileSize;
        target.z = Math.round(target.z / this.tileSize) * this.tileSize;
        
        // Check collision at target (simple check)
        if (!this.checkCollision(target)) {
             this.owner.rootComponent.position.copy(target);
             // Kill velocity so we don't slide after teleport
             this.velocity.set(0,0,0);
        }
    }
    
    rotateDiscrete(radians) {
        this.owner.rootComponent.rotation.y += radians;
    }

    checkCollision(pos) {
        const map = this.owner.world.map;
        if (!map) return false;

        // Simple Point Collision (Center of player)
        const margin = 0.3; // Collision radius estimate
        
        // precise grid coords
        const checkTile = (x, z) => {
            const gx = Math.round(x / this.tileSize);
            const gz = Math.round(z / this.tileSize);
            // Bounds check
            if (gz < 0 || gz >= map.length || gx < 0 || gx >= map[0].length) return true; // OOB is wall
            return map[gz][gx] === 1; // 1 = Wall
        };

        const offsets = [[0,0], [margin, margin], [-margin, margin], [margin, -margin], [-margin, -margin]];
        return offsets.some(o => checkTile(pos.x + o[0], pos.z + o[1]));
    }
    
    applyGridSnap(delta) {
        // Simple spring to nearest tile center
        const pos = this.owner.rootComponent.position;
        const tx = Math.round(pos.x / this.tileSize) * this.tileSize;
        const tz = Math.round(pos.z / this.tileSize) * this.tileSize;
        
        const target = new THREE.Vector3(tx, pos.y, tz);
        const dist = pos.distanceTo(target);
        
        if (dist > 0.01) {
            const pull = target.clone().sub(pos).normalize().multiplyScalar(this.snapStrength * delta);
            // Don't overshoot
            if (pull.length() > dist) {
                this.owner.rootComponent.position.copy(target);
            } else {
               this.owner.rootComponent.position.add(pull);
            }
        }
    }
}
