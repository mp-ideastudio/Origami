
export class InputSystem {
    constructor(engine) {
        this.engine = engine;
        this.keys = new Set();
        this.keysPressed = new Set(); // Frame-specific 'down' event
        this.keysReleased = new Set(); // Frame-specific 'up' event
        
        this.keyDownTimes = {}; // Map<Code, timestamp>
        this.tapBuffer = new Set(); // Frame-specific taps

        // Mapping: ActionName -> [KeyCodes]
        this.actionMappings = {
            'MoveForward': ['KeyW', 'ArrowUp'],
            'MoveBackward': ['KeyS', 'ArrowDown'],
            'TurnLeft':     ['KeyA', 'ArrowLeft'],
            'TurnRight':    ['KeyD', 'ArrowRight'],
            'StrafeLeft':   ['KeyQ'],
            'StrafeRight':  ['KeyE'],
            'Interact':     ['Space', 'Enter'],
            'Inventory':    ['KeyI']
        };

        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            this.keys.add(e.code);
            this.keysPressed.add(e.code);
            this.keyDownTimes[e.code] = performance.now();
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
            this.keysReleased.add(e.code);
            
            // Tap Detection (< 250ms)
            const duration = performance.now() - (this.keyDownTimes[e.code] || 0);
            if (duration < 250) {
                this.tapBuffer.add(e.code);
            }
            delete this.keyDownTimes[e.code];
        });
    }

    tick(delta) {
        // ...
    }
    
    // Call this at END of frame
    flush() {
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.tapBuffer.clear();
    }

    isActionDown(actionName) {
        const codes = this.actionMappings[actionName];
        if (!codes) return false;
        return codes.some(code => this.keys.has(code));
    }

    isActionPressed(actionName) {
        const codes = this.actionMappings[actionName];
        if (!codes) return false;
        return codes.some(code => this.keysPressed.has(code));
    }

    isActionTapped(actionName) {
        const codes = this.actionMappings[actionName];
        if (!codes) return false;
        return codes.some(code => this.tapBuffer.has(code));
    }
    
    // Returns duration in ms if held, else 0
    getActionDuration(actionName) {
        const codes = this.actionMappings[actionName];
        if (!codes) return 0;
        let max = 0;
        const now = performance.now();
        for (const code of codes) {
            if (this.keys.has(code)) {
                const d = now - (this.keyDownTimes[code] || now);
                if (d > max) max = d;
            }
        }
        return max;
    }

    // Manual Injection for UI Buttons
    simulateKeyDown(code) {
        if (this.keys.has(code)) return;
        this.keys.add(code);
        this.keysPressed.add(code);
        this.keyDownTimes[code] = performance.now();
    }
    
    simulateKeyUp(code) {
        this.keys.delete(code);
        this.keysReleased.add(code);
        const duration = performance.now() - (this.keyDownTimes[code] || 0);
        if (duration < 250) {
            this.tapBuffer.add(code);
        }
        delete this.keyDownTimes[code];
    }
    
    // Returns axis value (-1, 0, 1) for paired actions
    getAxis(positiveAction, negativeAction) {
        let val = 0;
        if (this.isActionDown(positiveAction)) val += 1;
        if (this.isActionDown(negativeAction)) val -= 1;
        return val;
    }
}
