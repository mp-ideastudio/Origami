class OrigamiRenderer {
    constructor() {
        this.scene = null;
        this.cameraFPV = null;
        this.cameraMap = null;
        this.renderer = null;
        
        this.fpvContainer = null;
        this.mapContainer = null;
        
        this.cube = null; // Placeholder
        this.isInitialized = false;
    }

    init(fpvContainerId, mapContainerId) {
        console.log("Renderer: Init called with", fpvContainerId, mapContainerId);
        this.fpvContainer = document.getElementById(fpvContainerId);
        this.mapContainer = mapContainerId ? document.getElementById(mapContainerId) : null;

        if (!this.fpvContainer && !this.mapContainer) {
            console.error("OrigamiRenderer: No containers found", fpvContainerId, mapContainerId);
            return;
        }
        console.log("Renderer: Containers found. Initializing Three.js...");

        // 1. Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a12); // Dark Navy/Black Sky
        this.scene.fog = new THREE.Fog(0x0a0a12, 10, 50);

        // 2. Setup Cameras
        // FPV: Standard Perspective
        if (this.fpvContainer) {
            this.cameraFPV = new THREE.PerspectiveCamera(75, this.fpvContainer.clientWidth / this.fpvContainer.clientHeight, 0.1, 1000);
            this.cameraFPV.position.set(0, 1.6, 0); // Eye level
        }

        // Map: Orthographic or High Perspective
        if (this.mapContainer) {
            const aspect = this.mapContainer.clientWidth / this.mapContainer.clientHeight;
            this.cameraMap = new THREE.OrthographicCamera(-10 * aspect, 10 * aspect, 10, -10, 1, 1000);
            this.cameraMap.position.set(0, 20, 0);
            this.cameraMap.lookAt(0, 0, 0);
            this.cameraMap.zoom = 0.5;
            this.cameraMap.updateProjectionMatrix();
        }

        // Lights (Studio Setup)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // Bright Ambient
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
        
        const backLight = new THREE.DirectionalLight(0x4444ff, 0.3); // Blue rim light
        backLight.position.set(-5, 10, -10);
        this.scene.add(backLight);

        // 3. Setup Renderers (SPLIT)
        
        // FPV Renderer
        if (this.fpvContainer) {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(this.fpvContainer.clientWidth, this.fpvContainer.clientHeight);
            this.fpvContainer.appendChild(this.renderer.domElement);
        }
        
        // Map Renderer
        if (this.mapContainer) {
            this.rendererMap = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.rendererMap.setPixelRatio(window.devicePixelRatio);
            this.rendererMap.setSize(this.mapContainer.clientWidth, this.mapContainer.clientHeight);
            this.mapContainer.appendChild(this.rendererMap.domElement);
        }

        // DEBUG: Test Floor (Optional, keeping for now as it's useful for orientation)
        const testFloorGeo = new THREE.PlaneGeometry(20, 20);
        const testFloorMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
        const testFloor = new THREE.Mesh(testFloorGeo, testFloorMat);
        testFloor.rotation.x = -Math.PI / 2;
        testFloor.position.y = 0;
        this.scene.add(testFloor);

        // DEBUG: Test Grid
        const gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(gridHelper);

        this.isInitialized = true;
        this.animate();
        
        // Handle Resize
        window.addEventListener('resize', () => this.onWindowResize());

        // FORENSIC: Self-Diagnosis after 2 seconds
        setTimeout(() => {
            console.log("Renderer: --- FORENSIC REPORT ---");
            console.log("Scene Children:", this.scene.children.length);
            console.log("DungeonGroup Children:", this.dungeonGroup ? this.dungeonGroup.children.length : "N/A");
            console.log("Camera Pos:", this.cameraFPV.position);
            
            if (this.dungeonGroup && this.dungeonGroup.children.length === 0) {
                console.warn("Renderer: FORENSIC WARNING - DungeonGroup is empty (Waiting for data?)");
            } else {
                console.log("Renderer: FORENSIC SUCCESS - DungeonGroup has content.");
            }
        }, 2000);
    }

    onWindowResize() {
        if (!this.isInitialized) return;
        
        // Update FPV
        if (this.fpvContainer) {
             this.cameraFPV.aspect = this.fpvContainer.clientWidth / this.fpvContainer.clientHeight;
             this.cameraFPV.updateProjectionMatrix();
             this.renderer.setSize(this.fpvContainer.clientWidth, this.fpvContainer.clientHeight);
        }
        
        // Update Map
        if (this.mapContainer) {
            const aspect = this.mapContainer.clientWidth / this.mapContainer.clientHeight;
            this.cameraMap.left = -10 * aspect;
            this.cameraMap.right = 10 * aspect;
            this.cameraMap.top = 10;
            this.cameraMap.bottom = -10;
            this.cameraMap.updateProjectionMatrix();
            this.rendererMap.setSize(this.mapContainer.clientWidth, this.mapContainer.clientHeight);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // if (this.cube) {
        //     this.cube.rotation.x += 0.01;
        //     this.cube.rotation.y += 0.01;
        // }

        // Smooth Camera Movement
        if (this.cameraFPV && this.playerTarget) {
            this.cameraFPV.position.lerp(this.playerTarget, 0.05); // Smooth factor
            
            // Map Camera Follows Player
            if (this.cameraMap) {
                this.cameraMap.position.x = this.cameraFPV.position.x;
                this.cameraMap.position.z = this.cameraFPV.position.z;
                this.cameraMap.lookAt(this.cameraFPV.position.x, 0, this.cameraFPV.position.z);
            }
        }

        this.render();
    }

    render() {
        if (!this.isInitialized) return;

        // Debug Log every 60 frames
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            console.log("Renderer: Loop Running", {
                fpvContainer: !!this.fpvContainer,
                sceneChildren: this.scene.children.length,
                cameraPos: this.cameraFPV.position,
                fpvRect: this.fpvContainer ? this.fpvContainer.getBoundingClientRect() : null
            });
        }

        // 1. Render FPV View
        if (this.renderer && this.cameraFPV) {
            this.cameraFPV.layers.enable(0);
            this.renderer.render(this.scene, this.cameraFPV);
        }

        // 2. Render Map View
        if (this.rendererMap && this.cameraMap) {
            this.rendererMap.render(this.scene, this.cameraMap);
        }
    }

    // --- API for Game Logic ---
    // --- API for Game Logic ---
    // --- API for Game Logic ---
    
    // NEW: Build Entire Dungeon at Once
    buildDungeon(mapData) {
        console.log("Renderer: buildDungeon called with", mapData);
        
        this.roomMap = new Map(); // Store room data for lookup

        // Handle different data structures (Array vs Object)
        let rooms = [];
        if (Array.isArray(mapData)) {
            rooms = mapData;
        } else if (mapData && mapData.rooms) {
            rooms = mapData.rooms;
        } else {
            console.warn("Renderer: Invalid map data format", mapData);
            return;
        }

        console.log(`Renderer: Processing ${rooms.length} rooms`);
        
        // CRITICAL FIX: Don't clear if we received empty data (unless intentional?)
        // If we receive 0 rooms, it might be a glitch. Keep existing dungeon.
        if (rooms.length === 0) {
            console.warn("Renderer: Received 0 rooms. Ignoring update to prevent clearing.");
            return;
        }

        if (!this.dungeonGroup) {
            this.dungeonGroup = new THREE.Group();
            this.scene.add(this.dungeonGroup);
        } else {
            // clear children
            while(this.dungeonGroup.children.length > 0){ 
                this.dungeonGroup.remove(this.dungeonGroup.children[0]); 
            }
        }

        if (rooms.length === 0) {
            console.warn("Renderer: No rooms provided. Building FALLBACK dungeon.");
            this.buildFallbackDungeon();
            return;
        }

        this.roomMap.clear();
        rooms.forEach((room, index) => {
            console.log(`Renderer: Building Room ${index} (ID: ${room.id}) at ${room.x},${room.y} size ${room.w}x${room.h}`);
            this.roomMap.set(room.id, room);
            this.buildSingleRoom(room);
        });
        
        // Position player in start room (first room)
        if (rooms.length > 0) {
            const startRoom = rooms[0];
            const centerX = startRoom.x + startRoom.w / 2;
            const centerY = startRoom.y + startRoom.h / 2;
            console.log(`Renderer: Positioning Player at Start Room Center: ${centerX}, ${centerY}`);
            this.updatePlayerPosition({ x: centerX, y: centerY });
        }
    }

    buildFallbackDungeon() {
        console.log("Renderer: Building Fallback Dungeon...");
        const fallbackRooms = [
            { id: 'start', x: 0, y: 0, w: 3, h: 3, exits: { north: true }, features: [{ id: 'lantern1', label: 'Lantern' }] },
            { id: 'hall', x: 0, y: 3, w: 1, h: 3, exits: { south: true, north: true } },
            { id: 'treasure', x: 0, y: 6, w: 3, h: 3, exits: { south: true }, features: [{ id: 'chest', label: 'Chest' }] }
        ];

        fallbackRooms.forEach(room => {
            this.roomMap.set(room.id, room);
            this.buildSingleRoom(room);
        });
        
        // FOOLPROOF DEBUG CUBE in Start Room
        // Room is 0,0 to 30,30. Center is 15,15.
        // Place cube at 15, 5, 10 (North of center)
        const debugGeo = new THREE.BoxGeometry(2, 2, 2);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: false });
        const debugCube = new THREE.Mesh(debugGeo, debugMat);
        debugCube.position.set(15, 5, 10);
        this.scene.add(debugCube);
        console.log("Renderer: Added Debug Cube at 15, 5, 10");
        
        // Position player in start room center
        this.updatePlayerPosition({ x: 1.5, y: 1.5 });
    }

    buildSingleRoom(roomData) {
        const roomX = (roomData.x || 0) * 10;
        const roomZ = (roomData.y || 0) * 10;
        const w = (roomData.w || 1) * 10;
        const d = (roomData.h || 1) * 10;
        
        const roomGroup = new THREE.Group();
        roomGroup.position.set(roomX, 0, roomZ);
        this.dungeonGroup.add(roomGroup);

        // PAX DESIGN: White Floor with Grid
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            roughness: 0.1, 
            metalness: 0.1 
        });
        
        // Floor (Centered relative to room origin)
        const offsetX = (w - 10) / 2;
        const offsetZ = (d - 10) / 2;

        const floorGeo = new THREE.PlaneGeometry(w, d);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(offsetX, 0, offsetZ);
        roomGroup.add(floor);

        // Grid Helper Overlay
        // We need a grid that matches the 10x10 scale
        // Size = max(w, d), Divisions = size / 10
        const size = Math.max(w, d);
        const divisions = Math.round(size / 10);
        const gridHelper = new THREE.GridHelper(size, divisions, 0xcccccc, 0xeeeeee);
        gridHelper.position.set(offsetX, 0.05, offsetZ); // Slightly above floor
        // GridHelper is centered, so we need to adjust if w != d?
        // Actually GridHelper is square. We might need custom line segments for rectangular rooms if we want perfection.
        // For now, let's just use a grid helper that covers the room.
        // Or better: Use a texture.
        // Let's stick to GridHelper for "Pax" look, but maybe one per 10x10 tile?
        // Simpler: One large grid for the room.
        roomGroup.add(gridHelper);

        // "R" Markings (Randomly placed on tiles)
        // We can add simple text sprites or geometry.
        // For speed, let's skip the "R" for now or add simple markers.

        // Ceiling (Hidden or Dark?)
        // Pax design has dark ceiling/sky.
        // We can omit ceiling or make it invisible from inside if we want sky.
        // If we omit it, we see the skybox.
        
        // Walls (White/Grey Panels)
        // Walls (Shoji Screen Style)
        const createShojiWall = (width, x, y, z, rotY) => {
            const group = new THREE.Group();
            group.position.set(x, y, z);
            group.rotation.y = rotY;

            // Materials
            const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
            const paperMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.9, emissive: 0xfffff0, emissiveIntensity: 0.1 });

            // 1. Main Frame (Top/Bottom/Sides)
            const frameThick = 0.5;
            const wallHeight = 10;
            
            // Top Beam
            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, frameThick, frameThick), woodMat);
            topBeam.position.y = wallHeight / 2 - frameThick / 2;
            group.add(topBeam);

            // Bottom Beam
            const botBeam = new THREE.Mesh(new THREE.BoxGeometry(width, frameThick, frameThick), woodMat);
            botBeam.position.y = -wallHeight / 2 + frameThick / 2;
            group.add(botBeam);

            // Side Posts (Left/Right)
            const sideGeo = new THREE.BoxGeometry(frameThick, wallHeight, frameThick);
            const leftPost = new THREE.Mesh(sideGeo, woodMat);
            leftPost.position.x = -width / 2 + frameThick / 2;
            group.add(leftPost);

            const rightPost = new THREE.Mesh(sideGeo, woodMat);
            rightPost.position.x = width / 2 - frameThick / 2;
            group.add(rightPost);

            // 2. Vertical Ribs (Every 5 units)
            const numRibs = Math.floor(width / 5);
            for (let i = 1; i < numRibs; i++) {
                const ribX = -width / 2 + i * 5;
                const rib = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallHeight, 0.2), woodMat);
                rib.position.x = ribX;
                group.add(rib);
            }

            // 3. Horizontal Ribs (Every 3.3 units)
            const numH = 2; 
            for (let i = 1; i <= numH; i++) {
                const ribY = -wallHeight / 2 + i * (wallHeight / 3);
                const rib = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, 0.2), woodMat);
                rib.position.y = ribY;
                group.add(rib);
            }

            // 4. Paper Backing
            const paperGeo = new THREE.PlaneGeometry(width - frameThick, wallHeight - frameThick);
            const paper = new THREE.Mesh(paperGeo, paperMat);
            paper.position.z = -0.1; // Slightly behind frame
            // Double sided paper? Or just backing?
            // Let's make it double sided so it looks good from outside too (if seen)
            paper.material.side = THREE.DoubleSide;
            group.add(paper);
            
            return group;
        };

        // Walls
        const exits = roomData.exits || {};
        const wallY = 5; // Center of 10-high wall

        if (!exits.north) roomGroup.add(createShojiWall(w, offsetX, wallY, -5, 0));
        if (!exits.south) roomGroup.add(createShojiWall(w, offsetX, wallY, d - 5, Math.PI));
        if (!exits.east) roomGroup.add(createShojiWall(d, w - 5, wallY, offsetZ, -Math.PI/2));
        if (!exits.west) roomGroup.add(createShojiWall(d, -5, wallY, offsetZ, Math.PI/2));

        // Features (Lantern)
        if (roomData.features) {
            roomData.features.forEach(f => {
                if (f.id.includes('lantern') || f.label.includes('Lantern')) {
                    const lantern = this.createGlowwormLantern();
                    lantern.position.set(offsetX, 0.5, offsetZ - 2); // Roughly center
                    roomGroup.add(lantern);
                }
            });
        }
    }

    // NEW: Enter Room by ID (Efficient)
    enterRoom(roomId) {
        if (this.roomMap && this.roomMap.has(roomId)) {
            const room = this.roomMap.get(roomId);
            // console.log("Renderer: Entering Room", roomId, room);
            this.updatePlayerPosition({ x: room.x || 0, y: room.y || 0 });
        } else {
            console.warn("Renderer: Room not found in map", roomId);
        }
    }

    // NEW: Update Player Position (Smoothly)
    updatePlayerPosition(pos) {
        // pos: { x, y } (Grid Coords)
        const worldX = pos.x * 10;
        const worldZ = pos.y * 10;
        
        // 2. Update Player Target Position
        if (!this.playerTarget) this.playerTarget = new THREE.Vector3();
        // Camera Height: 5.5 units (approx 5'6" eye level) since 1 unit = 1 foot
        this.playerTarget.set(worldX, 5.5, worldZ);
        
        // Initialize position if first run
        if (!this.cameraFPV.position.x && !this.cameraFPV.position.z) {
             this.cameraFPV.position.copy(this.playerTarget);
             // Force look North initially to see wall
             this.cameraFPV.lookAt(worldX, 5.5, worldZ - 10);
        } else {
            // Smooth move
            this.cameraFPV.position.copy(this.playerTarget);
            // Maintain orientation or update based on movement?
            // For now, just move.
        }

        // 3. Update Player Marker (Map View Only)
        if (!this.playerMarker) {
            // Marker: 6ft tall, 4ft wide base
            const markerGeo = new THREE.ConeGeometry(2, 6, 8);
            const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red Arrow
            this.playerMarker = new THREE.Mesh(markerGeo, markerMat);
            this.playerMarker.rotation.x = -Math.PI / 2; // Point forward
            this.playerMarker.position.y = 3; // Center of 6ft cone is at 3ft
            
            // LAYER MANAGEMENT: Only show on Layer 1 (Map)
            this.playerMarker.layers.set(1); 
            
            this.scene.add(this.playerMarker);
        }
        // Marker moves immediately to show "current" room on map
        this.playerMarker.position.set(worldX, 3, worldZ);
        
        // Ensure Cameras see correct layers
        if (this.cameraFPV) this.cameraFPV.layers.enable(0); // Default
        if (this.cameraMap) {
            this.cameraMap.layers.enable(0); // See world
            this.cameraMap.layers.enable(1); // See marker
        }
    }

    // Legacy / Fallback
    updateRoom(roomData) {
        // If we haven't built the dungeon yet, build this single room
        if (!this.dungeonGroup || this.dungeonGroup.children.length === 0) {
             if (!this.dungeonGroup) {
                this.dungeonGroup = new THREE.Group();
                this.scene.add(this.dungeonGroup);
             }
             this.buildSingleRoom(roomData);
        }
        
        // Move Player
        this.updatePlayerPosition({ x: roomData.x || 0, y: roomData.y || 0 });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.cube) {
            this.cube.rotation.x += 0.01;
            this.cube.rotation.y += 0.01;
        }

        // Smooth Camera Movement
        if (this.cameraFPV && this.playerTarget) {
            this.cameraFPV.position.lerp(this.playerTarget, 0.05); // Smooth factor
            
            // Map Camera Follows Player
            if (this.cameraMap) {
                this.cameraMap.position.x = this.cameraFPV.position.x;
                this.cameraMap.position.z = this.cameraFPV.position.z;
                this.cameraMap.lookAt(this.cameraFPV.position.x, 0, this.cameraFPV.position.z);
            }
        }

        this.render();
    }

    createGlowwormLantern() {
        const lanternGroup = new THREE.Group();
              
        // 1. Wicker Cage (Cylinder with wireframe)
        const cageGeo = new THREE.CylinderGeometry(0.6, 0.7, 2.2, 8, 4, true);
        const cageMat = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513, // SaddleBrown
            wireframe: true,
            roughness: 1,
            metalness: 0
        });
        const cage = new THREE.Mesh(cageGeo, cageMat);
        lanternGroup.add(cage);
        
        // 2. The Glowworm (Capsule-like)
        const wormGeo = new THREE.CapsuleGeometry(0.15, 0.8, 4, 8);
        const wormMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const worm = new THREE.Mesh(wormGeo, wormMat);
        worm.rotation.z = Math.PI / 6; // Slight tilt
        lanternGroup.add(worm);
        
        // 3. Inner Glow (Point Light)
        const light = new THREE.PointLight(0xffffff, 2, 5);
        lanternGroup.add(light);
        
        // 4. Flashlight Beam (Cone)
        const beamGeo = new THREE.ConeGeometry(0.8, 3, 32, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffcc, 
            transparent: true, 
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 2.5; // Extending out the top
        beam.rotation.x = 0; 
        lanternGroup.add(beam);

        // Animate method attached to object for the main loop to find? 
        // Or just animate in the main loop. For now, static.
        return lanternGroup;
    }

    updatePlayer(playerData) {
        // TODO: Move camera
        console.log("Renderer: Update Player", playerData);
    }
}
