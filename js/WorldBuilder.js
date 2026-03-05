
// Imports removed to use global THREE (loaded via CDN)


/**
 * WorldBuilder.js
 * Handles procedural map generation, chunking, and geometry creation.
 */
export class WorldBuilder {
    constructor(scene, stateManager) {
        this.scene = scene;
        this.state = stateManager;
        this.dungeonChunks = [];
        this.wallMaterial = null;
        this.floorMaterial = null;
        this.ceilMaterial = null;
        this.initMaterials();
    }

    initMaterials() {
        // Materials would technically be loaded/defined here or passed in.
        // For now, we'll recreate basic compliant ones or expect them to be set
        // In a full refactor, we'd move the TextureLoader logic here too.
        
        // Placeholder compliant materials (the real ones are created in FPV.3 w/ textures)
        // We will expose a method to set verified materials from the main loader
        this.materials = {};
    }

    setMaterials(materials) {
        this.materials = materials;
    }

    /**
     * drawMap() - The heavy lifter extracted from FPV.3
     * Generates chunked geometry for the current map state.
     */
    drawMap(mapData, mapWidth, mapHeight, tileSize) {
        // Clear old chunks
        this.dungeonChunks.forEach(c => this.scene.remove(c));
        this.dungeonChunks = [];

        const TILE = { WALL: "#", FLOOR: "." }; // Enum
        const CHUNK_SIZE = 10;
        const WALL_HEIGHT = tileSize * 0.8; // Approx 4 meters
        const FPV_OFFSET = 1; // Layer ID

        const chunks = {};

        function getChunkKey(x, y) {
            const cx = Math.floor(x / CHUNK_SIZE);
            const cy = Math.floor(y / CHUNK_SIZE);
            return `${cx}_${cy}`;
        }

        // 1. Group Geometry by Chunk
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const tile = mapData[y][x];
                const key = getChunkKey(x, y);
                
                if (!chunks[key]) {
                    chunks[key] = { 
                        floors: [], ceilings: [], walls: [], 
                        cx: Math.floor(x/CHUNK_SIZE), 
                        cy: Math.floor(y/CHUNK_SIZE) 
                    };
                }

                if (tile.type === '#' || tile.type === 'WALL') {
                    // Walls - we'll handle these carefully. 
                    // To follow the "Forensic" approach, we check how FPV.3 did it.
                    // FPV.3 used RoundBoxGeometry.
                    const wallGeo = new THREE.RoundedBoxGeometry(tileSize, WALL_HEIGHT, tileSize, 4, 0.0625);
                    wallGeo.translate(x * tileSize, WALL_HEIGHT/2, y * tileSize);
                    chunks[key].walls.push(wallGeo);

                } else if (tile.type !== null) {
                    // Floors
                    const floorGeo = new THREE.PlaneGeometry(tileSize, tileSize);
                    floorGeo.rotateX(-Math.PI / 2);
                    floorGeo.translate(x * tileSize, 0, y * tileSize);
                    chunks[key].floors.push(floorGeo);

                    // Ceilings (Rafters)
                    const ceilGeo = new THREE.PlaneGeometry(tileSize, tileSize);
                    ceilGeo.rotateX(Math.PI / 2);
                    ceilGeo.translate(x * tileSize, WALL_HEIGHT, y * tileSize);
                    chunks[key].ceilings.push(ceilGeo);
                }
            }
        }

        // 2. Build Meshes
        Object.values(chunks).forEach(chunk => {
            const chunkGroup = new THREE.Group();
            
            // Floors
            if (chunk.floors.length > 0) {
                const mergedFloors = THREE.BufferGeometryUtils.mergeBufferGeometries(chunk.floors);
                const fpvFloor = new THREE.Mesh(mergedFloors, this.materials.floor);
                fpvFloor.receiveShadow = true;
                fpvFloor.layers.set(FPV_OFFSET);
                chunkGroup.add(fpvFloor);
                
                // Map floor (simplified)
                const mapFloor = new THREE.Mesh(mergedFloors, this.materials.mapFloor);
                mapFloor.layers.set(0);
                chunkGroup.add(mapFloor);
            }

            // Ceilings
            if (chunk.ceilings.length > 0) {
                const mergedCeilings = THREE.BufferGeometryUtils.mergeBufferGeometries(chunk.ceilings);
                const ceilMesh = new THREE.Mesh(mergedCeilings, this.materials.ceiling);
                ceilMesh.layers.set(FPV_OFFSET); // Only visible in FPV?
                // Actually FPV.3 had ceiling visible in map layer 0 too? 
                // Line 9052: ceiling.layers.set(0); ceiling.layers.enable(FPV_MODEL_LAYER);
                // We'll mimic that:
                ceilMesh.layers.enable(0);
                chunkGroup.add(ceilMesh);
            }

            // Walls (Merged per chunk)
            if (chunk.walls.length > 0) {
                const mergedWalls = THREE.BufferGeometryUtils.mergeBufferGeometries(chunk.walls);
                const wallMesh = new THREE.Mesh(mergedWalls, this.materials.wall);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                wallMesh.layers.enable(0);
                wallMesh.layers.enable(FPV_OFFSET);
                chunkGroup.add(wallMesh);
            }

            // Chunk Metadata for Culling
            chunkGroup.userData.isChunk = true;
            chunkGroup.userData.center = new THREE.Vector3(
                (chunk.cx * CHUNK_SIZE * tileSize) + (CHUNK_SIZE * tileSize / 2),
                0,
                (chunk.cy * CHUNK_SIZE * tileSize) + (CHUNK_SIZE * tileSize / 2)
            );

            this.scene.add(chunkGroup);
            this.dungeonChunks.push(chunkGroup);
        });
    }
}
