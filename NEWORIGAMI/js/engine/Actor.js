
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class Actor {
    constructor(game) {
        this.game = game;
        this.world = game.world;
        this.rootComponent = new THREE.Group(); // Visual root
        this.components = [];
        this.isActor = true;
        this.pendingDestroy = false;
        
        // Transform helpers
        this.location = this.rootComponent.position;
        this.rotation = this.rootComponent.rotation;
        this.scale = this.rootComponent.scale;
        
        this.tags = new Set();
    }

    // Lifecycle
    beginPlay() {
        this.ifDebug('BeginPlay');
        // Initialize all components
        this.components.forEach(c => c.beginPlay && c.beginPlay());
    }

    tick(delta) {
        // Tick components
        this.components.forEach(c => {
            if (c.tick && c.isActive) c.tick(delta);
        });
    }

    destroy() {
        this.pendingDestroy = true;
        this.components.forEach(c => c.destroy && c.destroy());
        if (this.rootComponent.parent) {
            this.rootComponent.parent.remove(this.rootComponent);
        }
    }

    // Component Management
    addComponent(componentClass, ...args) {
        const component = new componentClass(this, ...args);
        this.components.push(component);
        return component;
    }

    getComponent(componentClass) {
        return this.components.find(c => c instanceof componentClass);
    }

    // Utilities
    setPosition(x, y, z) {
        this.rootComponent.position.set(x, y, z);
    }
    
    lookAt(x, y, z) {
        this.rootComponent.lookAt(x, y, z);
    }
    
    addTag(tag) { this.tags.add(tag); }
    hasTag(tag) { return this.tags.has(tag); }

    ifDebug(msg) {
        // if (this.game.debug) console.log(`[Actor ${this.constructor.name}] ${msg}`);
    }
}
