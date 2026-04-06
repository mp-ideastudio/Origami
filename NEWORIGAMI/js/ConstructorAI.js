
/**
 * ConstructorAI.js
 * 
 * A system for "Photo-Realistic Efficiency" via Advanced Fuzzy Logic Culling.
 * 
 * Responsibilities:
 * 1. Chunk Management: Organizes the world into manageable sectors.
 * 2. Fuzzy Culling: Determines visibility based on a multi-factor "Fuzzy Score".
 * 3. Hysteresis: Prevents visual popping by smoothing state transitions.
 */

const ConstructorAI = (function() {
    // Configuration
    const CONFIG = {
        chunkSize: 10, // 10x10 tiles per chunk
        maxDistance: 60, // Maximum visibility distance in units (tiles * TILE_SIZE)
        hysteresisBuffer: 10, // Extra distance before hiding an already visible chunk
        fovWeight: 0.7, // Importance of being in the field of view
        distWeight: 0.3, // Importance of distance
        updateInterval: 5, // Run culling every N frames to save CPU
        debug: false
    };

    // State
    let chunks = new Map(); // key: "x_y", value: { mesh: THREE.Mesh, center: THREE.Vector3, visible: boolean, score: number }
    let frameCount = 0;
    let lastPlayerPos = { x: 0, y: 0 };
    
    // Public API
    return {
        /**
         * Initialize the system
         */
        init: function() {
            console.log("🤖 Constructor AI: Online. Initializing Fuzzy Logic Core...");
            chunks.clear();
        },

        /**
         * Register a chunk of geometry to be managed
         * @param {THREE.Mesh} mesh - The mesh containing the chunk's geometry
         * @param {number} chunkX - Grid X coordinate of the chunk
         * @param {number} chunkY - Grid Y coordinate of the chunk
         */
        registerChunk: function(mesh, chunkX, chunkY) {
            const key = `${chunkX}_${chunkY}`;
            
            // Calculate center in world coordinates
            // Assuming TILE_SIZE is global or passed. We'll assume TILE_SIZE = 5 based on FPV.1.html
            const TILE_SIZE = 5; 
            const centerX = (chunkX * CONFIG.chunkSize + CONFIG.chunkSize / 2) * TILE_SIZE;
            const centerY = (chunkY * CONFIG.chunkSize + CONFIG.chunkSize / 2) * TILE_SIZE;
            
            chunks.set(key, {
                mesh: mesh,
                center: new THREE.Vector3(centerX, 0, centerY),
                visible: true,
                score: 1.0,
                id: key
            });
            
            // Initial state: visible
            mesh.visible = true;
        },

        /**
         * Main update loop - call this from animate()
         * @param {Object} player - Player object with x, y, rotationY
         * @param {THREE.Camera} camera - The active camera (for frustum check)
         */
        update: function(player, camera) {
            frameCount++;
            if (frameCount % CONFIG.updateInterval !== 0) return;

            // Performance optimization: Only update if player moved significantly
            const distMoved = Math.abs(player.x - lastPlayerPos.x) + Math.abs(player.y - lastPlayerPos.y);
            if (distMoved < 0.5 && frameCount % 60 !== 0) return; // Force update occasionally
            
            lastPlayerPos.x = player.x;
            lastPlayerPos.y = player.y;

            const TILE_SIZE = 5;
            const playerPos = new THREE.Vector3(player.x * TILE_SIZE, 0, player.y * TILE_SIZE);
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.rotationY, 0));

            // Frustum check helper
            const frustum = new THREE.Frustum();
            const projScreenMatrix = new THREE.Matrix4();
            projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(projScreenMatrix);

            let visibleCount = 0;

            chunks.forEach((chunk) => {
                // 1. Distance Check
                const dist = playerPos.distanceTo(chunk.center);
                const distScore = 1.0 - Math.min(dist / (CONFIG.maxDistance * TILE_SIZE), 1.0);
                
                // 2. Frustum/Angle Check
                // Simple dot product to see if chunk is roughly in front
                const toChunk = chunk.center.clone().sub(playerPos).normalize();
                const angleScore = forward.dot(toChunk); // -1 (behind) to 1 (ahead)
                
                // 3. Fuzzy Logic Score
                // We combine distance and angle. 
                // Close objects are always visible (high score).
                // Far objects need to be in front to be visible.
                
                let fuzzyScore = 0;
                
                if (dist < 20 * TILE_SIZE) {
                    // "Immediate Vicinity" - Always render
                    fuzzyScore = 1.0; 
                } else {
                    // "Peripheral Zone"
                    // If it was already visible, give it a bonus (Hysteresis)
                    const hysteresisBonus = chunk.visible ? 0.2 : 0.0;
                    
                    // Angle matters more at distance
                    const angleFactor = (angleScore + 1) / 2; // 0 to 1
                    
                    fuzzyScore = (distScore * CONFIG.distWeight) + (angleFactor * CONFIG.fovWeight) + hysteresisBonus;
                }

                // Threshold check
                const threshold = 0.3;
                const shouldBeVisible = fuzzyScore > threshold;

                if (shouldBeVisible !== chunk.visible) {
                    chunk.visible = shouldBeVisible;
                    chunk.mesh.visible = shouldBeVisible;
                    
                    // If we have children (like separate floor/ceiling meshes for this chunk), toggle them too
                    chunk.mesh.traverse((child) => {
                        child.visible = shouldBeVisible;
                    });
                }
                
                if (chunk.visible) visibleCount++;
                chunk.score = fuzzyScore;
            });

            if (CONFIG.debug && frameCount % 60 === 0) {
                console.log(`ConstructorAI: Rendering ${visibleCount} / ${chunks.size} chunks.`);
            }
        },
        
        /**
         * Debug: Visualize chunks
         */
        debugDraw: function(scene) {
            CONFIG.debug = true;
            // Implementation for visual debugging if needed
        }
    };
})();

// Expose to window
window.ConstructorAI = ConstructorAI;
