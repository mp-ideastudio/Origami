
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class World {
    constructor(engine) {
        this.engine = engine;
        this.scene = new THREE.Scene();
        this.actors = [];
        this.newActors = []; // Buffer for safety during iteration
        
        // Physics / Bounds
        this.map = null; // Reference to grid data
        this.tileSize = 5;
    }

    spawnActor(actorClass, ...args) {
        const actor = new actorClass(this.engine, ...args);
        this.newActors.push(actor);
        this.scene.add(actor.rootComponent);
        actor.beginPlay(); // Fire immediately or defer? Unreal style is deferred slightly, but immediate is simpler.
        return actor;
    }

    destroyActor(actor) {
        if (!actor) return;
        actor.destroy();
        const idx = this.actors.indexOf(actor);
        if (idx >= 0) {
            this.actors.splice(idx, 1);
        }
        // Also check newActors buffer
        const newIdx = this.newActors.indexOf(actor);
        if (newIdx >= 0) {
            this.newActors.splice(newIdx, 1);
        }
    }

    tick(delta) {
        // Merge new actors
        if (this.newActors.length > 0) {
            this.actors.push(...this.newActors);
            this.newActors.length = 0;
        }

        // Tick all actors
        // Iterate backwards to allow removal during iteration? Or standard loop?
        // Standard loop is safer if we don't modify array in-place deeply.
        for (const actor of this.actors) {
            if (!actor.pendingDestroy) {
                actor.tick(delta);
            }
        }
        
        // Cleanup destroyed actors
        // (Optimized: only filter if needed, or periodically)
        // For simplicity:
        this.actors = this.actors.filter(a => !a.pendingDestroy);
    }
}
