
export class Component {
    constructor(owner) {
        this.owner = owner;
        this.isActive = true;
    }

    beginPlay() {
        // Override me
    }

    tick(delta) {
        // Override me
    }

    destroy() {
        // Cleanup
    }
    
    setActive(active) {
        this.isActive = active;
    }
}
