class BaselineRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        
        // Config
        this.TILE_SIZE = 5; // Default, will be updated from data if possible
        this.WALL_HEIGHT = 4; // Approx based on baseline
        
        // State
        this.mapData = null;
        this.isInitialized = false;
        this.mapMeshes = [];
        this.blessedWalls = new Set();
        
        // Materials
        this.materials = {
            floor: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 }),
            wall: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.1 }),
            ceiling: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }),
            rafter: new THREE.MeshStandardMaterial({ color: 0x3b2f23, roughness: 0.8, metalness: 0.05 })
        };
    }

    init(containerId, mapContainerId) {
        this.container = document.getElementById(containerId);
        this.mapContainer = mapContainerId ? document.getElementById(mapContainerId) : null;
        
        if (!this.container) return;

        console.log("BaselineRenderer: Init (New Baseline Port)");
        console.log("BaselineRenderer: Container Size:", this.container.clientWidth, "x", this.container.clientHeight);
        
        if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
            console.error("BaselineRenderer: Container has ZERO size! Renderer will fail.");
        }

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a); // Dark charcoal
        // Fog? Baseline doesn't seem to explicitly set fog in the snippet, but maybe it's there?
        // The snippet had `three.scene.background = ...`.
        // I'll add subtle fog for depth.
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.02);

        // 2. FPV Camera
        // Baseline: three.camera.position.y = (WALL_HEIGHT * 0.75) / 3 * 1.2;
        const camY = (this.WALL_HEIGHT * 0.75) / 3 * 1.2 + 1.0; // Adjusting for scale
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 0); 

        // 3. FPV Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        if (THREE.ACESFilmicToneMapping) {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 0.6; // Slightly brighter than 0.45
        }
        
        this.container.appendChild(this.renderer.domElement);

        // 4. Map Setup (Top-Down)
        if (this.mapContainer) {
            const aspect = this.mapContainer.clientWidth / this.mapContainer.clientHeight;
            const viewSize = 60; 
            this.mapCamera = new THREE.OrthographicCamera(
                -viewSize * aspect / 2, viewSize * aspect / 2,
                viewSize / 2, -viewSize / 2,
                1, 1000
            );
            this.mapCamera.position.set(0, 50, 0);
            this.mapCamera.lookAt(0, 0, 0);
            this.mapCamera.zoom = 1.0;
            this.mapCamera.updateProjectionMatrix();

            this.mapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.mapRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.mapRenderer.setSize(this.mapContainer.clientWidth, this.mapContainer.clientHeight);
            this.mapContainer.appendChild(this.mapRenderer.domElement);
        }

        // 5. Lighting (New Baseline Setup)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // Slightly boosted from 0.06
        this.scene.add(ambientLight);

        const hemisphereLight = new THREE.HemisphereLight(0xbdd7ff, 0x444444, 0.15); // Boosted
        hemisphereLight.position.set(0, 1, 0);
        this.scene.add(hemisphereLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.3); // Boosted
        dirLight.position.set(15, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Headlamp (Attached to Camera)
        const headlamp = new THREE.SpotLight(0xffffff, 2.4, 16, Math.PI / 8, 0.3, 1.4);
        headlamp.position.set(0, 0, 0);
        headlamp.target.position.set(0, 0, -1);
        headlamp.castShadow = true;
        this.camera.add(headlamp);
        this.camera.add(headlamp.target);

        const outerGlow = new THREE.SpotLight(0xffffff, 0.8, 20, Math.PI / 6, 0.85, 2);
        outerGlow.position.set(0, 0, 0);
        outerGlow.target.position.set(0, 0, -1);
        this.camera.add(outerGlow);
        this.camera.add(outerGlow.target);

        this.scene.add(this.camera);
        
        // 6. Resize Handler

        // 6. Resize Handler
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Force resize to ensure correct sizing if iframe loaded hidden
        setTimeout(() => {
            console.log("BaselineRenderer: Forcing Resize...");
            this.onWindowResize();
        }, 500);

        this.isInitialized = true;
        this.animate();
    }

    buildFromRooms(data) {
        console.log("BaselineRenderer: buildFromRooms called", data);
        // Normalize Data
        let rooms = [];
        if (Array.isArray(data)) rooms = data;
        else if (data && Array.isArray(data.rooms)) rooms = data.rooms;
        else if (data && typeof data === 'object') rooms = Object.values(data);

        if (!rooms || rooms.length === 0) return;

        // 1. Determine Bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        rooms.forEach(r => {
            minX = Math.min(minX, r.x);
            maxX = Math.max(maxX, r.x + r.w);
            minY = Math.min(minY, r.y);
            maxY = Math.max(maxY, r.y + r.h);
        });

        // Padding
        const padding = 2;
        const width = (maxX - minX) + padding * 2;
        const height = (maxY - minY) + padding * 2;
        const offsetX = minX - padding;
        const offsetY = minY - padding;
        
        this.gridWidth = width;
        this.gridHeight = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;

        // 2. Create Grid
        const map = Array(height).fill().map(() => Array(width).fill(null));

        // 3. Fill Grid
        rooms.forEach(r => {
            for (let y = 0; y < r.h; y++) {
                for (let x = 0; x < r.w; x++) {
                    const gridX = (r.x - offsetX) + x;
                    const gridY = (r.y - offsetY) + y;
                    if (gridY >= 0 && gridY < height && gridX >= 0 && gridX < width) {
                        map[gridY][gridX] = { type: 'floor', room: r };
                    }
                }
            }
        });

        // 4. Add Walls
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (map[y][x] === null) {
                    let hasFloorNeighbor = false;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const ny = y + dy;
                            const nx = x + dx;
                            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                                if (map[ny][nx] && map[ny][nx].type === 'floor') {
                                    hasFloorNeighbor = true;
                                }
                            }
                        }
                    }
                    if (hasFloorNeighbor) {
                        map[y][x] = { type: 'wall' };
                    }
                }
            }
        }

        // 5. Extract Entities (if present)
        let entities = [];
        if (data && Array.isArray(data.entities)) entities = data.entities;
        else if (data && data.mapData && Array.isArray(data.mapData.entities)) entities = data.mapData.entities;
        
        // Also check for monsters/traps/loot specific arrays if flattened
        if (data && Array.isArray(data.monsters)) entities = entities.concat(data.monsters.map(m => ({...m, type: 'monster'})));
        
        this.drawMap(map, entities);
    }

    drawMap(map, entities = []) {
        // Clear existing
        const existingDungeon = this.scene.getObjectByName("dungeonGroup");
        if (existingDungeon) this.scene.remove(existingDungeon);
        
        this.mapMeshes = []; // Reset mesh registry

        const dungeonGroup = new THREE.Group();
        dungeonGroup.name = "dungeonGroup";

        // Geometries
        const floorGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE);
        floorGeo.rotateX(-Math.PI / 2);
        
        const ceilingGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE);
        ceilingGeo.rotateX(Math.PI / 2);
        
        const wallGeo = new THREE.BoxGeometry(this.TILE_SIZE, this.WALL_HEIGHT, this.TILE_SIZE);

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const tile = map[y][x];
                if (!tile) continue;

                const worldX = (x + this.offsetX) * this.TILE_SIZE + this.TILE_SIZE/2;
                const worldZ = (y + this.offsetY) * this.TILE_SIZE + this.TILE_SIZE/2;

                if (tile.type === 'floor') {
                    // Floor
                    const floor = new THREE.Mesh(floorGeo, this.materials.floor);
                    floor.position.set(worldX, 0, worldZ);
                    floor.receiveShadow = true;
                    dungeonGroup.add(floor);
                    this.mapMeshes.push(floor);

                    // Ceiling
                    const ceiling = new THREE.Mesh(ceilingGeo, this.materials.ceiling);
                    ceiling.position.set(worldX, this.WALL_HEIGHT, worldZ);
                    dungeonGroup.add(ceiling);
                    this.mapMeshes.push(ceiling);
                } else if (tile.type === 'wall') {
                    // Wall
                    const wall = new THREE.Mesh(wallGeo, this.materials.wall);
                    wall.position.set(worldX, this.WALL_HEIGHT/2, worldZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    
                    // Metadata for blessing
                    wall.userData = { 
                        isWall: true, 
                        grid: { x: x + this.offsetX, y: y + this.offsetY } 
                    };
                    
                    dungeonGroup.add(wall);
                    this.mapMeshes.push(wall);
                }
            }
        }
        
        // Entities
        entities.forEach(ent => {
            if (ent.x === undefined || ent.y === undefined) return;
            
            const worldX = ent.x * this.TILE_SIZE + this.TILE_SIZE/2;
            const worldZ = ent.y * this.TILE_SIZE + this.TILE_SIZE/2;
            
            let mesh;
            if (ent.type === 'monster') {
                // Red/Hostile or Gray/Neutral
                const color = ent.isHostile ? 0xb85450 : 0x606060;
                const geo = new THREE.ConeGeometry(this.TILE_SIZE * 0.3, this.TILE_SIZE * 0.8, 8);
                const mat = new THREE.MeshStandardMaterial({ color: color });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(worldX, this.TILE_SIZE * 0.4, worldZ);
            } else if (ent.type === 'loot') {
                // Gold
                const geo = new THREE.BoxGeometry(this.TILE_SIZE * 0.4, this.TILE_SIZE * 0.4, this.TILE_SIZE * 0.4);
                const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(worldX, this.TILE_SIZE * 0.2, worldZ);
            } else if (ent.type === 'furniture') {
                // Wood
                const geo = new THREE.CylinderGeometry(this.TILE_SIZE * 0.3, this.TILE_SIZE * 0.3, this.TILE_SIZE * 0.6, 6);
                const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(worldX, this.TILE_SIZE * 0.3, worldZ);
            }
            
            if (mesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                dungeonGroup.add(mesh);
            }
        });

        // Rafters (Decorative)
        // Simple implementation: Grid of beams
        const rafters = new THREE.Group();
        const beamMat = this.materials.rafter;
        const beamThickness = 0.2;
        
        // Add a few long beams
        // This is a simplified version of the baseline's rafter logic
        // We'll just add them based on the bounds
        const boundsWidth = this.gridWidth * this.TILE_SIZE;
        const boundsHeight = this.gridHeight * this.TILE_SIZE;
        const centerX = (this.offsetX + this.gridWidth/2) * this.TILE_SIZE;
        const centerZ = (this.offsetY + this.gridHeight/2) * this.TILE_SIZE;
        
        // ... (Skipping complex rafter logic for now to ensure stability first)

        this.scene.add(dungeonGroup);
    }

    updatePlayerPosition(x, y, rot) {
        if (!this.camera) return;
        
        const worldX = x * this.TILE_SIZE + this.TILE_SIZE/2;
        const worldZ = y * this.TILE_SIZE + this.TILE_SIZE/2;

        this.camera.position.x = worldX;
        this.camera.position.z = worldZ;
        
        if (this.mapCamera) {
            this.mapCamera.position.x = worldX;
            this.mapCamera.position.z = worldZ;
            this.mapCamera.lookAt(worldX, 0, worldZ);
        }
        
        if (rot !== undefined) {
             this.camera.rotation.y = rot;
        }
    }

    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            console.log("BaselineRenderer: Heartbeat. Cam:", this.camera.position);
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        
        if (this.mapRenderer && this.scene && this.mapCamera) {
            this.mapRenderer.render(this.scene, this.mapCamera);
        }
    }
}
